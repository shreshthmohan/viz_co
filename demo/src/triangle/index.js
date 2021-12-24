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
    'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
  goToInitialStateButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  clearAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  showAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
}

const dataPath = 'data.csv'

viz.validateAndRenderTriangle({
  dataPath,
  options,
  dimensions,
  chartContainerSelector: '#chart-container',
})
