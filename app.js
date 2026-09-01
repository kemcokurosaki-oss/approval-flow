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
    { label: 'A',  items: ['A0','A1','A2','A3','A4','A5','A6','A7'] },
    { label: 'B',  items: ['B0','B1','B2','B3','B4','B5','B6','B7'] },
    { label: 'C',  items: ['C0','C1','C2','C3','C4','C5','C6','C7'] },
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
let devRole = ''; // 開発用ロール上書き
let devDept = ''; // 開発用部署上書き
let currentDetailFlowType = '';
let currentDetailHasPackingShipping = false;
let currentDetailShippingTaskCount = 1; // 工程表上の工場出荷タスク件数（分割出荷なら2）
let qaEditingPendingIdx  = null; // 開催結果セクションで編集中のペンディング項目インデックス

// デモ用ロール→{role, department, flowTypes} マッピング
// flowTypes: 自分の申請タブで表示するフロー種別（デモ用フィルタ）
const DEV_ROLE_MAP = {
    staff_kumitate:      { role: 'staff',               department: '組立', flowTypes: ['assembly'] },
    staff_denki:         { role: 'staff',               department: '電装', flowTypes: ['electrical'] },
    staff_shiunten:      { role: 'staff',               department: '操業', flowTypes: ['test_run'] },
    assembly_manager:    { role: 'assembly_manager',    department: '組立', flowTypes: ['assembly'] },
    assembly_director:   { role: 'assembly_director',   department: '組立', flowTypes: [] },
    operations_manager:  { role: 'operations_manager',  department: '操業', flowTypes: ['test_run'] },
    operations_director: { role: 'operations_director', department: '操業', flowTypes: [] },
    quality:             { role: 'quality',             department: '品証', flowTypes: ['simple_inspection', 'inspection', 'shipping'] },
    production_control:  { role: 'production_control',  department: '製管', flowTypes: [] },
    sales:               { role: 'staff',               department: '営業', flowTypes: ['shipping_prep'] }
};
let devFlowTypes    = []; // デモ用: 自分の申請タブのフロー絞り込み
let userIsApplicant  = false; // 申請権限フラグ
let isQualityOrSeikan = false; // 品証・製管フラグ（openDetailModal から参照）

function getEffectiveRole() { return devRole || currentProfile?.role || ''; }
function getEffectiveDept() { return devDept || currentProfile?.department || ''; }

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
    return supervisorRoles.includes(getEffectiveRole());
}

function canApplyFlow(flowType) {
    const role  = getEffectiveRole();
    const dept  = getEffectiveDept();
    const isQorS = role === 'quality' || role === 'production_control';
    if (flowType === 'assembly')         return (role === 'staff' && dept === '組立') || role === 'assembly_manager';
    if (flowType === 'electrical')       return role === 'staff' && dept === '電装';
    if (flowType === 'test_run')         return (role === 'staff' && dept === '操業') || role === 'operations_manager';
    if (flowType === 'shipping_prep')    return dept === '組立' || dept === '営業';
    if (flowType === 'simple_inspection' || flowType === 'inspection' ||
        flowType === 'shipping_meeting'  || flowType === 'shipping')  return isQorS;
    return false;
}

// 承認者ロール一覧
const APPROVER_ROLES = ['assembly_manager','assembly_director','operations_manager','operations_director'];

// 設定画面を開けるユーザー（製管2名）。開発用ロール切替バーの表示条件としても使う
const ADMIN_EMAILS = ['e-kurosaki@kusakabe.com', 's-morimura@kusakabe.com', 'm2-kusakabe@kusakabe.com'];

function applyRoleLayout(role) {
    const dept        = getEffectiveDept();
    // 品証・製管は出荷準備フローの承認者でもあるため承認待ち一覧の対象に含める
    const isApprover  = APPROVER_ROLES.includes(role) || (role === 'staff' && dept === '営業') || role === 'quality' || role === 'production_control';
    // 品証、および製管は同一権限（グローバル変数に保存）
    isQualityOrSeikan = role === 'quality' || role === 'production_control';
    // 組立・操業・電装 staff + 組立課長 + 操業課長 + 営業staff（出荷準備申請）が申請可
    const isApplicant = (role === 'staff' && (dept === '組立' || dept === '操業' || dept === '営業' || dept === '電装'))
                      || role === 'assembly_manager'
                      || role === 'operations_manager';
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

async function switchDevRole(value) {
    const map    = DEV_ROLE_MAP[value];
    devRole      = map ? map.role       : '';
    devDept      = map ? map.department : '';
    devFlowTypes = map ? (map.flowTypes || []) : [];

    const DEMO_LABELS = {
        staff_kumitate:      '組立担当者',
        staff_denki:         '電装担当者',
        staff_shiunten:      '試運転担当者（操業）',
        assembly_manager:    '組立課長',
        assembly_director:   '組立部長',
        operations_manager:  '操業課長',
        operations_director: '操業部長',
        quality:             '品質保証課',
        production_control:  '製管',
        sales:               '営業担当者'
    };
    const label = document.getElementById('dev_role_label');
    label.textContent = value ? `▶ ${DEMO_LABELS[value] || value} として表示中` : '';

    applyRoleLayout(getEffectiveRole());
    await refreshAll();
}

// ===== Constants =====
// 承認ステップを持たず、開催案内送信のみで進行する3フロー（開催後に品証がペンディングを確認して完了させる）
const QA_MEETING_FLOWS = ['simple_inspection', 'inspection', 'shipping_meeting'];

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
    { key: 'pending_item_reminder',                 label: 'ペンディング項目期日超過催促のCC' }
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
    assembly:          ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'shiunten_owner', 'shiunten_manager', 'denki_owner'],
    test_run:          ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager', 'shiunten_owner', 'shiunten_manager'],
    shipping_meeting:  ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager', 'shiunten_owner', 'shiunten_manager'],
    simple_inspection: ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager'],
    inspection:        ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager', 'shiunten_owner', 'shiunten_manager'],
    shipping:          ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'kumitate_manager', 'shiunten_owner', 'shiunten_manager'],
    electrical:        ['sales', 'sekkei_owner', 'sekkei_manager', 'kumitate_owner', 'shiunten_owner', 'shiunten_manager']
    // shipping_prep: 工番担当者の自動通知は対象外（固定宛先のみ）
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
    shipping_meeting:    '出荷確認会議開催案内',
    shipping_prep:       '出荷準備完了申請',
    shipping:            '出荷確定申請'
};

// 開催案内送信後の詳細モーダルヘッダー用（「開催案内」を省いた表記）。出荷後対応ペンディング一覧のフロー名短縮でも流用する
const QA_DETAIL_TITLE_LABELS = {
    simple_inspection: '簡易検査',
    inspection:        '外観検査',
    shipping_meeting:  '出荷確認会議',
    assembly:          '組立',
    test_run:          '試運転'
};

// タスク名 → フロー種別（工程表の実タスクからフロー構成・順序を導出するための対応表）
const TASK_TEXT_TO_FLOW = {
    '簡易検査':     'simple_inspection',
    '外観検査':     'inspection',
    '試運転':       'test_run',
    '出荷確認会議': 'shipping_meeting',
    '出荷準備':     'shipping_prep'
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

// ヘッダーの実際の高さ（dev_bar表示の有無やフォント環境で変わる）を測って、
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

    // 製管2名+常務のみ開発用ロール切替バー・ユーザーメニューの「設定」項目を表示
    if (ADMIN_EMAILS.includes(currentUser.email)) {
        document.getElementById('dev_bar').style.display = 'flex';
        document.getElementById('app').classList.add('has-dev-bar');
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
    document.getElementById('dev_bar').style.display          = 'none';
    document.getElementById('app').classList.remove('has-dev-bar');
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
            projectsMap[num].owners.add(t.owner);
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
    const msg = blockers.map(b => b.notApproved
        ? `${b.label || FLOW_LABELS[b.flowType] || b.flowType}（未確定）`
        : `${FLOW_LABELS[b.flowType] || b.flowType}（${b.count}件）`
    ).join('、');
    const listEl = document.getElementById('flow_detect_list');
    if (listEl) {
        listEl.innerHTML += `<div style="color:#c0392b; font-weight:bold; font-size:14px; margin-top:8px;">⚠ 前フローが未完了のため申請できません: ${msg}</div>`;
    }
}

async function onMachineChange() {
    const num      = currentProjectNum;
    const machines = getSelectedMachines('submit_machine_list');
    const flowEl   = document.getElementById('flow_detect_group');

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
    const isApprover  = APPROVER_ROLES.includes(role) || (role === 'staff' && dept === '営業') || isQorS;
    const isApplicant = role === 'staff' && (dept === '組立' || dept === '操業' || dept === '営業');

    const loads = [];
    loads.push(loadProgress());
    if (isApprover) loads.push(loadPendingSide());
    if (isApplicant || isQorS || role === 'assembly_manager' || role === 'operations_manager') loads.push(loadMineSide());

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
    if (mypageFilterMode === 'assembly') return is2000sSeries(num);
    if (mypageFilterMode === 'main')     return !is2000sSeries(num);
    return true;
}

async function loadPendingSide() {
    const role    = getEffectiveRole();
    const dept    = getEffectiveDept();
    const isSales = role === 'staff' && dept === '営業';
    const el      = document.getElementById('side_content_pending');
    if (!el) return;

    // 承認ステップが自分のロールで pending のものを取得
    const { data: steps, error } = await db
        .from('approval_steps')
        .select(`
            id, step_order, approver_role, approver_id, status, comment, decided_at,
            approval_requests ( id, flow_type, status, note, created_at, project_number, machine_name, test_run, requester_id )
        `)
        .eq('approver_role', role)
        .eq('status', 'pending');

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
    }));

    // 営業: 確定出荷日の入力待ちになっている申請を取得
    let salesItems = [];
    if (isSales) {
        const { data: salesReqs } = await db.from('approval_requests')
            .select('id, project_number, machine_name, created_at')
            .eq('flow_type', 'shipping').eq('status', 'awaiting_shipping_date');
        salesItems = (salesReqs || []).map(r => ({
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
    const PACKING_RELEVANT_FLOWS = ['shipping', 'simple_inspection', 'inspection'];
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

    let query = db
        .from('approval_requests')
        .select('id, flow_type, status, note, created_at, updated_at, project_number, machine_name, is_resubmit, sheet_data, approval_steps(id, step_order, approver_role, status, decided_at)')
        .eq('requester_id', currentUser.id)
        .order('created_at', { ascending: false });

    // デモ用: ロールに対応するフロー種別のみ表示
    if (devFlowTypes.length > 0) {
        query = query.in('flow_type', devFlowTypes);
    }

    const { data: rawReqs } = await query;
    // 完了済み工番は非表示（進捗一覧の「完了済み」ボタンからのみ確認可能）
    const reqs = (rawReqs || [])
        .filter(r => projectsMap[r.project_number] !== undefined && !completedProjectNums.has(r.project_number))
        .filter(r => matchesMypageFilterMode(r.project_number));

    // 自分が申請に関われるフロー種別だけをセクションとして表示する
    // （組立・試運転系と検査・会議系、出荷確定申請はそれぞれ進捗の構成が異なるため、フローごとに区分けする）
    const visibleFlowTypes = Object.keys(FLOW_LABELS)
        .filter(ft => canApplyFlow(ft) && (devFlowTypes.length === 0 || devFlowTypes.includes(ft)));

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
        const machineHtml = req.machine_name ? '<span class="mine-col-machine">' + esc(req.machine_name) + '</span>' : '';
        const packingWarningHtml = (['shipping', 'simple_inspection', 'inspection'].includes(req.flow_type)
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
        const groups = { inprogress: [], waiting: [], pending: [], approved: [] };
        list.forEach(req => {
            const unresolvedPending = (req.sheet_data?.pending_items || [])
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
        return [
            ['入力中', groups.inprogress, false],
            [isNoApprovalFlow ? '完了待ち' : '承認待ち', groups.waiting, false],
            ['ペンディング', groups.pending, true],
            [isNoApprovalFlow ? '完了' : '承認済み', groups.approved, false],
        ];
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
            ['完了', groups.approved, false],
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
        .select('id, project_number, machine_name, unit_name, assembly_items, flow_type, status, has_inspection, test_run, created_at, updated_at, confirmed_shipping_date, confirmed_shipping_date_2, packing_confirmed_shipping_date, inspection_date, inspection_time, requester_id, sheet_data, approval_steps(approver_id, status)')
        .order('updated_at', { ascending: true });

    // 2000番台：機械・ユニット単位で「申請不要」とマークされたものを取得する
    const { data: notRequiredRows } = await db.from('assembly_unit_not_required').select('project_number, machine, unit');
    const assemblyNotRequiredSet = new Set(
        (notRequiredRows || []).map(r => `${r.project_number}__${r.machine}__${r.unit || ''}`)
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
        .in('text', ['機械組立', '電気艤装', '外観検査', '試運転', '出荷確認会議', '出荷準備', '工場出荷', '梱包出荷'])
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

    // タスクから機械一覧を構築（未申請機械も含む）
    (machineTasks || []).filter(t => t.text === '機械組立').forEach(t => {
        const num = (t.project_number || '').toString().trim();
        if (!num || !t.machine) return;
        if (!projectData[num]) projectData[num] = {};
        if (!projectData[num][t.machine]) projectData[num][t.machine] = { flows: {}, units: {} };
    });

    // 申請レコードを反映。組立(assembly)は機械・ユニットが工程表と紐づかないため、machine_nameをキーにせず
    // 工番ごとの申請リストとして別管理する（assemblyReqsByProject）。他フローは従来通りmachine_nameをキーにする
    const assemblyReqsByProject = {};
    (allReqs || []).forEach(req => {
        if (req.flow_type === 'assembly') {
            const num = req.project_number;
            if (!num) return;
            if (!assemblyReqsByProject[num]) assemblyReqsByProject[num] = [];
            assemblyReqsByProject[num].push(req);
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

    progressCachedData = { baseNums, projectData, machineTaskSet, projectFlowSet, shippingApproverNameMap, taskInfoMap, projectFlowInfoMap, shippingTasksMap, assemblyReqsByProject, assemblyNotRequiredSet };

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
    const completedCb = document.getElementById('pfilter_completed');
    if (completedCb) completedCb.checked = progressFilterCompleted;
    const overdueCb = document.getElementById('pfilter_overdue');
    if (overdueCb) overdueCb.checked = progressFilterOverdue;
    const shipAfterCb = document.getElementById('pfilter_ship_after');
    if (shipAfterCb) shipAfterCb.checked = progressFilterShipAfter;
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
const ASSEMBLY_REQUIRED_ITEM_IDS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','36'];

// 組立(assembly)申請1件から機械・ユニットの配列を取り出す。
// assembly_items（新形式）が無い場合はmachine_name/unit_name（旧形式）から1件配列にフォールバックする
function getAssemblyItemsForReq(req) {
    if (Array.isArray(req.assembly_items) && req.assembly_items.length > 0) return req.assembly_items;
    if (req.machine_name) return [{ machine: req.machine_name, unit: req.unit_name || null }];
    return [];
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

    const { baseNums, projectData, machineTaskSet, projectFlowSet, shippingApproverNameMap, taskInfoMap, projectFlowInfoMap, shippingTasksMap, assemblyReqsByProject, assemblyNotRequiredSet } = progressCachedData;
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
        const mData = projectData[num][machine];
        const shipReq = mData.flows['shipping'];
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

    // 並び替え
    if (progressSort === 'shipping') {
        nums.sort((a, b) => {
            const da = getEffectiveShippingDate(a).date || '9999-12-31';
            const db2 = getEffectiveShippingDate(b).date || '9999-12-31';
            if (da < db2) return -1;
            if (da > db2) return 1;
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
    // 電装(electrical)は組立との合成をやめ独立表示にする
    const FLOW_DEFS = [
        { type: 'electrical',         label: '電装',       alwaysShow: false },
        { type: 'simple_inspection',  label: '簡易検査',   alwaysShow: false },
        { type: 'inspection',         label: '外観検査',   alwaysShow: false },
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
        if (perMachineShipDateDiffers) {
            shippingDateLabel = '';
        } else if (machines.length === 1 && hasSplitShippingInProject) {
            // 機械1台の分割出荷は右上にまとめて①②を並べて表示する（prog-card-datesが縦積みにする）
            shippingDateLabel = getShippingEntriesForMachine(num, machines[0]).filter(e => e.date).map(e => {
                const baseLabel = hasAnyPacking ? '工場出荷日' : (e.isConfirmed ? '確定出荷日' : '出荷予定日');
                const labelText = e.seq ? `${e.seq === 1 ? '①' : '②'}${baseLabel}` : baseLabel;
                return buildShipDateSpan(labelText, e.date, e.isConfirmed);
            }).join('');
        } else {
            const { date: effectiveShippingDate, isConfirmed: shippingDateConfirmed } = getEffectiveShippingDate(num);
            const baseLabel = hasAnyPacking ? '工場出荷日' : (shippingDateConfirmed ? '確定出荷日' : '出荷予定日');
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
                ? `<span class="prog-card-date${packingDateConfirmed ? ' is-confirmed' : ''}"><span class="prog-card-date-label">梱包出荷日</span> <span class="prog-card-date-value">${fmtDate(effectivePackingDate)}</span></span>`
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

        const machineRows = (machines.length > 0 ? machines : [null]).map(machine => {
            const mData = machine ? projectData[num][machine] : null;
            const tplC  = machine ? isTemplateC(num) : false;

            const applicable = machine ? FLOW_DEFS.filter(f => {
                // 2000番台工事は組立・試運転フローのみ対象（出荷系・検査系は完全に対象外）
                if (is2000sSeries(num) && f.type !== 'test_run') return false;
                if (f.alwaysShow) return true;
                if (f.type === 'electrical')        return hasTask(num, machine, '電気艤装')     || !!mData.flows['electrical'];
                if (f.type === 'test_run')          return hasTask(num, machine, '試運転')     || !!mData.flows['test_run'];
                if (f.type === 'simple_inspection') return hasProjectFlow(num, '簡易検査')     || hasTask(num, machine, '簡易検査')     || !!mData.flows['simple_inspection'];
                if (f.type === 'inspection')        return hasProjectFlow(num, '外観検査')     || hasTask(num, machine, '外観検査')     || !!mData.flows['inspection'];
                if (f.type === 'shipping_meeting')  return hasProjectFlow(num, '出荷確認会議') || hasTask(num, machine, '出荷確認会議') || !!mData.flows['shipping_meeting'];
                if (f.type === 'shipping_prep')     return hasTask(num, machine, '出荷準備')   || !!mData.flows['shipping_prep'];
                return false;
            }) : [];
            // 組立は常に先頭に表示する疑似エントリとして合成する
            const fullChain = [{ type: 'assembly', label: '組立', __isAssembly: true }, ...applicable];

            const nodes = fullChain.map((f, i) => {
                if (f.__isAssembly) {
                    // 2000番台は標準リストの機械コードが工程表のmachine名と一致するため、機械ごとの実際の申請状況を判定する。
                    // 2000番以外は機械名が自由入力で工程表と紐づかないため、工番全体で集約した状態を使う
                    const isMachineRow = machine && is2000sSeries(num);
                    const statusForThisRow = isMachineRow
                        ? computeAssemblyAggStatusForMachine(num, machine, assemblyReqsByProject, assemblyNotRequiredSet)
                        : assemblyAggStatus;
                    const { fcClass, icon } = deriveFlowVisual(statusForThisRow);
                    const isEffectivelyApproved = statusForThisRow === 'approved';
                    const canApply = canApplyFlow('assembly');
                    // can-apply（点線・ホバー時の強調）は未申請/下書きのみ。申請中・承認済みの丸には付けない
                    const canApplyNow = canApply && !progressFilterCompleted && (statusForThisRow === 'empty' || statusForThisRow === 'draft');
                    const clickable = canApplyNow ? ' clickable can-apply' : ' clickable';

                    let flowDateStr = '';
                    if (statusForThisRow === 'approved') {
                        // 関連する承認済み申請のうち最新の承認日を表示（全ユニットが不要マークのみで完了した場合は日付なし）
                        const relevantReqs = ((assemblyReqsByProject || {})[num] || []).filter(r => {
                            if (r.status !== 'approved') return false;
                            return !isMachineRow || getAssemblyItemsForReq(r).some(it => it && it.machine === machine);
                        });
                        const latestDate = relevantReqs.map(r => r.updated_at).filter(Boolean).sort().slice(-1)[0];
                        if (latestDate) flowDateStr = `完了 ${fmtDate(latestDate.slice(0, 10))}`;
                    } else if (statusForThisRow === 'draft') {
                        flowDateStr = '入力中';
                    } else if (statusForThisRow === 'active') {
                        flowDateStr = '申請中';
                    }

                    const connector = i < fullChain.length - 1
                        ? `<div class="flow-connector ${isEffectivelyApproved ? 'fc-line-done' : 'fc-line-pending'}"></div>`
                        : '';
                    const clickHandler = isMachineRow
                        ? `openAssemblyMachineDetailModal('${esc(num)}', '${esc(machine)}')`
                        : `openAssemblyFlowDetailModal('${esc(num)}')`;
                    return `<div class="flow-node${clickable}" onclick="event.stopPropagation(); ${clickHandler}"
                        data-flow-type="assembly"
                        data-num="${esc(num)}">
                        <div class="flow-circle ${fcClass}">${icon}</div>
                        <div class="flow-label">組立</div>
                        ${flowDateStr ? `<div class="flow-date">${flowDateStr}</div>` : ''}
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
                } else if (req.status === 'draft') {
                    fcClass = 'fc-draft'; icon = '✏';
                } else {
                    fcClass = 'fc-active'; icon = '<span class="fc-play-icon">▶</span>';
                }

                const canApply = canApplyFlow(f.type);

                if (!req && canApply && !progressFilterCompleted) {
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
                        flowDateStr = `開催 ${d.getMonth()+1}/${d.getDate()}`;
                    } else {
                        const dateIso = (req.status === 'approved' || req.status === 'rejected') ? req.updated_at : req.created_at;
                        if (dateIso) {
                            const d = new Date(dateIso);
                            const prefix = req.status === 'approved' ? '完了' : req.status === 'rejected' ? '却下' : '申請';
                            flowDateStr = `${prefix} ${d.getMonth()+1}/${d.getDate()}`;
                        }
                    }
                } else if (req && req.status === 'draft') {
                    flowDateStr = '入力中';
                }

                let pendingBadge = '';
                if (req && req.status !== 'draft' && (f.type === 'test_run' || QA_MEETING_FLOWS.includes(f.type))) {
                    const pItems = (req.sheet_data?.pending_items || []).filter(p => p.content || p.machine);
                    const unresolved = pItems.filter(p => !p.completed);
                    if (unresolved.length > 0) {
                        pendingBadge = `<div class="flow-pending-badge"><span class="si-badge si-orange" style="background:#8e44ad;">⚠</span>${unresolved.length}件</div>`;
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
                const baseLabel = hasAnyPacking ? '工場出荷日' : (e.isConfirmed ? '確定出荷日' : '出荷予定日');
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
    if (reqs.every(r => r.status === 'draft')) return 'draft';
    return 'active';
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
    return 'draft';
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

// ===== 組立(assembly) 詳細モーダル =====
// 丸クリック→詳細画面表示→チェックシートを入力する→機械・ユニットを入力→詳細画面に戻る→
// 申請するボタンを押す→（承認後）完了ボタン表示→押すと組立フローを完了にできる、という流れをこのモーダル内で完結させる
async function openAssemblyFlowDetailModal(projectNum) {
    document.getElementById('detail_modal').classList.add('open');
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
    document.getElementById('detail_body').innerHTML   = '<div class="loading-indicator">読み込み中...</div>';
    document.getElementById('detail_footer').innerHTML = '<button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>';
    ui.send('OPEN_DETAIL');
    currentAssemblyDetailProjectNum = null;
    currentAssemblyMachineDetail = { projectNum, machine };
    assemblyDetailReturnProjectNum = null;
    assemblyDetailReturnMachine = null;
    await renderAssemblyMachineDetailBody(projectNum, machine);
}

async function renderAssemblyFlowDetailBody(projectNum) {
    const { data: reqs } = await db.from('approval_requests')
        .select('*, approval_steps(id, step_order, approver_role, approver_id, status)')
        .eq('project_number', projectNum).eq('flow_type', 'assembly')
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

    const pInfo = projectsMap[projectNum] || {};

    // 申請者名をまとめて取得（一覧に申請者・申請日を直接表示するため）
    const requesterIds = [...new Set((reqs || []).map(r => r.requester_id).filter(Boolean))];
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
        const actionHtml = canApply
            ? `<div class="unit-list-row-actions">
                   <span class="unit-list-link" style="cursor:pointer;" onclick="startNewAssemblyPairSheetFromDetail('${esc(projectNum)}', '${esc(p.machine)}', '${esc(p.unit || '')}')">申請する →</span>
               </div>`
            : '';
        return `<div class="unit-list-row">
            <div class="unit-list-row-main">
                <div class="unit-list-name">${esc(label)}</div>
                <div class="unit-list-status"><span class="status-badge s-gray">未申請</span></div>
            </div>
            ${actionHtml}
        </div>`;
    }).join('');

    const existingRowsHtml = groups.length === 0
        ? ''
        : groups.map(g => {
            const cls = STATUS_CLASSES[g.req.status] || 's-gray';
            const label = g.req.status === 'draft' ? '下書き' : statusBadgeLabel(g.req);
            const machineLabel = g.items.length > 0
                ? g.items.map(it => (it.unit && it.unit !== '-') ? `${it.machine}${it.unit}` : it.machine).join('、')
                : '（機械未入力）';
            const isOwnDraft = g.req.status === 'draft' && g.req.requester_id === currentUser.id;

            if (isOwnDraft) {
                const submitBtn = g.items.length > 0
                    ? `<button class="btn-apply-xs" onclick="submitAssemblyDraftFromDetail('${g.req.id}', '${esc(projectNum)}')">申請する</button>`
                    : '';
                return `<div class="unit-list-row">
                    <div class="unit-list-row-main">
                        <div class="unit-list-name">${esc(machineLabel)}</div>
                        <div class="unit-list-status"><span class="status-badge ${cls}">${esc(label)}</span></div>
                    </div>
                    <div class="unit-list-row-actions" style="justify-content:space-between;">
                        <span class="unit-list-link" style="cursor:pointer;" onclick="reopenAssemblySheetFromDetail('${g.req.id}')">続きを入力する →</span>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <button class="btn-danger-xs" onclick="deleteAssemblyDraftFromDetail('${g.req.id}', '${esc(projectNum)}')">削除する</button>
                            ${submitBtn}
                        </div>
                    </div>
                </div>`;
            }

            // 申請者・申請日を一覧に直接表示する（個別詳細画面を経由させないため）
            const requesterName = requesterNames[g.req.requester_id] || '—';
            const submittedDate = g.req.created_at ? fmtDate(g.req.created_at) : '—';

            // チェックシート/完了報告書へのリンク（承認済みなら報告書、却下されて自分の申請なら編集可能）
            const isApproved = g.req.status === 'approved';
            const canEditRejected = g.req.status === 'rejected' && g.req.requester_id === currentUser.id;
            const sheetUrl = canEditRejected ? `${meta.file}?draft_id=${g.req.id}` : `${meta.file}?view=1&id=${g.req.id}`;
            const sheetLinkLabel = isApproved ? '完了報告書を見る →' : (canEditRejected ? 'チェックシートを修正する →' : 'チェックシートを見る →');

            // 自分が承認できる保留中ステップがあれば、その場で承認・却下できるようにする
            // （却下は頻度が低いため理由入力欄は常時表示せず、却下ボタンを押した時だけ別モーダルで入力させる）
            const myStep = (g.req.approval_steps || []).find(s =>
                s.approver_role === myRole && s.status === 'pending' && g.req.status === 'submitted');

            const approvalHtml = myStep ? `
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                    <button class="btn btn-danger"  style="font-size:13px;padding:5px 14px;" onclick="showAssemblyRejectPrompt('${g.req.id}', '${myStep.id}', '${esc(projectNum)}')">却下する</button>
                    <button class="btn btn-success" style="font-size:13px;padding:5px 14px;" onclick="approveAssemblyRequestFromList('${g.req.id}', '${myStep.id}', ${myStep.step_order}, '${esc(projectNum)}', '${esc(machineLabel)}')">承認する</button>
                </div>` : '';

            return `<div class="unit-list-row">
                <div class="unit-list-row-main">
                    <div class="unit-list-name">${esc(machineLabel)}</div>
                    <div class="unit-list-status"><span class="status-badge ${cls}">${esc(label)}</span></div>
                </div>
                <div class="unit-list-meta">申請者: ${esc(requesterName)}　申請日: ${esc(submittedDate)}</div>
                <div class="unit-list-link" style="cursor:pointer;" onclick="window.open('${sheetUrl}', '_blank')">${sheetLinkLabel}</div>
                ${approvalHtml}
            </div>`;
        }).join('');

    const rowsHtml = unappliedRowsHtml + existingRowsHtml || '<div style="padding:8px 0;color:#999;font-size:14px;">組立の申請はまだありません</div>';

    // 同じ工番に複数の下書きを同時に持てるため、「一覧にない機械・ユニットを申請する」ボタンは常に表示する
    const actionHtml = canApply
        ? `<button class="btn-add-new" onclick="startNewAssemblySheetFromDetail('${esc(projectNum)}')">＋ 一覧にない機械・ユニットを申請する</button>`
        : '';

    document.getElementById('detail_title').textContent = '組立フロー';
    document.getElementById('detail_body').innerHTML = `
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f;">${esc(projectNum)}　${esc(pInfo.customer_name || '')}</div>
        ${pInfo.project_details ? `<div style="font-size:15px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        <hr class="section-divider">
        <div class="section-title">機械・ユニット別 申請状況</div>
        <div class="unit-list-wrap">${rowsHtml}</div>
        ${actionHtml}
    `;
    document.getElementById('detail_footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
    `;
}

// presetItemsを指定すると新規下書きにその機械・ユニットを事前セットする（2000番台の機械詳細モーダルから使用）。
// machineを指定すると、完了後に工番レベルではなく機械レベルの詳細モーダルを再描画する
async function startNewAssemblySheetFromDetail(projectNum, presetItems = null, machine = null) {
    // 同じ工番・同じ申請者でも、複数の下書きを同時に保持できる（機械・ユニットをまとめて申請したい場合と、
    // 別々に分けて申請したい場合の両方に対応するため、押すたびに新しい下書きを作成する）
    const insertPayload = {
        project_number: projectNum,
        flow_type:      'assembly',
        status:         'draft',
        requester_id:   currentUser.id
    };
    if (presetItems) insertPayload.assembly_items = presetItems;
    const { data: newDraft, error } = await db.from('approval_requests').insert(insertPayload).select().single();
    if (error) { showToast('下書きの作成に失敗しました: ' + error.message, 'error'); return; }
    const draftId = newDraft.id;
    window.open(`sheet.html?draft_id=${draftId}`, '_blank');
    await loadMineSide();
    if (machine) await renderAssemblyMachineDetailBody(projectNum, machine);
    else await renderAssemblyFlowDetailBody(projectNum);
}

// 2000番台：機械詳細モーダルの「申請する →」（未申請ユニット用）の薄いラッパー
async function startNewAssemblyUnitSheetFromDetail(projectNum, machine, unit) {
    await startNewAssemblySheetFromDetail(projectNum, [{ machine, unit: unit || null }], machine);
}

// 工番レベルの一覧（2000番以外）で、工程表由来の未申請の機械・ユニットから直接申請を開始する薄いラッパー
async function startNewAssemblyPairSheetFromDetail(projectNum, machine, unit) {
    await startNewAssemblySheetFromDetail(projectNum, [{ machine, unit: unit || null }]);
}

function reopenAssemblySheetFromDetail(requestId) {
    window.open(`sheet.html?draft_id=${requestId}`, '_blank');
}

async function viewAssemblyRequestDetail(requestId, projectNum, machine = null) {
    // 「閉じる」を押したら組立フロー詳細（工番レベル or 機械レベル）に戻れるようにする
    currentAssemblyDetailProjectNum = null;
    currentAssemblyMachineDetail = null;
    if (machine) {
        assemblyDetailReturnMachine = { projectNum, machine };
        assemblyDetailReturnProjectNum = null;
    } else {
        assemblyDetailReturnProjectNum = projectNum;
        assemblyDetailReturnMachine = null;
    }
    await openDetailModal(requestId);
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

// ===== 2000番台：機械ごとのユニット申請状況一覧 =====
async function renderAssemblyMachineDetailBody(projectNum, machine) {
    const { data: reqs } = await db.from('approval_requests')
        .select('*')
        .eq('project_number', projectNum).eq('flow_type', 'assembly')
        .order('created_at', { ascending: true });

    const { data: notReqRows } = await db.from('assembly_unit_not_required')
        .select('unit').eq('project_number', projectNum).eq('machine', machine);
    const notRequiredUnits = new Set((notReqRows || []).map(r => r.unit || ''));
    const notRequiredSet = new Set([...notRequiredUnits].map(u => `${projectNum}__${machine}__${u}`));

    const units = getAssemblyUnitListForMachine(machine, reqs || []);
    const pInfo = projectsMap[projectNum] || {};
    const canApply = canApplyFlow('assembly');

    const rowsHtml = units.length === 0
        ? '<div style="padding:8px 0;color:#999;font-size:14px;">ユニットがありません</div>'
        : units.map(unit => {
            const status = computeAssemblyUnitStatus(projectNum, machine, unit, reqs || [], notRequiredSet);
            const unitLabel = unit ? unit : '（ユニット区分なし）';
            const isNotRequired = notRequiredUnits.has(unit || '');

            const matching = (reqs || []).filter(req =>
                getAssemblyItemsForReq(req).some(it => it && it.machine === machine && (it.unit || '') === (unit || '')));
            const myDraft = matching.find(r => r.status === 'draft' && r.requester_id === currentUser.id);
            const otherReq = matching.find(r => r.status !== 'draft') || matching.find(r => r.status === 'draft');

            let statusLabel, statusCls;
            if (isNotRequired)        { statusLabel = '不要';   statusCls = 's-gray'; }
            else if (!otherReq)       { statusLabel = '未申請'; statusCls = 's-gray'; }
            else if (otherReq.status === 'draft') { statusLabel = '下書き'; statusCls = 's-gray'; }
            else { statusLabel = statusBadgeLabel(otherReq); statusCls = STATUS_CLASSES[otherReq.status] || 's-gray'; }

            let actionsHtml = '';
            if (myDraft) {
                const hasItem = getAssemblyItemsForReq(myDraft).some(it => it && it.machine === machine && (it.unit || '') === (unit || ''));
                actionsHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="reopenAssemblySheetFromDetail('${myDraft.id}')">続きを入力する →</span>` +
                    (hasItem ? ` <button class="btn-apply-xs" onclick="submitAssemblyDraftFromDetail('${myDraft.id}', '${esc(projectNum)}', '${esc(machine)}')">申請する</button>` : '');
            } else if (otherReq) {
                actionsHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="viewAssemblyRequestDetail('${otherReq.id}', '${esc(projectNum)}', '${esc(machine)}')">詳細を見る →</span>`;
            } else if (canApply) {
                actionsHtml = `<span class="unit-list-link" style="cursor:pointer;" onclick="startNewAssemblyUnitSheetFromDetail('${esc(projectNum)}', '${esc(machine)}', '${esc(unit)}')">申請する →</span>`;
            }

            let notReqBtn = '';
            if (canApply && !(otherReq && otherReq.status === 'approved')) {
                notReqBtn = isNotRequired
                    ? `<button class="btn-danger-xs" onclick="unmarkAssemblyUnitNotRequired('${esc(projectNum)}', '${esc(machine)}', '${esc(unit)}')">不要を取り消す</button>`
                    : `<button class="btn-danger-xs" onclick="markAssemblyUnitNotRequired('${esc(projectNum)}', '${esc(machine)}', '${esc(unit)}')">不要にする</button>`;
            }

            return `<div class="unit-list-row">
                <div class="unit-list-row-main">
                    <div class="unit-list-name">${esc(unitLabel)}</div>
                    <div class="unit-list-status"><span class="status-badge ${statusCls}">${esc(statusLabel)}</span></div>
                </div>
                <div class="unit-list-row-actions">
                    ${actionsHtml}
                    ${notReqBtn}
                </div>
            </div>`;
        }).join('');

    document.getElementById('detail_title').textContent = `組立フロー（${esc(machine)}）`;
    document.getElementById('detail_body').innerHTML = `
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f;">${esc(projectNum)}【${esc(machine)}】　${esc(pInfo.customer_name || '')}</div>
        ${pInfo.project_details ? `<div style="font-size:15px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        <hr class="section-divider">
        <div class="section-title">ユニット別 申請状況</div>
        <div class="unit-list-wrap">${rowsHtml}</div>
    `;
    document.getElementById('detail_footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
    `;
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

// 工番レベルの組立フロー一覧から直接承認する（既存の承認処理openDetailModal→approveStepとは別に、
// モーダルを閉じずに一覧を再描画する専用版。組立は常に並列承認＝どちらかが承認すれば即完了）
async function approveAssemblyRequestFromList(requestId, stepId, stepOrder, projectNum, machineLabel) {
    if (requireLogin()) return;
    if (!confirm(`${machineLabel}を承認します。よろしいですか？`)) return;

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
        await renderAssemblyFlowDetailBody(projectNum);
    } catch (e) {
        showToast('承認処理に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 却下ボタンを押した時だけ、理由入力欄を別モーダルで表示する（却下は頻度が低いため一覧には常設しない）
function showAssemblyRejectPrompt(requestId, stepId, projectNum) {
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
                <button class="btn btn-danger" onclick="confirmAssemblyReject('${requestId}', '${stepId}', '${esc(projectNum)}')">却下する</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

async function confirmAssemblyReject(requestId, stepId, projectNum) {
    const reason = (document.getElementById('assembly_reject_reason')?.value || '').trim();
    if (!reason) { showToast('却下する場合は理由を入力してください。', 'error'); return; }
    document.getElementById('assembly_reject_prompt')?.remove();
    await rejectAssemblyRequestFromList(requestId, stepId, projectNum, reason);
}

async function rejectAssemblyRequestFromList(requestId, stepId, projectNum, comment) {
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
        await renderAssemblyFlowDetailBody(projectNum);
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
                    if (item.ship_after && !item.completed && (item.content || item.machine)) {
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
        // 電装・試運転はステップ表示で機械が確定しているため、申請画面内では選び直せないようにロックする
        const isMachineLocked = flowType === 'electrical' || flowType === 'test_run';
        await onProjectChange(isMachineLocked ? machineName : null);
        if (isMachineLocked) {
            await onMachineChange();
        } else {
            const cb = findCb('submit_machine_list');
            if (cb) { cb.checked = true; await onMachineChange(); }
        }
    } else if (flowType === 'simple_inspection') {
        openSimpleInspectionModal();
        currentSiProjectNum = projectNum;
        const pSi = projectsMap[projectNum] || {};
        const lblSi = [pSi.customer_name, pSi.project_details].filter(Boolean).join('　');
        document.getElementById('si_project_display').textContent = projectNum;
        await onSiProjectChange();
        const cb = findCb('si_machine_list');
        if (cb) { cb.checked = true; await onSiMachineChange(); }
    } else if (flowType === 'inspection') {
        openInspectionModal();
        currentInspectionProjectNum = projectNum;
        const pIn = projectsMap[projectNum] || {};
        const lblIn = [pIn.customer_name, pIn.project_details].filter(Boolean).join('　');
        document.getElementById('inspection_project_display').textContent = projectNum;
        await onInspectionProjectChange();
        const cb = findCb('inspection_machine_list');
        if (cb) { cb.checked = true; await onInspectionMachineChange(); }
    } else if (flowType === 'shipping_meeting') {
        openShippingMeetingModal();
        currentSmProjectNum = projectNum;
        const pSm = projectsMap[projectNum] || {};
        const lblSm = [pSm.customer_name, pSm.project_details].filter(Boolean).join('　');
        document.getElementById('sm_project_display').textContent = projectNum;
        await onSmProjectChange();
        const cb = findCb('sm_machine_list');
        if (cb) { cb.checked = true; await onSmMachineChange(); }
    } else if (flowType === 'shipping') {
        openShippingModal();
        currentShippingProjectNum = projectNum;
        const pSh = projectsMap[projectNum] || {};
        const lblSh = [pSh.customer_name, pSh.project_details].filter(Boolean).join('　');
        document.getElementById('shipping_project_display').textContent = projectNum;
        await onShippingProjectChange();
        const cb = findCb('shipping_machine_list');
        if (cb) { cb.checked = true; await onShippingMachineChange(); }
    }
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
let currentSmProjectNum = '';
let currentShippingProjectNum = '';
let selectedApproverRole = 'assembly_manager';
let sheetChecks = {};
let pendingItems = [];
let currentDraftId = null;
let currentUnitName = null; // 2000番台：ユニット単位申請時の選択中ユニット名（null=ユニット区分なし）
let sheetAutoSaveTimer = null;
let currentAssemblyDetailProjectNum = null; // 組立フロー詳細モーダル(工番レベル)で開いている工番（sheet.html完了通知の再描画に使う）
let currentAssemblyMachineDetail = null; // 組立フロー詳細モーダル(機械レベル、2000番台)で開いている{projectNum, machine}
let assemblyDetailReturnProjectNum = null; // 個別申請の詳細画面(openDetailModal)を工番レベル組立フロー詳細から開いた場合の戻り先工番
let assemblyDetailReturnMachine = null; // 個別申請の詳細画面(openDetailModal)を機械レベル組立フロー詳細から開いた場合の戻り先{projectNum, machine}

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
    const machineNums = isAssembly ? [] : getSelectedMachines('submit_machine_list');
    if (!projectNum)                       { showToast('工事番号を選択してください', 'error'); return; }
    if (!isAssembly && machineNums.length === 0) { showToast('機械を選択してください', 'error'); return; }
    const needsSheetFlow = !!SHEET_FLOW_META[currentFlowType];
    if (!needsSheetFlow) { submitRequest(); return; }
    if (!isAssembly && machineNums.length > 1) {
        showToast('報告書は1台ずつ申請してください', 'error');
        return;
    }

    showLoading('下書きを保存中...');
    try {
        const note = document.getElementById('submit_note').value.trim();

        let existing;
        if (isAssembly) {
            // 組立は機械・ユニットを工程表と紐づけないため、工番・申請者単位で下書きを一意に扱う
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

        if (draft.flow_type === 'assembly') {
            // 組立は機械・ユニットを工程表と紐づけないため、機械選択欄は出さない（チェックシート側で入力済み）
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

        // 組立フロー詳細モーダル（機械レベル or 工番レベル）が開いていれば、そちらを再描画する（申請する/修正するボタンの表示を更新）
        // sheet_suspend（一時保存）でも再描画しないと、入力済みの機械・ユニットが「未入力」のまま古く表示され続ける
        const detailModal = document.getElementById('detail_modal');
        if (detailModal.classList.contains('open') && (currentAssemblyDetailProjectNum || currentAssemblyMachineDetail)) {
            if (currentAssemblyMachineDetail) {
                await renderAssemblyMachineDetailBody(currentAssemblyMachineDetail.projectNum, currentAssemblyMachineDetail.machine);
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
            // 組立(assembly)は詳細モーダル経由のフローのため、モーダルが閉じている間は自動で開かない
            const { data: draft } = await db.from('approval_requests').select('flow_type').eq('id', draftId).single();
            if (draft?.flow_type === 'assembly') {
                showToast('チェックシートの入力を保存しました。進捗一覧の組立フローから内容を確認してください。', 'success');
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
    const machineNums = isAssembly ? [] : getSelectedMachines('submit_machine_list');
    if (!projectNum)          { showToast('工事番号が設定されていません', 'error'); return; }
    if (currentFlowType === 'shipping_prep') {
        const blockerLists = await Promise.all(machineNums.map(m => _getPrepBlockers(projectNum, m)));
        if (blockerLists.some(list => list.length > 0)) {
            showToast('前フローが未完了のため申請できません', 'error');
            return;
        }
    }
    if (!isAssembly && machineNums.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (isAssembly && !currentDraftId) { showToast('チェックシートで機械・ユニットを入力してください', 'error'); return; }
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
        } else {
            // 機械ごとに申請レコードを作成（複数機械対応。assembly以外は現状通り機械単位）
            for (const machineNum of machineNums) {
                // 機械ごとにタスクフラグを取得
                const { data: mTasks } = await db.from('tasks')
                    .select('text').eq('project_number', projectNum).eq('machine', machineNum);
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
    // 組立・試運転フローの担当部署の上司（組立課長・部長／操業課長・部長）も完了操作できる
    const isFlowSupervisor = (FLOW_SUPERVISOR_ROLES[req.flow_type] || []).includes(getEffectiveRole());
    // 組立・試運転フローは担当部署（組立部／操業部）の部員なら誰でも完了操作できる
    const isFlowDeptMember = getEffectiveDept() === FLOW_DEPARTMENTS[req.flow_type];
    // 組立・試運転フローは「申請者本人」「品証・製管」「担当部署の課長・部長」「担当部署の部員全員」が完了操作できる（担当者本人は下記itemCanComplete参照）
    const statusOkForNonQa = ['submitted', 'in_review', 'approved'].includes(req.status);
    const canComplete = isQaFlow
        ? null // QAフローは項目ごとに判定する（下記itemCanComplete）
        : (statusOkForNonQa && (isMyRequest || isQualityOrSeikan || isFlowSupervisor || isFlowDeptMember));
    // ペンディング項目は品証・製管であれば編集・削除できる（組立フローは提出〜承認済みの間、QAフローは開催案内送信済み〜完了後も可能）
    const canManage = isQualityOrSeikan && (isQaFlow ? ['submitted', 'approved'].includes(req.status) : statusOkForNonQa);
    const allItems = req.sheet_data?.pending_items || [];
    const items = allItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => (item.content || item.machine));
    if (!items.length) return '';
    const editLbl = `<span style="display:block;font-size:11px;line-height:1.4;color:#999;">完了予定日</span>`;
    return `
        <hr class="section-divider">
        <div class="section-title">${isQaFlow ? 'タスクリスト' : 'ペンディング項目'}</div>
        ${items.map(({ item, idx }, pos) => {
            // QAフロー・組立フローともに「品証」または「担当者本人（項目に担当者が設定されている場合）」も完了操作できる
            // QAフローのタスクリストはさらに、担当者の上長（組立課長/部長・操業課長/部長）も完了操作できる
            const itemCanComplete = isQaFlow
                ? (['submitted', 'approved'].includes(req.status) && (isQualityOrSeikan || (item.owner && currentProfile?.name === item.owner) || isSupervisorOfOwner(item.owner)))
                : (canComplete || (statusOkForNonQa && item.owner && currentProfile?.name === item.owner));
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
                        <div style="display:flex;flex-direction:column;flex-shrink:0;">
                            ${editLbl}
                            <input type="date" id="qa_edit_due_${idx}" class="pending-due" value="${esc(item.due || '')}">
                        </div>
                        <label style="display:flex;flex-direction:column;flex-shrink:0;gap:4px;">
                            <span style="display:block;font-size:14px;line-height:1.4;color:#999;">出荷後対応</span>
                            <input type="checkbox" id="qa_edit_ship_after_${idx}" ${item.ship_after ? 'checked' : ''} style="margin-top:2px;">
                        </label>
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
            <div class="pending-detail-row ${item.completed ? 'pending-done' : ''}">
                <div class="pending-detail-num">${circledNum(pos + 1)}</div>
                ${item.photo_path
                    ? `<img src="${esc(pendingPhotoUrl(item.photo_path))}" class="pending-detail-photo-thumb" title="クリックで拡大表示" onclick="openPhotoLightbox('${esc(pendingPhotoUrl(item.photo_path))}')">`
                    : `<div class="pending-detail-photo-placeholder"></div>`}
                <div class="pending-detail-content">
                    <div class="pending-detail-text">${item.machine ? `<span class="pending-detail-machine">${esc(item.machine)}</span> ` : ''}${esc(item.content || '—')}${item.completed ? ' <span style="font-size:12px;color:#1c8f4d;background:#eafaf0;border-radius:4px;padding:1px 6px;">完了</span>' : (pendingDueSoon(item.due) ? ' <span style="font-size:12px;color:#c0392b;background:#fde8e8;border-radius:4px;padding:1px 6px;">期日間近</span>' : '')}${item.ship_after ? ' <span class="badge-ship-after" style="font-size:12px;color:#a06a00;background:#fff3d6;border-radius:4px;padding:1px 6px;">出荷後対応</span>' : ''}</div>
                    ${item.location ? `<div class="pending-detail-owner">場所: ${esc(item.location)}</div>` : ''}
                    ${item.owner ? `<div class="pending-detail-owner">担当: ${esc(item.owner)}</div>` : ''}
                    ${item.due && !item.completed ? `<div class="pending-detail-due">期日: ${esc(item.due)}</div>` : ''}
                    ${item.completed ? `<div class="pending-detail-date">完了: ${esc(item.completed_date || '')}</div>` : ''}
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
async function openDetailModal(requestId) {
    document.getElementById('detail_modal').classList.add('open');
    document.getElementById('detail_body').innerHTML   = '<div class="loading-indicator">読み込み中...</div>';
    document.getElementById('detail_footer').innerHTML = '<button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>';
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
    if (req.flow_type === 'shipping') {
        const [{ data: factoryTasks }, { data: packingTasks }] = await Promise.all([
            req.machine_name
                ? db.from('tasks').select('end_date').eq('project_number', pNum).eq('machine', req.machine_name).eq('text', '工場出荷').order('end_date', { ascending: true })
                : Promise.resolve({ data: [] }),
            db.from('tasks').select('start_date, end_date').eq('project_number', pNum).eq('text', '梱包出荷').limit(1)
        ]);
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
        s.approver_role === getEffectiveRole() &&
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
    const isSales = getEffectiveRole() === 'staff' && getEffectiveDept() === '営業';
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

    // プロフィール名を取得
    const approverIds = steps.filter(s => s.approver_id).map(s => s.approver_id);
    let approverNames = {};
    if (approverIds.length > 0) {
        const { data: prs } = await db.from('profiles').select('id, name').in('id', approverIds);
        if (prs) prs.forEach(p => { approverNames[p.id] = p.name; });
    }

    // shipping: 担当者確認セクション用にtasksを取得
    let shippingOwners = null;
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
            .map(t => t.owner).filter(Boolean))].join('・') || 'なし';
        shippingOwners = {
            sekkei:   findO('出図', '設計'),
            kumitatе: findO('機械組立'),
            shiunten: findO('試運転'),
            sales:    salesOwner || 'なし'
        };
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
        const sentStep = `
        <div class="step-item">
            <div class="step-circle sc-submitted">✉</div>
            <div class="step-detail">
                <div class="step-label">開催案内送信済み</div>
                <div class="step-name">${esc(requesterName)}</div>
                <div class="step-date">${fmtDate(req.created_at)}</div>
            </div>
        </div>`;
        let resultStep;
        if (req.status === 'approved') {
            resultStep = `
        <div class="step-item">
            <div class="step-circle sc-approved">✓</div>
            <div class="step-detail">
                <div class="step-label">開催済み</div>
                <div class="step-date">${fmtDate(req.updated_at)}</div>
            </div>
        </div>`;
        } else if (req.status === 'cancelled') {
            resultStep = `
        <div class="step-item">
            <div class="step-circle sc-rejected"><span class="fc-x-icon">×</span></div>
            <div class="step-detail">
                <div class="step-label">キャンセル</div>
            </div>
        </div>`;
        } else {
            resultStep = `
        <div class="step-item">
            <div class="step-circle sc-waiting">○</div>
            <div class="step-detail">
                <div class="step-label">開催待ち</div>
            </div>
        </div>`;
        }
        stepsHtml = sentStep + resultStep;
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
        ${req.note ? `<div style="font-size:15px;color:#888;margin-top:2px;">備考: ${esc(req.note)}</div>` : ''}
        ${shippingDateMismatches.length ? `
        <div style="background:#fdecea;border:1px solid #f5b5ac;border-radius:4px;padding:9px 12px;font-size:15px;color:#a33a2c;margin-top:8px;">
            <div style="white-space:nowrap;overflow-x:auto;">⚠ 工程表の出荷日とズレがあります（${shippingDateMismatches.join('、')}）。</div>
            ${changeDateBannerButtonHtml ? `<div style="margin-top:8px;">${changeDateBannerButtonHtml}</div>` : ''}
        </div>` : ''}
        ${statusNote ? `<div style="background:#fff8e6; border:1px solid #f0d98c; border-radius:4px; padding:9px 12px; font-size:15px; color:#7a5c00; margin-top:8px;">${esc(statusNote)}</div>` : ''}

        <hr class="section-divider">
        <div class="section-title">申請・承認状況</div>
        <div class="steps-list">${QA_MEETING_FLOWS.includes(req.flow_type) ? '' : appliedStepHtml}${stepsHtml}</div>
        ${req.flow_type === 'shipping' ? `
        <hr class="section-divider">
        <div>
            <div style="font-size:15px; color:#888; font-weight:bold; margin-bottom:6px;">担当者確認（参考）</div>
            <div style="font-size:16px; line-height:2; background:#f8f9fa; border-radius:4px; padding:8px 12px;">
                <div><span style="color:#888; font-size:14px; width:36px; display:inline-block;">設計</span>${esc(shippingOwners?.sekkei || 'なし')}</div>
                <div><span style="color:#888; font-size:14px; width:36px; display:inline-block;">組立</span>${esc(shippingOwners?.kumitatе || 'なし')}</div>
                <div><span style="color:#888; font-size:14px; width:36px; display:inline-block;">操業</span>${esc(shippingOwners?.shiunten || 'なし')}</div>
                <div><span style="color:#888; font-size:14px; width:36px; display:inline-block;">営業</span>${esc(shippingOwners?.sales || 'なし')}</div>
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
            <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
            <button class="btn btn-danger"    onclick="rejectStep('${req.id}','${myStep.id}')">却下する</button>
            <button class="btn btn-success"   onclick="approveStep('${req.id}','${myStep.id}',${myStep.step_order})">承認する</button>
        `;
    } else if (isMyRequest && req.status === 'rejected') {
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
            <button class="btn btn-primary"   onclick="resubmit('${req.id}')">再申請する</button>
        `;
    } else if (req.flow_type === 'shipping' && req.status === 'awaiting_shipping_date' && (isSales || isQualityOrSeikan)) {
        footer.innerHTML = buildSalesDateFooterInner(req, hasPackingShipping, packingState);
    } else if (req.flow_type === 'shipping' && req.status === 'awaiting_shipping_confirm' && (isMyRequest || isQualityOrSeikan)) {
        footer.innerHTML = `
            ${changeDateFooterLinkHtml}
            <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
            <button class="btn btn-success"   onclick="confirmAndSubmitShipping('${req.id}')">内容を確認し申請する</button>
        `;
    } else if (canReschedule) {
        footer.innerHTML = buildQaFooterInner(req);
    } else if (changeDateFooterLinkHtml) {
        footer.innerHTML = `
            ${changeDateFooterLinkHtml}
            <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
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
        <button class="btn btn-primary"   onclick="openRescheduleModal('${req.id}')">日程変更</button>
        <button class="btn btn-danger"    onclick="cancelMeeting('${req.id}', '${req.flow_type}')">キャンセル</button>
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
    `;
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
    document.getElementById('detail_modal').classList.remove('open');
    document.querySelector('#detail_modal .modal').classList.remove('unit-list-mode');
    currentAssemblyDetailProjectNum = null;
    currentAssemblyMachineDetail = null;
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
            .select('sheet_data').eq('id', requestId).single();
        const items = req?.sheet_data?.pending_items || [];
        if (!items[idx]) return;
        const prevOwner   = items[idx].owner || '';
        const prevContent = items[idx].content;
        const newOwner    = ownerEl ? ownerEl.value.trim() : prevOwner;
        const shipAfter   = shipAfterEl ? shipAfterEl.checked : !!items[idx].ship_after;

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
        await db.from('approval_requests')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', requestId);

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

function openRescheduleModal(requestId) {
    const req = currentDetailReq;
    if (!req || req.id !== requestId) return;

    rescheduleModalReqId = requestId;
    document.getElementById('reschedule_modal_title').textContent =
        `日程変更－${QA_DETAIL_TITLE_LABELS[req.flow_type] || ''}`;
    document.getElementById('reschedule_date_input').value = req.inspection_date || '';
    document.getElementById('reschedule_time_hour').value  = req.inspection_time ? req.inspection_time.split(':')[0] : '';
    document.getElementById('reschedule_time_min').value   = req.inspection_time ? req.inspection_time.split(':')[1] : '';

    const btn = document.getElementById('btn_save_reschedule');
    btn.disabled = false; btn.textContent = '保存して通知';

    document.getElementById('reschedule_modal').classList.add('open');
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

    const btn = document.getElementById('btn_save_reschedule');
    btn.disabled = true; btn.textContent = '保存中...';
    showLoading('処理中...');

    try {
        await db.from('approval_requests').update({
            inspection_date: newDate,
            inspection_time: newTime,
            updated_at:      new Date().toISOString()
        }).eq('id', requestId);

        // 元の送信済み通知の宛先に変更通知を再送
        const { data: existingNotifs } = await db.from('approval_notifications')
            .select('recipient_id, recipient_email')
            .eq('request_id', requestId)
            .not('emailed_at', 'is', null);

        const rescheduleType = currentDetailFlowType === 'shipping_meeting'
            ? 'shipping_meeting_reschedule'
            : currentDetailFlowType === 'inspection'
            ? 'inspection_reschedule'
            : 'simple_inspection_reschedule';

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
                        notification_type: rescheduleType
                    });
                }
            }
            if (notifs.length > 0) await db.from('approval_notifications').insert(notifs);
        }

        closeRescheduleModal();
        closeDetailModal();
        await refreshAll();
        showToast('日程を変更しました。関係者に変更通知を送ります。', 'success');
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
// 本番運用開始まではOFF。運用開始の合図があったら true に切り替える。
const FLOW_TASK_SYNC_ENABLED = false;
const FLOW_APPROVAL_TASK_TEXT = { assembly: '機械組立', test_run: '試運転', shipping: '工場出荷' };

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

// ===== Approve =====
async function approveStep(requestId, stepId, stepOrder) {
    if (requireLogin()) return;
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
    } finally {
        hideLoading();
    }
}

// ===== Reject =====
async function rejectStep(requestId, stepId) {
    if (requireLogin()) return;
    const comment = (document.getElementById('approval_comment')?.value || '').trim();
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
        if (label) label.textContent = '機械名 *';
        list.innerHTML = `
            <label>
                <input type="checkbox" value="${esc(lockedMachine)}" checked disabled style="display:none">
                <span class="machine-locked-name">${esc(lockedMachine)}</span>
            </label>`;
        return;
    }

    if (toggleBtn) toggleBtn.style.display = '';
    if (label) label.textContent = '機械名 *（複数選択可）';

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

// 工程表の実タスク（sort_order）から、その機械に該当する中間フロー（簡易検査・外観検査・試運転・出荷確認会議）を
// 実際の工程順で返す（簡易検査と外観検査は排他、試運転・出荷確認会議は無い場合がある）
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

// 出荷確定申請の前提として完了しているべきフロー一覧（機械ごとの動的判定、工程順を保持）
async function _getRequiredFlows(projectNum, machine) {
    const chain = await _getMachineFlowChain(projectNum, machine);
    return new Set(chain.filter(t => t !== 'shipping'));
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
        const req = (reqs || []).find(r => r.flow_type === flowType);
        const items = (req?.sheet_data?.pending_items || [])
            .filter(p => (p.content || p.machine) && !p.completed && !p.ship_after);
        if (items.length > 0) blockers.push({ flowType, count: items.length });
    }
    return blockers;
}

// ===== 宛先確認ステップ（開催案内共通） =====
const extraRecipients = { inspection: [], sm: [], si: [] };

async function showRecipientsStep(type) {
    const prefix = type; // 'inspection' | 'sm' | 'si'
    const projectNumMap = { si: currentSiProjectNum, inspection: currentInspectionProjectNum, sm: currentSmProjectNum };
    const projectNum = projectNumMap[prefix];
    const machines   = getSelectedMachines(`${prefix}_machine_list`);
    const dateVal    = document.getElementById(`${prefix}_date_input`).value;

    if (!projectNum)          { showToast('工事番号を選択してください', 'error'); return; }
    if (machines.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (!dateVal)             { showToast('開催日を入力してください', 'error'); return; }

    const flowTypeMap = { inspection: 'inspection', sm: 'shipping_meeting', si: 'simple_inspection' };
    const recipients = await _fetchFlowRecipients(projectNum, machines, flowTypeMap[prefix] || prefix);
    renderRecipientsList(prefix, recipients);

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
        return [...new Set(matched.map(t => t.owner).filter(Boolean))];
    };

    const kumitateOwners = findOwners('機械組立');
    const shiuntenOwners = findOwners('試運転');
    const sekkeiOwners   = findOwners('出図', '設計');
    const denkiOwners    = findOwners('電気艤装');

    // 試運転・出図が見つからない場合は工番全体から再検索
    const shiuntenOwnersFallback = shiuntenOwners.length > 0 ? shiuntenOwners :
        ((await db.from('tasks').select('owner').eq('project_number', projectNum).eq('text', '試運転').not('owner', 'is', null)).data || []).map(t => t.owner).filter(Boolean);
    const sekkeiOwnersFallback = sekkeiOwners.length > 0 ? sekkeiOwners :
        ((await db.from('tasks').select('owner').eq('project_number', projectNum).eq('text', '出図').not('owner', 'is', null)).data || []).map(t => t.owner).filter(Boolean);

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
    // members テーブルから設計担当者の上長を取得（プレビュー用）
    // 担当者不明・未登録の場合は設計全管理職にフォールバック
    const addSekkeiSupervisors = async () => {
        let resolved = false;
        if (sekkeiOwnersFallback.length > 0) {
            const { data: memberRows } = await db.from('members')
                .select('supervisor_email1, supervisor_email_2')
                .in('name', sekkeiOwnersFallback);
            const supEmails = [];
            for (const m of (memberRows || [])) {
                if (m.supervisor_email1)  supEmails.push(m.supervisor_email1);
                if (m.supervisor_email_2) supEmails.push(m.supervisor_email_2);
            }
            if (supEmails.length > 0) {
                resolved = true;
                const { data: supRecips } = await db.from('notification_recipients')
                    .select('name, email, department, role').in('email', supEmails).eq('active', true);
                const { data: supProfiles } = await db.from('profiles')
                    .select('name, email, department, role').in('email', supEmails);
                const supMap = Object.fromEntries([
                    ...(supRecips   || []).map(r => [r.email, r]),
                    ...(supProfiles || []).map(p => [p.email, p])
                ]);
                for (const email of supEmails) {
                    if (!extEmails.has(email)) {
                        extEmails.add(email);
                        extList.push(supMap[email] || { name: email, email, department: '設計', role: '' });
                    }
                }
            }
        }
        if (!resolved) {
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
            const owners = [...new Set((mt || []).map(t => t.owner).filter(Boolean))];
            for (const o of owners) await addPbyName(o);
        }
    }

    return { profiles: profileList, external: extList };
}

function renderRecipientsList(prefix, recipients) {
    const listEl = document.getElementById(`${prefix}_recipients_list`);
    const ROLE_MAP = { assembly_director: '組立部長', assembly_manager: '組立課長', quality: '品保', staff: '' };

    const profileRows = recipients.profiles.map(p => `
        <div class="recipient-item">
            <span class="recipient-name">${esc(p.name || '—')}</span>
            <span class="recipient-email">${esc(p.email || '—')}</span>
            <span class="recipient-tag">${esc(p.department || '')}${ROLE_MAP[p.role] ? '・' + ROLE_MAP[p.role] : ''}</span>
        </div>`).join('');

    const extRows = recipients.external.map(r => `
        <div class="recipient-item">
            <span class="recipient-name">${esc(r.name || '—')}</span>
            <span class="recipient-email" style="color:${r.email ? '#888' : '#e74c3c'};">${esc(r.email || '⚠ メール未登録')}</span>
            <span class="recipient-tag">${esc(r.department || '')}</span>
        </div>`).join('');

    listEl.innerHTML = profileRows + extRows || '<div style="color:#aaa;font-size:13px;padding:8px;">宛先なし</div>';
}

function addExtraRecipient(prefix) {
    const nameEl  = document.getElementById(`${prefix}_extra_name`);
    const emailEl = document.getElementById(`${prefix}_extra_email`);
    const name  = nameEl.value.trim();
    const email = emailEl.value.trim();
    if (!email) { showToast('メールアドレスを入力してください', 'error'); return; }

    extraRecipients[prefix].push({ name: name || email, email });
    nameEl.value = ''; emailEl.value = '';
    renderExtraList(prefix);
}

function removeExtraRecipient(prefix, index) {
    extraRecipients[prefix].splice(index, 1);
    renderExtraList(prefix);
}

function renderExtraList(prefix) {
    const el = document.getElementById(`${prefix}_extra_list`);
    el.innerHTML = extraRecipients[prefix].map((r, i) => `
        <div class="extra-recipient-item">
            <span style="font-weight:bold;min-width:80px;font-size:13px;">${esc(r.name)}</span>
            <span style="color:#888;flex:1;font-size:13px;">${esc(r.email)}</span>
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
    document.getElementById('si_flow_box').style.display      = 'none';
    document.getElementById('si_recipients_step').style.display = 'none';
    document.getElementById('si_footer_step1').style.display    = '';
    document.getElementById('si_footer_step2').style.display    = 'none';
    extraRecipients.si = [];
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

async function onSiProjectChange() {
    const num = currentSiProjectNum;
    document.getElementById('si_project_info').style.display  = 'none';
    document.getElementById('si_machine_group').style.display = 'none';
    document.getElementById('si_flow_box').style.display      = 'none';
    if (!num) return;

    const p = projectsMap[num] || {};
    document.getElementById('si_customer_display').textContent = p.customer_name || '—';
    document.getElementById('si_project_name_display').textContent = p.project_details || '—';
    document.getElementById('si_project_info').style.display = 'contents';
    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'si_machine_list', 'onSiMachineChange');
        document.getElementById('si_machine_group').style.display = 'block';
    } finally {
        hideLoading();
    }
}

async function onSiMachineChange() {
    const num      = currentSiProjectNum;
    const machines = getSelectedMachines('si_machine_list');
    if (machines.length === 0) { document.getElementById('si_flow_box').style.display = 'none'; return; }
    const machine   = machines[0];
    showLoading('読み込み中...');
    let doneFlows, chain;
    try {
        doneFlows = await _getMachineDoneFlows(num, machine);
        chain     = await _getMachineFlowChain(num, machine);
    } finally {
        hideLoading();
    }
    document.getElementById('si_flow_list').innerHTML =
        _renderFlowStatusList(_priorSteps(chain, 'simple_inspection'), doneFlows, '簡易検査開催案内');
    document.getElementById('si_flow_box').style.display = 'block';
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
            await recordFlowNotifications(req.id, 'simple_inspection');
            if (extraRecipients.si.length > 0) {
                await db.from('approval_notifications').insert(
                    extraRecipients.si.map(r => ({ request_id: req.id, recipient_email: r.email, notification_type: 'simple_inspection_invite' }))
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
    document.getElementById('inspection_flow_box').style.display      = 'none';
    document.getElementById('inspection_recipients_step').style.display = 'none';
    document.getElementById('inspection_footer_step1').style.display    = '';
    document.getElementById('inspection_footer_step2').style.display    = 'none';
    extraRecipients.inspection = [];
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

async function onInspectionProjectChange() {
    const num = currentInspectionProjectNum;
    document.getElementById('inspection_project_info').style.display  = 'none';
    document.getElementById('inspection_machine_group').style.display = 'none';
    document.getElementById('inspection_flow_box').style.display      = 'none';
    if (!num) return;

    const p = projectsMap[num] || {};
    document.getElementById('inspection_customer_display').textContent = p.customer_name || '—';
    document.getElementById('inspection_project_name_display').textContent = p.project_details || '—';
    document.getElementById('inspection_project_info').style.display = 'contents';

    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'inspection_machine_list', 'onInspectionMachineChange');
        document.getElementById('inspection_machine_group').style.display = 'block';
    } finally {
        hideLoading();
    }
}

async function onInspectionMachineChange() {
    const num      = currentInspectionProjectNum;
    const machines = getSelectedMachines('inspection_machine_list');
    if (machines.length === 0) { document.getElementById('inspection_flow_box').style.display = 'none'; return; }
    const machine = machines[0]; // フロー状況は1台目で代表
    showLoading('読み込み中...');
    let doneFlows, chain;
    try {
        doneFlows = await _getMachineDoneFlows(num, machine);
        chain     = await _getMachineFlowChain(num, machine);
    } finally {
        hideLoading();
    }
    document.getElementById('inspection_flow_list').innerHTML =
        _renderFlowStatusList(_priorSteps(chain, 'inspection'), doneFlows, '外観検査開催案内');
    document.getElementById('inspection_flow_box').style.display = 'block';
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
            await recordFlowNotifications(req.id, 'inspection');
            // 追加宛先を挿入
            if (extraRecipients.inspection.length > 0) {
                await db.from('approval_notifications').insert(
                    extraRecipients.inspection.map(r => ({ request_id: req.id, recipient_email: r.email, notification_type: 'inspection_invite' }))
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

// ===== フロー5: 出荷確認会議開催案内 =====
function openShippingMeetingModal() {
    currentSmProjectNum = '';
    document.getElementById('sm_project_display').textContent = '';
    document.getElementById('sm_project_info').style.display  = 'none';
    document.getElementById('sm_machine_group').style.display = 'none';
    document.getElementById('sm_machine_list').innerHTML      = '';
    document.getElementById('sm_flow_box').style.display      = 'none';
    document.getElementById('sm_recipients_step').style.display = 'none';
    document.getElementById('sm_footer_step1').style.display    = '';
    document.getElementById('sm_footer_step2').style.display    = 'none';
    extraRecipients.sm = [];
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

async function onSmProjectChange() {
    const num = currentSmProjectNum;
    document.getElementById('sm_project_info').style.display  = 'none';
    document.getElementById('sm_machine_group').style.display = 'none';
    document.getElementById('sm_flow_box').style.display      = 'none';
    if (!num) return;
    const p = projectsMap[num] || {};
    document.getElementById('sm_customer_display').textContent = p.customer_name || '—';
    document.getElementById('sm_project_name_display').textContent = p.project_details || '—';
    document.getElementById('sm_project_info').style.display = 'contents';
    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'sm_machine_list', 'onSmMachineChange');
        document.getElementById('sm_machine_group').style.display = 'block';
    } finally {
        hideLoading();
    }
}

async function onSmMachineChange() {
    const num      = currentSmProjectNum;
    const machines = getSelectedMachines('sm_machine_list');
    if (machines.length === 0) { document.getElementById('sm_flow_box').style.display = 'none'; return; }
    const machine = machines[0];
    showLoading('読み込み中...');
    let doneFlows, chain;
    try {
        doneFlows = await _getMachineDoneFlows(num, machine);
        chain     = await _getMachineFlowChain(num, machine);
    } finally {
        hideLoading();
    }
    document.getElementById('sm_flow_list').innerHTML =
        _renderFlowStatusList(_priorSteps(chain, 'shipping_meeting'), doneFlows, '出荷確認会議開催案内');
    document.getElementById('sm_flow_box').style.display = 'block';
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
            await recordFlowNotifications(req.id, 'shipping_meeting');
            if (extraRecipients.sm.length > 0) {
                await db.from('approval_notifications').insert(
                    extraRecipients.sm.map(r => ({ request_id: req.id, recipient_email: r.email, notification_type: 'shipping_meeting_invite' }))
                );
            }
            const roomEmail = ROOM_EMAILS[location];
            if (roomEmail) {
                await db.from('approval_notifications').insert({
                    request_id: req.id, recipient_email: roomEmail, notification_type: 'shipping_meeting_invite'
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

async function onShippingProjectChange() {
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
        await _loadMachineCheckboxes(num, 'shipping_machine_list', 'onShippingMachineChange');
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
    // 担当者確認: tasks から設計・組立・操業 owner を取得
    const { data: taskRows } = await db.from('tasks')
        .select('text, owner, major_item')
        .eq('project_number', num).eq('machine', machine)
        .in('text', ['機械組立', '試運転', '出図']);

    const findOwners = (taskText, majorItem) =>
        [...new Set((taskRows || [])
            .filter(t => t.text === taskText && (!majorItem || (t.major_item || '').trim() === majorItem))
            .map(t => t.owner).filter(Boolean))].join('・') || 'なし';

    const kumitateOwner = findOwners('機械組立');
    const shiuntenOwner = findOwners('試運転');
    const sekkeiOwner   = findOwners('出図', '設計');

    // 営業担当者
    const { data: sData } = await db.from('app_settings').select('value').eq('key', 'sales_person_map').single();
    const salesOwner = (sData?.value ? JSON.parse(sData.value) : {})[num] || 'なし';

    document.getElementById('shipping_approver_list').innerHTML = [
        ['設計', sekkeiOwner], ['組立', kumitateOwner], ['操業', shiuntenOwner], ['営業', salesOwner]
    ].map(([role, name]) =>
        `<div class="flow-info-item"><span style="width:32px;font-size:12px;color:#999;flex-shrink:0;">${role}</span><span>${esc(name)}</span></div>`
    ).join('');
    document.getElementById('shipping_approver_box').style.display = 'block';

    // フロー状況（この機械に必要な前フローを動的判定し、未完了があれば申請不可にする）
    const doneFlows = await _getMachineDoneFlows(num, machine);
    const required  = await _getRequiredFlows(num, machine);
    const rows = [...required].map(t => ({ type: t, label: FLOW_LABELS[t] || t }));
    document.getElementById('shipping_flow_list').innerHTML = `<div class="steps-list">` +
        rows.map(f => doneFlows.has(f.type)
            ? _flowStepHtml(FS_DONE_SC, FS_DONE_ICON, f.label, '承認済み')
            : _flowStepHtml(FS_WAIT_SC, FS_WAIT_ICON, f.label, '未完了', '#c0392b')
        ).join('') +
        _flowStepHtml(FS_CUR_SC, FS_CUR_ICON, '出荷確定申請（今回）') +
        `</div>`;
    document.getElementById('shipping_flow_box').style.display = 'block';

    const missing = [...required].filter(t => !doneFlows.has(t));
    if (missing.length > 0) {
        const labels = missing.map(t => FLOW_LABELS[t] || t).join('・');
        const warnEl = document.getElementById('shipping_missing_warning');
        warnEl.textContent = `前フローが未完了のため申請できません（${labels}）`;
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
        // 前フロー完了の再チェック（画面表示が古い場合の防御）
        for (const machine of machines) {
            const [doneFlows, required] = await Promise.all([
                _getMachineDoneFlows(num, machine),
                _getRequiredFlows(num, machine)
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
        const { data: req, error } = await db.from('approval_requests')
            .update({ status: 'submitted', updated_at: new Date().toISOString() })
            .eq('id', requestId).eq('status', 'awaiting_shipping_confirm')
            .select().single();
        if (error) throw error;
        if (!req) { showToast('既に処理済みです', 'error'); return; }

        // 承認ステップ: 常務（assembly_director）の1ステップ
        await db.from('approval_steps').insert({
            request_id: requestId, step_order: 1, approver_role: 'assembly_director', status: 'pending'
        });

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
// 承認ステップをリセットして常務の再承認を必須にする
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
            .select('status').eq('id', requestId).single();
        if (fetchErr) throw fetchErr;
        if (!current) { showToast('データが見つかりません', 'error'); return; }

        const needsReapproval = current.status === 'submitted' || current.status === 'approved';

        const updatePayload = { confirmed_shipping_date: dateVal, updated_at: new Date().toISOString() };
        if (isSplitShipping) updatePayload.confirmed_shipping_date_2 = dateVal2;
        if (packingInputEl) updatePayload.packing_confirmed_shipping_date = packingDateVal;
        if (needsReapproval) {
            updatePayload.status      = 'submitted';
            updatePayload.is_resubmit = true;
        }

        const { data: req, error } = await db.from('approval_requests')
            .update(updatePayload).eq('id', requestId).select().single();
        if (error) throw error;

        if (needsReapproval) {
            // 常務の承認ステップをリセットして再承認を依頼する
            await db.from('approval_steps').update({
                status: 'pending', approver_id: null, comment: null, decided_at: null
            }).eq('request_id', requestId);

            const { data: directors } = await db.from('profiles').select('id').eq('role', 'assembly_director');
            if (directors?.length > 0) {
                await db.from('approval_notifications').insert(
                    directors.map(d => ({ request_id: requestId, recipient_id: d.id, notification_type: 'approval_request' }))
                );
            }
        }

        await syncShippingDateToTasks(req, { factoryDate: dateVal, factoryDate2: dateVal2, packingDate: packingDateVal });

        closeDetailModal();
        await refreshAll();
        showToast(needsReapproval ? '出荷日を変更しました。常務に再承認を依頼します。' : '出荷日を変更しました。', 'success');
    } catch (e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ===== Notifications =====

async function recordFlowNotifications(requestId, flowType) {
    // 工番・機械名・申請者IDを取得
    const { data: req } = await db.from('approval_requests').select('project_number, machine_name, requester_id').eq('id', requestId).single();
    const projectNum = req?.project_number;
    // 組立(assembly)は機械名が工程表と紐づかない自由入力/要約文字列のため、機械では絞り込まず工番全体でオーナーを検索する
    const machineName = flowType === 'assembly' ? null : req?.machine_name;
    if (!projectNum) return;

    // 対象機械のタスクオーナーを取得（機械名がある場合は機械でフィルタ）
    let taskQuery = db.from('tasks').select('text, owner, major_item').eq('project_number', projectNum);
    if (machineName) taskQuery = taskQuery.eq('machine', machineName);
    const { data: tasks } = await taskQuery;
    const findOwners = (taskName, majorItem) => {
        const matched = (tasks || []).filter(t => t.text === taskName && (!majorItem || String(t.major_item || '').trim() === majorItem));
        return [...new Set(matched.map(t => t.owner).filter(Boolean))];
    };

    const kumitateOwners = findOwners('機械組立');
    const shiuntenOwners = findOwners('試運転');
    const sekkeiOwners   = findOwners('出図', '設計');
    const denkiOwners    = findOwners('電気艤装');

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

    // members テーブルから設計担当者の上長を取得
    // 担当者不明・未登録の場合は設計全管理職にフォールバック
    const addSekkeiSupervisors = async () => {
        let resolved = false;
        if (sekkeiOwners.length > 0) {
            const { data: memberRows } = await db.from('members')
                .select('supervisor_email1, supervisor_email_2')
                .in('name', sekkeiOwners);
            for (const m of (memberRows || [])) {
                if (m.supervisor_email1)  { extEmails.add(m.supervisor_email1);  resolved = true; }
                if (m.supervisor_email_2) { extEmails.add(m.supervisor_email_2); resolved = true; }
            }
        }
        if (!resolved) {
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
            // 電気艤装タスクがある場合のみ電装担当者も追加
            if (dyn.denki_owner) for (const o of denkiOwners) await addPbyName(o);
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
            break;
        }

        case 'simple_inspection': {
            const dyn = getDynamicRecipientPlan('simple_inspection');
            notifType = 'simple_inspection_invite';
            await addFixedRecipients();                                         // 設定画面で個人単位に選択
            if (dyn.kumitate_owner) for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            if (dyn.sales)    await addOwnerByName(salesOwner);                          // 営業担当者
            if (dyn.sekkei_owner) for (const o of sekkeiOwners) await addOwnerByName(o);     // 設計担当者
            if (dyn.sekkei_manager) await addSekkeiSupervisors();                           // 設計課長・部長
            if (dyn.kumitate_manager && kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });           // 組立課長（機械組立あり）
            }
            break;
        }

        case 'inspection': {
            const dyn = getDynamicRecipientPlan('inspection');
            notifType = 'inspection_invite';
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
            break;
        }

        case 'shipping_prep':
            // 固定宛先（設定画面で個人単位に選択、製管へはメール送信時にCCで届く）。工番担当者の自動通知は対象外
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

    const inserts = [
        ...[...profileIds].map(id    => ({ request_id: requestId, recipient_id:    id,    notification_type: notifType })),
        ...[...extEmails ].map(email => ({ request_id: requestId, recipient_email: email, notification_type: notifType }))
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
    }
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

    const accessToken  = localStorage.getItem('ap_access_token');
    const refreshToken = localStorage.getItem('ap_refresh_token');
    if (!accessToken) { await bootGuest(); return; } // 未ログイン → 閲覧のみで起動

    const { data, error } = await db.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken
    });
    if (error || !data.session) {
        // トークン期限切れなど → 閲覧のみで起動
        localStorage.removeItem('ap_access_token');
        localStorage.removeItem('ap_refresh_token');
        await bootGuest();
        return;
    }
    await bootApp(data.session);
})();

