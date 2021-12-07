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
  format: ',.0f',

  searchInputClassNames:
    'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
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
