import { defineBoot } from '#q-app/wrappers';
import VueGun from 'vue-gun';
import Gun from 'gun/gun';
import SEA from 'gun/sea';
import 'gun/lib/webrtc.js';

// Initialize Gun
const gun = Gun({
  // Add your GUN peers here.
  // Using a public peer as a placeholder.
  peers: ['http://localhost:8765/gun', 'https://gun-manhattan.herokuapp.com/gun'],
  localStorage: false,
  radisk: true,
});

export default defineBoot(({ app }) => {
  // Install vue-gun plugin
  app.use(VueGun, {
    gun,
  });

  // Make gun and SEA available globally in Vue components
  app.config.globalProperties.$gun = gun;
  app.config.globalProperties.$sea = SEA;

  // Debug log on successful authentication
  gun.on('auth', (ack) => {
    console.log('Authentication was successful: ', ack);
  });
});

// Export for use in .js files
export { gun, SEA };
