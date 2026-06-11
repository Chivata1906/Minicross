const DEVELOPER_LINK = 'https://www.linkedin.com/in/dev-mauricio-sanchez/';

/** Cambiar a `true` para mostrar el crédito del desarrollador en el pie de página. */
const SHOW_DEVELOPER_CREDIT = false;

export function renderFooter(): string {
  const year = new Date().getFullYear();
  const developerCredit = SHOW_DEVELOPER_CREDIT
    ? ` · Developed by <a href="${DEVELOPER_LINK}" target="_blank" rel="noopener noreferrer" class="text-secondary hover:text-accent transition-colors">Mauricio Sánchez Aguilar</a>`
    : '';

  return `
    <footer class="border-t border-secondary/20 py-8 text-center text-sm text-gray-light">
      <p>© ${year} Minicross${developerCredit}</p>
    </footer>`;
}
