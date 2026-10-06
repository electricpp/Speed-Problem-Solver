import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Play,
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

  // Launch the session
  const handleStartPractice = () => {
    soundManager.playClick();
    triggerHaptic('success');
    setHasStarted(true);
    setActiveMode('solving');
  };

  // Main 1-second ticker
  useEffect(() => {
    if (!hasStarted) return;

    timerRef.current = window.setInterval(() => {
      // Total session time always increments while active
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
  }, [hasStarted, activeMode]);

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

  // Progress metrics
  const solvedCount = completedRecords.filter((r) => r.status === 'solved').length;
  const progressPercent = Math.min(100, Math.round((solvedCount / config.targetQuestions) * 100));

  // Time remaining calculation if constraint set
  const timeLimitSeconds = config.timeConstraintMinutes ? config.timeConstraintMinutes * 60 : null;
  const timeRemainingSeconds = timeLimitSeconds !== null ? Math.max(0, timeLimitSeconds - totalSessionSeconds) : null;
  const isTimeOver = timeLimitSeconds !== null && totalSessionSeconds >= timeLimitSeconds;

  const isModeStuckOrStudy = activeMode === 'stuck' || activeMode === 'study_concept';

  // Screen background flash if goal reached
  const celebrationBg = screenCelebrationFlash
    ? 'bg-gradient-to-b from-cyan-950 via-[#0a1828] to-[#090d16]'
    : 'bg-[#090d16]';

  // Ready / Start Screen before user begins solving
  if (!hasStarted) {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-between p-4 sm:p-6 max-w-xl mx-auto text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between py-2">
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
        <div className="text-center py-12 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg shadow-cyan-500/10">
            <Play className="w-10 h-10 translate-x-0.5 fill-current" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ready to Practice {config.subject}?
            </h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Solving questions from your book. Timer starts immediately when you press Start.
            </p>
          </div>

          {/* Config Summary Card */}
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto p-4 rounded-xl bg-slate-900 border border-slate-800 text-left">
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                Target Goal
              </div>
              <div className="text-lg font-bold text-white mt-1 font-tabular">
                {config.targetQuestions} Problems
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Time Limit
              </div>
              <div className="text-lg font-bold text-white mt-1 font-tabular">
                {config.timeConstraintMinutes ? `${config.timeConstraintMinutes} Min` : 'Open-ended'}
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pb-6">
          <button
            onClick={handleStartPractice}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-base tracking-wide shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START SESSION</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] flex flex-col justify-between transition-colors duration-500 ${celebrationBg}`}>
      {/* Top Section: Progress & Session Timing */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-3 pb-2 space-y-3 shrink-0">
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

          {/* Timers Cluster */}
          <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-tabular">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 font-semibold">{formatDigitalTimer(totalSessionSeconds)}</span>
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

        {/* Progress Bar Container */}
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

          <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                solvedCount >= config.targetQuestions
                  ? 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-300'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${Math.min(100, (solvedCount / config.targetQuestions) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Center Stage: Question Index & Live Timers */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 text-center max-w-xl mx-auto w-full select-none">
        {/* Active Mode Notification Banner */}
        {activeMode === 'stuck' && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <Search className="w-4 h-4 shrink-0 animate-bounce" />
            <span>Investigating problem... Other buttons paused.</span>
          </div>
        )}

        {activeMode === 'study_concept' && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <BookOpen className="w-4 h-4 shrink-0 animate-bounce" />
            <span>Studying concept / formulas... Other buttons paused.</span>
          </div>
        )}

        {/* Giant Question Display with clear anti-overlap spacing */}
        <div className="relative py-2 sm:py-4 flex flex-col items-center">
          {/* Label placed above Q to completely prevent any descender collision from Exo 2 font */}
          <div className="mb-3 px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] sm:text-xs uppercase tracking-widest text-slate-300 font-semibold shadow-sm">
            Current Problem
          </div>

          <div
            className={`text-7xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none pb-6 sm:pb-8 transition-all duration-200 select-none ${
              activeMode === 'solving'
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
        <div className="mt-4 flex flex-col items-center">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Time on this question:</span>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold font-tabular tracking-wider ${
              activeMode === 'solving' ? 'text-cyan-300' : 'text-slate-500 line-through opacity-60'
            }`}
          >
            {formatDigitalTimer(questionPureSeconds)}
          </div>
        </div>

        {/* Secondary timers summary for this question (if any stuck or study was spent) */}
        {(investigationSeconds > 0 || studyConceptSeconds > 0) && (
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 font-tabular">
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

      {/* Bottom Area: Controls & Buttons */}
      <div className="w-full max-w-xl mx-auto px-4 pb-6 sm:pb-8 pt-2 space-y-3 shrink-0">
        {/* Contextual "Skip" button (Only visible when Stuck / Investigating) */}
        {activeMode === 'stuck' && (
          <div className="animate-in slide-in-from-bottom-2 duration-150">
            <button
              onClick={handleSkipProblem}
              className="w-full h-12 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-sm tracking-wide transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <FastForward className="w-4 h-4" />
              <span>Skip Problem (Log as Skipped & Next Q)</span>
            </button>
          </div>
        )}

        {/* Primary Action Button: "Done Solving" */}
        <button
          onClick={handleDoneSolving}
          disabled={isModeStuckOrStudy}
          className={`w-full h-16 rounded-2xl font-black text-lg tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 shadow-xl ${
            isModeStuckOrStudy
              ? 'bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed shadow-none'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 active:scale-[0.98] cursor-pointer'
          }`}
        >
          <CheckCircle2 className={`w-6 h-6 ${isModeStuckOrStudy ? 'text-slate-600' : 'text-slate-950'}`} />
          <span>DONE SOLVING</span>
        </button>

        {/* Middle Dual Mode Buttons: "Stuck" & "Study Concept" */}
        <div className="grid grid-cols-2 gap-3">
          {/* Button 2: Stuck / Investigating */}
          <button
            onClick={handleToggleStuck}
            disabled={activeMode === 'study_concept'}
            className={`h-14 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-150 flex items-center justify-center gap-1.5 px-2 ${
              activeMode === 'study_concept'
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
          </button>

          {/* Button 3: Study Concept */}
          <button
            onClick={handleToggleStudyConcept}
            disabled={activeMode === 'stuck'}
            className={`h-14 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all duration-150 flex items-center justify-center gap-1.5 px-2 ${
              activeMode === 'stuck'
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
          </button>
        </div>

        {/* Button 4: End Session */}
        <button
          onClick={() => {
            soundManager.playClick();
            setShowEndConfirm(true);
          }}
          disabled={isModeStuckOrStudy}
          className={`w-full h-11 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 ${
            isModeStuckOrStudy
              ? 'bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 active:scale-95 cursor-pointer'
          }`}
        >
          <LogOut className="w-4 h-4" />
          <span>End Session</span>
        </button>
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
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wide transition cursor-pointer"
              >
                Yes, End Session & View Report
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
              >
                Continue Solving
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
