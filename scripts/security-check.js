/**
 * セキュリティ定期チェック
 *
 * CHECK_SCOPE ごとに実行する項目を変える（cron-job.org から平日の朝に GitHub Actions を起動）
 *   daily  : Supabase の設定（サインアップ・RLS・ポリシー・関数・Storage・ユーザー）、
 *            全リポジトリの直近コミットの秘密情報、公開リポジトリに置かれた業務ファイル・電話番号
 *   weekly : daily ＋ 全履歴の秘密情報スキャン、履歴に残った業務ファイル、npm の脆弱性、CDN 読み込みの改ざん対策
 *   monthly: weekly ＋ 手動確認のお願い。問題の有無にかかわらず、全件のまとめを必ずメールする
 *
 * daily / weekly は「前回までに無かった問題」が見つかったときだけメールする。
 * 既知の問題は月次まとめに毎回載せる。チェック自体が失敗した場合も問題として通知する。
 *
 * リポジトリは公開なので、Actions のログには件数しか出さない（問題の中身はメールだけに書く）。
 *
 * Secrets: SUPABASE_URL, SECURITY_MONITOR_DB_URL（読み取り専用ユーザー security_monitor の接続文字列）,
 *          メール送信用（scripts/mailer.js 参照）
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { Client } = require('pg');
const { requireMailEnv, formatFrom, sendMail } = require('./mailer');

// auto: 日本時間で、その月の最初の平日なら monthly、月曜なら weekly、それ以外は daily。
// 平日の朝だけ起動する（cron-job.org）ため、1日が土日の月は次の月曜を「最初の平日」として月次まとめにする
function resolveScope(scope) {
  if (scope && scope !== 'auto') return scope;
  const jst = new Date(Date.now() + 9 * 3600 * 1000);
  const date = jst.getUTCDate();
  const day = jst.getUTCDay(); // 0=日 … 6=土
  const isFirstWeekday = (day >= 1 && day <= 5) && (date === 1 || (day === 1 && date <= 3));
  if (isFirstWeekday) return 'monthly';
  if (day === 1) return 'weekly';
  return 'daily';
}
const SCOPE         = resolveScope((process.env.CHECK_SCOPE || 'auto').trim());
const SUPABASE_URL  = process.env.SUPABASE_URL;
const ANON_KEY      = process.env.SUPABASE_ANON_KEY;
const DB_URL        = process.env.SECURITY_MONITOR_DB_URL;
const STATE_FILE    = process.env.STATE_FILE || path.join(process.cwd(), '.security-state', 'state.json');
const REPORT_TO     = 'e-kurosaki@kusakabe.com';
const GITHUB_OWNER  = 'kemcokurosaki-oss';
const REPOS = [
  'approval-flow', 'gantt-chart', 'assembly-schedule', 'design-schedule', 'operation-schedule',
  'electrical-schedule', 'delivery-schedule', 'progress-schedule', '3d-viewer',
];
const COMPANY_DOMAIN = '@kusakabe.com';
// 公開リポジトリに置くと誰でもダウンロードできてしまう業務ファイルの拡張子
const SENSITIVE_EXT = ['.xlsx', '.xlsm', '.xls', '.csv', '.pdf', '.docx', '.doc', '.pptx', '.zip', '.env', '.pem', '.key'];

const SEVERITY_ORDER = { '高': 0, '中': 1, '低': 2, '情報': 3 };

// ===== 問題の記録 =====
// 各チェックは { key, severity, title, detail } を返す。key は同じ問題なら毎回同じ文字列にする（新規かどうかの判定に使う）
const results = {}; // checkName -> { label, findings: [], error: string|null }

async function runCheck(name, label, fn) {
  results[name] = { label, findings: [], error: null };
  try {
    results[name].findings = (await fn()) || [];
  } catch (e) {
    results[name].error = e.message || String(e);
  }
  const r = results[name];
  console.log(`- ${label}: ${r.error ? 'チェック失敗' : `${r.findings.length}件`}`);
}

const fp = (checkName, key) => crypto.createHash('sha256').update(`${checkName}\n${key}`).digest('hex').slice(0, 32);

// ===== Supabase: 外部から見える認証設定 =====
async function checkAuthSettings() {
  if (!SUPABASE_URL || !ANON_KEY) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY が未設定です');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: ANON_KEY } });
  if (!res.ok) throw new Error(`auth/v1/settings の取得に失敗 [${res.status}]`);
  const s = await res.json();
  const out = [];
  // 2026-10-15〜: M365 アカウントの自動作成のためサインアップは ON にし、Before User Created フック
  // （hook_before_user_created）で azure かつ @kusakabe.com と許可リスト以外を拒否している。
  // ON であること自体は問題にせず、メールアドレスでの登録が実際に拒否されるかを試す
  if (s.disable_signup === false) {
    const probe = `security-probe-${Date.now()}@example.com`;
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: probe, password: crypto.randomBytes(18).toString('base64') + 'aA1!' }),
    });
    if (r.ok) {
      out.push({ key: 'signup-not-restricted', severity: '高', title: 'メールアドレスでの新規登録が拒否されない',
        detail: `新規登録を制限するフックが効いていません（試験用アドレス ${probe} のアカウントが作られた可能性があります。Authentication → Users で確認し、削除してください）。Authentication → Hooks で「Before User Created」が有効か確認してください。` });
    }
  }
  if (s.mailer_autoconfirm === true) {
    out.push({ key: 'mailer-autoconfirm', severity: '高', title: 'メール確認なしでアカウントが有効になる設定',
      detail: 'Confirm email を ON にしてください。' });
  }
  if (s.external?.anonymous_users === true) {
    out.push({ key: 'anonymous-users', severity: '高', title: '匿名サインインが有効',
      detail: '匿名ユーザーも authenticated ロールになります。不要なら OFF にしてください。' });
  }
  for (const [provider, enabled] of Object.entries(s.external || {})) {
    // azure は M365 ログイン（日下部電機のテナント限定）として想定どおり
    if (enabled && !['email', 'anonymous_users', 'azure'].includes(provider)) {
      out.push({ key: `provider-${provider}`, severity: '中', title: `外部ログイン（${provider}）が有効`,
        detail: '想定外であれば OFF にしてください。' });
    }
  }
  return out;
}

// ===== Supabase: DB の権限設定（読み取り専用ユーザーで接続） =====
async function withDb(fn) {
  if (!DB_URL) throw new Error('SECURITY_MONITOR_DB_URL が未設定です');
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000 });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

async function checkDatabase() {
  return withDb(async (db) => {
    const out = [];

    // RLS が無効なテーブル（anon / authenticated に権限があれば外部から丸見え・書き換え放題）
    const noRls = await db.query(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity order by 1`);
    for (const r of noRls.rows) {
      out.push({ key: `no-rls:${r.relname}`, severity: '高', title: `RLS が無効なテーブル: ${r.relname}`,
        detail: 'alter table ... enable row level security; とポリシーの設定が必要です。' });
    }

    // ログインなし（anon / public）に効くポリシー
    const anonPolicies = await db.query(`
      select tablename, policyname, cmd, coalesce(qual,'') qual, coalesce(with_check,'') with_check
      from pg_policies
      where schemaname = 'public' and permissive = 'PERMISSIVE' and (roles && array['anon','public']::name[])
      order by tablename, policyname`);
    for (const p of anonPolicies.rows) {
      // 条件にログイン情報（auth.uid() / auth.jwt() など）を使っていれば、未ログインでは通らない
      if (/auth\.(uid|jwt|role|email)\(\)|is_contractor|schedule_is_|is_org_chart_admin/.test(p.qual + p.with_check)) continue;
      const write = p.cmd !== 'SELECT';
      out.push({
        key: `anon-policy:${p.tablename}:${p.policyname}:${p.cmd}:${p.qual}:${p.with_check}`,
        // 追記だけ（ログ等）は改ざん・削除よりは影響が小さい
        severity: !write ? '中' : p.cmd === 'INSERT' ? '中' : '高',
        title: `ログインなしで${write ? '書き込み・削除' : '読み取り'}できる: ${p.tablename}`,
        detail: `ポリシー「${p.policyname}」(${p.cmd}) 条件: ${p.qual || '(なし)'}`,
      });
    }

    // ログイン済みなら誰でも無条件に書き込めるポリシー
    const authTrue = await db.query(`
      select tablename, policyname, cmd from pg_policies
      where schemaname = 'public' and permissive = 'PERMISSIVE' and cmd <> 'SELECT'
        and (roles && array['authenticated']::name[])
        and coalesce(qual,'true') = 'true' and coalesce(with_check,'true') = 'true'
      order by tablename, policyname`);
    for (const p of authTrue.rows) {
      out.push({ key: `auth-true:${p.tablename}:${p.policyname}:${p.cmd}`, severity: '中',
        title: `ログインした人なら誰でも無条件で${p.cmd}できる: ${p.tablename}`,
        detail: `ポリシー「${p.policyname}」。役職・担当者などの条件で絞ることを検討してください。` });
    }

    // ログインなしで実行できる SECURITY DEFINER 関数（RLS を素通りする）
    const secdef = await db.query(`
      select p.oid::regprocedure::text sig,
             has_function_privilege('anon', p.oid, 'EXECUTE') anon_exec,
             exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%') has_path,
             pg_get_functiondef(p.oid) ~* '\\m(delete|update|insert|truncate)\\M' writes,
             pg_get_functiondef(p.oid) ~* 'auth\\.(uid|jwt)\\(\\)' checks_auth
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef and p.prokind = 'f'
        and p.prorettype <> 'trigger'::regtype  -- トリガー関数は API から直接呼べない
      order by 1`);
    for (const f of secdef.rows) {
      // 関数内でログイン者を確認していないのにデータを書き換えるもの
      if (f.anon_exec && f.writes && !f.checks_auth) {
        out.push({ key: `anon-secdef-write:${f.sig}`, severity: '高', title: `ログインなしで実行できるデータ変更関数: ${f.sig}`,
          detail: 'RLS を無視してデータを書き換えられます。revoke execute ... from anon, public; と関数内の権限チェックが必要です。' });
      } else if (f.anon_exec) {
        out.push({ key: `anon-secdef:${f.sig}`, severity: '低', title: `ログインなしで実行できる SECURITY DEFINER 関数: ${f.sig}`,
          detail: 'データ変更はしない関数ですが、anon からの実行権限は外すのが安全です。' });
      }
      if (!f.has_path) {
        out.push({ key: `secdef-no-path:${f.sig}`, severity: '中', title: `search_path 未固定の SECURITY DEFINER 関数: ${f.sig}`,
          detail: "alter function ... set search_path = public; を設定してください。" });
      }
    }

    // Storage: 公開バケットと、ログインなしで書き込めるポリシー
    const buckets = await db.query('select * from monitor.storage_buckets()');
    for (const b of buckets.rows.filter((x) => x.public)) {
      out.push({ key: `public-bucket:${b.id}`, severity: '低', title: `公開バケット: ${b.id}`,
        detail: `URL を知っていれば誰でもファイルを取得できます。サイズ上限: ${b.file_size_limit || '未設定'}、形式制限: ${b.allowed_mime_types ? b.allowed_mime_types.join(',') : '未設定'}` });
    }
    const storagePolicies = await db.query(`
      select policyname, cmd, roles::text roles from pg_policies
      where schemaname = 'storage' and permissive = 'PERMISSIVE' and cmd <> 'SELECT'
        and (roles && array['anon','public']::name[]) order by 1`);
    for (const p of storagePolicies.rows) {
      out.push({ key: `storage-anon-write:${p.policyname}:${p.cmd}`, severity: '高', title: `ログインなしでファイルを${p.cmd}できる Storage ポリシー`,
        detail: `ポリシー「${p.policyname}」(${p.roles})` });
    }

    // 外注先の閲覧制限（contractor_default_deny）が付いていないテーブル
    const noDeny = await db.query(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
        and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
                        and p.permissive = 'RESTRICTIVE' and p.qual like '%is_contractor()%')
      order by 1`);
    for (const r of noDeny.rows) {
      out.push({ key: `no-contractor-deny:${r.relname}`, severity: '低', title: `外注先アカウントの閲覧制限が無いテーブル: ${r.relname}`,
        detail: '外注先ログインでも他社案件のデータが見える可能性があります。' });
    }

    return out;
  });
}

async function checkAuthUsers() {
  return withDb(async (db) => {
    const { rows } = await db.query('select * from monitor.auth_users_summary()');
    const out = [];
    const since = Date.now() - 3 * 24 * 3600 * 1000;
    for (const u of rows) {
      if (!u.is_company) {
        out.push({ key: `external-user:${u.masked_email}:${u.created_at.toISOString()}`, severity: '中',
          title: `社外ドメインのアカウント: ${u.masked_email}`,
          detail: `作成 ${fmtDate(u.created_at)}、最終ログイン ${u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : 'なし'}。外注先アカウントでなければ削除を検討してください。` });
      } else if (new Date(u.created_at).getTime() > since) {
        out.push({ key: `new-user:${u.masked_email}:${u.created_at.toISOString()}`, severity: '情報',
          title: `新しいアカウントが作成された: ${u.masked_email}`, detail: `作成 ${fmtDate(u.created_at)}。心当たりがあれば対応不要です。` });
      }
    }
    const unconfirmed = rows.filter((u) => !u.confirmed);
    if (unconfirmed.length > 0) {
      out.push({ key: `unconfirmed:${unconfirmed.length}`, severity: '低', title: `メール未確認のアカウント ${unconfirmed.length}件`,
        detail: unconfirmed.map((u) => `${u.masked_email}（${fmtDate(u.created_at)}作成）`).join('、') });
    }
    return out;
  });
}

// ===== GitHub リポジトリ =====
const WORK_DIR = path.join(os.tmpdir(), 'security-check-repos');

function cloneRepos() {
  fs.rmSync(WORK_DIR, { recursive: true, force: true });
  fs.mkdirSync(WORK_DIR, { recursive: true });
  for (const repo of REPOS) {
    execFileSync('git', ['clone', '--quiet', `https://github.com/${GITHUB_OWNER}/${repo}.git`, path.join(WORK_DIR, repo)], { stdio: 'ignore' });
  }
}

const git = (repo, args) => execFileSync('git', ['-C', path.join(WORK_DIR, repo), ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

// 秘密情報のパターン。anon / publishable キーは公開前提なので対象外
const SECRET_PATTERNS = [
  { name: 'Supabase の secret キー', re: /sb_secret_[A-Za-z0-9_-]{20,}/g },
  { name: 'GitHub トークン', re: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,})\b/g },
  { name: '秘密鍵', re: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/g },
  { name: 'Azure / M365 のクライアントシークレット', re: /\b[A-Za-z0-9_~.-]{3}8Q~[A-Za-z0-9_~.-]{31,34}\b/g },
  { name: 'Postgres 接続文字列（パスワード付き）', re: /postgres(ql)?:\/\/[^:\s'"]+:[^@\s'"]{6,}@[^\s'"]+/g },
  { name: 'Gmail アプリパスワードらしき文字列', re: /(GMAIL_APP_PASSWORD|app_?password)\s*[:=]\s*['"][a-z]{4} ?[a-z]{4} ?[a-z]{4} ?[a-z]{4}['"]/gi },
];
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

function findSecrets(text) {
  const hits = [];
  for (const p of SECRET_PATTERNS) {
    for (const m of text.matchAll(p.re)) hits.push({ name: p.name, value: m[0] });
  }
  // JWT は中身の role を見て、service_role だけを問題にする
  for (const m of text.matchAll(JWT_RE)) {
    try {
      const payload = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url').toString('utf8'));
      if (payload.role === 'service_role') hits.push({ name: 'Supabase の service_role キー', value: m[0] });
    } catch (_) { /* JWT でなければ無視 */ }
  }
  return hits;
}

const mask = (v) => `${v.slice(0, 6)}…（${v.length}文字）`;

// since を指定すると、その期間のコミットで追加された行だけを見る。未指定なら全履歴
function checkRepoSecrets(since) {
  const out = [];
  for (const repo of REPOS) {
    const args = ['log', '--all', '-p', '--no-textconv', '--no-color', '--unified=0', '--format=@@COMMIT %H %cs'];
    if (since) args.push(`--since=${since}`);
    let commit = '', date = '', file = '';
    for (const line of git(repo, args).split('\n')) {
      if (line.startsWith('@@COMMIT ')) { [, commit, date] = line.split(' '); continue; }
      if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
      if (!line.startsWith('+') || line.startsWith('+++')) continue;
      for (const h of findSecrets(line)) {
        out.push({ key: `secret:${repo}:${crypto.createHash('sha256').update(h.value).digest('hex')}`, severity: '高',
          title: `${h.name}が公開リポジトリに含まれている: ${repo}`,
          detail: `${file}（コミット ${commit.slice(0, 7)}、${date}）値: ${mask(h.value)}。キーを無効化・再発行してください（履歴に残るため削除だけでは不十分です）。` });
      }
    }
  }
  // 同じ値が複数コミットに出てくる場合は1件にまとめる
  return [...new Map(out.map((f) => [f.key, f])).values()];
}

function checkSensitiveFiles() {
  const out = [];
  for (const repo of REPOS) {
    const files = git(repo, ['-c', 'core.quotepath=false', 'ls-files']).split('\n').filter(Boolean);
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!SENSITIVE_EXT.includes(ext) && !/(^|\/)\.env(\.|$)/.test(f)) continue;
      const isSecretFile = ['.env', '.pem', '.key'].includes(ext) || /(^|\/)\.env(\.|$)/.test(f);
      out.push({ key: `file:${repo}:${f}`, severity: isSecretFile ? '高' : '中',
        title: `公開リポジトリに業務ファイル: ${repo}/${f}`,
        detail: `https://${GITHUB_OWNER}.github.io/${repo}/ 配下から誰でもダウンロードできます。不要なら削除し、.gitignore に追加してください（履歴からも消す場合は別途作業が必要です）。` });
    }
  }
  return out;
}

// 消したつもりでも履歴に残っていて、コミットを指定すれば誰でも取り出せる業務ファイル
function checkHistoryFiles() {
  const out = [];
  for (const repo of REPOS) {
    const current = new Set(git(repo, ['-c', 'core.quotepath=false', 'ls-files']).split('\n'));
    const added = git(repo, ['-c', 'core.quotepath=false', 'log', '--all', '--diff-filter=A', '--name-only', '--format=']).split('\n');
    for (const f of new Set(added)) {
      if (!f || current.has(f) || !SENSITIVE_EXT.includes(path.extname(f).toLowerCase())) continue;
      out.push({ key: `history-file:${repo}:${f}`, severity: '中', title: `削除済みだが履歴に残っている業務ファイル: ${repo}/${f}`,
        detail: 'GitHub 上で過去のコミットを開けば今も取得できます。完全に消すには履歴の書き換え（git filter-repo）と force push が必要です。' });
    }
  }
  return out;
}

// 公開中のファイルに書かれた携帯電話番号（件数だけ数える。番号そのものはメールにも書かない）
function checkPhoneNumbers() {
  const out = [];
  for (const repo of REPOS) {
    let grep = '';
    try {
      grep = git(repo, ['-c', 'core.quotepath=false', 'grep', '-c', '-E', '0[789]0-?[0-9]{4}-?[0-9]{4}', 'HEAD', '--', '.', ':!*.min.js']);
    } catch (_) { continue; } // 1件も無いと終了コード 1
    for (const line of grep.split('\n').filter(Boolean)) {
      const [, file, count] = line.match(/^HEAD:(.*):(\d+)$/) || [];
      if (!file) continue;
      out.push({ key: `phone:${repo}:${file}`, severity: '高', title: `携帯電話番号らしき記載が公開されている: ${repo}/${file}`,
        detail: `${count}行。個人の連絡先であれば削除し、ログイン後に DB から読む形にしてください。` });
    }
  }
  return out;
}

// HTML の <script>/<link> で外部 CDN を読み込んでいるのに integrity（改ざん検知）が無いもの
function checkCdnScripts() {
  const out = [];
  for (const repo of REPOS) {
    const files = git(repo, ['-c', 'core.quotepath=false', 'ls-files', '*.html']).split('\n').filter(Boolean);
    for (const f of files) {
      const html = fs.readFileSync(path.join(WORK_DIR, repo, f), 'utf8');
      for (const m of html.matchAll(/<script\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi)) {
        const url = m[1];
        if (/integrity=/i.test(m[0])) continue;
        const latest = /@latest|\/latest\//.test(url) || !/@\d|\/\d+\.\d+/.test(url);
        out.push({ key: `cdn:${repo}:${f}:${url}`, severity: latest ? '中' : '低',
          title: `${latest ? 'バージョン未固定の' : ''}外部スクリプトを改ざん検知なしで読み込み: ${repo}/${f}`,
          detail: `${url}${latest ? '（配信元が書き換わると即座に全利用者のブラウザで実行されます）' : ''}` });
      }
    }
  }
  return [...new Map(out.map((f) => [f.key, f])).values()];
}

// package.json がある場合、ロックファイルを作って npm audit にかける
function checkNpmAudit() {
  const out = [];
  for (const repo of REPOS) {
    const dir = path.join(WORK_DIR, repo);
    if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
    execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund', '--silent'], { cwd: dir, stdio: 'ignore', shell: process.platform === 'win32' });
    let json;
    try {
      json = execFileSync('npm', ['audit', '--omit=dev', '--json'], { cwd: dir, encoding: 'utf8', shell: process.platform === 'win32' });
    } catch (e) {
      json = e.stdout; // 脆弱性があると終了コードが 0 以外になる
    }
    const vulns = JSON.parse(json || '{}').vulnerabilities || {};
    for (const [name, v] of Object.entries(vulns)) {
      if (!['high', 'critical', 'moderate'].includes(v.severity)) continue;
      out.push({ key: `npm:${repo}:${name}:${v.range}`, severity: v.severity === 'moderate' ? '低' : '中',
        title: `npm パッケージの脆弱性（${v.severity}）: ${repo} / ${name}`,
        detail: `影響範囲 ${v.range}。${!v.fixAvailable ? '修正版はまだありません。' : v.fixAvailable.isSemVerMajor ? '修正版はありますが、メジャーバージョンの更新が必要です（動作確認が必要）。' : 'npm update で修正版にできます。'}` });
    }
  }
  return out;
}

// ===== 状態（前回までに通知済みの問題）の保存 =====
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return { checks: {} }; }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

// ===== メール =====
const fmtDate = (d) => new Date(d).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SEV_COLOR = { '高': '#c0392b', '中': '#d68910', '低': '#2874a6', '情報': '#7f8c8d' };

function findingRows(list) {
  return list
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .map((f) => `<tr>
      <td style="padding:4px 8px;border:1px solid #ddd;color:#fff;background:${SEV_COLOR[f.severity]};white-space:nowrap;text-align:center">${esc(f.severity)}</td>
      <td style="padding:4px 8px;border:1px solid #ddd"><b>${esc(f.title)}</b><br><span style="color:#555">${esc(f.detail)}</span></td>
    </tr>`).join('');
}

const table = (rows) => `<table style="border-collapse:collapse;font-size:13px;width:100%">${rows}</table>`;

const MANUAL_CHECKS = [
  'GitHub の各リポジトリ Settings → Code security で「Secret scanning」と「Push protection」が ON になっているか',
  'Supabase ダッシュボードの Advisors → Security Advisor に新しい警告が出ていないか',
  'Supabase の Authentication → Attack Protection で「漏洩パスワード保護」が ON か、OTP の有効期限が1時間以内か',
  'Microsoft 365 のアプリ登録（メール送信用）のクライアントシークレットの有効期限が近づいていないか',
  'cron-job.org に登録している GitHub トークンが、対象リポジトリの Actions 実行だけに権限を絞ったもの（fine-grained）になっているか、有効期限が近づいていないか',
  '退職・異動した人のアカウントや、使わなくなった外注先アカウントが残っていないか',
];

async function sendReport(newFindings, baselineFindings, allFindings, errors) {
  const scopeLabel = { daily: '日次', weekly: '週次', monthly: '月次まとめ' }[SCOPE] || SCOPE;
  const highCount = allFindings.filter((f) => f.severity === '高').length;
  const subject = SCOPE === 'monthly'
    ? `【セキュリティ監視】月次まとめ（高 ${highCount}件・全 ${allFindings.length}件${errors.length ? `・チェック失敗 ${errors.length}件` : ''}）`
    : newFindings.length ? `【セキュリティ監視】新しい問題 ${newFindings.length}件（${scopeLabel}）`
    : errors.length ? `【セキュリティ監視】チェックが失敗しました（${scopeLabel}）`
    : `【セキュリティ監視】監視を開始しました・現状 ${baselineFindings.length}件（${scopeLabel}）`;

  let html = `<div style="font-family:sans-serif;font-size:14px">
    <p>工程表アプリ群のセキュリティ定期チェック（${esc(scopeLabel)}・${esc(fmtDate(new Date()))}）の結果です。</p>`;
  if (errors.length) {
    html += `<h3 style="color:#c0392b">チェックが実行できなかった項目</h3><ul>${errors.map((e) => `<li>${esc(e.label)}: ${esc(e.error)}</li>`).join('')}</ul>`;
  }
  if (newFindings.length) {
    html += `<h3>前回から新しく見つかった問題（${newFindings.length}件）</h3>${table(findingRows(newFindings))}`;
  }
  if (baselineFindings.length && SCOPE !== 'monthly') {
    html += `<h3>今回から監視を始めた項目の現状（${baselineFindings.length}件）</h3>
      <p style="color:#555">これを基準とし、次回からはここに無い問題が出たときだけ知らせます。</p>${table(findingRows(baselineFindings))}`;
  }
  if (SCOPE === 'monthly') {
    html += `<h3>現在残っている問題（${allFindings.length}件）</h3>`;
    html += allFindings.length ? table(findingRows(allFindings)) : '<p>問題は見つかりませんでした。</p>';
    html += `<h3>手動で確認してほしいこと</h3><ol>${MANUAL_CHECKS.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>`;
  } else {
    html += `<p style="color:#555">既知の問題（全 ${allFindings.length}件）は毎月1日の月次まとめに載せます。</p>`;
  }
  html += '</div>';

  // 手元での確認用: メールを送らず HTML をファイルに書き出す
  if (process.env.DRY_RUN_OUT) {
    fs.writeFileSync(process.env.DRY_RUN_OUT, `<!-- ${subject} -->\n${html}`);
    return;
  }
  requireMailEnv();
  await sendMail({ from: formatFrom('セキュリティ監視'), to: REPORT_TO, subject, html });
}

// ===== メイン =====
(async () => {
  console.log(`セキュリティチェック開始（${SCOPE}）`);
  const weeklyOrMore = SCOPE === 'weekly' || SCOPE === 'monthly';

  await runCheck('auth-settings', 'Supabase 認証設定', checkAuthSettings);
  await runCheck('database', 'Supabase DB の権限設定', checkDatabase);
  await runCheck('auth-users', 'Supabase のアカウント', checkAuthUsers);

  let cloned = true;
  try { cloneRepos(); } catch (e) { cloned = false; results['clone'] = { label: 'リポジトリの取得', findings: [], error: e.message }; }
  if (cloned) {
    // 日次は直近3日分のコミットだけ（取りこぼし防止で多めに見る）、週次以上は全履歴
    await runCheck('secrets', '秘密情報の混入', () => checkRepoSecrets(weeklyOrMore ? null : '3 days ago'));
    await runCheck('files', '公開リポジトリの業務ファイル', checkSensitiveFiles);
    await runCheck('phones', '公開ファイル中の電話番号', checkPhoneNumbers);
    if (weeklyOrMore) {
      await runCheck('history-files', '履歴に残った業務ファイル', checkHistoryFiles);
      await runCheck('cdn', '外部スクリプトの読み込み', checkCdnScripts);
      await runCheck('npm', 'npm パッケージの脆弱性', checkNpmAudit);
    }
  }

  const state = loadState();
  const newFindings = [];
  const baselineFindings = []; // 初めて実行したチェック項目の結果（新規扱いにせず、現状として1回だけ知らせる）
  const allFindings = [];
  const errors = [];
  for (const [name, r] of Object.entries(results)) {
    if (r.error) { errors.push(r); continue; }
    const firstTime = !state.checks[name];
    const known = new Set(state.checks[name] || []);
    const current = r.findings.map((f) => fp(name, f.key));
    r.findings.forEach((f, i) => {
      allFindings.push(f);
      if (firstTime) baselineFindings.push(f);
      else if (!known.has(current[i])) newFindings.push(f);
    });
    // 日次の秘密情報スキャンは直近分しか見ないため、既知の分は消さずに足していく
    state.checks[name] = name === 'secrets' && !weeklyOrMore ? [...new Set([...known, ...current])] : current;
  }

  if (SCOPE === 'monthly' || errors.length > 0 || newFindings.length > 0 || baselineFindings.length > 0) {
    await sendReport(newFindings, baselineFindings, allFindings, errors);
    console.log(process.env.DRY_RUN_OUT ? '結果をファイルに書き出しました' : '結果をメールで送信しました');
  } else {
    console.log('新しい問題はありません（メール送信なし）');
  }
  saveState(state);
})().catch((e) => {
  console.error('セキュリティチェックが異常終了しました');
  process.exitCode = 1;
  // 中身はログに出さない（公開リポジトリのため）。メールで知らせる
  sendMail({ from: formatFrom('セキュリティ監視'), to: REPORT_TO, subject: '【セキュリティ監視】チェックが異常終了しました', text: String(e && e.stack || e) })
    .catch(() => {});
});
