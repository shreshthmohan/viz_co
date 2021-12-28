/* eslint-disable no-import-assign */
/* global window */
import * as d3 from 'd3'
import _ from 'lodash-es'
import { preventOverflow, toClassText } from '../../utils/helpers/general'
import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'

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

    normalLegendLabel = 'Normal',
    highlightedLegendLabel = 'Highlighted',

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
    colorStrategy,
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
    svg,
    chartContainerSelector,
    dominoValues,
  })

  // Legends
  renderColorLegend({
    xScale,
    yScale,
    widgetsRight,
    colorDominoHighlighted,
    highlightedLegendLabel,
    colorDominoNormal,
    normalLegendLabel,
  })

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function applyInteractionStyles() {
  d3.select('body').append('style').html(`
  rect.domino.domino-hovered {
    stroke: #333;
  }
  g.dominos.searching g rect.domino-matched {
    stroke: #333;
  }
  .searching rect:not(.domino-matched) {
    opacity: 0.2;
  }
  `)
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
  colorStrategy,
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

  const colorScaleRankStrat = val =>
    val >= colorThreshold ? colorDominoNormal : colorDominoHighlighted

  const colorScaleValueStrat = val =>
    val >= colorThreshold ? colorDominoHighlighted : colorDominoNormal

  return {
    xScale,
    yScale,
    colorScale:
      colorStrategy === 'value' ? colorScaleValueStrat : colorScaleRankStrat,
  }
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

const searchEventHandler = referenceList => (qstr, svg) => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    referenceList.forEach(val => {
      const dominoName = toClassText(val)
      if (val.toLowerCase().includes(lqstr)) {
        svg.selectAll(`.domino-${dominoName}`).classed('domino-matched', true)
      } else {
        svg.selectAll(`.domino-${dominoName}`).classed('domino-matched', false)
      }
      svg.select('.dominos').classed('searching', true)
    })
  } else {
    svg.selectAll('.domino').classed('domino-matched', false)
    svg.select('.dominos').classed('searching', false)
  }
}
function renderColorLegend({
  xScale,
  yScale,
  widgetsRight,
  colorDominoHighlighted,
  highlightedLegendLabel,
  colorDominoNormal,
  normalLegendLabel,
}) {
  const colorLegend = widgetsRight.append('svg')
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
  svg,
  chartContainerSelector,
  dominoValues,
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
        _(dominoValues)
          .uniq()
          .map(el => `<option>${el}</option>`)
          .join(''),
      )

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)

  enableSearchSuggestions &&
    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`)

  search.attr('placeholder', `Find by ${dominoField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr, svg)
  })
  return search
}
