import {retrievePercent_} from './private-tools.js';

/**
 * Divide the signal in the right amount on window according to the size.
 * The latest windows will be filled with 0.
 * @param {Array} signal - the signal before windowing
 * @param {Number} windowSize - size of the windows wanted, must be power of
 * 2 for fft processing
 * @param {String} overlap - Percentage of overlapping between two window.
 * @return {Array} the signal windowed
 */
const framer = (signal, windowSize, overlap) => {
  const framedArray = [];
  const overlapSize = windowSize / retrievePercent_(overlap);
  for (let i = 0; i < signal.length; i += overlapSize) {
    framedArray.push(signal.slice(i, i + windowSize));
  }

  framedArray.map((a) => {
    while (a.length < windowSize) {
      a.push(0);
    }

    return a;
  });
  return framedArray;
};

export {framer};
