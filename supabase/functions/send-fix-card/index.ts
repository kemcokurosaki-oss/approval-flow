import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer/mod.ts";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GMAIL_USER           = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD   = Deno.env.get("GMAIL_APP_PASSWORD")!;
const PHOTO_BUCKET         = "pending-item-photos";

// 開催案内メールの notification_type と揃え、同じ宛先を再利用する
const FLOW_NOTIF_TYPE: Record<string, string> = {
    inspection:        "inspection_invite",
    simple_inspection: "simple_inspection_invite",
    shipping_meeting:  "shipping_meeting_invite",
};

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
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

Deno.serve(async (req) => {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
        if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
            return json({ error: "GMAIL_USER / GMAIL_APP_PASSWORD が Edge Function の secrets に設定されていません" }, 500);
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
        const allEmails = [...new Set([...directEmails, ...profileEmails])] as string[];
        if (allEmails.length === 0) return json({ error: "送信先が見つかりません（開催案内の宛先が未登録です）" }, 400);

        const rowsHtml = items.map((it: any) => `
            <tr>
                <td style="padding:8px;border:1px solid #ddd;text-align:center;">${
                    it.photo_path
                        ? `<img src="${esc(photoUrl(it.photo_path))}" width="100" style="display:block;border-radius:4px;">`
                        : "—"
                }</td>
                <td style="padding:8px;border:1px solid #ddd;">${esc(it.content)}</td>
                <td style="padding:8px;border:1px solid #ddd;">${esc(it.owner || "—")}</td>
                <td style="padding:8px;border:1px solid #ddd;">${esc(it.due || "—")}</td>
            </tr>`).join("");

        const html = `
            <div style="font-family:'Hiragino Kaku Gothic ProN','Meiryo',sans-serif;color:#333;">
                <h2 style="margin-bottom:4px;">外観検査 手直しカード</h2>
                <p style="margin-top:0;color:#666;">
                    工事番号: ${esc(reqRow.project_number || "—")} ／
                    機械: ${esc(reqRow.machine_name || "—")} ／
                    検査日: ${esc(reqRow.inspection_date || "—")}
                </p>
                <table style="border-collapse:collapse;width:100%;font-size:14px;">
                    <thead>
                        <tr style="background:#f5f5f5;">
                            <th style="padding:8px;border:1px solid #ddd;">写真</th>
                            <th style="padding:8px;border:1px solid #ddd;">内容</th>
                            <th style="padding:8px;border:1px solid #ddd;">担当者</th>
                            <th style="padding:8px;border:1px solid #ddd;">完了予定日</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;

        const client = new SMTPClient({
            connection: {
                hostname: "smtp.gmail.com",
                port: 465,
                tls: true,
                auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
            },
        });

        await client.send({
            from: GMAIL_USER,
            to: allEmails,
            subject: `【外観検査】手直しカード（${reqRow.project_number || ""} ${reqRow.machine_name || ""}）`,
            html,
        });
        await client.close();

        const now = new Date().toISOString();
        await admin.from("approval_notifications").insert(
            allEmails.map((email) => ({
                request_id: requestId,
                recipient_email: email,
                notification_type: "fix_card_sent",
                emailed_at: now,
            }))
        );

        return json({ success: true, sentTo: allEmails.length });
    } catch (e) {
        console.error(e);
        return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
});
