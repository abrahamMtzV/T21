/* ============================================================
   T21 — Un Antojo con Propósito | app.js
============================================================ */
'use strict';

const STATE = {
  flavors: [
    'Panditas','Sandías Mini','Aros de Manzana','Aros de Durazno',
    'Aros de Sandía','Cubitos','Tiburones','Xtreme Frutas',
    'Xtremes Mora Azul','Viboritas','Naranja Gajos'
  ],
  gomitas: {},
  paletas: { paletaCereza: 0, paletaSandia: 0 },
  salsa: 0,
  charolas: [],
  charolaIdCounter: 0,
  config: { webhookUrl: '', paletaPrice: 10, charolaPrice: 120, gomiChica: 15, gomiMediana: 20, gomiGrande: 30 }
};

const GOMI_PRICES = { get chica(){ return STATE.config.gomiChica; }, get mediana(){ return STATE.config.gomiMediana; }, get grande(){ return STATE.config.gomiGrande; } };

// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  updatePriceLabels();
  renderCharolas();
  setToday();
  adjustSpacer();
  window.addEventListener('resize', adjustSpacer);
});

// Espaciador dinámico: mide el alto real del total-bar y lo aplica al spacer
function adjustSpacer() {
  const bar     = document.getElementById('totalBar');
  const spacer  = document.getElementById('totalSpacer');
  if (bar && spacer) {
    spacer.style.height = (bar.offsetHeight + 16) + 'px';
  }
}

function setToday() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('deliveryDate').value = today;
}

// ── CONFIGURACIÓN ───────────────────────────────────────────
function loadConfig() {
  // Solo el webhook se guarda en localStorage — los precios siempre vienen del código
  const savedWebhook = localStorage.getItem('t21_webhook');
  if (savedWebhook) STATE.config.webhookUrl = savedWebhook;
  document.getElementById('configWebhook').value      = STATE.config.webhookUrl;
  document.getElementById('configPaletaPrice').value  = STATE.config.paletaPrice;
  document.getElementById('configCharolaPrice').value = STATE.config.charolaPrice;
  document.getElementById('configGomiChica').value    = STATE.config.gomiChica;
  document.getElementById('configGomiMediana').value  = STATE.config.gomiMediana;
  document.getElementById('configGomiGrande').value   = STATE.config.gomiGrande;
}
function openConfig() {
  document.getElementById('configWebhook').value      = STATE.config.webhookUrl;
  document.getElementById('configPaletaPrice').value  = STATE.config.paletaPrice;
  document.getElementById('configCharolaPrice').value = STATE.config.charolaPrice;
  document.getElementById('configGomiChica').value    = STATE.config.gomiChica;
  document.getElementById('configGomiMediana').value  = STATE.config.gomiMediana;
  document.getElementById('configGomiGrande').value   = STATE.config.gomiGrande;
  new bootstrap.Modal(document.getElementById('modalConfig')).show();
}
function updatePriceLabels() {
  const p = STATE.config.paletaPrice;
  const el1 = document.getElementById('pricePaletaCereza');
  const el2 = document.getElementById('pricePaletaSandia');
  if (el1) el1.textContent = '$' + p + ' c/u';
  if (el2) el2.textContent = '$' + p + ' c/u';
  const bc = document.getElementById('badgeChica');
  const bm = document.getElementById('badgeMediana');
  const bg = document.getElementById('badgeGrande');
  if (bc) bc.textContent = 'Chica $'   + STATE.config.gomiChica;
  if (bm) bm.textContent = 'Mediana $' + STATE.config.gomiMediana;
  if (bg) bg.textContent = 'Grande $'  + STATE.config.gomiGrande;
  renderGomitas();
}
function saveConfig() {
  STATE.config.webhookUrl   = document.getElementById('configWebhook').value.trim();
  STATE.config.paletaPrice  = parseFloat(document.getElementById('configPaletaPrice').value) || 10;
  STATE.config.charolaPrice = parseFloat(document.getElementById('configCharolaPrice').value) || 120;
  STATE.config.gomiChica    = parseFloat(document.getElementById('configGomiChica').value)    || 15;
  STATE.config.gomiMediana  = parseFloat(document.getElementById('configGomiMediana').value)  || 20;
  STATE.config.gomiGrande   = parseFloat(document.getElementById('configGomiGrande').value)   || 30;
  localStorage.setItem('t21_webhook', STATE.config.webhookUrl);
  updatePriceLabels();
  bootstrap.Modal.getInstance(document.getElementById('modalConfig')).hide();
  showToast('✅ Configuración guardada');
  recalcTotal();
}

// ── GOMITAS ─────────────────────────────────────────────────
function renderGomitas() {
  const container = document.getElementById('gomiList');
  container.innerHTML = '';
  STATE.flavors.forEach((flavor, idx) => {
    if (!STATE.gomitas[idx]) {
      STATE.gomitas[idx] = {
        chica:   { qty: 0, pres: 'chamoy' },
        mediana: { qty: 0, pres: 'chamoy' },
        grande:  { qty: 0, pres: 'chamoy' }
      };
    }
    const g = STATE.gomitas[idx];
    const row = document.createElement('div');
    row.className = 'flavor-row fade-in';
    row.id = `flavor-${idx}`;
    row.innerHTML = `
      <div class="d-flex align-items-center justify-content-between">
        <div class="flavor-name"><span>🍬</span> ${flavor}</div>
        <div>
          <button class="btn-edit-flavor" onclick="openEditFlavor(${idx})">✏️</button>
          <button class="btn-del-flavor"  onclick="deleteFlavor(${idx})">🗑️</button>
        </div>
      </div>
      ${['chica','mediana','grande'].map(size => `
        <div class="gomita-sub">
          <span class="size-label">${size.charAt(0).toUpperCase()+size.slice(1)} $${GOMI_PRICES[size]}</span>
          <select class="pres-select form-select form-select-sm"
                  onchange="gomiSetPres(${idx},'${size}',this.value); recalcTotal()">
            <option value="chamoy"     ${g[size].pres==='chamoy'    ?'selected':''}>🌶️ Chamoy</option>
            <option value="escarchada" ${g[size].pres==='escarchada'?'selected':''}>🧂 Escarchada</option>
            <option value="sola"       ${g[size].pres==='sola'      ?'selected':''}>🍬 Sola</option>
          </select>
          <div class="qty-control">
            <button class="qty-btn" onclick="gomiChangeQty(${idx},'${size}',-1)">−</button>
            <span class="qty-val" id="gomi-${idx}-${size}">${g[size].qty}</span>
            <button class="qty-btn" onclick="gomiChangeQty(${idx},'${size}',1)">+</button>
          </div>
        </div>
      `).join('')}
    `;
    container.appendChild(row);
  });
}
function gomiSetPres(idx, size, val)    { STATE.gomitas[idx][size].pres = val; }
function gomiChangeQty(idx, size, delta) {
  const g = STATE.gomitas[idx][size];
  g.qty = Math.max(0, g.qty + delta);
  const el = document.getElementById(`gomi-${idx}-${size}`);
  if (el) el.textContent = g.qty;
  recalcTotal();
}

// ── CRUD SABORES ─────────────────────────────────────────────
function openAddFlavor() {
  document.getElementById('newFlavorName').value = '';
  new bootstrap.Modal(document.getElementById('modalAddFlavor')).show();
}
function confirmAddFlavor() {
  const name = document.getElementById('newFlavorName').value.trim();
  if (!name) return;
  STATE.flavors.push(name);
  bootstrap.Modal.getInstance(document.getElementById('modalAddFlavor')).hide();
  renderGomitas(); recalcTotal();
}
function openEditFlavor(idx) {
  document.getElementById('editFlavorIndex').value = idx;
  document.getElementById('editFlavorName').value  = STATE.flavors[idx];
  new bootstrap.Modal(document.getElementById('modalEditFlavor')).show();
}
function confirmEditFlavor() {
  const idx  = parseInt(document.getElementById('editFlavorIndex').value);
  const name = document.getElementById('editFlavorName').value.trim();
  if (!name) return;
  STATE.flavors[idx] = name;
  bootstrap.Modal.getInstance(document.getElementById('modalEditFlavor')).hide();
  renderGomitas();
}
function deleteFlavor(idx) {
  if (!confirm(`¿Eliminar el sabor "${STATE.flavors[idx]}"?`)) return;
  STATE.flavors.splice(idx, 1);
  const newG = {};
  STATE.flavors.forEach((_, i) => {
    newG[i] = STATE.gomitas[i] || { chica:{qty:0,pres:'chamoy'}, mediana:{qty:0,pres:'chamoy'}, grande:{qty:0,pres:'chamoy'} };
  });
  STATE.gomitas = newG;
  renderGomitas(); recalcTotal();
}

// ── PALETAS & SALSA ──────────────────────────────────────────
function changeQty(key, delta) {
  if (key === 'salsa') {
    STATE.salsa = Math.max(0, STATE.salsa + delta);
    document.getElementById('salsaVal').textContent = STATE.salsa;
  } else if (key in STATE.paletas) {
    STATE.paletas[key] = Math.max(0, STATE.paletas[key] + delta);
    document.getElementById(`${key}Val`).textContent = STATE.paletas[key];
  }
  recalcTotal();
}

// ── CHAROLAS ─────────────────────────────────────────────────
function renderCharolas() {
  const container = document.getElementById('charolaList');
  container.innerHTML = '';
  STATE.charolas.forEach((c, i) => container.appendChild(buildCharolaRow(c, i)));
}
function buildCharolaRow(c, i) {
  const flavorOptions = ['Mixta', ...STATE.flavors].map(f =>
    `<option value="${f}" ${c.sabor===f?'selected':''}>${f}</option>`
  ).join('');
  const div = document.createElement('div');
  div.className = 'charola-row fade-in';
  div.innerHTML = `
    <div class="charola-head">
      <span class="charola-num">🫙 Charola #${i+1}</span>
      <button class="btn-del-flavor" onclick="deleteCharola(${i})">🗑️</button>
    </div>
    <div class="row g-2">
      <div class="col-4">
        <label class="form-label small fw-bold mb-1">Cantidad</label>
        <div class="qty-control">
          <button class="qty-btn" onclick="charolaQtyChange(${i},-1)">−</button>
          <span class="qty-val" id="charola-qty-${i}">${c.qty}</span>
          <button class="qty-btn" onclick="charolaQtyChange(${i},1)">+</button>
        </div>
      </div>
      <div class="col-8">
        <label class="form-label small fw-bold mb-1">Sabor</label>
        <select class="form-select form-select-sm t21-input" onchange="charolaSetField(${i},'sabor',this.value)">${flavorOptions}</select>
      </div>
      <div class="col-12">
        <label class="form-label small fw-bold mb-1">Tipo</label>
        <select class="form-select form-select-sm t21-input" onchange="charolaSetField(${i},'tipo',this.value)">
          <option value="mixta"      ${c.tipo==='mixta'     ?'selected':''}>🎨 Mixta (varios sabores)</option>
          <option value="individual" ${c.tipo==='individual'?'selected':''}>🍬 Individual (un solo sabor)</option>
        </select>
      </div>
      <div class="col-12">
        <label class="form-label small fw-bold mb-1">Escarcha</label>
        <select class="form-select form-select-sm t21-input" onchange="charolaSetField(${i},'escarchado',this.value)">
          <option value="escarchada"    ${c.escarchado==='escarchada'   ?'selected':''}>🧂 Completamente escarchada</option>
          <option value="mitad"         ${c.escarchado==='mitad'        ?'selected':''}>½ Mitad / mitad sin escarchar</option>
          <option value="sin_escarchar" ${c.escarchado==='sin_escarchar'?'selected':''}>🚫 Sin escarchar</option>
        </select>
      </div>
    </div>
  `;
  return div;
}
function addCharola() {
  STATE.charolas.push({ id: ++STATE.charolaIdCounter, qty: 1, sabor: 'Mixta', tipo: 'mixta', escarchado: 'escarchada' });
  renderCharolas(); recalcTotal();
}
function deleteCharola(i) {
  STATE.charolas.splice(i, 1);
  renderCharolas(); recalcTotal();
}
function charolaQtyChange(i, delta) {
  STATE.charolas[i].qty = Math.max(1, STATE.charolas[i].qty + delta);
  const el = document.getElementById(`charola-qty-${i}`);
  if (el) el.textContent = STATE.charolas[i].qty;
  recalcTotal();
}
function charolaSetField(i, field, val) {
  STATE.charolas[i][field] = val; recalcTotal();
}

// ── TOTAL ────────────────────────────────────────────────────
function calcTotal() {
  let total = 0;
  STATE.flavors.forEach((_, idx) => {
    const g = STATE.gomitas[idx]; if (!g) return;
    ['chica','mediana','grande'].forEach(size => { total += g[size].qty * GOMI_PRICES[size]; });
  });
  total += STATE.paletas.paletaCereza * STATE.config.paletaPrice;
  total += STATE.paletas.paletaSandia  * STATE.config.paletaPrice;
  const salsaPrice = parseFloat(document.getElementById('salsaPrice').value) || 0;
  total += STATE.salsa * salsaPrice;
  STATE.charolas.forEach(c => { total += c.qty * STATE.config.charolaPrice; });
  if (document.getElementById('envioToggle').checked) {
    total += parseFloat(document.getElementById('envioPrice').value) || 50;
  }
  return total;
}
function recalcTotal() {
  const fmt = `$${calcTotal().toFixed(2)}`;
  document.getElementById('totalDisplay').textContent = fmt;
  document.getElementById('cartTotal').textContent    = fmt;
  adjustSpacer();
}

// ── TICKET ───────────────────────────────────────────────────
function showTicketPreview() {
  document.getElementById('ticketContent').innerHTML = buildTicketHTML();
  // Resetear botón de Sheets por si fue usado antes
  const btn = document.getElementById('btnSaveSheets');
  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-cloud-upload me-1"></i>Guardar en Sheets';
  btn.className = 'btn btn-success';
  new bootstrap.Modal(document.getElementById('modalTicket')).show();
}
function buildTicketHTML() {
  const now  = new Date();
  const fmtD = d => d.toLocaleDateString('es-MX',  { day:'2-digit', month:'long', year:'numeric' });
  const fmtT = d => d.toLocaleTimeString('es-MX',   { hour:'2-digit', minute:'2-digit' });
  const clientName   = document.getElementById('clientName').value    || '—';
  const deliveryDate = document.getElementById('deliveryDate').value  || '—';
  const deliveryTime = document.getElementById('deliveryTime').value  || '—';
  const deliveryAddr = document.getElementById('deliveryAddress').value || '—';
  const salsaPrice   = parseFloat(document.getElementById('salsaPrice').value) || 0;
  const envioOn      = document.getElementById('envioToggle').checked;
  const envioPrice   = parseFloat(document.getElementById('envioPrice').value) || 50;
  let rows = ''; let total = 0; let hasItems = false;

  // Gomitas
  let gomiRows = '';
  STATE.flavors.forEach((flavor, idx) => {
    const g = STATE.gomitas[idx]; if (!g) return;
    ['chica','mediana','grande'].forEach(size => {
      if (g[size].qty > 0) {
        hasItems = true;
        const sub = g[size].qty * GOMI_PRICES[size]; total += sub;
        gomiRows += `<div class="ticket-row"><span class="item">${g[size].qty}x ${flavor} (${size}) – ${g[size].pres==='chamoy'?'🌶️ Chamoy':g[size].pres==='escarchada'?'🧂 Escarchada':'🍬 Sola'}</span><span class="price">$${sub.toFixed(2)}</span></div>`;
      }
    });
  });
  if (gomiRows) rows += `<div class="ticket-section"><h6>🍬 Gomitas</h6>${gomiRows}</div><hr class="ticket-divider">`;

  // Paletas
  let palRows = '';
  if (STATE.paletas.paletaCereza > 0) { hasItems=true; const sub=STATE.paletas.paletaCereza*STATE.config.paletaPrice; total+=sub; palRows+=`<div class="ticket-row"><span class="item">${STATE.paletas.paletaCereza}x Paleta Cereza 🍒</span><span class="price">$${sub.toFixed(2)}</span></div>`; }
  if (STATE.paletas.paletaSandia  > 0) { hasItems=true; const sub=STATE.paletas.paletaSandia *STATE.config.paletaPrice; total+=sub; palRows+=`<div class="ticket-row"><span class="item">${STATE.paletas.paletaSandia}x Paleta Sandía 🍉</span><span class="price">$${sub.toFixed(2)}</span></div>`; }
  if (palRows) rows += `<div class="ticket-section"><h6>🍦 Paletas Enchiladas</h6>${palRows}</div><hr class="ticket-divider">`;

  // Charolas
  if (STATE.charolas.length > 0) {
    let charRows = '';
    STATE.charolas.forEach(c => {
      if (c.qty > 0) {
        hasItems = true;
        const sub = c.qty * STATE.config.charolaPrice; total += sub;
        const esc = c.escarchado==='escarchada'?'Escarchada':c.escarchado==='mitad'?'Mitad/Mitad':'Sin escarchar';
        charRows += `<div class="ticket-row"><span class="item">${c.qty}x Charola – ${c.sabor} – ${esc}</span><span class="price">$${sub.toFixed(2)}</span></div>`;
      }
    });
    if (charRows) rows += `<div class="ticket-section"><h6>🫙 Charolas</h6>${charRows}</div><hr class="ticket-divider">`;
  }

  // Salsa
  if (STATE.salsa > 0) {
    hasItems = true;
    const sub = STATE.salsa * salsaPrice; total += sub;
    rows += `<div class="ticket-section"><h6>🔥 Salsa Macha</h6><div class="ticket-row"><span class="item">${STATE.salsa}x Botecito de Salsa Macha</span><span class="price">$${sub.toFixed(2)}</span></div></div><hr class="ticket-divider">`;
  }

  // Envío
  if (envioOn) {
    total += envioPrice;
    rows += `<div class="ticket-section"><div class="ticket-row"><span class="item">🚴 Costo de Envío</span><span class="price">$${envioPrice.toFixed(2)}</span></div></div><hr class="ticket-divider">`;
  }

  if (!hasItems && !envioOn) rows = `<div class="ticket-section text-center text-muted py-4">Sin productos seleccionados</div>`;

  return `
    <div class="ticket-top">
      <img src="logo.png" alt="T21" class="ticket-logo" />
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
    <hr class="ticket-divider">
    ${rows}
    <div class="ticket-total-bar">
      <span class="ticket-total-label">TOTAL</span>
      <span class="ticket-total-amt">$${total.toFixed(2)}</span>
    </div>
    <div class="ticket-footer">Gracias por tu antojo 🍬 · T21<br>Generado el ${fmtD(now)} a las ${fmtT(now)}</div>
  `;
}
function printTicket() { window.print(); }

// ── ENVIAR A MAKE / GOOGLE SHEETS ────────────────────────────
async function sendToSheets() {
  const webhookUrl = STATE.config.webhookUrl;
  if (!webhookUrl) {
    showToast('⚠️ Primero configura el Webhook URL de Make en ⚙️', true);
    return;
  }
  const salsaPrice = parseFloat(document.getElementById('salsaPrice').value) || 0;
  const envioOn    = document.getElementById('envioToggle').checked;
  const envioPrice = parseFloat(document.getElementById('envioPrice').value) || 50;
  const total      = calcTotal();
  const now        = new Date();

  const gomiSummary = [];
  STATE.flavors.forEach((flavor, idx) => {
    const g = STATE.gomitas[idx]; if (!g) return;
    ['chica','mediana','grande'].forEach(size => {
      if (g[size].qty > 0) gomiSummary.push(`${g[size].qty}x ${flavor} (${size}, ${g[size].pres})`);
    });
  });

  const payload = {
    fecha_venta:      now.toISOString(),
    fecha_venta_mx:   now.toLocaleString('es-MX'),
    cliente:          document.getElementById('clientName').value,
    fecha_entrega:    document.getElementById('deliveryDate').value,
    hora_entrega:     document.getElementById('deliveryTime').value,
    direccion:        document.getElementById('deliveryAddress').value,
    gomitas:          gomiSummary.join(' | '),
    paleta_cereza:    STATE.paletas.paletaCereza,
    paleta_sandia:    STATE.paletas.paletaSandia,
    charolas:         STATE.charolas.map(c=>`${c.qty}x ${c.sabor} (${c.tipo}, ${c.escarchado})`).join(' | '),
    salsa_qty:        STATE.salsa,
    salsa_precio:     salsaPrice,
    envio:            envioOn ? envioPrice : 0,
    total:            total
  };

  const btn = document.getElementById('btnSaveSheets');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando…';

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok || res.status === 200) {
      showToast('✅ Venta guardada en Google Sheets');
      btn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>¡Guardado!';
      btn.className = 'btn btn-secondary';
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    showToast('❌ Error al enviar: ' + err.message, true);
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-cloud-upload me-1"></i>Guardar en Sheets';
    btn.className = 'btn btn-success';
  }
}

// ── NUEVA VENTA ──────────────────────────────────────────────
function clearCart() {
  if (!confirm("¿Borrar todos los productos del carrito?")) return;
  STATE.flavors.forEach((_, idx) => {
    STATE.gomitas[idx] = { chica:{qty:0,pres:"chamoy"}, mediana:{qty:0,pres:"chamoy"}, grande:{qty:0,pres:"chamoy"} };
  });
  STATE.paletas.paletaCereza = 0; document.getElementById("paletaCerezaVal").textContent = "0";
  STATE.paletas.paletaSandia  = 0; document.getElementById("paletaSandiaVal").textContent  = "0";
  STATE.salsa = 0; document.getElementById("salsaVal").textContent = "0";
  STATE.charolas = [];
  document.getElementById("envioToggle").checked = false;
  renderGomitas(); renderCharolas(); recalcTotal();
  showToast("🗑️ Carrito vaciado");
}

function newSale() {
  if (!confirm('¿Iniciar nueva venta? Se limpiarán todos los datos.')) return;
  bootstrap.Modal.getInstance(document.getElementById('modalTicket')).hide();
  document.getElementById('clientName').value      = '';
  document.getElementById('deliveryTime').value    = '';
  document.getElementById('deliveryAddress').value = '';
  setToday();
  STATE.flavors.forEach((_, idx) => {
    STATE.gomitas[idx] = { chica:{qty:0,pres:'chamoy'}, mediana:{qty:0,pres:'chamoy'}, grande:{qty:0,pres:'chamoy'} };
  });
  STATE.paletas.paletaCereza = 0; document.getElementById('paletaCerezaVal').textContent = '0';
  STATE.paletas.paletaSandia  = 0; document.getElementById('paletaSandiaVal').textContent  = '0';
  STATE.salsa = 0; document.getElementById('salsaVal').textContent = '0';
  STATE.charolas = [];
  document.getElementById('envioToggle').checked = false;
  renderGomitas(); renderCharolas(); recalcTotal();
  showToast('🆕 Nueva venta iniciada');
}

// ── TOAST ────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const el   = document.getElementById('appToast');
  const body = document.getElementById('toastMsg');
  body.textContent = msg;
  el.style.background = isError ? '#dc3545' : '#27ae60';
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 }).show();
}
