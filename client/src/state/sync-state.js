const { createModule } = require('../modules');
const { extract } = require('../util/object-manipulation');

const SERVER_MESSAGE_MARKER = '@@FROM_SERVER';

const REDUX_INIT_ACTION = '@@INIT';
const SET_STATE_ACTION = '@@SET_STATE';

const DEFAULT_CONFIG = {
  room: 'global',
  synchronizedState: null,
  synchronizedActions: [],
};

class StateSynchronizer extends createModule('state') {
  constructor(syncClient, suppliedConfig) {
    super(syncClient);

    const config = Object.assign({}, DEFAULT_CONFIG, suppliedConfig);

    this.isMaster = false;
    this.syncClient = syncClient;

    this.room = config.room;
    this.synchronizedState = config.synchronizedState;
    this.synchronizedActions = config.synchronizedActions;

    this.packetHandlers = {
      HEARTBEAT: 'onHeartbeat',
      JOIN_SUCCESSFUL: 'onJoinSuccessful',
      REMOTE_ACTION: 'onRemoteAction',
      REQUEST_STATE: 'onStateRequested',
      SET_STATE: 'onStateOverridden',
    };
  }

  get isPartiallySynchronizing() {
    return this.synchronizedActions.length > 0 || this.synchronizedState != null;
  }

  get middleware() {
    // eslint-disable-next-line arrow-parens
    return store => next => action => {
      if (store !== this.store) {
        // TODO: handle store mismatch
      }

      this.sendLocalAction(action);

      const actionResult = next(action);

      if (this.isMaster) {
        this.onStateRequested();
      }

      return actionResult;
    };
  }

  get hasMaster() {
    return !this.isMaster;
  }

  async synchronize(store) {
    await this.syncClient.whenOpen;

    if (store != null) {
      this.store = store;
    }

    this.syncClient.sendPacket('JOIN_ROOM', this.room);
  }

  loadFromMaster() {
    this.syncClient.sendPacket('REQUEST_STATE');
  }

  sendLocalAction(action) {
    if (this.isPartiallySynchronizing && !this.synchronizedActions.includes(action.type)) return;
    if (action.type === REDUX_INIT_ACTION || action.type === SET_STATE_ACTION) return;
    if (action[SERVER_MESSAGE_MARKER]) return;

    this.syncClient.sendPacket('SEND_ACTION', action);
  }

  onHeartbeat({ isMaster }) {
    this.isMaster = isMaster;
  }

  onJoinSuccessful({ isMaster }) {
    this.isMaster = isMaster;

    this.onFinishedLoading();
  }

  onRemoteAction(action) {
    if (this.isPartiallySynchronizing && !this.synchronizedActions.includes(action.type)) {
      return;
    }

    action[SERVER_MESSAGE_MARKER] = true;

    this.store.dispatch(action);
  }

  onStateRequested() {
    let payload = this.store.getState();

    if (this.isPartiallySynchronizing) {
      payload = extract(payload, this.synchronizedState);
    }

    this.syncClient.sendPacket('SET_STATE', payload);
  }

  onStateOverridden(newState) {
    const overwriteState = this.isPartiallySynchronizing
      ? extract(newState, this.synchronizedState, this.store.getState())
      : newState;

    this.store.dispatch({
      type: SET_STATE_ACTION,
      payload: overwriteState,
    });
  }
}

function isRemoteAction(action) {
  return action[SERVER_MESSAGE_MARKER] === true;
}

function createSynchronizedReducer(appReducer) {
  return (state, action) => {
    switch (action.type) {
      case SET_STATE_ACTION:
        return action.payload;
      default:
        return appReducer(state, action);
    }
  };
}

module.exports = { StateSynchronizer, createSynchronizedReducer, isRemoteAction };
