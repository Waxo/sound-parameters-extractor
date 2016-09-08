module.exports = {
  mfcc: require('./src/mfcc'),
  framer: require('./src/framer').framer,
  parameters: require('./src/parameters'),
  getParamsFromFile: require('./src/params-from-file').getParamsFromFile,
  arrayToRaw: require('./src/write-to-raw').arrayToRaw
};
