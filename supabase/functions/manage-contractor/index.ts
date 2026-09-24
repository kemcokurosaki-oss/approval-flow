import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// 外注先アカウントの発行・案件割り当て・アクセス停止を行う管理用API。
// create-employee/index.ts と同じ考え方（呼び出し元がADMIN_EMAILSに
// 含まれるかをJWTから検証してから、サービスロールで操作する）。
//
// リクエスト例（本文はJSON、Authorizationヘッダーに社内管理者のログイントークンを付与）:
//   { action: "create", email, company_name, contact_name, request_id? }
//     → 新しい外注先アカウントを作成。request_idを渡せば作成と同時に割り当ても行う。
//   { action: "assign", email, request_id }
//     → 既存の外注先アカウント(email)に、別の案件(request_id)を追加割り当て。
//   { action: "revoke", email, request_id }
//     → 特定案件へのアクセスだけを外す（アカウント自体は残る）。
//   { action: "disable", email }
//     → アカウント自体を無効化（全案件へのアクセスを一括停止）。

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
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

function generateTempPassword() {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "1!";
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

        // 外注先アカウントの新設・案件割り当てという強い権限のため、
        // role横断のADMIN_EMAILS固定リストのみで判定する
        if (!ADMIN_EMAILS.includes(userData.user.email ?? "")) {
            return json({ error: "この操作を行う権限がありません" }, 403);
        }

        const payload = await req.json();
        const action = payload?.action;

        if (action === "create") {
            const { email, company_name, contact_name, request_id } = payload;
            if (!email || !company_name) {
                return json({ error: "email・company_name は必須です" }, 400);
            }
            const normalizedEmail = String(email).trim().toLowerCase();

            // contractor_accounts に email 列は無い(authのemailを使う)ため、
            // まずauth.usersを作成/検索してからidを確定し、それを元にupsertする。
            let userId: string;
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
                email: normalizedEmail,
                password: generateTempPassword(),
                email_confirm: true,
            });

            if (createErr) {
                const isDuplicate = (createErr as any).code === "email_exists"
                    || /already (been )?registered|already exists/i.test(createErr.message || "");
                if (!isDuplicate) throw createErr;

                let found: { id: string } | null = null;
                for (let page = 1; page <= 5 && !found; page++) {
                    const { data: pageData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
                    if (listErr) throw listErr;
                    found = pageData.users.find((u) => (u.email || "").toLowerCase() === normalizedEmail) ?? null;
                    if (pageData.users.length < 200) break;
                }
                if (!found) return json({ error: "既存Authアカウントが見つかりませんでした" }, 404);
                userId = found.id;
            } else {
                userId = created.user.id;
            }

            const { error: upsertErr } = await admin
                .from("contractor_accounts")
                .upsert({ id: userId, company_name, contact_name: contact_name ?? null, disabled_at: null });
            if (upsertErr) throw upsertErr;

            if (request_id) {
                const { error: assignErr } = await admin
                    .from("contractor_assignments")
                    .upsert({ contractor_id: userId, request_id, revoked_at: null }, { onConflict: "contractor_id,request_id" });
                if (assignErr) throw assignErr;
            }

            // パスワードをリセットして招待リンクを発行（メール送信はせず、リンクを返すだけ。
            // 実際の共有方法は運用で決める＝口頭/電話などセキュアな経路を想定）
            const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
                type: "recovery",
                email: normalizedEmail,
            });
            if (linkErr) throw linkErr;

            return json({ ok: true, userId, actionLink: linkData?.properties?.action_link ?? null });
        }

        if (action === "assign" || action === "revoke") {
            const { email, request_id } = payload;
            if (!email || !request_id) return json({ error: "email・request_id は必須です" }, 400);
            const normalizedEmail = String(email).trim().toLowerCase();

            const { data: pageData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
            if (listErr) throw listErr;
            const found = pageData.users.find((u) => (u.email || "").toLowerCase() === normalizedEmail);
            if (!found) return json({ error: "そのメールアドレスの外注先アカウントが見つかりません" }, 404);

            if (action === "assign") {
                const { error } = await admin
                    .from("contractor_assignments")
                    .upsert({ contractor_id: found.id, request_id, revoked_at: null }, { onConflict: "contractor_id,request_id" });
                if (error) throw error;
            } else {
                const { error } = await admin
                    .from("contractor_assignments")
                    .update({ revoked_at: new Date().toISOString() })
                    .eq("contractor_id", found.id)
                    .eq("request_id", request_id);
                if (error) throw error;
            }
            return json({ ok: true });
        }

        if (action === "disable") {
            const { email } = payload;
            if (!email) return json({ error: "email は必須です" }, 400);
            const normalizedEmail = String(email).trim().toLowerCase();

            const { data: pageData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
            if (listErr) throw listErr;
            const found = pageData.users.find((u) => (u.email || "").toLowerCase() === normalizedEmail);
            if (!found) return json({ error: "そのメールアドレスの外注先アカウントが見つかりません" }, 404);

            const { error } = await admin
                .from("contractor_accounts")
                .update({ disabled_at: new Date().toISOString() })
                .eq("id", found.id);
            if (error) throw error;
            return json({ ok: true });
        }

        return json({ error: `不明な action です: ${action}` }, 400);
    } catch (e) {
        console.error(e);
        return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
});
