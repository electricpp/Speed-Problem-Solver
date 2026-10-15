import { SessionReport, ParkedThought } from '../types';

const STORAGE_KEY = 'velocity_study_history_v1';
const THOUGHTS_STORAGE_KEY = 'velocity_parked_thoughts_v1';

// ========================
// SESSION HISTORY STORAGE
// ========================

export function loadHistory(): SessionReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: SessionReport[] = JSON.parse(raw);
    // Ensure backwards compatibility with older reports that didn't have `mode`
    return list.map(item => ({
      ...item,
      mode: item.mode || 'solve_problems',
    }));
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

/**
 * Exports history array as a downloadable JSON file.
 */
export function exportHistoryToFile(history: SessionReport[]): void {
  if (typeof window === 'undefined') return;
  const jsonString = JSON.stringify(history, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `velocity-study-history-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Imports a JSON file, validates its structure, merges with existing history, and restores to localStorage.
 */
export async function importHistoryFromFile(file: File): Promise<{ success: boolean; count: number; updated: SessionReport[]; message?: string }> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, updated: [], message: 'Invalid format: JSON file must contain an array of study sessions.' };
    }

    // Validate entries (both solve_problems and topic_review sessions)
    const validReports: SessionReport[] = parsed.filter(item => {
      return item && typeof item === 'object' && 'id' in item && 'subject' in item && (
        'totalProblemsSolved' in item || 'totalTopicsStudied' in item || 'totalSessionTime' in item
      );
    }).map(item => ({
      ...item,
      mode: item.mode || (item.totalTopicsStudied !== undefined ? 'topic_review' : 'solve_problems'),
    }));

    if (validReports.length === 0) {
      return { success: false, count: 0, updated: [], message: 'No valid study session records found in the uploaded file.' };
    }

    // Merge with existing history (avoiding duplicate IDs)
    const current = loadHistory();
    const existingIds = new Set(current.map(item => item.id));
    
    // Combine imported items with existing items
    const merged = [...validReports.filter(item => !existingIds.has(item.id)), ...current];
    const finalHistory = merged.length > 0 ? merged : validReports;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalHistory));

    return {
      success: true,
      count: validReports.length,
      updated: finalHistory,
      message: `Successfully restored ${validReports.length} session${validReports.length === 1 ? '' : 's'}!`,
    };
  } catch (err) {
    console.error('Failed to import JSON history', err);
    return { success: false, count: 0, updated: [], message: 'Failed to read JSON file. Please ensure it is valid JSON.' };
  }
}

export function calculateSummaryStats(history: SessionReport[]) {
  const totalSessions = history.length;
  const problemSessions = history.filter(h => h.mode !== 'topic_review');
  const topicSessions = history.filter(h => h.mode === 'topic_review');

  const totalProblemsSolved = problemSessions.reduce((sum, h) => sum + (h.totalProblemsSolved || 0), 0);
  const totalTopicsStudied = topicSessions.reduce((sum, h) => sum + (h.totalTopicsStudied || 0), 0);
  const totalSeconds = history.reduce((sum, h) => sum + h.totalSessionTime, 0);
  
  // Weighted or global average pure solve time per solved question
  const totalPureSolveTime = problemSessions.reduce((sum, h) => {
    return sum + ((h.pureTimePerProblem || 0) * (h.totalProblemsSolved || 0));
  }, 0);

  const avgPureTime = totalProblemsSolved > 0 ? totalPureSolveTime / totalProblemsSolved : 0;

  // Average time per topic
  const totalTopicSeconds = topicSessions.reduce((sum, h) => sum + h.totalSessionTime, 0);
  const avgTopicTime = totalTopicsStudied > 0 ? totalTopicSeconds / totalTopicsStudied : 0;

  return {
    totalSessions,
    totalProblemsSolved,
    totalTopicsStudied,
    totalSeconds,
    avgPureTime,
    avgTopicTime,
  };
}

// ==================================
// DISTRACTION PARKING LOT STORAGE
// ==================================

export function loadParkedThoughts(): ParkedThought[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(THOUGHTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load parked thoughts', e);
    return [];
  }
}

export function saveParkedThought(thought: ParkedThought): ParkedThought[] {
  if (typeof window === 'undefined') return [thought];
  try {
    const existing = loadParkedThoughts();
    const updated = [thought, ...existing];
    localStorage.setItem(THOUGHTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save parked thought', e);
    return [];
  }
}

export function updateParkedThoughtStatus(id: string, isHandled: boolean): ParkedThought[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = loadParkedThoughts();
    const updated = existing.map(t => (t.id === id ? { ...t, isHandled } : t));
    localStorage.setItem(THOUGHTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to update parked thought status', e);
    return [];
  }
}

export function deleteParkedThought(id: string): ParkedThought[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = loadParkedThoughts();
    const updated = existing.filter(t => t.id !== id);
    localStorage.setItem(THOUGHTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete parked thought', e);
    return [];
  }
}

export function clearHandledParkedThoughts(): ParkedThought[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = loadParkedThoughts();
    const updated = existing.filter(t => !t.isHandled);
    localStorage.setItem(THOUGHTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to clear handled parked thoughts', e);
    return [];
  }
}
