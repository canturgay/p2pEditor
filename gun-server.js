import http from 'http';
import Gun from 'gun';

// Port can be overridden via env
const PORT = process.env.PORT || 8765;

// Basic HTTP server (needed for Gun WS upgrade)
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Gun relay is running');
});

// Initialise Gun with the HTTP server and persistent Radisk storage
Gun({ web: server, radisk: true });

server.listen(PORT, () => {
  console.log(`Gun relay listening on http://localhost:${PORT}/gun`);
});
