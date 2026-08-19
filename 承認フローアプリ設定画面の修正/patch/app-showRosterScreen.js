// app.js の showRosterScreen()（現状 3563行目付近）の renderRow / groupsHtml / body.innerHTML を
// 以下の内容に差し替える。関数の前半（db から取得して mergeRosterRows するところ）は変更なし。

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
