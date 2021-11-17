/* global window, console */

import * as d3 from 'd3'
import { legend } from '../../utils/helpers/colorLegend'
import { preventOverflowThrottled } from '../../utils/helpers/general'

export function renderChart({
  data,
  options: {
    aspectRatioCombined = 5,
    aspectRatioSplit = 0.8,

    marginTop = 60,
    marginRight = 90,
    marginBottom = 20,
    marginLeft = 50,

    bgColor = 'transparent',

    collisionDistance,
    // colorScheme,

    customColorScheme,
    inbuiltScheme = 'schemeOrRd',
    numberOfColors = 5,

    xDomainCustom,

    sizeRange = [2, 20],

    sizeLegendValues = [10e3, 50e3, 10e4, 25e4],
    sizeLegendTitle = sizeField,
    xAxisLabel = xField,

    colorLegendTitle = xField,

    combinedSegmentLabel = 'All',
    segmentType = segmentField,
    segmentTypeCombined = '',
    segmentTypeSplit = '',

    splitButtonClassNames = '',
    combinedButtonClassNames = '',
    searchInputClassNames = '',
  },
  dimensions: {
    sizeField,
    xField,
    nameField, // also search field
    // colorField,
    segmentField,
  },
  chartContainerSelector,
}) {
  d3.select('body').append('style').html(`
    .g-searching circle.c-match {
      stroke-width: 2;
      stroke: #333;
    }
  `)
  const coreChartWidth = 1000

  const coreChartHeightCombined = coreChartWidth / aspectRatioCombined
  const coreChartHeightSplit = coreChartWidth / aspectRatioSplit

  const viewBoxHeightCombined =
    coreChartHeightCombined + marginTop + marginBottom
  const viewBoxHeightSplit = coreChartHeightSplit + marginTop + marginBottom
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
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightCombined}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  const tooltipDiv = d3
    .select('body')
    .append('div')
    .attr('class', 'dom-tooltip')
    .attr(
      'style',
      'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
    )

  const parsedData = data.map(d => ({
    ...d,
    [sizeField]: Number.parseFloat(d[sizeField]),
    [xField]: Number.parseFloat(d[xField]),
  }))

  // const splitButton = d3.select('#split-bubbles')
  const splitButton = widgetsLeft
    .append('button')
    .text('Split')
    .attr('class', splitButtonClassNames)

  // const combinedButton = d3.select('#combine-bubbles')
  const combinedButton = widgetsLeft
    .append('button')
    .text('Combine')
    .attr('class', combinedButtonClassNames)

  let allowSplit = false
  let allowCombine = false

  function manageSplitCombine() {
    if (!allowSplit) {
      splitButton.node().disabled = true
      splitButton.attr(
        'title',
        'Combined force simulation is either in progress or current configuration is already split',
      )
    } else {
      splitButton.node().disabled = false

      splitButton.attr('title', null)
    }

    if (!allowCombine) {
      combinedButton.node().disabled = true
      combinedButton.attr(
        'title',
        'Split force simulation is either in progress or current configuration is already combined',
      )
    } else {
      combinedButton.node().disabled = false
      combinedButton.attr('title', null)
    }
  }
  manageSplitCombine()

  // const width = svgWidth - marginLeft - marginRight
  // const heightInnerCombined = combinedHeight - marginTop - marginBottom
  // const heightInnerSplit = splitHeight - marginTop - marginBottom

  const segments = [...new Set(parsedData.map(c => c[segmentField]))]
  const maxSizeValue = Math.max(...parsedData.map(c => c[sizeField]))

  const sizeScale = d3.scaleSqrt().range(sizeRange).domain([0, maxSizeValue])

  const yScale = d3
    .scalePoint()
    .domain(segments)
    .range([0, coreChartHeightSplit])
    .padding(0.5)

  const xValues = parsedData.map(d => d[xField]).sort()
  const xDomainDefault = d3.extent(xValues)
  const xDomain = xDomainCustom || xDomainDefault
  const xScale = d3.scaleLinear().domain(xDomain).range([0, coreChartWidth])

  // TODO: separate field for color scale and xscale?
  // Right now both x scale and color scale are based on the same
  const xColorScale = d3
    .scaleQuantize()
    .domain(xDomain)
    .range(customColorScheme || d3[inbuiltScheme][numberOfColors])
    .nice()

  widgetsRight
    .append('svg')
    .attr('width', 260)
    .attr('height', 45)
    .append(() =>
      legend({ color: xColorScale, title: colorLegendTitle, width: 260 }),
    )

  // Size Legend

  const sizeValues = sizeLegendValues.map(a => sizeScale(a))

  // TODO: move to options
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

  const sizeLegend = widgetsRight.append('svg')
  const sizeLegendContainerGroup = sizeLegend.append('g')

  // TODO: move this to options?
  const moveSizeObjectDownBy = 5

  sizeLegendContainerGroup
    .append('g')
    .attr('class', 'g-size-container')
    .attr('transform', `translate(0, ${moveSizeObjectDownBy})`)
    .selectAll('.g-size-circle')
    .data(sizeValues)
    .enter()
    .append('g')
    .attr('class', 'g-size-circle')
    .append('circle')
    .attr('r', d => d)
    .style('fill', '#bebebe')
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
    .text((d, i) => d3.format('.3s')(sizeLegendValues[i]))

  sizeLegendContainerGroup
    .append('text')
    .attr('alignment-baseline', 'hanging')
    .style('font-size', 10)
    .style('font-weight', 600)
    .text(sizeLegendTitle)

  const legendBoundingBox = sizeLegendContainerGroup.node().getBBox()
  sizeLegend
    .attr('height', legendBoundingBox.height)
    .attr('width', legendBoundingBox.width)

  chartCore
    .append('g')
    .attr('transform', `translate(${coreChartWidth / 2}, ${-20})`)
    .append('text')
    .attr('class', 'text-xs font-semibold tracking-wider')
    .text(xAxisLabel)
    .attr('text-anchor', 'middle')

  const xAxis = chartCore.append('g').attr('id', 'x-axis')

  xAxis
    .call(d3.axisTop(xScale).tickSize(-coreChartHeightCombined))
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1))
    .call(g => g.select('.domain').remove())

  function renderXAxisSplit() {
    xAxis
      .call(d3.axisTop(xScale).tickSize(-coreChartHeightSplit))
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1))
      .call(g => g.select('.domain').remove())
  }
  function renderXAxisCombined() {
    xAxis
      .call(d3.axisTop(xScale).tickSize(-coreChartHeightCombined))
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1))
      .call(g => g.select('.domain').remove())
  }

  const yAxisLabel = chartCore
    .append('g')
    .attr('transform', `translate(${-23}, ${-20})`)
    .append('text')
    .attr('class', 'text-xs font-semibold ')
    .text(segmentType)
    .attr('text-anchor', 'end')

  function yAxisSplit() {
    d3.select('#y-axis-combined').remove()
    chartCore
      .append('g')
      .attr('id', 'y-axis-split')
      .call(d3.axisLeft(yScale).tickSize(-coreChartWidth))
      .call(g => g.select('.domain').remove())
      .call(g => {
        g.selectAll('.tick line').attr('stroke-opacity', 0.1)
        g.selectAll('.tick text')
          .attr('transform', 'translate(-20,0)')
          .classed('text-xs', true)
      })
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1)
  }

  const yScaleCombined = d3
    .scaleBand()
    .domain([combinedSegmentLabel])
    .range([0, coreChartHeightCombined])

  function yAxisCombined() {
    d3.select('#y-axis-split').remove()
    chartCore
      .append('g')
      .attr('id', 'y-axis-combined')
      .call(d3.axisLeft(yScaleCombined).tickSize(-coreChartWidth))
      .call(g => g.select('.domain').remove())
      .call(g => {
        g.selectAll('.tick line').attr('stroke-opacity', 0.1)
        g.selectAll('.tick text')
          .attr('transform', 'translate(-20,0)')
          .classed('text-xs', true)
      })
      .attr('opacity', 0)
      .transition()
      .duration(1000)
      .attr('opacity', 1)
  }

  const bubbles = chartCore.append('g').attr('class', 'bubbles')

  let allBubbles
  function ticked() {
    const u = bubbles.selectAll('circle').data(parsedData)
    allBubbles = u
      .enter()
      .append('circle')
      .attr('r', d => sizeScale(d[sizeField]))
      .style('fill', function (d) {
        return xColorScale(d[xField])
      })
      .attr('stroke', function (d) {
        return d3.rgb(xColorScale(d[xField])).darker(0.5)
      })
      .merge(u)
      .attr('cx', function (d) {
        return d.x
      })
      .attr('cy', function (d) {
        return d.y
      })
      .on('mouseover', (e, d) => {
        tooltipDiv.transition().duration(200).style('opacity', 1)
        tooltipDiv.html(
          `<div><span class="font-bold">${d[nameField]}</span>(${
            d[segmentField]
          })</div>
         <div class="flex space-between">
           <div class="capitalize">${xField}:</div>
           <div class="pl-2 font-bold">${d[xField].toFixed(0)}</div>
         </div>
         <div class="flex space-between">
           <div class="capitalize">${sizeField}:</div>
           <div class="pl-2 font-bold">${d[sizeField].toFixed(0)}</div>
         </div>`,
        )
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + window.scrollY + 30}px`)
        d3.select(e.target).attr('stroke', 'black').style('stroke-width', 2)
      })
      .on('mouseout', (e, d) => {
        tooltipDiv.transition().duration(500).style('opacity', 0)
        d3.select(e.target)
          .attr('stroke', d3.rgb(xColorScale(d[xField])).darker(0.5))
          .style('stroke-width', 1)
      })
    u.exit().remove()
    preventOverflowThrottled({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    })
  }

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)

  search.attr('placeholder', `Find by ${nameField}`)

  function searchBy(term) {
    if (term) {
      d3.select('.bubbles').classed('g-searching', true)
      allBubbles.classed('c-match', d =>
        d[nameField].toLowerCase().includes(term.toLowerCase()),
      )
    } else {
      d3.select('.bubbles').classed('g-searching', false)
    }
  }

  search.on('keyup', e => {
    searchBy(e.target.value.trim())
  })

  function splitSim() {
    allowSplit = false
    manageSplitCombine()
    renderXAxisSplit()

    yAxisSplit()

    yAxisLabel.text(segmentTypeSplit)

    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightSplit}`)

    bubbles.attr('transform', `translate(0, 0)`)
    bubbles.raise()

    d3.forceSimulation(parsedData)
      .force('charge', d3.forceManyBody().strength(1))
      .force(
        'x',
        d3
          .forceX()
          .x(function (d) {
            return xScale(d[xField])
          })
          // split X strength
          .strength(1),
      )
      .force(
        'y',
        d3
          .forceY()
          .y(function (d) {
            return yScale(d[segmentField])
          })
          // split Y strength
          .strength(1.2),
      )
      .force(
        'collision',
        d3.forceCollide().radius(function (d) {
          return sizeScale(d[sizeField]) + collisionDistance
        }),
      )
      .on('tick', ticked)
      .on('end', () => {
        console.log('split force simulation ended')
        allowCombine = true
        manageSplitCombine()
      })
  }
  function combinedSim() {
    allowCombine = false
    manageSplitCombine()
    renderXAxisCombined()

    yAxisCombined()

    yAxisLabel.text(segmentTypeCombined)
    svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightCombined}`)

    bubbles.attr('transform', `translate(0, ${coreChartHeightCombined / 2})`)
    bubbles.raise()

    d3.forceSimulation(parsedData)
      .force('charge', d3.forceManyBody().strength(1))
      .force(
        'x',
        d3
          .forceX()
          .x(d => xScale(d[xField]))
          // combine X strength
          .strength(1),
      )
      .force(
        'y',
        d3.forceY().y(0),
        // combine Y strength
        // .strength(1)
      )
      .force(
        'collision',
        d3.forceCollide().radius(function (d) {
          return sizeScale(d[sizeField]) + collisionDistance
        }),
      )
      .on('tick', ticked)
      .on('end', () => {
        console.log('combined force simulation ended')
        allowSplit = true
        manageSplitCombine()
      })
  }

  splitButton.on('click', splitSim)
  combinedButton.on('click', combinedSim)

  combinedSim()
}
