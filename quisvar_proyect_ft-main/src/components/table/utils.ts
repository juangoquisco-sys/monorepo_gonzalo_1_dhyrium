import type { CSSProperties } from 'react';

export const stickyStyle = (
  sticky: 'left' | 'right' | undefined,
  offset: CSSProperties['left'] | CSSProperties['right'] = 0
): CSSProperties => {
  if (!sticky) return {};
  return {
    position: 'sticky',
    ...(sticky == 'left' && { left: offset }),
    ...(sticky == 'right' && { right: offset }),
    backgroundColor: ' var(--color-primarylight)',
    borderLeft: sticky === 'right' ? '2px solid #fff' : undefined,
  };
};
