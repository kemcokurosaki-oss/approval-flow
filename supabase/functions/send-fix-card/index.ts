import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// このFunctionは実際のメール送信は行わず、approval_notificationsへ「送信待ち」レコードを積むだけ。
// 実際の送信は scripts/notify-approval.js（GitHub Actions、15分ごと）が拾って行う。
// 理由: DenoのSMTPライブラリ(denomailer)経由のGmail送信で、メールヘッダーが本文に混入する問題が解決できなかったため、
// 実績のあるnodemailer(Node.js)側に送信処理を統合した。

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TEST_MODE            = Deno.env.get("TEST_MODE") === "true";
const TEST_EMAIL           = "e-kurosaki@kusakabe.com";

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

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
    });
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
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
            .select("flow_type, sheet_data")
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
        const directEmails  = [...new Set((notifRows || []).map((n) => n.recipient_email).filter(Boolean))] as string[];

        let inserts: Array<{ request_id: string; recipient_id?: string; recipient_email?: string; notification_type: string }>;

        if (TEST_MODE) {
            inserts = [{ request_id: requestId, recipient_email: TEST_EMAIL, notification_type: "fix_card_sent" }];
        } else {
            const profileInserts = recipientIds.map((id) => ({
                request_id: requestId, recipient_id: id as string, notification_type: "fix_card_sent",
            }));
            const emailInserts = directEmails.map((email) => ({
                request_id: requestId, recipient_email: email, notification_type: "fix_card_sent",
            }));
            inserts = [...profileInserts, ...emailInserts];
            if (inserts.length === 0) {
                return json({ error: "送信先が見つかりません（開催案内の宛先が未登録です）" }, 400);
            }
        }

        const { error: insertErr } = await admin.from("approval_notifications").insert(inserts);
        if (insertErr) throw insertErr;

        return json({ success: true, queued: inserts.length, testMode: TEST_MODE });
    } catch (e) {
        console.error(e);
        return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
});
