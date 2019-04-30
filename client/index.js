const { createSynchronizedReducer, isRemoteAction } = require('./src/state/sync-state');
const syncClientExports = require('./src/sync-client.js');

module.exports = Object.assign({ createSynchronizedReducer, isRemoteAction }, syncClientExports);
