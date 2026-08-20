const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const fakeDb = require("../helpers/fakeFirestore");

const TEST_SECRET = "test-secret";

const authHeader = () => `Bearer ${jwt.sign({ userName: "tester" }, TEST_SECRET)}`;

const buildApp = (router, mountPath) => {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  return app;
};

/**
 * Runs the shared CRUD contract (get-all/post/delete/put) against a
 * {id, name}-shaped Firestore-backed router. Categories/Places/Readers are
 * near-identical routers over different collections, so this factory covers
 * all three instead of triplicating the same test bodies.
 *
 * @param {object} opts
 * @param {import('express').Router} opts.router
 * @param {string} opts.mountPath e.g. "/categories"
 * @param {string} opts.collectionName e.g. "categories"
 * @param {string} opts.label human label for the describe block
 * @param {(body: any) => any} [opts.getCreatedEntity] extracts the created
 *   entity from a POST response body. Categories/Places respond with the
 *   entity directly; Readers wraps it as {message: entity}.
 */
function runCrudSuite({
  router,
  mountPath,
  collectionName,
  label,
  getCreatedEntity = (body) => body,
}) {
  describe(`${label} CRUD contract`, () => {
    let app;

    beforeEach(() => {
      app = buildApp(router, mountPath);
    });

    test("GET lists all documents in the collection", async () => {
      fakeDb.__seed(collectionName, "1", { id: "1", name: "Alpha" });
      fakeDb.__seed(collectionName, "2", { id: "2", name: "Beta" });

      const res = await request(app).get(mountPath);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          { id: "1", name: "Alpha" },
          { id: "2", name: "Beta" },
        ])
      );
    });

    test("POST without a token is rejected", async () => {
      const res = await request(app).post(mountPath).send({ name: "Gamma" });
      expect(res.status).toBe(403);
    });

    test("POST creates a document and sends a single response", async () => {
      const jsonSpy = jest.spyOn(express.response, "json");

      const res = await request(app)
        .post(mountPath)
        .set("Authorization", authHeader())
        .send({ name: "Gamma" });

      expect(res.status).toBe(200);
      const created = getCreatedEntity(res.body);
      expect(created.name).toBe("Gamma");
      expect(created.id).toBeTruthy();
      // A route handler that sends two responses (e.g. res.json(...) passed
      // by value into .then(...) followed by an unconditional res.json(...))
      // won't necessarily surface as a different status/body to the client,
      // since the second write is silently dropped once headers are sent -
      // so assert the call count directly instead of relying on res.status.
      expect(jsonSpy).toHaveBeenCalledTimes(1);
    });

    test("DELETE without a token is rejected", async () => {
      fakeDb.__seed(collectionName, "1", { id: "1", name: "Alpha" });
      const res = await request(app).delete(`${mountPath}/1`);
      expect(res.status).toBe(403);
    });

    test("DELETE removes the document and sends a single response", async () => {
      fakeDb.__seed(collectionName, "1", { id: "1", name: "Alpha" });
      const jsonSpy = jest.spyOn(express.response, "json");

      const res = await request(app)
        .delete(`${mountPath}/1`)
        .set("Authorization", authHeader());

      expect(res.status).toBe(200);
      expect(jsonSpy).toHaveBeenCalledTimes(1);
      const stored = await fakeDb.collection(collectionName).doc("1").get();
      expect(stored.exists).toBe(false);
    });

    test("PUT updates the document and sends a single response", async () => {
      fakeDb.__seed(collectionName, "1", { id: "1", name: "Alpha" });
      const jsonSpy = jest.spyOn(express.response, "json");

      const res = await request(app)
        .put(`${mountPath}/1`)
        .set("Authorization", authHeader())
        .send({ name: "Updated" });

      expect(res.status).toBe(200);
      expect(jsonSpy).toHaveBeenCalledTimes(1);
      const stored = await fakeDb.collection(collectionName).doc("1").get();
      expect(stored.data().name).toBe("Updated");
    });
  });
}

module.exports = { runCrudSuite, buildApp, authHeader };
