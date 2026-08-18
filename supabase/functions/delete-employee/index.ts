import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 設定画面を開ける管理者と同じリスト（app.js の ADMIN_EMAILS と同期させること）
const ADMIN_EMAILS = ["e-kurosaki@kusakabe.com", "s-morimura@kusakabe.com", "m2-kusakabe@kusakabe.com"];

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

        // Authアカウント削除という強い権限のため、role横断のADMIN_EMAILS固定リストのみで判定する
        if (!ADMIN_EMAILS.includes(userData.user.email ?? "")) {
            return json({ error: "この操作を行う権限がありません" }, 403);
        }

        const { profileId } = await req.json();
        if (!profileId) return json({ error: "profileId は必須です" }, 400);

        const { data: target, error: findErr } = await admin
            .from("profiles").select("id, name, email").eq("id", profileId).maybeSingle();
        if (findErr) throw findErr;
        if (!target) return json({ error: "対象の名簿データが見つかりません" }, 404);

        // 自分自身を削除しようとした場合は拒否（設定画面が開けなくなる事故を防ぐ）
        if (target.id === userData.user.id) {
            return json({ error: "自分自身のアカウントは削除できません" }, 400);
        }

        const { error: deleteProfileErr } = await admin.from("profiles").delete().eq("id", profileId);
        if (deleteProfileErr) throw deleteProfileErr;

        const { error: deleteAuthErr } = await admin.auth.admin.deleteUser(profileId);
        // profilesは既に削除済みのため、Auth側の削除に失敗しても致命的ではないが、状況をログに残す
        if (deleteAuthErr) console.error("Authアカウント削除エラー:", deleteAuthErr);

        return json({ ok: true, name: target.name, email: target.email, authDeleted: !deleteAuthErr });
    } catch (e) {
        console.error(e);
        return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
});
