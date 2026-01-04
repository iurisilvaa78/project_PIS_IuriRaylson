const API_BASE = '/api';
let authToken = null;
let currentUser = null;

function bindAuthButtons() {
    const loginBtn = document.getElementById('login-btn-back');
    const registerBtn = document.getElementById('register-btn-back');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            goToLogin();
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            goToRegister();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Dark Mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
}

function loadDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Success Message Pop-up
function showSuccessMessage(message) {
    const popup = document.createElement('div');
    popup.className = 'success-popup';
    popup.innerHTML = `
        <div class="success-popup-content">
            <span class="success-icon">✓</span>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
    }, 3000);
}

// Garantir que o dark mode é aplicado quando a página é restaurada do cache
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        loadDarkModePreference();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    loadDarkModePreference();
    bindAuthButtons();
    authToken = localStorage.getItem('authToken');
    if (authToken) {
        verifyAuth();
    } else {
        setBackofficeVisibility(false);
        updateAuthUI({ logged: false });
        showLoginRequired();
    }
});

function setBackofficeVisibility(isAdmin) {
    const backLink = document.getElementById('backoffice-link');
    if (backLink) backLink.style.display = isAdmin ? 'inline-block' : 'none';
}

function updateAuthUI({ logged, username }) {
    const loginBtn = document.getElementById('login-btn-back');
    const registerBtn = document.getElementById('register-btn-back');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const perfilLink = document.getElementById('perfil-link');
    const frontLink = document.getElementById('frontoffice-link');

    // No Backoffice, o link "Início" deve estar sempre visível.
    if (frontLink) frontLink.style.display = 'inline-block';

    if (logged) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userInfo) {
            userInfo.style.display = 'inline-block';
            userInfo.textContent = `Olá, ${username || 'Utilizador'}`;
        }
        if (perfilLink) perfilLink.style.display = 'inline-block';
        if (frontLink) frontLink.style.display = 'inline-block';
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
        if (perfilLink) perfilLink.style.display = 'none';
        if (frontLink) frontLink.style.display = 'inline-block';
    }
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-access-token': authToken
    };
}

async function verifyAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data;
            console.log('Utilizador verificado (backoffice):', currentUser);
            
            if (!data.isAdmin) {
                setBackofficeVisibility(false);
                updateAuthUI({ logged: false });
                showLoginRequired();
            } else {
                setBackofficeVisibility(true);
                updateAuthUI({ logged: true, username: data.username || data.nome || 'Utilizador' });
                showAdminContent();
                loadManageContent();
            }
        } else {
            console.log('Token inválido (backoffice)');
            setBackofficeVisibility(false);
            updateAuthUI({ logged: false });
            showLoginRequired();
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setBackofficeVisibility(false);
        updateAuthUI({ logged: false });
        showLoginRequired();
    }
}

function showLoginRequired() {
    document.getElementById('login-required').style.display = 'block';
    document.getElementById('admin-content').style.display = 'none';
}

function showAdminContent() {
    document.getElementById('login-required').style.display = 'none';
    document.getElementById('admin-content').style.display = 'block';
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showSuccessMessage('Logout realizado com sucesso!');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

function goToLogin() {
    window.location.href = 'index.html';
}

function goToRegister() {
    window.location.href = 'index.html';
}

function showPerfil() {
    if (!currentUser) {
        console.log('showPerfil (backoffice): currentUser não disponível');
        goToLogin();
        return;
    }
    
    console.log('Mostrando perfil (backoffice) para:', currentUser);
    
    const perfilInfo = document.getElementById('perfil-info');
    perfilInfo.innerHTML = `
        <div class="perfil-section">
            <p><strong>Username:</strong> ${currentUser.username || 'N/A'}</p>
            <p><strong>Email:</strong> ${currentUser.email || 'N/A'}</p>
            <p><strong>Nome:</strong> ${currentUser.nome || 'N/A'}</p>
            <p><strong>Tipo de conta:</strong> ${currentUser.isAdmin ? 'Administrador' : 'Utilizador'}</p>
            <p><strong>Membro desde:</strong> ${currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString('pt-PT') : 'N/A'}</p>
        </div>
    `;
    document.getElementById('perfil-modal').style.display = 'block';
}

function closePerfilModal() {
    document.getElementById('perfil-modal').style.display = 'none';
}

function showTab(tabName) {
    // Esconder todos os tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar tab selecionado
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');

    // Carregar dados do tab
    if (tabName === 'manage') {
        loadManageContent();
    } else if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'reviews') {
        loadAdminReviews();
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: getAuthHeaders()
        });
        const users = await response.json();
        if (!response.ok) {
            alert(users.message || 'Erro ao carregar utilizadores');
            return;
        }
        displayUsers(users);
    } catch (error) {
        console.error('Erro ao carregar utilizadores:', error);
        alert('Erro ao carregar utilizadores');
    }
}

function displayUsers(users) {
    const grid = document.getElementById('users-list');
    if (!grid) return;
    grid.innerHTML = '';

    if (!users || users.length === 0) {
        grid.innerHTML = '<p>Nenhum utilizador encontrado.</p>';
        return;
    }

    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'content-card';

        const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('pt-PT') : 'N/A';
        const isAdmin = user.is_admin === 1 || user.is_admin === true;

        card.innerHTML = `
            <div class="content-card-info">
                <h3>${user.username} ${isAdmin ? '(Admin)' : ''}</h3>
                <p>Email: ${user.email}</p>
                <p>Nome: ${user.nome || '—'}</p>
                <p>Membro desde: ${createdAt}</p>

                <div class="admin-edit-grid">
                    <input type="text" id="u-username-${user.id}" value="${escapeHtml(user.username)}" placeholder="Username">
                    <input type="email" id="u-email-${user.id}" value="${escapeHtml(user.email)}" placeholder="Email">
                    <input type="text" id="u-nome-${user.id}" value="${escapeHtml(user.nome || '')}" placeholder="Nome">
                    <input type="password" id="u-pass-${user.id}" value="" placeholder="Nova password (opcional)">
                    <label class="admin-checkbox">
                        <input type="checkbox" id="u-admin-${user.id}" ${isAdmin ? 'checked' : ''}>
                        Administrador
                    </label>
                    <button class="admin-btn primary" onclick="saveUser(${user.id})">
                        Guardar
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

async function saveUser(userId) {
    const username = document.getElementById(`u-username-${userId}`).value.trim();
    const email = document.getElementById(`u-email-${userId}`).value.trim();
    const nome = document.getElementById(`u-nome-${userId}`).value.trim();
    const password = document.getElementById(`u-pass-${userId}`).value;
    const is_admin = document.getElementById(`u-admin-${userId}`).checked;

    const payload = { username, email, nome, is_admin };
    if (password && password.trim().length > 0) payload.password = password.trim();

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok) {
            showSuccessMessage('Utilizador atualizado com sucesso!');
            loadUsers();
        } else {
            alert(data.message || 'Erro ao atualizar utilizador');
        }
    } catch (error) {
        console.error('Erro ao atualizar utilizador:', error);
        alert('Erro ao atualizar utilizador');
    }
}

async function loadAdminReviews() {
    try {
        const response = await fetch(`${API_BASE}/admin/reviews`, {
            headers: getAuthHeaders()
        });
        const reviews = await response.json();
        if (!response.ok) {
            alert(reviews.message || 'Erro ao carregar reviews');
            return;
        }
        displayAdminReviews(reviews);
    } catch (error) {
        console.error('Erro ao carregar reviews (admin):', error);
        alert('Erro ao carregar reviews');
    }
}

function displayAdminReviews(reviews) {
    const grid = document.getElementById('admin-reviews-list');
    if (!grid) return;
    grid.innerHTML = '';

    if (!reviews || reviews.length === 0) {
        grid.innerHTML = '<p>Nenhuma review encontrada.</p>';
        return;
    }

    reviews.forEach(review => {
        const card = document.createElement('div');
        card.className = 'content-card';
        const createdAt = review.data_review ? new Date(review.data_review).toLocaleString('pt-PT') : 'N/A';

        card.innerHTML = `
            <div class="content-card-info">
                <h3>${escapeHtml(review.titulo)} (${review.tipo === 'filme' ? 'Filme' : 'Série'})</h3>
                <p>Utilizador: ${escapeHtml(review.username)}${review.nome_utilizador ? ` (${escapeHtml(review.nome_utilizador)})` : ''}</p>
                <p>Data: ${createdAt}</p>

                <div class="admin-edit-grid">
                    <label>Avaliação (1-10)</label>
                    <input type="number" min="1" max="10" step="1" id="r-av-${review.id}" value="${review.avaliacao}">
                    <label>Comentário</label>
                    <textarea id="r-com-${review.id}" rows="3" placeholder="Comentário (opcional)">${escapeHtml(review.comentario || '')}</textarea>
                    <div class="admin-btn-row">
                        <button class="admin-btn primary" onclick="saveAdminReview(${review.id})">Guardar</button>
                        <button class="admin-btn danger" onclick="deleteReviewAdmin(${review.id})">Eliminar</button>
                    </div>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

async function saveAdminReview(reviewId) {
    const avaliacao = Number(document.getElementById(`r-av-${reviewId}`).value);
    const comentario = document.getElementById(`r-com-${reviewId}`).value;

    try {
        const response = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ avaliacao, comentario })
        });

        const data = await response.json();
        if (response.ok) {
            showSuccessMessage('Review atualizada com sucesso!');
            loadAdminReviews();
        } else {
            alert(data.message || 'Erro ao atualizar review');
        }
    } catch (error) {
        console.error('Erro ao atualizar review:', error);
        alert('Erro ao atualizar review');
    }
}

async function deleteReviewAdmin(reviewId) {
    if (!confirm('Tem a certeza que deseja eliminar esta review?')) return;

    try {
        const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (response.ok) {
            showSuccessMessage('Review eliminada com sucesso!');
            loadAdminReviews();
        } else {
            alert(data.message || 'Erro ao eliminar review');
        }
    } catch (error) {
        console.error('Erro ao eliminar review:', error);
        alert('Erro ao eliminar review');
    }
}

function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function searchTMDB() {
    const query = document.getElementById('tmdb-search').value;
    const type = document.getElementById('tmdb-type').value;
    
    if (!query) {
        alert('Por favor, insira um termo de pesquisa.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/conteudos/tmdb/search?query=${encodeURIComponent(query)}&tipo=${type}`);
        const data = await response.json();
        
        displayTMDBResults(data.results || []);
    } catch (error) {
        console.error('Erro ao pesquisar TMDB:', error);
        alert('Erro ao pesquisar na TMDB');
    }
}

function displayTMDBResults(results) {
    const grid = document.getElementById('tmdb-results');
    grid.innerHTML = '';
    
    if (results.length === 0) {
        grid.innerHTML = '<p>Nenhum resultado encontrado.</p>';
        return;
    }
    
    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'content-card';
        
        const posterUrl = item.poster_path 
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : 'https://via.placeholder.com/200x300?text=Sem+Poster';
        
        card.innerHTML = `
            <img src="${posterUrl}" alt="${item.title || item.name}">
            <div class="content-card-info">
                <h3>${item.title || item.name}</h3>
                <p>${item.release_date || item.first_air_date || 'N/A'}</p>
                <p style="font-size: 12px; margin-top: 10px;">${(item.overview || '').substring(0, 100)}...</p>
                <button class="admin-btn success" style="margin-top: 10px;" onclick="importFromTMDB(${item.id}, '${document.getElementById('tmdb-type').value}')">
                    Importar
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

async function importFromTMDB(tmdbId, tipo) {
    if (!confirm('Tem a certeza que deseja importar este conteúdo?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/conteudos/tmdb/import`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ tmdb_id: tmdbId, tipo })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Conteúdo importado com sucesso!');
            loadManageContent();
        } else {
            alert(data.message || 'Erro ao importar conteúdo');
        }
    } catch (error) {
        console.error('Erro ao importar:', error);
        alert('Erro ao importar conteúdo');
    }
}

async function createContent(event) {
    event.preventDefault();
    
    const formData = {
        titulo: document.getElementById('create-titulo').value,
        sinopse: document.getElementById('create-sinopse').value,
        duracao: document.getElementById('create-duracao').value || null,
        ano_lancamento: document.getElementById('create-ano').value || null,
        tipo: document.getElementById('create-tipo').value,
        poster_url: document.getElementById('create-poster').value || null,
        trailer_url: document.getElementById('create-trailer').value || null
    };
    
    try {
        const response = await fetch(`${API_BASE}/conteudos`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Conteúdo criado com sucesso!');
            document.getElementById('create-form').reset();
            loadManageContent();
        } else {
            alert(data.message || 'Erro ao criar conteúdo');
        }
    } catch (error) {
        console.error('Erro ao criar conteúdo:', error);
        alert('Erro ao criar conteúdo');
    }
}

async function loadManageContent() {
    try {
        const response = await fetch(`${API_BASE}/conteudos`, {
            headers: getAuthHeaders()
        });
        const conteudos = await response.json();
        
        displayManageContent(conteudos);
    } catch (error) {
        console.error('Erro ao carregar conteúdos:', error);
    }
}

function displayManageContent(conteudos) {
    const grid = document.getElementById('manage-content');
    grid.innerHTML = '';
    
    if (conteudos.length === 0) {
        grid.innerHTML = '<p>Nenhum conteúdo encontrado.</p>';
        return;
    }
    
    conteudos.forEach(conteudo => {
        const card = document.createElement('div');
        card.className = 'content-card';
        const rating = conteudo.rating != null ? Number(conteudo.rating).toFixed(1) : 'N/A';
        const tmdbRating = conteudo.tmdb_rating != null ? Number(conteudo.tmdb_rating).toFixed(1) : null;
        
        card.innerHTML = `
            <img src="${conteudo.poster_url || 'https://via.placeholder.com/200x300?text=Sem+Poster'}" 
                 alt="${conteudo.titulo}">
            <div class="content-card-info">
                <div class="manage-top">
                    <div class="manage-text">
                        <h3>${conteudo.titulo}</h3>
                        <p>${conteudo.tipo === 'filme' ? 'Filme' : 'Série'}</p>
                        <p>Ano: ${conteudo.ano_lancamento || 'N/A'}</p>
                        ${tmdbRating != null ? `<p class="rating">TMDB: ${tmdbRating}/10</p>` : ''}
                        <p class="rating">Utilizadores: ${rating}/10</p>
                    </div>

                    <div class="manage-actions">
                        <button class="admin-btn primary" onclick="toggleEditContent(${conteudo.id})">Editar</button>
                        <button class="admin-btn danger" onclick="deleteContent(${conteudo.id})">Eliminar</button>
                    </div>
                </div>

                <div id="edit-content-${conteudo.id}" class="admin-edit-grid manage-editor" style="display:none;">
                    <input type="text" id="c-titulo-${conteudo.id}" value="${escapeHtml(conteudo.titulo)}" placeholder="Título">
                    <textarea id="c-sinopse-${conteudo.id}" rows="3" placeholder="Sinopse">${escapeHtml(conteudo.sinopse || '')}</textarea>
                    <div style="display:flex; gap:10px;">
                        <input style="flex:1;" type="number" id="c-duracao-${conteudo.id}" value="${conteudo.duracao || ''}" placeholder="Duração">
                        <input style="flex:1;" type="number" id="c-ano-${conteudo.id}" value="${conteudo.ano_lancamento || ''}" placeholder="Ano">
                    </div>
                    <select id="c-tipo-${conteudo.id}">
                        <option value="filme" ${conteudo.tipo === 'filme' ? 'selected' : ''}>Filme</option>
                        <option value="serie" ${conteudo.tipo === 'serie' ? 'selected' : ''}>Série</option>
                    </select>
                    <input type="url" id="c-poster-${conteudo.id}" value="${escapeHtml(conteudo.poster_url || '')}" placeholder="URL Poster">
                    <input type="url" id="c-trailer-${conteudo.id}" value="${escapeHtml(conteudo.trailer_url || '')}" placeholder="URL Trailer">
                    <div class="admin-btn-row">
                        <button class="admin-btn primary" onclick="saveContent(${conteudo.id})">Guardar</button>
                        <button class="admin-btn secondary" onclick="toggleEditContent(${conteudo.id})">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function toggleEditContent(id) {
    const el = document.getElementById(`edit-content-${id}`);
    if (!el) return;

    const card = el.closest('.content-card');
    const isOpening = el.style.display === 'none' || el.style.display === '';
    el.style.display = isOpening ? 'grid' : 'none';
    if (card) {
        card.classList.toggle('is-editing', isOpening);
    }
}

async function saveContent(id) {
    const payload = {
        titulo: document.getElementById(`c-titulo-${id}`).value.trim(),
        sinopse: document.getElementById(`c-sinopse-${id}`).value,
        duracao: document.getElementById(`c-duracao-${id}`).value || null,
        ano_lancamento: document.getElementById(`c-ano-${id}`).value || null,
        tipo: document.getElementById(`c-tipo-${id}`).value,
        poster_url: document.getElementById(`c-poster-${id}`).value || null,
        trailer_url: document.getElementById(`c-trailer-${id}`).value || null
    };

    try {
        const response = await fetch(`${API_BASE}/conteudos/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok) {
            showSuccessMessage('Conteúdo atualizado com sucesso!');
            loadManageContent();
        } else {
            alert(data.message || 'Erro ao atualizar conteúdo');
        }
    } catch (error) {
        console.error('Erro ao atualizar conteúdo:', error);
        alert('Erro ao atualizar conteúdo');
    }
}

async function deleteContent(id) {
    if (!confirm('Tem a certeza que deseja eliminar este conteúdo?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/conteudos/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Conteúdo eliminado com sucesso!');
            loadManageContent();
        } else {
            alert(data.message || 'Erro ao eliminar conteúdo');
        }
    } catch (error) {
        console.error('Erro ao eliminar:', error);
        alert('Erro ao eliminar conteúdo');
    }
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const perfilModal = document.getElementById('perfil-modal');
    if (event.target === perfilModal) {
        closePerfilModal();
    }
}

