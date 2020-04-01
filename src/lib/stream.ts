import { fromPromise, onStart, pipe, subscribe, takeWhile, fromArray } from 'wonka';

const state = {
  outbox: [],
  status: 'idle'
};

const updates = {
  busy: 'busy',
  enqueue: 'enqueue',
  dequeue: 'dequeue'
};

const busy = () => ({ type: 'busy', payload: state.status });

const defaults = {
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
  }

  return updater;
};

export const offlineSideEffects = (dispatch, options = defaults) => {
  const updateState = createUpdater(options);

  const actionWasRequested = (dispatch, action) => {
    if (action.meta?.effect) {
      updateState(updates.enqueue, action);
      processOutbox(dispatch, action);
    }
    processOutbox(dispatch, null);
  };

  const send = (dispatch, next) =>
    pipe(
      fromPromise(
        fetch(next.meta.effect)
          .then(res => {
            if (res.status >= 200 && res.status < 400) {
              return res.json();
            }
            return Promise.reject(res.json());
          })
          .then(data => ({ success: true, data }))
          .catch(err => ({ success: false, data: err }))
      ),
      subscribe((result: any) => {
        if (result.success) {
          dispatch({ ...next.meta.commit, payload: result.data });
        } else {
          dispatch({ ...next.meta.rollback, payload: result.data });
        }
        updateState(updates.dequeue);
        updateState(updates.busy);
        dispatch(busy());
        processOutbox(dispatch, null);
      })
    );

  const processOutbox = (dispatch, action = null) => {
    const peeked = options.queue.peek(state.outbox);
    const list$ = peeked ? [peeked] : [];
    const source = fromArray(list$);
    pipe(
      source,
      onStart(() => {
        if (action) {
          dispatch(action);
        }
      }),
      takeWhile(() => state.status === 'idle'),
      subscribe(next => {
        updateState(updates.busy);
        dispatch(busy());
        send(dispatch, next);
      })
    );
  };

  return action => actionWasRequested(dispatch, action);
};
