const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const ical = require('node-ical');
const { IS_GRAPH, requireMailEnv, graphRequest } = require('./mailer');
const calendar = require('./calendar');

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
const FLOW_SUFFIX = { simple_inspection: 'si', inspection: 'insp', shipping_check_inspection: 'sci', shipping_meeting: 'sm' };

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
    `approval_requests?flow_type=in.(simple_inspection,inspection,shipping_check_inspection,shipping_meeting)&select=id,project_number,machine_name,flow_type`
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
    // Outlookの「出欠せずフォロー」は PARTSTAT=NEEDS-ACTION のまま X-MICROSOFT-ATTENDANCE:FOLLOW で意思表示される
    // （node-icalはX-プレフィックスを外した "MICROSOFT-ATTENDANCE" というキーで格納する）
    const isFollow = String(ev['MICROSOFT-ATTENDANCE'] || '').toUpperCase() === 'FOLLOW';
    return { uid: ev.uid, email, name, status: PARTSTAT_TO_STATUS[partstat] || 'needs-action', isFollow };
  }
  return null;
}

// 予定表方式（MAIL_PROVIDER=graph）で作成した会議: 予定の出席者ごとの回答を読み取って記録する。
// 対象は、キャンセルされておらず、開催日が7日前以降の会議
const CALENDAR_RESPONSE_TO_STATUS = {
  accepted:            'accepted',
  declined:            'declined',
  tentativelyAccepted: 'tentative',
};

// 共有メールボックスに届いた出欠の返信メールから、各出席者の最新の返信を読み取る。
// 「フォロー」は予定の回答では仮承諾として記録されてしまうため、返信メールの X-MICROSOFT-ATTENDANCE:FOLLOW で見分ける。
// 返信メールは既読化・移動しない（Mail.Read 権限のみのため）。直近の期間を毎回読み直す
async function loadLatestReplies(sinceIso) {
  const latest = new Map(); // `${UID}__${email}` -> { isFollow, receivedAt }
  const list = await graphRequest('GET',
    `/mailFolders/inbox/messages?$filter=receivedDateTime ge ${sinceIso}` +
    `&$orderby=receivedDateTime desc&$top=200&$select=id,receivedDateTime`);
  for (const m of list?.value || []) {
    if (m['@odata.type'] !== '#microsoft.graph.eventMessageResponse') continue;
    try {
      const mime = await graphRequest('GET', `/messages/${encodeURIComponent(m.id)}/$value`);
      const parsed = await simpleParser(Buffer.from(mime));
      const ics = (parsed.attachments || []).find((a) => (a.contentType || '').toLowerCase().includes('text/calendar'));
      const reply = ics ? extractAttendeeResponse(ics.content.toString('utf-8')) : null;
      if (!reply) continue;
      const key = `${reply.uid}__${reply.email}`;
      if (!latest.has(key)) latest.set(key, { isFollow: reply.isFollow, receivedAt: m.receivedDateTime }); // 新しい順なので最初が最新
    } catch (err) {
      console.error(`✗ 返信メールの解析エラー: ${m.id}`, err.message);
    }
  }
  return latest;
}

async function checkCalendarResponses() {
  console.log('\n--- 予定表の出欠 ---');
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const requests = await supabaseFetch(
    `approval_requests?calendar_event_id=not.is.null&status=neq.cancelled&inspection_date=gte.${since}` +
    `&select=id,project_number,calendar_event_id`
  );
  if (!requests || requests.length === 0) {
    console.log('対象の会議はありません');
    return;
  }

  const existing = await supabaseFetch(
    `invitation_rsvp?request_id=in.(${requests.map(r => r.id).join(',')})&select=request_id,email,status,is_follow`
  );
  const existingRows = new Map((existing || []).map(r => [`${r.request_id}__${r.email}`, r]));
  const latestReplies = await loadLatestReplies(new Date(Date.now() - 45 * 86400000).toISOString());

  let recorded = 0;
  for (const req of requests) {
    try {
      const { iCalUId, attendees } = await calendar.getEventResponses(req.calendar_event_id);
      for (const a of attendees) {
        if (!a.email) continue;
        const reply = latestReplies.get(`${iCalUId}__${a.email}`);
        const isFollow = !!reply?.isFollow;
        // 最新の返信がフォローなら「フォロー」（回答としては未回答扱い）。それ以外は予定の回答に従う
        const status = isFollow ? 'needs-action' : CALENDAR_RESPONSE_TO_STATUS[a.response];
        if (!status) continue; // 未回答は記録しない（アプリでは「未回答」と表示される）
        const prev = existingRows.get(`${req.id}__${a.email}`);
        if (prev && prev.status === status && !!prev.is_follow === isFollow) continue;
        const time = isFollow ? reply.receivedAt : a.time;
        await supabaseFetch('invitation_rsvp?on_conflict=request_id,email', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            request_id:   req.id,
            email:        a.email,
            name:         a.name,
            status,
            is_follow:    isFollow,
            responded_at: time && !time.startsWith('0001') ? time : new Date().toISOString(),
            updated_at:   new Date().toISOString(),
          }),
        });
        recorded++;
        console.log(`✓ 記録: ${a.email} → ${status}${isFollow ? '（フォロー）' : ''} (工番${req.project_number} / request_id=${req.id})`);
      }
    } catch (err) {
      console.error(`✗ 予定の出欠取得エラー: request_id=${req.id}`, err.message);
    }
  }
  console.log(`予定表: 会議${requests.length}件 / 記録${recorded}件`);
}

async function main() {
  console.log('====== 出欠状況（RSVP）確認 ======');

  const hasGmail = !!(GMAIL_USER && GMAIL_PASS);
  if (!hasGmail && !IS_GRAPH) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD が設定されていません');
  }
  if (IS_GRAPH) {
    requireMailEnv();
    await checkCalendarResponses();
  }
  // 旧方式（.ics 添付メール）で案内した会議の返信は、Gmail の受信箱から読み取る
  if (hasGmail) await checkGmailReplies();
}

async function checkGmailReplies() {
  console.log('\n--- Gmail の返信メール ---');
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
    const mailboxes = await client.list();
    const processedFolderExists = mailboxes.some((mb) => mb.path === PROCESSED_FOLDER);
    if (!processedFolderExists) {
      await client.mailboxCreate(PROCESSED_FOLDER);
    }

    const lock = await client.getMailboxLock('INBOX');
    try {
      // 未読メール全件をスキャンし、text/calendar(method=REPLY)添付を持つものだけを処理する
      // （ICSのmethod=REPLYはMIMEパート内部のヘッダーのため、IMAP側のヘッダー検索では拾えない）
      const uids = await client.search({ seen: false }, { uid: true });

      if (!uids || uids.length === 0) {
        console.log('対象メールはありません');
        return;
      }
      console.log(`未読メール: ${uids.length}件`);

      for (const uid of uids) {
        try {
          const { content } = await client.download(uid, undefined, { uid: true });
          const parsed = await simpleParser(content);
          const icsAttachment = (parsed.attachments || []).find(
            (att) => (att.contentType || '').toLowerCase().includes('text/calendar')
          );
          const icsText = icsAttachment ? icsAttachment.content.toString('utf-8') : null;
          if (!icsText || !/METHOD:REPLY/i.test(icsText)) {
            continue; // 出欠回答メール以外はスキップ（既読化・移動はしない）
          }
          processedCount++;

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

          await supabaseFetch('invitation_rsvp?on_conflict=request_id,email', {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({
              request_id:   requestId,
              email:        reply.email,
              name:         reply.name,
              status:       reply.status,
              is_follow:    reply.isFollow,
              responded_at: new Date().toISOString(),
              updated_at:   new Date().toISOString(),
            }),
          });

          matchedCount++;
          console.log(`✓ 記録: ${reply.email} → ${reply.status}${reply.isFollow ? '（フォロー）' : ''} (request_id=${requestId})`);

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

  console.log(`Gmail: 処理${processedCount}件 / 記録${matchedCount}件`);
}

main().catch((err) => {
  console.error('致命的エラー:', err);
  process.exit(1);
});
