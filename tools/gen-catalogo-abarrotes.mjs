// Genera el catálogo base de abarrotes con MARCAS mexicanas y fotos reales.
// Fuente de fotos: Open Food Facts (ODbL / imágenes CC BY-SA).
import fs from 'node:fs';

// [nombre visible, marca, sección]
const ITEMS = [
  ['Coca-Cola Original 600 ml', 'Coca-Cola', 'bebidas'],
  ['Coca-Cola Sin Azúcar 600 ml', 'Coca-Cola', 'bebidas'],
  ['Pepsi 600 ml', 'Pepsi', 'bebidas'],
  ['Sprite 600 ml', 'Sprite', 'bebidas'],
  ['Fanta Naranja 600 ml', 'Fanta', 'bebidas'],
  ['Peñafiel Agua Mineral 600 ml', 'Peñafiel', 'bebidas'],
  ['Bonafont Agua Natural 1 L', 'Bonafont', 'bebidas'],
  ['Ciel Agua Natural 1 L', 'Ciel', 'bebidas'],
  ['Jumex Jugo de Naranja 1 L', 'Jumex', 'bebidas'],
  ['Del Valle Jugo de Mango 1 L', 'Del Valle', 'bebidas'],
  ['Boing Guayaba 1 L', 'Boing', 'bebidas'],
  ['Powerade Mora Azul 600 ml', 'Powerade', 'bebidas'],
  ['Gatorade Naranja 600 ml', 'Gatorade', 'bebidas'],
  ['Red Bull 250 ml', 'Red Bull', 'bebidas'],
  ['Lala Leche Entera 1 L', 'Lala', 'lacteos'],
  ['Alpura Leche Entera 1 L', 'Alpura', 'lacteos'],
  ['Santa Clara Leche Entera 1 L', 'Santa Clara', 'lacteos'],
  ['Lala Leche Deslactosada 1 L', 'Lala', 'lacteos'],
  ['Carnation Leche Evaporada 370 g', 'Carnation', 'lacteos'],
  ['La Lechera Leche Condensada 393 g', 'La Lechera', 'lacteos'],
  ['Yoplait Yogurt Natural 900 g', 'Yoplait', 'lacteos'],
  ['Lala Yogurt Fresa 1 kg', 'Lala', 'lacteos'],
  ['Crema Lala 200 ml', 'Lala', 'lacteos'],
  ['Queso Panela Los Volcanes 400 g', 'Los Volcanes', 'lacteos'],
  ['Queso Manchego Nochebuena 400 g', 'Nochebuena', 'lacteos'],
  ['Philadelphia Queso Crema 190 g', 'Philadelphia', 'lacteos'],
  ['Kellogg\'s Corn Flakes 500 g', 'Kellogg\'s', 'abarrotes'],
  ['Zucaritas 490 g', 'Kellogg\'s', 'abarrotes'],
  ['Choco Krispis 440 g', 'Kellogg\'s', 'abarrotes'],
  ['Quaker Avena 400 g', 'Quaker', 'abarrotes'],
  ['Gamesa Galletas María 170 g', 'Gamesa', 'abarrotes'],
  ['Emperador Chocolate 250 g', 'Gamesa', 'abarrotes'],
  ['Saladitas 200 g', 'Gamesa', 'abarrotes'],
  ['Bimbo Pan Blanco 640 g', 'Bimbo', 'abarrotes'],
  ['Bimbo Pan Integral 620 g', 'Bimbo', 'abarrotes'],
  ['Tortillas de Maíz 1 kg', 'Maseca', 'abarrotes'],
  ['Maseca Harina de Maíz 1 kg', 'Maseca', 'abarrotes'],
  ['Harina de Trigo Selecta 1 kg', 'Selecta', 'abarrotes'],
  ['Arroz Verde Valle 1 kg', 'Verde Valle', 'abarrotes'],
  ['Frijol Negro Verde Valle 1 kg', 'Verde Valle', 'abarrotes'],
  ['Frijol Pinto 1 kg', 'Verde Valle', 'abarrotes'],
  ['Lentejas Verde Valle 500 g', 'Verde Valle', 'abarrotes'],
  ['Aceite Nutrioli 900 ml', 'Nutrioli', 'abarrotes'],
  ['Aceite Mazola 900 ml', 'Mazola', 'abarrotes'],
  ['Azúcar Zulka 2 kg', 'Zulka', 'abarrotes'],
  ['Sal La Fina 1 kg', 'La Fina', 'abarrotes'],
  ['Nescafé Clásico 200 g', 'Nescafé', 'abarrotes'],
  ['Café Legal 454 g', 'Legal', 'abarrotes'],
  ['Té McCormick Manzanilla 25 sobres', 'McCormick', 'abarrotes'],
  ['Chocolate Abuelita 540 g', 'Abuelita', 'abarrotes'],
  ['Atún Dolores en Agua 140 g', 'Dolores', 'abarrotes'],
  ['Atún Tuny en Aceite 140 g', 'Tuny', 'abarrotes'],
  ['Sardina La Costeña 425 g', 'La Costeña', 'abarrotes'],
  ['Mayonesa McCormick 370 g', 'McCormick', 'abarrotes'],
  ['Catsup Heinz 370 g', 'Heinz', 'abarrotes'],
  ['Mostaza French\'s 220 g', 'French\'s', 'abarrotes'],
  ['Salsa Valentina 370 ml', 'Valentina', 'abarrotes'],
  ['Salsa La Costeña 370 ml', 'La Costeña', 'abarrotes'],
  ['Sopa Maggi 200 g', 'Maggi', 'abarrotes'],
  ['Spaghetti La Moderna 500 g', 'La Moderna', 'abarrotes'],
  ['Fideo La Moderna 500 g', 'La Moderna', 'abarrotes'],
  ['Consomé Knorr 4 pzas', 'Knorr', 'abarrotes'],
  ['Caldo Maggi 4 pzas', 'Maggi', 'abarrotes'],
  ['Gelatina D\'Gari 120 g', 'D\'Gari', 'abarrotes'],
  ['Flan Danone 120 g', 'Danone', 'abarrotes'],
  ['Mermelada McCormick Fresa 270 g', 'McCormick', 'abarrotes'],
  ['Miel Carlota 500 g', 'Carlota', 'abarrotes'],
  ['Sabritas Original 45 g', 'Sabritas', 'botanas'],
  ['Doritos Nacho 62 g', 'Doritos', 'botanas'],
  ['Cheetos Flamin\' Hot 52 g', 'Cheetos', 'botanas'],
  ['Ruffles Queso 55 g', 'Ruffles', 'botanas'],
  ['Palomitas Act II 90 g', 'Act II', 'botanas'],
  ['Cacahuates Mafer 150 g', 'Mafer', 'botanas'],
  ['Trident Menta 14 g', 'Trident', 'botanas'],
  ['Pulparindo 20 g', 'De la Rosa', 'botanas'],
  ['Carlos V 24 g', 'Carlos V', 'botanas'],
  ['Zote Jabón 200 g', 'Zote', 'limpieza'],
  ['Roma Jabón en Polvo 1 kg', 'Roma', 'limpieza'],
  ['Ariel Detergente 1 kg', 'Ariel', 'limpieza'],
  ['Cloralex Cloro 1 L', 'Cloralex', 'limpieza'],
  ['Fabuloso Lavanda 1 L', 'Fabuloso', 'limpieza'],
  ['Pinol 1 L', 'Pinol', 'limpieza'],
  ['Suavitel 850 ml', 'Suavitel', 'limpieza'],
  ['Regio Papel Higiénico 4 rollos', 'Regio', 'limpieza'],
  ['Pétalo Servilletas 100 pzas', 'Pétalo', 'limpieza'],
  ['Bolsas de Basura 10 pzas', 'Ziploc', 'limpieza'],
  ['Fibras Scotch-Brite 3 pzas', 'Scotch-Brite', 'limpieza'],
  ['Axión Jabón Trastes 750 ml', 'Axión', 'limpieza'],
  ['Head & Shoulders Shampoo 400 ml', 'Head & Shoulders', 'cuidado'],
  ['Pantene Acondicionador 400 ml', 'Pantene', 'cuidado'],
  ['Colgate Pasta Dental 100 ml', 'Colgate', 'cuidado'],
  ['Oral-B Cepillo Dental 2 pzas', 'Oral-B', 'cuidado'],
  ['Speed Stick Desodorante 150 ml', 'Speed Stick', 'cuidado'],
  ['Pétalo Papel Facial 100 hojas', 'Pétalo', 'cuidado'],
  ['Huggies Toallitas 80 pzas', 'Huggies', 'cuidado'],
  ['Gillette Rastrillo 2 pzas', 'Gillette', 'cuidado'],
  ['Pedigree Alimento Perro 2 kg', 'Pedigree', 'mascotas'],
  ['Whiskas Alimento Gato 1 kg', 'Whiskas', 'mascotas'],
  ['Arena para Gato 4 kg', 'Sanicat', 'mascotas'],
  ['Duracell Pilas AA 4 pzas', 'Duracell', 'general'],
  ['Focos LED 9 W', 'Philips', 'general'],
  ['Encendedor 1 pza', 'Cricket', 'general'],
  ['Velas 4 pzas', 'Veladora', 'general'],
  ['Huevo San Juan 12 pzas', 'San Juan', 'general'],
  ['Limón 1 kg', '', 'granel'],
  ['Cebolla 1 kg', '', 'granel'],
  ['Tomate 1 kg', '', 'granel'],
  ['Papa 1 kg', '', 'granel'],
];

const UA = { 'user-agent': 'ZoCoPOS/1.0 (catalogo base)' };
const FIELDS = 'code,product_name,brands,image_front_small_url';
const out = [];
const seen = new Set();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [name, brand, section] of ITEMS) {
  // Busca por marca + producto para acertar la foto
  const q = (brand ? brand + ' ' : '') + name.replace(/\d+.*$/, '').replace(/\(.*\)/, '').trim();
  let best = null;
  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=6&fields=${FIELDS}`;
    const r = await fetch(url, { headers: UA });
    if (r.ok) {
      const j = await r.json();
      const hits = (j.hits || []).filter((h) => h.image_front_small_url && h.code && !seen.has(h.code));
      const porMarca = hits.filter((h) => brand && String(h.brands || '').toLowerCase().includes(brand.toLowerCase().split(' ')[0]));
      best = porMarca[0] || hits[0] || null;
    }
  } catch { /* sin resultado */ }

  if (best) seen.add(best.code);
  out.push({
    name,
    section,
    brand: brand || (best ? String(best.brands || '').split(',')[0].trim() : ''),
    code: best ? String(best.code) : '',
    image: best ? best.image_front_small_url : '',
  });
  await sleep(220);
}

const conFoto = out.filter((p) => p.image).length;
const conMarca = out.filter((p) => p.brand).length;
const conCodigo = out.filter((p) => p.code).length;

const js = `// Catálogo base de abarrotes (${out.length} productos) con marcas mexicanas y fotos.
// Fotos: Open Food Facts (datos ODbL · imágenes CC BY-SA). Punto de partida:
// el negocio ajusta precios y existencias.
export const CATALOGO_ABARROTES = ${JSON.stringify(out)};
export const CATALOGO_ABARROTES_CREDITO = 'Fotos: Open Food Facts (CC BY-SA)';
`;
fs.writeFileSync('C:/ZOCOPOS 2.0/app/js/catalog-abarrotes.js', js, 'utf8');
console.log('productos:', out.length, '| con marca:', conMarca, '| con foto:', conFoto, '| con codigo:', conCodigo);
console.log('KB:', Math.round(js.length / 1024));
