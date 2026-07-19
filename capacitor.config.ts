import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.sebartv',
  appName: 'Sebar Tv',
  webDir: 'dist',
  server: {
    url: 'https://cuddle-spark-maker.lovable.app',
    cleartext: true,
  },
  android: {
    backgroundColor: '#000000',
  },
};

export default config;
