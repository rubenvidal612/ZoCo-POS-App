document.getElementById('simulate-five').addEventListener('click', () => {
  const clients = document.getElementById('clients');
  const month = document.getElementById('referral-month');
  clients.value = '5';
  month.value = '12';
  document.querySelector('[data-referral-plan="pro"]').click();
});

document.querySelectorAll('.kit-cards article').forEach(card => {
  const demo = card.querySelector('a[href]');
  const flyer = card.querySelector('.sales-flyer');

  card.querySelector('.copy-message').addEventListener('click', async () => {
    const message = card.querySelector('.kit-message').textContent + '\n' + demo.href;
    const status = card.querySelector('.copy-status');
    try {
      await navigator.clipboard.writeText(message);
      status.textContent = 'Mensaje copiado.';
    } catch {
      window.prompt('Copia el mensaje y el enlace', message);
    }
  });

  card.querySelector('.print-flyer').addEventListener('click', async () => {
    const copy = flyer.cloneNode(true);
    const image = copy.querySelector('img');
    image.loading = 'eager';
    const link = demo.cloneNode(true);
    link.textContent = 'Prueba la demo de ZoCo POS';
    copy.lastElementChild.append(link);
    copy.classList.add('printable-flyer');
    document.body.append(copy);
    try {
      await image.decode();
    } catch {
      // The headline, description and demo link can still be printed.
    }
    document.body.classList.add('printing-flyer');
    try {
      window.print();
    } finally {
      document.body.classList.remove('printing-flyer');
      copy.remove();
    }
  });
});
