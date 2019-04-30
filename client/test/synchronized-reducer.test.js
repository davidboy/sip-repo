/* eslint-disable prefer-arrow-callback,no-undef,func-names */
// Note: These tests are written using the mocha library, which doesn't allow arrow functions.
//   See https://mochajs.org/#arrow-functions for details

const expect = require('expect');

const { createSynchronizedReducer } = require('../index');

describe('Synchronized reducers', function () {
  beforeEach(function () {
    this.rootReducer = expect.createSpy();
    this.synchronizedReducer = createSynchronizedReducer(this.rootReducer);
  });

  it('should allow setting state to any arbitrary object', function () {
    const previousState = { message: 'Hello world' };

    const expectedState = { message: 'This is the new state', priceOfRiceInChina: 42 };
    const overwriteAction = {
      type: '@@SET_STATE',
      payload: expectedState,
    };

    const newState = this.synchronizedReducer(previousState, overwriteAction);

    expect(this.rootReducer).toNotHaveBeenCalled();
    expect(newState).toEqual(expectedState);
  });

  it('should forward any other actions into the application\'s root reducer', function () {
    const state = { stateProperty: 'value' };
    const action = { type: 'SOMETHING_HAPPENED' };

    this.synchronizedReducer(state, action);

    expect(this.rootReducer).toHaveBeenCalledWith(state, action);
  });
});
