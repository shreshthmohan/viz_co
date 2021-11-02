import resolve from '@rollup/plugin-node-resolve'

export default {
  input: './index.js',
  output: {
    file: 'bundle.js',
    format: 'umd',
    name: 'mace',
    globals: {
      lodash: '_',
      d3: 'd3',
    },
  },
  plugins: [resolve()],
  external: ['lodash', 'd3'],
}
