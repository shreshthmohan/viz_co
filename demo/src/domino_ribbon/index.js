/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath = 'data.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  xField: 'frustration', // Numeric
  yField: 'quarter', // Categorical / String / (Parsed Date?)
  dominoField: 'state', // Categorical
  sizeField: 'calls', // Numeric
  colorField: 'frustration', // Numeric // defaults to xField if not provided
}

// eslint-disable-next-line no-unused-vars
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
  initialState: ['Texas'],
  // initialState: 'All', // to make all ribbons active

  /* Interactions */
  activeOpacity: 0.8,
  inactiveOpacity: 0.1,

  searchInputClassNames:
    'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
  // 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md overscroll-y-auto',
  goToInitialStateButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  clearAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
}

viz.validateAndRenderDominoRibbon({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
