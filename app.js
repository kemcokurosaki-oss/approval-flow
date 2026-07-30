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
        storage:        _memStorage
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
// 点検系（3T/4T）の工番判定（承認フロー対象外）
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
let projectsMap    = {}; // project_number → { customer_name, project_details }
let currentTab          = 'pending';
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
let qaEditingPendingIdx  = null; // 開催結果セクションで編集中のペンディング項目インデックス

// デモ用ロール→{role, department, flowTypes} マッピング
// flowTypes: 自分の申請タブで表示するフロー種別（デモ用フィルタ）
const DEV_ROLE_MAP = {
    staff_kumitate:      { role: 'staff',               department: '組立', flowTypes: ['assembly'] },
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

function canApplyFlow(flowType) {
    const role  = getEffectiveRole();
    const dept  = getEffectiveDept();
    const isQorS = role === 'quality' || role === 'production_control';
    if (flowType === 'assembly')         return (role === 'staff' && dept === '組立') || role === 'assembly_manager';
    if (flowType === 'test_run')         return (role === 'staff' && dept === '操業') || role === 'operations_manager';
    if (flowType === 'shipping_prep')    return dept === '組立' || dept === '営業';
    if (flowType === 'simple_inspection' || flowType === 'inspection' ||
        flowType === 'shipping_meeting'  || flowType === 'shipping')  return isQorS;
    return false;
}

// 承認者ロール一覧
const APPROVER_ROLES = ['assembly_manager','assembly_director','operations_manager','operations_director'];

// 設定画面を開けるユーザー（製管2名）。開発用ロール切替バーの表示条件としても使う
const ADMIN_EMAILS = ['e-kurosaki@kusakabe.com', 's-morimura@kusakabe.com'];

function applyRoleLayout(role) {
    const dept        = getEffectiveDept();
    // 品証・製管は出荷準備フローの承認者でもあるため承認待ち一覧の対象に含める
    const isApprover  = APPROVER_ROLES.includes(role) || (role === 'staff' && dept === '営業') || role === 'quality' || role === 'production_control';
    // 品証、および製管は同一権限（グローバル変数に保存）
    isQualityOrSeikan = role === 'quality' || role === 'production_control';
    // 組立・操業 staff + 組立課長 + 操業課長 + 営業staff（出荷準備申請）が申請可
    const isApplicant = (role === 'staff' && (dept === '組立' || dept === '操業' || dept === '営業'))
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

// ===== 設定画面（flow_settings / flow_overrides） =====
// ON/OFF設定の対象フロー種別（組立・出荷確定は工程の先頭・末尾に固定されるため対象外）
const TOGGLABLE_FLOWS = ['test_run', 'simple_inspection', 'inspection', 'shipping_meeting', 'shipping_prep'];
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
                         { key: 'logistics',          label: '物流課', kind: 'department', department: '物流' }]
};
let flowSettings   = { fixedRecipients: {} };
let flowOverrides  = new Set(); // 工事番号・機械ごとにOFFにされたフロー（"projectmachineflow_type"）
const FLOW_OVERRIDE_SEP = '';

async function loadFlowSettings() {
    const [{ data: settingsRows }, { data: overrideRows }] = await Promise.all([
        db.from('flow_settings').select('key, value').eq('key', 'flow_fixed_recipients'),
        db.from('flow_overrides').select('project_number, machine, flow_type')
    ]);
    const rows = Object.fromEntries((settingsRows || []).map(r => [r.key, r.value]));
    flowSettings  = { fixedRecipients: rows.flow_fixed_recipients || {} };
    flowOverrides = new Set((overrideRows || []).map(r => `${r.project_number}${FLOW_OVERRIDE_SEP}${r.machine}${FLOW_OVERRIDE_SEP}${r.flow_type}`));
}

// 設定変更を履歴テーブルに記録する（保存系の関数から呼び出す）
async function logSettingsChange(category, summary) {
    await db.from('settings_audit_log').insert({ changed_by: currentUser.email, category, summary });
}

// 中間5フロー（試運転・簡易検査・外観検査・出荷確認会議・出荷準備）のみ、工事番号・機械単位でOFFにできる。
// 組立・出荷確定は常に有効。exceptionテーブルに行がある＝OFF、無ければON（デフォルト有効）
function isFlowEnabledFor(flowType, projectNum, machine) {
    if (!TOGGLABLE_FLOWS.includes(flowType)) return true;
    return !flowOverrides.has(`${projectNum}${FLOW_OVERRIDE_SEP}${machine}${FLOW_OVERRIDE_SEP}${flowType}`);
}

// フロー種別ごとの固定宛先（個人のprofile ID・notification_recipients ID）
function getFixedRecipientPlan(flowType) {
    const plan = flowSettings.fixedRecipients[flowType] || {};
    return { profileIds: plan.profileIds || [], recipientIds: plan.recipientIds || [] };
}

const FLOW_LABELS = {
    assembly:            '組立完了申請',
    test_run:            '試運転完了申請',
    simple_inspection:   '簡易検査開催案内',
    inspection:          '外観検査開催案内',
    // tentative_shipping: 独立したフローではなく簡易検査/外観検査に付随する値だが、
    // 対応待ち一覧（サイドバー）でのグルーピング表示用ラベルとして使用する
    tentative_shipping:  '仮出荷予定日',
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
    quality:             '品質保証課',
    production_control:  '製管',
    staff:               '担当者',
    logistics:           '物流'
};

const STATUS_LABELS = {
    draft:      '入力中',
    submitted:  '課長承認待ち',
    in_review:  '部長承認待ち',
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
    document.getElementById('app').style.display = 'block';
    document.getElementById('user_name_display').textContent =
        `${profile.name}（${ROLE_LABELS[profile.role] || profile.role}）`;

    // 製管2名のみ開発用ロール切替バー・設定ボタンを表示
    if (ADMIN_EMAILS.includes(currentUser.email)) {
        document.getElementById('dev_bar').style.display = 'flex';
        document.getElementById('app').classList.add('has-dev-bar');
        document.getElementById('settings_btn').style.display = '';
    }

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

// ===== Projects =====
async function loadProjects() {
    // 完了済み工事番号を取得（進捗一覧には含めるが、通常表示では除外する）
    const { data: completed } = await db
        .from('completed_projects')
        .select('project_number');
    completedProjectNums = new Set(
        (completed || []).map(c => (c.project_number || '').toString().trim())
    );

    // sort_order付きでタスクを取得（工程表と同じ並び順にするため）
    const { data: tasks } = await db
        .from('tasks')
        .select('project_number, customer_name, project_details, text, sort_order, end_date, owner')
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
        if (taskText === '梱包出荷')   packingShippingProjectNums.add(num);
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

}

const simpleInspectionProjectNums = new Set(); // 簡易検査タスクがある工番
const inspectionProjectNums    = new Set(); // 外観検査タスクがある工番
const assemblyProjectNums      = new Set(); // 機械組立タスクがある工番
const testRunProjectNums       = new Set(); // 試運転タスクがある工番
const shippingMeetingProjectNums = new Set(); // 出荷確認会議タスクがある工番
const shippingProjectNums      = new Set(); // 工場出荷タスクがある工番
const packingShippingProjectNums = new Set(); // 梱包出荷タスクがある工番

async function onProjectChange() {
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

    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'submit_machine_list', 'onMachineChange');
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
        listEl.innerHTML += `<div style="color:#c0392b; font-weight:bold; font-size:13px; margin-top:8px;">⚠ 前フローが未完了のため申請できません: ${msg}</div>`;
    }
}

async function onMachineChange() {
    const num      = currentProjectNum;
    const machines = getSelectedMachines('submit_machine_list');
    const flowEl   = document.getElementById('flow_detect_group');

    if (machines.length === 0) {
        document.getElementById('flow_detect_list').innerHTML =
            '<div style="color:#bbb; font-size:12px; padding:8px 0;">機械を選択してください</div>';
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
    const doneFlows = await _getMachineDoneFlows(num, machine);

    const doneList     = chain.filter(t => t !== currentFlowType && doneFlows.has(t));
    const upcomingList = chain.filter(t => t !== currentFlowType && !doneFlows.has(t));

    document.getElementById('flow_detect_list').innerHTML = `<div class="steps-list">` +
        doneList.map(t => _flowStepHtml(FS_DONE_SC, FS_DONE_ICON, FLOW_LABELS[t] || t, '承認済み')).join('') +
        _flowStepHtml(FS_CUR_SC, FS_CUR_ICON, `${FLOW_LABELS[currentFlowType] || '完了通知'}（今回）`) +
        upcomingList.map(t => _flowStepHtml(FS_WAIT_SC, FS_WAIT_ICON, FLOW_LABELS[t] || t)).join('') +
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

async function loadPendingSide() {
    const role    = getEffectiveRole();
    const dept    = getEffectiveDept();
    const isSales = role === 'staff' && dept === '営業';
    const isQorS  = role === 'quality' || role === 'production_control';
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
        // assembly/test_run/shipping_prep 並列: submitted 状態で全 pending ステップが操作可能
        if ((req.flow_type === 'assembly' || req.flow_type === 'test_run' || req.flow_type === 'shipping_prep') && req.status === 'submitted' && s.status === 'pending') return true;
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

    // 営業: 確定出荷日・仮出荷予定日の入力待ちになっている申請を取得
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

        // 仮出荷予定日は簡易検査/外観検査の申請そのものに付随（開催完了済み・未入力のもの）
        const { data: tentativeReqs } = await db.from('approval_requests')
            .select('id, project_number, machine_name, created_at')
            .in('flow_type', ['simple_inspection', 'inspection']).eq('status', 'approved')
            .is('tentative_shipping_date', null);
        salesItems.push(...(tentativeReqs || []).map(r => ({
            id:         r.id,
            pNum:       r.project_number || '—',
            machineName: r.machine_name || '',
            flowType:   'tentative_shipping',
            flowLabel:  '仮出荷予定日',
            date:       r.created_at,
            statusText: '🔴 仮出荷予定日 入力待ち',
        })));
    }

    // 品証・製管: 営業入力済みの仮出荷予定日の確認待ちを取得（同じく簡易検査/外観検査の申請に付随）
    let qorsItems = [];
    if (isQorS) {
        const { data: confirmReqs } = await db.from('approval_requests')
            .select('id, project_number, machine_name, created_at')
            .in('flow_type', ['simple_inspection', 'inspection']).eq('status', 'approved')
            .not('tentative_shipping_date', 'is', null).is('tentative_shipping_confirmed_at', null);
        qorsItems = (confirmReqs || []).map(r => ({
            id:         r.id,
            pNum:       r.project_number || '—',
            machineName: r.machine_name || '',
            flowType:   'tentative_shipping',
            flowLabel:  '仮出荷予定日',
            date:       r.created_at,
            statusText: '🔴 仮出荷予定日 確認待ち',
        }));
    }

    const combined = [...actionable, ...salesItems, ...qorsItems];

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
    const renderPendingCard = item => {
        const machineHtml = item.machineName ? '<span class="side-card-machine">' + esc(item.machineName) + '</span>' : '';
        return `
        <div class="side-card is-pending-action" onclick="openDetailModal('${item.id}')">
            <div class="side-card-title">${esc(item.pNum)}${machineHtml}</div>
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
                <span>【${esc(label)}】</span>
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
    const reqs = (rawReqs || []).filter(r => projectsMap[r.project_number] !== undefined && !completedProjectNums.has(r.project_number));

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
        return `
        <div class="side-card ${cardClass}" onclick="${cardClick}" title="${esc(pNum)} ${flowLabel}">
            <div class="mine-col-num">${esc(pNum)}${machineHtml}${resubmitBadge}</div>
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
    const buildAssemblyLikeColumns = (list) => {
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
            ['承認待ち', groups.waiting, false],
            ['ペンディング', groups.pending, true],
            ['承認済み', groups.approved, false],
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
            ['ペンディング', groups.pending, true],
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
                       : buildAssemblyLikeColumns(list);
        const row = columns.map(([label, items, isPendingGroup]) => renderColumn(label, items, isPendingGroup)).join(arrow);
        // 対象案件が1件もないフローは最初から折りたたんでおく（見出しクリックで開閉可能）
        const isEmpty = columns.every(([, items]) => items.length === 0);
        return `
        <div class="mine-flow-section${isEmpty ? ' collapsed' : ''}">
            <div class="mine-flow-section-title" onclick="toggleMineFlowSection(this)">
                <span>【${esc(FLOW_LABELS[flowType] || flowType)}】</span>
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
        .select('id, project_number, machine_name, flow_type, status, has_inspection, test_run, created_at, updated_at, confirmed_shipping_date, tentative_shipping_date, tentative_shipping_confirmed_at, packing_confirmed_shipping_date, packing_tentative_shipping_date, inspection_date, inspection_time, requester_id, sheet_data, approval_steps(approver_id, status)')
        .order('updated_at', { ascending: false });

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
        .select('project_number, machine, text, end_date, is_completed')
        .in('text', ['機械組立', '外観検査', '試運転', '出荷確認会議', '出荷準備', '工場出荷', '梱包出荷'])
        .not('machine', 'is', null);

    const machineTaskSet = new Set(
        (machineTasks || []).map(t => `${t.project_number}__${t.machine}__${t.text}`)
    );
    const hasTask = (num, machine, taskText) => machineTaskSet.has(`${num}__${machine}__${taskText}`);

    // 未申請催促（組立・試運転・工場出荷）の期日判定用（project__machine__taskText → {end_date, is_completed}）
    const taskInfoMap = {};
    (machineTasks || []).forEach(t => {
        taskInfoMap[`${t.project_number}__${t.machine}__${t.text}`] = { end_date: t.end_date, is_completed: t.is_completed };
    });

    // 工番レベルのフロータスク（machine不問）- 簡易検査/外観検査/出荷確認会議/梱包出荷はproject全体に1つの場合がある
    const { data: projectFlowTasks } = await db.from('tasks')
        .select('project_number, text, end_date, is_completed')
        .in('text', ['簡易検査', '外観検査', '出荷確認会議', '梱包出荷']);
    const projectFlowSet = new Set(
        (projectFlowTasks || []).map(t => `${(t.project_number||'').toString().trim()}__${t.text}`)
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
        if (!projectData[num][t.machine]) projectData[num][t.machine] = { flows: {} };
    });

    // 申請レコードを反映
    (allReqs || []).forEach(req => {
        const num     = req.project_number;
        const machine = req.machine_name;
        if (!num || !machine) return;
        if (!projectData[num]) projectData[num] = {};
        if (!projectData[num][machine]) projectData[num][machine] = { flows: {} };
        projectData[num][machine].flows[req.flow_type] = req;
    });

    const baseNums = Object.keys(projectData).filter(num => {
        if (projectsMap[num] === undefined) return false;
        if (isTInspectionSeries(num)) return false;
        if (is5or7Series(num))        return false;
        if (is2000sSeries(num)) {
            // 2000番台は組立・試運転フローのみ対象のため、いずれかのタスクがある工番だけ表示する
            const machines = Object.keys(projectData[num]);
            return machines.some(m => hasTask(num, m, '機械組立') || hasTask(num, m, '試運転'));
        }
        if (isDSeries(num)) {
            const machines = Object.keys(projectData[num]);
            return machines.some(m => hasTask(num, m, '機械組立'));
        }
        return true;
    }).sort();

    if (baseNums.length === 0) {
        el.innerHTML = '<div class="empty"><div class="empty-icon">📊</div><div class="empty-text">承認フローの記録がありません</div></div>';
        return;
    }

    progressCachedData = { baseNums, projectData, machineTaskSet, projectFlowSet, shippingApproverNameMap, taskInfoMap, projectFlowInfoMap };

    el.innerHTML = '<div id="progress_cards_wrap"></div>';
    _syncProgressControls();
    renderProgressCards();
}

function _syncProgressControls() {
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

function renderProgressCards() {
    const wrap = document.getElementById('progress_cards_wrap');
    if (!wrap || !progressCachedData) return;

    if (progressFilterShipAfter) {
        renderShipAfterPendingList(wrap);
        return;
    }

    const { baseNums, projectData, machineTaskSet, projectFlowSet, shippingApproverNameMap, taskInfoMap, projectFlowInfoMap } = progressCachedData;
    const hasTask        = (num, machine, taskText) => machineTaskSet.has(`${num}__${machine}__${taskText}`);
    const hasProjectFlow = (num, text) => (projectFlowSet || new Set()).has(`${num}__${text}`);

    // 出荷予定日表示: 工程表（工場出荷タスク終了日）をベースに、仮出荷予定日→確定出荷日の順で上書きする
    // 確定出荷日が入ったらラベルも「出荷予定日」→「確定出荷日」に切り替える
    const getEffectiveShippingDate = (num) => {
        let tentative = null, confirmed = null;
        Object.values(projectData[num] || {}).forEach(mData => {
            const shipReq = mData.flows['shipping'];
            if (shipReq?.confirmed_shipping_date && (!confirmed || shipReq.confirmed_shipping_date < confirmed)) {
                confirmed = shipReq.confirmed_shipping_date;
            }
            [mData.flows['simple_inspection'], mData.flows['inspection']].forEach(req => {
                if (req?.tentative_shipping_date && (!tentative || req.tentative_shipping_date < tentative)) {
                    tentative = req.tentative_shipping_date;
                }
            });
        });
        return { date: confirmed || tentative || projectsMap[num]?.shipping_date || null, isConfirmed: !!confirmed };
    };

    // 出荷予定日表示（機械単位）: 同工番内でも機械ごとに出荷日が異なる場合に個別表示するための算出
    const getEffectiveShippingDateForMachine = (num, machine) => {
        const mData = projectData[num][machine];
        let tentative = null, confirmed = null;
        const shipReq = mData.flows['shipping'];
        if (shipReq?.confirmed_shipping_date) confirmed = shipReq.confirmed_shipping_date;
        [mData.flows['simple_inspection'], mData.flows['inspection']].forEach(req => {
            if (req?.tentative_shipping_date && (!tentative || req.tentative_shipping_date < tentative)) {
                tentative = req.tentative_shipping_date;
            }
        });
        const fallback = (taskInfoMap || {})[`${num}__${machine}__工場出荷`]?.end_date || null;
        return { date: confirmed || tentative || fallback || null, isConfirmed: !!confirmed };
    };

    // 梱包出荷日表示: 工程表（梱包出荷タスク終了日）をベースに、梱包仮出荷日→梱包確定出荷日の順で上書きする
    const getEffectivePackingShippingDate = (num) => {
        let tentative = null, confirmed = null;
        Object.values(projectData[num] || {}).forEach(mData => {
            const shipReq = mData.flows['shipping'];
            if (shipReq?.packing_confirmed_shipping_date && (!confirmed || shipReq.packing_confirmed_shipping_date < confirmed)) {
                confirmed = shipReq.packing_confirmed_shipping_date;
            }
            [mData.flows['simple_inspection'], mData.flows['inspection']].forEach(req => {
                if (req?.packing_tentative_shipping_date && (!tentative || req.packing_tentative_shipping_date < tentative)) {
                    tentative = req.packing_tentative_shipping_date;
                }
            });
        });
        return { date: confirmed || tentative || projectsMap[num]?.packing_shipping_date || null, isConfirmed: !!confirmed };
    };

    // 未申請・未承認判定（組立・試運転・出荷確定）
    const OVERDUE_FLOW_TASK_TEXT = { assembly: '機械組立', test_run: '試運転', shipping: '工場出荷' };
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
        const myName = currentProfile?.name;
        if (myName) {
            nums = nums.filter(num => {
                const owners = projectsMap[num]?.owners;
                return owners && owners.has(myName);
            });
        }
    }

    // 工番種別フィルタ
    if (progressFilterPrefix) {
        nums = nums.filter(num => matchesPrefix(num, progressFilterPrefix));
    }

    if (nums.length === 0) {
        wrap.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">該当する工番がありません</div></div>';
        return;
    }

    const FLOW_DEFS = [
        { type: 'assembly',           label: '組立',       alwaysShow: true },
        { type: 'simple_inspection',  label: '簡易検査',   alwaysShow: false },
        { type: 'inspection',         label: '外観検査',   alwaysShow: false },
        { type: 'test_run',           label: '試運転',     alwaysShow: false },
        { type: 'shipping_meeting',   label: '出荷会議',   alwaysShow: false },
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
        const machines = Object.keys(projectData[num]).sort();
        const hasAnyPacking = hasProjectFlow(num, '梱包出荷') || machines.some(m => hasTask(num, m, '梱包出荷'));

        // 機械ごとに出荷日が異なる場合は右上にまとめず各機械行に個別表示し、揃っている場合は従来通り右上に1本表示する
        const machineShipDates = machines.map(m => Object.assign({ machine: m }, getEffectiveShippingDateForMachine(num, m)));
        const uniqueShipDates = new Set(machineShipDates.filter(d => d.date).map(d => d.date));
        const perMachineShipDateDiffers = machines.length > 1 && uniqueShipDates.size > 1;
        const machineShipDateMap = {};
        machineShipDates.forEach(d => { machineShipDateMap[d.machine] = d; });

        let shippingDateLabel;
        if (perMachineShipDateDiffers) {
            shippingDateLabel = '';
        } else {
            const { date: effectiveShippingDate, isConfirmed: shippingDateConfirmed } = getEffectiveShippingDate(num);
            const baseLabel = hasAnyPacking ? '工場出荷日' : (shippingDateConfirmed ? '確定出荷日' : '出荷予定日');
            shippingDateLabel = effectiveShippingDate ? buildShipDateSpan(baseLabel, effectiveShippingDate, shippingDateConfirmed) : '';
        }

        let packingDateLabel = '';
        if (hasAnyPacking) {
            const { date: effectivePackingDate, isConfirmed: packingDateConfirmed } = getEffectivePackingShippingDate(num);
            packingDateLabel = effectivePackingDate
                ? `<span class="prog-card-date${packingDateConfirmed ? ' is-confirmed' : ''}"><span class="prog-card-date-label">梱包出荷日</span> <span class="prog-card-date-value">${fmtDate(effectivePackingDate)}</span></span>`
                : '';
        }

        const machineRows = machines.map(machine => {
            const mData = projectData[num][machine];
            const tplC  = isTemplateC(num);

            const applicable = FLOW_DEFS.filter(f => {
                // 設定（工事番号・機械単位）でOFFにされたフローは非表示（既存の申請済みデータがあれば継続して表示する）
                if (!isFlowEnabledFor(f.type, num, machine) && !mData.flows[f.type]) return false;
                // 2000番台工事は組立・試運転フローのみ対象（出荷系・検査系は非表示）
                if (is2000sSeries(num) && f.type !== 'assembly' && f.type !== 'test_run') return false;
                if (f.alwaysShow) return true;
                if (f.type === 'test_run')          return hasTask(num, machine, '試運転')     || !!mData.flows['test_run'];
                if (f.type === 'simple_inspection') return hasProjectFlow(num, '簡易検査')     || hasTask(num, machine, '簡易検査')     || !!mData.flows['simple_inspection'];
                if (f.type === 'inspection')        return hasProjectFlow(num, '外観検査')     || hasTask(num, machine, '外観検査')     || !!mData.flows['inspection'];
                if (f.type === 'shipping_meeting')  return hasProjectFlow(num, '出荷確認会議') || hasTask(num, machine, '出荷確認会議') || !!mData.flows['shipping_meeting'];
                if (f.type === 'shipping_prep')     return hasTask(num, machine, '出荷準備')   || !!mData.flows['shipping_prep'];
                return false;
            });

            const nodes = applicable.map((f, i) => {
                const req = mData.flows[f.type];
                let fcClass, icon, clickAttr = '', clickable = '';

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
                    // そのフローを申請できるロールのみクリック可能（例：組立担当者のみ assembly draft を操作可）
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
                if (req && req.status !== 'draft' && (f.type === 'assembly' || f.type === 'test_run' || QA_MEETING_FLOWS.includes(f.type))) {
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

                const connector = i < applicable.length - 1
                    ? `<div class="flow-connector ${(req && req.status === 'approved') ? 'fc-line-done' : 'fc-line-pending'}"></div>`
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

            const machineLabel = machines.length > 1 ? '<div class="prog-machine-label">【' + esc(machine) + '】</div>' : '';
            const machineShipInfo = perMachineShipDateDiffers ? machineShipDateMap[machine] : null;
            const machineShipHtml = (machineShipInfo && machineShipInfo.date)
                ? buildShipDateSpan(hasAnyPacking ? '工場出荷日' : (machineShipInfo.isConfirmed ? '確定出荷日' : '出荷予定日'), machineShipInfo.date, machineShipInfo.isConfirmed)
                : '';
            const rowHeader = (machineLabel || machineShipHtml)
                ? '<div class="prog-machine-row-header">' + machineLabel + machineShipHtml + '</div>'
                : '';
            return '<div class="prog-machine-row">' + rowHeader + '<div class="flow-steps">' + nodes + '</div></div>';
        }).join('');

        return `<div class="prog-card">
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

// ===== 出荷後対応ペンディング一覧（完了済み工番も含めて全工番を横断表示） =====
function renderShipAfterPendingList(wrap) {
    const { baseNums, projectData } = progressCachedData;

    let nums = baseNums.slice();
    if (progressFilterMine) {
        const myName = currentProfile?.name;
        if (myName) {
            nums = nums.filter(num => {
                const owners = projectsMap[num]?.owners;
                return owners && owners.has(myName);
            });
        }
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
                    <div class="pending-detail-text">${r.machine ? `<span class="pending-detail-machine">${esc(r.machine)}</span> ` : ''}[${esc(flowLabel)}] ${esc(r.item.content || r.item.machine || '—')}${pendingDueSoon(r.item.due) ? ' <span style="font-size:11px;color:#c0392b;background:#fde8e8;border-radius:4px;padding:1px 6px;">期日間近</span>' : ''}</div>
                    ${r.item.owner ? `<div class="pending-detail-owner">担当: ${esc(r.item.owner)}</div>` : ''}
                    ${r.item.due ? `<div class="pending-detail-due">完了予定日: ${esc(r.item.due)}</div>` : ''}
                </div>
                ${canComplete ? `<button class="btn-primary-xs" onclick="completePendingItem('${r.req.id}', ${r.idx}, {skipModalFallback:true})">完了にする</button>` : ''}
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
    const isOwner     = !!(item.owner && currentProfile?.name === item.owner);
    const isMyRequest = req.requester_id === currentUser.id;
    return isQualityOrSeikan || isOwner || (!isQaFlow && isMyRequest);
}

// ===== Tab Switch（廃止済み・後方互換用スタブ） =====
function switchTab(tab) {
    // 新レイアウトではサイドパネルを使用するため、この関数は何もしない
    currentTab = tab;
}

// ===== Flow Modal Preset（カードのステップサークルクリックで工番・機械をプリセット） =====
async function openFlowModalPreset(el) {
    const flowType   = el.dataset.flowType;
    const projectNum = el.dataset.num;
    const machineName = el.dataset.machine;

    const findCb = (listId) =>
        [...document.querySelectorAll(`#${listId} input[type="checkbox"]`)].find(c => c.value === machineName);

    if (flowType === 'assembly' || flowType === 'test_run' || flowType === 'shipping_prep') {
        openSubmitModal(flowType);
        currentProjectNum = projectNum;
        const p = projectsMap[projectNum] || {};
        const label = [p.customer_name, p.project_details].filter(Boolean).join('　');
        document.getElementById('submit_project_display').textContent = projectNum;
        await onProjectChange();
        const cb = findCb('submit_machine_list');
        if (cb) { cb.checked = true; await onMachineChange(); }
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
let sheetAutoSaveTimer = null;

function selectApprover(role) {
    selectedApproverRole = role;
    document.getElementById('btn_approver_manager').classList.toggle('active',  role === 'assembly_manager');
    document.getElementById('btn_approver_director').classList.toggle('active', role === 'assembly_director');
}

function openSubmitModal(flowType = 'assembly') {
    currentFlowType = flowType;
    currentProjectNum = '';
    document.getElementById('submit_project_display').textContent = '';
    document.getElementById('submit_project_info').style.display = 'none';
    document.getElementById('submit_machine_group').style.display = 'none';
    document.getElementById('submit_machine_list').innerHTML = '';
    document.getElementById('flow_detect_group').style.display = 'none';
    document.getElementById('submit_note').value = '';

    // モーダルタイトルをフロー種別で切り替え
    document.getElementById('submit_modal_title').textContent =
        flowType === 'test_run'     ? '試運転完了通知 — 申請' :
        flowType === 'shipping_prep' ? '出荷準備完了 — 申請' : '組立完了通知 — 申請';

    // 承認者選択グループは非表示（assembly は課長・部長両方に通知するため選択不要）
    document.getElementById('submit_approver_group').style.display = 'none';

    // チェックシートリセット
    sheetChecks = {};
    pendingItems = [];
    const needsSheetModal = flowType === 'assembly' || flowType === 'test_run';
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
        const sheetLabel = flowType === 'test_run'
            ? '次へ（社内試運転完了チェックシートを入力する）→'
            : '次へ（機械組立完了チェックシートを入力する）→';
        if (btnGoSheet) { btnGoSheet.style.display = ''; btnGoSheet.textContent = sheetLabel; }
        if (btnSubmit)  btnSubmit.style.display  = 'none';
    } else {
        if (btnGoSheet) btnGoSheet.style.display = 'none';
        if (btnSubmit)  { btnSubmit.style.display = ''; btnSubmit.disabled = false; }
    }

    document.getElementById('submit_modal').classList.add('open');
    ui.send('OPEN_SUBMIT');
}

function closeSubmitModal() {
    document.getElementById('submit_modal').classList.remove('open');
    ui.send('CLOSE');
}

// ===== 自主点検シート =====
async function goToSheetStep() {
    const projectNum = currentProjectNum;
    const machineNums = getSelectedMachines('submit_machine_list');
    if (!projectNum)              { showToast('工事番号を選択してください', 'error'); return; }
    if (machineNums.length === 0) { showToast('機械を選択してください', 'error'); return; }
    const needsSheetFlow = currentFlowType === 'assembly' || currentFlowType === 'test_run';
    if (!needsSheetFlow) { submitRequest(); return; }
    if (machineNums.length > 1) {
        showToast('報告書は1台ずつ申請してください', 'error');
        return;
    }

    showLoading('下書きを保存中...');
    try {
        const machine = machineNums[0];
        const note = document.getElementById('submit_note').value.trim();

        const { data: existing } = await db.from('approval_requests')
            .select('id')
            .eq('project_number', projectNum)
            .eq('machine_name', machine)
            .eq('flow_type', currentFlowType)
            .eq('status', 'draft')
            .eq('requester_id', currentUser.id)
            .maybeSingle();

        if (existing) {
            currentDraftId = existing.id;
            await db.from('approval_requests')
                .update({ note: note || null })
                .eq('id', existing.id);
        } else {
            const { data: newDraft, error } = await db.from('approval_requests').insert({
                project_number: projectNum,
                machine_name:   machine,
                flow_type:      currentFlowType,
                status:         'draft',
                requester_id:   currentUser.id,
                note:           note || null
            }).select().single();
            if (error) throw error;
            currentDraftId = newDraft.id;
        }

        const sheetUrl = currentFlowType === 'test_run' ? 'test_run_sheet.html' : 'sheet.html';
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
    const sheetUrl = currentFlowType === 'test_run' ? 'test_run_sheet.html' : 'sheet.html';
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

        const titleMap = { assembly: '組立完了通知 — 申請', test_run: '試運転完了通知 — 申請' };
        document.getElementById('submit_modal_title').textContent = titleMap[draft.flow_type] || '申請';
        document.getElementById('submit_approver_group').style.display = 'none';

        const p = projectsMap[draft.project_number] || {};
        document.getElementById('submit_project_display').textContent = draft.project_number;
        document.getElementById('submit_customer_display').textContent     = p.customer_name  || '—';
        document.getElementById('submit_project_name_display').textContent = p.project_details || '—';
        document.getElementById('submit_project_info').style.display = 'contents';
        document.getElementById('submit_note').value = draft.note || '';
        document.getElementById('submit_machine_group').style.display = 'block';
        document.getElementById('flow_detect_group').style.display = 'none';

        await _loadMachineCheckboxes(draft.project_number, 'submit_machine_list', 'onMachineChange');
        const cb = [...document.querySelectorAll('#submit_machine_list input[type="checkbox"]')]
            .find(c => c.value === draft.machine_name);
        if (cb) { cb.checked = true; await onMachineChange(); }

        const btnGoSheet = document.getElementById('btn_go_sheet');
        const btnSubmit  = document.getElementById('submit_btn');
        const indicator  = document.getElementById('sheet_entry_indicator');

        const needsSheet = draft.flow_type === 'assembly' || draft.flow_type === 'test_run';
        const sheetLabel = draft.flow_type === 'test_run' ? '社内試運転完了チェックシート' : '機械組立完了チェックシート';

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
        if (type !== 'sheet_complete') return;
        await loadMineSide();
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
        c.innerHTML = '<div style="color:#999;font-size:12px;padding:4px 0;">ペンディング項目はありません</div>';
        return;
    }
    const lbl = `<span style="display:block;font-size:10px;line-height:1.4;color:transparent;user-select:none;">完了予定日</span>`;
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
                <span style="display:block;font-size:10px;line-height:1.4;color:#999;">担当者（任意）</span>
                <input type="text" class="pending-content" placeholder="担当者名" value="${esc(item.owner || '')}"
                       oninput="pendingItems[${i}].owner=this.value">
            </div>
            <div style="display:flex;flex-direction:column;width:135px;flex-shrink:0;">
                <span style="display:block;font-size:10px;line-height:1.4;color:#999;">完了予定日</span>
                <input type="date" class="pending-due" value="${esc(item.due)}"
                       onchange="pendingItems[${i}].due=this.value">
            </div>
            <label style="display:flex;flex-direction:column;flex-shrink:0;align-items:center;gap:2px;">
                <span style="font-size:10px;color:#999;">出荷後対応</span>
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
    const projectNum = currentProjectNum;
    const machineNums = getSelectedMachines('submit_machine_list');
    if (!projectNum)          { showToast('工事番号が設定されていません', 'error'); return; }
    if (currentFlowType === 'shipping_prep') {
        const blockerLists = await Promise.all(machineNums.map(m => _getPrepBlockers(projectNum, m)));
        if (blockerLists.some(list => list.length > 0)) {
            showToast('前フローが未完了のため申請できません', 'error');
            return;
        }
    }
    if (machineNums.length === 0) { showToast('機械を選択してください', 'error'); return; }

    const note    = document.getElementById('submit_note').value.trim();
    const btn     = document.getElementById('submit_btn');
    btn.disabled  = true;
    btn.textContent = '申請中...';
    showLoading('処理中...');

    try {
        const submitterRole = getEffectiveRole();
        let firstApproverRole = null;

        // 機械ごとに申請レコードを作成（複数機械対応）
        for (const machineNum of machineNums) {
            // 機械ごとにタスクフラグを取得
            const { data: mTasks } = await db.from('tasks')
                .select('text').eq('project_number', projectNum).eq('machine', machineNum);
            const mNames = (mTasks || []).map(t => t.text);

            let req, e1;
            if (currentDraftId && machineNum === machineNums[0]) {
                // 下書きを更新して提出（sheet_data は sheet.html で保存済み）
                ({ data: req, error: e1 } = await db.from('approval_requests').update({
                    status:         'submitted',
                    note:           note || null,
                    test_run:       mNames.includes('試運転'),
                    has_inspection: mNames.includes('外観検査')
                }).eq('id', currentDraftId).select().single());
            } else {
                const sheetData = currentFlowType === 'assembly' ? collectSheetData() : null;
                ({ data: req, error: e1 } = await db.from('approval_requests').insert({
                    project_number: projectNum,
                    machine_name:   machineNum,
                    flow_type:      currentFlowType,
                    status:         'submitted',
                    requester_id:   currentUser.id,
                    note:           note || null,
                    test_run:       mNames.includes('試運転'),
                    has_inspection: mNames.includes('外観検査'),
                    sheet_data:     sheetData
                }).select().single());
            }
            if (e1) throw e1;

            // 承認ステップ設定
            let stepsToInsert;
            let notifyRoles; // 承認依頼通知を送るロールの配列
            if (currentFlowType === 'assembly') {
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
            } else if (currentFlowType === 'test_run') {
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
            } else {
                // shipping_prep: 品証・製管の並列2ステップ（どちらかが承認で完了、製管は品証不在時の緊急対応）
                // 通知は品証のみへ送る（製管へはメール送信時にCCで届く）
                stepsToInsert = [
                    { request_id: req.id, step_order: 1, approver_role: 'quality',            status: 'pending' },
                    { request_id: req.id, step_order: 2, approver_role: 'production_control',  status: 'pending' }
                ];
                notifyRoles = ['quality'];
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

        currentDraftId = null;
        closeSubmitModal();
        await refreshAll();
        ui.send('SAVED');
        const count = machineNums.length;
        const isParallelStaff = (currentFlowType === 'assembly' && submitterRole !== 'assembly_manager') ||
                                (currentFlowType === 'test_run'  && submitterRole !== 'operations_manager');
        const approverLabel = currentFlowType === 'shipping_prep'
            ? '品証（製管にもCCで届きます）'
            : isParallelStaff
                ? (currentFlowType === 'assembly' ? '組立課長・部長' : '操業課長・部長')
                : ({ assembly_director: '組立部長', operations_director: '操業部長' }[firstApproverRole] || firstApproverRole);
        showToast(`${count}機械の申請をしました。\n${approverLabel}に承認依頼が届きます。`, 'success');
    } catch (e) {
        showToast('申請に失敗しました: ' + e.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = '申請する';
        hideLoading();
    }
}

// ===== ペンディングセクション HTML 生成 =====
function buildPendingSectionInner(req, isMyRequest) {
    const isQaFlow   = QA_MEETING_FLOWS.includes(req.flow_type);
    // 組立フローは「申請者本人」または「品証・製管」が完了操作できる（担当者本人は下記itemCanComplete参照）
    const statusOkForNonQa = ['submitted', 'in_review', 'approved'].includes(req.status);
    const canComplete = isQaFlow
        ? null // QAフローは項目ごとに判定する（下記itemCanComplete）
        : (statusOkForNonQa && (isMyRequest || isQualityOrSeikan));
    // ペンディング項目は品証・製管であれば編集・削除できる（組立フローは提出〜承認済みの間、QAフローは開催案内送信済み〜完了後も可能）
    const canManage = isQualityOrSeikan && (isQaFlow ? ['submitted', 'approved'].includes(req.status) : statusOkForNonQa);
    const allItems = req.sheet_data?.pending_items || [];
    const items = allItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => (item.content || item.machine));
    if (!items.length) return '';
    const editLbl = `<span style="display:block;font-size:10px;line-height:1.4;color:#999;">完了予定日</span>`;
    return `
        <hr class="section-divider">
        <div class="section-title">ペンディング項目</div>
        ${items.map(({ item, idx }, pos) => {
            // QAフロー・組立フローともに「品証」または「担当者本人（項目に担当者が設定されている場合）」も完了操作できる
            const itemCanComplete = isQaFlow
                ? (['submitted', 'approved'].includes(req.status) && (isQualityOrSeikan || (item.owner && currentProfile?.name === item.owner)))
                : (canComplete || (statusOkForNonQa && item.owner && currentProfile?.name === item.owner));
            if (canManage && qaEditingPendingIdx === idx) {
                return `
            <div class="pending-detail-row pending-detail-editing">
                <div class="pending-detail-num">${circledNum(pos + 1)}</div>
                <div class="pending-detail-content qa-pending-row" style="display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;gap:6px;">
                        <div style="display:flex;flex-direction:column;flex:1;">
                            <span style="display:block;font-size:13px;line-height:1.4;color:#999;">場所</span>
                            <input type="text" id="qa_edit_location_${idx}" class="pending-content" placeholder="場所" value="${esc(item.location || '')}">
                        </div>
                        <div style="display:flex;flex-direction:column;flex:1;">
                            <span style="display:block;font-size:13px;line-height:1.4;color:#999;">担当者</span>
                            <input type="text" id="qa_edit_owner_${idx}" class="pending-content" placeholder="担当者名" value="${esc(item.owner || '')}">
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap;">
                        <div style="display:flex;flex-direction:column;flex:1;min-width:120px;">
                            <span style="display:block;font-size:13px;line-height:1.4;color:#999;">内容</span>
                            <input type="text" id="qa_edit_content_${idx}" class="pending-content" placeholder="内容" value="${esc(item.content)}">
                        </div>
                        <div style="display:flex;flex-direction:column;flex-shrink:0;">
                            ${editLbl}
                            <input type="date" id="qa_edit_due_${idx}" class="pending-due" value="${esc(item.due || '')}">
                        </div>
                        <label style="display:flex;flex-direction:column;flex-shrink:0;gap:4px;">
                            <span style="display:block;font-size:13px;line-height:1.4;color:#999;">出荷後対応</span>
                            <input type="checkbox" id="qa_edit_ship_after_${idx}" ${item.ship_after ? 'checked' : ''} style="margin-top:2px;">
                        </label>
                    </div>
                    <div style="display:flex;flex-direction:column;">
                        <span style="display:block;font-size:13px;line-height:1.4;color:#999;">写真</span>
                        ${item.photo_path ? `<img src="${esc(pendingPhotoUrl(item.photo_path))}" class="pending-detail-photo-thumb" title="クリックで拡大表示" onclick="openPhotoLightbox('${esc(pendingPhotoUrl(item.photo_path))}')">` : ''}
                        <div class="photo-dropzone">
                            <input type="file" accept="image/*" capture="environment" id="qa_edit_photo_${idx}" style="display:none;">
                            <span class="photo-dropzone-label">クリックまたはドラッグ＆ドロップで写真を選択</span>
                        </div>
                        ${item.photo_path ? `
                        <label style="font-size:12px;color:#999;display:flex;align-items:center;gap:2px;">
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
                    <div class="pending-detail-text">${item.machine ? `<span class="pending-detail-machine">${esc(item.machine)}</span> ` : ''}${esc(item.content || '—')}${item.completed ? ' <span style="font-size:11px;color:#1c8f4d;background:#eafaf0;border-radius:4px;padding:1px 6px;">完了</span>' : (pendingDueSoon(item.due) ? ' <span style="font-size:11px;color:#c0392b;background:#fde8e8;border-radius:4px;padding:1px 6px;">期日間近</span>' : '')}${item.ship_after ? ' <span class="badge-ship-after" style="font-size:11px;color:#a06a00;background:#fff3d6;border-radius:4px;padding:1px 6px;">出荷後対応</span>' : ''}</div>
                    ${item.location ? `<div class="pending-detail-owner">場所: ${esc(item.location)}</div>` : ''}
                    ${item.owner ? `<div class="pending-detail-owner">担当: ${esc(item.owner)}</div>` : ''}
                    ${item.due && !item.completed ? `<div class="pending-detail-due">期日: ${esc(item.due)}</div>` : ''}
                    ${item.completed ? `<div class="pending-detail-date">完了: ${esc(item.completed_date || '')}</div>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    ${itemCanComplete ? (item.completed
                        ? `<button class="btn-undo-xs" onclick="uncompletePendingItem('${req.id}', ${idx})">取り消す</button>`
                        : `<button class="btn-primary-xs" onclick="completePendingItem('${req.id}', ${idx})">完了にする</button>`) : ''}
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
        body = '<div style="color:#888; font-size:14px; padding:4px 0;">開催日以降にペンディング確認・完了操作ができます。</div>';
    } else {
        const pendingHtml = buildPendingSectionInner(req, isMyRequest);
        const hasSendableItems = (req.sheet_data?.pending_items || []).some(it => it.content);
        const sendCardBtnHtml = (isQualityOrSeikan && hasSendableItems) ? `
            <div style="margin-top:10px;">
                <button type="button" class="btn btn-primary" title="検査の開催案内と同じ宛先に送信されます" onclick="sendFixCard('${req.id}')">✉ 手直しカードを送信</button>
            </div>
        ` : '';
        const addFormHtml = canManage ? `
            <div class="qa-pending-add-box">
                <div class="qa-pending-add-label">ペンディングを追加</div>
                <div class="pending-row qa-pending-row" style="flex-direction:column;align-items:stretch;gap:8px;">
                    <div style="display:flex;gap:6px;">
                        <div style="display:flex;flex-direction:column;flex:1;">
                            <span style="display:block;font-size:13px;line-height:1.4;color:#999;">場所（任意）</span>
                            <input type="text" id="qa_pending_location" class="pending-content" placeholder="場所">
                        </div>
                        <div style="display:flex;flex-direction:column;flex:1;">
                            <span style="display:block;font-size:13px;line-height:1.4;color:#999;">担当者（任意）</span>
                            <input type="text" id="qa_pending_owner" class="pending-content" placeholder="担当者名">
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap;">
                        <div style="display:flex;flex-direction:column;flex:1;min-width:120px;">
                            <span style="display:block;font-size:13px;line-height:1.4;color:#999;">内容</span>
                            <input type="text" id="qa_pending_content" class="pending-content" placeholder="内容">
                        </div>
                        <div style="display:flex;flex-direction:column;flex-shrink:0;">
                            <span style="display:block;font-size:13px;line-height:1.4;color:#999;">完了予定日</span>
                            <input type="date" id="qa_pending_due" class="pending-due">
                        </div>
                        <label style="display:flex;flex-direction:column;flex-shrink:0;gap:4px;">
                            <span style="display:block;font-size:13px;line-height:1.4;color:#999;">出荷後対応</span>
                            <input type="checkbox" id="qa_pending_ship_after" style="margin-top:2px;">
                        </label>
                    </div>
                    <div style="display:flex;flex-direction:column;">
                        <span style="display:block;font-size:13px;line-height:1.4;color:#999;">写真（任意）</span>
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
            : `<div style="color:#888; font-size:14px; padding:4px 0;">ペンディングなし${req.status === 'approved' ? '・確認完了' : ''}</div>`;
    }

    // 開催案内が過ぎておりペンディング項目がある場合は、buildPendingSectionInner側の区切り線が使われるため、ここでは重ねて出さない
    const needsOwnDivider = !meetingPassed || !(req.sheet_data?.pending_items || []).some(it => it.content || it.machine);
    return `${needsOwnDivider ? '<hr class="section-divider">' : ''}
        ${body}`;
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
    const shippingDateMismatches = [];
    if (['shipping', 'simple_inspection', 'inspection'].includes(req.flow_type)) {
        const [{ data: factoryTasks }, { data: packingTasks }] = await Promise.all([
            req.machine_name
                ? db.from('tasks').select('end_date').eq('project_number', pNum).eq('machine', req.machine_name).eq('text', '工場出荷').limit(1)
                : Promise.resolve({ data: [] }),
            db.from('tasks').select('end_date').eq('project_number', pNum).eq('text', '梱包出荷').limit(1)
        ]);
        hasPackingShipping = !!(packingTasks && packingTasks.length > 0);

        const factoryTaskDate = factoryTasks?.[0]?.end_date || null;
        const packingTaskDate = packingTasks?.[0]?.end_date || null;
        const approvalFactoryDate = req.flow_type === 'shipping' ? req.confirmed_shipping_date : req.tentative_shipping_date;
        const approvalPackingDate = req.flow_type === 'shipping' ? req.packing_confirmed_shipping_date : req.packing_tentative_shipping_date;

        if (approvalFactoryDate && factoryTaskDate && approvalFactoryDate !== factoryTaskDate) {
            shippingDateMismatches.push(`工場出荷: 承認フロー ${fmtDate(approvalFactoryDate)} / 工程表 ${fmtDate(factoryTaskDate)}`);
        }
        if (approvalPackingDate && packingTaskDate && approvalPackingDate !== packingTaskDate) {
            shippingDateMismatches.push(`梱包出荷: 承認フロー ${fmtDate(approvalPackingDate)} / 工程表 ${fmtDate(packingTaskDate)}`);
        }
    }
    currentDetailHasPackingShipping = hasPackingShipping;
    const slbl   = (req.flow_type === 'shipping' && req.status === 'submitted')
        ? '常務承認待ち'
        : (QA_MEETING_FLOWS.includes(req.flow_type) && req.status === 'submitted')
        ? '開催待ち'
        : (QA_MEETING_FLOWS.includes(req.flow_type) && req.status === 'approved')
        ? '開催済み'
        : (STATUS_LABELS[req.status] || req.status);

    // 自分が担当すべきステップか確認
    const myStep = steps.find(s =>
        s.approver_role === getEffectiveRole() &&
        s.status        === 'pending' &&
        (
            ((req.flow_type === 'assembly' || req.flow_type === 'test_run' || req.flow_type === 'shipping_prep') && req.status === 'submitted') ||
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
    const canChangeTentativeDate = (req.flow_type === 'simple_inspection' || req.flow_type === 'inspection')
        && !!req.tentative_shipping_date && (isSales || isQualityOrSeikan) && !myStep;
    const changeDateOnclick = canChangeConfirmedDate ? `showChangeConfirmedDateFooter('${req.id}')` : `showChangeTentativeDateFooter('${req.id}')`;
    const changeDateLabel = canChangeConfirmedDate
        ? (hasPackingShipping ? '工場出荷日・梱包出荷日を変更する' : '確定出荷日を変更する')
        : (hasPackingShipping ? '工場出荷日・梱包出荷日を変更する' : '仮出荷予定日を変更する');
    // ズレ警告バナー内に変更ボタンを表示する場合は、フッター側には重複して表示しない
    const changeDateBannerButtonHtml = (canChangeConfirmedDate || canChangeTentativeDate)
        ? `<button type="button" class="btn btn-outline" onclick="${changeDateOnclick}">${changeDateLabel}</button>`
        : '';
    const changeDateFooterLinkHtml = (!shippingDateMismatches.length && (canChangeConfirmedDate || canChangeTentativeDate))
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
    if (req.flow_type === 'assembly' || req.flow_type === 'test_run') {
        // assembly/test_run: 単一の「承認」として表示、承認者名・役職を表示
        const approvedStep = steps.find(s => s.status === 'approved');
        const rejectedStep = steps.find(s => s.status === 'rejected');
        const activeStep   = approvedStep || rejectedStep;
        let icon, sc;
        if      (approvedStep)                          { icon = '✓'; sc = 'sc-approved'; }
        else if (rejectedStep)                          { icon = '<span class="fc-x-icon">×</span>'; sc = 'sc-rejected'; }
        else if (req.status === 'submitted')            { icon = '<span class="fc-play-icon">▶</span>'; sc = 'sc-pending'; }
        else                                            { icon = '○';  sc = 'sc-waiting'; }
        const who      = activeStep?.approver_id ? (approverNames[activeStep.approver_id] || '—') : null;
        const when     = activeStep?.decided_at ? fmtDate(activeStep.decided_at) : '';
        const label    = approvedStep ? '承認' : rejectedStep ? '却下' : (req.status === 'submitted' ? '承認待ち' : '未承認');
        stepsHtml = `
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
    } else {
        stepsHtml = steps.map(s => {
            let icon, sc;
            if      (s.status === 'approved') { icon = '✓'; sc = 'sc-approved'; }
            else if (s.status === 'rejected') { icon = '<span class="fc-x-icon">×</span>'; sc = 'sc-rejected'; }
            else if (s.status === 'pending' &&
                     (((req.flow_type === 'assembly' || req.flow_type === 'test_run' || req.flow_type === 'shipping_prep') && req.status === 'submitted') ||
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
    } else if ((req.flow_type === 'simple_inspection' || req.flow_type === 'inspection') && req.status === 'approved' && !req.tentative_shipping_date) {
        statusNote = '営業担当者による仮出荷予定日の入力待ちです。営業担当者は画面下部の入力欄からご入力ください。';
    } else if ((req.flow_type === 'simple_inspection' || req.flow_type === 'inspection') && req.status === 'approved' && req.tentative_shipping_date && !req.tentative_shipping_confirmed_at) {
        statusNote = '営業担当者が仮出荷予定日を入力しました。品証・製管が内容を確認し「確認して確定する」を押すと確定します。';
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

    // ヘッダー下の補足情報（1行目: 開催日・場所、2行目: 出荷予定日。仮出荷予定日は品証・製管の確認が完了するまでは表示しない）
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
        shippingInfoParts.push(`${req.packing_confirmed_shipping_date ? '工場出荷確定日' : '確定出荷日'}: ${fmtDate(req.confirmed_shipping_date)}`);
    }
    if ((req.flow_type === 'simple_inspection' || req.flow_type === 'inspection') && req.packing_tentative_shipping_date && req.tentative_shipping_confirmed_at) {
        shippingInfoParts.push(`梱包出荷予定日: ${fmtDate(req.packing_tentative_shipping_date)}`);
    }
    if ((req.flow_type === 'simple_inspection' || req.flow_type === 'inspection') && req.tentative_shipping_date && req.tentative_shipping_confirmed_at) {
        shippingInfoParts.push(`${req.packing_tentative_shipping_date ? '工場出荷予定日' : '仮出荷予定日'}: ${fmtDate(req.tentative_shipping_date)}`);
    }

    // ヘッダー1行目: 工事番号【機械名】　客先名／2行目: 工事名（客先名の開始位置に揃える）
    const headerLine1Left = `${esc(pNum)}${req.machine_name ? `【${esc(req.machine_name)}】` : ''}`;
    document.getElementById('detail_body').innerHTML = `
        <div style="display:grid; grid-template-columns:max-content 1fr; column-gap:10px; align-items:baseline;">
            <div style="font-size:18px;font-weight:bold;color:#1e3a5f;white-space:nowrap;">${headerLine1Left}</div>
            <div style="font-size:18px;font-weight:bold;color:#1e3a5f;">${esc(pInfo.customer_name || '')}</div>
            ${pInfo.project_details ? `<div></div><div style="font-size:14px;color:#666;margin-top:3px;">${esc(pInfo.project_details)}</div>` : ''}
        </div>

        <div style="margin:10px 0 8px;">
            <span class="status-badge ${cls}">${slbl}</span>
            ${req.is_resubmit ? ' <span class="resubmit-badge">再申請</span>' : ''}
        </div>
        ${eventInfoParts.length ? `<div style="font-size:14px;color:#888;margin-top:4px;display:flex;flex-wrap:wrap;column-gap:16px;row-gap:2px;">${eventInfoParts.map(p => `<span style="white-space:nowrap;">${p}</span>`).join('')}</div>` : ''}
        ${shippingInfoParts.length ? `<div style="font-size:14px;color:#888;margin-top:4px;display:flex;flex-wrap:wrap;column-gap:16px;row-gap:2px;">${shippingInfoParts.map(p => `<span style="white-space:nowrap;">${p}</span>`).join('')}</div>` : ''}
        ${req.note ? `<div style="font-size:14px;color:#888;margin-top:2px;">備考: ${esc(req.note)}</div>` : ''}
        ${shippingDateMismatches.length ? `
        <div style="background:#fdecea;border:1px solid #f5b5ac;border-radius:4px;padding:9px 12px;font-size:14px;color:#a33a2c;margin-top:8px;">
            <div style="white-space:nowrap;overflow-x:auto;">⚠ 工程表の出荷日とズレがあります（${shippingDateMismatches.join('、')}）。</div>
            ${changeDateBannerButtonHtml ? `<div style="margin-top:8px;">${changeDateBannerButtonHtml}</div>` : ''}
        </div>` : ''}
        ${statusNote ? `<div style="background:#fff8e6; border:1px solid #f0d98c; border-radius:4px; padding:9px 12px; font-size:14px; color:#7a5c00; margin-top:8px;">${esc(statusNote)}</div>` : ''}

        <hr class="section-divider">
        <div class="section-title">申請・承認状況</div>
        <div class="steps-list">${QA_MEETING_FLOWS.includes(req.flow_type) ? '' : appliedStepHtml}${stepsHtml}</div>
        ${req.flow_type === 'shipping' ? `
        <hr class="section-divider">
        <div>
            <div style="font-size:14px; color:#888; font-weight:bold; margin-bottom:6px;">担当者確認（参考）</div>
            <div style="font-size:15px; line-height:2; background:#f8f9fa; border-radius:4px; padding:8px 12px;">
                <div><span style="color:#888; font-size:13px; width:36px; display:inline-block;">設計</span>${esc(shippingOwners?.sekkei || 'なし')}</div>
                <div><span style="color:#888; font-size:13px; width:36px; display:inline-block;">組立</span>${esc(shippingOwners?.kumitatе || 'なし')}</div>
                <div><span style="color:#888; font-size:13px; width:36px; display:inline-block;">操業</span>${esc(shippingOwners?.shiunten || 'なし')}</div>
                <div><span style="color:#888; font-size:13px; width:36px; display:inline-block;">営業</span>${esc(shippingOwners?.sales || 'なし')}</div>
            </div>
        </div>` : ''}
        ${req.sheet_data && (req.flow_type === 'assembly' || req.flow_type === 'test_run') ? (() => {
            const isAssembly = req.flow_type === 'assembly';
            const isApproved = req.status === 'approved';
            const sectionTitle = isAssembly
                ? (isApproved ? '機械組立完了報告書' : '機械組立完了チェックシート')
                : (isApproved ? '社内試運転完了報告書' : '社内試運転完了チェックシート');
            const btnLabel = isApproved ? sectionTitle : (isAssembly ? 'チェックシート' : 'チェックシート');
            const sheetFile = isAssembly ? 'sheet.html' : 'test_run_sheet.html';

            // 却下されて再申請可能な本人には、閲覧専用ではなく編集可能なチェックシートを開く
            const canEdit  = req.status === 'rejected' && isMyRequest;
            const sheetUrl = canEdit ? `${sheetFile}?draft_id=${req.id}` : `${sheetFile}?view=1&id=${req.id}`;
            const linkLabel = canEdit ? `${btnLabel}を修正する →` : `${btnLabel}を確認する →`;
            return `<hr class="section-divider">
        <div class="section-title">${sectionTitle}</div>
        <button class="btn btn-secondary" style="font-size:14px; padding:7px 18px; margin-top:2px;" onclick="window.open('${sheetUrl}', '_blank')">${linkLabel}</button>
        <div id="pending_detail_section">${buildPendingSectionInner(req, isMyRequest)}</div>`;
        })() : ''}
        ${QA_MEETING_FLOWS.includes(req.flow_type) && req.status !== 'cancelled'
            ? `<div id="qa_result_section">${buildQaResultSectionInner(req, isMyRequest)}</div>`
            : ''}
        ${req.flow_type === 'shipping' ? `
        <hr class="section-divider">
        <div class="section-title">出荷確認書</div>
        <button class="btn btn-secondary" style="font-size:14px; padding:7px 18px; margin-top:2px;" onclick="window.open('shipping_sheet.html?view=1&id=${req.id}', '_blank')">出荷確認書を確認する →</button>` : ''}
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
        footer.innerHTML = buildSalesDateFooterInner(req, hasPackingShipping);
    } else if (req.flow_type === 'shipping' && req.status === 'awaiting_shipping_confirm' && (isMyRequest || isQualityOrSeikan)) {
        footer.innerHTML = `
            ${changeDateFooterLinkHtml}
            <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
            <button class="btn btn-success"   onclick="confirmAndSubmitShipping('${req.id}')">内容を確認し申請する</button>
        `;
    } else if ((req.flow_type === 'simple_inspection' || req.flow_type === 'inspection') && req.status === 'approved'
        && !req.tentative_shipping_date && (isSales || isQualityOrSeikan)) {
        footer.innerHTML = buildTentativeDateFooterInner(req, hasPackingShipping);
    } else if ((req.flow_type === 'simple_inspection' || req.flow_type === 'inspection') && req.status === 'approved'
        && req.tentative_shipping_date && !req.tentative_shipping_confirmed_at && isQualityOrSeikan) {
        footer.innerHTML = `
            ${changeDateFooterLinkHtml}
            <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
            <button class="btn btn-success"   onclick="confirmTentativeShippingDate('${req.id}')">確認して確定する</button>
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
function buildSalesDateFooterInner(req, hasPackingShipping) {
    const packingBox = hasPackingShipping ? `
        <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
            <span style="font-size:14px;color:#c0392b;font-weight:bold;">● 梱包出荷日（確定）を入力してください</span>
            <input type="date" id="packing_sales_date_input" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:14px;margin-top:4px;">
        </div>` : '';
    return `
        <div style="margin-right:auto;display:flex;gap:10px;flex-wrap:wrap;">
            ${packingBox}
            <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
                <span style="font-size:14px;color:#c0392b;font-weight:bold;">● ${hasPackingShipping ? '工場出荷日（確定）' : '確定出荷日'}を入力してください</span>
                <input type="date" id="sales_date_input" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:14px;margin-top:4px;">
            </div>
        </div>
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
        <button class="btn btn-success"   onclick="submitSalesShippingDate('${req.id}')">入力する</button>
    `;
}

// ===== 営業: 仮出荷予定日入力フッター =====
// hasPackingShipping=true の場合、梱包出荷日（仮）の入力欄も並べて表示する
function buildTentativeDateFooterInner(req, hasPackingShipping) {
    const packingBox = hasPackingShipping ? `
        <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
            <span style="font-size:14px;color:#c0392b;font-weight:bold;">● 梱包出荷日（仮）を入力してください</span>
            <input type="date" id="packing_tentative_date_input" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:14px;margin-top:4px;">
        </div>` : '';
    return `
        <div style="margin-right:auto;display:flex;gap:10px;flex-wrap:wrap;">
            ${packingBox}
            <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
                <span style="font-size:14px;color:#c0392b;font-weight:bold;">● ${hasPackingShipping ? '工場出荷日（仮）' : '仮出荷予定日'}を入力してください</span>
                <input type="date" id="tentative_date_input" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:14px;margin-top:4px;">
            </div>
        </div>
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
        <button class="btn btn-success"   onclick="submitTentativeShippingDate('${req.id}')">入力する</button>
    `;
}

// ===== 「日付を変更する」クリック時にフッターを編集フォームへ切り替える =====
function showChangeConfirmedDateFooter(requestId) {
    if (!currentDetailReq || currentDetailReq.id !== requestId) return;
    document.getElementById('detail_footer').innerHTML = buildChangeConfirmedDateFooterInner(currentDetailReq, currentDetailHasPackingShipping);
}
function showChangeTentativeDateFooter(requestId) {
    if (!currentDetailReq || currentDetailReq.id !== requestId) return;
    document.getElementById('detail_footer').innerHTML = buildChangeTentativeDateFooterInner(currentDetailReq, currentDetailHasPackingShipping);
}

// ===== 確定出荷日の変更フォーム（現在値をプリフィルし、常務承認済み等であれば再承認が必要になる） =====
function buildChangeConfirmedDateFooterInner(req, hasPackingShipping) {
    const packingBox = hasPackingShipping ? `
        <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
            <span style="font-size:14px;color:#c0392b;font-weight:bold;">● 梱包出荷日（確定）を変更してください</span>
            <input type="date" id="packing_sales_date_input" value="${req.packing_confirmed_shipping_date || ''}" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:14px;margin-top:4px;">
        </div>` : '';
    return `
        <div style="margin-right:auto;display:flex;gap:10px;flex-wrap:wrap;">
            ${packingBox}
            <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
                <span style="font-size:14px;color:#c0392b;font-weight:bold;">● ${hasPackingShipping ? '工場出荷日（確定）' : '確定出荷日'}を変更してください</span>
                <input type="date" id="sales_date_input" value="${req.confirmed_shipping_date || ''}" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:14px;margin-top:4px;">
            </div>
        </div>
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
        <button class="btn btn-success"   onclick="changeConfirmedShippingDate('${req.id}')">変更する</button>
    `;
}

// ===== 仮出荷予定日の変更フォーム（現在値をプリフィルし、品証・製管確認済みであれば再確認が必要になる） =====
function buildChangeTentativeDateFooterInner(req, hasPackingShipping) {
    const packingBox = hasPackingShipping ? `
        <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
            <span style="font-size:14px;color:#c0392b;font-weight:bold;">● 梱包出荷日（仮）を変更してください</span>
            <input type="date" id="packing_tentative_date_input" value="${req.packing_tentative_shipping_date || ''}" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:14px;margin-top:4px;">
        </div>` : '';
    return `
        <div style="margin-right:auto;display:flex;gap:10px;flex-wrap:wrap;">
            ${packingBox}
            <div class="sales-date-highlight" style="display:flex;flex-direction:column;background:#fde8e8;border:2px solid #e74c3c;border-radius:6px;padding:8px 14px;">
                <span style="font-size:14px;color:#c0392b;font-weight:bold;">● ${hasPackingShipping ? '工場出荷日（仮）' : '仮出荷予定日'}を変更してください</span>
                <input type="date" id="tentative_date_input" value="${req.tentative_shipping_date || ''}" style="padding:8px 10px;border:1px solid #e74c3c;border-radius:4px;font-size:14px;margin-top:4px;">
            </div>
        </div>
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
        <button class="btn btn-success"   onclick="changeTentativeShippingDate('${req.id}')">変更する</button>
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
    document.getElementById('detail_modal').classList.remove('open');
    ui.send('CLOSE');
}

// ===== 設定画面（製管2名のみ） =====
let settingsView            = 'menu'; // 'menu' | 'flow_toggle' | 'recipients_list' | 'recipients_detail'
let settingsToggleProject   = '';     // フローON/OFF画面で選択中の工事番号
let settingsTogglePending   = {};     // 未保存の変更差分 { "machineflow_type": boolean(有効か) }

async function openSettingsModal() {
    if (!ADMIN_EMAILS.includes(currentUser?.email)) return;
    document.getElementById('settings_modal').classList.add('open');
    await loadFlowSettings();
    showSettingsMenu();
}

function closeSettingsModal() {
    document.getElementById('settings_modal').classList.remove('open');
}

function showSettingsMenu() {
    settingsView = 'menu';
    document.getElementById('settings_body').innerHTML = `
        <div class="settings-menu-section">
            <div class="section-title">フロー制御</div>
            <div class="settings-section-desc">承認フローの各ステップを、工事番号・機械ごとにON/OFFできます。</div>
            <div class="settings-menu">
                <button class="settings-menu-card" onclick="showFlowToggleScreen()">
                    <div class="settings-menu-icon">🔀</div>
                    <div class="settings-menu-title">フローのON/OFF</div>
                    <div class="settings-menu-desc">工事番号・機械ごとに、不要なフローを飛ばす</div>
                </button>
            </div>
        </div>

        <div class="settings-menu-section">
            <div class="section-title">宛先まわり</div>
            <div class="settings-section-desc">開催案内・完了通知を受け取る担当者を管理します。まず「宛先候補の管理」で名簿に登録し、次に「固定宛先の設定」でフローごとに使う人を選びます。</div>
            <div class="settings-menu">
                <button class="settings-menu-card" onclick="showRecipientMasterScreen()">
                    <div class="settings-menu-icon">👥</div>
                    <div class="settings-menu-title">宛先候補の管理</div>
                    <div class="settings-menu-desc">技戦・物流・設計などの担当者「名簿」を管理する（追加・編集・無効化）</div>
                </button>
                <button class="settings-menu-card" onclick="showRecipientsListScreen()">
                    <div class="settings-menu-icon">📧</div>
                    <div class="settings-menu-title">固定宛先の設定</div>
                    <div class="settings-menu-desc">名簿の中から、フローごとに実際に使う人を選ぶ</div>
                </button>
            </div>
        </div>

        <div class="settings-menu-section">
            <div class="section-title">その他</div>
            <div class="settings-section-desc">これまでの設定変更が、いつ・誰によって行われたかを確認できます。</div>
            <div class="settings-menu">
                <button class="settings-menu-card" onclick="showAuditLogScreen()">
                    <div class="settings-menu-icon">📜</div>
                    <div class="settings-menu-title">変更履歴</div>
                    <div class="settings-menu-desc">いつ・誰が設定を変更したかを確認する</div>
                </button>
            </div>
        </div>
    `;
}

// ----- フローのON/OFF（工事番号・機械ごと） -----
function showFlowToggleScreen() {
    settingsView          = 'flow_toggle';
    settingsToggleProject = '';
    settingsTogglePending = {};
    document.getElementById('settings_body').innerHTML = `
        <button class="btn btn-sm btn-secondary" onclick="showSettingsMenu()">← 戻る</button>
        <div class="section-title" style="margin-top:10px;">フローのON/OFF（工事番号・機械ごと）</div>
        <div class="settings-note">OFFにすると、その機械のそのフローだけ新規申請・開催案内の作成ができなくなります（進行中の案件はそのまま継続できます）。</div>
        <div class="form-group">
            <label>工事番号を検索</label>
            <input type="text" id="settings_project_search" placeholder="工事番号または客先名で検索" oninput="renderSettingsProjectResults(this.value)">
        </div>
        <div id="settings_project_results"></div>
        <div id="settings_project_selected"></div>
    `;
}

function renderSettingsProjectResults(query) {
    const resultsEl = document.getElementById('settings_project_results');
    const q = query.trim().toLowerCase();
    if (!q) { resultsEl.innerHTML = ''; return; }
    const matches = Object.keys(projectsMap)
        .filter(num => num.toLowerCase().includes(q) || (projectsMap[num].customer_name || '').toLowerCase().includes(q))
        .slice(0, 20);
    resultsEl.innerHTML = matches.length
        ? `<div class="settings-search-results">${matches.map(num => {
            const p = projectsMap[num] || {};
            const label = [p.customer_name, p.project_details].filter(Boolean).join('　');
            return `<div class="settings-search-item" onclick="selectSettingsProject('${esc(num)}')">
                <span class="settings-search-num">${esc(num)}</span>
                <span class="settings-search-label">${esc(label)}</span>
            </div>`;
        }).join('')}</div>`
        : `<div class="settings-note">該当する工事番号がありません</div>`;
}

async function selectSettingsProject(num) {
    settingsToggleProject = num;
    settingsTogglePending = {};
    document.getElementById('settings_project_search').value = num;
    document.getElementById('settings_project_results').innerHTML = '';

    const p     = projectsMap[num] || {};
    const label = [p.customer_name, p.project_details].filter(Boolean).join('　');
    document.getElementById('settings_project_selected').innerHTML = `
        <div class="settings-flow-group">
            <div class="settings-flow-title">${esc(num)}　${esc(label)}</div>
            <div class="machine-checkbox-bar">
                <button class="btn-xs" onclick="toggleAllMachines('settings_machine_list', this)">全選択</button>
            </div>
            <div class="machine-checkbox-list" id="settings_machine_list"></div>
        </div>
        <div id="settings_toggle_grid"></div>
        <div style="margin-top:10px;">
            <button class="btn btn-primary" onclick="confirmFlowToggles()">確定</button>
        </div>
    `;
    showLoading('読み込み中...');
    try {
        await _loadMachineCheckboxes(num, 'settings_machine_list', 'onSettingsMachineChange');
    } finally {
        hideLoading();
    }
    onSettingsMachineChange();
}

function onSettingsMachineChange() {
    const machines = getSelectedMachines('settings_machine_list');
    const gridEl   = document.getElementById('settings_toggle_grid');
    if (!gridEl) return;
    if (machines.length === 0) { gridEl.innerHTML = ''; return; }

    gridEl.innerHTML = machines.map(machine => {
        const rows = TOGGLABLE_FLOWS.map(ft => {
            const key = `${machine}${ft}`;
            const enabled = settingsTogglePending.hasOwnProperty(key)
                ? settingsTogglePending[key]
                : isFlowEnabledFor(ft, settingsToggleProject, machine);
            return `
                <label class="settings-check-row">
                    <input type="checkbox" data-settings-machine="${esc(machine)}" data-settings-flow="${ft}"
                           ${enabled ? 'checked' : ''} onchange="onSettingsToggleChange(this)">
                    <span>${esc(FLOW_LABELS[ft] || ft)}</span>
                </label>`;
        }).join('');
        return `
            <div class="settings-flow-group">
                <div class="settings-flow-title">${esc(machine)}</div>
                ${rows}
            </div>`;
    }).join('');
}

function onSettingsToggleChange(cb) {
    const key = `${cb.dataset.settingsMachine}${cb.dataset.settingsFlow}`;
    settingsTogglePending[key] = cb.checked;
}

async function confirmFlowToggles() {
    const keys = Object.keys(settingsTogglePending);
    if (keys.length === 0) { showToast('変更がありません', 'error'); return; }

    showLoading('保存中...');
    try {
        const toDelete = [];
        const toUpsert = [];
        for (const key of keys) {
            const [machine, flowType] = key.split('');
            if (settingsTogglePending[key]) {
                toDelete.push({ machine, flowType }); // ON=デフォルトに戻す → 例外行を削除
            } else {
                toUpsert.push({
                    project_number: settingsToggleProject, machine, flow_type: flowType,
                    updated_by: currentUser.email, updated_at: new Date().toISOString()
                });
            }
        }
        for (const d of toDelete) {
            await db.from('flow_overrides').delete()
                .eq('project_number', settingsToggleProject).eq('machine', d.machine).eq('flow_type', d.flowType);
        }
        if (toUpsert.length > 0) {
            await db.from('flow_overrides').upsert(toUpsert, { onConflict: 'project_number,machine,flow_type' });
        }
        const changeDescs = keys.map(key => {
            const [machine, flowType] = key.split('');
            const action = settingsTogglePending[key] ? 'ON' : 'OFF';
            return `${machine}:${FLOW_LABELS[flowType] || flowType}を${action}`;
        });
        await logSettingsChange('flow_toggle', `${settingsToggleProject} — ${changeDescs.join('、')}`);

        await loadFlowSettings();
        settingsTogglePending = {};
        onSettingsMachineChange();
        await refreshAll();
        showToast('設定を保存しました。', 'success');
    } catch (e) {
        showToast('保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ----- 固定宛先の設定（個人単位） -----
function showRecipientsListScreen() {
    settingsView = 'recipients_list';
    const cards = Object.keys(FIXED_RECIPIENT_GROUPS).map(ft => `
        <button class="settings-menu-card" onclick="showRecipientsDetailScreen('${ft}')">
            <div class="settings-menu-title">${esc(FLOW_LABELS[ft] || ft)}</div>
        </button>
    `).join('');
    document.getElementById('settings_body').innerHTML = `
        <button class="btn btn-sm btn-secondary" onclick="showSettingsMenu()">← 戻る</button>
        <div class="section-title" style="margin-top:10px;">固定宛先の設定</div>
        <div class="settings-note">開催案内・完了通知で必ず宛先に含める人を、フロー種別ごとに個人単位で選びます（工番の担当者は別途自動で追加されます）。</div>
        <div class="settings-menu">${cards}</div>
    `;
}

async function showRecipientsDetailScreen(flowType) {
    settingsView = 'recipients_detail';
    const body = document.getElementById('settings_body');
    body.innerHTML = `<div class="loading-indicator">読み込み中...</div>`;

    const groups = FIXED_RECIPIENT_GROUPS[flowType] || [];
    const plan   = getFixedRecipientPlan(flowType);
    const groupsHtml = [];
    for (const g of groups) {
        let candidates;
        if (g.kind === 'role') {
            const { data } = await db.from('profiles').select('id, name, email').eq('role', g.role);
            candidates = (data || []).map(p => ({ id: p.id, name: p.name, email: p.email, kind: 'profile', checked: plan.profileIds.includes(p.id) }));
        } else {
            const { data } = await db.from('notification_recipients').select('id, name, email').eq('department', g.department).eq('active', true);
            candidates = (data || []).map(r => ({ id: r.id, name: r.name, email: r.email, kind: 'recipient', checked: plan.recipientIds.includes(r.id) }));
        }
        groupsHtml.push(`
            <div class="settings-flow-group">
                <div class="settings-flow-title">${esc(g.label)}</div>
                ${candidates.length ? candidates.map(c => `
                    <label class="settings-check-row">
                        <input type="checkbox" data-recipient-kind="${c.kind}" data-recipient-id="${c.id}" ${c.checked ? 'checked' : ''}>
                        <span>${esc(c.name || '—')}</span>
                        <span style="color:#999; font-size:12px;">${esc(c.email || '')}</span>
                    </label>
                `).join('') : (g.kind === 'department'
                    ? '<div class="settings-note">該当者がいません。<button class="btn btn-xs btn-outline" onclick="showRecipientMasterScreen()">「宛先候補の管理」で追加する →</button></div>'
                    : '<div class="settings-note">該当者がいません（この項目は担当ロールを持つ社内ログインユーザーが対象です）</div>')}
            </div>`);
    }

    body.innerHTML = `
        <button class="btn btn-sm btn-secondary" onclick="showRecipientsListScreen()">← 戻る</button>
        <div class="section-title" style="margin-top:10px;">${esc(FLOW_LABELS[flowType] || flowType)}の固定宛先</div>
        ${groupsHtml.join('')}
        <button class="btn btn-primary" onclick="saveRecipientDetail('${flowType}')">保存する</button>
    `;
}

async function saveRecipientDetail(flowType) {
    const checkedBoxes = [...document.querySelectorAll('#settings_body [data-recipient-kind]:checked')];
    const profileIds   = checkedBoxes.filter(cb => cb.dataset.recipientKind === 'profile').map(cb => cb.dataset.recipientId);
    const recipientIds = checkedBoxes.filter(cb => cb.dataset.recipientKind === 'recipient').map(cb => cb.dataset.recipientId);
    const names = checkedBoxes.map(cb => cb.closest('label')?.querySelector('span')?.textContent || '').filter(Boolean);

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
        await logSettingsChange('fixed_recipients', `${FLOW_LABELS[flowType] || flowType}の固定宛先を「${names.join('、') || 'なし'}」に変更`);
        showToast('固定宛先を保存しました。', 'success');
        showRecipientsListScreen();
    } catch (e) {
        showToast('保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ----- 宛先候補の管理（notification_recipients） -----
async function showRecipientMasterScreen() {
    settingsView = 'recipient_master';
    const body = document.getElementById('settings_body');
    body.innerHTML = `<div class="loading-indicator">読み込み中...</div>`;

    const { data } = await db.from('notification_recipients')
        .select('id, name, email, department, role, active').order('department').order('name');
    const rows = data || [];
    const departments = [...new Set(rows.map(r => r.department))].sort();

    const groupsHtml = departments.map(dept => {
        const items = rows.filter(r => r.department === dept);
        const itemsHtml = items.map(r => `
            <div class="settings-check-row" style="justify-content:space-between;">
                <span>${esc(r.name)}${r.active ? '' : ' <span style="color:#e74c3c;">（無効）</span>'}
                    <span style="color:#999; font-size:12px;">${esc(r.email)}・${esc(r.role)}</span></span>
                <button class="btn btn-xs btn-outline" onclick="editRecipientMaster('${r.id}')">編集</button>
            </div>
        `).join('');
        return `
            <div class="settings-flow-group">
                <div class="settings-flow-title">${esc(dept)}</div>
                ${itemsHtml}
            </div>`;
    }).join('');

    body.innerHTML = `
        <button class="btn btn-sm btn-secondary" onclick="showSettingsMenu()">← 戻る</button>
        <div class="section-title" style="margin-top:10px;">宛先候補の管理</div>
        <div class="settings-note">開催案内・完了通知の宛先候補となる担当者を管理します。削除はできません（不要になった場合は編集画面で「無効」にしてください）。</div>
        <button class="btn btn-primary btn-sm" style="margin-bottom:10px;" onclick="editRecipientMaster(null)">＋ 新規追加</button>
        ${groupsHtml}
    `;
}

async function editRecipientMaster(id) {
    const body = document.getElementById('settings_body');
    let record = { name: '', email: '', department: '', role: 'staff', active: true };
    if (id) {
        const { data } = await db.from('notification_recipients')
            .select('id, name, email, department, role, active').eq('id', id).single();
        if (data) record = data;
    }
    const { data: deptRows } = await db.from('notification_recipients').select('department');
    const departments = [...new Set((deptRows || []).map(r => r.department))].sort();
    const isKnownDept = departments.includes(record.department);

    body.innerHTML = `
        <button class="btn btn-sm btn-secondary" onclick="showRecipientMasterScreen()">← 戻る</button>
        <div class="section-title" style="margin-top:10px;">${id ? '担当者を編集' : '担当者を追加'}</div>
        <div class="form-group">
            <label>名前</label>
            <input type="text" id="rm_name" value="${esc(record.name)}">
        </div>
        <div class="form-group">
            <label>メールアドレス</label>
            <input type="text" id="rm_email" value="${esc(record.email)}">
        </div>
        <div class="form-group">
            <label>部署</label>
            <select id="rm_department_select" onchange="onRmDepartmentSelectChange()">
                ${departments.map(d => `<option value="${esc(d)}" ${d === record.department ? 'selected' : ''}>${esc(d)}</option>`).join('')}
                <option value="__other__" ${isKnownDept ? '' : 'selected'}>その他（自由入力）</option>
            </select>
            <input type="text" id="rm_department_other" placeholder="部署名を入力" value="${isKnownDept ? '' : esc(record.department)}"
                   style="margin-top:6px; ${isKnownDept ? 'display:none;' : ''}">
        </div>
        <div class="form-group">
            <label>役割</label>
            <select id="rm_role">
                ${['staff', 'manager', 'director'].map(r => `<option value="${r}" ${r === record.role ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
        </div>
        <label class="settings-check-row">
            <input type="checkbox" id="rm_active" ${record.active ? 'checked' : ''}>
            <span>有効</span>
        </label>
        <button class="btn btn-primary" onclick="saveRecipientMaster(${id ? `'${id}'` : 'null'})">保存する</button>
    `;
}

function onRmDepartmentSelectChange() {
    const sel = document.getElementById('rm_department_select');
    document.getElementById('rm_department_other').style.display = sel.value === '__other__' ? '' : 'none';
}

async function saveRecipientMaster(id) {
    const name  = document.getElementById('rm_name').value.trim();
    const email = document.getElementById('rm_email').value.trim();
    const deptSel = document.getElementById('rm_department_select').value;
    const department = deptSel === '__other__' ? document.getElementById('rm_department_other').value.trim() : deptSel;
    const role   = document.getElementById('rm_role').value;
    const active = document.getElementById('rm_active').checked;

    if (!name || !email || !department) { showToast('名前・メールアドレス・部署は必須です', 'error'); return; }

    showLoading('保存中...');
    try {
        if (id) {
            const { error } = await db.from('notification_recipients').update({ name, email, department, role, active }).eq('id', id);
            if (error) throw error;
            await logSettingsChange('recipient_master', `${department}の${name}を編集`);
        } else {
            const { error } = await db.from('notification_recipients').insert({ name, email, department, role, active });
            if (error) throw error;
            await logSettingsChange('recipient_master', `${department}に${name}を追加`);
        }
        showToast('保存しました。', 'success');
        showRecipientMasterScreen();
    } catch (e) {
        showToast('保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ----- 変更履歴 -----
async function showAuditLogScreen() {
    settingsView = 'audit_log';
    const body = document.getElementById('settings_body');
    body.innerHTML = `<div class="loading-indicator">読み込み中...</div>`;

    const { data } = await db.from('settings_audit_log')
        .select('changed_at, changed_by, category, summary').order('changed_at', { ascending: false }).limit(100);
    const rows = data || [];
    const CATEGORY_LABELS = {
        flow_toggle: 'フローON/OFF', fixed_recipients: '固定宛先',
        recipient_master: '宛先候補', room_email: '会議室'
    };
    const rowsHtml = rows.length ? rows.map(r => {
        const d = new Date(r.changed_at);
        const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `
            <div class="settings-check-row" style="align-items:flex-start;">
                <span style="min-width:120px; color:#999; font-size:12px;">${esc(dateStr)}</span>
                <span style="min-width:90px; font-size:12px;">${esc(r.changed_by)}</span>
                <span class="recipient-tag" style="margin-right:6px;">${esc(CATEGORY_LABELS[r.category] || r.category)}</span>
                <span>${esc(r.summary)}</span>
            </div>`;
    }).join('') : '<div class="settings-note">まだ変更履歴がありません</div>';

    body.innerHTML = `
        <button class="btn btn-sm btn-secondary" onclick="showSettingsMenu()">← 戻る</button>
        <div class="section-title" style="margin-top:10px;">変更履歴（最新100件）</div>
        ${rowsHtml}
    `;
}

async function completePendingItem(requestId, idx, opts = {}) {
    if (!confirm('このペンディング項目を完了にします。よろしいですか？')) return;
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

        _applyPendingUpdate(requestId, newSheetData, 'ペンディング項目を完了にしました', opts);
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
// isFixed: 固定の「出荷準備」項目なら true、通常のペンディング項目なら false
// content: 通知本文にどの項目かわかるよう添える内容テキスト
async function _notifyPendingOwner(requestId, owner, isFixed = false, content = null) {
    const notifType = isFixed ? 'prep_item_assigned' : 'pending_item_assigned';
    const { data: pRows } = await db.from('profiles').select('id').eq('name', owner);
    if (pRows?.length > 0) {
        await db.from('approval_notifications').insert(
            pRows.map(p => ({ request_id: requestId, recipient_id: p.id, notification_type: notifType, detail: content }))
        );
    } else {
        const { data: nRows } = await db.from('notification_recipients').select('email').eq('name', owner).eq('active', true);
        if (nRows?.length > 0) {
            await db.from('approval_notifications').insert(
                nRows.map(n => ({ request_id: requestId, recipient_email: n.email, notification_type: notifType, detail: content }))
            );
        }
    }
}

async function addQaPendingItem(requestId) {
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

        if (owner) await _notifyPendingOwner(requestId, owner, false, content);

        _applyPendingUpdate(requestId, newSheetData, 'ペンディング項目を追加しました');
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
        const prevOwner  = items[idx].owner || '';
        const newOwner   = ownerEl ? ownerEl.value.trim() : prevOwner;
        const shipAfter  = shipAfterEl ? shipAfterEl.checked : !!items[idx].ship_after;

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

        if (newOwner && newOwner !== prevOwner) await _notifyPendingOwner(requestId, newOwner, false, content);

        qaEditingPendingIdx = null;
        _applyPendingUpdate(requestId, newSheetData, 'ペンディング項目を更新しました');
    } catch (e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteQaPendingItem(requestId, idx) {
    if (!confirm('このペンディング項目を削除します。よろしいですか？')) return;

    showLoading('削除中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data').eq('id', requestId).single();
        const items = req?.sheet_data?.pending_items || [];
        const [removed] = items.splice(idx, 1);
        const newSheetData = { ...(req?.sheet_data || {}), pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);
        if (removed?.photo_path) await _deletePendingPhoto(removed.photo_path);

        _applyPendingUpdate(requestId, newSheetData, 'ペンディング項目を削除しました');
    } catch (e) {
        showToast('削除に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function sendFixCard(requestId) {
    if (!confirm('手直しカードをメールで送信します。\n宛先はこの検査の開催案内と同じです。よろしいですか？')) return;
    showLoading('送信中...');
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
        showToast(`手直しカードを送信しました（${data?.sentTo ?? 0}件）${data?.testMode ? ' ※テストモード' : ''}`, 'success');
    } catch (e) {
        showToast('送信に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function finalizeQaMeeting(requestId) {
    if (!confirm('この開催案内を完了にします。よろしいですか？')) return;

    showLoading('処理中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('flow_type, project_number').eq('id', requestId).single();

        await db.from('approval_requests')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        // 簡易検査・外観検査の完了後、営業へ仮出荷予定日の入力を依頼する（同じ申請に付随。別フローは起票しない）
        if (req.flow_type === 'simple_inspection' || req.flow_type === 'inspection') {
            await _notifyTentativeShippingDateRequest(requestId, req.project_number);
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

// 検査完了をきっかけに、営業へ仮出荷予定日の入力を依頼する通知を送る（同一申請の tentative_shipping_date 列に入力してもらう）
async function _notifyTentativeShippingDateRequest(requestId, projectNum) {
    const { data: sData } = await db.from('app_settings').select('value').eq('key', 'sales_person_map').single();
    const salesOwner = (sData?.value ? JSON.parse(sData.value) : {})[projectNum] || null;
    if (!salesOwner) return;

    const { data: pRows } = await db.from('profiles').select('id').eq('name', salesOwner);
    if (pRows?.length > 0) {
        await db.from('approval_notifications').insert(
            pRows.map(p => ({ request_id: requestId, recipient_id: p.id, notification_type: 'tentative_shipping_date_request' }))
        );
    } else {
        const { data: nRows } = await db.from('notification_recipients').select('email').eq('name', salesOwner).eq('active', true);
        if (nRows?.length > 0) {
            await db.from('approval_notifications').insert(
                nRows.map(n => ({ request_id: requestId, recipient_email: n.email, notification_type: 'tentative_shipping_date_request' }))
            );
        }
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
        await db.from('tasks').update({ is_completed: true })
            .eq('project_number', req.project_number)
            .eq('machine', req.machine_name)
            .eq('text', taskText);
    } catch (e) {
        console.warn('全体工程表への完了連携に失敗:', e);
    }
}

// 出荷日（仮/確定、工場出荷/梱包出荷）を工程表(tasksテーブル)のstart_date・end_dateへ書き戻す（承認フロー→工程表の一方向反映）
// 承認フロー対象（2000番台以外）の出荷タスクは単日のため、開始日・終了日を同じ日付に揃える
// FLOW_TASK_SYNC_ENABLED（完了フラグ連携用）とは独立したフラグ
const SHIPPING_DATE_TASK_SYNC_ENABLED = true;

async function syncShippingDateToTasks(req, { factoryDate, packingDate } = {}) {
    if (!SHIPPING_DATE_TASK_SYNC_ENABLED) return;
    if (!req?.project_number) return;
    try {
        if (factoryDate && req.machine_name) {
            await db.from('tasks').update({ start_date: factoryDate, end_date: factoryDate })
                .eq('project_number', req.project_number)
                .eq('machine', req.machine_name)
                .eq('text', '工場出荷');
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
    const comment  = (document.getElementById('approval_comment')?.value || '').trim();

    // assembly・test_run・shipping_prep はいずれも並列承認（どちらかが承認した時点で即完了）
    const isParallel = currentDetailFlowType === 'assembly' || currentDetailFlowType === 'test_run' || currentDetailFlowType === 'shipping_prep';
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

        // 全ステップの承認者に再申請通知を記録（assembly並列承認対応）
        // shipping_prep（品証・製管）は品証のみへ通知（製管へはメール送信時にCCで届く）
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
async function _loadMachineCheckboxes(projectNum, listId, onChangeFn) {
    const { data } = await db.from('tasks')
        .select('machine').eq('project_number', projectNum).eq('text', '機械組立').not('machine', 'is', null);
    const machines = [...new Set((data || []).map(t => t.machine).filter(Boolean))].sort();
    const list = document.getElementById(listId);
    if (machines.length === 0) {
        list.innerHTML = '<div style="color:#aaa;font-size:12px;">機械が見つかりません</div>';
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

async function _getMachineDoneFlows(projectNum, machine) {
    const { data } = await db.from('approval_requests')
        .select('flow_type').eq('project_number', projectNum).eq('machine_name', machine).eq('status', 'approved');
    return new Set((data || []).map(r => r.flow_type));
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
    // 設定（工事番号・機械単位）でOFFにされたフローは、出荷準備等の前提チェックの対象から除外する
    return Object.keys(best).filter(ft => isFlowEnabledFor(ft, projectNum, machine)).sort((a, b) => best[a] - best[b]);
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
async function _getPrepBlockers(projectNum, machine) {
    const chain = await _getMachineFlowChain(projectNum, machine);
    const priorFlows = _priorSteps(chain, 'shipping_prep');
    if (priorFlows.length === 0) return [];
    const { data: reqs } = await db.from('approval_requests')
        .select('flow_type, status, sheet_data, tentative_shipping_date, tentative_shipping_confirmed_at')
        .eq('project_number', projectNum).eq('machine_name', machine)
        .in('flow_type', priorFlows);
    const blockers = [];
    for (const flowType of priorFlows) {
        const req = (reqs || []).find(r => r.flow_type === flowType);
        // 簡易検査・外観検査は、開催完了後に仮出荷予定日が品証・製管に確認されるまで出荷準備を申請できない
        if ((flowType === 'simple_inspection' || flowType === 'inspection') && req?.status === 'approved' && !req.tentative_shipping_confirmed_at) {
            blockers.push({ flowType: 'tentative_shipping', label: '仮出荷予定日', count: 0, notApproved: true });
        }
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
                const supMap = Object.fromEntries((supRecips || []).map(r => [r.email, r]));
                for (const email of supEmails) {
                    if (!extEmails.has(email)) {
                        extEmails.add(email);
                        extList.push(supMap[email] || { name: email, email, department: '設計', role: '' });
                    }
                }
            }
        }
        if (!resolved) {
            await addE({ department: '設計', role: 'manager' });
            await addE({ department: '設計', role: 'director' });
        }
    };

    // 全開催案内共通（常務・製管・品証・技戦は設定画面で個人単位に選択）
    await addFixedRecipientsPreview();
    for (const o of kumitateOwners) await addPbyName(o);
    for (const o of shiuntenOwnersFallback) await addPbyName(o);
    await addEbyName(salesOwner);
    for (const o of sekkeiOwnersFallback) await addEbyName(o);
    // 設計管理職: 担当者の上長を members テーブルから取得
    await addSekkeiSupervisors();

    // 全開催案内共通: 組立課長（機械組立あり）・操業課長/部長（試運転あり）
    if (kumitateOwners.length > 0) {
        await addP({ role: 'assembly_manager' });
    }
    if (shiuntenOwnersFallback.length > 0) {
        await addP({ role: 'operations_manager' });
        await addP({ role: 'operations_director' });
    }

    // 複数機械選択時は残りの機械の組立担当者も追加
    for (let i = 1; i < machineNames.length; i++) {
        const { data: mt } = await db.from('tasks')
            .select('owner').eq('project_number', projectNum).eq('text', '機械組立').eq('machine', machineNames[i]);
        const owners = [...new Set((mt || []).map(t => t.owner).filter(Boolean))];
        for (const o of owners) await addPbyName(o);
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

    listEl.innerHTML = profileRows + extRows || '<div style="color:#aaa;font-size:12px;padding:8px;">宛先なし</div>';
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
            <span style="font-weight:bold;min-width:80px;font-size:12px;">${esc(r.name)}</span>
            <span style="color:#888;flex:1;font-size:12px;">${esc(r.email)}</span>
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
        `<div class="flow-info-item"><span style="width:32px;font-size:11px;color:#999;flex-shrink:0;">${role}</span><span>${esc(name)}</span></div>`
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
    const dateVal        = document.getElementById('sales_date_input')?.value;
    const packingInputEl = document.getElementById('packing_sales_date_input');
    const packingDateVal = packingInputEl?.value || null;

    if (!dateVal) { showToast('確定出荷日を入力してください', 'error'); return; }
    if (packingInputEl && !packingDateVal) { showToast('梱包出荷日（確定）を入力してください', 'error'); return; }

    showLoading('処理中...');
    try {
        const updatePayload = {
            confirmed_shipping_date: dateVal,
            status: 'awaiting_shipping_confirm',
            updated_at: new Date().toISOString()
        };
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

        await syncShippingDateToTasks(req, { factoryDate: dateVal, packingDate: packingDateVal });

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

// 営業: 仮出荷予定日を入力（品証・製管の確認待ちへ）
// 営業: 仮出荷予定日を入力（簡易検査・外観検査の申請そのものに付随。品証・製管の確認待ちへ）
async function submitTentativeShippingDate(requestId) {
    const dateVal        = document.getElementById('tentative_date_input')?.value;
    const packingInputEl = document.getElementById('packing_tentative_date_input');
    const packingDateVal = packingInputEl?.value || null;

    if (!dateVal) { showToast('仮出荷予定日を入力してください', 'error'); return; }
    if (packingInputEl && !packingDateVal) { showToast('梱包出荷日（仮）を入力してください', 'error'); return; }

    showLoading('処理中...');
    try {
        const updatePayload = { tentative_shipping_date: dateVal, updated_at: new Date().toISOString() };
        if (packingInputEl) updatePayload.packing_tentative_shipping_date = packingDateVal;

        const { data: req, error } = await db.from('approval_requests')
            .update(updatePayload)
            .eq('id', requestId).is('tentative_shipping_date', null)
            .select().single();
        if (error) throw error;
        if (!req) { showToast('既に処理済みです', 'error'); return; }

        // 品証・製管全体へ確認依頼を通知
        const notifIds = new Set();
        const { data: qRows } = await db.from('profiles').select('id').eq('role', 'quality');
        (qRows || []).forEach(p => notifIds.add(p.id));
        const { data: sRows } = await db.from('profiles').select('id').eq('role', 'production_control');
        (sRows || []).forEach(p => notifIds.add(p.id));
        if (notifIds.size > 0) {
            await db.from('approval_notifications').insert(
                [...notifIds].map(id => ({ request_id: requestId, recipient_id: id, notification_type: 'tentative_shipping_date_input_done' }))
            );
        }

        await syncShippingDateToTasks(req, { factoryDate: dateVal, packingDate: packingDateVal });

        closeDetailModal();
        await refreshAll();
        showToast('仮出荷予定日を入力しました。品証・製管の確認後、確定します。', 'success');
    } catch (e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 品証・製管: 営業入力済みの仮出荷予定日を確認し確定する
async function confirmTentativeShippingDate(requestId) {
    showLoading('処理中...');
    try {
        const { data: req, error } = await db.from('approval_requests')
            .update({ tentative_shipping_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', requestId).not('tentative_shipping_date', 'is', null).is('tentative_shipping_confirmed_at', null)
            .select().single();
        if (error) throw error;
        if (!req) { showToast('既に処理済みです', 'error'); return; }

        // 申請者（検査開催案内を送った品証）＋品証・製管全体へ確定を通知
        const notifIds = new Set();
        if (req.requester_id) notifIds.add(req.requester_id);
        const { data: qRows } = await db.from('profiles').select('id').eq('role', 'quality');
        (qRows || []).forEach(p => notifIds.add(p.id));
        const { data: sRows } = await db.from('profiles').select('id').eq('role', 'production_control');
        (sRows || []).forEach(p => notifIds.add(p.id));
        if (notifIds.size > 0) {
            await db.from('approval_notifications').insert(
                [...notifIds].map(id => ({ request_id: requestId, recipient_id: id, notification_type: 'tentative_shipping_confirmed' }))
            );
        }

        closeDetailModal();
        await refreshAll();
        showToast('仮出荷予定日を確定しました。', 'success');
    } catch (e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 営業・品証・製管: 確定出荷日を後から変更する。既に常務へ申請・承認済み（status: submitted/approved）の場合は
// 承認ステップをリセットして常務の再承認を必須にする
async function changeConfirmedShippingDate(requestId) {
    const dateVal        = document.getElementById('sales_date_input')?.value;
    const packingInputEl = document.getElementById('packing_sales_date_input');
    const packingDateVal = packingInputEl?.value || null;

    if (!dateVal) { showToast('確定出荷日を入力してください', 'error'); return; }
    if (packingInputEl && !packingDateVal) { showToast('梱包出荷日（確定）を入力してください', 'error'); return; }

    showLoading('処理中...');
    try {
        const { data: current, error: fetchErr } = await db.from('approval_requests')
            .select('status').eq('id', requestId).single();
        if (fetchErr) throw fetchErr;
        if (!current) { showToast('データが見つかりません', 'error'); return; }

        const needsReapproval = current.status === 'submitted' || current.status === 'approved';

        const updatePayload = { confirmed_shipping_date: dateVal, updated_at: new Date().toISOString() };
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

        await syncShippingDateToTasks(req, { factoryDate: dateVal, packingDate: packingDateVal });

        closeDetailModal();
        await refreshAll();
        showToast(needsReapproval ? '出荷日を変更しました。常務に再承認を依頼します。' : '出荷日を変更しました。', 'success');
    } catch (e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 営業・品証・製管: 仮出荷予定日を後から変更する。既に品証・製管が確認済みの場合は確認済みフラグをリセットして再確認を必須にする
async function changeTentativeShippingDate(requestId) {
    const dateVal        = document.getElementById('tentative_date_input')?.value;
    const packingInputEl = document.getElementById('packing_tentative_date_input');
    const packingDateVal = packingInputEl?.value || null;

    if (!dateVal) { showToast('仮出荷予定日を入力してください', 'error'); return; }
    if (packingInputEl && !packingDateVal) { showToast('梱包出荷日（仮）を入力してください', 'error'); return; }

    showLoading('処理中...');
    try {
        const { data: current, error: fetchErr } = await db.from('approval_requests')
            .select('tentative_shipping_confirmed_at').eq('id', requestId).single();
        if (fetchErr) throw fetchErr;
        if (!current) { showToast('データが見つかりません', 'error'); return; }

        const wasConfirmed = !!current.tentative_shipping_confirmed_at;

        const updatePayload = { tentative_shipping_date: dateVal, updated_at: new Date().toISOString() };
        if (packingInputEl) updatePayload.packing_tentative_shipping_date = packingDateVal;
        if (wasConfirmed) updatePayload.tentative_shipping_confirmed_at = null;

        const { data: req, error } = await db.from('approval_requests')
            .update(updatePayload).eq('id', requestId).select().single();
        if (error) throw error;

        if (wasConfirmed) {
            // 品証・製管全体へ再確認依頼を通知
            const notifIds = new Set();
            const { data: qRows } = await db.from('profiles').select('id').eq('role', 'quality');
            (qRows || []).forEach(p => notifIds.add(p.id));
            const { data: sRows } = await db.from('profiles').select('id').eq('role', 'production_control');
            (sRows || []).forEach(p => notifIds.add(p.id));
            if (notifIds.size > 0) {
                await db.from('approval_notifications').insert(
                    [...notifIds].map(id => ({ request_id: requestId, recipient_id: id, notification_type: 'tentative_shipping_date_input_done' }))
                );
            }
        }

        await syncShippingDateToTasks(req, { factoryDate: dateVal, packingDate: packingDateVal });

        closeDetailModal();
        await refreshAll();
        showToast(wasConfirmed ? '仮出荷予定日を変更しました。品証・製管に再確認を依頼します。' : '仮出荷予定日を変更しました。', 'success');
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
    const machineName = req?.machine_name;
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
            await addE({ department: '設計', role: 'manager' });
            await addE({ department: '設計', role: 'director' });
        }
    };

    let notifType = 'completed';

    switch (flowType) {
        case 'assembly':
            // 固定宛先（設定画面で個人単位に選択）
            await addFixedRecipients();
            // 工番担当者（profiles）: 組立（複数人対応）
            for (const o of kumitateOwners) await addPbyName(o);
            // 試運転タスクがある場合のみ試運転担当者も追加
            for (const o of shiuntenOwners) await addPbyName(o);
            if (shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });  // 操業課長（試運転あり）
                await addP({ role: 'operations_director' }); // 操業部長（試運転あり）
            }
            // 工番担当者（外部）: 営業・設計staff
            await addEbyName(salesOwner);
            for (const o of sekkeiOwners) await addEbyName(o);
            // 設計管理職: 担当者の上長を members テーブルから取得
            await addSekkeiSupervisors();
            break;

        case 'test_run':
            // 固定宛先（設定画面で個人単位に選択）
            await addFixedRecipients();
            if (kumitateOwners.length > 0) await addP({ role: 'assembly_manager' });   // 組立課長（機械組立あり）
            if (shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });  // 操業課長（試運転あり）
                await addP({ role: 'operations_director' }); // 操業部長（試運転あり）
            }
            // 工番担当者（profiles）: 組立・操業（複数人対応）
            for (const o of kumitateOwners) await addPbyName(o);
            for (const o of shiuntenOwners) await addPbyName(o);
            // 工番担当者（外部）: 営業・設計staff
            await addEbyName(salesOwner);
            for (const o of sekkeiOwners) await addEbyName(o);
            // 設計管理職: 担当者の上長を members テーブルから取得
            await addSekkeiSupervisors();
            break;

        case 'shipping_meeting':
            notifType = 'shipping_meeting_invite';
            await addFixedRecipients();                             // 設定画面で個人単位に選択
            for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            for (const o of shiuntenOwners) await addPbyName(o);   // 試運転担当者（タスクがあれば）
            await addEbyName(salesOwner);                           // 営業担当者
            for (const o of sekkeiOwners) await addEbyName(o);     // 設計担当者
            await addSekkeiSupervisors();                           // 設計課長・部長
            if (kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });           // 組立課長（機械組立あり）
            }
            if (shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });         // 操業課長（試運転あり）
                await addP({ role: 'operations_director' });        // 操業部長（試運転あり）
            }
            break;

        case 'simple_inspection':
            notifType = 'simple_inspection_invite';
            await addFixedRecipients();                             // 設定画面で個人単位に選択
            for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            await addEbyName(salesOwner);                           // 営業担当者
            for (const o of sekkeiOwners) await addEbyName(o);     // 設計担当者
            await addSekkeiSupervisors();                           // 設計課長・部長
            if (kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });           // 組立課長（機械組立あり）
            }
            break;

        case 'inspection':
            notifType = 'inspection_invite';
            await addFixedRecipients();                             // 設定画面で個人単位に選択
            for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            for (const o of shiuntenOwners) await addPbyName(o);   // 試運転担当者（タスクがあれば）
            await addEbyName(salesOwner);                           // 営業担当者
            for (const o of sekkeiOwners) await addEbyName(o);     // 設計担当者
            await addSekkeiSupervisors();                           // 設計課長・部長
            if (kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });           // 組立課長（機械組立あり）
            }
            if (shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });         // 操業課長（試運転あり）
                await addP({ role: 'operations_director' });        // 操業部長（試運転あり）
            }
            break;

        case 'shipping_prep':
            // 固定宛先（設定画面で個人単位に選択、製管へはメール送信時にCCで届く）
            await addFixedRecipients();
            break;

        case 'shipping':
            // 固定宛先（設定画面で個人単位に選択）
            await addFixedRecipients();
            // 設計管理職: 担当者の上長を members テーブルから取得
            await addSekkeiSupervisors();
            // 機械組立タスクがある場合: 組立課長
            if (kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });
            }
            // 試運転タスクがある場合: 操業課長・部長
            if (shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });
                await addP({ role: 'operations_director' });
            }
            // 工番担当者
            for (const o of sekkeiOwners)   await addEbyName(o);  // 設計担当者（notification_recipients）
            for (const o of kumitateOwners) await addPbyName(o);  // 組立担当者（profiles）
            for (const o of shiuntenOwners) await addPbyName(o);  // 操業担当者（profiles）
            await addEbyName(salesOwner);                          // 営業担当者（notification_recipients）
            break;
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
        document.getElementById('login_overlay').classList.add('visible');
        document.getElementById('app').style.display = 'none';
        currentUser    = null;
        currentProfile = null;
    }
});

// ===== ページロード時にセッションを復元 =====
(async () => {
    const accessToken  = localStorage.getItem('ap_access_token');
    const refreshToken = localStorage.getItem('ap_refresh_token');
    if (!accessToken) return; // 未ログイン → ログイン画面のまま

    const { data, error } = await db.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken
    });
    if (error || !data.session) {
        // トークン期限切れなど → ログイン画面へ
        localStorage.removeItem('ap_access_token');
        localStorage.removeItem('ap_refresh_token');
        return;
    }
    await bootApp(data.session);
})();

