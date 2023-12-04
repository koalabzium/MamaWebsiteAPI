require("dotenv").config();
const functions = require("firebase-functions");
const express = require("express");
const app = express();
const port = 3300;
app.use(express.json());
const bcrypt = require("bcrypt");
const admin = require("firebase-admin");
const cors = require("cors");
var serviceAccount = require("./mamusiaLibrary-227be22cdd3a.json");
const morgan = require("morgan");
const { signToken } = require("./utils/AuthUtils");
app.use(cors({ origin: true }));

app.use(morgan("common"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mamusialibrary.firebaseio.com",
});

let db = admin.firestore();

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
  if (bcrypt.compareSync(password, result_password)) {
    const signedToken = signToken({ userName });
    res.json({
      signedToken,
    });
  } else {
    res.sendStatus(403);
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
exports.app = functions.https.onRequest(app);

exports.appEurope = functions.region('europe-west1').https.onRequest(app);
