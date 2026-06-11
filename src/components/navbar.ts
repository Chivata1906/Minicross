// Panel admin oculto: panel-minicross-gestion-2026.html

export function renderNavbar(activePage: 'home' | 'eventos' | 'inscripcion' | 'reglamento' = 'home'): string {
  const links = [
    { href: './index.html', label: 'Inicio', key: 'home' },
    { href: './eventos.html', label: 'Eventos', key: 'eventos' },
    { href: './inscripcion.html', label: 'Inscripción', key: 'inscripcion' },
    { href: './reglamento.html', label: 'Reglamento', key: 'reglamento' },
  ];

  const navLinks = links
    .map(
      (link) => `
      <a href="${link.href}"
         class="px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
           activePage === link.key
             ? 'bg-secondary/20 text-secondary shadow-glow'
             : 'text-gray-light hover:text-secondary hover:bg-secondary/10'
         }">
        ${link.label}
      </a>`
    )
    .join('');

  return `
    <nav class="sticky top-0 z-50 border-b border-secondary/20 bg-primary/95 backdrop-blur-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <a href="./index.html" class="flex items-center gap-3">
          <img src="./logo-copa-junior-minicross.png" alt="Logo Copa Junior Minicross 2026" class="h-12 w-12 rounded-lg object-contain md:h-14 md:w-14" />
          <div class="hidden sm:block">
            <p class="font-title text-xl tracking-wider text-accent leading-none">MINICROSS</p>
            <p class="text-xs text-secondary font-medium">2026</p>
          </div>
        </a>
        <div class="hidden md:flex items-center gap-1">${navLinks}</div>
        <button id="mobile-menu-btn" class="md:hidden p-2 text-secondary" aria-label="Menú">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>
      <div id="mobile-menu" class="hidden md:hidden border-t border-secondary/20 px-4 py-3 space-y-1">
        ${navLinks}
      </div>
    </nav>`;
}

export function initNavbar(): void {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  btn?.addEventListener('click', () => menu?.classList.toggle('hidden'));
}
