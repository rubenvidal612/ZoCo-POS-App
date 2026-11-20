// Genera el catálogo base de abarrotes con fotos reales (una sola vez).
// Fuente: Open Food Facts (ODbL) — imágenes CC BY-SA, se acredita en la app.
import fs from 'node:fs';

const ITEMS = [
  ['Coca-Cola 600 ml', 'bebidas'], ['Pepsi 600 ml', 'bebidas'], ['Sprite 600 ml', 'bebidas'],
  ['Agua natural 1 L', 'bebidas'], ['Agua mineral 600 ml', 'bebidas'], ['Jugo de naranja 1 L', 'bebidas'],
  ['Jugo de mango 1 L', 'bebidas'], ['Bebida de horchata 1 L', 'bebidas'], ['Té frío limón 600 ml', 'bebidas'],
  ['Bebida energética 473 ml', 'bebidas'], ['Leche entera 1 L', 'lacteos'], ['Leche deslactosada 1 L', 'lacteos'],
  ['Leche evaporada 370 g', 'lacteos'], ['Leche condensada 393 g', 'lacteos'], ['Yogurt natural 900 g', 'lacteos'],
  ['Yogurt de fresa 1 kg', 'lacteos'], ['Crema ácida 200 ml', 'lacteos'], ['Queso panela 400 g', 'lacteos'],
  ['Queso manchego 400 g', 'lacteos'], ['Mantequilla 90 g', 'lacteos'], ['Cereal de maíz 500 g', 'abarrotes'],
  ['Cereal de hojuelas 600 g', 'abarrotes'], ['Avena 400 g', 'abarrotes'], ['Galletas María 170 g', 'abarrotes'],
  ['Galletas de chocolate 250 g', 'abarrotes'], ['Galletas saladas 200 g', 'abarrotes'], ['Pan blanco 640 g', 'abarrotes'],
  ['Pan integral 620 g', 'abarrotes'], ['Tortillas de maíz 1 kg', 'abarrotes'], ['Harina de maíz 1 kg', 'abarrotes'],
  ['Harina de trigo 1 kg', 'abarrotes'], ['Arroz 1 kg', 'abarrotes'], ['Frijol negro 1 kg', 'abarrotes'],
  ['Frijol pinto 1 kg', 'abarrotes'], ['Lentejas 500 g', 'abarrotes'], ['Aceite vegetal 900 ml', 'abarrotes'],
  ['Aceite de oliva 500 ml', 'abarrotes'], ['Azúcar estándar 2 kg', 'abarrotes'], ['Sal de mesa 1 kg', 'abarrotes'],
  ['Café soluble 200 g', 'abarrotes'], ['Café molido 454 g', 'abarrotes'], ['Té de manzanilla 25 sobres', 'abarrotes'],
  ['Chocolate en polvo 800 g', 'abarrotes'], ['Atún en agua 140 g', 'abarrotes'], ['Atún en aceite 140 g', 'abarrotes'],
  ['Sardina en tomate 425 g', 'abarrotes'], ['Mayonesa 370 g', 'abarrotes'], ['Catsup 370 g', 'abarrotes'],
  ['Mostaza 220 g', 'abarrotes'], ['Salsa picante 370 ml', 'abarrotes'], ['Sopa de pasta 200 g', 'abarrotes'],
  ['Pasta para sopa 500 g', 'abarrotes'], ['Spaghetti 500 g', 'abarrotes'], ['Fideos 500 g', 'abarrotes'],
  ['Consomé de pollo 4 pzas', 'abarrotes'], ['Caldo de tomate 4 pzas', 'abarrotes'], ['Gelatina de fresa 120 g', 'abarrotes'],
  ['Flan 120 g', 'abarrotes'], ['Mermelada de fresa 270 g', 'abarrotes'], ['Miel de abeja 500 g', 'abarrotes'],
  ['Cacahuates salados 150 g', 'botanas'], ['Papas fritas 170 g', 'botanas'], ['Frituras de maíz 150 g', 'botanas'],
  ['Nachos 300 g', 'botanas'], ['Palomitas 90 g', 'botanas'], ['Chicles 14 g', 'botanas'],
  ['Dulce de tamarindo 200 g', 'botanas'], ['Chocolate en barra 24 g', 'botanas'], ['Jabón de tocador 150 g', 'limpieza'],
  ['Jabón en polvo 1 kg', 'limpieza'], ['Detergente líquido 1 L', 'limpieza'], ['Cloro 1 L', 'limpieza'],
  ['Limpiador multiusos 1 L', 'limpieza'], ['Limpiador de pisos 1 L', 'limpieza'], ['Suavizante 850 ml', 'limpieza'],
  ['Papel higiénico 4 rollos', 'limpieza'], ['Servilletas 100 pzas', 'limpieza'], ['Toallas de papel 2 rollos', 'limpieza'],
  ['Bolsas de basura 10 pzas', 'limpieza'], ['Fibras para trastes 3 pzas', 'limpieza'], ['Jabón para trastes 750 ml', 'limpieza'],
  ['Shampoo 400 ml', 'cuidado'], ['Acondicionador 400 ml', 'cuidado'], ['Pasta dental 100 ml', 'cuidado'],
  ['Cepillo dental 2 pzas', 'cuidado'], ['Desodorante 150 ml', 'cuidado'], ['Papel facial 100 hojas', 'cuidado'],
  ['Toallitas húmedas 80 pzas', 'cuidado'], ['Rastrillo 2 pzas', 'cuidado'], ['Alimento para perro 2 kg', 'mascotas'],
  ['Alimento para gato 1 kg', 'mascotas'], ['Arena para gato 4 kg', 'mascotas'], ['Pilas AA 4 pzas', 'general'],
  ['Focos LED 9 W', 'general'], ['Encendedor 1 pza', 'general'], ['Velas 4 pzas', 'general'],
  ['Hielo 2 kg', 'general'], ['Huevo 12 pzas', 'general'], ['Toronja 1 kg', 'granel'],
  ['Limón 1 kg', 'granel'], ['Cebolla 1 kg', 'granel'], ['Tomate 1 kg', 'granel'], ['Papa 1 kg', 'granel'],
];

const UA = { 'user-agent': 'ZoCoPOS/1.0 (catalogo base)' };
const FIELDS = 'code,product_name,product_name_es,brands,image_front_small_url,categories';
const out = [];
const seen = new Set();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [name, section] of ITEMS) {
  const query = name.replace(/\d.*$/, '').trim();
  let best = null;
  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=5&fields=${FIELDS}`;
    const r = await fetch(url, { headers: UA });
    if (r.ok) {
      const j = await r.json();
      const hits = (j.hits || []).filter((h) => h.image_front_small_url && h.code);
      best = hits.find((h) => !seen.has(h.code)) || hits[0] || null;
    }
  } catch { /* sin resultado */ }

  if (best && !seen.has(best.code)) {
    seen.add(best.code);
    out.push({
      name,
      section,
      code: String(best.code),
      brand: String(best.brands || '').split(',').slice(0, 1).join('').trim(),
      image: best.image_front_small_url,
    });
  } else {
    out.push({ name, section, code: '', brand: '', image: '' });
  }
  await sleep(250);
}

const conFoto = out.filter((p) => p.image).length;
const conCodigo = out.filter((p) => p.code).length;

const js = `// Catálogo base de abarrotes (${out.length} productos) con fotos de Open Food Facts.
// Datos: ODbL · imágenes CC BY-SA. Se usa como punto de partida; el negocio
// ajusta precios y existencias. Generado automáticamente.
export const CATALOGO_ABARROTES = ${JSON.stringify(out, null, 0)};
export const CATALOGO_ABARROTES_CREDITO = 'Fotos: Open Food Facts (CC BY-SA)';
`;
fs.writeFileSync('C:/ZOCOPOS 2.0/app/js/catalog-abarrotes.js', js, 'utf8');
console.log('productos:', out.length, '| con codigo:', conCodigo, '| con foto:', conFoto);
console.log('KB:', Math.round(js.length / 1024));
