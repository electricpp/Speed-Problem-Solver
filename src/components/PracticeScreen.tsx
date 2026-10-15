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
  Brain,
  Layers,
  Zap,
} from 'lucide-react';
import {
  Subject,
  SessionConfig,
  SessionReport,
  QuestionRecord,
  TopicRecord,
  ParkedThought,
} from '../types';
import { formatDigitalTimer, formatHumanDuration, formatMinutesText } from '../utils/formatters';
import { soundManager, triggerHaptic } from '../utils/audio';
import { saveParkedThought } from '../utils/storage';
import { ParkThoughtModal } from './ParkThoughtModal';

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
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);

  // Session lifecycle
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(soundManager.isEnabled());

  // Mode: 'solve_problems' or 'topic_review'
  const isTopicReview = config.mode === 'topic_review';

  // Questions and timings (Solve Problems mode)
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [completedRecords, setCompletedRecords] = useState<QuestionRecord[]>([]);
  const [skippedQuestions, setSkippedQuestions] = useState<number[]>([]);
  const [questionPureSeconds, setQuestionPureSeconds] = useState<number>(0);
  const [investigationSeconds, setInvestigationSeconds] = useState<number>(0);
  const [studyConceptSeconds, setStudyConceptSeconds] = useState<number>(0);
  const [totalInvestigationAccumulated, setTotalInvestigationAccumulated] = useState<number>(0);
  const [totalStudyAccumulated, setTotalStudyAccumulated] = useState<number>(0);
  const [activeMode, setActiveMode] = useState<ActiveMode>('solving');

  // Topics and timings (Topic Review mode)
  const [currentTopicNumber, setCurrentTopicNumber] = useState<number>(1);
  const [topicRecords, setTopicRecords] = useState<TopicRecord[]>([]);
  const [currentTopicSeconds, setCurrentTopicSeconds] = useState<number>(0);

  // Overall session timers (in seconds)
  const [totalSessionSeconds, setTotalSessionSeconds] = useState<number>(0);
  const [isSessionPaused, setIsSessionPaused] = useState<boolean>(false);

  // Distraction Parking Lot
  const [isParkingLotOpen, setIsParkingLotOpen] = useState<boolean>(false);
  const [sessionParkedThoughts, setSessionParkedThoughts] = useState<ParkedThought[]>([]);

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

      if (isTopicReview) {
        setCurrentTopicSeconds((prev) => prev + 1);
      } else {
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
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, isSessionPaused, activeMode, isTopicReview]);

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
    if (newCompletedCount === config.targetGoal && !hasTriggeredGoalCelebration) {
      setHasTriggeredGoalCelebration(true);
      setScreenCelebrationFlash(true);
      soundManager.playCelebrationFanfare();
      triggerHaptic('celebrate');

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#10b981', '#6366f1', '#f59e0b', '#ec4899'],
        });
      } catch {
        // Safe fallback
      }

      setTimeout(() => {
        setScreenCelebrationFlash(false);
      }, 3000);
    }
  };

  // "Next Topic" handler (for Topic Review mode)
  const handleNextTopic = () => {
    if (isSessionPaused) return;

    soundManager.playDopamineChime();
    triggerHaptic('success');

    const newRecord: TopicRecord = {
      topicNumber: currentTopicNumber,
      timeSpent: currentTopicSeconds,
    };

    const nextCompleted = [...topicRecords, newRecord];
    setTopicRecords(nextCompleted);

    // Reset current topic timer and increment topic number
    setCurrentTopicSeconds(0);
    setCurrentTopicNumber((prev) => prev + 1);

    // Check celebration
    checkGoalCompletion(nextCompleted.length);
  };

  // "Done Solving" handler (for Solve Problems mode)
  const handleDoneSolving = () => {
    if (activeMode !== 'solving' || isSessionPaused) return;

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
    if (isSessionPaused) return;
    soundManager.playClick();
    triggerHaptic('light');

    if (activeMode === 'solving') {
      setActiveMode('stuck');
    } else if (activeMode === 'stuck') {
      setActiveMode('solving');
    }
  };

  // "Study Concept" toggle handler
  const handleToggleStudyConcept = () => {
    if (isSessionPaused) return;
    soundManager.playClick();
    triggerHaptic('light');

    if (activeMode === 'solving') {
      setActiveMode('study_concept');
    } else if (activeMode === 'study_concept') {
      setActiveMode('solving');
    }
  };

  // "Skip" problem handler (Contextual, visible during stuck / investigation)
  const handleSkipProblem = () => {
    if (isSessionPaused) return;
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

    setQuestionPureSeconds(0);
    setInvestigationSeconds(0);
    setStudyConceptSeconds(0);
    setCurrentQuestionNumber((prev) => prev + 1);
    setActiveMode('solving');
  };

  // Save thought to Distraction Parking Lot
  const handleSaveParkedThought = (thought: ParkedThought) => {
    saveParkedThought(thought);
    setSessionParkedThoughts((prev) => [thought, ...prev]);
  };

  // End Session Handler
  const handleConfirmEndSession = () => {
    setShowEndConfirm(false);
    setIsEndingSession(true);
    soundManager.playSessionEndSound();
    triggerHaptic('end_session');

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let report: SessionReport;

    if (isTopicReview) {
      // In topic review, include current in-progress topic if it had active seconds
      const finalTopics = [...topicRecords];
      if (currentTopicSeconds > 2) {
        finalTopics.push({
          topicNumber: currentTopicNumber,
          timeSpent: currentTopicSeconds,
        });
      }

      const totalTopicsStudied = finalTopics.length;
      const totalTopicSeconds = finalTopics.reduce((acc, t) => acc + t.timeSpent, 0);
      const avgTimePerTopic = totalTopicsStudied > 0 ? totalTopicSeconds / totalTopicsStudied : 0;

      report = {
        id: sessionIdRef.current,
        date: now.toISOString(),
        formattedDate,
        subject: config.subject,
        mode: 'topic_review',
        targetTopics: config.targetGoal,
        timeConstraintMinutes: config.timeConstraintMinutes,
        totalSessionTime: totalSessionSeconds,
        totalTopicsStudied,
        timePerTopic: avgTimePerTopic,
        topicDetails: finalTopics,
        parkedThoughts: sessionParkedThoughts,
      };
    } else {
      // Solve problems mode
      const solvedQuestions = completedRecords.filter((r) => r.status === 'solved');
      const totalSolved = solvedQuestions.length;
      const totalPureSolveSeconds = solvedQuestions.reduce((acc, q) => acc + q.pureSolveTime, 0);
      const avgPureTime = totalSolved > 0 ? totalPureSolveSeconds / totalSolved : 0;

      report = {
        id: sessionIdRef.current,
        date: now.toISOString(),
        formattedDate,
        subject: config.subject,
        mode: 'solve_problems',
        targetQuestions: config.targetGoal,
        timeConstraintMinutes: config.timeConstraintMinutes,
        totalSessionTime: totalSessionSeconds,
        totalProblemsSolved: totalSolved,
        pureTimePerProblem: avgPureTime,
        totalInvestigationTime: totalInvestigationAccumulated,
        totalStudyConceptTime: totalStudyAccumulated,
        skippedQuestions,
        questionDetails: completedRecords,
        parkedThoughts: sessionParkedThoughts,
      };
    }

    setTimeout(() => {
      onEndSession(report);
    }, 450);
  };

  const isModeStuckOrStudy = activeMode === 'stuck' || activeMode === 'study_concept';
  const areButtonsDisabled = isModeStuckOrStudy || isSessionPaused;

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // If parking lot modal is open, ignore global shortcuts
      if (isParkingLotOpen) return;

      // Start prompt shortcuts
      if (!hasStarted) {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartPractice();
        }
        return;
      }

      if (isEndingSession) return;

      // Modal handling
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

      // 1. D or d -> Open Distraction Parking Lot
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        soundManager.playClick();
        setIsParkingLotOpen(true);
        return;
      }

      // 2. Space -> "Done Solving" OR "Next Topic"
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (isTopicReview) {
          if (!isSessionPaused) {
            handleNextTopic();
          }
        } else {
          if (!areButtonsDisabled && activeMode === 'solving') {
            handleDoneSolving();
          }
        }
      }
      // 3. Enter -> "End Session"
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (!isModeStuckOrStudy && !isEndingSession) {
          soundManager.playClick();
          setShowEndConfirm(true);
        }
      }
      // 4. P or p -> Pause / Resume
      else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleTogglePause();
      }
      // 5. Shortcuts specific to Solve Problems mode:
      else if (!isTopicReview) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          if (activeMode !== 'study_concept' && !isSessionPaused) {
            handleToggleStuck();
          }
        } else if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          if (activeMode !== 'stuck' && !isSessionPaused) {
            handleToggleStudyConcept();
          }
        } else if ((e.key === 'k' || e.key === 'K') && activeMode === 'stuck') {
          e.preventDefault();
          handleSkipProblem();
        }
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
    isParkingLotOpen,
    areButtonsDisabled,
    activeMode,
    isSessionPaused,
    isTopicReview,
    currentTopicNumber,
    currentTopicSeconds,
    topicRecords,
    currentQuestionNumber,
    questionPureSeconds,
    investigationSeconds,
    studyConceptSeconds,
    completedRecords,
  ]);

  // Live average time calculation
  const liveAvgTopicTime = () => {
    if (topicRecords.length === 0) {
      return currentTopicSeconds > 0 ? formatMinutesText(currentTopicSeconds) : '0 minutes';
    }
    const totalRecorded = topicRecords.reduce((sum, t) => sum + t.timeSpent, 0);
    const avg = Math.round(totalRecorded / topicRecords.length);
    return formatMinutesText(avg);
  };

  // Progress metrics
  const completedCount = isTopicReview
    ? topicRecords.length
    : completedRecords.filter((r) => r.status === 'solved').length;
  const progressPercent = Math.min(100, Math.round((completedCount / config.targetGoal) * 100));

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
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
              {isTopicReview ? 'Topic Review' : 'Solve Problems'}
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
          <div
            className={`w-16 h-16 landscape:w-12 landscape:h-12 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
              isTopicReview
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-amber-500/10'
                : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-cyan-500/10'
            }`}
          >
            {isTopicReview ? (
              <BookOpen className="w-8 h-8 landscape:w-6 landscape:h-6" />
            ) : (
              <Play className="w-8 h-8 landscape:w-6 landscape:h-6 translate-x-0.5 fill-current" />
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl landscape:text-xl font-extrabold text-white tracking-tight">
              {isTopicReview ? `Ready for ${config.subject} Review?` : `Ready to Practice ${config.subject}?`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {isTopicReview
                ? `Reviewing ${config.targetGoal} topics. Timer starts immediately when you press Start.`
                : `Solving questions from your book. Timer starts immediately when you press Start.`}
            </p>
          </div>

          {/* Quick config badges */}
          <div className="flex items-center justify-center gap-3 pt-2 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {config.targetGoal} {isTopicReview ? 'Topics Planned' : 'Problems Planned'}
              </span>
            </span>

            {config.timeConstraintMinutes ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{config.timeConstraintMinutes} Min Limit</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Open-ended</span>
              </span>
            )}
          </div>

          {/* Keyboard tip hint */}
          <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-center gap-2">
            <span>Desktop shortcut:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
              Space
            </kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
              Enter
            </kbd>
            <span>to start</span>
          </div>
        </div>

        {/* Start Button */}
        <div className="pb-6 landscape:pb-2 max-w-md mx-auto w-full">
          <button
            onClick={handleStartPractice}
            className={`w-full h-14 rounded-2xl text-slate-950 font-extrabold text-base tracking-wide shadow-xl flex items-center justify-center gap-3 transition active:scale-[0.98] cursor-pointer ${
              isTopicReview
                ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/20'
                : 'bg-cyan-400 hover:bg-cyan-300 shadow-cyan-400/20'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START SESSION</span>
          </button>
        </div>
      </div>
    );
  }

  // Active Session Screen
  return (
    <div
      className={`min-h-[100dvh] landscape:min-h-0 landscape:h-[100dvh] flex flex-col justify-between p-3 sm:p-5 landscape:py-2.5 landscape:px-8 max-w-xl landscape:max-w-5xl lg:landscape:max-w-6xl mx-auto text-slate-100 transition-colors duration-500 relative select-none ${celebrationBg}`}
    >
      {/* Top Header Bar */}
      <header className="shrink-0 flex items-center justify-between py-1 landscape:py-1 border-b border-slate-800/60 pb-2.5 landscape:pb-1.5 gap-2">
        {/* Subject & Mode Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            {config.subject}
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
              isTopicReview
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {isTopicReview ? 'Topic Review' : 'Solve Problems'}
          </span>
        </div>

        {/* Center / Right Control Icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Distraction Parking Lot One-Tap Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              setIsParkingLotOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition active:scale-95 cursor-pointer"
            title="Park a stray thought or task (Press D)"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Park Thought</span>
            {sessionParkedThoughts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 font-tabular">
                {sessionParkedThoughts.length}
              </span>
            )}
            <kbd className="hidden md:inline px-1 py-0.2 rounded bg-amber-950/60 text-[9px] font-mono border border-amber-500/30">
              D
            </kbd>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Toggle sound"
          >
            {isSoundOn ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Pause / Resume Button in Header */}
          <button
            onClick={handleTogglePause}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              isSessionPaused
                ? 'bg-amber-400 text-slate-950 animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
            title="Pause Session (Press P)"
          >
            {isSessionPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSessionPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </header>

      {/* PAUSED BANNER */}
      {isSessionPaused && (
        <div className="shrink-0 my-1 py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Pause className="w-4 h-4 animate-bounce" />
            <span>SESSION PAUSED • Timer halted (not counted in total time)</span>
          </div>
          <button
            onClick={handleTogglePause}
            className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition"
          >
            Resume
          </button>
        </div>
      )}

      {/* Progress & Live Session Timers Bar */}
      <div className="shrink-0 space-y-1.5 landscape:space-y-1 pt-2 landscape:pt-1">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="font-tabular font-bold text-slate-200">
              {isTopicReview
                ? `Topic ${currentTopicNumber} of ${config.targetGoal}`
                : `Problem ${currentQuestionNumber} of ${config.targetGoal}`}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-tabular font-semibold">
              {completedCount} completed
            </span>
          </div>

          <div className="flex items-center gap-2 font-tabular">
            {timeRemainingSeconds !== null ? (
              <span className={`flex items-center gap-1 ${isTimeOver ? 'text-red-400 font-bold animate-pulse' : 'text-slate-300'}`}>
                <Clock className="w-3.5 h-3.5" />
                {isTimeOver ? 'Time Over: ' : 'Rem: '}
                {formatDigitalTimer(timeRemainingSeconds)}
              </span>
            ) : null}
            <span className="text-slate-400">Total: {formatDigitalTimer(totalSessionSeconds)}</span>
          </div>
        </div>

        {/* Progress Bar (thicker width for crisp visibility) */}
        <div className="h-2.5 sm:h-3 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isTopicReview
                ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300'
                : 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-indigo-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WORKSPACE AREA: Column in portrait, Side-by-Side 2-Column in landscape    */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col justify-between landscape:grid landscape:grid-cols-2 landscape:gap-10 lg:landscape:gap-14 landscape:items-center landscape:justify-center landscape:my-auto landscape:py-2">
        {/* LEFT COLUMN (Middle-Left in landscape): Q1 / T1 Display & Live Timer */}
        <main className="flex flex-col items-center justify-center py-4 landscape:py-0 space-y-3 landscape:space-y-3 text-center my-auto">
          {/* Label: CURRENT PROBLEM or CURRENT TOPIC */}
          <div className="space-y-1 text-center">
            <div className="text-xs sm:text-sm font-extrabold tracking-widest text-slate-400 uppercase">
              {isTopicReview ? 'CURRENT TOPIC' : 'CURRENT PROBLEM'}
            </div>

            {/* Giant Q or T indicator with generous padding and line-height */}
            <div
              className={`text-6xl sm:text-7xl md:text-8xl landscape:text-6xl lg:landscape:text-7xl font-black tracking-tight leading-none pt-1 pb-2 text-transparent bg-clip-text ${
                isTopicReview
                  ? 'bg-gradient-to-b from-white via-amber-100 to-amber-400 drop-shadow-[0_0_24px_rgba(251,191,36,0.3)]'
                  : activeMode === 'stuck'
                  ? 'bg-gradient-to-b from-white via-amber-100 to-amber-400 drop-shadow-[0_0_24px_rgba(251,191,36,0.3)]'
                  : activeMode === 'study_concept'
                  ? 'bg-gradient-to-b from-white via-indigo-100 to-indigo-400 drop-shadow-[0_0_24px_rgba(99,102,241,0.3)]'
                  : 'bg-gradient-to-b from-white via-cyan-100 to-cyan-400 drop-shadow-[0_0_24px_rgba(6,182,212,0.3)]'
              }`}
            >
              {isTopicReview ? `T${currentTopicNumber}` : `Q${currentQuestionNumber}`}
            </div>
          </div>

          {/* Live Timer Display */}
          <div className="text-center space-y-1.5">
            <div className="font-tabular text-4xl sm:text-5xl md:text-6xl landscape:text-5xl lg:landscape:text-6xl font-extrabold tracking-tight text-white">
              {formatDigitalTimer(isTopicReview ? currentTopicSeconds : questionPureSeconds)}
            </div>

            {/* Sub-label under timer */}
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
              {isTopicReview ? (
                <>
                  <span className="text-amber-400 font-medium">Topic Timer</span>
                  <span>•</span>
                  <span className="text-slate-300">Avg: {liveAvgTopicTime()}</span>
                </>
              ) : activeMode === 'stuck' ? (
                <span className="text-amber-400 flex items-center gap-1 font-medium">
                  <Search className="w-3.5 h-3.5" />
                  Investigation: {formatDigitalTimer(investigationSeconds)}
                </span>
              ) : activeMode === 'study_concept' ? (
                <span className="text-indigo-400 flex items-center gap-1 font-medium">
                  <BookOpen className="w-3.5 h-3.5" />
                  Concept: {formatDigitalTimer(studyConceptSeconds)}
                </span>
              ) : (
                <span className="text-cyan-400 font-medium">Pure Solve Time</span>
              )}
            </div>
          </div>
        </main>

        {/* RIGHT COLUMN (Middle-Right in landscape): Action Buttons with Breathing Room */}
        <footer className="shrink-0 space-y-2.5 pb-2 landscape:pb-0 landscape:w-full landscape:max-w-md landscape:mx-auto">
          {/* TOPIC REVIEW MODE CONTROLS */}
          {isTopicReview ? (
            <div className="space-y-2.5 landscape:space-y-3">
              {/* Primary Action Button: Next Topic */}
              <button
                onClick={handleNextTopic}
                disabled={isSessionPaused}
                className={`w-full h-14 landscape:h-13 rounded-2xl text-slate-950 font-extrabold text-base tracking-wide shadow-xl flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer ${
                  isSessionPaused
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/20 active:bg-amber-500'
                }`}
              >
                <FastForward className="w-5 h-5 fill-current" />
                <span>NEXT TOPIC (T{currentTopicNumber + 1})</span>
                <kbd className="hidden sm:inline ml-2 px-2 py-0.5 rounded bg-amber-950/20 text-slate-900 text-xs font-mono font-bold">
                  Space
                </kbd>
              </button>

              {/* Secondary Controls: Pause & End Session */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleTogglePause}
                  className="h-11 landscape:h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer border border-slate-700/60"
                >
                  {isSessionPaused ? <Play className="w-4 h-4 fill-current text-amber-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                  <span>{isSessionPaused ? 'Resume Timer' : 'Pause Timer'}</span>
                  <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400 font-mono">
                    P
                  </kbd>
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setShowEndConfirm(true);
                  }}
                  className="h-11 landscape:h-11 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>End Session</span>
                  <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-slate-900 text-[10px] text-slate-400 font-mono">
                    Enter
                  </kbd>
                </button>
              </div>
            </div>
          ) : (
            /* SOLVE PROBLEMS MODE CONTROLS */
            <div className="space-y-2.5 landscape:space-y-3">
              {/* Primary Action Button: "Done Solving" */}
              <button
                onClick={handleDoneSolving}
                disabled={areButtonsDisabled}
                className={`w-full h-14 landscape:h-13 rounded-2xl font-extrabold text-base tracking-wide shadow-xl flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer ${
                  areButtonsDisabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-400/20 active:bg-cyan-500'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>DONE SOLVING (Q{currentQuestionNumber})</span>
                <kbd className="hidden sm:inline ml-2 px-2 py-0.5 rounded bg-cyan-950/20 text-slate-900 text-xs font-mono font-bold">
                  Space
                </kbd>
              </button>

              {/* Contextual Skip Button during Stuck / Investigation */}
              {activeMode === 'stuck' && (
                <button
                  onClick={handleSkipProblem}
                  className="w-full h-11 landscape:h-10 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition animate-in fade-in cursor-pointer"
                >
                  <FastForward className="w-4 h-4" />
                  <span>Skip Problem Q{currentQuestionNumber} (Record as Skipped)</span>
                  <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-amber-950 text-[10px] text-amber-400 font-mono">
                    K
                  </kbd>
                </button>
              )}

              {/* Middle Row: "Stuck" and "Study Concept" */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Stuck / Investigation Button */}
                <button
                  onClick={handleToggleStuck}
                  disabled={activeMode === 'study_concept' || isSessionPaused}
                  className={`h-11 landscape:h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer border ${
                    activeMode === 'stuck'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20 animate-pulse'
                      : activeMode === 'study_concept' || isSessionPaused
                      ? 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
                      : 'bg-slate-850 hover:bg-slate-800 text-amber-300 border-amber-500/30 hover:border-amber-500/50'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>{activeMode === 'stuck' ? `Investigating ${formatDigitalTimer(investigationSeconds)}` : 'Stuck'}</span>
                  <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-slate-900/60 text-[10px] font-mono">
                    S
                  </kbd>
                </button>

                {/* Study Concept Button */}
                <button
                  onClick={handleToggleStudyConcept}
                  disabled={activeMode === 'stuck' || isSessionPaused}
                  className={`h-11 landscape:h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer border ${
                    activeMode === 'study_concept'
                      ? 'bg-indigo-400 text-slate-950 border-indigo-300 shadow-md shadow-indigo-400/20 animate-pulse'
                      : activeMode === 'stuck' || isSessionPaused
                      ? 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
                      : 'bg-slate-850 hover:bg-slate-800 text-indigo-300 border-indigo-500/30 hover:border-indigo-500/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {activeMode === 'study_concept'
                      ? `Studying ${formatDigitalTimer(studyConceptSeconds)}`
                      : 'Study Concept'}
                  </span>
                  <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-slate-900/60 text-[10px] font-mono">
                    C
                  </kbd>
                </button>
              </div>

              {/* Bottom Row: Pause & End Session */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleTogglePause}
                  className="h-10 landscape:h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700/60"
                >
                  {isSessionPaused ? <Play className="w-3.5 h-3.5 fill-current text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{isSessionPaused ? 'Resume' : 'Pause'}</span>
                  <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-slate-900 text-[10px] text-slate-400 font-mono">
                    P
                  </kbd>
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setShowEndConfirm(true);
                  }}
                  disabled={isModeStuckOrStudy}
                  className={`h-10 landscape:h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    isModeStuckOrStudy
                      ? 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed'
                      : 'bg-red-950/20 hover:bg-red-900/30 border-red-500/20 text-red-400'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>End Session</span>
                  <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-slate-900 text-[10px] text-slate-400 font-mono">
                    Enter
                  </kbd>
                </button>
              </div>
            </div>
          )}
        </footer>
      </div>

      {/* End Session Confirmation Dialog */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">End Session?</h3>
                <p className="text-xs text-slate-400">
                  {isTopicReview
                    ? `Save review report for ${topicRecords.length} completed topics?`
                    : `Generate your official study report for ${completedRecords.filter((q) => q.status === 'solved').length} solved questions?`}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Keep Going
              </button>
              <button
                onClick={handleConfirmEndSession}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/20 transition cursor-pointer"
              >
                End & View Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Tap Distraction Parking Lot Modal */}
      <ParkThoughtModal
        isOpen={isParkingLotOpen}
        subject={config.subject}
        mode={config.mode}
        sessionId={sessionIdRef.current}
        onClose={() => setIsParkingLotOpen(false)}
        onSaveThought={handleSaveParkedThought}
      />
    </div>
  );
};
