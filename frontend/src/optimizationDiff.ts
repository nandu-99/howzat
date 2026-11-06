export interface ComparisonRow { before?: string; after?: string; changed: boolean }

// This optimizer removes arithmetic assignments and substitutes delivery values.
// Align retained instructions so a removed temporary does not shift every row.
export function optimizationRows(before: string, after: string): ComparisonRow[] {
  const left = before ? before.split('\n') : [];
  const right = after ? after.split('\n') : [];
  const rows: ComparisonRow[] = [];
  let i = 0, j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      rows.push({ before: left[i++], after: right[j++], changed: false });
    } else if (i < left.length && /^t[0-9]+ = /.test(left[i]) &&
        (j >= right.length || left[i].split(' = ')[0] !== right[j].split(' = ')[0])) {
      rows.push({ before: left[i++], changed: true });
    } else {
      rows.push({ before: i < left.length ? left[i++] : undefined,
        after: j < right.length ? right[j++] : undefined, changed: true });
    }
  }
  return rows;
}
