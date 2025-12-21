const API_BASE = '/api';
let currentUser = null;
let authToken = null;
let currentPage = 1;
let isLoading = false;
let totalPages = 1;
let currentSearch = '';
let currentTipo = '';

// Favoritos (para mostrar coração cheio/vazio)
let favoriteIds = new Set();
let favoritesLoaded = false;

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

// Função para mapear tipos do frontend para TMDB
function mapTipoToTMDB(tipo) {
    switch (tipo) {
        case 'filme':
            return 'movie';
        case 'serie':
            return 'tv';
        case '':
        case 'todos':
            return 'movie'; // Para "todos", vamos buscar filmes por padrão, mas poderíamos implementar lógica para buscar ambos
        default:
            return 'movie';
    }
}

// Verificar se há token salvo
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - inicializando app');
    loadDarkModePreference();
    bindAuthButtons();
    authToken = localStorage.getItem('authToken');
    if (authToken) {
        // Oculta botões enquanto valida o token
        currentUser = { pending: true };
        updateUI();
        verifyAuth();
    } else {
        // Garantir que UI está no estado correto mesmo sem login
        updateUI();
    }
    loadContent();
    
    // Adicionar event listener para filtro de tipo
    document.getElementById('tipo-filter').addEventListener('change', filterContent);
});

// Re-verificar auth quando volta à página (botão voltar do browser)
window.addEventListener('pageshow', (event) => {
    // Se a página foi carregada do cache (back/forward)
    if (event.persisted) {
        console.log('Página carregada do cache - re-verificando auth');
        authToken = localStorage.getItem('authToken');
        if (authToken) {
            verifyAuth();
        } else {
            currentUser = null;
            updateUI();
        }
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

            // Carregar favoritos e re-renderizar para mostrar o coração certo.
            await loadFavoriteIds();
            loadContent(currentPage);
        } else {
            console.log('Token inválido, fazendo logout');
            logout();
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        logout();
    }
}

function updateHeartButton(buttonEl, isFavorite) {
    if (!buttonEl) return;
    buttonEl.classList.toggle('is-favorite', isFavorite);
    buttonEl.textContent = isFavorite ? '♥' : '♡';
    buttonEl.setAttribute('aria-label', isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
}

async function loadFavoriteIds() {
    favoritesLoaded = false;
    favoriteIds = new Set();

    if (!authToken || !currentUser || currentUser.pending) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/favoritos`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) return;
        const favoritos = await response.json();
        favoriteIds = new Set((favoritos || []).map(f => f.id));
        favoritesLoaded = true;
    } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
    }
}

async function toggleFavorite(conteudoId, buttonEl) {
    if (!authToken || !currentUser || currentUser.pending) {
        showLogin();
        return;
    }

    const isFavorite = favoriteIds.has(conteudoId);

    try {
        const response = await fetch(
            isFavorite ? `${API_BASE}/favoritos/${conteudoId}` : `${API_BASE}/favoritos`,
            isFavorite
                ? { method: 'DELETE', headers: getAuthHeaders() }
                : { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ conteudo_id: conteudoId }) }
        );

        if (response.ok) {
            if (isFavorite) {
                favoriteIds.delete(conteudoId);
            } else {
                favoriteIds.add(conteudoId);
            }
            updateHeartButton(buttonEl, !isFavorite);
        } else {
            const data = await response.json().catch(() => ({}));
            alert(data.message || 'Erro ao atualizar favorito');
        }
    } catch (error) {
        console.error('Erro ao atualizar favorito:', error);
        alert('Erro ao atualizar favorito');
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
    
    console.log('UpdateUI chamado, currentUser:', currentUser);
    
    if (currentUser && !currentUser.pending) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userInfo.style.display = 'inline-block';
        userInfo.textContent = `Olá, ${currentUser.username || currentUser.nome || 'Utilizador'}`;
            // Link para a página inicial (não é "Frontoffice")
            if (frontLink) frontLink.style.display = currentUser.isAdmin ? 'inline-block' : 'none';
        if (backLink) backLink.style.display = currentUser.isAdmin ? 'inline-block' : 'none';
        if (perfilLink) perfilLink.style.display = 'inline-block';
    } else {
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
        if (frontLink) frontLink.style.display = 'none';
        if (backLink) backLink.style.display = 'none';
        if (perfilLink) perfilLink.style.display = 'none';
    }
}

function showLogin() {
    document.getElementById('auth-modal').style.display = 'block';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
    document.getElementById('auth-modal').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function closeModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

function showPerfil() {
    if (!currentUser || currentUser.pending) {
        console.log('showPerfil: currentUser não disponível', currentUser);
        showLogin();
        return;
    }
    
    console.log('Mostrando perfil para:', currentUser);
    
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

async function login() {
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
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            updateUI();
            closeModal();
            showSuccessMessage('Login realizado com sucesso!');
        } else {
            alert(data.message || 'Erro ao fazer login');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao fazer login');
    }
}

async function register() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const nome = document.getElementById('reg-nome').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, nome })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccessMessage('Registo realizado com sucesso! Faça login.');
            showLogin();
        } else {
            alert(data.message || 'Erro ao registar');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao registar');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    favoriteIds = new Set();
    favoritesLoaded = false;
    localStorage.removeItem('authToken');
    updateUI();
    showSuccessMessage('Logout realizado com sucesso!');
    loadContent(1);
}

async function loadContent(page = 1) {
    if (isLoading) {
        console.log('LoadContent bloqueado - já carregando');
        return;
    }
    
    console.log(`Carregando página ${page} com search="${currentSearch}" tipo="${currentTipo}"`);
    
    try {
        isLoading = true;
        currentPage = page;
        
        let url = `${API_BASE}/conteudos?`;
        let isTMDB = false;
        let conteudos = [];
        let totalResults = 0;
        
        if (currentSearch) {
            const tmdbTipo = mapTipoToTMDB(currentTipo);
            url = `${API_BASE}/conteudos/tmdb/search?query=${encodeURIComponent(currentSearch)}&tipo=${tmdbTipo}&page=${page}`;
            isTMDB = true;
            
            const response = await fetch(url);
            const data = await response.json();
            conteudos = data.results || [];
            totalResults = data.total_results || 0;
            totalPages = Math.ceil(totalResults / 20); // TMDB retorna 20 por página
        } else {
            // Para busca sem pesquisa (populares)
            if (currentTipo === '') {
                // "Todos" - buscar filmes e séries
                const [filmesResponse, seriesResponse] = await Promise.all([
                    fetch(`${API_BASE}/conteudos/tmdb/popular?tipo=movie&page=${page}`),
                    fetch(`${API_BASE}/conteudos/tmdb/popular?tipo=tv&page=${page}`)
                ]);
                
                const filmesData = await filmesResponse.json();
                const seriesData = await seriesResponse.json();
                
                // Combinar resultados, alternando entre filmes e séries
                const filmes = filmesData.results || [];
                const series = seriesData.results || [];
                
                conteudos = [];
                const maxLength = Math.max(filmes.length, series.length);
                for (let i = 0; i < maxLength; i++) {
                    if (i < filmes.length) conteudos.push(filmes[i]);
                    if (i < series.length) conteudos.push(series[i]);
                }
                
                isTMDB = true;
                totalPages = "..."; // TMDB tem muitas páginas disponíveis
            } else {
                // Filme ou série específica
                const tmdbTipo = mapTipoToTMDB(currentTipo);
                url = `${API_BASE}/conteudos/tmdb/popular?tipo=${tmdbTipo}&page=${page}`;
                isTMDB = true;
                
                const response = await fetch(url);
                const data = await response.json();
                conteudos = data.results || []; // Mostrar todos os 20 resultados da TMDB
                totalResults = data.total_results || 0;
                totalPages = Math.ceil(totalResults / 20);
            }
        }
        
        displayContent(conteudos, isTMDB, false);
        updatePaginationControls();
    } catch (error) {
        console.error('Erro ao carregar conteúdos:', error);
    } finally {
        isLoading = false;
    }
}

function searchContent() {
    currentPage = 1;
    currentSearch = document.getElementById('search-input').value;
    currentTipo = document.getElementById('tipo-filter').value;
    loadContent(1);
}

function filterContent() {
    console.log('filterContent chamado');
    currentPage = 1;
    currentSearch = '';
    currentTipo = document.getElementById('tipo-filter').value;
    console.log(`Filtro alterado para: ${currentTipo}`);
    loadContent(1);
}

function changePage(page) {
    if (page < 1 || page > totalPages || isLoading) return;
    loadContent(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updatePaginationControls() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    if (prevBtn && nextBtn && pageInfo) {
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }
}

// Tornar função global para ser acessível pelo HTML
window.changePage = changePage;

function displayContent(conteudos, isTMDB = false) {
    const grid = document.getElementById('content-grid');
    grid.innerHTML = '';
    
    if (!conteudos || conteudos.length === 0) {
        grid.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">Nenhum conteúdo encontrado.</p>';
        return;
    }
    
    conteudos.forEach(conteudo => {
        const card = document.createElement('div');
        card.className = 'content-card';
        
        if (isTMDB) {
            // Dados da TMDB - redirecionar para página de detalhes
            const tmdbId = conteudo.id;
            const mediaType = conteudo.title ? 'movie' : 'tv';
            card.onclick = () => window.location.href = `detalhes.html?tmdb_id=${tmdbId}&type=${mediaType}`;
            card.style.cursor = 'pointer';
            
            const titulo = conteudo.title || conteudo.name;
            const posterUrl = conteudo.poster_path ? `https://image.tmdb.org/t/p/w500${conteudo.poster_path}` : 'https://via.placeholder.com/200x300?text=Sem+Poster';
            const ano = conteudo.release_date ? new Date(conteudo.release_date).getFullYear() : (conteudo.first_air_date ? new Date(conteudo.first_air_date).getFullYear() : 'N/A');
            const tipo = conteudo.title ? '🎬 Filme' : '📺 Série';
            const rating = conteudo.vote_average ? conteudo.vote_average.toFixed(1) : 'N/A';
            
            card.innerHTML = `
                <img src="${posterUrl}" 
                     alt="${titulo}" 
                     onerror="this.src='https://via.placeholder.com/200x300?text=Sem+Poster'">
                <div class="content-card-info">
                    <h3>${titulo}</h3>
                    <p>${tipo}</p>
                    <p>Ano: ${ano}</p>
                    <p class="rating">⭐ ${rating}/10</p>
                </div>
            `;
        } else {
            // Dados da base de dados local - redirecionar para página de detalhes
            card.onclick = () => window.location.href = `detalhes.html?id=${conteudo.id}`;
            card.style.cursor = 'pointer';
            const userRating = conteudo.rating != null ? Number(conteudo.rating).toFixed(1) : 'N/A';
            const tmdbRating = conteudo.tmdb_rating != null ? Number(conteudo.tmdb_rating).toFixed(1) : null;
            const ratingHtml = tmdbRating
                ? `<p class="rating">⭐ TMDB: ${tmdbRating}/10</p><p class="rating">⭐ Utilizadores: ${userRating}/10</p>`
                : `<p class="rating">⭐ ${userRating}/10</p>`;
            
            card.innerHTML = `
                <img src="${conteudo.poster_url || 'https://via.placeholder.com/200x300?text=Sem+Poster'}" 
                     alt="${conteudo.titulo}" 
                     onerror="this.src='https://via.placeholder.com/200x300?text=Sem+Poster'">
                <div class="content-card-info">
                    <h3>${conteudo.titulo}</h3>
                    <p>${conteudo.tipo === 'filme' ? '🎬 Filme' : '📺 Série'}</p>
                    <p>Ano: ${conteudo.ano_lancamento || 'N/A'}</p>
                    ${ratingHtml}
                </div>
            `;

            // Coração de favoritos (apenas para conteúdos locais e utilizador autenticado)
            if (currentUser && !currentUser.pending) {
                card.classList.add('has-fav');

                const favBtn = document.createElement('button');
                favBtn.type = 'button';
                favBtn.className = 'fav-heart';
                const isFav = favoritesLoaded && favoriteIds.has(conteudo.id);
                updateHeartButton(favBtn, isFav);

                favBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavorite(conteudo.id, favBtn);
                });

                card.appendChild(favBtn);
            }
        }
        
        grid.appendChild(card);
    });
}

async function showContentDetails(id) {
    try {
        const response = await fetch(`${API_BASE}/conteudos/${id}`);
        const conteudo = await response.json();
        
        let detailsHTML = `
            <h2>${conteudo.titulo}</h2>
            <p><strong>Tipo:</strong> ${conteudo.tipo === 'filme' ? 'Filme' : 'Série'}</p>
            <p><strong>Ano:</strong> ${conteudo.ano_lancamento || 'N/A'}</p>
            <p><strong>Duração:</strong> ${conteudo.duracao ? conteudo.duracao + ' minutos' : 'N/A'}</p>
            <p><strong>Sinopse:</strong> ${conteudo.sinopse || 'Sem sinopse disponível.'}</p>
        `;
        
        if (conteudo.trailer_url) {
            detailsHTML += `<p><a href="${conteudo.trailer_url}" target="_blank">Ver Trailer</a></p>`;
        }
        
        if (conteudo.reviews && conteudo.reviews.length > 0) {
            detailsHTML += '<h3>Reviews:</h3>';
            conteudo.reviews.forEach(review => {
                detailsHTML += `
                    <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px;">
                        <p><strong>${review.username}</strong> - ${'⭐'.repeat(review.classificacao)}</p>
                        <p>${review.critica || 'Sem crítica escrita.'}</p>
                        <p><small>Votos úteis: ${review.votos_utilidade}</small></p>
                    </div>
                `;
            });
        }
        
        alert(detailsHTML);
    } catch (error) {
        console.error('Erro ao obter detalhes:', error);
    }
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const authModal = document.getElementById('auth-modal');
    const perfilModal = document.getElementById('perfil-modal');
    if (event.target === authModal) {
        closeModal();
    }
    if (event.target === perfilModal) {
        closePerfilModal();
    }
}

