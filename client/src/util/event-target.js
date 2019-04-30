// A browser-compatible event emitter, from https://developer.mozilla.org/en-US/docs/Web/API/EventTarget

class EventTarget {
  constructor() {
    this.listeners = {};
  }

  addEventListener(type, callback) {
    if (!(type in this.listeners)) {
      this.listeners[type] = [];
    }

    this.listeners[type].push(callback);
  }

  on(type, callback) {
    this.addEventListener(type, callback);
  }

  removeEventListener(type, callback) {
    if (!(type in this.listeners)) {
      return;
    }

    const stack = this.listeners[type];
    for (let i = 0, l = stack.length; i < l; i++) {
      if (stack[i] === callback) {
        stack.splice(i, 1);
        return;
      }
    }
  }

  dispatchEvent(event) {
    if (!(event.type in this.listeners)) {
      return true;
    }

    const stack = this.listeners[event.type];
    event.target = this;
    for (let i = 0, l = stack.length; i < l; i++) {
      stack[i].call(this, event);
    }

    return !event.defaultPrevented;
  }
}

module.exports = EventTarget;
