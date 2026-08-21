const fakeDb = require("./helpers/fakeFirestore");

jest.mock("firebase-admin/app");
jest.mock("firebase-admin/firestore");

// AuthUtils reads the JWT secret from process.env.JWT_SECRET (see
// utils/AuthUtils.js) instead of functions.config(), which no longer works.
// Matches the TEST_SECRET literal used throughout test/services/simpleCrud.shared.js.
process.env.JWT_SECRET = "test-secret";

afterEach(() => {
  fakeDb.__reset();
  // Guarantees any jest.spyOn(...) from a test (e.g. on express.response.json)
  // is torn down even if the test throws before reaching its own cleanup.
  jest.restoreAllMocks();
});
