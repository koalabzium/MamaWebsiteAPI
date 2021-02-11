const express = require('express')
const router = express.Router()
const admin = require("firebase-admin");
const {verifyToken} = require('../utils/AuthUtils');

let db = admin.firestore();


router.get("", async (req, res) => {
    const categories = db.collection("categories");
    const result = await categories.get();
    const result_list = result.docs.map((x) => x.data());
    res.send(result_list);
});

router.post("", verifyToken, (req, res) => {
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

router.delete("/:id", verifyToken, (req, res) => {
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

router.put("/:id", verifyToken, (req, res) => {
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

module.exports = router
