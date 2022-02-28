import fft from 'fft-js';
import fs from 'fs-extra';
import wav from 'node-wav';

import * as mfcc from './mfcc.js';
import {framer} from './framer.js';
import {
  modulusFFT,
  zeroCrossingRateClipping,
  spectralRollOffPoint,
  spectralCentroid,
  spectralCentroidSRF,
  remarkableEnergyRate
} from './parameters.js';

const computeMFCC_ = (signal, config, mfccSize) => {
  const mfccCust = mfcc.construct(config, mfccSize);
  return signal.map((frame) => {
    const phasors = fft.fft(frame);
    return mfccCust(fft.util.fftMag(phasors));
  });
};

const computeFFT_ = (signal) =>
  signal.map((frame) => modulusFFT(fft.fft(frame), true));

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
 * @param {Object} cfgParameter -{overlap, cuttoff}
 * Overlap % between two successive windows (default = 50%)
 * cutoff % for spectralRollOffPoint (default = 85%)
 * @return {Promise} - The promise send in then an object with the parameter
 * format : {mfcc, fft, sc, zcr, srf}
 */
const getParametersFromFile = (
  filePath,
  config,
  mfccSize,
  cfgParameter = {}
) => {
  cfgParameter = {
    overlap: cfgParameter.overlap || '50%',
    cutoff: cfgParameter.cutoff || '85%'
  };
  return fs.readFile(filePath).then((buffer) => {
    const parameters = {};
    const decoded = wav.decode(buffer);
    parameters.arrayDecoded = Array.from(decoded.channelData[0]);
    parameters.framedSound = framer(
      parameters.arrayDecoded,
      config.fftSize * 2,
      cfgParameter.overlap
    );

    parameters.rer = remarkableEnergyRate(
      parameters.arrayDecoded,
      parameters.framedSound
    );
    parameters.zcr = parameters.framedSound.map((frame) =>
      zeroCrossingRateClipping(frame)
    );
    parameters.mfcc = computeMFCC_(parameters.framedSound, config, mfccSize);
    parameters.fft = computeFFT_(parameters.framedSound);
    parameters.sc = parameters.fft.map((frame) => spectralCentroid(frame));
    parameters.sc2 = parameters.fft.map((frame) =>
      spectralCentroidSRF(frame, config.sampleRate)
    );
    parameters.srf = parameters.fft.map((frame) =>
      spectralRollOffPoint(frame, config.sampleRate, cfgParameter.cutoff)
    );
    return parameters;
  });
};

export {getParametersFromFile};
