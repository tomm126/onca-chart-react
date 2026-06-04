/**
 * Firestoreインポートスクリプト
 *
 * 使い方:
 *   node scripts/import-to-firestore.mjs <serviceAccountKeyPath> [jsonFilePath]
 *
 * 例:
 *   node scripts/import-to-firestore.mjs ./serviceAccountKey.json
 *   node scripts/import-to-firestore.mjs ./serviceAccountKey.json ./onca-chart-import.json
 *
 * serviceAccountKey.json の取得方法:
 *   Firebase Console → プロジェクトの設定 → サービスアカウント
 *   → 「新しい秘密鍵の生成」→ JSONファイルをダウンロード
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 引数チェック
const [,, serviceAccountPath, jsonPath] = process.argv;

if (!serviceAccountPath) {
  console.error('使い方: node scripts/import-to-firestore.mjs <serviceAccountKeyPath> [jsonFilePath]');
  console.error('例:     node scripts/import-to-firestore.mjs ./serviceAccountKey.json');
  process.exit(1);
}

// ファイルパスの解決
const keyPath = resolve(process.cwd(), serviceAccountPath);
const dataPath = resolve(process.cwd(), jsonPath ?? 'onca-chart-import.json');

// サービスアカウントキーの読み込み
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
} catch {
  console.error(`サービスアカウントキーが読み込めません: ${keyPath}`);
  process.exit(1);
}

// インポートデータの読み込み
let importData;
try {
  importData = JSON.parse(readFileSync(dataPath, 'utf-8'));
} catch {
  console.error(`インポートファイルが読み込めません: ${dataPath}`);
  process.exit(1);
}

// Firebase Admin SDK 初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function run() {
  const docRef = db.collection('charts').doc('main');

  // 既存データの確認
  const existing = await docRef.get();
  if (existing.exists) {
    console.log('⚠️  charts/main にすでにデータが存在します。上書きします。');
  }

  // データ検証
  const required = ['version', 'members', 'projects', 'view'];
  const missing = required.filter(k => !(k in importData));
  if (missing.length > 0) {
    console.error(`JSONに必須フィールドがありません: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`📦 インポート対象:`);
  console.log(`   - メンバー: ${importData.members.length}人`);
  console.log(`   - 案件: ${importData.projects.length}件`);
  console.log(`   - 書き込み先: charts/main`);
  console.log('');
  console.log('🔄 書き込み中...');

  await docRef.set({
    ...importData,
    _sid: '',  // FirestoreSync との互換性のため
  });

  console.log('✅ インポート完了しました。');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ エラーが発生しました:', err.message);
  process.exit(1);
});
