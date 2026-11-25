// ZoCo Beauty: solicitudes públicas y agenda privada.
// La service role solo vive en el servidor, nunca se entrega al navegador.
export const config = { runtime: 'edge' };
const env = key => typeof process === 'undefined' ? '' : (process.env?.[key] || (key === 'SUPABASE_URL' ? process.env?.NEXT_PUBLIC_SUPABASE_URL : '') || '');
const response = (data, status = 200) => new Response(JSON.stringify(data), {status,headers:{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
}});
const clean = (x,n=100) => String(x??'').trim().slice(0,n);
const baseUrl=()=>clean(env('SUPABASE_URL')).replace(/\/+$/,'');
const svc=()=>env('SUPABASE_SERVICE_ROLE_KEY');
function supa(path,opts={}) {
  return fetch(baseUrl()+'/rest/v1/'+path,{...opts,headers:{
    apikey:svc(),Authorization:'Bearer '+svc(),'Content-Type':'application/json',...opts.headers,
  },cache:'no-store'});
}
function isValidTime(s) {const date=new Date(s);return !Number.isNaN(date.valueOf())&&date.getTime()>Date.now()+5*60000&&date.getTime()<Date.now()+90*86400000}
function withinHours(start,end,hours) {
  // La zona por defecto del negocio es México central; los comercios podrán personalizarla más adelante.
  const local=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Mexico_City',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const begin=local.format(start),finish=local.format(end);
  return begin>=hours.start && finish<=hours.end && hours.start<hours.end;
}

const sameTime=(start,duration)=>new Date(new Date(start).getTime()+duration*60000);
function overlap(row,start,end) {return new Date(row.start_at)<end && new Date(row.end_at)>start}
function commissionFor(data,service,professionalId) {
  const p=(data?.products||[]).find(x=>x?.id===service.id);
  const override=p?.beautyCommissionOverrides?.[professionalId];
  if(override&&['pct','fixed'].includes(override.type)&&Number.isFinite(Number(override.value))&&Number(override.value)>=0){
    return {type:override.type,value:override.type==='pct'?Math.min(100,Number(override.value)):Number(override.value)};
  }
  return {type:service.commissionType,value:service.commissionValue};
}
function cfgFor(data) {
  const beauty=['barberia','salon','peluqueria'].includes(data?.company?.mode);
  const active=beauty && data?.settings?.beautyBookingEnabled === true;
  const start=/^([01]\d|2[0-3]):[0-5]\d$/.test(data?.settings?.beautyStartHour||'')?data.settings.beautyStartHour:'09:00';
  const end=/^([01]\d|2[0-3]):[0-5]\d$/.test(data?.settings?.beautyEndHour||'')?data.settings.beautyEndHour:'20:00';
  const services=(data?.products||[]).filter(p=>p?.section==='servicios'&&p.active!==false&&Number(p.price)>0).map(p=>({
    id:clean(p.id,100),name:clean(p.name,100),price:Number(p.price),
    minutes:Math.min(480,Math.max(15,Number(p.bookingMinutes)||30)),
    commissionType:p.beautyCommissionType==='fixed'?'fixed':'pct',
    commissionValue:Math.max(0,Number(p.beautyCommissionValue)||0),
  }));
  const staff=(data?.users||[]).filter(u=>u.active!==false && u.beautyProfessional===true).map(u=>({
    id:clean(u.id,100),name:clean(u.name,70),
  }));
  return {active,hours:{start,end},services,staff,branches:(data.branches||[]).map(b=>({id:clean(b.id,100),name:clean(b.name,100)}))};
}
async function companyData(company) {
  const r=await supa('company_state?company_id=eq.'+encodeURIComponent(company)+'&select=data&limit=1');
  if(!r.ok)throw new Error('No se pudo acceder a la información de la empresa');
  const rows=await r.json();return rows?.[0]?.data||null;
}
async function authorize(req,company) {
  const jwt=clean((req.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),5000);
  if(!jwt)return false;
  const auth=await fetch(baseUrl()+'/auth/v1/user',{headers:{apikey:svc(),Authorization:'Bearer '+jwt}});
  if(!auth.ok)return false;
  const user=await auth.json();
  if(!user?.id)return false;
  const member=await supa('members?company_id=eq.'+encodeURIComponent(company)+'&user_id=eq.'+encodeURIComponent(user.id)+'&select=role&limit=1');
  if(!member.ok)return false;
  const rows=await member.json();
  return rows?.[0] && ['owner','admin','cashier','account','stock'].includes(String(rows[0].role||'').toLowerCase());
}
async function appointments(company,from,to) {
  const q='beauty_appointments?company_id=eq.'+encodeURIComponent(company)+
  '&start_at=gte.'+encodeURIComponent(from)+'&start_at=lt.'+encodeURIComponent(to)+
  '&select=*&order=start_at.asc&limit=500';
  const r=await supa(q);if(!r.ok)throw new Error('No se pudo consultar la agenda');
  return r.json();
}
function publicList(data,booked) {
  return {ok:true,business:clean(data.company?.name||'ZoCo Beauty',90),...((p)=>{
    return {hours:p.hours,services:p.services.map(({id,name,price,minutes})=>({id,name,price,minutes})),
    professionals:p.staff,branches:p.branches,
    busy:booked.filter(b=>['requested','confirmed'].includes(b.status)).map(b=>({professionalId:b.professional_id,branchId:b.branch_id,start:b.start_at,end:b.end_at}))}
  })(cfgFor(data))};
}
export default async function handler(req) {
  if(!['GET','POST','PATCH'].includes(req.method))return response({ok:false,error:'Método no permitido'},405);
  if(!baseUrl()||!svc())return response({ok:false,error:'Reservas no configuradas en el servidor'},503);
  const url=new URL(req.url),company=clean(url.searchParams.get('c'),100),mode=clean(url.searchParams.get('mode'),30);
  if(!/^[a-zA-Z0-9_-]{2,100}$/.test(company))return response({ok:false,error:'Empresa no válida'},400);
  try {
    if(req.method==='GET'&&mode==='public') {
      const data=await companyData(company);
      if(!data||!cfgFor(data).active)return response({ok:false,error:'La agenda online no está habilitada'},404);
      const from=new Date(Date.now()-86400000).toISOString(),to=new Date(Date.now()+90*86400000).toISOString();
      return response(publicList(data,await appointments(company,from,to)));
    }
    if(req.method==='POST'&&mode==='public') {
      // Lectura limitada y validación estricta; no expone datos privados.
      const payload=await req.json().catch(()=>({}));
      if(JSON.stringify(payload).length>3000)return response({ok:false,error:'Solicitud demasiado larga'},413);
      const data=await companyData(company);
      if(!data)return response({ok:false,error:'Empresa no encontrada'},404);
      const cfg=cfgFor(data);
      if(!cfg.active)return response({ok:false,error:'Las reservas online no están habilitadas'},403);
      const service=cfg.services.find(s=>s.id===clean(payload.serviceId,100));
      const pro=cfg.staff.find(s=>s.id===clean(payload.professionalId,100));
      const branch=cfg.branches.find(s=>s.id===clean(payload.branchId,100));
      const name=clean(payload.name,90),phone=clean(payload.phone,20),notes=clean(payload.notes,300);
      const start=new Date(payload.start),end=service?sameTime(start,service.minutes):null;
      if(!service||!pro||!branch)return response({ok:false,error:'Servicio, profesional o sucursal no válido'},400);
      if(!isValidTime(payload.start)||!name||!/^[+0-9\s()-]{8,20}$/.test(phone))
        return response({ok:false,error:'Revisa nombre, teléfono, fecha y hora'},400);
      if(start.getMinutes()%15!==0)return response({ok:false,error:'El horario debe ser cada 15 minutos'},400);
      if(!withinHours(start,end,cfg.hours))return response({ok:false,error:'El horario está fuera de la jornada del negocio'},400);
      const dayStart=new Date(start.getTime()-86400000).toISOString(),dayEnd=new Date(end.getTime()+86400000).toISOString();
      const booked=await appointments(company,dayStart,dayEnd);
      if(booked.some(b=>b.branch_id===branch.id&&b.professional_id===pro.id&&b.status!=='cancelled'&&overlap(b,start,end)))
        return response({ok:false,error:'Ese profesional ya tiene una cita a esa hora'},409);
      const com=commissionFor(data,service,pro.id);
      const record={company_id:company,branch_id:branch.id,professional_id:pro.id,professional_name:pro.name,
        service_id:service.id,service_name:service.name,price:service.price,
        commission_type:com.type,commission_value:com.value,
        duration_minutes:service.minutes,start_at:start.toISOString(),end_at:end.toISOString(),
        customer_name:name,customer_phone:phone,notes,status:'requested',source:'web'};
      const insert=await supa('beauty_appointments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(record)});
      if(!insert.ok){const error=await insert.text();return response({ok:false,error:/23P01|exclusion/i.test(error)?'El horario acaba de ocuparse. Elige otro.':'No se pudo guardar la solicitud'},/23P01|exclusion/i.test(error)?409:502)}
      return response({ok:true,message:'Solicitud enviada. El negocio debe confirmar tu cita.',id:(await insert.json())?.[0]?.id},201);
    }
    const authed=await authorize(req,company);
    if(!authed)return response({ok:false,error:'Sesión sin permiso para ver o administrar las citas'},403);
    if(req.method==='GET') {
      const from=clean(url.searchParams.get('from'),40)||new Date(Date.now()-30*86400000).toISOString();
      const to=clean(url.searchParams.get('to'),40)||new Date(Date.now()+90*86400000).toISOString();
      return response({ok:true,appointments:await appointments(company,from,to)});
    }
    if(req.method==='POST') {
      const b=await req.json().catch(()=>({}));
      const data=await companyData(company),cfg=cfgFor(data||{});
      const service=cfg.services.find(s=>s.id===clean(b.serviceId));
      const pro=cfg.staff.find(s=>s.id===clean(b.professionalId));
      const branch=cfg.branches.find(s=>s.id===clean(b.branchId));
      if(!service||!pro||!branch||!isValidTime(b.start))return response({ok:false,error:'Selecciona una fecha futura, profesional y servicio válidos'},400);
      const start=new Date(b.start),end=sameTime(start,service.minutes);
      if(!withinHours(start,end,cfg.hours))return response({ok:false,error:'Horario fuera de la jornada configurada'},400);
      const existing=await appointments(company,new Date(start.getTime()-86400000).toISOString(),new Date(end.getTime()+86400000).toISOString());
      if(existing.some(x=>x.professional_id===pro.id&&x.branch_id===branch.id&&x.status!=='cancelled'&&overlap(x,start,end)))return response({ok:false,error:'Horario ocupado'},409);
      const name=clean(b.name,90),phone=clean(b.phone,20);
      if(!name||!/^[+0-9\s()-]{8,20}$/.test(phone))return response({ok:false,error:'Nombre o teléfono no válido'},400);
      const com=commissionFor(data,service,pro.id);
      const record={company_id:company,branch_id:branch.id,professional_id:pro.id,professional_name:pro.name,
        service_id:service.id,service_name:service.name,price:service.price,commission_type:com.type,commission_value:com.value,
        duration_minutes:service.minutes,start_at:start.toISOString(),end_at:end.toISOString(),
        customer_name:name,customer_phone:phone,notes:clean(b.notes,300),source:'staff',status:'confirmed'};
      const insert=await supa('beauty_appointments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(record)});
      if(!insert.ok){const error=await insert.text();return response({ok:false,error:/23P01|exclusion/i.test(error)?'Horario ocupado':'No se pudo crear cita'},/23P01|exclusion/i.test(error)?409:502)}
      return response({ok:true,appointment:(await insert.json())?.[0]},201);
    }
    if(req.method==='PATCH') {
      const b=await req.json().catch(()=>({})),id=clean(b.id,100),status=clean(b.status,20);
      if(!/^[a-f0-9-]{36}$/i.test(id)||!['confirmed','cancelled','completed'].includes(status))return response({ok:false,error:'Cambio no válido'},400);
      const row=await supa('beauty_appointments?company_id=eq.'+encodeURIComponent(company)+'&id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');
      const existing=(await row.json())?.[0];
      if(!existing)return response({ok:false,error:'Cita no encontrada'},404);
      const allowed={requested:['confirmed','cancelled'],confirmed:['completed','cancelled'],completed:[],cancelled:[]};
      if(!allowed[existing.status]?.includes(status))return response({ok:false,error:'Esta cita ya no permite ese cambio'},409);
      if(status==='confirmed') {
        const conflict=(await appointments(company,new Date(new Date(existing.start_at).getTime()-86400000).toISOString(),
          new Date(new Date(existing.end_at).getTime()+86400000).toISOString()))
          .some(x=>x.id!==id && x.status==='confirmed'&&x.branch_id===existing.branch_id&&x.professional_id===existing.professional_id&&overlap(x,new Date(existing.start_at),new Date(existing.end_at)));
        if(conflict)return response({ok:false,error:'Ese horario está ocupado'},409);
      }
      const upd=await supa('beauty_appointments?company_id=eq.'+encodeURIComponent(company)+'&id=eq.'+encodeURIComponent(id),
        {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
      if(!upd.ok)return response({ok:false,error:'No fue posible actualizar la cita'},502);
      return response({ok:true,appointment:(await upd.json())?.[0]});
    }
    return response({ok:false,error:'Acción no disponible'},400);
  } catch(err) {return response({ok:false,error:'No se pudo procesar la solicitud'},500)}
}
