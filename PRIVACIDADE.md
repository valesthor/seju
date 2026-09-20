<div align="center">

<picture>
  <img alt="Seju" src="/images/logo-tema-claro.webp" width="280">
</picture>

<br>

# Política de Privacidade

**Última atualização: na data de publicação**

</div>

---

## Resumo em uma frase

O autor do Seju **não coleta, não armazena e não tem acesso a nenhuma informação** cadastrada na sua instalação.

---

## 1. Onde os dados ficam

Todos os dados cadastrados no Seju ficam em dois lugares, ambos sob seu controle:

1. **Repositório GitHub privado** de sua propriedade, no formato de arquivos JSON versionados
2. **Armazenamento local do navegador** de cada dispositivo que acessa o sistema

Nada trafega para servidores do autor. O autor não mantém banco de dados, servidor de aplicação, log de uso ou qualquer mecanismo de telemetria.

---

## 2. Dados de autenticação

O sistema oferece dois modos de autenticação:

**Usuário e senha**

- As senhas são armazenadas em formato de hash seguro (scrypt) no arquivo `users.json` do seu repositório
- A senha em texto aberto nunca é armazenada
- A sessão é assinada com uma chave própria definida por você nas variáveis de ambiente

**GitHub OAuth**

- Você autoriza o acesso do Seju à sua conta do GitHub
- O Seju obtém apenas o nome de usuário público do GitHub para identificar a sessão
- Nenhum outro dado da sua conta é acessado

---

## 3. Dados de uso

O autor **não registra**:

- Quem acessa o sistema
- Quando acessa
- Quais telas visita
- Quais ações executa
- Endereço IP, navegador ou dispositivo

---

## 4. Dados sensíveis

O Seju é projetado para armazenar informações de crianças atípicas e profissionais de unidades públicas. Esses dados são **sensíveis** segundo a LGPD.

Recomendações:

- Mantenha o repositório de dados sempre **privado**
- Restrinja o acesso às contas do GitHub e da Netlify
- Não compartilhe credenciais
- Utilize senhas fortes no GitHub, Netlify e dispositivos
- Ative autenticação em dois fatores em todas as contas envolvidas
- Faça exportações periódicas dos dados como backup

A **responsabilidade pela conformidade com a LGPD é integralmente do usuário** que hospeda a aplicação.

---

## 5. Cookies e armazenamento local

O Seju utiliza `localStorage` do navegador para:

- Guardar o token de sessão do usuário logado
- Guardar uma cópia em cache dos dados para funcionamento offline
- Guardar a preferência de tema (claro ou escuro)
- Guardar o estado da barra lateral (expandida ou recolhida)

Nenhum cookie de rastreamento é utilizado.

---

## 6. Serviços de terceiros

O Seju utiliza:

- **GitHub** como armazenamento de dados e, opcionalmente, autenticação
- **Netlify** como plataforma de hospedagem
- **Google Fonts** para carregar a tipografia
- **Google Maps** apenas quando o usuário clica no botão de mapa (abre em nova aba)

Cada um desses serviços possui política de privacidade própria. O autor do Seju não controla nem se responsabiliza por esses serviços.

---

## 7. Direitos do titular dos dados

Como os dados ficam sob controle do usuário que hospeda a aplicação, os direitos previstos na LGPD (acesso, correção, exclusão, portabilidade) são exercidos diretamente por meio da própria interface do Seju:

- Acesso: pelas telas de listagem e detalhes
- Correção: pela edição dos registros
- Exclusão: pela função de exclusão ou limpeza total
- Portabilidade: pela função de exportação completa

---

## 8. Alterações

Esta política pode ser atualizada. A versão vigente sempre estará neste repositório.

---

## 9. Contato

Para questões relacionadas a esta política, abra uma issue no repositório do projeto.

---

<div align="center">
<sub>Você tem controle total sobre seus dados. O autor do Seju não.</sub>
</div>