/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath = 'data.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  sourceField: 'fromCountry', // Categorical
  targetField: 'toCountry', // Categorical
  valueField: 'debt', // Numeric
}

// eslint-disable-next-line no-unused-vars
const options = {
  aspectRatio: 1,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: 'transparent',

  valuePrefix: '$',
  valuePostfix: 'B',
  valueFormatter: '.1f',

  chordType: 'directed',

  inactiveOpacity: 0.2,
  activeOpacity: 0.8,
  arcLabelFontSize: '12px',

  startingState: 'showAll',

  searchInputClassNames:
    'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
  // 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md overscroll-y-auto',
  goToInitialStateButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  clearAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  showAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
}

viz.validateAndRenderChord({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})