import { updates } from './updater';

export function createMiddleware({ updater, options, hooks }) {
  const [state, updateState] = updater;
  const processOutbox = next => {
    const peeked = options.queue.peek(state.outbox);
    if (peeked && state.status === 'idle' && !state.paused) {
      return next(peeked);
    }
  };

  const send = async (next, action) => {
    updateState(updates.busy);
    try {
      const data = await options.effect(action.meta.effect);
      hooks.onCommit({ ...action.meta.commit, payload: data });
    } catch (err) {
      hooks.onRollback({ ...action.meta.rollback, payload: err });
    } finally {
      updateState(updates.dequeue);
      updateState(updates.busy);
      hooks.onStatusChange(state.status);
    }
    next();
  };

  const wrapUp = next => {
    hooks.onEnd();
    next();
  };

  return {
    processOutbox,
    send,
    wrapUp
  };
}
