export default {
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
    }),
  alterStream: (defaultMiddleware, _context) => defaultMiddleware
};
