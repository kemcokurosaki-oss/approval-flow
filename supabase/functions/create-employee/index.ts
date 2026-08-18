import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 設定画面を開ける管理者と同じリスト（app.js の ADMIN_EMAILS と同期させること）
const ADMIN_EMAILS = ["e-kurosaki@kusakabe.com", "s-morimura@kusakabe.com", "m2-kusakabe@kusakabe.com"];

// 部署 + tier(manager/director) → profiles.role の具体値
// app.js の DEPT_TIER_TO_PROFILE_ROLE と同一内容を維持すること
const DEPT_TIER_TO_PROFILE_ROLE: Record<string, Record<string, string>> = {
    "組立": { manager: "assembly_manager",   director: "assembly_director" },
    "操業": { manager: "operations_manager", director: "operations_director" },
    "設計": { manager: "design_manager",     director: "design_director" },
};
function resolveRole(department: string, tier: string) {
    const map = DEPT_TIER_TO_PROFILE_ROLE[department];
    return (map && map[tier]) ? map[tier] : "staff";
}

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

        // Authアカウント新設という強い権限のため、role横断のADMIN_EMAILS固定リストのみで判定する
        if (!ADMIN_EMAILS.includes(userData.user.email ?? "")) {
            return json({ error: "この操作を行う権限がありません" }, 403);
        }

        const { email, name, department, tier } = await req.json();
        if (!email || !name || !department || !tier) {
            return json({ error: "email・name・department・tier は必須です" }, 400);
        }
        const normalizedEmail = String(email).trim().toLowerCase();

        // 既にprofilesに同メールが登録済みなら弾く（誤操作での二重登録防止）
        const { data: existingProfile } = await admin
            .from("profiles").select("id").eq("email", normalizedEmail).maybeSingle();
        if (existingProfile) return json({ error: "このメールアドレスは既に名簿に登録済みです" }, 409);

        let userId: string;
        let alreadyHadAuthAccount = false;

        const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email: normalizedEmail,
            password: crypto.randomUUID(),
            email_confirm: true,
        });

        if (createErr) {
            const isDuplicate = (createErr as any).code === "email_exists"
                || /already (been )?registered|already exists/i.test(createErr.message || "");
            if (!isDuplicate) throw createErr;

            // フォールバック: 既にAuthアカウントはあるがprofiles未登録のケース（物流の中島美・森口 等）
            alreadyHadAuthAccount = true;
            let found: { id: string } | null = null;
            for (let page = 1; page <= 5 && !found; page++) {
                const { data: pageData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
                if (listErr) throw listErr;
                found = pageData.users.find((u) => (u.email || "").toLowerCase() === normalizedEmail) ?? null;
                if (pageData.users.length < 200) break; // 最終ページ
            }
            if (!found) return json({ error: "既存Authアカウントが見つかりませんでした" }, 404);
            userId = found.id;
        } else {
            userId = created.user.id;
        }

        const role = resolveRole(department, tier);
        const { error: insertErr } = await admin
            .from("profiles").insert({ id: userId, name, email: normalizedEmail, department, role });
        if (insertErr) throw insertErr;

        return json({ ok: true, userId, alreadyHadAuthAccount });
    } catch (e) {
        console.error(e);
        return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
});
