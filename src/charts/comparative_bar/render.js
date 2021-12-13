/* global window */

import * as d3 from 'd3'
import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'

import { preventOverflow } from '../../utils/helpers/general'

export function renderChart({
  data,
  options: {
    aspectRatio = 0.7,

    bgColor = 'transparent',
    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    colorScheme = ['#3077aa', '#ed3833'],
    barOpacity = 1,

    barValueMidPoint = 50,

    axesTickSize = 10,

    leftXAxisLabel = barLeftValueField,
    rightXAxisLabel = barRightValueField,
    xAxisLabel = '',
  },
  dimensions: {
    yField,
    barLeftValueField,
    barRightValueField,
    barLeftLabelField,
    barRightLabelField,
  },
  chartContainerSelector,
}) {
  d3.select('body').append('style').html(`
  g.bar {
    stroke: ${bgColor};
  }
  g.bar.bar-hovered {
    stroke: #333;
    stroke-width: 1;
  }
`)

  const tooltipDiv = initializeTooltip()

  const coreChartWidth = 1200

  const { svg, coreChartHeight, allComponents, chartCore } = setupChartArea({
    chartContainerSelector,
    coreChartWidth,
    aspectRatio,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    bgColor,
  })

  const markerSymbol = d3.symbol().type(d3.symbols[5]) // 5 is for triangle

  const yDomain = data.map(el => el[yField])
  const yScale = d3
    .scaleBand()
    .range([0, coreChartHeight])
    .domain(yDomain)
    .paddingInner(0.8)
    .paddingOuter(0.7)

  const maxRight = d3.max(
    data.map(el => Number.parseFloat(el[barRightValueField])),
  )
  const maxLeft = d3.max(
    data.map(el => Number.parseFloat(el[barLeftValueField])),
  )
  const maxOverall = d3.max([maxLeft, maxRight])

  const minRight = d3.min(
    data.map(el => Number.parseFloat(el[barRightValueField])),
  )
  const minLeft = d3.min(
    data.map(el => Number.parseFloat(el[barLeftValueField])),
  )
  const minOverall = d3.min([minLeft, minRight])

  const xStartActual = d3.min([barValueMidPoint, minOverall])

  const xScaleLeft = d3
    .scaleLinear()
    .range([coreChartWidth / 2, 0])
    .domain([xStartActual, maxOverall])
    .nice()
  const xScaleRight = d3
    .scaleLinear()
    .range([coreChartWidth / 2, coreChartWidth])
    .domain([xStartActual, maxOverall])
    .nice()

  const xStart = d3.min(xScaleRight.domain())

  const symbolSize = yScale.bandwidth() ** 2 * 1
  const testSymbol = chartCore
    .append('g')
    .attr('class', 'test-symbol')
    .append('path')
    .attr('d', markerSymbol.size(symbolSize))
  const testSymbolDimensions = testSymbol.node().getBBox()
  // Note using height because the triangle is rotated by 90 degrees
  const triangleOffset = testSymbolDimensions.height
  const symbolConstant = Math.sqrt(symbolSize) / triangleOffset
  testSymbol.remove()

  const leftBarsContainer = chartCore.append('g').attr('class', 'left-bars')

  const leftBars = leftBarsContainer
    .selectAll('g')
    .data(data)
    .join('g')
    .attr('class', 'bar')
    .on('mouseover', function (e, d) {
      d3.select(this).classed('bar-hovered', true)

      tooltipDiv.transition().duration(200).style('opacity', 1)

      tooltipDiv.html(`${leftXAxisLabel}: ${d[barLeftValueField]}`)
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', function () {
      d3.select(this).classed('bar-hovered', false)

      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  leftBars
    .append('rect')
    .attr('x', d => xScaleLeft(d[barLeftValueField]) + triangleOffset)
    .attr('y', d => yScale(d[yField]))
    .attr('height', yScale.bandwidth())
    .attr('width', d => {
      const rw =
        xScaleLeft(xStart) - xScaleLeft(d[barLeftValueField]) - triangleOffset
      return rw > 0 ? rw : 0
    })
    .attr('fill', colorScheme[0])
    .attr('stroke-width', 1)
    .attr('opacity', barOpacity)

  // Left Symbols
  leftBars
    .append('path')
    .attr('transform', d => {
      const w = xScaleLeft(xStart) - xScaleLeft(d[barLeftValueField])

      return `translate(${
        w > triangleOffset
          ? xScaleLeft(d[barLeftValueField]) + (triangleOffset * 2) / 3
          : xScaleLeft(xStart) - w / 3
      }, ${yScale(d[yField]) + yScale.bandwidth() / 2})
         rotate(-90)`
    })
    .attr('d', d => {
      const w = xScaleLeft(xStart) - xScaleLeft(d[barLeftValueField])
      if (w > triangleOffset) {
        return markerSymbol.size(symbolSize)(d)
      }
      const customTriangleSize = (w * symbolConstant) ** 2
      return markerSymbol.size(customTriangleSize)()
    })
    .attr('fill', colorScheme[0])
    .attr('opacity', barOpacity)

  leftBars
    .append('text')
    .text(d => d[barLeftLabelField])
    .attr('text-anchor', 'end')
    .style('dominant-baseline', 'middle')
    .attr('x', d => xScaleLeft(d[barLeftValueField]) - 5)
    .attr('y', d => yScale(d[yField]) + yScale.bandwidth() / 2)
    .style('font-size', '14px')
    .attr('stroke', '#333')
    .attr('stroke-width', 0)

  const rightBarsContainer = chartCore.append('g').attr('class', 'right-bars')

  const rightBars = rightBarsContainer
    .selectAll('g')
    .data(data)
    .join('g')
    .attr('class', 'bar')
    .on('mouseover', function (e, d) {
      d3.select(this).classed('bar-hovered', true)

      tooltipDiv.transition().duration(200).style('opacity', 1)

      tooltipDiv.html(`${rightXAxisLabel}: ${d[barRightValueField]}`)
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', function () {
      d3.select(this).classed('bar-hovered', false)

      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  rightBars
    .append('rect')
    .attr('x', xScaleRight(xStart))
    .attr('y', d => yScale(d[yField]))
    .attr('height', yScale.bandwidth())
    .attr('width', d => {
      const rw =
        -xScaleRight(xStart) +
        xScaleRight(d[barRightValueField]) -
        triangleOffset
      return rw > 0 ? rw : 0
    })
    .attr('fill', colorScheme[1])
    .attr('stroke-width', 1)
    .attr('opacity', barOpacity)

  // Right Symbols
  rightBars
    .append('path')
    .attr('transform', d => {
      const w = -xScaleRight(xStart) + xScaleRight(d[barRightValueField])

      const xOffset =
        xScaleRight(d[barRightValueField]) - (triangleOffset * 2) / 3
      return `translate(${
        w > triangleOffset ? xOffset : xScaleRight(xStart) + w / 3
      }, ${yScale(d[yField]) + yScale.bandwidth() / 2}) rotate(90)`
    })
    .attr('d', d => {
      const w = -xScaleRight(xStart) + xScaleRight(d[barRightValueField])
      if (w > triangleOffset) {
        return markerSymbol.size(symbolSize)()
      }
      const customTriangleSize = (w * symbolConstant) ** 2
      return markerSymbol.size(customTriangleSize)()
    })
    .attr('fill', colorScheme[1])
    .attr('opacity', barOpacity)

  rightBars
    .append('text')
    .text(d => d[barRightLabelField])
    .attr('text-anchor', 'start')
    .style('dominant-baseline', 'middle')
    .attr('x', d => xScaleRight(d[barRightValueField]) + 5)
    .attr('y', d => yScale(d[yField]) + yScale.bandwidth() / 2)
    .style('font-size', '14px')
    .attr('stroke', '#333')
    .attr('stroke-width', 0)

  // Dimension Labels
  chartCore
    .append('g')
    .selectAll('text')
    .data(data)
    .join('text')
    .text(d => d[yField])
    .attr('x', coreChartWidth / 2)
    .attr('y', d => yScale(d[yField]) - 7)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'text-top')
    .attr('fill', '#444')
    .attr('font-weight', 'bold')

  // Left axis
  leftBarsContainer
    .append('g')
    .call(d3.axisTop(xScaleLeft).tickSize(axesTickSize))
    .call(g => {
      g.select('.domain').remove()
      g.selectAll('.tick line').attr('stroke', '#555')
      g.selectAll('.tick text').attr('fill', '#555').attr('font-size', 12)
    })

  // Right axis
  rightBarsContainer
    .append('g')
    .call(d3.axisTop(xScaleRight).tickSize(axesTickSize))
    .call(g => {
      g.select('.domain').remove()
      g.selectAll('.tick line').attr('stroke', '#555')
      g.selectAll('.tick text').attr('fill', '#555').attr('font-size', 12)

      // Remove overlapping duplicate elements
      // g.select('.tick > line:first-of-type').remove()
      // g.select('.tick > text:first-of-type').remove()
    })

  const topLegend = chartCore.append('g').attr('class', 'top-legend')

  // Center divider
  const centerDividerWidth = 2

  topLegend
    .append('rect')
    .attr('x', xScaleLeft(xStart) - (centerDividerWidth - 1) / 2)
    .attr('y', -axesTickSize * 5)
    .attr('height', axesTickSize * 2)
    .attr('width', centerDividerWidth)
    .attr('fill', '#000')

  // left triangle
  topLegend
    .append('path')
    .attr('d', markerSymbol.size(symbolSize / 2))
    .attr(
      'transform',
      `translate(${
        xScaleLeft(xStart) -
        triangleOffset / 4 -
        5 -
        (centerDividerWidth - 1) / 2
      }, ${-axesTickSize * 4}) rotate(-90)`,
    )
    .attr('fill', colorScheme[0])

  // left label
  topLegend
    .append('text')
    .text(leftXAxisLabel)
    .attr(
      'transform',
      `translate(${
        xScaleLeft(xStart) - triangleOffset - 5 - (centerDividerWidth - 1) / 2
      }, ${-axesTickSize * 4}) `,
    )
    .attr('fill', colorScheme[0])
    .attr('dominant-baseline', 'middle')
    .attr('text-anchor', 'end')
    .attr('style', 'font-weight: bold;')

  // right triangle
  topLegend
    .append('path')
    .attr('d', markerSymbol.size(symbolSize / 2))
    .attr(
      'transform',
      `translate(${
        xScaleLeft(xStart) +
        triangleOffset / 4 +
        5 +
        (centerDividerWidth + 1) / 2
      }, ${-axesTickSize * 4}) rotate(90)`,
    )
    .attr('fill', colorScheme[1])

  // right label
  topLegend
    .append('text')
    .text(rightXAxisLabel)
    .attr(
      'transform',
      `translate(${
        xScaleLeft(xStart) + triangleOffset + 5 + (centerDividerWidth + 1) / 2
      }, ${-axesTickSize * 4}) `,
    )
    .attr('fill', colorScheme[1])
    .attr('dominant-baseline', 'middle')
    .attr('text-anchor', 'start')
    .attr('style', 'font-weight: bold;')

  // top label
  topLegend
    .append('text')
    .text(xAxisLabel)
    .attr(
      'transform',
      `translate(${xScaleLeft(xStart)}, ${-axesTickSize * 6}) `,
    )
    .attr('fill', '#333')
    .attr('dominant-baseline', 'middle')
    .attr('text-anchor', 'middle')
    .attr('style', 'font-weight: bold;')

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}
