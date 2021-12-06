/* global window */

import * as d3 from 'd3'
import * as topojson from 'topojson'
import { legend } from '../../utils/helpers/colorLegend'

import { fipsToCounty } from './fipslookup'
import { initializeTooltip } from '../../utils/helpers/commonChartHelpers'
import { usStatesAndCountiesTopo as topo } from './counties-albers-10m'

export function renderChart({
  data,
  dimensions: { valueField, fipsField },
  options: {
    interpolateScheme = d3.interpolateBlues,
    colorLegendTitle = valueField,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    searchButtonClassNames,
  },
  chartContainerSelector,
}) {
  d3.select('body').append('style').html(`
  .group-counties.searching > .iv-county.s-match {
    stroke: #333;
    stroke-width: 2;
  }`)

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
    [fipsField]: Number.parseInt(d[fipsField], 10),
  }))
  const values = dataParsed.map(el => el[valueField])
  const valueDomain = d3.extent(values)

  const dataObj = {}
  dataParsed.forEach(c => {
    dataObj[c[fipsField]] = c
  })

  const colorScale = d3.scaleSequential(interpolateScheme).domain(valueDomain)

  const path = d3.geoPath()

  const allCounties = chartCore
    .append('g')
    .attr('class', 'group-counties')
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
      if (found) {
        return colorScale(found[valueField])
      }
      return 'gray'
    })
    .on('mouseover', function (e, d) {
      d3.select(this).raise()
      tooltipDiv.transition().duration(200).style('opacity', 1)

      const fipsCode = d.id

      const found = dataParsed.find(
        el =>
          Number.parseInt(el[fipsField], 10) === Number.parseInt(fipsCode, 10),
      )

      if (found) {
        const countyInfo = fipsToCounty[fipsCode]
        tooltipDiv.html(
          `${countyInfo.county}, ${countyInfo.state}
            <br/>
            ${valueField}: ${found[valueField]}`,
        )
      }

      d3.select(e.target).attr('stroke', '#333').attr('stroke-width', 1).raise()
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

  chartCore
    .append('path')
    .datum(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b))
    .attr('fill', 'none')
    .attr('stroke', 'white')
    .attr('stroke-linejoin', 'round')
    .attr('d', path)
    .attr('opacity', 0.5)

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('placeholder', 'Find by county')
    .attr('class', searchButtonClassNames)

  function searchBy(term) {
    if (term) {
      d3.select('.group-counties').classed('searching', true)
      allCounties.classed(
        's-match',
        // should be boolean
        d => {
          return fipsToCounty[d.id].county
            .toLowerCase()
            .includes(term.toLowerCase())
        },
      )
    } else {
      d3.select('.group-counties').classed('searching', false)
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
    }),
  )
}

//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

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
