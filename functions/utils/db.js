const admin = require("firebase-admin");

// Shared Firestore handle so every service reuses the same instance instead
// of each calling admin.firestore() independently.
const db = admin.firestore();

module.exports = db;
