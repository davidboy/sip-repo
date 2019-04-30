/* eslint-disable no-underscore-dangle */

// Our preferred media stream constraints, sorted in order of descending preference.
//   See https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
const MEDIA_CONFIGURATIONS = [
  { audio: true, video: { width: { exact: 320 }, height: { exact: 240 } } },
  { audio: true },
];

/**
 * Attempts to fetch a media stream representing the current user's webcam, microphone, or both.
 * @returns {Promise<MediaStream | null>}
 */
function getMediaStream() {
  return _getMediaStream(0);
}

// TODO: allow selecting between multiple webcams, etc.
function _getMediaStream(attempt) {
  if (MEDIA_CONFIGURATIONS[attempt] == null) {
    return Promise.resolve(null);
  }

  return window.navigator.mediaDevices.getUserMedia(MEDIA_CONFIGURATIONS[attempt])
    .catch((err) => {
      if (err.name === 'NotFoundError' && attempt < MEDIA_CONFIGURATIONS.length - 1) {
        return _getMediaStream(attempt + 1);
      }

      return null;
    });
}

module.exports = { getMediaStream };
