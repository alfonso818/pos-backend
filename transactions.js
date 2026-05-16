import express from "express";
import { db } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const { items } = req.body;

  let total = 0;
  let profit = 0;

  const tx = await db.query(
    "INSERT INTO transactions (total,profit) VALUES (0,0) RETURNING *"
  );

  const transaction = tx.rows[0];

  for (let item of items) {
    const product = await db.query(
      "SELECT * FROM products WHERE id=$1",
      [item.product_id]
    );

    const p = product.rows[0];

    const itemTotal = p.price * item.qty;
    total += itemTotal;
    profit += (p.price - (p.cost || 0)) * item.qty;

    await db.query(
      "INSERT INTO transaction_items (transaction_id,product_id,qty,price,cost) VALUES ($1,$2,$3,$4,$5)",
      [transaction.id, p.id, item.qty, p.price, p.cost || 0]
    );

    await db.query(
      "UPDATE products SET stock = stock - $1 WHERE id=$2",
      [item.qty, p.id]
    );
  }

  await db.query(
    "UPDATE transactions SET total=$1,profit=$2 WHERE id=$3",
    [total, profit, transaction.id]
  );

  res.json({ total, profit });
});

export default router;