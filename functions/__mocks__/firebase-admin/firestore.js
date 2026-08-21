// Manual Jest mock for firebase-admin/firestore (the modular API's
// replacement for the old admin.firestore() namespace). Every service
// resolves its Firestore handle through the shared functions/utils/db.js,
// so mocking getFirestore() here is enough to intercept all Firestore
// access app-wide.
const fakeDb = require("../../test/helpers/fakeFirestore");

module.exports = {
  getFirestore: jest.fn(() => fakeDb),
};
