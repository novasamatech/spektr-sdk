import type { PickMessagePayload, MessageType, Transport } from '@novasamatech/spektr-sdk-transport';

type Subscriber<Response extends MessageType> = (
  callback: (response: PickMessagePayload<Response>) => void,
) => VoidFunction;

type Params<SubscribeRequest extends MessageType, Response extends MessageType> = {
  transport: Transport;
  subscribeRequest: SubscribeRequest;
  unsubscribeRequest: MessageType;
  getSubscriber(): Subscriber<Response>;
};

export function createComplexSubscriber<SubscribeRequest extends MessageType, Response extends MessageType>({
  transport,
  subscribeRequest,
  unsubscribeRequest,
  getSubscriber,
}: Params<SubscribeRequest, Response>) {
  let unsubscribe: VoidFunction | null = null;
  let id: string | null = null;

  const replaceSubscriber = () => {
    if (unsubscribe) {
      unsubscribe();
    }

    const subscriber = getSubscriber();

    unsubscribe = subscriber(value => {
      transport?.postMessage(id ?? '_', value);
    });
  };

  transport?.subscribe(subscribeRequest, async requestId => {
    id = requestId;

    if (!unsubscribe) {
      const subscriber = getSubscriber();

      unsubscribe = subscriber(value => {
        transport.postMessage(id ?? '_', value);
      });
    }

    transport?.subscribe(unsubscribeRequest, async () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });
  });

  return {
    replaceSubscriber,
  };
}
