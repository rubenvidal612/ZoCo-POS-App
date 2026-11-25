const referralPlans = {
  esencial: { name: 'Esencial', commission: 50 },
  pro: { name: 'Pro', commission: 150 },
  empresarial: { name: 'Empresarial', commission: 250 },
};

const byId = id => document.getElementById(id);
const clients = byId('clients');
const timeline = byId('referral-month');
const planButtons = document.querySelectorAll('[data-referral-plan]');
const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat('es-MX');
let plan = referralPlans.pro;

const rows = Array.from({ length: 12 }, (_, index) => {
  const row = byId('referral-table').insertRow();
  row.insertCell().textContent = index + 1;
  row.insertCell();
  row.insertCell();
  return row;
});

function renderProjection() {
  const entrants = clients.validity.valid ? (clients.valueAsNumber || 0) : 0;
  const month = Number(timeline.value);
  const base = entrants * plan.commission;
  byId('selected-month').textContent = month;
  timeline.setAttribute('aria-valuetext', 'Mes ' + month + ' de 12');
  byId('referral-rate').textContent = currency.format(plan.commission) + ' MXN al mes por cliente activo con ZoCo ' + plan.name + '.';
  byId('month-caption').textContent = 'Comisión del mes ' + month;
  byId('month-income').textContent = currency.format(base * month);
  byId('total-caption').textContent = 'Acumulado al mes ' + month;
  byId('referral-total').textContent = currency.format(base * month * (month + 1) / 2);
  byId('referral-active').textContent = number.format(entrants * month);
  rows.forEach((row, index) => {
    const currentMonth = index + 1;
    row.cells[1].textContent = currency.format(base * currentMonth);
    row.cells[2].textContent = currency.format(base * currentMonth * (currentMonth + 1) / 2);
    row.classList.toggle('current-month', currentMonth === month);
  });
}

planButtons.forEach(button => {
  button.addEventListener('click', () => {
    plan = referralPlans[button.dataset.referralPlan];
    planButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderProjection();
  });
});
clients.addEventListener('input', () => {
  renderProjection();
  if (!clients.validity.valid) clients.reportValidity();
});
timeline.addEventListener('input', renderProjection);
renderProjection();
