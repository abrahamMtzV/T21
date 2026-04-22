/* ============================================================
   T21 — Un Antojo con Propósito | app.js  v3
   Lectura de config: Google Sheets API (gratis, ilimitado)
   Escritura de ventas: Make webhook (consume operaciones)
============================================================ */
'use strict';

/* ── ESTADO ─────────────────────────────────────────────── */
const DEFAULT_FLAVORS = [
  'Panditas','Sandías Mini','Aros de Manzana','Aros de Durazno',
  'Aros de Sandía','Cubitos','Tiburones','Xtreme Frutas',
  'Xtremes Mora Azul','Viboritas','Naranja Gajos'
];

const STATE = {
  flavors: [...DEFAULT_FLAVORS],
  cartItems: [],
  cartIdCounter: 0,
  paletas: { paletaCereza: 0, paletaSandia: 0 },
  salsa: 0,
  charolas: [],
  charolaIdCounter: 0,
  config: {
    webhookUrl:   '',
    sheetsId:     '',
    sheetsApiKey: '',
    paletaPrice:  15,
    charolaPrice: 75,
    gomiChica:    15,
    gomiMediana:  20,
    gomiGrande:   30
  }
};

const GOMI_PRICES = {
  get chica()   { return STATE.config.gomiChica;   },
  get mediana() { return STATE.config.gomiMediana; },
  get grande()  { return STATE.config.gomiGrande;  }
};

/* ── PERSISTENCIA LOCAL ──────────────────────────────────── */
const LS_KEY = 't21_v3';

function saveLocal() {
  try {
    const snap = {
      flavors: STATE.flavors,
      cartItems: STATE.cartItems,
      cartIdCounter: STATE.cartIdCounter,
      paletas: STATE.paletas,
      salsa: STATE.salsa,
      charolas: STATE.charolas,
      charolaIdCounter: STATE.charolaIdCounter,
      config: STATE.config,
      form: {
        clientName:      q('clientName')?.value      || '',
        deliveryDate:    q('deliveryDate')?.value    || '',
        deliveryTime:    q('deliveryTime')?.value    || '',
        deliveryAddress: q('deliveryAddress')?.value || '',
        salsaPrice:      q('salsaPrice')?.value      || '60',
        envioOn:         q('envioToggle')?.checked   || false,
        envioPrice:      q('envioPrice')?.value      || '50'
      }
    };
    localStorage.setItem(LS_KEY, JSON.stringify(snap));
  } catch(e) { console.warn('saveLocal:', e); }
}

function q(id) { return document.getElementById(id); }

function restoreLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (s.flavors)          STATE.flavors          = s.flavors;
    if (s.cartItems)        STATE.cartItems        = s.cartItems;
    if (s.cartIdCounter)    STATE.cartIdCounter    = s.cartIdCounter;
    if (s.paletas)          STATE.paletas          = s.paletas;
    if (typeof s.salsa === 'number') STATE.salsa   = s.salsa;
    if (s.charolas)         STATE.charolas         = s.charolas;
    if (s.charolaIdCounter) STATE.charolaIdCounter = s.charolaIdCounter;
    if (s.config)           Object.assign(STATE.config, s.config);
    if (s.form) {
      setTimeout(() => {
        const f = s.form;
        if (f.clientName)      q('clientName').value      = f.clientName;
        if (f.deliveryDate)    q('deliveryDate').value    = f.deliveryDate;
        if (f.deliveryTime)    q('deliveryTime').value    = f.deliveryTime;
        if (f.deliveryAddress) q('deliveryAddress').value = f.deliveryAddress;
        if (f.salsaPrice)      q('salsaPrice').value      = f.salsaPrice;
        if (f.envioOn)         q('envioToggle').checked   = f.envioOn;
        if (f.envioPrice)      q('envioPrice').value      = f.envioPrice;
        q('paletaCerezaVal').textContent = STATE.paletas.paletaCereza;
        q('paletaSandiaVal').textContent  = STATE.paletas.paletaSandia;
        q('salsaVal').textContent         = STATE.salsa;
      }, 0);
    }
    return true;
  } catch(e) { return false; }
}

/* ── GOOGLE SHEETS API: LEER CONFIG ─────────────────────────
   Hoja "Config" → columna A = clave, columna B = valor
   No consume operaciones de Make. Lectura directa y gratuita.
──────────────────────────────────────────────────────────── */
async function loadConfigFromSheets() {
  const { sheetsId, sheetsApiKey } = STATE.config;
  if (!sheetsId || !sheetsApiKey) return false;
  setConfigStatus('⏳ Sincronizando config…', '#1a73e8');
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/Config!A2:B50?key=${sheetsApiKey}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { values = [] } = await res.json();

    const cfg = {};
    values.forEach(row => { if (row[0] && row[1] !== undefined) cfg[row[0].trim()] = row[1].trim(); });

    if (cfg.gomiChica)    STATE.config.gomiChica    = parseFloat(cfg.gomiChica)    || STATE.config.gomiChica;
    if (cfg.gomiMediana)  STATE.config.gomiMediana  = parseFloat(cfg.gomiMediana)  || STATE.config.gomiMediana;
    if (cfg.gomiGrande)   STATE.config.gomiGrande   = parseFloat(cfg.gomiGrande)   || STATE.config.gomiGrande;
    if (cfg.paletaPrice)  STATE.config.paletaPrice  = parseFloat(cfg.paletaPrice)  || STATE.config.paletaPrice;
    if (cfg.charolaPrice) STATE.config.charolaPrice = parseFloat(cfg.charolaPrice) || STATE.config.charolaPrice;
    if (cfg.webhookUrl)   STATE.config.webhookUrl   = cfg.webhookUrl;
    if (cfg.sabores)      STATE.flavors = cfg.sabores.split('|').map(s => s.trim()).filter(Boolean);

    saveLocal();
    setConfigStatus('✅ Config sincronizada', '#27ae60');
    setTimeout(() => { const el = q('configStatus'); if (el) el.style.display = 'none'; }, 3500);
    return true;
  } catch(err) {
    setConfigStatus('⚠️ Sin conexión a Sheets — usando config local', '#f39c12');
    return false;
  }
}

function setConfigStatus(msg, color) {
  const el = q('configStatus');
  if (!el) return;
  el.textContent = msg;
  el.style.color = color;
  el.style.display = 'block';
}

/* ── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const hadLocal = restoreLocal();
  updatePriceLabels();
  renderGomitas();
  renderCharolas();
  if (!hadLocal) setToday();
  adjustSpacer();
  window.addEventListener('resize', adjustSpacer);

  ['clientName','deliveryDate','deliveryTime','deliveryAddress','salsaPrice','envioPrice']
    .forEach(id => {
      q(id)?.addEventListener('input',  saveLocal);
      q(id)?.addEventListener('change', saveLocal);
    });
  q('envioToggle')?.addEventListener('change', saveLocal);

  if (STATE.config.sheetsId && STATE.config.sheetsApiKey) {
    const ok = await loadConfigFromSheets();
    if (ok) { updatePriceLabels(); renderGomitas(); recalcTotal(); }
  }
});

function adjustSpacer() {
  const bar = q('totalBar'), spacer = q('totalSpacer');
  if (bar && spacer) spacer.style.height = (bar.offsetHeight + 16) + 'px';
}
function setToday() {
  q('deliveryDate').value = new Date().toISOString().split('T')[0];
}

/* ── CONFIGURACIÓN ─────────────────────────────────────────── */
function openConfig() {
  q('configWebhook').value      = STATE.config.webhookUrl;
  q('configSheetsId').value     = STATE.config.sheetsId;
  q('configSheetsKey').value    = STATE.config.sheetsApiKey;
  q('configPaletaPrice').value  = STATE.config.paletaPrice;
  q('configCharolaPrice').value = STATE.config.charolaPrice;
  q('configGomiChica').value    = STATE.config.gomiChica;
  q('configGomiMediana').value  = STATE.config.gomiMediana;
  q('configGomiGrande').value   = STATE.config.gomiGrande;
  new bootstrap.Modal(q('modalConfig')).show();
}

function updatePriceLabels() {
  const p = STATE.config.paletaPrice;
  const e1 = q('pricePaletaCereza'); if (e1) e1.textContent = '$' + p + ' c/u';
  const e2 = q('pricePaletaSandia');  if (e2) e2.textContent = '$' + p + ' c/u';
  const bc = q('badgeChica');   if (bc) bc.textContent = 'Chica $'   + STATE.config.gomiChica;
  const bm = q('badgeMediana'); if (bm) bm.textContent = 'Mediana $' + STATE.config.gomiMediana;
  const bg = q('badgeGrande');  if (bg) bg.textContent = 'Grande $'  + STATE.config.gomiGrande;
}

async function saveConfig() {
  STATE.config.webhookUrl   = q('configWebhook').value.trim();
  STATE.config.sheetsId     = q('configSheetsId').value.trim();
  STATE.config.sheetsApiKey = q('configSheetsKey').value.trim();
  STATE.config.paletaPrice  = parseFloat(q('configPaletaPrice').value)  || 15;
  STATE.config.charolaPrice = parseFloat(q('configCharolaPrice').value) || 75;
  STATE.config.gomiChica    = parseFloat(q('configGomiChica').value)    || 15;
  STATE.config.gomiMediana  = parseFloat(q('configGomiMediana').value)  || 20;
  STATE.config.gomiGrande   = parseFloat(q('configGomiGrande').value)   || 30;
  saveLocal();
  updatePriceLabels();
  bootstrap.Modal.getInstance(q('modalConfig')).hide();
  showToast('✅ Configuración guardada');
  recalcTotal();
  if (STATE.config.sheetsId && STATE.config.sheetsApiKey) {
    const ok = await loadConfigFromSheets();
    if (ok) { updatePriceLabels(); renderGomitas(); recalcTotal(); }
  }
}

/* ── VALIDACIÓN ─────────────────────────────────────────────── */
function validateBeforeTicket() {
  const name = q('clientName').value.trim();
  const date = q('deliveryDate').value;
  const time = q('deliveryTime').value;
  const errors = [];
  if (!name) errors.push('• Nombre del cliente');
  if (!date) errors.push('• Fecha de entrega');
  if (!time) errors.push('• Hora de entrega');
  const hasProducts = STATE.cartItems.length > 0 || STATE.paletas.paletaCereza > 0 ||
    STATE.paletas.paletaSandia > 0 || STATE.salsa > 0 || STATE.charolas.length > 0;
  if (!hasProducts) errors.push('• Al menos un producto');
  if (errors.length > 0) { showToast('⚠️ Faltan:\n' + errors.join('\n'), true); return false; }
  if (name.length > 80)  { showToast('⚠️ Nombre demasiado largo (máx. 80)', true); return false; }
  return true;
}

/* ── GOMITAS ────────────────────────────────────────────────── */
function renderGomitas() {
  const container = q('gomiList');
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'flavor-grid mb-3';
  STATE.flavors.forEach((flavor, idx) => {
    const btn = document.createElement('button');
    btn.className = 'flavor-chip';
    btn.textContent = '🍬 ' + flavor;
    btn.onclick = () => openAddToCart(idx);
    grid.appendChild(btn);
  });
  container.appendChild(grid);
  renderGomiCart();
}

function renderGomiCart() {
  let el = q('gomiCartList');
  if (!el) { el = document.createElement('div'); el.id = 'gomiCartList'; q('gomiList').appendChild(el); }
  el.innerHTML = '';
  if (!STATE.cartItems.length) {
    el.innerHTML = '<div class="text-muted small text-center py-2">Sin gomitas agregadas</div>';
    return;
  }
  STATE.cartItems.forEach(item => {
    const presLabel = item.pres==='chamoy'?'🌶️ Chamoy':item.pres==='escarchada'?'🧂 Escarchada':'🍬 Sola';
    const sizeLabel = item.size[0].toUpperCase() + item.size.slice(1);
    const div = document.createElement('div');
    div.className = 'cart-item fade-in';
    div.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-name">${item.flavor}</span>
        <span class="cart-item-detail">${sizeLabel} · ${presLabel}</span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <div class="qty-control">
          <button class="qty-btn" onclick="cartChangeQty(${item.id},-1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="cartChangeQty(${item.id},1)">+</button>
        </div>
        <span class="cart-item-price">$${(item.qty*item.price).toFixed(2)}</span>
        <button class="btn-del-flavor" onclick="cartRemove(${item.id})">🗑️</button>
      </div>`;
    el.appendChild(div);
  });
}

function openAddToCart(idx) {
  q('addCartFlavorIdx').value = idx;
  q('addCartFlavorName').textContent = STATE.flavors[idx];
  q('sizeMediana').checked = true;
  q('presChamoy').checked  = true;
  q('addCartQty').textContent = '1';
  document._addCartQtyVal = 1;
  q('lblChica').textContent   = '$' + STATE.config.gomiChica;
  q('lblMediana').textContent = '$' + STATE.config.gomiMediana;
  q('lblGrande').textContent  = '$' + STATE.config.gomiGrande;
  new bootstrap.Modal(q('modalAddToCart')).show();
}

function addCartQtyChange(delta) {
  document._addCartQtyVal = Math.max(1, (document._addCartQtyVal||1) + delta);
  q('addCartQty').textContent = document._addCartQtyVal;
}

function confirmAddToCart() {
  const idx   = parseInt(q('addCartFlavorIdx').value);
  const size  = document.querySelector('input[name="addCartSize"]:checked')?.value || 'mediana';
  const pres  = document.querySelector('input[name="addCartPres"]:checked')?.value || 'chamoy';
  const qty   = document._addCartQtyVal || 1;
  STATE.cartItems.push({ id: ++STATE.cartIdCounter, flavor: STATE.flavors[idx], size, pres, qty, price: GOMI_PRICES[size] });
  bootstrap.Modal.getInstance(q('modalAddToCart')).hide();
  renderGomiCart(); recalcTotal(); saveLocal();
  showToast('🍬 Agregado al carrito');
}

function cartChangeQty(id, delta) {
  const item = STATE.cartItems.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderGomiCart(); recalcTotal(); saveLocal();
}
function cartRemove(id) {
  STATE.cartItems = STATE.cartItems.filter(i => i.id !== id);
  renderGomiCart(); recalcTotal(); saveLocal();
}

/* ── CRUD SABORES ───────────────────────────────────────────── */
function openManageFlavors() { renderManageFlavors(); new bootstrap.Modal(q('modalManageFlavors')).show(); }

function renderManageFlavors() {
  const list = q('manageFlavorslist');
  list.innerHTML = '';
  STATE.flavors.forEach((flavor, idx) => {
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center justify-content-between py-2 border-bottom';
    div.innerHTML = `<span class="fw-bold">🍬 ${flavor}</span><div>
      <button class="btn-edit-flavor" onclick="openEditFlavor(${idx})">✏️</button>
      <button class="btn-del-flavor"  onclick="deleteFlavor(${idx})">🗑️</button></div>`;
    list.appendChild(div);
  });
  q('newFlavorName').value = '';
}

function confirmAddFlavor() {
  const name = q('newFlavorName').value.trim();
  if (!name) return;
  STATE.flavors.push(name);
  renderGomitas(); renderManageFlavors(); saveLocal();
}

function openEditFlavor(idx) {
  q('editFlavorIndex').value = idx;
  q('editFlavorName').value  = STATE.flavors[idx];
  new bootstrap.Modal(q('modalEditFlavor')).show();
}

function confirmEditFlavor() {
  const idx  = parseInt(q('editFlavorIndex').value);
  const name = q('editFlavorName').value.trim();
  if (!name) return;
  const old = STATE.flavors[idx];
  STATE.flavors[idx] = name;
  STATE.cartItems.forEach(i => { if (i.flavor === old) i.flavor = name; });
  bootstrap.Modal.getInstance(q('modalEditFlavor')).hide();
  renderGomitas(); renderManageFlavors(); saveLocal();
}

function deleteFlavor(idx) {
  const name = STATE.flavors[idx];
  if (!confirm(`¿Eliminar "${name}"?`)) return;
  STATE.cartItems = STATE.cartItems.filter(i => i.flavor !== name);
  STATE.flavors.splice(idx, 1);
  renderGomitas(); renderManageFlavors(); recalcTotal(); saveLocal();
}

/* ── PALETAS & SALSA ────────────────────────────────────────── */
function changeQty(key, delta) {
  if (key === 'salsa') {
    STATE.salsa = Math.max(0, STATE.salsa + delta);
    q('salsaVal').textContent = STATE.salsa;
  } else if (key in STATE.paletas) {
    STATE.paletas[key] = Math.max(0, STATE.paletas[key] + delta);
    q(`${key}Val`).textContent = STATE.paletas[key];
  }
  recalcTotal(); saveLocal();
}

/* ── CHAROLAS ───────────────────────────────────────────────── */
function renderCharolas() {
  const c = q('charolaList');
  c.innerHTML = '';
  STATE.charolas.forEach((ch, i) => c.appendChild(buildCharolaRow(ch, i)));
}

function buildCharolaRow(c, i) {
  const opts = ['Mixta', ...STATE.flavors].map(f =>
    `<option value="${f}" ${c.sabor===f?'selected':''}>${f}</option>`).join('');
  const div = document.createElement('div');
  div.className = 'charola-row fade-in';
  div.innerHTML = `
    <div class="charola-head">
      <span class="charola-num">🫙 Charola #${i+1}</span>
      <button class="btn-del-flavor" onclick="deleteCharola(${c.id})">🗑️</button>
    </div>
    <div class="row g-2">
      <div class="col-4">
        <label class="form-label small fw-bold mb-1">Cantidad</label>
        <div class="qty-control">
          <button class="qty-btn" onclick="charolaQtyChange(${c.id},-1)">−</button>
          <span class="qty-val" id="charola-qty-${c.id}">${c.qty}</span>
          <button class="qty-btn" onclick="charolaQtyChange(${c.id},1)">+</button>
        </div>
      </div>
      <div class="col-8">
        <label class="form-label small fw-bold mb-1">Sabor</label>
        <select class="form-select form-select-sm t21-input" onchange="charolaSetField(${c.id},'sabor',this.value)">${opts}</select>
      </div>
      <div class="col-12">
        <label class="form-label small fw-bold mb-1">Tipo</label>
        <select class="form-select form-select-sm t21-input" onchange="charolaSetField(${c.id},'tipo',this.value)">
          <option value="mixta"      ${c.tipo==='mixta'     ?'selected':''}>🎨 Mixta</option>
          <option value="individual" ${c.tipo==='individual'?'selected':''}>🍬 Individual</option>
        </select>
      </div>
      <div class="col-12">
        <label class="form-label small fw-bold mb-1">Escarcha</label>
        <select class="form-select form-select-sm t21-input" onchange="charolaSetField(${c.id},'escarchado',this.value)">
          <option value="escarchada"    ${c.escarchado==='escarchada'   ?'selected':''}>🧂 Completamente escarchada</option>
          <option value="mitad"         ${c.escarchado==='mitad'        ?'selected':''}>½ Mitad/Mitad</option>
          <option value="sin_escarchar" ${c.escarchado==='sin_escarchar'?'selected':''}>🚫 Sin escarchar</option>
        </select>
      </div>
    </div>`;
  return div;
}

function addCharola() {
  STATE.charolas.push({ id: ++STATE.charolaIdCounter, qty:1, sabor:'Mixta', tipo:'mixta', escarchado:'escarchada' });
  renderCharolas(); recalcTotal(); saveLocal();
}
function deleteCharola(cid) {
  STATE.charolas = STATE.charolas.filter(c => c.id !== cid);
  renderCharolas(); recalcTotal(); saveLocal();
}
function charolaQtyChange(cid, delta) {
  const c = STATE.charolas.find(x => x.id === cid);
  if (!c) return;
  c.qty = Math.max(1, c.qty + delta);
  const el = q(`charola-qty-${cid}`); if (el) el.textContent = c.qty;
  recalcTotal(); saveLocal();
}
function charolaSetField(cid, field, val) {
  const c = STATE.charolas.find(x => x.id === cid);
  if (c) { c[field] = val; recalcTotal(); saveLocal(); }
}

/* ── TOTAL ──────────────────────────────────────────────────── */
function calcTotal() {
  let t = 0;
  STATE.cartItems.forEach(item => { t += item.qty * item.price; });
  t += STATE.paletas.paletaCereza * STATE.config.paletaPrice;
  t += STATE.paletas.paletaSandia  * STATE.config.paletaPrice;
  t += STATE.salsa * (parseFloat(q('salsaPrice').value) || 0);
  STATE.charolas.forEach(c => { t += c.qty * STATE.config.charolaPrice; });
  if (q('envioToggle').checked) t += parseFloat(q('envioPrice').value) || 50;
  return t;
}
function recalcTotal() {
  const fmt = `$${calcTotal().toFixed(2)}`;
  q('totalDisplay').textContent = fmt;
  q('cartTotal').textContent    = fmt;
  adjustSpacer();
}

/* ── TICKET ─────────────────────────────────────────────────── */
function showTicketPreview() {
  if (!validateBeforeTicket()) return;
  q('ticketContent').innerHTML = buildTicketHTML();
  const btn = q('btnSaveSheets');
  btn.disabled = false; btn.dataset.sent = '';
  btn.innerHTML = '<i class="bi bi-cloud-upload me-1"></i>Guardar en Sheets';
  btn.className = 'btn btn-success';
  new bootstrap.Modal(q('modalTicket')).show();
}

function buildTicketHTML() {
  const now  = new Date();
  const fmtD = d => d.toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' });
  const fmtT = d => d.toLocaleTimeString('es-MX',  { hour:'2-digit', minute:'2-digit' });
  const clientName   = (q('clientName').value||'—').substring(0,80);
  const deliveryDate = q('deliveryDate').value || '—';
  const deliveryTime = q('deliveryTime').value || '—';
  const deliveryAddr = (q('deliveryAddress').value||'—').substring(0,200);
  const salsaPrice   = parseFloat(q('salsaPrice').value) || 0;
  const envioOn      = q('envioToggle').checked;
  const envioPrice   = parseFloat(q('envioPrice').value) || 50;
  let rows = '', total = 0, hasItems = false;

  let gomiRows = '';
  STATE.cartItems.forEach(item => {
    hasItems = true; const sub = item.qty*item.price; total += sub;
    const pl = item.pres==='chamoy'?'🌶️ Chamoy':item.pres==='escarchada'?'🧂 Escarchada':'🍬 Sola';
    const sl = item.size[0].toUpperCase()+item.size.slice(1);
    gomiRows += `<div class="ticket-row"><span class="item">${item.qty}x ${item.flavor} (${sl}) – ${pl}</span><span class="price">$${sub.toFixed(2)}</span></div>`;
  });
  if (gomiRows) rows += `<div class="ticket-section"><h6>🍬 Gomitas</h6>${gomiRows}</div><hr class="ticket-divider">`;

  let palRows = '';
  if (STATE.paletas.paletaCereza>0){ hasItems=true; const sub=STATE.paletas.paletaCereza*STATE.config.paletaPrice; total+=sub; palRows+=`<div class="ticket-row"><span class="item">${STATE.paletas.paletaCereza}x Paleta Cereza 🍒</span><span class="price">$${sub.toFixed(2)}</span></div>`; }
  if (STATE.paletas.paletaSandia >0){ hasItems=true; const sub=STATE.paletas.paletaSandia *STATE.config.paletaPrice; total+=sub; palRows+=`<div class="ticket-row"><span class="item">${STATE.paletas.paletaSandia}x Paleta Sandía 🍉</span><span class="price">$${sub.toFixed(2)}</span></div>`; }
  if (palRows) rows += `<div class="ticket-section"><h6>🍦 Paletas</h6>${palRows}</div><hr class="ticket-divider">`;

  if (STATE.charolas.length > 0) {
    let cr = '';
    STATE.charolas.forEach(c => {
      if (c.qty>0) { hasItems=true; const sub=c.qty*STATE.config.charolaPrice; total+=sub;
        const esc=c.escarchado==='escarchada'?'Escarchada':c.escarchado==='mitad'?'Mitad/Mitad':'Sin escarchar';
        cr+=`<div class="ticket-row"><span class="item">${c.qty}x Charola – ${c.sabor} – ${esc}</span><span class="price">$${sub.toFixed(2)}</span></div>`; }
    });
    if (cr) rows += `<div class="ticket-section"><h6>🫙 Charolas</h6>${cr}</div><hr class="ticket-divider">`;
  }

  if (STATE.salsa>0){ hasItems=true; const sub=STATE.salsa*salsaPrice; total+=sub;
    rows+=`<div class="ticket-section"><h6>🔥 Salsa Macha</h6><div class="ticket-row"><span class="item">${STATE.salsa}x Botecito</span><span class="price">$${sub.toFixed(2)}</span></div></div><hr class="ticket-divider">`; }

  if (envioOn){ total+=envioPrice;
    rows+=`<div class="ticket-section"><div class="ticket-row"><span class="item">🚴 Envío</span><span class="price">$${envioPrice.toFixed(2)}</span></div></div><hr class="ticket-divider">`; }

  if (!hasItems && !envioOn) rows = `<div class="ticket-section text-center text-muted py-4">Sin productos</div>`;

  return `
    <div class="ticket-top">
      <img src="logo.jpg" alt="T21" class="ticket-logo rounded"/>
      <div class="ticket-title">T21</div>
      <div class="ticket-slogan">Un antojo con propósito</div>
    </div>
    <div class="ticket-section mt-2">
      <h6>📋 Datos del Pedido</h6>
      <div class="ticket-row"><span class="item">Cliente</span><span class="price">${clientName}</span></div>
      <div class="ticket-row"><span class="item">Fecha de venta</span><span class="price">${fmtD(now)} ${fmtT(now)}</span></div>
      <div class="ticket-row"><span class="item">Entrega</span><span class="price">${deliveryDate} ${deliveryTime}</span></div>
      <div class="ticket-row"><span class="item">Dirección</span><span class="price" style="text-align:right;max-width:55%">${deliveryAddr}</span></div>
    </div>
    <hr class="ticket-divider">${rows}
    <div class="ticket-total-bar">
      <span class="ticket-total-label">TOTAL</span>
      <span class="ticket-total-amt">$${total.toFixed(2)}</span>
    </div>
    <div class="ticket-footer">Gracias por tu antojo 🍬 · T21<br>Generado el ${fmtD(now)} a las ${fmtT(now)}</div>`;
}

function printTicket() {
  let area = q('printArea'); if (area) area.remove();
  area = document.createElement('div'); area.id = 'printArea';
  area.innerHTML = q('ticketContent').innerHTML;
  document.body.appendChild(area);
  window.print();
  setTimeout(() => area.remove(), 1000);
}

/* ── ENVIAR A MAKE ──────────────────────────────────────────────
   Campos que recibe Make:
     fecha_venta, fecha_venta_mx, cliente,
     fecha_entrega     → YYYY-MM-DD   (columna Sheets + Calendar Start Date)
     hora_entrega      → HH:MM        (columna Sheets + Calendar Start Date hora)
     fecha_hora_entrega→ YYYY-MM-DDTHH:MM:00  (mapear directo como Start Date en Calendar)
     direccion, gomitas, paleta_cereza, paleta_sandia,
     charolas, salsa_qty, salsa_precio, envio, total
──────────────────────────────────────────────────────────────── */
async function sendToSheets() {
  if (!STATE.config.webhookUrl) { showToast('⚠️ Configura el Webhook de Make en ⚙️', true); return; }
  const btn = q('btnSaveSheets');
  if (btn.dataset.sent === '1') { showToast('⚠️ Ya enviada. Usa "Nueva Venta".', true); return; }

  const salsaPrice   = parseFloat(q('salsaPrice').value) || 0;
  const envioOn      = q('envioToggle').checked;
  const envioPrice   = parseFloat(q('envioPrice').value) || 50;
  const fechaEntrega = q('deliveryDate').value;
  const horaEntrega  = q('deliveryTime').value;
  const now          = new Date();

  const payload = {
    fecha_venta:        now.toISOString(),
    fecha_venta_mx:     now.toLocaleString('es-MX'),
    cliente:            q('clientName').value.trim(),
    fecha_entrega:      fechaEntrega,
    hora_entrega:       horaEntrega,
    fecha_hora_entrega: fechaEntrega && horaEntrega ? `${fechaEntrega}T${horaEntrega}:00` : fechaEntrega,
    direccion:          q('deliveryAddress').value.trim(),
    gomitas:            STATE.cartItems.map(i=>`${i.qty}x ${i.flavor} (${i.size}, ${i.pres})`).join(' | '),
    paleta_cereza:      STATE.paletas.paletaCereza,
    paleta_sandia:      STATE.paletas.paletaSandia,
    charolas:           STATE.charolas.map(c=>`${c.qty}x ${c.sabor} (${c.tipo}, ${c.escarchado})`).join(' | '),
    salsa_qty:          STATE.salsa,
    salsa_precio:       salsaPrice,
    envio:              envioOn ? envioPrice : 0,
    total:              calcTotal()
  };

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando…';
    await fetch(STATE.config.webhookUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), mode: 'no-cors'
    });
    btn.dataset.sent = '1';
    showToast('✅ Venta enviada a Google Sheets');
    btn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>¡Enviado!';
    btn.className = 'btn btn-secondary';
  } catch(err) {
    showToast('❌ Error de red: ' + err.message, true);
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-cloud-upload me-1"></i>Guardar en Sheets';
    btn.className = 'btn btn-success';
  }
}

/* ── NUEVA VENTA / LIMPIAR ──────────────────────────────────── */
function clearCart() {
  if (!confirm('¿Borrar todos los productos?')) return;
  STATE.cartItems = []; STATE.paletas.paletaCereza=0; STATE.paletas.paletaSandia=0; STATE.salsa=0; STATE.charolas=[];
  q('paletaCerezaVal').textContent='0'; q('paletaSandiaVal').textContent='0'; q('salsaVal').textContent='0';
  q('envioToggle').checked = false;
  renderGomitas(); renderCharolas(); recalcTotal(); saveLocal();
  showToast('🗑️ Carrito vaciado');
}

function newSale() {
  if (!confirm('¿Nueva venta? Se limpian los datos del pedido.')) return;
  bootstrap.Modal.getInstance(q('modalTicket')).hide();
  q('clientName').value=''; q('deliveryTime').value=''; q('deliveryAddress').value=''; setToday();
  STATE.cartItems=[]; STATE.paletas.paletaCereza=0; STATE.paletas.paletaSandia=0; STATE.salsa=0; STATE.charolas=[];
  q('paletaCerezaVal').textContent='0'; q('paletaSandiaVal').textContent='0'; q('salsaVal').textContent='0';
  q('envioToggle').checked=false;
  renderGomitas(); renderCharolas(); recalcTotal(); saveLocal();
  showToast('🆕 Nueva venta iniciada');
}

/* ── TOAST ──────────────────────────────────────────────────── */
function showToast(msg, isError=false) {
  const el = q('appToast'), body = q('toastMsg');
  body.textContent = msg;
  el.style.background = isError ? '#dc3545' : '#27ae60';
  bootstrap.Toast.getOrCreateInstance(el, { delay:3500 }).show();
}
