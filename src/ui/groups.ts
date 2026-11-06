/** Number of distinct group colors (CSS variables --g1 … --g8). Colors repeat after that; numbers don't. */
export const GROUP_COLORS = 8;

export function groupColor(index: number): string {
  return `var(--g${(index % GROUP_COLORS) + 1})`;
}
