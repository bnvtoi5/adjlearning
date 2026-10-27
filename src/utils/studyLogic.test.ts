import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLOCATIONS, PREPOSITION_META } from '../data/collocations';
import {
  buildStudyDecks,
  calculateOverallStats,
  createClozeQuestion,
  explainWrongChoice,
  exportLocalSyncCode,
  filterCollocations,
  importLocalSyncCode,
  mergeSyncProgress,
  ProgressMap,
} from './studyLogic';

test('Complete dataset has all 196 collocations matching all 10 preposition tables', () => {
  assert.equal(COLLOCATIONS.length, 196);
  for (const meta of PREPOSITION_META) {
    const countForPrep = COLLOCATIONS.filter((c) => c.preposition === meta.key).length;
    assert.equal(
      countForPrep,
      meta.count,
      `Expected ${meta.key} to have ${meta.count} items, got ${countForPrep}`
    );
  }
});

test('filterCollocations filters by preposition, status, and Vietnamese/English search', () => {
  const progress: ProgressMap = {
    [COLLOCATIONS[0].id]: { status: 'mastered', updatedAt: 1000, reviewCount: 2 },
  };

  const forItems = filterCollocations(COLLOCATIONS, progress, {
    preposition: 'FOR',
    statusFilter: 'all',
    searchQuery: '',
  });
  assert.equal(forItems.length, 25);

  const famousItems = filterCollocations(COLLOCATIONS, progress, {
    preposition: 'ALL',
    statusFilter: 'all',
    searchQuery: 'famous',
  });
  assert.equal(famousItems.length, 1);
  assert.equal(famousItems[0].phrase, 'Famous for');

  const viSearchItems = filterCollocations(COLLOCATIONS, progress, {
    preposition: 'ALL',
    statusFilter: 'all',
    searchQuery: 'dị ứng với',
  });
  assert.equal(viSearchItems.length, 1);
  assert.equal(viSearchItems[0].phrase, 'Allergic to');

  const masteredOnly = filterCollocations(COLLOCATIONS, progress, {
    preposition: 'ALL',
    statusFilter: 'mastered',
    searchQuery: '',
  });
  assert.equal(masteredOnly.length, 1);
});

test('createClozeQuestion masks preposition and provides 4 distinct choices including correct answer', () => {
  const goodAt = COLLOCATIONS.find((c) => c.phrase === 'Good at')!;
  const q = createClozeQuestion(goodAt);

  assert.equal(q.correctPreposition, 'AT');
  assert.equal(q.options.length, 4);
  assert.ok(q.options.includes('AT'));
  assert.ok(q.maskedSentence.includes('___'));
  assert.ok(!q.maskedSentence.includes(' good at '));

  const feedback = explainWrongChoice(q, 'IN');
  assert.ok(feedback.includes('Good/Bad AT'));
});

test('buildStudyDecks creates all 10 preposition decks plus 1 unmastered review deck', () => {
  const decks = buildStudyDecks(COLLOCATIONS, {});
  assert.equal(decks.length, 11); // 10 prepositions + 1 review deck
  const byDeck = decks.find((d) => d.preposition === 'BY');
  assert.ok(byDeck);
  assert.equal(byDeck.totalCount, 9);
});

test('mergeSyncProgress merges local and remote progress without losing newer updates', () => {
  const local: ProgressMap = {
    'about-1': { status: 'learning', updatedAt: 100, reviewCount: 1 },
    'at-32': { status: 'mastered', updatedAt: 300, reviewCount: 3 },
  };
  const remote: ProgressMap = {
    'about-1': { status: 'mastered', updatedAt: 250, reviewCount: 2 },
    'at-32': { status: 'learning', updatedAt: 200, reviewCount: 1 },
    'by-50': { status: 'mastered', updatedAt: 150, reviewCount: 1 },
  };

  const merged = mergeSyncProgress(local, remote);
  assert.equal(merged['about-1'].status, 'mastered');
  assert.equal(merged['at-32'].status, 'mastered');
  assert.equal(merged['by-50'].status, 'mastered');

  const stats = calculateOverallStats(COLLOCATIONS, merged);
  assert.equal(stats.mastered, 3);
});

test('exportLocalSyncCode and importLocalSyncCode round-trip progress locally', () => {
  const sample: ProgressMap = {
    [COLLOCATIONS[0].id]: { status: 'mastered', updatedAt: 100, reviewCount: 1 },
    [COLLOCATIONS[5].id]: { status: 'learning', updatedAt: 100, reviewCount: 1 },
  };
  const code = exportLocalSyncCode(sample);
  assert.equal(code, 'PM1:m=0;l=5');

  const decoded = importLocalSyncCode(code);
  assert.ok(decoded);
  assert.equal(decoded[COLLOCATIONS[0].id].status, 'mastered');
  assert.equal(decoded[COLLOCATIONS[5].id].status, 'learning');
});
