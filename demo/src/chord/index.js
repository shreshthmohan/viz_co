/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath = 'data.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  sourceField: 'fromCountry', // Categorical
  targetField: 'toCountry', // Categorical
  valueField: 'debt', // Numeric
}

// eslint-disable-next-line no-unused-vars
const options = {
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: 'transparent',

  valuePrefix: '$',
  valuePostfix: 'B',
  valueFormatter: '.1f',

  chordType: 'directed',

  inactiveOpacity: 0.2,
  activeOpacity: 0.8,
  arcLabelFontSize: '12px',

  startingState: 'showAll',

  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
  goToInitialStateButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  clearAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  showAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
}

viz.validateAndRenderChord({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
