/* eslint-disable prefer-arrow-callback,no-undef,func-names */
// Note: These tests are written using the mocha library, which doesn't allow arrow functions.
//   See https://mochajs.org/#arrow-functions for details

const expect = require('expect');

require('./util/object-similarity-expectations');

const { TestableSyncClient, createTestableClient } = require('./util/testable-sync-client');

const FAKE_STATE = {
  message: 'HELLO_WORLD',
  interestingNumbers: [42, 1337, 0xDEADBEEF],
};

describe('Server events: ', function () {
  beforeEach(function () {
    TestableSyncClient.setUp();
  });

  afterEach(function () {
    TestableSyncClient.tearDown();
  });

  describe('HEARTBEAT', function () {
    it('should be able to notify the client that it is now the master', async function () {
      const client = await createTestableClient({ room: 'a-room' });

      client.simulateHeartbeatReceived(true);
      expect(client.state.isMaster).toBe(true);
    });

    it('should be able to notify the client that it is no longer the master', async function () {
      const client = await createTestableClient({ room: 'a-room', asMaster: true });

      client.simulateHeartbeatReceived(false);
      expect(client.state.isMaster).toBe(false);
    });
  });

  describe('JOIN_SUCCESSFUL', function () {
    beforeEach(async function () {
      this.client = await createTestableClient();
    });

    it('should cause the client to dispatch the connect event', function (done) {
      this.client.on('connect', () => done());
      this.client.simulateJoinedRoomEvent();
    });

    it('should inform the client if it is the master', async function () {
      this.client.simulateJoinedRoomEvent(true);

      expect(this.client.state.isMaster).toBe(true);
    });

    it('should inform the client if it is not the master', async function () {
      this.client.simulateJoinedRoomEvent(false);

      expect(this.client.state.isMaster).toBe(false);
    });
  });

  describe('REMOTE_ACTION', function () {
    beforeEach(async function () {
      this.store = {
        dispatch: expect.createSpy(),
      };

      this.client = await createTestableClient({ store: this.store });

      this.action = { type: 'SOMETHING_EXCITING_HAPPENED' };
      this.client.simulateRemoteActionReceived(this.action);
    });

    it('should dispatch the received action into the synchronized store', function () {
      expect(this.store.dispatch).toHaveBeenCalledWithSimilarObject(this.action);
    });

    it('should mark the received action to indicate that it originated from a remote source', function () {
      expect(this.store.dispatch).toHaveBeenCalledWithSimilarObject({
        // Necessary to prevent esnext parsers from detecting the property as a decorator
        // eslint-disable-next-line no-useless-computed-key
        ['@@FROM_SERVER']: true,
      });
    });
  });

  describe('REQUEST_STATE', function () {
    it('should cause the client to send a backup of its state to the server', async function () {
      const client = await createTestableClient({ state: FAKE_STATE, ready: true });

      client.simulateLocalStateRequested();
      expect(client).toHaveSentState(FAKE_STATE);
    });

    describe('when configured to sync partial state', function () {
      it('should only send whitelisted state to the server', async function () {
        const entireState = {
          synchronizedReducer: 'some data',
          unsynchronizedReducer: 'other data',
        };

        const client = await createTestableClient({
          ready: true,
          state: entireState,
          options: {
            synchronizedState: ['synchronizedReducer'],
          },
        });

        client.simulateLocalStateRequested();

        expect(client).toHaveSentState({
          synchronizedReducer: 'some data',
        });
      });
    });
  });

  describe('SET_STATE', function () {
    it('should cause the client to override its state with the once received from the server', async function () {
      const mockStore = {
        dispatch: expect.createSpy()
      };

      const client = await createTestableClient({ store: mockStore });
      client.simulateRemoteStateReceived(FAKE_STATE);

      expect(mockStore.dispatch).toHaveBeenCalledWith({
        type: '@@SET_STATE',
        payload: FAKE_STATE,
      });
    });
  });
});
