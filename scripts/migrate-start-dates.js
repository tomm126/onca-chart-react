/**
 * 制作開始日マイグレーションスクリプト
 *
 * Firestore の charts/main ドキュメントの projects 配列内
 * start フィールドが「YYYY-MM-DD HH:MM:SS」形式の場合に
 * 「YYYY/M」形式（例: 2025/3）へ変換します。
 *
 * 変換対象:  "2025-03-01 00:00:00" → "2025/3"
 * 変換しない: 空文字・null、自由記述（"2026/6公開予定" など）
 *
 * 実行方法:
 *   1. ブラウザでアプリを開く（Firebase が初期化された状態）
 *   2. 開発者ツール > コンソールに以下のコードを貼り付けて実行
 */

(async () => {
  const { getApps } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js');
  const { getFirestore, doc, getDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js');

  const apps = getApps();
  if (!apps.length) {
    console.error('Firebase が初期化されていません。アプリを開いた状態で実行してください。');
    return;
  }
  const db = getFirestore(apps[0]);

  // "YYYY-MM-DD HH:MM:SS" 形式のみ変換対象とする
  const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2}) \d{2}:\d{2}:\d{2}$/;

  function convertStart(start) {
    if (!start) return start;
    const m = start.match(DATETIME_RE);
    if (!m) return start; // 自由記述・既に変換済みはそのまま
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10); // leading zero を除去
    return `${year}/${month}`;
  }

  const ref = doc(db, 'charts', 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.error('charts/main ドキュメントが存在しません');
    return;
  }

  const data = snap.data();
  const projects = data.projects || [];

  let changedCount = 0;
  const updated = projects.map(proj => {
    const converted = convertStart(proj.start);
    if (converted !== proj.start) {
      console.log(`変換: [${proj.id}] "${proj.name}" start: "${proj.start}" → "${converted}"`);
      changedCount++;
      return { ...proj, start: converted };
    }
    return proj;
  });

  if (changedCount === 0) {
    console.log('変換対象のデータはありませんでした。');
    return;
  }

  await updateDoc(ref, { projects: updated });
  console.log(`✅ ${changedCount} 件の start フィールドを変換しました。`);
})();
