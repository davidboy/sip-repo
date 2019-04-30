/* eslint-disable prefer-arrow-callback,no-undef,func-names */
// Note: These tests are written using the mocha library, which doesn't allow arrow functions.
//   See https://mochajs.org/#arrow-functions for details

const expect = require('expect');

const EventTarget = require('../src/util/event-target');

const event = {
  type: 'somethingHappened',
  otherValue: 0xDEADBEEF,
};

describe('EventTarget', function () {
  beforeEach(function () {
    this.target = new EventTarget();
    this.eventListener = expect.createSpy();
  });

  it('should allow subscribing to events', function () {
    this.target.addEventListener(event.type, this.eventListener);
    this.target.dispatchEvent(event);

    expect(this.eventListener).toHaveBeenCalledWith(event);
  });

  it('should distribute events according to their type', function () {
    this.target.addEventListener('anEventThatShouldNotFire', this.eventListener);
    this.target.dispatchEvent(event);

    expect(this.eventListener).toNotHaveBeenCalled();
  });

  it('should allow removing event listeners', function () {
    this.target.addEventListener(event.type, this.eventListener);
    this.target.removeEventListener(event.type, this.eventListener);

    this.target.dispatchEvent(event);
    expect(this.eventListener).toNotHaveBeenCalled();
  });
});
