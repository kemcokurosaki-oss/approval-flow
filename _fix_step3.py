with open('app.js', 'rb') as f:
    content = f.read()

def replace_once(content, old, new, label):
    old_b = old.replace('\n', '\r\n').encode('utf-8')
    new_b = new.replace('\n', '\r\n').encode('utf-8')
    count = content.count(old_b)
    if count != 1:
        raise Exception(f'{label}: expected 1 occurrence, found {count}')
    return content.replace(old_b, new_b)

def cut_between(content, start_marker, end_marker, label, keep_end=True):
    start_b = start_marker.encode('utf-8')
    end_b = end_marker.encode('utf-8')
    si = content.index(start_b)
    ei = content.index(end_b)
    if si >= ei:
        raise Exception(f'{label}: start after end')
    if keep_end:
        return content[:si] + content[ei:]
    else:
        return content[:si] + content[ei+len(end_b):]

# 1. SETTINGS_CATEGORIESの「フロー設定」カテゴリ削除
content = replace_once(content,
'''const SETTINGS_CATEGORIES = [
    {
        icon: '🔀', label: 'フロー設定',
        items: [
            { label: 'フローのON/OFF', desc: '工事番号・機械ごとに、不要なフローを飛ばす', fn: 'showFlowToggleScreen' }
        ]
    },
    {
        icon: '📧', label: '通知・宛先設定',''',
'''const SETTINGS_CATEGORIES = [
    {
        icon: '📧', label: '通知・宛先設定',''',
    'categories'
)

# 2. settingsView コメント修正
content = replace_once(content,
    "let settingsView            = 'menu'; // 'menu' | 'flow_toggle' | 'recipients_list' | 'recipients_detail' | ...",
    "let settingsView            = 'menu'; // 'menu' | 'recipients_list' | 'recipients_detail' | ...",
    'settingsView comment'
)

# 3. state変数 ~ isFlowApplicableForToggle ブロック削除
content = cut_between(content, 'let settingsToggleProject', 'function toggleUserMenu()', 'state vars block')

# 4. フローON/OFF画面ブロック全体削除
content = cut_between(content,
    '// ----- フローのON/OFF（工事番号・機械ごと） -----',
    '// ----- 固定宛先の設定（個人単位） -----',
    'flow toggle screen block'
)

# 5. _getMiddleFlowChain / _getMachineFlowChain のフィルタ削除
content = replace_once(content,
'''    // 設定（工事番号・機械単位）でOFFにされたフローは、出荷準備等の前提チェックの対象から除外する
    return Object.keys(best).filter(ft => isFlowEnabledFor(ft, projectNum, machine)).sort((a, b) => best[a] - best[b]);
}

// 組立(先頭)〜出荷(末尾)を含む、その機械のフロー全体の並び（工程表の実タスクに基づく動的判定）
// 設定（工事番号・機械単位）でOFFにされたフローは組立・出荷確定も含めて除外する
async function _getMachineFlowChain(projectNum, machine) {
    const middle = await _getMiddleFlowChain(projectNum, machine);
    return ['assembly', ...middle, 'shipping'].filter(ft => isFlowEnabledFor(ft, projectNum, machine));
}''',
'''    return Object.keys(best).sort((a, b) => best[a] - best[b]);
}

// 組立(先頭)〜出荷(末尾)を含む、その機械のフロー全体の並び（工程表の実タスクに基づく動的判定）
async function _getMachineFlowChain(projectNum, machine) {
    const middle = await _getMiddleFlowChain(projectNum, machine);
    return ['assembly', ...middle, 'shipping'];
}''',
    'flow chain filters'
)

with open('app.js', 'wb') as f:
    f.write(content)
print('step3 done, new_len', len(content))
