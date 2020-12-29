import { updates } from './updater';

const sleep = ms => new Promise(res => setTimeout(res, ms));

export function createMiddleware({ updater, options, hooks }) {
  const [state, updateState] = updater;
  const processOutbox = async next => {
    const peeked = options.queue.peek(state.outbox);
    if (peeked && state.status === 'idle' && !state.paused) {
      if (state.retryScheduled !== null) {
        await sleep(state.retryScheduled);
        updateState(updates.completeRetry);
      }
      return next(peeked);
    }
  };

  const send = async (next, action) => {
    updateState(updates.busy);
    hooks.onStatusChange(state.status);
    let error;
    try {
      const data = await options.effect(action.meta.effect);
      hooks.onCommit(data, action.meta.commit);
      updateState(updates.dequeue);
    } catch (err) {
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
      mustDiscard = await options.discard(error, action, state.retryCount);
    } catch (e) {
      console.warn(e);
    }

    if (!mustDiscard) {
      const delay = options.retry(action, state.retryCount);
      if (delay != null) {
        updateState(updates.scheduleRetry, delay);
      }
    } else {
      hooks.onRollback(error, action.meta.rollback);
      updateState(updates.dequeue);
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
    retry,
    wrapUp
  };
}
