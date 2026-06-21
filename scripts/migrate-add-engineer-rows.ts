/**
 * 移行スクリプト: 全案件にエンジニア行（m15）を追加する
 *
 * 【実行前の確認事項】
 * - Firestore の 'charts/main' ドキュメントをバックアップしてから実行してください
 * - 既に m15 行がある案件はスキップされます
 *
 * 【実行方法】
 * ブラウザのコンソールに以下を貼り付けて実行:
 *   1. アプリを開いた状態でDevToolsのConsoleを開く
 *   2. 下記のスクリプトをそのまま貼り付けて実行
 *
 * または ts-node で実行:
 *   npx ts-node --esm scripts/migrate-add-engineer-rows.ts
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase';
import type { AppState, Row } from '../src/types';

const ENGINEER_MEMBER_ID = 'm15';
const CHART_DOC = doc(db, 'charts', 'main');

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

async function migrateAddEngineerRows(): Promise<void> {
  console.log('[Migration] エンジニア行追加スクリプト開始...');

  const snap = await getDoc(CHART_DOC);
  if (!snap.exists()) {
    console.error('[Migration] charts/main が存在しません');
    return;
  }

  const { _sid: _, ...data } = snap.data();
  const state = data as AppState;

  let addedCount = 0;
  let skippedCount = 0;

  const updatedProjects = state.projects.map(proj => {
    const alreadyHasEngineer = proj.rows.some(r => r.memberId === ENGINEER_MEMBER_ID);
    if (alreadyHasEngineer) {
      skippedCount++;
      return proj;
    }

    const maxOrder = proj.rows.reduce((max, r) => Math.max(max, r.order), -1);
    const newRow: Row = {
      id: uid('r'),
      memberId: ENGINEER_MEMBER_ID,
      order: maxOrder + 1,
      cells: {},
    };

    addedCount++;
    console.log(`[Migration] ${proj.name} にエンジニア行を追加`);
    return { ...proj, rows: [...proj.rows, newRow] };
  });

  const updatedState = {
    ...state,
    projects: updatedProjects,
    meta: { ...state.meta, updatedAt: new Date().toISOString() },
  };

  await setDoc(CHART_DOC, { ...updatedState, _sid: '' });

  console.log(`[Migration] 完了: ${addedCount} 件追加, ${skippedCount} 件スキップ`);
}

migrateAddEngineerRows().catch(console.error);
