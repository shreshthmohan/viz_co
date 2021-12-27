/* global viz, d3 */

const options = {
  aspectRatio: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa', // background-color

  /* xField */
  xAxisTitle: 'Date',
  xAxisDateParser: '%y%m%d',
  xAxisDateFormatter: '%b-%y',
  xTooltipFormatter: '%B %d, %Y',

  /* yField */
  overlap: 7,
  yValueFormatter: '.1f',
  yValuePrefix: '',
  yValuePostfix: 'M',

  /* seriesField */
  seriesLabelPosition: 'left', // ['left', 'right']

  /* colorField */
  colorRange: d3.schemeTableau10,
  // colorRange: ['red', 'green', 'blue', 'black', 'yellow'],
  // colorRange: d3.schemeSpectral[7],
  // colorRange: d3.schemeRdYlGn[5],
  // colorRange: grv.schemeAccentLightBlue,

  /* Initial State */
  // 'All' to make all maces actives
  defaultState: [
    'Narendra Modi, India',
    'North Korea',
    'Prince Harry & Meghan Markle',
  ],
  // defaultState: 'All',

  /* Interactions */
  activeOpacity: 0.9,
  inactiveOpacity: 0.1,

  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
  goToInitialStateButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  clearAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  showAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
}

const dimensions = {
  xField: 'date', // Date
  yField: 'Readers', // Numeric
  seriesField: 'Topic', // Categorical
  colorField: 'group', // Categorical
}

const dataPath = 'data.csv'

viz.validateAndRenderRidgeline({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
