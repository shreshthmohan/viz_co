/* global legend, formatNumber, formatDate, toClassText */
// https://eslint.org/docs/user-guide/configuring/language-options#specifying-globals

// SVG parent element CSS selector, preferably HTML id
// e.g. #svg-container
const svgParentNodeSelector = '#svg-container'
function renderChart({ data, options, dimensions }) {
  const {
    xField, // number
    yField, // string
    dominoField, // string
    sizeField, // number
    // colorField = 'unemployment', // number; colorField define below (defaults to xField if not provided)
  } = dimensions

  const {
    containerWidth = 'max-w-screen-lg',
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

    heading = '{{ Heading }}',
    subheading = '{{ Subheading }}',

    initialState = [],

    activeOpacity = 1,
    inactiveOpacity = 0.1,
  } = options

  // Container Width
  d3.select('#main-container').classed(`${containerWidth}`, true)

  const colorField = dimensions.colorField || xField

  d3.select('body').append('style').html(`
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

  d3.select('#chart-heading').node().textContent = heading
  d3.select('#chart-subheading').node().textContent = subheading

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

  const tooltipDiv = d3
    .select('body')
    .append('div')
    .attr(
      'class',
      'dom-tooltip absolute text-center bg-white rounded px-2 py-1 text-xs border',
    )
    .style('opacity', 0)

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
    // eslint-disable-next-line unicorn/prefer-includes
    .filter((c, i) => chooseColors.indexOf(i) > -1)
    .slice()
    .reverse()

  // Note: number of colors is decided by length of .range(<this value>)
  const colorScale = d3
    .scaleQuantize()
    .range(colorRange || colorRangeDefault)
    .domain(colorDomain || colorDomainFromData)
    .nice()

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
  chartCore
    .append('g')
    .attr('class', 'x-axis-top')
    .attr('transform', `translate(0, ${yScale(yDomain[0]) - 30})`)
    .call(
      d3
        .axisTop(xScale)
        .tickSize(-coreChartHeight)
        .tickFormat(val => formatNumber(val, xAxisValueFormatter)),
    )
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))

  // TODO left and right yAxis - yAxisLocations
  // Y-Axis
  chartCore
    .append('g')
    .attr('class', 'y-axis-right')
    .attr('transform', `translate(${xScale(xDomain[1]) + 20}, 0)`)
    .call(
      d3
        .axisRight(yScale)
        .tickSize(0)
        .tickFormat(val =>
          formatDate(val, yAxisDateParser, yAxisDateFormatter),
        ),
    )
    .call(g => g.select('.domain').remove())

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

  const dominoValues = _(data).map(dominoField).uniq().value()
  const initialStateAll = initialState === 'All' ? dominoValues : initialState

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
      ${initialStateAll.includes(d[dominoField]) ? 'domino-active' : ''}
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
        `<div> <span class="font-bold">${d[dominoField]}</span> (${yFieldValue})</div>
           <div class="flex space-between">
             <div class="capitalize">${xField}:</div>
             <div class="pl-2 font-bold">${xFieldValue}</div>
           </div>
           <div class="flex space-between">
             <div class="capitalize">${sizeField}:</div>
             <div class="pl-2 font-bold">${sizeFieldValue}</div>
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
      ${initialStateAll.includes(d) ? 'ribbon-active' : ''}`,
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

  const allDominoFieldValues = _.chain(data).map(dominoField).uniq().value()

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

  const searchEventHandler = qstr => {
    if (qstr) {
      clearSearchButton.style('visibility', 'visible')
      const lqstr = qstr.toLowerCase()
      allDominoFieldValues.forEach(val => {
        const dominoGroupCode = toClassText(val)
        if (val.toLowerCase().includes(lqstr)) {
          d3.select(`.ribbon-${dominoGroupCode}`).classed(
            'ribbon-matched',
            true,
          )
          d3.selectAll(`.domino-${dominoGroupCode}`).classed(
            'domino-matched',
            true,
          )

          d3.select('.g-ribbons').classed('searching', true)
        } else {
          d3.select(`.ribbon-${dominoGroupCode}`).classed(
            'ribbon-matched',
            false,
          )
          d3.selectAll(`.domino-${dominoGroupCode}`).classed(
            'domino-matched',
            false,
          )
        }
      })
    } else {
      allDominoFieldValues.forEach(val => {
        const dominoGroupCode = toClassText(val)
        d3.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-matched', false)

        d3.selectAll(`.domino-${dominoGroupCode}`).classed(
          'domino-matched',
          false,
        )
      })
      d3.select('.g-ribbons').classed('searching', false)
      clearSearchButton.style('visibility', 'hidden')
    }
  }

  const clearSearchButton = d3.select('#clear-search')
  clearSearchButton.style('visibility', 'hidden')
  const search = d3.select('#search')
  search.attr('placeholder', `Find by ${dominoField}`).classed('hidden', false)
  search.on('keyup', e => {
    const qstr = e.target.value
    searchEventHandler(qstr)
  })

  const goToInitialState = d3.select('#initial-state')
  goToInitialState.classed('hidden', false)
  goToInitialState.on('click', () => {
    d3.selectAll('.ribbon').classed('ribbon-active', false)
    _.forEach(initialStateAll, val => {
      d3.select(`.ribbon-${toClassText(val)}`).classed('ribbon-active', true)
    })
    search.node().value = ''
    searchEventHandler('')
  })

  const clearAll = d3.select('#clear-all')
  clearAll.classed('hidden', false)
  clearAll.on('click', () => {
    d3.selectAll('.ribbon').classed('ribbon-active', false)
    search.node().value = ''
    searchEventHandler('')
  })

  const sizeLegend = d3.select('#size-legend').append('svg')
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

  d3.select('#color-legend')
    .append('svg')
    .attr('width', 300)
    .attr('height', 55)
    .append(() =>
      legend({
        color: colorScale,
        title: colorLegendLabel || _.capitalize(colorField),
        width: 260,
        tickFormat: val => formatNumber(val, colorLegendValueFormatter),
      }),
    )
  // adjust svg to prevent overflows
  let allComponentsBox = allComponents.node().getBBox()

  const safetyMargin = 20

  const updatedViewBoxWidth =
    allComponentsBox.width + safetyMargin + marginLeft + marginRight
  const updatedViewBoxHeight =
    allComponentsBox.height + safetyMargin + marginTop + marginBottom
  svg.attr('viewBox', `0 0 ${updatedViewBoxWidth} ${updatedViewBoxHeight}`)

  allComponentsBox = allComponents.node().getBBox()

  allComponents.attr(
    'transform',
    `translate(${-allComponentsBox.x + safetyMargin / 2 + marginLeft}, ${
      -allComponentsBox.y + safetyMargin / 2 + marginTop
    })`,
  )
}
