const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { verifyToken } = require("../utils/AuthUtils");
const { generateId } = require("../utils/IdUtils");
let db = admin.firestore();

router.get("", async (req, res) => {
  const readers = db.collection("readers");
  const result = await readers.get();
  const result_list = result.docs.map((x) => x.data());
  res.send(result_list);
});

router.get("/:id", (req, res) => {
  let readerRef = db.collection("readers").doc(req.params.id);
  readerRef
    .get()
    .then((doc) => {
      if (!doc.exists) {
        console.log("No such document!");
        res.status(404).json({
          message: `Could not find reader with ID: ${req.params.id}`,
        });
      } else {
        console.log("Document data:", doc.data());
        res.send(doc.data());
      }
    })
    .catch((err) => {
      console.log("Error getting document", err);
      res.status(500).json({ error: err.message });
    });
});

router.get("/:id/borrowings", async (req, res) => {
  const borrowings = db.collection("borrowings");

  const readersBorrowings = await borrowings
    .where("readerId", "==", req.params.id)
    .get();

  const results = readersBorrowings.docs.map((x) => x.data());
  res.send(results);
});

router.post("", verifyToken, (req, res) => {
  const reader = {
    id: generateId(),
    name: req.body.name,
  };

  db.collection("readers")
    .doc(reader.id)
    .set(reader)
    .then(() =>
      res.json({
        message: reader,
      })
    )
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

router.delete("/:id", verifyToken, (req, res) => {
  db.collection("readers")
    .doc(req.params.id)
    .delete()
    .then(() =>
      res.json({
        message: "Deleted reader " + req.params.id,
      })
    )
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

router.put("/:id", verifyToken, (req, res) => {
  const reader = {
    id: req.params.id,
    name: req.body.name,
  };

  db.collection("readers")
    .doc(req.params.id)
    .set(reader)
    .then(() =>
      res.json({
        message: "Updated a reader ",
        reader,
      })
    )
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

module.exports = router;
