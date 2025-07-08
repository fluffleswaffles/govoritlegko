require('dotenv').config();

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your_super_secret_key_here';

const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const express = require('express');
const fs = require('fs').promises;
const gamesRouter = require('./routes/games');
const nodemailer = require('nodemailer');

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

const User = sequelize.define('User', {
  email: { 
    type: DataTypes.STRING, 
    unique: true, 
    allowNull: false,
    validate: { isEmail: true }
  },
  password: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  username: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  isAdmin: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false, 
    allowNull: false 
  },
  coins: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    allowNull: false
  }
});

const Item = sequelize.define('Item', {
  name: DataTypes.STRING,
  type: {
    type: DataTypes.ENUM('hair', 'top', 'bottom', 'accessory', 'face'),
    allowNull: false
  },
  price: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  imageUrl: DataTypes.STRING,
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

const Inventory = sequelize.define('Inventory', {
  equipped: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  }
});

const AvatarStorage = sequelize.define('AvatarStorage', {
  equippedItems: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  timestamps: true
});

const News = sequelize.define('News', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true
});

const Friend = require('./models/friend')(sequelize);
const Achievement = require('./models/achievement')(sequelize);
const Message = require('./models/message')(sequelize);
const Avatar = require('./models/avatar')(sequelize, DataTypes);
const FriendRequest = require('./models/friendrequest')(sequelize, DataTypes);

User.hasOne(Avatar, { as: 'avatar', foreignKey: 'UserId' });
Avatar.belongsTo(User, { foreignKey: 'UserId' });

User.hasOne(AvatarStorage);
AvatarStorage.belongsTo(User);

User.belongsToMany(Item, { through: Inventory });
Item.belongsToMany(User, { through: Inventory });

User.hasMany(Friend, { foreignKey: 'userId', as: 'friends' });
Friend.belongsTo(User, { foreignKey: 'friendId', as: 'friendUser' });
User.hasMany(Achievement, { foreignKey: 'userId', as: 'achievements' });
User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });

User.hasMany(FriendRequest, { as: 'sentRequests', foreignKey: 'userId' });
User.hasMany(FriendRequest, { as: 'receivedRequests', foreignKey: 'friendId' });
FriendRequest.belongsTo(User, { as: 'sender', foreignKey: 'userId' });
FriendRequest.belongsTo(User, { as: 'receiver', foreignKey: 'friendId' });

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'file://',
    'http://localhost',
    'http://127.0.0.1'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const type = req.body.type;
    const uploadPath = path.join(__dirname, 'public', 'assets', 'avatars', `${type}s`);
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${req.body.type}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } 
});

const newsStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public', 'assets', 'news');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `news_${Date.now()}${ext}`;
    cb(null, filename);
  }
});
const uploadNews = multer({
  storage: newsStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username, adminSecret } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const isAdmin = adminSecret === ADMIN_SECRET;
    
    const user = await User.create({ email, password: hash, username, isAdmin });
    const token = jwt.sign({ id: user.id, isAdmin }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ token, username: user.username, isAdmin });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: 'Registration failed' });
  }
});

User.afterCreate(async (user) => {
  const defaultItems = await Item.findAll({ where: { isDefault: true } });
  
  await Inventory.bulkCreate(
    defaultItems.map(item => ({
      UserId: user.id,
      ItemId: item.id,
      equipped: item.type === 'face' 
    }))
  );
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, username: user.username, isAdmin: user.isAdmin });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/auth/check', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: ['id', 'username', 'isAdmin'] });
    
    if (!user) return res.sendStatus(401);
    res.json({ username: user.username, isAdmin: user.isAdmin });
  } catch (err) {
    res.sendStatus(403);
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({ 
      attributes: ['id', 'username', 'email', 'isAdmin'],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    await user.update({ isAdmin: req.body.isAdmin });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

app.post('/api/admin/items', 
  requireAdmin, 
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      const { name, type, price } = req.body;
      if (!name || !type || !price) {
        await fs.unlink(req.file.path);
        return res.status(400).json({ error: 'All fields are required' });
      }

      const imageUrl = `/assets/avatars/${type}s/${req.file.filename}`;
      const item = await Item.create({ name, type, price: parseInt(price), imageUrl });
      
      res.status(201).json(item);
    } catch (err) {
      if (req.file) await fs.unlink(req.file.path).catch(console.error);
      res.status(500).json({ 
        error: 'Server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
      });
    }
  }
);

app.get('/api/admin/items', requireAdmin, async (req, res) => {
  try {
    const items = await Item.findAll({
      include: [{
        model: User,
        attributes: ['id'],
        through: { attributes: [] }
      }],
      order: [['createdAt', 'DESC']]
    });
    
    const itemsWithCount = items.map(item => ({
      ...item.toJSON(),
      usersCount: item.Users.length
    }));
    
    res.json(itemsWithCount);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch items' });
  }
});

app.get('/api/admin/items/:id', requireAdmin, async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['id'],
        through: { attributes: [] }
      }]
    });
    
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({
      ...item.toJSON(),
      usersCount: item.Users.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch item' });
  }
});

app.put('/api/admin/items/:id', requireAdmin, async (req, res) => {
  try {
    const { name, type, price } = req.body;
    const item = await Item.findByPk(req.params.id);
    
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (isNaN(price)) return res.status(400).json({ message: 'Price must be a number' });
    
    await item.update({ name: name.trim(), type, price: parseInt(price) });
    res.json(item);
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to update item',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

app.delete('/api/admin/items/:id', requireAdmin, async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['id'],
        through: { attributes: [] }
      }]
    });
    
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.imageUrl) {
      const imagePath = path.join(__dirname, 'public', item.imageUrl);
      await fs.unlink(imagePath).catch(console.error);
    }
    
    await item.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to delete item',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

app.get('/api/shop', async (req, res) => {
  try {
    const items = await Item.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch shop items' });
  }
});

app.post('/api/shop/buy', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { itemId } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [user, item] = await Promise.all([
      User.findByPk(decoded.id, { transaction }),
      Item.findByPk(itemId, { transaction })
    ]);

    if (!user || !item) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Пользователь или предмет не найден' });
    }
    if (user.coins < item.price) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Недостаточно монет' });
    }
    const existingItem = await Inventory.findOne({
      where: { UserId: user.id, ItemId: item.id },
      transaction
    });

    if (existingItem) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'У вас уже есть этот предмет' });
    }

    await user.update({ coins: user.coins - item.price }, { transaction });
    await Inventory.create({
      UserId: user.id,
      ItemId: item.id,
      equipped: false
    }, { transaction });

    await transaction.commit();

    res.json({ 
      success: true,
      newBalance: user.coins - item.price,
      item: { id: item.id, name: item.name }
    });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ 
      success: false,
      message: 'Ошибка покупки',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/user/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'coins']
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка загрузки данных' });
  }
});

app.get('/api/avatar', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Item,
        through: { where: { equipped: true } }
      }]
    });
    
    if (!user) return res.sendStatus(401);
    res.json({
      equippedItems: user.Items || []
    });
  } catch (err) {
    res.sendStatus(403);
  }
});

app.get('/api/user/inventory', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Не авторизован' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: {
        model: Item,
        through: {
          attributes: ['equipped']
        }
      }
    });

    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json(user.Items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      equipped: item.Inventory.equipped,
      imageUrl: item.imageUrl
    })));

  } catch (err) {
    console.error('Inventory error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.post('/api/avatar/equip', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { itemId, itemType } = req.body;
    console.log('Equip request:', { userId: decoded.id, itemId, itemType });
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    const inventoryItem = await Inventory.findOne({
      where: { 
        UserId: decoded.id,
        ItemId: itemId
      }
    });
    if (!inventoryItem) {
      return res.status(400).json({ message: 'Item not in inventory' });
    }
    const userItemsOfType = await Item.findAll({
      include: [{
        model: User,
        where: { id: decoded.id },
        through: { attributes: [] }
      }],
      where: { type: itemType }
    });
    const itemIdsOfType = userItemsOfType.map(i => i.id);
    await Inventory.update(
      { equipped: false },
      {
        where: {
          UserId: decoded.id,
          ItemId: itemIdsOfType
        }
      }
    );
    await inventoryItem.update({ equipped: true });
    const user = await User.findByPk(decoded.id, {
      include: {
        model: Item,
        through: { where: { equipped: true } }
      }
    });
    res.json({ 
      success: true,
      equippedItems: user.Items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        imageUrl: item.imageUrl
      }))
    });
  } catch (err) {
    console.error('Equip error:', err);
    res.status(500).json({ 
      message: 'Failed to equip item',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.post('/api/avatar/change-face', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { itemId } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const faceItem = await Item.findOne({
      where: { id: itemId, type: 'face' },
      transaction
    });
    
    if (!faceItem) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Это не предмет типа "лицо"' });
    }
    const inventoryItem = await Inventory.findOne({
      where: { UserId: decoded.id, ItemId: itemId },
      transaction
    });
    
    if (!inventoryItem) {
      await transaction.rollback();
      return res.status(400).json({ message: 'У вас нет этого лица' });
    }
    await Inventory.update(
      { equipped: false },
      {
        where: {
          UserId: decoded.id,
          '$Item.type$': 'face'
        },
        include: [{ model: Item }],
        transaction
      }
    );
    await inventoryItem.update({ equipped: true }, { transaction });
    
    await transaction.commit();
    res.json({ success: true });
    
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Ошибка смены лица' });
  }
});


app.post('/api/avatar/save-state', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      await transaction.rollback();
      return res.status(401).json({ 
        success: false,
        message: 'Требуется авторизация' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userWithItems = await User.findByPk(decoded.id, {
      include: [{
        model: Item,
        through: { where: { equipped: true } },
        attributes: ['id', 'type', 'imageUrl']
      }],
      transaction
    });

    if (!userWithItems) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    const state = {
      equippedItems: userWithItems.Items.map(item => ({
        id: item.id,
        type: item.type,
        imageUrl: item.imageUrl
      })),
      updatedAt: new Date()
    };
    let storage = await AvatarStorage.findOne({
      where: { UserId: decoded.id },
      transaction
    });

    if (storage) {
      await storage.update({
        equippedItems: state.equippedItems
      }, { transaction });
    } else {
      storage = await AvatarStorage.create({
        UserId: decoded.id,
        equippedItems: state.equippedItems
      }, { transaction });
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      state: storage.equippedItems,
      message: storage ? 'Состояние обновлено' : 'Состояние сохранено',
      updatedAt: storage.updatedAt
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Save state error:', error);
    
    return res.status(500).json({ 
      success: false,
      message: 'Ошибка сохранения состояния аватара',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/avatar/load-state', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const storage = await AvatarStorage.findOne({
      where: { UserId: decoded.id }
    });
    res.json({
      equippedItems: storage?.equippedItems || []
    });

  } catch (error) {
    console.error('Load state error:', error);
    res.status(500).json({ 
      message: 'Failed to load avatar state',
      error: error.message
    });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const news = await News.findAll({ order: [['createdAt', 'DESC']] });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

app.post('/api/admin/news', requireAdmin, uploadNews.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image required' });
    const { title, text } = req.body;
    if (!title || !text) return res.status(400).json({ message: 'Title and text required' });
    const imageUrl = `/assets/news/${req.file.filename}`;
    const news = await News.create({ title, text, imageUrl });
    res.status(201).json(news);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create news' });
  }
});

app.put('/api/admin/news/:id', requireAdmin, uploadNews.single('image'), async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ message: 'News not found' });
    const { title, text } = req.body;
    let imageUrl = news.imageUrl;
    if (req.file) {
      imageUrl = `/assets/news/${req.file.filename}`;
    }
    await news.update({ title, text, imageUrl });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update news' });
  }
});

app.delete('/api/admin/news/:id', requireAdmin, async (req, res) => {
  try {
    const news = await News.findByPk(req.params.id);
    if (!news) return res.status(404).json({ message: 'News not found' });
    await news.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete news' });
  }
});

app.use('/api/games', gamesRouter);

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.set('Content-Type', 'application/json');
  res.json({ message: err.message || 'Internal server error' });
});

async function start() {
  try {
    await sequelize.sync();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

start();

app.get('/api/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'email'],
      include: [
        { model: Avatar, as: 'avatar' },
        { model: Friend, as: 'friends', include: [{ model: User, as: 'friendUser', attributes: ['id', 'username'] }] },
        { model: Achievement, as: 'achievements', attributes: ['id', 'title', 'description', 'reward'] },
        { model: Message, as: 'messages', attributes: ['id', 'text', 'reward', 'isRead', 'createdAt'] }
      ]
    });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    let avatarUrl = null;
    if (user.avatar && user.avatar.data) {
      if (user.avatar.data.url) {
        avatarUrl = user.avatar.data.url;
      } else if (user.avatar.data.base) {
        avatarUrl = `/assets/avatars/base/${user.avatar.data.base}.png`;
      }
    }
    res.json({
      username: user.username,
      email: user.email,
      avatarUrl,
      avatarData: user.avatar ? user.avatar.data : null,
      friends: user.friends.map(f => ({ id: f.friendUser?.id, username: f.friendUser?.username })).filter(f => f.id),
      achievements: user.achievements,
      messages: user.messages
    });
  } catch (err) {
    res.status(401).json({ error: 'Ошибка авторизации' });
  }
});

const avatarImageStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public', 'assets', 'avatars', 'user');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: async (req, file, cb) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      const userId = decoded.id;
      cb(null, `avatar_${userId}.png`);
    } catch (e) {
      cb(e, null);
    }
  }
});
const uploadAvatarImage = multer({
  storage: avatarImageStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') cb(null, true);
    else cb(new Error('Only PNG allowed'), false);
  },
  limits: { fileSize: 2 * 1024 * 1024 }
});

app.post('/api/avatar/upload-image', uploadAvatarImage.single('avatar'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    if (!req.file) return res.status(400).json({ error: 'Нет файла' });
    const user = await User.findByPk(decoded.id, { include: [{ model: Avatar, as: 'avatar' }] });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const url = `/assets/avatars/user/${req.file.filename}`;
    if (user.avatar) {
      user.avatar.data = { ...user.avatar.data, url };
      await user.avatar.save();
    } else {
      await Avatar.create({ UserId: user.id, data: { url } });
    }
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки аватара' });
  }
});

app.post('/api/friends/add', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const userId = decoded.id;
    const { friendId } = req.body;
    if (!friendId || friendId === userId) return res.status(400).json({ error: 'Некорректный ID друга' });
    const friendUser = await User.findByPk(friendId);
    if (!friendUser) return res.status(404).json({ error: 'Пользователь не найден' });

    const exists = await FriendRequest.findOne({ where: { userId, friendId, status: 'pending' } });
    if (exists) return res.status(400).json({ error: 'Заявка уже отправлена' });

    const alreadyFriends = await Friend.findOne({ where: { userId, friendId } });
    if (alreadyFriends) return res.status(400).json({ error: 'Уже в друзьях' });
    await FriendRequest.create({ userId, friendId, status: 'pending' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка отправки заявки' });
  }
});

app.post('/api/friends/accept', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const currentUserId = decoded.id;
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'Нет requestId' });
    const request = await FriendRequest.findOne({ where: { id: requestId, status: 'pending' } });
    if (!request) return res.status(404).json({ error: 'Заявка не найдена' });
    if (request.friendId !== currentUserId) return res.status(403).json({ error: 'Нет доступа' });
    const alreadyFriends = await Friend.findOne({ where: { userId: request.userId, friendId: currentUserId } });
    if (alreadyFriends) {
      await request.destroy();
      return res.json({ success: true, message: 'Уже в друзьях' });
    }
    await Friend.create({ userId: request.userId, friendId: currentUserId });
    await Friend.create({ userId: currentUserId, friendId: request.userId });
    await request.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка принятия заявки' });
  }
});

app.post('/api/friends/reject', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const currentUserId = decoded.id;
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ error: 'Нет requestId' });

    const request = await FriendRequest.findOne({ where: { id: requestId, status: 'pending' } });
    if (!request) return res.status(404).json({ error: 'Заявка не найдена' });
    if (request.friendId !== currentUserId) return res.status(403).json({ error: 'Нет доступа' });
    await request.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка отклонения заявки' });
  }
});

app.get('/api/friends/requests', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const userId = decoded.id;
    const incoming = await FriendRequest.findAll({
      where: { friendId: userId, status: 'pending' },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']]
    });
    const outgoing = await FriendRequest.findAll({
      where: { userId, status: 'pending' },
      include: [{ model: User, as: 'receiver', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({
      incoming: incoming.map(r => ({
        id: r.id,
        userId: r.userId,
        fromUsername: r.sender?.username,
        createdAt: r.createdAt
      })),
      outgoing: outgoing.map(r => ({
        id: r.id,
        friendId: r.friendId,
        toUsername: r.receiver?.username,
        createdAt: r.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

app.get('/api/profile/:id', async (req, res) => {
  try {
    let isFriend = false;
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
        currentUserId = decoded.id;
      } catch {}
    }
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email'],
      include: [
        { model: Avatar, as: 'avatar' },
        { model: Friend, as: 'friends', include: [{ model: User, as: 'friendUser', attributes: ['id', 'username'] }] },
        { model: Achievement, as: 'achievements', attributes: ['id', 'title', 'description', 'reward'] }
      ]
    });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    let avatarUrl = null;
    if (user.avatar && user.avatar.data) {
      if (user.avatar.data.url) {
        avatarUrl = user.avatar.data.url;
      } else if (user.avatar.data.base) {
        avatarUrl = `/assets/avatars/base/${user.avatar.data.base}.png`;
      }
    }
    if (currentUserId && currentUserId != req.params.id) {
      const friend = await Friend.findOne({ where: { userId: currentUserId, friendId: req.params.id } });
      isFriend = !!friend;
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl,
      avatarData: user.avatar ? user.avatar.data : null,
      friends: user.friends.map(f => ({ id: f.friendUser?.id, username: f.friendUser?.username })).filter(f => f.id),
      achievements: user.achievements,
      isFriend
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

app.post('/api/friends/remove', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const userId = decoded.id;
    const { friendId } = req.body;
    if (!friendId || friendId == userId) return res.status(400).json({ error: 'Некорректный ID друга' });
    const deleted1 = await Friend.destroy({ where: { userId, friendId } });
    const deleted2 = await Friend.destroy({ where: { userId: friendId, friendId: userId } });
    if (deleted1 + deleted2 === 0) return res.status(404).json({ error: 'Дружба не найдена' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления друга' });
  }
});