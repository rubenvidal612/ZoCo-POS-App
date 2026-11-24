const phone = document.getElementById('phone-screen');
const screenDescriptions = {
  'resumen-movil': 'Resumen de ventas de ZoCo en celular',
  'tienda-movil': 'Pantalla de venta de ZoCo en celular',
  'restaurante-movil': 'Pantalla de venta de ZoCo Food en celular',
  'asistente-movil': 'Asistente IA de ZoCo en celular',
};

const screenButtons = document.querySelectorAll('[data-screen]');
screenButtons.forEach(button => {
  button.addEventListener('click', () => {
    const screen = button.dataset.screen;
    phone.src = '/assets/landing-2/' + screen + '.webp';
    phone.alt = screenDescriptions[screen];
    screenButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  });
});

const messages = document.getElementById('messages');
const bubbles = [...messages.querySelectorAll('.bubble')];
const demoStatus = document.getElementById('demo-status');
const demoToggle = document.getElementById('demo-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let playbackId = 0;
let playing = false;

function showConversation() {
  playbackId++;
  playing = false;
  bubbles.forEach(bubble => { bubble.hidden = false; });
  demoStatus.textContent = 'Conversación de ejemplo';
  demoToggle.textContent = 'Repetir demo';
}

async function playConversation() {
  if (reducedMotion.matches) {
    showConversation();
    return;
  }
  const currentPlayback = ++playbackId;
  playing = true;
  demoToggle.textContent = 'Ver conversación';
  bubbles.forEach(bubble => { bubble.hidden = true; });
  messages.scrollTop = 0;

  for (const bubble of bubbles) {
    const owner = bubble.classList.contains('user');
    const draft = owner ? Array.from(bubble.textContent) : ['.', '.', '.'];
    let written = owner ? '' : 'ZoCo está respondiendo';
    for (const character of draft) {
      written += character;
      demoStatus.textContent = written;
      await new Promise(resolve => setTimeout(resolve, owner ? 27 : 360));
      if (currentPlayback !== playbackId) return;
    }
    demoStatus.textContent = 'Conversación de ejemplo';
    bubble.hidden = false;
    messages.scrollTop = messages.scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 1450));
    if (currentPlayback !== playbackId) return;
  }
  showConversation();
}

demoToggle.addEventListener('click', () => {
  if (playing) showConversation();
  else playConversation();
});

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer.disconnect();
      if (playbackId === 0) playConversation();
    }
  }, { threshold: 0.5 });
  observer.observe(messages);
}
