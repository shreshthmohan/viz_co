/* global viz */

// Note that the data should be such that d + e + f = 100
// This chart is meant to show shares of three different (say parties) as a percentage
// That's why it should add up to 100
const dimensions = {
  startField: ['d1', 'e1', 'f1'],
  endField: ['d2', 'e2', 'f2'],
  nameField: 'name',
}

const options = {
  aspectRatio: 1,

  directionStartLabel: 'start point',
  directionEndLabel: 'end point',

  circleRadius: 4,
  lineWidth: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  valuePrefix: '',
  valuePostfix: '%',
  valueFormat: '.0f',

  bgColor: '#f7f7f7',

  // colorScheme: ['red', 'orange', 'blue'],
  colorScheme: ['#ee4e34', '#f1a03f', '#3077aa'],
  // should be the same length and order as dimensions and colorScheme
  fieldLabels: ['dee', 'eee', 'eff'],

  searchInputClassNames:
    'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
}

const dataPath = 'data.csv'

viz.validateAndRenderTriangle({
  dataPath,
  options,
  dimensions,
  chartContainerSelector: '#chart-container',
})
