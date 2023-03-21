/*
 * Node.js PCF8575
 *
 * Copyright (c) 2017-2023 Peter Müller <peter@crycode.de> (https://crycode.de)
 *               2022 - PCF8575 support inspired by Lyndel McGee <lynniemagoo@yahoo.com>
 *
 * Node.js module for controlling each pin of a PCF8575 I2C port expander IC.
 */
import { I2CBus } from 'i2c-bus';

import { PCF857x, PCF857x_TYPE } from './pcf857x';

/**
 * Namespace for types for PCF8575
 */

export namespace PCF8575 {
  /**
   * A pin number from 0 to 15
   * @type {number}
   */
  export type PinNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

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
 * Class for handling a PCF8575 IC.
 */
export class PCF8575 extends PCF857x<PCF8575.PinNumber> {
  constructor (i2cBus: I2CBus, address: number, initialState: boolean | number) {
    super(i2cBus, address, initialState, PCF857x_TYPE.PCF8575);
  }
}
