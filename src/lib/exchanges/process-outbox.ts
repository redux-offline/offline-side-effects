import { filter, pipe, tap, share, map, merge } from 'wonka';
import { updates } from '../utils';

export const processOutbox = ({ forward, client }) => ops$ => {
  const sharedOps$ = share(ops$);

  const effect$ = pipe(
    sharedOps$,
    // @ts-ignore
    filter(op => op.name === 'request'),
    // @ts-ignore
    map(op => ({ ...op, name: 'effect' })),
    // @ts-ignore
    tap(op => {
      client.updateState(updates.enqueue, op);
    })
  );

  const forward$ = pipe(
    sharedOps$,
    // @ts-ignore
    filter(op => op.name !== 'request'),
    forward
  );

  return merge([effect$, forward$]);
};
