const API_BASE = '/api';
let authToken = null;
let currentUser = null;

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
            console.log('Token inválido');
            showLoginRequired();
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        showLoginRequired();
    }
}

function updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const frontLink = document.getElementById('frontoffice-link');
    const backLink = document.getElementById('backoffice-link');
    const perfilLink = document.getElementById('perfil-link');

    // Nesta página (perfil) mostramos o link "Início" como nas outras páginas.
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
    
    // Mostrar tab selecionado
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
    
    // Carregar dados específicos do tab
    if (tabName === 'reviews') {
        loadUserReviews();
    } else if (tabName === 'favoritos') {
        loadUserFavoritos();
    } else if (tabName === 'listas') {
        loadUserListas();
    }
}

function loadPerfilInfo() {
    document.getElementById('edit-username').value = currentUser.username || '';
    document.getElementById('edit-email').value = currentUser.email || '';
    document.getElementById('edit-nome').value = currentUser.nome || '';
    document.getElementById('data-registo').textContent = currentUser.created_at ? 
        new Date(currentUser.created_at).toLocaleDateString('pt-PT') : 'N/A';
    document.getElementById('tipo-conta').textContent = currentUser.isAdmin ? 'Administrador' : 'Utilizador';
}

async function updatePerfil(event) {
    event.preventDefault();
    
    const email = document.getElementById('edit-email').value;
    const nome = document.getElementById('edit-nome').value;
    const password = document.getElementById('edit-password').value;
    const passwordConfirm = document.getElementById('edit-password-confirm').value;
    
    // Validar passwords se foram preenchidas
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
            // Limpar campos de password
            document.getElementById('edit-password').value = '';
            document.getElementById('edit-password-confirm').value = '';
            // Atualizar dados do utilizador
            verifyAuth();
        } else {
            alert(data.message || 'Erro ao atualizar perfil');
        }
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        alert('Erro ao atualizar perfil');
    }
}

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
                <div class="review-card" style="background: rgba(255,255,255,0.9); padding: 20px; margin: 15px 0; border-radius: 10px; border-left: 4px solid #822626;">
                    <h3>${review.titulo_conteudo}</h3>
                    <p><strong>Classificação:</strong> ${'⭐'.repeat(review.classificacao)}</p>
                    <p><strong>Crítica:</strong> ${review.critica || 'Sem crítica escrita'}</p>
                    <p style="color: #666; font-size: 14px;">
                        <strong>Data:</strong> ${new Date(review.data_review).toLocaleDateString('pt-PT')} | 
                        <strong>Votos úteis:</strong> ${review.votos_utilidade || 0}
                    </p>
                    <button onclick="deleteReview(${review.id})" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                        Eliminar Review
                    </button>
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
    favoritosList.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">A carregar favoritos...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/favoritos`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const favoritos = await response.json();
            
            if (favoritos.length === 0) {
                favoritosList.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Ainda não tem favoritos.</p>';
                return;
            }
            
            favoritosList.innerHTML = favoritos.map(fav => `
                <div class="content-card">
                    <img src="${fav.poster_url || 'https://via.placeholder.com/200x300?text=Sem+Poster'}" 
                         alt="${fav.titulo}">
                    <div class="content-card-info">
                        <h3>${fav.titulo}</h3>
                        <p>${fav.tipo === 'filme' ? '🎬 Filme' : '📺 Série'}</p>
                        <p>Ano: ${fav.ano_lancamento || 'N/A'}</p>
                        <button onclick="removeFavorito(${fav.id})" style="width: 100%; margin-top: 10px; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Remover
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            favoritosList.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Erro ao carregar favoritos.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
        favoritosList.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Erro ao carregar favoritos.</p>';
    }
}

async function loadUserListas() {
    const listasList = document.getElementById('listas-list');
    listasList.innerHTML = '<p>A carregar listas...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/listas/user/${currentUser.id}`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const listas = await response.json();
            
            if (listas.length === 0) {
                listasList.innerHTML = '<p>Ainda não criou nenhuma lista.</p>';
                return;
            }
            
            listasList.innerHTML = listas.map(lista => `
                <div style="background: rgba(255,255,255,0.9); padding: 20px; margin: 15px 0; border-radius: 10px;">
                    <h3>${lista.nome}</h3>
                    <p>${lista.descricao || 'Sem descrição'}</p>
                    <p style="color: #666; font-size: 14px;">
                        <strong>Criada em:</strong> ${new Date(lista.data_criacao).toLocaleDateString('pt-PT')} | 
                        <strong>Itens:</strong> ${lista.total_itens || 0}
                    </p>
                    <button onclick="deleteLista(${lista.id})" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;">
                        Eliminar Lista
                    </button>
                </div>
            `).join('');
        } else {
            listasList.innerHTML = '<p>Erro ao carregar listas.</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar listas:', error);
        listasList.innerHTML = '<p>Erro ao carregar listas.</p>';
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

async function deleteLista(listaId) {
    if (!confirm('Tem certeza que deseja eliminar esta lista?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/listas/${listaId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showSuccessMessage('Lista eliminada com sucesso!');
            loadUserListas();
        } else {
            const data = await response.json();
            alert(data.message || 'Erro ao eliminar lista');
        }
    } catch (error) {
        console.error('Erro ao eliminar lista:', error);
        alert('Erro ao eliminar lista');
    }
}
