/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'
import { formatNumber } from '../../utils/helpers/formatters'

import { preventOverflow, toClassText } from '../../utils/helpers/general'

import {
  setupChartArea,
  initializeTooltip,
} from '../../utils/helpers/commonChartHelpers'

let currentState = 'global'
export function renderChart({
  data,
  options: {
    aspectRatio = 2,

    marginTop = 60,
    marginRight = 90,
    marginBottom = 20,
    marginLeft = 50,

    bgColor = 'transparent',

    valuePrefix = '',
    valuePostfix = '',
    valueFormatter = '',

    chordType = 'undirected',

    defaultState = [],

    colorScheme = d3.schemeCategory10,
    arcLabelFontSize = '8px',

    inactiveOpacity = 0.2,
    activeOpacity = 0.8,
    clickInteraction = false,

    searchInputClassNames = '',
    clearAllButtonClassNames = '',
    showAllButtonClassNames = '',

    startingState = 'showAll',
  },
  dimensions: { sourceField, targetField, valueField },
  chartContainerSelector,
}) {
  applyInteractionStyles({ activeOpacity, inactiveOpacity })

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

  const { dataParsed, names, defaultStateAll, matrix, index, reverseIndex } =
    parseData({
      data,
      valueField,
      sourceField,
      targetField,
      defaultState,
    })

  const innerRadius = Math.min(coreChartWidth, coreChartHeight) * 0.5 - 20
  const outerRadius = innerRadius + 20

  const { chord, arc, ribbon } = getShapes({
    innerRadius,
    outerRadius,
    chordType,
  })

  const { colorScale } = setupScales({ names, colorScheme })

  renderChords({
    dataParsed,
    matrix,
    names,
    chartCore,
    chord,
    arc,
    ribbon,
    colorScale,
    outerRadius,
    defaultStateAll,
    reverseIndex,
    targetField,
    sourceField,
    valueField,
    tooltipDiv,
    valuePrefix,
    valueFormatter,
    valuePostfix,
    arcLabelFontSize,
    clickInteraction,
    chordType,
  })

  const handleSearch = searchEventHandler(names, index)
  const search = setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    sourceField,
  })

  setupClearAllButton({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
    defaultStateAll,
    index,
  })

  setupShowAllButton({
    widgetsLeft,
    showAllButtonClassNames,
    search,
    handleSearch,
  })

  currentState = startingState
  if (currentState === 'showAll') {
    setShowAllState()
  } else if (currentState === 'clearAll') {
    setClearAllState()
  }

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function applyInteractionStyles({ activeOpacity, inactiveOpacity }) {
  d3.select('body').append('style').html(`
  path.ribbon {
    fill-opacity: ${inactiveOpacity}
  }
  path.ribbon.ribbon-active {
    fill-opacity: ${activeOpacity}
  }
  path.ribbon.ribbon-hovered {
    fill-opacity: ${activeOpacity}
  }
  g.ribbons.searching path.ribbon.ribbon-matched {
    fill-opacity: ${activeOpacity}
  }
  g.arc path.chord{
    fill-opacity: ${inactiveOpacity};
    stroke-width: 2; 
    stroke: #fff;
  }
  g.arc.arc-active path.chord{
    fill-opacity: ${activeOpacity}
  }
  g.arc.arc-hovered path.chord{
    fill-opacity: ${activeOpacity}
  }
  g.arcs.searching g.arc.arc-matched path.chord{
    fill-opacity: ${activeOpacity}
  }
  `)
}

function parseData({
  data,
  valueField,
  sourceField,
  targetField,
  defaultState,
}) {
  const dataParsed = data.map(el => {
    const elParsed = { ...el }
    elParsed[valueField] = Number.parseFloat(el[valueField])
    return elParsed
  })

  const names = _(dataParsed)
    .flatMap(d => [d[sourceField], d[targetField]])
    .uniq()
    .value()
  let defaultStateAll = defaultState === 'All' ? names : defaultState
  defaultStateAll = _.map(defaultStateAll, val =>
    toClassText(val).toLowerCase(),
  )

  const matrix = _.chunk(
    _.times(_.multiply(names.length, names.length), _.constant(0)),
    names.length,
  )

  const index = new Map(names.map((name, i) => [toClassText(name), i]))
  const reverseIndex = new Map(names.map((name, i) => [i, toClassText(name)]))
  _.forEach(dataParsed, row => {
    matrix[index.get(toClassText(row[sourceField]))][
      index.get(toClassText(row[targetField]))
    ] = Number(row[valueField])
  })

  return {
    dataParsed,
    names,
    defaultStateAll,
    matrix,
    index,
    reverseIndex,
  }
}

function getShapes({ innerRadius, outerRadius, chordType }) {
  const chord = d3
    .chordDirected()
    .padAngle(12 / innerRadius)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending)

  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius)

  let ribbon = chordType === 'directed' ? d3.ribbonArrow() : d3.ribbon()
  ribbon = ribbon.radius(innerRadius - 0.5).padAngle(1 / innerRadius)
  return { chord, arc, ribbon }
}

function setupScales({ names, colorScheme }) {
  const colorScale = d3.scaleOrdinal(names, colorScheme)

  return { colorScale }
}

function renderChords({
  dataParsed,
  matrix,
  names,
  chartCore,
  chord,
  arc,
  ribbon,
  colorScale,
  outerRadius,
  defaultStateAll,
  reverseIndex,
  targetField,
  sourceField,
  valueField,
  tooltipDiv,
  valuePrefix,
  valueFormatter,
  valuePostfix,
  arcLabelFontSize,
  clickInteraction,
  chordType,
}) {
  const chords = chord(matrix)
  const textId = 'arcId'

  chartCore
    .append('path')
    .attr('id', textId)
    .attr('fill', 'none')
    .attr('d', d3.arc()({ outerRadius, startAngle: 0, endAngle: 2 * Math.PI }))

  const arcs = chartCore.append('g').attr('class', 'arcs')

  arcs
    .selectAll('g')
    .data(chords.groups)
    .join('g')
    .attr('class', d => {
      return `arc arc-${d.index}
      ${defaultStateAll.includes(reverseIndex.get(d.index)) ? 'arc-active' : ''}
      `
    })
    .call(g =>
      g
        .append('path')
        .attr('d', arc)
        .attr('class', 'chord')
        .attr('fill', d => colorScale(names[d.index])),
    )
    .call(g =>
      g
        .append('text')
        .attr('dy', -3)
        .append('textPath')
        .attr('xlink:href', `#${textId}`)
        .attr('startOffset', d => d.startAngle * outerRadius)
        .style('font-size', arcLabelFontSize)
        .style('fill', 'black')
        .text(d => {
          return names[d.index]
        }),
    )
    .on('mouseover', (e, d) => {
      if (currentState === 'showAll') {
        setClearAllState()
      }
      d3.select(`.arc-${d.index}`).classed('arc-hovered', true)
      d3.selectAll(`.ribbon-source-${d.index}`).classed('ribbon-hovered', true)
      d3.selectAll(`.ribbon-target-${d.index}`).classed('ribbon-hovered', true)
      tooltipDiv.transition().duration(200).style('opacity', 1)
      const arcName = names[d.index]
      const arcData = _.filter(dataParsed, row => {
        return row[sourceField] === arcName || row[targetField] === arcName
      })

      const ribbonData = _.map(names, _name_ => {
        // Same as arc
        if (arcName === _name_) {
          const value = _(arcData)
            .filter(row => {
              return row[sourceField] === _name_ && row[targetField] === _name_
            })
            .sumBy(valueField)
          const arrowSymbol =
            chordType === 'undirected' ? '' : value >= 0 ? '&rarr;' : '&larr;'
          return {
            _name_: _name_,
            _value_: Math.abs(value),
            arrowSymbol: arrowSymbol,
          }
        }
        // Get sources
        const sourceValue = _(arcData)
          .filter(row => {
            return row[targetField] === _name_
          })
          .sumBy(valueField)
        // Get target
        const targetValue = _(arcData)
          .filter(row => {
            return row[sourceField] === _name_
          })
          .sumBy(valueField)
        // Net off
        const value =
          chordType === 'undirected'
            ? sourceValue + targetValue
            : sourceValue - targetValue

        const arrowSymbol =
          chordType === 'undirected' ? '' : value >= 0 ? '&rarr;' : '&larr;'

        return {
          _name_: _name_,
          _value_: Math.abs(value),
          arrowSymbol: arrowSymbol,
        }
      })

      const arcValue = _(arcData).sumBy(valueField)
      // debugger
      const tooltipValues = ribbonData
        .map(ribbon => {
          return `${
            ribbon.arrowSymbol
          } <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${colorScale(
            ribbon._name_,
          )}"></div> ${ribbon._name_}: ${
            valuePrefix +
            formatNumber(ribbon._value_, valueFormatter) +
            valuePostfix
          }`
        })
        .reverse()
      // const values = names
      //   .map(_name_ => {
      //     const _value_ = _(ribbonData)
      //       .filter(row => row._name_ === _name_)
      //       .sumBy(_value_)
      //     return `${arrowSymbol} <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${colorScale(
      //       _name_,
      //     )}"></div> ${_name_}: ${
      //       valuePrefix + formatNumber(_value_, valueFormatter) + valuePostfix
      //     }`
      //   })
      //   .reverse()

      tooltipDiv.html(
        `<b>${arcName}</b>: ${
          valuePrefix + formatNumber(arcValue, valueFormatter) + valuePostfix
        }
        <br/>
        ${tooltipValues.join('<br/>')}
        `,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', (e, d) => {
      d3.select(`.arc-${d.index}`).classed('arc-hovered', false)
      d3.selectAll(`.ribbon-source-${d.index}`).classed('ribbon-hovered', false)
      d3.selectAll(`.ribbon-target-${d.index}`).classed('ribbon-hovered', false)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)

      if (currentState === 'showAll') {
        setShowAllState()
      }
    })
    .on('click', (e, d) => {
      if (clickInteraction) {
        const clickedState = d3
          .select(e.target.parentNode)
          .classed('arc-active')
        d3.select(`.arc-${d.index}`).classed('arc-active', !clickedState)
        d3.selectAll(`.ribbon-${d.index}`).classed(
          'ribbon-active',
          !clickedState,
        )
      }
    })

  const ribbons = chartCore.append('g').attr('class', 'ribbons')

  ribbons
    .selectAll('g')
    .data(chords)
    .join('path')
    .attr('d', ribbon)
    .attr('class', d => {
      return `ribbon 
      ribbon-${d.source.index}-${d.target.index} 
      ribbon-source-${d.source.index} 
      ribbon-target-${d.target.index}
      ${
        defaultStateAll.includes(reverseIndex.get(d.source.index))
          ? 'ribbon-active'
          : ''
      }
        ${
          defaultStateAll.includes(reverseIndex.get(d.target.index))
            ? 'ribbon-active'
            : ''
        }
      `
    })
    .attr('fill', d => colorScale(names[d.target.index]))
    .style('mix-blend-mode', 'multiply')
    .on('mouseover', (e, d) => {
      if (currentState == 'showAll') {
        setClearAllState()
      }
      d3.select(`.ribbon-${d.source.index}-${d.target.index}`).classed(
        'ribbon-hovered',
        true,
      )
      d3.select(`.arc-${d.source.index}`).classed('arc-hovered', true)
      d3.select(`.arc-${d.target.index}`).classed('arc-hovered', true)
      tooltipDiv.transition().duration(200).style('opacity', 1)
      const sourceName = names[d.source.index]
      const targetName = names[d.target.index]
      const flowValue = d.source.value
      const arrowSymbol = chordType === 'undirected' ? '&harr;' : '&rarr;'
      tooltipDiv.html(
        `<div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${colorScale(
          sourceName,
        )}"></div> ${sourceName} 
        ${arrowSymbol} 
        <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${colorScale(
          targetName,
        )}"></div> ${targetName}: <b>${
          valuePrefix + formatNumber(flowValue, valueFormatter) + valuePostfix
        }</b>
        `,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', (e, d) => {
      d3.select(`.ribbon-${d.source.index}-${d.target.index}`).classed(
        'ribbon-hovered',
        false,
      )
      d3.select(`.arc-${d.source.index}`).classed('arc-hovered', false)
      d3.select(`.arc-${d.target.index}`).classed('arc-hovered', false)
      if (currentState == 'showAll') {
        setShowAllState()
      }
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })
    .on('click', (e, d) => {
      if (clickInteraction) {
        const clickedState = d3.select(e.target).classed('ribbon-active')
        d3.select(`.ribbon-${d.source.index}-${d.target.index}`).classed(
          'ribbon-active',
          !clickedState,
        )
        d3.select(`.arc-${d.source.index}`).classed('arc-active', !clickedState)
        d3.select(`.arc-${d.target.index}`).classed('arc-active', !clickedState)
      }
    })
}

const searchEventHandler = (referenceList, index) => qstr => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    const matchedIndexes = []
    const matchedArcs = []
    referenceList.forEach(val => {
      const arcName = toClassText(val).toLowerCase()
      const index_ = index.get(arcName)
      if (arcName.toLowerCase().includes(lqstr)) {
        matchedIndexes.push(index_)
        matchedArcs.push(arcName)
      }
    })
    d3.select('.ribbons').classed('searching', true)
    d3.select('.arcs').classed('searching', true)
    d3.selectAll('.arc').classed('arc-matched', false)
    d3.selectAll('.ribbon').classed('ribbon-matched', false)
    setClearAllState()
    matchedIndexes.forEach(val => {
      d3.select(`.arc-${val}`).classed('arc-matched', true)
      d3.selectAll(`.ribbon-source-${val}`).classed('ribbon-matched', true)
      d3.selectAll(`.ribbon-target-${val}`).classed('ribbon-matched', true)
    })
  } else {
    d3.select('.ribbons').classed('searching', false)
    d3.select('.arcs').classed('searching', false)
    d3.selectAll('.arc').classed('arc-matched', false)
    d3.selectAll('.ribbon').classed('ribbon-matched', false)
    if (currentState === 'showAll') {
      setShowAllState()
    } else if (currentState === 'clearAll') {
      setClearAllState()
    }
  }
}

function setupSearch({
  handleSearch,
  widgetsLeft,
  searchInputClassNames,
  sourceField,
}) {
  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  // TODO: refactor hidden, won't be needed if we add this node
  search.attr('placeholder', `Find by ${sourceField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr)
  })
  return search
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
  clearAll.classed('hidden', false)
  clearAll.on('click', () => {
    currentState = 'clearAll'
    setClearAllState()
    // _.forEach(defaultStateAll, val => {
    //   const index_ = index.get(val)
    //   d3.select(`.arc-${index_}`).classed('arc-active', true)
    //   d3.selectAll(`.ribbon-${index_}`).classed('ribbon-active', true)
    // })
    search.node().value = ''
    handleSearch('')
  })
}

function setupShowAllButton({
  widgetsLeft,
  showAllButtonClassNames,
  search,
  handleSearch,
}) {
  const clearAll = widgetsLeft
    .append('button')
    .text('Show All')
    .attr('class', showAllButtonClassNames)
  clearAll.classed('hidden', false)
  clearAll.on('click', () => {
    currentState = 'showAll'
    setShowAllState()
    search.node().value = ''
    handleSearch('')
  })
}

function setShowAllState() {
  d3.selectAll('.ribbon').classed('ribbon-active', true)
  d3.selectAll('.arc').classed('arc-active', true)
}

function setClearAllState() {
  d3.selectAll('.ribbon').classed('ribbon-active', false)
  d3.selectAll('.arc').classed('arc-active', false)
}
