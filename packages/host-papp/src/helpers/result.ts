export type Result<V, E = unknown> = {
  isOk(): boolean;
  isErr(): boolean;
  map<V1>(fn: (v: V) => V1): Result<V1, E>;
  marErr<E1>(fn: (err: E) => E1): Result<V, E1>;
  andThen<R extends Result<unknown>>(fn: (v: V) => R): R;
  andThenPromise<R extends Result<unknown>>(fn: (v: V) => Promise<R>): Promise<R>;
  orElse<R extends Result<unknown>>(fn: (e: E) => R): Result<V, E> | R;
  orElsePromise<R extends Result<unknown>>(fn: (e: E) => Promise<R>): Promise<Result<V, E> | R>;
  unwrap(): V | null;
  unwrapOrThrow(): V;
  unwrapErr(): E | null;
};

type InferOk<R> = R extends Result<infer Ok> ? Ok : never;
type InferErr<R> = R extends Result<unknown, infer Err> ? Err : never;

export function ok<V = void, E = never>(value: V): Result<V, E> {
  const result: Result<V, E> = {
    isOk: () => true,
    isErr: () => false,
    map: <V1>(fn: (v: V) => V1) => ok(fn(value)),
    marErr: <E1>() => result as unknown as Result<V, E1>,
    andThen: <R extends Result<unknown>>(fn: (v: V) => R) => fn(value),
    andThenPromise: async <R extends Result<unknown>>(fn: (v: V) => Promise<R>) => {
      try {
        return await fn(value);
      } catch (e) {
        return err(e) as never;
      }
    },
    orElse: () => result as never,
    orElsePromise: () => Promise.resolve(result),
    unwrap: () => value,
    unwrapOrThrow: () => value,
    unwrapErr: () => null,
  };

  return result;
}

export function err<E, V = never>(value: E): Result<V, E> {
  const result: Result<V, E> = {
    isOk: () => false,
    isErr: () => true,
    map: <V1>() => result as unknown as Result<V1, E>,
    marErr: <E1>(fn: (e: E) => E1) => err(fn(value)),
    andThen: <R extends Result<unknown>>() => result as unknown as R,
    andThenPromise: () => Promise.resolve(result) as never,
    orElse: <R extends Result<unknown>>(fn: (e: E) => R) => fn(value) as never,
    orElsePromise: <R extends Result<unknown>>(fn: (e: E) => Promise<R>) => fn(value) as never,
    unwrap: () => null,
    unwrapOrThrow: () => {
      throw value;
    },
    unwrapErr: () => value,
  };

  return result;
}

export function fromPromise<T, E>(promise: Promise<T>, mapErr: (e: unknown) => E): Promise<Result<T, E>> {
  return promise.then(v => ok<T, E>(v)).catch(e => err(mapErr(e)));
}

export function toPromise<T>(result: Result<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const value = result.unwrapOrThrow();
      resolve(value);
    } catch (error) {
      reject(error);
    }
  });
}

export function unwrapPromise<T>(result: Result<Promise<T>>): Promise<T> {
  try {
    return result.unwrapOrThrow();
  } catch (error) {
    return Promise.reject(error);
  }
}

type InferOks<Results> = Results extends [infer Head, ...infer Tail]
  ? [InferOk<Head>, ...InferOks<Tail>]
  : Results extends Result<unknown>[]
    ? InferOk<Results[number]>[]
    : [];
type SeqResults<Results extends Result<unknown>[]> = Result<InferOks<Results>, InferErr<Results[number]> | Error>;

export function seq<const Results extends Result<unknown>[]>(...result: Results): SeqResults<Results> {
  const [head, ...tail] = result;

  if (head === undefined) {
    return err(new Error('Seq is empty'));
  }

  return tail.reduce<Result<unknown[]>>(
    (a, r) => a.andThen(av => r.map(rv => [...av, rv])),
    head.map(r => [r]),
  ) as SeqResults<Results>;
}
