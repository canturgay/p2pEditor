import { defineBoot } from '#q-app/wrappers';
import VueGun from 'vue-gun';
import Gun from 'gun/gun';
import SEA from 'gun/sea';
import 'gun/lib/webrtc.js';

// Default peer list, reused for reconnect attempts
const DEFAULT_PEERS = ['http://localhost:8765/gun', 'https://gun-manhattan.herokuapp.com/gun'];

// Initialize Gun with default peers
const gun = Gun({
  peers: DEFAULT_PEERS,
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

// export for console use
window.gun = gun;

// Helper: attempt to (re)connect to default peers.
window.restoreGunConnections = function restoreGunConnections() {
  const existingPeers = gun._.opt.peers || {};
  DEFAULT_PEERS.forEach((url) => {
    if (!existingPeers[url]) {
      gun.opt({ peers: [url] });
    }
  });
  console.info('[GUN] Reconnection attempt triggered.');
};

// DEV-only helper: drop all peer connections & stop further attempts.
// Usage: `blockGunConnections()` from the browser console.
window.blockGunConnections = function blockGunConnections() {
  // Close any existing WebSocket connections
  const peers = gun._.opt.peers || {};
  Object.values(peers).forEach((peer) => {
    if (peer && peer.wire && peer.wire.close) {
      try {
        peer.wire.close();
      } catch (err) {
        console.warn('[GUN] Error while closing peer wire', err);
      }
    }
  });

  // Remove peers so that the mesh layer no longer has anything to connect to
  gun._.opt.peers = {};
  console.info('[GUN] All peer connections have been blocked.');
};

// Auto-reconnect when the browser regains network connectivity
window.addEventListener('online', () => {
  window.restoreGunConnections();
});

// Export for use in .js files
export { gun, SEA };
