// ===== Toast Notifications =====
function showToast(message, type = 'success', replace = false) {
    let container = document.getElementById('toast_container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast_container';
        document.body.appendChild(container);
    }
    if (replace) {
        container.querySelectorAll('.toast').forEach(t => t.remove());
    } else {
        const existing = [...container.querySelectorAll('.toast')].find(t => t.textContent === message);
        if (existing) return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== Loading Overlay =====
let _loadingTimer = null;
function showLoading(label = '処理中...') {
    const el = document.getElementById('app-loading-overlay');
    if (!el) return;
    document.getElementById('app-loading-label').textContent = label;
    // 500ms以内に終わる処理はオーバーレイを表示しない（短時間フラッシュ防止）
    if (_loadingTimer) { clearTimeout(_loadingTimer); _loadingTimer = null; }
    _loadingTimer = setTimeout(() => { el.classList.add('visible'); }, 500);
}
function hideLoading() {
    if (_loadingTimer) { clearTimeout(_loadingTimer); _loadingTimer = null; }
    const el = document.getElementById('app-loading-overlay');
    if (el) el.classList.remove('visible');
}

// ===== Supabase =====
const S_URL = "https://dgekjzkrybrswsxlcbvh.supabase.co";
const S_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZWtqemtyeWJyc3dzeGxjYnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODQ3MjIsImV4cCI6MjA4NDQ2MDcyMn0.BsEj53lV3p76yE9fMPTaLn7ocKTNzYPTqIAnBafYItU";

// Edge のトラッキング防止が localStorage をブロックするためメモリストレージを使用
const _memStore = {};
const _memStorage = {
    getItem:    key       => _memStore[key] ?? null,
    setItem:    (key, v)  => { _memStore[key] = v; },
    removeItem: key       => { delete _memStore[key]; }
};

const db = supabase.createClient(S_URL, S_KEY, {
    auth: {
        flowType:      'implicit',
        persistSession: true,
        storage:        _memStorage,
        // URLの#access_token等はこちらで手動処理する（招待/リセットリンク→パスワード設定画面の判定のため）。
        // 自動検出のままだと本処理より先にトークンが消費され、type=invite/recoveryの判定ができなくなる。
        detectSessionInUrl: false
    }
});

const LOCATION_GROUPS = [
    { label: 'A',  items: ['A1','A2','A3','A4','A5','A6','A7'] },
    { label: 'B',  items: ['B1','B2','B3','B4','B5','B6','B7'] },
    { label: 'C',  items: ['C1','C2','C3','C4','C5','C6','C7'] },
    { label: 'D',  items: ['D0','D1','D2','D3','D4','D5','D6','D7'] },
    { label: 'E1', items: ['E1-0','E1-1','E1-2','E1-3','E1-4','E1-5','E1-6','E1-7'] },
    { label: 'E2', items: ['E2-0','E2-1','E2-2','E2-3','E2-4','E2-5','E2-6','E2-7'] },
    { label: 'E3', items: ['E3-0','E3-1','E3-2','E3-3','E3-4','E3-5','E3-6','E3-7'] },
];

function buildLocationCheckboxes(id) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML =
        `<div class="loc-dd-trigger" onclick="toggleLocDropdown('${id}')">
            <span class="loc-dd-text placeholder">選択してください</span>
            <span class="loc-dd-arrow">▾</span>
        </div>
        <div class="loc-dd-panel">
            ${LOCATION_GROUPS.map(group =>
                `<div class="loc-dd-group">${group.label}</div>` +
                group.items.map(item =>
                    `<label class="loc-dd-item">
                        <input type="checkbox" value="${item}" onchange="updateLocText('${id}')"> ${item}
                    </label>`
                ).join('')
            ).join('')}
        </div>`;
}

function toggleLocDropdown(id) {
    const container = document.getElementById(id);
    const panel = container.querySelector('.loc-dd-panel');
    const isOpen = panel.classList.contains('open');
    document.querySelectorAll('.loc-dd-panel.open').forEach(p => p.classList.remove('open'));
    if (!isOpen) panel.classList.add('open');
}

function updateLocText(id) {
    const container = document.getElementById(id);
    const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const textEl = container.querySelector('.loc-dd-text');
    if (checked.length) {
        textEl.textContent = checked.join('・');
        textEl.classList.remove('placeholder');
    } else {
        textEl.textContent = '選択してください';
        textEl.classList.add('placeholder');
    }
}

function getLocationValue(id) {
    const container = document.getElementById(id);
    if (!container) return '';
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value).join('・');
}

function setLocationCheckboxValue(id, valueStr) {
    const container = document.getElementById(id);
    if (!container) return;
    const selected = new Set((valueStr || '').split('・').filter(Boolean));
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = selected.has(cb.value);
    });
    updateLocText(id);
}

function resetLocationSelect(id) {
    const container = document.getElementById(id);
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    const textEl = container.querySelector('.loc-dd-text');
    if (textEl) { textEl.textContent = '選択してください'; textEl.classList.add('placeholder'); }
    const panel = container.querySelector('.loc-dd-panel');
    if (panel) panel.classList.remove('open');
}

// 場所ドロップダウン外クリックで閉じる
document.addEventListener('click', function(e) {
    if (!e.target.closest('.location-checkbox-area')) {
        document.querySelectorAll('.loc-dd-panel.open').forEach(p => p.classList.remove('open'));
    }
});

const ROOM_EMAILS = {
    '第1会議室': 'Room01@kusakabe.com',
    '第2会議室': 'Room02@kusakabe.com',
    '第3会議室': 'Room03@kusakabe.com',
    '第4会議室': 'Room04@kusakabe.com',
    '第5会議室': 'Room05@kusakabe.com',
};

// 2000番台（2000〜2999）の工番判定（組立・試運転フローのみ承認フロー対象）
const is2000sSeries = num => { const n = parseInt(num, 10); return n >= 2000 && n <= 2999; };
// テンプレートC（3C/4C）の工番判定
const isTemplateC = num => /^[34]C/i.test(num);
// 点検系（3T/4T）の工番判定（D番と同様、機械組立タスクがある工番だけ承認フロー対象）
const isTInspectionSeries = num => /^[34]T/i.test(num);
// 5番台・7番台の工番判定（承認フロー対象外）
const is5or7Series = num => /^[57]/.test(num);
// D番工事の工番判定
const isDSeries = num => /^D/i.test(num);

// ===== 確定出荷日 未入力エスカレーション =====
// 工事番号の頭文字による営業課長の振り分け（3系→麻生、4系→銭、D番→両方。それ以外は対象外）
const SALES_DIRECTOR_NAME = '専務';
function resolveSalesManagerNames(pNum) {
    const n = (pNum || '').toString().trim();
    if (/^D/i.test(n)) return ['銭', '麻生'];
    if (/^3/.test(n)) return ['麻生'];
    if (/^4/.test(n)) return ['銭'];
    return [];
}
// 起票日（JST）を0日目とし、土日を除いた平日のみをカウントした経過営業日数を返す（0時をまたいだ瞬間にカウントアップ）
function businessDaysElapsedSinceJST(awaitingSince) {
    const startStr = new Date(awaitingSince).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
    const nowStr   = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ny, nm, nd] = nowStr.split('-').map(Number);
    let cursor = Date.UTC(sy, sm - 1, sd);
    const end  = Date.UTC(ny, nm - 1, nd);
    let days = 0;
    while (cursor < end) {
        cursor += 86400000;
        const dow = new Date(cursor).getUTCDay(); // 0=日, 6=土
        if (dow !== 0 && dow !== 6) days++;
    }
    return days;
}
// 確定出荷日が未入力のまま経過した営業日数に応じて表示対象者を追加していく（上位者にも追加表示、担当者からは消さない）。
// 3営業日後の0時から課長、5営業日後の0時から部長（専務）を追加。担当者本人が営業課長の場合は課長段階を飛ばし、
// 3営業日後に直接部長へ追加する
function computeShippingEscalationRecipients(pNum, salesOwner, awaitingSince) {
    const elapsedDays = businessDaysElapsedSinceJST(awaitingSince);
    const managers = resolveSalesManagerNames(pNum);
    const ownerIsManager = managers.includes(salesOwner);
    const recipients = new Set();
    if (salesOwner) recipients.add(salesOwner);
    if (elapsedDays >= 3) {
        if (ownerIsManager) recipients.add(SALES_DIRECTOR_NAME);
        else managers.forEach(m => recipients.add(m));
    }
    if (elapsedDays >= 5 && !ownerIsManager) recipients.add(SALES_DIRECTOR_NAME);
    return recipients;
}

// ===== UI State（XStateの代わりにシンプルな状態管理） =====
const ui = {
    state: 'loading',
    send(event) { console.log(`UI: ${this.state} → ${event}`); }
};

// ===== App State =====
let currentUser    = null;
let currentProfile = null;
let allProfiles    = []; // ログイン時に取得した全profiles（id,name,email,role,department）。担当者の上長判定に使用
let allMembers     = []; // ログイン時に取得した全members（設計担当者の上長メール判定に使用）
let projectsMap    = {}; // project_number → { customer_name, project_details }
let currentTab          = 'pending';
let progressTab          = 'progress'; // 'progress'（進捗一覧） | 'assembly_report'（組立・試運転 完了報告＝2000番台）
let assemblyNavActiveNum = ''; // 2000番完了報告タブ：左一覧で直近にジャンプした工事番号（ハイライト表示用。絞り込みはしない）
let mypageFilterMode = 'all'; // マイページ：'all' | 'main'（2000番以外） | 'assembly'（2000番のみ）。進捗一覧側のタブとは独立
let progressSort         = 'job';   // 'job' | 'shipping'
let progressFilterMine   = false;
let progressFilterPrefix = '';
let progressFilterCompleted = false; // 完了済み工番のみ表示するモード
let progressFilterOverdue = false; // 未申請・未承認（品証・製管のみ表示可能）のみ表示するモード
let progressFilterShipAfter = false; // 出荷後対応の未完了ペンディングのみを横断表示するモード（完了済み工番も対象に含む）
let completedProjectNums = new Set(); // completed_projectsに登録済みの工番
let progressCachedData   = null;
let currentDetailReq     = null;
let currentDetailFlowType = '';
let currentDetailHasPackingShipping = false;
let currentDetailShippingTaskCount = 1; // 工程表上の工場出荷タスク件数（分割出荷なら2）
let qaEditingPendingIdx  = null; // 開催結果セクションで編集中のペンディング項目インデックス

let userIsApplicant  = false; // 申請権限フラグ
let isQualityOrSeikan = false; // 品証・製管フラグ（openDetailModal から参照）

function getEffectiveRole() { return currentProfile?.role || ''; }
function getEffectiveDept() { return currentProfile?.department || ''; }

// 部署 → その部署の上長ロール（課長・部長）一覧。品証・製管は課長/部長ロールがprofilesに存在しないため対象外
const DEPT_SUPERVISOR_ROLES = {
    '組立': ['assembly_manager', 'assembly_director'],
    '操業': ['operations_manager', 'operations_director']
};

// 組立・試運転フロー → 申請全体のペンディングを完了操作できる上長ロール（担当者未設定の項目でも操作可）
const FLOW_SUPERVISOR_ROLES = {
    assembly:   ['assembly_manager', 'assembly_director'],
    test_run:   ['operations_manager', 'operations_director'],
    electrical: ['assembly_director']
};

// 組立・試運転フロー → 担当部署（部員全員が完了操作できる）
const FLOW_DEPARTMENTS = {
    assembly:   '組立',
    test_run:   '操業',
    electrical: '電装'
};

// タスク担当者名（item.owner）の上長に、ログイン中ユーザーが該当するか
function isSupervisorOfOwner(ownerName) {
    if (!ownerName) return false;
    // 設計担当者はprofiles未登録の場合があるため、membersテーブルを先に確認する
    const memberRow = allMembers.find(m => m.name === ownerName);
    if (memberRow) {
        const supervisorEmails = [memberRow.supervisor_email1, memberRow.supervisor_email_2].filter(Boolean);
        return supervisorEmails.includes(currentUser?.email);
    }
    // 組立・操業はprofilesのロール（課長/部長）で判定する
    const ownerProfile = allProfiles.find(p => p.name === ownerName);
    if (!ownerProfile) return false;
    const supervisorRoles = DEPT_SUPERVISOR_ROLES[ownerProfile.department];
    if (!supervisorRoles) return false;
    return supervisorRoles.includes(getEffectiveRole()) || isSuperAdmin();
}

function canApplyFlow(flowType) {
    if (isSuperAdmin()) return true;
    const role  = getEffectiveRole();
    const dept  = getEffectiveDept();
    const isQorS = role === 'quality' || role === 'production_control';
    if (flowType === 'assembly')         return (role === 'staff' && dept === '組立') || role === 'assembly_manager';
    if (flowType === 'electrical')       return role === 'staff' && dept === '電装';
    if (flowType === 'test_run')         return (role === 'staff' && dept === '操業') || role === 'operations_manager';
    if (flowType === 'shipping_prep')    return dept === '組立' || dept === '営業' || dept === '物流';
    if (flowType === 'simple_inspection' || flowType === 'inspection' ||
        flowType === 'shipping_check_inspection' ||
        flowType === 'shipping_meeting'  || flowType === 'shipping')  return isQorS;
    return false;
}

// 承認者ロール一覧
const APPROVER_ROLES = ['assembly_manager','assembly_director','operations_manager','operations_director'];

// 設定画面を開けるユーザー（製管2名+常務）
const ADMIN_EMAILS = ['e-kurosaki@kusakabe.com', 's-morimura@kusakabe.com', 'm2-kusakabe@kusakabe.com'];

// ADMIN_EMAILSの3名は、自分の実際のロールに関わらず全てのロールパターンの操作（承認・申請・完了操作等）を常に行える
function isSuperAdmin() { return !!currentUser && ADMIN_EMAILS.includes(currentUser.email); }

function applyRoleLayout(role) {
    const dept        = getEffectiveDept();
    // 品証・製管は出荷準備フローの承認者でもあるため承認待ち一覧の対象に含める
    const isApprover  = APPROVER_ROLES.includes(role) || (role === 'staff' && dept === '営業') || role === 'quality' || role === 'production_control' || isSuperAdmin();
    // 品証、および製管は同一権限（グローバル変数に保存）。管理者は常に品証・製管相当の操作を可能にする
    isQualityOrSeikan = role === 'quality' || role === 'production_control' || isSuperAdmin();
    // 組立・操業・電装 staff + 組立課長 + 操業課長 + 営業staff（出荷準備申請）が申請可
    const isApplicant = (role === 'staff' && (dept === '組立' || dept === '操業' || dept === '営業' || dept === '電装'))
                      || role === 'assembly_manager'
                      || role === 'operations_manager'
                      || isSuperAdmin();
    const isViewOnly  = role === 'staff' && !isApplicant && dept !== '製管';

    // 申請権限フラグをモジュール変数に保存
    userIsApplicant = isApplicant || isQualityOrSeikan;

    // サイドパネル：権限のないセクションをまるごと非表示
    const halfMine    = document.getElementById('side_half_mine');
    const halfPending = document.getElementById('side_half_pending');
    const tabMine     = document.getElementById('side_tab_mine');
    const tabPending  = document.getElementById('side_tab_pending');

    if (halfMine)    halfMine.style.display    = userIsApplicant ? '' : 'none';
    if (halfPending) halfPending.style.display = isApprover      ? '' : 'none';
    if (tabMine)     tabMine.style.display     = userIsApplicant ? '' : 'none';
    if (tabPending)  tabPending.style.display  = isApprover      ? '' : 'none';

    // 両方のセクションがある人だけ折りたたみ機能を有効化
    const hasBoth   = userIsApplicant && isApprover;
    const sidePanel = document.getElementById('side_panel');
    if (sidePanel) sidePanel.classList.toggle('has-both', hasBoth);

    // 片方しかないユーザーはヘッダー自体を隠してカンバン／リストのみ表示
    const headerMine    = halfMine    ? halfMine.querySelector('.side-half-header')    : null;
    const headerPending = halfPending ? halfPending.querySelector('.side-half-header') : null;
    if (headerMine)    headerMine.style.display    = (userIsApplicant && !hasBoth) ? 'none' : '';
    if (headerPending) headerPending.style.display = (isApprover      && !hasBoth) ? 'none' : '';

    if (!isApprover) {
        const badgePending = document.getElementById('side_badge_pending');
        if (badgePending) badgePending.style.display = 'none';
        const countPending = document.getElementById('side_pending_count');
        if (countPending) countPending.style.display = 'none';
    }

    // 進捗一覧のみモード（申請ボタンをCSS非表示）
    const appEl = document.getElementById('app');
    appEl.classList.toggle('is-view-only', isViewOnly);
}

// ===== Constants =====
// 承認ステップを持たず、開催案内送信のみで進行する4フロー（開催後に品証がペンディングを確認して完了させる）
const QA_MEETING_FLOWS = ['simple_inspection', 'inspection', 'shipping_meeting', 'shipping_check_inspection'];

// ===== 設定画面（flow_settings） =====
// フロー種別ごとに設定画面で個人単位に選べる固定宛先の候補グループ（担当者ベースの動的な宛先は対象外）
const FIXED_RECIPIENT_GROUPS = {
    assembly:          [{ key: 'quality',            label: '品証', kind: 'role',       role: 'quality' },
                         { key: 'production_control', label: '製管', kind: 'role',       role: 'production_control' }],
    test_run:          [{ key: 'quality',            label: '品証', kind: 'role',       role: 'quality' },
                         { key: 'production_control', label: '製管', kind: 'role',       role: 'production_control' },
                         { key: 'assembly_director',  label: '常務', kind: 'role',       role: 'assembly_director' }],
    shipping_meeting:  [{ key: 'assembly_director',  label: '常務', kind: 'role',       role: 'assembly_director' },
                         { key: 'production_control', label: '製管', kind: 'role',       role: 'production_control' },
                         { key: 'quality',            label: '品証', kind: 'role',       role: 'quality' },
                         { key: 'gijutsu',            label: '技戦部門', kind: 'department', department: '技戦' }],
    simple_inspection: [{ key: 'assembly_director',  label: '常務', kind: 'role',       role: 'assembly_director' },
                         { key: 'production_control', label: '製管', kind: 'role',       role: 'production_control' },
                         { key: 'quality',            label: '品証', kind: 'role',       role: 'quality' }],
    inspection:        [{ key: 'assembly_director',  label: '常務', kind: 'role',       role: 'assembly_director' },
                         { key: 'production_control', label: '製管', kind: 'role',       role: 'production_control' },
                         { key: 'quality',            label: '品証', kind: 'role',       role: 'quality' },
                         { key: 'gijutsu',            label: '技戦部門', kind: 'department', department: '技戦' }],
    shipping_check_inspection: [{ key: 'production_control', label: '製管', kind: 'role', role: 'production_control' },
                         { key: 'quality',            label: '品証', kind: 'role',       role: 'quality' }],
    shipping_prep:     [{ key: 'quality',            label: '品証', kind: 'role',       role: 'quality' }],
    shipping:          [{ key: 'assembly_director',  label: '常務', kind: 'role',       role: 'assembly_director' },
                         { key: 'production_control', label: '製管', kind: 'role',       role: 'production_control' },
                         { key: 'gijutsu',            label: '技戦部門', kind: 'department', department: '技戦' },
                         // 物流課: 本来の部署が物流の人に加え、profiles.extra_departments に'物流'を持つ兼任者も対象（山下など）
                         { key: 'logistics',          label: '物流課', kind: 'department', department: '物流' }],
    electrical:        [{ key: 'quality',            label: '品証', kind: 'role',       role: 'quality' },
                         { key: 'production_control', label: '製管', kind: 'role',       role: 'production_control' }]
};
let flowSettings   = { fixedRecipients: {}, dynamicRecipients: {} };
async function loadFlowSettings() {
    const { data: settingsRows } = await db.from('flow_settings').select('key, value').in('key', ['flow_fixed_recipients', 'flow_dynamic_recipients']);
    const rows = Object.fromEntries((settingsRows || []).map(r => [r.key, r.value]));
    flowSettings = {
        fixedRecipients:   rows.flow_fixed_recipients   || {},
        dynamicRecipients: rows.flow_dynamic_recipients || {}
    };
}

// 設定変更を履歴テーブルに記録する（保存系の関数から呼び出す）
async function logSettingsChange(category, summary) {
    await db.from('settings_audit_log').insert({ changed_by: currentUser.email, category, summary });
}

// ===== 設定画面（reminder_settings） =====
// リマインダー通知（scripts/notify-reminders.js）のCC宛先のうち、
// ロールでは決まらず個人単位で固定しているもの
const REMINDER_CC_ITEMS = [
    { key: 'approval_reminder_operations_director', label: '承認催促（操業部長宛て）のCC' },
    { key: 'pending_item_reminder',                 label: 'ペンディング項目期日超過催促のCC' },
    { key: 'shipping_list_reminder',                label: '出荷品リスト作成催促のCC' }
];
let reminderCcRecipients = {};
async function loadReminderCcSettings() {
    const { data } = await db.from('reminder_settings').select('value').eq('key', 'reminder_cc_recipients').maybeSingle();
    reminderCcRecipients = data?.value || {};
}
function getReminderCcPlan(itemKey) {
    const plan = reminderCcRecipients[itemKey] || {};
    return { profileIds: plan.profileIds || [], recipientIds: plan.recipientIds || [] };
}

// フロー種別ごとの固定宛先（個人のprofile ID・notification_recipients ID）
function getFixedRecipientPlan(flowType) {
    const plan = flowSettings.fixedRecipients[flowType] || {};
    return { profileIds: plan.profileIds || [], recipientIds: plan.recipientIds || [] };
}

// フロー種別ごとに、工番の担当者から自動で宛先に加わるグループ（担当者本人／上長を分けてON/OFF可能）
// assemblyのkumitateは組立担当者自身が申請するフローのため上長（組立課長）は含まない
const DYNAMIC_RECIPIENT_GROUPS = {
    assembly:          ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'denki_owner'],
    test_run:          ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager', 'shiunten_owner', 'shiunten_manager'],
    shipping_meeting:  ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager', 'shiunten_owner', 'shiunten_manager', 'denki_owner'],
    simple_inspection: ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager', 'denki_owner'],
    inspection:        ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager', 'shiunten_owner', 'shiunten_manager', 'denki_owner'],
    shipping_check_inspection: ['sales', 'sekkei_owner'],
    shipping:          ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager', 'shiunten_owner', 'shiunten_manager'],
    electrical:        ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'shiunten_owner', 'shiunten_manager']
    // shipping_prep: 工番担当者の自動通知は対象外（固定宛先のみ。組立/操業/設計/営業/現地工事担当者は
    // notify-approval.js側で品証宛メールのCCとして解決するため、ここでは扱わない）
};
const DYNAMIC_GROUP_LABELS = {
    kumitate_owner:   '組立担当者（本人）',
    kumitate_manager: '組立課長・部長',
    shiunten_owner:   '操業担当者（本人）',
    shiunten_manager: '操業課長・部長',
    sales:            '営業担当者',
    sekkei_owner:     '設計担当者（本人）',
    sekkei_manager:   '設計担当者の上長',
    denki_owner:      '電装担当者（本人）'
};
// フロー種別ごとの動的宛先ON/OFF設定（未設定のグループはON扱い＝従来通りの動作）
function getDynamicRecipientPlan(flowType) {
    const saved  = flowSettings.dynamicRecipients[flowType] || {};
    const groups = DYNAMIC_RECIPIENT_GROUPS[flowType] || [];
    const result = {};
    groups.forEach(g => { result[g] = saved[g] !== false; });
    return result;
}

// チェックシートを伴うフロー種別 → シートファイル・表示ラベル（申請モーダル・詳細モーダルで共通利用）
// 組立=黄色・電装=紫のバッジ配色（試運転準備チェックのラベル、ユニット別申請状況の見出しなどで共通利用）
const ASSEMBLY_ELEC_BADGE_COLORS = {
    assembly:   'background:#fff3cd;color:#856404;',
    electrical: 'background:#e8d9f7;color:#6f2fa8;',
};

const SHEET_FLOW_META = {
    assembly:   { file: 'sheet.html',          label: '機械組立完了チェックシート',   doneLabel: '機械組立完了報告書' },
    test_run:   { file: 'test_run_sheet.html', label: '社内試運転完了チェックシート', doneLabel: '社内試運転完了報告書' },
    electrical: { file: 'denki_sheet.html',    label: '電気艤装完了チェックシート',   doneLabel: '電気艤装完了報告書' }
};

const FLOW_LABELS = {
    assembly:            '組立完了申請',
    electrical:          '電装完了申請',
    test_run:            '試運転完了申請',
    simple_inspection:   '簡易検査開催案内',
    inspection:          '外観検査開催案内',
    shipping_check_inspection: '出荷品確認検査開催案内',
    shipping_meeting:    '出荷確認会議開催案内',
    shipping_prep:       '出荷準備完了申請',
    shipping:            '出荷確定申請'
};

// 開催案内送信後の詳細モーダルヘッダー用（「開催案内」を省いた表記）。出荷後対応ペンディング一覧のフロー名短縮でも流用する
const QA_DETAIL_TITLE_LABELS = {
    simple_inspection: '簡易検査',
    inspection:        '外観検査',
    shipping_check_inspection: '出荷品確認検査',
    shipping_meeting:  '出荷確認会議',
    assembly:          '組立',
    test_run:          '試運転'
};

// タスク名 → フロー種別（工程表の実タスクからフロー構成・順序を導出するための対応表）
const TASK_TEXT_TO_FLOW = {
    '簡易検査':       'simple_inspection',
    '外観検査':       'inspection',
    '出荷品確認検査': 'shipping_check_inspection',
    '試運転':         'test_run',
    '出荷確認会議':   'shipping_meeting',
    '出荷準備':       'shipping_prep'
};

const ROLE_LABELS = {
    assembly_manager:    '組立課長',
    assembly_director:   '組立部長',
    operations_manager:  '操業課長',
    operations_director: '操業部長',
    design_manager:      '設計課長',
    design_director:     '設計部長',
    quality:             '品質保証課',
    production_control:  '製管',
    staff:               '担当者',
    logistics:           '物流'
};

// ===== 名簿管理（部署ごとの名簿・profiles ⇄ notification_recipients の役職語彙統一） =====
// 部署 + tier(課長/部長) → profiles.role の具体値。品証・製管・営業・技戦・物流は課長/部長を区別しないため未定義（常にstaff固定）
const DEPT_TIER_TO_PROFILE_ROLE = {
    '組立': { manager: 'assembly_manager',   director: 'assembly_director' },
    '操業': { manager: 'operations_manager', director: 'operations_director' },
    '設計': { manager: 'design_manager',     director: 'design_director' }
};
// profiles.role → tier（一覧表示・承認者バッジ突合用の逆引き）
const PROFILE_ROLE_TO_TIER = {
    staff: 'staff',
    assembly_manager: 'manager', assembly_director: 'director',
    operations_manager: 'manager', operations_director: 'director',
    design_manager: 'manager', design_director: 'director',
    quality: 'staff', production_control: 'staff'
};
const TIER_LABELS = { staff: '部員', manager: '課長', director: '部長' };
// approval_steps.approver_role として実際に使われる値 → 対応する申請フロー種別（名簿の承認者バッジ表示用）
const APPROVER_ROLE_FLOWS = {
    assembly_manager:    ['assembly'],
    assembly_director:   ['assembly', 'electrical'],
    operations_manager:  ['test_run'],
    operations_director: ['test_run']
};
// 名簿一覧の部署表示順（未知の部署は末尾に五十音順で追加）
const DEPARTMENT_ORDER = ['組立', '電装', '操業', '設計', '営業', '技戦', '物流', '品証', '製管'];
function sortDepartments(depts) {
    return [...depts].sort((a, b) => {
        const ia = DEPARTMENT_ORDER.indexOf(a), ib = DEPARTMENT_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b, 'ja');
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

const STATUS_LABELS = {
    draft:      '入力中',
    submitted:  '承認待ち',
    in_review:  '承認待ち',
    approved:   '承認完了',
    rejected:   '却下',
    cancelled:  'キャンセル',
    awaiting_shipping_date:    '出荷日入力待ち',
    awaiting_shipping_confirm: '品証確認待ち'
};

const STATUS_CLASSES = {
    draft:      's-gray',
    submitted:  's-submitted',
    in_review:  's-in_review',
    approved:   's-approved',
    rejected:   's-rejected',
    cancelled:  's-rejected',
    awaiting_shipping_date:    's-gray',
    awaiting_shipping_confirm: 's-gray'
};

// ステータスバッジの表示文言（フロー種別ごとに承認者が異なるため、submitted/approved等は flow_type で読み替える）
function statusBadgeLabel(req) {
    if (QA_MEETING_FLOWS.includes(req.flow_type) && req.status === 'submitted') return '開催待ち';
    if (QA_MEETING_FLOWS.includes(req.flow_type) && req.status === 'approved')  return '開催済み';
    if (req.flow_type === 'shipping_prep' && req.status === 'approved')    return '完了';
    return STATUS_LABELS[req.status] || req.status;
}

// ===== Auth =====
async function doLogin() {
    const email    = document.getElementById('login_email').value.trim();
    const password = document.getElementById('login_password').value;
    const errEl    = document.getElementById('login_error');
    errEl.textContent = '';

    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
        errEl.textContent = 'ログインに失敗しました。';
        return;
    }
    // localStorageにトークンを保存（ページを閉じても自動ログイン維持）
    localStorage.setItem('ap_access_token',  data.session.access_token);
    localStorage.setItem('ap_refresh_token', data.session.refresh_token);
    await bootApp(data.session);
}

async function doLogout() {
    if (!confirm('ログアウトしますか？')) return;
    localStorage.removeItem('ap_access_token');
    localStorage.removeItem('ap_refresh_token');
    await db.auth.signOut();
    location.reload();
}

function showLoginOverlay() {
    document.getElementById('login_overlay').classList.add('visible');
}
function hideLoginOverlay() {
    document.getElementById('login_overlay').classList.remove('visible');
}

// ===== 招待・パスワードリセットからのパスワード設定 =====
let _pendingSetPwSession = null;

// メールのリンクから戻ってきたときのURL（#access_token=...&type=invite 等）を読み取る
function parseAuthHash() {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return null;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type         = params.get('type');
    if (!accessToken) return null;
    return { accessToken, refreshToken, type };
}

function showSetPasswordScreen(session) {
    _pendingSetPwSession = session;
    document.getElementById('setpw_overlay').classList.add('visible');
}
function hideSetPasswordScreen() {
    document.getElementById('setpw_overlay').classList.remove('visible');
}

async function doSetPassword() {
    const pw1   = document.getElementById('setpw_password').value;
    const pw2   = document.getElementById('setpw_password2').value;
    const errEl = document.getElementById('setpw_error');
    errEl.textContent = '';

    if (pw1.length < 6) {
        errEl.textContent = 'パスワードは6文字以上で入力してください。';
        return;
    }
    if (pw1 !== pw2) {
        errEl.textContent = '確認用パスワードが一致しません。';
        return;
    }

    const { error } = await db.auth.updateUser({ password: pw1 });
    if (error) {
        if (error.code === 'same_password') {
            errEl.textContent = '現在のパスワードと同じです。別のパスワードを入力してください。';
        } else {
            errEl.textContent = `パスワードの設定に失敗しました（${error.message || error.code || 'エラー'}）。リンクの有効期限切れの場合は再度招待・リセットをご依頼ください。`;
        }
        return;
    }

    const { data: sessionData } = await db.auth.getSession();
    const session = sessionData?.session || _pendingSetPwSession;
    if (session) {
        localStorage.setItem('ap_access_token',  session.access_token);
        localStorage.setItem('ap_refresh_token', session.refresh_token);
    }

    hideSetPasswordScreen();
    await bootApp(session);
}

// 未ログイン時の操作をブロックし、ログイン画面を促す（実際の可否はDB側RLSで担保。これはUXのための案内）
function requireLogin() {
    if (!currentUser?.id) {
        showToast('この操作にはログインが必要です', 'error');
        showLoginOverlay();
        return true;
    }
    return false;
}

// ヘッダーの実際の高さ（フォント環境で変わる）を測って、
// マイページ・設定パネルの位置合わせに使う --header-height に反映する
function updateHeaderHeightVar() {
    const header = document.querySelector('.header');
    if (!header) return;
    document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
}
window.addEventListener('resize', updateHeaderHeightVar);

async function bootApp(session) {
    currentUser = session.user;

    // セッションを明示的にセット（メモリストレージ経由で確実に反映）
    await db.auth.setSession({
        access_token:  session.access_token,
        refresh_token: session.refresh_token
    });

    // アクセストークンを直接使ってprofiles全件取得（デバッグ用）
    const resAll = await fetch(
        `${S_URL}/rest/v1/profiles?select=id,name,email,role,department`,
        {
            headers: {
                'apikey':        S_KEY,
                'Authorization': `Bearer ${session.access_token}`,
                'Accept':        'application/json'
            }
        }
    );
    const allRows = await resAll.json();
    console.log('全profiles:', JSON.stringify(allRows));
    console.log('ログイン中のUID:', currentUser.id);
    allProfiles = Array.isArray(allRows) ? allRows : [];

    // 設計担当者の上長メール判定用にmembersテーブルを取得
    const { data: memberRows } = await db.from('members').select('name, email, supervisor_email1, supervisor_email_2');
    allMembers = memberRows || [];

    // UID一致で検索
    const profile = Array.isArray(allRows)
        ? allRows.find(r => r.id === currentUser.id) || null
        : null;

    document.getElementById('login_error').textContent =
        `[DEBUG] 全${Array.isArray(allRows) ? allRows.length : 0}件 / UID:${currentUser.id} / 一致:${profile ? profile.name : 'なし'}`;

    if (!profile) {
        document.getElementById('login_error').textContent =
            `プロフィールが未登録です。(uid: ${currentUser.id})`;
        await db.auth.signOut();
        return;
    }

    currentProfile = profile;
    document.getElementById('login_overlay').classList.remove('visible');
    document.getElementById('app').style.display = 'flex';
    document.getElementById('app').classList.remove('is-guest');
    document.getElementById('user_menu_btn').style.display   = '';
    document.getElementById('guest_login_btn').style.display = 'none';
    document.getElementById('rail_mypage').style.display      = '';
    document.getElementById('user_name_display').textContent =
        profile.department ? `${profile.name}（${profile.department}）` : profile.name;
    document.getElementById('user_menu_email').textContent   = currentUser.email;

    // 製管2名+常務のみユーザーメニューの「設定」項目を表示
    if (ADMIN_EMAILS.includes(currentUser.email)) {
        document.getElementById('nav_settings_item').style.display = '';
        // 運用ガイドの「設定画面」の章は管理者のみ閲覧可能にする
        document.getElementById('rail_guide').href = 'guide.html?admin=1';
    }
    updateHeaderHeightVar();

    await loadFlowSettings();
    await loadProjects();
    await refreshAll();

    // データ読み込み後にレイアウトを適用（タブ・ボタンが確実に正しい状態になる）
    applyRoleLayout(profile.role);

    // 初期表示でマイページを開いておく（権限のあるセクションを優先: 自分の申請 > 承認待ち）
    if (userIsApplicant) {
        openSidePanelTo('mine');
    } else if (APPROVER_ROLES.includes(profile.role)) {
        openSidePanelTo('pending');
    }

    setupSheetChannel();
    ui.send('READY');
}

// 未ログインでも閲覧だけはできるようにする起動パス（編集系はDB側RLSでブロックされる）
async function bootGuest() {
    currentUser    = { id: null, email: null };
    currentProfile = { id: null, name: '閲覧のみ', role: '', department: '' };

    hideLoginOverlay();
    document.getElementById('app').style.display = 'flex';
    document.getElementById('app').classList.add('is-guest');
    document.getElementById('user_menu_btn').style.display   = 'none';
    document.getElementById('guest_login_btn').style.display = 'flex';
    document.getElementById('rail_mypage').style.display      = 'none';
    document.getElementById('nav_settings_item').style.display = 'none';
    updateHeaderHeightVar();

    await loadFlowSettings();
    await loadProjects();
    await refreshAll();

    applyRoleLayout('');

    ui.send('READY');
}

// ===== Projects =====
async function loadProjects() {
    // 完了済み工事番号を取得（進捗一覧には含めるが、通常表示では除外する）
    const { data: completed } = await db
        .from('completed_projects')
        .select('project_number');
    completedProjectNums = new Set(
        (completed || []).map(c => (c.project_number || '').toString().trim())
    );

    // 梱包出荷の有無（未定/あり/なし）。工程表に実タスクが無い間の意思表示として保持する
    const { data: packingStatuses } = await db
        .from('packing_shipping_status')
        .select('project_number, status');
    packingStatusMap.clear();
    (packingStatuses || []).forEach(p => {
        packingStatusMap.set((p.project_number || '').toString().trim(), p.status);
    });

    // sort_order付きでタスクを取得（工程表と同じ並び順にするため）
    const { data: tasks } = await db
        .from('tasks')
        .select('project_number, customer_name, project_details, text, sort_order, start_date, end_date, owner')
        .not('project_number', 'is', null)
        .order('sort_order', { ascending: true });

    if (!tasks) return;

    // 工事番号ごとに情報を収集（既存アプリと同じく複数タスクから補完）
    tasks.forEach(t => {
        const num = (t.project_number || '').toString().trim();
        if (!num) return;
        if (is5or7Series(num)) return; // 5番台・7番台は承認フローアプリで一切管理しないため読み込まない
        if (!projectsMap[num]) {
            projectsMap[num] = { customer_name: '', project_details: '' };
        }
        if (!projectsMap[num].customer_name   && t.customer_name)   projectsMap[num].customer_name   = t.customer_name;
        if (!projectsMap[num].project_details && t.project_details) projectsMap[num].project_details = t.project_details;
        // タスク名でフロー対象工番を収集
        const taskText = (t.text || '').trim();
        if (taskText === '機械組立')   assemblyProjectNums.add(num);
        if (taskText === '簡易検査')   simpleInspectionProjectNums.add(num);
        if (taskText === '外観検査')   inspectionProjectNums.add(num);
        if (taskText === '試運転')     testRunProjectNums.add(num);
        if (taskText === '出荷確認会議') shippingMeetingProjectNums.add(num);
        if (taskText === '工場出荷')   shippingProjectNums.add(num);
        // 梱包出荷は有無未定の間、開始日・終了日が空のプレースホルダータスクとして工程表に常設されるため、
        // 実際に日付が入って初めて「梱包出荷あり」として扱う
        if (taskText === '梱包出荷' && t.start_date) packingShippingProjectNums.add(num);
        // 工場出荷タスクの end_date を出荷日として保存（複数機械がある場合は最も早い日付）
        if (taskText === '工場出荷' && t.end_date) {
            const existing = projectsMap[num].shipping_date;
            if (!existing || t.end_date < existing) projectsMap[num].shipping_date = t.end_date;
        }
        // 梱包出荷タスクの end_date を梱包出荷日として保存（複数機械がある場合は最も早い日付）
        if (taskText === '梱包出荷' && t.end_date) {
            const existing = projectsMap[num].packing_shipping_date;
            if (!existing || t.end_date < existing) projectsMap[num].packing_shipping_date = t.end_date;
        }
        // タスクオーナーを収集（自分の工番フィルタ用）
        if (t.owner) {
            if (!projectsMap[num].owners) projectsMap[num].owners = new Set();
            splitOwnerNames(t.owner).forEach(name => projectsMap[num].owners.add(name));
        }
    });

    // 営業担当者（自分の工番フィルタ用）：tasks.ownerは代理対応等で実担当と食い違うことがあるため、
    // 正式な工番別担当マスタであるapp_settings(sales_person_map)を使う
    const { data: sData } = await db.from('app_settings').select('value').eq('key', 'sales_person_map').single();
    const salesPersonMap = sData?.value ? JSON.parse(sData.value) : {};
    Object.entries(salesPersonMap).forEach(([num, name]) => {
        if (projectsMap[num] && name) projectsMap[num].salesOwner = name;
    });
}

// 「自分の担当」フィルタの判定。営業部は正式担当マスタ(sales_person_map)、それ以外はタスク担当者欄で判定する
function projectMatchesMine(num) {
    const myName = currentProfile?.name;
    if (!myName) return false;
    if (currentProfile?.department === '営業') {
        return projectsMap[num]?.salesOwner === myName;
    }
    const owners = projectsMap[num]?.owners;
    return !!(owners && owners.has(myName));
}

const simpleInspectionProjectNums = new Set(); // 簡易検査タスクがある工番
const inspectionProjectNums    = new Set(); // 外観検査タスクがある工番
const assemblyProjectNums      = new Set(); // 機械組立タスクがある工番
const testRunProjectNums       = new Set(); // 試運転タスクがある工番
const shippingMeetingProjectNums = new Set(); // 出荷確認会議タスクがある工番
const shippingProjectNums      = new Set(); // 工場出荷タスクがある工番
const packingShippingProjectNums = new Set(); // 梱包出荷タスクがある工番
const packingStatusMap = new Map(); // 工番 → 梱包出荷の有無('unknown'|'yes'|'no')。packing_shipping_status テーブルの内容

// 梱包出荷「未定」表示・あり／なし選択の対象となる工番かどうか（4000番台・4C番のみ）
function isPackingRelevantProject(num) {
    const n = parseInt(num, 10);
    return (n >= 4000 && n <= 4999) || /^4C/i.test(num);
}

// 梱包出荷の有無を3値で判定する。工程表に日付入りの実タスクが存在する場合はそちらを優先し
// （開始日・終了日が空のプレースホルダータスクは「未定」のまま扱う）、
// 対象工番（4000番台・4C番）でのみ packing_shipping_status テーブルの意思表示（未定/あり/なし）を見る。
// 対象外の工番は梱包出荷の概念自体が無関係なため常に 'no' 扱いにする
function getPackingDisplayState(num, hasActualPackingTask) {
    if (hasActualPackingTask) return 'yes';
    if (!isPackingRelevantProject(num)) return 'no';
    return packingStatusMap.get(num) || 'unknown';
}

async function setPackingShippingStatus(projectNumber, status) {
    try {
        await db.from('packing_shipping_status').upsert({
            project_number: projectNumber,
            status,
            updated_by:     currentUser.id,
            updated_at:     new Date().toISOString()
        }, { onConflict: 'project_number' });
        packingStatusMap.set(projectNumber, status);
        showToast('梱包出荷の有無を更新しました');
    } catch (e) {
        console.warn('梱包出荷有無の更新に失敗:', e);
        showToast('更新に失敗しました', 'error');
    }
}

// 梱包出荷「あり・なし」選択ポップアップは、他のカード表示と重ならないよう
// body直下に1つだけ共有要素を作り、クリックされたバッジの真下・右揃えに毎回位置を計算して表示する
function ensurePackingPopupEl() {
    let el = document.getElementById('shared_packing_popup');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'shared_packing_popup';
    el.className = 'prog-card-packing-popup';
    el.innerHTML = `
        <button type="button" data-status="yes">あり</button>
        <button type="button" data-status="no">なし</button>
    `;
    document.body.appendChild(el);
    el.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', evt => {
            evt.stopPropagation();
            const num = el.dataset.num;
            el.classList.remove('is-open');
            if (num) choosePackingStatus(num, btn.dataset.status);
        });
    });
    return el;
}

// 進捗カードの「梱包出荷：未定」バッジをクリックした時に、あり・なしを選ぶポップアップを開閉する
function togglePackingPopup(evt, num) {
    const el = ensurePackingPopupEl();
    const wasOpenForSameCard = el.classList.contains('is-open') && el.dataset.num === num;
    el.classList.remove('is-open');
    if (wasOpenForSameCard) return;
    const rect = evt.currentTarget.getBoundingClientRect();
    el.style.top   = (rect.bottom + 4) + 'px';
    el.style.right = (window.innerWidth - rect.right) + 'px';
    el.dataset.num = num;
    el.classList.add('is-open');
}
document.addEventListener('click', () => {
    const el = document.getElementById('shared_packing_popup');
    if (el) el.classList.remove('is-open');
});

async function choosePackingStatus(num, status) {
    const el = document.getElementById('shared_packing_popup');
    if (el) el.classList.remove('is-open');
    await setPackingShippingStatus(num, status);
    if (status === 'no') {
        // 「なし」確定時、工程表に残っている空日付のプレースホルダータスクは不要になるため削除する
        await deleteEmptyPackingTasks(num);
    }
    // 「あり」の場合は工程表には触れない。右上表示が「梱包出荷：あり（未入力）」に変わり、
    // 工程表に梱包出荷日が入るか確定梱包出荷日が入力された時点で実際の日付表示に切り替わる
    renderProgressCards();
}

// 梱包出荷「なし」確定時、工程表に残っている開始日・終了日が空のプレースホルダータスクを自動削除する
// （日付が入っている＝別途スケジュール済みの実タスクは誤って消さないよう対象外）
async function deleteEmptyPackingTasks(projectNumber) {
    if (requireLogin()) return;
    try {
        await db.from('tasks')
            .delete()
            .eq('project_number', projectNumber)
            .eq('text', '梱包出荷')
            .is('start_date', null)
            .is('end_date', null);
    } catch (e) {
        console.warn('梱包出荷タスクの削除に失敗:', e);
    }
}

async function onProjectChange(lockedMachine = null) {
    const num    = currentProjectNum;
    const infoEl = document.getElementById('submit_project_info');
    const machineGroup = document.getElementById('submit_machine_group');
    const flowEl = document.getElementById('flow_detect_group');

    if (!num) {
        infoEl.style.display    = 'none';
        machineGroup.style.display = 'none';
        flowEl.style.display    = 'none';
        return;
    }

    // 工事情報表示
    const p = projectsMap[num] || {};
    document.getElementById('submit_customer_display').textContent = p.customer_name || '—';
    document.getElementById('submit_project_name_display').textContent = p.project_details || '—';
    infoEl.style.display = 'block';

    // 組立(assembly)は機械・ユニットを工程表と紐づけない。機械選択欄は出さず、チェックシート側で入力する
    if (currentFlowType === 'assembly') {
        machineGroup.style.display = 'none';
        flowEl.style.display       = 'none';
        return;
    }

    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'submit_machine_list', 'onMachineChange', lockedMachine);
        machineGroup.style.display = 'block';
        flowEl.style.display       = 'none';
    } finally {
        hideLoading();
    }
}

// 出荷準備申請時、前フローに未完了ペンディング（出荷後対応を除く）が残っていれば警告して申請ボタンを無効化する
function _renderPrepBlockerWarning(blockers) {
    const btn = document.getElementById('submit_btn');
    if (btn) btn.disabled = blockers.length > 0;
    if (blockers.length === 0) return;
    const listEl = document.getElementById('flow_detect_list');
    if (listEl) {
        listEl.innerHTML += `<div style="color:#c0392b; font-weight:bold; font-size:14px; margin-top:8px;">⚠ 前フローが未完了のため申請できません</div>`;
    }
}

async function onMachineChange() {
    const num      = currentProjectNum;
    const machines = getSelectedMachines('submit_machine_list');
    const flowEl   = document.getElementById('flow_detect_group');

    // 試運転は一覧型詳細画面（openTestRunFlowDetailModal）に統一したため、申請モーダル内のフロー連鎖表示は不要
    if (currentFlowType === 'test_run') {
        flowEl.style.display = 'none';
        return;
    }

    if (machines.length === 0) {
        document.getElementById('flow_detect_list').innerHTML =
            '<div style="color:#bbb; font-size:13px; padding:8px 0;">機械を選択してください</div>';
        flowEl.style.display = 'block';
        return;
    }

    showLoading('読み込み中...');
    try {
    if (machines.length > 1) {
        // 複数選択: 全選択機械のフローを合成して後続フローを表示
        const chain = await _getUnionFlowChain(num, machines);
        const upcomingFlows = chain.filter(t => t !== currentFlowType && t !== 'assembly');

        document.getElementById('flow_detect_list').innerHTML = `<div class="steps-list">` +
            _flowStepHtml(FS_CUR_SC, FS_CUR_ICON, `${FLOW_LABELS[currentFlowType] || '完了通知'}（今回）`, `${machines.length}機械を一括申請`) +
            upcomingFlows.map(t => _flowStepHtml(FS_WAIT_SC, FS_WAIT_ICON, FLOW_LABELS[t] || t)).join('') +
            `</div>`;
        flowEl.style.display = 'block';
        if (currentFlowType === 'shipping_prep') {
            const blockerLists = await Promise.all(machines.map(m => _getPrepBlockers(num, m)));
            _renderPrepBlockerWarning(blockerLists.flat());
        }
        return;
    }

    // 1台選択: 工程表の実タスクに基づく詳細フロー検出
    const machine = machines[0];
    const chain = await _getMachineFlowChain(num, machine);
    const { approved: approvedRaw, electricalRequired } = await _getRawFlowStatus(num, machine);

    // 電気艤装タスクがある機械は、組立の直後に電装を挿入して常に両方の状況を表示する
    // （組立・電装は並行フローのため、どちらから見ても組立→電装→出荷の順・各自の実際の状況で見せる）
    let displayChain = chain;
    if ((electricalRequired || currentFlowType === 'electrical') && !displayChain.includes('electrical')) {
        const idx = displayChain.indexOf('assembly');
        displayChain = [...displayChain.slice(0, idx + 1), 'electrical', ...displayChain.slice(idx + 1)];
    }

    document.getElementById('flow_detect_list').innerHTML = `<div class="steps-list">` +
        displayChain.map(t => t === currentFlowType
            ? _flowStepHtml(FS_CUR_SC, FS_CUR_ICON, `${FLOW_LABELS[t] || '完了通知'}（今回）`)
            : approvedRaw.has(t)
                ? _flowStepHtml(FS_DONE_SC, FS_DONE_ICON, FLOW_LABELS[t] || t, '承認済み')
                : _flowStepHtml(FS_WAIT_SC, FS_WAIT_ICON, FLOW_LABELS[t] || t)
        ).join('') +
        `</div>`;
    flowEl.style.display = 'block';
    if (currentFlowType === 'shipping_prep') {
        _renderPrepBlockerWarning(await _getPrepBlockers(num, machine));
    }
    } finally {
        hideLoading();
    }
}

// ===== Data Loading =====
async function refreshAll() {
    const role        = getEffectiveRole();
    const dept        = getEffectiveDept();
    const isQorS      = role === 'quality' || role === 'production_control';
    // 品証・製管は出荷準備フローの承認者でもあるため承認待ち一覧の対象に含める
    const isApprover  = APPROVER_ROLES.includes(role) || (role === 'staff' && dept === '営業') || isQorS || isSuperAdmin();
    const isApplicant = role === 'staff' && (dept === '組立' || dept === '操業' || dept === '営業');

    const loads = [];
    loads.push(loadProgress());
    if (isApprover) loads.push(loadPendingSide());
    if (isApplicant || isQorS || role === 'assembly_manager' || role === 'operations_manager' || isSuperAdmin()) loads.push(loadMineSide());

    await Promise.all(loads);
}

// マイページ：表示切替（全て / 2000番以外 / 2000番のみ）。進捗一覧側のタブとは独立して切り替え可能
function setMypageFilterMode(mode) {
    mypageFilterMode = mode;
    ['all', 'main', 'assembly'].forEach(m => {
        document.getElementById(`mypage_filter_${m}`)?.classList.toggle('active', m === mode);
    });
    loadMineSide();
    loadPendingSide();
}

// mypageFilterModeに応じた工事番号の絞り込み判定
function matchesMypageFilterMode(num) {
    if (is5or7Series(num)) return false; // 5番台・7番台は承認フローアプリで一切管理しない
    if (mypageFilterMode === 'assembly') return is2000sSeries(num);
    if (mypageFilterMode === 'main')     return !is2000sSeries(num);
    return true;
}

async function loadPendingSide() {
    const role    = getEffectiveRole();
    const dept    = getEffectiveDept();
    const isSales = (role === 'staff' && dept === '営業') || isSuperAdmin();
    const el      = document.getElementById('side_content_pending');
    if (!el) return;

    // 承認ステップが自分のロールで pending のものを取得（管理者は全ロール分の承認待ちを対象にする）
    let stepsQuery = db
        .from('approval_steps')
        .select(`
            id, step_order, approver_role, approver_id, status, comment, decided_at,
            approval_requests ( id, flow_type, status, note, created_at, project_number, machine_name, test_run, requester_id )
        `)
        .eq('status', 'pending');
    stepsQuery = isSuperAdmin() ? stepsQuery.in('approver_role', APPROVER_ROLES) : stepsQuery.eq('approver_role', role);
    const { data: steps, error } = await stepsQuery;

    if (error) { el.innerHTML = '<div class="empty"><div class="empty-text">データ取得エラー</div></div>'; return; }

    // 今自分が担当すべきステップのみに絞る
    const actionable = (steps || []).filter(s => {
        const req = s.approval_requests;
        if (!req) return false;
        // assembly/test_run 並列: submitted 状態で全 pending ステップが操作可能
        if ((req.flow_type === 'assembly' || req.flow_type === 'test_run') && req.status === 'submitted' && s.status === 'pending') return true;
        // shipping: step_order=1 の直列承認
        if (req.flow_type === 'shipping' && s.step_order === 1 && req.status === 'submitted' && s.status === 'pending') return true;
        if (s.step_order === 1 && req.status === 'submitted') return true;
        if (s.step_order === 2 && req.status === 'in_review')  return true;
        return false;
    }).map(s => ({
        id:         s.approval_requests.id,
        pNum:       s.approval_requests.project_number || '—',
        machineName: s.approval_requests.machine_name || '',
        flowType:   s.approval_requests.flow_type,
        flowLabel:  FLOW_LABELS[s.approval_requests.flow_type] || s.approval_requests.flow_type,
        date:       s.approval_requests.created_at,
        statusText: '🔴 要承認',
    })).filter((item, idx, arr) => arr.findIndex(other => other.id === item.id) === idx); // 管理者は全ロール分を取得するため、並列承認中の申請は同一IDが複数回ヒットしうる（申請ID単位で重複排除）

    // 営業: 確定出荷日の入力待ちになっている申請を取得（マイページには自分が担当する工番、
    // および未入力のまま日数が経過してエスカレーション対象になった工番のみ表示。
    // 入力操作自体は出荷フローマークからの詳細画面で誰でも可能なため、担当者以外の入力権限は制限しない）
    let salesItems = [];
    if (isSales) {
        const { data: salesReqs } = await db.from('approval_requests')
            .select('id, project_number, machine_name, created_at')
            .eq('flow_type', 'shipping').eq('status', 'awaiting_shipping_date');
        const myName = currentProfile?.name;
        const mySalesReqs = isSuperAdmin()
            ? (salesReqs || [])
            : (salesReqs || []).filter(r => {
                const pNum  = r.project_number || '—';
                const owner = projectsMap[pNum]?.salesOwner;
                return computeShippingEscalationRecipients(pNum, owner, r.created_at).has(myName);
            });
        salesItems = mySalesReqs.map(r => ({
            id:         r.id,
            pNum:       r.project_number || '—',
            machineName: r.machine_name || '',
            flowType:   'shipping',
            flowLabel:  '出荷確定申請',
            date:       r.created_at,
            statusText: '🔴 確定出荷日 入力待ち',
        }));
    }

    let combined = [...actionable, ...salesItems];
    combined = combined.filter(item => matchesMypageFilterMode(item.pNum));

    // バッジ更新（side_badge_pending と side_pending_count 両方）
    const badgePending = document.getElementById('side_badge_pending');
    const countPending = document.getElementById('side_pending_count');
    if (combined.length > 0) {
        if (badgePending) { badgePending.style.display = 'inline-flex'; badgePending.textContent = combined.length; }
        if (countPending) { countPending.style.display = 'inline-flex'; countPending.textContent = combined.length; }
    } else {
        if (badgePending) badgePending.style.display = 'none';
        if (countPending) countPending.style.display = 'none';
    }

    if (combined.length === 0) {
        el.innerHTML = '<div class="empty"><div class="empty-icon">✓</div><div class="empty-text">対応待ちの案件はありません</div></div>';
        return;
    }

    // フロー種別ごとにグルーピングして表示（複数フローを兼務する担当者でも区別しやすいように）
    const groups = {};
    combined.forEach(item => {
        (groups[item.flowType] || (groups[item.flowType] = [])).push(item);
    });

    // フロー名は見出し側で表示済みのため、カード内では省略して申請タブのカードと行数を揃える
    const PACKING_RELEVANT_FLOWS = ['shipping', 'simple_inspection', 'inspection', 'shipping_check_inspection'];
    const renderPendingCard = item => {
        const machineHtml = item.machineName ? '<span class="side-card-machine">' + esc(item.machineName) + '</span>' : '';
        const packingWarningHtml = (PACKING_RELEVANT_FLOWS.includes(item.flowType)
            && getPackingDisplayState(item.pNum, packingShippingProjectNums.has(item.pNum)) === 'unknown')
            ? '<span class="prog-card-badge-warning" style="margin-left:6px;">⚠ 梱包未定</span>' : '';
        return `
        <div class="side-card is-pending-action" onclick="openDetailModal('${item.id}')">
            <div class="side-card-title">${esc(item.pNum)}${machineHtml}${packingWarningHtml}</div>
            <div class="side-card-sub">${fmtDate(item.date)}</div>
            <div class="side-card-status">${item.statusText}</div>
        </div>`;
    };

    el.innerHTML = Object.keys(FLOW_LABELS).filter(ft => groups[ft]).map(flowType => {
        const items = groups[flowType];
        const label = items[0].flowLabel;
        return `
        <div class="mine-flow-section">
            <div class="mine-flow-section-title" onclick="toggleMineFlowSection(this)">
                <span class="mine-flow-name">${esc(label)}</span>
                <span class="mine-flow-count">${items.length}</span>
                <span class="mine-flow-section-arrow">▾</span>
            </div>
            <div class="pending-flow-list">${items.map(renderPendingCard).join('')}</div>
        </div>`;
    }).join('');
}

async function loadMineSide() {
    const el = document.getElementById('side_content_mine');
    if (!el) return;

    const query = db
        .from('approval_requests')
        .select('id, flow_type, status, note, created_at, updated_at, project_number, machine_name, is_resubmit, sheet_data, sheet_saved_at, approval_steps(id, step_order, approver_role, status, decided_at)')
        .eq('requester_id', currentUser.id)
        .order('created_at', { ascending: false });

    const { data: rawReqs } = await query;
    // 完了済み工番は非表示（進捗一覧の「完了済み」ボタンからのみ確認可能）
    // 一時保存されていないdraft（sheet_saved_atがNULL）は「未申請」扱いのため一覧から除外する
    const reqs = (rawReqs || [])
        .filter(r => projectsMap[r.project_number] !== undefined && !completedProjectNums.has(r.project_number))
        .filter(r => matchesMypageFilterMode(r.project_number))
        .filter(r => !isUnsavedDraft(r));

    // 自分が申請に関われるフロー種別だけをセクションとして表示する
    // （組立・試運転系と検査・会議系、出荷確定申請はそれぞれ進捗の構成が異なるため、フローごとに区分けする）
    const visibleFlowTypes = Object.keys(FLOW_LABELS)
        .filter(ft => canApplyFlow(ft));

    if (reqs.length === 0 || visibleFlowTypes.length === 0) {
        el.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">申請中の案件はありません</div></div>';
        return;
    }

    const renderCard = (req, pendingCount) => {
        const pNum        = req.project_number || '—';

        const isNotifFlow = QA_MEETING_FLOWS.includes(req.flow_type);
        let statusText;
        if (req.status === 'draft') {
            statusText = '<span class="si-badge si-gray">✏</span> 入力中';
        } else if (pendingCount) {
            statusText = `<span class="si-badge si-orange" style="background:#8e44ad;">⚠</span>${pendingCount}件`;
        } else if (isNotifFlow && req.status === 'submitted') {
            statusText = '<span class="si-badge si-orange">▶</span> 開催待ち';
        } else if (req.status === 'awaiting_shipping_date' || req.status === 'awaiting_shipping_confirm') {
            statusText = `<span class="si-badge si-orange">▶</span> ${STATUS_LABELS[req.status]}`;
        } else if (req.flow_type === 'shipping' && req.status === 'submitted') {
            statusText = '<span class="si-badge si-orange">▶</span> 常務承認待ち';
        } else if (req.status === 'submitted' || req.status === 'in_review') {
            statusText = '<span class="si-badge si-orange">▶</span> 承認待ち';
        } else if (req.status === 'approved') {
            statusText = '<span class="si-badge si-green">✓</span> 完了';
        } else if (req.status === 'rejected') {
            statusText = '<span class="si-badge si-red">✕</span> 却下';
        } else {
            statusText = req.status;
        }

        const resubmitBadge = req.is_resubmit ? '<span class="resubmit-badge">再申請</span>' : '';
        const cardClass = pendingCount ? 'is-pending-item'
                        : (req.status === 'submitted' || req.status === 'in_review') ? 'is-waiting'
                        : req.status === 'rejected' ? 'is-rejected'
                        : req.status === 'draft' ? 'is-draft'
                        : '';
        const cardClick = req.status === 'draft'
            ? `openDraftInSubmitModal('${req.id}')`
            : `openDetailModal('${req.id}')`;
        const flowLabel = esc(isNotifFlow ? (QA_DETAIL_TITLE_LABELS[req.flow_type] || req.flow_type) : (FLOW_LABELS[req.flow_type] || req.flow_type));
        const machineHtml = req.machine_name ? '<span class="mine-col-machine">' + esc(req.machine_name) + (req.unit_name ? esc(req.unit_name) : '') + '</span>' : '';
        const packingWarningHtml = (['shipping', 'simple_inspection', 'inspection', 'shipping_check_inspection'].includes(req.flow_type)
            && getPackingDisplayState(pNum, packingShippingProjectNums.has(pNum)) === 'unknown')
            ? '<span class="prog-card-badge-warning" style="margin-left:6px;">⚠ 梱包未定</span>' : '';
        return `
        <div class="side-card ${cardClass}" onclick="${cardClick}" title="${esc(pNum)} ${flowLabel}">
            <div class="mine-col-num">${esc(pNum)}${machineHtml}${resubmitBadge}${packingWarningHtml}</div>
            <div class="mine-col-date">${fmtDate(req.created_at)}</div>
            <div class="mine-col-status">${statusText}</div>
        </div>`;
    };

    const renderColumn = (label, items, isPendingGroup) => {
        const count = items.length;
        const body = count === 0
            ? '<div class="kanban-col-empty">該当なし</div>'
            : items.map(item => isPendingGroup ? renderCard(item.req, item.pendingCount) : renderCard(item)).join('');
        return `
        <div class="kanban-col">
            <div class="kanban-col-header"><span>${label}</span><span>${count}</span></div>
            <div class="kanban-col-body">${body}</div>
        </div>`;
    };

    // 組立・試運転（承認ステップあり）: 承認は pending の有無に関わらず可能なため、
    // 「承認済み」は未完了ペンディングが0件のものだけとし、残っているものは手前の「ペンディング」列に表示する
    const buildAssemblyLikeColumns = (list, flowType) => {
        // shipping_prep は承認ステップを持たないため「申請＝完了」。列見出しもそれに合わせる
        const isNoApprovalFlow = flowType === 'shipping_prep';
        // 試運転は完了操作自体を廃止したため、申し送り事項の有無にかかわらず承認済みならそのまま「承認済み」列に入れる（専用列も出さない）
        // 出荷準備はペンディング機能自体が不要なため、試運転と同様に専用列を出さない
        const noPendingColumn = flowType === 'test_run' || isNoApprovalFlow;
        const groups = { inprogress: [], waiting: [], pending: [], approved: [] };
        list.forEach(req => {
            const unresolvedPending = noPendingColumn ? [] : (req.sheet_data?.pending_items || [])
                .filter(p => (p.content || p.machine) && !p.completed);
            if (req.status === 'draft' || req.status === 'rejected') {
                groups.inprogress.push(req);
            } else if (req.status === 'submitted' || req.status === 'in_review') {
                groups.waiting.push(req);
            } else if (req.status === 'approved' && unresolvedPending.length > 0) {
                groups.pending.push({ req, pendingCount: unresolvedPending.length });
            } else if (req.status === 'approved') {
                groups.approved.push(req);
            } else {
                groups.waiting.push(req);
            }
        });
        const columns = [['入力中', groups.inprogress, false]];
        // shipping_prep は申請＝即承認で「承認待ち」状態を経由しないため、専用列を出さない
        if (!isNoApprovalFlow) columns.push(['承認待ち', groups.waiting, false]);
        if (!noPendingColumn) columns.push(['ペンディング', groups.pending, true]);
        columns.push([isNoApprovalFlow ? '完了' : '承認済み', groups.approved, false]);
        return columns;
    };

    // 検査・会議（承認ステップなし、開催案内→ペンディング消化→完了）
    const buildQaLikeColumns = (list) => {
        const groups = { waiting: [], pending: [], approved: [] };
        list.forEach(req => {
            const unresolvedPending = (req.sheet_data?.pending_items || [])
                .filter(p => (p.content || p.machine) && !p.completed);
            if (req.status === 'approved') {
                groups.approved.push(req);
            } else if (unresolvedPending.length > 0) {
                groups.pending.push({ req, pendingCount: unresolvedPending.length });
            } else {
                groups.waiting.push(req);
            }
        });
        return [
            ['開催待ち', groups.waiting, false],
            ['タスク', groups.pending, true],
            ['完了', groups.approved, false],
        ];
    };

    // 出荷確定申請（品証・製管が申請 → 営業が出荷日入力 → 品証・製管が確認 → 常務が承認）
    const buildShippingColumns = (list) => {
        // 「出荷日待ち」は営業側のアクション待ちであり品証・製管がすべき作業がないため、マイページには表示しない
        const groups = { confirmWait: [], approvalWait: [], approved: [] };
        list.forEach(req => {
            if (req.status === 'awaiting_shipping_date') return;
            else if (req.status === 'awaiting_shipping_confirm') groups.confirmWait.push(req);
            else if (req.status === 'approved') groups.approved.push(req);
            else groups.approvalWait.push(req);
        });
        return [
            ['品証確認待ち', groups.confirmWait, false],
            ['常務承認待ち', groups.approvalWait, false],
            ['承認済み', groups.approved, false],
        ];
    };

    const arrow = '<div class="kanban-arrow">→</div>';
    el.innerHTML = visibleFlowTypes.map(flowType => {
        const list = reqs.filter(r => r.flow_type === flowType);
        const columns = QA_MEETING_FLOWS.includes(flowType) ? buildQaLikeColumns(list)
                       : flowType === 'shipping'              ? buildShippingColumns(list)
                       : buildAssemblyLikeColumns(list, flowType);
        const row = columns.map(([label, items, isPendingGroup]) => renderColumn(label, items, isPendingGroup)).join(arrow);
        // 対象案件が1件もないフローは最初から折りたたんでおく（見出しクリックで開閉可能）
        const isEmpty = columns.every(([, items]) => items.length === 0);
        const flowCount = columns.reduce((n, [, items]) => n + items.length, 0);
        return `
        <div class="mine-flow-section${isEmpty ? ' collapsed' : ''}">
            <div class="mine-flow-section-title" onclick="toggleMineFlowSection(this)">
                <span class="mine-flow-name">${esc(FLOW_LABELS[flowType] || flowType)}</span>
                <span class="mine-flow-count">${flowCount}</span>
                <span class="mine-flow-section-arrow">▾</span>
            </div>
            <div class="mine-kanban-row">${row}</div>
        </div>`;
    }).join('');
}

async function loadProgress() {
    const el = document.getElementById('tab_content_progress');
    el.innerHTML = '<div class="loading-indicator">読み込み中...</div>';

    // 全申請レコードを機械名付きで取得（shippingの承認者名表示のためapproval_stepsも含む）
    const { data: allReqs } = await db
        .from('approval_requests')
        .select('id, project_number, machine_name, unit_name, assembly_items, flow_type, status, has_inspection, test_run, created_at, updated_at, confirmed_shipping_date, confirmed_shipping_date_2, packing_confirmed_shipping_date, inspection_date, inspection_time, requester_id, sheet_data, sheet_saved_at, approval_steps(approver_id, status)')
        .order('updated_at', { ascending: true });

    // 2000番台：機械・ユニット単位で「申請不要」とマークされたものを取得する
    const { data: notRequiredRows } = await db.from('assembly_unit_not_required').select('project_number, machine, unit');
    const assemblyNotRequiredSet = new Set(
        (notRequiredRows || []).map(r => `${r.project_number}__${r.machine}__${r.unit || ''}`)
    );

    // 2000番台：電装（electrical）の「申請不要」マーク（組立とは別テーブルで独立管理）
    const { data: elecNotRequiredRows } = await db.from('electrical_unit_not_required').select('project_number, machine, unit');
    const electricalNotRequiredSet = new Set(
        (elecNotRequiredRows || []).map(r => `${r.project_number}__${r.machine}__${r.unit || ''}`)
    );

    // shipping承認済みの承認者名マップを構築
    const shippingApproverIds = [...new Set(
        (allReqs || [])
            .filter(r => r.flow_type === 'shipping')
            .flatMap(r => (r.approval_steps || []))
            .filter(s => s.status === 'approved' && s.approver_id)
            .map(s => s.approver_id)
    )];
    let shippingApproverNameMap = {};
    if (shippingApproverIds.length > 0) {
        const { data: prs } = await db.from('profiles').select('id, name').in('id', shippingApproverIds);
        if (prs) prs.forEach(p => { shippingApproverNameMap[p.id] = p.name; });
    }

    // 機械ごとのフロー状態チェック用セット（project__machine__taskText）
    const { data: machineTasks } = await db.from('tasks')
        .select('project_number, machine, unit, text, end_date, is_completed')
        .in('text', ['機械組立', '電気艤装', '外観検査', '出荷品確認検査', '試運転', '出荷確認会議', '出荷準備', '工場出荷', '梱包出荷'])
        .not('machine', 'is', null);

    const machineTaskSet = new Set(
        (machineTasks || []).map(t => `${t.project_number}__${t.machine}__${t.text}`)
    );
    const hasTask = (num, machine, taskText) => machineTaskSet.has(`${num}__${machine}__${taskText}`);

    // 未申請催促（試運転・工場出荷）の期日判定用（project__machine__taskText → {end_date, is_completed}）
    // 同一機械に同名タスクが複数ある場合（分割出荷の工場出荷など）は、最も早い end_date のものを採用する
    const taskInfoMap = {};
    (machineTasks || []).forEach(t => {
        const key = `${t.project_number}__${t.machine}__${t.text}`;
        const existing = taskInfoMap[key];
        if (!existing || (t.end_date && (!existing.end_date || t.end_date < existing.end_date))) {
            taskInfoMap[key] = { end_date: t.end_date, is_completed: t.is_completed };
        }
    });

    // 工場出荷タスクは分割出荷（1機械に複数）に対応するため、end_date昇順の配列でも保持する
    // （project__machine → [{end_date, is_completed}, ...]、早い順）
    const shippingTasksMap = {};
    (machineTasks || []).filter(t => t.text === '工場出荷').forEach(t => {
        const key = `${t.project_number}__${t.machine}`;
        if (!shippingTasksMap[key]) shippingTasksMap[key] = [];
        shippingTasksMap[key].push({ end_date: t.end_date, is_completed: t.is_completed });
    });
    Object.values(shippingTasksMap).forEach(arr => arr.sort((a, b) => (a.end_date || '9999-99-99').localeCompare(b.end_date || '9999-99-99')));

    // 工番レベルのフロータスク（machine不問）- 簡易検査/外観検査/出荷確認会議/梱包出荷はproject全体に1つの場合がある
    const { data: projectFlowTasks } = await db.from('tasks')
        .select('project_number, text, start_date, end_date, is_completed')
        .in('text', ['簡易検査', '外観検査', '出荷確認会議', '梱包出荷']);
    // 梱包出荷は有無未定の間、開始日・終了日が空のプレースホルダータスクとして工程表に常設されるため、
    // 実際に日付が入って初めて「梱包出荷タスクあり」として扱う（他のフローは元々日付必須のため対象外）
    const projectFlowSet = new Set(
        (projectFlowTasks || [])
            .filter(t => t.text !== '梱包出荷' || t.start_date)
            .map(t => `${(t.project_number||'').toString().trim()}__${t.text}`)
    );
    const hasProjectFlow = (num, text) => projectFlowSet.has(`${num}__${text}`);

    // 簡易検査（project全体扱い）の期日判定用（project__text → {end_date, is_completed}）
    const projectFlowInfoMap = {};
    (projectFlowTasks || []).forEach(t => {
        projectFlowInfoMap[`${(t.project_number||'').toString().trim()}__${t.text}`] = { end_date: t.end_date, is_completed: t.is_completed };
    });

    // projectNum → machine → { flows, ... }
    const projectData = {};

    // タスクから機械一覧を構築（未申請機械も含む）。出荷品確認検査は機械組立が無い工番向けのフローのため、
    // 機械組立が無くても出荷品確認検査タスクがあれば機械一覧に載せる
    (machineTasks || []).filter(t => t.text === '機械組立' || t.text === '出荷品確認検査').forEach(t => {
        const num = (t.project_number || '').toString().trim();
        if (!num || !t.machine) return;
        if (!projectData[num]) projectData[num] = {};
        if (!projectData[num][t.machine]) projectData[num][t.machine] = { flows: {}, units: {} };
    });

    // 2000番台：試運転フロー専用の機械一覧。工程表の「試運転」タスクの機械名をそのまま使う。
    // 組立の機械一覧（機械組立タスク由来・上記projectDataのキー）とは申請単位が異なり得るため、
    // 組立側とは独立して持つ（試運転は組立の機械が無くても工程表にタスクがあれば申請対象として表示する）
    const testRunMachinesByProject = {};
    (machineTasks || []).filter(t => t.text === '試運転').forEach(t => {
        const num = (t.project_number || '').toString().trim();
        if (!num || !t.machine) return;
        if (!testRunMachinesByProject[num]) testRunMachinesByProject[num] = new Set();
        testRunMachinesByProject[num].add(t.machine);
    });

    // 2000番台：試運転フローの申請単位（機械・ユニット）一覧。工程表の「試運転」タスクの機械・ユニットの
    // 組み合わせをそのまま使う（組立のような固定マスタは使わず、工程表の実データに従う）
    const testRunUnitsByProject = {};   // num -> [{machine, unit}]（出現順、重複無し）
    const testRunTaskInfoByPair = {};   // `${num}__${machine}__${unit}` -> {end_date, is_completed}（同一組み合わせが複数あれば最短end_date）
    (machineTasks || []).filter(t => t.text === '試運転').forEach(t => {
        const num = (t.project_number || '').toString().trim();
        if (!num || !t.machine) return;
        const unit = normalizeTestRunUnit(t.unit);
        if (!testRunUnitsByProject[num]) testRunUnitsByProject[num] = [];
        if (!testRunUnitsByProject[num].some(p => p.machine === t.machine && p.unit === unit)) {
            testRunUnitsByProject[num].push({ machine: t.machine, unit });
        }
        const key = `${num}__${t.machine}__${unit}`;
        const existing = testRunTaskInfoByPair[key];
        if (!existing || (t.end_date && (!existing.end_date || t.end_date < existing.end_date))) {
            testRunTaskInfoByPair[key] = { end_date: t.end_date, is_completed: t.is_completed };
        }
    });

    // 申請レコードを反映。組立(assembly)は機械・ユニットが工程表と紐づかないため、machine_nameをキーにせず
    // 工番ごとの申請リストとして別管理する（assemblyReqsByProject）。他フローは従来通りmachine_nameをキーにする
    // 電装(electrical)も2000番台に限りユニット単位申請（assembly_items、machine_nameは確定時のみ設定）のため、
    // 組立と同じ理由でelectricalReqsByProjectに退避する。2000番以外の電装は従来通りmachine_nameキーのまま
    // 試運転(test_run)も2000番台に限り機械・ユニット単位申請（machine_name+unit_name）のため、
    // 同じ理由でtestRunReqsByProjectに退避する。2000番以外の試運転は従来通りmachine_nameキーのまま
    const assemblyReqsByProject = {};
    const electricalReqsByProject = {};
    const testRunReqsByProject = {};
    (allReqs || []).forEach(req => {
        if (req.flow_type === 'assembly') {
            const num = req.project_number;
            if (!num) return;
            if (!assemblyReqsByProject[num]) assemblyReqsByProject[num] = [];
            assemblyReqsByProject[num].push(req);
            return;
        }
        if (req.flow_type === 'electrical' && is2000sSeries(req.project_number)) {
            const num = req.project_number;
            if (!num) return;
            if (!electricalReqsByProject[num]) electricalReqsByProject[num] = [];
            electricalReqsByProject[num].push(req);
            return;
        }
        if (req.flow_type === 'test_run' && is2000sSeries(req.project_number)) {
            const num = req.project_number;
            if (!num) return;
            if (!testRunReqsByProject[num]) testRunReqsByProject[num] = [];
            testRunReqsByProject[num].push(req);
            return;
        }
        const num     = req.project_number;
        const machine = req.machine_name;
        if (!num || !machine) return;
        if (!projectData[num]) projectData[num] = {};
        if (!projectData[num][machine]) projectData[num][machine] = { flows: {}, units: {} };
        if (req.unit_name) {
            const u = projectData[num][machine].units;
            if (!u[req.flow_type]) u[req.flow_type] = {};
            u[req.flow_type][req.unit_name] = req;
        } else {
            projectData[num][machine].flows[req.flow_type] = req;
        }
    });

    const allProjectNums = new Set([...Object.keys(projectData), ...Object.keys(assemblyReqsByProject)]);
    const baseNums = [...allProjectNums].filter(num => {
        if (projectsMap[num] === undefined) return false;
        if (is5or7Series(num)) return false;
        const hasAssemblyReq = (assemblyReqsByProject[num] || []).length > 0;
        if (is2000sSeries(num)) {
            // 2000番台は組立・試運転フローのみ対象のため、いずれかのタスク／組立申請がある工番だけ表示する
            const machines = Object.keys(projectData[num] || {});
            return hasAssemblyReq || machines.some(m => hasTask(num, m, '機械組立') || hasTask(num, m, '試運転'));
        }
        if (isDSeries(num) || isTInspectionSeries(num)) {
            // D番・点検系(3T/4T)は基本的に機械組立を伴わないため、機械組立タスク／組立申請がある工番だけ表示する
            const machines = Object.keys(projectData[num] || {});
            return hasAssemblyReq || machines.some(m => hasTask(num, m, '機械組立'));
        }
        return true;
    }).sort();

    if (baseNums.length === 0) {
        el.innerHTML = '<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">承認フローの記録がありません</div></div>';
        return;
    }

    progressCachedData = { baseNums, projectData, machineTaskSet, projectFlowSet, shippingApproverNameMap, taskInfoMap, projectFlowInfoMap, shippingTasksMap, assemblyReqsByProject, assemblyNotRequiredSet, electricalReqsByProject, electricalNotRequiredSet, testRunMachinesByProject, testRunUnitsByProject, testRunTaskInfoByPair, testRunReqsByProject };

    el.innerHTML = '<div id="progress_cards_wrap"></div>';
    _syncProgressControls();
    renderProgressCards();
}

function _syncProgressControls() {
    document.querySelectorAll('.ptab-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.getAttribute('data-tab') ?? 'progress') === progressTab);
    });
    document.getElementById('psort_job')?.classList.toggle('active', progressSort === 'job');
    document.getElementById('psort_shipping')?.classList.toggle('active', progressSort === 'shipping');
    const cb = document.getElementById('pfilter_mine');
    if (cb) cb.checked = progressFilterMine;
    document.querySelectorAll('.prefix-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.getAttribute('data-prefix') ?? '') === progressFilterPrefix);
    });
    document.getElementById('pfilter_completed_off')?.classList.toggle('active', !progressFilterCompleted);
    document.getElementById('pfilter_completed_on')?.classList.toggle('active', progressFilterCompleted);
    const overdueCb = document.getElementById('pfilter_overdue');
    if (overdueCb) overdueCb.checked = progressFilterOverdue;
    const shipAfterCb = document.getElementById('pfilter_ship_after');
    if (shipAfterCb) shipAfterCb.checked = progressFilterShipAfter;
    const prefixFilterGroup = document.getElementById('prefix_filter_group');
    if (prefixFilterGroup) prefixFilterGroup.style.display = (progressTab === 'assembly_report') ? 'none' : '';
}

function toggleCompletedView(checked) {
    progressFilterCompleted = checked;
    _syncProgressControls();
    renderProgressCards();
}

function setProgressTab(tab) {
    progressTab = tab;
    progressFilterPrefix = ''; // タブ切替時は工番種別フィルタをリセット
    assemblyNavActiveNum = '';
    document.querySelector('.main-layout')?.classList.toggle('assembly-report-mode', tab === 'assembly_report');
    // 進捗一覧・2000番完了報告は同じスクロール領域(.main-content)を共有しているため、
    // タブ切替時にスクロール位置を引き継がないよう先頭に戻す
    const mainContent = document.querySelector('.main-layout .main-content');
    if (mainContent) mainContent.scrollTop = 0;
    _syncProgressControls();
    renderProgressCards();
}

function setProgressSort(order) {
    progressSort = order;
    _syncProgressControls();
    renderProgressCards();
}

function setProgressFilter(mine) {
    progressFilterMine = mine;
    renderProgressCards();
}

function setProgressFilterOverdue(checked) {
    progressFilterOverdue = checked;
    renderProgressCards();
}

function setProgressFilterShipAfter(checked) {
    progressFilterShipAfter = checked;
    renderProgressCards();
}

function matchesPrefix(num, prefix) {
    if (prefix === '3')    return /^3\d/.test(num);
    if (prefix === '4')    return /^4\d/.test(num);
    if (prefix === '3C')   return /^3C/i.test(num);
    if (prefix === '4C')   return /^4C/i.test(num);
    if (prefix === '3T')   return /^3T/i.test(num);
    if (prefix === '4T')   return /^4T/i.test(num);
    if (prefix === 'D')    return /^D/i.test(num);
    if (prefix === '2000') return is2000sSeries(num);
    return true;
}

function setProgressPrefix(prefix) {
    progressFilterPrefix = prefix;
    document.querySelectorAll('.prefix-btn').forEach(btn => {
        btn.classList.toggle('active', (btn.getAttribute('data-prefix') ?? '') === prefix);
    });
    renderProgressCards();
}

// sheet.htmlのREQUIRED_ITEM_IDSと同じ値。詳細モーダルからの「申請する」でもチェックシートの必須項目が
// 入力済みか検証するために複製している（sheet.html側の「入力完了・申請へ進む」を経由しない申請経路のため）
const ASSEMBLY_REQUIRED_ITEM_IDS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33'];

// test_run_sheet.htmlのREQUIRED_ITEM_IDSと同じ値。2000番台の機械詳細画面からの「申請する」でも
// チェックシートの必須項目が入力済みか検証するために複製している
const TEST_RUN_REQUIRED_ITEM_IDS = ['1','2','3','4','5','6','7a','7b','8','9'];

// denki_sheet.htmlのREQUIRED_ITEM_IDSと同じ値。組立フロー詳細モーダル内の電装セクションからの「申請する」でも
// チェックシートの必須項目が入力済みか検証するために複製している
const ELECTRICAL_REQUIRED_ITEM_IDS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17'];

// 組立(assembly)申請1件から機械・ユニットの配列を取り出す。
// assembly_items（新形式）が無い場合はmachine_name/unit_name（旧形式）から1件配列にフォールバックする
function getAssemblyItemsForReq(req) {
    if (Array.isArray(req.assembly_items) && req.assembly_items.length > 0) return req.assembly_items;
    if (req.machine_name) return [{ machine: req.machine_name, unit: req.unit_name || null }];
    return [];
}

// チェックシート右下の「一時保存」ボタンを一度も押していないdraftはsheet_saved_atがNULLのまま。
// 一時保存するまでは何も入力していないのと同じ扱いにするため、フロー丸・バッジ等の表示では「未申請」扱いにする
function isSavedDraft(req) {
    return !!req && req.status === 'draft' && !!req.sheet_saved_at;
}
function isUnsavedDraft(req) {
    return !!req && req.status === 'draft' && !req.sheet_saved_at;
}

// sheet_data.pending_items のうち内容が入力済み(content or machine)かつ未完了(!completed)の件数を数える
// 試運転は完了操作自体を廃止したため「未解決」という概念が無く、常に0件（承認済みならそのまま完了扱い）
function countUnresolvedPendingItems(req) {
    if (req?.flow_type === 'test_run') return 0;
    const items = (req?.sheet_data?.pending_items || []).filter(p => p.content || p.machine);
    return items.filter(p => !p.completed).length;
}
// 複数申請分のペンディング未完了件数を合算する（工番・機械単位で複数申請にまたがる集計に使う）
function sumUnresolvedPendingItems(reqs) {
    return (reqs || []).reduce((sum, r) => sum + countUnresolvedPendingItems(r), 0);
}

// フロー丸の状態(status)→表示クラス・アイコンの対応
function deriveFlowVisual(status) {
    if (status === 'approved') return { fcClass: 'fc-done',     icon: '✓' };
    if (status === 'rejected') return { fcClass: 'fc-rejected', icon: '<span class="fc-x-icon">×</span>' };
    if (status === 'draft')    return { fcClass: 'fc-draft',    icon: '✏' };
    if (status === 'active')   return { fcClass: 'fc-active',   icon: '<span class="fc-play-icon">▶</span>' };
    return { fcClass: 'fc-empty', icon: '○' };
}

function renderProgressCards() {
    const wrap = document.getElementById('progress_cards_wrap');
    if (!wrap || !progressCachedData) return;

    if (progressFilterShipAfter) {
        renderShipAfterPendingList(wrap);
        return;
    }

    const { baseNums, projectData, machineTaskSet, projectFlowSet, shippingApproverNameMap, taskInfoMap, projectFlowInfoMap, shippingTasksMap, assemblyReqsByProject, assemblyNotRequiredSet, electricalReqsByProject, electricalNotRequiredSet, testRunMachinesByProject, testRunUnitsByProject, testRunTaskInfoByPair, testRunReqsByProject } = progressCachedData;
    const hasTask        = (num, machine, taskText) => machineTaskSet.has(`${num}__${machine}__${taskText}`);
    const hasProjectFlow = (num, text) => (projectFlowSet || new Set()).has(`${num}__${text}`);
    // 梱包出荷の有無を設定できるのは営業・品証・製管のみ
    const canSetPacking = (getEffectiveRole() === 'staff' && getEffectiveDept() === '営業') || isQualityOrSeikan;

    // 出荷予定日表示: 確定出荷日が未入力の間は工程表（工場出荷タスク終了日）をそのまま表示し、
    // 確定出荷日が入ったらラベルも「出荷予定日」→「確定出荷日」に切り替える
    const getEffectiveShippingDate = (num) => {
        let confirmed = null;
        Object.values(projectData[num] || {}).forEach(mData => {
            const shipReq = mData.flows['shipping'];
            if (shipReq?.confirmed_shipping_date && (!confirmed || shipReq.confirmed_shipping_date < confirmed)) {
                confirmed = shipReq.confirmed_shipping_date;
            }
        });
        return { date: confirmed || projectsMap[num]?.shipping_date || null, isConfirmed: !!confirmed };
    };

    // 出荷予定日表示（機械単位）: 分割出荷（1機械に工場出荷タスクが複数）の場合は①②の2件を返す
    // 戻り値は常に配列（通常1件、分割出荷時は2件）。各要素は { date, isConfirmed, seq }（seqは分割出荷時のみ1/2、それ以外はnull）
    const getShippingEntriesForMachine = (num, machine) => {
        // 試運転専用ブロックの機械（機械組立タスクが無く、projectDataに未登録の場合がある）から呼ばれることがあるため、
        // projectData[num][machine]が無いケースも安全に扱う
        const mData = projectData[num]?.[machine];
        const shipReq = mData?.flows?.['shipping'];
        const shippingTasks = (shippingTasksMap || {})[`${num}__${machine}`] || [];
        if (shippingTasks.length >= 2) {
            return [
                { date: shipReq?.confirmed_shipping_date   || shippingTasks[0].end_date || null, isConfirmed: !!shipReq?.confirmed_shipping_date,   seq: 1 },
                { date: shipReq?.confirmed_shipping_date_2 || shippingTasks[1].end_date || null, isConfirmed: !!shipReq?.confirmed_shipping_date_2, seq: 2 }
            ];
        }
        const confirmed = shipReq?.confirmed_shipping_date || null;
        const fallback = shippingTasks[0]?.end_date || (taskInfoMap || {})[`${num}__${machine}__工場出荷`]?.end_date || null;
        return [{ date: confirmed || fallback || null, isConfirmed: !!confirmed, seq: null }];
    };
    // 同工番内でも機械ごとに出荷日が異なる場合に個別表示するための算出（代表値＝先頭エントリ）
    const getEffectiveShippingDateForMachine = (num, machine) => {
        const [entry] = getShippingEntriesForMachine(num, machine);
        return entry;
    };

    // 梱包出荷日表示: 確定梱包出荷日が未入力の間は工程表（梱包出荷タスク終了日）をそのまま表示する
    const getEffectivePackingShippingDate = (num) => {
        let confirmed = null;
        Object.values(projectData[num] || {}).forEach(mData => {
            const shipReq = mData.flows['shipping'];
            if (shipReq?.packing_confirmed_shipping_date && (!confirmed || shipReq.packing_confirmed_shipping_date < confirmed)) {
                confirmed = shipReq.packing_confirmed_shipping_date;
            }
        });
        return { date: confirmed || projectsMap[num]?.packing_shipping_date || null, isConfirmed: !!confirmed };
    };

    // 未申請・未承認判定（組立・試運転・出荷確定）
    // 組立(assembly)は機械・ユニットが工程表と紐づかなくなったため、機械単位の未申請催促は一時的に無効化（TBD: 別途再設計）
    const OVERDUE_FLOW_TASK_TEXT = { test_run: '試運転', shipping: '工場出荷', electrical: '電気艤装' };
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
    const isFlowOverdue = (num, machine, flowType, req) => {
        if (req && req.status !== 'draft') {
            return req.status === 'submitted' || req.status === 'in_review';
        }
        // 申請なし、または下書きのまま → 期日を過ぎた未申請タスクかどうかを判定
        const taskText = OVERDUE_FLOW_TASK_TEXT[flowType];
        if (!taskText) return false;
        const info = (taskInfoMap || {})[`${num}__${machine}__${taskText}`];
        return !!(info && !info.is_completed && info.end_date && info.end_date < todayStr);
    };
    // 検査・会議フロー（簡易検査・外観検査・出荷確認会議）の未申請判定
    // いずれもそれぞれ自分自身のタスクの終了日を基準にする
    const isInviteFlowOverdue = (num, machine, flowType, req) => {
        if (req && req.status !== 'draft') return false; // 開催案内送付済み（申請済み）なら対象外

        if (flowType === 'simple_inspection') {
            const info = (projectFlowInfoMap || {})[`${num}__簡易検査`];
            return !!(info && !info.is_completed && info.end_date && info.end_date < todayStr);
        }
        if (flowType === 'inspection') {
            const info = (taskInfoMap || {})[`${num}__${machine}__外観検査`];
            return !!(info && !info.is_completed && info.end_date && info.end_date < todayStr);
        }
        if (flowType === 'shipping_meeting') {
            const info = (taskInfoMap || {})[`${num}__${machine}__出荷確認会議`];
            return !!(info && !info.is_completed && info.end_date && info.end_date < todayStr);
        }
        if (flowType === 'shipping_check_inspection') {
            const info = (taskInfoMap || {})[`${num}__${machine}__出荷品確認検査`];
            return !!(info && !info.is_completed && info.end_date && info.end_date < todayStr);
        }
        return false;
    };

    const projectHasOverdueFlow = (num) => {
        return Object.keys(projectData[num] || {}).some(machine => {
            const flows = projectData[num][machine].flows || {};
            const mainOverdue = Object.keys(OVERDUE_FLOW_TASK_TEXT).some(flowType => isFlowOverdue(num, machine, flowType, flows[flowType]));
            if (mainOverdue) return true;
            return QA_MEETING_FLOWS.some(flowType => isInviteFlowOverdue(num, machine, flowType, flows[flowType]));
        });
    };

    // 完了済みフィルタ（通常時は完了済みを除外、完了済みモード時は完了済みのみ）
    let nums = baseNums.filter(num => completedProjectNums.has(num) === progressFilterCompleted);

    // タブによる絞り込み（進捗一覧＝2000番台以外、組立・試運転 完了報告＝2000番台のみ）
    nums = nums.filter(num => is2000sSeries(num) === (progressTab === 'assembly_report'));

    // 未申請・未承認フィルタ
    if (progressFilterOverdue) {
        nums = nums.filter(num => projectHasOverdueFlow(num));
    }

    // 並び替え（完了済み表示時は出荷日の降順＝出荷日が今日に近い順にする）
    if (progressSort === 'shipping') {
        const dir = progressFilterCompleted ? -1 : 1;
        nums.sort((a, b) => {
            const da = getEffectiveShippingDate(a).date || '9999-12-31';
            const db2 = getEffectiveShippingDate(b).date || '9999-12-31';
            if (da < db2) return -1 * dir;
            if (da > db2) return 1 * dir;
            return a < b ? -1 : a > b ? 1 : 0;
        });
    }

    // 自分の工番フィルタ
    if (progressFilterMine) {
        nums = nums.filter(num => projectMatchesMine(num));
    }

    // 工番種別フィルタ
    if (progressFilterPrefix) {
        nums = nums.filter(num => matchesPrefix(num, progressFilterPrefix));
    }

    // 2000番完了報告タブ：左ナビ（工事番号一覧、ジャンプ用）を現在のフィルタ結果と同期する
    renderAssemblyNavPanel(nums);

    if (nums.length === 0) {
        wrap.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">該当する工番がありません</div></div>';
        return;
    }

    // 組立(assembly)は機械・ユニットが工程表と紐づかないため工番全体で1つに集約するが、
    // 各機械行の先頭に共通の丸として表示することで、見た目は他フローと同じ1行・ライン接続にする（下記machineRows参照）。
    // 電装(electrical)は独立ノードにはせず、電気艤装タスクがある機械では組立の丸に統合して「組立・電装」として表示する
    // （下記 __isAssembly ブロック内で電装の状況も合わせて描画する）
    const FLOW_DEFS = [
        { type: 'simple_inspection',  label: '簡易検査',   alwaysShow: false },
        { type: 'inspection',         label: '外観検査',   alwaysShow: false },
        { type: 'shipping_check_inspection', label: '出荷品確認検査', alwaysShow: false },
        { type: 'test_run',           label: '試運転',     alwaysShow: false },
        { type: 'shipping_meeting',   label: '出荷確認会議', alwaysShow: false },
        { type: 'shipping_prep',      label: '出荷準備',   alwaysShow: false },
        { type: 'shipping',           label: '出荷',       alwaysShow: true }
    ];

    const buildShipDateSpan = (labelText, dateVal, isConfirmed) => {
        const cls = 'prog-card-date' + (isConfirmed ? ' is-confirmed' : '');
        return '<span class="' + cls + '"><span class="prog-card-date-label">' + esc(labelText) + '</span> <span class="prog-card-date-value">' + fmtDate(dateVal) + '</span></span>';
    };

    const html = nums.map(num => {
        const pInfo    = projectsMap[num] || {};
        const label    = [pInfo.customer_name, pInfo.project_details].filter(Boolean).join('　');
        const machines = Object.keys(projectData[num] || {}).sort();
        const hasActualPackingTask = hasProjectFlow(num, '梱包出荷') || machines.some(m => hasTask(num, m, '梱包出荷'));
        const packingState = getPackingDisplayState(num, hasActualPackingTask);
        const hasAnyPacking = packingState === 'yes';

        // 機械が複数あって出荷日が異なる場合、または複数機械のいずれかで分割出荷（工場出荷タスクが複数）がある場合は
        // 右上にまとめず各機械行に個別表示し、それ以外は従来通り右上に1本（分割出荷なら①②2本）表示する
        const machineShipDates = machines.map(m => Object.assign({ machine: m }, getEffectiveShippingDateForMachine(num, m)));
        const uniqueShipDates = new Set(machineShipDates.filter(d => d.date).map(d => d.date));
        const hasSplitShippingInProject = machines.some(m => ((shippingTasksMap || {})[`${num}__${m}`] || []).length >= 2);
        const perMachineShipDateDiffers = machines.length > 1 && (uniqueShipDates.size > 1 || hasSplitShippingInProject);
        const machineShipDateMap = {};
        machineShipDates.forEach(d => { machineShipDateMap[d.machine] = d; });

        let shippingDateLabel;
        if (is2000sSeries(num)) {
            // 2000番台は一覧カードに機械ごとの行を出さない（ボタン1つに集約）ため、機械間で出荷日が違っても
            // 代表して最短日を1本だけ表示する（機械ごとの内訳は組立・試運転それぞれの一覧モーダル側で見る）。
            // 組立側に機械組立タスクがまだ無い（組立申請だけ先にある）工番でも、試運転タスク側に出荷日があれば
            // 拾えるよう、組立の機械一覧(machines)と試運転の機械一覧(testRunMachinesByProject)の両方を見る
            const shipDateMachines = new Set([...machines, ...(testRunMachinesByProject[num] || [])]);
            const earliestDate = [...shipDateMachines]
                .map(m => getEffectiveShippingDateForMachine(num, m)?.date)
                .filter(Boolean).sort()[0];
            if (earliestDate) {
                shippingDateLabel = buildShipDateSpan('工場出荷予定日(最短)', earliestDate, false);
            } else {
                // 工場出荷タスクが機械単位で入っていない（machine列が空のタスクや、まだ工程表に無い）工番向けの
                // フォールバック。projects.shipping_date は工程表と別に工番全体で持つ出荷予定日で、
                // 非2000番台の一覧カード表示（getEffectiveShippingDate）でも同じフィールドを使っている
                const projectLevelDate = projectsMap[num]?.shipping_date || null;
                shippingDateLabel = projectLevelDate ? buildShipDateSpan('工場出荷予定日', projectLevelDate, false) : '';
            }
        } else if (perMachineShipDateDiffers) {
            shippingDateLabel = '';
        } else if (machines.length === 1 && hasSplitShippingInProject) {
            // 機械1台の分割出荷は右上にまとめて①②を並べて表示する（prog-card-datesが縦積みにする）
            shippingDateLabel = getShippingEntriesForMachine(num, machines[0]).filter(e => e.date).map(e => {
                const baseLabel = e.isConfirmed ? '工場出荷確定日' : '工場出荷予定日';
                const labelText = e.seq ? `${e.seq === 1 ? '①' : '②'}${baseLabel}` : baseLabel;
                return buildShipDateSpan(labelText, e.date, e.isConfirmed);
            }).join('');
        } else {
            const { date: effectiveShippingDate, isConfirmed: shippingDateConfirmed } = getEffectiveShippingDate(num);
            const baseLabel = shippingDateConfirmed ? '工場出荷確定日' : '工場出荷予定日';
            shippingDateLabel = effectiveShippingDate ? buildShipDateSpan(baseLabel, effectiveShippingDate, shippingDateConfirmed) : '';
        }

        let packingDateLabel = '';
        if (hasAnyPacking) {
            const { date: effectivePackingDate, isConfirmed: packingDateConfirmed } = getEffectivePackingShippingDate(num);
            // 「あり」確定後、工程表にも承認フローにも日付がまだ無い間は「あり（未入力）」を表示する。
            // 「梱包出荷：未定」（有無不明・オレンジの警告バッジ）と紛らわしくならないよう、
            // 文言に「未定」を使わず、色も警告色ではないニュートラルな prog-card-date のままにする
            // （工程表の梱包出荷タスクには触れず、承認フロー側の表示のみ切り替える）
            packingDateLabel = effectivePackingDate
                ? `<span class="prog-card-date${packingDateConfirmed ? ' is-confirmed' : ''}"><span class="prog-card-date-label">${packingDateConfirmed ? '梱包出荷確定日' : '梱包出荷予定日'}</span> <span class="prog-card-date-value">${fmtDate(effectivePackingDate)}</span></span>`
                : `<span class="prog-card-date"><span class="prog-card-date-label">梱包出荷</span> <span class="prog-card-date-value">あり（未入力）</span></span>`;
        } else if (packingState === 'unknown') {
            // 梱包出荷「未定」表示・あり／なし選択は4000番台・4C番の工番のみが対象（getPackingDisplayState内で判定）
            // 権限があるロールはバッジをクリックしてその場で「あり・なし」を選択できる。
            // ポップアップは他のカード表示と重ならないよう、共有要素を position:fixed でバッジの真下に動的配置する（togglePackingPopup参照）
            const badgeClass = canSetPacking ? 'prog-card-badge-warning is-clickable' : 'prog-card-badge-warning';
            const badgeOnclick = canSetPacking ? ` onclick="event.stopPropagation(); togglePackingPopup(event, '${num}')"` : '';
            packingDateLabel = `<span class="${badgeClass}"${badgeOnclick}>⚠ 梱包出荷：未定${canSetPacking ? ' ▾' : ''}</span>`;
        }

        // 組立(assembly)は機械・ユニットが工程表と紐づかないため工番全体で1つに集約するが、
        // 見た目は他フローと同じ「機械行の中の丸」として、各機械行の先頭に共通で表示する（ラインで他フローとつながる）
        const assemblyAggStatus = computeAssemblyAggStatus(num, assemblyReqsByProject);
        // 機械組立タスクが1つも無く、組立申請も無い工番（出荷品確認検査など機械組立を伴わないフロー専用）は
        // 組立の丸自体を表示しない（機械組立が存在するかのような誤解を防ぐため）
        const hasAnyAssemblyTask = machines.some(m => hasTask(num, m, '機械組立'));
        const hasAssemblyReq     = (assemblyReqsByProject[num] || []).length > 0;
        const showAssemblyNode   = hasAnyAssemblyTask || hasAssemblyReq;

        // ===== 2000番台：一覧カードには「組立」「試運転」の2枚のタイル（進捗＋機械一覧を開くボタン）を並べる =====
        // 申請は機械・ユニット単位のため、カード上には機械ごとの操作を置かず、〇台中〇台完了の進捗と注意バッジのみ表示する。
        // タイル（または「機械一覧を見る」）を押すと、機械一覧モーダル（renderAssembly2000FlowDetailBody / renderTestRun2000FlowDetailBody）を開く。
        // 組立：機械一覧 → 機械選択 → ユニット一覧 → 申請　／　試運転：機械一覧 → 機械選択 → 申請
        const build2000FlowButtons = () => {
            const testRunPairs = testRunUnitsByProject[num] || [];
            const tiles = [];

            if (showAssemblyNode) {
                const assemblyMachines = machines.filter(m => hasTask(num, m, '機械組立'));
                // 電気艤装タスクがある機械は、組立・電装の両方が承認されて初めて完了扱い（機械行の丸と同じ判定）
                const statuses = assemblyMachines.length > 0
                    ? assemblyMachines.map(m => {
                        const a = computeAssemblyAggStatusForMachine(num, m, assemblyReqsByProject, assemblyNotRequiredSet);
                        if (!hasTask(num, m, '電気艤装')) return a;
                        const e = computeAssemblyAggStatusForMachine(num, m, electricalReqsByProject, electricalNotRequiredSet);
                        return (a === 'rejected' || e === 'rejected') ? 'rejected'
                            : (a === 'approved' && e === 'approved') ? 'approved'
                            : (a === 'empty' && e === 'empty') ? 'empty'
                            : ((a === 'draft' || a === 'empty') && (e === 'draft' || e === 'empty')) ? 'draft'
                            : 'active';
                    })
                    : [computeAssemblyAggStatus(num, assemblyReqsByProject)];
                const assemblyPendingCount   = sumUnresolvedPendingItems((assemblyReqsByProject[num] || []).filter(r => r.status !== 'draft'));
                const electricalPendingCount = sumUnresolvedPendingItems((electricalReqsByProject[num] || []).filter(r => r.status !== 'draft'));
                tiles.push({
                    kind: 'assembly', statuses,
                    pendingCount: assemblyPendingCount + electricalPendingCount, overdueCount: 0,
                    onclick: `openAssemblyFlowDetailModal('${esc(num)}')`
                });
            }

            if (testRunPairs.length > 0) {
                let overdueCount = 0;
                const testRunReqs = testRunReqsByProject[num] || [];
                const statuses = testRunPairs.map(({ machine, unit }) => {
                    const activeReq = findTestRunReq(testRunReqs, machine, unit);
                    if (isTestRunPairOverdue(num, machine, unit, activeReq, testRunTaskInfoByPair)) overdueCount++;
                    if (!activeReq) return 'empty';
                    if (activeReq.status === 'approved') return 'approved';
                    if (activeReq.status === 'rejected') return 'rejected';
                    if (isSavedDraft(activeReq)) return 'draft';
                    if (activeReq.status === 'draft') return 'empty';
                    return 'active';
                });
                tiles.push({
                    kind: 'test_run', statuses, pendingCount: 0, overdueCount,
                    onclick: `openTestRunFlowDetailModal('${esc(num)}')`
                });
            }

            if (tiles.length === 0) return '';
            return '<div class="p2k-tiles' + (tiles.length === 1 ? ' is-single' : '') + '">'
                + tiles.map((t, i) => build2000FlowTileHtml({ ...t, withArrow: i === 0 && tiles.length > 1 })).join('')
                + '</div>';
        };

        const machineRows = is2000sSeries(num) ? build2000FlowButtons() : (machines.length > 0 ? machines : [null]).map(machine => {
            const mData = machine ? projectData[num][machine] : null;
            const tplC  = machine ? isTemplateC(num) : false;

            const applicable = machine ? FLOW_DEFS.filter(f => {
                // 2000番台工事は組立・試運転フローのみ対象（出荷系・検査系は完全に対象外）
                if (is2000sSeries(num) && f.type !== 'test_run') return false;
                if (f.alwaysShow) return true;
                if (f.type === 'test_run')          return hasTask(num, machine, '試運転')     || !!mData.flows['test_run'];
                if (f.type === 'simple_inspection') return hasProjectFlow(num, '簡易検査')     || hasTask(num, machine, '簡易検査')     || !!mData.flows['simple_inspection'];
                if (f.type === 'inspection')        return hasProjectFlow(num, '外観検査')     || hasTask(num, machine, '外観検査')     || !!mData.flows['inspection'];
                if (f.type === 'shipping_check_inspection') return hasTask(num, machine, '出荷品確認検査') || !!mData.flows['shipping_check_inspection'];
                if (f.type === 'shipping_meeting')  return hasProjectFlow(num, '出荷確認会議') || hasTask(num, machine, '出荷確認会議') || !!mData.flows['shipping_meeting'];
                if (f.type === 'shipping_prep')     return hasTask(num, machine, '出荷準備')   || !!mData.flows['shipping_prep'];
                return false;
            }) : [];
            // 組立は先頭に表示する疑似エントリとして合成する（機械組立タスクが無い工番では表示しない）
            const fullChain = showAssemblyNode
                ? [{ type: 'assembly', label: '組立', __isAssembly: true }, ...applicable]
                : [...applicable];

            const nodes = fullChain.map((f, i) => {
                if (f.__isAssembly) {
                    // 2000番台は標準リストの機械コードが工程表のmachine名と一致するため、機械ごとの実際の申請状況を判定する。
                    // 2000番以外は機械名が自由入力で工程表と紐づかないため、工番全体で集約した状態を使う
                    const isMachineRow = machine && is2000sSeries(num);
                    const assemblyStatus = isMachineRow
                        ? computeAssemblyAggStatusForMachine(num, machine, assemblyReqsByProject, assemblyNotRequiredSet)
                        : assemblyAggStatus;

                    // 電気艤装タスクがある機械は、組立の丸に電装の状況も統合して「組立・電装」として表示する
                    // 2000番台は電装もユニット単位申請のため、組立と同じ集約ロジック（全ユニット承認/不要で'approved'）を使う
                    const electricalReq = (machine && !isMachineRow) ? mData.flows['electrical'] : null;
                    const hasElectrical = !!(machine && (hasTask(num, machine, '電気艤装') || electricalReq));
                    const electricalStatus = isMachineRow
                        ? (hasElectrical ? computeAssemblyAggStatusForMachine(num, machine, electricalReqsByProject, electricalNotRequiredSet) : 'empty')
                        : (!electricalReq ? 'empty'
                            : electricalReq.status === 'approved' ? 'approved'
                            : electricalReq.status === 'rejected' ? 'rejected'
                            : isSavedDraft(electricalReq)         ? 'draft'
                            : electricalReq.status === 'draft'    ? 'empty'
                            : 'active');

                    // 丸の色は組立・電装の両方が承認されて初めて「完了」。片方でも進んでいれば「進行中」表示にする
                    const statusForThisRow = !hasElectrical ? assemblyStatus
                        : (assemblyStatus === 'rejected' || electricalStatus === 'rejected') ? 'rejected'
                        : (assemblyStatus === 'approved' && electricalStatus === 'approved') ? 'approved'
                        : (assemblyStatus === 'empty' && electricalStatus === 'empty') ? 'empty'
                        : ((assemblyStatus === 'draft' || assemblyStatus === 'empty') && (electricalStatus === 'draft' || electricalStatus === 'empty')) ? 'draft'
                        : 'active';

                    const { fcClass, icon } = deriveFlowVisual(statusForThisRow);
                    const isEffectivelyApproved = statusForThisRow === 'approved';
                    const canApply = canApplyFlow('assembly');
                    // can-apply（点線・ホバー時の強調）は未申請/下書きのみ。申請中・承認済みの丸には付けない。
                    // 電装統合表示では、組立・電装どちらか一方でも自分のロールで申請できる状態なら点線を出す
                    const canApplyAssemblyNow = canApply && (assemblyStatus === 'empty' || assemblyStatus === 'draft');
                    const canApplyElectricalNow = hasElectrical && canApplyFlow('electrical') && (electricalStatus === 'empty' || electricalStatus === 'draft');
                    const canApplyNow = !progressFilterCompleted && (canApplyAssemblyNow || canApplyElectricalNow);
                    const clickable = canApplyNow ? ' clickable can-apply' : ' clickable';

                    let assemblyDateStr = '';
                    if (assemblyStatus === 'approved') {
                        // 関連する承認済み申請のうち最新の承認日を表示（全ユニットが不要マークのみで完了した場合は日付なし）
                        const relevantReqs = ((assemblyReqsByProject || {})[num] || []).filter(r => {
                            if (r.status !== 'approved') return false;
                            return !isMachineRow || getAssemblyItemsForReq(r).some(it => it && it.machine === machine);
                        });
                        const latestDate = relevantReqs.map(r => r.updated_at).filter(Boolean).sort().slice(-1)[0];
                        if (latestDate) {
                            const d = new Date(latestDate);
                            assemblyDateStr = `完了 ${d.getMonth()+1}/${d.getDate()}`;
                        }
                    } else if (assemblyStatus === 'draft') {
                        assemblyDateStr = '入力中';
                    } else if (assemblyStatus === 'active') {
                        assemblyDateStr = '申請中';
                    }

                    // ペンディング項目（未完了）の件数。組立は関連申請（2000番台は当該機械分のみ）を下書き以外すべて対象に合算する
                    const relevantAssemblyReqsAll = ((assemblyReqsByProject || {})[num] || []).filter(r => {
                        if (r.status === 'draft') return false;
                        return !isMachineRow || getAssemblyItemsForReq(r).some(it => it && it.machine === machine);
                    });
                    const assemblyPendingCount = sumUnresolvedPendingItems(relevantAssemblyReqsAll);
                    const assemblyPendingBadge = assemblyPendingCount > 0
                        ? `<div class="flow-pending-badge"><span class="si-badge si-orange" style="background:#8e44ad;">⚠</span>${assemblyPendingCount}件</div>`
                        : '';

                    const connector = i < fullChain.length - 1
                        ? `<div class="flow-connector ${isEffectivelyApproved ? 'fc-line-done' : 'fc-line-pending'}"></div>`
                        : '';
                    // 2000番以外は1工番=1申請のため、承認済みかつペンディング未完了が無ければクリックで詳細画面を経由せず直接完了報告書を開く
                    // （ペンディングが残っている場合・電装統合表示時は詳細モーダル経由に統一し、モーダル内で完了操作できるようにする）
                    const approvedReq = (!isMachineRow && assemblyStatus === 'approved' && !hasElectrical && assemblyPendingCount === 0)
                        ? ((assemblyReqsByProject || {})[num] || []).find(r => r.status === 'approved')
                        : null;
                    const clickHandler = approvedReq
                        ? `window.open('${SHEET_FLOW_META.assembly.file}?view=1&id=${approvedReq.id}', '_blank')`
                        : isMachineRow
                            ? `openAssemblyMachineDetailModal('${esc(num)}', '${esc(machine)}')`
                            : `openAssemblyFlowDetailModal('${esc(num)}')`;

                    if (!hasElectrical) {
                        return `<div class="flow-node${clickable}" onclick="event.stopPropagation(); ${clickHandler}"
                            data-flow-type="assembly"
                            data-num="${esc(num)}">
                            <div class="flow-circle ${fcClass}">${icon}</div>
                            <div class="flow-label">組立</div>
                            ${assemblyDateStr ? `<div class="flow-date">${assemblyDateStr}</div>` : ''}
                            ${assemblyPendingBadge}
                        </div>${connector}`;
                    }

                    // 電装側の日付表示・未申請未承認バッジ（通常のflow-nodeと同じロジック）
                    let electricalDateStr = '';
                    let electricalOverdueBadge = '';
                    if (isMachineRow) {
                        // 2000番台はユニット単位集約のため、組立と同じく完了/入力中/申請中の日付ラベルのみ表示する（期日超過バッジは出さない）
                        if (electricalStatus === 'approved') {
                            const relevantElecReqs = (electricalReqsByProject[num] || []).filter(r =>
                                r.status === 'approved' && getAssemblyItemsForReq(r).some(it => it && it.machine === machine));
                            const latestElecDate = relevantElecReqs.map(r => r.updated_at).filter(Boolean).sort().slice(-1)[0];
                            if (latestElecDate) {
                                const d = new Date(latestElecDate);
                                electricalDateStr = `完了 ${d.getMonth()+1}/${d.getDate()}`;
                            }
                        } else if (electricalStatus === 'draft') {
                            electricalDateStr = '入力中';
                        } else if (electricalStatus === 'active') {
                            electricalDateStr = '申請中';
                        }
                    } else {
                        if (electricalReq && electricalReq.status !== 'draft') {
                            const dateIso = (electricalReq.status === 'approved' || electricalReq.status === 'rejected') ? electricalReq.updated_at : electricalReq.created_at;
                            if (dateIso) {
                                const d = new Date(dateIso);
                                const prefix = electricalReq.status === 'approved' ? '完了' : electricalReq.status === 'rejected' ? '却下' : '申請';
                                electricalDateStr = `${prefix} ${d.getMonth()+1}/${d.getDate()}`;
                            }
                        } else if (isSavedDraft(electricalReq)) {
                            electricalDateStr = '入力中';
                        }
                        const electricalOverdue = isFlowOverdue(num, machine, 'electrical', electricalReq);
                        electricalOverdueBadge = electricalOverdue
                            ? `<div class="flow-overdue-badge">⚠ ${electricalReq && electricalReq.status !== 'draft' ? '未承認' : '未申請'}</div>`
                            : '';
                    }

                    // 電装側のペンディング未完了件数（isMachineRow=trueは当該機械分の電装申請のみ、falseは工番の電装申請そのもの）
                    const relevantElecReqsAllForPending = isMachineRow
                        ? (hasElectrical ? (electricalReqsByProject[num] || []).filter(r =>
                            r.status !== 'draft' && getAssemblyItemsForReq(r).some(it => it && it.machine === machine)) : [])
                        : (electricalReq && electricalReq.status !== 'draft' ? [electricalReq] : []);
                    const electricalPendingCount = sumUnresolvedPendingItems(relevantElecReqsAllForPending);
                    const electricalPendingBadge = electricalPendingCount > 0
                        ? `<div class="flow-pending-badge"><span class="si-badge si-orange" style="background:#8e44ad;">⚠</span>${electricalPendingCount}件</div>`
                        : '';

                    return `<div class="flow-node${clickable}" onclick="event.stopPropagation(); ${clickHandler}"
                        data-flow-type="assembly"
                        data-num="${esc(num)}">
                        <div class="flow-circle ${fcClass}">${icon}</div>
                        <div class="flow-label">組立・電装</div>
                        <div class="flow-dual-status">
                            <div class="flow-dual-col">
                                <div class="flow-dual-col-label">組立</div>
                                ${assemblyDateStr ? `<div class="flow-date">${assemblyDateStr}</div>` : ''}
                                ${assemblyPendingBadge}
                            </div>
                            <div class="flow-dual-col">
                                <div class="flow-dual-col-label">電装</div>
                                ${electricalDateStr ? `<div class="flow-date">${electricalDateStr}</div>` : ''}
                                ${electricalPendingBadge}
                                ${electricalOverdueBadge}
                            </div>
                        </div>
                    </div>${connector}`;
                }

                const req = mData.flows[f.type];
                let fcClass, icon, clickAttr = '', clickable = '';
                const isEffectivelyApproved = req?.status === 'approved';

                if (!req) {
                    fcClass = 'fc-empty'; icon = '○';
                } else if (req.status === 'approved') {
                    fcClass = 'fc-done'; icon = '✓';
                } else if (req.status === 'rejected') {
                    fcClass = 'fc-rejected'; icon = '<span class="fc-x-icon">×</span>';
                } else if (isSavedDraft(req)) {
                    fcClass = 'fc-draft'; icon = '✏';
                } else if (req.status === 'draft') {
                    fcClass = 'fc-empty'; icon = '○';
                } else {
                    fcClass = 'fc-active'; icon = '<span class="fc-play-icon">▶</span>';
                }

                const canApply = canApplyFlow(f.type);

                if (f.type === 'test_run' && is2000sSeries(num) && machine) {
                    // 2000番台の試運転は機械単位の申請のため、組立と同様に機械詳細画面（インラインで申請・承認まで完結）を開く
                    clickAttr = `onclick="event.stopPropagation(); openTestRunMachineDetailModal('${esc(num)}', '${esc(machine)}')"`;
                    const canApplyNow = canApply && !progressFilterCompleted && (!req || req.status === 'draft');
                    clickable = canApplyNow ? ' clickable can-apply' : ' clickable';
                } else if (f.type === 'test_run') {
                    // 試運転(2000番以外)は組立と同様、状態に関わらず工番全体の機械一覧モーダルを開く。
                    // 試運転は完了操作自体を廃止しているため、承認済みなら常に直接完了報告書を開く
                    // （countUnresolvedPendingItemsは試運転に対して常に0を返す）
                    const hasUnresolvedTestRunPending = countUnresolvedPendingItems(req) > 0;
                    clickAttr = (req && req.status === 'approved' && !hasUnresolvedTestRunPending)
                        ? `onclick="event.stopPropagation(); window.open('${SHEET_FLOW_META.test_run.file}?view=1&id=${req.id}', '_blank')"`
                        : `onclick="event.stopPropagation(); openTestRunFlowDetailModal('${esc(num)}')"`;
                    const canApplyNow = canApply && !progressFilterCompleted && (!req || req.status === 'draft');
                    clickable = canApplyNow ? ' clickable can-apply' : ' clickable';
                } else if (!req && canApply && !progressFilterCompleted) {
                    clickAttr = `onclick="event.stopPropagation(); openFlowModalPreset(this)"`;
                    clickable = ' clickable can-apply';
                } else if (req && req.status === 'draft') {
                    // そのフローを申請できるロールのみクリック可能
                    if (canApply && !progressFilterCompleted) {
                        clickAttr = `onclick="event.stopPropagation(); openDraftInSubmitModal('${req.id}')"`;
                        clickable = ' clickable can-apply';
                    }
                    // 申請権限のないロールはクリック不可（表示のみ）
                } else if (req) {
                    clickAttr = `onclick="event.stopPropagation(); openDetailModal('${req.id}')"`;
                    clickable = ' clickable';
                }

                let flowDateStr = '';
                if (req && req.status !== 'draft') {
                    if (QA_MEETING_FLOWS.includes(f.type) && req.inspection_date) {
                        const d = new Date(req.inspection_date + 'T00:00:00');
                        const label = req.status === 'approved' ? '完了' : '開催';
                        flowDateStr = `${label} ${d.getMonth()+1}/${d.getDate()}`;
                    } else {
                        const dateIso = (req.status === 'approved' || req.status === 'rejected') ? req.updated_at : req.created_at;
                        if (dateIso) {
                            const d = new Date(dateIso);
                            const prefix = req.status === 'approved' ? (f.type === 'shipping' ? '承認' : '完了') : req.status === 'rejected' ? '却下' : '申請';
                            flowDateStr = `${prefix} ${d.getMonth()+1}/${d.getDate()}`;
                        }
                    }
                } else if (isSavedDraft(req)) {
                    flowDateStr = '入力中';
                }

                let pendingBadge = '';
                if (req && req.status !== 'draft' && (f.type === 'test_run' || QA_MEETING_FLOWS.includes(f.type))) {
                    const unresolvedCount = countUnresolvedPendingItems(req);
                    if (unresolvedCount > 0) {
                        pendingBadge = `<div class="flow-pending-badge"><span class="si-badge si-orange" style="background:#8e44ad;">⚠</span>${unresolvedCount}件</div>`;
                    }
                }

                // 未申請・未承認バッジ（フィルタと連動）
                let overdueBadge = '';
                const isMainOverdueFlow   = !!OVERDUE_FLOW_TASK_TEXT[f.type] && isFlowOverdue(num, machine, f.type, req);
                const isInviteOverdueFlow = QA_MEETING_FLOWS.includes(f.type) && isInviteFlowOverdue(num, machine, f.type, req);
                if (isMainOverdueFlow || isInviteOverdueFlow) {
                    const isUnapproved = isMainOverdueFlow && req && req.status !== 'draft';
                    overdueBadge = `<div class="flow-overdue-badge">⚠ ${isUnapproved ? '未承認' : '未申請'}</div>`;
                }

                const connector = i < fullChain.length - 1
                    ? `<div class="flow-connector ${isEffectivelyApproved ? 'fc-line-done' : 'fc-line-pending'}"></div>`
                    : '';
                return `<div class="flow-node${clickable}" ${clickAttr}
                    data-flow-type="${f.type}"
                    data-num="${esc(num)}"
                    data-machine="${esc(machine)}">
                    <div class="flow-circle ${fcClass}">${icon}</div>
                    <div class="flow-label">${esc(f.label)}</div>
                    ${flowDateStr ? `<div class="flow-date">${flowDateStr}</div>` : ''}
                    ${pendingBadge}
                    ${overdueBadge}
                </div>${connector}`;
            }).join('');

            // 2000番完了報告は機械ごとの完了判定を行うため、機械が1台でも機械名を表示する（2000番以外は複数台の時のみ）
            const machineLabel = (machine && (machines.length > 1 || is2000sSeries(num)))
                ? '<div class="prog-machine-label">【' + esc(machine) + '】</div>' : '';
            // 分割出荷（工場出荷タスクが2件）の機械は①②それぞれの日付を並べて表示する
            const machineShipEntries = perMachineShipDateDiffers ? getShippingEntriesForMachine(num, machine) : [];
            const machineShipSpans = machineShipEntries.filter(e => e.date).map(e => {
                const baseLabel = e.isConfirmed ? '工場出荷確定日' : '工場出荷予定日';
                const labelText = e.seq ? `${e.seq === 1 ? '①' : '②'}${baseLabel}` : baseLabel;
                return buildShipDateSpan(labelText, e.date, e.isConfirmed);
            });
            // 複数spanをまとめて1つのflexアイテムにし、row-headerのspace-betweenレイアウトを崩さないようにする
            const machineShipHtml = machineShipSpans.length > 0
                ? '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + machineShipSpans.join('') + '</div>'
                : '';
            const rowHeader = (machineLabel || machineShipHtml)
                ? '<div class="prog-machine-row-header">' + machineLabel + machineShipHtml + '</div>'
                : '';
            return '<div class="prog-machine-row">' + rowHeader + '<div class="flow-steps">' + nodes + '</div></div>';
        }).join('');

        return `<div class="prog-card" data-num="${esc(num)}">
            <div class="prog-card-header">
                <div class="prog-card-header-left">
                    <span class="prog-card-num">${esc(num)}</span>${label ? `<span class="prog-card-label">${esc(label)}</span>` : ''}
                </div>
                ${(packingDateLabel || shippingDateLabel) ? `<div class="prog-card-dates">${packingDateLabel}${shippingDateLabel}</div>` : ''}
            </div>
            ${machineRows}
        </div>`;
    }).join('');

    wrap.innerHTML = html;
}

// ===== 組立(assembly)：工番全体を1つのフロー丸として表示 =====
// 2000番以外は機械・ユニットが工程表と紐づかないため、他フローのような機械単位のステップ表示はできない。
// そのため工番全体の全assembly申請を集約して1つの状態にし、他フローと同じ見た目(flow-node)で1行だけ表示する。
// 承認されればそのまま完了扱い（工番単位の手動確定は廃止）。内訳はこの丸をクリックして開く詳細モーダル側で確認する
function computeAssemblyAggStatus(num, assemblyReqsByProject) {
    const reqs = (assemblyReqsByProject || {})[num] || [];
    if (reqs.length === 0) return 'empty';
    if (reqs.some(r => r.status === 'approved')) return 'approved';
    if (reqs.some(r => r.status === 'rejected')) return 'rejected';
    if (reqs.every(r => r.status === 'draft')) return reqs.some(isSavedDraft) ? 'draft' : 'empty';
    return 'active';
}

// tasks.ownerはカンマ・読点区切りで複数担当者が1セルにまとめて入力される場合があるため、
// owner文字列を扱う箇所は必ずこの関数を通して個々の担当者名に分解する
function splitOwnerNames(ownerStr) {
    return String(ownerStr || '').split(/[,、，]/).map(s => s.trim()).filter(Boolean);
}

// 全体工程表「出張予定シート」に表示されるタスクかどうかの判定（../全体工程表/gantt-app.js の
// _isBusinessTripTaskRow / _isTripTaskExpired と同じ条件をこちらでも再現する）
function isBusinessTripTaskRow(t) {
    const val = t?.is_business_trip;
    if (val === true || val === 'true' || val === 'TRUE') return true;
    return String(t?.task_type || '').trim().toLowerCase() === 'field_trip';
}

// start_date/end_dateから終了日(inclusive)を求め、durationのフォールバックに使う
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

// 出張タスクが終了日+7日を過ぎて全体工程表側で自動非表示になる期限切れかどうか
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

// 工事番号に対応する「出張予定シート」表示中タスクの担当者名一覧（タスク名は問わない）
async function getBusinessTripOwnerNames(projectNum) {
    if (!projectNum) return [];
    const { data: tripTasks } = await db.from('tasks')
        .select('owner, is_business_trip, task_type, start_date, end_date, duration')
        .eq('project_number', projectNum);
    const rows = (tripTasks || []).filter(t => isBusinessTripTaskRow(t) && !isTripTaskExpired(t));
    return [...new Set(rows.flatMap(t => splitOwnerNames(t.owner)))];
}

// unit列でグループ化し、担当者名(owner)をSetにまとめる（1ユニットに複数担当者がいる場合に対応するため）
function buildOwnerNamesByUnit(rows) {
    const map = new Map();
    (rows || []).forEach(t => {
        const key = t.unit || '';
        if (!map.has(key)) map.set(key, new Set());
        splitOwnerNames(t.owner).forEach(name => map.get(key).add(name));
    });
    return map;
}

// 2000番台：標準リストの機械コード(CC/PC/TR等)に対応する固定ユニット候補＋自由入力で追加されたユニットの一覧を返す
// （ユニット選択不要機械(-のみ)は、ユニット無しを表す空文字1件の配列にする）
function getAssemblyUnitListForMachine(machine, reqsForProject) {
    const fixed = ASSEMBLY_UNIT_MASTER[machine] || ['-'];
    const base = (fixed.length === 1 && fixed[0] === '-') ? [''] : fixed.filter(u => u !== '-');
    const extra = new Set();
    (reqsForProject || []).forEach(req => {
        getAssemblyItemsForReq(req).forEach(it => {
            if (it && it.machine === machine) {
                const u = (it.unit || '').trim();
                if (u && u !== '-' && !base.includes(u)) extra.add(u);
            }
        });
    });
    return [...base, ...extra];
}

// 2000番台：1ユニットの状態。'done'(承認済みor不要マーク済み) | 'rejected' | 'active'(申請中) | 'draft' | 'empty'(未申請)
function computeAssemblyUnitStatus(projectNum, machine, unit, reqsForProject, notRequiredSet) {
    if ((notRequiredSet || new Set()).has(`${projectNum}__${machine}__${unit || ''}`)) return 'done';
    const matching = (reqsForProject || []).filter(req =>
        getAssemblyItemsForReq(req).some(it => it && it.machine === machine && (it.unit || '') === (unit || '')));
    if (matching.length === 0) return 'empty';
    if (matching.some(r => r.status === 'approved')) return 'done';
    if (matching.some(r => r.status === 'submitted' || r.status === 'in_review')) return 'active';
    if (matching.some(r => r.status === 'rejected')) return 'rejected';
    if (matching.some(isSavedDraft)) return 'draft';
    return 'empty';
}

// 2000番台：その機械の全ユニット（固定＋追加分）が「承認済み or 不要マーク済み」なら機械全体を完了扱いにする
function computeAssemblyAggStatusForMachine(num, machine, assemblyReqsByProject, assemblyNotRequiredSet) {
    const reqs  = (assemblyReqsByProject || {})[num] || [];
    const units = getAssemblyUnitListForMachine(machine, reqs);
    const statuses = units.map(u => computeAssemblyUnitStatus(num, machine, u, reqs, assemblyNotRequiredSet));
    if (statuses.length > 0 && statuses.every(s => s === 'done')) return 'approved';
    if (statuses.some(s => s === 'rejected')) return 'rejected';
    if (statuses.some(s => s === 'active'))   return 'active';
    if (statuses.some(s => s === 'draft'))    return 'draft';
    return 'empty';
}

// 2000番台：試運転タスクのunit列を正規化する。「ALL」はユニット区別が無いことを表す
// 工程表側の入力慣習のため、ユニット無し（空文字）として扱う（機械名のみ表示にする）
function normalizeTestRunUnit(unit) {
    const u = (unit || '').trim();
    return u === 'ALL' ? '' : u;
}

// 2000番台：試運転の申請1件がこの機械・ユニットに該当するか判定する。unit_nameが無い申請
// （ユニット単位化前に作られた機械単位の申請）のうち、承認済み・申請中・却下など既に確定した
// ものは、その機械の全ユニットに一致するとみなす（過去の機械単位の承認をそのまま有効に扱うため）。
// 一方、unit_nameが無い「下書きのまま放置された申請」は対象ユニットを1つに絞れないため、
// 新しいユニット行では拾わない（拾うと、古い機械単位の下書き1件が全ユニットの「申請する」を
// 乗っ取ってしまい、ユニットごとに新規申請できなくなるため）
function testRunReqMatchesUnit(req, machine, unit) {
    if (req.machine_name !== machine) return false;
    if (req.unit_name != null) return req.unit_name === (unit || null);
    if (req.status === 'draft') return !unit;
    return true;
}

// 2000番台：機械・ユニットに対応する試運転申請を1件返す（申請中・承認済み・却下を優先、無ければ下書き）
function findTestRunReq(reqsForProject, machine, unit) {
    const matching = (reqsForProject || []).filter(req => testRunReqMatchesUnit(req, machine, unit));
    return matching.find(r => r.status !== 'draft') || matching.find(r => r.status === 'draft') || null;
}

// 2000番台：機械・ユニット単位の試運転タスクが期日超過（未申請 or 未承認）か判定する
function isTestRunPairOverdue(num, machine, unit, activeReq, taskInfoByPair) {
    if (activeReq) return activeReq.status === 'submitted' || activeReq.status === 'in_review';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
    const info = (taskInfoByPair || {})[`${num}__${machine}__${unit || ''}`];
    return !!(info && !info.is_completed && info.end_date && info.end_date < todayStr);
}

// ===== 2000番台：組立・試運転それぞれの「機械一覧」モーダルの行を組み立てる共通部品 =====
// 一覧カードの「組立申請はこちら→」「試運転申請はこちら→」ボタンから開くモーダルの中身。
// 機械ごとに大きな丸を並べる形式だと余白が大きくなるため、他の一覧モーダル（機械詳細画面の
// ユニット一覧など）と同じ unit-list-row 形式（名前＋ステータスバッジ＋リンク）でコンパクトに2列表示する。
// 出荷予定日は「工場出荷」タスクの終了日をそのまま表示する（2000番台には出荷承認フロー自体が無く、
// 確定/予定の区別が無いため、他フローのような確定日切り替えは行わない）

// ===== 2000番台：一覧カードのタイル（組立→試運転）と、機械一覧モーダルのステップ表示 =====
// 機械ごとの集約ステータス配列（approved/rejected/active/draft/empty）からタイル全体の状態を決める
function aggregate2000FlowStatus(statuses) {
    if (!statuses || statuses.length === 0) return 'empty';
    if (statuses.every(s => s === 'approved')) return 'approved';
    if (statuses.some(s => s === 'rejected'))  return 'rejected';
    if (statuses.some(s => s === 'active' || s === 'approved')) return 'active';
    if (statuses.some(s => s === 'draft'))     return 'draft';
    return 'empty';
}

// 一覧カードのタイル1枚分。{ kind:'assembly'|'test_run', statuses, pendingCount, overdueCount, onclick, withArrow }
function build2000FlowTileHtml({ kind, statuses, pendingCount, overdueCount, onclick, withArrow }) {
    const isAssembly = kind === 'assembly';
    const agg   = aggregate2000FlowStatus(statuses);
    const total = statuses.length;
    const done  = statuses.filter(s => s === 'approved').length;
    const pct   = total > 0 ? Math.round(done / total * 100) : 0;
    const ICONS = { approved: '✓', active: '▶', rejected: '×', draft: '✏', empty: '○' };
    const PILLS = { approved: '完了', active: '申請中', rejected: '却下あり', draft: '入力中', empty: '未申請' };

    const warns = [];
    if (agg === 'rejected')  warns.push('<span class="p2k-warn">⚠ 却下あり</span>');
    if (overdueCount > 0)    warns.push(`<span class="p2k-warn">⚠ 未申請・未承認 ${overdueCount}台</span>`);
    if (pendingCount > 0)    warns.push(`<span class="p2k-warn is-pending">⚠ 申し送り ${pendingCount}件</span>`);

    const arrowHtml = withArrow
        ? '<div class="p2k-tile-arrow"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>'
        : '';

    return `<div class="p2k-tile" onclick="event.stopPropagation(); ${onclick}">
        ${arrowHtml}
        <div class="p2k-tile-head">
            <div class="p2k-tile-circle st-${agg}">${ICONS[agg]}</div>
            <div class="p2k-tile-titles">
                <span class="p2k-tile-step">${isAssembly ? 'STEP 1' : 'STEP 2'}</span>
                <span class="p2k-tile-title">${isAssembly ? '組立完了申請' : '試運転完了申請'}</span>
            </div>
            <span class="p2k-pill st-${agg}">${PILLS[agg]}</span>
        </div>
        <div class="p2k-progress">
            <div class="p2k-bar"><i style="width:${pct}%;"></i></div>
            <span class="p2k-count">${total}台中 ${done}台完了</span>
        </div>
        <div class="p2k-foot">
            <div class="p2k-warns">${warns.join('')}</div>
            <span class="p2k-open-btn">機械一覧を見る<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
        </div>
    </div>`;
}

// 機械一覧モーダル上部の「いまどの段階か」を示すステップ表示。
// kind: 'assembly'（機械一覧→機械を選択→ユニット一覧→申請） / 'test_run'（機械一覧→機械を選択→申請）
// current: 現在のステップ番号（0始まり）。machine を渡すと「機械を選択」を【機械名】として完了表示する
function build2000FlowStepsHtml(kind, current, projectNum, machine) {
    const labels = kind === 'assembly'
        ? ['機械一覧', '機械を選択', 'ユニット一覧', '申請']
        : ['機械一覧', '機械を選択', '申請'];
    const backFn = kind === 'assembly' ? 'openAssemblyFlowDetailModal' : 'openTestRunFlowDetailModal';
    return '<div class="p2k-steps">' + labels.map((label, i) => {
        const isDone    = i < current;
        const isCurrent = i === current;
        const isLink    = i === 0 && current > 0;
        const text      = (i === 1 && machine) ? `【${esc(machine)}】` : label;
        const cls       = 'p2k-step' + (isDone ? ' is-done' : '') + (isCurrent ? ' is-current' : '') + (isLink ? ' is-link' : '');
        const onclick   = isLink ? ` onclick="${backFn}('${esc(projectNum)}')"` : '';
        const sep       = i < labels.length - 1 ? '<span class="p2k-step-sep">›</span>' : '';
        return `<span class="${cls}"${onclick}><span class="p2k-step-num">${isDone ? '✓' : i + 1}</span>${text}</span>${sep}`;
    }).join('') + '</div>';
}

// 集約ステータス（approved/rejected/active/draft/empty）から状態バッジを1つ作る
function build2000StatusBadgeHtml(prefix, status) {
    const LABELS  = { approved: '完了', rejected: '却下', active: '申請中', draft: '入力中', empty: '未申請' };
    const CLASSES = { approved: 's-approved', rejected: 's-rejected', active: 's-submitted', draft: 's-gray', empty: 's-gray' };
    const label = (prefix ? prefix + ' ' : '') + (LABELS[status] || status);
    return `<span class="status-badge ${CLASSES[status] || 's-gray'}">${esc(label)}</span>`;
}

// 1機械分の行（unit-list-row形式）。machineがnull/空の場合は工番全体集約行として表示する。
// 上段（機械名・バッジ・出荷予定日）と下段（操作リンク）を分け、カードの高さが揃った際に下段が
// カード下端に揃うようにする（wrap-2000-grid・justify-content:space-betweenと合わせて使う）
function build2000MachineListRowHtml({ machine, shipDate, badgesHtml, warningHtml, linkOnclick, unitProgress }) {
    const nameHtml = machine ? `【${esc(machine)}】` : '組立（全体）';
    // machineが特定できている行は「探したが工場出荷タスクが無い」=不明。
    // machineが無い集約行（機械組立タスク自体が工程表未登録）は出荷日を探しようがないため空欄のままにする
    const shipMeta = machine ? `工場出荷予定日 ${shipDate ? esc(fmtDate(shipDate)) : '不明'}` : '';
    return `<div class="unit-list-row p2k-mrow" onclick="${linkOnclick}">
        <div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div class="unit-list-name">${nameHtml}</div>
                <div class="unit-list-status" style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">${badgesHtml}</div>
            </div>
            ${unitProgress ? `<div class="p2k-progress p2k-mrow-progress"><div class="p2k-bar"><i style="width:${unitProgress.total > 0 ? Math.round(unitProgress.done / unitProgress.total * 100) : 0}%;"></i></div><span class="p2k-count">ユニット ${unitProgress.total}件中 ${unitProgress.done}件完了</span></div>` : ''}
            <div class="unit-list-meta">${shipMeta || '&nbsp;'}</div>
        </div>
        <div class="unit-list-row-actions p2k-foot">
            <div class="p2k-warns">${warningHtml || ''}</div>
            <span class="p2k-open-btn" onclick="event.stopPropagation(); ${linkOnclick}">ユニット一覧を見る<svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
        </div>
    </div>`;
}

// 組立（電気艤装タスクがある機械は電装の状況も統合して2つのバッジで表示）の行を1つ組み立てる
function build2000AssemblyRowHtml(num, machine, hasElectrical, shipDate, assemblyReqsByProject, assemblyNotRequiredSet, electricalReqsByProject, electricalNotRequiredSet) {
    const assemblyStatus = computeAssemblyAggStatusForMachine(num, machine, assemblyReqsByProject, assemblyNotRequiredSet);
    const electricalStatus = hasElectrical
        ? computeAssemblyAggStatusForMachine(num, machine, electricalReqsByProject, electricalNotRequiredSet)
        : null;

    let badgesHtml = build2000StatusBadgeHtml(hasElectrical ? '組立' : '', assemblyStatus);
    if (hasElectrical) badgesHtml += build2000StatusBadgeHtml('電装', electricalStatus);

    const assemblyPendingCount = sumUnresolvedPendingItems((assemblyReqsByProject[num] || [])
        .filter(r => r.status !== 'draft' && getAssemblyItemsForReq(r).some(it => it && it.machine === machine)));
    const electricalPendingCount = hasElectrical
        ? sumUnresolvedPendingItems((electricalReqsByProject[num] || [])
            .filter(r => r.status !== 'draft' && getAssemblyItemsForReq(r).some(it => it && it.machine === machine)))
        : 0;
    const pendingCount = assemblyPendingCount + electricalPendingCount;
    const warningHtml = pendingCount > 0
        ? `<span class="si-badge si-orange" style="background:#8e44ad;">⚠${pendingCount}件</span>`
        : '';

    // ユニット区分がある機械は、一覧カードのタイルと同じ進捗バーで「ユニット〇件中〇件完了」を表示する（組立ユニット基準）
    const unitReqs  = (assemblyReqsByProject || {})[num] || [];
    const unitList  = getAssemblyUnitListForMachine(machine, unitReqs).filter(u => u && u !== '-');
    const unitProgress = unitList.length > 0
        ? { total: unitList.length, done: unitList.filter(u => computeAssemblyUnitStatus(num, machine, u, unitReqs, assemblyNotRequiredSet) === 'done').length }
        : null;

    return build2000MachineListRowHtml({
        machine, shipDate, badgesHtml, warningHtml, unitProgress,
        linkOnclick: `openAssemblyMachineDetailModal('${esc(num)}', '${esc(machine)}')`
    });
}

// 機械組立タスクがまだ工程表に登録されておらず機械単位に紐づけられない場合のフォールバック
// （組立申請自体は存在する）：工番全体の集約状態を1行だけ、機械名の見出し無しで表示する
function build2000AssemblyProjectAggRowHtml(num, assemblyReqsByProject) {
    const assemblyAggStatus = computeAssemblyAggStatus(num, assemblyReqsByProject);
    const badgesHtml = build2000StatusBadgeHtml('', assemblyAggStatus);
    return build2000MachineListRowHtml({
        machine: null, shipDate: null, badgesHtml, warningHtml: '',
        linkOnclick: `openAssemblyFlowDetailModal('${esc(num)}')`
    });
}

// 試運転の行を1つ組み立てる（機械・ユニット単位、電装との統合は無い）。工程表の「試運転」タスクの
// 機械・ユニットの組み合わせごとに1行・1申請とする（機械詳細モーダル(renderTestRunMachineDetailBody)は
// 使わず、二度手間にならないよう申請・承認等の操作をこの一覧行に直接持たせる）
function build2000TestRunRowHtml(num, machine, unit, activeReq, myDraft, shipDate, isOverdue, ctx) {
    const { canApply, myRole, requesterNames, meta } = ctx;
    const unitLabel = unit ? `${esc(machine)}${esc(unit)}` : esc(machine);

    let statusLabel, statusCls;
    if (activeReq)                  { statusLabel = statusBadgeLabel(activeReq); statusCls = STATUS_CLASSES[activeReq.status] || 's-gray'; }
    else if (isSavedDraft(myDraft)) { statusLabel = '下書き'; statusCls = 's-gray'; }
    else                             { statusLabel = '未申請'; statusCls = 's-gray'; }
    const badgesHtml = `<span class="status-badge ${statusCls}">${esc(statusLabel)}</span>`;

    let metaLine = '', linkHtml = '', extraActionsHtml = '', approvalHtml = '';

    if (activeReq) {
        const requesterName = requesterNames[activeReq.requester_id] || '—';
        const submittedDate = activeReq.created_at ? fmtDate(activeReq.created_at) : '—';
        metaLine = `申請者: ${esc(requesterName)}　申請日: ${esc(submittedDate)}`;

        const isApproved = activeReq.status === 'approved';
        const canEditRejected = activeReq.status === 'rejected' && (activeReq.requester_id === currentUser.id || canApply);
        const unresolvedPendingCount = countUnresolvedPendingItems(activeReq);
        const hasUnresolvedPending = isApproved && unresolvedPendingCount > 0;
        const sheetUrl = canEditRejected ? `${meta.file}?draft_id=${activeReq.id}` : `${meta.file}?view=1&id=${activeReq.id}`;
        const linkLabel = hasUnresolvedPending ? `⚠ 申し送り事項あり(${unresolvedPendingCount}件)`
            : isApproved ? '完了報告書を見る' : (canEditRejected ? 'チェックシートを修正する' : 'チェックシートを見る');
        // 戻り先は一覧モーダル自体（machineを渡さない＝testRunDetailReturnProjectNum経由でここに戻る）
        const linkOnclick = hasUnresolvedPending
            ? `viewTestRunRequestDetail('${activeReq.id}', '${esc(num)}')`
            : `window.open('${sheetUrl}', '_blank')`;
        linkHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="event.stopPropagation(); ${linkOnclick}">${linkLabel} →</span>`;

        const myStep = (activeReq.approval_steps || []).find(s =>
            (s.approver_role === myRole || isSuperAdmin()) && s.status === 'pending' && activeReq.status === 'submitted');
        approvalHtml = myStep ? `
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
                <button class="btn btn-danger"  style="font-size:12px;padding:4px 10px;" onclick="event.stopPropagation(); showTestRunRejectPrompt('${activeReq.id}', '${myStep.id}', '${esc(num)}', '${esc(machine)}', '${esc(unit)}')">却下する</button>
                <button class="btn btn-success" style="font-size:12px;padding:4px 10px;" onclick="event.stopPropagation(); approveTestRunRequestFromDetail('${activeReq.id}', '${myStep.id}', ${myStep.step_order}, '${esc(num)}', '${esc(machine)}', '${esc(unit)}')">承認する</button>
            </div>` : '';
    } else if (myDraft) {
        // 一時保存（sheet_saved_at）前は中身が空の可能性が高いため、申請・削除ボタンは
        // 一時保存済みになって初めて表示する（未保存の間はリンクのみ＝同じ下書きを開き直す）
        const savedOnce = isSavedDraft(myDraft);
        const reopenLabel = savedOnce ? '続きを入力する' : '申請する';
        linkHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="event.stopPropagation(); reopenTestRunSheetFromDetail('${myDraft.id}')">${reopenLabel} →</span>`;
        extraActionsHtml = savedOnce ? `
            <button class="btn-apply-xs" onclick="event.stopPropagation(); submitTestRunDraftFromDetail('${myDraft.id}', '${esc(num)}', '${esc(machine)}', '${esc(unit)}')">申請する</button>
            <button class="btn-delete-xs" title="削除" onclick="event.stopPropagation(); deleteTestRunDraftFromDetail('${myDraft.id}', '${esc(num)}', '${esc(machine)}', '${esc(unit)}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>` : '';
    } else if (canApply) {
        linkHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="event.stopPropagation(); startNewTestRunSheetFromDetail('${esc(num)}', '${esc(machine)}', '${esc(unit)}')">申請する →</span>`;
    }

    const warningHtml = isOverdue
        ? `<span class="si-badge si-orange" style="background:#8e44ad;">⚠${activeReq ? '未承認' : '未申請'}</span>`
        : '';
    const shipMeta = `工場出荷予定日 ${shipDate ? esc(fmtDate(shipDate)) : '不明'}`;

    return `<div class="unit-list-row">
        <div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div class="unit-list-name">【${unitLabel}】</div>
                <div class="unit-list-status">${badgesHtml}</div>
            </div>
            <div class="unit-list-meta">${metaLine || '&nbsp;'}</div>
            <div class="unit-list-meta">${shipMeta}</div>
        </div>
        <div>
            <div class="unit-list-row-actions" style="justify-content:space-between;">
                <div style="display:flex;gap:8px;align-items:center;">${linkHtml}${extraActionsHtml}</div>
                ${warningHtml}
            </div>
            ${approvalHtml}
        </div>
    </div>`;
}

// 2000番台：組立フロー「機械一覧」モーダルの中身（工番レベル）。一覧カードから常に最新の状態で開けるよう、
// 個別モーダル群（renderAssemblyMachineDetailBody等）と同様にここでも都度DBから取得し直す
async function renderAssembly2000FlowDetailBody(projectNum) {
    const { data: reqs } = await db.from('approval_requests')
        .select('*').eq('project_number', projectNum).eq('flow_type', 'assembly');
    const assemblyReqsByProject = { [projectNum]: reqs || [] };

    const { data: elecReqs } = await db.from('approval_requests')
        .select('*').eq('project_number', projectNum).eq('flow_type', 'electrical');
    const electricalReqsByProject = { [projectNum]: elecReqs || [] };

    const { data: notReqRows } = await db.from('assembly_unit_not_required')
        .select('machine, unit').eq('project_number', projectNum);
    const assemblyNotRequiredSet = new Set((notReqRows || []).map(r => `${projectNum}__${r.machine}__${r.unit || ''}`));

    const { data: elecNotReqRows } = await db.from('electrical_unit_not_required')
        .select('machine, unit').eq('project_number', projectNum);
    const electricalNotRequiredSet = new Set((elecNotReqRows || []).map(r => `${projectNum}__${r.machine}__${r.unit || ''}`));

    const { data: taskRows } = await db.from('tasks')
        .select('machine, text, end_date')
        .eq('project_number', projectNum)
        .in('text', ['機械組立', '電気艤装', '工場出荷'])
        .not('machine', 'is', null);
    const machines = [...new Set((taskRows || []).filter(t => t.text === '機械組立').map(t => t.machine))];
    const elecMachineSet = new Set((taskRows || []).filter(t => t.text === '電気艤装').map(t => t.machine));
    const shipDateByMachine = {};
    (taskRows || []).filter(t => t.text === '工場出荷').forEach(t => {
        if (t.end_date && (!shipDateByMachine[t.machine] || t.end_date < shipDateByMachine[t.machine])) {
            shipDateByMachine[t.machine] = t.end_date;
        }
    });
    // 表示順は工場出荷予定日の昇順（不明は末尾）。同じ出荷日・出荷日不明同士は機械名順で安定させる（試運転フローと同じ並び）
    machines.sort((a, b) => {
        const da = shipDateByMachine[a] || '9999-99-99';
        const db_ = shipDateByMachine[b] || '9999-99-99';
        if (da !== db_) return da < db_ ? -1 : 1;
        return a.localeCompare(b);
    });

    const rowsHtml = machines.length > 0
        ? machines.map(machine => build2000AssemblyRowHtml(
              projectNum, machine, elecMachineSet.has(machine), shipDateByMachine[machine],
              assemblyReqsByProject, assemblyNotRequiredSet, electricalReqsByProject, electricalNotRequiredSet
          )).join('')
        : build2000AssemblyProjectAggRowHtml(projectNum, assemblyReqsByProject);

    const pInfo = projectsMap[projectNum] || {};
    document.getElementById('detail_title').textContent = '組立フロー';
    document.getElementById('detail_body').innerHTML = `
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f;">${esc(projectNum)}　${esc(pInfo.customer_name || '')}</div>
        ${pInfo.project_details ? `<div style="font-size:15px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        ${build2000FlowStepsHtml('assembly', 0, projectNum)}
        <hr class="section-divider">
        <div class="unit-list-wrap wrap-2000-grid">${rowsHtml}</div>
    `;
    document.getElementById('detail_footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeDetailModal()">${detailModalCloseButtonLabel()}</button>
    `;
}

// 2000番台：試運転フロー「機械一覧」モーダルの中身（工番レベル）。機械・ユニットは工程表の「試運転」タスクから
// 直接取得する（組立の機械一覧とは完全に独立。単位が食い違っても構わない）
async function renderTestRun2000FlowDetailBody(projectNum) {
    const { data: reqs } = await db.from('approval_requests')
        .select('*, approval_steps(id, step_order, approver_role, approver_id, status)')
        .eq('project_number', projectNum).eq('flow_type', 'test_run');

    const { data: taskRows } = await db.from('tasks')
        .select('machine, unit, text, end_date, is_completed')
        .eq('project_number', projectNum).in('text', ['試運転', '工場出荷'])
        .not('machine', 'is', null);

    // 機械・ユニットの組み合わせ一覧（出現順、重複無し）と、その組み合わせの試運転タスク情報（期日判定用）
    const pairs = [];
    const taskInfoByPair = {};
    (taskRows || []).filter(t => t.text === '試運転').forEach(t => {
        const unit = normalizeTestRunUnit(t.unit);
        if (!pairs.some(p => p.machine === t.machine && p.unit === unit)) pairs.push({ machine: t.machine, unit });
        const key = `${t.machine}__${unit}`;
        const existing = taskInfoByPair[key];
        if (!existing || (t.end_date && (!existing.end_date || t.end_date < existing.end_date))) {
            taskInfoByPair[key] = { end_date: t.end_date, is_completed: t.is_completed };
        }
    });
    // 表示する「工場出荷予定日」は試運転タスクの終了日ではなく、同一工番・同一機械名の
    // 「工場出荷」タスクの終了日を使う（工場出荷タスクが無ければ不明扱い＝build2000TestRunRowHtml側で表示）
    const shipDateByMachine = {};
    (taskRows || []).filter(t => t.text === '工場出荷').forEach(t => {
        if (t.end_date && (!shipDateByMachine[t.machine] || t.end_date < shipDateByMachine[t.machine])) {
            shipDateByMachine[t.machine] = t.end_date;
        }
    });

    // 表示順は工場出荷予定日の昇順（不明は末尾）。同じ出荷日・出荷日不明同士は機械名・ユニット名順で安定させる
    pairs.sort((a, b) => {
        const da = shipDateByMachine[a.machine] || '9999-99-99';
        const db_ = shipDateByMachine[b.machine] || '9999-99-99';
        if (da !== db_) return da < db_ ? -1 : 1;
        return a.machine === b.machine ? a.unit.localeCompare(b.unit) : a.machine.localeCompare(b.machine);
    });

    // 申請者名をまとめて取得（一覧に申請者・申請日を直接表示するため）
    const requesterIds = [...new Set((reqs || []).map(r => r.requester_id).filter(Boolean))];
    const requesterNames = {};
    if (requesterIds.length > 0) {
        const { data: prs } = await db.from('profiles').select('id, name').in('id', requesterIds);
        (prs || []).forEach(p => { requesterNames[p.id] = p.name; });
    }
    const ctx = { canApply: canApplyFlow('test_run'), myRole: getEffectiveRole(), requesterNames, meta: SHEET_FLOW_META['test_run'] };

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
    const isOverdue = (machine, unit, activeReq) => {
        if (activeReq) return activeReq.status === 'submitted' || activeReq.status === 'in_review';
        const info = taskInfoByPair[`${machine}__${unit}`];
        return !!(info && !info.is_completed && info.end_date && info.end_date < todayStr);
    };

    const rowsHtml = pairs.map(({ machine, unit }) => {
        const pairReqs = (reqs || []).filter(r => testRunReqMatchesUnit(r, machine, unit));
        const myDraft = pairReqs.find(r => r.status === 'draft' && r.requester_id === currentUser.id);
        const activeReq = pairReqs.find(r => r.status !== 'draft');
        return build2000TestRunRowHtml(projectNum, machine, unit, activeReq, myDraft, shipDateByMachine[machine], isOverdue(machine, unit, activeReq), ctx);
    }).join('') || '<div style="padding:8px 0;color:#999;font-size:14px;">試運転タスクが工程表にありません</div>';

    const pInfo = projectsMap[projectNum] || {};
    document.getElementById('detail_title').textContent = '試運転フロー';
    document.getElementById('detail_body').innerHTML = `
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f;">${esc(projectNum)}　${esc(pInfo.customer_name || '')}</div>
        ${pInfo.project_details ? `<div style="font-size:15px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        ${build2000FlowStepsHtml('test_run', 0, projectNum)}
        <hr class="section-divider">
        <div class="unit-list-wrap wrap-2000-grid">${rowsHtml}</div>
    `;
    document.getElementById('detail_footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeDetailModal()">${detailModalCloseButtonLabel()}</button>
    `;
}

// ===== 組立(assembly) 詳細モーダル =====
// 丸クリック→詳細画面表示→チェックシートを入力する→機械・ユニットを入力→詳細画面に戻る→
// 申請するボタンを押す→（承認後）完了ボタン表示→押すと組立フローを完了にできる、という流れをこのモーダル内で完結させる
async function openAssemblyFlowDetailModal(projectNum) {
    document.getElementById('detail_modal').classList.add('open');
    // 機械詳細（wide-machine-detail、2000番台のみ）から一覧に戻るケースがあるため、幅を通常サイズに戻す
    document.querySelector('#detail_modal .modal')?.classList.remove('wide-machine-detail');
    document.getElementById('detail_body').innerHTML   = '<div class="loading-indicator">読み込み中...</div>';
    document.getElementById('detail_footer').innerHTML = '<button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>';
    ui.send('OPEN_DETAIL');
    currentAssemblyDetailProjectNum = projectNum;
    currentAssemblyMachineDetail = null;
    assemblyDetailReturnProjectNum = null;
    assemblyDetailReturnMachine = null;
    await renderAssemblyFlowDetailBody(projectNum);
}

// 2000番台：機械ごとのユニット申請状況一覧モーダル。標準リスト由来の固定ユニット＋自由入力で追加されたユニットを
// 1つの画面にまとめ、ユニットごとの申請状況・申請操作・「不要にする」操作をここで行う
async function openAssemblyMachineDetailModal(projectNum, machine) {
    document.getElementById('detail_modal').classList.add('open');
    document.querySelector('#detail_modal .modal')?.classList.add('wide-machine-detail');
    document.getElementById('detail_body').innerHTML   = '<div class="loading-indicator">読み込み中...</div>';
    document.getElementById('detail_footer').innerHTML = '<button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>';
    ui.send('OPEN_DETAIL');
    currentAssemblyDetailProjectNum = null;
    currentAssemblyMachineDetail = { projectNum, machine };
    // この機械詳細は必ず組立の機械一覧モーダル（2000番台のみ）から開くため、閉じたら一覧に戻る
    assemblyDetailReturnProjectNum = projectNum;
    assemblyDetailReturnMachine = null;
    await renderAssemblyMachineDetailBody(projectNum, machine);
}

async function renderAssemblyFlowDetailBody(projectNum) {
    // 2000番台：機械ごとの一覧（一覧カードの「組立申請はこちら→」ボタンから開く）は専用の描画に切り替える
    if (is2000sSeries(projectNum)) {
        await renderAssembly2000FlowDetailBody(projectNum);
        return;
    }
    const { data: reqs } = await db.from('approval_requests')
        .select('*, approval_steps(id, step_order, approver_role, approver_id, status)')
        .eq('project_number', projectNum).eq('flow_type', 'assembly')
        .order('created_at', { ascending: true });

    // 電気艤装タスクがある機械は、この画面内に「電装」セクションも合わせて表示する
    const { data: elecReqs } = await db.from('approval_requests')
        .select('*, approval_steps(id, step_order, approver_role, approver_id, status)')
        .eq('project_number', projectNum).eq('flow_type', 'electrical')
        .order('created_at', { ascending: true });

    // 工程表(tasks)からその工番の機械・ユニット一覧を取得し、まだ申請されていない組み合わせを「未申請」として表示する
    const { data: taskRows } = await db.from('tasks')
        .select('machine, unit')
        .eq('project_number', projectNum)
        .eq('text', '機械組立')
        .not('machine', 'is', null);
    const taskPairMap = {};
    (taskRows || []).forEach(t => {
        const m = (t.machine || '').trim();
        if (!m) return;
        const u = (t.unit || '').trim();
        taskPairMap[`${m}__${u}`] = { machine: m, unit: u || null };
    });

    // 電気艤装タスクがある機械の一覧（未申請の電装機械を洗い出すため）
    const { data: elecTaskRows } = await db.from('tasks')
        .select('machine')
        .eq('project_number', projectNum)
        .eq('text', '電気艤装')
        .not('machine', 'is', null);
    const elecMachines = [...new Set((elecTaskRows || []).map(t => (t.machine || '').trim()).filter(Boolean))];

    const pInfo = projectsMap[projectNum] || {};

    // 申請者名をまとめて取得（一覧に申請者・申請日を直接表示するため）
    const requesterIds = [...new Set([...(reqs || []), ...(elecReqs || [])].map(r => r.requester_id).filter(Boolean))];
    const requesterNames = {};
    if (requesterIds.length > 0) {
        const { data: prs } = await db.from('profiles').select('id, name').in('id', requesterIds);
        (prs || []).forEach(p => { requesterNames[p.id] = p.name; });
    }

    // 申請(下書き含む)単位でグループ化する。1申請=複数機械・ユニットをまとめられるため、
    // 機械・ユニット単位の行ではなく申請単位の行として表示し、同じ工番に複数の下書きが並行してあっても良い
    const groups = (reqs || []).map(req => ({
        req,
        items: getAssemblyItemsForReq(req).filter(it => it && it.machine)
    }));

    const myRole = getEffectiveRole();
    const meta = SHEET_FLOW_META['assembly'];
    const canApply = canApplyFlow('assembly');

    // 工程表由来の機械・ユニットのうち、いずれの申請（下書き含む）にも含まれていないものを「未申請」として表示する
    const appliedPairKeys = new Set();
    groups.forEach(g => g.items.forEach(it => appliedPairKeys.add(`${it.machine}__${(it.unit || '').trim()}`)));
    const unappliedPairs = Object.values(taskPairMap)
        .filter(p => !appliedPairKeys.has(`${p.machine}__${(p.unit || '')}`))
        .sort((a, b) => (a.machine + (a.unit || '')).localeCompare(b.machine + (b.unit || '')));

    const unappliedRowsHtml = unappliedPairs.map(p => {
        const label = p.unit ? `${p.machine}${p.unit}` : p.machine;
        const linkHtml = canApply
            ? `<span class="unit-list-link" style="cursor:pointer;" onclick="startNewAssemblyPairSheetFromDetail('${esc(projectNum)}', '${esc(p.machine)}', '${esc(p.unit || '')}')">申請する →</span>`
            : '';
        return `<div class="unit-list-row">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div class="unit-list-name">${esc(label)}</div>
                <div class="unit-list-status"><span class="status-badge s-gray">未申請</span></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;">
                <div>${linkHtml}</div>
                <div></div>
            </div>
        </div>`;
    }).join('');

    const existingRowsHtml = groups.length === 0
        ? ''
        : groups.map(g => {
            const cls = STATUS_CLASSES[g.req.status] || 's-gray';
            const label = isSavedDraft(g.req) ? '下書き' : (g.req.status === 'draft' ? '未申請' : statusBadgeLabel(g.req));
            const machineLabel = g.items.length > 0
                ? g.items.map(it => (it.unit && it.unit !== '-') ? `${it.machine}${it.unit}` : it.machine).join('、')
                : '（機械未入力）';
            const isOwnDraft = g.req.status === 'draft' && g.req.requester_id === currentUser.id;

            if (isOwnDraft) {
                // 一時保存（sheet_saved_at）される前は中身が空の可能性が高いため、申請・削除ボタンは
                // 一時保存済み（isSavedDraft）になって初めて表示する。未保存の間はリンクのみ（同じ下書きを開き直す）
                const savedOnce = isSavedDraft(g.req);
                const submitBtn = (savedOnce && g.items.length > 0)
                    ? `<button class="btn-apply-xs" onclick="submitAssemblyDraftFromDetail('${g.req.id}', '${esc(projectNum)}')">申請する</button>`
                    : '';
                const deleteBtn = savedOnce
                    ? `<button class="btn-delete-xs" title="削除" onclick="deleteAssemblyDraftFromDetail('${g.req.id}', '${esc(projectNum)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>`
                    : '';
                const reopenLinkLabel = savedOnce ? '続きを入力する →' : '申請する →';
                return `<div class="unit-list-row">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                        <div class="unit-list-name">${esc(machineLabel)}</div>
                        <div class="unit-list-status"><span class="status-badge ${cls}">${esc(label)}</span></div>
                    </div>
                    <div class="unit-list-row-actions" style="justify-content:space-between;">
                        <span class="unit-list-link" style="cursor:pointer;" onclick="reopenAssemblySheetFromDetail('${g.req.id}')">${reopenLinkLabel}</span>
                        <div style="display:flex;gap:8px;align-items:center;">
                            ${submitBtn}
                            ${deleteBtn}
                        </div>
                    </div>
                </div>`;
            }

            // 申請者・申請日を一覧に直接表示する（個別詳細画面を経由させないため）
            const requesterName = requesterNames[g.req.requester_id] || '—';
            const submittedDate = g.req.created_at ? fmtDate(g.req.created_at) : '—';

            // チェックシート/完了報告書へのリンク（承認済みなら報告書、却下されたら組立申請権限を持つ人なら誰でも編集可能）
            // 申請者本人が不在でも組立部門の他のメンバーが修正・再申請できるよう、申請権限(canApply)は申請者本人と同じ基準にする
            // 承認済みでもペンディング項目が未完了で残っている場合は、報告書へ直接飛ばさず申請詳細（完了操作可能）を開く
            const isApproved = g.req.status === 'approved';
            const canEditRejected = g.req.status === 'rejected' && (g.req.requester_id === currentUser.id || canApply);
            const unresolvedPendingCount = countUnresolvedPendingItems(g.req);
            const hasUnresolvedPending = isApproved && unresolvedPendingCount > 0;
            const sheetUrl = canEditRejected ? `${meta.file}?draft_id=${g.req.id}` : `${meta.file}?view=1&id=${g.req.id}`;
            const sheetLinkLabel = hasUnresolvedPending ? `⚠ ペンディング項目あり(${unresolvedPendingCount}件) →`
                : isApproved ? '完了報告書を見る →' : (canEditRejected ? 'チェックシートを修正する →' : 'チェックシートを見る →');
            const sheetLinkOnclick = hasUnresolvedPending
                ? `viewAssemblyRequestDetail('${g.req.id}', '${esc(projectNum)}')`
                : `window.open('${sheetUrl}', '_blank')`;

            // 自分が承認できる保留中ステップがあれば、その場で承認・却下できるようにする
            // （却下は頻度が低いため理由入力欄は常時表示せず、却下ボタンを押した時だけ別モーダルで入力させる）
            const myStep = (g.req.approval_steps || []).find(s =>
                (s.approver_role === myRole || isSuperAdmin()) && s.status === 'pending' && g.req.status === 'submitted');

            const approvalHtml = myStep ? `
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                    <button class="btn btn-danger"  style="font-size:13px;padding:5px 14px;" onclick="showAssemblyRejectPrompt('${g.req.id}', '${myStep.id}', '${esc(projectNum)}')">却下する</button>
                    <button class="btn btn-success" style="font-size:13px;padding:5px 14px;" onclick="approveAssemblyRequestFromList('${g.req.id}', '${myStep.id}', ${myStep.step_order}, '${esc(projectNum)}', '${esc(machineLabel)}')">承認する</button>
                </div>` : '';

            return `<div class="unit-list-row">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
                        <div class="unit-list-name">${esc(machineLabel)}</div>
                        <div class="unit-list-meta" style="margin-top:0;">申請者: ${esc(requesterName)}　申請日: ${esc(submittedDate)}</div>
                    </div>
                    <div class="unit-list-status"><span class="status-badge ${cls}">${esc(label)}</span></div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;">
                    <div class="unit-list-link" style="cursor:pointer;" onclick="${sheetLinkOnclick}">${sheetLinkLabel}</div>
                    <div></div>
                </div>
                ${approvalHtml}
            </div>`;
        }).join('');

    const rowsHtml = unappliedRowsHtml + existingRowsHtml || '<div style="padding:8px 0;color:#999;font-size:14px;">組立の申請はまだありません</div>';

    // 2000番以外は1工番につき1回しか申請しないため、「一覧にない機械・ユニットを申請する」ボタンは表示しない
    // （このボタンのマークアップ・関数・CSSは2000番完了報告側での再利用のためそのまま残してある）
    const actionHtml = '';

    // ===== 電装セクション（電気艤装タスクがある機械のみ表示） =====
    const canApplyElec = canApplyFlow('electrical');
    const elecAppliedMachines = new Set((elecReqs || []).map(r => r.machine_name).filter(Boolean));
    const elecUnappliedMachines = elecMachines.filter(m => !elecAppliedMachines.has(m));

    const elecUnappliedRowsHtml = elecUnappliedMachines.map(m => {
        const linkHtml2 = canApplyElec
            ? `<span class="unit-list-link" style="cursor:pointer;" onclick="startNewElectricalSheetFromDetail('${esc(projectNum)}', '${esc(m)}')">申請する →</span>`
            : '';
        return `<div class="unit-list-row">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div class="unit-list-name">${esc(m)}</div>
                <div class="unit-list-status"><span class="status-badge s-gray">未申請</span></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;">
                <div>${linkHtml2}</div>
                <div></div>
            </div>
        </div>`;
    }).join('');

    const elecExistingRowsHtml = (elecReqs || []).map(req => {
        const cls = STATUS_CLASSES[req.status] || 's-gray';
        const label = isSavedDraft(req) ? '下書き' : (req.status === 'draft' ? '未申請' : statusBadgeLabel(req));
        const machineLabel = req.machine_name || '（機械未入力）';
        const isOwnDraft = req.status === 'draft' && req.requester_id === currentUser.id;

        if (isOwnDraft) {
            const savedOnce = isSavedDraft(req);
            const reopenLinkLabel = savedOnce ? '続きを入力する →' : '申請する →';
            const actionBtnsHtml = savedOnce ? `
                        <button class="btn-apply-xs" onclick="submitElectricalDraftFromDetail('${req.id}', '${esc(projectNum)}')">申請する</button>
                        <button class="btn-delete-xs" title="削除" onclick="deleteElectricalDraftFromDetail('${req.id}', '${esc(projectNum)}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>` : '';
            return `<div class="unit-list-row">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div class="unit-list-name">${esc(machineLabel)}</div>
                    <div class="unit-list-status"><span class="status-badge ${cls}">${esc(label)}</span></div>
                </div>
                <div class="unit-list-row-actions" style="justify-content:space-between;">
                    <span class="unit-list-link" style="cursor:pointer;" onclick="reopenElectricalSheetFromDetail('${req.id}')">${reopenLinkLabel}</span>
                    <div style="display:flex;gap:8px;align-items:center;">
                        ${actionBtnsHtml}
                    </div>
                </div>
            </div>`;
        }

        const requesterName = requesterNames[req.requester_id] || '—';
        const submittedDate = req.created_at ? fmtDate(req.created_at) : '—';
        const isApproved = req.status === 'approved';
        const canEditRejected = req.status === 'rejected' && (req.requester_id === currentUser.id || canApplyFlow('electrical'));
        const unresolvedPendingCount = countUnresolvedPendingItems(req);
        const hasUnresolvedPending = isApproved && unresolvedPendingCount > 0;
        const sheetUrl = canEditRejected ? `${SHEET_FLOW_META.electrical.file}?draft_id=${req.id}` : `${SHEET_FLOW_META.electrical.file}?view=1&id=${req.id}`;
        const sheetLinkLabel = hasUnresolvedPending ? `⚠ ペンディング項目あり(${unresolvedPendingCount}件) →`
            : isApproved ? '完了報告書を見る →' : (canEditRejected ? 'チェックシートを修正する →' : 'チェックシートを見る →');
        const sheetLinkOnclick = hasUnresolvedPending
            ? `viewAssemblyRequestDetail('${req.id}', '${esc(projectNum)}')`
            : `window.open('${sheetUrl}', '_blank')`;

        // 承認・却下ボタンは組立と共通の処理（approveAssemblyRequestFromList等）をそのまま流用する。
        // request_id/step_id起点で動く汎用ロジックのため、flow_typeがelectricalでも問題なく動作する
        const myStep = (req.approval_steps || []).find(s =>
            (s.approver_role === myRole || isSuperAdmin()) && s.status === 'pending' && req.status === 'submitted');
        const approvalHtml = myStep ? `
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button class="btn btn-danger"  style="font-size:13px;padding:5px 14px;" onclick="showAssemblyRejectPrompt('${req.id}', '${myStep.id}', '${esc(projectNum)}')">却下する</button>
                <button class="btn btn-success" style="font-size:13px;padding:5px 14px;" onclick="approveAssemblyRequestFromList('${req.id}', '${myStep.id}', ${myStep.step_order}, '${esc(projectNum)}', '${esc(machineLabel)}')">承認する</button>
            </div>` : '';

        return `<div class="unit-list-row">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
                    <div class="unit-list-name">${esc(machineLabel)}</div>
                    <div class="unit-list-meta" style="margin-top:0;">申請者: ${esc(requesterName)}　申請日: ${esc(submittedDate)}</div>
                </div>
                <div class="unit-list-status"><span class="status-badge ${cls}">${esc(label)}</span></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;">
                <div class="unit-list-link" style="cursor:pointer;" onclick="${sheetLinkOnclick}">${sheetLinkLabel}</div>
                <div></div>
            </div>
            ${approvalHtml}
        </div>`;
    }).join('');

    const elecRowsHtml = elecUnappliedRowsHtml + elecExistingRowsHtml;
    const showElecSection = elecMachines.length > 0 || (elecReqs || []).length > 0;
    const elecSectionHtml = showElecSection ? `
        <hr class="section-divider">
        <div class="section-title">電装 申請状況</div>
        <div class="unit-list-wrap unit-list-wrap-wide">${elecRowsHtml || '<div style="padding:8px 0;color:#999;font-size:14px;">電装の申請はまだありません</div>'}</div>
    ` : '';

    // 試運転準備チェック（試運転タスクがある工事番号のみ・工事番号ごとに1組）
    // 電気艤装タスクがあれば組立・電装で別々にチェックし、両方揃って初めて試運転担当者へ通知する
    let testRunReadinessHtml = '';
    if (testRunProjectNums.has(projectNum)) {
        const { data: ownerTasks } = await db.from('tasks').select('text, owner')
            .eq('project_number', projectNum).in('text', ['機械組立', '電気艤装']);
        const kumitateOwnerNames = [...new Set((ownerTasks || []).filter(t => t.text === '機械組立').flatMap(t => splitOwnerNames(t.owner)))];
        const denkiTasks         = (ownerTasks || []).filter(t => t.text === '電気艤装');
        const hasElecTask        = denkiTasks.length > 0;
        const denkiOwnerNames    = [...new Set(denkiTasks.flatMap(t => splitOwnerNames(t.owner)))];

        const { data: readinessRows } = await db.from('test_run_readiness')
            .select('kind, is_ready').eq('project_number', projectNum).eq('machine', '').eq('unit', '');
        const asmReady  = !!(readinessRows || []).find(r => r.kind === 'assembly')?.is_ready;
        const elecReady = !!(readinessRows || []).find(r => r.kind === 'electrical')?.is_ready;

        const canEditAssembly   = isSuperAdmin() || (!!currentProfile?.name && kumitateOwnerNames.includes(currentProfile.name));
        const canEditElectrical = isSuperAdmin() || (!!currentProfile?.name && denkiOwnerNames.includes(currentProfile.name));

        testRunReadinessHtml = buildTestRunReadinessSectionHtml(projectNum, '', '', asmReady, elecReady, hasElecTask, canEditAssembly, canEditElectrical);
    }

    document.getElementById('detail_title').textContent = '組立フロー';
    document.getElementById('detail_body').innerHTML = `
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f;">${esc(projectNum)}　${esc(pInfo.customer_name || '')}</div>
        ${pInfo.project_details ? `<div style="font-size:15px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        <hr class="section-divider">
        <div class="section-title">組立 申請状況</div>
        <div class="unit-list-wrap unit-list-wrap-wide">${rowsHtml}</div>
        ${actionHtml}
        ${elecSectionHtml}
        ${testRunReadinessHtml}
    `;
    document.getElementById('detail_footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
    `;
}

// presetItemsを指定すると新規下書きにその機械・ユニットを事前セットする（2000番台の機械詳細モーダルから使用）。
// machineを指定すると、完了後に工番レベルではなく機械レベルの詳細モーダルを再描画する
// assemblyMode: 2000番台のチェックシート側の入力制限を切り替えるためのフラグ（sheet_data.metaに保存し、sheet.html側で参照する）
//   'fixed' … 固定ユニットリストの「申請する→」から開始。機械・ユニットとも変更不可、1件のみ
//   'free'  … 「一覧にないユニットを申請する」から開始。機械は固定、ユニットは自由入力・複数追加可
//   null    … 従来通り（非2000番、または旧仕様の下書き）。全項目編集可
async function startNewAssemblySheetFromDetail(projectNum, presetItems = null, machine = null, assemblyMode = null) {
    // 同じ工番・同じ申請者でも、複数の下書きを同時に保持できる（機械・ユニットをまとめて申請したい場合と、
    // 別々に分けて申請したい場合の両方に対応するため、押すたびに新しい下書きを作成する）
    const insertPayload = {
        project_number: projectNum,
        flow_type:      'assembly',
        status:         'draft',
        requester_id:   currentUser.id
    };
    if (presetItems) insertPayload.assembly_items = presetItems;
    if (assemblyMode) insertPayload.sheet_data = { meta: { assembly_mode: assemblyMode, assembly_locked_machine: machine } };
    const { data: newDraft, error } = await db.from('approval_requests').insert(insertPayload).select().single();
    if (error) { showToast('下書きの作成に失敗しました: ' + error.message, 'error'); return; }
    const draftId = newDraft.id;
    window.open(`sheet.html?draft_id=${draftId}`, '_blank');
    await loadMineSide();
    if (machine) await renderAssemblyMachineDetailBody(projectNum, machine);
    else await renderAssemblyFlowDetailBody(projectNum);
}

// 2000番台：固定ユニットリストの行から申請する場合の薄いラッパー（機械・ユニットとも固定＝チェックシート側で編集不可にする）
async function startNewAssemblyUnitSheetFromDetail(projectNum, machine, unit) {
    await startNewAssemblySheetFromDetail(projectNum, [{ machine, unit: unit || null }], machine, 'fixed');
}

// 2000番台：「一覧にないユニットを申請する」から開始する薄いラッパー（機械は固定、ユニットは自由入力・複数追加可）
async function startNewAssemblyFreeUnitSheetFromDetail(projectNum, machine) {
    await startNewAssemblySheetFromDetail(projectNum, [{ machine, unit: null }], machine, 'free');
}

// 工番レベルの一覧（2000番以外）で、工程表由来の未申請の機械・ユニットから直接申請を開始する薄いラッパー
async function startNewAssemblyPairSheetFromDetail(projectNum, machine, unit) {
    await startNewAssemblySheetFromDetail(projectNum, [{ machine, unit: unit || null }]);
}

function reopenAssemblySheetFromDetail(requestId) {
    window.open(`sheet.html?draft_id=${requestId}`, '_blank');
}

async function viewAssemblyRequestDetail(requestId, projectNum, machine = null) {
    // 「戻る」を押したら組立フロー詳細（工番レベル or 機械レベル）に戻れるようにする（戻り先はopenDetailModal側でセットする）
    currentAssemblyDetailProjectNum = null;
    currentAssemblyMachineDetail = null;
    await openDetailModal(requestId, { type: 'assembly', projectNum, machine });
}

async function viewTestRunRequestDetail(requestId, projectNum, machine = null) {
    // 「戻る」を押したら試運転フロー詳細（工番レベル or 機械レベル）に戻れるようにする（戻り先はopenDetailModal側でセットする）
    currentTestRunDetailProjectNum = null;
    currentTestRunMachineDetail = null;
    await openDetailModal(requestId, { type: 'test_run', projectNum, machine });
}

async function submitAssemblyDraftFromDetail(draftId, projectNum, machine = null) {
    showLoading('処理中...');
    try {
        const { data: draftReq } = await db.from('approval_requests')
            .select('assembly_items, sheet_data').eq('id', draftId).single();
        const items = (draftReq?.assembly_items || []).filter(it => it && it.machine);
        if (items.length === 0) {
            showToast('機械を1件以上入力してください（チェックシート内）', 'error');
            return;
        }
        const checkItems = draftReq?.sheet_data?.check_items || {};
        const missingItems = ASSEMBLY_REQUIRED_ITEM_IDS.filter(id => !checkItems[id]?.result);
        if (missingItems.length > 0 || !draftReq?.sheet_data?.meta?.completion_date) {
            showToast('チェックシートの必須項目・組立完了日が未入力です。チェックシートを開いて入力してください。', 'error');
            return;
        }

        const submitterRole = getEffectiveRole();
        const { data: req, error: e1 } = await db.from('approval_requests').update({
            status:         'submitted',
            machine_name:   buildAssemblyMachineNameSummary(items),
            test_run:       null,
            has_inspection: null
        }).eq('id', draftId).select().single();
        if (e1) throw e1;

        let stepsToInsert, notifyRoles;
        if (submitterRole === 'assembly_manager') {
            stepsToInsert = [{ request_id: req.id, step_order: 1, approver_role: 'assembly_director', status: 'pending' }];
            notifyRoles = ['assembly_director'];
        } else {
            stepsToInsert = [
                { request_id: req.id, step_order: 1, approver_role: 'assembly_manager',  status: 'pending' },
                { request_id: req.id, step_order: 2, approver_role: 'assembly_director', status: 'pending' }
            ];
            notifyRoles = ['assembly_manager', 'assembly_director'];
        }
        await db.from('approval_steps').insert(stepsToInsert);
        for (const role of notifyRoles) {
            const { data: approvers } = await db.from('profiles').select('id').eq('role', role);
            if (approvers?.length > 0) {
                await db.from('approval_notifications').insert(
                    approvers.map(a => ({ request_id: req.id, recipient_id: a.id, notification_type: 'approval_request' }))
                );
            }
        }

        await refreshAll();
        showToast(`組立完了を申請しました（機械${items.length}件）。`, 'success');
        if (machine) await renderAssemblyMachineDetailBody(projectNum, machine);
        else await renderAssemblyFlowDetailBody(projectNum);
    } catch (e) {
        showToast('申請に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteAssemblyDraftFromDetail(draftId, projectNum, machine = null) {
    if (!confirm('この下書きを削除します。よろしいですか？')) return;
    showLoading('削除中...');
    try {
        const { error } = await db.from('approval_requests').delete().eq('id', draftId).eq('status', 'draft');
        if (error) throw error;
        await refreshAll();
        showToast('下書きを削除しました。', 'success');
        if (machine) await renderAssemblyMachineDetailBody(projectNum, machine);
        else await renderAssemblyFlowDetailBody(projectNum);
    } catch (e) {
        showToast('削除に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== 組立フロー詳細モーダル内の電装セクション：新規下書き作成〜申請確定〜削除 =====
// 電装(electrical)は組立と違いユニット概念が無く機械単位1申請のため、assembly版より単純な構成にしている
async function startNewElectricalSheetFromDetail(projectNum, machine) {
    const { data: newDraft, error } = await db.from('approval_requests').insert({
        project_number: projectNum,
        machine_name:   machine,
        flow_type:      'electrical',
        status:         'draft',
        requester_id:   currentUser.id
    }).select().single();
    if (error) { showToast('下書きの作成に失敗しました: ' + error.message, 'error'); return; }
    window.open(`${SHEET_FLOW_META.electrical.file}?draft_id=${newDraft.id}`, '_blank');
    await loadMineSide();
    await renderAssemblyFlowDetailBody(projectNum);
}

function reopenElectricalSheetFromDetail(requestId) {
    window.open(`${SHEET_FLOW_META.electrical.file}?draft_id=${requestId}`, '_blank');
}

// 2000番台：機械詳細モーダルの電装ユニット申請（組立のstartNewAssemblySheetFromDetailと同型）。
// electricalMode: 'fixed'（固定ユニット、機械・ユニットとも変更不可、1件のみ）| 'free'（ユニット自由入力・複数追加可）
async function startNewElectricalUnitSheetFromDetailCore(projectNum, presetItems, machine, electricalMode) {
    const insertPayload = {
        project_number: projectNum,
        flow_type:      'electrical',
        status:         'draft',
        requester_id:   currentUser.id,
        assembly_items: presetItems,
        sheet_data:     { meta: { assembly_mode: electricalMode, assembly_locked_machine: machine } }
    };
    const { data: newDraft, error } = await db.from('approval_requests').insert(insertPayload).select().single();
    if (error) { showToast('下書きの作成に失敗しました: ' + error.message, 'error'); return; }
    window.open(`${SHEET_FLOW_META.electrical.file}?draft_id=${newDraft.id}`, '_blank');
    await loadMineSide();
    await renderAssemblyMachineDetailBody(projectNum, machine);
}

async function startNewElectricalUnitSheetFromDetail(projectNum, machine, unit) {
    await startNewElectricalUnitSheetFromDetailCore(projectNum, [{ machine, unit: unit || null }], machine, 'fixed');
}

async function startNewElectricalFreeUnitSheetFromDetail(projectNum, machine) {
    await startNewElectricalUnitSheetFromDetailCore(projectNum, [{ machine, unit: null }], machine, 'free');
}

async function submitElectricalDraftFromDetail(draftId, projectNum, machine = null) {
    showLoading('処理中...');
    try {
        const { data: draftReq } = await db.from('approval_requests')
            .select('machine_name, unit_name, assembly_items, sheet_data').eq('id', draftId).single();
        const items = getAssemblyItemsForReq(draftReq || {}).filter(it => it && it.machine);
        if (items.length === 0) {
            showToast('機械が未設定です。', 'error');
            return;
        }
        const checkItems = draftReq?.sheet_data?.check_items || {};
        const missingItems = ELECTRICAL_REQUIRED_ITEM_IDS.filter(id => !checkItems[id]?.result);
        if (missingItems.length > 0 || !draftReq?.sheet_data?.meta?.completion_date) {
            showToast('チェックシートの必須項目・完了日が未入力です。チェックシートを開いて入力してください。', 'error');
            return;
        }

        const { data: req, error: e1 } = await db.from('approval_requests').update({
            status:       'submitted',
            machine_name: buildAssemblyMachineNameSummary(items)
        }).eq('id', draftId).select().single();
        if (e1) throw e1;

        // 電装: 課長相当のロールが無いため、常に組立部長の単一ステップ（submitRequest()のelectricalケースと同じ）
        await db.from('approval_steps').insert(
            [{ request_id: req.id, step_order: 1, approver_role: 'assembly_director', status: 'pending' }]
        );
        const { data: approvers } = await db.from('profiles').select('id').eq('role', 'assembly_director');
        if (approvers?.length > 0) {
            await db.from('approval_notifications').insert(
                approvers.map(a => ({ request_id: req.id, recipient_id: a.id, notification_type: 'approval_request' }))
            );
        }

        await refreshAll();
        showToast('電装完了を申請しました。', 'success');
        if (machine) await renderAssemblyMachineDetailBody(projectNum, machine);
        else await renderAssemblyFlowDetailBody(projectNum);
    } catch (e) {
        showToast('申請に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteElectricalDraftFromDetail(draftId, projectNum, machine = null) {
    if (!confirm('この下書きを削除します。よろしいですか？')) return;
    showLoading('削除中...');
    try {
        const { error } = await db.from('approval_requests').delete().eq('id', draftId).eq('status', 'draft');
        if (error) throw error;
        await refreshAll();
        showToast('下書きを削除しました。', 'success');
        if (machine) await renderAssemblyMachineDetailBody(projectNum, machine);
        else await renderAssemblyFlowDetailBody(projectNum);
    } catch (e) {
        showToast('削除に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== 2000番台：機械ごとのユニット申請状況一覧 =====
// 組立・電装共通：機械詳細モーダルの「ユニット別申請状況」1列分のHTML行を生成する。
// flow種別ごとの差異（テーブル名・関数名・SHEET_FLOW_META）はopts経由で渡し、承認・却下・ステータス判定ロジックは完全共有する
function buildMachineUnitRowsHtml(opts) {
    const { projectNum, machine, units, reqs, notRequiredUnits, meta, myRole, canApply, requesterNames,
            startUnitFnName, submitFnName, deleteFnName, toggleFnName, reopenFnName,
            hasTestRunTask, readinessKind, readinessMap, ownerByUnit } = opts;

    if (units.length === 0) return '<div style="padding:8px 0;color:#999;font-size:14px;">ユニットがありません</div>';

    return units.map(unit => {
        const unitLabel = unit ? unit : machine;
        const isNotRequired = notRequiredUnits.has(unit || '');

        const matching = (reqs || []).filter(req =>
            getAssemblyItemsForReq(req).some(it => it && it.machine === machine && (it.unit || '') === (unit || '')));
        const myDraft = matching.find(r => r.status === 'draft' && r.requester_id === currentUser.id);
        const activeReq = matching.find(r => r.status !== 'draft');

        let statusLabel, statusCls;
        if (isNotRequired)         { statusLabel = '不要';   statusCls = 's-gray'; }
        else if (activeReq)        { statusLabel = statusBadgeLabel(activeReq); statusCls = STATUS_CLASSES[activeReq.status] || 's-gray'; }
        else if (isSavedDraft(myDraft)) { statusLabel = '下書き'; statusCls = 's-gray'; }
        else                       { statusLabel = '未申請'; statusCls = 's-gray'; }

        let toggleHtml = '';
        if (canApply && !(activeReq && activeReq.status === 'approved')) {
            toggleHtml = `
                <label class="unit-toggle" title="不要にする">
                    <input type="checkbox" ${isNotRequired ? 'checked' : ''} onchange="${toggleFnName}('${esc(projectNum)}', '${esc(machine)}', '${esc(unit)}', this.checked)">
                    <span class="unit-toggle-slider"></span>
                    <span class="unit-toggle-text">${isNotRequired ? 'OFF' : 'ON'}</span>
                </label>`;
        }

        let metaHtml = '';
        let linkHtml = '';
        let approvalHtml = '';
        let bottomRightHtml = toggleHtml;

        if (activeReq) {
            // 承認済み→完了報告書へ、それ以外→チェックシート（自分の却下分なら修正モード）へ直接飛ぶ
            const requesterName = requesterNames[activeReq.requester_id] || '—';
            const submittedDate = activeReq.created_at ? fmtDate(activeReq.created_at) : '—';
            metaHtml = `<div class="unit-list-meta" style="margin-top:0;">申請者: ${esc(requesterName)}　申請日: ${esc(submittedDate)}</div>`;

            const isApproved = activeReq.status === 'approved';
            const canEditRejected = activeReq.status === 'rejected' && (activeReq.requester_id === currentUser.id || canApply);
            const unresolvedPendingCount = countUnresolvedPendingItems(activeReq);
            const hasUnresolvedPending = isApproved && unresolvedPendingCount > 0;
            const sheetUrl = canEditRejected ? `${meta.file}?draft_id=${activeReq.id}` : `${meta.file}?view=1&id=${activeReq.id}`;
            const sheetLinkLabel = hasUnresolvedPending ? `⚠ ペンディング項目あり(${unresolvedPendingCount}件) →`
                : isApproved ? '完了報告書を見る →' : (canEditRejected ? 'チェックシートを修正する →' : 'チェックシートを見る →');
            const sheetLinkOnclick = hasUnresolvedPending
                ? `viewAssemblyRequestDetail('${activeReq.id}', '${esc(projectNum)}', '${esc(machine)}')`
                : `window.open('${sheetUrl}', '_blank')`;
            linkHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="${sheetLinkOnclick}">${sheetLinkLabel}</span>`;

            const myStep = (activeReq.approval_steps || []).find(s =>
                (s.approver_role === myRole || isSuperAdmin()) && s.status === 'pending' && activeReq.status === 'submitted');
            const machineLabel = (unit && unit !== '-') ? `${machine}${unit}` : machine;
            approvalHtml = myStep ? `
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                    <button class="btn btn-danger"  style="font-size:13px;padding:5px 14px;" onclick="showAssemblyRejectPrompt('${activeReq.id}', '${myStep.id}', '${esc(projectNum)}', '${esc(machine)}')">却下する</button>
                    <button class="btn btn-success" style="font-size:13px;padding:5px 14px;" onclick="approveAssemblyRequestFromList('${activeReq.id}', '${myStep.id}', ${myStep.step_order}, '${esc(projectNum)}', '${esc(machineLabel)}', '${esc(machine)}')">承認する</button>
                </div>` : '';
        } else if (myDraft) {
            // 一時保存（sheet_saved_at）前は中身が空の可能性が高いため、申請・削除ボタンは
            // 一時保存済み（isSavedDraft）になって初めて表示する
            const savedOnce = isSavedDraft(myDraft);
            const hasItem = getAssemblyItemsForReq(myDraft).some(it => it && it.machine === machine && (it.unit || '') === (unit || ''));
            const reopenLinkLabel = savedOnce ? '続きを入力する →' : '申請する →';
            linkHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="${reopenFnName}('${myDraft.id}')">${reopenLinkLabel}</span>`;
            const submitBtn = (savedOnce && hasItem)
                ? `<button class="btn-apply-xs" onclick="${submitFnName}('${myDraft.id}', '${esc(projectNum)}', '${esc(machine)}')">申請する</button>`
                : '';
            const deleteBtn = savedOnce
                ? `<button class="btn-delete-xs" title="削除" onclick="${deleteFnName}('${myDraft.id}', '${esc(projectNum)}', '${esc(machine)}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>`
                : '';
            bottomRightHtml = `
                <div style="display:flex;gap:8px;align-items:center;">
                    ${submitBtn}
                    ${deleteBtn}
                    ${toggleHtml}
                </div>`;
        } else if (canApply && !isNotRequired) {
            linkHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="${startUnitFnName}('${esc(projectNum)}', '${esc(machine)}', '${esc(unit)}')">申請する →</span>`;
        }

        let readinessHtml = '';
        if (hasTestRunTask && !isNotRequired) {
            const ready = !!readinessMap?.get(`${unit || ''}__${readinessKind}`);
            const ownerNames = ownerByUnit?.get(unit || '');
            const canEditReadiness = isSuperAdmin() || (!!currentProfile?.name && !!ownerNames && ownerNames.has(currentProfile.name));
            readinessHtml = `
            <label style="display:flex; align-items:center; gap:6px; font-size:14px; font-family:inherit; font-weight:600; color:#3d4a5d; margin-top:8px; ${canEditReadiness ? 'cursor:pointer;' : 'opacity:.55;'}">
                <input type="checkbox" ${ready ? 'checked' : ''} ${canEditReadiness ? '' : 'disabled'} style="width:15px;height:15px;"
                    onchange="toggleTestRunReadiness('${esc(projectNum)}', '${esc(machine)}', '${esc(unit)}', '${readinessKind}', this.checked)">
                試運転準備: <span style="font-weight:bold; color:${ready ? '#1c8f4d' : '#999'};">${ready ? '完了' : '未完了'}</span>
            </label>`;
        }

        return `<div class="unit-list-row">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
                    <div class="unit-list-name">${esc(unitLabel)}</div>
                    ${metaHtml}
                </div>
                <div class="unit-list-status"><span class="status-badge ${statusCls}">${esc(statusLabel)}</span></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;">
                <div>${linkHtml}</div>
                <div>${bottomRightHtml}</div>
            </div>
            ${approvalHtml}
            ${readinessHtml}
        </div>`;
    }).join('');
}

async function renderAssemblyMachineDetailBody(projectNum, machine) {
    const { data: reqs } = await db.from('approval_requests')
        .select('*, approval_steps(id, step_order, approver_role, approver_id, status)')
        .eq('project_number', projectNum).eq('flow_type', 'assembly')
        .order('created_at', { ascending: true });

    // 電装(electrical)も2000番台はユニット単位申請のため、組立と同じ構成でユニット一覧を右列に表示する
    const { data: elecReqs } = await db.from('approval_requests')
        .select('*, approval_steps(id, step_order, approver_role, approver_id, status)')
        .eq('project_number', projectNum).eq('flow_type', 'electrical')
        .order('created_at', { ascending: true });

    const { data: notReqRows } = await db.from('assembly_unit_not_required')
        .select('unit').eq('project_number', projectNum).eq('machine', machine);
    const notRequiredUnits = new Set((notReqRows || []).map(r => r.unit || ''));

    // 電装の「不要にする」は組立と別テーブルで独立管理する
    const { data: elecNotReqRows } = await db.from('electrical_unit_not_required')
        .select('unit').eq('project_number', projectNum).eq('machine', machine);
    const elecNotRequiredUnits = new Set((elecNotReqRows || []).map(r => r.unit || ''));

    const units     = getAssemblyUnitListForMachine(machine, reqs || []);
    const elecUnits = getAssemblyUnitListForMachine(machine, elecReqs || []);
    const pInfo = projectsMap[projectNum] || {};
    const meta     = SHEET_FLOW_META['assembly'];
    const elecMeta = SHEET_FLOW_META['electrical'];
    const myRole = getEffectiveRole();
    const canApply     = canApplyFlow('assembly');
    const canApplyElec = canApplyFlow('electrical');

    // 申請者名をまとめて取得（組立・電装合算、一覧に申請者・申請日を直接表示するため）
    const requesterIds = [...new Set([...(reqs || []), ...(elecReqs || [])].map(r => r.requester_id).filter(Boolean))];
    const requesterNames = {};
    if (requesterIds.length > 0) {
        const { data: prs } = await db.from('profiles').select('id, name').in('id', requesterIds);
        (prs || []).forEach(p => { requesterNames[p.id] = p.name; });
    }

    // 試運転準備完了チェック（試運転タスクがある機械のみ表示。ユニット単位でチェック、機械単位で通知判定する）
    const hasTestRunTask = !!progressCachedData?.machineTaskSet?.has(`${projectNum}__${machine}__試運転`);
    let readinessMap = new Map();
    let kumitateOwnerByUnit = new Map();
    let denkiOwnerByUnit = new Map();
    if (hasTestRunTask) {
        const { data: readinessRows } = await db.from('test_run_readiness')
            .select('unit, kind, is_ready').eq('project_number', projectNum).eq('machine', machine);
        readinessMap = new Map((readinessRows || []).map(r => [`${r.unit || ''}__${r.kind}`, r.is_ready]));

        const { data: ownerTaskRows } = await db.from('tasks').select('unit, owner, text')
            .eq('project_number', projectNum).eq('machine', machine).in('text', ['機械組立', '電気艤装']);
        kumitateOwnerByUnit = buildOwnerNamesByUnit((ownerTaskRows || []).filter(t => t.text === '機械組立'));
        denkiOwnerByUnit    = buildOwnerNamesByUnit((ownerTaskRows || []).filter(t => t.text === '電気艤装'));
    }

    const rowsHtml = buildMachineUnitRowsHtml({
        projectNum, machine, units, reqs, notRequiredUnits, meta, myRole, canApply, requesterNames,
        startUnitFnName: 'startNewAssemblyUnitSheetFromDetail',
        submitFnName:    'submitAssemblyDraftFromDetail',
        deleteFnName:    'deleteAssemblyDraftFromDetail',
        toggleFnName:    'toggleAssemblyUnitNotRequired',
        reopenFnName:    'reopenAssemblySheetFromDetail',
        hasTestRunTask, readinessKind: 'assembly', readinessMap, ownerByUnit: kumitateOwnerByUnit
    });
    const elecRowsHtml = buildMachineUnitRowsHtml({
        projectNum, machine, units: elecUnits, reqs: elecReqs, notRequiredUnits: elecNotRequiredUnits,
        meta: elecMeta, myRole, canApply: canApplyElec, requesterNames,
        startUnitFnName: 'startNewElectricalUnitSheetFromDetail',
        submitFnName:    'submitElectricalDraftFromDetail',
        deleteFnName:    'deleteElectricalDraftFromDetail',
        toggleFnName:    'toggleElectricalUnitNotRequired',
        reopenFnName:    'reopenElectricalSheetFromDetail',
        hasTestRunTask, readinessKind: 'electrical', readinessMap, ownerByUnit: denkiOwnerByUnit
    });

    const addNewUnitHtml = canApply
        ? `<button class="btn-add-new" onclick="startNewAssemblyFreeUnitSheetFromDetail('${esc(projectNum)}', '${esc(machine)}')">＋ 一覧にないユニットを申請する</button>`
        : '';
    const elecAddNewUnitHtml = canApplyElec
        ? `<button class="btn-add-new" onclick="startNewElectricalFreeUnitSheetFromDetail('${esc(projectNum)}', '${esc(machine)}')">＋ 一覧にないユニットを申請する</button>`
        : '';

    document.getElementById('detail_title').textContent = `組立・電装フロー（${esc(machine)}）`;
    document.getElementById('detail_body').innerHTML = `
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f;">${esc(projectNum)}【${esc(machine)}】　${esc(pInfo.customer_name || '')}</div>
        ${pInfo.project_details ? `<div style="font-size:15px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        ${build2000FlowStepsHtml('assembly', 2, projectNum, machine)}
        <hr class="section-divider">
        <div class="assembly-elec-split">
            <div class="detail-col">
                <div class="section-title"><span class="status-badge" style="font-size:13px;padding:3px 10px;${ASSEMBLY_ELEC_BADGE_COLORS.assembly}">組立</span> ユニット別 申請状況</div>
                <div class="unit-list-wrap unit-list-wrap-wide">${rowsHtml}</div>
                ${addNewUnitHtml}
            </div>
            <div class="detail-col">
                <div class="section-title"><span class="status-badge" style="font-size:13px;padding:3px 10px;${ASSEMBLY_ELEC_BADGE_COLORS.electrical}">電装</span> ユニット別 申請状況</div>
                <div class="unit-list-wrap unit-list-wrap-wide">${elecRowsHtml}</div>
                ${elecAddNewUnitHtml}
            </div>
        </div>
    `;
    document.getElementById('detail_footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
    `;
    equalizeAssemblyElecRowHeights();
}

// 組立・電装のユニット一覧（左右2列）で、同じ段のカードの高さを揃える。
// 不要マークの行は「試運転準備」欄が無い等で高さが変わり、左右で段がずれて見えるため、描画後に各段の最大高さに合わせる。
function equalizeAssemblyElecRowHeights() {
    const apply = () => {
        const cols = [...document.querySelectorAll('#detail_body .assembly-elec-split .unit-list-wrap')];
        if (cols.length < 2) return;
        const rowsByCol = cols.map(c => [...c.querySelectorAll(':scope > .unit-list-row')]);
        rowsByCol.flat().forEach(r => { r.style.minHeight = ''; });
        // 1列表示（狭い画面）のときは揃えない
        if (Math.abs(cols[0].getBoundingClientRect().top - cols[1].getBoundingClientRect().top) > 2) return;
        const maxLen = Math.max(...rowsByCol.map(r => r.length));
        for (let i = 0; i < maxLen; i++) {
            const rows = rowsByCol.map(r => r[i]).filter(Boolean);
            const h = Math.max(...rows.map(r => r.getBoundingClientRect().height));
            rows.forEach(r => { r.style.minHeight = h + 'px'; });
        }
    };
    requestAnimationFrame(apply);
    if (!window.__assemblyElecEqualizeBound) {
        window.__assemblyElecEqualizeBound = true;
        window.addEventListener('resize', () => requestAnimationFrame(apply));
    }
}

async function toggleAssemblyUnitNotRequired(projectNum, machine, unit, checked) {
    if (checked) await markAssemblyUnitNotRequired(projectNum, machine, unit);
    else await unmarkAssemblyUnitNotRequired(projectNum, machine, unit);
}

async function markAssemblyUnitNotRequired(projectNum, machine, unit) {
    const { error } = await db.from('assembly_unit_not_required').upsert({
        project_number: projectNum, machine, unit: unit || '', marked_by: currentUser.id
    }, { onConflict: 'project_number,machine,unit' });
    if (error) { showToast('更新に失敗しました: ' + error.message, 'error'); return; }
    await refreshAll();
    await renderAssemblyMachineDetailBody(projectNum, machine);
}

async function unmarkAssemblyUnitNotRequired(projectNum, machine, unit) {
    const { error } = await db.from('assembly_unit_not_required').delete()
        .eq('project_number', projectNum).eq('machine', machine).eq('unit', unit || '');
    if (error) { showToast('更新に失敗しました: ' + error.message, 'error'); return; }
    await refreshAll();
    await renderAssemblyMachineDetailBody(projectNum, machine);
}

// 電装の「不要にする」は組立と別テーブル(electrical_unit_not_required)で独立管理する
async function toggleElectricalUnitNotRequired(projectNum, machine, unit, checked) {
    if (checked) await markElectricalUnitNotRequired(projectNum, machine, unit);
    else await unmarkElectricalUnitNotRequired(projectNum, machine, unit);
}

async function markElectricalUnitNotRequired(projectNum, machine, unit) {
    const { error } = await db.from('electrical_unit_not_required').upsert({
        project_number: projectNum, machine, unit: unit || '', marked_by: currentUser.id
    }, { onConflict: 'project_number,machine,unit' });
    if (error) { showToast('更新に失敗しました: ' + error.message, 'error'); return; }
    await refreshAll();
    await renderAssemblyMachineDetailBody(projectNum, machine);
}

async function unmarkElectricalUnitNotRequired(projectNum, machine, unit) {
    const { error } = await db.from('electrical_unit_not_required').delete()
        .eq('project_number', projectNum).eq('machine', machine).eq('unit', unit || '');
    if (error) { showToast('更新に失敗しました: ' + error.message, 'error'); return; }
    await refreshAll();
    await renderAssemblyMachineDetailBody(projectNum, machine);
}

// 工番レベルの組立フロー一覧から直接承認する（既存の承認処理openDetailModal→approveStepとは別に、
// モーダルを閉じずに一覧を再描画する専用版。組立は常に並列承認＝どちらかが承認すれば即完了）
async function approveAssemblyRequestFromList(requestId, stepId, stepOrder, projectNum, machineLabel, machine = null) {
    if (requireLogin()) return;
    // 二重クリックで承認処理・通知が重複しないようボタンを即座に無効化する
    const btn = (typeof event !== 'undefined' && event?.currentTarget) || null;
    if (btn) { if (btn.disabled) return; btn.disabled = true; }
    if (!confirm(`${machineLabel}を承認します。よろしいですか？`)) { if (btn) btn.disabled = false; return; }

    showLoading('処理中...');
    try {
        await db.from('approval_steps').update({
            status:      'approved',
            approver_id: currentUser.id,
            decided_at:  new Date().toISOString()
        }).eq('id', stepId);

        await db.from('approval_requests').update({
            status:     'approved',
            updated_at: new Date().toISOString()
        }).eq('id', requestId);

        // 並列承認: 残っている他のステップをキャンセルし、その承認者へ通知
        const { data: otherSteps } = await db.from('approval_steps')
            .select('id, approver_role').eq('request_id', requestId).eq('status', 'pending').neq('id', stepId);
        if (otherSteps?.length > 0) {
            await db.from('approval_steps').update({ status: 'cancelled' }).in('id', otherSteps.map(s => s.id));
            for (const os of otherSteps) {
                const { data: others } = await db.from('profiles').select('id').eq('role', os.approver_role);
                if (others?.length > 0) {
                    await db.from('approval_notifications').insert(
                        others.map(a => ({ request_id: requestId, recipient_id: a.id, notification_type: 'completed_by_other' }))
                    );
                }
            }
        }

        const { data: reqRow } = await db.from('approval_requests').select('*').eq('id', requestId).single();
        await syncTaskCompletionOnFlowApproval(reqRow);
        await recordNotifications(requestId);
        const { data: existing } = await db.from('approval_notifications')
            .select('id').eq('request_id', requestId).eq('recipient_id', currentUser.id)
            .eq('notification_type', 'completed').maybeSingle();
        if (!existing) {
            await db.from('approval_notifications').insert({
                request_id: requestId, recipient_id: currentUser.id, notification_type: 'completed'
            });
        }

        await refreshAll();
        ui.send('SAVED');
        showToast('全承認が完了しました。関係者に通知が送られます。', 'success');
        if (machine) await renderAssemblyMachineDetailBody(projectNum, machine);
        else await renderAssemblyFlowDetailBody(projectNum);
    } catch (e) {
        showToast('承認処理に失敗しました: ' + e.message, 'error');
        if (btn) btn.disabled = false;
    } finally {
        hideLoading();
    }
}

// 却下ボタンを押した時だけ、理由入力欄を別モーダルで表示する（却下は頻度が低いため一覧には常設しない）
function showAssemblyRejectPrompt(requestId, stepId, projectNum, machine = null) {
    document.getElementById('assembly_reject_prompt')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'assembly_reject_prompt';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(20,30,50,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:10px;padding:20px;width:360px;max-width:90%;box-shadow:0 8px 30px rgba(0,0,0,.25);">
            <div style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#1e3a5f;">却下理由の入力</div>
            <textarea id="assembly_reject_reason" placeholder="却下の理由を入力してください（必須）"
                style="width:100%;min-height:80px;font-size:14px;padding:8px;box-sizing:border-box;border:1px solid #ccc;border-radius:6px;"></textarea>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button class="btn btn-secondary" onclick="document.getElementById('assembly_reject_prompt').remove()">キャンセル</button>
                <button class="btn btn-danger" onclick="confirmAssemblyReject('${requestId}', '${stepId}', '${esc(projectNum)}', '${machine ? esc(machine) : ''}')">却下する</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

async function confirmAssemblyReject(requestId, stepId, projectNum, machine = '') {
    const reason = (document.getElementById('assembly_reject_reason')?.value || '').trim();
    if (!reason) { showToast('却下する場合は理由を入力してください。', 'error'); return; }
    document.getElementById('assembly_reject_prompt')?.remove();
    await rejectAssemblyRequestFromList(requestId, stepId, projectNum, reason, machine || null);
}

async function rejectAssemblyRequestFromList(requestId, stepId, projectNum, comment, machine = null) {
    if (requireLogin()) return;
    if (!comment) { showToast('却下する場合はコメントを入力してください。', 'error'); return; }

    showLoading('処理中...');
    try {
        await db.from('approval_steps').update({
            status:      'rejected',
            approver_id: currentUser.id,
            comment:     comment,
            decided_at:  new Date().toISOString()
        }).eq('id', stepId);

        await db.from('approval_requests').update({
            status:     'rejected',
            updated_at: new Date().toISOString()
        }).eq('id', requestId);

        const { data: rejReq } = await db.from('approval_requests')
            .select('requester_id').eq('id', requestId).single();
        if (rejReq?.requester_id) {
            await db.from('approval_notifications').insert({
                request_id: requestId, recipient_id: rejReq.requester_id, notification_type: 'rejected'
            });
        }

        // DB更新はここまでで完了しているので、モーダル表示は必ず最新化する。
        // refreshAll()（一覧・サイドパネルの再読み込み）が失敗しても却下自体は成功しているため、
        // モーダルの再描画を巻き込んで止めないよう先に実行し、refreshAllは失敗を握りつぶして後追いで流す。
        if (machine) await renderAssemblyMachineDetailBody(projectNum, machine);
        else await renderAssemblyFlowDetailBody(projectNum);
        ui.send('SAVED');
        showToast('却下しました。申請者に通知されます。', 'success');
        refreshAll().catch(e => console.error('refreshAll failed after reject:', e));
    } catch (e) {
        showToast('処理に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== 試運転フロー詳細モーダル（工番レベル、2000番以外）=====
// 試運転は機械単位1申請・ユニット概念が無いため、組立フロー詳細内の電装セクションと同じ構成の単独モーダルにしている
async function openTestRunFlowDetailModal(projectNum) {
    document.getElementById('detail_modal').classList.add('open');
    document.getElementById('detail_body').innerHTML   = '<div class="loading-indicator">読み込み中...</div>';
    document.getElementById('detail_footer').innerHTML = '<button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>';
    ui.send('OPEN_DETAIL');
    currentTestRunDetailProjectNum = projectNum;
    currentTestRunMachineDetail = null;
    testRunDetailReturnProjectNum = null;
    testRunDetailReturnMachine = null;
    await renderTestRunFlowDetailBody(projectNum);
}

async function renderTestRunFlowDetailBody(projectNum) {
    // 2000番台：機械ごとの一覧（一覧カードの「試運転申請はこちら→」ボタンから開く）は専用の描画に切り替える
    // （試運転タスクの機械名を直接使う。組立の機械一覧とは独立しているため、こちらは非2000番向けの下の実装とは別扱いにする）
    if (is2000sSeries(projectNum)) {
        await renderTestRun2000FlowDetailBody(projectNum);
        return;
    }
    const { data: reqs } = await db.from('approval_requests')
        .select('*, approval_steps(id, step_order, approver_role, approver_id, status)')
        .eq('project_number', projectNum).eq('flow_type', 'test_run')
        .order('created_at', { ascending: true });

    // 試運転タスクがある機械の一覧（未申請の機械を洗い出すため）
    const { data: taskRows } = await db.from('tasks')
        .select('machine').eq('project_number', projectNum).eq('text', '試運転').not('machine', 'is', null);
    const machines = [...new Set((taskRows || []).map(t => (t.machine || '').trim()).filter(Boolean))];

    const pInfo = projectsMap[projectNum] || {};
    const meta = SHEET_FLOW_META['test_run'];
    const myRole = getEffectiveRole();
    const canApply = canApplyFlow('test_run');

    // 申請者名をまとめて取得（一覧に申請者・申請日を直接表示するため）
    const requesterIds = [...new Set((reqs || []).map(r => r.requester_id).filter(Boolean))];
    const requesterNames = {};
    if (requesterIds.length > 0) {
        const { data: prs } = await db.from('profiles').select('id, name').in('id', requesterIds);
        (prs || []).forEach(p => { requesterNames[p.id] = p.name; });
    }

    const appliedMachines = new Set((reqs || []).map(r => r.machine_name).filter(Boolean));
    const unappliedMachines = machines.filter(m => !appliedMachines.has(m));

    const unappliedRowsHtml = unappliedMachines.map(m => {
        const linkHtml = canApply
            ? `<span class="unit-list-link" style="cursor:pointer;" onclick="startNewTestRunSheetFromDetail('${esc(projectNum)}', '${esc(m)}')">申請する →</span>`
            : '';
        return `<div class="unit-list-row">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div class="unit-list-name">${esc(m)}</div>
                <div class="unit-list-status"><span class="status-badge s-gray">未申請</span></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;">
                <div>${linkHtml}</div>
                <div></div>
            </div>
        </div>`;
    }).join('');

    const existingRowsHtml = (reqs || []).map(req => {
        const cls = STATUS_CLASSES[req.status] || 's-gray';
        const label = isSavedDraft(req) ? '下書き' : (req.status === 'draft' ? '未申請' : statusBadgeLabel(req));
        const machineLabel = req.machine_name || '（機械未入力）';
        const isOwnDraft = req.status === 'draft' && req.requester_id === currentUser.id;

        if (isOwnDraft) {
            const savedOnce = isSavedDraft(req);
            const reopenLinkLabel = savedOnce ? '続きを入力する →' : '申請する →';
            const actionBtnsHtml = savedOnce ? `
                        <button class="btn-apply-xs" onclick="submitTestRunDraftFromDetail('${req.id}', '${esc(projectNum)}', '${esc(machineLabel)}')">申請する</button>
                        <button class="btn-delete-xs" title="削除" onclick="deleteTestRunDraftFromDetail('${req.id}', '${esc(projectNum)}', '${esc(machineLabel)}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>` : '';
            return `<div class="unit-list-row">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div class="unit-list-name">${esc(machineLabel)}</div>
                    <div class="unit-list-status"><span class="status-badge ${cls}">${esc(label)}</span></div>
                </div>
                <div class="unit-list-row-actions" style="justify-content:space-between;">
                    <span class="unit-list-link" style="cursor:pointer;" onclick="reopenTestRunSheetFromDetail('${req.id}')">${reopenLinkLabel}</span>
                    <div style="display:flex;gap:8px;align-items:center;">
                        ${actionBtnsHtml}
                    </div>
                </div>
            </div>`;
        }

        const requesterName = requesterNames[req.requester_id] || '—';
        const submittedDate = req.created_at ? fmtDate(req.created_at) : '—';
        const isApproved = req.status === 'approved';
        const canEditRejected = req.status === 'rejected' && (req.requester_id === currentUser.id || canApplyFlow('test_run'));
        const unresolvedPendingCount = countUnresolvedPendingItems(req);
        const hasUnresolvedPending = isApproved && unresolvedPendingCount > 0;
        const sheetUrl = canEditRejected ? `${meta.file}?draft_id=${req.id}` : `${meta.file}?view=1&id=${req.id}`;
        const sheetLinkLabel = hasUnresolvedPending ? `⚠ 申し送り事項あり(${unresolvedPendingCount}件) →`
            : isApproved ? '完了報告書を見る →' : (canEditRejected ? 'チェックシートを修正する →' : 'チェックシートを見る →');
        const sheetLinkOnclick = hasUnresolvedPending
            ? `viewTestRunRequestDetail('${req.id}', '${esc(projectNum)}')`
            : `window.open('${sheetUrl}', '_blank')`;

        const myStep = (req.approval_steps || []).find(s =>
            (s.approver_role === myRole || isSuperAdmin()) && s.status === 'pending' && req.status === 'submitted');
        const approvalHtml = myStep ? `
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button class="btn btn-danger"  style="font-size:13px;padding:5px 14px;" onclick="showTestRunRejectPrompt('${req.id}', '${myStep.id}', '${esc(projectNum)}', '${esc(machineLabel)}')">却下する</button>
                <button class="btn btn-success" style="font-size:13px;padding:5px 14px;" onclick="approveTestRunRequestFromDetail('${req.id}', '${myStep.id}', ${myStep.step_order}, '${esc(projectNum)}', '${esc(machineLabel)}')">承認する</button>
            </div>` : '';

        return `<div class="unit-list-row">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
                    <div class="unit-list-name">${esc(machineLabel)}</div>
                    <div class="unit-list-meta" style="margin-top:0;">申請者: ${esc(requesterName)}　申請日: ${esc(submittedDate)}</div>
                </div>
                <div class="unit-list-status"><span class="status-badge ${cls}">${esc(label)}</span></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;">
                <div class="unit-list-link" style="cursor:pointer;" onclick="${sheetLinkOnclick}">${sheetLinkLabel}</div>
                <div></div>
            </div>
            ${approvalHtml}
        </div>`;
    }).join('');

    const rowsHtml = unappliedRowsHtml + existingRowsHtml || '<div style="padding:8px 0;color:#999;font-size:14px;">試運転の申請はまだありません</div>';

    document.getElementById('detail_title').textContent = '試運転フロー';
    document.getElementById('detail_body').innerHTML = `
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f;">${esc(projectNum)}　${esc(pInfo.customer_name || '')}</div>
        ${pInfo.project_details ? `<div style="font-size:15px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        <hr class="section-divider">
        <div class="section-title">試運転 申請状況</div>
        <div class="unit-list-wrap unit-list-wrap-wide">${rowsHtml}</div>
    `;
    document.getElementById('detail_footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
    `;
}

// ===== 2000番台：試運転フロー機械詳細モーダル =====
// 試運転はユニット単位ではなく機械単位の申請のため、組立の機械詳細画面と同じ構成を機械1行だけに単純化して使う
async function openTestRunMachineDetailModal(projectNum, machine) {
    document.getElementById('detail_modal').classList.add('open');
    document.getElementById('detail_body').innerHTML   = '<div class="loading-indicator">読み込み中...</div>';
    document.getElementById('detail_footer').innerHTML = '<button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>';
    ui.send('OPEN_DETAIL');
    currentTestRunDetailProjectNum = null;
    currentTestRunMachineDetail = { projectNum, machine };
    // この機械詳細は必ず試運転の機械一覧モーダル（2000番台のみ）から開くため、閉じたら一覧に戻る
    testRunDetailReturnProjectNum = projectNum;
    testRunDetailReturnMachine = null;
    await renderTestRunMachineDetailBody(projectNum, machine);
}

async function renderTestRunMachineDetailBody(projectNum, machine) {
    const { data: reqs } = await db.from('approval_requests')
        .select('*, approval_steps(id, step_order, approver_role, approver_id, status)')
        .eq('project_number', projectNum).eq('flow_type', 'test_run').eq('machine_name', machine)
        .order('created_at', { ascending: true });

    const pInfo = projectsMap[projectNum] || {};
    const meta = SHEET_FLOW_META['test_run'];
    const myRole = getEffectiveRole();
    const canApply = canApplyFlow('test_run');

    const myDraft = (reqs || []).find(r => r.status === 'draft' && r.requester_id === currentUser.id);
    const activeReq = (reqs || []).find(r => r.status !== 'draft');

    let statusLabel, statusCls;
    if (activeReq)              { statusLabel = statusBadgeLabel(activeReq); statusCls = STATUS_CLASSES[activeReq.status] || 's-gray'; }
    else if (isSavedDraft(myDraft)) { statusLabel = '下書き'; statusCls = 's-gray'; }
    else                        { statusLabel = '未申請'; statusCls = 's-gray'; }

    let metaHtml = '', linkHtml = '', approvalHtml = '', bottomRightHtml = '';

    if (activeReq) {
        let requesterName = '—';
        if (activeReq.requester_id) {
            const { data: pr } = await db.from('profiles').select('name').eq('id', activeReq.requester_id).maybeSingle();
            requesterName = pr?.name || '—';
        }
        const submittedDate = activeReq.created_at ? fmtDate(activeReq.created_at) : '—';
        metaHtml = `<div class="unit-list-meta" style="margin-top:0;">申請者: ${esc(requesterName)}　申請日: ${esc(submittedDate)}</div>`;

        const isApproved = activeReq.status === 'approved';
        const canEditRejected = activeReq.status === 'rejected' && (activeReq.requester_id === currentUser.id || canApply);
        const unresolvedPendingCount = countUnresolvedPendingItems(activeReq);
        const hasUnresolvedPending = isApproved && unresolvedPendingCount > 0;
        const sheetUrl = canEditRejected ? `${meta.file}?draft_id=${activeReq.id}` : `${meta.file}?view=1&id=${activeReq.id}`;
        const sheetLinkLabel = hasUnresolvedPending ? `⚠ 申し送り事項あり(${unresolvedPendingCount}件) →`
            : isApproved ? '完了報告書を見る →' : (canEditRejected ? 'チェックシートを修正する →' : 'チェックシートを見る →');
        const sheetLinkOnclick = hasUnresolvedPending
            ? `viewTestRunRequestDetail('${activeReq.id}', '${esc(projectNum)}', '${esc(machine)}')`
            : `window.open('${sheetUrl}', '_blank')`;
        linkHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="${sheetLinkOnclick}">${sheetLinkLabel}</span>`;

        const myStep = (activeReq.approval_steps || []).find(s =>
            (s.approver_role === myRole || isSuperAdmin()) && s.status === 'pending' && activeReq.status === 'submitted');
        approvalHtml = myStep ? `
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button class="btn btn-danger"  style="font-size:13px;padding:5px 14px;" onclick="showTestRunRejectPrompt('${activeReq.id}', '${myStep.id}', '${esc(projectNum)}', '${esc(machine)}')">却下する</button>
                <button class="btn btn-success" style="font-size:13px;padding:5px 14px;" onclick="approveTestRunRequestFromDetail('${activeReq.id}', '${myStep.id}', ${myStep.step_order}, '${esc(projectNum)}', '${esc(machine)}')">承認する</button>
            </div>` : '';
    } else if (myDraft) {
        const savedOnce = isSavedDraft(myDraft);
        const reopenLinkLabel = savedOnce ? '続きを入力する →' : '申請する →';
        linkHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="reopenTestRunSheetFromDetail('${myDraft.id}')">${reopenLinkLabel}</span>`;
        bottomRightHtml = savedOnce ? `
            <div style="display:flex;gap:8px;align-items:center;">
                <button class="btn-apply-xs" onclick="submitTestRunDraftFromDetail('${myDraft.id}', '${esc(projectNum)}', '${esc(machine)}')">申請する</button>
                <button class="btn-delete-xs" title="削除" onclick="deleteTestRunDraftFromDetail('${myDraft.id}', '${esc(projectNum)}', '${esc(machine)}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>` : '';
    } else if (canApply) {
        linkHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="startNewTestRunSheetFromDetail('${esc(projectNum)}', '${esc(machine)}')">申請する →</span>`;
    }

    document.getElementById('detail_title').textContent = `試運転フロー（${esc(machine)}）`;
    document.getElementById('detail_body').innerHTML = `
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f;">${esc(projectNum)}【${esc(machine)}】　${esc(pInfo.customer_name || '')}</div>
        ${pInfo.project_details ? `<div style="font-size:15px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        <hr class="section-divider">
        <div class="unit-list-wrap unit-list-wrap-wide">
            <div class="unit-list-row">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
                        <div class="unit-list-name">${esc(machine)}</div>
                        ${metaHtml}
                    </div>
                    <div class="unit-list-status"><span class="status-badge ${statusCls}">${esc(statusLabel)}</span></div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;">
                    <div>${linkHtml}</div>
                    <div>${bottomRightHtml}</div>
                </div>
                ${approvalHtml}
            </div>
        </div>
    `;
    document.getElementById('detail_footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
    `;
}

async function startNewTestRunSheetFromDetail(projectNum, machine, unit = '') {
    const { data: newDraft, error } = await db.from('approval_requests').insert({
        project_number: projectNum,
        machine_name:   machine,
        unit_name:      unit || null,
        flow_type:      'test_run',
        status:         'draft',
        requester_id:   currentUser.id
    }).select().single();
    if (error) { showToast('下書きの作成に失敗しました: ' + error.message, 'error'); return; }
    window.open(`test_run_sheet.html?draft_id=${newDraft.id}`, '_blank');
    await loadMineSide();
    if (currentTestRunDetailProjectNum) await renderTestRunFlowDetailBody(currentTestRunDetailProjectNum);
    else await renderTestRunMachineDetailBody(projectNum, machine);
}

function reopenTestRunSheetFromDetail(requestId) {
    window.open(`test_run_sheet.html?draft_id=${requestId}`, '_blank');
}

async function submitTestRunDraftFromDetail(draftId, projectNum, machine, unit = '') {
    showLoading('処理中...');
    try {
        const { data: draftReq } = await db.from('approval_requests')
            .select('sheet_data').eq('id', draftId).single();
        const checkItems = draftReq?.sheet_data?.check_items || {};
        const missingItems = TEST_RUN_REQUIRED_ITEM_IDS.filter(id => !checkItems[id]);
        if (missingItems.length > 0 || !draftReq?.sheet_data?.meta?.completion_date) {
            showToast('チェックシートの必須項目・試運転完了日が未入力です。チェックシートを開いて入力してください。', 'error');
            return;
        }

        let mTaskQuery = db.from('tasks').select('text').eq('project_number', projectNum).eq('machine', machine);
        if (unit) mTaskQuery = mTaskQuery.eq('unit', unit);
        const { data: mTasks } = await mTaskQuery;
        const mNames = (mTasks || []).map(t => t.text);

        const submitterRole = getEffectiveRole();
        const { data: req, error: e1 } = await db.from('approval_requests').update({
            status:         'submitted',
            unit_name:      unit || null,
            test_run:       mNames.includes('試運転'),
            has_inspection: mNames.includes('外観検査')
        }).eq('id', draftId).select().single();
        if (e1) throw e1;

        let stepsToInsert, notifyRoles;
        if (submitterRole === 'operations_manager') {
            stepsToInsert = [{ request_id: req.id, step_order: 1, approver_role: 'operations_director', status: 'pending' }];
            notifyRoles = ['operations_director'];
        } else {
            stepsToInsert = [
                { request_id: req.id, step_order: 1, approver_role: 'operations_manager',  status: 'pending' },
                { request_id: req.id, step_order: 2, approver_role: 'operations_director', status: 'pending' }
            ];
            notifyRoles = ['operations_manager', 'operations_director'];
        }
        await db.from('approval_steps').insert(stepsToInsert);
        for (const role of notifyRoles) {
            const { data: approvers } = await db.from('profiles').select('id').eq('role', role);
            if (approvers?.length > 0) {
                await db.from('approval_notifications').insert(
                    approvers.map(a => ({ request_id: req.id, recipient_id: a.id, notification_type: 'approval_request' }))
                );
            }
        }

        await refreshAll();
        showToast('試運転完了を申請しました。', 'success');
        if (currentTestRunDetailProjectNum) await renderTestRunFlowDetailBody(currentTestRunDetailProjectNum);
        else await renderTestRunMachineDetailBody(projectNum, machine);
    } catch (e) {
        showToast('申請に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteTestRunDraftFromDetail(draftId, projectNum, machine, unit = '') {
    if (!confirm('この下書きを削除します。よろしいですか？')) return;
    showLoading('削除中...');
    try {
        const { error } = await db.from('approval_requests').delete().eq('id', draftId).eq('status', 'draft');
        if (error) throw error;
        await refreshAll();
        showToast('下書きを削除しました。', 'success');
        if (currentTestRunDetailProjectNum) await renderTestRunFlowDetailBody(currentTestRunDetailProjectNum);
        else await renderTestRunMachineDetailBody(projectNum, machine);
    } catch (e) {
        showToast('削除に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function approveTestRunRequestFromDetail(requestId, stepId, stepOrder, projectNum, machine, unit = '') {
    if (requireLogin()) return;
    // 二重クリックで承認処理・通知が重複しないようボタンを即座に無効化する
    const btn = (typeof event !== 'undefined' && event?.currentTarget) || null;
    if (btn) { if (btn.disabled) return; btn.disabled = true; }
    if (!confirm(`${machine}${unit}を承認します。よろしいですか？`)) { if (btn) btn.disabled = false; return; }

    showLoading('処理中...');
    try {
        await db.from('approval_steps').update({
            status:      'approved',
            approver_id: currentUser.id,
            decided_at:  new Date().toISOString()
        }).eq('id', stepId);

        await db.from('approval_requests').update({
            status:     'approved',
            updated_at: new Date().toISOString()
        }).eq('id', requestId);

        // 並列承認: 残っている他のステップをキャンセルし、その承認者へ通知
        const { data: otherSteps } = await db.from('approval_steps')
            .select('id, approver_role').eq('request_id', requestId).eq('status', 'pending').neq('id', stepId);
        if (otherSteps?.length > 0) {
            await db.from('approval_steps').update({ status: 'cancelled' }).in('id', otherSteps.map(s => s.id));
            for (const os of otherSteps) {
                const { data: others } = await db.from('profiles').select('id').eq('role', os.approver_role);
                if (others?.length > 0) {
                    await db.from('approval_notifications').insert(
                        others.map(a => ({ request_id: requestId, recipient_id: a.id, notification_type: 'completed_by_other' }))
                    );
                }
            }
        }

        const { data: reqRow } = await db.from('approval_requests').select('*').eq('id', requestId).single();
        await syncTaskCompletionOnFlowApproval(reqRow);
        await recordNotifications(requestId);
        const { data: existing } = await db.from('approval_notifications')
            .select('id').eq('request_id', requestId).eq('recipient_id', currentUser.id)
            .eq('notification_type', 'completed').maybeSingle();
        if (!existing) {
            await db.from('approval_notifications').insert({
                request_id: requestId, recipient_id: currentUser.id, notification_type: 'completed'
            });
        }

        await refreshAll();
        ui.send('SAVED');
        showToast('全承認が完了しました。関係者に通知が送られます。', 'success');
        if (currentTestRunDetailProjectNum) await renderTestRunFlowDetailBody(currentTestRunDetailProjectNum);
        else await renderTestRunMachineDetailBody(projectNum, machine);
    } catch (e) {
        showToast('承認処理に失敗しました: ' + e.message, 'error');
        if (btn) btn.disabled = false;
    } finally {
        hideLoading();
    }
}

// 却下ボタンを押した時だけ、理由入力欄を別モーダルで表示する（組立と共通のオーバーレイ要素を再利用）
function showTestRunRejectPrompt(requestId, stepId, projectNum, machine, unit = '') {
    document.getElementById('assembly_reject_prompt')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'assembly_reject_prompt';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(20,30,50,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:10px;padding:20px;width:360px;max-width:90%;box-shadow:0 8px 30px rgba(0,0,0,.25);">
            <div style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#1e3a5f;">却下理由の入力</div>
            <textarea id="assembly_reject_reason" placeholder="却下の理由を入力してください（必須）"
                style="width:100%;min-height:80px;font-size:14px;padding:8px;box-sizing:border-box;border:1px solid #ccc;border-radius:6px;"></textarea>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button class="btn btn-secondary" onclick="document.getElementById('assembly_reject_prompt').remove()">キャンセル</button>
                <button class="btn btn-danger" onclick="confirmTestRunReject('${requestId}', '${stepId}', '${esc(projectNum)}', '${esc(machine)}', '${esc(unit)}')">却下する</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

async function confirmTestRunReject(requestId, stepId, projectNum, machine, unit = '') {
    const reason = (document.getElementById('assembly_reject_reason')?.value || '').trim();
    if (!reason) { showToast('却下する場合は理由を入力してください。', 'error'); return; }
    document.getElementById('assembly_reject_prompt')?.remove();
    await rejectTestRunRequestFromDetail(requestId, stepId, projectNum, reason, machine, unit);
}

async function rejectTestRunRequestFromDetail(requestId, stepId, projectNum, comment, machine, unit = '') {
    if (requireLogin()) return;
    if (!comment) { showToast('却下する場合はコメントを入力してください。', 'error'); return; }

    showLoading('処理中...');
    try {
        await db.from('approval_steps').update({
            status:      'rejected',
            approver_id: currentUser.id,
            comment:     comment,
            decided_at:  new Date().toISOString()
        }).eq('id', stepId);

        await db.from('approval_requests').update({
            status:     'rejected',
            updated_at: new Date().toISOString()
        }).eq('id', requestId);

        const { data: rejReq } = await db.from('approval_requests')
            .select('requester_id').eq('id', requestId).single();
        if (rejReq?.requester_id) {
            await db.from('approval_notifications').insert({
                request_id: requestId, recipient_id: rejReq.requester_id, notification_type: 'rejected'
            });
        }

        await refreshAll();
        ui.send('SAVED');
        showToast('却下しました。申請者に通知されます。', 'success');
        if (currentTestRunDetailProjectNum) await renderTestRunFlowDetailBody(currentTestRunDetailProjectNum);
        else await renderTestRunMachineDetailBody(projectNum, machine);
    } catch (e) {
        showToast('処理に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== 2000番完了報告：工事番号→機械ジャンプ一覧（左サイド） =====
// 進捗一覧の左フィルターパネル（.prefix-btn）と同じ見た目・選択状態になるようスタイルを共用する。
// 絞り込みは行わず、押した工事番号のカードまでスクロールするだけの単純なジャンプ一覧。
function renderAssemblyNavPanel(nums) {
    const panel = document.getElementById('assembly_nav_panel');
    if (!panel) return;
    if (progressTab !== 'assembly_report') { panel.innerHTML = ''; return; }

    panel.innerHTML = nums.map(num => {
        const isActive = assemblyNavActiveNum === num;
        return `<button class="prefix-btn${isActive ? ' active' : ''}" onclick="jumpToAssemblyProject(this, '${esc(num)}')">${esc(num)}</button>`;
    }).join('');
}

// 左ナビで工事番号を選択 → 絞り込みはせず、該当カードまでスクロール
function jumpToAssemblyProject(btnEl, num) {
    assemblyNavActiveNum = num;
    document.querySelectorAll('#assembly_nav_panel .prefix-btn.active').forEach(el => el.classList.remove('active'));
    btnEl.classList.add('active');
    const card = document.querySelector(`.prog-card[data-num="${CSS.escape(num)}"]`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 出荷後対応ペンディング一覧（完了済み工番も含めて全工番を横断表示） =====
function renderShipAfterPendingList(wrap) {
    const { baseNums, projectData, assemblyReqsByProject } = progressCachedData;

    let nums = baseNums.filter(num => is2000sSeries(num) === (progressTab === 'assembly_report'));
    if (progressFilterMine) {
        nums = nums.filter(num => projectMatchesMine(num));
    }
    if (progressFilterPrefix) {
        nums = nums.filter(num => matchesPrefix(num, progressFilterPrefix));
    }

    // 工事番号ごとにまとめる（1工番につき1枚のカードに、複数のペンディングを行として並べる）
    const grouped = {}; // num -> [{ machine, req, item, idx }, ...]
    for (const num of nums) {
        const machines = Object.keys(projectData[num] || {}).sort();
        for (const machine of machines) {
            const flows = projectData[num][machine].flows || {};
            for (const req of Object.values(flows)) {
                const items = req?.sheet_data?.pending_items || [];
                items.forEach((item, idx) => {
                    // 試運転は出荷後対応チェックボックス自体を廃止したため、過去データが残っていても対象外にする
                    if (req.flow_type !== 'test_run' && item.ship_after && !item.completed && (item.content || item.machine)) {
                        (grouped[num] || (grouped[num] = [])).push({ machine, req, item, idx });
                    }
                });
            }
        }
        // 組立(assembly)は機械が工程表と紐づかないため、申請の機械名要約をmachineの代わりに使う
        for (const req of (assemblyReqsByProject || {})[num] || []) {
            const items = req?.sheet_data?.pending_items || [];
            items.forEach((item, idx) => {
                if (item.ship_after && !item.completed && (item.content || item.machine)) {
                    (grouped[num] || (grouped[num] = [])).push({ machine: req.machine_name || '', req, item, idx });
                }
            });
        }
    }

    const numsWithPending = Object.keys(grouped).sort();

    if (numsWithPending.length === 0) {
        wrap.innerHTML = '<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">出荷後対応の未完了ペンディングはありません</div></div>';
        return;
    }

    wrap.innerHTML = numsWithPending.map(num => {
        const pInfo = projectsMap[num] || {};
        const label = [pInfo.customer_name, pInfo.project_details].filter(Boolean).join('　');
        const isCompletedProject = completedProjectNums.has(num);
        const rowsHtml = grouped[num].map(r => {
            const flowLabel = QA_DETAIL_TITLE_LABELS[r.req.flow_type] || FLOW_LABELS[r.req.flow_type] || r.req.flow_type;
            const canComplete = _canCompletePendingItem(r.req, r.item);
            return `
            <div class="pending-detail-row">
                <div class="pending-detail-content">
                    <div class="pending-detail-text">${r.machine ? `<span class="pending-detail-machine">${esc(r.machine)}</span> ` : ''}[${esc(flowLabel)}] ${esc(r.item.content || r.item.machine || '—')}${pendingDueSoon(r.item.due) ? ' <span style="font-size:12px;color:#c0392b;background:#fde8e8;border-radius:4px;padding:1px 6px;">期日間近</span>' : ''}</div>
                    ${r.item.owner ? `<div class="pending-detail-owner">担当: ${esc(r.item.owner)}</div>` : ''}
                    ${r.item.due ? `<div class="pending-detail-due">完了予定日: ${esc(r.item.due)}</div>` : ''}
                </div>
                ${canComplete ? `<button class="btn-primary-xs" onclick="completePendingItem('${r.req.id}', ${r.idx}, {skipModalFallback:true, isQaFlow: ${QA_MEETING_FLOWS.includes(r.req.flow_type)}})">完了にする</button>` : ''}
            </div>`;
        }).join('');
        return `
        <div class="prog-card">
            <div class="prog-card-header">
                <div class="prog-card-header-left">
                    <span class="prog-card-num">${esc(num)}</span>${label ? `<span class="prog-card-label" style="margin-left:0;">　${esc(label)}</span>` : ''}
                </div>
                ${isCompletedProject ? '<span class="si-badge si-gray" style="width:auto;border-radius:4px;padding:2px 8px;margin-left:8px;">完了済み工番</span>' : ''}
            </div>
            ${rowsHtml}
        </div>`;
    }).join('');
}

// ペンディング項目を「完了にする」操作ができるか（buildPendingSectionInnerのitemCanComplete判定と同じ基準）
function _canCompletePendingItem(req, item) {
    if (!req) return false;
    if (req.flow_type === 'test_run') return false; // 試運転は完了操作自体を廃止
    const isQaFlow = QA_MEETING_FLOWS.includes(req.flow_type);
    const statusOk = isQaFlow
        ? ['submitted', 'approved'].includes(req.status)
        : ['submitted', 'in_review', 'approved'].includes(req.status);
    if (!statusOk) return false;
    const isOwner      = !!(item.owner && currentProfile?.name === item.owner);
    const isSupervisor = isQaFlow
        ? isSupervisorOfOwner(item.owner)
        : (FLOW_SUPERVISOR_ROLES[req.flow_type] || []).includes(getEffectiveRole());
    const isMyRequest  = req.requester_id === currentUser.id;
    return isQualityOrSeikan || isOwner || isSupervisor || (!isQaFlow && isMyRequest);
}

// ===== Tab Switch（廃止済み・後方互換用スタブ） =====
function switchTab(tab) {
    // 新レイアウトではサイドパネルを使用するため、この関数は何もしない
    currentTab = tab;
}

// ===== Flow Modal Preset（カードのステップサークルクリックで工番・機械をプリセット） =====
async function openFlowModalPreset(el, overrideFlowType) {
    const flowType   = overrideFlowType || el.dataset.flowType;
    const projectNum = el.dataset.num;
    const machineName = el.dataset.machine;

    const findCb = (listId) =>
        [...document.querySelectorAll(`#${listId} input[type="checkbox"]`)].find(c => c.value === machineName);

    if (flowType === 'assembly') {
        // 組立は工番全体で1つの丸として表示するため、詳細モーダル（機械・ユニット別の申請状況）を開く
        await openAssemblyFlowDetailModal(projectNum);
    } else if (flowType === 'electrical' || flowType === 'test_run' || flowType === 'shipping_prep') {
        openSubmitModal(flowType);
        currentProjectNum = projectNum;
        document.getElementById('submit_project_display').textContent = projectNum;
        // 電装・試運転・出荷準備はステップ表示で機械が確定しているため、申請画面内では選び直せないようにロックする
        const isMachineLocked = flowType === 'electrical' || flowType === 'test_run' || flowType === 'shipping_prep';
        await onProjectChange(isMachineLocked ? machineName : null);
        if (isMachineLocked) {
            await onMachineChange();
        } else {
            const cb = findCb('submit_machine_list');
            if (cb) { cb.checked = true; await onMachineChange(); }
        }
    } else if (flowType === 'simple_inspection') {
        // 簡易検査はステップ表示で機械が確定しているため、組立・試運転と同様に選び直せないようロックする
        openSimpleInspectionModal();
        currentSiProjectNum = projectNum;
        document.getElementById('si_project_display').textContent = projectNum;
        await onSiProjectChange(machineName);
    } else if (flowType === 'inspection') {
        openInspectionModal();
        currentInspectionProjectNum = projectNum;
        document.getElementById('inspection_project_display').textContent = projectNum;
        await onInspectionProjectChange(machineName);
    } else if (flowType === 'shipping_check_inspection') {
        // 出荷品確認検査（機械組立が無い工番向け）もステップ表示で機械が確定しているためロックする
        openShippingCheckInspectionModal();
        currentSciProjectNum = projectNum;
        document.getElementById('sci_project_display').textContent = projectNum;
        await onSciProjectChange(machineName);
    } else if (flowType === 'shipping_meeting') {
        openShippingMeetingModal();
        currentSmProjectNum = projectNum;
        document.getElementById('sm_project_display').textContent = projectNum;
        await onSmProjectChange(machineName);
    } else if (flowType === 'shipping') {
        // 出荷確定はステップ表示で機械が確定しているため、他フローと同様に選び直せないようロックする
        openShippingModal();
        currentShippingProjectNum = projectNum;
        document.getElementById('shipping_project_display').textContent = projectNum;
        await onShippingProjectChange(machineName);
        await onShippingMachineChange();
    }
}

// ===== マイページ（サイドパネル）とステップ表示の境界線：幅をドラッグ調整 =====
const SIDEPANEL_WIDTH_KEY = 'sidepanelWidth';
const SIDEPANEL_WIDTH_MIN = 480;
const SIDEPANEL_WIDTH_MAX = 1200;
// メイン（進捗一覧）側も最低限の幅を確保する
const SIDEPANEL_MAIN_MIN = 420;

function applySidepanelWidth(px) {
    document.documentElement.style.setProperty('--sidepanel-width', `${px}px`);
}

(function restoreSidepanelWidth() {
    const saved = parseInt(localStorage.getItem(SIDEPANEL_WIDTH_KEY), 10);
    if (saved) applySidepanelWidth(Math.min(SIDEPANEL_WIDTH_MAX, Math.max(SIDEPANEL_WIDTH_MIN, saved)));
})();

function startPanelResize(e) {
    if (window.innerWidth <= 860) return; // モバイルはマイページを全画面表示するためリサイズ対象外
    e.preventDefault();
    const startX = e.clientX;
    const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidepanel-width'));
    const startWidth = current || 740;
    const maxWidth = Math.min(SIDEPANEL_WIDTH_MAX, window.innerWidth - SIDEPANEL_MAIN_MIN);

    document.body.classList.add('is-resizing-panel');

    function onMove(ev) {
        const dx = startX - ev.clientX; // 左へドラッグ＝マイページを広げる
        const width = Math.min(maxWidth, Math.max(SIDEPANEL_WIDTH_MIN, startWidth + dx));
        applySidepanelWidth(width);
    }
    function onUp() {
        document.body.classList.remove('is-resizing-panel');
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const finalWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidepanel-width'));
        if (finalWidth) localStorage.setItem(SIDEPANEL_WIDTH_KEY, Math.round(finalWidth));
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
}

// ===== Side Panel =====
function openSidePanelTo(section) {
    closeSettingsModal(); // 設定画面と同じ側面に表示されるため、開いていれば閉じておく
    const panel = document.getElementById('side_panel');
    panel.classList.add('open');

    if (panel.classList.contains('has-both')) {
        // 両方ある場合：クリックした方を展開、もう一方を折りたたむ
        const OTHER = { mine: 'pending', pending: 'mine' };
        const target = document.getElementById('side_half_' + section);
        const other  = document.getElementById('side_half_' + OTHER[section]);
        if (target) target.classList.remove('collapsed');
        if (other)  other.classList.add('collapsed');
    } else {
        // 片方だけの場合：折りたたまれていたら展開
        const half = document.getElementById('side_half_' + section);
        if (half && half.classList.contains('collapsed')) {
            half.classList.remove('collapsed');
        }
    }
}
function closeSidePanel() {
    document.getElementById('side_panel').classList.remove('open');
}
function toggleSideHalf(which) {
    const panel = document.getElementById('side_panel');
    if (!panel || !panel.classList.contains('has-both')) return;
    const half = document.getElementById('side_half_' + which);
    if (half) half.classList.toggle('collapsed');
}
function toggleMineFlowSection(titleEl) {
    titleEl.closest('.mine-flow-section')?.classList.toggle('collapsed');
}

// ===== Submit Modal =====
let currentFlowType = 'assembly';
let currentProjectNum = '';
let currentSiProjectNum = '';
let currentInspectionProjectNum = '';
let currentSciProjectNum = '';
let currentSmProjectNum = '';
let currentShippingProjectNum = '';
let selectedApproverRole = 'assembly_manager';
let sheetChecks = {};
let pendingItems = [];
let currentDraftId = null;
let currentUnitName = null; // 2000番台：ユニット単位申請時の選択中ユニット名（null=ユニット区分なし）
let currentDraftHasAssemblyItems = false; // マイページの汎用申請モーダル用：組立、または2000番台ユニット単位の電装下書きならtrue
let sheetAutoSaveTimer = null;
let currentAssemblyDetailProjectNum = null; // 組立フロー詳細モーダル(工番レベル)で開いている工番（sheet.html完了通知の再描画に使う）
let currentAssemblyMachineDetail = null; // 組立フロー詳細モーダル(機械レベル、2000番台)で開いている{projectNum, machine}
let assemblyDetailReturnProjectNum = null; // 個別申請の詳細画面(openDetailModal)を工番レベル組立フロー詳細から開いた場合の戻り先工番
let assemblyDetailReturnMachine = null; // 個別申請の詳細画面(openDetailModal)を機械レベル組立フロー詳細から開いた場合の戻り先{projectNum, machine}
let currentTestRunMachineDetail = null; // 試運転フロー詳細モーダル(機械レベル、2000番台)で開いている{projectNum, machine}
let currentTestRunDetailProjectNum = null; // 試運転フロー詳細モーダル(工番レベル、2000番以外)で開いている工番
let testRunDetailReturnProjectNum = null; // 個別申請の詳細画面(openDetailModal)を工番レベル試運転フロー詳細から開いた場合の戻り先工番
let testRunDetailReturnMachine = null; // 個別申請の詳細画面(openDetailModal)を機械レベル試運転フロー詳細から開いた場合の戻り先{projectNum, machine}

function selectApprover(role) {
    selectedApproverRole = role;
    document.getElementById('btn_approver_manager').classList.toggle('active',  role === 'assembly_manager');
    document.getElementById('btn_approver_director').classList.toggle('active', role === 'assembly_director');
}

function openSubmitModal(flowType = 'assembly') {
    currentFlowType = flowType;
    currentProjectNum = '';
    currentUnitName = null;
    document.getElementById('submit_project_display').textContent = '';
    document.getElementById('submit_project_info').style.display = 'none';
    document.getElementById('submit_machine_group').style.display = 'none';
    document.getElementById('submit_machine_list').innerHTML = '';
    document.getElementById('flow_detect_group').style.display = 'none';
    document.getElementById('submit_note').value = '';
    _updateSubmitUnitDisplay();

    // モーダルタイトルをフロー種別で切り替え
    document.getElementById('submit_modal_title').textContent =
        flowType === 'test_run'      ? '試運転完了通知 — 申請' :
        flowType === 'electrical'    ? '電装完了通知 — 申請' :
        flowType === 'shipping_prep' ? '出荷準備完了 — 申請' : '組立完了通知 — 申請';

    // 承認者選択グループは非表示（assembly は課長・部長両方に通知するため選択不要）
    document.getElementById('submit_approver_group').style.display = 'none';

    // チェックシートリセット
    sheetChecks = {};
    pendingItems = [];
    const needsSheetModal = !!SHEET_FLOW_META[flowType];
    if (needsSheetModal) {
        document.querySelectorAll('#sheet_modal .sheet-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#sheet_modal .sheet-note').forEach(n => { n.value = ''; });
        if (flowType === 'assembly') renderPendingItems();
        const indicator = document.getElementById('sheet_entry_indicator');
        if (indicator) indicator.style.display = 'none';
    }

    // フッターボタン切り替え（組立・試運転: 次へ→、それ以外: 申請する）
    const btnGoSheet = document.getElementById('btn_go_sheet');
    const btnSubmit  = document.getElementById('submit_btn');
    if (needsSheetModal) {
        const sheetLabel = `次へ（${SHEET_FLOW_META[flowType].label}を入力する）→`;
        if (btnGoSheet) { btnGoSheet.style.display = ''; btnGoSheet.textContent = sheetLabel; }
        if (btnSubmit)  btnSubmit.style.display  = 'none';
    } else {
        if (btnGoSheet) btnGoSheet.style.display = 'none';
        if (btnSubmit)  {
            btnSubmit.style.display = '';
            btnSubmit.disabled = false;
            btnSubmit.textContent = flowType === 'shipping_prep' ? '完了申請する' : '申請する';
        }
    }

    document.getElementById('submit_modal').classList.add('open');
    ui.send('OPEN_SUBMIT');
}

function closeSubmitModal() {
    document.getElementById('submit_modal').classList.remove('open');
    ui.send('CLOSE');
}

// 2000番台：ユニット単位申請時、申請モーダルのヘッダーに選択中ユニット名を表示する
function _updateSubmitUnitDisplay() {
    const el = document.getElementById('submit_unit_display');
    if (!el) return;
    if (currentUnitName) {
        el.textContent = `ユニット: ${currentUnitName}`;
        el.style.display = '';
    } else {
        el.style.display = 'none';
    }
}

// ===== 自主点検シート =====
async function goToSheetStep() {
    const projectNum = currentProjectNum;
    const isAssembly = currentFlowType === 'assembly';
    // 2000番台のユニット単位電装下書き（assembly_itemsを持つ）も組立と同じく機械選択欄を使わない
    const isElectricalUnitFlow = currentFlowType === 'electrical' && currentDraftHasAssemblyItems;
    const isAssemblyItemsFlow = isAssembly || isElectricalUnitFlow;
    const machineNums = isAssemblyItemsFlow ? [] : getSelectedMachines('submit_machine_list');
    if (!projectNum)                       { showToast('工事番号を選択してください', 'error'); return; }
    if (!isAssemblyItemsFlow && machineNums.length === 0) { showToast('機械を選択してください', 'error'); return; }
    const needsSheetFlow = !!SHEET_FLOW_META[currentFlowType];
    if (!needsSheetFlow) { submitRequest(); return; }
    if (!isAssemblyItemsFlow && machineNums.length > 1) {
        showToast('報告書は1台ずつ申請してください', 'error');
        return;
    }

    showLoading('下書きを保存中...');
    try {
        const note = document.getElementById('submit_note').value.trim();

        let existing;
        if (isAssemblyItemsFlow) {
            // 組立・電装ユニット単位は機械・ユニットを工程表と紐づけないため、工番・申請者単位で下書きを一意に扱う
            ({ data: existing } = await db.from('approval_requests')
                .select('id')
                .eq('project_number', projectNum)
                .eq('flow_type', currentFlowType)
                .eq('status', 'draft')
                .eq('requester_id', currentUser.id)
                .maybeSingle());
        } else {
            const machine = machineNums[0];
            let existingQuery = db.from('approval_requests')
                .select('id')
                .eq('project_number', projectNum)
                .eq('machine_name', machine)
                .eq('flow_type', currentFlowType)
                .eq('status', 'draft')
                .eq('requester_id', currentUser.id);
            existingQuery = currentUnitName ? existingQuery.eq('unit_name', currentUnitName) : existingQuery.is('unit_name', null);
            ({ data: existing } = await existingQuery.maybeSingle());
        }

        if (existing) {
            currentDraftId = existing.id;
            await db.from('approval_requests')
                .update({ note: note || null })
                .eq('id', existing.id);
        } else if (isElectricalUnitFlow) {
            // 電装ユニット単位下書きは常に機械詳細モーダルの「申請する」から作成済みのはずで、ここには来ない想定
            showToast('下書きが見つかりません。機械詳細画面から開き直してください。', 'error');
            return;
        } else if (isAssembly) {
            const { data: newDraft, error } = await db.from('approval_requests').insert({
                project_number: projectNum,
                flow_type:      currentFlowType,
                status:         'draft',
                requester_id:   currentUser.id,
                note:           note || null
            }).select().single();
            if (error) throw error;
            currentDraftId = newDraft.id;
        } else {
            const machine = machineNums[0];
            const { data: newDraft, error } = await db.from('approval_requests').insert({
                project_number: projectNum,
                machine_name:   machine,
                unit_name:      currentUnitName || null,
                flow_type:      currentFlowType,
                status:         'draft',
                requester_id:   currentUser.id,
                note:           note || null
            }).select().single();
            if (error) throw error;
            currentDraftId = newDraft.id;
        }

        const sheetUrl = SHEET_FLOW_META[currentFlowType].file;
        window.open(`${sheetUrl}?draft_id=${currentDraftId}`, '_blank');
        await loadMineSide();
    } catch (e) {
        showToast('下書きの保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 「変更する」ボタン: 既存の下書きをシートで再度開く
function reopenSheetTab() {
    if (!currentDraftId) { showToast('下書きIDが不明です。再度「次へ」を押してください', 'error'); return; }
    const sheetUrl = SHEET_FLOW_META[currentFlowType].file;
    window.open(`${sheetUrl}?draft_id=${currentDraftId}`, '_blank');
}

// 点検シートモーダルを開いて保存済みデータを復元
function openSheetModalForDraft() {
    // チェックボタン・備考をすべてクリア
    document.querySelectorAll('#sheet_modal .sheet-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#sheet_modal .sheet-note').forEach(n => { n.value = ''; });

    // sheetChecks の内容を復元（{ itemId: '○'|'×'|'―' } or { itemId: {result,note} }）
    Object.entries(sheetChecks).forEach(([itemId, val]) => {
        if (!val) return;
        const result = typeof val === 'object' ? val.result : val;
        const note   = typeof val === 'object' ? (val.note || '') : '';
        if (!result) return;
        const noteEl = document.getElementById('sn_' + itemId);
        if (noteEl && note) noteEl.value = note;
        const allBtns = [...document.querySelectorAll('#sheet_modal .sheet-btn')];
        const target = allBtns.find(b => {
            const oc = b.getAttribute('onclick') || '';
            return oc.includes("'" + itemId + "'") && oc.includes("'" + result + "'");
        });
        if (target) { target.classList.add('active'); sheetChecks[itemId] = result; }
    });

    renderPendingItems();
    _updateSheetSaveStatus('');

    // note 入力の自動保存（一度だけ委任リスナーを登録）
    const sheetBody = document.querySelector('#sheet_modal .sheet-body');
    if (sheetBody && !sheetBody._saveListenerAdded) {
        sheetBody.addEventListener('input', e => {
            if (e.target.classList.contains('sheet-note') || e.target.classList.contains('pending-machine') ||
                e.target.classList.contains('pending-content') || e.target.classList.contains('pending-due')) {
                scheduleSheetSave();
            }
        });
        sheetBody._saveListenerAdded = true;
    }

    document.getElementById('sheet_modal').classList.add('open');
}

// 自動保存スケジューラ
function scheduleSheetSave() {
    _updateSheetSaveStatus('saving');
    clearTimeout(sheetAutoSaveTimer);
    sheetAutoSaveTimer = setTimeout(saveSheetNow, 1200);
}

function _updateSheetSaveStatus(state) {
    const el = document.getElementById('sheet_save_status');
    if (!el) return;
    if (state === 'saving') { el.textContent = '保存中...'; el.style.color = '#aaa'; }
    else if (state === 'saved') { el.textContent = '保存済み ✓'; el.style.color = '#27ae60'; }
    else { el.textContent = ''; }
}

async function saveSheetNow() {
    if (requireLogin()) return;
    if (!currentDraftId) return;
    try {
        const data = collectSheetData();
        await db.from('approval_requests')
            .update({ sheet_data: data })
            .eq('id', currentDraftId);
        _updateSheetSaveStatus('saved');
    } catch (e) {
        _updateSheetSaveStatus('');
    }
}

// 一時保存して閉じる
async function backFromSheetModal() {
    if (currentDraftId) {
        clearTimeout(sheetAutoSaveTimer);
        await saveSheetNow();
    }
    document.getElementById('sheet_modal').classList.remove('open');
}

// 入力完了・申請へ進む
async function finishSheetEntry() {
    if (currentDraftId) {
        clearTimeout(sheetAutoSaveTimer);
        await saveSheetNow();
    }
    document.getElementById('sheet_modal').classList.remove('open');

    // 申請モーダルの入力済みバッジと申請ボタンを更新
    const indicator  = document.getElementById('sheet_entry_indicator');
    const btnGoSheet = document.getElementById('btn_go_sheet');
    const btnSubmit  = document.getElementById('submit_btn');
    if (indicator)  indicator.style.display = '';
    if (btnGoSheet) btnGoSheet.style.display = 'none';
    if (btnSubmit)  btnSubmit.style.display  = '';
}

// サイドバーの下書きカードをクリックして申請モーダルを復元
async function openDraftInSubmitModal(draftId) {
    showLoading('読み込み中...');
    try {
        const { data: draft } = await db.from('approval_requests')
            .select('*')
            .eq('id', draftId)
            .single();
        if (!draft) { showToast('下書きが見つかりません', 'error'); return; }

        currentDraftId   = draftId;
        currentFlowType  = draft.flow_type;
        currentProjectNum = draft.project_number;
        currentUnitName   = draft.unit_name || null;
        // 組立、または2000番台ユニット単位の電装下書き（assembly_itemsを持つ）は機械・ユニットが
        // チェックシート側で入力済みのため、この汎用モーダルでは機械選択欄を出さない
        currentDraftHasAssemblyItems = draft.flow_type === 'assembly'
            || (Array.isArray(draft.assembly_items) && draft.assembly_items.length > 0);
        _updateSubmitUnitDisplay();

        const titleMap = { assembly: '組立完了通知 — 申請', electrical: '電装完了通知 — 申請', test_run: '試運転完了通知 — 申請' };
        document.getElementById('submit_modal_title').textContent = titleMap[draft.flow_type] || '申請';
        document.getElementById('submit_approver_group').style.display = 'none';

        const p = projectsMap[draft.project_number] || {};
        document.getElementById('submit_project_display').textContent = draft.project_number;
        document.getElementById('submit_customer_display').textContent     = p.customer_name  || '—';
        document.getElementById('submit_project_name_display').textContent = p.project_details || '—';
        document.getElementById('submit_project_info').style.display = 'contents';
        document.getElementById('submit_note').value = draft.note || '';
        document.getElementById('flow_detect_group').style.display = 'none';

        if (currentDraftHasAssemblyItems) {
            // 組立・電装ユニット単位申請は機械・ユニットを工程表と紐づけないため、機械選択欄は出さない（チェックシート側で入力済み）
            document.getElementById('submit_machine_group').style.display = 'none';
        } else {
            document.getElementById('submit_machine_group').style.display = 'block';
            // 下書きも試運転限定のため、確定済みの機械をロック表示する
            await _loadMachineCheckboxes(draft.project_number, 'submit_machine_list', 'onMachineChange', draft.machine_name);
            await onMachineChange();
        }

        const btnGoSheet = document.getElementById('btn_go_sheet');
        const btnSubmit  = document.getElementById('submit_btn');
        const indicator  = document.getElementById('sheet_entry_indicator');

        const needsSheet = !!SHEET_FLOW_META[draft.flow_type];
        const sheetLabel = SHEET_FLOW_META[draft.flow_type]?.label || '';

        if (draft.sheet_data && needsSheet) {
            const savedChecks = draft.sheet_data.check_items || {};
            sheetChecks = {};
            Object.entries(savedChecks).forEach(([k, v]) => {
                sheetChecks[k] = typeof v === 'object' ? v : { result: v, note: '' };
            });
            pendingItems = draft.sheet_data.pending_items || draft.sheet_data.moushiokuri || [];
            if (indicator) indicator.style.display = '';
            if (btnGoSheet) btnGoSheet.style.display = 'none';
            if (btnSubmit)  btnSubmit.style.display  = '';
        } else if (needsSheet) {
            sheetChecks  = {};
            pendingItems = [];
            if (indicator) indicator.style.display = 'none';
            if (btnGoSheet) { btnGoSheet.style.display = ''; btnGoSheet.textContent = `次へ（${sheetLabel}を入力する）→`; }
            if (btnSubmit)  btnSubmit.style.display  = 'none';
        } else {
            sheetChecks  = {};
            pendingItems = [];
            if (indicator) indicator.style.display = 'none';
            if (btnGoSheet) btnGoSheet.style.display = 'none';
            if (btnSubmit)  btnSubmit.style.display  = '';
        }

        document.getElementById('submit_modal').classList.add('open');
    } catch (e) {
        showToast('読み込みに失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// BroadcastChannel: sheet.htmlから「完了」を受け取る
function setupSheetChannel() {
    const ch = new BroadcastChannel('approval_sheet');
    ch.addEventListener('message', async (event) => {
        const { type, draftId } = event.data;
        if (type !== 'sheet_complete' && type !== 'sheet_suspend') return;
        await loadMineSide();

        // 組立フロー詳細モーダル（機械レベル or 工番レベル）・試運転フロー詳細モーダル（機械レベル or 工番レベル）が開いていれば、そちらを再描画する（申請する/修正するボタンの表示を更新）
        // sheet_suspend（一時保存）でも再描画しないと、入力済みの内容が古いまま表示され続ける
        const detailModal = document.getElementById('detail_modal');
        if (detailModal.classList.contains('open') && (currentAssemblyDetailProjectNum || currentAssemblyMachineDetail || currentTestRunMachineDetail || currentTestRunDetailProjectNum)) {
            if (currentAssemblyMachineDetail) {
                await renderAssemblyMachineDetailBody(currentAssemblyMachineDetail.projectNum, currentAssemblyMachineDetail.machine);
            } else if (currentTestRunMachineDetail) {
                await renderTestRunMachineDetailBody(currentTestRunMachineDetail.projectNum, currentTestRunMachineDetail.machine);
            } else if (currentTestRunDetailProjectNum) {
                await renderTestRunFlowDetailBody(currentTestRunDetailProjectNum);
            } else {
                await renderAssemblyFlowDetailBody(currentAssemblyDetailProjectNum);
            }
            if (type === 'sheet_complete') {
                showToast('チェックシートの入力が完了しました。「申請する」ボタンで申請できます。', 'success');
            } else {
                showToast('入力内容を一時保存しました。', 'success');
            }
            return;
        }

        if (type !== 'sheet_complete') return; // 一時保存(sheet_suspend)は詳細モーダル以外では何もしない

        const submitModal = document.getElementById('submit_modal');
        if (submitModal.classList.contains('open') && currentDraftId === draftId) {
            // 申請モーダルが開いていて同じ下書きなら入力済みバッジを更新
            const { data } = await db.from('approval_requests')
                .select('sheet_data').eq('id', draftId).single();
            if (data?.sheet_data) {
                sheetChecks  = data.sheet_data.check_items  || {};
                pendingItems = data.sheet_data.pending_items || [];
                const indicator = document.getElementById('sheet_entry_indicator');
                if (indicator) indicator.style.display = '';
                const btnGoSheet = document.getElementById('btn_go_sheet');
                const btnSubmit  = document.getElementById('submit_btn');
                if (btnGoSheet) btnGoSheet.style.display = 'none';
                if (btnSubmit)  btnSubmit.style.display  = '';
            }
            showToast('点検シートの入力が完了しました。「申請する」ボタンで申請できます。', 'success');
        } else {
            // 組立(assembly)・2000番台の試運転(test_run)は詳細モーダル経由のフローのため、モーダルが閉じている間は自動で開かない
            const { data: draft } = await db.from('approval_requests').select('flow_type, project_number').eq('id', draftId).single();
            if (draft?.flow_type === 'assembly' || (draft?.flow_type === 'test_run' && is2000sSeries(draft.project_number))) {
                const flowLabel = draft.flow_type === 'assembly' ? '組立' : '試運転';
                showToast(`チェックシートの入力を保存しました。進捗一覧の${flowLabel}フローから内容を確認してください。`, 'success');
                return;
            }
            // モーダルが閉じていれば自動で開く
            await openDraftInSubmitModal(draftId);
            showToast('点検シートの入力が完了しました。内容を確認して申請してください。', 'success');
        }
    });
}

// ===== チェックシート 項目選択 =====
function setSheetCheck(itemId, val, btn) {
    const already = sheetChecks[itemId] === val;
    sheetChecks[itemId] = already ? null : val;
    const siblings = btn.parentElement.querySelectorAll('.sheet-btn');
    siblings.forEach(b => b.classList.remove('active'));
    if (!already) btn.classList.add('active');
    scheduleSheetSave();
}

// ===== ペンディングリスト =====
function addPendingItem() {
    pendingItems.push({ machine: '', content: '', owner: '', due: '', ship_after: false });
    renderPendingItems();
}

function removePendingItem(idx) {
    pendingItems.splice(idx, 1);
    renderPendingItems();
}

function renderPendingItems() {
    const c = document.getElementById('pending_items_container');
    if (!c) return;
    if (pendingItems.length === 0) {
        c.innerHTML = '<div style="color:#999;font-size:13px;padding:4px 0;">ペンディング項目はありません</div>';
        return;
    }
    const lbl = `<span style="display:block;font-size:11px;line-height:1.4;color:transparent;user-select:none;">完了予定日</span>`;
    c.innerHTML = pendingItems.map((item, i) => `
        <div class="pending-row">
            <div style="display:flex;flex-direction:column;flex-shrink:0;">
                ${lbl}
                <input type="text" class="pending-machine" placeholder="機器名" value="${esc(item.machine)}"
                       oninput="pendingItems[${i}].machine=this.value">
            </div>
            <div style="display:flex;flex-direction:column;flex:1;">
                ${lbl}
                <input type="text" class="pending-content" placeholder="内容" value="${esc(item.content)}"
                       oninput="pendingItems[${i}].content=this.value">
            </div>
            <div style="display:flex;flex-direction:column;width:110px;flex-shrink:0;">
                <span style="display:block;font-size:11px;line-height:1.4;color:#999;">担当者（任意）</span>
                <input type="text" class="pending-content" placeholder="担当者名" value="${esc(item.owner || '')}"
                       oninput="pendingItems[${i}].owner=this.value">
            </div>
            <div style="display:flex;flex-direction:column;width:135px;flex-shrink:0;">
                <span style="display:block;font-size:11px;line-height:1.4;color:#999;">完了予定日</span>
                <input type="date" class="pending-due" value="${esc(item.due)}"
                       onchange="pendingItems[${i}].due=this.value">
            </div>
            <label style="display:flex;flex-direction:column;flex-shrink:0;align-items:center;gap:2px;">
                <span style="font-size:11px;color:#999;">出荷後対応</span>
                <input type="checkbox" ${item.ship_after ? 'checked' : ''}
                       onchange="pendingItems[${i}].ship_after=this.checked">
            </label>
            <div style="display:flex;flex-direction:column;flex-shrink:0;">
                ${lbl}
                <button type="button" class="btn-xs btn-danger-xs" onclick="removePendingItem(${i})">削除</button>
            </div>
        </div>
    `).join('');
}

// ===== チェックシートデータ収集 =====
function collectSheetData() {
    const checks = {};
    Object.entries(sheetChecks).forEach(([k, v]) => {
        if (v) {
            const noteEl = document.getElementById('sn_' + k);
            checks[k] = { result: v, note: noteEl ? noteEl.value.trim() : '' };
        }
    });
    const pending = pendingItems.filter(p => p.content || p.machine);
    return { check_items: checks, pending_items: pending };
}

async function submitRequest() {
    if (requireLogin()) return;
    const projectNum = currentProjectNum;
    const isAssembly = currentFlowType === 'assembly';
    // 2000番台のユニット単位電装下書き（assembly_itemsを持つ）も組立と同じく機械選択欄を使わない
    const isElectricalUnitFlow = currentFlowType === 'electrical' && currentDraftHasAssemblyItems;
    const isAssemblyItemsFlow = isAssembly || isElectricalUnitFlow;
    const machineNums = isAssemblyItemsFlow ? [] : getSelectedMachines('submit_machine_list');
    if (!projectNum)          { showToast('工事番号が設定されていません', 'error'); return; }
    if (currentFlowType === 'shipping_prep') {
        const blockerLists = await Promise.all(machineNums.map(m => _getPrepBlockers(projectNum, m)));
        if (blockerLists.some(list => list.length > 0)) {
            showToast('前フローが未完了のため申請できません', 'error');
            return;
        }
    }
    if (!isAssemblyItemsFlow && machineNums.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (isAssemblyItemsFlow && !currentDraftId) { showToast('チェックシートで機械・ユニットを入力してください', 'error'); return; }
    if (currentFlowType === 'shipping_prep') {
        if (!confirm(`${machineNums.length}機械の出荷準備完了を申請します。\n承認は不要で、関係者に完了通知がすぐに送信されます。よろしいですか？`)) return;
    }

    const note    = document.getElementById('submit_note').value.trim();
    const btn     = document.getElementById('submit_btn');
    btn.disabled  = true;
    btn.textContent = '申請中...';
    showLoading('処理中...');

    try {
        const submitterRole = getEffectiveRole();
        let firstApproverRole = null;
        let assemblyItemCount = 0;

        if (isAssembly) {
            // 組立は1申請=1レコード。複数機械・ユニットはassembly_itemsにまとめて入力済み（sheet.html側）
            const { data: draftReq } = await db.from('approval_requests')
                .select('assembly_items, sheet_data').eq('id', currentDraftId).single();
            const items = (draftReq?.assembly_items || []).filter(it => it && it.machine);
            if (items.length === 0) {
                showToast('機械を1件以上入力してください（チェックシート内）', 'error');
                return;
            }
            const checkItems = draftReq?.sheet_data?.check_items || {};
            const missingItems = ASSEMBLY_REQUIRED_ITEM_IDS.filter(id => !checkItems[id]?.result);
            if (missingItems.length > 0 || !draftReq?.sheet_data?.meta?.completion_date) {
                showToast('チェックシートの必須項目・組立完了日が未入力です。チェックシートを開いて入力してください。', 'error');
                return;
            }
            assemblyItemCount = items.length;

            const { data: req, error: e1 } = await db.from('approval_requests').update({
                status:         'submitted',
                note:           note || null,
                machine_name:   buildAssemblyMachineNameSummary(items),
                test_run:       null,
                has_inspection: null
            }).eq('id', currentDraftId).select().single();
            if (e1) throw e1;

            let stepsToInsert, notifyRoles;
            if (submitterRole === 'assembly_manager') {
                // 課長申請: 部長のみ1ステップ
                stepsToInsert = [{ request_id: req.id, step_order: 1, approver_role: 'assembly_director', status: 'pending' }];
                notifyRoles = ['assembly_director'];
            } else {
                // staff申請: 課長・部長の並列2ステップ（どちらかが承認で完了）
                stepsToInsert = [
                    { request_id: req.id, step_order: 1, approver_role: 'assembly_manager',  status: 'pending' },
                    { request_id: req.id, step_order: 2, approver_role: 'assembly_director', status: 'pending' }
                ];
                notifyRoles = ['assembly_manager', 'assembly_director'];
            }
            firstApproverRole = notifyRoles[0];
            await db.from('approval_steps').insert(stepsToInsert);
            for (const role of notifyRoles) {
                const { data: approvers } = await db.from('profiles').select('id').eq('role', role);
                if (approvers?.length > 0) {
                    await db.from('approval_notifications').insert(
                        approvers.map(a => ({ request_id: req.id, recipient_id: a.id, notification_type: 'approval_request' }))
                    );
                }
            }
        } else if (isElectricalUnitFlow) {
            // 2000番台：電装もユニット単位申請の場合はassembly_itemsにまとめて入力済み（denki_sheet.html側）
            const { data: draftReq } = await db.from('approval_requests')
                .select('assembly_items, sheet_data').eq('id', currentDraftId).single();
            const items = getAssemblyItemsForReq(draftReq || {}).filter(it => it && it.machine);
            if (items.length === 0) {
                showToast('機械が未設定です。', 'error');
                return;
            }
            const checkItems = draftReq?.sheet_data?.check_items || {};
            const missingItems = ELECTRICAL_REQUIRED_ITEM_IDS.filter(id => !checkItems[id]?.result);
            if (missingItems.length > 0 || !draftReq?.sheet_data?.meta?.completion_date) {
                showToast('チェックシートの必須項目・完了日が未入力です。チェックシートを開いて入力してください。', 'error');
                return;
            }
            assemblyItemCount = items.length;

            const { data: req, error: e1 } = await db.from('approval_requests').update({
                status:       'submitted',
                note:         note || null,
                machine_name: buildAssemblyMachineNameSummary(items)
            }).eq('id', currentDraftId).select().single();
            if (e1) throw e1;

            // 電装: 課長相当のロールが無いため、常に組立部長の単一ステップ
            firstApproverRole = 'assembly_director';
            await db.from('approval_steps').insert(
                [{ request_id: req.id, step_order: 1, approver_role: 'assembly_director', status: 'pending' }]
            );
            const { data: approvers } = await db.from('profiles').select('id').eq('role', 'assembly_director');
            if (approvers?.length > 0) {
                await db.from('approval_notifications').insert(
                    approvers.map(a => ({ request_id: req.id, recipient_id: a.id, notification_type: 'approval_request' }))
                );
            }
        } else {
            // 機械ごとに申請レコードを作成（複数機械対応。assembly以外は現状通り機械単位）
            for (const machineNum of machineNums) {
                // 機械ごとにタスクフラグを取得（2000番台の試運転はユニット単位申請のため、ユニットがあれば絞り込む）
                let mTaskQuery = db.from('tasks').select('text').eq('project_number', projectNum).eq('machine', machineNum);
                if (currentFlowType === 'test_run' && currentUnitName) mTaskQuery = mTaskQuery.eq('unit', currentUnitName);
                const { data: mTasks } = await mTaskQuery;
                const mNames = (mTasks || []).map(t => t.text);

                // shipping_prep は承認不要。申請＝完了のため、最初から completed 相当の approved で作成する
                const initialStatus = currentFlowType === 'shipping_prep' ? 'approved' : 'submitted';

                let req, e1;
                if (currentDraftId && machineNum === machineNums[0]) {
                    // 下書きを更新して提出（sheet_data は sheet.html で保存済み）
                    ({ data: req, error: e1 } = await db.from('approval_requests').update({
                        status:         initialStatus,
                        note:           note || null,
                        test_run:       mNames.includes('試運転'),
                        has_inspection: mNames.includes('外観検査')
                    }).eq('id', currentDraftId).select().single());
                } else {
                    ({ data: req, error: e1 } = await db.from('approval_requests').insert({
                        project_number: projectNum,
                        machine_name:   machineNum,
                        unit_name:      currentUnitName || null,
                        flow_type:      currentFlowType,
                        status:         initialStatus,
                        requester_id:   currentUser.id,
                        note:           note || null,
                        test_run:       mNames.includes('試運転'),
                        has_inspection: mNames.includes('外観検査'),
                        sheet_data:     null
                    }).select().single());
                }
                if (e1) throw e1;

                if (currentFlowType === 'shipping_prep') {
                    // 承認ステップは作らず、関係者へ完了通知のみ記録する
                    await recordFlowNotifications(req.id, 'shipping_prep');
                    continue;
                }

                // 承認ステップ設定
                let stepsToInsert;
                let notifyRoles; // 承認依頼通知を送るロールの配列
                if (currentFlowType === 'electrical') {
                    // 電装: 課長相当のロールが無いため、常に組立部長の単一ステップ
                    stepsToInsert = [{ request_id: req.id, step_order: 1, approver_role: 'assembly_director', status: 'pending' }];
                    notifyRoles = ['assembly_director'];
                } else {
                    // test_run: assemblyと同じ並列承認（どちらかが承認で完了）
                    if (submitterRole === 'operations_manager') {
                        // 課長申請: 部長のみ1ステップ
                        stepsToInsert = [{ request_id: req.id, step_order: 1, approver_role: 'operations_director', status: 'pending' }];
                        notifyRoles = ['operations_director'];
                    } else {
                        // staff申請: 課長・部長の並列2ステップ（どちらかが承認で完了）
                        stepsToInsert = [
                            { request_id: req.id, step_order: 1, approver_role: 'operations_manager',  status: 'pending' },
                            { request_id: req.id, step_order: 2, approver_role: 'operations_director', status: 'pending' }
                        ];
                        notifyRoles = ['operations_manager', 'operations_director'];
                    }
                }
                if (!firstApproverRole) firstApproverRole = notifyRoles[0];
                await db.from('approval_steps').insert(stepsToInsert);

                for (const role of notifyRoles) {
                    const { data: approvers } = await db.from('profiles').select('id').eq('role', role);
                    if (approvers?.length > 0) {
                        await db.from('approval_notifications').insert(
                            approvers.map(a => ({ request_id: req.id, recipient_id: a.id, notification_type: 'approval_request' }))
                        );
                    }
                }
            }
        }

        currentDraftId = null;
        closeSubmitModal();
        await refreshAll();
        ui.send('SAVED');
        if (isAssembly) {
            const isParallelStaff = submitterRole !== 'assembly_manager';
            const approverLabel = isParallelStaff ? '組立課長・部長' : '組立部長';
            showToast(`組立完了を申請しました（機械${assemblyItemCount}件）。\n${approverLabel}に承認依頼が届きます。`, 'success');
        } else if (isElectricalUnitFlow) {
            showToast(`電装完了を申請しました（機械${assemblyItemCount}件）。\n組立部長に承認依頼が届きます。`, 'success');
        } else if (currentFlowType === 'shipping_prep') {
            showToast(`${machineNums.length}機械の出荷準備完了を申請しました。\n関係者に完了通知が届きます。`, 'success');
        } else {
            const isParallelStaff = currentFlowType === 'test_run' && submitterRole !== 'operations_manager';
            const approverLabel = isParallelStaff
                ? '操業課長・部長'
                : ({ assembly_director: '組立部長', operations_director: '操業部長' }[firstApproverRole] || firstApproverRole);
            showToast(`${machineNums.length}機械の申請をしました。\n${approverLabel}に承認依頼が届きます。`, 'success');
        }
    } catch (e) {
        showToast('申請に失敗しました: ' + e.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = currentFlowType === 'shipping_prep' ? '完了申請する' : '申請する';
        hideLoading();
    }
}

// ===== ペンディングセクション HTML 生成 =====
function buildPendingSectionInner(req, isMyRequest) {
    const isQaFlow   = QA_MEETING_FLOWS.includes(req.flow_type);
    // 試運転は「試運転完了時の伝達事項」の一覧であり、完了操作自体を持たない（閲覧専用、承認後は編集・削除も不可）
    const isTestRun  = req.flow_type === 'test_run';
    // 組立フローの担当部署の上司（組立課長・部長）も完了操作できる
    const isFlowSupervisor = (FLOW_SUPERVISOR_ROLES[req.flow_type] || []).includes(getEffectiveRole());
    // 組立フローは担当部署（組立部）の部員なら誰でも完了操作できる
    const isFlowDeptMember = getEffectiveDept() === FLOW_DEPARTMENTS[req.flow_type];
    // 組立フローは「申請者本人」「品証・製管」「担当部署の課長・部長」「担当部署の部員全員」が完了操作できる（担当者本人は下記itemCanComplete参照）
    const statusOkForNonQa = ['submitted', 'in_review', 'approved'].includes(req.status);
    const canComplete = (isQaFlow || isTestRun)
        ? null // QAフローは項目ごとに判定する（下記itemCanComplete）。試運転は完了操作自体が無い
        : (statusOkForNonQa && (isMyRequest || isQualityOrSeikan || isFlowSupervisor || isFlowDeptMember));
    // ペンディング項目は品証・製管であれば編集・削除できる（組立フローは提出〜承認済みの間、QAフローは開催案内送信済み〜完了後も可能）。試運転は編集・削除自体を廃止（閲覧専用）
    const canManage = isQualityOrSeikan && (isQaFlow ? ['submitted', 'approved'].includes(req.status) : (isTestRun ? false : statusOkForNonQa));
    const allItems = req.sheet_data?.pending_items || [];
    const items = allItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => (item.content || item.machine));
    if (!items.length) return '';
    const editLbl = `<span style="display:block;font-size:11px;line-height:1.4;color:#999;">完了予定日</span>`;
    // 試運転フローは「ペンディング項目」ではなく「申し送り事項」と呼ぶ
    const sectionLabel = isQaFlow ? 'タスクリスト' : (isTestRun ? '申し送り事項' : 'ペンディング項目');
    return `
        <hr class="section-divider">
        <div class="section-title">${sectionLabel}</div>
        ${items.map(({ item, idx }, pos) => {
            // QAフロー・組立フローともに「品証」または「担当者本人（項目に担当者が設定されている場合）」も完了操作できる
            // QAフローのタスクリストはさらに、担当者の上長（組立課長/部長・操業課長/部長）も完了操作できる
            const itemCanComplete = isTestRun
                ? false
                : (isQaFlow
                    ? (['submitted', 'approved'].includes(req.status) && (isQualityOrSeikan || (item.owner && currentProfile?.name === item.owner) || isSupervisorOfOwner(item.owner)))
                    : (canComplete || (statusOkForNonQa && item.owner && currentProfile?.name === item.owner)));
            if (canManage && qaEditingPendingIdx === idx) {
                return `
            <div class="pending-detail-row pending-detail-editing">
                <div class="pending-detail-num">${circledNum(pos + 1)}</div>
                <div class="pending-detail-content qa-pending-row" style="display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;gap:6px;">
                        <div style="display:flex;flex-direction:column;flex:1;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">場所</span>
                            <input type="text" id="qa_edit_location_${idx}" class="pending-content" placeholder="場所" value="${esc(item.location || '')}">
                        </div>
                        <div style="display:flex;flex-direction:column;flex:1;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">担当者</span>
                            <input type="text" id="qa_edit_owner_${idx}" class="pending-content" placeholder="担当者名" value="${esc(item.owner || '')}">
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap;">
                        <div style="display:flex;flex-direction:column;flex:1;min-width:120px;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">内容</span>
                            <input type="text" id="qa_edit_content_${idx}" class="pending-content" placeholder="内容" value="${esc(item.content)}">
                        </div>
                        ${isTestRun ? '' : `
                        <div style="display:flex;flex-direction:column;flex-shrink:0;">
                            ${editLbl}
                            <input type="date" id="qa_edit_due_${idx}" class="pending-due" value="${esc(item.due || '')}">
                        </div>
                        <label style="display:flex;flex-direction:column;flex-shrink:0;gap:4px;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">出荷後対応</span>
                            <input type="checkbox" id="qa_edit_ship_after_${idx}" ${item.ship_after ? 'checked' : ''} style="margin-top:2px;">
                        </label>`}
                    </div>
                    <div style="display:flex;flex-direction:column;">
                        <span style="display:block;font-size:14px;line-height:1.4;color:#999;">写真</span>
                        ${item.photo_path ? `<img src="${esc(pendingPhotoUrl(item.photo_path))}" class="pending-detail-photo-thumb" title="クリックで拡大表示" onclick="openPhotoLightbox('${esc(pendingPhotoUrl(item.photo_path))}')">` : ''}
                        <div class="photo-dropzone">
                            <input type="file" accept="image/*" capture="environment" id="qa_edit_photo_${idx}" style="display:none;">
                            <span class="photo-dropzone-label">クリックまたはドラッグ＆ドロップで写真を選択</span>
                        </div>
                        ${item.photo_path ? `
                        <label style="font-size:13px;color:#999;display:flex;align-items:center;gap:2px;">
                            <input type="checkbox" id="qa_edit_photo_remove_${idx}"> 写真を削除
                        </label>` : ''}
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
                    <button class="btn-success-xs" onclick="saveEditQaPendingItem('${req.id}', ${idx})">保存</button>
                    <button class="btn-undo-xs" onclick="cancelEditQaPendingItem()">キャンセル</button>
                </div>
            </div>`;
            }
            return `
            <div class="pending-detail-row ${!isTestRun && item.completed ? 'pending-done' : ''}">
                <div class="pending-detail-num">${circledNum(pos + 1)}</div>
                ${item.photo_path
                    ? `<img src="${esc(pendingPhotoUrl(item.photo_path))}" class="pending-detail-photo-thumb" title="クリックで拡大表示" onclick="openPhotoLightbox('${esc(pendingPhotoUrl(item.photo_path))}')">`
                    : `<div class="pending-detail-photo-placeholder"></div>`}
                <div class="pending-detail-content">
                    <div class="pending-detail-text">${item.machine ? `<span class="pending-detail-machine">${esc(item.machine)}</span> ` : ''}${esc(item.content || '—')}${isTestRun ? '' : (item.completed ? ' <span style="font-size:12px;color:#1c8f4d;background:#eafaf0;border-radius:4px;padding:1px 6px;">完了</span>' : (pendingDueSoon(item.due) ? ' <span style="font-size:12px;color:#c0392b;background:#fde8e8;border-radius:4px;padding:1px 6px;">期日間近</span>' : ''))}${!isTestRun && item.ship_after ? ' <span class="badge-ship-after" style="font-size:12px;color:#a06a00;background:#fff3d6;border-radius:4px;padding:1px 6px;">出荷後対応</span>' : ''}</div>
                    ${item.location ? `<div class="pending-detail-owner">場所: ${esc(item.location)}</div>` : ''}
                    ${item.owner ? `<div class="pending-detail-owner">担当: ${esc(item.owner)}</div>` : ''}
                    ${!isTestRun && item.due && !item.completed ? `<div class="pending-detail-due">期日: ${esc(item.due)}</div>` : ''}
                    ${!isTestRun && item.completed ? `<div class="pending-detail-date">完了: ${esc(item.completed_date || '')}</div>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    ${itemCanComplete ? (item.completed
                        ? `<button class="btn-undo-xs" onclick="uncompletePendingItem('${req.id}', ${idx})">取り消す</button>`
                        : `<button class="btn-primary-xs" onclick="completePendingItem('${req.id}', ${idx}, {isQaFlow: ${isQaFlow}})">完了にする</button>`) : ''}
                    ${canManage && !item.completed ? `
                        <button class="btn-icon-xs" title="編集" onclick="startEditQaPendingItem(${idx})">✎</button>
                        <button class="btn-icon-xs btn-icon-danger" title="削除" onclick="deleteQaPendingItem('${req.id}', ${idx})">🗑</button>
                    ` : ''}
                </div>
            </div>`;
        }).join('')}`;
}

// QA開催案内（簡易検査・外観検査・出荷確認会議）の開催日が過ぎているか
function qaMeetingPassed(req) {
    const _now     = new Date();
    const todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
    return !!req.inspection_date && req.inspection_date <= todayStr;
}

// QA開催案内を「完了にする」ボタンを出せる状態か（開催＝完了。ペンディングの有無は別問題として扱う）
function qaCanFinalize(req) {
    if (!QA_MEETING_FLOWS.includes(req.flow_type)) return false;
    if (!isQualityOrSeikan || req.status !== 'submitted') return false;
    return qaMeetingPassed(req);
}

// ===== 開催結果・ペンディング確認セクション HTML 生成（簡易検査・外観検査・出荷確認会議） =====
function buildQaResultSectionInner(req, isMyRequest) {
    const meetingPassed = qaMeetingPassed(req);
    // 開催＝完了のため、完了後（approved）もペンディングの追加・編集・削除は継続して可能にする
    const canManage     = isQualityOrSeikan && ['submitted', 'approved'].includes(req.status);

    let body;
    if (!meetingPassed) {
        body = '<div style="color:#888; font-size:15px; padding:4px 0;">開催日以降にタスク確認・完了操作ができます。</div>';
    } else {
        const pendingHtml = buildPendingSectionInner(req, isMyRequest);
        const hasSendableItems = (req.sheet_data?.pending_items || []).some(it => it.content);
        const sendCardBtnHtml = (isQualityOrSeikan && hasSendableItems) ? `
            <div style="margin-top:10px;">
                <button type="button" class="btn btn-primary" title="検査の開催案内と同じ宛先に送信されます" onclick="sendFixCard('${req.id}')">✉ タスクリストを送信</button>
            </div>
        ` : '';
        const addFormHtml = canManage ? `
            <div class="qa-pending-add-box">
                <div class="qa-pending-add-label">タスクを追加</div>
                <div class="pending-row qa-pending-row" style="flex-direction:column;align-items:stretch;gap:8px;">
                    <div style="display:flex;gap:6px;">
                        <div style="display:flex;flex-direction:column;flex:1;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">場所（任意）</span>
                            <input type="text" id="qa_pending_location" class="pending-content" placeholder="場所">
                        </div>
                        <div style="display:flex;flex-direction:column;flex:1;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">担当者（任意）</span>
                            <input type="text" id="qa_pending_owner" class="pending-content" placeholder="担当者名">
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap;">
                        <div style="display:flex;flex-direction:column;flex:1;min-width:120px;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">内容</span>
                            <input type="text" id="qa_pending_content" class="pending-content" placeholder="内容">
                        </div>
                        <div style="display:flex;flex-direction:column;flex-shrink:0;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">完了予定日</span>
                            <input type="date" id="qa_pending_due" class="pending-due">
                        </div>
                        <label style="display:flex;flex-direction:column;flex-shrink:0;gap:4px;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">出荷後対応</span>
                            <input type="checkbox" id="qa_pending_ship_after" style="margin-top:2px;">
                        </label>
                    </div>
                    <div style="display:flex;flex-direction:column;">
                        <span style="display:block;font-size:14px;line-height:1.4;color:#999;">写真（任意）</span>
                        <div class="photo-dropzone">
                            <input type="file" accept="image/*" capture="environment" id="qa_pending_photo" style="display:none;">
                            <span class="photo-dropzone-label">クリックまたはドラッグ＆ドロップで写真を選択</span>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:flex-end;">
                        <button type="button" class="btn-xs" onclick="addQaPendingItem('${req.id}')">保存</button>
                    </div>
                </div>
            </div>
        ` : '';
        body = (pendingHtml || addFormHtml)
            ? `<div id="pending_detail_section">${pendingHtml}</div>${addFormHtml}${sendCardBtnHtml}`
            : `<div style="color:#888; font-size:15px; padding:4px 0;">タスクなし${req.status === 'approved' ? '・確認完了' : ''}</div>`;
    }

    // 開催案内が過ぎておりペンディング項目がある場合は、buildPendingSectionInner側の区切り線が使われるため、ここでは重ねて出さない
    const needsOwnDivider = !meetingPassed || !(req.sheet_data?.pending_items || []).some(it => it.content || it.machine);
    return `${needsOwnDivider ? '<hr class="section-divider">' : ''}
        ${body}`;
}

// assembly・test_run・electrical: 複数ステップのうち承認/却下が確定した1つ、または申請中の状態を丸1つで表示する
// （課長/部長の並列承認や電装の単一承認など、フロー種別が異なっても表示形式は共通）
function _renderSingleApprovalStep(req, steps, approverNames) {
    const approvedStep = steps.find(s => s.status === 'approved');
    const rejectedStep = steps.find(s => s.status === 'rejected');
    const activeStep   = approvedStep || rejectedStep;
    let icon, sc;
    if      (approvedStep)               { icon = '✓'; sc = 'sc-approved'; }
    else if (rejectedStep)               { icon = '<span class="fc-x-icon">×</span>'; sc = 'sc-rejected'; }
    else if (req.status === 'submitted') { icon = '<span class="fc-play-icon">▶</span>'; sc = 'sc-pending'; }
    else                                  { icon = '○';  sc = 'sc-waiting'; }
    const who   = activeStep?.approver_id ? (approverNames[activeStep.approver_id] || '—') : null;
    const when  = activeStep?.decided_at ? fmtDate(activeStep.decided_at) : '';
    const label = approvedStep ? '承認' : rejectedStep ? '却下' : (req.status === 'submitted' ? '承認待ち' : '未承認');
    return `
        <div class="step-item">
            <div class="step-circle ${sc}">${icon}</div>
            <div class="step-detail">
                <div class="step-label">${label}</div>
                ${who
                    ? `<div class="step-name">${esc(who)}</div>`
                    : '<div class="step-name" style="color:#bbb;">未</div>'}
                ${activeStep?.comment ? `<div class="step-comment">"${esc(activeStep.comment)}"</div>` : ''}
                ${when               ? `<div class="step-date">${when}</div>` : ''}
            </div>
        </div>`;
}

// ===== Detail Modal =====
async function openDetailModal(requestId, returnTo = null) {
    document.getElementById('detail_modal').classList.add('open');
    document.getElementById('detail_body').innerHTML   = '<div class="loading-indicator">読み込み中...</div>';
    // 一覧モーダル経由（returnTo指定）以外の通常呼び出しでは、前回の戻り先情報が残らないよう必ずクリアする
    assemblyDetailReturnProjectNum = null;
    assemblyDetailReturnMachine = null;
    testRunDetailReturnProjectNum = null;
    testRunDetailReturnMachine = null;
    if (returnTo?.type === 'assembly') {
        if (returnTo.machine) assemblyDetailReturnMachine = { projectNum: returnTo.projectNum, machine: returnTo.machine };
        else assemblyDetailReturnProjectNum = returnTo.projectNum;
    } else if (returnTo?.type === 'test_run') {
        if (returnTo.machine) testRunDetailReturnMachine = { projectNum: returnTo.projectNum, machine: returnTo.machine };
        else testRunDetailReturnProjectNum = returnTo.projectNum;
    }
    document.getElementById('detail_footer').innerHTML = `<button class="btn btn-secondary" onclick="closeDetailModal()">${detailModalCloseButtonLabel()}</button>`;
    ui.send('OPEN_DETAIL');

    const { data: req } = await db
        .from('approval_requests')
        .select(`*, machine_name, approval_steps ( id, step_order, approver_role, approver_id, status, comment, decided_at )`)
        .eq('id', requestId)
        .single();

    // draft は申請者本人なら申請モーダルへリダイレクト
    if (req?.status === 'draft') {
        document.getElementById('detail_modal').classList.remove('open');
        ui.send('CLOSE');
        if (req.requester_id === currentUser.id) {
            await openDraftInSubmitModal(requestId);
        } else {
            showToast('この申請はまだ入力中です', 'info');
        }
        return;
    }

    // 申請者名を別途取得
    let requesterName = '—';
    if (req?.requester_id) {
        const { data: rp } = await db.from('profiles').select('name').eq('id', req.requester_id).single();
        if (rp) requesterName = rp.name;
    }

    if (!req) {
        document.getElementById('detail_body').innerHTML = '<div class="empty"><div class="empty-text">データが見つかりません</div></div>';
        return;
    }

    const steps  = (req.approval_steps || []).sort((a, b) => a.step_order - b.step_order);
    currentDetailReq = req;
    currentDetailFlowType = req.flow_type || '';
    qaEditingPendingIdx = null;
    const pNum   = req.project_number || '—';
    const pInfo  = projectsMap[pNum]  || {};
    const cls    = STATUS_CLASSES[req.status] || 's-pending';

    // 梱包出荷タスクの有無判定（工程表に梱包出荷タスクがあれば梱包出荷日の入力欄も表示する）
    // 梱包出荷は機械単位ではなく工事番号全体で1つの場合があるため machine では絞り込まない
    // あわせて工程表側のタスク日付を取得し、承認フロー側の日付とのズレを検知する
    let hasPackingShipping = false;
    let packingState = 'unknown'; // 'yes'（実タスクあり）/ 'no'（なしと設定済み）/ 'unknown'（未定）
    const shippingDateMismatches = [];
    let shippingDateHistory = [];
    if (req.flow_type === 'shipping') {
        const [{ data: factoryTasks }, { data: packingTasks }, { data: changeLogRows }] = await Promise.all([
            req.machine_name
                ? db.from('tasks').select('end_date').eq('project_number', pNum).eq('machine', req.machine_name).eq('text', '工場出荷').order('end_date', { ascending: true })
                : Promise.resolve({ data: [] }),
            db.from('tasks').select('start_date, end_date').eq('project_number', pNum).eq('text', '梱包出荷').limit(1),
            db.from('shipping_date_change_log').select('*').eq('request_id', req.id).order('changed_at', { ascending: false })
        ]);
        shippingDateHistory = changeLogRows || [];
        // 分割出荷（同一機械に工場出荷タスクが複数）の件数。①②の入力欄出し分けに使う
        currentDetailShippingTaskCount = (factoryTasks || []).length || 1;
        // 梱包出荷は有無未定の間、開始日・終了日が空のプレースホルダータスクとして工程表に常設されるため、
        // 実際に日付が入って初めて「梱包出荷あり」として扱う
        hasPackingShipping = !!(packingTasks && packingTasks.length > 0 && packingTasks[0].start_date);
        packingState = getPackingDisplayState(pNum, hasPackingShipping);

        const factoryTaskDate = factoryTasks?.[0]?.end_date || null;
        const packingTaskDate = packingTasks?.[0]?.end_date || null;
        const approvalFactoryDate = req.confirmed_shipping_date;
        const approvalPackingDate = req.packing_confirmed_shipping_date;

        if (approvalFactoryDate && factoryTaskDate && approvalFactoryDate !== factoryTaskDate) {
            shippingDateMismatches.push(`工場出荷: 承認フロー ${fmtDate(approvalFactoryDate)} / 工程表 ${fmtDate(factoryTaskDate)}`);
        }
        if (approvalPackingDate && packingTaskDate && approvalPackingDate !== packingTaskDate) {
            shippingDateMismatches.push(`梱包出荷: 承認フロー ${fmtDate(approvalPackingDate)} / 工程表 ${fmtDate(packingTaskDate)}`);
        }
        if (packingState === 'yes' && !hasPackingShipping) {
            shippingDateMismatches.push('梱包出荷が「あり」に設定されていますが、工程表に梱包出荷タスクが未登録です');
        }
    }
    currentDetailHasPackingShipping = hasPackingShipping;

    const slbl   = statusBadgeLabel(req);

    // 自分が担当すべきステップか確認（shipping_prep は承認不要のため対象外）
    const myStep = steps.find(s =>
        (s.approver_role === getEffectiveRole() || isSuperAdmin()) &&
        s.status        === 'pending' &&
        (
            ((req.flow_type === 'assembly' || req.flow_type === 'test_run') && req.status === 'submitted') ||
            (s.step_order === 1 && req.status === 'submitted') ||
            (s.step_order === 2 && req.status === 'in_review')
        )
    );
    const isMyRequest   = req.requester_id === currentUser.id;
    const canReschedule = QA_MEETING_FLOWS.includes(req.flow_type)
        && (isMyRequest || isQualityOrSeikan)
        && req.status === 'submitted';

    // 出荷日変更リンク（品証・製管の確認や常務の承認が済んだ後でも、日付を変更できるようにする）
    const isSales = (getEffectiveRole() === 'staff' && getEffectiveDept() === '営業') || isSuperAdmin();
    const canChangeConfirmedDate = req.flow_type === 'shipping' && !!req.confirmed_shipping_date
        && ['awaiting_shipping_confirm', 'submitted', 'approved'].includes(req.status)
        && (isSales || isQualityOrSeikan) && !myStep;
    const changeDateOnclick = `showChangeConfirmedDateFooter('${req.id}')`;
    const changeDateLabel = hasPackingShipping ? '工場出荷日・梱包出荷日を変更する' : '確定出荷日を変更する';
    // ズレ警告バナー内に変更ボタンを表示する場合は、フッター側には重複して表示しない
    const changeDateBannerButtonHtml = canChangeConfirmedDate
        ? `<button type="button" class="btn btn-outline" onclick="${changeDateOnclick}">${changeDateLabel}</button>`
        : '';
    const changeDateFooterLinkHtml = (!shippingDateMismatches.length && canChangeConfirmedDate)
        ? `<button type="button" class="btn btn-outline" style="margin-right:auto;" onclick="${changeDateOnclick}">${changeDateLabel}</button>`
        : '';

    // プロフィール名を取得（承認者＋出荷日変更者）
    const approverIds = new Set(steps.filter(s => s.approver_id).map(s => s.approver_id));
    shippingDateHistory.forEach(h => { if (h.changed_by) approverIds.add(h.changed_by); });
    let approverNames = {};
    if (approverIds.size > 0) {
        const { data: prs } = await db.from('profiles').select('id, name').in('id', [...approverIds]);
        if (prs) prs.forEach(p => { approverNames[p.id] = p.name; });
    }

    // shipping: 担当者確認セクション用にtasksを取得
    let shippingOwners = null;
    let shippingInspectionLabel = '検査';
    if (req.flow_type === 'shipping') {
        const { data: sTasks } = await db.from('tasks')
            .select('text, owner, major_item')
            .eq('project_number', pNum)
            .eq('machine', req.machine_name)
            .in('text', ['機械組立', '試運転', '出図']);
        const { data: sData } = await db.from('app_settings').select('value').eq('key', 'sales_person_map').single();
        const salesOwner = (sData?.value ? JSON.parse(sData.value) : {})[pNum] || null;
        const findO = (text, major) => [...new Set((sTasks || [])
            .filter(t => t.text === text && (!major || (t.major_item || '').trim() === major))
            .flatMap(t => splitOwnerNames(t.owner)))].join('・') || 'なし';
        const tripOwners = await getBusinessTripOwnerNames(pNum);
        shippingOwners = {
            sekkei:   findO('出図', '設計'),
            kumitatе: findO('機械組立'),
            shiunten: findO('試運転'),
            sales:    salesOwner || 'なし',
            trip:     tripOwners.join('、') || 'なし'
        };
        shippingInspectionLabel = await _getInspectionFlowLabel(pNum, req.machine_name);
    }

    let stepsHtml;
    if (req.flow_type === 'assembly' || req.flow_type === 'test_run' || req.flow_type === 'electrical') {
        // assembly/test_run/electrical: 単一の「承認」として表示、承認者名・役職を表示
        stepsHtml = _renderSingleApprovalStep(req, steps, approverNames);
    } else if (req.flow_type === 'shipping') {
        // shipping: 常務承認ステップ（担当者確認は参考情報として別枠に表示）
        const step = steps[0];
        let icon, sc;
        if      (step?.status === 'approved') { icon = '✓'; sc = 'sc-approved'; }
        else if (step?.status === 'rejected') { icon = '<span class="fc-x-icon">×</span>'; sc = 'sc-rejected'; }
        else if (req.status === 'submitted')  { icon = '<span class="fc-play-icon">▶</span>'; sc = 'sc-pending'; }
        else                                  { icon = '○';  sc = 'sc-waiting'; }
        const who   = step?.approver_id ? (approverNames[step.approver_id] || '—') : null;
        const when  = step?.decided_at ? fmtDate(step.decided_at) : '';
        const label = step?.status === 'approved' ? '承認' : step?.status === 'rejected' ? '却下' : (req.status === 'submitted' ? '承認待ち' : '未承認');
        stepsHtml = `
        <div class="step-item">
            <div class="step-circle ${sc}">${icon}</div>
            <div class="step-detail">
                <div class="step-label">${label}</div>
                ${who
                    ? `<div class="step-name">${esc(who)}</div>`
                    : '<div class="step-name" style="color:#bbb;">未</div>'}
                ${step?.comment ? `<div class="step-comment">"${esc(step.comment)}"</div>` : ''}
                ${when          ? `<div class="step-date">${when}</div>` : ''}
            </div>
        </div>`;
    } else if (QA_MEETING_FLOWS.includes(req.flow_type)) {
        // 簡易検査・外観検査・出荷確認会議は「申請・承認状況」表示自体を出さない
        stepsHtml = '';
    } else if (req.flow_type === 'shipping_prep') {
        // shipping_prep: 承認ステップなし。申請＝完了のため、常に完了表示
        stepsHtml = `
        <div class="step-item">
            <div class="step-circle sc-approved">✓</div>
            <div class="step-detail">
                <div class="step-label">完了</div>
                <div class="step-date">${fmtDate(req.updated_at)}</div>
            </div>
        </div>`;
    } else {
        stepsHtml = steps.map(s => {
            let icon, sc;
            if      (s.status === 'approved') { icon = '✓'; sc = 'sc-approved'; }
            else if (s.status === 'rejected') { icon = '<span class="fc-x-icon">×</span>'; sc = 'sc-rejected'; }
            else if (s.status === 'pending' &&
                     ((req.flow_type === 'assembly' || req.flow_type === 'test_run') && req.status === 'submitted' ||
                      (s.step_order === 1 && req.status === 'submitted') ||
                      (s.step_order === 2 && req.status === 'in_review')))
                                              { icon = '<span class="fc-play-icon">▶</span>'; sc = 'sc-pending'; }
            else                              { icon = '○';  sc = 'sc-waiting'; }
            const who  = s.approver_id ? (approverNames[s.approver_id] || '—') : '—';
            const when = s.decided_at  ? fmtDate(s.decided_at) : '';
            return `
            <div class="step-item">
                <div class="step-circle ${sc}">${icon}</div>
                <div class="step-detail">
                    <div class="step-label">Step${s.step_order}　${ROLE_LABELS[s.approver_role] || s.approver_role}</div>
                    ${s.approver_id ? `<div class="step-name">${esc(who)}</div>` : '<div class="step-name" style="color:#bbb;">未決</div>'}
                    ${s.comment     ? `<div class="step-comment">"${esc(s.comment)}"</div>` : ''}
                    ${when          ? `<div class="step-date">${when}</div>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    document.getElementById('detail_title').textContent = QA_MEETING_FLOWS.includes(req.flow_type)
        ? (QA_DETAIL_TITLE_LABELS[req.flow_type] || req.flow_type)
        : (FLOW_LABELS[req.flow_type] || req.flow_type);
    // 状態欄の補足説明（誰が何をすべきか一目でわかるように）
    let statusNote = '';
    if (req.flow_type === 'shipping' && req.status === 'awaiting_shipping_date') {
        statusNote = '営業担当者による確定出荷日の入力待ちです。営業担当者は画面下部の入力欄からご入力ください。';
    } else if (req.flow_type === 'shipping' && req.status === 'awaiting_shipping_confirm') {
        statusNote = '営業担当者が確定出荷日を入力しました。品証が内容を確認し「内容を確認し申請する」を押すと常務に承認依頼が届きます。';
    } else if (req.status === 'rejected' && isMyRequest) {
        statusNote = '却下されました。内容を確認・修正のうえ「再申請する」から再申請してください。';
    }

    // ステップ表示の先頭に「申請」ステップを追加する（誰が・いつ申請したか）
    const appliedStepHtml = `
        <div class="step-item">
            <div class="step-circle sc-applied"><span class="applied-dot"></span></div>
            <div class="step-detail">
                <div class="step-label">申請</div>
                <div class="step-name">${esc(requesterName)}</div>
                <div class="step-date">${fmtDate(req.created_at)}</div>
            </div>
        </div>`;

    // ヘッダー下の補足情報（1行目: 開催日・場所、2行目: 出荷予定日）
    const eventInfoParts = [];
    if (QA_MEETING_FLOWS.includes(req.flow_type) && req.inspection_date) {
        eventInfoParts.push(`開催日: ${fmtDate(req.inspection_date)}${req.inspection_time ? ' ' + req.inspection_time : ''}`);
    }
    if (QA_MEETING_FLOWS.includes(req.flow_type) && req.inspection_location) eventInfoParts.push(`場所: ${esc(req.inspection_location)}`);

    const attendanceSectionHtml = (QA_MEETING_FLOWS.includes(req.flow_type) && req.inspection_date)
        ? await buildAttendanceSectionHtml(req)
        : '';

    const shippingInfoParts = [];
    if (req.flow_type === 'shipping' && req.packing_confirmed_shipping_date) {
        shippingInfoParts.push(`梱包出荷確定日: ${fmtDate(req.packing_confirmed_shipping_date)}`);
    }
    if (req.flow_type === 'shipping' && req.confirmed_shipping_date) {
        const factoryDateLabel = req.packing_confirmed_shipping_date ? '工場出荷確定日' : '確定出荷日';
        const isSplitShipping  = currentDetailShippingTaskCount >= 2;
        shippingInfoParts.push(`${isSplitShipping ? '①' : ''}${factoryDateLabel}: ${fmtDate(req.confirmed_shipping_date)}`);
        if (isSplitShipping && req.confirmed_shipping_date_2) {
            shippingInfoParts.push(`②${factoryDateLabel}: ${fmtDate(req.confirmed_shipping_date_2)}`);
        }
    }

    // 確定出荷日の変更履歴（常務承認後に日付を変更した場合のみ記録される）
    const shippingDateHistoryHtml = shippingDateHistory.length > 0 ? `
        <details style="margin-top:4px;">
            <summary style="cursor:pointer;font-size:14px;color:#888;">確定出荷日の変更履歴（${shippingDateHistory.length}件）</summary>
            <div style="font-size:13px;color:#666;margin-top:4px;padding-left:12px;border-left:2px solid #eee;">
                ${shippingDateHistory.map(h => {
                    const lines = [];
                    if (h.old_confirmed_shipping_date !== h.new_confirmed_shipping_date) {
                        lines.push(`確定出荷日: ${fmtDate(h.old_confirmed_shipping_date) || '未定'} → ${fmtDate(h.new_confirmed_shipping_date) || '未定'}`);
                    }
                    if ((h.old_confirmed_shipping_date_2 || h.new_confirmed_shipping_date_2) && h.old_confirmed_shipping_date_2 !== h.new_confirmed_shipping_date_2) {
                        lines.push(`②確定出荷日: ${fmtDate(h.old_confirmed_shipping_date_2) || '未定'} → ${fmtDate(h.new_confirmed_shipping_date_2) || '未定'}`);
                    }
                    if ((h.old_packing_confirmed_shipping_date || h.new_packing_confirmed_shipping_date) && h.old_packing_confirmed_shipping_date !== h.new_packing_confirmed_shipping_date) {
                        lines.push(`梱包出荷日: ${fmtDate(h.old_packing_confirmed_shipping_date) || '未定'} → ${fmtDate(h.new_packing_confirmed_shipping_date) || '未定'}`);
                    }
                    const who = approverNames[h.changed_by] || '';
                    return `<div style="margin-bottom:4px;">${esc(fmtDate(h.changed_at))}${who ? '　' + esc(who) + ' が変更' : ''}<br>${lines.map(esc).join('<br>')}</div>`;
                }).join('')}
            </div>
        </details>` : '';

    // ヘッダー1行目: 工事番号【機械名】　客先名／2行目: 工事名（客先名の開始位置に揃える）
    const headerLine1Left = `${esc(pNum)}${req.machine_name ? `【${esc(req.machine_name)}${req.unit_name ? '・' + esc(req.unit_name) : ''}】` : ''}`;
    document.getElementById('detail_body').innerHTML = `
        <div style="display:grid; grid-template-columns:max-content 1fr; column-gap:10px; align-items:baseline;">
            <div style="font-size:18px;font-weight:bold;color:#1e3a5f;white-space:nowrap;">${headerLine1Left}</div>
            <div style="font-size:19px;font-weight:bold;color:#1e3a5f;">${esc(pInfo.customer_name || '')}</div>
            ${pInfo.project_details ? `<div></div><div style="font-size:15px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        </div>

        <div style="margin:10px 0 8px;">
            <span class="status-badge ${cls}">${slbl}</span>
            ${req.is_resubmit ? ' <span class="resubmit-badge">再申請</span>' : ''}
        </div>
        ${eventInfoParts.length ? `<div style="font-size:15px;color:#888;margin-top:4px;display:flex;flex-wrap:wrap;column-gap:16px;row-gap:2px;">${eventInfoParts.map(p => `<span style="white-space:nowrap;">${p}</span>`).join('')}</div>` : ''}
        ${shippingInfoParts.length ? `<div style="font-size:15px;color:#888;margin-top:4px;display:flex;flex-wrap:wrap;column-gap:16px;row-gap:2px;">${shippingInfoParts.map(p => `<span style="white-space:nowrap;">${p}</span>`).join('')}</div>` : ''}
        ${shippingDateHistoryHtml}
        ${req.note ? `<div style="font-size:15px;color:#888;margin-top:2px;">備考: ${esc(req.note)}</div>` : ''}
        ${attendanceSectionHtml}
        ${shippingDateMismatches.length ? `
        <div style="background:#fdecea;border:1px solid #f5b5ac;border-radius:4px;padding:9px 12px;font-size:15px;color:#a33a2c;margin-top:8px;">
            <div style="white-space:nowrap;overflow-x:auto;">⚠ 工程表の出荷日とズレがあります（${shippingDateMismatches.join('、')}）。</div>
            ${changeDateBannerButtonHtml ? `<div style="margin-top:8px;">${changeDateBannerButtonHtml}</div>` : ''}
        </div>` : ''}
        ${statusNote ? `<div style="background:#fff8e6; border:1px solid #f0d98c; border-radius:4px; padding:9px 12px; font-size:15px; color:#7a5c00; margin-top:8px;">${esc(statusNote)}</div>` : ''}

        ${QA_MEETING_FLOWS.includes(req.flow_type) ? '' : `
        <hr class="section-divider">
        <div class="section-title">申請・承認状況</div>
        <div class="steps-list">${appliedStepHtml}${stepsHtml}</div>`}
        ${req.flow_type === 'shipping' ? `
        <hr class="section-divider">
        <div>
            <div style="font-size:15px; color:#888; font-weight:bold; margin-bottom:6px;">担当者確認（${esc(shippingInspectionLabel)}承認済み）</div>
            <div style="font-size:16px; line-height:2; background:#f8f9fa; border-radius:4px; padding:8px 12px;">
                <div><span style="color:#888; font-size:14px; width:36px; display:inline-block;">設計</span>${esc(shippingOwners?.sekkei || 'なし')}</div>
                <div><span style="color:#888; font-size:14px; width:36px; display:inline-block;">組立</span>${esc(shippingOwners?.kumitatе || 'なし')}</div>
                <div><span style="color:#888; font-size:14px; width:36px; display:inline-block;">操業</span>${esc(shippingOwners?.shiunten || 'なし')}</div>
                <div><span style="color:#888; font-size:14px; width:36px; display:inline-block;">営業</span>${esc(shippingOwners?.sales || 'なし')}</div>
                <div><span style="color:#888; font-size:14px; width:36px; display:inline-block;">現地</span>${esc(shippingOwners?.trip || 'なし')}</div>
            </div>
        </div>` : ''}
        ${req.sheet_data && SHEET_FLOW_META[req.flow_type] ? (() => {
            const meta = SHEET_FLOW_META[req.flow_type];
            const isApproved = req.status === 'approved';
            const sectionTitle = isApproved ? meta.doneLabel : meta.label;
            const btnLabel = isApproved ? sectionTitle : 'チェックシート';
            const sheetFile = meta.file;

            // 却下されて再申請可能な本人には、閲覧専用ではなく編集可能なチェックシートを開く
            const canEdit  = req.status === 'rejected' && isMyRequest;
            const sheetUrl = canEdit ? `${sheetFile}?draft_id=${req.id}` : `${sheetFile}?view=1&id=${req.id}`;
            const linkLabel = canEdit ? `${btnLabel}を修正する →` : `${btnLabel}を確認する →`;
            return `<hr class="section-divider">
        <div class="section-title">${sectionTitle}</div>
        <button class="btn btn-secondary" style="font-size:15px; padding:7px 18px; margin-top:2px;" onclick="window.open('${sheetUrl}', '_blank')">${linkLabel}</button>
        <div id="pending_detail_section">${buildPendingSectionInner(req, isMyRequest)}</div>`;
        })() : ''}
        ${QA_MEETING_FLOWS.includes(req.flow_type) && req.status !== 'cancelled'
            ? `<div id="qa_result_section">${buildQaResultSectionInner(req, isMyRequest)}</div>`
            : ''}
        ${req.flow_type === 'shipping' ? `
        <hr class="section-divider">
        <div class="section-title">出荷確認書</div>
        <button class="btn btn-secondary" style="font-size:15px; padding:7px 18px; margin-top:2px;" onclick="window.open('shipping_sheet.html?view=1&id=${req.id}', '_blank')">出荷確認書を確認する →</button>` : ''}
        ${myStep ? `
        <hr class="section-divider">
        <div class="form-group">
            <label>コメント${myStep ? '' : '（任意）'}</label>
            <textarea id="approval_comment" placeholder="承認・却下の理由など（却下時は必須）"></textarea>
        </div>` : ''}
    `;

    // フッターボタン
    const footer = document.getElementById('detail_footer');

    if (myStep) {
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="closeDetailModal()">${detailModalCloseButtonLabel()}</button>
            <button class="btn btn-danger"    onclick="rejectStep('${req.id}','${myStep.id}')">却下する</button>
            <button class="btn btn-success"   onclick="approveStep('${req.id}','${myStep.id}',${myStep.step_order})">承認する</button>
        `;
    } else if (isMyRequest && req.status === 'rejected') {
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="closeDetailModal()">${detailModalCloseButtonLabel()}</button>
            <button class="btn btn-primary"   onclick="resubmit('${req.id}')">再申請する</button>
        `;
    } else if (req.flow_type === 'shipping' && req.status === 'awaiting_shipping_date' && (isSales || isQualityOrSeikan)) {
        footer.innerHTML = buildSalesDateFooterInner(req, hasPackingShipping, packingState);
    } else if (req.flow_type === 'shipping' && req.status === 'awaiting_shipping_confirm' && (isMyRequest || isQualityOrSeikan)) {
        const pendingBlockers = await _getShippingPendingBlockers(req.project_number, req.machine_name);
        const blockWarningHtml = pendingBlockers.length > 0 ? `
            <div style="margin-right:auto;display:flex;align-items:center;background:#fff3e0;border:2px solid #f0c078;border-radius:6px;padding:8px 14px;">
                <span style="font-size:14px;color:#8a4b00;font-weight:bold;">⚠ ${pendingBlockers.map(b => FLOW_LABELS[b.flowType] || b.flowType).join('・')}に未完了のペンディング／タスクが残っているため申請できません</span>
            </div>` : '';
        footer.innerHTML = `
            ${changeDateFooterLinkHtml}
            ${blockWarningHtml}
            <button class="btn btn-secondary" onclick="closeDetailModal()">${detailModalCloseButtonLabel()}</button>
            <button class="btn btn-success" ${pendingBlockers.length > 0 ? 'disabled title="残件を解消すると申請できます"' : ''} onclick="confirmAndSubmitShipping('${req.id}')">内容を確認し申請する</button>
        `;
    } else if (canReschedule) {
        footer.innerHTML = buildQaFooterInner(req);
    } else if (changeDateFooterLinkHtml) {
        footer.innerHTML = `
            ${changeDateFooterLinkHtml}
            <button class="btn btn-secondary" onclick="closeDetailModal()">${detailModalCloseButtonLabel()}</button>
        `;
    }
}

// ===== 営業: 確定出荷日入力フッター =====
// hasPackingShipping=true の場合、梱包出荷日（確定）の入力欄も並べて表示する
// packingState==='unknown' の場合、未定のまま出荷日入力段階まで進んでいる旨の警告を出す（進行はブロックしない）
function buildSalesDateFooterInner(req, hasPackingShipping, packingState) {
    const isSplitShipping = currentDetailShippingTaskCount >= 2;
    const packingBox = hasPackingShipping ? `
        <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
            <span style="font-size:15px;color:#c0392b;font-weight:bold;">● 梱包出荷日（確定）を入力してください</span>
            <input type="date" id="packing_sales_date_input" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:15px;margin-top:4px;">
        </div>` : '';
    const packingWarningBox = (!hasPackingShipping && packingState === 'unknown') ? `
        <div style="display:flex;align-items:center;background:#fff3e0;border:2px solid #f0c078;border-radius:6px;padding:8px 14px;">
            <span style="font-size:14px;color:#8a4b00;font-weight:bold;">⚠ 梱包出荷の有無が未定です</span>
        </div>` : '';
    const dateLabel = hasPackingShipping ? '工場出荷日（確定）' : '確定出荷日';
    const dateBox2 = isSplitShipping ? `
            <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
                <span style="font-size:15px;color:#c0392b;font-weight:bold;">● ②${dateLabel}を入力してください</span>
                <input type="date" id="sales_date_input_2" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:15px;margin-top:4px;">
            </div>` : '';
    return `
        <div style="margin-right:auto;display:flex;gap:10px;flex-wrap:wrap;">
            ${packingBox}
            ${packingWarningBox}
            <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
                <span style="font-size:15px;color:#c0392b;font-weight:bold;">● ${isSplitShipping ? '①' : ''}${dateLabel}を入力してください</span>
                <input type="date" id="sales_date_input" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:15px;margin-top:4px;">
            </div>
            ${dateBox2}
        </div>
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
        <button class="btn btn-success"   onclick="submitSalesShippingDate('${req.id}')">入力する</button>
    `;
}

// ===== 「日付を変更する」クリック時にフッターを編集フォームへ切り替える =====
function showChangeConfirmedDateFooter(requestId) {
    if (!currentDetailReq || currentDetailReq.id !== requestId) return;
    document.getElementById('detail_footer').innerHTML = buildChangeConfirmedDateFooterInner(currentDetailReq, currentDetailHasPackingShipping);
}

// ===== 確定出荷日の変更フォーム（現在値をプリフィルし、常務承認済み等であれば再承認が必要になる） =====
function buildChangeConfirmedDateFooterInner(req, hasPackingShipping) {
    const isSplitShipping = currentDetailShippingTaskCount >= 2;
    const packingBox = hasPackingShipping ? `
        <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
            <span style="font-size:15px;color:#c0392b;font-weight:bold;">● 梱包出荷日（確定）を変更してください</span>
            <input type="date" id="packing_sales_date_input" value="${req.packing_confirmed_shipping_date || ''}" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:15px;margin-top:4px;">
        </div>` : '';
    const dateLabel = hasPackingShipping ? '工場出荷日（確定）' : '確定出荷日';
    const dateBox2 = isSplitShipping ? `
            <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
                <span style="font-size:15px;color:#c0392b;font-weight:bold;">● ②${dateLabel}を変更してください</span>
                <input type="date" id="sales_date_input_2" value="${req.confirmed_shipping_date_2 || ''}" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:15px;margin-top:4px;">
            </div>` : '';
    return `
        <div style="margin-right:auto;display:flex;gap:10px;flex-wrap:wrap;">
            ${packingBox}
            <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
                <span style="font-size:15px;color:#c0392b;font-weight:bold;">● ${isSplitShipping ? '①' : ''}${dateLabel}を変更してください</span>
                <input type="date" id="sales_date_input" value="${req.confirmed_shipping_date || ''}" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:15px;margin-top:4px;">
            </div>
            ${dateBox2}
        </div>
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
        <button class="btn btn-success"   onclick="changeConfirmedShippingDate('${req.id}')">変更する</button>
    `;
}

// ===== 開催結果・ペンディング確認の下部フッターボタン生成（簡易検査・外観検査・出荷確認会議） =====
function buildQaFooterInner(req) {
    return `
        ${qaCanFinalize(req) ? `<button class="btn btn-success" onclick="finalizeQaMeeting('${req.id}')">完了にする</button>` : ''}
        <button class="btn btn-primary"   onclick="openRescheduleModal('${req.id}')">詳細変更</button>
        <button class="btn btn-danger"    onclick="cancelMeeting('${req.id}', '${req.flow_type}')">キャンセル</button>
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
    `;
}

// 一覧モーダルから個別申請の詳細を開いた場合、closeDetailModal()は実際にはモーダルを閉じず元の一覧に戻る。
// その場合はボタンラベルを「閉じる」ではなく「戻る」にする
function detailModalCloseButtonLabel() {
    return (assemblyDetailReturnProjectNum || assemblyDetailReturnMachine || testRunDetailReturnProjectNum || testRunDetailReturnMachine)
        ? '戻る' : '閉じる';
}

function closeDetailModal() {
    // 組立フロー詳細（機械レベル or 工番レベル）から個別申請の詳細を開いた場合は、閉じずに元の一覧に戻る
    if (assemblyDetailReturnMachine) {
        const { projectNum, machine } = assemblyDetailReturnMachine;
        assemblyDetailReturnMachine = null;
        openAssemblyMachineDetailModal(projectNum, machine);
        return;
    }
    if (assemblyDetailReturnProjectNum) {
        const returnNum = assemblyDetailReturnProjectNum;
        assemblyDetailReturnProjectNum = null;
        openAssemblyFlowDetailModal(returnNum);
        return;
    }
    // 試運転フロー詳細（機械レベル or 工番レベル）から個別申請の詳細を開いた場合も同様に、閉じずに元の一覧に戻る
    if (testRunDetailReturnMachine) {
        const { projectNum, machine } = testRunDetailReturnMachine;
        testRunDetailReturnMachine = null;
        openTestRunMachineDetailModal(projectNum, machine);
        return;
    }
    if (testRunDetailReturnProjectNum) {
        const returnNum = testRunDetailReturnProjectNum;
        testRunDetailReturnProjectNum = null;
        openTestRunFlowDetailModal(returnNum);
        return;
    }
    document.getElementById('detail_modal').classList.remove('open');
    document.querySelector('#detail_modal .modal').classList.remove('unit-list-mode');
    document.querySelector('#detail_modal .modal').classList.remove('wide-machine-detail');
    currentAssemblyDetailProjectNum = null;
    currentAssemblyMachineDetail = null;
    currentTestRunMachineDetail = null;
    currentTestRunDetailProjectNum = null;
    ui.send('CLOSE');
}

// ===== 設定画面（製管2名のみ） =====
let settingsView            = 'menu'; // 'menu' | 'recipients_list' | 'recipients_detail' | ...

// 設定画面のカテゴリ構成。項目を増やす時はここに追記するだけでよい
const SETTINGS_CATEGORIES = [
    {
        icon: '📧', label: '通知・宛先設定',
        items: [
            { label: '部署ごとの名簿管理', desc: 'ログインアカウントの有無に関わらず、部署単位で担当者を一覧管理する（追加・編集・役職変更）', fn: 'showRosterScreen' },
            { label: '通知の宛先設定', desc: '名簿の中から、フローごとに実際に通知する人・部署を選ぶ', fn: 'showRecipientsListScreen' },
            { label: 'リマインダー通知のCC設定', desc: '催促メールのうち、ロールでは決まらず個人を固定しているCC宛先を選ぶ', fn: 'showReminderCcSettingsScreen' }
        ]
    },
    {
        icon: '📜', label: '履歴',
        items: [
            { label: '変更履歴', desc: 'いつ・誰が設定を変更したかを確認する', fn: 'showAuditLogScreen' }
        ]
    }
];
function toggleUserMenu() {
    document.getElementById('user_menu_btn').classList.toggle('open');
    document.getElementById('user_menu_dropdown').classList.toggle('open');
}
function closeUserMenu() {
    document.getElementById('user_menu_btn').classList.remove('open');
    document.getElementById('user_menu_dropdown').classList.remove('open');
}

// ユーザーメニュー外クリックで閉じる
document.addEventListener('click', function(e) {
    if (!e.target.closest('.header-user')) closeUserMenu();
});

async function openSettingsModal() {
    if (!ADMIN_EMAILS.includes(currentUser?.email)) return;
    closeSidePanel(); // マイページと同じ側面に表示されるため、開いていれば閉じておく
    document.getElementById('settings_modal').classList.add('open');
    await loadFlowSettings();
    await loadReminderCcSettings();
    showSettingsMenu();
}

// 設定画面を閉じる（ヘッダーの「✅ 承認フロー」クリック・パネル右上の×からも呼ばれる）
function closeSettingsModal() {
    document.getElementById('settings_modal').classList.remove('open');
    document.getElementById('side_panel').classList.remove('open'); // マイページも閉じた状態で表示する
}

function showSettingsMenu() {
    settingsView = 'menu';
    document.getElementById('settings_body').innerHTML = `
        <div class="settings-menu-groups">
            ${SETTINGS_CATEGORIES.map(cat => `
                <div class="settings-menu-group">
                    <button class="settings-menu-group-header" onclick="this.parentElement.classList.toggle('open')">
                        <span class="settings-menu-group-arrow">▶</span>
                        <span class="settings-menu-group-icon">${cat.icon}</span>
                        <span class="settings-menu-group-title">${esc(cat.label)}</span>
                    </button>
                    <div class="settings-menu-group-body">
                        ${cat.items.map(item => `
                            <button class="settings-menu-item" onclick="${item.fn}()">
                                <div class="settings-menu-item-title">${esc(item.label)}</div>
                                <div class="settings-menu-item-desc">${esc(item.desc)}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ----- 固定宛先の設定（個人単位） -----
function showRecipientsListScreen() {
    settingsView = 'recipients_list';
    const rows = Object.keys(FIXED_RECIPIENT_GROUPS).map(ft => {
        const plan = getFixedRecipientPlan(ft);
        const fixedCount = plan.profileIds.length + plan.recipientIds.length;
        const dynGroups  = DYNAMIC_RECIPIENT_GROUPS[ft] || [];
        const dynPlan    = getDynamicRecipientPlan(ft);
        const dynOffCount = dynGroups.filter(g => !dynPlan[g]).length;
        const dynHtml = dynGroups.length === 0
            ? '<span class="recip-dyn-none">対象外</span>'
            : (dynOffCount === 0
                ? '<span class="recip-dyn-on">全てON</span>'
                : `<span class="recip-dyn-off">${dynOffCount}件OFF</span>`);
        return `
        <button class="recip-row" onclick="showRecipientsDetailScreen('${ft}')">
            <span class="recip-flow-name">${esc(FLOW_LABELS[ft] || ft)}</span>
            <span class="recip-fixed-count">${fixedCount}名</span>
            <span>${dynHtml}</span>
            <span class="recip-chevron">›</span>
        </button>`;
    }).join('');

    document.getElementById('settings_body').innerHTML = `
        <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showSettingsMenu()">← 戻る</button></div>
        <div class="section-title" style="margin-top:10px;">通知の宛先設定</div>
        <div class="recip-list">
            <div class="recip-head">
                <div>フロー</div>
                <div>固定宛先</div>
                <div>工番担当者の自動通知</div>
                <div></div>
            </div>
            ${rows}
        </div>
    `;
}

async function showRecipientsDetailScreen(flowType) {
    settingsView = 'recipients_detail';
    const body = document.getElementById('settings_body');
    body.innerHTML = `<div class="loading-indicator">読み込み中...</div>`;

    const groups = FIXED_RECIPIENT_GROUPS[flowType] || [];
    const plan   = getFixedRecipientPlan(flowType);
    const groupsHtml = [];
    let selectedTotal = 0;

    for (const g of groups) {
        let candidates;
        if (g.kind === 'role') {
            const { data } = await db.from('profiles').select('id, name, email').eq('role', g.role);
            candidates = (data || []).map(p => ({ id: p.id, name: p.name, email: p.email, kind: 'profile', checked: plan.profileIds.includes(p.id) }));
        } else {
            // department種別: ログインアカウント(profiles、本来の部署 or 兼任部署が一致)と非ログイン名簿(notification_recipients)の両方を候補にする
            const { data: profRows } = await db.from('profiles').select('id, name, email, department, extra_departments')
                .or(`department.eq.${g.department},extra_departments.cs.{${g.department}}`);
            const { data: recRows } = await db.from('notification_recipients').select('id, name, email').eq('department', g.department).eq('active', true);
            candidates = [
                ...(profRows || []).map(p => ({ id: p.id, name: p.name, email: p.email, kind: 'profile', checked: plan.profileIds.includes(p.id),
                                                concurrent: p.department !== g.department })),
                ...(recRows  || []).map(r => ({ id: r.id, name: r.name, email: r.email, kind: 'recipient', checked: plan.recipientIds.includes(r.id) }))
            ];
        }

        const checkedCount = candidates.filter(c => c.checked).length;
        selectedTotal += checkedCount;

        const rowsHtml = candidates.length ? candidates.map(c => `
            <label class="recip-person-row">
                <input type="checkbox" data-recipient-kind="${c.kind}" data-recipient-id="${c.id}" ${c.checked ? 'checked' : ''}
                       onchange="updateRecipientSelectedCount()">
                <span class="recip-person-name" title="${esc(c.name || '')}">${esc(c.name || '—')}</span>
                <span class="recip-person-email" title="${esc(c.email || '')}">${esc(c.email || '')}</span>
                ${c.concurrent ? '<span class="recip-note" title="兼務">兼務</span>' : '<span></span>'}
            </label>
        `).join('') : `
            <div class="recip-empty">
                <span>該当者がいません。</span>
                ${g.kind === 'department'
                    ? '<button class="btn-xs" onclick="showRosterScreen()">「部署ごとの名簿管理」で追加する →</button>'
                    : '<span>この項目は担当ロールを持つログインユーザーが対象です。</span>'}
            </div>`;

        groupsHtml.push(`
            <div class="recip-group">
                <div class="recip-group-header">
                    <span class="recip-group-title">${esc(g.label)}</span>
                    <span class="recip-group-kind">${g.kind === 'role' ? '役職から選択' : '部署から選択'}</span>
                    <span class="recip-group-count">${checkedCount} / ${candidates.length}</span>
                </div>
                ${rowsHtml}
            </div>`);
    }

    // 工番担当者から自動で宛先に加わるグループのON/OFFトグル
    const dynGroups = DYNAMIC_RECIPIENT_GROUPS[flowType] || [];
    const dynPlan   = getDynamicRecipientPlan(flowType);
    const dynHtml = dynGroups.length ? `
        <div class="recip-group">
            <div class="recip-group-header">
                <span class="recip-group-title">工番担当者の自動通知</span>
            </div>
            ${dynGroups.map(g => `
                <label class="recip-dyn-row">
                    <input type="checkbox" data-dynamic-group="${g}" ${dynPlan[g] ? 'checked' : ''}
                           onchange="this.closest('label').querySelector('.recip-badge-on, .recip-badge-off').outerHTML = this.checked ? '<span class=\\'recip-badge-on\\'>ON</span>' : '<span class=\\'recip-badge-off\\'>OFF</span>'">
                    <span class="recip-dyn-label">${esc(DYNAMIC_GROUP_LABELS[g] || g)}</span>
                    ${dynPlan[g] ? '<span class="recip-badge-on">ON</span>' : '<span class="recip-badge-off">OFF</span>'}
                </label>
            `).join('')}
        </div>` : '';

    body.innerHTML = `
        <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showRecipientsListScreen()">← 戻る</button></div>
        <div class="section-title" style="margin-top:10px;">${esc(FLOW_LABELS[flowType] || flowType)}の固定宛先</div>
        ${groupsHtml.join('')}
        ${dynHtml}
        <div class="recip-footer">
            <span class="recip-footer-count">固定宛先 選択中 <strong id="recip_selected_count">${selectedTotal}名</strong></span>
            <button class="btn btn-primary" onclick="saveRecipientDetail('${flowType}')">保存する</button>
        </div>
    `;
}

// 保存バーの選択人数を更新する
function updateRecipientSelectedCount() {
    const el = document.getElementById('recip_selected_count');
    if (!el) return;
    el.textContent = document.querySelectorAll('#settings_body [data-recipient-kind]:checked').length + '名';
}

async function saveRecipientDetail(flowType) {
    if (requireLogin()) return;
    const checkedBoxes = [...document.querySelectorAll('#settings_body [data-recipient-kind]:checked')];
    const profileIds   = checkedBoxes.filter(cb => cb.dataset.recipientKind === 'profile').map(cb => cb.dataset.recipientId);
    const recipientIds = checkedBoxes.filter(cb => cb.dataset.recipientKind === 'recipient').map(cb => cb.dataset.recipientId);
    const names = checkedBoxes.map(cb => cb.closest('label')?.querySelector('span')?.textContent || '').filter(Boolean);

    if (checkedBoxes.length === 0 && !confirm('固定宛先が0件になります。このまま保存しますか？')) return;

    const dynGroups = DYNAMIC_RECIPIENT_GROUPS[flowType] || [];
    const dynValue = {};
    dynGroups.forEach(g => {
        const cb = document.querySelector(`#settings_body [data-dynamic-group="${g}"]`);
        dynValue[g] = cb ? cb.checked : true;
    });

    showLoading('保存中...');
    try {
        const { data } = await db.from('flow_settings').select('value').eq('key', 'flow_fixed_recipients').single();
        const value = data?.value || {};
        value[flowType] = { profileIds, recipientIds };
        const { error } = await db.from('flow_settings')
            .update({ value, updated_at: new Date().toISOString(), updated_by: currentUser.email })
            .eq('key', 'flow_fixed_recipients');
        if (error) throw error;
        flowSettings.fixedRecipients = value;

        if (dynGroups.length > 0) {
            const { data: dynData } = await db.from('flow_settings').select('value').eq('key', 'flow_dynamic_recipients').maybeSingle();
            const dynAll = dynData?.value || {};
            dynAll[flowType] = dynValue;
            const { error: dynError } = await db.from('flow_settings')
                .upsert({ key: 'flow_dynamic_recipients', value: dynAll, updated_at: new Date().toISOString(), updated_by: currentUser.email }, { onConflict: 'key' });
            if (dynError) throw dynError;
            flowSettings.dynamicRecipients = dynAll;
        }

        await logSettingsChange('fixed_recipients', `${FLOW_LABELS[flowType] || flowType}の固定宛先・自動通知設定を変更（固定宛先: ${names.join('、') || 'なし'}）`);
        showToast('固定宛先を保存しました。', 'success');
        showRecipientsListScreen();
    } catch (e) {
        showToast('保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ----- リマインダー通知のCC設定（個人単位） -----
function showReminderCcSettingsScreen() {
    settingsView = 'reminder_cc_list';
    const rows = REMINDER_CC_ITEMS.map(item => {
        const plan  = getReminderCcPlan(item.key);
        const count = plan.profileIds.length + plan.recipientIds.length;
        return `
        <button class="recip-row" onclick="showReminderCcDetailScreen('${item.key}')">
            <span class="recip-flow-name">${esc(item.label)}</span>
            <span class="recip-fixed-count">${count}名</span>
            <span></span>
            <span class="recip-chevron">›</span>
        </button>`;
    }).join('');

    document.getElementById('settings_body').innerHTML = `
        <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showSettingsMenu()">← 戻る</button></div>
        <div class="section-title" style="margin-top:10px;">リマインダー通知のCC設定</div>
        <div class="recip-list">
            ${rows}
        </div>
    `;
}

async function showReminderCcDetailScreen(itemKey) {
    settingsView = 'reminder_cc_detail';
    const item = REMINDER_CC_ITEMS.find(i => i.key === itemKey);
    const body = document.getElementById('settings_body');
    body.innerHTML = `<div class="loading-indicator">読み込み中...</div>`;

    const plan = getReminderCcPlan(itemKey);
    const { data: profRows } = await db.from('profiles').select('id, name, email, department').order('department').order('name');
    const { data: recRows }  = await db.from('notification_recipients').select('id, name, email').eq('active', true).order('name');

    const candidates = [
        ...(profRows || []).map(p => ({ id: p.id, name: p.name, email: p.email, dept: p.department, kind: 'profile',   checked: plan.profileIds.includes(p.id) })),
        ...(recRows  || []).map(r => ({ id: r.id, name: r.name, email: r.email, dept: '',            kind: 'recipient', checked: plan.recipientIds.includes(r.id) }))
    ];
    const checkedCount = candidates.filter(c => c.checked).length;

    const rowsHtml = candidates.map(c => `
        <label class="recip-person-row">
            <input type="checkbox" data-recipient-kind="${c.kind}" data-recipient-id="${c.id}" ${c.checked ? 'checked' : ''}
                   onchange="updateRecipientSelectedCount()">
            <span class="recip-person-name" title="${esc(c.name || '')}">${esc(c.name || '—')}</span>
            <span class="recip-person-email" title="${esc(c.email || '')}">${esc(c.email || '')}</span>
            ${c.dept ? `<span class="recip-note" title="${esc(c.dept)}">${esc(c.dept)}</span>` : '<span></span>'}
        </label>
    `).join('');

    body.innerHTML = `
        <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showReminderCcSettingsScreen()">← 戻る</button></div>
        <div class="section-title" style="margin-top:10px;">${esc(item.label)}</div>
        <div class="recip-group">
            ${rowsHtml}
        </div>
        <div class="recip-footer">
            <span class="recip-footer-count">選択中 <strong id="recip_selected_count">${checkedCount}名</strong></span>
            <button class="btn btn-primary" onclick="saveReminderCcDetail('${itemKey}')">保存する</button>
        </div>
    `;
}

async function saveReminderCcDetail(itemKey) {
    if (requireLogin()) return;
    const item = REMINDER_CC_ITEMS.find(i => i.key === itemKey);
    const checkedBoxes = [...document.querySelectorAll('#settings_body [data-recipient-kind]:checked')];
    const profileIds   = checkedBoxes.filter(cb => cb.dataset.recipientKind === 'profile').map(cb => cb.dataset.recipientId);
    const recipientIds = checkedBoxes.filter(cb => cb.dataset.recipientKind === 'recipient').map(cb => cb.dataset.recipientId);
    const names = checkedBoxes.map(cb => cb.closest('label')?.querySelector('span')?.textContent || '').filter(Boolean);

    if (checkedBoxes.length === 0 && !confirm('CC宛先が0件になります。このまま保存しますか？')) return;

    showLoading('保存中...');
    try {
        const { data } = await db.from('reminder_settings').select('value').eq('key', 'reminder_cc_recipients').single();
        const value = data?.value || {};
        value[itemKey] = { profileIds, recipientIds };
        const { error } = await db.from('reminder_settings')
            .update({ value, updated_at: new Date().toISOString(), updated_by: currentUser.email })
            .eq('key', 'reminder_cc_recipients');
        if (error) throw error;
        reminderCcRecipients = value;

        await logSettingsChange('reminder_cc_recipients', `${item.label}を変更（CC: ${names.join('、') || 'なし'}）`);
        showToast('CC設定を保存しました。', 'success');
        showReminderCcSettingsScreen();
    } catch (e) {
        showToast('保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ----- 部署ごとの名簿管理（profiles + notification_recipients 統合表示） -----
function roleToTier(role) { return PROFILE_ROLE_TO_TIER[role] || 'staff'; }

// profilesとnotification_recipientsをメールアドレス一致で1人にマージする
function mergeRosterRows(profileRows, recipientRows) {
    const byEmail = new Map();
    (profileRows || []).forEach(p => {
        byEmail.set(String(p.email).toLowerCase(), {
            profileId: p.id, recipientId: null, source: 'profile',
            name: p.name, email: p.email, department: p.department,
            tier: roleToTier(p.role), profileRole: p.role, active: true,
            extraDepartments: p.extra_departments || []
        });
    });
    (recipientRows || []).forEach(r => {
        const key = String(r.email).toLowerCase();
        const existing = byEmail.get(key);
        if (existing) {
            existing.recipientId = r.id;
            existing.source = 'both';
        } else {
            byEmail.set(key, {
                profileId: null, recipientId: r.id, source: 'recipient',
                name: r.name, email: r.email, department: r.department,
                tier: r.role, profileRole: null, active: r.active, extraDepartments: []
            });
        }
    });
    return [...byEmail.values()];
}

// 名簿行が承認者になっているフローのバッジ文言を返す
function getApproverBadges(row) {
    if (!row.profileRole) return [];
    return (APPROVER_ROLE_FLOWS[row.profileRole] || []).map(ft => `承認者: ${FLOW_LABELS[ft] || ft}`);
}

// 名簿行がフローの固定宛先候補・選択中であるかのバッジ文言を返す
function getFixedRecipientBadges(row) {
    const badges = [];
    for (const [flowType, groups] of Object.entries(FIXED_RECIPIENT_GROUPS)) {
        for (const g of groups) {
            const isCandidate = g.kind === 'role'
                ? row.profileRole === g.role
                : (row.department === g.department || (row.extraDepartments || []).includes(g.department));
            if (!isCandidate) continue;
            const plan = getFixedRecipientPlan(flowType);
            const selected = (row.profileId && plan.profileIds.includes(row.profileId))
                           || (row.recipientId && plan.recipientIds.includes(row.recipientId));
            badges.push(`固定宛先: ${FLOW_LABELS[flowType] || flowType}${selected ? '' : '（未選択）'}`);
        }
    }
    return badges;
}

async function showRosterScreen() {
    settingsView = 'recipient_master';
    const body = document.getElementById('settings_body');
    body.innerHTML = `<div class="loading-indicator">読み込み中...</div>`;

    const [{ data: profRows }, { data: recRows }] = await Promise.all([
        db.from('profiles').select('id, name, email, department, role, extra_departments'),
        db.from('notification_recipients').select('id, name, email, department, role, active')
    ]);
    const rows = mergeRosterRows(profRows, recRows);
    const departments = sortDepartments([...new Set(rows.flatMap(r => [r.department, ...(r.extraDepartments || [])]))]);

    const renderRow = (r, isConcurrent) => {
        const key = r.profileId ? `profile:${r.profileId}` : `recipient:${r.recipientId}`;
        const canLogin = (r.source === 'profile' || r.source === 'both');

        // 「承認者: 〇〇」「固定宛先: 〇〇（未選択）」からフロー名だけを取り出す
        const approverFlows = getApproverBadges(r).map(b => b.replace(/^承認者:\s*/, ''));
        const fixedFlows = getFixedRecipientBadges(r).map(b => ({
            label: b.replace(/^固定宛先:\s*/, '').replace(/（未選択）$/, ''),
            selected: !/（未選択）$/.test(b)
        }));

        const approverLine = approverFlows.length ? `
            <div class="roster-badge-line">
                <span class="roster-badge-label roster-badge-label-approver">承認</span>
                <span class="roster-chips">${approverFlows.map(f => `<span class="roster-chip-approver">${esc(f)}</span>`).join('')}</span>
            </div>` : '';

        const fixedLine = fixedFlows.length ? `
            <div class="roster-badge-line">
                <span class="roster-badge-label roster-badge-label-fixed">宛先</span>
                <span class="roster-chips">${fixedFlows.map(f =>
                    `<span class="roster-chip-fixed${f.selected ? '' : ' is-unselected'}"${f.selected ? '' : ' title="固定宛先の候補（未選択）"'}>${esc(f.label)}</span>`
                ).join('')}</span>
            </div>` : '';

        const badgesHtml = (approverLine || fixedLine)
            ? approverLine + fixedLine
            : '<span class="roster-none">—</span>';

        const marks = (isConcurrent ? '<span class="roster-mark roster-mark-concurrent" title="兼務">兼</span>' : '')
                    + (r.active === false ? '<span class="roster-mark roster-mark-inactive" title="無効">無</span>' : '');

        return `
            <div class="roster-row">
                <div class="roster-name roster-ellip" title="${esc(r.name)}">${esc(r.name)}${marks}</div>
                <div class="roster-email roster-ellip" title="${esc(r.email)}">${esc(r.email)}</div>
                <div class="roster-tier">${esc(TIER_LABELS[r.tier] || r.tier)}</div>
                <div class="roster-login">${canLogin
                    ? '<span class="roster-login-yes">可</span>'
                    : '<span class="roster-login-no">—</span>'}</div>
                <div class="roster-badges">${badgesHtml}</div>
                <div><button class="btn-xs" onclick="editRosterMember('${key}')">編集</button></div>
            </div>
        `;
    };

    const groupsHtml = departments.map(dept => {
        const mainItems       = rows.filter(r => r.department === dept);
        const concurrentItems = rows.filter(r => r.department !== dept && (r.extraDepartments || []).includes(dept));
        const items = [...mainItems, ...concurrentItems].sort((a, b) => String(a.name).localeCompare(String(b.name), 'ja'));
        const itemsHtml = items.map(r => renderRow(r, r.department !== dept)).join('');
        return `
            <div class="settings-flow-group roster-group">
                <div class="roster-group-header">
                    <span class="settings-flow-title">${esc(dept)}</span>
                    <span class="roster-group-count">${items.length}</span>
                </div>
                <div class="roster-head">
                    <div>名前</div>
                    <div>メールアドレス</div>
                    <div>役職</div>
                    <div>ログイン</div>
                    <div>承認者・固定宛先</div>
                    <div></div>
                </div>
                ${itemsHtml}
            </div>`;
    }).join('');

    body.innerHTML = `
        <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showSettingsMenu()">← 戻る</button></div>
        <div class="section-title" style="margin-top:10px;">部署ごとの名簿管理</div>
        <div style="display:flex; gap:8px; margin:10px 0 16px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="addRosterMember()">＋ 非ログイン担当者を追加</button>
            <button class="btn btn-sm btn-roster-add-login" onclick="addLoginRosterMember()">＋ ログイン可能な担当者を追加</button>
        </div>
        ${groupsHtml}
    `;
}

async function editRosterMember(key) {
    const [kind, id] = key.split(':');
    const body = document.getElementById('settings_body');

    if (kind === 'profile') {
        const { data: record } = await db.from('profiles').select('id, name, email, department, role, extra_departments').eq('id', id).single();
        if (!record) { showToast('データが見つかりません', 'error'); return; }
        const tierOptions = DEPT_TIER_TO_PROFILE_ROLE[record.department] ? ['staff', 'manager', 'director'] : ['staff'];
        const currentTier = roleToTier(record.role);
        const extraDepts = record.extra_departments || [];
        body.innerHTML = `
            <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showRosterScreen()">← 戻る</button></div>
            <div class="rm-title-row">
                <span class="rm-title">担当者を編集</span>
                <span class="rm-badge-login">ログインアカウントあり</span>
            </div>

            <div class="rm-card">
                <div class="rm-card-header">基本情報</div>
                <div class="rm-card-body">
                    <div class="rm-field">
                        <label for="rm_name">名前</label>
                        <input type="text" id="rm_name" value="${esc(record.name)}">
                    </div>
                    <div class="rm-field">
                        <span class="rm-label">メールアドレス</span>
                        <span class="rm-readonly">${esc(record.email)}<span class="rm-readonly-note">変更不可</span></span>
                    </div>
                    <div class="rm-field">
                        <span class="rm-label">部署</span>
                        <span class="rm-readonly">${esc(record.department)}<span class="rm-readonly-note">変更不可</span></span>
                    </div>
                    <div class="rm-field">
                        <label for="rm_tier">役職</label>
                        ${tierOptions.length === 1
                            ? `<span class="rm-readonly">${esc(TIER_LABELS[currentTier] || currentTier)}<span class="rm-readonly-note">この部署は変更不可</span></span>
                               <input type="hidden" id="rm_tier" value="${esc(currentTier)}">`
                            : `<select id="rm_tier">
                                   ${tierOptions.map(t => `<option value="${t}" ${t === currentTier ? 'selected' : ''}>${TIER_LABELS[t]}</option>`).join('')}
                               </select>`}
                    </div>
                </div>
            </div>

            <div class="rm-card">
                <div class="rm-card-header">
                    兼任部署
                    <span class="rm-card-note">通知の宛先候補にのみ影響（承認権限は変わりません）</span>
                </div>
                <div class="rm-dept-grid">
                    ${DEPARTMENT_ORDER.filter(d => d !== record.department).map(d => `
                        <label class="rm-dept-chip">
                            <input type="checkbox" class="rm_extra_dept" value="${esc(d)}" ${extraDepts.includes(d) ? 'checked' : ''}>
                            <span>${esc(d)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <div class="rm-danger">
                <div class="rm-danger-header">退職・アカウント削除</div>
                <div class="rm-danger-body">
                    <span class="rm-danger-note">ログインアカウントを削除します。過去の申請・承認の記録は残ります。</span>
                    <button class="rm-danger-btn" onclick="deleteLoginRosterMember('${id}')">退職処理（アカウント削除）</button>
                </div>
            </div>

            <div class="rm-footer">
                <button class="btn btn-sm btn-secondary" onclick="showRosterScreen()">キャンセル</button>
                <button class="btn btn-primary rm-footer-save" onclick="saveRosterMember('${key}')">保存する</button>
            </div>
        `;
    } else {
        const { data: record } = await db.from('notification_recipients').select('id, name, email, department, role, active').eq('id', id).single();
        if (!record) { showToast('データが見つかりません', 'error'); return; }
        const { data: deptRows } = await db.from('notification_recipients').select('department');
        const departments = sortDepartments([...new Set((deptRows || []).map(r => r.department))]);
        const isKnownDept = departments.includes(record.department);
        body.innerHTML = `
            <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showRosterScreen()">← 戻る</button></div>
            <div class="rm-title-row">
                <span class="rm-title">担当者を編集</span>
                <span class="rm-badge-nologin">通知のみ（ログイン不可）</span>
            </div>

            <div class="rm-card">
                <div class="rm-card-header">基本情報</div>
                <div class="rm-card-body">
                    <div class="rm-field">
                        <label for="rm_name">名前</label>
                        <input type="text" id="rm_name" value="${esc(record.name)}">
                    </div>
                    <div class="rm-field">
                        <label for="rm_email">メールアドレス</label>
                        <input type="text" id="rm_email" value="${esc(record.email)}">
                    </div>
                    <div class="rm-field is-top">
                        <label for="rm_department_select">部署</label>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            <select id="rm_department_select" onchange="onRmDepartmentSelectChange()">
                                ${departments.map(d => `<option value="${esc(d)}" ${d === record.department ? 'selected' : ''}>${esc(d)}</option>`).join('')}
                                <option value="__other__" ${isKnownDept ? '' : 'selected'}>その他（自由入力）</option>
                            </select>
                            <input type="text" id="rm_department_other" placeholder="部署名を入力"
                                   value="${isKnownDept ? '' : esc(record.department)}" ${isKnownDept ? 'style="display:none;"' : ''}>
                        </div>
                    </div>
                    <div class="rm-field">
                        <label for="rm_tier">役職</label>
                        <select id="rm_tier">
                            ${['staff', 'manager', 'director'].map(t => `<option value="${t}" ${t === record.role ? 'selected' : ''}>${TIER_LABELS[t]}</option>`).join('')}
                        </select>
                    </div>
                    <div class="rm-field">
                        <span class="rm-label">状態</span>
                        <label class="rm-check">
                            <input type="checkbox" id="rm_active" ${record.active ? 'checked' : ''}>
                            <span>有効（通知の宛先候補に表示する）</span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="rm-danger">
                <div class="rm-danger-header">削除</div>
                <div class="rm-danger-body">
                    <span class="rm-danger-note">名簿から削除します。一時的に通知を止めるだけなら「有効」のチェックを外してください。</span>
                    <button class="rm-danger-btn" onclick="deleteNonLoginRosterMember('${id}')">削除する</button>
                </div>
            </div>

            <div class="rm-footer">
                <button class="btn btn-sm btn-secondary" onclick="showRosterScreen()">キャンセル</button>
                <button class="btn btn-primary rm-footer-save" onclick="saveRosterMember('${key}')">保存する</button>
            </div>
        `;
    }
}

function onRmDepartmentSelectChange() {
    const sel = document.getElementById('rm_department_select');
    document.getElementById('rm_department_other').style.display = sel.value === '__other__' ? '' : 'none';
}

async function saveRosterMember(key) {
    if (requireLogin()) return;
    const [kind, id] = key.split(':');
    const name = document.getElementById('rm_name').value.trim();
    if (!name) { showToast('名前は必須です', 'error'); return; }

    showLoading('保存中...');
    try {
        if (kind === 'profile') {
            const { data: current } = await db.from('profiles').select('department').eq('id', id).single();
            const tier = document.getElementById('rm_tier').value;
            const roleMap = DEPT_TIER_TO_PROFILE_ROLE[current.department];
            const role = (roleMap && roleMap[tier]) ? roleMap[tier] : 'staff';
            const extraDepartments = [...document.querySelectorAll('.rm_extra_dept:checked')].map(cb => cb.value);
            const { error } = await db.from('profiles').update({ name, role, extra_departments: extraDepartments }).eq('id', id);
            if (error) throw error;
            await logSettingsChange('roster_edit', `${current.department}の${name}を「${TIER_LABELS[tier]}」に変更`);
        } else {
            const email = document.getElementById('rm_email').value.trim();
            const deptSel = document.getElementById('rm_department_select').value;
            const department = deptSel === '__other__' ? document.getElementById('rm_department_other').value.trim() : deptSel;
            const role = document.getElementById('rm_tier').value;
            const active = document.getElementById('rm_active').checked;
            if (!email || !department) { showToast('メールアドレス・部署は必須です', 'error'); return; }
            const { error } = await db.from('notification_recipients').update({ name, email, department, role, active }).eq('id', id);
            if (error) throw error;
            await logSettingsChange('roster_edit', `${department}の${name}を編集`);
        }
        showToast('保存しました。', 'success');
        showRosterScreen();
    } catch (e) {
        showToast('保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function addRosterMember() {
    const body = document.getElementById('settings_body');
    const { data: deptRows } = await db.from('notification_recipients').select('department');
    const departments = sortDepartments([...new Set((deptRows || []).map(r => r.department))]);
    body.innerHTML = `
        <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showRosterScreen()">← 戻る</button></div>
        <div class="section-title" style="margin-top:10px;">非ログイン担当者を追加</div>
        <div class="settings-note">ここで追加した担当者はログインできません。ログインが必要な場合は別途アカウント発行が必要です。</div>
        <div class="form-group"><label>名前</label><input type="text" id="rm_name" value=""></div>
        <div class="form-group"><label>メールアドレス</label><input type="text" id="rm_email" value=""></div>
        <div class="form-group">
            <label>部署</label>
            <select id="rm_department_select" onchange="onRmDepartmentSelectChange()">
                ${departments.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
                <option value="__other__" selected>その他（自由入力）</option>
            </select>
            <input type="text" id="rm_department_other" placeholder="部署名を入力" style="margin-top:6px;">
        </div>
        <div class="form-group">
            <label>役職</label>
            <select id="rm_tier">
                ${['staff', 'manager', 'director'].map(t => `<option value="${t}">${TIER_LABELS[t]}</option>`).join('')}
            </select>
        </div>
        <label class="settings-check-row">
            <input type="checkbox" id="rm_active" checked>
            <span>有効</span>
        </label>
        <button class="btn btn-primary" onclick="saveNewRosterMember()">保存する</button>
    `;
}

async function saveNewRosterMember() {
    if (requireLogin()) return;
    const name  = document.getElementById('rm_name').value.trim();
    const email = document.getElementById('rm_email').value.trim();
    const deptSel = document.getElementById('rm_department_select').value;
    const department = deptSel === '__other__' ? document.getElementById('rm_department_other').value.trim() : deptSel;
    const role   = document.getElementById('rm_tier').value;
    const active = document.getElementById('rm_active').checked;

    if (!name || !email || !department) { showToast('名前・メールアドレス・部署は必須です', 'error'); return; }

    showLoading('保存中...');
    try {
        const { error } = await db.from('notification_recipients').insert({ name, email, department, role, active });
        if (error) throw error;
        await logSettingsChange('roster_edit', `${department}に${name}を追加`);
        showToast('保存しました。', 'success');
        showRosterScreen();
    } catch (e) {
        showToast('保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ----- ログイン可能な担当者を追加（Supabase Authアカウント発行＋profiles登録をEdge Function経由で行う） -----
async function addLoginRosterMember() {
    const body = document.getElementById('settings_body');
    body.innerHTML = `
        <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showRosterScreen()">← 戻る</button></div>
        <div class="section-title" style="margin-top:10px;">ログイン可能な担当者を追加</div>
        <div class="settings-note">この操作でログインアカウントが作成されます。初回ログイン用のパスワード発行は、別途Supabase管理画面から行ってください。</div>
        <div class="form-group"><label>名前</label><input type="text" id="lrm_name" value=""></div>
        <div class="form-group"><label>メールアドレス</label><input type="text" id="lrm_email" value=""></div>
        <div class="form-group">
            <label>部署</label>
            <select id="lrm_department_select" onchange="onLrmDepartmentChange()">
                ${DEPARTMENT_ORDER.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>役職</label>
            <select id="lrm_tier">
                ${['staff', 'manager', 'director'].map(t => `<option value="${t}">${TIER_LABELS[t]}</option>`).join('')}
            </select>
        </div>
        <button class="btn btn-primary" onclick="saveNewLoginRosterMember()">アカウントを作成する</button>
    `;
    onLrmDepartmentChange();
}

// 部署が組立/操業/設計以外なら役職を「部員」固定にする（DEPT_TIER_TO_PROFILE_ROLEに定義が無い部署は課長/部長の概念が無いため）
function onLrmDepartmentChange() {
    const dept = document.getElementById('lrm_department_select').value;
    const tierSelect = document.getElementById('lrm_tier');
    const hasTiers = !!DEPT_TIER_TO_PROFILE_ROLE[dept];
    tierSelect.disabled = !hasTiers;
    if (!hasTiers) tierSelect.value = 'staff';
}

async function saveNewLoginRosterMember() {
    if (requireLogin()) return;
    const name  = document.getElementById('lrm_name').value.trim();
    const email = document.getElementById('lrm_email').value.trim();
    const department = document.getElementById('lrm_department_select').value;
    const tier  = document.getElementById('lrm_tier').value;

    if (!name || !email || !department) { showToast('名前・メールアドレス・部署は必須です', 'error'); return; }

    showLoading('アカウントを作成中...');
    try {
        const { data, error } = await db.functions.invoke('create-employee', {
            body: { email, name, department, tier }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        await logSettingsChange('roster_edit', `${department}に${name}のログインアカウントを追加`);
        showToast(data?.alreadyHadAuthAccount
            ? '既存のログインアカウントに紐付けて名簿登録しました。'
            : '新規アカウントを作成し名簿登録しました。', 'success');
        showRosterScreen();
    } catch (e) {
        showToast('作成に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 退職処理: ログインアカウントを持つ担当者を、Authアカウントごと完全に削除する
async function deleteLoginRosterMember(profileId) {
    const { data: record } = await db.from('profiles').select('name, role, department').eq('id', profileId).single();
    if (!record) { showToast('データが見つかりません', 'error'); return; }

    const approverBadges = getApproverBadges({ profileRole: record.role });
    const warning = approverBadges.length > 0
        ? `\n\n⚠ この人は「${approverBadges.join('、')}」の承認者です。削除すると、他に同じ役職の人がいない場合、承認フローが止まります。`
        : '';
    if (!confirm(`${record.department}の${record.name}さんを削除します。ログインアカウントごと完全に削除され、元に戻せません。${warning}\n\nよろしいですか？`)) return;

    showLoading('削除中...');
    try {
        const { data, error } = await db.functions.invoke('delete-employee', { body: { profileId } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        await logSettingsChange('roster_edit', `${record.department}の${record.name}を退職処理（アカウント削除）`);
        showToast('削除しました。', 'success');
        showRosterScreen();
    } catch (e) {
        showToast('削除に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 非ログイン名簿(notification_recipients)からの削除
async function deleteNonLoginRosterMember(recipientId) {
    const { data: record } = await db.from('notification_recipients').select('name, department').eq('id', recipientId).single();
    if (!record) { showToast('データが見つかりません', 'error'); return; }
    if (!confirm(`${record.department}の${record.name}さんを名簿から削除します。よろしいですか？`)) return;

    showLoading('削除中...');
    try {
        const { error } = await db.from('notification_recipients').delete().eq('id', recipientId);
        if (error) throw error;
        await logSettingsChange('roster_edit', `${record.department}の${record.name}を名簿から削除`);
        showToast('削除しました。', 'success');
        showRosterScreen();
    } catch (e) {
        showToast('削除に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ----- 変更履歴 -----
const AUDIT_CATEGORY_LABELS = {
    flow_toggle: 'フローON/OFF', fixed_recipients: '通知の宛先',
    recipient_master: '宛先候補', roster_edit: '名簿編集', room_email: '会議室'
};
let auditLogFilter = { category: '', dateFrom: '', dateTo: '' };

async function showAuditLogScreen() {
    settingsView = 'audit_log';
    auditLogFilter = { category: '', dateFrom: '', dateTo: '' };
    const body = document.getElementById('settings_body');
    body.innerHTML = `
        <div class="settings-sticky-header"><button class="btn btn-sm btn-secondary" onclick="showSettingsMenu()">← 戻る</button></div>
        <div class="section-title" style="margin-top:10px;">変更履歴 <span style="font-size:12px; font-weight:400; color:#9aa5b6;">最新100件</span></div>
        <div class="audit-filter">
            <span class="audit-filter-label">絞り込み</span>
            <select id="audit_filter_category" onchange="applyAuditLogFilter()">
                <option value="">項目：すべて</option>
                <option value="roster_edit">名簿編集</option>
                <option value="fixed_recipients">通知の宛先</option>
            </select>
            <input type="date" id="audit_filter_from" onchange="applyAuditLogFilter()">
            <span class="audit-filter-sep">〜</span>
            <input type="date" id="audit_filter_to" onchange="applyAuditLogFilter()">
            <button class="audit-filter-clear" onclick="clearAuditLogFilter()">条件をクリア</button>
        </div>
        <div id="audit_log_rows"><div class="loading-indicator">読み込み中...</div></div>
    `;
    await renderAuditLogRows();
}

// 絞り込み条件をリセットする
async function clearAuditLogFilter() {
    document.getElementById('audit_filter_category').value = '';
    document.getElementById('audit_filter_from').value = '';
    document.getElementById('audit_filter_to').value = '';
    await applyAuditLogFilter();
}

async function applyAuditLogFilter() {
    auditLogFilter.category = document.getElementById('audit_filter_category').value;
    auditLogFilter.dateFrom = document.getElementById('audit_filter_from').value;
    auditLogFilter.dateTo   = document.getElementById('audit_filter_to').value;
    await renderAuditLogRows();
}

// メールアドレス → 表示名 の対応表を作る（変更履歴の「変更者」表示用）
async function fetchNameByEmailMap(emails) {
    const map = {};
    if (!emails.length) return map;
    const [{ data: profRows }, { data: recRows }] = await Promise.all([
        db.from('profiles').select('email, name').in('email', emails),
        db.from('notification_recipients').select('email, name').in('email', emails)
    ]);
    (recRows  || []).forEach(r => { if (r.name) map[String(r.email).toLowerCase()] = r.name; });
    (profRows || []).forEach(p => { if (p.name) map[String(p.email).toLowerCase()] = p.name; }); // profiles を優先
    return map;
}

async function renderAuditLogRows() {
    const rowsEl = document.getElementById('audit_log_rows');
    rowsEl.innerHTML = `<div class="loading-indicator">読み込み中...</div>`;

    let query = db.from('settings_audit_log')
        .select('changed_at, changed_by, category, summary')
        .order('changed_at', { ascending: false })
        .limit(100);
    if (auditLogFilter.category) query = query.eq('category', auditLogFilter.category);
    // 入力欄は日本時間(JST)の日付として扱い、DB保存のUTC時刻と比較できるよう変換する
    if (auditLogFilter.dateFrom) query = query.gte('changed_at', new Date(`${auditLogFilter.dateFrom}T00:00:00+09:00`).toISOString());
    if (auditLogFilter.dateTo)   query = query.lte('changed_at', new Date(`${auditLogFilter.dateTo}T23:59:59+09:00`).toISOString());

    const { data } = await query;
    const rows = data || [];

    if (!rows.length) {
        rowsEl.innerHTML = '<div class="audit-list"><div class="audit-empty">該当する変更履歴がありません</div></div>';
        return;
    }

    // 変更者を名前で表示するための対応表
    const nameByEmail = await fetchNameByEmailMap([...new Set(rows.map(r => r.changed_by).filter(Boolean))]);

    // 日付ごとにグループ化（取得順＝新しい順のまま）
    const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
    const days = [];
    rows.forEach(r => {
        const d = new Date(r.changed_at);
        const dateKey = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        const email = r.changed_by || '';
        const userName = nameByEmail[String(email).toLowerCase()] || email || '—';
        let day = days.find(x => x.dateKey === dateKey);
        if (!day) { day = { dateKey, logs: [] }; days.push(day); }
        day.logs.push({ ...r, time, userName, email });
    });

    rowsEl.innerHTML = `
        <div class="audit-list">
            <div class="audit-head">
                <div>時刻</div>
                <div>変更者</div>
                <div>項目</div>
                <div>内容</div>
            </div>
            ${days.map(day => `
                <div class="audit-day-header">
                    <span class="audit-day-date">${esc(day.dateKey)}</span>
                    <span class="audit-day-count">${day.logs.length}</span>
                </div>
                ${day.logs.map(l => `
                    <div class="audit-row">
                        <div class="audit-time">${esc(l.time)}</div>
                        <div class="audit-user" title="${esc(l.email)}">${esc(l.userName)}</div>
                        <div class="audit-cat-cell"><span class="audit-cat cat-${esc(l.category)}">${esc(AUDIT_CATEGORY_LABELS[l.category] || l.category)}</span></div>
                        <div class="audit-summary">${esc(l.summary)}</div>
                    </div>
                `).join('')}
            `).join('')}
        </div>
    `;
}

async function completePendingItem(requestId, idx, opts = {}) {
    const itemLabel = opts.isQaFlow ? 'タスク' : 'ペンディング項目';
    if (!confirm(`この${itemLabel}を完了にします。よろしいですか？`)) return;
    showLoading('更新中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data, requester_id').eq('id', requestId).single();
        if (!req?.sheet_data) return;

        const items = req.sheet_data.pending_items || [];
        if (!items[idx]) return;

        const d = new Date();
        items[idx] = {
            ...items[idx],
            completed: true,
            completed_date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        };

        const newSheetData = { ...req.sheet_data, pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);

        // 直前の「完了取消」がまだ未送信なら取り消す（誤って取消→すぐ完了に戻した場合に古い通知を送らないため）
        await db.from('approval_notifications')
            .delete()
            .eq('request_id', requestId)
            .eq('notification_type', 'pending_item_uncompleted')
            .eq('detail', items[idx].content)
            .is('emailed_at', null);

        // ペンディング項目が完了したら品証・製管へ通知（組立/試運転/QAフロー共通）
        const notifIds = new Set();
        const { data: qRows } = await db.from('profiles').select('id').eq('role', 'quality');
        (qRows || []).forEach(p => notifIds.add(p.id));
        const { data: sRows } = await db.from('profiles').select('id').eq('role', 'production_control');
        (sRows || []).forEach(p => notifIds.add(p.id));
        notifIds.delete(currentUser.id); // 完了操作をした本人には通知不要
        if (notifIds.size > 0) {
            await db.from('approval_notifications').insert(
                [...notifIds].map(id => ({ request_id: requestId, recipient_id: id, notification_type: 'pending_item_completed', detail: items[idx].content }))
            );
        }

        _applyPendingUpdate(requestId, newSheetData, `${itemLabel}を完了にしました`, opts);
    } catch(e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function uncompletePendingItem(requestId, idx, opts = {}) {
    if (!confirm('完了を取り消します。よろしいですか？')) return;
    showLoading('更新中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data, requester_id').eq('id', requestId).single();
        if (!req?.sheet_data) return;

        const items = req.sheet_data.pending_items || [];
        if (!items[idx]) return;

        items[idx] = { ...items[idx], completed: false, completed_date: null };

        const newSheetData = { ...req.sheet_data, pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);

        // 直前の「完了」がまだ未送信なら取り消す（誤操作で完了にしてすぐ取り消した場合にメール自体を飛ばさないため）
        await db.from('approval_notifications')
            .delete()
            .eq('request_id', requestId)
            .eq('notification_type', 'pending_item_completed')
            .eq('detail', items[idx].content)
            .is('emailed_at', null);

        // ペンディング項目の完了が取り消されたら品証・製管へ通知
        const notifIds = new Set();
        const { data: qRows } = await db.from('profiles').select('id').eq('role', 'quality');
        (qRows || []).forEach(p => notifIds.add(p.id));
        const { data: sRows } = await db.from('profiles').select('id').eq('role', 'production_control');
        (sRows || []).forEach(p => notifIds.add(p.id));
        notifIds.delete(currentUser.id); // 取消操作をした本人には通知不要
        if (notifIds.size > 0) {
            await db.from('approval_notifications').insert(
                [...notifIds].map(id => ({ request_id: requestId, recipient_id: id, notification_type: 'pending_item_uncompleted', detail: items[idx].content }))
            );
        }

        _applyPendingUpdate(requestId, newSheetData, '完了を取り消しました', opts);
    } catch(e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

function _applyPendingUpdate(requestId, newSheetData, toastMsg, opts = {}) {
    // マイページのパネルを即時更新（ペンディング解消/発生で承認待ち⇔ペンディングを瞬時に反映）
    loadMineSide();

    // キャッシュ更新
    if (progressCachedData) {
        for (const num of progressCachedData.baseNums) {
            for (const machine of Object.keys(progressCachedData.projectData[num] || {})) {
                for (const flowReq of Object.values(progressCachedData.projectData[num][machine].flows || {})) {
                    if (flowReq && flowReq.id === requestId) {
                        flowReq.sheet_data = newSheetData;
                    }
                }
            }
        }
        // 組立・電装（2000番台のユニット単位申請含む）は projectData ではなく
        // assemblyReqsByProject / electricalReqsByProject で管理されているため、そちらも更新する
        for (const arr of Object.values(progressCachedData.assemblyReqsByProject || {})) {
            const hit = arr.find(r => r.id === requestId);
            if (hit) hit.sheet_data = newSheetData;
        }
        for (const arr of Object.values(progressCachedData.electricalReqsByProject || {})) {
            const hit = arr.find(r => r.id === requestId);
            if (hit) hit.sheet_data = newSheetData;
        }
        renderProgressCards();
    }

    // モーダルの該当セクションだけ差し替え（開閉なし）
    if (currentDetailReq && currentDetailReq.id === requestId) {
        currentDetailReq.sheet_data = newSheetData;
        const isMyRequest = currentDetailReq.requester_id === currentUser.id;
        if (QA_MEETING_FLOWS.includes(currentDetailReq.flow_type)) {
            const el = document.getElementById('qa_result_section');
            if (el) {
                el.innerHTML = buildQaResultSectionInner(currentDetailReq, isMyRequest);
                const footerEl = document.getElementById('detail_footer');
                if (footerEl) footerEl.innerHTML = buildQaFooterInner(currentDetailReq);
                showToast(toastMsg, 'success', true);
                return;
            }
        } else {
            const el = document.getElementById('pending_detail_section');
            if (el) {
                el.innerHTML = buildPendingSectionInner(currentDetailReq, isMyRequest);
                showToast(toastMsg, 'success', true);
                return;
            }
        }
    }
    // 詳細モーダルを介さない呼び出し元（出荷後対応一覧など）では、勝手にモーダルを開かない
    if (opts.skipModalFallback) {
        showToast(toastMsg, 'success', true);
        return;
    }
    // フォールバック: モーダルを再描画
    openDetailModal(requestId).then(() => showToast(toastMsg, 'success', true));
}

const PENDING_PHOTO_BUCKET = 'pending-item-photos';

// ペンディング項目の修正箇所写真をアップロードし、Storage内のパスを返す
async function _uploadPendingPhoto(requestId, itemId, file) {
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${requestId}/${itemId}.${ext}`;
    const { error } = await db.storage.from(PENDING_PHOTO_BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
}

// ペンディング項目の写真をStorageから削除
async function _deletePendingPhoto(photoPath) {
    if (!photoPath) return;
    await db.storage.from(PENDING_PHOTO_BUCKET).remove([photoPath]);
}

function pendingPhotoUrl(photoPath) {
    if (!photoPath) return '';
    return db.storage.from(PENDING_PHOTO_BUCKET).getPublicUrl(photoPath).data.publicUrl;
}

function openPhotoLightbox(url) {
    document.getElementById('photo_lightbox_img').src = url;
    document.getElementById('photo_lightbox').classList.add('open');
}

function closePhotoLightbox() {
    document.getElementById('photo_lightbox').classList.remove('open');
    document.getElementById('photo_lightbox_img').src = '';
}

// ===== 開催結果・ペンディング確認（簡易検査・外観検査・出荷確認会議） =====
// ペンディング項目の担当者に「割り当てられた」ことを通知（profilesに無ければnotification_recipientsへメールのみ）
// content: 通知本文にどの項目かわかるよう添える内容テキスト
async function _notifyPendingOwner(requestId, owner, content = null) {
    const { data: pRows } = await db.from('profiles').select('id').eq('name', owner);
    if (pRows?.length > 0) {
        await db.from('approval_notifications').insert(
            pRows.map(p => ({ request_id: requestId, recipient_id: p.id, notification_type: 'pending_item_assigned', detail: content }))
        );
    } else {
        const { data: nRows } = await db.from('notification_recipients').select('email').eq('name', owner).eq('active', true);
        if (nRows?.length > 0) {
            await db.from('approval_notifications').insert(
                nRows.map(n => ({ request_id: requestId, recipient_email: n.email, notification_type: 'pending_item_assigned', detail: content }))
            );
        }
    }
}

async function addQaPendingItem(requestId) {
    if (requireLogin()) return;
    const contentEl    = document.getElementById('qa_pending_content');
    const locationEl   = document.getElementById('qa_pending_location');
    const ownerEl      = document.getElementById('qa_pending_owner');
    const dueEl        = document.getElementById('qa_pending_due');
    const shipAfterEl  = document.getElementById('qa_pending_ship_after');
    const photoEl      = document.getElementById('qa_pending_photo');
    const content      = contentEl ? contentEl.value.trim() : '';
    const location     = locationEl ? locationEl.value.trim() : '';
    const owner        = ownerEl ? ownerEl.value.trim() : '';
    const due          = dueEl ? dueEl.value : '';
    const shipAfter    = shipAfterEl ? shipAfterEl.checked : false;
    const photoFile    = photoEl?.files?.[0] || null;
    if (!content) { showToast('内容を入力してください', 'error'); return; }

    showLoading('追加中...');
    try {
        const id = crypto.randomUUID();
        let photoPath = null;
        if (photoFile) photoPath = await _uploadPendingPhoto(requestId, id, photoFile);

        const { data: req } = await db.from('approval_requests')
            .select('sheet_data').eq('id', requestId).single();
        const items = req?.sheet_data?.pending_items || [];
        items.push({ id, content, location: location || null, due, owner: owner || null, completed: false, completed_date: null, ship_after: shipAfter, photo_path: photoPath });
        const newSheetData = { ...(req?.sheet_data || {}), pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);

        if (owner) await _notifyPendingOwner(requestId, owner, content);

        _applyPendingUpdate(requestId, newSheetData, 'タスクを追加しました');
    } catch (e) {
        showToast('追加に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

function _refreshQaPendingSection() {
    if (!currentDetailReq) return;
    const el = document.getElementById('pending_detail_section');
    if (el) {
        const isMyRequest = currentDetailReq.requester_id === currentUser.id;
        el.innerHTML = buildPendingSectionInner(currentDetailReq, isMyRequest);
    }
}

function startEditQaPendingItem(idx) {
    qaEditingPendingIdx = idx;
    _refreshQaPendingSection();
}

function cancelEditQaPendingItem() {
    qaEditingPendingIdx = null;
    _refreshQaPendingSection();
}

async function saveEditQaPendingItem(requestId, idx) {
    if (requireLogin()) return;
    const contentEl     = document.getElementById(`qa_edit_content_${idx}`);
    const locationEl    = document.getElementById(`qa_edit_location_${idx}`);
    const ownerEl       = document.getElementById(`qa_edit_owner_${idx}`);
    const dueEl         = document.getElementById(`qa_edit_due_${idx}`);
    const shipAfterEl   = document.getElementById(`qa_edit_ship_after_${idx}`);
    const photoEl       = document.getElementById(`qa_edit_photo_${idx}`);
    const photoRemoveEl = document.getElementById(`qa_edit_photo_remove_${idx}`);
    const content       = contentEl ? contentEl.value.trim() : '';
    const location      = locationEl ? locationEl.value.trim() : '';
    const due           = dueEl ? dueEl.value : '';
    const photoFile     = photoEl?.files?.[0] || null;
    if (!content) { showToast('内容を入力してください', 'error'); return; }

    showLoading('更新中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data, flow_type').eq('id', requestId).single();
        const items = req?.sheet_data?.pending_items || [];
        if (!items[idx]) return;
        const prevOwner   = items[idx].owner || '';
        const prevContent = items[idx].content;
        const newOwner    = ownerEl ? ownerEl.value.trim() : prevOwner;
        // 試運転は完了予定日・出荷後対応を廃止したため、編集フォームに欄が無ければ常にクリアする
        const shipAfter   = shipAfterEl ? shipAfterEl.checked : (req?.flow_type === 'test_run' ? false : !!items[idx].ship_after);

        let photoPath = items[idx].photo_path || null;
        if (photoFile) {
            const itemId = items[idx].id || crypto.randomUUID();
            photoPath = await _uploadPendingPhoto(requestId, itemId, photoFile);
            if (items[idx].photo_path && items[idx].photo_path !== photoPath) await _deletePendingPhoto(items[idx].photo_path);
            items[idx] = { ...items[idx], id: itemId };
        } else if (photoRemoveEl?.checked && photoPath) {
            await _deletePendingPhoto(photoPath);
            photoPath = null;
        }

        items[idx] = { ...items[idx], content, location: location || null, due, ship_after: shipAfter, photo_path: photoPath, ...(ownerEl ? { owner: newOwner || null } : {}) };
        const newSheetData = { ...(req?.sheet_data || {}), pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);

        if (newOwner && newOwner !== prevOwner) {
            // 直前の担当者への未送信の割り当て通知が残っていれば取り消す（担当者変更が誤操作からの訂正だった場合に誤送信を防ぐ）
            await db.from('approval_notifications')
                .delete()
                .eq('request_id', requestId)
                .eq('notification_type', 'pending_item_assigned')
                .eq('detail', prevContent)
                .is('emailed_at', null);
            await _notifyPendingOwner(requestId, newOwner, content);
        }

        qaEditingPendingIdx = null;
        _applyPendingUpdate(requestId, newSheetData, 'タスクを更新しました');
    } catch (e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteQaPendingItem(requestId, idx) {
    if (requireLogin()) return;
    if (!confirm('このタスクを削除します。よろしいですか？')) return;

    showLoading('削除中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data').eq('id', requestId).single();
        const items = req?.sheet_data?.pending_items || [];
        const [removed] = items.splice(idx, 1);
        const newSheetData = { ...(req?.sheet_data || {}), pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);
        if (removed?.photo_path) await _deletePendingPhoto(removed.photo_path);

        // 削除した項目宛の未送信の割り当て通知が残っていれば取り消す（誤って追加してすぐ削除した場合に誤送信を防ぐ）
        if (removed?.content) {
            await db.from('approval_notifications')
                .delete()
                .eq('request_id', requestId)
                .eq('notification_type', 'pending_item_assigned')
                .eq('detail', removed.content)
                .is('emailed_at', null);
        }

        _applyPendingUpdate(requestId, newSheetData, 'タスクを削除しました');
    } catch (e) {
        showToast('削除に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function sendFixCard(requestId) {
    if (!confirm('タスクリストをメールで送信します（数分以内に届きます）。\n宛先はこの検査の開催案内と同じです。よろしいですか？')) return;
    showLoading('送信予約中...');
    try {
        const { data, error } = await db.functions.invoke('send-fix-card', { body: { requestId } });
        if (error) {
            let msg = error.message;
            try {
                const body = await error.context.json();
                if (body?.error) msg = body.error;
            } catch (_) { /* ignore parse failure, fall back to error.message */ }
            throw new Error(msg);
        }
        showToast(`タスクリストの送信を予約しました（${data?.queued ?? 0}件・数分以内に届きます）${data?.testMode ? ' ※テストモード' : ''}`, 'success');
    } catch (e) {
        showToast('送信予約に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function finalizeQaMeeting(requestId) {
    if (!confirm('この開催案内を完了にします。よろしいですか？')) return;

    showLoading('処理中...');
    try {
        const { data: reqRow } = await db.from('approval_requests')
            .select('project_number, machine_name').eq('id', requestId).single();

        await db.from('approval_requests')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        // 外観検査/簡易検査/出荷品確認検査のいずれか＋（あれば）出荷確認会議が揃って完了したら、出荷フローを自動起票する
        if (reqRow?.project_number && reqRow?.machine_name) {
            await _autoIssueShippingIfReady(reqRow.project_number, reqRow.machine_name);
        }

        closeDetailModal();
        await refreshAll();
        showToast('完了にしました', 'success');
    } catch (e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== 日程変更（簡易検査・外観検査・出荷確認会議） =====
let rescheduleModalReqId = null; // 日程変更モーダルが対象としている申請ID

async function openRescheduleModal(requestId) {
    const req = currentDetailReq;
    if (!req || req.id !== requestId) return;

    rescheduleModalReqId = requestId;
    document.getElementById('reschedule_modal_title').textContent =
        `詳細変更－${QA_DETAIL_TITLE_LABELS[req.flow_type] || ''}`;
    document.getElementById('reschedule_date_input').value = req.inspection_date || '';
    document.getElementById('reschedule_time_hour').value  = req.inspection_time ? req.inspection_time.split(':')[0] : '';
    document.getElementById('reschedule_time_min').value   = req.inspection_time ? req.inspection_time.split(':')[1] : '';
    document.getElementById('reschedule_note_input').value = req.note || '';

    const locInput  = document.getElementById('reschedule_location_input');
    const locSelect = document.getElementById('reschedule_location_select');
    const locHint   = document.getElementById('reschedule_location_hint');
    if (req.flow_type === 'shipping_meeting') {
        locInput.style.display  = 'none';
        locSelect.style.display = '';
        locHint.style.display   = 'none';
        locSelect.value = req.inspection_location || '';
    } else {
        locInput.style.display  = '';
        locSelect.style.display = 'none';
        locHint.style.display   = '';
        buildLocationCheckboxes('reschedule_location_input');
        setLocationCheckboxValue('reschedule_location_input', req.inspection_location || '');
    }

    extraRecipients.reschedule = [];
    renderExtraList('reschedule');
    await renderExistingRecipients(requestId);

    const btn = document.getElementById('btn_save_reschedule');
    btn.disabled = false; btn.textContent = '保存して通知';

    document.getElementById('reschedule_modal').classList.add('open');
}

async function renderExistingRecipients(requestId) {
    const listEl = document.getElementById('reschedule_recipients_list');
    listEl.innerHTML = '<div style="color:#aaa;font-size:13px;padding:8px;">読み込み中...</div>';

    const [{ data: notifs }, { data: rsvps }] = await Promise.all([
        db.from('approval_notifications')
            .select('recipient_id, recipient_email, optional')
            .eq('request_id', requestId)
            .not('emailed_at', 'is', null),
        db.from('invitation_rsvp').select('email, status').eq('request_id', requestId)
    ]);
    // 辞退済みの人は「名簿から選択」の候補から除外しない（再度招待し直せるようにするため）
    const declinedEmails = new Set(
        (rsvps || []).filter(r => r.status === 'declined').map(r => (r.email || '').toLowerCase())
    );

    const seen = new Set();
    const uniqueNotifs = (notifs || []).filter(n => {
        const key = n.recipient_id || n.recipient_email;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    recipientOptionalKeys.reschedule = new Set();
    uniqueNotifs.forEach(n => {
        const key = n.recipient_id || n.recipient_email;
        if (key && n.optional) recipientOptionalKeys.reschedule.add(key);
    });

    const profileIds = uniqueNotifs.filter(n => n.recipient_id).map(n => n.recipient_id);
    let profileMap = {};
    if (profileIds.length > 0) {
        const { data: prs } = await db.from('profiles').select('id, name, email').in('id', profileIds);
        if (prs) prs.forEach(p => { profileMap[p.id] = p; });
    }

    // recipient_idが未設定の宛先は、メールアドレスでprofiles・notification_recipientsを再検索して名前を補完する
    // （過去に上長メール等がrecipient_idと紐付けられずrecipient_emailのみで保存されたケースの救済）
    const emailsWithoutId = uniqueNotifs.filter(n => !n.recipient_id && n.recipient_email).map(n => n.recipient_email);
    let nameByEmail = {};
    if (emailsWithoutId.length > 0) {
        const [{ data: recs }, { data: prsByEmail }] = await Promise.all([
            db.from('notification_recipients').select('name, email').in('email', emailsWithoutId),
            db.from('profiles').select('name, email').in('email', emailsWithoutId)
        ]);
        (recs      || []).forEach(r => { if (r.email) nameByEmail[r.email] = r.name; });
        (prsByEmail || []).forEach(p => { if (p.email) nameByEmail[p.email] = p.name; }); // profilesを優先
    }

    const rows = uniqueNotifs.map(n => {
        const key = n.recipient_id || n.recipient_email;
        const p = n.recipient_id ? profileMap[n.recipient_id] : null;
        const name  = p?.name || (n.recipient_email && nameByEmail[n.recipient_email]) || n.recipient_email || '—';
        const email = p?.email || n.recipient_email || '—';
        return `
        <div class="recipient-item">
            <span class="recipient-name">${esc(name)}</span>
            <span class="recipient-email">${esc(email)}</span>
            <label class="recipient-optional-toggle" onclick="event.stopPropagation();">
                <input type="checkbox" ${recipientOptionalKeys.reschedule.has(key) ? '' : 'checked'} onchange="toggleRecipientOptional('reschedule', '${esc(key)}', !this.checked)">
                必須
            </label>
        </div>`;
    }).join('');

    listEl.innerHTML = rows || '<div style="color:#aaa;font-size:13px;padding:8px;">宛先なし</div>';

    existingRecipientEmails.reschedule = new Set(
        uniqueNotifs.map(n => {
            const p = n.recipient_id ? profileMap[n.recipient_id] : null;
            return (p?.email || n.recipient_email || '').toLowerCase();
        }).filter(email => email && !declinedEmails.has(email))
    );
    await renderExtraProfileSelect('reschedule');
}

function closeRescheduleModal() {
    document.getElementById('reschedule_modal').classList.remove('open');
    rescheduleModalReqId = null;
}

async function saveReschedule() {
    if (requireLogin()) return;
    const requestId = rescheduleModalReqId;
    if (!requestId) return;

    const newDate = document.getElementById('reschedule_date_input').value;
    const newHour = document.getElementById('reschedule_time_hour').value;
    const newMin  = document.getElementById('reschedule_time_min').value;
    if (!newDate) { showToast('開催日を入力してください', 'error'); return; }
    const newTime = (newHour && newMin) ? `${newHour}:${newMin}` : null;

    const isShippingMeeting = currentDetailFlowType === 'shipping_meeting';
    const newLocation = isShippingMeeting
        ? document.getElementById('reschedule_location_select').value
        : getLocationValue('reschedule_location_input');
    if (!newLocation) { showToast('場所を選択してください', 'error'); return; }
    const oldLocation = currentDetailReq?.inspection_location || '';
    const newNote = document.getElementById('reschedule_note_input').value.trim() || null;
    const oldNote = currentDetailReq?.note || null;

    // 日時が実際に変わったかどうか（変更通知の文面種別の判定に使う）
    const oldDate = currentDetailReq?.inspection_date || '';
    const oldTime = currentDetailReq?.inspection_time ? currentDetailReq.inspection_time.slice(0, 5) : null;
    const dateTimeChanged = newDate !== oldDate || newTime !== oldTime;
    // 日時・場所・備考のいずれかが変わったか（参加者追加だけの保存では既存参加者へ再通知しないための判定）
    const contentChanged = dateTimeChanged || newLocation !== oldLocation || newNote !== oldNote;

    const btn = document.getElementById('btn_save_reschedule');
    btn.disabled = true; btn.textContent = '保存中...';
    showLoading('処理中...');

    try {
        await db.from('approval_requests').update({
            inspection_date:     newDate,
            inspection_time:     newTime,
            inspection_location: newLocation,
            note:                newNote,
            updated_at:          new Date().toISOString()
        }).eq('id', requestId);

        // 日時変更でも既存参加者の出欠回答はリセットしない。回答を変え直したい人だけ
        // アウトルック上で回答し直せばよく、そのメール（REPLY）を check-rsvp.js が拾って
        // invitation_rsvp を上書き更新する（新規追加された参加者は下の通知処理で
        // approval_notifications に登録されることで出欠状況に「未回答」として表示される）

        // 元の送信済み通知の宛先に変更通知を再送
        const { data: existingNotifs } = await db.from('approval_notifications')
            .select('recipient_id, recipient_email, optional')
            .eq('request_id', requestId)
            .not('emailed_at', 'is', null);

        const rescheduleType = isShippingMeeting
            ? 'shipping_meeting_reschedule'
            : currentDetailFlowType === 'inspection'
            ? 'inspection_reschedule'
            : currentDetailFlowType === 'shipping_check_inspection'
            ? 'shipping_check_inspection_reschedule'
            : 'simple_inspection_reschedule';

        if (existingNotifs?.length > 0) {
            const seen = new Set();
            const notifs = [];
            const optionalUpdates = [];
            for (const n of existingNotifs) {
                const key = n.recipient_id || n.recipient_email;
                if (key && !seen.has(key)) {
                    seen.add(key);
                    const newOptional = recipientOptionalKeys.reschedule.has(key);
                    if (newOptional !== !!n.optional) {
                        optionalUpdates.push({ recipientId: n.recipient_id || null, email: n.recipient_email || null, optional: newOptional });
                    }
                    // 参加者追加だけの保存（日時・場所・備考は無変更）では、既存参加者に「変更通知」を再送しない
                    if (contentChanged) {
                        notifs.push({
                            request_id:        requestId,
                            recipient_id:      n.recipient_id    || null,
                            recipient_email:   n.recipient_email || null,
                            notification_type: rescheduleType,
                            optional:          newOptional
                        });
                    }
                }
            }
            if (notifs.length > 0) await db.from('approval_notifications').insert(notifs);

            // 必須/任意が変更された宛先は、過去分の通知レコードも一括更新し出欠状況表示等との整合性を保つ
            for (const u of optionalUpdates) {
                const q = db.from('approval_notifications').update({ optional: u.optional }).eq('request_id', requestId);
                await (u.recipientId ? q.eq('recipient_id', u.recipientId) : q.eq('recipient_email', u.email));
            }
        }

        // 出荷確認会議で会議室を変更した場合、旧会議室の予約を解除する
        if (isShippingMeeting && oldLocation !== newLocation) {
            const oldRoomEmail = ROOM_EMAILS[oldLocation];
            if (oldRoomEmail) {
                await db.from('approval_notifications').insert({
                    request_id:        requestId,
                    recipient_email:   oldRoomEmail,
                    notification_type: 'shipping_meeting_room_change_cancel'
                });
            }
        }

        // 新規追加された参加者には招待通知を送る
        if (extraRecipients.reschedule.length > 0) {
            const inviteType = isShippingMeeting
                ? 'shipping_meeting_invite'
                : currentDetailFlowType === 'inspection'
                ? 'inspection_invite'
                : currentDetailFlowType === 'shipping_check_inspection'
                ? 'shipping_check_inspection_invite'
                : 'simple_inspection_invite';
            await db.from('approval_notifications').insert(
                extraRecipients.reschedule.map(r => ({
                    request_id:        requestId,
                    recipient_email:   r.email,
                    notification_type: inviteType,
                    optional:          !!r.optional
                }))
            );
            extraRecipients.reschedule = [];
        }

        closeRescheduleModal();
        closeDetailModal();
        await refreshAll();
        showToast(
            contentChanged
                ? '日程を変更しました。関係者に変更通知を送ります。'
                : '参加者を追加しました。追加した参加者に開催案内を送ります。',
            'success'
        );
    } catch (e) {
        showToast('保存に失敗しました: ' + e.message, 'error');
        btn.disabled = false; btn.textContent = '保存して通知';
    } finally {
        hideLoading();
    }
}

// ===== キャンセル（簡易検査・出荷確認会議） =====
async function cancelMeeting(requestId, flowType) {
    const label = flowType === 'shipping_meeting' ? '出荷確認会議'
        : flowType === 'inspection' ? '外観検査'
        : flowType === 'shipping_check_inspection' ? '出荷品確認検査'
        : '簡易検査';
    if (!confirm(`${label}の開催をキャンセルします。\n参加者にキャンセル通知を送ります。よろしいですか？`)) return;

    showLoading('処理中...');
    try {
        await db.from('approval_requests')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        // まだ送信されていない開催案内が残っていれば削除する（キャンセル済みの会議への招待が後から届くのを防ぐ）
        const inviteType = flowType === 'shipping_meeting'
            ? 'shipping_meeting_invite'
            : flowType === 'inspection'
            ? 'inspection_invite'
            : flowType === 'shipping_check_inspection'
            ? 'shipping_check_inspection_invite'
            : 'simple_inspection_invite';
        await db.from('approval_notifications')
            .delete()
            .eq('request_id', requestId)
            .eq('notification_type', inviteType)
            .is('emailed_at', null);

        const { data: existingNotifs } = await db.from('approval_notifications')
            .select('recipient_id, recipient_email')
            .eq('request_id', requestId)
            .not('emailed_at', 'is', null);

        const cancelType = flowType === 'shipping_meeting'
            ? 'shipping_meeting_cancel'
            : flowType === 'inspection'
            ? 'inspection_cancel'
            : flowType === 'shipping_check_inspection'
            ? 'shipping_check_inspection_cancel'
            : 'simple_inspection_cancel';

        if (existingNotifs?.length > 0) {
            const seen = new Set();
            const notifs = [];
            for (const n of existingNotifs) {
                const key = n.recipient_id || n.recipient_email;
                if (key && !seen.has(key)) {
                    seen.add(key);
                    notifs.push({
                        request_id:        requestId,
                        recipient_id:      n.recipient_id    || null,
                        recipient_email:   n.recipient_email || null,
                        notification_type: cancelType
                    });
                }
            }
            if (notifs.length > 0) await db.from('approval_notifications').insert(notifs);
        }

        closeDetailModal();
        await refreshAll();
        showToast(`${label}をキャンセルしました。関係者にキャンセル通知を送ります。`, 'success');
    } catch (e) {
        showToast('エラーが発生しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// フロー承認完了時に全体工程表のタスク完了チェックを自動連動（承認→完了の一方通行のみ）
// 2026-09-07 本番運用開始に伴いON
const FLOW_TASK_SYNC_ENABLED = true;
// 出荷は承認完了≠実出荷完了（未来日の出荷予定を承認するケースがあるため）連携対象外とする（意図的に手動のまま）
// 2026-09-22 検査・会議系4フロー（簡易検査/外観検査/出荷品確認検査/出荷確認会議）を追加
const FLOW_APPROVAL_TASK_TEXT = {
    assembly:                  '機械組立',
    test_run:                  '試運転',
    electrical:                '電気艤装',
    simple_inspection:         '簡易検査',
    inspection:                '外観検査',
    shipping_check_inspection: '出荷品確認検査',
    shipping_meeting:          '出荷確認会議'
};

async function syncTaskCompletionOnFlowApproval(req) {
    if (!FLOW_TASK_SYNC_ENABLED) return;
    const taskText = FLOW_APPROVAL_TASK_TEXT[req?.flow_type];
    if (!taskText || !req.project_number || !req.machine_name) return;
    try {
        let q = db.from('tasks').update({ is_completed: true })
            .eq('project_number', req.project_number)
            .eq('machine', req.machine_name)
            .eq('text', taskText);
        if (req.unit_name) q = q.eq('unit', req.unit_name); // ユニット単位申請の場合は対象ユニットのタスク行のみ更新する
        await q;
    } catch (e) {
        console.warn('全体工程表への完了連携に失敗:', e);
    }
}

// 出荷日（仮/確定、工場出荷/梱包出荷）を工程表(tasksテーブル)のstart_date・end_dateへ書き戻す（承認フロー→工程表の一方向反映）
// 承認フロー対象（2000番台以外）の出荷タスクは単日のため、開始日・終了日を同じ日付に揃える
// FLOW_TASK_SYNC_ENABLED（完了フラグ連携用）とは独立したフラグ
const SHIPPING_DATE_TASK_SYNC_ENABLED = true;

async function syncShippingDateToTasks(req, { factoryDate, factoryDate2, packingDate } = {}) {
    if (!SHIPPING_DATE_TASK_SYNC_ENABLED) return;
    if (!req?.project_number) return;
    try {
        // ロック(shipping_date_locked)はここでは一切触れない。承認フロー自身は常に書き込めるため
        // ロックの有無に関係なく変更でき、かつ「一度承認された出荷日は次の承認完了までロックされ続ける」
        // 挙動（未承認のうちはfalseのまま、承認済みの再申請中はtrueのまま）を維持できる。
        if (factoryDate && req.machine_name) {
            // 分割出荷（同一機械に工場出荷タスクが2件）の場合は、end_date昇順で①②それぞれのタスク行を個別に更新する
            if (factoryDate2) {
                const { data: factoryTasks } = await db.from('tasks')
                    .select('id, end_date')
                    .eq('project_number', req.project_number)
                    .eq('machine', req.machine_name)
                    .eq('text', '工場出荷')
                    .order('end_date', { ascending: true });
                if (factoryTasks?.[0]) {
                    await db.from('tasks').update({ start_date: factoryDate, end_date: factoryDate }).eq('id', factoryTasks[0].id);
                }
                if (factoryTasks?.[1]) {
                    await db.from('tasks').update({ start_date: factoryDate2, end_date: factoryDate2 }).eq('id', factoryTasks[1].id);
                }
            } else {
                await db.from('tasks').update({ start_date: factoryDate, end_date: factoryDate })
                    .eq('project_number', req.project_number)
                    .eq('machine', req.machine_name)
                    .eq('text', '工場出荷');
            }
        }
        if (packingDate) {
            // 梱包出荷は機械単位ではなく工事番号全体で1つの場合があるため machine では絞り込まない
            await db.from('tasks').update({ start_date: packingDate, end_date: packingDate })
                .eq('project_number', req.project_number)
                .eq('text', '梱包出荷');
        }
    } catch (e) {
        console.warn('工程表への出荷日書き戻しに失敗:', e);
    }
}

// 出荷フローが常務承認で完了した時点で、全体工程表・入出荷予定一覧表からの
// 出荷日直接変更を禁止するロックをかける（変更は承認フロー[changeConfirmedShippingDate]経由のみ許可）
async function lockShippingDateOnApproval(req) {
    if (!req?.project_number) return;
    try {
        let q = db.from('tasks').update({ shipping_date_locked: true })
            .eq('project_number', req.project_number)
            .in('text', ['工場出荷', '梱包出荷']);
        if (req.machine_name) q = q.eq('machine', req.machine_name);
        await q;
    } catch (e) {
        console.warn('出荷日ロックの設定に失敗:', e);
    }
}

// 出荷フローが常務承認で完了した時点で、入出荷予定一覧表(task_shipment_overlays)の
// 状態列を「確定」にする。既存overlay行の他項目（時間帯・製管担当・品名・備考）は保持したまま status だけ更新する
async function markShippingOverlayConfirmed(req) {
    if (!req?.project_number) return;
    try {
        let q = db.from('tasks').select('id')
            .eq('project_number', req.project_number)
            .in('text', ['工場出荷', '梱包出荷']);
        if (req.machine_name) q = q.eq('machine', req.machine_name);
        const { data: taskRows } = await q;
        if (!taskRows?.length) return;
        const taskIds = taskRows.map(t => t.id);

        const { data: existingOverlays } = await db.from('task_shipment_overlays')
            .select('task_id, time_slot, mfg_rep, product_name, note')
            .in('task_id', taskIds);
        const existingMap = new Map((existingOverlays || []).map(o => [o.task_id, o]));

        const payload = taskIds.map(id => {
            const ex = existingMap.get(id) || {};
            return {
                task_id: id,
                time_slot: ex.time_slot ?? null,
                status: '確定',
                mfg_rep: ex.mfg_rep ?? null,
                product_name: ex.product_name ?? null,
                note: ex.note ?? null,
            };
        });
        await db.from('task_shipment_overlays').upsert(payload, { onConflict: 'task_id' });
    } catch (e) {
        console.warn('入出荷予定一覧表への状態(確定)反映に失敗:', e);
    }
}

// ===== Approve =====
async function approveStep(requestId, stepId, stepOrder) {
    if (requireLogin()) return;
    // 二重クリックで承認処理・通知が重複しないようボタンを即座に無効化する
    const btn = (typeof event !== 'undefined' && event?.currentTarget) || null;
    if (btn) { if (btn.disabled) return; btn.disabled = true; }
    const confirmLabel = currentDetailReq?.machine_name || currentDetailReq?.project_number || 'この申請';
    if (!confirm(`${confirmLabel}を承認します。よろしいですか？`)) { if (btn) btn.disabled = false; return; }
    const comment  = (document.getElementById('approval_comment')?.value || '').trim();

    // assembly・test_run はいずれも並列承認（どちらかが承認した時点で即完了）
    const isParallel = currentDetailFlowType === 'assembly' || currentDetailFlowType === 'test_run';
    showLoading('処理中...');
    let nextStatus;
    if (isParallel) {
        nextStatus = 'approved';
    } else {
        const { data: remaining } = await db.from('approval_steps')
            .select('id').eq('request_id', requestId).gt('step_order', stepOrder).eq('status', 'pending');
        nextStatus = (remaining && remaining.length > 0) ? 'in_review' : 'approved';
    }

    try {
        await db.from('approval_steps').update({
            status:      'approved',
            approver_id: currentUser.id,
            comment:     comment || null,
            decided_at:  new Date().toISOString()
        }).eq('id', stepId);

        await db.from('approval_requests').update({
            status:     nextStatus,
            updated_at: new Date().toISOString()
        }).eq('id', requestId);

        if (nextStatus === 'in_review') {
            // Step1承認 → Step2承認者に通知
            const STEP2_ROLES = { assembly: 'assembly_director', test_run: 'operations_director' };
            const step2Role = STEP2_ROLES[currentDetailFlowType];
            if (step2Role) {
                const { data: step2Approvers } = await db.from('profiles').select('id').eq('role', step2Role);
                if (step2Approvers?.length > 0) {
                    await db.from('approval_notifications').insert(
                        step2Approvers.map(a => ({
                            request_id: requestId, recipient_id: a.id, notification_type: 'approval_request'
                        }))
                    );
                }
            }
        }

        if (nextStatus === 'approved' && isParallel) {
            // 並列承認: 残っている他のステップを取得してキャンセル＋相手に通知
            const { data: otherSteps } = await db.from('approval_steps')
                .select('id, approver_role').eq('request_id', requestId).eq('status', 'pending').neq('id', stepId);
            if (otherSteps?.length > 0) {
                await db.from('approval_steps').update({ status: 'cancelled' })
                    .in('id', otherSteps.map(s => s.id));
                for (const os of otherSteps) {
                    const { data: others } = await db.from('profiles').select('id').eq('role', os.approver_role);
                    if (others?.length > 0) {
                        await db.from('approval_notifications').insert(
                            others.map(a => ({ request_id: requestId, recipient_id: a.id, notification_type: 'completed_by_other' }))
                        );
                    }
                }
            }
        }

        if (nextStatus === 'approved') {
            await syncTaskCompletionOnFlowApproval(currentDetailReq);
            if (currentDetailFlowType === 'shipping') {
                await lockShippingDateOnApproval(currentDetailReq);
                await markShippingOverlayConfirmed(currentDetailReq);
            }
            await recordNotifications(requestId);
            // 承認者本人にも完了通知を送る（すでに宛先に含まれている場合はスキップ）
            const { data: existing } = await db.from('approval_notifications')
                .select('id').eq('request_id', requestId).eq('recipient_id', currentUser.id)
                .eq('notification_type', 'completed').maybeSingle();
            if (!existing) {
                await db.from('approval_notifications').insert({
                    request_id: requestId, recipient_id: currentUser.id, notification_type: 'completed'
                });
            }
        }

        closeDetailModal();
        await refreshAll();
        ui.send('SAVED');

        const STEP2_LABEL = { assembly: '組立部長', test_run: '操業部長' };
        const nextLabel = STEP2_LABEL[currentDetailFlowType] || '上位承認者';
        const msg = nextStatus === 'in_review'
            ? `承認しました。${nextLabel}に通知されます。`
            : '全承認が完了しました。関係者に通知が送られます。';
        showToast(msg, 'success');
    } catch (e) {
        showToast('承認処理に失敗しました: ' + e.message, 'error');
        if (btn) btn.disabled = false;
    } finally {
        hideLoading();
    }
}

// ===== Reject =====
async function rejectStep(requestId, stepId) {
    if (requireLogin()) return;
    const comment = (document.getElementById('approval_comment')?.value || '').trim();
    if (!comment) { showToast('却下する場合はコメントを入力してください。', 'error'); return; }
    const confirmLabel = currentDetailReq?.machine_name || currentDetailReq?.project_number || 'この申請';
    if (!confirm(`${confirmLabel}を却下します。よろしいですか？`)) return;

    showLoading('処理中...');
    try {
        await db.from('approval_steps').update({
            status:      'rejected',
            approver_id: currentUser.id,
            comment:     comment,
            decided_at:  new Date().toISOString()
        }).eq('id', stepId);

        await db.from('approval_requests').update({
            status:     'rejected',
            updated_at: new Date().toISOString()
        }).eq('id', requestId);

        // 申請者に却下通知を記録
        const { data: rejReq } = await db.from('approval_requests')
            .select('requester_id').eq('id', requestId).single();
        if (rejReq?.requester_id) {
            await db.from('approval_notifications').insert({
                request_id: requestId, recipient_id: rejReq.requester_id, notification_type: 'rejected'
            });
        }

        closeDetailModal();
        await refreshAll();
        ui.send('SAVED');
        showToast('却下しました。申請者に通知されます。', 'success');
    } catch (e) {
        showToast('処理に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== Resubmit =====
async function resubmit(requestId) {
    if (!confirm('再申請しますか？承認ステップがリセットされます。')) return;
    showLoading('処理中...');
    try {
        await db.from('approval_steps').update({
            status:      'pending',
            approver_id: null,
            comment:     null,
            decided_at:  null
        }).eq('request_id', requestId);

        await db.from('approval_requests').update({
            status:       'submitted',
            is_resubmit:  true,
            updated_at:   new Date().toISOString()
        }).eq('id', requestId);

        // 全ステップの承認者に再申請通知を記録（assembly/test_run並列承認対応。shipping_prepは承認ステップを持たないため対象外）
        const { data: allSteps } = await db.from('approval_steps').select('approver_role').eq('request_id', requestId);
        const rolesToNotify = [...new Set((allSteps || []).map(s => s.approver_role))]
            .filter(r => r !== 'production_control');
        for (const role of rolesToNotify) {
            const { data: approvers } = await db.from('profiles').select('id').eq('role', role);
            if (approvers?.length > 0) {
                await db.from('approval_notifications').insert(
                    approvers.map(a => ({ request_id: requestId, recipient_id: a.id, notification_type: 'resubmit' }))
                );
            }
        }

        closeDetailModal();
        await refreshAll();
        showToast('再申請しました。承認者に通知されます。', 'success');
    } catch (e) {
        showToast('再申請に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== 共通ヘルパー =====
async function _loadMachineCheckboxes(projectNum, listId, onChangeFn, lockedMachine = null) {
    const list = document.getElementById(listId);
    const group = list.closest('.form-group');
    const toggleBtn = group?.querySelector('.machine-checkbox-bar .btn-xs');
    const label = group?.querySelector('label');

    if (lockedMachine) {
        // ステップ表示から機械が確定した状態で開いているため、選び直しはさせない
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (label) label.textContent = '機械名';
        list.innerHTML = `
            <label>
                <input type="checkbox" value="${esc(lockedMachine)}" checked disabled style="display:none">
                <span class="machine-locked-name">${esc(lockedMachine)}</span>
            </label>`;
        return;
    }

    if (toggleBtn) toggleBtn.style.display = '';
    if (label) label.innerHTML = '機械名 <span class="required-mark">*</span>（複数選択可）';

    const { data } = await db.from('tasks')
        .select('machine').eq('project_number', projectNum).eq('text', '機械組立').not('machine', 'is', null);
    const machines = [...new Set((data || []).map(t => t.machine).filter(Boolean))].sort();
    if (machines.length === 0) {
        list.innerHTML = '<div style="color:#aaa;font-size:13px;">機械が見つかりません</div>';
        return;
    }
    list.innerHTML = machines.map(m => `
        <label>
            <input type="checkbox" value="${esc(m)}" onchange="${onChangeFn}()">
            <span>${esc(m)}</span>
        </label>`).join('');
}

function getSelectedMachines(listId) {
    return [...document.querySelectorAll(`#${listId} input[type="checkbox"]:checked`)].map(cb => cb.value);
}

function toggleAllMachines(listId, btn) {
    const checkboxes = [...document.querySelectorAll(`#${listId} input[type="checkbox"]`)];
    const allChecked = checkboxes.every(cb => cb.checked);
    checkboxes.forEach(cb => { cb.checked = !allChecked; });
    btn.textContent = allChecked ? '全選択' : '全解除';
    checkboxes[0]?.dispatchEvent(new Event('change'));
}

// その機械の生の承認済みflow_type集合と、電装フローが該当するか（電気艤装タスクの有無）を取得する。
// 組立(assembly)は1申請に複数機械をまとめられるため、machine_nameの完全一致ではなく
// assembly_itemsのJSON配列内にその機械が含まれる承認済み申請があるかで判定する
async function _getRawFlowStatus(projectNum, machine) {
    const [{ data: approvedRows }, { data: elecTaskRows }, { data: assemblyApprovedRows }] = await Promise.all([
        db.from('approval_requests').select('flow_type')
            .eq('project_number', projectNum).eq('machine_name', machine).eq('status', 'approved')
            .neq('flow_type', 'assembly'),
        db.from('tasks').select('id')
            .eq('project_number', projectNum).eq('machine', machine).eq('text', '電気艤装').limit(1),
        db.from('approval_requests').select('assembly_items, machine_name, unit_name')
            .eq('project_number', projectNum).eq('flow_type', 'assembly').eq('status', 'approved')
    ]);
    const approved = new Set((approvedRows || []).map(r => r.flow_type));
    const assemblyApproved = (assemblyApprovedRows || [])
        .some(req => getAssemblyItemsForReq(req).some(it => it && it.machine === machine));
    if (assemblyApproved) approved.add('assembly');
    return {
        approved,
        electricalRequired: (elecTaskRows || []).length > 0
    };
}

async function _getMachineDoneFlows(projectNum, machine) {
    const { approved, electricalRequired } = await _getRawFlowStatus(projectNum, machine);
    // 電気艤装タスクがある機械は、組立・電装の両方が承認されて初めて「組立」完了扱いにする
    if (electricalRequired && approved.has('assembly') && !approved.has('electrical')) {
        approved.delete('assembly');
    }
    return approved;
}

// 工程表の実タスク（sort_order）から、その機械に該当する中間フロー（簡易検査・外観検査・出荷品確認検査・試運転・出荷確認会議）を
// 実際の工程順で返す（簡易検査・外観検査・出荷品確認検査は排他、試運転・出荷確認会議は無い場合がある）
async function _getMiddleFlowChain(projectNum, machine) {
    const { data: rows } = await db.from('tasks')
        .select('text, machine, sort_order')
        .eq('project_number', projectNum)
        .in('text', Object.keys(TASK_TEXT_TO_FLOW));
    const best = {};
    for (const r of (rows || [])) {
        const text = (r.text || '').trim();
        const flow = TASK_TEXT_TO_FLOW[text];
        if (!flow) continue;
        // 試運転は機械ごとに有無が異なる。他は工番単位で該当扱い（機械を指定しないタスクの場合がある）
        if (text === '試運転' && r.machine !== machine) continue;
        if (best[flow] === undefined || r.sort_order < best[flow]) best[flow] = r.sort_order;
    }
    return Object.keys(best).sort((a, b) => best[a] - best[b]);
}

// その機械の検査系フロー（簡易検査/外観検査/出荷品確認検査のいずれか、排他）のラベルを返す。
// 出荷確定申請の「担当者確認」見出し（「〇〇承認済み」）に使う
async function _getInspectionFlowLabel(projectNum, machine) {
    const middle = await _getMiddleFlowChain(projectNum, machine);
    const t = middle.find(x => ['simple_inspection', 'inspection', 'shipping_check_inspection'].includes(x));
    return QA_DETAIL_TITLE_LABELS[t] || '検査';
}

// 組立(先頭)〜出荷(末尾)を含む、その機械のフロー全体の並び（工程表の実タスクに基づく動的判定）
async function _getMachineFlowChain(projectNum, machine) {
    const middle = await _getMiddleFlowChain(projectNum, machine);
    return ['assembly', ...middle, 'shipping'];
}

// 複数機械選択時: 各機械のフロー構成を、工程順を保ったまま合成する
async function _getUnionFlowChain(projectNum, machines) {
    const chains = await Promise.all(machines.map(m => _getMachineFlowChain(projectNum, m)));
    const seen = new Set();
    const union = [];
    for (const chain of chains) {
        for (const t of chain) {
            if (!seen.has(t)) { seen.add(t); union.push(t); }
        }
    }
    return union;
}

// chain上で flowType より前にある工程だけを返す（フロー状況チェックリスト用）
function _priorSteps(chain, flowType) {
    const idx = chain.indexOf(flowType);
    return idx === -1 ? chain.filter(t => t !== 'shipping') : chain.slice(0, idx);
}

// フロー状況をメインの承認フロー・詳細画面のステップ表示と同じ丸アイコンで描画する共通ヘルパー
function _flowStepHtml(sc, icon, label, note, noteColor) {
    return `<div class="step-item">
        <div class="step-circle ${sc}">${icon}</div>
        <div class="step-detail">
            <div class="step-name">${esc(label)}</div>
            ${note ? `<div class="step-note"${noteColor ? ` style="color:${noteColor};"` : ''}>${esc(note)}</div>` : ''}
        </div>
    </div>`;
}
const FS_DONE_ICON = '✓', FS_DONE_SC = 'sc-approved';
const FS_WAIT_ICON = '○', FS_WAIT_SC = 'sc-waiting';
const FS_CUR_ICON  = '<span class="fc-play-icon">▶</span>', FS_CUR_SC = 'sc-pending';

// フロー状況チェックリストのHTMLを生成（承認済み/未完了 + 今回のフロー）
function _renderFlowStatusList(steps, doneFlows, currentLabel) {
    return `<div class="steps-list">` +
        steps.map(t => doneFlows.has(t)
            ? _flowStepHtml(FS_DONE_SC, FS_DONE_ICON, FLOW_LABELS[t] || t, '承認済み')
            : _flowStepHtml(FS_WAIT_SC, FS_WAIT_ICON, FLOW_LABELS[t] || t)
        ).join('') +
        _flowStepHtml(FS_CUR_SC, FS_CUR_ICON, `${currentLabel}（今回）`) +
        `</div>`;
}

// 品証の確定出荷申請（常務への回付）の前提として完了しているべきフロー一覧（出荷準備を含む全前フロー。機械ごとの動的判定、工程順を保持）
async function _getRequiredFlows(projectNum, machine) {
    const chain = await _getMachineFlowChain(projectNum, machine);
    return new Set(chain.filter(t => t !== 'shipping'));
}

// 出荷フロー「起票」の前提として完了しているべきフロー一覧（外観検査/簡易検査/出荷品確認検査のいずれか＋あれば出荷確認会議のみ。
// 出荷準備・試運転等の完了は問わない。出荷準備を含む全前フロー完了は品証の確定出荷申請時に別途チェックする）
async function _getShippingIssueRequiredFlows(projectNum, machine) {
    const middle = await _getMiddleFlowChain(projectNum, machine);
    return new Set(middle.filter(t => QA_MEETING_FLOWS.includes(t)));
}

// 外観検査/簡易検査/出荷品確認検査のいずれか（＋あれば出荷確認会議）が完了したら出荷フローを自動起票し、営業へ確定出荷日入力を依頼する
// （出荷準備フローの完了は待たない）。既に起票済みの場合は何もしない
async function _autoIssueShippingIfReady(projectNum, machine) {
    const required = await _getShippingIssueRequiredFlows(projectNum, machine);
    if (required.size === 0) return;

    const doneFlows = await _getMachineDoneFlows(projectNum, machine);
    if (![...required].every(t => doneFlows.has(t))) return;

    const { data: existing } = await db.from('approval_requests')
        .select('id').eq('project_number', projectNum).eq('machine_name', machine).eq('flow_type', 'shipping').limit(1);
    if (existing?.length > 0) return;

    const { data: sData } = await db.from('app_settings').select('value').eq('key', 'sales_person_map').single();
    const salesOwner = (sData?.value ? JSON.parse(sData.value) : {})[projectNum] || null;

    const { data: req, error } = await db.from('approval_requests').insert({
        project_number: projectNum, machine_name: machine, flow_type: 'shipping',
        status: 'awaiting_shipping_date', requester_id: currentUser.id, note: null,
        confirmed_shipping_date: null
    }).select().single();
    if (error) throw error;

    if (salesOwner) {
        const { data: pRows } = await db.from('profiles').select('id').eq('name', salesOwner);
        if (pRows?.length > 0) {
            await db.from('approval_notifications').insert(
                pRows.map(p => ({ request_id: req.id, recipient_id: p.id, notification_type: 'shipping_date_request' }))
            );
        } else {
            const { data: nRows } = await db.from('notification_recipients').select('email').eq('name', salesOwner).eq('active', true);
            if (nRows?.length > 0) {
                await db.from('approval_notifications').insert(
                    nRows.map(n => ({ request_id: req.id, recipient_email: n.email, notification_type: 'shipping_date_request' }))
                );
            }
        }
    }
}

// 出荷準備より前の全フローについて、未完了かつ「出荷後対応」でないペンディング項目が残っていないか調べる
// （出荷後の現地工事等で完了予定のペンディングはチェック対象から除外する）
// 組立(assembly)がその機械について承認済みかどうかを、assembly_items内のmachine一致で判定する
async function _getAssemblyBlockerForMachine(projectNum, machine) {
    const { data: reqs } = await db.from('approval_requests')
        .select('assembly_items, machine_name, unit_name, status')
        .eq('project_number', projectNum).eq('flow_type', 'assembly').neq('status', 'draft');
    const matching = (reqs || []).filter(req => getAssemblyItemsForReq(req).some(it => it && it.machine === machine));
    if (matching.some(r => r.status === 'approved')) return null;
    return { flowType: 'assembly', notApproved: true, label: '組立完了（未承認）' };
}

async function _getPrepBlockers(projectNum, machine) {
    const chain = await _getMachineFlowChain(projectNum, machine);
    const priorFlows = _priorSteps(chain, 'shipping_prep');
    if (priorFlows.length === 0) return [];

    const nonAssemblyFlows = priorFlows.filter(f => f !== 'assembly');
    const [{ data: reqs }, assemblyBlocker] = await Promise.all([
        nonAssemblyFlows.length > 0
            ? db.from('approval_requests').select('flow_type, status, sheet_data')
                .eq('project_number', projectNum).eq('machine_name', machine).in('flow_type', nonAssemblyFlows)
            : Promise.resolve({ data: [] }),
        priorFlows.includes('assembly') ? _getAssemblyBlockerForMachine(projectNum, machine) : Promise.resolve(null)
    ]);

    const blockers = assemblyBlocker ? [assemblyBlocker] : [];
    for (const flowType of nonAssemblyFlows) {
        const matching = (reqs || []).filter(r => r.flow_type === flowType);
        // 却下→再申請等で同じflow_typeに複数レコードがある場合、承認済みのものを優先して判定する
        const req = matching.find(r => r.status === 'approved') || matching[0];
        if (!req || req.status !== 'approved') {
            blockers.push({ flowType, notApproved: true });
            continue;
        }
        // 試運転は完了操作・完了予定日を廃止したため、申し送り事項の有無で出荷準備をブロックしない
        if (flowType === 'test_run') continue;
        const items = (req.sheet_data?.pending_items || [])
            .filter(p => (p.content || p.machine) && !p.completed && !p.ship_after);
        if (items.length > 0) blockers.push({ flowType, count: items.length });
    }
    return blockers;
}

// 出荷確定申請（起票・品証本申請いずれも）の前提として、各フローが承認済みかどうかによらず、
// 「出荷後対応」でない未完了ペンディング項目が残っていないか調べる
// （試運転は完了操作・出荷後対応チェックを廃止した申し送り事項のため対象外。
//  組立はsheet_data.pending_itemsを持つが、machine_nameで単純に絞り込めないためassembly_items一致で個別に判定する）
async function _getShippingPendingBlockers(projectNum, machine) {
    const chain = await _getMachineFlowChain(projectNum, machine);
    const targetFlows = chain.filter(t => t !== 'shipping' && t !== 'test_run');
    if (targetFlows.length === 0) return [];

    const nonAssemblyFlows = targetFlows.filter(t => t !== 'assembly');
    const [{ data: reqs }, { data: assemblyReqs }] = await Promise.all([
        nonAssemblyFlows.length > 0
            ? db.from('approval_requests').select('flow_type, status, sheet_data')
                .eq('project_number', projectNum).eq('machine_name', machine).in('flow_type', nonAssemblyFlows)
            : Promise.resolve({ data: [] }),
        targetFlows.includes('assembly')
            ? db.from('approval_requests').select('assembly_items, machine_name, unit_name, status, sheet_data')
                .eq('project_number', projectNum).eq('flow_type', 'assembly').neq('status', 'draft')
            : Promise.resolve({ data: [] })
    ]);

    const blockers = [];

    if (targetFlows.includes('assembly')) {
        const matching = (assemblyReqs || []).filter(req => getAssemblyItemsForReq(req).some(it => it && it.machine === machine));
        // 却下→再申請等で同じ機械に複数レコードがある場合、承認済みのものを優先して判定する
        const req = matching.find(r => r.status === 'approved') || matching[0];
        if (req) {
            const items = (req.sheet_data?.pending_items || [])
                .filter(p => (p.content || p.machine) && !p.completed && !p.ship_after);
            if (items.length > 0) blockers.push({ flowType: 'assembly', count: items.length });
        }
    }

    for (const flowType of nonAssemblyFlows) {
        const matching = (reqs || []).filter(r => r.flow_type === flowType);
        // 却下→再申請等で同じflow_typeに複数レコードがある場合、承認済みのものを優先して判定する
        const req = matching.find(r => r.status === 'approved') || matching[0];
        if (!req) continue;
        const items = (req.sheet_data?.pending_items || [])
            .filter(p => (p.content || p.machine) && !p.completed && !p.ship_after);
        if (items.length > 0) blockers.push({ flowType, count: items.length });
    }
    return blockers;
}

// ===== 宛先確認ステップ（開催案内共通） =====
const extraRecipients = { inspection: [], sm: [], si: [], sci: [], reschedule: [] };
// 宛先プレビュー画面でチェックが入れられた宛先のキー（profile idまたはemail）。
// inspection/sm/siはデフォルト「任意」・チェックで「必須」指定（＝このSetに入っているキーが必須指定）、
// rescheduleは既存の送信済み通知の「任意」フラグを反映（＝このSetに入っているキーが任意）と意味が異なるので注意。
const recipientOptionalKeys = { inspection: new Set(), sm: new Set(), si: new Set(), sci: new Set(), reschedule: new Set() };

// ===== 宛先追加：名簿（profiles）からのプルダウン選択 =====
// 既にリストに表示されている宛先（送付先一覧＋追加済み）のメールアドレス。プルダウンの候補から除外する
const existingRecipientEmails = { inspection: new Set(), sm: new Set(), si: new Set(), sci: new Set(), reschedule: new Set() };
let allProfilesForRecipientSelect = null;
// プルダウン内の部署グループの並び順（未指定の部署は末尾に五十音順で表示）
const RECIPIENT_PICKER_DEPARTMENT_ORDER = ['営業', '設計', '組立', '電装', '物流', '操業', '技戦', '品証', '製管'];
function sortRecipientPickerDepartments(keys) {
    return keys.sort((a, b) => {
        const ia = RECIPIENT_PICKER_DEPARTMENT_ORDER.indexOf(a);
        const ib = RECIPIENT_PICKER_DEPARTMENT_ORDER.indexOf(b);
        const ra = ia === -1 ? RECIPIENT_PICKER_DEPARTMENT_ORDER.length : ia;
        const rb = ib === -1 ? RECIPIENT_PICKER_DEPARTMENT_ORDER.length : ib;
        return ra !== rb ? ra - rb : a.localeCompare(b, 'ja');
    });
}
// 送付先一覧（プロフィール・社外いずれも）を同じ部署順で並べ替える
function sortRecipientsByDepartment(list, getDept) {
    return [...list].sort((a, b) => {
        const da = getDept(a) || '';
        const db = getDept(b) || '';
        const ia = RECIPIENT_PICKER_DEPARTMENT_ORDER.indexOf(da);
        const ib = RECIPIENT_PICKER_DEPARTMENT_ORDER.indexOf(db);
        const ra = ia === -1 ? RECIPIENT_PICKER_DEPARTMENT_ORDER.length : ia;
        const rb = ib === -1 ? RECIPIENT_PICKER_DEPARTMENT_ORDER.length : ib;
        return ra !== rb ? ra - rb : da.localeCompare(db, 'ja');
    });
}

async function getProfilesForRecipientSelect() {
    if (!allProfilesForRecipientSelect) {
        const { data } = await db.from('profiles')
            .select('id, name, email, department')
            .order('department').order('name');
        allProfilesForRecipientSelect = data || [];
    }
    return allProfilesForRecipientSelect;
}

async function renderExtraProfileSelect(prefix) {
    const panelEl = document.getElementById(`${prefix}_extra_profile_panel`);
    if (!panelEl) return;
    const profiles = await getProfilesForRecipientSelect();
    const excluded = new Set([
        ...existingRecipientEmails[prefix],
        ...extraRecipients[prefix].map(r => (r.email || '').toLowerCase()),
        (currentUser?.email || '').toLowerCase() // 申請者本人は候補から除外
    ]);

    const groups = {};
    profiles
        .filter(p => p.email && !excluded.has(p.email.toLowerCase()))
        .forEach(p => {
            const dept = p.department || 'その他';
            (groups[dept] = groups[dept] || []).push(p);
        });

    const deptKeys = sortRecipientPickerDepartments(Object.keys(groups));
    if (deptKeys.length === 0) {
        panelEl.innerHTML = '<div class="profile-picker-empty">候補がありません</div>';
        return;
    }

    // 名前とメールアドレスの先頭位置を揃えるため、テーブルではなくflexレイアウトの行として描画する
    panelEl.innerHTML = deptKeys.map(dept => `
        <div class="profile-picker-group-label" style="${departmentBadgeStyle(dept)}">${esc(dept)}</div>
        ${groups[dept].map(p => `
            <div class="profile-picker-option" data-email="${esc(p.email)}" data-name="${esc(p.name || '')}">
                <span class="profile-picker-option-name">${esc(p.name || p.email)}</span>
                <span class="profile-picker-option-email">${esc(p.email)}</span>
            </div>`).join('')}
    `).join('');

    panelEl.querySelectorAll('.profile-picker-option').forEach(el => {
        el.addEventListener('click', () => selectExtraRecipientProfile(prefix, el.dataset.email, el.dataset.name));
    });
}

function toggleProfilePickerPanel(prefix) {
    const panelEl = document.getElementById(`${prefix}_extra_profile_panel`);
    if (!panelEl) return;
    const willOpen = !panelEl.classList.contains('open');
    document.querySelectorAll('.profile-picker-panel.open').forEach(el => el.classList.remove('open'));
    if (willOpen) panelEl.classList.add('open');
}

// 名簿プルダウン以外をクリックしたら開いているパネルを閉じる
document.addEventListener('click', function(e) {
    if (!e.target.closest('.profile-picker')) {
        document.querySelectorAll('.profile-picker-panel.open').forEach(el => el.classList.remove('open'));
    }
});

function selectExtraRecipientProfile(prefix, email, name) {
    // 名簿から選んだ時点で確定扱いとし、直接リストへ追加する（別途「追加」ボタンの押し忘れで
    // 通知が送られないままになるのを防ぐため、入力欄に詰めるだけの中継はしない）
    document.getElementById(`${prefix}_extra_profile_panel`)?.classList.remove('open');
    if (!email) return;
    extraRecipients[prefix].push({ name: name || email, email, optional: true });
    renderExtraList(prefix);
    renderExtraProfileSelect(prefix);
}

async function showRecipientsStep(type) {
    const prefix = type; // 'inspection' | 'sm' | 'si' | 'sci'
    const projectNumMap = { si: currentSiProjectNum, inspection: currentInspectionProjectNum, sci: currentSciProjectNum, sm: currentSmProjectNum };
    const projectNum = projectNumMap[prefix];
    const machines   = getSelectedMachines(`${prefix}_machine_list`);
    const dateVal    = document.getElementById(`${prefix}_date_input`).value;
    const timeHour   = document.getElementById(`${prefix}_time_hour`).value;
    const timeMin    = document.getElementById(`${prefix}_time_min`).value;
    const locationVal = prefix === 'sm'
        ? document.getElementById('sm_location_input').value
        : getLocationValue(`${prefix}_location_input`);

    if (!projectNum)          { showToast('工事番号を選択してください', 'error'); return; }
    if (machines.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (!dateVal)             { showToast('開催日を入力してください', 'error'); return; }
    if (!timeHour || !timeMin) { showToast('開始時刻を入力してください', 'error'); return; }
    if (!locationVal)         { showToast('場所を入力してください', 'error'); return; }

    const flowTypeMap = { inspection: 'inspection', sm: 'shipping_meeting', si: 'simple_inspection', sci: 'shipping_check_inspection' };
    const recipients = await _fetchFlowRecipients(projectNum, machines, flowTypeMap[prefix] || prefix);
    await renderRecipientsList(prefix, recipients);

    // ステップ切替
    document.getElementById(`${prefix}_recipients_step`).style.display = 'block';
    document.getElementById(`${prefix}_footer_step1`).style.display    = 'none';
    document.getElementById(`${prefix}_footer_step2`).style.display    = '';
}

function showFormStep(prefix) {
    document.getElementById(`${prefix}_recipients_step`).style.display = 'none';
    document.getElementById(`${prefix}_footer_step1`).style.display    = '';
    document.getElementById(`${prefix}_footer_step2`).style.display    = 'none';
}

async function _fetchFlowRecipients(projectNum, machineNames, flowType) {
    // recordFlowNotificationsと同じロジックで宛先を収集してプレビュー表示用に返す

    // タスクオーナーを取得（recordFlowNotificationsと同じクエリ）
    // 機械フィルタ: 複数機械の場合は最初の1台で代表（単一申請時と同じ挙動）
    const machineName = machineNames[0] || null;
    let taskQuery = db.from('tasks').select('text, owner, major_item').eq('project_number', projectNum);
    if (machineName) taskQuery = taskQuery.eq('machine', machineName);
    const { data: tasks } = await taskQuery;

    const findOwners = (taskName, majorItem) => {
        const matched = (tasks || []).filter(t => t.text === taskName && (!majorItem || String(t.major_item || '').trim() === majorItem));
        return [...new Set(matched.flatMap(t => splitOwnerNames(t.owner)))];
    };

    const kumitateOwners = findOwners('機械組立');
    const shiuntenOwners = findOwners('試運転');
    const sekkeiOwners   = findOwners('出図', '設計');
    const denkiOwners    = findOwners('電気艤装');

    // 試運転・出図が見つからない場合は工番全体から再検索
    const shiuntenOwnersFallback = shiuntenOwners.length > 0 ? shiuntenOwners :
        [...new Set(((await db.from('tasks').select('owner').eq('project_number', projectNum).eq('text', '試運転').not('owner', 'is', null)).data || []).flatMap(t => splitOwnerNames(t.owner)))];
    const sekkeiOwnersFallback = sekkeiOwners.length > 0 ? sekkeiOwners :
        [...new Set(((await db.from('tasks').select('owner').eq('project_number', projectNum).eq('text', '出図').not('owner', 'is', null)).data || []).flatMap(t => splitOwnerNames(t.owner)))];

    const { data: sData } = await db.from('app_settings').select('value').eq('key', 'sales_person_map').single();
    const salesOwner = (sData?.value ? JSON.parse(sData.value) : {})[projectNum] || null;

    // profiles収集（recordFlowNotificationsのaddP相当）
    const profileIds = new Set();
    const profileList = [];
    const addP = async (filters) => {
        let q = db.from('profiles').select('id, name, email, role, department');
        if (filters.department) q = q.eq('department', filters.department);
        if (filters.role)       q = q.eq('role', filters.role);
        const { data } = await q;
        (data || []).forEach(p => { if (!profileIds.has(p.id)) { profileIds.add(p.id); profileList.push(p); } });
    };
    const addPbyName = async (name) => {
        if (!name) return;
        const { data } = await db.from('profiles').select('id, name, email, role, department').eq('name', name);
        (data || []).forEach(p => { if (!profileIds.has(p.id)) { profileIds.add(p.id); profileList.push(p); } });
    };

    // external収集（recordFlowNotificationsのaddE相当）
    const extEmails = new Set();
    const extList = [];
    const addE = async (filters) => {
        let q = db.from('notification_recipients').select('name, email, department, role').eq('active', true);
        if (filters.department) q = q.eq('department', filters.department);
        if (filters.role)       q = q.eq('role', filters.role);
        const { data } = await q;
        // プレビューではメール未登録でも表示（keyはemail or name）
        (data || []).forEach(r => {
            const key = r.email || r.name;
            if (key && !extEmails.has(key)) { extEmails.add(key); extList.push(r); }
        });
    };
    const addEbyName = async (name) => {
        if (!name) return;
        const { data } = await db.from('notification_recipients').select('name, email, department, role').eq('name', name).eq('active', true);
        (data || []).forEach(r => {
            const key = r.email || r.name;
            if (key && !extEmails.has(key)) { extEmails.add(key); extList.push(r); }
        });
    };
    // 工番担当者名から profiles・notification_recipients の両方を検索する（設計・営業は一部だけログイン移行済みのため両対応が必要）
    const addOwnerByName = async (name) => {
        await addPbyName(name);
        await addEbyName(name);
    };
    // 設定画面で個人単位に選ばれた固定宛先を追加（プレビューのため申請者=現在ログイン中のユーザーとして除外する）
    const addFixedRecipientsPreview = async () => {
        const plan = getFixedRecipientPlan(flowType);
        const ids = plan.profileIds.filter(id => id !== currentUser?.id);
        if (ids.length > 0) {
            const { data } = await db.from('profiles').select('id, name, email, role, department').in('id', ids);
            (data || []).forEach(p => { if (!profileIds.has(p.id)) { profileIds.add(p.id); profileList.push(p); } });
        }
        if (plan.recipientIds.length > 0) {
            const { data } = await db.from('notification_recipients').select('name, email, department, role').in('id', plan.recipientIds).eq('active', true);
            (data || []).forEach(r => {
                const key = r.email || r.name;
                if (key && !extEmails.has(key)) { extEmails.add(key); extList.push(r); }
            });
        }
    };
    // members テーブルから設計担当者ごとの上長（supervisor_email1/2）を取得（プレビュー用）
    // 担当者単位でmembers未登録・上長未設定の場合のみ、その担当者分は設計全管理職にフォールバック
    // ※ recordFlowNotifications側と同じ判定（ログインアカウントありならprofiles/id、なければnotification_recipients/email）で
    //   振り分けないと、「任意」チェックのキーが送信時と食い違い、必須/任意の指定が反映されなくなる
    const addSekkeiSupervisors = async () => {
        let hasUnresolvedOwner = sekkeiOwnersFallback.length === 0;
        if (sekkeiOwnersFallback.length > 0) {
            const { data: memberRows } = await db.from('members')
                .select('name, supervisor_email1, supervisor_email_2')
                .in('name', sekkeiOwnersFallback);
            const memberMap = Object.fromEntries((memberRows || []).map(m => [m.name, m]));
            const supEmails = new Set();
            for (const name of sekkeiOwnersFallback) {
                const m = memberMap[name];
                const emails = m ? [m.supervisor_email1, m.supervisor_email_2].filter(Boolean) : [];
                if (emails.length > 0) {
                    emails.forEach(e => supEmails.add(e));
                } else {
                    hasUnresolvedOwner = true;
                }
            }
            if (supEmails.size > 0) {
                const { data: supRecips } = await db.from('notification_recipients')
                    .select('name, email, department, role').in('email', [...supEmails]).eq('active', true);
                const { data: supProfiles } = await db.from('profiles')
                    .select('id, name, email, department, role').in('email', [...supEmails]);
                const profileMap = Object.fromEntries((supProfiles || []).map(p => [p.email, p]));
                const recipMap   = Object.fromEntries((supRecips   || []).map(r => [r.email, r]));
                for (const email of supEmails) {
                    const p = profileMap[email];
                    if (p) {
                        if (!profileIds.has(p.id)) { profileIds.add(p.id); profileList.push(p); }
                    } else if (!extEmails.has(email)) {
                        extEmails.add(email);
                        extList.push(recipMap[email] || { name: email, email, department: '設計', role: '' });
                    }
                }
            }
        }
        if (hasUnresolvedOwner) {
            await addP({ department: '設計', role: 'design_manager' });
            await addP({ department: '設計', role: 'design_director' });
        }
    };

    // 全開催案内共通（常務・製管・品証・技戦は設定画面で個人単位に選択）
    const dyn = getDynamicRecipientPlan(flowType);
    await addFixedRecipientsPreview();
    if (dyn.kumitate_owner) for (const o of kumitateOwners) await addPbyName(o);
    if (dyn.shiunten_owner) for (const o of shiuntenOwnersFallback) await addPbyName(o);
    if (dyn.sales)    await addOwnerByName(salesOwner);
    if (dyn.sekkei_owner) for (const o of sekkeiOwnersFallback) await addOwnerByName(o);
    // 設計管理職: 担当者の上長を members テーブルから取得
    if (dyn.sekkei_manager) await addSekkeiSupervisors();
    // 電気艤装タスクがある場合のみ電装担当者も追加
    if (dyn.denki_owner) for (const o of denkiOwners) await addPbyName(o);

    // 全開催案内共通: 組立課長（機械組立あり）・操業課長/部長（試運転あり）
    if (dyn.kumitate_manager && kumitateOwners.length > 0) {
        await addP({ role: 'assembly_manager' });
    }
    if (dyn.shiunten_manager && shiuntenOwnersFallback.length > 0) {
        await addP({ role: 'operations_manager' });
        await addP({ role: 'operations_director' });
    }

    // 複数機械選択時は残りの機械の組立担当者も追加
    if (dyn.kumitate_owner) {
        for (let i = 1; i < machineNames.length; i++) {
            const { data: mt } = await db.from('tasks')
                .select('owner').eq('project_number', projectNum).eq('text', '機械組立').eq('machine', machineNames[i]);
            const owners = [...new Set((mt || []).flatMap(t => splitOwnerNames(t.owner)))];
            for (const o of owners) await addPbyName(o);
        }
    }

    // 全体工程表の出張予定シートに当該工番のタスクがあれば、その担当者も宛先に追加（タスク名は問わない）
    for (const o of await getBusinessTripOwnerNames(projectNum)) await addOwnerByName(o);

    // 申請者本人（＝現在ログイン中のユーザー）は案内送信時に宛先候補として自動追加されるため、
    // 「実際に届くのに一覧に出ない」という誤解を防ぐためプレビューにも表示する（必須/任意は他の宛先と同様にチェックボックスで指定）
    if (currentProfile?.id && !profileIds.has(currentProfile.id)) {
        profileIds.add(currentProfile.id);
        profileList.push({ ...currentProfile });
    }

    return { profiles: profileList, external: extList };
}

// 部署バッジの色分け（未指定の部署はCSSデフォルトの配色を使う）
const DEPARTMENT_BADGE_COLORS = {
    '設計': { bg: '#e0f7fa', color: '#006064' },
    '組立': { bg: '#fff9c4', color: '#8a6d00' },
    '操業': { bg: '#fde8e8', color: '#c0392b' },
    '営業': { bg: '#ffe8cc', color: '#b35c00' },
    '電装': { bg: '#f3e5f5', color: '#6a1b9a' },
    '技戦': { bg: '#f1f8e9', color: '#558b2f' },
    '物流': { bg: '#efebe9', color: '#6d4c41' },
    '品証': { bg: '#e8f5e9', color: '#2e7d32' },
    '製管': { bg: '#e8f5e9', color: '#2e7d32' }
};
function departmentBadgeStyle(dept) {
    const c = DEPARTMENT_BADGE_COLORS[dept];
    return c ? `background:${c.bg};color:${c.color};` : '';
}

async function renderRecipientsList(prefix, recipients) {
    const listEl = document.getElementById(`${prefix}_recipients_list`);
    const optionalKeys = recipientOptionalKeys[prefix];

    existingRecipientEmails[prefix] = new Set([
        ...recipients.profiles.map(p => (p.email || '').toLowerCase()).filter(Boolean),
        ...recipients.external.map(r => (r.email || '').toLowerCase()).filter(Boolean)
    ]);

    // このプレビュー画面はデフォルト「任意」・チェックで「必須」に切り替える仕様（recipientOptionalKeysは「必須指定された宛先」を保持する）
    const optionalToggle = (key) => `
        <label class="recipient-optional-toggle" onclick="event.stopPropagation();">
            <input type="checkbox" ${optionalKeys.has(key) ? 'checked' : ''} onchange="toggleRecipientOptional('${prefix}', '${esc(key)}', this.checked)">
            必須
        </label>`;

    // profiles（社内アカウント）とexternal（notification_recipients由来、技戦部門など）は別テーブルから来るため、
    // 個別に並べ替えて連結すると常にprofilesが先に来てしまう。部署順で混在させるため一旦統合してから並べ替える
    const combinedRecipients = [
        ...recipients.profiles.map(p => ({ type: 'profile', data: p })),
        ...recipients.external.map(r => ({ type: 'external', data: r }))
    ];

    const rows = sortRecipientsByDepartment(combinedRecipients, item => item.data.department).map(item => {
        if (item.type === 'profile') {
            const p = item.data;
            return `
        <div class="recipient-item">
            <span class="recipient-name">${esc(p.name || '—')}</span>
            <span class="recipient-email">${esc(p.email || '—')}</span>
            <span class="recipient-tag" style="${departmentBadgeStyle(p.department)}">${esc(p.department || '')}</span>
            ${optionalToggle(p.id)}
        </div>`;
        }
        const r = item.data;
        return `
        <div class="recipient-item">
            <span class="recipient-name">${esc(r.name || '—')}</span>
            <span class="recipient-email" style="color:${r.email ? '#888' : '#e74c3c'};">${esc(r.email || '⚠ メール未登録')}</span>
            <span class="recipient-tag" style="${departmentBadgeStyle(r.department)}">${esc(r.department || '')}</span>
            ${r.email ? optionalToggle(r.email) : ''}
        </div>`;
    }).join('');

    listEl.innerHTML = rows || '<div style="color:#aaa;font-size:13px;padding:8px;">宛先なし</div>';
    await renderExtraProfileSelect(prefix);
}

function toggleRecipientOptional(prefix, key, checked) {
    if (checked) recipientOptionalKeys[prefix].add(key);
    else         recipientOptionalKeys[prefix].delete(key);
}

// ===== 出欠状況（簡易検査・外観検査・出荷確認会議の開催案内） =====
const QA_INVITE_NOTIFICATION_TYPES = {
    simple_inspection: ['simple_inspection_invite', 'simple_inspection_reschedule'],
    inspection:        ['inspection_invite', 'inspection_reschedule'],
    shipping_check_inspection: ['shipping_check_inspection_invite', 'shipping_check_inspection_reschedule'],
    shipping_meeting:  ['shipping_meeting_invite', 'shipping_meeting_reschedule'],
};
const RSVP_STATUS_LABELS = {
    accepted:       { label: '承諾',   color: '#0f7a3d', bg: '#eafaf0', dot: '#1c8f4d' },
    declined:       { label: '辞退',   color: '#b5342a', bg: '#fde8e8', dot: '#d4443b' },
    tentative:      { label: '仮',     color: '#7a6000', bg: '#fff8e6', dot: '#c9a227' },
    'needs-action': { label: '未回答', color: '#5b6b80', bg: '#eef1f6', dot: '#98a3b4' },
};
// Outlookの「出欠せずフォロー」応答（案内メールへの回答の一種、出欠は未回答のまま関心のみ表明）
const RSVP_FOLLOW_BADGE = { label: 'フォロー', color: '#0969da', bg: '#e8f2ff', dot: '#4b93e8' };

async function buildAttendanceSectionHtml(req) {
    const types = QA_INVITE_NOTIFICATION_TYPES[req.flow_type];
    if (!types) return '';

    const roomEmails = new Set(Object.values(ROOM_EMAILS));

    const { data: notifs } = await db.from('approval_notifications')
        .select('recipient_id, recipient_email, optional')
        .eq('request_id', req.id)
        .in('notification_type', types)
        .not('emailed_at', 'is', null);

    // 同一宛先が複数回登録されうる（日程変更の再送など）ため、宛先キーで最後の値に統一する
    const byKey = new Map();
    (notifs || []).forEach(n => {
        if (n.recipient_email && roomEmails.has(n.recipient_email)) return; // 会議室は宛先一覧から除外
        const key = n.recipient_id || n.recipient_email;
        if (!key) return;
        byKey.set(key, { recipientId: n.recipient_id || null, email: n.recipient_email || null, optional: !!n.optional });
    });
    const entries = [...byKey.values()];
    if (entries.length === 0) return '';

    const profileIds = entries.filter(e => e.recipientId).map(e => e.recipientId);
    let profileMap = {};
    if (profileIds.length > 0) {
        const { data: prs } = await db.from('profiles').select('id, name, email, department').in('id', profileIds);
        (prs || []).forEach(p => { profileMap[p.id] = p; });
    }
    const emails = entries.map(e => e.email || profileMap[e.recipientId]?.email).filter(Boolean);
    let nameByEmail = {};
    let deptByEmail = {};
    if (emails.length > 0) {
        // recipient_idが未設定の宛先向けに、notification_recipients・profilesに加えmembers（設計上長など、
        // profiles/notification_recipients未登録の場合がある）もメールアドレスで検索して名前を補完する
        // （過去に上長メール等がrecipient_idと紐付けられずrecipient_emailのみで保存されたケースの救済）
        const [{ data: recs }, { data: prsByEmail }, { data: membersByEmail }] = await Promise.all([
            db.from('notification_recipients').select('name, email, department').in('email', emails),
            db.from('profiles').select('name, email, department').in('email', emails),
            db.from('members').select('name, email').in('email', emails)
        ]);
        (recs           || []).forEach(r => { if (r.email) { nameByEmail[r.email] = r.name; deptByEmail[r.email] = r.department; } });
        (membersByEmail || []).forEach(m => { if (m.email) { nameByEmail[m.email] = m.name; } }); // membersは部署列を持たないため氏名のみ補完
        (prsByEmail     || []).forEach(p => { if (p.email) { nameByEmail[p.email] = p.name; deptByEmail[p.email] = p.department; } }); // profilesを優先
    }

    const { data: rsvps } = await db.from('invitation_rsvp').select('email, status, is_follow').eq('request_id', req.id);
    const statusByEmail = Object.fromEntries((rsvps || []).map(r => [r.email, r.status]));
    const followByEmail = Object.fromEntries((rsvps || []).map(r => [r.email, !!r.is_follow]));

    const attendees = entries.map(e => {
        const profile = e.recipientId ? profileMap[e.recipientId] : null;
        const email  = e.email || profile?.email || '';
        const name   = profile?.name || nameByEmail[email] || email || '—';
        const department = profile?.department || deptByEmail[email] || '';
        const status = (email && statusByEmail[email]) || 'needs-action';
        const isFollow = !!(email && followByEmail[email]);
        const st     = isFollow ? RSVP_FOLLOW_BADGE : (RSVP_STATUS_LABELS[status] || RSVP_STATUS_LABELS['needs-action']);
        return { name, department, optional: e.optional, st, statusKey: isFollow ? 'follow' : status };
    });

    // 名簿プルダウン（renderExtraProfileSelect）と同じ部署順に揃え、部署ごとに見出しでグループ化する
    const sorted = sortRecipientsByDepartment(attendees, a => a.department);
    const groups = [];
    sorted.forEach(a => {
        const dept = a.department || 'その他';
        const last = groups[groups.length - 1];
        if (!last || last.dept !== dept) groups.push({ dept, items: [a] });
        else last.items.push(a);
    });

    // 集計サマリ（承諾/辞退/仮/未回答の件数）と、必須かつ未回答のメンバー
    const counts = { accepted: 0, declined: 0, tentative: 0, 'needs-action': 0, follow: 0 };
    sorted.forEach(a => { if (counts[a.statusKey] !== undefined) counts[a.statusKey]++; });
    const pendingRequired = sorted.filter(a => !a.optional && (a.statusKey === 'needs-action' || a.statusKey === 'follow'));

    const summaryOrder = ['accepted', 'declined', 'tentative', 'needs-action'];
    const summaryHtml = summaryOrder
        .filter(k => counts[k] > 0)
        .map(k => {
            const s = RSVP_STATUS_LABELS[k];
            return `<span style="font-size:13px;font-weight:700;padding:2px 10px;border-radius:20px;background:${s.bg};color:${s.color};white-space:nowrap;">${s.label} ${counts[k]}</span>`;
        }).join('');
    const followSummaryHtml = counts.follow > 0
        ? `<span style="font-size:13px;font-weight:700;padding:2px 10px;border-radius:20px;background:${RSVP_FOLLOW_BADGE.bg};color:${RSVP_FOLLOW_BADGE.color};white-space:nowrap;">${RSVP_FOLLOW_BADGE.label} ${counts.follow}</span>`
        : '';

    const alertHtml = pendingRequired.length > 0
        ? `<div style="display:flex;align-items:center;gap:8px;background:#fff8e6;border:1px solid #f0d98c;border-radius:8px;padding:5px 11px;font-size:13px;color:#7a5c00;font-weight:700;margin-bottom:8px;">必須メンバー${pendingRequired.length}名が未回答です（${pendingRequired.map(a => esc(a.name)).join('・')}）</div>`
        : '';

    const ROW_GRID = 'display:grid;grid-template-columns:120px 44px 108px;align-items:center;gap:8px;padding:6px 12px;';
    const DEPT_HEAD = 'display:flex;align-items:center;gap:8px;background:#f6f8fb;border-left:3px solid #2f6fb0;border-radius:0 8px 8px 0;padding:3px 12px;font-size:13px;font-weight:700;color:#16233a;';
    const REQ_TAG = 'font-size:11px;font-weight:700;color:#3d4a5d;border:1px solid #c8d2e0;background:#eef2f8;border-radius:4px;padding:1px 5px;justify-self:start;white-space:nowrap;';

    const rows = groups.map(g => `
        <div>
            <div style="${DEPT_HEAD}">${esc(g.dept)}<span style="font-size:13px;color:#8a94a6;font-weight:500;">${g.items.length}名</span></div>
            ${g.items.map(a => `
            <div style="${ROW_GRID}">
                <span style="font-size:15px;font-weight:700;color:#20293a;line-height:1.3;">${esc(a.name)}</span>
                ${a.optional ? '<span></span>' : `<span style="${REQ_TAG}">必須</span>`}
                <span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;padding:1px 10px;border-radius:20px;background:${a.st.bg};color:${a.st.color};justify-self:start;white-space:nowrap;"><span style="width:7px;height:7px;border-radius:50%;background:${a.st.dot || a.st.color};flex:none;"></span>${a.st.label}</span>
            </div>`).join('')}
        </div>`).join('');

    return `
        <hr class="section-divider">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
            <div style="font-size:16px;color:#16233a;font-weight:700;">出欠状況<span style="font-size:14px;color:#8a94a6;font-weight:500;margin-left:8px;">${sorted.length}名</span></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${summaryHtml}${followSummaryHtml}</div>
        </div>
        ${alertHtml}
        <div style="display:flex;flex-direction:column;gap:6px;">${rows}</div>`;
}

function addExtraRecipient(prefix) {
    const nameEl  = document.getElementById(`${prefix}_extra_name`);
    const emailEl = document.getElementById(`${prefix}_extra_email`);
    const name  = nameEl.value.trim();
    const email = emailEl.value.trim();
    if (!email) { showToast('メールアドレスを入力してください', 'error'); return; }

    extraRecipients[prefix].push({ name: name || email, email, optional: true });
    nameEl.value = ''; emailEl.value = '';
    renderExtraList(prefix);
    renderExtraProfileSelect(prefix);
}

function removeExtraRecipient(prefix, index) {
    extraRecipients[prefix].splice(index, 1);
    renderExtraList(prefix);
    renderExtraProfileSelect(prefix);
}

function toggleExtraRecipientOptional(prefix, index, isRequired) {
    extraRecipients[prefix][index].optional = !isRequired;
}

function renderExtraList(prefix) {
    const el = document.getElementById(`${prefix}_extra_list`);
    // デフォルト「任意」・チェックで「必須」に切り替える仕様（他の宛先一覧と統一）
    el.innerHTML = extraRecipients[prefix].map((r, i) => `
        <div class="extra-recipient-item">
            <span style="font-weight:bold;min-width:80px;font-size:13px;">${esc(r.name)}</span>
            <span style="color:#888;flex:1;font-size:13px;">${esc(r.email)}</span>
            <label class="recipient-optional-toggle">
                <input type="checkbox" ${r.optional ? '' : 'checked'} onchange="toggleExtraRecipientOptional('${prefix}', ${i}, this.checked)">
                必須
            </label>
            <button onclick="removeExtraRecipient('${prefix}', ${i})">×</button>
        </div>`).join('');
}

// ===== 簡易検査開催案内 =====
function openSimpleInspectionModal() {
    currentSiProjectNum = '';
    document.getElementById('si_project_display').textContent = '';
    document.getElementById('si_project_info').style.display  = 'none';
    document.getElementById('si_machine_group').style.display = 'none';
    document.getElementById('si_machine_list').innerHTML      = '';
    document.getElementById('si_recipients_step').style.display = 'none';
    document.getElementById('si_footer_step1').style.display    = '';
    document.getElementById('si_footer_step2').style.display    = 'none';
    extraRecipients.si = [];
    recipientOptionalKeys.si.clear();
    document.getElementById('si_extra_list').innerHTML = '';
    document.getElementById('si_date_input').value     = '';
    document.getElementById('si_time_hour').value = '';
    document.getElementById('si_time_min').value  = '';
    buildLocationCheckboxes('si_location_input');
    document.getElementById('si_note_input').value = '';

    document.getElementById('simple_inspection_modal').classList.add('open');
}

function closeSimpleInspectionModal() {
    document.getElementById('simple_inspection_modal').classList.remove('open');
}

async function onSiProjectChange(lockedMachine = null) {
    const num = currentSiProjectNum;
    document.getElementById('si_project_info').style.display  = 'none';
    document.getElementById('si_machine_group').style.display = 'none';
    if (!num) return;

    const p = projectsMap[num] || {};
    document.getElementById('si_customer_display').textContent = p.customer_name || '—';
    document.getElementById('si_project_name_display').textContent = p.project_details || '—';
    document.getElementById('si_project_info').style.display = 'contents';
    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'si_machine_list', 'onSiMachineChange', lockedMachine);
        document.getElementById('si_machine_group').style.display = 'block';
    } finally {
        hideLoading();
    }
}

async function onSiMachineChange() {
    // 機械名は丸クリックの時点で確定済み（固定表示）のため、ここでは何もしない
}

async function submitSimpleInspection() {
    if (requireLogin()) return;
    const num      = currentSiProjectNum;
    const machines = getSelectedMachines('si_machine_list');
    const dateVal  = document.getElementById('si_date_input').value;
    const _th = document.getElementById('si_time_hour').value;
    const _tm = document.getElementById('si_time_min').value;
    const timeVal  = (_th && _tm) ? `${_th}:${_tm}` : null;
    const location = getLocationValue('si_location_input');
    const note     = document.getElementById('si_note_input').value.trim();

    if (!num)              { showToast('工事番号が設定されていません', 'error'); return; }
    if (machines.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (!dateVal)          { showToast('簡易検査日を入力してください', 'error'); return; }
    if (!timeVal)          { showToast('開始時刻を入力してください', 'error'); return; }
    if (!location)         { showToast('場所を入力してください', 'error'); return; }

    const btn = document.getElementById('si_submit_btn');
    btn.disabled = true;
    btn.textContent = '送信中...';
    showLoading('処理中...');

    try {
        for (const machine of machines) {
            const { data: req, error } = await db.from('approval_requests').insert({
                project_number: num, machine_name: machine, flow_type: 'simple_inspection',
                status: 'submitted', requester_id: currentUser.id, note: note || null,
                inspection_date: dateVal, inspection_time: timeVal || null, inspection_location: location || null
            }).select().single();
            if (error) throw error;
            await recordFlowNotifications(req.id, 'simple_inspection', recipientOptionalKeys.si);
            if (extraRecipients.si.length > 0) {
                await db.from('approval_notifications').insert(
                    extraRecipients.si.map(r => ({ request_id: req.id, recipient_email: r.email, notification_type: 'simple_inspection_invite', optional: !!r.optional }))
                );
            }
        }
        closeSimpleInspectionModal();
        await refreshAll();
        showToast(`簡易検査開催案内を送信しました。（${machines.length}機械）`, 'success');
    } catch (e) {
        showToast('送信に失敗しました: ' + e.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = '案内を送信';
        hideLoading();
    }
}

// ===== 外観検査開催案内 =====
function openInspectionModal() {
    currentInspectionProjectNum = '';
    document.getElementById('inspection_project_display').textContent = '';
    document.getElementById('inspection_project_info').style.display  = 'none';
    document.getElementById('inspection_machine_group').style.display = 'none';
    document.getElementById('inspection_machine_list').innerHTML      = '';
    document.getElementById('inspection_recipients_step').style.display = 'none';
    document.getElementById('inspection_footer_step1').style.display    = '';
    document.getElementById('inspection_footer_step2').style.display    = 'none';
    extraRecipients.inspection = [];
    recipientOptionalKeys.inspection.clear();
    document.getElementById('inspection_extra_list').innerHTML = '';
    document.getElementById('inspection_date_input').value     = '';
    document.getElementById('inspection_time_hour').value = '';
    document.getElementById('inspection_time_min').value  = '';
    buildLocationCheckboxes('inspection_location_input');
    document.getElementById('inspection_note_input').value = '';

    document.getElementById('inspection_modal').classList.add('open');
}

function closeInspectionModal() {
    document.getElementById('inspection_modal').classList.remove('open');
}

async function onInspectionProjectChange(lockedMachine = null) {
    const num = currentInspectionProjectNum;
    document.getElementById('inspection_project_info').style.display  = 'none';
    document.getElementById('inspection_machine_group').style.display = 'none';
    if (!num) return;

    const p = projectsMap[num] || {};
    document.getElementById('inspection_customer_display').textContent = p.customer_name || '—';
    document.getElementById('inspection_project_name_display').textContent = p.project_details || '—';
    document.getElementById('inspection_project_info').style.display = 'contents';

    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'inspection_machine_list', 'onInspectionMachineChange', lockedMachine);
        document.getElementById('inspection_machine_group').style.display = 'block';
    } finally {
        hideLoading();
    }
}

async function onInspectionMachineChange() {
    // 機械名は丸クリックの時点で確定済み（固定表示）のため、ここでは何もしない
}

async function submitInspection() {
    if (requireLogin()) return;
    const num      = currentInspectionProjectNum;
    const machines = getSelectedMachines('inspection_machine_list');
    const dateVal  = document.getElementById('inspection_date_input').value;
    const _th = document.getElementById('inspection_time_hour').value;
    const _tm = document.getElementById('inspection_time_min').value;
    const timeVal  = (_th && _tm) ? `${_th}:${_tm}` : null;
    const location = getLocationValue('inspection_location_input');
    const note     = document.getElementById('inspection_note_input').value.trim();

    if (!num)              { showToast('工事番号が設定されていません', 'error'); return; }
    if (machines.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (!dateVal)          { showToast('外観検査日を入力してください', 'error'); return; }
    if (!timeVal)          { showToast('開始時刻を入力してください', 'error'); return; }
    if (!location)         { showToast('場所を入力してください', 'error'); return; }

    const btn = document.getElementById('inspection_submit_btn');
    btn.disabled = true;
    btn.textContent = '送信中...';
    showLoading('処理中...');

    try {
        // 機械ごとに登録
        for (const machine of machines) {
            const { data: req, error } = await db.from('approval_requests').insert({
                project_number: num, machine_name: machine, flow_type: 'inspection',
                status: 'submitted', requester_id: currentUser.id, note: note || null,
                inspection_date: dateVal, inspection_time: timeVal || null, inspection_location: location || null
            }).select().single();
            if (error) throw error;
            await recordFlowNotifications(req.id, 'inspection', recipientOptionalKeys.inspection);
            // 追加宛先を挿入
            if (extraRecipients.inspection.length > 0) {
                await db.from('approval_notifications').insert(
                    extraRecipients.inspection.map(r => ({ request_id: req.id, recipient_email: r.email, notification_type: 'inspection_invite', optional: !!r.optional }))
                );
            }
        }

        closeInspectionModal();
        await refreshAll();
        showToast(`外観検査開催案内を送信しました。（${machines.length}機械）`, 'success');
    } catch (e) {
        showToast('送信に失敗しました: ' + e.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = '案内を送信';
        hideLoading();
    }
}

// ===== 出荷品確認検査開催案内（機械組立が無い工番向け） =====
function openShippingCheckInspectionModal() {
    currentSciProjectNum = '';
    document.getElementById('sci_project_display').textContent = '';
    document.getElementById('sci_project_info').style.display  = 'none';
    document.getElementById('sci_machine_group').style.display = 'none';
    document.getElementById('sci_machine_list').innerHTML      = '';
    document.getElementById('sci_recipients_step').style.display = 'none';
    document.getElementById('sci_footer_step1').style.display    = '';
    document.getElementById('sci_footer_step2').style.display    = 'none';
    extraRecipients.sci = [];
    recipientOptionalKeys.sci.clear();
    document.getElementById('sci_extra_list').innerHTML = '';
    document.getElementById('sci_date_input').value     = '';
    document.getElementById('sci_time_hour').value = '';
    document.getElementById('sci_time_min').value  = '';
    buildLocationCheckboxes('sci_location_input');
    document.getElementById('sci_note_input').value = '';

    document.getElementById('shipping_check_inspection_modal').classList.add('open');
}

function closeShippingCheckInspectionModal() {
    document.getElementById('shipping_check_inspection_modal').classList.remove('open');
}

async function onSciProjectChange(lockedMachine = null) {
    const num = currentSciProjectNum;
    document.getElementById('sci_project_info').style.display  = 'none';
    document.getElementById('sci_machine_group').style.display = 'none';
    if (!num) return;

    const p = projectsMap[num] || {};
    document.getElementById('sci_customer_display').textContent = p.customer_name || '—';
    document.getElementById('sci_project_name_display').textContent = p.project_details || '—';
    document.getElementById('sci_project_info').style.display = 'contents';
    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'sci_machine_list', 'onSciMachineChange', lockedMachine);
        document.getElementById('sci_machine_group').style.display = 'block';
    } finally {
        hideLoading();
    }
}

async function onSciMachineChange() {
    // 機械名は丸クリックの時点で確定済み（固定表示）のため、ここでは何もしない
}

async function submitShippingCheckInspection() {
    if (requireLogin()) return;
    const num      = currentSciProjectNum;
    const machines = getSelectedMachines('sci_machine_list');
    const dateVal  = document.getElementById('sci_date_input').value;
    const _th = document.getElementById('sci_time_hour').value;
    const _tm = document.getElementById('sci_time_min').value;
    const timeVal  = (_th && _tm) ? `${_th}:${_tm}` : null;
    const location = getLocationValue('sci_location_input');
    const note     = document.getElementById('sci_note_input').value.trim();

    if (!num)              { showToast('工事番号が設定されていません', 'error'); return; }
    if (machines.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (!dateVal)          { showToast('出荷品確認検査日を入力してください', 'error'); return; }
    if (!timeVal)          { showToast('開始時刻を入力してください', 'error'); return; }
    if (!location)         { showToast('場所を入力してください', 'error'); return; }

    const btn = document.getElementById('sci_submit_btn');
    btn.disabled = true;
    btn.textContent = '送信中...';
    showLoading('処理中...');

    try {
        for (const machine of machines) {
            const { data: req, error } = await db.from('approval_requests').insert({
                project_number: num, machine_name: machine, flow_type: 'shipping_check_inspection',
                status: 'submitted', requester_id: currentUser.id, note: note || null,
                inspection_date: dateVal, inspection_time: timeVal || null, inspection_location: location || null
            }).select().single();
            if (error) throw error;
            await recordFlowNotifications(req.id, 'shipping_check_inspection', recipientOptionalKeys.sci);
            if (extraRecipients.sci.length > 0) {
                await db.from('approval_notifications').insert(
                    extraRecipients.sci.map(r => ({ request_id: req.id, recipient_email: r.email, notification_type: 'shipping_check_inspection_invite', optional: !!r.optional }))
                );
            }
        }
        closeShippingCheckInspectionModal();
        await refreshAll();
        showToast(`出荷品確認検査開催案内を送信しました。（${machines.length}機械）`, 'success');
    } catch (e) {
        showToast('送信に失敗しました: ' + e.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = '案内を送信';
        hideLoading();
    }
}

// ===== フロー5: 出荷確認会議開催案内 =====
function openShippingMeetingModal() {
    currentSmProjectNum = '';
    document.getElementById('sm_project_display').textContent = '';
    document.getElementById('sm_project_info').style.display  = 'none';
    document.getElementById('sm_machine_group').style.display = 'none';
    document.getElementById('sm_machine_list').innerHTML      = '';
    document.getElementById('sm_recipients_step').style.display = 'none';
    document.getElementById('sm_footer_step1').style.display    = '';
    document.getElementById('sm_footer_step2').style.display    = 'none';
    extraRecipients.sm = [];
    recipientOptionalKeys.sm.clear();
    document.getElementById('sm_extra_list').innerHTML = '';
    document.getElementById('sm_date_input').value     = '';
    document.getElementById('sm_time_hour').value      = '';
    document.getElementById('sm_time_min').value       = '';
    document.getElementById('sm_location_input').value = '';
    document.getElementById('sm_note_input').value     = '';

    document.getElementById('shipping_meeting_modal').classList.add('open');
}

function closeShippingMeetingModal() {
    document.getElementById('shipping_meeting_modal').classList.remove('open');
}

async function onSmProjectChange(lockedMachine = null) {
    const num = currentSmProjectNum;
    document.getElementById('sm_project_info').style.display  = 'none';
    document.getElementById('sm_machine_group').style.display = 'none';
    if (!num) return;
    const p = projectsMap[num] || {};
    document.getElementById('sm_customer_display').textContent = p.customer_name || '—';
    document.getElementById('sm_project_name_display').textContent = p.project_details || '—';
    document.getElementById('sm_project_info').style.display = 'contents';
    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'sm_machine_list', 'onSmMachineChange', lockedMachine);
        document.getElementById('sm_machine_group').style.display = 'block';
    } finally {
        hideLoading();
    }
}

async function onSmMachineChange() {
    // 機械名は丸クリックの時点で確定済み（固定表示）のため、ここでは何もしない
}

async function submitShippingMeeting() {
    if (requireLogin()) return;
    const num      = currentSmProjectNum;
    const machines = getSelectedMachines('sm_machine_list');
    const dateVal  = document.getElementById('sm_date_input').value;
    const _th = document.getElementById('sm_time_hour').value;
    const _tm = document.getElementById('sm_time_min').value;
    const timeVal  = (_th && _tm) ? `${_th}:${_tm}` : null;
    const location = document.getElementById('sm_location_input').value.trim();
    const note     = document.getElementById('sm_note_input').value.trim();

    if (!num)              { showToast('工事番号が設定されていません', 'error'); return; }
    if (machines.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (!dateVal)          { showToast('開催日を入力してください', 'error'); return; }
    if (!timeVal)          { showToast('開始時刻を入力してください', 'error'); return; }
    if (!location)         { showToast('場所を選択してください', 'error'); return; }

    const btn = document.getElementById('sm_submit_btn');
    btn.disabled = true; btn.textContent = '送信中...';
    showLoading('処理中...');

    try {
        for (const machine of machines) {
            const { data: req, error } = await db.from('approval_requests').insert({
                project_number: num, machine_name: machine, flow_type: 'shipping_meeting', status: 'submitted',
                requester_id: currentUser.id, note: note || null,
                inspection_date: dateVal, inspection_time: timeVal || null, inspection_location: location || null
            }).select().single();
            if (error) throw error;
            await recordFlowNotifications(req.id, 'shipping_meeting', recipientOptionalKeys.sm);
            if (extraRecipients.sm.length > 0) {
                await db.from('approval_notifications').insert(
                    extraRecipients.sm.map(r => ({ request_id: req.id, recipient_email: r.email, notification_type: 'shipping_meeting_invite', optional: !!r.optional }))
                );
            }
            const roomEmail = ROOM_EMAILS[location];
            if (roomEmail) {
                await db.from('approval_notifications').insert({
                    request_id: req.id, recipient_email: roomEmail, notification_type: 'shipping_meeting_invite', optional: false
                });
            }
        }
        closeShippingMeetingModal();
        await refreshAll();
        showToast(`出荷確認会議開催案内を送信しました。（${machines.length}機械）`, 'success');
    } catch (e) {
        showToast('送信に失敗しました: ' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '案内を送信';
        hideLoading();
    }
}

// ===== フロー3: 出荷完了通知 =====
function openShippingModal() {
    currentShippingProjectNum = '';
    document.getElementById('shipping_project_display').textContent = '';
    document.getElementById('shipping_project_info').style.display  = 'none';
    document.getElementById('shipping_machine_group').style.display = 'none';
    document.getElementById('shipping_machine_list').innerHTML      = '';
    document.getElementById('shipping_approver_box').style.display  = 'none';
    document.getElementById('shipping_approver_list').innerHTML     = '';
    document.getElementById('shipping_flow_box').style.display      = 'none';
    document.getElementById('shipping_note_input').value  = '';

    document.getElementById('shipping_modal').classList.add('open');
}

function closeShippingModal() {
    document.getElementById('shipping_modal').classList.remove('open');
}

async function onShippingProjectChange(lockedMachine = null) {
    const num = currentShippingProjectNum;
    document.getElementById('shipping_project_info').style.display  = 'none';
    document.getElementById('shipping_machine_group').style.display = 'none';
    document.getElementById('shipping_approver_box').style.display  = 'none';
    document.getElementById('shipping_approver_list').innerHTML     = '';
    document.getElementById('shipping_flow_box').style.display      = 'none';
    if (!num) return;
    const p = projectsMap[num] || {};
    document.getElementById('shipping_customer_display').textContent = p.customer_name || '—';
    document.getElementById('shipping_project_name_display').textContent = p.project_details || '—';
    document.getElementById('shipping_project_info').style.display = 'contents';
    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'shipping_machine_list', 'onShippingMachineChange', lockedMachine);
        document.getElementById('shipping_machine_group').style.display = 'block';
    } finally {
        hideLoading();
    }
}

async function onShippingMachineChange() {
    const num      = currentShippingProjectNum;
    const machines = getSelectedMachines('shipping_machine_list');
    document.getElementById('shipping_approver_box').style.display   = 'none';
    document.getElementById('shipping_flow_box').style.display       = 'none';
    document.getElementById('shipping_missing_warning').style.display = 'none';
    document.getElementById('shipping_submit_btn').disabled           = false;
    if (machines.length === 0) return;

    const machine = machines[0];
    showLoading('読み込み中...');
    try {
    // フロー状況（外観検査or簡易検査＋あれば出荷確認会議を動的判定し、未完了があれば申請不可にする。出荷準備の完了は問わない）
    const doneFlows = await _getMachineDoneFlows(num, machine);
    const required  = await _getShippingIssueRequiredFlows(num, machine);

    // 担当者確認欄は検査フロー（簡易検査/外観検査/出荷品確認検査のいずれか）が承認済みになってから表示する。
    // 未完了のうちは見出し「〇〇承認済み」が実態と合わず不自然なため、それまでは非表示にする
    const inspectionType = [...required].find(t => ['simple_inspection', 'inspection', 'shipping_check_inspection'].includes(t));
    const inspectionDone = !inspectionType || doneFlows.has(inspectionType);

    if (inspectionDone) {
        // 担当者確認: tasks から設計・組立・操業 owner を取得
        const { data: taskRows } = await db.from('tasks')
            .select('text, owner, major_item')
            .eq('project_number', num).eq('machine', machine)
            .in('text', ['機械組立', '試運転', '出図']);

        const findOwners = (taskText, majorItem) =>
            [...new Set((taskRows || [])
                .filter(t => t.text === taskText && (!majorItem || (t.major_item || '').trim() === majorItem))
                .flatMap(t => splitOwnerNames(t.owner)))].join('・') || 'なし';

        const kumitateOwner = findOwners('機械組立');
        const shiuntenOwner = findOwners('試運転');
        const sekkeiOwner   = findOwners('出図', '設計');

        // 営業担当者
        const { data: sData } = await db.from('app_settings').select('value').eq('key', 'sales_person_map').single();
        const salesOwner = (sData?.value ? JSON.parse(sData.value) : {})[num] || 'なし';

        // 見出し（「〇〇承認済み」の〇〇部分）を工番・機械の実際の検査系フロー名に合わせて動的に変える
        const inspectionLabel = QA_DETAIL_TITLE_LABELS[inspectionType] || '検査';
        document.getElementById('shipping_approver_label').textContent = `担当者確認（${inspectionLabel}承認済み）`;

        // 現地(出張)担当者
        const tripOwners = await getBusinessTripOwnerNames(num);
        const tripOwner = tripOwners.join('、') || 'なし';

        document.getElementById('shipping_approver_list').innerHTML = [
            ['設計', sekkeiOwner], ['組立', kumitateOwner], ['操業', shiuntenOwner], ['営業', salesOwner], ['現地', tripOwner]
        ].map(([role, name]) =>
            `<div class="flow-info-item"><span style="width:32px;font-size:12px;color:#999;flex-shrink:0;">${role}</span><span>${esc(name)}</span></div>`
        ).join('');
        document.getElementById('shipping_approver_box').style.display = 'block';
    }

    const rows = [...required].map(t => ({ type: t, label: FLOW_LABELS[t] || t }));
    document.getElementById('shipping_flow_list').innerHTML = `<div class="steps-list">` +
        rows.map(f => doneFlows.has(f.type)
            ? _flowStepHtml(FS_DONE_SC, FS_DONE_ICON, f.label, '承認済み')
            : _flowStepHtml(FS_WAIT_SC, FS_WAIT_ICON, f.label)
        ).join('') +
        _flowStepHtml(FS_CUR_SC, FS_CUR_ICON, '出荷確定申請（今回）') +
        `</div>`;
    document.getElementById('shipping_flow_box').style.display = 'block';

    const missing = [...required].filter(t => !doneFlows.has(t));
    if (missing.length > 0) {
        const warnEl = document.getElementById('shipping_missing_warning');
        warnEl.textContent = `⚠ 前フローが未完了のため申請できません`;
        warnEl.style.display = 'block';
        document.getElementById('shipping_submit_btn').disabled = true;
    }
    } finally {
        hideLoading();
    }
}

async function submitShipping() {
    if (requireLogin()) return;
    const num      = currentShippingProjectNum;
    const machines = getSelectedMachines('shipping_machine_list');
    const note     = document.getElementById('shipping_note_input').value.trim();

    if (!num)                  { showToast('工事番号が設定されていません', 'error'); return; }
    if (machines.length === 0) { showToast('機械を選択してください', 'error'); return; }

    const btn = document.getElementById('shipping_submit_btn');
    btn.disabled    = true;
    btn.textContent = '申請中...';
    showLoading('処理中...');

    try {
        // 前フロー完了の再チェック（画面表示が古い場合の防御。出荷準備の完了は問わない）
        for (const machine of machines) {
            const [doneFlows, required] = await Promise.all([
                _getMachineDoneFlows(num, machine),
                _getShippingIssueRequiredFlows(num, machine)
            ]);
            const missing = [...required].filter(t => !doneFlows.has(t));
            if (missing.length > 0) {
                throw new Error(`${machine}: 前フローが未完了のため申請できません`);
            }
        }

        // 営業担当者を解決（sales_person_map）
        const { data: sData } = await db.from('app_settings').select('value').eq('key', 'sales_person_map').single();
        const salesOwner = (sData?.value ? JSON.parse(sData.value) : {})[num] || null;

        for (const machine of machines) {
            const { data: req, error } = await db.from('approval_requests').insert({
                project_number: num, machine_name: machine, flow_type: 'shipping',
                status: 'awaiting_shipping_date', requester_id: currentUser.id, note: note || null,
                confirmed_shipping_date: null
            }).select().single();
            if (error) throw error;

            // 営業へ確定出荷日の入力を依頼
            if (salesOwner) {
                const { data: pRows } = await db.from('profiles').select('id').eq('name', salesOwner);
                if (pRows?.length > 0) {
                    await db.from('approval_notifications').insert(
                        pRows.map(p => ({ request_id: req.id, recipient_id: p.id, notification_type: 'shipping_date_request' }))
                    );
                } else {
                    const { data: nRows } = await db.from('notification_recipients').select('email').eq('name', salesOwner).eq('active', true);
                    if (nRows?.length > 0) {
                        await db.from('approval_notifications').insert(
                            nRows.map(n => ({ request_id: req.id, recipient_email: n.email, notification_type: 'shipping_date_request' }))
                        );
                    }
                }
            }
        }
        closeShippingModal();
        await refreshAll();
        showToast(`${machines.length}機械の申請をしました。\n営業担当者に確定出荷日の入力を依頼します。`, 'success');
    } catch (e) {
        showToast('申請に失敗しました: ' + e.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = '申請する';
        hideLoading();
    }
}

// 営業: 確定出荷日を入力（品証の確認待ちへ）
async function submitSalesShippingDate(requestId) {
    if (requireLogin()) return;
    const isSplitShipping = currentDetailShippingTaskCount >= 2;
    const dateVal        = document.getElementById('sales_date_input')?.value;
    const dateVal2       = isSplitShipping ? (document.getElementById('sales_date_input_2')?.value || null) : null;
    const packingInputEl = document.getElementById('packing_sales_date_input');
    const packingDateVal = packingInputEl?.value || null;

    if (!dateVal) { showToast('確定出荷日を入力してください', 'error'); return; }
    if (isSplitShipping && !dateVal2) { showToast('②の確定出荷日を入力してください', 'error'); return; }
    if (packingInputEl && !packingDateVal) { showToast('梱包出荷日（確定）を入力してください', 'error'); return; }

    showLoading('処理中...');
    try {
        const updatePayload = {
            confirmed_shipping_date: dateVal,
            status: 'awaiting_shipping_confirm',
            updated_at: new Date().toISOString()
        };
        if (isSplitShipping) updatePayload.confirmed_shipping_date_2 = dateVal2;
        if (packingInputEl) updatePayload.packing_confirmed_shipping_date = packingDateVal;

        const { data: req, error } = await db.from('approval_requests')
            .update(updatePayload)
            .eq('id', requestId).eq('status', 'awaiting_shipping_date')
            .select().single();
        if (error) throw error;
        if (!req) { showToast('既に処理済みです', 'error'); return; }

        // 申請者（品証）＋品証・製管全体へ確認依頼を通知
        const notifIds = new Set();
        if (req.requester_id) notifIds.add(req.requester_id);
        const { data: qRows } = await db.from('profiles').select('id').eq('role', 'quality');
        (qRows || []).forEach(p => notifIds.add(p.id));
        const { data: sRows } = await db.from('profiles').select('id').eq('role', 'production_control');
        (sRows || []).forEach(p => notifIds.add(p.id));
        if (notifIds.size > 0) {
            await db.from('approval_notifications').insert(
                [...notifIds].map(id => ({ request_id: requestId, recipient_id: id, notification_type: 'shipping_date_input_done' }))
            );
        }

        await syncShippingDateToTasks(req, { factoryDate: dateVal, factoryDate2: dateVal2, packingDate: packingDateVal });

        closeDetailModal();
        await refreshAll();
        showToast('確定出荷日を入力しました。品証の確認後、申請されます。', 'success');
    } catch (e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 品証: 営業入力済みの確定出荷日を確認し、常務へ本申請する
async function confirmAndSubmitShipping(requestId) {
    showLoading('処理中...');
    try {
        // 出荷準備を含む前フローが全て完了しているか確認する（出荷フローは出荷準備の完了を待たずに起票され得るため、ここで担保する）
        const { data: checkReq } = await db.from('approval_requests')
            .select('project_number, machine_name').eq('id', requestId).single();
        if (checkReq?.project_number && checkReq?.machine_name) {
            const [doneFlows, required] = await Promise.all([
                _getMachineDoneFlows(checkReq.project_number, checkReq.machine_name),
                _getRequiredFlows(checkReq.project_number, checkReq.machine_name)
            ]);
            const missing = [...required].filter(t => !doneFlows.has(t));
            if (missing.length > 0) {
                showToast(`前フロー（${missing.map(t => FLOW_LABELS[t] || t).join('・')}）が未完了のため申請できません`, 'error');
                return;
            }
            const pendingBlockers = await _getShippingPendingBlockers(checkReq.project_number, checkReq.machine_name);
            if (pendingBlockers.length > 0) {
                const labels = pendingBlockers.map(t => FLOW_LABELS[t.flowType] || t.flowType).join('・');
                showToast(`${labels}に未完了のペンディング項目が残っているため申請できません`, 'error');
                return;
            }
        }

        const { data: req, error } = await db.from('approval_requests')
            .update({ status: 'submitted', updated_at: new Date().toISOString() })
            .eq('id', requestId).eq('status', 'awaiting_shipping_confirm')
            .select().single();
        if (error) throw error;
        if (!req) { showToast('既に処理済みです', 'error'); return; }

        // 承認ステップ: 常務（assembly_director）の1ステップ
        // 出荷日変更による再申請の場合は既存ステップが残っているため、新規作成ではなくリセットする
        const { data: existingSteps } = await db.from('approval_steps')
            .select('id').eq('request_id', requestId).eq('step_order', 1);
        if (existingSteps?.length > 0) {
            await db.from('approval_steps').update({
                status: 'pending', approver_id: null, comment: null, decided_at: null
            }).eq('request_id', requestId).eq('step_order', 1);
        } else {
            await db.from('approval_steps').insert({
                request_id: requestId, step_order: 1, approver_role: 'assembly_director', status: 'pending'
            });
        }

        // 常務に承認依頼通知
        const { data: directors } = await db.from('profiles').select('id').eq('role', 'assembly_director');
        if (directors?.length > 0) {
            await db.from('approval_notifications').insert(
                directors.map(d => ({ request_id: requestId, recipient_id: d.id, notification_type: 'approval_request' }))
            );
        }

        closeDetailModal();
        await refreshAll();
        showToast('申請しました。常務に承認依頼が届きます。', 'success');
    } catch (e) {
        showToast('申請に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 営業・品証・製管: 確定出荷日を後から変更する。既に常務へ申請・承認済み（status: submitted/approved）の場合は
// 初回入力時と同じルート（品証の確認待ち→品証が再申請→常務の再承認）に戻す
async function changeConfirmedShippingDate(requestId) {
    if (requireLogin()) return;
    const isSplitShipping = currentDetailShippingTaskCount >= 2;
    const dateVal        = document.getElementById('sales_date_input')?.value;
    const dateVal2       = isSplitShipping ? (document.getElementById('sales_date_input_2')?.value || null) : null;
    const packingInputEl = document.getElementById('packing_sales_date_input');
    const packingDateVal = packingInputEl?.value || null;

    if (!dateVal) { showToast('確定出荷日を入力してください', 'error'); return; }
    if (isSplitShipping && !dateVal2) { showToast('②の確定出荷日を入力してください', 'error'); return; }
    if (packingInputEl && !packingDateVal) { showToast('梱包出荷日（確定）を入力してください', 'error'); return; }

    showLoading('処理中...');
    try {
        const { data: current, error: fetchErr } = await db.from('approval_requests')
            .select('status, confirmed_shipping_date, confirmed_shipping_date_2, packing_confirmed_shipping_date').eq('id', requestId).single();
        if (fetchErr) throw fetchErr;
        if (!current) { showToast('データが見つかりません', 'error'); return; }

        const needsReapproval = current.status === 'submitted' || current.status === 'approved';

        const updatePayload = { confirmed_shipping_date: dateVal, updated_at: new Date().toISOString() };
        if (isSplitShipping) updatePayload.confirmed_shipping_date_2 = dateVal2;
        if (packingInputEl) updatePayload.packing_confirmed_shipping_date = packingDateVal;
        if (needsReapproval) {
            // 初回入力時と同じく、まず品証の確認待ちに戻す（常務への再承認依頼は品証の確認後）
            updatePayload.status      = 'awaiting_shipping_confirm';
            updatePayload.is_resubmit = true;
        }

        const { data: req, error } = await db.from('approval_requests')
            .update(updatePayload).eq('id', requestId).select().single();
        if (error) throw error;

        if (needsReapproval) {
            // 変更前後の日付を履歴として記録する（詳細画面・出荷確認書で参照）
            const dateLabel = packingInputEl ? '工場出荷日（確定）' : '確定出荷日';
            const changeLines = [];
            if (current.confirmed_shipping_date !== dateVal) {
                changeLines.push(`${isSplitShipping ? '①' : ''}${dateLabel}: ${current.confirmed_shipping_date || '未定'} → ${dateVal}`);
            }
            if (isSplitShipping && current.confirmed_shipping_date_2 !== dateVal2) {
                changeLines.push(`②${dateLabel}: ${current.confirmed_shipping_date_2 || '未定'} → ${dateVal2}`);
            }
            if (packingInputEl && current.packing_confirmed_shipping_date !== packingDateVal) {
                changeLines.push(`梱包出荷日（確定）: ${current.packing_confirmed_shipping_date || '未定'} → ${packingDateVal}`);
            }
            const changeSummary = changeLines.join('\n');

            await db.from('shipping_date_change_log').insert({
                request_id: requestId,
                old_confirmed_shipping_date: current.confirmed_shipping_date,
                new_confirmed_shipping_date: dateVal,
                old_confirmed_shipping_date_2: current.confirmed_shipping_date_2,
                new_confirmed_shipping_date_2: dateVal2,
                old_packing_confirmed_shipping_date: current.packing_confirmed_shipping_date,
                new_packing_confirmed_shipping_date: packingDateVal,
                changed_by: currentUser.id
            });

            // 申請者（品証）＋品証・製管全体へ確認依頼を通知
            const notifIds = new Set();
            if (req.requester_id) notifIds.add(req.requester_id);
            const { data: qRows } = await db.from('profiles').select('id').eq('role', 'quality');
            (qRows || []).forEach(p => notifIds.add(p.id));
            const { data: sRows } = await db.from('profiles').select('id').eq('role', 'production_control');
            (sRows || []).forEach(p => notifIds.add(p.id));
            if (notifIds.size > 0) {
                await db.from('approval_notifications').insert(
                    [...notifIds].map(id => ({ request_id: requestId, recipient_id: id, notification_type: 'shipping_date_input_done', detail: changeSummary || '（日付の変更はありません）' }))
                );
            }
        }

        await syncShippingDateToTasks(req, { factoryDate: dateVal, factoryDate2: dateVal2, packingDate: packingDateVal });

        closeDetailModal();
        await refreshAll();
        showToast(needsReapproval ? '出荷日を変更しました。品証の確認後、常務に再申請されます。' : '出荷日を変更しました。', 'success');
    } catch (e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== 試運転準備完了チェック =====
// 組立フローに「試運転準備完了」チェックを追加する。電気艤装タスクがある工事番号・機械は
// 組立・電装それぞれの担当者が個別にチェックし、両方揃って初めて試運転担当者・操業課長/部長へ通知する。
// 通常工事番号は工事番号ごとに1組（machine=''・unit=''）、2000番台は機械・ユニットごとに1組を保持する。
function buildTestRunReadinessSectionHtml(projectNum, machine, unit, asmReady, elecReady, hasElecTask, canEditAssembly, canEditElectrical) {
    const rowHtml = (kind, label, ready, canEdit) => `
        <label style="display:flex; align-items:center; gap:8px; font-size:15px; font-family:inherit; ${canEdit ? 'cursor:pointer;' : 'opacity:.55;'}">
            <input type="checkbox" ${ready ? 'checked' : ''} ${canEdit ? '' : 'disabled'} style="width:16px;height:16px;"
                onchange="toggleTestRunReadiness('${esc(projectNum)}', '${esc(machine)}', '${esc(unit)}', '${kind}', this.checked)">
            <span class="status-badge" style="font-size:13px;padding:3px 10px;${ASSEMBLY_ELEC_BADGE_COLORS[kind]}">${label}</span>
            試運転準備: <span style="font-weight:bold; color:${ready ? '#1c8f4d' : '#999'};">${ready ? '完了' : '未完了'}</span>
        </label>`;
    const rows = [rowHtml('assembly', '組立', asmReady, canEditAssembly)];
    if (hasElecTask) rows.push(rowHtml('electrical', '電装', elecReady, canEditElectrical));
    return `
        <hr class="section-divider">
        <div class="section-title">試運転準備</div>
        <div style="display:flex; gap:24px; flex-wrap:wrap; background:#f8f9fa; border-radius:4px; padding:10px 14px;">${rows.join('')}</div>`;
}

async function toggleTestRunReadiness(projectNum, machine, unit, kind, checked) {
    const payload = checked
        ? { project_number: projectNum, machine, unit, kind, is_ready: true, ready_by: currentUser.id, ready_at: new Date().toISOString() }
        : { project_number: projectNum, machine, unit, kind, is_ready: false, ready_by: null, ready_at: null };
    const { error } = await db.from('test_run_readiness').upsert(payload, { onConflict: 'project_number,machine,unit,kind' });
    if (error) { showToast('更新に失敗しました: ' + error.message, 'error'); return; }
    if (checked) await notifyTestRunReadyIfComplete(projectNum, machine, unit);

    if (machine) {
        await renderAssemblyMachineDetailBody(projectNum, machine);
    } else {
        await renderAssemblyFlowDetailBody(projectNum);
    }
}

// 組立・電装（電気艤装タスクがあれば）双方の準備完了が揃ったら、試運転担当者・操業課長/部長へ通知する
// 2000番台（machineあり）はユニット単位で判定する（そのユニットの組立・電装が揃った時点で都度通知）
async function notifyTestRunReadyIfComplete(projectNum, machine, unit) {
    let hasElecTask;
    if (machine) {
        hasElecTask = !!progressCachedData?.machineTaskSet?.has(`${projectNum}__${machine}__電気艤装`);
    } else {
        const { data } = await db.from('tasks').select('id').eq('project_number', projectNum).eq('text', '電気艤装').limit(1);
        hasElecTask = !!(data && data.length > 0);
    }
    const requiredKinds = hasElecTask ? ['assembly', 'electrical'] : ['assembly'];

    const { data: readinessRows } = await db.from('test_run_readiness')
        .select('kind, is_ready').eq('project_number', projectNum).eq('machine', machine).eq('unit', unit);
    const allReady = requiredKinds.every(k => (readinessRows || []).some(r => r.kind === k && r.is_ready));
    if (!allReady) return;

    await sendTestRunReadyNotification(projectNum, machine, unit);
}

async function sendTestRunReadyNotification(projectNum, machine, unit) {
    let taskQuery = db.from('tasks').select('owner').eq('project_number', projectNum).eq('text', '試運転');
    if (machine) taskQuery = taskQuery.eq('machine', machine);
    const { data: shiuntenTasks } = await taskQuery;
    const shiuntenOwnerNames = [...new Set((shiuntenTasks || []).flatMap(t => splitOwnerNames(t.owner)))];

    const profileIds = new Set();
    if (shiuntenOwnerNames.length > 0) {
        const { data: ownerProfiles } = await db.from('profiles').select('id').in('name', shiuntenOwnerNames);
        (ownerProfiles || []).forEach(p => profileIds.add(p.id));
    }
    const { data: mgrProfiles } = await db.from('profiles').select('id').in('role', ['operations_manager', 'operations_director']);
    (mgrProfiles || []).forEach(p => profileIds.add(p.id));
    if (profileIds.size === 0) return;

    const detail = machine ? `${projectNum}【${machine}${unit || ''}】` : projectNum;
    const inserts = [...profileIds].map(id => ({
        recipient_id: id, notification_type: 'test_run_ready', detail
    }));
    await db.from('approval_notifications').insert(inserts);
}

// ===== Notifications =====

async function recordFlowNotifications(requestId, flowType, optionalKeys = null) {
    // 工番・機械名・申請者IDを取得
    const { data: req } = await db.from('approval_requests').select('project_number, machine_name, unit_name, requester_id, assembly_items').eq('id', requestId).single();
    const projectNum = req?.project_number;
    if (!projectNum) return;
    // 2000番台の組立(assembly)は1申請に複数機械・ユニットが紐づくため、機械+ユニット単位でオーナーを絞り込む。
    // それ以外（2000番以外の工番、または組立以外のフロー）は機械名が工程表と紐づかない自由入力/要約文字列のことがあるため、従来通り機械名（無ければ工番全体）で検索する。
    const assemblyItems = (flowType === 'assembly' && is2000sSeries(projectNum)) ? getAssemblyItemsForReq(req) : null;
    const machineName = flowType === 'assembly' ? null : req?.machine_name;

    // 対象機械のタスクオーナーを取得（機械名がある場合は機械でフィルタ）
    let taskQuery = db.from('tasks').select('text, owner, major_item, machine, unit').eq('project_number', projectNum);
    if (machineName) taskQuery = taskQuery.eq('machine', machineName);
    const { data: tasks } = await taskQuery;

    // tasks.unitがカンマ区切りで複数ユニットをまとめている場合（例: "OF,CU,DS"）に対応
    const unitMatches = (rowUnit, itemUnit) => String(rowUnit || '').split(',').map(s => s.trim()).includes(String(itemUnit || '').trim());

    // assembly_items（機械+ユニット）ごとにオーナーを検索する。
    // unit列が'ALL'の行は「そのユニット専用の行が無い場合のデフォルト担当者」として扱い、専用行が見つかった場合のみそちらを優先する。
    // 該当機械のタスク自体はあるのに誰も見つからない場合はunresolvedを立て、申請者へのフォールバック通知に使う。
    const findOwnersByItems = (taskName, majorItem) => {
        const names = new Set();
        let unresolved = false;
        for (const item of assemblyItems) {
            const rowsForMachine = (tasks || []).filter(t => t.text === taskName && (!majorItem || String(t.major_item || '').trim() === majorItem) && t.machine === item.machine);
            if (rowsForMachine.length === 0) continue;
            const exact = rowsForMachine.filter(t => unitMatches(t.unit, item.unit));
            const rows = exact.length > 0 ? exact : rowsForMachine.filter(t => String(t.unit || '').trim() === 'ALL');
            const before = names.size;
            rows.flatMap(t => splitOwnerNames(t.owner)).forEach(n => names.add(n));
            if (names.size === before) unresolved = true;
        }
        return { owners: [...names], unresolved };
    };
    const findOwnersFlat = (taskName, majorItem) => {
        const matched = (tasks || []).filter(t => t.text === taskName && (!majorItem || String(t.major_item || '').trim() === majorItem));
        return { owners: [...new Set(matched.flatMap(t => splitOwnerNames(t.owner)))], unresolved: false };
    };
    const findOwners = assemblyItems ? findOwnersByItems : findOwnersFlat;

    const kumitateResult = findOwners('機械組立');
    const shiuntenResult = findOwners('試運転');
    const sekkeiResult   = findOwners('出図', '設計');
    const denkiResult    = findOwners('電気艤装');
    const kumitateOwners = kumitateResult.owners;
    const shiuntenOwners = shiuntenResult.owners;
    const sekkeiOwners   = sekkeiResult.owners;
    const denkiOwners    = denkiResult.owners;

    // 営業担当者をapp_settingsから取得
    const { data: sData } = await db.from('app_settings').select('value').eq('key', 'sales_person_map').single();
    const salesOwner = (sData?.value ? JSON.parse(sData.value) : {})[projectNum] || null;

    const profileIds = new Set();
    const extEmails  = new Set();

    // profiles から部署/ロールで追加
    const addP = async (filters) => {
        let q = db.from('profiles').select('id');
        if (filters.department) q = q.eq('department', filters.department);
        if (filters.role)       q = q.eq('role', filters.role);
        const { data } = await q;
        (data || []).forEach(p => profileIds.add(p.id));
    };
    // profiles から名前で追加（工番の担当者）
    const addPbyName = async (name) => {
        if (!name) return;
        const { data } = await db.from('profiles').select('id').eq('name', name);
        (data || []).forEach(p => profileIds.add(p.id));
    };
    // notification_recipients から部署/ロールで追加
    const addE = async (filters) => {
        let q = db.from('notification_recipients').select('email').eq('active', true);
        if (filters.department) q = q.eq('department', filters.department);
        if (filters.role)       q = q.eq('role', filters.role);
        const { data } = await q;
        (data || []).map(r => r.email).filter(Boolean).forEach(e => extEmails.add(e));
    };
    // notification_recipients から名前で追加（工番の担当者）
    const addEbyName = async (name) => {
        if (!name) return;
        const { data } = await db.from('notification_recipients').select('email').eq('name', name).eq('active', true);
        (data || []).map(r => r.email).filter(Boolean).forEach(e => extEmails.add(e));
    };
    // 工番担当者名から profiles・notification_recipients の両方を検索する（設計・営業は一部だけログイン移行済みのため両対応が必要）
    const addOwnerByName = async (name) => {
        await addPbyName(name);
        await addEbyName(name);
    };
    // 設定画面で個人単位に選ばれた固定宛先を追加（申請者自身は宛先から除く）
    const addFixedRecipients = async () => {
        const plan = getFixedRecipientPlan(flowType);
        plan.profileIds.filter(id => id !== req.requester_id).forEach(id => profileIds.add(id));
        if (plan.recipientIds.length > 0) {
            const { data } = await db.from('notification_recipients').select('email').in('id', plan.recipientIds).eq('active', true);
            (data || []).map(r => r.email).filter(Boolean).forEach(e => extEmails.add(e));
        }
    };

    // members テーブルから設計担当者ごとの上長（supervisor_email1/2）を取得
    // 担当者単位でmembers未登録・上長未設定の場合のみ、その担当者分は設計全管理職にフォールバック
    const addSekkeiSupervisors = async () => {
        let hasUnresolvedOwner = sekkeiOwners.length === 0;
        if (sekkeiOwners.length > 0) {
            const { data: memberRows } = await db.from('members')
                .select('name, supervisor_email1, supervisor_email_2')
                .in('name', sekkeiOwners);
            const memberMap = Object.fromEntries((memberRows || []).map(m => [m.name, m]));
            const supEmails = new Set();
            for (const name of sekkeiOwners) {
                const m = memberMap[name];
                const emails = m ? [m.supervisor_email1, m.supervisor_email_2].filter(Boolean) : [];
                if (emails.length > 0) {
                    emails.forEach(e => supEmails.add(e));
                } else {
                    hasUnresolvedOwner = true;
                }
            }
            if (supEmails.size > 0) {
                // 上長がprofilesに登録済みならrecipient_id、未登録ならrecipient_emailで保存する
                const { data: supProfiles } = await db.from('profiles').select('id, email').in('email', [...supEmails]);
                const matchedEmails = new Set();
                (supProfiles || []).forEach(p => { profileIds.add(p.id); matchedEmails.add(p.email); });
                for (const email of supEmails) {
                    if (!matchedEmails.has(email)) extEmails.add(email);
                }
            }
        }
        if (hasUnresolvedOwner) {
            await addP({ department: '設計', role: 'design_manager' });
            await addP({ department: '設計', role: 'design_director' });
        }
    };

    let notifType = 'completed';

    switch (flowType) {
        case 'assembly': {
            const dyn = getDynamicRecipientPlan('assembly');
            // 固定宛先（設定画面で個人単位に選択）
            await addFixedRecipients();
            // 工番担当者（profiles）: 組立（複数人対応、ON/OFF切替可）
            if (dyn.kumitate_owner) {
                for (const o of kumitateOwners) await addPbyName(o);
                // 機械+ユニットで絞り込んだ結果、担当者が誰も見つからなかった場合は申請者本人に通知する
                if (kumitateOwners.length === 0 && kumitateResult.unresolved && req.requester_id) profileIds.add(req.requester_id);
            }
            // 操業部（試運転担当者・操業課長/部長）は組立完了通知の対象外
            // 工番担当者（外部）: 営業・設計staff（ON/OFF切替可）
            if (dyn.sales) await addOwnerByName(salesOwner);
            if (dyn.sekkei_owner) {
                for (const o of sekkeiOwners) await addOwnerByName(o);
                if (sekkeiOwners.length === 0 && sekkeiResult.unresolved && req.requester_id) profileIds.add(req.requester_id);
            }
            // 設計管理職: 担当者の上長を members テーブルから取得（本人・上長を別々にON/OFF切替可）
            if (dyn.sekkei_manager) await addSekkeiSupervisors();
            // 電気艤装タスクがある場合のみ電装担当者も追加
            if (dyn.denki_owner) {
                for (const o of denkiOwners) await addPbyName(o);
                if (denkiOwners.length === 0 && denkiResult.unresolved && req.requester_id) profileIds.add(req.requester_id);
            }
            break;
        }

        case 'electrical': {
            const dyn = getDynamicRecipientPlan('electrical');
            // 固定宛先（設定画面で個人単位に選択）
            await addFixedRecipients();
            // 工番担当者（profiles）: 組立（複数人対応、ON/OFF切替可）
            if (dyn.kumitate_owner) for (const o of kumitateOwners) await addPbyName(o);
            // 試運転タスクがある場合のみ試運転担当者も追加（本人・上長を別々にON/OFF切替可）
            if (dyn.shiunten_owner) for (const o of shiuntenOwners) await addPbyName(o);
            if (dyn.shiunten_manager && shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });  // 操業課長（試運転あり）
                await addP({ role: 'operations_director' }); // 操業部長（試運転あり）
            }
            // 工番担当者（外部）: 営業・設計staff（ON/OFF切替可）
            if (dyn.sales) await addOwnerByName(salesOwner);
            if (dyn.sekkei_owner) for (const o of sekkeiOwners) await addOwnerByName(o);
            // 設計管理職: 担当者の上長を members テーブルから取得（本人・上長を別々にON/OFF切替可）
            if (dyn.sekkei_manager) await addSekkeiSupervisors();
            break;
        }

        case 'test_run': {
            const dyn = getDynamicRecipientPlan('test_run');
            // 固定宛先（設定画面で個人単位に選択）
            await addFixedRecipients();
            if (dyn.kumitate_manager && kumitateOwners.length > 0) await addP({ role: 'assembly_manager' });   // 組立課長（機械組立あり）
            if (dyn.shiunten_manager && shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });  // 操業課長（試運転あり）
                await addP({ role: 'operations_director' }); // 操業部長（試運転あり）
            }
            // 工番担当者（profiles）: 組立・操業（複数人対応、本人・上長を別々にON/OFF切替可）
            if (dyn.kumitate_owner) for (const o of kumitateOwners) await addPbyName(o);
            if (dyn.shiunten_owner) for (const o of shiuntenOwners) await addPbyName(o);
            // 工番担当者（外部）: 営業・設計staff（ON/OFF切替可）
            if (dyn.sales) await addOwnerByName(salesOwner);
            if (dyn.sekkei_owner) for (const o of sekkeiOwners) await addOwnerByName(o);
            // 設計管理職: 担当者の上長を members テーブルから取得
            if (dyn.sekkei_manager) await addSekkeiSupervisors();
            break;
        }

        case 'shipping_meeting': {
            const dyn = getDynamicRecipientPlan('shipping_meeting');
            notifType = 'shipping_meeting_invite';
            profileIds.add(req.requester_id); // 開催者は宛先候補として自分にも追加する（必須/任意は宛先確認画面のチェックボックスに従う）
            await addFixedRecipients();                                         // 設定画面で個人単位に選択
            if (dyn.kumitate_owner) for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            if (dyn.shiunten_owner) for (const o of shiuntenOwners) await addPbyName(o);   // 試運転担当者（タスクがあれば）
            if (dyn.sales)    await addOwnerByName(salesOwner);                          // 営業担当者
            if (dyn.sekkei_owner) for (const o of sekkeiOwners) await addOwnerByName(o);     // 設計担当者
            if (dyn.sekkei_manager) await addSekkeiSupervisors();                           // 設計課長・部長
            if (dyn.kumitate_manager && kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });           // 組立課長（機械組立あり）
            }
            if (dyn.shiunten_manager && shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });         // 操業課長（試運転あり）
                await addP({ role: 'operations_director' });        // 操業部長（試運転あり）
            }
            // 電気艤装タスクがある場合のみ電装担当者も追加
            if (dyn.denki_owner) for (const o of denkiOwners) await addPbyName(o);
            // 全体工程表の出張予定シートに当該工番のタスクがあれば、その担当者も宛先に追加（タスク名は問わない）
            for (const o of await getBusinessTripOwnerNames(projectNum)) await addOwnerByName(o);
            break;
        }

        case 'simple_inspection': {
            const dyn = getDynamicRecipientPlan('simple_inspection');
            notifType = 'simple_inspection_invite';
            profileIds.add(req.requester_id); // 開催者は宛先候補として自分にも追加する（必須/任意は宛先確認画面のチェックボックスに従う）
            await addFixedRecipients();                                         // 設定画面で個人単位に選択
            if (dyn.kumitate_owner) for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            if (dyn.sales)    await addOwnerByName(salesOwner);                          // 営業担当者
            if (dyn.sekkei_owner) for (const o of sekkeiOwners) await addOwnerByName(o);     // 設計担当者
            if (dyn.sekkei_manager) await addSekkeiSupervisors();                           // 設計課長・部長
            if (dyn.kumitate_manager && kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });           // 組立課長（機械組立あり）
            }
            // 電気艤装タスクがある場合のみ電装担当者も追加
            if (dyn.denki_owner) for (const o of denkiOwners) await addPbyName(o);
            // 全体工程表の出張予定シートに当該工番のタスクがあれば、その担当者も宛先に追加（タスク名は問わない）
            for (const o of await getBusinessTripOwnerNames(projectNum)) await addOwnerByName(o);
            break;
        }

        case 'inspection': {
            const dyn = getDynamicRecipientPlan('inspection');
            notifType = 'inspection_invite';
            profileIds.add(req.requester_id); // 開催者は宛先候補として自分にも追加する（必須/任意は宛先確認画面のチェックボックスに従う）
            await addFixedRecipients();                                         // 設定画面で個人単位に選択
            if (dyn.kumitate_owner) for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            if (dyn.shiunten_owner) for (const o of shiuntenOwners) await addPbyName(o);   // 試運転担当者（タスクがあれば）
            if (dyn.sales)    await addOwnerByName(salesOwner);                          // 営業担当者
            if (dyn.sekkei_owner) for (const o of sekkeiOwners) await addOwnerByName(o);     // 設計担当者
            if (dyn.sekkei_manager) await addSekkeiSupervisors();                           // 設計課長・部長
            if (dyn.kumitate_manager && kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });           // 組立課長（機械組立あり）
            }
            if (dyn.shiunten_manager && shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });         // 操業課長（試運転あり）
                await addP({ role: 'operations_director' });        // 操業部長（試運転あり）
            }
            // 電気艤装タスクがある場合のみ電装担当者も追加
            if (dyn.denki_owner) for (const o of denkiOwners) await addPbyName(o);
            // 全体工程表の出張予定シートに当該工番のタスクがあれば、その担当者も宛先に追加（タスク名は問わない）
            for (const o of await getBusinessTripOwnerNames(projectNum)) await addOwnerByName(o);
            break;
        }

        case 'shipping_check_inspection': {
            // 機械組立が無い工番向けの検査フロー（簡易検査・外観検査の代わり）。宛先は設計担当者・営業担当者・品証・製管のみ
            const dyn = getDynamicRecipientPlan('shipping_check_inspection');
            notifType = 'shipping_check_inspection_invite';
            profileIds.add(req.requester_id); // 開催者は宛先候補として自分にも追加する（必須/任意は宛先確認画面のチェックボックスに従う）
            await addFixedRecipients();                                         // 品証・製管（設定画面で個人単位に選択）
            if (dyn.sales)        await addOwnerByName(salesOwner);             // 営業担当者
            if (dyn.sekkei_owner) for (const o of sekkeiOwners) await addOwnerByName(o); // 設計担当者
            break;
        }

        case 'shipping_prep':
            // 固定宛先（設定画面で個人単位に選択）。工番担当者の自動通知は対象外（To は品証のみ）。
            // 組立/操業/設計/営業/現地工事担当者と製管は、メール送信時（notify-approval.js）に品証宛メールのCCとして届く
            await addFixedRecipients();
            break;

        case 'shipping': {
            const dyn = getDynamicRecipientPlan('shipping');
            // 固定宛先（設定画面で個人単位に選択）
            await addFixedRecipients();
            // 設計管理職: 担当者の上長を members テーブルから取得
            if (dyn.sekkei_manager) {
                await addSekkeiSupervisors();
            }
            // 機械組立タスクがある場合: 組立課長
            if (dyn.kumitate_manager && kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });
            }
            // 試運転タスクがある場合: 操業課長・部長
            if (dyn.shiunten_manager && shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });
                await addP({ role: 'operations_director' });
            }
            // 工番担当者
            if (dyn.sekkei_owner)   for (const o of sekkeiOwners)   await addOwnerByName(o);  // 設計担当者（notification_recipients）
            if (dyn.kumitate_owner) for (const o of kumitateOwners) await addPbyName(o);  // 組立担当者（profiles）
            if (dyn.shiunten_owner) for (const o of shiuntenOwners) await addPbyName(o);  // 操業担当者（profiles）
            if (dyn.sales)    await addOwnerByName(salesOwner);                          // 営業担当者（notification_recipients）
            break;
        }
    }

    // si/inspection/shipping_meetingの宛先確認画面ではデフォルト「任意」・チェックで「必須」指定する仕様のため、
    // optionalKeysには「必須指定された宛先」が入る（未指定=任意がデフォルト）。それ以外のフローはoptionalKeysを渡さないため従来通り全員必須のまま。
    const isOptional = (key) => {
        if (!optionalKeys) return false;
        return !optionalKeys.has(key);
    };

    // 同一申請・同一通知種別への重複挿入防止（二重クリックや多重呼び出しへの保険）
    const { data: existingRows } = await db.from('approval_notifications')
        .select('recipient_id, recipient_email')
        .eq('request_id', requestId)
        .eq('notification_type', notifType);
    const existingIds    = new Set((existingRows || []).map(r => r.recipient_id).filter(Boolean));
    const existingEmails = new Set((existingRows || []).map(r => r.recipient_email).filter(Boolean));

    const inserts = [
        ...[...profileIds].filter(id    => !existingIds.has(id)).map(id       => ({ request_id: requestId, recipient_id:    id,    notification_type: notifType, optional: isOptional(id) })),
        ...[...extEmails ].filter(email => !existingEmails.has(email)).map(email => ({ request_id: requestId, recipient_email: email, notification_type: notifType, optional: isOptional(email) }))
    ];
    if (inserts.length > 0) await db.from('approval_notifications').insert(inserts);
}

// フロー1・2・3の全承認完了時に呼び出す
async function recordNotifications(requestId) {
    const { data: req } = await db
        .from('approval_requests')
        .select('flow_type')
        .eq('id', requestId)
        .single();
    if (!req) return;
    await recordFlowNotifications(requestId, req.flow_type);
}

// ===== Helpers =====
// 日付入力欄はどこをクリックしてもカレンダーを開く（カレンダーアイコンだけでなく枠全体をクリック可能にする）
document.addEventListener('click', (e) => {
    const el = e.target.closest('input[type="date"]');
    if (el && typeof el.showPicker === 'function') {
        try { el.showPicker(); } catch (err) { /* 対応ブラウザ以外は無視 */ }
    }
});

// ペンディング項目の写真選択欄（.photo-dropzone）: クリック・ドラッグ＆ドロップの両方に対応
// 動的に再描画されるHTMLのため、個別要素へのバインドではなくdocument委譲で処理する
function _photoDropzoneLabel(zone) {
    const input = zone.querySelector('input[type="file"]');
    const label = zone.querySelector('.photo-dropzone-label');
    if (label) label.textContent = input?.files?.[0]?.name || 'クリックまたはドラッグ＆ドロップで写真を選択';
}
document.addEventListener('click', (e) => {
    const zone = e.target.closest('.photo-dropzone');
    if (zone) zone.querySelector('input[type="file"]')?.click();
});
document.addEventListener('change', (e) => {
    const zone = e.target.closest('.photo-dropzone');
    if (zone && e.target.matches('input[type="file"]')) _photoDropzoneLabel(zone);
});
document.addEventListener('dragover', (e) => {
    const zone = e.target.closest('.photo-dropzone');
    if (zone) { e.preventDefault(); zone.classList.add('drag-over'); }
});
document.addEventListener('dragleave', (e) => {
    const zone = e.target.closest('.photo-dropzone');
    if (zone) zone.classList.remove('drag-over');
});
document.addEventListener('drop', (e) => {
    const zone = e.target.closest('.photo-dropzone');
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('drag-over');
    const input = zone.querySelector('input[type="file"]');
    if (input && e.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files;
        _photoDropzoneLabel(zone);
    }
});

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ペンディング項目一覧の通し番号表示（①②③...、21件目以降は「21.」のようにフォールバック）
const CIRCLED_NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
function circledNum(n) {
    return CIRCLED_NUMS[n - 1] || `${n}.`;
}

// ペンディング項目の完了予定日が迫っている（3日以内・期限切れ含む）かどうか。未設定の場合はfalse
function pendingDueSoon(dueStr) {
    if (!dueStr) return false;
    const [y, m, d] = dueStr.split('-').map(Number);
    const dueUTC = Date.UTC(y, m - 1, d);
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((dueUTC - todayUTC) / 86400000);
    return diffDays <= 3;
}

let _profilesCache = null;
async function getProfileByRole(role) {
    if (!_profilesCache) {
        const { data } = await db.from('profiles').select('*');
        _profilesCache = data || [];
    }
    return _profilesCache.find(p => p.role === role);
}

// ===== Auth Listener =====
db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        currentUser    = null;
        currentProfile = null;
        bootGuest();
    } else if (event === 'TOKEN_REFRESHED' && session) {
        // 自動リフレッシュされたトークンをlocalStorageにも反映（長時間開いたままにしても次回起動時のログイン状態を維持するため）
        localStorage.setItem('ap_access_token',  session.access_token);
        localStorage.setItem('ap_refresh_token', session.refresh_token);
    }
});

// localStorageに保存されたトークンでセッションを復元する。成功時はsessionを、失敗時はnullを返す（失敗時はlocalStorageも削除）
async function restoreSessionFromStorage() {
    const accessToken  = localStorage.getItem('ap_access_token');
    const refreshToken = localStorage.getItem('ap_refresh_token');
    if (!accessToken) return null;

    const { data, error } = await db.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken
    });
    if (error || !data.session) {
        localStorage.removeItem('ap_access_token');
        localStorage.removeItem('ap_refresh_token');
        return null;
    }
    localStorage.setItem('ap_access_token',  data.session.access_token);
    localStorage.setItem('ap_refresh_token', data.session.refresh_token);
    return data.session;
}

// タブを長時間バックグラウンドに置くとSDKの自動更新タイマーが働かず、
// トークンが失効したまま気づかないことがあるため、画面に戻ってきたタイミングで再確認する
let _revalidatingSession = false;
async function revalidateSession() {
    if (_revalidatingSession) return;
    _revalidatingSession = true;
    try {
        const session = await restoreSessionFromStorage();
        if (!session && currentUser?.id) {
            currentUser    = null;
            currentProfile = null;
            showToast('ログインの有効期限が切れました。再度ログインしてください', 'error');
            await bootGuest();
        }
    } finally {
        _revalidatingSession = false;
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!currentUser?.id) return; // ゲスト（未ログイン）時は対象外
    revalidateSession();
});

// 同じ承認フローを複数タブ・複数ウィンドウで開いている場合、片方のタブがトークンを更新すると
// もう片方は古いトークンのまま取り残される。古いトークンで更新しようとすると
// 「使用済みトークン」としてSupabase側にセッションごと無効化されてしまうため、
// 他タブでのトークン更新をstorageイベントで検知し、即座にこのタブにも反映する
window.addEventListener('storage', (e) => {
    if (e.key !== 'ap_access_token' && e.key !== 'ap_refresh_token') return;
    if (!currentUser?.id) return;
    revalidateSession();
});

// ===== ページロード時にセッションを復元 =====
(async () => {
    // 招待・パスワードリセットのメールリンクから来た場合は、通常ログインより先に判定する
    const hashAuth = parseAuthHash();
    if (hashAuth && (hashAuth.type === 'invite' || hashAuth.type === 'recovery')) {
        const { data, error } = await db.auth.setSession({
            access_token:  hashAuth.accessToken,
            refresh_token: hashAuth.refreshToken
        });
        // トークンが残ったままリロードされると再処理されるため、URLから消す
        history.replaceState(null, '', window.location.pathname + window.location.search);
        if (!error && data.session) {
            showSetPasswordScreen(data.session);
            return;
        }
    }

    const session = await restoreSessionFromStorage();
    if (!session) { await bootGuest(); return; } // 未ログイン・失効 → 閲覧のみで起動
    await bootApp(session);
})();

