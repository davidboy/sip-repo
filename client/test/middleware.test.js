/* eslint-disable prefer-arrow-callback,no-undef,func-names */
// Note: These tests are written using the mocha library, which doesn't allow arrow functions.
//   See https://mochajs.org/#arrow-functions for details

const expect = require('expect');
const { runMiddleware, FAKE_ACTION } = require('./util/middleware-stub');

const { TestableSyncClient, createTestableClient } = require('./util/testable-sync-client');

describe('The synchronization middleware', function () {
  beforeEach(function () {
    TestableSyncClient.setUp();
  });

  afterEach(function () {
    TestableSyncClient.tearDown();
  });

  it('should be valid redux middleware', function () {
    expect(new TestableSyncClient().state.middleware).toBeReduxMiddleware();
  });

  it('should intercept all actions and sends them to the server', function () {
    const client = new TestableSyncClient();

    runMiddleware(client.state.middleware);
    expect(client).toHaveReportedLocalAction(FAKE_ACTION);
  });

  describe('when configured to sync partial state', function () {
    beforeEach(function () {
      this.client = new TestableSyncClient({
        synchronizedActions: ['ALLOWED_ACTION'],
      });
    });

    it('should send whitelisted actions to the server normally', function () {
      const action = { type: 'ALLOWED_ACTION' };

      runMiddleware(this.client.state.middleware, { action });
      expect(this.client).toHaveReportedLocalAction(action);
    });

    it('should not send the server actions that are not in the whitelist', function () {
      const action = { type: 'FORBIDDEN_ACTION' };

      runMiddleware(this.client.state.middleware, { action });
      expect(this.client).toNotHaveReportedLocalAction(action);
    });
  });

  it('should not send the server actions that already originated from a remote source', function () {
    const client = new TestableSyncClient();
    const action = {
      type: 'FOOBAR_BAZ',

      // Necessary to prevent esnext parsers from detecting the property as a decorator
      // eslint-disable-next-line no-useless-computed-key
      ['@@FROM_SERVER']: true,
    };

    runMiddleware(client.state.middleware, { action });
    expect(client).toNotHaveReportedLocalAction(action);
  });

  it('should not send state initialization actions to the server', function () {
    const client = new TestableSyncClient();
    const specialActionTypes = ['@@INIT', '@@SET_STATE'];

    for (const type of specialActionTypes) {
      const action = { type };

      runMiddleware(client.state.middleware, { action });
      expect(client).toNotHaveReportedLocalAction(action);
    }
  });

  describe('when master', function () {
    it('should send a state backup to the server', async function () {
      const fakeState = { message: 'Hello world', position: { x: 0, y: 0 } };
      const client = await createTestableClient({ asMaster: true, state: fakeState });

      runMiddleware(client.state.middleware, { state: fakeState });
      expect(client).toHaveSentState(fakeState);
    });
  });

  describe('when not master', function () {
    it('should not send a state backup to the server', async function () {
      const client = await createTestableClient();

      runMiddleware(client.state.middleware);
      expect(client).toNotHaveSentState();
    });
  });
});
