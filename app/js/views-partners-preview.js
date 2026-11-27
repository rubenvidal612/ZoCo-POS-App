// Isolated UI preview. No customer data, billing or persistence.
export function partnersPreviewView() {
 const root=document.createElement('div');
 root.className='panel';
 root.innerHTML=`<div style="padding:20px;max-width:760px;margin:auto"><h2>ZoCo Partners</h2><p>Vista de prueba · Sin clientes reales ni cobros</p><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px" id="partner-metrics"></div><hr><h3>Personalizar mi marca</h3><label>Nombre comercial <input id="partner-name" maxlength="50" value="Nova POS"></label><label> Color <input id="partner-color" type="color" value="#6366f1"></label><div id="partner-brand" style="padding:18px;margin:16px 0;border:1px solid #8885;border-radius:14px"><strong id="partner-brand-name"></strong><p>Ventas de hoy · Ejemplo</p><h2>$12,850</h2><svg viewBox="0 0 240 50" style="width:100%;max-width:300px"><path id="partner-wave" d="M0 45 Q30 5 60 30 T120 25 T180 10 T240 5" fill="none" stroke-width="4"/></svg><p>Ventas · Inventario · Clientes · Asistente IA</p></div><h3>Simulador de planes y precios</h3><label>Negocios activos <input id="partner-count" type="number" min="0" max="100000" value="50"></label><label> Precio mensual MXN <input id="partner-price" type="number" min="0" max="100000" value="399"></label><label> Costo mayorista MXN (ejemplo) <input id="partner-cost" type="number" min="0" max="100000" value="179"></label><p>Los importes son simulados y no constituyen tarifas aprobadas.</p><hr><h3>Panel del distribuidor</h3><p>Mis negocios · Mi dominio · Mis landing pages · Facturación · Soporte</p><p>Estos módulos todavía no están habilitados.</p></div>`;
 const q=id=>root.querySelector('#partner-'+id);
 const fmt=n=>n.toLocaleString('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});
 const num=id=>Math.max(0,Math.min(100000,Number(q(id).value)||0));
 function render(){
 const n=Math.floor(num('count')), p=num('price'), c=num('cost');
 q('metrics').replaceChildren(...[['Clientes activos',n],['Ingresos mensuales',fmt(n*p)],['Costo de licencias',fmt(n*c)],['Margen mensual',fmt(n*(p-c))]].map(([label,value])=>{const el=document.createElement('div');el.style.cssText='border:1px solid #8885;border-radius:12px;padding:14px';const t=document.createElement('div');t.textContent=label;const v=document.createElement('h2');v.textContent=value;el.append(t,v);return el;}));
 q('brand-name').textContent=q('name').value.trim()||'Mi POS';q('brand-name').style.color=q('color').value;q('wave').setAttribute('stroke',q('color').value);
 }
 root.addEventListener('input',render);render();return {root};
}
