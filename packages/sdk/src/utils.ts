export function inIframe() {
  try {
    return window !== window.top;
  } catch {
    return false;
  }
}

export function getParentWindow() {
  if (window.top) {
    return window.top;
  }
  throw new Error('No parent window found');
}
