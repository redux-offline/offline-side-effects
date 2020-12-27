import { updates } from './updater';

export function createTriggers(stream, { updater, hooks }) {
  const [state, updateState] = updater;

  const actionWasRequested = action => {
    if (action.meta?.effect) {
      updateState(updates.enqueue, action);
      hooks.onRequest(action);
    }
    stream.start();
  };

  const togglePause = paused => {
    updateState(updates.pause, paused);
    if (!paused) {
      stream.start();
    }
  };

  const rehydrateOutbox = () => {
    updateState(updates.rehydrate);
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
