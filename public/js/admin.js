console.log('[admin.js] script loaded');
try {
window.API_BASE = 'http://localhost:5000';
let items = [];

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminAuth();
  initModals();
  setupForms();
  await loadData();
  await loadGamesAdmin();

  const addTypeSelect = document.querySelector('#add-item-form select[name="type"]');
  if (addTypeSelect && !addTypeSelect.querySelector('option[value="face"]')) {
    const faceOption = document.createElement('option');
    faceOption.value = 'face';
    faceOption.textContent = 'Лицо';
    addTypeSelect.appendChild(faceOption);
  }
  const editTypeSelect = document.getElementById('edit-item-type');
  if (editTypeSelect && !editTypeSelect.querySelector('option[value="face"]')) {
    const faceOption2 = document.createElement('option');
    faceOption2.value = 'face';
    faceOption2.textContent = 'Лицо';
    editTypeSelect.appendChild(faceOption2);
  }
});

async function checkAdminAuth() {
  const token = localStorage.getItem('token');
  if (!token) redirectToLogin();

  try {
    const response = await fetch(`${API_BASE}/api/auth/check`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!data.isAdmin) redirectToLogin();
  } catch (error) {
    redirectToLogin();
  }
}

function initModals() {
  const modal = document.getElementById('editModal');
  if (!modal) return;

  document.querySelector('.close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
}

function setupForms() {
  const gameForm = document.getElementById('add-game-form');
  const addItemForm = document.getElementById('add-item-form'); 
  if (gameForm) {
    gameForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('[admin.js] submit add-game-form');
      const formData = new FormData(gameForm);
      for (let [key, value] of formData.entries()) {
        console.log(`[admin.js] formData: ${key} =`, value);
      }
      try {
        const resp = await fetch(`${API_BASE}/api/games`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        console.log('[admin.js] fetch response', resp.status);
        gameForm.reset();
        await loadGamesAdmin();
        alert('Игра добавлена!');
      } catch (err) {
        console.error('[admin.js] Ошибка загрузки игры', err);
        alert('Ошибка загрузки игры');
      }
      return false;
    });
  }

    if (addItemForm) {
    addItemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(addItemForm);
      try {
        const resp = await fetch(`${API_BASE}/api/admin/items`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (!resp.ok) throw new Error('Ошибка добавления предмета');
        addItemForm.reset();
        await loadItems();
        alert('Предмет добавлен!');
      } catch (err) {
        console.error('[admin.js] Ошибка добавления предмета', err);
        alert('Ошибка добавления предмета');
      }
      return false;
    });
  }

  document.getElementById('edit-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-item-id').value;
    const data = {
      name: document.getElementById('edit-item-name').value,
      type: document.getElementById('edit-item-type').value,
      price: document.getElementById('edit-item-price').value
    };

    try {
      await updateItem(id, data);
      await loadItems();
      document.getElementById('editModal').style.display = 'none';
    } catch (error) {
      console.error('Ошибка обновления:', error);
    }
  });

  const rewardForm = document.getElementById('send-reward-form');
  if (rewardForm) {
    const userIdInput = document.getElementById('rewardUserId');
    const allUsersCheckbox = document.getElementById('rewardAllUsers');
    allUsersCheckbox.addEventListener('change', () => {
      userIdInput.disabled = allUsersCheckbox.checked;
      if (allUsersCheckbox.checked) userIdInput.value = '';
    });
    rewardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const allUsers = allUsersCheckbox.checked;
      const userId = userIdInput.value;
      const text = document.getElementById('rewardText').value;
      const coins = Number(document.getElementById('rewardCoins').value);
      const status = document.getElementById('rewardStatus');
      status.textContent = '...';
      try {
        const resp = await fetch(`${API_BASE}/api/admin/send-reward`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: allUsers ? undefined : Number(userId), text, coins, allUsers })
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
          status.textContent = 'Отправлено!';
        } else {
          status.textContent = data.error || 'Ошибка';
        }
      } catch (err) {
        status.textContent = 'Ошибка';
      }
    });
  }
}

async function loadData() {
  await loadItems();
  await loadUsers();
}

async function loadItems() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/items`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    items = await response.json();
    renderItems();
  } catch (error) {
    console.error('Ошибка загрузки предметов:', error);
  }
}

function renderItems() {
  const container = document.getElementById('admin-items-container');
  container.innerHTML = '';

  items.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'admin-item-card';
    itemElement.innerHTML = `
      <img src="${API_BASE}${item.imageUrl}" alt="${item.name}" class="admin-item-image">
      <h3>${item.name}</h3>
      <p><strong>ID:</strong> ${item.id}</p>
      <p>Тип: ${item.type}</p>
      <p>Цена: ${item.price} монет</p>
      <p>Используется: ${item.usersCount || 0} пользователями</p>
      <div class="item-actions">
        <button class="edit-btn" data-id="${item.id}">Изменить</button>
        <button class="delete-btn" data-id="${item.id}">Удалить</button>
      </div>
    `;
    container.appendChild(itemElement);
  });

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const itemId = btn.dataset.id;
    if (!itemId) return;

    if (btn.classList.contains('edit-btn')) {
      const item = items.find(i => i.id == itemId);
      if (item) openEditModal(item);
    } else if (btn.classList.contains('delete-btn')) {
      deleteItem(itemId);
    }
  });
}

function openEditModal(item) {
  document.getElementById('edit-item-id').value = item.id;
  document.getElementById('edit-item-name').value = item.name;
  document.getElementById('edit-item-type').value = item.type;
  document.getElementById('edit-item-price').value = item.price;
  document.getElementById('editModal').style.display = 'flex';
}

async function updateItem(id, data) {
  const response = await fetch(`${API_BASE}/api/admin/items/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Ошибка обновления');
  return await response.json();
}

async function deleteItem(id) {
  if (!confirm('Вы уверены, что хотите удалить этот предмет?')) return;
  try {
    await fetch(`${API_BASE}/api/admin/items/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    await loadItems();
  } catch (error) {
    console.error('Ошибка удаления:', error);
  }
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const users = await response.json();
    renderUsers(users);
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error);
  }
}

function renderUsers(users) {
  const container = document.getElementById('users-list');
  container.innerHTML = users.map(user => `
    <div class="user-card">
      <h3>${user.username}</h3>
      <p>${user.email}</p>
      <label>
        <input 
          type="checkbox" 
          ${user.isAdmin ? 'checked' : ''}
          onchange="toggleAdmin(${user.id}, this.checked)"
        >
        Администратор
      </label>
    </div>
  `).join('');
}

async function toggleAdmin(userId, isAdmin) {
  await fetch(`${API_BASE}/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ isAdmin })
  });
}

async function loadGamesAdmin() {
  try {
    const res = await fetch(`${API_BASE}/api/games`);
    const games = await res.json();
    renderGamesAdmin(games);
  } catch (err) {
    console.error('[admin.js] Ошибка загрузки игр', err);
  }
}

function renderGamesAdmin(games) {
  const container = document.getElementById('admin-games-list');
  if (!container) return;
  container.innerHTML = games.map(game => `
    <div class="admin-game-card">
      <img src="${game.iconUrl || '/public/assets/icons/placeholder.png'}" alt="icon" class="admin-game-icon" style="width:160px;height:96px;object-fit:cover;">
      <h3>${game.name}</h3>
      <p>${game.description || ''}</p>
      <a href="/games/${game.id}/game.html" target="_blank">Открыть</a>
      <button class="edit-game-btn" data-id="${game.id}">Редактировать</button>
      <button class="delete-game-btn" data-id="${game.id}">Удалить</button>
    </div>
  `).join('');
  container.querySelectorAll('.delete-game-btn').forEach(btn => {
    btn.onclick = async (e) => {
      if (!confirm('Удалить игру?')) return;
      await fetch(`${API_BASE}/api/games/${btn.dataset.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      await loadGamesAdmin();
    };
  });
}

function redirectToLogin() {
  window.location.href = 'index.html';
}
} catch (e) {
  console.error('[admin.js] FATAL ERROR:', e);
}