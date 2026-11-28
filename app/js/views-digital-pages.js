// Borradores de páginas de venta para el giro digital.
// No representan landings públicas ni registran pagos/comisiones.
import { state } from './store.js';
import { esc, modal, toast } from './ui.js';

const key = () => 'zoco.digital.drafts.' + String(state.currentCompany || 'default');
const load = () => {
  try { const list = JSON.parse(localStorage.getItem(key()) || '[]'); return Array.isArray(list) ? list : []; }
  catch { return []; }
};
const save = list => {
  try { localStorage.setItem(key(), JSON.stringify(list)); return true; }
  catch { toast('No se pudieron guardar los borradores'); return false; }
};
const eligible = () => (state.products || []).filter(p =>
  ['digitales', 'cursos_digitales', 'encargos_digitales', 'servicios_digitales'].includes(p.section) &&
  !p.isDemo && p.active !== false);
const money = n => new Intl.NumberFormat('es-MX', {style:'currency',currency:'MXN'}).format(Number(n)||0);

export function renderDigitalPages(container, ctx) {
  const products = eligible(), drafts = load();
  container.innerHTML =
    '<div class="zd-panel"><h3>Mis páginas de venta</h3>' +
    '<p>Prepara el título, la descripción y la comisión que deseas ofrecer a tus afiliados. ' +
    '<strong>Los diseños se guardan solo en este dispositivo</strong>; todavía no son páginas publicadas.</p>' +
    '<button class="zd-btn" type="button" id="zd-new-page">+ Nueva página de venta</button>' +
    (!products.length ? '<p class="zd-muted">Primero registra un producto digital real en Productos.</p>' : '') +
    '</div><div class="zd-panel"><h3>Borradores guardados (' + drafts.length + ')</h3>' +
    (drafts.length ? drafts.map(d =>
      '<article style="border:1px solid var(--border,#dde3eb);padding:16px;border-radius:14px;margin:12px 0">' +
      '<h3>' + esc(d.headline) + '</h3><p>' + esc(d.description) + '</p>' +
      '<p class="zd-muted">' + esc(d.productName) + ' · ' + money(d.price) +
      ' · Comisión ' + esc(d.commissionPct) + '% · ' +
      (d.approval === 'auto' ? 'Solicitud libre (futura)' : 'Aprobación manual') + '</p>' +
      '<div class="zd-actions"><button class="zd-btn alt" data-preview="' + esc(d.id) + '">Vista previa</button>' +
      '<button class="zd-btn share" data-edit="' + esc(d.id) + '">Editar</button>' +
      '<button class="zd-btn share" data-remove="' + esc(d.id) + '">Eliminar</button></div></article>'
    ).join('') : '<p class="zd-muted">Todavía no hay diseños guardados.</p>') + '</div>';
  const edit = id => {
    if (!products.length) { toast('Crea primero un producto digital'); ctx?.go?.('productos'); return; }
    const old = load().find(d => d.id === id);
    const selected = products.find(p => p.id === old?.productId) || products[0];
    const field = (name, label, value, type, extra) =>
      '<label style="display:block;margin:12px 0"><strong>' + label + '</strong><input name="' + name +
      '" type="' + (type || 'text') + '" ' + (extra || '') +
      ' value="' + esc(value) + '" required style="display:block;width:100%;box-sizing:border-box;padding:12px;border:1px solid #bbb;border-radius:9px"></label>';
    const body = '<form id="zd-editor">' +
      '<label style="display:block"><strong>Producto</strong><select name="productId" required style="display:block;width:100%;padding:12px">' +
      products.map(p => '<option value="' + esc(p.id) + '"' + (p.id === selected.id ? ' selected' : '') +
        '>' + esc(p.name) + ' · ' + money(p.price) + '</option>').join('') + '</select></label>' +
      field('headline', 'Título de la página', old?.headline || selected.name, 'text', 'maxlength="110"') +
      '<label style="display:block;margin:12px 0"><strong>Descripción</strong>' +
      '<textarea name="description" required maxlength="1500" style="display:block;width:100%;min-height:110px;box-sizing:border-box;padding:12px;border:1px solid #bbb;border-radius:9px">' +
      esc(old?.description || '') + '</textarea></label>' +
      field('commissionPct', 'Comisión por venta validada (%)', old?.commissionPct ?? 20, 'number', 'min="0" max="100" step="0.5"') +
      '<label style="display:block;margin:12px 0"><strong>Afiliados</strong><select name="approval" style="display:block;width:100%;padding:12px">' +
      '<option value="manual"' + (old?.approval !== 'auto' ? ' selected' : '') + '>El dueño aprueba</option>' +
      '<option value="auto"' + (old?.approval === 'auto' ? ' selected' : '') + '>Solicitud libre (cuando se habilite)</option></select></label>' +
      field('cta', 'Texto del botón', old?.cta || 'Quiero este producto', 'text', 'maxlength="65"') +
      '<p class="zd-warning">Guardar no genera un enlace público, cobros ni comisiones. Esta es una preparación privada.</p></form>';
    const m = modal({title:old ? 'Editar página de venta' : 'Nueva página de venta',body,wide:true,
      foot:'<button class="zd-btn share" data-close>Cancelar</button><button class="zd-btn" id="zd-save-page">Guardar borrador</button>'});
    m.root.querySelector('#zd-save-page').onclick = () => {
      const form = m.root.querySelector('#zd-editor');
      if (!form.reportValidity()) return;
      const data = new FormData(form), prod = products.find(p => p.id === data.get('productId'));
      const commission = Number(data.get('commissionPct'));
      if (!prod || !Number.isFinite(commission) || commission < 0 || commission > 100) return;
      const page = {
        id:old?.id || 'draft-' + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
        productId:prod.id, productName:prod.name, price:Number(prod.price)||0,
        headline:String(data.get('headline')).trim(), description:String(data.get('description')).trim(),
        cta:String(data.get('cta')).trim(), commissionPct:commission,
        approval:String(data.get('approval')), updatedAt:new Date().toISOString()
      };
      const next = load().filter(d => d.id !== page.id); next.unshift(page);
      if (save(next)) { m.close(); renderDigitalPages(container,ctx); toast('Borrador guardado'); }
    };
  };
  container.querySelector('#zd-new-page').onclick = () => edit(null);
  container.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => edit(b.dataset.edit));
  container.querySelectorAll('[data-preview]').forEach(b => b.onclick = () => {
    const d = load().find(p => p.id === b.dataset.preview);
    if (!d) return;
    modal({title:'Vista previa · No publicada',wide:true,
      body:'<div style="text-align:center;padding:25px 10px;max-width:600px;margin:auto">' +
      '<p class="zd-badge">VISTA PREVIA · SIN COBROS</p>' +
      '<h2 style="font-size:clamp(24px,5vw,36px)">' + esc(d.headline) + '</h2>' +
      '<p style="white-space:pre-wrap;line-height:1.7">' + esc(d.description) + '</p>' +
      '<h3>' + money(d.price) + '</h3><button disabled class="zd-btn">' + esc(d.cta) + ' (prueba)</button>' +
      '<p class="zd-muted">Afiliados: ' + esc(d.commissionPct) + '% por venta validada; función no activa.</p></div>'});
  });
  container.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
    if (!confirm('¿Eliminar este borrador?')) return;
    if (save(load().filter(d => d.id !== b.dataset.remove))) renderDigitalPages(container,ctx);
  });
}
