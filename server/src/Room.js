class Room {
  constructor(name, server) {
    this.name = name;
    this.server = server;

    this.clients = [];

    this.masterClient = null;
    this.masterState = null;
  }

  addClient(client) {
    client.room = this;

    if (this.masterClient == null) {
      client.requestStateBackup();
      this.masterClient = client;
    }

    this.clients.push(client);
    console.log(`Client joined ${this.name}`);
  }

  broadcast(type, payload, excludedClient = null) {
    for (const client of this.clients) {
      if (excludedClient && client === excludedClient) {
        continue;
      }

      client.sendPacket(type, payload);
    }
  }

  onClientClose(client) {
    const clientIndex = this.clients.indexOf(client);
    if (clientIndex > -1) {
      this.clients.splice(clientIndex, 1);
    }

    this.onRemoteActionReceived({
      type: 'CHAT_USER_LEFT',
      payload: { guid: this.guid },
    }, null);

    if (this.masterClient === client) {
      const potentialNextMaster = this.clients[0];
      if (potentialNextMaster == null) {
        console.log(`Closed room ${this.name}`);
        this.server.closeRoom(this.name);
      } else {
        console.log(`Selected new master for ${this.name}`);
        this.masterClient = potentialNextMaster;
        this.masterState = null;

        potentialNextMaster.sendPacket('REQUEST_STATE');
      }
    }
  }

  onStateBackupReceived(state, origin) {
    if (origin === this.masterClient) {
      this.masterState = state;
    }
  }

  onRemoteActionReceived(action, origin) {
    this.broadcast('REMOTE_ACTION', action, origin);
  }

  forwardWebRtcOffer(originGuid, destinationGuid, offer) {
    const destination = this.clients.find(client => client.guid === destinationGuid);
    if (!destination) {
      console.error(`Error: could not find client '${destinationGuid}' in room '${this.name}'`);
      return;
    }

    destination.sendPacket('REMOTE_RTC_OFFER', {
      originGuid,
      offer,
    });
  }

  forwardWebRtcResponse(originGuid, destinationGuid, response) {
    const destination = this.clients.find(client => client.guid === destinationGuid);
    if (!destination) {
      console.error(`Error: could not find client '${destinationGuid}' in room '${this.name}'`);
      return;
    }

    destination.sendPacket('REMOTE_RTC_RESPONSE', {
      originGuid,
      response,
    });
  }

  forwardIceCandidate(originGuid, destinationGuid, candidate) {
    const destination = this.clients.find(client => client.guid === destinationGuid);
    if (!destination) {
      console.error(`Error: could not find client '${destinationGuid}' in room '${this.name}'`);
      return;
    }

    destination.sendPacket('REMOTE_ICE_CANDIDATE', {
      originGuid,
      candidate,
    });
  }
}

module.exports = Room;
