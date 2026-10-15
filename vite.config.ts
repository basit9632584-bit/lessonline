import { defineConfig, loadEnv } from 'vite';
import { createNimMiddleware, DEFAULT_MODEL } from './server/nim.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'NVIDIA_');
  const middleware = createNimMiddleware({
    apiKey: process.env.NVIDIA_API_KEY || env.NVIDIA_API_KEY || '',
    model: process.env.NVIDIA_NIM_MODEL || env.NVIDIA_NIM_MODEL || DEFAULT_MODEL,
  });
  return {
    plugins: [{
      name: 'local-nvidia-explanation',
      configureServer(server) { server.middlewares.use(middleware); },
      configurePreviewServer(server) { server.middlewares.use(middleware); },
    }],
  };
});
