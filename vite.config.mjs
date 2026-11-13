import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// 複製靜態腳本與資源至 dist/，確保純原生 <script src="..."> 架構在 Vite Build 下完整運作
function copyStaticGameFilesPlugin() {
  return {
    name: 'copy-static-game-files',
    closeBundle() {
      const rootDir = process.cwd();
      const outDir = path.resolve(rootDir, 'dist');
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const filesToCopy = [
        'pixi.min.js',
        'gsap.min.js',
        'i18n.js',
        'stories_data.js',
        'role_assets_data.js',
        'config.js',
        'logger.js',
        'audio.js',
        'abilities.js',
        'game_setup.js',
        'game.js',
        'ui_modals.js',
        'ui_components.js',
        'tutorial_mode.js',
        'ui.js',
        'modern_board.js',
        'modern_intro.js',
        'style.css',
        'modern.css',
        'classic.html',
        'modern.html',
        'clock-bg.png'
      ];

      for (const file of filesToCopy) {
        const src = path.join(rootDir, file);
        const dest = path.join(outDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }

      const dirsToCopy = ['locales', 'assets', 'SFX'];
      for (const dir of dirsToCopy) {
        const srcDir = path.join(rootDir, dir);
        const destDir = path.join(outDir, dir);
        if (fs.existsSync(srcDir)) {
          fs.cpSync(srcDir, destDir, { recursive: true });
        }
      }
    }
  };
}

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true
  },
  plugins: [copyStaticGameFilesPlugin()]
});
