/* global viz */

const dimensions = {
  xField: 'Rating',
  yFields: ['Series 1', 'Series 2'],
}

const options = {
  aspectRatio: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa',

  barOpacity: 0.5,
  colors: ['orange', 'blue', '#8c8d85', '#29b1c4'],
}

const dataPath = 'data.csv'

viz.validateAndRenderOverlapBar({
  chartContainerSelector: '#chart-container',
  options,
  dimensions,
  dataPath,
})
