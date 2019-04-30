# Client State Synchronization

The sync-client library enables synchronising the state of a redux app across multiple clients.  It works with sync-server to distribute the state using a master client and then replicate every redux action across all connected clients.


## Example Usage

Check out the [sync-client-demo repository](https://github.com/davidboy/sync-client-demo) for a proof-of-concept redux app that features synchronized state across multiple client instances.

```javascript
// Creating an instance of SyncClient begins the process of connecting to the server and preparing
//   to receive remote actions
const client = new SyncClient({
   // The websocket url of a running sync-server
  serverUrl: 'ws://localhost:9090',

  // State will be synchronized with all other clients in the specified room
  room: 'pdf-client.job.42', 

  // (optional): you can whitelist only the actions that should be synchronized.
  synchronizedActions: ['SOMETHING_HAPPENED', 'SOMETHING_ELSE_HAPPENED'],

  // (optional): you can whitelist only the parts of state that should be synchronized.
  //   Currently if you whitelist any part of the state you must also whitelist every action that might
  //   cause that state to change.  However this will become more flexible in the future.
  synchronizedState: [
    'annotations.annotationData',
    {
      documents: ['pdfData', 'pdfCount']
    }
  ]
});

// Wrap the application's root reducer using `synchronizedReducer`, and make sure to install 
//   the sync middleware into your redux store
const reduxStore = createStore(createSynchronizedReducer(rootReducer), client.state.middleware);

// After the store is created using the synchronized reducer and middleware, call #synchronize
//   to begin synchronizing it with any other clients in the specified room
client.state.synchronize(reduxStore);

// The connect event will fire as soon as a successful connection has been made to the synchronization server
client.on('connect', () => {
  // If possible, it's helpful to load the redux store's initial state from the master client to ensure consistency.
  if (client.state.hasMaster) client.state.loadFromMaster();
});
```



# RTC Connections
This library also allows for the easy creation of RTC sessions between peers that have connected to sync-server.  Using only the peer client's client guid, which can be obtained from the server, a direct peer-to-peer connection can be created to allow for real-time video communication between the two clients.

## Example Usage
```javascript
    const client = new SyncClient({
      serverUrl: 'ws://localhost:9090',
      room: 'pdf-client.job.42', 
    });

    // Every client that connects to the sync-server is assigned a random GUID to identify that client.
    //   If you have the guid of another client, it's easy to create a RTC connection with them.
    const peerGuid = '10a56f65-2e1d-434a-ad9c-60318394d638';
    
    // Connecting to a peer will automatically start sharing media streams from your webcam -- no further setup is needed.
    const rtcConnection = client.rtc.connectTo(peerGuid);
    
    // The connection will fire the track event whenever it receives a webcam video stream from the connected peer.
    rtcConnection.on('track', (event) => {
      // The received connection can be used as the source object for any html5 video element to easily render it in a web page.
      document.getElementById('video-container').srcObject = event.payload.streams[0];
    });
    
    // The connection will fire the close event whenever it's closed by the server or a network error forces the stream to close.
    rtcConnection.on('close', () => {
      // Cleanup or re-connection should happen here
    });
```