/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath = 'data.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  xFieldStart: 'gdp_start',
  xFieldEnd: 'gdp_end',
  yFieldEnd: 'delta',
  connectionField: 'country',
}

// eslint-disable-next-line no-unused-vars
const options = {
  /* Chart Area */
  aspectRatio: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa', // background color

  connectionColor: 'steelblue',
  hoverConnectionColor: 'orange',
  connectionCircleRadius: 7,
  connectionLineWidth: 2,

  // defaultState: [
  //   'IND',
  //   'CHN'
  // ],
  defaultState: 'All',

  inactiveOpacity: 0.2,
  searchOpacity: 0.8,
  activeOpacity: 1,

  searchInputClassNames:
    'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
  // 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md overscroll-y-auto',
  goToInitialStateButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  clearAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
}

viz.validateAndRenderParallelConnections({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
