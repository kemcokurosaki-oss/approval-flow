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

// 2000番台（2000〜2999）の工番判定（現在は承認フロー対象外）
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
let completedProjectNums = new Set(); // completed_projectsに登録済みの工番
let progressCachedData   = null;
let currentDetailReq     = null;
let devRole = ''; // 開発用ロール上書き
let devDept = ''; // 開発用部署上書き
let currentDetailFlowType = '';
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
    sales:               { role: 'staff',               department: '営業', flowTypes: [] }
};
let devFlowTypes    = []; // デモ用: 自分の申請タブのフロー絞り込み
let userIsApplicant  = false; // 申請権限フラグ
let isQualityOrSeikan = false; // 品証・製管フラグ（openDetailModal から参照）

function getEffectiveRole() { return devRole || currentProfile?.role || ''; }
function getEffectiveDept() { return devDept || currentProfile?.department || ''; }

function canApplyFlow(flowType) {
    const role  = getEffectiveRole();
    const dept  = getEffectiveDept();
    const isQorS = role === 'quality' || (role === 'staff' && dept === '製管');
    if (flowType === 'assembly')         return (role === 'staff' && dept === '組立') || role === 'assembly_manager';
    if (flowType === 'test_run')         return (role === 'staff' && dept === '操業') || role === 'operations_manager';
    if (flowType === 'simple_inspection' || flowType === 'inspection' ||
        flowType === 'shipping_meeting'  || flowType === 'shipping')  return isQorS;
    return false;
}

// 承認者ロール一覧
const APPROVER_ROLES = ['assembly_manager','assembly_director','operations_manager','operations_director'];

function applyRoleLayout(role) {
    const dept        = getEffectiveDept();
    const isApprover  = APPROVER_ROLES.includes(role);
    // 品証、および品証代理の製管スタッフは同一権限（グローバル変数に保存）
    isQualityOrSeikan = role === 'quality' || (role === 'staff' && dept === '製管');
    // 組立・操業 staff + 組立課長 + 操業課長 が申請可
    const isApplicant = (role === 'staff' && (dept === '組立' || dept === '操業'))
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

const FLOW_LABELS = {
    assembly:          '組立完了申請',
    test_run:          '試運転完了申請',
    simple_inspection: '簡易検査開催案内',
    inspection:        '外観検査開催案内',
    shipping_meeting:  '出荷確認会議開催案内',
    shipping:          '出荷確定申請'
};

// 開催案内送信後の詳細モーダルヘッダー用（「開催案内」を省いた表記）
const QA_DETAIL_TITLE_LABELS = {
    simple_inspection: '簡易検査',
    inspection:        '外観検査',
    shipping_meeting:  '出荷確認会議'
};

// 出荷準備の固定ペンディング項目（直前の検査フローに自動追加する）
const PREP_PENDING_ITEM = { content: '出荷準備', due: null, owner: null, completed: false, completed_date: null, fixed: true };

// この検査フローが、その機械にとって出荷直前（＝出荷準備を紐づけるべき）フローかどうか
function _isLastPreShipFlow(flowType, flags) {
    if (flowType === 'shipping_meeting')  return true;
    if (flowType === 'inspection')        return !flags.shipping_meeting;
    if (flowType === 'simple_inspection') return !flags.inspection && !flags.shipping_meeting;
    return false;
}

const ROLE_LABELS = {
    assembly_manager:    '組立課長',
    assembly_director:   '組立部長',
    operations_manager:  '操業課長',
    operations_director: '操業部長',
    quality:             '品質保証課',
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

    // 黒崎のみ開発用ロール切替バーを表示
    const DEMO_USERS = ['e-kurosaki@kusakabe.com', 's-morimura@kusakabe.com'];
    if (DEMO_USERS.includes(currentUser.email)) {
        document.getElementById('dev_bar').style.display = 'flex';
        document.getElementById('app').classList.add('has-dev-bar');
    }

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
        if (!num || is2000sSeries(num)) return;
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
        // 工場出荷タスクの end_date を出荷日として保存（複数機械がある場合は最も早い日付）
        if (taskText === '工場出荷' && t.end_date) {
            const existing = projectsMap[num].shipping_date;
            if (!existing || t.end_date < existing) projectsMap[num].shipping_date = t.end_date;
        }
        // タスクオーナーを収集（自分の工番フィルタ用）
        if (t.owner) {
            if (!projectsMap[num].owners) projectsMap[num].owners = new Set();
            projectsMap[num].owners.add(t.owner);
        }
    });

}

let detectedFlows = { inspection: false, test_run: false, shippingMeeting: false }; // 自動検出結果
const simpleInspectionProjectNums = new Set(); // 簡易検査タスクがある工番
const inspectionProjectNums    = new Set(); // 外観検査タスクがある工番
const assemblyProjectNums      = new Set(); // 機械組立タスクがある工番
const testRunProjectNums       = new Set(); // 試運転タスクがある工番
const shippingMeetingProjectNums = new Set(); // 出荷確認会議タスクがある工番
const shippingProjectNums      = new Set(); // 工場出荷タスクがある工番

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
        detectedFlows = { inspection: false, test_run: false, shippingMeeting: false };
    } finally {
        hideLoading();
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
        // 複数選択: 全選択機械のタスクを集めて後続フローを表示
        const { data: allTasks } = await db.from('tasks')
            .select('text').eq('project_number', num).in('machine', machines);
        const taskNames = new Set((allTasks || []).map(t => (t.text || '').trim()));

        detectedFlows.inspection      = taskNames.has('外観検査');
        detectedFlows.test_run        = taskNames.has('試運転');
        detectedFlows.shippingMeeting = taskNames.has('出荷確認会議');
        const hasShipping             = taskNames.has('工場出荷');

        const upcomingFlows = [
            { type: 'test_run',          label: '試運転完了通知',       exists: detectedFlows.test_run },
            { type: 'simple_inspection', label: '簡易検査開催案内',     exists: !is2000sSeries(num) },
            { type: 'inspection',        label: '外観検査開催案内',     exists: detectedFlows.inspection },
            { type: 'shipping_meeting',  label: '出荷確認会議開催案内', exists: detectedFlows.shippingMeeting },
            { type: 'shipping',          label: '出荷確認書',           exists: hasShipping }
        ].filter(f => f.exists && f.type !== currentFlowType);

        const upcomingHtml = upcomingFlows.length > 0 ? `
            <div class="flow-info-section">
                <div class="flow-info-tag">後続フロー</div>
                ${upcomingFlows.map(f => `<div class="flow-info-item">
                    <span class="flow-info-icon">──</span><span class="flow-info-upcoming">${esc(f.label)}</span>
                </div>`).join('')}
            </div>` : '';

        document.getElementById('flow_detect_list').innerHTML = `
            <div class="flow-info-section">
                <div class="flow-info-tag">今回申請</div>
                <div class="flow-info-item">
                    <span class="flow-info-current">▶ ${esc(FLOW_LABELS[currentFlowType] || '完了通知')}</span>
                    <span class="flow-info-note">${machines.length}機械を一括申請</span>
                </div>
            </div>${upcomingHtml}`;
        flowEl.style.display = 'block';
        return;
    }

    // 1台選択: 詳細フロー検出
    const machine = machines[0];
    const flags = await _detectApplicableFlows(num, machine);

    detectedFlows.inspection      = flags.inspection;
    detectedFlows.test_run        = flags.test_run;
    detectedFlows.shippingMeeting = flags.shipping_meeting;
    const hasShipping             = flags.shipping;

    const doneFlows = await _getMachineDoneFlows(num, machine);
    const ALL_FLOWS = [
        { type: 'assembly',          label: '組立完了通知',        exists: true },
        { type: 'test_run',          label: '試運転完了通知',       exists: detectedFlows.test_run },
        { type: 'simple_inspection', label: '簡易検査開催案内',     exists: !is2000sSeries(num) },
        { type: 'inspection',        label: '外観検査開催案内',     exists: detectedFlows.inspection },
        { type: 'shipping_meeting',  label: '出荷確認会議開催案内', exists: detectedFlows.shippingMeeting },
        { type: 'shipping',          label: '出荷確認書',           exists: hasShipping }
    ].filter(f => f.exists);

    const doneList     = ALL_FLOWS.filter(f => f.type !== currentFlowType && doneFlows.has(f.type));
    const upcomingList = ALL_FLOWS.filter(f => f.type !== currentFlowType && !doneFlows.has(f.type));

    const doneHtml = doneList.length > 0 ? `<div class="flow-info-section">
        <div class="flow-info-tag">承認済み</div>
        ${doneList.map(f=>`<div class="flow-info-item">
            <span class="flow-info-icon">✅</span><span class="flow-info-done">${esc(f.label)}</span></div>`).join('')}
        </div>` : '';
    const upcomingHtml = upcomingList.length > 0 ? `<div class="flow-info-section">
        <div class="flow-info-tag">後続フロー</div>
        ${upcomingList.map(f=>`<div class="flow-info-item">
            <span class="flow-info-icon">──</span><span class="flow-info-upcoming">${esc(f.label)}</span></div>`).join('')}
        </div>` : '';

    document.getElementById('flow_detect_list').innerHTML = `${doneHtml}
        <div class="flow-info-section">
            <div class="flow-info-tag">今回申請</div>
            <div class="flow-info-item"><span class="flow-info-current">▶ ${esc(FLOW_LABELS[currentFlowType] || '完了通知')}</span></div>
        </div>${upcomingHtml}`;
    flowEl.style.display = 'block';
    } finally {
        hideLoading();
    }
}

// ===== Data Loading =====
async function refreshAll() {
    const role        = getEffectiveRole();
    const dept        = getEffectiveDept();
    const isApprover  = APPROVER_ROLES.includes(role);
    const isQorS      = role === 'quality' || (role === 'staff' && dept === '製管');
    const isApplicant = role === 'staff' && (dept === '組立' || dept === '操業');

    const loads = [];
    loads.push(loadProgress());
    if (isApprover) loads.push(loadPendingSide());
    if (isApplicant || isQorS || role === 'assembly_manager' || role === 'operations_manager') loads.push(loadMineSide());

    await Promise.all(loads);
}

async function loadPendingSide() {
    const role = getEffectiveRole();
    const el   = document.getElementById('side_content_pending');
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

    if (error || !steps) { el.innerHTML = '<div class="empty"><div class="empty-text">データ取得エラー</div></div>'; return; }

    // 今自分が担当すべきステップのみに絞る
    const actionable = steps.filter(s => {
        const req = s.approval_requests;
        if (!req) return false;
        // assembly/test_run並列: submitted 状態で全 pending ステップが操作可能
        if ((req.flow_type === 'assembly' || req.flow_type === 'test_run') && req.status === 'submitted' && s.status === 'pending') return true;
        // shipping: step_order=1 の直列承認
        if (req.flow_type === 'shipping' && s.step_order === 1 && req.status === 'submitted' && s.status === 'pending') return true;
        if (s.step_order === 1 && req.status === 'submitted') return true;
        if (s.step_order === 2 && req.status === 'in_review')  return true;
        return false;
    });

    // バッジ更新（side_badge_pending と side_pending_count 両方）
    const badgePending = document.getElementById('side_badge_pending');
    const countPending = document.getElementById('side_pending_count');
    if (actionable.length > 0) {
        if (badgePending) { badgePending.style.display = 'inline-flex'; badgePending.textContent = actionable.length; }
        if (countPending) { countPending.style.display = 'inline-flex'; countPending.textContent = actionable.length; }
    } else {
        if (badgePending) badgePending.style.display = 'none';
        if (countPending) countPending.style.display = 'none';
    }

    if (actionable.length === 0) {
        el.innerHTML = '<div class="empty"><div class="empty-icon">✓</div><div class="empty-text">承認待ちの案件はありません</div></div>';
        return;
    }

    // 申請者名を一括取得
    const requesterIds = [...new Set(actionable.map(s => s.approval_requests?.requester_id).filter(Boolean))];
    const requesterMap = {};
    if (requesterIds.length > 0) {
        const { data: prs } = await db.from('profiles').select('id, name').in('id', requesterIds);
        if (prs) prs.forEach(p => { requesterMap[p.id] = p.name; });
    }

    el.innerHTML = actionable.map(s => {
        const req  = s.approval_requests;
        const pNum = req.project_number || '—';
        const date = fmtDate(req.created_at);
        return `
        <div class="side-card is-pending-action" onclick="openDetailModal('${req.id}')">
            <div class="side-card-title">${esc(pNum)}</div>
            <div class="side-card-sub">${esc(FLOW_LABELS[req.flow_type] || req.flow_type)} | ${date}</div>
            <div class="side-card-status">🔴 要承認</div>
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

    if (reqs.length === 0) {
        el.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">申請中の案件はありません</div></div>';
        return;
    }

    // 4区分に振り分け（ペンディング項目があるものはステータスに関わらず優先表示）
    const groups = { inprogress: [], waiting: [], pending: [], approved: [] };
    reqs.forEach(req => {
        const unresolvedPending = (req.sheet_data?.pending_items || [])
            .filter(p => (p.content || p.machine) && !p.completed);
        if (req.status === 'draft' || req.status === 'rejected') {
            groups.inprogress.push(req);
        } else if (unresolvedPending.length > 0) {
            groups.pending.push({ req, pendingCount: unresolvedPending.length });
        } else if (req.status === 'submitted' || req.status === 'in_review') {
            groups.waiting.push(req);
        } else if (req.status === 'approved') {
            groups.approved.push(req);
        } else {
            groups.waiting.push(req);
        }
    });

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
        return `
        <div class="side-card ${cardClass}" onclick="${cardClick}" title="${esc(pNum)} ${flowLabel}">
            <div class="mine-col-num">${esc(pNum)}${resubmitBadge}</div>
            <div class="mine-col-flow">${flowLabel}</div>
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

    const arrow = '<div class="kanban-arrow">→</div>';
    el.innerHTML = [
        renderColumn('申請中', groups.inprogress, false),
        renderColumn('承認待ち', groups.waiting, false),
        renderColumn('ペンディング', groups.pending, true),
        renderColumn('承認済み', groups.approved, false)
    ].join(arrow);
}

async function loadProgress() {
    const el = document.getElementById('tab_content_progress');
    el.innerHTML = '<div class="loading-indicator">読み込み中...</div>';

    // 全申請レコードを機械名付きで取得（shippingの承認者名表示のためapproval_stepsも含む）
    const { data: allReqs } = await db
        .from('approval_requests')
        .select('id, project_number, machine_name, flow_type, status, has_inspection, test_run, created_at, updated_at, confirmed_shipping_date, inspection_date, inspection_time, requester_id, sheet_data, approval_steps(approver_id, status)')
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
        .select('project_number, machine, text')
        .in('text', ['機械組立', '外観検査', '試運転', '出荷確認会議', '工場出荷'])
        .not('machine', 'is', null);

    const machineTaskSet = new Set(
        (machineTasks || []).map(t => `${t.project_number}__${t.machine}__${t.text}`)
    );
    const hasTask = (num, machine, taskText) => machineTaskSet.has(`${num}__${machine}__${taskText}`);

    // 工番レベルのフロータスク（machine不問）- 簡易検査/外観検査/出荷確認会議はproject全体に1つの場合がある
    const { data: projectFlowTasks } = await db.from('tasks')
        .select('project_number, text')
        .in('text', ['簡易検査', '外観検査', '出荷確認会議']);
    const projectFlowSet = new Set(
        (projectFlowTasks || []).map(t => `${(t.project_number||'').toString().trim()}__${t.text}`)
    );
    const hasProjectFlow = (num, text) => projectFlowSet.has(`${num}__${text}`);

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
        if (is2000sSeries(num))       return false;
        if (isTInspectionSeries(num)) return false;
        if (is5or7Series(num))        return false;
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

    progressCachedData = { baseNums, projectData, machineTaskSet, projectFlowSet, shippingApproverNameMap };

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

function matchesPrefix(num, prefix) {
    if (prefix === '3')  return /^3\d/.test(num);
    if (prefix === '4')  return /^4\d/.test(num);
    if (prefix === '3C') return /^3C/i.test(num);
    if (prefix === '4C') return /^4C/i.test(num);
    if (prefix === 'D')  return /^D/i.test(num);
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

    const { baseNums, projectData, machineTaskSet, projectFlowSet, shippingApproverNameMap } = progressCachedData;
    const hasTask        = (num, machine, taskText) => machineTaskSet.has(`${num}__${machine}__${taskText}`);
    const hasProjectFlow = (num, text) => (projectFlowSet || new Set()).has(`${num}__${text}`);

    // 完了済みフィルタ（通常時は完了済みを除外、完了済みモード時は完了済みのみ）
    let nums = baseNums.filter(num => completedProjectNums.has(num) === progressFilterCompleted);

    // 並び替え
    if (progressSort === 'shipping') {
        nums.sort((a, b) => {
            const da = projectsMap[a]?.shipping_date || '9999-12-31';
            const db2 = projectsMap[b]?.shipping_date || '9999-12-31';
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
        { type: 'assembly',          label: '組立',     alwaysShow: true },
        { type: 'test_run',          label: '試運転',   alwaysShow: false },
        { type: 'simple_inspection', label: '簡易検査', alwaysShow: false },
        { type: 'inspection',        label: '外観検査', alwaysShow: false },
        { type: 'shipping_meeting',  label: '出荷会議', alwaysShow: false },
        { type: 'shipping',          label: '出荷',     alwaysShow: true }
    ];

    const html = nums.map(num => {
        const pInfo    = projectsMap[num] || {};
        const label    = [pInfo.customer_name, pInfo.project_details].filter(Boolean).join('　');
        const machines = Object.keys(projectData[num]).sort();
        const shippingDateLabel = pInfo.shipping_date
            ? `<span class="prog-card-date"><span class="prog-card-date-label">出荷予定日</span> <span class="prog-card-date-value">${fmtDate(pInfo.shipping_date)}</span></span>`
            : '';

        const machineRows = machines.map(machine => {
            const mData = projectData[num][machine];
            const tplC  = isTemplateC(num);

            const applicable = FLOW_DEFS.filter(f => {
                if (f.alwaysShow) return true;
                if (f.type === 'test_run')          return hasTask(num, machine, '試運転')     || !!mData.flows['test_run'];
                if (f.type === 'simple_inspection') return hasProjectFlow(num, '簡易検査')     || hasTask(num, machine, '簡易検査')     || !!mData.flows['simple_inspection'];
                if (f.type === 'inspection')        return hasProjectFlow(num, '外観検査')     || hasTask(num, machine, '外観検査')     || !!mData.flows['inspection'];
                if (f.type === 'shipping_meeting')  return hasProjectFlow(num, '出荷確認会議') || hasTask(num, machine, '出荷確認会議') || !!mData.flows['shipping_meeting'];
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

                if ((!req || req.status === 'rejected') && canApply && !progressFilterCompleted) {
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
                </div>${connector}`;
            }).join('');

            const machineLabel = machines.length > 1 ? `<div class="prog-machine-label">【${esc(machine)}】</div>` : '';
            return `<div class="prog-machine-row">
                ${machineLabel}
                <div class="flow-steps">${nodes}</div>
            </div>`;
        }).join('');

        return `<div class="prog-card">
            <div class="prog-card-header">
                <span class="prog-card-num">${esc(num)}</span>${label ? `<span class="prog-card-label">${esc(label)}</span>` : ''}${shippingDateLabel}
            </div>
            ${machineRows}
        </div>`;
    }).join('');

    wrap.innerHTML = html;
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

    if (flowType === 'assembly' || flowType === 'test_run') {
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
    detectedFlows = { inspection: false, test_run: false, shippingMeeting: false };

    // モーダルタイトルをフロー種別で切り替え
    document.getElementById('submit_modal_title').textContent =
        flowType === 'test_run' ? '試運転完了通知 — 申請' : '組立完了通知 — 申請';

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
        if (btnSubmit)  btnSubmit.style.display  = '';
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
        document.getElementById('submit_project_info').style.display = 'block';
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
    pendingItems.push({ machine: '', content: '', due: '' });
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
            <div style="display:flex;flex-direction:column;width:135px;flex-shrink:0;">
                <span style="display:block;font-size:10px;line-height:1.4;color:#999;">完了予定日</span>
                <input type="date" class="pending-due" value="${esc(item.due)}"
                       onchange="pendingItems[${i}].due=this.value">
            </div>
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

        currentDraftId = null;
        closeSubmitModal();
        await refreshAll();
        ui.send('SAVED');
        const count = machineNums.length;
        const isParallelStaff = (currentFlowType === 'assembly' && submitterRole !== 'assembly_manager') ||
                                (currentFlowType === 'test_run'  && submitterRole !== 'operations_manager');
        const approverLabel = isParallelStaff
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
    const canComplete = isQaFlow
        ? null // QAフローは項目ごとに判定する（下記itemCanComplete）
        : (isMyRequest && ['submitted', 'in_review', 'approved'].includes(req.status));
    // QA開催結果で追加したペンディング項目は、完了前であれば編集・削除できる
    const canManage = isQaFlow && isQualityOrSeikan && req.status === 'submitted';
    const rawItems = (req.sheet_data?.pending_items || []).filter(p => p.content || p.machine);
    if (!rawItems.length) return '';
    // 固定の「出荷準備」項目は常に最後に表示する（元の配列インデックスはidxとして保持）
    const indexed = rawItems.map((item, idx) => ({ item, idx }));
    const items = isQaFlow
        ? [...indexed].sort((a, b) => (a.item.fixed ? 1 : 0) - (b.item.fixed ? 1 : 0))
        : indexed;
    const editLbl = `<span style="display:block;font-size:10px;line-height:1.4;color:#999;">完了予定日</span>`;
    return `
        <hr class="section-divider">
        <div class="section-title">ペンディング項目</div>
        ${items.map(({ item, idx }) => {
            // QAフローは「品証」または「担当者本人（項目に担当者が設定されている場合）」が完了操作できる
            const itemCanComplete = isQaFlow
                ? (req.status === 'submitted' && (isQualityOrSeikan || (item.owner && currentProfile?.name === item.owner)))
                : canComplete;
            if (canManage && qaEditingPendingIdx === idx) {
                return `
            <div class="pending-detail-row pending-detail-editing">
                <div class="pending-detail-icon">●</div>
                <div class="pending-detail-content qa-pending-row" style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;">
                    <div style="display:flex;flex-direction:column;flex:1;min-width:120px;">
                        <span style="display:block;font-size:11px;line-height:1.4;color:#999;">内容</span>
                        <input type="text" id="qa_edit_content_${idx}" class="pending-content" placeholder="内容" value="${esc(item.content)}" ${item.fixed ? 'readonly' : ''}>
                    </div>
                    <div style="display:flex;flex-direction:column;flex-shrink:0;min-width:90px;">
                        <span style="display:block;font-size:11px;line-height:1.4;color:#999;">担当者</span>
                        <input type="text" id="qa_edit_owner_${idx}" class="pending-content" placeholder="担当者名" value="${esc(item.owner || '')}">
                    </div>
                    <div style="display:flex;flex-direction:column;flex-shrink:0;">
                        ${editLbl}
                        <input type="date" id="qa_edit_due_${idx}" class="pending-due" value="${esc(item.due || '')}">
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
                <div class="pending-detail-icon">${item.completed ? '✓' : '●'}</div>
                <div class="pending-detail-content">
                    <div class="pending-detail-text">${item.machine ? `<span class="pending-detail-machine">${esc(item.machine)}</span> ` : ''}${esc(item.content || '—')}</div>
                    ${item.owner ? `<div class="pending-detail-due">担当: ${esc(item.owner)}</div>` : ''}
                    ${item.due && !item.completed ? `<div class="pending-detail-due">期日: ${esc(item.due)}</div>` : ''}
                    ${item.completed ? `<div class="pending-detail-date">完了: ${esc(item.completed_date || '')}</div>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    ${itemCanComplete ? (item.completed
                        ? `<button class="btn-undo-xs" onclick="uncompletePendingItem('${req.id}', ${idx})">取り消す</button>`
                        : `<button class="btn-success-xs" onclick="completePendingItem('${req.id}', ${idx})">完了にする</button>`) : ''}
                    ${canManage && !item.completed ? `
                        <button class="btn-icon-xs" title="編集" onclick="startEditQaPendingItem(${idx})">✎</button>
                        ${item.fixed ? '' : `<button class="btn-icon-xs btn-icon-danger" title="削除" onclick="deleteQaPendingItem('${req.id}', ${idx})">🗑</button>`}
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

// QA開催案内を「完了にする」ボタンを出せる状態か（未完了のペンディングが残っていないこと等）
function qaCanFinalize(req) {
    if (!QA_MEETING_FLOWS.includes(req.flow_type)) return false;
    if (!isQualityOrSeikan || req.status !== 'submitted') return false;
    if (!qaMeetingPassed(req)) return false;
    const items = (req.sheet_data?.pending_items || []).filter(p => p.content || p.machine);
    return items.filter(p => !p.completed).length === 0;
}

// ===== 開催結果・ペンディング確認セクション HTML 生成（簡易検査・外観検査・出荷確認会議） =====
function buildQaResultSectionInner(req, isMyRequest) {
    const meetingPassed    = qaMeetingPassed(req);
    const items            = (req.sheet_data?.pending_items || []).filter(p => p.content || p.machine);
    const canManage        = isQualityOrSeikan && req.status === 'submitted';

    let body;
    if (req.status === 'approved') {
        body = items.length
            ? `<div id="pending_detail_section">${buildPendingSectionInner(req, isMyRequest)}</div>`
            : '<div style="color:#888; font-size:13px; padding:4px 0;">ペンディングなし・確認完了</div>';
    } else if (!meetingPassed) {
        body = '<div style="color:#888; font-size:13px; padding:4px 0;">開催日以降にペンディング確認・完了操作ができます。</div>';
    } else {
        body = `
            <div id="pending_detail_section">${buildPendingSectionInner(req, isMyRequest)}</div>
            ${canManage ? `
            <div class="pending-row qa-pending-row" style="margin-top:8px;align-items:flex-end;">
                <div style="display:flex;flex-direction:column;flex:1;">
                    <span style="display:block;font-size:11px;line-height:1.4;color:#999;">内容</span>
                    <input type="text" id="qa_pending_content" class="pending-content" placeholder="内容">
                </div>
                <div style="display:flex;flex-direction:column;flex-shrink:0;">
                    <span style="display:block;font-size:11px;line-height:1.4;color:#999;">完了予定日</span>
                    <input type="date" id="qa_pending_due" class="pending-due">
                </div>
                <button type="button" class="btn-xs" onclick="addQaPendingItem('${req.id}')">＋ 追加</button>
            </div>
            ` : ''}
        `;
    }

    return `<hr class="section-divider">
        <div class="section-title">開催結果・ペンディング確認</div>
        ${body}`;
}

// ===== 出荷準備完了確認（担当者ペンディング） =====
function buildPrepResultSectionInner(req, isMyRequest) {
    const items     = (req.sheet_data?.pending_items || []).filter(p => p.content || p.machine);
    const canManage = isQualityOrSeikan && req.status === 'submitted';

    let body;
    if (req.status === 'approved') {
        body = items.length
            ? `<div id="pending_detail_section">${buildPendingSectionInner(req, isMyRequest)}</div>`
            : '<div style="color:#888; font-size:13px; padding:4px 0;">ペンディングなし・確認完了</div>';
    } else {
        body = `
            <div id="pending_detail_section">${buildPendingSectionInner(req, isMyRequest)}</div>
            ${canManage ? `
            <div class="pending-row qa-pending-row" style="margin-top:8px;align-items:flex-end;">
                <div style="display:flex;flex-direction:column;flex:1;min-width:100px;">
                    <span style="display:block;font-size:11px;line-height:1.4;color:#999;">内容</span>
                    <input type="text" id="qa_pending_content" class="pending-content" placeholder="内容">
                </div>
                <div style="display:flex;flex-direction:column;flex-shrink:0;min-width:90px;">
                    <span style="display:block;font-size:11px;line-height:1.4;color:#999;">担当者</span>
                    <input type="text" id="qa_pending_owner" class="pending-content" placeholder="担当者名">
                </div>
                <div style="display:flex;flex-direction:column;flex-shrink:0;">
                    <span style="display:block;font-size:11px;line-height:1.4;color:#999;">完了予定日</span>
                    <input type="date" id="qa_pending_due" class="pending-due">
                </div>
                <button type="button" class="btn-xs" onclick="addQaPendingItem('${req.id}')">＋ 追加</button>
            </div>
            ` : ''}
        `;
    }

    return `<hr class="section-divider">
        <div class="section-title">担当者確認・ペンディング項目</div>
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
    let requesterName = '—', requesterDept = '—';
    if (req?.requester_id) {
        const { data: rp } = await db.from('profiles').select('name, department').eq('id', req.requester_id).single();
        if (rp) { requesterName = rp.name; requesterDept = rp.department; }
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
    const slbl   = (req.flow_type === 'shipping' && req.status === 'submitted')
        ? '常務承認待ち'
        : (QA_MEETING_FLOWS.includes(req.flow_type) && req.status === 'submitted')
        ? '開催待ち'
        : (OWNER_PENDING_FLOWS.includes(req.flow_type) && req.status === 'submitted')
        ? '確認待ち'
        : (STATUS_LABELS[req.status] || req.status);

    // 自分が担当すべきステップか確認
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
        else if (rejectedStep)                          { icon = '×'; sc = 'sc-rejected'; }
        else if (req.status === 'submitted')            { icon = '⏳'; sc = 'sc-pending'; }
        else                                            { icon = '—';  sc = 'sc-waiting'; }
        const who      = activeStep?.approver_id ? (approverNames[activeStep.approver_id] || '—') : null;
        const roleLabel = activeStep ? (ROLE_LABELS[activeStep.approver_role] || activeStep.approver_role) : null;
        const when     = activeStep?.decided_at ? fmtDate(activeStep.decided_at) : '';
        stepsHtml = `
        <div class="step-item">
            <div class="step-circle ${sc}">${icon}</div>
            <div class="step-detail">
                ${who
                    ? `<div class="step-name">${esc(who)}${roleLabel ? `（${esc(roleLabel)}）` : ''}</div>`
                    : '<div class="step-name" style="color:#bbb;">未</div>'}
                ${activeStep?.comment ? `<div class="step-comment">"${esc(activeStep.comment)}"</div>` : ''}
                ${when               ? `<div class="step-date">${when}</div>` : ''}
            </div>
        </div>`;
    } else if (req.flow_type === 'shipping') {
        // shipping: 担当者確認（簡易検査）＋常務承認ステップ
        const step = steps[0];
        let icon, sc;
        if      (step?.status === 'approved') { icon = '✓'; sc = 'sc-approved'; }
        else if (step?.status === 'rejected') { icon = '×'; sc = 'sc-rejected'; }
        else if (req.status === 'submitted')  { icon = '⏳'; sc = 'sc-pending'; }
        else                                  { icon = '—';  sc = 'sc-waiting'; }
        const who  = step?.approver_id ? (approverNames[step.approver_id] || '—') : null;
        const when = step?.decided_at ? fmtDate(step.decided_at) : '';
        stepsHtml = `
        <div style="margin-bottom:14px;">
            <div style="font-size:12px; color:#888; font-weight:bold; margin-bottom:6px;">担当者確認（簡易検査）</div>
            <div style="font-size:13px; line-height:2; background:#f8f9fa; border-radius:4px; padding:8px 12px;">
                <div><span style="color:#888; font-size:11px; width:36px; display:inline-block;">設計</span>${esc(shippingOwners?.sekkei || 'なし')}</div>
                <div><span style="color:#888; font-size:11px; width:36px; display:inline-block;">組立</span>${esc(shippingOwners?.kumitatе || 'なし')}</div>
                <div><span style="color:#888; font-size:11px; width:36px; display:inline-block;">操業</span>${esc(shippingOwners?.shiunten || 'なし')}</div>
                <div><span style="color:#888; font-size:11px; width:36px; display:inline-block;">営業</span>${esc(shippingOwners?.sales || 'なし')}</div>
            </div>
        </div>
        <div style="font-size:12px; color:#888; font-weight:bold; margin-bottom:6px;">常務承認</div>
        <div class="step-item">
            <div class="step-circle ${sc}">${icon}</div>
            <div class="step-detail">
                ${who
                    ? `<div class="step-name">${esc(who)}（常務）</div>`
                    : '<div class="step-name" style="color:#bbb;">未</div>'}
                ${step?.comment ? `<div class="step-comment">"${esc(step.comment)}"</div>` : ''}
                ${when          ? `<div class="step-date">${when}</div>` : ''}
            </div>
        </div>`;
    } else if (QA_MEETING_FLOWS.includes(req.flow_type)) {
        stepsHtml = '<div style="color:#888; font-size:13px; padding:4px 0;">承認フローなし（開催案内を送信済み）</div>';
    } else if (OWNER_PENDING_FLOWS.includes(req.flow_type)) {
        stepsHtml = '<div style="color:#888; font-size:13px; padding:4px 0;">承認フローなし（担当者確認を進行中）</div>';
    } else {
        stepsHtml = steps.map(s => {
            let icon, sc;
            if      (s.status === 'approved') { icon = '✓'; sc = 'sc-approved'; }
            else if (s.status === 'rejected') { icon = '×'; sc = 'sc-rejected'; }
            else if (s.status === 'pending' &&
                     ((s.step_order === 1 && req.status === 'submitted') ||
                      (s.step_order === 2 && req.status === 'in_review')))
                                              { icon = '⏳'; sc = 'sc-pending'; }
            else                              { icon = '—';  sc = 'sc-waiting'; }
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

    document.getElementById('detail_title').textContent = PENDING_ONLY_FLOWS.includes(req.flow_type)
        ? (QA_DETAIL_TITLE_LABELS[req.flow_type] || req.flow_type)
        : (FLOW_LABELS[req.flow_type] || req.flow_type);
    document.getElementById('detail_body').innerHTML = `
        <table class="info-table">
            <tr><td>工事番号</td><td>${esc(pNum)}</td></tr>
            ${pInfo.customer_name   ? `<tr><td>客先</td><td>${esc(pInfo.customer_name)}</td></tr>`   : ''}
            ${pInfo.project_details ? `<tr><td>工事名</td><td>${esc(pInfo.project_details)}</td></tr>` : ''}
            ${req.machine_name ? `<tr><td>機械名</td><td>${esc(req.machine_name)}</td></tr>` : ''}
            <tr><td>申請者</td><td>${esc(requesterName)}（${esc(requesterDept)}）</td></tr>
            ${req.flow_type === 'assembly' ? `<tr><td>試運転</td><td>${req.test_run ? 'あり' : 'なし'}</td></tr>` : ''}
            ${req.flow_type === 'shipping' && req.confirmed_shipping_date ? `<tr><td>確定出荷日</td><td>${fmtDate(req.confirmed_shipping_date)}</td></tr>` : ''}
            ${QA_MEETING_FLOWS.includes(req.flow_type) && req.inspection_date
                ? `<tr><td>開催日</td><td>${fmtDate(req.inspection_date)}${req.inspection_time ? '　' + req.inspection_time : ''}</td></tr>` : ''}
            ${QA_MEETING_FLOWS.includes(req.flow_type) && req.inspection_location
                ? `<tr><td>場所</td><td>${esc(req.inspection_location)}</td></tr>` : ''}
            <tr><td>申請日</td><td>${fmtDate(req.created_at)}</td></tr>
            <tr><td>状態</td><td><span class="status-badge ${cls}">${slbl}</span>${req.is_resubmit ? ' <span class="resubmit-badge">再申請</span>' : ''}</td></tr>
        </table>
        ${req.note ? `<div style="background:#f8f9fa; border-radius:4px; padding:10px 12px; font-size:13px; color:#555; margin-bottom:14px;">${esc(req.note)}</div>` : ''}
        ${!PENDING_ONLY_FLOWS.includes(req.flow_type)
            ? '<hr class="section-divider"><div class="section-title">承認ステップ</div>' : ''}
        <div class="steps-list">${stepsHtml}</div>
        ${req.sheet_data && (req.flow_type === 'assembly' || req.flow_type === 'test_run') ? (() => {
            const isAssembly = req.flow_type === 'assembly';
            const isApproved = req.status === 'approved';
            const sectionTitle = isAssembly
                ? (isApproved ? '機械組立完了報告書' : '機械組立完了チェックシート')
                : (isApproved ? '社内試運転完了報告書' : '社内試運転完了チェックシート');
            const btnLabel = isApproved ? sectionTitle : (isAssembly ? 'チェックシート' : 'チェックシート');
            const sheetFile = isAssembly ? 'sheet.html' : 'test_run_sheet.html';

            return `<hr class="section-divider">
        <div class="section-title">${sectionTitle}</div>
        <button class="btn btn-secondary" style="font-size:13px; padding:7px 18px; margin-top:2px;" onclick="window.open('${sheetFile}?view=1&id=${req.id}', '_blank')">${btnLabel}を確認する →</button>
        <div id="pending_detail_section">${buildPendingSectionInner(req, isMyRequest)}</div>`;
        })() : ''}
        ${QA_MEETING_FLOWS.includes(req.flow_type) && req.status !== 'cancelled'
            ? `<div id="qa_result_section">${buildQaResultSectionInner(req, isMyRequest)}</div>`
            : ''}
        ${OWNER_PENDING_FLOWS.includes(req.flow_type) && req.status !== 'cancelled'
            ? `<div id="qa_result_section">${buildPrepResultSectionInner(req, isMyRequest)}</div>`
            : ''}
        ${req.flow_type === 'shipping' ? `
        <hr class="section-divider">
        <div class="section-title">出荷確認書</div>
        <button class="btn btn-secondary" style="font-size:13px; padding:7px 18px; margin-top:2px;" onclick="window.open('shipping_sheet.html?view=1&id=${req.id}', '_blank')">出荷確認書を確認する →</button>` : ''}
        ${myStep ? `
        <hr class="section-divider">
        <div class="form-group">
            <label>コメント${myStep ? '' : '（任意）'}</label>
            <textarea id="approval_comment" placeholder="承認・却下の理由など（却下時は必須）"></textarea>
        </div>` : ''}
    `;

    // フッターボタン
    const footer = document.getElementById('detail_footer');
    const isSales = getEffectiveRole() === 'staff' && getEffectiveDept() === '営業';
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
    } else if (req.flow_type === 'shipping' && req.status === 'awaiting_shipping_date' && isSales) {
        footer.innerHTML = buildSalesDateFooterInner(req);
    } else if (req.flow_type === 'shipping' && req.status === 'awaiting_shipping_confirm' && (isMyRequest || isQualityOrSeikan)) {
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
            <button class="btn btn-success"   onclick="confirmAndSubmitShipping('${req.id}')">内容を確認し申請する</button>
        `;
    } else if (canReschedule) {
        footer.innerHTML = buildQaFooterInner(req);
    } else if (OWNER_PENDING_FLOWS.includes(req.flow_type) && isQualityOrSeikan && req.status === 'submitted') {
        footer.innerHTML = buildPrepFooterInner(req);
    }
}

// ===== 出荷準備確認フッター =====
function buildPrepFooterInner(req) {
    return `
        ${qaCanFinalize(req) ? `<button class="btn btn-success" onclick="finalizeQaMeeting('${req.id}')">完了にする</button>` : ''}
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
    `;
}

// ===== 営業: 確定出荷日入力フッター =====
function buildSalesDateFooterInner(req) {
    return `
        <input type="date" id="sales_date_input" style="margin-right:auto;padding:8px 10px;border:1px solid #ccc;border-radius:4px;font-size:14px;">
        <button class="btn btn-secondary" onclick="closeDetailModal()">閉じる</button>
        <button class="btn btn-success"   onclick="submitSalesShippingDate('${req.id}')">入力する</button>
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

async function completePendingItem(requestId, idx) {
    showLoading('更新中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data').eq('id', requestId).single();
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

        _applyPendingUpdate(requestId, newSheetData, 'ペンディング項目を完了にしました');
    } catch(e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function uncompletePendingItem(requestId, idx) {
    showLoading('更新中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data').eq('id', requestId).single();
        if (!req?.sheet_data) return;

        const items = req.sheet_data.pending_items || [];
        if (!items[idx]) return;

        items[idx] = { ...items[idx], completed: false, completed_date: null };

        const newSheetData = { ...req.sheet_data, pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);

        _applyPendingUpdate(requestId, newSheetData, '完了を取り消しました');
    } catch(e) {
        showToast('更新に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

function _applyPendingUpdate(requestId, newSheetData, toastMsg) {
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
        } else if (OWNER_PENDING_FLOWS.includes(currentDetailReq.flow_type)) {
            const el = document.getElementById('qa_result_section');
            if (el) {
                el.innerHTML = buildPrepResultSectionInner(currentDetailReq, isMyRequest);
                const footerEl = document.getElementById('detail_footer');
                if (footerEl) footerEl.innerHTML = buildPrepFooterInner(currentDetailReq);
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
    // フォールバック: モーダルを再描画
    openDetailModal(requestId).then(() => showToast(toastMsg, 'success', true));
}

// ===== 開催結果・ペンディング確認（簡易検査・外観検査・出荷確認会議） =====
async function addQaPendingItem(requestId) {
    const contentEl = document.getElementById('qa_pending_content');
    const ownerEl   = document.getElementById('qa_pending_owner');
    const dueEl     = document.getElementById('qa_pending_due');
    const content   = contentEl ? contentEl.value.trim() : '';
    const owner     = ownerEl ? ownerEl.value.trim() : '';
    const due       = dueEl ? dueEl.value : '';
    if (!content) { showToast('内容を入力してください', 'error'); return; }

    showLoading('追加中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data, flow_type').eq('id', requestId).single();
        const items = req?.sheet_data?.pending_items || [];
        items.push({ content, due, owner: owner || null, completed: false, completed_date: null });
        const newSheetData = { ...(req?.sheet_data || {}), pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);

        // 出荷準備確認: 担当者に「ペンディング項目が割り当てられた」ことを通知
        if (owner && OWNER_PENDING_FLOWS.includes(req?.flow_type)) {
            const { data: pRows } = await db.from('profiles').select('id').eq('name', owner);
            if (pRows?.length > 0) {
                await db.from('approval_notifications').insert(
                    pRows.map(p => ({ request_id: requestId, recipient_id: p.id, notification_type: 'prep_item_assigned' }))
                );
            } else {
                const { data: nRows } = await db.from('notification_recipients').select('email').eq('name', owner).eq('active', true);
                if (nRows?.length > 0) {
                    await db.from('approval_notifications').insert(
                        nRows.map(n => ({ request_id: requestId, recipient_email: n.email, notification_type: 'prep_item_assigned' }))
                    );
                }
            }
        }

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
    const contentEl = document.getElementById(`qa_edit_content_${idx}`);
    const ownerEl   = document.getElementById(`qa_edit_owner_${idx}`);
    const dueEl     = document.getElementById(`qa_edit_due_${idx}`);
    const content   = contentEl ? contentEl.value.trim() : '';
    const due       = dueEl ? dueEl.value : '';
    if (!content) { showToast('内容を入力してください', 'error'); return; }

    showLoading('更新中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data').eq('id', requestId).single();
        const items = req?.sheet_data?.pending_items || [];
        if (!items[idx]) return;
        items[idx] = { ...items[idx], content, due, ...(ownerEl ? { owner: ownerEl.value.trim() || null } : {}) };
        const newSheetData = { ...(req?.sheet_data || {}), pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);

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
        items.splice(idx, 1);
        const newSheetData = { ...(req?.sheet_data || {}), pending_items: items };
        await db.from('approval_requests').update({ sheet_data: newSheetData }).eq('id', requestId);

        _applyPendingUpdate(requestId, newSheetData, 'ペンディング項目を削除しました');
    } catch (e) {
        showToast('削除に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

async function finalizeQaMeeting(requestId) {
    if (!confirm('この開催案内を完了にします。よろしいですか？')) return;

    showLoading('処理中...');
    try {
        const { data: req } = await db.from('approval_requests')
            .select('sheet_data').eq('id', requestId).single();
        const unresolved = (req?.sheet_data?.pending_items || []).filter(p => (p.content || p.machine) && !p.completed);
        if (unresolved.length > 0) { showToast('未完了のペンディング項目があります', 'error'); return; }

        await db.from('approval_requests')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        await openDetailModal(requestId);
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

// ===== Approve =====
async function approveStep(requestId, stepId, stepOrder) {
    const comment  = (document.getElementById('approval_comment')?.value || '').trim();

    // assembly は並列承認（どちらかが承認した時点で即完了）、test_run は直列
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
        const { data: allSteps } = await db.from('approval_steps').select('approver_role').eq('request_id', requestId);
        const rolesToNotify = [...new Set((allSteps || []).map(s => s.approver_role))];
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

// その機械にどのフローが該当するか（タスクの有無から判定）
async function _detectApplicableFlows(projectNum, machine) {
    const { data: tasks } = await db.from('tasks')
        .select('text').eq('project_number', projectNum).eq('machine', machine);
    const taskNames = (tasks || []).map(t => (t.text || '').trim());
    return {
        simple_inspection: !is2000sSeries(projectNum),
        test_run:          taskNames.includes('試運転'),
        inspection:        taskNames.includes('外観検査'),
        shipping_meeting:  taskNames.includes('出荷確認会議'),
        shipping:          taskNames.includes('工場出荷')
    };
}

// 出荷確定申請の前提として完了しているべきフロー一覧（機械ごとの動的判定）
async function _getRequiredFlows(projectNum, machine) {
    const flags = await _detectApplicableFlows(projectNum, machine);
    const required = new Set(['assembly']);
    if (flags.simple_inspection) required.add('simple_inspection');
    if (flags.test_run)          required.add('test_run');
    if (flags.inspection)        required.add('inspection');
    if (flags.shipping_meeting)  required.add('shipping_meeting');
    return required;
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

    // 全開催案内共通
    await addP({ department: '製管', role: 'staff' });
    await addP({ role: 'assembly_director' });
    for (const o of kumitateOwners) await addPbyName(o);
    for (const o of shiuntenOwnersFallback) await addPbyName(o);
    await addEbyName(salesOwner);
    for (const o of sekkeiOwnersFallback) await addEbyName(o);
    // 設計管理職: 担当者の上長を members テーブルから取得
    await addSekkeiSupervisors();
    await addE({ department: '技戦' });

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
    document.getElementById('si_project_info').style.display = 'block';
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
    let doneFlows;
    try {
        doneFlows = await _getMachineDoneFlows(num, machine);
    } finally {
        hideLoading();
    }
    document.getElementById('si_flow_list').innerHTML = [
        { type: 'assembly', label: '組立完了通知' },
        { type: 'test_run', label: '試運転完了通知' }
    ].map(f => `<div class="flow-info-item">
        <span class="flow-info-icon">${doneFlows.has(f.type) ? '✅' : '──'}</span>
        <span class="${doneFlows.has(f.type) ? 'flow-info-done' : 'flow-info-upcoming'}">${esc(f.label)}</span>
        ${doneFlows.has(f.type) ? '<span class="flow-info-note">承認済み</span>' : ''}
    </div>`).join('') +
    `<div class="flow-info-item" style="margin-top:6px;"><span class="flow-info-current">▶ 簡易検査開催案内（今回）</span></div>`;
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
    document.getElementById('inspection_project_info').style.display = 'block';

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
    let doneFlows;
    try {
        doneFlows = await _getMachineDoneFlows(num, machine);
    } finally {
        hideLoading();
    }
    const assemblyDone = doneFlows.has('assembly');
    document.getElementById('inspection_flow_list').innerHTML =
        `<div class="flow-info-item">
            <span class="flow-info-icon">${assemblyDone ? '✅' : '⚠'}</span>
            <span class="${assemblyDone ? 'flow-info-done' : ''}" style="${assemblyDone ? '' : 'color:#e74c3c;'}">組立完了通知</span>
            <span class="flow-info-note">${assemblyDone ? '承認済み' : '未承認'}</span>
        </div>
        <div class="flow-info-item" style="margin-top:6px;"><span class="flow-info-current">▶ 外観検査開催案内（今回）</span></div>`;
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
    document.getElementById('sm_project_info').style.display = 'block';
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
    let doneFlows;
    try {
        doneFlows = await _getMachineDoneFlows(num, machine);
    } finally {
        hideLoading();
    }
    document.getElementById('sm_flow_list').innerHTML = [
        { type: 'assembly',          label: '組立完了通知' },
        { type: 'test_run',          label: '試運転完了通知' },
        { type: 'simple_inspection', label: '簡易検査開催案内' }
    ].map(f => `<div class="flow-info-item">
        <span class="flow-info-icon">${doneFlows.has(f.type) ? '✅' : '──'}</span>
        <span class="${doneFlows.has(f.type) ? 'flow-info-done' : 'flow-info-upcoming'}">${esc(f.label)}</span>
        ${doneFlows.has(f.type) ? '<span class="flow-info-note">承認済み</span>' : ''}
    </div>`).join('') + `<div class="flow-info-item" style="margin-top:6px;"><span class="flow-info-current">▶ 出荷確認会議開催案内（今回）</span></div>`;
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
    document.getElementById('shipping_date_input').value  = '';
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
    document.getElementById('shipping_project_info').style.display = 'block';
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
    document.getElementById('shipping_flow_list').innerHTML =
        rows.map(f => `<div class="flow-info-item">
            <span class="flow-info-icon">${doneFlows.has(f.type) ? '✅' : '──'}</span>
            <span class="${doneFlows.has(f.type) ? 'flow-info-done' : 'flow-info-upcoming'}">${esc(f.label)}</span>
            ${doneFlows.has(f.type) ? '<span class="flow-info-note">承認済み</span>' : '<span class="flow-info-note" style="color:#c0392b;">未完了</span>'}
        </div>`).join('') +
        `<div class="flow-info-item" style="margin-top:6px;"><span class="flow-info-current">▶ 出荷確定申請（今回）</span></div>`;
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
    const dateVal = document.getElementById('sales_date_input')?.value;
    if (!dateVal) { showToast('確定出荷日を入力してください', 'error'); return; }

    showLoading('処理中...');
    try {
        const { data: req, error } = await db.from('approval_requests')
            .update({ confirmed_shipping_date: dateVal, status: 'awaiting_shipping_confirm', updated_at: new Date().toISOString() })
            .eq('id', requestId).eq('status', 'awaiting_shipping_date')
            .select().single();
        if (error) throw error;
        if (!req) { showToast('既に処理済みです', 'error'); return; }

        // 申請者（品証）＋品証・製管全体へ確認依頼を通知
        const notifIds = new Set();
        if (req.requester_id) notifIds.add(req.requester_id);
        const { data: qRows } = await db.from('profiles').select('id').eq('role', 'quality');
        (qRows || []).forEach(p => notifIds.add(p.id));
        const { data: sRows } = await db.from('profiles').select('id').eq('department', '製管').eq('role', 'staff');
        (sRows || []).forEach(p => notifIds.add(p.id));
        if (notifIds.size > 0) {
            await db.from('approval_notifications').insert(
                [...notifIds].map(id => ({ request_id: requestId, recipient_id: id, notification_type: 'shipping_date_input_done' }))
            );
        }

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

// ===== Notifications =====

async function recordFlowNotifications(requestId, flowType) {
    // 工番・機械名・申請者IDを取得
    const { data: req } = await db.from('approval_requests').select('project_number, machine_name, requester_id').eq('id', requestId).single();
    const projectNum = req?.project_number;
    const machineName = req?.machine_name;
    if (!projectNum) return;

    // 申請者のプロファイルを取得（製管スタッフが代理申請した場合の宛先判定に使用）
    let requesterProfile = null;
    if (req?.requester_id) {
        const { data: rp } = await db.from('profiles').select('id, role, department').eq('id', req.requester_id).single();
        requesterProfile = rp;
    }

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
    // 製管スタッフが開催案内を送った場合：相方の製管スタッフ＋品証（田中孝）を宛先に追加
    // 品証が送った場合：製管スタッフ全員（森村・黒崎）を追加
    const addSeikanOrQuality = async () => {
        const isSeikanApplicant = requesterProfile?.department === '製管' && requesterProfile?.role === 'staff';
        if (isSeikanApplicant) {
            const { data: others } = await db.from('profiles').select('id').eq('department', '製管').eq('role', 'staff').neq('id', req.requester_id);
            (others || []).forEach(p => profileIds.add(p.id));
            await addP({ role: 'quality' }); // 品証（田中孝）
        } else {
            await addP({ department: '製管', role: 'staff' }); // 森村・黒崎
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
            // 固定: 品保・製管
            await addP({ role: 'quality' });
            await addP({ department: '製管', role: 'staff' });
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
            // 固定: 品保・製管・常務
            await addP({ role: 'quality' });
            await addP({ department: '製管', role: 'staff' });
            await addP({ role: 'assembly_director' });
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
            await addP({ role: 'assembly_director' });              // 常務
            await addSeikanOrQuality();                             // 森村・黒崎 or 品証（申請者に応じて）
            for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            for (const o of shiuntenOwners) await addPbyName(o);   // 試運転担当者（タスクがあれば）
            await addEbyName(salesOwner);                           // 営業担当者
            for (const o of sekkeiOwners) await addEbyName(o);     // 設計担当者
            await addSekkeiSupervisors();                           // 設計課長・部長
            await addE({ department: '技戦' });                     // 技戦
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
            await addP({ role: 'assembly_director' });              // 常務
            await addSeikanOrQuality();                             // 森村・黒崎 or 品証（申請者に応じて）
            for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            await addEbyName(salesOwner);                           // 営業担当者
            for (const o of sekkeiOwners) await addEbyName(o);     // 設計担当者
            await addSekkeiSupervisors();                           // 設計課長・部長
            await addE({ department: '技戦' });                     // 技戦
            if (kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });           // 組立課長（機械組立あり）
            }
            break;

        case 'inspection':
            notifType = 'inspection_invite';
            await addP({ role: 'assembly_director' });              // 常務
            await addSeikanOrQuality();                             // 森村・黒崎 or 品証（申請者に応じて）
            for (const o of kumitateOwners) await addPbyName(o);   // 組立担当者
            for (const o of shiuntenOwners) await addPbyName(o);   // 試運転担当者（タスクがあれば）
            await addEbyName(salesOwner);                           // 営業担当者
            for (const o of sekkeiOwners) await addEbyName(o);     // 設計担当者
            await addSekkeiSupervisors();                           // 設計課長・部長
            await addE({ department: '技戦' });                     // 技戦
            if (kumitateOwners.length > 0) {
                await addP({ role: 'assembly_manager' });           // 組立課長（機械組立あり）
            }
            if (shiuntenOwners.length > 0) {
                await addP({ role: 'operations_manager' });         // 操業課長（試運転あり）
                await addP({ role: 'operations_director' });        // 操業部長（試運転あり）
            }
            break;

        case 'shipping':
            // 固定
            await addP({ role: 'assembly_director' });          // 常務
            await addP({ department: '製管', role: 'staff' });  // 森村・黒崎
            await addE({ department: '技戦' });                 // 小笠原
            await addE({ department: '物流' });                 // 物流課
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

