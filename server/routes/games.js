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
    let filePath = file.originalname;
    if (filePath.startsWith('TemplateData/')) {
      const dir = path.join(GAMES_DIR, gameId, 'TemplateData');
      fs.mkdirSync(dir, { recursive: true });
      return cb(null, dir);
    }
    const dir = path.join(GAMES_DIR, gameId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const baseName = path.basename(file.originalname);
    cb(null, baseName);
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const gameId = req.body.id || req.params.id;
      const relativePath = file.originalname;
      const fullPath = path.join(GAMES_DIR, gameId, path.dirname(relativePath));
      fs.mkdirSync(fullPath, { recursive: true });
      cb(null, fullPath);
    },
    filename: (req, file, cb) => {
      cb(null, path.basename(file.originalname));
    }
  })
});

router.use((req, res, next) => {
  console.log(`[GAMES ROUTE] ${req.method} ${req.originalUrl}`);
  next();
});

router.get('/', (req, res) => {
  res.json(getGames());
});

router.post('/', upload.fields([
  { name: 'files', maxCount: 30 },
  { name: 'icon', maxCount: 1 }
]), (req, res) => {
  const { id, name, description } = req.body;
  if (!id || !name) {
    return res.status(400).json({ message: 'id and name required' });
  }

  let iconUrl = '';
  if (req.files?.icon?.[0]) {
    iconUrl = `/games/${id}/${req.files.icon[0].originalname}`;
  }

  const uploadedFiles = req.files.files || [];
  const fileNames = uploadedFiles.map(f => f.originalname);

  addGame({ id, name, description, iconUrl, files: fileNames });

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
  const dir = path.join(GAMES_DIR, req.params.id);
  fs.rmSync(dir, { recursive: true, force: true });
  res.json({ success: true });
});

module.exports = router;
