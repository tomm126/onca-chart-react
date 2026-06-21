import { HOLIDAYS } from '../constants/holidays';

/** メモリキャッシュ（アプリ起動中は1回のみ取得） */
let _holidays: Set<string> = HOLIDAYS;
let _fetched = false;

export function getHolidays(): Set<string> {
  return _holidays;
}

/**
 * holidays-jp API から祝日データを取得してキャッシュに格納する。
 * 失敗時はハードコード値にフォールバック。
 */
export async function initHolidays(): Promise<Set<string>> {
  if (_fetched) return _holidays;
  try {
    const res = await fetch('https://holidays-jp.github.io/api/v1/date.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: Record<string, string> = await res.json();
    _holidays = new Set(Object.keys(data));
    _fetched = true;
    console.info(`[Holidays] ${_holidays.size} 件の祝日データを取得しました`);
  } catch (e) {
    console.warn('[Holidays] APIからの取得に失敗、ハードコード値を使用します:', e);
    _fetched = true;
  }
  return _holidays;
}
