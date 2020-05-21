export const updates = {
  rehydrate: 'rehydrate',
  busy: 'busy',
  enqueue: 'enqueue',
  dequeue: 'dequeue'
};
export const busy = () => ({ type: 'busy' });

export const createOperationFromAction = action => {
  if (!action) {
    return null;
  }

  const { type, meta } = action;
  if (type === 'rehydrate') {
    return {
      action,
      name: 'rehydrate'
    };
  }

  if (meta.effect) {
    return {
      action,
      name: 'request'
    };
  }

  return null;
};

// as per URQL library
/** This composes an array of Exchanges into a single ExchangeIO function */
export const composeExchanges = exchanges => {
  if (exchanges.length === 1) {
    return exchanges[0];
  }

  return payload => {
    return exchanges.reduceRight((forward, exchange) => {
      return exchange({ client: payload.client, forward });
    }, payload.forward);
  };
};
