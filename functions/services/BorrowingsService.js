const express = require('express');
const router = express.Router();
const db = require("../utils/db");
const {generateId} = require('../utils/IdUtils');
const {verifyToken} = require('../utils/AuthUtils');

// Admin-only list of borrowings (they carry reader names, so unlike most GET
// routes this one requires a token). ?active=true limits it to borrowings
// that haven't been returned yet. Each borrowing is enriched with its book's
// current place (bookPlace) so the admin screen can filter by location —
// borrowings don't store it themselves.
router.get("", verifyToken, async (req, res) => {
    try {
        let query = db.collection("borrowings");
        if (req.query.active === "true") {
            query = query.where("active", "==", true);
        }
        const snapshot = await query.get();
        const borrowings = snapshot.docs.map((d) => d.data());

        const bookIds = [...new Set(borrowings.map((b) => b.bookId).filter(Boolean))];
        const bookDocs = bookIds.length
            ? await db.getAll(...bookIds.map((id) => db.collection("books").doc(id)))
            : [];
        const placeByBook = new Map(
            bookDocs.filter((d) => d.exists).map((d) => [d.id, d.data().place || null])
        );

        res.json(borrowings.map((b) => ({...b, bookPlace: placeByBook.get(b.bookId) || null})));
    } catch (e) {
        res.status(500).json({error: e.message});
    }
});

router.post("", verifyToken, async (req, res) => {
    try {
        const {
            bookId,
            readerId,
            readerName,
            date,
            quantity
        } = req.body;

        console.log(`Borrowing book: ${bookId}. Quantity: ${quantity}`);


        const bookRef = await db.collection("books")
            .doc(bookId)
            .get();

        if (!bookRef.exists) {
            return res.status(400).json({message: `Book with this ID does not exist: ${bookId}`});
        }

        const book = bookRef.data();

        if (parseInt(book.available) < parseInt(quantity)) {
            return res.status(400).json({message: "Brak dostępnych egzemplarzy tej książki."});
        }

        const borrowing = {
            id: generateId(),
            bookId: bookId,
            readerId: readerId,
            readerName: readerName,
            date: date,
            active: true,
            quantity: parseInt(quantity),
            bookTitle: book.title,
            bookAuthor: book.author,
        };


        const borrowingWriteResult = await db.collection("borrowings")
            .doc(borrowing.id)
            .set(borrowing);

        const currentlyAvailable = parseInt(book.available);

        console.log(`Available: ${currentlyAvailable}`);

        let quantityLeft = currentlyAvailable - borrowing.quantity;
        console.log(`Quantity left: ${quantityLeft}`);

        const updatedBook = await db.collection("books")
            .doc(borrowing.bookId)
            .set({...book, available: quantityLeft});

        res.json(borrowing);

    } catch (e) {
        res.status(500).json({
            error: e.message,
        });
    }

});

router.post("/:id/cancel", verifyToken, async (req, res) => {

    const {id: borrowingId} = req.params;

    try {


        let borrowingDocument = await db.collection("borrowings")
            .doc(borrowingId)
            .get();

        if (!borrowingDocument.exists) {
            return res.status(400).json({message: `Borrowing with this id does not exist: ${borrowingId}`});
        }

        const {quantity, bookId, active} = borrowingDocument.data();

        // Without this, cancelling twice (double click, two tabs) would add
        // the copies back to the book's availability a second time.
        if (!active) {
            return res.status(400).json({message: "To wypożyczenie zostało już zakończone."});
        }

        const result = await db.collection("borrowings")
            .doc(borrowingId)
            .update({active: false});

        const bookDocument = await db.collection("books")
            .doc(bookId)
            .get();

        if (!bookDocument.exists) {
            return res.status(500).json({message: `Book with this id does not exist: ${borrowingId}`});
        }

        const {
            available: prevAvailable
        } = bookDocument.data();

        const parsedQuantity = parseInt(quantity);

        const bookUpdateResult = await db.collection("books")
            .doc(bookId)
            .update({available: prevAvailable + parsedQuantity});

        console.log('cancel result:', result);

        res.json({
            message: `Canceled borrowing with ID: ${borrowingId}`
        });

    } catch (e) {
        res.status(500).json({error: e.message});
    }
});

router.patch("/:id", verifyToken, (req, res) => {
    db.collection("borrowings")
        .doc(req.params.id)
        .set(req.body, {merge: true})
        .then((result) => {
            console.log('res', result);
            res.json({
                message: "Updated",
            });
        })
        .catch(err => {
            res.status(500).json({error: err.message});
        });
});

module.exports = router;
