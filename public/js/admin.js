const API_BASE = 'http://localhost:5000'; 

const editModal = document.getElementById('editModal');
const editForm = document.getElementById('edit-item-form');
const closeModalBtn = document.querySelector('.close-modal');

closeModalBtn.addEventListener('click', () => {
  editModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === editModal) {
    editModal.style.display = 'none';
  }
});

function openEditModal(item) {
  document.getElementById('edit-item-id').value = item.id;
  document.getElementById('edit-item-name').value = item.name;
  document.getElementById('edit-item-type').value = item.type;
  document.getElementById('edit-item-price').value = item.price;
  
  editModal.style.display = 'block';
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const itemId = document.getElementById('edit-item-id').value;
  const name = document.getElementById('edit-item-name').value;
  const type = document.getElementById('edit-item-type').value;
  const price = document.getElementById('edit-item-price').value;
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ name, type, price })
    });
    
    if (!response.ok) {
      throw new Error('Ошибка при обновлении предмета');
    }
    
    editModal.style.display = 'none';
    await loadItemsForAdmin();
    alert('Предмет успешно обновлён!');
    
  } catch (error) {
    console.error('Ошибка редактирования:', error);
    alert(error.message);
  }
});

async function loadItemsForAdmin() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/items`, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка загрузки предметов');
    }
    
    const items = await response.json();
    renderAdminItems(items);
  } catch (error) {
    console.error('Ошибка загрузки предметов:', error);
    alert(`Ошибка: ${error.message}\nПроверьте консоль для деталей.`);
    if (error.message.includes('401')) {
      window.location.href = 'index.html';
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminAuth();
  setupItemForm();
  loadUsers();
});

async function checkAdminAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/check`, {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
    
    if (!response.ok || !(await response.json()).isAdmin) {
      redirectToLogin();
    }
  } catch (error) {
    redirectToLogin();
  }
}

async function addItem(itemData) {
  try {
    const formData = new FormData();
    formData.append('name', itemData.name);
    formData.append('type', itemData.type);
    formData.append('price', itemData.price);
    formData.append('image', itemData.imageFile);

    const response = await fetch(`${API_BASE}/api/admin/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка сервера');
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка добавления предмета:', error);
    throw error;
  }
}

function redirectToLogin() {
  alert('Требуются права администратора');
  window.location.href = 'index.html';
}

function setupItemForm() {
  const form = document.getElementById('add-item-form');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      name: form.name.value.trim(),
      type: form.type.value,
      price: form.price.value,
      imageFile: form.image.files[0]
    };
    if (!formData.name || !formData.type || !formData.price || !formData.imageFile) {
      alert('Заполните все поля и выберите изображение');
      return;
    }

    try {
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Добавление...';

      const newItem = await addItem(formData);
      alert(`Предмет "${newItem.name}" успешно добавлен!`);
      form.reset();
      
      await loadItemsForAdmin();
      
    } catch (error) {
      console.error('Ошибка:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Добавить предмет';
    }
  });
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      
    });
    
    if (response.ok) {
      const users = await response.json();
      renderUsers(users);
    }
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

async function deleteItemPermanently(itemId) {
  try {
    const response = await fetch(`${API_BASE}/api/admin/items/${itemId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Не удалось получить информацию о предмете');
    }
    
    const item = await response.json();
    let confirmMessage = `Вы уверены, что хотите удалить предмет "${item.name}"?`;
    if (item.usersCount > 0) {
      confirmMessage += `\n\nВнимание! Этот предмет используется ${item.usersCount} пользователями.`;
    }
    
    if (!confirm(confirmMessage)) return;
    const deleteResponse = await fetch(`${API_BASE}/api/admin/items/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      throw new Error(error.error || 'Ошибка при удалении');
    }
    await loadItemsForAdmin();
    alert('Предмет успешно удалён!');
    
  } catch (error) {
    console.error('Ошибка удаления:', error);
    alert(`Ошибка: ${error.message}`);
  }
}

function renderAdminItems(items) {
  const container = document.getElementById('admin-items-container');
  container.innerHTML = '';

  items.forEach(item => {
    const itemCard = document.createElement('div');
    itemCard.className = 'admin-item-card';
    
    itemCard.innerHTML = `
      <img src="${API_BASE}${item.imageUrl}" alt="${item.name}" class="admin-item-image">
      <h4>${item.name}</h4>
      <p>Тип: ${item.type}</p>
      <p>Цена: ${item.price} монет</p>
      <p>Используется: ${item.usersCount || 0} пользователями</p>
      <div class="admin-item-actions">
        <button class="edit-btn" data-id="${item.id}">Изменить</button>
        <button class="delete-btn-admin" data-id="${item.id}">Удалить</button>
      </div>
    `;
    
    container.appendChild(itemCard);
  });
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.id;
      const item = items.find(i => i.id == itemId);
      if (item) openEditModal(item);
    });
  });

  document.querySelectorAll('.delete-btn-admin').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.id;
      deleteItemPermanently(itemId);
    });
  });
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