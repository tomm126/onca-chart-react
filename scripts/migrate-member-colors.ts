/**
 * メンバーカラー移行スクリプト（Admin SDK版）
 *
 * charts/main の members 配列の color フィールドを
 * プロトタイプ (gantt-v18_25.html) と同じカラーに更新します。
 *
 * 実行方法:
 *   export FIREBASE_SERVICE_ACCOUNT='<サービスアカウントJSONの内容>'
 *   npm run migrate:member-colors
 *
 * サービスアカウントキーの取得:
 *   Firebase Console → プロジェクトの設定 → サービスアカウント
 *   → 「新しい秘密鍵の生成」→ JSONファイルをダウンロード
 *   → cat serviceAccountKey.json | jq -c . で1行JSONに変換して環境変数にセット
 */

import admin from 'firebase-admin';

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('エラー: FIREBASE_SERVICE_ACCOUNT 環境変数が設定されていません');
  process.exit(1);
}

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
} catch {
  console.error('エラー: FIREBASE_SERVICE_ACCOUNT のJSONパースに失敗しました');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COLOR_MAP: Record<string, string> = {
  'm1':  '#2e8b2e',  // 幸松
  'm2':  '#7c3dbf',  // 伊藤
  'm3':  '#c87000',  // 高橋
  'm4':  '#0d9e87',  // 城山
  'm5':  '#c4488a',  // 濱井
  'm6':  '#3a6bbf',  // 菅原
  'm7':  '#bf2020',  // 水野
  'm8':  '#1a5fbf',  // 小川
  'm9':  '#a08800',  // 武田
  'm10': '#707070',  // 小金丸
  'm13': '#606060',  // ディレクター
  'm14': '#606060',  // デザイナー
  'm15': '#606060',  // エンジニア
};

async function main(): Promise<void> {
  console.log('charts/main を取得中...');
  const ref = db.collection('charts').doc('main');
  const snap = await ref.get();

  if (!snap.exists) {
    console.error('エラー: charts/main ドキュメントが存在しません');
    process.exit(1);
  }

  const data = snap.data()!;
  const members: Record<string, unknown>[] = data.members ?? [];

  let changedCount = 0;

  const updated = members.map(m => {
    const newColor = COLOR_MAP[m.id as string];
    if (newColor && newColor !== m.color) {
      console.log(`変換: [${m.id}] "${m.name}"  "${m.color}" → "${newColor}"`);
      changedCount++;
      return { ...m, color: newColor };
    }
    return m;
  });

  if (changedCount === 0) {
    console.log('変換対象のデータはありませんでした。');
    return;
  }

  await ref.update({ members: updated });
  console.log(`\n✅ ${changedCount} 件の color フィールドを更新しました。`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
