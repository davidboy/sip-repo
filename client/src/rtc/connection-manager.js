class ConnectionManager {
  constructor() {
    this.connections = new Map();
    this.callbacks = new Map();
  }

  set(guid, connection) {
    this.connections.set(guid, connection);

    if (this.callbacks.has(guid)) {
      for (const callback of this.callbacks.get(guid)) {
        callback(connection);
      }

      this.callbacks.delete(guid);
    }
  }

  get(guid) {
    if (this.connections.has(guid)) {
      return Promise.resolve(this.connections.get(guid));
    }

    return new Promise((resolve) => {
      if (this.callbacks.has(guid)) {
        this.callbacks.get(guid).push(resolve);
      } else {
        this.callbacks.set(guid, [resolve]);
      }
    });
  }

  delete(guid) {
    this.connections.delete(guid);
    this.callbacks.delete(guid);
  }
}

module.exports = ConnectionManager;
