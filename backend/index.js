const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config(); // to load up env variables
const mysql = require("mysql2/promise");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

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

app.post("/register", async (req, res) => {
  try {
    console.log("Received body:", req.body);
    const { email, username, firebase_uid } = req.body;

    if (!email || !firebase_uid || !username) {
      return res.status(400).json({ error: "Email, username, and Firebase UID are required" });
    }


    let sql = "SELECT * FROM users WHERE email = ? OR firebase_uid = ?";
    let [rows] = await pool.execute(sql, [email, firebase_uid]);

    if (rows.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    sql = "INSERT INTO users (email, username, firebase_uid) VALUES (?, ?, ?)";
    const [result] = await pool.execute(sql, [email, username, firebase_uid]);

    res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/user-info", async (req, res) => {
  try {
    const { firebase_uid } = req.body;
    
    if (!firebase_uid) {
      return res.status(400).json({ error: "Firebase UID is required" });
    }
    
    const sql = "SELECT id, username, email, trade_credit FROM users WHERE firebase_uid = ?";
    const [rows] = await pool.execute(sql, [firebase_uid]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      user: rows[0]
    });
  } catch (error) {
    console.error("User info error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/update-user", async (req, res) => {
  try {
    const { firebase_uid, username } = req.body;
    
    if (!firebase_uid) {
      return res.status(400).json({ error: "Firebase UID is required" });
    }
    
    const sql = "UPDATE users SET username = ? WHERE firebase_uid = ?";
    const [result] = await pool.execute(sql, [username, firebase_uid]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", (req, res) => {
  // This is mostly handled by Firebase now (might be removed later keeping it just in case)
  res.json({ message: "Login handled by Firebase" });
});

app.post("/auth/google", (req, res) => {
  res.json({ message: "Google auth endpoint placeholder" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});