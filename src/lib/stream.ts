const state = {
  outbox: [],
  status: 'idle', // 'idle', 'busy'
  paused: false
};

const updates = {
  busy: 'busy',
  enqueue: 'enqueue',
  dequeue: 'dequeue',
  pause: 'pause'
};

const defaults = {
  storageKey: 'offline-side-effects',
  storage: localStorage,
  queue: {
    peek: outbox => outbox[0],
    enqueue: (outbox, item) => outbox.push(item),
    dequeue: outbox => outbox.shift()
  },
  effect: url =>
    fetch(url).then(res => {
      if (res.status >= 200 && res.status < 400) {
        return res.json();
      }
      return Promise.reject(res.json());
    })
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
    if (type === updates.pause) {
      state.paused = payload;
    }
    options.storage.setItem(options.storageKey, JSON.stringify(state.outbox));
  }
  return updater;
};

export const offlineSideEffects = (hooks, options = defaults) => {
  const updateState = createUpdater(options);

  // TRIGGERS
  const actionWasRequested = action => {
    if (action.meta?.effect) {
      updateState(updates.enqueue, action);
      hooks.onRequest(action);
    }
    startStream();
  };

  const togglePause = paused => {
    updateState(updates.pause, paused);
    if (!paused) {
      startStream();
    }
  };

  const rehydrateOutbox = () => {
    const stringState = options.storage.getItem(options.storageKey);
    if (stringState) {
      state.outbox = JSON.parse(stringState);
    }

    if (state.outbox.length > 0) {
      startStream();
    }
  };

  const restartProcess = () => {
    startStream();
  };

  // STREAM MIDDLEWARE
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

  const stream = [processOutbox, send, wrapUp];

  const startStream = () => {
    let i = 0;
    const next = async prev => {
      const current = stream[i];
      if (current) {
        i++;
        await current(next, prev);
      } else if (state.outbox.length > 0) {
        restartProcess();
      }
    };

    next(null).catch(console.error);
  };

  // TRIGGERS
  // ======
  // A) rehydrateOutbox => 1.
  // B) togglePause => 1.
  // C) actionWasRequested => 1.
  // D) restartProcess => 1.

  // STREAM MIDDLEWARE
  // ======
  // [1. processOutbox, 2. send]

  // HOOKS
  // =======
  // onRequest
  // onRollback
  // onCommit
  // onStatusChange
  // onEnd

  return {
    rehydrate: rehydrateOutbox,
    addSideEffect: action => actionWasRequested(action),
    setPaused: paused => togglePause(paused),
    restart: restartProcess
  };
};
