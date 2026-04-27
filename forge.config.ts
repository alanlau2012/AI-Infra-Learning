import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import os from 'node:os';
import path from 'node:path';

const config: ForgeConfig = {
  outDir: process.env.FORGE_OUT_DIR ?? path.join(os.tmpdir(), 'ai-infra-learning-out'),
  packagerConfig: {
    asar: true,
    extraResource: ['resources/seed_data.json', 'resources/topic-diagrams']
  },
  makers: [
    new MakerSquirrel({
      name: 'ai_infra_learning'
    }),
    new MakerZIP({}, ['win32'])
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
          target: 'main'
        },
        {
          entry: 'src/main/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts'
        }
      ]
    })
  ]
};

export default config;
