const express = require("express");
const router = express.Router();
const db = require("../utils/db");
const { generateId } = require("../utils/IdUtils");
const { verifyToken } = require("../utils/AuthUtils");

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
    place,
  } = req.body;

  if (!(title && title.trim())) {
    return res
      .status(400)
      .json({ message: "Książka nie może mieć pustego tytułu." });
  }

  if (!(author && author.trim())) {
    return res
      .status(400)
      .json({ message: "Książka nie może mieć pustego autora." });
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
    place: place,
  };

  db.collection("books")
    .doc(book.id)
    .set(book)
    .then(() => res.json(book))
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

// Default page size, overridable per request with ?pageSize= (clamped).
// The response echoes the size actually used so clients don't have to
// hard-code it. The default stays at the historical 10 so a client that
// doesn't send pageSize (an older frontend build) still gets the page size
// it assumes; the current frontend asks for more explicitly.
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const parsePageSize = (raw) => {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
};

router.get("", async (req, res) => {
  const {
    page = 1,
    search,
    categoryId,
    placeId,
    sortBy = "title",
    order = "asc",
  } = req.query;
  const pageSize = parsePageSize(req.query.pageSize);

  try {
    let booksQuery = db.collection("books");

    const pageInt = parseInt(page);

    if (categoryId) {
      booksQuery = booksQuery.where("category", "==", categoryId);
    }

    if (placeId) {
      booksQuery = booksQuery.where("place", "==", placeId);
    }

    const { docs } = await booksQuery.get();

    const bookSorter = (field, order) => (a, b) =>
      ((a, b) => order * (a > b ? 1 : a < b ? -1 : 0))(
        (a[field] || "").toLowerCase(),
        (b[field] || "").toLowerCase()
      );

    const books = docs
      .map((x) => x.data())
      .filter(({ title, author }) =>
        search
          ? title.toLowerCase().includes(search.toLowerCase()) ||
            author.toLowerCase().includes(search.toLowerCase())
          : true
      );

    console.log(`Sorting by: ${sortBy} in order: ${order}`);

    const sortedBooks = books.sort(bookSorter(sortBy, order === "desc" ? -1 : 1));
    const booksPerPage = sortedBooks.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    res.send({
      results: booksPerPage,
      page: pageInt,
      pageSize,
      totalCount: sortedBooks.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  let bookRef = db.collection("books").doc(id);
  bookRef
    .get()
    .then((doc) => {
      if (!doc.exists) {
        console.log("No such document!");
        res.status(404).json({
          message: `Could not find book with ID: ${id}`,
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
  try {
    const borrowings = db.collection("borrowings");

    const booksBorrowings = await borrowings
      .where("bookId", "==", req.params.id)
      .where("active", "==", true)
      .get();

    const results = booksBorrowings.docs.map((x) => x.data());
    res.send(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", verifyToken, (req, res) => {
  db.collection("books")
    .doc(req.params.id)
    .delete()
    .then(() =>
      res.json({
        message: "Deleted " + req.params.id,
      })
    )
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
    });
});

router.put("/:id", verifyToken, (req, res) => {
  db.collection("books")
    .doc(req.params.id)
    .set(req.body, { merge: true })
    .then(() =>
      res.json({
        message: "Updated",
      })
    )
    .catch((err) => {
      res.status(500).json({
        message: err.message,
      });
    });
});

module.exports = router;
