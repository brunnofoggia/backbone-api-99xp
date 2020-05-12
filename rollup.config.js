import babel from 'rollup-plugin-babel';
import { eslint } from 'rollup-plugin-eslint';
import json from 'rollup-plugin-json';
import { terser } from 'rollup-plugin-terser';
import { version } from './package.json';

const globals = {
  'backbone': 'Backbone',
  'v8n-99xp': 'v8n',
  'underscore-99xp': '_',
  'validate-99xp': 'v',
  'backbone-request-99xp': 'BackboneRequest',
};

const now = new Date();
const year = now.getFullYear();

const banner = `/**
* @license
* backbone-api 99xp
* ----------------------------------
* v${version}
*
* Copyright (c)${year} Bruno Foggia, 99xp.
* Distributed under MIT license
*
* https://backbone-api.99xp.org
*/\n\n`;

const footer = '';

export default [
  {
    input: 'src/backbone-api-99xp.js',
    external: ['backbone', 'v8n-99xp','validate-99xp','underscore-99xp', 'backbone-request-99xp'],
    output: [
      {
        file: 'lib/backbone-api-99xp.js',
        format: 'umd',
        name: 'BackboneApi',
        exports: 'named',
        sourcemap: true,
        globals,
        banner,
        footer
      },
      {
        file: 'lib/backbone-api-99xp.esm.js',
        format: 'es'
      }
    ],
    plugins: [
      eslint({ exclude: ['package.json'] }),
      json(),
      babel()
    ]
  },
  {
    input: 'src/backbone-api-99xp.js',
    external: ['backbone', 'v8n-99xp','validate-99xp','underscore-99xp', 'backbone-request-99xp'],
    output: [
      {
        file: 'lib/backbone-api-99xp.min.js',
        format: 'umd',
        name: 'BackboneApi',
        exports: 'named',
        sourcemap: true,
        globals,
        banner,
        footer
      }
    ],
    plugins: [
      json(),
      babel(),
      terser({ output: { comments: /@license/ }})
    ]
  }
]
