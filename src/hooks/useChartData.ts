import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { makeInitialState } from '../context/AppContext';
import type { AppState } from '../types';

const CHART_DOC = () => doc(db, 'charts', 'main');

export function useChartData(user: User | null): { initialState: AppState | null; loading: boolean } {
  const [initialState, setInitialState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // user が変わるたびに loading をリセット
    setLoading(true);
    setInitialState(null);

    getDoc(CHART_DOC())
      .then(async (snap) => {
        if (snap.exists()) {
          const { _sid: _, ...data } = snap.data();
          setInitialState(data as AppState);
        } else {
          const state = makeInitialState();
          await setDoc(CHART_DOC(), { ...state, _sid: '' });
          setInitialState(state);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[Firestore] データ読み込みエラー:', err);
        setInitialState(makeInitialState());
        setLoading(false);
      });
  }, [user]);

  return { initialState, loading };
}
