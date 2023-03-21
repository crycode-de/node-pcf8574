/*
 * Node.js PCF8574/PCF8574A
 *
 * Copyright (c) 2017-2023 Peter Müller <peter@crycode.de> (https://crycode.de)
 *               2022 - PCF8575 support inspired by Lyndel McGee <lynniemagoo@yahoo.com>
 *
 * Node.js module for controlling each pin of a PCF8574/PCF8574A I2C port expander IC.
 *
 * This example is showing you how to setup and use inputs and outputs.
 */

// Require the PCF8574 class from the pcf8574 module
//const PCF8574 = require('pcf8574').PCF8574;
const PCF8574 = require('../').PCF8574;

// Require the i2c-bus module and open the bus
const i2cBus = require('i2c-bus').openSync(1);

// Define the address of the PCF8574/PCF8574A
const addr = 0x38;

// Init a new PCF8574 with all pins high by default
// Instead of 'true' you can also use a 8-bit binary notation to define each
// pin separately, e.g. 0b00101010
const pcf = new PCF8574(i2cBus, addr, true);

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
