import {
  Updates,
  Context,
  ProcessOutboxMiddleware,
  SendMiddleware,
  RetryMiddleware,
  WrapUpMiddleware
} from './types';

const sleep = ms => new Promise(res => setTimeout(res, ms));

export function createMiddleware({ updater, options, hooks }: Context) {
  const [state, updateState] = updater;

  const processOutbox: ProcessOutboxMiddleware = async next => {
    const peeked = options.queue.peek(state.outbox);
    if (peeked && state.status === 'idle' && !state.paused) {
      if (state.retryScheduled !== null) {
        await sleep(state.retryScheduled);
        updateState(Updates.completeRetry);
      }
      await next(peeked);
    }
  };

  const send: SendMiddleware = async (next, action) => {
    updateState(Updates.busy);
    hooks.onStatusChange(state.status);
    let error;
    try {
      const data = await options.effect(action.meta.effect);
      hooks.onCommit(data, action.meta.commit);
      updateState(Updates.dequeue, action);
    } catch (err) {
      error = err;
    } finally {
      updateState(Updates.busy);
      hooks.onStatusChange(state.status);
      await next(error, action);
    }
  };

  const retry: RetryMiddleware = async (next, error, action) => {
    if (!error) {
      await next();
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
        updateState(Updates.scheduleRetry, delay);
      }
    } else {
      hooks.onRollback(error, action.meta.rollback);
      updateState(Updates.dequeue);
    }
    await next();
  };

  const wrapUp: WrapUpMiddleware = async next => {
    hooks.onEnd();
    await next();
  };

  return {
    processOutbox,
    send,
    retry,
    wrapUp
  };
}
