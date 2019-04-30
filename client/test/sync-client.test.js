/* eslint-disable prefer-arrow-callback,no-undef,func-names */
// Note: These tests are written using the mocha library, which doesn't allow arrow functions.
//   See https://mochajs.org/#arrow-functions for details

const expect = require('expect');

const { TestableSyncClient } = require('./util/testable-sync-client');
const { SyncClient } = require('../src/sync-client');

describe('SyncClient', function () {
  beforeEach(function () {
    global.WebSocket = expect.createSpy();
    WebSocket.prototype.send = expect.createSpy();
  });

  afterEach(function () {
    delete global.WebSocket;
  });

  describe('#constructor', function () {
    // A 'bare' new is normally banned to prevent side effects, but that's exactly what we want
    //   for these tests.

    /* eslint-disable no-new */

    it('should connect to the specified websocket url', function () {
      new SyncClient({ serverUrl: 'ws://example.com:1337' });

      expect(WebSocket).toHaveBeenCalledWith('ws://example.com:1337');
    });

    it('should default to localhost for testing purposes', function () {
      new SyncClient();

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:9090');
    });

    /* eslint-enable no-new */
  });

  describe('#synchronize', function () {
    it('should attempt to join the specified room once the socket has connected', async function () {
      const client = await createSynchronizedAndConnectedClient({ room: 'pdf-client.job.42' });
      expect(client).toHaveJoinedRoom('pdf-client.job.42');
    });

    it('should default to the global room', async function() {
      const client = await createSynchronizedAndConnectedClient();
      expect(client).toHaveJoinedRoom('global');
    });
  });

  describe('#loadInitialStateFromMaster', function() {
    it('should request a copy of the master client\'s state', function () {
      const client = new TestableSyncClient();

      client.state.loadFromMaster();
      expect(client).toHaveRequestedRemoteState();
    });
  });

  describe('design client api tweaks', function () {
    it('should allow setting the room manually between client construction and calling #synchronize', async function () {
      const client = new TestableSyncClient();
      client.simulateSocketConnected();

      client.state.room = 'design-client.component.42';
      await client.state.synchronize();

      expect(client).toHaveJoinedRoom('design-client.component.42');
    });

    it('should allow setting the store manually between client construction and calling #synchronize', async function () {
      const client = new TestableSyncClient();
      client.simulateSocketConnected();

      client.state.store = { getState: () => 'MOCK_STATE' };
      await client.state.synchronize();

      client.simulateLocalStateRequested();
      expect(client).toHaveSentState('MOCK_STATE');
    });
  });
});

async function createSynchronizedAndConnectedClient(options) {
  const client = new TestableSyncClient(options);
  client.simulateSocketConnected();

  await client.state.synchronize({});

  return client;
}
