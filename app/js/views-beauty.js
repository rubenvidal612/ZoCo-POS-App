// ZoCo Beauty: servicios, comisiones por profesional y citas privadas.
import { state, emit, can, currentUser, upsertProduct, subscribe } from './store.js';
import { cloudSession } from './auth.js';
import { el, esc, money, toast } from './ui.js';

const E=v=>esc(String(v??''));
const formatDate=s=>new Date(s).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});
const money2=n=>money(Number(n)||0);
const commission=(a)=>a.commission_type==='fixed'
  ?Math.min(Number(a.price)||0,Number(a.commission_value)||0)
  :Math.round((Number(a.price)||0)*(Math.min(100,Number(a.commission_value)||0)/100)*100)/100;
const validRole=()=>can('products.edit')||can('users.manage');
const token=()=>cloudSession()?.access_token||'';
const serviceList=()=>state.products.filter(p=>p.section==='servicios'&&p.active!==false);
const professionals=()=>state.users.filter(u=>u.active!==false&&u.beautyProfessional);
function dateKey(d){const dt=new Date(d);return [dt.getFullYear(),String(dt.getMonth()+1).padStart(2,'0'),String(dt.getDate()).padStart(2,'0')].join('-')}
function api(company,method='GET',body=null,params='') {
  return fetch('/api/beauty-appointments?c='+encodeURIComponent(company)+params,{
    method,headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',
  }).then(async r=>{const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Error al cargar citas');return j});
}
export function beautyView(){
  const root=el('<div class="beauty-app"></div>');
  let tab='agenda',all=[],focusDay=dateKey(new Date()),busy=false,lastCount=null,interval=null,loading=false;
  const company=()=>state.currentCompany;
  const online=()=>Boolean(token());
  const refresh=async({notify=false}={})=>{
    if(loading||!online()||!root.isConnected)return;
    loading=true;
    try{
      const data=await api(company(),'GET',null,'&from='+encodeURIComponent(new Date(Date.now()-31*86400000).toISOString())+
        '&to='+encodeURIComponent(new Date(Date.now()+92*86400000).toISOString()));
      const next=data.appointments||[];
      const waiting=next.filter(a=>a.status==='requested').length;
      if(notify&&lastCount!==null&&waiting>lastCount){
        toast('🔔 Nueva solicitud de cita en ZoCo Beauty');
        if('Notification'in window&&Notification.permission==='granted')
          new Notification('ZoCo Beauty: nueva cita',{body:'Tienes '+waiting+' solicitud(es) pendiente(s) de confirmación'});
      }
      lastCount=waiting;all=next;paintBody();
    }catch(e){showInfo(e.message)}
    finally{loading=false}
  };
  function showInfo(text){const box=root.querySelector('#beauty-alert');if(box){box.hidden=false;box.textContent=text}}
  function options(items,selected){return items.map(i=>'<option value="'+E(i.id)+'"'+(i.id===selected?' selected':'')+'>'+E(i.name)+'</option>').join('')}
  function paint(){
    const allowed=validRole();
    root.innerHTML='<div class="by-heading"><div><span class="by-tag">ZOCO BEAUTY</span><h2>Agenda y comisiones</h2><p>Citas, servicios, estilistas y barberos en un mismo lugar.</p></div><div class="by-heading-actions"><button type="button" class="btn ghost sm" id="by-refresh">↻ Actualizar citas</button></div></div>'+
      '<div id="beauty-alert" class="by-alert" hidden></div>'+
      '<div class="by-tabs"><button data-tab="agenda" class="'+(tab==='agenda'?'active':'')+'">📅 Calendario</button>'+
      '<button data-tab="comisiones" class="'+(tab==='comisiones'?'active':'')+'">💰 Comisiones</button>'+
      (allowed?'<button data-tab="servicios" class="'+(tab==='servicios'?'active':'')+'">✂ Servicios</button><button data-tab="equipo" class="'+(tab==='equipo'?'active':'')+'">👥 Profesionales</button><button data-tab="reservas" class="'+(tab==='reservas'?'active':'')+'">🔗 Reservas online</button>':'')+'</div><div id="beauty-body"></div>';
    root.querySelector('#by-refresh').onclick=()=>refresh();
    root.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{
      tab=button.dataset.tab;paint();
    });
    paintBody();
  }
  function paintBody(){
    const body=root.querySelector('#beauty-body');if(!body)return;
    if(tab==='agenda')return paintAgenda(body);
    if(tab==='comisiones')return paintCommissions(body);
    if(tab==='servicios')return paintServices(body);
    if(tab==='equipo')return paintTeam(body);
    if(tab==='reservas')return paintPublic(body);
  }
  function dayList(){
    return all.filter(a=>dateKey(a.start_at)===focusDay&&a.branch_id===state.currentBranch).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
  }
  function statusLabel(status){
    return ({requested:'Por confirmar',confirmed:'Confirmada',cancelled:'Cancelada',completed:'Atendida'})[status]||status;
  }
  function paintAgenda(body){
    const selected=dayList(),pending=all.filter(a=>a.status==='requested'&&a.branch_id===state.currentBranch);
    const days=[...Array(7)].map((_,i)=>{const d=new Date(focusDay+'T12:00:00');d.setDate(d.getDate()+i);return d});
    body.innerHTML='<div class="by-stats"><div><small>Solicitudes pendientes</small><strong>'+pending.length+'</strong></div><div><small>Citas del día</small><strong>'+selected.filter(a=>a.status!=='cancelled').length+'</strong></div><div><small>Servicios atendidos hoy</small><strong>'+selected.filter(a=>a.status==='completed').length+'</strong></div></div>'+
      '<div class="by-box by-calendar"><div class="by-datebar"><button type="button" id="by-prev">←</button><label>Fecha<input id="by-day" type="date" value="'+E(focusDay)+'"></label><button type="button" id="by-next">→</button></div>'+
      '<div class="by-week">'+days.map(d=>'<button class="'+(dateKey(d)===focusDay?'active':'')+'" data-day="'+dateKey(d)+'"><small>'+d.toLocaleDateString('es-MX',{weekday:'short'})+'</small><b>'+d.getDate()+'</b></button>').join('')+'</div>'+
      (online()?'<p class="by-help">Solicitudes nuevas aparecen al actualizar y se revisan automáticamente mientras tengas este módulo abierto.</p>':'<p class="by-help">Inicia sesión con tu cuenta de ZoCo en la nube para sincronizar y gestionar citas.</p>')+
      '<div class="by-appointments">'+(selected.length?selected.map(a=>
      '<article class="by-appt '+E(a.status)+'"><div class="by-appt-main"><div class="by-time">'+new Date(a.start_at).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})+'</div>'+
      '<div><strong>'+E(a.service_name)+'</strong><p>'+E(a.customer_name)+' · '+E(a.professional_name)+'</p><small>'+E(a.customer_phone)+' · '+E(statusLabel(a.status))+'</small>'+
      (a.notes?'<p>'+E(a.notes)+'</p>':'')+'</div></div><div class="by-appt-actions"><b>'+money2(a.price)+'</b>'+
      (a.status==='requested'?'<button type="button" class="btn sm" data-change="'+E(a.id)+'" data-status="confirmed">Confirmar</button>':'')+
      (a.status==='confirmed'?'<button type="button" class="btn sm" data-change="'+E(a.id)+'" data-status="completed">Marcar atendida</button>':'')+
      (['requested','confirmed'].includes(a.status)?'<button type="button" class="btn ghost sm" data-change="'+E(a.id)+'" data-status="cancelled">Cancelar</button>':'')+'</div></article>').join(''):
      '<div class="by-empty">No hay citas registradas para este día.</div>')+'</div></div>'+
      '<div class="by-box by-create"><h3>Agregar una cita manual</h3>'+
      '<form id="by-create"><div class="by-grid"><label>Servicio<select name="serviceId" required><option value="">Seleccionar</option>'+options(serviceList())+'</select></label>'+
      '<label>Profesional<select name="professionalId" required><option value="">Seleccionar</option>'+options(professionals())+'</select></label>'+
      '<label>Sucursal<select name="branchId" required>'+options(state.branches.map(b=>({id:b.id,name:b.name})),state.currentBranch)+'</select></label>'+
      '<label>Fecha y hora<input type="datetime-local" name="start" required></label>'+
      '<label>Nombre del cliente<input name="name" required maxlength="90"></label>'+
      '<label>Teléfono<input name="phone" required inputmode="tel" maxlength="20"></label></div>'+
      '<label>Notas<input name="notes" maxlength="300" placeholder="Ej. Corte + lavado"></label>'+
      '<button class="btn" type="submit">Crear cita</button></form></div>';
    body.querySelector('#by-prev').onclick=()=>moveDate(-1);
    body.querySelector('#by-next').onclick=()=>moveDate(1);
    body.querySelector('#by-day').onchange=e=>{if(e.target.value){focusDay=e.target.value;paintBody()}};
    body.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{focusDay=b.dataset.day;paintBody()});
    body.querySelectorAll('[data-change]').forEach(b=>b.onclick=()=>changeStatus(b.dataset.change,b.dataset.status));
    body.querySelector('#by-create').onsubmit=async ev=>{
      ev.preventDefault();if(!online())return toast('Conecta tu cuenta de ZoCo a la nube');
      const f=new FormData(ev.target),b=Object.fromEntries(f.entries());
      b.start=new Date(b.start).toISOString();
      const btn=ev.target.querySelector('button[type=submit]');btn.disabled=true;
      try{await api(company(),'POST',b);toast('Cita creada');await refresh();}catch(e){toast(e.message)}finally{btn.disabled=false}
    };
  }
  function moveDate(offset){const d=new Date(focusDay+'T12:00:00');d.setDate(d.getDate()+offset);focusDay=dateKey(d);paintBody();}
  async function changeStatus(id,status){
    if(!online())return toast('Inicia sesión en la nube');
    if(status==='completed'){
      const ok=confirm('¿Marcar como atendida? Esto sumará el servicio al reporte de comisiones, pero NO registra un cobro en Caja.');
      if(!ok)return;
    }
    try{await api(company(),'PATCH',{id,status});toast('Cita actualizada');await refresh();}
    catch(e){toast(e.message)}
  }
  function paintCommissions(body){
    const end=new Date(),start=new Date(end.getFullYear(),end.getMonth(),1);
    const completed=all.filter(a=>a.status==='completed'&&new Date(a.start_at)>=start&&a.branch_id===state.currentBranch);
    const byId=new Map();
    completed.forEach(a=>{const key=a.professional_id;let o=byId.get(key);if(!o){o={name:a.professional_name,qty:0,total:0,commission:0,lines:[]};byId.set(key,o)}
      o.qty++;o.total+=Number(a.price)||0;o.commission+=commission(a);o.lines.push(a)});
    const records=[...byId.values()].sort((a,b)=>b.total-a.total);
    const total=records.reduce((n,a)=>n+a.total,0),comm=records.reduce((n,a)=>n+a.commission,0);
    body.innerHTML='<div class="by-stats"><div><small>Servicios atendidos este mes</small><strong>'+completed.length+'</strong></div>'+
      '<div><small>Valor de servicios atendidos</small><strong>'+money2(total)+'</strong></div><div><small>Comisiones calculadas</small><strong>'+money2(comm)+'</strong></div></div>'+
      '<div class="by-box"><h3>Resumen por barbero o estilista</h3>'+
      '<p class="by-help">Los importes se calculan de citas marcadas como atendidas. No son pagos de nómina ni cobros confirmados en caja; registra el pago en Vender para llevar la contabilidad de la venta.</p>'+
      '<div class="by-table-wrap"><table><thead><tr><th>Profesional</th><th>Servicios</th><th>Valor</th><th>Comisión</th></tr></thead><tbody>'+
      (records.length?records.map(a=>'<tr><td>'+E(a.name)+'</td><td>'+a.qty+'</td><td>'+money2(a.total)+'</td><td><strong>'+money2(a.commission)+'</strong></td></tr>').join(''):'<tr><td colspan="4">Todavía no hay servicios atendidos este mes.</td></tr>')+
      '</tbody></table></div></div>';
  }
  function paintServices(body){
    const list=serviceList();body.innerHTML='<div class="by-box"><h3>Servicios y comisión por servicio</h3>'+
      '<p class="by-help">Los servicios se reutilizan del catálogo de ZoCo (categoría Servicios). Precio, duración y comisión se configuran una sola vez y se aplican a las nuevas citas.</p>'+
      '<form id="by-service"><div class="by-grid"><label>Nombre del servicio<input name="name" maxlength="100" placeholder="Corte de cabello" required></label>'+
      '<label>Precio MXN<input type="number" name="price" min="1" step="0.01" required></label>'+
      '<label>Duración (minutos)<input type="number" name="minutes" min="15" max="480" step="15" value="30" required></label>'+
      '<label>Tipo de comisión<select name="type"><option value="pct">Porcentaje (%)</option><option value="fixed">Monto fijo (MXN)</option></select></label>'+
      '<label>Valor de comisión<input type="number" name="value" min="0" step="0.01" value="0" required></label></div>'+
      '<button type="submit" class="btn">Agregar servicio</button></form></div>'+
      '<div class="by-service-grid">'+list.map(p=>'<article class="by-box"><strong>'+E(p.name)+'</strong>'+
      '<small>'+money2(p.price)+' · '+E(p.bookingMinutes||30)+' min · Comisión '+E(p.beautyCommissionType==='fixed'?money2(p.beautyCommissionValue||0):(Number(p.beautyCommissionValue)||0)+'%')+'</small>'+
      '<button type="button" class="btn ghost sm" data-edit="'+E(p.id)+'">Editar servicio</button></article>').join('')+'</div>';
    body.querySelector('#by-service').onsubmit=ev=>{
      ev.preventDefault();const f=new FormData(ev.target);
      const price=Number(f.get('price')),minutes=Number(f.get('minutes')),value=Number(f.get('value')),type=f.get('type');
      if(!Number.isFinite(price)||price<=0||!Number.isFinite(value)||value<0||
        type==='pct'&&value>100||!Number.isInteger(minutes)||minutes<15||minutes>480)return toast('Revisa el precio, duración y comisión');
      upsertProduct({name:String(f.get('name')).trim(),code:'SERV-'+Date.now().toString(36).toUpperCase(),section:'servicios',price,cost:0,
        bookingMinutes:minutes,beautyCommissionType:type,beautyCommissionValue:value,
        branchStock:{},sellBy:'pza',catalog:false,active:true});
      toast('Servicio agregado');paintBody();
    };
    body.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{
      const p=state.products.find(x=>x.id===b.dataset.edit);if(!p)return;
      const name=prompt('Nombre del servicio',p.name);if(name===null||!name.trim())return;
      const price=Number(prompt('Precio de venta MXN',p.price));if(!Number.isFinite(price)||price<=0)return toast('Precio inválido');
      const minutes=Number(prompt('Duración en minutos (15 a 480)',p.bookingMinutes||30));
      if(!Number.isInteger(minutes)||minutes<15||minutes>480)return toast('Duración inválida');
      const type=prompt('Comisión: escribe "pct" para porcentaje o "fixed" para monto fijo',p.beautyCommissionType||'pct');
      if(!['pct','fixed'].includes(type))return toast('Tipo de comisión inválido');
      const value=Number(prompt('Comisión ('+(type==='pct'?'%':'MXN')+')',p.beautyCommissionValue||0));
      if(!Number.isFinite(value)||value<0||type==='pct'&&value>100)return toast('Comisión inválida');
      upsertProduct({id:p.id,name:name.trim(),price,bookingMinutes:minutes,beautyCommissionType:type,beautyCommissionValue:value});
      toast('Servicio actualizado');paintBody();
    });
  }
  function paintTeam(body){
    const team=state.users.filter(u=>u.active!==false);
    body.innerHTML='<div class="by-box"><h3>Profesionales que aceptan citas</h3>'+
      '<p class="by-help">Activa a los barberos y estilistas desde el listado de usuarios existentes. Para darles acceso a ZoCo, crea su cuenta en Usuarios. Solo los nombres marcados aquí aparecerán en el enlace público de reservas.</p>'+
      '<div class="by-team">'+team.map(u=>'<label class="by-pro"><input type="checkbox" data-pro="'+E(u.id)+'"'+(u.beautyProfessional?' checked':'')+'> <span><b>'+E(u.name)+'</b><small>'+E(u.jobTitle||u.role||'Personal')+'</small></span></label>').join('')+'</div></div>';
    body.querySelectorAll('[data-pro]').forEach(c=>c.onchange=()=>{
      const u=state.users.find(x=>x.id===c.dataset.pro);if(u){u.beautyProfessional=c.checked;emit();toast(c.checked?'Profesional habilitado':'Profesional oculto de la agenda')}
    });
  }
  function paintPublic(body){
    const enabled=state.settings?.beautyBookingEnabled===true;
    const link=location.origin+'/reservar-belleza?c='+encodeURIComponent(company());
    body.innerHTML='<div class="by-box"><h3>Tu enlace para reservar citas</h3>'+
      '<p>Comparte el enlace en WhatsApp, Instagram o Facebook. Los clientes podrán seleccionar servicio, sucursal, profesional y horario. Cada solicitud nueva aparecerá en tu calendario para confirmarla.</p>'+
      '<label class="by-toggle"><input id="by-enable" type="checkbox"'+(enabled?' checked':'')+'> Habilitar citas desde internet</label>'+
      '<label>Enlace público<input readonly id="by-link" value="'+E(link)+'"></label>'+
      '<div class="by-link-actions"><button type="button" class="btn" id="by-copy">Copiar enlace</button><a class="btn ghost" href="'+E(link)+'" target="_blank" rel="noopener">Abrir como cliente</a></div>'+
      '<p class="by-help">Antes de activarlo, registra al menos un servicio y marca a tus profesionales. ZoCo mostrará nuevas solicitudes cuando el dueño consulte la agenda. Para avisos fuera de la app se necesitará configurar notificaciones push o mensajes automáticos.</p></div>';
    body.querySelector('#by-enable').onchange=ev=>{
      state.settings ||= {};
      if(ev.target.checked&&(!serviceList().length||!professionals().length)){
        ev.target.checked=false;toast('Primero registra servicios y profesionales');return;
      }
      state.settings.beautyBookingEnabled=ev.target.checked;emit();
      toast(ev.target.checked?'Reservas online habilitadas. Verifica la sincronización en la nube.':'Reservas online deshabilitadas');
    };
    body.querySelector('#by-copy').onclick=async()=>{
      try{await navigator.clipboard.writeText(link);toast('Enlace copiado');}
      catch{body.querySelector('#by-link').select();toast('Selecciona y copia el enlace')}
    };
  }
  paint();
  // Se monta después de que app.js inserte la vista al DOM.
  setTimeout(()=>refresh(),0);
  interval=setInterval(()=>refresh({notify:true}),60000);
  const unsubscribe=subscribe(()=>{if(root.isConnected&&tab!=='servicios'&&tab!=='equipo'&&tab!=='reservas')paintBody()});
  return {root,refresh:()=>{if(root.isConnected)refresh()},destroy:()=>{clearInterval(interval);unsubscribe()}};
}
