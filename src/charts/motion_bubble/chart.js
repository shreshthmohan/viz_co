/* global dimensions, options */
const { sizeField, xField, yField, timeField, nameField, colorField } =
  dimensions
const {
  motionDelay = 1000,
  marginTop = 40,
  marginRight = 50,
  marginBottom = 50,
  marginLeft = 40,
  bgColor = 'transparent',
  heading = '',
  subheading = '',
  aspectRatio = 2,

  /* eslint-disable unicorn/no-null */
  sizeRange = [2, 20],
  xDomainCustom = null,
  yDomainCustom = null,
  /* eslint-enable unicorn/no-null */

  inbuiltScheme = 'schemePuRd',
  numberOfColors = 9, // minumum: 3, maximum: 9
  xAxisLabel = xField,
  yAxisLabel = yField,
} = options

const coreChartWidth = 1000
const coreChartHeight = coreChartWidth / aspectRatio

const viewBoxHeight = coreChartHeight + marginTop + marginBottom
const viewBoxWidth = coreChartWidth + marginLeft + marginRight
let intervalId

const toClassText = str => str.replace(/\s/g, '-').toLowerCase()
d3.select('#chart-heading').node().textContent = heading
d3.select('#chart-subheading').node().textContent = subheading

const svgParentNodeSelector = '#svg-container'

const svgParent = d3.select(svgParentNodeSelector)

const svg = svgParent
  .append('svg')
  .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
  .style('background', bgColor)

const rangeSlider = d3.select('#range-slider')

const tooltipDiv = d3
  .select('body')
  .append('div')
  .attr('class', 'tooltip absolute bg-white rounded p-2 text-xs border')
  .style('opacity', 0)

d3.csv('data.csv').then(dataRaw => {
  const data = dataRaw.map(d => ({
    ...d,
    [sizeField]: Number.parseFloat(d[sizeField]),
    [xField]: Number.parseFloat(d[xField]),
    [yField]: Number.parseFloat(d[yField]),
  }))

  // let sizes
  // let sizeDomain
  // let sizeScale
  const sizes = data.map(d => d[sizeField])
  const sizeDomain = d3.extent(sizes)
  const sizeScale = d3.scaleSqrt().domain([0, sizeDomain[1]]).range(sizeRange)

  const xDomain = xDomainCustom || d3.extent(data.map(d => d[xField]))
  const yDomain = yDomainCustom || d3.extent(data.map(d => d[yField]))

  const xScale = d3.scaleLinear().domain(xDomain).range([0, coreChartWidth])
  const yScale = d3.scaleLinear().range([coreChartHeight, 0]).domain(yDomain)
  // .nice()

  const colorDomain = _.uniq(_.map(data, colorField))
  const colorScale = d3.scaleOrdinal(
    colorDomain,
    d3[inbuiltScheme][numberOfColors],
  )

  const chartCore = svg
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  const dataAt = loc => {
    return data.filter(d => d[timeField] === loc)
  }

  const timeDomain = _.uniq(_.map(data, timeField)).sort()
  const timeDomainLength = timeDomain.length

  const rangeSliderValue = d3.select('#range-slider-value')

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

  d3.select('#range-slider-label').text(timeField)

  rangeSlider
    .attr('min', 0)
    .attr('max', timeDomainLength - 1)
    .attr('value', 0)
    .on('input', e => {
      const posInArr = Number.parseInt(e.target.value, 10)
      rangeSliderValue.text(timeDomain[posInArr])
      updateCircles(dataAt(timeDomain[posInArr]))
    })

  const startButton = d3.select('#start')
  const stopButton = d3.select('#stop')

  startButton.on('click', () => {
    startButton.node().disabled = true
    stopButton.node().disabled = false

    // if (rangeSlider.node().value === timeDomainLength - 1) {
    if (
      Number.parseInt(rangeSlider.node().value, 10) ===
      Number.parseInt(timeDomainLength - 1, 10)
    ) {
      rangeSlider.node().value = 0
    }
    intervalId = setInterval(() => {
      // console.log(typeof rangeSlider.node().value, typeof timeDomainLength - 1)
      if (
        Number.parseInt(rangeSlider.node().value, 10) ===
        Number.parseInt(timeDomainLength - 1, 10)
      ) {
        clearInterval(intervalId)
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
    clearInterval(intervalId)
  })

  // Search
  const search = d3.select('#search')

  search.attr('placeholder', `Find by ${nameField}`)

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

  // Axes
  const svgXAxis = svg
    .append('g')
    .attr(
      'transform',
      `translate(${marginLeft}, ${coreChartHeight + marginTop})`,
    )
    .lower()

  svgXAxis
    .append('g')
    .call(d3.axisBottom(xScale).tickSize(-coreChartHeight - 6))
    .style('color', '#777')
    .call(g => {
      g.selectAll('.tick line')
        .style('color', '#ddd')
        .attr('transform', `translate(0, ${6})`)
      g.selectAll('.tick text').attr('transform', `translate(0, ${6})`)
      g.select('.domain').remove()
    })
    .attr('class', 'x-axis')

  svgXAxis
    .append('text')
    .attr('transform', `translate(${coreChartWidth / 2}, 35)`)
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'top')
    .attr('class', 'text-xs ')
    .text(xAxisLabel)

  const svgYAxis = svg
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)
    .lower()

  svgYAxis
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

  svgYAxis
    .append('text')
    .attr('transform', `translate(-35, ${coreChartHeight / 2}), rotate(-90)`)
    .style('text-anchor', 'middle')
    .style('dominant-baseline', 'hanging')
    .attr('class', 'text-xs ')
    .text(yAxisLabel)
})
