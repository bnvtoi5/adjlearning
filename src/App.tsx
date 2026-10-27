/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Layers, Play, BookOpen, CheckCircle2 } from 'lucide-react';
import {
  COLLOCATIONS,
  MasteryStatus,
  PrepositionCategory,
} from './data/collocations';
import {
  calculateOverallStats,
  FilterCriteria,
  filterCollocations,
  mergeSyncProgress,
  ProgressMap,
} from './utils/studyLogic';
import { BrowseView } from './components/BrowseView';
import { DecksView } from './components/DecksView';
import { QuizView } from './components/QuizView';
import { GrammarView } from './components/GrammarView';
import { SyncModal } from './components/SyncModal';

type ActiveTab = 'browse' | 'decks' | 'quiz' | 'grammar';

const STORAGE_PROGRESS_KEY = 'prepmaster_local_progress_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('browse');
  const [selectedDeckForStudy, setSelectedDeckForStudy] = useState<string | null>(
    null
  );
  const [selectedDeckForQuiz, setSelectedDeckForQuiz] = useState<string | null>(
    null
  );
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  const [progress, setProgress] = useState<ProgressMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROGRESS_KEY);
      if (saved) {
        return JSON.parse(saved) as ProgressMap;
      }
    } catch {
      // ignore storage errors
    }
    return {};
  });

  const [criteria, setCriteria] = useState<FilterCriteria>({
    preposition: 'ALL',
    statusFilter: 'all',
    searchQuery: '',
    toSubFilter: 'all',
  });

  // Save progress locally in localStorage immediately (100% isolated per student device)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage errors
    }
  }, [progress]);

  const handleUpdateStatus = (id: string, status: MasteryStatus) => {
    setProgress((prev) => {
      const prevEntry = prev[id];
      return {
        ...prev,
        [id]: {
          status,
          updatedAt: Date.now(),
          reviewCount: (prevEntry?.reviewCount || 0) + 1,
        },
      };
    });
  };

  const handleChangeCriteria = (next: Partial<FilterCriteria>) => {
    setCriteria((prev) => ({ ...prev, ...next }));
  };

  const handleImportProgress = (imported: ProgressMap) => {
    setProgress((prev) => mergeSyncProgress(prev, imported));
  };

  const handleResetProgress = () => {
    setProgress({});
    try {
      localStorage.removeItem(STORAGE_PROGRESS_KEY);
    } catch {
      // ignore
    }
  };

  const filteredItems = useMemo(
    () => filterCollocations(COLLOCATIONS, progress, criteria),
    [progress, criteria]
  );

  const stats = useMemo(
    () => calculateOverallStats(COLLOCATIONS, progress),
    [progress]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-12">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('browse');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          PrepMaster
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          aria-label="Điều hướng chính"
        >
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'browse'
                ? 'text-slate-900 border-sky-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Tra cứu
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDeckForStudy(null);
              setActiveTab('decks');
            }}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'decks'
                ? 'text-slate-900 border-sky-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Phân bộ học
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'quiz'
                ? 'text-slate-900 border-sky-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Trắc nghiệm
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grammar')}
            className={`py-1 whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'grammar'
                ? 'text-slate-900 border-sky-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Ngữ pháp
          </button>
        </nav>

        {/* Zone 3: 1 primary action (Local Progress & Backup/Sync) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsSyncOpen(true)}
            className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Đã thuộc {stats.mastered}/196</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-8 pt-3.5 sm:pt-6">
        {activeTab === 'browse' && (
          <BrowseView
            items={filteredItems}
            totalCount={COLLOCATIONS.length}
            masteredCount={stats.mastered}
            progress={progress}
            criteria={criteria}
            onChangeCriteria={handleChangeCriteria}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'decks' && (
          <DecksView
            key={selectedDeckForStudy || 'decks-root'}
            progress={progress}
            initialDeckId={selectedDeckForStudy}
            onUpdateStatus={handleUpdateStatus}
            onLaunchQuizForDeck={(deckId) => {
              setSelectedDeckForQuiz(deckId);
              setActiveTab('quiz');
            }}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizView
            key={selectedDeckForQuiz || 'quiz-root'}
            progress={progress}
            initialDeckId={selectedDeckForQuiz}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'grammar' && (
          <GrammarView
            onJumpToSearch={(keyword) => {
              setCriteria({
                preposition: 'ALL',
                statusFilter: 'all',
                searchQuery: keyword,
                toSubFilter: 'all',
              });
              setActiveTab('browse');
            }}
            onJumpToPreposition={(prep: PrepositionCategory) => {
              setCriteria({
                preposition: prep,
                statusFilter: 'all',
                searchQuery: '',
                toSubFilter: 'all',
              });
              setActiveTab('browse');
            }}
          />
        )}
      </main>

      {/* Quiet Footer on Desktop */}
      <footer className="hidden md:flex max-w-7xl w-full mx-auto px-8 pt-8 pb-4 text-xs text-slate-500 items-center justify-between gap-2">
        <div>
          PrepMaster — Học liệu chuẩn hóa 196 cụm Tính từ + Giới từ (Lưu trữ độc lập trên từng thiết bị).
        </div>
        <div>
          Đã thuộc {stats.mastered}/196 cụm ({stats.percentMastered}%)
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation Bar (56px height = 6.6% of 844px viewport) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 items-center"
        aria-label="Điều hướng di động"
      >
        <button
          type="button"
          onClick={() => setActiveTab('browse')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'browse' ? 'text-sky-600 font-semibold' : 'text-slate-600'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[11px] whitespace-nowrap">Tra cứu</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDeckForStudy(null);
            setActiveTab('decks');
          }}
          className={`h-full flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'decks' ? 'text-sky-600 font-semibold' : 'text-slate-600'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[11px] whitespace-nowrap">Phân bộ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'quiz' ? 'text-sky-600 font-semibold' : 'text-slate-600'
          }`}
        >
          <Play className="w-5 h-5" />
          <span className="text-[11px] whitespace-nowrap">Trắc nghiệm</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grammar')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 ${
            activeTab === 'grammar' ? 'text-sky-600 font-semibold' : 'text-slate-600'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[11px] whitespace-nowrap">Ngữ pháp</span>
        </button>
      </nav>

      {/* Local Progress & Transfer Modal */}
      <SyncModal
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        progress={progress}
        masteredCount={stats.mastered}
        learningCount={stats.learning}
        onImportProgress={handleImportProgress}
        onResetProgress={handleResetProgress}
      />
    </div>
  );
}
