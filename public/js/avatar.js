const API_BASE_URL = 'http://127.0.0.1:5000';
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Пожалуйста, войдите в аккаунт для доступа к персонажу');
    window.location.href = 'index.html';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/check`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Невалидный токен');

    await loadAvatar();
    await loadShopItems();
    setupTabs();
    setupSaveButton();

  } catch (error) {
    console.error('Ошибка проверки авторизации:', error);
    localStorage.removeItem('token'); 
    alert('Сессия истекла. Пожалуйста, войдите снова.');
    window.location.href = 'index.html';
  }
});

async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
  }
}

async function loadAvatar() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/avatar`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      renderAvatar(data.avatar, data.equippedItems);
      renderInventory(data.equippedItems);
    }
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
  }
}

function renderAvatar(avatarData, equippedItems) {
  const avatarBase = document.querySelector('.avatar-base');
  avatarBase.innerHTML = '';

  const base = document.createElement('div');
  base.className = 'avatar-part base';
  avatarBase.appendChild(base);

  equippedItems.forEach(item => {
    const part = document.createElement('div');
    part.className = `avatar-part ${item.type}`;
    part.style.backgroundImage = `url(${API_BASE_URL}${item.imageUrl})`;
    avatarBase.appendChild(part);
  });
}

function renderInventory(items) {
  const tabs = {
    'hair': document.getElementById('hair-items'),
    'clothes': document.getElementById('clothes-items'),
    'accessories': document.getElementById('accessories-items')
  };
  
  Object.values(tabs).forEach(tab => tab.innerHTML = '');
  items.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = `avatar-item ${item.equipped ? 'equipped' : ''}`;
    itemElement.dataset.itemId = item.id;
    itemElement.dataset.type = item.type;
    
    const img = document.createElement('img');
    img.src = `${API_BASE_URL}${item.imageUrl}`;
    img.alt = item.name;
    
    itemElement.appendChild(img);
    itemElement.addEventListener('click', () => equipItem(item.id, item.type));
    
    tabs[item.type].appendChild(itemElement);
  });
}

async function equipItem(itemId, itemType) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/avatar/equip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ itemId, itemType })
    });
    
    if (response.ok) await loadAvatar();
  } catch (error) {
    console.error('Ошибка экипировки:', error);
  }
}

async function loadShopItems() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shop`);
    if (response.ok) {
      const items = await response.json();
      renderShopItems(items);
    }
  } catch (error) {
    console.error('Ошибка загрузки магазина:', error);
  }
}

function renderShopItems(items) {
  const shopContainer = document.querySelector('.shop-items');
  shopContainer.innerHTML = '';
  
  items.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    
    const img = document.createElement('img');
    img.src = `${API_BASE_URL}${item.imageUrl}`;
    img.alt = item.name;
    
    const name = document.createElement('span');
    name.textContent = item.name;
    
    const price = document.createElement('span');
    price.textContent = `${item.price} монет`;
    
    const buyBtn = document.createElement('button');
    buyBtn.textContent = 'Купить';
    buyBtn.addEventListener('click', () => buyItem(item.id));
    
    itemElement.append(img, name, price, buyBtn);
    shopContainer.appendChild(itemElement);
  });
}

async function buyItem(itemId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ itemId })
    });
    
    if (response.ok) {
      alert('Покупка успешна!');
      await loadAvatar();
      await loadShopItems();
    } else {
      const error = await response.json();
      alert(error.message || 'Ошибка покупки');
    }
  } catch (error) {
    console.error('Ошибка покупки:', error);
    alert('Ошибка сети');
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll('.avatar-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.avatar-items').forEach(content => {
        content.style.display = 'none';
      });
      
      document.getElementById(`${tab.dataset.tab}-items`).style.display = 'grid';
    });
  });
}

function setupSaveButton() {
  document.querySelector('.save-avatar-btn').addEventListener('click', async () => {
    try {
      const avatarData = {};
      
      const response = await fetch(`${API_BASE_URL}/api/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(avatarData)
      });
      
      if (response.ok) {
        alert('Аватар сохранён!');
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения');
    }
  });
}