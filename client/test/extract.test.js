/* eslint-disable prefer-arrow-callback,no-undef,func-names */
// Note: These tests are written using the mocha library, which doesn't allow arrow functions.
//   See https://mochajs.org/#arrow-functions for details

const expect = require('expect');
const { extract } = require('../src/util/object-manipulation');

// https://en.wikipedia.org/wiki/Xerxes_I
const XERXES = {
  name: 'Xerxes',
  country: 'Persia',
  dates: {
    birth: 517,
    coronation: 486,
    death: 465,
    reign: {
      beginning: 486,
      end: 465,
    },
  },
};

const PDF_STATE = {
  annotations: {
    annotationData: { 954: 'IT WORKS' },
    other: 'stuff',
  },
  documents: {
    pdfData: { 1337: 'IT WORKS' },
    pdfCount: 1,
    another: 'property',
  },
  anotherReducer: {
    some: 'data',
  },
};

describe('The object extraction utility', function () {
  it('should extract simple properties', function () {
    const description = 'name';

    expect(extract(XERXES, description)).toEqual({
      name: 'Xerxes',
    });
  });

  it('should extract multiple properties', function () {
    const description = ['name', 'country'];

    const initialData = {
      type: 'person',
    };

    expect(extract(XERXES, description, initialData)).toEqual({
      type: 'person',
      name: 'Xerxes',
      country: 'Persia',
    });
  });

  it('should extract nested properties', function () {
    const description = {
      dates: ['birth', 'death'],
    };

    const initialData = {
      dates: {
        creationOfTheUniverse: 0,
        everythingEnds: 1337,
      },
    };

    expect(extract(XERXES, description, initialData)).toEqual({
      dates: {
        creationOfTheUniverse: 0,
        birth: 517,
        death: 465,
        everythingEnds: 1337,
      },
    });
  });

  it('should extract a mixture of simple and nested properties', function () {
    const description = [
      'name',
      {
        dates: [
          'birth', 'reign.beginning', { reign: 'end' },
        ],
      },
    ];

    expect(extract(XERXES, description)).toEqual({
      name: 'Xerxes',
      dates: {
        birth: 517,
        reign: {
          beginning: 486,
          end: 465,
        },
      },
    });
  });

  it('should accept dotted keys as a shorthand for nested properties', function () {
    const description = {
      dates: ['birth', 'reign.beginning'],
    };

    expect(extract(XERXES, description)).toEqual({
      dates: {
        birth: 517,
        reign: {
          beginning: 486,
        },
      },
    });
  });

  it('should merge together dotted keys beginning with the same property', function () {
    const description = ['dates.birth', {
      dates: [
        'death',
        'reign.beginning',
      ],
    }];

    expect(extract(XERXES, description)).toEqual({
      dates: {
        birth: 517,
        death: 465,
        reign: {
          beginning: 486,
        },
      },
    });
  });

  it('should work with real-world data from pdf review client', function () {
    const description = [
      'annotations.annotationData',
      {
        documents: ['pdfData', 'pdfCount'],
      },
    ];

    expect(extract(PDF_STATE, description)).toEqual({
      annotations: {
        annotationData: { 954: 'IT WORKS' },
      },
      documents: {
        pdfData: { 1337: 'IT WORKS' },
        pdfCount: 1,
      },
    });
  });

  it('should not modify other data in target obejct', function () {
    const originalObject = {
      david: {
        name: 'David',
        job: 'programmer',
      },
    };

    const afterExtraction = extract(XERXES, ['name', 'dates.birth'], originalObject);
    expect(afterExtraction.david).toEqual(originalObject.david);
  });
});
