import {
  COLLOCATIONS,
  CollocationItem,
  MasteryStatus,
  PREPOSITION_META,
  PrepositionCategory,
} from '../data/collocations';

export interface ItemProgress {
  status: MasteryStatus;
  updatedAt: number;
  reviewCount: number;
}

export type ProgressMap = Record<string, ItemProgress>;

export interface FilterCriteria {
  preposition: PrepositionCategory | 'ALL';
  statusFilter: 'all' | MasteryStatus;
  searchQuery: string;
  toSubFilter?: 'all' | 'prep' | 'infinitive';
}

export interface StudyDeckInfo {
  id: string;
  title: string;
  subtitle: string;
  category: 'preposition' | 'review';
  preposition?: PrepositionCategory;
  totalCount: number;
  masteredCount: number;
  learningCount: number;
  unlearnedCount: number;
  items: CollocationItem[];
}

export interface ClozeQuestion {
  item: CollocationItem;
  maskedSentence: string;
  options: PrepositionCategory[];
  correctPreposition: PrepositionCategory;
  ruleHint: string;
}

const ALL_PREPOSITIONS: PrepositionCategory[] = [
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

const CONFUSION_DISTRACTORS: Record<PrepositionCategory, PrepositionCategory[]> = {
  ABOUT: ['WITH', 'AT', 'OF', 'FOR', 'ON'],
  AT: ['IN', 'FOR', 'WITH', 'ABOUT', 'ON'],
  BY: ['WITH', 'AT', 'FROM', 'OF', 'ABOUT'],
  FOR: ['AT', 'TO', 'WITH', 'ABOUT', 'OF'],
  FROM: ['OF', 'WITH', 'BY', 'TO', 'FOR'],
  IN: ['AT', 'ON', 'WITH', 'FOR', 'OF'],
  OF: ['FROM', 'ABOUT', 'FOR', 'WITH', 'TO'],
  ON: ['IN', 'AT', 'TO', 'WITH', 'FOR'],
  TO: ['FOR', 'WITH', 'AT', 'OF', 'FROM'],
  WITH: ['ABOUT', 'TO', 'AT', 'BY', 'OF'],
};

export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function getItemStatus(progress: ProgressMap, id: string): MasteryStatus {
  return progress[id]?.status ?? 'unlearned';
}

export function filterCollocations(
  items: CollocationItem[],
  progress: ProgressMap,
  criteria: FilterCriteria
): CollocationItem[] {
  const queryNorm = normalizeText(criteria.searchQuery);

  return items.filter((item) => {
    if (criteria.preposition !== 'ALL' && item.preposition !== criteria.preposition) {
      return false;
    }

    if (criteria.preposition === 'TO' && criteria.toSubFilter && criteria.toSubFilter !== 'all') {
      if (criteria.toSubFilter === 'infinitive' && !item.structureType?.includes('To-infinitive')) {
        return false;
      }
      if (criteria.toSubFilter === 'prep' && !item.structureType?.includes('Giới từ')) {
        return false;
      }
    }

    const status = getItemStatus(progress, item.id);
    if (criteria.statusFilter !== 'all' && status !== criteria.statusFilter) {
      return false;
    }

    if (queryNorm.length > 0) {
      const haystack = normalizeText(
        `${item.phrase} ${item.adjective} ${item.preposition} ${item.meaningVi} ${item.example}`
      );
      if (!haystack.includes(queryNorm)) {
        return false;
      }
    }

    return true;
  });
}

export function calculateOverallStats(items: CollocationItem[], progress: ProgressMap) {
  let mastered = 0;
  let learning = 0;
  let unlearned = 0;

  for (const item of items) {
    const st = getItemStatus(progress, item.id);
    if (st === 'mastered') mastered++;
    else if (st === 'learning') learning++;
    else unlearned++;
  }

  const total = items.length;
  const percentMastered = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return {
    total,
    mastered,
    learning,
    unlearned,
    percentMastered,
  };
}

export function buildStudyDecks(
  items: CollocationItem[] = COLLOCATIONS,
  progress: ProgressMap = {}
): StudyDeckInfo[] {
  const summarizeDeck = (
    id: string,
    title: string,
    subtitle: string,
    category: 'preposition' | 'review',
    deckItems: CollocationItem[],
    preposition?: PrepositionCategory
  ): StudyDeckInfo => {
    const stats = calculateOverallStats(deckItems, progress);
    return {
      id,
      title,
      subtitle,
      category,
      preposition,
      totalCount: stats.total,
      masteredCount: stats.mastered,
      learningCount: stats.learning,
      unlearnedCount: stats.unlearned,
      items: deckItems,
    };
  };

  // 10 Preposition Decks (matching the 10 sections in the markdown file)
  const prepDecks: StudyDeckInfo[] = PREPOSITION_META.map((meta) => {
    const prepItems = items.filter((i) => i.preposition === meta.key);
    return summarizeDeck(
      `prep-${meta.key.toLowerCase()}`,
      `Giới từ ${meta.key}`,
      meta.coreIdea,
      'preposition',
      prepItems,
      meta.key
    );
  });

  // 1 Personal Review Deck for words currently in 'learning' or 'unlearned'
  const reviewItems = items.filter((i) => getItemStatus(progress, i.id) !== 'mastered');
  const reviewDeck = summarizeDeck(
    'review-unmastered',
    'Từ Chưa Thuộc & Đang Ôn',
    'Tự động gom các từ em chưa thuộc hoặc đang ôn để học dứt điểm.',
    'review',
    reviewItems.length > 0 ? reviewItems : items
  );

  return [...prepDecks, reviewDeck];
}

export function createClozeQuestion(item: CollocationItem): ClozeQuestion {
  const prepLower = item.preposition.toLowerCase();
  const regex = new RegExp(`\\b${prepLower}\\b`, 'i');
  const maskedSentence = regex.test(item.example)
    ? item.example.replace(regex, '___')
    : `${item.adjective} ___ (${item.meaningVi})`;

  const preferredDistractors = CONFUSION_DISTRACTORS[item.preposition] || ALL_PREPOSITIONS;
  const distractors: PrepositionCategory[] = [];
  for (const cand of preferredDistractors) {
    if (cand !== item.preposition && !distractors.includes(cand)) {
      distractors.push(cand);
    }
    if (distractors.length === 3) break;
  }

  // Deterministic rotation based on item id characters so options don't always put correct answer in same slot
  const rawOptions: PrepositionCategory[] = [item.preposition, ...distractors];
  const seed = item.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const options: PrepositionCategory[] = rawOptions
    .map((opt, idx) => ({ opt, sortKey: (seed + idx * 7) % 11 }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((x) => x.opt);

  const meta = PREPOSITION_META.find((m) => m.key === item.preposition);
  const ruleHint =
    item.confusingNote ||
    (item.structureType ? `Cấu trúc: ${item.structureType}. ` : '') +
      (meta ? meta.coreIdea : `Cụm cố định: ${item.phrase}`);

  return {
    item,
    maskedSentence,
    options,
    correctPreposition: item.preposition,
    ruleHint,
  };
}

export function explainWrongChoice(
  question: ClozeQuestion,
  chosen: PrepositionCategory
): string {
  const adjLower = question.item.adjective.toLowerCase();

  if ((adjLower === 'good' || adjLower === 'bad') && chosen === 'IN') {
    return 'Bẫy kinh điển! Tiếng Việt nói "giỏi trong môn gì" nhưng tiếng Anh dùng "Good/Bad AT" cho kỹ năng, không dùng "in".';
  }
  if ((adjLower === 'good' || adjLower === 'bad') && (chosen === 'FOR' || chosen === 'AT')) {
    return 'Phân biệt: "Good/Bad AT" chỉ kỹ năng/năng lực; còn "Good/Bad FOR" chỉ lợi ích hoặc tác hại cho sức khỏe.';
  }
  if (adjLower === 'made' && (chosen === 'OF' || chosen === 'FROM')) {
    return 'Phân biệt: "Made OF" khi giữ nguyên chất liệu nhìn thấy được (bàn làm bằng gỗ); "Made FROM" khi chất liệu đã biến đổi hoàn toàn (giấy làm từ bột gỗ).';
  }
  if (
    (adjLower === 'angry' || adjLower === 'annoyed' || adjLower === 'furious') &&
    (chosen === 'ABOUT' || chosen === 'WITH' || chosen === 'AT')
  ) {
    return 'Phân biệt: Dùng "ABOUT" khi giận về một sự việc/tình huống; dùng "WITH / AT" khi giận một người cụ thể.';
  }
  if (adjLower === 'familiar' && (chosen === 'TO' || chosen === 'WITH')) {
    return 'Phân biệt: "Familiar TO sb" (cái gì nghe quen với ai) ≠ "Familiar WITH sth" (ai nắm rõ/quen thuộc với cái gì).';
  }
  if (adjLower === 'tired' && (chosen === 'OF' || chosen === 'FROM')) {
    return 'Phân biệt: "Tired OF" là chán ngấy việc gì; còn "Tired FROM" là mệt mỏi cơ thể do vận động.';
  }

  return `Đáp án đúng là "${question.item.phrase}" (${question.item.meaningVi}). ${question.ruleHint}`;
}

export function mergeSyncProgress(local: ProgressMap, remote: ProgressMap): ProgressMap {
  const merged: ProgressMap = { ...local };

  for (const [id, remoteEntry] of Object.entries(remote)) {
    const localEntry = merged[id];
    if (!localEntry) {
      merged[id] = { ...remoteEntry };
    } else if (remoteEntry.updatedAt > localEntry.updatedAt) {
      merged[id] = {
        ...remoteEntry,
        reviewCount: Math.max(localEntry.reviewCount || 0, remoteEntry.reviewCount || 0),
      };
    } else if (remoteEntry.updatedAt === localEntry.updatedAt) {
      const rank: Record<MasteryStatus, number> = {
        unlearned: 0,
        learning: 1,
        mastered: 2,
      };
      if (rank[remoteEntry.status] > rank[localEntry.status]) {
        merged[id] = { ...remoteEntry };
      }
    }
  }

  return merged;
}

/**
 * Encodes progress into a compact string (e.g. "PM1:m=0,3,12;l=1,5") so students
 * can copy/paste between phone and PC locally without any server or class codes.
 */
export function exportLocalSyncCode(progress: ProgressMap): string {
  const masteredIndices: number[] = [];
  const learningIndices: number[] = [];

  COLLOCATIONS.forEach((item, index) => {
    const st = progress[item.id]?.status;
    if (st === 'mastered') masteredIndices.push(index);
    else if (st === 'learning') learningIndices.push(index);
  });

  return `PM1:m=${masteredIndices.join(',')};l=${learningIndices.join(',')}`;
}

export function importLocalSyncCode(code: string): ProgressMap | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith('PM1:')) return null;

  const body = trimmed.slice(4);
  const parts = body.split(';');
  const now = Date.now();
  const result: ProgressMap = {};

  for (const part of parts) {
    const [key, val] = part.split('=');
    if (!val) continue;
    const indices = val
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < COLLOCATIONS.length);

    for (const idx of indices) {
      const item = COLLOCATIONS[idx];
      if (item) {
        result[item.id] = {
          status: key === 'm' ? 'mastered' : 'learning',
          updatedAt: now,
          reviewCount: 1,
        };
      }
    }
  }

  return result;
}

