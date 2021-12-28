/* global viz */

// Note that the data should be such that d + e + f = 100
// This chart is meant to show shares of three different (say parties) as a percentage
// That's why it should add up to 100
const dimensions = {
  startField: ['b1', 'l1', 'r1'],
  endField: ['b2', 'l2', 'r2'],
  nameField: 'name',
}

const options = {
  directionStartLabel: 'start point',
  directionEndLabel: 'end point',

  circleRadius: 4,
  lineWidth: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 20,
  marginLeft: 0,

  // valuePrefix: '',
  // valuePostfix: '%',
  valueFormat: '.0%',

  bgColor: '#f7f7f7',

  activeOpacity: 0.8,
  inactiveOpacity: 0.2,
  defaultState: ['Mohave', 'Lincoln', 'San Jose', 'Santa Clara'],

  colorScheme: ['red', 'orange', 'blue'],
  // colorScheme: ['#ee4e34', '#f1a03f', '#3077aa'],
  // should be the same length and order as dimensions and colorScheme
  fieldLabels: ['bottom', 'right', 'left'],

  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
  goToInitialStateButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  clearAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  showAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',

  colorLegendClassNames: '',
  directionLegendClassNames: 'mb-2',
}

const dataPath = 'data.csv'

viz.validateAndRenderTriangle({
  dataPath,
  options,
  dimensions,
  chartContainerSelector: '#chart-container',
})
