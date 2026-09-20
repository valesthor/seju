<div align="center">

<picture>
  <img alt="Seju" src="/images/logo-tema-claro.webp" width="280">
</picture>

<br>

# Arquitetura

Visão geral de como o Seju funciona por dentro.

</div>

---

## Diagrama de componentes

```
┌──────────────────────────────────────────┐
│          DISPOSITIVO DO USUÁRIO          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │          Navegador / PWA           │  │
│  │                                    │  │
│  │  index.html   estrutura visual     │  │
│  │  styles.css   aparencia            │  │
│  │  app.js       logica e rotas       │  │
│  │  sw.js        cache e offline      │  │
│  │                                    │  │
│  │  localStorage:                     │  │
│  │    - token de sessao               │  │
│  │    - copia em cache dos dados      │  │
│  │    - preferencias (tema, sidebar)  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
                    │
                    │ HTTPS
                    ▼
┌──────────────────────────────────────────┐
│                 NETLIFY                  │
│                                          │
│  Hospedagem estatica (html, css, js)     │
│                                          │
│  Funcoes serverless:                     │
│  ┌────────────────┐   ┌────────────────┐ │
│  │  auth.js       │   │  data.js       │ │
│  │  - login       │   │  - leitura     │ │
│  │  - sessao JWT  │   │  - gravacao    │ │
│  │  - usuarios    │   │  - export/imp  │ │
│  └────────────────┘   └────────────────┘ │
│                                          │
│  Variaveis de ambiente:                  │
│    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET│
│    GITHUB_REPO, GITHUB_TOKEN             │
│    GITHUB_BRANCH, SESSION_SECRET         │
└──────────────────────────────────────────┘
                    │
                    │ API do GitHub
                    ▼
┌──────────────────────────────────────────┐
│             GITHUB PRIVADO               │
│                                          │
│  Repositorio seju-data (do usuario)      │
│                                          │
│  data/                                   │
│    users.json                            │
│    alunos.json                           │
│    funcionarios.json                     │
│    escolas.json                          │
│    turmas.json                           │
│    atendimentos.json                     │
│    pausas.json                           │
│    config.json                           │
└──────────────────────────────────────────┘
```

---

## Fluxo de autenticacao

### Modo usuario e senha

```
Usuario                Seju                 GitHub
   │                    │                     │
   │─── preenche ──────▶│                     │
   │                    │─── POST /login ────▶│
   │                    │                     │
   │                    │◀─── sessao JWT ─────│
   │◀── sessao salva ───│                     │
   │                    │                     │
```

### Modo GitHub OAuth

```
Usuario                Seju                 GitHub
   │                    │                     │
   │─── clica GitHub ──▶│                     │
   │                    │─── redireciona ────▶│
   │◀── tela GitHub ────│                     │
   │─── autoriza ──────▶│                     │
   │                    │◀─── codigo ─────────│
   │                    │─── troca token ────▶│
   │                    │◀─── token ──────────│
   │                    │─── busca usuario ──▶│
   │                    │◀─── dados ──────────│
   │◀─── sessao JWT ────│                     │
```

Em ambos os casos, a sessao e assinada com `SESSION_SECRET` e guardada no `localStorage` do navegador. O token tem validade de 7 dias.

---

## Fluxo de dados

```
Usuario edita algo
       │
       ▼
app.js envia POST /data?file=alunos
       │
       ▼
data.js verifica sessao e permissoes
       │
       ▼
data.js chama API do GitHub
       │
       ▼
GitHub grava o arquivo JSON
       │
       ▼
data.js responde com sucesso
       │
       ▼
app.js atualiza o cache local
       │
       ▼
app.js redesenha a tela
```

---

## Funcionamento offline

O Service Worker (`sw.js`) guarda em cache:

- Todos os arquivos estaticos (HTML, CSS, JS, icones)
- A ultima copia dos dados de cada usuario

Quando o dispositivo esta offline:

- A aplicacao continua abrindo
- As listas mostram os dados do ultimo cache
- Um aviso aparece no topo: "Modo offline"
- Escritas falham temporariamente

Quando o dispositivo volta a ficar online:

- O Seju sincroniza automaticamente
- Um toast aparece: "Reconectado"

Tambem e possivel forcar a sincronizacao pelo botao **Atualizar** na sidebar ou na tela de rotas.

---

## Estrutura de arquivos

```
seju/
├── index.html              interface principal
├── styles.css              estilos
├── app.js                  logica da aplicacao
├── sw.js                   Service Worker
├── manifest.webmanifest    manifesto PWA
├── netlify.toml            configuracao da Netlify
├── package.json            dependencias
├── README.md               documentacao principal
├── LICENSE.md              licenca de uso
├── TERMOS.md               termos de uso
├── PRIVACIDADE.md          politica de privacidade
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── favicon.ico
├── images/
│   ├── logo-tema-claro.webp
│   └── logo-tema-escuro.webp
├── docs/
│   ├── INSTALACAO.md
│   ├── CHAVES.md
│   ├── VARIAVEIS.md
│   ├── ARQUITETURA.md
│   └── FAQ.md
├── netlify/
│   └── functions/
│       ├── auth.js         autenticacao e usuarios
│       └── data.js         leitura e escrita de dados
└── data/                   copia local dos arquivos vazios
```

---

## Seguranca

- Todas as requisicoes passam por autenticacao JWT
- As funcoes serverless verificam permissoes por perfil antes de qualquer acao
- Senhas sao armazenadas como hash `scrypt`, nunca em texto aberto
- O token pessoal do GitHub nunca chega ao navegador
- Todas as comunicacoes usam HTTPS
- Nenhuma informacao e enviada ao autor do software

---

## Tecnologias

- **Linguagens:** HTML, CSS, JavaScript moderno
- **Hospedagem:** Netlify (estatico + funcoes serverless)
- **Banco de dados:** arquivos JSON versionados em repositorio GitHub
- **Autenticacao:** JWT assinado, com opcao de OAuth do GitHub
- **Offline:** Service Worker com estrategia cache-first
- **Tipografia:** Inter e JetBrains Mono via Google Fonts