const API_BASE = 'http://localhost:5000';
let currentUser = null;
let userInventory = [];
let equippedItems = [];
let allItems = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await checkAuthAndLoadData();
    await initializeAvatarPage();
    setupEventListeners();
  } catch (error) {
    console.error('Initialization error:', error);
    handleAuthError();
  }
});

async function checkAuthAndLoadData() {
  const token = localStorage.getItem('token');
  if (!token) redirectToLogin();

  try {
    const [authCheck, avatarRes, shopRes, inventoryRes] = await Promise.all([
      fetch(`${API_BASE}/api/auth/check`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${API_BASE}/api/avatar`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${API_BASE}/api/shop`),
      fetch(`${API_BASE}/api/user/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    if (!authCheck.ok) throw new Error('Auth failed');
    if (!avatarRes.ok || !shopRes.ok || !inventoryRes.ok) {
      throw new Error('Data loading failed');
    }

    currentUser = await authCheck.json();
    const avatarData = await avatarRes.json();
    const shopData = await shopRes.json();
    const inventoryData = await inventoryRes.json();

    equippedItems = (avatarData.equippedItems || []).map(item => ({
      ...item,
      id: String(item.id)
    }));
    
    allItems = (shopData || []).map(item => ({
      ...item,
      id: String(item.id)
    }));
    
    userInventory = (inventoryData || []).map(item => ({
      ...item,
      id: String(item.id)
    }));

    updateAuthUI(currentUser.username, currentUser.isAdmin);
    
  } catch (error) {
    console.error('Initialization error:', error);
    localStorage.removeItem('token');
    redirectToLogin();
    throw error;
  }
}
async function initializeAvatarPage() {
  try {
    setupTabs();
    updateUI();
  } catch (error) {
    console.error('Page initialization failed:', error);
    throw error;
  }
}

async function loadAvatarData() {
  try {
    const response = await fetch(`${API_BASE}/api/avatar`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load avatar: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error loading avatar:', error);
    throw error;
  }
}

async function loadShopItems() {
  try {
    const response = await fetch(`${API_BASE}/api/shop`);
    if (!response.ok) {
      throw new Error(`Failed to load shop: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading shop:', error);
    throw error;
  }
}

function updateAuthUI(username, isAdmin) {
  const accountMenu = document.querySelector('.account-menu');
  const accountName = document.querySelector('.account-name');
  
  if (username) {
    accountName.textContent = username;
    accountMenu.classList.add('logged-in');
    
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.reload();
      });
    }
    
    const adminItem = document.querySelector('.admin-menu-item');
    if (adminItem) {
      adminItem.style.display = isAdmin ? 'block' : 'none';
    }
  }
}

function updateUI() {
  const activeTab = document.querySelector('.avatar-tab.active');
  const activeTabId = activeTab?.dataset.tab || 'hair';

  renderAvatar();
  renderInventory();
  renderShopItems();
  
  if (activeTabId) {
    const tab = document.querySelector(`.avatar-tab[data-tab="${activeTabId}"]`);
    tab?.click();
  }
}

function renderAvatar() {
  const avatarBase = document.querySelector('.avatar-base');
  if (!avatarBase) return;
  
  avatarBase.innerHTML = '';
  const base = document.createElement('div');
  base.className = 'avatar-part base';
  base.style.backgroundImage = `url(${API_BASE}/assets/avatars/base/base.png)`;
  avatarBase.appendChild(base);

  equippedItems.forEach(item => {
    const part = document.createElement('div');
    part.className = `avatar-part ${item.type}`;
    part.style.backgroundImage = `url(${API_BASE}${item.imageUrl})`;
    part.title = item.name;
    avatarBase.appendChild(part);
  });
}

function renderInventory() {
  const tabs = {
    'hair': document.getElementById('hair-items'),
    'clothes': document.getElementById('clothes-items'),
    'accessories': document.getElementById('accessories-items')
  };

  Object.values(tabs).forEach(tab => tab && (tab.innerHTML = ''));

  const itemsByType = userInventory.reduce((acc, item) => {
    const type = item.type === 'top' ? 'clothes' : 
                item.type === 'bottom' ? 'clothes' : 
                item.type;
    
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  Object.entries(itemsByType).forEach(([type, items]) => {
    const tab = tabs[type];
    if (!tab) return;
    
    items.forEach(item => {

      if (!item || !item.id || !item.type) {
        console.warn('Invalid item:', item);
        return;
      }
      const isEquipped = equippedItems.some(ei => String(ei.id) === String(item.id));
      const itemElement = document.createElement('div');
      itemElement.className = `avatar-item ${isEquipped ? 'equipped' : ''}`;
      itemElement.dataset.itemId = item.id;
      itemElement.dataset.itemType = item.type;
      
      itemElement.innerHTML = `
        <img src="${API_BASE}${item.imageUrl}" alt="${item.name}" loading="lazy">
        <span class="item-name">${item.name}</span>
        ${isEquipped ? '<div class="equipped-badge">✓</div>' : ''}
      `;
      
      tab.appendChild(itemElement);
    });
  });
}

function renderShopItems() {
  const shopContainer = document.querySelector('.shop-items-container');
  if (!shopContainer) return;

  shopContainer.innerHTML = '';

  if (allItems.length === 0) {
    shopContainer.innerHTML = '<p class="no-items">Магазин пока пуст</p>';
    return;
  }

  const availableItems = allItems.filter(shopItem => 
    !userInventory.some(userItem => userItem.id === shopItem.id)
  );

  if (availableItems.length === 0) {
    shopContainer.innerHTML = '<p class="no-items">Все предметы куплены!</p>';
    return;
  }

  availableItems.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    itemElement.innerHTML = `
      <img src="${API_BASE}${item.imageUrl}" alt="${item.name}">
      <div class="shop-item-info">
        <h4>${item.name}</h4>
        <p>${item.price} монет</p>
        <button class="buy-btn" data-id="${item.id}">Купить</button>
      </div>
    `;
    shopContainer.appendChild(itemElement);
  });
}

async function toggleItemEquip(itemId, itemType) {
  const loader = document.createElement('div');
  loader.className = 'equip-loader';
  document.body.appendChild(loader);
  
  try {
    console.log('Starting equip process for:', { itemId, itemType });
    const inventoryItem = userInventory.find(item => String(item.id) === String(itemId));
    if (!inventoryItem) {
      throw new Error('Предмет не найден в инвентаре');
    }

    const payload = {
      itemId: parseInt(itemId, 10), 
      itemType: inventoryItem.type 
    };
    console.log('Sending payload:', payload);

    const response = await fetch(`${API_BASE}/api/avatar/equip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Server response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(errorData.message || 'Ошибка сервера при экипировке');
    }

    const result = await response.json();
    console.log('Equip result:', result);

    equippedItems = result.equippedItems.map(item => ({
      ...item,
      id: String(item.id)
    }));

    renderAvatar();
    renderInventory();
    showNotification('Предмет успешно экипирован!');

  } catch (error) {
    console.error('Full equip error:', error);
    showNotification(`Ошибка экипировки: ${error.message}`, 'error');
  } finally {
    loader.remove();
  }
}


async function buyItem(itemId) {
  try {
    showNotification('Покупка...', 'info');
    
    const response = await fetch(`${API_BASE}/api/shop/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ itemId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка покупки');
    }

    const inventoryResponse = await fetch(`${API_BASE}/api/user/inventory`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!inventoryResponse.ok) throw new Error('Не удалось загрузить инвентарь');
    
    userInventory = await inventoryResponse.json();

    renderShopItems();
    renderInventory();
    showNotification('Предмет куплен!', 'success');
    
  } catch (error) {
    console.error('Ошибка покупки:', error);
    showNotification(`${error.message}`, 'error');
  }
}

async function saveAvatar() {
  try {
    const response = await fetch(`${API_BASE}/api/avatar/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Save failed');
    }
    
    showNotification('Аватар сохранен!');
    
  } catch (error) {
    console.error('Save error:', error);
    showNotification('Ошибка сохранения аватара', 'error');
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll('.avatar-tab');
  const itemsContainers = document.querySelectorAll('.avatar-items');

  if (!tabs.length || !itemsContainers.length) {
    console.error('Tabs or containers not found!');
    return;
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));

      tab.classList.add('active');
      const tabId = tab.dataset.tab;
      if (!tabId) {
        console.error('Data-tab attribute missing!');
        return;
      }
      itemsContainers.forEach(container => {
        container.style.display = 'none';
        container.classList.remove('active');
      });
      const activeContainer = document.getElementById(`${tabId}-items`);
      if (activeContainer) {
        activeContainer.style.display = 'grid';
        activeContainer.classList.add('active');
      } else {
        console.error(`Container #${tabId}-items not found!`);
      }
    });
  });
  if (tabs[0]) {
    tabs[0].click();
  }
}

function setupEventListeners() {
    document.querySelectorAll('.avatar-items-container').forEach(container => {
      container.addEventListener('click', async (e) => {
        const itemElement = e.target.closest('.avatar-item');
        if (!itemElement) return;
        try {
            const itemId = itemElement.dataset.itemId;
            const item = userInventory.find(i => String(i.id) === String(itemId));
            
            if (!item) {
            throw new Error('Предмет не найден');
            }
            
            console.log('Equipping item:', {
            id: item.id,
            type: item.type,
            name: item.name
            });
            
            await toggleItemEquip(item.id, item.type);
        } catch (error) {
            console.error('Item click error:', error);
            showNotification(error.message, 'error');
        }
    });
  });
  
  const shopContainer = document.querySelector('.shop-items');
  if (shopContainer) {
    shopContainer.addEventListener('click', (e) => {
      const buyBtn = e.target.closest('.buy-btn');
      if (!buyBtn) return;
      
      const itemId = buyBtn.dataset.id;
      buyItem(itemId);
    });
  }
  const saveBtn = document.querySelector('.save-avatar-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAvatar);
  }
  document.querySelector('.shop-items-container')?.addEventListener('click', (e) => {
    const buyBtn = e.target.closest('.buy-btn');
    if (!buyBtn) return;
    
    const itemId = buyBtn.dataset.id;
    buyItem(itemId);
  });
}

function showNotification(message, type = 'success') {
  let container = document.getElementById('notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notifications-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '1000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = message;
  notification.style.opacity = '0';
  notification.style.transform = 'translateX(100%)';
  notification.style.transition = 'all 0.3s ease';

  container.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 10);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function redirectToLogin() {
  window.location.href = 'index.html';
}

function handleAuthError() {
  localStorage.removeItem('token');
  redirectToLogin();
}