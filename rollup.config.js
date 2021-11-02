import resolve from '@rollup/plugin-node-resolve'

export default {
  input: './src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'umd',
    name: 'viz',
    globals: {
      lodash: '_',
      d3: 'd3',
    },
  },
  plugins: [resolve()],
  external: ['lodash', 'd3'],
}
