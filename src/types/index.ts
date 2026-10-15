export type Subject = 'Physics' | 'Chemistry' | 'Math';

export type SessionMode = 'solve_problems' | 'topic_review';

export type QuestionStatus = 'solved' | 'skipped' | 'in_progress';

export interface QuestionRecord {
  questionNumber: number;
  pureSolveTime: number; // in seconds (excluding stuck and study)
  stuckTime: number; // in seconds
  studyConceptTime: number; // in seconds
  status: QuestionStatus;
}

export interface TopicRecord {
  topicNumber: number;
  timeSpent: number; // in seconds
}

export interface ParkedThought {
  id: string;
  sessionId: string;
  subject: Subject;
  sessionMode: SessionMode;
  text: string;
  createdAt: string; // ISO string
  timestampFormatted: string; // e.g. "10:45 AM"
  isHandled: boolean;
}

export interface SessionReport {
  id: string;
  date: string; // ISO string
  formattedDate: string;
  subject: Subject;
  mode: SessionMode;
  timeConstraintMinutes: number | null;
  totalSessionTime: number; // total active seconds

  // Solve Problems Mode specific:
  targetQuestions?: number;
  totalProblemsSolved?: number;
  pureTimePerProblem?: number; // average seconds per solved problem
  totalInvestigationTime?: number; // seconds
  totalStudyConceptTime?: number; // seconds
  skippedQuestions?: number[]; // e.g. [3, 7]
  questionDetails?: QuestionRecord[];

  // Topic Review Mode specific:
  targetTopics?: number;
  totalTopicsStudied?: number;
  timePerTopic?: number; // average seconds per topic
  topicDetails?: TopicRecord[];

  // Distraction Parking Lot items associated with this session:
  parkedThoughts?: ParkedThought[];
}

export interface SessionConfig {
  subject: Subject;
  mode: SessionMode;
  targetGoal: number; // Target questions (solve mode) or Target topics (topic review)
  timeConstraintMinutes: number | null;
}
