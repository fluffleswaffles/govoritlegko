let newsList = [];

console.log('[admin-news.js] script loaded');
try {

function initAdminNews() {
  console.log('[admin-news.js] initAdminNews called');
  loadNews();
  setupNewsForm();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminNews);
} else {
  initAdminNews();
}

async function loadNews() {
  try {
    const res = await fetch(`${window.API_BASE}/api/news`);
    newsList = await res.json();
    renderNewsAdmin();
  } catch (err) {
    console.error('Ошибка загрузки новостей:', err);
  }
}

function renderNewsAdmin() {
  const container = document.getElementById('admin-news-list');
  if (!container) return;
  container.innerHTML = newsList.map(news => `
    <div class="admin-news-card">
      <img src="${window.API_BASE}${news.imageUrl}" alt="icon" style="width:160px;height:96px;object-fit:cover;">
      <h3>${news.title}</h3>
      <div class="admin-news-text" style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${news.text}</div>
      <button class="edit-news-btn" data-id="${news.id}">Редактировать</button>
      <button class="delete-news-btn" data-id="${news.id}">Удалить</button>
    </div>
  `).join('');
  container.querySelectorAll('.delete-news-btn').forEach(btn => {
    btn.onclick = async (e) => {
      if (!confirm('Удалить новость?')) return;
      await fetch(`${window.API_BASE}/api/admin/news/${btn.dataset.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      await loadNews();
    };
  });
  container.querySelectorAll('.edit-news-btn').forEach(btn => {
    btn.onclick = () => openEditNewsModal(btn.dataset.id);
  });
}

function setupNewsForm() {
  const form = document.getElementById('add-news-form');
  if (!form) {
    console.error('[admin-news.js] Форма для добавления новостей не найдена!');
    return;
  }
  console.log('[admin-news.js] setupNewsForm: форма найдена');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alert('[admin-news.js] submit add-news-form');
    console.log('[admin-news.js] submit add-news-form');
    const formData = new FormData(form);
    try {
      const resp = await fetch(`${window.API_BASE}/api/admin/news`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      console.log('[admin-news.js] fetch response', resp.status);
      form.reset();
      await loadNews();
      alert('Новость добавлена!');
    } catch (err) {
      alert('Ошибка добавления новости');
    }
    return false;
  });
}

let editingNewsId = null;

function openEditNewsModal(newsId) {
  const news = newsList.find(n => n.id == newsId);
  if (!news) return alert('Новость не найдена!');
  let modal = document.getElementById('edit-news-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edit-news-modal';
    modal.style = 'position:fixed;z-index:2000;left:0;top:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:420px;width:90vw;padding:32px 24px;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.18);display:flex;flex-direction:column;align-items:center;">
        <button id="close-edit-news-modal" style="position:absolute;top:10px;right:15px;font-size:28px;background:none;border:none;cursor:pointer;color:#95b1fa;">&times;</button>
        <h3>Редактировать новость</h3>
        <form id="edit-news-form" style="width:100%;display:flex;flex-direction:column;gap:12px;align-items:center;">
          <input type="text" name="title" id="edit-news-title" placeholder="Заголовок" required style="width:100%;padding:8px;border-radius:8px;border:1.5px solid #95b1fa;">
          <textarea name="text" id="edit-news-text" placeholder="Текст" required style="width:100%;min-height:80px;padding:8px;border-radius:8px;border:1.5px solid #95b1fa;"></textarea>
          <input type="file" name="image" id="edit-news-image" accept="image/*">
          <img id="edit-news-preview" src="" style="max-width:100%;max-height:120px;border-radius:8px;margin:8px 0;display:none;">
          <button type="submit" class="submit-btn">Сохранить</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  editingNewsId = newsId;
  document.getElementById('edit-news-title').value = news.title;
  document.getElementById('edit-news-text').value = news.text;
  const preview = document.getElementById('edit-news-preview');
  if (news.imageUrl) {
    preview.src = window.API_BASE + news.imageUrl;
    preview.style.display = '';
  } else {
    preview.style.display = 'none';
  }
  document.getElementById('close-edit-news-modal').onclick = () => {
    modal.style.display = 'none';
    editingNewsId = null;
  };
  document.getElementById('edit-news-image').onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = ev => {
        preview.src = ev.target.result;
        preview.style.display = '';
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };
  document.getElementById('edit-news-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', document.getElementById('edit-news-title').value);
    formData.append('text', document.getElementById('edit-news-text').value);
    const imgFile = document.getElementById('edit-news-image').files[0];
    if (imgFile) formData.append('image', imgFile);
    try {
      const resp = await fetch(`${window.API_BASE}/api/admin/news/${editingNewsId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      if (!resp.ok) throw new Error('Ошибка сохранения');
      alert('Новость обновлена!');
      modal.style.display = 'none';
      editingNewsId = null;
      await loadNews();
    } catch (err) {
      alert('Ошибка при сохранении новости');
    }
  };
}

} catch (e) {
  console.error('[admin-news.js] FATAL ERROR:', e);
}
