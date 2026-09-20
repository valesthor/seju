import jwt from 'jsonwebtoken';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const REPO = process.env.GITHUB_REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const SECRET = process.env.SESSION_SECRET;
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const API = 'https://api.github.com';

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

async function ghRead(path) {
  const url = `${API}/repos/${REPO}/contents/${path}?ref=${BRANCH}&t=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`github read ${path} ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  const content = Buffer.from(j.content, 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: j.sha };
}

async function ghWrite(path, obj, message) {
  const cur = await ghRead(path).catch(() => null);
  const body = {
    message,
    content: Buffer.from(JSON.stringify(obj, null, 2)).toString('base64'),
    branch: BRANCH
  };
  if (cur?.sha) body.sha = cur.sha;
  const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`github write ${path} ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [algo, salt, hash] = String(stored).split(':');
    if (algo !== 'scrypt') return false;
    const computed = scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  } catch { return false; }
}

function signSession(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function verifySession(token) {
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

function getToken(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function publicUser(u) {
  return { username: u.username, nome: u.nome, role: u.role, ativo: u.ativo !== false, githubLogin: u.githubLogin || null, funcionarioId: u.funcionarioId || null, criadoEm: u.criadoEm || null };
}

export const handler = async (event) => {
  try {
    const action = (event.queryStringParameters?.action || '').toLowerCase();
    const method = event.httpMethod;

    if (action === 'github') {
      const host = event.headers.host;
      const proto = event.headers['x-forwarded-proto'] || 'https';
      const redirect = `${proto}://${host}/.netlify/functions/auth`;
      const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect)}&scope=read:user&allow_signup=false`;
      return { statusCode: 302, headers: { Location: url }, body: '' };
    }

    if (event.queryStringParameters?.code) {
      const code = event.queryStringParameters.code;
      const host = event.headers.host;
      const proto = event.headers['x-forwarded-proto'] || 'https';
      if (!code) return { statusCode: 302, headers: { Location: `${proto}://${host}/?login_error=cancelado` }, body: '' };

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return { statusCode: 302, headers: { Location: `${proto}://${host}/?login_error=oauth_falhou` }, body: '' };
      }
      const userRes = await fetch(`${API}/user`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json' }
      });
      const ghUser = await userRes.json();
      const login = (ghUser.login || '').toLowerCase();

      const { data: usersDoc } = await ghRead('data/users.json');
      const found = (usersDoc.users || []).find(u =>
        (u.githubLogin || '').toLowerCase() === login && u.ativo !== false
      );
      if (!found) {
        return { statusCode: 302, headers: { Location: `${proto}://${host}/?login_error=nao_autorizado` }, body: '' };
      }
      const jwtToken = signSession({ username: found.username, nome: found.nome, role: found.role, funcionarioId: found.funcionarioId || null });
      return {
        statusCode: 302,
        headers: { Location: `${proto}://${host}/?token=${encodeURIComponent(jwtToken)}` },
        body: ''
      };
    }

    if (action === 'login' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!username || !password) return json(400, { error: 'Informe usuário e senha.' });

      const { data: usersDoc } = await ghRead('data/users.json');
      const found = (usersDoc.users || []).find(u => (u.username || '').toLowerCase() === username);
      if (!found || found.ativo === false) return json(401, { error: 'Usuário ou senha incorretos.' });
      if (!found.passwordHash || !verifyPassword(password, found.passwordHash)) {
        return json(401, { error: 'Usuário ou senha incorretos.' });
      }
      const jwtToken = signSession({ username: found.username, nome: found.nome, role: found.role, funcionarioId: found.funcionarioId || null });
      return json(200, { token: jwtToken, user: publicUser(found) });
    }

    if (action === 'me') {
      const session = verifySession(getToken(event));
      if (!session) return json(401, { error: 'Sessão inválida ou expirada.' });
      return json(200, { user: { username: session.username, nome: session.nome, role: session.role, funcionarioId: session.funcionarioId || null } });
    }

    if (action === 'logout') {
      return json(200, { ok: true });
    }

    // -------- gestão de usuários --------
    const session = verifySession(getToken(event));
    if (!session) return json(401, { error: 'Não autenticado.' });

    if (action === 'change-password' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const newPassword = String(body.newPassword || '');
      if (newPassword.length < 8) return json(400, { error: 'A senha precisa ter no mínimo 8 caracteres.' });
      const { data: usersDoc, sha } = await ghRead('data/users.json');
      const idx = (usersDoc.users || []).findIndex(u => u.username === session.username);
      if (idx < 0) return json(404, { error: 'Usuário não encontrado.' });
      usersDoc.users[idx].passwordHash = hashPassword(newPassword);
      await ghWrite('data/users.json', usersDoc, `seju: alterar senha de ${session.username}`);
      return json(200, { ok: true });
    }

    if (session.role !== 'admin') return json(403, { error: 'Apenas administradores.' });

    if (action === 'users-list' && method === 'GET') {
      const { data: usersDoc } = await ghRead('data/users.json');
      return json(200, { users: (usersDoc.users || []).map(publicUser) });
    }

    if (action === 'users-save' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const username = String(body.username || '').trim().toLowerCase();
      const nome = String(body.nome || '').trim();
      const role = String(body.role || '').trim();
      const ativo = body.ativo !== false;
      const password = body.password ? String(body.password) : '';
      const githubLogin = body.githubLogin ? String(body.githubLogin).trim().toLowerCase() : null;
      const funcionarioId = body.funcionarioId ? String(body.funcionarioId).trim() : null;

      if (!username || !nome) return json(400, { error: 'Usuário e nome são obrigatórios.' });
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) return json(400, { error: 'Usuário deve ter 3 a 32 caracteres (letras, números, ponto, hífen, underline).' });
      const roles = ['admin', 'supervisor', 'equipe', 'assistente', 'motorista'];
      if (!roles.includes(role)) return json(400, { error: 'Perfil inválido.' });

      const { data: usersDoc } = await ghRead('data/users.json');
      const users = usersDoc.users || [];
      const idx = users.findIndex(u => u.username === username);
      const isNew = idx < 0;

      if (isNew && password.length < 8) return json(400, { error: 'Senha inicial obrigatória (mínimo 8 caracteres).' });
      if (password && password.length < 8) return json(400, { error: 'Senha deve ter no mínimo 8 caracteres.' });

      const base = isNew
        ? { username, nome, role, ativo, criadoEm: new Date().toISOString() }
        : { ...users[idx], nome, role, ativo };
      if (githubLogin !== undefined) base.githubLogin = githubLogin || null;
      base.funcionarioId = funcionarioId || null;
      if (password) base.passwordHash = hashPassword(password);

      if (isNew) users.push(base);
      else users[idx] = base;

      await ghWrite('data/users.json', { users }, `seju: salvar usuário ${username}`);
      return json(200, { ok: true, user: publicUser(base) });
    }

    if (action === 'users-delete' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const username = String(body.username || '').trim().toLowerCase();
      if (username === session.username) return json(400, { error: 'Você não pode excluir a si mesmo.' });
      const { data: usersDoc } = await ghRead('data/users.json');
      const filtered = (usersDoc.users || []).filter(u => u.username !== username);
      await ghWrite('data/users.json', { users: filtered }, `seju: excluir usuário ${username}`);
      return json(200, { ok: true });
    }

    return json(404, { error: 'Ação desconhecida.' });
  } catch (err) {
    return json(500, { error: 'Erro interno.', detail: String(err.message || err) });
  }
};