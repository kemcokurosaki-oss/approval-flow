const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const ical = require('node-ical');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const GMAIL_USER    = process.env.GMAIL_USER;
const GMAIL_PASS    = process.env.GMAIL_APP_PASSWORD;

const PROCESSED_FOLDER = 'RSVP処理済み';

const PARTSTAT_TO_STATUS = {
  ACCEPTED:     'accepted',
  DECLINED:     'declined',
  TENTATIVE:    'tentative',
  'NEEDS-ACTION': 'needs-action',
};

// notify-approval.js の buildICS と同じUID生成式（対応表を作るために再現する）
const FLOW_SUFFIX = { simple_inspection: 'si', inspection: 'insp', shipping_meeting: 'sm' };

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        options.method === 'PATCH' || options.method === 'POST' ? 'return=minimal,resolution=merge-duplicates' : 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error [${res.status}]: ${text}`);
  }
  if (options.method === 'PATCH' || options.method === 'POST') return null;
  return res.json();
}

async function buildUidToRequestIdMap() {
  const requests = await supabaseFetch(
    `approval_requests?flow_type=in.(simple_inspection,inspection,shipping_meeting)&select=id,project_number,machine_name,flow_type`
  );
  const map = {};
  (requests || []).forEach((req) => {
    const suffix = FLOW_SUFFIX[req.flow_type];
    if (!suffix) return;
    const uid = `${req.project_number}-${(req.machine_name || '').replace(/\s/g, '')}-${suffix}@approval-flow`;
    map[uid] = req.id;
  });
  return map;
}

function extractAttendeeResponse(icsText) {
  const parsed = ical.sync.parseICS(icsText);
  for (const key of Object.keys(parsed)) {
    const ev = parsed[key];
    if (!ev || ev.method !== 'REPLY' || !ev.uid || !ev.attendee) continue;
    const attendees = Array.isArray(ev.attendee) ? ev.attendee : [ev.attendee];
    const a = attendees[0];
    if (!a) continue;
    const email  = String(a.val || a).replace(/^mailto:/i, '').toLowerCase();
    const params = a.params || {};
    const partstat = (params.PARTSTAT || 'NEEDS-ACTION').toUpperCase();
    const name = params.CN || null;
    return { uid: ev.uid, email, name, status: PARTSTAT_TO_STATUS[partstat] || 'needs-action' };
  }
  return null;
}

async function main() {
  console.log('====== 出欠状況（RSVP）確認 ======');

  if (!GMAIL_USER || !GMAIL_PASS) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD が設定されていません');
  }

  const uidToRequestId = await buildUidToRequestIdMap();

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    logger: false,
  });

  await client.connect();

  let processedCount = 0;
  let matchedCount   = 0;

  try {
    // 処理済みメールの退避先フォルダを用意
    if (!(await client.mailboxExists(PROCESSED_FOLDER))) {
      await client.mailboxCreate(PROCESSED_FOLDER);
    }

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Content-Type: text/calendar; method=REPLY を含む未読メールのみ対象
      const uids = await client.search({
        header: { 'content-type': 'method=REPLY' },
      }, { uid: true });

      if (!uids || uids.length === 0) {
        console.log('対象メールはありません');
        return;
      }
      console.log(`対象メール: ${uids.length}件`);

      for (const uid of uids) {
        processedCount++;
        try {
          const { content } = await client.download(uid, undefined, { uid: true });
          const parsed = await simpleParser(content);
          const icsAttachment = (parsed.attachments || []).find(
            (att) => (att.contentType || '').toLowerCase().includes('text/calendar')
          );
          const icsText = icsAttachment ? icsAttachment.content.toString('utf-8') : null;
          if (!icsText) {
            console.log(`スキップ: uid=${uid} (ICS添付なし)`);
            continue;
          }

          const reply = extractAttendeeResponse(icsText);
          if (!reply) {
            console.log(`スキップ: uid=${uid} (REPLY情報を解析できません)`);
            continue;
          }

          const requestId = uidToRequestId[reply.uid];
          if (!requestId) {
            console.log(`スキップ: uid=${uid} (対応する申請が見つかりません: ${reply.uid})`);
            continue;
          }

          await supabaseFetch('invitation_rsvp', {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({
              request_id:   requestId,
              email:        reply.email,
              name:         reply.name,
              status:       reply.status,
              responded_at: new Date().toISOString(),
              updated_at:   new Date().toISOString(),
            }),
          });

          matchedCount++;
          console.log(`✓ 記録: ${reply.email} → ${reply.status} (request_id=${requestId})`);

          await client.messageMove(uid, PROCESSED_FOLDER, { uid: true });
        } catch (err) {
          console.error(`✗ 処理エラー: uid=${uid}`, err.message);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  console.log(`\n====== 完了 ======`);
  console.log(`処理: ${processedCount}件 / 記録: ${matchedCount}件`);
}

main().catch((err) => {
  console.error('致命的エラー:', err);
  process.exit(1);
});
