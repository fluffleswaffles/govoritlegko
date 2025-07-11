
let currentUser = null;
let equippedItems = [];
let userInventory = [];
let allItems = [];
let userCoins = 0;

console.log('Avatar script initialized');
console.assert(typeof updateAuthUI === 'function', 'updateAuthUI not found');

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!(await avatarCheckAuth())) {
      redirectToLogin();
      return;
    }
    
    await Promise.all([
      loadInitialData(),
      loadUserData()
    ]);
    
    initializePage();
  } catch (error) {
    console.error('Initialization error:', error);
    handleAuthError();
  }
});

async function avatarCheckAuth() {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE}/api/auth/check`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      currentUser = await response.json();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

function handleAuthError() {
  localStorage.removeItem('token');
  redirectToLogin();
}

async function loadInitialData() {
  const token = localStorage.getItem('token');
  try {
    const [avatarRes, shopRes, inventoryRes] = await Promise.all([
      fetch(`${API_BASE}/api/avatar`, { 
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${API_BASE}/api/shop`),
      fetch(`${API_BASE}/api/user/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    [equippedItems, allItems, userInventory] = await Promise.all([
      avatarRes.ok ? avatarRes.json().then(data => data.equippedItems || []) : [],
      shopRes.ok ? shopRes.json() : [],
      inventoryRes.ok ? inventoryRes.json() : []
    ]);
    
  } catch (error) {
    console.error('Data loading error:', error);
    throw error;
  }
}

async function updateCoinsDisplay() {
  const coinsElement = document.querySelector('.coins-count');
  if (coinsElement) {
    coinsElement.textContent = userCoins;
    coinsElement.classList.add('coins-update');
    setTimeout(() => {
      coinsElement.classList.remove('coins-update');
    }, 500);
  }
}

async function loadUserData() {
  try {
    const response = await fetch(`${API_BASE}/api/user/me`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    userCoins = data.coins || 0;
    updateCoinsDisplay();
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function initializePage() {
  setupTabs();
  setupEventListeners();
  updateUI();
}

function updateUI() {
  renderAvatar();
  renderInventory(getActiveTab());
  renderShopItems();
}

function getActiveTab() {
  const activeTab = document.querySelector('.avatar-tab.active');
  return activeTab?.dataset.tab || 'face';
}

function renderAvatar() {
  const avatarBase = document.querySelector('.avatar-base');
  if (!avatarBase) {
    console.error('Элемент .avatar-base не найден');
    return;
  }
  const baseUrl = `${API_BASE}/assets/avatars/base/base.png`;
  console.log('Пытаюсь загрузить:', baseUrl);
  
  avatarBase.innerHTML = '';
  const base = document.createElement('div');
  base.className = 'avatar-part base';
  base.style.backgroundImage = `url(${baseUrl})`;
  base.onload = () => console.log('Base image loaded');
  base.onerror = () => console.error('Failed to load base image');
  
  avatarBase.appendChild(base);

  equippedItems.forEach(item => {
    const part = document.createElement('div');
    part.className = `avatar-part ${item.type}`;
    part.style.backgroundImage = `url(${API_BASE}${item.imageUrl})`;
    part.title = item.name;
    avatarBase.appendChild(part);
  });
}


function setupTabs() {
  const tabs = [
    { name: 'face', label: 'Лица' },
    { name: 'hair', label: 'Причёски' },
    { name: 'clothes', label: 'Одежда' },
    { name: 'accessories', label: 'Аксессуары' }
  ];
  
  const container = document.querySelector('.avatar-tabs');
  container.innerHTML = '';
  
  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.className = `avatar-tab ${tab.name === 'face' ? 'active' : ''}`;
    button.dataset.tab = tab.name;
    button.textContent = tab.label;
    button.addEventListener('click', () => {
      document.querySelectorAll('.avatar-tab').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      renderInventory(tab.name);
    });
    container.appendChild(button);
  });
}

function getItemIconUrl(item) {
  return `${API_BASE}/assets/avatars/icons/${item.id}-icon.png`;
}

function renderItemsWithIcons(tab, items) {
  items.forEach(item => {
    if (!item.id || !item.name || !item.imageUrl) return;
    const isEquipped = equippedItems.some(ei => String(ei.id) === String(item.id));
    const itemElement = document.createElement('div');
    itemElement.className = `avatar-item ${isEquipped ? 'equipped' : ''}`;
    itemElement.dataset.itemId = item.id;
    itemElement.dataset.itemType = item.type;

    const iconUrl = getItemIconUrl(item);
    itemElement.innerHTML = `
      <img src="${iconUrl}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='${API_BASE}${item.imageUrl}'">
      <span class="item-name">${item.name}</span>
      ${isEquipped ? '<div class="equipped-badge">✓</div>' : ''}
    `;
    if (item.type === 'face') {
      itemElement.addEventListener('click', () => {
        if (!isEquipped) changeFace(item.id);
      });
    } else {
      itemElement.addEventListener('click', () => {
        toggleItemEquip(item.id, item.type);
      });
    }
    tab.appendChild(itemElement);
  });
}

function renderInventory(activeTabName) {
  const typeToTabMap = {
    'face': 'face-items',
    'hair': 'hair-items',
    'top': 'clothes-items',
    'bottom': 'clothes-items',
    'accessory': 'accessories-items'
  };
  const tabVisibility = {
    'face': ['face-items'],
    'hair': ['hair-items'],
    'clothes': ['clothes-items'],
    'accessories': ['accessories-items']
  };

  Object.values(tabVisibility).flat().forEach(tabId => {
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.classList.remove('active');
      tab.innerHTML = '';
    }
  });
  if (activeTabName && tabVisibility[activeTabName]) {
    tabVisibility[activeTabName].forEach(tabId => {
      const tab = document.getElementById(tabId);
      if (tab) tab.classList.add('active');
    });
  }

  let itemsByTab = {};
  if (activeTabName === 'clothes') {
    itemsByTab['clothes-items'] = userInventory.filter(item => item.type === 'top' || item.type === 'bottom');
  } else {
    itemsByTab = userInventory.reduce((acc, item) => {
      const tabId = typeToTabMap[item.type];
      if (!tabId) return acc;
      if (!acc[tabId]) acc[tabId] = [];
      acc[tabId].push(item);
      return acc;
    }, {});
  }
  Object.entries(itemsByTab).forEach(([tabId, items]) => {
    const tab = document.getElementById(tabId);
    if (!tab) return;
    renderItemsWithIcons(tab, items);
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
    const iconUrl = getItemIconUrl(item);
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    itemElement.innerHTML = `
      <img src="${iconUrl}" alt="${item.name}" onerror="this.onerror=null;this.src='${API_BASE}${item.imageUrl}'">
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
    const activeTab = document.querySelector('.avatar-tab.active');
    const activeTabId = activeTab?.dataset.tab || 'face';
    renderInventory(activeTabId);
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
    const response = await fetch(`${API_BASE}/api/shop/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка покупки');
    }
    window.location.reload();
    
  } catch (error) {
    showNotification(error.message, 'error');
    console.error('Ошибка покупки:', error);
  }
}

async function saveAvatarState() {
  const loader = document.createElement('div');
  loader.className = 'save-loader';
  loader.textContent = 'Сохранение...';
  document.body.appendChild(loader);

  try {
    const response = await fetch(`${API_BASE}/api/avatar/save-state`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok || !data || !data.success) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    if (data.state) {
      equippedItems = data.state;
      renderAvatar();
    }
    const activeTab = document.querySelector('.avatar-tab.active');
    const activeTabId = activeTab?.dataset.tab || 'face';
    renderInventory(activeTabId);
    await saveAvatarImageToServer();

    showNotification('Аватар успешно сохранён!', 'success');
  } catch (error) {
    console.error('Save state error:', error);
    showNotification(`Ошибка сохранения: ${error.message}`, 'error');
    checkActualSavedState();
  } finally {
    loader.remove();
  }
}

async function saveAvatarImageToServer() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const layers = [
    { type: 'base', path: '/assets/avatars/base/base.png' },
    ...equippedItems.map(item => ({ type: item.type, path: item.imageUrl }))
  ];

  for (const layer of layers) {
    if (!layer.path) continue;
    try {
      await drawImageOnCanvas(ctx, API_BASE + layer.path, size, size);
    } catch (e) {
      console.warn('Не удалось загрузить слой аватара:', layer.path);
    }
  }
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Не удалось создать PNG');
  const formData = new FormData();
  formData.append('avatar', blob, 'avatar.png');
  const uploadRes = await fetch(`${API_BASE}/api/avatar/upload-image`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    body: formData
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.success) {
    throw new Error(uploadData.error || 'Ошибка загрузки PNG-аватара');
  }
  console.log('PNG-аватар успешно загружен:', uploadData.url);
  const avatarUrl = uploadData.url + '?t=' + Date.now();
  window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { url: avatarUrl } }));
}

async function drawImageOnCanvas(ctx, url, w, h) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, w, h);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
}

function setupEventListeners() {
  document.addEventListener('click', async (e) => {
    const avatarItem = e.target.closest('.avatar-item');
    if (avatarItem) {
      try {
        const itemId = avatarItem.dataset.itemId;
        const itemType = avatarItem.dataset.itemType;
        const item = userInventory.find(i => String(i.id) === String(itemId));
        
        if (!item) {
          throw new Error('Предмет не найден');
        }
        
        console.log('Equipping item:', { id: item.id, type: item.type, name: item.name });
        await toggleItemEquip(item.id, item.type);
      } catch (error) {
        console.error('Item click error:', error);
        showNotification(error.message, 'error');
      }
      return;
    }

    const buyBtn = e.target.closest('.buy-btn');
    if (buyBtn) {
      try {
        const itemId = buyBtn.dataset.id;
        await buyItem(itemId);
      } catch (error) {
        console.error('Buy error:', error);
        showNotification(error.message, 'error');
      }
      return;
    }

    const avatarTab = e.target.closest('.avatar-tab');
    if (avatarTab) {
      document.querySelectorAll('.avatar-tab').forEach(t => t.classList.remove('active'));
      avatarTab.classList.add('active');
      renderInventory(avatarTab.dataset.tab);
      return;
    }

    const saveBtn = e.target.closest('.save-avatar-btn');
    if (saveBtn) {
      try {
        await saveAvatarState();
      } catch (error) {
        console.error('Save error:', error);
        showNotification(error.message, 'error');
      }
    }
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
  window.location.href = `index.html?returnUrl=${encodeURIComponent(window.location.pathname)}`;
}