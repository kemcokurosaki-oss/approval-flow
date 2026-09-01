// 組立申請ユニット単位標準リスト（組立申請ユニット単位標準リスト.csv 由来）
// 機械コード → 選択可能なユニット候補。'-' のみの機械はユニット選択不要。
// リストを更新する場合はCSVとこのファイルの両方を直すこと。
const ASSEMBLY_UNIT_MASTER = {
    CC: ['-'],
    UC: ['-'],
    LM: ['-'],
    SW: ['-'],
    RV: ['-'],
    FL: ['-'],
    LE: ['-'],
    TC: ['-'],
    RC: ['-'],
    LC: ['-'],
    MC: ['-'],
    RT: ['-'],
    DF: ['-'],
    BM: ['-'],
    PC: ['-', 'DS'],
    TR: ['RV', 'CV', 'AL', 'WK', 'AI'],
    FS: ['EG', 'RS', 'SR', 'TW', 'TH', 'MR', 'UJ', 'DR'],
    WA: ['SQ', 'SG', 'IR', 'BC', 'BW', 'BH', 'CI', 'IC', 'IP', 'HF'],
};

const ASSEMBLY_MACHINE_CODES = Object.keys(ASSEMBLY_UNIT_MASTER);

// 工番が2000番台（組立・試運転フローのみ対象＝標準リストを使う工事）かどうかを判定する。
// app.js の is2000sSeries() と同じ判定ロジック（sheet.htmlはapp.jsを読み込まない独立ファイルのため複製）。
function isAssembly2000sSeries(projectNum) {
    const s = (projectNum || '').toString().trim();
    return /^2\d{3}$/.test(s);
}

// assemblyItems配列 [{machine, unit}] から、machine_nameカラム用の要約文字列を組み立てる。
// 例: [{machine:'CC',unit:null},{machine:'PC',unit:'DS'}] → "CC / PCDS"
function buildAssemblyMachineNameSummary(assemblyItems) {
    if (!Array.isArray(assemblyItems) || assemblyItems.length === 0) return '';
    return assemblyItems
        .filter(it => it && it.machine)
        .map(it => (it.unit && it.unit !== '-') ? `${it.machine}${it.unit}` : it.machine)
        .join(' / ');
}
