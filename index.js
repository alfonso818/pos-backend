const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// DATABASE SUPABASE
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ================= JWT LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM admins WHERE username=$1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User tidak ditemukan" });
    }

    const user = result.rows[0];

    // SUPPORT PLAIN TEXT ATAU BCRYPT
    let valid = false;

    if (user.password.startsWith("$2")) {
      valid = await bcrypt.compare(password, user.password);
    } else {
      valid = password === user.password;
    }

    if (!valid) {
      return res.status(401).json({ message: "Password salah" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= ROOT ROUTE =================
app.get("/", (req, res) => {
  res.send("POS Backend Running");
});

// ================= MIDDLEWARE JWT =================
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "No token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid" });
  }
}

// ================= PRODUCTS =================
app.get("/products", auth, async (req, res) => {
  const data = await pool.query("SELECT * FROM products ORDER BY id DESC");
  res.json(data.rows);
});

// ================= DAILY REPORT =================
app.get("/daily-report", auth, async (req, res) => {
  const omzet = await pool.query(
    "SELECT COALESCE(SUM(total),0) as omzet FROM transactions"
  );

  const profit = await pool.query(
    "SELECT COALESCE(SUM(profit),0) as profit FROM transactions"
  );

  res.json({
    omzet: omzet.rows[0].omzet,
    profit: profit.rows[0].profit
  });
});

app.listen(3000, () => {
  console.log("Server running");
});