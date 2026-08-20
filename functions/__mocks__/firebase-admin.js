// Manual Jest mock for firebase-admin. Every service resolves its Firestore
// handle through the shared functions/utils/db.js, so mocking firestore()
// here is enough to intercept all Firestore access app-wide (and it covers
// index.js's admin.initializeApp/admin.credential.cert calls for free).
const fakeDb = require("../test/helpers/fakeFirestore");

module.exports = {
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  firestore: jest.fn(() => fakeDb),
};
