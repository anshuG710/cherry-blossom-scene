export function makePlayOrder(count, current, shuffle, random = Math.random) {
  const remaining = Array.from({length: count}, (_, i) => i).filter(i => i !== current);
  if (shuffle) {
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    return [current, ...remaining];
  }
  return Array.from({length: count}, (_, i) => (current + i) % count);
}
