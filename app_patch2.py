import sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

results = []

# ── Patch 1: currentDraftId 変数を追加 ──────────────────────────
old = "let sheetChecks = {};\nlet pendingItems = [];"
new = "let sheetChecks = {};\nlet pendingItems = [];\nlet currentDraftId = null;"
if old in content:
    content = content.replace(old, new, 1); results.append('P1 OK')
else:
    results.append('P1 NOT FOUND')

# ── Patch 2: goToSheetStep + backFromSheetModal + finishSheetEntry + reopenSheetModal を置換 ──
old2 = """// ===== チェックシート ステップ切替 =====
function goToSheetStep() {
    const projectNum = currentProjectNum;
    const machineNums = getSelectedMachines('submit_machine_list');
    if (!projectNum)           { showToast('工事番号を選択してください', 'error'); return; }
    if (machineNums.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (currentFlowType !== 'assembly') { submitRequest(); return; }
    // sheet_modal を全画面モーダルとして開く
    document.getElementById('submit_modal').classList.remove('open');
    document.getElementById('sheet_modal').classList.add('open');
}

function backFromSheetModal() {
    document.getElementById('sheet_modal').classList.remove('open');
    document.getElementById('submit_modal').classList.add('open');
}

function finishSheetEntry() {
    // 入力済みバッジを更新
    const checkedCount = Object.values(sheetChecks).filter(v => v).length;
    const indicator = document.getElementById('sheet_entry_indicator');
    if (indicator) indicator.style.display = checkedCount > 0 ? '' : 'none';
    // sheet_modal を閉じて申請画面へ戻り、申請ボタンを表示
    document.getElementById('sheet_modal').classList.remove('open');
    document.getElementById('submit_modal').classList.add('open');
    const btnGoSheet = document.getElementById('btn_go_sheet');
    const btnSubmit  = document.getElementById('submit_btn');
    if (btnGoSheet) btnGoSheet.style.display = 'none';
    if (btnSubmit)  btnSubmit.style.display  = '';
}

function reopenSheetModal() {
    document.getElementById('submit_modal').classList.remove('open');
    document.getElementById('sheet_modal').classList.add('open');
}"""

new2 = """// ===== 自主点検シート（別タブ） =====
async function goToSheetStep() {
    const projectNum = currentProjectNum;
    const machineNums = getSelectedMachines('submit_machine_list');
    if (!projectNum)              { showToast('工事番号を選択してください', 'error'); return; }
    if (machineNums.length === 0) { showToast('機械を選択してください', 'error'); return; }
    if (currentFlowType !== 'assembly') { submitRequest(); return; }
    if (machineNums.length > 1) {
        showToast('点検シートは1台ずつ申請してください', 'error');
        return;
    }

    showLoading('下書きを保存中...');
    try {
        const machine = machineNums[0];
        const note = document.getElementById('submit_note').value.trim();

        // 既存の下書きを確認して再利用
        const { data: existing } = await db.from('approval_requests')
            .select('id')
            .eq('project_number', projectNum)
            .eq('machine_name', machine)
            .eq('flow_type', 'assembly')
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
                flow_type:      'assembly',
                status:         'draft',
                requester_id:   currentUser.id,
                note:           note || null
            }).select().single();
            if (error) throw error;
            currentDraftId = newDraft.id;
        }

        window.open(`sheet.html?draft_id=${currentDraftId}`, '_blank');
        await loadMineSide();
    } catch (e) {
        showToast('下書きの保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 「変更する」ボタン: 既存の下書きをsheet.htmlで再度開く
function reopenSheetTab() {
    if (!currentDraftId) { showToast('下書きIDが不明です。再度「次へ」を押してください', 'error'); return; }
    window.open(`sheet.html?draft_id=${currentDraftId}`, '_blank');
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

        document.getElementById('submit_modal_title').textContent = '組立完了通知 — 申請';
        document.getElementById('submit_approver_group').style.display = 'none';

        const p = projectsMap[draft.project_number] || {};
        const infoLabel = [p.customer_name, p.project_details].filter(Boolean).join('　');
        document.getElementById('submit_project_display').textContent =
            draft.project_number + (infoLabel ? `　${infoLabel}` : '');
        document.getElementById('submit_project_detail').innerHTML =
            `<span style="color:#888;font-size:11px;">客先</span> ${esc(p.customer_name || '—')}　<span style="color:#888;font-size:11px;">工事名</span> ${esc(p.project_details || '—')}`;
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

        if (draft.sheet_data) {
            sheetChecks  = draft.sheet_data.check_items  || {};
            pendingItems = draft.sheet_data.pending_items || [];
            if (indicator) indicator.style.display = '';
            if (btnGoSheet) btnGoSheet.style.display = 'none';
            if (btnSubmit)  btnSubmit.style.display  = '';
        } else {
            sheetChecks  = {};
            pendingItems = [];
            if (indicator) indicator.style.display = 'none';
            if (btnGoSheet) { btnGoSheet.style.display = ''; btnGoSheet.textContent = '次へ（自主点検シートを入力する）→'; }
            if (btnSubmit)  btnSubmit.style.display  = 'none';
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
}"""

if old2 in content:
    content = content.replace(old2, new2, 1); results.append('P2 OK')
else:
    results.append('P2 NOT FOUND')

# ── Patch 3a: submitRequest() の INSERT を draft 対応に変更 ──
old3 = """            const sheetData = currentFlowType === 'assembly' ? collectSheetData() : null;

            const { data: req, error: e1 } = await db.from('approval_requests').insert({
                project_number: projectNum,
                machine_name:   machineNum,
                flow_type:      currentFlowType,
                status:         'submitted',
                requester_id:   currentUser.id,
                note:           note || null,
                test_run:       mNames.includes('試運転'),
                has_inspection: mNames.includes('外観検査'),
                sheet_data:     sheetData
            }).select().single();
            if (e1) throw e1;"""

new3 = """            let req, e1;
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
            if (e1) throw e1;"""

if old3 in content:
    content = content.replace(old3, new3, 1); results.append('P3a OK')
else:
    results.append('P3a NOT FOUND')

# ── Patch 3b: closeSubmitModal() の前に currentDraftId リセット ──
old3b = "        closeSubmitModal();\n        await refreshAll();\n        ui.send('SAVED');"
new3b = "        currentDraftId = null;\n        closeSubmitModal();\n        await refreshAll();\n        ui.send('SAVED');"
if old3b in content:
    content = content.replace(old3b, new3b, 1); results.append('P3b OK')
else:
    results.append('P3b NOT FOUND')

# ── Patch 4a: バッジカウントに draft を追加 ──
old4a = "    const badgeCount = reqs.filter(r => ['submitted', 'in_review', 'rejected'].includes(r.status)).length;"
new4a = "    const badgeCount = reqs.filter(r => ['submitted', 'in_review', 'rejected', 'draft'].includes(r.status)).length;"
if old4a in content:
    content = content.replace(old4a, new4a, 1); results.append('P4a OK')
else:
    results.append('P4a NOT FOUND')

# ── Patch 4b: draft のステータス表示を追加 ──
old4b = """        let statusText;
        if (req.status === 'submitted' || req.status === 'in_review') {
            statusText = '<span class="si-badge si-orange">▶</span> 承認待ち';
        } else if (req.status === 'approved') {
            statusText = isNotifFlow ? '<span class="si-badge si-green">✓</span> 案内済み' : '<span class="si-badge si-green">✓</span> 完了';
        } else if (req.status === 'rejected') {
            statusText = '<span class="si-badge si-red">✕</span> 却下';
        } else {
            statusText = req.status;
        }"""
new4b = """        let statusText;
        if (req.status === 'draft') {
            statusText = '<span class="si-badge si-gray">✏</span> 入力中';
        } else if (req.status === 'submitted' || req.status === 'in_review') {
            statusText = '<span class="si-badge si-orange">▶</span> 承認待ち';
        } else if (req.status === 'approved') {
            statusText = isNotifFlow ? '<span class="si-badge si-green">✓</span> 案内済み' : '<span class="si-badge si-green">✓</span> 完了';
        } else if (req.status === 'rejected') {
            statusText = '<span class="si-badge si-red">✕</span> 却下';
        } else {
            statusText = req.status;
        }"""
if old4b in content:
    content = content.replace(old4b, new4b, 1); results.append('P4b OK')
else:
    results.append('P4b NOT FOUND')

# ── Patch 4c: draft カードのonclickを openDraftInSubmitModal に変更 ──
old4c = """        const cardClass = (req.status === 'submitted' || req.status === 'in_review') ? 'is-waiting'
                        : req.status === 'rejected' ? 'is-rejected'
                        : '';
        return `
        <div class="side-card ${cardClass}" onclick="openDetailModal('${req.id}')">"""
new4c = """        const cardClass = (req.status === 'submitted' || req.status === 'in_review') ? 'is-waiting'
                        : req.status === 'rejected' ? 'is-rejected'
                        : req.status === 'draft' ? 'is-draft'
                        : '';
        const cardClick = req.status === 'draft'
            ? `openDraftInSubmitModal('${req.id}')`
            : `openDetailModal('${req.id}')`;
        return `
        <div class="side-card ${cardClass}" onclick="${cardClick}">"""
if old4c in content:
    content = content.replace(old4c, new4c, 1); results.append('P4c OK')
else:
    results.append('P4c NOT FOUND')

# ── Patch 5: bootApp() に setupSheetChannel() 呼び出しを追加 ──
old5 = "    applyRoleLayout(profile.role);\n    ui.send('READY');\n}"
new5 = "    applyRoleLayout(profile.role);\n    setupSheetChannel();\n    ui.send('READY');\n}"
if old5 in content:
    content = content.replace(old5, new5, 1); results.append('P5 OK')
else:
    results.append('P5 NOT FOUND')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('\n'.join(results))
print('Done')
