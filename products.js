import express from "express";
import { db } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// CREATE
router.post("/", auth, async (req, res) => {
  const { name, price, stock } = req.body;

  const result = await db.query(
    "INSERT INTO products (name,price,stock) VALUES ($1,$2,$3) RETURNING *",
    [name, price, stock]
  );

  res.json(result.rows[0]);
});

// READ
router.get("/", auth, async (req, res) => {
  const result = await db.query("SELECT * FROM products");
  res.json(result.rows);
});

// UPDATE
router.put("/:id", auth, async (req, res) => {
  const { name, price, stock } = req.body;

  const result = await db.query(
    "UPDATE products SET name=$1,price=$2,stock=$3 WHERE id=$4 RETURNING *",
    [name, price, stock, req.params.id]
  );

  res.json(result.rows[0]);
});

// DELETE
router.delete("/:id", auth, async (req, res) => {
  await db.query("DELETE FROM products WHERE id=$1", [req.params.id]);
  res.json({ msg: "Deleted" });
});

export default router;