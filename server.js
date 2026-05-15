require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('POS Backend Running');
});

app.listen(process.env.PORT, () => {
  console.log('Server Running');
});