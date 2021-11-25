/* eslint-disable no-import-assign */
/* global window */
import * as d3 from 'd3'
import _ from 'lodash-es'
import { renderDominoBase } from '../..'
import { preventOverflow, toClassText } from '../../utils/helpers/general'

function applyInteractionStyles() {
  d3.select('body').append('style').html(`
  rect.domino.domino-hovered {
    stroke: #333;
  }
  g.dominos.searching g rect.domino-matched {
    stroke: #333;
  }
  `)
}

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
      'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
    )
}

function parseData({ data, colorField, yField }) {
  let dataParsed = data.map(el => {
    const elParsed = { ...el }
    elParsed[colorField] = Number.parseFloat(el[colorField])
    return elParsed
  })

  dataParsed = _(dataParsed)
    .groupBy(yField)
    .map(val => {
      val.forEach((val_, i) => {
        // eslint-disable-next-line no-param-reassign
        val_.__idx__ = i
      })
      const sortedArray = _.orderBy(val, colorField, 'desc')
      sortedArray.forEach((val_, i) => {
        // eslint-disable-next-line no-param-reassign
        val_.__rank__ = i
      })
      const unsortedArray = _.orderBy(sortedArray, '__idx__', 'asc')
      return unsortedArray
    })
    .value()
    .flat()
  return dataParsed
}

function setupScales({
  dataParsed,
  xField,
  yField,
  dominoSize,
  coreChartWidth,
  coreChartHeight,
  xPaddingOuter,
  ySortOrder,
  yPaddingOuter,
  yPaddingInner,
  colorThreshold,
  colorDominoNormal,
  colorDominoHighlighted,
}) {
  // Data should be sorted on xField and provided.
  const xDomain = _(dataParsed).map(xField).uniq().value()
  const xPaddingInner = 1 - dominoSize
  const xScale = d3
    .scaleBand()
    .domain(xDomain)
    .range([0, coreChartWidth])
    .paddingInner(xPaddingInner)
    .paddingOuter(xPaddingOuter)

  // y-scale
  const yDomain = _(dataParsed)
    .orderBy([yField], [ySortOrder])
    .map(yField)
    .uniq()
    .value()

  const yScale = d3
    .scaleBand()
    .domain(yDomain)
    .range([0, coreChartHeight])
    .paddingInner(yPaddingInner)
    .paddingOuter(yPaddingOuter)

  // colorStrategy
  const colorScale = threshold =>
    threshold >= colorThreshold ? colorDominoNormal : colorDominoHighlighted

  return { xScale, yScale, colorScale }
}

function renderYAxis({ chartCore, yScale }) {
  chartCore
    .append('g')
    .attr('class', 'y-axis-left')
    .call(d3.axisLeft(yScale).tickSize(0))
    .call(g => g.select('.domain').remove())
}

function renderXAxis({ chartCore, xAxisLabel, coreChartWidth }) {
  chartCore
    .append('text')
    .text(xAxisLabel)
    .attr('transform', `translate(${coreChartWidth / 2}, 0)`)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
}

function renderDominos({
  dataParsed,
  yField,
  chartCore,
  yScale,
  dominoField,
  xScale,
  xField,
  colorScale,
  colorField,
  colorStrategy,
  tooltipDiv,
}) {
  const nestedData = d3
    .groups(dataParsed, d => d[yField])
    .map(([key, values]) => ({
      [yField]: key,
      values,
    }))

  const cGroup = chartCore
    .append('g')
    .attr('class', 'dominos')
    .selectAll('g')
    .data(nestedData)
    .join('g')
    .attr('id', d => `${yField}-${d[yField]}`)
    .attr('transform', d => `translate(0, ${yScale(d[yField])})`)

  cGroup
    .selectAll('rect')
    .data(d => d.values)
    .join('rect')
    .attr('class', d => {
      const dominoName = toClassText(d[dominoField])
      return `domino domino-${dominoName}`
    })
    .attr('width', xScale.bandwidth())
    .attr('height', yScale.bandwidth())
    .attr('x', d => xScale(d[xField]))
    .attr('y', 0)
    .attr('fill', d =>
      colorScale(colorStrategy === 'value' ? d[colorField] : d.__rank__),
    )
    .on('mouseover', (e, d) => {
      d3.select(e.target).classed('domino-hovered', true)

      tooltipDiv.transition().duration(200).style('opacity', 1)

      tooltipDiv.html(`${d[dominoField]}, Pick # ${d[xField]}`)
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      d3.select(e.target).classed('domino-hovered', false)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })
}

const searchEventHandler = referenceList => qstr => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    referenceList.forEach(val => {
      const dominoName = toClassText(val)
      if (val.toLowerCase().includes(lqstr)) {
        d3.select(`.domino-${dominoName}`).classed('domino-matched', true)
      } else {
        d3.select(`.domino-${dominoName}`).classed('domino-matched', false)
      }
      d3.select('.dominos').classed('searching', true)
    })
  } else {
    referenceList.forEach(val => {
      const dominoName = toClassText(val)
      d3.select(`.domino-${dominoName}`).classed('domino-matched', false)
    })
    d3.select('.dominos').classed('searching', false)
  }
}
function renderColorLegend({}) {
  const colorLegend = d3.select('#color-legend').append('svg')
  const colorLegendContainerGroup = colorLegend.append('g')
  const dominoWidth = xScale.bandwidth()
  const dominoHeight = yScale.bandwidth()
  const highlightedLegend = colorLegendContainerGroup.append('g')
  highlightedLegend
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', dominoWidth)
    .attr('height', dominoHeight)
    .attr('fill', colorDominoHighlighted)
  highlightedLegend
    .append('text')
    .attr('x', dominoWidth + 5)
    .attr('y', dominoHeight / 2)
    .attr('font-size', 12)
    .attr('dominant-baseline', 'middle')
    .text(highlightedLegendLabel)
  const xShift = highlightedLegend.node().getBBox().width
  const normalLegend = colorLegendContainerGroup
    .append('g')
    .attr('transform', `translate(${xShift + 20}, 0)`)
  normalLegend
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', dominoWidth)
    .attr('height', dominoHeight)
    .attr('fill', colorDominoNormal)
  normalLegend
    .append('text')
    .attr('x', dominoWidth + 5)
    .attr('y', dominoHeight / 2)
    .attr('font-size', 12)
    .attr('dominant-baseline', 'middle')
    .text(normalLegendLabel)
  const colorLegendDimensions = colorLegendContainerGroup.node().getBBox()
  colorLegend
    .attr('width', colorLegendDimensions.width)
    .attr('height', colorLegendDimensions.height)
}

function setupSearch({
  handleSearch,
  widgetsLeft,
  searchInputClassNames,
  dominoField,
}) {
  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  // TODO: refactor hidden, won't be needed if we add this node
  search.attr('placeholder', `Find by ${dominoField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr)
  })
  return search
}

export function renderChart({
  data,
  options: {
    aspectRatio = 2,

    marginTop = 60,
    marginRight = 90,
    marginBottom = 20,
    marginLeft = 50,

    bgColor = 'transparent',

    xPaddingOuter = 0.2,
    xAxisLabel = xField,

    dominoSize = 0.2,

    yPaddingInner = 0.2,
    yPaddingOuter = 0.2,
    ySortOrder = 'desc',

    colorStrategy = 'value',
    colorThreshold = 10,
    colorDominoHighlighted = '#c20a66',
    colorDominoNormal = '#d9e2e4',

    normalLegendLabel = 'Normal Player',
    highlightedLegendLabel = 'Best Player',

    searchInputClassNames = '',
  },
  dimensions: { xField, yField, dominoField, colorField },

  chartContainerSelector,
}) {
  applyInteractionStyles()

  const coreChartWidth = 1000
  const {
    svg,
    coreChartHeight,
    allComponents,
    chartCore,
    widgetsLeft,
    widgetsRight,
  } = setupChartArea({
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

  const dataParsed = parseData({
    data,
    colorField,
    yField,
  })

  const { xScale, yScale, colorScale } = setupScales({
    dataParsed,
    xField,
    yField,
    dominoSize,
    coreChartWidth,
    coreChartHeight,
    xPaddingOuter,
    ySortOrder,
    yPaddingOuter,
    yPaddingInner,
    colorThreshold,
    colorDominoNormal,
    colorDominoHighlighted,
  })

  renderYAxis({ chartCore, yScale })

  renderDominos({
    dataParsed,
    yField,
    chartCore,
    yScale,
    dominoField,
    xScale,
    xField,
    colorScale,
    colorField,
    colorStrategy,
    tooltipDiv,
  })

  renderXAxis({ chartCore, xAxisLabel, coreChartWidth })

  const dominoValues = _(dataParsed).map(dominoField).uniq().value()
  const handleSearch = searchEventHandler(dominoValues)
  setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    dominoField,
  })

  // Legends

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}
