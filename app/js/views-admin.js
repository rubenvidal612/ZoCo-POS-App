// Panel de super-admin (solo para el dueño del sistema)
import { el, money, esc, toast } from './ui.js';
import { adminCompanies, adminSetPlan, amISuperadmin, isCloudLogged, cloudUser } from './auth.js';
import { sbReady } from './sync.js';

export function adminView() {
  const root = el(`<div id="admin"></div>`);
  let rows = [];
  let loading = true;
  let error = '';
  let isSuper = false;

  async function load() {
    loading = true;
    paint();
    error = '';
    try {
      if (!sbReady()) { error = 'Configura Supabase en Configuración → Nube para usar el panel.'; rows = []; }
      else if (!isCloudLogged()) { error = 'Entra con tu cuenta en la nube (botón ☁ en el login).'; rows = []; }
      else {
        isSuper = await amISuperadmin();
        if (!isSuper) { error = 'Tu cuenta no es super-admin. Agrega tu usuario en la tabla superadmins.'; rows = []; }
        else rows = await adminCompanies();
      }
    } catch (e) { error = e.message || String(e); }
    loading = false;
    paint();
  }

  function paint() {
    const totalEstado = rows.reduce((a, r) => a + Number(r.tamano || 0), 0);
    root.innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="l">Empresas</div><div class="v">${rows.length}</div><div class="s">registradas</div></div>
        <div class="kpi"><div class="l">Usuarios</div><div class="v">${rows.reduce((a, r) => a + Number(r.usuarios || 0), 0)}</div><div class="s">miembros</div></div>
        <div class="kpi"><div class="l">Datos en nube</div><div class="v">${(totalEstado / 1024 / 1024).toFixed(2)} MB</div><div class="s">de 500 MB gratis</div></div>
        <div class="kpi"><div class="l">Cuenta</div><div class="v" style="font-size:14px">${esc(cloudUser()?.email || '—')}</div><div class="s">${isSuper ? 'super-admin ✓' : 'sin permiso'}</div></div>
      </div>

      <div class="panel" style="margin-top:14px">
        <div class="panel-head"><h2>Empresas</h2>
          <div class="sp"></div>
          <button class="btn ghost sm" id="ad-refresh">⟳ Actualizar</button>
        </div>
        ${error ? `<div style="padding:18px;color:var(--danger);font-size:13px">${esc(error)}</div>` : `
        <div style="overflow:auto"><table>
          <thead><tr><th>Empresa</th><th>Plan</th><th>Usuarios</th><th>Rev</th><th>Datos</th><th>Actualizado</th><th></th></tr></thead>
          <tbody>${loading ? '<tr><td colspan="7"><div class="cart-empty">Cargando…</div></td></tr>'
            : rows.length ? rows.map((r) => `
              <tr>
                <td class="t-strong">${esc(r.name || r.id)}<div style="font-size:11px;color:var(--muted)">${esc(r.id)}</div></td>
                <td>
                  <select data-sel="${esc(r.id)}" style="height:30px;border:1px solid var(--line);border-radius:8px;font-size:12px">
                    ${['esencial', 'pro', 'empresarial', 'suspended'].map((pl) => `<option value="${pl}" ${(r.plan || 'pro') === pl ? 'selected' : ''}>${pl}</option>`).join('')}
                  </select>
                </td>
                <td>${r.usuarios}</td>
                <td class="mono">${r.rev}</td>
                <td class="mono">${((Number(r.tamano) || 0) / 1024).toFixed(0)} KB</td>
                <td>${r.updated_at ? new Date(r.updated_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                <td style="white-space:nowrap">
                  <button class="btn ghost sm" data-plan-save="${esc(r.id)}">Guardar</button>
                </td>
              </tr>`).join('')
            : '<tr><td colspan="7"><div class="cart-empty">Aún no hay empresas.</div></td></tr>'}</tbody>
        </table></div>`}
      </div>`;

    root.querySelector('#ad-refresh').onclick = load;
    root.querySelectorAll('[data-plan-save]').forEach((b) => b.onclick = async () => {
      const id = b.dataset.planSave;
      const sel = root.querySelector(`[data-sel="${id}"]`);
      const plan = sel ? sel.value : 'pro';
      await adminSetPlan(id, plan);
      toast('Plan de la empresa: ' + plan);
      load();
    });
  }

  load();
  return { root, refresh: load };
}
