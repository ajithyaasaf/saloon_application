import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent wires the app into the native runtime for both
// Expo Go and production (EAS) builds.
registerRootComponent(App);

