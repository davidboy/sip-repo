/* eslint-disable no-underscore-dangle */

class ModuleManager {
  constructor(syncClient, config) {
    this.syncClient = syncClient;
    this.moduleConfig = config;
    this.loadingModules = new Map();
    this.whenLoaded = new Promise((resolve) => { this.onWhenAllLoaded = () => resolve(); });

    syncClient._modules = [];
  }

  register(modules) {
    for (const Module of modules) {
      this.syncClient._modules.push(new Module(this.syncClient, this.moduleConfig));
    }
  }

  addLoadingModule(name) {
    this.loadingModules.set(name, false);
  }

  moduleLoaded(name) {
    this.loadingModules.set(name, true);

    const isLoaded = value => value === true;
    if (Array.from(this.loadingModules.values).every(isLoaded)) {
      this.onWhenAllLoaded();
    }
  }

  onPacketReceived(packet) {
    for (const module of this.syncClient._modules) {
      module.onPacketReceived(packet);
    }
  }
}

function createModule(name) {
  return class {
    constructor(syncClient) {
      this._moduleName = name;
      this._moduleManager = syncClient.modules;

      syncClient[name] = this;
      syncClient.modules.addLoadingModule(name);
    }

    onFinishedLoading() {
      this._moduleManager.moduleLoaded(this._moduleName);
    }

    onPacketReceived(packet) {
      const handler = this[this.packetHandlers[packet.type]];
      if (typeof handler === 'function') {
        handler.call(this, packet.payload);
      }
    }
  };
}

module.exports = { ModuleManager, createModule };
