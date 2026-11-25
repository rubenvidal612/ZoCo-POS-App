import { shoeDemoRows, boutiqueDemoRows } from './demo-catalog.js';
// Estado + persistencia (localStorage) + API del servidor
import { uid } from './ui.js';

// Modo demo: datos aislados por navegador y sin tocar servidor ni nube.
const DEMO = (typeof window !== 'undefined') && window.__ZOCO_DEMO__ === true;

const KEY = DEMO ? 'zoco.demo.v1' : 'zoco.pos.v1';
const SKEY = DEMO ? 'zoco.demo.session' : 'zoco.session';

/* ================= Rampas de tallas ================= */
export const SECTIONS = {
  // Zapatería
  dama:      { label: 'Damas',     scale: 'shoe', from: 22, to: 30,   step: 0.5, mode: 'shoe' },
  infantil:  { label: 'Infantil',  scale: 'shoe', from: 12, to: 21.5, step: 0.5, mode: 'shoe' },
  caballero: { label: 'Caballero', scale: 'shoe', from: 22, to: 30,   step: 0.5, mode: 'shoe' },
  escolar:   { label: 'Escolar',   scale: 'us',   from: 1,  to: 6.5,  step: 0.5, mode: 'shoe' },
  bolsas:    { label: 'Bolsas',    scale: 'none', mode: 'shoe' },
  carteras:  { label: 'Carteras',  scale: 'none', mode: 'shoe' },

  // Boutique / ropa
  ropa:       { label: 'Ropa',      scale: 'alpha', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], mode: 'boutique' },
  ropa_nino:  { label: 'Ropa niño', scale: 'alpha', values: ['2', '4', '6', '8', '10', '12', '14', '16'], mode: 'boutique' },
  calzado:    { label: 'Calzado',   scale: 'shoe', from: 22, to: 30, step: 0.5, mode: 'boutique' },
  accesorios: { label: 'Accesorios', scale: 'none', mode: 'boutique' },

  // Abarrotes / tienda
  abarrotes:  { label: 'Abarrotes',  scale: 'none', mode: 'abarrotes' },
  granel:     { label: 'Granel (kg)', scale: 'none', mode: 'abarrotes' },
  bebidas:    { label: 'Bebidas',    scale: 'none', mode: 'abarrotes' },
  limpieza:   { label: 'Limpieza',   scale: 'none', mode: 'abarrotes' },

  // Farmacia
  medicamento: { label: 'Medicamento', scale: 'none', mode: 'farmacia' },
  cuidado:     { label: 'Cuidado personal', scale: 'none', mode: 'farmacia' },
  bebe:        { label: 'Bebé', scale: 'none', mode: 'farmacia' },

  // Papelería
  cuadernos:  { label: 'Cuadernos',  scale: 'none', mode: 'papeleria' },
  escritura:  { label: 'Escritura',  scale: 'none', mode: 'papeleria' },
  papel:      { label: 'Papel',      scale: 'none', mode: 'papeleria' },
  arte:       { label: 'Arte / manualidades', scale: 'none', mode: 'papeleria' },

  // Ferretería
  herramienta: { label: 'Herramienta', scale: 'none', mode: 'ferreteria' },
  tornilleria: { label: 'Tornillería', scale: 'none', mode: 'ferreteria' },
  pintura:     { label: 'Pintura',     scale: 'none', mode: 'ferreteria' },
  electrico:   { label: 'Eléctrico',   scale: 'none', mode: 'ferreteria' },

  // Joyería
  anillos:   { label: 'Anillos',   scale: 'ring', from: 4, to: 12, step: 0.5, mode: 'joyeria' },
  cadenas:   { label: 'Cadenas',   scale: 'none', mode: 'joyeria' },
  pulseras:  { label: 'Pulseras',  scale: 'none', mode: 'joyeria' },
  aretes:    { label: 'Aretes',    scale: 'none', mode: 'joyeria' },

  // Óptica
  armazones: { label: 'Armazones', scale: 'none', mode: 'optica' },
  lentes:    { label: 'Lentes de sol', scale: 'none', mode: 'optica' },
  acc_optical: { label: 'Accesorios', scale: 'none', mode: 'optica' },

  // Carnicería / frutería / panadería
  carne:     { label: 'Carne (kg)',   scale: 'none', mode: 'carniceria' },
  embutidos: { label: 'Embutidos',    scale: 'none', mode: 'carniceria' },
  fruta:     { label: 'Fruta (kg)',   scale: 'none', mode: 'fruteria' },
  verdura:   { label: 'Verdura (kg)', scale: 'none', mode: 'fruteria' },
  pan:       { label: 'Pan',          scale: 'none', mode: 'panaderia' },
  pastel:    { label: 'Pastel',       scale: 'none', mode: 'panaderia' },

  // Dulcería
  dulces:    { label: 'Dulces',   scale: 'none', mode: 'dulceria' },
  botanas:   { label: 'Botanas',  scale: 'none', mode: 'dulceria' },
  juguetes_d: { label: 'Juguetes', scale: 'none', mode: 'dulceria' },

  // Cosméticos
  maquillaje: { label: 'Maquillaje', scale: 'none', mode: 'cosmeticos' },
  perfume:    { label: 'Perfume',    scale: 'none', mode: 'cosmeticos' },
  skincare:   { label: 'Cuidado de piel', scale: 'none', mode: 'cosmeticos' },

  // Electrónica / celulares
  celulares: { label: 'Celulares',  scale: 'none', mode: 'electronica' },
  accesorios_e: { label: 'Accesorios', scale: 'none', mode: 'electronica' },
  audio:     { label: 'Audio',      scale: 'none', mode: 'electronica' },

  // Mascotas
  alimento_m: { label: 'Alimento (kg)', scale: 'none', mode: 'mascotas' },
  accesorios_m: { label: 'Accesorios', scale: 'none', mode: 'mascotas' },
  higiene_m: { label: 'Higiene', scale: 'none', mode: 'mascotas' },

  // Mueblería
  muebles:   { label: 'Muebles', scale: 'none', mode: 'muebleria' },
  colchones: { label: 'Colchones', scale: 'none', mode: 'muebleria' },
  deco:      { label: 'Decoración', scale: 'none', mode: 'muebleria' },

  // Florería
  arreglos:  { label: 'Arreglos', scale: 'none', mode: 'floreria' },
  flores:    { label: 'Flores',   scale: 'none', mode: 'floreria' },
  macetas:   { label: 'Macetas',  scale: 'none', mode: 'floreria' },

  // Barbería / estética
  servicios: { label: 'Servicios', scale: 'none', mode: 'barberia' },
  producto_b: { label: 'Producto', scale: 'none', mode: 'barberia' },

  // Restaurante / cafetería
  platillos: { label: 'Platillos', scale: 'none', mode: 'restaurante' },
  bebidas_r: { label: 'Bebidas',   scale: 'none', mode: 'restaurante' },
  postres:   { label: 'Postres',   scale: 'none', mode: 'restaurante' },

  // Mercería
  botones:   { label: 'Botones',  scale: 'none', mode: 'merceria' },
  listones:  { label: 'Listones', scale: 'none', mode: 'merceria' },
  telas:     { label: 'Telas',    scale: 'none', mode: 'merceria' },

  // Refaccionaria
  refacciones: { label: 'Refacciones', scale: 'none', mode: 'refaccionaria' },
  aceites:     { label: 'Aceites',     scale: 'none', mode: 'refaccionaria' },
  llantas:     { label: 'Llantas',     scale: 'none', mode: 'refaccionaria' },

  // Perfumería / fragancias por concentrado
  perf_concentrado: { label: 'Concentrados', scale: 'none', mode: 'perfumeria' },
  perf_alcohol:     { label: 'Alcohol / fijador', scale: 'none', mode: 'perfumeria' },
  perf_frascos:     { label: 'Frascos', scale: 'alpha', values: ['30 ml', '50 ml', '100 ml', '250 ml'], mode: 'perfumeria' },
  perf_kits:        { label: 'Kits y regalos', scale: 'none', mode: 'perfumeria' },
  perf_accesorios:  { label: 'Accesorios', scale: 'none', mode: 'perfumeria' },

  // General
  general:    { label: 'General',     scale: 'none', mode: 'general' },
  electronica:{ label: 'Electrónica', scale: 'none', mode: 'general' },
};

/** Giros de negocio: cada uno habilita sus secciones. Se pueden agregar más aquí. */
export const MODES = {
  shoe:        { label: 'Zapatería',                 sections: ['dama', 'infantil', 'caballero', 'escolar', 'bolsas', 'carteras'] },
  boutique:    { label: 'Boutique (ropa/accesorios)', sections: ['ropa', 'ropa_nino', 'calzado', 'accesorios'] },
  abarrotes:   { label: 'Abarrotes / tienda',         sections: ['abarrotes', 'granel', 'bebidas', 'limpieza'] },
  farmacia:    { label: 'Farmacia',                   sections: ['medicamento', 'cuidado', 'bebe'] },
  papeleria:   { label: 'Papelería',                  sections: ['cuadernos', 'escritura', 'papel', 'arte'] },
  ferreteria:  { label: 'Ferretería',                 sections: ['herramienta', 'tornilleria', 'pintura', 'electrico'] },
  joyeria:     { label: 'Joyería',                    sections: ['anillos', 'cadenas', 'pulseras', 'aretes'] },
  optica:      { label: 'Óptica',                     sections: ['armazones', 'lentes', 'acc_optical'] },
  carniceria:  { label: 'Carnicería',                 sections: ['carne', 'embutidos'] },
  fruteria:    { label: 'Frutería / verdulería',      sections: ['fruta', 'verdura'] },
  panaderia:   { label: 'Panadería',                  sections: ['pan', 'pastel'] },
  dulceria:    { label: 'Dulcería',                   sections: ['dulces', 'botanas', 'juguetes_d'] },
  cosmeticos:  { label: 'Cosméticos / perfumería',    sections: ['maquillaje', 'perfume', 'skincare'] },
  electronica: { label: 'Celulares / electrónica',    sections: ['celulares', 'accesorios_e', 'audio'] },
  mascotas:    { label: 'Mascotas / veterinaria',     sections: ['alimento_m', 'accesorios_m', 'higiene_m'] },
  muebleria:   { label: 'Mueblería',                  sections: ['muebles', 'colchones', 'deco'] },
  floreria:    { label: 'Florería',                   sections: ['arreglos', 'flores', 'macetas'] },
  barberia:    { label: 'Salón de belleza / peluquería / barbería',        sections: ['servicios', 'producto_b'] },
  restaurante: { label: 'Restaurante / cafetería',    sections: ['platillos', 'bebidas_r', 'postres'] },
  merceria:    { label: 'Mercería',                   sections: ['botones', 'listones', 'telas'] },
  refaccionaria: { label: 'Refaccionaria',            sections: ['refacciones', 'aceites', 'llantas'] },
  perfumeria:  { label: 'Perfumería / fragancias',      sections: ['perf_concentrado', 'perf_alcohol', 'perf_frascos', 'perf_kits', 'perf_accesorios'] },
  general:     { label: 'Productos generales',        sections: ['general', 'electronica'] },
};




/* ================= Catálogos de ejemplo por giro ================= */
const DEMOS = {
  shoe: shoeDemoRows,
  boutique: boutiqueDemoRows,
  abarrotes: [
    ['Refresco 600 ml', 'bebidas', 18, 12],
    ['Arroz 1 kg', 'abarrotes', 26, 19],
    ['Detergente 1 kg', 'limpieza', 38, 28],
    ['Frijol a granel (kg)', 'granel', 32, 24],
  ],
  farmacia: [
    ['Paracetamol 500 mg c/10', 'medicamento', 35, 22],
    ['Alcohol 250 ml', 'medicamento', 28, 17],
    ['Shampoo 400 ml', 'cuidado', 89, 58],
    ['Pañales etapa 2', 'bebe', 145, 105],
  ],
  papeleria: [
    ['Cuaderno profesional 100 h', 'cuadernos', 42, 28],
    ['Bolígrafo negro', 'escritura', 8, 4],
    ['Papel bond carta 500 h', 'papel', 95, 70],
    ['Block de dibujo', 'arte', 38, 24],
  ],
  ferreteria: [
    ['Martillo 16 oz', 'herramienta', 165, 110],
    ['Pija 1" (100 pzas)', 'tornilleria', 45, 28],
    ['Pintura blanca 4 L', 'pintura', 420, 310],
    ['Foco LED 9 W', 'electrico', 45, 28],
  ],
  joyeria: [
    ['Anillo plata .925', 'anillos', 850, 420],
    ['Cadena 45 cm', 'cadenas', 1200, 650],
    ['Pulsera de acero', 'pulseras', 480, 240],
    ['Aretes zirconia', 'aretes', 390, 180],
  ],
  optica: [
    ['Armazón metálico', 'armazones', 890, 480],
    ['Lentes de sol polarizados', 'lentes', 1250, 700],
    ['Estuche rígido', 'acc_optical', 120, 60],
  ],
  carniceria: [
    ['Bistec de res (kg)', 'carne', 210, 165],
    ['Milanesa de pollo (kg)', 'carne', 165, 120],
    ['Jamón de pavo (kg)', 'embutidos', 190, 150],
  ],
  fruteria: [
    ['Manzana (kg)', 'fruta', 42, 32],
    ['Plátano (kg)', 'fruta', 22, 16],
    ['Jitomate (kg)', 'verdura', 28, 20],
  ],
  panaderia: [
    ['Concha', 'pan', 12, 6, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=640'],
    ['Bolillo', 'pan', 5, 2, 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=640'],
    ['Pastel de chocolate 1 kg', 'pastel', 320, 190, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=640'],
    ['Pan dulce surtido', 'pan', 15, 7, 'https://images.unsplash.com/photo-1608198093002-ad4e005484df?w=640'],
    ['Pan integral', 'pan', 48, 26, 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=640'],
  ],
  dulceria: [
    ['Paleta de caramelo', 'dulces', 10, 5, 'https://images.unsplash.com/photo-1499195333224-3ce974eecb47?w=640'],
    ['Papas fritas', 'botanas', 18, 12, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=640'],
    ['Juguete sorpresa', 'juguetes_d', 45, 25, 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=640'],
    ['Chocolates', 'dulces', 35, 20, 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=640'],
    ['Gomitas', 'dulces', 25, 14, 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=640'],
  ],
  cosmeticos: [
    ['Labial mate', 'maquillaje', 145, 70],
    ['Perfume 50 ml', 'perfume', 490, 260],
    ['Crema facial 50 ml', 'skincare', 210, 110],
  ],
  electronica: [
    ['Celular 128 GB', 'celulares', 4200, 3500],
    ['Funda protectora', 'accesorios_e', 120, 60],
    ['Audífonos Bluetooth', 'audio', 390, 220],
  ],
  mascotas: [
    ['Alimento perro 4 kg', 'alimento_m', 380, 290],
    ['Collar ajustable', 'accesorios_m', 95, 45],
    ['Shampoo antipulgas', 'higiene_m', 145, 90],
  ],
  muebleria: [
    ['Sala 3 piezas', 'muebles', 8900, 6200],
    ['Colchón matrimonial', 'colchones', 6500, 4500],
    ['Lámpara de mesa', 'deco', 480, 260],
  ],
  floreria: [
    ['Ramo de rosas 12', 'arreglos', 450, 260],
    ['Girasoles (manojo)', 'flores', 180, 110],
    ['Maceta cerámica', 'macetas', 140, 70],
  ],
  barberia: [
    ['Corte de cabello', 'servicios', 120, 0],
    ['Afeitado con navaja', 'servicios', 90, 0],
    ['Cera para cabello', 'producto_b', 160, 90],
  ],
  restaurante: [
    ['Hamburguesa clásica', 'platillos', 110, 55, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=640'],
    ['Torta de pierna', 'platillos', 85, 40, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=640'],
    ['Pizza artesanal', 'platillos', 160, 75, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=640'],
    ['Café americano', 'bebidas_r', 35, 12, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=640'],
    ['Rebanada de pastel', 'postres', 55, 25, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=640'],
  ],
  merceria: [
    ['Botón 4 huecos (10 pzas)', 'botones', 15, 8],
    ['Listón 1 m', 'listones', 6, 3],
    ['Tela algodón (m)', 'telas', 85, 55],
  ],
  refaccionaria: [
    ['Filtro de aceite', 'refacciones', 180, 110],
    ['Aceite 5W-30 1 L', 'aceites', 220, 160],
    ['Llanta 185/65 R15', 'llantas', 1850, 1350],
  ],
  perfumeria: [
    ['Esencia Acqua 1 L', 'perf_concentrado', 2500, 1200],
    ['Alcohol 96° 5 L', 'perf_alcohol', 900, 650],
    ['Frasco 50 ml', 'perf_frascos', 25, 12],
    ['Perfume 50 ml 20%', 'perf_kits', 450, 250],
  ],
  general: [
    ['Producto general A', 'general', 100, 55],
    ['Producto general B', 'general', 150, 80],
    ['Accesorio', 'electronica', 250, 130],
  ],
};

/* Catálogos visuales: cinco ejemplos por giro, sin alterar productos reales. */
const EXTRA_DEMOS = {
  abarrotes: [['Leche entera 1 L','bebidas',29,22]],
  farmacia: [['Protector solar FPS 50','cuidado',210,125]],
  papeleria: [['Colores caja 12 piezas','arte',65,38]],
  ferreteria: [['Cinta métrica 5 m','herramienta',95,52]],
  joyeria: [['Dije corazón','cadenas',320,160]],
  optica: [['Lentes para lectura','lentes',350,160],['Paño limpiador','acc_optical',35,12]],
  carniceria: [['Chuleta de cerdo (kg)','carne',155,110],['Salchicha (kg)','embutidos',110,75]],
  fruteria: [['Naranja (kg)','fruta',30,19],['Zanahoria (kg)','verdura',24,15]],
  cosmeticos: [['Máscara de pestañas','maquillaje',170,85],['Crema corporal','skincare',135,70]],
  electronica: [['Cargador USB-C','accesorios_e',220,110],['Bocina portátil','audio',590,330]],
  mascotas: [['Juguete mordedera','accesorios_m',120,55],['Arena para gato 5 kg','alimento_m',165,110]],
  muebleria: [['Comedor 4 sillas','muebles',7900,5200],['Espejo decorativo','deco',750,380]],
  floreria: [['Arreglo floral mixto','arreglos',390,210],['Ramo de tulipanes','flores',560,350]],
  barberia: [['Lavado de cabello','servicios',80,0],['Aceite para barba','producto_b',190,90]],
  merceria: [['Hilo de coser','listones',18,8],['Cierre 20 cm','botones',22,10]],
  refaccionaria: [['Bujía estándar','refacciones',95,52],['Anticongelante 1 L','aceites',120,70]],
  perfumeria: [['Atomizador de viaje','perf_frascos',45,20]],
  general: [['Termo acero 500 ml','general',190,90],['Libreta multiusos','general',60,25]],
};
// Fotografías ilustrativas para los giros que aún no tenían imágenes.
// Solo se aplican a productos DEMO; nunca a inventarios reales.
const DEMO_PHOTOS = {
  abarrotes:['photo-1542838132-92c53300491e','photo-1506619216599-9d16d0903dfd','photo-1604908176997-4319ba0e7c91','photo-1540189549336-e6e99c3679fe','photo-1550583724-b2692b85b150'],
  farmacia:['photo-1571781926291-c477ebfd024b','photo-1608248543803-ba4f8c70ae0b','photo-1556228578-0d85b1a4d571','photo-1556229010-6c3f2c9ca5f8','photo-1607619056574-7b8d3ee536b2'],
  papeleria:['photo-1455390582262-044cdead277a','photo-1513542789411-b6a5d4f31634','photo-1497366754035-f200968a6e72','photo-1456513080510-7bf3a84b82f8','photo-1531346878377-a5be20888e57'],
  ferreteria:['photo-1504148455328-c376907d081c','photo-1581147036324-c1c89c2c8b5c','photo-1530124566582-a618bc2615dc','photo-1586864387967-d02ef85d93e8','photo-1504307651254-35680f356dfd'],
  joyeria:['photo-1617038260897-41a1f14a8ca0','photo-1515562141207-7a88fb7ce338','photo-1535632066927-ab7c9ab60908','photo-1611652022419-a9419f74343d','photo-1605100804763-247f67b3557e'],
  optica:['photo-1511499767150-a48a237f0083','photo-1572635196237-14b3f281503f','photo-1508296695146-257a814070b4','photo-1473496169904-658ba7c44d8a','photo-1574258495973-f010dfbb5371'],
  carniceria:['photo-1607623814075-e51df1bdc82f','photo-1588168333986-5078d3ae3976','photo-1529694157872-4e0c0f3b238b','photo-1602470520998-f4a52199a3d6','photo-1547592180-85f173990554'],
  fruteria:['photo-1619566636858-adf3ef46400b','photo-1571771894821-ce9b6c11b08e','photo-1598182198871-d3f4ab4fd181','photo-1547514701-42782101795e','photo-1447175008436-054170c2e979'],
  cosmeticos:['photo-1596462502278-27bfdc403348','photo-1541643600914-78b084683601','photo-1556228578-0d85b1a4d571','photo-1631214540553-ff044a3ffb32','photo-1608248543803-ba4f8c70ae0b'],
  electronica:['photo-1511707171634-5f897ff02aa9','photo-1603891128711-11b4b03bb138','photo-1505740420928-5e560c06d30e','photo-1583394838336-acd977736f90','photo-1608043152269-423dbba4e7e1'],
  mascotas:['photo-1589924691995-400dc9ecc119','photo-1601758228041-f3b2795255f1','photo-1583337130417-3346a1be7dee','photo-1517849845537-4d257902454a','photo-1548199973-03cce0bbc87b'],
  muebleria:['photo-1555041469-a586c61ea9bc','photo-1505693416388-ac5ce068fe85','photo-1507473885765-e6ed057f782c','photo-1616486338812-3dadae4b4ace','photo-1600210492486-724fe5c67fb0'],
  floreria:['photo-1490750967868-88aa4486c946','photo-1597848212624-e6ec2b2c0c9a','photo-1561181286-d3fee7d55364','photo-1487530811176-3780de880c2d','photo-1525310072745-f49212b5ac6d'],
  barberia:['photo-1503951914875-452162b0f3f1','photo-1599351431202-1e0f0137899a','photo-1621605815971-fbc98d665033','photo-1593702295094-ada5d6b4ed46','photo-1503951914875-452162b0f3f1'],
  merceria:['photo-1590736969955-71cc94901144','photo-1494438639946-1ebd1d20bf85','photo-1512436991641-6745cdb1723f','photo-1558618666-fcd25c85cd64','photo-1490481651871-ab68de25d43d'],
  refaccionaria:['photo-1486262715619-67b85e0b08d3','photo-1503376780353-7e6692767b70','photo-1517524206127-48bbd363f3d7','photo-1492144534655-ae79c964c9d7','photo-1549317661-bd32c8ce0db2'],
  perfumeria:['photo-1541643600914-78b084683601','photo-1594035910387-fea47794261f','photo-1615634260167-c8cdede054de','photo-1592945403244-b3fbafd7f539','photo-1590736969955-71cc94901144'],
  general:['photo-1542838132-92c53300491e','photo-1497366754035-f200968a6e72','photo-1512436991641-6745cdb1723f','photo-1555041469-a586c61ea9bc','photo-1505740420928-5e560c06d30e']
};
Object.entries(EXTRA_DEMOS).forEach(([mode, rows]) => DEMOS[mode]?.push(...rows));
Object.entries(DEMOS).forEach(([mode, rows]) => {
  const photos = DEMO_PHOTOS[mode] || DEMO_PHOTOS.general;
  rows.forEach((row, i) => {
    if (!row[4]) row[4] = 'https://images.unsplash.com/' + photos[i % photos.length] + '?w=640&auto=format&fit=crop';
  });
});

/** Imagen de demostración derivada del catálogo, incluso si el producto se guardó sin foto. */
export function demoPhotoForProduct(p) {
  if (!p?.isDemo) return p?.image || '';
  if (p.image) return p.image;
  for (const rows of Object.values(DEMOS)) {
    const match = rows.find(row => row[0] === p.name && row[1] === p.section);
    if (match?.[4]) return match[4];
  }
  return '';
}

/** Productos de ejemplo del giro (sin tocar el estado). */
export function demoForMode(mode) {
  const list = DEMOS[mode] || DEMOS.general;
  const branchId = state.currentBranch || (state.branches[0] || {}).id;
  return list.map((row, i) => {
    const [name, section, price, cost, image] = row;
    const sizes = sizesFor(section);
    const stock = {};
    // las primeras 3 tallas con existencia, el resto en 0
    sizes.forEach((s, idx) => { stock[fmtSize(s)] = idx < 3 ? (3 + idx) : 0; });
    const p = {
      id: uid('demo'),
      name, section, price, cost,
      ...(image ? { image } : {}),
      code: name.replace(/[^\w]/g, '').slice(0, 3).toUpperCase() + (10 + i),
      color: COLORS[i % COLORS.length],
      catalog: true, active: true, isDemo: true, createdAt: new Date().toISOString(),
      branchStock: {},
    };
    state.branches.forEach((b) => {
      p.branchStock[b.id] = b.id === branchId ? { ...stock } : Object.fromEntries(sizes.map((s) => [fmtSize(s), 0]));
    });
    if (section === 'perf_concentrado' || section === 'perf_alcohol') {
      p.porMl = true;
      p.branchStock[branchId] = { 'Único': section === 'perf_concentrado' ? 1000 : 5000 };
    }
    if (section === 'perf_kits') {
      p.branchStock[branchId] = { 'Único': 0 };
      p.recipe = { concId: null, alcoholId: null, bottleId: null, bottleMl: 50, pct: 20, waste: 3 };
      p.prepararAlVender = true;
    }
    if (section === 'perf_frascos') p.branchStock[branchId] = { 'Único': 200 };
    return p;
  });
}

/** Carga los ejemplos del giro. mode: reemplaza el catálogo actual. */

/** Quita SOLO los productos de ejemplo; conserva los que el cliente cargó. */
export function removeDemoProducts() {
  const before = state.products.length;
  state.products = state.products.filter((p) => !p.isDemo);
  emit();
  return before - state.products.length;
}

/** ¿Hay productos de ejemplo cargados? */
export function demoCount() {
  return (state.products || []).filter((p) => p.isDemo).length;
}
/** Completa solo las categorías activas que todavía no tienen ejemplos.
 * No elimina productos ni duplica ejemplos al guardar la configuración. */
export function fillMissingDemoCategories() {
  const modes = enabledCategoryModes();
  let added = 0;
  let photosUpdated = 0;
  // Catálogos DEMO antiguos pueden haberse guardado antes de incluir fotos.
  // Completar imágenes únicamente en los productos de ejemplo existentes.
  for (const p of (state.products || [])) {
    if (!p.isDemo || p.image) continue;
    for (const mode of modes) {
      const row = (DEMOS[mode] || []).find(r => r[0] === p.name && r[1] === p.section);
      if (row?.[4]) { p.image = row[4]; photosUpdated++; break; }
    }
  }
  for (const mode of modes) {
    const expected = DEMOS[mode] || DEMOS.general;
    const sections = new Set(expected.map(row => row[1]));
    const existing = (state.products || []).filter(p => p.isDemo && sections.has(p.section));
    // Una categoría se considera cubierta solo si están sus ejemplos (no solo uno).
    const names = new Set(existing.map(p => p.name));
    const missing = demoForMode(mode).filter(p => !names.has(p.name));
    if (missing.length) {
      state.products.push(...missing);
      added += missing.length;
    }
  }
  if (added || photosUpdated) emit();
  return added + photosUpdated;
}

export function loadDemoForMode(mode, { replace = true } = {}) {
  const allowedExtras = CATEGORY_GROUPS[mode] || [];
  const extras = (Array.isArray(state.settings?.extraCategoryModes) ? state.settings.extraCategoryModes : [])
    .filter((m) => m !== mode && allowedExtras.includes(m));
  const demo = [mode, ...new Set(extras)].flatMap((m) => demoForMode(m));
  // replace = reemplaza SOLO los productos marcados DEMO; los reales se conservan
  const base = replace ? (state.products || []).filter((p) => !p.isDemo) : (state.products || []);
  state.products = [...base, ...demo];
  // en perfumería, enlaza la receta del kit con el concentrado/alcohol/frasco
  if (mode === 'perfumeria') {
    const conc = state.products.find((p) => p.section === 'perf_concentrado' && p.porMl);
    const alc = state.products.find((p) => p.section === 'perf_alcohol' && p.porMl);
    const bot = state.products.find((p) => p.section === 'perf_frascos');
    state.products.filter((p) => p.recipe).forEach((p) => {
      p.recipe.concId = conc?.id || null;
      p.recipe.alcoholId = alc?.id || null;
      p.recipe.bottleId = bot?.id || null;
    });
  }
  emit();
  return demo.length;
}




/* ================= Variantes (P2): talla + color ================= */
export const variantKey = (size, color) => (color ? fmtSize(size) + '|' + color : fmtSize(size));

/** Lista de variantes de un producto (talla × color). */
export function variantsOf(p) {
  const sizes = sizesFor(p?.section);
  const colors = (p?.colors || []).map((c) => String(c).trim()).filter(Boolean);
  const skus = p?.variantSku || {};
  const out = [];
  if (!colors.length) {
    sizes.forEach((s) => {
      const key = fmtSize(s);
      out.push({ key, size: fmtSize(s), color: '', sku: skus[key] || '' });
    });
    return out;
  }
  sizes.forEach((s) => {
    colors.forEach((c) => {
      const key = variantKey(s, c);
      out.push({ key, size: fmtSize(s), color: c, sku: skus[key] || '' });
    });
  });
  return out;
}

/** Variantes con existencia en la sucursal actual. */
export function availableVariants(p, branchId = state.currentBranch) {
  return variantsOf(p).filter((v) => (Number(p?.branchStock?.[branchId]?.[v.key]) || 0) > 0);
}

/**
 * Busca por código escaneado: primero el código del producto, luego el de
 * cada variante (talla / talla+color). Devuelve { product, vkey }.
 */
export function findByBarcode(raw) {
  const q = String(raw || '').trim();
  if (!q) return null;
  const low = q.toLowerCase();
  for (const p of state.products || []) {
    if (p.code && String(p.code).toLowerCase() === low) return { product: p, vkey: null };
  }
  for (const p of state.products || []) {
    const bars = p.variantBarcode || {};
    for (const [vk, code] of Object.entries(bars)) {
      if (code && String(code).toLowerCase() === low) return { product: p, vkey: vk };
    }
    const skus = p.variantSku || {};
    for (const [vk, sku] of Object.entries(skus)) {
      if (sku && String(sku).toLowerCase() === low) return { product: p, vkey: vk };
    }
  }
  for (const p of state.products || []) {
    if (p.name && String(p.name).toLowerCase() === low) return { product: p, vkey: null };
  }
  return null;
}

/* ================= Unidades y cantidades fraccionadas (P1) ================= */
export const UNITS = {
  pza: { label: 'Pieza', short: 'pza', step: 1 },
  kg:  { label: 'Kilogramo', short: 'kg', step: 0.1 },
  g:   { label: 'Gramo', short: 'g', step: 50 },
  L:   { label: 'Litro', short: 'L', step: 0.1 },
  ml:  { label: 'Mililitro', short: 'ml', step: 50 },
  m:   { label: 'Metro', short: 'm', step: 0.1 },
};

export const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
export const unitOf = (p) => (p && p.sellBy && p.sellBy !== 'pza' ? p.sellBy : 'pza');
export const isFractional = (p) => unitOf(p) !== 'pza';
export const unitStep = (p) => (UNITS[unitOf(p)] || UNITS.pza).step;

/** Formatea una cantidad: 2 → "2", 1.5 → "1.5 kg" */
export function fmtQty(q, unit = 'pza') {
  const n = round3(q);
  const txt = Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  return unit && unit !== 'pza' ? txt + ' ' + (UNITS[unit]?.short || unit) : txt;
}
/* ================= Afiliados ================= */
const REF_KEY = 'zoco.ref';

function makeAffCode(name) {
  const base = String(name || 'ZOCO').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6) || 'ZOCO';
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return base + '-' + rnd;
}

/** Código de afiliado del usuario actual (se crea la primera vez). */
export function myAffCode() {
  const u = state.user;
  if (!u) return '';
  if (!u.affCode) {
    let code = makeAffCode(u.name);
    const taken = () => (state.users || []).some((x) => x.affCode === code && x.id !== u.id);
    while (taken()) code = makeAffCode(u.name);
    u.affCode = code;
    emit();
  }
  return u.affCode;
}

export function affiliateLink() {
  const code = myAffCode();
  const base = location.origin + '/';
  return base + '?ref=' + encodeURIComponent(code);
}

/** Guarda el ?ref= de la URL para usarlo cuando la persona se registre. */
export function captureRef() {
  try {
    const p = new URLSearchParams(location.search);
    const ref = p.get('ref');
    if (ref) {
      localStorage.setItem(REF_KEY, ref.trim().toUpperCase());
      // limpia la URL sin recargar
      const clean = location.pathname + (location.hash || '');
      history.replaceState(null, '', clean);
    }
  } catch {}
}

export const pendingRef = () => localStorage.getItem(REF_KEY) || '';

/** Registra que alguien se registró con el link de un afiliado. */
export function registerReferral({ code, email, name, companyId }) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return null;
  if (!Array.isArray(state.referrals)) state.referrals = [];
  if (state.referrals.some((r) => (r.email || '').toLowerCase() === String(email || '').toLowerCase())) return null;
  const owner = (state.users || []).find((u) => u.affCode === c);
  const rec = {
    id: uid('ref'), date: new Date().toISOString(),
    code: c, affiliateId: owner?.id || null, affiliateName: owner?.name || c,
    email: email || '', name: name || '', companyId: companyId || state.currentCompany || null,
    status: 'registrado', commissionPct: 0, earned: 0,
  };
  state.referrals.unshift(rec);
  localStorage.removeItem(REF_KEY);
  emit();
  return rec;
}

export function referralsOf(code) {
  const c = String(code || '').toUpperCase();
  return (state.referrals || []).filter((r) => r.code === c);
}

export function setAffiliateCommission(pct) {
  const u = state.user;
  if (!u) return;
  u.affCommissionPct = Math.max(0, Math.min(100, Number(pct) || 0));
  emit();
}
/* ================= Sucursales ================= */
export function addBranch(name) {
  const lim = canAdd('branch');
  if (!lim.ok) return { ok: false, msg: lim.msg };
  const n = String(name || '').trim();
  if (!n) return { ok: false, msg: 'Escribe el nombre de la sucursal' };
  if ((state.branches || []).some((b) => b.name.toLowerCase() === n.toLowerCase())) {
    return { ok: false, msg: 'Ya existe una sucursal con ese nombre' };
  }
  const id = uid('b');
  state.branches.push({ id, name: n });
  // crea el stock en cero para todos los productos
  (state.products || []).forEach((p) => {
    p.branchStock = p.branchStock || {};
    p.branchStock[id] = {};
    sizesFor(p.section).forEach((s) => { p.branchStock[id][fmtSize(s)] = 0; });
  });
  emit();
  return { ok: true, id, name: n };
}

export function renameBranch(id, name) {
  const n = String(name || '').trim();
  if (!n) return { ok: false, msg: 'Escribe un nombre' };
  const b = (state.branches || []).find((x) => x.id === id);
  if (!b) return { ok: false, msg: 'Sucursal no encontrada' };
  b.name = n;
  emit();
  return { ok: true };
}

export function removeBranch(id) {
  if ((state.branches || []).length <= 1) return { ok: false, msg: 'Debe quedar al menos una sucursal' };
  const b = state.branches.find((x) => x.id === id);
  if (!b) return { ok: false, msg: 'Sucursal no encontrada' };
  const vendido = (state.sales || []).some((s) => s.branchId === id);
  state.branches = state.branches.filter((x) => x.id !== id);
  if (state.currentBranch === id) state.currentBranch = state.branches[0].id;
  (state.products || []).forEach((p) => { if (p.branchStock) delete p.branchStock[id]; });
  emit();
  return { ok: true, hadSales: vendido };
}

export function setCurrentBranch(id) {
  if (!(state.branches || []).some((b) => b.id === id)) return false;
  state.currentBranch = id;
  emit();
  return true;
}
/* ================= Perfumería: recetas y producción ================= */
/** ¿El producto se mide en ml? */
export const isLiquid = (p) => !!(p && p.porMl);

/** Calcula lo que consume preparar `qty` unidades de un producto con receta. */
export function recipeNeeds(p, qty = 1) {
  const r = p?.recipe;
  if (!r) return null;
  const q = Math.max(0, Number(qty) || 0);
  const ml = Math.max(1, Number(r.bottleMl) || 50);
  const pct = Math.max(1, Number(r.pct) || 20);
  const waste = Math.max(0, Number(r.waste) || 0);
  const concMl = ml * (pct / 100) * (1 + waste / 100) * q;
  const alcMl = ml * (1 - pct / 100) * (1 + waste / 100) * q;
  return {
    concId: r.concId || null,
    alcoholId: r.alcoholId || null,
    bottleId: r.bottleId || null,
    bottleSize: r.bottleSize || '',
    concMl: Math.round(concMl * 10) / 10,
    alcMl: Math.round(alcMl * 10) / 10,
    bottles: Number(r.withBottle === false ? 0 : q),
    ml,
    pct,
    qty: q,
  };
}

/** Descuenta ingredientes de una receta (sin tocar el producto terminado). */
function consumeRecipe(p, qty, branchId, refId) {
  const need = recipeNeeds(p, qty);
  if (!need) return null;
  const b = branchId || state.currentBranch;
  const take = (id, amount) => {
    if (!id || !amount) return;
    const ing = productById(id);
    if (!ing) return;
    const stock = ing.branchStock?.[b] || {};
    const key = Object.keys(stock)[0] || 'Único';
    stock[key] = Math.max(0, Number(stock[key] || 0) - amount);
    ing.branchStock[b] = stock;
  };
  take(need.concId, need.concMl);
  take(need.alcoholId, need.alcMl);
  take(need.bottleId, need.bottles);
  if (!Array.isArray(state.consumptions)) state.consumptions = [];
  state.consumptions.unshift({
    id: uid('cons'), date: new Date().toISOString(), branchId: b,
    productId: p.id, name: p.name, qty,
    concId: need.concId, concMl: need.concMl,
    alcoholId: need.alcoholId, alcMl: need.alcMl,
    bottleId: need.bottleId, bottles: need.bottles,
    ref: refId || null, user: state.user?.name || '-',
  });
  return need;
}

/** Prepara un lote: descuenta ingredientes y suma frascos al producto terminado. */
export function produceBatch(productId, qty, branchId) {
  const p = productById(productId);
  if (!p?.recipe) return { ok: false, msg: 'El producto no tiene receta' };
  const q = Math.max(1, Number(qty) || 0);
  const b = branchId || state.currentBranch;
  const need = recipeNeeds(p, q);

  // valida existencias
  const check = (id, amount, label) => {
    if (!id || !amount) return null;
    const ing = productById(id);
    if (!ing) return label + ' no encontrado';
    const stock = ing.branchStock?.[b] || {};
    const key = Object.keys(stock)[0] || 'Único';
    const have = Number(stock[key] || 0);
    if (have < amount) return `${ing.name}: faltan ${(amount - have).toFixed(1)} (hay ${have})`;
    return null;
  };
  const err = check(need.concId, need.concMl, 'Concentrado')
    || check(need.alcoholId, need.alcMl, 'Alcohol')
    || check(need.bottleId, need.bottles, 'Frasco');
  if (err) return { ok: false, msg: err };

  consumeRecipe(p, q, b, 'lote');

  // suma al inventario del producto terminado
  p.branchStock[b] = p.branchStock[b] || {};
  const key = Object.keys(p.branchStock[b])[0] || 'Único';
  p.branchStock[b][key] = Number(p.branchStock[b][key] || 0) + q;

  if (!Array.isArray(state.productions)) state.productions = [];
  state.productions.unshift({
    id: uid('prod'), date: new Date().toISOString(), branchId: b,
    productId, name: p.name, qty: q, need, user: state.user?.name || '-',
  });
  emit();
  return { ok: true, need, qty: q };
}
/* ================= Secciones y tallas editables ================= */
/** Aplica overrides guardados en settings.customSections sobre SECTIONS. */
export function applyCustomSections() {
  const cs = state?.settings?.customSections;
  if (!cs) return;
  const modeNow = state.company?.mode || 'general';
  for (const [id, def] of Object.entries(cs)) {
    const base = SECTIONS[id] || {};
    SECTIONS[id] = {
      ...base, ...def,
      label: def.label || base.label || id,
      // las secciones nuevas pertenecen al giro actual
      mode: base.mode || modeNow,
    };
  }
}

/** Guarda la definición de una sección (crea o actualiza). */
export function saveSectionDef(id, def) {
  state.settings = state.settings || {};
  if (!state.settings.customSections) state.settings.customSections = {};
  state.settings.customSections[id] = { ...(state.settings.customSections[id] || {}), ...def };
  applyCustomSections();
  emit();
}

/** Quita los cambios de una sección (vuelve al valor de fábrica). */
export function resetSectionDef(id) {
  if (state.settings?.customSections) delete state.settings.customSections[id];
  emit();
  location.reload();
}

export function sectionsForModeNow() {
  const modeNow = state.company?.mode || 'general';
  return Object.entries(SECTIONS).filter(([, s]) => enabledCategoryModes().includes(s.mode || 'general'));
}
export function sizesFor(sectionId) {
  const s = SECTIONS[sectionId];
  if (!s) return ['Único'];
  if (s.scale === 'none') return ['Único'];
  if (s.scale === 'alpha') return s.values;
  if (s.scale === 'ring') {
    const out = [];
    for (let v = s.from; v <= s.to + 0.0001; v += (s.step || 0.5)) out.push(Number(v.toFixed(1)));
    return out.map((v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)));
  }
  const out = [];
  for (let v = s.from; v <= s.to + 0.0001; v += s.step) out.push(Number(v.toFixed(1)));
  return out;
}

export const fmtSize = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v));

/* ================= Roles y permisos ================= */
export const PERMS = {
  'sales.sell':     'Vender',
  'sales.cancel':   'Cancelar ventas',
  'sales.discount': 'Aplicar descuentos',
  'products.edit':  'Editar productos',
  'stock.manage':   'Gestionar stock',
  'customers.manage': 'Clientes',
  'reports.view':   'Ver reportes',
  'finance.view':   'Ver finanzas',
  'users.manage':   'Administrar usuarios',
  'settings.edit':  'Configuración',
  'ai.use':         'Usar agente IA',
  'food.order':     'Atender mesas y tomar comandas',
  'food.kitchen':   'Gestionar comandas de cocina y barra',
};

export const ROLES = {
  OWNER:   { label: 'Propietario', perms: ['*'] },
  ADMIN:   { label: 'Administrador', perms: ['sales.sell', 'sales.cancel', 'sales.discount', 'products.edit', 'stock.manage', 'customers.manage', 'reports.view', 'finance.view', 'users.manage', 'settings.edit', 'ai.use'] },
  CASHIER: { label: 'Cajero', perms: ['sales.sell', 'sales.discount', 'customers.manage', 'food.order'] },
  WAITER: { label: 'Mesero', perms: ['food.order'] },
  KITCHEN: { label: 'Cocina', perms: ['food.kitchen'] },
  STOCK:   { label: 'Almacén', perms: ['products.edit', 'stock.manage', 'food.kitchen'] },
  ACCOUNT: { label: 'Contador', perms: ['reports.view', 'finance.view'] },
};

const COLORS = ['#2F5BFF', '#1D4FD8', '#6366F1', '#0EA5E9', '#12B76A', '#F79009', '#B4235A', '#7C9A6D'];

/* ================= Seed ================= */
function seed() {
  const branches = [
    { id: 'b1', name: 'Centro' },
    { id: 'b2', name: 'Plaza Las Américas' },
  ];

  const base = [
    ['Nike Air Zoom', 'dama', 1290, 'AIR'],
    ['Botín Dama Piel', 'dama', 980, 'BOT'],
    ['Sandalia Playa', 'dama', 640, 'SAN'],
    ['Tenis Niño Sport', 'infantil', 520, 'TEN'],
    ['Mocasín Piel', 'caballero', 1150, 'MOC'],
    ['Bota Industrial', 'caballero', 1320, 'BOI'],
    ['Escolar Negro', 'escolar', 430, 'ESC'],
    ['Bolsa Piel', 'bolsas', 1750, 'BOL'],
    ['Cartera Mini', 'carteras', 690, 'CAR'],
  ];

  const products = base.map(([name, section, price, tag], i) => {
    const stock = {};
    sizesFor(section).forEach((s, ix) => {
      const n = ((ix * 7 + i * 3) % 5);
      stock[fmtSize(s)] = n === 4 ? 0 : n + 1;
    });
    const branchStock = {};
    branches.forEach((b, bi) => {
      branchStock[b.id] = {};
      Object.entries(stock).forEach(([k, v]) => { branchStock[b.id][k] = Math.max(0, v - (bi === 1 ? 1 : 0)); });
    });
    return {
      id: uid('p'), name, section, price, cost: Math.round(price * 0.55),
      code: tag + '-' + (100 + i), color: COLORS[i % COLORS.length],
      branchStock, active: true, catalog: true,
    };
  });

  return {
    version: 2,
    company: { name: 'ZoCo Demo', legalId: '', theme: 'classic', mode: 'shoe', currency: 'MXN', decimals: 2 },
    companies: [{ id: 'default', name: 'ZoCo Demo' }],
    currentCompany: 'default',
    branches,
    currentBranch: 'b1',
    users: [
      { id: 'u1', name: 'Propietario', email: 'dueno@zoco.app', pass: '1234', role: 'OWNER', active: true, pin: '1234', jobTitle: 'Propietario', payType: 'HOURLY', payRate: 150 },
      { id: 'u2', name: 'Cajero Mostrador', email: 'cajero@zoco.app', pass: '1234', role: 'CASHIER', active: true, pin: '1111', jobTitle: 'Vendedor', payType: 'HOURLY', payRate: 60 },
    ],
    user: { name: 'Propietario', role: 'OWNER' },
    customers: [],
    coupons: [],
    layaways: [],
    expenses: [],
    register: { open: false, opening: 0 },
    cashMovements: [],
    timeRecords: [],
    register: { open: false, opening: 0 },
    cashMovements: [],
    timeRecords: [],
    products,
    sales: [],
    seq: 1,
    settings: { discountMax: 100, aiKey: '', aiProvider: 'gemini' },
  };
}

/* ================= Planes =================
   OJO: estas constantes deben estar ANTES de load()/migrate(), porque
   migrate() las usa al arrancar (si se declaran después, el arranque falla). */
export const PLANS = {
  esencial: {
    code: 'esencial', name: 'ZoCo Esencial', price: 149, affiliate: 50, zoco: 99,
    limits: { branches: 1 },
    hint: '1 sucursal · usuarios ilimitados',
  },
  pro: {
    code: 'pro', name: 'ZoCo Pro', price: 349, affiliate: 150, zoco: 199,
    limits: { branches: 2 },
    hint: 'Hasta 2 sucursales · usuarios ilimitados',
  },
  empresarial: {
    code: 'empresarial', name: 'ZoCo Empresarial', price: 599, affiliate: 250, zoco: 349,
    limits: { branches: 10 },
    hint: 'Hasta 10 sucursales · usuarios ilimitados',
  },
};

export const PLAN_ORDER = ['esencial', 'pro', 'empresarial'];

/** Equivalencia segura de planes anteriores (no se pierde nada). */
export const LEGACY_PLAN_MAP = {
  tiendita: 'esencial',
  negocio: 'pro',
  profesional: 'pro',
  premium: 'empresarial',
  cadenas: 'empresarial',
  esencial: 'esencial',
  pro: 'pro',
  empresarial: 'empresarial',
};

/* ================= Carga / migración ================= */
function migrate(s) {
  if (!Array.isArray(s.branches)) s.branches = [{ id: 'b1', name: 'Centro' }];
  if (!s.currentBranch) s.currentBranch = s.branches[0].id;
  if (!Array.isArray(s.users)) s.users = seed().users;
  if (!Array.isArray(s.companies)) s.companies = [{ id: 'default', name: s.company?.name || 'ZoCo Demo' }];
  if (!s.currentCompany) s.currentCompany = 'default';
  if (!Array.isArray(s.customers)) s.customers = [];
  if (!Array.isArray(s.coupons)) s.coupons = [];
  if (!Array.isArray(s.layaways)) s.layaways = [];
  if (!Array.isArray(s.suppliers)) s.suppliers = [];
  if (!Array.isArray(s.purchases)) s.purchases = [];
  if (!Array.isArray(s.expenses)) s.expenses = [];
  if (!Array.isArray(s.returns)) s.returns = [];
  if (!Array.isArray(s.adjustments)) s.adjustments = [];
  if (!Array.isArray(s.transfers)) s.transfers = [];
  if (!Array.isArray(s.consumptions)) s.consumptions = [];
  if (!Array.isArray(s.productions)) s.productions = [];
  if (!Array.isArray(s.referrals)) s.referrals = [];
  if (!Array.isArray(s.cuts)) s.cuts = [];
  if (!Array.isArray(s.commissions)) s.commissions = [];
  // Plan: normaliza nombres anteriores sin tocar sucursales ni datos
  const rawPlan = String(s.company?.plan || 'pro').toLowerCase();
  s.company.plan = LEGACY_PLAN_MAP[rawPlan] || 'pro';
  if (rawPlan !== s.company.plan) s.company.planMigratedFrom = rawPlan;
  if (!s.register) s.register = { open: false, opening: 0 };
  if (!Array.isArray(s.cashMovements)) s.cashMovements = [];
  if (!Array.isArray(s.timeRecords)) s.timeRecords = [];
  (s.users || []).forEach((u, i) => {
    u.role = String(u.role || 'CASHIER').toUpperCase();
    if (u.pin == null) u.pin = String(1234 + i * 111);
    if (!u.payType) u.payType = 'HOURLY';
    if (u.payRate == null) u.payRate = 60;
    if (!u.jobTitle) u.jobTitle = u.role === 'OWNER' ? 'Propietario' : 'Vendedor';
  });
  if (!s.settings) s.settings = { aiKey: '', aiProvider: 'gemini' };
  if (s.settings.betaFree == null) s.settings.betaFree = true;
  // Datos que salen impresos en el ticket (editables)
  if (!s.settings.ticket) s.settings.ticket = {};
  const tk = s.settings.ticket;
  if (tk.name == null) tk.name = s.company?.name || '';
  if (tk.line1 == null) tk.line1 = '';
  if (tk.phone == null) tk.phone = s.company?.phone || '';
  if (tk.taxId == null) tk.taxId = s.company?.legalId || '';
  if (tk.footer == null) tk.footer = '¡Gracias por su compra!';
  if (tk.footerEnd == null) tk.footerEnd = '';
  if (tk.showBrand == null) tk.showBrand = true;

  // Repara usuarios perdidos o incompletos.
  // OJO: las cuentas creadas con Google no tienen contraseña local, así que
  // NO se descartan: solo se exige correo.
  if (!Array.isArray(s.users)) s.users = [];
  s.users = s.users.filter((u) => u && u.email);
  s.users.forEach((u) => { if (u.pass == null) u.pass = ''; });
  if (!s.users.length) {
    s.users = [{
      id: 'u-owner',
      name: s.company?.name || 'Dueño',
      email: 'dueno@zoco.app',
      pass: '1234',
      role: 'OWNER',
      pin: '1234',
      active: true,
      commission: 0,
      balance: 0,
    }];
  }
  if (s.user) s.user.role = String(s.user.role || '').toUpperCase();
  if (s.user && (!s.user.email || !s.user.pass)) {
    s.user = s.users.find((u) => u.id === s.user.id)
      || s.users.find((u) => u.role === 'owner')
      || s.users[0];
  }

  // stock → stock por sucursal
  (s.products || []).forEach((p) => {
    if (!p.branchStock) {
      const baseStock = p.stock || {};
      p.branchStock = {};
      s.branches.forEach((b) => {
        p.branchStock[b.id] = {};
        Object.entries(baseStock).forEach(([k, v]) => { p.branchStock[b.id][k] = Number(v) || 0; });
      });
      delete p.stock;
    }
    if (p.price != null) p.price = Number(p.price);
  });
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const s = JSON.parse(raw);
    // NUNCA caer a demo teniendo datos guardados: si falta products pero hay
    // otra señal de negocio, se reconstruye el arreglo vacío y se sigue.
    const tieneNegocio = Array.isArray(s.products) || Array.isArray(s.sales)
      || Array.isArray(s.customers) || (s.company && s.company.name)
      || Array.isArray(s.users);
    if (!tieneNegocio) return seed();
    if (!Array.isArray(s.products)) s.products = [];
    // Si la migración falla por datos raros, se usa el estado tal cual:
    // preferimos un estado sin migrar antes que arrancar vacío (pérdida de datos).
    let migrated;
    let migError = '';
    try {
      migrated = migrate(s);
    } catch (e) {
      migError = e.message;
      console.warn('migrate falló, se usa el estado guardado sin migrar:', e);
      migrated = s;
    }
    try {
      window.__storeDebug = {
        error: migError || '(sin error)',
        guardo: (s.adjustments || []).length,
        migro: (migrated.adjustments || []).length,
      };
    } catch {}
    // Red de seguridad: si la migración devolvió una colección vacía pero lo
    // guardado sí tenía registros, se conservan (nunca perder movimientos).
    ['sales', 'returns', 'adjustments', 'transfers', 'purchases', 'expenses',
     'cashMovements', 'cuts', 'suppliers', 'layaways'].forEach((k) => {
      const mig = migrated[k];
      const prev = s[k];
      if (Array.isArray(prev) && prev.length && (!Array.isArray(mig) || mig.length === 0)) {
        migrated[k] = prev;
      }
    });
    // guarda reparaciones (usuarios, etc.) de inmediato
    try { localStorage.setItem(KEY, JSON.stringify(migrated)); } catch {}
    return migrated;
  } catch { return seed(); }
}

export const state = load();
applyCustomSections.call(null);

let listeners = [];
export function subscribe(fn) { listeners.push(fn); return () => (listeners = listeners.filter((f) => f !== fn)); }
export function emit() {
  if (!state.personal || !Array.isArray(state.personal.movements)) state.personal = { movements: [] };
  save(); listeners.forEach((f) => f());
}

let pushTimer = null;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save fail', e); }
  // avisa a la nube (sync.js) que hay cambios para subir
  try { window.dispatchEvent(new CustomEvent('zoco:save')); } catch {}
  if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; pushToServer(); }, 600);
}

let serverOff = false;
async function pushToServer() {
  if (DEMO) return;                 // el demo nunca escribe en el servidor
  if (serverOff) return;            // en Vercel no hay servidor local: se usa Supabase
  try {
    const r = await fetch('/api/state?c=' + encodeURIComponent(state.currentCompany || 'default'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...state, savedAt: new Date().toISOString() }),
    });
    if (r.status === 404 || r.status === 405) serverOff = true;
  } catch { /* offline */ }
}

export async function hydrate() {
  if (DEMO) return 'demo';          // el demo no consulta el servidor
  try {
    const r = await fetch('/api/state?c=' + encodeURIComponent(state.currentCompany || 'default'), { cache: 'no-store' });
    if (r.ok) {
      const db = await r.json();
      if (db && Array.isArray(db.products) && db.products.length) {
        const merged = migrate(db);
        // conserva la API key local si el servidor no tiene una
        try {
          const local = JSON.parse(localStorage.getItem(KEY) || 'null');
          if (local?.settings?.aiKey && !merged.settings?.aiKey) {
            merged.settings = { ...(merged.settings || {}), ...local.settings };
          }
        } catch {}
        Object.assign(state, merged);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
        return 'server';
      }
    }
    pushToServer();
    return 'local';
  } catch { return 'offline'; }
}

export function resetDemo() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(SKEY);
  location.reload();
}

/* ================= Sesión ================= */
export function readSession() {
  try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch { return null; }
}
export function currentUser() {
  const s = readSession();
  if (!s) return null;
  const u = state.users.find((x) => x.id === s.userId);
  if (u) return u;
  // Respaldo: la sesión guarda una copia del usuario (login con Google, etc.)
  // Si el arranque reescribió la lista, igual se puede entrar.
  if (s.user && s.user.id === s.userId) {
    const copy = { ...s.user, active: true };
    if (!state.users.some((x) => x.id === copy.id)) state.users.push(copy);
    return copy;
  }
  return null;
}
/* ================= Catálogo base del giro ================= */
/** Inserta productos del catálogo base; por defecto quita los ejemplos DEMO. */
export function addBaseCatalog(list, { removeDemo = true } = {}) {
  const items = Array.isArray(list) ? list : [];
  if (!items.length) return { nuevos: 0, actualizados: 0 };
  const branchId = state.currentBranch || (state.branches[0] || {}).id;

  // Al cargar el catálogo base de un giro se quitan los ejemplos y los
  // catálogos base anteriores (de otro giro). Los productos propios NO se tocan.
  if (removeDemo) state.products = (state.products || []).filter((p) => !p.isDemo && !p.isBase);

  const porCodigo = new Map();
  (state.products || []).forEach((p) => {
    const k = String(p.code || '').trim().toLowerCase();
    if (k) porCodigo.set(k, p);
  });
  let nuevos = 0;
  let actualizados = 0;

  items.forEach((it, i) => {
    const clave = String(it.code || '').trim().toLowerCase();
    const existe = clave ? porCodigo.get(clave) : null;
    if (existe) {
      if (it.image && !existe.image) existe.image = it.image;
      if (!existe.brand && it.brand) existe.brand = it.brand;
      actualizados += 1;
      return;
    }
    const sizes = sizesFor(it.section);
    const stock = {};
    sizes.forEach((s) => { stock[fmtSize(s)] = 0; });
    const p = {
      id: 'base' + Date.now() + i,
      name: it.name,
      code: it.code || ('BASE-' + (i + 1)),
      brand: it.brand || '',
      price: 0,
      cost: 0,
      section: it.section,
      colors: [],
      image: it.image || '',
      active: true,
      catalog: true,
      isBase: true,
      branchStock: branchId ? { [branchId]: stock } : {},
    };
    state.products.push(p);
    if (clave) porCodigo.set(clave, p);
    nuevos += 1;
  });
  emit();
  return { nuevos, actualizados };
}
/* ================= Respaldo (descargar / restaurar) ================= */
const BACKUP_META = 'zoco.backup.last';

/** Nombre de archivo sugerido: zoco-respaldo-2026-11-19.json */
export function backupFileName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const negocio = String(state.company?.name || 'zoco').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'zoco';
  return `respaldo-${negocio}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

export function markBackupDone() {
  try { localStorage.setItem(BACKUP_META, new Date().toISOString()); } catch {}
}
export function lastBackupAt() {
  try { return localStorage.getItem(BACKUP_META) || ''; } catch { return ''; }
}

/** Restaura un respaldo: valida, guarda copia de seguridad y reemplaza el estado. */
export function importBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, msg: 'El archivo no es un JSON válido' }; }
  const datos = parsed?.datos || parsed?.data || parsed;
  if (!datos || typeof datos !== 'object') return { ok: false, msg: 'El respaldo está vacío' };
  const pareceNegocio = Array.isArray(datos.products) || Array.isArray(datos.sales)
    || Array.isArray(datos.customers) || datos.company;
  if (!pareceNegocio) return { ok: false, msg: 'El archivo no parece un respaldo de ZoCo' };

  // Copia de seguridad de lo actual antes de reemplazar
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem('zoco.pos.antes-de-restaurar', prev);
  } catch {}

  const merged = Array.isArray(datos.products) ? datos : { ...datos, products: datos.products || [] };
  Object.keys(state).forEach((k) => { delete state[k]; });
  Object.assign(state, merged);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  try { window.dispatchEvent(new CustomEvent('zoco:save')); } catch {}
  return { ok: true, empresa: state.company?.name || '', productos: (state.products || []).length };
}

export function login(email, pass) {
  const u = state.users.find((x) => x.email.toLowerCase() === String(email).toLowerCase().trim() && x.pass === String(pass));
  if (!u || !u.active) return { ok: false, msg: 'Correo o contraseña incorrectos' };
  localStorage.setItem(SKEY, JSON.stringify({ userId: u.id, at: Date.now(), user: { id: u.id, name: u.name, email: u.email, role: u.role } }));
  state.user = u;
  return { ok: true, user: u };
}
export function logout() { localStorage.removeItem(SKEY); }

export function can(perm) {
  const u = currentUser();
  if (!u) return false;
  const perms = ROLES[String(u.role || '').toUpperCase()]?.perms || [];
  if (perms.includes('*')) return true;
  return perms.includes(perm);
}

/* ================= Consultas ================= */
export const branch = () => state.branches.find((b) => b.id === state.currentBranch) || state.branches[0];
export const sectionOf = (p) => {
  const raw = String(p?.section || '').trim().toLowerCase();
  if (SECTIONS[raw]) return SECTIONS[raw];
  // tolera plurales y variantes: damas→dama, caballeros→caballero, niños→infantil
  const map = { damas: 'dama', caballeros: 'caballero', ninos: 'infantil', niños: 'infantil', nino: 'infantil', niña: 'infantil', nina: 'infantil', escolar: 'escolar', bolsos: 'bolsas', bolsa: 'bolsas', cartera: 'carteras' };
  const alt = map[raw] || raw.replace(/s$/, '');
  if (SECTIONS[alt]) return SECTIONS[alt];
  return { label: '—' };
};
/* Categorías adicionales del mismo negocio, sin cambiar IDs, tallas ni stock existente. */
export const BUSINESS_FAMILIES = {
  comercios: { label: 'Tiendas y comercios', modes: ['abarrotes','panaderia','dulceria','fruteria','carniceria','papeleria'] },
  moda: { label: 'Moda y accesorios', modes: ['shoe','boutique','joyeria','optica'] },
  belleza: { label: 'Belleza y cuidado personal', modes: ['cosmeticos','perfumeria','barberia'] },
  tecnologia: { label: 'Tecnología y electrónica', modes: ['electronica'] },
  hogar: { label: 'Hogar y decoración', modes: ['muebleria','floreria'] },
  herramientas: { label: 'Ferretería y refacciones', modes: ['ferreteria','refaccionaria','merceria'] },
  salud: { label: 'Salud y mascotas', modes: ['farmacia','mascotas'] },
  alimentos: { label: 'Restaurante y alimentos preparados', modes: ['restaurante'] },
  otros: { label: 'Otros negocios', modes: ['general'] },
};
export const familyForMode = (mode) => Object.keys(BUSINESS_FAMILIES).find(k => BUSINESS_FAMILIES[k].modes.includes(mode)) || 'otros';
export const CATEGORY_GROUPS = Object.fromEntries(
  Object.values(BUSINESS_FAMILIES).flatMap(group => group.modes.map(mode => [mode, group.modes]))
);
export const enabledCategoryModes = () => {
  const primary = state.company?.mode || 'general';
  const allowed = CATEGORY_GROUPS[primary] || [primary];
  const extras = Array.isArray(state.settings?.extraCategoryModes) ? state.settings.extraCategoryModes : [];
  return [primary, ...extras.filter((m) => allowed.includes(m) && m !== primary)];
};
export const sectionsForMode = () => Object.entries(SECTIONS).filter(([, s]) => enabledCategoryModes().includes(s.mode));
export const productById = (id) => state.products.find((p) => p.id === id);

export function stockOf(p, size, branchId = state.currentBranch) {
  return Number(p?.branchStock?.[branchId]?.[fmtSize(size)] || 0);
}
export function totalStock(p, branchId = state.currentBranch) {
  const b = p?.branchStock?.[branchId] || {};
  return Object.values(b).reduce((a, x) => a + Number(x || 0), 0);
}
export function stockAnywhere(p, size) {
  return state.branches
    .map((b) => ({ branch: b.name, qty: stockOf(p, size, b.id) }))
    .filter((x) => x.qty > 0);
}

/* ================= Devoluciones parciales ================= */
/** lines: [{ productId, size, qty, price, name }] */
export function returnSale(saleId, lines, reason, refundMethod) {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale || sale.status === 'cancelled') return { ok: false, msg: 'Venta no válida' };
  if (!Array.isArray(lines) || !lines.length) return { ok: false, msg: 'No hay artículos a devolver' };
  if (!Array.isArray(state.returns)) state.returns = [];

  let total = 0;
  const out = [];
  for (const l of lines) {
    const qty = Number(l.qty) || 0;
    if (qty <= 0) continue;
    const item = (sale.items || []).find((i) => i.productId === l.productId && String(i.size) === String(l.size));
    if (!item) continue;
    const already = (sale.returns || []).flatMap((r) => r.items)
      .filter((i) => i.productId === l.productId && String(i.size) === String(l.size))
      .reduce((a, i) => a + Number(i.qty || 0), 0);
    const maxQty = Number(item.qty) - already;
    const q = Math.min(qty, maxQty);
    if (q <= 0) continue;

    const p = productById(l.productId);
    const b = p?.branchStock?.[sale.branchId];
    const rk = item.vkey || fmtSize(item.size);
    if (b) b[rk] = round3(Number(b[rk] || 0) + q);

    const price = Number(item.price) || 0;
    total += price * q;
    out.push({ productId: l.productId, name: item.name, size: item.size, qty: q, price, subtotal: price * q });
  }
  if (!out.length) return { ok: false, msg: 'Esas piezas ya fueron devueltas' };

  const ret = {
    id: uid('ret'),
    date: new Date().toISOString(),
    saleId: sale.id,
    saleCode: sale.code,
    branchId: sale.branchId,
    customer: sale.customer,
    items: out,
    total: Math.round(total * 100) / 100,
    method: refundMethod || sale.method,
    reason: reason || 'Sin motivo',
    user: state.user?.name || '-',
  };
  state.returns.unshift(ret);
  if (!Array.isArray(sale.returns)) sale.returns = [];
  sale.returns.push({ id: ret.id, date: ret.date, total: ret.total, items: out });
  sale.refunded = Math.round(((sale.refunded || 0) + ret.total) * 100) / 100;
  if (sale.refunded >= (sale.total || 0) - 0.01) sale.status = 'returned';
  emit();
  return { ok: true, ret };
}

/* ================= Mermas / ajustes ================= */
/** type: 'merma' | 'ajuste_positivo' | 'ajuste_negativo' */
export function registerAdjustment({ productId, size, qty, type, reason, note, branchId }) {
  const p = productById(productId);
  if (!p) return { ok: false, msg: 'Producto no encontrado' };
  const b = branchId || state.currentBranch;
  const sz = fmtSize(size);
  const q = Math.abs(Number(qty) || 0);
  if (!q) return { ok: false, msg: 'Cantidad inválida' };
  const actual = Number(p.branchStock?.[b]?.[sz] || 0);
  const delta = type === 'ajuste_positivo' ? q : -q;
  if (actual + delta < 0) return { ok: false, msg: 'No hay suficiente stock (' + actual + ')' };
  p.branchStock[b][sz] = actual + delta;

  if (!Array.isArray(state.adjustments)) state.adjustments = [];
  const rec = {
    id: uid('adj'), date: new Date().toISOString(), type, branchId: b,
    productId, name: p.name, size: sz, qty: delta, before: actual, after: actual + delta,
    cost: Number(p.cost || 0) * Math.abs(delta),
    reason: reason || (type === 'merma' ? 'Merma' : 'Ajuste'),
    note: note || '', user: state.user?.name || '-',
  };
  state.adjustments.unshift(rec);
  emit();
  return { ok: true, rec };
}

/* ================= Traspasos entre sucursales ================= */
export function transferStock(productId, size, fromId, toId, qty, note) {
  const p = productById(productId);
  if (!p) return { ok: false, msg: 'Producto no encontrado' };
  if (!fromId || !toId || fromId === toId) return { ok: false, msg: 'Elige sucursales distintas' };
  const sz = fmtSize(size);
  const from = p.branchStock?.[fromId], to = p.branchStock?.[toId];
  if (!from || !to) return { ok: false, msg: 'Sucursal inválida' };
  const q = Math.abs(Number(qty) || 0);
  if (!q) return { ok: false, msg: 'Cantidad inválida' };
  const have = Number(from[sz] || 0);
  if (have < q) return { ok: false, msg: 'Solo hay ' + have + ' en origen' };

  from[sz] = have - q;
  to[sz] = Number(to[sz] || 0) + q;

  if (!Array.isArray(state.transfers)) state.transfers = [];
  const rec = {
    id: uid('trf'), date: new Date().toISOString(), productId, name: p.name, size: sz, qty: q,
    from: fromId, to: toId, note: note || '', user: state.user?.name || '-',
  };
  state.transfers.unshift(rec);
  emit();
  return { ok: true, rec };
}

/* ================= Carrito ================= */
export function makeCart() { return { lines: [], discount: 0, coupon: null }; }
/** Precio de venta con el descuento del producto aplicado. */
export function salePriceOf(p) {
  const base = Number(p?.price) || 0;
  const d = p?.discount;
  if (!d || !d.on) return base;
  const v = Number(d.value) || 0;
  if (v <= 0) return base;
  const out = d.type === 'amount' ? base - v : base - (base * v) / 100;
  return round2(Math.max(0, out));
}

/** Texto corto del descuento: "-20%" o "-$50". */
export function discountLabel(p) {
  const d = p?.discount;
  if (!d || !d.on || !(Number(d.value) > 0)) return '';
  return d.type === 'amount' ? '-$' + (Number(d.value) || 0) : '-' + (Number(d.value) || 0) + '%';
}
export function cartTotals(cart) {
  const subtotal = cart.lines.reduce((a, l) => a + l.price * l.qty, 0);
  const discount = Math.min(cart.discount || 0, subtotal);
  return { subtotal, discount, total: Math.max(0, subtotal - discount), count: cart.lines.length };
}
export function addLine(cart, product, size, qty = 1, color = '') {
  const vkey = variantKey(size, color);
  const key = product.id + '|' + vkey;
  const found = cart.lines.find((l) => l.key === key);
  // Servicios de belleza no requieren existencias físicas para poder cobrarse.
  const available = product.section === 'servicios' ? Number.POSITIVE_INFINITY : stockOf(product, vkey);
  const unit = unitOf(product);
  const amount = round3(isFractional(product) ? (Number(qty) || 0) : Math.max(1, Math.round(Number(qty) || 1)));
  if (amount <= 0) return { ok: false, msg: 'Cantidad inválida' };
  if (found) {
    if (round3(found.qty + amount) > round3(available) + 1e-9) {
      return { ok: false, msg: 'Sin stock suficiente (quedan ' + fmtQty(available, unit) + ')' };
    }
    found.qty = round3(found.qty + amount);
    return { ok: true };
  }
  if (round3(available) + 1e-9 < amount) {
    return { ok: false, msg: 'Sin stock suficiente (quedan ' + fmtQty(available, unit) + ')' };
  }
  cart.lines.push({ key, productId: product.id, name: product.name, size: fmtSize(size), vkey, price: salePriceOf(product), qty: round3(amount), unit, color: color || product.color, colorVariant: (product.colors || []).length ? color : '' });
  return { ok: true };
}

/* ================= Ventas ================= */
export function nextCode() { const n = state.seq++; return `${branch().id === 'b1' ? 1 : 2}-${1000 + n}`; }

/* ================= Folios: consecutivo único o separado (interno/fiscal) ================= */
export function folioConfig() {
  const f = (state.settings && state.settings.folios) || {};
  return {
    mode: f.mode === 'separado' ? 'separado' : 'unico',
    prefixInterno: String(f.prefixInterno || 'N'),
    prefixFiscal: String(f.prefixFiscal || 'F'),
    nextInterno: Number(f.nextInterno) > 0 ? Number(f.nextInterno) : 1000,
    nextFiscal: Number(f.nextFiscal) > 0 ? Number(f.nextFiscal) : 1000,
  };
}

export function setFolioConfig(patch = {}) {
  state.settings = state.settings || {};
  const next = { ...folioConfig(), ...patch };
  if (next.mode !== 'separado') next.mode = 'unico';
  state.settings.folios = next;
  emit();
  return next;
}

/** Toma el siguiente folio según el tipo de venta. */
export function takeFolio(kind = 'interno') {
  const c = folioConfig();
  if (c.mode !== 'separado') {
    const n = state.seq++;
    return `${branch().id === 'b1' ? 1 : 2}-${1000 + n}`;
  }
  if (kind === 'fiscal') {
    const n = c.nextFiscal;
    state.settings.folios = { ...c, nextFiscal: n + 1 };
    return `${c.prefixFiscal}-${n}`;
  }
  const n = c.nextInterno;
  state.settings.folios = { ...c, nextInterno: n + 1 };
  return `${c.prefixInterno}-${n}`;
}


// ZoCo Food: consume only after a completed POS sale, with an audit snapshot for reversal.
function foodSalePlan(lines) {
  if (state.company?.mode !== 'restaurante' || !state.food?.recipes?.length) return {changes:[],warnings:[]};
  const plan = new Map(), finished = new Map();
  for (const line of lines) {
    const recipe = state.food.recipes.find(r => r.productId && r.productId === line.productId);
    if (!recipe || recipe.mode === 'none') continue;
    const count = Number(line.qty);
    if (!Number.isFinite(count) || count <= 0) throw new Error('Cantidad de platillo inválida');
    if (recipe.mode === 'finished') {
      finished.set(recipe.id, (finished.get(recipe.id) || 0) + count);
    } else if (recipe.mode === 'recipe') {
      if (!recipe.lines?.length) throw new Error('La receta de '+recipe.name+' no tiene ingredientes');
      for (const item of recipe.lines) {
        const amount = Number(item.qty) * count;
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('Cantidad de ingrediente inválida');
        plan.set(item.id, (plan.get(item.id) || 0) + amount);
      }
    }
  }
  const changes = [], warnings = [];
  for (const [id, qty] of plan) {
    const ingredient = state.food.ingredients.find(i => i.id === id);
    if (!ingredient || Number(ingredient.stock) + 1e-9 < qty) warnings.push({name:ingredient?.name || 'Ingrediente sin registrar',required:qty,available:Math.max(0,Number(ingredient?.stock)||0)});
    if (ingredient) changes.push({type:'ingredient',id,qty:Math.min(qty,Math.max(0,Number(ingredient.stock)||0))});
  }
  for (const [id, qty] of finished) {
    const recipe = state.food.recipes.find(r => r.id === id);
    if (!recipe || Number(recipe.stock) + 1e-9 < qty) warnings.push({name:recipe?.name || 'Platillo sin registrar',required:qty,available:Math.max(0,Number(recipe?.stock)||0)});
    if (recipe) changes.push({type:'finished',id,qty:Math.min(qty,Math.max(0,Number(recipe.stock)||0))});
  }
  return {changes,warnings};
}
function applyFoodSale(changes, direction) {
  for (const change of changes || []) {
    const item = change.type === 'ingredient' ? state.food?.ingredients?.find(i=>i.id===change.id) : state.food?.recipes?.find(r=>r.id===change.id);
    if (item) item.stock = Math.round((Number(item.stock) + direction * change.qty) * 1000) / 1000;
  }
}

export function commitSale({ cart, method, received, customerName, note, customerId, payments, fiscalMode, allowFoodShortage = false }) {
  const foodPlan = foodSalePlan(cart.lines);
  if (foodPlan.warnings?.length && !allowFoodShortage) {
    const err = new Error('Inventario insuficiente');
    err.foodWarnings = foodPlan.warnings;
    throw err;
  }
  const foodChanges = foodPlan.changes || [];
  const t = cartTotals(cart);
  const hasSplit = Array.isArray(payments) && payments.length;
  const totalReceived = hasSplit ? payments.reduce((a, p) => a + p.amount, 0) : (received ?? t.total);
  const esFiscal = (hasSplit
    ? payments.some((p) => p.method === 'debit' || p.method === 'credit')
    : (method === 'debit' || method === 'credit'));
  const sale = {
    id: uid('s'), code: takeFolio(esFiscal ? 'fiscal' : 'interno'), date: new Date().toISOString(),
    branchId: state.currentBranch, branchName: branch().name,
    user: state.user.name, customer: customerName || '-', customerId: customerId || null,
    note: note || '',
    items: cart.lines.map((l) => ({ ...l })),
    subtotal: t.subtotal, discount: t.discount, total: t.total,
    method: hasSplit ? 'split' : method,
    payments: hasSplit ? payments : null,
    // Fiscal = cobrado con tarjeta · Interno = cobrado en efectivo
    fiscalMode: (hasSplit
      ? payments.some((p) => p.method === 'debit' || p.method === 'credit')
      : (method === 'debit' || method === 'credit')) ? 'fiscal' : 'interno',
    received: totalReceived, change: Math.max(0, totalReceived - t.total),
    status: 'done', cancelReason: null, cancelledAt: null,
  };
  sale.foodStockChanges = foodChanges;
  sale.foodStockWarnings = foodPlan.warnings || [];
  sale.userId = state.user.id;
  sale.commission = commissionOf(sale);
  sale.items.forEach((l) => {
    const p = productById(l.productId);
    const preparaAlVender = !!(p?.recipe && p.prepararAlVender);
    const b = p?.branchStock?.[state.currentBranch];
    // Si se prepara al momento, no se descuenta el producto terminado: se descuentan ingredientes
    const vk = l.vkey || l.size;
    if (!preparaAlVender && p?.section !== 'servicios' && b && b[vk] != null) b[vk] = Math.max(0, round3(Number(b[vk]) - l.qty));
    if (preparaAlVender) {
      try { consumeRecipe(p, l.qty, state.currentBranch, sale.id); } catch {}
    }
  });
  if (customerId && (method === 'credit_sale' || (payments || []).some((p) => p.method === 'credit_sale'))) {
    const c = state.customers.find((x) => x.id === customerId);
    if (c) c.balance = (c.balance || 0) + t.total;
  }
  applyFoodSale(foodChanges, -1);
  state.sales.unshift(sale);
  // movimiento de caja por la parte en efectivo
  const cashPart = hasSplit ? payments.filter((p) => p.method === 'cash').reduce((a, p) => a + p.amount, 0) : (method === 'cash' ? t.total : 0);
  if (cashPart > 0) addCash('in', cashPart, 'Venta ' + sale.code);
  emit();
  return sale;
}

export function cancelSale(saleId, reason) {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale || sale.status === 'cancelled') return;
  sale.items.forEach((l) => {
    const p = productById(l.productId);
    const b = p?.branchStock?.[sale.branchId];
    const vk3 = l.vkey || l.size;
    if (b && b[vk3] != null) b[vk3] = round3(Number(b[vk3]) + l.qty);
  });
  if (sale.customerId && sale.method === 'credit_sale') {
    const c = state.customers.find((x) => x.id === sale.customerId);
    if (c) c.balance = Math.max(0, (c.balance || 0) - sale.total);
  }
  if (sale.foodStockChanges?.length) applyFoodSale(sale.foodStockChanges, 1);
  sale.status = 'cancelled';
  sale.cancelReason = reason || 'Sin motivo';
  sale.cancelledAt = new Date().toISOString();
  emit();
}

/* ================= Productos ================= */
export function upsertProduct(data) {
  if (data.id) {
    const p = productById(data.id);
    Object.assign(p, data);
  } else {
    const p = {
      id: uid('p'), active: true, catalog: true, color: COLORS[state.products.length % COLORS.length],
      branchStock: {}, ...data,
    };
    state.products.push(p);
  }
  emit();
}
export function deleteProduct(id) {
  state.products = state.products.filter((p) => p.id !== id);
  emit();
}

/* ================= Clientes ================= */
export function upsertCustomer(data) {
  if (data.id) {
    const c = state.customers.find((x) => x.id === data.id);
    Object.assign(c, data);
  } else {
    state.customers.push({ id: uid('c'), balance: 0, creditLimit: 0, ...data });
  }
  emit();
}
export function customerById(id) { return state.customers.find((c) => c.id === id); }


/* ================= Sucursales ================= */
export function setBranch(id) {
  if (!state.branches.some((b) => b.id === id)) return;
  state.currentBranch = id;
  emit();
}

/* ================= Cupones ================= */
export function applyCoupon(code, subtotal) {
  const c = state.coupons.find((x) => x.code.toLowerCase() === String(code).toLowerCase().trim() && x.active);
  if (!c) return { ok: false, msg: 'Cupón no válido' };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { ok: false, msg: 'Cupón vencido' };
  let value = 0;
  if (c.type === 'PERCENT') value = Math.round(subtotal * c.value / 100);
  else value = Math.min(c.value, subtotal);
  return { ok: true, value, coupon: c };
}
export function upsertCoupon(data) {
  if (data.id) {
    const c = state.coupons.find((x) => x.id === data.id);
    Object.assign(c, data);
  } else {
    state.coupons.push({ id: uid('cp'), active: true, ...data });
  }
  emit();
}

/* ================= Apartados ================= */
export function createLayaway({ cart, customerId, customerName }) {
  const t = cartTotals(cart);
  const lay = {
    id: uid('l'), code: 'AP-' + state.seq++, date: new Date().toISOString(),
    branchId: state.currentBranch, customerId: customerId || null, customerName: customerName || '-',
    items: cart.lines.map((l) => ({ ...l })), total: t.total, paid: 0,
    status: 'active', payments: [],
  };
  // descuenta stock
  lay.items.forEach((l) => {
    const p = productById(l.productId);
    const b = p?.branchStock?.[state.currentBranch];
    const vk2 = l.vkey || l.size;
    if (b && b[vk2] != null) b[vk2] = Math.max(0, round3(Number(b[vk2]) - l.qty));
  });
  state.layaways.unshift(lay);
  emit();
  return lay;
}
export function layawayPayment(id, amount) {
  const l = state.layaways.find((x) => x.id === id);
  if (!l) return;
  l.paid = (l.paid || 0) + amount;
  l.payments.push({ amount, date: new Date().toISOString() });
  addCash('in', amount, 'Abono apartado ' + l.code);
  if (l.paid >= l.total) l.status = 'done';
  emit();
}
export function cancelLayaway(id) {
  const l = state.layaways.find((x) => x.id === id);
  if (!l || l.status !== 'active') return;
  l.items.forEach((it) => {
    const p = productById(it.productId);
    const b = p?.branchStock?.[l.branchId];
    // Misma clave con la que se descontó al crear el apartado (incluye color).
    const k = it.vkey || it.size;
    if (b && b[k] != null) b[k] = round3(Number(b[k]) + Number(it.qty || 0));
  });
  l.status = 'cancelled';
  emit();
}

/* ================= Compras y proveedores ================= */

export function supplierById(id) { return state.suppliers.find((s) => s.id === id); }

export function upsertSupplier(data) {
  if (data.id) {
    const s = supplierById(data.id);
    if (s) Object.assign(s, data);
  } else {
    state.suppliers.push({ id: uid('sp'), name: '', phone: '', rfc: '', notes: '', ...data });
  }
  emit();
}

export function deleteSupplier(id) {
  state.suppliers = state.suppliers.filter((s) => s.id !== id);
  emit();
}

/**
 * Crea una orden de compra. Los artículos quedan "pedidos" hasta recibirlos.
 * items: [{ productId, vkey, qty, cost }]
 */
export function createPurchase({ supplierId, items, note = '', date = null, photo = null, useCredit = false, branchId = null }) {
  const list = (items || []).filter((i) => i && i.productId && Number(i.qty) > 0);
  if (!list.length) return { ok: false, msg: 'Agrega al menos un producto' };
  const total = round3(list.reduce((a, i) => a + round3(Number(i.qty) * Number(i.cost || 0)), 0));
  // Saldo a favor del proveedor que se puede aplicar a esta compra
  let creditApplied = 0;
  if (useCredit && supplierId) {
    const disp = creditOf(supplierId);
    creditApplied = round3(Math.min(disp, total));
    if (creditApplied > 0) {
      state.supplierCredits = state.supplierCredits || {};
      state.supplierCredits[supplierId] = round3(disp - creditApplied);
    }
  }
  const po = {
    id: uid('po'),
    folio: 'OC-' + state.seq++,
    supplierId: supplierId || null,
    date: date || new Date().toISOString(),
    branchId: branchId || state.currentBranch,
    status: 'ordered',           // ordered | partial | received | cancelled
    items: list.map((i) => ({
      productId: i.productId,
      vkey: i.vkey || '',
      qty: round3(Number(i.qty)),
      received: 0,
      cost: Number(i.cost || 0),
    })),
    total: round3(total),
    paid: 0,
    creditApplied: round3(creditApplied),
    payments: [],
    note: String(note || ''),
    photo: photo || null,
  };
  state.purchases.unshift(po);
  emit();
  return { ok: true, purchase: po, creditApplied };
}

/** Saldo a favor disponible de un proveedor. */
export function creditOf(supplierId) {
  const v = Number((state.supplierCredits || {})[supplierId] || 0);
  return v > 0 ? round3(v) : 0;
}

/** Recibe mercancía (total o parcial) y suma al inventario de la sucursal. */
export function receivePurchase(id, receipts = [], { branchId = null } = {}) {
  const po = state.purchases.find((x) => x.id === id);
  if (!po || po.status === 'cancelled' || po.status === 'received') return { ok: false, msg: 'Orden no disponible' };
  const br = branchId || po.branchId || state.currentBranch;
  let moved = 0;
  (receipts || []).forEach((r) => {
    const it = po.items.find((x) => x.productId === r.productId && x.vkey === (r.vkey || ''));
    if (!it) return;
    const pending = round3(it.qty - it.received);
    const qty = Math.min(pending, round3(Math.max(0, Number(r.qty) || 0)));
    if (qty <= 0) return;
    const p = productById(it.productId);
    if (!p) return;
    p.branchStock = p.branchStock || {};
    p.branchStock[br] = p.branchStock[br] || {};
    const k = it.vkey || '';
    if (k) {
      p.branchStock[br][k] = round3(Number(p.branchStock[br][k] || 0) + qty);
    } else {
      // sin variante: reparte al primer tamaño disponible
      const first = sizesFor(p.section)[0];
      const key = fmtSize(first);
      p.branchStock[br][key] = round3(Number(p.branchStock[br][key] || 0) + qty);
    }
    // costo promedio simple
    if (Number(it.cost) > 0) {
      const prev = Number(p.cost || 0);
      p.cost = prev > 0 ? round3((prev + Number(it.cost)) / 2) : Number(it.cost);
    }
    it.received = round3(it.received + qty);
    moved += qty;
  });
  if (!moved) return { ok: false, msg: 'No se recibió ninguna cantidad' };
  const all = po.items.every((i) => round3(i.received) >= round3(i.qty));
  po.status = all ? 'received' : 'partial';
  po.receivedAt = new Date().toISOString();
  emit();
  return { ok: true, moved, status: po.status };
}

/**
 * Registra un pago (total o parcial) a la orden.
 * Se permite pagar de más: el excedente queda como SALDO A FAVOR
 * (dinero que el proveedor te debe o que se aplicará a otra compra).
 */
export function payPurchase(id, amount, note = '') {
  const po = state.purchases.find((x) => x.id === id);
  if (!po) return { ok: false, msg: 'Orden no encontrada' };
  const amt = round3(Math.max(0, Number(amount) || 0));
  if (amt <= 0) return { ok: false, msg: 'Monto inválido' };
  const due = round3(po.total - po.paid - Number(po.creditApplied || 0));
  po.paid = round3(po.paid + amt);
  po.payments.push({ at: new Date().toISOString(), amount: amt, note: String(note || '') });
  addCash('out', amt, 'Pago a proveedor ' + po.folio);
  // Lo que se paga de más queda como saldo a favor del proveedor (aplicable después)
  if (amt > due + 0.004 && po.supplierId) {
    state.supplierCredits = state.supplierCredits || {};
    const extra = round3(amt - due);
    state.supplierCredits[po.supplierId] = round3(Number(state.supplierCredits[po.supplierId] || 0) + extra);
  }
  emit();
  const saldo = round3(po.total - po.paid - Number(po.creditApplied || 0)); // negativo = a favor
  return { ok: true, paid: po.paid, due: saldo, favor: saldo < -0.004 ? round3(Math.abs(saldo)) : 0 };
}

export function cancelPurchase(id) {
  const po = state.purchases.find((x) => x.id === id);
  if (!po || po.status === 'received') return { ok: false, msg: 'Ya recibida: no se puede cancelar' };
  po.status = 'cancelled';
  emit();
  return { ok: true };
}

/** Cuentas por pagar: lo que se debe, agrupado por proveedor (y saldos a favor). */
export function payables() {
  const rows = [];
  const credits = [];
  (state.purchases || []).forEach((po) => {
    if (po.status === 'cancelled') return;
    const saldo = round3(Number(po.total || 0) - Number(po.paid || 0) - Number(po.creditApplied || 0));
    const sp = supplierById(po.supplierId);
    const name = sp?.name || 'Sin proveedor';
    if (saldo > 0.004) rows.push({ po, due: saldo, supplier: name });
    else if (saldo < -0.004) credits.push({ po, favor: round3(Math.abs(saldo)), supplier: name });
  });
  const bySupplier = {};
  rows.forEach((r) => {
    bySupplier[r.supplier] = bySupplier[r.supplier] || { name: r.supplier, due: 0, count: 0 };
    bySupplier[r.supplier].due = round3(bySupplier[r.supplier].due + r.due);
    bySupplier[r.supplier].count += 1;
  });
  const total = round3(rows.reduce((a, r) => a + r.due, 0));
  const totalFavor = round3(credits.reduce((a, c) => a + c.favor, 0));
  return { rows, credits, bySupplier: Object.values(bySupplier).sort((a, b) => b.due - a.due), total, totalFavor };
}

/* ================= Caja ================= */
export function openRegister(amount) {
  state.register = { open: true, opening: Number(amount) || 0, openedAt: new Date().toISOString() };
  addCash('open', amount, 'Apertura de caja');
  emit();
}
export function closeRegister() {
  state.register = { open: false, opening: 0 };
  addCash('close', 0, 'Cierre de caja');
  emit();
}
function addCash(type, amount, note) {
  state.cashMovements.push({
    id: uid('cm'), type, amount: Number(amount) || 0, note,
    user: state.user.name, date: new Date().toISOString(), branchId: state.currentBranch,
  });
}
export function registerSummary() {
  const mv = state.cashMovements.filter((m) => m.branchId === state.currentBranch);
  const inc = mv.filter((m) => m.type === 'in' || m.type === 'open').reduce((a, m) => a + m.amount, 0);
  const out = mv.filter((m) => m.type === 'out').reduce((a, m) => a + m.amount, 0);
  const cashSales = state.sales
    .filter((s) => s.status === 'done' && s.method === 'cash' && s.branchId === state.currentBranch)
    .reduce((a, s) => a + s.total, 0);
  return { opening: state.register.opening, inc, out, cashSales, expected: state.register.opening + cashSales + inc - out };
}



/* ================= Planes y límites (3 planes) ================= */
/**
 * Tres planes comerciales. TODOS incluyen lo mismo: punto de venta, inventario,
 * catálogo, reportes, empleados, agente IA y demás. Usuarios ILIMITADOS en todos.
 * La única diferencia es la cantidad de SUCURSALES.
 * Montos brutos en MXN, antes de comisión del procesador e impuestos.
 */
/** Plan actual de la empresa, migrando nombres anteriores. */
export function currentPlan() {
  const raw = String(state.company?.plan || 'pro').toLowerCase();
  const code = LEGACY_PLAN_MAP[raw] || 'pro';
  return PLANS[code] || PLANS.pro;
}

/** Modo gratuito de prueba: sin cobros y sin límites (activo por defecto). */
export function isBetaFree() {
  return state.settings?.betaFree !== false;
}

export function setBetaFree(on) {
  if (!state.settings) state.settings = {};
  state.settings.betaFree = !!on;
  emit();
  return state.settings.betaFree;
}

export function planLimits() {
  return currentPlan().limits;
}

/** Uso actual. Solo las sucursales tienen límite comercial. */
export function planUsage() {
  const plan = currentPlan();
  const limit = plan.limits.branches;
  const used = (state.branches || []).length;
  const users = (state.users || []).filter((u) => u.active !== false).length;
  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return {
    plan,
    free: isBetaFree(),
    branches: { used, limit, pct },
    users: { used: users, limit: Infinity },
    products: { used: (state.products || []).length, limit: Infinity },
    overLimit: limit !== Infinity && used > limit,
  };
}

/** ¿Se puede agregar uno más de este tipo? Solo las sucursales se limitan. */
export function canAdd(kind) {
  if (kind !== 'branch') return { ok: true };
  if (isBetaFree()) return { ok: true, free: true };
  const u = planUsage();
  if (u.branches.limit === Infinity) return { ok: true };
  if (u.branches.used >= u.branches.limit) {
    return {
      ok: false,
      msg: `Tu plan ${u.plan.name} incluye ${u.branches.limit} sucursal(es). Cambia a un plan con más sucursales para agregar otra.`,
      plan: u.plan,
    };
  }
  return { ok: true };
}

/** Cambia el plan de la empresa (local). No borra sucursales aunque exceda el límite. */
export function setPlan(code) {
  const key = LEGACY_PLAN_MAP[String(code || '').toLowerCase()] || code;
  if (!PLANS[key]) return { ok: false, msg: 'Plan no válido' };
  state.company.plan = key;
  state.company.planSince = new Date().toISOString();
  const over = (state.branches || []).length > PLANS[key].limits.branches;
  state.company.planOverLimit = over;
  emit();
  return { ok: true, plan: PLANS[key], overLimit: over };
}

/** Migración: normaliza el plan guardado y marca excesos sin restringir nada. */
export function migratePlan() {
  const raw = String(state.company?.plan || 'pro').toLowerCase();
  const code = LEGACY_PLAN_MAP[raw] || 'pro';
  if (state.company.plan !== code) {
    state.company.plan = code;
    if (raw !== code) state.company.planMigratedFrom = raw;
  }
  const limit = PLANS[code].limits.branches;
  const used = (state.branches || []).length;
  state.company.planOverLimit = used > limit;
  if (state.company.planOverLimit) {
    state.company.planOverLimitSince = state.company.planOverLimitSince || new Date().toISOString();
    state.company.planOverLimitBranches = used;
  }
  return { plan: PLANS[code], used, limit, overLimit: state.company.planOverLimit };
}

/* ================= Comisiones de afiliados ================= */
/**
 * Libro de comisiones. Cada registro es UNA mensualidad pagada de UN referido.
 * Idempotente por (suscripción + periodo): no se duplica si llega dos veces el mismo pago.
 */
export function commissionsOf(affiliateCode) {
  const c = String(affiliateCode || '').toUpperCase();
  return (state.commissions || []).filter((x) => x.affiliateCode === c);
}

export function commissionSummary(affiliateCode) {
  const list = commissionsOf(affiliateCode);
  const sum = (arr) => Math.round(arr.reduce((a, x) => a + (Number(x.amount) || 0), 0) * 100) / 100;
  const pending = list.filter((x) => x.status === 'pending');
  const approved = list.filter((x) => x.status === 'approved');
  const paid = list.filter((x) => x.status === 'paid');
  const refunded = list.filter((x) => x.status === 'refunded');
  return {
    count: list.length,
    pending: sum(pending), pendingCount: pending.length,
    approved: sum(approved), approvedCount: approved.length,
    paid: sum(paid), paidCount: paid.length,
    refunded: sum(refunded), refundedCount: refunded.length,
  };
}

/**
 * Registra la comisión de una mensualidad pagada.
 * Requiere: affiliateCode, companyId, planCode, period (YYYY-MM), paymentId.
 * Devuelve { ok:false, duplicate:true } si ya existía ese pago/periodo.
 */
export function recordCommission({ affiliateCode, companyId, planCode, period, paymentId, note = '' }) {
  const code = String(affiliateCode || '').toUpperCase();
  const plan = PLANS[LEGACY_PLAN_MAP[String(planCode || '').toLowerCase()] || planCode];
  if (!code || !plan) return { ok: false, msg: 'Datos incompletos' };
  const p = String(period || '').slice(0, 7);
  const pid = String(paymentId || '');
  if (!p || !pid) return { ok: false, msg: 'Falta periodo o identificador de pago' };
  if (!Array.isArray(state.commissions)) state.commissions = [];
  const dup = state.commissions.find((x) => x.paymentId === pid || (x.companyId === companyId && x.period === p && x.status !== 'refunded'));
  if (dup) return { ok: false, duplicate: true, existing: dup };
  const rec = {
    id: uid('com'), date: new Date().toISOString(),
    affiliateCode: code, companyId, planCode: plan.code, planName: plan.name,
    period: p, amount: plan.affiliate, currency: 'MXN',
    status: 'pending', paymentId: pid, note,
  };
  state.commissions.unshift(rec);
  emit();
  return { ok: true, commission: rec };
}

/** Reembolso o contracargo: marca la comisión como devuelta (no la borra). */
export function voidCommission(paymentId, reason = 'Reembolso') {
  const rec = (state.commissions || []).find((x) => x.paymentId === paymentId && x.status !== 'refunded');
  if (!rec) return { ok: false, msg: 'Comisión no encontrada' };
  rec.status = 'refunded';
  rec.refundedAt = new Date().toISOString();
  rec.refundReason = reason;
  emit();
  return { ok: true };
}

export function setCommissionStatus(id, status) {
  if (!['pending', 'approved', 'paid', 'refunded'].includes(status)) return { ok: false, msg: 'Estado no válido' };
  const rec = (state.commissions || []).find((x) => x.id === id);
  if (!rec) return { ok: false, msg: 'No encontrada' };
  rec.status = status;
  if (status === 'paid') rec.paidAt = new Date().toISOString();
  if (status === 'approved') rec.approvedAt = new Date().toISOString();
  emit();
  return { ok: true, commission: rec };
}
/* ================= Corte de caja Z ================= */
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Desglose de caja del periodo (por defecto: todo lo del turno abierto). */
export function cashBreakdown({ branchId = state.currentBranch, from = null, to = null } = {}) {
  const ok = (d) => (!from || new Date(d) >= new Date(from)) && (!to || new Date(d) <= new Date(to));
  const b = branchId;

  const sales = (state.sales || []).filter((s) => s.branchId === b && s.status !== 'cancelled' && ok(s.date));
  const methods = { cash: 0, debit: 0, credit: 0, transfer: 0, credit_sale: 0, other: 0 };
  let totalSales = 0, countSales = 0;

  sales.forEach((s) => {
    totalSales += Number(s.total) || 0;
    countSales++;
    if (Array.isArray(s.payments) && s.payments.length) {
      s.payments.forEach((pm) => { methods[pm.method] = round2((methods[pm.method] || 0) + (Number(pm.amount) || 0)); });
    } else {
      const m = methods[s.method] != null ? s.method : 'other';
      methods[m] = round2(methods[m] + (Number(s.total) || 0));
    }
  });

  const returns = (state.returns || []).filter((r) => r.branchId === b && ok(r.date));
  const refunds = { cash: 0, card: 0, total: 0 };
  returns.forEach((r) => {
    refunds.total = round2(refunds.total + (Number(r.total) || 0));
    if (r.method === 'cash' || r.method === 'credit_note') refunds.cash = round2(refunds.cash + (Number(r.total) || 0));
    else refunds.card = round2(refunds.card + (Number(r.total) || 0));
  });

  const expenses = (state.expenses || []).filter((e) => (e.branchId || b) === b && e.paid && ok(e.paidAt || e.date));
  const expenseCash = round2(expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0));

  const moves = (state.cashMovements || []).filter((m) => m.branchId === b && ok(m.date) && m.type !== 'open' && m.type !== 'close');
  const cashIn = round2(moves.filter((m) => m.type === 'in').reduce((a, m) => a + (Number(m.amount) || 0), 0));
  const cashOut = round2(moves.filter((m) => m.type === 'out').reduce((a, m) => a + (Number(m.amount) || 0), 0));

  const opening = Number(state.register?.opening) || 0;
  const expected = round2(opening + methods.cash - refunds.cash - expenseCash + cashIn - cashOut);

  return {
    branchId: b, from: from || state.register?.openedAt || null, to: to || new Date().toISOString(),
    opening, countSales, totalSales: round2(totalSales), methods,
    returns: refunds, expenseCash, cashIn, cashOut,
    cashSales: methods.cash, cardSales: round2(methods.debit + methods.credit),
    expected,
  };
}

/** Cierra el turno y guarda el corte Z. */
export function closeRegisterZ({ counted = 0, note = '', branchId = state.currentBranch } = {}) {
  if (!state.register?.open) return { ok: false, msg: 'La caja no está abierta' };
  const d = cashBreakdown({ branchId });
  const c = round2(Number(counted) || 0);
  const diff = round2(c - d.expected);
  if (!Array.isArray(state.cuts)) state.cuts = [];
  const folio = 'Z-' + String((state.cuts.length + 1)).padStart(4, '0');
  const cut = {
    id: uid('cut'), folio, date: new Date().toISOString(),
    branchId, branchName: (state.branches.find((x) => x.id === branchId) || {}).name || '',
    user: state.user?.name || '-', note: String(note || '').trim(),
    ...d, counted: c, difference: diff,
  };
  state.cuts.unshift(cut);
  state.register = { open: false, opening: 0, closedAt: cut.date };
  addCash('close', 0, 'Corte ' + folio);
  emit();
  return { ok: true, cut };
}

export function listCuts(limit = 30) {
  return (state.cuts || []).slice(0, limit);
}
/* ================= Gastos ================= */
export function upsertExpense(data) {
  if (data.id) {
    const e = state.expenses.find((x) => x.id === data.id);
    Object.assign(e, data);
  } else {
    state.expenses.unshift({ id: uid('x'), paid: false, date: new Date().toISOString(), ...data });
  }
  emit();
}
export function payExpense(id) {
  const e = state.expenses.find((x) => x.id === id);
  if (e) { e.paid = true; addCash('out', e.amount, 'Gasto: ' + e.name); emit(); }
}
/* ================= Multiempresa ================= */
export function switchCompany(id) {
  state.currentCompany = id;
  const c = state.companies.find((x) => x.id === id);
  if (c) state.company.name = c.name;
  emit();
}
export function createCompany(name) {
  // (el demo del giro se carga desde la vista con loadDemoForMode)
  const id = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || ('negocio-' + Date.now().toString(36));
  if (!state.companies.some((x) => x.id === id)) state.companies.push({ id, name });
  return id;
}
/* ================= Checador ================= */
export const TIME_TYPES = {
  ENTRY: 'Entrada', EXIT: 'Salida', BREAK_START: 'Descanso', BREAK_END: 'Fin descanso',
};

export function timeAction(userId, type) {
  const u = state.users.find((x) => x.id === userId);
  if (!u) return null;
  const rec = {
    id: uid('t'), userId, userName: u.name, type,
    timestamp: new Date().toISOString(), branchId: state.currentBranch,
  };
  state.timeRecords.push(rec);
  emit();
  return rec;
}

export function recordsFor(userId, dateStr = new Date().toISOString()) {
  const day = new Date(dateStr).toDateString();
  return state.timeRecords
    .filter((r) => r.userId === userId && new Date(r.timestamp).toDateString() === day)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function dayStats(userId, dateStr = new Date().toISOString()) {
  const recs = recordsFor(userId, dateStr);
  const first = (t) => recs.find((r) => r.type === t) || null;
  const last = (t) => [...recs].reverse().find((r) => r.type === t) || null;
  const entry = first('ENTRY');
  const exit = last('EXIT');
  let breakMin = 0;
  let open = null;
  recs.forEach((r) => {
    if (r.type === 'BREAK_START') open = new Date(r.timestamp);
    if (r.type === 'BREAK_END' && open) { breakMin += (new Date(r.timestamp) - open) / 60000; open = null; }
  });
  let minutes = 0;
  if (entry) {
    const end = exit ? new Date(exit.timestamp) : new Date();
    minutes = Math.max(0, (end - new Date(entry.timestamp)) / 60000);
  }
  return {
    entry, exit, breakStart: first('BREAK_START'), breakEnd: last('BREAK_END'),
    minutes: Math.max(0, minutes - breakMin), breakMin,
    working: !!entry && !exit,
    onBreak: !!open,
    records: recs,
  };
}

export function weekStats(userId, days = 7) {
  let minutes = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    minutes += dayStats(userId, d.toISOString()).minutes;
  }
  return minutes;
}

export function payFor(user, minutes) {
  if (!user) return 0;
  const rate = Number(user.payRate) || 0;
  if (user.payType === 'DAILY') return minutes > 0 ? rate : 0;
  return (minutes / 60) * rate;
}

export function hhmm(minutes) {
  const m = Math.max(0, Math.round(minutes));
  return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
}
/* ================= Nómina ================= */
export function payroll(fromISO, toISO) {
  const from = new Date(fromISO), to = new Date(toISO);
  return state.users.filter((u) => u.active).map((u) => {
    let minutes = 0; const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const s = dayStats(u.id, d.toISOString());
      if (s.minutes > 0) { days.push({ date: new Date(d).toISOString(), minutes: s.minutes }); minutes += s.minutes; }
    }
    return { user: u, minutes, days: days.length, detail: days, pay: payFor(u, minutes) };
  });
}
/* ================= Finanzas personales ================= */
export const PERSONAL_CATS_OUT = ['Comida', 'Casa', 'Transporte', 'Salud', 'Ropa', 'Escuela', 'Servicios', 'Ocio', 'Otros'];
export const PERSONAL_CATS_IN = ['Sueldo', 'Ventas', 'Préstamo', 'Devolución', 'Otros'];

export function addPersonalMovement({ type, amount, method, category, note }) {
  if (!state.personal || !Array.isArray(state.personal.movements)) state.personal = { movements: [] };
  const mv = {
    id: uid('pm'), type: type === 'in' ? 'in' : 'out',
    amount: Math.abs(Number(amount) || 0),
    method: method === 'card' ? 'card' : 'cash',
    category: category || 'Otros',
    note: note || '',
    date: new Date().toISOString(),
    branchId: state.currentBranch,
  };
  state.personal.movements.push(mv);
  emit();
  return mv;
}

export function personalSummary(fromISO, toISO) {
  const from = new Date(fromISO), to = new Date(toISO);
  if (!state.personal || !Array.isArray(state.personal.movements)) state.personal = { movements: [] };
  const mv = state.personal.movements.filter((m) => {
    const d = new Date(m.date);
    return d >= from && d <= to;
  });
  const inc = mv.filter((m) => m.type === 'in').reduce((a, m) => a + m.amount, 0);
  const out = mv.filter((m) => m.type === 'out').reduce((a, m) => a + m.amount, 0);
  const cash = mv.filter((m) => m.method === 'cash');
  const card = mv.filter((m) => m.method === 'card');
  return {
    ingresos: inc, gastos: out, balance: inc - out,
    efectivo: cash.reduce((a, m) => a + (m.type === 'in' ? m.amount : -m.amount), 0),
    tarjeta: card.reduce((a, m) => a + (m.type === 'in' ? m.amount : -m.amount), 0),
    movimientos: mv.length, detalle: mv.slice().reverse().slice(0, 50),
  };
}

/* Gastos fijos (recurrentes) */
export function setSavingGoal(amount) {
  if (!state.settings) state.settings = {};
  state.settings.savingGoal = Math.max(0, Number(amount) || 0);
  emit();
  return state.settings.savingGoal;
}

export function expenseMonthly(e) {
  return e.freq === 'anual' ? (Number(e.amount) || 0) / 12
    : e.freq === 'semanal' ? (Number(e.amount) || 0) * 4.33
    : (Number(e.amount) || 0);
}
export function fixedMonthlyTotal() {
  return state.expenses.filter((e) => e.recurring).reduce((a, e) => a + expenseMonthly(e), 0);
}
/* ================= Comisiones, metas y documentos ================= */
export function commissionOf(sale) {
  const u = state.users.find((x) => x.id === sale.userId) || state.users.find((x) => x.name === sale.user);
  const pct = Number(u?.commissionPct || 0);
  if (!pct) return 0;
  return Math.round(sale.total * (pct / 100) * 100) / 100;
}

export function sellerStats(userId, fromISO, toISO) {
  const from = new Date(fromISO), to = new Date(toISO);
  const sales = state.sales.filter((s) => s.status === 'done' && s.userId === userId
    && new Date(s.date) >= from && new Date(s.date) <= to);
  const total = sales.reduce((a, s) => a + s.total, 0);
  const commission = sales.reduce((a, s) => a + (s.commission != null ? s.commission : commissionOf(s)), 0);
  return { userId, unidades: sales.reduce((a, s) => a + s.items.reduce((x, i) => x + i.qty, 0), 0), tickets: sales.length, total, comision: commission };
}

export function setGoal({ scope, userId, period, target }) {
  if (!Array.isArray(state.goals)) state.goals = [];
  const key = { scope, userId: scope === 'seller' ? userId : null, period };
  const existing = state.goals.find((g) => g.scope === key.scope && g.userId === key.userId && g.period === key.period);
  if (existing) existing.target = Math.max(0, Number(target) || 0);
  else state.goals.push({ id: uid('goal'), scope, userId: key.userId, period, target: Math.max(0, Number(target) || 0) });
  emit();
}

export function goalFor(scope, userId, period) {
  return (state.goals || []).find((g) => g.scope === scope
    && (scope === 'seller' ? g.userId === userId : true) && g.period === period);
}

export function goalRange(period) {
  const now = new Date();
  if (period === 'day') { const d = new Date(now); d.setHours(0, 0, 0, 0); return [d, now]; }
  if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return [d, now]; }
  if (period === 'year') return [new Date(now.getFullYear(), 0, 1), now];
  return [new Date(now.getFullYear(), now.getMonth(), 1), now];
}

export function goalProgress(goal) {
  const [from, to] = goalRange(goal.period);
  const sales = state.sales.filter((s) => s.status === 'done'
    && (!goal.userId || s.userId === goal.userId)
    && new Date(s.date) >= from && new Date(s.date) <= to);
  const done = sales.reduce((a, s) => a + s.total, 0);
  return { done, target: goal.target || 0, pct: goal.target > 0 ? Math.min(100, Math.round((done / goal.target) * 100)) : 0, tickets: sales.length };
}

export function addUserDoc(userId, doc) {
  const u = state.users.find((x) => x.id === userId);
  if (!u) return;
  if (!Array.isArray(u.docs)) u.docs = [];
  u.docs.push({ id: uid('doc'), date: new Date().toISOString(), ...doc });
  emit();
}

export function removeUserDoc(userId, docId) {
  const u = state.users.find((x) => x.id === userId);
  if (!u) return;
  u.docs = (u.docs || []).filter((d) => d.id !== docId);
  emit();
}

export function setUserCredential(userId, cred) {
  const u = state.users.find((x) => x.id === userId);
  if (!u) return;
  u.webauthn = cred;
  emit();
}
/* ================= Lotes de importación (deshacer) ================= */
export function recordImport({ id, fileName, ids, source }) {
  if (!Array.isArray(state.imports)) state.imports = [];
  const batch = {
    id: id || ('imp' + Date.now()),
    date: new Date().toISOString(),
    fileName: fileName || 'archivo',
    source: source || 'excel',
    ids: ids.slice(),
    count: ids.length,
  };
  state.imports.unshift(batch);
  if (state.imports.length > 20) state.imports = state.imports.slice(0, 20);
  emit();
  return batch;
}

export function undoImport(batchId) {
  const b = (state.imports || []).find((x) => x.id === batchId);
  if (!b) return 0;
  const before = state.products.length;
  state.products = state.products.filter((p) => p.importBatch !== batchId);
  state.imports = state.imports.filter((x) => x.id !== batchId);
  emit();
  return before - state.products.length;
}

/** Respaldo: si no hay lote registrado, borra los productos creados en los últimos N minutos. */
export function undoRecentProducts(minutes = 30) {
  const limit = Date.now() - minutes * 60000;
  const ids = state.products
    .filter((p) => p.createdAt && new Date(p.createdAt).getTime() >= limit)
    .map((p) => p.id);
  if (!ids.length) return 0;
  const set = new Set(ids);
  state.products = state.products.filter((p) => !set.has(p.id));
  emit();
  return ids.length;
}
/* ================= Empezar de cero (quitar el demo) ================= */
export function resetToBlank() {
  // NUNCA toca usuarios, empresa, sucursales ni configuración.
  const owner = state.users.find((u) => String(u.role).toUpperCase() === 'OWNER') || state.users[0] || null;

  state.products = [];
  state.sales = [];
  state.customers = [];
  state.layaways = [];
  state.coupons = [];
  state.expenses = [];
  state.cashMovements = [];
  state.timeRecords = [];
  state.goals = [];
  state.imports = [];
  state.personal = { movements: [] };
  state.register = { open: false, opening: 0 };
  state.cart = [];

  // Los usuarios se conservan tal cual (solo se normaliza el rol y se limpian saldos)
  state.users = (state.users || []).map((u) => ({
    ...u,
    role: String(u.role || 'CASHIER').toUpperCase(),
    balance: 0,
    active: u.active !== false,
  }));
  if (!state.users.length && owner) state.users = [owner];
  state.user = state.users.find((u) => u.email === (state.user?.email || '')) || state.users[0] || null;


  state.cart = makeCart ? makeCart() : [];
  emit();
  return true;
}

/** Respaldo completo en JSON (para guardar antes de limpiar). */
export function exportBackup() {
  const safe = { ...state, settings: { ...(state.settings || {}) } };
  if (safe.settings) delete safe.settings.aiKey;
  return JSON.stringify({ zoco: 2, exportedAt: new Date().toISOString(), data: safe }, null, 2);
}