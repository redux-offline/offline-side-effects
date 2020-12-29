import React, { useEffect, useMemo } from 'react';
import createPersistedReducer from 'use-persisted-reducer';
import { offlineSideEffects } from './lib';
import reducer, { initialState } from './reducer';

const usePersistedReducer = createPersistedReducer('app-state');

const toggleBusy = payload => ({ type: 'busy', payload });

const detectNetwork = callback => {
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    callback(window.navigator.onLine);
  }

  return () => {
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    }
  };
};

function App() {
  const [state, dispatch] = usePersistedReducer(reducer, initialState);
  const hooks = {
    onRequest: dispatch,
    onRollback: dispatch,
    onCommit: dispatch,
    onStatusChange: status => dispatch(toggleBusy(status)),
    onEnd: () => {}
  };

  const { addSideEffect, setPaused, rehydrate } = useMemo(() => offlineSideEffects(hooks), []);

  useEffect(() => {
    rehydrate();
    detectNetwork(online => setPaused(!online));
  }, []);

  useEffect(() => {
    let id = state.users.length + 1;
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
    const onKeyPress = e => {
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
      }
      makeRequest(id);
      // React is too slow updating this value
      id += 1;
    };
    window.addEventListener('keypress', onKeyPress);

    return () => {
      window.removeEventListener('keypress', onKeyPress);
    };
    // React is too slow updating state.users value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSideEffect]);

  const onClickRefresh = () => {
    localStorage.clear();
    window.location.reload();
  };

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
          <div>
            <button onClick={onClickRefresh}>Refresh</button>
          </div>
        </div>
        <h1 style={{ textAlign: 'center' }}>Press and hold any key!</h1>
      </div>
      <div style={{ overflow: 'auto', height: 'calc(100vh - 260px)' }}>
        <ol reversed>
          {state.users.map(user => (
            <li key={user.id} style={{ color: user.rolledback ? '#ff0000' : '#000000' }}>
              <p>{user.title}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default App;
