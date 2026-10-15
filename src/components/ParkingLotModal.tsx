import React, { useState } from 'react';
import {
  Brain,
  X,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  Clock,
  Sparkles,
  Filter,
} from 'lucide-react';
import { ParkedThought } from '../types';
import { soundManager, triggerHaptic } from '../utils/audio';

interface ParkingLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  thoughts: ParkedThought[];
  onToggleStatus: (id: string, isHandled: boolean) => void;
  onDeleteThought: (id: string) => void;
  onClearHandled: () => void;
  onAddManualThought?: (text: string) => void;
}

export const ParkingLotModal: React.FC<ParkingLotModalProps> = ({
  isOpen,
  onClose,
  thoughts,
  onToggleStatus,
  onDeleteThought,
  onClearHandled,
  onAddManualThought,
}) => {
  const [filter, setFilter] = useState<'pending' | 'handled' | 'all'>('pending');
  const [newText, setNewText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const pendingCount = thoughts.filter((t) => !t.isHandled).length;
  const handledCount = thoughts.filter((t) => t.isHandled).length;

  const filteredThoughts = thoughts.filter((t) => {
    if (filter === 'pending') return !t.isHandled;
    if (filter === 'handled') return t.isHandled;
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !onAddManualThought) return;
    soundManager.playThoughtParked();
    triggerHaptic('light');
    onAddManualThought(newText.trim());
    setNewText('');
    setShowAddForm(false);
  };

  const getSubjectColor = (subj: string) => {
    switch (subj) {
      case 'Physics':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'Chemistry':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Math':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Distraction Parking Lot
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-tabular">
                    {pendingCount} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Thoughts & tasks parked during study sessions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {handledCount > 0 && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  triggerHaptic('light');
                  onClearHandled();
                }}
                className="text-[11px] text-slate-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
              >
                Clear Handled
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

        {/* Filter Bar & Quick Add */}
        <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === 'pending'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('handled')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === 'handled'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Handled ({handledCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({thoughts.length})
            </button>
          </div>

          {onAddManualThought && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Note</span>
            </button>
          )}
        </div>

        {/* Quick Add Form Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="p-3 bg-slate-950/70 border-b border-amber-500/20 flex items-center gap-2 animate-in fade-in"
          >
            <input
              type="text"
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Add a thought or reminder..."
              className="flex-1 h-9 rounded-lg bg-slate-900 border border-slate-700 px-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={!newText.trim()}
              className="px-3 h-9 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewText('');
              }}
              className="px-2.5 h-9 rounded-lg text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </form>
        )}

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredThoughts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto mb-3">
                <Brain className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">
                {filter === 'pending'
                  ? 'No pending distractions'
                  : filter === 'handled'
                  ? 'No handled thoughts yet'
                  : 'Parking lot is empty'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Whenever a random thought pops up during study, tap "Park Thought" or press D to offload it instantly.
              </p>
            </div>
          ) : (
            filteredThoughts.map((thought) => (
              <div
                key={thought.id}
                className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                  thought.isHandled
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-70'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Status Toggle Checkbox */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    triggerHaptic('light');
                    onToggleStatus(thought.id, !thought.isHandled);
                  }}
                  className="mt-0.5 text-slate-400 hover:text-amber-400 transition cursor-pointer shrink-0"
                  aria-label={thought.isHandled ? 'Mark as pending' : 'Mark as handled'}
                >
                  {thought.isHandled ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-500 hover:text-amber-400" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium break-words ${
                      thought.isHandled ? 'line-through text-slate-500' : 'text-slate-100'
                    }`}
                  >
                    {thought.text}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${getSubjectColor(
                        thought.subject
                      )}`}
                    >
                      {thought.subject}
                    </span>

                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700/60 font-medium">
                      {thought.sessionMode === 'topic_review' ? 'Topic Review' : 'Solve Problems'}
                    </span>

                    <span className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                      <Clock className="w-3 h-3" />
                      {thought.timestampFormatted}
                    </span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onDeleteThought(thought.id);
                  }}
                  className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer shrink-0"
                  title="Delete thought"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
