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
    '@typescript-eslint/method-signature-style': 'off',
    '@typescript-eslint/no-unsafe-declaration-merging': 'off',
  }
};
