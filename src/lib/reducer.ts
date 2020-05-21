import produce from 'immer';

// USER LAND REDUCER
export const initialState = {
  status: 'idle',
  commitData: null,
  progress: 'idle',
  todos: []
};

function reducer(state = initialState, action: any) {
  return produce(state, draft => {
    const getIndexToUpdate = id => draft.todos.findIndex(user => user.id === id);

    if (action.type === 'rehydrate') {
      if (action.payload) {
        Object.assign(draft, action.payload.app);
      }
    }

    if (action.type === 'busy') {
      draft.status = action.payload;
    }

    if (action.type === 'request') {
      draft.progress = `processing request ${action.payload._id}`;
      draft.commitData = null;
      // @ts-ignore
      draft.todos.unshift({ id: action.payload._id, title: 'Loading...' });
    }

    if (action.type === 'commit') {
      draft.progress = `committed ${action.payload.id}`;
      draft.commitData = action.payload;
      const index = getIndexToUpdate(action.meta._id);
      draft.todos.splice(index, 1, action.payload);
    }

    if (action.type === 'rollback') {
      draft.progress = `rolled back ${action.meta._id}`;
      draft.commitData = null;
      const index = getIndexToUpdate(action.meta._id);
      draft.todos.splice(index, 1);
    }
  });
}

export default reducer;
