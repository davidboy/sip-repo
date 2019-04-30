/* eslint-disable no-prototype-builtins */

function isPlainObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
}

// https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
function merge(target, source) {
  const result = Object.assign({}, target);

  for (const sourceKey of Object.keys(source)) {
    if (isPlainObject(source[sourceKey])) {
      if (!result.hasOwnProperty(sourceKey)) result[sourceKey] = {};
      result[sourceKey] = merge(result[sourceKey], source[sourceKey]);
    } else {
      result[sourceKey] = source[sourceKey];
    }
  }

  return result;
}

// TODO: un-FUBAR this function
function extract(object, description, target = {}) {
  if (typeof description === 'string') {
    description = [description]; // eslint-disable-line no-param-reassign
  }

  const result = { ...target };

  if (Array.isArray(description)) {
    for (const desiredField of description) {
      if (typeof desiredField === 'string') {
        if (object.hasOwnProperty(desiredField)) {
          result[desiredField] = object[desiredField];
        } else if (desiredField.includes('.')) {
          const descriptionObjectBeingBuilt = {};
          let currentWorkingPart = descriptionObjectBeingBuilt;

          const fieldParts = desiredField.split('.');
          for (let i = 0; i < fieldParts.length - 1; i++) {
            if (i === fieldParts.length - 2) {
              currentWorkingPart[fieldParts[i]] = [fieldParts[i + 1]];
            } else {
              currentWorkingPart = {};
              currentWorkingPart[fieldParts[i]] = {};
            }
          }

          Object.assign(result, extract(object, descriptionObjectBeingBuilt, result));
        }
      } else if (typeof desiredField === 'object') {
        Object.assign(result, extract(object, desiredField, result));
      }
    }
  } else {
    for (const desiredKey of Object.keys(description)) {
      if (object.hasOwnProperty(desiredKey)) {
        result[desiredKey] = extract(object[desiredKey], description[desiredKey], target[desiredKey] || {});
      }
    }
  }

  return result;
}

module.exports = {
  extract,
  merge,
};
