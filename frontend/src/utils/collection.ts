export const sortDeletedLast = <T extends { isDeleted: boolean }>(
  items: readonly T[],
): T[] =>
  [...items].sort(
    (left, right) => Number(left.isDeleted) - Number(right.isDeleted),
  );
