import"./main-Cn0lQ1oV.js";import{C as v,l as h,d as E,i as $,f as w,s as g,e as I,h as L,a as f,c as A,u as q}from"./storage-DrBN1SDv.js";function k(){return sessionStorage.getItem(v.storageKeys.adminSession)==="true"}function B(e){return/^https?:\/\//i.test(e.trim())}function S(){return`
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="card w-full max-w-md">
        <h1 class="font-title text-3xl text-center text-accent mb-6 tracking-wider">Panel de Gestion</h1>
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-sm text-secondary mb-2" for="password">Contrasena</label>
            <input type="password" id="password" required class="input-field" />
          </div>
          <div id="login-error" class="hidden text-orange text-sm"></div>
          <button type="submit" class="btn-primary w-full">Ingresar</button>
        </form>
      </div>
    </div>`}function C(e){var l;const d=((l=e.identificacionArchivo)==null?void 0:l.trim())??"";return B(d)?`<a href="${d}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-secondary hover:text-accent" title="Ver documento" aria-label="Ver cedula">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
  </a>`:'<span class="text-gray-light text-xs">—</span>'}function P(e){var l;const d=((l=e.categoriaId.split(",")[0])==null?void 0:l.trim())??"";return`
    <tr class="border-b border-secondary/10 hover:bg-secondary/5" data-id="${e.id}">
      <td class="px-3 py-3 text-sm">#${e.numeroPiloto}</td>
      <td class="px-3 py-3 text-sm">${e.nombre} ${e.apellido}</td>
      <td class="px-3 py-3 text-sm hidden md:table-cell">${e.edad} anos</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">${e.categoriaLabel}</td>
      <td class="px-3 py-3 text-sm hidden lg:table-cell">${e.ciudad}</td>
      <td class="px-3 py-3 text-sm hidden xl:table-cell">${e.celular}</td>
      <td class="px-3 py-3 text-sm text-center">${C(e)}</td>
      <td class="px-3 py-3 text-sm">
        <button class="edit-reg text-secondary hover:text-accent mr-2" data-id="${e.id}">Editar</button>
        <button class="delete-reg text-orange hover:text-accent" data-id="${e.id}">Eliminar</button>
      </td>
    </tr>
    <tr class="hidden edit-row bg-primary/40" data-edit-id="${e.id}">
      <td colspan="8" class="px-4 py-4">
        <form class="edit-form grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-id="${e.id}">
          <input type="text" name="nombre" value="${e.nombre}" placeholder="Nombre" class="input-field text-sm" required />
          <input type="text" name="apellido" value="${e.apellido}" placeholder="Apellido" class="input-field text-sm" required />
          <input type="date" name="fechaNacimiento" value="${e.fechaNacimiento}" class="input-field text-sm" required />
          <input type="email" name="email" value="${e.email}" placeholder="Email" class="input-field text-sm" required />
          <input type="tel" name="celular" value="${e.celular}" placeholder="Celular" class="input-field text-sm" required />
          <input type="text" name="ciudad" value="${e.ciudad}" placeholder="Ciudad" class="input-field text-sm" required />
          <input type="text" name="marcaMoto" value="${e.marcaMoto}" placeholder="Marca moto" class="input-field text-sm" required />
          <input type="number" name="numeroPiloto" value="${e.numeroPiloto}" min="4" max="999" class="input-field text-sm" required />
          <select name="categoriaId" class="input-field text-sm" required>
            ${f(e.edad).map(r=>`<option value="${r.id}" ${r.id===d?"selected":""}>${r.label}</option>`).join("")}
          </select>
          <div class="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button type="submit" class="btn-secondary text-sm py-2 px-4">Guardar</button>
            <button type="button" class="cancel-edit btn-outline text-sm py-2 px-4" data-id="${e.id}">Cancelar</button>
          </div>
        </form>
      </td>
    </tr>`}function j(e,d){const l=e.filter(n=>n.active),r=e.map(n=>`<button class="event-tab px-4 py-2 rounded-lg text-sm font-medium transition-all ${n.active?"bg-secondary/20 text-secondary":"bg-primary/60 text-gray-light"}" data-event-id="${n.id}">${n.name}</button>`).join(""),c=e.map(n=>{const m=d.filter(u=>u.eventId===n.id);return`
        <div class="event-panel hidden" data-event-panel="${n.id}">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-title text-2xl text-accent">${n.name}</h3>
            <span class="text-sm text-gray-light">${m.length} inscrito(s)</span>
          </div>
          ${m.length===0?'<p class="text-gray-light py-6 text-center">Sin inscripciones para este evento.</p>':`<div class="overflow-x-auto">
                  <table class="w-full text-left">
                    <thead>
                      <tr class="border-b border-secondary/30 text-secondary text-sm">
                        <th class="px-3 py-2"># Piloto</th>
                        <th class="px-3 py-2">Nombre</th>
                        <th class="px-3 py-2 hidden md:table-cell">Edad</th>
                        <th class="px-3 py-2 hidden lg:table-cell">Categoria</th>
                        <th class="px-3 py-2 hidden lg:table-cell">Ciudad</th>
                        <th class="px-3 py-2 hidden xl:table-cell">Celular</th>
                        <th class="px-3 py-2 text-center">Cedula</th>
                        <th class="px-3 py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>${m.map(u=>P(u)).join("")}</tbody>
                  </table>
                </div>`}
        </div>`}).join("");return`
    <div class="min-h-screen">
      <header class="border-b border-secondary/20 bg-primary/95 px-4 py-4">
        <div class="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="font-title text-3xl text-accent tracking-wider">Panel Minicross 2026</h1>
            <p class="text-sm text-gray-light">Gestion de inscripciones y eventos</p>
          </div>
          <button id="logout-btn" class="btn-outline text-sm py-2 px-4">Cerrar sesion</button>
        </div>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-8 space-y-10">
        <section class="card">
          <h2 class="font-title text-2xl text-secondary mb-4">Datos del campeonato</h2>
          ${$()?`<p class="text-secondary text-sm mb-4 font-semibold">
                  Conectado a Google Sheets en tiempo real. Las inscripciones y cambios se guardan automaticamente.
                </p>`:`<p class="text-gray-light text-sm mb-4">
                  Modo local activo. Configura Google Sheets (ver docs/SETUP-GOOGLE-SHEETS.md) y la URL en src/config.ts.
                </p>`}
          <a href="${v.spreadsheetUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary inline-block">
            Abrir Google Sheet
          </a>
        </section>

        <section class="card">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-title text-2xl text-secondary">Eventos (${l.length} activos)</h2>
            <button id="add-event-btn" class="btn-secondary text-sm py-2 px-4">+ Nuevo evento</button>
          </div>
          <div id="events-admin" class="space-y-3">
            ${e.map(n=>`
              <div class="flex flex-wrap items-center gap-3 rounded-lg border border-secondary/20 bg-primary/40 p-4" data-event-admin="${n.id}">
                <div class="flex-1 min-w-[200px]">
                  <p class="font-semibold">${n.name}</p>
                  <p class="text-sm text-gray-light">${w(n.date)} · ${n.city}</p>
                </div>
                <label class="flex items-center gap-2 text-sm">
                  <input type="checkbox" class="event-active-toggle accent-secondary" data-id="${n.id}" ${n.active?"checked":""} />
                  Activo
                </label>
                <button class="edit-event-btn text-secondary text-sm hover:text-accent" data-id="${n.id}">Editar</button>
                <button class="delete-event-btn text-orange text-sm hover:text-accent" data-id="${n.id}">Eliminar</button>
              </div>`).join("")}
          </div>
          <form id="event-form" class="hidden mt-4 space-y-3 border-t border-secondary/20 pt-4">
            <input type="hidden" id="event-form-id" />
            <div class="grid gap-3 sm:grid-cols-2">
              <input type="text" id="event-name" placeholder="Nombre del evento" class="input-field" required />
              <input type="date" id="event-date" class="input-field" required />
              <input type="text" id="event-location" placeholder="Ubicacion / Pista" class="input-field" required />
              <input type="text" id="event-city" placeholder="Ciudad" class="input-field" required />
            </div>
            <textarea id="event-description" placeholder="Descripcion" class="input-field" rows="2" required></textarea>
            <div class="flex gap-2">
              <button type="submit" class="btn-primary text-sm py-2 px-4">Guardar evento</button>
              <button type="button" id="cancel-event-form" class="btn-outline text-sm py-2 px-4">Cancelar</button>
            </div>
          </form>
        </section>

        <section class="card">
          <h2 class="font-title text-2xl text-secondary mb-4">Inscripciones por evento</h2>
          <div class="flex flex-wrap gap-2 mb-6">${r}</div>
          <div id="registrations-panels">${c}</div>
        </section>
      </main>
    </div>`}async function p(){const e=document.getElementById("app");if(!e)return;const[d,l]=await Promise.all([h(),E()]);e.innerHTML=j(d,l),M(d)}function M(e){var c,n,m,u;(c=document.getElementById("logout-btn"))==null||c.addEventListener("click",()=>{sessionStorage.removeItem(v.storageKeys.adminSession),b()});const d=document.querySelectorAll(".event-panel"),l=document.querySelectorAll(".event-tab");d.length>0&&d[0].classList.remove("hidden"),l.forEach(a=>{a.addEventListener("click",()=>{const i=a.getAttribute("data-event-id");l.forEach(t=>t.classList.remove("ring-2","ring-secondary")),a.classList.add("ring-2","ring-secondary"),d.forEach(t=>{t.classList.toggle("hidden",t.getAttribute("data-event-panel")!==i)})})}),(n=l[0])==null||n.classList.add("ring-2","ring-secondary"),document.querySelectorAll(".event-active-toggle").forEach(a=>{a.addEventListener("change",async i=>{const t=i.target.getAttribute("data-id"),s=e.map(o=>o.id===t?{...o,active:i.target.checked}:o);await g(s)})});const r=document.getElementById("event-form");(m=document.getElementById("add-event-btn"))==null||m.addEventListener("click",()=>{r.classList.remove("hidden"),document.getElementById("event-form-id").value="",r.reset()}),(u=document.getElementById("cancel-event-form"))==null||u.addEventListener("click",()=>{r.classList.add("hidden")}),document.querySelectorAll(".edit-event-btn").forEach(a=>{a.addEventListener("click",()=>{const i=a.getAttribute("data-id"),t=e.find(s=>s.id===i);t&&(r.classList.remove("hidden"),document.getElementById("event-form-id").value=t.id,document.getElementById("event-name").value=t.name,document.getElementById("event-date").value=t.date,document.getElementById("event-location").value=t.location,document.getElementById("event-city").value=t.city,document.getElementById("event-description").value=t.description)})}),document.querySelectorAll(".delete-event-btn").forEach(a=>{a.addEventListener("click",async()=>{const i=a.getAttribute("data-id");confirm("Eliminar este evento? Las inscripciones asociadas permaneceran.")&&(await g(e.filter(t=>t.id!==i)),await p())})}),r==null||r.addEventListener("submit",async a=>{a.preventDefault();const i=document.getElementById("event-form-id").value,t={id:i||I(),name:document.getElementById("event-name").value,date:document.getElementById("event-date").value,location:document.getElementById("event-location").value,city:document.getElementById("event-city").value,description:document.getElementById("event-description").value,active:!0},s=i?e.map(o=>o.id===i?{...o,...t,id:i}:o):[...e,t];await g(s),await p()}),document.querySelectorAll(".edit-reg").forEach(a=>{a.addEventListener("click",()=>{var t;const i=a.getAttribute("data-id");(t=document.querySelector(`[data-edit-id="${i}"]`))==null||t.classList.remove("hidden")})}),document.querySelectorAll(".cancel-edit").forEach(a=>{a.addEventListener("click",()=>{var t;const i=a.getAttribute("data-id");(t=document.querySelector(`[data-edit-id="${i}"]`))==null||t.classList.add("hidden")})}),document.querySelectorAll(".delete-reg").forEach(a=>{a.addEventListener("click",async()=>{const i=a.getAttribute("data-id");confirm("Eliminar esta inscripcion?")&&(await L(i),await p())})}),document.querySelectorAll(".edit-form").forEach(a=>{a.addEventListener("submit",async i=>{i.preventDefault();const t=a.getAttribute("data-id"),s=new FormData(a),o=s.get("categoriaId"),x=f(A(s.get("fechaNacimiento"))).find(y=>y.id===o);try{await q(t,{nombre:s.get("nombre"),apellido:s.get("apellido"),fechaNacimiento:s.get("fechaNacimiento"),email:s.get("email"),celular:s.get("celular"),ciudad:s.get("ciudad"),marcaMoto:s.get("marcaMoto"),numeroPiloto:Number(s.get("numeroPiloto")),categoriaId:o,categoriaLabel:(x==null?void 0:x.label)??o}),await p()}catch(y){alert(y instanceof Error?y.message:"Error al guardar.")}})})}async function b(){var d;const e=document.getElementById("app");if(e){if(!k()){e.innerHTML=S(),(d=document.getElementById("login-form"))==null||d.addEventListener("submit",l=>{l.preventDefault();const r=document.getElementById("password").value,c=document.getElementById("login-error");r===v.adminPassword?(sessionStorage.setItem(v.storageKeys.adminSession,"true"),b()):c&&(c.textContent="Contrasena incorrecta.",c.classList.remove("hidden"))});return}await p()}}b();
