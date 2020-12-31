import { State, UpdateState, Updater, Updates, Options, Hooks, Action } from './types';

const initialState: State = {
  outbox: [],
  status: 'idle', // 'idle', 'busy'
  paused: false,
  retryScheduled: null,
  retryCount: 0,
  lastTransaction: 0
};

export const createUpdater = (options: Options, hooks: Hooks): Updater => {
  const state = { ...initialState };
  const updateState: UpdateState = (type: Updates, payload = null) => {
    if (type === Updates.rehydrate) {
      if (payload) {
        Object.assign(state, payload);
      }
    }
    if (type === Updates.busy) {
      state.status = state.status === 'idle' ? 'busy' : 'idle';
    }
    if (type === Updates.enqueue) {
      const transaction = state.lastTransaction + 1;
      payload.meta = { ...payload.meta, transaction };
      state.outbox = options.queue.enqueue(state.outbox, payload);
      state.lastTransaction = transaction;
    }
    if (type === Updates.dequeue) {
      state.outbox = options.queue.dequeue(state.outbox, payload as Action);
      state.retryCount = initialState.retryCount;
    }
    if (type === Updates.pause) {
      state.paused = payload;
    }
    if (type === Updates.scheduleRetry) {
      state.retryScheduled = payload;
      state.retryCount = state.retryCount + 1;
    }
    if (type === Updates.completeRetry) {
      state.retryScheduled = initialState.retryScheduled;
    }

    hooks.onSerialize(state);
  };

  return [state, updateState];
};
