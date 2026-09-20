<div align="center">

<picture>
  <img alt="Seju" src="/images/logo-tema-claro.webp" width="280">
</picture>

<br>

# Perguntas frequentes

</div>

---

<details>
<summary><strong>Preciso saber programar para usar o Seju?</strong></summary>

Para usar no dia a dia, não. Para instalar pela primeira vez, é preciso seguir o [guia de instalação](INSTALACAO.md) passo a passo. Não exige conhecimento de programação, apenas paciência com os passos.

</details>

<details>
<summary><strong>Onde ficam os dados dos alunos?</strong></summary>

Exclusivamente em um repositório GitHub **privado de sua propriedade**, no formato de arquivos JSON versionados. O autor do Seju não tem acesso a nada.

</details>

<details>
<summary><strong>Quanto custa manter?</strong></summary>

Zero. GitHub e Netlify oferecem planos gratuitos suficientes para o uso típico de uma unidade de AEE.

</details>

<details>
<summary><strong>O que acontece se eu perder minha conta do GitHub?</strong></summary>

Você perde acesso aos dados. Por isso é importante fazer exportações periódicas pela função **Exportar tudo** em Configurações, e guardar o arquivo em local seguro.

</details>

<details>
<summary><strong>Meu token do GitHub expirou. O que faço?</strong></summary>

Gere um novo token conforme descrito em [CHAVES.md](CHAVES.md) e substitua o valor da variável `GITHUB_TOKEN` na Netlify. Depois force um novo deploy.

</details>

<details>
<summary><strong>Posso usar o Seju em mais de um dispositivo ao mesmo tempo?</strong></summary>

Sim. Cada dispositivo mantém sua própria sessão. Alterações feitas em um dispositivo aparecem nos outros após o próximo carregamento ou sincronização.

</details>

<details>
<summary><strong>Como faço backup dos dados?</strong></summary>

Em **Configurações** → **Exportar tudo**. O arquivo baixado contém todos os dados. Guarde-o em local seguro. Recomendamos exportar semanalmente.

</details>

<details>
<summary><strong>Esqueci a senha. Como recupero?</strong></summary>

Não há recuperação automática. Você precisa entrar via GitHub (se tiver configurado) e redefinir a senha em Configurações. Se não tiver GitHub configurado, é necessário editar o `users.json` diretamente no repositório de dados.

</details>

<details>
<summary><strong>Posso mudar as cores e o logo?</strong></summary>

Sim. As cores ficam nas variáveis CSS no topo do `styles.css`. Os ícones ficam na pasta `icons/`. Substitua os arquivos e faça commit.

</details>

<details>
<summary><strong>O Seju funciona sem internet?</strong></summary>

Após o primeiro acesso, sim. A aplicação abre, mostra os dados em cache e continua funcionando para consulta. Alterações feitas offline são perdidas se não sincronizadas.

</details>

<details>
<summary><strong>Posso apagar todos os dados de uma vez?</strong></summary>

Sim, em **Configurações** → **Limpar todos os dados**. A ação exige duas confirmações e a digitação da palavra `APAGAR`. Exporte antes se quiser manter backup.

</details>

<details>
<summary><strong>Como faço para desinstalar completamente?</strong></summary>

1. Delete o site na Netlify
2. Delete o repositório `seju` no GitHub
3. Delete o repositório `seju-data` no GitHub
4. Delete o OAuth App em github.com/settings/developers
5. Delete o token em github.com/settings/tokens

</details>

<details>
<summary><strong>Encontrei um problema. Onde reporto?</strong></summary>

Abra uma issue no repositório do projeto no GitHub. Descreva o problema, o que tentou fazer e o que aconteceu.

</details>

<details>
<summary><strong>Posso vender o Seju ou oferecer como serviço?</strong></summary>

Não sem autorização expressa. Leia a [licença](../LICENSE.md) para os detalhes.

</details>