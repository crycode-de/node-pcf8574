/*
 * Node.js PCF8574/PCF8574A
 *
 * Copyright (c) 2017 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * Node.js module for communication with a PCF8574/PCF8574A I2C port expander IC.
 */
import {EventEmitter} from 'events';
import * as Promise from 'bluebird';
import {I2cBus} from 'i2c-bus';
import {Gpio} from 'onoff';

/**
 * Class for handling a PCF8574/PCF8574A IC.
 */
export class PCF8574 extends EventEmitter {

  /** Constant for undefined pin direction (unused pin). */
  public static readonly DIR_UNDEF = -1;

    /** Constant for input pin direction. */
  public static readonly DIR_IN = 1;

    /** Constant for output pin direction. */
  public static readonly DIR_OUT = 0;

  /** The instance of the i2c-bus, which is used for the I2C communication. */
  private _i2cBus:I2cBus;

  /** The address of the PCF8574/PCF8574A IC. */
  private _address:number;

  /** Direction of each pin. By default all pin directions are undefined. */
  private _directions:Array<number> = [
    PCF8574.DIR_UNDEF, PCF8574.DIR_UNDEF, PCF8574.DIR_UNDEF, PCF8574.DIR_UNDEF,
    PCF8574.DIR_UNDEF, PCF8574.DIR_UNDEF, PCF8574.DIR_UNDEF, PCF8574.DIR_UNDEF
  ];

  /** Bitmask for all input pins. Used to set all input pins to high on the PCF8574/PCF8574A IC. */
  private _inputPinBitmask:number = 0;

  /** Bitmask for inverted pins. */
  private _inverted:number;

  /** Bitmask representing the current state of the pins. */
  private _currentState:number;

  /** Flag if we are currently polling changes from the PCF8574/PCF8574A IC. */
  private _currentlyPolling:boolean = false;

  /** Instance of the used GPIO to detect interrupts, or null if no interrupt is used. */
  private _gpio:Gpio = null;

  /**
   * Constructor for a PCF8574/PCF8574A IC.
   * @param  {I2cBus}         i2cBus       Instance of an opened i2c-bus.
   * @param  {number}         address      The address of the PCF8574/PCF8574A IC.
   * @param  {boolean|number} initialState The initial state of the pins of this IC. You can set a bitmask to define each pin seprately, or use true/false for all pins at once.
   * @param  {number}         gpioPin      (optional) BCM number of the pin, which will be used for the interrupts from the PCF8574/8574A IC. If not set you have to call doPoll() frequently enough to detect input changes.
   */
  constructor(i2cBus:I2cBus, address:number, initialState:boolean|number, gpioPin:number){
    super();

    this._i2cBus = i2cBus;

    if(address < 0 || address > 255){
      throw new Error('Address out of range');
    }
    this._address = address;

    // nothing inverted by default
    this._inverted = 0;

    if(initialState === true){
      initialState = 255;
    }else if(initialState === false){
      initialState = 0;
    }else if(typeof(initialState) !== 'number' || initialState < 0 || initialState > 255){
      throw new Error('InitalState bitmask out of range');
    }
    // save the inital state as current sate and write it to the IC
    this._currentState = initialState;
    this._i2cBus.sendByteSync(this._address, this._currentState);

    // setup the GPIO if set
    if(typeof(gpioPin) === 'number'){
      // init the GPIO as input with falling edge,
      // because the PCF8574/PCF8574A will lower the interrupt line on changes
      this._gpio = new Gpio(gpioPin, 'in', 'falling');
      this._gpio.watch(()=>{
        // poll the current state and ignore any rejected promise
        this._poll().catch(()=>{ });
      });
    }
  }

  /**
   * Helper function to set/clear one bit in a bitmask.
   * @param  {number}  current The current bitmask.
   * @param  {number}  pin     The bit-number in the bitmask.
   * @param  {boolean} value   The new value for the bit. (true=set, false=clear)
   * @return {number}          The new (modified) bitmask.
   */
  private _setStatePin(current:number, pin:number, value:boolean):number{
    if(value){
      // set the bit
      return current | 1 << pin;
    }else{
      // clear the bit
      return current & ~(1 << pin);
    }
  }

  /**
   * Write the current stateto the IC.
   * @param  {number}  newState (optional) The new state which will be set. If omitted the current state will be used.
   * @return {Promise}          Promise which gets resolved when the state is written to the IC, or rejected in case of an error.
   */
  private _setNewState(newState?:number):Promise<{}>{
    return new Promise((resolve:()=>void, reject:(err:Error)=>void)=>{

      if(typeof(newState) === 'undefined'){
        newState = this._currentState;
      }

      // repect inverted with bitmask using XOR
      let newIcState = newState ^ this._inverted;

      // set all input pins to high
      newIcState = newIcState | this._inputPinBitmask;

      this._i2cBus.sendByte(this._address, newIcState, (err:Error)=>{
        if(err){
          reject(err);
        }else{
          this._currentState = newState;
          resolve();
        }
      });
    });
  }

  /**
   * Manually poll changed inputs from the PCF8574/PCF8574A IC.
   * If a change on an input is detected, an "input" Event will be emitted with a data object containing the "pin" and the new "value".
   * This have to be called frequently enough if you don't use a GPIO for interrupt detection.
   * If you poll again before the last poll was completed, the promise will be rejected with an error.
   * @return {Promise}
   */
  public doPoll():Promise<{}>{
    return this._poll();
  }

  /**
   * Internal function to poll the changes from the PCF8574/PCF8574A IC.
   * If a change on an input is detected, an "input" Event will be emitted with a data object containing the "pin" and the new "value".
   * This is called if an interrupt occured, or if doPoll() is called manually.
   * Additionally this is called if a new input is defined to read the current state of this pin.
   * @param {number} noEmit (optional) Pin number of a pin which should not trigger an event. (used for getting the current state while defining a pin as input)
   * @return {Promise}
   */
  private _poll(noEmit?:number):Promise<{}>{
    if(this._currentlyPolling){
      return Promise.reject('An other poll is in progress');
    }

    this._currentlyPolling = true;

    return new Promise((resolve:()=>void, reject:(err:Error)=>void)=>{
      // read from the IC
      this._i2cBus.receiveByte(this._address,(err:Error, readState:number)=>{
        this._currentlyPolling = false;
        if(err){
          reject(err);
          return;
        }

        // repect inverted with bitmask using XOR
        readState = readState ^ this._inverted;

        // check each input for changes
        for(let pin = 0; pin < 8; pin++){
          if(this._directions[pin] !== PCF8574.DIR_IN){
            continue; // isn't an input pin
          }
          if((this._currentState>>pin) % 2 !== (readState>>pin) % 2){
            // pin changed
            let value:boolean = ((readState>>pin) % 2 !== 0);
            this._currentState = this._setStatePin(this._currentState, pin, value);
            if(noEmit !== pin){
              this.emit('input', {pin: pin, value: value});
            }
          }
        }

        resolve();
      });
    });
  }

  /**
   * Define a pin as an output.
   * This marks the pin to be used as an output pin.
   * @param  {number}  pin          The pin.
   * @param  {boolean} inverted     true if this pin should be handled inverted (true=low, false=high)
   * @param  {boolean} initialValue (optional) The initial value of this pin, which will be set immediatly.
   * @return {Promise}
   */
  public outputPin(pin:number, inverted:boolean, initialValue?:boolean):Promise<{}>{
    if(pin < 0 || pin > 7){
      return Promise.reject(new Error('Pin out of range'));
    }

    this._inverted = this._setStatePin(this._inverted, pin, inverted);

    this._inputPinBitmask = this._setStatePin(this._inputPinBitmask, pin, false);

    this._directions[pin] = PCF8574.DIR_OUT;

    // set the initial value only if it is defined, otherwise keep the last value (probably from the initial state)
    if(typeof(initialValue) === 'undefined'){
      return Promise.resolve(null);
    }else{
      return this._setPinInternal(pin, initialValue);
    }
  }

  /**
   * Define a pin as an input.
   * This marks the pin for input processing and activates the high level on this pin.
   * @param  {number}  pin      The pin.
   * @param  {boolean} inverted true if this pin should be handled inverted (high=false, low=true)
   * @return {Promise}
   */
  public inputPin(pin:number, inverted:boolean):Promise<{}>{
    if(pin < 0 || pin > 7){
      return Promise.reject(new Error('Pin out of range'));
    }

    this._inverted = this._setStatePin(this._inverted, pin, inverted);

    this._inputPinBitmask = this._setStatePin(this._inputPinBitmask, pin, true);

    this._directions[pin] = PCF8574.DIR_IN;

    // call _setNewState() to activate the high level on the input pin ...
    return this._setNewState()
    // ... and then poll all current inputs with noEmit on this pin to suspress the event
    .then(()=>{
      return this._poll(pin);
    });
  }

  /**
   * Set the value of an output pin.
   * If no value is given, the pin will be toggled.
   * @param  {number}  pin   The pin.
   * @param  {boolean} value The new value for this pin.
   * @return {Promise}
   */
  public setPin(pin:number, value?:boolean):Promise<{}>{
    if(pin < 0 || pin > 7){
      return Promise.reject(new Error('Pin out of range'));
    }

    if(this._directions[pin] !== PCF8574.DIR_OUT){
      return Promise.reject(new Error('Pin is not defined as output'));
    }

    if(typeof(value) == 'undefined'){
      // set value dependend on current state to toggle
      value = !((this._currentState>>pin) % 2 !== 0)
    }

    return this._setPinInternal(pin, value);
  }

  /**
   * Internal function to set the state of a pin, regardless its direction.
   * @param  {number}   pin   The pin.
   * @param  {boolean}  value The new value.
   * @return {Promise}
   */
  private _setPinInternal(pin:number, value:boolean):Promise<{}>{
    let newState:number = this._setStatePin(this._currentState, pin, value);

    return this._setNewState(newState);
  }

  /**
   * Set the given value to all output pins.
   * @param  {boolean}  value The new value for all output pins.
   * @return {Promise}
   */
  private setAllPins(value:boolean):Promise<{}>{
    let newState:number = this._currentState;

    for(let pin = 0; pin < 8; pin++){
      if(this._directions[pin] !== PCF8574.DIR_OUT){
        continue; // isn't an output pin
      }
      newState = this._setStatePin(newState, pin, value);
    }

    return this._setNewState(newState);
  }

  /**
   * Get the current value of a pin.
   * This returns the last saved value, not the value currently returned by the PCF8574/PCF9574A IC.
   * To get the current value call doPoll() first, if you're not using interrupts.
   * @param  {number}  pin The pin.
   * @return {boolean}     The current value.
   */
  public getPinValue(pin:number):boolean{
    if(pin < 0 || pin > 7){
      return false;
    }
    return ((this._currentState>>pin) % 2 !== 0)
  }

  /**
   * Can be called to clean up.
   * This will unexport the interrupt GPIO, if used.
   */
  public destroy():void{
    // release the used GPIO
    if(this._gpio !== null){
      this._gpio.unwatchAll();
      this._gpio.unexport();
      this._gpio = null;
    }
  }
}
