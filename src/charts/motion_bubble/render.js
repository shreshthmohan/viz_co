/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'

import { preventOverflow } from '../../utils/helpers/general'
import { toClassText } from '../../utils/helpers/general'
import { swatches } from '../../utils/helpers/colorLegend'

import {
  setupChartArea,
  initializeTooltip,
} from '../../utils/helpers/commonChartHelpers'
import { formatNumber } from '../../utils/helpers/formatters'

export function renderChart({
  data,
  dimensions: { sizeField, xField, yField, timeField, nameField, colorField },
  options: {
    motionDelay = 1000,
    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,
    bgColor = 'transparent',
    aspectRatio = 2,

    sizeRange = [2, 20],
    sizeValueFormat = '',

    xDomainCustom = null,
    xAxisLabel = xField,
    xValueFormat = '',

    xScaleType = 'linear', // linear or log
    xScaleLogBase = 10, // applicable only if log scale

    yDomainCustom = null,
    yAxisLabel = yField,
    yValueFormat = '',

    inbuiltScheme = 'schemePuRd',
    numberOfColors = 9, // minumum: 3, maximum: 9

    inactiveOpacity = 0.1,
    activeOpacity = 1,

    startButtonClassNames = '',
    stopButtonClassNames = '',
    searchButtonClassNames = '',
  },
  chartContainerSelector,
}) {
  let intervalId

  applyInteractionStyles({ inactiveOpacity })

  const xValueFormatter = val => formatNumber(val, xValueFormat)
  const yValueFormatter = val => formatNumber(val, yValueFormat)
  const sizeValueFormatter = val => formatNumber(val, sizeValueFormat)

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

  const { dataParsed, dataAt, timeDomain, timeDomainLength } = parseData({
    data,
    xField,
    yField,
    sizeField,
    timeField,
  })

  const { sizeScale, xScale, yScale, colorScale } = setupScales({
    dataParsed,
    sizeField,
    sizeRange,
    xDomainCustom,
    yDomainCustom,
    xField,
    xScaleType,
    xScaleLogBase,
    yField,
    colorField,
    coreChartWidth,
    coreChartHeight,
    inbuiltScheme,
    numberOfColors,
  })

  const { startButton, stopButton, rangeSlider, rangeSliderValue } =
    setupWidgets({
      widgetsLeft,
      timeField,
      startButtonClassNames,
      stopButtonClassNames,
    })

  // Initial time value for range value display
  rangeSliderValue.text(timeDomain[0])

  // Bubbles are stationary initially so disable stop button
  stopButton.node().disabled = true

  // Initial render
  const circles = renderCircles({
    chartCore,
    dataAt,
    timeDomain,
    nameField,
    sizeField,
    xScale,
    yScale,
    xField,
    yField,
    timeField,
    colorField,
    xValueFormatter,
    yValueFormatter,
    sizeValueFormatter,
    sizeScale,
    colorScale,
    activeOpacity,
    tooltipDiv,
  })

  const updateCircles = newData => {
    circles
      .data(newData, d => d[nameField])
      .sort((a, b) => d3.descending(a[sizeField], b[sizeField]))
      .transition()
      .duration(motionDelay)
      .attr('cx', d => xScale(d[xField]))
      .attr('cy', d => yScale(d[yField]))
      .attr('r', d => {
        if (isNaN(d[xField]) || isNaN(d[yField]) || isNaN(d[sizeField])) {
          return 0
        }
        return sizeScale(d[sizeField])
      })
  }

  activateMotionWidget({
    rangeSlider,
    timeDomainLength,
    timeDomain,
    rangeSliderValue,
    dataAt,
    updateCircles,
    startButton,
    stopButton,
    intervalId,
    motionDelay,
  })

  setupSearch({
    widgetsLeft,
    nameField,
    searchButtonClassNames,
    circles,
    sizeField,
  })

  renderXAxis({
    chartCore,
    coreChartHeight,
    coreChartWidth,
    xScale,
    xAxisLabel,
  })

  renderYAxis({
    chartCore,
    coreChartWidth,
    coreChartHeight,
    yScale,
    yAxisLabel,
  })

  renderLegends({ widgetsRight, colorScale })

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function setupWidgets({
  widgetsLeft,
  timeField,
  startButtonClassNames,
  stopButtonClassNames,
}) {
  const startButton = widgetsLeft
    .append('button')
    .text('Start')
    .attr('id', '#start')
    .attr('class', startButtonClassNames)

  const stopButton = widgetsLeft
    .append('button')
    .text('Stop')
    .attr('id', '#stop')
    .attr('class', stopButtonClassNames)

  const rangeSliderContainer = widgetsLeft
    .append('div')
    .attr(
      'style',
      'display: flex; flex-direction: column; align-items: center; font-size: 0.75rem',
    )

  // Range slider label
  rangeSliderContainer
    .append('label')
    .text(timeField)
    .attr('for', '#range-slider')
    .attr('style', 'text-transform: capitalize')

  const rangeSlider = rangeSliderContainer
    .append('input')
    .attr('type', 'range')
    .attr('id', 'range-slider')

  const rangeSliderValue = rangeSliderContainer.append('span')

  return {
    startButton,
    stopButton,
    rangeSlider,
    rangeSliderValue,
  }
}

function renderCircles({
  chartCore,
  dataAt,
  timeDomain,
  nameField,
  sizeField,
  xScale,
  yScale,
  xField,
  yField,
  timeField,
  colorField,
  xValueFormatter,
  yValueFormatter,
  sizeValueFormatter,
  sizeScale,
  colorScale,
  activeOpacity,
  tooltipDiv,
}) {
  const circles = chartCore
    .append('g')
    .attr('class', 'group-circles')
    .selectAll('circle')
    .data(dataAt(timeDomain[0]), d => d[nameField])
    .join('circle')
    .sort((a, b) => d3.descending(a[sizeField], b[sizeField]))
    .attr('class', d => `iv-circle iv-circle-${toClassText(d[nameField])}`)
    .attr('cx', d => xScale(d[xField]))
    .attr('cy', d => yScale(d[yField]))
    .attr('r', d => {
      if (isNaN(d[xField]) || isNaN(d[yField]) || isNaN(d[sizeField])) {
        return 0
      }
      return sizeScale(d[sizeField])
    })
    .attr('fill', d => colorScale(d[colorField]))
    .attr('opacity', activeOpacity)
    .attr('stroke', d => d3.rgb(colorScale(d[colorField])).darker(0.5))
    .on('mouseover', (e, d) => {
      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv.html(`${d[nameField]} (${d[timeField]})
      <br/>
      <div style="text-transform: capitalize">
      <span> ${xField}: ${xValueFormatter(d[xField])}</span>
      <br/>
      <span>${yField}: ${yValueFormatter(d[yField])}</span>
      <br/>
      ${
        sizeField
          ? `<span>${sizeField}: ${sizeValueFormatter(d[sizeField])}</span>`
          : ''
      }
      </div>
      `)
      d3.select(e.target).attr('stroke-width', 2)
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      d3.select(e.target).attr('stroke-width', 1)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })
  return circles
}

function activateMotionWidget({
  rangeSlider,
  timeDomainLength,
  timeDomain,
  rangeSliderValue,
  dataAt,
  updateCircles,
  startButton,
  stopButton,
  intervalId,
  motionDelay,
}) {
  rangeSlider
    .attr('min', 0)
    .attr('max', timeDomainLength - 1)
    .attr('value', 0)
    .on('input', e => {
      const posInArr = Number.parseInt(e.target.value, 10)
      rangeSliderValue.text(timeDomain[posInArr])
      updateCircles(dataAt(timeDomain[posInArr]))
    })

  startButton.on('click', () => {
    startButton.node().disabled = true
    stopButton.node().disabled = false

    if (
      Number.parseInt(rangeSlider.node().value, 10) ===
      Number.parseInt(timeDomainLength - 1, 10)
    ) {
      rangeSlider.node().value = 0
      rangeSliderValue.text(timeDomain[0])
      updateCircles(dataAt(timeDomain[0]))
    }
    intervalId = window.setInterval(() => {
      if (
        Number.parseInt(rangeSlider.node().value, 10) ===
        Number.parseInt(timeDomainLength - 1, 10)
      ) {
        window.clearInterval(intervalId)
        startButton.node().disabled = false
        stopButton.node().disabled = true
        return
      }
      rangeSlider.node().value++
      const posInArr = Number.parseInt(rangeSlider.node().value, 10)
      rangeSliderValue.text(timeDomain[posInArr])
      updateCircles(dataAt(timeDomain[posInArr]))
    }, motionDelay)
  })

  stopButton.on('click', () => {
    stopButton.node().disabled = true
    startButton.node().disabled = false
    window.clearInterval(intervalId)
  })
}

function setupSearch({
  widgetsLeft,
  nameField,
  searchButtonClassNames,
  circles,
  sizeField,
}) {
  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('placeholder', `Find by ${nameField}`)
    .attr('class', searchButtonClassNames)

  function searchBy(term) {
    if (term) {
      d3.select('.group-circles').classed('searching', true)
      const matchedCircles = []
      circles.classed('s-match', d => {
        const bool = d[nameField].toLowerCase().includes(term.toLowerCase())
        if (bool) {
          matchedCircles.push(`.iv-circle-${toClassText(d[nameField])}`)
        }
        return bool
      })
      // Raise all matched circles so that
      // hovering over them doesn't cause other circle's tooltip
      // to be highlighted
      matchedCircles.forEach(m => {
        d3.select(m).raise()
      })
    } else {
      d3.select('.group-circles').classed('searching', false)

      // Put circles back in order after raising matched circles
      circles.sort((a, b) => d3.descending(a[sizeField], b[sizeField]))
    }
  }

  search.on('keyup', e => {
    searchBy(e.target.value.trim())
  })
}

function applyInteractionStyles({ inactiveOpacity }) {
  d3.select('body').append('style').html(`
  .group-circles.searching > .iv-circle:not(.s-match) {
    opacity: ${inactiveOpacity};
  }
  .group-circles.searching > .iv-circle.s-match {
    stroke: #333;
  }
  `)
}

function parseData({ data, xField, yField, sizeField, timeField }) {
  const dataParsed = data.map(d => ({
    ...d,
    [sizeField]: Number.parseFloat(d[sizeField]),
    [xField]: Number.parseFloat(d[xField]),
    [yField]: Number.parseFloat(d[yField]),
  }))

  const dataAt = loc => {
    return dataParsed.filter(d => d[timeField] === loc)
  }
  const timeDomain = _.uniq(_.map(data, timeField)).sort()
  const timeDomainLength = timeDomain.length

  return { dataParsed, dataAt, timeDomain, timeDomainLength }
}

function setupScales({
  dataParsed,
  sizeField,
  sizeRange,
  xDomainCustom,
  yDomainCustom,
  xField,
  xScaleType,
  xScaleLogBase,
  yField,
  colorField,
  coreChartWidth,
  coreChartHeight,
  inbuiltScheme,
  numberOfColors,
}) {
  const sizes = dataParsed.map(d => d[sizeField])
  const sizeDomain = d3.extent(sizes)
  const sizeScale = sizeField
    ? d3.scaleSqrt().domain([0, sizeDomain[1]]).range(sizeRange)
    : () => sizeRange[0]

  const xDomain = xDomainCustom || d3.extent(dataParsed.map(d => d[xField]))
  const yDomain = yDomainCustom || d3.extent(dataParsed.map(d => d[yField]))

  const xScale =
    xScaleType === 'log'
      ? d3
          .scaleLog()
          .base(xScaleLogBase || 10)
          .range([0, coreChartWidth])
          .domain(xDomain)
      : d3.scaleLinear().domain(xDomain).range([0, coreChartWidth])
  const yScale = d3.scaleLinear().range([coreChartHeight, 0]).domain(yDomain)
  // .nice()

  const colorDomain = _.uniq(_.map(dataParsed, colorField))
  const colorScale = d3.scaleOrdinal(colorDomain, inbuiltScheme)

  return { sizeScale, xScale, yScale, colorScale }
}

function renderLegends({ widgetsRight, colorScale }) {
  widgetsRight.append('div').html(
    swatches({
      color: colorScale,
      uid: 'rs',
      customClass: '',
      circle: true,
    }),
  )
}

function renderXAxis({
  chartCore,
  coreChartHeight,
  coreChartWidth,
  xScale,
  xAxisLabel,
}) {
  const xAxis = chartCore.append('g').attr('class', 'x-axis').lower()

  xAxis
    .attr('transform', `translate(0, ${coreChartHeight})`)
    .call(d3.axisBottom(xScale).tickSize(-coreChartHeight - 6))
    .style('color', '#777')
    .call(g => {
      g.selectAll('.tick line')
        .style('color', '#ddd')
        .attr('transform', `translate(0, ${6})`)
      g.selectAll('.tick text').attr('transform', `translate(0, ${6})`)
      g.select('.domain').remove()
    })

  xAxis
    .append('text')
    .attr('transform', `translate(${coreChartWidth / 2}, 35)`)
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'top')
    .style('fill', '#333')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .text(xAxisLabel)
}

function renderYAxis({
  chartCore,
  coreChartWidth,
  coreChartHeight,
  yScale,
  yAxisLabel,
}) {
  const yAxis = chartCore.append('g').attr('class', 'y-axis').lower()

  yAxis
    .append('g')
    .call(d3.axisLeft(yScale).tickSize(-coreChartWidth - 6))
    .style('color', '#777')
    .call(g => {
      g.selectAll('.tick line')
        .style('color', '#ddd')
        .attr('transform', 'translate(-6, 0)')
      g.selectAll('.tick text').attr('transform', 'translate(-6, 0)')
      g.select('.domain').remove()
    })
    .attr('class', 'y-axis')

  yAxis
    .append('text')
    .attr('transform', `translate(-35, ${coreChartHeight / 2}), rotate(-90)`)
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'hanging')
    .style('fill', '#333')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .text(yAxisLabel)
}
