const jwt = require("jsonwebtoken");
const functions = require("firebase-functions");

const getSecret = () => {
  const config = functions.config();
  const { secret } = config.mamalibrary;
  return secret;
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (typeof authHeader == "undefined") res.sendStatus(403);
  const token = authHeader.split(" ")[1];
  jwt.verify(token, getSecret(), (err, authData) => {
    if (err) {
      res.sendStatus(403);
    } else {
      req.authData = authData;
      next();
    }
  });
};

const signToken = (payload) => {
  return jwt.sign(payload, getSecret());
};

module.exports = {
  verifyToken,
  signToken,
};
