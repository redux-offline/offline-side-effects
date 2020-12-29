export default {
  queue: {
    peek: outbox => outbox[0],
    enqueue: (outbox, item) => outbox.push(item),
    dequeue: outbox => outbox.shift()
  },
  effect: url =>
    fetch(url).then(res => {
      function NetworkError(response: {} | string, status: number) {
        this.name = 'NetworkError';
        this.status = status;
        this.response = response;
      }

      NetworkError.prototype = Error.prototype;

      if (res.ok) {
        return res.json();
      }
      return res.json().then(body => {
        throw new NetworkError(body || '', res.status);
      });
    }),
  alterStream: (defaultMiddleware, _context) => defaultMiddleware,
  discard: (error, action, retries) => {
    if ('status' in error) {
      // discard http 4xx errors
      return error.status >= 400 && error.status < 500;
    }

    // not a network error -> we retry once
    return retries >= 1;
  },
  retry: (action, retries) => {
    const exponentialBackoff = [
      1000, // After 1 seconds
      1000 * 5, // After 5 seconds
      1000 * 15, // After 15 seconds
      1000 * 30, // After 30 seconds
      1000 * 60, // After 1 minute
      1000 * 60 * 3, // After 3 minutes
      1000 * 60 * 5, // After 5 minutes
      1000 * 60 * 10, // After 10 minutes
      1000 * 60 * 30, // After 30 minutes
      1000 * 60 * 60 // After 1 hour
    ];

    return exponentialBackoff[retries] || null
  }
};
