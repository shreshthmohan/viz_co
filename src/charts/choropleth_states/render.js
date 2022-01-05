/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'
import * as topojson from 'topojson'
import { legend } from '../../utils/helpers/colorLegend'
import { usStatesAndCountiesTopo as topo } from '../choropleth_counties/counties-albers-10m'
import { formatNumber } from '../../utils/helpers/formatters'

import { initializeTooltip } from '../../utils/helpers/commonChartHelpers'
export function renderChart({
  data,
  dimensions: { valueField, stateAbbrField },
  options: {
    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    valueFormat = '',

    interpolateScheme = d3.interpolateBlues,
    colorLegendTitle = valueField,
    nullDataColor = 'gray',
    nullDataMessage = 'Data Not Available',
    missingDataColor = 'gray',
    missingDataMessage = 'Data Missing',

    searchButtonClassNames = '',
    colorDomain: colorDomainCustom = [],

    searchDisabled = false,
  },
  chartContainerSelector,
}) {
  applyInteractionStyles()

  const valueFormatter = val => formatNumber(val, valueFormat)

  // console.log(data)
  const coreChartHeight = 610
  const coreChartWidth = 975

  const { chartCore, widgetsLeft, widgetsRight } = setupChartArea({
    chartContainerSelector,
    coreChartWidth,
    coreChartHeight,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    bgColor,
  })

  const tooltipDiv = initializeTooltip()

  const { dataObj, values, stateNames } = parseData({
    data,
    valueField,
    stateAbbrField,
  })

  const { colorScale } = setupScales({
    values,
    colorDomainCustom,
    interpolateScheme,
  })

  const path = d3.geoPath()

  const { allStates } = renderMap({
    chartCore,
    path,
    dataObj,
    valueField,
    colorScale,
    missingDataColor,
    nullDataColor,
    tooltipDiv,
    valueFormatter,
    nullDataMessage,
    missingDataMessage,
  })

  const handleSearch = searchEventHandler(allStates)
  setupSearch({
    widgetsLeft,
    searchButtonClassNames,
    searchDisabled,
    chartCore,
    handleSearch,
    chartContainerSelector,
    stateNames,
  })

  widgetsRight.append(() =>
    legend({
      color: colorScale,
      title: colorLegendTitle,
      width: 260,
      tickFormat: valueFormatter,
    }),
  )
}

function applyInteractionStyles() {
  d3.select('body').append('style').html(`
  .group-states.searching > .iv-state.s-match {
    stroke: #333;
  }
  .hovered {
    stroke: #333;
    stroke-width: 2;
  }
  `)
}

function setupChartArea({
  chartContainerSelector,
  coreChartWidth,
  coreChartHeight,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  bgColor,
}) {
  const viewBoxHeight = coreChartHeight + marginTop + marginBottom
  const viewBoxWidth = coreChartWidth + marginLeft + marginRight

  const chartParent = d3.select(chartContainerSelector)

  const widgets = chartParent
    .append('div')
    .attr(
      'style',
      'display: flex; justify-content: space-between; padding-bottom: 0.5rem;',
    )
  const widgetsLeft = widgets
    .append('div')
    .attr('style', 'display: flex; align-items: end; column-gap: 5px;')
  const widgetsRight = widgets
    .append('div')
    .attr('style', 'display: flex; align-items: center; column-gap: 10px;')

  const svg = chartParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  return {
    svg,
    coreChartHeight,
    allComponents,
    chartCore,
    widgetsLeft,
    widgetsRight,
    viewBoxWidth,
  }
}

function parseData({ data, valueField, stateAbbrField }) {
  const dataParsed = data.map(d => ({
    ...d,
    [valueField]: Number.parseFloat(d[valueField]),
    // [fipsField]: Number.parseInt(d[fipsField], 10),
  }))
  const dataObj = {}
  dataParsed.forEach(s => {
    dataObj[s[stateAbbrField]] = s
  })

  const values = dataParsed.map(el => el[valueField])

  const stateNames = []
  _.forEach(topo.objects.states.geometries, d => {
    stateNames.push(d.properties.name)
  })

  return { dataObj, values, stateNames }
}

function setupScales({ values, colorDomainCustom, interpolateScheme }) {
  const colorDomainDefault = d3.extent(values)
  const colorDomain = d3.extent([...colorDomainDefault, ...colorDomainCustom])

  const colorScale = d3.scaleSequential(interpolateScheme).domain(colorDomain)

  return { colorScale }
}

function renderMap({
  chartCore,
  path,
  dataObj,
  valueField,
  colorScale,
  missingDataColor,
  nullDataColor,
  tooltipDiv,
  valueFormatter,
  nullDataMessage,
  missingDataMessage,
}) {
  const allStatesGroup = chartCore.append('g').attr('class', 'group-states')

  const allStates = allStatesGroup
    .selectAll('path')
    .data(topojson.feature(topo, topo.objects.states).features)
    .join('path')
    .attr('d', path)
    .attr('id', d => `iv-state-${d.id}`)
    .attr('class', 'iv-state')
    .attr('stroke-width', 2)
    .attr('fill', d => {
      const stateAbbr = d.properties.abbr
      const stateData = dataObj[stateAbbr]
      const fillColor = stateData
        ? colorScale(stateData[valueField])
        : missingDataColor
      return fillColor ? fillColor : nullDataColor
    })
    .on('mouseover', function (e, d) {
      d3.select(this).classed('hovered', true).raise()
      tooltipDiv.transition().duration(200).style('opacity', 1)
      const stateData = dataObj[d.properties.abbr]
      if (stateData && !isNaN(stateData[valueField])) {
        tooltipDiv.html(`${d.properties.name}
          <br />
          ${valueField}: ${valueFormatter(stateData[valueField])}
          `)
      } else if (stateData && !stateData[valueField]) {
        tooltipDiv.html(`${d.properties.name} <br/>${nullDataMessage}`)
      } else {
        tooltipDiv.html(`${d.properties.name} <br/>${missingDataMessage}`)
      }

      d3.select(this).classed('hovered', true).raise()
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', function () {
      d3.select(this).classed('hovered', false).lower()
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  allStatesGroup
    .append('path')
    .datum(topojson.mesh(topo, topo.objects.states /* (a, b) => a !== b */))
    .attr('fill', 'none')
    .attr('stroke', '#777')
    .attr('stroke-linejoin', 'round')
    .attr('d', path)

  return { allStates }
}

function setupSearch({
  widgetsLeft,
  searchButtonClassNames,
  searchDisabled,
  chartCore,
  handleSearch,
  chartContainerSelector,
  stateNames,
}) {
  const enableSearchSuggestions = true

  enableSearchSuggestions &&
    widgetsLeft
      .append('datalist')
      .attr('role', 'datalist')
      // Assuming that chartContainerSelector will always start with #
      // i.e. it's always an id selector of the from #id-to-identify-search
      // TODO add validation
      .attr('id', `${chartContainerSelector.slice(1)}-search-list`)
      .html(
        _(stateNames)
          .uniq()
          .map(el => `<option>${el}</option>`)
          .join(''),
      )

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('placeholder', 'Find by state')
    .attr('class', searchButtonClassNames)

  if (searchDisabled) {
    search.style('display', 'none')
  }

  enableSearchSuggestions &&
    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`)

  search.on('keyup', e => {
    const term = e.target.value.trim()
    handleSearch(term, chartCore)
  })
  return { search }
}

const searchEventHandler = allStates => (term, chartCore) => {
  if (term) {
    d3.select('.group-states').classed('searching', true)
    allStates.classed('s-match', d => {
      return d.properties.name.toLowerCase().includes(term.toLowerCase())
    })
    chartCore.selectAll('.s-match').raise()
  } else {
    d3.select('.group-states').classed('searching', false)
    chartCore.selectAll('.iv-state').lower()
  }
}
