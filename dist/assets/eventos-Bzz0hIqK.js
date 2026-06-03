import"./main-Cn0lQ1oV.js";import{r as i,i as n}from"./navbar-7W85b2i_.js";import{l as r,f as l}from"./storage-DrBN1SDv.js";function o(t){return`
    <article class="card group">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div>
          <span class="inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent mb-2">ACTIVO</span>
          <h3 class="font-title text-2xl tracking-wide text-white group-hover:text-secondary transition-colors">${t.name}</h3>
        </div>
        <div class="text-right shrink-0">
          <p class="font-title text-xl text-secondary">${l(t.date)}</p>
        </div>
      </div>
      <p class="text-gray-light mb-2">📍 ${t.location}, ${t.city}</p>
      <p class="text-gray-light/80 mb-6 text-sm leading-relaxed">${t.description}</p>
      <a href="./inscripcion.html?evento=${t.id}" class="btn-primary w-full sm:w-auto">
        Inscribirme en este evento
      </a>
    </article>`}async function c(){const t=document.getElementById("app");if(!t)return;t.innerHTML=`
    ${i("eventos")}
    <main class="mx-auto max-w-7xl px-4 py-12">
      <div class="mb-10 text-center">
        <h1 class="section-title mb-4">Eventos Activos</h1>
        <p class="text-gray-light max-w-2xl mx-auto">
          Consulta las válidas abiertas para inscripción y regístrate directamente desde aquí.
        </p>
      </div>
      <div id="events-list" class="grid gap-6 md:grid-cols-2">
        <div class="col-span-full text-center text-gray-light py-12">Cargando eventos...</div>
      </div>
    </main>
    <footer class="border-t border-secondary/20 bg-dark py-8 mt-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p>Minicross Colombia 2026 · Triple Corona</p>
      </div>
    </footer>
  `,n();const a=(await r()).filter(s=>s.active),e=document.getElementById("events-list");if(e){if(a.length===0){e.innerHTML=`
      <div class="col-span-full card text-center py-12">
        <p class="text-gray-light text-lg mb-4">No hay eventos activos en este momento.</p>
        <p class="text-sm text-gray-light/60">Vuelve pronto o contáctanos para más información.</p>
      </div>`;return}e.innerHTML=a.map(o).join("")}}c();
