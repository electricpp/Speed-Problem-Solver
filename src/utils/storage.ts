import { SessionReport } from '../types';

const STORAGE_KEY = 'velocity_study_history_v1';

export function loadHistory(): SessionReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load study history from localStorage', e);
    return [];
  }
}

export function saveSessionToHistory(report: SessionReport): SessionReport[] {
  if (typeof window === 'undefined') return [report];
  try {
    const history = loadHistory();
    // Prepend latest report
    const updated = [report, ...history];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save session to localStorage', e);
    return [];
  }
}

export function deleteSessionFromHistory(id: string): SessionReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const history = loadHistory();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete session', e);
    return [];
  }
}

export function clearAllHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear storage', e);
  }
}

export function calculateSummaryStats(history: SessionReport[]) {
  const totalSessions = history.length;
  const totalProblemsSolved = history.reduce((sum, h) => sum + h.totalProblemsSolved, 0);
  const totalSeconds = history.reduce((sum, h) => sum + h.totalSessionTime, 0);
  
  // Weighted or global average pure solve time per solved question
  const totalPureSolveTime = history.reduce((sum, h) => {
    return sum + (h.pureTimePerProblem * h.totalProblemsSolved);
  }, 0);

  const avgPureTime = totalProblemsSolved > 0 ? totalPureSolveTime / totalProblemsSolved : 0;

  return {
    totalSessions,
    totalProblemsSolved,
    totalSeconds,
    avgPureTime,
  };
}
