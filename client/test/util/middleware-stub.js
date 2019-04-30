const expect = require('expect');

const FAKE_ACTION = { type: 'CHAT_MESSAGE_POSTED', payload: 'Hello world!' };
const FAKE_ACTION_RESULT = 'IT WORKED';
const FAKE_NEXT = () => FAKE_ACTION_RESULT;
const FAKE_STORE = {
  getState() {
    return {};
  },
};

function runMiddleware(middleware, {
  providedStore = FAKE_STORE,
  state = null,
  next = FAKE_NEXT,
  action = FAKE_ACTION,
} = {}) {
  const store = state == null
    ? providedStore
    : { getState: () => state };

  return middleware(store)(next)(action);
}

expect.extend({
  toBeReduxMiddleware() {
    const middleware = this.actual;

    expect(middleware).toBeA('function');
    expect(middleware()).toBeA('function');
    expect(middleware()()).toBeA('function');

    const spyNext = expect.createSpy().andCall(() => FAKE_ACTION_RESULT);
    const result = runMiddleware(middleware, { next: spyNext });

    expect(spyNext).toHaveBeenCalledWith(FAKE_ACTION);
    expect(result).toEqual(FAKE_ACTION_RESULT);

    return this;
  },
});

module.exports = { runMiddleware, FAKE_ACTION, FAKE_ACTION_RESULT, FAKE_NEXT, FAKE_STORE };
