import React, { useState, useEffect } from 'react';
import {
  Zap,
  Atom,
  FlaskConical,
  Binary,
  History,
  Volume2,
  VolumeX,
  Target,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { Subject, SessionConfig, SessionReport } from './types';
import {
  loadHistory,
  saveSessionToHistory,
  deleteSessionFromHistory,
  clearAllHistory,
  calculateSummaryStats,
} from './utils/storage';
import { soundManager, triggerHaptic } from './utils/audio';
import { formatMinutesText, formatHumanDuration } from './utils/formatters';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SetupModal } from './components/SetupModal';
import { HistoryModal } from './components/HistoryModal';
import { PracticeScreen } from './components/PracticeScreen';
import { ReportScreen } from './components/ReportScreen';

type AppView = 'home' | 'practice' | 'report';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [activeConfig, setActiveConfig] = useState<SessionConfig | null>(null);
  const [currentReport, setCurrentReport] = useState<SessionReport | null>(null);
  const [history, setHistory] = useState<SessionReport[]>([]);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(soundManager.isEnabled());

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleToggleSound = () => {
    const next = soundManager.toggleSound();
    setIsSoundOn(next);
  };

  const handleSelectSubject = (subject: Subject) => {
    soundManager.playClick();
    triggerHaptic('light');
    setSelectedSubject(subject);
    setIsSetupOpen(true);
  };

  const handleStartSession = (config: SessionConfig) => {
    setActiveConfig(config);
    setIsSetupOpen(false);
    setView('practice');
  };

  const handleEndSession = (report: SessionReport) => {
    // Save report to localStorage immediately
    const updated = saveSessionToHistory(report);
    setHistory(updated);
    setCurrentReport(report);
    setView('report');
  };

  const handleReturnHome = () => {
    setSelectedSubject(null);
    setActiveConfig(null);
    setCurrentReport(null);
    setView('home');
  };

  const handleDeleteSession = (id: string) => {
    const updated = deleteSessionFromHistory(id);
    setHistory(updated);
  };

  const handleClearAllHistory = () => {
    clearAllHistory();
    setHistory([]);
  };

  const stats = calculateSummaryStats(history);

  // Subject Card Definitions
  const subjects: {
    id: Subject;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    borderHover: string;
    accentBg: string;
    accentText: string;
  }[] = [
    {
      id: 'Physics',
      name: 'Physics',
      description: 'Mechanics, Electromagnetism, Thermodynamics, Modern Physics',
      icon: <Atom className="w-8 h-8 text-cyan-400" />,
      color: 'from-cyan-500/20 via-cyan-950/20 to-slate-900',
      borderHover: 'hover:border-cyan-500/50 group-hover:border-cyan-500/60',
      accentBg: 'bg-cyan-500/10 border-cyan-500/30',
      accentText: 'text-cyan-400',
    },
    {
      id: 'Chemistry',
      name: 'Chemistry',
      description: 'Physical, Organic, Inorganic, Reaction Kinetics & Stoichiometry',
      icon: <FlaskConical className="w-8 h-8 text-emerald-400" />,
      color: 'from-emerald-500/20 via-emerald-950/20 to-slate-900',
      borderHover: 'hover:border-emerald-500/50 group-hover:border-emerald-500/60',
      accentBg: 'bg-emerald-500/10 border-emerald-500/30',
      accentText: 'text-emerald-400',
    },
    {
      id: 'Math',
      name: 'Math',
      description: 'Calculus, Algebra, Coordinate Geometry, Vectors & Probabilities',
      icon: <Binary className="w-8 h-8 text-indigo-400" />,
      color: 'from-indigo-500/20 via-indigo-950/20 to-slate-900',
      borderHover: 'hover:border-indigo-500/50 group-hover:border-indigo-500/60',
      accentBg: 'bg-indigo-500/10 border-indigo-500/30',
      accentText: 'text-indigo-400',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* View Router */}
      {view === 'practice' && activeConfig ? (
        <PracticeScreen
          config={activeConfig}
          onEndSession={handleEndSession}
          onCancelToHome={handleReturnHome}
        />
      ) : view === 'report' && currentReport ? (
        <ReportScreen
          report={currentReport}
          onReturnHome={handleReturnHome}
        />
      ) : (
        /* HOME SCREEN */
        <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
          {/* Top Bar Navigation */}
          <header className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            {/* Brand Zone */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
                <Zap className="w-5 h-5 fill-current text-slate-950" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  VELOCITY
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase block -mt-1">
                  Speed Problem Solver
                </span>
              </div>
            </div>

            {/* Actions Zone */}
            <div className="flex items-center gap-2">
              <PWAInstallButton />

              <button
                onClick={handleToggleSound}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                title={isSoundOn ? 'Mute sound effects' : 'Enable sound effects'}
                aria-label="Toggle sound"
              >
                {isSoundOn ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  triggerHaptic('light');
                  setIsHistoryOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition cursor-pointer"
                title="View past study sessions"
              >
                <History className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">History</span>
                {history.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-tabular">
                    {history.length}
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* Hero & Focus Prompt */}
          <main className="py-6 sm:py-8 space-y-6 sm:space-y-8 flex-1 flex flex-col justify-center">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Speed Training Mode</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                What are you solving today?
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Train yourself to solve problems faster. Track your solving velocity, investigation time, and concept reviews.
              </p>
            </div>

            {/* Subject Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 max-w-3xl mx-auto w-full">
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSelectSubject(sub.id)}
                  className={`group relative rounded-2xl p-5 sm:p-6 text-left border border-slate-800 bg-gradient-to-b ${sub.color} transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] cursor-pointer flex flex-col justify-between min-h-[170px] ${sub.borderHover}`}
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-slate-900/80 shadow-md">
                      {sub.icon}
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight flex items-center justify-between">
                        <span>{sub.name}</span>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition" />
                      </h2>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {sub.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 mt-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 group-hover:text-white transition">
                      Start Practice
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-mono ${sub.accentBg} ${sub.accentText}`}>
                      SPEED
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Lifetime Velocity Stats Card */}
            {history.length > 0 && (
              <div className="max-w-3xl mx-auto w-full p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    Lifetime Training Stats
                  </span>
                  <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer"
                  >
                    View History →
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                  <div>
                    <div className="text-[11px] text-slate-400">Problems Solved</div>
                    <div className="text-lg sm:text-xl font-extrabold text-white font-tabular mt-0.5">
                      {stats.totalProblemsSolved}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-400">Avg Pure Speed</div>
                    <div className="text-lg sm:text-xl font-extrabold text-cyan-300 font-tabular mt-0.5">
                      {stats.totalProblemsSolved > 0
                        ? formatMinutesText(Math.round(stats.avgPureTime))
                        : '0m'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-400">Total Practice Time</div>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-200 font-tabular mt-0.5">
                      {formatHumanDuration(stats.totalSeconds)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
            <p>
              Designed for Speed Problem Solving · Physics · Chemistry · Math · Universal Exo 2 Font
            </p>
          </footer>
        </div>
      )}

      {/* Setup Modal */}
      <SetupModal
        subject={selectedSubject}
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onStartSession={handleStartSession}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAllHistory}
        onImportHistory={(updated) => setHistory(updated)}
      />
    </div>
  );
}
