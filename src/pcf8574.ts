/*
 * Node.js PCF8574/PCF8574A
 *
 * Copyright (c) 2017-2023 Peter Müller <peter@crycode.de> (https://crycode.de)
 *
 * Node.js module for controlling each pin of a PCF8574/PCF8574A I2C port expander IC.
 */
import { I2CBus } from 'i2c-bus';

import { PCF857x, PCF857x_TYPE } from './pcf857x';

/**
 * Namespace for types for PCF8574
 */
export namespace PCF8574 {
  /**
   * A pin number from 0 to 7
   * @type {number}
   */
  export type PinNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

  /**
   * Possible pin directions.
   * 0 = out, 1 = in, -1 = undefined
   */
  export type PinDirection = PCF857x.PinDirection;

  /**
   * Data of an 'input' event
   * @type {Object}
   */
  export type InputData = PCF857x.InputData<PinNumber>;
}

/**
 * Class for handling a PCF8574/PCF8574A IC.
 */
export class PCF8574 extends PCF857x<PCF8574.PinNumber> {
  constructor (i2cBus: I2CBus, address: number, initialState: boolean | number) {
    super(i2cBus, address, initialState, PCF857x_TYPE.PCF8574);
  }
}
