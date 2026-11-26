// La mesa abierta sin productos cuenta como libre o reservada.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');

const viejo = `  function estadoMesa(table) {
    const order = orderFor(table.id);
    if (!order) {`;
const nuevo = `  function estadoMesa(table) {
    const order = orderFor(table.id);
    // Una mesa abierta pero sin productos cuenta como libre (o reservada).
    const conConsumo = order && Array.isArray(order.items) && order.items.length > 0;
    if (!conConsumo) {`;
if (!a.includes(viejo)) { console.error('FALLO: estadoMesa'); process.exit(1); }
a = a.replace(viejo, nuevo);
fs.writeFileSync(ruta, a, 'utf8');
console.log('estadoMesa corregido: sin productos = libre/reservada');
