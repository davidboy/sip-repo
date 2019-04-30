const debug = require('../util/debug');
const { createModule } = require('../modules');
const ConnectionManager = require('./connection-manager');
const { getMediaStream } = require('./media-streams');
const EventTarget = require('../util/event-target');

class RtcClient extends createModule('rtc') {
  constructor(syncClient) {
    super(syncClient);

    this.iceServers = null;
    this.syncClient = syncClient;
    this.connections = new ConnectionManager();

    this.packetHandlers = {
      ICE_SERVERS: 'onIceServersReceived',
      REMOTE_RTC_OFFER: 'onRtcOfferReceived',
      REMOTE_RTC_RESPONSE: 'onRtcResponseReceived',
      REMOTE_ICE_CANDIDATE: 'onIceCandidateReceived',
    };

    // Will resolve when it's safe to open a rtc connection.
    this.whenReady = new Promise((resolve) => { this.onRtcReady = resolve; });

    syncClient.whenOpen.then(() => this.loadIceServers());
  }

  burn(peerGuid) {
    this.connections.delete(peerGuid);
  }

  async connectTo(peerGuid) {
    await this.whenReady;

    const result = new EventTarget();
    const rtcConnection = new RTCPeerConnection({ iceServers: this.iceServers });

    rtcConnection.onicecandidate = async (event) => {
      if (!event.candidate) {
        return;
      }

      debug(`Sending ICE candidate to ${peerGuid}`);
      this.sendIceCandidate(event.candidate, peerGuid);
    };

    rtcConnection.ontrack = async (event) => {
      debug(`Video stream received from ${peerGuid}`);

      result.dispatchEvent({ type: 'track', payload: { streams: event.streams } });
    };

    rtcConnection.oniceconnectionstatechange = () => {
      if (rtcConnection.iceConnectionState === 'disconnected') {
        debug(`${peerGuid} disconnected`);

        result.dispatchEvent({ type: 'close' });
        rtcConnection.close();

        this.connections.delete(peerGuid);
      }
    };

    // The client with the highest guid has the responsibility to initialize the connection
    if (this.syncClient.identityGuid > peerGuid) {
      rtcConnection.onnegotiationneeded = async () => {
        debug(`Negotiating RTC connection with ${peerGuid}`);

        await rtcConnection.setLocalDescription(await rtcConnection.createOffer());

        this.sendRtcOffer(rtcConnection.localDescription, peerGuid);
      };
    }

    const webcamStream = await getMediaStream();
    if (webcamStream !== null) {
      for (const track of webcamStream.getTracks()) {
        rtcConnection.addTrack(track, webcamStream);
      }
    }

    this.connections.set(peerGuid, rtcConnection);

    return result;
  }

  onIceServersReceived(packet) {
    this.iceServers = packet.servers;
    this.onRtcReady();
  }

  async onRtcOfferReceived({ originGuid, offer }) {
    const rtcConnection = await this.connections.get(originGuid);

    debug(`RTC offer received from ${originGuid}`);

    await rtcConnection.setRemoteDescription(offer);
    await rtcConnection.setLocalDescription(await rtcConnection.createAnswer());

    debug(`Sending RTC response to ${originGuid}`);
    this.sendRtcResponse(rtcConnection.localDescription, originGuid);
  }

  onRtcResponseReceived({ originGuid, response }) {
    debug(`Received RTC response from ${originGuid}`);

    return this.connections.get(originGuid).then(
      rtcConnection => rtcConnection.setRemoteDescription(response)
    );
  }

  async onIceCandidateReceived({ originGuid, candidate }) {
    debug(`Received RTC response from ${originGuid}`);

    return this.connections.get(originGuid).then(
      rtcConnection => rtcConnection.addIceCandidate(candidate)
    );
  }

  sendRtcOffer(offer, targetGuid) {
    this.syncClient.sendPacket('RTC_OFFER', { offer, targetGuid });
  }

  sendRtcResponse(response, targetGuid) {
    this.syncClient.sendPacket('RTC_RESPONSE', { response, targetGuid });
  }

  sendIceCandidate(candidate, targetGuid) {
    this.syncClient.sendPacket('ICE_CANDIDATE', { candidate, targetGuid });
  }

  loadIceServers() {
    this.syncClient.sendPacket('REQUEST_ICE_SERVERS');
  }
}

module.exports = RtcClient;
