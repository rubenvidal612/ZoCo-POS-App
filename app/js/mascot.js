export function mascotMarkup(variant = '', thinking = false) {
  return `<span class="zoco-mascot ${variant}" data-mascot-state="${thinking ? 'thinking' : 'ready'}" aria-hidden="true">
    <img src="/assets/landing-2/mascota-perla.webp" width="340" height="234" alt="">
    <span class="zoco-mascot-smile"></span>
  </span>`;
}
