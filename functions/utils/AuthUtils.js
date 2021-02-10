const jwt = require('jsonwebtoken');

const {JWT_SECRET} = process.env;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (typeof authHeader == "undefined") res.sendStatus(403);
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err, authData) => {
        if (err) {
            res.sendStatus(403);
        } else {
            req.authData = authData;
            next();
        }
    });
};

const signToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET);
};

module.exports = {
    verifyToken,
    signToken
};
