type Updater = (type: string, payload?: any) => void;
type State = {
  outbox: any[];
  status: 'idle' | 'busy';
  paused: boolean;
};
const initialState: State = {
  outbox: [],
  status: 'idle', // 'idle', 'busy'
  paused: false
};

export const updates = {
  busy: 'busy',
  enqueue: 'enqueue',
  dequeue: 'dequeue',
  pause: 'pause',
  rehydrate: 'rehydrate'
};

export const createUpdater = (options): [State, Updater] => {
  const state = { ...initialState };
  function updater(type, payload = null) {
    if (type === updates.rehydrate) {
      const stringState = options.storage.getItem(options.storageKey);
      if (stringState) {
        state.outbox = JSON.parse(stringState);
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
    }
    if (type === updates.pause) {
      state.paused = payload;
    }
    options.storage.setItem(options.storageKey, JSON.stringify(state.outbox));
  }

  return [state, updater];
};
