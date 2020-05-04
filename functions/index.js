const functions = require("firebase-functions");
const express = require("express");
const app = express();
const port = 3300;
app.use(express.json());
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const admin = require("firebase-admin");
const cors = require("cors");
var serviceAccount = require("./mamusiaLibrary-227be22cdd3a.json");
app.use(cors());

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

app.post("/books", verifyToken, (req, res) => {
  const book = {
    title: req.body.title,
    author: req.body.author,
    description: req.body.description,
    link: req.body.link,
    image: req.body.image,
    location: req.body.location,
    avalible: req.body.quantity,
    borrowing: [],
    quantity: req.body.quantity,
    category: req.body.category,
  };

  db.collection("books")
    .doc(req.body.title)
    .set(book)
    .then(
      res.json({
        message: book,
      })
    );
  res.json({
    message: null,
  });
});

app.get("/books", async (req, res) => {
  const books = db.collection("books");
  const result = await books.get();
  const result_list = result.docs.map((x) => x.data());
  res.send(result_list);
});

app.get("/books/:title", (req, res) => {
  let cityRef = db.collection("books").doc(req.params.title);
  cityRef
    .get()
    .then((doc) => {
      if (!doc.exists) {
        console.log("No such document!");
      } else {
        console.log("Document data:", doc.data());
        res.send(doc.data());
      }
    })
    .catch((err) => {
      console.log("Error getting document", err);
    });
});

app.delete("/books/:title", verifyToken, (req, res) => {
  db.collection("books")
    .doc(req.params.title)
    .delete()
    .then(
      res.json({
        message: "Deleted " + req.params.title,
      })
    );
  res.json({
    message: null,
  });
});

app.put("/books/:title", verifyToken, (req, res) => {
  db.collection("books")
    .doc(req.params.title)
    .set(req.body, { merge: true })
    .then(
      res.json({
        message: "Updated",
      })
    );
  res.json({
    message: req.params.title,
  });
});

app.post("/login", async (req, res) => {
  const userName = req.body.name;
  const password = req.body.password;
  const users = db.collection("users");
  const result = await users.where("name", "==", userName).get();
  const result_password = result.docs.map((x) => x.data().password)[0];
  if (bcrypt.compareSync(password, result_password)) {
    jwt.sign({ userName }, "kocham-Damsa", (err, token) => {
      res.json({
        token,
      });
    });
  } else {
    res.sendStatus(403);
  }
});

app.get("/categories", async (req, res) => {
  const categories = db.collection("categories");
  const result = await categories.get();
  const result_list = result.docs.map((x) => x.data());
  res.send(result_list);
});

app.post("/categories", verifyToken, (req, res) => {
  const category = {
    id: generateId(),
    name: req.body.name,
  };

  db.collection("categories")
    .doc(category.id)
    .set(category)
    .then(
      res.json({
        message: category,
      })
    );
  res.json({
    message: null,
  });
});

app.delete("/categories/:id", verifyToken, (req, res) => {
  db.collection("categories")
    .doc(req.params.id)
    .delete()
    .then(
      res.json({
        message: "Deleted category " + req.params.id,
      })
    );
  res.json({
    message: null,
  });
});

app.put("/categories/:id", verifyToken, (req, res) => {
  const category = {
    id: req.params.id,
    name: req.body.name,
  };

  db.collection("categories")
    .doc(req.params.id)
    .set(category)
    .then(
      res.json({
        message: "Updated a category ",
        category,
      })
    );
  res.json({
    message: req.params.id,
  });
});

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (typeof authHeader == "undefined") res.sendStatus(403);
  const token = authHeader.split(" ")[1];
  jwt.verify(token, "kocham-Damsa", (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      req.authData = authData;
      next();
    }
  });
}

function generateId() {
  let id = Date.now();
  id += Math.floor(Math.random() * 1000).toString();
  return id;
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
exports.app = functions.https.onRequest(app);
