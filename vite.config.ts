import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        eventos: resolve(__dirname, 'eventos.html'),
        inscripcion: resolve(__dirname, 'inscripcion.html'),
        reglamento: resolve(__dirname, 'reglamento.html'),
        admin: resolve(__dirname, 'panel-minicross-gestion-2026.html'),
        resultados: resolve(__dirname, 'resultados.html'),
      },
    },
  },
});
