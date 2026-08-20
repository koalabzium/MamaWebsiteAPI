const fakeDb = require("./helpers/fakeFirestore");

jest.mock("firebase-admin");
jest.mock("firebase-functions");

afterEach(() => {
  fakeDb.__reset();
  // Guarantees any jest.spyOn(...) from a test (e.g. on express.response.json)
  // is torn down even if the test throws before reaching its own cleanup.
  jest.restoreAllMocks();
});
