import { useMemo } from 'react';
import { getGanttStartDate, addD } from '../utils/date';

export function useGanttDays(totalDays: number): Date[] {
  return useMemo(() => {
    const start = getGanttStartDate();
    return Array.from({ length: totalDays }, (_, i) => addD(start, i));
  }, [totalDays]);
}
