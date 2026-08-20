const express = require("express");
const request = require("supertest");
const router = require("../../services/BooksService");
const fakeDb = require("../helpers/fakeFirestore");
const { buildApp, authHeader } = require("./simpleCrud.shared");

const book = (overrides = {}) => ({
  id: "1",
  title: "Hobbit",
  author: "Tolkien",
  available: 2,
  quantity: 2,
  category: "cat-1",
  place: "place-1",
  ...overrides,
});

describe("BooksService", () => {
  let app;

  beforeEach(() => {
    app = buildApp(router, "/books");
  });

  describe("POST /books", () => {
    test("rejects a missing title", async () => {
      const res = await request(app)
        .post("/books")
        .set("Authorization", authHeader())
        .send({ author: "Tolkien" });
      expect(res.status).toBe(400);
    });

    test("rejects a missing author", async () => {
      const res = await request(app)
        .post("/books")
        .set("Authorization", authHeader())
        .send({ title: "Hobbit" });
      expect(res.status).toBe(400);
    });

    test("rejects requests without a token", async () => {
      const res = await request(app)
        .post("/books")
        .send({ title: "Hobbit", author: "Tolkien" });
      expect(res.status).toBe(403);
    });

    test("creates a book with available defaulted to quantity", async () => {
      const res = await request(app)
        .post("/books")
        .set("Authorization", authHeader())
        .send({ title: "Hobbit", author: "Tolkien", quantity: 3 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        title: "Hobbit",
        author: "Tolkien",
        available: 3,
        quantity: 3,
      });
    });
  });

  describe("GET /books/:id", () => {
    test("404s when the book does not exist", async () => {
      const res = await request(app).get("/books/missing");
      expect(res.status).toBe(404);
    });

    test("returns the book when it exists", async () => {
      fakeDb.__seed("books", "1", book());

      const res = await request(app).get("/books/1");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: "1", title: "Hobbit" });
    });
  });

  describe("GET /books", () => {
    beforeEach(() => {
      fakeDb.__seed("books", "1", book({ id: "1", title: "Hobbit", author: "Tolkien" }));
      fakeDb.__seed(
        "books",
        "2",
        book({ id: "2", title: "Silmarillion", author: "Tolkien" })
      );
      fakeDb.__seed("books", "3", book({ id: "3", title: "Dune", author: "Herbert" }));
    });

    test("filters by search across title and author", async () => {
      const res = await request(app).get("/books").query({ search: "dune" });

      expect(res.status).toBe(200);
      expect(res.body.results.map((b) => b.id)).toEqual(["3"]);
      expect(res.body.totalCount).toBe(1);
    });

    test("sorts by title ascending by default", async () => {
      const res = await request(app).get("/books");
      expect(res.body.results.map((b) => b.title)).toEqual([
        "Dune",
        "Hobbit",
        "Silmarillion",
      ]);
    });

    test("sorts descending when order=desc", async () => {
      const res = await request(app).get("/books").query({ order: "desc" });
      expect(res.body.results.map((b) => b.title)).toEqual([
        "Silmarillion",
        "Hobbit",
        "Dune",
      ]);
    });

    test("reports totalCount and page for the full result set", async () => {
      const res = await request(app).get("/books").query({ page: 1 });
      // PAGE_SIZE is 10, so all 3 seeded books fit on page 1.
      expect(res.body.results).toHaveLength(3);
      expect(res.body.totalCount).toBe(3);
      expect(res.body.page).toBe(1);
    });
  });

  describe("GET /books/:id/borrowings", () => {
    test("returns only active borrowings for that book", async () => {
      fakeDb.__seed("borrowings", "b1", { id: "b1", bookId: "1", active: true });
      fakeDb.__seed("borrowings", "b2", { id: "b2", bookId: "1", active: false });
      fakeDb.__seed("borrowings", "b3", { id: "b3", bookId: "2", active: true });

      const res = await request(app).get("/books/1/borrowings");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "b1", bookId: "1", active: true }]);
    });
  });

  describe("DELETE /books/:id", () => {
    test("rejects requests without a token", async () => {
      const res = await request(app).delete("/books/1");
      expect(res.status).toBe(403);
    });

    test("deletes the book and sends a single response", async () => {
      fakeDb.__seed("books", "1", book());
      const jsonSpy = jest.spyOn(express.response, "json");

      const res = await request(app)
        .delete("/books/1")
        .set("Authorization", authHeader());

      expect(res.status).toBe(200);
      expect(jsonSpy).toHaveBeenCalledTimes(1);
      const stored = await fakeDb.collection("books").doc("1").get();
      expect(stored.exists).toBe(false);
    });
  });

  describe("PUT /books/:id", () => {
    test("merges the update into the existing document", async () => {
      fakeDb.__seed("books", "1", book());

      const res = await request(app)
        .put("/books/1")
        .set("Authorization", authHeader())
        .send({ title: "The Hobbit" });

      expect(res.status).toBe(200);
      const stored = await fakeDb.collection("books").doc("1").get();
      expect(stored.data()).toMatchObject({ title: "The Hobbit", author: "Tolkien" });
    });
  });
});
