export const getIconDefault = (seed: string) => {
  const normalizedSeed = seed.trim() || 'Dhyrium';
  const hash = Array.from(normalizedSeed).reduce(
    (current, character) => (current * 31 + character.charCodeAt(0)) >>> 0,
    0
  );
  const colors = [
    '#00897b',
    '#039be5',
    '#1e88e5',
    '#3949ab',
    '#43a047',
    '#6d4c41',
    '#8e24aa',
    '#d81b60',
    '#f4511e',
  ];
  const label =
    normalizedSeed
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 2)
      .toUpperCase() || 'DH';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${
    colors[hash % colors.length]
  }"/><text x="48" y="56" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="700" fill="white">${label}</text></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};
