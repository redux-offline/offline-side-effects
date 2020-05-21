import { pipe, tap, filter, share, makeSubject, publish } from 'wonka';
import { composeExchanges, createOperationFromAction, updates } from './utils';
import exchanges from './exchanges';

export const state = {
  outbox: [],
  status: 'idle'
};

export const createUpdater = queue => {
  function updater(type, payload = null) {
    if (type === updates.rehydrate) {
      Object.assign(state, payload);
      state.status = 'idle';
    }
    if (type === updates.busy) {
      state.status = payload ? 'busy' : 'idle';
    }
    if (type === updates.enqueue) {
      queue.enqueue(state.outbox, payload);
    }
    if (type === updates.dequeue) {
      queue.dequeue(state.outbox);
    }
  }

  return updater;
};

const defaults = {
  exchanges,
  queue: {
    peek: outbox => outbox[0],
    enqueue: (outbox, item) => outbox.push(item),
    dequeue: outbox => outbox.shift()
  }
};

const fallbackExchange = ops$ =>
  pipe(
    ops$,
    tap(operation => {
      console.error(operation);
    }),
    filter(() => false)
  );

const getState = () => state;
export const offlineSideEffects = (dispatch, options: any = defaults) => {
  const { queue } = options;
  const updateState = createUpdater(queue);
  const exchange = composeExchanges(options.exchanges);
  const { source: operations$, next: nextOperation } = makeSubject();
  const results$ = share(
    exchange({
      forward: fallbackExchange,
      client: {
        dispatch,
        updateState
      }
    })(operations$)
  );

  pipe(results$, publish);

  const trigger = action => {
    const operation = createOperationFromAction(action);
    if (operation) {
      nextOperation(operation);
    }

    if (state.status === 'idle') {
      const next = queue.peek(state.outbox);
      nextOperation(next);
    }
  };

  const updater = action => trigger(action);
  updater.getState = getState;
  return updater;
};
