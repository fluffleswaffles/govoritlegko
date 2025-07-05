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
  }
});

const Item = sequelize.define('Item', {
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  type: { 
    type: DataTypes.STRING, 
    allowNull: false,
    validate: {
      isIn: [['hair', 'top', 'bottom', 'accessory']]
    }
  },
  price: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    validate: { min: 0 }
  },
  imageUrl: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }
});

const Inventory = sequelize.define('Inventory', {
  equipped: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  }
});

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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
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
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id);
    const item = await Item.findByPk(req.body.itemId);
    
    if (!user || !item) return res.status(404).json({ message: 'User or item not found' });

    await Inventory.create({
      UserId: user.id,
      ItemId: item.id,
      equipped: false
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Purchase failed' });
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