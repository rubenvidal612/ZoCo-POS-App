// Corrige la ubicación: devuelve las secciones de lavandería al objeto SECTIONS
// (se habían insertado por error dentro de MODES).
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/store.js';
let a = fs.readFileSync(ruta, 'utf8');

const bloqueMal = `  lavado:      { label: 'Lavado',           scale: 'none', mode: 'lavanderia' },
  planchado:   { label: 'Planchado',        scale: 'none', mode: 'lavanderia' },
  tintoreria:  { label: 'Tintorería',       scale: 'none', mode: 'lavanderia' },
  tenis:       { label: 'Tenis / calzado',  scale: 'none', mode: 'lavanderia' },
  edredones:   { label: 'Edredones y hogar', scale: 'none', mode: 'lavanderia' },
  insumos:     { label: 'Insumos',          scale: 'none', mode: 'lavanderia' },
`;

// 1) quitarlo de donde quedó (dentro de MODES)
if (a.includes(bloqueMal)) {
  a = a.split(bloqueMal).join('');
  console.log('bloque fuera de MODES');
} else {
  console.log('no se encontró el bloque mal ubicado (revisar)');
}

// 2) insertarlo en SECTIONS, antes del comentario de Restaurante
const ancla = `  // Restaurante / cafetería`;
const bloqueBien = `  // Lavandería / tintorería
  lavado:      { label: 'Lavado',            scale: 'none', mode: 'lavanderia' },
  planchado:   { label: 'Planchado',         scale: 'none', mode: 'lavanderia' },
  tintoreria:  { label: 'Tintorería',        scale: 'none', mode: 'lavanderia' },
  tenis:       { label: 'Tenis / calzado',   scale: 'none', mode: 'lavanderia' },
  edredones:   { label: 'Edredones y hogar', scale: 'none', mode: 'lavanderia' },
  insumos:     { label: 'Insumos',           scale: 'none', mode: 'lavanderia' },

`;
if (a.includes(ancla)) {
  a = a.split(ancla).join(bloqueBien + ancla);
  console.log('secciones insertadas en SECTIONS');
} else {
  console.log('NO se encontró el ancla de restaurante en SECTIONS');
}

fs.writeFileSync(ruta, a, 'utf8');
