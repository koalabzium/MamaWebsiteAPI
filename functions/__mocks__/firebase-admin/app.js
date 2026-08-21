// Manual Jest mock for firebase-admin/app (the modular API's replacement
// for the old admin.initializeApp/admin.credential.cert namespace).
module.exports = {
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApp: jest.fn(),
  getApps: jest.fn(() => []),
  deleteApp: jest.fn(),
};
