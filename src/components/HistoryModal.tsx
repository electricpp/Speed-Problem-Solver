import React, { useState, useRef } from 'react';
import {
  X,
  Trash2,
  Calendar,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  ChevronRight,
  Activity,
  BookOpen,
  Search,
  Download,
  Upload,
  CheckCircle2,
  FileJson,
  Layers,
  Zap,
  Brain,
} from 'lucide-react';
import { SessionReport } from '../types';
import { formatHumanDuration, formatMinutesText, generateReportCopyText } from '../utils/formatters';
import { triggerHaptic, soundManager } from '../utils/audio';
import { exportHistoryToFile, importHistoryFromFile } from '../utils/storage';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionReport[];
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  onImportHistory?: (updated: SessionReport[]) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onDeleteSession,
  onClearAll,
  onImportHistory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | 'solve_problems' | 'topic_review'>('all');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    if (modeFilter === 'solve_problems') return item.mode !== 'topic_review';
    if (modeFilter === 'topic_review') return item.mode === 'topic_review';
    return true;
  });

  const handleCopy = (report: SessionReport) => {
    soundManager.playClick();
    triggerHaptic('light');
    const text = generateReportCopyText(report);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleExport = () => {
    soundManager.playClick();
    triggerHaptic('success');
    exportHistoryToFile(history);
  };

  const handleImportClick = () => {
    soundManager.playClick();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importHistoryFromFile(file);
      if (result.success) {
        soundManager.playDopamineChime();
        triggerHaptic('success');
        setImportStatus({ type: 'success', message: result.message || 'History imported successfully!' });
        if (onImportHistory) {
          onImportHistory(result.updated);
        }
      } else {
        triggerHaptic('warning');
        setImportStatus({ type: 'error', message: result.message || 'Failed to import JSON file.' });
      }
    } catch {
      triggerHaptic('warning');
      setImportStatus({ type: 'error', message: 'Failed to process the uploaded file.' });
    }

    if (e.target) {
      e.target.value = '';
    }
    setTimeout(() => setImportStatus(null), 4000);
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

  const topicCount = history.filter((h) => h.mode === 'topic_review').length;
  const problemCount = history.filter((h) => h.mode !== 'topic_review').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Hidden file input for JSON import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          className="hidden"
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Session History</h2>
              <p className="text-xs text-slate-400">{history.length} saved {history.length === 1 ? 'session' : 'sessions'}</p>
            </div>
          </div>

          {/* Action Tools: Export, Import, Clear */}
          <div className="flex items-center flex-wrap gap-1.5 self-end sm:self-auto">
            {/* Export JSON Button */}
            <button
              onClick={handleExport}
              disabled={history.length === 0}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                history.length === 0
                  ? 'border-slate-800 bg-slate-800/40 text-slate-600 cursor-not-allowed'
                  : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
              }`}
              title="Export all session history as a JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export (.json)</span>
            </button>

            {/* Import JSON Button */}
            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 text-xs font-semibold transition cursor-pointer"
              title="Upload and restore a history JSON file"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>

            {/* Clear History Button */}
            {history.length > 0 && !showClearConfirm && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowClearConfirm(true);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                title="Clear all stored sessions"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Filter Bar */}
        <div className="px-5 py-2.5 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400">Filter:</span>
          <button
            onClick={() => setModeFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              modeFilter === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setModeFilter('solve_problems')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
              modeFilter === 'solve_problems'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Problem Solving ({problemCount})</span>
          </button>
          <button
            onClick={() => setModeFilter('topic_review')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
              modeFilter === 'topic_review'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Topic Reviews ({topicCount})</span>
          </button>
        </div>

        {/* Import Status Toast Banner */}
        {importStatus && (
          <div
            className={`px-4 py-2.5 border-b text-xs flex items-center gap-2 animate-in fade-in ${
              importStatus.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                : 'bg-red-950/40 border-red-800 text-red-200'
            }`}
          >
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

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
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No sessions match filter</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Completed speed study and topic review sessions will automatically be tracked and saved here.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isExpanded = expandedId === item.id;
              const isTopic = item.mode === 'topic_review';
              const hasSkipped = item.skippedQuestions && item.skippedQuestions.length > 0;
              const hasThoughts = item.parkedThoughts && item.parkedThoughts.length > 0;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border transition-all p-3.5 sm:p-4 ${
                    isTopic
                      ? 'bg-amber-950/10 border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700/80'
                  }`}
                >
                  {/* Top row: Subject, Mode badge, Date, Copy & Delete */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getSubjectColor(item.subject)}`}>
                        {item.subject}
                      </span>

                      {/* Distinct mode badge with different color */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          isTopic
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {isTopic ? 'Topic Review' : 'Solve Problems'}
                      </span>

                      <span className="text-xs text-slate-400 font-mono">
                        {item.formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
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

                  {/* METRICS ROW */}
                  {isTopic ? (
                    // TOPIC REVIEW METRICS: strictly "total topic studied, session length and time/topic only"
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-amber-500/20 text-xs">
                      <div>
                        <div className="text-[11px] text-slate-400">Total Topics Studied</div>
                        <div className="font-semibold text-white font-tabular text-sm">
                          {item.totalTopicsStudied ?? 0}
                          {item.targetTopics ? (
                            <span className="text-slate-500 text-xs font-normal"> / {item.targetTopics}</span>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] text-slate-400">Session Length</div>
                        <div className="font-semibold text-slate-200 font-tabular text-sm">
                          {formatHumanDuration(item.totalSessionTime)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] text-slate-400">Time / Topic</div>
                        <div className="font-semibold text-amber-300 font-tabular text-sm">
                          {item.timePerTopic !== undefined
                            ? formatMinutesText(Math.round(item.timePerTopic))
                            : '0 minutes'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // SOLVE PROBLEMS METRICS
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-xs">
                      <div>
                        <div className="text-[11px] text-slate-400">Total Solved</div>
                        <div className="font-semibold text-white font-tabular text-sm">
                          {item.totalProblemsSolved ?? 0}
                          {item.targetQuestions ? (
                            <span className="text-slate-500 text-xs font-normal"> / {item.targetQuestions}</span>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Time / Problem</div>
                        <div className="font-semibold text-cyan-300 font-tabular text-sm">
                          {item.pureTimePerProblem !== undefined
                            ? formatMinutesText(Math.round(item.pureTimePerProblem))
                            : '0 minutes'}
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
                          {hasSkipped ? item.skippedQuestions!.map((q) => `Q${q}`).join(', ') : 'None'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Toggle more details */}
                  <div className="mt-2 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      <span>{isExpanded ? 'Hide breakdown' : isTopic ? 'View topic log' : 'View stuck & study breakdown'}</span>
                    </button>

                    {hasThoughts && (
                      <span className="flex items-center gap-1 text-amber-400/90">
                        <Brain className="w-3 h-3" />
                        <span>{item.parkedThoughts!.length} parked thought{item.parkedThoughts!.length === 1 ? '' : 's'}</span>
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs animate-in fade-in">
                      {isTopic ? (
                        // Topic Review Details
                        item.topicDetails && item.topicDetails.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="font-medium text-slate-300">Topic Breakdown:</div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto">
                              {item.topicDetails.map((t) => (
                                <span
                                  key={t.topicNumber}
                                  className="px-2 py-1 rounded text-[11px] font-tabular bg-amber-500/10 text-amber-200 border border-amber-500/20 flex justify-between"
                                >
                                  <span className="font-bold">T{t.topicNumber}</span>
                                  <span>{formatMinutesText(Math.round(t.timeSpent))}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      ) : (
                        // Solve Problems Details
                        <>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <Search className="w-3.5 h-3.5" />
                              Investigation Time:
                            </span>
                            <span className="font-tabular font-medium text-white">
                              {formatMinutesText(item.totalInvestigationTime ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-1.5 text-indigo-400">
                              <BookOpen className="w-3.5 h-3.5" />
                              Study Concept Time:
                            </span>
                            <span className="font-tabular font-medium text-white">
                              {formatMinutesText(item.totalStudyConceptTime ?? 0)}
                            </span>
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
                        </>
                      )}

                      {/* Parked Thoughts associated with this session */}
                      {hasThoughts && (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                          <div className="font-medium text-amber-300 flex items-center gap-1">
                            <Brain className="w-3 h-3" />
                            <span>Parked Thoughts during this session:</span>
                          </div>
                          <div className="space-y-1 pl-2">
                            {item.parkedThoughts!.map((thought) => (
                              <div key={thought.id} className="text-slate-300 flex items-center gap-1.5">
                                <span className="text-amber-400">•</span>
                                <span className="font-mono text-[10px] text-slate-500">[{thought.timestampFormatted}]</span>
                                <span>{thought.text}</span>
                              </div>
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
      </div>
    </div>
  );
};
