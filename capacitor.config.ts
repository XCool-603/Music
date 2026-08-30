import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.muse.audio',
  appName: 'MUSE.AUDIO',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      releaseType: 'APK',
    },
    allowMixedContent: true,
    backgroundColor: '#0a0a0f',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0a0a0f',
      showSpinner: true,
      spinnerColor: '#6366f1',
    },
  },
};

export default config;
