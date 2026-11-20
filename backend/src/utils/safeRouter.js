// Express 4 does not automatically forward rejected async route promises.
// Wrap route callbacks so unexpected database/service errors reach the error handler.
export default function safeRouter(router) {
  for (const method of ['get', 'post', 'patch', 'put', 'delete']) {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) => original(path, ...handlers.map(handler =>
      typeof handler === 'function'
        ? (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
        : handler
    ));
  }
  return router;
}
