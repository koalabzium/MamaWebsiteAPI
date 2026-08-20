const express = require("express");
const router = express.Router();
const db = require("../utils/db");
const { verifyToken } = require("../utils/AuthUtils");
const { generateId } = require("../utils/IdUtils");

router.get("", async (req, res) => {
  try {
    const categories = db.collection("categories");
    const result = await categories.get();
    const result_list = result.docs.map((x) => x.data());
    res.send(result_list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("", verifyToken, (req, res) => {
  const category = {
    id: generateId(),
    name: req.body.name,
  };

  db.collection("categories")
    .doc(category.id)
    .set(category)
    .then(() => res.json(category))
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

router.delete("/:id", verifyToken, (req, res) => {
  db.collection("categories")
    .doc(req.params.id)
    .delete()
    .then(() =>
      res.json({
        message: "Deleted category " + req.params.id,
      })
    )
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

router.put("/:id", verifyToken, (req, res) => {
  const category = {
    id: req.params.id,
    name: req.body.name,
  };

  db.collection("categories")
    .doc(req.params.id)
    .set(category)
    .then(() =>
      res.json({
        message: "Updated a category ",
        category,
      })
    )
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

module.exports = router;
