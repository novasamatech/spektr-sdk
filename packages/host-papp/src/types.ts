declare const __brand: unique symbol;

export type Branded<T, K extends string> = T & {
  [__brand]: K;
};

export type Callback<T, R = unknown> = (value: T) => R;
