-- Base de Dados para Gestão de Filmes e Séries
-- Projeto PIS

CREATE DATABASE IF NOT EXISTS pis_filmes_series;
USE pis_filmes_series;

-- Tabela de Utilizadores
CREATE TABLE IF NOT EXISTS utilizadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(100),
    data_registo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT FALSE
);

-- Tabela de Géneros
CREATE TABLE IF NOT EXISTS generos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) UNIQUE NOT NULL
);

-- Tabela de Atores/Diretores
CREATE TABLE IF NOT EXISTS pessoas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('ator', 'diretor', 'ambos') DEFAULT 'ator',
    biografia TEXT,
    data_nascimento DATE,
    foto_url VARCHAR(255)
);

-- Tabela de Filmes/Séries
CREATE TABLE IF NOT EXISTS conteudos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tmdb_id INT UNIQUE,
    titulo VARCHAR(200) NOT NULL,
    sinopse TEXT,
    duracao INT, -- em minutos
    ano_lancamento INT,
    tipo ENUM('filme', 'serie') NOT NULL,
    poster_url VARCHAR(255),
    trailer_url VARCHAR(255),
    data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Relação Conteúdo-Género
CREATE TABLE IF NOT EXISTS conteudo_generos (
    conteudo_id INT,
    genero_id INT,
    PRIMARY KEY (conteudo_id, genero_id),
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE,
    FOREIGN KEY (genero_id) REFERENCES generos(id) ON DELETE CASCADE
);

-- Tabela de Elenco Principal
CREATE TABLE IF NOT EXISTS elenco (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conteudo_id INT,
    pessoa_id INT,
    personagem VARCHAR(100),
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE,
    FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

-- Tabela de Diretores/Criadores
CREATE TABLE IF NOT EXISTS diretores_conteudo (
    conteudo_id INT,
    pessoa_id INT,
    PRIMARY KEY (conteudo_id, pessoa_id),
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE,
    FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

-- Tabela de Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT,
    conteudo_id INT,
    classificacao INT CHECK (classificacao >= 1 AND classificacao <= 5),
    critica TEXT,
    data_review TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    votos_utilidade INT DEFAULT 0,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_content (utilizador_id, conteudo_id)
);

-- Tabela de Votos de Utilidade das Reviews
CREATE TABLE IF NOT EXISTS votos_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT,
    utilizador_id INT,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    UNIQUE KEY unique_vote (review_id, utilizador_id)
);

-- Tabela de Favoritos
CREATE TABLE IF NOT EXISTS favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT,
    conteudo_id INT,
    data_adicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (utilizador_id, conteudo_id)
);

-- Tabela de Listas Personalizadas
CREATE TABLE IF NOT EXISTS listas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Tabela de Conteúdos nas Listas
CREATE TABLE IF NOT EXISTS lista_conteudos (
    lista_id INT,
    conteudo_id INT,
    data_adicao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (lista_id, conteudo_id),
    FOREIGN KEY (lista_id) REFERENCES listas(id) ON DELETE CASCADE,
    FOREIGN KEY (conteudo_id) REFERENCES conteudos(id) ON DELETE CASCADE
);

-- Inserir dados iniciais
INSERT INTO generos (nome) VALUES 
('Ação'), ('Aventura'), ('Comédia'), ('Drama'), ('Terror'), 
('Ficção Científica'), ('Romance'), ('Animação'), ('Documentário'), ('Thriller');


