/* eslint-disable no-import-assign */
/* global window */
import * as d3 from 'd3'
import _ from 'lodash-es'
import { formatNumber, formatDate } from '../../utils/helpers/formatters'
import { preventOverflow, toClassText } from '../../utils/helpers/general'
import { legend } from '../../utils/helpers/colorLegend'
import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'

export function renderChart({
  data,
  options: {
    aspectRatio = 0.8,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    sizeLegendLabel = _.capitalize(sizeField),

    sizeLegendValues = [1, 5, 10, 20],
    sizeLegendGapInSymbols = 25,
    sizeLegendMoveSymbolsDownBy = 15,

    xDomain,
    xAxisLabel = xField,
    xAxisLabelOffset = -40,
    xAxisValueFormatter = '',
    yAxisDateParser = '',
    yAxisDateFormatter = '',
    colorLegendValueFormatter = '',
    sizeLegendValueFormatter = '',
    sizeValueFormatter = '',

    colorDomain,
    colorRange,
    colorLegendLabel,

    sizeRange = [2, 20],
    // Opinionated (currently cannot be changed from options)
    sizeScaleType = 'linear',
    sizeScaleLogBase = 10,
    dominoHeight = 0.3,
    yPaddingOuter = 0.1,

    initialState = [],

    activeOpacity = 1,
    inactiveOpacity = 0.1,

    searchInputClassNames = '',
    goToInitialStateButtonClassNames = '',
    clearAllButtonClassNames = '',
  },
  dimensions: { xField, yField, dominoField, sizeField, colorField },

  chartContainerSelector,
}) {
  applyInteractionStyles({ inactiveOpacity, activeOpacity })

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

  const { allDominoFieldValues, defaultStateAll } = parseData({
    data,
    dominoField,
    initialState,
  })

  const { xScale, yScale, colorScale, sizeScale, yDomain } = setupScales({
    data,
    xField,
    yField,
    sizeField,
    colorField,
    colorRange,
    colorDomain,
    xDomain,
    coreChartWidth,
    coreChartHeight,
    yPaddingOuter,
    dominoHeight,
    sizeScaleType,
    sizeScaleLogBase,
    sizeRange,
  })

  renderXAxis({
    chartCore,
    xAxisLabel,
    coreChartWidth,
    xAxisLabelOffset,
    yScale,
    yDomain,
    xScale,
    coreChartHeight,
    formatNumber,
    xAxisValueFormatter,
  })

  renderYAxis({
    chartCore,
    xScale,
    xDomain,
    yScale,
    formatDate,
    yAxisDateParser,
    yAxisDateFormatter,
  })

  renderDominosAndRibbons({
    data,
    yField,
    sizeField,
    sizeScale,
    xAxisValueFormatter,
    yAxisDateParser,
    yAxisDateFormatter,
    sizeValueFormatter,
    chartCore,
    yScale,
    dominoField,
    xScale,
    xField,
    colorScale,
    colorField,
    tooltipDiv,
    allDominoFieldValues,
    defaultStateAll,
  })

  const handleSearch = searchEventHandler(allDominoFieldValues)
  const search = setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    dominoField,
  })

  setupInitialStateButton({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
  })
  setupClearAllButton({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
  })

  // Legends
  renderColorLegend({
    colorScale,
    colorLegendLabel,
    widgetsRight,
    colorField,
    colorLegendValueFormatter,
  })

  renderSizeLegend({
    widgetsRight,
    sizeLegendValues,
    sizeLegendMoveSymbolsDownBy,
    sizeScale,
    sizeLegendGapInSymbols,
    sizeLegendValueFormatter,
    sizeLegendLabel,
  })

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function applyInteractionStyles({ inactiveOpacity, activeOpacity }) {
  d3.select('body').append('style').html(`
     .ribbon {
       cursor: pointer;
     }
     .g-ribbons .ribbon {
        fill-opacity: ${inactiveOpacity};
      }
      .g-ribbons .ribbon.ribbon-active {
        fill-opacity: ${activeOpacity};
      }
      .g-ribbons.searching .ribbon.ribbon-matched {
        stroke: #333;
        stroke-width: 1;
      }
      .g-ribbons .ribbon.ribbon-hovered {
        stroke: #333;
        stroke-width: 1;
      }
      .domino-hovered {
        stroke: #333;
        stroke-width: 1;
      }
      .domino-matched {
        stroke: #333;
        stroke-width: 1;
      }
  `)
}

function parseData({ data, dominoField, initialState }) {
  const allDominoFieldValues = _.chain(data).map(dominoField).uniq().value()
  const dominoValues = _(data).map(dominoField).uniq().value()
  const defaultStateAll = initialState === 'All' ? dominoValues : initialState
  return { allDominoFieldValues, defaultStateAll }
}

function setupScales({
  data,
  xField,
  yField,
  sizeField,
  colorField,
  colorRange,
  colorDomain,
  xDomain,
  coreChartWidth,
  coreChartHeight,
  yPaddingOuter,
  dominoHeight,
  sizeScaleType,
  sizeScaleLogBase,
  sizeRange,
}) {
  const yPaddingInner = 1 - dominoHeight
  const yScale = d3
    .scaleBand()
    .range([0, coreChartHeight])
    .paddingInner(yPaddingInner)
    .paddingOuter(yPaddingOuter)

  const xScale = d3.scaleLinear().range([0, coreChartWidth])
  const sizeScale =
    sizeScaleType === 'log'
      ? d3
          .scaleLog()
          .base(sizeScaleLogBase || 10)
          .range(sizeRange)
      : d3.scaleLinear().range(sizeRange)

  // TODO: provide options to sort and reverse the y domain
  const yDomain = _.chain(data).map(yField).uniq().value().sort()
  const xDomainDefault = d3.extent(
    _.chain(data)
      .map(xField)
      .uniq()
      .value(t => Number.parseFloat(t)),
  )

  yScale.domain(yDomain)
  // Set xDomain to custom if available, if not stick to default
  // And make a copy with .slice
  xScale.domain((xDomain || xDomainDefault).slice())

  const sizeDomain = d3.extent(
    _.chain(data)
      .map(sizeField)
      .uniq()
      .value(t => Number.parseFloat(t)),
  )

  sizeScale.domain(sizeDomain)

  const colorDomainFromData = d3.extent(
    data.map(d => Number.parseFloat(d[colorField])),
  )

  const chooseColors = [0, 2, 3, 6]

  const colorRangeDefault = d3.schemeSpectral[9]
    .filter((c, i) => chooseColors.indexOf(i) > -1)
    .slice()
    .reverse()

  // Note: number of colors is decided by length of .range(<this value>)
  const colorScale = d3
    .scaleQuantize()
    .range(colorRange || colorRangeDefault)
    .domain(colorDomain || colorDomainFromData)
    .nice()

  return {
    xScale,
    yScale,
    colorScale,
    sizeScale,
    yDomain,
  }
}

function renderYAxis({
  chartCore,
  xScale,
  // xDomain,
  yScale,
  formatDate,
  yAxisDateParser,
  yAxisDateFormatter,
}) {
  chartCore
    .append('g')
    .attr('class', 'y-axis-right')
    .attr('transform', `translate(${xScale(xScale.domain()[1]) + 20}, 0)`)
    .call(
      d3
        .axisRight(yScale)
        .tickSize(0)
        .tickFormat(val =>
          formatDate(val, yAxisDateParser, yAxisDateFormatter),
        ),
    )
    .call(g => g.select('.domain').remove())
}

function renderXAxis({
  chartCore,
  xAxisLabel,
  coreChartWidth,
  xAxisLabelOffset,
  yScale,
  yDomain,
  xScale,
  coreChartHeight,
  formatNumber,
  xAxisValueFormatter,
}) {
  // X-Axis label
  chartCore
    .append('g')
    .append('text')
    .attr('class', 'font-sans x-axis-label')
    .text(xAxisLabel)
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('transform', `translate(${coreChartWidth / 2}, ${xAxisLabelOffset})`)
    .style('font-size', '12px')
    .style('font-weight', 600)
    .style('text-transform', 'capitalize')

  // TODO top and bottom xAxis - Link it to xAxisLocations (this is only top)
  // X-Axis
  const xAxisOffset = 30
  chartCore
    .append('g')
    .attr('class', 'x-axis-top')
    .attr('transform', `translate(0, ${yScale(yDomain[0]) - xAxisOffset})`)
    .call(
      d3
        .axisTop(xScale)
        .tickSize(-coreChartHeight - xAxisOffset)
        .tickFormat(val => formatNumber(val, xAxisValueFormatter)),
    )
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))
}

function renderDominosAndRibbons({
  data,
  yField,
  sizeField,
  sizeScale,
  xAxisValueFormatter,
  yAxisDateParser,
  yAxisDateFormatter,
  sizeValueFormatter,
  chartCore,
  yScale,
  dominoField,
  xScale,
  xField,
  colorScale,
  colorField,
  tooltipDiv,
  allDominoFieldValues,
  defaultStateAll,
}) {
  const allConnectors = chartCore.append('g').attr('class', 'g-ribbons')

  const dataWithCoordinates = []
  data.forEach(d => {
    const x0 = xScale(d[xField]) - sizeScale(d[sizeField]) / 2
    const x1 = x0 + sizeScale(d[sizeField])
    const y0 = yScale(d[yField])
    dataWithCoordinates.push(
      { ...d, x0, x1, y0 },
      { ...d, x0, x1, y0: y0 + yScale.bandwidth() },
    )
  })
  const ribbonArea = d3
    .area()
    .curve(d3.curveMonotoneY)
    .y(d => d.y0)
    .x0(d => d.x0)
    .x1(d => d.x1)

  chartCore
    .append('g')
    .attr('class', 'g-dominos')
    .selectAll('rect')
    .data(data)
    .join('rect')
    .attr(
      'class',
      d => `
      domino-${toClassText(d[dominoField])}
      ${defaultStateAll.includes(d[dominoField]) ? 'domino-active' : ''}
    `,
    )
    .attr('x', d => xScale(d[xField]) - sizeScale(d[sizeField]) / 2)
    .attr('y', d => yScale(d[yField]))
    .attr('width', d => sizeScale(d[sizeField]))
    .attr('height', yScale.bandwidth())
    .attr('fill', d => colorScale(Number.parseFloat(d[colorField])))
    .attr('stroke', d =>
      d3.rgb(colorScale(Number.parseFloat(d[colorField]))).darker(0.5),
    )
    .on('mouseover', (e, d) => {
      const xFieldValue = formatNumber(d[xField], xAxisValueFormatter)
      const yFieldValue = formatDate(
        d[yField],
        yAxisDateParser,
        yAxisDateFormatter,
      )
      const sizeFieldValue = formatNumber(d[sizeField], sizeValueFormatter)
      tooltipDiv.transition().duration(200).style('opacity', 1)

      tooltipDiv.html(
        `<div>${d[dominoField]} (${yFieldValue})</div>
          <div style="text-transform: capitalize">${xField}: ${xFieldValue}</div>
          <div style="text-transform: capitalize">${sizeField}: ${sizeFieldValue}</div>
         </div>`,
      )

      d3.select(e.target).raise()

      const dominoGroupCode = toClassText(d[dominoField])
      d3.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-hovered', true)
      d3.selectAll(`.domino-${dominoGroupCode}`)
        .raise()
        .classed('domino-hovered', true)
      d3.select('.g-ribbons').classed('hovered', true)

      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', (e, d) => {
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
      const dominoGroupCode = toClassText(d[dominoField])
      d3.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-hovered', false)
      d3.selectAll(`.domino-${dominoGroupCode}`).classed(
        'domino-hovered',
        false,
      )
      d3.select(e.target).lower()
      d3.select('.g-ribbons').classed('hovered', false)
    })
    .on('click', (e, d) => {
      const dominoGroupCode = toClassText(d[dominoField])
      const clickedState = d3
        .select(`.ribbon-${dominoGroupCode}`)
        .classed('ribbon-active')
      d3.select(`.ribbon-${dominoGroupCode}`).classed(
        'ribbon-active',
        !clickedState,
      )
    })

  allConnectors
    .selectAll('path')
    .data(_.chain(data).map(dominoField).uniq().value())
    .join('path')
    .attr('fill', d => `url(#gradient-${toClassText(d)})`)
    .attr(
      'class',
      d => `
      ribbon
      ribbon-${toClassText(d)}
      ${defaultStateAll.includes(d) ? 'ribbon-active' : ''}`,
    )
    .attr('d', d =>
      ribbonArea(_.filter(dataWithCoordinates, { [dominoField]: d })),
    )
    .on('mouseover', (e, d) => {
      const dominoGroupCode = toClassText(d)
      d3.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-hovered', true)
      d3.selectAll(`.domino-${dominoGroupCode}`)
        .classed('domino-hovered', true)
        .raise()
      d3.select('.g-ribbons').classed('hovered', true)
    })
    .on('mouseout', (e, d) => {
      const dominoGroupCode = toClassText(d)
      d3.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-hovered', false)
      d3.selectAll(`.domino-${dominoGroupCode}`)
        .classed('domino-hovered', false)
        .lower()
      d3.select('.g-ribbons').classed('hovered', false)
    })
    .on('click', e => {
      const clickedState = d3.select(e.target).classed('ribbon-active')
      d3.select(e.target).classed('ribbon-active', !clickedState)
    })

  const gradientContainer = chartCore.append('defs')
  // linear gradient
  allDominoFieldValues.forEach(val => {
    const gradient = gradientContainer
      .append('linearGradient')
      .attr('id', `gradient-${toClassText(val)}`)
      .attr('x1', '100%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '100%')

    const singleDominoFieldValues = _.chain(dataWithCoordinates)
      .filter({ [dominoField]: val })
      .sortBy()
      .value()

    singleDominoFieldValues.forEach(d => {
      gradient
        .append('stop')
        .attr(
          'offset',
          `${
            (100 * (d.y0 - singleDominoFieldValues[0].y0)) /
            (singleDominoFieldValues[singleDominoFieldValues.length - 1].y0 -
              singleDominoFieldValues[0].y0)
          }%`,
        )
        .attr('stop-color', colorScale(d[colorField]))
    })
  })
}

const searchEventHandler = referenceList => qstr => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    referenceList.forEach(val => {
      const dominoGroupCode = toClassText(val)
      if (val.toLowerCase().includes(lqstr)) {
        d3.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-matched', true)
        d3.selectAll(`.domino-${dominoGroupCode}`).classed(
          'domino-matched',
          true,
        )

        d3.select('.g-ribbons').classed('searching', true)
      } else {
        d3.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-matched', false)
        d3.selectAll(`.domino-${dominoGroupCode}`).classed(
          'domino-matched',
          false,
        )
      }
    })
  } else {
    referenceList.forEach(val => {
      const dominoGroupCode = toClassText(val)
      d3.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-matched', false)

      d3.selectAll(`.domino-${dominoGroupCode}`).classed(
        'domino-matched',
        false,
      )
    })
    d3.select('.g-ribbons').classed('searching', false)
  }
}

function renderColorLegend({
  colorScale,
  colorLegendLabel,
  widgetsRight,
  colorField,
  colorLegendValueFormatter,
}) {
  widgetsRight.append(() =>
    legend({
      color: colorScale,
      title: colorLegendLabel || _.capitalize(colorField),
      width: 260,
      tickFormat: val => formatNumber(val, colorLegendValueFormatter),
    }),
  )
}

function renderSizeLegend({
  widgetsRight,
  sizeLegendValues,
  sizeLegendMoveSymbolsDownBy,
  sizeScale,
  sizeLegendGapInSymbols,
  sizeLegendValueFormatter,
  sizeLegendLabel,
}) {
  const sizeLegend = widgetsRight.append('svg')
  const sizeLegendContainerGroup = sizeLegend.append('g')
  sizeLegendContainerGroup
    .append('g')
    .attr('class', 'g-size-container')
    .attr('transform', `translate(0, ${sizeLegendMoveSymbolsDownBy})`)
    .selectAll('.g-size-dominos')
    // TODO: a way to automatically compute suitable values based on data
    .data(sizeLegendValues)
    .enter()
    .append('g')
    .attr('class', 'g-size-dominos')
    .append('rect')
    .style('fill', '#bebebe')
    .style('stroke-width', 1)
    .style('stroke', 'gray')
    .attr('width', d => sizeScale(d))
    .attr('height', 25)
    // TODO: the gap logic isn't perfect, fix it
    .attr('x', (d, i) => sizeScale(d) + i * sizeLegendGapInSymbols)

  sizeLegendContainerGroup
    .selectAll('.g-size-dominos')
    .append('text')
    .attr('dy', 35)
    .attr('dx', (d, i) => 1.5 * sizeScale(d) + i * sizeLegendGapInSymbols)
    .attr('text-anchor', 'middle')
    .style('font-size', 8)
    .text(d => formatNumber(d, sizeLegendValueFormatter))

  sizeLegendContainerGroup
    .append('text')
    .attr('alignment-baseline', 'hanging')
    .style('font-size', 10)
    .style('font-weight', 600)
    .text(sizeLegendLabel)

  const legendBoundingBox = sizeLegendContainerGroup.node().getBBox()
  sizeLegend
    .attr('height', legendBoundingBox.height)
    .attr('width', legendBoundingBox.width)
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
  search.attr('placeholder', `Find by ${dominoField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr)
  })
  return search
}

function setupInitialStateButton({
  widgetsLeft,
  goToInitialStateButtonClassNames,
  defaultStateAll,
  search,
  handleSearch,
}) {
  const goToInitialState = widgetsLeft
    .append('button')
    .text('Go to Initial State')
    .attr('class', goToInitialStateButtonClassNames)
  goToInitialState.on('click', () => {
    d3.selectAll('.ribbon').classed('ribbon-active', false)
    _.forEach(defaultStateAll, val => {
      d3.select(`.ribbon-${toClassText(val)}`).classed('ribbon-active', true)
    })
    search.node().value = ''
    handleSearch('')
  })
}

function setupClearAllButton({
  widgetsLeft,
  clearAllButtonClassNames,
  search,
  handleSearch,
}) {
  const clearAll = widgetsLeft
    .append('button')
    .text('Clear All')
    .attr('class', clearAllButtonClassNames)
  clearAll.on('click', () => {
    d3.selectAll('.ribbon').classed('ribbon-active', false)
    search.node().value = ''
    handleSearch('')
  })
}
