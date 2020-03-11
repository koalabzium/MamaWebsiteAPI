const functions = require("firebase-functions");
const express = require("express");
const app = express();
const port = 3000;
app.use(express.json());
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const admin = require("firebase-admin");
var serviceAccount = require("./mamusiaLibrary-227be22cdd3a.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mamusialibrary.firebaseio.com"
});

let db = admin.firestore();

app.get("/", async (req, res) => {
  
  res.json({
    kocham: "Damsa",
    bo_jest: "super"
  });
});

app.post("/books", verifyToken, (req, res) => {
    const book = {
        title: req.body.title,
        author: req.body.author,
        description: req.body.description,
        link: req.body.link,
        image: req.body.image,
        location:  req.body.location,
        avalible: req.body.quantity,
        borrowing: [],
        quantity: req.body.quantity
    }

    db.collection('books').doc(req.body.title).set(book).then(
        res.json({
            message: book
        })
    )
    res.json({
        message: null
    })

})

app.get("/books", async (req, res) => {
    const books = db.collection('books');
  const result = await books.get();
  const result_list = result.docs.map(x => x.data());
  res.json({
      result_list
  })
})

app.delete("/books/:title", verifyToken, (req,res) => {
    db.collection("books").doc(req.params.title).delete().then(
        res.json({
            message: "Deleted " + req.params.title
        })
    )
    res.json({
        message: null
    })
})

app.put("/books/:title", verifyToken, (req, res) => {
    db.collection('books').doc(req.params.title).set(req.body, {merge: true}).then(
        res.json({
            message: "Updated"
        })
    )
    res.json({ 
        message: req.params.title
    })
})


app.post("/login", async (req, res) => {
  const userName = req.body.name;
  const password = req.body.password;
  const users = db.collection('users');
  const result = await users.where('name', '==', userName).get();
  const result_password = result.docs.map(x => x.data().password)[0];
  if (bcrypt.compareSync(password, result_password)) {
    jwt.sign({ userName }, "kocham-Damsa", (err, token) => {
      res.json({
        token
      });
    });
  } else {
    res.sendStatus(403);
  }
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

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
exports.app = functions.https.onRequest(app);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
