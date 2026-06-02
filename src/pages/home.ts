import { renderNavbar, initNavbar } from '../components/navbar';

export function initHomePage(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${renderNavbar('home')}

    <section class="relative overflow-hidden dirt-texture">
      <div class="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div class="grid items-center gap-12 md:grid-cols-2">
          <div class="animate-fade-in-up">
            <span class="shield-badge mb-4">Triple Corona · 3 Mangas</span>
            <h1 class="font-title text-5xl leading-tight tracking-wider md:text-7xl">
              CAMPEONATO<br/>
              <span class="text-accent">MINICROSS</span><br/>
              COLOMBIA 2026
            </h1>
            <p class="mt-6 text-lg text-gray-light leading-relaxed">
              Velocidad, energía y competencia off-road. El campeonato que reúne a los mejores
              pilotos juveniles de motocross en categorías desde 50 cc hasta 125 cc Junior.
            </p>
            <div class="mt-8 flex flex-wrap gap-4">
              <a href="./inscripcion.html" class="btn-primary">Inscríbete ahora</a>
              <a href="./eventos.html" class="btn-outline">Ver eventos</a>
            </div>
          </div>
          <div class="flex justify-center animate-fade-in-up">
            <img src="./logo-minicross.jpg" alt="Logo Campeonato Minicross Colombia 2026"
                 class="max-w-sm rounded-2xl shadow-glow-yellow md:max-w-md" />
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-secondary/20 bg-dark/50 py-16">
      <div class="mx-auto max-w-7xl px-4">
        <h2 class="section-title text-center mb-12">¿Qué es el Minicross?</h2>
        <div class="grid gap-8 md:grid-cols-3">
          <div class="card text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 text-3xl">🏍️</div>
            <h3 class="font-title text-2xl tracking-wide text-accent mb-3">Off-Road Extremo</h3>
            <p class="text-gray-light">Motocross en su forma más pura: tierra, saltos y adrenalina en pistas diseñadas para los futuros campeones.</p>
          </div>
          <div class="card text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 text-3xl">🏆</div>
            <h3 class="font-title text-2xl tracking-wide text-accent mb-3">Triple Corona</h3>
            <p class="text-gray-light">Tres mangas decisivas en cada válida. Acumula puntos, demuestra tu talento y compite por el título nacional.</p>
          </div>
          <div class="card text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 text-3xl">⚡</div>
            <h3 class="font-title text-2xl tracking-wide text-accent mb-3">Categorías por Edad</h3>
            <p class="text-gray-light">Desde 50 cc para los más pequeños hasta 125 cc Junior. Cada piloto compite en la categoría acorde a su edad.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-16 dirt-texture">
      <div class="mx-auto max-w-7xl px-4">
        <h2 class="section-title text-center mb-4">Categorías 2026</h2>
        <p class="text-center text-gray-light mb-10 max-w-2xl mx-auto">Compite en la categoría que corresponda a tu edad al momento del evento.</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          ${[
            ['50 cc', '4 – 6 años'],
            ['50 cc', '6 – 8 años'],
            ['65 cc', '7 – 9 años'],
            ['65 cc', '8 – 10 años'],
            ['85 cc', '9 – 11 años'],
            ['85 cc', '11 – 13 años'],
            ['125 cc', 'Junior 12 – 17'],
          ]
            .map(
              ([cc, age]) => `
            <div class="card flex items-center gap-4">
              <span class="font-title text-3xl text-secondary">${cc}</span>
              <span class="text-gray-light font-medium">${age}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>
    </section>

    <section class="border-t border-secondary/20 bg-blue-medium/30 py-16">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h2 class="section-title mb-4">¿Listo para la acción?</h2>
        <p class="text-gray-light mb-8 text-lg">Inscríbete en la próxima válida y forma parte del Campeonato Minicross Colombia 2026.</p>
        <a href="./inscripcion.html" class="btn-primary text-lg px-10 py-4">Registrarme como piloto</a>
      </div>
    </section>

    <footer class="border-t border-secondary/20 bg-dark py-8">
      <div class="mx-auto max-w-7xl px-4 text-center text-sm text-gray-light">
        <p class="font-title text-xl text-accent tracking-wider mb-2">MINICROSS COLOMBIA 2026</p>
        <p>Campeonato Nacional de Motocross Juvenil · Triple Corona</p>
      </div>
    </footer>
  `;

  initNavbar();
}
