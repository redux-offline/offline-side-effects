import defaults from './defaults';
import { createUpdater } from './updater';
import { createTriggers } from './triggers';
import { createStream } from './stream';

export const offlineSideEffects = (hooks, options = defaults) => {
  const updater = createUpdater(options);
  const context = {
    options,
    hooks,
    updater
  };
  const stream = createStream(context);
  const { rehydrateOutbox, actionWasRequested, togglePause, restartProcess } = createTriggers(
    stream,
    context
  );

  return {
    rehydrate: rehydrateOutbox,
    addSideEffect: action => actionWasRequested(action),
    setPaused: paused => togglePause(paused),
    restart: restartProcess
  };
};
