require("dotenv").config();
const functions = require("firebase-functions/v1");
const express = require("express");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");
const { initializeApp } = require("firebase-admin/app");
const cors = require("cors");
const morgan = require("morgan");
const { signToken } = require("./utils/AuthUtils");
app.use(cors({ origin: true }));

app.use(morgan("common"));

// No explicit credential/project here on purpose: Cloud Functions injects
// Application Default Credentials + project context automatically at deploy
// time, so the same source deploys correctly to whichever project it's
// targeted at (prod `mamusialibrary` or `staging` mamusialibrary-staging)
// with no per-project branching. For local emulator/shell use, set
// GOOGLE_APPLICATION_CREDENTIALS in functions/.env.local (gitignored,
// emulator-only, never deployed) instead.
initializeApp();

const db = require("./utils/db");

app.get("/", async (req, res) => {
  res.json({
    kocham: "Damsa",
    boJest: "super",
  });
});

app.use("/books", require("./services/BooksService"));
app.use("/categories", require("./services/CategoriesService"));
app.use("/places", require("./services/PlacesService"));
app.use("/readers", require("./services/ReadersService"));
app.use("/borrowings", require("./services/BorrowingsService"));

app.post("/login", async (req, res) => {
  const userName = req.body.name;
  const password = req.body.password;
  const users = db.collection("users");
  const result = await users.where("name", "==", userName).get();
  const result_password = result.docs.map((x) => x.data().password)[0];
  if (result_password && bcrypt.compareSync(password, result_password)) {
    const signedToken = signToken({ userName });
    res.json({
      signedToken,
    });
  } else {
    res.sendStatus(403);
  }
});

exports.appEurope = functions.region('europe-west1').https.onRequest(app);
