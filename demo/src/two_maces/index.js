/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath_one = 'data_one.csv'
const dataPath_two = 'data_two.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  xFieldStart: 'gdp_pc_start', // Numeric
  xFieldEnd: 'gdp_pc_end', // Numeric
  yFieldStart: 'happiness_start', // Numeric
  yFieldEnd: 'happiness_end', // Numeric
  sizeField: 'population', // Numeric
  nameField: 'country', // Categorial
}

// eslint-disable-next-line no-unused-vars
const options = {
  /* Headers */

  /* Chart Area */
  aspectRatio: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa', // background color

  /* Dimensions */
  /* xField */
  xAxisTitle: 'GDP per capita (PPP US$)',
  xFieldType: 'GDP per capita',
  xAxisTickValues: [400, 1000, 3000, 8000, 25000, 60000, 160000], // comment this for automatic tick values
  xScaleType: 'log', // linear or log
  xScaleLogBase: Math.E, // applicable only if log scale (will be 10 if not provided)
  xValueFormatter: '.2f',

  /* yField */
  yAxisTitle: 'Happiness',
  yFieldType: 'Happiness',
  yValueFormatter: '.2f',

  /* sizeField */
  sizeLegendValues: [1e6, 1e8, 1e9],
  sizeLegendMoveSizeObjectDownBy: 0,
  sizeLegendTitle: 'Population',
  sizeValueFormatter: '.2s',

  /* Legends */
  oppositeDirectionColor: '#ee4e34',
  sameDirectionColor: '#44a8c1',
  directionStartLabel: '2008',
  directionEndLabel: '2018',

  /* Initial State */
  // 'All' to make all maces actives
  defaultState: [
    'India',
    'China',
    'Afghanistan',
    'Tanzania',
    'Thailand',
    'United States',
    'Kuwait',
    'Italy',
    'Poland',
  ],
  // defaultState: 'All',

  /* Interactions */
  activeOpacity: 0.8,
  inactiveOpacity: 0.2,

  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
  goToInitialStateButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  clearAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
}

viz.validateAndRenderMace({
  chartContainerSelector: '#chart-container-one',
  dataPath: dataPath_one,
  options: options,
  dimensions: dimensions,
})

viz.validateAndRenderMace({
  chartContainerSelector: '#chart-container-two',
  dataPath: dataPath_two,
  options: options,
  dimensions: dimensions,
})
