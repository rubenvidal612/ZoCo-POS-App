// Recepción por escáner: códigos originales, búsqueda opcional y entradas trazables.
import { el, esc, money, toast, confirmDialog } from './ui.js';
import {
  state, can, findByBarcode, productById, sectionsForMode, sizesFor, fmtSize,
  variantsOf, upsertProduct, createPurchase, receivePurchase, totalStock,
} from './store.js';
import { lookupBarcode } from './lookup.js';
import { scanWithCameraSoft } from './scanner.js';

export function receivingView() {
  const root = el('<div class="rcv-root"></div>');
  const pending = new Map();
  let selectedBranch = state.currentBranch;
  let supplierId = '';
  let busy = false;
  let lastMessage = 'Escanea el código original del artículo. Si no hay datos públicos, puedes capturarlo manualmente.';

  const branchOptions = () => (state.branches || []).map(b =>
    '<option value="' + esc(b.id) + '"' + (b.id === selectedBranch ? ' selected' : '') + '>' + esc(b.name) + '</option>').join('');
  const sections = () => sectionsForMode();
  const getVariants = p => variantsOf(p).map(v => v.key);
  const editInput = (key, field, value) => {
    const item = pending.get(key);
    if (!item) return;
    item[field] = value;
  };
  const positiveQty = n => Number.isSafeInteger(Number(n)) && Number(n) > 0 && Number(n) <= 100000;
  const allowedPrice = n => Number.isFinite(Number(n)) && Number(n) >= 0 && Number(n) <= 999999999;
  function resolvedVariant(item, product) {
    const keys = getVariants(product);
    if (item.fixedVariant) return item.fixedVariant;
    if (item.variant && keys.includes(item.variant)) return item.variant;
    return keys.length === 1 ? keys[0] : '';
  }
  function setMessage(message) {
    lastMessage = message;
    const target = root.querySelector('#rcv-status');
    if (target) target.textContent = message;
  }
  function focusScanner() {
    const input = root.querySelector('#rcv-scan');
    input?.focus();
    input?.select();
  }
  async function addCode(value) {
    const code = String(value || '').trim();
    if (!code || code.length > 70) { toast('Código inválido'); return; }
    if (!can('products.edit') || !can('stock.manage')) { toast('No tienes permiso para recibir mercancía'); return; }
    if (busy) return;
    const existing = pending.get(code);
    if (existing) {
      existing.qty += 1;
      setMessage('Otra unidad de ' + (existing.name || code) + ' agregada a la recepción.');
      paintItems();
      focusScanner();
      return;
    }
    const match = findByBarcode(code);
    if (match?.product) {
      const product = match.product;
      const fixedVariant = match.vkey || '';
      const keys = getVariants(product);
      pending.set(code, {
        code, productId: product.id, name: product.name, qty: 1,
        variant: fixedVariant || (keys.length === 1 ? keys[0] : ''),
        fixedVariant, section: product.section, cost: Number(product.cost || 0),
        price: Number(product.price || 0), source: 'Inventario de ZoCo',
      });
      setMessage('Producto reconocido: ' + product.name + '.');
      paintItems(); focusScanner();
      return;
    }
    pending.set(code, {
      code, productId: null, name: '', qty: 1, variant: '',
      fixedVariant: '', section: sections()[0]?.[0] || 'general',
      cost: 0, price: 0, source: 'Captura manual', searching: true,
    });
    paintItems(); focusScanner();
    try {
      const found = await lookupBarcode(code, { skipLocal: true });
      const item = pending.get(code);
      if (!item || item.productId) return;
      if (found?.found) {
        if (!item.name) item.name = found.name || '';
        if (found.image) item.image = found.image;
        item.source = found.source || 'Base pública';
        setMessage('Se encontró información de ' + code + '. Revisa y completa sus datos.');
      } else {
        item.source = 'Sin registro público';
        setMessage('Código ' + code + ' guardado en la lista. Escribe su nombre, precio y costo.');
      }
      item.searching = false;
      paintItems();
    } catch {
      const item = pending.get(code);
      if (item) { item.searching = false; item.source = 'Captura manual'; paintItems(); }
    }
  }

  function itemHtml(item) {
    const p = item.productId ? productById(item.productId) : null;
    const variants = p ? getVariants(p) : [];
    const section = item.section;
    const newVariants = sizesFor(section).map(fmtSize);
    const choices = p ? variants : newVariants;
    const key = item.code;
    const fixed = !!item.fixedVariant;
    return '<article class="rcv-card" data-code="' + esc(key) + '">' +
      '<div class="rcv-title"><div><strong>' + esc(item.name || 'Producto nuevo') + '</strong>' +
      '<small> Código original: <code>' + esc(key) + '</code> · ' + esc(item.source) + (item.searching ? ' · Buscando…' : '') + '</small></div>' +
      '<button class="btn ghost sm" data-remove="' + esc(key) + '" type="button">Quitar</button></div>' +
      (p ? '<div class="rcv-hint">Artículo registrado en ZoCo · stock actual en esta sucursal: <b>' + esc(String(totalStock(p, selectedBranch))) + '</b></div>' :
      '<div class="rcv-two"><label>Nombre del producto<input data-field="name" value="' + esc(item.name) + '" placeholder="Ej. Shampoo 400 ml" required></label>' +
      '<label>Tipo de producto<select data-field="section">' + sections().map(([s,v]) => '<option value="' + esc(s) + '"' + (s === section ? ' selected' : '') + '>' + esc(v.label || s) + '</option>').join('') + '</select></label></div>') +
      '<div class="rcv-fields"><label>Unidades recibidas<input type="number" min="1" max="100000" step="1" data-field="qty" value="' + esc(String(item.qty)) + '"></label>' +
      '<label>Talla / variante<select data-field="variant"' + (fixed ? ' disabled' : '') + '>' +
      '<option value="">— seleccionar —</option>' +
      choices.map(v => '<option value="' + esc(v) + '"' + (v === item.variant ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select></label>' +
      '<label>Costo unitario (MXN)<input type="number" min="0" step="0.01" data-field="cost" value="' + esc(String(item.cost)) + '"></label>' +
      (p ? '' : '<label>Precio de venta (MXN)<input type="number" min="0" step="0.01" data-field="price" value="' + esc(String(item.price)) + '"></label>') +
      '</div>' +
      (!p ? '<div class="rcv-hint">Se conservará el código de fábrica. ZoCo no generará otro código.</div>' :
      fixed ? '<div class="rcv-hint">Este código identifica la variante exacta: ' + esc(item.fixedVariant) + '.</div>' :
      variants.length > 1 ? '<div class="rcv-hint">Selecciona la talla o color correcto para evitar sumar existencias a otra variante.</div>' : '') +
      '</article>';
  }
  function paintItems() {
    const list = root.querySelector('#rcv-items');
    if (!list) return;
    const items = [...pending.values()];
    list.innerHTML = items.length ? items.map(itemHtml).join('') :
      '<div class="rcv-empty">Todavía no has escaneado artículos. Los códigos se añadirán aquí uno por uno.</div>';
    const total = items.reduce((n,i)=>n+i.qty,0);
    root.querySelector('#rcv-count').textContent = items.length + ' códigos · ' + total + ' piezas';
    const save = root.querySelector('#rcv-save');
    save.disabled = busy || !items.length;
    list.querySelectorAll('[data-code]').forEach(card=>{
      const code=card.dataset.code;
      card.querySelectorAll('[data-field]').forEach(input=>{
        input.addEventListener('input',()=>{
          const field=input.dataset.field;
          const value=(field==='qty'||field==='cost'||field==='price') ? Number(input.value) : input.value;
          editInput(code,field,value);
        });
        if(input.dataset.field==='section') input.addEventListener('change',()=>{const i=pending.get(code);if(i){i.variant='';paintItems()}});
      });
      card.querySelector('[data-remove]').addEventListener('click',()=>{pending.delete(code);paintItems();focusScanner()});
    });
  }
  function render() {
    root.innerHTML = '<div class="rcv-panel">' +
      '<div class="rcv-intro"><h2>Recibir mercancía por escáner</h2><p>Usa el código que trae el artículo de fábrica. ZoCo reconoce los existentes y permite registrar los nuevos.</p></div>' +
      '<div class="rcv-controls"><label>Sucursal de entrada<select id="rcv-branch">' + branchOptions() + '</select></label>' +
      '<label>Proveedor (opcional)<select id="rcv-supplier"><option value="">Sin proveedor</option>' +
      (state.suppliers || []).map(s=>'<option value="' + esc(s.id) + '"' + (s.id===supplierId?' selected':'') + '>' + esc(s.name) + '</option>').join('') + '</select></label></div>' +
      '<div class="rcv-scanbar"><label for="rcv-scan">Código de barras de fábrica</label><div class="rcv-scanrow">' +
      '<input id="rcv-scan" placeholder="Escanea o escribe y presiona Enter" autocomplete="off" inputmode="text">' +
      '<button class="btn ghost" id="rcv-camera" type="button">📷 Cámara</button><button class="btn" id="rcv-add" type="button">Agregar</button></div>' +
      '<p id="rcv-status" role="status" class="rcv-hint">' + esc(lastMessage) + '</p></div>' +
      '<div class="rcv-header"><h3>Artículos por recibir</h3><strong id="rcv-count"></strong></div>' +
      '<div id="rcv-items" class="rcv-list"></div>' +
      '<div class="rcv-footer"><p>Las existencias cambian solamente cuando confirmas la recepción. Se creará una orden de compra ya recibida, con costo y sucursal.</p>' +
      '<button class="btn" id="rcv-save" type="button">Confirmar entrada al inventario</button></div></div>';
    root.querySelector('#rcv-branch').onchange=e=>{selectedBranch=e.target.value;paintItems()};
    root.querySelector('#rcv-supplier').onchange=e=>{supplierId=e.target.value};
    const input=root.querySelector('#rcv-scan');
    const submitScan=()=>{const code=input.value.trim();input.value='';if(code)addCode(code)};
    root.querySelector('#rcv-add').onclick=submitScan;
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();submitScan()}});
    root.querySelector('#rcv-camera').onclick=async()=>{const code=await scanWithCameraSoft();if(code)await addCode(code)};
    root.querySelector('#rcv-save').onclick=saveReception;
    paintItems();
    focusScanner();
  }
  async function saveReception() {
    if (busy || !pending.size) return;
    if (!can('products.edit') || !can('stock.manage')) { toast('No tienes permiso para modificar inventario'); return; }
    const snapshot=[...pending.values()].map(i=>({...i}));
    const currentCodes=new Set();
    const errors=[];
    for (const i of snapshot) {
      const match=findByBarcode(i.code);
      const p=i.productId?productById(i.productId):null;
      if (i.productId && (!p || !match || match.product.id!==p.id)) { errors.push('El artículo '+i.code+' cambió. Escanéalo otra vez.'); continue; }
      if (!i.productId && match) { errors.push('El código '+i.code+' ya existe en otro producto.'); continue; }
      if (currentCodes.has(i.code)) { errors.push('Código duplicado '+i.code); continue; }
      currentCodes.add(i.code);
      if (!positiveQty(i.qty)) errors.push('Cantidad inválida en '+i.code);
      if (!allowedPrice(i.cost) || !allowedPrice(i.price) || (!i.productId && Number(i.price) <= 0)) errors.push('Indica un precio de venta válido y costo no negativo en '+i.code);
      if (!i.productId && (!i.name.trim() || !sections().some(([s])=>s===i.section))) errors.push('Falta nombre o categoría en '+i.code);
      const keys=p?getVariants(p):sizesFor(i.section).map(fmtSize);
      if (i.fixedVariant && !keys.includes(i.fixedVariant)) errors.push('La variante vinculada a '+i.code+' ya no existe.');
      else if (!(i.fixedVariant || (i.variant && keys.includes(i.variant)) || (keys.length===1))) errors.push('Selecciona talla/variante para '+i.code);
    }
    if(errors.length){toast(errors[0]);setMessage('Corrige: '+errors.join(' · '));return}
    const confirmation=await confirmDialog({title:'Confirmar recepción de mercancía',message:'Se registrarán '+snapshot.length+' códigos y '+snapshot.reduce((n,i)=>n+i.qty,0)+' piezas en la sucursal seleccionada. Los cambios de stock se guardarán.',okText:'Confirmar recepción'});
    if(!confirmation)return;
    busy=true;root.querySelector('#rcv-save').disabled=true;
    try {
      const lines=[];
      for(const i of snapshot){
        let p=i.productId?productById(i.productId):null;
        if(!p){
          upsertProduct({
            code:i.code,name:i.name.trim(),section:i.section,
            cost:Number(i.cost),price:Number(i.price),
            image:i.image||'',branchStock:{},colors:[],
            catalog:true,active:true,
          });
          p=findByBarcode(i.code)?.product;
          if(!p)throw new Error('No se pudo registrar el producto '+i.code);
        }
        const key=resolvedVariant(i,p);
        if(!key)throw new Error('Falta variante del producto '+i.code);
        lines.push({productId:p.id,vkey:key,qty:i.qty,cost:Number(i.cost)});
      }
      const purchase=createPurchase({supplierId:supplierId||null,items:lines,note:'Recepción por escáner · códigos originales de fábrica',branchId:selectedBranch});
      if(!purchase?.ok)throw new Error(purchase?.msg||'No se pudo crear la orden');
      const result=receivePurchase(purchase.purchase.id,lines,{branchId:selectedBranch});
      if(!result.ok)throw new Error(result.msg||'No se pudieron sumar las existencias');
      pending.clear();setMessage('Entrada registrada: '+result.moved+' unidades. Orden '+purchase.purchase.folio+'.');
      render();toast('Recepción guardada: '+result.moved+' unidades');
    }catch(e){setMessage(e.message||'No se pudo registrar la recepción');toast(e.message||'No se pudo guardar')}
    finally{busy=false;const save=root.querySelector('#rcv-save');if(save)save.disabled=!pending.size}
  }
  render();
  return {root,refresh:()=>{ /* mantener la lista escaneada sin perder borradores */ }};
}
