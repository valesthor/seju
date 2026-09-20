<div align="center">

<picture>
  <img alt="Seju" src="/images/logo-tema-claro.webp" width="280">
</picture>

<br>

# Variáveis de ambiente

O Seju precisa de sete variáveis de ambiente configuradas na Netlify. Elas guardam os segredos da aplicação e nunca aparecem no código do repositório.

Configuração: **Site settings** → **Environment variables** → **Add a variable**.

</div>

---

## Tabela completa

| Nome | Obrigatória | Descrição | Exemplo |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | Sim | Client ID do aplicativo OAuth do GitHub | `Ov23liABC123...` |
| `GITHUB_CLIENT_SECRET` | Sim | Client Secret do mesmo aplicativo OAuth | `a1b2c3d4e5f6...` |
| `GITHUB_REPO` | Sim | Repositório de dados no formato `usuario/repo` | `maria/seju-data` |
| `GITHUB_TOKEN` | Sim | Token de acesso pessoal com permissão de leitura e escrita | `github_pat_11ABC...` |
| `GITHUB_BRANCH` | Sim | Nome da branch principal do repositório de dados | `main` |
| `SESSION_SECRET` | Sim | String aleatória longa para assinar sessões | `Kf9x2mQp8Ln4Vr6Tz...` |
| `NODE_VERSION` | Não | Versão do Node usada pela Netlify | `20` |

---

## Detalhamento

### `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`

Identificam o aplicativo OAuth usado para login via GitHub. O ID é público, o Secret é privado.

**Como obter:** [github.com/settings/developers](https://github.com/settings/developers) → OAuth Apps → Seju.

---

### `GITHUB_REPO`

Aponta para o repositório privado onde os dados são guardados.

**Formato:** `usuario/repositorio` — sem `https://`, sem `.git`, sem barra no final.

**Exemplo correto:** `maria.silva/seju-data`
**Exemplo incorreto:** `https://github.com/maria.silva/seju-data.git`

---

### `GITHUB_TOKEN`

Token de acesso pessoal com escopo restrito ao repositório de dados.

**Como criar:** [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)

**Configuração:** fine-grained, apenas `seju-data`, permissão **Contents: Read and write**.

Detalhes sobre renovação em [CHAVES.md](CHAVES.md).

---

### `GITHUB_BRANCH`

Nome da branch principal do repositório de dados.

**Valor padrão:** `main`.

Só mude se você renomeou a branch principal do `seju-data` para outra coisa.

---

### `SESSION_SECRET`

Chave usada para assinar os tokens JWT de sessão.

**Regras:**

- Mínimo de 32 caracteres
- Mistura de maiúsculas, minúsculas, números e símbolos
- Sem espaços em branco

**Como gerar:** qualquer gerador de senha aleatória.

**Atenção:** se você trocar este valor, todos os usuários logados serão desconectados e precisarão entrar novamente.

---

### `NODE_VERSION`

Define qual versão do Node.js a Netlify usa para executar as funções serverless.

**Valor recomendado:** `20`.

Se não for definida, a Netlify usa uma versão padrão que pode mudar com o tempo. Definir explicitamente evita surpresas.

---

## Como configurar

1. Na Netlify, abra seu site
2. Vá em **Site settings** → **Environment variables**
3. Clique em **Add a variable** para cada uma
4. Após adicionar todas, vá em **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

---

## Verificação

Para confirmar que tudo está configurado corretamente:

1. Abra o endereço do site
2. Se a tela de login aparecer, as variáveis básicas estão funcionando
3. Faça login com GitHub
4. Se entrar, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` e `SESSION_SECRET` estão corretos
5. Cadastre um aluno de teste
6. Se salvar, `GITHUB_TOKEN`, `GITHUB_REPO` e `GITHUB_BRANCH` estão corretos