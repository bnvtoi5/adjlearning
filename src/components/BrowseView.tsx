import React from 'react';
import { Volume2, CheckCircle2, Clock, Circle, Sparkles, Search, X } from 'lucide-react';
import {
  CollocationItem,
  MasteryStatus,
  PREPOSITION_META,
} from '../data/collocations';
import { FilterCriteria, getItemStatus, ProgressMap } from '../utils/studyLogic';

interface BrowseViewProps {
  items: CollocationItem[];
  totalCount: number;
  masteredCount: number;
  progress: ProgressMap;
  criteria: FilterCriteria;
  onChangeCriteria: (next: Partial<FilterCriteria>) => void;
  onUpdateStatus: (id: string, status: MasteryStatus) => void;
}

export const BrowseView: React.FC<BrowseViewProps> = ({
  items,
  totalCount,
  masteredCount,
  progress,
  criteria,
  onChangeCriteria,
  onUpdateStatus,
}) => {
  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const activePrepMeta =
    criteria.preposition !== 'ALL'
      ? PREPOSITION_META.find((m) => m.key === criteria.preposition)
      : undefined;

  return (
    <section className="space-y-4" aria-label="Tra cứu và phân loại cụm từ">
      {/* Compact Control Deck: Search + 1-Tap Preposition Grid + Status Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Tra Cứu & Phân Loại
          </h1>
          <div className="text-xs text-slate-500 font-mono tabular-nums shrink-0">
            <span>Hiện {items.length}/{totalCount}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Thuộc {masteredCount}</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <label htmlFor="collocation-search" className="sr-only">
            Tìm kiếm tính từ, giới từ hoặc nghĩa tiếng Việt
          </label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="collocation-search"
            type="search"
            value={criteria.searchQuery}
            onChange={(e) => onChangeCriteria({ searchQuery: e.target.value })}
            placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt (VD: famous, dị ứng...)"
            className="w-full min-h-[44px] pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 transition-colors"
          />
          {criteria.searchQuery && (
            <button
              type="button"
              onClick={() => onChangeCriteria({ searchQuery: '' })}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tight 1-Tap Preposition Grid (4 cols on mobile, 11 cols on desktop) */}
        <div
          className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5"
          role="group"
          aria-label="Lọc theo giới từ"
        >
          <button
            type="button"
            onClick={() => onChangeCriteria({ preposition: 'ALL', toSubFilter: 'all' })}
            className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors flex flex-col items-center justify-center whitespace-nowrap shrink-0 border ${
              criteria.preposition === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>TẤT CẢ</span>
            <span className="text-[10px] opacity-80 font-mono tabular-nums">196</span>
          </button>

          {PREPOSITION_META.map((meta) => {
            const active = criteria.preposition === meta.key;
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() =>
                  onChangeCriteria({
                    preposition: active ? 'ALL' : meta.key,
                    toSubFilter: 'all',
                  })
                }
                className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors flex flex-col items-center justify-center whitespace-nowrap shrink-0 border ${
                  active
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-80 font-mono tabular-nums">
                  {meta.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-filter when TO is active */}
        {criteria.preposition === 'TO' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Tất cả TO (26)' },
              { id: 'prep', label: 'Giới từ TO + N/V-ing (20)' },
              { id: 'infinitive', label: 'To-V nguyên mẫu (6)' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() =>
                  onChangeCriteria({
                    toSubFilter: sub.id as 'all' | 'prep' | 'infinitive',
                  })
                }
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  (criteria.toSubFilter || 'all') === sub.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Compact 4-State Status Filter */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div
            className="grid grid-cols-4 gap-1.5 w-full sm:w-auto"
            role="group"
            aria-label="Lọc theo trạng thái thuộc bài"
          >
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'unlearned', label: 'Chưa học' },
              { id: 'learning', label: 'Đang ôn' },
              { id: 'mastered', label: 'Đã thuộc' },
            ].map((tab) => {
              const active = criteria.statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    onChangeCriteria({
                      statusFilter: tab.id as FilterCriteria['statusFilter'],
                    })
                  }
                  className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 text-center ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {(criteria.preposition !== 'ALL' ||
            criteria.statusFilter !== 'all' ||
            criteria.searchQuery !== '') && (
            <button
              type="button"
              onClick={() =>
                onChangeCriteria({
                  preposition: 'ALL',
                  statusFilter: 'all',
                  searchQuery: '',
                  toSubFilter: 'all',
                })
              }
              className="hidden sm:inline-block text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Bỏ lọc
            </button>
          )}
        </div>

        {/* Quiet 1-line meaning summary when a preposition is selected */}
        {activePrepMeta && (
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between gap-2">
            <p className="truncate">
              <strong className="text-slate-900 font-mono">{activePrepMeta.label}:</strong>{' '}
              {activePrepMeta.coreIdea}
            </p>
          </div>
        )}
      </div>

      {/* Results Grid */}
      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            Không có cụm từ nào khớp với bộ lọc hiện tại.
          </p>
          <button
            type="button"
            onClick={() =>
              onChangeCriteria({
                preposition: 'ALL',
                statusFilter: 'all',
                searchQuery: '',
                toSubFilter: 'all',
              })
            }
            className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Xem tất cả 196 cụm từ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {items.map((item) => {
            const status = getItemStatus(progress, item.id);
            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2">
                  {/* Top row: Phrase + Meaning + Audio */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-mono font-semibold text-slate-700">
                          {item.preposition}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.structureType || 'Adj + Prep + N/V-ing'}</span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                        {item.phrase}
                      </h2>
                      <p className="text-sm font-medium text-sky-700">
                        {item.meaningVi}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => speakText(`${item.phrase}. ${item.example}`)}
                      aria-label={`Nghe phát âm ${item.phrase}`}
                      className="min-h-[40px] min-w-[40px] -mr-1 -mt-1 flex items-center justify-center rounded-xl text-slate-500 hover:text-sky-600 hover:bg-slate-50 transition-colors shrink-0"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Example Sentence + Chunk */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      “{item.example}”
                    </p>
                    <p className="text-xs text-slate-500">
                      <span>Cụm nhớ: </span>
                      <span className="font-mono font-medium text-slate-800">
                        {item.chunkHighlight}
                      </span>
                    </p>
                  </div>

                  {item.confusingNote && (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2 text-xs text-amber-900 flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>{item.confusingNote}</span>
                    </div>
                  )}
                </div>

                {/* 1-Tap Mastery Selector Footer */}
                <div
                  className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100"
                  role="group"
                  aria-label={`Đánh dấu mức độ thuộc cho ${item.phrase}`}
                >
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(item.id, 'unlearned')}
                    className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                      status === 'unlearned'
                        ? 'bg-slate-200 text-slate-900 font-semibold'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Circle className="w-3.5 h-3.5 shrink-0" />
                    <span>Chưa học</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateStatus(item.id, 'learning')}
                    className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                      status === 'learning'
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Đang ôn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateStatus(item.id, 'mastered')}
                    className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                      status === 'mastered'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Đã thuộc</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
