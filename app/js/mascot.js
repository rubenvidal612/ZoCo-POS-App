export function mascotMarkup(variant = '', thinking = false) {
  return `<span class="zoco-mascot ${variant}" data-mascot-state="${thinking ? 'thinking' : 'ready'}" aria-hidden="true">
    <img src="/assets/landing-2/mascota-perla.webp" width="340" height="234" alt="">
    <span class="zoco-mascot-smile"></span>
  </span>`;
}

let motionInstalled = false;
let lastGreet = 0;
export function reactMascot(mood = 'happy') {
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
      if (ev.pointerType !== 'mouse') return;
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
}
