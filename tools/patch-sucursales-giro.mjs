// Al cambiar de giro: las sucursales de ejemplo se renombran a nombres neutros.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-catalog.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Aviso + checkbox dentro del modal de cambio de giro (texto dentro de un template literal).
const viejoBody = '          <div class="hint" style="margin-top:6px">Tienes ${state.products.length} producto(s) en total y ${demoCount()} de ejemplo.</div>';

const extra = [
  '',
  '          ${(state.branches || []).some(b => !/^Sucursal/i.test(String(b.name || ""))) ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:12.5px;font-weight:700">',
  '            <input type="checkbox" id="renombrar-sucursales" checked style="margin-top:2px">',
  '            <span>Renombrar sucursales a nombres neutros<br><span class="hint" style="font-weight:400">',
  '              Hoy se llaman: ${(state.branches || []).map(b => esc(b.name)).join(", ")}. Quedarán como Sucursal Principal, Sucursal 2…</span></span>',
  '          </label>` : ""}',
].join('\n');

must(a.includes(viejoBody), 'cuerpo del modal de giro');
a = a.replace(viejoBody, viejoBody + extra);

// 2) Renombrar al elegir cualquier opción del modal o cerrarlo.
const aplicar = [
  '      // Renombrar sucursales si el usuario lo dejó marcado',
  '      const renombrarSucursales = () => {',
  '        const chk = m.root.querySelector("#renombrar-sucursales");',
  '        if (!chk || !chk.checked) return;',
  '        const lista = state.branches || [];',
  '        if (!lista.length) return;',
  '        lista.forEach((b, i) => { b.name = i === 0 ? "Sucursal Principal" : "Sucursal " + (i + 1); });',
  '        emit();',
  '        toast("Sucursales renombradas");',
  '      };',
  '      m.root.querySelector("[data-close]")?.addEventListener("click", renombrarSucursales);',
  '      ["#demo-load", "#demo-blank", "#demo-replace"].forEach((sel) => {',
  '        m.root.querySelector(sel)?.addEventListener("click", renombrarSucursales);',
  '      });',
  '',
].join('\n');

const viejoOverlay = '      m.root.classList.add(\'mode-demo-overlay\');';
must(a.includes(viejoOverlay), 'overlay del modal');
a = a.replace(viejoOverlay, aplicar + viejoOverlay);

fs.writeFileSync(ruta, a, 'utf8');
console.log('renombrado de sucursales al cambiar giro');
