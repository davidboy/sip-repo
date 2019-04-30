const WebSocket = require('ws');

const Client = require('./Client');
const Room = require('./Room');

class SyncServer {
  constructor() {
    this.rooms = {};

    this.clients = new Map();
  }

  start(httpServer) {
    this.socket = new WebSocket.Server({ server: httpServer });
    this.socket.on('connection', this.onNewConnection.bind(this));
  }

  onNewConnection(connection) {
    const client = new Client(connection, this);

    this.clients.set(client.guid, client);

    console.log('New client connected');
  }

  broadcastRemoteAction(action) {
    for (const client of this.clients.values()) {
      client.sendPacket('REMOTE_ACTION', action);
    }
  }

  assignClientToRoom(client, roomName) {
    this.getOrCreateRoom(roomName).addClient(client);
  }

  getOrCreateRoom(roomName) {
    if (this.rooms[roomName] == null) {
      console.log(`Creating new room ${roomName}`);
      this.rooms[roomName] = new Room(roomName, this);
    }

    return this.rooms[roomName];
  }

  onClientClose(client) {
    this.clients.delete(client.guid);
  }

  closeRoom(roomName) {
    delete this.rooms[roomName];
  }
}

module.exports = SyncServer;
