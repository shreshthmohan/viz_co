/* global window */

import * as d3 from 'd3'

import { swatches } from '../../utils/helpers/colorLegend'

import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'
import { preventOverflow, toClassText } from '../../utils/helpers/general'
import { dashedLegend } from './dashedLegend'

export function renderChart({
  data,
  options: {
    aspectRatio = 2,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    barOpacity = 0.5,
    barThickness = 0.8,
    outerPadding = 0.2,

    colorScheme = d3.schemeSpectral[9],

    showOnlyEveryNthValue = 1,

    xAxisPosition = 'bottom',
    xAxisLabel = '',
    xAXisLabelFontSize = 12,
    xAxisLabelOffset = 30,
    xAxisColor = 'black',
    xAxisTickRotation = 0,

    yAxisPosition = 'left',
    yAxisLabelOffset = 50,
    yAxisColor = 'black',
    yAxisLabel = '',
    yAXisLabelFontSize = 12,

    nanDisplayMessage = 'NA',
    referenceLines = [],
    referenceLinesOpacity = 1,
  },
  dimensions: { xField, yFields },
  chartContainerSelector,
}) {
  d3.select('body').append('style').html(`
  .hovered {
    stroke: #333;
  }
  .reference-lines {
    stroke-opacity: ${referenceLinesOpacity};
  }
  `)

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

  const tooltipDiv = initializeTooltip()

  const allYValues = []
  const dataParsed = data.map(el => {
    const elParsed = { ...el }
    yFields.forEach(yf => {
      elParsed[yf] = Number.parseFloat(el[yf])
      allYValues.push(Number.parseFloat(el[yf]))
    })
    return elParsed
  })

  const xDomain = dataParsed.map(d => d[xField])
  const xScale = d3
    .scaleBand()
    .range([0, coreChartWidth])
    .domain(xDomain)
    .paddingInner(1 - barThickness)
    .paddingOuter(outerPadding)

  const yMax = d3.max(allYValues)

  const colorsRgba = colorScheme.map(c => {
    const parsedColor = d3.rgb(c)
    parsedColor.opacity = barOpacity
    return parsedColor
  })

  const yScale = d3
    .scaleLinear()
    .range([coreChartHeight, 0])
    .domain([0, yMax])
    .nice()
  yFields.forEach((yf, i) => {
    chartCore
      .append('g')
      .selectAll('rect')
      .data(dataParsed)
      .join('rect')
      .attr('x', d => xScale(d[xField]))
      .attr('y', d => yScale(d[yf]))
      .attr('class', d => `rect-${toClassText(d[xField])}`)
      .attr('height', d => yScale(0) - yScale(Number.isNaN(d[yf]) ? 0 : d[yf]))
      .attr('width', xScale.bandwidth())
      .attr('fill', colorsRgba[i])
  })

  chartCore
    .append('g')
    .selectAll('rect')
    .data(dataParsed)
    .join('rect')
    .attr('x', d => xScale(d[xField]))
    .attr('y', 0)
    .attr('height', coreChartHeight)
    .attr('width', xScale.bandwidth())
    .attr('opacity', 0)
    .on('mouseover', function (e, d) {
      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)

      tooltipDiv.html(`${xField}: ${d[xField]}
      <br/>
      ${yFields
        .map(
          (yff, i) =>
            `<div style="display: inline-block; width: 0.5rem; height: 0.5rem; background: ${
              colorsRgba[i]
            }"></div> ${yff}: ${d[yff] || nanDisplayMessage}`,
        )
        .join('<br/>')}
      `)

      d3.selectAll(`.rect-${toClassText(d[xField])}`).classed('hovered', true)
    })
    .on('mouseout', function (e, d) {
      d3.selectAll(`.rect-${toClassText(d[xField])}`).classed('hovered', false)

      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  const colorScaleForLegend = d3.scaleOrdinal(colorsRgba).domain(yFields)
  widgetsRight.html(
    swatches({
      color: colorScaleForLegend,
      uid: 'rs',
      customClass: '',
    }),
  )

  const refLinesColors = []
  const refLinesLabels = []
  referenceLines.forEach(l => {
    refLinesLabels.push(l.label)
    refLinesColors.push(d3.rgb(l.color))
  })

  const colorScaleForRefLines = d3
    .scaleOrdinal()
    .domain(refLinesLabels)
    .range(refLinesColors)
  widgetsRight.append('div').html(
    dashedLegend({
      labels: refLinesLabels,
      color: colorScaleForRefLines,
    }),
  )

  chartCore
    .append('g')
    .attr('class', 'reference-lines')
    .selectAll('path')
    .data(referenceLines)
    .join('path')
    .attr('d', d => {
      const yDomain = yScale.domain()
      // const { x, y, width, height } = d3.select('.domain').node().getBBox()
      const x0 = xScale(String(d.value)) + xScale.bandwidth() / 2
      const y0 = yScale(d3.min(yDomain))
      const y1 = yScale(d3.max(yDomain))
      const d_ = [
        { x: x0, y: y0 },
        { x: x0, y: y1 },
      ]
      return d3
        .line()
        .x(d => d.x)
        .y(d => d.y)(d_)
    })
    .attr('stroke-width', 4)
    .attr('opacity', 1)
    .attr('stroke', (d, i) => colorsRgba[i])
    .attr('stroke-dasharray', '5,5')

  renderXAxis({
    xAxisPosition,
    xScale,
    coreChartHeight,
    showOnlyEveryNthValue,
    chartCore,
    coreChartWidth,
    xAxisLabelOffset,
    xAxisLabel,
    xAxisColor,
    xAxisTickRotation,
    xAXisLabelFontSize,
  })

  renderYAxis({
    yAxisPosition,
    yScale,
    chartCore,
    coreChartWidth,
    coreChartHeight,
    yAxisLabelOffset,
    yAxisLabel,
    yAxisColor,
    yAXisLabelFontSize,
  })

  const yAxisGrid = d3.axisLeft(yScale).tickSize(-coreChartWidth)
  renderYGrid({ chartCore, yAxisGrid })

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function renderYAxis({
  yAxisPosition,
  yScale,
  chartCore,
  coreChartWidth,
  coreChartHeight,
  yAxisLabelOffset,
  yAxisLabel,
  yAxisColor,
  yAXisLabelFontSize,
}) {
  let yAxis, axisOffset, labelOffset
  if (yAxisPosition === 'right') {
    yAxis = d3.axisRight(yScale)
    axisOffset = coreChartWidth
    labelOffset = yAxisLabelOffset
  } else {
    yAxis = d3.axisLeft(yScale)
    axisOffset = 0
    labelOffset = -yAxisLabelOffset
  }

  const yAxisGroup = chartCore
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(${axisOffset},0)`)
    .call(yAxis)

  yAxisGroup
    .append('text')
    // .attr('text-anchor', 'middle')
    // .attr('dominant-baseline', 'middle')
    .style('font-size', `${yAXisLabelFontSize}px`)
    .attr('fill', yAxisColor)
    .attr(
      'transform',
      `translate(${labelOffset}, ${coreChartHeight / 2}) rotate(-90)`,
    )
    .text(yAxisLabel)
}

function renderYGrid({ chartCore, yAxisGrid }) {
  chartCore
    .append('g')
    .call(yAxisGrid)
    .call(g => {
      g.selectAll('.tick line').attr('opacity', 0.3)
      g.selectAll('.tick text').remove()
    })
    .call(g => g.select('.domain').remove())
    .lower()
}

function renderXAxis({
  xAxisPosition,
  xScale,
  coreChartHeight,
  showOnlyEveryNthValue,
  chartCore,
  coreChartWidth,
  xAxisLabelOffset,
  xAxisLabel,
  xAxisColor,
  xAxisTickRotation,
  xAXisLabelFontSize,
}) {
  let xAxis, axisOffset, labelOffset
  if (xAxisPosition === 'top') {
    xAxis = d3.axisTop(xScale)
    axisOffset = 0
    labelOffset = -xAxisLabelOffset
  } else {
    xAxis = d3.axisBottom(xScale)
    axisOffset = coreChartHeight
    labelOffset = xAxisLabelOffset
  }

  xAxis.tickValues(
    xScale.domain().filter(function (d, i) {
      return !(i % showOnlyEveryNthValue)
    }),
  )

  const xAxisGroup = chartCore
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${axisOffset})`)
    .call(xAxis)
    .call(g => {
      const tickGroup = g.selectAll('.tick text')
      tickGroup
        .attr('y', 0)
        .attr('dy', '0em')
        .attr('transform', `rotate(${xAxisTickRotation})`)
        .attr('dx', '1em')
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
    })

  xAxisGroup
    .append('text')
    // .attr('text-anchor', 'middle')
    // .attr('dominant-baseline', 'middle')
    .style('font-size', `${xAXisLabelFontSize}px`)
    .attr('fill', xAxisColor)
    .attr('transform', `translate(${coreChartWidth / 2}, ${labelOffset})`)
    .text(xAxisLabel)
}
