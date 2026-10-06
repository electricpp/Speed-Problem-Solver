import React, { useState } from 'react';
import { X, Target, Clock, ArrowRight, Zap, Sparkles } from 'lucide-react';
import { Subject, SessionConfig } from '../types';
import { soundManager, triggerHaptic } from '../utils/audio';

interface SetupModalProps {
  subject: Subject | null;
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (config: SessionConfig) => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  subject,
  isOpen,
  onClose,
  onStartSession,
}) => {
  const [targetQuestions, setTargetQuestions] = useState<number>(10);
  const [timeConstraintMinutes, setTimeConstraintMinutes] = useState<string>('');

  if (!isOpen || !subject) return null;

  const quickGoalPresets = [5, 10, 15, 20, 25, 30];
  const quickTimePresets = [15, 30, 45, 60];

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    triggerHaptic('success');

    const target = Math.max(1, targetQuestions || 10);
    const parsedTime = timeConstraintMinutes.trim() ? parseInt(timeConstraintMinutes, 10) : null;
    const validTime = parsedTime && parsedTime > 0 ? parsedTime : null;

    onStartSession({
      subject,
      targetQuestions: target,
      timeConstraintMinutes: validTime,
    });
  };

  const getSubjectTheme = (sub: Subject) => {
    switch (sub) {
      case 'Physics':
        return {
          titleColor: 'text-cyan-400',
          badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          ctaGradient: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500',
          glow: 'shadow-cyan-500/20',
        };
      case 'Chemistry':
        return {
          titleColor: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          ctaGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500',
          glow: 'shadow-emerald-500/20',
        };
      case 'Math':
        return {
          titleColor: 'text-indigo-400',
          badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          ctaGradient: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500',
          glow: 'shadow-indigo-500/20',
        };
    }
  };

  const theme = getSubjectTheme(subject);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${theme.badgeBg}`}>
              {subject}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Configure Session</h2>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleStart} className="p-5 space-y-6">
          {/* Target Questions Input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="target-input" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Target Problems</span>
              </label>
              <span className="text-xs text-slate-400">Questions planned</span>
            </div>

            <div className="relative">
              <input
                id="target-input"
                type="number"
                min="1"
                max="999"
                value={targetQuestions}
                onChange={(e) => setTargetQuestions(parseInt(e.target.value) || 1)}
                className="w-full h-12 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white px-4 text-base font-semibold font-tabular outline-none transition"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                Problems
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickGoalPresets.map((qty) => (
                <button
                  type="button"
                  key={qty}
                  onClick={() => {
                    soundManager.playClick();
                    triggerHaptic('light');
                    setTargetQuestions(qty);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    targetQuestions === qty
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {qty} Qs
                </button>
              ))}
            </div>
          </div>

          {/* Optional Time Constraint Input */}
          <div className="space-y-2.5 pt-1 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <label htmlFor="time-input" className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Time Constraint <span className="text-slate-500 font-normal">(Optional)</span></span>
              </label>
              <span className="text-xs text-slate-400">Target duration</span>
            </div>

            <div className="relative">
              <input
                id="time-input"
                type="number"
                min="1"
                max="999"
                placeholder="No limit (Open-ended)"
                value={timeConstraintMinutes}
                onChange={(e) => setTimeConstraintMinutes(e.target.value)}
                className="w-full h-12 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 px-4 text-sm font-semibold font-tabular outline-none transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                Minutes
              </span>
            </div>

            {/* Quick Time Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickTimePresets.map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => {
                    soundManager.playClick();
                    triggerHaptic('light');
                    setTimeConstraintMinutes(String(mins));
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    timeConstraintMinutes === String(mins)
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {mins} min
                </button>
              ))}
              {timeConstraintMinutes && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    setTimeConstraintMinutes('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition"
                >
                  Clear Limit
                </button>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              className={`w-full h-12 rounded-xl text-white font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${theme.ctaGradient} ${theme.glow}`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Start Solving</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
