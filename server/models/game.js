const fs = require('fs');
const path = require('path');
const GAMES_DIR = path.join(__dirname, '../../public/games');
const DB_PATH = path.join(__dirname, '../config/games.json');

function getGames() {
  if (!fs.existsSync(DB_PATH)) return [];
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveGames(games) {
  fs.writeFileSync(DB_PATH, JSON.stringify(games, null, 2));
}

function addGame(game) {
  const games = getGames();
  games.push(game);
  saveGames(games);
}

function updateGame(id, data) {
  const games = getGames();
  const idx = games.findIndex(g => g.id === id);
  if (idx === -1) return false;
  games[idx] = { ...games[idx], ...data };
  saveGames(games);
  return true;
}

function deleteGame(id) {
  let games = getGames();
  games = games.filter(g => g.id !== id);
  saveGames(games);
  const gameDir = path.join(GAMES_DIR, id);
  if (fs.existsSync(gameDir)) fs.rmSync(gameDir, { recursive: true, force: true });
}

module.exports = {
  getGames,
  addGame,
  updateGame,
  deleteGame,
};
