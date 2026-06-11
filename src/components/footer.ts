const DEVELOPER_LINK = 'https://www.linkedin.com/in/dev-mauricio-sanchez/';

export function renderFooter(): string {
  const year = new Date().getFullYear();
  return `
    <footer class="border-t border-secondary/20 py-8 text-center text-sm text-gray-light">
      <p>© ${year} Minicross · Developed by <a href="${DEVELOPER_LINK}" target="_blank" rel="noopener noreferrer" class="text-secondary hover:text-accent transition-colors">Mauricio Sánchez Aguilar</a></p>
    </footer>`;
}
