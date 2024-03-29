/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'
import { swatches } from '../../utils/helpers/colorLegend'

import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'

import { preventOverflow, toClassText } from '../../utils/helpers/general'
import { dashedLegend } from '../../utils/helpers/dashedLegend'

export function renderChart({
  data,
  dimensions: { groupField, xField, yField, seriesField },
  options: {
    aspectRatio = 1,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    alternatingTickLabelsXAxis = true,

    xAxisLabel = xField,
    yAxisLabel = yField,

    verticalLines = [],
    verticalDashedLineLabels = [],

    colorScheme = d3.schemeSpectral[8],

    areaOpacity = 0.5,

    yAxisTickSizeOffset = 30,
    yAxisTicksFontSize = '12px',
    yAxisPosition = 'left',
    yAxisGridLines = false,
    yAxisLabelHorizontalOffset = 10,

    xAxisTicksFontSize = '12px',
    xAxisPosition = 'bottom',
    xAxisTickSizeOffset = 10,
    xAxisGridLines = false,
  },
  chartContainerSelector,
}) {
  const coreChartWidth = 1200
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

  const defaultGroupFieldName = '_defaultGroup_'
  groupField = groupField == null ? defaultGroupFieldName : groupField
  const { dataParsed, seriesValues } = parseData({
    data,
    yField,
    defaultGroupFieldName,
    seriesField,
  })

  const {
    yGridScale,
    xScale,
    yScale,
    colorScale,
    yGridDomain,
    xDomain,
    yDomain,
  } = setupScales({
    dataParsed,
    groupField,
    coreChartHeight,
    yField,
    xField,
    coreChartWidth,
    colorScheme,
    seriesValues,
  })

  const area = d3
    .area()
    .x(d => xScale(d[xField]))
    .y1(d => yScale(d[yField]))
    .y0(() => yScale(d3.min(yDomain)))

  chartCore
    .selectAll('g.grid-row')
    .data(yGridDomain)
    .join('g')
    .attr('class', 'grid-row')
    .attr('data-group', d => d)
    .attr('transform', d => `translate(0, ${yGridScale(d)})`)

    .each(function (d, i) {
      let ctx = this
      renderXAxis({
        ctx,
        i,
        xScale,
        yGridScale,
        alternatingTickLabelsXAxis,
        xAxisTicksFontSize,
        xAxisPosition,
        xAxisTickSizeOffset,
        xAxisGridLines,
      })

      renderYAxis({
        ctx,
        yScale,
        yAxisPosition,
        coreChartWidth,
        yAxisTickSizeOffset,
        yAxisTicksFontSize,
        yAxisGridLines,
      })

      // Group label
      d3.select(this)
        .append('text')
        .attr('transform', `translate(-10, ${yGridScale.bandwidth()})`)
        .text(d)
        .attr('text-anchor', 'end')
        .style('font-weight', 'bold')
        .attr('dominant-baseline', 'middle')

      d3.select(this)
        .selectAll('path.series')
        .data(seriesValues)
        .join('path')
        .attr('class', 'series')
        .attr('d', s =>
          area(
            dataParsed.filter(c => c[groupField] === d && c[seriesField] === s),
          ),
        )
        .attr('fill', s => colorScale(s))
        .attr('opacity', areaOpacity)
    })
    .each(function (d) {
      const filteredLines = verticalLines.filter(c => c.group === d)

      d3.select(this)
        .selectAll('path.vertical-line')
        .data(filteredLines)
        .join('path')
        .attr('class', 'vertical-line')
        .attr('d', s =>
          d3.line()([
            [xScale(s.x), yScale(d3.min(yDomain))],
            [xScale(s.x), yScale(d3.max(yDomain))],
          ]),
        )
        .attr('stroke-width', 3)
        .attr('stroke', s => colorScale(s.series))
        .attr('stroke-dasharray', '6 4')

      d3.select(this)
        .selectAll('circle')
        .data(dataParsed.filter(c => c[groupField] === d))
        .join('circle')
        .attr('cx', dp => xScale(dp[xField]))
        .attr('cy', dp => yScale(dp[yField]))
        .attr('r', 5)
        .attr('fill', dp => colorScale(dp[seriesField]))
        .attr('stroke', '#333')
        .attr('stroke-width', 1)
        .attr('opacity', 0)
        .attr(
          'class',
          dp => `${toClassText(dp[groupField])}-${toClassText(dp[xField])}`,
        )

      // Invisible Rects for tooltips
      d3.select(this)
        .selectAll('rect')
        .data(xDomain)
        .join('rect')
        .attr('x', xd => xScale(xd) - xScale.step() / 2)
        .attr('y', 0)
        .attr('width', xScale.step())
        .attr('height', yGridScale.bandwidth())
        .attr('opacity', 0)
        .attr('fill', 'gray')
        .attr('stroke', 'black')
        .on('mouseover', (e, xd) => {
          const dpf = dataParsed.filter(
            c => c[groupField] === d && c[xField] === xd,
          )

          tooltipDiv.transition().duration(200).style('opacity', 1)

          const values = dpf.map(dpfe => {
            d3.selectAll(
              `circle.${toClassText(dpfe[groupField])}-${toClassText(
                dpfe[xField],
              )}`,
            ).attr('opacity', 1)

            return `<div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${colorScale(
              dpfe[seriesField],
            )}"></div> ${dpfe[seriesField]}: ${dpfe[yField]}`
          })

          tooltipDiv.html(`${dpf[0][groupField]}
          <br/>
          ${values.join('<br/>')}`)

          tooltipDiv
            .style('left', `${e.clientX + 20}px`)
            .style('top', `${e.clientY - 20 + window.scrollY}px`)
        })
        .on('mousemove', e => {
          tooltipDiv
            .style('left', `${e.clientX + 20}px`)
            .style('top', `${e.clientY - 20 + window.scrollY}px`)
        })
        .on('mouseout', (e, xd) => {
          const dpf = dataParsed.filter(
            c => c[groupField] === d && c[xField] === xd,
          )
          dpf.forEach(dpfe =>
            d3
              .selectAll(
                `circle.${toClassText(dpfe[groupField])}-${toClassText(
                  dpfe[xField],
                )}`,
              )
              .attr('opacity', 0),
          )

          tooltipDiv
            .style('left', '-300px')
            .transition()
            .duration(500)
            .style('opacity', 0)
        })
    })

  // x-axis label
  chartCore
    .append('g')
    .attr('class', 'x-axis-label')
    .attr(
      'transform',
      `translate(${coreChartWidth / 2}, ${coreChartHeight + 20})`,
    )
    .append('text')
    .text(xAxisLabel)
    .attr('dominant-baseline', 'hanging')
    .attr('text-anchor', 'middle')
    .style('font-weight', 'bold')

  // y-axis label
  chartCore
    .append('g')
    .attr('class', 'y-axis-label')
    .attr(
      'transform',
      `translate(${
        coreChartWidth + yAxisTickSizeOffset + yAxisLabelHorizontalOffset
      }, -20)`,
    )
    .append('text')
    .text(yAxisLabel)
    .attr('text-anchor', 'end')
    .style('font-weight', 'bold')

  widgetsRight
    .append('div')
    .html(dashedLegend({ labels: verticalDashedLineLabels, color: colorScale }))

  widgetsRight.append('div').html(
    swatches({
      color: colorScale,
      uid: 'rs',
      customClass: 'font-nunito font-bold',
    }),
  )

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function parseData({ data, yField, defaultGroupFieldName, seriesField }) {
  const dataParsed = data.map(el => {
    const elParsed = { ...el }
    elParsed[yField] = Number.parseFloat(el[yField])
    elParsed[defaultGroupFieldName] = 'defaultGroup'
    return elParsed
  })

  const seriesValues = _(dataParsed).map(seriesField).uniq().value()

  return { dataParsed, seriesValues }
}

function setupScales({
  dataParsed,
  groupField,
  coreChartHeight,
  yField,
  xField,
  coreChartWidth,
  colorScheme,
  seriesValues,
}) {
  const yGridDomain = _(dataParsed).map(groupField).uniq().value()

  const yGridScale = d3
    .scaleBand()
    .range([coreChartHeight, 0])
    .domain(yGridDomain)
    .paddingInner(0.15)

  const yDomain = d3.extent(_(dataParsed).map(yField))
  // console.log({ yDomain })
  const yScale = d3
    .scaleLinear()
    .range([yGridScale.bandwidth(), 0])
    .domain(yDomain)
    .nice()

  const xDomain = _(dataParsed)
    .map(xField)
    .uniq()
    .value()
    // TODO handle case when not numbers
    .sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b))

  const xScale = d3.scalePoint().range([0, coreChartWidth]).domain(xDomain)

  const colorScale = d3.scaleOrdinal().range(colorScheme).domain(seriesValues)

  return {
    yGridScale,
    xScale,
    yScale,
    colorScale,
    yGridDomain,
    xDomain,
    yDomain,
  }
}

function renderXAxis({
  ctx,
  i,
  xScale,
  yGridScale,
  alternatingTickLabelsXAxis,
  xAxisTicksFontSize,
  xAxisPosition,
  xAxisTickSizeOffset,
  xAxisGridLines,
}) {
  let xAxis, xAxisOffset
  if (xAxisPosition === 'top') {
    xAxis = d3.axisTop(xScale)
    xAxisOffset = -xAxisTickSizeOffset
  } else {
    xAxis = d3.axisBottom(xScale)
    xAxisOffset = yGridScale.bandwidth() + xAxisTickSizeOffset
  }

  d3.select(ctx)
    .append('g')
    .attr('class', 'x-axis')
    .style('font-size', xAxisTicksFontSize)
    .attr('transform', `translate(0, ${xAxisOffset})`)
    .call(
      xAxisGridLines
        ? xAxis.tickSize(-yGridScale.bandwidth() - xAxisTickSizeOffset)
        : xAxis,
    )
    .call(g => {
      g.selectAll('.domain').attr('stroke', '#333')
      g.selectAll('.tick line').attr('stroke', '#333')
      g.selectAll('.tick text').attr('fill', '#333')
      g.selectAll('.tick line').attr('stroke-opacity', '0.2')
      g.select('.domain').remove()
      if (i % 2 !== 0 && alternatingTickLabelsXAxis) {
        g.selectAll('.tick text').remove()
      }
    })
}

function renderYAxis({
  ctx,
  yScale,
  yAxisPosition,
  coreChartWidth,
  yAxisTickSizeOffset,
  yAxisTicksFontSize,
  yAxisGridLines,
}) {
  let yAxis, yAxisOffset
  if (yAxisPosition === 'right') {
    yAxis = d3.axisRight(yScale)
    yAxisOffset = coreChartWidth + yAxisTickSizeOffset
  } else {
    yAxis = d3.axisLeft(yScale)
    yAxisOffset = -yAxisTickSizeOffset
  }

  d3.select(ctx)
    .append('g')
    .attr('class', 'y-axis')
    .style('font-size', yAxisTicksFontSize)
    .attr('transform', `translate(${yAxisOffset}, 0)`)
    .call(
      yAxisGridLines
        ? yAxis.tickSize(-coreChartWidth - yAxisTickSizeOffset)
        : yAxis,
    )
    .call(g => {
      g.selectAll('.tick line').attr('stroke-opacity', '0.2')
      g.selectAll('.tick text').attr('fill', '#333')
      g.select('.domain').remove()
    })
}
