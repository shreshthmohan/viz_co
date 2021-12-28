/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath = 'data_log.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  beforeField: 'gdp_pc_start',
  afterField: 'gdp_pc_end',
  topicField: 'country',
}

// eslint-disable-next-line no-unused-vars
const options = {
  aspectRatio: 0.75,
  marginTop: 10,
  marginRight: 10,
  marginBottom: 10,
  marginLeft: 10,
  bgColor: '#f7f7f7',

  /* Series Colors */
  beforeFieldColor: 'red',
  afterFieldColor: 'green',
  // linkColor:

  /* Glyphs */
  glyphSize: 5,
  connectorSize: 2,
  activeOpacity: 1,
  inactiveOpacity: 0.2,

  defaultState: ['China', 'India', 'Kuwait'],

  connectorColorStrategy: 'farFromReference', //['farFromReference', 'closeToReference', 'customColor']
  connectorColorCustom: 'blue',
  connectorLegendLabelBefore: 'Before is farther from threshhold',
  connectorLegendLabelAfter: 'After is farther from threshhold',
  referenceLineColor: 'blue',
  referenceLineWidth: 2,
  referenceLineOpacity: 0.8,
  referenceValue: 10000,
  referenceLabel: 'Ref',

  /* Legends */
  beforeLegendLabel: 'Before',
  afterLegendLabel: 'After',
  topicLabelFontSize: '12px',
  topicLabelTextColor: '#000',
  topicLabelXOffset: 5,
  topicLabelYOffset: -1,

  /* Axes */
  xScaleType: 'log', // linear or log
  xAxisPosition: 'top',
  xAxisOffset: 20,
  xAxisLineThickness: 1,
  xAxisLabel: 'Emotion Score',
  xAXisLabelFontSize: 14,
  xAxisLabelOffset: 60,
  xAxisCustomDomain: [400, 200000],
  // xAxisCustomDomain: null,
  // xAxisTickValues: [100, 500, 1000, 10000, 50000, 150000, 500000],
  xAxisTickFontSize: 14,
  xAxisColor: 'red',
  xAxisTickOffset: 10,
  xAxisTickFormatter: '.1s',
  xAxisTickRotation: -90,
  xAxisTickAnchor: 'start',
  xAxisTickBaseline: 'middle',
  xAxisTickValueXOffset: 0,
  xAxisTickValueYOffset: -0.4,

  valuePrefix: '$',
  valuePostfix: ' per capita',
  valueFormatter: '.2s',

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
