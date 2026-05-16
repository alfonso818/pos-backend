const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(cors({
  origin: "*",
}));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.get("/", (req, res) => {
  res.send("POS Backend Running");
});

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM admins WHERE username=$1",
    [username]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ message: "User tidak ditemukan" });
  }

  const user = result.rows[0];

  const valid = password === user.password;

  if (!valid) {
    return res.status(401).json({ message: "Password salah" });
  }

  const token = generateToken(user);

  res.json({
    message: "Login berhasil",
    token,
    user: {
      id: user.id,
      username: user.username,
      password : user.password,
      role: user.role
    }
  });
});

// MIDDLEWARE AUTH
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token tidak ada" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token tidak valid" });
  }
}

// ROLE CHECK (SUPER ADMIN ONLY)
function superAdminOnly(req, res, next) {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Akses ditolak" });
  }
  next();
}

// PROTEKSI ROUTE
app.get("/products", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM products ORDER BY created_at DESC"
  );

  res.json(result.rows);
});


// CRUD PRODUCT

app.get("/products", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM products ORDER BY created_at DESC"
  );

  res.json(result.rows);
});

app.post("/products", async (req, res) => {
  const {
    name,
    stock,
    buy_price,
    sell_price
  } = req.body;

  await pool.query(
    `
    INSERT INTO products
    (name, stock, buy_price, sell_price)
    VALUES ($1,$2,$3,$4)
    `,
    [name, stock, buy_price, sell_price]
  );

  res.json({
    message: "Produk berhasil ditambah"
  });
});

app.put("/products/:id", async (req, res) => {
  const { id } = req.params;

  const {
    name,
    stock,
    buy_price,
    sell_price
  } = req.body;

  await pool.query(
    `
    UPDATE products
    SET
    name=$1,
    stock=$2,
    buy_price=$3,
    sell_price=$4
    WHERE id=$5
    `,
    [name, stock, buy_price, sell_price, id]
  );

  res.json({
    message: "Produk berhasil diupdate"
  });
});

app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;

  await pool.query(
    "DELETE FROM products WHERE id=$1",
    [id]
  );

  res.json({
    message: "Produk berhasil dihapus"
  });
});


// TRANSAKSI

app.post("/transactions", async (req, res) => {
  const {
    product_id,
    quantity
  } = req.body;

  const productResult = await pool.query(
    "SELECT * FROM products WHERE id=$1",
    [product_id]
  );

  const product = productResult.rows[0];

  if (!product) {
    return res.status(404).json({
      message: "Produk tidak ditemukan"
    });
  }

  if (product.stock < quantity) {
    return res.status(400).json({
      message: "Stock tidak cukup"
    });
  }

  const total =
    product.sell_price * quantity;

  const profit =
    (product.sell_price - product.buy_price)
    * quantity;

  await pool.query(
    `
    INSERT INTO transactions
    (product_id, quantity, total, profit)
    VALUES ($1,$2,$3,$4)
    `,
    [product_id, quantity, total, profit]
  );

  await pool.query(
    `
    UPDATE products
    SET stock = stock - $1
    WHERE id=$2
    `,
    [quantity, product_id]
  );

  res.json({
    message: "Transaksi berhasil"
  });
});


// OMSET HARIAN

app.get("/daily-report", async (req, res) => {
  const result = await pool.query(`
    SELECT
    SUM(total) as omzet,
    SUM(profit) as profit
    FROM transactions
    WHERE DATE(created_at)=CURRENT_DATE
  `);

  res.json(result.rows[0]);
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});