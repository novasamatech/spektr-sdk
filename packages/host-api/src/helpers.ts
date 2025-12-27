import type { ResultPayload } from 'scale-ts';

import type { ComposeMessageAction, MessageVersion } from './interactions/message.js';

export function delay(ttl: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ttl));
}

type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

export const promiseWithResolvers = <const T>(): PromiseWithResolvers<T> => {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  // @ts-expect-error before assign
  return { promise, resolve, reject };
};

export function unwrapResultOrThrow<Ok, Err>(response: ResultPayload<Ok, Err>, toError: (e: Err) => Error) {
  if (response.success) {
    return response.value;
  }

  throw toError(response.value);
}

export function okResult<const T>(value: T) {
  return { success: true as const, value };
}

export function errResult<const T>(e: T) {
  return { success: false as const, value: e };
}

export function enumValue<const Tag extends string, const Value>(tag: Tag, value: Value) {
  return { tag, value };
}

export function isEnumVariant<const Tag extends string, const Enum extends { tag: string; value: unknown }>(
  v: Enum,
  tag: Tag,
): v is Extract<Enum, { tag: Tag }> {
  return v.tag === tag;
}

export function composeAction<const V extends MessageVersion, const Method extends string, const Suffix extends string>(
  _: V,
  method: Method,
  suffix: Suffix,
) {
  return `${method}_${suffix}` as ComposeMessageAction<V, Method, Suffix>;
}
