const BluebirdPromise = require('bluebird');
const fs = BluebirdPromise.promisifyAll(require('fs-extra'));

/**
 * Convert a two dimensional array to RAW file for ALIZE
 * @param {Array} array - The two dimensional array i.e. [frame, frame, ...]
 * @param {String} outputName - Name of the output file
 * @param {String} outputPath - Path of the output file (optional)
 */
const arrayToRaw = (array, outputName, outputPath = '') => {
  const output = `${outputPath || '.'}/${outputName}`;
  const arr = new Float32Array(array.reduce((a, b) => a.concat(b)));
  const buff = new Buffer(arr.length * 4);
  arr.forEach((value, idx) => {
    buff.writeFloatLE(value, idx * 4);
  });
  return fs.ensureDirAsync(outputPath || '.')
    .then(() => fs.writeFileAsync(output, buff, 'binary'));
};

module.exports = {arrayToRaw};
