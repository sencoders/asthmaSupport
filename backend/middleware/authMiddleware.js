const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            userId: decoded.userId
        };

        next();

    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;

/*

const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "No token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; // { userId }

        next();

    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
};

*/