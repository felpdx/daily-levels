import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWords, saveWord, removeWord } from '../assets/js/store.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

const steal = { word: 'steal', pt: 'roubar', articleId: 'a', title: 'Title' };

test('saves and loads a word', () => {
  const storage = memoryStorage();
  assert.equal(saveWord(storage, steal), true);
  assert.deepEqual(loadWords(storage), [steal]);
});

test('does not save the same word twice', () => {
  const storage = memoryStorage();
  saveWord(storage, steal);
  saveWord(storage, { ...steal, articleId: 'b' });
  assert.equal(loadWords(storage).length, 1);
});

test('removes a word', () => {
  const storage = memoryStorage();
  saveWord(storage, steal);
  removeWord(storage, 'steal');
  assert.deepEqual(loadWords(storage), []);
});

test('survives blocked storage and corrupted data', () => {
  const blocked = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.deepEqual(loadWords(blocked), []);
  assert.equal(saveWord(blocked, steal), false);
  const corrupted = memoryStorage();
  corrupted.setItem('daily-levels:words', '{broken');
  assert.deepEqual(loadWords(corrupted), []);
});
