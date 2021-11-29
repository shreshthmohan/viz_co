/* global window */

import * as d3 from 'd3'
import { formatNumber } from '../../utils/helpers/formatters'
import { preventOverflow } from '../../utils/helpers/general'
import { lineBandLegend } from './lineBandLegend'

export function renderChart({
  data,
  dataScatter = [],
  dimensions: { xField, yFields },
  options: {
    aspectRatio = 2,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    xAxisLabel = xField,
    xValueDateParse = '',
    xValueDateFormat = '',

    yAxisLabel = '',
    yColors,
    yValueFormat = '',

    scatterCircleRadius = 2,

    highlightRanges = [],
    highlightRangeColors,
  },

  chartContainerSelector,
}) {
  const coreChartWidth = 1000
  const { svg, coreChartHeight, allComponents, chartCore, widgetsRight } =
    setupChartArea({
      chartContainerSelector,
      coreChartWidth,
      aspectRatio,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      bgColor,
    })

  const yValueFormatter = val => formatNumber(val, yValueFormat)

  const parseDate = dt => {
    const date = d3.timeParse(xValueDateParse)(dt)
    return date
  }

  const tooltipDiv = initializeTooltip()

  const allYValues = []

  const dataParsed = data.map(d => {
    const parsedDataRow = { ...d }
    yFields.forEach(yf => {
      if (yf.line) {
        const dyf = Number.parseFloat(d[yf.line])
        parsedDataRow[yf.line] = dyf
        allYValues.push(dyf)
      }
      if (yf.band) {
        const yBandFieldDataMin = Number.parseFloat(d[yf.band[0]])
        parsedDataRow[yf.band[0]] = yBandFieldDataMin
        allYValues.push(yBandFieldDataMin)

        const yBandFieldDataMax = Number.parseFloat(d[yf.band[1]])
        parsedDataRow[yf.band[1]] = yBandFieldDataMax
        allYValues.push(yBandFieldDataMax)
      }
    })

    parsedDataRow[xField] = parseDate(d[xField])
    return parsedDataRow
  })

  const dataScatterParsed = dataScatter.map(d => {
    const parsedDataRow = { ...d }
    yFields.forEach(yf => {
      if (yf.circle) {
        const dyf = Number.parseFloat(d[yf.circle])
        parsedDataRow[yf.line] = dyf
        allYValues.push(dyf)
      }
    })
    parsedDataRow[xField] = parseDate(d[xField])
    return parsedDataRow
  })

  const yDomain = d3.extent(allYValues)

  const xDomainLineBand = dataParsed.map(d => d[xField])
  const xDomainScatter = dataScatterParsed.map(d => d[xField])

  const xDomain = d3.extent([...xDomainLineBand, ...xDomainScatter])

  console.log(xDomain)

  const xScale = d3.scaleTime().range([0, coreChartWidth]).domain(xDomain)
  const yScale = d3
    .scaleLinear()
    .range([coreChartHeight, 0])
    .domain(yDomain)
    .nice()

  const yAxisTickSizeOffset = 20

  const yAxis = chartCore
    .append('g')
    .attr('id', 'x-axis')
    .attr('transform', `translate(${coreChartWidth + yAxisTickSizeOffset}, 0)`)

  yAxis
    .call(
      d3
        .axisRight(yScale)
        .tickFormat(yValueFormatter)
        .tickSize(-coreChartWidth - yAxisTickSizeOffset),
    )
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))
    .call(g => g.selectAll('.tick text').attr('fill', '#333'))
    .call(g => g.select('.domain').remove())

  yAxis
    .append('text')
    .text(yAxisLabel)
    .attr('fill', '#333')
    .attr('text-anchor', 'end')
    .style('font-weight', 'bold')
    .attr('transform', `translate(${30}, -10)`)

  // highlightRange
  highlightRanges.forEach((hr, i) => {
    chartCore
      .append('rect')
      .attr('x', d3.min([xScale(parseDate(hr[0]), xScale(parseDate(hr[1])))]))
      .attr('y', 0)
      .attr('height', coreChartHeight)
      .attr(
        'width',
        Math.abs(xScale(parseDate(hr[1])) - xScale(parseDate(hr[0]))),
      )
      .attr('fill', highlightRangeColors[i])
    // .attr('opacity', 0.2)
  })

  const lineForField = field => {
    return (
      d3
        .line()
        // .curve(d3.curveBasis)
        .defined(d => !Number.isNaN(d[field]))
        .x(d => xScale(d[xField]))
        .y(d => yScale(d[field]))
    )
  }

  const areaForBand = ([bandMin, bandMax]) => {
    return (
      d3
        .area()
        // .curve(d3.curveBasis)
        .defined(d => !Number.isNaN(d[bandMin]) && !Number.isNaN(d[bandMax]))
        .x(d => xScale(d[xField]))
        .y0(d => yScale(d[bandMin]))
        .y1(d => yScale(d[bandMax]))
    )
  }

  yFields.forEach((yf, i) => {
    if (yf.band) {
      chartCore
        .append('path')
        .datum(dataParsed)
        .attr('fill', yColors[i].band)
        .attr('d', areaForBand(yf.band))
    }
  })
  yFields.forEach((yf, i) => {
    if (yf.circle) {
      chartCore
        .append('g')
        .attr('class', `scatter-container-${i}`)
        .selectAll('circle')
        .data(dataScatterParsed.filter(d => !Number.isNaN(d[yf.circle])))
        .join('circle')
        .attr('cx', d => xScale(d[xField]))
        .attr('cy', d => yScale(d[yf.circle]))
        .attr('r', scatterCircleRadius)
        .attr('fill', yColors[i].circle)
    }
  })
  yFields.forEach((yf, i) => {
    if (yf.line) {
      chartCore
        .append('path')
        .datum(dataParsed)
        .attr('fill', 'none')
        .attr('stroke', yColors[i].line)
        .attr('stroke-width', 2.5)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('d', lineForField(yf.line))

      const filteredData = dataParsed.filter(d => !Number.isNaN(d[yf.line]))
      chartCore
        .append('g')
        .attr('class', 'tooltip-circles')
        .selectAll('circle')
        .data(filteredData)
        .join('circle')
        .attr('cx', d => xScale(d[xField]))
        .attr('cy', d => yScale(d[yf.line]))
        .attr('r', 5)
        .attr('fill', 'transparent')
        .on('mouseover', function (e, d) {
          const lineValue = d[yf.line]

          tooltipDiv.transition().duration(200).style('opacity', 1)

          // If line is not linked to band, show only line values
          if (yf.band) {
            const [bandMinValue, bandMaxValue] = [d[yf.band[0]], d[yf.band[1]]]
            tooltipDiv.html(`<span style="font-weight: bold">${d3.timeFormat(
              xValueDateFormat,
            )(d[xField])}</span>
            <br/> ${yf.line}: ${yValueFormatter(lineValue)}
            <br/> ${yf.band[0]}: ${yValueFormatter(bandMinValue)}
            <br/> ${yf.band[1]}: ${yValueFormatter(bandMaxValue)}`)
          } else {
            tooltipDiv.html(`<span style="font-weight: bold">${d[xField]}</span>
            <br/> ${yf.line}: ${yValueFormatter(lineValue)}`)
          }

          tooltipDiv
            .style('left', `${e.clientX}px`)
            .style('top', `${e.clientY + 20 + window.scrollY}px`)
        })
        .on('mouseout', function () {
          tooltipDiv
            .style('left', '-300px')
            .transition()
            .duration(500)
            .style('opacity', 0)
        })
    }
  })
  // x axis
  const xAxis = chartCore
    .append('g')
    .attr('id', 'x-axis')
    .attr('transform', `translate(0, ${coreChartHeight})`)

  xAxis
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat(xValueDateFormat)))
    .call(g => {
      g.selectAll('.domain').attr('stroke', '#333')
      g.selectAll('.tick line').attr('stroke', '#333')
      g.selectAll('.tick text').attr('fill', '#333')
    })

  xAxis
    .append('text')
    .text(xAxisLabel)
    .attr('fill', '#333')
    .attr('font-weight', 'bold')
    .attr('transform', `translate(${coreChartWidth / 2}, 30)`)
    .attr('text-anchor', 'middle')

  const lineBandsWithColors = []
  yFields.forEach((yf, i) => {
    const k = {}
    k.type = ''
    if (yf.line) {
      k.line = { label: yf.line, color: yColors[i].line }
      k.type += 'line'
    }
    if (yf.band) {
      k.band = {
        label: `${yf.band[0]}-${yf.band[1]}`,
        color: yColors[i].band,
      }
      k.type += 'band'
    }
    if (yf.circle && dataScatter.length) {
      k.circle = { label: yf.circle, color: yColors[i].circle }
      k.type = 'circle'
    }
    if (k.type) {
      lineBandsWithColors.push(k)
    }
  })

  widgetsRight
    .append('div')
    .html(lineBandLegend({ lineBandColorScale: lineBandsWithColors }))

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
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
  aspectRatio,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  bgColor,
}) {
  const coreChartHeight = coreChartWidth / aspectRatio

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
  }
}
function initializeTooltip() {
  return d3
    .select('body')
    .append('div')
    .attr('class', 'dom-tooltip')
    .attr(
      'style',
      'opacity: 0; position: absolute; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
    )
}
