// 検査・会議を共有メールボックスの予定表に直接作成する（MAIL_PROVIDER=graph のときに使う）。
// 出席者に人と会議室を入れておくと、招待・変更・キャンセルのメールは Exchange が自動で送り、
// 会議室の予約・解除も自動で行われる。出欠は予定の出席者ごとの回答から読み取る。
const { graphRequest } = require('./mailer');

const TIME_ZONE = 'Tokyo Standard Time';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// メール本文（テキスト）を予定の本文（HTML）にする。URL はリンクにする
function textToHtml(text) {
  return esc(text)
    .replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}">${url}</a>`)
    .replace(/\n/g, '<br>');
}

// 開始・終了。時刻があれば30分、なければ終日（buildICS と同じ扱い）
function eventTimes(req) {
  if (req.inspection_time) {
    const [hh, mm] = req.inspection_time.split(':').map(Number);
    const end = hh * 60 + mm + 30;
    const pad = (n) => String(n).padStart(2, '0');
    return {
      isAllDay: false,
      start: { dateTime: `${req.inspection_date}T${pad(hh)}:${pad(mm)}:00`, timeZone: TIME_ZONE },
      end:   { dateTime: `${req.inspection_date}T${pad(Math.floor(end / 60))}:${pad(end % 60)}:00`, timeZone: TIME_ZONE },
    };
  }
  const [y, m, d] = req.inspection_date.split('-').map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return {
    isAllDay: true,
    start: { dateTime: `${req.inspection_date}T00:00:00`, timeZone: TIME_ZONE },
    end:   { dateTime: `${nextDay}T00:00:00`, timeZone: TIME_ZONE },
  };
}

// people: [{ email, name, optional }]。会議室は resource として最後に加える
function buildAttendees(people, roomEmail, roomName) {
  const list = people.map((p) => ({
    emailAddress: { address: p.email, name: p.name || p.email },
    type: p.optional ? 'optional' : 'required',
  }));
  if (roomEmail) list.push({ emailAddress: { address: roomEmail, name: roomName || roomEmail }, type: 'resource' });
  return list;
}

function buildEventBody({ req, subject, text, people, roomEmail }) {
  const location = req.inspection_location || '';
  return {
    subject,
    body: { contentType: 'HTML', content: textToHtml(text) },
    ...eventTimes(req),
    location: roomEmail
      ? { displayName: location, locationType: 'conferenceRoom', locationEmailAddress: roomEmail }
      : { displayName: location },
    attendees: buildAttendees(people, roomEmail, location),
    responseRequested: true,
    allowNewTimeProposals: false, // 時刻の提案は受け付けない（日程変更はアプリから行う）
  };
}

// 新規作成。transactionId を渡すと、通信エラーで再実行しても同じ予定が二重にできない
async function createMeeting({ req, subject, text, people, roomEmail, transactionId }) {
  const event = await graphRequest('POST', '/events', {
    ...buildEventBody({ req, subject, text, people, roomEmail }),
    transactionId,
  });
  return event.id;
}

// 日時・場所・本文・出席者を更新する（Exchange が出席者全員に変更通知を送る。会議室を替えた場合は旧会議室の予約も解除される）
async function updateMeeting(eventId, { req, subject, text, people, roomEmail }) {
  await graphRequest('PATCH', `/events/${encodeURIComponent(eventId)}`,
    buildEventBody({ req, subject, text, people, roomEmail }));
}

// 後から追加した参加者にだけ招待を届ける（主催者からの転送。既存の参加者には通知しない）
async function forwardMeeting(eventId, people, comment) {
  await graphRequest('POST', `/events/${encodeURIComponent(eventId)}/forward`, {
    toRecipients: people.map((p) => ({ emailAddress: { address: p.email, name: p.name || p.email } })),
    comment,
  });
}

// キャンセル（出席者全員と会議室にキャンセルが届く）
async function cancelMeeting(eventId, comment) {
  await graphRequest('POST', `/events/${encodeURIComponent(eventId)}/cancel`, { comment });
}

// 出席者ごとの回答。会議室（resource）は除く
async function getAttendeeResponses(eventId) {
  const event = await graphRequest('GET', `/events/${encodeURIComponent(eventId)}?$select=attendees`);
  return (event.attendees || [])
    .filter((a) => a.type !== 'resource')
    .map((a) => ({
      email:    String(a.emailAddress?.address || '').toLowerCase(),
      name:     a.emailAddress?.name || null,
      response: a.status?.response || 'none', // none / accepted / tentativelyAccepted / declined / notResponded / organizer
      time:     a.status?.time || null,
    }));
}

module.exports = { createMeeting, updateMeeting, forwardMeeting, cancelMeeting, getAttendeeResponses };
