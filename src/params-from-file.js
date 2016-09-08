const BluebirdPromise = require('bluebird');
const fft = require('fft-js');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));
const wav = require('node-wav');
const mfcc = require('./mfcc');
const {framer} = require('./framer');
const {
  modulusFFT,
  zeroCrossingRateClipping,
  spectralRollOffPoint,
  spectralCentroid
} = require('./parameters');

const computeMFCC_ = (signal, config, mfccSize) => {
  const mfccCust = mfcc.construct(config, mfccSize);
  return signal.map(frame => {
    const phasors = fft.fft(frame);
    return mfccCust(fft.util.fftMag(phasors));
  });
};

const computeFFT_ = signal => {
  return signal.map(frame => {
    const fftFrame = fft.fft(frame);
    return modulusFFT(fftFrame.splice(fftFrame.length / 2, fftFrame.length));
  });
};

/**
 * Read file and return an object with MFCC and FFT
 * @param {String} filePath - Location of the wav file
 * @param {Object} config - config for the FFT/MFCC
 * Example :
 * const config = {
 *   fftSize: 32,
 *   bankCount: 24,
 *   lowFrequency: 1,
 *   highFrequency: 8000, // samplerate/2 here
 *   sampleRate: 16000
 * };
 * @param {Number} mfccSize - size of the MFCC you want as output
 * must be < fftSize
 * @param {Object} cfgParam -{overlap, cuttoff}
 * Overlap % between two successive windows (default = 50%)
 * cutoff % for spectralRollOffPoint (default = 85%)
 * @return {Promise} - The promise send in then an object with the parameter
 * format : {mfcc, fft, sc, zcr, srf}
 */
const getParamsFromFile = (filePath, config, mfccSize, cfgParam = {}) => {
  const params = {};
  cfgParam = {
    overlap: cfgParam.overlap || '50%',
    cutoff: cfgParam.cutoff || '85%'
  };
  return fs.readFileAsync(filePath)
    .then(buffer => {
      const decoded = wav.decode(buffer);
      const arrayDecoded = Array.from(decoded.channelData[0]);
      const framedSound = framer(arrayDecoded, config.fftSize * 2,
        cfgParam.overlap);
      params.zcr = framedSound.map(frame => zeroCrossingRateClipping(frame));
      params.mfcc = computeMFCC_(framedSound, config, mfccSize);
      params.fft = computeFFT_(framedSound);
      params.sc = params.fft.map(frame => spectralCentroid(frame));
      params.srf =
        params.fft.map(
          frame => spectralRollOffPoint(frame, config.sampleRate,
            cfgParam.cutoff));
      return new BluebirdPromise(resolve => resolve(params));
    });
};

module.exports = {getParamsFromFile};