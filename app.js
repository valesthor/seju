// ============================================================
// Seju - aplicacao principal
// ============================================================

const FN = '/.netlify/functions';

const DIAS = [
  { id: 'seg', cad: 'Seg', exib: 'Segunda-feira' },
  { id: 'ter', cad: 'Ter', exib: 'Terça-feira' },
  { id: 'qua', cad: 'Qua', exib: 'Quarta-feira' },
  { id: 'qui', cad: 'Qui', exib: 'Quinta-feira' },
  { id: 'sex', cad: 'Sex', exib: 'Sexta-feira' },
  { id: 'sab', cad: 'Sáb', exib: 'Sábado' },
  { id: 'dom', cad: 'Dom', exib: 'Domingo' }
];
const DIAS_ID = Object.fromEntries(DIAS.map(d => [d.id, d]));
// Para reativar sábado e domingo nos formulários, use DIAS em vez de DIAS_UTEIS
const DIAS_UTEIS = DIAS.filter(d => d.id !== 'sab' && d.id !== 'dom');
const PERIODOS = [
  { id: 'manha', exib: 'Manhã' },
  { id: 'tarde', exib: 'Tarde' }
];
const PERIODO_ID = Object.fromEntries(PERIODOS.map(p => [p.id, p]));

const ROLES = {
  admin: 'Administração da Unidade',
  supervisor: 'Supervisor',
  equipe: 'Equipe Multidisciplinar',
  assistente: 'Assistente Social',
  motorista: 'Motoristas e Auxiliares de Transporte'
};

const state = {
  token: null,
  user: null,
  data: {
    alunos: [], funcionarios: [], escolas: [], turmas: [],
    atendimentos: [], pausas: [],
    config: { antecedenciaMinutos: 20 }
  },
  route: '',
  online: navigator.onLine,
  syncing: false
};

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now());

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtPhone(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}
function fmtCPF(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function fmtCID(v) {
  return String(v || '').toUpperCase().trim();
}
function fmtDateBR(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}
function hoje() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function nowISO() { return new Date().toISOString(); }
function diffMin(hhmm, min) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (h * 60 + m - Number(min) + 1440) % 1440;
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

function fmtDias(dias) {
  const list = (dias || []).filter(d => DIAS_ID[d]).map(d => DIAS_ID[d]);
  if (!list.length) return '';
  const ordenados = DIAS.filter(d => dias.includes(d.id));
  if (ordenados.length === 1) return ordenados[0].exib;
  const nomes = ordenados.map((d, i) => {
    if (i === ordenados.length - 1) return d.exib;
    return d.exib.replace('-feira', '');
  });
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

function cmpNome(a, b) {
  return String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' });
}

function debounce(fn, ms = 150) {
  let t = null;
  return function (...args) {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn.apply(this, args); }, ms);
  };
}

function alunosDaEscola(escolaId) {
  const esc = escolaPorId(escolaId);
  if (!esc) return [];
  if (Array.isArray(esc.alunoIds)) {
    const s = new Set(esc.alunoIds);
    return alunosAtivos().filter(a => s.has(a.id));
  }
  return alunosAtivos().filter(a => a.escolaId === escolaId);
}

function alunosDaTurma(turmaId) {
  const tur = turmaPorId(turmaId);
  if (!tur) return [];
  if (Array.isArray(tur.alunoIds)) {
    const s = new Set(tur.alunoIds);
    return alunosAtivos().filter(a => s.has(a.id));
  }
  return alunosAtivos().filter(a => a.turmaId === turmaId);
}

function escolasDoAluno(alunoId) {
  const out = [];
  const a = alunoPorId(alunoId);
  for (const e of state.data.escolas) {
    if (Array.isArray(e.alunoIds) && e.alunoIds.includes(alunoId)) { out.push(e); continue; }
    if (a && !Array.isArray(e.alunoIds) && a.escolaId === e.id) out.push(e);
  }
  return out;
}

function turmasDoAluno(alunoId) {
  const out = [];
  const a = alunoPorId(alunoId);
  for (const t of state.data.turmas) {
    if (Array.isArray(t.alunoIds) && t.alunoIds.includes(alunoId)) { out.push(t); continue; }
    if (a && !Array.isArray(t.alunoIds) && a.turmaId === t.id) out.push(t);
  }
  return out;
}

function periodoFuncionario(f) {
  if (!f) return '';
  if (f.periodo) return f.periodo;
  const t = f.turnos || [];
  if (t.includes('manha') && t.includes('tarde')) return 'integral';
  if (t.includes('manha')) return 'manha';
  if (t.includes('tarde')) return 'tarde';
  return '';
}

const PERIODO_LABEL = { manha: 'Manhã', tarde: 'Tarde', integral: 'Integral' };

function cargosUnicos() {
  const set = new Set();
  for (const f of (state.data.funcionarios || [])) {
    if (f && typeof f.cargo === 'string' && f.cargo.trim()) set.add(f.cargo.trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function fmtCarga(v) {
  const s = String(v || '').trim();
  if (/^\d+$/.test(s)) return s + 'h';
  return s;
}

function responsaveisDoAluno(a) {
  if (!a) return [];
  if (Array.isArray(a.responsaveis) && a.responsaveis.length) {
    return a.responsaveis.filter(r => r && (r.nome || r.contato));
  }
  if (a.responsavel) return [{ nome: a.responsavel, contato: a.contato || '' }];
  return [];
}

function fmtHora(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

function horaValida(v) {
  if (!/^\d{2}:\d{2}$/.test(v)) return false;
  const [h, m] = v.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function fmtCEP(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatEndereco(a) {
  if (!a) return '';
  if (!a.logradouro && a.endereco) return a.endereco;

  let s = '';
  if (a.logradouro) s += a.logradouro;
  if (a.numero) s += (s ? ', ' : '') + a.numero;
  if (a.complemento) s += (s ? ' - ' : '') + a.complemento;
  if (a.pontoReferencia) s += (s ? ' - ' : '') + a.pontoReferencia;
  if (a.bairro) s += (s ? ' - ' : '') + a.bairro;
  if (a.cidade) s += (s ? ', ' : '') + a.cidade;
  if (a.estado) s += (s ? ' - ' : '') + a.estado;
  if (a.cep) s += (s ? ', ' : '') + fmtCEP(a.cep);
  if (s) s += ', Brasil';
  return s;
}

function enderecoParaMaps(a) {
  if (!a) return '';
  if (!a.logradouro && a.endereco) return a.endereco;

  let s = '';
  if (a.logradouro) s += a.logradouro;
  if (a.numero) s += (s ? ', ' : '') + a.numero;
  if (a.bairro) s += (s ? ' - ' : '') + a.bairro;
  if (a.cidade) s += (s ? ', ' : '') + a.cidade;
  if (a.estado) s += (s ? ' - ' : '') + a.estado;
  if (a.cep) s += (s ? ', ' : '') + fmtCEP(a.cep);
  if (s) s += ', Brasil';
  return s;
}

function toast(msg, kind = '') {
  const host = $('#toast-host');
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ` toast-${kind}` : '');
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 220);
  }, 3200);
}

let modalCloseTimeout = null;
let modalClickListener = null;

function openModal({ title, bodyHtml, footerHtml = '', onMount }) {
  const host = $('#modal-host');
  if (modalCloseTimeout) { clearTimeout(modalCloseTimeout); modalCloseTimeout = null; }
  host.hidden = false;
  host.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-head">${esc(title)}<button class="icon-btn" data-close style="margin-left:auto" aria-label="Fechar"><svg class="ic"><use href="#i-close"/></svg></button></div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-foot">${footerHtml}</div>` : ''}
    </div>`;
  host.classList.remove('show');
  requestAnimationFrame(() => host.classList.add('show'));

  const close = () => {
    host.classList.remove('show');
    if (modalCloseTimeout) clearTimeout(modalCloseTimeout);
    modalCloseTimeout = setTimeout(() => {
      host.hidden = true;
      host.innerHTML = '';
      modalCloseTimeout = null;
    }, 180);
  };

  if (modalClickListener) host.removeEventListener('click', modalClickListener);
  modalClickListener = (e) => {
    if (e.target === host) { close(); return; }
    const btn = e.target.closest && e.target.closest('[data-close]');
    if (btn && host.contains(btn)) { close(); return; }
  };
  host.addEventListener('click', modalClickListener);

  onMount?.({ host, close });
  return { close };
}

let confirmCloseTimeout = null;
let confirmClickListener = null;

function confirmar({ titulo, mensagem, textoOk = 'Confirmar', perigo = true }) {
  return new Promise(resolve => {
    const host = $('#confirm-host');
    if (confirmCloseTimeout) { clearTimeout(confirmCloseTimeout); confirmCloseTimeout = null; }
    host.hidden = false;
    host.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:420px">
        <div class="modal-head">${esc(titulo)}</div>
        <div class="modal-body">${esc(mensagem)}</div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-no>Cancelar</button>
          <button class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(textoOk)}</button>
        </div>
      </div>`;
    host.classList.remove('show');
    requestAnimationFrame(() => host.classList.add('show'));

    const finish = val => {
      host.classList.remove('show');
      if (confirmCloseTimeout) clearTimeout(confirmCloseTimeout);
      confirmCloseTimeout = setTimeout(() => {
        host.hidden = true;
        host.innerHTML = '';
        confirmCloseTimeout = null;
      }, 180);
      resolve(val);
    };

    if (confirmClickListener) host.removeEventListener('click', confirmClickListener);
    confirmClickListener = (e) => {
      if (e.target === host) { finish(false); return; }
      if (e.target.closest && e.target.closest('[data-no]')) { finish(false); return; }
      if (e.target.closest && e.target.closest('[data-yes]')) { finish(true); return; }
    };
    host.addEventListener('click', confirmClickListener);
  });
}

function confirmarLimpezaTotal() {
  return new Promise(resolve => {
    const host = $('#confirm-host');
    if (confirmCloseTimeout) { clearTimeout(confirmCloseTimeout); confirmCloseTimeout = null; }
    host.hidden = false;
    host.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true" style="max-width:480px">
        <div class="modal-head">Confirmação final</div>
        <div class="modal-body">
          <p style="margin-top:0;color:var(--text-1);font-size:13.5px;line-height:1.55">
            Para confirmar, marque a opção abaixo e digite <strong style="color:var(--text-0)">APAGAR</strong> no campo.
          </p>
          <label class="aviso" id="ciente-check" style="margin:14px 0">
            <input type="checkbox" />
            <span>Estou ciente de que esta ação apagará TODAS as informações da aplicação. Os dados não poderão ser recuperados caso não tenham sido exportados ou salvos previamente.</span>
          </label>
          <input class="field-input" id="apagar-input" placeholder="Digite APAGAR" autocomplete="off" />
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-no>Cancelar</button>
          <button class="btn btn-danger" data-confirmar disabled>Apagar tudo</button>
        </div>
      </div>`;
    host.classList.remove('show');
    requestAnimationFrame(() => host.classList.add('show'));

    const chkLabel = host.querySelector('#ciente-check');
    const chk = chkLabel.querySelector('input');
    const inp = host.querySelector('#apagar-input');
    const btnOk = host.querySelector('[data-confirmar]');

    const valida = () => {
      btnOk.disabled = !(chk.checked && inp.value.trim().toUpperCase() === 'APAGAR');
    };
    chkLabel.onclick = e => {
      if (e.target.tagName !== 'INPUT') { e.preventDefault(); chk.checked = !chk.checked; }
      chkLabel.classList.toggle('on', chk.checked);
      valida();
    };
    chk.onchange = () => { chkLabel.classList.toggle('on', chk.checked); valida(); };
    inp.oninput = valida;

    const finish = val => {
      host.classList.remove('show');
      if (confirmCloseTimeout) clearTimeout(confirmCloseTimeout);
      confirmCloseTimeout = setTimeout(() => {
        host.hidden = true;
        host.innerHTML = '';
        confirmCloseTimeout = null;
      }, 180);
      resolve(val);
    };

    if (confirmClickListener) host.removeEventListener('click', confirmClickListener);
    confirmClickListener = (e) => {
      if (e.target === host) { finish(false); return; }
      if (e.target.closest && e.target.closest('[data-no]')) { finish(false); return; }
      if (e.target.closest && e.target.closest('[data-confirmar]') && !btnOk.disabled) { finish(true); return; }
    };
    host.addEventListener('click', confirmClickListener);
  });
}

// ---------- storage ----------
const LS = {
  get(k, d) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

function cacheKey() { return state.user ? `seju_cache_${state.user.username}` : 'seju_cache_anon'; }

function saveCache() {
  LS.set(cacheKey(), { data: state.data, at: Date.now() });
}
function loadCache() {
  const c = LS.get(cacheKey(), null);
  if (c && c.data) state.data = { ...state.data, ...c.data };
}

// ---------- api ----------
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`${FN}${path}`, { ...opts, headers });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) {
    const err = new Error(data.error || `Erro ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// ---------- auth ----------
async function loginComSenha(username, password) {
  const r = await api('/auth?action=login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  state.token = r.token;
  state.user = r.user;
  LS.set('seju_token', r.token);
  LS.set('seju_user', r.user);
}

async function loginComGitHub() {
  location.href = `${FN}/auth?action=github`;
}

async function logout() {
  const ok = await confirmar({
    titulo: 'Sair da conta',
    mensagem: 'Deseja realmente sair do Seju neste dispositivo?',
    textoOk: 'Sair'
  });
  if (!ok) return;
  state.token = null;
  state.user = null;
  LS.del('seju_token');
  LS.del('seju_user');
  try { await api('/auth?action=logout', { method: 'POST' }); } catch {}
  routeTo('login');
}

// ---------- dados ----------
async function carregarTudo({ silencioso = false } = {}) {
  const files = ['alunos', 'funcionarios', 'escolas', 'turmas', 'atendimentos', 'pausas', 'config'];
  const results = await Promise.all(files.map(f =>
    api(`/data?file=${f}`).then(r => ({ f, r })).catch(e => ({ f, e }))
  ));
  let falhas = 0;
  for (const { f, r, e } of results) {
    if (e) { falhas++; continue; }
    if (f === 'config') state.data.config = { antecedenciaMinutos: 20, ...(r || {}) };
    else state.data[f] = Array.isArray(r[f]) ? r[f] : (Array.isArray(r) ? r : []);
  }
  saveCache();
  if (falhas && !silencioso) toast(`${falhas} arquivo(s) não puderam ser atualizados.`, 'error');
}

async function salvarArquivo(file, content, msgSucesso = 'Salvo.') {
  if (state.user?.role !== 'admin') {
    toast('Apenas administradores podem alterar dados.', 'error');
    throw new Error('sem permissao');
  }
  await api(`/data?file=${file}`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
  if (file === 'config') state.data.config = { ...content };
  else state.data[file] = content[file] || [];
  saveCache();
  toast(msgSucesso, 'success');
}

async function salvarColecao(file, arr, msgSucesso) {
  const content = { [file]: arr };
  await salvarArquivo(file, content, msgSucesso);
}

async function sincronizarManual() {
  if (state.syncing) return;
  state.syncing = true;
  const btn = $('#btn-sync');
  btn?.classList.add('spin');
  try {
    await carregarTudo({ silencioso: true });
    render();
    toast('Dados sincronizados.', 'success');
  } catch (e) {
    toast('Falha ao sincronizar: ' + e.message, 'error');
  } finally {
    state.syncing = false;
    btn?.classList.remove('spin');
  }
}

// ---------- permissões ----------
const podeEditar = () => state.user?.role === 'admin';
const podeVer = (mod) => {
  const r = state.user?.role;
  if (!r) return false;
  if (r === 'admin' || r === 'supervisor') return true;
  if (r === 'assistente') {
    return ['painel', 'atendimentos', 'fila', 'rotas', 'arquivados', 'alunos', 'escolas', 'turmas', 'config'].includes(mod);
  }
  if (r === 'equipe') {
    return ['atendimentos', 'alunos', 'config'].includes(mod);
  }
  if (r === 'motorista') {
    return ['rotas', 'config'].includes(mod);
  }
  return false;
};

function defaultRoute() {
  const r = state.user?.role;
  if (r === 'equipe') return 'atendimentos';
  if (r === 'motorista') return 'rotas';
  return 'painel';
}

// ---------- router ----------
const routes = ['painel', 'atendimentos', 'fila', 'rotas', 'arquivados', 'funcionarios', 'alunos', 'escolas', 'turmas', 'config'];

function routeTo(name) {
  if (name === 'login') {
    location.hash = '';
    renderLogin();
    return;
  }
  if (!routes.includes(name)) name = defaultRoute();
  if (!podeVer(name)) name = defaultRoute();
  state.route = name;
  location.hash = '#/' + name;
  render();
}

function routeFromHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  if (!h) return defaultRoute();
  if (!routes.includes(h)) return defaultRoute();
  if (!podeVer(h)) return defaultRoute();
  return h;
}

// ---------- consultas utilitárias ----------
const byId = (arr, id) => (arr || []).find(x => x.id === id);
const alunoPorId = id => byId(state.data.alunos, id);
const funcPorId = id => byId(state.data.funcionarios, id);
const escolaPorId = id => byId(state.data.escolas, id);
const turmaPorId = id => byId(state.data.turmas, id);

function alunosAtivos() { return state.data.alunos.filter(a => !a.arquivado); }
function alunosArquivados() { return state.data.alunos.filter(a => a.arquivado); }
function atendimentosDeAluno(alunoId) { return state.data.atendimentos.filter(a => a.alunoId === alunoId); }
function alunoEmAtendimento(alunoId) { return atendimentosDeAluno(alunoId).length > 0; }

function pausaAtivaAgora(p) {
  const hojeYMD = hoje();
  const ini = p.dataInicio || '0000-01-01';
  const fim = p.dataFim || '9999-12-31';
  return hojeYMD >= ini && hojeYMD <= fim;
}

function atendimentoPausado(at) {
  const pFunc = state.data.pausas.some(p =>
    p.tipo === 'funcionario' && p.alvoId === at.funcionarioId && pausaAtivaAgora(p));
  if (pFunc) return true;
  const pAluno = state.data.pausas.some(p =>
    p.tipo === 'aluno' && p.alvoId === at.alunoId && pausaAtivaAgora(p));
  return pAluno;
}

function filaEspera() {
  return alunosAtivos().filter(a => !alunoEmAtendimento(a.id));
}

// ---------- geração de rotas ----------
function gerarRotas() {
  const ant = Number(state.data.config?.antecedenciaMinutos) || 20;
  const out = {};
  for (const d of DIAS) out[d.id] = { manha: [], tarde: [] };

  const ats = state.data.atendimentos.filter(at => {
    const aluno = alunoPorId(at.alunoId);
    if (!aluno || aluno.arquivado) return false;
    if (aluno.necessitaTransporte === false) return false;
    if (atendimentoPausado(at)) return false;
    return true;
  });

  const grupos = new Map();
  for (const at of ats) {
    const key = `${at.dia}|${at.periodo}|${at.alunoId}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(at);
  }
  for (const [, list] of grupos) {
    const primeiro = list.reduce((a, b) => (a.horario < b.horario ? a : b));
    const aluno = alunoPorId(primeiro.alunoId);
    if (!aluno) continue;
    out[primeiro.dia][primeiro.periodo].push({
      aluno,
      horarioOriginal: primeiro.horario,
      horarioRota: diffMin(primeiro.horario, ant),
      at: primeiro
    });
  }
  for (const d of DIAS) {
    for (const p of PERIODOS) {
      out[d.id][p.id].sort((a, b) => a.horarioRota.localeCompare(b.horarioRota));
    }
  }
  return out;
}

// ---------- aplicação: render ----------
function renderLogin() {
  $('#app').hidden = true;
  $('#login-screen').hidden = false;

  const btn = $('#btn-login');
  if (btn) btn.onclick = loginComGitHub;

  const passInput = $('#login-password');
  const passToggle = $('#btn-toggle-pass');
  if (passInput && passToggle) {
    passToggle.onclick = () => {
      const mostrar = passInput.type === 'password';
      passInput.type = mostrar ? 'text' : 'password';
      passToggle.querySelector('use').setAttribute('href', mostrar ? '#i-eye-off' : '#i-eye');
      passToggle.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    };
  }

  const form = $('#login-form');
  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      const u = form.username.value.trim();
      const p = form.password.value;
      const err = $('#login-error');
      err.hidden = true;
      const submitBtn = form.querySelector('button[type=submit]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Entrando...';
      try {
        await loginComSenha(u, p);
        await startApp();
      } catch (e2) {
        err.textContent = e2.message || 'Falha ao entrar.';
        err.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
      }
    };
  }
}

// ---------- sidebar ----------
const gruposExpandidos = { principal: true, cadastro: true };

function construirSidebar() {
  const nav = $('#sidebar-nav');
  if (!nav) return;

  const opcoes = [
    { grupo: 'principal', route: 'painel',       label: 'Painel',         icon: 'i-dashboard' },
    { grupo: 'principal', route: 'atendimentos', label: 'Atendimentos',   icon: 'i-calendar' },
    { grupo: 'principal', route: 'fila',         label: 'Fila de espera', icon: 'i-list' },
    { grupo: 'principal', route: 'arquivados',   label: 'Arquivados',     icon: 'i-archive' },
    { grupo: 'principal', route: 'rotas',        label: 'Rotas',          icon: 'i-route' },
    { grupo: 'cadastro',  route: 'alunos',       label: 'Alunos',         icon: 'i-users' },
    { grupo: 'cadastro',  route: 'funcionarios', label: 'Funcionários',   icon: 'i-briefcase' },
    { grupo: 'cadastro',  route: 'turmas',       label: 'Turmas',         icon: 'i-layers' },
    { grupo: 'cadastro',  route: 'escolas',      label: 'Escolas',        icon: 'i-school' },
    { grupo: 'solo',      route: 'config',       label: 'Configurações',  icon: 'i-settings' }
  ];

  const visiveis = opcoes.filter(o => podeVer(o.route));
  const porGrupo = { principal: [], cadastro: [], solo: [] };
  for (const o of visiveis) porGrupo[o.grupo].push(o);

  const navItemHtml = (o) => `
    <button type="button" class="nav-item${o.route === state.route ? ' active' : ''}" data-route="${o.route}">
      <svg class="ic"><use href="#${o.icon}"/></svg>
      <span>${esc(o.label)}</span>
    </button>`;

  let html = '';

  const principal = porGrupo.principal;
  if (principal.length === 1) {
    html += navItemHtml(principal[0]);
  } else if (principal.length >= 2) {
    const [head, ...resto] = principal;
    const aberto = gruposExpandidos.principal !== false;
    html += `
      <div class="nav-group" data-group="principal">
        <div class="nav-group-head">
          <button type="button" class="nav-group-title${head.route === state.route ? ' active' : ''}" data-route="${head.route}">
            <svg class="ic"><use href="#${head.icon}"/></svg>
            <span>${esc(head.label)}</span>
          </button>
          <button type="button" class="nav-group-toggle${aberto ? ' open' : ''}" aria-label="Expandir" aria-expanded="${aberto}">
            <svg class="ic"><use href="#i-chevron-down"/></svg>
          </button>
        </div>
        <div class="nav-group-body"${aberto ? '' : ' hidden'}>
          ${resto.map(navItemHtml).join('')}
        </div>
      </div>`;
  }

  const cadastro = porGrupo.cadastro;
  if (cadastro.length === 1) {
    html += navItemHtml(cadastro[0]);
  } else if (cadastro.length >= 2) {
    const aberto = gruposExpandidos.cadastro !== false;
    html += `
      <div class="nav-group" data-group="cadastro">
        <div class="nav-group-head">
          <button type="button" class="nav-group-title" data-toggle-only="true">
            <svg class="ic"><use href="#i-layers"/></svg>
            <span>Dados</span>
          </button>
          <button type="button" class="nav-group-toggle${aberto ? ' open' : ''}" aria-label="Expandir" aria-expanded="${aberto}">
            <svg class="ic"><use href="#i-chevron-down"/></svg>
          </button>
        </div>
        <div class="nav-group-body"${aberto ? '' : ' hidden'}>
          ${cadastro.map(navItemHtml).join('')}
        </div>
      </div>`;
  }

  for (const o of porGrupo.solo) html += navItemHtml(o);

  nav.innerHTML = html;

  nav.querySelectorAll('.nav-item, .nav-group-title').forEach(el => {
    el.onclick = (e) => {
      e.preventDefault();
      if (el.dataset.toggleOnly) {
        toggleGrupo(el.closest('.nav-group'));
        return;
      }
      const r = el.dataset.route;
      if (r && podeVer(r)) { routeTo(r); fecharSidebar(); }
    };
  });

  nav.querySelectorAll('.nav-group-toggle').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleGrupo(btn.closest('.nav-group'));
    };
  });
}

function toggleGrupo(groupEl) {
  if (!groupEl) return;
  const gid = groupEl.dataset.group;
  const body = groupEl.querySelector('.nav-group-body');
  const toggle = groupEl.querySelector('.nav-group-toggle');
  if (!body || !toggle) return;
  const aberto = !body.hasAttribute('hidden');
  if (aberto) {
    body.setAttribute('hidden', '');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    gruposExpandidos[gid] = false;
  } else {
    body.removeAttribute('hidden');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    gruposExpandidos[gid] = true;
  }
}

function renderTopbar() {
  const userEl = $('#sidebar-user');
  if (userEl) userEl.textContent = state.user ? state.user.nome : '';
  construirSidebar();
}

function openSidebar() {
  const sb = $('#sidebar'); const sc = $('#scrim');
  if (!sb || !sc) return;
  sb.setAttribute('aria-hidden', 'false');
  sb.style.transform = 'translateX(0)';
  sc.hidden = false;
  requestAnimationFrame(() => sc.classList.add('show'));
  document.body.style.overflow = 'hidden';
}

function fecharSidebar() {
  const sb = $('#sidebar'); const sc = $('#scrim');
  if (!sb || !sc) return;
  sb.setAttribute('aria-hidden', 'true');
  sb.style.transform = '';
  sc.classList.remove('show');
  setTimeout(() => { sc.hidden = true; }, 220);
  document.body.style.overflow = '';
}

function render() {
  if (!state.user) return renderLogin();
  $('#login-screen').hidden = true;
  $('#app').hidden = false;
  renderTopbar();
  const v = $('#view');
  const fn = ({
    painel: viewPainel,
    atendimentos: viewAtendimentos,
    fila: viewFila,
    rotas: viewRotas,
    arquivados: viewArquivados,
    funcionarios: viewFuncionarios,
    alunos: viewAlunos,
    escolas: viewEscolas,
    turmas: viewTurmas,
    config: viewConfig
  })[state.route] || viewPainel;
  v.innerHTML = '';
  if (!state.online) {
    const b = document.createElement('div');
    b.className = 'offline-banner';
    b.textContent = 'Modo offline. Alterações podem não estar sincronizadas.';
    v.appendChild(b);
  }
  fn(v);
  v.focus?.();
}

// ============================================================
// VIEWS
// ============================================================

// ---------- PAINEL ----------
function viewPainel(root) {
  const total = alunosAtivos().length;
  const emAt = alunosAtivos().filter(a => alunoEmAtendimento(a.id)).length;
  const fila = filaEspera().length;
  const arq = alunosArquivados().length;

  const cids = {};
  for (const a of alunosAtivos()) {
    for (const c of (a.cids || [])) cids[c] = (cids[c] || 0) + 1;
  }
  const alunosPorFunc = {};
  for (const at of state.data.atendimentos) {
    const a = alunoPorId(at.alunoId);
    if (!a || a.arquivado) continue;
    (alunosPorFunc[at.funcionarioId] ||= new Set()).add(a.id);
  }
  const porEscola = {};
  for (const e of state.data.escolas) {
    const n = alunosDaEscola(e.id).length;
    if (n > 0) porEscola[e.id] = n;
  }
  const porTurma = {};
  for (const t of state.data.turmas) {
    const n = alunosDaTurma(t.id).length;
    if (n > 0) porTurma[t.id] = n;
  }
  const porPeriodo = { manha: 0, tarde: 0, integral: 0, naoInformado: 0 };
  for (const a of alunosAtivos()) {
    const p = a.periodoEstudo;
    if (p === 'manha' || p === 'tarde' || p === 'integral') porPeriodo[p]++;
    else porPeriodo.naoInformado++;
  }

  const cidsOrdenados = Object.entries(cids).sort((a, b) => b[1] - a[1]);
  const funcsOrdenados = Object.entries(alunosPorFunc)
    .map(([id, s]) => [id, s.size])
    .sort((a, b) => b[1] - a[1]);
  const escolasOrdenadas = Object.entries(porEscola).sort((a, b) => b[1] - a[1]);
  const turmasOrdenadas = Object.entries(porTurma).sort((a, b) => b[1] - a[1]);

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Painel</h1>
        <p class="page-sub">Visão geral da unidade</p>
      </div>
    </div>

    <div class="grid grid-2" style="margin-bottom:20px">
      ${statCard('Alunos cadastrados', total, 'ativos', 'alunos')}
      ${statCard('Em atendimento', emAt, 'com ao menos 1 atendimento', 'atendimentos')}
      ${statCard('Fila de espera', fila, 'sem atendimento', 'fila')}
      ${statCard('Arquivados', arq, 'histórico', 'arquivados')}
    </div>

    <div class="section-title">Alunos por CID</div>
    <div class="group"><div class="group-body">
      ${cidsOrdenados.length === 0 ? '<div class="empty">Nenhum CID cadastrado.</div>' : cidsOrdenados.map(([c, n]) => `
        <div class="row row-clickable" data-stat-cid="${esc(c)}">
          <span class="num">${n}</span>
          <div class="row-main"><div class="row-name">${esc(c)}</div></div>
          <span class="badge badge-brand">${n} aluno(s)</span>
        </div>`).join('')}
    </div></div>

    <div class="section-title">Alunos por período</div>
    <div class="group"><div class="group-body">
      ${(porPeriodo.manha + porPeriodo.tarde + porPeriodo.integral + porPeriodo.naoInformado) === 0
        ? '<div class="empty">Nenhum aluno cadastrado.</div>'
        : `
          ${porPeriodo.manha > 0 ? `<div class="row row-clickable" data-stat-periodo="manha"><span class="num">${porPeriodo.manha}</span><div class="row-main"><div class="row-name">Manhã</div></div><span class="badge">${porPeriodo.manha}</span></div>` : ''}
          ${porPeriodo.tarde > 0 ? `<div class="row row-clickable" data-stat-periodo="tarde"><span class="num">${porPeriodo.tarde}</span><div class="row-main"><div class="row-name">Tarde</div></div><span class="badge">${porPeriodo.tarde}</span></div>` : ''}
          ${porPeriodo.integral > 0 ? `<div class="row row-clickable" data-stat-periodo="integral"><span class="num">${porPeriodo.integral}</span><div class="row-main"><div class="row-name">Integral</div></div><span class="badge">${porPeriodo.integral}</span></div>` : ''}
          ${porPeriodo.naoInformado > 0 ? `<div class="row row-clickable" data-stat-periodo="naoInformado"><span class="num">${porPeriodo.naoInformado}</span><div class="row-main"><div class="row-name">Não informado</div></div><span class="badge">${porPeriodo.naoInformado}</span></div>` : ''}
        `}
    </div></div>

    <div class="section-title">Alunos por funcionário</div>
    <div class="group"><div class="group-body">
      ${funcsOrdenados.length === 0 ? '<div class="empty">Nenhum atendimento cadastrado.</div>' : funcsOrdenados.map(([id, n]) => {
        const f = funcPorId(id);
        return `
        <div class="row row-clickable" data-stat-func="${esc(id)}">
          <span class="num">${n}</span>
          <div class="row-main"><div class="row-name">${esc(f?.nome || 'Funcionário removido')}</div></div>
          <span class="badge">${n} aluno(s)</span>
        </div>`;
      }).join('')}
    </div></div>

    <div class="section-title">Alunos por turma</div>
    <div class="group"><div class="group-body">
      ${turmasOrdenadas.length === 0 ? '<div class="empty">Nenhuma turma com alunos.</div>' : turmasOrdenadas.map(([id, n]) => {
        const t = turmaPorId(id);
        return `
        <div class="row row-clickable" data-stat-turma="${esc(id)}">
          <span class="num">${n}</span>
          <div class="row-main"><div class="row-name">${esc(t?.nome || 'Turma removida')}</div></div>
          <span class="badge">${n}</span>
        </div>`;
      }).join('')}
    </div></div>

    <div class="section-title">Alunos por escola</div>
    <div class="group"><div class="group-body">
      ${escolasOrdenadas.length === 0 ? '<div class="empty">Nenhuma escola com alunos.</div>' : escolasOrdenadas.map(([id, n]) => {
        const e = escolaPorId(id);
        return `
        <div class="row row-clickable" data-stat-escola="${esc(id)}">
          <span class="num">${n}</span>
          <div class="row-main"><div class="row-name">${esc(e?.nome || 'Escola removida')}</div></div>
          <span class="badge">${n}</span>
        </div>`;
      }).join('')}
    </div></div>
  `;

  root.querySelectorAll('[data-stat-cid]').forEach(el => el.onclick = () => {
    const c = el.dataset.statCid;
    const lista = alunosAtivos().filter(a => (a.cids || []).includes(c));
    abrirListaAlunos(`Alunos com CID ${c}`, lista);
  });
  root.querySelectorAll('[data-stat-periodo]').forEach(el => el.onclick = () => {
    const p = el.dataset.statPeriodo;
    const lista = alunosAtivos().filter(a => p === 'naoInformado' ? !a.periodoEstudo : a.periodoEstudo === p);
    abrirListaAlunos(`Alunos - ${p === 'naoInformado' ? 'Não informado' : PERIODO_LABEL[p]}`, lista);
  });
  root.querySelectorAll('[data-stat-func]').forEach(el => el.onclick = () => {
    const id = el.dataset.statFunc;
    const ids = new Set(state.data.atendimentos.filter(a => a.funcionarioId === id).map(a => a.alunoId));
    const lista = alunosAtivos().filter(a => ids.has(a.id));
    abrirListaAlunos(`Alunos atendidos por ${funcPorId(id)?.nome || '-'}`, lista);
  });
  root.querySelectorAll('[data-stat-escola]').forEach(el => el.onclick = () => {
    const id = el.dataset.statEscola;
    abrirListaAlunos(`Alunos em ${escolaPorId(id)?.nome || '-'}`, alunosDaEscola(id));
  });
  root.querySelectorAll('[data-stat-turma]').forEach(el => el.onclick = () => {
    const id = el.dataset.statTurma;
    abrirListaAlunos(`Alunos em ${turmaPorId(id)?.nome || '-'}`, alunosDaTurma(id));
  });
}

function statCard(label, value, hint, route) {
  const clickable = route && podeVer(route);
  return `<div class="card ${clickable ? 'card-clickable' : ''}" ${clickable ? `data-route="${route}"` : ''}>
    <div class="stat">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-hint">${esc(hint)}</div>
    </div>
  </div>`;
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-route]');
  if (t && !t.closest('.sidebar')) {
    const r = t.dataset.route;
    if (r && routes.includes(r) && podeVer(r)) routeTo(r);
  }
});

function abrirListaAlunos(titulo, lista) {
  const html = lista.length === 0 ? '<div class="empty">Nenhum aluno.</div>' :
    lista.map((a, i) => `
      <div class="row row-clickable" data-aluno-id="${esc(a.id)}">
        <span class="num">${i + 1}</span>
        <div class="row-main">
          <div class="row-name">${esc(a.nome)}</div>
          <div class="row-meta">${esc((a.cids || []).join(', ') || 'Sem CID')}</div>
        </div>
      </div>`).join('');
  openModal({
    title: titulo,
    bodyHtml: `<div>${html}</div>`,
    onMount({ host, close }) {
      host.querySelectorAll('[data-aluno-id]').forEach(el => {
        el.onclick = () => { close(); abrirDetalhesAluno(el.dataset.alunoId); };
      });
    }
  });
}

function abrirDetalhesAluno(id) {
  const a = alunoPorId(id);
  if (!a) return;
  const ats = atendimentosDeAluno(id);
  const escolas = escolasDoAluno(id);
  const turmas = turmasDoAluno(id);
  const resp = responsaveisDoAluno(a);
  const atHtml = ats.length === 0 ? '<div class="empty">Nenhum atendimento.</div>' :
    ats.map((at, i) => {
      const f = funcPorId(at.funcionarioId);
      return `<div class="row">
        <span class="num">${i + 1}</span>
        <span class="hour">${esc(at.horario)}</span>
        <div class="row-main">
          <div class="row-name">${esc(f?.nome || 'Funcionário removido')}</div>
          <div class="row-meta">${esc(DIAS_ID[at.dia]?.exib || at.dia)} · ${esc(PERIODO_ID[at.periodo]?.exib || at.periodo)}</div>
        </div>
      </div>`;
    }).join('');
  const respHtml = resp.length === 0 ? '-' :
    resp.map(r => `${esc(r.nome || '')}${r.contato ? ' · ' + esc(fmtPhone(r.contato)) : ''}`).join('<br>');
  const escolasHtml = escolas.length === 0 ? '-' : escolas.map(e => esc(e.nome)).join(', ');
  const turmasHtml = turmas.length === 0 ? '-' : turmas.map(t => esc(t.nome)).join(', ');

  openModal({
    title: a.nome,
    bodyHtml: `
      <dl class="kv">
        <dt>CPF</dt><dd>${esc(fmtCPF(a.cpf) || '-')}</dd>
        <dt>Nascimento</dt><dd>${esc(fmtDateBR(a.dataNascimento) || '-')}</dd>
        <dt>CIDs</dt><dd>${esc((a.cids || []).join(', ') || '-')}</dd>
        <dt>Período de estudo</dt><dd>${esc(PERIODO_LABEL[a.periodoEstudo] || '-')}</dd>
        <dt>Endereço</dt><dd>${esc(formatEndereco(a) || '-')}</dd>
        <dt>Transporte</dt><dd>${a.necessitaTransporte === false ? 'Não' : 'Sim'}</dd>
        <dt>Responsáveis</dt><dd>${respHtml}</dd>
        <dt>Escolas</dt><dd>${escolasHtml}</dd>
        <dt>Turmas</dt><dd>${turmasHtml}</dd>
        <dt>Observação</dt><dd>${esc(a.observacao || '-')}</dd>
        <dt>Documentos</dt><dd>${a.documentoLink ? `<a href="${esc(a.documentoLink)}" target="_blank" rel="noopener">Abrir pasta</a>` : '-'}</dd>
        <dt>Status</dt><dd>${a.arquivado ? 'Arquivado' : 'Ativo'}</dd>
      </dl>
      <div class="section-title">Atendimentos</div>
      <div>${atHtml}</div>
    `
  });
}

// ---------- ATENDIMENTOS ----------
const estadoFiltros = { alunoNome: '', funcId: '', cargo: '', dia: '', periodo: '' };

function viewAtendimentos(root) {
  const isEquipe = state.user?.role === 'equipe';
  const funcIdUser = state.user?.funcionarioId || null;

  if (isEquipe && !funcIdUser) {
    root.innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Atendimentos</h1></div>
      </div>
      <div class="empty">Seu usuário não está vinculado a um funcionário. Contate o administrador.</div>
    `;
    return;
  }

  const funcs = isEquipe
    ? state.data.funcionarios.filter(f => f.id === funcIdUser)
    : state.data.funcionarios.slice().sort(cmpNome);
  const cargos = cargosUnicos();

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Atendimentos</h1>
        <p class="page-sub" id="at-total">-</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" id="abrir-pausas"><svg class="ic"><use href="#i-pause"/></svg>Pausas</button>
        ${podeEditar() ? `<button class="btn btn-primary" id="novo-at"><svg class="ic"><use href="#i-plus"/></svg>Novo</button>` : ''}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;display:grid;gap:10px">
      <div class="search-bar" style="margin-bottom:0">
        <svg class="ic"><use href="#i-search"/></svg>
        <input id="filtro-aluno" placeholder="Buscar aluno..." value="${esc(estadoFiltros.alunoNome)}" />
      </div>
      <div class="field-row">
        ${!isEquipe ? `<select class="field-select" id="filtro-func">
          <option value="">Todos funcionários</option>
          ${funcs.map(f => `<option value="${esc(f.id)}" ${estadoFiltros.funcId === f.id ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}
        </select>` : '<div></div>'}
        <select class="field-select" id="filtro-cargo">
          <option value="">Todos cargos</option>
          ${cargos.map(c => `<option value="${esc(c)}" ${estadoFiltros.cargo === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="field-row">
        <select class="field-select" id="filtro-dia">
          <option value="">Todos dias</option>
          ${DIAS_UTEIS.map(d => `<option value="${d.id}" ${estadoFiltros.dia === d.id ? 'selected' : ''}>${esc(d.exib)}</option>`).join('')}
        </select>
        <select class="field-select" id="filtro-periodo">
          <option value="">Todos períodos</option>
          ${PERIODOS.map(p => `<option value="${p.id}" ${estadoFiltros.periodo === p.id ? 'selected' : ''}>${esc(p.exib)}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-ghost btn-sm" id="limpar-filtros" style="justify-self:start">Limpar filtros</button>
    </div>

    <div id="at-lista"></div>
  `;

  const renderLista = () => {
    let ats = state.data.atendimentos.filter(at => {
      const a = alunoPorId(at.alunoId);
      return a && !a.arquivado;
    });
    if (isEquipe) ats = ats.filter(at => at.funcionarioId === funcIdUser);
    if (estadoFiltros.alunoNome) {
      const q = estadoFiltros.alunoNome.toLowerCase();
      ats = ats.filter(at => {
        const a = alunoPorId(at.alunoId);
        return a && a.nome.toLowerCase().includes(q);
      });
    }
    if (estadoFiltros.funcId) ats = ats.filter(at => at.funcionarioId === estadoFiltros.funcId);
    if (estadoFiltros.cargo) {
      ats = ats.filter(at => {
        const f = funcPorId(at.funcionarioId);
        return f && f.cargo === estadoFiltros.cargo;
      });
    }
    if (estadoFiltros.dia) ats = ats.filter(at => at.dia === estadoFiltros.dia);
    if (estadoFiltros.periodo) ats = ats.filter(at => at.periodo === estadoFiltros.periodo);

    root.querySelector('#at-total').textContent = `${ats.length} atendimento(s)`;

    if (ats.length === 0) {
      root.querySelector('#at-lista').innerHTML = '<div class="empty">Nenhum atendimento para os filtros aplicados.</div>';
      return;
    }

    const porFunc = {};
    for (const at of ats) (porFunc[at.funcionarioId] ||= []).push(at);
    const idsFunc = Object.keys(porFunc).map(id => funcPorId(id)).filter(Boolean).sort(cmpNome);

    root.querySelector('#at-lista').innerHTML = idsFunc.map(f => {
      const lista = porFunc[f.id] || [];
      return `
        <div class="group">
          <div class="group-head">
            <svg class="ic"><use href="#i-briefcase"/></svg>
            ${esc(f.nome)}
            <span class="badge badge-brand">${lista.length}</span>
          </div>
          <div class="group-body">
            ${DIAS.map(d => {
              const porPer = lista.filter(x => x.dia === d.id);
              if (porPer.length === 0) return '';
              return PERIODOS.map(p => {
                const itens = porPer.filter(x => x.periodo === p.id).sort((a, b) => a.horario.localeCompare(b.horario));
                if (itens.length === 0) return '';
                return `
                  <div class="subhead">${esc(d.exib)} · ${esc(p.exib)} <span class="badge">${itens.length}</span></div>
                  ${itens.map((at, i) => {
                    const a = alunoPorId(at.alunoId);
                    const pausado = atendimentoPausado(at);
                    return `
                      <div class="row">
                        <span class="num">${i + 1}</span>
                        <span class="hour">${esc(at.horario)}</span>
                        <div class="row-main">
                          <div class="row-name">${esc(a?.nome || 'Aluno removido')}</div>
                          ${pausado ? '<div class="row-meta"><span class="badge badge-warning">Pausado</span></div>' : ''}
                        </div>
                        ${podeEditar() ? `<div class="row-actions">
                          <button class="btn btn-ghost btn-icon" data-edit-at="${esc(at.id)}" aria-label="Editar"><svg class="ic"><use href="#i-edit"/></svg></button>
                          <button class="btn btn-ghost btn-icon" data-del-at="${esc(at.id)}" aria-label="Excluir"><svg class="ic"><use href="#i-trash"/></svg></button>
                        </div>` : ''}
                      </div>`;
                  }).join('')}
                `;
              }).join('');
            }).join('')}
          </div>
        </div>`;
    }).join('');

    root.querySelectorAll('[data-edit-at]').forEach(el => el.onclick = () => formAtendimento(el.dataset.editAt));
    root.querySelectorAll('[data-del-at]').forEach(el => el.onclick = () => removerAtendimento(el.dataset.delAt));
  };

  const aplicarFiltroAluno = debounce(e => { estadoFiltros.alunoNome = e.target.value; renderLista(); }, 120);
  root.querySelector('#filtro-aluno').oninput = aplicarFiltroAluno;
  root.querySelector('#filtro-func')?.addEventListener('change', e => { estadoFiltros.funcId = e.target.value; renderLista(); });
  root.querySelector('#filtro-cargo').onchange = e => { estadoFiltros.cargo = e.target.value; renderLista(); };
  root.querySelector('#filtro-dia').onchange = e => { estadoFiltros.dia = e.target.value; renderLista(); };
  root.querySelector('#filtro-periodo').onchange = e => { estadoFiltros.periodo = e.target.value; renderLista(); };
  root.querySelector('#limpar-filtros').onclick = () => {
    estadoFiltros.alunoNome = '';
    estadoFiltros.funcId = '';
    estadoFiltros.cargo = '';
    estadoFiltros.dia = '';
    estadoFiltros.periodo = '';
    viewAtendimentos(root);
  };

  root.querySelector('#abrir-pausas').onclick = () => abrirModalPausas();
  root.querySelector('#novo-at')?.addEventListener('click', () => formAtendimento(null));

  renderLista();
}

function abrirModalPausas() {
  const isAdmin = podeEditar();
  const hojeYMD = hoje();

  const listaHtml = state.data.pausas.length === 0
    ? '<div class="empty">Nenhuma pausa registrada.</div>'
    : state.data.pausas.map((p, i) => {
        const ativa = hojeYMD >= (p.dataInicio || '0000-01-01') && hojeYMD <= (p.dataFim || '9999-12-31');
        const alvo = p.tipo === 'funcionario' ? funcPorId(p.alvoId) : alunoPorId(p.alvoId);
        return `
          <div class="row">
            <span class="num">${i + 1}</span>
            <div class="row-main">
              <div class="row-name">${esc(alvo?.nome || 'Removido')}</div>
              <div class="row-meta">${esc(p.tipo === 'funcionario' ? 'Funcionário' : 'Aluno')} · ${esc(fmtDateBR(p.dataInicio) || '?')} até ${p.dataFim ? esc(fmtDateBR(p.dataFim)) : 'sem fim'} ${ativa ? '· <span class="badge badge-success">Ativa</span>' : ''}</div>
            </div>
            ${isAdmin ? `<div class="row-actions">
              <button class="btn btn-ghost btn-icon" data-edit-pausa="${esc(p.id)}" aria-label="Editar"><svg class="ic"><use href="#i-edit"/></svg></button>
              <button class="btn btn-ghost btn-icon" data-del-pausa="${esc(p.id)}" aria-label="Excluir"><svg class="ic"><use href="#i-trash"/></svg></button>
            </div>` : ''}
          </div>`;
      }).join('');

  openModal({
    title: 'Pausas',
    bodyHtml: `<div>${listaHtml}</div>`,
    footerHtml: `${isAdmin ? '<button class="btn btn-primary" id="nova-pausa-modal">Nova pausa</button>' : ''}
      <button class="btn btn-ghost" data-close>Fechar</button>`,
    onMount({ host, close }) {
      host.querySelector('#nova-pausa-modal')?.addEventListener('click', () => {
        close();
        formPausa(null);
      });
      host.querySelectorAll('[data-edit-pausa]').forEach(el => el.onclick = () => {
        close();
        formPausa(el.dataset.editPausa);
      });
      host.querySelectorAll('[data-del-pausa]').forEach(el => el.onclick = async () => {
        const ok = await confirmar({ titulo: 'Excluir pausa', mensagem: 'Confirmar exclusão.', textoOk: 'Excluir' });
        if (!ok) return;
        const lista = state.data.pausas.filter(x => x.id !== el.dataset.delPausa);
        try {
          await salvarColecao('pausas', lista, 'Pausa excluída.');
          close();
          render();
        } catch {}
      });
    }
  });
}

function formAtendimento(id) {
  const at = id ? byId(state.data.atendimentos, id) : null;
  const alunos = alunosAtivos().slice().sort(cmpNome);
  const funcs = state.data.funcionarios.slice().sort(cmpNome);
  if (alunos.length === 0) return toast('Cadastre ao menos um aluno.', 'error');
  if (funcs.length === 0) return toast('Cadastre ao menos um funcionário.', 'error');

  const body = `
    <form id="f-at" class="form">
      <label class="field">
        <span class="field-label">Aluno</span>
        <select class="field-select" name="alunoId" required>
          <option value="">Selecione</option>
          ${alunos.map(a => `<option value="${esc(a.id)}" ${at?.alunoId === a.id ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field-label">Funcionário</span>
        <select class="field-select" name="funcionarioId" required>
          <option value="">Selecione</option>
          ${funcs.map(f => `<option value="${esc(f.id)}" ${at?.funcionarioId === f.id ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}
        </select>
      </label>
      <div class="field-row">
        <label class="field">
          <span class="field-label">Dia</span>
          <select class="field-select" name="dia" required>
            ${DIAS_UTEIS.map(d => `<option value="${d.id}" ${at?.dia === d.id ? 'selected' : ''}>${esc(d.exib)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span class="field-label">Período</span>
          <select class="field-select" name="periodo" required>
            ${PERIODOS.map(p => `<option value="${p.id}" ${at?.periodo === p.id ? 'selected' : ''}>${esc(p.exib)}</option>`).join('')}
          </select>
        </label>
      </div>
      <label class="field">
        <span class="field-label">Horário</span>
        <input class="field-input" name="horario" id="hora-input" inputmode="numeric" maxlength="5" placeholder="0800" value="${esc(at?.horario || '')}" required />
        <span class="row-meta">Digite apenas os 4 dígitos. Os dois pontos aparecem automaticamente.</span>
      </label>
    </form>`;

  openModal({
    title: at ? 'Editar atendimento' : 'Novo atendimento',
    bodyHtml: body,
    footerHtml: `<button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="save-at">${at ? 'Salvar' : 'Cadastrar'}</button>`,
    onMount({ host, close }) {
      const horaInput = host.querySelector('#hora-input');
      horaInput.oninput = () => { horaInput.value = fmtHora(horaInput.value); };
      horaInput.focus();

      host.querySelector('#save-at').onclick = async () => {
        const form = host.querySelector('#f-at');
        if (!form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form).entries());
        data.horario = fmtHora(data.horario);
        if (!horaValida(data.horario)) return toast('Horário inválido. Use 00:00 a 23:59.', 'error');
        const lista = state.data.atendimentos.slice();
        if (at) {
          const idx = lista.findIndex(x => x.id === at.id);
          lista[idx] = { ...lista[idx], ...data };
        } else {
          lista.push({ id: uid(), ...data });
        }
        try {
          await salvarColecao('atendimentos', lista, at ? 'Atendimento atualizado.' : 'Atendimento cadastrado.');
          close();
          render();
        } catch {}
      };
    }
  });
}

async function removerAtendimento(id) {
  const at = byId(state.data.atendimentos, id);
  if (!at) return;
  const ok = await confirmar({
    titulo: 'Excluir atendimento',
    mensagem: 'Esta ação não pode ser desfeita.',
    textoOk: 'Excluir'
  });
  if (!ok) return;
  const lista = state.data.atendimentos.filter(x => x.id !== id);
  try {
    await salvarColecao('atendimentos', lista, 'Atendimento excluído.');
    render();
  } catch {}
}

function formPausa(id) {
  const p = id ? byId(state.data.pausas, id) : null;
  const body = `
    <form id="f-pausa" class="form">
      <label class="field">
        <span class="field-label">Tipo</span>
        <select class="field-select" name="tipo" id="tipo-pausa" required>
          <option value="funcionario" ${p?.tipo === 'funcionario' ? 'selected' : ''}>Funcionário</option>
          <option value="aluno" ${p?.tipo === 'aluno' ? 'selected' : ''}>Aluno</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">Alvo</span>
        <select class="field-select" name="alvoId" id="alvo-pausa" required></select>
      </label>
      <div class="field-row">
        <label class="field">
          <span class="field-label">Data de início</span>
          <input class="field-input" type="date" name="dataInicio" value="${esc(p?.dataInicio || hoje())}" required />
        </label>
        <label class="field">
          <span class="field-label">Data de fim (opcional)</span>
          <input class="field-input" type="date" name="dataFim" value="${esc(p?.dataFim || '')}" />
        </label>
      </div>
      <label class="field">
        <span class="field-label">Motivo (opcional)</span>
        <input class="field-input" name="motivo" value="${esc(p?.motivo || '')}" />
      </label>
    </form>`;

  openModal({
    title: p ? 'Editar pausa' : 'Nova pausa',
    bodyHtml: body,
    footerHtml: `<button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="save-pausa">${p ? 'Salvar' : 'Registrar'}</button>`,
    onMount({ host, close }) {
      const tipoSel = host.querySelector('#tipo-pausa');
      const alvoSel = host.querySelector('#alvo-pausa');
      const fill = () => {
        const t = tipoSel.value;
        const arr = t === 'funcionario' ? state.data.funcionarios : alunosAtivos();
        alvoSel.innerHTML = `<option value="">Selecione</option>` +
          arr.slice().sort(cmpNome)
            .map(x => `<option value="${esc(x.id)}" ${p?.alvoId === x.id ? 'selected' : ''}>${esc(x.nome)}</option>`)
            .join('');
      };
      tipoSel.onchange = fill;
      fill();

      host.querySelector('#save-pausa').onclick = async () => {
        const form = host.querySelector('#f-pausa');
        if (!form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form).entries());
        if (data.dataFim && data.dataFim < data.dataInicio) return toast('Data de fim anterior ao início.', 'error');
        const lista = state.data.pausas.slice();
        if (p) {
          const idx = lista.findIndex(x => x.id === p.id);
          lista[idx] = { ...lista[idx], ...data, dataFim: data.dataFim || null };
        } else {
          lista.push({ id: uid(), ...data, dataFim: data.dataFim || null });
        }
        try {
          await salvarColecao('pausas', lista, p ? 'Pausa atualizada.' : 'Pausa registrada.');
          close();
          render();
        } catch {}
      };
    }
  });
}

// ---------- FILA ----------
const estadoFiltrosFila = { q: '' };

function viewFila(root) {
  const base = filaEspera().slice().sort(cmpNome);
  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Fila de Espera</h1>
        <p class="page-sub">Alunos sem atendimento cadastrado</p>
      </div>
      <span class="badge badge-brand" id="fila-total">${base.length} aluno(s)</span>
    </div>
    <div class="search-bar">
      <svg class="ic"><use href="#i-search"/></svg>
      <input id="fila-busca" placeholder="Buscar por nome ou CID..." value="${esc(estadoFiltrosFila.q)}" />
    </div>
    <div class="group"><div class="group-body" id="fila-lista"></div></div>
  `;

  const renderLista = () => {
    const q = estadoFiltrosFila.q.toLowerCase().trim();
    const lista = !q ? base : base.filter(a =>
      a.nome.toLowerCase().includes(q) ||
      (a.cids || []).some(c => c.toLowerCase().includes(q))
    );
    root.querySelector('#fila-total').textContent = `${lista.length} aluno(s)`;
    root.querySelector('#fila-lista').innerHTML = lista.length === 0
      ? '<div class="empty">Ninguém corresponde à busca.</div>'
      : lista.map((a, i) => `
        <div class="row row-clickable" data-aluno-id="${esc(a.id)}">
          <span class="num">${i + 1}</span>
          <div class="row-main">
            <div class="row-name">${esc(a.nome)}</div>
            <div class="row-meta">${esc((a.cids || []).join(', ') || 'Sem CID')}</div>
          </div>
          <span class="badge">${esc(fmtDateBR(a.dataNascimento) || '-')}</span>
        </div>`).join('');
    root.querySelectorAll('[data-aluno-id]').forEach(el => el.onclick = () => abrirDetalhesAluno(el.dataset.alunoId));
  };

  const aplicarBuscaFila = debounce(e => { estadoFiltrosFila.q = e.target.value; renderLista(); }, 120);
  root.querySelector('#fila-busca').oninput = aplicarBuscaFila;
  renderLista();
}

// ---------- ROTAS ----------
const estadoFiltrosRotas = { alunoNome: '', dia: '', periodo: '' };

function viewRotas(root) {
  const ant = Number(state.data.config?.antecedenciaMinutos) || 20;

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Rotas</h1>
        <p class="page-sub">Antecedência: ${ant} minutos</p>
      </div>
      <button class="btn btn-primary" id="sync-rotas"><svg class="ic"><use href="#i-refresh"/></svg>Sincronizar</button>
    </div>

    <div class="card" style="margin-bottom:16px;display:grid;gap:10px">
      <div class="search-bar" style="margin-bottom:0">
        <svg class="ic"><use href="#i-search"/></svg>
        <input id="r-filtro-aluno" placeholder="Buscar aluno..." value="${esc(estadoFiltrosRotas.alunoNome)}" />
      </div>
      <div class="field-row">
        <select class="field-select" id="r-filtro-dia">
          <option value="">Todos dias</option>
          ${DIAS_UTEIS.map(d => `<option value="${d.id}" ${estadoFiltrosRotas.dia === d.id ? 'selected' : ''}>${esc(d.exib)}</option>`).join('')}
        </select>
        <select class="field-select" id="r-filtro-periodo">
          <option value="">Todos períodos</option>
          ${PERIODOS.map(p => `<option value="${p.id}" ${estadoFiltrosRotas.periodo === p.id ? 'selected' : ''}>${esc(p.exib)}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-ghost btn-sm" id="r-limpar" style="justify-self:start">Limpar filtros</button>
    </div>

    <div id="r-lista"></div>
  `;

  const renderLista = () => {
    const rotas = gerarRotas();
    const q = estadoFiltrosRotas.alunoNome.toLowerCase().trim();

    let total = 0;
    const html = DIAS.map(d => {
      if (estadoFiltrosRotas.dia && estadoFiltrosRotas.dia !== d.id) return '';
      const manha = (rotas[d.id].manha || []).filter(it => !q || it.aluno.nome.toLowerCase().includes(q));
      const tarde = (rotas[d.id].tarde || []).filter(it => !q || it.aluno.nome.toLowerCase().includes(q));
      const mF = estadoFiltrosRotas.periodo === 'tarde' ? [] : manha;
      const tF = estadoFiltrosRotas.periodo === 'manha' ? [] : tarde;
      if (!mF.length && !tF.length) return '';
      total += mF.length + tF.length;
      return `
        <div class="group">
          <div class="group-head">
            <svg class="ic"><use href="#i-route"/></svg>
            ${esc(d.exib)}
            <span class="badge badge-brand">${mF.length + tF.length}</span>
          </div>
          <div class="group-body">
            ${mF.length ? `
              <div class="subhead">Manhã <span class="badge">${mF.length}</span></div>
              ${mF.map((it, i) => rotaItem(it, i)).join('')}
            ` : ''}
            ${tF.length ? `
              <div class="subhead">Tarde <span class="badge">${tF.length}</span></div>
              ${tF.map((it, i) => rotaItem(it, i)).join('')}
            ` : ''}
          </div>
        </div>`;
    }).join('');

    root.querySelector('#r-lista').innerHTML = total === 0
      ? '<div class="empty">Nenhuma rota para os filtros aplicados.</div>'
      : html;
  };

  const aplicarFiltroAlunoRotas = debounce(e => { estadoFiltrosRotas.alunoNome = e.target.value; renderLista(); }, 120);
  root.querySelector('#r-filtro-aluno').oninput = aplicarFiltroAlunoRotas;
  root.querySelector('#r-filtro-dia').onchange = e => { estadoFiltrosRotas.dia = e.target.value; renderLista(); };
  root.querySelector('#r-filtro-periodo').onchange = e => { estadoFiltrosRotas.periodo = e.target.value; renderLista(); };
  root.querySelector('#r-limpar').onclick = () => {
    estadoFiltrosRotas.alunoNome = '';
    estadoFiltrosRotas.dia = '';
    estadoFiltrosRotas.periodo = '';
    viewRotas(root);
  };
  root.querySelector('#sync-rotas').onclick = async () => { await sincronizarManual(); };

  renderLista();
}

function rotaItem(it, i) {
  const a = it.aluno;
  const enderecoCompleto = formatEndereco(a);
  const enderecoMaps = enderecoParaMaps(a);
  const maps = enderecoMaps
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoMaps)}`
    : '';
  const resp = responsaveisDoAluno(a);
  return `
    <div class="row" style="align-items:flex-start">
      <span class="num">${i + 1}</span>
      <span class="hour">${esc(it.horarioRota)}</span>
      <div class="row-main">
        <div class="row-name">${esc(a.nome)}</div>
        ${enderecoCompleto ? `<div class="row-meta">${esc(enderecoCompleto)} ${maps ? `<a href="${esc(maps)}" target="_blank" rel="noopener" style="margin-left:6px" aria-label="Abrir no Maps"><svg class="ic" style="width:14px;height:14px"><use href="#i-map"/></svg></a>` : ''}</div>` : ''}
        ${a.observacao ? `<div class="row-meta">${esc(a.observacao)}</div>` : ''}
        ${resp.map(r => `<div class="row-meta">${esc(r.nome || '')}${r.contato ? ' · ' + esc(fmtPhone(r.contato)) : ''}</div>`).join('')}
      </div>
    </div>`;
}

// ---------- ARQUIVADOS ----------
function viewArquivados(root) {
  const lista = alunosArquivados().slice().sort(cmpNome);
  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Arquivados</h1>
        <p class="page-sub">Histórico de alunos desligados</p>
      </div>
      <span class="badge badge-brand">${lista.length}</span>
    </div>
    <div class="group"><div class="group-body">
      ${lista.length === 0 ? '<div class="empty">Nenhum aluno arquivado.</div>' :
        lista.map((a, i) => `
          <div class="row">
            <span class="num">${i + 1}</span>
            <div class="row-main">
              <div class="row-name">${esc(a.nome)}</div>
              <div class="row-meta">${esc((a.cids || []).join(', ') || 'Sem CID')}</div>
            </div>
            ${podeEditar() ? `<button class="btn btn-ghost btn-sm" data-restaurar="${esc(a.id)}">Restaurar</button>` : ''}
          </div>`).join('')}
    </div></div>
  `;
  root.querySelectorAll('[data-restaurar]').forEach(el => el.onclick = async () => {
    const ok = await confirmar({ titulo: 'Restaurar aluno', mensagem: 'O aluno voltará a ficar ativo.', textoOk: 'Restaurar', perigo: false });
    if (!ok) return;
    const lista2 = state.data.alunos.map(a => a.id === el.dataset.restaurar ? { ...a, arquivado: false } : a);
    try { await salvarColecao('alunos', lista2, 'Aluno restaurado.'); render(); } catch {}
  });
}

// ---------- FUNCIONÁRIOS ----------
function viewFuncionarios(root) {
  const lista = state.data.funcionarios.slice().sort(cmpNome);
  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Funcionários</h1>
        <p class="page-sub">${lista.length} cadastrado(s)</p>
      </div>
      ${podeEditar() ? `<button class="btn btn-primary" id="novo-func"><svg class="ic"><use href="#i-plus"/></svg>Novo</button>` : ''}
    </div>
    <div class="group"><div class="group-body">
      ${lista.length === 0 ? '<div class="empty">Nenhum funcionário.</div>' :
        lista.map((f, i) => {
          const qtd = state.data.atendimentos.filter(a => a.funcionarioId === f.id).length;
          const per = PERIODO_LABEL[periodoFuncionario(f)] || '';
          return `
            <div class="row">
              <span class="num">${i + 1}</span>
              <div class="row-main row-clickable" data-view-func="${esc(f.id)}">
                <div class="row-name">${esc(f.nome)}</div>
                <div class="row-meta">${esc(f.cargo || '')}${f.cargaHoraria ? ' · ' + esc(f.cargaHoraria) : ''}${per ? ' · ' + esc(per) : ''} · ${esc(fmtDias(f.diasTrabalho) || 'sem dias')}</div>
              </div>
              <span class="badge">${qtd} atend.</span>
              ${podeEditar() ? `<div class="row-actions">
                <button class="btn btn-ghost btn-icon" data-edit-f="${esc(f.id)}" aria-label="Editar"><svg class="ic"><use href="#i-edit"/></svg></button>
                <button class="btn btn-ghost btn-icon" data-del-f="${esc(f.id)}" aria-label="Excluir"><svg class="ic"><use href="#i-trash"/></svg></button>
              </div>` : ''}
            </div>`;
        }).join('')}
    </div></div>
  `;
  root.querySelector('#novo-func')?.addEventListener('click', () => formFuncionario(null));
  root.querySelectorAll('[data-view-func]').forEach(el => el.onclick = () => abrirDetalhesFuncionario(el.dataset.viewFunc));
  root.querySelectorAll('[data-edit-f]').forEach(el => el.onclick = e => { e.stopPropagation(); formFuncionario(el.dataset.editF); });
  root.querySelectorAll('[data-del-f]').forEach(el => el.onclick = e => { e.stopPropagation(); removerFuncionario(el.dataset.delF); });
}

function abrirDetalhesFuncionario(id) {
  const f = funcPorId(id);
  if (!f) return;
  const ats = state.data.atendimentos.filter(a => a.funcionarioId === id);
  const isAdmin = podeEditar();
  const per = PERIODO_LABEL[periodoFuncionario(f)] || '-';
  const porAluno = {};
  for (const at of ats) {
    const a = alunoPorId(at.alunoId);
    if (a && !a.arquivado) (porAluno[a.id] ||= []).push(at);
  }
  const alunos = Object.keys(porAluno).map(aid => alunoPorId(aid)).sort(cmpNome);

  openModal({
    title: f.nome,
    bodyHtml: `
      <dl class="kv">
        <dt>Cargo/Função</dt><dd>${esc(f.cargo || '-')}</dd>
        <dt>Carga horária</dt><dd>${esc(f.cargaHoraria || '-')}</dd>
        <dt>Dias de trabalho</dt><dd>${esc(fmtDias(f.diasTrabalho) || '-')}</dd>
        <dt>Período</dt><dd>${esc(per)}</dd>
        <dt>Documentos</dt><dd>${f.documentoLink ? `<a href="${esc(f.documentoLink)}" target="_blank" rel="noopener">Abrir pasta</a>` : '-'}</dd>
        <dt>Atendimentos</dt><dd>${ats.length}</dd>
      </dl>
      <div class="section-title">Alunos atendidos</div>
      <div>
        ${alunos.length === 0 ? '<div class="empty">Nenhum aluno em atendimento.</div>' :
          alunos.map((a, i) => `
            <div class="row row-clickable" data-open-aluno="${esc(a.id)}">
              <span class="num">${i + 1}</span>
              <div class="row-main">
                <div class="row-name">${esc(a.nome)}</div>
                <div class="row-meta">${porAluno[a.id].length} atendimento(s)</div>
              </div>
            </div>`).join('')}
      </div>
    `,
    footerHtml: `
      ${isAdmin ? '<button class="btn btn-primary" id="d-edit">Editar</button>' : ''}
      <button class="btn btn-ghost" data-close>Fechar</button>`,
    onMount({ host, close }) {
      host.querySelectorAll('[data-open-aluno]').forEach(el => el.onclick = () => {
        close();
        abrirDetalhesAluno(el.dataset.openAluno);
      });
      host.querySelector('#d-edit')?.addEventListener('click', () => { close(); formFuncionario(id); });
    }
  });
}

function formFuncionario(id) {
  const f = id ? funcPorId(id) : null;
  const dias = f?.diasTrabalho || [];
  const per = periodoFuncionario(f);
  const cargos = cargosUnicos();
  const cargoAtual = f?.cargo || '';
  const cargoEhNovo = cargoAtual && !cargos.includes(cargoAtual);
  // Para reativar sábado e domingo, troque DIAS_UTEIS por DIAS na linha abaixo.
  const diasDisponiveis = DIAS_UTEIS;

  const body = `
    <form id="f-func" class="form">
      <label class="field"><span class="field-label">Nome completo</span><input class="field-input" name="nome" value="${esc(f?.nome || '')}" required /></label>
      <label class="field">
        <span class="field-label">Cargo/Função</span>
        <select class="field-select" id="cargo-select">
          <option value="">Nenhum</option>
          ${cargos.map(c => `<option value="${esc(c)}" ${cargoAtual === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          <option value="__novo" ${cargoEhNovo ? 'selected' : ''}>Outro (digitar)</option>
        </select>
        <input class="field-input" id="cargo-custom" placeholder="Digite o novo cargo" style="margin-top:6px;${cargoEhNovo ? '' : 'display:none'}" value="${cargoEhNovo ? esc(cargoAtual) : ''}" />
      </label>
      <div class="field-row">
        <label class="field"><span class="field-label">Carga horária</span><input class="field-input" name="cargaHoraria" id="carga-input" placeholder="40h" value="${esc(f?.cargaHoraria || '')}" /></label>
      </div>
      <div class="field">
        <span class="field-label">Dias de trabalho</span>
        <div class="check-row" id="dias-func">
          ${diasDisponiveis.map(d => `<label class="check ${dias.includes(d.id) ? 'on' : ''}" data-dia="${d.id}">
            <input type="checkbox" value="${d.id}" ${dias.includes(d.id) ? 'checked' : ''} />${esc(d.cad)}
          </label>`).join('')}
        </div>
      </div>
      <div class="field">
        <span class="field-label">Período</span>
        <div class="check-row" id="periodo-func">
          <label class="check ${per === 'manha' ? 'on' : ''}" data-periodo="manha">Manhã</label>
          <label class="check ${per === 'tarde' ? 'on' : ''}" data-periodo="tarde">Tarde</label>
          <label class="check ${per === 'integral' ? 'on' : ''}" data-periodo="integral">Integral</label>
        </div>
      </div>
      <label class="field"><span class="field-label">Link da pasta de documentos</span><input class="field-input" name="documentoLink" placeholder="https://" value="${esc(f?.documentoLink || '')}" /></label>
    </form>`;

  openModal({
    title: f ? 'Editar funcionário' : 'Novo funcionário',
    bodyHtml: body,
    footerHtml: `<button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="save-func">${f ? 'Salvar' : 'Cadastrar'}</button>`,
    onMount({ host, close }) {
      const sel = host.querySelector('#cargo-select');
      const cust = host.querySelector('#cargo-custom');
      sel.onchange = () => {
        if (sel.value === '__novo') { cust.style.display = ''; cust.focus(); }
        else { cust.style.display = 'none'; cust.value = ''; }
      };
      const carga = host.querySelector('#carga-input');
      carga.onblur = () => { carga.value = fmtCarga(carga.value); };

      host.querySelectorAll('#dias-func .check').forEach(el => el.onclick = e => {
        e.preventDefault();
        el.classList.toggle('on');
        el.querySelector('input').checked = el.classList.contains('on');
      });
      const perBox = host.querySelector('#periodo-func');
      perBox.querySelectorAll('[data-periodo]').forEach(el => el.onclick = e => {
        e.preventDefault();
        const jaAtivo = el.classList.contains('on');
        perBox.querySelectorAll('[data-periodo]').forEach(x => x.classList.remove('on'));
        if (!jaAtivo) el.classList.add('on');
      });

      host.querySelector('#save-func').onclick = async () => {
        const form = host.querySelector('#f-func');
        if (!form.reportValidity()) return;
        const cargo = sel.value === '__novo' ? cust.value.trim() : sel.value.trim();
        if (sel.value === '__novo' && !cargo) return toast('Informe o novo cargo.', 'error');
        const cargaHoraria = fmtCarga(carga.value);
        const documentoLink = form.documentoLink.value.trim();
        const nome = form.nome.value.trim();
        const diasSel = Array.from(host.querySelectorAll('#dias-func .check.on')).map(e => e.dataset.dia);
        const periodo = perBox.querySelector('[data-periodo].on')?.dataset.periodo || '';
        const lista = state.data.funcionarios.slice();
        const payload = { nome, cargo, cargaHoraria, diasTrabalho: diasSel, periodo, documentoLink };
        if (f) {
          const idx = lista.findIndex(x => x.id === f.id);
          const limpo = { ...lista[idx], ...payload };
          delete limpo.turnos;
          lista[idx] = limpo;
        } else {
          lista.push({ id: uid(), ...payload, criadoEm: nowISO() });
        }
        try {
          await salvarColecao('funcionarios', lista, f ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
          close();
          render();
        } catch {}
      };
    }
  });
}

async function removerFuncionario(id) {
  const f = funcPorId(id);
  if (!f) return;
  const ats = state.data.atendimentos.filter(a => a.funcionarioId === id);
  if (ats.length === 0) {
    const ok = await confirmar({ titulo: 'Excluir funcionário', mensagem: `Excluir ${f.nome}?`, textoOk: 'Excluir' });
    if (!ok) return;
    const lista = state.data.funcionarios.filter(x => x.id !== id);
    try { await salvarColecao('funcionarios', lista, 'Funcionário excluído.'); render(); } catch {}
    return;
  }
  const outros = state.data.funcionarios.filter(x => x.id !== id);
  openModal({
    title: 'Funcionário possui atendimentos',
    bodyHtml: `
      <p>${esc(f.nome)} possui ${ats.length} atendimento(s). Escolha uma opção:</p>
      <label class="field" style="margin-top:12px">
        <span class="field-label">Migrar todos para</span>
        <select class="field-select" id="migrar-para">
          <option value="">Selecione</option>
          ${outros.map(o => `<option value="${esc(o.id)}">${esc(o.nome)}</option>`).join('')}
        </select>
      </label>
    `,
    footerHtml: `
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-danger" id="apagar-tudo">Apagar atendimentos</button>
      <button class="btn btn-primary" id="migrar">Migrar</button>`,
    onMount({ host, close }) {
      host.querySelector('#apagar-tudo').onclick = async () => {
        const ok = await confirmar({ titulo: 'Confirmar', mensagem: 'Excluir o funcionário e TODOS os atendimentos dele?', textoOk: 'Excluir tudo' });
        if (!ok) return;
        const funcs = state.data.funcionarios.filter(x => x.id !== id);
        const atend = state.data.atendimentos.filter(a => a.funcionarioId !== id);
        try {
          await salvarColecao('funcionarios', funcs, 'Funcionário excluído.');
          await salvarColecao('atendimentos', atend, 'Atendimentos removidos.');
          close(); render();
        } catch {}
      };
      host.querySelector('#migrar').onclick = async () => {
        const dest = host.querySelector('#migrar-para').value;
        if (!dest) return toast('Selecione um funcionário.', 'error');
        const funcs = state.data.funcionarios.filter(x => x.id !== id);
        const atend = state.data.atendimentos.map(a => a.funcionarioId === id ? { ...a, funcionarioId: dest } : a);
        try {
          await salvarColecao('funcionarios', funcs, 'Funcionário excluído.');
          await salvarColecao('atendimentos', atend, 'Atendimentos migrados.');
          close(); render();
        } catch {}
      };
    }
  });
}

// ---------- ALUNOS ----------
function viewAlunos(root) {
  const isEquipe = state.user?.role === 'equipe';
  const funcId = state.user?.funcionarioId || null;

  if (isEquipe && !funcId) {
    root.innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Alunos</h1></div>
      </div>
      <div class="empty">Seu usuário não está vinculado a um funcionário. Contate o administrador.</div>
    `;
    return;
  }

  let baseAlunos = alunosAtivos();
  if (isEquipe) {
    const ids = new Set(
      state.data.atendimentos
        .filter(at => at.funcionarioId === funcId)
        .map(at => at.alunoId)
    );
    baseAlunos = baseAlunos.filter(a => ids.has(a.id));
  }
  const lista = baseAlunos.slice().sort(cmpNome);

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Alunos</h1>
        <p class="page-sub">${lista.length} ativo(s)</p>
      </div>
      ${podeEditar() ? `<button class="btn btn-primary" id="novo-aluno"><svg class="ic"><use href="#i-plus"/></svg>Novo</button>` : ''}
    </div>
    <div class="search-bar">
      <svg class="ic"><use href="#i-search"/></svg>
      <input id="busca-aluno" placeholder="Buscar aluno..." />
    </div>
    <div class="group"><div class="group-body" id="lista-alunos">
      ${renderListaAlunos(lista)}
    </div></div>
  `;
  const input = root.querySelector('#busca-aluno');
  const aplicarBusca = debounce(() => {
    const q = input.value.toLowerCase().trim();
    const filtro = q ? lista.filter(a => a.nome.toLowerCase().includes(q) || (a.cpf || '').includes(q)) : lista;
    root.querySelector('#lista-alunos').innerHTML = renderListaAlunos(filtro);
    bindListaAlunos(root, filtro);
  }, 120);
  input.oninput = aplicarBusca;
  root.querySelector('#novo-aluno')?.addEventListener('click', () => formAluno(null));
  bindListaAlunos(root, lista);
}

function renderListaAlunos(lista) {
  if (lista.length === 0) return '<div class="empty">Nenhum aluno.</div>';
  return lista.map((a, i) => `
    <div class="row" data-row-aluno="${esc(a.id)}">
      <span class="num">${i + 1}</span>
      <div class="row-main row-clickable" data-open-aluno="${esc(a.id)}">
        <div class="row-name">${esc(a.nome)}</div>
        <div class="row-meta">${esc((a.cids || []).join(', ') || 'Sem CID')} · ${a.necessitaTransporte === false ? 'Sem transporte' : 'Com transporte'}</div>
      </div>
      ${podeEditar() ? `<div class="row-actions">
        <button class="btn btn-ghost btn-icon" data-edit-a="${esc(a.id)}" aria-label="Editar"><svg class="ic"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon" data-arch-a="${esc(a.id)}" aria-label="Arquivar"><svg class="ic"><use href="#i-archive"/></svg></button>
        <button class="btn btn-ghost btn-icon" data-del-a="${esc(a.id)}" aria-label="Excluir"><svg class="ic"><use href="#i-trash"/></svg></button>
      </div>` : ''}
    </div>`).join('');
}

function bindListaAlunos(root, lista) {
  root.querySelectorAll('[data-open-aluno]').forEach(el => el.onclick = () => abrirDetalhesAluno(el.dataset.openAluno));
  root.querySelectorAll('[data-edit-a]').forEach(el => el.onclick = e => { e.stopPropagation(); formAluno(el.dataset.editA); });
  root.querySelectorAll('[data-arch-a]').forEach(el => el.onclick = e => { e.stopPropagation(); arquivarAluno(el.dataset.archA); });
  root.querySelectorAll('[data-del-a]').forEach(el => el.onclick = e => { e.stopPropagation(); removerAluno(el.dataset.delA); });
}

function formAluno(id) {
  const a = id ? alunoPorId(id) : null;
  const cids = (a?.cids || []).slice();
  const resp = responsaveisDoAluno(a);
  const r1 = resp[0] || { nome: '', contato: '' };
  const r2 = resp[1] || { nome: '', contato: '' };
  const per = a?.periodoEstudo || '';

  const body = `
    <form id="f-aluno" class="form">
      <label class="field"><span class="field-label">Nome completo</span><input class="field-input" name="nome" value="${esc(a?.nome || '')}" required /></label>
      <div class="field">
        <span class="field-label">CID-10 (vários possíveis)</span>
        <div id="cids-lista" class="chips"></div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <input class="field-input" id="cid-input" placeholder="F84.1" style="text-transform:uppercase" />
          <button type="button" class="btn btn-ghost" id="add-cid">Adicionar</button>
        </div>
      </div>
      <div class="field-row">
        <label class="field"><span class="field-label">CPF</span><input class="field-input" name="cpf" id="cpf-input" value="${esc(a?.cpf || '')}" /></label>
        <label class="field"><span class="field-label">Data de nascimento</span><input class="field-input" type="date" name="dataNascimento" value="${esc(a?.dataNascimento || '')}" /></label>
      </div>

      <div class="field">
        <span class="field-label">Período de estudo</span>
        <div class="check-row" id="periodo-aluno">
          <label class="check ${per === 'manha' ? 'on' : ''}" data-periodo="manha">Manhã</label>
          <label class="check ${per === 'tarde' ? 'on' : ''}" data-periodo="tarde">Tarde</label>
          <label class="check ${per === 'integral' ? 'on' : ''}" data-periodo="integral">Integral</label>
        </div>
      </div>

      <div class="section-title" style="margin-top:4px">Endereço</div>
      <div class="field-row">
        <label class="field"><span class="field-label">Logradouro</span><input class="field-input" name="logradouro" value="${esc(a?.logradouro || '')}" placeholder="Rua, Avenida, Travessa..." /></label>
        <label class="field"><span class="field-label">Número</span><input class="field-input" name="numero" value="${esc(a?.numero || '')}" /></label>
      </div>
      <div class="field-row">
        <label class="field"><span class="field-label">Complemento (opcional)</span><input class="field-input" name="complemento" value="${esc(a?.complemento || '')}" placeholder="Apto, bloco, casa..." /></label>
        <label class="field"><span class="field-label">Ponto de referência (opcional)</span><input class="field-input" name="pontoReferencia" value="${esc(a?.pontoReferencia || '')}" placeholder="Perto do mercado..." /></label>
      </div>
      <div class="field-row">
        <label class="field"><span class="field-label">Bairro</span><input class="field-input" name="bairro" value="${esc(a?.bairro || '')}" /></label>
        <label class="field"><span class="field-label">CEP</span><input class="field-input" name="cep" id="cep-input" value="${esc(fmtCEP(a?.cep || ''))}" placeholder="00000-000" /></label>
      </div>
      <div class="field-row">
        <label class="field"><span class="field-label">Cidade</span><input class="field-input" name="cidade" value="${esc(a?.cidade || '')}" /></label>
        <label class="field"><span class="field-label">Estado (UF)</span><input class="field-input" name="estado" id="estado-input" maxlength="2" value="${esc(a?.estado || '')}" placeholder="SP" style="text-transform:uppercase" /></label>
      </div>

      <div class="field">
        <span class="field-label">Precisa de transporte?</span>
        <div class="check-row">
          <label class="check ${a?.necessitaTransporte !== false ? 'on' : ''}" id="transp-sim"><input type="radio" name="transp" value="sim" ${a?.necessitaTransporte !== false ? 'checked' : ''} />Sim</label>
          <label class="check ${a?.necessitaTransporte === false ? 'on' : ''}" id="transp-nao"><input type="radio" name="transp" value="nao" ${a?.necessitaTransporte === false ? 'checked' : ''} />Não</label>
        </div>
      </div>
      <label class="field"><span class="field-label">Instrução/Observação</span><textarea class="field-textarea" name="observacao">${esc(a?.observacao || '')}</textarea></label>

      <div class="section-title" style="margin-top:4px">Responsáveis</div>
      <div class="field">
        <span class="field-label">Responsável 1</span>
        <div class="field-row">
          <input class="field-input" name="resp1_nome" placeholder="Nome do responsável" value="${esc(r1.nome || '')}" />
          <input class="field-input" name="resp1_contato" id="resp1-contato" placeholder="(00) 9 0000-0000" value="${esc(fmtPhone(r1.contato || ''))}" />
        </div>
      </div>
      <div class="field">
        <span class="field-label">Responsável 2 (opcional)</span>
        <div class="field-row">
          <input class="field-input" name="resp2_nome" placeholder="Nome do responsável" value="${esc(r2.nome || '')}" />
          <input class="field-input" name="resp2_contato" id="resp2-contato" placeholder="(00) 9 0000-0000" value="${esc(fmtPhone(r2.contato || ''))}" />
        </div>
      </div>

      <label class="field"><span class="field-label">Link da pasta de documentos</span><input class="field-input" name="documentoLink" placeholder="https://" value="${esc(a?.documentoLink || '')}" /></label>
    </form>`;

  openModal({
    title: a ? 'Editar aluno' : 'Novo aluno',
    bodyHtml: body,
    footerHtml: `<button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="save-aluno">${a ? 'Salvar' : 'Cadastrar'}</button>`,
    onMount({ host, close }) {
      const cidsBox = host.querySelector('#cids-lista');
      const drawCids = () => {
        cidsBox.innerHTML = cids.length === 0 ? '<span class="row-meta">Nenhum CID</span>' :
          cids.map((c, i) => `<span class="chip">${esc(c)}<button type="button" data-rm-cid="${i}" aria-label="Remover"><svg class="ic"><use href="#i-close"/></svg></button></span>`).join('');
        cidsBox.querySelectorAll('[data-rm-cid]').forEach(b => b.onclick = () => { cids.splice(Number(b.dataset.rmCid), 1); drawCids(); });
      };
      drawCids();
      host.querySelector('#add-cid').onclick = () => {
        const inp = host.querySelector('#cid-input');
        const v = fmtCID(inp.value);
        if (!v) return;
        if (!cids.includes(v)) cids.push(v);
        inp.value = '';
        drawCids();
      };

      const perBox = host.querySelector('#periodo-aluno');
      perBox.querySelectorAll('[data-periodo]').forEach(el => el.onclick = e => {
        e.preventDefault();
        const jaAtivo = el.classList.contains('on');
        perBox.querySelectorAll('[data-periodo]').forEach(x => x.classList.remove('on'));
        if (!jaAtivo) el.classList.add('on');
      });

      const transpSim = host.querySelector('#transp-sim');
      const transpNao = host.querySelector('#transp-nao');
      transpSim.onclick = e => { e.preventDefault(); transpSim.classList.add('on'); transpNao.classList.remove('on'); transpSim.querySelector('input').checked = true; };
      transpNao.onclick = e => { e.preventDefault(); transpNao.classList.add('on'); transpSim.classList.remove('on'); transpNao.querySelector('input').checked = true; };

      const cpfInp = host.querySelector('#cpf-input');
      cpfInp.oninput = () => { cpfInp.value = fmtCPF(cpfInp.value); };
      const cepInp = host.querySelector('#cep-input');
      cepInp.oninput = () => { cepInp.value = fmtCEP(cepInp.value); };
      const estInp = host.querySelector('#estado-input');
      estInp.oninput = () => { estInp.value = estInp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2); };
      const rc1 = host.querySelector('#resp1-contato');
      rc1.oninput = () => { rc1.value = fmtPhone(rc1.value); };
      const rc2 = host.querySelector('#resp2-contato');
      rc2.oninput = () => { rc2.value = fmtPhone(rc2.value); };

      host.querySelector('#save-aluno').onclick = async () => {
        const form = host.querySelector('#f-aluno');
        if (!form.reportValidity()) return;
        const base = Object.fromEntries(new FormData(form).entries());
        const necessitaTransporte = base.transp !== 'nao';
        delete base.transp;

        const cpf = String(base.cpf || '').replace(/\D/g, '');
        if (cpf) {
          const dup = state.data.alunos.find(x => x.id !== a?.id && String(x.cpf || '').replace(/\D/g, '') === cpf);
          if (dup) return toast('Já existe um aluno com este CPF.', 'error');
        }
        const cep = String(base.cep || '').replace(/\D/g, '');
        const estado = String(base.estado || '').toUpperCase().slice(0, 2);
        const periodoEstudo = perBox.querySelector('[data-periodo].on')?.dataset.periodo || '';

        const responsaveis = [];
        const r1n = (base.resp1_nome || '').trim();
        const r1c = String(base.resp1_contato || '').replace(/\D/g, '');
        if (r1n || r1c) responsaveis.push({ nome: r1n, contato: r1c });
        const r2n = (base.resp2_nome || '').trim();
        const r2c = String(base.resp2_contato || '').replace(/\D/g, '');
        if (r2n || r2c) responsaveis.push({ nome: r2n, contato: r2c });

        const payload = {
          nome: base.nome,
          cpf,
          dataNascimento: base.dataNascimento,
          cids: cids.slice(),
          periodoEstudo,
          logradouro: base.logradouro,
          numero: base.numero,
          complemento: base.complemento,
          pontoReferencia: base.pontoReferencia,
          bairro: base.bairro,
          cidade: base.cidade,
          estado,
          cep,
          necessitaTransporte,
          observacao: base.observacao,
          responsaveis,
          documentoLink: base.documentoLink
        };

        const lista = state.data.alunos.slice();
        if (a) {
          const idx = lista.findIndex(x => x.id === a.id);
          const limpo = { ...lista[idx], ...payload };
          delete limpo.endereco;
          delete limpo.responsavel;
          delete limpo.contato;
          delete limpo.escolaId;
          delete limpo.turmaId;
          lista[idx] = limpo;
        } else {
          lista.push({ id: uid(), ...payload, arquivado: false, criadoEm: nowISO() });
        }
        try {
          await salvarColecao('alunos', lista, a ? 'Aluno atualizado.' : 'Aluno cadastrado.');
          close();
          render();
        } catch {}
      };
    }
  });
}

async function arquivarAluno(id) {
  const a = alunoPorId(id);
  if (!a) return;
  const ok = await confirmar({
    titulo: 'Arquivar aluno',
    mensagem: `Arquivar ${a.nome}? Ele sairá dos atendimentos e da fila de espera.`,
    textoOk: 'Arquivar'
  });
  if (!ok) return;
  const lista = state.data.alunos.map(x => x.id === id ? { ...x, arquivado: true, arquivadoEm: nowISO() } : x);
  try {
    await salvarColecao('alunos', lista, 'Aluno arquivado.');
    render();
  } catch {}
}

async function removerAluno(id) {
  const a = alunoPorId(id);
  if (!a) return;
  const ats = atendimentosDeAluno(id);
  const ok = await confirmar({
    titulo: 'Excluir aluno',
    mensagem: ats.length > 0
      ? `${a.nome} possui ${ats.length} atendimento(s). Excluir mesmo assim apaga o aluno, seus atendimentos e vínculos. Continuar?`
      : `Excluir ${a.nome}?`,
    textoOk: 'Excluir'
  });
  if (!ok) return;
  const alunos = state.data.alunos.filter(x => x.id !== id);
  const atend = state.data.atendimentos.filter(x => x.alunoId !== id);
  const escolas = state.data.escolas.map(e => ({
    ...e,
    alunoIds: Array.isArray(e.alunoIds) ? e.alunoIds.filter(x => x !== id) : e.alunoIds
  }));
  const turmas = state.data.turmas.map(t => ({
    ...t,
    alunoIds: Array.isArray(t.alunoIds) ? t.alunoIds.filter(x => x !== id) : t.alunoIds
  }));
  try {
    await salvarColecao('alunos', alunos, 'Aluno excluído.');
    if (ats.length > 0) await salvarColecao('atendimentos', atend, 'Atendimentos removidos.');
    await salvarColecao('escolas', escolas);
    await salvarColecao('turmas', turmas);
    render();
  } catch {}
}

// ---------- ESCOLAS ----------
function viewEscolas(root) {
  const lista = state.data.escolas.slice().sort(cmpNome);
  root.innerHTML = `
    <div class="page-head">
      <div><h1 class="page-title">Escolas</h1><p class="page-sub">${lista.length} cadastrada(s)</p></div>
      ${podeEditar() ? `<button class="btn btn-primary" id="nova-escola"><svg class="ic"><use href="#i-plus"/></svg>Nova</button>` : ''}
    </div>
    <div class="group"><div class="group-body">
      ${lista.length === 0 ? '<div class="empty">Nenhuma escola.</div>' :
        lista.map((e, i) => {
          const n = alunosDaEscola(e.id).length;
          return `
            <div class="row">
              <span class="num">${i + 1}</span>
              <div class="row-main row-clickable" data-view-escola="${esc(e.id)}">
                <div class="row-name">${esc(e.nome)}</div>
                <div class="row-meta">${esc(e.endereco || 'Sem endereço')}</div>
              </div>
              <span class="badge">${n} aluno(s)</span>
              ${podeEditar() ? `<div class="row-actions">
                <button class="btn btn-ghost btn-icon" data-vinc-escola="${esc(e.id)}" aria-label="Vincular alunos"><svg class="ic"><use href="#i-users"/></svg></button>
                <button class="btn btn-ghost btn-icon" data-edit-e="${esc(e.id)}" aria-label="Editar"><svg class="ic"><use href="#i-edit"/></svg></button>
                <button class="btn btn-ghost btn-icon" data-del-e="${esc(e.id)}" aria-label="Excluir"><svg class="ic"><use href="#i-trash"/></svg></button>
              </div>` : ''}
            </div>`;
        }).join('')}
    </div></div>
  `;
  root.querySelector('#nova-escola')?.addEventListener('click', () => formEscola(null));
  root.querySelectorAll('[data-view-escola]').forEach(el => el.onclick = () => abrirDetalhesEscola(el.dataset.viewEscola));
  root.querySelectorAll('[data-edit-e]').forEach(el => el.onclick = e => { e.stopPropagation(); formEscola(el.dataset.editE); });
  root.querySelectorAll('[data-vinc-escola]').forEach(el => el.onclick = e => { e.stopPropagation(); vincularAlunosEscola(el.dataset.vincEscola); });
  root.querySelectorAll('[data-del-e]').forEach(el => el.onclick = e => { e.stopPropagation(); removerEscola(el.dataset.delE); });
}

function abrirDetalhesEscola(id) {
  const e = escolaPorId(id);
  if (!e) return;
  const alunos = alunosDaEscola(id).sort(cmpNome);
  const isAdmin = podeEditar();

  openModal({
    title: e.nome,
    bodyHtml: `
      <dl class="kv">
        <dt>Endereço</dt><dd>${esc(e.endereco || '-')}</dd>
        <dt>Alunos vinculados</dt><dd>${alunos.length}</dd>
      </dl>
      <div class="section-title">Alunos vinculados</div>
      <div>
        ${alunos.length === 0 ? '<div class="empty">Nenhum aluno vinculado.</div>' :
          alunos.map((a, i) => `
            <div class="row row-clickable" data-open-aluno="${esc(a.id)}">
              <span class="num">${i + 1}</span>
              <div class="row-main">
                <div class="row-name">${esc(a.nome)}</div>
                <div class="row-meta">${esc((a.cids || []).join(', ') || 'Sem CID')}</div>
              </div>
            </div>`).join('')}
      </div>
    `,
    footerHtml: `
      ${isAdmin ? `<button class="btn btn-ghost" id="d-vinc">Vincular alunos</button>
        <button class="btn btn-primary" id="d-edit">Editar</button>` : ''}
      <button class="btn btn-ghost" data-close>Fechar</button>`,
    onMount({ host, close }) {
      host.querySelectorAll('[data-open-aluno]').forEach(el => el.onclick = () => {
        close();
        abrirDetalhesAluno(el.dataset.openAluno);
      });
      host.querySelector('#d-vinc')?.addEventListener('click', () => { close(); vincularAlunosEscola(id); });
      host.querySelector('#d-edit')?.addEventListener('click', () => { close(); formEscola(id); });
    }
  });
}

function formEscola(id) {
  const e = id ? escolaPorId(id) : null;
  openModal({
    title: e ? 'Editar escola' : 'Nova escola',
    bodyHtml: `
      <form id="f-escola" class="form">
        <label class="field"><span class="field-label">Nome</span><input class="field-input" name="nome" value="${esc(e?.nome || '')}" required /></label>
        <label class="field"><span class="field-label">Endereço (opcional)</span><input class="field-input" name="endereco" value="${esc(e?.endereco || '')}" /></label>
      </form>`,
    footerHtml: `<button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="save-escola">${e ? 'Salvar' : 'Cadastrar'}</button>`,
    onMount({ host, close }) {
      host.querySelector('#save-escola').onclick = async () => {
        const form = host.querySelector('#f-escola');
        if (!form.reportValidity()) return;
        const nome = form.nome.value.trim();
        const endereco = form.endereco.value.trim();
        const listaSalvar = state.data.escolas.slice();
        if (e) {
          const idx = listaSalvar.findIndex(x => x.id === e.id);
          listaSalvar[idx] = { ...listaSalvar[idx], nome, endereco };
        } else {
          listaSalvar.push({ id: uid(), nome, endereco, alunoIds: [] });
        }
        try {
          await salvarColecao('escolas', listaSalvar, e ? 'Escola atualizada.' : 'Escola cadastrada.');
          close();
          render();
        } catch {}
      };
    }
  });
}

function vincularAlunosEscola(id) {
  const e = escolaPorId(id);
  if (!e) return;
  const todos = alunosAtivos().slice().sort(cmpNome);
  const vinculados = new Set(alunosDaEscola(id).map(a => a.id));

  openModal({
    title: 'Vincular alunos',
    bodyHtml: `
      <p class="row-meta" style="margin-top:0">Marque os alunos da escola ${esc(e.nome)}.</p>
      <div class="search-bar">
        <svg class="ic"><use href="#i-search"/></svg>
        <input id="busca-vinc" placeholder="Buscar aluno..." />
      </div>
      <div id="lista-vinc" style="max-height:340px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:4px">
        ${todos.length === 0 ? '<div class="empty">Nenhum aluno cadastrado.</div>' :
          todos.map(a => `
            <label class="row" style="cursor:pointer">
              <input type="checkbox" data-aluno-id="${esc(a.id)}" ${vinculados.has(a.id) ? 'checked' : ''} />
              <div class="row-main">
                <div class="row-name">${esc(a.nome)}</div>
                <div class="row-meta">${esc((a.cids || []).join(', ') || 'Sem CID')}</div>
              </div>
            </label>`).join('')}
      </div>
      <p class="row-meta" id="contador-vinc" style="margin-bottom:0"></p>
    `,
    footerHtml: `<button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="save-vinc">Salvar vínculos</button>`,
    onMount({ host, close }) {
      const busca = host.querySelector('#busca-vinc');
      const lista = host.querySelector('#lista-vinc');
      const cont = host.querySelector('#contador-vinc');
      const atualiza = () => {
        const n = lista.querySelectorAll('input[type=checkbox]:checked').length;
        cont.textContent = `${n} aluno(s) marcado(s).`;
      };
      atualiza();
      lista.addEventListener('change', atualiza);
      busca.oninput = debounce(() => {
        const q = busca.value.toLowerCase().trim();
        lista.querySelectorAll('.row').forEach(row => {
          const nome = row.querySelector('.row-name')?.textContent.toLowerCase() || '';
          row.style.display = !q || nome.includes(q) ? '' : 'none';
        });
      }, 120);
      host.querySelector('#save-vinc').onclick = async () => {
        const alunoIds = Array.from(lista.querySelectorAll('input[type=checkbox]:checked')).map(c => c.dataset.alunoId);
        const listaSalvar = state.data.escolas.map(x => x.id === id ? { ...x, alunoIds } : x);
        try {
          await salvarColecao('escolas', listaSalvar, 'Vínculos salvos.');
          close();
          render();
        } catch {}
      };
    }
  });
}

async function removerEscola(id) {
  const ok = await confirmar({ titulo: 'Excluir escola', mensagem: 'Alunos vinculados ficarão sem escola.', textoOk: 'Excluir' });
  if (!ok) return;
  const lista = state.data.escolas.filter(x => x.id !== id);
  try { await salvarColecao('escolas', lista, 'Escola excluída.'); render(); } catch {}
}

// ---------- TURMAS ----------
function viewTurmas(root) {
  const lista = state.data.turmas.slice().sort(cmpNome);
  root.innerHTML = `
    <div class="page-head">
      <div><h1 class="page-title">Turmas</h1><p class="page-sub">${lista.length} cadastrada(s) · uso organizacional</p></div>
      ${podeEditar() ? `<button class="btn btn-primary" id="nova-turma"><svg class="ic"><use href="#i-plus"/></svg>Nova</button>` : ''}
    </div>
    <div class="group"><div class="group-body">
      ${lista.length === 0 ? '<div class="empty">Nenhuma turma.</div>' :
        lista.map((t, i) => {
          const n = alunosDaTurma(t.id).length;
          const esc2 = escolaPorId(t.escolaId);
          return `
            <div class="row">
              <span class="num">${i + 1}</span>
              <div class="row-main row-clickable" data-view-turma="${esc(t.id)}">
                <div class="row-name">${esc(t.nome)}</div>
                <div class="row-meta">${esc(esc2?.nome || 'Sem escola vinculada')}</div>
              </div>
              <span class="badge">${n} aluno(s)</span>
              ${podeEditar() ? `<div class="row-actions">
                <button class="btn btn-ghost btn-icon" data-vinc-turma="${esc(t.id)}" aria-label="Vincular alunos"><svg class="ic"><use href="#i-users"/></svg></button>
                <button class="btn btn-ghost btn-icon" data-edit-t="${esc(t.id)}" aria-label="Editar"><svg class="ic"><use href="#i-edit"/></svg></button>
                <button class="btn btn-ghost btn-icon" data-del-t="${esc(t.id)}" aria-label="Excluir"><svg class="ic"><use href="#i-trash"/></svg></button>
              </div>` : ''}
            </div>`;
        }).join('')}
    </div></div>
  `;
  root.querySelector('#nova-turma')?.addEventListener('click', () => formTurma(null));
  root.querySelectorAll('[data-view-turma]').forEach(el => el.onclick = () => abrirDetalhesTurma(el.dataset.viewTurma));
  root.querySelectorAll('[data-edit-t]').forEach(el => el.onclick = e => { e.stopPropagation(); formTurma(el.dataset.editT); });
  root.querySelectorAll('[data-vinc-turma]').forEach(el => el.onclick = e => { e.stopPropagation(); vincularAlunosTurma(el.dataset.vincTurma); });
  root.querySelectorAll('[data-del-t]').forEach(el => el.onclick = e => { e.stopPropagation(); removerTurma(el.dataset.delT); });
}

function formTurma(id) {
  const t = id ? turmaPorId(id) : null;
  const escolas = state.data.escolas.slice().sort(cmpNome);
  openModal({
    title: t ? 'Editar turma' : 'Nova turma',
    bodyHtml: `
      <form id="f-turma" class="form">
        <label class="field"><span class="field-label">Nome</span><input class="field-input" name="nome" value="${esc(t?.nome || '')}" required /></label>
        <label class="field"><span class="field-label">Escola vinculada (opcional)</span>
          <select class="field-select" name="escolaId">
            <option value="">Nenhuma</option>
            ${escolas.map(e => `<option value="${esc(e.id)}" ${t?.escolaId === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}
          </select>
        </label>
      </form>`,
    footerHtml: `<button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="save-turma">${t ? 'Salvar' : 'Cadastrar'}</button>`,
    onMount({ host, close }) {
      host.querySelector('#save-turma').onclick = async () => {
        const form = host.querySelector('#f-turma');
        if (!form.reportValidity()) return;
        const nome = form.nome.value.trim();
        const escolaId = form.escolaId.value || '';
        const listaSalvar = state.data.turmas.slice();
        if (t) {
          const idx = listaSalvar.findIndex(x => x.id === t.id);
          listaSalvar[idx] = { ...listaSalvar[idx], nome, escolaId };
        } else {
          listaSalvar.push({ id: uid(), nome, escolaId, alunoIds: [] });
        }
        try {
          await salvarColecao('turmas', listaSalvar, t ? 'Turma atualizada.' : 'Turma cadastrada.');
          close();
          render();
        } catch {}
      };
    }
  });
}

function abrirDetalhesTurma(id) {
  const t = turmaPorId(id);
  if (!t) return;
  const alunos = alunosDaTurma(id).sort(cmpNome);
  const esc2 = escolaPorId(t.escolaId);
  const isAdmin = podeEditar();

  openModal({
    title: t.nome,
    bodyHtml: `
      <dl class="kv">
        <dt>Escola</dt><dd>${esc(esc2?.nome || '-')}</dd>
        <dt>Alunos vinculados</dt><dd>${alunos.length}</dd>
      </dl>
      <div class="section-title">Alunos vinculados</div>
      <div>
        ${alunos.length === 0 ? '<div class="empty">Nenhum aluno vinculado.</div>' :
          alunos.map((a, i) => `
            <div class="row row-clickable" data-open-aluno="${esc(a.id)}">
              <span class="num">${i + 1}</span>
              <div class="row-main">
                <div class="row-name">${esc(a.nome)}</div>
                <div class="row-meta">${esc((a.cids || []).join(', ') || 'Sem CID')}</div>
              </div>
            </div>`).join('')}
      </div>
    `,
    footerHtml: `
      ${isAdmin ? `<button class="btn btn-ghost" id="d-vinc">Vincular alunos</button>
        <button class="btn btn-primary" id="d-edit">Editar</button>` : ''}
      <button class="btn btn-ghost" data-close>Fechar</button>`,
    onMount({ host, close }) {
      host.querySelectorAll('[data-open-aluno]').forEach(el => el.onclick = () => {
        close();
        abrirDetalhesAluno(el.dataset.openAluno);
      });
      host.querySelector('#d-vinc')?.addEventListener('click', () => { close(); vincularAlunosTurma(id); });
      host.querySelector('#d-edit')?.addEventListener('click', () => { close(); formTurma(id); });
    }
  });
}

function vincularAlunosTurma(id) {
  const t = turmaPorId(id);
  if (!t) return;
  const todos = alunosAtivos().slice().sort(cmpNome);
  const vinculados = new Set(alunosDaTurma(id).map(a => a.id));

  openModal({
    title: 'Vincular alunos',
    bodyHtml: `
      <p class="row-meta" style="margin-top:0">Marque os alunos da turma ${esc(t.nome)}.</p>
      <div class="search-bar">
        <svg class="ic"><use href="#i-search"/></svg>
        <input id="busca-vinc" placeholder="Buscar aluno..." />
      </div>
      <div id="lista-vinc" style="max-height:340px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:4px">
        ${todos.length === 0 ? '<div class="empty">Nenhum aluno cadastrado.</div>' :
          todos.map(a => `
            <label class="row" style="cursor:pointer">
              <input type="checkbox" data-aluno-id="${esc(a.id)}" ${vinculados.has(a.id) ? 'checked' : ''} />
              <div class="row-main">
                <div class="row-name">${esc(a.nome)}</div>
                <div class="row-meta">${esc((a.cids || []).join(', ') || 'Sem CID')}</div>
              </div>
            </label>`).join('')}
      </div>
      <p class="row-meta" id="contador-vinc" style="margin-bottom:0"></p>
    `,
    footerHtml: `<button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="save-vinc">Salvar vínculos</button>`,
    onMount({ host, close }) {
      const busca = host.querySelector('#busca-vinc');
      const lista = host.querySelector('#lista-vinc');
      const cont = host.querySelector('#contador-vinc');
      const atualiza = () => {
        const n = lista.querySelectorAll('input[type=checkbox]:checked').length;
        cont.textContent = `${n} aluno(s) marcado(s).`;
      };
      atualiza();
      lista.addEventListener('change', atualiza);
      busca.oninput = debounce(() => {
        const q = busca.value.toLowerCase().trim();
        lista.querySelectorAll('.row').forEach(row => {
          const nome = row.querySelector('.row-name')?.textContent.toLowerCase() || '';
          row.style.display = !q || nome.includes(q) ? '' : 'none';
        });
      }, 120);
      host.querySelector('#save-vinc').onclick = async () => {
        const alunoIds = Array.from(lista.querySelectorAll('input[type=checkbox]:checked')).map(c => c.dataset.alunoId);
        const listaSalvar = state.data.turmas.map(x => x.id === id ? { ...x, alunoIds } : x);
        try {
          await salvarColecao('turmas', listaSalvar, 'Vínculos salvos.');
          close();
          render();
        } catch {}
      };
    }
  });
}

async function removerTurma(id) {
  const ok = await confirmar({ titulo: 'Excluir turma', mensagem: 'Alunos vinculados ficarão sem turma.', textoOk: 'Excluir' });
  if (!ok) return;
  const lista = state.data.turmas.filter(x => x.id !== id);
  try { await salvarColecao('turmas', lista, 'Turma excluída.'); render(); } catch {}
}

// ---------- CONFIGURAÇÕES ----------
function viewConfig(root) {
  const isAdmin = podeEditar();
  const c = state.data.config || {};

  if (!isAdmin) {
    root.innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Minha senha</h1><p class="page-sub">Altere sua senha de acesso</p></div>
      </div>
      <div class="card" style="max-width:520px">
        <form id="f-minha-senha" class="form">
          <label class="field"><span class="field-label">Nova senha (mínimo 8 caracteres)</span><input class="field-input" type="password" name="newPassword" minlength="8" required /></label>
          <label class="field"><span class="field-label">Confirmar nova senha</span><input class="field-input" type="password" name="confirm" minlength="8" required /></label>
          <button class="btn btn-primary" type="submit" style="justify-self:start">Alterar minha senha</button>
        </form>
      </div>
    `;
    root.querySelector('#f-minha-senha').onsubmit = async e => {
      e.preventDefault();
      const form = e.target;
      const p = form.newPassword.value;
      const c2 = form.confirm.value;
      if (p !== c2) return toast('As senhas não coincidem.', 'error');
      try {
        await api('/auth?action=change-password', { method: 'POST', body: JSON.stringify({ newPassword: p }) });
        form.reset();
        toast('Senha alterada.', 'success');
      } catch (err) { toast('Falha: ' + err.message, 'error'); }
    };
    return;
  }

  root.innerHTML = `
    <div class="page-head">
      <div><h1 class="page-title">Configurações</h1><p class="page-sub">Aplicação, usuários e dados</p></div>
    </div>

    <div class="section-title">Aplicação</div>
    <div class="card" style="margin-bottom:20px">
      <form id="f-config" class="form">
        <label class="field">
          <span class="field-label">Antecedência para rotas (minutos)</span>
          <input class="field-input" type="number" min="0" max="180" name="antecedenciaMinutos" value="${Number(c.antecedenciaMinutos) || 20}" />
        </label>
        <button class="btn btn-primary" type="submit" style="justify-self:start">Salvar</button>
      </form>
    </div>

    <div class="section-title">Dados</div>
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-ghost" id="exp"><svg class="ic"><use href="#i-download"/></svg>Exportar tudo</button>
        <button class="btn btn-ghost" id="imp"><svg class="ic"><use href="#i-upload"/></svg>Importar</button>
        <input type="file" id="imp-file" accept="application/json,.json" hidden />
        <button class="btn btn-danger" id="limpar-tudo" style="margin-left:auto"><svg class="ic"><use href="#i-trash"/></svg>Limpar todos os dados</button>
      </div>
      <p class="row-meta" style="margin-top:10px">Cache local atualizado em ${LS.get(cacheKey(), {})?.at ? new Date(LS.get(cacheKey()).at).toLocaleString('pt-BR') : '-'}</p>
    </div>

    <div class="section-title">Minha senha</div>
    <div class="card" style="margin-bottom:20px">
      <form id="f-minha-senha" class="form">
        <label class="field"><span class="field-label">Nova senha (mínimo 8 caracteres)</span><input class="field-input" type="password" name="newPassword" minlength="8" required /></label>
        <label class="field"><span class="field-label">Confirmar nova senha</span><input class="field-input" type="password" name="confirm" minlength="8" required /></label>
        <button class="btn btn-primary" type="submit" style="justify-self:start">Alterar minha senha</button>
      </form>
    </div>

    <div class="section-title">Usuários</div>
    <div class="group"><div class="group-head">
      <svg class="ic"><use href="#i-user"/></svg>Usuários com acesso
      <button class="btn btn-primary btn-sm" style="margin-left:auto" id="novo-usuario">Novo</button>
    </div><div class="group-body" id="lista-usuarios"></div></div>
  `;

  root.querySelector('#f-config').onsubmit = async e => {
    e.preventDefault();
    const form = e.target;
    const ant = Math.max(0, Math.min(180, Number(form.antecedenciaMinutos.value) || 20));
    const content = { ...c, antecedenciaMinutos: ant, updatedAt: nowISO() };
    try { await salvarArquivo('config', content, 'Configuração salva.'); } catch {}
  };

  root.querySelector('#exp').onclick = async () => {
    try {
      const r = await api('/data?action=export');
      const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seju-${hoje()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Exportação concluída.', 'success');
    } catch (e) { toast('Falha: ' + e.message, 'error'); }
  };

  const impFile = root.querySelector('#imp-file');
  root.querySelector('#imp').addEventListener('click', () => impFile.click());
  impFile.onchange = async () => {
    const file = impFile.files?.[0];
    if (!file) return;
    const ok = await confirmar({
      titulo: 'Importar dados',
      mensagem: 'Isto substituirá os dados atuais dos arquivos presentes no backup. Continuar?',
      textoOk: 'Importar'
    });
    if (!ok) { impFile.value = ''; return; }
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload.data) throw new Error('Formato inválido.');
      await api('/data?action=import', { method: 'POST', body: JSON.stringify({ data: payload.data }) });
      toast('Importação concluída.', 'success');
      await carregarTudo({ silencioso: true });
      render();
    } catch (e) { toast('Falha: ' + e.message, 'error'); }
    impFile.value = '';
  };

  root.querySelector('#limpar-tudo').onclick = async () => {
    const ok1 = await confirmar({
      titulo: 'Limpar todos os dados',
      mensagem: 'Esta ação apaga alunos, funcionários, escolas, turmas, atendimentos, pausas e configurações. Usuários são preservados. Deseja continuar?',
      textoOk: 'Continuar'
    });
    if (!ok1) return;

    const confirmado = await confirmarLimpezaTotal();
    if (!confirmado) return;

    try {
      await api('/data?action=reset', { method: 'POST', body: '{}' });
      await carregarTudo({ silencioso: true });
      toast('Todos os dados foram apagados.', 'success');
      render();
    } catch (e) {
      toast('Falha ao limpar: ' + e.message, 'error');
    }
  };

  root.querySelector('#f-minha-senha').onsubmit = async e => {
    e.preventDefault();
    const form = e.target;
    const p = form.newPassword.value;
    const c2 = form.confirm.value;
    if (p !== c2) return toast('As senhas não coincidem.', 'error');
    try {
      await api('/auth?action=change-password', { method: 'POST', body: JSON.stringify({ newPassword: p }) });
      form.reset();
      toast('Senha alterada.', 'success');
    } catch (err) { toast('Falha: ' + err.message, 'error'); }
  };

  carregarUsuarios(root);
  root.querySelector('#novo-usuario').onclick = () => formUsuario(null, root);
}

async function carregarUsuarios(root) {
  const box = root.querySelector('#lista-usuarios');
  if (!box) return;
  try {
    const r = await api('/auth?action=users-list');
    const users = r.users || [];
    box.innerHTML = users.length === 0 ? '<div class="empty">Nenhum usuário.</div>' :
      users.map((u, i) => {
        const func = u.funcionarioId ? funcPorId(u.funcionarioId) : null;
        return `
        <div class="row">
          <span class="num">${i + 1}</span>
          <div class="row-main">
            <div class="row-name">${esc(u.nome)} <span class="tag">${esc(u.username)}</span></div>
            <div class="row-meta">${esc(ROLES[u.role] || u.role)}${u.ativo === false ? ' · <span class="badge badge-danger">Inativo</span>' : ''}${func ? ' · Vinculado: ' + esc(func.nome) : ''}</div>
          </div>
          <div class="row-actions">
            <button class="btn btn-ghost btn-icon" data-edit-u="${esc(u.username)}" aria-label="Editar"><svg class="ic"><use href="#i-edit"/></svg></button>
            <button class="btn btn-ghost btn-icon" data-del-u="${esc(u.username)}" aria-label="Excluir"><svg class="ic"><use href="#i-trash"/></svg></button>
          </div>
        </div>`;
      }).join('');
    box.querySelectorAll('[data-edit-u]').forEach(el => el.onclick = () => {
      const u = users.find(x => x.username === el.dataset.editU);
      formUsuario(u, root);
    });
    box.querySelectorAll('[data-del-u]').forEach(el => el.onclick = () => removerUsuario(el.dataset.delU, root));
  } catch (e) {
    box.innerHTML = `<div class="empty">Falha ao carregar: ${esc(e.message)}</div>`;
  }
}

function formUsuario(u, root) {
  const isEdit = !!u;
  const funcs = state.data.funcionarios.slice().sort(cmpNome);
  openModal({
    title: isEdit ? 'Editar usuário' : 'Novo usuário',
    bodyHtml: `
      <form id="f-user" class="form">
        <label class="field"><span class="field-label">Usuário (login)</span><input class="field-input" name="username" value="${esc(u?.username || '')}" ${isEdit ? 'disabled' : ''} required /></label>
        <label class="field"><span class="field-label">Nome completo</span><input class="field-input" name="nome" value="${esc(u?.nome || '')}" required /></label>
        <label class="field"><span class="field-label">Perfil</span>
          <select class="field-select" name="role" required>
            ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${u?.role === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
          </select>
        </label>
        <label class="field"><span class="field-label">Funcionário vinculado (opcional)</span>
          <select class="field-select" name="funcionarioId">
            <option value="">Nenhum</option>
            ${funcs.map(f => `<option value="${esc(f.id)}" ${u?.funcionarioId === f.id ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span class="field-label">${isEdit ? 'Nova senha (deixe vazio para manter)' : 'Senha (mínimo 8 caracteres)'}</span>
          <input class="field-input" type="password" name="password" ${isEdit ? '' : 'required'} minlength="8" />
        </label>
        <label class="field"><span class="field-label">Usuário do GitHub (opcional, para login via GitHub)</span><input class="field-input" name="githubLogin" value="${esc(u?.githubLogin || '')}" /></label>
        <div class="field">
          <label class="check ${u?.ativo !== false ? 'on' : ''}" id="ativo-check">
            <input type="checkbox" name="ativo" ${u?.ativo !== false ? 'checked' : ''} />Ativo
          </label>
        </div>
      </form>`,
    footerHtml: `<button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn btn-primary" id="save-user">${isEdit ? 'Salvar' : 'Criar'}</button>`,
    onMount({ host, close }) {
      const chk = host.querySelector('#ativo-check');
      chk.onclick = e => { e.preventDefault(); chk.classList.toggle('on'); chk.querySelector('input').checked = chk.classList.contains('on'); };
      host.querySelector('#save-user').onclick = async () => {
        const form = host.querySelector('#f-user');
        if (!form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form).entries());
        data.username = (u?.username || data.username || '').toLowerCase().trim();
        data.ativo = chk.classList.contains('on');
        if (!data.password) delete data.password;
        if (!data.funcionarioId) data.funcionarioId = null;
        try {
          await api('/auth?action=users-save', { method: 'POST', body: JSON.stringify(data) });
          toast(isEdit ? 'Usuário atualizado.' : 'Usuário criado.', 'success');
          close();
          carregarUsuarios(root);
        } catch (e) { toast('Falha: ' + e.message, 'error'); }
      };
    }
  });
}

async function removerUsuario(username, root) {
  const ok = await confirmar({
    titulo: 'Excluir usuário',
    mensagem: `Excluir o acesso de ${username}?`,
    textoOk: 'Excluir'
  });
  if (!ok) return;
  try {
    await api('/auth?action=users-delete', { method: 'POST', body: JSON.stringify({ username }) });
    toast('Usuário excluído.', 'success');
    carregarUsuarios(root);
  } catch (e) { toast('Falha: ' + e.message, 'error'); }
}

// ============================================================
// Bootstrap
// ============================================================

function aplicarTema(tema) {
  const root = document.documentElement;
  const atual = tema === 'light' ? 'light' : 'dark';
  root.setAttribute('data-theme', atual);

  const isLight = atual === 'light';
  $$('.sidebar-theme-icon use').forEach(u => {
    u.setAttribute('href', isLight ? '#i-sun' : '#i-moon');
  });
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', isLight ? '#F6F6F5' : '#0A0A0B');
  LS.set('seju_tema', atual);
}

function alternarTema() {
  const atual = document.documentElement.getAttribute('data-theme') || 'dark';
  aplicarTema(atual === 'dark' ? 'light' : 'dark');
}

async function startApp() {
  LS.set('seju_user', state.user);
  LS.set('seju_token', state.token);
  loadCache();
  routeTo(routeFromHash());
  try {
    await carregarTudo({ silencioso: true });
    render();
  } catch (e) {
    if (e.status === 401) {
      state.token = null; state.user = null;
      LS.del('seju_token'); LS.del('seju_user');
      return renderLogin();
    }
    if (!state.online) toast('Modo offline. Exibindo dados em cache.');
  }
}

async function boot() {
  // Tema
  const temaSalvo = LS.get('seju_tema', null);
  if (temaSalvo) {
    aplicarTema(temaSalvo);
  } else {
    const prefereClaro = window.matchMedia('(prefers-color-scheme: light)').matches;
    aplicarTema(prefereClaro ? 'light' : 'dark');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  window.addEventListener('online', () => { state.online = true; toast('Reconectado.', 'success'); render(); sincronizarManual(); });
  window.addEventListener('offline', () => { state.online = false; render(); });

  const menuBtn = $('#btn-menu');
  if (menuBtn) menuBtn.onclick = openSidebar;
  const closeBtn = $('#btn-sidebar-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fecharSidebar();
    });
  }
  const scrim = $('#scrim');
  if (scrim) scrim.onclick = fecharSidebar;
  const syncBtn = $('#btn-sync');
  if (syncBtn) syncBtn.onclick = sincronizarManual;
  const syncMobile = $('#btn-sync-mobile');
  if (syncMobile) syncMobile.onclick = sincronizarManual;
  const logoutBtn = $('#btn-logout');
  if (logoutBtn) logoutBtn.onclick = logout;
  const themeBtn = $('#btn-theme');
  if (themeBtn) themeBtn.onclick = alternarTema;
  const themeMobile = $('#btn-theme-mobile');
  if (themeMobile) themeMobile.onclick = alternarTema;

  // Collapse da sidebar (desktop)
  const aplicarCollapse = (colapsada) => {
    const root = document.documentElement;
    if (colapsada) root.setAttribute('data-sidebar', 'collapsed');
    else root.removeAttribute('data-sidebar');
    LS.set('seju_sidebar_colapsada', !!colapsada);
  };

  const collapseBtn = $('#btn-sidebar-collapse');
  if (collapseBtn) {
    collapseBtn.onclick = () => {
      const atual = document.documentElement.getAttribute('data-sidebar') === 'collapsed';
      aplicarCollapse(!atual);
    };
  }

  const colapsadaSalva = LS.get('seju_sidebar_colapsada', false);
  if (colapsadaSalva) aplicarCollapse(true);

  window.addEventListener('hashchange', () => {
    if (!state.user) return;
    const r = routeFromHash();
    if (r !== state.route) { state.route = r; render(); }
  });

  const url = new URL(location.href);
  const tok = url.searchParams.get('token');
  const loginError = url.searchParams.get('login_error');
  if (tok) {
    state.token = tok;
    LS.set('seju_token', tok);
    url.searchParams.delete('token');
    history.replaceState({}, '', url.pathname + url.hash);
  }
  if (loginError) {
    url.searchParams.delete('login_error');
    history.replaceState({}, '', url.pathname + url.hash);
    setTimeout(() => toast('Falha no login: ' + loginError, 'error'), 100);
  }

  renderLogin();

  const savedTok = state.token || LS.get('seju_token', null);
  const savedUser = LS.get('seju_user', null);
  if (savedTok) {
    state.token = savedTok;
    try {
      const r = await api('/auth?action=me');
      state.user = r.user;
      await startApp();
      return;
    } catch (e) {
      if (e.status === 401) {
        state.token = null; state.user = null;
        LS.del('seju_token'); LS.del('seju_user');
        renderLogin();
        return;
      }
      if (savedUser) {
        state.user = savedUser;
        await startApp();
        return;
      }
    }
  }
  renderLogin();
}

boot();
