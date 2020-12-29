import { State, UpdateState, Updater, Updates, Options, Hooks } from './types';

const initialState: State = {
  outbox: [],
  status: 'idle', // 'idle', 'busy'
  paused: false,
  retryScheduled: null,
  retryCount: 0
};

export const createUpdater = (options: Options, hooks: Hooks): Updater => {
  const state = { ...initialState };
  const updateState: UpdateState = (type: Updates, payload = null) => {
    if (type === Updates.rehydrate) {
      if (payload) {
        state.outbox = payload;
      }
    }
    if (type === Updates.busy) {
      state.status = state.status === 'idle' ? 'busy' : 'idle';
    }
    if (type === Updates.enqueue) {
      options.queue.enqueue(state.outbox, payload);
    }
    if (type === Updates.dequeue) {
      options.queue.dequeue(state.outbox);
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

    hooks.onSerialize(state.outbox);
  };

  return [state, updateState];
};
