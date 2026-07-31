import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY       = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
// ドメイン(kusakabe.com)をResendで認証するまでは、この送信元アドレスからのみ送信可能。
// 未認証の間は、Resendアカウント登録に使ったメールアドレス宛にしか届かない制約がある
const RESEND_FROM          = "承認フロー <onboarding@resend.dev>";
const PHOTO_BUCKET         = "pending-item-photos";
const TEST_MODE            = Deno.env.get("TEST_MODE") === "true";
// Resendはドメイン未認証の間、アカウント登録に使ったメールアドレス宛にしか送信できないため、テスト中はそちらに合わせる
const TEST_EMAIL           = "kemco.kurosaki@gmail.com";

// ブラウザ(fetch)からの呼び出しを許可するためのCORSヘッダー
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 開催案内メールの notification_type と揃え、同じ宛先を再利用する
const FLOW_NOTIF_TYPE: Record<string, string> = {
    inspection:        "inspection_invite",
    simple_inspection: "simple_inspection_invite",
    shipping_meeting:  "shipping_meeting_invite",
};

// メール件名・本文見出し用のフロー短縮名（app.js側のQA_DETAIL_TITLE_LABELSと同じ表記に揃える）
const FLOW_SHORT_LABEL: Record<string, string> = {
    inspection:        "外観検査",
    simple_inspection: "簡易検査",
    shipping_meeting:  "出荷確認会議",
};

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
    });
}

function esc(s: unknown) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
    );
}

function photoUrl(path: string | null) {
    if (!path) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

// 完了予定日が3日以内(期限切れ含む)かどうか。アプリ側のpendingDueSoon()と同じ基準
function isDueSoon(dueStr: string | null) {
    if (!dueStr) return false;
    const [y, m, d] = dueStr.split("-").map(Number);
    const dueUTC = Date.UTC(y, m - 1, d);
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((dueUTC - todayUTC) / 86400000);
    return diffDays <= 3;
}

function statusCellHtml(it: any) {
    if (it.completed) {
        return `<span style="color:#1c8f4d;background:#eafaf0;border-radius:4px;padding:2px 8px;">完了: ${esc(it.completed_date || "—")}</span>`;
    }
    if (isDueSoon(it.due)) {
        return `<span style="color:#c0392b;background:#fde8e8;border-radius:4px;padding:2px 8px;">期日間近: ${esc(it.due || "—")}</span>`;
    }
    return `期日: ${esc(it.due || "—")}`;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
        if (!RESEND_API_KEY) {
            return json({ error: "RESEND_API_KEY が Edge Function の secrets に設定されていません" }, 500);
        }

        const authHeader = req.headers.get("Authorization") ?? "";
        const jwt = authHeader.replace(/^Bearer\s+/i, "");
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

        const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
        if (userErr || !userData?.user) return json({ error: "認証に失敗しました" }, 401);

        const { data: profile } = await admin
            .from("profiles").select("role").eq("id", userData.user.id).single();
        if (!profile || (profile.role !== "quality" && profile.role !== "production_control")) {
            return json({ error: "この操作を行う権限がありません" }, 403);
        }

        const { requestId } = await req.json();
        if (!requestId) return json({ error: "requestId が指定されていません" }, 400);

        const { data: reqRow, error: reqErr } = await admin
            .from("approval_requests")
            .select("flow_type, project_number, machine_name, inspection_date, sheet_data")
            .eq("id", requestId)
            .single();
        if (reqErr || !reqRow) return json({ error: "対象データが見つかりません" }, 404);

        const notifType = FLOW_NOTIF_TYPE[reqRow.flow_type as string];
        if (!notifType) return json({ error: "外観検査・簡易検査・出荷確認会議以外では利用できません" }, 400);

        const items = ((reqRow.sheet_data as any)?.pending_items || []).filter((it: any) => it.content);
        if (items.length === 0) return json({ error: "ペンディング項目がありません" }, 400);

        // 開催案内メールと同じ宛先（同一 request_id・同一 notification_type）を再利用する
        const { data: notifRows } = await admin
            .from("approval_notifications")
            .select("recipient_id, recipient_email")
            .eq("request_id", requestId)
            .eq("notification_type", notifType);

        const recipientIds = [...new Set((notifRows || []).map((n) => n.recipient_id).filter(Boolean))];
        const directEmails = new Set((notifRows || []).map((n) => n.recipient_email).filter(Boolean));

        let profileEmails: string[] = [];
        if (recipientIds.length > 0) {
            const { data: profs } = await admin.from("profiles").select("email").in("id", recipientIds);
            profileEmails = (profs || []).map((p) => p.email).filter(Boolean);
        }
        let allEmails = [...new Set([...directEmails, ...profileEmails])] as string[];
        if (TEST_MODE) {
            allEmails = [TEST_EMAIL];
        } else if (allEmails.length === 0) {
            return json({ error: "送信先が見つかりません（開催案内の宛先が未登録です）" }, 400);
        }

        const rowsHtml = items.map((it: any) => `
            <tr>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">${
                    it.photo_path
                        ? `<img src="${esc(photoUrl(it.photo_path))}" width="100" style="display:block;border-radius:4px;">`
                        : "—"
                }</td>
                <td style="padding:8px;border:1px solid #ddd;">${esc(it.location || "—")}</td>
                <td style="padding:8px;border:1px solid #ddd;">${esc(it.content)}</td>
                <td style="padding:8px;border:1px solid #ddd;">${esc(it.owner || "—")}</td>
                <td style="padding:8px;border:1px solid #ddd;">${statusCellHtml(it)}</td>
            </tr>`).join("");

        const flowLabel = FLOW_SHORT_LABEL[reqRow.flow_type as string] || "検査";

        const html = `
            <div style="font-family:'Hiragino Kaku Gothic ProN','Meiryo',sans-serif;color:#333;">
                <h2 style="margin-bottom:4px;">${esc(flowLabel)} タスクリスト</h2>
                <p style="margin-top:0;color:#666;">
                    工事番号: ${esc(reqRow.project_number || "—")} ／
                    機械: ${esc(reqRow.machine_name || "—")} ／
                    検査日: ${esc(reqRow.inspection_date || "—")}
                </p>
                <table style="border-collapse:collapse;width:100%;font-size:14px;">
                    <thead>
                        <tr style="background:#f5f5f5;">
                            <th style="padding:8px;border:1px solid #ddd;">写真</th>
                            <th style="padding:8px;border:1px solid #ddd;">場所</th>
                            <th style="padding:8px;border:1px solid #ddd;">内容</th>
                            <th style="padding:8px;border:1px solid #ddd;">担当者</th>
                            <th style="padding:8px;border:1px solid #ddd;">状態</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;

        const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: RESEND_FROM,
                to: allEmails,
                subject: `${TEST_MODE ? "【テスト】" : ""}【${reqRow.project_number || ""} ${reqRow.machine_name || ""}】 ${flowLabel} タスクリスト`,
                html,
            }),
        });

        if (!resendRes.ok) {
            const errBody = await resendRes.text();
            console.error("Resend error:", errBody);
            return json({ error: `メール送信に失敗しました: ${errBody}` }, 502);
        }

        // テストモード時は本番の通知履歴を汚さないよう監査ログへの記録をスキップする
        if (!TEST_MODE) {
            const now = new Date().toISOString();
            await admin.from("approval_notifications").insert(
                allEmails.map((email) => ({
                    request_id: requestId,
                    recipient_email: email,
                    notification_type: "fix_card_sent",
                    emailed_at: now,
                }))
            );
        }

        return json({ success: true, sentTo: allEmails.length, testMode: TEST_MODE });
    } catch (e) {
        console.error(e);
        return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
});
