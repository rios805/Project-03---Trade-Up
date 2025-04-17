const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

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
