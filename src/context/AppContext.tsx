import React, { createContext, useContext, useReducer, useRef, useCallback, useState } from 'react';
import type { AppState, PanelMode, ContextMenuState } from '../types';
import type { Action } from './reducer';
import { reducer, cloneState } from './reducer';
import { dk, addD } from '../utils/date';

const MAX_HISTORY = 50;

function makeInitialState(): AppState {
  const now = new Date().toISOString();
  const yesterday = dk(addD(new Date(), -1));
  return {
    version: '1.0',
    meta: { createdAt: now, updatedAt: now },
    members: [
      { id: 'm1', name: '幸松', color: '#6aaa6a' },
      { id: 'm2', name: '伊藤', color: '#9b6dcc' },
      { id: 'm3', name: '高橋', color: '#e08c1a' },
      { id: 'm4', name: '城山', color: '#2ab5a0' },
      { id: 'm5', name: '濱井', color: '#e07aaa' },
      { id: 'm6', name: '菅原', color: '#7090c8' },
      { id: 'm7', name: '水野', color: '#d95555' },
      { id: 'm8', name: '小川', color: '#4a7fd4' },
      { id: 'm9', name: '武田', color: '#c8b040' },
      { id: 'm10', name: '小金丸', color: '#a0a0a0' },
    ],
    projects: [
      { id: 'p1', name: 'メディカル在宅（追加）', pages: '', start: '', deadline: 'なし', order: 0, status: 'active', pinned: false, rows: [{ id: 'r1', memberId: 'm4', order: 0, cells: {} }, { id: 'r2', memberId: 'm5', order: 1, cells: {} }] },
      { id: 'p2', name: 'ひらばり眼科', pages: '18P', start: '2026/6公開予定', deadline: 'なし', order: 1, status: 'active', pinned: false, rows: [{ id: 'r3', memberId: 'm3', order: 0, cells: {} }, { id: 'r4', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p3', name: '自社基本仕様書（パワポ）', pages: '', start: '', deadline: 'なし', order: 2, status: 'active', pinned: false, rows: [{ id: 'r5', memberId: 'm1', order: 0, cells: {} }, { id: 'r6', memberId: 'm7', order: 1, cells: {} }] },
      { id: 'p4', name: 'オークツリー', pages: '', start: '2024/9', deadline: 'なし', order: 3, status: 'active', pinned: false, rows: [{ id: 'r7', memberId: 'm2', order: 0, cells: {} }, { id: 'r8', memberId: 'm10', order: 1, cells: {} }] },
      { id: 'p5', name: '浅田レディース（勝川）', pages: '', start: '2025/3', deadline: 'なし', order: 4, status: 'active', pinned: false, rows: [{ id: 'r9', memberId: 'm3', order: 0, cells: {} }, { id: 'r10', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p6', name: 'スバル東愛知販売', pages: '12P', start: '2025/2', deadline: 'なし', order: 5, status: 'active', pinned: false, rows: [{ id: 'r11', memberId: 'm2', order: 0, cells: {} }, { id: 'r12', memberId: 'm10', order: 1, cells: {} }] },
      { id: 'p7', name: 'セレンディップ', pages: '', start: '2025/4', deadline: '2026年5末公開', order: 6, status: 'active', pinned: false, rows: [{ id: 'r13', memberId: 'm2', order: 0, cells: {} }, { id: 'r14', memberId: 'm7', order: 1, cells: {} }] },
      { id: 'p8', name: '自社サイト', pages: '32P', start: '', deadline: 'なし', order: 7, status: 'active', pinned: false, rows: [{ id: 'r15', memberId: 'm1', order: 0, cells: {} }, { id: 'r16', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p9', name: '浅田レディース（名古屋）', pages: '16P', start: '2025/6', deadline: 'なし', order: 8, status: 'active', pinned: false, rows: [{ id: 'r17', memberId: 'm3', order: 0, cells: {} }, { id: 'r18', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p10', name: '福島中央どうぶつクリニック', pages: '13P', start: '2025/7', deadline: 'なし', order: 9, status: 'active', pinned: false, rows: [{ id: 'r19', memberId: 'm3', order: 0, cells: {} }, { id: 'r20', memberId: 'm7', order: 1, cells: {} }] },
      { id: 'p11', name: 'PREVENT', pages: '15P', start: '2025/7', deadline: '2026/4中旬', order: 10, status: 'active', pinned: false, rows: [{ id: 'r21', memberId: 'm1', order: 0, cells: {} }, { id: 'r22', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p12', name: '税理士法人エール名北会計', pages: '18P', start: '2025/8', deadline: 'なし', order: 11, status: 'active', pinned: false, rows: [{ id: 'r23', memberId: 'm3', order: 0, cells: {} }, { id: 'r24', memberId: 'm7', order: 1, cells: {} }] },
      { id: 'p13', name: 'リッシュプラス', pages: '11P', start: '2025/8', deadline: 'なし', order: 12, status: 'active', pinned: false, rows: [{ id: 'r25', memberId: 'm2', order: 0, cells: {} }, { id: 'r26', memberId: 'm7', order: 1, cells: {} }] },
      { id: 'p14', name: '山田美術印刷', pages: '', start: '6/11', deadline: '2025/11', order: 13, status: 'active', pinned: false, rows: [{ id: 'r27', memberId: 'm3', order: 0, cells: {} }, { id: 'r28', memberId: 'm7', order: 1, cells: {} }] },
      { id: 'p15', name: 'ビズライフ（東京）', pages: '5/16', start: '2025/11', deadline: 'なし', order: 14, status: 'active', pinned: false, rows: [{ id: 'r29', memberId: 'm2', order: 0, cells: {} }, { id: 'r30', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p16', name: '中部システムソリューションズ', pages: '8/11', start: '2025/11', deadline: 'なし', order: 15, status: 'active', pinned: false, rows: [{ id: 'r31', memberId: 'm2', order: 0, cells: {} }, { id: 'r32', memberId: 'm5', order: 1, cells: {} }] },
      { id: 'p17', name: '藤徳紙器', pages: '7/11', start: '2025/12', deadline: 'なし', order: 16, status: 'active', pinned: false, rows: [{ id: 'r33', memberId: 'm4', order: 0, cells: {} }, { id: 'r34', memberId: 'm5', order: 1, cells: {} }] },
      { id: 'p18', name: '春岡会', pages: '7/9', start: '2026/1', deadline: 'なし', order: 17, status: 'active', pinned: false, rows: [{ id: 'r35', memberId: 'm4', order: 0, cells: {} }, { id: 'r36', memberId: 'm7', order: 1, cells: {} }] },
      { id: 'p19', name: 'カツベ歯科', pages: '18/21', start: '2026/1', deadline: '', order: 18, status: 'active', pinned: false, rows: [{ id: 'r37', memberId: 'm2', order: 0, cells: {} }, { id: 'r38', memberId: 'm5', order: 1, cells: {} }] },
      { id: 'p20', name: 'オオサキメディカル（dacco）', pages: '5/10', start: '2026/1', deadline: '2026/10公開', order: 19, status: 'active', pinned: false, rows: [{ id: 'r39', memberId: 'm2', order: 0, cells: {} }, { id: 'r40', memberId: 'm5', order: 1, cells: {} }] },
      { id: 'p21', name: 'セントラルパシフィックトレーディング（CPT）', pages: '6/11', start: '2026/1', deadline: '', order: 20, status: 'active', pinned: false, rows: [{ id: 'r41', memberId: 'm4', order: 0, cells: {} }, { id: 'r42', memberId: 'm7', order: 1, cells: {} }] },
      { id: 'p22', name: '浅田レディース（品川）', pages: '13/20', start: '2026/1', deadline: 'なし（なるべく早く、名古屋より早く）', order: 21, status: 'active', pinned: false, rows: [{ id: 'r43', memberId: 'm3', order: 0, cells: {} }, { id: 'r44', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p23', name: 'いわくら内科・呼吸器内科クリニック', pages: '11/14', start: '2026/2', deadline: '', order: 22, status: 'active', pinned: false, rows: [{ id: 'r45', memberId: 'm3', order: 0, cells: {} }, { id: 'r46', memberId: 'm5', order: 1, cells: {} }] },
      { id: 'p24', name: 'pamphlet square（satellite works）', pages: '4/8', start: '2026/3', deadline: '', order: 23, status: 'active', pinned: false, rows: [{ id: 'r47', memberId: 'm4', order: 0, cells: {} }, { id: 'r48', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p25', name: 'チラシ・ザ・ワン（satellite works）', pages: '3/7', start: '2026/4', deadline: '', order: 24, status: 'active', pinned: false, rows: [{ id: 'r49', memberId: 'm4', order: 0, cells: {} }, { id: 'r50', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p26', name: 'ビズライフ（コーポレート）', pages: '4/7', start: '2026/3', deadline: '', order: 25, status: 'active', pinned: false, rows: [{ id: 'r51', memberId: 'm2', order: 0, cells: {} }, { id: 'r52', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p27', name: '岡田金属', pages: '11/15', start: '2026/3', deadline: '', order: 26, status: 'active', pinned: false, rows: [{ id: 'r53', memberId: 'm2', order: 0, cells: {} }, { id: 'r54', memberId: 'm5', order: 1, cells: {} }] },
      { id: 'p28', name: '伊勢パールピアホテル', pages: '13/16', start: '2026/4', deadline: '', order: 27, status: 'active', pinned: false, rows: [{ id: 'r55', memberId: 'm4', order: 0, cells: {} }, { id: 'r56', memberId: 'm5', order: 1, cells: {} }] },
      { id: 'p29', name: '外大', pages: '', start: '', deadline: '', order: 0, status: 'active', pinned: true, rows: [{ id: 'r57', memberId: 'm3', order: 0, cells: {} }] },
      { id: 'p30', name: '学芸', pages: '', start: '', deadline: '', order: 1, status: 'active', pinned: true, rows: [{ id: 'r58', memberId: 'm6', order: 0, cells: {} }] },
      { id: 'p31', name: '提案用', pages: '', start: '', deadline: '', order: 2, status: 'active', pinned: true, rows: [{ id: 'r59', memberId: 'm3', order: 0, cells: {} }] },
      { id: 'p32', name: 'コラム', pages: '', start: '', deadline: '', order: 3, status: 'active', pinned: true, rows: [{ id: 'r60', memberId: 'm4', order: 0, cells: {} }, { id: 'r61', memberId: 'm6', order: 1, cells: {} }] },
      { id: 'p33', name: '過去案件修正', pages: '', start: '', deadline: '', order: 4, status: 'active', pinned: true, rows: [{ id: 'r62', memberId: 'm6', order: 0, cells: {} }] },
    ],
    customNonWorkingDays: [],
    removedHolidays: [],
    pins: {},
    view: { archiveBefore: yesterday, days: 210 },
  };
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveHistory: () => void;
  // UI state
  filterMembers: Set<string>;
  setFilterMembers: React.Dispatch<React.SetStateAction<Set<string>>>;
  showDone: boolean;
  setShowDone: React.Dispatch<React.SetStateAction<boolean>>;
  panel: PanelMode;
  setPanel: React.Dispatch<React.SetStateAction<PanelMode>>;
  contextMenu: ContextMenuState;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState>>;
  toastMessage: string;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const undoStack = useRef<AppState[]>([]);
  const redoStack = useRef<AppState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [filterMembers, setFilterMembers] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(false);
  const [panel, setPanel] = useState<PanelMode>({ type: 'none' });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, items: [],
  });
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const saveHistory = useCallback(() => {
    undoStack.current.push(cloneState(stateRef.current));
    redoStack.current = [];
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(''), 1200);
  }, []);

  const undo = useCallback(() => {
    if (!undoStack.current.length) { showToast('これ以上取り消せません'); return; }
    redoStack.current.push(cloneState(stateRef.current));
    dispatch({ type: 'RESTORE_SNAPSHOT', snapshot: undoStack.current.pop()! });
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
    showToast('取り消し');
  }, [showToast]);

  const redo = useCallback(() => {
    if (!redoStack.current.length) { showToast('これ以上やり直せません'); return; }
    undoStack.current.push(cloneState(stateRef.current));
    dispatch({ type: 'RESTORE_SNAPSHOT', snapshot: redoStack.current.pop()! });
    setCanRedo(redoStack.current.length > 0);
    setCanUndo(true);
    showToast('やり直し');
  }, [showToast]);

  return (
    <AppContext.Provider value={{
      state, dispatch, undo, redo, canUndo, canRedo, saveHistory,
      filterMembers, setFilterMembers,
      showDone, setShowDone,
      panel, setPanel,
      contextMenu, setContextMenu,
      toastMessage, showToast,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
