import resolve from '@rollup/plugin-node-resolve'

export default {
  input: './src/index.js',
  output: [
    {
      file: 'dist/bundle.umd.js',
      format: 'umd',
      name: 'viz', // use this global var when using in the browser
      globals: {
        'lodash-es': '_',
        'd3': 'd3',
        // when UMD script accesses sankey it's done as d3.sankey
        'd3-sankey': 'd3',
      },
    },
    // not sure if cjs will work if d3 doesn't support cjs
    // { file: 'dist/bundle.cjs.js', format: 'cjs' },
  ],
  plugins: [resolve()],
  external: ['lodash-es', 'd3', 'd3-sankey'],
}
