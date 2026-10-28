import { GoogleGenAI } from '@google/genai';
import {
  COLLOCATIONS,
  CollocationItem,
  PrepositionCategory,
} from '../data/collocations';

export type MemriseQuizType =
  | 'flashcard'
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'vocab_cloze'
  | 'spelling'
  | 'typing';

export interface MemriseExerciseItem {
  id: string;
  collocationId?: string;
  preposition?: PrepositionCategory;
  word: string;
  type: MemriseQuizType;
  question: string;
  options?: string[];
  correct_answer: string;
  hint?: string;
  clozeLetters?: string;
  clozeTemplate?: string;
  shuffled_letters?: string[];
  meaning?: string;
  phonetic?: string;
  example?: string;
  example_translation?: string;
  is_reverse?: boolean;
}

export interface MemriseGenerationResult {
  status: 'success' | 'error';
  total_words_processed?: number;
  exercises?: MemriseExerciseItem[];
  error?: string;
}

export interface AISettings {
  provider: 'gemini' | 'openrouter' | 'openai';
  apiKey: string;
  model: string;
  customBaseUrl?: string;
  batchSize: number;
}

export interface ExportedQuizPack {
  version: 'prepmaster-quiz-pack-v1';
  title: string;
  createdAt: number;
  batchSize: number;
  wordCount: number;
  prepositions: PrepositionCategory[];
  collocationIds: string[];
  exercises: MemriseExerciseItem[];
}

export const CHUNK_SIZE = 3;
export const QUIZ_TYPES_PER_WORD = 6;
export const AI_SETTINGS_STORAGE_KEY = 'prepmaster_ai_settings_v1';

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-3.1-flash-lite-preview',
  customBaseUrl: '',
  batchSize: CHUNK_SIZE,
};

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    return {
      provider: parsed.provider || 'gemini',
      apiKey: parsed.apiKey || '',
      model: parsed.model || 'gemini-3.1-flash-lite-preview',
      customBaseUrl: parsed.customBaseUrl || '',
      batchSize:
        typeof parsed.batchSize === 'number' && parsed.batchSize >= 1 && parsed.batchSize <= 10
          ? parsed.batchSize
          : CHUNK_SIZE,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export const MEMRISE_SYSTEM_PROMPT = `Bạn là một AI Backend Module chuyên dụng, có nhiệm vụ chuyển đổi danh sách cụm tính từ + giới từ tiếng Anh được cung cấp thành một cấu trúc dữ liệu bài tập (JSON) theo phong cách Memrise hoàn chỉnh.

QUY TẮC PHÂN TÁCH DÒNG (BẮT BUỘC):
1. MỖI DÒNG trong danh sách tương ứng với ĐÚNG 1 CỤM TỪ VỰNG TIẾNG ANH MỤC TIÊU (ví dụ: "Angry about: Tức giận về việc gì").
2. TUYỆT ĐỐI KHÔNG xem dấu phẩy (,), dấu chấm phẩy (;), hay dấu gạch nối (-) là dấu ngăn cách giữa các từ vựng khác nhau.

NHIỆM VỤ CỦA BẠN:
Với mỗi dòng từ vựng trong danh sách, hãy tạo ra các bài tập theo trình tự logic sư phạm (1 Flashcard + 6 Quiz cho mỗi cụm từ):
- Bước 0: "flashcard" (Thẻ học từ vựng trước khi vào quiz). Giúp người học nắm vững cụm từ, phiên âm chuẩn quốc tế IPA, giải nghĩa tiếng Việt rõ ràng, câu ví dụ tự nhiên kèm bản dịch tiếng Việt trước khi bắt đầu làm bài tập.
- Bước 1: "multiple_choice" (Trắc nghiệm xuôi: Cụm tiếng Anh ➔ Chọn nghĩa tiếng Việt). Hỏi nghĩa của cụm từ tiếng Anh. Tạo ra 3 đáp án nhiễu (distractors) hợp lý.
- Bước 2: "multiple_choice" đảo ngược (Trắc nghiệm đảo: Nghĩa tiếng Việt ➔ Chọn cụm tiếng Anh đúng). Câu hỏi dạng: "Cụm từ tiếng Anh nào sau đây có nghĩa là '[meaning]'?". 4 options là các cụm tiếng Anh (gồm cụm đúng và 3 cụm nhiễu dễ nhầm giới từ). Đánh dấu "is_reverse": true.
- Bước 3: "fill_in_blank" (Điền cụm từ vào câu ví dụ ngữ cảnh độc nhất & thông minh).
  + BẮT BUỘC: Với MỖI cụm từ, phải sáng tạo một câu ví dụ tiếng Anh tự nhiên, sinh động và đúng văn cảnh thực tế của cụm đó.
  + Ẩn toàn bộ cụm từ mục tiêu bằng đúng ký hiệu "___" (3 dấu gạch dưới).
  + "hint": BẮT BUỘC là bản dịch nghĩa tiếng Việt hoàn chỉnh, tự nhiên của toàn bộ câu ví dụ đó để làm gợi ý ngữ cảnh.
- Bước 4: "vocab_cloze" (Khuyết ký tự từ vựng ngẫu nhiên). Câu hỏi: "Điền cụm từ tiếng Anh có nghĩa: \\"[meaning]\\"". Tạo mẫu chuỗi ký tự khuyết "clozeLetters" với các chữ cái và dấu gạch dưới "_" cách nhau bởi khoảng trắng, ẩn từ 35%-60% chữ cái ngẫu nhiên.
- Bước 5: "spelling" (Sắp xếp ký tự). Câu hỏi: "Sắp xếp các chữ cái sau thành cụm từ tiếng Anh có nghĩa: \\"[meaning]\\"". Tạo một mảng "shuffled_letters" chứa các chữ cái của cụm từ đó đã được tráo đổi ngẫu nhiên vị trí. TUYỆT ĐỐI KHÔNG để lộ từ gốc trong câu hỏi.
- Bước 6: "typing" (Tự gõ từ). Câu hỏi: "Gõ cụm từ tiếng Anh có nghĩa: \\"[meaning]\\"". Cung cấp định nghĩa/gợi ý tiếng Việt và bắt người dùng gõ lại chính xác cụm từ gốc tiếng Anh.

ĐỊNH DẠNG ĐẦU RA (OUTPUT FORMAT):
- Trả về CHỈ duy nhất khối JSON có cấu trúc:
{
  "status": "success",
  "total_words_processed": 0,
  "exercises": [ ... ]
}`;

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Tạo mẫu chuỗi ký tự khuyết (clozeLetters) ẩn khoảng 40%-55% ký tự chữ cái,
 * giữ nguyên khoảng trắng phân tách giữa các từ trong cụm.
 */
export function createClozeLettersPattern(word: string): {
  clozeLetters: string;
  maskedCount: number;
} {
  const cleaned = word.trim();
  const wordParts = cleaned.split(/\s+/);
  let totalMasked = 0;

  const formattedParts = wordParts.map((part) => {
    const chars = part.split('');
    if (chars.length <= 1) {
      return chars.join(' ');
    }
    const targetMaskCount = Math.max(1, Math.round(chars.length * 0.45));
    const indices = chars.map((_, idx) => idx);
    // Keep first letter visible when length >= 3 so students have a clear anchor
    const maskableIndices = chars.length >= 3 ? indices.slice(1) : indices;
    const shuffledIndices = shuffleArray(maskableIndices);
    const maskedSet = new Set(shuffledIndices.slice(0, targetMaskCount));
    totalMasked += maskedSet.size;

    return chars
      .map((ch, idx) => (maskedSet.has(idx) ? '_' : ch.toLowerCase()))
      .join(' ');
  });

  return {
    clozeLetters: formattedParts.join('   '),
    maskedCount: totalMasked,
  };
}

/**
 * Sắp xếp các bài tập Memrise theo từng đợt (Round/Chunk, mặc định CHUNK_SIZE = 3 từ/đợt):
 * - Nếu shuffleWords = true: Xáo trộn danh sách từ trước khi chia thành các đợt 3 từ.
 * - ĐẦU ĐỢT: Tất cả Flashcard của 3 từ trong đợt (W1, W2, W3).
 * - TIẾP THEO: Qua từng vòng Quiz 1 ➔ Quiz 6, thứ tự 3 từ trong đợt được xáo trộn ngẫu nhiên
 *   (ví dụ Quiz 1 hỏi W2-W3-W1, Quiz 2 hỏi W3-W1-W2...) để học sinh không đoán mò theo thứ tự 1-2-3!
 */
export function orderExercisesInBatches(
  exercises: MemriseExerciseItem[],
  batchSize: number = CHUNK_SIZE,
  options?: { shuffleWords?: boolean; shuffleWithinStage?: boolean }
): MemriseExerciseItem[] {
  if (!exercises || exercises.length === 0) return [];

  const shuffleWords = options?.shuffleWords ?? false;
  const shuffleWithinStage = options?.shuffleWithinStage ?? true;

  let uniqueWords: string[] = [];
  exercises.forEach((ex) => {
    const w = (ex.word || '').trim().toLowerCase();
    if (w && !uniqueWords.includes(w)) {
      uniqueWords.push(w);
    }
  });

  if (uniqueWords.length === 0) return exercises;

  if (shuffleWords) {
    uniqueWords = shuffleArray(uniqueWords);
  }

  const result: MemriseExerciseItem[] = [];
  const normWord = (ex: MemriseExerciseItem) => (ex.word || '').trim().toLowerCase();

  const isFlashcard = (ex: MemriseExerciseItem) => ex.type === 'flashcard';
  const isMcStandard = (ex: MemriseExerciseItem) =>
    ex.type === 'multiple_choice' && !ex.is_reverse;
  const isMcReverse = (ex: MemriseExerciseItem) =>
    ex.type === 'multiple_choice' && !!ex.is_reverse;
  const isFillBlank = (ex: MemriseExerciseItem) => ex.type === 'fill_in_blank';
  const isVocabCloze = (ex: MemriseExerciseItem) => ex.type === 'vocab_cloze';
  const isSpelling = (ex: MemriseExerciseItem) => ex.type === 'spelling';
  const isTyping = (ex: MemriseExerciseItem) => ex.type === 'typing';

  const pickOrder = (words: string[]) =>
    shuffleWithinStage && words.length > 1 ? shuffleArray(words) : words;

  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batchWords = uniqueWords.slice(i, i + batchSize);
    const batchExercises = exercises.filter((ex) =>
      batchWords.includes(normWord(ex))
    );

    // 1. Tất cả Flashcard của đợt lên đầu
    batchWords.forEach((w) => {
      result.push(
        ...batchExercises.filter((ex) => isFlashcard(ex) && normWord(ex) === w)
      );
    });

    // 2. Quiz 1 — Từ ➔ Nghĩa (xáo thứ tự từ trong đợt)
    pickOrder(batchWords).forEach((w) => {
      result.push(
        ...batchExercises.filter((ex) => isMcStandard(ex) && normWord(ex) === w)
      );
    });

    // 3. Quiz 2 — Nghĩa ➔ Từ (xáo thứ tự từ trong đợt)
    pickOrder(batchWords).forEach((w) => {
      result.push(
        ...batchExercises.filter((ex) => isMcReverse(ex) && normWord(ex) === w)
      );
    });

    // 4. Quiz 3 — Điền vào ví dụ (xáo thứ tự từ trong đợt)
    pickOrder(batchWords).forEach((w) => {
      result.push(
        ...batchExercises.filter((ex) => isFillBlank(ex) && normWord(ex) === w)
      );
    });

    // 5. Quiz 4 — Khuyết ký tự (xáo thứ tự từ trong đợt)
    pickOrder(batchWords).forEach((w) => {
      result.push(
        ...batchExercises.filter((ex) => isVocabCloze(ex) && normWord(ex) === w)
      );
    });

    // 6. Quiz 5 — Xếp chữ cái (xáo thứ tự từ trong đợt)
    pickOrder(batchWords).forEach((w) => {
      result.push(
        ...batchExercises.filter((ex) => isSpelling(ex) && normWord(ex) === w)
      );
    });

    // 7. Quiz 6 — Tự gõ từ (xáo thứ tự từ trong đợt)
    pickOrder(batchWords).forEach((w) => {
      result.push(
        ...batchExercises.filter((ex) => isTyping(ex) && normWord(ex) === w)
      );
    });

    const usedIds = new Set(result.map((r) => r.id));
    batchExercises.forEach((ex) => {
      if (!usedIds.has(ex.id)) {
        result.push(ex);
      }
    });
  }

  return result;
}

/**
 * Tạo câu điền khuyết từ chính câu ví dụ chuẩn của cụm tính từ + giới từ
 * (ẩn cả cụm ví dụ "angry about" thành "___").
 */
export function maskCollocationInExample(item: CollocationItem): {
  sentenceWithBlank: string;
  fullSentence: string;
  hintVi: string;
} {
  const fullSentence = item.example;
  const escapedPhrase = item.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const phraseRegex = new RegExp(`\\b${escapedPhrase}\\b`, 'i');

  let sentenceWithBlank = fullSentence;
  if (phraseRegex.test(fullSentence)) {
    sentenceWithBlank = fullSentence.replace(phraseRegex, '___');
  } else {
    // Fallback if adjective and preposition are separated or inflected
    const adjEscaped = item.adjective.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prepEscaped = item.preposition.toLowerCase();
    const pairRegex = new RegExp(`\\b${adjEscaped}\\s+${prepEscaped}\\b`, 'i');
    if (pairRegex.test(fullSentence)) {
      sentenceWithBlank = fullSentence.replace(pairRegex, '___');
    } else {
      sentenceWithBlank = `Many people are ___ this situation. (${fullSentence})`;
    }
  }

  const hintVi = `Nghĩa cụm cần điền: "${item.meaningVi}"${
    item.structureType ? ` · Cấu trúc: ${item.structureType}` : ''
  }`;

  return {
    sentenceWithBlank,
    fullSentence,
    hintVi,
  };
}

/**
 * Tạo bộ bài tập Memrise (1 Flashcard + 6 Quiz / từ) chuẩn xác từ danh sách CollocationItem[]
 * và sắp xếp theo từng đợt 3 từ (orderExercisesInBatches).
 */
export function generateCollocationMemriseSet(
  items: CollocationItem[],
  batchSize: number = CHUNK_SIZE,
  allReferenceItems: CollocationItem[] = COLLOCATIONS,
  options?: { shuffleWords?: boolean; shuffleWithinStage?: boolean }
): MemriseExerciseItem[] {
  if (!items || items.length === 0) return [];

  const orderedInput = options?.shuffleWords ? shuffleArray(items) : items;
  const rawExercises: MemriseExerciseItem[] = [];
  const allPreps: PrepositionCategory[] = [
    'ABOUT',
    'AT',
    'BY',
    'FOR',
    'FROM',
    'IN',
    'OF',
    'ON',
    'TO',
    'WITH',
  ];

  orderedInput.forEach((item, globalIndex) => {
    const word = item.phrase.toLowerCase();
    const displayWord = item.phrase;
    const meaning = item.meaningVi;
    const baseId = `pm_${item.id}_${globalIndex}`;
    const masked = maskCollocationInExample(item);
    const { clozeLetters } = createClozeLettersPattern(word);

    // 0. Flashcard
    rawExercises.push({
      id: `${baseId}_fc`,
      collocationId: item.id,
      preposition: item.preposition,
      word: displayWord,
      type: 'flashcard',
      question: `Ghi nhớ cụm từ: ${displayWord}`,
      meaning,
      phonetic: item.structureType || `${item.adjective} + ${item.preposition}`,
      example: item.example,
      example_translation: `Cụm nhớ (Chunk): "${item.chunkHighlight}" — ${meaning}`,
      correct_answer: displayWord,
    });

    // 1. Quiz 1: Multiple Choice Standard (Cụm tiếng Anh ➔ Chọn nghĩa tiếng Việt)
    const otherMeanings = allReferenceItems
      .filter((x) => x.id !== item.id && x.meaningVi !== meaning)
      .map((x) => x.meaningVi);
    const pickedMeaningDistractors = shuffleArray(
      Array.from(new Set(otherMeanings))
    ).slice(0, 3);
    const mcOptions = shuffleArray([meaning, ...pickedMeaningDistractors]);

    rawExercises.push({
      id: `${baseId}_mc`,
      collocationId: item.id,
      preposition: item.preposition,
      word: displayWord,
      type: 'multiple_choice',
      is_reverse: false,
      question: `Nghĩa của cụm từ "${displayWord}" là gì?`,
      options: mcOptions,
      meaning,
      correct_answer: meaning,
    });

    // 2. Quiz 2: Multiple Choice Reverse (Nghĩa tiếng Việt ➔ Chọn cụm tiếng Anh đúng, ưu tiên bẫy giới từ cùng tính từ!)
    const sameAdjDifferentPrep = allPreps
      .filter((p) => p !== item.preposition)
      .map((p) => `${item.adjective} ${p.toLowerCase()}`);
    const otherRealPhrases = allReferenceItems
      .filter((x) => x.id !== item.id && x.phrase.toLowerCase() !== word)
      .map((x) => x.phrase);
    const reverseDistractorPool = [
      ...shuffleArray(sameAdjDifferentPrep).slice(0, 2),
      ...shuffleArray(otherRealPhrases).slice(0, 2),
    ];
    const uniqueRevDistractors = Array.from(new Set(reverseDistractorPool))
      .filter((p) => p.toLowerCase() !== word)
      .slice(0, 3);
    const reverseOptions = shuffleArray([displayWord, ...uniqueRevDistractors]);

    rawExercises.push({
      id: `${baseId}_mc_rev`,
      collocationId: item.id,
      preposition: item.preposition,
      word: displayWord,
      type: 'multiple_choice',
      is_reverse: true,
      question: `Cụm tính từ + giới từ nào có nghĩa là: "${meaning}"?`,
      options: reverseOptions,
      meaning,
      correct_answer: displayWord,
    });

    // 3. Quiz 3: Fill in Blank (Điền cụm từ vào câu ví dụ)
    rawExercises.push({
      id: `${baseId}_fib`,
      collocationId: item.id,
      preposition: item.preposition,
      word: displayWord,
      type: 'fill_in_blank',
      question: masked.sentenceWithBlank,
      hint: masked.hintVi,
      meaning,
      example: item.example,
      correct_answer: displayWord,
    });

    // 4. Quiz 4: Vocab Cloze (Điền ký tự khuyết)
    rawExercises.push({
      id: `${baseId}_cloze`,
      collocationId: item.id,
      preposition: item.preposition,
      word: displayWord,
      type: 'vocab_cloze',
      question: `Điền cụm từ tiếng Anh có nghĩa: "${meaning}"`,
      hint: `Gợi ý: Tính từ bắt đầu bằng "${item.adjective[0]}" + giới từ nhóm ${item.preposition}`,
      meaning,
      phonetic: item.structureType,
      clozeLetters,
      clozeTemplate: clozeLetters,
      correct_answer: displayWord,
    });

    // 5. Quiz 5: Spelling (Xếp chữ cái thành cụm từ đúng)
    const cleanChars = word
      .split('')
      .filter((c) => /[a-z0-9]/i.test(c));
    let shuffledLetters = shuffleArray(cleanChars);
    if (shuffledLetters.join('') === cleanChars.join('') && cleanChars.length > 1) {
      shuffledLetters = [...cleanChars].reverse();
    }

    rawExercises.push({
      id: `${baseId}_sp`,
      collocationId: item.id,
      preposition: item.preposition,
      word: displayWord,
      type: 'spelling',
      question: `Xếp các chữ cái sau thành cụm từ có nghĩa: "${meaning}"`,
      hint: `Gồm 2 từ (${item.adjective.length} chữ cái + ${item.preposition.length} chữ cái)`,
      meaning,
      shuffled_letters: shuffledLetters,
      correct_answer: displayWord,
    });

    // 6. Quiz 6: Typing (Tự gõ lại toàn bộ cụm từ)
    rawExercises.push({
      id: `${baseId}_tp`,
      collocationId: item.id,
      preposition: item.preposition,
      word: displayWord,
      type: 'typing',
      question: `Gõ chính xác cụm từ tiếng Anh có nghĩa: "${meaning}"`,
      hint: `Ví dụ: "${masked.sentenceWithBlank}"`,
      meaning,
      correct_answer: displayWord,
    });
  });

  return orderExercisesInBatches(rawExercises, batchSize, {
    shuffleWords: false,
    shuffleWithinStage: options?.shuffleWithinStage ?? true,
  });
}

/**
 * Gọi AI trực tiếp từ trình duyệt bằng API Key & Model người dùng cấu hình trong Cài đặt
 * (Hỗ trợ Google Gemini SDK và OpenAI/OpenRouter tương thích).
 * Tự động bổ sung bất kỳ dạng bài nào thiếu và sắp xếp theo đợt 3 từ.
 */
export async function generateAIMemriseSetForCollocations(params: {
  items: CollocationItem[];
  settings: AISettings;
  shuffleWords?: boolean;
  signal?: AbortSignal;
}): Promise<MemriseGenerationResult> {
  const { items, settings, shuffleWords = false, signal } = params;
  const batchSize = settings.batchSize || CHUNK_SIZE;

  if (!items || items.length === 0) {
    return {
      status: 'error',
      error: 'Vui lòng chọn ít nhất 1 cụm từ để tạo câu hỏi.',
    };
  }

  const apiKey = settings.apiKey.trim();
  if (!apiKey) {
    return {
      status: 'error',
      error:
        'Chưa có API Key trong Cài đặt AI. Vui lòng bấm nút "Cài đặt AI" để nhập Gemini API Key hoặc dùng nút "Tạo nhanh (Offline)" ngay bên cạnh.',
    };
  }

  const vocabLines = items
    .map(
      (item) =>
        `${item.phrase}: ${item.meaningVi} (Ví dụ gốc: ${item.example})`
    )
    .join('\n');

  const userPrompt = `Danh sách các cụm tính từ + giới từ cần tạo đủ 1 Flashcard + 6 dạng Quiz cho mỗi cụm:\n${vocabLines}`;

  try {
    let rawJsonText = '';

    if (settings.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: settings.model.trim() || 'gemini-3.1-flash-lite-preview',
        contents: userPrompt,
        config: {
          systemInstruction: MEMRISE_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });
      rawJsonText = response.text || '';
    } else {
      const baseUrl =
        settings.provider === 'openrouter'
          ? 'https://openrouter.ai/api/v1'
          : (settings.customBaseUrl || 'https://api.openai.com/v1').replace(
              /\/+$/,
              ''
            );

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal,
        body: JSON.stringify({
          model: settings.model.trim() || 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: MEMRISE_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Lỗi gọi API (${res.status}): ${errText.slice(0, 180)}`);
      }
      const data = await res.json();
      rawJsonText = data?.choices?.[0]?.message?.content || '';
    }

    const cleanedJson = rawJsonText
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedJson);
    if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
      // Tag each AI exercise with collocationId & preposition so student filtering works seamlessly
      const taggedExercises: MemriseExerciseItem[] = parsed.exercises.map(
        (ex: MemriseExerciseItem, idx: number) => {
          const matchedItem = items.find(
            (it) =>
              it.phrase.toLowerCase() === (ex.word || '').trim().toLowerCase()
          );
          const wordStr = matchedItem ? matchedItem.phrase : ex.word;
          const cleanAlpha = wordStr
            .toLowerCase()
            .split('')
            .filter((c) => /[a-z0-9]/i.test(c));

          return {
            ...ex,
            id: ex.id || `ai_${idx}_${Date.now()}`,
            word: wordStr,
            collocationId: matchedItem?.id,
            preposition: matchedItem?.preposition,
            clozeLetters:
              ex.type === 'vocab_cloze'
                ? ex.clozeLetters || createClozeLettersPattern(wordStr).clozeLetters
                : ex.clozeLetters,
            shuffled_letters:
              ex.type === 'spelling'
                ? cleanAlpha.length > 0
                  ? shuffleArray(cleanAlpha)
                  : ex.shuffled_letters
                : ex.shuffled_letters,
          };
        }
      );

      return {
        status: 'success',
        total_words_processed: items.length,
        exercises: orderExercisesInBatches(taggedExercises, batchSize, {
          shuffleWords,
          shuffleWithinStage: true,
        }),
      };
    }

    throw new Error('Phản hồi từ AI không đúng định dạng bài tập.');
  } catch (err: any) {
    return {
      status: 'error',
      error:
        err?.message ||
        'Không thể kết nối tới AI. Vui lòng kiểm tra lại API Key / tên Model trong Cài đặt.',
    };
  }
}

/**
 * Xuất bộ đề Quiz ra chuỗi JSON chuẩn để giáo viên lưu thành file .json và gửi cho học sinh.
 */
export function exportQuizPackToJson(params: {
  title: string;
  items: CollocationItem[];
  exercises: MemriseExerciseItem[];
  batchSize?: number;
}): string {
  const { title, items, exercises, batchSize = CHUNK_SIZE } = params;
  const preps = Array.from(new Set(items.map((i) => i.preposition)));
  const pack: ExportedQuizPack = {
    version: 'prepmaster-quiz-pack-v1',
    title: title.trim() || `Bộ Quiz (${items.length} cụm từ)`,
    createdAt: Date.now(),
    batchSize,
    wordCount: items.length,
    prepositions: preps,
    collocationIds: items.map((i) => i.id),
    exercises,
  };
  return JSON.stringify(pack, null, 2);
}

/**
 * Đọc và kiểm tra file JSON bộ đề do giáo viên chia sẻ (hỗ trợ cả định dạng ExportedQuizPack
 * lẫn định dạng MemriseGenerationResult cũ `{ status: "success", exercises: [...] }`).
 */
export function parseImportedQuizPackJson(rawJson: string): ExportedQuizPack | null {
  try {
    const data = JSON.parse(rawJson);
    if (!data || typeof data !== 'object') return null;

    if (
      data.version === 'prepmaster-quiz-pack-v1' &&
      Array.isArray(data.exercises)
    ) {
      return data as ExportedQuizPack;
    }

    // Hỗ trợ tương thích trực tiếp với JSON của dự án cũ { exercises: [...] }
    if (Array.isArray(data.exercises) && data.exercises.length > 0) {
      const exercises: MemriseExerciseItem[] = data.exercises.map(
        (ex: MemriseExerciseItem, idx: number) => {
          const matched = COLLOCATIONS.find(
            (c) =>
              c.phrase.toLowerCase() === (ex.word || '').trim().toLowerCase()
          );
          return {
            ...ex,
            id: ex.id || `imp_${idx}`,
            collocationId: ex.collocationId || matched?.id,
            preposition: ex.preposition || matched?.preposition,
          };
        }
      );

      const uniqueWords = Array.from(
        new Set(exercises.map((e) => (e.word || '').trim().toLowerCase()).filter(Boolean))
      );
      const preps = Array.from(
        new Set(
          exercises
            .map((e) => e.preposition)
            .filter((p): p is PrepositionCategory => Boolean(p))
        )
      );
      const collocationIds = Array.from(
        new Set(
          exercises
            .map((e) => e.collocationId)
            .filter((id): id is string => Boolean(id))
        )
      );

      return {
        version: 'prepmaster-quiz-pack-v1',
        title: data.title || `Bộ đề nhập từ file (${uniqueWords.length} từ)`,
        createdAt: data.createdAt || Date.now(),
        batchSize: data.batchSize || CHUNK_SIZE,
        wordCount: uniqueWords.length,
        prepositions: preps,
        collocationIds,
        exercises: orderExercisesInBatches(exercises, data.batchSize || CHUNK_SIZE),
      };
    }

    return null;
  } catch {
    return null;
  }
}
