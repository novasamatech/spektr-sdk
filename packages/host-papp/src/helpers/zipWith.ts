type InferArrayItem<T> = T extends Array<infer U> ? U : never;
type InferArgs<Args extends unknown[][]> = Args extends [infer Head, ...infer Tail extends unknown[][]]
  ? [InferArrayItem<Head>, ...InferArgs<Tail>]
  : [];

export function zipWith<const Args extends unknown[][], R>(
  arrays: Args,
  iteratee: (values: InferArgs<Args>) => R,
): R[] {
  if (arrays.length === 0) return [];

  const minLength = Math.min(...arrays.map(arr => arr.length));
  const result: R[] = [];

  for (let i = 0; i < minLength; i++) {
    const values = arrays.map(arr => arr[i]);
    result.push(iteratee(values as InferArgs<Args>));
  }

  return result;
}
