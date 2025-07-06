const API_BASE = 'http://localhost:5000';
let items = [];

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminAuth();
  initModals();
  setupForms();
  await loadData();

  // В выпадающем списке типа предмета добавим вариант "Лицо"
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
  document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    try {
      const response = await fetch(`${API_BASE}/api/admin/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Ошибка добавления');
      
      form.reset();
      await loadItems();
      alert('Предмет успешно добавлен!');
    } catch (error) {
      console.error('Ошибка:', error);
      alert(error.message);
    }
  });
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

function redirectToLogin() {
  window.location.href = 'index.html';
}