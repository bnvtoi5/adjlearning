import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Volume2,
  HelpCircle,
} from 'lucide-react';
import {
  COLLOCATIONS,
  MasteryStatus,
  PrepositionCategory,
} from '../data/collocations';
import {
  buildStudyDecks,
  createClozeQuestion,
  explainWrongChoice,
  ProgressMap,
} from '../utils/studyLogic';

interface QuizViewProps {
  progress: ProgressMap;
  initialDeckId?: string | null;
  onUpdateStatus: (id: string, status: MasteryStatus) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  progress,
  initialDeckId,
  onUpdateStatus,
}) => {
  const decks = useMemo(() => buildStudyDecks(COLLOCATIONS, progress), [progress]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    initialDeckId || 'all-196'
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<PrepositionCategory | null>(
    null
  );
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const activeItems = useMemo(() => {
    if (selectedDeckId === 'all-196') return COLLOCATIONS;
    const found = decks.find((d) => d.id === selectedDeckId);
    return found && found.items.length > 0 ? found.items : COLLOCATIONS;
  }, [selectedDeckId, decks]);

  const safeIndex = questionIndex % activeItems.length;
  const currentQuestion = useMemo(
    () => createClozeQuestion(activeItems[safeIndex]),
    [activeItems, safeIndex]
  );

  const speakSentence = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleChooseOption = (option: PrepositionCategory) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    setAnsweredCount((c) => c + 1);

    const isCorrect = option === currentQuestion.correctPreposition;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      onUpdateStatus(currentQuestion.item.id, 'mastered');
    } else {
      onUpdateStatus(currentQuestion.item.id, 'learning');
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setQuestionIndex((idx) => (idx + 1) % activeItems.length);
  };

  const handleSwitchDeck = (newDeckId: string) => {
    setSelectedDeckId(newDeckId);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setAnsweredCount(0);
  };

  const isCorrect = selectedAnswer === currentQuestion.correctPreposition;

  return (
    <section className="space-y-4" aria-label="Trắc nghiệm điền giới từ">
      {/* Compact Header & Deck Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
            Trắc Nghiệm Điền Giới Từ
          </h1>

          <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-600 shrink-0">
            <span>
              Đúng <strong className="text-emerald-700">{correctCount}</strong>/{answeredCount}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Câu {safeIndex + 1}/{activeItems.length}
            </span>
            {answeredCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuestionIndex(0);
                  setSelectedAnswer(null);
                  setCorrectCount(0);
                  setAnsweredCount(0);
                }}
                className="min-h-[34px] px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Làm lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Deck Selector Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => handleSwitchDeck('all-196')}
            className={`min-h-[38px] px-3 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedDeckId === 'all-196'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tất cả (196)
          </button>
          {decks.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => handleSwitchDeck(d.id)}
              className={`min-h-[38px] px-3 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedDeckId === d.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {d.preposition ? `${d.preposition} (${d.totalCount})` : d.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Quiz Stage */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <div className="truncate">
            <span>Tính từ: </span>
            <strong className="text-slate-900 font-semibold">
              {currentQuestion.item.adjective}
            </strong>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{currentQuestion.item.meaningVi}</span>
          </div>
          <button
            type="button"
            onClick={() => speakSentence(currentQuestion.item.example)}
            className="min-h-[38px] px-3 py-1 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
          >
            <Volume2 className="w-4 h-4" />
            <span>Nghe câu</span>
          </button>
        </div>

        {/* Masked Cloze Sentence */}
        <div className="py-4 px-4 sm:px-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
          <p className="text-base sm:text-xl font-bold text-slate-900 leading-relaxed">
            {currentQuestion.maskedSentence.split('___').map((part, i, arr) => (
              <React.Fragment key={i}>
                <span>{part}</span>
                {i < arr.length - 1 && (
                  <span
                    className={`inline-block min-w-[68px] text-center mx-1 px-2.5 py-0.5 rounded-lg font-mono border-b-2 ${
                      selectedAnswer === null
                        ? 'bg-white text-sky-700 border-sky-600'
                        : isCorrect
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-rose-600 text-white border-rose-700'
                    }`}
                  >
                    {selectedAnswer ?? '___'}
                  </span>
                )}
              </React.Fragment>
            ))}
          </p>
          <p className="text-xs text-slate-600">
            Nghĩa cụm từ:{' '}
            <strong className="text-slate-900">
              {currentQuestion.item.meaningVi}
            </strong>
          </p>
        </div>

        {/* 4 Large Thumb-Friendly Preposition Choice Buttons */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
          role="group"
          aria-label="Chọn giới từ điền vào chỗ trống"
        >
          {currentQuestion.options.map((option) => {
            const isChosen = selectedAnswer === option;
            const isTrueAnswer = option === currentQuestion.correctPreposition;

            let btnStyle =
              'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100 hover:border-slate-300';
            if (selectedAnswer !== null) {
              if (isTrueAnswer) {
                btnStyle = 'bg-emerald-600 border-emerald-600 text-white';
              } else if (isChosen && !isTrueAnswer) {
                btnStyle = 'bg-rose-600 border-rose-600 text-white';
              } else {
                btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-75';
              }
            }

            return (
              <button
                key={option}
                type="button"
                disabled={selectedAnswer !== null}
                onClick={() => handleChooseOption(option)}
                className={`min-h-[52px] px-4 py-2.5 rounded-xl border text-base sm:text-lg font-mono font-bold tracking-wide transition-colors flex items-center justify-center gap-2 ${btnStyle}`}
              >
                <span>{option}</span>
                {selectedAnswer !== null && isTrueAnswer && (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                )}
                {selectedAnswer !== null && isChosen && !isTrueAnswer && (
                  <XCircle className="w-5 h-5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Instant Confusion Matrix Feedback */}
        {selectedAnswer !== null && (
          <div
            className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isCorrect
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      Chính xác! Cụm chuẩn là “{currentQuestion.item.phrase}”
                    </span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>
                      Chưa đúng! Đáp án chuẩn là “{currentQuestion.correctPreposition}”
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs sm:text-sm leading-relaxed">
                {isCorrect
                  ? `Cụm nhớ (Chunk): "${currentQuestion.item.chunkHighlight}" — ${currentQuestion.ruleHint}`
                  : explainWrongChoice(currentQuestion, selectedAnswer)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleNextQuestion}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span>Câu tiếp theo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
