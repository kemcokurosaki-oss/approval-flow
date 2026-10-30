const { simpleParser } = require('mailparser');
const ical = require('node-ical');
const { requireMailEnv, graphRequest } = require('./mailer');
const calendar = require('./calendar');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim(); // Secretの末尾に改行が入っているとメール内のURLが壊れるため
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

const PARTSTAT_TO_STATUS = {
  ACCEPTED:     'accepted',
  DECLINED:     'declined',
  TENTATIVE:    'tentative',
  'NEEDS-ACTION': 'needs-action',
};

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

// 共有メールボックスの予定表に作成した会議: 予定の出席者ごとの回答を読み取って記録する。
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
  requireMailEnv();
  await checkCalendarResponses();
}

main().catch((err) => {
  console.error('致命的エラー:', err);
  process.exit(1);
});
