import { useMemo } from 'react';
import type { Project } from '../types';

export function useVisibleProjects(
  projects: Project[],
  filterMembers: Set<string>,
  showDone: boolean,
): { norm: Project[]; pin: Project[] } {
  return useMemo(() => {
    let projs = projects;
    if (filterMembers.size > 0) {
      // 選択メンバーを含む案件の全行を表示（行単位ではなく案件単位でフィルタ）
      projs = projs.filter(p => p.rows.some(r => filterMembers.has(r.memberId)));
    }
    const norm = projs
      .filter(p => !p.pinned && (showDone || p.status !== 'done'))
      .sort((a, b) => a.order - b.order);
    const pin = projs
      .filter(p => p.pinned && (showDone || p.status !== 'done'))
      .sort((a, b) => a.order - b.order);
    return { norm, pin };
  }, [projects, filterMembers, showDone]);
}
