import { Options, Hooks, Context } from './types';
import defaults from './defaults';
import { createUpdater } from './updater';
import { createTriggers } from './triggers';
import { createStream } from './stream';

export const offlineSideEffects = (providedHooks: Partial<Hooks>, options: Options = defaults) => {
  const hooks = {
    onRequest: () => {},
    onCommit: () => {},
    onRollback: () => {},
    onStatusChange: () => {},
    onEnd: () => {},
    onSerialize: () => {},
    ...providedHooks
  };
  const updater = createUpdater(options, hooks);
  const context: Context = {
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
    rehydrateOutbox,
    addSideEffect: action => actionWasRequested(action),
    setPaused: paused => togglePause(paused),
    restart: restartProcess
  };
};
