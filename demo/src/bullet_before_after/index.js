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
  // linkColor:

  /* Glyphs */
  glyphSize: 5,
  connectorSize: 2,
  activeOpacity: 0.6,
  inactiveOpacity: 0.2,

  /* Legends */
  beforeLegendLabel: 'Before',
  afterLegendLabel: 'After',

  /* Axes */
  xScaleType: 'linear', // linear or log
  xAxisPosition: 'bottom',
  xAxisOffset: 20,
  xAxisLineThickness: 1,
  xAxisLabel: 'Emotion Score',
  xAXisLabelFontSize: '14px',
  xAxisLabelOffset: 60,
  xAxisCustomDomain: [-0.8, 0.8],
  // xAxisTickValues: [-1, -0.8, -0.5, 0, 0.5, 0.8, 1],
  xAxisTickFontSize: '14px',
  xAxisColor: 'red',
  xAxisTickOffset: 20,
  xAxisTickFormatter: '.2f',
  xAxisTickRotation: 0,
  xAxisTickAnchor: 'middle',
  xAxisTickValueXOffset: 0,
  xAxisTickValueYOffset: 0,

  searchInputClassNames:
    'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
  // 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md overscroll-y-auto',
  goToInitialStateButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  clearAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
}

viz.validateAndRenderBulletBeforeAfter({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
