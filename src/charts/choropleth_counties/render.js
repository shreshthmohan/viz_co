/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'
import * as topojson from 'topojson'
import { legend } from '../../utils/helpers/colorLegend'

import { initializeTooltip } from '../../utils/helpers/commonChartHelpers'
import { usStatesAndCountiesTopo as topo } from './counties-albers-10m'

import { formatNumber } from '../../utils/helpers/formatters'

export function renderChart({
  data,
  dimensions: { valueField, fipsField },
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
    nullDataMessage = 'Data not available',
    missingDataColor = 'gray',
    missingDataMessage = 'Data missing',

    searchButtonClassNames,

    searchInactiveOpacity = 0.3,
  },
  chartContainerSelector,
}) {
  const valueFormatter = val => formatNumber(val, valueFormat)

  applyInteractionStyles({ searchInactiveOpacity })

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

  const { dataParsed, values, countyNames } = parseData({
    data,
    valueField,
    fipsField,
  })

  const { colorScale } = setupScales({ values, interpolateScheme })

  const path = d3.geoPath()

  const { allCounties } = renderMap({
    chartCore,
    path,
    dataParsed,
    fipsField,
    valueField,
    missingDataColor,
    nullDataColor,
    colorScale,
    tooltipDiv,
    valueFormatter,
    nullDataMessage,
    missingDataMessage,
  })

  const handleSearch = searchEventHandler(allCounties)
  setupSearch({
    widgetsLeft,
    searchButtonClassNames,
    chartCore,
    handleSearch,
    chartContainerSelector,
    countyNames,
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

function applyInteractionStyles({ searchInactiveOpacity }) {
  d3.select('body').append('style').html(`
  .group-counties.searching > .iv-county.s-match {
    stroke: #333;
    stroke-width: 2;
  }
  .hovered {
    stroke: #333;
    stroke-width: 2;
  }
  .searching > .iv-county:not(.s-match) {
    opacity: ${searchInactiveOpacity};
  }
  `)
}

function parseData({ data, valueField, fipsField }) {
  const dataParsed = data.map(d => ({
    ...d,
    [valueField]: Number.parseFloat(d[valueField]),
    [fipsField]: Number.parseInt(d[fipsField], 10),
  }))
  const values = dataParsed.map(el => el[valueField])

  const countyNames = []
  _.forEach(topo.objects.counties.geometries, d => {
    countyNames.push(d.properties.name)
  })

  return { dataParsed, values, countyNames }
}

function setupScales({ values, interpolateScheme }) {
  const valueDomain = d3.extent(values)

  const colorScale = d3.scaleSequential(interpolateScheme).domain(valueDomain)

  return { colorScale }
}

function renderMap({
  chartCore,
  path,
  dataParsed,
  fipsField,
  valueField,
  missingDataColor,
  nullDataColor,
  colorScale,
  tooltipDiv,
  valueFormatter,
  nullDataMessage,
  missingDataMessage,
}) {
  const allCountiesGroup = chartCore.append('g').attr('class', 'group-counties')
  const allCounties = allCountiesGroup
    .selectAll('path')
    .data(topojson.feature(topo, topo.objects.counties).features)
    .join('path')
    .attr('d', path)
    .attr('id', d => `iv-county-${d.id}`)
    .attr('class', 'iv-county')
    .attr('fill', d => {
      const found = dataParsed.find(
        el => Number.parseInt(el[fipsField], 10) === Number.parseInt(d.id, 10),
      )
      const fillColor = found ? colorScale(found[valueField]) : missingDataColor
      return fillColor ? fillColor : nullDataColor
    })
    .on('mouseover', function (e, d) {
      d3.select(this).classed('hovered', true).raise()
      tooltipDiv.transition().duration(200).style('opacity', 1)

      const fipsCode = d.id

      const found = dataParsed.find(
        el =>
          Number.parseInt(el[fipsField], 10) === Number.parseInt(fipsCode, 10),
      )

      const countyInfo = d.properties
      if (found && !isNaN(found[valueField])) {
        tooltipDiv.html(
          `${countyInfo.name}, ${countyInfo.state_name}
            <br/>
            ${valueField}: ${valueFormatter(found[valueField])}`,
        )
      } else if (found && !found[valueField]) {
        tooltipDiv.html(`${d.properties.name} <br/>${nullDataMessage}`)
      } else {
        tooltipDiv.html(
          `${countyInfo.name}, ${countyInfo.state_name}
            <br/> ${missingDataMessage}
            `,
        )
      }

      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', function () {
      d3.select(this).classed('hovered', false)
      // .lower()
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  allCountiesGroup
    .append('path')
    .datum(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b))
    .attr('fill', 'none')
    .attr('stroke', 'white')
    .attr('stroke-linejoin', 'round')
    .attr('d', path)

  return { allCounties }
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

function setupSearch({
  widgetsLeft,
  searchButtonClassNames,
  chartCore,
  handleSearch,
  chartContainerSelector,
  countyNames,
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
        _(countyNames)
          .uniq()
          .map(el => `<option>${el}</option>`)
          .join(''),
      )

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('placeholder', 'Find by county')
    .attr('class', searchButtonClassNames)

  enableSearchSuggestions &&
    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`)

  search.on('keyup', e => {
    const term = e.target.value.trim()
    handleSearch(term, chartCore)
  })
  return { search }
}

const searchEventHandler = allCounties => (term, chartCore) => {
  if (term) {
    chartCore.select('.group-counties').classed('searching', true)
    allCounties.classed(
      's-match',
      // should be boolean
      d => {
        return d.properties.name.toLowerCase().includes(term.toLowerCase())
      },
    )
    chartCore.selectAll('.s-match').raise()
  } else {
    d3.select('.group-counties').classed('searching', false)
    chartCore.selectAll('.iv-county').lower()
  }
}
