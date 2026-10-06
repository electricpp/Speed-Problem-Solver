import { SessionReport } from '../types';

/**
 * Formats seconds into MM:SS or HH:MM:SS format for live digital timers.
 */
export function formatDigitalTimer(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Human readable duration: e.g. "1 hour 25 minutes" or "45 minutes" or "32 seconds"
 */
export function formatHumanDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0 minutes';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (hours === 0 && (minutes === 0 || seconds > 0 && parts.length === 0)) {
    parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  }

  return parts.join(' ') || '0 minutes';
}

/**
 * Formats duration in minutes with one decimal place if needed, e.g. "2.5 minutes" or "14 minutes"
 */
export function formatMinutesText(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0 minutes';
  const mins = totalSeconds / 60;
  if (mins < 1) {
    return `${totalSeconds} seconds`;
  }
  const formatted = mins % 1 === 0 ? mins.toFixed(0) : mins.toFixed(1);
  return `${formatted} ${parseFloat(formatted) === 1 ? 'minute' : 'minutes'}`;
}

/**
 * Generates the clean text format requested by the user, perfect for clipboard sharing.
 */
export function generateReportCopyText(report: SessionReport): string {
  const durationText = formatHumanDuration(report.totalSessionTime);
  const timePerProblemText = report.totalProblemsSolved > 0 
    ? formatMinutesText(Math.round(report.pureTimePerProblem))
    : '0 minutes (None solved)';
  
  const skippedText = report.skippedQuestions && report.skippedQuestions.length > 0
    ? report.skippedQuestions.map(q => `Q${q}`).join(', ')
    : 'None';

  return [
    `Studied ${report.subject} for ${durationText}.`,
    `Total Problems solved: ${report.totalProblemsSolved}`,
    `Time per problem: ${timePerProblemText}`,
    `Total time on Investigation: ${formatMinutesText(report.totalInvestigationTime)}`,
    `Total time on Studying concept: ${formatMinutesText(report.totalStudyConceptTime)}`,
    `Skipped Questions: ${skippedText}`,
  ].join('\n');
}
