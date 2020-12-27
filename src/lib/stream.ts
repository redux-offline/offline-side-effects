import { createMiddleware } from './middleware';

export function createStream(context) {
  const { updater: [state], options } = context;
  const { processOutbox, send, wrapUp } = createMiddleware(context);

  const stream = options.alterStream([processOutbox, send, wrapUp], context);

  const start = () => {
    let i = 0;
    const next = async (...prev) => {
      const current = stream[i];
      if (current) {
        i++;
        await current(next, ...prev);
      } else if (state.outbox.length > 0) {
        start();
      }
    };

    next(null).catch(console.error);
  };

  return { start };
}
