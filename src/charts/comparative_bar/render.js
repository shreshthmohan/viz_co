/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'
import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'

import { preventOverflow, toClassText } from '../../utils/helpers/general'

export function renderChart({
  data,
  options: {
    aspectRatio = 0.7,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    colorScheme = ['#3077aa', '#ed3833'],

    barValueMidPoint = 50,

    xAxisTickSize = 10,
    leftXAxisLabel = barLeftValueField,
    rightXAxisLabel = barRightValueField,
    xAxisLabel = '',

    defaultState = [],

    inactiveOpacity = 0.2,
    activeOpacity = 1,

    goToInitialStateButtonClassNames = '',
    searchInputClassNames = '',
    clearAllButtonClassNames = '',
    showAllButtonClassNames = '',
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
  applyInteractionStyles({ bgColor, inactiveOpacity, activeOpacity })

  const tooltipDiv = initializeTooltip()

  const coreChartWidth = 1200

  const { svg, coreChartHeight, allComponents, chartCore, widgetsLeft } =
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

  const {
    yDomain,
    maxOverall,
    xStartActual,
    dimensionValues,
    defaultStateAll,
  } = parseData({
    data,
    yField,
    barRightValueField,
    barLeftValueField,
    barValueMidPoint,
    defaultState,
  })

  const { yScale, xScaleLeft, xScaleRight, xStart } = setupScales({
    coreChartHeight,
    coreChartWidth,
    yDomain,
    xStartActual,
    maxOverall,
  })

  const { markerSymbol, symbolSize, triangleOffset, symbolConstant } =
    setupBarSymbol({ yScale, chartCore })

  const { leftBarsContainer, rightBarsContainer } = renderBars({
    chartCore,
    coreChartWidth,
    data,
    tooltipDiv,
    leftXAxisLabel,
    barLeftValueField,
    xScaleLeft,
    yScale,
    yField,
    triangleOffset,
    xStart,
    colorScheme,
    markerSymbol,
    symbolSize,
    symbolConstant,
    barLeftLabelField,
    rightXAxisLabel,
    barRightValueField,
    xScaleRight,
    barRightLabelField,
    defaultStateAll,
  })

  renderXAxis({ leftBarsContainer, xScaleLeft, xAxisTickSize })

  renderYAxis({ rightBarsContainer, xScaleRight, xAxisTickSize })

  renderLegends({
    chartCore,
    xScaleLeft,
    xStart,
    xAxisTickSize,
    markerSymbol,
    symbolSize,
    triangleOffset,
    colorScheme,
    leftXAxisLabel,
    rightXAxisLabel,
    xAxisLabel,
  })

  const handleSearch = searchEventHandler(dimensionValues)
  const search = setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    yField,
    svg,
    chartContainerSelector,
    dimensionValues,
  })

  setupInitialStateButton({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
    svg,
  })

  setupClearAllButton({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
    svg,
  })

  setupShowAllButton({
    widgetsLeft,
    showAllButtonClassNames,
    search,
    handleSearch,
    svg,
  })

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function applyInteractionStyles({ bgColor, inactiveOpacity, activeOpacity }) {
  d3.select('body').append('style').html(`
  g.bar {
    stroke: ${bgColor};
    fill-opacity: ${inactiveOpacity};
  }
  g.bar.bar-active {
    stroke: ${bgColor};
    fill-opacity: ${activeOpacity};
  }
  g.left-bars.searching .bar.bar-matched {
    stroke: #333;
    stroke-width: 2;
  }
  g.right-bars.searching .bar.bar-matched {
    stroke: #333;
    stroke-width: 2;
  }
  g.bar.bar-hovered {
    stroke: #333;
    stroke-width: 2;
  }
`)
}

function parseData({
  data,
  yField,
  barRightValueField,
  barLeftValueField,
  barValueMidPoint,
  defaultState,
}) {
  const yDomain = data.map(el => el[yField])
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

  const dimensionValues = _(data).map(yField).uniq().value()
  const defaultStateAll =
    defaultState === 'All' ? dimensionValues : defaultState

  return { yDomain, maxOverall, xStartActual, dimensionValues, defaultStateAll }
}

function setupScales({
  coreChartHeight,
  coreChartWidth,
  yDomain,
  xStartActual,
  maxOverall,
}) {
  const yScale = d3
    .scaleBand()
    .range([0, coreChartHeight])
    .domain(yDomain)
    .paddingInner(0.8)
    .paddingOuter(0.7)

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
  return { yScale, xScaleLeft, xScaleRight, xStart }
}

function renderLegends({
  chartCore,
  xScaleLeft,
  xStart,
  xAxisTickSize,
  markerSymbol,
  symbolSize,
  triangleOffset,
  colorScheme,
  leftXAxisLabel,
  rightXAxisLabel,
  xAxisLabel,
}) {
  const topLegend = chartCore.append('g').attr('class', 'top-legend')

  // Center divider
  const centerDividerWidth = 2

  topLegend
    .append('rect')
    .attr('x', xScaleLeft(xStart) - (centerDividerWidth - 1) / 2)
    .attr('y', -xAxisTickSize * 5)
    .attr('height', xAxisTickSize * 2)
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
      }, ${-xAxisTickSize * 4}) rotate(-90)`,
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
      }, ${-xAxisTickSize * 4}) `,
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
      }, ${-xAxisTickSize * 4}) rotate(90)`,
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
      }, ${-xAxisTickSize * 4}) `,
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
      `translate(${xScaleLeft(xStart)}, ${-xAxisTickSize * 6}) `,
    )
    .attr('fill', '#333')
    .attr('dominant-baseline', 'middle')
    .attr('text-anchor', 'middle')
    .attr('style', 'font-weight: bold;')
}

function renderXAxis({ leftBarsContainer, xScaleLeft, xAxisTickSize }) {
  leftBarsContainer
    .append('g')
    .call(d3.axisTop(xScaleLeft).tickSize(xAxisTickSize))
    .call(g => {
      g.select('.domain').remove()
      g.selectAll('.tick line').attr('stroke', '#555')
      g.selectAll('.tick text').attr('fill', '#555').attr('font-size', 12)
    })
}

function renderYAxis({ rightBarsContainer, xScaleRight, xAxisTickSize }) {
  rightBarsContainer
    .append('g')
    .call(d3.axisTop(xScaleRight).tickSize(xAxisTickSize))
    .call(g => {
      g.select('.domain').remove()
      g.selectAll('.tick line').attr('stroke', '#555')
      g.selectAll('.tick text').attr('fill', '#555').attr('font-size', 12)

      // Remove overlapping duplicate elements
      // g.select('.tick > line:first-of-type').remove()
      // g.select('.tick > text:first-of-type').remove()
    })
}

function setupBarSymbol({ yScale, chartCore }) {
  const markerSymbol = d3.symbol().type(d3.symbols[5]) // 5 is for triangle
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

  return { markerSymbol, symbolSize, triangleOffset, symbolConstant }
}

function renderBars({
  chartCore,
  coreChartWidth,
  data,
  tooltipDiv,
  leftXAxisLabel,
  barLeftValueField,
  xScaleLeft,
  yScale,
  yField,
  triangleOffset,
  xStart,
  colorScheme,
  markerSymbol,
  symbolSize,
  symbolConstant,
  barLeftLabelField,
  rightXAxisLabel,
  barRightValueField,
  xScaleRight,
  barRightLabelField,
  defaultStateAll,
}) {
  const leftBarsContainer = chartCore.append('g').attr('class', 'left-bars')

  const leftBars = leftBarsContainer
    .selectAll('g')
    .data(data)
    .join('g')
    .attr(
      'class',
      d =>
        `bar
      bar-${toClassText(d[yField])}
      ${defaultStateAll.includes(d[yField]) ? 'bar-active' : ''}
      `,
    )
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
    .attr(
      'class',
      d =>
        `bar
      bar-${toClassText(d[yField])}
      ${defaultStateAll.includes(d[yField]) ? 'bar-active' : ''}
      `,
    )
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

  return { leftBarsContainer, rightBarsContainer }
}

const searchEventHandler = referenceList => (qstr, svg) => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    referenceList.forEach(val => {
      // d3.selectAll('.mace').classed('mace-active', false)
      const barName = toClassText(val)
      if (val.toLowerCase().includes(lqstr)) {
        svg.selectAll(`.bar-${barName}`).classed('bar-matched', true)
      } else {
        svg.selectAll(`.bar-${barName}`).classed('bar-matched', false)
      }
      svg.select('.left-bars').classed('searching', true)
      svg.select('.right-bars').classed('searching', true)
    })
  } else {
    referenceList.forEach(val => {
      const barName = toClassText(val)
      svg.selectAll(`.bar-${barName}`).classed('bar-matched', false)
    })
    svg.select('.left-bars').classed('searching', false)
    svg.select('.right-bars').classed('searching', false)
  }
}

function setupSearch({
  handleSearch,
  widgetsLeft,
  searchInputClassNames,
  yField,
  svg,
  chartContainerSelector,
  dimensionValues,
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
        _(dimensionValues)
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

  search.attr('placeholder', `Find by ${yField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr, svg)
  })
  return search
}

function setupClearAllButton({
  widgetsLeft,
  clearAllButtonClassNames,
  search,
  handleSearch,
  svg,
}) {
  const clearAll = widgetsLeft
    .append('button')
    .text('Clear All')
    .attr('class', clearAllButtonClassNames)
  clearAll.classed('hidden', false)
  clearAll.on('click', () => {
    svg.selectAll('.bar').classed('bar-active', false)
    search.node().value = ''
    handleSearch('')
  })
}

function setupShowAllButton({
  widgetsLeft,
  showAllButtonClassNames,
  search,
  handleSearch,
  svg,
}) {
  const showAll = widgetsLeft
    .append('button')
    .text('Show All')
    .attr('class', showAllButtonClassNames)
  showAll.classed('hidden', false)
  showAll.on('click', () => {
    svg.selectAll('.bar').classed('bar-active', true)
    search.node().value = ''
    handleSearch('')
  })
}

function setupInitialStateButton({
  widgetsLeft,
  goToInitialStateButtonClassNames,
  defaultStateAll,
  search,
  handleSearch,
  svg,
}) {
  const goToInitialState = widgetsLeft
    .append('button')
    .text('Go to Initial State')
    .attr('class', goToInitialStateButtonClassNames)
  goToInitialState.classed('hidden', false)
  goToInitialState.on('click', () => {
    svg.selectAll('.bar').classed('bar-active', false)
    _.forEach(defaultStateAll, val => {
      svg.selectAll(`.bar-${toClassText(val)}`).classed('bar-active', true)
    })
    search.node().value = ''
    handleSearch('')
  })
}
