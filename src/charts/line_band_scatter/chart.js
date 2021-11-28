/* global dimensions, options, swatches */
const { xField, yFields = [], yBandFields = [], yScatterFields } = dimensions

const {
  heading = '{{ heading }}',
  subheading = '{{ subheading }}',
  aspectRatio = 2,
  marginTop = 0,
  marginRight = 0,
  marginBottom = 0,
  marginLeft = 0,
  bgColor = 'transparent',
  xAxisLabel = xField,
  yAxisLabel = '',
  yLineColors,
  yColors,

  yBandColors,
  yScatterColors,

  scatterCircleRadius = 2,

  highlightRanges,
  highlightRangeColors,
} = options

d3.select('#chart-heading').node().textContent = heading
d3.select('#chart-subheading').node().textContent = subheading

const coreChartWidth = 800
const coreChartHeight = coreChartWidth / aspectRatio

const viewBoxHeight = coreChartHeight + marginTop + marginBottom
const viewBoxWidth = coreChartWidth + marginLeft + marginRight

const svgParentNodeSelector = '#svg-container'

const svgParent = d3.select(svgParentNodeSelector)

const svg = svgParent
  .append('svg')
  .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
  .style('background', bgColor)

Promise.all([d3.csv('data.csv'), d3.csv('data_scatter.csv')]).then(
  ([dataRaw, dataScatterRaw]) => {
    const allYValues = []

    const data = dataRaw.map(d => {
      const parsedDataRow = { ...d }
      yFields.forEach(yf => {
        if (yf.line) {
          const dyf = Number.parseFloat(d[yf.line])
          parsedDataRow[yf.line] = dyf
          allYValues.push(dyf)
        }
        if (yf.band) {
          const yBandFieldDataMin = Number.parseFloat(d[yf.band[0]])
          parsedDataRow[yf.band[0]] = yBandFieldDataMin
          allYValues.push(yBandFieldDataMin)

          const yBandFieldDataMax = Number.parseFloat(d[yf.band[1]])
          parsedDataRow[yf.band[1]] = yBandFieldDataMax
          allYValues.push(yBandFieldDataMax)
        }
      })
      return parsedDataRow
    })

    const dataScatter = dataScatterRaw.map(d => {
      const parsedDataRow = { ...d }
      yFields.forEach(yf => {
        if (yf.circle) {
          const dyf = Number.parseFloat(d[yf.circle])
          parsedDataRow[yf.line] = dyf
          allYValues.push(dyf)
        }
      })
      return parsedDataRow
    })

    const yDomain = d3.extent(allYValues)

    const xDomainLineBand = d3.extent(data.map(d => d[xField]))
    const xDomainScatter = d3.extent(dataScatter.map(d => d[xField]))

    const xDomain = d3.extent([...xDomainLineBand, ...xDomainScatter])

    const xScale = d3.scaleLinear().range([0, coreChartWidth]).domain(xDomain)
    const yScale = d3
      .scaleLinear()
      .range([coreChartHeight, 0])
      .domain(yDomain)
      .nice()

    const yAxisTickSizeOffset = 20

    const chartCore = svg
      .append('g')
      .attr('transform', `translate(${marginLeft}, ${marginTop})`)

    const tooltipDiv = d3
      .select('body')
      .append('div')
      .attr(
        'class',
        'dom-tooltip absolute  bg-white rounded px-2 py-1 text-xs border',
      )
      .style('opacity', 0)

    const yAxis = chartCore
      .append('g')
      .attr('id', 'x-axis')
      .attr(
        'transform',
        `translate(${coreChartWidth + yAxisTickSizeOffset}, 0)`,
      )

    yAxis
      .call(
        d3.axisRight(yScale).tickSize(-coreChartWidth - yAxisTickSizeOffset),
      )
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))
      .call(g => g.selectAll('.tick text').attr('fill', '#333'))
      .call(g => g.select('.domain').remove())

    yAxis
      .append('text')
      .text(yAxisLabel)
      .attr('fill', '#333')
      .attr('text-anchor', 'end')
      .style('font-weight', 'bold')
      .attr('transform', `translate(${30}, -10)`)

    // highlightRange
    highlightRanges.forEach((hr, i) => {
      chartCore
        .append('rect')
        .attr('x', d3.min([xScale(hr[0], xScale(hr[1]))]))
        .attr('y', 0)
        .attr('height', coreChartHeight)
        .attr('width', Math.abs(xScale(hr[1]) - xScale(hr[0])))
        .attr('fill', highlightRangeColors[i])
      // .attr('opacity', 0.2)
    })

    const lineForField = field => {
      return (
        d3
          .line()
          // .curve(d3.curveBasis)
          .defined(d => !Number.isNaN(d[field]))
          .x(d => xScale(d[xField]))
          .y(d => yScale(d[field]))
      )
    }

    const areaForBand = ([bandMin, bandMax]) => {
      return (
        d3
          .area()
          // .curve(d3.curveBasis)
          .defined(d => !Number.isNaN(d[bandMin]) && !Number.isNaN(d[bandMax]))
          .x(d => xScale(d[xField]))
          .y0(d => yScale(d[bandMin]))
          .y1(d => yScale(d[bandMax]))
      )
    }

    yFields.forEach((yf, i) => {
      if (yf.band) {
        chartCore
          .append('path')
          .datum(data)
          .attr('fill', yColors[i].band)
          .attr('d', areaForBand(yf.band))
      }
    })
    yFields.forEach((yf, i) => {
      if (yf.circle) {
        chartCore
          .append('g')
          .attr('class', `scatter-container-${i}`)
          .selectAll('circle')
          .data(dataScatter.filter(d => !Number.isNaN(d[yf.circle])))
          .join('circle')
          .attr('cx', d => xScale(d[xField]))
          .attr('cy', d => yScale(d[yf.circle]))
          .attr('r', scatterCircleRadius)
          .attr('fill', yColors[i].circle)
      }
    })
    yFields.forEach((yf, i) => {
      if (yf.line) {
        chartCore
          .append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', yColors[i].line)
          .attr('stroke-width', 2.5)
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('d', lineForField(yf.line))

        const filteredData = data.filter(d => !Number.isNaN(d[yf.line]))
        chartCore
          .append('g')
          .attr('class', 'tooltip-circles')
          .selectAll('circle')
          .data(filteredData)
          .join('circle')
          .attr('cx', d => xScale(d[xField]))
          .attr('cy', d => yScale(d[yf.line]))
          .attr('r', 5)
          .attr('fill', 'transparent')
          .on('mouseover', function (e, d) {
            const lineValue = d[yf.line]

            tooltipDiv.transition().duration(200).style('opacity', 1)

            // If line is not linked to band, show only line values
            if (yf.band) {
              const [bandMinValue, bandMaxValue] = [
                d[yf.band[0]],
                d[yf.band[1]],
              ]
              tooltipDiv.html(`<span style="font-weight: bold">${d[xField]}</span>
            <br/> ${yf.line}: ${lineValue}
            <br/> ${yf.band[0]}: ${bandMinValue}
            <br/> ${yf.band[1]}: ${bandMaxValue}`)
            } else {
              tooltipDiv.html(`<span style="font-weight: bold">${d[xField]}</span>
            <br/> ${yf.line}: ${lineValue}`)
            }

            tooltipDiv
              .style('left', `${e.clientX}px`)
              .style('top', `${e.clientY + 20 + window.scrollY}px`)
          })
          .on('mouseout', function () {
            tooltipDiv
              .style('left', '-300px')
              .transition()
              .duration(500)
              .style('opacity', 0)
          })
      }
    })
    // x axis
    const xAxis = chartCore
      .append('g')
      .attr('id', 'x-axis')
      .attr('transform', `translate(0, ${coreChartHeight})`)

    xAxis.call(d3.axisBottom(xScale).tickFormat(d3.format('d'))).call(g => {
      g.selectAll('.domain').attr('stroke', '#333')
      g.selectAll('.tick line').attr('stroke', '#333')
      g.selectAll('.tick text').attr('fill', '#333')
    })

    xAxis
      .append('text')
      .text(xAxisLabel)
      .attr('fill', '#333')
      .attr('font-weight', 'bold')
      .attr('transform', `translate(${coreChartWidth / 2}, 30)`)
      .attr('text-anchor', 'middle')

    const lineBandsWithColors = []
    yFields.forEach((yf, i) => {
      const k = {}
      k.type = ''
      if (yf.line) {
        k.line = { label: yf.line, color: yColors[i].line }
        k.type += 'line'
      }
      if (yf.band) {
        k.band = {
          label: `${yf.band[0]}-${yf.band[1]}`,
          color: yColors[i].band,
        }
        k.type += 'band'
      }
      if (yf.circle) {
        k.circle = { label: yf.circle, color: yColors[i].circle }
        k.type = 'circle'
      }

      lineBandsWithColors.push(k)
    })

    function lineBandLegend({
      uid,
      swatchSize = 20,
      swatchWidth = swatchSize,
      swatchHeight = swatchSize,
      lineHeight = 5,
      lineBandColorScale,
      format = x => x,
      circleDiameter = 8,
    }) {
      const id = `${uid}-lbl`

      return `<div
    style="display: flex; align-items: center; min-height: 33px; margin-left: ${+marginLeft}px; font: 10px sans-serif;"
  >
    <style>
      .${id} {
        display: inline-flex;
        align-items: center;
        margin-right: 1em;
      }
      .${id}.band::before, .${id}.lineband::before {
        content: '';
        width: ${+swatchWidth}px;
        height: ${+swatchHeight}px;
        margin-right: 0.5em;
      }
      .${id}.band::before {
        background: var(--band-color);
      }
      .${id}.lineband::before {
        background: linear-gradient(180deg, var(--band-color) 0%, var(--band-color) 40%, var(--line-color) 40%, var(--line-color) 60%, var(--band-color) 60%, var(--band-color) 100%);
      }
      .${id}.line::before {
        content: '';
        width: ${+swatchWidth}px;
        height: ${+lineHeight}px;
        margin-right: 0.5em;
        background: var(--line-color);
      }
      .${id}.circle::before {
        content: '';
        width: ${+circleDiameter}px;
        height: ${+circleDiameter}px;
        margin-right: 0.5em;
        background: var(--circle-color);
        border-radius: 100%;
      }
    </style>

      
        ${lineBandColorScale
          .map(
            lbc =>
              `<span class="${id} ${lbc.type}"
                style="--line-color: ${lbc.line?.color};
                  --band-color: ${lbc.band?.color};
                  --circle-color: ${lbc.circle?.color}">
                  ${
                    lbc.line
                      ? format(lbc.line.label)
                      : lbc.band
                      ? format(lbc.band.label)
                      : format(lbc.circle.label)
                  }
              </span>`,
          )
          .join('')}
      
    </div>
  `
    }
    d3.select('#color-legend').html(
      lineBandLegend({ lineBandColorScale: lineBandsWithColors }),
    )
    const chartCoreBox = chartCore.node().getBBox()

    const safetyMargin = 20

    const updatedViewBoxWidth =
      chartCoreBox.width + safetyMargin + marginLeft + marginRight // - chartCoreDim.x
    const updatedViewBoxHeight =
      chartCoreBox.height + safetyMargin + marginTop + marginBottom
    svg.attr('viewBox', `0 0 ${updatedViewBoxWidth} ${updatedViewBoxHeight}`)

    const chartCoreDim = chartCore.node().getBBox()
    chartCore.attr(
      'transform',
      `translate(${-chartCoreDim.x + safetyMargin / 2 + marginLeft}, ${
        -chartCoreDim.y + safetyMargin / 2 + marginTop
      })`,
    )
  },
)
