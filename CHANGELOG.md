# Changelog

## v3.0.0 2023-03-21

- Added support for PCF8575 ICs with 16 pins (thanks to Lyndel McGee [#52](https://github.com/crycode-de/node-pcf8574/issues/52))
- Moved most code parts into a common base class for both supported controller types
- 💥 This changes the `main` script in the package which _may_ affect you if deep imports were used

## v2.0.1 2020-11-12

- Removed unnecessary files from npm package

## v2.0.0 2020-11-12

- Supported Node.js versions: 10, 12, 14
- Updated all dependencies
- Use native `Promise` instead of `bluebird`
- Some code optimizations
- Optimized TypeScript definitions

## v1.1.0 2017-05-29

- Added support for using one interrupt GPIO pin for multiple instances of the PCF8574 class

## v1.0.2 2017-05-27

- Internal currentState gets now updated immediately to avoid overlaps between different calls

## v1.0.1 2017-04-17

- Small fixes in readme and examples
- Added changelog

## v1.0.0 2017-04-16

- First official release
