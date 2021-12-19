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
  referenceLineColor: 'blue',
  referenceLineWidth: 2,
  referenceLineOpacity: 0.8,
  referenceValue: 10000,

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
  xAXisLabelFontSize: '12px',
  xAxisLabelOffset: 60,
  xAxisCustomDomain: [400, 200000],
  // xAxisCustomDomain: null,
  // xAxisTickValues: [100, 500, 1000, 10000, 50000, 150000, 500000],
  xAxisTickFontSize: '14px',
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
    'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
  goToInitialStateButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  clearAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  showAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
}

viz.validateAndRenderBulletBeforeAfter({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
