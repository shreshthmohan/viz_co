/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath = 'data.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  xFieldStart: 'gdp_start',
  xFieldEnd: 'gdp_end',
  yFieldEnd: 'delta',
  connectionField: 'country',
}

// eslint-disable-next-line no-unused-vars
const options = {
  /* Chart Area */
  aspectRatio: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa', // background color

  connectionColor: 'steelblue',
  hoverConnectionColor: 'orange',
  connectionCircleRadius: 7,
  connectionLineWidth: 2,

  defaultState: ['IND', 'CHN'],
  // defaultState: 'All',

  xAxisPosition: 'bottom',
  xAxisLabelOffset: 40,
  xAxisTickRotation: 0,
  xAXisLabelFontSize: 12,
  xAxisColor: '#333',
  xAxisLabel: 'GDP per capita',

  yAxisPosition: 'right',
  yAxisLabelOffset: 50,
  yAXisLabelFontSize: 12,
  yAxisColor: '#333',
  yAxisLabel: 'Change in GDP',

  inactiveOpacity: 0.2,
  searchOpacity: 0.8,
  activeOpacity: 1,

  searchInputClassNames:
    'border border-2 border-gray-600 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
  // 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md overscroll-y-auto',
  goToInitialStateButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  clearAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  showAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
}

viz.validateAndRenderParallelConnections({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
