/*
 * Node.js PCF8574/PCF8574A
 *
 * Copyright (c) 2017 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * Node.js module for communication with a PCF8574/PCF8574A I2C port expander IC.
 */

declare module 'pcf8574' {

  import {EventEmitter} from 'events';
  import * as Promise from 'bluebird';
  import {I2cBus} from 'i2c-bus';

  /**
  * The RadioHeadSerial Class.
  */
  export class PCF8574 extends EventEmitter {

    /** Constant for undefined pin direction (unused pin). */
    public static readonly DIR_UNDEF;

      /** Constant for input pin direction. */
    public static readonly DIR_IN;

      /** Constant for output pin direction. */
    public static readonly DIR_OUT;

    /**
     * Constructor for a PCF8574/PCF8574A IC.
     * @param  {I2cBus}         i2cBus       Instance of an opened i2c-bus.
     * @param  {number}         address      The address of the PCF8574/PCF8574A IC.
     * @param  {boolean|number} initialState The initial state of the pins of this IC. You can set a bitmask to define each pin seprately, or use true/false for all pins at once.
     * @param  {number}         gpioPin      (optional) BCM number of the pin, which will be used for the interrupts from the PCF8574/8574A IC. If not set you have to call doPoll() frequently enough to detect input changes.
     */
    constructor(i2cBus:I2cBus, address:number, initialState:boolean|number, gpioPin:number);

    /**
     * Manually poll changed inputs from the PCF8574/PCF8574A IC.
     * If a change on an input is detected, an "input" Event will be emitted with a data object containing the "pin" and the new "value".
     * This have to be called frequently enough if you don't use a GPIO for interrupt detection.
     * If you poll again before the last poll was completed, the promise will be rejected with an error.
     * @return {Promise}
     */
    public doPoll():Promise<{}>;

    /**
     * Define a pin as an output.
     * This marks the pin to be used as an output pin.
     * @param  {number}  pin          The pin.
     * @param  {boolean} inverted     true if this pin should be handled inverted (true=low, false=high)
     * @param  {boolean} initialValue (optional) The initial value of this pin, which will be set immediatly.
     * @return {Promise}
     */
    public outputPin(pin:number, inverted:boolean, initialValue?:boolean):Promise<{}>;

    /**
     * Define a pin as an input.
     * This marks the pin for input processing and activates the high level on this pin.
     * @param  {number}  pin      The pin.
     * @param  {boolean} inverted true if this pin should be handled inverted (high=false, low=true)
     * @return {Promise}
     */
    public inputPin(pin:number, inverted:boolean):Promise<{}>;

    /**
     * Set the value of an output pin.
     * If no value is given, the pin will be toggled.
     * @param  {number}  pin   The pin.
     * @param  {boolean} value The new value for this pin.
     * @return {Promise}
     */
    public setPin(pin:number, value?:boolean):Promise<{}>;

    /**
     * Set the given value to all output pins.
     * @param  {boolean}  value The new value for all output pins.
     * @return {Promise}
     */
    private setAllPins(value:boolean):Promise<{}>;

    /**
     * Get the current value of a pin.
     * This returns the last saved value, not the value currently returned by the PCF8574/PCF9574A IC.
     * To get the current value call doPoll() first, if you're not using interrupts.
     * @param  {number}  pin The pin.
     * @return {boolean}     The current value.
     */
    public getPinValue(pin:number):boolean;

    /**
     * Can be called to clean up.
     * This will unexport the interrupt GPIO, if used.
     */
    public destroy():void;
  }
}
