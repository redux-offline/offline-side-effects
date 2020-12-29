import { filter, make, map, pipe, share, merge, tap, mergeMap, takeLast } from 'wonka';
import { updates, busy } from '../utils';

const makeFetch = op =>
  make(({ next, complete }) => {
    fetch(op.action.meta.effect)
      .then(res => {
        if (res.status >= 200 && res.status < 400) {
          return res.json();
        }
        return Promise.reject(res.json());
      })
      .then(data => next({ action: op.action.meta.commit, name: 'commit', data }))
      .catch(err => next({ actionL: op.action.meta.rollback, name: 'rollback', data: err }))
      .finally(() => complete());

    return () => {};
  });

export const send = ({ forward, client }) => ops$ => {
  const sharedOps$ = share(ops$);
  const fetched$ = pipe(
    sharedOps$,
    // @ts-ignore
    filter(op => op.name === 'effect'),
    tap(op => {
      // @ts-ignore
      client.updateState(updates.busy, true);
      // @ts-ignore
      client.dispatch(busy());
    }),

    mergeMap(op => {
      debugger;
      return makeFetch(op);
    })
  );

  const forward$ = pipe(
    sharedOps$,
    // @ts-ignore
    filter(op => op.name !== 'effect'),
    forward
  );

  return merge([fetched$, forward$]);
};

export const processResult = ({ forward, client }) => ops$ => {
  const sharedOps$ = share(ops$);
  const result$ = pipe(
    sharedOps$,
    forward,
    // @ts-ignore
    filter(op => op.name === 'commit' || op.name === 'rollback'),
    tap(op => {
      // @ts-ignore
      client.dispatch({ ...op.action, payload: op.data });
    }),
    map(op => ({ name: 'finished' }))
  );

  const forward$ = pipe(
    sharedOps$,
    // @ts-ignore
    filter(op => op.name !== 'commit' || op.name === 'rollback'),
    forward
  );

  return merge([result$, forward$]);
};

export const processCompleted = ({ forward, client }) => ops$ => {
  const sharedOps$ = share(ops$);
  const finished$ = pipe(
    sharedOps$,
    forward,
    // @ts-ignore
    filter(op => op.name === 'finished'),
    tap(op => {
      // @ts-ignore
      const { updateState, dispatch } = client;
      updateState(updates.dequeue);
      dispatch(busy());
      updateState(updates.busy, false);
    })
  );

  const forward$ = pipe(
    sharedOps$,
    // @ts-ignore
    filter(op => op.name !== 'finished'),
    forward
  );

  return merge([finished$, forward$]);
};
