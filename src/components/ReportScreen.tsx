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
} from 'lucide-react';
import { SessionReport } from '../types';
import {
  formatHumanDuration,
  formatMinutesText,
  generateReportCopyText,
} from '../utils/formatters';
import { soundManager, triggerHaptic } from '../utils/audio';

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

  const handleCopy = () => {
    soundManager.playClick();
    triggerHaptic('success');
    const text = generateReportCopyText(report);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
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
  const solvedQuestions = report.questionDetails.filter((q) => q.status === 'solved');
  const fastestSolve = solvedQuestions.length > 0
    ? Math.min(...solvedQuestions.map((q) => q.pureSolveTime))
    : null;

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between py-6 px-4 sm:px-6 max-w-xl mx-auto text-slate-100 animate-in fade-in zoom-in-95 duration-300">
      {/* Top Banner / Completion Header */}
      <div className="text-center pt-2 pb-6 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <Award className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${accent.badge}`}>
              {report.subject}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {report.formattedDate}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Session Summary
          </h1>
        </div>
      </div>

      {/* Main Report Card (Strictly Matching User's Requested Output Format) */}
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
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
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

          {/* Formatted Text Presentation */}
          <div className="p-5 space-y-3.5 text-sm sm:text-base">
            <div className="text-white font-semibold flex items-baseline gap-2">
              <span className="text-cyan-400">⚡</span>
              <span>
                Studied {report.subject} for{' '}
                <strong className="text-cyan-300 font-bold font-tabular">
                  {formatHumanDuration(report.totalSessionTime)}
                </strong>
                .
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-800/80 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Total Problems solved:
                </span>
                <span className="font-bold text-white font-tabular text-base">
                  {report.totalProblemsSolved}
                  {report.targetQuestions > 0 && (
                    <span className="text-xs text-slate-500 font-normal ml-1">
                      (Goal: {report.targetQuestions})
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                  Time per problem:
                </span>
                <span className="font-bold text-cyan-300 font-tabular text-base">
                  {report.totalProblemsSolved > 0
                    ? formatMinutesText(Math.round(report.pureTimePerProblem))
                    : '0 minutes'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-400 shrink-0" />
                  Total time on Investigation:
                </span>
                <span className="font-semibold text-amber-300 font-tabular">
                  {formatMinutesText(report.totalInvestigationTime)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  Total time on Studying concept:
                </span>
                <span className="font-semibold text-indigo-300 font-tabular">
                  {formatMinutesText(report.totalStudyConceptTime)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-2">
                  <FastForward className="w-4 h-4 text-slate-400 shrink-0" />
                  Skipped Questions:
                </span>
                <span className="font-semibold text-slate-300 font-tabular">
                  {report.skippedQuestions && report.skippedQuestions.length > 0
                    ? report.skippedQuestions.map((q) => `Q${q}`).join(', ')
                    : 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Question Breakdown Dropdown */}
        {report.questionDetails && report.questionDetails.length > 0 && (
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Question-by-Question Solve Breakdown</span>
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
            </button>

            {showDetails && (
              <div className="p-4 pt-0 border-t border-slate-800 space-y-2 animate-in fade-in">
                {fastestSolve !== null && (
                  <div className="text-[11px] text-emerald-400 pb-1">
                    ⚡ Fastest solve: {formatMinutesText(Math.round(fastestSolve))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {report.questionDetails.map((q) => (
                    <div
                      key={q.questionNumber}
                      className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                        q.status === 'solved'
                          ? 'bg-slate-800/40 border-slate-700/80 text-slate-200'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>Q{q.questionNumber}</span>
                        <span className="text-[10px] font-normal uppercase opacity-75">
                          {q.status}
                        </span>
                      </div>
                      <div className="mt-1 font-tabular font-medium text-cyan-300">
                        {formatMinutesText(Math.round(q.pureSolveTime))}
                      </div>
                      {(q.stuckTime > 0 || q.studyConceptTime > 0) && (
                        <div className="text-[10px] text-slate-400 mt-1 space-x-1 font-tabular">
                          {q.stuckTime > 0 && <span>Stuck: {q.stuckTime}s</span>}
                          {q.studyConceptTime > 0 && <span>Study: {q.studyConceptTime}s</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Home Button */}
      <div className="pt-6 pb-2 shrink-0">
        <button
          onClick={() => {
            soundManager.playClick();
            onReturnHome();
          }}
          className="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white font-extrabold text-sm tracking-wide shadow-xl active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5 text-cyan-400" />
          <span>RETURN TO HOME</span>
        </button>
      </div>
    </div>
  );
};
