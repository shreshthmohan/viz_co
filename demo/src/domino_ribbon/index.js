/* global viz */

const dataPath = 'data.csv'

const dimensions = {
  xField: 'frustration', // Numeric
  yField: 'quarter', // Categorical / String / (Parsed Date?)
  dominoField: 'state', // Categorical
  sizeField: 'calls', // Numeric
  colorField: 'frustration', // Numeric // defaults to xField if not provided
}

const options = {
  aspectRatio: 1.5, // decrease this value to increase height

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#f7f7f7', // background-color

  /* Dimensions */
  /* xField */
  xDomain: [0, 100],
  xAxisLabel: 'Frustration',
  xAxisLabelOffset: -50,
  xAxisValueFormatter: '',

  /* yField */
  dominoHeight: 0.3,
  yAxisDateParser: '%Y-Q%q',
  // eslint-disable-next-line quotes
  yAxisDateFormatter: "Q%q'%y", // Date formatter options: https://github.com/d3/d3-time-format

  /* sizeField */
  sizeScaleType: 'log', // default is scaleLinear if not provided. Can be changed to scaleLog
  sizeScaleLogBase: Math.E, // default is 10, can be any positive number
  sizeRange: [2, 10],
  sizeLegendLabel: 'Call Volume',
  sizeLegendValues: [1, 5, 10, 2000],
  sizeLegendGapInSymbols: 15,
  sizeLegendMoveSymbolsDownBy: 15,
  sizeLegendValueFormatter: '',
  sizeValueFormatter: '',

  /* colorField */
  colorDomain: [0, 100],
  colorLegendValueFormatter: '.2s',
  colorLegendLabel: 'Frustration',
  colorRange: ['green', 'yellow', 'orange', 'red'],
  // colorRange: d3.schemeSpectral[7],
  // colorRange: d3.schemeRdYlGn[5],
  // colorRange: grv.schemeAccentLightBlue,

  /* Initial State */
  defaultState: ['Texas'],
  // initialState: 'All', // to make all ribbons active

  /* Interactions */
  activeOpacity: 1,
  inactiveOpacity: 0.05,

  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
  goToInitialStateButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  clearAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  showAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
}

viz.validateAndRenderDominoRibbon({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
