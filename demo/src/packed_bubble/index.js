/* global viz */

const options = {
  aspectRatio: 1.6,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#f1f1f1',

  // customColorScheme: ['red', 'blue', 'green', 'black', 'gray'],
  inbuiltScheme: 'schemeBuPu',
  numberOfColors: 5, // minumum: 3, maximum: 9

  collisionDistance: 0.5,

  sizeRange: [5, 30],

  circleDiameter: 500,

  sizeValueFormat: '$.3s',
  sizeValuePrefix: '',
  sizeValuePostfix: '',
  sizeLegendGapInCircles: 35,
  sizeLegendTitle: 'Size Legend Title',
  sizeLegendValues: [100, 20000, 150000],

  yValueFormat: '.1f',
  yValuePrefix: '',
  yValuePostfix: '%',

  colorLegendTitle: 'Color Legend Title',

  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
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
