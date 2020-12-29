type Updater = (type: string, payload?: any) => void;
type State = {
  outbox: any[];
  status: 'idle' | 'busy';
  paused: boolean;
  retryScheduled: number | null;
  retryCount: number;
};
const initialState: State = {
  outbox: [],
  status: 'idle', // 'idle', 'busy'
  paused: false,
  retryScheduled: null,
  retryCount: 0
};

export const updates = {
  busy: 'busy',
  enqueue: 'enqueue',
  dequeue: 'dequeue',
  pause: 'pause',
  rehydrate: 'rehydrate',
  scheduleRetry: 'scheduleRetry',
  completeRetry: 'completeRetry'
};

export const createUpdater = (options, hooks): [State, Updater] => {
  const state = { ...initialState };
  function updater(type, payload = null) {
    if (type === updates.rehydrate) {
      if (payload) {
        state.outbox = payload;
      }
    }
    if (type === updates.busy) {
      state.status = state.status === 'idle' ? 'busy' : 'idle';
    }
    if (type === updates.enqueue) {
      options.queue.enqueue(state.outbox, payload);
    }
    if (type === updates.dequeue) {
      options.queue.dequeue(state.outbox);
      state.retryCount = initialState.retryCount;
    }
    if (type === updates.pause) {
      state.paused = payload;
    }
    if (type === updates.scheduleRetry) {
      state.retryScheduled = payload;
      state.retryCount = state.retryCount + 1;
    }
    if (type === updates.completeRetry) {
      state.retryScheduled = initialState.retryScheduled;
    }

    hooks.onSerialize(state.outbox);
  }

  return [state, updater];
};
