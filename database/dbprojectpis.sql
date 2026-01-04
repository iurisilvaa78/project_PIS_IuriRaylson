-- Script para criar base de dados dbprojectpis

-- Criar nova base de dados
DROP DATABASE IF EXISTS dbprojectpis;
CREATE DATABASE dbprojectpis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE dbprojectpis;

-- Tabela de utilizadores
CREATE TABLE utilizadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(100),
    is_admin BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de conteúdos (filmes e séries)
CREATE TABLE conteudos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tmdb_id INT,
    tipo ENUM('filme', 'serie') NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    titulo_original VARCHAR(255),
    diretor VARCHAR(255),
    sinopse TEXT,
    poster_url VARCHAR(500),
    backdrop_url VARCHAR(500),
    ano_lancamento INT,
    duracao INT,
    rating DECIMAL(3,1),
    trailer_url VARCHAR(500),
    tmdb_rating DECIMAL(3,1),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tmdb (tmdb_id, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de favoritos
CREATE TABLE favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    conteudo_id INT NOT NULL,
    data_adicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorito (utilizador_id, conteudo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de reviews
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    conteudo_id INT NOT NULL,
    avaliacao INT NOT NULL CHECK (avaliacao >= 1 AND avaliacao <= 10),
    comentario TEXT,
    votos_utilidade INT DEFAULT 0,
    data_review TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (utilizador_id, conteudo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de votos em reviews
CREATE TABLE votos_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    utilizador_id INT NOT NULL,
    data_voto TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    UNIQUE KEY unique_voto (review_id, utilizador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de listas
CREATE TABLE listas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de conteúdos nas listas
CREATE TABLE lista_conteudos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lista_id INT NOT NULL,
    conteudo_id INT NOT NULL,
    data_adicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lista_id) REFERENCES listas(id) ON DELETE CASCADE,
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_lista_conteudo (lista_id, conteudo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de géneros
CREATE TABLE generos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de relação entre conteúdos e géneros
CREATE TABLE conteudo_generos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conteudo_id INT NOT NULL,
    genero_id INT NOT NULL,
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE,
    FOREIGN KEY (genero_id) REFERENCES generos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_conteudo_genero (conteudo_id, genero_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir utilizador admin padrão (password: admin123)
INSERT INTO utilizadores (username, email, password, nome, is_admin) 
VALUES ('admin', 'admin@dbprojectpis.com', '$2b$10$zOSriImLdMeM6f2dw00ohOV4hPiLhocHZG3Zwztb/iL50x.0xpcYi', 'Administrador', TRUE);

-- Mostrar resultado
SELECT 'Base de dados dbprojectpis criada com sucesso!' as Resultado;
SELECT 'Utilizador admin criado (username: admin, password: admin123)' as Info;
SELECT COUNT(*) as total_tabelas FROM information_schema.tables WHERE table_schema = 'dbprojectpis';
