const guid = require('uuid/v4');
const WebSocket = require('ws');

const IceServerManager = require('./IceServerManager');

const MESSAGE_HANDLERS = {
  JOIN_ROOM: 'onRoomJoinRequested',
  IDENTIFY: 'onUsernameSet',
  SET_STATE: 'onStateBackupReceived',
  REQUEST_STATE: 'onStateRequested',
  SEND_ACTION: 'onRemoteActionReceived',
  RTC_OFFER: 'onRtcRequestReceived',
  RTC_RESPONSE: 'onRtcResponseReceived',
  ICE_CANDIDATE: 'onIceCandidateReceived',
  REQUEST_ICE_SERVERS: 'onIceServersRequested',
};

const iceManager = new IceServerManager({ debugHandler: console.log });

class Client {
  constructor(connection, server) {
    this.connection = connection;
    this.server = server;

    this.onceInRoomCallbacks = [];

    this.room = null;
    this.username = null;
    this.guid = guid();
    this.sendPacket('IDENTITY', { guid: this.guid });

    this.connection.on('message', this.onMessageReceived.bind(this));
    this.connection.on('close', this.onConnectionClose.bind(this));

    this.sendHeartbeat = this.sendHeartbeat.bind(this);
    setInterval(this.sendHeartbeat, 1000);
  }

  sendHeartbeat() {
    if (this.room && this.connection.readyState === WebSocket.OPEN) {
      this.sendPacket('HEARTBEAT', { isMaster: this.isMaster });
    }
  }

  sendPacket(type, payload) {
    this.connection.send(JSON.stringify({ type, payload }));
  }

  requestStateBackup() {
    this.sendPacket('REQUEST_STATE');
  }

  async onIceServersRequested() {
    const iceServers = await iceManager.getLatestDescription();

    console.log(`Sending ICE server information to ${this.guid}`);
    this.sendPacket('ICE_SERVERS', { iceServers });
  }

  onMessageReceived(message) {
    const { type, payload } = JSON.parse(message);
    const handlerName = MESSAGE_HANDLERS[type];

    if (handlerName != null) {
      this[handlerName].call(this, payload);
    }
  }

  onConnectionClose() {
    clearInterval(this.onConnectionClose);

    if (this.room) {
      console.log(`Client left ${this.room.name} and closed connection`);

      this.room.onClientClose(this);

      this.room.onRemoteActionReceived({
        type: 'CHAT_USER_LEFT',
        payload: { guid: this.guid },
      }, null);

      this.room.onRemoteActionReceived({
        type: 'CHAT_MESSAGE_POSTED',
        payload: {
          authorGuid: this.guid,
          username: this.username,
          message: '/leave',
          channel: 'local',
          timestamp: new Date().getTime(),
        },
      }, null);
    } else {
      console.log('Client closed connection');
    }

    this.server.onClientClose(this);
  }

  onRoomJoinRequested(roomName) {
    this.server.assignClientToRoom(this, roomName);

    this.sendPacket('JOIN_SUCCESSFUL', {
      isMaster: this.isMaster,
    });

    for (const callback of this.onceInRoomCallbacks) {
      callback();
    }
  }

  onUsernameSet({ username }) {
    this.onceInRoom(() => {
      this.room.onRemoteActionReceived({
        type: 'CHAT_USER_JOINED',
        payload: {
          guid: this.guid,
          username,
        },
      }, null);

      this.room.onRemoteActionReceived({
        type: 'CHAT_MESSAGE_POSTED',
        payload: {
          authorGuid: this.guid,
          username,
          message: '/join',
          channel: 'local',
          timestamp: new Date().getTime(),
        },
      }, null);
    });

    this.username = username;
  }

  onceInRoom(callback) {
    if (this.room) {
      callback();
    } else {
      this.onceInRoomCallbacks.push(callback);
    }
  }

  onStateBackupReceived(state) {
    if (this.room == null) {
      return;
    }

    this.room.onStateBackupReceived(state, this);
  }

  onStateRequested() {
    if (this.room == null) {
      return;
    }

    const masterState = this.room.masterState;

    if (masterState != null) {
      this.sendPacket('SET_STATE', this.room.masterState);
    }
  }

  onRemoteActionReceived(remoteAction) {
    if (this.room == null) {
      return;
    }

    console.log(JSON.stringify(remoteAction));

    this.room.onRemoteActionReceived(remoteAction, this);
  }

  // eslint-disable-next-line
  onRtcRequestReceived({ offer, targetGuid }) {
    this.room.forwardWebRtcOffer(this.guid, targetGuid, offer);
  }

  onRtcResponseReceived({ response, targetGuid }) {
    this.room.forwardWebRtcResponse(this.guid, targetGuid, response);
  }

  onIceCandidateReceived({ candidate, targetGuid }) {
    this.room.forwardIceCandidate(this.guid, targetGuid, candidate);
  }

  get isMaster() {
    return this.room != null && this.room.masterClient === this;
  }
}

module.exports = Client;
