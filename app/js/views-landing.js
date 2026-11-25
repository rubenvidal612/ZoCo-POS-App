// Landing comercial dentro de ZoCo POS (fondo blanco, acento naranja).
// Incluye simulador interactivo de ingresos por afiliación, mes con mes.
import { el, esc, money, toast } from './ui.js';

const PAQUETES = [
  { id: 'esencial', nombre: 'Esencial', precio: 149, comision: 50 },
  { id: 'pro', nombre: 'Pro', precio: 295, comision: 150 },
  { id: 'empresarial', nombre: 'Empresarial', precio: 499, comision: 250 },
];

const GIROS = ['Abarrotes', 'Farmacia', 'Papelería', 'Zapatería', 'Boutique', 'Ferretería',
  'Joyería', 'Óptica', 'Carnicería', 'Frutería', 'Panadería', 'Dulcería', 'Cosméticos', 'Celulares'];

export function landingView(ctx) {
  const root = el(`
  <div class="lp">
    <section class="lp-hero">
      <div class="lp-hero-txt">
        <span class="lp-badge">GRATIS en fase de prueba</span>
        <h1>Tu punto de venta,<br><b>gratis</b> y sin complicaciones.</h1>
        <p class="lp-lead">Vende, controla tu inventario, tus compras y tu caja desde el celular o la computadora.
          Sin instalación, sin contratos y con un agente que te ayuda a entender tu negocio.</p>
        <div class="lp-cta">
          <button class="lp-btn lp-btn-primary" id="lp-demo">Probar el demo</button>
          <button class="lp-btn lp-btn-ghost" id="lp-planes">Ver planes</button>
        </div>
        <div class="lp-mini">Gratis por tiempo indefinido mientras estamos en fase de prueba · Sin tarjeta</div>
      </div>
      <div class="lp-hero-art">
        <div class="lp-frame">
          <div class="lp-frame-bar"><span></span><span></span><span></span><em>zoco-pos.vercel.app</em></div>
          <img src="./assets/lp-inicio.png" alt="Resumen de ZoCo POS con ventas del día y caja">
        </div>
        <div class="lp-float">
          <div class="lp-float-l">Ventas de hoy</div>
          <div class="lp-float-v">$848.00</div>
          <div class="lp-float-s">1 venta · Caja abierta</div>
        </div>
      </div>
    </section>

    <section class="lp-strip">
      <div><b>Sin instalación</b><span>Abre el navegador y vende</span></div>
      <div><b>Funciona sin internet</b><span>Sigue vendiendo y sincroniza después</span></div>
      <div><b>Hecho en México</b><span>Pesos, IVA y facturación pensados aquí</span></div>
      <div><b>Tus datos son tuyos</b><span>Respaldo descargable en un clic</span></div>
    </section>

    <section class="lp-sec">
      <div class="lp-sec-head">
        <span class="lp-tag">Míralo por dentro</span>
        <h2>No es una maqueta: es la app real.</h2>
        <p>Estas capturas son del sistema funcionando. Puedes abrir el demo y tocar lo mismo.</p>
      </div>
      <div class="lp-shots">
        <article class="lp-shot">
          <div class="lp-shot-img"><img src="./assets/lp-vender.png" alt="Pantalla de venta con productos, tallas y precios"></div>
          <h3>Vender en segundos</h3>
          <p>Busca o escanea, elige talla y color, cobra en efectivo o tarjeta. El inventario se descuenta solo.</p>
          <button class="lp-link" data-go="vender">Probar una venta →</button>
        </article>
        <article class="lp-shot">
          <div class="lp-shot-img"><img src="./assets/lp-compras.png" alt="Pantalla de compras a proveedores con cuentas por pagar"></div>
          <h3>Compras y proveedores</h3>
          <p>Órdenes, recepción parcial y cuentas por pagar. Sabes cuánto debes sin abrir Excel.</p>
          <button class="lp-link" data-go="compras">Ver compras →</button>
        </article>
        <article class="lp-shot">
          <div class="lp-shot-img"><img src="./assets/lp-reportes.png" alt="Pantalla de reportes con ventas por periodo y sucursal"></div>
          <h3>Reportes que sí entiendes</h3>
          <p>Ventas por día, por sucursal, utilidad y margen. Exporta lo que necesites.</p>
          <button class="lp-link" data-go="reportes">Ver reportes →</button>
        </article>
      </div>
    </section>

    <section class="lp-sec lp-afiliados" id="lp-afiliados">
      <div class="lp-af-head">
        <span class="lp-tag">Programa de afiliados</span>
        <h2>Gana mes con mes, no una sola vez.</h2>
        <p>Cada negocio que refieras y siga activo te deja una <b>comisión recurrente</b>.
          Se paga al instante en que el comercio paga su mensualidad o su paquete anual.</p>
      </div>

      <div class="lp-calc">
        <div class="lp-calc-controls">
          <div class="lp-field">
            <label>Paquete</label>
            <div class="lp-pkgs">
              ${PAQUETES.map((p) => `<button class="lp-pkg ${p.id === 'pro' ? 'on' : ''}" data-pkg="${p.id}">
                <b>${esc(p.nombre)}</b><span>${money(p.precio)}/mes</span><em>${money(p.comision)} comisión</em>
              </button>`).join('')}
            </div>
          </div>
          <div class="lp-field">
            <label>Personas que afilias al mes <b id="lp-people-v">4</b></label>
            <input type="range" id="lp-people" min="1" max="40" value="4" class="lp-range">
            <div class="lp-range-scale"><span>1</span><span>20</span><span>40</span></div>
          </div>
          <div class="lp-calc-res">
            <div class="lp-res">
              <small>Este mes</small>
              <b id="lp-mes">$0</b>
            </div>
            <div class="lp-res lp-res-dark">
              <small>Acumulado al mes 12</small>
              <b id="lp-total">$0</b>
            </div>
          </div>
          <div class="lp-note">Simulación con la misma cantidad de afiliados cada mes y todos activos.
            No incluye bajas ni impuestos.</div>
        </div>

        <div class="lp-months">
          <div class="lp-months-head">
            <b>Mes con mes</b>
            <div class="lp-arrows">
              <button id="lp-prev" aria-label="Anterior">←</button>
              <button id="lp-next" aria-label="Siguiente">→</button>
            </div>
          </div>
          <div class="lp-months-track" id="lp-track"></div>
        </div>
      </div>
    </section>

    <section class="lp-sec">
      <div class="lp-sec-head">
        <span class="lp-tag">Para tu giro</span>
        <h2>Un POS para cualquier negocio.</h2>
        <p>ZoCo se configura con las secciones, tallas o unidades de cada tipo de negocio.</p>
      </div>
      <div class="lp-giros">${GIROS.map((g) => `<span>${esc(g)}</span>`).join('')}</div>
    </section>

    <section class="lp-final">
      <div>
        <h2>Empieza gratis hoy.</h2>
        <p>Estamos en fase de prueba: todo es gratis mientras seguimos agregando cosas.
          Puedes probar cada servicio nuevo sin pagar nada.</p>
      </div>
      <div class="lp-final-cta">
        <button class="lp-btn lp-btn-primary" id="lp-demo2">Probar el demo</button>
        <button class="lp-btn lp-btn-ghost" id="lp-cuenta">Crear mi cuenta</button>
      </div>
    </section>

    <div class="lp-legal">
      * Gratis por tiempo indefinido durante la fase de prueba. Los planes de pago y las comisiones
      de afiliados se activarán cuando termine la beta; hoy no se cobra nada.
    </div>
  </div>`);

  // ---------- Simulador ----------
  const track = root.querySelector('#lp-track');
  const peopleInput = root.querySelector('#lp-people');
  const peopleLabel = root.querySelector('#lp-people-v');
  const mesEl = root.querySelector('#lp-mes');
  const totalEl = root.querySelector('#lp-total');
  let paquete = PAQUETES[1];

  const pintar = () => {
    const personas = Number(peopleInput.value) || 1;
    peopleLabel.textContent = personas;
    const comision = paquete.comision;
    let acumulado = 0;
    let html = '';
    for (let mes = 1; mes <= 12; mes++) {
      const activos = personas * mes;
      const delMes = activos * comision;
      acumulado += delMes;
      html += `<div class="lp-month ${mes === 12 ? 'lp-month-on' : ''}">
        <div class="lp-month-top">Mes ${mes}</div>
        <div class="lp-month-act">${activos} activos</div>
        <div class="lp-month-v">${money(delMes)}</div>
        <div class="lp-month-acc">${money(acumulado)}</div>
        <div class="lp-month-lbl">acumulado</div>
      </div>`;
    }
    track.innerHTML = html;
    const mes12 = personas * 12 * comision;
    mesEl.textContent = money(personas * comision);
    totalEl.textContent = money(mes12);
  };

  peopleInput.oninput = pintar;
  root.querySelectorAll('[data-pkg]').forEach((b) => {
    b.onclick = () => {
      paquete = PAQUETES.find((p) => p.id === b.dataset.pkg) || PAQUETES[1];
      root.querySelectorAll('[data-pkg]').forEach((x) => x.classList.toggle('on', x === b));
      pintar();
    };
  });

  // Flechas + arrastre horizontal
  const paso = () => {
    const card = track.querySelector('.lp-month');
    return card ? card.getBoundingClientRect().width + 12 : 200;
  };
  root.querySelector('#lp-next').onclick = () => track.scrollBy({ left: paso(), behavior: 'smooth' });
  root.querySelector('#lp-prev').onclick = () => track.scrollBy({ left: -paso(), behavior: 'smooth' });

  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  track.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX;
    startScroll = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    track.scrollLeft = startScroll - (e.clientX - startX);
  });
  track.addEventListener('pointerup', () => { dragging = false; });
  track.addEventListener('pointercancel', () => { dragging = false; });

  // ---------- Acciones ----------
  const irDemo = () => { location.href = '/demo'; };
  root.querySelector('#lp-demo').onclick = irDemo;
  root.querySelector('#lp-demo2').onclick = irDemo;
  root.querySelector('#lp-cuenta').onclick = () => { window.open('/?registro=1', '_blank'); };
  root.querySelector('#lp-planes').onclick = () => { ctx?.go?.('plan'); toast('Elige tu plan en Mi plan'); };
  root.querySelectorAll('[data-go]').forEach((b) => {
    b.onclick = () => {
      const r = b.dataset.go;
      window.open('/demo#/' + r, '_blank');
    };
  });

  pintar();
  return { root };
}
