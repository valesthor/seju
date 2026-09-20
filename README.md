<div align="center">

<picture>
  <img alt="Seju" src="/images/logo-tema-claro.webp" width="280">
</picture>

<br>
<br>

**Sistema de gestão para unidades de Atendimento Educacional Especializado**

</div>

---

## Sobre

O **Seju** centraliza alunos, funcionários, escolas, turmas, atendimentos, pausas, filas de espera e rotas em uma aplicação web progressiva que funciona online e offline. Foi pensado para uso interno em unidades públicas municipais de Atendimento Educacional Especializado.

Todos os dados ficam em um repositório GitHub privado do próprio usuário. Nada passa por servidores do desenvolvedor.

<br>

<div align="center">

<table>
<tr>
<td width="50%" valign="top" align="left">

### Operação

- Cadastro de alunos, funcionários, escolas e turmas
- Atendimentos fixos semanais
- Rotas geradas automaticamente
- Deduplicação por período
- Pausas de profissional e aluno
- Fila de espera automática
- Arquivamento com restauração

</td>
<td width="50%" valign="top" align="left">

### Gestão

- Painel com estatísticas clicáveis
- Filtros combináveis em todas as listas
- Perfis de acesso por função
- Exportação e importação completas
- Sincronização manual
- Funciona offline
- Instalável como aplicativo

</td>
</tr>
</table>

</div>

---

## Como funciona

```
┌──────────────────────────────────────┐
│           DISPOSITIVO                │
│                                      │
│   PWA · funciona offline             │
│   Service Worker · cache local       │
└──────────────────────────────────────┘
                 │
                 │ HTTPS
                 ▼
┌──────────────────────────────────────┐
│             NETLIFY                  │
│                                      │
│   Hospedagem estática                │
│   Funções serverless                 │
│   Variáveis de ambiente              │
└──────────────────────────────────────┘
                 │
                 │ API do GitHub
                 ▼
┌──────────────────────────────────────┐
│         GITHUB PRIVADO               │
│                                      │
│   Repositório de dados do usuário    │
│   Arquivos JSON versionados          │
└──────────────────────────────────────┘
```

O navegador nunca vê o token pessoal do GitHub. Ele fica guardado nas variáveis de ambiente da Netlify e só é usado pelas funções serverless.

---

## Início rápido

Para instalar e hospedar em conta própria, siga o guia passo a passo:

<table>
<tr>
<td width="33%" valign="top">

### 1. Instalar

[Guia completo](docs/INSTALACAO.md)

Do zero até funcionando em 30 a 40 minutos.

</td>
<td width="33%" valign="top">

### 2. Configurar

[Variáveis de ambiente](docs/VARIAVEIS.md)

Tabela completa do que cada chave faz.

</td>
<td width="33%" valign="top">

### 3. Manter

[Renovar chaves](docs/CHAVES.md)

Como lidar com expiração de tokens.

</td>
</tr>
</table>

Se algo der errado, consulte as [perguntas frequentes](docs/FAQ.md).

---

## Documentação

<table>
<tr><td width="40%"><a href="docs/INSTALACAO.md"><strong>Instalação</strong></a></td><td>Como replicar em conta própria do zero</td></tr>
<tr><td><a href="docs/CHAVES.md"><strong>Chaves</strong></a></td><td>O que é cada chave, como criar e renovar</td></tr>
<tr><td><a href="docs/VARIAVEIS.md"><strong>Variáveis de ambiente</strong></a></td><td>Tabela completa com todas as variáveis</td></tr>
<tr><td><a href="docs/ARQUITETURA.md"><strong>Arquitetura</strong></a></td><td>Como o sistema é estruturado por dentro</td></tr>
<tr><td><a href="docs/FAQ.md"><strong>Perguntas frequentes</strong></a></td><td>Dúvidas comuns e soluções</td></tr>
</table>

---

## Perfis de acesso

<table>
<tr><th align="left">Perfil</th><th align="left">O que pode fazer</th></tr>
<tr><td><strong>Administração da Unidade</strong></td><td>Acesso completo, incluindo edição e exclusão</td></tr>
<tr><td><strong>Supervisor</strong></td><td>Visualiza tudo, sem editar</td></tr>
<tr><td><strong>Equipe Multidisciplinar</strong></td><td>Vê apenas seus próprios atendimentos e alunos vinculados</td></tr>
<tr><td><strong>Assistente Social</strong></td><td>Visualiza tudo, exceto Funcionários</td></tr>
<tr><td><strong>Motoristas e Auxiliares</strong></td><td>Vê apenas rotas</td></tr>
</table>

---

## Tecnologia

<table>
<tr>
<td width="50%" valign="top">

**Frontend**
- HTML, CSS e JavaScript moderno
- Sem framework, sem dependências pesadas
- PWA com Service Worker
- Instalável em Android e iOS

</td>
<td width="50%" valign="top">

**Backend**
- Funções serverless da Netlify
- Autenticação JWT assinada
- OAuth opcional via GitHub
- Armazenamento em JSON versionado

</td>
</tr>
</table>

---

## Segurança

- Todas as requisições passam por autenticação
- Senhas armazenadas como hash `scrypt`, nunca em texto aberto
- Sessões assinadas com chave própria do usuário
- Token do GitHub nunca chega ao navegador
- Todas as comunicações via HTTPS
- Nenhuma telemetria, nenhum rastreamento

---

## Licença e termos

Este software é cedido em caráter **temporário e revogável**. Leia antes de usar:

<table>
<tr><td width="33%" valign="top" align="center">

[**Licença de uso**](LICENSE.md)

</td><td width="33%" valign="top" align="center">

[**Termos de uso**](TERMOS.md)

</td><td width="33%" valign="top" align="center">

[**Política de privacidade**](PRIVACIDADE.md)

</td></tr>
</table>

Ao instalar, hospedar ou utilizar o Seju, você concorda integralmente com esses documentos.

---

<div align="center">

<sub>Feito para unidades de AEE que precisam de organização sem custo de manutenção.</sub>

</div>