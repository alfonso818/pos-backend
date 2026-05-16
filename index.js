import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import auth from "./routes/auth.js";
import products from "./routes/products.js";
import transactions from "./routes/transactions.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", auth);
app.use("/products", products);
app.use("/transactions", transactions);

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);