import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.czheng1.sentencetrainer',
  appName: '句练',
  webDir: 'dist',
  ios: {
    backgroundColor: '#f7f8f3',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
}

export default config
