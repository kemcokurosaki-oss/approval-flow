const nodemailer = require('nodemailer');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SECRET_KEY;
const GMAIL_USER    = process.env.GMAIL_USER;
const GMAIL_PASS    = process.env.GMAIL_APP_PASSWORD;
const TEST_MODE     = process.env.TEST_MODE === 'true';
const TEST_EMAIL    = 'e-kurosaki@kusakabe.com';

const APP_URL = 'https://kemcokurosaki-oss.github.io/approval-flow/';

// 検査・会議の開催案内・日程変更に添える注意書き（予定表の出欠返信は送信者にしか届かないため、他の参加者の状況はアプリで確認してもらう）。
// 「▼ 承認フローを開く」リンクの直前に入れる
const INVITE_ATTENDANCE_NOTE =
  '\n\n※他の参加者の出欠状況は、承認フロー管理システムの該当案件の画面からご確認ください。';

const ROOM_EMAILS = {
  '第1会議室': 'Room01@kusakabe.com',
  '第2会議室': 'Room02@kusakabe.com',
  '第3会議室': 'Room03@kusakabe.com',
  '第4会議室': 'Room04@kusakabe.com',
  '第5会議室': 'Room05@kusakabe.com',
};

const FLOW_LABELS = {
  assembly:           '組立',
  electrical:         '電装',
  test_run:           '試運転',
  simple_inspection:  '簡易検査',
  inspection:         '外観検査',
  shipping_check_inspection: '出荷品確認検査',
  shipping_meeting:   '出荷確認会議',
  shipping_prep:      '出荷準備',
  shipping:           '出荷確定',
};

// 簡易検査・外観検査・出荷品確認検査・出荷確認会議（このフローの「ペンディング」は画面上「タスク」表記に統一）
const QA_MEETING_FLOWS = ['simple_inspection', 'inspection', 'shipping_meeting', 'shipping_check_inspection'];

// ===== タスクリスト送信（fix_card_sent）用ヘルパー =====
const PHOTO_BUCKET = 'pending-item-photos';
const FLOW_SHORT_LABEL = {
  inspection:        '外観検査',
  simple_inspection: '簡易検査',
  shipping_check_inspection: '出荷品確認検査',
  shipping_meeting:  '出荷確認会議',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function photoUrl(path) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

// ===== 出荷準備フロー: 完了通知メールの追加CC（組立/操業/設計/現地工事担当者） =====
// app.js の splitOwnerNames / isBusinessTripTaskRow / isTripTaskExpired / tripTaskDurationDays と同じ判定をここでも再現する
function splitOwnerNames(ownerStr) {
  return String(ownerStr || '').split(/[,、，]/).map(s => s.trim()).filter(Boolean);
}
function isBusinessTripTaskRow(t) {
  const val = t?.is_business_trip;
  if (val === true || val === 'true' || val === 'TRUE') return true;
  return String(t?.task_type || '').trim().toLowerCase() === 'field_trip';
}
function tripTaskDurationDays(t) {
  let dur = Number(t?.duration);
  if (!Number.isFinite(dur) || dur < 1) dur = 1;
  const sM = t?.start_date ? String(t.start_date).trim().match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  const eM = t?.end_date   ? String(t.end_date).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)   : null;
  if (sM && eM) {
    const s = new Date(+sM[1], +sM[2] - 1, +sM[3]);
    const e = new Date(+eM[1], +eM[2] - 1, +eM[3]);
    const days = Math.floor((e - s) / 86400000) + 1;
    if (days >= 1 && days <= 5000) dur = days;
  }
  return dur;
}
function isTripTaskExpired(t) {
  if (!t?.start_date) return false;
  const m = String(t.start_date).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return false;
  const s = new Date(+m[1], +m[2] - 1, +m[3]);
  const expiry = new Date(s);
  expiry.setDate(expiry.getDate() + tripTaskDurationDays(t) - 1 + 7);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today > expiry;
}

// 工番担当者名からメールアドレスを解決する（profiles・notification_recipientsの両方を検索。app.jsのaddOwnerByNameと同じ範囲）
async function resolveOwnerEmails(names, { profilesOnly = false } = {}) {
  const uniqueNames = [...new Set((names || []).filter(Boolean))];
  const emails = new Set();
  if (uniqueNames.length === 0) return emails;
  const nameListParam = uniqueNames.map(n => `"${n}"`).join(',');
  const profileRows = await supabaseFetch(`profiles?name=in.(${nameListParam})&select=email`);
  (profileRows || []).forEach(p => { if (p.email) emails.add(p.email); });
  if (!profilesOnly) {
    const recipientRows = await supabaseFetch(`notification_recipients?name=in.(${nameListParam})&active=eq.true&select=email`);
    (recipientRows || []).forEach(r => { if (r.email) emails.add(r.email); });
  }
  return emails;
}

// 出荷準備完了通知に追加するCC先を、当該工番・機械の担当者から解決する（営業担当者はToのためここには含めない）
async function resolveShippingPrepCcEmails(req) {
  const emails = new Set();
  if (!req?.project_number) return emails;

  let taskQuery = `tasks?project_number=eq.${encodeURIComponent(req.project_number)}&select=text,owner,major_item,task_type,is_business_trip,start_date,end_date,duration`;
  if (req.machine_name) taskQuery += `&machine=eq.${encodeURIComponent(req.machine_name)}`;
  const tasks = await supabaseFetch(taskQuery);

  const kumitateNames = [...new Set((tasks || []).filter(t => t.text === '機械組立').flatMap(t => splitOwnerNames(t.owner)))];
  const shiuntenNames = [...new Set((tasks || []).filter(t => t.text === '試運転').flatMap(t => splitOwnerNames(t.owner)))];
  const sekkeiNames   = [...new Set((tasks || []).filter(t => t.text === '出図' && String(t.major_item || '').trim() === '設計').flatMap(t => splitOwnerNames(t.owner)))];
  const tripNames     = [...new Set((tasks || []).filter(t => isBusinessTripTaskRow(t) && !isTripTaskExpired(t)).flatMap(t => splitOwnerNames(t.owner)))];

  // 設定画面「工番担当者の自動通知」の出荷準備のON/OFF（未設定のグループはON扱い。app.jsのgetDynamicRecipientPlanと同じ）
  const dynRow = await supabaseFetch(`flow_settings?key=eq.flow_dynamic_recipients&select=value`);
  const dynSaved = dynRow?.[0]?.value?.shipping_prep || {};
  const isOn = g => dynSaved[g] !== false;

  if (isOn('kumitate_owner')) (await resolveOwnerEmails(kumitateNames, { profilesOnly: true })).forEach(e => emails.add(e));
  if (isOn('shiunten_owner')) (await resolveOwnerEmails(shiuntenNames, { profilesOnly: true })).forEach(e => emails.add(e));
  if (isOn('sekkei_owner'))   (await resolveOwnerEmails(sekkeiNames)).forEach(e => emails.add(e));
  if (isOn('trip_owner'))     (await resolveOwnerEmails(tripNames)).forEach(e => emails.add(e));

  return emails;
}

// 出荷準備完了通知（品証・営業担当者宛）の件名・本文。
// 品証には出荷確定申請を、営業担当者には出荷手配と工場出荷確定日の入力を依頼するため、本文を宛先ごとに分けて記載する
function buildShippingPrepCompletedEmail(req, salesOwnerName) {
  const pNum = req?.project_number || '—';
  const pStr = req?.machine_name ? `${pNum} ${req.machine_name}${req.unit_name ? '・' + req.unit_name : ''}` : pNum;
  const note = req?.note ? `\nコメント: ${req.note}` : '';
  const salesLabel = salesOwnerName ? `営業担当者 ${salesOwnerName} 様` : '';
  return {
    from: `"工事工程 通知" <${GMAIL_USER}>`,
    subject: salesOwnerName
      ? `【出荷準備完了通知・工場出荷確定日入力依頼】${pStr}`
      : `【出荷準備完了通知】${pStr}`,
    text:
      `品証ご担当者様` + (salesLabel ? `\n${salesLabel}` : '') + `\n\n` +
      `${pStr} の出荷準備が完了しました。\n\n` +
      `■品証ご担当者様へ\n` +
      `出荷確定申請をしてください。` +
      (salesLabel
        ? `\n\n■${salesLabel}へ\n` +
          `出荷準備が完了したので、出荷（梱包出荷・工場出荷）の手配を進めてください。\n` +
          `あわせて、承認フロー管理システムにログインし、工場出荷確定日を入力してください。`
        : '') +
      `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
  };
}

// 完了予定日が3日以内(期限切れ含む)かどうか。アプリ側のpendingDueSoon()と同じ基準
function isDueSoon(dueStr) {
  if (!dueStr) return false;
  const [y, m, d] = dueStr.split('-').map(Number);
  const dueUTC = Date.UTC(y, m - 1, d);
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueUTC - todayUTC) / 86400000);
  return diffDays <= 3;
}

function statusCellHtml(it) {
  if (it.completed) {
    return `<span style="color:#1c8f4d;background:#eafaf0;border-radius:4px;padding:2px 8px;">完了: ${esc(it.completed_date || '—')}</span>`;
  }
  if (isDueSoon(it.due)) {
    return `<span style="color:#c0392b;background:#fde8e8;border-radius:4px;padding:2px 8px;">期日間近: ${esc(it.due || '—')}</span>`;
  }
  return `期日: ${esc(it.due || '—')}`;
}

// 承認依頼・再申請・却下・他者完了の件名用ラベル（申請系表記）
const FLOW_LABELS_REQUEST = {
  assembly:      '組立完了申請',
  electrical:    '電装完了申請',
  test_run:      '試運転完了申請',
  shipping_prep: '出荷準備完了申請',
  shipping:      '出荷確定申請',
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

// ===== Supabase REST API =====
async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey':          SUPABASE_KEY,
      'Authorization':   `Bearer ${SUPABASE_KEY}`,
      'Content-Type':    'application/json',
      'Prefer':          options.method === 'PATCH' ? 'return=minimal' : 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error [${res.status}]: ${text}`);
  }
  if (options.method === 'PATCH') return null;
  return res.json();
}

// ===== .ics 生成（簡易検査・外観検査・出荷確認会議） =====
function buildICS(req, summary, roomEmail = null, method = 'REQUEST', sequence = 0, attendees = []) {
  if (!req.inspection_date) return null;

  const dateStr = req.inspection_date.replace(/-/g, ''); // YYYYMMDD

  let dtStart, dtEnd;
  if (req.inspection_time) {
    const [hh, mm] = req.inspection_time.split(':').map(Number);
    const endTotalMin = hh * 60 + mm + 30;
    const endHH = String(Math.floor(endTotalMin / 60)).padStart(2, '0');
    const endMM = String(endTotalMin % 60).padStart(2, '0');
    dtStart = `DTSTART;TZID=Asia/Tokyo:${dateStr}T${req.inspection_time.replace(':', '')}00`;
    dtEnd   = `DTEND;TZID=Asia/Tokyo:${dateStr}T${endHH}${endMM}00`;
  } else {
    // 時刻不明の場合は終日イベント
    const [y, m, d] = req.inspection_date.split('-').map(Number);
    const nextDay = new Date(y, m - 1, d + 1).toLocaleDateString('en-CA').replace(/-/g, '');
    dtStart = `DTSTART;VALUE=DATE:${dateStr}`;
    dtEnd   = `DTEND;VALUE=DATE:${nextDay}`;
  }

  const flowSuffix = { simple_inspection: 'si', inspection: 'insp', shipping_check_inspection: 'sci', shipping_meeting: 'sm' }[req.flow_type] || req.flow_type;
  const dtstamp  = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const uid      = `${req.project_number}-${(req.machine_name || '').replace(/\s/g, '')}-${flowSuffix}@approval-flow`;
  const location = (req.inspection_location || '').replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//工事工程承認フロー//JP',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `SEQUENCE:${sequence}`,
    dtStart,
    dtEnd,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=工事工程通知:mailto:${GMAIL_USER}`,
  ];
  if (method === 'CANCEL') {
    lines.push('STATUS:CANCELLED');
  }
  if (roomEmail) {
    const rsvp = method === 'CANCEL' ? 'FALSE' : 'TRUE';
    lines.push(`ATTENDEE;CUTYPE=ROOM;ROLE=NON-PARTICIPANT;RSVP=${rsvp};CN=${location}:mailto:${roomEmail}`);
  }
  const attendeeRsvp = method === 'CANCEL' ? 'FALSE' : 'TRUE';
  attendees.forEach((a) => {
    if (!a?.email) return;
    const role = a.optional ? 'OPT-PARTICIPANT' : 'REQ-PARTICIPANT';
    const cn   = (a.name || a.email).replace(/[,;:"]/g, '');
    lines.push(`ATTENDEE;ROLE=${role};RSVP=${attendeeRsvp};CN=${cn}:mailto:${a.email}`);
  });
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

// ===== メール本文生成 =====
function buildEmail(type, req, recipientName, extra = {}) {
  const pNum       = req?.project_number || '—';
  const machineName = req?.machine_name || '';
  const unitName    = req?.unit_name || '';
  const pStr       = machineName ? `${pNum} ${machineName}${unitName ? '・' + unitName : ''}` : pNum; // "1234 機械A・BD"
  const flow       = FLOW_LABELS[req?.flow_type]         || req?.flow_type || '—';
  const flowReq    = FLOW_LABELS_REQUEST[req?.flow_type] || flow; // 承認依頼・再申請用
  const note       = req?.note ? `\nコメント: ${req.note}` : '';
  const isQaFlow   = QA_MEETING_FLOWS.includes(req?.flow_type);
  const itemLabel  = isQaFlow ? 'タスク' : 'ペンディング項目';
  const detailLine = extra?.detail ? `\n${itemLabel}内容: ${extra.detail}` : '';
  const from       = `"工事工程 通知" <${GMAIL_USER}>`;
  const parallelNote = req?.flow_type === 'assembly'
    ? '\n\n※組立課長・部長どちらかが承認すれば完了になります。先に承認された場合、もう一方の承認は不要です。'
    : req?.flow_type === 'test_run'
    ? '\n\n※操業課長・部長どちらかが承認すれば完了になります。先に承認された場合、もう一方の承認は不要です。'
    : '';

  switch (type) {
    case 'approval_request': {
      const requesterLine = extra?.requesterName ? `\n申請者: ${extra.requesterName}` : '';
      return {
        from,
        subject: `【承認依頼】${pStr}　${flowReq}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の「${flowReq}」について承認依頼が届いています。` +
          requesterLine +
          `\n承認フロー管理システムにログインして承認をお願いします。` +
          parallelNote +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'resubmit': {
      const requesterLine = extra?.requesterName ? `\n申請者: ${extra.requesterName}` : '';
      return {
        from,
        subject: `【再申請】${pStr}　${flowReq}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の「${flowReq}」が修正のうえ再申請されました。` +
          requesterLine +
          `\n承認フロー管理システムにログインして内容をご確認のうえ承認をお願いします。` +
          parallelNote +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'approved':
    case 'completed': {
      const isShipping = req?.flow_type === 'shipping';
      // 出荷確定申請の承認と営業の確定出荷日入力は別扱いのため、承認時点で未入力の場合がある（未入力なら後日営業が入力する旨を表示）
      const shippingDateValue = v => v || '未入力（営業が別途入力します）';
      const shippingDate = isShipping
        ? (req?.confirmed_shipping_date_2
            ? `\n①工場出荷確定日: ${shippingDateValue(req?.confirmed_shipping_date)}\n②工場出荷確定日: ${req.confirmed_shipping_date_2}`
            : `\n工場出荷確定日: ${shippingDateValue(req?.confirmed_shipping_date)}`)
        : '';
      const approverLine = isShipping && extra?.approverName
        ? `\n承認者: ${extra.approverName}（常務）` : '';
      const completedSubject = isShipping
        ? `【出荷確定申請 承認通知】${pStr}`
        : ['assembly', 'electrical', 'test_run', 'shipping_prep'].includes(req?.flow_type)
        ? `【${flow}完了通知】${pStr}`
        : `【${flow}】${pStr}`;
      const completedBody = req?.flow_type === 'assembly'
        ? `${pStr} の機械組立が完了しました。`
        : req?.flow_type === 'electrical'
        ? `${pStr} の電装が完了しました。`
        : req?.flow_type === 'test_run'
        ? `${pStr} の試運転が完了しました。`
        : req?.flow_type === 'shipping_prep'
        ? `${pStr} の出荷準備が完了しました。`
        : isShipping
        ? `${pStr} の出荷確定申請が承認されました。`
        : `${pStr} の「${flow}」が承認されました。`;
      // 試運転完了時の申し送り事項は、通知を見た人がその場で内容を把握できるよう本文にそのまま記載する
      const testRunPendingItems = req?.flow_type === 'test_run'
        ? (req?.sheet_data?.pending_items || []).filter(p => p.content || p.machine)
        : [];
      const testRunPendingNote = testRunPendingItems.length > 0
        ? '\n\n【申し送り事項】\n' + testRunPendingItems.map((p, i) => {
            let line = `${i + 1}. ${p.machine ? p.machine + '：' : ''}${p.content || ''}`;
            line += `（宛先部署: ${p.depts && p.depts.length > 0 ? p.depts.join('・') : '該当なし'}）`;
            return line;
          }).join('\n')
        : '';
      return {
        from,
        subject: completedSubject,
        text:
          `${recipientName} 様\n\n` +
          completedBody +
          shippingDate +
          approverLine +
          testRunPendingNote +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'completed_by_other':
      return {
        from,
        subject: `【承認完了】${pStr}　${flowReq}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の「${flowReq}」は他の承認者により承認完了になりました。\n` +
          `対応は不要です。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'rejected':
      return {
        from,
        subject: `【却下】${pStr}　${flowReq}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の「${flowReq}」が却下されました。\n` +
          `承認フロー管理システムで内容を確認し、再申請してください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'shipping_date_request':
      return {
        from,
        subject: `【工場出荷確定日入力依頼】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `承認フロー管理システムにログインし、工場出荷確定日を入力してください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'shipping_date_input_done': {
      // detail は保存した項目ごとの明細（初回入力は「項目: 日付」、変更は「項目: 旧 → 新」の行）。
      // 梱包出荷確定日の入力は廃止したため、項目名は工場出荷確定日のみ（detail が無いのは旧仕様の初回入力通知）
      const detailLines = (extra?.detail || '').split('\n').filter(Boolean);
      const isDateChange = detailLines.some(l => l.includes('→'));
      const dateName = '工場出荷確定日';
      const changeDetailLine = detailLines.length ? `\n${detailLines.join('\n')}\n` : '';
      return {
        from,
        subject: isDateChange ? `【${dateName}変更】${pStr}` : `【${dateName}入力済み】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          (isDateChange
            ? `${pStr} の${dateName}が変更されました。`
            : `${pStr} の${dateName}が入力されました。`) +
          changeDetailLine +
          `\n内容をご確認ください。問題がある場合は承認フロー管理システムで日付を変更してください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'pending_item_assigned':
      return {
        from,
        subject: `【${itemLabel}】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr}（${flow}）の${itemLabel}の担当者に割り当てられました。` +
          detailLine +
          `\n承認フロー管理システムで内容を確認し、完了したら「完了にする」を押してください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'pending_item_completed':
      return {
        from,
        subject: `【${itemLabel}完了】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr}（${flow}）の${itemLabel}が完了になりました。` +
          detailLine +
          `\n承認フロー管理システムで内容をご確認ください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'pending_item_uncompleted':
      return {
        from,
        subject: `【${itemLabel}完了取消】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr}（${flow}）の${itemLabel}の完了が取り消されました。` +
          detailLine +
          `\n承認フロー管理システムで内容をご確認ください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'shipping_meeting_invite': {
      const date     = req?.inspection_date     || '未定';
      const time     = req?.inspection_time     ? ` ${req.inspection_time}` : '';
      const location = req?.inspection_location || '未定';
      return {
        from,
        subject: `【出荷確認会議開催案内】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の出荷確認会議を下記のとおり実施します。\n\n` +
          `日時: ${date}${time}\n` +
          `場所: ${location}` +
          `${note}${INVITE_ATTENDANCE_NOTE}\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'simple_inspection_reschedule': {
      const date     = req?.inspection_date     || '未定';
      const time     = req?.inspection_time     ? ` ${req.inspection_time}` : '';
      const location = req?.inspection_location || '未定';
      return {
        from,
        subject: `【簡易検査 日程変更】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の簡易検査の日程が変更されました。\n\n` +
          `日時: ${date}${time}\n` +
          `場所: ${location}` +
          `${note}${INVITE_ATTENDANCE_NOTE}\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'shipping_meeting_reschedule': {
      const date     = req?.inspection_date     || '未定';
      const time     = req?.inspection_time     ? ` ${req.inspection_time}` : '';
      const location = req?.inspection_location || '未定';
      return {
        from,
        subject: `【出荷確認会議 日程変更】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の出荷確認会議の日程が変更されました。\n\n` +
          `日時: ${date}${time}\n` +
          `場所: ${location}` +
          `${note}${INVITE_ATTENDANCE_NOTE}\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'inspection_reschedule': {
      const date     = req?.inspection_date     || '未定';
      const time     = req?.inspection_time     ? ` ${req.inspection_time}` : '';
      const location = req?.inspection_location || '未定';
      return {
        from,
        subject: `【外観検査 日程変更】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の外観検査の日程が変更されました。\n\n` +
          `日時: ${date}${time}\n` +
          `場所: ${location}` +
          `${note}${INVITE_ATTENDANCE_NOTE}\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'shipping_meeting_room_change_cancel':
      return {
        from,
        subject: `【出荷確認会議 会場変更】旧会場の予約を解除しました（${pStr}）`,
        text:
          `${pStr} の出荷確認会議は会場が変更されたため、こちらの会場の予約を解除しました。` +
          `${note}\n\n※このメールは自動送信です。`,
      };

    case 'inspection_cancel':
      return {
        from,
        subject: `【外観検査 キャンセル】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の外観検査はキャンセルになりました。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'simple_inspection_cancel':
      return {
        from,
        subject: `【簡易検査 キャンセル】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の簡易検査はキャンセルになりました。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'shipping_meeting_cancel':
      return {
        from,
        subject: `【出荷確認会議 キャンセル】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の出荷確認会議はキャンセルになりました。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'simple_inspection_invite': {
      const date     = req?.inspection_date     || '未定';
      const time     = req?.inspection_time     ? ` ${req.inspection_time}` : '';
      const location = req?.inspection_location || '未定';
      return {
        from,
        subject: `【簡易検査開催案内】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の簡易検査を下記のとおり実施します。\n\n` +
          `日時: ${date}${time}\n` +
          `場所: ${location}` +
          `${note}${INVITE_ATTENDANCE_NOTE}\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'inspection_invite': {
      const date     = req?.inspection_date     || '未定';
      const time     = req?.inspection_time     ? ` ${req.inspection_time}` : '';
      const location = req?.inspection_location || '未定';
      return {
        from,
        subject: `【外観検査開催案内】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の外観検査を下記のとおり実施します。\n\n` +
          `日時: ${date}${time}\n` +
          `場所: ${location}` +
          `${note}${INVITE_ATTENDANCE_NOTE}\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'shipping_check_inspection_invite': {
      const date     = req?.inspection_date     || '未定';
      const time     = req?.inspection_time     ? ` ${req.inspection_time}` : '';
      const location = req?.inspection_location || '未定';
      return {
        from,
        subject: `【出荷品確認検査開催案内】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の出荷品確認検査を下記のとおり実施します。\n\n` +
          `日時: ${date}${time}\n` +
          `場所: ${location}` +
          `${note}${INVITE_ATTENDANCE_NOTE}\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'shipping_check_inspection_reschedule': {
      const date     = req?.inspection_date     || '未定';
      const time     = req?.inspection_time     ? ` ${req.inspection_time}` : '';
      const location = req?.inspection_location || '未定';
      return {
        from,
        subject: `【出荷品確認検査 日程変更】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の出荷品確認検査の日程が変更されました。\n\n` +
          `日時: ${date}${time}\n` +
          `場所: ${location}` +
          `${note}${INVITE_ATTENDANCE_NOTE}\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

    case 'shipping_check_inspection_cancel':
      return {
        from,
        subject: `【出荷品確認検査 キャンセル】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の出荷品確認検査はキャンセルになりました。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'test_run_ready':
      // 組立フローの承認申請とは独立した通知のため、reqを使わずdetail（工事番号・機械名）だけで組み立てる
      return {
        from,
        subject: `【試運転準備完了】${extra?.detail || ''}`,
        text:
          `${recipientName} 様\n\n` +
          `${extra?.detail || ''} の試運転準備が完了しました。\n` +
          `承認フロー管理システムでご確認ください。` +
          `\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'fix_card_sent': {
      const items = (req?.sheet_data?.pending_items || []).filter(it => it.content);
      const flowLabelShort = FLOW_SHORT_LABEL[req?.flow_type] || '検査';
      const rowsHtml = items.map(it => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${
            it.photo_path
              ? `<img src="${esc(photoUrl(it.photo_path))}" width="100" style="display:block;border-radius:4px;">`
              : '—'
          }</td>
          <td style="padding:8px;border:1px solid #ddd;">${esc(it.location || '—')}</td>
          <td style="padding:8px;border:1px solid #ddd;">${esc(it.content)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${esc(it.owner || '—')}</td>
          <td style="padding:8px;border:1px solid #ddd;">${statusCellHtml(it)}</td>
        </tr>`).join('');
      const html = `
        <div style="font-family:'Hiragino Kaku Gothic ProN','Meiryo',sans-serif;color:#333;">
          <p>${esc(recipientName)} 様</p>
          <h2 style="margin-bottom:4px;">${esc(flowLabelShort)} タスクリスト</h2>
          <p style="margin-top:0;color:#666;">
            工事番号: ${esc(pNum)} ／
            機械: ${esc(machineName || '—')} ／
            検査日: ${esc(req?.inspection_date || '—')}
          </p>
          <table style="border-collapse:collapse;width:100%;font-size:14px;">
            <thead>
              <tr style="background:#f5f5f5;">
                <th style="padding:8px;border:1px solid #ddd;">写真</th>
                <th style="padding:8px;border:1px solid #ddd;">場所</th>
                <th style="padding:8px;border:1px solid #ddd;">内容</th>
                <th style="padding:8px;border:1px solid #ddd;">担当者</th>
                <th style="padding:8px;border:1px solid #ddd;">状態</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <p style="margin-top:16px;"><a href="${APP_URL}">▼ 承認フローを開く</a></p>
          <p style="color:#999;font-size:12px;">※このメールは自動送信です。</p>
        </div>`;
      return {
        from,
        subject: `【${pStr}】 ${flowLabelShort} タスクリスト`,
        text:
          `${recipientName} 様\n\n${pStr} の${flowLabelShort}タスクリストです。承認フロー管理システムでご確認ください。` +
          `\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
        html,
      };
    }

    default:
      return {
        from,
        subject: `【工程通知】${pStr}　${flow}`,
        text:
          `${recipientName} 様\n\n${pStr} に関する通知です。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
  }
}

// ===== メイン処理 =====
async function main() {
  console.log(`====== 承認フロー通知 ======`);
  console.log(`テストモード: ${TEST_MODE}`);

  // 未送信の通知を取得
  const notifications = await supabaseFetch(
    'approval_notifications?emailed_at=is.null&select=id,request_id,recipient_id,recipient_email,notification_type,detail,optional'
  );
  console.log(`未送信通知: ${notifications.length}件`);

  if (notifications.length === 0) {
    console.log('送信する通知はありません');
    return;
  }

  // 申請レコードを一括取得（test_run_ready通知はrequest_idを持たないため除外する）
  const reqIds = [...new Set(notifications.map(n => n.request_id).filter(Boolean))];
  const requests = reqIds.length > 0 ? await supabaseFetch(
    `approval_requests?id=in.(${reqIds.join(',')})&select=id,project_number,machine_name,unit_name,flow_type,status,note,requester_id,inspection_date,inspection_time,inspection_location,confirmed_shipping_date,confirmed_shipping_date_2,sheet_data`
  ) : [];
  const reqMap = Object.fromEntries(requests.map(r => [r.id, r]));

  // 日程変更・キャンセル通知のICSシーケンス番号を事前計算
  const icsSeqTypes = [
    'simple_inspection_reschedule', 'simple_inspection_cancel',
    'inspection_reschedule',        'inspection_cancel',
    'shipping_check_inspection_reschedule', 'shipping_check_inspection_cancel',
    'shipping_meeting_reschedule',  'shipping_meeting_cancel',
  ];
  const icsSeqReqIds = [...new Set(
    notifications.filter(n => icsSeqTypes.includes(n.notification_type)).map(n => n.request_id)
  )];
  const icsSequenceMap = {};
  for (const reqId of icsSeqReqIds) {
    const req = reqMap[reqId];
    if (!req) continue;
    const reschedType = req.flow_type === 'shipping_meeting' ? 'shipping_meeting_reschedule'
        : req.flow_type === 'inspection' ? 'inspection_reschedule'
        : req.flow_type === 'shipping_check_inspection' ? 'shipping_check_inspection_reschedule'
        : 'simple_inspection_reschedule';
    const cancelType  = req.flow_type === 'shipping_meeting' ? 'shipping_meeting_cancel'
        : req.flow_type === 'inspection' ? 'inspection_cancel'
        : req.flow_type === 'shipping_check_inspection' ? 'shipping_check_inspection_cancel'
        : 'simple_inspection_cancel';
    const prev = await supabaseFetch(
      `approval_notifications?request_id=eq.${reqId}&notification_type=in.(${reschedType},${cancelType})&emailed_at=not.is.null&select=id`
    );
    icsSequenceMap[reqId] = (prev?.length || 0) + 1;
  }

  const roomEmailsSet = new Set(Object.values(ROOM_EMAILS));

  // profiles のメールアドレスを一括取得（recipient_idがある場合のみ。申請者名解決のためrequester_idも含める）
  const recipientIds = [...new Set(
    [...notifications.map(n => n.recipient_id), ...requests.map(r => r.requester_id)].filter(Boolean)
  )];
  let profileMap = {};
  if (recipientIds.length > 0) {
    const profiles = await supabaseFetch(
      `profiles?id=in.(${recipientIds.join(',')})&select=id,name,email,role`
    );
    profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
  }

  // 出荷準備フローの完了通知（承認不要のため発生する通知は completed のみ）は、下のループとは別に申請ごとに1通にまとめて送る
  const shippingPrepNotifs = notifications.filter(n =>
    reqMap[n.request_id]?.flow_type === 'shipping_prep' && n.notification_type === 'completed');
  const shippingPrepNotifIds = new Set(shippingPrepNotifs.map(n => n.id));

  // notification_recipients の名前マップを取得（外部宛先の宛名に使用）
  const recipientEmails = [...new Set(notifications.map(n => n.recipient_email).filter(Boolean))];
  let recipientEmailNameMap = {};
  if (recipientEmails.length > 0) {
    const allRecipients = await supabaseFetch(`notification_recipients?active=eq.true&select=name,email`);
    const emailSet = new Set(recipientEmails);
    (allRecipients || []).forEach(r => {
      if (r.email && emailSet.has(r.email)) recipientEmailNameMap[r.email] = r.name;
    });
    // notification_recipients で見つからない場合は profiles 側も検索する
    // （設計部門など、ログインアカウント移行済みの人の上長通知は recipient_email 形式で profiles 側の人へ届くため）
    const stillUnresolved = recipientEmails.filter(e => !recipientEmailNameMap[e]);
    if (stillUnresolved.length > 0) {
      const emailListParam = stillUnresolved.map(e => `"${e}"`).join(',');
      const profileRows = await supabaseFetch(`profiles?email=in.(${emailListParam})&select=name,email`);
      (profileRows || []).forEach(p => {
        if (p.email) recipientEmailNameMap[p.email] = p.name;
      });
    }
  }

  // shipping完了通知用: 承認した常務の名前を取得
  const shippingApproverNameMap = {};
  const shippingCompletedReqIds = [...new Set(
    notifications.filter(n => reqMap[n.request_id]?.flow_type === 'shipping' && n.notification_type === 'completed')
      .map(n => n.request_id)
  )];
  if (shippingCompletedReqIds.length > 0) {
    const steps = await supabaseFetch(
      `approval_steps?request_id=in.(${shippingCompletedReqIds.join(',')})&status=eq.approved&select=request_id,approver_id`
    );
    const approverIdSet = [...new Set((steps || []).map(s => s.approver_id).filter(Boolean))];
    if (approverIdSet.length > 0) {
      const prs = await supabaseFetch(`profiles?id=in.(${approverIdSet.join(',')})&select=id,name`);
      const nameById = Object.fromEntries((prs || []).map(p => [p.id, p.name]));
      (steps || []).forEach(s => {
        if (s.approver_id && nameById[s.approver_id]) shippingApproverNameMap[s.request_id] = nameById[s.approver_id];
      });
    }
  }

  let successCount = 0;
  let skipCount    = 0;
  let errorCount   = 0;

  // ===== 出荷準備完了通知: 申請ごとに1通にまとめ、品証と営業担当者をTo、製管・工番担当者・申請者等をCCにして送る =====
  // 本文は品証向け（出荷確定申請の依頼）と営業向け（出荷手配・工場出荷確定日の入力依頼）に分けて記載する。
  // 営業への工場出荷確定日の入力依頼は、この通知にまとめて送る（別途の入力依頼メールは送らない）
  if (shippingPrepNotifs.length > 0) {
    const productionControlProfiles = await supabaseFetch(`profiles?role=eq.production_control&select=email`);
    const productionControlEmails = (productionControlProfiles || []).map(p => p.email).filter(Boolean);
    const salesMapRow = await supabaseFetch(`app_settings?key=eq.sales_person_map&select=value`);
    const salesMap = salesMapRow?.[0]?.value ? JSON.parse(salesMapRow[0].value) : {};

    for (const reqId of [...new Set(shippingPrepNotifs.map(n => n.request_id))]) {
      const req  = reqMap[reqId];
      const rows = shippingPrepNotifs.filter(n => n.request_id === reqId);
      try {
        const salesOwnerName = salesMap[req.project_number] || null;
        const salesEmails = salesOwnerName ? await resolveOwnerEmails([salesOwnerName]) : new Set();
        const rowEmail = n => n.recipient_email || (n.recipient_id ? profileMap[n.recipient_id]?.email : null);

        const toSet = new Set(salesEmails);
        rows.filter(n => n.recipient_id && profileMap[n.recipient_id]?.role === 'quality')
          .forEach(n => { const e = rowEmail(n); if (e) toSet.add(e); });
        const ccSet = new Set([...productionControlEmails, ...(await resolveShippingPrepCcEmails(req))]);
        rows.forEach(n => { const e = rowEmail(n); if (e) ccSet.add(e); }); // 申請者本人・固定宛先（品証以外）
        // 品証・営業担当者がいない場合は、CC予定の宛先をToにして送る
        if (toSet.size === 0) { ccSet.forEach(e => toSet.add(e)); ccSet.clear(); }
        toSet.forEach(e => ccSet.delete(e));
        if (toSet.size === 0) {
          console.log(`スキップ: 出荷準備完了通知 申請${reqId}（宛先なし）`);
          skipCount++;
          continue;
        }

        const mail = buildShippingPrepCompletedEmail(req, salesOwnerName);
        const toList = [...toSet];
        const ccList = [...ccSet];
        await transporter.sendMail({
          from:    mail.from,
          to:      TEST_MODE ? TEST_EMAIL : toList.join(','),
          cc:      !TEST_MODE && ccList.length > 0 ? ccList.join(',') : undefined,
          subject: TEST_MODE ? `[TEST] ${mail.subject}` : mail.subject,
          text:    TEST_MODE
            ? `【テスト送信】本来の宛先 To: ${toList.join(', ')} / CC: ${ccList.join(', ') || 'なし'}\n\n${mail.text}`
            : mail.text,
        });
        console.log(`✓ 送信完了: 出荷準備完了通知 To: ${toList.join(', ')}${ccList.length ? ` CC: ${ccList.join(', ')}` : ''} (工番${req.project_number})`);

        await supabaseFetch(`approval_notifications?id=in.(${rows.map(n => n.id).join(',')})`, {
          method:  'PATCH',
          body:    JSON.stringify({ emailed_at: new Date().toISOString() }),
        });
        successCount++;
      } catch (err) {
        console.error(`✗ 送信エラー: 出荷準備完了通知 申請${reqId}`, err.message);
        errorCount++;
      }
    }
  }

  for (const notif of notifications) {
    if (shippingPrepNotifIds.has(notif.id)) continue;
    const req = reqMap[notif.request_id];

    // 宛先メールアドレスと名前を決定
    // recipient_email がある場合はそちらを優先（notification_recipients の外部宛先）
    let actualEmail, toName;
    if (notif.recipient_email) {
      actualEmail = notif.recipient_email;
      toName      = recipientEmailNameMap[notif.recipient_email] || '担当者';
    } else if (notif.recipient_id) {
      const profile = profileMap[notif.recipient_id];
      if (!profile?.email) {
        console.log(`スキップ: recipient_id=${notif.recipient_id} (メールアドレスなし)`);
        skipCount++;
        continue;
      }
      actualEmail = profile.email;
      toName      = profile.name || '担当者';
    } else {
      console.log(`スキップ: id=${notif.id} (宛先なし)`);
      skipCount++;
      continue;
    }

    const toEmail = TEST_MODE ? TEST_EMAIL : actualEmail;

    try {
      const extra = {
        approverName:  shippingApproverNameMap[notif.request_id],
        requesterName: req?.requester_id ? (profileMap[req.requester_id]?.name || null) : null,
        detail:        notif.detail,
      };
      const mail = buildEmail(notif.notification_type, req, toName, extra);

      const attachments = [];
      const icsFilenames = {
        'simple_inspection_invite':     '簡易検査.ics',
        'simple_inspection_reschedule': '簡易検査.ics',
        'simple_inspection_cancel':     '簡易検査キャンセル.ics',
        'inspection_invite':            '外観検査.ics',
        'inspection_reschedule':        '外観検査.ics',
        'inspection_cancel':            '外観検査キャンセル.ics',
        'shipping_check_inspection_invite':     '出荷品確認検査.ics',
        'shipping_check_inspection_reschedule': '出荷品確認検査.ics',
        'shipping_check_inspection_cancel':     '出荷品確認検査キャンセル.ics',
        'shipping_meeting_invite':      '出荷確認会議.ics',
        'shipping_meeting_reschedule':  '出荷確認会議.ics',
        'shipping_meeting_cancel':      '出荷確認会議キャンセル.ics',
        'shipping_meeting_room_change_cancel': '出荷確認会議キャンセル.ics',
      };
      const icsFilename = icsFilenames[notif.notification_type];
      if (icsFilename && req) {
        const isCancel     = notif.notification_type.endsWith('_cancel');
        const isReschedule = notif.notification_type.endsWith('_reschedule');
        const icsMethod    = isCancel ? 'CANCEL' : 'REQUEST';
        const icsSeq       = (isCancel || isReschedule) ? (icsSequenceMap[notif.request_id] || 1) : 0;
        const isSmMeeting  = ['shipping_meeting_invite','shipping_meeting_reschedule','shipping_meeting_cancel','shipping_meeting_room_change_cancel']
          .includes(notif.notification_type);
        const roomEmail    = notif.notification_type === 'shipping_meeting_room_change_cancel'
          ? notif.recipient_email
          : (isSmMeeting ? (ROOM_EMAILS[req.inspection_location] || null) : null);
        // 受信者本人のみをATTENDEEに含める（Outlookが出欠の返信メールを送るにはATTENDEE登録が必要なため。
        // 会議室宛の通知はCUTYPE=ROOMの方で扱うのでATTENDEEには含めない）
        const attendees    = (notif.notification_type === 'shipping_meeting_room_change_cancel' || roomEmailsSet.has(actualEmail))
          ? []
          : [{ email: actualEmail, name: toName, optional: !!notif.optional }];
        const icsContent   = buildICS(req, mail.subject, roomEmail, icsMethod, icsSeq, attendees);
        if (icsContent) {
          attachments.push({
            filename:    icsFilename,
            content:     icsContent,
            contentType: `text/calendar; charset=utf-8; method=${icsMethod}`,
          });
        }
      }

      await transporter.sendMail({
        from:        mail.from,
        to:          toEmail,
        subject:     TEST_MODE ? `[TEST] ${mail.subject}` : mail.subject,
        text:        TEST_MODE
          ? `【テスト送信】本来の宛先: ${actualEmail}\n\n${mail.text}`
          : mail.text,
        html:        mail.html,
        attachments,
      });

      console.log(`✓ 送信完了: ${toEmail} (${notif.notification_type} / 工番${req?.project_number})`);

      // 送信済みマーク
      await supabaseFetch(`approval_notifications?id=eq.${notif.id}`, {
        method:  'PATCH',
        body:    JSON.stringify({ emailed_at: new Date().toISOString() }),
      });

      successCount++;
    } catch (err) {
      console.error(`✗ 送信エラー: ${toEmail}`, err.message);
      errorCount++;
    }
  }

  console.log(`\n====== 完了 ======`);
  console.log(`送信成功: ${successCount}件 / スキップ: ${skipCount}件 / エラー: ${errorCount}件`);
}

main().catch(err => {
  console.error('致命的エラー:', err);
  process.exit(1);
});
