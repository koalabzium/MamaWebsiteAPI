const express = require('express');
const router = express.Router();
const admin = require("firebase-admin");
const {generateId} = require('../utils/IdUtils');
const {verifyToken} = require('../utils/AuthUtils');

let db = admin.firestore();

router.post("", verifyToken, (req, res) => {

    const {
        title,
        author,
        description,
        link,
        image,
        location,
        quantity = 1,
        category,
    } = req.body;

    if (!(title && title.trim())) {
        return res.status(400).json({message: 'Książka nie może mieć pustego tytułu.'});
    }

    if (!(author && author.trim())) {
        return res.status(400).json({message: 'Książka nie może mieć pustego autora.'});
    }

    const book = {
        id: generateId(),
        title: title,
        author: author,
        description: description,
        link: link,
        image: image,
        location: location,
        available: parseInt(quantity),
        borrowing: [],
        quantity: parseInt(quantity),
        category: category,
    };

    db.collection("books")
        .doc(book.id)
        .set(book)
        .then(() => res.json(book))
        .catch(err => {
            res.status(500).json({
                error: err.message
            });
        });
});

const PAGE_SIZE = 10;

router.get("", async (req, res) => {
    const {page = 1, search, categoryId, sortBy = 'title', order = 'asc'} = req.query;

    let booksQuery = db.collection("books");

    const pageInt = parseInt(page);

    if (categoryId) {
        booksQuery = booksQuery.where("category", "==", categoryId);
    }

    const {docs} = await booksQuery.get();

    const bookSorter = (field, order) => (a, b) => ((a, b) => order * (a > b ? 1 : a < b ? -1 : 0))((a[field] || '').toLowerCase(), (b[field] || '').toLowerCase());

    const books = docs
        .map((x) => x.data())
        .filter(({title, author}) =>
            search
                ? title.toLowerCase().includes(search.toLowerCase()) ||
                author.toLowerCase().includes(search.toLowerCase())
                : true
        );


    console.log(`Sorting by: ${sortBy} in order: ${order}`);

    const sortedBooks = books.sort(bookSorter(sortBy, order === 'desc' ? -1 : 1));
    const booksPerPage = sortedBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    res.send({
        results: booksPerPage,
        page: pageInt,
        totalCount: sortedBooks.length,
    });
});

router.get("/:id", (req, res) => {
    const {id} = req.params;
    let bookRef = db.collection("books").doc(id);
    bookRef
        .get()
        .then((doc) => {
            if (!doc.exists) {
                console.log("No such document!");
                res.status(404).json({
                    message: `Could not find book with ID: ${id}`
                });
            } else {
                console.log("Document data:", doc.data());
                res.send(doc.data());
            }
        })
        .catch((err) => {
            console.log("Error getting document", err);
        });
});

router.get("/:id/borrowings", async (req, res) => {
    const borrowings = db.collection("borrowings");

    const booksBorrowings = await borrowings
        .where("bookId", "==", req.params.id)
        .where("active", "==", true)
        .get();

    const results = booksBorrowings.docs.map((x) => x.data());
    res.send(results);
});

router.delete("/:id", verifyToken, (req, res) => {
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

router.put("/:id", verifyToken, (req, res) => {
    db.collection("books")
        .doc(req.params.id)
        .set(req.body, {merge: true})
        .then(() =>
            res.json({
                message: "Updated",
            })
        )
        .catch(err => {
            res.status(500).json({
                message: err.message
            });
        });
});

module.exports = router;
