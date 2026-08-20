// Manual Jest mock for firebase-functions. Supplies a fixed test JWT secret
// instead of depending on the real .runtimeconfig.json, and stubs the
// https.onRequest/region(...).https.onRequest wrappers as identity
// functions in case index.js itself is ever required in a test.
const identity = (app) => app;

module.exports = {
  config: jest.fn(() => ({ mamalibrary: { secret: "test-secret" } })),
  https: { onRequest: identity },
  region: jest.fn(() => ({ https: { onRequest: identity } })),
};
