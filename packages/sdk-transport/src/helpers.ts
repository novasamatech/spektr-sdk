export function delay(ttl: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ttl));
}
