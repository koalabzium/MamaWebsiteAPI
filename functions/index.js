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
    id: generateId(),
    title: req.body.title,
    author: req.body.author,
    description: req.body.description,
    link: req.body.link,
    image: req.body.image,
    location: req.body.location,
    available: req.body.quantity,
    borrowing: [],
    quantity: req.body.quantity,
    category: req.body.category,
  };

  db.collection("books")
    .doc(book.id)
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

const PAGE_SIZE = 10;

app.get("/books", async (req, res) => {
  const { page = 1, search, categoryId } = req.query;

  let booksQuery = db.collection("books");

  const pageInt = parseInt(page);

  if (categoryId) {
    booksQuery = booksQuery.where("category", "==", categoryId);
  }

  const { docs } = await booksQuery.get();

  const books = docs
    .map((x) => x.data())
    .filter(({ title, author }) =>
      search
        ? title.toLowerCase().includes(search.toLowerCase()) ||
          author.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .sort((a, b) => (a.title > b.title ? 1 : b.title > a.title ? -1 : 0));

  const booksPerPage = books.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  res.send({
    results: booksPerPage,
    page: pageInt,
    totalCount: books.length,
  });
});

app.get("/books/:id", (req, res) => {
  let bookRef = db.collection("books").doc(req.params.id);
  bookRef
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

app.get("/books/:id/borrowings", async (req, res) => {
  const borrowings = db.collection("borrowings");

  const booksBorrowings = await borrowings
    .where("bookId", "==", req.params.id)
    .get();

  const results = booksBorrowings.docs.map((x) => x.data());
  res.send(results);
});

app.delete("/books/:id", verifyToken, (req, res) => {
  db.collection("books")
    .doc(req.params.id)
    .delete()
    .then(
      res.json({
        message: "Deleted " + req.params.id,
      })
    );
  res.json({
    message: null,
  });
});

app.put("/books/:id", verifyToken, (req, res) => {
  db.collection("books")
    .doc(req.params.id)
    .set(req.body, { merge: true })
    .then(
      res.json({
        message: "Updated",
      })
    );
  res.json({
    message: req.params.id,
  });
});

app.post("/borrowings", verifyToken, (req, res) => {
  const borrowing = {
    id: generateId(),
    bookId: req.body.bookId,
    readerId: req.body.readerId,
    readerName: req.body.readerName,
    date: req.body.date,
    active: true,
    quantity: req.body.quantity,
  };

  db.collection("borrowings")
    .doc(borrowing.id)
    .set(borrowing)
    .then(
      res.json({
        message: borrowing,
      })
    );
  res.json({
    message: null,
  });
});

app.patch("/borrowings/:id", verifyToken, (req, res) => {
  db.collection("borrowings")
    .doc(req.params.id)
    .set(req.body, { merge: true })
    .then(
      res.json({
        message: "Updated",
      })
    );
  res.json({
    message: req.params.id,
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

app.get("/readers", async (req, res) => {
  const readers = db.collection("readers");
  const result = await readers.get();
  const result_list = result.docs.map((x) => x.data());
  res.send(result_list);
});

app.get("/readers/:id", (req, res) => {
  let readerRef = db.collection("readers").doc(req.params.id);
  readerRef
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

app.get("/readers/:id/borrowings", async (req, res) => {
  const borrowings = db.collection("borrowings");

  const readersBorrowings = await borrowings
    .where("readerId", "==", req.params.id)
    .get();

  const results = readersBorrowings.docs.map((x) => x.data());
  res.send(results);
});

app.post("/readers", verifyToken, (req, res) => {
  const reader = {
    id: generateId(),
    name: req.body.name,
  };

  db.collection("readers")
    .doc(reader.id)
    .set(reader)
    .then(
      res.json({
        message: reader,
      })
    );
  res.json({
    message: null,
  });
});

app.delete("/readers/:id", verifyToken, (req, res) => {
  db.collection("readers")
    .doc(req.params.id)
    .delete()
    .then(
      res.json({
        message: "Deleted reader " + req.params.id,
      })
    );
  res.json({
    message: null,
  });
});

app.put("/readers/:id", verifyToken, (req, res) => {
  const reader = {
    id: req.params.id,
    name: req.body.name,
  };

  db.collection("readers")
    .doc(req.params.id)
    .set(reader)
    .then(
      res.json({
        message: "Updated a reader ",
        reader,
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
