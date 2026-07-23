const nodemailer = require('nodemailer');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SECRET_KEY;
const GMAIL_USER    = process.env.GMAIL_USER;
const GMAIL_PASS    = process.env.GMAIL_APP_PASSWORD;
const TEST_MODE     = process.env.TEST_MODE === 'true';
const TEST_EMAIL    = 'e-kurosaki@kusakabe.com';

const APP_URL = 'https://kemcokurosaki-oss.github.io/approval-flow/';

const ROOM_EMAILS = {
  '第1会議室': 'Room01@kusakabe.com',
  '第2会議室': 'Room02@kusakabe.com',
  '第3会議室': 'Room03@kusakabe.com',
  '第4会議室': 'Room04@kusakabe.com',
  '第5会議室': 'Room05@kusakabe.com',
};

const FLOW_LABELS = {
  assembly:         '組立',
  test_run:         '試運転',
  simple_inspection:'簡易検査',
  inspection:       '外観検査',
  shipping_meeting: '出荷確認会議',
  shipping_prep:    '出荷準備',
  shipping:         '出荷確定',
};

// 承認依頼・再申請・却下・他者完了の件名用ラベル（申請系表記）
const FLOW_LABELS_REQUEST = {
  assembly:      '組立完了申請',
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
function buildICS(req, summary, roomEmail = null, method = 'REQUEST', sequence = 0) {
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

  const flowSuffix = { simple_inspection: 'si', inspection: 'insp', shipping_meeting: 'sm' }[req.flow_type] || req.flow_type;
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
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

// ===== メール本文生成 =====
function buildEmail(type, req, recipientName, extra = {}) {
  const pNum       = req?.project_number || '—';
  const machineName = req?.machine_name || '';
  const pStr       = machineName ? `${pNum} ${machineName}` : pNum; // "1234 機械A"
  const flow       = FLOW_LABELS[req?.flow_type]         || req?.flow_type || '—';
  const flowReq    = FLOW_LABELS_REQUEST[req?.flow_type] || flow; // 承認依頼・再申請用
  const note       = req?.note ? `\nコメント: ${req.note}` : '';
  const detailLine = extra?.detail ? `\nペンディング内容: ${extra.detail}` : '';
  const from       = `"工事工程 通知" <${GMAIL_USER}>`;
  const parallelNote = req?.flow_type === 'assembly'
    ? '\n\n※組立課長・部長どちらかが承認すれば完了になります。先に承認された場合、もう一方の承認は不要です。'
    : req?.flow_type === 'test_run'
    ? '\n\n※操業課長・部長どちらかが承認すれば完了になります。先に承認された場合、もう一方の承認は不要です。'
    : req?.flow_type === 'shipping_prep'
    ? '\n\n※品証・製管どちらかが承認すれば完了になります。先に承認された場合、もう一方の承認は不要です。'
    : '';

  switch (type) {
    case 'approval_request':
      return {
        from,
        subject: `【承認依頼】${pStr}　${flowReq}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の「${flowReq}」について承認依頼が届いています。\n` +
          `承認フロー管理システムにログインして承認をお願いします。` +
          parallelNote +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'resubmit':
      return {
        from,
        subject: `【再申請】${pStr}　${flowReq}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の「${flowReq}」が修正のうえ再申請されました。\n` +
          `承認フロー管理システムにログインして内容をご確認のうえ承認をお願いします。` +
          parallelNote +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'approved':
    case 'completed': {
      const isShipping = req?.flow_type === 'shipping';
      const shippingDate = isShipping && req?.confirmed_shipping_date
        ? `\n確定出荷日: ${req.confirmed_shipping_date}` : '';
      const approverLine = isShipping && extra?.approverName
        ? `\n承認者: ${extra.approverName}（常務）` : '';
      const completedSubject = isShipping ? `【出荷確定通知】${pStr}` : `【${flow}】${pStr}`;
      const completedBody = req?.flow_type === 'assembly'
        ? `${pStr} の機械組立が完了しました。`
        : req?.flow_type === 'test_run'
        ? `${pStr} の試運転が完了しました。`
        : isShipping
        ? `${pStr} の出荷日が確定しました。`
        : `${pStr} の「${flow}」が承認されました。`;
      return {
        from,
        subject: completedSubject,
        text:
          `${recipientName} 様\n\n` +
          completedBody +
          shippingDate +
          approverLine +
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
        subject: `【確定出荷日入力依頼】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の出荷確定申請が品証より起票されました。\n` +
          `承認フロー管理システムにログインし、確定出荷日を入力してください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'shipping_date_input_done':
      return {
        from,
        subject: `【確定出荷日入力済み】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr} の確定出荷日が営業担当者より入力されました。\n` +
          `内容を確認し、常務への本申請をお願いします。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'pending_item_assigned':
      return {
        from,
        subject: `【ペンディング項目】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr}（${flow}）のペンディング項目の担当者に割り当てられました。` +
          detailLine +
          `\n承認フロー管理システムで内容を確認し、完了したら「完了にする」を押してください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'pending_item_completed':
      return {
        from,
        subject: `【ペンディング完了】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr}（${flow}）のペンディング項目が完了になりました。` +
          detailLine +
          `\n承認フロー管理システムで内容をご確認ください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'shipping_prep_done':
      return {
        from,
        subject: `【出荷準備完了】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr}（${flow}）の出荷準備が完了しました。` +
          detailLine +
          `\n内容を確認のうえ、開催案内を完了にして出荷確定申請を行ってください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'pending_item_uncompleted':
      return {
        from,
        subject: `【ペンディング完了取消】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr}（${flow}）のペンディング項目の完了が取り消されました。` +
          detailLine +
          `\n承認フロー管理システムで内容をご確認ください。` +
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };

    case 'shipping_prep_uncompleted':
      return {
        from,
        subject: `【出荷準備完了取消】${pStr}`,
        text:
          `${recipientName} 様\n\n` +
          `${pStr}（${flow}）の出荷準備の完了が取り消されました。` +
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
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
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
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
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
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
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
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
      };
    }

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
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
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
          `${note}\n\n▼ 承認フローを開く\n${APP_URL}\n\n※このメールは自動送信です。`,
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
    'approval_notifications?emailed_at=is.null&select=id,request_id,recipient_id,recipient_email,notification_type,detail'
  );
  console.log(`未送信通知: ${notifications.length}件`);

  if (notifications.length === 0) {
    console.log('送信する通知はありません');
    return;
  }

  // 申請レコードを一括取得
  const reqIds = [...new Set(notifications.map(n => n.request_id))];
  const requests = await supabaseFetch(
    `approval_requests?id=in.(${reqIds.join(',')})&select=id,project_number,machine_name,flow_type,status,note,inspection_date,inspection_time,inspection_location,confirmed_shipping_date`
  );
  const reqMap = Object.fromEntries(requests.map(r => [r.id, r]));

  // 日程変更・キャンセル通知のICSシーケンス番号を事前計算
  const icsSeqTypes = [
    'simple_inspection_reschedule', 'simple_inspection_cancel',
    'inspection_reschedule',        'inspection_cancel',
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
        : 'simple_inspection_reschedule';
    const cancelType  = req.flow_type === 'shipping_meeting' ? 'shipping_meeting_cancel'
        : req.flow_type === 'inspection' ? 'inspection_cancel'
        : 'simple_inspection_cancel';
    const prev = await supabaseFetch(
      `approval_notifications?request_id=eq.${reqId}&notification_type=in.(${reschedType},${cancelType})&emailed_at=not.is.null&select=id`
    );
    icsSequenceMap[reqId] = (prev?.length || 0) + 1;
  }

  // profiles のメールアドレスを一括取得（recipient_idがある場合のみ）
  const recipientIds = [...new Set(
    notifications.map(n => n.recipient_id).filter(Boolean)
  )];
  let profileMap = {};
  if (recipientIds.length > 0) {
    const profiles = await supabaseFetch(
      `profiles?id=in.(${recipientIds.join(',')})&select=id,name,email`
    );
    profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
  }

  // notification_recipients の名前マップを取得（外部宛先の宛名に使用）
  const recipientEmails = [...new Set(notifications.map(n => n.recipient_email).filter(Boolean))];
  let recipientEmailNameMap = {};
  if (recipientEmails.length > 0) {
    const allRecipients = await supabaseFetch(`notification_recipients?active=eq.true&select=name,email`);
    const emailSet = new Set(recipientEmails);
    (allRecipients || []).forEach(r => {
      if (r.email && emailSet.has(r.email)) recipientEmailNameMap[r.email] = r.name;
    });
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

  for (const notif of notifications) {
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
        approverName: shippingApproverNameMap[notif.request_id],
        detail:       notif.detail,
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
        'shipping_meeting_invite':      '出荷確認会議.ics',
        'shipping_meeting_reschedule':  '出荷確認会議.ics',
        'shipping_meeting_cancel':      '出荷確認会議キャンセル.ics',
      };
      const icsFilename = icsFilenames[notif.notification_type];
      if (icsFilename && req) {
        const isCancel     = notif.notification_type.endsWith('_cancel');
        const isReschedule = notif.notification_type.endsWith('_reschedule');
        const icsMethod    = isCancel ? 'CANCEL' : 'REQUEST';
        const icsSeq       = (isCancel || isReschedule) ? (icsSequenceMap[notif.request_id] || 1) : 0;
        const isSmMeeting  = ['shipping_meeting_invite','shipping_meeting_reschedule','shipping_meeting_cancel']
          .includes(notif.notification_type);
        const roomEmail    = isSmMeeting ? (ROOM_EMAILS[req.inspection_location] || null) : null;
        const icsContent   = buildICS(req, mail.subject, roomEmail, icsMethod, icsSeq);
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
