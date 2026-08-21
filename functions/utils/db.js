const { getFirestore } = require("firebase-admin/firestore");

// Shared Firestore handle so every service reuses the same instance instead
// of each calling getFirestore() independently.
const db = getFirestore();

module.exports = db;
