
/** Apariencia personal del personaje ZoCo: se conserva en este dispositivo. */
const ROBOT_SRC = '/assets/mascotas/zoco-robot-transparente.webp';
export const MASCOT_CHOICES = [
  {id:'robot',label:'Robot ZoCo',detail:'Mascota oficial'},
];
const KEY = 'zoco.mascot.choice';
export function getMascotChoice() {
  // Todos los dispositivos vuelven al robot aunque tengan un animal anterior guardado.
  try { if (localStorage.getItem(KEY) !== 'robot') localStorage.setItem(KEY,'robot'); } catch {}
  return 'robot';
}
export function setMascotChoice(choice) {
  if (choice !== 'robot') return false;
  try { localStorage.setItem(KEY,'robot'); } catch {}
  document.documentElement.dataset.zocoMascot = 'robot';
  refreshMascotImages(true);
  return true;
}
if (typeof document !== 'undefined') document.documentElement.dataset.zocoMascot = 'robot';
export function mascotMarkup(variant = '', thinking = false) {
  return `<span class="zoco-mascot zoco-robot ${variant}" data-mascot-state="${thinking ? 'thinking' : 'ready'}" aria-hidden="true">
    <img data-zoco-mascot-img src="${ROBOT_SRC}" alt="">
  </span>`;
}
let motionInstalled = false;
let lastGreet = 0;
export function reactMascot(mood = 'happy') {
  if (mascotIsAnimal()) { playMascotGreeting(document.querySelector('.sidebar')); return; }
  const node = document.querySelector('.sidebar .zoco-mascot');
  if (!node || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  node.dataset.mood = mood;
  node.classList.remove('zoco-mascot-react');
  void node.offsetWidth;
  node.classList.add('zoco-mascot-react');
  clearTimeout(node._moodTimer);
  node._moodTimer = setTimeout(() => {node.classList.remove('zoco-mascot-react');node.dataset.mood='idle';},1250);
}
export function setupMascotMotion() {
  if (!motionInstalled) {
    motionInstalled = true;
    document.addEventListener('pointermove', ev => {
      if (ev.pointerType !== 'mouse' || mascotIsAnimal()) return;
      const node = document.querySelector('.sidebar .zoco-mascot');
      if (!node) return;
      const box = node.getBoundingClientRect();
      const dx = Math.max(-1,Math.min(1,(ev.clientX-box.left-box.width/2)/220));
      const dy = Math.max(-1,Math.min(1,(ev.clientY-box.top-box.height/2)/220));
      node.style.setProperty('--look-x',(dx*4).toFixed(1)+'px');
      node.style.setProperty('--look-y',(dy*3).toFixed(1)+'px');
    },{passive:true});
  }
  const avatar = document.querySelector('.sidebar .uc-avatar');
  if (avatar) {
    avatar.addEventListener('mouseenter',()=>reactMascot('curious'));
    avatar.addEventListener('click',()=>reactMascot('excited'));
  }
  if (Date.now()-lastGreet > 45000) {lastGreet=Date.now();reactMascot('hello');}
  else refreshMascotImages(false);
}


/* Una única mascota: sin GIF de animalitos, sin fondo negro ni reproducción continua. */
export const mascotIsAnimal = () => false;
export const mascotAsset = () => ROBOT_SRC;
export const mascotPreviewAsset = () => ROBOT_SRC;
export function playMascotGreeting(root = document) {
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nodes = root.querySelectorAll?.('.zoco-mascot') || [];
  nodes.forEach(node => {
    node.classList.remove('zoco-mascot-react');
    void node.offsetWidth;
    node.dataset.mood='hello';
    node.classList.add('zoco-mascot-react');
    clearTimeout(node._greetTimer);
    node._greetTimer=setTimeout(()=>{node.classList.remove('zoco-mascot-react');node.dataset.mood='idle';},1100);
  });
}
export function refreshMascotImages(greet = false) {
  document.documentElement.dataset.zocoMascot = 'robot';
  document.querySelectorAll('img[data-zoco-mascot-img]').forEach(img => {
    if (img.getAttribute('src') !== ROBOT_SRC) img.src = ROBOT_SRC;
    img.closest('.zoco-mascot')?.classList.remove('zoco-animal');
  });
  if (greet) playMascotGreeting(document);
}
