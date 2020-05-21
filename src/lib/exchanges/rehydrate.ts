import { filter, pipe, tap, share, merge, map } from 'wonka';
import { updates } from '../utils';

const mapPayloadToState = payload => {
  return payload?.offline;
};

export const rehydrateState = ({ forward, client }) => ops$ => {
  const sharedOps$ = share(ops$);
  const requested$ = pipe(
    sharedOps$,
    // @ts-ignore
    filter(op => op.name === 'rehydrate'),
    // @ts-ignore
    map(op => ({ name: 'load', data: mapPayloadToState(op.payload) })),
    // @ts-ignore
    tap(op => {
      // @ts-ignore
      client.updateState(updates.rehydrate, op.data);
    })
  );

  const forward$ = pipe(
    sharedOps$,
    // @ts-ignore
    filter(op => op.name !== 'rehydrate'),
    forward
  );

  return merge([requested$, forward$]);
};
