export function isValidMessage(event: MessageEvent, sourceEnv: MessageEventSource, currentEnv: MessageEventSource) {
  return (
    event.source !== currentEnv &&
    event.source === sourceEnv &&
    event.data &&
    event.data.constructor.name === 'Uint8Array'
  );
}
