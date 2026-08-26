module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  overrides: [
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
    {
      files: ['src/modules/**/*.controller.ts', 'src/modules/**/*.routes.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@prisma/client',
                message: 'HTTP adapters must not depend on Prisma.',
              },
              {
                name: '@/utils/prisma.server',
                message: 'HTTP adapters must not access Prisma directly.',
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        'src/modules/**/*.service.ts',
        'src/modules/**/application/**/*.ts',
        'src/modules/**/domain/**/*.ts',
        'src/modules/**/infrastructure/**/*.ts',
        'src/modules/**/integrations/**/*.ts',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'express',
                message: 'Application and domain code must remain HTTP-free.',
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        'src/modules/**/application/**/*.ts',
        'src/modules/**/domain/**/*.ts',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'express',
                message: 'Application and domain code must remain HTTP-free.',
              },
              {
                name: '@prisma/client',
                message: 'Application and domain code must remain Prisma-free.',
              },
              {
                name: '@/utils/prisma.server',
                message: 'Application and domain code must not access Prisma.',
              },
            ],
            patterns: [
              {
                group: ['@/controllers/*', '@/routes/*', '@/middlewares/*'],
                message:
                  'Application and domain code must not import HTTP adapters.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/modules/**/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'express',
                message: 'Domain code must remain HTTP-free.',
              },
              {
                name: '@prisma/client',
                message: 'Domain code must remain Prisma-free.',
              },
              {
                name: '@/utils/prisma.server',
                message: 'Domain code must not access Prisma.',
              },
            ],
            patterns: [
              {
                group: [
                  '@/controllers/*',
                  '@/routes/*',
                  '@/middlewares/*',
                  '@/modules/*/infrastructure/*',
                ],
                message:
                  'Domain code must not depend on HTTP or infrastructure.',
              },
            ],
          },
        ],
      },
    },
  ],
  ignorePatterns: ['.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'off',
    '@typescript-eslint/ban-types': ['warn', { types: { Function: false } }],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
      },
    ],
  },
};
