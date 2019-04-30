const server = require('http').createServer();

const SyncServer = require('./src/SyncServer');
const controlPanelApp = require('./src/ControlPanelServer');

const syncServer = new SyncServer();
syncServer.start(server);

controlPanelApp.registerSyncServer(syncServer);
server.on('request', controlPanelApp);

const port = process.env.SYNC_PORT || 9090;

server.listen(port, () => {
  console.log(`Sync server listening on port ${port}`);
});
