import jwt from 'jsonwebtoken';

const REPO = process.env.GITHUB_REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const SECRET = process.env.SESSION_SECRET;
const API = 'https://api.github.com';

const FILES = ['alunos', 'funcionarios', 'escolas', 'turmas', 'atendimentos', 'pausas', 'config'];
const ADMIN_ONLY_READ = []; // nada além de users, tratado separado

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function getToken(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function session(event) {
  try { return jwt.verify(getToken(event), SECRET); } catch { return null; }
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
  if (res.status === 404) return { data: null, sha: null };
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

export const handler = async (event) => {
  try {
    const s = session(event);
    if (!s) return json(401, { error: 'Não autenticado.' });

    const action = (event.queryStringParameters?.action || '').toLowerCase();
    const file = (event.queryStringParameters?.file || '').toLowerCase();

    if (action === 'export') {
      const out = {};
      for (const f of FILES) {
        const { data } = await ghRead(`data/${f}.json`);
        out[f] = data;
      }
      if (s.role === 'admin') {
        const { data } = await ghRead('data/users.json');
        out.users = data;
      }
      return json(200, { exportedAt: new Date().toISOString(), data: out });
    }

    if (action === 'import' && event.httpMethod === 'POST') {
      if (s.role !== 'admin') return json(403, { error: 'Apenas administradores.' });
      const body = JSON.parse(event.body || '{}');
      const payload = body.data || {};
      const written = [];
      for (const f of FILES) {
        if (payload[f] === undefined) continue;
        await ghWrite(`data/${f}.json`, payload[f], `seju: importar ${f}`);
        written.push(f);
      }
      return json(200, { ok: true, written });
    }

    if (action === 'reset' && event.httpMethod === 'POST') {
      if (s.role !== 'admin') return json(403, { error: 'Apenas administradores.' });
      for (const f of FILES) {
        const seed = f === 'config'
          ? { antecedenciaMinutos: 20, updatedAt: new Date().toISOString() }
          : { [f]: [] };
        await ghWrite(`data/${f}.json`, seed, `seju: resetar ${f}`);
      }
      return json(200, { ok: true });
    }

    if (!FILES.includes(file)) return json(400, { error: 'Arquivo inválido.' });
    const path = `data/${file}.json`;

    if (event.httpMethod === 'GET') {
      const { data } = await ghRead(path);
      if (data === null) {
        const seed = file === 'config' ? { antecedenciaMinutos: 20, updatedAt: new Date().toISOString() } : { [file]: [] };
        return json(200, seed);
      }
      return json(200, data);
    }

    if (event.httpMethod === 'POST') {
      if (s.role !== 'admin') return json(403, { error: 'Apenas administradores podem alterar dados.' });
      const body = JSON.parse(event.body || '{}');
      if (body.content === undefined) return json(400, { error: 'Conteúdo ausente.' });
      await ghWrite(path, body.content, `seju: atualizar ${file}`);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Método não permitido.' });
  } catch (err) {
    return json(500, { error: 'Erro interno.', detail: String(err.message || err) });
  }
};