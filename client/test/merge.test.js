/* eslint-disable prefer-arrow-callback,no-undef,func-names */
// Note: These tests are written using the mocha library, which doesn't allow arrow functions.
//   See https://mochajs.org/#arrow-functions for details

const expect = require('expect');
const { merge } = require('../src/util/object-manipulation');

describe('The object merging utility', function () {
  it('should merge simple objects', function () {
    const object = { language: 'javascript' };
    const additionalProperties = { isBetterThanRuby: false };

    expect(merge(object, additionalProperties)).toEqual({
      language: 'javascript',
      isBetterThanRuby: false,
    });
  });

  it('should merge nested objects', function () {
    const object1 = {
      type: 'animal',
      shape: {
        legs: 4,
        tail: true,
      },
    };

    const object2 = {
      name: 'horse',
      shape: {
        wings: false,
      },
    };

    expect(merge(object1, object2)).toEqual({
      type: 'animal',
      name: 'horse',
      shape: {
        legs: 4,
        tail: true,
        wings: false,
      },
    });
  });

  it('should not mutate the original object', function () {
    const object = { message: 'Hello world' };
    merge(object, { prop: true });

    expect(object).toEqual({ message: 'Hello world' });
  });
});
