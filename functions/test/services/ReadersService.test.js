const request = require("supertest");
const router = require("../../services/ReadersService");
const fakeDb = require("../helpers/fakeFirestore");
const { runCrudSuite, buildApp } = require("./simpleCrud.shared");

runCrudSuite({
  router,
  mountPath: "/readers",
  collectionName: "readers",
  label: "Readers",
  // Unlike Categories/Places, Readers' POST wraps the created entity in
  // {message: entity} instead of returning it directly.
  getCreatedEntity: (body) => body.message,
});

describe("Readers extra routes", () => {
  let app;

  beforeEach(() => {
    app = buildApp(router, "/readers");
  });

  test("GET /:id 404s when the reader does not exist", async () => {
    const res = await request(app).get("/readers/missing");
    expect(res.status).toBe(404);
  });

  test("GET /:id returns the reader when it exists", async () => {
    fakeDb.__seed("readers", "1", { id: "1", name: "Alpha" });

    const res = await request(app).get("/readers/1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "1", name: "Alpha" });
  });

  test("GET /:id/borrowings returns only that reader's borrowings", async () => {
    fakeDb.__seed("borrowings", "b1", {
      id: "b1",
      readerId: "1",
      bookTitle: "Book A",
    });
    fakeDb.__seed("borrowings", "b2", {
      id: "b2",
      readerId: "2",
      bookTitle: "Book B",
    });

    const res = await request(app).get("/readers/1/borrowings");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "b1", readerId: "1", bookTitle: "Book A" }]);
  });
});
