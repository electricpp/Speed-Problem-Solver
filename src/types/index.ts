export type Subject = 'Physics' | 'Chemistry' | 'Math';

export type QuestionStatus = 'solved' | 'skipped' | 'in_progress';

export interface QuestionRecord {
  questionNumber: number;
  pureSolveTime: number; // in seconds (excluding stuck and study)
  stuckTime: number; // in seconds
  studyConceptTime: number; // in seconds
  status: QuestionStatus;
}

export interface SessionReport {
  id: string;
  date: string; // ISO string
  formattedDate: string;
  subject: Subject;
  targetQuestions: number;
  timeConstraintMinutes: number | null;
  totalSessionTime: number; // pureSolve + stuck + study in seconds
  totalProblemsSolved: number;
  pureTimePerProblem: number; // average seconds per solved problem
  totalInvestigationTime: number; // seconds
  totalStudyConceptTime: number; // seconds
  skippedQuestions: number[]; // e.g. [3, 7]
  questionDetails: QuestionRecord[];
}

export interface SessionConfig {
  subject: Subject;
  targetQuestions: number;
  timeConstraintMinutes: number | null;
}
