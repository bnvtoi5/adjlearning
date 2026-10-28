import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLOCATIONS } from '../data/collocations';
import {
  buildStudyDecks,
  calculateOverallStats,
  exportLocalSyncCode,
  filterCollocations,
  importLocalSyncCode,
  mergeSyncProgress,
  ProgressMap,
} from './studyLogic';
import { isAnswerMatch } from './answerUtils';
import {
  createClozeLettersPattern,
  exportQuizPackToJson,
  generateCollocationMemriseSet,
  orderExercisesInBatches,
  parseImportedQuizPackJson,
} from './memriseQuizEngine';

test('Dataset completeness: contains all 10 prepositions and 196 collocation items', () => {
  assert.equal(COLLOCATIONS.length, 196);
  const countsByPrep: Record<string, number> = {};
  for (const item of COLLOCATIONS) {
    countsByPrep[item.preposition] = (countsByPrep[item.preposition] || 0) + 1;
  }

  assert.equal(countsByPrep['ABOUT'], 31);
  assert.equal(countsByPrep['AT'], 18);
  assert.equal(countsByPrep['BY'], 9);
  assert.equal(countsByPrep['FOR'], 25);
  assert.equal(countsByPrep['FROM'], 6);
  assert.equal(countsByPrep['IN'], 11);
  assert.equal(countsByPrep['OF'], 37);
  assert.equal(countsByPrep['ON'], 5);
  assert.equal(countsByPrep['TO'], 26);
  assert.equal(countsByPrep['WITH'], 28);
});

test('filterCollocations filters by preposition, Vietnamese accent-insensitive search, and status', () => {
  const firstAbout = COLLOCATIONS.find((i) => i.preposition === 'ABOUT')!;
  const firstAt = COLLOCATIONS.find((i) => i.preposition === 'AT')!;
  const progress: ProgressMap = {
    [firstAbout.id]: { status: 'mastered', updatedAt: 100, reviewCount: 2 },
    [firstAt.id]: { status: 'learning', updatedAt: 200, reviewCount: 1 },
  };

  const byPrep = filterCollocations(COLLOCATIONS, progress, {
    preposition: 'BY',
    statusFilter: 'all',
    searchQuery: '',
  });
  assert.equal(byPrep.length, 9);

  const byVietnameseNoAccent = filterCollocations(COLLOCATIONS, progress, {
    preposition: 'ALL',
    statusFilter: 'all',
    searchQuery: 'tuc gian',
  });
  assert.ok(byVietnameseNoAccent.some((i) => i.phrase.toLowerCase() === 'angry about'));
});

test('buildStudyDecks creates 10 Preposition Decks + 1 Review Deck and calculates mastery accurately', () => {
  const byItems = COLLOCATIONS.filter((i) => i.preposition === 'BY');
  const progress: ProgressMap = {
    [byItems[0].id]: { status: 'mastered', updatedAt: 100, reviewCount: 1 },
    [byItems[1].id]: { status: 'learning', updatedAt: 100, reviewCount: 1 },
  };

  const decks = buildStudyDecks(COLLOCATIONS, progress);
  assert.equal(decks.length, 11);

  const byDeck = decks.find((d) => d.id === 'prep-by');
  assert.ok(byDeck);
  assert.equal(byDeck.totalCount, 9);
  assert.equal(byDeck.masteredCount, 1);
  assert.equal(byDeck.learningCount, 1);

  const overall = calculateOverallStats(COLLOCATIONS, progress);
  assert.equal(overall.mastered, 1);
  assert.equal(overall.learning, 1);
  assert.equal(overall.unlearned, 194);
});

test('Local sync code export/import and mergeSyncProgress work cleanly without server dependency', () => {
  const id0 = COLLOCATIONS[0].id;
  const id1 = COLLOCATIONS[1].id;
  const local: ProgressMap = {
    [id0]: { status: 'learning', updatedAt: 100, reviewCount: 1 },
    [id1]: { status: 'mastered', updatedAt: 300, reviewCount: 4 },
  };

  const code = exportLocalSyncCode(local);
  assert.ok(code.startsWith('PM1:'));

  const imported = importLocalSyncCode(code);
  assert.ok(imported);
  assert.equal(imported[id0]?.status, 'learning');
  assert.equal(imported[id1]?.status, 'mastered');

  const merged = mergeSyncProgress(local, {
    [id0]: { status: 'mastered', updatedAt: 250, reviewCount: 3 },
  });
  assert.equal(merged[id0].status, 'mastered');
});

test('Memrise 6-Quiz generator creates 1 Flashcard + 6 Quiz types per word and orders in batches of 3', () => {
  const sampleItems = COLLOCATIONS.slice(0, 4); // 4 words -> Batch 1 (3 words) + Batch 2 (1 word)
  const exercises = generateCollocationMemriseSet(sampleItems, 3);

  // Each word has 1 flashcard + 6 quizzes = 7 items => 4 * 7 = 28 exercises
  assert.equal(exercises.length, 28);

  // First 3 exercises in Batch 1 must be the 3 flashcards for the first 3 words
  assert.equal(exercises[0].type, 'flashcard');
  assert.equal(exercises[1].type, 'flashcard');
  assert.equal(exercises[2].type, 'flashcard');

  // Next 3 exercises must be Quiz 1 (multiple_choice standard)
  assert.equal(exercises[3].type, 'multiple_choice');
  assert.equal(exercises[3].is_reverse, false);
  assert.equal(exercises[4].type, 'multiple_choice');
  assert.equal(exercises[5].type, 'multiple_choice');

  // Next 3 exercises must be Quiz 2 (multiple_choice reverse)
  assert.equal(exercises[6].type, 'multiple_choice');
  assert.equal(exercises[6].is_reverse, true);

  // Next 3 exercises must be Quiz 3 (fill_in_blank)
  assert.equal(exercises[9].type, 'fill_in_blank');
  assert.ok(exercises[9].question.includes('___'));

  // Next 3 exercises must be Quiz 4 (vocab_cloze)
  assert.equal(exercises[12].type, 'vocab_cloze');
  assert.ok(exercises[12].clozeLetters && exercises[12].clozeLetters.includes('_'));

  // Next 3 exercises must be Quiz 5 (spelling)
  assert.equal(exercises[15].type, 'spelling');
  assert.ok(Array.isArray(exercises[15].shuffled_letters));

  // Next 3 exercises must be Quiz 6 (typing)
  assert.equal(exercises[18].type, 'typing');

  // Exercise index 21 is the start of Batch 2 (4th word's flashcard)
  assert.equal(exercises[21].type, 'flashcard');
  assert.equal(exercises[21].word, sampleItems[3].phrase);
});

test('isAnswerMatch, createClozeLettersPattern, and JSON Quiz Pack export/import work accurately', () => {
  assert.equal(isAnswerMatch('Angry about', 'angry about'), true);
  assert.equal(isAnswerMatch('  angry about. ', 'Angry about'), true);
  assert.equal(isAnswerMatch('angry with', 'Angry about'), false);

  const cloze = createClozeLettersPattern('Angry about');
  assert.ok(cloze.clozeLetters.includes('_'));
  assert.ok(cloze.maskedCount >= 2);

  const sampleItems = COLLOCATIONS.slice(0, 3);
  const exercises = generateCollocationMemriseSet(sampleItems, 3);
  const jsonStr = exportQuizPackToJson({
    title: 'Combo ABOUT mẫu',
    items: sampleItems,
    exercises,
    batchSize: 3,
  });

  const parsedPack = parseImportedQuizPackJson(jsonStr);
  assert.ok(parsedPack);
  assert.equal(parsedPack.title, 'Combo ABOUT mẫu');
  assert.equal(parsedPack.wordCount, 3);
  assert.equal(parsedPack.exercises.length, 21);

  const reordered = orderExercisesInBatches(parsedPack.exercises, 3);
  assert.equal(reordered.length, 21);
});
