<div align="center">

<picture>
  <img alt="Seju" src="/images/logo-tema-claro.webp" width="280">
</picture>

<br>

# Guia de instalação

Este guia leva você do zero até o Seju funcionando em conta própria. Foi escrito para quem nunca mexeu com GitHub ou Netlify. Cada passo é explicado com o que fazer e por que fazer.

**Tempo estimado:** 30 a 40 minutos.

</div>

---

## Antes de começar

Você vai precisar de:

- Uma conta no **GitHub** (gratuita) — [criar conta](https://github.com/signup)
- Uma conta na **Netlify** (gratuita) — [criar conta](https://app.netlify.com/signup)
- Acesso a um computador com navegador
- Opcional: sua logo ou ícone em PNG, 192x192 e 512x512

Não é preciso instalar nada no computador. Tudo é feito pelo navegador.

---

## Visão geral

Ao final, você terá:

1. Um repositório **seju** com o código do sistema
2. Um repositório **seju-data** privado com os dados
3. Uma aplicação **Seju** hospedada na Netlify
4. Um usuário administrador configurado
5. Capacidade de criar outros usuários pela interface

---

## Passo 1: Criar o repositório de dados

Este repositório guarda os dados dos alunos, funcionários e demais cadastros. Ele **precisa ser privado**.

1. Acesse [github.com/new](https://github.com/new)
2. Em **Repository name**, digite `seju-data`
3. Marque **Private**
4. Não marque "Add a README file"
5. Clique em **Create repository**

Agora crie a pasta de dados e os arquivos vazios:

1. Na página do repositório, clique em **Add file** → **Create new file**
2. No nome do arquivo, digite `data/` (o GitHub vai entender que é uma pasta)
3. Digite o nome do arquivo: `users.json`
4. No conteúdo, cole exatamente:

   ```json
   { "users": [] }
   ```

5. Clique em **Commit changes** (pode usar a mensagem padrão)

Repita o processo para criar mais sete arquivos, todos dentro da pasta `data`:

| Nome do arquivo | Conteúdo |
|---|---|
| `alunos.json` | `{ "alunos": [] }` |
| `funcionarios.json` | `{ "funcionarios": [] }` |
| `escolas.json` | `{ "escolas": [] }` |
| `turmas.json` | `{ "turmas": [] }` |
| `atendimentos.json` | `{ "atendimentos": [] }` |
| `pausas.json` | `{ "pausas": [] }` |
| `config.json` | `{ "antecedenciaMinutos": 20, "updatedAt": "2026-01-01T00:00:00.000Z" }` |

Ao final, o repositório `seju-data` deve ter apenas uma pasta `data` com oito arquivos JSON dentro.

---

## Passo 2: Criar o repositório do código

Este repositório guarda o código da aplicação.

1. Acesse [github.com/new](https://github.com/new)
2. Em **Repository name**, digite `seju`
3. Pode ser público ou privado, à sua escolha
4. Clique em **Create repository**

Faça o upload do código. Se você recebeu este projeto por arquivo zip ou pasta, extraia e envie assim:

1. Na página do repositório vazio, clique em **uploading an existing file**
2. Arraste todos os arquivos e pastas do projeto
3. Aguarde o upload
4. Clique em **Commit changes**

Se estiver clonando de um repositório existente, use o botão **Fork** em vez disso.

---

## Passo 3: Criar um token de acesso do GitHub

Este token permite que a Netlify leia e grave no repositório `seju-data` em nome da aplicação.

1. Acesse [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
2. Clique em **Generate new token**
3. Preencha:
   - **Token name:** `seju-netlify`
   - **Expiration:** 1 year (você renova depois)
   - **Repository access:** Only select repositories → escolha `seju-data`
   - **Permissions:** Repository permissions → **Contents** = `Read and write`
4. Clique em **Generate token**
5. **Copie o token agora.** Ele só aparece uma vez.

Guarde esse valor em um lugar seguro. Você vai usá-lo no passo 6.

---

## Passo 4: Criar o aplicativo OAuth do GitHub

Este aplicativo permite que os administradores entrem usando a conta do GitHub.

1. Acesse [github.com/settings/developers](https://github.com/settings/developers)
2. Clique em **OAuth Apps** → **New OAuth App**
3. Preencha:
   - **Application name:** `Seju`
   - **Homepage URL:** `https://seu-site.netlify.app` (você ajusta depois)
   - **Authorization callback URL:** `https://seu-site.netlify.app/.netlify/functions/auth`
4. Clique em **Register application**
5. Copie o **Client ID**
6. Clique em **Generate a new client secret** e copie o valor

Guarde os dois valores. Você vai usá-los no passo 6.

---

## Passo 5: Hospedar na Netlify

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Clique em **Add new site** → **Import an existing project**
3. Escolha **GitHub**
4. Autorize a Netlify a acessar seus repositórios
5. Selecione o repositório `seju`
6. Configurações de build:
   - **Build command:** deixe em branco
   - **Publish directory:** `.`
7. Clique em **Deploy site**

A Netlify fará o primeiro deploy e mostrará um endereço como `https://algo-aleatorio.netlify.app`.

**Anote este endereço.** Ele será usado em todos os passos seguintes.

Se quiser um nome mais amigável, vá em **Site settings** → **Change site name** e escolha algo como `seju-sua-escola`.

---

## Passo 6: Configurar as variáveis de ambiente

Estas variáveis guardam os segredos da aplicação. Nenhuma delas aparece no código do repositório.

1. Na Netlify, abra seu site
2. Vá em **Site settings** → **Environment variables**
3. Clique em **Add a variable** para cada uma das sete abaixo

| Nome | Valor |
|---|---|
| `GITHUB_CLIENT_ID` | O Client ID que você copiou no passo 4 |
| `GITHUB_CLIENT_SECRET` | O Client Secret que você copiou no passo 4 |
| `GITHUB_REPO` | `seu-usuario/seju-data` |
| `GITHUB_TOKEN` | O token que você copiou no passo 3 |
| `GITHUB_BRANCH` | `main` |
| `SESSION_SECRET` | Uma senha aleatória longa, veja abaixo como gerar |
| `NODE_VERSION` | `20` |

Para gerar a `SESSION_SECRET`, use qualquer gerador de senha aleatória. Deve ter pelo menos 32 caracteres, misturando letras maiúsculas, minúsculas, números e símbolos.

Depois de adicionar todas, vá em **Deploys** e clique em **Trigger deploy** → **Clear cache and deploy site**.

---

## Passo 7: Ajustar o endereço de retorno no GitHub

Agora que você tem o endereço final da Netlify, precisa ajustá-lo no aplicativo OAuth:

1. Acesse [github.com/settings/developers](https://github.com/settings/developers)
2. Clique em **OAuth Apps** → **Seju**
3. Atualize:
   - **Homepage URL:** `https://seu-endereco-final.netlify.app`
   - **Authorization callback URL:** `https://seu-endereco-final.netlify.app/.netlify/functions/auth`
4. Clique em **Update application**

---

## Passo 8: Criar o primeiro administrador

O primeiro usuário precisa ser criado manualmente no arquivo `users.json`.

1. Volte ao repositório `seju-data` no GitHub
2. Abra o arquivo `data/users.json`
3. Clique no ícone de lápis (editar)
4. Substitua todo o conteúdo por este, ajustando seus dados:

   ```json
   {
     "users": [
       {
         "username": "seu-usuario",
         "nome": "Seu Nome Completo",
         "role": "admin",
         "ativo": true,
         "githubLogin": "seu-login-do-github",
         "passwordHash": null,
         "criadoEm": "2026-01-01T00:00:00.000Z"
       }
     ]
   }
   ```

   - `username`: como você vai entrar depois. Exemplo: `admin`
   - `nome`: seu nome completo
   - `role`: mantenha `admin`
   - `githubLogin`: seu nome de usuário do GitHub, em minúsculas, como aparece em `github.com/SEU-USUARIO`

5. Clique em **Commit changes**

Agora acesse `https://seu-endereco.netlify.app` e clique em **Continuar com GitHub**. Autorize. Você entrará como administrador.

Se preferir entrar com usuário e senha desde o começo, deixe o `passwordHash` como `null` e, ao entrar pelo GitHub, vá em **Configurações** → **Minha senha** e defina uma.

---

## Passo 9: Configurar ícones (opcional)

Substitua os arquivos em `icons/` do repositório `seju` por seus próprios:

- `icon-192.png` — ícone de 192x192 pixels
- `icon-512.png` — ícone de 512x512 pixels
- `favicon.ico` — ícone pequeno para a aba do navegador

Após substituir, faça commit. A Netlify refará o deploy automaticamente.

---

## Passo 10: Criar os demais usuários

Entre como administrador. Vá em **Configurações** → **Usuários** → **Novo**. Crie os acessos da sua equipe.

Perfis disponíveis:

| Perfil | O que pode ver |
|---|---|
| Administração da Unidade | Tudo, incluindo edição e exclusão |
| Supervisor | Tudo, apenas visualização |
| Equipe Multidisciplinar | Apenas seus próprios atendimentos e alunos vinculados |
| Assistente Social | Tudo, exceto Funcionários |
| Motoristas e Auxiliares | Apenas rotas |

Cada usuário precisa de:

- **Usuário:** login curto e único. Exemplo: `maria.silva`
- **Nome completo:** o nome que aparecerá no sistema
- **Perfil:** conforme a tabela acima
- **Senha:** mínimo 8 caracteres
- **Funcionário vinculado:** apenas para Equipe Multidisciplinar, para restringir a visualização

---

## Pronto

O Seju está funcionando. Recomendamos:

1. Fazer uma exportação imediata em **Configurações** → **Exportar tudo** e guardar o arquivo em local seguro
2. Estabelecer uma rotina de exportação semanal ou mensal
3. Treinar a equipe sobre o uso básico
4. Anotar em algum lugar o endereço final e a data de expiração do token

---

## Próximos passos

- [Como renovar chaves quando expiram](CHAVES.md)
- [Todas as variáveis de ambiente](VARIAVEIS.md)
- [Perguntas frequentes](FAQ.md)