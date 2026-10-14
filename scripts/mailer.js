// 通知メールの送信を一か所にまとめたモジュール。
// MAIL_PROVIDER=graph なら Microsoft 365 の共有メールボックスから Graph API で送り、
// それ以外（未設定を含む）は従来どおり Gmail から送る。
//
// Graph 送信でも、メール本体は nodemailer で従来と同じ MIME 形式に組み立ててから渡すため、
// .ics 添付・HTML本文・宛先表記などの見た目は Gmail 送信と変わらない。
//
// 環境変数:
//   gmail : GMAIL_USER, GMAIL_APP_PASSWORD
//   graph : M365_TENANT_ID, M365_CLIENT_ID, M365_CLIENT_SECRET, M365_SENDER（共有メールボックスのアドレス）
const nodemailer = require('nodemailer');

const MAIL_PROVIDER  = (process.env.MAIL_PROVIDER || 'gmail').trim().toLowerCase();
const IS_GRAPH       = MAIL_PROVIDER === 'graph';
const SENDER_ADDRESS = IS_GRAPH ? process.env.M365_SENDER : process.env.GMAIL_USER;
const GMAIL_ADDRESS  = process.env.GMAIL_USER; // graph 切り替え後も、旧方式で案内済みの会議の変更・キャンセルは Gmail から送る

const REQUIRED_ENV = IS_GRAPH
  ? ['M365_TENANT_ID', 'M365_CLIENT_ID', 'M365_CLIENT_SECRET', 'M365_SENDER']
  : ['GMAIL_USER', 'GMAIL_APP_PASSWORD'];

function requireMailEnv() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`メール送信用の環境変数が未設定です（MAIL_PROVIDER=${MAIL_PROVIDER}）: ${missing.join(', ')}`);
  }
}

// "表示名" <送信元アドレス>
function formatFrom(displayName, address = SENDER_ADDRESS) {
  return `"${displayName}" <${address}>`;
}

// ===== Gmail =====
let gmailTransport = null;

function sendViaGmail(mailOptions) {
  if (!gmailTransport) {
    gmailTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return gmailTransport.sendMail(mailOptions);
}

// ===== Microsoft Graph =====
let mimeBuilder = null;
let tokenCache  = null; // { token, expiresAt }

async function getGraphToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const res = await fetch(`https://login.microsoftonline.com/${process.env.M365_TENANT_ID}/oauth2/v2.0/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.M365_CLIENT_ID,
      client_secret: process.env.M365_CLIENT_SECRET,
      scope:         'https://graph.microsoft.com/.default',
      grant_type:    'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Graph トークン取得エラー [${res.status}]: ${await res.text()}`);
  const json = await res.json();
  // 期限ぎりぎりで失効しないよう、5分早めに取り直す
  tokenCache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 300) * 1000 };
  return tokenCache.token;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 共有メールボックス（/users/{M365_SENDER}）配下の Graph API を呼ぶ。
// body が文字列ならそのまま、オブジェクトなら JSON にして送る。応答が JSON なら解析して返す
async function graphRequest(method, path, body = null, contentType = 'application/json') {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER_ADDRESS)}${path}`;
  const payload = body == null ? undefined : (typeof body === 'string' ? body : JSON.stringify(body));

  for (let attempt = 1; ; attempt++) {
    const headers = { 'Authorization': `Bearer ${await getGraphToken()}` };
    if (payload !== undefined) headers['Content-Type'] = contentType;
    const res = await fetch(url, { method, headers, body: payload });
    if (res.ok) {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }
    // 送信数の制限(429)や一時的な障害(5xx)は、少し待って2回まで再試行する
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const retryAfter = Number(res.headers.get('retry-after')) || 5 * attempt;
      await sleep(retryAfter * 1000);
      continue;
    }
    throw new Error(`Graph エラー [${res.status}] ${method} ${path}: ${await res.text()}`);
  }
}

async function sendViaGraph(mailOptions) {
  if (!mimeBuilder) {
    mimeBuilder = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
  }
  const { message } = await mimeBuilder.sendMail(mailOptions);
  await graphRequest('POST', '/sendMail', message.toString('base64'), 'text/plain');
}

// nodemailer の sendMail と同じ引数（from / to / cc / subject / text / html / attachments）を受け取る。
// provider に 'gmail' を渡すと、MAIL_PROVIDER に関係なく Gmail から送る
function sendMail(mailOptions, provider = MAIL_PROVIDER) {
  return provider === 'graph' ? sendViaGraph(mailOptions) : sendViaGmail(mailOptions);
}

module.exports = { MAIL_PROVIDER, IS_GRAPH, SENDER_ADDRESS, GMAIL_ADDRESS, requireMailEnv, formatFrom, sendMail, graphRequest };
