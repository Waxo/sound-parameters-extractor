const fs = require('fs');

/**
 * Convert a two dimensional array to RAW file for ALIZE
 * @param {Array} array - The two dimensional array i.e. [frame, frame, ...]
 * @param {String} outputName - Name of the output file
 * @param {String} outputPath - Path of the output file (optional)
 */
const arrayToRaw = (array, outputName, outputPath = '') => {
  const output = (outputPath) ? `${outputPath}${outputName}` : outputName;
  const buff = new Buffer(array.length * array[0].length * 4);
  array.forEach((frame, idx) => {
    frame.forEach((value, index) => {
      buff.writeFloatLE(value, ((idx * frame.length) + index) * 4);
    });
  });
  const wStream = fs.createWriteStream(output);
  wStream.write(buff);
  wStream.end();
};

module.exports = {arrayToRaw};
