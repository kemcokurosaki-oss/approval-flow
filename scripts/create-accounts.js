// 営業部員・設計部員の新規ログインアカウントを一括作成する（一時使用スクリプト）
// - Supabase Admin API でアカウントの箱だけを作る（email_confirm: true でメール確認不要にする）
// - パスワードはランダムな仮値を設定するのみで、招待メールは送信しない
//   （招待メール送信・パスワード設定は別途手動ツールで行う運用のため）
const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const USERS = [
  { email: 'y-maekawa@kusakabe.com',   name: '前川' },
  { email: 'y-harada@kusakabe.com',    name: '原田' },
  { email: 'm-kusakabe@kusakabe.com',  name: '専務' },
  { email: 's-okamoto@kusakabe.com',   name: '岡本' },
  { email: 'y-ikeda@kusakabe.com',     name: '池田' },
  { email: 'k-tsumura@kusakabe.com',   name: '津村' },
  { email: 't-sen@kusakabe.com',       name: '銭' },
  { email: 'k-chin@kusakabe.com',      name: '陳' },
  { email: 'm-aso@kusakabe.com',       name: '麻生' },
  { email: 'm-komura@kusakabe.com',    name: '古村' },
  { email: 'h-matsumoto@kusakabe.com', name: '松本(英)' },
  { email: 'm-shibata@kusakabe.com',   name: '柴田' },
  { email: 'k-hashimoto@kusakabe.com', name: '橋本' },
  { email: 'r-tateno@kusakabe.com',    name: '立野' },
  { email: 'g-ohnishi@kusakabe.com',   name: '大西(元)' },
  { email: 'y-ohnishi@kusakabe.com',   name: '大西(優)' },
  { email: 's-kimoto@kusakabe.com',    name: '木本' },
  { email: 'i-maeda@kusakabe.com',     name: '前田' },
  { email: 'n-ohshige@kusakabe.com',   name: '大重' },
];

function generateTempPassword() {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '1!';
}

async function main() {
  console.log(`====== アカウント作成（${USERS.length}名） ======`);
  let successCount = 0, skipCount = 0, errorCount = 0;

  for (const u of USERS) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        email:         u.email,
        password:      generateTempPassword(),
        email_confirm: true,
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log(`✓ 作成完了: ${u.name} (${u.email}) id=${body.id}`);
      successCount++;
    } else if (body?.error_code === 'email_exists' || (body?.msg || '').includes('already been registered')) {
      console.log(`- スキップ（既に存在）: ${u.name} (${u.email})`);
      skipCount++;
    } else {
      console.error(`✗ エラー: ${u.name} (${u.email})`, JSON.stringify(body));
      errorCount++;
    }
  }

  console.log(`\n====== 完了 ======`);
  console.log(`作成: ${successCount}件 / スキップ: ${skipCount}件 / エラー: ${errorCount}件`);
}

main().catch(err => {
  console.error('致命的エラー:', err);
  process.exit(1);
});
