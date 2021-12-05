/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath = 'data.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  sourceField: 'source', // Categorical
  targetField: 'target', // Categorical
  valueField: 'value', // Numeric
}

// eslint-disable-next-line no-unused-vars
const options = {
  aspectRatio: 2,

  marginTop: 60,
  marginRight: 90,
  marginBottom: 20,
  marginLeft: 50,

  bgColor: 'transparent',

  valuePrefix: '',
  valuePostfix: '',
  valueFormatter: '',

  chordType: 'undirected',

  defaultState: [],

  inactiveOpacity: 0.2,
  activeOpacity: 0.8,
  arcLabelFontSize: '8px',
  clickInteraction: false,

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
