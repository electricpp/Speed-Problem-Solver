import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Clock,
  Target,
  Search,
  BookOpen,
  CheckCircle2,
  FastForward,
  LogOut,
} from 'lucide-react';
import { Subject, SessionConfig, SessionReport, QuestionRecord } from '../types';
import { formatDigitalTimer, formatHumanDuration } from '../utils/formatters';
import { soundManager, triggerHaptic } from '../utils/audio';

interface PracticeScreenProps {
  config: SessionConfig;
  onEndSession: (report: SessionReport) => void;
  onCancelToHome: () => void;
}

type ActiveMode = 'solving' | 'stuck' | 'study_concept';

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
  config,
  onEndSession,
  onCancelToHome,
}) => {
  // Session lifecycle
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(soundManager.isEnabled());

  // Questions and timings
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [completedRecords, setCompletedRecords] = useState<QuestionRecord[]>([]);
  const [skippedQuestions, setSkippedQuestions] = useState<number[]>([]);

  // Current question timers (in seconds)
  const [questionPureSeconds, setQuestionPureSeconds] = useState<number>(0);
  const [investigationSeconds, setInvestigationSeconds] = useState<number>(0);
  const [studyConceptSeconds, setStudyConceptSeconds] = useState<number>(0);

  // Overall session timers (in seconds)
  const [totalSessionSeconds, setTotalSessionSeconds] = useState<number>(0);
  const [totalInvestigationAccumulated, setTotalInvestigationAccumulated] = useState<number>(0);
  const [totalStudyAccumulated, setTotalStudyAccumulated] = useState<number>(0);

  // State modes
  const [activeMode, setActiveMode] = useState<ActiveMode>('solving');
  const [isSessionPaused, setIsSessionPaused] = useState<boolean>(false);
  
  // Goal and celebration states
  const [hasTriggeredGoalCelebration, setHasTriggeredGoalCelebration] = useState<boolean>(false);
  const [screenCelebrationFlash, setScreenCelebrationFlash] = useState<boolean>(false);
  const [hasTriggeredTimeAlert, setHasTriggeredTimeAlert] = useState<boolean>(false);
  const [showEndConfirm, setShowEndConfirm] = useState<boolean>(false);
  const [isEndingSession, setIsEndingSession] = useState<boolean>(false);

  // Interval reference
  const timerRef = useRef<number | null>(null);

  // Sound toggle handler
  const handleToggleSound = () => {
    const next = soundManager.toggleSound();
    setIsSoundOn(next);
  };

  // Pause / Resume toggle handler
  const handleTogglePause = () => {
    soundManager.playClick();
    triggerHaptic('light');
    setIsSessionPaused((prev) => !prev);
  };

  // Launch the session
  const handleStartPractice = () => {
    soundManager.playClick();
    triggerHaptic('success');
    setHasStarted(true);
    setIsSessionPaused(false);
    setActiveMode('solving');
  };

  // Main 1-second ticker - completely stops while session is paused so paused time is never counted
  useEffect(() => {
    if (!hasStarted || isSessionPaused) return;

    timerRef.current = window.setInterval(() => {
      // Total session time increments only while unpaused
      setTotalSessionSeconds((prev) => prev + 1);

      // Mode-specific timers
      if (activeMode === 'solving') {
        setQuestionPureSeconds((prev) => prev + 1);
      } else if (activeMode === 'stuck') {
        setInvestigationSeconds((prev) => prev + 1);
        setTotalInvestigationAccumulated((prev) => prev + 1);
      } else if (activeMode === 'study_concept') {
        setStudyConceptSeconds((prev) => prev + 1);
        setTotalStudyAccumulated((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, isSessionPaused, activeMode]);

  // Check time constraint warning
  useEffect(() => {
    if (!config.timeConstraintMinutes || hasTriggeredTimeAlert || !hasStarted) return;
    const timeLimitSeconds = config.timeConstraintMinutes * 60;
    if (totalSessionSeconds >= timeLimitSeconds) {
      setHasTriggeredTimeAlert(true);
      soundManager.playTimeAlert();
      triggerHaptic('warning');
    }
  }, [totalSessionSeconds, config.timeConstraintMinutes, hasTriggeredTimeAlert, hasStarted]);

  // Trigger celebration when target reached
  const checkGoalCompletion = (newCompletedCount: number) => {
    if (newCompletedCount === config.targetQuestions && !hasTriggeredGoalCelebration) {
      setHasTriggeredGoalCelebration(true);
      setScreenCelebrationFlash(true);
      soundManager.playCelebrationFanfare();
      triggerHaptic('celebrate');

      // Confetti explosion
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#6366f1', '#f59e0b', '#ec4899'],
        });
      } catch {
        // Fallback gracefully
      }

      setTimeout(() => {
        setScreenCelebrationFlash(false);
      }, 3000);
    }
  };

  // "Done Solving" handler
  const handleDoneSolving = () => {
    if (activeMode !== 'solving') return;

    soundManager.playDopamineChime();
    triggerHaptic('success');

    const newRecord: QuestionRecord = {
      questionNumber: currentQuestionNumber,
      pureSolveTime: questionPureSeconds,
      stuckTime: investigationSeconds,
      studyConceptTime: studyConceptSeconds,
      status: 'solved',
    };

    const nextCompleted = [...completedRecords, newRecord];
    setCompletedRecords(nextCompleted);

    // Reset current question timer state
    setQuestionPureSeconds(0);
    setInvestigationSeconds(0);
    setStudyConceptSeconds(0);
    setCurrentQuestionNumber((prev) => prev + 1);

    // Check celebration
    checkGoalCompletion(nextCompleted.length);
  };

  // "Stuck" (Investigating) toggle handler
  const handleToggleStuck = () => {
    soundManager.playClick();
    triggerHaptic('light');

    if (activeMode === 'solving') {
      setActiveMode('stuck');
    } else if (activeMode === 'stuck') {
      // Toggle back to solving
      setActiveMode('solving');
    }
  };

  // "Study Concept" toggle handler
  const handleToggleStudyConcept = () => {
    soundManager.playClick();
    triggerHaptic('light');

    if (activeMode === 'solving') {
      setActiveMode('study_concept');
    } else if (activeMode === 'study_concept') {
      // Toggle back to solving
      setActiveMode('solving');
    }
  };

  // "Skip" problem handler (Contextual, visible during stuck / investigation)
  const handleSkipProblem = () => {
    soundManager.playClick();
    triggerHaptic('warning');

    const skippedRecord: QuestionRecord = {
      questionNumber: currentQuestionNumber,
      pureSolveTime: questionPureSeconds,
      stuckTime: investigationSeconds,
      studyConceptTime: studyConceptSeconds,
      status: 'skipped',
    };

    setCompletedRecords((prev) => [...prev, skippedRecord]);
    setSkippedQuestions((prev) => [...prev, currentQuestionNumber]);

    // Advance to next question and resume solving
    setQuestionPureSeconds(0);
    setInvestigationSeconds(0);
    setStudyConceptSeconds(0);
    setCurrentQuestionNumber((prev) => prev + 1);
    setActiveMode('solving');
  };

  // End Session Handler
  const handleConfirmEndSession = () => {
    setShowEndConfirm(false);
    setIsEndingSession(true);
    soundManager.playSessionEndSound();
    triggerHaptic('end_session');

    // Solved questions list (excludes in-progress question and skipped questions)
    const solvedQuestions = completedRecords.filter((r) => r.status === 'solved');
    const totalSolved = solvedQuestions.length;

    const totalPureSolveSeconds = solvedQuestions.reduce((acc, q) => acc + q.pureSolveTime, 0);
    const avgPureTime = totalSolved > 0 ? totalPureSolveSeconds / totalSolved : 0;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const report: SessionReport = {
      id: `session_${Date.now()}`,
      date: now.toISOString(),
      formattedDate,
      subject: config.subject,
      targetQuestions: config.targetQuestions,
      timeConstraintMinutes: config.timeConstraintMinutes,
      totalSessionTime: totalSessionSeconds,
      totalProblemsSolved: totalSolved,
      pureTimePerProblem: avgPureTime,
      totalInvestigationTime: totalInvestigationAccumulated,
      totalStudyConceptTime: totalStudyAccumulated,
      skippedQuestions,
      questionDetails: completedRecords,
    };

    setTimeout(() => {
      onEndSession(report);
    }, 450);
  };

  const isModeStuckOrStudy = activeMode === 'stuck' || activeMode === 'study_concept';
  const areButtonsDisabled = isModeStuckOrStudy || isSessionPaused;

  // PC Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // If not started yet, Space or Enter begins the session
      if (!hasStarted) {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartPractice();
        }
        return;
      }

      if (isEndingSession) return;

      // If End Session confirmation modal is open:
      if (showEndConfirm) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleConfirmEndSession();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowEndConfirm(false);
        }
        return;
      }

      // 1. Space -> "Done Solving"
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!areButtonsDisabled && activeMode === 'solving') {
          handleDoneSolving();
        }
      }
      // 2. Enter -> "End Session"
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (!isModeStuckOrStudy && !isEndingSession) {
          soundManager.playClick();
          setShowEndConfirm(true);
        }
      }
      // 3. S or s -> "Stuck"
      else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (activeMode !== 'study_concept' && !isSessionPaused) {
          handleToggleStuck();
        }
      }
      // 4. C or c -> "Study Concept"
      else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (activeMode !== 'stuck' && !isSessionPaused) {
          handleToggleStudyConcept();
        }
      }
      // Bonus shortcut: P or p -> Pause / Resume
      else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleTogglePause();
      }
      // Bonus shortcut: K or k -> Skip Problem (while in Stuck mode)
      else if ((e.key === 'k' || e.key === 'K') && activeMode === 'stuck') {
        e.preventDefault();
        handleSkipProblem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    hasStarted,
    isEndingSession,
    showEndConfirm,
    areButtonsDisabled,
    activeMode,
    isSessionPaused,
    isModeStuckOrStudy,
    currentQuestionNumber,
    questionPureSeconds,
    investigationSeconds,
    studyConceptSeconds,
    completedRecords,
  ]);

  // Progress metrics
  const solvedCount = completedRecords.filter((r) => r.status === 'solved').length;
  const progressPercent = Math.min(100, Math.round((solvedCount / config.targetQuestions) * 100));

  // Time remaining calculation if constraint set
  const timeLimitSeconds = config.timeConstraintMinutes ? config.timeConstraintMinutes * 60 : null;
  const timeRemainingSeconds = timeLimitSeconds !== null ? Math.max(0, timeLimitSeconds - totalSessionSeconds) : null;
  const isTimeOver = timeLimitSeconds !== null && totalSessionSeconds >= timeLimitSeconds;

  // Screen background flash if goal reached
  const celebrationBg = screenCelebrationFlash
    ? 'bg-gradient-to-b from-cyan-950 via-[#0a1828] to-[#090d16]'
    : 'bg-[#090d16]';

  // Ready / Start Screen before user begins solving
  if (!hasStarted) {
    return (
      <div className="min-h-[100dvh] landscape:min-h-0 landscape:h-[100dvh] flex flex-col justify-between p-4 sm:p-6 landscape:py-2 landscape:px-6 max-w-xl landscape:max-w-3xl mx-auto text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between py-2 landscape:py-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              {config.subject}
            </span>
          </div>
          <button
            onClick={onCancelToHome}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Center Prompt */}
        <div className="text-center py-8 landscape:py-2 space-y-4 landscape:space-y-2">
          <div className="w-16 h-16 landscape:w-12 landscape:h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/10">
            <Play className="w-8 h-8 landscape:w-6 landscape:h-6 translate-x-0.5 fill-current" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl landscape:text-xl font-extrabold text-white tracking-tight">
              Ready to Practice {config.subject}?
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Solving questions from your book. Timer starts immediately when you press Start.
            </p>
          </div>

          {/* Config Summary Card */}
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto p-3.5 landscape:p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left">
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                Target Goal
              </div>
              <div className="text-base sm:text-lg font-bold text-white mt-0.5 font-tabular">
                {config.targetQuestions} Problems
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Time Limit
              </div>
              <div className="text-base sm:text-lg font-bold text-white mt-0.5 font-tabular">
                {config.timeConstraintMinutes ? `${config.timeConstraintMinutes} Min` : 'Open-ended'}
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pb-6 landscape:pb-2">
          <button
            onClick={handleStartPractice}
            className="w-full h-14 landscape:h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-base landscape:text-sm tracking-wide shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 landscape:w-4 landscape:h-4 fill-current" />
            <span>START SESSION</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] landscape:h-[100dvh] landscape:max-h-[100dvh] landscape:overflow-hidden flex flex-col justify-between transition-colors duration-500 ${celebrationBg}`}>
      {/* Top Section: Progress & Session Timing */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-3 pb-2 landscape:pt-1.5 landscape:pb-1 space-y-2.5 landscape:space-y-1.5 shrink-0">
        {/* Top bar with Subject & Timers */}
        <div className="flex items-center justify-between">
          {/* Subject Badge */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800/80 border border-slate-700/80 text-cyan-300">
              {config.subject}
            </span>

            {/* Target Hit Badge */}
            {hasTriggeredGoalCelebration && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Goal Reached!
              </span>
            )}
          </div>

          {/* Timers & Controls Cluster */}
          <div className="flex items-center gap-2">
            {/* Pause / Resume Session Button */}
            <button
              onClick={handleTogglePause}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                isSessionPaused
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 ring-2 ring-amber-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isSessionPaused ? 'Resume study session' : 'Pause session timers'}
              aria-label={isSessionPaused ? 'Resume session' : 'Pause session'}
            >
              {isSessionPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pause</span>
                </>
              )}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
              title={isSoundOn ? 'Mute sounds' : 'Enable sounds'}
              aria-label="Toggle sound"
            >
              {isSoundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Total Session Stopwatch */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-tabular ${
              isSessionPaused
                ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">{formatDigitalTimer(totalSessionSeconds)}</span>
              {isSessionPaused && <span className="text-[10px] text-amber-400 uppercase tracking-tight ml-0.5">(Paused)</span>}
            </div>

            {/* Time Constraint Countdown (if set) */}
            {timeRemainingSeconds !== null && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-tabular font-semibold ${
                  isTimeOver
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}
                title={isTimeOver ? 'Target time has elapsed' : 'Time remaining'}
              >
                <span>{isTimeOver ? 'Time Up!' : `Rem: ${formatDigitalTimer(timeRemainingSeconds)}`}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar Container - Thicker width */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Completed <strong className="text-white font-tabular">{solvedCount}</strong> of{' '}
              <strong className="text-slate-300 font-tabular">{config.targetQuestions}</strong>
              {skippedQuestions.length > 0 && (
                <span className="text-amber-400 ml-1.5">({skippedQuestions.length} skipped)</span>
              )}
            </span>
            <span className="font-tabular font-semibold text-cyan-400">
              {solvedCount} / {config.targetQuestions} ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-3.5 sm:h-4 rounded-full bg-slate-800/90 overflow-hidden border border-slate-700/80 p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out shadow-sm ${
                solvedCount >= config.targetQuestions
                  ? 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300 shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-500/50'
              }`}
              style={{ width: `${Math.min(100, (solvedCount / config.targetQuestions) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Responsive Work Area: Portrait (stacked flex) vs Landscape (2-column side-by-side) */}
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-between landscape:grid landscape:grid-cols-2 landscape:gap-6 landscape:items-center landscape:px-4 landscape:py-1 landscape:overflow-hidden">
        {/* Left Column in Landscape / Center in Portrait: Question Display & Timers */}
        <div className="flex flex-col items-center justify-center px-4 py-4 landscape:py-1 text-center select-none w-full">
          {/* Active Mode Notification Banner */}
          {activeMode === 'stuck' && (
            <div className="mb-3 landscape:mb-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs sm:text-sm landscape:text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <Search className="w-4 h-4 shrink-0 animate-bounce" />
              <span>Investigating problem... Other buttons paused.</span>
            </div>
          )}

          {activeMode === 'study_concept' && (
            <div className="mb-3 landscape:mb-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm landscape:text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <BookOpen className="w-4 h-4 shrink-0 animate-bounce" />
              <span>Studying concept / formulas... Other buttons paused.</span>
            </div>
          )}

          {isSessionPaused && (
            <div className="mb-3 landscape:mb-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs sm:text-sm landscape:text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <Pause className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Session paused. Timers are not counting.</span>
            </div>
          )}

          {/* Giant Question Display with clear anti-overlap spacing */}
          <div className="relative py-2 landscape:py-0 flex flex-col items-center">
            {/* Label placed above Q to completely prevent any descender collision from Exo 2 font */}
            <div className="mb-2 landscape:mb-1 px-3.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] sm:text-xs landscape:text-[10px] uppercase tracking-widest text-slate-300 font-semibold shadow-sm">
              Current Problem
            </div>

            <div
              className={`text-7xl sm:text-8xl md:text-9xl landscape:text-5xl font-black tracking-tight leading-none pb-4 sm:pb-6 landscape:pb-1 transition-all duration-200 select-none ${
                isSessionPaused
                  ? 'text-slate-400 opacity-60'
                  : activeMode === 'solving'
                  ? 'text-white drop-shadow-[0_0_35px_rgba(6,182,212,0.35)]'
                  : activeMode === 'stuck'
                  ? 'text-amber-400/90 drop-shadow-[0_0_35px_rgba(245,158,11,0.25)]'
                  : 'text-indigo-400/90 drop-shadow-[0_0_35px_rgba(99,102,241,0.25)]'
              }`}
            >
              Q{currentQuestionNumber}
            </div>
          </div>

          {/* Live Question Pure Solve Timer */}
          <div className="mt-2 landscape:mt-1 flex flex-col items-center">
            <div className="text-xs landscape:text-[11px] text-slate-400 mb-0.5 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Time on this question:</span>
            </div>
            <div
              className={`text-2xl sm:text-3xl landscape:text-xl font-bold font-tabular tracking-wider ${
                isSessionPaused
                  ? 'text-amber-300 opacity-70'
                  : activeMode === 'solving'
                  ? 'text-cyan-300'
                  : 'text-slate-500 line-through opacity-60'
              }`}
            >
              {formatDigitalTimer(questionPureSeconds)}
            </div>
          </div>

          {/* Secondary timers summary for this question (if any stuck or study was spent) */}
          {(investigationSeconds > 0 || studyConceptSeconds > 0) && (
            <div className="mt-2 landscape:mt-1 flex items-center gap-3 text-xs landscape:text-[11px] text-slate-400 font-tabular">
              {investigationSeconds > 0 && (
                <span className="text-amber-400/90">
                  Stuck: {formatDigitalTimer(investigationSeconds)}
                </span>
              )}
              {investigationSeconds > 0 && studyConceptSeconds > 0 && <span>·</span>}
              {studyConceptSeconds > 0 && (
                <span className="text-indigo-400/90">
                  Concept: {formatDigitalTimer(studyConceptSeconds)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Column in Landscape / Bottom in Portrait: Controls & Buttons */}
        <div className="w-full max-w-xl mx-auto px-4 pb-6 sm:pb-8 pt-2 space-y-3 landscape:pb-1 landscape:pt-0 landscape:space-y-2 shrink-0">
          {/* Contextual "Skip" button (Only visible when Stuck / Investigating) */}
          {activeMode === 'stuck' && (
            <div className="animate-in slide-in-from-bottom-2 duration-150">
              <button
                onClick={handleSkipProblem}
                className="w-full h-12 landscape:h-9 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-sm landscape:text-xs tracking-wide transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <FastForward className="w-4 h-4" />
                <span>Skip Problem (Log as Skipped & Next Q)</span>
              </button>
            </div>
          )}

          {/* Primary Action Button: "Done Solving" */}
          <button
            onClick={handleDoneSolving}
            disabled={areButtonsDisabled}
            className={`w-full h-16 landscape:h-12 rounded-2xl font-black text-lg landscape:text-base tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 shadow-xl ${
              areButtonsDisabled
                ? 'bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed shadow-none'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 active:scale-[0.98] cursor-pointer'
            }`}
          >
            <CheckCircle2 className={`w-6 h-6 landscape:w-5 landscape:h-5 ${areButtonsDisabled ? 'text-slate-600' : 'text-slate-950'}`} />
            <span>DONE SOLVING</span>
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-black/20 text-slate-950 border border-black/15 text-[11px] font-mono font-bold tracking-normal ml-1">
              Space
            </kbd>
          </button>

          {/* Middle Dual Mode Buttons: "Stuck" & "Study Concept" */}
          <div className="grid grid-cols-2 gap-3 landscape:gap-2">
            {/* Button 2: Stuck / Investigating */}
            <button
              onClick={handleToggleStuck}
              disabled={activeMode === 'study_concept' || isSessionPaused}
              className={`h-14 landscape:h-10 rounded-xl font-bold text-xs sm:text-sm landscape:text-xs tracking-wide transition-all duration-150 flex items-center justify-center gap-1.5 px-2 ${
                activeMode === 'study_concept' || isSessionPaused
                  ? 'bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed'
                  : activeMode === 'stuck'
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 font-extrabold shadow-lg shadow-amber-500/30 active:scale-95 cursor-pointer'
                  : 'bg-slate-800/90 hover:bg-amber-950/40 border border-amber-500/30 text-amber-400 hover:border-amber-500/60 active:scale-95 cursor-pointer'
              }`}
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {activeMode === 'stuck'
                  ? `Investigating ${formatDigitalTimer(investigationSeconds)}`
                  : 'Stuck'}
              </span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded bg-slate-900/60 border border-slate-700/80 text-slate-300 text-[10px] font-mono ml-0.5">
                S
              </kbd>
            </button>

            {/* Button 3: Study Concept */}
            <button
              onClick={handleToggleStudyConcept}
              disabled={activeMode === 'stuck' || isSessionPaused}
              className={`h-14 landscape:h-10 rounded-xl font-bold text-xs sm:text-sm landscape:text-xs tracking-wide transition-all duration-150 flex items-center justify-center gap-1.5 px-2 ${
                activeMode === 'stuck' || isSessionPaused
                  ? 'bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed'
                  : activeMode === 'study_concept'
                  ? 'bg-indigo-500 text-white ring-2 ring-indigo-300 font-extrabold shadow-lg shadow-indigo-500/30 active:scale-95 cursor-pointer'
                  : 'bg-slate-800/90 hover:bg-indigo-950/40 border border-indigo-500/30 text-indigo-400 hover:border-indigo-500/60 active:scale-95 cursor-pointer'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {activeMode === 'study_concept'
                  ? `Studying Concept ${formatDigitalTimer(studyConceptSeconds)}`
                  : 'Study Concept'}
              </span>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded bg-slate-900/60 border border-slate-700/80 text-slate-300 text-[10px] font-mono ml-0.5">
                C
              </kbd>
            </button>
          </div>

          {/* Button 4: End Session */}
          <button
            onClick={() => {
              soundManager.playClick();
              setShowEndConfirm(true);
            }}
            disabled={isModeStuckOrStudy}
            className={`w-full h-11 landscape:h-8.5 rounded-xl text-xs sm:text-sm landscape:text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 ${
              isModeStuckOrStudy
                ? 'bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 active:scale-95 cursor-pointer'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>End Session</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono ml-1">
              Enter
            </kbd>
          </button>
        </div>
      </div>

      {/* End Session Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">End Study Session?</h3>
              <p className="text-xs text-slate-400">
                You have solved <strong className="text-white">{solvedCount}</strong> problems. The
                current in-progress question (Q{currentQuestionNumber}) will be discarded.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleConfirmEndSession}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Yes, End Session & View Report</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-black/30 border border-white/20 text-[10px] font-mono">
                  Enter
                </kbd>
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Continue Solving</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono">
                  Esc
                </kbd>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Ending Cinematic Visual Effect Overlay */}
      {isEndingSession && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-in fade-in duration-200">
          <div className="relative flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 animate-pulse shadow-[0_0_60px_rgba(6,182,212,0.6)]">
              <LogOut className="w-10 h-10 translate-x-0.5 text-cyan-300" />
            </div>
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl font-black text-white tracking-tight">
                SESSION CONCLUDED
              </h2>
              <div className="flex items-center justify-center gap-2 text-xs text-cyan-300 font-medium tracking-wide">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Compiling Velocity Analytics...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
