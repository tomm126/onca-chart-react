/**
 * 制作開始日マイグレーション（Admin SDK版）
 *
 * charts/main の projects 配列の start フィールドが
 * "YYYY-MM-DD HH:MM:SS" 形式の場合に "YYYY/M" 形式へ変換します。
 *
 * 実行方法:
 *   export FIREBASE_SERVICE_ACCOUNT='<サービスアカウントJSONの内容>'
 *   npm run migrate:start-dates
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

const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2}) \d{2}:\d{2}:\d{2}$/;

function convertStart(start: unknown): unknown {
  if (typeof start !== 'string' || !start) return start;
  const m = start.match(DATETIME_RE);
  if (!m) return start;
  return `${parseInt(m[1], 10)}/${parseInt(m[2], 10)}`;
}

async function main(): Promise<void> {
  console.log('charts/main を取得中...');
  const ref = db.collection('charts').doc('main');
  const snap = await ref.get();

  if (!snap.exists) {
    console.error('エラー: charts/main ドキュメントが存在しません');
    process.exit(1);
  }

  const data = snap.data()!;
  const projects: Record<string, unknown>[] = data.projects ?? [];

  let changedCount = 0;

  const updated = projects.map(proj => {
    const converted = convertStart(proj.start);
    if (converted !== proj.start) {
      console.log(`変換: [${proj.id}] "${proj.name}"  "${proj.start}" → "${converted}"`);
      changedCount++;
      return { ...proj, start: converted };
    }
    return proj;
  });

  if (changedCount === 0) {
    console.log('変換対象のデータはありませんでした。');
    return;
  }

  await ref.update({ projects: updated });
  console.log(`\n✅ ${changedCount} 件の start フィールドを変換しました。`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
