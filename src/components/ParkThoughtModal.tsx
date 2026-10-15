import React, { useState, useEffect, useRef } from 'react';
import { Brain, X, Check, ArrowRight } from 'lucide-react';
import { Subject, SessionMode, ParkedThought } from '../types';
import { soundManager, triggerHaptic } from '../utils/audio';

interface ParkThoughtModalProps {
  isOpen: boolean;
  subject: Subject;
  mode: SessionMode;
  sessionId: string;
  onClose: () => void;
  onSaveThought: (thought: ParkedThought) => void;
}

export const ParkThoughtModal: React.FC<ParkThoughtModalProps> = ({
  isOpen,
  subject,
  mode,
  sessionId,
  onClose,
  onSaveThought,
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setText('');
      // Quick focus on open
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      onClose();
      return;
    }

    soundManager.playThoughtParked();
    triggerHaptic('light');

    const now = new Date();
    const timestampFormatted = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const newThought: ParkedThought = {
      id: `thought_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sessionId,
      subject,
      sessionMode: mode,
      text: trimmed,
      createdAt: now.toISOString(),
      timestampFormatted,
      isHandled: false,
    };

    onSaveThought(newThought);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Distraction Parking Lot</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Quick Park
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Offload your thought & return instantly to focus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="parking-thought-input" className="text-xs font-semibold text-slate-300">
              What's on your mind?
            </label>
            <div className="relative">
              <input
                id="parking-thought-input"
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Check formula 4B, reply to message, buy notebook..."
                className="w-full h-12 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 px-4 text-sm font-medium outline-none transition"
                autoComplete="off"
              />
            </div>
            <p className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>Saved with timestamp for post-session review</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">Press Enter ↵</kbd>
            </p>
          </div>

          {/* Quick preset triggers */}
          <div className="flex flex-wrap gap-1.5">
            {['Check later', 'Look up concept', 'To-do item', 'Unrelated idea'].map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => {
                  setText((prev) => (prev ? `${prev} (${tag})` : `${tag}: `));
                  inputRef.current?.focus();
                }}
                className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={!text.trim()}
              className={`flex-1 h-11 rounded-xl text-slate-950 font-bold text-xs tracking-wide shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${
                text.trim()
                  ? 'bg-amber-400 hover:bg-amber-300 shadow-amber-400/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Park & Return to Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-11 rounded-xl text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
