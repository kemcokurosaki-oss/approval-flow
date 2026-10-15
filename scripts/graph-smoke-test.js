// Microsoft 365（共有メールボックス）との接続を手元のPCで確かめるためのテスト用スクリプト。
// 本番の通知データ（Supabase）には一切触らない。宛先・出席者は TEST_TO（既定は黒崎）だけ。
//
// 準備: 承認フローのフォルダーに .env を作り、次の4行を書く（.env は Git に上がらない設定済み）
//   M365_TENANT_ID=...
//   M365_CLIENT_ID=...
//   M365_CLIENT_SECRET=...
//   M365_SENDER=koutei-notify@kusakabe.com
//
// 使い方（承認フローのフォルダーで実行）:
//   node --env-file=.env scripts/graph-smoke-test.js mail
//       … テストメールを1通送る
//   node --env-file=.env scripts/graph-smoke-test.js event 2026-10-20 10:00 [第1会議室]
//       … 予定を作成する（会議室を書くと会議室も予約する）。表示された予定IDを以降で使う
//   node --env-file=.env scripts/graph-smoke-test.js update <予定ID> 2026-10-20 11:00 [第2会議室]
//   node --env-file=.env scripts/graph-smoke-test.js forward <予定ID> <追加する人のアドレス>
//   node --env-file=.env scripts/graph-smoke-test.js responses <予定ID>
//       … 出席者ごとの回答と、必須/任意の区別を表示する
//   node --env-file=.env scripts/graph-smoke-test.js replies
//       … 共有メールボックスに届いた出欠の返信を新しい順に10件調べ、フォローの印があるか表示する
//   node --env-file=.env scripts/graph-smoke-test.js cancel <予定ID>
process.env.MAIL_PROVIDER = 'graph';
const { SENDER_ADDRESS, requireMailEnv, formatFrom, sendMail, graphRequest } = require('./mailer');
const calendar = require('./calendar');
const { simpleParser } = require('mailparser');

const TEST_TO = process.env.TEST_TO || 'e-kurosaki@kusakabe.com';
const ROOM_EMAILS = {
  '第1会議室': 'Room01@kusakabe.com',
  '第2会議室': 'Room02@kusakabe.com',
  '第3会議室': 'Room03@kusakabe.com',
  '第4会議室': 'Room04@kusakabe.com',
  '第5会議室': 'Room05@kusakabe.com',
};

const fakeReq = (date, time, location) => ({ inspection_date: date, inspection_time: time || null, inspection_location: location || 'テスト' });
const text = (what) =>
  `関係者各位\n\n9999 テスト機 の${what}です（M365接続テスト）。\n\n` +
  `▼ 承認フローを開く\nhttps://kemcokurosaki-oss.github.io/approval-flow/\n\n※このメールは自動送信です。`;

function needRoom(location) {
  if (!location) return null;
  const room = ROOM_EMAILS[location];
  if (!room) throw new Error(`会議室名が違います: ${location}（${Object.keys(ROOM_EMAILS).join('・')}）`);
  return room;
}

async function main() {
  requireMailEnv();
  const [cmd, ...args] = process.argv.slice(2);
  console.log(`共有メールボックス: ${SENDER_ADDRESS} / テスト宛先: ${TEST_TO}\n`);

  switch (cmd) {
    case 'mail': {
      await sendMail({
        from: formatFrom('承認フロー通知'),
        to: TEST_TO,
        subject: '[TEST] M365 送信テスト',
        text: text('送信テスト'),
      });
      console.log('✓ 送信しました。受信トレイ（迷惑メールも）と、送信者名の表示を確認してください');
      break;
    }
    case 'event': {
      const [date, time, location] = args;
      if (!date) throw new Error('日付を指定してください（例: event 2026-10-20 10:00 第1会議室）');
      const roomEmail = needRoom(location);
      const id = await calendar.createMeeting({
        req: fakeReq(date, time, location),
        subject: '[TEST] 出荷確認会議 開催案内 9999 テスト機',
        text: text('出荷確認会議の開催案内'),
        people: [{ email: TEST_TO, name: 'テスト', optional: false }],
        roomEmail,
        transactionId: `smoke-${Date.now()}`,
      });
      console.log(`✓ 予定を作成しました${roomEmail ? `（会議室 ${roomEmail}）` : ''}\n予定ID: ${id}`);
      break;
    }
    case 'update': {
      const [id, date, time, location] = args;
      if (!id || !date) throw new Error('予定IDと日付を指定してください');
      await calendar.updateMeeting(id, {
        req: fakeReq(date, time, location),
        subject: '[TEST] 出荷確認会議 日程変更 9999 テスト機',
        text: text('出荷確認会議の日程変更'),
        people: [{ email: TEST_TO, name: 'テスト', optional: false }],
        roomEmail: needRoom(location),
      });
      console.log('✓ 予定を更新しました');
      break;
    }
    case 'forward': {
      const [id, email] = args;
      if (!id || !email) throw new Error('予定IDと追加する人のアドレスを指定してください');
      await calendar.forwardMeeting(id, [{ email, name: email }], text('出荷確認会議の開催案内（参加者追加）'));
      console.log(`✓ ${email} に転送しました。responses で、出席者に加わったか・必須/任意どちらかを確認してください`);
      break;
    }
    case 'responses': {
      const [id] = args;
      if (!id) throw new Error('予定IDを指定してください');
      const event = await graphRequest('GET', `/events/${encodeURIComponent(id)}?$select=subject,attendees,organizer,isCancelled,iCalUId`);
      console.log(`件名: ${event.subject}${event.isCancelled ? '（キャンセル済み）' : ''}`);
      console.log(`主催者: ${event.organizer?.emailAddress?.name} <${event.organizer?.emailAddress?.address}>`);
      console.log(`iCalUId: ${String(event.iCalUId).slice(0, 40)}…（返信メールの UID と一致すれば、返信と予定を結び付けられる）`);
      for (const a of event.attendees || []) {
        console.log(`  ${a.emailAddress.address}（${a.type}）: ${a.status?.response}  ${a.status?.time || ''}`);
      }
      break;
    }
    case 'replies': {
      const list = await graphRequest('GET',
        `/mailFolders/inbox/messages?$top=10&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime`);
      for (const m of list.value || []) {
        // 予定の返信は .ics 部分が base64 などで符号化されているので、mailparser で解読してから調べる
        const mime     = await graphRequest('GET', `/messages/${encodeURIComponent(m.id)}/$value`);
        const parsed   = await simpleParser(Buffer.from(mime));
        const cal      = (parsed.attachments || []).find((a) => /text\/calendar/i.test(a.contentType || ''));
        const ics      = cal ? cal.content.toString('utf-8').replace(/\r?\n[ \t]/g, '') : '';
        const follow   = /X-MICROSOFT-ATTENDANCE:\s*FOLLOW/i.test(ics);
        const partstat = (ics.match(/PARTSTAT=([A-Z-]+)/i) || [])[1] || '-';
        const uid      = (ics.match(/^UID:(.+)$/m) || [])[1] || '-';
        console.log(`${m.receivedDateTime}  ${m.from?.emailAddress?.address}  「${m.subject}」`);
        console.log(`    ics:${cal ? 'あり' : 'なし'}  PARTSTAT:${partstat}  フォロー:${follow ? 'あり' : 'なし'}  UID:${uid.trim().slice(0, 40)}…`);
      }
      break;
    }
    case 'cancel': {
      const [id] = args;
      if (!id) throw new Error('予定IDを指定してください');
      await calendar.cancelMeeting(id, text('出荷確認会議のキャンセル'));
      console.log('✓ キャンセルしました');
      break;
    }
    default:
      console.log('使い方はファイル先頭のコメントを参照してください（mail / event / update / forward / responses / replies / cancel）');
  }
}

main().catch((err) => {
  console.error('✗ エラー:', err.message);
  process.exit(1);
});
