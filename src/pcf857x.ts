/*
 * Node.js PCF8574/PCF8574A/PCF8575
 *
 * Copyright (c) 2017-2023 Peter Müller <peter@crycode.de> (https://crycode.de)
 *               2022 - PCF8575 support inspired by Lyndel McGee <lynniemagoo@yahoo.com>
 *
 * Node.js module for controlling each pin of a PCF857x I2C port expander IC.
 */
import { EventEmitter } from 'events';
import { I2CBus } from 'i2c-bus';
import { Gpio } from 'onoff';
import { PCF8574 } from './pcf8574';
import { PCF8575 } from './pcf8575';

/**
 * Enum of the known IC types.
 */
export enum PCF857x_TYPE {
  /** PCF8574/PCF8574A with 8 pins */
  PCF8574,

  /** PCF8575 IC with 16 pins */
  PCF8575
}

/**
 * Namespace for the common class PCF857x.
 */
export namespace PCF857x {
  /**
   * A pin number from 0 to 7 for PCF8574/PCF8574A or 0 to 15 for PCF8575.
   * @type {number}
   */
  export type PinNumber = PCF8574.PinNumber | PCF8575.PinNumber;

  /**
   * Possible pin directions.
   * 0 = out, 1 = in, -1 = undefined
   */
  export type PinDirection = 0 | 1 | -1;

  /**
   * Data of an 'input' event
   * @type {Object}
   */
  export type InputData<T extends PCF8574.PinNumber | PCF8575.PinNumber> = {
    /**
     * Number of the pin which triggered the event
     * @type {T}
     */
    pin: T;

    /**
     * New value of the pin
     * @type {boolean}
     */
    value: boolean;
  }
}

/**
 * Interface for events of PCF8574
 */
export interface PCF857x<PinNumber extends PCF8574.PinNumber | PCF8575.PinNumber> {
  /**
   * Emit an input event.
   * @param event 'input'
   * @param data Object containing the pin number and the value.
   */
  emit (event: 'input', data: PCF857x.InputData<PinNumber>): boolean;

  /**
   * Emitted when an input pin has changed.
   * @param event 'input'
   * @param listener Eventlistener with an object containing the pin number and the value as first argument.
   */
  on (event: 'input', listener: (data: PCF8574.InputData) => void): this;
}

/**
 * Class for handling a PCF8574/PCF8574A or PCF8585 IC.
 * This class shares common code for both types and has to be extend by a class
 * for the specific type.
 */
export abstract class PCF857x<PinNumber extends PCF8574.PinNumber | PCF8575.PinNumber> extends EventEmitter {

  /** Constant for undefined pin direction (unused pin). */
  public static readonly DIR_UNDEF = -1;

  /** Constant for input pin direction. */
  public static readonly DIR_IN = 1;

  /** Constant for output pin direction. */
  public static readonly DIR_OUT = 0;

  /** Object containing all GPIOs used by any PCF857x instance. */
  private static _allInstancesUsedGpios: Record<number, Gpio> = {};

  /** The instance of the i2c-bus, which is used for the I2C communication. */
  private _i2cBus: I2CBus;

  /** The address of the PCF857x IC. */
  private _address: number;

  /** The type of the IC. */
  private _type: PCF857x_TYPE;

  /** Number of pins the IC has. */
  private _pins: 8 | 16;

  /** Direction of each pin. By default all pin directions are undefined. */
  private _directions: Array<PCF857x.PinDirection>;

  /** Bitmask for all input pins. Used to set all input pins to high on the PCF857x IC. */
  private _inputPinBitmask: number = 0;

  /** Bitmask for inverted pins. */
  private _inverted: number;

  /** Bitmask representing the current state of the pins. */
  private _currentState: number;

  /** Flag if we are currently polling changes from the PCF857x IC. */
  private _currentlyPolling: boolean = false;

  /** Pin number of GPIO to detect interrupts, or null by default. */
  private _gpioPin: number | null = null;

  /** Instance of the used GPIO to detect interrupts, or null if no interrupt is used. */
  private _gpio: Gpio = null;

  /**
   * Constructor for a new PCF857x instance.
   * If you use this IC with one or more input pins, you have to call ...
   *  a) enableInterrupt(gpioPin) to detect interrupts from the IC using a GPIO pin, or
   *  b) doPoll() frequently enough to detect input changes with manually polling.
   * @param  {I2cBus}         i2cBus       Instance of an opened i2c-bus.
   * @param  {number}         address      The address of the PCF857x IC.
   * @param  {boolean|number} initialState The initial state of the pins of this IC. You can set a bitmask to define each pin separately, or use true/false for all pins at once.
   * @param  {PCF857x_TYPE}   type         The type of the used IC.
   */
  constructor (i2cBus: I2CBus, address: number, initialState: boolean | number, type: PCF857x_TYPE) {
    super();

    // bind the _handleInterrupt method strictly to this instance
    this._handleInterrupt = this._handleInterrupt.bind(this);

    this._i2cBus = i2cBus;
    this._type = type;

    // define type specific stuff
    switch (this._type) {
      case PCF857x_TYPE.PCF8574:
        this._pins = 8;
        break;
      case PCF857x_TYPE.PCF8575:
        this._pins = 16;
        break;
      default:
        throw new Error('Unsupported type');
    }

    // check the given address
    if (address < 0 || address > 255) {
      throw new Error('Address out of range');
    }
    this._address = address;

    // set pin directions to undefined
    this._directions = new Array(this._pins).fill(PCF857x.DIR_UNDEF);

    // nothing inverted by default
    this._inverted = 0;

    if (initialState === true) {
      initialState = Math.pow(2, this._pins) - 1;
    } else if (initialState === false) {
      initialState = 0;
    } else if (typeof (initialState) !== 'number' || initialState < 0 || initialState > Math.pow(2, this._pins) - 1) {
      throw new Error('InitialState bitmask out of range');
    }

    // save the initial state as current sate and write it to the IC
    this._currentState = initialState;
    switch (this._type) {
      case PCF857x_TYPE.PCF8574:
        this._i2cBus.i2cWriteSync(this._address, 1, Buffer.from([this._currentState & 0xFF]));
        break;
      case PCF857x_TYPE.PCF8575:
        this._i2cBus.i2cWriteSync(this._address, 2, Buffer.from([this._currentState & 0xFF, (this._currentState >>> 8) & 0xFF]));
        break;
    }
  }

  /**
   * Enable the interrupt detection on the specified GPIO pin.
   * You can use one GPIO pin for multiple instances of the PCF857x class.
   * @param {number} gpioPin BCM number of the pin, which will be used for the interrupts from the PCF8574/8574A/PCF8575 IC.
   * @throws Error if interrupt is already enabled.
   */
  public enableInterrupt (gpioPin: number): void {
    if (this._gpio !== null) {
      throw new Error('GPIO interrupt already enabled.');
    }

    if (PCF857x._allInstancesUsedGpios[gpioPin]) {
      // use already initialized GPIO
      this._gpio = PCF857x._allInstancesUsedGpios[gpioPin];
      this._gpio['pcf857xUseCount']++;
    } else {
      // init the GPIO as input with falling edge,
      // because the PCF857x will lower the interrupt line on changes
      this._gpio = new Gpio(gpioPin, 'in', 'falling');
      this._gpio['pcf857xUseCount'] = 1;
      PCF857x._allInstancesUsedGpios[gpioPin] = this._gpio;
    }
    // cache this value so we can properly nullify entry in static_allInstancesUsedGpios object during disableInterrupt calls.
    this._gpioPin = gpioPin;
    this._gpio.watch(this._handleInterrupt);
  }

  /**
   * Internal function to handle a GPIO interrupt.
   */
  private _handleInterrupt (): void {
    // poll the current state and ignore any rejected promise
    this._poll().catch(() => { /* nothing to do here */ });
  }

  /**
   * Disable the interrupt detection.
   * This will unexport the interrupt GPIO, if it is not used by an other instance of this class.
   */
  public disableInterrupt (): void {
    // release the used GPIO
    if (this._gpio !== null) {
      // remove the interrupt handling
      this._gpio.unwatch(this._handleInterrupt);

      // decrease the use count of the GPIO and unexport it if not used anymore
      this._gpio['pcf857xUseCount']--;
      if (this._gpio['pcf857xUseCount'] === 0) {
        if (this._gpioPin !== null) {
          // delete the registered gpio from our allInstancesUsedGpios object as reference count is 0 and gpio is being unexported
          delete PCF857x._allInstancesUsedGpios[this._gpioPin];
        }
        this._gpio.unexport();
      }
      this._gpioPin = null;
      this._gpio = null;
    }
  }

  /**
   * Helper function to set/clear one bit in a bitmask.
   * @param  {number}    current The current bitmask.
   * @param  {PinNumber} pin     The bit-number in the bitmask.
   * @param  {boolean}   value   The new value for the bit. (true=set, false=clear)
   * @return {number}            The new (modified) bitmask.
   */
  private _setStatePin (current: number, pin: PinNumber, value: boolean): number {
    if (value) {
      // set the bit
      return current | 1 << (pin as number);
    } else {
      // clear the bit
      return current & ~(1 << (pin as number));
    }
  }

  /**
   * Write the current state to the IC.
   * @param  {number}  newState (optional) The new state which will be set. If omitted the current state will be used.
   * @return {Promise}          Promise which gets resolved when the state is written to the IC, or rejected in case of an error.
   */
  private _setNewState (newState?: number): Promise<void> {
    return new Promise((resolve: () => void, reject: (err: Error) => void) => {

      if (typeof (newState) === 'number') {
        this._currentState = newState;
      }

      // respect inverted with bitmask using XOR
      let newIcState = this._currentState ^ this._inverted;

      // set all input pins to high
      newIcState = newIcState | this._inputPinBitmask;

      // callback function for i2c send/write
      const cb = (err: Error): void => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      };

      // send
      switch (this._type) {
        case PCF857x_TYPE.PCF8574:
          this._i2cBus.i2cWrite(this._address, 1, Buffer.from([newIcState & 0xFF]), cb);
          break;
        case PCF857x_TYPE.PCF8575:
          this._i2cBus.i2cWrite(this._address, 2, Buffer.from([newIcState & 0xFF, (newIcState >>> 8) & 0xFF]), cb);
      }
    });
  }

  /**
   * Manually poll changed inputs from the PCF857x IC.
   * If a change on an input is detected, an "input" Event will be emitted with a data object containing the "pin" and the new "value".
   * This have to be called frequently enough if you don't use a GPIO for interrupt detection.
   * If you poll again before the last poll was completed, the promise will be rejected with an error.
   * @return {Promise}
   */
  public doPoll (): Promise<void> {
    return this._poll();
  }

  /**
   * Internal function to poll the changes from the PCF857x IC.
   * If a change on an input is detected, an "input" Event will be emitted with a data object containing the "pin" and the new "value".
   * This is called if an interrupt occurred, or if doPoll() is called manually.
   * Additionally this is called if a new input is defined to read the current state of this pin.
   * @param {PinNumber} noEmit (optional) Pin number of a pin which should not trigger an event. (used for getting the current state while defining a pin as input)
   * @return {Promise}
   */
  private _poll (noEmit?: PinNumber): Promise<void> {
    if (this._currentlyPolling) {
      return Promise.reject('An other poll is in progress');
    }

    this._currentlyPolling = true;

    return new Promise((resolve: () => void, reject: (err: Error) => void) => {
      // helper function to process the read data for all IC types
      const processRead = (readState: number): void => {
        // respect inverted with bitmask using XOR
        readState = readState ^ this._inverted;

        // check each input for changes
        for (let pin = 0; pin < this._pins; pin++) {
          if (this._directions[pin] !== PCF857x.DIR_IN) {
            continue; // isn't an input pin
          }
          if ((this._currentState >> pin) % 2 !== (readState >> pin) % 2) {
            // pin changed
            const value: boolean = ((readState >> pin) % 2 !== 0);
            this._currentState = this._setStatePin(this._currentState, pin as PinNumber, value);
            if (noEmit !== pin) {
              this.emit('input', <PCF857x.InputData<PinNumber>>{ pin: pin, value: value });
            }
          }
        }

        resolve();
      }

      // read from the IC - type specific
      switch (this._type) {
        case PCF857x_TYPE.PCF8574:
          this._i2cBus.i2cRead(this._address, 1, Buffer.alloc(1), (err: Error, bytesRead: number, buffer: Buffer) => {
            this._currentlyPolling = false;
            if (err || bytesRead !== 1) {
              reject(err);
              return;
            }

            // Readstate is 8 bits.  Pins 0-7 are in byte.
            const readState = buffer[0];

            processRead(readState);
          });
          break;

        case PCF857x_TYPE.PCF8575:
          this._i2cBus.i2cRead(this._address, 2, Buffer.alloc(2), (err: Error, bytesRead: number, buffer: Buffer) => {
            this._currentlyPolling = false;
            if (err || bytesRead !== 2) {
              reject(err);
              return;
            }

            // Readstate is 16 bit reverse of byte ordering.  Pins 0-7 are in byte 0.  Pins 8-15 are in byte 1.
            const readState = buffer[0] | buffer[1] << 8;

            processRead(readState);
          });
          break;
      }
    });
  }

  /**
   * Define a pin as an output.
   * This marks the pin to be used as an output pin.
   * @param  {PinNumber} pin                  The pin number. (0 to 7 for PCF8574/PCF8574A, 0 to 15 for PCF8575)
   * @param  {boolean}           inverted     true if this pin should be handled inverted (true=low, false=high)
   * @param  {boolean}           initialValue (optional) The initial value of this pin, which will be set immediately.
   * @return {Promise}
   */
  public outputPin (pin: PinNumber, inverted: boolean, initialValue?: boolean): Promise<void> {
    if (pin < 0 || pin > (this._pins - 1)) {
      return Promise.reject(new Error('Pin out of range'));
    }

    this._inverted = this._setStatePin(this._inverted, pin, inverted);

    this._inputPinBitmask = this._setStatePin(this._inputPinBitmask, pin, false);

    this._directions[pin as number] = PCF857x.DIR_OUT;

    // set the initial value only if it is defined, otherwise keep the last value (probably from the initial state)
    if (typeof (initialValue) === 'undefined') {
      return Promise.resolve(null);
    } else {
      return this._setPinInternal(pin, initialValue);
    }
  }

  /**
   * Define a pin as an input.
   * This marks the pin for input processing and activates the high level on this pin.
   * @param  {PinNumber} pin              The pin number. (0 to 7 for PCF8574/PCF8574A, 0 to 15 for PCF8575)
   * @param  {boolean}           inverted true if this pin should be handled inverted (high=false, low=true)
   * @return {Promise}
   */
  public inputPin (pin: PinNumber, inverted: boolean): Promise<void> {
    if (pin < 0 || pin > (this._pins - 1)) {
      return Promise.reject(new Error('Pin out of range'));
    }

    this._inverted = this._setStatePin(this._inverted, pin, inverted);

    this._inputPinBitmask = this._setStatePin(this._inputPinBitmask, pin, true);

    this._directions[pin as number] = PCF857x.DIR_IN;

    // call _setNewState() to activate the high level on the input pin ...
    return this._setNewState()
      // ... and then poll all current inputs with noEmit on this pin to suppress the event
      .then(() => {
        return this._poll(pin);
      });
  }

  /**
   * Set the value of an output pin.
   * If no value is given, the pin will be toggled.
   * @param  {PinNumber} pin   The pin number. (0 to 7 for PCF8574/PCF8574A, 0 to 15 for PCF8575)
   * @param  {boolean}   value The new value for this pin.
   * @return {Promise}
   */
  public setPin (pin: PinNumber, value?: boolean): Promise<void> {
    if (pin < 0 || pin > (this._pins - 1)) {
      return Promise.reject(new Error('Pin out of range'));
    }

    if (this._directions[pin as number] !== PCF857x.DIR_OUT) {
      return Promise.reject(new Error('Pin is not defined as output'));
    }

    if (typeof (value) == 'undefined') {
      // set value dependend on current state to toggle
      value = !((this._currentState >> (pin as number)) % 2 !== 0)
    }

    return this._setPinInternal(pin, value);
  }

  /**
   * Internal function to set the state of a pin, regardless its direction.
   * @param  {PinNumber} pin   The pin number. (0 to 7 for PCF8574/PCF8574A, 0 to 15 for PCF8575)
   * @param  {boolean}   value The new value.
   * @return {Promise}
   */
  private _setPinInternal (pin: PinNumber, value: boolean): Promise<void> {
    const newState: number = this._setStatePin(this._currentState, pin, value);

    return this._setNewState(newState);
  }

  /**
   * Set the given value to all output pins.
   * @param  {boolean} value The new value for all output pins.
   * @return {Promise}
   */
  public setAllPins (value: boolean): Promise<void> {
    let newState: number = this._currentState;

    for (let pin = 0; pin < this._pins; pin++) {
      if (this._directions[pin] !== PCF857x.DIR_OUT) {
        continue; // isn't an output pin
      }
      newState = this._setStatePin(newState, pin as PinNumber, value);
    }

    return this._setNewState(newState);
  }

  /**
   * Returns the current value of a pin.
   * This returns the last saved value, not the value currently returned by the PCF857x IC.
   * To get the current value call doPoll() first, if you're not using interrupts.
   * @param  {PinNumber} pin The pin number. (0 to 7 for PCF8574/PCF8574A, 0 to 15 for PCF8575)
   * @return {boolean}       The current value.
   */
  public getPinValue (pin: PinNumber): boolean {
    if (pin < 0 || pin > (this._pins - 1)) {
      return false;
    }
    return ((this._currentState >> (pin as number)) % 2 !== 0)
  }
}
