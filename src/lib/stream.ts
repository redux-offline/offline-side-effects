import { fromPromise, onStart, pipe, subscribe, takeWhile, fromArray } from 'wonka';

const state = {
  outbox: [],
  status: 'idle' // 'idle', 'busy', 'paused'
};

const updates = {
  busy: 'busy',
  enqueue: 'enqueue',
  dequeue: 'dequeue',
  pause: 'pause'
};

const busy = () => ({ type: 'busy', payload: state.status });

const defaults = {
  storageKey: 'offline-side-effects',
  storage: localStorage,
  queue: {
    peek: outbox => outbox[0],
    enqueue: (outbox, item) => outbox.push(item),
    dequeue: outbox => outbox.shift()
  }
};

const createUpdater = options => {
  function updater(type, payload = null) {
    if (type === updates.busy) {
      state.status = state.status === 'idle' ? 'busy' : 'idle';
    }
    if (type === updates.enqueue) {
      options.queue.enqueue(state.outbox, payload);
    }
    if (type === updates.dequeue) {
      options.queue.dequeue(state.outbox);
    }
    if(type === updates.pause) {
      state.status = payload ? 'paused' : 'idle';
    }
    options.storage.setItem(options.storageKey, JSON.stringify(state.outbox));
  }
  return updater;
};

const rehydrateOutbox = (options, fn) => {
  const stringState = options.storage.getItem(options.storageKey);
  if (stringState) {
    state.outbox = JSON.parse(stringState);
  }

  if(state.outbox.length > 0) {
    fn();
  }
};

export const offlineSideEffects = (hooks, options = defaults) => {
  const updateState = createUpdater(options);

  const actionWasRequested = (action) => {
    if (action.meta?.effect) {
      updateState(updates.enqueue, action);
      hooks.onRequest(action);
    }
    processOutbox();
  };

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  const send = (next) => {
    updateState(updates.busy);
    fetch(next.meta.effect)
      .then(res => {
        if (res.status >= 200 && res.status < 400) {
          return res.json();
        }
        return Promise.reject(res.json());
      })
      .then(data => {
        hooks.onCommit({ ...next.meta.commit, payload: data });
      })
      .catch(err => {
        hooks.onRollback({ ...next.meta.rollback, payload: err })
      })
      .finally(() => {
        updateState(updates.dequeue);
        updateState(updates.busy);
        hooks.onStatusChange(busy());
        processOutbox();
      });
  };

  const processOutbox = () => {
    const peeked = options.queue.peek(state.outbox);
    if (peeked && state.status === 'idle') {
      send(peeked)
    }
  };

  const togglePause = (paused) => {
    updateState(updates.pause, paused);
    if (!paused) {
      processOutbox();
    }
  };

  rehydrateOutbox(options, processOutbox);
  return {
    addSideEffect: action => actionWasRequested(action),
    setPaused: paused => togglePause(paused)
  };
};
