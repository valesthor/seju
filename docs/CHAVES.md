<div align="center">

<picture>
  <img alt="Seju" src="/images/logo-tema-claro.webp" width="280">
</picture>

<br>

# Gerenciamento de chaves

O Seju usa quatro valores sensíveis. Todos eles ficam guardados como variáveis de ambiente na Netlify, nunca no código.

Este documento explica o que é cada um, para que serve, quando expira e como renovar.

</div>

---

## 1. `GITHUB_TOKEN`

**O que é:** um token de acesso pessoal do GitHub, de escopo restrito.

**Para que serve:** permite que o Seju leia e grave arquivos no repositório de dados em nome da aplicação.

**Onde criar:** [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)

**Configuração correta:**

- Tipo: **Fine-grained token**
- Acesso: apenas ao repositório `seju-data`
- Permissão: **Contents** = Read and write

**Quando expira:** você define na criação. Recomendamos **1 ano**.

**O que acontece quando expira:** o Seju para de conseguir ler e gravar dados. Os usuários veem erro de leitura. A aplicação continua abrindo, mas mostra estado offline com dados em cache.

**Como renovar:**

1. Acesse [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
2. Gere um token novo com as mesmas configurações do anterior
3. Copie o novo valor
4. Na Netlify, vá em **Site settings** → **Environment variables**
5. Edite `GITHUB_TOKEN` e cole o novo valor
6. Vá em **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

Nada mais precisa ser alterado. Os dados do repositório continuam intactos.

---

## 2. `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`

**O que são:** as credenciais do aplicativo OAuth do GitHub.

**Para que servem:** permitem que administradores entrem usando a conta do GitHub, sem precisar digitar senha do Seju.

**Onde criar:** [github.com/settings/developers](https://github.com/settings/developers) → OAuth Apps → New OAuth App

**Configuração correta:**

- Homepage URL: `https://seu-endereco.netlify.app`
- Authorization callback URL: `https://seu-endereco.netlify.app/.netlify/functions/auth`

**Quando expiram:** o Client ID **nunca expira**. O Client Secret pode ser regenerado a qualquer momento, invalidando o anterior.

**Como renovar o Client Secret:**

1. Acesse a página da OAuth App
2. Clique em **Generate a new client secret**
3. Copie o novo valor
4. Na Netlify, atualize `GITHUB_CLIENT_SECRET`
5. Faça um novo deploy

**Como renovar o Client ID:** é necessário criar uma nova OAuth App. O ID só muda se você criar um app novo.

---

## 3. `SESSION_SECRET`

**O que é:** uma string aleatória longa usada para assinar os tokens de sessão dos usuários.

**Para que serve:** garante que os tokens de sessão não possam ser forjados por terceiros. Se alguém tentar criar um token falso, a assinatura não confere e o acesso é negado.

**Onde criar:** qualquer gerador de senha aleatória. Recomendamos usar o próprio navegador ou o site [bitwarden.com/password-generator](https://bitwarden.com/password-generator/).

**Configuração correta:**

- Mínimo de 32 caracteres
- Misturando maiúsculas, minúsculas, números e símbolos
- Sem espaços
- Exemplo: `Mf9284Qp8Ln4Vr3TzWS7B01NhYs1D02A`

**Quando expira:** nunca, tecnicamente. Mas se você trocar, todos os usuários serão desconectados.

**Como trocar (invalida todas as sessões):**

1. Gere um novo valor
2. Atualize `SESSION_SECRET` na Netlify
3. Faça um novo deploy
4. Todos os usuários precisarão entrar novamente

Só troque se suspeitar que o valor vazou.

---

## 4. Resumo

| Variável | Onde criar | Expira | Frequência de renovação |
|---|---|---|---|
| `GITHUB_TOKEN` | Settings → Developer settings → Tokens | Sim, você define | Anual |
| `GITHUB_CLIENT_ID` | Settings → Developer settings → OAuth Apps | Não | Nunca |
| `GITHUB_CLIENT_SECRET` | Settings → Developer settings → OAuth Apps | Só se regenerar | Sob demanda |
| `SESSION_SECRET` | Gerador de senha | Não | Sob demanda |

---

## Boas práticas

1. **Anote as datas de expiração.** Coloque um lembrete no calendário trinta dias antes do `GITHUB_TOKEN` vencer.
2. **Guarde os valores em lugar seguro.** Use um gerenciador de senhas como Bitwarden ou 1Password.
3. **Nunca cole chaves em código, commits, prints ou mensagens.** Todas devem ficar apenas nas variáveis de ambiente da Netlify.
4. **Troque as chaves imediatamente** se suspeitar de vazamento.
5. **Use tokens com escopo mínimo.** O `GITHUB_TOKEN` só precisa de acesso ao `seju-data`.
6. **Ative 2FA na conta do GitHub.** Isso protege o acesso mesmo se a senha vazar.