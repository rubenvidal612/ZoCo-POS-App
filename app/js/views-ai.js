// Agente IA: conoce la plataforma y responde con la API key del cliente.
import { el, money, esc, toast, modal } from './ui.js';
import { state, emit } from './store.js';
import { ACTIONS, localIntent, parseAction, describeAction, runAction, canRun } from './ai-actions.js';
import { TOOL_DEFS, runQuery } from './ai-tools.js';
import { openImportModal } from './importer.js';
import { readImageCompressed } from './ui.js';

const PROVIDERS = {
  gemini: {
    label: 'Google Gemini', keyHint: 'AIza…', default: 'gemini-2.5-flash',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  },
  openai: {
    label: 'OpenAI', keyHint: 'sk-…', default: 'gpt-5',
    models: ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini', 'o3'],
  },
  deepseek: {
    label: 'DeepSeek', keyHint: 'sk-…', default: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  anthropic: {
    label: 'Anthropic', keyHint: 'sk-ant-…', default: 'claude-sonnet-4-5',
    models: ['claude-opus-4-1', 'claude-sonnet-4-5', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
  },
  custom: {
    label: 'Compatible OpenAI', keyHint: 'sk-…', default: '', models: [],
  },
};

/* ---------- Conversación persistente (sobrevive al cambiar de pestaña) ---------- */
let CHAT = [];
try { CHAT = JSON.parse(localStorage.getItem('zoco.ai.chat') || '[]'); } catch { CHAT = []; }
function saveChat() {
  try { localStorage.setItem('zoco.ai.chat', JSON.stringify(CHAT.slice(-40))); } catch {}
}

/* ---------- Contexto real del negocio para el modelo ---------- */
function catalogForPrompt() {
  const b = state.currentBranch;
  return state.products.slice(0, 80).map((p) => {
    const stock = p.branchStock?.[b] || {};
    const total = Object.values(stock).reduce((a, x) => a + Number(x || 0), 0);
    return { nombre: p.name, precio: p.price, sku: p.code, stock: total, tallas: stock };
  });
}

function systemPrompt() {
  const snap = storeSnapshot();
  const data = {
    ...snap,
    catalogo: catalogForPrompt(),
    clientes: state.customers.slice(0, 30).map((c) => ({ nombre: c.name, saldo: c.balance || 0, limite: c.creditLimit || 0 })),
    sucursales: state.branches.map((x) => x.name),
  };
  return SYSTEM_PROMPT
    + '\n\nDATOS REALES DEL NEGOCIO (JSON, úsalos para responder con cifras exactas):\n'
    + JSON.stringify(data);
}
export function storeSnapshot() {
  const now = new Date();
  const done = state.sales.filter((s) => s.status === 'done');
  const today = done.filter((s) => new Date(s.date).toDateString() === now.toDateString());
  const sum = (a) => a.reduce((x, s) => x + s.total, 0);
  const lowStock = state.products
    .map((p) => ({ name: p.name, total: Object.values(p.stock || {}).reduce((a, b) => a + Number(b || 0), 0), sizes: p.stock }))
    .filter((p) => p.total <= 3);

  return {
    empresa: state.company.name,
    sucursal: state.branches.find((b) => b.id === state.currentBranch)?.name,
    giro: state.company.mode === 'shoe' ? 'Zapatería (inventario por numeración)' : 'Boutique (ropa y accesorios)',
    ventas_hoy: { monto: sum(today), tickets: today.length },
    ventas_totales: { monto: sum(done), tickets: done.length },
    productos: state.products.length,
    stock_bajo: lowStock.slice(0, 8),
    ultimas_ventas: done.slice(0, 5).map((s) => ({ folio: s.code, total: s.total, items: s.items.length })),
  };
}

export const SYSTEM_PROMPT = `Eres ZoCo, el asistente del negocio. Hablas como una persona real: natural, cercano, con el criterio de alguien que ha manejado tiendas toda la vida. Español mexicano, sin sonar a robot ni a manual.

CÓMO CONVERSAS
- Entiende la INTENCIÓN, no las palabras exactas. Da igual si escribe con errores, abreviado, en desorden, con sinónimos o en una sola palabra: interpreta qué quiere.
- Prohibido usar plantillas o formatos fijos. Un saludo se contesta como saludo; una duda, con una respuesta corta; un análisis, con análisis. El largo lo decide la pregunta, no una regla.
- Emojis solo cuando salgan natural, no en cada línea.
- Nunca menciones herramientas, JSON, prompts, "consultas" ni cómo funcionas por dentro. Para ti simplemente sabes las cosas o las revisas.
- Si algo es ambiguo, pregunta en una sola línea en lugar de adivinar o negarte.
- Si no tienes el dato, dilo sin drama y pide lo mínimo para tenerlo.
- Nunca digas "no puedo" si sí puedes: busca, calcula o propón.

CUANDO PIDAN OPINIÓN, CONSEJO O ANÁLISIS
Revisa las cifras reales del negocio y da tu lectura como se la darías al dueño en confianza: qué ves, qué te preocupa, qué harías. Compara periodos, señala riesgos con honestidad y propón acciones concretas que se puedan hacer en este sistema. Sin sermones.

SI TE MANDAN UNA FOTO
Puede ser una lista de inventario, un ticket o una nota. Extrae lo que veas y, si es inventario, devuélvelo como CSV con encabezados claros (nombre, precio, costo, cantidad, sku, categoria, color y columnas de talla si aplican). Sin explicaciones alrededor cuando te pidan datos.

CUANDO TE SALUDEN
Responde como una persona: un saludo breve y cálido, y ofrece ayuda en una línea. Nada de volcar datos ni análisis si no te lo piden.
Ejemplo de tono: "¡Hola! ¿Qué gusto. ¿En qué te ayudo hoy: ventas, inventario o algo del negocio? 🙂"
El análisis con cifras lo haces SOLO cuando te lo piden explícitamente (por ejemplo con los botones de abajo o preguntando "¿cómo ves el negocio?").

EQUIPO, COMISIONES Y METAS
- Cada vendedor puede tener comisión por venta (%) y sueldo por hora o por día; las metas se fijan por día, semana, mes o año, para el negocio o por vendedor.
- Si preguntan cuánto le toca a cada quien, cuánto van a pagar de nómina o cómo van las metas, usa buscar_datos {tema:'equipo'} y responde con la tabla simple: nombre, ventas, comisión, sueldo y total.
- Si te piden poner una comisión ("dale 5% a Juan"), usa set_price NO: explica que se cambia en Usuarios → editar empleado → Comisión por venta.

FINANZAS PERSONALES DEL DUEÑO (aparte del negocio)
- Si te dicen que gastaron o cobraron algo propio ("gasté 300 en comida", "me pagaron 2000"), usa registrar_movimiento_personal (monto, descripcion, metodo efectivo|tarjeta, tipo gasto|ingreso).
- Si dicen cuánto quieren ahorrar al mes ("quiero ahorrar 3000"), usa set_saving_goal.
- Si preguntan cuánto pueden gastar hoy, cuánto llevan gastado o cómo van sus finanzas personales, usa buscar_datos {tema:'personal'} y responde con el número: presupuesto diario recomendado, lo gastado hoy y lo que les queda. Explica en una línea de dónde sale ese cálculo (ingresos − meta de ahorro, entre 30 días).
- Si el presupuesto diario no se puede calcular (sin datos), dilo y pide que registren un ingreso o un gasto.

CUANDO PIDAN UNA ACCIÓN
Hazla con la herramienta correspondiente y espera la confirmación del usuario. Nunca digas que ya lo hiciste antes de que confirme.

LO QUE CONOCES DEL NEGOCIO
Ventas por día/semana/mes, ticket promedio, utilidad bruta (precio − costo), margen, gastos, resultado, top productos, productos que no rotan, stock por talla y sucursal, clientes con saldo, mezcla efectivo/tarjeta, apartados, cupones, checador y nómina.
El sistema tiene: Inicio, Vender (POS con tallas), Cobro (efectivo/débito/crédito/dividido), Productos, Ventas, Apartados, Cupones, Clientes, Finanzas, Checador, Nómina, Usuarios con roles, Catálogo online, Sucursales, Impresoras y escáner.
Tallas: Damas 22-27, Infantil 12-21.5, Caballero 22-30, Escolar US 1-6.5, ropa XS-XXL.`;

function toGeminiSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const out = Array.isArray(s) ? [] : {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'type' && typeof v === 'string') out[k] = v.toUpperCase();
    else if (k === 'properties') { out[k] = {}; for (const [pk, pv] of Object.entries(v)) out[k][pk] = toGeminiSchema(pv); }
    else out[k] = toGeminiSchema(v);
  }
  return out;
}

/* ---------- Llamada al proveedor vía servidor (sin CORS) ---------- */
function cloudAuthHeader() {
  try {
    const s = JSON.parse(localStorage.getItem('zoco.cloud.session') || 'null');
    return s?.access_token ? { Authorization: 'Bearer ' + s.access_token } : {};
  } catch { return {}; }
}
async function callModel({ provider, key, model, baseUrl, messages, images }) {
  const r = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cloudAuthHeader()) },
    body: JSON.stringify({
      provider, key: key || '', model, baseUrl, messages, images: images || [],
      company: state.currentCompany || 'default',
      system: systemPrompt(), tools: TOOL_DEFS,
    }),
  });
  if (!r.ok) throw new Error('Servidor ' + r.status + ': ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return { text: j.text || '', calls: j.calls || [] };
}

/* ---------- Respuesta local cuando no hay API key ---------- */
function localAnswer(q) {
  const s = storeSnapshot();
  const t = q.toLowerCase();

  // Busca productos mencionados por nombre
  const found = state.products.filter((p) => {
    const words = p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return words.some((w) => t.includes(w)) || t.includes(p.code.toLowerCase());
  });
  if (found.length) {
    return found.slice(0, 4).map((p) => {
      const stock = Object.entries(p.branchStock?.[state.currentBranch] || {}).filter(([, v]) => Number(v) > 0);
      const tallas = stock.map(([sz, v]) => sz + ' (' + v + ')').join(' · ') || 'agotado';
      return `**${p.name}** — ${money(p.price)}\nSKU ${p.code}${p.color ? ' · ' + p.color : ''}\nTallas con stock: ${tallas}`;
    }).join('\n\n');
  }

  if (/cu[aá]nto (vend|factur)|ventas de hoy|hoy/.test(t)) {
    return `Hoy llevas **${money(s.ventas_hoy.monto)}** en ${s.ventas_hoy.tickets} venta(s). En total: ${money(s.ventas_totales.monto)} en ${s.ventas_totales.tickets} tickets.`;
  }
  if (/stock|inventario|agotad|talla/.test(t)) {
    if (!s.stock_bajo.length) return `Tienes ${s.productos} productos y ninguno está en stock bajo.`;
    return `Stock bajo en:\n` + s.stock_bajo.map((p) => `• ${p.name}: ${p.total} piezas`).join('\n');
  }
  if (/producto|art[ií]culo/.test(t)) return `Tienes ${s.productos} productos registrados en ${s.sucursal}.`;
  if (/sucursal/.test(t)) return `Estás en la sucursal ${s.sucursal}. Hay ${state.branches.length} sucursales configuradas.`;
  return `Soy tu asistente de ZoCo. Puedo decirte ventas del día, stock bajo, precios de productos y sucursales.\n\nDato: hoy ${money(s.ventas_hoy.monto)} en ${s.ventas_hoy.tickets} ventas.\n\nConfigura tu API key para preguntas más complejas.`;
}

/* ---------- Vista ---------- */

/* ---------- Guía de uso del asistente ---------- */
function openGuide() {
  const m = modal({
    title: '¿Qué puedo hacer?',
    size: 'lg',
    body: `
      <div class="guide">
        <section>
          <h4>💬 Háblame normal</h4>
          <p>No necesitas palabras especiales. Escríbeme como si me hablaras a ti: con errores, corto o largo, yo entiendo la intención.</p>
        </section>

        <section>
          <h4>🔍 Consultar y analizar</h4>
          <ul>
            <li>"¿Cómo va el negocio?" · "¿Cuánto vendí hoy?"</li>
            <li>"¿Estoy ganando o perdiendo?" · "¿Cuál es mi margen?"</li>
            <li>"¿Qué producto me deja más?" · "¿Qué no se mueve?"</li>
            <li>"¿Qué está por agotarse?" · "¿Quién me debe?"</li>
          </ul>
        </section>

        <section>
          <h4>⚙️ Hacer cambios (te pido confirmación)</h4>
          <ul>
            <li>"Sube el Nike a 1500" · "Baja el precio del botín 100 pesos"</li>
            <li>"Agrega 5 pares del botín talla 25"</li>
            <li>"Cancela la última venta" · "Registra un gasto de 850 de luz"</li>
            <li>"Crea el cupón VERANO de 15%" · "Da de alta al cliente Juan"</li>
            <li>"Abre caja con 500" · "Cierra la caja"</li>
          </ul>
        </section>

        <section>
          <h4>📎 Subir tu inventario</h4>
          <p>Toca el clip y elige el archivo. Yo leo las columnas y te muestro una vista previa antes de cargar nada.</p>
          <ul>
            <li><b>Excel / CSV</b> → funciona con <b>todos</b> los proveedores.</li>
            <li><b>PDF</b> → con <b>Gemini</b> o <b>Claude</b>.</li>
            <li><b>Foto</b> → con <b>Gemini</b>, <b>GPT</b> o <b>Claude</b> (no con DeepSeek).</li>
          </ul>
          <p class="tip">Tip: si tu Excel trae columnas por talla (22, 23, 24…) las detecto solas.</p>
        </section>

        <section>
          <h4>💵 ¿Cuál conviene? (de más barato a más caro)</h4>
          <div class="guide-prov">
            <div><b>DeepSeek</b><span>El más económico 💚 · texto, Excel y CSV. No lee fotos ni PDF.</span></div>
            <div><b>Gemini Flash</b><span>Muy económico · lee fotos, PDF y archivos. Ideal para el día a día.</span></div>
            <div><b>GPT (mini)</b><span>Precio medio · lee fotos, muy buena redacción.</span></div>
            <div><b>Claude</b><span>El más caro · el más preciso con tablas y documentos largos.</span></div>
          </div>
        </section>

        <section>
          <h4>💡 Para que te ayude mejor</h4>
          <ul>
            <li>Ten capturado el <b>costo</b> de tus productos: sin eso el margen sale inflado.</li>
            <li>Si algo no lo entiende, explícale como a un empleado nuevo.</li>
            <li>Pídele opinión, no solo datos: "¿qué harías tú?".</li>
          </ul>
        </section>
      </div>`,
    foot: '<button class="btn sm" data-close>Entendido</button>',
  });
  return m;
}
export function aiView() {
  const root = el(`<div class="ai-wrap"></div>`);
  let busy = false;

  function render() {
    const st = state.settings;
    const cfg = PROVIDERS[st.aiProvider || 'gemini'];
    root.innerHTML = `
      <div class="ai-shell">
        <aside class="ai-side">
          <div class="ai-side-h">Agente IA</div>
          <div class="field"><label>Proveedor</label>
            <select id="ai-p">${Object.entries(PROVIDERS).map(([k, v]) => `<option value="${k}" ${k === (st.aiProvider || 'gemini') ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Modelo</label>
            ${cfg.models.length
              ? `<select id="ai-m">
                   ${cfg.models.map((m) => `<option value="${m}" ${(st.aiModel || cfg.default) === m ? 'selected' : ''}>${m}</option>`).join('')}
                   <option value="__custom" ${st.aiModel && !cfg.models.includes(st.aiModel) ? 'selected' : ''}>Otro (escribir)…</option>
                 </select>
                 <input id="ai-m2" placeholder="ID exacto del modelo" value="${esc(st.aiModel && !cfg.models.includes(st.aiModel) ? st.aiModel : '')}"
                   style="margin-top:6px;${st.aiModel && !cfg.models.includes(st.aiModel) ? '' : 'display:none'}">`
              : `<input id="ai-m" value="${esc(st.aiModel || '')}" placeholder="llama-3.1-70b">`}
          </div>
          <div class="field"><label>API key</label><input id="ai-k" type="password" placeholder="${cfg.keyHint}" value="${esc(st.aiKey || '')}">
            <div class="hint">Se guarda en este dispositivo. Cada negocio usa su propia llave.</div></div>
          <div class="field" id="ai-url-wrap" style="display:${(st.aiProvider || 'gemini') === 'custom' ? '' : 'none'}">
            <label>Base URL</label><input id="ai-u" placeholder="https://mi-proxy/v1" value="${esc(st.aiBaseUrl || '')}">
          </div>
          <button class="btn sm" id="ai-save">Guardar</button>
          <button class="btn sm ghost" id="ai-test" style="margin-top:8px">Probar conexión</button>
          <button class="btn ghost sm" id="ai-guide" style="margin-top:8px;width:100%">❓ ¿Qué puedo hacer?</button>
          <div class="ai-note">
            ${st.aiKey ? '✅ Llave configurada' : '⚠️ Sin llave: modo demo local'}
          </div>
        </aside>

        <main class="ai-main">
          <div class="ai-head"><b>Asistente ZoCo</b><span class="badge info">beta</span>
          <div class="sp"></div>
          <button type="button" class="btn ghost sm ai-gear" id="ai-gear" title="Configuración del agente">⚙</button>
            <button class="btn ghost sm" id="ai-clear" style="margin-left:auto;height:30px;font-size:12px">Limpiar</button>
          </div>
          <div class="ai-msgs" id="msgs">
            ${CHAT.length ? CHAT.map((m, i) => `
              <div class="msg ${m.role}"><div class="bubble">${format(m.content)}${m.action ? actionCard(m, i) : ''}</div></div>`).join('')
              : `<div class="ai-empty">
                  <div class="big">✦</div>
                  <b>Pregúntame lo que sea de tu negocio</b>
                  <div class="chips">
                    <button class="chip" data-q="Oye, ¿cómo ves el negocio esta semana?">¿Cómo ves el negocio?</button>
                    <button class="chip" data-q="¿Crees que estoy ganando o perdiendo? échale un ojo al mes">¿Estoy ganando?</button>
                    <button class="chip" data-q="¿Qué me conviene empujar y qué no se mueve?">¿Qué empujo?</button>
                    <button class="chip" data-q="Dame ideas para vender más este mes">Dame ideas</button>
                  </div>
                </div>`}
          </div>
          <div class="ai-quick">
            <button class="chip" data-q="¿Cómo ves el negocio?">📊 ¿Cómo ves el negocio?</button>
            <button class="chip" data-q="¿Estoy ganando o perdiendo? revisa los últimos 30 días">💰 ¿Estoy ganando?</button>
            <button class="chip" data-q="¿Qué me conviene empujar y qué no se mueve?">👟 ¿Qué empujo?</button>
          </div>
          <form class="ai-input" id="ai-form">
            <button type="button" class="btn ghost sm" id="ai-file" title="Cargar inventario desde Excel/CSV" style="height:42px;padding:0 12px">📎</button>
            <button type="button" class="btn ghost sm" id="ai-img" title="Leer inventario de una foto" style="height:42px;padding:0 12px">📷</button>
            <input id="ai-q" placeholder="Escribe tu pregunta…" autocomplete="off" ${busy ? 'disabled' : ''}>
            <button class="btn sm" ${busy ? 'disabled' : ''}>${busy ? '…' : 'Enviar'}</button>
          </form>
        </main>
      </div>`;

    root.querySelector('#ai-p').onchange = (e) => {
      state.settings.aiProvider = e.target.value;
      state.settings.aiModel = '';
      persist(); render();
    };
    root.querySelector('#ai-save').onclick = () => {
      state.settings.aiProvider = root.querySelector('#ai-p').value;
      const sel = root.querySelector('#ai-m');
      const txt = root.querySelector('#ai-m2');
      const model = sel
        ? (sel.value === '__custom' ? (txt?.value || '').trim() : sel.value)
        : (sel?.value || '').trim();
      state.settings.aiModel = model;
      state.settings.aiKey = root.querySelector('#ai-k').value.trim();
      state.settings.aiBaseUrl = root.querySelector('#ai-u')?.value.trim() || '';
      persist(); toast('Configuración guardada');
      render();
    };
    const modelSel = root.querySelector('#ai-m');
    const modelTxt = root.querySelector('#ai-m2');
    if (modelSel && modelTxt) {
      modelSel.onchange = () => { modelTxt.style.display = modelSel.value === '__custom' ? '' : 'none'; };
    }
    root.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => send(b.dataset.q));
    root.querySelector('#ai-clear').onclick = () => { CHAT.length = 0; saveChat(); render(); };
    root.querySelector('#ai-file').onclick = () => {
      const inp = document.createElement('input');
      inp.id = 'ai-fileselect';
      inp.style.display = 'none';
      inp.type = 'file'; inp.accept = '.csv,.txt,.tsv,.pdf,application/pdf';
      document.body.appendChild(inp);
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) return;
        const isPdf = /\.pdf$/i.test(f.name) || f.type === 'application/pdf';

        if (!isPdf) {
          const rd = new FileReader();
          rd.onload = () => openImportModal(() => {
            CHAT.push({ role: 'assistant', content: 'Listo, cargué el inventario que subiste. ¿Quieres que revise algo de lo que se importó?' });
            saveChat(); render();
          }, String(rd.result || ''));
          rd.readAsText(f, 'utf-8');
          return;
        }

        // PDF: lo interpreta el modelo (Gemini/Claude leen PDF)
        const st = state.settings;
        const prov = st.aiProvider || 'gemini';
        if (!st.aiKey) { toast('Para leer PDF necesitas API key de Gemini o Claude'); return; }
        if (prov !== 'gemini' && prov !== 'anthropic') {
          toast('PDF: cambia el proveedor a Gemini o Anthropic (OpenAI y DeepSeek no leen PDF aquí)');
          return;
        }
        busy = true;
        CHAT.push({ role: 'user', content: '📄 ' + f.name });
        saveChat(); render();
        try {
          const b64 = await new Promise((res) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.readAsDataURL(f);
          });
          const r = await callModel({
            provider: prov, key: st.aiKey, model: st.aiModel, baseUrl: st.aiBaseUrl,
            images: [b64],
            messages: [{
              role: 'user',
              content: 'Lee este PDF y extrae el inventario de productos. Devuelve SOLO CSV con encabezados: nombre,precio,costo,cantidad,sku,categoria,color. Si hay columnas por talla (22, 23...), inclúyelas. Sin explicaciones ni ```',
            }],
          });
          const csv = String(r.text || '').replace(/```[a-z]*/gi, '').trim();
          CHAT.push({ role: 'assistant', content: 'Leí el PDF. Revisa antes de cargar:' });
          saveChat(); busy = false; render();
          if (csv && csv.split('\n').length > 1) openImportModal(() => { emit(); }, csv);
          else toast('No pude extraer la tabla del PDF');
        } catch (e) {
          CHAT.push({ role: 'assistant', content: 'No pude leer el PDF: ' + (e.message || e) });
          saveChat(); busy = false; render();
        }
      };
      inp.click();
    };

    root.querySelector('#ai-img').onclick = () => {
      const st = state.settings;
      if (!st.aiKey) { toast('Para leer fotos necesitas una API key (Gemini, GPT o Claude)'); return; }
      if ((st.aiProvider || 'gemini') === 'deepseek') {
        toast('DeepSeek no lee imágenes: cambia a Gemini, OpenAI o Anthropic');
        return;
      }
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) return;
        busy = true;
        CHAT.push({ role: 'user', content: '📷 Foto: ' + f.name });
        saveChat(); render();
        try {
          const img = await readImageCompressed(f, 1400, 0.85);
          const res = await callModel({
            provider: st.aiProvider || 'gemini',
            key: st.aiKey,
            model: st.aiModel,
            baseUrl: st.aiBaseUrl,
            images: [img.dataUrl],
            messages: [
              { role: 'user', content: 'Lee esta imagen y extrae el inventario. Devuelve SOLO CSV con la primera línea de encabezados: nombre,precio,costo,cantidad,sku,categoria,color. Si la imagen tiene columnas por talla (22, 23, 24...), inclúyelas como columnas. Sin explicaciones, sin ```.' },
            ],
          });
          const csv = String(res.text || '').replace(/```[a-z]*/gi, '').trim();
          CHAT.push({ role: 'assistant', content: 'Leí la imagen. Revisa lo que encontré antes de cargarlo:' });
          saveChat(); busy = false; render();
          if (csv && csv.split('\n').length > 1) openImportModal(() => { emit(); }, csv);
          else toast('No pude extraer una tabla de la imagen');
        } catch (e) {
          CHAT.push({ role: 'assistant', content: 'No pude leer la imagen: ' + (e.message || e) });
          saveChat(); busy = false; render();
        }
      };
      inp.click();
    };
    root.querySelector('#ai-guide').onclick = () => openGuide();
    root.querySelector('#ai-test').onclick = async () => {
      const s = state.settings;
      if (!s.aiKey) { toast('Primero guarda tu API key'); return; }
      toast('Probando…');
      try {
        const r = await callModel({
          provider: s.aiProvider || 'gemini', key: s.aiKey, model: s.aiModel, baseUrl: s.aiBaseUrl,
          messages: [{ role: 'user', content: 'Responde solo: OK' }],
        });
        toast('Conectado ✓ ' + String(r.text || (r.calls?.length ? 'herramientas OK' : '')).slice(0, 40));
      } catch (e) {
        toast('Error: ' + (e.message || e));
      }
    };
    root.querySelector('#ai-gear')?.addEventListener('click', () => {
      root.querySelector('.ai-side')?.classList.toggle('open');
    });
    root.querySelector('#ai-form').onsubmit = (e) => {
      e.preventDefault();
      const v = root.querySelector('#ai-q').value.trim();
      if (v) send(v);
    };
    bindActions();
    const msgs = root.querySelector('#msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  function actionCard(m, i) {
    const a = ACTIONS[m.action.action];
    if (!a) return '';
    const desc = m.action.desc || describeAction(m.action.action, m.action.params);
    const allowed = canRun(m.action.action);
    return `<div class="ai-action">
      <div class="aa-title">⚙ ${esc(a.label)}</div>
      <div class="aa-desc">${esc(desc)}</div>
      ${m.done
        ? `<div class="aa-result ${m.result?.ok ? 'ok' : 'bad'}">${esc(m.result?.msg || '')}</div>`
        : !allowed
          ? '<div class="aa-result bad">No tienes permiso para esta acción</div>'
          : `<div class="aa-btns">
               <button class="btn sm" data-apply="${i}">Aplicar</button>
               <button class="btn ghost sm" data-cancel="${i}">Cancelar</button>
             </div>`}
    </div>`;
  }

  function bindActions() {
    root.querySelectorAll('[data-apply]').forEach((b) => b.onclick = () => {
      const i = Number(b.dataset.apply);
      const m = CHAT[i];
      if (!m?.action) return;
      const r = runAction(m.action.action, m.action.params);
      m.done = true;
      m.result = r;
      m.content = 'Acción ejecutada:';
      saveChat();
      render();
      toast(r.msg);
    });
    root.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = () => {
      const i = Number(b.dataset.cancel);
      const m = CHAT[i];
      if (!m) return;
      m.done = true;
      m.result = { ok: false, msg: 'Cancelado por el usuario' };
      m.content = 'Acción cancelada.';
      saveChat();
      render();
    });
  }

  function persist() {
    localStorage.setItem('zoco.pos.v1', JSON.stringify(state));
  }

  function format(t) {
    return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }

  async function send(text) {
    if (busy) return;
    CHAT.push({ role: 'user', content: text });
    saveChat();
    busy = true; render();

    const st = state.settings;
    const intent = !st.aiKey ? localIntent(text) : null;
    if (intent) {
      CHAT.push({ role: 'assistant', content: 'Puedo hacer esto:', action: { ...intent, desc: describeAction(intent.action, intent.params) }, done: false });
      saveChat(); busy = false; render(); return;
    }
    try {
      let answer;
      if (!st.aiKey) {
        await new Promise((r) => setTimeout(r, 300));
        answer = localAnswer(text);
      } else {
        const cfgArgs = { provider: st.aiProvider || 'gemini', key: st.aiKey, model: st.aiModel, baseUrl: st.aiBaseUrl };
        const convo = () => CHAT.map((m) => ({ role: m.role, content: m.content }));

        let res = await callModel({ ...cfgArgs, messages: convo() });
        let actions = (res.calls || []).filter((c) => c.name !== 'buscar_datos');

        // 1) El modelo pidió datos → se los damos y que redacte
        const dataCall = (res.calls || []).find((c) => c.name === 'buscar_datos');
        if (dataCall) {
          const data = runQuery(dataCall.args || {});
          res = await callModel({
            ...cfgArgs,
            messages: [...convo(), {
              role: 'user',
              content: 'Datos consultados (JSON): ' + JSON.stringify(data)
                + '\nResponde al usuario en español, breve, usando esas cifras exactas.',
            }],
          });
          actions = actions.concat((res.calls || []).filter((c) => c.name !== 'buscar_datos'));
        }

        // 2) Varias acciones → una tarjeta por cada una (máx 3)
        if (actions.length) {
          if (res.text) CHAT.push({ role: 'assistant', content: res.text });
          actions.slice(0, 3).forEach((a) => {
            CHAT.push({
              role: 'assistant', content: 'Voy a ejecutar esta acción:',
              action: { action: a.name, params: a.args || {}, desc: describeAction(a.name, a.args || {}) },
              done: false,
            });
          });
          saveChat(); busy = false; render(); return;
        }

        answer = res.text || '(sin respuesta)';
      }
      const act = parseAction(answer);
      if (act) CHAT.push({ role: 'assistant', content: 'Voy a ejecutar esta acción:', action: { ...act, desc: describeAction(act.action, act.params) }, done: false });
      else CHAT.push({ role: 'assistant', content: answer });
      saveChat();
    } catch (e) {
      CHAT.push({
        role: 'assistant',
        content: /authentication fails|api key.*invalid|invalid api key|incorrect api key|401|unauthorized/i.test(String(e.message || e))
          ? 'La clave API fue rechazada por el proveedor. Revisa en ⚙ Configuración que elegiste el proveedor correcto y vuelve a guardar una clave vigente. No compartas tu clave por chat. Detalle: ' + String(e.message || e).slice(0, 240)
          : 'No pude conectar con el proveedor: ' + (e.message || e) + '\n\nRevisa la configuración del proveedor y vuelve a probar la conexión.',
      });
    } finally {
      busy = false; render();
    }
  }

  render();
  return { root, refresh() {} };

}
