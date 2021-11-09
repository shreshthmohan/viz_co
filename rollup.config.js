import resolve from '@rollup/plugin-node-resolve'

export default {
  input: './src/index.js',
  output: [
    {
      file: 'dist/bundle.umd.js',
      format: 'umd',
      name: 'viz',
      globals: {
        'lodash-es': '_',
        'd3': 'd3',
      },
    },
    // not sure if cjs will work if d3 doesn't support cjs
    // { file: 'dist/bundle.cjs.js', format: 'cjs' },
  ],
  plugins: [resolve()],
  external: ['lodash-es', 'd3'],
}
