const landingRef = new URLSearchParams(location.search).get('ref');
if (landingRef) {
  document.querySelectorAll('a[href]').forEach(link => {
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    if (url.pathname !== '/demo' && !(url.pathname === '/' && url.searchParams.has('registro'))) return;
    url.searchParams.set('ref', landingRef);
    link.href = url.href;
  });
}
