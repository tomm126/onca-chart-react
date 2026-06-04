import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppContext } from '../context/AppContext';
import type { AppState } from '../types';

// ブラウザセッションごとに一意なID（自分自身の書き込みをスキップするため）
const SESSION_ID = Math.random().toString(36).slice(2);
const CHART_DOC = () => doc(db, 'charts', 'main');

export function FirestoreSync() {
  const { state, dispatch } = useAppContext();
  const isRemoteRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // リアルタイムリスナー
  useEffect(() => {
    const unsubscribe = onSnapshot(
      CHART_DOC(),
      { includeMetadataChanges: true },
      (snap) => {
        // 自分の書き込みの楽観的更新（未確定）はスキップ
        if (snap.metadata.hasPendingWrites) return;
        if (!snap.exists()) return;

        const raw = snap.data();
        // 自分のセッションで書き込んだ確定データもスキップ
        if (raw._sid === SESSION_ID) return;

        const { _sid: _, ...data } = raw;
        isRemoteRef.current = true;
        dispatch({ type: 'RESTORE_SNAPSHOT', snapshot: data as AppState });
      },
    );
    return unsubscribe;
  }, [dispatch]);

  // デバウンス保存（800ms）
  useEffect(() => {
    // リモートからの更新で発火した場合は保存しない（無限ループ防止）
    if (isRemoteRef.current) {
      isRemoteRef.current = false;
      return;
    }

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setDoc(CHART_DOC(), { ...state, _sid: SESSION_ID });
    }, 800);

    return () => clearTimeout(saveTimerRef.current);
  }, [state]);

  return null;
}
