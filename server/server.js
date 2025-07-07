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

const app = express();

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

User.hasOne(AvatarStorage);
AvatarStorage.belongsTo(User);

User.belongsToMany(Item, { through: Inventory });
Item.belongsToMany(User, { through: Inventory });

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
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

app.use('/api/games', gamesRouter);

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    
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