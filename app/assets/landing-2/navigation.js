const landingHeader = document.querySelector('header');
const landingMenu = document.querySelector('.nav-toggle');
const landingNav = document.getElementById('landing-nav');
const landingBackdrop = document.querySelector('.nav-backdrop');
const mobileMenu = matchMedia('(max-width: 940px)');

function setMenu(open, restoreFocus = false) {
  landingMenu.setAttribute('aria-expanded', String(open));
  landingBackdrop.hidden = !open;
  if (restoreFocus) landingMenu.focus();
}
landingMenu.addEventListener('click', () => setMenu(landingMenu.getAttribute('aria-expanded') !== 'true'));
landingBackdrop.addEventListener('click', () => setMenu(false, true));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !landingBackdrop.hidden) setMenu(false, true);
});
landingNav.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || !mobileMenu.matches) return;
  setMenu(false);
  const section = document.getElementById(link.hash.slice(1));
  if (section) {
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
  }
});
mobileMenu.addEventListener('change', () => setMenu(false));
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--header-offset', `${landingHeader.offsetHeight + 16}px`);
}).observe(landingHeader);
