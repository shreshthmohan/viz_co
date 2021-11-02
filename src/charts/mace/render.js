/* global window */
// SVG parent element CSS selector, preferably HTML id
// e.g. #svg-container

import * as d3 from 'd3'
import _ from 'lodash-es'
import { formatNumber } from '../../utils/helpers/formatters'

import { renderDirectionLegend } from '../../utils/helpers/directionLegend'
import { preventOverflow } from '../../utils/helpers/general'
import { pointsToRotationAngle, maceShape } from './helpers'

export function renderChart({
  data,
  options: {
    aspectRatio = 2,

    marginTop = 60,
    marginRight = 90,
    marginBottom = 20,
    marginLeft = 50,

    bgColor = 'transparent',

    oppositeDirectionColor = '#ee4e34',
    sameDirectionColor = '#44a8c1',

    containerWidth = 'max-w-screen-lg',

    yAxisTitle = 'y axis title',
    xAxisTitle = 'x axis title',

    xValueFormatter = '',
    yValueFormatter = '',

    directionStartLabel = 'start point',
    directionEndLabel = 'end point',
    sizeLegendValues = [1e6, 1e8, 1e9],
    sizeLegendMoveSizeObjectDownBy = 5,
    sizeLegendTitle = 'size legend title',
    sizeValueFormatter = '',
    heading = 'This is a heading for the chart',
    subheading = 'This is a subheading for the chart describing it in more detail',

    xFieldType = `${xFieldStart} → ${xFieldEnd}`,
    yFieldType = `${yFieldStart} → ${yFieldEnd}`,

    xAxisTickValues,

    xScaleType = 'linear', // linear or log
    xScaleLogBase = 10, // applicable only if log scale

    defaultState = [],

    activeOpacity = 0.8, // click, hover, search
    inactiveOpacity = 0.2,

    circleSizeRange = [5, 30],
    lineWidthRange = [2, 4],
  },
  dimensions,
  svgParentNodeSelector,
}) {
  const {
    xFieldStart,
    xFieldEnd,
    yFieldStart,
    yFieldEnd,
    sizeField,
    nameField,
  } = dimensions

  // const  = options

  d3.select('#main-container').classed(`${containerWidth}`, true)

  d3.select('body').append('style').html(`

g.maces .mace {
  fill-opacity: ${inactiveOpacity};
}
/* clicked and legend clicked states are common: controlled by .mace-active */
g.maces .mace.mace-active {
  fill-opacity: ${activeOpacity};
}
g.maces.searching .mace.mace-matched {
  stroke: #333;
  stroke-width: 3;
}
/* So that legend text is visible irrespective of state */
g.mace text {
  fill-opacity: 0.8;
}
g.maces g.mace.mace-hovered {
  stroke: #333;
  stroke-width: 3;
}
g.color-legend g.mace-active {
  fill-opacity: ${activeOpacity};
}
g.color-legend g:not(.mace-active) {
  fill-opacity: ${inactiveOpacity};
}
`)

  // Headers
  d3.select('#chart-heading').node().textContent = heading
  d3.select('#chart-subheading').node().textContent = subheading

  // Chart Area
  const coreChartWidth = 1000
  const coreChartHeight = coreChartWidth / aspectRatio

  const viewBoxHeight = coreChartHeight + marginTop + marginBottom
  const viewBoxWidth = coreChartWidth + marginLeft + marginRight

  const svgParent = d3.select(svgParentNodeSelector)

  const svg = svgParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  const toClassText = str => str.replace(/\s/g, '-').toLowerCase()
  const tooltipDiv = d3
    .select('body')
    .append('div')
    .attr(
      'class',
      'dom-tooltip absolute text-center bg-white rounded px-2 py-1 text-xs border',
    )
    .style('opacity', 0)

  const dataParsed = data
    .map(el => {
      const elParsed = { ...el }
      elParsed[xFieldStart] = Number.parseFloat(el[xFieldStart])
      elParsed[xFieldEnd] = Number.parseFloat(el[xFieldEnd])
      elParsed[yFieldStart] = Number.parseFloat(el[yFieldStart])
      elParsed[yFieldEnd] = Number.parseFloat(el[yFieldEnd])
      elParsed[sizeField] = Number.parseFloat(el[sizeField])
      elParsed.slope =
        (elParsed[yFieldEnd] - elParsed[yFieldStart]) /
        (elParsed[xFieldEnd] - elParsed[xFieldStart])
      return elParsed
    })
    .filter(d => !Number.isNaN(d.slope))

  const nameValues = _(data).map(nameField).uniq().value()
  const defaultStateAll = defaultState === 'All' ? nameValues : defaultState

  const yDomainStart = dataParsed.map(el => Number.parseFloat(el[yFieldStart]))
  const yDomainEnd = dataParsed.map(el => Number.parseFloat(el[yFieldEnd]))
  const yDomain = d3.extent([...yDomainStart, ...yDomainEnd])
  const yScale = d3
    .scaleLinear()
    .range([coreChartHeight, 0])
    .domain(yDomain)
    .nice()

  // TODO: issue with slope, should be calculated after x and  y scales are defined
  const xDomainStart = dataParsed.map(el => Number.parseFloat(el[xFieldStart]))
  const xDomainEnd = dataParsed.map(el => Number.parseFloat(el[xFieldEnd]))
  const xDomain = d3.extent([...xDomainStart, ...xDomainEnd])
  const xScale =
    xScaleType === 'log'
      ? d3
          .scaleLog()
          .base(xScaleLogBase || 10)
          .range([0, coreChartWidth])
          .domain(xDomain)
          .nice()
      : d3.scaleLinear().range([0, coreChartWidth]).domain(xDomain).nice()

  // Area of circle should be proportional to the population
  const sizeMax = d3.max(dataParsed.map(el => el[sizeField]))

  const circleSizeScale = d3
    .scaleSqrt()
    .range(circleSizeRange)
    .domain([0, sizeMax])
  const lineWidthScale = d3
    .scaleSqrt()
    .range(lineWidthRange)
    .domain([0, sizeMax])

  const sizeValues = sizeLegendValues.map(a => circleSizeScale(a))

  // TODO: move to options?
  const gapInCircles = 30

  let cumulativeSize = 0
  const cumulativeSizes = []
  sizeValues.forEach((sz, i) => {
    if (i === 0) {
      cumulativeSize += sz
    } else {
      cumulativeSize += sizeValues[i - 1] + sizeValues[i]
    }

    cumulativeSizes.push(cumulativeSize)
  })

  const sizeLegend = d3.select('#size-legend').append('svg')
  const sizeLegendContainerGroup = sizeLegend.append('g')

  sizeLegendContainerGroup
    .append('g')
    .attr('class', 'g-size-container')
    .attr('transform', `translate(0, ${sizeLegendMoveSizeObjectDownBy})`)
    .selectAll('.g-size-circle')
    .data(sizeValues)
    .enter()
    .append('g')
    .attr('class', 'g-size-circle')
    .append('circle')
    .attr('r', d => d)
    .style('fill', 'transparent')
    .style('stroke-width', 1)
    .style('stroke', 'gray')
    .attr('cx', (d, i) => cumulativeSizes[i] + i * gapInCircles + 1)
    .attr('cy', sizeValues[sizeValues.length - 1] + 1)

  sizeLegendContainerGroup
    .selectAll('.g-size-circle')
    .append('text')
    .attr('alignment-baseline', 'middle')
    .attr('dy', sizeValues[sizeValues.length - 1] + 2)
    .attr('dx', (d, i) => d + cumulativeSizes[i] + (i + 0.1) * gapInCircles)
    .style('font-size', 8)
    .text((d, i) => formatNumber(sizeLegendValues[i], sizeValueFormatter))

  sizeLegendContainerGroup
    .append('text')
    .attr('alignment-baseline', 'hanging')
    .style('font-size', 10)
    .style('font-weight', 600)
    .text(sizeLegendTitle)

  const sizeLegendBoundingBox = sizeLegendContainerGroup.node().getBBox()
  sizeLegend
    .attr('height', sizeLegendBoundingBox.height)
    .attr('width', sizeLegendBoundingBox.width)

  const colorScale = slope =>
    slope > 0 ? sameDirectionColor : oppositeDirectionColor

  const stickHeight = 3
  const stickLength = 30
  const stickWidthLegend = 1
  const ballRadius = 6
  const gapForText = 5
  const singleMaceSectionHeight = 20
  const colorLegend = d3.select('#color-legend').append('svg')
  const colorLegendMain = colorLegend
    .append('g')
    .attr('class', 'color-legend cursor-pointer')
    .attr(
      'transform',
      `translate(0, ${-(singleMaceSectionHeight - ballRadius)})`,
    ) // 20-6
  const colorLegendSame = colorLegendMain
    .append('g')
    .attr('transform', `translate(0, ${singleMaceSectionHeight})`)
    .attr('fill', sameDirectionColor)
    .attr('class', 'mace mace-same')
    .on('click', e => {
      const parentLegend = d3.select(e.target.parentNode)
      const legendState = parentLegend.classed('mace-active')
      d3.selectAll('.mace-same').classed('mace-active', !legendState)
    })
  colorLegendSame
    .append('circle')
    .attr('cx', ballRadius + stickLength)
    .attr('r', ballRadius)
  colorLegendSame
    .append('rect')
    .attr('width', stickLength)
    .attr('height', stickHeight)
    .attr('y', -stickHeight / 2)
  colorLegendSame
    .append('text')
    .text('Moving in the same direction')
    .style('font-size', 10)
    .style('font-weight', 600)
    .attr(
      'transform',
      `translate(${stickLength + ballRadius * 2 + gapForText}, 0)`,
    )
    .attr('alignment-baseline', 'middle')
  const colorLegendOpposite = colorLegendMain
    .append('g')
    .attr('transform', `translate(0, ${singleMaceSectionHeight * 2})`)
    .attr('fill', oppositeDirectionColor)
    .attr('class', 'mace mace-opposite')
    .on('click', e => {
      const parentLegend = d3.select(e.target.parentNode)
      const legendState = parentLegend.classed('mace-active')
      d3.selectAll('.mace-opposite').classed('mace-active', !legendState)
    })
  colorLegendOpposite
    .append('circle')
    .attr('cx', ballRadius + stickLength)
    .attr('r', ballRadius)
  colorLegendOpposite
    .append('rect')
    .attr('width', stickLength)
    .attr('height', stickHeight)
    .attr('y', -stickHeight / 2)
  colorLegendOpposite
    .append('text')
    .text('Moving in the opposite direction')
    .style('font-size', 10)
    .style('font-weight', 600)
    .attr(
      'transform',
      `translate(${stickLength + ballRadius * 2 + gapForText}, 0)`,
    )
    .attr('alignment-baseline', 'middle')
  const legendBoundingBox = colorLegendMain.node().getBBox()
  colorLegend
    .attr('height', legendBoundingBox.height)
    .attr('width', legendBoundingBox.width)

  renderDirectionLegend({
    selector: '#direction-legend',
    ballRadius,
    stickLength,
    stickWidthLegend,
    gapForText,
    directionStartLabel,
    directionEndLabel,
  })

  // x-axis
  const xAxis = chartCore
    .append('g')
    .attr('class', 'x-axis-bottom')
    .attr('transform', `translate(0, ${coreChartHeight + 30})`)
  xAxis.call(
    xAxisTickValues
      ? d3.axisBottom(xScale).tickValues(xAxisTickValues)
      : d3.axisBottom(xScale),
  )

  xAxis
    .append('g')
    .append('text')
    .attr('class', 'text-xs font-semibold tracking-wider')
    .text(xAxisTitle)
    .attr('fill', '#333')
    .attr('text-anchor', 'middle')
    .attr('transform', `translate(${coreChartWidth / 2}, 30)`)

  // y-axis
  const yAxis = chartCore
    .append('g')
    .attr('class', 'text-xs y-axis-right')
    .attr('transform', `translate(${coreChartWidth}, 0)`)
  yAxis
    .call(d3.axisRight(yScale).ticks(5).tickSize(-coreChartWidth))
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))
    .call(g => g.select('.domain').remove())

  yAxis
    .append('g')
    .append('text')
    .attr('class', 'font-semibold tracking-wider')
    .text(yAxisTitle)
    .attr('fill', '#333')
    .attr('text-anchor', 'end')
    .attr('transform', 'translate(8, -20)')

  const cGroup = chartCore
    .append('g')
    .attr('class', 'maces')
    //  ${_.isEmpty(defaultStateAll) ? '' : 'default'}`)
    .selectAll('g')
    .data(dataParsed)
    .join('g')
    .sort((a, b) => d3.descending(a[sizeField], b[sizeField]))
    .attr(
      'class',
      d =>
        `mace
        ${d.slope >= 0 ? 'mace-same' : 'mace-opposite'}
        mace-${toClassText(d[nameField])}
        ${defaultStateAll.includes(d[nameField]) ? 'mace-active' : ''}`,
    )
    .on('click', e => {
      const parentMace = d3.select(e.target.parentNode)
      const clickedState = parentMace.classed('mace-active')
      parentMace.classed('mace-active', !clickedState)
    })

  cGroup
    .append('path')
    .attr('d', d => {
      const x1 = xScale(d[xFieldStart])
      const y1 = yScale(d[yFieldStart])
      const x2 = xScale(d[xFieldEnd])
      const y2 = yScale(d[yFieldEnd])
      const circleRadius = circleSizeScale(d.population)
      const stickWidth = lineWidthScale(d[sizeField])
      const macePoints = maceShape({
        x1,
        y1,
        x2,
        y2,
        circleRadius,
        stickWidth,
      })
      return d3.lineRadial()(macePoints)
    })
    .attr('transform', d => {
      const x1 = xScale(d[xFieldStart])
      const y1 = yScale(d[yFieldStart])
      const x2 = xScale(d[xFieldEnd])
      const y2 = yScale(d[yFieldEnd])
      const rotationAngle = pointsToRotationAngle({ x1, y1, x2, y2 })
      return `translate(${x2}, ${y2}) rotate(${rotationAngle})`
    })
    .attr('fill', d => colorScale(d.slope))
    .attr('stroke-linecap', 'square')

  cGroup
    .on('mouseover', (e, d) => {
      d3.select(e.target.parentNode).classed('mace-hovered', true)

      tooltipDiv.transition().duration(200).style('opacity', 1)

      const sizeFieldValue = formatNumber(d[sizeField], sizeValueFormatter)
      const xFieldStartValue = formatNumber(d[xFieldStart], xValueFormatter)
      const xFieldEndValue = formatNumber(d[xFieldEnd], xValueFormatter)
      const yFieldStartValue = formatNumber(d[yFieldStart], yValueFormatter)
      const yFieldEndValue = formatNumber(d[yFieldEnd], yValueFormatter)

      tooltipDiv.html(
        `${d[nameField]}
        <br/>
        ${xFieldType}: ${xFieldStartValue} → ${xFieldEndValue}
        <br />
        ${yFieldType}: ${yFieldStartValue} → ${yFieldEndValue}
        <br />
        ${_.capitalize(sizeField)}: ${sizeFieldValue}
        `,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      d3.select(e.target.parentNode).classed('mace-hovered', false)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  const searchEventHandler = qstr => {
    if (qstr) {
      const lqstr = qstr.toLowerCase()
      nameValues.forEach(val => {
        // d3.selectAll('.mace').classed('mace-active', false)
        const maceName = toClassText(val)
        if (val.toLowerCase().includes(lqstr)) {
          d3.select(`.mace-${maceName}`).classed('mace-matched', true)
        } else {
          d3.select(`.mace-${maceName}`).classed('mace-matched', false)
        }
        d3.select('.maces').classed('searching', true)
      })
    } else {
      nameValues.forEach(val => {
        const maceName = toClassText(val)
        d3.select(`.mace-${maceName}`).classed('mace-matched', false)
      })
      d3.select('.maces').classed('searching', false)
    }
  }

  const search = d3.select('#search')
  search.attr('placeholder', `Find by ${nameField}`).classed('hidden', false)
  search.on('keyup', e => {
    const qstr = e.target.value
    searchEventHandler(qstr)
  })

  const goToInitialState = d3.select('#initial-state')
  goToInitialState.classed('hidden', false)
  goToInitialState.on('click', () => {
    d3.selectAll('.mace').classed('mace-active', false)
    _.forEach(defaultStateAll, val => {
      d3.select(`.mace-${toClassText(val)}`).classed('mace-active', true)
    })
    search.node().value = ''
    searchEventHandler('')
  })

  const clearAll = d3.select('#clear-all')
  clearAll.classed('hidden', false)
  clearAll.on('click', () => {
    d3.selectAll('.mace').classed('mace-active', false)
    search.node().value = ''
    searchEventHandler('')
  })

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}
