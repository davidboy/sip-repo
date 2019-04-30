const expect = require('expect');
const assert = require('expect/lib/assert').default;
const { isSpy } = require('expect/lib/SpyUtils');

// FIXME: this is a pretty nasty method
function areSimilar(smallObject, largeObject, parseJSON = false) {
  if (parseJSON && typeof largeObject === 'string') {
    try {
      largeObject = JSON.parse(largeObject); // eslint-disable-line no-param-reassign
    } catch (e) {
      // swallow json error
    }
  } else if (typeof largeObject !== 'object') {
    return smallObject === largeObject;
  }

  for (const expectedKey of Object.keys(smallObject)) {
    if (!Object.prototype.hasOwnProperty.call(largeObject, expectedKey)) {
      return false;
    }

    if (typeof largeObject[expectedKey] === 'object') {
      if (!areSimilar(smallObject[expectedKey], largeObject[expectedKey], parseJSON)) {
        return false;
      }
    } else if (smallObject[expectedKey] !== largeObject[expectedKey]) {
      return false;
    }
  }

  return true;
}

expect.extend({
  toHaveBeenCalledWithSimilarObject(expectedObject, parseJSON = false) {
    const spy = this.actual;

    assert(
      isSpy(spy),
      'The "actual" argument in expect(actual).toHaveBeenCalledWithSimilarObject() must be a spy',
    );

    assert(
      spy.calls.some(call => call.arguments.some(arg => areSimilar(expectedObject, arg, parseJSON))),
      'spy was not called with %s',
      expectedObject,
    );

    return this;
  },
});
