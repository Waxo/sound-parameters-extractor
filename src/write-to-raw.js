import {Buffer} from 'node:buffer';

import fs from 'fs-extra';

// Disclaimer : I'm no longer working with ALIZE, so I disabled code-style
// If you're working with ALIZE, create an issue, and I'll upgrade this code

/**
 * Convert a two dimensional array to RAW file for ALIZE
 * @param {Array} array - The two dimensional array i.e. [frame, frame, ...]
 * @param {String} outputName - Name of the output file
 * @param {String} outputPath - Path of the output file (optional)
 */
const arrayToRaw = (array, outputName, outputPath = '') => {
  const output = `${outputPath || '.'}/${outputName}`;
  // eslint-disable-next-line unicorn/no-array-reduce
  const array_ = new Float32Array(array.reduce((a, b) => a.concat(b)));
  // Working : const buff = new Buffer(array_.length * 4);
  const buff = Buffer.from(array_);
  for (const [idx, value] of array_.entries()) {
    buff.writeFloatLE(value, idx * 4);
  }

  return fs
    .ensureDir(outputPath || '.')
    .then(() => fs.writeFile(output, buff, 'binary'));
};

export {arrayToRaw};
