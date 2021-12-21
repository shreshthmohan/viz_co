/* global viz */

const options = {
  aspectRatio: 1.4,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa',

  // customColorScheme: ['red', 'blue', 'green', 'black', 'gray'],
  inbuiltScheme: 'schemeOrRd',
  numberOfColors: 5, // minumum: 3, maximum: 9

  collisionDistance: 0.5,

  sizeRange: [5, 30],

  circleDiameter: 500,
}

const dimensions = {
  sizeField: 'capitalization',
  yField: 'taxRate',
  nameField: 'name',
  segmentField: 'sector',
}
const dataPath = 'data.csv'

viz.validateAndRenderPackedBubble({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
