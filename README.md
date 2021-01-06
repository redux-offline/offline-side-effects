# offline-side-effects
The JS focused library for offline first async side effects. This library takes all the learnings of building Redux-Offline and extracts them into a pure JS module that can be used in almost any context.

The main aspects that this library focuses on are:
- Requests pausing and recording when offline
- Optimistic updates
- Request retries using exponential backoff
- Rollback on errors
- Requests persistence across sessions

## API
The library contains 3 actors: Middleware, Hooks and Triggers.

### Middleware
The middleware are functions that perform a specific step in the side effect lifecycle.
The library comes
