/* global window */

import * as d3 from 'd3'
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

    searchButtonClassNames = '',
  },
  chartContainerSelector,
}) {
  d3.select('body').append('style').html(`
  .group-states.searching > .iv-state.s-match {
    stroke: #333;
  }
  .hovered {
    stroke: #333;
    stroke-width: 2;
  }
  `)

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
  const valueDomain = d3.extent(values)

  const colorScale = d3.scaleSequential(interpolateScheme).domain(valueDomain)

  const path = d3.geoPath()

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
      return stateData ? colorScale(stateData[valueField]) : 'gray'
    })
    .on('mouseover', (e, d) => {
      tooltipDiv.transition().duration(200).style('opacity', 1)
      const stateData = dataObj[d.properties.abbr]
      if (stateData) {
        tooltipDiv.html(`${d.properties.name}
          <br />
          ${valueField}: ${valueFormatter(stateData[valueField])}
          `)
      } else {
        tooltipDiv.html(`${d.properties.name} <br/>Data not available`)
      }

      d3.select(e.target).attr('stroke', '#333').attr('stroke-width', 2).raise()
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      d3.select(e.target).attr('stroke', 'transparent')
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

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('placeholder', 'Find by state')
    .attr('class', searchButtonClassNames)

  function searchBy(term) {
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

  search.on('keyup', e => {
    searchBy(e.target.value.trim())
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
