import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Volume2,
  CheckSquare,
  Square,
  Play,
  Layers,
  Clock,
  Delete,
  Shuffle,
} from 'lucide-react';
import {
  COLLOCATIONS,
  CollocationItem,
  MasteryStatus,
  PREPOSITION_META,
  PrepositionCategory,
} from '../data/collocations';
import { getItemStatus, ProgressMap } from '../utils/studyLogic';
import { isAnswerMatch, stripToAlphanumeric } from '../utils/answerUtils';
import {
  CHUNK_SIZE,
  generateCollocationMemriseSet,
  MemriseExerciseItem,
  shuffleArray,
} from '../utils/memriseQuizEngine';

interface QuizViewProps {
  progress: ProgressMap;
  onUpdateStatus: (id: string, status: MasteryStatus) => void;
}

type SourceFilterMode = 'PREPOSITION' | 'LEARNING_ONLY' | 'UNMASTERED';

export const QuizView: React.FC<QuizViewProps> = ({
  progress,
  onUpdateStatus,
}) => {
  const [sourceMode, setSourceMode] = useState<SourceFilterMode>('PREPOSITION');
  const [selectedPrep, setSelectedPrep] = useState<PrepositionCategory>('ABOUT');

  // Pool of candidate CollocationItems based on current sourceMode & preposition
  const candidateItems = useMemo<CollocationItem[]>(() => {
    if (sourceMode === 'LEARNING_ONLY') {
      return COLLOCATIONS.filter(
        (item) => getItemStatus(progress, item.id) === 'learning'
      );
    }
    if (sourceMode === 'UNMASTERED') {
      return COLLOCATIONS.filter(
        (item) => getItemStatus(progress, item.id) !== 'mastered'
      );
    }
    return COLLOCATIONS.filter((item) => item.preposition === selectedPrep);
  }, [sourceMode, selectedPrep, progress]);

  // Selected word IDs for quiz practice
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>(() =>
    COLLOCATIONS.filter((i) => i.preposition === 'ABOUT').map((i) => i.id)
  );

  // Sync selectedWordIds whenever user switches sourceMode or selectedPrep
  useEffect(() => {
    setSelectedWordIds(candidateItems.map((i) => i.id));
  }, [candidateItems]);

  const selectedCollocationItems = useMemo(
    () => candidateItems.filter((item) => selectedWordIds.includes(item.id)),
    [candidateItems, selectedWordIds]
  );

  // Active Quiz Session State
  const [shuffleWords, setShuffleWords] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeExercises, setActiveExercises] = useState<MemriseExerciseItem[]>([]);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'info' | 'error' | 'success';
    text: string;
  } | null>(null);

  // Per-Exercise Interaction State
  const [userInput, setUserInput] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [pickedLetterIndices, setPickedLetterIndices] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);
  const [correctQuizCount, setCorrectQuizCount] = useState(0);
  const [completedQuizCount, setCompletedQuizCount] = useState(0);

  const textInputRef = useRef<HTMLInputElement | null>(null);

  const learningTotalCount = useMemo(
    () =>
      COLLOCATIONS.filter((item) => getItemStatus(progress, item.id) === 'learning')
        .length,
    [progress]
  );

  const currentActiveWord = activeExercises[currentExIndex]?.word || '';
  const batchQuickFillOptions = useMemo(() => {
    if (!currentActiveWord) return [];
    const exercisesPerBatch = CHUNK_SIZE * 7;
    const batchStart =
      Math.floor(currentExIndex / exercisesPerBatch) * exercisesPerBatch;
    const currentBatchExercises = activeExercises.slice(
      batchStart,
      batchStart + exercisesPerBatch
    );
    const batchPhrases = Array.from(
      new Set(currentBatchExercises.map((e) => e.word))
    ).filter((w) => w.toLowerCase() !== currentActiveWord.toLowerCase());

    const otherSelectedPhrases = shuffleArray(
      Array.from(new Set(activeExercises.map((e) => e.word))).filter(
        (w) =>
          w.toLowerCase() !== currentActiveWord.toLowerCase() &&
          !batchPhrases.includes(w)
      )
    );
    const fallback = shuffleArray(
      COLLOCATIONS.filter(
        (c) => c.phrase.toLowerCase() !== currentActiveWord.toLowerCase()
      ).map((c) => c.phrase)
    );
    const combined = [
      currentActiveWord,
      ...batchPhrases,
      ...otherSelectedPhrases,
      ...fallback,
    ].slice(0, 4);
    return shuffleArray(combined);
  }, [activeExercises, currentActiveWord, currentExIndex]);

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const resetQuestionInteraction = () => {
    setUserInput('');
    setSelectedChoice(null);
    setPickedLetterIndices([]);
    setIsSubmitted(false);
    setIsCurrentCorrect(false);
  };

  const handleStartQuiz = () => {
    if (selectedCollocationItems.length === 0) {
      setStatusBanner({
        type: 'error',
        text: 'Chưa có cụm từ nào được chọn. Hãy bấm "Chọn tất cả" hoặc tích vào từ muốn ôn.',
      });
      return;
    }

    const generated = generateCollocationMemriseSet(
      selectedCollocationItems,
      CHUNK_SIZE,
      COLLOCATIONS,
      {
        shuffleWords,
        shuffleWithinStage: true,
      }
    );

    setActiveExercises(generated);
    setCurrentExIndex(0);
    setCorrectQuizCount(0);
    setCompletedQuizCount(0);
    resetQuestionInteraction();
    setStatusBanner(null);
    setIsPlaying(true);
  };

  const toggleWordSelection = (id: string) => {
    setSelectedWordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ============================================================================
  // ACTIVE 6-STAGE QUIZ PLAYER VIEW
  // ============================================================================
  if (isPlaying && activeExercises.length > 0) {
    const currentEx = activeExercises[currentExIndex];
    const exercisesPerBatch = CHUNK_SIZE * 7; // 1 flashcard + 6 quizzes per word
    const currentBatchNumber = Math.floor(currentExIndex / exercisesPerBatch) + 1;
    const totalBatches = Math.max(
      1,
      Math.ceil(activeExercises.length / exercisesPerBatch)
    );

    const getStageBadge = (ex: MemriseExerciseItem) => {
      switch (ex.type) {
        case 'flashcard':
          return {
            step: 'Bước 0 · Học thẻ từ',
            title: 'Thẻ Ghi Nhớ Cụm Từ',
            color: 'bg-sky-100 text-sky-900 border-sky-200',
          };
        case 'multiple_choice':
          return ex.is_reverse
            ? {
                step: 'Quiz 2/6 · Trắc nghiệm đảo',
                title: 'Nghĩa Tiếng Việt ➔ Chọn Cụm Tiếng Anh',
                color: 'bg-indigo-100 text-indigo-900 border-indigo-200',
              }
            : {
                step: 'Quiz 1/6 · Trắc nghiệm xuôi',
                title: 'Cụm Tiếng Anh ➔ Chọn Nghĩa Tiếng Việt',
                color: 'bg-sky-100 text-sky-900 border-sky-200',
              };
        case 'fill_in_blank':
          return {
            step: 'Quiz 3/6 · Điền ví dụ',
            title: 'Điền Cụm Từ Vào Câu Ví Dụ',
            color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          };
        case 'vocab_cloze':
          return {
            step: 'Quiz 4/6 · Khuyết ký tự',
            title: 'Nhìn Ký Tự Gợi Ý & Điền Cụm Từ',
            color: 'bg-amber-100 text-amber-900 border-amber-200',
          };
        case 'spelling':
          return {
            step: 'Quiz 5/6 · Xếp chữ cái',
            title: 'Chạm Xếp Các Chữ Cái Thành Cụm Đúng',
            color: 'bg-purple-100 text-purple-900 border-purple-200',
          };
        case 'typing':
          return {
            step: 'Quiz 6/6 · Tự gõ từ',
            title: 'Tự Gõ Chính Xác Cụm Từ Tiếng Anh',
            color: 'bg-rose-100 text-rose-900 border-rose-200',
          };
      }
    };

    const badge = getStageBadge(currentEx);

    const recordQuizOutcome = (correct: boolean) => {
      setIsSubmitted(true);
      setIsCurrentCorrect(correct);
      setCompletedQuizCount((c) => c + 1);
      if (correct) {
        setCorrectQuizCount((c) => c + 1);
      }

      if (currentEx.collocationId) {
        if (!correct) {
          onUpdateStatus(currentEx.collocationId, 'learning');
        } else if (
          currentEx.type === 'typing' ||
          currentEx.type === 'spelling' ||
          currentEx.type === 'vocab_cloze'
        ) {
          onUpdateStatus(currentEx.collocationId, 'mastered');
        }
      }
    };

    const handleSelectMultipleChoice = (option: string) => {
      if (isSubmitted) return;
      setSelectedChoice(option);
      const correct = isAnswerMatch(option, currentEx.correct_answer);
      recordQuizOutcome(correct);
    };

    const handleSubmitTextAnswer = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (isSubmitted) {
        handleNextExercise();
        return;
      }
      if (!userInput.trim()) return;
      const correct = isAnswerMatch(userInput, currentEx.correct_answer);
      recordQuizOutcome(correct);
    };

    const handleTapSpellingTile = (charIndex: number) => {
      if (isSubmitted) return;
      const letters = currentEx.shuffled_letters || [];
      if (pickedLetterIndices.includes(charIndex)) return;

      const nextIndices = [...pickedLetterIndices, charIndex];
      setPickedLetterIndices(nextIndices);

      const assembledRaw = nextIndices.map((idx) => letters[idx]).join('');
      const targetStripped = stripToAlphanumeric(currentEx.correct_answer);

      if (assembledRaw.length === targetStripped.length) {
        const correct = assembledRaw.toLowerCase() === targetStripped.toLowerCase();
        recordQuizOutcome(correct);
      }
    };

    const handleRemovePickedLetter = (posInPicked: number) => {
      if (isSubmitted) return;
      setPickedLetterIndices((prev) => prev.filter((_, idx) => idx !== posInPicked));
    };

    const handleNextExercise = () => {
      if (currentExIndex + 1 < activeExercises.length) {
        setCurrentExIndex((idx) => idx + 1);
        resetQuestionInteraction();
      } else {
        setIsPlaying(false);
        setStatusBanner({
          type: 'success',
          text: `Hoàn thành xuất sắc đợt luyện tập! Đúng ${correctQuizCount}/${completedQuizCount} câu Quiz.`,
        });
      }
    };

    const renderFormattedSpellingAttempt = () => {
      const letters = currentEx.shuffled_letters || [];
      const pickedChars = pickedLetterIndices.map((i) => letters[i]);
      const targetWords = currentEx.correct_answer.trim().split(/\s+/);

      const segments: string[] = [];
      let cursor = 0;
      for (const w of targetWords) {
        const cleanLen = w.replace(/[^a-z0-9]/gi, '').length;
        const slice = pickedChars.slice(cursor, cursor + cleanLen);
        const padded = Array.from({ length: cleanLen }, (_, idx) =>
          slice[idx] ? slice[idx].toLowerCase() : '_'
        ).join(' ');
        segments.push(padded);
        cursor += cleanLen;
      }
      return segments.join('   ');
    };

    const progressPercent = Math.round(
      ((currentExIndex + 1) / activeExercises.length) * 100
    );

    return (
      <section className="space-y-3.5" aria-label="Phiên luyện tập 6 dạng Quiz">
        {/* Top Compact Session Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(false)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Chọn lại từ / Combo</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-700">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold">
                Đợt {currentBatchNumber}/{totalBatches}
              </span>
              <span>
                Bước {currentExIndex + 1}/{activeExercises.length}
              </span>
              {completedQuizCount > 0 && (
                <span className="hidden sm:inline text-emerald-700 font-semibold">
                  · Đúng {correctQuizCount}/{completedQuizCount}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-600 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Main Exercise Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4">
          {/* Stage Badge & Audio Button */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.color}`}
              >
                {badge.step}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {badge.title}
              </span>
            </div>

            {(currentEx.type === 'flashcard' ||
              (currentEx.type === 'multiple_choice' && !currentEx.is_reverse) ||
              isSubmitted) && (
              <button
                type="button"
                onClick={() =>
                  speakText(
                    currentEx.example
                      ? `${currentEx.word}. ${currentEx.example}`
                      : currentEx.word
                  )
                }
                className="min-h-[36px] px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium flex items-center gap-1.5 shrink-0"
              >
                <Volume2 className="w-4 h-4" />
                <span>Nghe phát âm</span>
              </button>
            )}
          </div>

          {/* 0. FLASHCARD VIEW */}
          {currentEx.type === 'flashcard' && (
            <div className="py-4 px-4 sm:px-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-center">
              <div className="inline-block px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-mono text-slate-600">
                {currentEx.phonetic || `Nhóm ${currentEx.preposition || ''}`}
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                {currentEx.word}
              </h2>
              <p className="text-lg sm:text-xl font-bold text-sky-700">
                {currentEx.meaning}
              </p>
              {currentEx.example && (
                <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl p-3.5 text-left space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    “{currentEx.example}”
                  </p>
                  {currentEx.example_translation && (
                    <p className="text-xs text-slate-600">
                      {currentEx.example_translation}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNextExercise}
                  className="min-h-[46px] px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2"
                >
                  <span>Đã nhớ · Tiếp tục</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 1 & 2. MULTIPLE CHOICE (STANDARD & REVERSE) */}
          {currentEx.type === 'multiple_choice' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <p className="text-base sm:text-xl font-bold text-slate-900">
                  {currentEx.question}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(currentEx.options || []).map((option, idx) => {
                  const isChosen = selectedChoice === option;
                  const isTrue = isAnswerMatch(option, currentEx.correct_answer);

                  let btnClass =
                    'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100 hover:border-slate-300';
                  if (isSubmitted) {
                    if (isTrue) {
                      btnClass = 'bg-emerald-600 border-emerald-600 text-white';
                    } else if (isChosen && !isTrue) {
                      btnClass = 'bg-rose-600 border-rose-600 text-white';
                    } else {
                      btnClass = 'bg-slate-50 border-slate-200 text-slate-400 opacity-75';
                    }
                  }

                  return (
                    <button
                      key={`${option}-${idx}`}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectMultipleChoice(option)}
                      className={`min-h-[52px] px-4 py-3 rounded-xl border text-left text-sm sm:text-base font-semibold transition-colors flex items-center justify-between gap-2 ${btnClass}`}
                    >
                      <span>{option}</span>
                      {isSubmitted && isTrue && (
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                      )}
                      {isSubmitted && isChosen && !isTrue && (
                        <XCircle className="w-5 h-5 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. FILL IN BLANK (ĐIỀN CỤM TỪ VÀO CÂU VÍ DỤ) */}
          {currentEx.type === 'fill_in_blank' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <p className="text-base sm:text-xl font-bold text-slate-900 leading-relaxed">
                  {currentEx.question}
                </p>
                {currentEx.hint && (
                  <p className="text-xs sm:text-sm text-sky-800 font-medium">
                    {currentEx.hint}
                  </p>
                )}
              </div>

              {/* Quick Tap Word Chips from current batch for easy mobile tap OR type below */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500">
                  Chạm nhanh cụm từ hoặc tự gõ bên dưới:
                </span>
                <div className="flex flex-wrap gap-2">
                  {batchQuickFillOptions.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => {
                        setUserInput(phrase);
                        const correct = isAnswerMatch(phrase, currentEx.correct_answer);
                        recordQuizOutcome(correct);
                      }}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs sm:text-sm font-mono font-semibold border border-slate-200"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmitTextAnswer} className="flex gap-2">
                <input
                  ref={textInputRef}
                  type="text"
                  disabled={isSubmitted}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Gõ cụm tính từ + giới từ cần điền..."
                  className="flex-1 min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm sm:text-base font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
                />
                {!isSubmitted && (
                  <button
                    type="submit"
                    className="min-h-[46px] px-5 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 shrink-0"
                  >
                    Kiểm tra
                  </button>
                )}
              </form>
            </div>
          )}

          {/* 4. VOCAB CLOZE (KHUYẾT KÝ TỰ) */}
          {currentEx.type === 'vocab_cloze' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-center">
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {currentEx.question}
                </p>
                <div className="py-2 px-3 bg-white border border-slate-200 rounded-xl inline-block">
                  <span className="text-lg sm:text-2xl font-mono font-bold tracking-widest text-slate-900 whitespace-pre-wrap">
                    {currentEx.clozeLetters || currentEx.clozeTemplate}
                  </span>
                </div>
                {currentEx.hint && (
                  <p className="text-xs text-amber-800">{currentEx.hint}</p>
                )}
              </div>

              <form onSubmit={handleSubmitTextAnswer} className="flex gap-2">
                <input
                  type="text"
                  disabled={isSubmitted}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Gõ đầy đủ cụm từ tiếng Anh (ví dụ: angry about)..."
                  className="flex-1 min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm sm:text-base font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
                />
                {!isSubmitted && (
                  <button
                    type="submit"
                    className="min-h-[46px] px-5 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 shrink-0"
                  >
                    Kiểm tra
                  </button>
                )}
              </form>
            </div>
          )}

          {/* 5. SPELLING (XẾP CHỮ CÁI) */}
          {currentEx.type === 'spelling' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-center">
                <p className="text-sm sm:text-base font-bold text-slate-900">
                  {currentEx.question}
                </p>
                {currentEx.hint && (
                  <p className="text-xs text-slate-500">{currentEx.hint}</p>
                )}

                {/* Assembled Slots Display */}
                <div className="my-2 py-3 px-4 bg-white border border-slate-200 rounded-xl min-h-[52px] flex items-center justify-center">
                  <span className="text-lg sm:text-2xl font-mono font-bold tracking-wider text-sky-800 whitespace-pre-wrap">
                    {renderFormattedSpellingAttempt()}
                  </span>
                </div>

                {/* Clear / Backspace Controls for Spelling */}
                {!isSubmitted && pickedLetterIndices.length > 0 && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleRemovePickedLetter(pickedLetterIndices.length - 1)
                      }
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Delete className="w-3.5 h-3.5" />
                      <span>Xóa 1 chữ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickedLetterIndices([])}
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Xếp lại từ đầu</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Letter Tiles Pool */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(currentEx.shuffled_letters || []).map((char, idx) => {
                  const isUsed = pickedLetterIndices.includes(idx);
                  return (
                    <button
                      key={`${char}-${idx}`}
                      type="button"
                      disabled={isSubmitted || isUsed}
                      onClick={() => handleTapSpellingTile(idx)}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-mono text-base sm:text-lg font-bold border transition-all flex items-center justify-center ${
                        isUsed
                          ? 'bg-slate-100 border-slate-200 text-slate-300 scale-95'
                          : 'bg-white border-slate-300 text-slate-900 hover:bg-sky-50 hover:border-sky-400 shadow-2xs active:scale-95'
                      }`}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. TYPING (TỰ GÕ TỪ) */}
          {currentEx.type === 'typing' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <p className="text-base sm:text-xl font-bold text-slate-900">
                  {currentEx.question}
                </p>
                {currentEx.hint && (
                  <p className="text-xs sm:text-sm text-slate-600">
                    {currentEx.hint}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmitTextAnswer} className="flex gap-2">
                <input
                  type="text"
                  disabled={isSubmitted}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Gõ cụm tính từ + giới từ tiếng Anh..."
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm sm:text-base font-mono text-slate-900 focus:border-sky-600 focus:outline-none"
                />
                {!isSubmitted && (
                  <button
                    type="submit"
                    className="min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 shrink-0"
                  >
                    Kiểm tra
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Instant Answer Feedback & Next Button */}
          {isSubmitted && (
            <div
              className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCurrentCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {isCurrentCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Chính xác! Đáp án: “{currentEx.correct_answer}”</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                      <span>
                        Chưa đúng! Đáp án chuẩn là: “{currentEx.correct_answer}”
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-700">
                  Cụm gốc: <strong className="font-mono">{currentEx.word}</strong>
                  {currentEx.meaning ? ` — ${currentEx.meaning}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNextExercise}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // ============================================================================
  // SETUP / COMBO & WORD SELECTOR VIEW (CLEAN, NO AI CLUTTER)
  // ============================================================================
  return (
    <section className="space-y-4" aria-label="Thiết lập bộ câu hỏi 6 dạng Quiz">
      {/* Status / Feedback Notice */}
      {statusBanner && (
        <div
          className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-2 ${
            statusBanner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs underline shrink-0"
          >
            Ẩn
          </button>
        </div>
      )}

      {/* Step 1: Quick Mode & Preposition Combo Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
            1. Chọn Nhóm Từ Muốn Luyện Tập (Đủ 6 Dạng Quiz / Từ)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Mỗi cụm từ gồm: Thẻ học ➔ Trắc nghiệm xuôi & đảo ➔ Điền ví dụ ➔ Khuyết ký tự ➔ Xếp chữ cái ➔ Tự gõ từ (chia theo đợt 3 từ).
          </p>
        </div>

        {/* Source Mode Tabs */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSourceMode('PREPOSITION')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
              sourceMode === 'PREPOSITION'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Theo Giới Từ</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('LEARNING_ONLY')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
              sourceMode === 'LEARNING_ONLY'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Đang Ôn ({learningTotalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('UNMASTERED')}
            className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
              sourceMode === 'UNMASTERED'
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Chưa Thuộc</span>
          </button>
        </div>

        {/* 10 Preposition Combo Pills when in PREPOSITION mode */}
        {sourceMode === 'PREPOSITION' && (
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
            {PREPOSITION_META.map((meta) => {
              const count = COLLOCATIONS.filter(
                (i) => i.preposition === meta.key
              ).length;
              const isSelected = selectedPrep === meta.key;
              return (
                <button
                  key={meta.key}
                  type="button"
                  onClick={() => setSelectedPrep(meta.key)}
                  className={`min-h-[42px] px-2 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{meta.key}</span>
                  <span
                    className={`text-[10px] font-normal ${
                      isSelected ? 'text-sky-100' : 'text-slate-500'
                    }`}
                  >
                    {count} từ
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2: Convenient 1-Tap Word Selection & Launch */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              2. Tích Chọn Cụm Từ ({selectedCollocationItems.length}/
              {candidateItems.length} cụm đã chọn)
            </h2>
            <p className="text-xs text-slate-500">
              Sẽ chia thành {Math.ceil(selectedCollocationItems.length / CHUNK_SIZE)} đợt (mỗi đợt 3 từ · tổng {selectedCollocationItems.length * 7} bước).
            </p>
          </div>

          {/* 1-Tap Quick Selection Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShuffleWords((s) => !s)}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors ${
                shuffleWords
                  ? 'bg-sky-50 text-sky-900 border-sky-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-sky-600" />
              <span>Xáo trộn từ: {shuffleWords ? 'BẬT' : 'TẮT'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedWordIds(candidateItems.map((i) => i.id))}
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Chọn tất cả ({candidateItems.length})
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedWordIds(
                  shuffleArray(candidateItems)
                    .slice(0, 6)
                    .map((i) => i.id)
                )
              }
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Ngẫu nhiên 6 từ
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedWordIds(
                  shuffleArray(candidateItems)
                    .slice(0, 9)
                    .map((i) => i.id)
                )
              }
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Ngẫu nhiên 9 từ
            </button>
            <button
              type="button"
              onClick={() => {
                const learningInGroup = candidateItems
                  .filter((i) => getItemStatus(progress, i.id) === 'learning')
                  .map((i) => i.id);
                setSelectedWordIds(learningInGroup);
              }}
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold"
            >
              Chỉ chọn từ Đang ôn
            </button>
            <button
              type="button"
              onClick={() => setSelectedWordIds([])}
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* Single Primary Launch Button */}
        <button
          type="button"
          disabled={selectedCollocationItems.length === 0}
          onClick={handleStartQuiz}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 shrink-0" />
          <span>
            Bắt đầu học ngay ({selectedCollocationItems.length} cụm từ · Đủ 6 dạng Quiz)
          </span>
        </button>

        {/* Word Checkboxes Grid */}
        {candidateItems.length === 0 ? (
          <div className="py-8 text-center text-xs sm:text-sm text-slate-500">
            {sourceMode === 'LEARNING_ONLY'
              ? 'Hiện chưa có cụm từ nào được đánh dấu "Đang ôn". Em có thể đánh dấu "Đang ôn" ở mục Tra cứu hoặc chuyển sang chọn theo Giới từ.'
              : 'Không có cụm từ nào trong danh sách này.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1 pt-1">
            {candidateItems.map((item) => {
              const isChecked = selectedWordIds.includes(item.id);
              const status = getItemStatus(progress, item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleWordSelection(item.id)}
                  className={`min-h-[46px] px-3 py-2 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                    isChecked
                      ? 'bg-sky-50/90 border-sky-300 text-slate-900'
                      : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-sky-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {item.phrase}
                      </span>
                      <span className="text-xs text-slate-600 ml-1.5">
                        — {item.meaningVi}
                      </span>
                    </div>
                  </div>

                  {status !== 'unlearned' && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                        status === 'mastered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {status === 'mastered' ? 'Đã thuộc' : 'Đang ôn'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
