/* global viz */

// eslint-disable-next-line no-unused-vars
const dimensions = {
  xField: 'year',

  // yFields: ['series1', 'series1a', 'series2'], // lines will be in the foreground (rendered in order as in the array)
  // yBandFields: [
  //   ['series1min', 'series1max'],
  //   ['series1amin', 'series1amax'],
  // ], // bands will be in the background
  // yScatterFields: ['series1min', 'series1amax'],

  // TODO: more scatter fields to yFields
  yFields: [
    //                        [min, max] order to be maintained
    { line: 'series2' },
    { line: 'series1a', band: ['series1amin', 'series1amax'] },
    { line: 'series1', band: ['series1min', 'series1max'] }, // legend will have only line name

    // { circle: 'series1min' },
    { circle: 'scatter1' },
    // { circle: 'scatter0' },
    // { band: ['s3min', 's3max'] }, // s3min-s3max - when only band
  ],
}

// eslint-disable-next-line no-unused-vars
const options = {
  aspectRatio: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: 'transparent',

  xAxisLabel: 'Year',
  xValueDateParse: '%Y',
  xValueDateFormat: '%Y',

  yAxisLabel: 'Area burned, thousand km²',

  // TODO: line and band color customization
  // Also, yLineColors.length should match yFieldsLength (similarly for yBandColors)

  yColors: [
    { line: '#f29474' },
    { line: '#878770', band: '#d0d1c3' },
    { line: '#ed3833', band: '#f9d6c6' },
    // { circle: '#aaa' },
    { circle: 'orange' },
  ],

  yValueFormat: '.0f',

  // yLabels: [{ line: 'series 1 label', band: 'band 1 label' }],
  // yLineColors: ['#878770', '#ed3833', '#f29474'],
  // yBandColors: ['#d0d1c3', '#f9d6c6'],
  highlightRanges: [
    [1880, 2019],
    [2019, 2100],
  ],
  yScatterColors: ['#aaa', 'orange'],
  highlightRangeColors: ['#46474512', '#ff000012'],

  scatterCircleRadius: 2,
  // TODO: provide inbuilt color scheme
}

const dataPaths = ['data.csv', 'data_scatter.csv']

// const dataPaths = ['data.csv']

viz.validateAndRenderLineBandScatter({
  dataPaths,
  options,
  dimensions,
  chartContainerSelector: '#chart-container',
})
