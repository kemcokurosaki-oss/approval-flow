with open('app.js', 'rb') as f:
    content = f.read()

def replace_once(content, old, new, label):
    old_b = old.replace('\n', '\r\n').encode('utf-8')
    new_b = new.replace('\n', '\r\n').encode('utf-8')
    count = content.count(old_b)
    if count != 1:
        raise Exception(f'{label}: expected 1 occurrence, found {count}')
    return content.replace(old_b, new_b)

content = replace_once(content,
'''                return false;
            }).map(f => ({
                // 設定（工事番号・機械単位）でOFFにされたフローは、完全に消すのではなく「スキップ」として残す
                // （既存の申請済みデータがあれば、OFFでも通常表示のまま継続する）
                ...f, skipped: !isFlowEnabledFor(f.type, num, machine) && !mData.flows[f.type]
            }));

            const nodes = applicable.map((f, i) => {
                const req = mData.flows[f.type];
                let fcClass, icon, clickAttr = '', clickable = '';

                if (f.skipped) {
                    fcClass = 'fc-skipped'; icon = '－';
                } else if (!req) {''',
'''                return false;
            });

            const nodes = applicable.map((f, i) => {
                const req = mData.flows[f.type];
                let fcClass, icon, clickAttr = '', clickable = '';

                if (!req) {''',
    'skip1'
)

content = replace_once(content,
'''                const canApply = canApplyFlow(f.type);

                if (f.skipped) {
                    // OFF中は申請・詳細表示ともにクリック不可
                } else if (!req && canApply && !progressFilterCompleted) {''',
'''                const canApply = canApplyFlow(f.type);

                if (!req && canApply && !progressFilterCompleted) {''',
    'skip2'
)

content = replace_once(content,
'''                let flowDateStr = '';
                if (f.skipped) {
                    flowDateStr = 'スキップ';
                } else if (req && req.status !== 'draft') {''',
'''                let flowDateStr = '';
                if (req && req.status !== 'draft') {''',
    'skip3'
)

content = replace_once(content,
'''                // 未申請・未承認バッジ（フィルタと連動）。OFF中はスキップ表示のみで、未申請扱いのバッジは出さない
                let overdueBadge = '';
                if (!f.skipped) {
                    const isMainOverdueFlow   = !!OVERDUE_FLOW_TASK_TEXT[f.type] && isFlowOverdue(num, machine, f.type, req);
                    const isInviteOverdueFlow = QA_MEETING_FLOWS.includes(f.type) && isInviteFlowOverdue(num, machine, f.type, req);
                    if (isMainOverdueFlow || isInviteOverdueFlow) {
                        const isUnapproved = isMainOverdueFlow && req && req.status !== 'draft';
                        overdueBadge = `<div class="flow-overdue-badge">⚠ ${isUnapproved ? '未承認' : '未申請'}</div>`;
                    }
                }''',
'''                // 未申請・未承認バッジ（フィルタと連動）
                let overdueBadge = '';
                const isMainOverdueFlow   = !!OVERDUE_FLOW_TASK_TEXT[f.type] && isFlowOverdue(num, machine, f.type, req);
                const isInviteOverdueFlow = QA_MEETING_FLOWS.includes(f.type) && isInviteFlowOverdue(num, machine, f.type, req);
                if (isMainOverdueFlow || isInviteOverdueFlow) {
                    const isUnapproved = isMainOverdueFlow && req && req.status !== 'draft';
                    overdueBadge = `<div class="flow-overdue-badge">⚠ ${isUnapproved ? '未承認' : '未申請'}</div>`;
                }''',
    'skip4'
)

content = replace_once(content,
    'return `<div class="flow-node${clickable}${f.skipped ? \' flow-node-skipped\' : \'\'}" ${clickAttr}',
    'return `<div class="flow-node${clickable}" ${clickAttr}',
    'skip5'
)

with open('app.js', 'wb') as f:
    f.write(content)
print('skipped block removal done, new_len', len(content))
