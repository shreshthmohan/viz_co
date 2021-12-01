/* global viz */

const startStopButtonClassNames = `
inline-flex
items-center
px-2
py-1
border border-transparent
text-xs
font-medium
rounded-sm
shadow-sm
text-white
bg-gray-600
hover:bg-gray-700
disabled:bg-gray-300
focus:outline-none
focus:ring-2
focus:ring-offset-2
focus:ring-gray-500
disabled:cursor-not-allowed`

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
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  bgColor: 'transparent',
  aspectRatio: 2,
  sizeRange: [2, 20],
  xDomainCustom: [0, 30],
  yDomainCustom: [0, 8],
  inbuiltScheme: 'schemeSpectral',
  numberOfColors: 9, // minumum: 3, maximum: 9,
  xAxisLabel: 'Unemployment',
  yAxisLabel: 'Frustration Index',
  startButtonClassNames: startStopButtonClassNames,
  stopButtonClassNames: startStopButtonClassNames,
  searchButtonClassNames: `focus:ring-gray-500 focus:border-gray-500
    text-xs
    border-gray-300
    rounded-sm
    px-2
    py-1
    shadow-inner border`,
}

const dataPath = 'data.csv'

viz.validateAndRenderMotionBubble({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
