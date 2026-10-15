import React, { useState } from 'react';
import {
  Copy,
  Check,
  Home,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  FastForward,
  TrendingUp,
  Share2,
  Award,
  ChevronDown,
  Brain,
  Circle,
  Layers,
} from 'lucide-react';
import { SessionReport, ParkedThought } from '../types';
import {
  formatHumanDuration,
  formatMinutesText,
  generateReportCopyText,
} from '../utils/formatters';
import { soundManager, triggerHaptic } from '../utils/audio';
import { updateParkedThoughtStatus } from '../utils/storage';

interface ReportScreenProps {
  report: SessionReport;
  onReturnHome: () => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({
  report,
  onReturnHome,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [parkedThoughts, setParkedThoughts] = useState<ParkedThought[]>(
    report.parkedThoughts || []
  );

  const isTopicReview = report.mode === 'topic_review';

  const handleCopy = () => {
    soundManager.playClick();
    triggerHaptic('success');
    const text = generateReportCopyText({
      ...report,
      parkedThoughts,
    });
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleToggleThought = (id: string, currentStatus: boolean) => {
    soundManager.playClick();
    triggerHaptic('light');
    const nextStatus = !currentStatus;
    updateParkedThoughtStatus(id, nextStatus);
    setParkedThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isHandled: nextStatus } : t))
    );
  };

  const handleMarkAllHandled = () => {
    soundManager.playClick();
    triggerHaptic('success');
    parkedThoughts.forEach((t) => {
      updateParkedThoughtStatus(t.id, true);
    });
    setParkedThoughts((prev) => prev.map((t) => ({ ...t, isHandled: true })));
  };

  const getSubjectAccent = (subj: string) => {
    switch (subj) {
      case 'Physics':
        return {
          textColor: 'text-cyan-400',
          badge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          border: 'border-cyan-500/20',
          gradient: 'from-cyan-500/10 via-transparent to-transparent',
        };
      case 'Chemistry':
        return {
          textColor: 'text-emerald-400',
          badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          border: 'border-emerald-500/20',
          gradient: 'from-emerald-500/10 via-transparent to-transparent',
        };
      case 'Math':
        return {
          textColor: 'text-indigo-400',
          badge: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          border: 'border-indigo-500/20',
          gradient: 'from-indigo-500/10 via-transparent to-transparent',
        };
      default:
        return {
          textColor: 'text-slate-300',
          badge: 'bg-slate-800 border-slate-700 text-slate-300',
          border: 'border-slate-800',
          gradient: 'from-slate-800/10 to-transparent',
        };
    }
  };

  const accent = getSubjectAccent(report.subject);

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between py-6 px-4 sm:px-6 max-w-xl mx-auto text-slate-100 animate-in fade-in zoom-in-95 duration-300">
      {/* Top Banner / Completion Header */}
      <div className="text-center pt-2 pb-5 space-y-3">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
            isTopicReview
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-amber-500/10'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
          }`}
        >
          {isTopicReview ? <BookOpen className="w-7 h-7" /> : <Award className="w-7 h-7" />}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${accent.badge}`}>
              {report.subject}
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                isTopicReview
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {isTopicReview ? 'Topic Review' : 'Solve Problems'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {report.formattedDate}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isTopicReview ? 'Topic Review Summary' : 'Session Summary'}
          </h1>
        </div>
      </div>

      {/* Main Report Card */}
      <div className="space-y-4 flex-1">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          {/* Card Header with Copy Action */}
          <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 tracking-wide">
              Official Study Report
            </span>

            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}
              title="Copy formatted summary to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
          </div>

          {/* Formatted Content */}
          <div className="p-5 font-mono text-xs sm:text-sm text-slate-200 space-y-2 bg-slate-950/40">
            {isTopicReview ? (
              // TOPIC REVIEW FORMAT
              <>
                <p className="text-white font-medium">
                  Reviewed {report.subject} (Topic Review) for{' '}
                  <span className="text-amber-400 font-bold font-sans">
                    {formatHumanDuration(report.totalSessionTime)}
                  </span>
                  .
                </p>
                <div className="pt-2 space-y-1.5 border-t border-slate-800/80 text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>Total Topics studied:</span>
                    <span className="text-white font-bold font-sans">
                      {report.totalTopicsStudied ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Time per topic:</span>
                    <span className="text-amber-300 font-bold font-sans">
                      {report.timePerTopic !== undefined
                        ? formatMinutesText(Math.round(report.timePerTopic))
                        : '0 minutes'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              // SOLVE PROBLEMS FORMAT
              <>
                <p className="text-white font-medium">
                  Studied {report.subject} for{' '}
                  <span className="text-cyan-400 font-bold font-sans">
                    {formatHumanDuration(report.totalSessionTime)}
                  </span>
                  .
                </p>
                <div className="pt-2 space-y-1.5 border-t border-slate-800/80 text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>Total Problems solved:</span>
                    <span className="text-white font-bold font-sans">
                      {report.totalProblemsSolved ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Time per problem:</span>
                    <span className="text-cyan-300 font-bold font-sans">
                      {report.totalProblemsSolved && report.pureTimePerProblem !== undefined
                        ? formatMinutesText(Math.round(report.pureTimePerProblem))
                        : '0 minutes'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total time on Investigation:</span>
                    <span className="text-amber-300 font-bold font-sans">
                      {formatMinutesText(report.totalInvestigationTime ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total time on Studying concept:</span>
                    <span className="text-indigo-300 font-bold font-sans">
                      {formatMinutesText(report.totalStudyConceptTime ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Skipped Questions:</span>
                    <span className="text-slate-400 font-bold font-sans">
                      {report.skippedQuestions && report.skippedQuestions.length > 0
                        ? report.skippedQuestions.map((q) => `Q${q}`).join(', ')
                        : 'None'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detailed Breakdown Toggle (Questions or Topics) */}
        {((isTopicReview && report.topicDetails && report.topicDetails.length > 0) ||
          (!isTopicReview && report.questionDetails && report.questionDetails.length > 0)) && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>
                  {isTopicReview
                    ? `Topic Log (${report.topicDetails?.length || 0} topics)`
                    : `Question-by-Question Breakdown (${report.questionDetails?.length || 0} questions)`}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>

            {showDetails && (
              <div className="pt-2 border-t border-slate-800 space-y-2 animate-in fade-in">
                {isTopicReview ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {report.topicDetails?.map((t) => (
                      <div
                        key={t.topicNumber}
                        className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex items-center justify-between font-tabular"
                      >
                        <span className="font-bold text-amber-300">T{t.topicNumber}</span>
                        <span className="text-white font-medium">{formatMinutesText(Math.round(t.timeSpent))}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {report.questionDetails?.map((q) => (
                      <div
                        key={q.questionNumber}
                        className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs flex items-center justify-between font-tabular"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              q.status === 'solved'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            }`}
                          >
                            Q{q.questionNumber}
                          </span>
                          <span className="text-slate-300">
                            {q.status === 'solved' ? 'Solved' : 'Skipped'} in {formatMinutesText(Math.round(q.pureSolveTime))}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          {q.stuckTime > 0 && <span className="text-amber-400">Stuck: {formatMinutesText(q.stuckTime)}</span>}
                          {q.studyConceptTime > 0 && <span className="text-indigo-400">Concept: {formatMinutesText(q.studyConceptTime)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DISTRACTION PARKING LOT SECTION: Parked thoughts during this session */}
        {parkedThoughts.length > 0 && (
          <div className="rounded-2xl bg-slate-900 border border-amber-500/30 p-4 space-y-3 shadow-lg shadow-amber-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Parked Thoughts from this session</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      {parkedThoughts.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Mark handled now or leave them for later in Home Screen</p>
                </div>
              </div>

              {parkedThoughts.some((t) => !t.isHandled) && (
                <button
                  onClick={handleMarkAllHandled}
                  className="text-[11px] text-amber-300 hover:text-white px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  Mark All Handled
                </button>
              )}
            </div>

            <div className="space-y-2 pt-1">
              {parkedThoughts.map((thought) => (
                <div
                  key={thought.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                    thought.isHandled
                      ? 'bg-slate-900/50 border-slate-800 text-slate-500'
                      : 'bg-slate-850/80 border-slate-700/80 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleThought(thought.id, thought.isHandled)}
                      className="cursor-pointer shrink-0"
                    >
                      {thought.isHandled ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500 hover:text-amber-400" />
                      )}
                    </button>
                    <span className={`break-words ${thought.isHandled ? 'line-through' : ''}`}>
                      {thought.text}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {thought.timestampFormatted}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Return to Home CTA */}
      <div className="pt-6">
        <button
          onClick={() => {
            soundManager.playClick();
            triggerHaptic('light');
            onReturnHome();
          }}
          className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to Home</span>
        </button>
      </div>
    </div>
  );
};
