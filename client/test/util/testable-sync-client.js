const expect = require('expect');

const assert = require('expect/lib/assert').default;
const { isEqual } = require('expect/lib/TestUtils');

const { SyncClient } = require('../../src/sync-client');

class TestableSyncClient extends SyncClient {
  static setUp() {
    global.WebSocket = expect.createSpy();
    global.WebSocket.prototype.send = expect.createSpy();
  }

  static tearDown() {
    delete global.WebSocket;
  }

  simulateServerMessage(type, payload) {
    this.socket.onmessage({
      data: JSON.stringify({
        type, payload,
      }),
    });
  }

  simulateSocketConnected() {
    this.socket.onopen();
  }

  simulateJoinedRoomEvent(isMaster = false) {
    this.simulateServerMessage('JOIN_SUCCESSFUL', { isMaster });
  }

  simulateHeartbeatReceived(isMaster) {
    this.simulateServerMessage('HEARTBEAT', { isMaster });
  }

  simulateRemoteActionReceived(action) {
    this.simulateServerMessage('REMOTE_ACTION', action);
  }

  simulateLocalStateRequested() {
    this.simulateServerMessage('REQUEST_STATE');
  }

  simulateRemoteStateReceived(newState) {
    this.simulateServerMessage('SET_STATE', newState);
  }
}

function createFakeStore(state) {
  return {
    getState: () => state,
  };
}

async function createTestableClient(options = {}) {
  const client = new TestableSyncClient(options.options);

  if (!options.disconnected) {
    client.simulateSocketConnected();
  }

  if (options.asMaster) {
    client.state.isMaster = true;
  }

  if (options.store) {
    await client.state.synchronize(options.store);
  } else if (options.state) {
    await client.state.synchronize(createFakeStore(options.state));
  }

  if (options.ready) {
    if (!options.room) {
      client.simulateJoinedRoomEvent();
    }

    await client.whenReady;
  }

  return client;
}

module.exports = {
  TestableSyncClient,
  createTestableClient,
};

expect.extend({
  toHaveSentPacket(type, payload) {
    const client = this.actual;

    assert(
      client instanceof TestableSyncClient,
      'The "client" argument in expect(client).ToHaveSentPacket() must be a TestableSyncClient'
    );

    assert(
      WebSocket.prototype.send.calls.some(call => isEqual(JSON.parse(call.arguments[0]).type, type)),
      'client did not send %s packet',
      type
    );

    if (payload !== undefined) {
      const expectedMessage = JSON.stringify({ type, payload });
      assert(
        WebSocket.prototype.send.calls.some(call => isEqual(call.arguments[0], expectedMessage)),
        'client did not send packet %s with payload %s',
        type,
        payload
      );
    }
  },

  toNotHaveSentPacket(type, payload) {
    const client = this.actual;

    assert(
      client instanceof TestableSyncClient,
      'The "client" argument in expect(client).ToHaveSentPacket() must be a TestableSyncClient'
    );

    assert(
      !WebSocket.prototype.send.calls.some(call => isEqual(JSON.parse(call.arguments[0]).type, type)),
      'client sent %s packet',
      type
    );

    if (payload !== undefined) {
      const expectedMessage = JSON.stringify({ type, payload });
      assert(
        !WebSocket.prototype.send.calls.some(call => isEqual(call.arguments[0], expectedMessage)),
        'client sent packet %s with incorrect payload %s',
        type,
        payload
      );
    }
  },

  toHaveReportedLocalAction(action) {
    expect(this.actual).toHaveSentPacket('SEND_ACTION', action);
  },

  toNotHaveReportedLocalAction(action) {
    expect(this.actual).toNotHaveSentPacket('SEND_ACTION', action);
  },

  toHaveSentState(localState) {
    expect(this.actual).toHaveSentPacket('SET_STATE', localState);
  },

  toNotHaveSentState() {
    expect(this.actual).toNotHaveSentPacket('SET_STATE');
  },

  toHaveJoinedRoom(roomName) {
    expect(this.actual).toHaveSentPacket('JOIN_ROOM', roomName);
  },

  toHaveRequestedRemoteState() {
    expect(this.actual).toHaveSentPacket('REQUEST_STATE');
  },
});
