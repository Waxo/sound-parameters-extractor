import dct from 'dct';

const log_ = (m) => Math.log(1 + m);
/**
 * Converts from Mel-scale to hertz. Used by constructFilterBank.
 * @param {Number} mels - mels to convert to hertz
 */
const melsToHz = (mels) => 700 * (Math.exp(mels / 1127) - 1);
/**
 * Converts from hertz to the Mel-scale. Used by constructFilterBank.
 * @param {Number} hertz - hertz to convert to mels
 */
const hzToMels = (hertz) => 1127 * Math.log(1 + hertz / 700);

/**
 * Creates a filter bank with config.bankCount triangular filters.
 * Filters are distributed according to the mel scale.
 *
 * @param {Object} config - Object containing the config for mfccBank
 * (eg: config = {  fftSize: 32,  bankCount: 24,  lowFrequency: 1,
 *   highFrequency: 8000,  sampleRate: 16000,})
 * @returns {{filters: Array, lowMel, highMel, deltaMel: number, lowFreq:
 *   number, highFreq: number, filter: (function(*))}}
 */
const constructMelFilterBank = (config) => {
  const bins = [];
  const fq = [];
  const filters = [];

  const lowM = hzToMels(config.lowFrequency);
  const highM = hzToMels(config.highFrequency);
  const deltaM = (highM - lowM) / (config.bankCount + 1);

  for (let i = 0; i < config.bankCount; i++) {
    fq[i] = melsToHz(lowM + i * deltaM);
    bins[i] = Math.floor(
      ((config.fftSize + 1) * fq[i]) / (config.sampleRate / 2)
    );
  }

  for (let i = 0; i < bins.length; i++) {
    filters[i] = [];
    const filterRange =
      i === bins.length - 1 ? bins[i] - bins[i - 1] : bins[i + 1] - bins[i];
    filters[i].filterRange = filterRange;
    for (let f = 0; f < config.fftSize; f++) {
      if (f > bins[i] + filterRange) {
        // Right, outside of cone
        filters[i][f] = 0.0;
      } else if (f > bins[i]) {
        // Right edge of cone
        filters[i][f] = 1.0 - (f - bins[i]) / filterRange;
      } else if (f === bins[i]) {
        // Peak of cone
        filters[i][f] = 1.0;
      } else if (f >= bins[i] - filterRange) {
        // Left edge of cone
        filters[i][f] = 1.0 - (bins[i] - f) / filterRange;
      } else {
        // Left, outside of cone
        filters[i][f] = 0.0;
      }
    }
  }

  filters.bins = bins;

  return {
    filters,
    lowMel: lowM,
    highMel: highM,
    deltaMel: deltaM,
    lowFreq: config.lowFrequency,
    highFreq: config.highFrequency,
    filter: (freqPowers) => {
      const ret = [];

      filters.forEach((filter, fIx) => {
        let tot = 0;
        freqPowers.forEach((fp, pIx) => {
          tot += fp * filter[pIx];
        });
        ret[fIx] = tot;
      });
      return ret;
    }
  };
};

/**
 * Construct the mfcc
 * @param {Object} config - Object containing the config for mfccBank
 * (eg: config = {  fftSize: 32,  bankCount: 24,  lowFrequency: 1,
 *   highFrequency: 8000,  sampleRate: 16000,})
 * @param {Number} numberOfMFCC - the number of mfcc you want as output,
 * can't be superior to config.bankCount
 * @returns {Array} mel Coefficients
 */
const construct = (config, numberOfMFCC = 12) => {
  if (
    !config.fftSize ||
    !config.bankCount ||
    !config.lowFrequency ||
    !config.highFrequency ||
    !config.sampleRate
  ) {
    throw new Error(`Config is not valid, at least one missing parameter`);
  }

  const filterBank = constructMelFilterBank(config);

  /**
   * Perform a full MFCC on a FFT spectrum.
   *
   * FFT Array passed in should contain frequency amplitudes only.
   *
   * Pass in truthy for debug if you wish to return outputs of each step (freq.
   * powers, melSpec, and MelCoef)
   */
  return (fft) => {
    if (fft.length !== config.fftSize) {
      const errorMessage = [
        'Passed in FFT bins were incorrect size.',
        `Expected ${config.fftSize} but was ${fft.length}`
      ];
      throw new Error(errorMessage.join(' '));
    }

    const melSpec = filterBank.filter(fft);
    const melSpecLog = melSpec.map(log_);
    return dct(melSpecLog).slice(0, numberOfMFCC);
  };
};

/**
 * Estimate the power spectrum density from FFT amplitudes.
 * @param {Array} amplitudes - Amplitudes to for the power spectrum
 * @returns {Array} Power spectrum
 */
const powerSpectrum = (amplitudes) =>
  amplitudes.map((a) => (a * a) / amplitudes.length);

export {powerSpectrum, hzToMels, melsToHz, constructMelFilterBank, construct};
