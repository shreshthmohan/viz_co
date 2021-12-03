/* global swatches, toClassText */
const svgParentNodeSelector = '#svg-container'
function renderChart({ data, options, dimensions }) {
  // console.log({ data })

  const { groupField, xField, yField, seriesField } = dimensions

  const {
    heading = '{{heading}}',
    subheading = '{{subheading}}',

    aspectRatio = 1,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    containerWidth = 'max-w-screen-xl',

    alternatingTickTextXAxis = true,

    xAxisLabel = xField,
    yAxisLabel = yField,

    verticalLines = [],
    verticalDashedLineLabels = [],

    colorScheme = d3.schemeSpectral[8],

    areaOpacity = 0.5,

    yAxisTickSizeOffset = 30,
  } = options

  const tooltipDiv = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip absolute  bg-white rounded px-1 text-xs border')
    .style('opacity', 0)
    .style('padding', '0.25rem')

  d3.select('#main-container').classed(`${containerWidth}`, true)

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
    .attr('class', 'font-nunito')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  const dataParsed = data.map(el => {
    const elParsed = { ...el }
    elParsed[yField] = Number.parseFloat(el[yField])
    return elParsed
  })

  // eslint-disable-next-line unicorn/no-array-callback-reference
  const yGridDomain = _(dataParsed).map(groupField).uniq().value()
  // console.log({ yGridDomain })

  const yGridScale = d3
    .scaleBand()
    .range([coreChartHeight, 0])
    .domain(yGridDomain)
    .paddingInner(0.15)

  // console.log(yGridScale.paddingInner())

  // eslint-disable-next-line unicorn/no-array-callback-reference
  const yDomain = d3.extent(_(dataParsed).map(yField))
  // console.log({ yDomain })
  const yScale = d3
    .scaleLinear()
    .range([yGridScale.bandwidth(), 0])
    .domain(yDomain)
  // .nice()

  const xDomain = _(dataParsed)
    // eslint-disable-next-line unicorn/no-array-callback-reference
    .map(xField)
    .uniq()
    .value()
    // TODO handle case when not numbers
    .sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b))

  const xScale = d3.scalePoint().range([0, coreChartWidth]).domain(xDomain)
  // .paddingInner(0)
  // .paddingOuter(0)

  // console.log(xScale('0'))

  // eslint-disable-next-line unicorn/no-array-callback-reference
  const seriesValues = _(dataParsed).map(seriesField).uniq().value()
  const colorScale = d3.scaleOrdinal().range(colorScheme).domain(seriesValues)

  const area = () => {
    return (
      d3
        .area()
        // .curve(d3.curveBasis)
        .x(d => xScale(d[xField]))
        .y1(d => yScale(d[yField]))
        .y0(() => yScale(d3.min(yDomain)))
    )
  }

  chartCore
    .selectAll('g.grid-row')
    .data(yGridDomain)
    .join('g')
    .attr('class', 'grid-row')
    .attr('data-group', d => d)
    .attr('transform', d => `translate(0, ${yGridScale(d)})`)

    .each(function (d, i) {
      // x-axis
      d3.select(this)
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${yGridScale.bandwidth()})`)
        .call(d3.axisBottom(xScale))
        .call(g => {
          g.selectAll('.domain').attr('stroke', '#333')
          g.selectAll('.tick line').attr('stroke', '#333')
          g.selectAll('.tick text').attr('fill', '#333')
          if (i % 2 !== 0 && alternatingTickTextXAxis) {
            g.selectAll('.tick text').remove()
          }
        })

      // Group label
      d3.select(this)
        .append('text')
        .attr('transform', `translate(-10, ${yGridScale.bandwidth()})`)
        .text(d)
        .attr('text-anchor', 'end')
        .style('font-weight', 'bold')
        .attr('dominant-baseline', 'middle')

      // y -axis
      d3.select(this)
        .append('g')
        .attr('class', 'y-axis')
        .attr(
          'transform',
          `translate(${coreChartWidth + yAxisTickSizeOffset}, 0)`,
        )
        .call(
          d3
            .axisRight(yScale)
            .tickSize(-coreChartWidth - yAxisTickSizeOffset)
            .ticks(5),
        )
        .call(g => {
          g.selectAll('.tick line').attr('stroke-opacity', '0.2')
          g.selectAll('.tick text').attr('fill', '#333')
          // .style('dominant-baseline', 'text-after-edge')
          // .attr('dy', -1)
          g.select('.domain').remove()
        })
    })
    .each(function (d) {
      d3.select(this)
        .selectAll('path.series')
        .data(seriesValues)
        .join('path')
        .attr('class', 'series')
        .attr('d', s =>
          area()(
            dataParsed.filter(c => c[groupField] === d && c[seriesField] === s),
          ),
        )
        .attr('fill', s => colorScale(s))
        .attr('opacity', areaOpacity)

      // TODO: vertical line (dotted)
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
        // .attr('fill', 'transparent')
        // .attr('stroke', dp => colorScale(dp[seriesField]))
        // .attr('stroke-width', 2)
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
      `translate(${coreChartWidth + yAxisTickSizeOffset + 15}, ${0})`,
    )
    .append('text')
    .text(yAxisLabel)
    .attr('dominant-baseline', 'hanging')
    .attr('text-anchor', 'end')
    .style('font-weight', 'bold')

  // d3.select('#color-legend').html(
  //   swatches({
  //     color: colorScale,
  //     uid: 'rs',
  //     customClass: 'font-nunito font-bold',
  //   }),
  // )

  const dashedLegend = ({
    labels,
    color,
    // columns = null,
    format = x => x,
    swatchSize = 20,
    swatchWidth = 2.5,
    swatchHeight = swatchSize,
    marginLeft = 0,
    uid,
    customClass = '',
  }) => {
    const id = `dl-${uid}`
    const mu = `
  <div
    style="display: flex; align-items: center; min-height: 33px; margin-left: ${+marginLeft}px; font: 10px sans-serif;"
  >
    <style>
      .${id} {
        display: inline-flex;
        align-items: center;
        margin-right: 1em;
      }

      .${id}::before {

        content: "";
        width: 0px;
        height: ${+swatchHeight}px;
        border: ${Math.floor(+swatchWidth)}px dashed var(--color);
        margin-right: 0.5em;
      }
    </style>
      ${labels
        .map(
          l =>
            `<span class="${id}" style="--color: ${color(l.series)}" >${
              l.label
            }</span>`,
        )
        .join('')}

    </div>
  `
    return mu
  }

  d3.select('#color-legend').html(
    dashedLegend({ labels: verticalDashedLineLabels, color: colorScale }) +
      swatches({
        color: colorScale,
        uid: 'rs',
        customClass: 'font-nunito font-bold',
      }),
  )

  // For responsiveness
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
