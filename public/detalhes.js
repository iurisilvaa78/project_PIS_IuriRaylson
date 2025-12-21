const API_BASE = '/api';
let currentUser = null;
let authToken = null;
let conteudoId = null;

function bindAuthButtons() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLogin();
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showRegister();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

function navigateBack() {
    // Se o utilizador abriu a página diretamente (sem histórico), history.back() não faz nada.
    if (window.history.length > 1) {
        window.history.back();
        return;
    }
    window.location.href = 'index.html';
}

function bindBackButtons(root = document) {
    root.querySelectorAll('.btn-voltar').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateBack();
        });
    });
}

function bindFavoriteButton(conteudoId, root = document) {
    const btn = root.querySelector('#fav-btn');
    if (!btn) return;
    if (btn.dataset.bound === '1') return;

    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleFavorito(conteudoId);
    });
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
    bindBackButtons();
    authToken = localStorage.getItem('authToken');
    
    // Obter ID do conteúdo da URL
    const urlParams = new URLSearchParams(window.location.search);
    conteudoId = urlParams.get('id');
    const tmdbId = urlParams.get('tmdb_id');
    const mediaType = urlParams.get('type');
    
    if (!conteudoId && !tmdbId) {
        window.location.href = 'index.html';
        return;
    }
    
    if (authToken) {
        verifyAuth();
    } else {
        updateUI();
    }
    
    if (tmdbId) {
        loadTMDBDetails(tmdbId, mediaType);
    } else {
        loadConteudoDetalhes();
        loadReviews();
        // Garantir que reviews section está visível
        const reviewsSection = document.getElementById('reviews-section');
        if (reviewsSection) {
            reviewsSection.style.display = 'block';
        }
    }
    
    // Form submit
    document.getElementById('review-form').addEventListener('submit', submitReview);
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
            updateUI();
            // Atualizar formulário de review se estiver em página de conteúdo local
            if (conteudoId && !document.querySelector('.tmdb-notice')) {
                const reviewsSection = document.getElementById('reviews-section');
                if (reviewsSection) {
                    reviewsSection.style.display = 'block';
                }
            }
        } else {
            logout();
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        logout();
    }
}

function updateUI() {
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const frontofficeLink = document.getElementById('frontoffice-link');
    const perfilLink = document.getElementById('perfil-link');
    const backofficeLink = document.getElementById('backoffice-link');
    const addReviewForm = document.getElementById('add-review-form');

    // Nesta página (detalhes) deve aparecer o link "Início".
    if (frontofficeLink) frontofficeLink.style.display = 'inline';
    
    if (currentUser && !currentUser.pending) {
        userInfo.textContent = `Olá, ${currentUser.username || currentUser.nome || 'Utilizador'}`;
        userInfo.style.display = 'inline';
        logoutBtn.style.display = 'inline-block';
        perfilLink.style.display = 'inline';
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        
        if (currentUser.isAdmin) {
            backofficeLink.style.display = 'inline';
        }
        
        // Mostrar formulário de review se estiver logado
        if (addReviewForm) {
            addReviewForm.style.display = 'block';
        }
    } else {
        userInfo.textContent = '';
        userInfo.style.display = 'none';
        logoutBtn.style.display = 'none';
        perfilLink.style.display = 'none';
        backofficeLink.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        
        if (addReviewForm) {
            addReviewForm.style.display = 'none';
        }
    }
}

function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showSuccessMessage('Logout efetuado com sucesso!');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

async function loadConteudoDetalhes() {
    const container = document.getElementById('detalhes-container');
    
    try {
        console.log('Carregando detalhes do conteúdo ID:', conteudoId);
        const response = await fetch(`${API_BASE}/conteudos/${conteudoId}`);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Erro na resposta:', errorData);
            throw new Error('Conteúdo não encontrado');
        }
        
        const conteudo = await response.json();
        console.log('Conteúdo carregado:', conteudo);
        
        // Se tmdb_rating é NULL mas tem tmdb_id, atualizar automaticamente
        if ((conteudo.tmdb_rating == null || conteudo.tmdb_rating === 'N/A') && conteudo.tmdb_id) {
            try {
                const updateResponse = await fetch(`${API_BASE}/conteudos/update-rating/${conteudoId}`, {
                    method: 'POST'
                });
                if (updateResponse.ok) {
                    const updateData = await updateResponse.json();
                    const updatedTmdbRating = updateData.tmdb_rating ?? updateData.rating;
                    if (updatedTmdbRating != null) {
                        conteudo.tmdb_rating = updatedTmdbRating;
                    }
                }
            } catch (error) {
                console.error('Erro ao atualizar rating:', error);
            }
        }
        
        const userRating = conteudo.rating != null ? Number(conteudo.rating).toFixed(1) : 'N/A';
        const tmdbRating = conteudo.tmdb_rating != null ? Number(conteudo.tmdb_rating).toFixed(1) : 'N/A';
        const posterUrl = conteudo.poster_url || 'https://via.placeholder.com/300x450?text=Sem+Poster';
        
        container.innerHTML = `
            <button type="button" class="btn-voltar">← Voltar</button>
            <div class="detalhes-content">
                <div class="detalhes-poster-container">
                    <img src="${posterUrl}" alt="${conteudo.titulo}" class="detalhes-poster">
                </div>
                <div class="detalhes-info">
                    <div class="detalhes-header">
                        <h1 class="detalhes-titulo">${conteudo.titulo}</h1>
                        ${currentUser ? `
                            <button id="fav-btn" type="button" class="fav-heart fav-heart-inline" aria-label="Adicionar aos favoritos">♡</button>
                        ` : ''}
                    </div>
                    
                    <div class="detalhes-meta">
                        <span class="badge ${conteudo.tipo}">${conteudo.tipo === 'filme' ? '🎬 Filme' : '📺 Série'}</span>
                        <span class="meta-item">📅 ${conteudo.ano_lancamento || 'N/A'}</span>
                        ${conteudo.duracao ? `<span class="meta-item">⏱️ ${conteudo.duracao} min</span>` : ''}
                    </div>
                    
                    <div class="detalhes-rating">
                        ${conteudo.tmdb_id ? `
                            <div class="rating-row">
                                <span class="rating-label">Avaliação TMDB:</span>
                                <span class="rating-value">⭐ ${tmdbRating}/10</span>
                            </div>
                        ` : ''}
                        <div class="rating-row">
                            <span class="rating-label">Avaliação HuntFilms:</span>
                            <span class="rating-value">⭐ ${userRating}/10</span>
                        </div>
                    </div>
                    
                    <div class="detalhes-sinopse">
                        <h3>Sinopse</h3>
                        <p>${conteudo.sinopse || 'Sem sinopse disponível.'}</p>
                    </div>
                    
                    ${conteudo.trailer_url ? `
                        <a href="${conteudo.trailer_url}" target="_blank" class="btn-trailer">
                            ▶️ Ver Trailer
                        </a>
                    ` : ''}
                </div>
            </div>
        `;

        // O conteúdo é renderizado dinamicamente, por isso (re)fazemos o bind do botão voltar.
        bindBackButtons(container);

        // E também do botão de favoritos (não depende de onclick inline).
        if (currentUser && !currentUser.pending) {
            bindFavoriteButton(conteudo.id, container);
        }
        
        document.getElementById('reviews-section').style.display = 'block';
        
        // Atualizar UI para garantir que formulário apareça se usuário estiver logado
        if (currentUser) {
            const addReviewForm = document.getElementById('add-review-form');
            if (addReviewForm) {
                addReviewForm.style.display = 'block';
            }

            // Sincronizar estado do coração
            await syncFavorito(conteudo.id);
        }
        
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        container.innerHTML = `<p class="error-message">Erro ao carregar detalhes do conteúdo.</p>`;
    }
}

async function loadReviews() {
    const reviewsList = document.getElementById('reviews-list');
    
    try {
        const response = await fetch(`${API_BASE}/reviews/conteudo/${conteudoId}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar reviews');
        }
        
        const reviews = await response.json();
        
        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p class="no-reviews">Ainda não há reviews para este conteúdo. Seja o primeiro a avaliar!</p>';
            return;
        }
        
        reviewsList.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <span class="review-author">👤 ${review.username}</span>
                    <span class="review-rating">⭐ ${review.avaliacao}/10</span>
                </div>
                <p class="review-comment">${review.comentario}</p>
                <p class="review-date">${new Date(review.data_review).toLocaleDateString('pt-PT')}</p>
                ${currentUser && (currentUser.id === review.utilizador_id || currentUser.isAdmin) ? `
                    <button onclick="deleteReview(${review.id})" class="btn-delete">Eliminar</button>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar reviews:', error);
        reviewsList.innerHTML = '<p class="error-message">Erro ao carregar reviews.</p>';
    }
}

async function submitReview(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Precisa de fazer login para deixar uma review!');
        showLogin();
        return;
    }
    
    const avaliacao = document.getElementById('avaliacao').value;
    const comentario = document.getElementById('comentario').value.trim();
    
    if (!avaliacao || avaliacao < 1 || avaliacao > 10) {
        alert('Por favor, insira uma avaliação válida entre 1 e 10!');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                conteudo_id: conteudoId,
                avaliacao: parseInt(avaliacao),
                comentario: comentario || null
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccessMessage('Review adicionada com sucesso!');
            document.getElementById('review-form').reset();
            await loadReviews();
            if (conteudoId) {
                await loadConteudoDetalhes(); // Recarregar para atualizar rating médio
            }
        } else {
            alert(data.message || 'Erro ao adicionar review');
        }
    } catch (error) {
        console.error('Erro ao submeter review:', error);
        alert('Erro ao submeter review. Verifique a consola para mais detalhes.');
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
            await loadReviews();
            if (conteudoId) {
                await loadConteudoDetalhes();
            }
        } else {
            alert('Erro ao eliminar review');
        }
    } catch (error) {
        console.error('Erro ao eliminar review:', error);
        alert('Erro ao eliminar review');
    }
}

function updateFavoritoButton(buttonEl, isFavorite) {
    if (!buttonEl) return;
    buttonEl.classList.toggle('is-favorite', isFavorite);
    buttonEl.textContent = isFavorite ? '♥' : '♡';
    buttonEl.setAttribute('aria-label', isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
}

async function syncFavorito(conteudoId) {
    if (!currentUser || !authToken) return;
    const btn = document.getElementById('fav-btn');
    if (!btn) return;

    try {
        const response = await fetch(`${API_BASE}/favoritos/${conteudoId}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) return;
        const data = await response.json();
        updateFavoritoButton(btn, !!data.isFavorite);
    } catch (error) {
        console.error('Erro ao sincronizar favorito:', error);
    }
}

async function toggleFavorito(conteudoId) {
    if (!currentUser) {
        alert('Precisa de fazer login para adicionar favoritos!');
        return;
    }

    const btn = document.getElementById('fav-btn');
    const isFavorite = !!(btn && btn.classList.contains('is-favorite'));

    try {
        const response = await fetch(
            isFavorite ? `${API_BASE}/favoritos/${conteudoId}` : `${API_BASE}/favoritos`,
            isFavorite
                ? { method: 'DELETE', headers: getAuthHeaders() }
                : { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ conteudo_id: conteudoId }) }
        );

        if (response.ok) {
            updateFavoritoButton(btn, !isFavorite);
            showSuccessMessage(!isFavorite ? 'Adicionado aos favoritos!' : 'Removido dos favoritos!');
        } else {
            const data = await response.json().catch(() => ({}));
            alert(data.message || 'Erro ao atualizar favorito');
        }
    } catch (error) {
        console.error('Erro ao atualizar favorito:', error);
        alert('Erro ao atualizar favorito');
    }
}

// Compatibilidade (se existir algum onclick antigo)
async function adicionarFavorito(conteudoId) {
    return toggleFavorito(conteudoId);
}

// Carregar detalhes de filmes/séries do TMDB
async function loadTMDBDetails(tmdbId, mediaType = 'movie') {
    const container = document.getElementById('detalhes-container');
    
    try {
        console.log('loadTMDBDetails chamado com tmdbId:', tmdbId, 'mediaType:', mediaType);
        
        // Primeiro verificar se já existe na base de dados
        const checkResponse = await fetch(`${API_BASE}/conteudos/check-tmdb/${tmdbId}`);
        const checkData = await checkResponse.json();
        
        console.log('Check TMDB response:', checkData);
        
        if (checkData.exists) {
            console.log('Filme já existe na BD com ID:', checkData.id);
            // Já existe - atualizar conteudoId global e carregar da BD local
            conteudoId = checkData.id;
            console.log('conteudoId atualizado para:', conteudoId);
            await loadConteudoDetalhes();
            await loadReviews();
            // Garantir que reviews section está visível
            const reviewsSection = document.getElementById('reviews-section');
            if (reviewsSection) {
                reviewsSection.style.display = 'block';
            }
            return;
        }
        
        // Não existe - carregar detalhes do TMDB
        const response = await fetch(`/api/tmdb/${mediaType}/${tmdbId}`);
        
        if (!response.ok) {
            throw new Error('Conteúdo não encontrado na TMDB');
        }
        
        const conteudo = await response.json();
        
        const titulo = conteudo.title || conteudo.name;
        const posterUrl = conteudo.poster_path ? `https://image.tmdb.org/t/p/w500${conteudo.poster_path}` : 'https://via.placeholder.com/300x450?text=Sem+Poster';
        const ano = conteudo.release_date ? new Date(conteudo.release_date).getFullYear() : (conteudo.first_air_date ? new Date(conteudo.first_air_date).getFullYear() : 'N/A');
        const tipo = mediaType === 'movie' ? 'Filme' : 'Série';
        const rating = conteudo.vote_average ? conteudo.vote_average.toFixed(1) : 'N/A';
        const sinopse = conteudo.overview || 'Sem sinopse disponível.';
        
        // Mostrar botão de importar apenas para admin
        const importBtn = currentUser && currentUser.isAdmin ? `
            <button onclick="importarTMDB(${tmdbId}, '${mediaType}')" class="btn-importar-tmdb">
                📥 Importar para Base de Dados
            </button>
        ` : '';
        
        const noticeMessage = currentUser && currentUser.isAdmin 
            ? 'ℹ️ Este conteúdo vem da base de dados TMDB. Use o botão acima para importar e permitir reviews.'
            : 'ℹ️ Este conteúdo vem da base de dados TMDB. Peça a um administrador para importar este conteúdo.';
        
        container.innerHTML = `
            <button type="button" class="btn-voltar">← Voltar</button>
            <div class="detalhes-content">
                <div class="detalhes-poster-container">
                    <img src="${posterUrl}" alt="${titulo}" class="detalhes-poster">
                    ${importBtn}
                </div>
                <div class="detalhes-info">
                    <h1 class="detalhes-titulo">${titulo}</h1>
                    
                    <div class="detalhes-meta">
                        <span class="badge ${mediaType}">${tipo === 'Filme' ? '🎬 Filme' : '📺 Série'}</span>
                        <span class="meta-item">📅 ${ano}</span>
                    </div>
                    
                    <div class="detalhes-rating">
                        <span class="rating-label">Avaliação TMDB:</span>
                        <span class="rating-value">⭐ ${rating}/10</span>
                    </div>
                    
                    <div class="detalhes-sinopse">
                        <h3>Sinopse</h3>
                        <p>${sinopse}</p>
                    </div>
                    
                    <div class="tmdb-notice">
                        <p>${noticeMessage}</p>
                    </div>
                </div>
            </div>
        `;

        bindBackButtons(container);
        
        // Esconder seção de reviews para conteúdos TMDB
        const reviewsSection = document.getElementById('reviews-section');
        if (reviewsSection) {
            reviewsSection.style.display = 'none';
        }
        
        const addReviewForm = document.getElementById('add-review-form');
        if (addReviewForm) {
            addReviewForm.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Erro ao carregar detalhes TMDB:', error);
        container.innerHTML = `
            <div class="detalhes-header">
                <h1>Erro</h1>
                <button type="button" class="btn-voltar">← Voltar</button>
            </div>
            <p>Erro ao carregar informações do conteúdo.</p>
        `;

        bindBackButtons(container);
    }
}

// Modal Functions
function showLogin() {
    const modal = document.getElementById('auth-modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h2>Login</h2>
        <form id="login-form">
            <div>
                <label for="login-username">Username:</label>
                <input type="text" id="login-username" required>
            </div>
            <div>
                <label for="login-password">Password:</label>
                <input type="password" id="login-password" required>
            </div>
            <button type="submit">Entrar</button>
        </form>
        <div class="auth-switch">
            <span>Não tem conta?</span>
            <button type="button" class="auth-link" onclick="showRegister()">Criar conta</button>
        </div>
    `;
    
    modal.style.display = 'block';
    
    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

function showRegister() {
    const modal = document.getElementById('auth-modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h2>Registar</h2>
        <form id="register-form">
            <div>
                <label for="register-nome">Nome:</label>
                <input type="text" id="register-nome" required>
            </div>
            <div>
                <label for="register-email">Email:</label>
                <input type="email" id="register-email" required>
            </div>
            <div>
                <label for="register-username">Username:</label>
                <input type="text" id="register-username" required>
            </div>
            <div>
                <label for="register-password">Password:</label>
                <input type="password" id="register-password" required>
            </div>
            <button type="submit">Registar</button>
        </form>
        <div class="auth-switch">
            <span>Já tem conta?</span>
            <button type="button" class="auth-link" onclick="showLogin()">Fazer login</button>
        </div>
    `;
    
    modal.style.display = 'block';
    
    document.getElementById('register-form').addEventListener('submit', handleRegister);
}

function closeModal() {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            closeModal();
            showSuccessMessage('Login efetuado com sucesso!');
            await verifyAuth();
            // Forçar recarregamento completo sem cache
            window.location.reload(true);
        } else {
            alert(data.message || 'Erro ao fazer login');
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert('Erro ao fazer login');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const nome = document.getElementById('register-nome').value;
    const email = document.getElementById('register-email').value;
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal();
            showSuccessMessage('Registo efetuado! Aguarde aprovação do administrador.');
        } else {
            alert(data.message || 'Erro ao registar');
        }
    } catch (error) {
        console.error('Erro ao registar:', error);
        alert('Erro ao registar');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('auth-modal');
    if (event.target === modal) {
        closeModal();
    }
}

// Importar filme/série TMDB para base de dados local
async function importarTMDB(tmdbId, mediaType) {
    if (!currentUser || !currentUser.isAdmin) {
        alert('Apenas administradores podem importar conteúdos!');
        return;
    }
    
    if (!confirm('Deseja importar este conteúdo para a base de dados local?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/conteudos/importar-tmdb`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.already_exists) {
                showSuccessMessage('Este conteúdo já existe! Carregando...');
            } else {
                showSuccessMessage('Conteúdo importado com sucesso!');
            }
            
            // Atualizar conteudoId global e carregar diretamente
            conteudoId = data.id;
            await loadConteudoDetalhes();
            await loadReviews();
            
            // Garantir que reviews section está visível
            const reviewsSection = document.getElementById('reviews-section');
            if (reviewsSection) {
                reviewsSection.style.display = 'block';
            }
        } else {
            alert(data.message || 'Erro ao importar conteúdo');
        }
    } catch (error) {
        console.error('Erro ao importar TMDB:', error);
        alert('Erro ao importar conteúdo. Verifique a consola para mais detalhes.');
    }
}
