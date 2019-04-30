const EventTarget = require('./util/event-target.js');
const RtcClient = require('./rtc/rtc-client');
const { StateSynchronizer } = require('./state/sync-state');
const { ModuleManager } = require('./modules');

const DEFAULT_SERVER_URL = 'ws://localhost:9090';

class SyncClient extends EventTarget {
  constructor(config = {}) {
    super();

    this.socket = new WebSocket(config.serverUrl || DEFAULT_SERVER_URL);
    this.socket.onmessage = event => this.handleMessage(event.data);

    // Will resolve once a connection has been established to the server.
    this.whenOpen = new Promise((resolve) => { this.socket.onopen = resolve; });

    // An alternative to the connect event.  Will resolve once sync-client is ready to be used.
    this.whenReady = new Promise((resolve) => { this.onReady = resolve; });

    this.modules = new ModuleManager(this, config);
    this.modules.register([RtcClient, StateSynchronizer]);

    Promise.all([this.whenOpen, this.modules.whenLoaded]).then(() => {
      this.onReady();
      this.dispatchEvent({ type: 'connect' });
    });
  }

  sendPacket(type, payload = null) {
    this.socket.send(JSON.stringify({ type, payload }));
  }

  set username(username) {
    this.sendPacket('IDENTIFY', { username });
  }

  async handleMessage(message) {
    const packet = JSON.parse(message);

    // TODO: ping/pong

    // eslint-disable-next-line default-case
    switch (packet.type) {
      case 'IDENTITY':
        this.identityGuid = packet.payload.guid;
        break;
    }

    this.modules.onPacketReceived(packet);
  }
}

module.exports = { SyncClient };
