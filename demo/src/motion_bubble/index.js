/* global viz */

const dimensions = {
  sizeField: 'calls',
  xField: 'unemployment',
  yField: 'frustration',
  timeField: 'quarter',
  nameField: 'state',
  colorField: 'state',
}

const options = {
  motionDelay: 750,
  marginTop: 40,
  marginRight: 50,
  marginBottom: 50,
  marginLeft: 40,
  bgColor: 'transparent',
  aspectRatio: 2,
  sizeRange: [2, 20],
  xDomainCustom: [0, 30],
  yDomainCustom: [0, 8],
  inbuiltScheme: 'schemeSpectral',
  numberOfColors: 9, // minumum: 3, maximum: 9,
  xAxisLabel: 'Unemployment',
  yAxisLabel: 'Frustration Index',
}

const dataPath = 'data.csv'

viz.validateAndRenderMotionBubble({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
