const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { verifyToken, signToken } = require("../../utils/AuthUtils");

const buildApp = () => {
  const app = express();
  app.get("/protected", verifyToken, (req, res) => {
    res.json({ authData: req.authData });
  });
  return app;
};

describe("AuthUtils", () => {
  test("signToken produces a token verifyToken accepts", async () => {
    const token = signToken({ userName: "damian" });

    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.authData).toMatchObject({ userName: "damian" });
  });

  test("verifyToken rejects a missing Authorization header", async () => {
    const res = await request(buildApp()).get("/protected");
    expect(res.status).toBe(403);
  });

  test("verifyToken rejects an invalid token", async () => {
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(403);
  });

  test("verifyToken rejects a token signed with a different secret", async () => {
    const wrongToken = jwt.sign({ userName: "damian" }, "wrong-secret");

    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${wrongToken}`);

    expect(res.status).toBe(403);
  });
});
