/*
 * Node.js PCF8574/PCF8574A
 *
 * Copyright (c) 2017 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * Node.js module for controlling each pin of a PCF8574/PCF8574A I2C port expander IC.
 */

/**
 * Namespace for types for PCF8574
 */
declare namespace PCF8574 {

  /**
   * A pin number from 0 to 7
   * @type {number}
   */
  type PinNumber = 0|1|2|3|4|5|6|7;

  /**
   * Data of an 'input' event
   * @type {Object}
   */
  type InputData = {
    /**
     * Nnumber of the pin which triggerd the event
     * @type {PinNumber}
     */
    pin: PinNumber;

    /**
     * New value of the pin
     * @type {boolean}
     */
    value: boolean;
  }
}

/**
 * The pcf8574 module
 */
declare module 'pcf8574' {

  import {EventEmitter} from 'events';
  import * as Promise from 'bluebird';
  import {I2cBus} from 'i2c-bus';

  /**
   * Class for handling a PCF8574/PCF8574A IC.
   */
  export class PCF8574 extends EventEmitter {

    /** Constant for undefined pin direction (unused pin). */
    public static readonly DIR_UNDEF;

      /** Constant for input pin direction. */
    public static readonly DIR_IN;

      /** Constant for output pin direction. */
    public static readonly DIR_OUT;

    /**
     * Constructor for a new PCF8574/PCF8574A instance.
     * If you use this IC with one or more input pins, you have to call ...
     *  a) enableInterrupt(gpioPin) to detect interrupts from the IC using a GPIO pin, or
     *  b) doPoll() frequently enough to detect input changes with manually polling.
     * @param  {I2cBus}         i2cBus       Instance of an opened i2c-bus.
     * @param  {number}         address      The address of the PCF8574/PCF8574A IC.
     * @param  {boolean|number} initialState The initial state of the pins of this IC. You can set a bitmask to define each pin seprately, or use true/false for all pins at once.
     */
    constructor(i2cBus:I2cBus, address:number, initialState:boolean|number);

    /**
     * Enable the interrupt detection on the specified GPIO pin.
     * @param {number} gpioPin BCM number of the pin, which will be used for the interrupts from the PCF8574/8574A IC.
     */
    public enableInterrupt(gpioPin:number):void;

    /**
     * Disable the interrupt detection.
     * This will unexport the interrupt GPIO, if used.
     */
    public disableInterrupt():void;

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
     * @param  {PCF8574.PinNumber} pin          The pin number. (0 to 7)
     * @param  {boolean}           inverted     true if this pin should be handled inverted (true=low, false=high)
     * @param  {boolean}           initialValue (optional) The initial value of this pin, which will be set immediatly.
     * @return {Promise}
     */
    public outputPin(pin:PCF8574.PinNumber, inverted:boolean, initialValue?:boolean):Promise<{}>;

    /**
     * Define a pin as an input.
     * This marks the pin for input processing and activates the high level on this pin.
     * @param  {PCF8574.PinNumber} pin      The pin number. (0 to 7)
     * @param  {boolean}           inverted true if this pin should be handled inverted (high=false, low=true)
     * @return {Promise}
     */
    public inputPin(pin:PCF8574.PinNumber, inverted:boolean):Promise<{}>;

    /**
     * Set the value of an output pin.
     * If no value is given, the pin will be toggled.
     * @param  {PCF8574.PinNumber} pin   The pin number. (0 to 7)
     * @param  {boolean}           value The new value for this pin.
     * @return {Promise}
     */
    public setPin(pin:number, value?:boolean):Promise<{}>;

    /**
     * Set the given value to all output pins.
     * @param  {boolean} value The new value for all output pins.
     * @return {Promise}
     */
    private setAllPins(value:boolean):Promise<{}>;

    /**
     * Returns the current value of a pin.
     * This returns the last saved value, not the value currently returned by the PCF8574/PCF9574A IC.
     * To get the current value call doPoll() first, if you're not using interrupts.
     * @param  {PCF8574.PinNumber} pin The pin number. (0 to 7)
     * @return {boolean}               The current value.
     */
    public getPinValue(pin:PCF8574.PinNumber):boolean;
  }
}
