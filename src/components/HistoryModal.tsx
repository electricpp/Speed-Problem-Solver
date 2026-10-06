import React, { useState } from 'react';
import { X, Trash2, Calendar, Clock, Copy, Check, AlertTriangle, ChevronRight, Activity, BookOpen, Search } from 'lucide-react';
import { SessionReport } from '../types';
import { formatHumanDuration, formatMinutesText, generateReportCopyText } from '../utils/formatters';
import { triggerHaptic, soundManager } from '../utils/audio';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionReport[];
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onDeleteSession,
  onClearAll,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (report: SessionReport) => {
    soundManager.playClick();
    triggerHaptic('light');
    const text = generateReportCopyText(report);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const getSubjectColor = (subj: string) => {
    switch (subj) {
      case 'Physics':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'Chemistry':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Math':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Session History</h2>
              <p className="text-xs text-slate-400">{history.length} saved {history.length === 1 ? 'session' : 'sessions'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && !showClearConfirm && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowClearConfirm(true);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                title="Clear all stored sessions"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear History</span>
              </button>
            )}

            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clear Confirmation Warning */}
        {showClearConfirm && (
          <div className="bg-red-950/40 border-b border-red-900/50 p-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Are you sure you want to delete all saved study sessions? This cannot be undone.</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  triggerHaptic('warning');
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition"
              >
                Delete All
              </button>
            </div>
          </div>
        )}

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No session history yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Completed speed study sessions will automatically be tracked and saved here with complete analytics.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isExpanded = expandedId === item.id;
              const hasSkipped = item.skippedQuestions && item.skippedQuestions.length > 0;

              return (
                <div
                  key={item.id}
                  className="rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-all p-3.5 sm:p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getSubjectColor(item.subject)}`}>
                        {item.subject}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {item.formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                        title="Copy report to clipboard"
                        aria-label="Copy report"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          onDeleteSession(item.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Delete session"
                        aria-label="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* High level metrics row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-400">Total Solved</div>
                      <div className="font-semibold text-white font-tabular text-sm">
                        {item.totalProblemsSolved}
                        {item.targetQuestions ? (
                          <span className="text-slate-500 text-xs font-normal"> / {item.targetQuestions}</span>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Time / Problem</div>
                      <div className="font-semibold text-cyan-300 font-tabular text-sm">
                        {formatMinutesText(Math.round(item.pureTimePerProblem))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Session Length</div>
                      <div className="font-semibold text-slate-200 font-tabular text-sm">
                        {formatHumanDuration(item.totalSessionTime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Skipped</div>
                      <div className="font-semibold text-slate-300 font-tabular text-sm">
                        {hasSkipped ? item.skippedQuestions.map(q => `Q${q}`).join(', ') : 'None'}
                      </div>
                    </div>
                  </div>

                  {/* Toggle more details */}
                  <div className="mt-2 pt-2 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      <span>{isExpanded ? 'Hide investigation breakdown' : 'View stuck & study breakdown'}</span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <Search className="w-3.5 h-3.5" />
                          Investigation Time:
                        </span>
                        <span className="font-tabular font-medium text-white">{formatMinutesText(item.totalInvestigationTime)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <BookOpen className="w-3.5 h-3.5" />
                          Study Concept Time:
                        </span>
                        <span className="font-tabular font-medium text-white">{formatMinutesText(item.totalStudyConceptTime)}</span>
                      </div>
                      {item.questionDetails && item.questionDetails.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                          <div className="font-medium text-slate-300">Question Log:</div>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {item.questionDetails.map((q) => (
                              <span
                                key={q.questionNumber}
                                className={`px-2 py-0.5 rounded text-[10px] font-tabular border ${
                                  q.status === 'solved'
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                }`}
                              >
                                Q{q.questionNumber}: {formatMinutesText(Math.round(q.pureSolveTime))}
                                {q.status === 'skipped' ? ' (Skipped)' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/90 text-right shrink-0">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
