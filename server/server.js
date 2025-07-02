const express = require('express');
const cors = require('cors');
const db = require('./config/db');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

db.authenticate()
  .then(() => console.log('Подключение к PostgreSQL успешно'))
  .catch(err => console.error('Ошибка подключения:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
