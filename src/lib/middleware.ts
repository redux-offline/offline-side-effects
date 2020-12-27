import { updates } from './updater';

const sleep = ms => new Promise(res => setTimeout(res, ms));

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
    let error;
    try {
      const data = await options.effect(action.meta.effect);
      hooks.onCommit({ ...action.meta.commit, payload: data });
      updateState(updates.dequeue);
    } catch (err) {
      hooks.onRollback({ ...action.meta.rollback, payload: err });
      error = err;
    } finally {
      updateState(updates.busy);
      hooks.onStatusChange(state.status);
      next(error, action);
    }
  };

  const retry = async (next, error, action) => {
    if (!error) {
      next();
      return;
    }
    let mustDiscard = true;
    try {
      mustDiscard = await options.discard(error, action, state.retries);
    } catch (e) {
      console.warn(e);
    }

    if (!mustDiscard) {
      const delay = options.retry(action, state.retries);
      if (delay != null) {
        await sleep(delay);
        next();
      }
    }
  }

  const wrapUp = next => {
    hooks.onEnd();
    next();
  };

  return {
    processOutbox,
    send,
    // retry,
    wrapUp
  };
}
