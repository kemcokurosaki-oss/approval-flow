// app.js の showRecipientsListScreen() / showRecipientsDetailScreen() を丸ごと差し替える。
// updateRecipientSelectedCount() は新規追加（保存バーの人数表示を更新するだけの関数）。
// saveRecipientDetail() は変更不要（チェックボックスの data 属性と label 内 1番目の span 構造を維持しているため）。

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

    // ---- ここから下のデータ取得部分は従来どおり（変更なし） ----
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
            const { data: profRows } = await db.from('profiles').select('id, name, email, department, extra_departments')
                .or(`department.eq.${g.department},extra_departments.cs.{${g.department}}`);
            const { data: recRows } = await db.from('notification_recipients').select('id, name, email').eq('department', g.department).eq('active', true);
            candidates = [
                ...(profRows || []).map(p => ({ id: p.id, name: p.name, email: p.email, kind: 'profile', checked: plan.profileIds.includes(p.id),
                                                concurrent: p.department !== g.department })),
                ...(recRows  || []).map(r => ({ id: r.id, name: r.name, email: r.email, kind: 'recipient', checked: plan.recipientIds.includes(r.id) }))
            ];
        }
        // ---- データ取得ここまで ----

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

    // 工番担当者から自動で宛先に加わるグループのON/OFF
    const dynGroups = DYNAMIC_RECIPIENT_GROUPS[flowType] || [];
    const dynPlan   = getDynamicRecipientPlan(flowType);
    const dynHtml = dynGroups.length ? `
        <div class="recip-group">
            <div class="recip-group-header">
                <span class="recip-group-title">工番担当者の自動通知</span>
                <span class="recip-group-kind">部署単位でON / OFF</span>
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
