require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();

// Подключение к БД
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

// Модель пользователя
const User = sequelize.define('User', {
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  username: { type: DataTypes.STRING, allowNull: false }
});

// Модель предметов, инвентаря и аватара
const Item = sequelize.define('Item', {
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false }, // 'hair', 'clothes', 'accessory'
  price: { type: DataTypes.INTEGER, allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: false }
});

const Inventory = sequelize.define('Inventory', {
  equipped: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Avatar = sequelize.define('Avatar', {
  data: { type: DataTypes.JSON, allowNull: false }
});

User.hasOne(Avatar);
Avatar.belongsTo(User);

User.belongsToMany(Item, { through: Inventory });
Item.belongsToMany(User, { through: Inventory });

// CORS
app.use(cors({
  origin: ['http://127.0.0.1:3000', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  const { email, password, username } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hash, username });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, username: user.username });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email уже зарегистрирован' });
    }
    res.status(500).json({ message: 'Ошибка регистрации' });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(400).json({ message: 'Неверный email или пароль' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: 'Неверный email или пароль' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, username: user.username });
});

// Проверка токена
app.get('/api/auth/check', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.sendStatus(401);

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.sendStatus(401);

    res.json({ username: user.username });
  } catch {
    res.sendStatus(403);
  }
});

// Штука с аватаром
app.get('/api/avatar', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.sendStatus(401);

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
      include: [
        Avatar,
        { 
          model: Item,
          through: { 
            where: { equipped: true } 
          }
        }
      ]
    });
    
    if (!user) return res.sendStatus(401);
    
    res.json({
      avatar: user.Avatar?.data || {},
      equippedItems: user.Items || []
    });
  } catch {
    res.sendStatus(403);
  }
});

// Эндпоинт для магазина
app.get('/api/shop', async (req, res) => {
  try {
    const items = await Item.findAll();
    res.json(items);
  } catch {
    res.sendStatus(500);
  }
});

// Ну и для покупок
app.post('/api/shop/buy', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.sendStatus(401);

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    const item = await Item.findByPk(req.body.itemId);
    
    if (!user || !item) return res.sendStatus(404);
    
    // Здесь должна быть логика проверки баланса пользователя
    // и списание средств
    // господи за что
    
    await Inventory.create({
      UserId: user.id,
      ItemId: item.id,
      equipped: false
    });
    
    res.json({ success: true });
  } catch {
    res.sendStatus(403);
  }
});

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Сервер запущен на http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Ошибка при запуске:', e);
  }
}

start();
