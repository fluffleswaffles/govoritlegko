let games = [];

console.log('[admin-games.js] script loaded');
try {
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[admin-games.js] DOMContentLoaded');
  if (document.getElementById('admin-games-section')) {
    console.log('[admin-games.js] admin-games-section найден');
    await loadGames();
    setupGameForm();
  } else {
    console.log('[admin-games.js] admin-games-section НЕ найден');
  }
});

async function loadGames() {
  const res = await fetch(`${window.API_BASE}/api/games`);
  games = await res.json();
  renderGames();
}

function renderGames() {
  const container = document.getElementById('admin-games-list');
  if (!container) return;
  container.innerHTML = games.map(game => `
    <div class="admin-game-card">
      <img src="${game.iconUrl || '/public/assets/icons/placeholder.png'}" alt="icon" class="admin-game-icon" style="width:160px;height:96px;object-fit:cover;">
      <h3>${game.name}</h3>
      <p>${game.description || ''}</p>
      <a href="/games/${game.id}/game.html" target="_blank">Открыть</a>
      <button onclick="editGame('${game.id}')">Редактировать</button>
      <button onclick="deleteGame('${game.id}')">Удалить</button>
    </div>
  `).join('');
}

function setupGameForm() {
  const form = document.getElementById('add-game-form');
  if (!form) {
    console.log('[admin-games.js] add-game-form НЕ найден');
    return;
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[admin-games.js] submit add-game-form');
    const formData = new FormData(form);
    for (let [key, value] of formData.entries()) {
      console.log(`[admin-games.js] formData: ${key} =`, value);
    }
    try {
      const resp = await fetch(`${window.API_BASE}/api/games`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      console.log('[admin-games.js] fetch response', resp.status);
      form.reset();
      await loadGames();
      alert('Игра добавлена!');
    } catch (err) {
      console.error('[admin-games.js] Ошибка загрузки игры', err);
      alert('Ошибка загрузки игры');
    }
    return false;
  });
}

window.editGame = function(id) {
  alert('Редактирование пока не реализовано');
};

window.deleteGame = async function(id) {
  if (!confirm('Удалить игру?')) return;
  await fetch(`${window.API_BASE}/api/games/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
  await loadGames();
};
} catch (e) {
  console.error('[admin-games.js] FATAL ERROR:', e);
}
