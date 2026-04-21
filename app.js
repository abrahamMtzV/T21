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
  cartItems: [],      // [{ id, flavor, size, pres, qty, price }]
  cartIdCounter: 0,
  paletas: { paletaCereza: 0, paletaSandia: 0 },
  salsa: 0,
  charolas: [],
  charolaIdCounter: 0,
  config: { webhookUrl: '', paletaPrice: 15, charolaPrice: 75, gomiChica: 15, gomiMediana: 20, gomiGrande: 30 }
};

const GOMI_PRICES = { get chica(){ return STATE.config.gomiChica; }, get mediana(){ return STATE.config.gomiMediana; }, get grande(){ return STATE.config.gomiGrande; } };

// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  updatePriceLabels();
  renderGomitas();
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

// ── GOMITAS: SELECTOR + CARRITO ─────────────────────────────
function renderGomitas() {
  // Renderiza la lista de sabores como botones para agregar
  const container = document.getElementById('gomiList');
  container.innerHTML = '';

  // Botones de sabor
  const grid = document.createElement('div');
  grid.className = 'flavor-grid mb-3';
  STATE.flavors.forEach((flavor, idx) => {
    const btn = document.createElement('button');
    btn.className = 'flavor-chip';
    btn.innerHTML = `🍬 ${flavor}`;
    btn.onclick = () => openAddToCart(idx);
    // Botones editar/borrar en long-press o doble tap: se muestran en modal aparte
    grid.appendChild(btn);
  });
  container.appendChild(grid);

  // Carrito de gomitas
  renderGomiCart();
}

function renderGomiCart() {
  let cartEl = document.getElementById('gomiCartList');
  if (!cartEl) {
    cartEl = document.createElement('div');
    cartEl.id = 'gomiCartList';
    document.getElementById('gomiList').appendChild(cartEl);
  }
  cartEl.innerHTML = '';
  if (STATE.cartItems.length === 0) {
    cartEl.innerHTML = '<div class="text-muted small text-center py-2">Sin gomitas agregadas</div>';
    return;
  }
  STATE.cartItems.forEach(item => {
    const presLabel = item.pres === 'chamoy' ? '🌶️ Chamoy' : item.pres === 'escarchada' ? '🧂 Escarchada' : '🍬 Sola';
    const sizeLabel = item.size.charAt(0).toUpperCase() + item.size.slice(1);
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
        <span class="cart-item-price">$${(item.qty * item.price).toFixed(2)}</span>
        <button class="btn-del-flavor" onclick="cartRemove(${item.id})">🗑️</button>
      </div>
    `;
    cartEl.appendChild(div);
  });
}

function openAddToCart(flavorIdx) {
  document.getElementById('addCartFlavorIdx').value = flavorIdx;
  document.getElementById('addCartFlavorName').textContent = STATE.flavors[flavorIdx];
  document.getElementById('sizeMediana').checked = true;
  document.getElementById('presChamoy').checked  = true;
  document.getElementById('addCartQty').textContent = '1';
  document._addCartQtyVal = 1;
  // Actualizar etiquetas de precios en el modal
  document.getElementById('lblChica').textContent   = '$' + STATE.config.gomiChica;
  document.getElementById('lblMediana').textContent = '$' + STATE.config.gomiMediana;
  document.getElementById('lblGrande').textContent  = '$' + STATE.config.gomiGrande;
  new bootstrap.Modal(document.getElementById('modalAddToCart')).show();
}
function addCartQtyChange(delta) {
  document._addCartQtyVal = Math.max(1, (document._addCartQtyVal || 1) + delta);
  document.getElementById('addCartQty').textContent = document._addCartQtyVal;
}
function confirmAddToCart() {
  const idx   = parseInt(document.getElementById('addCartFlavorIdx').value);
  const size  = document.querySelector('input[name="addCartSize"]:checked')?.value || 'mediana';
  const pres  = document.querySelector('input[name="addCartPres"]:checked')?.value || 'chamoy';
  const qty   = document._addCartQtyVal || 1;
  const price = GOMI_PRICES[size];
  STATE.cartItems.push({ id: ++STATE.cartIdCounter, flavor: STATE.flavors[idx], size, pres, qty, price });
  bootstrap.Modal.getInstance(document.getElementById('modalAddToCart')).hide();
  renderGomiCart();
  recalcTotal();
  showToast('🍬 Agregado al carrito');
}
function cartChangeQty(id, delta) {
  const item = STATE.cartItems.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderGomiCart();
  recalcTotal();
}
function cartRemove(id) {
  STATE.cartItems = STATE.cartItems.filter(i => i.id !== id);
  renderGomiCart();
  recalcTotal();
}

// ── CRUD SABORES ─────────────────────────────────────────────
function openManageFlavors() {
  renderManageFlavors();
  new bootstrap.Modal(document.getElementById('modalManageFlavors')).show();
}
function renderManageFlavors() {
  const list = document.getElementById('manageFlavorslist');
  list.innerHTML = '';
  STATE.flavors.forEach((flavor, idx) => {
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center justify-content-between py-2 border-bottom';
    div.innerHTML = `
      <span class="fw-bold">🍬 ${flavor}</span>
      <div>
        <button class="btn-edit-flavor" onclick="openEditFlavor(${idx})">✏️</button>
        <button class="btn-del-flavor"  onclick="deleteFlavor(${idx})">🗑️</button>
      </div>`;
    list.appendChild(div);
  });
  document.getElementById('newFlavorName').value = '';
}
function confirmAddFlavor() {
  const name = document.getElementById('newFlavorName').value.trim();
  if (!name) return;
  STATE.flavors.push(name);
  renderGomitas();
  renderManageFlavors();
  recalcTotal();
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
  renderManageFlavors();
}
function deleteFlavor(idx) {
  if (!confirm(`¿Eliminar el sabor "${STATE.flavors[idx]}"?`)) return;
  STATE.flavors.splice(idx, 1);
  renderGomitas();
  renderManageFlavors();
  recalcTotal();
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
  STATE.cartItems.forEach(item => { total += item.qty * item.price; });
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
  STATE.cartItems.forEach(item => {
    hasItems = true;
    const sub = item.qty * item.price; total += sub;
    const presLabel = item.pres==='chamoy'?'🌶️ Chamoy':item.pres==='escarchada'?'🧂 Escarchada':'🍬 Sola';
    const sizeLabel = item.size.charAt(0).toUpperCase()+item.size.slice(1);
    gomiRows += `<div class="ticket-row"><span class="item">${item.qty}x ${item.flavor} (${sizeLabel}) – ${presLabel}</span><span class="price">$${sub.toFixed(2)}</span></div>`;
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
function printTicket() {
  // Crea un div fuera del modal para imprimir limpio
  let area = document.getElementById("printArea");
  if (area) area.remove();
  area = document.createElement("div");
  area.id = "printArea";
  area.innerHTML = document.getElementById("ticketContent").innerHTML;
  document.body.appendChild(area);
  window.print();
  setTimeout(() => area.remove(), 1000);
}

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

  const gomiSummary = STATE.cartItems.map(item =>
    `${item.qty}x ${item.flavor} (${item.size}, ${item.pres})`
  );

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
  STATE.cartItems = [];
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
  STATE.cartItems = [];
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
