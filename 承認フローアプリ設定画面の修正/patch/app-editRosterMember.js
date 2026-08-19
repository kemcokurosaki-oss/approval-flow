// app.js の editRosterMember(key) を丸ごと差し替える。
// saveRosterMember() / deleteLoginRosterMember() / deleteNonLoginRosterMember() / onRmDepartmentSelectChange() は変更不要
// （id: rm_name / rm_email / rm_tier / rm_active / rm_department_select / rm_department_other、
//   クラス rm_extra_dept をそのまま維持している）。

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
