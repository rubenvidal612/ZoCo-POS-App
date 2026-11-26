
/** Apariencia personal del personaje ZoCo: se conserva en este dispositivo. */
export const MASCOT_CHOICES = [
  {id:'perla',label:'Perla turquesa',detail:'La original'},
  {id:'sol',label:'Sol naranja',detail:'Energética'},
  {id:'nube',label:'Nube blanca',detail:'Minimalista'},
  {id:'luna',label:'Luna violeta',detail:'Creativa'},
  {id:'oceano',label:'Océano azul',detail:'Tranquila'},
  {id:'jaguar',label:'Jaguar',detail:'Saluda con su patita'},
  {id:'manati',label:'Manatí',detail:'Saluda con su aleta'},
  {id:'aguila',label:'Águila mexicana',detail:'Saluda con su ala'},
  {id:'ajolote',label:'Ajolote',detail:'Saludo acuático'},
  {id:'quetzal',label:'Quetzal',detail:'Saluda con su ala'},
];
const KEY = 'zoco.mascot.choice';
export function getMascotChoice() {
  try {
    const choice = localStorage.getItem(KEY) || 'perla';
    return MASCOT_CHOICES.some(item => item.id === choice) ? choice : 'perla';
  } catch {return 'perla';}
}
export function setMascotChoice(choice) {
  if (!MASCOT_CHOICES.some(item => item.id === choice)) return false;
  try {localStorage.setItem(KEY,choice);} catch {}
  document.documentElement.dataset.zocoMascot = choice;
  refreshMascotImages(true);
  return true;
}
if (typeof document !== 'undefined') document.documentElement.dataset.zocoMascot = getMascotChoice();
export function mascotMarkup(variant = '', thinking = false) {
  return `<span class="zoco-mascot ${variant}" data-mascot-state="${thinking ? 'thinking' : 'ready'}" aria-hidden="true">
    <img data-zoco-mascot-img src="${mascotAsset()}" alt="">
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

/* Saludos de seis fotogramas con fondo transparente. No se repiten indefinidamente. */
const MASCOT_GIFS = Object.freeze({
  jaguar:'/assets/mascotas/jaguar-saludo.gif',
  manati:'/assets/mascotas/manati-saludo.gif',
  aguila:'/assets/mascotas/aguila-saludo.gif',
  ajolote:'/assets/mascotas/ajolote-saludo.gif',
  quetzal:'/assets/mascotas/quetzal-saludo.gif'
});
const stillCache = new Map();
const pendingStills = new Map();
let greetSequence = 0;
export function mascotIsAnimal(choice = getMascotChoice()) {
  return Object.prototype.hasOwnProperty.call(MASCOT_GIFS,choice);
}
export function mascotAsset(choice = getMascotChoice()) {
  return stillCache.get(choice) || MASCOT_GIFS[choice] || '/assets/landing-2/mascota-perla.webp';
}
export function mascotPreviewAsset(choice) {
  return MASCOT_GIFS[choice] || '/assets/landing-2/mascota-perla.webp';
}
function firstFrame(choice) {
  if (stillCache.has(choice)) return Promise.resolve(stillCache.get(choice));
  if (pendingStills.has(choice)) return pendingStills.get(choice);
  const request = new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image,0,0);
        const frame = canvas.toDataURL('image/png');
        stillCache.set(choice,frame); resolve(frame);
      } catch { resolve(MASCOT_GIFS[choice]); }
    };
    image.onerror = () => resolve(MASCOT_GIFS[choice]);
    image.src = MASCOT_GIFS[choice];
  });
  pendingStills.set(choice,request);
  return request;
}
const noMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function playMascotGreeting(root = document) {
  const choice = getMascotChoice();
  if (!mascotIsAnimal(choice) || noMotion()) return;
  const elements = Array.from(root?.querySelectorAll?.('img[data-zoco-mascot-img]') || []);
  if (root?.matches?.('img[data-zoco-mascot-img]')) elements.push(root);
  if (!elements.length) return;
  const token = String(++greetSequence);
  elements.forEach(img => {
    img.dataset.zocoChosen = choice; img.dataset.zocoGreet = token;
    img.src = MASCOT_GIFS[choice] + '?saludo=' + token;
  });
  firstFrame(choice).then(frame => setTimeout(() => {
    elements.forEach(img => {
      if (!img.isConnected || img.dataset.zocoChosen !== choice || img.dataset.zocoGreet !== token) return;
      delete img.dataset.zocoGreet; img.src = frame;
    });
  }, 1070));
}
export function refreshMascotImages(greet = false) {
  const choice = getMascotChoice();
  document.documentElement.dataset.zocoMascot = choice;
  const elements = Array.from(document.querySelectorAll('img[data-zoco-mascot-img]'));
  elements.forEach(img => {
    img.dataset.zocoChosen = choice; delete img.dataset.zocoGreet;
    img.src = mascotAsset(choice);
    img.closest('.zoco-mascot')?.classList.toggle('zoco-animal',mascotIsAnimal(choice));
  });
  if (!mascotIsAnimal(choice)) return;
  if (greet && !noMotion()) playMascotGreeting(document);
  else firstFrame(choice).then(frame => elements.forEach(img => {
    if (img.isConnected && img.dataset.zocoChosen === choice && !img.dataset.zocoGreet) img.src = frame;
  }));
}
