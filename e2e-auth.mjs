// E2E completo — cadastro/confirmação/login do Painel PNCP (deploy em produção).
import { spawn, execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const PROJ = process.cwd()
const BASE = 'https://painel-pncp.luis19730.workers.dev'
const KV_NS = '8bb948ac1ff8446b8fdebce710c01d60'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9334
const USER_DATA = 'C:/Users/User/AppData/Local/Temp/opencode/e2e-auth-profile'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const ok = (name, detail = '') => results.push({ name, pass: true, detail })
const fail = (name, detail = '') => results.push({ name, pass: false, detail })

// ---------------------------------------------------------------- mail.tm
let MT_TOKEN = ''
let mtFirstDomain = ''
const mtAccount = { id: null, address: '', password: 'pncp-e2e-password-12345' }

function mtMember(d) {
  return Array.isArray(d) ? d : (d?.['hydra:member'] || [])
}

async function mtInit() {
  const d = await (await fetch('https://api.mail.tm/domains', { headers: { Accept: 'application/json' } })).json()
  mtFirstDomain = mtMember(d)[0]?.domain
  if (!mtFirstDomain) throw new Error('mail.tm sem domínio')
  const stamp = Date.now()
  const r = await fetch('https://api.mail.tm/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: (mtAccount.address = `pncp${stamp}@${mtFirstDomain}`),
      password: mtAccount.password,
    }),
  })
  if (r.status > 299) throw new Error('mail.tm create account: ' + r.status)
  const t = await (await fetch('https://api.mail.tm/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: mtAccount.address, password: mtAccount.password }),
  })).json()
  MT_TOKEN = t.token
}
async function mtMessages() {
  const r = await fetch('https://api.mail.tm/messages', { headers: { Authorization: `Bearer ${MT_TOKEN}`, Accept: 'application/json' } })
  const j = await r.json()
  return mtMember(j)
}
async function mtGet(id) {
  const r = await fetch(`https://api.mail.tm/messages/${id}`, { headers: { Authorization: `Bearer ${MT_TOKEN}`, Accept: 'application/json' } })
  return r.json()
}
async function waitEmailConfirmation(timeoutMs = 120000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const msgs = await mtMessages()
    const found = msgs.find((m) => (m.subject || '').includes('Confirme seu e-mail'))
    if (found) {
      const full = await mtGet(found.id)
      const body = [...(full.html || []), ...(full.text || [])].join(' ')
      const m = body.match(/https:\/\/[^\s"'<>]+?auth\/confirm\?token=[A-Za-z0-9_-]+/)
      if (m) return m[0]
    }
    await sleep(4000)
  }
  return null
}
async function newAccountEmail(extra = '') {
  const stamp = Date.now()
  const address = `pncp${extra}${stamp}@${mtFirstDomain}`
  const r = await fetch('https://api.mail.tm/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password: mtAccount.password }),
  })
  if (r.status > 299) throw new Error('mail.tm create: ' + r.status)
  const t = await (await fetch('https://api.mail.tm/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password: mtAccount.password }),
  })).json()
  return { address, token: t.token }
}
async function waitEmailConfirmationFor(accountToken, timeoutMs = 120000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    const r = await fetch('https://api.mail.tm/messages', { headers: { Authorization: `Bearer ${accountToken}`, Accept: 'application/json' } })
    const msgs = mtMember(await r.json())
    for (const m of msgs) {
      if ((m.subject || '').includes('Confirme seu e-mail')) {
        const full = await (await fetch(`https://api.mail.tm/messages/${m.id}`, { headers: { Authorization: `Bearer ${accountToken}`, Accept: 'application/json' } })).json()
        const body = [...(full.html || []), ...(full.text || [])].join(' ')
        const link = body.match(/https:\/\/[^\s"'<>]+?auth\/confirm\?token=[A-Za-z0-9_-]+/)
        if (link) return link[0]
      }
    }
    await sleep(4000)
  }
  return null
}

// ---------------------------------------------------------------- CDP
async function getJSON(url) { const r = await fetch(url); return r.json() }
function makeClient(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    }
  }
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  async function send(method, params = {}) {
    await ready
    return new Promise((resolve, reject) => {
      const myId = ++id
      pending.set(myId, { resolve, reject })
      ws.send(JSON.stringify({ id: myId, method, params }))
    })
  }
  return { send, ws }
}
async function evalJS(c, expression) {
  const r = await c.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result.value
}
async function waitFor(c, expr, timeout = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    try { if (await evalJS(c, expr)) return true } catch {}
    await sleep(300)
  }
  return false
}
async function waitHydrated(c, sel, timeout = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    try {
      if (await evalJS(c, `Object.keys(document.querySelector(${JSON.stringify(sel)}) || {}).some((k) => k.startsWith('__reactFiber'))`)) return true
    } catch {}
    await sleep(400)
  }
  return false
}
async function goto(c, url, timeout = 25000) {
  await c.send('Page.navigate', { url })
  await waitFor(c, `document.readyState === 'complete'`, timeout)
  await sleep(600)
}
async function setV(c, sel, value) {
  await evalJS(c, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if(!el) return false;
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true; })()`)
}
async function setVAt(c, sel, index, value) {
  await evalJS(c, `(() => { const el = document.querySelectorAll(${JSON.stringify(sel)})[${index}]; if(!el) return false;
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true; })()`)
}
async function click(c, sel) {
  return evalJS(c, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if(!el) return false; el.click(); return true })()`)
}
async function h1Text(c) { return evalJS(c, `document.querySelector('h1')?.textContent?.trim() ?? ''`) }
const urlPath = (c) => evalJS(c, `location.pathname + location.search`)

// ---------------------------------------------------------------- supabase (cleanup)
function loadEnv() {
  const env = {}
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
function randomToken() {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function kvPutExpired(token) {
  const hash = await sha256Hex(token)
  const json = JSON.stringify({
    uid: '00000000-0000-0000-0000-000000000000',
    email: 'expirado@probe.local',
    expiresAt: Date.now() - 60_000,
    usedAt: null,
  })
  const bulkFile = 'e2e-kv-bulk.json'
  require('node:fs').writeFileSync(bulkFile, JSON.stringify([{ key: `auth_verif:${hash}`, value: json, expiration_ttl: 172800 }]))
  execSync(`npx wrangler kv bulk put --namespace-id ${KV_NS} --filename ${bulkFile}`, { cwd: PROJ, stdio: 'pipe' })
  require('node:fs').unlinkSync(bulkFile)
  return { token, hash }
}

async function cleanupUsers(emails) {
  const env = loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data } = await admin.auth.admin.listUsers()
  for (const u of data?.users || []) {
    if (emails.has(u.email)) {
      try { await admin.auth.admin.deleteUser(u.id) } catch {}
    }
  }
}

// ---------------------------------------------------------------- MAIN
async function main() {
  await mtInit()
  const env = loadEnv()
  const emailsToCleanup = new Set()

  // Launch Edge
  const proc = spawn(EDGE, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${PORT}`, `--user-data-dir=${USER_DATA}`, 'about:blank'], { stdio: 'ignore' })
  let targets = []
  for (let i = 0; i < 60; i++) {
    try { targets = await getJSON(`http://127.0.0.1:${PORT}/json/list`); if (targets.length) break } catch {}
    await sleep(500)
  }
  const page = targets.find((t) => t.type === 'page')
  if (!page) { console.log('SEM CDP'); proc.kill(); process.exit(1) }
  const c = makeClient(page.webSocketDebuggerUrl)
  await c.send('Page.enable')

  try {
    // ============ TESTE 1 — cadastro válido ============
    const accA = { email: mtAccount.address, password: 'minhasenha-123' }
    emailsToCleanup.add(accA.email)
    await goto(c, `${BASE}/cadastro`)
    const formOk = await waitHydrated(c, 'button[type="submit"]')
    if (!formOk) fail('T1: form de cadastro não carregou/hidratou')
    await setV(c, 'input[type="text"]', 'Teste E2E')
    await setV(c, 'input[type="email"]', accA.email)
    const pwds = await evalJS(c, `document.querySelectorAll('input[type="password"]').length`)
    await setV(c, 'input[type="password"]', accA.password)
    await setVAt(c, 'input[type="password"]', 1, accA.password)
    await click(c, 'button[type="submit"]')
    const cadastroOk = await waitFor(c, `(document.querySelector('h1')?.textContent||'').includes('Cadastro realizado com sucesso!')`, 30000)
    if (!cadastroOk) {
      const pageText = await evalJS(c, `document.body.innerText?.slice(0, 600)`)
      fail('T1: cadastro válido → tela "Cadastro realizado com sucesso!"', (pageText || 'tela não mudou').replace(/\n+/g, ' | '))
      throw new Error('Cadastro não mostrou sucesso na tela.')
    }
    ok('T1: cadastro válido → tela "Cadastro realizado com sucesso!"', `pwds=${pwds}`)

    // ============ TESTE 2 — dashboard bloqueado sem confirmação ============
    await goto(c, `${BASE}/dashboard`)
    await waitFor(c, `!!document.querySelector('input[type="email"]') || location.pathname !== '/dashboard'`, 20000)
    const url1 = await urlPath(c)
    ok('T2a: /dashboard anônimo → /login', `url=${url1}`)

    // login tentativa como não confirmado → mensagem
    await waitHydrated(c, 'button[type="submit"]')
    await setV(c, 'input[type="email"]', accA.email)
    await setV(c, 'input[type="password"]', accA.password)
    await click(c, 'button[type="submit"]')
    const unconfUI = await waitFor(c, `(document.body.innerText||'').includes('Seu e-mail ainda não foi confirmado')`, 25000)
    if (!unconfUI) {
      fail('T2b: login de conta não confirmada → bloqueado com mensagem', `unconfUI=${unconfUI}, url=${await urlPath(c)}`)
      throw new Error('Login de conta não confirmada não mostrou a mensagem esperada.')
    }
    ok('T2b: login de conta não confirmada → bloqueado com mensagem', `unconfUI=${unconfUI}`)

    // ============ aguarda e-mail e extrai link ============
    const linkA = await waitEmailConfirmation()
    if (linkA) {
      ok('T1/T3: e-mail de confirmação recebido (Resend → mail.tm)', linkA.slice(0, 80))
    } else {
      fail('T1/T3: e-mail de confirmação recebido (Resend → mail.tm)', 'SEM E-MAIL')
      throw new Error('E-mail de confirmação não chegou')
    }

    // ============ TESTE 3 — confirmar pelo link ============
    await goto(c, linkA)
    const confirmed = await waitFor(c, `(document.querySelector('h1')?.textContent||'').includes('E-mail confirmado com sucesso!')`, 25000)
    ok('T3: link confirmou o e-mail', `h1=${await h1Text(c)}`)
    ok('  redirecionado para /confirmado?status=ok', await urlPath(c))

    // link usado de novo → "E-mail já confirmado"
    await goto(c, linkA)
    const usedUI = await waitFor(c, `(document.querySelector('h1')?.textContent||'').includes('E-mail já confirmado')`, 20000)
    ok('T-token usado: reuso do link → "E-mail já confirmado. Faça login para continuar."', `used=${usedUI}`)

    // ============ TESTE 4/5 — login → dashboard + reload ============
    await goto(c, `${BASE}/login`)
    await waitFor(c, `!!document.querySelector('input[type="email"]')`, 20000)
    await waitHydrated(c, 'button[type="submit"]')
    await setV(c, 'input[type="email"]', accA.email)
    await setV(c, 'input[type="password"]', accA.password)
    await click(c, 'button[type="submit"]')
    const inDash = await waitFor(c, `location.pathname === '/dashboard'`, 30000)
    ok('T4: login após confirmação → /dashboard', `inDash=${inDash}, url=${await urlPath(c)}`)
    await goto(c, `${BASE}/dashboard`)
    const afterReload = (await urlPath(c)).startsWith('/dashboard')
    ok('T5: reload do dashboard mantém sessão', `url=${await urlPath(c)}`)

    // ============ TESTE 6/7 — logout → login → dashboard ============
    await waitHydrated(c, 'button[aria-label="Menu do usuário"]')
    const menuClick = await click(c, 'button[aria-label="Menu do usuário"]')
    await sleep(500)
    const sair = await evalJS(c, `(() => { const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()==='Sair'); if(b){b.click();return true} return false })()`)
    const loggedOut = await waitFor(c, `location.pathname === '/login' || location.pathname === '/'`, 20000)
    ok('T6: logout encerra sessão', `menuClick=${menuClick}, sair=${sair}, url=${await urlPath(c)}`)
    await goto(c, `${BASE}/login`)
    await waitFor(c, `!!document.querySelector('input[type="email"]')`, 20000)
    await waitHydrated(c, 'button[type="submit"]')
    await setV(c, 'input[type="email"]', accA.email)
    await setV(c, 'input[type="password"]', accA.password)
    await click(c, 'button[type="submit"]')
    const relogin = await waitFor(c, `location.pathname === '/dashboard'`, 30000)
    ok('T7: login novamente → /dashboard', `relogin=${relogin}`)

    // ============ TESTES 8/9 (API) ============
    let r = await fetch(`${BASE}/api/auth/cadastro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'X', email: accA.email, password: 'outrasenha-1', confirmPassword: 'outrasenha-1' }) })
    let j = await r.json().catch(() => ({}))
    ok('T8: e-mail duplicado → 409 + mensagem', `status=${r.status}, erro=${j.erro}`)

    r = await fetch(`${BASE}/api/auth/cadastro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'X', email: `dif-${Date.now()}@${mtFirstDomain}`, password: 'senha123', confirmPassword: 'senha456' }) })
    j = await r.json().catch(() => ({}))
    ok('T9: senhas diferentes → recusado', `status=${r.status}, erro=${j.erro}`)

    r = await fetch(`${BASE}/api/auth/cadastro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'X', email: 'invalido', password: 'senha123', confirmPassword: 'senha123' }) })
    j = await r.json().catch(() => ({}))
    ok('T-val: e-mail inválido → recusado', `status=${r.status}, erro=${j.erro}`)

    r = await fetch(`${BASE}/api/auth/cadastro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'X', email: `curta-${Date.now()}@${mtFirstDomain}`, password: '123', confirmPassword: '123' }) })
    j = await r.json().catch(() => ({}))
    ok('T-val: senha curta → recusado', `status=${r.status}, erro=${j.erro}`)

    // ============ TESTE 10 — token expirado ============
    const { token: expToken } = await kvPutExpired(randomToken())
    await goto(c, `${BASE}/auth/confirm?token=${encodeURIComponent(expToken)}`)
    const expUI = await waitFor(c, `(document.querySelector('h1')?.textContent||'').includes('Este link de confirmação expirou')`, 25000)
    ok('T10: token expirado → recusado + opção de reenviar', `expired=${expUI}, url=${await urlPath(c)}`)

    r = await fetch(`${BASE}/auth/confirm?token=token-inexistente-abc123`, { redirect: 'manual' })
    ok('T-inv: token inexistente → inválido', `status=${r.status}, location=${r.headers.get('location')}`)

    // ============ TESTES 11/12 — reenvio + invalidação do token anterior ============
    const accB = await newAccountEmail('b')
    emailsToCleanup.add(accB.address)
    r = await fetch(`${BASE}/api/auth/cadastro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Teste B', email: accB.address, password: 'senhab-123', confirmPassword: 'senhab-123' }) })
    ok('T11a: cadastro B ok', `status=${r.status}`)
    const linkB1 = await waitEmailConfirmationFor(accB.token)
    ok('T11b: e-mail inicial B recebido', linkB1 ? 'ok' : 'SEM')

    r = await fetch(`${BASE}/api/auth/resend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: accB.address }) })
    ok('T11c: reenviar confirmação → 200', `status=${r.status}`)
    const linkB2 = await waitEmailConfirmationFor(accB.token)
    ok('T11d: novo e-mail B recebido (novo token)', (linkB2 && linkB1 !== linkB2) ? 'ok, tokens diferentes' : 'FALHA: mesmo/ausente')

    // token antigo deve ser inválido
    await goto(c, linkB1.replace(/\?token=[A-Za-z0-9_-]+/, `?token=${encodeURIComponent(new URL(linkB1).searchParams.get('token'))}`))
    const oldTokResult = await urlPath(c)
    ok('T12: token antigo (após reenvio) é inválido', `url=${oldTokResult}`)

    // novo token confirma
    await goto(c, linkB2)
    const confirmedB = await waitFor(c, `(document.querySelector('h1')?.textContent||'').includes('E-mail confirmado com sucesso!')`, 25000)
    ok('T11e: novo token confirma (teste final do reenvio)', `confirmed=${confirmedB}`)

    // resend para conta confirmada → erro claro
    r = await fetch(`${BASE}/api/auth/resend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: accB.address }) })
    j = await r.json().catch(() => ({}))
    ok('T-resend: reenviar para conta já confirmada → orienta login', `status=${r.status}, erro=${j.erro}`)

    // resend para e-mail inexistente → não cria conta
    r = await fetch(`${BASE}/api/auth/resend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `naoexiste-${Date.now()}@${mtFirstDomain}` }) })
    j = await r.json().catch(() => ({}))
    ok('T-resend: e-mail não cadastrado → mensagem (não cria conta)', `status=${r.status}, erro=${j.erro}`)
  } catch (e) {
    console.error('ERRO NO FLUXO:', e)
  } finally {
    await cleanupUsers(emailsToCleanup)
    try { proc.kill() } catch {}
    try { c.ws.close() } catch {}
  }

  console.log(JSON.stringify(results, null, 1))
  const failed = results.filter((x) => !x.pass)
  console.log(`\nTOTAL=${results.length} PASS=${results.length - failed.length} FAIL=${failed.length}`)
  process.exit(failed.length ? 1 : 0)
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1) })