(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('lodash-es'), require('d3-sankey')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3', 'lodash-es', 'd3-sankey'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.viz = {}, global.d3, global._, global.d3));
})(this, (function (exports, d3$1, _, d3Sankey) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
      Object.keys(e).forEach(function (k) {
        if (k !== 'default') {
          var d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: function () { return e[k]; }
          });
        }
      });
    }
    n["default"] = e;
    return Object.freeze(n);
  }

  var d3__namespace = /*#__PURE__*/_interopNamespace(d3$1);
  var ___default = /*#__PURE__*/_interopDefaultLegacy(_);

  const formatNumber = function (
    value,
    formatter = '',
    scientificNotations = false,
  ) {
    const formattedValue = d3__namespace.format(formatter)(value);
    return scientificNotations
      ? formattedValue
      : ___default["default"].replace(formattedValue, 'G', 'B')
  };

  function renderDirectionLegend({
    selection,
    circleRadius = 5,
    stickLength = 30,
    stickWidth = 2,
    directionStartLabel = 'start',
    directionEndLabel = 'end',
    gapForText = 5,
  }) {
    const directionLegend = selection;
    const directionLegendMain = directionLegend.append('g');
    const directionLegendChild = directionLegendMain
      .append('g')
      .attr('fill', 'gray');
    directionLegendChild
      .append('circle')
      .attr('cx', circleRadius + stickLength)
      .attr('r', circleRadius);
    directionLegendChild
      .append('rect')
      .attr('width', stickLength)
      .attr('height', stickWidth)
      .attr('y', -stickWidth / 2);
    const startPointText = directionLegendChild
      .append('text')
      .text(directionStartLabel)
      .attr('alignment-baseline', 'middle')
      .attr('text-anchor', 'end')
      .style('font-size', 10)
      .attr('transform', `translate(${-gapForText}, 0)`);

    directionLegendChild.attr(
      'transform',
      `translate(${startPointText.node().getBBox().width + gapForText}, ${
      circleRadius > startPointText.node().getBBox().height / 2
        ? circleRadius
        : startPointText.node().getBBox().height / 2
    })`,
    );

    directionLegendChild
      .append('text')
      .text(directionEndLabel)
      .attr('alignment-baseline', 'middle')
      .attr('text-anchor', 'start')
      .attr(
        'transform',
        `translate(${stickLength + circleRadius * 2 + gapForText}, 0)`,
      )
      .style('font-size', 10);

    const directionLegendBoundingBox = directionLegendMain.node().getBBox();
    directionLegend
      .attr('height', directionLegendBoundingBox.height)
      .attr('width', directionLegendBoundingBox.width);
  }

  function toClassText(str) {
    return str.replace(/[\s&',.]/g, '').toLowerCase()
  }

  function preventOverflow({
    allComponents,
    svg,
    safetyMargin = 20,
    margins,
  }) {
    const { marginLeft, marginRight, marginTop, marginBottom } = margins;
    let allComponentsBox = allComponents.node().getBBox();

    const updatedViewBoxWidth =
      allComponentsBox.width + safetyMargin + marginLeft + marginRight;
    const updatedViewBoxHeight =
      allComponentsBox.height + safetyMargin + marginTop + marginBottom;
    svg.attr('viewBox', `0 0 ${updatedViewBoxWidth} ${updatedViewBoxHeight}`);

    allComponentsBox = allComponents.node().getBBox();

    allComponents.attr(
      'transform',
      `translate(${-allComponentsBox.x + safetyMargin / 2 + marginLeft}, ${
      -allComponentsBox.y + safetyMargin / 2 + marginTop
    })`,
    );
  }

  function distanceInPoints({ x1, y1, x2, y2 }) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
  }

  // function midPoint({ x1, y1, x2, y2 }) {
  //   return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
  // }

  function stickRadius(w, l) {
    return Math.sqrt((w / 2) ** 2 + l ** 2)
  }
  function thetaBy2(w, r) {
    return Math.atan(w / (2 * Math.sqrt(r ** 2 - (w / 2) ** 2)))
  }

  function calculateMacePoints({ r1, r2, wl, pointCount = 50 }) {
    const pointsOnMaceStart = [
      [thetaBy2(wl, r2), r2],
      [thetaBy2(wl, r1), r1],
    ];

    const pointsOnMaceEnd = [
      [2 * Math.PI - thetaBy2(wl, r1), r1],
      [2 * Math.PI - thetaBy2(wl, r2), r2],
      [thetaBy2(wl, r2), r2],
    ];

    const extraPointsOnCircleCount = pointCount;

    const extraPointsOnCircle = [];
    const extraPointStartAngle = thetaBy2(wl, r1);
    const extraPointEndAngle = 2 * Math.PI - extraPointStartAngle;

    const angleDiff = extraPointEndAngle - extraPointStartAngle;
    const angleDelta = angleDiff / extraPointsOnCircleCount;

    for (let i = 1; i < extraPointsOnCircleCount; i++) {
      extraPointsOnCircle.push([extraPointStartAngle + i * angleDelta, r1]);
    }

    const allPointsOfMace = [
      ...pointsOnMaceStart,
      ...extraPointsOnCircle,
      ...pointsOnMaceEnd,
    ];
    return allPointsOfMace
  }

  // input
  // stick start, end coordinates: x1, y1, x2, y2
  // ball radius, stickWidth
  function maceShape({ x1, y1, x2, y2, circleRadius, stickWidth }) {
    const stickLength = distanceInPoints({ x1, y1, x2, y2 });
    const r1 = circleRadius;
    // to be able to check if r2 is smaller than r1
    const r2Pre = stickRadius(stickWidth, stickLength);
    const r2 = r2Pre < r1 ? r1 : r2Pre;

    const macePoints = calculateMacePoints({ r1, r2, wl: stickWidth });
    return macePoints
  }

  function pointsToRotationAngle({ x1, y1, x2, y2 }) {
    const slopeTheta = (Math.atan((y1 - y2) / (x1 - x2)) * 180) / Math.PI;

    const rotationAngle = x2 - x1 > 0 ? slopeTheta - 90 : slopeTheta + 90;
    return rotationAngle
  }

  /* global window */

  function applyInteractionStyles$1({ activeOpacity, inactiveOpacity }) {
    d3__namespace.select('body').append('style').html(`
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
  `);
  }

  function setupChartArea$1({
    chartContainerSelector,
    coreChartWidth,
    aspectRatio,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    bgColor,
  }) {
    const coreChartHeight = coreChartWidth / aspectRatio;

    const viewBoxHeight = coreChartHeight + marginTop + marginBottom;
    const viewBoxWidth = coreChartWidth + marginLeft + marginRight;

    const chartParent = d3__namespace.select(chartContainerSelector);

    const widgets = chartParent
      .append('div')
      .attr(
        'style',
        'display: flex; justify-content: space-between; padding-bottom: 0.5rem;',
      );
    const widgetsLeft = widgets
      .append('div')
      .attr('style', 'display: flex; align-items: end; column-gap: 5px;');
    const widgetsRight = widgets
      .append('div')
      .attr('style', 'display: flex; align-items: center; column-gap: 10px;');

    const svg = chartParent
      .append('svg')
      .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
      .style('background', bgColor);

    const allComponents = svg.append('g').attr('class', 'all-components');

    const chartCore = allComponents
      .append('g')
      .attr('transform', `translate(${marginLeft}, ${marginTop})`);

    return {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      widgetsRight,
    }
  }

  function initializeTooltip$1() {
    return d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      )
  }

  function parseData$1({
    data,
    xFieldStart,
    xFieldEnd,
    yFieldStart,
    yFieldEnd,
    sizeField,
  }) {
    return data
      .map(el => {
        const elParsed = { ...el };
        elParsed[xFieldStart] = Number.parseFloat(el[xFieldStart]);
        elParsed[xFieldEnd] = Number.parseFloat(el[xFieldEnd]);
        elParsed[yFieldStart] = Number.parseFloat(el[yFieldStart]);
        elParsed[yFieldEnd] = Number.parseFloat(el[yFieldEnd]);
        elParsed[sizeField] = Number.parseFloat(el[sizeField]);
        elParsed.slope =
          (elParsed[yFieldEnd] - elParsed[yFieldStart]) /
          (elParsed[xFieldEnd] - elParsed[xFieldStart]);
        return elParsed
      })
      .filter(d => !Number.isNaN(d.slope))
  }

  function setupScales$1({
    dataParsed,
    coreChartHeight,
    coreChartWidth,
    yFieldStart,
    yFieldEnd,
    xFieldStart,
    xFieldEnd,
    xScaleType,
    xScaleLogBase,
    sizeField,
    circleSizeRange,
    lineWidthRange,
    sameDirectionColor,
    oppositeDirectionColor,
  }) {
    const yDomainStart = dataParsed.map(el => Number.parseFloat(el[yFieldStart]));
    const yDomainEnd = dataParsed.map(el => Number.parseFloat(el[yFieldEnd]));
    const yDomain = d3__namespace.extent([...yDomainStart, ...yDomainEnd]);
    const yScale = d3__namespace
      .scaleLinear()
      .range([coreChartHeight, 0])
      .domain(yDomain)
      .nice();

    const xDomainStart = dataParsed.map(el => Number.parseFloat(el[xFieldStart]));
    const xDomainEnd = dataParsed.map(el => Number.parseFloat(el[xFieldEnd]));
    const xDomain = d3__namespace.extent([...xDomainStart, ...xDomainEnd]);
    const xScale =
      xScaleType === 'log'
        ? d3__namespace
            .scaleLog()
            .base(xScaleLogBase || 10)
            .range([0, coreChartWidth])
            .domain(xDomain)
            .nice()
        : d3__namespace.scaleLinear().range([0, coreChartWidth]).domain(xDomain).nice();

    const sizeMax = d3__namespace.max(dataParsed.map(el => el[sizeField]));

    const circleSizeScale = d3__namespace
      .scaleSqrt()
      .range(circleSizeRange)
      .domain([0, sizeMax]);

    const lineWidthScale = d3__namespace
      .scaleSqrt()
      .range(lineWidthRange)
      .domain([0, sizeMax]);

    const colorScale = slope =>
      slope > 0 ? sameDirectionColor : oppositeDirectionColor;

    return { yScale, xScale, circleSizeScale, lineWidthScale, colorScale }
  }

  function renderSizeLegend({
    gapInCircles,
    circleSizeScale,
    widgetsRight,
    sizeLegendMoveSizeObjectDownBy,
    sizeLegendValues,
    sizeValueFormatter,
    sizeLegendTitle,
  }) {
    const sizeValues = sizeLegendValues.map(a => circleSizeScale(a));

    let cumulativeSize = 0;
    const cumulativeSizes = [];
    sizeValues.forEach((sz, i) => {
      if (i === 0) {
        cumulativeSize += sz;
      } else {
        cumulativeSize += sizeValues[i - 1] + sizeValues[i];
      }

      cumulativeSizes.push(cumulativeSize);
    });

    const sizeLegend = widgetsRight.append('svg');
    const sizeLegendContainerGroup = sizeLegend.append('g');

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
      .attr('cy', sizeValues[sizeValues.length - 1] + 1);

    sizeLegendContainerGroup
      .selectAll('.g-size-circle')
      .append('text')
      .attr('alignment-baseline', 'middle')
      .attr('dy', sizeValues[sizeValues.length - 1] + 2)
      .attr('dx', (d, i) => d + cumulativeSizes[i] + (i + 0.1) * gapInCircles)
      .style('font-size', 8)
      .text((d, i) => formatNumber(sizeLegendValues[i], sizeValueFormatter));

    sizeLegendContainerGroup
      .append('text')
      .attr('alignment-baseline', 'hanging')
      .style('font-size', 10)
      .style('font-weight', 600)
      .text(sizeLegendTitle);

    const sizeLegendBoundingBox = sizeLegendContainerGroup.node().getBBox();
    sizeLegend
      .attr('height', sizeLegendBoundingBox.height)
      .attr('width', sizeLegendBoundingBox.width);
  }
  function renderXAxis$1({
    chartCore,
    coreChartHeight,
    coreChartWidth,
    xScale,
    xAxisTickValues,
    xAxisTitle,
  }) {
    const xAxis = chartCore
      .append('g')
      .attr('class', 'x-axis-bottom')
      .attr('transform', `translate(0, ${coreChartHeight + 30})`);
    xAxis.call(
      xAxisTickValues
        ? d3__namespace.axisBottom(xScale).tickValues(xAxisTickValues)
        : d3__namespace.axisBottom(xScale),
    );

    xAxis
      .append('g')
      .append('text')
      .attr('class', 'text-xs font-semibold tracking-wider')
      .text(xAxisTitle)
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${coreChartWidth / 2}, 30)`);
  }

  function renderYAxis({ chartCore, coreChartWidth, yScale, yAxisTitle }) {
    const yAxis = chartCore
      .append('g')
      .attr('class', 'text-xs y-axis-right')
      .attr('transform', `translate(${coreChartWidth}, 0)`);
    yAxis
      .call(d3__namespace.axisRight(yScale).ticks(5).tickSize(-coreChartWidth))
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))
      .call(g => g.select('.domain').remove());

    yAxis
      .append('g')
      .append('text')
      .attr('class', 'font-semibold tracking-wider')
      .text(yAxisTitle)
      .attr('fill', '#333')
      .attr('text-anchor', 'end')
      .attr('transform', 'translate(8, -20)');
  }

  function renderColorLegend({
    stickHeight,
    stickLength,
    ballRadius,
    gapForText,
    singleMaceSectionHeight,
    widgetsRight,
    sameDirectionColor,
    oppositeDirectionColor,
  }) {
    const colorLegend = widgetsRight.append('svg');
    const colorLegendMain = colorLegend
      .append('g')
      .attr('class', 'color-legend cursor-pointer')
      .attr(
        'transform',
        `translate(0, ${-(singleMaceSectionHeight - ballRadius)})`,
      ); // 20-6
    const colorLegendSame = colorLegendMain
      .append('g')
      .attr('transform', `translate(0, ${singleMaceSectionHeight})`)
      .attr('fill', sameDirectionColor)
      .attr('class', 'mace mace-same')
      .on('click', e => {
        const parentLegend = d3__namespace.select(e.target.parentNode);
        const legendState = parentLegend.classed('mace-active');
        d3__namespace.selectAll('.mace-same').classed('mace-active', !legendState);
      });
    colorLegendSame
      .append('circle')
      .attr('cx', ballRadius + stickLength)
      .attr('r', ballRadius);
    colorLegendSame
      .append('rect')
      .attr('width', stickLength)
      .attr('height', stickHeight)
      .attr('y', -stickHeight / 2);
    colorLegendSame
      .append('text')
      .text('Moving in the same direction')
      .style('font-size', 10)
      .style('font-weight', 600)
      .attr(
        'transform',
        `translate(${stickLength + ballRadius * 2 + gapForText}, 0)`,
      )
      .attr('alignment-baseline', 'middle');
    const colorLegendOpposite = colorLegendMain
      .append('g')
      .attr('transform', `translate(0, ${singleMaceSectionHeight * 2})`)
      .attr('fill', oppositeDirectionColor)
      .attr('class', 'mace mace-opposite')
      .on('click', e => {
        const parentLegend = d3__namespace.select(e.target.parentNode);
        const legendState = parentLegend.classed('mace-active');
        d3__namespace.selectAll('.mace-opposite').classed('mace-active', !legendState);
      });
    colorLegendOpposite
      .append('circle')
      .attr('cx', ballRadius + stickLength)
      .attr('r', ballRadius);
    colorLegendOpposite
      .append('rect')
      .attr('width', stickLength)
      .attr('height', stickHeight)
      .attr('y', -stickHeight / 2);
    colorLegendOpposite
      .append('text')
      .text('Moving in the opposite direction')
      .style('font-size', 10)
      .style('font-weight', 600)
      .attr(
        'transform',
        `translate(${stickLength + ballRadius * 2 + gapForText}, 0)`,
      )
      .attr('alignment-baseline', 'middle');
    const legendBoundingBox = colorLegendMain.node().getBBox();
    colorLegend
      .attr('height', legendBoundingBox.height)
      .attr('width', legendBoundingBox.width);
  }

  function renderMaces({
    chartCore,
    dataParsed,
    sizeField,
    nameField,
    defaultStateAll,
    xFieldStart,
    xFieldEnd,
    xScale,
    yScale,
    yFieldStart,
    yFieldEnd,
    circleSizeScale,
    lineWidthScale,
    colorScale,
    tooltipDiv,
    sizeValueFormatter,
    xValueFormatter,
    yValueFormatter,
    xFieldType,
    yFieldType,
  }) {
    const cGroup = chartCore
      .append('g')
      .attr('class', 'maces')
      //  ${_.isEmpty(defaultStateAll) ? '' : 'default'}`)
      .selectAll('g')
      .data(dataParsed)
      .join('g')
      .sort((a, b) => d3__namespace.descending(a[sizeField], b[sizeField]))
      .attr(
        'class',
        d =>
          `mace
        ${d.slope >= 0 ? 'mace-same' : 'mace-opposite'}
        mace-${toClassText(d[nameField])}
        ${defaultStateAll.includes(d[nameField]) ? 'mace-active' : ''}`,
      )
      .on('click', e => {
        const parentMace = d3__namespace.select(e.target.parentNode);
        const clickedState = parentMace.classed('mace-active');
        parentMace.classed('mace-active', !clickedState);
      });

    cGroup
      .append('path')
      .attr('d', d => {
        const x1 = xScale(d[xFieldStart]);
        const y1 = yScale(d[yFieldStart]);
        const x2 = xScale(d[xFieldEnd]);
        const y2 = yScale(d[yFieldEnd]);
        const circleRadius = circleSizeScale(d[sizeField]);
        const stickWidth = lineWidthScale(d[sizeField]);
        const macePoints = maceShape({
          x1,
          y1,
          x2,
          y2,
          circleRadius,
          stickWidth,
        });
        return d3__namespace.lineRadial()(macePoints)
      })
      .attr('transform', d => {
        const x1 = xScale(d[xFieldStart]);
        const y1 = yScale(d[yFieldStart]);
        const x2 = xScale(d[xFieldEnd]);
        const y2 = yScale(d[yFieldEnd]);
        const rotationAngle = pointsToRotationAngle({ x1, y1, x2, y2 });
        return `translate(${x2}, ${y2}) rotate(${rotationAngle})`
      })
      .attr('fill', d => colorScale(d.slope))
      .attr('stroke-linecap', 'square');

    cGroup
      .on('mouseover', (e, d) => {
        d3__namespace.select(e.target.parentNode).classed('mace-hovered', true);

        tooltipDiv.transition().duration(200).style('opacity', 1);

        const sizeFieldValue = formatNumber(d[sizeField], sizeValueFormatter);
        const xFieldStartValue = formatNumber(d[xFieldStart], xValueFormatter);
        const xFieldEndValue = formatNumber(d[xFieldEnd], xValueFormatter);
        const yFieldStartValue = formatNumber(d[yFieldStart], yValueFormatter);
        const yFieldEndValue = formatNumber(d[yFieldEnd], yValueFormatter);

        tooltipDiv.html(
          `${d[nameField]}
        <br/>
        ${xFieldType}: ${xFieldStartValue} → ${xFieldEndValue}
        <br />
        ${yFieldType}: ${yFieldStartValue} → ${yFieldEndValue}
        <br />
        ${___default["default"].capitalize(sizeField)}: ${sizeFieldValue}
        `,
        );
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', e => {
        d3__namespace.select(e.target.parentNode).classed('mace-hovered', false);
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });
  }
  const searchEventHandler$1 = referenceList => qstr => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        // d3.selectAll('.mace').classed('mace-active', false)
        const maceName = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          d3__namespace.select(`.mace-${maceName}`).classed('mace-matched', true);
        } else {
          d3__namespace.select(`.mace-${maceName}`).classed('mace-matched', false);
        }
        d3__namespace.select('.maces').classed('searching', true);
      });
    } else {
      referenceList.forEach(val => {
        const maceName = toClassText(val);
        d3__namespace.select(`.mace-${maceName}`).classed('mace-matched', false);
      });
      d3__namespace.select('.maces').classed('searching', false);
    }
  };

  function setupSearch$1({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    nameField,
  }) {
    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);
    // TODO: refactor hidden, won't be needed if we add this node
    search.attr('placeholder', `Find by ${nameField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr);
    });
    return search
  }

  function setupInitialStateButton$1({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
  }) {
    const goToInitialState = widgetsLeft
      .append('button')
      .text('Go to Initial State')
      .attr('class', goToInitialStateButtonClassNames);
    goToInitialState.classed('hidden', false);
    goToInitialState.on('click', () => {
      d3__namespace.selectAll('.mace').classed('mace-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        d3__namespace.select(`.mace-${toClassText(val)}`).classed('mace-active', true);
      });
      search.node().value = '';
      handleSearch('');
    });
  }

  function setupClearAllButton$1({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
  }) {
    const clearAll = widgetsLeft
      .append('button')
      .text('Clear All')
      .attr('class', clearAllButtonClassNames);
    clearAll.classed('hidden', false);
    clearAll.on('click', () => {
      d3__namespace.selectAll('.mace').classed('mace-active', false);
      search.node().value = '';
      handleSearch('');
    });
  }

  function renderChart$2({
    data,
    options: {
      aspectRatio = 2,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      oppositeDirectionColor = '#ee4e34',
      sameDirectionColor = '#44a8c1',

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

      xAxisTickValues,

      xScaleType = 'linear', // linear or log
      xScaleLogBase = 10, // applicable only if log scale

      defaultState = [],

      activeOpacity = 0.8, // click, hover, search
      inactiveOpacity = 0.2,

      circleSizeRange = [5, 30],
      lineWidthRange = [2, 4],

      searchInputClassNames = '',
      goToInitialStateButtonClassNames = '',
      clearAllButtonClassNames = '',

      xFieldType = `${xFieldStart} → ${xFieldEnd}`,
      yFieldType = `${yFieldStart} → ${yFieldEnd}`,
    },
    dimensions: {
      xFieldStart,
      xFieldEnd,
      yFieldStart,
      yFieldEnd,
      sizeField,
      nameField,
    },
    chartContainerSelector,
  }) {
    applyInteractionStyles$1({ activeOpacity, inactiveOpacity });

    const coreChartWidth = 1000;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      widgetsRight,
    } = setupChartArea$1({
      chartContainerSelector,
      coreChartWidth,
      aspectRatio,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      bgColor,
    });

    const tooltipDiv = initializeTooltip$1();

    const dataParsed = parseData$1({
      data,
      xFieldStart,
      xFieldEnd,
      yFieldStart,
      yFieldEnd,
      sizeField,
    });

    const { yScale, xScale, circleSizeScale, lineWidthScale, colorScale } =
      setupScales$1({
        dataParsed,
        coreChartHeight,
        coreChartWidth,
        yFieldStart,
        yFieldEnd,
        xFieldStart,
        xFieldEnd,
        xScaleType,
        xScaleLogBase,
        sizeField,
        circleSizeRange,
        lineWidthRange,
        sameDirectionColor,
        oppositeDirectionColor,
      });

    const nameValues = ___default["default"](data).map(nameField).uniq().value();
    const defaultStateAll = defaultState === 'All' ? nameValues : defaultState;

    const gapInCircles = 30;
    renderSizeLegend({
      gapInCircles,
      circleSizeScale,
      widgetsRight,
      sizeLegendMoveSizeObjectDownBy,
      sizeLegendValues,
      sizeValueFormatter,
      sizeLegendTitle,
    });

    const stickHeight = 3;
    const stickLength = 30;
    const stickWidthLegend = 1;
    const ballRadius = 6;
    const gapForText = 5;
    const singleMaceSectionHeight = 20;

    renderColorLegend({
      stickHeight,
      stickLength,
      ballRadius,
      gapForText,
      singleMaceSectionHeight,
      widgetsRight,
      sameDirectionColor,
      oppositeDirectionColor,
    });

    renderDirectionLegend({
      selection: widgetsRight.append('svg'),
      ballRadius,
      stickLength,
      stickWidthLegend,
      gapForText,
      directionStartLabel,
      directionEndLabel,
    });

    renderXAxis$1({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      xScale,
      xAxisTickValues,
      xAxisTitle,
    });

    // y-axis
    renderYAxis({ chartCore, coreChartWidth, yScale, yAxisTitle });

    renderMaces({
      chartCore,
      dataParsed,
      sizeField,
      nameField,
      defaultStateAll,
      xFieldStart,
      xFieldEnd,
      xScale,
      yScale,
      yFieldStart,
      yFieldEnd,
      circleSizeScale,
      lineWidthScale,
      colorScale,
      tooltipDiv,
      sizeValueFormatter,
      xValueFormatter,
      yValueFormatter,
      xFieldType,
      yFieldType,
    });

    // searchEventHandler is a higher order function that returns a function based on referenceList (here nameValues)
    // handleSearch accepts search query string and applied appropriate
    const handleSearch = searchEventHandler$1(nameValues);
    const search = setupSearch$1({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      nameField,
    });

    setupInitialStateButton$1({
      widgetsLeft,
      goToInitialStateButtonClassNames,
      defaultStateAll,
      search,
      handleSearch,
    });
    setupClearAllButton$1({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
    });

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  const validateData = ({ data, dimensionTypes, dimensions }) => {
    const dataValidations = {};
    ___default["default"].forEach(dimensionTypes, (valFuncs, dim) => {
      ___default["default"].forEach(valFuncs, valFunc => {
        const { valid, message } = valFunc({ data, dimensions, dim });
        if (!valid) {
          const vaidationObject = {
            validation: valFunc.name,
            status: valid,
            message,
          };
          if (dataValidations[dimensions[dim]]) {
            dataValidations[dimensions[dim]].push(vaidationObject);
          } else {
            dataValidations[dimensions[dim]] = [vaidationObject];
          }
        }
      });
    });
    if (___default["default"].isEmpty(dataValidations)) return { valid: true, message: '' }
    let messageReadable = 'Data Validation Errors </br>';
    ___default["default"].mapKeys(dataValidations, (val, key) => {
      const msgDetails = ___default["default"].map(
        val,
        val_ =>
          `</br>&nbsp;&nbsp;&nbsp;${val_.validation} : row numbers - ${___default["default"].map(
          val_.message,
          'rowNumber',
        ).join(', ')} | values - ${___default["default"].map(val_.message, key).join(', ')}`,
      ).join('');
      messageReadable += `${key} : ${msgDetails}</br>`;
    });
    return { valid: false, message: messageReadable }
  };

  const shouldBeNumber = ({ data, dimensions, dim }) => {
    const invalidRows = ___default["default"].filter(data, (row, i) => {
      // eslint-disable-next-line no-param-reassign
      row.rowNumber = i + 1;
      return Number.isNaN(Number(row[dimensions[dim]]))
    });

    if (___default["default"].isEmpty(invalidRows)) return { valid: true, message: '' }

    return { valid: false, message: invalidRows }
  };

  const shouldBeUnique = ({ data, dimensions, dim }) => {
    // return true if valid number, false if not a valid number
    const duplicates = ___default["default"](data)
      .countBy(dimensions[dim])
      .pickBy(val => val > 1)
      .keys()
      .value();

    const duplicateRows = ___default["default"].filter(data, (row, i) => {
      // eslint-disable-next-line no-param-reassign
      row.rowNumber = i + 1;
      return ___default["default"].includes(duplicates, row[dimensions[dim]])
    });

    if (___default["default"].isEmpty(duplicates)) return { valid: true, message: '' }

    return { valid: false, message: duplicateRows }
  };

  const shouldNotBeBlank = ({ data, dimensions, dim }) => {
    const invalidRows = ___default["default"].filter(data, (row, i) => {
      // eslint-disable-next-line no-param-reassign
      row.rowNumber = i + 1;
      return ___default["default"].isEmpty(row[dimensions[dim]])
    });

    if (___default["default"].isEmpty(invalidRows)) return { valid: true, message: '' }

    return { valid: false, message: invalidRows }
  };

  const optionValidation = ({ optionTypes, options }) => {
    const optionValidations = [];
    ___default["default"].each(optionTypes, (fn, key) => {
      const result = fn(options[key]);
      // Ignore options key if undefined,
      // because all options have a default value inside the chart
      if (!result.valid && typeof options[key] !== 'undefined') {
        optionValidations.push({
          keyValue: `${key}: ${options[key]}`,
          message: result.message,
        });
      }
    });

    const combinedOptionValidations = { valid: true, message: '' };

    optionValidations.forEach(result => {
      if (!result.valid) {
        combinedOptionValidations.message += `&nbsp;&nbsp;&nbsp;${result.keyValue} - ${result.message}<br/>`;
        combinedOptionValidations.valid = false;
      }
    });
    combinedOptionValidations.message = `Config option validation errors: <br/> ${combinedOptionValidations.message}`;
    return combinedOptionValidations
  };

  // To check options
  const checkOneOf = refArr => val => {
    const valid = refArr.includes(val);
    if (valid) {
      return { valid: true }
    }
    return { valid: false, message: `Should be one of: ${refArr.join(', ')}` }
  };

  const checkNumber = val => {
    const valid = !Number.isNaN(Number(val));
    if (valid) {
      return { valid: true }
    }
    return { valid: false, message: 'Should be a valid number' }
  };

  const checkNumberBetween = refArr => val => {
    const min = Math.min(...refArr);
    const max = Math.max(...refArr);
    const message = `Should be a number between ${min} and ${max}`;
    const checkNumberResult = checkNumber(val);
    if (!checkNumberResult.valid) {
      return { valid: false, message }
    }
    const parsedNumber = Number(val);
    if (parsedNumber >= min && parsedNumber <= max) {
      return { valid: true }
    }
    return { valid: false, message }
  };

  const checkColor = val => {
    const result = { valid: true, message: '' };

    if (val === 'transparent') return result

    const parsedColor = d3__namespace.rgb(val);

    ___default["default"].forEach(parsedColor, function (value) {
      result.valid = result.valid && !___default["default"].isNaN(value);
    });

    if (!result.valid) {
      result.message = `Invalid color: ${val}`;
    }
    return result
  };

  const checkColorArray = length => arr => {
    const checkColorsResult = arr.map(clr => checkColor(clr));
    const lengthValidationResult = { valid: true, message: '' };
    if (length && arr.length < length) {
      lengthValidationResult.valid = false;
      lengthValidationResult.message = `Need atleast ${length} colors`;
    }

    const checkAllResults = [...checkColorsResult, lengthValidationResult];

    const combinedResult = { valid: true, message: '' };

    checkAllResults.forEach(result => {
      if (!result.valid) {
        combinedResult.message += `<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${result.message}`;
        combinedResult.valid = false;
      }
    });

    return combinedResult
  };

  // TODO: add length feature as in checkColorArray
  const checkNumericArray = val => {
    const valid =
      ___default["default"].isArray(val) &&
      ___default["default"].reduce(
        val,
        (isNumber, val_) => {
          return isNumber && !Number.isNaN(Number(val_))
        },
        true,
      );
    if (valid) {
      return { valid: true }
    }
    return { valid: false, message: 'Should be a valid array of numbers' }
  };

  const checkDefaultState = val => {
    if (___default["default"].isArray(val) || val === 'All') {
      return { valid: true }
    }
    return { valid: false, message: 'Should be a valid array or "All"' }
  };

  function validateColumnsWithDimensions({ columns, dimensions }) {
    // 1. dimensions is an empty object
    // Object.keys(dimensions).length
    if (___default["default"].isEmpty(dimensions)) {
      return { valid: false, message: 'No dimensions provided.' }
    }
    const parsedDimensions = {};
    ___default["default"].each(dimensions, (val, key) => {
      if (___default["default"].isArray(val)) {
        val.forEach((v, i) => {
          parsedDimensions[`${key}[${i}]`] = v;
        });
      } else {
        parsedDimensions[key] = val;
      }
    });
    const result = { valid: true, missingFields: [], message: '' };
    ___default["default"].each(parsedDimensions, (val, key) => {
      const exists = ___default["default"].includes(columns, val);
      result.valid = result.valid && exists;
      if (!exists) {
        result.missingFields.push(`{${key}: '${val}'}`);
      }
    });
    if (!result.valid) {
      result.message = `These dimensions/columns are missing in the data: ${result.missingFields.join(
      ', ',
    )}`;
    }
    return result
  }

  // TODO: adapt for removal of tailwind classes
  function showErrors(svgParentNodeSelector, errorMessages) {
    d3__namespace.select('.config-error-display').remove();
    if (___default["default"].isEmpty(errorMessages)) {
      return
    }
    d3__namespace.select(svgParentNodeSelector)
      .append('div')
      .attr('class', 'text-red-500 config-error-display')
      .html(
        `<p>Errors:</p>
      <ul class="list-disc"><li>${errorMessages.join('</li><li>')}</li></ul>`,
      );
  }

  // export function that

  const dimensionTypes$2 = {
    xFieldStart: [shouldBeNumber],
    xFieldEnd: [shouldBeNumber],
    yFieldStart: [shouldBeNumber],
    yFieldEnd: [shouldBeNumber],
    sizeField: [shouldBeNumber],
    nameField: [shouldNotBeBlank, shouldBeUnique],
  };

  const optionTypes$2 = {
    /* Headers */
    // heading: checkString,
    // subheading: checkString,

    /* Chart Area */
    containerWidth: checkOneOf([
      'max-w-screen-sm',
      'max-w-screen-md',
      'max-w-screen-lg',
      'max-w-screen-xl',
      'max-w-screen-2xl',
      'max-w-full',
    ]),
    aspectRatio: checkNumberBetween([0, Number.POSITIVE_INFINITY]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    // xAxisTitle: checkString,
    // xFieldType: checkString,
    xAxisTickValues: checkNumericArray, // comment this for automatic tick values
    xScaleType: checkOneOf(['log', 'linear']), // linear or log
    xScaleLogBase: checkNumber, // can be any number greater than 0: TODO?

    // yAxisTitle: checkString,
    // yFieldType: checkString,

    sizeLegendValues: checkNumericArray,
    sizeLegendMoveSizeObjectDownBy: checkNumber,
    // sizeLegendTitle: checkString,

    oppositeDirectionColor: checkColor,
    sameDirectionColor: checkColor,
    // directionStartLabel: checkString,
    // directionEndLabel: checkString,

    defaultState: checkDefaultState,

    activeOpacity: checkNumberBetween([0, 1]),
    inactiveOpacity: checkNumberBetween([0, 1]),
  };

  const validateAndRender$2 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$2, options });

    d3__namespace.csv(dataPath).then(data => {
      // Run validations
      const { columns } = data;
      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$2, dimensions });

      // When new validations are added simply add the result to this array
      // When building a new validator the output should be of format:
      // {valid: boolean, message: string}
      const allValidations = [
        dimensionValidation,
        dataValidations,
        optionsValidationResult,
      ];

      const combinedValidation = { valid: true, messages: [] };

      allValidations.forEach(v => {
        combinedValidation.valid = combinedValidation.valid && v.valid;
        if (!v.valid) {
          combinedValidation.messages.push(v.message);
        }
      });

      combinedValidation.valid
        ? renderChart$2({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);

      // eslint-disable-next-line no-console
      // console.log({ combinedValidation })
    });
  };

  /* eslint-disable no-import-assign */

  // Done this so as to keep the ESM and UMD global interoperable
  // Mimics behaviour of d3 UMD (sankey can be used as d3.sankey, so it should be usable here as d3.sankey too)
  // TODO: test this when doing an ESM with bundler demo
  // d3_ to prevent rollup error: "Illegal reassignment to import 'd3'"

  const d3 = d3__namespace;

  d3.sankey = d3Sankey.sankey;
  d3.sankeyCenter = d3Sankey.sankeyCenter;
  d3.sankeyLeft = d3Sankey.sankeyLeft;
  d3.sankeyJustify = d3Sankey.sankeyJustify;
  d3.sankeyRight = d3Sankey.sankeyRight;

  const alignOptions = {
    justify: 'sankeyJustify',
    left: 'sankeyLeft',
    right: 'sankeyRight',
    center: 'sankeyCenter',
  };

  function renderChart$1({
    data,
    options: {
      aspectRatio = 2,

      marginTop = 10,
      marginRight = 0,
      marginBottom = 10,
      marginLeft = 50,

      bgColor = 'transparent',

      align = 'justify',

      verticalGapInNodes = 10,
      nodeWidth = 20,

      units = '',
      format = '',

      searchInputClassNames = '',
    },
    dimensions: { sourceField, targetField, valueField },

    chartContainerSelector,
  }) {

    const formatLinkThicknessValue = (val, unit) => {
      const formatter = d3.format(format);
      return unit ? `${formatter(val)} ${unit}` : formatter(val)
    };

    const chosenAlign = alignOptions[align];

    // apply interaction styles
    d3.select('body').append('style').html(`
    .sankey-nodes.hovering g:not(.active) * {
      opacity: 0.1;
    }
    .sankey-links.hovering g:not(.active) {
      opacity: 0.1;
    }
    
    .sankey-nodes.searching:not(.hovering) g:not(.node-matched) {
      opacity: 0.1;
    }
    .sankey-links.searching:not(.hovering) g:not(.node-matched) > path {
      opacity: 0.1;
    }`);

    const coreChartWidth = 1000;

    const coreChartHeight = coreChartWidth / aspectRatio;

    const viewBoxHeight = coreChartHeight + marginTop + marginBottom;
    const viewBoxWidth = coreChartWidth + marginLeft + marginRight;

    const chartParent = d3.select(chartContainerSelector);

    const widgets = chartParent
      .append('div')
      .attr(
        'style',
        'display: flex; justify-content: space-between; padding-bottom: 0.5rem;',
      );
    const widgetsLeft = widgets
      .append('div')
      .attr('style', 'display: flex; align-items: end; column-gap: 5px;');

    const svg = chartParent
      .append('svg')
      .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
      .style('background', bgColor);

    const allComponents = svg.append('g').attr('class', 'all-components');

    const chartCore = allComponents
      .append('g')
      .attr('transform', `translate(${marginLeft}, ${marginTop})`);

    const tooltipDiv = d3
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      );

    const colorScheme = d3.scaleOrdinal(d3.schemeCategory10);

    // Sankey data is a list of links (source, target and thickness value of each link)
    const links = data.map(d => ({
      source: d[sourceField],
      target: d[targetField],
      value: d[valueField],
    }));

    // Extract all unique nodes (sources and targets) from list of links
    const nodes = [...new Set(links.flatMap(l => [l.source, l.target]))].map(
      name => ({
        name,
        category: name.replace(/ .*/, ''),
      }),
    );

    const sankeyGenerator = d3
      .sankey()
      .nodeId(d => d.name)
      .nodeAlign(d3[chosenAlign])
      .nodeWidth(nodeWidth)
      .nodePadding(verticalGapInNodes)
      // space taken up by sankey diagram
      .extent([
        [0, 0],
        [coreChartWidth, coreChartHeight],
      ]);

    const sankeyfied = sankeyGenerator({
      nodes,
      links,
      units,
    });

    const colorScale = d =>
      colorScheme(d.category === undefined ? d.name : d.category);

    function getConnections(o, direction) {
      return o.source && o.target
        ? getConnectionsLink(o, direction)
        : getConnectionsNode(o, direction)
    }

    function getConnectionsLink(o, direction = 'both') {
      let connections = [o];

      if (direction === 'source' || direction === 'both') {
        connections = [...connections, ...getConnectionsNode(o.source, 'source')];
      }
      if (direction === 'target' || direction === 'both') {
        connections = [...connections, ...getConnectionsNode(o.target, 'target')];
      }

      return connections
    }

    function getConnectionsNode(o, direction = 'both') {
      let connections = [o];

      if (direction === 'source' || direction === 'both') {
        o.targetLinks.forEach(function (p) {
          connections = [...connections, ...getConnectionsLink(p, direction)];
        });
      }
      if (direction === 'target' || direction === 'both') {
        o.sourceLinks.forEach(function (p) {
          connections = [...connections, ...getConnectionsLink(p, direction)];
        });
      }

      return connections
    }

    const link = chartCore
      .append('g')
      .attr('class', 'sankey-links')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.5)
      .selectAll('g')
      .data(sankeyfied.links)
      .join('g')
      .attr('class', 'sankey-link')
      .attr('id', d => `iv-link-${d.index}`)
      .style('mix-blend-mode', 'multiply')
      .on('mouseover', (e, thisNode) => {
        const sel = [thisNode];
        sel.forEach(function (o) {
          getConnections(o).forEach(function (p) {
            sel.push(p);
          });
        });

        d3.select('.sankey-nodes').classed('hovering', true);
        d3.select('.sankey-links').classed('hovering', true);

        sel.forEach(item => {
          // if sel item is a link
          if (item.source && item.target) {
            d3.select(`#iv-link-${item.index}`).classed('active', true);
          } else {
            // else item is a node
            d3.select(`#iv-node-${item.index}`).classed('active', true);
          }
        });

        tooltipDiv.transition().duration(200).style('opacity', 1);
        tooltipDiv.html(
          `${thisNode.source.name} → ${
          thisNode.target.name
        }<br />${formatLinkThicknessValue(thisNode.value, units)} `,
        );
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', (e, thisNode) => {
        const sel = [thisNode];
        sel.forEach(function (o) {
          getConnections(o).forEach(function (p) {
            sel.push(p);
          });
        });

        d3.select('.sankey-nodes').classed('hovering', false);
        d3.select('.sankey-links').classed('hovering', false);

        sel.forEach(item => {
          // if sel item is a link
          if (item.source && item.target) {
            d3.select(`#iv-link-${item.index}`).classed('active', false);
          } else {
            // else item is a node
            d3.select(`#iv-node-${item.index}`).classed('active', false);
          }
        });
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });

    {
      const gradient = link
        .append('linearGradient')
        .attr('id', d => `iv-link-gradient-${d.index}`);

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d => colorScale(d.source));

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d => colorScale(d.target));
    }

    link
      .append('path')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', d => {
        return `url(#iv-link-gradient-${d.index})`
      })
      .attr('stroke-width', d => Math.max(1, d.width))
      .attr('stroke-opacity', 0.5);

    const node = chartCore
      .append('g')
      // .attr("stroke", "#0004")
      .attr('class', 'sankey-nodes')
      .selectAll('g')
      .data(sankeyfied.nodes)
      .join('g')
      .attr('class', 'sankey-node')
      .attr('id', d => `iv-node-${d.index}`);

    node
      .append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => colorScale(d))
      .on('mouseover', (e, thisNode) => {
        const sel = [thisNode];
        sel.forEach(function (o) {
          getConnections(o).forEach(function (p) {
            sel.push(p);
          });
        });

        d3.select('.sankey-nodes').classed('hovering', true);
        d3.select('.sankey-links').classed('hovering', true);

        sel.forEach(item => {
          // if sel item is a link
          if (item.source && item.target) {
            d3.select(`#iv-link-${item.index}`).classed('active', true);
          } else {
            // else item is a node
            d3.select(`#iv-node-${item.index}`).classed('active', true);
          }
        });

        tooltipDiv.transition().duration(200).style('opacity', 1);
        tooltipDiv.html(
          `${thisNode.name}<br />${formatLinkThicknessValue(
          thisNode.value,
          units,
        )}`,
        );
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', (e, thisNode) => {
        const sel = [thisNode];
        sel.forEach(function (o) {
          getConnections(o).forEach(function (p) {
            sel.push(p);
          });
        });

        d3.select('.sankey-nodes').classed('hovering', false);
        d3.select('.sankey-links').classed('hovering', false);

        sel.forEach(item => {
          // if sel item is a link
          if (item.source && item.target) {
            d3.select(`#iv-link-${item.index}`).classed('active', false);
          } else {
            // else item is a node
            d3.select(`#iv-node-${item.index}`).classed('active', false);
          }
        });

        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });

    node
      .append('text')
      .text(d => d.name)
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('x', d => (d.x0 < coreChartWidth / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 < coreChartWidth / 2 ? 'start' : 'end'));

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);
    search.attr('placeholder', `Find by node`);

    search.on('keyup', e => {
      const qstr = e.target.value;

      if (qstr) {
        // reset matched state for all links and nodes because
        // it we don't want matched states to accumulate as we type
        // the matched elements should only correspond to the current qstr
        d3.selectAll('.sankey-link').classed('node-matched', false);
        d3.selectAll('.sankey-node').classed('node-matched', false);

        const lqstr = qstr.toLowerCase();
        const sel = [];
        sankeyfied.nodes.forEach(thisNode => {
          const { name } = thisNode;
          if (name.toLowerCase().includes(lqstr)) {
            sel.push(thisNode);
          }
        });

        sel.forEach(function (o) {
          getConnections(o).forEach(function (p) {
            // Only push new elements if they don't already exist inside sel array
            if (
              !sel.find(el => {
                // check if link is already in sel array
                if (el.source && el.target && p.source && p.target) {
                  return el.index === p.index
                }
                // check if node is already in sel array
                if (
                  el.sourceLinks &&
                  el.targetLinks &&
                  p.sourceLinks &&
                  p.targetLinks
                ) {
                  return el.index === p.index
                }
                return false
              })
            ) {
              sel.push(p);
            }
          });
        });

        sel.forEach(item => {
          // if sel item is a link
          if (item.source && item.target) {
            d3.select(`#iv-link-${item.index}`).classed('node-matched', true);
          } else {
            // else item is a node
            d3.select(`#iv-node-${item.index}`).classed('node-matched', true);
          }
        });
        d3.select('.sankey-nodes').classed('searching', true);
        d3.select('.sankey-links').classed('searching', true);
      } else {
        sankeyfied.nodes.forEach(thisNode => {
          const { index } = thisNode;
          d3.select(`#iv-node-${index}`).classed('node-matched', false);
        });
        d3.select('.sankey-nodes').classed('searching', false);
        d3.select('.sankey-links').classed('searching', false);
      }
    });
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  const dimensionTypes$1 = {
    sourceField: [shouldNotBeBlank],
    targetField: [shouldNotBeBlank],
    valueField: [shouldBeNumber],
  };

  const optionTypes$1 = {
    aspectRatio: checkNumberBetween([0.01, Number.POSITIVE_INFINITY]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    align: checkOneOf(['justify', 'left', 'right', 'center']),

    verticalGapInNodes: checkNumber,
    nodeWidth: checkNumber,
  };

  const validateAndRender$1 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$1, options });

    d3__namespace.csv(dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$1, dimensions });

      // When new validations are added simply add the result to this array
      // When building a new validator the output should be of format:
      // {valid: boolean, message: string}
      const allValidations = [
        dimensionValidation,
        dataValidations,
        optionsValidationResult,
      ];

      const combinedValidation = { valid: true, messages: [] };

      allValidations.forEach(v => {
        combinedValidation.valid = combinedValidation.valid && v.valid;
        if (!v.valid) {
          combinedValidation.messages.push(v.message);
        }
      });

      combinedValidation.valid
        ? renderChart$1({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* eslint-disable no-import-assign */

  function applyInteractionStyles({ activeOpacity, inactiveOpacity }) {
    d3__namespace.select('body').append('style').html(`
g.serieses .series {
  fill-opacity: ${inactiveOpacity};
}
/* clicked and legend clicked states are common: controlled by .mace-active */
g.serieses .series.series-active {
  fill-opacity: ${activeOpacity};
}
g.serieses.searching .series.series-matched .top-line {
  fill-opacity: ${activeOpacity};
  stroke: #000;
  stroke-width: 3;
}
/* So that legend text is visible irrespective of state */
g.series text {
  fill-opacity: ${activeOpacity};
}
g.serieses g.series.series-matched text {
  font-weight: bolder;
}
g.serieses g.series.series-hovered .top-line {
  stroke-width: 3;
}
g.circles circle.circle {
  r: 2;
  fill-opacity: 0.1;
}
g.circles circle.circle.circle-hovered {
  r: 5;
  fill-opacity: ${activeOpacity};
}
`);
  }

  function setupChartArea({
    chartContainerSelector,
    coreChartWidth,
    aspectRatio,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    bgColor,
  }) {
    const coreChartHeight = coreChartWidth / aspectRatio;

    const viewBoxHeight = coreChartHeight + marginTop + marginBottom;
    const viewBoxWidth = coreChartWidth + marginLeft + marginRight;

    const chartParent = d3__namespace.select(chartContainerSelector);

    const widgets = chartParent
      .append('div')
      .attr(
        'style',
        'display: flex; justify-content: space-between; padding-bottom: 0.5rem;',
      );
    const widgetsLeft = widgets
      .append('div')
      .attr('style', 'display: flex; align-items: end; column-gap: 5px;');
    const widgetsRight = widgets
      .append('div')
      .attr('style', 'display: flex; align-items: center; column-gap: 10px;');

    const svg = chartParent
      .append('svg')
      .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
      .style('background', bgColor);

    const allComponents = svg.append('g').attr('class', 'all-components');

    const chartCore = allComponents
      .append('g')
      .attr('transform', `translate(${marginLeft}, ${marginTop})`);

    return {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      widgetsRight,
      viewBoxWidth,
    }
  }

  function initializeTooltip() {
    return d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      )
  }

  function parseData({ data, yField, xField, seriesField, colorField }) {
    const parsedData = data.map(d => ({
      ...d,
      [yField]: Number.parseFloat(d[yField]),
    }));

    parsedData.sort((a, b) => a[xField] - b[xField]);

    const nestedData = d3__namespace
      .groups(parsedData, d => d[seriesField])
      .map(([key, values]) => ({
        [seriesField]: key,
        values,
        [colorField]: values[0][colorField],
      }));

    return { parsedData, nestedData }
  }

  const parseDate = (dt, xAxisDateParser) => {
    const date = d3__namespace.timeParse(xAxisDateParser)(dt);

    return date
  };

  function setupScales({
    parsedData,
    nestedData,
    xField,
    yField,
    seriesField,
    coreChartWidth,
    coreChartHeight,
    overlap,
    xAxisDateParser,
    colorField,
    colorRange,
  }) {
    const xDomain = d3__namespace.extent(
      ___default["default"].chain(parsedData)
        .map(xField)
        .uniq()
        .value()
        .map(d => parseDate(d, xAxisDateParser)),
    );

    const xScale = d3__namespace.scaleTime([0, coreChartWidth]).domain(xDomain);

    const categoryDomain = nestedData.map(d => d[seriesField]);
    const categoryScale = d3__namespace
      .scaleBand()
      .range([0, coreChartHeight])
      .domain(categoryDomain)
      .paddingInner(0)
      .paddingOuter(0);

    const yDomain = d3__namespace.extent(parsedData, d => d[yField]);
    const yScale = d3__namespace
      .scaleLinear()
      .range([0, -(1 + overlap) * categoryScale.step()])
      .domain(yDomain);

    const colorDomain = ___default["default"].chain(parsedData).map(colorField).uniq().value();
    const fillColorScale = d3__namespace.scaleOrdinal().range(colorRange).domain(colorDomain);

    return { yScale, xScale, categoryScale, categoryDomain, fillColorScale }
  }

  function renderXAxis({
    chartCore,
    coreChartHeight,
    xScale,
    xAxisDateFormatter,
    xAxisTitle,
    coreChartWidth,
  }) {
    const xAxis = chartCore
      .append('g')
      .attr('class', 'x-axis-bottom')
      .attr('transform', `translate(0, ${coreChartHeight + 10})`);

    xAxis.call(
      d3__namespace
        .axisBottom(xScale)
        .tickFormat(val => d3__namespace.timeFormat(xAxisDateFormatter)(val)),
      // xAxisTickValues
      //   ? d3.axisBottom(xScale).tickValues(xAxisTickValues)
      //   : d3.axisBottom(xScale),
    );

    xAxis
      .append('g')
      .append('text')
      .attr('class', 'text-xs font-semibold tracking-wider')
      .text(xAxisTitle)
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .attr('transform', `translate(${coreChartWidth / 2}, 30)`);
  }

  function renderRidges({
    chartCore,
    nestedData,
    seriesField,
    defaultStateAll,
    categoryScale,
    xField,
    yField,
    xAxisDateParser,
    xScale,
    yScale,
    fillColorScale,
    colorField,
    tooltipDiv,
    xTooltipFormatter,
    yValuePrefix,
    yValuePostfix,
    yValueFormatter,
    seriesLabelPosition,
    viewBoxWidth,
  }) {
    const seriesGroup = chartCore
      .append('g')
      .attr('class', 'serieses')
      .selectAll('.series')
      .data(nestedData)
      .join('g')
      .attr('class', d => {
        return `series 
    series-${toClassText(d[seriesField])} 
    ${defaultStateAll.includes(d[seriesField]) ? 'series-active' : ''}`
      })
      .attr(
        'transform',
        d =>
          `translate(0, ${
          categoryScale(d[seriesField]) + categoryScale.bandwidth()
        })`,
      )
      .on('click', e => {
        const parentMace = d3__namespace.select(e.target.parentNode);
        const clickedState = parentMace.classed('series-active');
        parentMace.classed('series-active', !clickedState);
      })
      .on('mouseover', e => {
        d3__namespace.select(e.target.parentNode).classed('series-hovered', true);
      })
      .on('mouseout', e => {
        d3__namespace.select(e.target.parentNode).classed('series-hovered', false);
      });

    const area = d3__namespace
      .area()
      // .curve(d3.curveBasis)
      .x(d => xScale(parseDate(d[xField], xAxisDateParser)))
      .y1(d => yScale(d[yField]))
      .y0(yScale(0));

    seriesGroup
      .append('path')
      .attr('fill', d => {
        return d3__namespace.rgb(fillColorScale(d[colorField])).brighter(0.2)
      })
      .datum(d => d.values)
      .attr('d', area)
      .attr('stroke', d => {
        return d3__namespace.rgb(fillColorScale(d[0][colorField])).darker(0.5)
      });

    seriesGroup
      .append('path')
      .attr('class', 'top-line')
      .attr('fill', 'none')
      .datum(d => d.values)
      .attr('d', area.lineY1());
    // .attr('stroke', d => {
    //   return d3.rgb(fillColorScale(d[0][colorField])).darker(0.5)
    // })

    seriesGroup
      .append('g')
      .attr('class', 'circles')
      .selectAll('.circle')
      .data(d => d.values)
      .join('circle')
      .attr('class', 'circle')
      .attr('cx', d => xScale(parseDate(d[xField], xAxisDateParser)))
      .attr('cy', d => yScale(d[yField]))
      .attr('fill', d => {
        return d3__namespace.rgb(fillColorScale(d[colorField])).darker(1)
      })
      .on('mouseover', (e, d) => {
        d3__namespace.select(e.target).classed('circle-hovered', true);
        tooltipDiv.transition().duration(200).style('opacity', 1);
        tooltipDiv.html(
          `${seriesField}: ${d[seriesField]} (${d3__namespace.timeFormat(xTooltipFormatter)(
          d3__namespace.timeParse(xAxisDateParser)(d[xField]),
        )})
      <br/>
      ${yField}: ${
          yValuePrefix +
          formatNumber(d[yField], yValueFormatter) +
          yValuePostfix
        }
      `,
        );
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', e => {
        d3__namespace.select(e.target).classed('circle-hovered', false);
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });

    seriesGroup
      .append('text')
      .text(d => d[seriesField])
      .attr('text-anchor', seriesLabelPosition === 'right' ? 'start' : 'end')
      .attr(
        'transform',
        `translate(${
        seriesLabelPosition === 'right' ? viewBoxWidth + 5 : -5
      }, 0)`,
      )
      .style('font-size', 10);
  }

  const searchEventHandler = referenceList => qstr => {
    if (qstr) {
      const lqstr = toClassText(qstr).toLowerCase();
      referenceList.forEach(val => {
        const seriesName = toClassText(val);
        if (seriesName.toLowerCase().includes(lqstr)) {
          d3__namespace.select(`.series-${seriesName}`).classed('series-matched', true);
        } else {
          d3__namespace.select(`.series-${seriesName}`).classed('series-matched', false);
        }
        d3__namespace.select('.serieses').classed('searching', true);
      });
    } else {
      referenceList.forEach(val => {
        const seriesName = toClassText(val);
        d3__namespace.select(`.series-${seriesName}`).classed('series-matched', false);
      });
      d3__namespace.select('.serieses').classed('searching', false);
    }
  };

  function setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    seriesField,
  }) {
    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);
    // TODO: refactor hidden, won't be needed if we add this node
    search.attr('placeholder', `Find by ${seriesField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr);
    });
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
      .attr('class', goToInitialStateButtonClassNames);
    goToInitialState.classed('hidden', false);
    goToInitialState.on('click', () => {
      d3__namespace.selectAll('.series').classed('series-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        d3__namespace.select(`.series-${toClassText(val)}`).classed('series-active', true);
      });
      search.node().value = '';
      handleSearch('');
    });
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
      .attr('class', clearAllButtonClassNames);
    clearAll.classed('hidden', false);
    clearAll.on('click', () => {
      d3__namespace.selectAll('.series').classed('series-active', false);
      search.node().value = '';
      handleSearch('');
    });
  }

  function setupShowAllButton({
    widgetsLeft,
    showAllButtonClassNames,
    search,
    handleSearch,
  }) {
    const showAll = widgetsLeft
      .append('button')
      .text('Show All')
      .attr('class', showAllButtonClassNames);
    showAll.classed('hidden', false);
    showAll.on('click', () => {
      d3__namespace.selectAll('.series').classed('series-active', true);
      search.node().value = '';
      handleSearch('');
    });
  }

  function renderChart({
    data,
    options: {
      aspectRatio = 0.8,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = '#eee',

      xAxisTitle = '',
      xAxisDateParser = '',
      xAxisDateFormatter = '',
      xTooltipFormatter = '%B %d, %Y',

      overlap = 1,
      yValueFormatter = '',
      yValuePrefix = '',
      yValuePostfix = '',

      seriesLabelPosition = 'left',

      colorRange = d3__namespace.schemeTableau10,

      defaultState = [],

      activeOpacity = 0.8,
      inactiveOpacity = 0.2,

      searchInputClassNames = '',
      goToInitialStateButtonClassNames = '',
      clearAllButtonClassNames = '',
      showAllButtonClassNames = '',
    },
    dimensions: { seriesField, xField, yField, colorField },
    chartContainerSelector,
  }) {
    applyInteractionStyles({ activeOpacity, inactiveOpacity });

    const coreChartWidth = 1000;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      viewBoxWidth,
    } = setupChartArea({
      chartContainerSelector,
      coreChartWidth,
      aspectRatio,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      bgColor,
    });

    const tooltipDiv = initializeTooltip();

    const { parsedData, nestedData } = parseData({
      data,
      yField,
      xField,
      seriesField,
      colorField,
    });

    const { yScale, xScale, categoryScale, categoryDomain, fillColorScale } =
      setupScales({
        parsedData,
        nestedData,
        xField,
        yField,
        seriesField,
        coreChartWidth,
        coreChartHeight,
        overlap,
        xAxisDateParser,
        colorField,
        colorRange,
      });

    const defaultStateAll = defaultState === 'All' ? categoryDomain : defaultState;

    renderXAxis({
      chartCore,
      coreChartHeight,
      xScale,
      xAxisDateFormatter,
      xAxisTitle,
      coreChartWidth,
    });

    renderRidges({
      chartCore,
      nestedData,
      seriesField,
      defaultStateAll,
      categoryScale,
      xField,
      yField,
      xAxisDateParser,
      xScale,
      yScale,
      fillColorScale,
      colorField,
      tooltipDiv,
      xTooltipFormatter,
      yValuePrefix,
      yValuePostfix,
      yValueFormatter,
      seriesLabelPosition,
      viewBoxWidth,
    });

    const handleSearch = searchEventHandler(categoryDomain);
    const search = setupSearch({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      seriesField,
    });

    setupInitialStateButton({
      widgetsLeft,
      goToInitialStateButtonClassNames,
      defaultStateAll,
      search,
      handleSearch,
    });

    setupClearAllButton({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
    });

    setupShowAllButton({
      widgetsLeft,
      showAllButtonClassNames,
      search,
      handleSearch,
    });

    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  const dimensionTypes = {
    xField: [shouldNotBeBlank],
    yField: [shouldBeNumber],
    seriesField: [shouldNotBeBlank],
    colorField: [shouldNotBeBlank],
  };

  const optionTypes = {
    aspectRatio: checkNumberBetween([0.01, Number.POSITIVE_INFINITY]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    seriesLabelPosition: checkOneOf(['left', 'right']),

    overlap: checkNumber,

    colorRange: checkColorArray(),

    defaultState: checkDefaultState,

    activeOpacity: checkNumberBetween([0, 1]),
    inactiveOpacity: checkNumberBetween([0, 1]),
  };

  const validateAndRender = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes, options });

    d3__namespace.csv(dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes, dimensions });

      // When new validations are added simply add the result to this array
      // When building a new validator the output should be of format:
      // {valid: boolean, message: string}
      const allValidations = [
        dimensionValidation,
        dataValidations,
        optionsValidationResult,
      ];

      const combinedValidation = { valid: true, messages: [] };

      allValidations.forEach(v => {
        combinedValidation.valid = combinedValidation.valid && v.valid;
        if (!v.valid) {
          combinedValidation.messages.push(v.message);
        }
      });

      combinedValidation.valid
        ? renderChart({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  exports.renderMace = renderChart$2;
  exports.renderRidgeline = renderChart;
  exports.renderSankey = renderChart$1;
  exports.validateAndRenderMace = validateAndRender$2;
  exports.validateAndRenderRidgeline = validateAndRender;
  exports.validateAndRenderSankey = validateAndRender$1;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
