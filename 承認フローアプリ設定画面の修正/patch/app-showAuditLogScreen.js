// app.js の showAuditLogScreen() / renderAuditLogRows() を丸ごと差し替える。
// clearAuditLogFilter() は新規追加。AUDIT_CATEGORY_LABELS / auditLogFilter / applyAuditLogFilter() は変更なし。
// 変更者はメールアドレスではなく名前で表示する（profiles / notification_recipients からメール一致で引く。
// 見つからない場合はメールアドレスをそのまま表示。title 属性にはメールアドレスを入れる）。

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

    // ---- クエリ部分は従来どおり（変更なし） ----
    let query = db.from('settings_audit_log')
        .select('changed_at, changed_by, category, summary')
        .order('changed_at', { ascending: false })
        .limit(100);
    if (auditLogFilter.category) query = query.eq('category', auditLogFilter.category);
    if (auditLogFilter.dateFrom) query = query.gte('changed_at', new Date(`${auditLogFilter.dateFrom}T00:00:00+09:00`).toISOString());
    if (auditLogFilter.dateTo)   query = query.lte('changed_at', new Date(`${auditLogFilter.dateTo}T23:59:59+09:00`).toISOString());

    const { data } = await query;
    const rows = data || [];
    // ---- ここまで変更なし ----

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
