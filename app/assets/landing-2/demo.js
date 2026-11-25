const phone = document.getElementById('phone-screen');
const desktop = document.getElementById('desktop-screen');
const desktopNames = { resumen:'Resumen de ventas', tienda:'Pantalla de ventas de tienda', restaurante:'Pantalla de ventas de restaurante', asistente:'Asistente IA' };
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
    const view = screen.replace('-movil', '');
    desktop.src = '/assets/landing-2/' + view + '-escritorio.webp';
    desktop.alt = desktopNames[view] + ' de ZoCo en computadora';
    screenButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  });
});

const messages = document.getElementById('messages');
const bubbles = [...messages.querySelectorAll('.bubble')];
const demoStatus = document.getElementById('demo-status');
const demoToggle = document.getElementById('demo-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pearls = document.querySelectorAll('.chat-identity .pearl');
function setPearlState(state) {
  pearls.forEach(pearl => { pearl.dataset.state = state; });
}
let playbackId = 0;
let playing = false;

function showConversation() {
  playbackId++;
  setPearlState("idle");
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

  setPearlState("idle");
  for (const [index, bubble] of bubbles.entries()) {
    const owner = bubble.classList.contains('user');
    setPearlState(owner ? "idle" : "thinking");
    const draft = owner ? Array.from(bubble.textContent) : ['.', '.', '.'];
    let written = owner ? '' : 'ZoCo está respondiendo';
    for (const character of draft) {
      written += character;
      demoStatus.textContent = written;
      await new Promise(resolve => setTimeout(resolve, owner ? 27 : 360));
      if (currentPlayback !== playbackId) return;
    }
    demoStatus.textContent = 'Conversación de ejemplo';
    if (!owner && index === bubbles.length - 1) {
      setPearlState("working");
      demoStatus.textContent = 'ZoCo está aplicando el descuento…';
      await new Promise(resolve => setTimeout(resolve, 850));
      if (currentPlayback !== playbackId) return;
      demoStatus.textContent = 'Conversación de ejemplo';
    }
    bubble.hidden = false;
    if (!owner) setPearlState(index === bubbles.length - 1 ? "success" : "working");
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

const interactiveMascots = document.querySelectorAll('.pearl');
let gazeFrame;
function trackGaze(event) {
  if (reducedMotion.matches) return;
  const { clientX, clientY } = event;
  cancelAnimationFrame(gazeFrame);
  gazeFrame = requestAnimationFrame(() => {
    interactiveMascots.forEach(mascot => {
      const box = mascot.getBoundingClientRect();
      const x = clientX - (box.left + box.width / 2);
      const y = clientY - (box.top + box.height * 0.6);
      const distance = Math.hypot(x, y) || 1;
      const strength = Math.min(distance / 110, 1);
      mascot.style.setProperty('--gaze-x', (31 * x / distance * strength) + '%');
      mascot.style.setProperty('--gaze-y', (31 * y / distance * strength) + '%');
    });
  });
}
document.addEventListener('pointermove', trackGaze, { passive: true });
document.addEventListener('pointerdown', trackGaze, { passive: true });
