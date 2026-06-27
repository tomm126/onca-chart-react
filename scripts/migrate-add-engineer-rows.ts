/**
 * 全案件にエンジニア行（m15）を追加するマイグレーション（Admin SDK版）
 *
 * 実行方法:
 *   export FIREBASE_SERVICE_ACCOUNT='<サービスアカウントJSONの内容>'
 *   npm run migrate:engineer-rows
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

const ENGINEER_MEMBER_ID = 'm15';

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeUniqueId(prefix: string, existingIds: Set<string>): string {
  let id = uid(prefix);
  while (existingIds.has(id)) {
    id = uid(prefix);
  }
  return id;
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

  let addedCount = 0;
  let skippedCount = 0;

  const updatedProjects = projects.map(proj => {
    const rows: Record<string, unknown>[] = (proj.rows as Record<string, unknown>[]) ?? [];

    const alreadyHasEngineer = rows.some(r => r.memberId === ENGINEER_MEMBER_ID);
    if (alreadyHasEngineer) {
      skippedCount++;
      return proj;
    }

    const existingIds = new Set(rows.map(r => r.id as string));
    const newId = makeUniqueId('r', existingIds);
    const newRow = {
      id: newId,
      memberId: ENGINEER_MEMBER_ID,
      order: rows.length,
      cells: {},
    };

    addedCount++;
    console.log(`追加: [${proj.id}] "${proj.name}"`);
    return { ...proj, rows: [...rows, newRow] };
  });

  if (addedCount === 0) {
    console.log('追加対象のデータはありませんでした。');
    return;
  }

  await ref.update({ projects: updatedProjects });
  console.log(`\n✅ ${addedCount} 件にエンジニア行を追加, ${skippedCount} 件スキップしました。`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
