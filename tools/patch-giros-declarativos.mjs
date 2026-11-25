// Deja una sola fuente de verdad para los giros con apartado propio.
// Cada módulo vertical: una pestaña, un giro, nunca dos juntos.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/app.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Registro declarativo, justo después de los imports (antes de cualquier uso)
const anclaImports = `import { landingView } from './views-landing.js';`;
must(a.includes(anclaImports), 'ancla de imports');
const registro = `${anclaImports}

/* ============================================================
   Giros con apartado propio (módulos verticales)

   REGLA: cada giro tiene SU pestaña y solo aparece en SU giro.
   Nunca se muestran dos juntos.

   Para agregar un giro nuevo:
     1. store.js  -> MODES y SECTIONS (secciones del catálogo)
     2. views-*.js -> la vista del módulo
     3. aquí      -> una línea en VERTICALES y una en el mapa de rutas
   ============================================================ */
export const VERTICALES = {
  food: { mode: 'restaurante', label: 'ZoCo Food' },
  beauty: { mode: 'barberia', label: 'ZoCo Belleza' },
  laundry: { mode: 'lavanderia', label: 'ZoCo Lavandería' },
};
const esVertical = (id) => Object.prototype.hasOwnProperty.call(VERTICALES, id);
const verticalPermitido = (id) => !!VERTICALES[id] && state.company?.mode === VERTICALES[id].mode;`;
a = a.replace(anclaImports, registro);

// 2) Filtro del menú: una sola condición, basada en el registro
const filtroViejo = `          const items = g.items.filter((n) => (!['WAITER','KITCHEN'].includes(String(u.role || '').toUpperCase()) || n.id === 'food') && (n.id !== 'food' || (state.company?.mode === 'restaurante' && (can('food.order') || can('food.kitchen') || can('products.edit')))) && (n.id !== 'beauty' || state.company?.mode === 'barberia') && (n.id !== 'laundry' || state.company?.mode === 'lavanderia') && (!n.perm || can(n.perm)) && (!n.super || state.superadmin));`;
const filtroNuevo = `          const items = g.items.filter((n) => (!['WAITER','KITCHEN'].includes(String(u.role || '').toUpperCase()) || n.id === 'food')
            && (!esVertical(n.id) || verticalPermitido(n.id))
            && (n.id !== 'food' || (can('food.order') || can('food.kitchen') || can('products.edit')))
            && (!n.perm || can(n.perm)) && (!n.super || state.superadmin));`;
must(a.includes(filtroViejo), 'filtro del menú');
a = a.replace(filtroViejo, filtroNuevo);

// 3) Si estás en el apartado de un giro y cambias de giro, te saca a Inicio
const anclaMount = `function mount() {
  const content = $('#content');`;
const conRedireccion = `function mount() {
  // Un apartado de giro no puede quedar abierto cuando cambia el giro.
  if (esVertical(route) && !verticalPermitido(route)) {
    route = 'inicio';
    try { history.replaceState(null, '', '#/inicio'); } catch {}
  }
  const content = $('#content');`;
must(a.includes(anclaMount), 'inicio de mount');
a = a.replace(anclaMount, conRedireccion);

fs.writeFileSync(ruta, a, 'utf8');
console.log('registro de giros + filtro único + redirección listos');
