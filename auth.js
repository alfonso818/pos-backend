import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4)",
    [name, email, hashed, role || "admin"]
  );

  res.json({ msg: "User created" });
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await db.query("SELECT * FROM users WHERE email=$1", [email]);

  if (!user.rows[0]) return res.status(400).json({ msg: "User not found" });

  const valid = await bcrypt.compare(password, user.rows[0].password);

  if (!valid) return res.status(400).json({ msg: "Wrong password" });

  const token = jwt.sign(user.rows[0], process.env.JWT_SECRET);

  res.json({ token, user: user.rows[0] });
});

export default router;