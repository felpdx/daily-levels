const KEY = 'daily-levels:words';

export function loadWords(storage) {
  try {
    const words = JSON.parse(storage.getItem(KEY) ?? '[]');
    return Array.isArray(words) ? words : [];
  } catch {
    return [];
  }
}

function write(storage, words) {
  try {
    storage.setItem(KEY, JSON.stringify(words));
    return true;
  } catch {
    return false;
  }
}

export function saveWord(storage, entry) {
  const words = loadWords(storage);
  if (words.some(({ word }) => word === entry.word)) return true;
  return write(storage, [entry, ...words]);
}

export function removeWord(storage, word) {
  return write(storage, loadWords(storage).filter((entry) => entry.word !== word));
}
