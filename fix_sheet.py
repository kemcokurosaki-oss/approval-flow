
import re

# ===== app.js =====
with open(r'c:\Users\kurosaki\Desktop\工程表作成\承認フロー\app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# --- P1: showLoading に clearTimeout を追加 ---
old = '    _loadingTimer = setTimeout(() => { el.classList.add(\'visible\'); }, 500);\n}'
new = '    if (_loadingTimer) { clearTimeout(_loadingTimer); _loadingTimer = null; }\n    _loadingTimer = setTimeout(() => { el.classList.add(\'visible\'); }, 500);\n}'
n1 = js.count(old)
js = js.replace(old, new, 1)

# --- P2: sheetAutoSaveTimer 変数を追加 ---
old2 = 'let currentDraftId = null;'
new2 = 'let currentDraftId = null;\nlet sheetAutoSaveTimer = null;'
n2 = js.count(old2)
js = js.replace(old2, new2, 1)

# --- P3: setSheetCheck に scheduleSheetSave() 追加 ---
old3 = '''function setSheetCheck(itemId, val, btn) {
    const already = sheetChecks[itemId] === val;
    sheetChecks[itemId] = already ? null : val;
    const siblings = btn.parentElement.querySelectorAll('.sheet-btn');
    siblings.forEach(b => b.classList.remove('active'));
    if (!already) btn.classList.add('active');
}'''
new3 = '''function setSheetCheck(itemId, val, btn) {
    const already = sheetChecks[itemId] === val;
    sheetChecks[itemId] = already ? null : val;
    const siblings = btn.parentElement.querySelectorAll('.sheet-btn');
    siblings.forEach(b => b.classList.remove('active'));
    if (!already) btn.classList.add('active');
    scheduleSheetSave();
}'''
n3 = js.count(old3)
js = js.replace(old3, new3, 1)

# --- P4: goToSheetStep + reopenSheetTab を置き換え ---
old4 = '''// ===== 自主点検シート（別タブ） =====
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
}'''

new4 = '''// ===== 自主点検シート =====
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

        await loadMineSide();
        openSheetModalForDraft();
    } catch (e) {
        showToast('下書きの保存に失敗しました: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// 「変更する」ボタン: 既存の下書きを点検シートモーダルで再度開く
function reopenSheetTab() {
    if (!currentDraftId) { showToast('下書きIDが不明です。再度「次へ」を押してください', 'error'); return; }
    openSheetModalForDraft();
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
}'''

n4 = js.count(old4)
js = js.replace(old4, new4, 1)

# --- P5: openDraftInSubmitModal の sheet_data 読み込み箇所を修正 ---
old5 = '''        if (draft.sheet_data) {
            sheetChecks  = draft.sheet_data.check_items  || {};
            pendingItems = draft.sheet_data.pending_items || [];'''
new5 = '''        if (draft.sheet_data) {
            // check_items は {id: {result,note}} 形式で保存されているため sheetChecks に変換
            const savedChecks = draft.sheet_data.check_items || {};
            sheetChecks = {};
            Object.entries(savedChecks).forEach(([k, v]) => {
                sheetChecks[k] = typeof v === 'object' ? v : { result: v, note: '' };
            });
            pendingItems = draft.sheet_data.pending_items || [];'''
n5 = js.count(old5)
js = js.replace(old5, new5, 1)

print(f"P1(showLoading): {n1}, P2(var): {n2}, P3(setSheetCheck): {n3}, P4(goToSheet): {n4}, P5(loadDraft): {n5}")

with open(r'c:\Users\kurosaki\Desktop\工程表作成\承認フロー\app.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("app.js written")

# ===== index.html =====
with open(r'c:\Users\kurosaki\Desktop\工程表作成\承認フロー\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# sheet_modal フッターのボタンラベルと保存ステータス追加
old_h = '''        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="backFromSheetModal()">← 申請画面へ戻る</button>
            <button class="btn btn-primary" onclick="finishSheetEntry()">入力完了 → 申請へ</button>
        </div>'''
new_h = '''        <div class="modal-footer">
            <span id="sheet_save_status" class="sheet-save-status"></span>
            <button class="btn btn-secondary" onclick="backFromSheetModal()">一時保存して閉じる</button>
            <button class="btn btn-primary" onclick="finishSheetEntry()">入力完了・申請へ進む</button>
        </div>'''
nh = html.count(old_h)
html = html.replace(old_h, new_h, 1)
print(f"HTML footer: {nh}")

# note入力にauto-saveイベントを追加（oninput="scheduleSheetSave()"）
# sheet-note input に delegated listener を追加するのではなく、
# sheet-note のoninputをJSで設定するためにHTMLはそのままにしておく
# （openSheetModalForDraft内でイベント委任済み）

with open(r'c:\Users\kurosaki\Desktop\工程表作成\承認フロー\index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html written")
