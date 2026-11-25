const referralPlans = {
  esencial: { name: 'Esencial', commission: 50 },
  pro: { name: 'Pro', commission: 150 },
  empresarial: { name: 'Empresarial', commission: 250 },
};

const byId = id => document.getElementById(id);
const clients = byId('clients');
const range = byId('clients-range');
const strip = byId('referral-months');
const planButtons = document.querySelectorAll('[data-referral-plan]');
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('es-MX');
const scrollBehavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
let plan = referralPlans.pro;
let selected = 0;

const cards = Array.from({ length: 12 }, (_, index) => {
  const card = document.createElement('article');
  card.className = 'month-card';
  card.innerHTML = `<h3>Mes ${index + 1}</h3><dl><dt>Clientes activos</dt><dd></dd><dt>Comisión mensual</dt><dd></dd><dt>Acumulado</dt><dd></dd></dl>`;
  strip.append(card);
  return card;
});

function renderProjection() {
  const entrants = clients.validity.valid ? (clients.valueAsNumber || 0) : 0;
  const base = entrants * plan.commission;
  byId('referral-rate').textContent = `${currency.format(plan.commission)} MXN al mes por cliente activo con ZoCo ${plan.name}.`;
  byId('month-caption').textContent = `Comisión del mes ${selected + 1}`;
  byId('month-income').textContent = currency.format(base * (selected + 1));
  byId('referral-total').textContent = currency.format(base * 78);
  cards.forEach((card, index) => {
    const month = index + 1;
    const [active, income, total] = card.querySelectorAll('dd');
    active.textContent = number.format(entrants * month);
    income.textContent = currency.format(base * month);
    total.textContent = currency.format(base * month * (month + 1) / 2);
    card.classList.toggle('current-month', index === selected);
  });
}

function goToMonth(index) {
  selected = Math.min(cards.length - 1, Math.max(0, index));
  strip.scrollTo({ left: cards[selected].offsetLeft, behavior: scrollBehavior });
  renderProjection();
}

strip.addEventListener('scrollend', () => {
  const closest = cards.reduce((best, card, index) =>
    Math.abs(card.offsetLeft - strip.scrollLeft) < Math.abs(cards[best].offsetLeft - strip.scrollLeft) ? index : best, 0);
  if (closest !== selected) {
    selected = closest;
    renderProjection();
  }
});
byId('month-back').onclick = () => goToMonth(selected - 1);
byId('month-next').onclick = () => goToMonth(selected + 1);
strip.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const target = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: 11 };
  goToMonth(target[event.key]);
});

let drag;
strip.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  drag = { x: event.clientX, scroll: strip.scrollLeft };
  strip.setPointerCapture(event.pointerId);
  strip.classList.add('is-dragging');
});
strip.addEventListener('pointermove', event => {
  if (drag) strip.scrollLeft = drag.scroll + drag.x - event.clientX;
});
strip.addEventListener('lostpointercapture', () => {
  drag = undefined;
  strip.classList.remove('is-dragging');
});

planButtons.forEach(button => {
  button.addEventListener('click', () => {
    plan = referralPlans[button.dataset.referralPlan];
    planButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderProjection();
  });
});
clients.addEventListener('input', () => {
  if (clients.validity.valid && clients.value) range.value = clients.value;
  renderProjection();
});
range.addEventListener('input', () => {
  clients.value = range.value;
  renderProjection();
});
renderProjection();
