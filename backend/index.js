const express = require("express");
const cors = require("cors");
const pool = require("./db"); //Using the DB connection from fastcomet
require("dotenv").config(); //to load up env variables

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());


// Testing DB connection
app.get("/test-db", (req, res) => {
	pool.query("SELECT 1 + 1 AS solution", (err, results) => {
	  if (err) {
		console.error("DB error:", err);
		return res.status(500).json({ error: "Database connection failed" });
	  }
	  res.json({ message: "Database connected!", result: results[0].solution });
	});
  });

//Here are some routes I created as placeholders 
app.get("/", (req, res) => {
	res.json({ message: "Backend is running!" });
});

app.post("/register", (req, res) => {
	res.json({ message: "Register endpoint placeholder" });
});

app.post("/login", (req, res) => {
	res.json({ message: "Login endpoint placeholder" });
});

app.post("/auth/google", (req, res) => {
	res.json({ message: "Google auth endpoint placeholder" });
});



app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
