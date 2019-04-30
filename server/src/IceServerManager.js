const twilio = require('twilio');

// Put your Twilio credentials here
const TWILIO_SID = '[REDACTED]';
const TWILIO_TOKEN = '[REDACTED]';

const twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);

const MILLISECONDS_IN_HOUR = 3600000;

function getTimestamp() {
  return new Date().getTime();
}

class IceServerManager {
  constructor({ debugHandler = () => {} }) {
    this.debug = debugHandler;

    this.serverInformation = null;
    this.expiresAt = 0;
  }

  async loadIceServers() {
    this.debug('Requesting new ICE server information from Twilio');

    const response = await twilioClient.tokens.create();
    const servers = response.iceServers;

    for (const server of servers) {
      server.urls = server.url;
      delete server.url;
    }

    this.debug('New ICE server information received');
    this.serverInformation = servers;
    this.expiresAt = getTimestamp() + 6 * MILLISECONDS_IN_HOUR;
  }

  async getLatestDescription() {
    // TODO: prevent overlapping requests
    if (this.serverInformation == null || getTimestamp() >= this.expiresAt) {
      await this.loadIceServers();
    }

    return this.serverInformation;
  }
}

module.exports = IceServerManager;
