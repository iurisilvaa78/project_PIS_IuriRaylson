/*
 * Página de Perfil do Utilizador
 * 
 * Permite ao utilizador:
 * - Ver e editar informações do perfil
 * - Ver suas reviews
 * - Gerir favoritos
 * - Gerir listas personalizadas
 */

// Constantes e variáveis globais
const API_BASE = '/api';
let authToken = null; // Token JWT
let currentUser = null; // Dados do utilizador

/**
 * Associa eventos aos botões de autenticação
 */
function bindAuthButtons() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
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

/**
 * Alterna modo escuro
 */
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
}

/**
 * Carrega preferência de modo escuro
 */
function loadDarkModePreference() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

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

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        loadDarkModePreference();
    }
});

/**
 * Inicialização da página de perfil
 * Requer autenticação - redireciona se não autenticado
 */
window.addEventListener('DOMContentLoaded', () => {
    loadDarkModePreference();
    bindAuthButtons();
    authToken = localStorage.getItem('authToken');
    
    if (authToken) {
        verifyAuth();
    } else {
        showLoginRequired();
    }
});

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-access-token': authToken
    };
}

/**
 * Verifica autenticação e carrega dados do perfil
 * Redireciona para index se token inválido
 */
async function verifyAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data;
            console.log('Utilizador verificado:', currentUser);
            updateUI();
            showPerfilContent();
            loadPerfilInfo();
        } else {
            console.log('Token inválido, a limpar sessão e redirecionar');
            authToken = null;
            currentUser = null;
            localStorage.removeItem('authToken');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        window.location.href = 'index.html';
    }
}

/**
 * Atualiza elementos da interface conforme autenticação
 */
function updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const frontLink = document.getElementById('frontoffice-link');
    const backLink = document.getElementById('backoffice-link');
    const perfilLink = document.getElementById('perfil-link');

    if (frontLink) frontLink.style.display = 'inline-block';
    
    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userInfo) {
            userInfo.style.display = 'inline-block';
            userInfo.textContent = `Olá, ${currentUser.username || currentUser.nome || 'Utilizador'}`;
        }
        if (backLink) backLink.style.display = currentUser.isAdmin ? 'inline-block' : 'none';
        if (perfilLink) perfilLink.style.display = 'inline-block';
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
        if (backLink) backLink.style.display = 'none';
        if (perfilLink) perfilLink.style.display = 'none';
    }
}

function showLoginRequired() {
    document.getElementById('login-required').style.display = 'block';
    document.getElementById('perfil-content').style.display = 'none';
}

function showPerfilContent() {
    document.getElementById('login-required').style.display = 'none';
    document.getElementById('perfil-content').style.display = 'block';
}

function goToLogin() {
    window.location.href = 'index.html';
}

function goToRegister() {
    window.location.href = 'index.html';
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

function showProfileTab(tabName) {
    // Esconder todos os tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'reviews') {
        loadUserReviews();
    } else if (tabName === 'favoritos') {
        loadUserFavoritos();
    } else if (tabName === 'lista') {
        loadUserLista();
    }
}

/**
 * Carrega informações do perfil nos campos de edição
 */
function loadPerfilInfo() {
    document.getElementById('edit-username').value = currentUser.username || '';
    document.getElementById('edit-email').value = currentUser.email || '';
    document.getElementById('edit-nome').value = currentUser.nome || '';
    document.getElementById('data-registo').textContent = currentUser.created_at ? 
        new Date(currentUser.created_at).toLocaleDateString('pt-PT') : 'N/A';
    document.getElementById('tipo-conta').textContent = currentUser.isAdmin ? 'Administrador' : 'Utilizador';
}

/**
 * Atualiza dados do perfil do utilizador
 * Valida passwords se fornecidas
 * 
 * @param {Event} event - Evento de submissão do formulário
 */
async function updatePerfil(event) {
    event.preventDefault();
    
    const email = document.getElementById('edit-email').value;
    const nome = document.getElementById('edit-nome').value;
    const password = document.getElementById('edit-password').value;
    const passwordConfirm = document.getElementById('edit-password-confirm').value;
    
    if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
            alert('As passwords não coincidem!');
            return;
        }
        if (password.length < 6) {
            alert('A password deve ter pelo menos 6 caracteres!');
            return;
        }
    }
    
    try {
        const updateData = { email, nome };
        if (password) {
            updateData.password = password;
        }
        
        const response = await fetch(`${API_BASE}/auth/update`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccessMessage('Perfil atualizado com sucesso!');
            document.getElementById('edit-password').value = '';
            document.getElementById('edit-password-confirm').value = '';
            verifyAuth();
        } else {
            alert(data.message || 'Erro ao atualizar perfil');
        }
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        alert('Erro ao atualizar perfil');
    }
}

/**
 * Carrega reviews do utilizador
 * Exibe lista de reviews com detalhes dos conteúdos
 */
async function loadUserReviews() {
    const reviewsList = document.getElementById('reviews-list');
    reviewsList.innerHTML = '<p>A carregar reviews...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/reviews/user/${currentUser.id}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const reviews = await response.json();
            
            if (reviews.length === 0) {
                reviewsList.innerHTML = '<p>Ainda não fez nenhuma review.</p>';
                return;
            }
            
            reviewsList.innerHTML = reviews.map(review => `
                <div class="review-card" style="background: rgba(255,255,255,0.9); padding: 20px; margin: 15px 0; border-radius: 10px; border-left: 4px solid #822626; display: flex; gap: 15px;">
                    <img src="${review.poster_url || 'https://via.placeholder.com/100x150?text=Sem+Poster'}" 
                         alt="${review.titulo_conteudo}"
                         style="width: 100px; height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer;"
                         onclick="window.location.href='detalhes.html?id=${review.conteudo_id}'">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 10px 0; cursor: pointer;" onclick="window.location.href='detalhes.html?id=${review.conteudo_id}'">
                            ${review.titulo_conteudo} (${review.ano_lancamento || 'N/A'})
                        </h3>
                        <p style="margin: 5px 0;"><strong>Tipo:</strong> ${review.tipo_conteudo === 'filme' ? 'Filme' : 'Série'}</p>
                        <p style="margin: 5px 0;"><strong>Sua Avaliação:</strong> ${review.avaliacao}/10</p>
                        ${review.comentario ? `<p style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 5px;"><strong>Comentário:</strong><br>${review.comentario}</p>` : '<p style="color: #999;">Sem comentário</p>'}
                        <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
                            <strong>Data:</strong> ${new Date(review.data_review).toLocaleDateString('pt-PT')} | 
                            <strong>Útil para:</strong> ${review.votos_utilidade || 0} pessoa(s)
                        </p>
                        <button onclick="deleteReview(${review.id})" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                            Eliminar Review
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            reviewsList.innerHTML = '<p>Erro ao carregar reviews.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar reviews:', error);
        reviewsList.innerHTML = '<p>Erro ao carregar reviews.</p>';
    }
}

async function loadUserFavoritos() {
    const favoritosList = document.getElementById('favoritos-list');
    favoritosList.innerHTML = '<p style="grid-column: 1/-1;">A carregar favoritos...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/favoritos`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const favoritos = await response.json();
            
            if (favoritos.length === 0) {
                favoritosList.innerHTML = '<p style="grid-column: 1/-1;">Ainda não tem favoritos.</p>';
                return;
            }
            
            favoritosList.innerHTML = favoritos.map(fav => `
                <div class="content-card" style="cursor: pointer;" onclick="window.location.href='detalhes.html?id=${fav.id}'">
                    <img src="${fav.poster_url || 'https://via.placeholder.com/200x300?text=Sem+Poster'}" 
                         alt="${fav.titulo || 'Título'}">
                    <div class="content-card-info">
                        <h3 style="font-size: 16px; margin: 10px 0;">${fav.titulo || 'Sem título'}</h3>
                        <p style="margin: 5px 0;">${fav.tipo === 'filme' ? 'Filme' : 'Série'}</p>
                        <p style="margin: 5px 0;"><strong>Ano:</strong> ${fav.ano_lancamento || 'N/A'}</p>
                        ${(fav.rating && fav.rating > 0) || (fav.tmdb_rating && fav.tmdb_rating > 0) ? `<p style="margin: 5px 0;"><strong>Rating:</strong> ${Number(fav.rating || fav.tmdb_rating).toFixed(1)}/10</p>` : ''}
                        <button onclick="event.stopPropagation(); removeFavorito(${fav.id})" style="width: 100%; margin-top: 10px; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Remover
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            favoritosList.innerHTML = '<p style="grid-column: 1/-1;">Erro ao carregar favoritos.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
        favoritosList.innerHTML = '<p style="grid-column: 1/-1;">Erro ao carregar favoritos.</p>';
    }
}

async function loadUserLista() {
    const listaList = document.getElementById('lista-list');
    listaList.innerHTML = '<p style="grid-column: 1/-1;">A carregar listas...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/listas`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar listas');
        }
        
        const listas = await response.json();
        
        if (listas.length === 0) {
            listaList.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;">📋</div>
                    <h3 style="margin: 0 0 15px 0; color: ${document.body.classList.contains('dark-mode') ? '#e5e5e5' : '#333333'}; font-size: 22px;">Nenhuma lista criada</h3>
                    <p style="margin-bottom: 30px; color: ${document.body.classList.contains('dark-mode') ? '#b3b3b3' : '#757575'}; font-size: 16px;">Crie sua primeira lista personalizada de filmes e séries!</p>
                    <button onclick="showCreateListModal()" style="padding: 14px 28px; background: #e50914; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; transition: all 0.3s; box-shadow: 0 4px 12px rgba(229, 9, 20, 0.3);">
                        + Criar Minha Primeira Lista
                    </button>
                </div>
            `;
            return;
        }
        
        listaList.innerHTML = `
            <div style="grid-column: 1/-1; margin-bottom: 25px;">
                <button onclick="showCreateListModal()" class="btn-add-lista" style="padding: 12px 24px; background: #e50914; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; transition: all 0.3s; box-shadow: 0 2px 8px rgba(229, 9, 20, 0.3); float: right;">
                    + Nova Lista
                </button>
                <div style="clear: both;"></div>
            </div>
            ${listas.map(lista => {
                const isDark = document.body.classList.contains('dark-mode');
                return `
                <div class="content-card lista-card" style="cursor: default; padding: 0; overflow: hidden; transition: all 0.3s;">
                    <div style="background: linear-gradient(135deg, #e50914 0%, #b9090b 100%); padding: 20px 20px 15px 20px; position: relative;">
                        <div style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; color: white; backdrop-filter: blur(10px);">
                            ${lista.total_itens || 0} ${lista.total_itens === 1 ? 'item' : 'itens'}
                        </div>
                        <h3 style="margin: 0; font-size: 22px; color: white; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${lista.nome}</h3>
                    </div>
                    <div style="padding: 20px;">
                        <p style="color: ${isDark ? '#b3b3b3' : '#666666'}; margin: 0 0 20px 0; min-height: 40px; font-size: 14px; line-height: 1.5;">
                            ${lista.descricao || '<em style="opacity: 0.6;">Sem descrição</em>'}
                        </p>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                            <button onclick="viewLista(${lista.id})" style="padding: 10px 8px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s; box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);">
                                Ver
                            </button>
                            <button onclick="editLista(${lista.id}, '${lista.nome.replace(/'/g, "\\'")}', '${(lista.descricao || '').replace(/'/g, "\\'")}' )" style="padding: 10px 8px; background: #ffc107; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s; box-shadow: 0 2px 4px rgba(255, 193, 7, 0.3);">
                                Editar
                            </button>
                            <button onclick="deleteLista(${lista.id}, '${lista.nome.replace(/'/g, "\\'")}' )" style="padding: 10px 8px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.3s; box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }).join('')}
        `;
    } catch (error) {
        console.error('Erro ao carregar listas:', error);
        listaList.innerHTML = '<p style="grid-column: 1/-1;">Erro ao carregar listas.</p>';
    }
}

async function deleteReview(reviewId) {
    if (!confirm('Tem certeza que deseja eliminar esta review?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showSuccessMessage('Review eliminada com sucesso!');
            loadUserReviews();
        } else {
            const data = await response.json();
            alert(data.message || 'Erro ao eliminar review');
        }
    } catch (error) {
        console.error('Erro ao eliminar review:', error);
        alert('Erro ao eliminar review');
    }
}

async function removeFavorito(conteudoId) {
    if (!confirm('Tem certeza que deseja remover este favorito?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/favoritos/${conteudoId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showSuccessMessage('Favorito removido com sucesso!');
            loadUserFavoritos();
        } else {
            const data = await response.json();
            alert(data.message || 'Erro ao remover favorito');
        }
    } catch (error) {
        console.error('Erro ao remover favorito:', error);
        alert('Erro ao remover favorito');
    }
}

function showCreateListModal() {
    const modal = document.createElement('div');
    modal.id = 'create-list-modal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    const isDark = document.body.classList.contains('dark-mode');
    const bgColor = isDark ? 'rgba(31, 31, 31, 0.98)' : 'rgba(255, 255, 255, 0.98)';
    const textColor = isDark ? '#e5e5e5' : '#333333';
    const inputBg = isDark ? '#2a2a2a' : '#ffffff';
    const inputBorder = isDark ? '#444444' : '#ddd';
    
    modal.innerHTML = `
        <div class="modal-content" style="background: ${bgColor}; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; border: 2px solid #e50914; color: ${textColor};">
            <span class="close" onclick="closeCreateListModal()" style="color: #e50914;">&times;</span>
            <h2 style="margin: 0 0 20px 0; color: #e50914;">Nova Lista</h2>
            <form id="create-list-form">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; color: ${isDark ? '#b3b3b3' : '#757575'};">Título da Lista:</label>
                    <input type="text" id="lista-nome" required placeholder="Ex: Clássicos de Terror" style="width: 100%; padding: 10px; border: 1px solid ${inputBorder}; border-radius: 5px; font-size: 16px; background: ${inputBg}; color: ${textColor};">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; color: ${isDark ? '#b3b3b3' : '#757575'};">Descrição (opcional):</label>
                    <textarea id="lista-descricao" rows="3" placeholder="Descrição da lista..." style="width: 100%; padding: 10px; border: 1px solid ${inputBorder}; border-radius: 5px; font-size: 16px; resize: vertical; background: ${inputBg}; color: ${textColor}; font-family: inherit;"></textarea>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" style="flex: 1; padding: 12px; background: #e50914; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: 600; transition: background 0.3s;">
                        Criar Lista
                    </button>
                    <button type="button" onclick="closeCreateListModal()" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: 600; transition: background 0.3s;">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('create-list-form').addEventListener('submit', createLista);
}

function closeCreateListModal() {
    const modal = document.getElementById('create-list-modal');
    if (modal) modal.remove();
}

async function createLista(e) {
    e.preventDefault();
    
    const nome = document.getElementById('lista-nome').value;
    const descricao = document.getElementById('lista-descricao').value;
    
    try {
        const response = await fetch(`${API_BASE}/listas`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ nome, descricao })
        });
        
        if (response.ok) {
            showSuccessMessage('Lista criada com sucesso!');
            closeCreateListModal();
            loadUserLista();
        } else {
            const data = await response.json();
            alert(data.message || 'Erro ao criar lista');
        }
    } catch (error) {
        console.error('Erro ao criar lista:', error);
        alert('Erro ao criar lista');
    }
}

function editLista(listaId, nome, descricao) {
    const modal = document.createElement('div');
    modal.id = 'edit-list-modal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    const isDark = document.body.classList.contains('dark-mode');
    const bgColor = isDark ? 'rgba(31, 31, 31, 0.98)' : 'rgba(255, 255, 255, 0.98)';
    const textColor = isDark ? '#e5e5e5' : '#333333';
    const inputBg = isDark ? '#2a2a2a' : '#ffffff';
    const inputBorder = isDark ? '#444444' : '#ddd';
    
    modal.innerHTML = `
        <div class="modal-content" style="background: ${bgColor}; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; border: 2px solid #e50914; color: ${textColor};">
            <span class="close" onclick="closeEditListModal()" style="color: #e50914;">&times;</span>
            <h2 style="margin: 0 0 20px 0; color: #e50914;">Editar Lista</h2>
            <form id="edit-list-form">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; color: ${isDark ? '#b3b3b3' : '#757575'};">Título da Lista:</label>
                    <input type="text" id="edit-lista-nome" required value="${nome}" style="width: 100%; padding: 10px; border: 1px solid ${inputBorder}; border-radius: 5px; font-size: 16px; background: ${inputBg}; color: ${textColor};">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 14px; color: ${isDark ? '#b3b3b3' : '#757575'};">Descrição (opcional):</label>
                    <textarea id="edit-lista-descricao" rows="3" style="width: 100%; padding: 10px; border: 1px solid ${inputBorder}; border-radius: 5px; font-size: 16px; resize: vertical; background: ${inputBg}; color: ${textColor}; font-family: inherit;">${descricao}</textarea>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button type="submit" style="flex: 1; padding: 12px; background: #e50914; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: 600; transition: background 0.3s;">
                        Guardar
                    </button>
                    <button type="button" onclick="closeEditListModal()" style="flex: 1; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: 600; transition: background 0.3s;">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('edit-list-form').addEventListener('submit', (e) => updateLista(e, listaId));
}

function closeEditListModal() {
    const modal = document.getElementById('edit-list-modal');
    if (modal) modal.remove();
}

async function updateLista(e, listaId) {
    e.preventDefault();
    
    const nome = document.getElementById('edit-lista-nome').value;
    const descricao = document.getElementById('edit-lista-descricao').value;
    
    try {
        const response = await fetch(`${API_BASE}/listas/${listaId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ nome, descricao })
        });
        
        if (response.ok) {
            showSuccessMessage('Lista atualizada com sucesso!');
            closeEditListModal();
            loadUserLista();
        } else {
            const data = await response.json();
            alert(data.message || 'Erro ao atualizar lista');
        }
    } catch (error) {
        console.error('Erro ao atualizar lista:', error);
        alert('Erro ao atualizar lista');
    }
}

async function viewLista(listaId) {
    try {
        const response = await fetch(`${API_BASE}/listas/${listaId}`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar lista');
        }
        
        const lista = await response.json();
        
        const modal = document.createElement('div');
        modal.id = 'view-list-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.overflowY = 'auto';
        
        const isDark = document.body.classList.contains('dark-mode');
        const bgColor = isDark ? 'rgba(31, 31, 31, 0.98)' : 'rgba(255, 255, 255, 0.98)';
        const textColor = isDark ? '#e5e5e5' : '#333333';
        const textSecondary = isDark ? '#b3b3b3' : '#757575';
        const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.95)';
        
        modal.innerHTML = `
            <div style="background: ${bgColor}; padding: 30px; border-radius: 10px; max-width: 900px; width: 90%; max-height: 90vh; overflow-y: auto; border: 2px solid #e50914; color: ${textColor}; position: relative;">
                <span class="close" onclick="closeViewListModal()" style="color: #e50914; right: 20px; top: 15px;">&times;</span>
                <div style="margin-bottom: 20px;">
                    <h2 style="margin: 0 0 10px 0; color: #e50914;">${lista.nome}</h2>
                    <p style="color: ${textSecondary}; margin: 0;">${lista.descricao || 'Sem descrição'}</p>
                </div>
                ${lista.conteudos && lista.conteudos.length > 0 ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px;">
                        ${lista.conteudos.map(item => `
                            <div class="content-card" style="cursor: pointer; background: ${cardBg};" onclick="window.location.href='detalhes.html?id=${item.id}'">
                                <img src="${item.poster_url || 'https://via.placeholder.com/200x300?text=Sem+Poster'}" 
                                     alt="${item.titulo || 'Título'}"
                                     style="width: 100%; border-radius: 5px; height: 225px; object-fit: cover;">
                                <div style="padding: 10px;">
                                    <h4 style="margin: 5px 0; font-size: 14px; color: ${textColor};">${item.titulo || 'Sem título'}</h4>
                                    <p style="margin: 5px 0; font-size: 12px; color: ${textSecondary};">${item.tipo === 'filme' ? 'Filme' : 'Série'}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `<p style="text-align: center; padding: 40px; color: ${textSecondary};">Esta lista está vazia. Adicione filmes e séries na página de detalhes!</p>`}
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Erro ao visualizar lista:', error);
        alert('Erro ao visualizar lista');
    }
}

function closeViewListModal() {
    const modal = document.getElementById('view-list-modal');
    if (modal) modal.remove();
}

async function deleteLista(listaId, nome) {
    if (!confirm(`Tem certeza que deseja eliminar a lista "${nome}"?\n\nNota: Os filmes e séries não serão eliminados, apenas a lista.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/listas/${listaId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showSuccessMessage('Lista eliminada com sucesso!');
            loadUserLista();
        } else {
            const data = await response.json();
            alert(data.message || 'Erro ao eliminar lista');
        }
    } catch (error) {
        console.error('Erro ao eliminar lista:', error);
        alert('Erro ao eliminar lista');
    }
}


