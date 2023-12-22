module.exports = {
  extends: [
    '@crycode/eslint-config'
  ],
  parserOptions: {
    project: ['./tsconfig.json', './examples/tsconfig.json'],
  },
  rules: {
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/member-ordering': 'off',
    '@typescript-eslint/naming-convention': 'off',
  }
};
