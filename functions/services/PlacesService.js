const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { verifyToken } = require("../utils/AuthUtils");
const { generateId } = require("../utils/IdUtils");

let db = admin.firestore();

router.get("", async (req, res) => {
  const places = db.collection("places");
  const result = await places.get();
  const result_list = result.docs.map((x) => x.data());
  res.send(result_list);
});

router.post("", verifyToken, (req, res) => {
  const place = {
    id: generateId(),
    name: req.body.name,
  };

  db.collection("places")
    .doc(place.id)
    .set(place)
    .then(() => res.json(place))
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

router.delete("/:id", verifyToken, (req, res) => {
  db.collection("places")
    .doc(req.params.id)
    .delete()
    .then(
      res.json({
        message: "Deleted place " + req.params.id,
      })
    );
  res.json({
    message: null,
  });
});

router.put("/:id", verifyToken, (req, res) => {
  const place = {
    id: req.params.id,
    name: req.body.name,
  };

  db.collection("places")
    .doc(req.params.id)
    .set(place)
    .then(
      res.json({
        message: "Updated a place ",
        place,
      })
    );
  res.json({
    message: req.params.id,
  });
});

module.exports = router;
