const admin = require("./firebaseAdmin");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed", err);
    return res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = authenticate;
