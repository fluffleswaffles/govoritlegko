const API_URL = "http://localhost:5000/api/auth";
const API_BASE = 'http://localhost:5000';

function handleAccountClick() {
  const token = localStorage.getItem('token');
  if (!token) {
    openLoginModal();
    return false;
  }
  return false;
}

window.addEventListener("load", () => {
  const token = localStorage.getItem("token");
  if (token) {
    document.cookie = `jwt=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
  }
});
function openLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    showLogin();
  }
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function showLogin() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  
  if (loginForm && registerForm && loginTab && registerTab) {
    loginForm.style.display = '';
    registerForm.style.display = 'none';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
  }
}

function showRegister() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  
  if (loginForm && registerForm && loginTab && registerTab) {
    loginForm.style.display = 'none';
    registerForm.style.display = '';
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
  }
}

window.toggleAchievements = function() {
  const content = document.getElementById('profileAchievements');
  const header = document.querySelector('.profile-achievements-section .accordion-header');
  
  if (!content || !header) return;

  const isOpening = content.style.display === 'none';
  
  if (isOpening) {
    content.style.display = 'block';
    content.style.maxHeight = '0';
    content.style.overflow = 'hidden';
    content.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
    
    setTimeout(() => {
      content.style.maxHeight = '300px';
      content.style.opacity = '1';
    }, 10);
  } else {
    content.style.maxHeight = '0';
    content.style.opacity = '0';
    content.style.overflow = 'hidden';
    
    setTimeout(() => {
      content.style.display = 'none';
    }, 300);
  }
  
  header.classList.toggle('active');
  const icon = header.querySelector('.accordion-icon');
  if (icon) {
    icon.style.transform = isOpening ? 'rotate(180deg)' : 'rotate(0deg)';
  }
};

function openProfileModal() {
  let modal = document.getElementById('profileModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'profile-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="profile-modal-content">
        <button class="close-profile-btn" aria-label="Закрыть профиль" onclick="closeProfileModal()">×</button>
        <div class="profile-main-row">
          <div class="profile-avatar-block">
            <div id="profileAvatarWrap" class="profile-avatar-img"></div>
            <div class="profile-info-block">
              <div id="profileUsername" class="profile-username"></div>
              <div id="profileEmail" class="profile-email"></div>
              <div id="profileSubEnd" class="profile-subend"></div>
            </div>
          </div>
          <div class="profile-friends-achievements">
            <div class="profile-friends-section profile-card">
              <div class="profile-section-title">Друзья</div>
              <div id="profileFriends" class="profile-friends-list"></div>
              <div id="incomingRequests"></div>
              <div id="outgoingRequests"></div>
              <div id="friendRequestsBlock"></div>
              <div id="addFriendFormContainer"></div>
            </div>
            <div class="profile-achievements-section profile-card">
              <div class="profile-section-title accordion-header" onclick="window.toggleAchievements()">
                Достижения <span class="accordion-icon">▼</span>
              </div>
              <div id="profileAchievements" class="profile-achievements-list" style="display:none;"></div>
            </div>
          </div>
        </div>
        <div id="profileMessages" class="profile-messages"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  fetchUserProfile();
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    modal.querySelector('.profile-modal-content').classList.remove('active');
  }
}

function updateAuthUI(username, isAdmin) {
  console.log('User data:', { username, isAdmin });
  const adminMenuItem = document.querySelector('.admin-menu-item');

  const accountMenu = document.querySelector('.account-menu');
  const accountName = document.querySelector('.account-name');
  
  if (username) {
    accountName.textContent = username;
    accountMenu.classList.add('logged-in');
    document.querySelector('.logout-btn').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      window.location.reload();
    });
    if (adminMenuItem) {
      const storedData = localStorage.getItem('userData');
      const currentUserIsAdmin = storedData ? JSON.parse(storedData).isAdmin : false;

      adminMenuItem.style.display = (isAdmin && currentUserIsAdmin) ? 'block' : 'none';
      adminMenuItem.classList.toggle('admin-visible', isAdmin);
    }
    const profileMenuItem = document.querySelector('.profile-menu-item');
    if (profileMenuItem) profileMenuItem.style.display = 'block';
    
  } else {
    accountMenu.classList.remove('logged-in');
    accountName.textContent = 'Вход';
    document.querySelector('.account-btn').onclick = openLoginModal;
    const profileMenuItem = document.querySelector('.profile-menu-item');
    if (profileMenuItem) profileMenuItem.style.display = 'none';
  }
}

async function fetchUserProfile() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Вы не авторизованы!');
      closeProfileModal();
      return;
    }
    const res = await fetch(`${API_BASE}/api/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      alert('Сессия истекла, войдите заново.');
      closeProfileModal();
      localStorage.removeItem('token');
      updateAuthUI(null, false);
      openLoginModal();
      return;
    }
    if (!res.ok) throw new Error('Ошибка загрузки профиля');
    const data = await res.json();
    console.log('PROFILE MODAL: data.avatar =', data.avatar);
    if (data.avatar) console.log('PROFILE MODAL: data.avatar.data =', data.avatar.data);
    const avatarWrap = document.getElementById('profileAvatarWrap');
    if (avatarWrap) {
      if (data.avatarUrl) {
        avatarWrap.innerHTML = `<img src="${API_BASE}${data.avatarUrl}?t=${Date.now()}" alt="avatar" class="profile-avatar-img-png" style="width:140px;height:140px;border-radius:50%;background:#eee;object-fit:cover;">`;
      } else if (data.avatarData) {
        renderProfileAvatar(data.avatarData, avatarWrap);
      } else {
        avatarWrap.innerHTML = '<div class="profile-avatar-placeholder"></div>';
      }
    }
    document.getElementById('profileUsername').textContent = data.username || '';
    document.getElementById('profileEmail').textContent = data.email || '';
    let idElem = document.getElementById('profileUserId');
    if (!idElem) {
      idElem = document.createElement('div');
      idElem.id = 'profileUserId';
      idElem.className = 'profile-userid';
      document.getElementById('profileUsername').after(idElem);
    }
    idElem.textContent = data.id ? `ID: ${data.id}` : '';
    document.getElementById('profileSubEnd').textContent = 'Дата окончания подписки: —';
    const friendsEl = document.getElementById('profileFriends');
    if (friendsEl) {
      friendsEl.innerHTML = (data.friends && data.friends.length ? data.friends.map(f => `<button class="profile-friend-btn" data-id="${f.id}">${f.username}</button>`).join('') : '<span class="profile-friend-empty">нет</span>');
    }
    const achievementsEl = document.getElementById('profileAchievements');
    if (achievementsEl) {
      achievementsEl.innerHTML = data.achievements?.length 
        ? data.achievements.map(a => `
            <div class="profile-achievement" title="${a.description || a.title}">
              ${a.title}
            </div>
          `).join('') 
        : '<div class="profile-achievement-empty">Нет достижений</div>';
    }
    setTimeout(() => {
      const achievementsList = document.getElementById('profileAchievements');
      if (achievementsList && achievementsList.scrollHeight > achievementsList.clientHeight) {
        achievementsList.parentElement.classList.add('scrollable');
      }
    }, 300);
    const messagesEl = document.getElementById('profileMessages');
    if (messagesEl) {
      messagesEl.innerHTML = '<b>Сообщения:</b><br>' + (data.messages && data.messages.length ? data.messages.map(m => `<div class=\"profile-message\"><div>${m.text}</div>${m.reward ? `<div class=\"profile-message-reward\">Награда: ${m.reward}</div>` : ''}</div>`).join('') : 'нет новых сообщений');
    }
    let requestsBlock = document.getElementById('friendRequestsBlock');
    if (!requestsBlock) {
      requestsBlock = document.createElement('div');
      requestsBlock.id = 'friendRequestsBlock';
      if (friendsEl && friendsEl.parentElement) friendsEl.parentElement.appendChild(requestsBlock);
    }
    try {
      const reqRes = await fetch(`${API_BASE}/api/friends/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        const incoming = reqData.incoming || [];
        const incomingDiv = document.getElementById('incomingRequests');
        if (incomingDiv) {
          incomingDiv.innerHTML = '<b>Входящие:</b> ' + (incoming.length ? incoming.map(r => `
            <span class="friend-request-incoming" data-userid="${r.userId}">
              <button class="profile-friend-btn" data-id="${r.userId}">${r.fromUsername || 'ID ' + r.userId}</button>
              <button class="accept-friend-btn" data-id="${r.id}">Принять</button>
              <button class="reject-friend-btn" data-id="${r.id}">Отклонить</button>
            </span>
          `).join('') : '<span class="friend-request-empty">нет</span>');
        }
        const outgoing = reqData.outgoing || [];
        const outgoingDiv = document.getElementById('outgoingRequests');
        if (outgoingDiv) {
          outgoingDiv.innerHTML = '<b>Исходящие:</b> ' + (outgoing.length ? outgoing.map(r => `
            <span class="friend-request-outgoing" data-userid="${r.friendId}">
              <button class="profile-friend-btn" data-id="${r.friendId}">${r.toUsername || 'ID ' + r.friendId}</button>
              <span style="color:#888;">(ожидание)</span>
            </span>
          `).join('') : '<span class="friend-request-empty">нет</span>');
        }
        addFriendProfileClickHandlers();
        if (incomingDiv) {
          incomingDiv.querySelectorAll('.accept-friend-btn').forEach(btn => {
            btn.onclick = async () => {
              const reqId = btn.getAttribute('data-id');
              btn.disabled = true;
              await fetch(`${API_BASE}/api/friends/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: reqId })
              });
              fetchUserProfile();
            };
          });
          incomingDiv.querySelectorAll('.reject-friend-btn').forEach(btn => {
            btn.onclick = async () => {
              const reqId = btn.getAttribute('data-id');
              btn.disabled = true;
              await fetch(`${API_BASE}/api/friends/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: reqId })
              });
              fetchUserProfile();
            };
          });
        }
      }
    } catch (err) {
      const incomingDiv = document.getElementById('incomingRequests');
      const outgoingDiv = document.getElementById('outgoingRequests');
      if (incomingDiv) incomingDiv.innerHTML = '<span class="friend-request-empty">Ошибка загрузки заявок</span>';
      if (outgoingDiv) outgoingDiv.innerHTML = '';
    }
    let addFriendFormContainer = document.getElementById('addFriendFormContainer');
    if (!addFriendFormContainer) {
      addFriendFormContainer = document.createElement('div');
      addFriendFormContainer.id = 'addFriendFormContainer';
      if (friendsEl && friendsEl.parentElement) friendsEl.parentElement.appendChild(addFriendFormContainer);
    }
    let addFriendForm = document.getElementById('addFriendForm');
    if (!addFriendForm) {
      addFriendForm = document.createElement('form');
      addFriendForm.id = 'addFriendForm';
      addFriendForm.innerHTML = `
        <input type="number" id="addFriendIdInput" placeholder="ID друга" min="1" required style="width:90px;"> 
        <button type="submit">Добавить в друзья</button>
        <span id="addFriendStatus" style="margin-left:10px;font-size:0.9em;"></span>
      `;
      addFriendFormContainer.appendChild(addFriendForm);
    }
    addFriendForm.onsubmit = async (e) => {
      e.preventDefault();
      const friendId = document.getElementById('addFriendIdInput').value;
      const status = document.getElementById('addFriendStatus');
      status.textContent = '...';
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/friends/add`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendId: Number(friendId) })
        });
        const resp = await res.json();
        if (res.ok && resp.success) {
          status.textContent = 'Добавлен!';
        } else {
          status.textContent = resp.error || 'Ошибка';
        }
      } catch (err) {
        status.textContent = 'Ошибка';
      }
    };

  } catch (err) {
    console.error('Ошибка загрузки профиля:', err);
    alert('Ошибка загрузки профиля');
    closeProfileModal();
  }
}

function openFriendProfileModal(friendId) {
  closeFriendProfileModal();
  let modal = document.getElementById('friendProfileModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'friendProfileModal';
    modal.className = 'news-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="profile-modal-content">
        <button class="close-news-btn" aria-label="Закрыть профиль друга" onclick="closeFriendProfileModal()">×</button>
        <div class="profile-main-row">
          <div class="profile-avatar-block">
            <div id="friendProfileAvatarWrap" class="profile-avatar-img"></div>
            <div class="profile-info-block">
              <div id="friendProfileUsername" class="profile-username"></div>
              <div id="friendProfileEmail" class="profile-email"></div>
            </div>
          </div>
          <div class="profile-friends-achievements">
            <div class="profile-friends-section">
              <div class="profile-section-title">Друзья</div>
              <div id="friendProfileFriends" class="profile-friends-list"></div>
            </div>
            <div class="profile-achievements-section">
              <div class="profile-section-title">Достижения</div>
              <div id="friendProfileAchievements" class="profile-achievements-list"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10); 
  fetchFriendProfile(friendId);
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('.profile-modal-content').classList.add('active');
}

function closeFriendProfileModal() {
  const modal = document.getElementById('friendProfileModal');
  if (modal) {
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
}

async function fetchFriendProfile(friendId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/profile/${friendId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Ошибка загрузки профиля друга');
    const data = await res.json();
    const avatarWrap = document.getElementById('friendProfileAvatarWrap');
    if (avatarWrap) {
      if (data.avatarUrl) {
        avatarWrap.innerHTML = `<img src="${API_BASE}${data.avatarUrl}?t=${Date.now()}" alt="avatar" class="profile-avatar-img-png" style="width:100px;height:100px;border-radius:50%;background:#eee;object-fit:cover;">`;
      } else if (data.avatarData) {
        renderProfileAvatar(data.avatarData, avatarWrap);
        avatarWrap.querySelectorAll('img').forEach(img => {
          img.style.width = '100px';
          img.style.height = '100px';
        });
      } else {
        avatarWrap.innerHTML = '<div class="profile-avatar-placeholder" style="width:100px;height:100px;"></div>';
      }
    }
    document.getElementById('friendProfileUsername').textContent = data.username || '';
    document.getElementById('friendProfileEmail').textContent = data.email || '';
    document.getElementById('friendProfileFriends').innerHTML = (data.friends && data.friends.length ? data.friends.map(f => `<button class=\"profile-friend-btn\" data-id="${f.id}">${f.username}</button>`).join('') : '<span class="profile-friend-empty">нет</span>');
    document.getElementById('friendProfileAchievements').innerHTML = (data.achievements && data.achievements.length ? data.achievements.map(a => `<span class=\"profile-achievement\"> ${a.title}</span>`).join('') : '<span class="profile-achievement-empty">нет</span>');
    let removeBtn = document.getElementById('removeFriendBtn');
    if (removeBtn) remove();
    if (data.isFriend) {
      let infoBlock = null;
      const avatarWrapElem = document.getElementById('friendProfileAvatarWrap');
      if (avatarWrapElem && avatarWrapElem.parentElement) {
        infoBlock = avatarWrapElem.parentElement.querySelector('.profile-info-block');
      }
      if (!infoBlock) {
        infoBlock = document.querySelector('#friendProfileModal .profile-info-block');
      }
      if (!infoBlock) {
        console.warn('Не найден infoBlock для кнопки удаления друга!');
      } else {
        if (!infoBlock.querySelector('#removeFriendBtn')) {
          const btn = document.createElement('button');
          btn.id = 'removeFriendBtn';
          btn.textContent = 'Удалить из друзей';
          btn.className = 'remove-friend-btn';
          btn.onclick = async () => {
            btn.disabled = true;
            try {
              const token = localStorage.getItem('token');
              const res = await fetch(`${API_BASE}/api/friends/remove`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendId: data.id })
              });
              if (res.ok) {
                btn.textContent = 'Удалён';
                setTimeout(closeFriendProfileModal, 800);
                fetchUserProfile();
              } else {
                btn.textContent = 'Ошибка';
                btn.disabled = false;
              }
            } catch {
              btn.textContent = 'Ошибка';
              btn.disabled = false;
            }
          };
          infoBlock.appendChild(btn);
        }
      }
    }
    document.querySelectorAll('#friendProfileFriends .profile-friend-btn').forEach(el => {
      el.onclick = (e) => {
        const id = el.getAttribute('data-id');
        if (id) openFriendProfileModal(id);
      };
    });
  } catch (err) {
    alert('Ошибка загрузки профиля друга');
    closeFriendProfileModal();
  }
}

function addFriendProfileClickHandlers() {
  document.querySelectorAll('#profileFriends .profile-friend-btn').forEach(el => {
    el.onclick = (e) => {
      const id = el.getAttribute('data-id');
      if (id) openFriendProfileModal(id);
    };
  });
  document.querySelectorAll('#incomingRequests .friend-request-incoming .profile-friend-btn').forEach(el => {
    el.onclick = (e) => {
      const id = el.getAttribute('data-id');
      if (id) openFriendProfileModal(id);
    };
  });
  document.querySelectorAll('#outgoingRequests .friend-request-outgoing .profile-friend-btn').forEach(el => {
    el.onclick = (e) => {
      const id = el.getAttribute('data-id');
      if (id) openFriendProfileModal(id);
    };
  });
}

async function navbarCheckAuth() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    console.log('Sending token:', token); 
    const response = await fetch(`${API_BASE}/api/auth/check`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include' 
    });
    
    console.log('Auth check response:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      updateAuthUI(data.username, data.isAdmin);
    } else {
      console.error('Auth check failed:', await response.text());
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error('Auth check error:', error);
  }
}

// Обработчик. СПРАВКА ДЛЯ СЕБЯ: ОДИН НА ДОКУМЕНТ.

document.addEventListener('DOMContentLoaded', function() {
  const navbarHTML = `
    <link rel="stylesheet" href="../css/style.css" />
    <nav class="navbar">
      <div class="logo">плейсхолдер для лого</div>
      <ul class="nav-links">
        <li>
          <a href="index.html" class="nav-button">
              <svg class="icon" viewBox="0 0 178.8 161.9" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
              <path fill="currentColor" d="M1 30s-3-14 1-20C7 3 21 0 48 0l40 1c3 2 33 28 33 38l1 114s2 11-6 11l-44-2c-15 0-37 8-48 8s-18-9-18-14L1 30z"/>
              </svg>
              Главная
          </a>
        </li>
        <li>
          <a href="games.html" class="nav-button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="35 50 135 167.5" fill="currentColor" width="24" height="24" class="icon">
              <g>
                  <path d="M101 88h20s3-11 24-11c22 0 42 19 42 50s-3 69-13 75c-11 7-29-14-33-22l-9-14h-31z" />
                  <path d="M102 88H82s-2-12-24-12-42 20-42 51 3 69 14 75c10 6 28-15 33-22l9-14h30z" />
              </g>
              </svg>
              Игры
          </a>
        </li>
        <li>
          <a href="character.html" class="nav-button">
              <svg class="icon" viewBox="0 0 178.8 161.9" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                <g>
                    <path d="M89.1.2s29.4-2.6 38.6 12.7c9.2 15.4 1.7-.3 1.7-.3s23.8-18 41.8 2.4c18 20.4-.6 45.3-7.4 50.2-6.8 4.8-23.5 4.2-27.4 1.2-4-3.1-4.4-7-4.4-7s.6 6.3-5.5 10.7c-6 4.5-14.7 7-14.7 7s-1.3 1-1.1 2.7c.2 1.7 2.5 3.8 2.5 3.8s12.3-1 20 11.4c7.9 12.4 4 21 1.7 22.5-2.3 1.6-11.3.6-13.4-1.8l-7-8.7s.3 10.1-.5 14c-.8 4-2.8 8.9-2.8 8.9s8.7.8 12.3 4.8c3.6 4.1 11.4 14.7 7.5 20.7-3.9 6-29.7 7.3-31.8 5.4-2.1-2-8-4.5-8.2-9-.2-4.3-2.5-7.7-2.5-7.7z"/>
                    <path d="M89.7.5S60.2-2 51 13.3c-9.2 15.3-1.7-.3-1.7-.3S25.6-5 7.6 15.4c-18 20.3.6 45.2 7.4 50.1 6.8 5 23.5 4.3 27.4 1.2 3.9-3 4.4-6.9 4.4-6.9s-.6 6.2 5.5 10.7c6 4.5 14.6 6.9 14.6 6.9s1.4 1 1.2 2.8c-.2 1.7-2.6 3.8-2.6 3.8s-12.2-1.1-20 11.3c-7.8 12.5-3.9 21-1.6 22.6 2.3 1.6 11.3.6 13.4-1.8l7-8.7s-.4 10 .4 14 2.8 8.8 2.8 8.8-8.7.8-12.2 5c-3.6 4-11.4 14.6-7.5 20.5 3.9 6 29.7 7.3 31.8 5.4 2-1.9 8-4.5 8.2-8.8.2-4.4 2.4-7.8 2.4-7.8z"/>
                </g>
              </svg>
              Персонаж
          </a>
        </li>
        <li class="account-menu">
          <a href="#" class="nav-button account-btn" onclick="handleAccountClick()">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 178.8 161.9">
                <path fill="currentColor" d="M69 91c21-6 32-32 25-51C86 21 75 2 53 0 30-2 19 12 16 27c-2 15-2 31 6 47 8 15 26 22 47 17zM59 97c-18 6-44 12-52 38-7 25-10 33-2 39 9 7 56 9 70 9 15 0 51-4 54-11s5-23 2-35c-3-11-18-28-28-35-9-6-26-11-44-5z"/>
            </svg>
            <span class="account-name">Вход</span>
          </a>
          <ul class="dropdown-menu">
            <li><a href="#" class="logout-btn">Выйти</a></li>
            <li class="profile-menu-item">
                <a href="#" class="profile-btn">Профиль</a>
            </li>
            <li class="admin-menu-item" style="display: none;">
                <a href="admin.html" class="admin-btn">Админ-панель</a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>

    <div class="wave">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,80 C480,0 960,120 1440,80 L1440,0 L0,0 Z" fill="#95b1fa"></path>
      </svg>
    </div>
    <div id="loginModal" aria-hidden="true" role="dialog" aria-modal="true">
      <div class="modal-content">
        <button class="close-btn" aria-label="Закрыть" type="button" onclick="closeLoginModal()">×</button>

        <div class="tabs">
          <button id="loginTab" class="tab active" onclick="showLogin()">Вход</button>
          <button id="registerTab" class="tab" onclick="showRegister()">Регистрация</button>
        </div>

        <form id="loginForm">
          <label for="email-login">Email</label>
          <input type="email" id="email-login" placeholder="Введите email" required>


          <label for="password-login">Пароль</label>
          <input type="password" id="password-login" placeholder="Введите пароль" required>

          <button type="submit" class="submit-btn">
            Войти
          </button>
        </form>

        <form id="registerForm" style="display:none;">
          <label for="email-register">Email</label>
          <input type="email" id="email-register" placeholder="Введите email" required>

          <label for="password-register">Пароль</label>
          <input type="password" id="password-register" placeholder="Введите пароль" required>

          <label for="password-confirm">Подтвердите пароль</label>
          <input type="password" id="password-confirm" placeholder="Подтвердите пароль" required>

          <div id="admin-secret-container" style="display: none;">
            <input type="password" id="admin-secret" placeholder="Секретный ключ администратора">
          </div>
          <script>
            const showAdminRegisterBtn = document.getElementById('show-admin-register');
            if (showAdminRegisterBtn) {
                showAdminRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('admin-secret-container').style.display = 'block';
                });
            }
          </script>
          <button type="submit" class="submit-btn">Зарегистрироваться</button>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', navbarHTML);

  document.addEventListener('click', function(e) {
    if (e.target.id === 'loginTab') {
      e.preventDefault();
      showLogin();
    } else if (e.target.id === 'registerTab') {
      e.preventDefault();
      showRegister();
    }
    if (e.target.classList.contains('close-btn')) {
      closeLoginModal();
    }
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email-login').value;
      const password = document.getElementById('password-login').value;
      
      try {
        const response = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem('token', data.token);
          updateAuthUI(data.username);
          closeLoginModal();
        } else {
          alert(data.message || 'Ошибка входа');
        }
      } catch (error) {
        alert('Ошибка сети');
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email-register').value;
      const password = document.getElementById('password-register').value;
      const passwordConfirm = document.getElementById('password-confirm').value;
      const adminSecret = document.getElementById('admin-secret').value;

      if (!email || !password || !passwordConfirm) {
        alert('Заполните все обязательные поля');
        return;
      }

      if (password !== passwordConfirm) {
        alert('Пароли не совпадают');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            username: email.split('@')[0],
            adminSecret: adminSecret || undefined 
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Ошибка регистрации');
        }

        localStorage.setItem('token', data.token);
        updateAuthUI(data.username, data.isAdmin);
        alert(`Регистрация успешна! ${data.isAdmin ? '[АДМИН]' : ''}`);
        closeLoginModal();
      } catch (error) {
        console.error('Ошибка:', error);
        alert(error.message || 'Ошибка соединения. Проверьте консоль для деталей.');
      }
    });
  }

  const profileBtn = document.querySelector('.profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openProfileModal();
    });
  }

  navbarCheckAuth();
});