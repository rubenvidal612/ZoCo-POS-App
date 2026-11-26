// Sucursales separadas por giro: cada giro tiene su propia lista.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/store.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

const fn = [
  '/* ================= Sucursales por giro =================',
  ' * Cada giro (zapateria, restaurante, lavanderia...) maneja sus propias',
  ' * sucursales. Las ventas guardan branchId + branchName, asi que el',
  ' * historico anterior sigue completo aunque cambies de giro.',
  ' */',
  'function scopearSucursales(s) {',
  '  const mode = String((s.company && s.company.mode) || "generico");',
  '  if (!s.branchesByMode || typeof s.branchesByMode !== "object") {',
  '    const actuales = Array.isArray(s.branches) && s.branches.length',
  '      ? s.branches',
  '      : [{ id: "b1", name: "Sucursal Principal" }];',
  '    s.branchesByMode = {};',
  '    s.branchesByMode[mode] = actuales;',
  '  }',
  '  let lista = s.branchesByMode[mode];',
  '  if (!Array.isArray(lista) || !lista.length) {',
  '    lista = [{ id: "b-" + mode + "-1", name: "Sucursal Principal" }];',
  '    s.branchesByMode[mode] = lista;',
  '  }',
  '  s.branches = lista;',
  '  if (!lista.some((b) => b.id === s.currentBranch)) s.currentBranch = lista[0].id;',
  '  return s;',
  '}',
  '',
].join('\n');

const anclaFn = 'function load() {';
must(a.includes(anclaFn), 'funcion load');
a = a.replace(anclaFn, fn + anclaFn);

const anclaLoad = '    // guarda reparaciones (usuarios, etc.) de inmediato';
must(a.includes(anclaLoad), 'cierre de load');
a = a.replace(anclaLoad, '    try { scopearSucursales(migrated); } catch {}\n' + anclaLoad);

const exported = [
  '/** Cambia a las sucursales del giro actual (se llama al cambiar de giro). */',
  'export function syncBranchesForMode() {',
  '  scopearSucursales(state);',
  '  emit();',
  '  return state.branches;',
  '}',
  '',
  '/* ================= Sucursales ================= */',
].join('\n');

const anclaExport = '/* ================= Sucursales ================= */';
must(a.includes(anclaExport), 'seccion de sucursales');
a = a.replace(anclaExport, exported);

fs.writeFileSync(ruta, a, 'utf8');
console.log('sucursales por giro en store.js');
