import type { CodegenConfig } from '@graphql-codegen/cli';

// Types are generated from the API's committed schema, so the web build never
// needs a running server. Regenerate with `npm run codegen` after schema changes.
const config: CodegenConfig = {
  schema: '../api/schema.graphql',
  documents: ['packages/api/src/operations/**/*.ts'],
  ignoreNoDocuments: false,
  generates: {
    'packages/api/src/generated/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: {
        enumsAsTypes: true,
        useTypeImports: true,
        strictScalars: true,
        scalars: { ISO8601DateTime: 'string', ISO8601Date: 'string' },
      },
    },
  },
};

export default config;
