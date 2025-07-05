const API_BASE = 'http://localhost:5000';



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

function redirectToLogin() {
  alert('Требуются права администратора');
  window.location.href = 'index.html';
}

function setupItemForm() {
  document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('type', e.target.type.value);
    formData.append('name', e.target.name.value);
    formData.append('price', e.target.price.value);
    formData.append('image', e.target.image.files[0]);
    
    try {
      const response = await fetch('/api/admin/items', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        alert('Предмет успешно добавлен!');
        e.target.reset();
      } else {
        throw new Error(await response.text());
      }
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
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