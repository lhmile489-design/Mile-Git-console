import tseslint from '@electron-toolkit/eslint-config-ts'

export default tseslint.config(
  { ignores: ['node_modules/**', 'out/**', 'release/**'] },
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      // Electron 项目主进程用 CJS，package.json 不加 "type":"module" 是正确的
      'n/no-missing-require': 'off'
    }
  }
)
