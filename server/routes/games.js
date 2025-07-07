const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getGames, addGame, updateGame, deleteGame } = require('../models/game');

const router = express.Router();
const GAMES_DIR = path.join(__dirname, '../../public/games');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const gameId = req.body.id || req.params.id;
    const dir = path.join(GAMES_DIR, gameId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

router.use((req, res, next) => {
  console.log(`[GAMES ROUTE] ${req.method} ${req.originalUrl}`);
  next();
});

router.get('/', (req, res) => {
  res.json(getGames());
});

router.post('/', upload.fields([
  { name: 'files', maxCount: 10 },
  { name: 'icon', maxCount: 1 }
]), (req, res) => {
  console.log('POST /api/games body:', req.body);
  console.log('POST /api/games files:', req.files);
  const { id, name, description } = req.body;
  if (!id || !name) {
    console.log('Missing id or name');
    return res.status(400).json({ message: 'id and name required' });
  }
  let iconUrl = '';
  if (req.files && req.files.icon && req.files.icon[0]) {
    iconUrl = `/games/${id}/${req.files.icon[0].originalname}`;
  }
  const files = req.files.files ? req.files.files.map(f => f.originalname) : [];
  addGame({ id, name, description, iconUrl, files });
  res.json({ success: true });
});

router.put('/:id', (req, res) => {
  const { name, description } = req.body;
  const ok = updateGame(req.params.id, { name, description });
  if (!ok) return res.status(404).json({ message: 'Game not found' });
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  deleteGame(req.params.id);
  res.json({ success: true });
});

module.exports = router;
