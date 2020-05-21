import React, { useReducer, useCallback, useEffect, useState, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import reducer, { initialState } from './lib/reducer';
import { offlineSideEffects } from './lib/stream';

function useOfflineSideEffect(dispatch) {
  return useCallback(offlineSideEffects(dispatch), []);
}

function App() {
  const [loaded, setLoaded] = useState(true);
  const [state, dispatch] = useReducer(reducer, initialState);
  const addSideEffect = useOfflineSideEffect(dispatch);
  const initialItem = useRef(1);
  useEffect(() => {
    return;
    if (!loaded) {
      const payload = JSON.parse(localStorage.getItem('aaaapersisted'));
      initialItem.current = payload.app.todos.length;
      addSideEffect({ type: 'rehydrate', payload });
      dispatch({ type: 'rehydrate', payload });
      setLoaded(true);
    }

    if (loaded) {
      const persistedState = {
        app: state,
        offline: addSideEffect.getState()
      };
      localStorage.setItem('aaaapersisted', JSON.stringify(persistedState));
    }
  });
  useEffect(() => {
    const makeRequest = _id => {
      const request = {
        type: 'request',
        payload: { _id },
        meta: {
          effect: `https://jsonplaceholder.typicode.com/todos/${_id}`,
          commit: { type: 'commit', meta: { _id } },
          rollback: { type: 'rollback', meta: { _id } }
        }
      };
      dispatch(request);
      addSideEffect(request);
    };
    const onKeyPress = () => {
      makeRequest(initialItem.current += 1);
    };
    window.addEventListener('keypress', onKeyPress);

    return () => {
      window.removeEventListener('keypress', onKeyPress);
    };
  }, [addSideEffect]);

  if (!loaded) {
    return null;
  }

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
          {state.todos.map(todo => (
            <li key={todo.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                <p style={{ maxWidth: '80%', overflow: 'hidden', marginRight: '15px' }}>
                  {todo.title}
                </p>
                <input type="checkbox" checked={todo.completed} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default App;
