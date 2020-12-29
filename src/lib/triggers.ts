import { Action, Context, Stream, Updates } from './types';

export function createTriggers(stream: Stream, { updater, hooks }: Context) {
  const [state, updateState] = updater;

  const actionWasRequested = (action: Action) => {
    if (action.meta?.effect) {
      updateState(Updates.enqueue, action);
      hooks.onRequest(action);
    }
    stream.start();
  };

  const togglePause = (paused: boolean) => {
    updateState(Updates.pause, paused);
    if (!paused) {
      stream.start();
    }
  };

  const rehydrateOutbox = (outbox: Action[]) => {
    updateState(Updates.rehydrate, outbox);
    if (state.outbox.length > 0) {
      stream.start();
    }
  };

  const restartProcess = () => {
    stream.start();
  };

  return {
    actionWasRequested,
    togglePause,
    rehydrateOutbox,
    restartProcess
  };
}
