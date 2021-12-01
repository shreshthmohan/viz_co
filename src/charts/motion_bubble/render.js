/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'

import { preventOverflow } from '../../utils/helpers/general'
import { toClassText } from '../../utils/helpers/general'

import {
  setupChartArea,
  initializeTooltip,
} from '../../utils/helpers/commonChartHelpers'

export function renderChart({
  data,
  dimensions: { sizeField, xField, yField, timeField, nameField, colorField },
  options: {
    motionDelay = 1000,
    marginTop = 40,
    marginRight = 50,
    marginBottom = 50,
    marginLeft = 40,
    bgColor = 'transparent',
    aspectRatio = 2,

    sizeRange = [2, 20],
    xDomainCustom = null,
    yDomainCustom = null,

    inbuiltScheme = 'schemePuRd',
    numberOfColors = 9, // minumum: 3, maximum: 9
    xAxisLabel = xField,
    yAxisLabel = yField,

    inactiveOpacity = 0.1,
    activeOpacity = 1,

    startButtonClassNames = '',
    stopButtonClassNames = '',
    searchButtonClassNames = '',
  },
  chartContainerSelector,
}) {
  let intervalId

  d3.select('body').append('style').html(`
  .group-circles.searching > .iv-circle:not(.s-match) {
    opacity: ${inactiveOpacity};
  }
  .group-circles.searching > .iv-circle.s-match {
    stroke: #333;
  }
  `)

  const coreChartWidth = 1000
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

  const tooltipDiv = initializeTooltip()

  const dataParsed = data.map(d => ({
    ...d,
    [sizeField]: Number.parseFloat(d[sizeField]),
    [xField]: Number.parseFloat(d[xField]),
    [yField]: Number.parseFloat(d[yField]),
  }))

  const sizes = dataParsed.map(d => d[sizeField])
  const sizeDomain = d3.extent(sizes)
  const sizeScale = d3.scaleSqrt().domain([0, sizeDomain[1]]).range(sizeRange)

  const xDomain = xDomainCustom || d3.extent(dataParsed.map(d => d[xField]))
  const yDomain = yDomainCustom || d3.extent(dataParsed.map(d => d[yField]))

  const xScale = d3.scaleLinear().domain(xDomain).range([0, coreChartWidth])
  const yScale = d3.scaleLinear().range([coreChartHeight, 0]).domain(yDomain)
  // .nice()

  const colorDomain = _.uniq(_.map(dataParsed, colorField))
  const colorScale = d3.scaleOrdinal(
    colorDomain,
    d3[inbuiltScheme][numberOfColors],
  )

  const dataAt = loc => {
    return data.filter(d => d[timeField] === loc)
  }
  const timeDomain = _.uniq(_.map(data, timeField)).sort()
  const timeDomainLength = timeDomain.length

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

  rangeSliderValue.text(timeDomain[0])
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
    .attr('r', d => sizeScale(d[sizeField]))
    .attr('fill', d => colorScale(d[colorField]))
    .attr('opacity', activeOpacity)
    .attr('stroke', d => d3.rgb(colorScale(d[colorField])).darker(0.5))
    .on('mouseover', (e, d) => {
      // TODO: what will you do if a field is missing
      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv.html(`${d[nameField]} (${d[timeField]})
      <br/>
      <span class="capitalize"> ${xField}: ${d[xField]}</span>
      <br/>
      <span class="capitalize">${yField}: ${d[yField]}</span>
      <br/>
      <span class="capitalize">${sizeField}: ${d[sizeField]}</span>
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

  const updateCircles = newData => {
    circles
      .data(newData, d => d[nameField])
      .sort((a, b) => d3.descending(a[sizeField], b[sizeField]))
      .transition()
      .duration(motionDelay)
      .attr('cx', d => xScale(d[xField]))
      .attr('cy', d => yScale(d[yField]))
      .attr('r', d => sizeScale(d[sizeField]))
  }

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

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}
