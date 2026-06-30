import sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old1 = "    // チェックシートリセット（組立フローのみ）\n    if (flowType === 'assembly') {\n        sheetChecks = {};\n        pendingItems = [];\n        document.querySelectorAll('#submit_step2 .sheet-btn').forEach(b => b.classList.remove('active'));\n        document.querySelectorAll('#submit_step2 .sheet-note').forEach(n => { n.value = ''; });\n        renderPendingItems();\n    }\n\n    // Step 1を表示、Step 2を非表示\n    document.getElementById('submit_step1').style.display = '';\n    document.getElementById('submit_step2').style.display = 'none';\n\n    // 試運転はStep 2なし → フッターボタンを「申請する」に\n    const step1NextBtn = document.querySelector('#submit_step1 .modal-footer .btn-primary');\n    if (step1NextBtn) {\n        if (flowType === 'assembly') {\n            step1NextBtn.textContent = '次へ（自主点検シート）→';\n        } else {\n            step1NextBtn.textContent = '申請する';\n        }\n    }"

new1 = "    // チェックシートリセット\n    sheetChecks = {};\n    pendingItems = [];\n    if (flowType === 'assembly') {\n        document.querySelectorAll('#sheet_modal .sheet-btn').forEach(b => b.classList.remove('active'));\n        document.querySelectorAll('#sheet_modal .sheet-note').forEach(n => { n.value = ''; });\n        renderPendingItems();\n        const indicator = document.getElementById('sheet_entry_indicator');\n        if (indicator) indicator.style.display = 'none';\n    }\n\n    // フッターボタン切り替え（組立: 次へ→、試運転: 申請する）\n    const btnGoSheet = document.getElementById('btn_go_sheet');\n    const btnSubmit  = document.getElementById('submit_btn');\n    if (flowType === 'assembly') {\n        if (btnGoSheet) btnGoSheet.style.display = '';\n        if (btnSubmit)  btnSubmit.style.display  = 'none';\n    } else {\n        if (btnGoSheet) btnGoSheet.style.display = 'none';\n        if (btnSubmit)  btnSubmit.style.display  = '';\n    }"

old2 = "    // 試運転は後でシート追加予定（現時点では直接申請）\n    if (currentFlowType !== 'assembly') { submitRequest(); return; }\n    document.getElementById('submit_step1').style.display = 'none';\n    document.getElementById('submit_step2').style.display = '';\n}\n\nfunction backToFormStep() {\n    document.getElementById('submit_step2').style.display = 'none';\n    document.getElementById('submit_step1').style.display = '';\n}"

new2 = "    if (currentFlowType !== 'assembly') { submitRequest(); return; }\n    // sheet_modal を全画面モーダルとして開く\n    document.getElementById('submit_modal').classList.remove('open');\n    document.getElementById('sheet_modal').classList.add('open');\n}\n\nfunction backFromSheetModal() {\n    document.getElementById('sheet_modal').classList.remove('open');\n    document.getElementById('submit_modal').classList.add('open');\n}\n\nfunction finishSheetEntry() {\n    // 入力済みバッジを更新\n    const checkedCount = Object.values(sheetChecks).filter(v => v).length;\n    const indicator = document.getElementById('sheet_entry_indicator');\n    if (indicator) indicator.style.display = checkedCount > 0 ? '' : 'none';\n    // sheet_modal を閉じて申請画面へ戻り、申請ボタンを表示\n    document.getElementById('sheet_modal').classList.remove('open');\n    document.getElementById('submit_modal').classList.add('open');\n    const btnGoSheet = document.getElementById('btn_go_sheet');\n    const btnSubmit  = document.getElementById('submit_btn');\n    if (btnGoSheet) btnGoSheet.style.display = 'none';\n    if (btnSubmit)  btnSubmit.style.display  = '';\n}\n\nfunction reopenSheetModal() {\n    document.getElementById('submit_modal').classList.remove('open');\n    document.getElementById('sheet_modal').classList.add('open');\n}"

if old1 in content:
    content = content.replace(old1, new1, 1)
    print('R1: OK')
else:
    print('R1: NOT FOUND')

if old2 in content:
    content = content.replace(old2, new2, 1)
    print('R2: OK')
else:
    print('R2: NOT FOUND')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
