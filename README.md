# Sound parameters extractor

[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

This package helps you to get the acoustics parameters for a given sound
and provides some tools to add others parameters.

Feel free to contribute or discuss my choices.

The MFCC code comes from : [vails-systems](https://github.com/vail-systems/node-mfcc) implementation.
The package was broken for me so I decided to fix it and provide some new tools.

## Contents
* [Installation](#installation)
* [Usage](#usage)
  * [Basic usage](#basic-usage)
  * [Advanced usage](#advanced-usage)
    * [Framer](#framer)
    * [MFCC](#mfcc)
    * [Parameters](#parameters)
      * [Zero Crossing Rate](#zero-crossing-rate)
      * [Spectral roll off point](#spectral-roll-off-point)
      * [Spectral centroid](#spectral-centroid)
      * [Deltas](#deltas)
      * [FFT Modulus](#fft-modulus)

## Installation
`npm install --save sound-parameters-extractor`

## Usage
### Basic usage

Read the wav file and then write the MFCC in a binary format
(usable by [Alize](http://mistral.univ-avignon.fr/)) 

```javascript
const soundExtractor = require('sound-parameters-extractor');

const config = {
  fftSize: 32,
  bankCount: 24,
  lowFrequency: 1,
  highFrequency: 8000, // samplerate/2 here
  sampleRate: 16000
};

soundExtractor.getParamsFromFile('sound.wav', config, 16)
.then(params => {
  console.log(params);
  soundExtractor.arrayToRaw(params.mfcc, 'sound.raw');
});
 
```

### Advanced usage
#### Framer
Divides the signal in frames, the end of the signal will be filled with 0.

```javascript
const {framer} = require('sound-parameters-extractor');

const windowSize = 4;
const overlap = '50%';

const signal = new Array(64).fill(0).map((val, index) => index);
const framedSignal = framer(signal, windowSize, overlap);
console.log(framedSignal);
//[[0, 1, 2, 3], [2, 3, 4, 5], [4, 5, 6, 7], ...]
```

#### MFCC
Computes the MFCC for a given signal

```javascript
const fft = require('fft-js'); // is dependency
const {framer, mfcc} = require('sound-parameters-extractor');

const config = {
  fftSize: 32,
  bankCount: 24,
  lowFrequency: 1,
  highFrequency: 8000, // samplerate/2 here
  sampleRate: 16000
};
const windowSize = config.fftSize * 2;
const overlap = '50%';
const mfccSize = 12;

const signal = new Array(1024).fill(0).map((val, index) => index);
const framedSignal = framer(signal, windowSize, overlap);

//mfccSize is optionnal default 12
const mfccMatrix = mfcc.construct(config, mfccSize);
const mfccSignal = framedSignal.map(window => {
  const phasors = fft.fft(window);
  return mfccMatrix(fft.util.fftMag(phasors));
});

console.log(mfccSignal);
// mfccSignal contains the mel-frenquencies
```

#### Parameters
##### Zero Crossing Rate
Computes the number of times the signal cross 0. Must be computed on the signal.
  
###### `zeroCrossingRate(window)`
Formal application of the formula.
  
######`zeroCrossingRateClipping(window, threshold)`
Allows you to use a threshold for better noise resistance. This method gives the
same result but has better performance than the formal one.

##### Spectral roll off point
###### `spectralRollOffPoint(frame, sampleRate, cutoff, hz = false)`
Computes the spectral roll-off point on a given frame.
Is computed on the modulus of the fft (don't forget to delete the first half of the FFT).

If hz is true the return will be in hertz, if not it's the index in the vector.

##### Spectral centroid
###### `spectralCentroid(frame)`
Computes the spectral centroid on a given frame.
It's computed on the modulus of the fft (don't forget to delete the first half of the FFT).

##### Deltas
###### `deltaFrameAllSignal(acousticVectors, overlap)`
Uses `deltaFrame` to compute the derivative, used for MFCC.
Implementation of derivative formula from [Practical Cryptography](http://practicalcryptography.com/miscellaneous/machine-learning/guide-mel-frequency-cepstral-coefficients-mfccs/)
Use it on the deltaParameters to have the delta delta.

###### `deltaCustomAllSignal(acousticVectors)` and `deltaDeltaCustomAllSignal(acousticVectors)`
Use a taylor decomposition to estimate the first and second derivative.
The delta delta are computed on the acoustic vector (and not the deltas) to minimize the approximation.

##### FFT Modulus
###### `modulusFFT(frame)`
Computes the modulus of the FFT for a given frame.
You may want to delete the first half of the FFT before computing its modulus.