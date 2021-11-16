/* global viz */

const options = {
  aspectRatio: 2, // decrease this value to increase height

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: 'transparent',

  align: 'justify', // choose between: justify, left, right, center

  verticalGapInNodes: 10,
  nodeWidth: 20,

  units: 'TWh',

  // headers
  heading: 'This is a heading for the chart',
  subheading: 'This is a subheading for the chart describing it in more detail',
}

const dimensions = {
  sourceField: 'source',
  targetField: 'target',
  valueField: 'value', // determines thickness of the link
}

const dataPath = 'data.csv'

viz.validateAndRenderSankey({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
