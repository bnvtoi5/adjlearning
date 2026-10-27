import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  RotateCcw,
  Volume2,
  Play,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { MasteryStatus } from '../data/collocations';
import {
  buildStudyDecks,
  getItemStatus,
  ProgressMap,
  StudyDeckInfo,
} from '../utils/studyLogic';

interface DecksViewProps {
  progress: ProgressMap;
  initialDeckId?: string | null;
  onUpdateStatus: (id: string, status: MasteryStatus) => void;
  onLaunchQuizForDeck: (deckId: string) => void;
}

export const DecksView: React.FC<DecksViewProps> = ({
  progress,
  initialDeckId,
  onUpdateStatus,
  onLaunchQuizForDeck,
}) => {
  const decks = buildStudyDecks(undefined, progress);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(
    initialDeckId || null
  );
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeDeck: StudyDeckInfo | undefined = selectedDeckId
    ? decks.find((d) => d.id === selectedDeckId)
    : undefined;

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCardIndex(0);
    setIsFlipped(false);
  };

  if (activeDeck && activeDeck.items.length > 0) {
    const safeIndex = Math.min(cardIndex, activeDeck.items.length - 1);
    const currentCard = activeDeck.items[safeIndex];
    const currentStatus = getItemStatus(progress, currentCard.id);

    const handleRateAndAdvance = (status: MasteryStatus) => {
      onUpdateStatus(currentCard.id, status);
      setIsFlipped(false);
      if (safeIndex + 1 < activeDeck.items.length) {
        setCardIndex(safeIndex + 1);
      } else {
        setCardIndex(0);
      }
    };

    return (
      <section className="space-y-4" aria-label={`Học bộ thẻ ${activeDeck.title}`}>
        {/* Interactive Flashcard Stage + List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left / Main Flashcard (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 min-h-[380px]">
            {/* Clean 1-Line Top Status Bar (No multi-line wrapping) */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {activeDeck.title}
                </h1>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap shrink-0">
                  Thẻ {safeIndex + 1}/{activeDeck.items.length}
                </span>
                <span className="hidden sm:inline text-slate-300" aria-hidden="true">·</span>
                <span className="hidden sm:inline text-xs font-mono text-emerald-700 tabular-nums whitespace-nowrap shrink-0">
                  Thuộc {activeDeck.masteredCount}/{activeDeck.totalCount}
                </span>
              </div>

              <button
                type="button"
                onClick={() => speakText(`${currentCard.phrase}. ${currentCard.example}`)}
                aria-label={`Nghe phát âm ${currentCard.phrase}`}
                className="min-h-[38px] px-3 py-1 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <Volume2 className="w-4 h-4" />
                <span>Phát âm</span>
              </button>
            </div>

            {/* Center Tap-to-Flip Area */}
            <div className="my-5 text-center space-y-3">
              <div className="text-xs text-slate-500">
                <span>Nhóm {currentCard.preposition}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>
                  {currentStatus === 'mastered'
                    ? 'Đã thuộc'
                    : currentStatus === 'learning'
                    ? 'Đang ôn'
                    : 'Chưa học'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                {currentCard.phrase}
              </h2>

              {!isFlipped ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs sm:text-sm text-slate-500">
                    Nhẩm nghĩa tiếng Việt trước khi lật thẻ
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsFlipped(true)}
                    className="min-h-[46px] px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Chạm để lật xem nghĩa & ví dụ</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1 max-w-xl mx-auto">
                  <p className="text-lg sm:text-xl font-bold text-sky-700">
                    {currentCard.meaningVi}
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-1.5">
                    <p className="text-sm text-slate-900 font-medium">
                      “{currentCard.example}”
                    </p>
                    <p className="text-xs text-slate-600">
                      <span>Cụm nhớ (Chunk): </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {currentCard.chunkHighlight}
                      </span>
                    </p>
                    {currentCard.confusingNote && (
                      <p className="text-xs text-amber-800 pt-1 border-t border-slate-200">
                        Lưu ý: {currentCard.confusingNote}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Thumb-Zone Controls (Placed right above the Mobile Nav for easy thumb reach) */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              {/* Row 1: 3 Mastery Rating Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleRateAndAdvance('unlearned')}
                  className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <span>Chưa nhớ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateAndAdvance('learning')}
                  className="min-h-[44px] px-2.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Đang ôn</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateAndAdvance('mastered')}
                  className="min-h-[44px] px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Đã thuộc</span>
                </button>
              </div>

              {/* Row 2: Ergonomic 3-Column Bottom Bar (Back to Decks | Prev Card | Next Card) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDeckId(null)}
                  className="min-h-[42px] px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Đổi bộ khác</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFlipped(false);
                    setCardIndex((prev) =>
                      prev > 0 ? prev - 1 : activeDeck.items.length - 1
                    );
                  }}
                  className="min-h-[42px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span>Thẻ trước</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFlipped(false);
                    setCardIndex((prev) =>
                      prev + 1 < activeDeck.items.length ? prev + 1 : 0
                    );
                  }}
                  className="min-h-[42px] px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <span>Thẻ tiếp</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Deck Word List Jumper (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Danh sách từ trong bộ ({activeDeck.items.length} cụm)
              </h3>
              <span className="text-xs font-mono text-emerald-700 tabular-nums">
                Đã thuộc {activeDeck.masteredCount}/{activeDeck.totalCount}
              </span>
            </div>

            <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 pr-1">
              {activeDeck.items.map((item, idx) => {
                const st = getItemStatus(progress, item.id);
                const isCurrent = idx === safeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCardIndex(idx);
                      setIsFlipped(false);
                    }}
                    className={`w-full min-h-[42px] px-2.5 py-2 text-left flex items-center justify-between gap-2 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-sky-50 text-sky-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <span className="text-xs font-mono text-slate-400 mr-1.5 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-slate-900">
                        {item.phrase}
                      </span>
                      <span className="text-xs text-slate-500 ml-1.5">
                        — {item.meaningVi}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium shrink-0 text-slate-500">
                      {st === 'mastered'
                        ? '✓ Thuộc'
                        : st === 'learning'
                        ? 'Đang ôn'
                        : 'Chưa học'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label="Phân bộ học theo giới từ">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
            Phân Bộ Học Theo 10 Nhóm Giới Từ
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Chọn một nhóm giới từ để lật thẻ Flashcard hoặc làm Trắc nghiệm.
          </p>
        </div>
      </div>

      {/* Grid of 10 Preposition Decks + 1 Personal Review Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {decks.map((deck) => {
          const pct =
            deck.totalCount > 0
              ? Math.round((deck.masteredCount / deck.totalCount) * 100)
              : 0;
          return (
            <div
              key={deck.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>
                    {deck.totalCount} cụm · Thuộc {deck.masteredCount}/{deck.totalCount}
                  </span>
                  <span className="font-semibold text-slate-700">{pct}%</span>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {deck.title}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {deck.subtitle}
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-transform duration-200 origin-left"
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(1, pct / 100))})`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectDeck(deck.id)}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 text-slate-900 text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>Học Flashcard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLaunchQuizForDeck(deck.id)}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 shrink-0" />
                    <span>Trắc nghiệm</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
