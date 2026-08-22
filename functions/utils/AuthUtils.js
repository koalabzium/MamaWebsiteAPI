const jwt = require("jsonwebtoken");

// functions.config() is permanently gone (the Runtime Configurator API it
// depended on was shut down), so the secret comes from the environment
// instead: functions/.env's JWT_SECRET, loaded locally via dotenv
// (index.js) and auto-injected by Firebase's deploy pipeline in production.
const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }
  return secret;
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (typeof authHeader == "undefined") return res.sendStatus(403);
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
