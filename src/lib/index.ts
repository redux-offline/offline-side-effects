import { Options, Hooks, Context } from './types';
import defaults from './defaults';
import { createUpdater } from './updater';
import { createTriggers } from './triggers';
import { createStream } from './stream';

export const offlineSideEffects = (providedHooks: Partial<Hooks>, providedOptions?: Options) => {
  const hooks = {
    onRequest: () => {},
    onCommit: () => {},
    onRollback: () => {},
    onStatusChange: () => {},
    onSerialize: () => {},
    onRetry: () => {},
    ...providedHooks
  };
  const options = {
    ...defaults,
    ...providedOptions
  };
  const updater = createUpdater(options, hooks);
  const context: Context = {
    options,
    hooks,
    updater
  };
  const stream = createStream(context);
  const {
    rehydrateState,
    actionWasRequested,
    togglePause,
    restartProcess,
    resetState
  } = createTriggers(stream, context);

  return {
    rehydrateState,
    addSideEffect: actionWasRequested,
    setPaused: togglePause,
    restart: restartProcess,
    reset: resetState
  };
};
