/**
 * メンバーカラー移行スクリプト
 *
 * Firestoreの charts/main ドキュメントの members フィールドを
 * プロトタイプ (gantt-v18_25.html) と同じカラーに更新します。
 *
 * 実行方法:
 *   1. ブラウザでアプリを開く（Firebase が初期化された状態）
 *   2. 開発者ツール > コンソールに以下のコードを貼り付けて実行
 */

// ブラウザコンソールに貼り付けて実行するコード:
/*
(async () => {
  const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js');
  const { getFirestore, doc, getDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js');

  // 既存のFirebaseアプリを使う
  const apps = getApps();
  if (!apps.length) { console.error('Firebase が初期化されていません。アプリを開いた状態で実行してください。'); return; }
  const db = getFirestore(apps[0]);

  // プロトタイプ (gantt-v18_25.html) のカラー定義
  const COLOR_MAP = {
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

  const ref = doc(db, 'charts', 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) { console.error('charts/main ドキュメントが存在しません'); return; }

  const data = snap.data();
  const members = (data.members || []).map(m => ({
    ...m,
    color: COLOR_MAP[m.id] ?? m.color,
  }));

  await updateDoc(ref, { members });
  console.log('✅ メンバーカラーを更新しました:', members.map(m => `${m.name}: ${m.color}`).join(', '));
})();
*/

export {};
