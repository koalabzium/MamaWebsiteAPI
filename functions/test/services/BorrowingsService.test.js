const request = require("supertest");
const router = require("../../services/BorrowingsService");
const fakeDb = require("../helpers/fakeFirestore");
const { buildApp, authHeader } = require("./simpleCrud.shared");

describe("BorrowingsService", () => {
  let app;

  beforeEach(() => {
    app = buildApp(router, "/borrowings");
  });

  describe("POST /borrowings", () => {
    test("400s when the book does not exist (regression: TDZ ReferenceError on borrowing.bookId)", async () => {
      const res = await request(app)
        .post("/borrowings")
        .set("Authorization", authHeader())
        .send({
          bookId: "missing",
          readerId: "r1",
          readerName: "Ann",
          date: "2024-01-01",
          quantity: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/missing/);
    });

    test("creates a borrowing and decrements the book's availability", async () => {
      fakeDb.__seed("books", "b1", {
        id: "b1",
        title: "Hobbit",
        author: "Tolkien",
        available: 3,
        quantity: 3,
      });

      const res = await request(app)
        .post("/borrowings")
        .set("Authorization", authHeader())
        .send({
          bookId: "b1",
          readerId: "r1",
          readerName: "Ann",
          date: "2024-01-01",
          quantity: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        bookId: "b1",
        readerId: "r1",
        quantity: 2,
        active: true,
      });

      const storedBook = await fakeDb.collection("books").doc("b1").get();
      expect(storedBook.data().available).toBe(1);
    });

    test("rejects requests without a token", async () => {
      const res = await request(app).post("/borrowings").send({});
      expect(res.status).toBe(403);
    });
  });

  describe("POST /borrowings/:id/cancel", () => {
    test("restores the book's availability and deactivates the borrowing", async () => {
      fakeDb.__seed("books", "b1", {
        id: "b1",
        title: "Hobbit",
        author: "Tolkien",
        available: 1,
        quantity: 3,
      });
      fakeDb.__seed("borrowings", "bor1", {
        id: "bor1",
        bookId: "b1",
        quantity: 2,
        active: true,
      });

      const res = await request(app)
        .post("/borrowings/bor1/cancel")
        .set("Authorization", authHeader());

      expect(res.status).toBe(200);

      const storedBook = await fakeDb.collection("books").doc("b1").get();
      expect(storedBook.data().available).toBe(3);

      const storedBorrowing = await fakeDb.collection("borrowings").doc("bor1").get();
      expect(storedBorrowing.data().active).toBe(false);
    });

    test("400s when the borrowing does not exist", async () => {
      const res = await request(app)
        .post("/borrowings/missing/cancel")
        .set("Authorization", authHeader());
      expect(res.status).toBe(400);
    });

    test("rejects requests without a token", async () => {
      const res = await request(app).post("/borrowings/bor1/cancel");
      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /borrowings/:id", () => {
    test("merges the update into the existing document", async () => {
      fakeDb.__seed("borrowings", "bor1", {
        id: "bor1",
        bookId: "b1",
        quantity: 1,
        active: true,
      });

      const res = await request(app)
        .patch("/borrowings/bor1")
        .set("Authorization", authHeader())
        .send({ readerName: "Updated Name" });

      expect(res.status).toBe(200);
      const stored = await fakeDb.collection("borrowings").doc("bor1").get();
      expect(stored.data()).toMatchObject({ readerName: "Updated Name", bookId: "b1" });
    });
  });
});
