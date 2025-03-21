import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'path';
import fs from 'fs';

// Determine platform-specific paths
const platform = process.platform;
const pythonExecutablesPath = path.join(__dirname, 'packaged_python', platform);

// Get list of Python executable resources to include
const pythonExecutables = fs.existsSync(pythonExecutablesPath) 
  ? fs.readdirSync(pythonExecutablesPath).map(file => path.join(pythonExecutablesPath, file))
  : [];

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "*.{node,py,so,dll,dylib,exe}"  // Unpack native modules and Python files
    },
    extraResource: [
      "./python",  // Include Python scripts for reference/development
      './packaged_python',  // Include packaged Python executables
      "./node_modules/electron-squirrel-startup",
      './dist',
      // Make sure ffmpeg is bundled correctly for each platform
      ...(process.platform === 'win32' ? ["./ffmpeg/ffmpeg.exe"] :
        process.platform === 'darwin' ? ["./ffmpeg/ffmpeg-mac"] :
          ["./ffmpeg/ffmpeg-linux"])
    ],
  },
  rebuildConfig: {},
  makers: [new MakerSquirrel({}), new MakerZIP({}, ['darwin']), new MakerRpm({}), new MakerDeb({})],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
