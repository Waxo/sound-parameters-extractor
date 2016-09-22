const retrievePercent_ = require('./private-tools').retrievePercent_;

/**
 * Computes the zero crossing rate on a given window.
 * Use this one the signal without fft or mfcc
 * This implementation is the offcial formula but is 1.5 slower than
 * zeroCrossingRateClipping
 * @param {Array} window - The window on which we want to compute the zcr
 * @return {Number} Zero crossing rate for the given window
 */
const zeroCrossingRate = window => {
  let zcr = 0;
  for (let i = 1; i < window.length; i++) {
    if (Math.abs(Math.sign((window[i]) ? window[i] : 1) -
        Math.sign((window[i - 1]) ? window[i - 1] : 1)) > 0) {
      zcr++;
    }
  }
  return zcr;
};

/**
 * Computes the zero crossing rate on a given window.
 * Use this before mfcc
 * @param {Array} window - The window on which we want to compute the zcr
 * @param {Number} threshold - optional, default 0, this can be used to have
 * a better resistance to noise
 * @return {Number} Zero crossing rate for the given window
 */
const zeroCrossingRateClipping = (window, threshold = 0) => {
  let zcr = 0;
  for (let i = 1; i < window.length; i++) {
    if (window[i - 1] <= threshold && window[i] > threshold) {
      zcr++;
    } else if (window[i - 1] >= -threshold && window[i] < -threshold) {
      zcr++;
    }
  }
  return zcr;
};

const retrieveCutoff_ = percentage => percentage.replace('%', '') / 100;

/**
 * Computes the Spectral roll-off point on a given frame
 * @param {Array} frame - The window on which we want to compute the srf
 * @param {Number} sampleRate - sample rate of the file
 * @param {String} cutoff - point where <cutoff> of frequency based energy
 * is contained (eg: 85%)
 * @param {Boolean} hz - If you want the value in hz or just the index
 *   corresponding
 * @return {Number} Spectral roll-off point for the given window
 */
const spectralRollOffPoint = (frame, sampleRate, cutoff, hz = false) => {
  cutoff = retrieveCutoff_(cutoff);
  const totalEnergy = frame.reduce((a, b) => a + b);
  let i = 0;
  let spectralEnergy = 0;
  while (spectralEnergy < cutoff * totalEnergy) {
    spectralEnergy += frame[i++];
  }
  return (hz) ? sampleRate / (2 * frame.length) * i : i;
};

/**
 * Computes the Spectral centroid on a given window. This is calculated
 * from the fft
 * @param {Array} frame - The window on which we want to compute the sc
 * @param {Number} sampleRate - sample rate of the file
 * @return {Number} Spectral centroid point for the given window
 */
const spectralCentroid = frame => {
  const numerator = frame.map((a, index) => a * index).reduce((a, b) => a + b);
  const denominator = frame.reduce((a, b) => a + b);

  return (numerator / denominator);
};

const spectralCentroidSRF = (frame, sampleRate) => {
  return spectralRollOffPoint(frame, sampleRate, '50%');
};

/**
 * Extend the frame with previous and later coefficients
 * @param {Array} frame - The window on which we want to extend
 * @param {String} overlap - Percentage of overlapping between two window.
 * @param {Array} frameBefore - frame before the actual frame
 * @param {Array} frameAfter - frame after the actual frame
 * @return {Array} array with the previous and next frame concatenated to the
 *   current frame
 * @private
 */
const extendFrame_ = (frame, overlap, frameBefore, frameAfter) => {
  const overlapSize = frame.length / retrievePercent_(overlap);
  if (frameBefore) {
    frameBefore = frameBefore.slice(0, overlapSize);
  } else {
    frameBefore = new Array(overlapSize).fill(0);
  }

  if (frameAfter) {
    frameAfter = frameAfter.slice(overlapSize, frameAfter.length);
  } else {
    frameAfter = new Array(overlapSize).fill(0);
  }

  return {
    frameExtended: frameBefore.concat(frame, frameAfter),
    offset: overlapSize
  };
};

/**
 * Computes the deltaFrame of the framer, for delta on static parameters and
 * delta-delta if the parameters are deltas
 * @param {Array} frame - The window on which we want to compute the
 *   deltaFrame
 * @param {String} overlap - Percentage of overlapping between two window.
 * @param {Array} frameBefore - frame before the actual frame
 * @param {Array} frameAfter - frame after the actual frame
 * @return {Array} delta of the MFCC
 */
const deltaFrame = (frame, overlap, frameBefore, frameAfter) => {
  const delta = [];

  const {frameExtended, offset} = extendFrame_(frame, overlap, frameBefore,
    frameAfter);
  for (let index = offset; index < frameExtended.length - offset; index++) {
    let numerator = 0;
    let denominator = 0;
    for (let i = 1; i <= 2; i++) {
      numerator += i * (frameExtended[index + i] - frameExtended[index - i]);
      denominator += i * i;
    }
    delta[index - offset] = numerator / (2 * denominator);
  }
  return delta;
};

/**
 * Computes the delta on all the framed signal
 * @param {Array} signal - Audio signal splited by frames
 * @param {String} overlap - Percentage of overlapping between two window.
 * @return {Array} Deltas of the signal
 */
const deltaAllSignal = (signal, overlap) => {
  const signalDelta = [];
  for (let i = 0; i < signal.length; i++) {
    signalDelta[i] =
      deltaFrame(signal[i], overlap, (i === 0) ? null : signal[i - 1],
        (i === signal.length - 1) ? null : signal[i + 1]);
  }
  return signalDelta;
};

/**
 *
 * @param {Object} acousticVectors - contains the frames before and after,
 * eg: {b1: [], b2: [], a1: [], a2:[]},
 * b stands for before, lesser is closer of the current
 * a stands for after, lesser is closer of the current
 * @param {Number} lengthOfVectors - length of the vectors
 * @return {Array} Deltas of the frame
 */
const deltaCustomVectors = (acousticVectors, lengthOfVectors) => {
  const numberOfVectors = 2;
  const delta = [];
  for (let i = 1; i <= numberOfVectors; i++) {
    if (!acousticVectors[`a${i}`]) {
      acousticVectors[`a${i}`] = new Array(lengthOfVectors).fill(0);
    }
    if (!acousticVectors[`b${i}`]) {
      acousticVectors[`b${i}`] = new Array(lengthOfVectors).fill(0);
    }
  }

  for (let i = 0; i < lengthOfVectors; i++) {
    delta[i] = (-(acousticVectors.a2[i] - acousticVectors.b2[i]) +
      (8 * (acousticVectors.a1[i] - acousticVectors.b1[i]))) / 12;
  }
  return delta;
};

/**
 * Computes the delta delta on all the framed signal
 * NOT THE DELTA SIGNAL
 * @param {Object} acousticVectors - contains the frames before and after,
 * eg: {b1: [], b2: [], a1: [], a2:[], c: []},
 * b stands for before, lesser is closer of the current
 * a stands for after, lesser is closer of the current
 * c stands for current vector
 * @param {Number} lengthOfVectors - length of the vectors
 * @return {Array} Deltas of the frame
 */
const deltaDeltaCustomVectors = (acousticVectors, lengthOfVectors) => {
  const deltaDelta = [];
  const numberOfVectors = 2;
  for (let i = 1; i <= numberOfVectors; i++) {
    if (!acousticVectors[`a${i}`]) {
      acousticVectors[`a${i}`] = new Array(lengthOfVectors).fill(0);
    }
    if (!acousticVectors[`b${i}`]) {
      acousticVectors[`b${i}`] = new Array(lengthOfVectors).fill(0);
    }
  }

  for (let i = 0; i < lengthOfVectors; i++) {
    deltaDelta[i] = (-(acousticVectors.b2[i] - (16 * acousticVectors.b1[i]) +
      (30 * acousticVectors.c[i]) - (16 * acousticVectors.a1[i]) +
      acousticVectors.a2[i])) / 12;
  }
  return deltaDelta;
};

/**
 * Computes the delta on all the acoustics vectors
 * @param {Array} signalAcousticVectors - Audio signal splited by frames
 * @return {Array} Deltas of the signal
 */
const deltaCustomAllSignal = signalAcousticVectors => {
  return signalAcousticVectors.map((frame, index) => {
    const lengthOfVectors = frame.length;
    const acousticVectors = {};
    const numberOfVectors = 2;
    for (let i = 1; i <= numberOfVectors; i++) {
      acousticVectors[`a${i}`] = signalAcousticVectors[index + i];
      acousticVectors[`b${i}`] = signalAcousticVectors[index - i];
    }
    return deltaCustomVectors(acousticVectors, lengthOfVectors);
  });
};

/**
 * Computes the delta delta on all the acoustics vectors
 * @param {Array} signalAcousticVectors - Audio signal splited by frames
 * NOT THE DELTA
 * @return {Array} Deltas of the signal
 */
const deltaDeltaCustomAllSignal = signalAcousticVectors => {
  return signalAcousticVectors.map((frame, index) => {
    const lengthOfVectors = frame.length;
    const acousticVectors = {};
    for (let i = 1; i <= 2; i++) {
      acousticVectors[`a${i}`] = signalAcousticVectors[index + i];
      acousticVectors[`b${i}`] = signalAcousticVectors[index - i];
    }
    acousticVectors.c = signalAcousticVectors[index];
    return deltaDeltaCustomVectors(acousticVectors, lengthOfVectors);
  });
};

/**
 * Process the modulus for a frame after the fft
 * @param {Array} frame - after fft calculation (eg: [[0,0],[0.032,0] ... ]
 * @param {Boolean} removeHalf - remove half of the fft for the modulus
 * @return {Array} modulus for the frame
 */
const modulusFFT = (frame, removeHalf = false) => {
  if (removeHalf) {
    frame = frame.splice(frame.length / 2, frame.length);
  }
  return frame.map(a => Math.sqrt((a[0] * a[0]) + (a[1] * a[1])));
};

module.exports = {
  zeroCrossingRate,
  zeroCrossingRateClipping,
  spectralRollOffPoint,
  spectralCentroid,
  spectralCentroidSRF,
  deltaFrame,
  deltaAllSignal,
  deltaCustomVectors,
  deltaDeltaCustomVectors,
  deltaCustomAllSignal,
  deltaDeltaCustomAllSignal,
  modulusFFT
};
