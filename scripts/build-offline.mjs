import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = path.join(root, 'public', 'offline');
// Build only the student experience. No editor, NIM adapter, or environment values.
await build({
  root,
  configFile: false,
  envDir: false,
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: false,
    lib: { entry: path.join(root, 'src', 'offline.tsx'), name: 'LessonlineOffline', formats: ['iife'], fileName: () => 'lesson.js', cssFileName: 'lesson' },
    rolldownOptions: { output: { codeSplitting: false } },
  },
});
await mkdir(outDir, { recursive: true });
const notices = ['JSXGraph-LICENSE.MIT', 'React-LICENSE.MIT', 'ReactDOM-LICENSE.MIT'];
const licenses = await Promise.all(notices.map(async name => name + '\n' + await readFile(path.join(root, 'public', name), 'utf8')));
await writeFile(path.join(outDir, 'licenses.txt'), licenses.join('\n\n'), 'utf8');
