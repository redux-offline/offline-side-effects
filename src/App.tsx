import React, { useEffect, useRef, useMemo } from 'react';
import reducer, { initialState } from './lib/reducer';
import { offlineSideEffects } from './lib/stream';
import createPersistedReducer from 'use-persisted-reducer';

const usePersistedReducer = createPersistedReducer('app-state')

const detectNetwork = callback => {
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
    callback(window.navigator.onLine);
  }
};

function App() {
  const [state, dispatch] = usePersistedReducer(reducer, initialState);
  const paused = useRef(false);
  const hooks = {
    onRequest: dispatch,
    onRollback: dispatch,
    onCommit: dispatch,
    onStatusChange: dispatch
  };

  const { addSideEffect, setPaused } = useMemo(() => { return offlineSideEffects(hooks); }, []);

  useEffect(() => {
    detectNetwork(online => setPaused(!online));
  }, []);

  useEffect(() => {
    let id = 1;
    const makeRequest = _id =>
      // @ts-ignore
      addSideEffect({
        type: 'request',
        payload: { _id },
        meta: {
          effect: `https://jsonplaceholder.typicode.com/todos/${_id}`,
          commit: { type: 'commit', meta: { _id } },
          rollback: { type: 'rollback', meta: { _id } }
        }
      });
    const onKeyPress = () => {
      makeRequest(id);
      id += 1;
    };
    window.addEventListener('keypress', onKeyPress);

    return () => {
      window.removeEventListener('keypress', onKeyPress);
    };
  }, [addSideEffect]);

  return (
    <div style={{ margin: '12px 20px' }}>
      <div style={{ height: 220, padding: '0 15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p>status: {state.status} </p>
            <p>progress: {state.progress}</p>
          </div>
          <pre style={{ height: 120, width: '50%', overflow: 'scroll' }}>
            <code>{state.commitData && JSON.stringify(state.commitData, null, 2)}</code>
          </pre>
        </div>
        <h1 style={{ textAlign: 'center' }}>Press and hold any key!</h1>
      </div>
      <div style={{ overflow: 'hidden', height: 'calc(100vh - 260px)' }}>
        <ol reversed>
          {state.users.map((user) => (
            <li key={user.id}>
              <p>{user.title}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default App;
