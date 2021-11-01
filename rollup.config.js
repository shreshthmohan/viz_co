import resolve from '@rollup/plugin-node-resolve'

export default {
  input: 'src/index.js',
  output: {
    file: 'bundle.js',
    format: 'umd',
    // name: 'maceChart',
    globals: {
      lodash: '_',
      d3: 'd3',
    },
  },
  plugins: [resolve()],
  external: ['lodash', 'd3'],
}
