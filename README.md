# pcf8574

[![NPM version](https://img.shields.io/npm/v/pcf8574.svg)](https://www.npmjs.com/package/pcf8574)
[![Downloads](https://img.shields.io/npm/dm/pcf8574.svg)](https://www.npmjs.com/package/pcf8574)
[![Known Vulnerabilities](https://snyk.io/test/github/crycode-de/node-pcf8574/badge.svg)](https://snyk.io/test/github/crycode-de/node-pcf8574)

[![NPM](https://nodei.co/npm/pcf8574.png?downloads=true)](https://nodei.co/npm/pcf8574/)

**Tests:** ![Test and Release](https://github.com/crycode-de/node-pcf8574/workflows/Test%20and%20Release/badge.svg)

Control each pin of a PCF8574/PCF8574A/PCF8574P/PCF8575 I2C port expander IC.

The **PCF8574/PCF8574A** is an 8 bit/pin port expander IC, which can be controlled over the I2C-Bus.
Each of the 8 pins can be separately used as an input or output.
It also offers an interrupt signal, which can be used to detect input changes by the I2C master (e.g. a Raspberry Pi).
For more information about the PCF8574/PCF8574A please consult the [datasheet from Texas Instruments](http://www.ti.com/lit/ds/symlink/pcf8574.pdf).

The **PCF8575** is a 16 bit/pin port expander IC similar to the PCF8574.
For more information about the PCF8575 please consult the [datasheet from Texas Instruments](https://www.ti.com/lit/ds/symlink/pcf8575.pdf).

**Supported (tested) Node.js versions:** 10, 12, 14, 16, 18, 20

## Installation

```
npm install pcf8574
```

TypeScript typings are included in this package.

You should be able to use this module on any Linux based OS.

To use the interrupt detection you need a Raspberry Pi or a similar board.

## Examples

Note that you need to construct the [i2c-bus](https://npmjs.org/package/i2c-bus) object
and pass it in to the module along with the I2C address of the PCF8574/PCF8574A/PCF8575.

The example blow can be found in the [examples directory](https://github.com/crycode-de/node-pcf8574/tree/master/examples) of this package together with a TypeScript example.

```js
// Require PCF8574 class from the pcf8574 module
const PCF8574 = require('pcf8574').PCF8574;

// For PCF8575 use the PCF8575 class
// const PCF8575 = require('pcf8574').PCF8575;

// Or use ES6 style imports
// import { PCF8574 } from 'pcf8574';
// import { PCF8575 } from 'pcf8574';

// Require the i2c-bus module and open the bus
const i2cBus = require('i2c-bus').openSync(1);

// Define the address of the PCF8574/PCF8574A/PCF8575
// Default addresses: PCF8574A - 0x38; PCF8574/PCF8575 - 0x20;
const addr = 0x38;

// Init a new PCF8574 with all pins high by default
// Instead of 'true' you can also use a 8-bit binary notation to define each
// pin separately, e.g. 0b00101010
const pcf = new PCF8574(i2cBus, addr, true);

// Same for PCF8575
// const pcf = new PCF8575(i2cBus, addr, true);

// Enable interrupt detection on BCM pin 17 (which is GPIO.0)
pcf.enableInterrupt(17);

// Alternatively you can use for example an interval for manually poll every 250ms
// setInterval(pcf.doPoll.bind(pcf), 250);

// Note the missing ; at the end of the following lines.
// This is a Promise chain!

// Define pin 0 as inverted output with initally false
pcf.outputPin(0, true, false)

// Then define pin 1 as inverted output with initally true
.then(() => {
  return pcf.outputPin(1, true, true);
})

// Then define pin 7 as non inverted input
.then(() => {
  return pcf.inputPin(7, false);
})

// Delay 1 second
.then(() => new Promise((resolve) => {
  setTimeout(resolve, 1000);
}))

// Then turn the pin on
.then(() => {
  console.log('turn pin 0 on');
  return pcf.setPin(0, true);
})

// Delay 1 second
.then(() => new Promise((resolve) => {
  setTimeout(resolve, 1000);
}))

// Then turn the pin off
.then(() => {
  console.log('turn pin 0 off');
  return pcf.setPin(0, false);
});

// Add an event listener on the 'input' event
pcf.on('input', (data) => {
  console.log('input', data);

  // Check if a button attached to pin 7 is pressed (signal goes low)
  if(data.pin === 7 && data.value === false){
    // Toggle pin 1
    pcf.setPin(1);
  }
});

// Handler for clean up on SIGINT (ctrl+c)
process.on('SIGINT', () => {
  pcf.removeAllListeners();
  pcf.disableInterrupt();
});
```


## API

The API uses __Events__ for detected input changes and __Promises__ for all asyncronous actions.

Input changes can be detected in two ways:
* Using a GPIO to observe the interrupt signal from the PCF8574/PCF8574A/PCF8575 IC. *Recommended on Raspberry Pi or similar.*
* Call `doPoll()` manually frequently enough to actively read the current states. This leads to a higher load on the I2C-Bus.

If a pin is defined as an input and a changed state is detected, an `input` Event will be emitted with an object containing the `pin` number and the new `value` of this pin.

You can set an inverted flag for each pin separately, which will result in an inverted input or output.
If an inverted input has a low level it will be interpreted as true and a high level will be false.
An inverted output will write a low level if you set it to true and write a high level if false.


### new PCF8574(i2cBus, address, initialState)
```ts
constructor (i2cBus: I2CBus, address: number, initialState: boolean | number);
```
Constructor for a new PCF8574/PCF8574A instance.

* `i2cBus` - Instance of an opened i2c-bus.
* `address` - The address of the PCF8574/PCF8574A IC.
* `initialState` - The initial state of the pins of this IC. You can set a bitmask (e.g. *0b00101010*) to define each pin seprately, or use true/false for all pins at once.

Note that you need to construct the [i2c-bus](https://npmjs.org/package/i2c-bus) object and pass it in to the module.

If you use this IC with one or more input pins, you have to call
* `enableInterrupt(gpioPin)` to detect interrupts from the IC using a GPIO pin, or
* `doPoll()` frequently enough to detect input changes with manually polling.

### new PCF8575(i2cBus, address, initialState)
```ts
constructor (i2cBus: I2CBus, address: number, initialState: boolean | number);
```
Constructor for a new PCF8575 instance.

* `i2cBus` - Instance of an opened i2c-bus.
* `address` - The address of the PCF8575 IC.
* `initialState` - The initial state of the pins of this IC. You can set a bitmask (e.g. *0b0000111100101010*) to define each pin seprately, or use true/false for all pins at once.

Note that you need to construct the [i2c-bus](https://npmjs.org/package/i2c-bus) object and pass it in to the module.

If you use this IC with one or more input pins, you have to call
* `enableInterrupt(gpioPin)` to detect interrupts from the IC using a GPIO pin, or
* `doPoll()` frequently enough to detect input changes with manually polling.

### enableInterrupt(gpioPin)
```ts
enableInterrupt (gpioPin: number): void;
```
Enable the interrupt detection on the specified GPIO pin.
You can use one GPIO pin for multiple instances of the PCF8574 class.

* `gpioPin` - BCM number of the pin, which will be used for the interrupts from the PCF8574/8574A/PCF8575 IC.


### disableInterrupt()
```ts
disableInterrupt (): void;
```
Disable the interrupt detection.
This will unexport the interrupt GPIO, if it is not used by an other instance of this class.


### doPoll()
```ts
doPoll (): Promise<void>;
```
Manually poll changed inputs from the PCF8574/PCF8574A/PCF8575 IC.

If a change on an input is detected, an `input` Event will be emitted with a data object containing the `pin` and the new `value`.

This have to be called frequently enough if you don't use a GPIO for interrupt detection.

Poll requests will be queued internally up to 4 total requests (one active and three waiting) including polls triggered by interrupts.  
If you try to trigger a poll while the queue is already full, the new poll will be rejected.  
This is due to not have too many unnecessary polls.


### isPolling()
```ts
isPolling (): boolean;
```
Get the current polling state.
Returns `true` if currently a poll is active or `false` if no poll is active.


### outputPin(pin, inverted, initialValue)
```ts
outputPin (pin: PCF8574.PinNumber | PCF8575.PinNumber, inverted: boolean, initialValue?: boolean): Promise<void>;
```
Define a pin as an output.
This marks the pin to be used as an output pin.
Returns a Promise which will be resolved when the pin is ready.

* `pin` - The pin number. (0 to 7 for PCF8574, 0 to 15 for PCF8575)
* `inverted` - true if this pin should be handled inverted (true=low, false=high)
* `initialValue` - (optional) The initial value of this pin, which will be set immediatly.


### inputPin(pin, inverted)
```ts
inputPin (pin: PCF8574.PinNumber | PCF8575.PinNumber, inverted: boolean): Promise<>;
```
Define a pin as an input.
This marks the pin for input processing and activates the high level on this pin.
Returns a Promise which will be resolved when the pin is ready.

* `pin` - The pin number. (0 to 7 for PCF8574, 0 to 15 for PCF8575)
* `inverted` - true if this pin should be handled inverted (high=false, low=true)

Note that an input is always set to high (pullup) internally.


### setPin(pin, value)
```ts
setPin (pin: PCF8574.PinNumber | PCF8575.PinNumber, value?: boolean): Promise<void>;
```
Set the value of an output pin.
If no value is given, the pin will be toggled.
Returns a Promise which will be resolved when the new value is written to the IC.

* `pin` - The pin number. (0 to 7 for PCF8574, 0 to 15 for PCF8575)
* `value` - The new value for this pin.


### setAllPins(value)
```ts
setAllPins (value: boolean): Promise<void>;
```
Set the given value to all output pins.
Returns a Promise which will be resolved when the new values are written to the IC.

* `value` - The new value for this pin.


### getPinValue(pin)
```ts
getPinValue (pin: PCF8574.PinNumber | PCF8575.PinNumber): boolean;
```
Returns the current value of a pin.
This returns the last saved value, not the value currently returned by the PCF8574/PCF9574A/PCF8575 IC.
To get the current value call doPoll() first, if you're not using interrupts.

* `pin` - The pin number. (0 to 7 for PCF8574, 0 to 15 for PCF8575)


## License

Licensed under GPL Version 2

Copyright (c) 2017-2023 Peter Müller <peter@crycode.de> (<https://crycode.de/>)
2022 - PCF8575 support inspired by Lyndel McGee <lynniemagoo@yahoo.com>
