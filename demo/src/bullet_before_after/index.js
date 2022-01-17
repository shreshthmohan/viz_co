/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath = 'data.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  beforeField: 'before',
  afterField: 'after',
  topicField: 'topic',
}

// eslint-disable-next-line no-unused-vars
const options = {
  aspectRatio: 1.5,
  marginTop: 10,
  marginRight: 10,
  marginBottom: 10,
  marginLeft: 10,
  bgColor: '#f7f7f7',

  /* Series Colors */
  beforeFieldColor: 'red',
  afterFieldColor: 'green',
  connectorColorStrategy: 'farFromReference', //['farFromReference', 'closeToReference', 'customColor']
  // connectorColorCustom: 'blue',
  referenceValue: 0.2,
  referenceLineColor: 'yellow',
  defaultState: ['China', 'India'],

  /* Glyphs */
  glyphSize: 5,
  connectorSize: 2,
  activeOpacity: 0.8,
  inactiveOpacity: 0.4,

  /* Legends */
  beforeLegendLabel: 'Before',
  afterLegendLabel: 'After',

  /* Axes */
  xScaleType: 'linear', // linear or log
  xAxisPosition: 'bottom',
  xAxisOffset: 20,
  xAxisLineThickness: 1,
  xAxisLabel: 'Emotion Score',
  xAXisLabelFontSize: 14,
  xAxisLabelOffset: 60,
  xAxisCustomDomain: [-0.8, 0.8],
  // xAxisTickValues: [-1, -0.8, -0.5, 0, 0.5, 0.8, 1],
  xAxisTickFontSize: 14,
  xAxisColor: 'red',
  xAxisTickOffset: 20,
  xAxisTickFormatter: '.2f',
  xAxisTickRotation: 0,
  xAxisTickAnchor: 'middle',
  xAxisTickValueXOffset: 0,
  xAxisTickValueYOffset: 0,

  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
  goToInitialStateButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  clearAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  showAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
}

viz.validateAndRenderBulletBeforeAfter({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
