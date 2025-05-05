const express = require("express");
const cors = require("cors");
const pool = require("./db/pool"); //Using the DB connection from fastcomet
const userRoutes = require("./routes/users"); //Using user routes
const itemRoutes = require("./routes/items"); //Using item routes
const tradeRoutes = require("./routes/trades"); // Using trade routes
const challengeRoutes = require("./routes/challenges"); // Using challenge routes
const scoreRoutes = require("./routes/scores"); //Using score routes
const reactionGameRoutes = require("./routes/reactionGame"); //Using reaction game routes
require("dotenv").config(); //to load up env variables

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/trades", tradeRoutes); 
app.use("/api/challenges", challengeRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/reaction-game", reactionGameRoutes);


// Testing DB connection
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS solution");
    res.json({ message: "Database connected!", result: rows[0].solution });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});