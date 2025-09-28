// wsServer.js
const WebSocket = require("ws");

let wss = null;

function startWebSocket(server) {
  wss = new WebSocket.Server({ server });
  console.log("WebSocket pronto para conexões.");
}

function broadcastDronePosition(droneData) {
  if (!wss) return;
  const data = JSON.stringify(droneData);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

module.exports = { startWebSocket, broadcastDronePosition };
