(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('lodash-es'), require('d3-sankey'), require('topojson')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3', 'lodash-es', 'd3-sankey', 'topojson'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.viz = {}, global.d3, global._, global.d3, global.topojson));
})(this, (function (exports, d3$1, _, d3Sankey, topojson) { 'use strict';

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
  var topojson__namespace = /*#__PURE__*/_interopNamespace(topojson);

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

  const formatDate = function (
    value,
    dateParser = null,
    dateFormatter = null,
  ) {
    const parsedDate = d3__namespace.timeParse(dateParser)(value);
    const formattedDate = parsedDate
      ? d3__namespace.timeFormat(dateFormatter)(parsedDate)
      : null;
    return formattedDate || value
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
    safetyMargin = 5,
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

  // Throttled this function for use in force simulations
  const preventOverflowThrottled = _.throttle(preventOverflow, 500);

  const fileExtension = filename => {
    const [ext] = filename.split('.').slice(-1);
    return ext
  };

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

  function applyInteractionStyles$4({ activeOpacity, inactiveOpacity }) {
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

  function setupChartArea$6({
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

  function initializeTooltip$5() {
    return d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      )
  }

  function parseData$5({
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

  function setupScales$5({
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

  function renderSizeLegend$1({
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
  function renderXAxis$4({
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

  function renderYAxis$3({ chartCore, coreChartWidth, yScale, yAxisTitle }) {
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

  function renderColorLegend$2({
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
  const searchEventHandler$3 = referenceList => qstr => {
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

  function setupSearch$4({
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

  function setupInitialStateButton$2({
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

  function setupClearAllButton$2({
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

  function renderChart$8({
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
    applyInteractionStyles$4({ activeOpacity, inactiveOpacity });

    const coreChartWidth = 1000;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      widgetsRight,
    } = setupChartArea$6({
      chartContainerSelector,
      coreChartWidth,
      aspectRatio,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      bgColor,
    });

    const tooltipDiv = initializeTooltip$5();

    const dataParsed = parseData$5({
      data,
      xFieldStart,
      xFieldEnd,
      yFieldStart,
      yFieldEnd,
      sizeField,
    });

    const { yScale, xScale, circleSizeScale, lineWidthScale, colorScale } =
      setupScales$5({
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
    renderSizeLegend$1({
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

    renderColorLegend$2({
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

    renderXAxis$4({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      xScale,
      xAxisTickValues,
      xAxisTitle,
    });

    // y-axis
    renderYAxis$3({ chartCore, coreChartWidth, yScale, yAxisTitle });

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
    const handleSearch = searchEventHandler$3(nameValues);
    const search = setupSearch$4({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      nameField,
    });

    setupInitialStateButton$2({
      widgetsLeft,
      goToInitialStateButtonClassNames,
      defaultStateAll,
      search,
      handleSearch,
    });
    setupClearAllButton$2({
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

  const checkBoolean = val => {
    const valid = typeof val === 'boolean';
    if (valid) {
      return { valid: true }
    }
    return { valid: false, message: 'Should be true or false' }
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

  const checkStringArray = length => arr => {
    if (___default["default"].isArray(arr)) {
      if (length && arr.length < length) {
        return {
          valid: false,
          message: `Should be an array with minimum length: ${length}`,
        }
      }
      return { valid: true }
    }
    return { valid: false, message: 'Should be a valid array' }
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

  const dimensionTypes$7 = {
    xFieldStart: [shouldBeNumber],
    xFieldEnd: [shouldBeNumber],
    yFieldStart: [shouldBeNumber],
    yFieldEnd: [shouldBeNumber],
    sizeField: [shouldBeNumber],
    nameField: [shouldNotBeBlank, shouldBeUnique],
  };

  const optionTypes$7 = {
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

  const validateAndRender$8 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$7, options });

    d3__namespace.csv(dataPath).then(data => {
      // Run validations
      const { columns } = data;
      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$7, dimensions });

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
        ? renderChart$8({ data, dimensions, options, chartContainerSelector })
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

  function renderChart$7({
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

  const dimensionTypes$6 = {
    sourceField: [shouldNotBeBlank],
    targetField: [shouldNotBeBlank],
    valueField: [shouldBeNumber],
  };

  const optionTypes$6 = {
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

  const validateAndRender$7 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$6, options });

    d3__namespace.csv(dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$6, dimensions });

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
        ? renderChart$7({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* global document */

  function legend({
    color,
    title,
    tickSize = 6,
    width = 320,
    height = 44 + tickSize,
    marginTop = 18,
    marginRight = 0,
    marginBottom = 16 + tickSize,
    marginLeft = 0,
    ticks = width / 64,
    removeTicks = false,
    tickFormat,
    tickValues,
    // opacity,
  } = {}) {
    const svg = d3__namespace
      .create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .style('overflow', 'visible')
      // .style("opacity", 0.7)
      .style('display', 'block');

    let tickAdjust = g =>
      g.selectAll('.tick line').attr('y1', marginTop + marginBottom - height);
    let x;

    // Continuous
    if (color.interpolate) {
      const n = Math.min(color.domain().length, color.range().length);

      x = color
        .copy()
        .rangeRound(
          d3__namespace.quantize(d3__namespace.interpolate(marginLeft, width - marginRight), n),
        );

      svg
        .append('image')
        .attr('x', marginLeft)
        .attr('y', marginTop)
        .attr('width', width - marginLeft - marginRight)
        .attr('height', height - marginTop - marginBottom)
        .attr('preserveAspectRatio', 'none')
        .attr(
          'xlink:href',
          ramp(
            color.copy().domain(d3__namespace.quantize(d3__namespace.interpolate(0, 1), n)),
          ).toDataURL(),
        );
    }

    // Sequential
    else if (color.interpolator) {
      x = Object.assign(
        color
          .copy()
          .interpolator(d3__namespace.interpolateRound(marginLeft, width - marginRight)),
        {
          range() {
            return [marginLeft, width - marginRight]
          },
        },
      );

      svg
        .append('image')
        .attr('x', marginLeft)
        .attr('y', marginTop)
        .attr('width', width - marginLeft - marginRight)
        .attr('height', height - marginTop - marginBottom)
        .attr('preserveAspectRatio', 'none')
        .attr('xlink:href', ramp(color.interpolator()).toDataURL());

      // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
      if (!x.ticks) {
        if (tickValues === undefined) {
          const n = Math.round(ticks + 1);
          tickValues = d3__namespace
            .range(n)
            .map(i => d3__namespace.quantile(color.domain(), i / (n - 1)));
        }
        if (typeof tickFormat !== 'function') {
          tickFormat = d3__namespace.format(tickFormat === undefined ? ',f' : tickFormat);
        }
      }
    }

    // Threshold
    else if (color.invertExtent) {
      const thresholds = color.thresholds
        ? color.thresholds() // scaleQuantize
        : color.quantiles
        ? color.quantiles() // scaleQuantile
        : color.domain(); // scaleThreshold

      const thresholdFormat =
        tickFormat === undefined
          ? d => d
          : typeof tickFormat === 'string'
          ? d3__namespace.format(tickFormat)
          : tickFormat;

      x = d3__namespace
        .scaleLinear()
        .domain([-1, color.range().length - 1])
        .rangeRound([marginLeft, width - marginRight]);

      svg
        .append('g')
        .selectAll('rect')
        .data(color.range())
        .join('rect')
        .attr('x', (d, i) => x(i - 1))
        .attr('y', marginTop)
        .attr('width', (d, i) => x(i) - x(i - 1))
        .attr('height', height - marginTop - marginBottom)
        .attr('fill', d => d);

      tickValues = d3__namespace.range(thresholds.length);
      tickFormat = i => thresholdFormat(thresholds[i], i);
    }

    // Ordinal
    else {
      x = d3__namespace
        .scaleBand()
        .domain(color.domain())
        .rangeRound([marginLeft, width - marginRight]);

      svg
        .append('g')
        .selectAll('rect')
        .data(color.domain())
        .join('rect')
        .attr('x', x)
        .attr('y', marginTop)
        .attr('width', Math.max(0, x.bandwidth() - 1))
        .attr('height', height - marginTop - marginBottom)
        .attr('fill', color);

      tickAdjust = () => {};
    }

    svg
      .append('g')
      .attr('transform', `translate(0,${height - marginBottom})`)
      .call(
        d3__namespace
          .axisBottom(x)
          .ticks(ticks, typeof tickFormat === 'string' ? tickFormat : undefined)
          .tickFormat(typeof tickFormat === 'function' ? tickFormat : undefined)
          .tickSize(tickSize)
          .tickValues(tickValues),
      )
      .call(tickAdjust)
      .call(g => g.select('.domain').remove())
      .call(g => (removeTicks ? g.selectAll('.tick').remove() : null))
      .call(g =>
        g
          .append('text')
          .attr('x', marginLeft)
          .attr('y', marginTop + marginBottom - height - 6)
          .attr('fill', 'currentColor')
          .attr('text-anchor', 'start')
          .attr('class', 'font-sans')
          .attr('style', 'font-weight: 600;')
          .text(title),
      );

    return svg.node()
  }

  function ramp(color, n = 256) {
    var canvas = document.createElement('canvas');
    canvas.width = n;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    for (let i = 0; i < n; ++i) {
      context.fillStyle = color(i / (n - 1));
      context.fillRect(i, 0, 1, 1);
    }
    return canvas
  }

  function swatches({
    color,
    columns = null,
    format = x => x,
    swatchSize = 15,
    swatchWidth = swatchSize,
    swatchHeight = swatchSize,
    marginLeft = 0,
    uid,
    customClass = '',
  }) {
    const id = uid;
    //DOM.uid().id;

    if (columns !== null)
      return `<div
      style="display: flex; align-items: center; margin-left: ${+marginLeft}px; min-height: 33px; font: 10px sans-serif;"
    >
      <style>
        .${id}-item {
          break-inside: avoid;
          display: flex;
          align-items: center;
          padding-bottom: 1px;
        }

        .${id}-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: red;
          max-width: calc(100% - ${+swatchWidth}px - 0.5em);
        }

        .${id}-swatch {
          width: ${+swatchWidth}px;
          height: ${+swatchHeight}px;
          margin: 0 0.5em 0 0;
        }
      </style>
      <div style="width: 100%; columns: ${columns};">
        ${color.domain().map(value => {
          const label = format(value);
          return `<div class="${id}-item">
            <div class="${id}-swatch" style="background:${color(value)};"></div>
            <div class="${customClass} ${id}-label" title="${label.replace(
            /["&]/g,
            entity,
          )}">
              ${document.createTextNode(label)}
            </div>
          </div>`
        })}
      </div>
    </div>`

    return `<div
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
        width: ${+swatchWidth}px;
        height: ${+swatchHeight}px;
        margin-right: 0.5em;
        background: var(--color);
      }
    </style>
    <div>
      ${color
        .domain()
        .map(
          value =>
            `<span class="${customClass} ${id}" style="--color: ${color(value)}"
              >${format(value)}</span
            >`,
        )
        .join('')}
    </div>
  </div>`
  }

  function entity(character) {
    return `&#${character.charCodeAt(0).toString()};`
  }

  /* global window, console */

  function renderChart$6({
    data,
    dimensions: {
      sizeField,
      xField,
      nameField, // also search field
      segmentField,
    },
    options: {
      aspectRatioCombined = 5,
      aspectRatioSplit = 0.8,

      marginTop = 60,
      marginRight = 90,
      marginBottom = 20,
      marginLeft = 50,

      bgColor = 'transparent',

      customColorScheme,
      inbuiltScheme = 'schemeOrRd',
      numberOfColors = 5,

      collisionDistance = 0.5,

      /* xField */
      xDomainCustom,
      xAxisLabel = xField,
      xValuePrefix = '',
      xValueFormatter = '',
      xValueSuffix = '',

      /* sizeField */
      sizeRange = [2, 20],
      sizeValuePrefix = '',
      sizeValueFormatter = '',
      sizeValueSuffix = '',
      sizeLegendValues,
      sizeLegendTitle = sizeField,
      sizeLegendGapInCircles = 30,

      colorLegendTitle = xField,

      combinedSegmentLabel = 'All',
      segmentType = segmentField,
      segmentTypeCombined = '',
      segmentTypeSplit = '',

      splitButtonClassNames = '',
      combinedButtonClassNames = '',
      searchInputClassNames = '',
    },

    chartContainerSelector,
  }) {
    d3__namespace.select('body').append('style').html(`
    .g-searching circle.c-match {
      stroke-width: 2;
      stroke: #333;
    }
    circle.hovered {
      stroke-width: 2;
      stroke: #333;
    }
  `);
    const coreChartWidth = 1000;

    const coreChartHeightCombined = coreChartWidth / aspectRatioCombined;
    const coreChartHeightSplit = coreChartWidth / aspectRatioSplit;

    const viewBoxHeightCombined =
      coreChartHeightCombined + marginTop + marginBottom;
    const viewBoxHeightSplit = coreChartHeightSplit + marginTop + marginBottom;
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
      .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightCombined}`)
      .style('background', bgColor);

    const allComponents = svg.append('g').attr('class', 'all-components');

    const chartCore = allComponents
      .append('g')
      .attr('transform', `translate(${marginLeft}, ${marginTop})`);

    const tooltipDiv = d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute;  background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      );

    const parsedData = data.map(d => ({
      ...d,
      [sizeField]: Number.parseFloat(d[sizeField]),
      [xField]: Number.parseFloat(d[xField]),
    }));

    // const splitButton = d3.select('#split-bubbles')
    const splitButton = widgetsLeft
      .append('button')
      .text('Split')
      .attr('class', splitButtonClassNames);

    // const combinedButton = d3.select('#combine-bubbles')
    const combinedButton = widgetsLeft
      .append('button')
      .text('Combine')
      .attr('class', combinedButtonClassNames);

    let allowSplit = false;
    let allowCombine = false;

    function manageSplitCombine() {
      if (!allowSplit) {
        splitButton.node().disabled = true;
        splitButton.attr(
          'title',
          'Combined force simulation is either in progress or current configuration is already split',
        );
      } else {
        splitButton.node().disabled = false;

        splitButton.attr('title', null);
      }

      if (!allowCombine) {
        combinedButton.node().disabled = true;
        combinedButton.attr(
          'title',
          'Split force simulation is either in progress or current configuration is already combined',
        );
      } else {
        combinedButton.node().disabled = false;
        combinedButton.attr('title', null);
      }
    }
    manageSplitCombine();

    const segments = [...new Set(parsedData.map(c => c[segmentField]))];
    const maxSizeValue = Math.max(...parsedData.map(c => c[sizeField]));

    const sizeScale = d3__namespace.scaleSqrt().range(sizeRange).domain([0, maxSizeValue]);

    const yScale = d3__namespace
      .scalePoint()
      .domain(segments)
      .range([0, coreChartHeightSplit])
      .padding(0.5);

    const xValues = parsedData.map(d => d[xField]).sort();
    const xDomainDefault = d3__namespace.extent(xValues);
    const xDomain = xDomainCustom || xDomainDefault;
    const xScale = d3__namespace.scaleLinear().domain(xDomain).range([0, coreChartWidth]);

    // TODO: separate field for color scale and xscale?
    // Right now both x scale and color scale are based on the same
    const xColorScale = d3__namespace
      .scaleQuantize()
      .domain(xDomain)
      .range(customColorScheme || d3__namespace[inbuiltScheme][numberOfColors])
      .nice();

    widgetsRight
      .append('svg')
      .attr('width', 260)
      .attr('height', 45)
      .append(() =>
        legend({ color: xColorScale, title: colorLegendTitle, width: 260 }),
      );

    // Size Legend

    const sizeValues = sizeLegendValues.map(a => sizeScale(a));

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

    // TODO: move this to options?
    const moveSizeObjectDownBy = 5;

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
      .attr('cx', (d, i) => cumulativeSizes[i] + i * sizeLegendGapInCircles + 1)
      .attr('cy', sizeValues[sizeValues.length - 1] + 1);

    sizeLegendContainerGroup
      .selectAll('.g-size-circle')
      .append('text')
      .attr('alignment-baseline', 'middle')
      .attr('dy', sizeValues[sizeValues.length - 1] + 2)
      .attr(
        'dx',
        (d, i) => d + cumulativeSizes[i] + (i + 0.1) * sizeLegendGapInCircles,
      )
      .style('font-size', 8)
      .text(
        (d, i) =>
          sizeValuePrefix +
          formatNumber(sizeLegendValues[i], sizeValueFormatter) +
          sizeValueSuffix,
      );

    sizeLegendContainerGroup
      .append('text')
      .attr('alignment-baseline', 'hanging')
      .style('font-size', 10)
      .style('font-weight', 600)
      .text(sizeLegendTitle);

    const legendBoundingBox = sizeLegendContainerGroup.node().getBBox();
    sizeLegend
      .attr('height', legendBoundingBox.height)
      .attr('width', legendBoundingBox.width);

    chartCore
      .append('g')
      .attr('transform', `translate(${coreChartWidth / 2}, ${-20})`)
      .append('text')
      .attr('class', 'text-xs font-semibold tracking-wider')
      .text(xAxisLabel)
      .attr('text-anchor', 'middle');

    const xAxis = chartCore.append('g').attr('id', 'x-axis');

    function renderXAxisSplit() {
      xAxis
        .call(
          d3__namespace
            .axisTop(xScale)
            .tickSize(-coreChartHeightSplit)
            .tickFormat(
              val =>
                xValuePrefix + formatNumber(val, xValueFormatter) + xValueSuffix,
            ),
        )
        .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1))
        .call(g => g.select('.domain').remove());
    }
    function renderXAxisCombined() {
      xAxis
        .call(
          d3__namespace
            .axisTop(xScale)
            .tickSize(-coreChartHeightCombined)
            .tickFormat(
              val =>
                xValuePrefix + formatNumber(val, xValueFormatter) + xValueSuffix,
            ),
        )
        .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1))
        .call(g => g.select('.domain').remove());
    }

    const yAxisLabel = chartCore
      .append('g')
      .attr('transform', `translate(${-23}, ${-20})`)
      .append('text')
      .attr('class', 'text-xs font-semibold ')
      .text(segmentType)
      .attr('text-anchor', 'end');

    function yAxisSplit() {
      d3__namespace.select('#y-axis-combined').remove();
      chartCore
        .append('g')
        .attr('id', 'y-axis-split')
        .call(d3__namespace.axisLeft(yScale).tickSize(-coreChartWidth))
        .call(g => g.select('.domain').remove())
        .call(g => {
          g.selectAll('.tick line').attr('stroke-opacity', 0.1);
          g.selectAll('.tick text')
            .attr('transform', 'translate(-20,0)')
            .classed('text-xs', true);
        })
        .attr('opacity', 0)
        .transition()
        .duration(1000)
        .attr('opacity', 1);
    }

    const yScaleCombined = d3__namespace
      .scaleBand()
      .domain([combinedSegmentLabel])
      .range([0, coreChartHeightCombined]);

    function yAxisCombined() {
      d3__namespace.select('#y-axis-split').remove();
      chartCore
        .append('g')
        .attr('id', 'y-axis-combined')
        .call(d3__namespace.axisLeft(yScaleCombined).tickSize(-coreChartWidth))
        .call(g => g.select('.domain').remove())
        .call(g => {
          g.selectAll('.tick line').attr('stroke-opacity', 0.1);
          g.selectAll('.tick text')
            .attr('transform', 'translate(-20,0)')
            .classed('text-xs', true);
        })
        .attr('opacity', 0)
        .transition()
        .duration(1000)
        .attr('opacity', 1);
    }

    const bubbles = chartCore.append('g').attr('class', 'bubbles');

    let allBubbles;
    function ticked() {
      const u = bubbles.selectAll('circle').data(parsedData);
      allBubbles = u
        .enter()
        .append('circle')
        .attr('r', d => sizeScale(d[sizeField]))
        .style('fill', function (d) {
          return xColorScale(d[xField])
        })
        .attr('stroke', function (d) {
          return d3__namespace.rgb(xColorScale(d[xField])).darker(0.5)
        })
        .merge(u)
        .attr('cx', function (d) {
          return d.x
        })
        .attr('cy', function (d) {
          return d.y
        })
        .on('mouseover', function (e, d) {
          tooltipDiv.transition().duration(200).style('opacity', 1);
          tooltipDiv.html(
            `<div><span>${d[nameField]}</span>(${d[segmentField]})</div>
         <div style="display: flex">
           <div style="text-transform: capitalize">${xField}:</div>
           <div style="padding-left: 0.25rem; font-weight: bold">${
             xValuePrefix +
             formatNumber(d[xField], xValueFormatter) +
             xValueSuffix
           }</div>
         </div>
         <div style="display: flex">
           <div style="text-transform: capitalize">${sizeField}:</div>
           <div style="padding-left: 0.25rem; font-weight: bold">${
             sizeValuePrefix +
             formatNumber(d[sizeField], sizeValueFormatter) +
             sizeValueSuffix
           }</div>
         </div>`,
          );
          tooltipDiv
            .style('left', `${e.clientX}px`)
            .style('top', `${e.clientY + window.scrollY + 30}px`);
          d3__namespace.select(this).classed('hovered', true);
        })
        .on('mouseout', function () {
          tooltipDiv.transition().duration(500).style('opacity', 0);
          d3__namespace.select(this).classed('hovered', false);
        });
      u.exit().remove();
      preventOverflowThrottled({
        allComponents,
        svg,
        margins: { marginLeft, marginRight, marginTop, marginBottom },
      });
    }

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);

    search.attr('placeholder', `Find by ${nameField}`);

    function searchBy(term) {
      if (term) {
        d3__namespace.select('.bubbles').classed('g-searching', true);
        allBubbles.classed('c-match', d =>
          d[nameField].toLowerCase().includes(term.toLowerCase()),
        );
      } else {
        d3__namespace.select('.bubbles').classed('g-searching', false);
      }
    }

    search.on('keyup', e => {
      searchBy(e.target.value.trim());
    });

    function splitSim() {
      allowSplit = false;
      manageSplitCombine();
      renderXAxisSplit();

      yAxisSplit();

      yAxisLabel.text(segmentTypeSplit);

      svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightSplit}`);

      bubbles.attr('transform', `translate(0, 0)`);
      bubbles.raise();

      d3__namespace.forceSimulation(parsedData)
        .force('charge', d3__namespace.forceManyBody().strength(1))
        .force(
          'x',
          d3__namespace
            .forceX()
            .x(function (d) {
              return xScale(d[xField])
            })
            // split X strength
            .strength(1),
        )
        .force(
          'y',
          d3__namespace
            .forceY()
            .y(function (d) {
              return yScale(d[segmentField])
            })
            // split Y strength
            .strength(1.2),
        )
        .force(
          'collision',
          d3__namespace.forceCollide().radius(function (d) {
            return sizeScale(d[sizeField]) + collisionDistance
          }),
        )
        .on('tick', ticked)
        .on('end', () => {
          console.log('split force simulation ended');
          allowCombine = true;
          manageSplitCombine();
        });
    }
    function combinedSim() {
      allowCombine = false;
      manageSplitCombine();
      renderXAxisCombined();

      yAxisCombined();

      yAxisLabel.text(segmentTypeCombined);
      svg.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeightCombined}`);

      bubbles.attr('transform', `translate(0, ${coreChartHeightCombined / 2})`);
      bubbles.raise();

      d3__namespace.forceSimulation(parsedData)
        .force('charge', d3__namespace.forceManyBody().strength(1))
        .force(
          'x',
          d3__namespace
            .forceX()
            .x(d => xScale(d[xField]))
            // combine X strength
            .strength(1),
        )
        .force(
          'y',
          d3__namespace.forceY().y(0),
          // combine Y strength
          // .strength(1)
        )
        .force(
          'collision',
          d3__namespace.forceCollide().radius(function (d) {
            return sizeScale(d[sizeField]) + collisionDistance
          }),
        )
        .on('tick', ticked)
        .on('end', () => {
          console.log('combined force simulation ended');
          allowSplit = true;
          manageSplitCombine();
        });
    }

    splitButton.on('click', splitSim);
    combinedButton.on('click', combinedSim);

    combinedSim();
  }

  const d3ColorSchemeOptions = [
    'schemeBrBG',
    'schemePRGn',
    'schemePiYG',
    'schemePuOr',
    'schemeRdBu',
    'schemeRdGy',
    'schemeRdYlBu',
    'schemeRdYlGn',
    'schemeSpectral',
    'schemeBuGn',
    'schemeBuPu',
    'schemeGnBu',
    'schemeOrRd',
    'schemePuBuGn',
    'schemePuBu',
    'schemePuRd',
    'schemeRdPu',
    'schemeYlGnBu',
    'schemeYlGn',
    'schemeYlOrBr',
    'schemeYlOrRd',
    'schemeBlues',
    'schemeGreens',
    'schemeGreys',
    'schemePurples',
    'schemeReds',
    'schemeOranges',
  ];

  const dimensionTypes$5 = {
    sizeField: [shouldBeNumber],
    xField: [shouldBeNumber],
    nameField: [shouldNotBeBlank], // also search field
    segmentField: [shouldNotBeBlank],
  };

  const optionTypes$5 = {
    aspectRatioCombined: checkNumberBetween([0.01, Number.MAX_SAFE_INTEGER]),
    aspectRatioSplit: checkNumberBetween([0.01, Number.MAX_SAFE_INTEGER]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    customColorScheme: checkColorArray,
    inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
    numberOfColors: checkNumberBetween([3, 9]),

    collisionDistance: checkNumberBetween([0, Number.MAX_SAFE_INTEGER]),

    /* xField */
    xDomainCustom: checkNumericArray,
    // xAxisLabel = xField,
    // xValuePrefix = '',
    // xValueFormatter = '',
    // xValueSuffix = '',

    /* sizeField */
    sizeRange: checkNumericArray,
    // sizeValuePrefix = '',
    // sizeValueFormatter = '',
    // sizeValueSuffix = '',
    sizeLegendValues: checkNumericArray,
    // sizeLegendTitle = sizeField,
    sizeLegendGapInCircles: checkNumber,

    // colorLegendTitle = xField,

    // combinedSegmentLabel = 'All',
    // segmentType = segmentField,
    // segmentTypeCombined = '',
    // segmentTypeSplit = '',

    // splitButtonClassNames = '',
    // combinedButtonClassNames = '',
    // searchInputClassNames = '',
  };

  const validateAndRender$6 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$5, options });

    d3__namespace.csv(dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });
      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$5, dimensions });

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
        ? renderChart$6({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* eslint-disable no-import-assign */

  function applyInteractionStyles$3() {
    d3__namespace.select('body').append('style').html(`
  rect.domino.domino-hovered {
    stroke: #333;
  }
  g.dominos.searching g rect.domino-matched {
    stroke: #333;
  }
  `);
  }

  function setupChartArea$5({
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

  function initializeTooltip$4() {
    return d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      )
  }

  function parseData$4({ data, colorField, yField }) {
    let dataParsed = data.map(el => {
      const elParsed = { ...el };
      elParsed[colorField] = Number.parseFloat(el[colorField]);
      return elParsed
    });

    dataParsed = ___default["default"](dataParsed)
      .groupBy(yField)
      .map(val => {
        val.forEach((val_, i) => {
          // eslint-disable-next-line no-param-reassign
          val_.__idx__ = i;
        });
        const sortedArray = ___default["default"].orderBy(val, colorField, 'desc');
        sortedArray.forEach((val_, i) => {
          // eslint-disable-next-line no-param-reassign
          val_.__rank__ = i;
        });
        const unsortedArray = ___default["default"].orderBy(sortedArray, '__idx__', 'asc');
        return unsortedArray
      })
      .value()
      .flat();
    return dataParsed
  }

  function setupScales$4({
    dataParsed,
    xField,
    yField,
    dominoSize,
    coreChartWidth,
    coreChartHeight,
    xPaddingOuter,
    ySortOrder,
    yPaddingOuter,
    yPaddingInner,
    colorStrategy,
    colorThreshold,
    colorDominoNormal,
    colorDominoHighlighted,
  }) {
    // Data should be sorted on xField and provided.
    const xDomain = ___default["default"](dataParsed).map(xField).uniq().value();
    const xPaddingInner = 1 - dominoSize;
    const xScale = d3__namespace
      .scaleBand()
      .domain(xDomain)
      .range([0, coreChartWidth])
      .paddingInner(xPaddingInner)
      .paddingOuter(xPaddingOuter);

    // y-scale
    const yDomain = ___default["default"](dataParsed)
      .orderBy([yField], [ySortOrder])
      .map(yField)
      .uniq()
      .value();

    const yScale = d3__namespace
      .scaleBand()
      .domain(yDomain)
      .range([0, coreChartHeight])
      .paddingInner(yPaddingInner)
      .paddingOuter(yPaddingOuter);

    const colorScaleRankStrat = val =>
      val >= colorThreshold ? colorDominoNormal : colorDominoHighlighted;

    const colorScaleValueStrat = val =>
      val >= colorThreshold ? colorDominoHighlighted : colorDominoNormal;

    return {
      xScale,
      yScale,
      colorScale:
        colorStrategy === 'value' ? colorScaleValueStrat : colorScaleRankStrat,
    }
  }

  function renderYAxis$2({ chartCore, yScale }) {
    chartCore
      .append('g')
      .attr('class', 'y-axis-left')
      .call(d3__namespace.axisLeft(yScale).tickSize(0))
      .call(g => g.select('.domain').remove());
  }

  function renderXAxis$3({ chartCore, xAxisLabel, coreChartWidth }) {
    chartCore
      .append('text')
      .text(xAxisLabel)
      .attr('transform', `translate(${coreChartWidth / 2}, 0)`)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12);
  }

  function renderDominos({
    dataParsed,
    yField,
    chartCore,
    yScale,
    dominoField,
    xScale,
    xField,
    colorScale,
    colorField,
    colorStrategy,
    tooltipDiv,
  }) {
    const nestedData = d3__namespace
      .groups(dataParsed, d => d[yField])
      .map(([key, values]) => ({
        [yField]: key,
        values,
      }));

    const cGroup = chartCore
      .append('g')
      .attr('class', 'dominos')
      .selectAll('g')
      .data(nestedData)
      .join('g')
      .attr('id', d => `${yField}-${d[yField]}`)
      .attr('transform', d => `translate(0, ${yScale(d[yField])})`);

    cGroup
      .selectAll('rect')
      .data(d => d.values)
      .join('rect')
      .attr('class', d => {
        const dominoName = toClassText(d[dominoField]);
        return `domino domino-${dominoName}`
      })
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('x', d => xScale(d[xField]))
      .attr('y', 0)
      .attr('fill', d =>
        colorScale(colorStrategy === 'value' ? d[colorField] : d.__rank__),
      )
      .on('mouseover', (e, d) => {
        d3__namespace.select(e.target).classed('domino-hovered', true);

        tooltipDiv.transition().duration(200).style('opacity', 1);

        tooltipDiv.html(`${d[dominoField]}, Pick # ${d[xField]}`);
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', e => {
        d3__namespace.select(e.target).classed('domino-hovered', false);
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });
  }

  const searchEventHandler$2 = referenceList => qstr => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        const dominoName = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          d3__namespace.select(`.domino-${dominoName}`).classed('domino-matched', true);
        } else {
          d3__namespace.select(`.domino-${dominoName}`).classed('domino-matched', false);
        }
        d3__namespace.select('.dominos').classed('searching', true);
      });
    } else {
      referenceList.forEach(val => {
        const dominoName = toClassText(val);
        d3__namespace.select(`.domino-${dominoName}`).classed('domino-matched', false);
      });
      d3__namespace.select('.dominos').classed('searching', false);
    }
  };
  function renderColorLegend$1({
    xScale,
    yScale,
    widgetsRight,
    colorDominoHighlighted,
    highlightedLegendLabel,
    colorDominoNormal,
    normalLegendLabel,
  }) {
    const colorLegend = widgetsRight.append('svg');
    const colorLegendContainerGroup = colorLegend.append('g');
    const dominoWidth = xScale.bandwidth();
    const dominoHeight = yScale.bandwidth();
    const highlightedLegend = colorLegendContainerGroup.append('g');
    highlightedLegend
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', dominoWidth)
      .attr('height', dominoHeight)
      .attr('fill', colorDominoHighlighted);
    highlightedLegend
      .append('text')
      .attr('x', dominoWidth + 5)
      .attr('y', dominoHeight / 2)
      .attr('font-size', 12)
      .attr('dominant-baseline', 'middle')
      .text(highlightedLegendLabel);
    const xShift = highlightedLegend.node().getBBox().width;
    const normalLegend = colorLegendContainerGroup
      .append('g')
      .attr('transform', `translate(${xShift + 20}, 0)`);
    normalLegend
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', dominoWidth)
      .attr('height', dominoHeight)
      .attr('fill', colorDominoNormal);
    normalLegend
      .append('text')
      .attr('x', dominoWidth + 5)
      .attr('y', dominoHeight / 2)
      .attr('font-size', 12)
      .attr('dominant-baseline', 'middle')
      .text(normalLegendLabel);
    const colorLegendDimensions = colorLegendContainerGroup.node().getBBox();
    colorLegend
      .attr('width', colorLegendDimensions.width)
      .attr('height', colorLegendDimensions.height);
  }

  function setupSearch$3({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    dominoField,
  }) {
    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);
    // TODO: refactor hidden, won't be needed if we add this node
    search.attr('placeholder', `Find by ${dominoField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr);
    });
    return search
  }

  function renderChart$5({
    data,
    options: {
      aspectRatio = 2,

      marginTop = 60,
      marginRight = 90,
      marginBottom = 20,
      marginLeft = 50,

      bgColor = 'transparent',

      xPaddingOuter = 0.2,
      xAxisLabel = xField,

      dominoSize = 0.2,

      yPaddingInner = 0.2,
      yPaddingOuter = 0.2,
      ySortOrder = 'desc',

      colorStrategy = 'value',
      colorThreshold = 10,
      colorDominoHighlighted = '#c20a66',
      colorDominoNormal = '#d9e2e4',

      normalLegendLabel = 'Normal',
      highlightedLegendLabel = 'Highlighted',

      searchInputClassNames = '',
    },
    dimensions: { xField, yField, dominoField, colorField },

    chartContainerSelector,
  }) {
    applyInteractionStyles$3();

    const coreChartWidth = 1000;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      widgetsRight,
    } = setupChartArea$5({
      chartContainerSelector,
      coreChartWidth,
      aspectRatio,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      bgColor,
    });

    const tooltipDiv = initializeTooltip$4();

    const dataParsed = parseData$4({
      data,
      colorField,
      yField,
    });

    const { xScale, yScale, colorScale } = setupScales$4({
      dataParsed,
      xField,
      yField,
      dominoSize,
      coreChartWidth,
      coreChartHeight,
      xPaddingOuter,
      ySortOrder,
      yPaddingOuter,
      yPaddingInner,
      colorThreshold,
      colorDominoNormal,
      colorDominoHighlighted,
      colorStrategy,
    });

    renderYAxis$2({ chartCore, yScale });

    renderDominos({
      dataParsed,
      yField,
      chartCore,
      yScale,
      dominoField,
      xScale,
      xField,
      colorScale,
      colorField,
      colorStrategy,
      tooltipDiv,
    });

    renderXAxis$3({ chartCore, xAxisLabel, coreChartWidth });

    const dominoValues = ___default["default"](dataParsed).map(dominoField).uniq().value();
    const handleSearch = searchEventHandler$2(dominoValues);
    setupSearch$3({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      dominoField,
    });

    // Legends
    renderColorLegend$1({
      xScale,
      yScale,
      widgetsRight,
      colorDominoHighlighted,
      highlightedLegendLabel,
      colorDominoNormal,
      normalLegendLabel,
    });

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  const dimensionTypes$4 = {
    xField: [shouldNotBeBlank],
    yField: [shouldNotBeBlank],
    colorField: [shouldBeNumber],
    dominoField: [shouldNotBeBlank],
  };

  const optionTypes$4 = {
    aspectRatio: checkNumberBetween([0, Number.POSITIVE_INFINITY]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    /* Dimensions */
    /* xField */
    xPaddingOuter: checkNumberBetween([0, 1]),
    // xAxisLabel: checkString,

    /* yField */
    yPaddingInner: checkNumberBetween([0, 1]),
    yPaddingOuter: checkNumberBetween([0, 1]),
    ySortOrder: checkOneOf(['asc', 'desc']),

    /* colorField */
    colorStrategy: checkOneOf(['rank', 'value']),
    colorThreshold: checkNumber,
    colorDominoHighlighted: checkColor,
    colorDominoNormal: checkColor,

    /* dominoField */
    dominoSize: checkNumberBetween([0, 1]),

    /* Legends */
    // normalLegendLabel: checkString,
    // highlightedLegendLabel: checkString,
  };

  const validateAndRender$5 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$4, options });

    d3__namespace.csv(dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$4, dimensions });

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
        ? renderChart$5({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* eslint-disable no-import-assign */

  function applyInteractionStyles$2({ activeOpacity, inactiveOpacity }) {
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

  function setupChartArea$4({
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

  function initializeTooltip$3() {
    return d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      )
  }

  function parseData$3({ data, yField, xField, seriesField, colorField }) {
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

  function setupScales$3({
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

  function renderXAxis$2({
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

  const searchEventHandler$1 = referenceList => qstr => {
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

  function setupSearch$2({
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
      d3__namespace.selectAll('.series').classed('series-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        d3__namespace.select(`.series-${toClassText(val)}`).classed('series-active', true);
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

  function renderChart$4({
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
    applyInteractionStyles$2({ activeOpacity, inactiveOpacity });

    const coreChartWidth = 1000;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      viewBoxWidth,
    } = setupChartArea$4({
      chartContainerSelector,
      coreChartWidth,
      aspectRatio,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      bgColor,
    });

    const tooltipDiv = initializeTooltip$3();

    const { parsedData, nestedData } = parseData$3({
      data,
      yField,
      xField,
      seriesField,
      colorField,
    });

    const { yScale, xScale, categoryScale, categoryDomain, fillColorScale } =
      setupScales$3({
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

    renderXAxis$2({
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

    const handleSearch = searchEventHandler$1(categoryDomain);
    const search = setupSearch$2({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      seriesField,
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

  const dimensionTypes$3 = {
    xField: [shouldNotBeBlank],
    yField: [shouldBeNumber],
    seriesField: [shouldNotBeBlank],
    colorField: [shouldNotBeBlank],
  };

  const optionTypes$3 = {
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

  const validateAndRender$4 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$3, options });

    d3__namespace.csv(dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$3, dimensions });

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
        ? renderChart$4({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* global window */

  function setupChartArea$3({
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

  function initializeTooltip$2() {
    return d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      )
  }

  function parseData$2({ data, yFields, nameField, xGridField, yGridField }) {
    let maxSum = 0;

    data.forEach(el => {
      let elBucketSum = 0;
      yFields.forEach(b => {
        elBucketSum += Number.parseFloat(el[b]);
      });

      if (elBucketSum > maxSum) {
        maxSum = elBucketSum;
      }
    });
    const maxY = maxSum;

    const dataByCell = {};
    data.forEach(sd => {
      const cell = sd[nameField];
      if (dataByCell[cell]) {
        dataByCell[cell].push(sd);
      } else {
        dataByCell[cell] = [sd];
      }
    });

    const stackedDataByYear = {};
    Object.keys(dataByCell).forEach(cl => {
      stackedDataByYear[cl] = d3__namespace.stack().keys(yFields)(dataByCell[cl]);
    });

    const names = ___default["default"].uniqBy(
      data.map(d => ({
        [nameField]: d[nameField],
        [xGridField]: d[xGridField],
        [yGridField]: d[yGridField],
      })),
      nameField,
    );

    return { maxY, stackedDataByYear, names }
  }

  function setupScales$2({
    data,
    maxY,
    xGridField,
    xGridGap,
    yGridField,
    descending,
    stackHeight,
    xField,
    colorScheme,
    yFields,
    yFieldLabels,
    coreChartWidth,
    coreChartHeight,
  }) {
    const yDomain = [0, maxY];

    const xGridDomain = ___default["default"].uniq(data.map(d => d[xGridField])).sort();

    const xGridScale = d3__namespace
      .scaleBand()
      .domain(xGridDomain)
      .range([0, coreChartWidth])
      .paddingInner(xGridGap);

    const xDomain = ___default["default"].uniq(data.map(d => d[xField])).sort();

    const xScale = d3__namespace
      .scaleBand()
      .domain(xDomain)
      .range([0, xGridScale.bandwidth()]);

    const yGridDomain = ___default["default"].uniq(data.map(d => d[yGridField]));
    const yGridRange = [0, coreChartHeight];

    const yGridScale = d3__namespace
      .scaleBand()
      .domain(yGridDomain)
      .range(descending ? yGridRange.reverse() : yGridRange)
      .paddingInner(1 - stackHeight);

    const yScale = d3__namespace
      .scaleLinear()
      .domain(yDomain)
      .range([yGridScale.bandwidth(), 0]);

    const colorScale = d3__namespace.scaleOrdinal(colorScheme).domain(yFields);
    const colorScaleForLegend = d3__namespace.scaleOrdinal(colorScheme).domain(yFieldLabels);

    return {
      yScale,
      xScale,
      colorScale,
      colorScaleForLegend,
      xGridScale,
      yGridScale,
    }
  }

  function renderLegends({ widgetsRight, colorScaleForLegend }) {
    widgetsRight.html(
      swatches({
        color: colorScaleForLegend,
        uid: 'rs',
        customClass: '',
      }),
    );
  }

  function renderCalendar({
    chartCore,
    names,
    xField,
    xGridScale,
    yGridScale,
    xGridField,
    yGridField,
    tooltipDiv,
    stackedDataByYear,
    nameField,
    colorScale,
    xScale,
    yScale,
    uniqueFieldTimeFormatter,
    uniqueFieldTimeParser,
    uniqueColumnField,
    yFields,
    yFieldLabels,
  }) {
    chartCore
      .selectAll('g.cell')
      .data(names)
      .join('g')
      .attr(
        'transform',
        d =>
          `translate(
          ${xGridScale(d[xGridField])},
          ${yGridScale(d[yGridField])}
        )`,
      )

      .each(function (d) {
        d3__namespace.select(this)
          .selectAll('g')
          .data(stackedDataByYear[d[nameField]])
          .enter()
          .append('g')
          .attr('fill', dd => colorScale(dd.key)) // not to be confused with uniqueColumnField
          .selectAll('rect')
          .data(dd => dd)
          .join('rect')
          .attr('x', dd => xScale(dd.data[xField]))
          .attr('y', dd => yScale(dd[1]))
          .attr('height', dd => yScale(dd[0]) - yScale(dd[1]))
          .attr('width', xScale.bandwidth())
          .on('mouseover', function (e, dd) {
            d3__namespace.select(this.parentNode).raise();
            d3__namespace.select(this).classed('rect-hovered', true).raise();

            tooltipDiv.transition().duration(200).style('opacity', 1);

            const monthYear =
              d3__namespace.timeFormat(uniqueFieldTimeFormatter)(
                d3__namespace.timeParse(uniqueFieldTimeParser)(dd.data[uniqueColumnField]),
              ) || dd.data[uniqueColumnField];
            const values = yFields
              .map(
                (yf, i) =>
                  `<div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${colorScale(
                  yf,
                )}"></div> ${yFieldLabels[i]}: ${d3__namespace.format('.1%')(
                  dd.data[yf],
                )}`,
              )
              .reverse();
            tooltipDiv.html(`<b>${monthYear}</b> <br/> ${values.join('<br/>')}`);
            tooltipDiv
              .style('left', `${e.clientX}px`)
              .style('top', `${e.clientY + 20 + window.scrollY}px`);
          })
          .on('mouseout', function () {
            d3__namespace.select(this).classed('rect-hovered', false);

            tooltipDiv
              .style('left', '-300px')
              .transition()
              .duration(500)
              .style('opacity', 0);
          });
      })
      .append('text')
      .text(d => d[nameField])
      .attr('transform', 'translate(0, -5)')
      .attr('font-size', 14);
  }

  function renderChart$3({
    data,
    options: {
      aspectRatio = 0.8,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = '#fafafa',

      colorScheme = d3__namespace.schemeRdYlGn[yFields.length],

      descending = true,
      yFieldLabels = yFields,

      // Only used in tooltip, not for caclulating scales
      uniqueFieldTimeParser = '%Y%m',
      uniqueFieldTimeFormatter = '%b %Y',

      xGridGap = 0.02,
      stackHeight = 0.5,
    },
    dimensions: {
      xGridField,
      yGridField,
      xField,
      nameField,
      yFields,
      uniqueColumnField,
    },
    chartContainerSelector,
  }) {
    const coreChartWidth = 1000;
    const { svg, coreChartHeight, allComponents, chartCore, widgetsRight } =
      setupChartArea$3({
        chartContainerSelector,
        coreChartWidth,
        aspectRatio,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        bgColor,
      });

    const tooltipDiv = initializeTooltip$2();

    const { maxY, stackedDataByYear, names } = parseData$2({
      data,
      yFields,
      nameField,
      xGridField,
      yGridField,
    });

    const {
      yScale,
      xScale,
      colorScale,
      colorScaleForLegend,
      xGridScale,
      yGridScale,
    } = setupScales$2({
      data,
      maxY,
      xGridField,
      xGridGap,
      yGridField,
      descending,
      stackHeight,
      xField,
      colorScheme,
      yFields,
      yFieldLabels,
      coreChartWidth,
      coreChartHeight,
    });

    renderCalendar({
      chartCore,
      names,
      xField,
      xGridScale,
      yGridScale,
      xGridField,
      yGridField,
      tooltipDiv,
      stackedDataByYear,
      nameField,
      colorScale,
      xScale,
      yScale,
      uniqueFieldTimeFormatter,
      uniqueFieldTimeParser,
      uniqueColumnField,
      yFields,
      yFieldLabels,
    });

    renderLegends({ widgetsRight, colorScaleForLegend });

    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  const dimensionTypes$2 = {
    xGridField: [shouldNotBeBlank],
    yGridField: [shouldNotBeBlank],
    xField: [shouldNotBeBlank],
    nameField: [shouldNotBeBlank],
    uniqueColumnField: [shouldBeUnique], // identifies each column uniquely
    // yFieldsDimensionTypes will be added dynamically
  };

  const optionTypes$2 = {
    aspectRatio: checkNumberBetween([0.01, Number.POSITIVE_INFINITY]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    descending: checkBoolean,
    // colorLegendTitle: checkString,

    stackHeight: checkNumberBetween([0, 1]),

    xGridGap: checkNumberBetween([0, 1]),

    // uniqueFieldTimeParser: checkString,
    // uniqueFieldTimeFormatter: checkString,
    // yFieldLabels: to be added dynamically
  };

  function buildDimensionAndTypes({ dimensions, dimensionTypes, optionTypes }) {
    const yFieldsDimensionTypes = {};
    const yFieldDimensions = {};
    const yFields = dimensions.yFields;

    yFields.forEach((yf, i) => {
      yFieldsDimensionTypes[`__yField${i}__`] = [shouldBeNumber];
      yFieldDimensions[`__yField${i}__`] = yf;
    });

    // after spreading out yFields; needed since yFields is an array unlike other dimensions
    const flatDimensions = { ...dimensions, ...yFieldDimensions };

    const dimensionTypesWYFields = {
      ...dimensionTypes,
      // order: bottom to top; first value's rectangle will be on the bottom
      // the last value's rectangle will be on the top
      ...yFieldsDimensionTypes,
    };

    const optionTypesWYFields = {
      ...optionTypes,
      yFieldLabels: checkStringArray(yFields.length),
      colorScheme: checkColorArray(yFields.length),
    };

    return { flatDimensions, dimensionTypesWYFields, optionTypesWYFields }
  }

  const validateAndRender$3 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;

      const { flatDimensions, dimensionTypesWYFields, optionTypesWYFields } =
        buildDimensionAndTypes({
          dimensions,
          dimensionTypes: dimensionTypes$2,
          optionTypes: optionTypes$2,
        });

      const optionsValidationResult = optionValidation({
        optionTypes: optionTypesWYFields,
        options,
      });

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions: flatDimensions,
      });

      const dataValidations = validateData({
        data,
        dimensionTypes: dimensionTypesWYFields,
        dimensions: flatDimensions,
      });

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
        ? renderChart$3({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  function setupChartArea$2({
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
      .attr('style', 'display: flex; align-items: center; column-gap: 5px;');
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

  function initializeTooltip$1() {
    return d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      )
  }

  /* global window */

  function renderChart$2({
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
      sizeValueFormat = '',

      xDomainCustom = null,
      xAxisLabel = xField,
      xValueFormat = '',

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
    let intervalId;

    applyInteractionStyles$1({ inactiveOpacity });

    const xValueFormatter = val => formatNumber(val, xValueFormat);
    const yValueFormatter = val => formatNumber(val, yValueFormat);
    const sizeValueFormatter = val => formatNumber(val, sizeValueFormat);

    const coreChartWidth = 1000;
    const { svg, coreChartHeight, allComponents, chartCore, widgetsLeft } =
      setupChartArea$2({
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

    const { dataParsed, dataAt, timeDomain, timeDomainLength } = parseData$1({
      data,
      xField,
      yField,
      sizeField,
      timeField,
    });

    const { sizeScale, xScale, yScale, colorScale } = setupScales$1({
      dataParsed,
      sizeField,
      sizeRange,
      xDomainCustom,
      yDomainCustom,
      xField,
      yField,
      colorField,
      coreChartWidth,
      coreChartHeight,
      inbuiltScheme,
      numberOfColors,
    });

    const { startButton, stopButton, rangeSlider, rangeSliderValue } =
      setupWidgets({
        widgetsLeft,
        timeField,
        startButtonClassNames,
        stopButtonClassNames,
      });

    // Initial time value for range value display
    rangeSliderValue.text(timeDomain[0]);

    // Bubbles are stationary initially so disable stop button
    stopButton.node().disabled = true;

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
    });

    const updateCircles = newData => {
      circles
        .data(newData, d => d[nameField])
        .sort((a, b) => d3__namespace.descending(a[sizeField], b[sizeField]))
        .transition()
        .duration(motionDelay)
        .attr('cx', d => xScale(d[xField]))
        .attr('cy', d => yScale(d[yField]))
        .attr('r', d => sizeScale(d[sizeField]));
    };

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
    });

    setupSearch$1({
      widgetsLeft,
      nameField,
      searchButtonClassNames,
      circles,
      sizeField,
    });

    renderXAxis$1({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      xScale,
      xAxisLabel,
    });

    renderYAxis$1({
      chartCore,
      coreChartWidth,
      coreChartHeight,
      yScale,
      yAxisLabel,
    });

    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
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
      .attr('class', startButtonClassNames);

    const stopButton = widgetsLeft
      .append('button')
      .text('Stop')
      .attr('id', '#stop')
      .attr('class', stopButtonClassNames);

    const rangeSliderContainer = widgetsLeft
      .append('div')
      .attr(
        'style',
        'display: flex; flex-direction: column; align-items: center; font-size: 0.75rem',
      );

    // Range slider label
    rangeSliderContainer
      .append('label')
      .text(timeField)
      .attr('for', '#range-slider')
      .attr('style', 'text-transform: capitalize');

    const rangeSlider = rangeSliderContainer
      .append('input')
      .attr('type', 'range')
      .attr('id', 'range-slider');

    const rangeSliderValue = rangeSliderContainer.append('span');

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
      .sort((a, b) => d3__namespace.descending(a[sizeField], b[sizeField]))
      .attr('class', d => `iv-circle iv-circle-${toClassText(d[nameField])}`)
      .attr('cx', d => xScale(d[xField]))
      .attr('cy', d => yScale(d[yField]))
      .attr('r', d => sizeScale(d[sizeField]))
      .attr('fill', d => colorScale(d[colorField]))
      .attr('opacity', activeOpacity)
      .attr('stroke', d => d3__namespace.rgb(colorScale(d[colorField])).darker(0.5))
      .on('mouseover', (e, d) => {
        tooltipDiv.transition().duration(200).style('opacity', 1);
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
      `);
        d3__namespace.select(e.target).attr('stroke-width', 2);
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', e => {
        d3__namespace.select(e.target).attr('stroke-width', 1);
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });
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
        const posInArr = Number.parseInt(e.target.value, 10);
        rangeSliderValue.text(timeDomain[posInArr]);
        updateCircles(dataAt(timeDomain[posInArr]));
      });

    startButton.on('click', () => {
      startButton.node().disabled = true;
      stopButton.node().disabled = false;

      if (
        Number.parseInt(rangeSlider.node().value, 10) ===
        Number.parseInt(timeDomainLength - 1, 10)
      ) {
        rangeSlider.node().value = 0;
        rangeSliderValue.text(timeDomain[0]);
        updateCircles(dataAt(timeDomain[0]));
      }
      intervalId = window.setInterval(() => {
        if (
          Number.parseInt(rangeSlider.node().value, 10) ===
          Number.parseInt(timeDomainLength - 1, 10)
        ) {
          window.clearInterval(intervalId);
          startButton.node().disabled = false;
          stopButton.node().disabled = true;
          return
        }
        rangeSlider.node().value++;
        const posInArr = Number.parseInt(rangeSlider.node().value, 10);
        rangeSliderValue.text(timeDomain[posInArr]);
        updateCircles(dataAt(timeDomain[posInArr]));
      }, motionDelay);
    });

    stopButton.on('click', () => {
      stopButton.node().disabled = true;
      startButton.node().disabled = false;
      window.clearInterval(intervalId);
    });
  }

  function setupSearch$1({
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
      .attr('class', searchButtonClassNames);

    function searchBy(term) {
      if (term) {
        d3__namespace.select('.group-circles').classed('searching', true);
        const matchedCircles = [];
        circles.classed('s-match', d => {
          const bool = d[nameField].toLowerCase().includes(term.toLowerCase());
          if (bool) {
            matchedCircles.push(`.iv-circle-${toClassText(d[nameField])}`);
          }
          return bool
        });
        // Raise all matched circles so that
        // hovering over them doesn't cause other circle's tooltip
        // to be highlighted
        matchedCircles.forEach(m => {
          d3__namespace.select(m).raise();
        });
      } else {
        d3__namespace.select('.group-circles').classed('searching', false);

        // Put circles back in order after raising matched circles
        circles.sort((a, b) => d3__namespace.descending(a[sizeField], b[sizeField]));
      }
    }

    search.on('keyup', e => {
      searchBy(e.target.value.trim());
    });
  }

  function applyInteractionStyles$1({ inactiveOpacity }) {
    d3__namespace.select('body').append('style').html(`
  .group-circles.searching > .iv-circle:not(.s-match) {
    opacity: ${inactiveOpacity};
  }
  .group-circles.searching > .iv-circle.s-match {
    stroke: #333;
  }
  `);
  }

  function parseData$1({ data, xField, yField, sizeField, timeField }) {
    const dataParsed = data.map(d => ({
      ...d,
      [sizeField]: Number.parseFloat(d[sizeField]),
      [xField]: Number.parseFloat(d[xField]),
      [yField]: Number.parseFloat(d[yField]),
    }));

    const dataAt = loc => {
      return data.filter(d => d[timeField] === loc)
    };
    const timeDomain = ___default["default"].uniq(___default["default"].map(data, timeField)).sort();
    const timeDomainLength = timeDomain.length;

    return { dataParsed, dataAt, timeDomain, timeDomainLength }
  }

  function setupScales$1({
    dataParsed,
    sizeField,
    sizeRange,
    xDomainCustom,
    yDomainCustom,
    xField,
    yField,
    colorField,
    coreChartWidth,
    coreChartHeight,
    inbuiltScheme,
    numberOfColors,
  }) {
    const sizes = dataParsed.map(d => d[sizeField]);
    const sizeDomain = d3__namespace.extent(sizes);
    const sizeScale = sizeField
      ? d3__namespace.scaleSqrt().domain([0, sizeDomain[1]]).range(sizeRange)
      : () => sizeRange[0];

    const xDomain = xDomainCustom || d3__namespace.extent(dataParsed.map(d => d[xField]));
    const yDomain = yDomainCustom || d3__namespace.extent(dataParsed.map(d => d[yField]));

    const xScale = d3__namespace.scaleLinear().domain(xDomain).range([0, coreChartWidth]);
    const yScale = d3__namespace.scaleLinear().range([coreChartHeight, 0]).domain(yDomain);
    // .nice()

    const colorDomain = ___default["default"].uniq(___default["default"].map(dataParsed, colorField));
    const colorScale = d3__namespace.scaleOrdinal(
      colorDomain,
      d3__namespace[inbuiltScheme][numberOfColors],
    );

    return { sizeScale, xScale, yScale, colorScale }
  }

  function renderXAxis$1({
    chartCore,
    coreChartHeight,
    coreChartWidth,
    xScale,
    xAxisLabel,
  }) {
    const xAxis = chartCore.append('g').attr('class', 'x-axis').lower();

    xAxis
      .attr('transform', `translate(0, ${coreChartHeight})`)
      .call(d3__namespace.axisBottom(xScale).tickSize(-coreChartHeight - 6))
      .style('color', '#777')
      .call(g => {
        g.selectAll('.tick line')
          .style('color', '#ddd')
          .attr('transform', `translate(0, ${6})`);
        g.selectAll('.tick text').attr('transform', `translate(0, ${6})`);
        g.select('.domain').remove();
      });

    xAxis
      .append('text')
      .attr('transform', `translate(${coreChartWidth / 2}, 35)`)
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'top')
      .style('fill', '#333')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(xAxisLabel);
  }

  function renderYAxis$1({
    chartCore,
    coreChartWidth,
    coreChartHeight,
    yScale,
    yAxisLabel,
  }) {
    const yAxis = chartCore.append('g').attr('class', 'y-axis').lower();

    yAxis
      .append('g')
      .call(d3__namespace.axisLeft(yScale).tickSize(-coreChartWidth - 6))
      .style('color', '#777')
      .call(g => {
        g.selectAll('.tick line')
          .style('color', '#ddd')
          .attr('transform', 'translate(-6, 0)');
        g.selectAll('.tick text').attr('transform', 'translate(-6, 0)');
        g.select('.domain').remove();
      })
      .attr('class', 'y-axis');

    yAxis
      .append('text')
      .attr('transform', `translate(-35, ${coreChartHeight / 2}), rotate(-90)`)
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'hanging')
      .style('fill', '#333')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(yAxisLabel);
  }

  const dimensionTypes$1 = {
    sizeField: [], // can be empty (if not provided first value in sizeRange will be picked)
    xField: [shouldNotBeBlank, shouldBeNumber],
    yField: [shouldNotBeBlank, shouldBeNumber],
    timeField: [shouldNotBeBlank],
    nameField: [shouldNotBeBlank],
    colorField: [], // can be empty (if not provided, first color from scheme will be picked)
  };

  const optionTypes$1 = {
    aspectRatio: checkNumberBetween([0.01, Number.POSITIVE_INFINITY]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    sizeRange: checkNumericArray,
    xDomainCustom: checkNumericArray,
    yDomainCustom: checkNumericArray,

    inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
    numberOfColors: checkNumberBetween([3, 9]), // minumum: 3, maximum: 9

    // xAxisLabel: xField,
    // yAxisLabel: yField,

    // startButtonClassNames: '',
    // stopButtonClassNames: '',
    // searchButtonClassNames: '',
  };

  const validateAndRender$2 = ({
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
    });
  };

  /* eslint-disable no-import-assign */

  function applyInteractionStyles({ inactiveOpacity, activeOpacity }) {
    d3__namespace.select('body').append('style').html(`
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

  function initializeTooltip() {
    return d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      )
  }

  function parseData({ data, dominoField, initialState }) {
    const allDominoFieldValues = ___default["default"].chain(data).map(dominoField).uniq().value();
    const dominoValues = ___default["default"](data).map(dominoField).uniq().value();
    const defaultStateAll = initialState === 'All' ? dominoValues : initialState;
    return { allDominoFieldValues, defaultStateAll }
  }

  function setupScales({
    data,
    xField,
    yField,
    sizeField,
    colorField,
    colorRange,
    colorDomain,
    xDomain,
    coreChartWidth,
    coreChartHeight,
    yPaddingOuter,
    dominoHeight,
    sizeScaleType,
    sizeScaleLogBase,
    sizeRange,
  }) {
    const yPaddingInner = 1 - dominoHeight;
    const yScale = d3__namespace
      .scaleBand()
      .range([0, coreChartHeight])
      .paddingInner(yPaddingInner)
      .paddingOuter(yPaddingOuter);

    const xScale = d3__namespace.scaleLinear().range([0, coreChartWidth]);
    const sizeScale =
      sizeScaleType === 'log'
        ? d3__namespace
            .scaleLog()
            .base(sizeScaleLogBase || 10)
            .range(sizeRange)
        : d3__namespace.scaleLinear().range(sizeRange);

    // TODO: provide options to sort and reverse the y domain
    const yDomain = ___default["default"].chain(data).map(yField).uniq().value().sort();
    const xDomainDefault = d3__namespace.extent(
      ___default["default"].chain(data)
        .map(xField)
        .uniq()
        .value(t => Number.parseFloat(t)),
    );

    yScale.domain(yDomain);
    // Set xDomain to custom if available, if not stick to default
    // And make a copy with .slice
    xScale.domain((xDomain || xDomainDefault).slice());

    const sizeDomain = d3__namespace.extent(
      ___default["default"].chain(data)
        .map(sizeField)
        .uniq()
        .value(t => Number.parseFloat(t)),
    );

    sizeScale.domain(sizeDomain);

    const colorDomainFromData = d3__namespace.extent(
      data.map(d => Number.parseFloat(d[colorField])),
    );

    const chooseColors = [0, 2, 3, 6];

    const colorRangeDefault = d3__namespace.schemeSpectral[9]
      .filter((c, i) => chooseColors.indexOf(i) > -1)
      .slice()
      .reverse();

    // Note: number of colors is decided by length of .range(<this value>)
    const colorScale = d3__namespace
      .scaleQuantize()
      .range(colorRange || colorRangeDefault)
      .domain(colorDomain || colorDomainFromData)
      .nice();

    return {
      xScale,
      yScale,
      colorScale,
      sizeScale,
      yDomain,
    }
  }

  function renderYAxis({
    chartCore,
    xScale,
    xDomain,
    yScale,
    formatDate,
    yAxisDateParser,
    yAxisDateFormatter,
  }) {
    chartCore
      .append('g')
      .attr('class', 'y-axis-right')
      .attr('transform', `translate(${xScale(xDomain[1]) + 20}, 0)`)
      .call(
        d3__namespace
          .axisRight(yScale)
          .tickSize(0)
          .tickFormat(val =>
            formatDate(val, yAxisDateParser, yAxisDateFormatter),
          ),
      )
      .call(g => g.select('.domain').remove());
  }

  function renderXAxis({
    chartCore,
    xAxisLabel,
    coreChartWidth,
    xAxisLabelOffset,
    yScale,
    yDomain,
    xScale,
    coreChartHeight,
    formatNumber,
    xAxisValueFormatter,
  }) {
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
      .style('text-transform', 'capitalize');

    // TODO top and bottom xAxis - Link it to xAxisLocations (this is only top)
    // X-Axis
    chartCore
      .append('g')
      .attr('class', 'x-axis-top')
      .attr('transform', `translate(0, ${yScale(yDomain[0]) - 30})`)
      .call(
        d3__namespace
          .axisTop(xScale)
          .tickSize(-coreChartHeight)
          .tickFormat(val => formatNumber(val, xAxisValueFormatter)),
      )
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2));
  }

  function renderDominosAndRibbons({
    data,
    yField,
    sizeField,
    sizeScale,
    xAxisValueFormatter,
    yAxisDateParser,
    yAxisDateFormatter,
    sizeValueFormatter,
    chartCore,
    yScale,
    dominoField,
    xScale,
    xField,
    colorScale,
    colorField,
    tooltipDiv,
    allDominoFieldValues,
    defaultStateAll,
  }) {
    const allConnectors = chartCore.append('g').attr('class', 'g-ribbons');

    const dataWithCoordinates = [];
    data.forEach(d => {
      const x0 = xScale(d[xField]) - sizeScale(d[sizeField]) / 2;
      const x1 = x0 + sizeScale(d[sizeField]);
      const y0 = yScale(d[yField]);
      dataWithCoordinates.push(
        { ...d, x0, x1, y0 },
        { ...d, x0, x1, y0: y0 + yScale.bandwidth() },
      );
    });
    const ribbonArea = d3__namespace
      .area()
      .curve(d3__namespace.curveMonotoneY)
      .y(d => d.y0)
      .x0(d => d.x0)
      .x1(d => d.x1);

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
      ${defaultStateAll.includes(d[dominoField]) ? 'domino-active' : ''}
    `,
      )
      .attr('x', d => xScale(d[xField]) - sizeScale(d[sizeField]) / 2)
      .attr('y', d => yScale(d[yField]))
      .attr('width', d => sizeScale(d[sizeField]))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(Number.parseFloat(d[colorField])))
      .attr('stroke', d =>
        d3__namespace.rgb(colorScale(Number.parseFloat(d[colorField]))).darker(0.5),
      )
      .on('mouseover', (e, d) => {
        const xFieldValue = formatNumber(d[xField], xAxisValueFormatter);
        const yFieldValue = formatDate(
          d[yField],
          yAxisDateParser,
          yAxisDateFormatter,
        );
        const sizeFieldValue = formatNumber(d[sizeField], sizeValueFormatter);
        tooltipDiv.transition().duration(200).style('opacity', 1);

        tooltipDiv.html(
          `<div>${d[dominoField]} (${yFieldValue})</div>
          <div style="text-transform: capitalize">${xField}: ${xFieldValue}</div>
          <div style="text-transform: capitalize">${sizeField}: ${sizeFieldValue}</div>
         </div>`,
        );

        d3__namespace.select(e.target).raise();

        const dominoGroupCode = toClassText(d[dominoField]);
        d3__namespace.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-hovered', true);
        d3__namespace.selectAll(`.domino-${dominoGroupCode}`)
          .raise()
          .classed('domino-hovered', true);
        d3__namespace.select('.g-ribbons').classed('hovered', true);

        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', (e, d) => {
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
        const dominoGroupCode = toClassText(d[dominoField]);
        d3__namespace.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-hovered', false);
        d3__namespace.selectAll(`.domino-${dominoGroupCode}`).classed(
          'domino-hovered',
          false,
        );
        d3__namespace.select(e.target).lower();
        d3__namespace.select('.g-ribbons').classed('hovered', false);
      })
      .on('click', (e, d) => {
        const dominoGroupCode = toClassText(d[dominoField]);
        const clickedState = d3__namespace
          .select(`.ribbon-${dominoGroupCode}`)
          .classed('ribbon-active');
        d3__namespace.select(`.ribbon-${dominoGroupCode}`).classed(
          'ribbon-active',
          !clickedState,
        );
      });

    allConnectors
      .selectAll('path')
      .data(___default["default"].chain(data).map(dominoField).uniq().value())
      .join('path')
      .attr('fill', d => `url(#gradient-${toClassText(d)})`)
      .attr(
        'class',
        d => `
      ribbon
      ribbon-${toClassText(d)}
      ${defaultStateAll.includes(d) ? 'ribbon-active' : ''}`,
      )
      .attr('d', d =>
        ribbonArea(___default["default"].filter(dataWithCoordinates, { [dominoField]: d })),
      )
      .on('mouseover', (e, d) => {
        const dominoGroupCode = toClassText(d);
        d3__namespace.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-hovered', true);
        d3__namespace.selectAll(`.domino-${dominoGroupCode}`)
          .classed('domino-hovered', true)
          .raise();
        d3__namespace.select('.g-ribbons').classed('hovered', true);
      })
      .on('mouseout', (e, d) => {
        const dominoGroupCode = toClassText(d);
        d3__namespace.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-hovered', false);
        d3__namespace.selectAll(`.domino-${dominoGroupCode}`)
          .classed('domino-hovered', false)
          .lower();
        d3__namespace.select('.g-ribbons').classed('hovered', false);
      })
      .on('click', e => {
        const clickedState = d3__namespace.select(e.target).classed('ribbon-active');
        d3__namespace.select(e.target).classed('ribbon-active', !clickedState);
      });

    const gradientContainer = chartCore.append('defs');
    // linear gradient
    allDominoFieldValues.forEach(val => {
      const gradient = gradientContainer
        .append('linearGradient')
        .attr('id', `gradient-${toClassText(val)}`)
        .attr('x1', '100%')
        .attr('x2', '100%')
        .attr('y1', '0%')
        .attr('y2', '100%');

      const singleDominoFieldValues = ___default["default"].chain(dataWithCoordinates)
        .filter({ [dominoField]: val })
        .sortBy()
        .value();

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
          .attr('stop-color', colorScale(d[colorField]));
      });
    });
  }

  const searchEventHandler = referenceList => qstr => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        const dominoGroupCode = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          d3__namespace.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-matched', true);
          d3__namespace.selectAll(`.domino-${dominoGroupCode}`).classed(
            'domino-matched',
            true,
          );

          d3__namespace.select('.g-ribbons').classed('searching', true);
        } else {
          d3__namespace.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-matched', false);
          d3__namespace.selectAll(`.domino-${dominoGroupCode}`).classed(
            'domino-matched',
            false,
          );
        }
      });
    } else {
      referenceList.forEach(val => {
        const dominoGroupCode = toClassText(val);
        d3__namespace.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-matched', false);

        d3__namespace.selectAll(`.domino-${dominoGroupCode}`).classed(
          'domino-matched',
          false,
        );
      });
      d3__namespace.select('.g-ribbons').classed('searching', false);
    }
  };

  function renderColorLegend({
    colorScale,
    colorLegendLabel,
    widgetsRight,
    colorField,
    colorLegendValueFormatter,
  }) {
    widgetsRight.append(() =>
      legend({
        color: colorScale,
        title: colorLegendLabel || ___default["default"].capitalize(colorField),
        width: 260,
        tickFormat: val => formatNumber(val, colorLegendValueFormatter),
      }),
    );
  }

  function renderSizeLegend({
    widgetsRight,
    sizeLegendValues,
    sizeLegendMoveSymbolsDownBy,
    sizeScale,
    sizeLegendGapInSymbols,
    sizeLegendValueFormatter,
    sizeLegendLabel,
  }) {
    const sizeLegend = widgetsRight.append('svg');
    const sizeLegendContainerGroup = sizeLegend.append('g');
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
      .attr('x', (d, i) => sizeScale(d) + i * sizeLegendGapInSymbols);

    sizeLegendContainerGroup
      .selectAll('.g-size-dominos')
      .append('text')
      .attr('dy', 35)
      .attr('dx', (d, i) => 1.5 * sizeScale(d) + i * sizeLegendGapInSymbols)
      .attr('text-anchor', 'middle')
      .style('font-size', 8)
      .text(d => formatNumber(d, sizeLegendValueFormatter));

    sizeLegendContainerGroup
      .append('text')
      .attr('alignment-baseline', 'hanging')
      .style('font-size', 10)
      .style('font-weight', 600)
      .text(sizeLegendLabel);

    const legendBoundingBox = sizeLegendContainerGroup.node().getBBox();
    sizeLegend
      .attr('height', legendBoundingBox.height)
      .attr('width', legendBoundingBox.width);
  }

  function setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    dominoField,
  }) {
    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);
    search.attr('placeholder', `Find by ${dominoField}`);
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
    goToInitialState.on('click', () => {
      d3__namespace.selectAll('.ribbon').classed('ribbon-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        d3__namespace.select(`.ribbon-${toClassText(val)}`).classed('ribbon-active', true);
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
    clearAll.on('click', () => {
      d3__namespace.selectAll('.ribbon').classed('ribbon-active', false);
      search.node().value = '';
      handleSearch('');
    });
  }

  function renderChart$1({
    data,
    options: {
      aspectRatio = 0.8,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      sizeLegendLabel = ___default["default"].capitalize(sizeField),

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

      initialState = [],

      activeOpacity = 1,
      inactiveOpacity = 0.1,

      searchInputClassNames = '',
      goToInitialStateButtonClassNames = '',
      clearAllButtonClassNames = '',
    },
    dimensions: { xField, yField, dominoField, sizeField, colorField },

    chartContainerSelector,
  }) {
    applyInteractionStyles({ inactiveOpacity, activeOpacity });

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

    const tooltipDiv = initializeTooltip();

    const { allDominoFieldValues, defaultStateAll } = parseData({
      data,
      dominoField,
      initialState,
    });

    const { xScale, yScale, colorScale, sizeScale, yDomain } = setupScales({
      data,
      xField,
      yField,
      sizeField,
      colorField,
      colorRange,
      colorDomain,
      xDomain,
      coreChartWidth,
      coreChartHeight,
      yPaddingOuter,
      dominoHeight,
      sizeScaleType,
      sizeScaleLogBase,
      sizeRange,
    });

    renderXAxis({
      chartCore,
      xAxisLabel,
      coreChartWidth,
      xAxisLabelOffset,
      yScale,
      yDomain,
      xScale,
      coreChartHeight,
      formatNumber,
      xAxisValueFormatter,
    });

    renderYAxis({
      chartCore,
      xScale,
      xDomain,
      yScale,
      formatDate,
      yAxisDateParser,
      yAxisDateFormatter,
    });

    renderDominosAndRibbons({
      data,
      yField,
      sizeField,
      sizeScale,
      xAxisValueFormatter,
      yAxisDateParser,
      yAxisDateFormatter,
      sizeValueFormatter,
      chartCore,
      yScale,
      dominoField,
      xScale,
      xField,
      colorScale,
      colorField,
      tooltipDiv,
      allDominoFieldValues,
      defaultStateAll,
    });

    const handleSearch = searchEventHandler(allDominoFieldValues);
    const search = setupSearch({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      dominoField,
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

    // Legends
    renderColorLegend({
      colorScale,
      colorLegendLabel,
      widgetsRight,
      colorField,
      colorLegendValueFormatter,
    });

    renderSizeLegend({
      widgetsRight,
      sizeLegendValues,
      sizeLegendMoveSymbolsDownBy,
      sizeScale,
      sizeLegendGapInSymbols,
      sizeLegendValueFormatter,
      sizeLegendLabel,
    });

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  const dimensionTypes = {
    xField: [shouldBeNumber],
    yField: [shouldNotBeBlank],
    dominoField: [shouldNotBeBlank],
    sizeField: [shouldBeNumber],
    colorField: [shouldBeNumber],
  };

  const optionTypes = {
    aspectRatio: checkNumberBetween([0, Number.POSITIVE_INFINITY]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    xDomain: checkNumericArray,
    // xAxisLabel: checkString,
    xAxisLabelOffset: checkNumber,
    // xAxisValueFormatter:  checkString, //'',
    dominoHeight: checkNumberBetween([0, 1]),
    // yAxisDateParser: checkString, // '%Y-Q%q',
    // yAxisDateFormatter: checkString, // "Q%q'%y", // Date formatter options: https://github.com/d3/d3-time-format

    sizeScaleType: checkOneOf(['log', 'linear']), // default is scaleLinear if not provided. Can be changed to scaleLog
    sizeRange: checkNumericArray,
    // sizeLegendLabel: checkString,
    sizeLegendValues: checkNumericArray,
    sizeLegendGapInSymbols: checkNumber,
    sizeLegendMoveSymbolsDownBy: checkNumber,
    // sizeLegendValueFormatter:  checkString, // '',

    colorDomain: checkNumericArray,
    // colorLegendValueFormatter: checkString, // ,'.2s',
    // colorLegendLabel: checkString,
    colorRange: checkColorArray(),

    initialState: checkDefaultState,

    activeOpacity: checkNumberBetween([0, 1]),
    inactiveOpacity: checkNumberBetween([0, 1]),
  };

  const validateAndRender$1 = ({
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
        ? renderChart$1({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  const usStatesAndCountiesTopo={type:"Topology",bbox:[-57.66491068874468,12.97635452036684,957.5235629133763,606.5694262668667],transform:{scale:[.010151986255883769,.005935990077365771],translate:[-57.66491068874468,12.97635452036684]},objects:{counties:{type:"GeometryCollection",geometries:[{type:"Polygon",arcs:[[0,1,2,3,4,5,6,7]],id:"04015",properties:{name:"Mohave"}},{type:"Polygon",arcs:[[8,9,10,11,12,13,14]],id:"22105",properties:{name:"Tangipahoa"}},{type:"Polygon",arcs:[[15,16,17,18,19]],id:"16063",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[20,21,22,23,24,25,26,27,28]],id:"27119",properties:{name:"Polk"}},{type:"Polygon",arcs:[[29,30,31,32,33,34,35]],id:"38017",properties:{name:"Cass"}},{type:"Polygon",arcs:[[36,37,38,39,40]],id:"46081",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[41,42,43,44,45,46]],id:"36095",properties:{name:"Schoharie"}},{type:"MultiPolygon",arcs:[[[47,48,49,50]],[[51]],[[52]]],id:"02275",properties:{name:"Wrangell"}},{type:"Polygon",arcs:[[53,54,55,56]],id:"13143",properties:{name:"Haralson"}},{type:"Polygon",arcs:[[57,58,59,60,61]],id:"13023",properties:{name:"Bleckley"}},{type:"Polygon",arcs:[[62,63,64,65,66,67]],id:"18093",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[68,69,70,71,72,73]],id:"18079",properties:{name:"Jennings"}},{type:"Polygon",arcs:[[74,75,76,77,78,79]],id:"26087",properties:{name:"Lapeer"}},{type:"Polygon",arcs:[[80,81,82,83,84,85]],id:"28017",properties:{name:"Chickasaw"}},{type:"Polygon",arcs:[[86,87,88,89,90,91]],id:"39033",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[92,93,94,95,96,97,98]],id:"46099",properties:{name:"Minnehaha"}},{type:"Polygon",arcs:[[99,-98,100,101,102,103]],id:"46125",properties:{name:"Turner"}},{type:"Polygon",arcs:[[104,105,106,107,108,109]],id:"48471",properties:{name:"Walker"}},{type:"Polygon",arcs:[[110,111,112,113,114,115]],id:"46003",properties:{name:"Aurora"}},{type:"Polygon",arcs:[[116,117,118,119,120,121,122]],id:"48047",properties:{name:"Brooks"}},{type:"Polygon",arcs:[[123,124,125,126,127]],id:"31029",properties:{name:"Chase"}},{type:"Polygon",arcs:[[128,129,130,131,132,133]],id:"08021",properties:{name:"Conejos"}},{type:"Polygon",arcs:[[134,135,136,137,138,139,140,141]],id:"24043",properties:{name:"Washington"}},{type:"Polygon",arcs:[[142,143,144,145,146,147]],id:"20137",properties:{name:"Norton"}},{type:"Polygon",arcs:[[148,149,150,151,152,153]],id:"17053",properties:{name:"Ford"}},{type:"Polygon",arcs:[[154,155,156,157,158,159]],id:"48117",properties:{name:"Deaf Smith"}},{type:"Polygon",arcs:[[160,161,162,163,164,165,166,167]],id:"13261",properties:{name:"Sumter"}},{type:"Polygon",arcs:[[168,169,170,171,172,173]],id:"55075",properties:{name:"Marinette"}},{type:"Polygon",arcs:[[174,175,176,177,178]],id:"06069",properties:{name:"San Benito"}},{type:"Polygon",arcs:[[179,180,181,182,183,184,185]],id:"13199",properties:{name:"Meriwether"}},{type:"Polygon",arcs:[[186,187,188,189,190,191]],id:"19013",properties:{name:"Black Hawk"}},{type:"Polygon",arcs:[[192,193,194,195]],id:"19081",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[196,-23]],id:"27125",properties:{name:"Red Lake"}},{type:"Polygon",arcs:[[197,198,199,200,201]],id:"31125",properties:{name:"Nance"}},{type:"Polygon",arcs:[[202,203,204,205]],id:"42075",properties:{name:"Lebanon"}},{type:"Polygon",arcs:[[206,207,208,209]],id:"48219",properties:{name:"Hockley"}},{type:"Polygon",arcs:[[210,211,212,213,214,215]],id:"48417",properties:{name:"Shackelford"}},{type:"Polygon",arcs:[[216,217,218,219,220,221,222]],id:"48451",properties:{name:"Tom Green"}},{type:"Polygon",arcs:[[223,224,225,226,227,228]],id:"48497",properties:{name:"Wise"}},{type:"Polygon",arcs:[[229,230,231,-93,232,233]],id:"46079",properties:{name:"Lake"}},{type:"Polygon",arcs:[[234,235,236,237,238,239,240]],id:"46069",properties:{name:"Hyde"}},{type:"Polygon",arcs:[[241,242,243,244,245,246]],id:"48101",properties:{name:"Cottle"}},{type:"Polygon",arcs:[[247,248,249]],id:"04023",properties:{name:"Santa Cruz"}},{type:"Polygon",arcs:[[250,251,252,253,254]],id:"19179",properties:{name:"Wapello"}},{type:"Polygon",arcs:[[255,256,257,258,259,260]],id:"19031",properties:{name:"Cedar"}},{type:"Polygon",arcs:[[261,262,263,264,265,266,267]],id:"30033",properties:{name:"Garfield"}},{type:"Polygon",arcs:[[268,269,270,271,272,273,274]],id:"29185",properties:{name:"St. Clair"}},{type:"Polygon",arcs:[[275,276,277,278,279]],id:"12091",properties:{name:"Okaloosa"}},{type:"Polygon",arcs:[[280,281,282,283,284]],id:"21219",properties:{name:"Todd"}},{type:"Polygon",arcs:[[285,286,287,288,289]],id:"23003",properties:{name:"Aroostook"}},{type:"Polygon",arcs:[[290,291,292,-142,293,294,295,296]],id:"24001",properties:{name:"Allegany"}},{type:"Polygon",arcs:[[297,298,299,300,301]],id:"28075",properties:{name:"Lauderdale"}},{type:"Polygon",arcs:[[302,303,304,305,306,307]],id:"38021",properties:{name:"Dickey"}},{type:"Polygon",arcs:[[308,309,310,311,312]],id:"27093",properties:{name:"Meeker"}},{type:"Polygon",arcs:[[313,314,315,316]],id:"46007",properties:{name:"Bennett"}},{type:"Polygon",arcs:[[317,318,319,320,321,322,323,324]],id:"49043",properties:{name:"Summit"}},{type:"Polygon",arcs:[[325,326,327,328,329,330]],id:"36099",properties:{name:"Seneca"}},{type:"Polygon",arcs:[[331,332,333,334,335,336,337]],id:"20073",properties:{name:"Greenwood"}},{type:"Polygon",arcs:[[338,339,340,341]],id:"20101",properties:{name:"Lane"}},{type:"Polygon",arcs:[[342,343,344,345,346,347]],id:"26123",properties:{name:"Newaygo"}},{type:"Polygon",arcs:[[348,349,350,351,352,353]],id:"31035",properties:{name:"Clay"}},{type:"Polygon",arcs:[[354,355,356,357]],id:"36073",properties:{name:"Orleans"}},{type:"Polygon",arcs:[[358,359,360,361,362,363,364]],id:"38063",properties:{name:"Nelson"}},{type:"Polygon",arcs:[[365,366,367,368,369,370]],id:"40011",properties:{name:"Blaine"}},{type:"Polygon",arcs:[[371,372,373,374,375]],id:"48441",properties:{name:"Taylor"}},{type:"Polygon",arcs:[[376,377,378,379,380]],id:"48011",properties:{name:"Armstrong"}},{type:"Polygon",arcs:[[381,382,383,384]],id:"48233",properties:{name:"Hutchinson"}},{type:"Polygon",arcs:[[-222,385,386,387]],id:"48235",properties:{name:"Irion"}},{type:"Polygon",arcs:[[388,389,390,391,392,393]],id:"55137",properties:{name:"Waushara"}},{type:"Polygon",arcs:[[394,395,396,397,398,399,400]],id:"47151",properties:{name:"Scott"}},{type:"Polygon",arcs:[[401,402,403,404,405]],id:"55113",properties:{name:"Sawyer"}},{type:"Polygon",arcs:[[406,407,408,409,410]],id:"26073",properties:{name:"Isabella"}},{type:"Polygon",arcs:[[411,412,413,414,415,416]],id:"28131",properties:{name:"Stone"}},{type:"Polygon",arcs:[[417,418,-86,419,420,421]],id:"28013",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[422,423,424,425,426]],id:"31171",properties:{name:"Thomas"}},{type:"Polygon",arcs:[[427,428,429,430,431,432]],id:"48335",properties:{name:"Mitchell"}},{type:"Polygon",arcs:[[433,434,435,436,437]],id:"08057",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[438,439,440,441,442]],id:"19089",properties:{name:"Howard"}},{type:"Polygon",arcs:[[443,444,445,446,-75]],id:"26151",properties:{name:"Sanilac"}},{type:"Polygon",arcs:[[447,448,449,450,451,452,453]],id:"18075",properties:{name:"Jay"}},{type:"Polygon",arcs:[[454,455,456,457,458]],id:"38075",properties:{name:"Renville"}},{type:"Polygon",arcs:[[459,460,461,462,463]],id:"41021",properties:{name:"Gilliam"}},{type:"Polygon",arcs:[[464,465,466,467,468]],id:"29119",properties:{name:"McDonald"}},{type:"Polygon",arcs:[[469,470,471,472]],id:"48501",properties:{name:"Yoakum"}},{type:"Polygon",arcs:[[473,474,475,-243,476]],id:"48075",properties:{name:"Childress"}},{type:"Polygon",arcs:[[477,478,479,480]],id:"13097",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[481,482,483,484]],id:"02158",properties:{name:"Kusilvak"}},{type:"Polygon",arcs:[[485,486,487,488,489]],id:"19181",properties:{name:"Warren"}},{type:"Polygon",arcs:[[490,491,492,493,494,495]],id:"40031",properties:{name:"Comanche"}},{type:"Polygon",arcs:[[496,497,498,499,500,501,502,503]],id:"40009",properties:{name:"Beckham"}},{type:"Polygon",arcs:[[-238,504,505,506,507]],id:"46017",properties:{name:"Buffalo"}},{type:"Polygon",arcs:[[508,509,510,511,512,513]],id:"48171",properties:{name:"Gillespie"}},{type:"Polygon",arcs:[[514,515,516,517]],id:"48125",properties:{name:"Dickens"}},{type:"Polygon",arcs:[[518,519,520,521,522]],id:"48283",properties:{name:"La Salle"}},{type:"Polygon",arcs:[[523,524,525,526]],id:"54093",properties:{name:"Tucker"}},{type:"Polygon",arcs:[[527,528,529,530,531,532]],id:"06089",properties:{name:"Shasta"}},{type:"Polygon",arcs:[[533,534,535,536,537,538]],id:"17165",properties:{name:"Saline"}},{type:"Polygon",arcs:[[539,540,541,542,543]],id:"26101",properties:{name:"Manistee"}},{type:"Polygon",arcs:[[544,545,546,547,548]],id:"31071",properties:{name:"Garfield"}},{type:"Polygon",arcs:[[549,550,-548,551,552,553,554,555,556]],id:"31041",properties:{name:"Custer"}},{type:"Polygon",arcs:[[557,-234,558,559,560]],id:"46097",properties:{name:"Miner"}},{type:"Polygon",arcs:[[561,562,563,564,565,566]],id:"46025",properties:{name:"Clark"}},{type:"Polygon",arcs:[[567,568,569,570,571]],id:"05037",properties:{name:"Cross"}},{type:"Polygon",arcs:[[572,573,574,-134,575,576,577]],id:"08007",properties:{name:"Archuleta"}},{type:"Polygon",arcs:[[578,579,580,581]],id:"12043",properties:{name:"Glades"}},{type:"Polygon",arcs:[[582,583,584,585,586]],id:"46053",properties:{name:"Gregory"}},{type:"Polygon",arcs:[[587,588,589,-382,590]],id:"48195",properties:{name:"Hansford"}},{type:"MultiPolygon",arcs:[[[591,592,593,594,595]],[[596,597,598]]],id:"53053",properties:{name:"Pierce"}},{type:"Polygon",arcs:[[599,600,601,-180,602,603,604]],id:"13077",properties:{name:"Coweta"}},{type:"Polygon",arcs:[[605,606,607,608]],id:"13059",properties:{name:"Clarke"}},{type:"Polygon",arcs:[[609,610,611,612,613]],id:"18081",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[614,615,616,617,618,619]],id:"20115",properties:{name:"Marion"}},{type:"Polygon",arcs:[[620,621,622,623,624]],id:"27059",properties:{name:"Isanti"}},{type:"Polygon",arcs:[[625,626,627,628,629,630]],id:"31003",properties:{name:"Antelope"}},{type:"Polygon",arcs:[[631,632,633,634,635]],id:"39103",properties:{name:"Medina"}},{type:"Polygon",arcs:[[636,637,638,639,640,641]],id:"47153",properties:{name:"Sequatchie"}},{type:"Polygon",arcs:[[642,643,644,645]],id:"48375",properties:{name:"Potter"}},{type:"Polygon",arcs:[[646,647,648,649,650]],id:"48145",properties:{name:"Falls"}},{type:"Polygon",arcs:[[-362,651,652,653,654,655]],id:"38039",properties:{name:"Griggs"}},{type:"Polygon",arcs:[[-114,656,657,658]],id:"46043",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[659,660,661,662,663,664]],id:"48193",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[665,666,667,668,669]],id:"19185",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[670,671,672,673,674,675,676]],id:"38087",properties:{name:"Slope"}},{type:"Polygon",arcs:[[677,-375,678,679,-219,680]],id:"48399",properties:{name:"Runnels"}},{type:"Polygon",arcs:[[681,682,683,684,685,-4]],id:"04005",properties:{name:"Coconino"}},{type:"Polygon",arcs:[[686,687,688,689,690]],id:"16009",properties:{name:"Benewah"}},{type:"Polygon",arcs:[[691,692,693,694,695,696,697]],id:"20007",properties:{name:"Barber"}},{type:"Polygon",arcs:[[698,699,700,701,-95]],id:"27133",properties:{name:"Rock"}},{type:"Polygon",arcs:[[702,-286,703,704]],id:"23029",properties:{name:"Washington"}},{type:"Polygon",arcs:[[705,706,707,708,709]],id:"30051",properties:{name:"Liberty"}},{type:"Polygon",arcs:[[710,711,712,713]],id:"46091",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[714,715,-326,716,717]],id:"36117",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[718,719]],id:"02060",properties:{name:"Bristol Bay"}},{type:"Polygon",arcs:[[720,721,722,723,724]],id:"12027",properties:{name:"DeSoto"}},{type:"Polygon",arcs:[[725,726,727,728,729,730]],id:"13015",properties:{name:"Bartow"}},{type:"Polygon",arcs:[[731,732,733,734,735]],id:"19127",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[736,737,738,739,740,741]],id:"20047",properties:{name:"Edwards"}},{type:"Polygon",arcs:[[742,743,744,745,746]],id:"26129",properties:{name:"Ogemaw"}},{type:"Polygon",arcs:[[747,-201,748,749,750,751]],id:"31093",properties:{name:"Howard"}},{type:"Polygon",arcs:[[752,753,754,755,756,757]],id:"39063",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[758,759,760,761,762,763,764]],id:"21209",properties:{name:"Scott"}},{type:"Polygon",arcs:[[765,766,767,768,-639]],id:"47007",properties:{name:"Bledsoe"}},{type:"Polygon",arcs:[[769,770,771,772,773,774]],id:"37157",properties:{name:"Rockingham"}},{type:"Polygon",arcs:[[775,776,777,778,779]],id:"48189",properties:{name:"Hale"}},{type:"Polygon",arcs:[[780]],id:"51820",properties:{name:"Waynesboro"}},{type:"Polygon",arcs:[[781,782,783,784,785]],id:"56025",properties:{name:"Natrona"}},{type:"Polygon",arcs:[[-107,786,787,788,789]],id:"48407",properties:{name:"San Jacinto"}},{type:"Polygon",arcs:[[790,791,792,-390,793]],id:"55135",properties:{name:"Waupaca"}},{type:"Polygon",arcs:[[794,795,796,797,798]],id:"39067",properties:{name:"Harrison"}},{type:"Polygon",arcs:[[799,800,801,802,803,804,805]],id:"13087",properties:{name:"Decatur"}},{type:"Polygon",arcs:[[806,807,808,809,810]],id:"22001",properties:{name:"Acadia"}},{type:"Polygon",arcs:[[811,812,813,814,815]],id:"27019",properties:{name:"Carver"}},{type:"Polygon",arcs:[[816,817,818,819,-535,820]],id:"17065",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[821,822,-313,823,824,825]],id:"27067",properties:{name:"Kandiyohi"}},{type:"Polygon",arcs:[[826,827,828,829,830]],id:"55071",properties:{name:"Manitowoc"}},{type:"Polygon",arcs:[[831,832,833,834,835,836]],id:"01013",properties:{name:"Butler"}},{type:"Polygon",arcs:[[837,838,839,840,841,842,843]],id:"13169",properties:{name:"Jones"}},{type:"Polygon",arcs:[[844,845,846,847]],id:"19069",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[848,849,850,851,852,853]],id:"18113",properties:{name:"Noble"}},{type:"Polygon",arcs:[[854,855,856,857,858,859]],id:"20193",properties:{name:"Thomas"}},{type:"Polygon",arcs:[[860,861,862,-407,863]],id:"26035",properties:{name:"Clare"}},{type:"Polygon",arcs:[[864,865,866,867]],id:"26039",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[868,869,870,871,872,873]],id:"29225",properties:{name:"Webster"}},{type:"Polygon",arcs:[[874,875,876,877,878]],id:"31005",properties:{name:"Arthur"}},{type:"Polygon",arcs:[[879,880,881,882,883]],id:"31143",properties:{name:"Polk"}},{type:"Polygon",arcs:[[884,885,886,887,-563]],id:"46029",properties:{name:"Codington"}},{type:"Polygon",arcs:[[888,889,890,-117,891,892]],id:"48131",properties:{name:"Duval"}},{type:"Polygon",arcs:[[893,-385,894,-643,895,896]],id:"48341",properties:{name:"Moore"}},{type:"Polygon",arcs:[[897,898,899,900,901,902]],id:"48317",properties:{name:"Martin"}},{type:"Polygon",arcs:[[903,904,905,906,907,908,909]],id:"39083",properties:{name:"Knox"}},{type:"Polygon",arcs:[[910,911,912,913,914,-648,915]],id:"48293",properties:{name:"Limestone"}},{type:"Polygon",arcs:[[916,917,918,919,920]],id:"19055",properties:{name:"Delaware"}},{type:"Polygon",arcs:[[921,922,923,924]],id:"31159",properties:{name:"Seward"}},{type:"Polygon",arcs:[[925,926,927,928]],id:"48507",properties:{name:"Zavala"}},{type:"Polygon",arcs:[[929,930,931,932,933]],id:"06091",properties:{name:"Sierra"}},{type:"Polygon",arcs:[[934,935,936,937,938]],id:"17201",properties:{name:"Winnebago"}},{type:"Polygon",arcs:[[939,940,941,942,943,944]],id:"23031",properties:{name:"York"}},{type:"Polygon",arcs:[[945,946,947,948,949]],id:"24011",properties:{name:"Caroline"}},{type:"Polygon",arcs:[[950,951,952,953,954]],id:"26119",properties:{name:"Montmorency"}},{type:"Polygon",arcs:[[-34,955,956,957,958,959,960]],id:"38077",properties:{name:"Richland"}},{type:"Polygon",arcs:[[961,962,963,964,965,966]],id:"42007",properties:{name:"Beaver"}},{type:"Polygon",arcs:[[967,968,969,-210,-470]],id:"48079",properties:{name:"Cochran"}},{type:"Polygon",arcs:[[970,-746,971,972,973,-863]],id:"26051",properties:{name:"Gladwin"}},{type:"Polygon",arcs:[[974,975,976,977,978,979,980]],id:"08121",properties:{name:"Washington"}},{type:"Polygon",arcs:[[981,-921,982,983,-188]],id:"19019",properties:{name:"Buchanan"}},{type:"Polygon",arcs:[[984,985,986,987,988,989,990]],id:"19187",properties:{name:"Webster"}},{type:"Polygon",arcs:[[991,-742,992,993,994,995]],id:"20057",properties:{name:"Ford"}},{type:"Polygon",arcs:[[-954,996,997,-743,-866]],id:"26135",properties:{name:"Oscoda"}},{type:"Polygon",arcs:[[998,999,1e3,1001]],id:"28099",properties:{name:"Neshoba"}},{type:"Polygon",arcs:[[1002,1003,1004,1005,1006,1007]],id:"31137",properties:{name:"Phelps"}},{type:"Polygon",arcs:[[1008,1009,1010,1011,1012,1013]],id:"31039",properties:{name:"Cuming"}},{type:"Polygon",arcs:[[1014,1015,1016,1017,1018,1019,1020]],id:"45045",properties:{name:"Greenville"}},{type:"Polygon",arcs:[[1021,1022,1023,1024,1025]],id:"48151",properties:{name:"Fisher"}},{type:"Polygon",arcs:[[1026,1027,1028,1029,1030]],id:"37069",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[1031,1032,1033,1034,1035,1036]],id:"39039",properties:{name:"Defiance"}},{type:"Polygon",arcs:[[1037,1038,1039,1040,1041,1042]],id:"47055",properties:{name:"Giles"}},{type:"Polygon",arcs:[[1043,1044,1045,1046,1047]],id:"48023",properties:{name:"Baylor"}},{type:"Polygon",arcs:[[1048,1049,1050,1051,1052]],id:"48365",properties:{name:"Panola"}},{type:"Polygon",arcs:[[1053,1054,1055,1056]],id:"53001",properties:{name:"Adams"}},{type:"Polygon",arcs:[[-988,1057,1058,1059,1060,1061]],id:"19015",properties:{name:"Boone"}},{type:"Polygon",arcs:[[1062,1063,1064,-229,1065,1066,1067]],id:"48237",properties:{name:"Jack"}},{type:"Polygon",arcs:[[1068,1069,-332,1070,-617]],id:"20017",properties:{name:"Chase"}},{type:"Polygon",arcs:[[-663,1071,1072,1073,1074]],id:"48099",properties:{name:"Coryell"}},{type:"Polygon",arcs:[[1075,1076,1077,1078,1079]],id:"26037",properties:{name:"Clinton"}},{type:"Polygon",arcs:[[1080,1081,1082,-335]],id:"20207",properties:{name:"Woodson"}},{type:"Polygon",arcs:[[1083,1084,1085,1086,1087,1088,1089]],id:"17037",properties:{name:"DeKalb"}},{type:"Polygon",arcs:[[1090,1091,1092,1093,1094]],id:"19159",properties:{name:"Ringgold"}},{type:"Polygon",arcs:[[1095,1096,1097,1098,1099]],id:"19165",properties:{name:"Shelby"}},{type:"Polygon",arcs:[[1100,1101,1102,1103,1104,1105,-178,1106]],id:"06019",properties:{name:"Fresno"}},{type:"Polygon",arcs:[[1107,1108,1109,-1091,1110]],id:"19175",properties:{name:"Union"}},{type:"Polygon",arcs:[[1111,1112,1113,1114,1115,1116]],id:"17123",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[1117,1118,1119,1120,1121,1122]],id:"17147",properties:{name:"Piatt"}},{type:"Polygon",arcs:[[1123,1124,-1111,1125,1126]],id:"19003",properties:{name:"Adams"}},{type:"Polygon",arcs:[[1127,1128,1129,1130,1131,1132,1133]],id:"17159",properties:{name:"Richland"}},{type:"Polygon",arcs:[[1134,1135,1136,1137,1138]],id:"47023",properties:{name:"Chester"}},{type:"Polygon",arcs:[[1139,1140,1141,1142,1143]],id:"26023",properties:{name:"Branch"}},{type:"Polygon",arcs:[[1144,1145,1146,1147,1148,1149]],id:"37151",properties:{name:"Randolph"}},{type:"Polygon",arcs:[[1150,1151,1152,1153,1154,1155]],id:"20199",properties:{name:"Wallace"}},{type:"Polygon",arcs:[[1156,1157,1158,1159,1160,1161]],id:"18177",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[1162]],id:"51595",properties:{name:"Emporia"}},{type:"Polygon",arcs:[[1163,1164,1165,1166,1167]],id:"48295",properties:{name:"Lipscomb"}},{type:"Polygon",arcs:[[1168,1169,1170,1171]],id:"47169",properties:{name:"Trousdale"}},{type:"Polygon",arcs:[[1172,1173,1174,1175,1176,1177,1178,1179,1180,-683,1181]],id:"49037",properties:{name:"San Juan"}},{type:"Polygon",arcs:[[1182,1183,1184,-251,1185,1186]],id:"19123",properties:{name:"Mahaska"}},{type:"Polygon",arcs:[[1187,1188,1189,1190]],id:"16021",properties:{name:"Boundary"}},{type:"Polygon",arcs:[[1191,1192,1193,1194,1195,1196,1197]],id:"17107",properties:{name:"Logan"}},{type:"Polygon",arcs:[[1198,1199,1200,1201,1202]],id:"20059",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[1203,1204,1205,1206,1207,1208,1209,1210]],id:"22013",properties:{name:"Bienville"}},{type:"Polygon",arcs:[[1211,1212,1213,1214,1215]],id:"06005",properties:{name:"Amador"}},{type:"Polygon",arcs:[[1216,1217,-1212,1218,1219]],id:"06017",properties:{name:"El Dorado"}},{type:"Polygon",arcs:[[1220,1221,1222,1223,1224]],id:"05065",properties:{name:"Izard"}},{type:"Polygon",arcs:[[1225]],id:"51530",properties:{name:"Buena Vista"}},{type:"Polygon",arcs:[[1226,1227]],id:"51590",properties:{name:"Danville"}},{type:"Polygon",arcs:[[1228,1229]],id:"51640",properties:{name:"Galax"}},{type:"Polygon",arcs:[[1230]],id:"51660",properties:{name:"Harrisonburg"}},{type:"Polygon",arcs:[[1231]],id:"51690",properties:{name:"Martinsville"}},{type:"Polygon",arcs:[[1232,1233,1234,1235,1236,1237]],id:"18049",properties:{name:"Fulton"}},{type:"Polygon",arcs:[[1238,1239,-1108,-1125,1240]],id:"19001",properties:{name:"Adair"}},{type:"Polygon",arcs:[[1241,-179,-1106,1242,1243,1244]],id:"06053",properties:{name:"Monterey"}},{type:"Polygon",arcs:[[1245,1246,1247,1248,1249]],id:"29219",properties:{name:"Warren"}},{type:"Polygon",arcs:[[1250,1251,1252,1253,1254]],id:"37197",properties:{name:"Yadkin"}},{type:"Polygon",arcs:[[-409,1255,1256,1257,-1076,1258]],id:"26057",properties:{name:"Gratiot"}},{type:"Polygon",arcs:[[1259,1260,1261,1262,1263,1264]],id:"21129",properties:{name:"Lee"}},{type:"Polygon",arcs:[[1265,1266,1267,1268,1269,1270]],id:"20133",properties:{name:"Neosho"}},{type:"Polygon",arcs:[[1271,-1080,1272,1273,1274]],id:"26067",properties:{name:"Ionia"}},{type:"Polygon",arcs:[[1275,1276,1277,1278,1279]],id:"26077",properties:{name:"Kalamazoo"}},{type:"Polygon",arcs:[[1280,1281,1282,1283,1284,1285]],id:"21149",properties:{name:"McLean"}},{type:"Polygon",arcs:[[1286,1287,1288,1289,1290,1291]],id:"27033",properties:{name:"Cottonwood"}},{type:"Polygon",arcs:[[-542,1292,1293,-344,1294]],id:"26085",properties:{name:"Lake"}},{type:"Polygon",arcs:[[-543,-1295,1295,1296]],id:"26105",properties:{name:"Mason"}},{type:"Polygon",arcs:[[1297,-411,1298,-345]],id:"26107",properties:{name:"Mecosta"}},{type:"Polygon",arcs:[[1299,-348,1300,1301,1302]],id:"26121",properties:{name:"Muskegon"}},{type:"Polygon",arcs:[[1303,1304,1305,1306,1307,1308]],id:"27047",properties:{name:"Freeborn"}},{type:"Polygon",arcs:[[1309,1310,1311,1312,1313,1314,1315]],id:"17051",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[1316,1317,1318,1319,-1312]],id:"17049",properties:{name:"Effingham"}},{type:"Polygon",arcs:[[1320,1321,1322,1323]],id:"27009",properties:{name:"Benton"}},{type:"Polygon",arcs:[[1324,1325,1326,1327,-378]],id:"48129",properties:{name:"Donley"}},{type:"Polygon",arcs:[[1328,1329,1330,1331,1332]],id:"27041",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[1333,1334,1335,1336,-367]],id:"40073",properties:{name:"Kingfisher"}},{type:"Polygon",arcs:[[1337,1338,1339,1340,1341,1342]],id:"47053",properties:{name:"Gibson"}},{type:"Polygon",arcs:[[1343,1344,1345,1346,1347,1348,1349]],id:"47005",properties:{name:"Benton"}},{type:"Polygon",arcs:[[1350,1351,1352,1353]],id:"45009",properties:{name:"Bamberg"}},{type:"Polygon",arcs:[[1354,1355,1356,1357,1358,-520,1359,1360]],id:"48013",properties:{name:"Atascosa"}},{type:"Polygon",arcs:[[1361,1362,1363,-104,1364,1365,1366,-658]],id:"46067",properties:{name:"Hutchinson"}},{type:"Polygon",arcs:[[1367,1368,1369,1370,-37,1371]],id:"46019",properties:{name:"Butte"}},{type:"MultiPolygon",arcs:[[[1372,1373,1374,1375]],[[1376,1377]],[[1378,1379]],[[1380]],[[1381,1382]],[[1383,1384,1385,1386]]],id:"02105",properties:{name:"Hoonah-Angoon"}},{type:"Polygon",arcs:[[1387,1388,1389,1390,-505,-237]],id:"46059",properties:{name:"Hand"}},{type:"Polygon",arcs:[[-565,1391,1392,-230,-558,1393,1394]],id:"46077",properties:{name:"Kingsbury"}},{type:"Polygon",arcs:[[1395,1396,1397,1398,1399]],id:"47101",properties:{name:"Lewis"}},{type:"Polygon",arcs:[[1400,1401,1402,1403,1404]],id:"55069",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[1405,-1341,1406,1407,-1135,1408,1409]],id:"47113",properties:{name:"Madison"}},{type:"Polygon",arcs:[[1410]],id:"51540",properties:{name:"Charlottesville"}},{type:"Polygon",arcs:[[1411,1412,1413,1414,1415,1416]],id:"30037",properties:{name:"Golden Valley"}},{type:"Polygon",arcs:[[1417,1418,1419,1420,1421,1422,1423,-784]],id:"56009",properties:{name:"Converse"}},{type:"Polygon",arcs:[[1424,1425,1426,1427,1428]],id:"47179",properties:{name:"Washington"}},{type:"Polygon",arcs:[[1429,1430,-1405,1431,1432,1433]],id:"55119",properties:{name:"Taylor"}},{type:"Polygon",arcs:[[1434,1435,1436,1437,1438,1439,1440,1441]],id:"56029",properties:{name:"Park"}},{type:"Polygon",arcs:[[1442,1443,-1292,1444,-700,1445]],id:"27101",properties:{name:"Murray"}},{type:"Polygon",arcs:[[1446,1447,1448,1449,1450,1451]],id:"55133",properties:{name:"Waukesha"}},{type:"Polygon",arcs:[[1452,1453,-1446,-699,1454]],id:"27117",properties:{name:"Pipestone"}},{type:"Polygon",arcs:[[1455,1456,1457,1458,1459]],id:"51099",properties:{name:"King George"}},{type:"Polygon",arcs:[[1460,1461,1462,1463,1464,1465,1466]],id:"30001",properties:{name:"Beaverhead"}},{type:"Polygon",arcs:[[1467,1468,-1412,1469,1470]],id:"30107",properties:{name:"Wheatland"}},{type:"Polygon",arcs:[[1471,-873,1472,1473,1474,1475]],id:"29043",properties:{name:"Christian"}},{type:"Polygon",arcs:[[1476,1477,1478,1479,1480,1481]],id:"29053",properties:{name:"Cooper"}},{type:"Polygon",arcs:[[1482,1483,1484,1485,1486,1487]],id:"20029",properties:{name:"Cloud"}},{type:"Polygon",arcs:[[1488,1489,1490,1491,1492]],id:"51159",properties:{name:"Richmond"}},{type:"Polygon",arcs:[[1493,-1342,-1406,1494,1495]],id:"47033",properties:{name:"Crockett"}},{type:"Polygon",arcs:[[1496,1497,1498,1499,1500]],id:"18063",properties:{name:"Hendricks"}},{type:"Polygon",arcs:[[1501,1502,1503,1504,1505,1506,1507,-340]],id:"20135",properties:{name:"Ness"}},{type:"Polygon",arcs:[[1508,1509,1510,1511,1512,-1087]],id:"17093",properties:{name:"Kendall"}},{type:"Polygon",arcs:[[1513,1514,1515,1516,1517]],id:"18149",properties:{name:"Starke"}},{type:"Polygon",arcs:[[1518,1519,1520,1521,1522,-611]],id:"18145",properties:{name:"Shelby"}},{type:"Polygon",arcs:[[1523,1524,1525,1526,-870,1527]],id:"29105",properties:{name:"Laclede"}},{type:"Polygon",arcs:[[1528,1529,1530,1531,1532,1533]],id:"29117",properties:{name:"Livingston"}},{type:"Polygon",arcs:[[1534,1535,-955,-865,1536]],id:"26137",properties:{name:"Otsego"}},{type:"Polygon",arcs:[[1537,1538,1539,1540,1541,1542,-1543]],id:"31087",properties:{name:"Hitchcock"}},{type:"Polygon",arcs:[[-867,-747,-971,-862,1543]],id:"26143",properties:{name:"Roscommon"}},{type:"Polygon",arcs:[[1544,1545,1546,1547,1548]],id:"29011",properties:{name:"Barton"}},{type:"Polygon",arcs:[[-379,-1328,1549,1550,1551,1552]],id:"48045",properties:{name:"Briscoe"}},{type:"Polygon",arcs:[[1553,1554,1555,1556,1557,1558]],id:"26161",properties:{name:"Washtenaw"}},{type:"Polygon",arcs:[[1559,-1274,1560,1561,-1277,1562]],id:"26015",properties:{name:"Barry"}},{type:"Polygon",arcs:[[1563,1564,1565,1566,1567]],id:"35029",properties:{name:"Luna"}},{type:"Polygon",arcs:[[1568,1569,1570,1571,1572,1573,1574]],id:"51169",properties:{name:"Scott"}},{type:"Polygon",arcs:[[1575,1576,1577,1578,1579]],id:"33007",properties:{name:"Coos"}},{type:"Polygon",arcs:[[1580,1581,1582,1583,1584,1585]],id:"38095",properties:{name:"Towner"}},{type:"Polygon",arcs:[[1586,1587,1588,1589,-465,1590]],id:"29145",properties:{name:"Newton"}},{type:"MultiPolygon",arcs:[[[1591,1592]],[[-1375,1593,-48,1594]]],id:"02195",properties:{name:"Petersburg"}},{type:"Polygon",arcs:[[1595,-1014,1596,1597,1598]],id:"31167",properties:{name:"Stanton"}},{type:"Polygon",arcs:[[1599,1600,1601,-1009,-1596,1602]],id:"31179",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[1603,1604,1605,1606,-171]],id:"26109",properties:{name:"Menominee"}},{type:"Polygon",arcs:[[1607,1608,1609,1610,1611]],id:"48175",properties:{name:"Goliad"}},{type:"Polygon",arcs:[[1612,-35,-961,1613,-305,1614]],id:"38073",properties:{name:"Ransom"}},{type:"Polygon",arcs:[[1615,1616,-1325,1617]],id:"48179",properties:{name:"Gray"}},{type:"Polygon",arcs:[[1618,1619,1620,1621,1622,1623]],id:"42121",properties:{name:"Venango"}},{type:"Polygon",arcs:[[-1327,1624,-477,-242,1625,-1550]],id:"48191",properties:{name:"Hall"}},{type:"Polygon",arcs:[[1626,-1475,1627,1628,1629]],id:"29209",properties:{name:"Stone"}},{type:"Polygon",arcs:[[1630,1631,1632,1633,1634,1635]],id:"39057",properties:{name:"Greene"}},{type:"Polygon",arcs:[[1636,1637,-1534,1638,1639,1640]],id:"29061",properties:{name:"Daviess"}},{type:"Polygon",arcs:[[1641,1642,1643,1644,1645,1646]],id:"29199",properties:{name:"Scotland"}},{type:"Polygon",arcs:[[1647,1648,1649,1650,1651,1652,1653]],id:"48049",properties:{name:"Brown"}},{type:"Polygon",arcs:[[-472,1654,1655,-898,1656,1657]],id:"48165",properties:{name:"Gaines"}},{type:"Polygon",arcs:[[-1074,1658,-651,1659,1660,1661,1662]],id:"48027",properties:{name:"Bell"}},{type:"Polygon",arcs:[[1663,-1191,1664,1665,1666]],id:"53051",properties:{name:"Pend Oreille"}},{type:"Polygon",arcs:[[1667,1668,1669,1670,1671,1672]],id:"13277",properties:{name:"Tift"}},{type:"Polygon",arcs:[[1673,1674,1675,1676,1677]],id:"48435",properties:{name:"Sutton"}},{type:"Polygon",arcs:[[1678,1679,1680,1681,1682]],id:"51023",properties:{name:"Botetourt"}},{type:"Polygon",arcs:[[1683,1684,1685,1686,1687]],id:"48405",properties:{name:"San Augustine"}},{type:"Polygon",arcs:[[1688,1689,1690,1691]],id:"27017",properties:{name:"Carlton"}},{type:"Polygon",arcs:[[1692,1693,1694,1695,1696]],id:"12029",properties:{name:"Dixie"}},{type:"Polygon",arcs:[[1697,1698,1699,1700,1701,1702]],id:"13211",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[1703,1704,1705,1706]],id:"02188",properties:{name:"Northwest Arctic"}},{type:"Polygon",arcs:[[1707,1708,1709,-672,1710]],id:"38007",properties:{name:"Billings"}},{type:"Polygon",arcs:[[1711,1712,1713,-1692,1714,1715,1716,1717]],id:"27001",properties:{name:"Aitkin"}},{type:"Polygon",arcs:[[1718,1719,1720,1721,1722,1723,1724]],id:"08045",properties:{name:"Garfield"}},{type:"Polygon",arcs:[[-1201,1725,1726,1727]],id:"20003",properties:{name:"Anderson"}},{type:"Polygon",arcs:[[-246,1728,1729,1730,-516]],id:"48269",properties:{name:"King"}},{type:"Polygon",arcs:[[1731,-370,1732,1733,-498,1734]],id:"40039",properties:{name:"Custer"}},{type:"Polygon",arcs:[[1735,-91,1736,1737,1738,1739]],id:"39101",properties:{name:"Marion"}},{type:"Polygon",arcs:[[1740,1741,1742,1743,1744,1745]],id:"17095",properties:{name:"Knox"}},{type:"Polygon",arcs:[[1746,1747,1748,1749]],id:"13013",properties:{name:"Barrow"}},{type:"Polygon",arcs:[[-1088,-1513,1750,1751,1752,-1114,1753,1754,1755]],id:"17099",properties:{name:"LaSalle"}},{type:"Polygon",arcs:[[1756,1757,1758,1759,1760]],id:"01031",properties:{name:"Coffee"}},{type:"Polygon",arcs:[[1761,1762,1763,1764]],id:"12085",properties:{name:"Martin"}},{type:"Polygon",arcs:[[1765,1766,1767,-1058,-987]],id:"19079",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[-847,1768,-732,1769,-1767]],id:"19083",properties:{name:"Hardin"}},{type:"Polygon",arcs:[[1770,1771,1772,1773,1774,1775]],id:"16037",properties:{name:"Custer"}},{type:"Polygon",arcs:[[1776,1777,1778,1779,1780,1781]],id:"13037",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[1782,1783,1784,1785]],id:"19093",properties:{name:"Ida"}},{type:"Polygon",arcs:[[1786,1787,-129,-575,1788]],id:"08105",properties:{name:"Rio Grande"}},{type:"Polygon",arcs:[[1789,-1187,1790,1791,-487,1792]],id:"19125",properties:{name:"Marion"}},{type:"Polygon",arcs:[[1793,-976,1794,1795]],id:"08087",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[1796,1797,1798,-1184,1799]],id:"19157",properties:{name:"Poweshiek"}},{type:"Polygon",arcs:[[1800,1801,1802,-1192,1803,1804]],id:"17179",properties:{name:"Tazewell"}},{type:"Polygon",arcs:[[1805,1806,1807,1808]],id:"08039",properties:{name:"Elbert"}},{type:"Polygon",arcs:[[-1060,1809,1810,-1793,-486,1811]],id:"19153",properties:{name:"Polk"}},{type:"Polygon",arcs:[[1812,1813,1814,1815,1816,1817]],id:"39149",properties:{name:"Shelby"}},{type:"Polygon",arcs:[[1818,-490,1819,-1109,-1240]],id:"19121",properties:{name:"Madison"}},{type:"Polygon",arcs:[[1820,1821,1822,1823,-634]],id:"39153",properties:{name:"Summit"}},{type:"Polygon",arcs:[[1824,1825,-722,1826]],id:"12049",properties:{name:"Hardee"}},{type:"Polygon",arcs:[[1827,1828,1829,1830,1831,1832,1833]],id:"39161",properties:{name:"Van Wert"}},{type:"Polygon",arcs:[[1834,-1635,1835,1836,1837,1838]],id:"39165",properties:{name:"Warren"}},{type:"Polygon",arcs:[[1839,1840,1841,1842,-926,1843]],id:"48463",properties:{name:"Uvalde"}},{type:"Polygon",arcs:[[1844,1845,1846,1847,1848,-607,1849]],id:"13195",properties:{name:"Madison"}},{type:"Polygon",arcs:[[1850,1851,-799,1852,1853,1854]],id:"39059",properties:{name:"Guernsey"}},{type:"Polygon",arcs:[[1855,1856,1857,1858,-1356]],id:"48493",properties:{name:"Wilson"}},{type:"Polygon",arcs:[[-1738,1859,-910,1860,1861,1862]],id:"39041",properties:{name:"Delaware"}},{type:"Polygon",arcs:[[1863,1864,1865,1866,1867]],id:"39055",properties:{name:"Geauga"}},{type:"Polygon",arcs:[[-501,1868,1869,1870]],id:"40055",properties:{name:"Greer"}},{type:"Polygon",arcs:[[1871,1872,1873,1874,1875,1876,1877]],id:"27131",properties:{name:"Rice"}},{type:"Polygon",arcs:[[1878,1879,1880,1881,1882,1883,1884]],id:"05025",properties:{name:"Cleveland"}},{type:"Polygon",arcs:[[1885,1886,1887,1888,1889,-164]],id:"13093",properties:{name:"Dooly"}},{type:"Polygon",arcs:[[-386,-221,1890,-1674,1891]],id:"48413",properties:{name:"Schleicher"}},{type:"Polygon",arcs:[[1892,1893,1894,1895,-1289]],id:"27165",properties:{name:"Watonwan"}},{type:"Polygon",arcs:[[1896,1897,1898,-354,1899,1900]],id:"31001",properties:{name:"Adams"}},{type:"Polygon",arcs:[[1901,1902,1903,1904]],id:"37003",properties:{name:"Alexander"}},{type:"Polygon",arcs:[[1905,-274,1906,1907,-1546]],id:"29039",properties:{name:"Cedar"}},{type:"Polygon",arcs:[[1908,-380,-1553,1909,-777,1910]],id:"48437",properties:{name:"Swisher"}},{type:"Polygon",arcs:[[1911,1912,1913,1914,1915,1916,1917]],id:"30049",properties:{name:"Lewis and Clark"}},{type:"Polygon",arcs:[[1918,1919,1920,-1482,1921,1922,1923]],id:"29159",properties:{name:"Pettis"}},{type:"Polygon",arcs:[[-1551,-1626,-247,-515,1924]],id:"48345",properties:{name:"Motley"}},{type:"Polygon",arcs:[[1925,1926,1927,-1461,1928,1929]],id:"30081",properties:{name:"Ravalli"}},{type:"Polygon",arcs:[[1930,1931,1932,-7,1933,1934,1935,1936]],id:"06071",properties:{name:"San Bernardino"}},{type:"Polygon",arcs:[[1937,1938,1939,1940,1941,1942]],id:"13189",properties:{name:"McDuffie"}},{type:"MultiPolygon",arcs:[[[1943,1944,1945,1946,-1386,1947],[-1381]]],id:"02100",properties:{name:"Haines"}},{type:"Polygon",arcs:[[-1432,-1404,1948,1949,1950,1951,1952]],id:"55073",properties:{name:"Marathon"}},{type:"MultiPolygon",arcs:[[[1953]],[[1954]],[[1955]],[[1956]],[[1957]],[[1958]],[[1959]],[[1960,1961]],[[1962]],[[1963]],[[1964]]],id:"02013",properties:{name:"Aleutians East"}},{type:"MultiPolygon",arcs:[[[1965]],[[1966]],[[1967]],[[1968]],[[1969]],[[1970,1971,1972]]],id:"02150",properties:{name:"Kodiak Island"}},{type:"MultiPolygon",arcs:[[[1973,-719,1974,1975,1976,1977,-1973,1978,-1961]]],id:"02164",properties:{name:"Lake and Peninsula"}},{type:"MultiPolygon",arcs:[[[1979]],[[1980]],[[1981,1982,1983,1984,1985,1986,1987]]],id:"02261",properties:{name:"Valdez-Cordova"}},{type:"Polygon",arcs:[[1988,1989,-1362,-657,-113]],id:"46035",properties:{name:"Davison"}},{type:"Polygon",arcs:[[1990,1991,1992,1993,1994,1995,1996,1997]],id:"41023",properties:{name:"Grant"}},{type:"Polygon",arcs:[[1998,1999,2e3,2001,2002,2003]],id:"39129",properties:{name:"Pickaway"}},{type:"Polygon",arcs:[[-1867,2004,2005,2006,-1822]],id:"39133",properties:{name:"Portage"}},{type:"Polygon",arcs:[[2007,2008,2009,2010,-804]],id:"13131",properties:{name:"Grady"}},{type:"Polygon",arcs:[[2011,2012,2013,2014,2015,2016]],id:"54075",properties:{name:"Pocahontas"}},{type:"Polygon",arcs:[[2017,2018,2019,2020,-1329,2021,2022]],id:"27111",properties:{name:"Otter Tail"}},{type:"Polygon",arcs:[[2023,2024,2025,2026,2027,2028,2029]],id:"13111",properties:{name:"Fannin"}},{type:"Polygon",arcs:[[2030,2031,2032,-24,-197,-22]],id:"27113",properties:{name:"Pennington"}},{type:"Polygon",arcs:[[2033,2034,2035,2036]],id:"17021",properties:{name:"Christian"}},{type:"Polygon",arcs:[[2037,2038,2039,2040,2041,-1235]],id:"18169",properties:{name:"Wabash"}},{type:"Polygon",arcs:[[2042,2043,2044,2045,2046,-1176]],id:"08085",properties:{name:"Montrose"}},{type:"Polygon",arcs:[[2047,2048,2049,-10,2050]],id:"28113",properties:{name:"Pike"}},{type:"Polygon",arcs:[[-458,2051,2052,2053,2054,2055]],id:"38049",properties:{name:"McHenry"}},{type:"Polygon",arcs:[[2056,2057,2058,2059,-1643,2060]],id:"19177",properties:{name:"Van Buren"}},{type:"Polygon",arcs:[[2061,2062,2063]],id:"17171",properties:{name:"Scott"}},{type:"Polygon",arcs:[[2064,-843,2065,2066,2067]],id:"13021",properties:{name:"Bibb"}},{type:"Polygon",arcs:[[-974,2068,2069,-1256,-408]],id:"26111",properties:{name:"Midland"}},{type:"Polygon",arcs:[[2070,2071,2072,2073,-1504,2074]],id:"20051",properties:{name:"Ellis"}},{type:"Polygon",arcs:[[2075,2076,2077,-2052,-457]],id:"38009",properties:{name:"Bottineau"}},{type:"Polygon",arcs:[[-851,2078,-1036,2079,-1834,2080,2081,2082,2083]],id:"18003",properties:{name:"Allen"}},{type:"Polygon",arcs:[[2084,2085,2086,2087,2088,2089]],id:"20085",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[2090,2091,2092,2093,2094,-2058]],id:"19087",properties:{name:"Henry"}},{type:"Polygon",arcs:[[2095,2096,2097,-1497,2098]],id:"18011",properties:{name:"Boone"}},{type:"Polygon",arcs:[[2099,2100,2101,2102,2103,-532]],id:"06103",properties:{name:"Tehama"}},{type:"Polygon",arcs:[[-1236,-2042,2104,2105,2106]],id:"18103",properties:{name:"Miami"}},{type:"Polygon",arcs:[[2107,2108,2109,2110,2111]],id:"38047",properties:{name:"Logan"}},{type:"Polygon",arcs:[[2112,2113,2114,2115,2116,2117]],id:"40021",properties:{name:"Cherokee"}},{type:"Polygon",arcs:[[2118,-239,-508,2119,2120,-583,2121,2122,2123,2124]],id:"46085",properties:{name:"Lyman"}},{type:"Polygon",arcs:[[-26,2125,2126,2127]],id:"27087",properties:{name:"Mahnomen"}},{type:"Polygon",arcs:[[-1433,-1953,2128,2129,2130,2131]],id:"55019",properties:{name:"Clark"}},{type:"Polygon",arcs:[[2132,2133,-342,2134,2135,2136]],id:"20171",properties:{name:"Scott"}},{type:"Polygon",arcs:[[2137,2138,2139,2140,2141]],id:"27135",properties:{name:"Roseau"}},{type:"Polygon",arcs:[[2142,2143,2144,2145,2146,2147,2148]],id:"05115",properties:{name:"Pope"}},{type:"Polygon",arcs:[[2149,2150,2151,2152,2153]],id:"26095",properties:{name:"Luce"}},{type:"Polygon",arcs:[[-1923,2154,2155,2156,-271,2157]],id:"29015",properties:{name:"Benton"}},{type:"Polygon",arcs:[[2158,2159,2160,2161,2162,-2145]],id:"05141",properties:{name:"Van Buren"}},{type:"Polygon",arcs:[[2163,2164,2165,2166,2167,2168,2169,2170]],id:"51199",properties:{name:"York"}},{type:"Polygon",arcs:[[-872,2171,2172,2173,2174,2175,-1473]],id:"29067",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[2176,2177,2178,2179,-1918,2180,2181,2182,2183,2184]],id:"30029",properties:{name:"Flathead"}},{type:"Polygon",arcs:[[2185,2186,2187,2188,2189]],id:"48305",properties:{name:"Lynn"}},{type:"Polygon",arcs:[[2190,2191,2192,2193,2194,2195]],id:"29065",properties:{name:"Dent"}},{type:"Polygon",arcs:[[2196,2197,2198,2199,-1891]],id:"48327",properties:{name:"Menard"}},{type:"Polygon",arcs:[[-1025,-376,-678,2200,-430]],id:"48353",properties:{name:"Nolan"}},{type:"Polygon",arcs:[[2201,-2194,2202,2203,2204,2205]],id:"29203",properties:{name:"Shannon"}},{type:"Polygon",arcs:[[2206,2207,-432,2208,-217,2209]],id:"48431",properties:{name:"Sterling"}},{type:"Polygon",arcs:[[2210,2211,2212,2213,2214]],id:"08089",properties:{name:"Otero"}},{type:"Polygon",arcs:[[2215,2216,2217,2218,-2187]],id:"48169",properties:{name:"Garza"}},{type:"Polygon",arcs:[[2219,2220,2221,2222,2223]],id:"08119",properties:{name:"Teller"}},{type:"Polygon",arcs:[[2224,-2184,2225,2226,2227,2228,2229]],id:"30089",properties:{name:"Sanders"}},{type:"Polygon",arcs:[[2230,-215,2231,-1648,2232,-373]],id:"48059",properties:{name:"Callahan"}},{type:"Polygon",arcs:[[-1731,2233,2234,-1023,2235]],id:"48433",properties:{name:"Stonewall"}},{type:"Polygon",arcs:[[2236,2237,2238,2239,-492,2240]],id:"40051",properties:{name:"Grady"}},{type:"Polygon",arcs:[[2241,2242,2243,2244,2245,2246]],id:"48159",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[2247,2248,2249,2250,2251,2252]],id:"48467",properties:{name:"Van Zandt"}},{type:"Polygon",arcs:[[2253,-1008,2254,2255]],id:"31073",properties:{name:"Gosper"}},{type:"Polygon",arcs:[[2256,2257,2258,2259,-351]],id:"31059",properties:{name:"Fillmore"}},{type:"Polygon",arcs:[[2260,2261,2262,2263,2264,-2248,2265,2266]],id:"48231",properties:{name:"Hunt"}},{type:"Polygon",arcs:[[2267,2268,-110,2269,2270]],id:"48313",properties:{name:"Madison"}},{type:"Polygon",arcs:[[2271,2272,2273,2274,2275,2276,2277]],id:"40019",properties:{name:"Carter"}},{type:"Polygon",arcs:[[2278,2279,2280,2281,2282]],id:"51157",properties:{name:"Rappahannock"}},{type:"Polygon",arcs:[[2283,2284,2285,2286,2287]],id:"01103",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[2288,2289,2290,2291,2292]],id:"51079",properties:{name:"Greene"}},{type:"Polygon",arcs:[[2293,-1705,2294,2295,2296,2297,2298,2299,2300,-483]],id:"02290",properties:{name:"Yukon-Koyukuk"}},{type:"Polygon",arcs:[[2301,2302,2303,2304,2305]],id:"42059",properties:{name:"Greene"}},{type:"Polygon",arcs:[[-1882,2306,2307,2308,2309,2310]],id:"05043",properties:{name:"Drew"}},{type:"Polygon",arcs:[[2311,2312,-421,2313,2314,2315,2316]],id:"28043",properties:{name:"Grenada"}},{type:"Polygon",arcs:[[2317,2318],[2319]],id:"51750",properties:{name:"Radford"}},{type:"Polygon",arcs:[[2320,2321,2322,2323,2324]],id:"29211",properties:{name:"Sullivan"}},{type:"Polygon",arcs:[[2325,2326,2327,2328,2329]],id:"54047",properties:{name:"McDowell"}},{type:"Polygon",arcs:[[2330,2331,2332,2333,2334]],id:"37133",properties:{name:"Onslow"}},{type:"Polygon",arcs:[[2335,2336,2337,2338,2339,2340]],id:"29049",properties:{name:"Clinton"}},{type:"Polygon",arcs:[[2341,2342,2343,2344,2345,2346]],id:"12005",properties:{name:"Bay"}},{type:"MultiPolygon",arcs:[[[2347,2348,2349,2350,-593,2351]],[[2352]]],id:"53033",properties:{name:"King"}},{type:"Polygon",arcs:[[2353,2354,2355,2356,-2349,2357]],id:"53007",properties:{name:"Chelan"}},{type:"Polygon",arcs:[[2358,2359,2360,2361]],id:"12035",properties:{name:"Flagler"}},{type:"Polygon",arcs:[[-2357,2362,2363,2364,-2350]],id:"53037",properties:{name:"Kittitas"}},{type:"Polygon",arcs:[[2365,2366,2367,2368]],id:"12095",properties:{name:"Orange"}},{type:"Polygon",arcs:[[2369,-61,2370,2371,-1888]],id:"13235",properties:{name:"Pulaski"}},{type:"Polygon",arcs:[[2372,2373,-2051,-9,2374,2375,2376]],id:"28005",properties:{name:"Amite"}},{type:"Polygon",arcs:[[2377,2378,2379,2380,2381]],id:"46045",properties:{name:"Edmunds"}},{type:"Polygon",arcs:[[-1512,2382,2383,2384,-1751]],id:"17063",properties:{name:"Grundy"}},{type:"Polygon",arcs:[[2385,2386,2387,-692,2388,-740]],id:"20151",properties:{name:"Pratt"}},{type:"Polygon",arcs:[[2389,2390,2391,-845,-194]],id:"19033",properties:{name:"Cerro Gordo"}},{type:"Polygon",arcs:[[2392,2393,2394,2395,2396,2397]],id:"31155",properties:{name:"Saunders"}},{type:"Polygon",arcs:[[2398,2399,2400,2401,2402]],id:"05125",properties:{name:"Saline"}},{type:"Polygon",arcs:[[-1951,-794,-389,2403,2404]],id:"55097",properties:{name:"Portage"}},{type:"Polygon",arcs:[[2405,2406,-1549,2407,2408,2409,-1268]],id:"20037",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[2410,2411,2412,2413,2414]],id:"48221",properties:{name:"Hood"}},{type:"Polygon",arcs:[[2415,2416,2417,2418,-333,-1070]],id:"20111",properties:{name:"Lyon"}},{type:"Polygon",arcs:[[2419,2420,2421,2422,2423]],id:"46047",properties:{name:"Fall River"}},{type:"Polygon",arcs:[[2424,-268,2425,2426,2427]],id:"30069",properties:{name:"Petroleum"}},{type:"Polygon",arcs:[[2428,2429,2430,2431,2432,-2096,2433]],id:"18023",properties:{name:"Clinton"}},{type:"Polygon",arcs:[[-653,2434,-36,-1613,2435,2436]],id:"38003",properties:{name:"Barnes"}},{type:"Polygon",arcs:[[2437,2438,2439,2440,2441]],id:"50015",properties:{name:"Lamoille"}},{type:"Polygon",arcs:[[2442,2443,2444,2445,2446,2447]],id:"13035",properties:{name:"Butts"}},{type:"Polygon",arcs:[[-2129,-1952,-2405,2448,2449,2450]],id:"55141",properties:{name:"Wood"}},{type:"Polygon",arcs:[[2451,-195,-848,-1766,-986]],id:"19197",properties:{name:"Wright"}},{type:"Polygon",arcs:[[2452,2453,2454,-509,2455,-2199]],id:"48319",properties:{name:"Mason"}},{type:"Polygon",arcs:[[2456,2457,2458,2459]],id:"48183",properties:{name:"Gregg"}},{type:"Polygon",arcs:[[2460,2461,2462,2463,2464,2465]],id:"28105",properties:{name:"Oktibbeha"}},{type:"Polygon",arcs:[[-933,2466,2467,2468]],id:"06057",properties:{name:"Nevada"}},{type:"Polygon",arcs:[[-2422,2469,2470,2471,2472]],id:"31045",properties:{name:"Dawes"}},{type:"Polygon",arcs:[[2473,2474,2475,2476,2477]],id:"41033",properties:{name:"Josephine"}},{type:"Polygon",arcs:[[-924,2478,2479,2480,-2258]],id:"31151",properties:{name:"Saline"}},{type:"Polygon",arcs:[[-1166,2481,2482,2483,2484]],id:"48211",properties:{name:"Hemphill"}},{type:"Polygon",arcs:[[2485,-2447,2486,2487,2488]],id:"13171",properties:{name:"Lamar"}},{type:"Polygon",arcs:[[2489,2490,2491,2492,2493]],id:"28065",properties:{name:"Jefferson Davis"}},{type:"Polygon",arcs:[[-1861,-909,2494,2495,2496,2497,2498]],id:"39089",properties:{name:"Licking"}},{type:"Polygon",arcs:[[-157,2499,-1911,-776,2500,2501]],id:"48069",properties:{name:"Castro"}},{type:"Polygon",arcs:[[2502,-1537,2503,2504,2505]],id:"26009",properties:{name:"Antrim"}},{type:"Polygon",arcs:[[2506,2507,2508,2509,2510,-145]],id:"20147",properties:{name:"Phillips"}},{type:"Polygon",arcs:[[2511,2512,2513,2514]],id:"20067",properties:{name:"Grant"}},{type:"Polygon",arcs:[[-1915,2515,2516,2517]],id:"30007",properties:{name:"Broadwater"}},{type:"Polygon",arcs:[[-554,2518,-751,2519,-1897,2520,-1004,2521]],id:"31019",properties:{name:"Buffalo"}},{type:"Polygon",arcs:[[2522,2523,2524,2525]],id:"32009",properties:{name:"Esmeralda"}},{type:"Polygon",arcs:[[2526,2527,2528,2529,2530]],id:"37135",properties:{name:"Orange"}},{type:"Polygon",arcs:[[2531,2532,2533,2534,2535,2536]],id:"16051",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[2537,-1143,2538,-849,2539]],id:"18087",properties:{name:"LaGrange"}},{type:"Polygon",arcs:[[-919,2540,2541,2542,-257,2543]],id:"19105",properties:{name:"Jones"}},{type:"Polygon",arcs:[[2544,2545,2546,2547,2548,2549]],id:"19027",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[2550,2551,-654,-2437,2552,-2109,2553]],id:"38093",properties:{name:"Stutsman"}},{type:"Polygon",arcs:[[2554,-989,-1062,2555,2556,-2547]],id:"19073",properties:{name:"Greene"}},{type:"Polygon",arcs:[[2557,2558,2559,2560,2561,2562,2563]],id:"01003",properties:{name:"Baldwin"}},{type:"Polygon",arcs:[[2564,2565,2566,-1559,2567,2568,2569]],id:"26075",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[2570,-1574,2571,2572,2573]],id:"47067",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[-146,-2511,2574,2575,2576,2577]],id:"20065",properties:{name:"Graham"}},{type:"Polygon",arcs:[[-1727,2578,-1266,-1082]],id:"20001",properties:{name:"Allen"}},{type:"Polygon",arcs:[[2579,2580,2581,2582,2583,2584]],id:"40127",properties:{name:"Pushmataha"}},{type:"Polygon",arcs:[[2585,2586,2587,2588,2589]],id:"48461",properties:{name:"Upton"}},{type:"Polygon",arcs:[[2590,-2381,2591,-235,2592,2593]],id:"46107",properties:{name:"Potter"}},{type:"Polygon",arcs:[[-1006,2594,-2507,-144,2595]],id:"31083",properties:{name:"Harlan"}},{type:"Polygon",arcs:[[2596,2597,2598,2599,2600]],id:"19063",properties:{name:"Emmet"}},{type:"Polygon",arcs:[[2601,2602,2603,2604,-1582]],id:"38019",properties:{name:"Cavalier"}},{type:"Polygon",arcs:[[2605,2606,2607,2608,2609,2610]],id:"06109",properties:{name:"Tuolumne"}},{type:"Polygon",arcs:[[-2576,2611,-2075,-1503,2612]],id:"20195",properties:{name:"Trego"}},{type:"Polygon",arcs:[[2613,-892,-123,2614,2615]],id:"48247",properties:{name:"Jim Hogg"}},{type:"Polygon",arcs:[[2616,2617,2618]],id:"55078",properties:{name:"Menominee"}},{type:"Polygon",arcs:[[-1895,2619,2620,2621,-2598,2622]],id:"27091",properties:{name:"Martin"}},{type:"Polygon",arcs:[[2623,2624,2625,-832,2626,2627]],id:"01085",properties:{name:"Lowndes"}},{type:"Polygon",arcs:[[2628,2629,-765,2630,2631,2632]],id:"21073",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[2633,2634,2635,2636,2637]],id:"29205",properties:{name:"Shelby"}},{type:"Polygon",arcs:[[2638,2639,2640,2641,2642,2643]],id:"40037",properties:{name:"Creek"}},{type:"Polygon",arcs:[[2644,2645,2646,2647,2648,2649]],id:"48285",properties:{name:"Lavaca"}},{type:"Polygon",arcs:[[-392,2650,2651,2652,2653,2654]],id:"55047",properties:{name:"Green Lake"}},{type:"Polygon",arcs:[[-555,-2522,-1003,-2254,2655,2656]],id:"31047",properties:{name:"Dawson"}},{type:"Polygon",arcs:[[-1279,-1144,-2538,2657,2658]],id:"26149",properties:{name:"St. Joseph"}},{type:"Polygon",arcs:[[2659,2660,2661,-817,2662,2663]],id:"17081",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[2664,-443,2665,-2391,2666]],id:"19131",properties:{name:"Mitchell"}},{type:"Polygon",arcs:[[2667,-2297,2668,-1983,2669,2670]],id:"02240",properties:{name:"Southeast Fairbanks"}},{type:"Polygon",arcs:[[-1754,-1113,2671]],id:"17155",properties:{name:"Putnam"}},{type:"Polygon",arcs:[[2672,2673,-1127,2674,2675]],id:"19137",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[2676,2677,-187,2678]],id:"19017",properties:{name:"Bremer"}},{type:"Polygon",arcs:[[2679,-1314,2680,2681,-2661,2682]],id:"17121",properties:{name:"Marion"}},{type:"Polygon",arcs:[[2683,2684,2685,2686,2687]],id:"37025",properties:{name:"Cabarrus"}},{type:"Polygon",arcs:[[2688,-902,2689,-2587,2690]],id:"48329",properties:{name:"Midland"}},{type:"Polygon",arcs:[[-2200,-2456,-514,2691,2692,-1675]],id:"48267",properties:{name:"Kimble"}},{type:"Polygon",arcs:[[2693,2694,2695,2696,2697]],id:"55103",properties:{name:"Richland"}},{type:"Polygon",arcs:[[-895,-384,2698,-1618,-377,-644]],id:"48065",properties:{name:"Carson"}},{type:"Polygon",arcs:[[2699,2700,2701,2702,2703]],id:"21061",properties:{name:"Edmonson"}},{type:"Polygon",arcs:[[2704,2705,2706,2707,2708,2709,2710]],id:"18047",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[2711,2712,2713,-1776,2714,2715]],id:"16085",properties:{name:"Valley"}},{type:"Polygon",arcs:[[2716,2717,2718,2719,2720,2721]],id:"51109",properties:{name:"Louisa"}},{type:"Polygon",arcs:[[2722,-1067,2723,-2415,2724,2725,2726]],id:"48363",properties:{name:"Palo Pinto"}},{type:"Polygon",arcs:[[2727,-2501,-780,-207,2728]],id:"48279",properties:{name:"Lamb"}},{type:"Polygon",arcs:[[2729,2730,2731,2732,-2347,2733,-278]],id:"12131",properties:{name:"Walton"}},{type:"Polygon",arcs:[[-45,2734,2735,2736,2737]],id:"36039",properties:{name:"Greene"}},{type:"Polygon",arcs:[[-1158,2738,-452,2739,-1817,2740,2741,2742]],id:"39037",properties:{name:"Darke"}},{type:"Polygon",arcs:[[-2140,2743,2744,2745,2746,2747,2748,-2032,2749]],id:"27007",properties:{name:"Beltrami"}},{type:"Polygon",arcs:[[2750,2751,-864,-1298,-1294]],id:"26133",properties:{name:"Osceola"}},{type:"Polygon",arcs:[[-337,2752,2753,2754,2755,2756]],id:"20049",properties:{name:"Elk"}},{type:"Polygon",arcs:[[2757,2758,2759,2760,2761]],id:"20075",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[2762,2763,2764,2765,-1689,-1714,2766,2767]],id:"27137",properties:{name:"St. Louis"}},{type:"Polygon",arcs:[[2768,2769,2770,-2092,2771,2772]],id:"19183",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-214,2773,-2726,2774,2775,-1649,-2232]],id:"48133",properties:{name:"Eastland"}},{type:"Polygon",arcs:[[-2692,-513,2776,2777,2778,2779]],id:"48265",properties:{name:"Kerr"}},{type:"Polygon",arcs:[[2780,2781,2782,2783,2784,2785]],id:"36003",properties:{name:"Allegany"}},{type:"Polygon",arcs:[[-779,2786,-2186,-208]],id:"48303",properties:{name:"Lubbock"}},{type:"Polygon",arcs:[[2787,2788]],id:"51775",properties:{name:"Salem"}},{type:"Polygon",arcs:[[2789,2790]],id:"51670",properties:{name:"Hopewell"}},{type:"Polygon",arcs:[[2791,2792,2793,2794,-1742,2795]],id:"17073",properties:{name:"Henry"}},{type:"Polygon",arcs:[[2796,2797,-1002,2798,2799]],id:"28079",properties:{name:"Leake"}},{type:"Polygon",arcs:[[2800,2801,2802,2803,2804,2805,2806]],id:"35057",properties:{name:"Torrance"}},{type:"Polygon",arcs:[[2807,2808,-124,2809,2810]],id:"08095",properties:{name:"Phillips"}},{type:"Polygon",arcs:[[2811,-2810,-128,2812,2813,2814,-978]],id:"08125",properties:{name:"Yuma"}},{type:"Polygon",arcs:[[2815,2816,2817,2818]],id:"19141",properties:{name:"O'Brien"}},{type:"Polygon",arcs:[[-2800,2819,2820,2821,2822]],id:"28123",properties:{name:"Scott"}},{type:"Polygon",arcs:[[-547,2823,2824,2825,-552]],id:"31175",properties:{name:"Valley"}},{type:"Polygon",arcs:[[2826,-1254,2827,2828,-2684,2829,2830,2831,-1903]],id:"37097",properties:{name:"Iredell"}},{type:"Polygon",arcs:[[2832,2833,2834,2835,2836]],id:"01057",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[2837,2838,-148,2839,-856,2840]],id:"20039",properties:{name:"Decatur"}},{type:"Polygon",arcs:[[2841,2842,2843,2844,2845,-1994]],id:"41001",properties:{name:"Baker"}},{type:"Polygon",arcs:[[2846,2847,2848,2849,2850]],id:"01133",properties:{name:"Winston"}},{type:"Polygon",arcs:[[2851,2852,2853,2854,2855]],id:"29221",properties:{name:"Washington"}},{type:"Polygon",arcs:[[2856,2857,2858,2859,2860,2861,2862]],id:"18007",properties:{name:"Benton"}},{type:"MultiPolygon",arcs:[[[2863]],[[2864]],[[2865]],[[2866,2867,2868,2869]]],id:"06083",properties:{name:"Santa Barbara"}},{type:"Polygon",arcs:[[2870,-533,-2104,2871,2872]],id:"06105",properties:{name:"Trinity"}},{type:"Polygon",arcs:[[2873,2874,2875,2876,2877,2878]],id:"17117",properties:{name:"Macoupin"}},{type:"Polygon",arcs:[[2879,2880,2881,2882,-1257,-2070]],id:"26145",properties:{name:"Saginaw"}},{type:"Polygon",arcs:[[-2725,-2414,2883,2884,-661,2885,-2775]],id:"48143",properties:{name:"Erath"}},{type:"MultiPolygon",arcs:[[[2886,2887,2888,2889,2890,2891]],[[2892,2893]]],id:"12101",properties:{name:"Pasco"}},{type:"Polygon",arcs:[[2894,2895,-775,2896,2897]],id:"37169",properties:{name:"Stokes"}},{type:"Polygon",arcs:[[2898,2899,-2716,2900,2901,2902,2903]],id:"16045",properties:{name:"Gem"}},{type:"Polygon",arcs:[[2904,2905,2906,2907,2908]],id:"54021",properties:{name:"Gilmer"}},{type:"Polygon",arcs:[[-695,2909,2910,2911,2912,2913]],id:"40003",properties:{name:"Alfalfa"}},{type:"Polygon",arcs:[[2914,2915,2916,2917,2918,-1484,2919]],id:"20201",properties:{name:"Washington"}},{type:"Polygon",arcs:[[2920,2921,2922,2923,2924]],id:"13109",properties:{name:"Evans"}},{type:"Polygon",arcs:[[2925,2926,2927,-1162,2928,2929,2930]],id:"18065",properties:{name:"Henry"}},{type:"Polygon",arcs:[[2931,2932,2933,2934]],id:"45023",properties:{name:"Chester"}},{type:"Polygon",arcs:[[2935,-1934,-6,2936,2937,2938,2939]],id:"04012",properties:{name:"La Paz"}},{type:"Polygon",arcs:[[2940,2941,2942,-550,2943,-424]],id:"31009",properties:{name:"Blaine"}},{type:"Polygon",arcs:[[-2714,2944,-1929,-1467,2945,2946,-1771]],id:"16059",properties:{name:"Lemhi"}},{type:"Polygon",arcs:[[2947,-996,2948,2949,2950]],id:"20069",properties:{name:"Gray"}},{type:"Polygon",arcs:[[-2315,2951,2952,2953,2954]],id:"28097",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[2955,2956,2957,2958,-2457,2959,2960]],id:"48459",properties:{name:"Upshur"}},{type:"Polygon",arcs:[[2961,2962,2963,2964,2965,2966,-511]],id:"48031",properties:{name:"Blanco"}},{type:"Polygon",arcs:[[2967,2968,2969,2970,2971]],id:"20061",properties:{name:"Geary"}},{type:"Polygon",arcs:[[2972,2973,2974,2975,2976,2977]],id:"21041",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[2978,2979,-1233,-1516,2980]],id:"18099",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[2981,-774,2982,-1145,2983]],id:"37081",properties:{name:"Guilford"}},{type:"Polygon",arcs:[[2984,2985]],id:"51610",properties:{name:"Falls Church"}},{type:"Polygon",arcs:[[2986]],id:"51678",properties:{name:"Lexington"}},{type:"Polygon",arcs:[[2987,-2569,2988,2989,2990,2991,-1141]],id:"26059",properties:{name:"Hillsdale"}},{type:"Polygon",arcs:[[-1153,2992,-2137,2993,-2759,2994]],id:"20203",properties:{name:"Wichita"}},{type:"Polygon",arcs:[[-1875,2995,2996,2997,2998]],id:"27039",properties:{name:"Dodge"}},{type:"Polygon",arcs:[[2999,-1118,3e3,-1194]],id:"17039",properties:{name:"De Witt"}},{type:"Polygon",arcs:[[-1657,-903,-2689,3001,3002,3003]],id:"48003",properties:{name:"Andrews"}},{type:"Polygon",arcs:[[3004,-1394,-561,3005,-1989,-112,3006]],id:"46111",properties:{name:"Sanborn"}},{type:"Polygon",arcs:[[3007,3008,-1878,3009,3010,3011]],id:"27079",properties:{name:"Le Sueur"}},{type:"Polygon",arcs:[[3012,3013,3014,3015,-936,3016]],id:"55105",properties:{name:"Rock"}},{type:"Polygon",arcs:[[-1876,-2999,3017,-1305,3018]],id:"27147",properties:{name:"Steele"}},{type:"Polygon",arcs:[[3019,3020,3021,3022,3023,3024]],id:"42065",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[3025,3026,-991,3027,3028]],id:"19151",properties:{name:"Pocahontas"}},{type:"Polygon",arcs:[[-1445,-1291,3029,3030,3031,-701]],id:"27105",properties:{name:"Nobles"}},{type:"MultiPolygon",arcs:[[[3032,3033]],[[3034]],[[3035]],[[3036]],[[3037]],[[-1593,3038]],[[3039,3040]]],id:"02198",properties:{name:"Prince of Wales-Hyder"}},{type:"Polygon",arcs:[[3041,3042,3043,-315]],id:"46121",properties:{name:"Todd"}},{type:"Polygon",arcs:[[3044,3045,3046,3047,3048]],id:"13003",properties:{name:"Atkinson"}},{type:"MultiPolygon",arcs:[[[-3041,3049]],[[3050]],[[-1382,3051]]],id:"02220",properties:{name:"Sitka"}},{type:"Polygon",arcs:[[-2316,-2955,3052,3053,3054]],id:"28015",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[3055,3056,-1762,3057]],id:"12111",properties:{name:"St. Lucie"}},{type:"Polygon",arcs:[[-254,-2061,-1642,3058,3059]],id:"19051",properties:{name:"Davis"}},{type:"Polygon",arcs:[[3060,3061,3062,3063,3064]],id:"17109",properties:{name:"McDonough"}},{type:"Polygon",arcs:[[3065,3066,3067,3068,3069]],id:"39143",properties:{name:"Sandusky"}},{type:"Polygon",arcs:[[-2682,3070,-1133,3071,3072,-818,-2662]],id:"17191",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[3073,3074,3075,3076,3077,3078]],id:"48243",properties:{name:"Jeff Davis"}},{type:"Polygon",arcs:[[3079,-815,3080,-3008,3081,3082]],id:"27143",properties:{name:"Sibley"}},{type:"Polygon",arcs:[[3083,-1047,3084,-1730]],id:"48275",properties:{name:"Knox"}},{type:"Polygon",arcs:[[3085,3086,3087,3088,3089,3090,3091]],id:"17163",properties:{name:"St. Clair"}},{type:"Polygon",arcs:[[-745,3092,3093,3094,-972]],id:"26011",properties:{name:"Arenac"}},{type:"Polygon",arcs:[[-1319,3095,3096,3097,-1128,3098]],id:"17079",properties:{name:"Jasper"}},{type:"Polygon",arcs:[[-1485,-2919,3099,-2968,3100,3101]],id:"20027",properties:{name:"Clay"}},{type:"Polygon",arcs:[[3102,3103,3104,3105,-1930,-2945,-2713,3106,3107]],id:"16049",properties:{name:"Idaho"}},{type:"Polygon",arcs:[[3108,-1586,3109,-2077]],id:"38079",properties:{name:"Rolette"}},{type:"Polygon",arcs:[[-2840,-147,-2578,3110,-857]],id:"20179",properties:{name:"Sheridan"}},{type:"Polygon",arcs:[[3111,3112,-2962,-510,-2455]],id:"48299",properties:{name:"Llano"}},{type:"Polygon",arcs:[[3113,3114,3115,-2215,3116,3117,3118]],id:"08101",properties:{name:"Pueblo"}},{type:"Polygon",arcs:[[3119,3120,-2478,3121,3122]],id:"41015",properties:{name:"Curry"}},{type:"Polygon",arcs:[[3123,-2465,3124,3125,-999,3126]],id:"28159",properties:{name:"Winston"}},{type:"Polygon",arcs:[[-2521,-1901,3127,3128,-1005]],id:"31099",properties:{name:"Kearney"}},{type:"Polygon",arcs:[[3129,-2305,3130,3131,3132,3133,3134,3135]],id:"54103",properties:{name:"Wetzel"}},{type:"Polygon",arcs:[[3136,-801,3137,3138]],id:"13201",properties:{name:"Miller"}},{type:"Polygon",arcs:[[-1788,3139,3140,3141,-130]],id:"08003",properties:{name:"Alamosa"}},{type:"Polygon",arcs:[[-741,-2389,-698,3142,3143,-993]],id:"20097",properties:{name:"Kiowa"}},{type:"Polygon",arcs:[[3144,3145,3146,-674]],id:"38041",properties:{name:"Hettinger"}},{type:"Polygon",arcs:[[-2997,3147,3148,3149,3150,3151]],id:"27109",properties:{name:"Olmsted"}},{type:"Polygon",arcs:[[-1785,3152,-2550,-1096,3153,3154]],id:"19047",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[3155,3156,3157,-1203,3158,-2418]],id:"20139",properties:{name:"Osage"}},{type:"Polygon",arcs:[[3159,-191,3160,-733,-1769]],id:"19075",properties:{name:"Grundy"}},{type:"Polygon",arcs:[[3161,3162,-860,3163,-1151,3164]],id:"20181",properties:{name:"Sherman"}},{type:"Polygon",arcs:[[-2549,3165,3166,-1097]],id:"19009",properties:{name:"Audubon"}},{type:"MultiPolygon",arcs:[[[3167]],[[3168]],[[3169]],[[3170]],[[3171,-705,3172,3173,3174,3175]]],id:"23009",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[3176,3177,3178,3179,3180,3181]],id:"05081",properties:{name:"Little River"}},{type:"Polygon",arcs:[[3182,3183,3184,3185]],id:"05143",properties:{name:"Washington"}},{type:"Polygon",arcs:[[3186,3187,3188,3189,-2399,3190]],id:"05119",properties:{name:"Pulaski"}},{type:"Polygon",arcs:[[3191,3192,3193,3194,-3188,3195]],id:"05085",properties:{name:"Lonoke"}},{type:"Polygon",arcs:[[3196,3197,3198,3199,3200,3201,3202]],id:"08009",properties:{name:"Baca"}},{type:"Polygon",arcs:[[3203,3204,3205,3206,3207,3208,3209,3210]],id:"16031",properties:{name:"Cassia"}},{type:"Polygon",arcs:[[3211,3212,3213,3214,3215,3216,3217]],id:"01021",properties:{name:"Chilton"}},{type:"Polygon",arcs:[[-1890,3218,3219,3220,3221,-165]],id:"13081",properties:{name:"Crisp"}},{type:"Polygon",arcs:[[3222,3223,-1443,-1454,3224]],id:"27083",properties:{name:"Lyon"}},{type:"Polygon",arcs:[[3225,3226,3227,3228,3229,3230]],id:"51049",properties:{name:"Cumberland"}},{type:"Polygon",arcs:[[3231,3232,3233,3234,3235,3236]],id:"31133",properties:{name:"Pawnee"}},{type:"Polygon",arcs:[[-2484,3237,-504,3238,-1617]],id:"48483",properties:{name:"Wheeler"}},{type:"Polygon",arcs:[[-361,3239,3240,-30,-2435,-652]],id:"38091",properties:{name:"Steele"}},{type:"Polygon",arcs:[[-883,-925,-2257,-350,3241]],id:"31185",properties:{name:"York"}},{type:"Polygon",arcs:[[-2504,-868,3242,3243]],id:"26079",properties:{name:"Kalkaska"}},{type:"Polygon",arcs:[[-2510,3244,3245,-2071,-2612,-2575]],id:"20163",properties:{name:"Rooks"}},{type:"Polygon",arcs:[[3246,3247,3248,-3096,-1318]],id:"17035",properties:{name:"Cumberland"}},{type:"Polygon",arcs:[[3249,3250,3251,3252,-2012,3253,3254]],id:"54101",properties:{name:"Webster"}},{type:"Polygon",arcs:[[3255,3256,3257,3258,3259]],id:"28139",properties:{name:"Tippah"}},{type:"Polygon",arcs:[[3260,3261,3262,3263,3264,3265,-3045,3266]],id:"13069",properties:{name:"Coffee"}},{type:"Polygon",arcs:[[3267,3268,3269,3270,3271]],id:"20169",properties:{name:"Saline"}},{type:"Polygon",arcs:[[3272,3273,3274,3275]],id:"28119",properties:{name:"Quitman"}},{type:"Polygon",arcs:[[-2553,-2436,-1615,-304,3276,-2110]],id:"38045",properties:{name:"LaMoure"}},{type:"Polygon",arcs:[[3277,-3272,3278,3279,3280,3281]],id:"20053",properties:{name:"Ellsworth"}},{type:"Polygon",arcs:[[3282,3283,3284,-63,3285,3286,3287,3288]],id:"18055",properties:{name:"Greene"}},{type:"Polygon",arcs:[[3289,3290,-1646,3291,3292,3293,-2322]],id:"29001",properties:{name:"Adair"}},{type:"Polygon",arcs:[[3294,3295,3296,3297,-907,3298]],id:"39075",properties:{name:"Holmes"}},{type:"Polygon",arcs:[[-2146,-2163,3299,3300,3301]],id:"05029",properties:{name:"Conway"}},{type:"Polygon",arcs:[[-1517,-1238,3302,3303,3304]],id:"18131",properties:{name:"Pulaski"}},{type:"Polygon",arcs:[[3305,3306,-202,-748,3307,-2825]],id:"31077",properties:{name:"Greeley"}},{type:"Polygon",arcs:[[3308,-518,-2216,-2787]],id:"48107",properties:{name:"Crosby"}},{type:"Polygon",arcs:[[3309,3310,3311,3312,3313,3314,3315]],id:"21083",properties:{name:"Graves"}},{type:"Polygon",arcs:[[3316,3317,3318,3319,3320,3321]],id:"21171",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[3322,-1316,3323,3324]],id:"17005",properties:{name:"Bond"}},{type:"Polygon",arcs:[[3325,3326,3327,3328,3329,3330,3331]],id:"05097",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[3332,3333,3334,3335,3336,-1171]],id:"47159",properties:{name:"Smith"}},{type:"Polygon",arcs:[[3337,3338,3339,3340,3341,3342]],id:"17045",properties:{name:"Edgar"}},{type:"Polygon",arcs:[[3343,3344,3345,3346,3347,3348]],id:"42021",properties:{name:"Cambria"}},{type:"Polygon",arcs:[[3349,3350,3351,3352,3353,3354]],id:"41043",properties:{name:"Linn"}},{type:"Polygon",arcs:[[-824,-312,3355,-3083,3356,3357,3358,3359,3360]],id:"27129",properties:{name:"Renville"}},{type:"Polygon",arcs:[[3361,3362,3363,3364,-1330,-2021]],id:"27153",properties:{name:"Todd"}},{type:"Polygon",arcs:[[3365,3366,3367,3368,-3351,3369]],id:"41047",properties:{name:"Marion"}},{type:"Polygon",arcs:[[3370,-205,3371,3372,3373,3374,3375]],id:"42071",properties:{name:"Lancaster"}},{type:"Polygon",arcs:[[3376,3377,3378,3379,-2161]],id:"05023",properties:{name:"Cleburne"}},{type:"Polygon",arcs:[[3380,3381,-3262,3382,3383]],id:"13017",properties:{name:"Ben Hill"}},{type:"MultiPolygon",arcs:[[[3384]],[[3385]],[[3386]],[[3387,3388]]],id:"15009",properties:{name:"Maui"}},{type:"Polygon",arcs:[[3389,3390,3391,3392,3393,-1525]],id:"29169",properties:{name:"Pulaski"}},{type:"Polygon",arcs:[[-1359,3394,-889,-521]],id:"48311",properties:{name:"McMullen"}},{type:"Polygon",arcs:[[-983,-920,-2544,-256,3395,3396]],id:"19113",properties:{name:"Linn"}},{type:"Polygon",arcs:[[-383,-590,3397,-1167,-2485,-1616,-2699]],id:"48393",properties:{name:"Roberts"}},{type:"Polygon",arcs:[[-1799,3398,-2773,3399,-252,-1185]],id:"19107",properties:{name:"Keokuk"}},{type:"Polygon",arcs:[[-2002,3400,3401,3402,3403,3404]],id:"39073",properties:{name:"Hocking"}},{type:"Polygon",arcs:[[3405,3406,3407,3408,3409]],id:"13053",properties:{name:"Chattahoochee"}},{type:"Polygon",arcs:[[3410,-2427,3411,3412,-1414]],id:"30065",properties:{name:"Musselshell"}},{type:"Polygon",arcs:[[3413,-604,3414,3415]],id:"13149",properties:{name:"Heard"}},{type:"Polygon",arcs:[[3416,3417]],id:"27031",properties:{name:"Cook"}},{type:"Polygon",arcs:[[3418,3419,-2545,-3153,-1784]],id:"19161",properties:{name:"Sac"}},{type:"Polygon",arcs:[[3420,3421,3422,-2528,3423]],id:"37145",properties:{name:"Person"}},{type:"Polygon",arcs:[[-2295,-1704,3424]],id:"02185",properties:{name:"North Slope"}},{type:"Polygon",arcs:[[3425,-2083,3426,3427,-2040]],id:"18069",properties:{name:"Huntington"}},{type:"Polygon",arcs:[[3428,-2855,3429,3430,3431,3432,-2192]],id:"29093",properties:{name:"Iron"}},{type:"Polygon",arcs:[[-517,-2236,-1022,3433,-2217]],id:"48263",properties:{name:"Kent"}},{type:"Polygon",arcs:[[3434,3435,-2319,3436,3437,3438,3439,3440]],id:"51155",properties:{name:"Pulaski"}},{type:"Polygon",arcs:[[3441,-1639,-1533,3442,3443,-2337]],id:"29025",properties:{name:"Caldwell"}},{type:"Polygon",arcs:[[3444,3445,3446,3447,3448,3449]],id:"01073",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[3450]],id:"15001",properties:{name:"Hawaii"}},{type:"Polygon",arcs:[[3451,3452,3453,3454]],id:"53023",properties:{name:"Garfield"}},{type:"Polygon",arcs:[[3455,3456,3457,3458,3459]],id:"01027",properties:{name:"Clay"}},{type:"Polygon",arcs:[[3460,3461,-1786,3462,3463,3464,3465]],id:"19193",properties:{name:"Woodbury"}},{type:"Polygon",arcs:[[3466,-1099,3467,-2673,3468,3469,3470,3471]],id:"19155",properties:{name:"Pottawattamie"}},{type:"Polygon",arcs:[[-1773,3472,3473,3474,-3206,3475,-17,3476,3477]],id:"16013",properties:{name:"Blaine"}},{type:"MultiPolygon",arcs:[[[3478]],[[3479,3480,-3176,3481,3482,3483,3484]]],id:"23027",properties:{name:"Waldo"}},{type:"Polygon",arcs:[[3485,3486,3487,3488,3489,3490]],id:"25025",properties:{name:"Suffolk"}},{type:"Polygon",arcs:[[3491,3492,3493,3494,3495,3496]],id:"25011",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-973,-3095,3497,3498,-2880,-2069]],id:"26017",properties:{name:"Bay"}},{type:"Polygon",arcs:[[3499,3500,-3225,-1453,3501]],id:"27081",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[3502,3503,3504,3505,3506,3507]],id:"28011",properties:{name:"Bolivar"}},{type:"Polygon",arcs:[[3508,3509,3510,-997,-953]],id:"26007",properties:{name:"Alpena"}},{type:"Polygon",arcs:[[3511,3512,3513,3514,3515]],id:"26053",properties:{name:"Gogebic"}},{type:"Polygon",arcs:[[3516,-289,3517,3518,-3480,3519,3520]],id:"23025",properties:{name:"Somerset"}},{type:"Polygon",arcs:[[3521,3522,3523,3524,3525,3526,3527,3528,3529]],id:"28149",properties:{name:"Warren"}},{type:"Polygon",arcs:[[3530,3531,3532,3533,3534,3535,3536]],id:"36075",properties:{name:"Oswego"}},{type:"Polygon",arcs:[[3537,-3359,3538,-1287,-1444,-3224]],id:"27127",properties:{name:"Redwood"}},{type:"Polygon",arcs:[[3539,3540,3541,3542,3543,3544,3545]],id:"39095",properties:{name:"Lucas"}},{type:"Polygon",arcs:[[3546,-260,3547,3548,3549]],id:"19139",properties:{name:"Muscatine"}},{type:"Polygon",arcs:[[-494,3550,3551,3552,3553,3554]],id:"40033",properties:{name:"Cotton"}},{type:"Polygon",arcs:[[-3469,-2676,3555,3556,3557]],id:"19129",properties:{name:"Mills"}},{type:"Polygon",arcs:[[3558,3559,3560,3561]],id:"36059",properties:{name:"Nassau"}},{type:"Polygon",arcs:[[3562,3563,3564,3565,3566,3567]],id:"30109",properties:{name:"Wibaux"}},{type:"Polygon",arcs:[[3568,3569,3570,3571,3572]],id:"29155",properties:{name:"Pemiscot"}},{type:"Polygon",arcs:[[3573,3574,3575,3576,3577,-2636]],id:"29127",properties:{name:"Marion"}},{type:"Polygon",arcs:[[3578,3579,-1568,3580,3581]],id:"35017",properties:{name:"Grant"}},{type:"Polygon",arcs:[[3582,-138,3583,3584,3585,3586,3587,3588]],id:"51107",properties:{name:"Loudoun"}},{type:"Polygon",arcs:[[3589,3590,3591,3592,3593,-1370]],id:"46105",properties:{name:"Perkins"}},{type:"Polygon",arcs:[[3594,-2966,3595,3596,3597]],id:"48091",properties:{name:"Comal"}},{type:"Polygon",arcs:[[3598,-2616,3599,3600]],id:"48505",properties:{name:"Zapata"}},{type:"MultiPolygon",arcs:[[[3601,3602,3603,3604]],[[3605,3606,3607,3608]],[[3609,3610,3611]]],id:"48007",properties:{name:"Aransas"}},{type:"Polygon",arcs:[[3612,3613,3614,3615,3616,3617]],id:"48361",properties:{name:"Orange"}},{type:"Polygon",arcs:[[3618,-3003,3619,3620,3621]],id:"48495",properties:{name:"Winkler"}},{type:"Polygon",arcs:[[3622,3623,3624,3625,3626,3627]],id:"51011",properties:{name:"Appomattox"}},{type:"Polygon",arcs:[[3628,3629,3630,-1057,3631,3632,3633,-2364]],id:"53025",properties:{name:"Grant"}},{type:"Polygon",arcs:[[3634,-3134,3635,3636,-2906,3637]],id:"54017",properties:{name:"Doddridge"}},{type:"Polygon",arcs:[[3638,-526,3639,3640,-2013,-3253,3641]],id:"54083",properties:{name:"Randolph"}},{type:"Polygon",arcs:[[-3031,3642,3643,-2816,3644]],id:"19143",properties:{name:"Osceola"}},{type:"Polygon",arcs:[[-1264,3645,3646,3647,3648]],id:"21189",properties:{name:"Owsley"}},{type:"Polygon",arcs:[[3649,3650,-1027,3651]],id:"37181",properties:{name:"Vance"}},{type:"Polygon",arcs:[[-685,3652,3653,3654,3655,3656]],id:"04007",properties:{name:"Gila"}},{type:"Polygon",arcs:[[3657,3658,3659,3660,-2159,-2144,3661]],id:"05129",properties:{name:"Searcy"}},{type:"Polygon",arcs:[[3662,3663,3664,3665,3666,3667]],id:"05095",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[3668,3669,-2342,-2733]],id:"12133",properties:{name:"Washington"}},{type:"Polygon",arcs:[[3670,3671,-1703,3672,-2444,3673]],id:"13217",properties:{name:"Newton"}},{type:"Polygon",arcs:[[3674,3675,3676,-2888,3677,3678]],id:"12119",properties:{name:"Sumter"}},{type:"Polygon",arcs:[[-1522,3679,-2710,3680,-69,3681]],id:"18031",properties:{name:"Decatur"}},{type:"Polygon",arcs:[[3682,3683,3684,-982,-2678]],id:"19065",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[3685,-735,-1800,-1183,-1790,-1811]],id:"19099",properties:{name:"Jasper"}},{type:"Polygon",arcs:[[3686,3687,-1265,-3649,3688,3689,3690]],id:"21109",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[3691,3692,3693,-3523,3694,3695]],id:"22035",properties:{name:"East Carroll"}},{type:"Polygon",arcs:[[-810,3696,3697,3698,3699,3700]],id:"22113",properties:{name:"Vermilion"}},{type:"Polygon",arcs:[[3701,3702,3703,3704,-807,3705]],id:"22039",properties:{name:"Evangeline"}},{type:"Polygon",arcs:[[3706,-1640,-3442,-2336,3707,3708]],id:"29063",properties:{name:"DeKalb"}},{type:"Polygon",arcs:[[-1248,3709,3710,3711,-2852,3712,3713]],id:"29071",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[3714,3715,-3232,3716]],id:"31097",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[3717,-630,3718,-3306,-2824,-546]],id:"31183",properties:{name:"Wheeler"}},{type:"Polygon",arcs:[[3719,3720,3721,3722,-1564,-3580,3723]],id:"35051",properties:{name:"Sierra"}},{type:"Polygon",arcs:[[3724,3725,3726,3727,3728,3729]],id:"37107",properties:{name:"Lenoir"}},{type:"Polygon",arcs:[[3730,3731,3732,3733,3734,3735]],id:"37045",properties:{name:"Cleveland"}},{type:"Polygon",arcs:[[3736,3737,3738,3739,3740]],id:"31105",properties:{name:"Kimball"}},{type:"Polygon",arcs:[[3741,3742,-2118,3743,3744,3745]],id:"40145",properties:{name:"Wagoner"}},{type:"Polygon",arcs:[[3746,3747,3748,3749]],id:"40027",properties:{name:"Cleveland"}},{type:"Polygon",arcs:[[3750,3751,3752,-2274]],id:"40099",properties:{name:"Murray"}},{type:"Polygon",arcs:[[3753,3754,3755,3756,-965]],id:"42003",properties:{name:"Allegheny"}},{type:"Polygon",arcs:[[3757,3758,3759,-2935,3760,3761,3762]],id:"45087",properties:{name:"Union"}},{type:"Polygon",arcs:[[3763,-240,-2119,3764]],id:"46065",properties:{name:"Hughes"}},{type:"Polygon",arcs:[[3765,3766,3767,3768,3769,3770]],id:"21235",properties:{name:"Whitley"}},{type:"Polygon",arcs:[[3771,3772,-1021,3773,3774,3775]],id:"37175",properties:{name:"Transylvania"}},{type:"Polygon",arcs:[[3776,3777,3778,3779,3780,3781,-3727]],id:"37049",properties:{name:"Craven"}},{type:"Polygon",arcs:[[-2235,3782,-216,-2231,-372,-1024]],id:"48253",properties:{name:"Jones"}},{type:"Polygon",arcs:[[3783]],id:"51720",properties:{name:"Norton"}},{type:"Polygon",arcs:[[3784,3785,3786,3787,3788,3789]],id:"39105",properties:{name:"Meigs"}},{type:"Polygon",arcs:[[3790,3791,-3790,3792,3793,3794]],id:"39053",properties:{name:"Gallia"}},{type:"Polygon",arcs:[[3795,-3254,-2017,3796,3797,3798,3799,3800]],id:"54025",properties:{name:"Greenbrier"}},{type:"Polygon",arcs:[[3801,3802,3803,-569,3804]],id:"05111",properties:{name:"Poinsett"}},{type:"Polygon",arcs:[[3805,3806,3807,-2610,3808,3809,3810]],id:"06099",properties:{name:"Stanislaus"}},{type:"Polygon",arcs:[[3811,3812,3813,3814,3815]],id:"06011",properties:{name:"Colusa"}},{type:"Polygon",arcs:[[3816,3817,3818,3819,3820]],id:"13089",properties:{name:"DeKalb"}},{type:"Polygon",arcs:[[3821,3822,3823,3824,3825]],id:"13311",properties:{name:"White"}},{type:"Polygon",arcs:[[3826,3827,3828,-726,3829,3830]],id:"13115",properties:{name:"Floyd"}},{type:"Polygon",arcs:[[3831,-20,3832,3833,3834]],id:"16047",properties:{name:"Gooding"}},{type:"Polygon",arcs:[[3835,-938,-1090,3836,3837,3838]],id:"17141",properties:{name:"Ogle"}},{type:"Polygon",arcs:[[3839,3840,3841,-3564,3842]],id:"30083",properties:{name:"Richland"}},{type:"Polygon",arcs:[[3843,3844,3845,3846,3847]],id:"37065",properties:{name:"Edgecombe"}},{type:"Polygon",arcs:[[3848,3849,-591,-894,3850]],id:"48421",properties:{name:"Sherman"}},{type:"Polygon",arcs:[[3851,3852,3853,3854,3855]],id:"01017",properties:{name:"Chambers"}},{type:"Polygon",arcs:[[-1213,-1218,3856,3857,-2606,3858]],id:"06003",properties:{name:"Alpine"}},{type:"Polygon",arcs:[[-2476,3859,3860,3861,-528,-2871,3862,3863]],id:"06093",properties:{name:"Siskiyou"}},{type:"Polygon",arcs:[[3864,3865,3866,-1179]],id:"08083",properties:{name:"Montezuma"}},{type:"Polygon",arcs:[[3867,3868,-2030,3869,3870,3871]],id:"13213",properties:{name:"Murray"}},{type:"Polygon",arcs:[[3872,3873,3874,3875,3876,-3208]],id:"16071",properties:{name:"Oneida"}},{type:"Polygon",arcs:[[3877,3878,3879,3880,3881,3882]],id:"18129",properties:{name:"Posey"}},{type:"Polygon",arcs:[[3883,3884,3885,3886,3887,3888,3889,3890,3891]],id:"21093",properties:{name:"Hardin"}},{type:"Polygon",arcs:[[-3616,3892,3893,-3700,3894,3895]],id:"22023",properties:{name:"Cameron"}},{type:"Polygon",arcs:[[3896,3897,3898,3899,-1200]],id:"20121",properties:{name:"Miami"}},{type:"Polygon",arcs:[[-2715,-1775,3900,3901,-2901]],id:"16015",properties:{name:"Boise"}},{type:"Polygon",arcs:[[-2535,3902,3903,3904,3905,3906,3907]],id:"16019",properties:{name:"Bonneville"}},{type:"Polygon",arcs:[[3908,3909,3910,3911,3912,3913,3914]],id:"25023",properties:{name:"Plymouth"}},{type:"Polygon",arcs:[[3915,3916,3917,3918,3919,3920,3921,3922]],id:"22077",properties:{name:"Pointe Coupee"}},{type:"Polygon",arcs:[[3923,3924,-1604,-170,3925]],id:"26043",properties:{name:"Dickinson"}},{type:"Polygon",arcs:[[-2408,-1548,3926,3927,-1588,3928]],id:"29097",properties:{name:"Jasper"}},{type:"Polygon",arcs:[[3929,-2514,3930,3931,3932,3933]],id:"20189",properties:{name:"Stevens"}},{type:"Polygon",arcs:[[3934,3935,3936,3937,3938,3939]],id:"17085",properties:{name:"Jo Daviess"}},{type:"Polygon",arcs:[[-3063,3940,-1745,3941,-1805,3942,3943]],id:"17057",properties:{name:"Fulton"}},{type:"Polygon",arcs:[[3944,-718,3945,3946,3947,-356]],id:"36055",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[3948,-3418,3949,-2764]],id:"27075",properties:{name:"Lake"}},{type:"Polygon",arcs:[[3950,3951,3952,3953,3954]],id:"41037",properties:{name:"Lake"}},{type:"MultiPolygon",arcs:[[[3955,3956]],[[3957]]],id:"44005",properties:{name:"Newport"}},{type:"Polygon",arcs:[[3958,3959,3960,3961,3962,3963,3964]],id:"36043",properties:{name:"Herkimer"}},{type:"Polygon",arcs:[[3965,-3202,3966,3967,3968,3969,3970,3971]],id:"35059",properties:{name:"Union"}},{type:"Polygon",arcs:[[3972,3973,3974,3975,3976,3977]],id:"48071",properties:{name:"Chambers"}},{type:"Polygon",arcs:[[3978,3979,3980,-3630,3981,-2355,3982,3983]],id:"53047",properties:{name:"Okanogan"}},{type:"Polygon",arcs:[[3984,3985,3986,3987,-3447,3988]],id:"01115",properties:{name:"St. Clair"}},{type:"Polygon",arcs:[[3989,3990,3991,3992,3993]],id:"55059",properties:{name:"Kenosha"}},{type:"Polygon",arcs:[[-393,-2655,3994,3995]],id:"55077",properties:{name:"Marquette"}},{type:"Polygon",arcs:[[-404,3996,3997,3998,3999,-1401,-1431,4e3]],id:"55099",properties:{name:"Price"}},{type:"Polygon",arcs:[[-2229,4001,4002,4003,-688,4004,4005]],id:"16079",properties:{name:"Shoshone"}},{type:"Polygon",arcs:[[4006,4007,-1905,4008,4009,4010]],id:"37027",properties:{name:"Caldwell"}},{type:"Polygon",arcs:[[4011,4012,4013,4014]],id:"38065",properties:{name:"Oliver"}},{type:"Polygon",arcs:[[-3234,4015,4016,4017,4018,4019]],id:"31147",properties:{name:"Richardson"}},{type:"Polygon",arcs:[[4020,4021,-2838,4022,-1541]],id:"31145",properties:{name:"Red Willow"}},{type:"Polygon",arcs:[[4023,4024,4025,-3618,4026,4027]],id:"48199",properties:{name:"Hardin"}},{type:"Polygon",arcs:[[4028,4029,-1042,4030,4031,4032,4033,4034]],id:"01077",properties:{name:"Lauderdale"}},{type:"Polygon",arcs:[[-467,4035,4036,4037,-3183,4038,4039]],id:"05007",properties:{name:"Benton"}},{type:"Polygon",arcs:[[4040,4041,-1755,-2672,-1112,4042,-2794]],id:"17011",properties:{name:"Bureau"}},{type:"Polygon",arcs:[[-2041,-3428,4043,4044,4045,4046,4047,4048,-2105]],id:"18053",properties:{name:"Grant"}},{type:"Polygon",arcs:[[-3243,-1544,-861,-2752,4049]],id:"26113",properties:{name:"Missaukee"}},{type:"Polygon",arcs:[[-1299,-410,-1259,-1272,4050,-346]],id:"26117",properties:{name:"Montcalm"}},{type:"Polygon",arcs:[[-1527,4051,-2172,-871]],id:"29229",properties:{name:"Wright"}},{type:"Polygon",arcs:[[-1526,-3394,4052,-2195,-2202,4053,-2173,-4052]],id:"29215",properties:{name:"Texas"}},{type:"Polygon",arcs:[[4054,4055,4056,4057,-3431]],id:"29123",properties:{name:"Madison"}},{type:"Polygon",arcs:[[4058,4059,4060,-2048,-2374,4061,4062]],id:"28085",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[4063,4064,4065,4066,4067]],id:"35011",properties:{name:"De Baca"}},{type:"Polygon",arcs:[[4068,-3846,4069,4070,-3777,-3726,4071]],id:"37147",properties:{name:"Pitt"}},{type:"Polygon",arcs:[[4072,-4014,4073,4074,4075,4076,4077]],id:"38059",properties:{name:"Morton"}},{type:"Polygon",arcs:[[4078,4079,4080,4081,-88,4082,-3068]],id:"39077",properties:{name:"Huron"}},{type:"Polygon",arcs:[[-2641,4083,-3745,4084,4085,4086]],id:"40111",properties:{name:"Okmulgee"}},{type:"Polygon",arcs:[[4087,4088,4089,4090,4091,4092,4093,4094]],id:"45041",properties:{name:"Florence"}},{type:"Polygon",arcs:[[4095,4096,4097,4098,4099]],id:"45081",properties:{name:"Saluda"}},{type:"Polygon",arcs:[[4100,4101,-3884,4102,4103,4104]],id:"21027",properties:{name:"Breckinridge"}},{type:"Polygon",arcs:[[-3881,4105,4106,4107,4108,4109]],id:"21225",properties:{name:"Union"}},{type:"Polygon",arcs:[[4110,4111,4112,-395,4113,4114]],id:"21231",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[4115,-2633,4116,4117,4118,4119]],id:"21211",properties:{name:"Shelby"}},{type:"Polygon",arcs:[[-3728,-3782,4120,-2331,4121]],id:"37103",properties:{name:"Jones"}},{type:"Polygon",arcs:[[4122,4123,4124,4125,4126]],id:"47105",properties:{name:"Loudon"}},{type:"Polygon",arcs:[[4127,4128,4129,-911,4130,4131]],id:"48217",properties:{name:"Hill"}},{type:"Polygon",arcs:[[4132,4133,4134,4135,4136,4137,4138]],id:"51087",properties:{name:"Henrico"}},{type:"Polygon",arcs:[[4139,4140,4141,-796,4142]],id:"39019",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[-2604,4143,4144,4145,-359,4146]],id:"38099",properties:{name:"Walsh"}},{type:"Polygon",arcs:[[4147,4148,4149,-2619,4150,-1949,-1403]],id:"55067",properties:{name:"Langlade"}},{type:"Polygon",arcs:[[4151,4152,-1434,-2132,4153,4154]],id:"55017",properties:{name:"Chippewa"}},{type:"Polygon",arcs:[[4155,4156,4157,4158,4159]],id:"22101",properties:{name:"St. Mary"}},{type:"Polygon",arcs:[[4160,4161,4162,4163,4164,4165]],id:"41009",properties:{name:"Columbia"}},{type:"Polygon",arcs:[[4166,4167,-1996,4168,4169,4170,-3952]],id:"41025",properties:{name:"Harney"}},{type:"Polygon",arcs:[[4171,-1661,4172,4173,4174,4175]],id:"48491",properties:{name:"Williamson"}},{type:"Polygon",arcs:[[4176,4177,4178,4179,-322]],id:"49009",properties:{name:"Daggett"}},{type:"Polygon",arcs:[[4180,4181,-1844,4182,4183]],id:"48271",properties:{name:"Kinney"}},{type:"Polygon",arcs:[[4184,-318,4185,4186,4187]],id:"49029",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[4188,4189]],id:"51620",properties:{name:"Franklin"}},{type:"MultiPolygon",arcs:[[[4190]],[[4191,4192,4193,4194,-981,4195,-1806,4196,4197]]],id:"08005",properties:{name:"Arapahoe"}},{type:"Polygon",arcs:[[4198,4199,4200,4201,4202,-3828,4203,4204]],id:"13295",properties:{name:"Walker"}},{type:"Polygon",arcs:[[4205,4206,4207,4208,4209,4210]],id:"18121",properties:{name:"Parke"}},{type:"Polygon",arcs:[[4211,-72,4212,4213,4214]],id:"18143",properties:{name:"Scott"}},{type:"Polygon",arcs:[[-2703,4215,4216,4217,4218,4219]],id:"21227",properties:{name:"Warren"}},{type:"Polygon",arcs:[[4220,4221,-1210,4222,4223]],id:"22081",properties:{name:"Red River"}},{type:"Polygon",arcs:[[-3358,4224,4225,-1893,-1288,-3539]],id:"27015",properties:{name:"Brown"}},{type:"Polygon",arcs:[[4226,4227,4228,4229,-1250,4230,4231]],id:"29139",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[4232,-3572,4233,4234,4235,4236,4237,4238,-3803,4239]],id:"05093",properties:{name:"Mississippi"}},{type:"Polygon",arcs:[[4240,4241,4242,4243,-1221,4244]],id:"05049",properties:{name:"Fulton"}},{type:"Polygon",arcs:[[4245,4246,-4205,4247,4248,4249,4250]],id:"01049",properties:{name:"DeKalb"}},{type:"Polygon",arcs:[[4251,4252,4253,-3326,4254,4255]],id:"05127",properties:{name:"Scott"}},{type:"Polygon",arcs:[[-3122,-2477,-3864,4256,4257]],id:"06015",properties:{name:"Del Norte"}},{type:"Polygon",arcs:[[4258,-939,-3836,4259,-3937,4260]],id:"17177",properties:{name:"Stephenson"}},{type:"Polygon",arcs:[[4261,4262,4263,4264,4265,4266]],id:"18025",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[4267,4268,4269,4270]],id:"18043",properties:{name:"Floyd"}},{type:"Polygon",arcs:[[-2923,4271,4272,4273,4274,4275]],id:"13179",properties:{name:"Liberty"}},{type:"Polygon",arcs:[[-19,4276,-3204,4277,-3833]],id:"16053",properties:{name:"Jerome"}},{type:"Polygon",arcs:[[4278,4279,4280,4281,4282]],id:"24045",properties:{name:"Wicomico"}},{type:"Polygon",arcs:[[4283,4284,4285,4286]],id:"26013",properties:{name:"Baraga"}},{type:"Polygon",arcs:[[4287,4288,4289,4290,4291,-1,4292,4293]],id:"32017",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[4294,4295,4296,4297,4298]],id:"34011",properties:{name:"Cumberland"}},{type:"Polygon",arcs:[[4299,4300,4301,4302]],id:"18115",properties:{name:"Ohio"}},{type:"Polygon",arcs:[[4303,4304,4305,4306,4307,4308]],id:"36061",properties:{name:"New York"}},{type:"Polygon",arcs:[[4309,4310,-3960,4311,4312,4313]],id:"36089",properties:{name:"St. Lawrence"}},{type:"Polygon",arcs:[[4314,4315,-4063,4316,4317,4318]],id:"28063",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[4319,-2584,4320,4321,4322,4323]],id:"40023",properties:{name:"Choctaw"}},{type:"Polygon",arcs:[[4324,4325,4326,-2064,4327,4328,4329,4330,-3576]],id:"17149",properties:{name:"Pike"}},{type:"Polygon",arcs:[[4331,4332,4333,4334,-2094]],id:"19057",properties:{name:"Des Moines"}},{type:"Polygon",arcs:[[4335,4336,4337,-3841,4338,4339]],id:"30085",properties:{name:"Roosevelt"}},{type:"Polygon",arcs:[[4340,4341,4342,4343,-1019,4344,4345,4346]],id:"45007",properties:{name:"Anderson"}},{type:"Polygon",arcs:[[4347,4348,-2420,4349,4350]],id:"46033",properties:{name:"Custer"}},{type:"Polygon",arcs:[[4351,-4237,4352,4353,4354,4355,4356]],id:"47157",properties:{name:"Shelby"}},{type:"Polygon",arcs:[[4357,4358,4359,4360,4361]],id:"34019",properties:{name:"Hunterdon"}},{type:"Polygon",arcs:[[4362,4363,-770,-2896,4364],[-1232]],id:"51089",properties:{name:"Henry"}},{type:"Polygon",arcs:[[-2167,4365,4366,4367]],id:"51650",properties:{name:"Hampton"}},{type:"Polygon",arcs:[[4368,4369,-262,-2425,4370,4371]],id:"30071",properties:{name:"Phillips"}},{type:"Polygon",arcs:[[4372,4373,4374,4375,4376,4377,-3264]],id:"13161",properties:{name:"Jeff Davis"}},{type:"Polygon",arcs:[[4378,-3906,4379,4380,4381,4382,4383,4384]],id:"56023",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[4385,4386,4387,4388,4389]],id:"01063",properties:{name:"Greene"}},{type:"Polygon",arcs:[[4390,4391,-3178,4392,4393]],id:"05061",properties:{name:"Howard"}},{type:"Polygon",arcs:[[4394,4395,4396,-2015]],id:"51091",properties:{name:"Highland"}},{type:"Polygon",arcs:[[4397,4398,4399,4400]],id:"51101",properties:{name:"King William"}},{type:"MultiPolygon",arcs:[[[4401]],[[4402,4403,-402,4404]]],id:"55007",properties:{name:"Bayfield"}},{type:"Polygon",arcs:[[4405,4406,4407,4408,-2698,4409,4410,4411]],id:"55123",properties:{name:"Vernon"}},{type:"Polygon",arcs:[[-629,4412,4413,-198,-3307,-3719]],id:"31011",properties:{name:"Boone"}},{type:"Polygon",arcs:[[-4018,4414,4415,4416,4417,4418]],id:"20043",properties:{name:"Doniphan"}},{type:"Polygon",arcs:[[-2826,-3308,-752,-2519,-553]],id:"31163",properties:{name:"Sherman"}},{type:"Polygon",arcs:[[4419,4420,4421,-2526,4422]],id:"32021",properties:{name:"Mineral"}},{type:"Polygon",arcs:[[4423,4424,4425,4426,-1346]],id:"47083",properties:{name:"Houston"}},{type:"MultiPolygon",arcs:[[[-3607,4427]],[[4428,4429,4430,-3603,4431,4432,4433]]],id:"48057",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[4434,-3831,4435,4436,4437,4438,-4249]],id:"01019",properties:{name:"Cherokee"}},{type:"Polygon",arcs:[[-1415,-3413,4439,4440,4441,4442,4443]],id:"30111",properties:{name:"Yellowstone"}},{type:"Polygon",arcs:[[-750,4444,4445,-1898,-2520]],id:"31079",properties:{name:"Hall"}},{type:"Polygon",arcs:[[4446,4447,4448,-2942,4449]],id:"31017",properties:{name:"Brown"}},{type:"Polygon",arcs:[[4450,-2807,4451,4452]],id:"35061",properties:{name:"Valencia"}},{type:"Polygon",arcs:[[4453,4454,4455,4456,-2803,4457]],id:"35047",properties:{name:"San Miguel"}},{type:"Polygon",arcs:[[4458,-2897,-2982,4459,4460,-1252]],id:"37067",properties:{name:"Forsyth"}},{type:"Polygon",arcs:[[4461,4462,-3730,4463,4464,4465]],id:"37191",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[4466,4467,4468,4469,4470]],id:"37017",properties:{name:"Bladen"}},{type:"Polygon",arcs:[[4471,4472,-1471,4473,4474,4475,-2516,-1914]],id:"30059",properties:{name:"Meagher"}},{type:"Polygon",arcs:[[4476,4477,-3691,4478,4479,4480]],id:"21203",properties:{name:"Rockcastle"}},{type:"Polygon",arcs:[[4481,4482,-4100,4483,4484,4485]],id:"45047",properties:{name:"Greenwood"}},{type:"Polygon",arcs:[[4486,4487,-4105,4488,4489]],id:"21091",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[4490,4491,4492,4493,4494,4495,4496]],id:"21045",properties:{name:"Casey"}},{type:"Polygon",arcs:[[4497,4498,4499,4500,4501]],id:"21113",properties:{name:"Jessamine"}},{type:"Polygon",arcs:[[4502,4503,-1016,4504]],id:"37149",properties:{name:"Polk"}},{type:"Polygon",arcs:[[4505,4506,4507,4508,4509]],id:"37121",properties:{name:"Mitchell"}},{type:"Polygon",arcs:[[4510,4511,4512,4513,4514,4515]],id:"37053",properties:{name:"Currituck"}},{type:"MultiPolygon",arcs:[[[-2320]],[[4516,4517,4518,4519,-3437,-2318,-3436]]],id:"51121",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[-4138,4520]],id:"51760",properties:{name:"Richmond"}},{type:"Polygon",arcs:[[-3632,-1056,4521,4522,4523,4524]],id:"53021",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[4525,-2278,4526,4527,4528,-3552]],id:"40067",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[4529,4530,4531,4532,4533,4534,4535]],id:"47091",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[4536,4537,4538,4539,4540]],id:"47121",properties:{name:"Meigs"}},{type:"Polygon",arcs:[[-507,4541,-116,4542,-2120]],id:"46015",properties:{name:"Brule"}},{type:"Polygon",arcs:[[4543,4544,4545,4546,4547,-4129,4548]],id:"48139",properties:{name:"Ellis"}},{type:"Polygon",arcs:[[-3553,-4529,4549,-1064,4550,4551]],id:"48077",properties:{name:"Clay"}},{type:"Polygon",arcs:[[4552,4553,-3628,4554,4555,4556]],id:"51009",properties:{name:"Amherst"}},{type:"Polygon",arcs:[[4557,-1789,-574,4558]],id:"08079",properties:{name:"Mineral"}},{type:"Polygon",arcs:[[4559,4560,4561,4562,4563,4564,4565,4566]],id:"13107",properties:{name:"Emanuel"}},{type:"Polygon",arcs:[[-3943,-1804,-1198,4567,4568,4569]],id:"17125",properties:{name:"Mason"}},{type:"Polygon",arcs:[[-1768,-1770,-736,-3686,-1810,-1059]],id:"19169",properties:{name:"Story"}},{type:"Polygon",arcs:[[4570,4571,-3461,4572]],id:"19149",properties:{name:"Plymouth"}},{type:"Polygon",arcs:[[4573,4574,4575,4576,4577]],id:"20173",properties:{name:"Sedgwick"}},{type:"Polygon",arcs:[[4578,-2976,4579,-2629,-4116,4580]],id:"21103",properties:{name:"Henry"}},{type:"Polygon",arcs:[[4581,4582,4583]],id:"22089",properties:{name:"St. Charles"}},{type:"Polygon",arcs:[[-4033,4584,4585,4586]],id:"01033",properties:{name:"Colbert"}},{type:"Polygon",arcs:[[4587,4588,4589,4590,-250,4591,4592]],id:"04019",properties:{name:"Pima"}},{type:"Polygon",arcs:[[4593,4594,-3582,4595,4596,4597]],id:"04011",properties:{name:"Greenlee"}},{type:"Polygon",arcs:[[4598,4599,-572,4600,-3663,4601]],id:"05147",properties:{name:"Woodruff"}},{type:"Polygon",arcs:[[-1764,4602,4603,4604]],id:"12099",properties:{name:"Palm Beach"}},{type:"Polygon",arcs:[[4605,4606,4607,4608,4609]],id:"13127",properties:{name:"Glynn"}},{type:"Polygon",arcs:[[4610,-3060,4611,4612,-667]],id:"19007",properties:{name:"Appanoose"}},{type:"Polygon",arcs:[[4613,4614,-3940,4615,-2541,-918]],id:"19061",properties:{name:"Dubuque"}},{type:"Polygon",arcs:[[4616,4617,4618,4619,-3319,4620]],id:"21057",properties:{name:"Cumberland"}},{type:"MultiPolygon",arcs:[[[4621,4622,4623,4624,4625,-4156,4626,-3698]],[[4627]]],id:"22045",properties:{name:"Iberia"}},{type:"Polygon",arcs:[[4628,4629,4630,-1130]],id:"17101",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[4631,4632,4633]],id:"24037",properties:{name:"St. Mary's"}},{type:"Polygon",arcs:[[4634,4635,4636,4637,4638,4639]],id:"22033",properties:{name:"East Baton Rouge"}},{type:"Polygon",arcs:[[4640,4641,4642,4643]],id:"22043",properties:{name:"Grant"}},{type:"Polygon",arcs:[[-1296,-343,-1300,4644]],id:"26127",properties:{name:"Oceana"}},{type:"Polygon",arcs:[[4645,4646,4647,4648,-3715,4649]],id:"31131",properties:{name:"Otoe"}},{type:"Polygon",arcs:[[4650,-3993,4651,4652,4653,-1085,4654]],id:"17111",properties:{name:"McHenry"}},{type:"Polygon",arcs:[[4655,4656,4657,4658,-3245,-2509]],id:"20183",properties:{name:"Smith"}},{type:"Polygon",arcs:[[-4654,4659,4660,-1509,-1086]],id:"17089",properties:{name:"Kane"}},{type:"Polygon",arcs:[[-3722,4661,4662,4663,4664,4665,4666,4667]],id:"35035",properties:{name:"Otero"}},{type:"Polygon",arcs:[[4668,4669,-4266,4670,-4101,-4488]],id:"18123",properties:{name:"Perry"}},{type:"Polygon",arcs:[[-4630,4671,4672,-3288,4673,4674,4675,4676]],id:"18083",properties:{name:"Knox"}},{type:"Polygon",arcs:[[4677,4678,4679,4680,4681]],id:"42049",properties:{name:"Erie"}},{type:"Polygon",arcs:[[4682,4683,4684,4685,4686]],id:"45019",properties:{name:"Charleston"}},{type:"Polygon",arcs:[[-3734,4687,4688,4689,-2932,-3760,4690]],id:"45091",properties:{name:"York"}},{type:"Polygon",arcs:[[4691,4692,4693,4694,4695]],id:"45053",properties:{name:"Jasper"}},{type:"Polygon",arcs:[[4696,4697,4698,4699,4700,4701,4702,4703]],id:"36071",properties:{name:"Orange"}},{type:"Polygon",arcs:[[4704,4705,4706,-3493,4707]],id:"50025",properties:{name:"Windham"}},{type:"Polygon",arcs:[[-4596,-3581,-1567,4708,4709]],id:"35023",properties:{name:"Hidalgo"}},{type:"Polygon",arcs:[[4710,4711,4712,-4453,4713,4714,4715]],id:"35006",properties:{name:"Cibola"}},{type:"Polygon",arcs:[[-2328,4716,4717,4718,4719,4720,4721]],id:"54055",properties:{name:"Mercer"}},{type:"Polygon",arcs:[[4722,4723,4724,-2306,-3130,4725]],id:"54051",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[4726,4727,4728,4729,4730,-2625,4731]],id:"01101",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[4732,-4250,-4439,4733,-3985,4734]],id:"01055",properties:{name:"Etowah"}},{type:"Polygon",arcs:[[4735,-4586,4736,-2847,4737,4738]],id:"01059",properties:{name:"Franklin"}},{type:"MultiPolygon",arcs:[[[-484,-2301,4739,4740,-1977,4741,4742,4743,4744]],[[4745]],[[4746]]],id:"02050",properties:{name:"Bethel"}},{type:"Polygon",arcs:[[4747,-39,4748,4749,4750,4751,-4348]],id:"46103",properties:{name:"Pennington"}},{type:"Polygon",arcs:[[4752,4753,-567,4754,-1389,4755]],id:"46115",properties:{name:"Spink"}},{type:"Polygon",arcs:[[4756,4757,-4573,-3466,4758,4759,4760]],id:"46127",properties:{name:"Union"}},{type:"Polygon",arcs:[[4761,4762,4763,-4693]],id:"45013",properties:{name:"Beaufort"}},{type:"Polygon",arcs:[[4764,4765,4766,4767,4768,4769]],id:"47029",properties:{name:"Cocke"}},{type:"Polygon",arcs:[[4770,4771,4772,-4362,4773,4774,4775,4776]],id:"42017",properties:{name:"Bucks"}},{type:"Polygon",arcs:[[-1366,4777,4778,4779]],id:"46009",properties:{name:"Bon Homme"}},{type:"Polygon",arcs:[[-4426,4780,4781,4782,4783,4784]],id:"47043",properties:{name:"Dickson"}},{type:"Polygon",arcs:[[4785,4786,4787,4788,4789]],id:"40105",properties:{name:"Nowata"}},{type:"Polygon",arcs:[[4790,-2266,-2253,4791,-4546,4792]],id:"48257",properties:{name:"Kaufman"}},{type:"Polygon",arcs:[[4793,4794,-1048,-3084,-1729,-245]],id:"48155",properties:{name:"Foard"}},{type:"Polygon",arcs:[[4795,4796,4797,4798,4799]],id:"23023",properties:{name:"Sagadahoc"}},{type:"Polygon",arcs:[[4800,4801,-2261,4802,4803,4804]],id:"48085",properties:{name:"Collin"}},{type:"Polygon",arcs:[[-2776,-2886,-660,4805,-1650]],id:"48093",properties:{name:"Comanche"}},{type:"Polygon",arcs:[[-680,4806,4807,-2197,-220]],id:"48095",properties:{name:"Concho"}},{type:"Polygon",arcs:[[4808,-2590,4809,4810,4811]],id:"48103",properties:{name:"Crane"}},{type:"Polygon",arcs:[[4812,4813,4814,4815,4816,-4664]],id:"35015",properties:{name:"Eddy"}},{type:"Polygon",arcs:[[4817,4818,4819,-2196,-4053,-3393]],id:"29161",properties:{name:"Phelps"}},{type:"Polygon",arcs:[[4820,4821,4822,-2148,4823,-4253]],id:"05083",properties:{name:"Logan"}},{type:"Polygon",arcs:[[-2338,-3444,4824,4825,4826,4827]],id:"29177",properties:{name:"Ray"}},{type:"Polygon",arcs:[[4828,-2524,4829,4830,-1932,4831,4832,-1103]],id:"06027",properties:{name:"Inyo"}},{type:"Polygon",arcs:[[4833,4834,-3025,4835,4836,-3755]],id:"42005",properties:{name:"Armstrong"}},{type:"Polygon",arcs:[[4837,-2831,4838,4839,-3732,4840]],id:"37109",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-4769,4841,4842,-3772,4843,4844,4845]],id:"37087",properties:{name:"Haywood"}},{type:"Polygon",arcs:[[4846,4847,-2573,4848,4849,4850,4851]],id:"47057",properties:{name:"Grainger"}},{type:"Polygon",arcs:[[4852,4853,4854,4855,4856]],id:"42023",properties:{name:"Cameron"}},{type:"Polygon",arcs:[[-102,4857,-4761,4858,4859,4860]],id:"46027",properties:{name:"Clay"}},{type:"Polygon",arcs:[[4861,4862,4863,4864,4865]],id:"42025",properties:{name:"Carbon"}},{type:"Polygon",arcs:[[4866,4867,4868,4869,4870,4871]],id:"45025",properties:{name:"Chesterfield"}},{type:"Polygon",arcs:[[4872,4873,-4683,4874]],id:"45035",properties:{name:"Dorchester"}},{type:"Polygon",arcs:[[4875,4876,4877,4878,4879,4880,-1531]],id:"29041",properties:{name:"Chariton"}},{type:"Polygon",arcs:[[4881,4882,-2442,4883,4884]],id:"50011",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[4885,4886,-4857,4887,-3022,4888]],id:"42047",properties:{name:"Elk"}},{type:"Polygon",arcs:[[4889,4890,4891]],id:"51115",properties:{name:"Mathews"}},{type:"Polygon",arcs:[[4892,4893,4894,4895,-3391,4896,4897]],id:"29131",properties:{name:"Miller"}},{type:"Polygon",arcs:[[-266,4898,4899,4900,4901,4902]],id:"30017",properties:{name:"Custer"}},{type:"Polygon",arcs:[[-4902,4903,4904,4905,4906,4907,4908]],id:"30075",properties:{name:"Powder River"}},{type:"Polygon",arcs:[[4909,-1285,4910,4911,4912]],id:"21107",properties:{name:"Hopkins"}},{type:"Polygon",arcs:[[4913,-2150,4914,4915,4916]],id:"26003",properties:{name:"Alger"}},{type:"Polygon",arcs:[[4917,4918,4919,4920,4921]],id:"21115",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[-1121,4922,-3343,4923,4924]],id:"17041",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[4925,4926,4927,4928,4929,4930]],id:"21119",properties:{name:"Knott"}},{type:"Polygon",arcs:[[4931,-619,4932,-4575,4933]],id:"20079",properties:{name:"Harvey"}},{type:"Polygon",arcs:[[4934,-3086,4935]],id:"29510",properties:{name:"St. Louis"}},{type:"Polygon",arcs:[[-3347,4936,4937,4938,-292,4939]],id:"42009",properties:{name:"Bedford"}},{type:"Polygon",arcs:[[-4019,-4419,4940,-2086,4941]],id:"20013",properties:{name:"Brown"}},{type:"Polygon",arcs:[[4942,4943,4944,4945,4946,4947]],id:"05099",properties:{name:"Nevada"}},{type:"Polygon",arcs:[[-3331,4948,-4944,4949,-4391]],id:"05109",properties:{name:"Pike"}},{type:"Polygon",arcs:[[4950,4951,4952,4953,4954]],id:"51730",properties:{name:"Petersburg"}},{type:"Polygon",arcs:[[-4330,4955,4956,-4229,4957,4958]],id:"29163",properties:{name:"Pike"}},{type:"Polygon",arcs:[[-2878,4959,4960,4961,4962]],id:"17083",properties:{name:"Jersey"}},{type:"Polygon",arcs:[[4963,-4093,4964,4965,4966,4967]],id:"45027",properties:{name:"Clarendon"}},{type:"Polygon",arcs:[[-2572,-1573,4968,-1429,4969,4970,-4849]],id:"47073",properties:{name:"Hawkins"}},{type:"Polygon",arcs:[[4971,4972,4973,-1136,-1408]],id:"47077",properties:{name:"Henderson"}},{type:"Polygon",arcs:[[-4869,4974,-4088,4975,4976]],id:"45031",properties:{name:"Darlington"}},{type:"Polygon",arcs:[[-3373,4977,4978,4979,4980,4981]],id:"42029",properties:{name:"Chester"}},{type:"Polygon",arcs:[[4982,4983,4984,4985,-4090]],id:"45033",properties:{name:"Dillon"}},{type:"Polygon",arcs:[[4986,-3020,-4835,4987,-1622]],id:"42031",properties:{name:"Clarion"}},{type:"Polygon",arcs:[[4988,-3926,-169,4989]],id:"55037",properties:{name:"Florence"}},{type:"Polygon",arcs:[[4990,-4889,-3021,-4987,-1621]],id:"42053",properties:{name:"Forest"}},{type:"Polygon",arcs:[[4991,4992,4993,4994,4995]],id:"13049",properties:{name:"Charlton"}},{type:"Polygon",arcs:[[-576,-133,4996,4997,4998,4999,5e3,5001]],id:"35039",properties:{name:"Rio Arriba"}},{type:"Polygon",arcs:[[5002,-4224,5003,5004,5005,-1051]],id:"22031",properties:{name:"De Soto"}},{type:"Polygon",arcs:[[-3423,5006,5007,5008,-2529]],id:"37063",properties:{name:"Durham"}},{type:"Polygon",arcs:[[5009,5010,-4711,5011]],id:"35031",properties:{name:"McKinley"}},{type:"Polygon",arcs:[[5012,5013,5014,5015,5016]],id:"24013",properties:{name:"Carroll"}},{type:"MultiPolygon",arcs:[[[5017,5018]],[[-4981,5019,5020,5021,5022,5023,5024,5025]]],id:"10003",properties:{name:"New Castle"}},{type:"Polygon",arcs:[[5026,5027,-3162,5028,-2814]],id:"20023",properties:{name:"Cheyenne"}},{type:"Polygon",arcs:[[5029,5030,5031,5032,5033,-4377]],id:"13001",properties:{name:"Appling"}},{type:"Polygon",arcs:[[5034,5035,5036,-4727,5037,-3215]],id:"01051",properties:{name:"Elmore"}},{type:"Polygon",arcs:[[5038,5039,-3865,-1178]],id:"08033",properties:{name:"Dolores"}},{type:"Polygon",arcs:[[5040,-2142,5041,5042]],id:"27069",properties:{name:"Kittson"}},{type:"Polygon",arcs:[[5043,-1686,5044,5045,-3613,-4026,5046]],id:"48241",properties:{name:"Jasper"}},{type:"Polygon",arcs:[[5047,5048,5049,-4685,5050,5051]],id:"45043",properties:{name:"Georgetown"}},{type:"Polygon",arcs:[[5052,-3556,5053,5054,-4647]],id:"19071",properties:{name:"Fremont"}},{type:"Polygon",arcs:[[5055,-4569,5056,5057,5058,5059]],id:"17017",properties:{name:"Cass"}},{type:"Polygon",arcs:[[5060,5061,5062,-4705,5063,5064,5065]],id:"50027",properties:{name:"Windsor"}},{type:"Polygon",arcs:[[5066,-2055,5067,5068,-4012,5069,5070,5071]],id:"38055",properties:{name:"McLean"}},{type:"Polygon",arcs:[[5072,-4072,-3725,-4463]],id:"37079",properties:{name:"Greene"}},{type:"Polygon",arcs:[[5073,5074,5075,5076,5077]],id:"17127",properties:{name:"Massac"}},{type:"MultiPolygon",arcs:[[[5078,5079]],[[5080,-949,5081,-4279,5082]]],id:"24019",properties:{name:"Dorchester"}},{type:"Polygon",arcs:[[5083,-4005,-687,5084]],id:"16055",properties:{name:"Kootenai"}},{type:"Polygon",arcs:[[5085,5086,5087,5088]],id:"09007",properties:{name:"Middlesex"}},{type:"Polygon",arcs:[[5089,-2658,-2540,-854,5090,-2979,5091]],id:"18039",properties:{name:"Elkhart"}},{type:"Polygon",arcs:[[5092,-1154,-2995,-2758,5093,5094]],id:"20071",properties:{name:"Greeley"}},{type:"Polygon",arcs:[[5095,-5059,5096,-2874,5097,-2062,-4327]],id:"17137",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[5098,5099,5100,-3767]],id:"21121",properties:{name:"Knox"}},{type:"Polygon",arcs:[[5101,-670,5102,5103,-1092]],id:"19053",properties:{name:"Decatur"}},{type:"Polygon",arcs:[[5104,5105,5106,5107,5108,-4918,5109]],id:"21127",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[5110,5111,-527,-3639,5112,5113]],id:"54001",properties:{name:"Barbour"}},{type:"Polygon",arcs:[[5114,5115,-3497,5116,5117,5118,5119,5120]],id:"25003",properties:{name:"Berkshire"}},{type:"Polygon",arcs:[[5121,-4227,5122,5123,5124]],id:"29027",properties:{name:"Callaway"}},{type:"Polygon",arcs:[[5125,5126,5127,5128,5129,5130]],id:"27073",properties:{name:"Lac qui Parle"}},{type:"Polygon",arcs:[[-2721,5131,-4133,5132,-3228,5133]],id:"51075",properties:{name:"Goochland"}},{type:"Polygon",arcs:[[5134,5135,5136,-4381]],id:"56035",properties:{name:"Sublette"}},{type:"Polygon",arcs:[[5137,5138,5139,5140,-3876]],id:"49005",properties:{name:"Cache"}},{type:"Polygon",arcs:[[-1189,5141,-2185,-2225,5142]],id:"30053",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[5143,5144,5145,5146,5147,5148,5149]],id:"12001",properties:{name:"Alachua"}},{type:"Polygon",arcs:[[-4500,5150,5151,5152,-3687,-4478,5153]],id:"21151",properties:{name:"Madison"}},{type:"Polygon",arcs:[[5154,5155,5156,-2650,5157,5158,-1858]],id:"48177",properties:{name:"Gonzales"}},{type:"Polygon",arcs:[[5159,5160,-631,-3718,-545,5161,5162]],id:"31089",properties:{name:"Holt"}},{type:"Polygon",arcs:[[5163,5164,-4466,5165,5166,5167]],id:"37101",properties:{name:"Johnston"}},{type:"Polygon",arcs:[[5168,-2796,-1741,5169,5170,-4333,5171]],id:"17131",properties:{name:"Mercer"}},{type:"Polygon",arcs:[[-441,5172,5173,5174,-3684,5175]],id:"19191",properties:{name:"Winneshiek"}},{type:"Polygon",arcs:[[-1495,-1410,5176,5177,5178,5179]],id:"47075",properties:{name:"Haywood"}},{type:"Polygon",arcs:[[5180,5181,-297,5182,5183,5184]],id:"24023",properties:{name:"Garrett"}},{type:"Polygon",arcs:[[5185,-5185,5186,-524,-5112,5187,5188]],id:"54077",properties:{name:"Preston"}},{type:"Polygon",arcs:[[5189,5190,5191,-4287,5192,5193]],id:"26061",properties:{name:"Houghton"}},{type:"MultiPolygon",arcs:[[[5194,-5179,5195,-4353,-4236]],[[-4238,-4352,5196]]],id:"47167",properties:{name:"Tipton"}},{type:"Polygon",arcs:[[-1078,5197,5198,-2566,5199]],id:"26065",properties:{name:"Ingham"}},{type:"Polygon",arcs:[[-4577,5200,5201,5202,5203,5204]],id:"20191",properties:{name:"Sumner"}},{type:"Polygon",arcs:[[5205,5206,5207,5208,5209,5210,5211]],id:"21135",properties:{name:"Lewis"}},{type:"Polygon",arcs:[[-4027,-3617,-3896,5212,-3974,5213]],id:"48245",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[5214,5215,-3472,5216,5217]],id:"31177",properties:{name:"Washington"}},{type:"Polygon",arcs:[[5218,5219,5220,-460,5221,5222,5223,5224]],id:"53039",properties:{name:"Klickitat"}},{type:"Polygon",arcs:[[5225,-3577,-4331,-4959,5226]],id:"29173",properties:{name:"Ralls"}},{type:"Polygon",arcs:[[-1423,5227,5228,5229,-435,5230]],id:"56001",properties:{name:"Albany"}},{type:"Polygon",arcs:[[5231,5232,-2292,5233,-2717,5234,5235,5236],[-1411]],id:"51003",properties:{name:"Albemarle"}},{type:"Polygon",arcs:[[-4826,5237,5238,-1920,5239,5240]],id:"29107",properties:{name:"Lafayette"}},{type:"Polygon",arcs:[[5241,5242,-4818,-3392,-4896]],id:"29125",properties:{name:"Maries"}},{type:"Polygon",arcs:[[5243,-5123,-4232,5244,-5242,-4895]],id:"29151",properties:{name:"Osage"}},{type:"Polygon",arcs:[[-3010,-1877,-3019,-1304,5245,5246]],id:"27161",properties:{name:"Waseca"}},{type:"Polygon",arcs:[[5247,5248,5249,5250,-4338,5251]],id:"38105",properties:{name:"Williams"}},{type:"Polygon",arcs:[[-3625,5252,-3231,5253,5254,5255,5256]],id:"51147",properties:{name:"Prince Edward"}},{type:"Polygon",arcs:[[5257,-5025,5258,5259,5260]],id:"24029",properties:{name:"Kent"}},{type:"Polygon",arcs:[[5261,-3064,-3944,-4570,-5056,5262,5263]],id:"17169",properties:{name:"Schuyler"}},{type:"Polygon",arcs:[[5264,5265,5266,5267,5268,-3585]],id:"24031",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[-1138,5269,5270,5271]],id:"47109",properties:{name:"McNairy"}},{type:"Polygon",arcs:[[5272,5273,5274,-1204,5275]],id:"22119",properties:{name:"Webster"}},{type:"Polygon",arcs:[[5276,5277,5278]],id:"37129",properties:{name:"New Hanover"}},{type:"Polygon",arcs:[[-5193,-4286,5279,-3924,-4989,5280,5281,-3514,5282]],id:"26071",properties:{name:"Iron"}},{type:"Polygon",arcs:[[-5076,5283,5284,5285,5286,5287,5288]],id:"21139",properties:{name:"Livingston"}},{type:"Polygon",arcs:[[5289,-1215,5290,-3807,5291,5292]],id:"06077",properties:{name:"San Joaquin"}},{type:"Polygon",arcs:[[5293,-5077,-5289,5294,-3311,5295,5296]],id:"21145",properties:{name:"McCracken"}},{type:"Polygon",arcs:[[5297,5298,-4762,-4692,5299,5300]],id:"45049",properties:{name:"Hampton"}},{type:"Polygon",arcs:[[-1597,-1013,5301,5302,5303]],id:"31037",properties:{name:"Colfax"}},{type:"Polygon",arcs:[[5304,-2517,-4476,5305,-1442,5306,5307,5308]],id:"30031",properties:{name:"Gallatin"}},{type:"Polygon",arcs:[[-1348,5309,5310,-1400,5311,5312]],id:"47135",properties:{name:"Perry"}},{type:"Polygon",arcs:[[5313,-3901,-1774,-3478,5314,-3835,5315,5316]],id:"16039",properties:{name:"Elmore"}},{type:"Polygon",arcs:[[-2472,5317,5318,5319,5320]],id:"31013",properties:{name:"Box Butte"}},{type:"MultiPolygon",arcs:[[[5321,-3915,5322,-3956,5323,5324,5325]]],id:"25005",properties:{name:"Bristol"}},{type:"Polygon",arcs:[[-1131,-4631,-4677,5326,5327,5328]],id:"17185",properties:{name:"Wabash"}},{type:"Polygon",arcs:[[5329,5330,5331,5332,5333,5334]],id:"21095",properties:{name:"Harlan"}},{type:"Polygon",arcs:[[5335,5336,5337,-1038,5338,-1397]],id:"47119",properties:{name:"Maury"}},{type:"Polygon",arcs:[[5339,5340,-3893,-3615,5341]],id:"22019",properties:{name:"Calcasieu"}},{type:"Polygon",arcs:[[5342,-2530,-5009,5343,5344,5345,5346,-1147]],id:"37037",properties:{name:"Chatham"}},{type:"Polygon",arcs:[[-928,5347,-523,5348,5349]],id:"48127",properties:{name:"Dimmit"}},{type:"Polygon",arcs:[[-4921,5350,-4926,5351,5352,5353]],id:"21153",properties:{name:"Magoffin"}},{type:"Polygon",arcs:[[-4187,5354,5355,5356]],id:"49011",properties:{name:"Davis"}},{type:"Polygon",arcs:[[5357,5358,5359,5360]],id:"49031",properties:{name:"Piute"}},{type:"Polygon",arcs:[[-5109,5361,5362,5363,5364,-4919]],id:"21159",properties:{name:"Martin"}},{type:"Polygon",arcs:[[5365,5366,-4412,5367,-5174,5368]],id:"27055",properties:{name:"Houston"}},{type:"Polygon",arcs:[[5369,5370,5371,-4163]],id:"53011",properties:{name:"Clark"}},{type:"Polygon",arcs:[[5372,5373,5374,5375]],id:"55089",properties:{name:"Ozaukee"}},{type:"Polygon",arcs:[[5376,-1916,-2518,-5305,5377,5378,5379]],id:"30043",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[5380,-4770,-4846,5381,5382,5383]],id:"47155",properties:{name:"Sevier"}},{type:"Polygon",arcs:[[5384,5385,5386,5387]],id:"32011",properties:{name:"Eureka"}},{type:"Polygon",arcs:[[5388,5389,5390,-1206,5391]],id:"22061",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[5392,5393,5394,-5389,5395]],id:"22111",properties:{name:"Union"}},{type:"Polygon",arcs:[[5396,5397,5398,5399]],id:"33001",properties:{name:"Belknap"}},{type:"Polygon",arcs:[[-1883,-2311,5400,5401,5402]],id:"05011",properties:{name:"Bradley"}},{type:"Polygon",arcs:[[5403,5404,5405,-1539,5406,-126]],id:"31085",properties:{name:"Hayes"}},{type:"Polygon",arcs:[[5407,5408,5409,5410,5411,5412,5413,5414]],id:"42097",properties:{name:"Northumberland"}},{type:"MultiPolygon",arcs:[[[5415,-950,-5081,5416]]],id:"24041",properties:{name:"Talbot"}},{type:"Polygon",arcs:[[5417,5418,5419,-2817]],id:"19041",properties:{name:"Clay"}},{type:"Polygon",arcs:[[5420,5421,5422,-2024,-3869,5423]],id:"47139",properties:{name:"Polk"}},{type:"Polygon",arcs:[[5424,5425,-2090,5426,5427,5428]],id:"20149",properties:{name:"Pottawatomie"}},{type:"Polygon",arcs:[[5429,5430,5431]],id:"24510",properties:{name:"Baltimore"}},{type:"Polygon",arcs:[[5432,5433,-4800,5434,5435]],id:"23001",properties:{name:"Androscoggin"}},{type:"Polygon",arcs:[[5436,5437,5438,-3289,-4673,5439]],id:"18153",properties:{name:"Sullivan"}},{type:"Polygon",arcs:[[5440,5441,-3259,5442,5443,5444,5445]],id:"28145",properties:{name:"Union"}},{type:"Polygon",arcs:[[-1290,-1896,-2623,-2597,5446,-3643,-3030]],id:"27063",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[5447,5448,5449,5450,5451,5452,5453]],id:"49049",properties:{name:"Utah"}},{type:"Polygon",arcs:[[5454,-3800,5455,5456,-4719,5457]],id:"54089",properties:{name:"Summers"}},{type:"Polygon",arcs:[[-5452,5458,5459,5460,5461,5462]],id:"49039",properties:{name:"Sanpete"}},{type:"Polygon",arcs:[[-2653,5463,5464,-1447,5465,5466,5467]],id:"55027",properties:{name:"Dodge"}},{type:"Polygon",arcs:[[5468,5469,-5131,5470,-886,5471]],id:"46051",properties:{name:"Grant"}},{type:"Polygon",arcs:[[-4939,5472,5473,-135,-293]],id:"42057",properties:{name:"Fulton"}},{type:"Polygon",arcs:[[5474,5475,5476,5477,5478,5479]],id:"55093",properties:{name:"Pierce"}},{type:"Polygon",arcs:[[5480,5481,-1468,-4473,5482]],id:"30045",properties:{name:"Judith Basin"}},{type:"Polygon",arcs:[[5483,5484,-4871,5485,5486,-2933,-4690]],id:"45057",properties:{name:"Lancaster"}},{type:"Polygon",arcs:[[5487,5488,-1459,5489,5490,-4398,5491]],id:"51033",properties:{name:"Caroline"}},{type:"Polygon",arcs:[[5492,5493,5494,-5228,-1422]],id:"56031",properties:{name:"Platte"}},{type:"Polygon",arcs:[[5495,5496,5497,5498,5499,-5480,5500]],id:"27163",properties:{name:"Washington"}},{type:"Polygon",arcs:[[5501,5502,5503,5504,5505,5506,5507]],id:"29133",properties:{name:"Mississippi"}},{type:"Polygon",arcs:[[-4864,5508,5509,-4772,5510]],id:"42095",properties:{name:"Northampton"}},{type:"Polygon",arcs:[[-5005,5511,5512,5513,5514,5515]],id:"22085",properties:{name:"Sabine"}},{type:"Polygon",arcs:[[5516,5517,5518,-4621,-3318,5519]],id:"21169",properties:{name:"Metcalfe"}},{type:"Polygon",arcs:[[-3655,5520,-4589,5521]],id:"04021",properties:{name:"Pinal"}},{type:"Polygon",arcs:[[-1181,5522,5523,-3653,-684]],id:"04017",properties:{name:"Navajo"}},{type:"Polygon",arcs:[[5524,-2939,5525,-4593,5526]],id:"04027",properties:{name:"Yuma"}},{type:"Polygon",arcs:[[5527,5528,5529,-5498,5530,-622]],id:"27025",properties:{name:"Chisago"}},{type:"Polygon",arcs:[[-3571,5531,5532,-1343,-1494,5533,-4234]],id:"47045",properties:{name:"Dyer"}},{type:"Polygon",arcs:[[5534,5535,5536,5537,5538]],id:"21181",properties:{name:"Nicholas"}},{type:"Polygon",arcs:[[5539,-5246,-1309,5540,5541,-2621]],id:"27043",properties:{name:"Faribault"}},{type:"Polygon",arcs:[[5542,-4930,5543,-5331,5544,5545,-3647]],id:"21193",properties:{name:"Perry"}},{type:"Polygon",arcs:[[5546,-3181,5547,5548,5549,5550]],id:"48037",properties:{name:"Bowie"}},{type:"Polygon",arcs:[[-4905,5551,-1372,-41,5552,5553]],id:"56011",properties:{name:"Crook"}},{type:"Polygon",arcs:[[5554,-4976,-4095,5555]],id:"45061",properties:{name:"Lee"}},{type:"Polygon",arcs:[[5556,5557,5558,5559,5560,-5494]],id:"56015",properties:{name:"Goshen"}},{type:"MultiPolygon",arcs:[[[5561,-3911]],[[-3487,5562]],[[5563,-3491,5564,-3909,-5322,5565,5566]]],id:"25021",properties:{name:"Norfolk"}},{type:"Polygon",arcs:[[5567,5568,5569,5570,5571,-3890]],id:"21123",properties:{name:"Larue"}},{type:"Polygon",arcs:[[5572,-1465,5573,-5308,5574,5575,5576,-2533]],id:"16043",properties:{name:"Fremont"}},{type:"Polygon",arcs:[[-3830,-731,5577,-54,5578,-4436]],id:"13233",properties:{name:"Polk"}},{type:"Polygon",arcs:[[5579,-316,-3044,5580,-4450,-2941,-423,5581,5582,5583]],id:"31031",properties:{name:"Cherry"}},{type:"Polygon",arcs:[[-3818,5584,5585,-3671,5586]],id:"13247",properties:{name:"Rockdale"}},{type:"Polygon",arcs:[[5587,-2940,-5525,5588,5589]],id:"06025",properties:{name:"Imperial"}},{type:"Polygon",arcs:[[-1665,-1190,-5143,-2230,-4006,-5084,5590]],id:"16017",properties:{name:"Bonner"}},{type:"Polygon",arcs:[[5591,5592,5593,-4206,5594]],id:"18045",properties:{name:"Fountain"}},{type:"Polygon",arcs:[[5595,5596,5597,5598,5599,5600,5601]],id:"47031",properties:{name:"Coffee"}},{type:"Polygon",arcs:[[5602,5603,5604,-637,5605,-5599,5606]],id:"47177",properties:{name:"Warren"}},{type:"Polygon",arcs:[[5607,-5364,5608,5609,5610,5611,5612,-4928]],id:"21195",properties:{name:"Pike"}},{type:"Polygon",arcs:[[5613,5614,5615,-1261,5616,5617]],id:"21197",properties:{name:"Powell"}},{type:"Polygon",arcs:[[-1302,5618,5619,5620]],id:"26139",properties:{name:"Ottawa"}},{type:"Polygon",arcs:[[5621,5622,5623,-1169,5624,5625,5626]],id:"47165",properties:{name:"Sumner"}},{type:"Polygon",arcs:[[5627,5628,5629,5630,5631]],id:"37153",properties:{name:"Richmond"}},{type:"Polygon",arcs:[[-3077,5632,5633,5634,5635]],id:"48043",properties:{name:"Brewster"}},{type:"Polygon",arcs:[[5636,5637,-1418,-783,5638,5639]],id:"56019",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[5640,5641,5642,-5499,-5530]],id:"55095",properties:{name:"Polk"}},{type:"Polygon",arcs:[[-5643,5643,-5475,-5500]],id:"55109",properties:{name:"St. Croix"}},{type:"Polygon",arcs:[[5644,-3851,5645,-3968]],id:"48111",properties:{name:"Dallam"}},{type:"Polygon",arcs:[[5646,-5415,5647,5648,5649,5650]],id:"42067",properties:{name:"Juniata"}},{type:"Polygon",arcs:[[5651,5652,5653,5654,5655,5656,5657]],id:"18089",properties:{name:"Lake"}},{type:"Polygon",arcs:[[5658,5659,5660,5661,5662]],id:"42131",properties:{name:"Wyoming"}},{type:"Polygon",arcs:[[5663,5664,-4827,-5241,5665,5666,5667]],id:"29095",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[5668,5669,-963,5670,5671]],id:"42073",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[5672,-1624,5673,-5669,5674,5675]],id:"42085",properties:{name:"Mercer"}},{type:"Polygon",arcs:[[5676,-5663,5677,5678,-4862,5679,5680]],id:"42079",properties:{name:"Luzerne"}},{type:"Polygon",arcs:[[-3477,-16,-3832,-5315]],id:"16025",properties:{name:"Camas"}},{type:"Polygon",arcs:[[-3396,-261,-3547,5681,-2770,5682]],id:"19103",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[-488,-1792,5683,-666,5684]],id:"19117",properties:{name:"Lucas"}},{type:"Polygon",arcs:[[5685,-696,-2914,5686,5687,5688]],id:"40151",properties:{name:"Woods"}},{type:"Polygon",arcs:[[5689,-5688,5690,5691,5692]],id:"40153",properties:{name:"Woodward"}},{type:"Polygon",arcs:[[-2805,5693,-4068,5694,-4662,-3721,5695]],id:"35027",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-5070,-4015,-4073,5696,5697]],id:"38057",properties:{name:"Mercer"}},{type:"Polygon",arcs:[[-4714,-4452,-2806,-5696,-3720,5698]],id:"35053",properties:{name:"Socorro"}},{type:"Polygon",arcs:[[5699,5700,-2429,5701,-5593,5702,-2861]],id:"18157",properties:{name:"Tippecanoe"}},{type:"Polygon",arcs:[[5703,5704,5705,5706,5707,5708]],id:"21221",properties:{name:"Trigg"}},{type:"Polygon",arcs:[[-5630,5709,5710,5711]],id:"37165",properties:{name:"Scotland"}},{type:"Polygon",arcs:[[-2663,-821,-534,5712,5713,5714]],id:"17055",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-820,5715,-3882,-4110,5716,-536]],id:"17059",properties:{name:"Gallatin"}},{type:"Polygon",arcs:[[-4328,-2063,-5098,-2879,-4963,5717]],id:"17061",properties:{name:"Greene"}},{type:"Polygon",arcs:[[-3859,-2611,-3808,-5291,-1214]],id:"06009",properties:{name:"Calaveras"}},{type:"Polygon",arcs:[[5718,-4485,5719,5720,5721,5722]],id:"45065",properties:{name:"McCormick"}},{type:"MultiPolygon",arcs:[[[-4342,5723]],[[-3774,-1020,-4344,5724]]],id:"45077",properties:{name:"Pickens"}},{type:"Polygon",arcs:[[-5235,-2722,-5134,-3227,5725]],id:"51065",properties:{name:"Fluvanna"}},{type:"Polygon",arcs:[[5726,-5556,-4094,-4964,5727,5728]],id:"45085",properties:{name:"Sumter"}},{type:"Polygon",arcs:[[5729,5730,-1490,5731]],id:"51133",properties:{name:"Northumberland"}},{type:"Polygon",arcs:[[5732,-5210,5733,5734,-5537,5735]],id:"21069",properties:{name:"Fleming"}},{type:"Polygon",arcs:[[-398,5736,5737,5738,5739,5740]],id:"47001",properties:{name:"Anderson"}},{type:"Polygon",arcs:[[5741,5742,5743,-1912,-2180]],id:"30099",properties:{name:"Teton"}},{type:"Polygon",arcs:[[-132,5744,5745,5746,-4997]],id:"35055",properties:{name:"Taos"}},{type:"Polygon",arcs:[[-2980,-5091,-853,5747,-2038,-1234]],id:"18085",properties:{name:"Kosciusko"}},{type:"Polygon",arcs:[[5748,-4076,5749,5750,5751]],id:"38085",properties:{name:"Sioux"}},{type:"Polygon",arcs:[[-3320,-4620,5752,5753,5754,5755,5756]],id:"47027",properties:{name:"Clay"}},{type:"Polygon",arcs:[[-5549,5757,5758,5759,5760]],id:"48067",properties:{name:"Cass"}},{type:"Polygon",arcs:[[5761,-5436,5762,-940,5763,-1577,5764]],id:"23017",properties:{name:"Oxford"}},{type:"Polygon",arcs:[[-5538,-5735,5765,5766,5767]],id:"21011",properties:{name:"Bath"}},{type:"Polygon",arcs:[[-4460,-2984,-1150,5768,5769,5770]],id:"37057",properties:{name:"Davidson"}},{type:"Polygon",arcs:[[-5435,-4799,5771,-941,-5763]],id:"23005",properties:{name:"Cumberland"}},{type:"Polygon",arcs:[[5772,-3011,-5247,-5540,-2620,-1894,-4226]],id:"27013",properties:{name:"Blue Earth"}},{type:"Polygon",arcs:[[5773,5774,5775,5776,5777,-4189]],id:"51093",properties:{name:"Isle of Wight"}},{type:"Polygon",arcs:[[-5137,5778,5779,5780,-4177,-321,5781,-4382]],id:"56037",properties:{name:"Sweetwater"}},{type:"Polygon",arcs:[[-2228,5782,5783,-4002]],id:"30061",properties:{name:"Mineral"}},{type:"Polygon",arcs:[[5784,5785]],id:"51685",properties:{name:"Manassas Park"}},{type:"Polygon",arcs:[[5786,-3995,-2654,-5468,5787,5788,5789]],id:"55021",properties:{name:"Columbia"}},{type:"Polygon",arcs:[[5790,5791,-2594,5792,5793,5794]],id:"46041",properties:{name:"Dewey"}},{type:"Polygon",arcs:[[5795,-1353,-5298,5796,5797]],id:"45005",properties:{name:"Allendale"}},{type:"Polygon",arcs:[[5798,-4970,-1428,5799,5800,-4767]],id:"47059",properties:{name:"Greene"}},{type:"Polygon",arcs:[[-3689,-3648,-5546,5801,5802,-5100,5803]],id:"21051",properties:{name:"Clay"}},{type:"Polygon",arcs:[[5804,-4108,5805,5806,5807,-5286]],id:"21055",properties:{name:"Crittenden"}},{type:"Polygon",arcs:[[5808,5809,-5632,5810,-4867]],id:"37007",properties:{name:"Anson"}},{type:"Polygon",arcs:[[5811,-400,5812,5813,5814,5815]],id:"47049",properties:{name:"Fentress"}},{type:"MultiPolygon",arcs:[[[-5506,5816,5817,5818,5819]],[[5820,5821]]],id:"21075",properties:{name:"Fulton"}},{type:"Polygon",arcs:[[5822,5823,-5107,5824,5825]],id:"21019",properties:{name:"Boyd"}},{type:"Polygon",arcs:[[-4345,5826,-4486,-5719,5827]],id:"45001",properties:{name:"Abbeville"}},{type:"Polygon",arcs:[[5828,5829,5830,5831,5832,-2645,-5157,5833]],id:"48149",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[-5221,5834,5835,-1991,5836,-461]],id:"41049",properties:{name:"Morrow"}},{type:"Polygon",arcs:[[5837,5838,5839,-4937,-3346]],id:"42013",properties:{name:"Blair"}},{type:"Polygon",arcs:[[5840]],id:"25019",properties:{name:"Nantucket"}},{type:"Polygon",arcs:[[-4965,-4092,5841,-5052,5842]],id:"45089",properties:{name:"Williamsburg"}},{type:"Polygon",arcs:[[-3357,-3082,-3012,-5773,-4225]],id:"27103",properties:{name:"Nicollet"}},{type:"Polygon",arcs:[[5843,5844,-1174,5845,-5359]],id:"49055",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[5846,-1662,-4172,5847,-2963,-3113,5848]],id:"48053",properties:{name:"Burnet"}},{type:"Polygon",arcs:[[5849,5850,-5380,5851,-1462,-1928]],id:"30023",properties:{name:"Deer Lodge"}},{type:"Polygon",arcs:[[-5379,5852,-1463,-5852]],id:"30093",properties:{name:"Silver Bow"}},{type:"Polygon",arcs:[[-1365,-103,-4861,5853,5854,-4778]],id:"46135",properties:{name:"Yankton"}},{type:"Polygon",arcs:[[-4751,5855,5856,5857,-314,5858]],id:"46071",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-5755,5859,-5816,5860,5861]],id:"47133",properties:{name:"Overton"}},{type:"Polygon",arcs:[[-5460,5862,5863,-5845,5864]],id:"49015",properties:{name:"Emery"}},{type:"Polygon",arcs:[[5865,-1611,5866,-4433,5867,-3609,5868,-3612,5869]],id:"48391",properties:{name:"Refugio"}},{type:"Polygon",arcs:[[5870,5871,-1168,-3398,-589]],id:"48357",properties:{name:"Ochiltree"}},{type:"Polygon",arcs:[[-3867,5872,-577,-5002,5873,-5010,5874]],id:"35045",properties:{name:"San Juan"}},{type:"Polygon",arcs:[[-1223,5875,5876,5877,5878,-3378,5879]],id:"05063",properties:{name:"Independence"}},{type:"Polygon",arcs:[[5880,-4897,-3390,-1524,5881,5882,-2156]],id:"29029",properties:{name:"Camden"}},{type:"Polygon",arcs:[[5883,-5043,5884,-4144,-2603]],id:"38067",properties:{name:"Pembina"}},{type:"Polygon",arcs:[[-5878,5885,5886,-3805,-568,-4600,5887]],id:"05067",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-97,5888,5889,-4757,-4858,-101]],id:"46083",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-5818,5890,5891,-1338,-5533,5892]],id:"47131",properties:{name:"Obion"}},{type:"Polygon",arcs:[[5893,-4098,5894,5895,5896,5897,5898]],id:"45003",properties:{name:"Aiken"}},{type:"Polygon",arcs:[[5899,-3355,5900,5901]],id:"41003",properties:{name:"Benton"}},{type:"Polygon",arcs:[[5902,-5901,-3354,5903,5904,5905,5906]],id:"41039",properties:{name:"Lane"}},{type:"Polygon",arcs:[[5907,5908,5909,5910,5911,-4399,-5491]],id:"51097",properties:{name:"King and Queen"}},{type:"Polygon",arcs:[[5912,5913,-5508,5914,5915]],id:"29201",properties:{name:"Scott"}},{type:"Polygon",arcs:[[-4430,5916,5917,5918,5919]],id:"48321",properties:{name:"Matagorda"}},{type:"Polygon",arcs:[[-1046,5920,5921,-212,5922]],id:"48447",properties:{name:"Throckmorton"}},{type:"Polygon",arcs:[[5923,-406,5924,5925]],id:"55129",properties:{name:"Washburn"}},{type:"Polygon",arcs:[[5926,-5360,-5846,-1173,5927,5928]],id:"49017",properties:{name:"Garfield"}},{type:"Polygon",arcs:[[5929,-5217,-3471,5930,-2394]],id:"31055",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[5931,5932]],id:"51520",properties:{name:"Bristol"}},{type:"Polygon",arcs:[[5933,-28,5934,-31,-3241]],id:"38097",properties:{name:"Traill"}},{type:"Polygon",arcs:[[-3189,-3195,5935,5936,-1880,5937]],id:"05069",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[5938,5939,5940,-5886,-5877,5941]],id:"05075",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[-4952,5942]],id:"51570",properties:{name:"Colonial Heights"}},{type:"Polygon",arcs:[[5943,5944,5945,5946,5947]],id:"48001",properties:{name:"Anderson"}},{type:"Polygon",arcs:[[5948,-5296,-3310,5949,-5504]],id:"21039",properties:{name:"Carlisle"}},{type:"Polygon",arcs:[[-4125,5950,-5383,5951,5952,5953]],id:"47009",properties:{name:"Blount"}},{type:"Polygon",arcs:[[5954,5955,-1350,5956,-4972,-1407,-1340]],id:"47017",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[-3314,5957,5958,-1344,-5956,5959]],id:"47079",properties:{name:"Henry"}},{type:"Polygon",arcs:[[5960,5961,5962,5963,5964,-5118]],id:"25013",properties:{name:"Hampden"}},{type:"Polygon",arcs:[[-3443,-1532,-4881,5965,-5238,-4825]],id:"29033",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[5966,5967,-5834,-5156,5968,5969]],id:"48055",properties:{name:"Caldwell"}},{type:"Polygon",arcs:[[5970,-5065,5971,5972]],id:"50021",properties:{name:"Rutland"}},{type:"Polygon",arcs:[[-3369,5973,5974,5975,5976,-3352]],id:"41031",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[5977,-2329,-4722,5978,5979,5980]],id:"51185",properties:{name:"Tazewell"}},{type:"Polygon",arcs:[[5981,-3589,5982,5983,5984]],id:"51043",properties:{name:"Clarke"}},{type:"Polygon",arcs:[[5985,5986,5987,-1694,5988]],id:"12067",properties:{name:"Lafayette"}},{type:"Polygon",arcs:[[-336,-1083,-1271,5989,-2753]],id:"20205",properties:{name:"Wilson"}},{type:"Polygon",arcs:[[-1132,-5329,5990,-3072]],id:"17047",properties:{name:"Edwards"}},{type:"Polygon",arcs:[[-1583,-2605,-4147,-365,5991]],id:"38071",properties:{name:"Ramsey"}},{type:"Polygon",arcs:[[-5853,-5378,-5309,-5574,-1464]],id:"30057",properties:{name:"Madison"}},{type:"Polygon",arcs:[[-5055,5992,5993,5994,5995,-4648]],id:"29005",properties:{name:"Atchison"}},{type:"Polygon",arcs:[[5996,5997,5998,5999,6e3,-3421,6001]],id:"51083",properties:{name:"Halifax"}},{type:"Polygon",arcs:[[6002,6003,6004,-2985,6005]],id:"51013",properties:{name:"Arlington"}},{type:"MultiPolygon",arcs:[[[6006]],[[6007,-3983,-2354,6008,6009]],[[6010]]],id:"53057",properties:{name:"Skagit"}},{type:"Polygon",arcs:[[6011,-3567,6012,-677,6013,6014,6015,-4900]],id:"30025",properties:{name:"Fallon"}},{type:"Polygon",arcs:[[6016,6017,6018,-5775,6019,6020]],id:"51181",properties:{name:"Surry"}},{type:"Polygon",arcs:[[6021,6022,6023,-4524]],id:"53071",properties:{name:"Walla Walla"}},{type:"Polygon",arcs:[[6024,6025,6026,6027,6028,-728]],id:"13057",properties:{name:"Cherokee"}},{type:"Polygon",arcs:[[6029,6030,6031,6032,6033]],id:"27149",properties:{name:"Stevens"}},{type:"Polygon",arcs:[[-2755,6034,6035,6036,6037]],id:"20019",properties:{name:"Chautauqua"}},{type:"Polygon",arcs:[[6038,6039,6040,-1641,-3707,6041]],id:"29075",properties:{name:"Gentry"}},{type:"Polygon",arcs:[[6042,6043,-5984,6044,-2279,6045]],id:"51187",properties:{name:"Warren"}},{type:"Polygon",arcs:[[-1791,-1186,-255,-4611,-5684]],id:"19135",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[6046,6047,-1361,6048,-1843]],id:"48325",properties:{name:"Medina"}},{type:"Polygon",arcs:[[-4417,6049,-3708,-2341,6050,6051]],id:"29021",properties:{name:"Buchanan"}},{type:"Polygon",arcs:[[-4901,-6016,6052,-1368,-5552,-4904]],id:"30011",properties:{name:"Carter"}},{type:"Polygon",arcs:[[6053,6054,-2505,-3244,6055,6056]],id:"26055",properties:{name:"Grand Traverse"}},{type:"Polygon",arcs:[[6057,-4034,-4587,-4736,6058,6059,6060]],id:"28141",properties:{name:"Tishomingo"}},{type:"Polygon",arcs:[[6061,-4715,-5699,-3724,-3579,-4595]],id:"35003",properties:{name:"Catron"}},{type:"Polygon",arcs:[[6062,-3348,-4940,-291,-5182,6063]],id:"42111",properties:{name:"Somerset"}},{type:"Polygon",arcs:[[-328,6064,6065,6066,6067,6068]],id:"36109",properties:{name:"Tompkins"}},{type:"Polygon",arcs:[[-3535,6069,6070,6071]],id:"36067",properties:{name:"Onondaga"}},{type:"Polygon",arcs:[[-4985,6072,6073,6074,-5049,6075]],id:"45051",properties:{name:"Horry"}},{type:"Polygon",arcs:[[6076,6077,6078,-708]],id:"30041",properties:{name:"Hill"}},{type:"Polygon",arcs:[[6079,6080,6081,-2735,-44]],id:"36001",properties:{name:"Albany"}},{type:"Polygon",arcs:[[-480,6082,-6028,6083,6084,-3821,6085,6086,-600,6087]],id:"13121",properties:{name:"Fulton"}},{type:"Polygon",arcs:[[-5477,6088,6089,6090,6091,6092]],id:"55091",properties:{name:"Pepin"}},{type:"Polygon",arcs:[[6093,-3218,6094,6095,6096]],id:"01105",properties:{name:"Perry"}},{type:"Polygon",arcs:[[-2668,6097,-2298]],id:"02090",properties:{name:"Fairbanks North Star"}},{type:"Polygon",arcs:[[6098,6099,6100,6101]],id:"13125",properties:{name:"Glascock"}},{type:"Polygon",arcs:[[-901,6102,-2207,6103,-2690]],id:"48173",properties:{name:"Glasscock"}},{type:"Polygon",arcs:[[-1441,6104,-5135,-4380,-3905,6105,-5575,-5307]],id:"56039",properties:{name:"Teton"}},{type:"MultiPolygon",arcs:[[[-4193,6106]],[[6107,6108,6109,6110,6111,6112,-4198,6113,-2224,6114]]],id:"08059",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[6115,-2044,6116]],id:"08029",properties:{name:"Delta"}},{type:"Polygon",arcs:[[-3820,6117,6118,6119,-6086]],id:"13063",properties:{name:"Clayton"}},{type:"Polygon",arcs:[[-67,6120,-4262,6121,6122]],id:"18117",properties:{name:"Orange"}},{type:"MultiPolygon",arcs:[[[6123]],[[6124]],[[-3559,6125]]],id:"36103",properties:{name:"Suffolk"}},{type:"MultiPolygon",arcs:[[[6126]],[[-4313,6127,-3531,6128]],[[6129]]],id:"36045",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[-3900,6130,6131,6132,-1726]],id:"20107",properties:{name:"Linn"}},{type:"Polygon",arcs:[[6133,6134,6135,-3736,6136,6137,-4503,6138]],id:"37161",properties:{name:"Rutherford"}},{type:"Polygon",arcs:[[6139,6140,6141,-4358,-4773,-5510]],id:"34041",properties:{name:"Warren"}},{type:"Polygon",arcs:[[6142,6143,-5361,-5927,6144,-4290]],id:"49001",properties:{name:"Beaver"}},{type:"Polygon",arcs:[[6145,6146,-4531,6147,-5932,6148,-1571,6149]],id:"51191",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-4734,-4438,6150,6151,-3986]],id:"01015",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[6152,6153,6154,6155,6156,-1700]],id:"13133",properties:{name:"Greene"}},{type:"Polygon",arcs:[[6157,6158,6159,6160]],id:"54009",properties:{name:"Brooke"}},{type:"MultiPolygon",arcs:[[[-1976,6161,-4742]],[[6162]],[[6163,-4744]]],id:"02070",properties:{name:"Dillingham"}},{type:"Polygon",arcs:[[-2938,6164,-3656,-5522,-4588,-5526]],id:"04013",properties:{name:"Maricopa"}},{type:"Polygon",arcs:[[-4675,6165,6166,6167,6168]],id:"18125",properties:{name:"Pike"}},{type:"Polygon",arcs:[[-3681,-2709,6169,-4300,6170,6171,-70]],id:"18137",properties:{name:"Ripley"}},{type:"Polygon",arcs:[[-2388,6172,-4578,-5205,6173,-693]],id:"20095",properties:{name:"Kingman"}},{type:"Polygon",arcs:[[6174,-1487,6175,6176,6177]],id:"20123",properties:{name:"Mitchell"}},{type:"Polygon",arcs:[[-1507,6178,-737,-992,-2948,6179]],id:"20083",properties:{name:"Hodgeman"}},{type:"Polygon",arcs:[[-2971,6180,-2416,-1069,-616,6181]],id:"20127",properties:{name:"Morris"}},{type:"Polygon",arcs:[[-1717,6182,-625,6183,-1321,6184,6185]],id:"27095",properties:{name:"Mille Lacs"}},{type:"Polygon",arcs:[[-5444,6186,6187,6188,-82,6189]],id:"28081",properties:{name:"Lee"}},{type:"Polygon",arcs:[[6190,6191,-5446,6192,-418,6193,6194]],id:"28071",properties:{name:"Lafayette"}},{type:"Polygon",arcs:[[6195,6196,6197,6198,-4059,-4316]],id:"28029",properties:{name:"Copiah"}},{type:"Polygon",arcs:[[6199,6200,6201,6202,-413,6203]],id:"28111",properties:{name:"Perry"}},{type:"Polygon",arcs:[[-4146,6204,-29,-5934,-3240,-360]],id:"38035",properties:{name:"Grand Forks"}},{type:"Polygon",arcs:[[6205,6206,6207,-5020,-4980]],id:"42045",properties:{name:"Delaware"}},{type:"Polygon",arcs:[[6208,6209,6210,6211,6212]],id:"44003",properties:{name:"Kent"}},{type:"Polygon",arcs:[[6213,-5683,-2769,-3399,-1798]],id:"19095",properties:{name:"Iowa"}},{type:"Polygon",arcs:[[-1012,6214,-5218,-5930,-2393,6215,-5302]],id:"31053",properties:{name:"Dodge"}},{type:"Polygon",arcs:[[-296,6216,6217,-5183]],id:"54057",properties:{name:"Mineral"}},{type:"Polygon",arcs:[[6218,-4602,-3668,6219,-3193]],id:"05117",properties:{name:"Prairie"}},{type:"Polygon",arcs:[[-5524,6220,-4598,6221,-4590,-5521,-3654]],id:"04009",properties:{name:"Graham"}},{type:"Polygon",arcs:[[-437,6222,6223,6224,6225,6226,6227,6228]],id:"08049",properties:{name:"Grand"}},{type:"Polygon",arcs:[[6229,6230,6231,6232,6233,-3140,-1787,-4558,6234]],id:"08109",properties:{name:"Saguache"}},{type:"Polygon",arcs:[[6235,6236,-3058,-1765,-580,6237]],id:"12093",properties:{name:"Okeechobee"}},{type:"Polygon",arcs:[[-2029,6238,6239,6240,-3870]],id:"13123",properties:{name:"Gilmer"}},{type:"Polygon",arcs:[[-3266,6241,6242,6243,-4996,6244,6245,-3046]],id:"13299",properties:{name:"Ware"}},{type:"Polygon",arcs:[[6246,-5227,-4958,-4228,-5122,6247,6248]],id:"29007",properties:{name:"Audrain"}},{type:"Polygon",arcs:[[-5e3,6249,6250,6251,6252]],id:"35028",properties:{name:"Los Alamos"}},{type:"Polygon",arcs:[[6253,6254,-4371,-2428,-3411,-1413,-1469,-5482]],id:"30027",properties:{name:"Fergus"}},{type:"Polygon",arcs:[[6255,-5163,6256,-4448]],id:"31149",properties:{name:"Rock"}},{type:"Polygon",arcs:[[6257,6258,-5072,6259,6260,-5250]],id:"38061",properties:{name:"Mountrail"}},{type:"Polygon",arcs:[[6261,6262,6263,-1281,6264,-4106,-3880]],id:"21101",properties:{name:"Henderson"}},{type:"Polygon",arcs:[[6265,-5566,-5326,6266,6267,-6209,6268]],id:"44007",properties:{name:"Providence"}},{type:"Polygon",arcs:[[6269,-3770,6270,6271,-5737,-397]],id:"47013",properties:{name:"Campbell"}},{type:"MultiPolygon",arcs:[[[6272,6273,6274,6275]],[[6276,6277,6278,6279,-120]]],id:"48261",properties:{name:"Kenedy"}},{type:"Polygon",arcs:[[6280,-3947,6281,6282,-2782,6283]],id:"36051",properties:{name:"Livingston"}},{type:"Polygon",arcs:[[6284,-3794,6285,6286,6287,6288]],id:"54011",properties:{name:"Cabell"}},{type:"Polygon",arcs:[[6289,6290,6291,-3813,6292,-2101]],id:"06007",properties:{name:"Butte"}},{type:"Polygon",arcs:[[-6227,6293,6294,6295,6296]],id:"08117",properties:{name:"Summit"}},{type:"Polygon",arcs:[[6297,6298,-4347,6299,-1847]],id:"13147",properties:{name:"Hart"}},{type:"Polygon",arcs:[[-5170,-1746,-3941,-3062,6300]],id:"17187",properties:{name:"Warren"}},{type:"Polygon",arcs:[[6301,6302,6303,-3284,6304]],id:"18119",properties:{name:"Owen"}},{type:"Polygon",arcs:[[6305,6306,-6122,-4267,-4670,6307,6308,-6167]],id:"18037",properties:{name:"Dubois"}},{type:"Polygon",arcs:[[-2074,6309,6310,6311,-1505]],id:"20165",properties:{name:"Rush"}},{type:"Polygon",arcs:[[-189,-984,-3397,-6214,6312]],id:"19011",properties:{name:"Benton"}},{type:"Polygon",arcs:[[6313,-4479,-3690,-5804,-5099,-3766,6314]],id:"21125",properties:{name:"Laurel"}},{type:"Polygon",arcs:[[6315,6316,6317,6318,-2386,-739]],id:"20185",properties:{name:"Stafford"}},{type:"Polygon",arcs:[[-5513,6319,6320,6321,6322,6323]],id:"22115",properties:{name:"Vernon"}},{type:"Polygon",arcs:[[6324,6325,6326,-1554,-2567,-5199]],id:"26093",properties:{name:"Livingston"}},{type:"Polygon",arcs:[[-3018,-2998,-3152,6327,-439,-2665,6328,-1306]],id:"27099",properties:{name:"Mower"}},{type:"Polygon",arcs:[[-2492,6329,6330,6331,6332]],id:"28073",properties:{name:"Lamar"}},{type:"Polygon",arcs:[[6333,6334,6335,6336,6337,6338]],id:"28053",properties:{name:"Humphreys"}},{type:"Polygon",arcs:[[6339,6340,-1603,6341,-627]],id:"31139",properties:{name:"Pierce"}},{type:"Polygon",arcs:[[6342,6343,-5353,6344,-1262,-5616]],id:"21237",properties:{name:"Wolfe"}},{type:"Polygon",arcs:[[6345,-4913,6346,-5705,6347,-5807]],id:"21033",properties:{name:"Caldwell"}},{type:"Polygon",arcs:[[-1371,-3594,6348,6349,-4749,-38]],id:"46093",properties:{name:"Meade"}},{type:"Polygon",arcs:[[6350,6351,6352,6353,-4492,6354]],id:"21021",properties:{name:"Boyle"}},{type:"Polygon",arcs:[[-4509,6355,6356,6357,6358]],id:"37199",properties:{name:"Yancey"}},{type:"Polygon",arcs:[[-6095,-3217,6359,-2628,6360,6361]],id:"01047",properties:{name:"Dallas"}},{type:"Polygon",arcs:[[6362,-2489,6363,-182]],id:"13231",properties:{name:"Pike"}},{type:"Polygon",arcs:[[-835,6364,6365,6366]],id:"01035",properties:{name:"Conecuh"}},{type:"Polygon",arcs:[[-3301,6367,-3191,-2403,6368,6369]],id:"05105",properties:{name:"Perry"}},{type:"Polygon",arcs:[[-6240,6370,-6025,6371]],id:"13227",properties:{name:"Pickens"}},{type:"Polygon",arcs:[[6372,-6156,6373,6374,-6102,6375,6376]],id:"13141",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[6377,-168,6378,6379,6380]],id:"13307",properties:{name:"Webster"}},{type:"Polygon",arcs:[[6381,-4047,6382,-2926,6383,6384]],id:"18095",properties:{name:"Madison"}},{type:"Polygon",arcs:[[-3286,-68,-6123,-6307,6385]],id:"18101",properties:{name:"Martin"}},{type:"Polygon",arcs:[[-2135,-341,-1508,-6180,-2951,6386,6387]],id:"20055",properties:{name:"Finney"}},{type:"Polygon",arcs:[[-2088,6388,6389,6390,6391]],id:"20087",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[-3304,6392,6393,-5700,-2860,6394]],id:"18181",properties:{name:"White"}},{type:"Polygon",arcs:[[-4494,6395,-4480,-6314,6396,-4112,6397]],id:"21199",properties:{name:"Pulaski"}},{type:"Polygon",arcs:[[-5263,-5060,-5096,-4326,6398]],id:"17009",properties:{name:"Brown"}},{type:"Polygon",arcs:[[6399,6400,6401,6402,6403,6404,6405]],id:"22021",properties:{name:"Caldwell"}},{type:"Polygon",arcs:[[-5666,-5240,-1919,6406,6407]],id:"29101",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[-4057,6408,6409,6410,6411]],id:"29017",properties:{name:"Bollinger"}},{type:"Polygon",arcs:[[-2204,6412,6413,6414,6415,6416]],id:"29035",properties:{name:"Carter"}},{type:"Polygon",arcs:[[-923,6417,-2397,6418,-4650,6419,-2479]],id:"31109",properties:{name:"Lancaster"}},{type:"Polygon",arcs:[[6420,6421,6422,6423,-4360]],id:"34035",properties:{name:"Somerset"}},{type:"Polygon",arcs:[[6424,-6284,-2781,6425,6426]],id:"36121",properties:{name:"Wyoming"}},{type:"Polygon",arcs:[[6427,-329,-6069,6428,6429]],id:"36097",properties:{name:"Schuyler"}},{type:"Polygon",arcs:[[6430,6431,6432,6433,-1814]],id:"39091",properties:{name:"Logan"}},{type:"Polygon",arcs:[[6434,-1739,-1863,6435,6436,6437,-6433]],id:"39159",properties:{name:"Union"}},{type:"Polygon",arcs:[[-4836,-3024,6438,-3344,6439]],id:"42063",properties:{name:"Indiana"}},{type:"Polygon",arcs:[[-3891,-5572,6440,-5517,6441,-2701,6442]],id:"21099",properties:{name:"Hart"}},{type:"Polygon",arcs:[[-1283,6443,-4489,-4104,6444,6445,6446]],id:"21183",properties:{name:"Ohio"}},{type:"Polygon",arcs:[[6447,6448,-2382,-2591,-5792,6449]],id:"46129",properties:{name:"Walworth"}},{type:"Polygon",arcs:[[-4851,6450,-4765,-5381,6451]],id:"47089",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[6452,6453,6454,6455,-5535,6456,-761]],id:"21097",properties:{name:"Harrison"}},{type:"Polygon",arcs:[[-5382,-4845,6457,6458,6459,-5952]],id:"37173",properties:{name:"Swain"}},{type:"Polygon",arcs:[[6460,-2246,6461,-2961,6462,-2250,6463]],id:"48499",properties:{name:"Wood"}},{type:"Polygon",arcs:[[6464,6465,6466,6467,6468,6469]],id:"37091",properties:{name:"Hertford"}},{type:"Polygon",arcs:[[-789,6470,-4028,-5214,-3973,6471,6472]],id:"48291",properties:{name:"Liberty"}},{type:"Polygon",arcs:[[6473,6474,-73,-4212,6475,-65,6476]],id:"18071",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-6312,6477,-6316,-738,-6179,-1506]],id:"20145",properties:{name:"Pawnee"}},{type:"Polygon",arcs:[[-2419,-3159,-1202,-1728,-1081,-334]],id:"20031",properties:{name:"Coffey"}},{type:"Polygon",arcs:[[-809,6478,6479,-4622,-3697]],id:"22055",properties:{name:"Lafayette"}},{type:"Polygon",arcs:[[6480,-2022,-1333,-6030,6481]],id:"27051",properties:{name:"Grant"}},{type:"Polygon",arcs:[[6482,-2822,6483,6484,6485]],id:"28121",properties:{name:"Rankin"}},{type:"Polygon",arcs:[[6486,6487,-6486,-6197,6488,-3526]],id:"28049",properties:{name:"Hinds"}},{type:"Polygon",arcs:[[6489,6490,6491,-4467,6492,6493]],id:"37051",properties:{name:"Cumberland"}},{type:"Polygon",arcs:[[6494,6495,6496,6497,-1255,-2827,-1902,-4008]],id:"37193",properties:{name:"Wilkes"}},{type:"Polygon",arcs:[[-1831,6498,6499,-6431,-1813,6500]],id:"39011",properties:{name:"Auglaize"}},{type:"Polygon",arcs:[[6501,6502,6503,6504,6505,6506,-3748]],id:"40125",properties:{name:"Pottawatomie"}},{type:"Polygon",arcs:[[6507,-4086,6508,6509,6510,6511]],id:"40091",properties:{name:"McIntosh"}},{type:"Polygon",arcs:[[6512,6513,-3366,6514,6515]],id:"41071",properties:{name:"Yamhill"}},{type:"Polygon",arcs:[[-4865,-5511,-4771,6516,6517,6518]],id:"42077",properties:{name:"Lehigh"}},{type:"Polygon",arcs:[[-5570,6519,-4497,6520,6521]],id:"21217",properties:{name:"Taylor"}},{type:"Polygon",arcs:[[-4216,-2702,-6442,-5520,-3317,6522]],id:"21009",properties:{name:"Barren"}},{type:"Polygon",arcs:[[-5848,-4176,6523,-5967,6524,-2964]],id:"48453",properties:{name:"Travis"}},{type:"Polygon",arcs:[[-108,-790,-6473,6525,6526,6527]],id:"48339",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[6528,-433,-2208,-6103,-900]],id:"48227",properties:{name:"Howard"}},{type:"Polygon",arcs:[[6529,-5612,6530,6531,-1569,6532,-5333],[-3784]],id:"51195",properties:{name:"Wise"}},{type:"Polygon",arcs:[[6533]],id:"51840",properties:{name:"Winchester"}},{type:"Polygon",arcs:[[-4082,6534,-905,6535,-89]],id:"39139",properties:{name:"Richland"}},{type:"Polygon",arcs:[[-6485,6536,6537,-2490,6538,-6198]],id:"28127",properties:{name:"Simpson"}},{type:"Polygon",arcs:[[6539,-6248,-5125,6540,6541,-1479,6542]],id:"29019",properties:{name:"Boone"}},{type:"Polygon",arcs:[[-709,-6079,6543,-6254,-5481,6544,-5743,6545]],id:"30015",properties:{name:"Chouteau"}},{type:"Polygon",arcs:[[6546,-884,-3242,-349,-1899,-4446]],id:"31081",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[-6252,6547,-6250,-4999,6548,-4458,-2802,6549,6550]],id:"35049",properties:{name:"Santa Fe"}},{type:"Polygon",arcs:[[6551,-5166,-4465,6552,6553,-4468,-6492]],id:"37163",properties:{name:"Sampson"}},{type:"Polygon",arcs:[[6554,-2642,-4087,-6508,6555,6556,-6504]],id:"40107",properties:{name:"Okfuskee"}},{type:"Polygon",arcs:[[6557,6558,6559,6560,-1335,6561,-2912]],id:"40047",properties:{name:"Garfield"}},{type:"Polygon",arcs:[[-5767,6562,6563,-6343,-5615,6564]],id:"21165",properties:{name:"Menifee"}},{type:"Polygon",arcs:[[-4998,-5747,6565,6566,-4454,-6549]],id:"35033",properties:{name:"Mora"}},{type:"Polygon",arcs:[[-6342,-1599,6567,-4413,-628]],id:"31119",properties:{name:"Madison"}},{type:"Polygon",arcs:[[-200,6568,-880,-6547,-4445,-749]],id:"31121",properties:{name:"Merrick"}},{type:"Polygon",arcs:[[-3353,-5977,6569,-4167,-3951,6570,-5904]],id:"41017",properties:{name:"Deschutes"}},{type:"Polygon",arcs:[[-4170,6571,6572,6573,6574,6575,6576]],id:"32013",properties:{name:"Humboldt"}},{type:"Polygon",arcs:[[6577,6578,6579,6580,6581]],id:"42117",properties:{name:"Tioga"}},{type:"Polygon",arcs:[[-6446,6582,-2704,-4220,6583,6584]],id:"21031",properties:{name:"Butler"}},{type:"Polygon",arcs:[[-4265,6585,-3885,-4102,-4671]],id:"21163",properties:{name:"Meade"}},{type:"Polygon",arcs:[[-6354,6586,-4481,-6396,-4493]],id:"21137",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-5101,-5803,6587,-5335,6588,6589,-3768]],id:"21013",properties:{name:"Bell"}},{type:"Polygon",arcs:[[-2975,6590,6591,-759,-2630,-4580]],id:"21187",properties:{name:"Owen"}},{type:"Polygon",arcs:[[6592,6593,-3779]],id:"37137",properties:{name:"Pamlico"}},{type:"Polygon",arcs:[[6594,6595,6596,6597,6598,6599]],id:"37187",properties:{name:"Washington"}},{type:"Polygon",arcs:[[6600,6601,6602,6603,6604]],id:"54015",properties:{name:"Clay"}},{type:"Polygon",arcs:[[6605,-4907,6606,-5637,6607]],id:"56033",properties:{name:"Sheridan"}},{type:"Polygon",arcs:[[6608,-4703,6609,6610,6611]],id:"42103",properties:{name:"Pike"}},{type:"Polygon",arcs:[[6612,6613,-6591,-2974,6614]],id:"21077",properties:{name:"Gallatin"}},{type:"Polygon",arcs:[[-1148,-5347,6615,6616,-6490,6617,-5629,6618]],id:"37125",properties:{name:"Moore"}},{type:"Polygon",arcs:[[-5711,6619,-6493,-4471,6620,-4984,6621]],id:"37155",properties:{name:"Robeson"}},{type:"Polygon",arcs:[[-4175,6622,-5829,-5968,-6524]],id:"48021",properties:{name:"Bastrop"}},{type:"Polygon",arcs:[[6623,6624,6625,-787,-106]],id:"48455",properties:{name:"Trinity"}},{type:"Polygon",arcs:[[6626,6627,6628,-2898,-4459,-1251,-6498,6629]],id:"37171",properties:{name:"Surry"}},{type:"Polygon",arcs:[[6630,6631,-5248,6632]],id:"38023",properties:{name:"Divide"}},{type:"Polygon",arcs:[[-1352,6633,-4875,-4687,6634,-4763,-5299]],id:"45029",properties:{name:"Colleton"}},{type:"Polygon",arcs:[[-3336,6635,6636,-5603,6637,6638]],id:"47041",properties:{name:"DeKalb"}},{type:"Polygon",arcs:[[-4131,-916,-647,-1659,-1073,6639]],id:"48309",properties:{name:"McLennan"}},{type:"Polygon",arcs:[[-3781,6640,-2332,-4121]],id:"37031",properties:{name:"Carteret"}},{type:"Polygon",arcs:[[-4808,6641,-1653,6642,-2453,-2198]],id:"48307",properties:{name:"McCulloch"}},{type:"Polygon",arcs:[[-2991,6643,6644,-1032,6645,6646]],id:"39171",properties:{name:"Williams"}},{type:"Polygon",arcs:[[6647,6648,6649,6650,6651,6652,6653,-5919]],id:"48039",properties:{name:"Brazoria"}},{type:"Polygon",arcs:[[-1853,-798,6654,6655,-4723,6656,6657]],id:"39013",properties:{name:"Belmont"}},{type:"Polygon",arcs:[[6658,6659,6660,6661,6662,6663]],id:"39071",properties:{name:"Highland"}},{type:"Polygon",arcs:[[-3545,6664,-3070,6665,-753,6666]],id:"39173",properties:{name:"Wood"}},{type:"Polygon",arcs:[[6667,6668,-831,6669,6670,6671]],id:"55015",properties:{name:"Calumet"}},{type:"Polygon",arcs:[[6672,6673,6674,-5651,6675]],id:"42087",properties:{name:"Mifflin"}},{type:"Polygon",arcs:[[6676,-5693,6677,6678,-2482,-1165,6679]],id:"40045",properties:{name:"Ellis"}},{type:"Polygon",arcs:[[6680,6681,-2124,6682,-5857]],id:"46075",properties:{name:"Jones"}},{type:"Polygon",arcs:[[-5707,6683,6684,-4424,-1345,-5959,6685]],id:"47161",properties:{name:"Stewart"}},{type:"Polygon",arcs:[[6686,6687,6688,-2729,-970]],id:"48017",properties:{name:"Bailey"}},{type:"Polygon",arcs:[[6689,-1870,6690,6691,6692,6693]],id:"40065",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-1018,6694,-3763,6695,-4482,-5827]],id:"45059",properties:{name:"Laurens"}},{type:"Polygon",arcs:[[6696,6697,-3590,-1369,-6053,-6015]],id:"46063",properties:{name:"Harding"}},{type:"Polygon",arcs:[[6698,6699,6700,6701,6702]],id:"54105",properties:{name:"Wirt"}},{type:"Polygon",arcs:[[6703,6704,-6668,6705,-792]],id:"55087",properties:{name:"Outagamie"}},{type:"Polygon",arcs:[[-4077,-5749,6706,-3146,6707]],id:"38037",properties:{name:"Grant"}},{type:"Polygon",arcs:[[6708,-4166,6709,6710]],id:"41007",properties:{name:"Clatsop"}},{type:"Polygon",arcs:[[6711,-5680,-4866,-6519,6712,-203,6713,-5413]],id:"42107",properties:{name:"Schuylkill"}},{type:"Polygon",arcs:[[-6581,6714,6715,6716,6717,-5410,6718,6719,6720]],id:"42081",properties:{name:"Lycoming"}},{type:"MultiPolygon",arcs:[[[6721,6722]],[[-6637,6723,6724,6725,-5604]]],id:"47185",properties:{name:"White"}},{type:"Polygon",arcs:[[6726,6727,6728,6729,-6091]],id:"55011",properties:{name:"Buffalo"}},{type:"Polygon",arcs:[[6730,-3933,6731,6732,-5871,-588,-3850,6733]],id:"40139",properties:{name:"Texas"}},{type:"Polygon",arcs:[[-6717,6734,-5681,-6712,-5412,6735]],id:"42037",properties:{name:"Columbia"}},{type:"Polygon",arcs:[[6736,-5751,6737,6738,-6450,-5791,6739,-3592]],id:"46031",properties:{name:"Corson"}},{type:"Polygon",arcs:[[-5946,6740,6741,-6624,-105,-2269,6742]],id:"48225",properties:{name:"Houston"}},{type:"Polygon",arcs:[[-6643,-1652,6743,6744,-5849,-3112,-2454]],id:"48411",properties:{name:"San Saba"}},{type:"Polygon",arcs:[[-4136,6745,6746,6747,-6018,6748,6749]],id:"51036",properties:{name:"Charles City"}},{type:"Polygon",arcs:[[6750,-6046,-2283,6751,-2289,6752]],id:"51139",properties:{name:"Page"}},{type:"Polygon",arcs:[[-2122,-587,6753,-3043,6754]],id:"46123",properties:{name:"Tripp"}},{type:"Polygon",arcs:[[-3078,-5636,6755]],id:"48377",properties:{name:"Presidio"}},{type:"Polygon",arcs:[[-6145,-5929,6756,6757,-4291]],id:"49021",properties:{name:"Iron"}},{type:"Polygon",arcs:[[6758,6759,-1688,6760,6761]],id:"48347",properties:{name:"Nacogdoches"}},{type:"Polygon",arcs:[[6762,6763,6764,6765,6766,6767,-5831]],id:"48477",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-3209,-3877,-5141,6768,6769,6770]],id:"49003",properties:{name:"Box Elder"}},{type:"Polygon",arcs:[[6771,6772,6773,-225,6774]],id:"48097",properties:{name:"Cooke"}},{type:"Polygon",arcs:[[6775,-6693,6776,6777,-1044,-4795]],id:"48487",properties:{name:"Wilbarger"}},{type:"Polygon",arcs:[[-914,6778,-5947,-6743,-2268,6779]],id:"48289",properties:{name:"Leon"}},{type:"Polygon",arcs:[[-1859,-5159,6780,-1608,6781,6782,-1357]],id:"48255",properties:{name:"Karnes"}},{type:"Polygon",arcs:[[-4721,6783,-3441,6784,6785,-5979]],id:"51021",properties:{name:"Bland"}},{type:"Polygon",arcs:[[6786,6787,-6021,6788,6789]],id:"51183",properties:{name:"Sussex"}},{type:"Polygon",arcs:[[6790,-5256,6791,6792,6793]],id:"51111",properties:{name:"Lunenburg"}},{type:"Polygon",arcs:[[6794,-2909,6795,-6602,6796,-6700]],id:"54013",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[6797,-2330,-5978,6798,6799,-5610]],id:"51027",properties:{name:"Buchanan"}},{type:"Polygon",arcs:[[6800,-6794,6801,6802,-3650,6803,-6e3]],id:"51117",properties:{name:"Mecklenburg"}},{type:"Polygon",arcs:[[-6457,-5539,6804,6805,6806,-762]],id:"21017",properties:{name:"Bourbon"}},{type:"Polygon",arcs:[[-18,-3476,-3205,-4277]],id:"16067",properties:{name:"Minidoka"}},{type:"Polygon",arcs:[[6807,-6630,-6497,6808]],id:"37005",properties:{name:"Alleghany"}},{type:"Polygon",arcs:[[-3230,6809,6810,6811,6812,-5254]],id:"51007",properties:{name:"Amelia"}},{type:"Polygon",arcs:[[6813,-4892,6814,-2164,6815,-5910]],id:"51073",properties:{name:"Gloucester"}},{type:"Polygon",arcs:[[6816,-6043,-6751,6817,6818]],id:"51171",properties:{name:"Shenandoah"}},{type:"Polygon",arcs:[[-5611,-6800,6819,-6531]],id:"51051",properties:{name:"Dickenson"}},{type:"Polygon",arcs:[[6820,-5925,6821,-4152,6822,-5642]],id:"55005",properties:{name:"Barron"}},{type:"Polygon",arcs:[[6823,6824,6825,6826]],id:"53049",properties:{name:"Pacific"}},{type:"Polygon",arcs:[[6827,6828,6829,6830]],id:"54045",properties:{name:"Logan"}},{type:"Polygon",arcs:[[6831,6832,-2608,6833,-1101]],id:"06039",properties:{name:"Madera"}},{type:"Polygon",arcs:[[6834,6835,6836,-828,6837]],id:"55061",properties:{name:"Kewaunee"}},{type:"Polygon",arcs:[[6838,-2036,6839,-1310,-3323,6840,-2876]],id:"17135",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[-2045,-6116,6841,6842,6843,-6230,6844,6845]],id:"08051",properties:{name:"Gunnison"}},{type:"Polygon",arcs:[[6846,-613,6847,-6474,6848]],id:"18013",properties:{name:"Brown"}},{type:"Polygon",arcs:[[6849,6850,6851,6852,6853]],id:"13101",properties:{name:"Echols"}},{type:"Polygon",arcs:[[6854,-5345,6855,-5167,-6552,-6491,-6617]],id:"37085",properties:{name:"Harnett"}},{type:"Polygon",arcs:[[-6067,6856,6857,6858,6859,6860]],id:"36107",properties:{name:"Tioga"}},{type:"Polygon",arcs:[[-6618,-6494,-6620,-5710]],id:"37093",properties:{name:"Hoke"}},{type:"Polygon",arcs:[[6861,6862,6863,6864]],id:"37143",properties:{name:"Perquimans"}},{type:"Polygon",arcs:[[-4427,-4785,6865,-5310,-1347]],id:"47085",properties:{name:"Humphreys"}},{type:"Polygon",arcs:[[-645,-381,-1909,-2500,-156]],id:"48381",properties:{name:"Randall"}},{type:"Polygon",arcs:[[-3142,6866,6867,6868,-5745,-131]],id:"08023",properties:{name:"Costilla"}},{type:"MultiPolygon",arcs:[[[6869]],[[6870,-3740,6871,-1796,6872,6873,6874,6875]]],id:"08123",properties:{name:"Weld"}},{type:"Polygon",arcs:[[6876,6877,6878,-3872,6879,-4202]],id:"13313",properties:{name:"Whitfield"}},{type:"Polygon",arcs:[[6880,6881,6882,6883,-6455,6884]],id:"21023",properties:{name:"Bracken"}},{type:"Polygon",arcs:[[-4048,-6382,6885,-2432,6886]],id:"18159",properties:{name:"Tipton"}},{type:"Polygon",arcs:[[6887,-4495,-6398,-4111,6888,-4618]],id:"21207",properties:{name:"Russell"}},{type:"Polygon",arcs:[[-5808,-6348,-5704,6889,-5287]],id:"21143",properties:{name:"Lyon"}},{type:"Polygon",arcs:[[-994,-3144,6890,6891,6892,6893]],id:"20025",properties:{name:"Clark"}},{type:"Polygon",arcs:[[-3422,-6001,-6804,-3652,-1031,6894,-5007]],id:"37077",properties:{name:"Granville"}},{type:"MultiPolygon",arcs:[[[6895,6896]],[[-6599,6897,6898,6899,6900,6901]]],id:"37095",properties:{name:"Hyde"}},{type:"Polygon",arcs:[[6902,-6338,6903,6904]],id:"28125",properties:{name:"Sharkey"}},{type:"Polygon",arcs:[[-6377,6905,6906,-840,6907]],id:"13009",properties:{name:"Baldwin"}},{type:"Polygon",arcs:[[-4103,-3892,-6443,-2700,-6583,-6445]],id:"21085",properties:{name:"Grayson"}},{type:"Polygon",arcs:[[-5445,-6190,-81,-419,-6193]],id:"28115",properties:{name:"Pontotoc"}},{type:"Polygon",arcs:[[-585,6908,6909,-5160,6910]],id:"31015",properties:{name:"Boyd"}},{type:"Polygon",arcs:[[6911]],id:"51790",properties:{name:"Staunton"}},{type:"Polygon",arcs:[[-2396,6912,-3557,-5053,-4646,-6419]],id:"31025",properties:{name:"Cass"}},{type:"Polygon",arcs:[[-1391,6913,-3007,-111,-4542,-506]],id:"46073",properties:{name:"Jerauld"}},{type:"Polygon",arcs:[[-4591,-6222,-4597,-4710,6914,-248]],id:"04003",properties:{name:"Cochise"}},{type:"Polygon",arcs:[[6915,-4255,-3332,-4394,6916,6917]],id:"05113",properties:{name:"Polk"}},{type:"Polygon",arcs:[[-2934,-5487,6918,6919,6920,-3761]],id:"45039",properties:{name:"Fairfield"}},{type:"MultiPolygon",arcs:[[[6921]],[[-2869,6922,6923,6924]],[[6925]]],id:"06111",properties:{name:"Ventura"}},{type:"Polygon",arcs:[[6926,-1936,6927,6928,6929]],id:"06059",properties:{name:"Orange"}},{type:"Polygon",arcs:[[6930,-3678,-2887,6931]],id:"12053",properties:{name:"Hernando"}},{type:"Polygon",arcs:[[6932,6933,6934,6935,-4272,-2922]],id:"13029",properties:{name:"Bryan"}},{type:"Polygon",arcs:[[-2622,-5542,6936,-196,6937,6938,-2599]],id:"19109",properties:{name:"Kossuth"}},{type:"Polygon",arcs:[[6939,-2761,-2515,-3930,6940,-3199]],id:"20187",properties:{name:"Stanton"}},{type:"Polygon",arcs:[[6941,-3117,-2214,6942,-3203,-3966,6943,-6868]],id:"08071",properties:{name:"Las Animas"}},{type:"Polygon",arcs:[[-2877,-6841,-3325,6944,-3087,-4935,6945,6946,-4960]],id:"17119",properties:{name:"Madison"}},{type:"Polygon",arcs:[[6947,-724,-582,6948,6949,6950,6951]],id:"12015",properties:{name:"Charlotte"}},{type:"Polygon",arcs:[[-5327,-4676,-6169,6952,6953,-3878,6954]],id:"18051",properties:{name:"Gibson"}},{type:"Polygon",arcs:[[6955,6956,-3548,-259]],id:"19163",properties:{name:"Scott"}},{type:"Polygon",arcs:[[6957,-5905,-6571,-3955,6958,-3861,6959]],id:"41035",properties:{name:"Klamath"}},{type:"Polygon",arcs:[[-5158,-2649,6960,-1609,-6781]],id:"48123",properties:{name:"DeWitt"}},{type:"Polygon",arcs:[[6961,-300,6962,6963,6964,6965,6966]],id:"01023",properties:{name:"Choctaw"}},{type:"Polygon",arcs:[[6967,6968,6969,-4390,6970,-6963,-299]],id:"01119",properties:{name:"Sumter"}},{type:"Polygon",arcs:[[6971,-1629,6972,6973,6974,6975,-4037]],id:"05015",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[6976,6977,-4832,-1931,6978,-6923,-2868,6979]],id:"06029",properties:{name:"Kern"}},{type:"MultiPolygon",arcs:[[[-6949,6980,6981,6982]],[[6983]],[[-6951,6984]]],id:"12071",properties:{name:"Lee"}},{type:"Polygon",arcs:[[6985,-438,-6229,6986,-1721,6987,6988]],id:"08107",properties:{name:"Routt"}},{type:"Polygon",arcs:[[6989,6990,6991,6992,6993,6994,6995]],id:"17181",properties:{name:"Union"}},{type:"Polygon",arcs:[[-3143,-697,-5686,6996,-6891]],id:"20033",properties:{name:"Comanche"}},{type:"Polygon",arcs:[[6997,6998,-4490,-6444,-1282,-6264]],id:"21059",properties:{name:"Daviess"}},{type:"MultiPolygon",arcs:[[[6999]],[[7e3]],[[7001,7002,7003]]],id:"22087",properties:{name:"St. Bernard"}},{type:"Polygon",arcs:[[7004,7005,-3874,7006,7007]],id:"16005",properties:{name:"Bannock"}},{type:"Polygon",arcs:[[7008,-1543,-1542,-4023,-2841,-855,-3163,-5028]],id:"20153",properties:{name:"Rawlins"}},{type:"Polygon",arcs:[[7009,7010,7011,7012,7013,-2009]],id:"13275",properties:{name:"Thomas"}},{type:"Polygon",arcs:[[7014,7015,-1782,7016,-3139,7017,7018]],id:"13099",properties:{name:"Early"}},{type:"Polygon",arcs:[[-5576,-6106,-3904,7019]],id:"16081",properties:{name:"Teton"}},{type:"Polygon",arcs:[[-3374,-4982,-5026,-5258,7020,7021]],id:"24015",properties:{name:"Cecil"}},{type:"Polygon",arcs:[[-447,7022,7023,-76]],id:"26147",properties:{name:"St. Clair"}},{type:"Polygon",arcs:[[-3666,7024,7025,7026,-3504,7027,7028]],id:"05107",properties:{name:"Phillips"}},{type:"Polygon",arcs:[[7029,7030,-5293,7031,7032]],id:"06013",properties:{name:"Contra Costa"}},{type:"Polygon",arcs:[[7033,-5088,7034,7035,7036]],id:"09009",properties:{name:"New Haven"}},{type:"Polygon",arcs:[[-6953,-6168,-6309,7037,-6998,-6263,7038]],id:"18173",properties:{name:"Warrick"}},{type:"Polygon",arcs:[[7039,-4214,7040,7041,7042,7043,-4269]],id:"18019",properties:{name:"Clark"}},{type:"Polygon",arcs:[[7044,7045,7046,-2369,7047,-3676]],id:"12069",properties:{name:"Lake"}},{type:"Polygon",arcs:[[7048,7049,7050,7051]],id:"21037",properties:{name:"Campbell"}},{type:"Polygon",arcs:[[7052,-2376,7053,-4635,7054,7055]],id:"22037",properties:{name:"East Feliciana"}},{type:"Polygon",arcs:[[7056,7057,7058,7059,-5987]],id:"12121",properties:{name:"Suwannee"}},{type:"MultiPolygon",arcs:[[[7060,-7056,7061,-3918,7062]],[[7063,-3916,7064]]],id:"22125",properties:{name:"West Feliciana"}},{type:"MultiPolygon",arcs:[[[-3174,7065]],[[7066]],[[7067]],[[-3483,7068,7069]]],id:"23013",properties:{name:"Knox"}},{type:"Polygon",arcs:[[7070,7071,7072,7073,-1556]],id:"26163",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[-4356,7074,7075,7076,7077]],id:"28033",properties:{name:"DeSoto"}},{type:"Polygon",arcs:[[7078,-5016,7079,7080,7081,-5266]],id:"24027",properties:{name:"Howard"}},{type:"Polygon",arcs:[[7082,7083,7084,7085,-6990,7086,-6409,-4056]],id:"29157",properties:{name:"Perry"}},{type:"Polygon",arcs:[[-4957,7087,7088,-1246,-4230]],id:"29113",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-2748,7089,7090,7091,7092]],id:"27057",properties:{name:"Hubbard"}},{type:"Polygon",arcs:[[-2409,-3929,-1587,7093,7094,7095]],id:"20021",properties:{name:"Cherokee"}},{type:"Polygon",arcs:[[7096,-6033,7097,-5126,-5470,7098]],id:"27011",properties:{name:"Big Stone"}},{type:"Polygon",arcs:[[-5024,7099,7100,-947,7101,-5259]],id:"10001",properties:{name:"Kent"}},{type:"Polygon",arcs:[[7102,-2904,7103,7104]],id:"16075",properties:{name:"Payette"}},{type:"Polygon",arcs:[[-1142,-2992,-6647,7105,-2539]],id:"18151",properties:{name:"Steuben"}},{type:"Polygon",arcs:[[-1696,7106,-5149,7107,7108,7109]],id:"12075",properties:{name:"Levy"}},{type:"Polygon",arcs:[[-3047,-6246,7110,7111,-6851,7112]],id:"13065",properties:{name:"Clinch"}},{type:"Polygon",arcs:[[7113,7114,-2659,-5090,7115]],id:"26027",properties:{name:"Cass"}},{type:"Polygon",arcs:[[-4355,7116,7117,-5441,-6192,7118,-7075]],id:"28093",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[-347,-4051,-1275,-1560,7119,-5619,-1301]],id:"26081",properties:{name:"Kent"}},{type:"Polygon",arcs:[[7120,7121,-5404,-125,-2809,7122,7123]],id:"31135",properties:{name:"Perkins"}},{type:"Polygon",arcs:[[7124,7125,7126,7127]],id:"34029",properties:{name:"Ocean"}},{type:"Polygon",arcs:[[-3340,7128,-4210,7129,-5438,7130]],id:"18167",properties:{name:"Vigo"}},{type:"Polygon",arcs:[[7131,-6429,-6068,-6861,7132,-6579]],id:"36015",properties:{name:"Chemung"}},{type:"Polygon",arcs:[[-4303,7133,-6615,-2973,7134,-6171]],id:"18155",properties:{name:"Switzerland"}},{type:"Polygon",arcs:[[7135,-7091,7136,-3362,-2020]],id:"27159",properties:{name:"Wadena"}},{type:"Polygon",arcs:[[7137,-4350,-2424,7138,-5557,-5493,-1421]],id:"56027",properties:{name:"Niobrara"}},{type:"Polygon",arcs:[[-3899,7139,7140,-269,7141,-6131]],id:"29013",properties:{name:"Bates"}},{type:"Polygon",arcs:[[7142,-352,-2260,7143,7144,7145]],id:"31129",properties:{name:"Nuckolls"}},{type:"Polygon",arcs:[[-71,-6172,-7135,-2978,7146,-7041,-4213]],id:"18077",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[7147,7148,7149,-4305,7150,7151,7152]],id:"34003",properties:{name:"Bergen"}},{type:"Polygon",arcs:[[7153,7154,7155,7156,-7149,7157]],id:"36119",properties:{name:"Westchester"}},{type:"Polygon",arcs:[[-358,7158,7159,7160]],id:"36063",properties:{name:"Niagara"}},{type:"Polygon",arcs:[[7161,-6495,-4007,7162,-4534]],id:"37189",properties:{name:"Watauga"}},{type:"Polygon",arcs:[[7163,-825,-3361,7164,-5128]],id:"27023",properties:{name:"Chippewa"}},{type:"Polygon",arcs:[[-5202,7165,7166,7167,-6559,7168]],id:"40071",properties:{name:"Kay"}},{type:"Polygon",arcs:[[-538,7169,-5284,-5075,7170]],id:"17151",properties:{name:"Pope"}},{type:"Polygon",arcs:[[-5679,7171,7172,-6611,7173,-6140,-5509,-4863]],id:"42089",properties:{name:"Monroe"}},{type:"MultiPolygon",arcs:[[[-6548,-6251]],[[-5001,-6253,-6551,7174,-4712,-5011,-5874]]],id:"35043",properties:{name:"Sandoval"}},{type:"Polygon",arcs:[[-2946,-1466,-5573,-2532,7175]],id:"16033",properties:{name:"Clark"}},{type:"MultiPolygon",arcs:[[[7176,7177,-1535,-2503,7178]],[[7179]],[[7180]],[[7181]]],id:"26029",properties:{name:"Charlevoix"}},{type:"Polygon",arcs:[[-2568,-1558,7182,-3541,7183,-2989]],id:"26091",properties:{name:"Lenawee"}},{type:"Polygon",arcs:[[-6092,-6730,7184,-3149,7185]],id:"27157",properties:{name:"Wabasha"}},{type:"Polygon",arcs:[[7186,-2339,-4828,-5665,7187]],id:"29047",properties:{name:"Clay"}},{type:"Polygon",arcs:[[7188,7189,-2643,-6555,-6503,7190]],id:"40081",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-5177,-1409,-1139,-5272,7191,-3256,7192,7193]],id:"47069",properties:{name:"Hardeman"}},{type:"Polygon",arcs:[[7194,-2768,7195,-2745,7196]],id:"27071",properties:{name:"Koochiching"}},{type:"Polygon",arcs:[[-27,-2128,7197,7198,-32,-5935]],id:"27107",properties:{name:"Norman"}},{type:"Polygon",arcs:[[-3341,-7131,-5437,7199,-3097,-3249,7200]],id:"17023",properties:{name:"Clark"}},{type:"Polygon",arcs:[[-7198,-2127,7201,-7092,-7136,-2019,7202]],id:"27005",properties:{name:"Becker"}},{type:"Polygon",arcs:[[7203,-3154,-1100,-3467,-5216,7204]],id:"19085",properties:{name:"Harrison"}},{type:"Polygon",arcs:[[7205,-3276,7206,7207,-3505,-7027]],id:"28027",properties:{name:"Coahoma"}},{type:"Polygon",arcs:[[-4456,7208,-3970,7209,7210,-160,7211,7212,-4065,7213]],id:"35037",properties:{name:"Quay"}},{type:"Polygon",arcs:[[-6423,7214,7215,7216,7217,7218]],id:"34023",properties:{name:"Middlesex"}},{type:"Polygon",arcs:[[-3641,7219,7220,7221,7222,-4395,-2014]],id:"54071",properties:{name:"Pendleton"}},{type:"Polygon",arcs:[[-2310,7223,7224,7225,-5401]],id:"05003",properties:{name:"Ashley"}},{type:"Polygon",arcs:[[-3506,-7208,7226,7227,-6334,7228]],id:"28133",properties:{name:"Sunflower"}},{type:"Polygon",arcs:[[7229,-7077,7230,7231,-3273,-7206,-7026,7232]],id:"28143",properties:{name:"Tunica"}},{type:"Polygon",arcs:[[-668,-4613,7233,-3290,-2321,7234]],id:"29171",properties:{name:"Putnam"}},{type:"Polygon",arcs:[[-4612,-3059,-1647,-3291,-7234]],id:"29197",properties:{name:"Schuyler"}},{type:"Polygon",arcs:[[7235,7236,7237,-3638,-2905,-6795,-6699]],id:"54085",properties:{name:"Ritchie"}},{type:"Polygon",arcs:[[7238,-3135,-3635,-7238,7239,7240]],id:"54095",properties:{name:"Tyler"}},{type:"Polygon",arcs:[[-4520,7241,7242,7243,7244,-3438]],id:"51063",properties:{name:"Floyd"}},{type:"Polygon",arcs:[[-4339,-3840,7245,7246,-264,7247]],id:"30055",properties:{name:"McCone"}},{type:"Polygon",arcs:[[-2089,-6392,7248,-3157,7249,-5427]],id:"20177",properties:{name:"Shawnee"}},{type:"Polygon",arcs:[[-7106,-6646,-1037,-2079,-850]],id:"18033",properties:{name:"DeKalb"}},{type:"Polygon",arcs:[[7250,-1455,-94,-232]],id:"46101",properties:{name:"Moody"}},{type:"Polygon",arcs:[[-7054,-2375,-15,7251,-4636]],id:"22091",properties:{name:"St. Helena"}},{type:"Polygon",arcs:[[7252,-3516,7253,-3998,7254]],id:"55051",properties:{name:"Iron"}},{type:"Polygon",arcs:[[7255,-3621,7256,-4812,7257,7258]],id:"48475",properties:{name:"Ward"}},{type:"Polygon",arcs:[[7259,-3554,-4552,7260,-6778]],id:"48485",properties:{name:"Wichita"}},{type:"MultiPolygon",arcs:[[[-6275,7261,7262,7263]],[[-6279,7264,7265,7266]]],id:"48489",properties:{name:"Willacy"}},{type:"Polygon",arcs:[[7267,7268,-3696,7269,7270,-6402,7271]],id:"22083",properties:{name:"Richland"}},{type:"Polygon",arcs:[[-1644,-2060,7272,7273,7274,7275]],id:"29045",properties:{name:"Clark"}},{type:"Polygon",arcs:[[7276,7277,7278,-3132]],id:"54049",properties:{name:"Marion"}},{type:"Polygon",arcs:[[7279,7280,7281,-7236,-6703,7282,-3787]],id:"54107",properties:{name:"Wood"}},{type:"Polygon",arcs:[[-3133,-7279,7283,-5114,7284,7285,-3636]],id:"54033",properties:{name:"Harrison"}},{type:"Polygon",arcs:[[7286,7287,-4340,-7248,-263,-4370]],id:"30105",properties:{name:"Valley"}},{type:"Polygon",arcs:[[7288,7289,7290,-3489,7291]],id:"25009",properties:{name:"Essex"}},{type:"Polygon",arcs:[[7292,-4536,7293,-4506,7294,-1426]],id:"47019",properties:{name:"Carter"}},{type:"Polygon",arcs:[[-284,7295,7296,-5627,7297,7298,7299]],id:"47147",properties:{name:"Robertson"}},{type:"Polygon",arcs:[[-2309,7300,-3508,7301,7302,-3693,7303,7304,-7224]],id:"05017",properties:{name:"Chicot"}},{type:"Polygon",arcs:[[-6886,-6385,7305,7306,-2097,-2433]],id:"18057",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[7307,-2106,-4049,-6887,-2431,7308]],id:"18067",properties:{name:"Howard"}},{type:"Polygon",arcs:[[-2098,-7307,7309,-1519,-610,7310,-1498]],id:"18097",properties:{name:"Marion"}},{type:"Polygon",arcs:[[-5702,-2434,-2099,-1501,7311,-4207,-5594]],id:"18107",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[7312,7313,-2797,-2823,-6483,-6488]],id:"28089",properties:{name:"Madison"}},{type:"MultiPolygon",arcs:[[[7314,7315,-2152]]],id:"26033",properties:{name:"Chippewa"}},{type:"MultiPolygon",arcs:[[[7316]],[[-2153,-7316,7317,7318]]],id:"26097",properties:{name:"Mackinac"}},{type:"Polygon",arcs:[[7319,7320,7321,7322,-4994]],id:"12089",properties:{name:"Nassau"}},{type:"Polygon",arcs:[[-7278,7323,-5188,-5111,-7284]],id:"54091",properties:{name:"Taylor"}},{type:"Polygon",arcs:[[-4540,7324,-5424,-3868,-6879,7325]],id:"47011",properties:{name:"Bradley"}},{type:"Polygon",arcs:[[7326,7327,7328,-7057,-5986,7329,7330]],id:"12079",properties:{name:"Madison"}},{type:"Polygon",arcs:[[7331,-3054,7332,7333,-6336]],id:"28051",properties:{name:"Holmes"}},{type:"Polygon",arcs:[[7334,-3315,-5960,-5955,-1339,-5892]],id:"47183",properties:{name:"Weakley"}},{type:"Polygon",arcs:[[7335,-5478,-6093,-7186,-3148,-2996,-1874]],id:"27049",properties:{name:"Goodhue"}},{type:"Polygon",arcs:[[7336,7337,-874,-1472,7338,7339]],id:"29077",properties:{name:"Greene"}},{type:"Polygon",arcs:[[7340,7341,-3416,7342,-3852,7343,-3457]],id:"01111",properties:{name:"Randolph"}},{type:"Polygon",arcs:[[-3723,-4668,7344,7345,-1565]],id:"35013",properties:{name:"DoÃ±a Ana"}},{type:"Polygon",arcs:[[7346,7347,-6719,-5409,7348,-6674]],id:"42119",properties:{name:"Union"}},{type:"Polygon",arcs:[[-2593,-241,-3764,7349,-5793]],id:"46119",properties:{name:"Sully"}},{type:"Polygon",arcs:[[-1578,-5764,-945,7350,-5397,7351]],id:"33003",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[-2788,7352]],id:"51770",properties:{name:"Roanoke"}},{type:"Polygon",arcs:[[-5682,-3550,7353,-5172,-4332,-2093,-2771]],id:"19115",properties:{name:"Louisa"}},{type:"Polygon",arcs:[[-2675,7354,7355,-5993,-5054]],id:"19145",properties:{name:"Page"}},{type:"Polygon",arcs:[[-5486,-4870,-4977,-5555,-5727,7356,-6919]],id:"45055",properties:{name:"Kershaw"}},{type:"Polygon",arcs:[[7357,-7007,-3873,-3207,-3475]],id:"16077",properties:{name:"Power"}},{type:"Polygon",arcs:[[7358,-3120,7359]],id:"41011",properties:{name:"Coos"}},{type:"Polygon",arcs:[[-5906,-6958,7360,-2474,-3121,-7359,7361]],id:"41019",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[-4410,-2697,7362,7363,7364]],id:"55023",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[7365,7366,-1680,7367,7368,-3798],[7369]],id:"51005",properties:{name:"Alleghany"}},{type:"Polygon",arcs:[[-4720,-5457,7370,7371,-4517,-3435,-6784]],id:"51071",properties:{name:"Giles"}},{type:"Polygon",arcs:[[-7059,7372,-6852,-7112,7373,7374,-5144,7375]],id:"12023",properties:{name:"Columbia"}},{type:"Polygon",arcs:[[-5496,7376,7377,7378]],id:"27123",properties:{name:"Ramsey"}},{type:"Polygon",arcs:[[7379,-4179,7380,7381,-1719,7382,7383]],id:"49047",properties:{name:"Uintah"}},{type:"Polygon",arcs:[[7384,7385,7386,-4363,7387,-7243]],id:"51067",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[7388,-3388]],id:"15005",properties:{name:"Kalawao"}},{type:"Polygon",arcs:[[-4941,-4418,-6052,7389,7390,-6389,-2087]],id:"20005",properties:{name:"Atchison"}},{type:"Polygon",arcs:[[7391,-6269,-6213,7392,7393]],id:"09015",properties:{name:"Windham"}},{type:"Polygon",arcs:[[7394,7395,-7393,-6212,7396,7397,-5086]],id:"09011",properties:{name:"New London"}},{type:"Polygon",arcs:[[7398,7399,7400,7401,-3367,-6514]],id:"41005",properties:{name:"Clackamas"}},{type:"Polygon",arcs:[[-1052,-5006,-5516,7402,-1684,-6760,7403]],id:"48419",properties:{name:"Shelby"}},{type:"Polygon",arcs:[[7404,-5671,-962,7405,7406,-4141,7407]],id:"39029",properties:{name:"Columbiana"}},{type:"Polygon",arcs:[[-1105,7408,-6977,7409,-1243]],id:"06031",properties:{name:"Kings"}},{type:"Polygon",arcs:[[7410,-2872,-2103,7411,7412,7413,7414]],id:"06045",properties:{name:"Mendocino"}},{type:"Polygon",arcs:[[-4197,-1809,7415,-2220,-6114]],id:"08035",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[-512,-2967,-3595,7416,7417,-2777]],id:"48259",properties:{name:"Kendall"}},{type:"Polygon",arcs:[[7418,7419,-3658,7420,-6974]],id:"05009",properties:{name:"Boone"}},{type:"Polygon",arcs:[[-6561,7421,7422,-7189,7423,-1336]],id:"40083",properties:{name:"Logan"}},{type:"Polygon",arcs:[[7424,-3965,7425,7426,-3533]],id:"36065",properties:{name:"Oneida"}},{type:"Polygon",arcs:[[7427,-6459,7428,7429,7430,7431]],id:"37113",properties:{name:"Macon"}},{type:"Polygon",arcs:[[7432,7433,7434,7435,7436,7437,7438]],id:"36031",properties:{name:"Essex"}},{type:"Polygon",arcs:[[-2016,-4397,7439,7440,-7366,-3797]],id:"51017",properties:{name:"Bath"}},{type:"Polygon",arcs:[[7441,7442,7443,7444,-6829]],id:"54005",properties:{name:"Boone"}},{type:"Polygon",arcs:[[7445,7446,-3801,-5455,7447]],id:"54019",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[7448,7449,-6605,7450,-7446,7451,-7443,7452,7453]],id:"54039",properties:{name:"Kanawha"}},{type:"Polygon",arcs:[[7454,-6988,-1720,-7382]],id:"08103",properties:{name:"Rio Blanco"}},{type:"Polygon",arcs:[[-1499,-7311,-614,-6847,7455,-6303,7456]],id:"18109",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[7457,-6405,7458,7459,7460,-4642]],id:"22059",properties:{name:"LaSalle"}},{type:"Polygon",arcs:[[-1480,-6542,7461,-4893,7462]],id:"29135",properties:{name:"Moniteau"}},{type:"Polygon",arcs:[[-4681,7463,-1619,-5673,7464,7465]],id:"42039",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[-5734,-5209,7466,7467,7468,-6563,-5766]],id:"21205",properties:{name:"Rowan"}},{type:"Polygon",arcs:[[-4783,7469,7470,7471,7472,-5337,7473]],id:"47187",properties:{name:"Williamson"}},{type:"Polygon",arcs:[[-1614,-960,-711,7474,-306]],id:"38081",properties:{name:"Sargent"}},{type:"Polygon",arcs:[[7475,-3104,7476]],id:"16061",properties:{name:"Lewis"}},{type:"Polygon",arcs:[[7477,7478,7479,-7477,-3103,7480,7481]],id:"16069",properties:{name:"Nez Perce"}},{type:"Polygon",arcs:[[7482,-7146,7483,-1488,-6175,7484,-4658]],id:"20089",properties:{name:"Jewell"}},{type:"Polygon",arcs:[[7485,-3236,7486,-5425,7487,-2917]],id:"20117",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[-3235,-4020,-4942,-2085,-5426,-7487]],id:"20131",properties:{name:"Nemaha"}},{type:"Polygon",arcs:[[7488,-4039,-3186,7489,7490,-2115]],id:"40001",properties:{name:"Adair"}},{type:"Polygon",arcs:[[-7431,7491,7492,7493,7494]],id:"37043",properties:{name:"Clay"}},{type:"Polygon",arcs:[[7495,-3775,-5725,-4343,-5724,-4341,-6299,7496,7497,7498,7499]],id:"45073",properties:{name:"Oconee"}},{type:"Polygon",arcs:[[-3185,7500,7501,7502,7503,-7490]],id:"05033",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[-2994,-2136,-6388,-2512,-2760]],id:"20093",properties:{name:"Kearny"}},{type:"Polygon",arcs:[[-2493,-6333,7504,7505,7506,7507]],id:"28091",properties:{name:"Marion"}},{type:"Polygon",arcs:[[7508,-6194,-422,-2313,7509]],id:"28161",properties:{name:"Yalobusha"}},{type:"Polygon",arcs:[[7510,-2255,-1007,-2596,-143,-2839,-4022]],id:"31065",properties:{name:"Furnas"}},{type:"Polygon",arcs:[[7511,7512,-5370,-4162,7513]],id:"53015",properties:{name:"Cowlitz"}},{type:"Polygon",arcs:[[-1041,7514,7515,-2284,7516,-4031]],id:"01083",properties:{name:"Limestone"}},{type:"Polygon",arcs:[[7517,7518,7519,-2344]],id:"12013",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[7520,-3679,-6931,7521,-7109]],id:"12017",properties:{name:"Citrus"}},{type:"Polygon",arcs:[[-7303,7522,-6905,7523,-3524,-3694]],id:"28055",properties:{name:"Issaquena"}},{type:"Polygon",arcs:[[7524,-4271,7525,-3886,-6586,-4264]],id:"18061",properties:{name:"Harrison"}},{type:"Polygon",arcs:[[-6941,-3934,-6731,7526,-3200]],id:"20129",properties:{name:"Morton"}},{type:"Polygon",arcs:[[-4504,-6138,7527,-3758,-6695,-1017]],id:"45083",properties:{name:"Spartanburg"}},{type:"Polygon",arcs:[[-1486,-3102,7528,-3269,7529,-6176]],id:"20143",properties:{name:"Ottawa"}},{type:"Polygon",arcs:[[7530,7531,-4441]],id:"30103",properties:{name:"Treasure"}},{type:"Polygon",arcs:[[7532,-4859,-4760,7533,7534,-1601]],id:"31051",properties:{name:"Dixon"}},{type:"Polygon",arcs:[[7535,7536,-5926,-6821,-5641,-5529]],id:"55013",properties:{name:"Burnett"}},{type:"Polygon",arcs:[[7537,-5788,-5467,7538,-3013,7539,7540]],id:"55025",properties:{name:"Dane"}},{type:"Polygon",arcs:[[7541,7542,7543,7544,7545,-4158,7546,-4625]],id:"22007",properties:{name:"Assumption"}},{type:"Polygon",arcs:[[7547,7548,7549,7550,-6612,-7173,7551]],id:"42127",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[7552,-7426,-3964,7553,-47,7554,7555]],id:"36077",properties:{name:"Otsego"}},{type:"Polygon",arcs:[[7556,7557,-3751,-2273,7558,-2239]],id:"40049",properties:{name:"Garvin"}},{type:"Polygon",arcs:[[-4311,7559,-7439,7560,7561,7562,-3961]],id:"36041",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[-4038,-6976,7563,7564,7565,-7501,-3184]],id:"05087",properties:{name:"Madison"}},{type:"Polygon",arcs:[[7566,-7548,7567,-5661,7568,-6859]],id:"42115",properties:{name:"Susquehanna"}},{type:"MultiPolygon",arcs:[[[7569]],[[7570,7571,7572,7573]]],id:"12037",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-805,-2011,7574,7575,7576]],id:"12039",properties:{name:"Gadsden"}},{type:"Polygon",arcs:[[-2345,-7520,7577,-7574,7578]],id:"12045",properties:{name:"Gulf"}},{type:"Polygon",arcs:[[7579,-7013,7580,-7331,7581,7582,7583]],id:"12065",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[7584,-2891,7585,7586,-2893]],id:"12103",properties:{name:"Pinellas"}},{type:"Polygon",arcs:[[7587,7588,-496,7589,-6691,-1869,-500]],id:"40075",properties:{name:"Kiowa"}},{type:"Polygon",arcs:[[-7502,-7566,7590,-4822,7591]],id:"05047",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[7592,7593,-2639,7594,7595]],id:"40117",properties:{name:"Pawnee"}},{type:"Polygon",arcs:[[-3753,7596,7597,7598,7599,7600,-2275]],id:"40069",properties:{name:"Johnston"}},{type:"Polygon",arcs:[[-1093,-5104,7601,7602,-1637,-6041,7603]],id:"29081",properties:{name:"Harrison"}},{type:"Polygon",arcs:[[-6538,7604,7605,7606,-6330,-2491]],id:"28031",properties:{name:"Covington"}},{type:"Polygon",arcs:[[7607,-7514,-4161,-6709,7608,-6826]],id:"53069",properties:{name:"Wahkiakum"}},{type:"Polygon",arcs:[[7609,7610,7611,7612,7613]],id:"12019",properties:{name:"Clay"}},{type:"Polygon",arcs:[[-2154,-7319,7614,7615,-4915]],id:"26153",properties:{name:"Schoolcraft"}},{type:"Polygon",arcs:[[-1690,-2766,7616,-4405,-5924,-7537,7617]],id:"55031",properties:{name:"Douglas"}},{type:"MultiPolygon",arcs:[[[7618,7619,7620]],[[7621,7622,7623,7624,-1886,-163,7625]]],id:"13193",properties:{name:"Macon"}},{type:"Polygon",arcs:[[7626,7627,-5396,-5392,-1205,-5275]],id:"22027",properties:{name:"Claiborne"}},{type:"Polygon",arcs:[[-7414,7628,7629,7630,7631,7632,7633]],id:"06097",properties:{name:"Sonoma"}},{type:"Polygon",arcs:[[-3749,-6507,7634,-7557,-2238,7635]],id:"40087",properties:{name:"McClain"}},{type:"Polygon",arcs:[[7636,-2480,-6420,-3717,-3237,-7486,-2916]],id:"31067",properties:{name:"Gage"}},{type:"Polygon",arcs:[[7637,-5550,-5761,7638,-2957,7639,7640]],id:"48343",properties:{name:"Morris"}},{type:"Polygon",arcs:[[-7424,-7191,-6502,-3747,7641]],id:"40109",properties:{name:"Oklahoma"}},{type:"Polygon",arcs:[[7642,-2247,-6461,7643,-2264]],id:"48223",properties:{name:"Hopkins"}},{type:"Polygon",arcs:[[-3963,7644,7645,7646,-42,-7554]],id:"36057",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[7647,-6037,7648,7649,-7593,7650,-7167]],id:"40113",properties:{name:"Osage"}},{type:"Polygon",arcs:[[7651,-280,7652,7653]],id:"12113",properties:{name:"Santa Rosa"}},{type:"Polygon",arcs:[[-7047,7654,-2366]],id:"12117",properties:{name:"Seminole"}},{type:"Polygon",arcs:[[-1781,7655,7656,-802,-3137,-7017]],id:"13007",properties:{name:"Baker"}},{type:"Polygon",arcs:[[7657,7658,-4199,-4247,7659]],id:"13083",properties:{name:"Dade"}},{type:"Polygon",arcs:[[7660,7661,7662,7663,-7656,-1780]],id:"13095",properties:{name:"Dougherty"}},{type:"Polygon",arcs:[[-7664,7664,7665,-7010,-2008,-803,-7657]],id:"13205",properties:{name:"Mitchell"}},{type:"Polygon",arcs:[[-7018,-3138,-800,7666,7667]],id:"13253",properties:{name:"Seminole"}},{type:"Polygon",arcs:[[7668,-7595,-2644,-7190,-7423]],id:"40119",properties:{name:"Payne"}},{type:"Polygon",arcs:[[-5754,7669,-4114,-401,-5812,-5860]],id:"47137",properties:{name:"Pickett"}},{type:"Polygon",arcs:[[-5571,-6522,7670,-5518,-6441]],id:"21087",properties:{name:"Green"}},{type:"Polygon",arcs:[[-4803,-2267,-4791,7671]],id:"48397",properties:{name:"Rockwall"}},{type:"Polygon",arcs:[[-4666,7672,-3079,7673,7674]],id:"48229",properties:{name:"Hudspeth"}},{type:"Polygon",arcs:[[-6701,-6797,-6601,-7450,7675]],id:"54087",properties:{name:"Roane"}},{type:"Polygon",arcs:[[-6397,-6315,-3771,-6270,-396,-4113]],id:"21147",properties:{name:"McCreary"}},{type:"Polygon",arcs:[[7676,7677,-6967,7678,7679,-6201,7680]],id:"28153",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[-7363,-2696,7681,7682,-3935,-4615,7683]],id:"55043",properties:{name:"Grant"}},{type:"Polygon",arcs:[[7684,7685,7686,-7063,-3917,-7064,7687,7688]],id:"22029",properties:{name:"Concordia"}},{type:"Polygon",arcs:[[-6463,-2960,-2460,7689,7690,7691,-2251]],id:"48423",properties:{name:"Smith"}},{type:"Polygon",arcs:[[7692,-7433,-7560,-4310,7693]],id:"36033",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[7694,7695,-3530,7696,-3528,7697,-4319,7698,-7685,7699]],id:"22107",properties:{name:"Tensas"}},{type:"Polygon",arcs:[[7700,7701,-2377,-7053,-7061,-7687]],id:"28157",properties:{name:"Wilkinson"}},{type:"Polygon",arcs:[[-3527,-6489,-6196,-4315,-7698]],id:"28021",properties:{name:"Claiborne"}},{type:"Polygon",arcs:[[-301,-6962,-7678,7702]],id:"28023",properties:{name:"Clarke"}},{type:"Polygon",arcs:[[-2380,7703,-4756,-1388,-236,-2592]],id:"46049",properties:{name:"Faulk"}},{type:"Polygon",arcs:[[-1398,-5339,-1043,-4030,7704]],id:"47099",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[-7607,7705,-6204,-412,7706,-6331]],id:"28035",properties:{name:"Forrest"}},{type:"Polygon",arcs:[[7707,7708,-595,7709,7710,-7512,-7608,-6825]],id:"53041",properties:{name:"Lewis"}},{type:"Polygon",arcs:[[-7387,7711,7712,-5997,7713,-1228,7714,-771,-4364]],id:"51143",properties:{name:"Pittsylvania"}},{type:"Polygon",arcs:[[-295,7715,7716,7717,-6217]],id:"54027",properties:{name:"Hampshire"}},{type:"Polygon",arcs:[[-6291,7718,-934,-2469,7719,7720]],id:"06115",properties:{name:"Yuba"}},{type:"Polygon",arcs:[[-6337,-7334,-7313,-6487,-3525,-7524,-6904]],id:"28163",properties:{name:"Yazoo"}},{type:"Polygon",arcs:[[-2784,7721,-6582,-6721,7722,-4854,7723]],id:"42105",properties:{name:"Potter"}},{type:"Polygon",arcs:[[-121,-6280,-7267,7724,7725,7726]],id:"48215",properties:{name:"Hidalgo"}},{type:"Polygon",arcs:[[7727,7728]],id:"51131",properties:{name:"Northampton"}},{type:"Polygon",arcs:[[-4312,-3959,-7425,-3532,-6128]],id:"36049",properties:{name:"Lewis"}},{type:"Polygon",arcs:[[7729,-7626,-162,7730]],id:"13249",properties:{name:"Schley"}},{type:"Polygon",arcs:[[7731,-7364,-7684,-4614,-917,-3685]],id:"19043",properties:{name:"Clayton"}},{type:"Polygon",arcs:[[-6468,7732,-6865,7733]],id:"37041",properties:{name:"Chowan"}},{type:"Polygon",arcs:[[7734,7735,-4251,-4733,7736,7737,-2286]],id:"01095",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[7738,7739,7740,-7549,-7567,-6858]],id:"36007",properties:{name:"Broome"}},{type:"Polygon",arcs:[[-7647,7741,-6080,-43]],id:"36093",properties:{name:"Schenectady"}},{type:"Polygon",arcs:[[7742,-2271,7743,-6765,7744]],id:"48041",properties:{name:"Brazos"}},{type:"Polygon",arcs:[[7745,7746,7747,7748,7749,-2281]],id:"51047",properties:{name:"Culpeper"}},{type:"Polygon",arcs:[[7750,7751,-7745,-6764,7752]],id:"48051",properties:{name:"Burleson"}},{type:"MultiPolygon",arcs:[[[7753]],[[7754]],[[-416,7755,7756,7757]]],id:"28047",properties:{name:"Harrison"}},{type:"Polygon",arcs:[[7758,7759,7760,-2242,-7643,-2263]],id:"48119",properties:{name:"Delta"}},{type:"Polygon",arcs:[[-6758,7761,-2,-4292]],id:"49053",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-6718,-6736,-5411]],id:"42093",properties:{name:"Montour"}},{type:"Polygon",arcs:[[-4810,-2589,7762,-387,-1892,-1678,7763,7764,7765]],id:"48105",properties:{name:"Crockett"}},{type:"Polygon",arcs:[[7766,-2361,7767,7768,-7655,-7046,7769]],id:"12127",properties:{name:"Volusia"}},{type:"Polygon",arcs:[[-6283,7770,7771,-6430,-7132,-6578,-7722,-2783]],id:"36101",properties:{name:"Steuben"}},{type:"Polygon",arcs:[[-1450,7772,7773,-3990,7774]],id:"55101",properties:{name:"Racine"}},{type:"Polygon",arcs:[[7775,-2401,7776,7777,7778,-3329]],id:"05059",properties:{name:"Hot Spring"}},{type:"Polygon",arcs:[[-6938,-2452,-985,-3027]],id:"19091",properties:{name:"Humboldt"}},{type:"Polygon",arcs:[[-3713,-2856,-3429,-2191,-4820,7779]],id:"29055",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[-5129,-7165,-3360,-3538,-3223,-3501,7780]],id:"27173",properties:{name:"Yellow Medicine"}},{type:"Polygon",arcs:[[-3819,-5587,-3674,-2443,7781,-6118]],id:"13151",properties:{name:"Henry"}},{type:"Polygon",arcs:[[7782,7783,7784,7785,-4729]],id:"01011",properties:{name:"Bullock"}},{type:"Polygon",arcs:[[-3810,7786,-6832,-1107,-177,7787]],id:"06047",properties:{name:"Merced"}},{type:"Polygon",arcs:[[7788,-5911,-6816,-2171,7789,-2169,7790,7791,-6747]],id:"51095",properties:{name:"James City"}},{type:"Polygon",arcs:[[-5391,7792,-6400,7793,-1207]],id:"22049",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[7794,7795,7796,7797,-6862,-7733,-6467]],id:"37073",properties:{name:"Gates"}},{type:"Polygon",arcs:[[7798,7799,7800,-4406,-5367,7801]],id:"55063",properties:{name:"La Crosse"}},{type:"MultiPolygon",arcs:[[[-7620,7802,-7623]],[[7803,7804,7805,-7621,-7622,-7730,7806]]],id:"13269",properties:{name:"Taylor"}},{type:"Polygon",arcs:[[7807,7808,-6863,-7798]],id:"37139",properties:{name:"Pasquotank"}},{type:"Polygon",arcs:[[-5983,-3588,7809,7810,-7746,-2280,-6045]],id:"51061",properties:{name:"Fauquier"}},{type:"Polygon",arcs:[[-2291,7811,-7749,7812,-2718,-5234]],id:"51137",properties:{name:"Orange"}},{type:"Polygon",arcs:[[7813,-7556,7814,-7740,7815]],id:"36017",properties:{name:"Chenango"}},{type:"Polygon",arcs:[[-4556,7816,7817]],id:"51680",properties:{name:"Lynchburg"}},{type:"Polygon",arcs:[[7818,7819,7820,7821,-7598]],id:"40029",properties:{name:"Coal"}},{type:"Polygon",arcs:[[-6556,-6512,7822,-7820,7823,7824]],id:"40063",properties:{name:"Hughes"}},{type:"Polygon",arcs:[[-4174,7825,-7753,-6763,-5830,-6623]],id:"48287",properties:{name:"Lee"}},{type:"Polygon",arcs:[[7826,-7817,-4555,-3627,7827,-5998,-7713]],id:"51031",properties:{name:"Campbell"}},{type:"Polygon",arcs:[[-7635,-6506,7828,-7824,-7819,-7597,-3752,-7558]],id:"40123",properties:{name:"Pontotoc"}},{type:"Polygon",arcs:[[-2467,-932,7829,7830,-3953,-4171,-6577,7831,7832,7833,7834,7835,7836]],id:"32031",properties:{name:"Washoe"}},{type:"Polygon",arcs:[[7837,7838,-4704,-6609,-7551]],id:"36105",properties:{name:"Sullivan"}},{type:"Polygon",arcs:[[7839,7840,7841,7842,7843]],id:"42041",properties:{name:"Cumberland"}},{type:"Polygon",arcs:[[-3637,-7286,7844,-3251,7845,-2907]],id:"54041",properties:{name:"Lewis"}},{type:"Polygon",arcs:[[7846,-3706,-811,-3701,-3894,-5341,7847]],id:"22053",properties:{name:"Jefferson Davis"}},{type:"Polygon",arcs:[[-425,-2944,-557,7848,7849]],id:"31113",properties:{name:"Logan"}},{type:"Polygon",arcs:[[7850,7851,-3410,7852,7853,-7784,7854]],id:"01113",properties:{name:"Russell"}},{type:"Polygon",arcs:[[-4244,7855,7856,-5942,-5876,-1222]],id:"05135",properties:{name:"Sharp"}},{type:"Polygon",arcs:[[-4833,-6978,-7409,-1104]],id:"06107",properties:{name:"Tulare"}},{type:"Polygon",arcs:[[-4217,-6523,-3322,7857,-5623,7858]],id:"21003",properties:{name:"Allen"}},{type:"Polygon",arcs:[[7859,7860,7861,7862,7863,7864,-4582]],id:"22051",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[-4699,7865,7866,-7154,7867]],id:"36079",properties:{name:"Putnam"}},{type:"Polygon",arcs:[[-4700,-7868,-7158,-7148,7868]],id:"36087",properties:{name:"Rockland"}},{type:"Polygon",arcs:[[-7867,7869,7870,-7036,7871,-7155]],id:"09001",properties:{name:"Fairfield"}},{type:"Polygon",arcs:[[7872,-2174,-4054,-2206,7873,-4242]],id:"29091",properties:{name:"Howell"}},{type:"Polygon",arcs:[[-649,-915,-6780,-7743,-7752,7874]],id:"48395",properties:{name:"Robertson"}},{type:"Polygon",arcs:[[7875,7876,7877,-1219,-1216,-5290,-7031,7878]],id:"06067",properties:{name:"Sacramento"}},{type:"Polygon",arcs:[[-6510,7879,7880,7881,7882,7883]],id:"40061",properties:{name:"Haskell"}},{type:"Polygon",arcs:[[-7883,7884,-2581,7885]],id:"40077",properties:{name:"Latimer"}},{type:"Polygon",arcs:[[-7406,-967,7886,-6158,7887]],id:"54029",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[7888,-4948,7889,-5273,7890,7891]],id:"05073",properties:{name:"Lafayette"}},{type:"Polygon",arcs:[[7892,7893,-7126,7894,7895,-4296,7896]],id:"34001",properties:{name:"Atlantic"}},{type:"Polygon",arcs:[[-5316,-3834,-4278,-3211,7897,7898]],id:"16083",properties:{name:"Twin Falls"}},{type:"Polygon",arcs:[[-1651,-4806,-665,7899,-6744]],id:"48333",properties:{name:"Mills"}},{type:"Polygon",arcs:[[-4619,-6889,-4115,-7670,-5753]],id:"21053",properties:{name:"Clinton"}},{type:"Polygon",arcs:[[7900,-1823,-2007,7901,-7408,-4140,7902,-3296]],id:"39151",properties:{name:"Stark"}},{type:"Polygon",arcs:[[-3448,-3988,7903,7904,-3213,7905]],id:"01117",properties:{name:"Shelby"}},{type:"Polygon",arcs:[[7906,-6515,-3370,-3350,-5900,7907]],id:"41053",properties:{name:"Polk"}},{type:"Polygon",arcs:[[7908,7909,-3282,7910,-6310,-2073]],id:"20167",properties:{name:"Russell"}},{type:"Polygon",arcs:[[-6391,7911,7912,-1199,-3158,-7249]],id:"20045",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[-7145,7913,-2920,-1483,-7484]],id:"20157",properties:{name:"Republic"}},{type:"Polygon",arcs:[[7914,7915,-7879,-7030,7916,-7631]],id:"06095",properties:{name:"Solano"}},{type:"Polygon",arcs:[[7917,-4245,-1225,7918,-3660,7919]],id:"05005",properties:{name:"Baxter"}},{type:"Polygon",arcs:[[7920,7921,7922,7923]],id:"51710",properties:{name:"Norfolk"}},{type:"Polygon",arcs:[[7924,7925,-968,-473,-1658,-3004,-3619,7926,-4814]],id:"35025",properties:{name:"Lea"}},{type:"MultiPolygon",arcs:[[[-7697,-3529]],[[-7270,-3695,-3522,-7696,7927]]],id:"22065",properties:{name:"Madison"}},{type:"Polygon",arcs:[[-4815,-7927,-3622,-7256,7928]],id:"48301",properties:{name:"Loving"}},{type:"MultiPolygon",arcs:[[[7929]],[[7930,-6874,7931,-6111],[7932],[-6870]]],id:"08014",properties:{name:"Broomfield"}},{type:"Polygon",arcs:[[-2583,7933,-6918,7934,-3182,-5547,7935,-4321]],id:"40089",properties:{name:"McCurtain"}},{type:"Polygon",arcs:[[7936,-6160,7937,-4724,-6656]],id:"54069",properties:{name:"Ohio"}},{type:"Polygon",arcs:[[-5953,-6460,-7428,7938,7939]],id:"37075",properties:{name:"Graham"}},{type:"Polygon",arcs:[[7940,-7939,-7432,-7495,7941,-2025,-5423]],id:"37039",properties:{name:"Cherokee"}},{type:"Polygon",arcs:[[-4759,-3465,7942,-7534]],id:"31043",properties:{name:"Dakota"}},{type:"Polygon",arcs:[[7943,7944,7945,-5567,-6266,-7392,7946,-5962,7947,-3495]],id:"25027",properties:{name:"Worcester"}},{type:"Polygon",arcs:[[7948,7949,7950,-1839,7951,-2707]],id:"39017",properties:{name:"Butler"}},{type:"Polygon",arcs:[[7952,-7891,-5276,-1211,-4222,7953]],id:"22015",properties:{name:"Bossier"}},{type:"Polygon",arcs:[[-3837,-1089,-1756,-4042,7954]],id:"17103",properties:{name:"Lee"}},{type:"Polygon",arcs:[[-4164,-5372,7955,7956,-7400,7957]],id:"41051",properties:{name:"Multnomah"}},{type:"Polygon",arcs:[[7958,-5279,7959,-6074,7960]],id:"37019",properties:{name:"Brunswick"}},{type:"Polygon",arcs:[[7961,-5861,-5815,7962,-6724,-6636,-3335]],id:"47141",properties:{name:"Putnam"}},{type:"Polygon",arcs:[[7963,7964,7965,7966,-3844,7967]],id:"37083",properties:{name:"Halifax"}},{type:"Polygon",arcs:[[-2947,-7176,-2537,7968,-3473,-1772]],id:"16023",properties:{name:"Butte"}},{type:"Polygon",arcs:[[7969,-4194,-6107,-4192,-6113],[-4191]],id:"08031",properties:{name:"Denver"}},{type:"Polygon",arcs:[[-7225,-7305,7970,-7268,7971,-5394]],id:"22067",properties:{name:"Morehouse"}},{type:"Polygon",arcs:[[7972,-4366,-2166]],id:"51735",properties:{name:"Poquoson"}},{type:"Polygon",arcs:[[7973,-7924,7974,7975]],id:"51740",properties:{name:"Portsmouth"}},{type:"MultiPolygon",arcs:[[[-7933]],[[7976,-6875,-7931,-6110,7977,-6224],[-7930]]],id:"08013",properties:{name:"Boulder"}},{type:"Polygon",arcs:[[7978,7979,-7004,7980,-7862]],id:"22071",properties:{name:"Orleans"}},{type:"Polygon",arcs:[[-4844,-3776,-7496,-7429,-6458]],id:"37099",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[7981,7982,7983,-2560,7984,-6965]],id:"01025",properties:{name:"Clarke"}},{type:"Polygon",arcs:[[-6971,-4389,7985,-6096,-6362,7986,-7982,-6964]],id:"01091",properties:{name:"Marengo"}},{type:"Polygon",arcs:[[7987,7988,-6097,-7986,-4388]],id:"01065",properties:{name:"Hale"}},{type:"Polygon",arcs:[[7989,7990,-2837,7991,7992]],id:"01075",properties:{name:"Lamar"}},{type:"Polygon",arcs:[[7993,-7992,-2836,7994,-4386,-6970,7995]],id:"01107",properties:{name:"Pickens"}},{type:"Polygon",arcs:[[-4649,-5996,7996,-4016,-3233,-3716]],id:"31127",properties:{name:"Nemaha"}},{type:"Polygon",arcs:[[7997,-4139,-4521,-4137,-6750,7998,-2790,7999,-4953,-5943,-4951,8e3,-6811]],id:"51041",properties:{name:"Chesterfield"}},{type:"Polygon",arcs:[[-7403,-5515,8001,-5045,-1685]],id:"48403",properties:{name:"Sabine"}},{type:"Polygon",arcs:[[8002,-6057,-540,8003]],id:"26019",properties:{name:"Benzie"}},{type:"Polygon",arcs:[[8004,-5667,-6408,8005,-7140,-3898]],id:"29037",properties:{name:"Cass"}},{type:"Polygon",arcs:[[-7905,8006,-3459,8007,-5035,-3214]],id:"01037",properties:{name:"Coosa"}},{type:"Polygon",arcs:[[-5230,8008,-6876,-7977,-6223,-436]],id:"08069",properties:{name:"Larimer"}},{type:"Polygon",arcs:[[-7298,-5626,8009,8010,-7471,8011]],id:"47037",properties:{name:"Davidson"}},{type:"Polygon",arcs:[[8012,-7347,-6673,8013,-5839,8014]],id:"42027",properties:{name:"Centre"}},{type:"Polygon",arcs:[[8015,8016,8017,8018,-5832,-6768]],id:"48015",properties:{name:"Austin"}},{type:"Polygon",arcs:[[8019,-4885,8020,8021]],id:"50013",properties:{name:"Grand Isle"}},{type:"Polygon",arcs:[[-5777,8022,-7976,8023,8024,-7796,8025]],id:"51800",properties:{name:"Suffolk"}},{type:"Polygon",arcs:[[8026,8027,-2211,-3116]],id:"08025",properties:{name:"Crowley"}},{type:"Polygon",arcs:[[8028,-3119,8029,-6233]],id:"08027",properties:{name:"Custer"}},{type:"Polygon",arcs:[[-5390,-5395,-7972,-7272,-6401,-7793]],id:"22073",properties:{name:"Ouachita"}},{type:"Polygon",arcs:[[-6104,-2210,-223,-388,-7763,-2588]],id:"48383",properties:{name:"Reagan"}},{type:"Polygon",arcs:[[-2240,-7559,-2272,-4526,-3551,-493]],id:"40137",properties:{name:"Stephens"}},{type:"Polygon",arcs:[[-3433,8030,-6413,-2203,-2193]],id:"29179",properties:{name:"Reynolds"}},{type:"Polygon",arcs:[[-4816,-7929,-7259,8031,-3075,8032]],id:"48389",properties:{name:"Reeves"}},{type:"Polygon",arcs:[[-7416,-1808,8033,-3115,8034,-2221]],id:"08041",properties:{name:"El Paso"}},{type:"Polygon",arcs:[[8035,8036,8037,-7241,8038,-7281,8039]],id:"39167",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-7368,-1679,8040,-4518,-7372,8041]],id:"51045",properties:{name:"Craig"}},{type:"Polygon",arcs:[[-2850,8042,8043,-3445,8044,-2834,8045]],id:"01127",properties:{name:"Walker"}},{type:"Polygon",arcs:[[-7717,8046,8047,-5985,-6044,-6817,8048],[-6534]],id:"51069",properties:{name:"Frederick"}},{type:"Polygon",arcs:[[-1416,-4444,8049,8050,8051]],id:"30095",properties:{name:"Stillwater"}},{type:"Polygon",arcs:[[-2050,8052,-7506,8053,8054,-11]],id:"22117",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-5625,-1172,-3337,-6639,8055,8056,-8010]],id:"47189",properties:{name:"Wilson"}},{type:"Polygon",arcs:[[8057,-4003,-5784,8058,-3105,-7476,-7480]],id:"16035",properties:{name:"Clearwater"}},{type:"MultiPolygon",arcs:[[[8059]],[[8060,8061]],[[8062,8063,-4583,-7865,8064,8065,-7545]]],id:"22057",properties:{name:"Lafourche"}},{type:"Polygon",arcs:[[8066,-7177,8067]],id:"26047",properties:{name:"Emmet"}},{type:"Polygon",arcs:[[-6803,8068,8069,-7964,-1028,-3651]],id:"37185",properties:{name:"Warren"}},{type:"Polygon",arcs:[[-1557,-7074,8070,-3542,-7183]],id:"26115",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[-2183,8071,-2226]],id:"30047",properties:{name:"Lake"}},{type:"Polygon",arcs:[[-2227,-8072,-2182,8072,8073,-1926,-3106,-8059,-5783]],id:"30063",properties:{name:"Missoula"}},{type:"Polygon",arcs:[[-7978,-6109,8074,-6225]],id:"08047",properties:{name:"Gilpin"}},{type:"Polygon",arcs:[[-6234,-8030,-3118,-6942,-6867,-3141]],id:"08055",properties:{name:"Huerfano"}},{type:"Polygon",arcs:[[8075,8076,-6831,8077,-2326,-6798,-5609,-5363]],id:"54059",properties:{name:"Mingo"}},{type:"Polygon",arcs:[[-141,8078,-8047,-7716,-294]],id:"54065",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[-6966,-7985,-2559,8079,8080,-7679]],id:"01129",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-2035,8081,8082,8083,-3247,-1317,-1311,-6840]],id:"17173",properties:{name:"Shelby"}},{type:"Polygon",arcs:[[8084,-5595,-4211,-7129,-3339,8085]],id:"18165",properties:{name:"Vermillion"}},{type:"Polygon",arcs:[[-4775,8086,8087,-7127,-7894,8088,8089]],id:"34005",properties:{name:"Burlington"}},{type:"Polygon",arcs:[[-3151,8090,-5369,-5173,-440,-6328]],id:"27045",properties:{name:"Fillmore"}},{type:"Polygon",arcs:[[-227,8091,8092,-4544,8093,8094]],id:"48439",properties:{name:"Tarrant"}},{type:"Polygon",arcs:[[-4653,8095,8096,-5653,8097,8098,-4660]],id:"17031",properties:{name:"Cook"}},{type:"Polygon",arcs:[[-7975,-7923,8099,-4511,8100,-8024]],id:"51550",properties:{name:"Chesapeake"}},{type:"Polygon",arcs:[[-2883,8101,-6325,-5198,-1077,-1258]],id:"26155",properties:{name:"Shiawassee"}},{type:"Polygon",arcs:[[8102,8103,-444,-80,8104,-2881,-3499]],id:"26157",properties:{name:"Tuscola"}},{type:"Polygon",arcs:[[-676,8105,-6697,-6014]],id:"38011",properties:{name:"Bowman"}},{type:"Polygon",arcs:[[8106,-1711,-671,-6013,-3566]],id:"38033",properties:{name:"Golden Valley"}},{type:"Polygon",arcs:[[-4154,-2131,8107,8108,-6727,-6090,8109]],id:"55035",properties:{name:"Eau Claire"}},{type:"Polygon",arcs:[[8110,8111,8112,-3857,-1217,8113]],id:"32005",properties:{name:"Douglas"}},{type:"Polygon",arcs:[[8114,-448,8115,-4045]],id:"18009",properties:{name:"Blackford"}},{type:"Polygon",arcs:[[-3427,-2082,8116,-449,-8115,-4044]],id:"18179",properties:{name:"Wells"}},{type:"Polygon",arcs:[[8117,-1884,-5403,8118,8119]],id:"05013",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[-2384,8120,-5658,8121,8122,-150,8123]],id:"17091",properties:{name:"Kankakee"}},{type:"Polygon",arcs:[[-6954,-7039,-6262,-3879]],id:"18163",properties:{name:"Vanderburgh"}},{type:"Polygon",arcs:[[8124,-3107,-2712,-2900,8125,-2844]],id:"16003",properties:{name:"Adams"}},{type:"Polygon",arcs:[[-5963,-7947,-7394,-7396,8126]],id:"09013",properties:{name:"Tolland"}},{type:"Polygon",arcs:[[-4270,-7044,8127,-4119,8128,8129,-3887,-7526]],id:"21111",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[-8054,-7505,-6332,-7707,-417,8130,8131]],id:"28109",properties:{name:"Pearl River"}},{type:"Polygon",arcs:[[8132,8133,-8063,-7544]],id:"22093",properties:{name:"St. James"}},{type:"Polygon",arcs:[[-323,-4180,-7380,8134,-5450,8135]],id:"49013",properties:{name:"Duchesne"}},{type:"Polygon",arcs:[[-6525,-5970,8136,-3596,-2965]],id:"48209",properties:{name:"Hays"}},{type:"Polygon",arcs:[[8137,-5453,-5463,8138,8139]],id:"49023",properties:{name:"Juab"}},{type:"Polygon",arcs:[[8140,8141,8142,-6465,8143,-7965,-8070]],id:"37131",properties:{name:"Northampton"}},{type:"Polygon",arcs:[[-2626,-4731,8144,-1757,8145,-833]],id:"01041",properties:{name:"Crenshaw"}},{type:"Polygon",arcs:[[-4385,8146,8147,8148]],id:"16007",properties:{name:"Bear Lake"}},{type:"Polygon",arcs:[[-2742,8149,8150,-1636,-1835,-7951,8151]],id:"39113",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[8152,8153,8154,8155,8156,-1759]],id:"01045",properties:{name:"Dale"}},{type:"MultiPolygon",arcs:[[[8157,8158]],[[8159,8160]]],id:"06075",properties:{name:"San Francisco"}},{type:"Polygon",arcs:[[-6846,8161,8162,8163,-2046]],id:"08091",properties:{name:"Ouray"}},{type:"Polygon",arcs:[[-6994,8164,-5078,-5294,8165,8166]],id:"17153",properties:{name:"Pulaski"}},{type:"Polygon",arcs:[[8167,8168,8169,-5939,-7857,8170]],id:"05121",properties:{name:"Randolph"}},{type:"Polygon",arcs:[[-3379,-5879,-5888,-4599,-6219,-3192,8171]],id:"05145",properties:{name:"White"}},{type:"Polygon",arcs:[[8172,-636,8173,-3299,-906,-6535,-4081]],id:"39005",properties:{name:"Ashland"}},{type:"Polygon",arcs:[[-3744,-2117,8174,-7880,-6509,-4085]],id:"40101",properties:{name:"Muskogee"}},{type:"MultiPolygon",arcs:[[[8175]],[[8176]],[[-4159,-7546,-8066,8177,-8061,8178]]],id:"22109",properties:{name:"Terrebonne"}},{type:"Polygon",arcs:[[8179,-7908,-5902,-5903,8180]],id:"41041",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-445,-8104,8181]],id:"26063",properties:{name:"Huron"}},{type:"Polygon",arcs:[[8182,-1094,-7604,-6040,8183]],id:"29227",properties:{name:"Worth"}},{type:"Polygon",arcs:[[8184,8185,-6249,-6540,8186,-4878]],id:"29175",properties:{name:"Randolph"}},{type:"Polygon",arcs:[[8187]],id:"15003",properties:{name:"Honolulu"}},{type:"Polygon",arcs:[[8188,-8139,-5462,8189,-6143,-4289]],id:"49027",properties:{name:"Millard"}},{type:"Polygon",arcs:[[-8190,-5461,-5865,-5844,-5358,-6144]],id:"49041",properties:{name:"Sevier"}},{type:"Polygon",arcs:[[8190,-6770,-5356,8191,-5454,-8138,8192]],id:"49045",properties:{name:"Tooele"}},{type:"MultiPolygon",arcs:[[[8193,8194,8195,8196]],[[8197]],[[8198]],[[8199]],[[8200,8201,8202]],[[8203]],[[8204]],[[8205]],[[8206]]],id:"12087",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[8207,8208,-5898,8209,-5798,8210,8211,-4561]],id:"13033",properties:{name:"Burke"}},{type:"Polygon",arcs:[[-3855,8212,8213,-7851,8214,8215]],id:"01081",properties:{name:"Lee"}},{type:"Polygon",arcs:[[8216,-5870,-3611,8217,8218,8219,8220]],id:"48409",properties:{name:"San Patricio"}},{type:"Polygon",arcs:[[-6833,-7787,-3809,-2609]],id:"06043",properties:{name:"Mariposa"}},{type:"Polygon",arcs:[[-7356,8221,-8184,-6039,8222,8223,-5994]],id:"29147",properties:{name:"Nodaway"}},{type:"Polygon",arcs:[[-1313,-1320,-3099,-1134,-3071,-2681]],id:"17025",properties:{name:"Clay"}},{type:"MultiPolygon",arcs:[[[8224]],[[8225]],[[-50,8226,-3034,8227]]],id:"02130",properties:{name:"Ketchikan Gateway"}},{type:"Polygon",arcs:[[8228,-1384,8229,-1985]],id:"02282",properties:{name:"Yakutat"}},{type:"Polygon",arcs:[[-2081,-1833,8230,-450,-8117]],id:"18001",properties:{name:"Adams"}},{type:"Polygon",arcs:[[8231,-1155,-5093,8232,8233]],id:"08017",properties:{name:"Cheyenne"}},{type:"Polygon",arcs:[[-6272,8234,-4847,8235,-5738]],id:"47173",properties:{name:"Union"}},{type:"Polygon",arcs:[[-152,8236,-2863,8237,-8086,-3338,8238]],id:"17183",properties:{name:"Vermilion"}},{type:"Polygon",arcs:[[8239,8240]],id:"53009",properties:{name:"Clallam"}},{type:"Polygon",arcs:[[8241,8242,8243,-7708,-6824,8244]],id:"53027",properties:{name:"Grays Harbor"}},{type:"Polygon",arcs:[[8245,8246,-2359,8247,-7611]],id:"12109",properties:{name:"St. Johns"}},{type:"Polygon",arcs:[[-8240,8248,8249,-8242,8250]],id:"53031",properties:{name:"Jefferson"}},{type:"MultiPolygon",arcs:[[[-7633,8251]]],id:"06041",properties:{name:"Marin"}},{type:"Polygon",arcs:[[-6812,-8001,-4955,8252,-6787,8253,8254,8255]],id:"51053",properties:{name:"Dinwiddie"}},{type:"Polygon",arcs:[[-4568,-1197,8256,-5057]],id:"17129",properties:{name:"Menard"}},{type:"Polygon",arcs:[[-4178,-5781,8257,-6989,-7455,-7381]],id:"08081",properties:{name:"Moffat"}},{type:"Polygon",arcs:[[-7006,8258,-8148,-5138,-3875]],id:"16041",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-6292,-7721,8259,-7877,8260,-3814]],id:"06101",properties:{name:"Sutter"}},{type:"Polygon",arcs:[[-7407,-7888,-6161,-7937,-6655,-797,-4142]],id:"39081",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[-7212,-159,8261,-6688,8262]],id:"35009",properties:{name:"Curry"}},{type:"Polygon",arcs:[[-2736,8263,-5121,8264,8265]],id:"36021",properties:{name:"Columbia"}},{type:"Polygon",arcs:[[-7228,8266,-2317,-3055,-7332,-6335]],id:"28083",properties:{name:"Leflore"}},{type:"Polygon",arcs:[[-7942,-7494,8267,-3822,8268,-2026]],id:"13291",properties:{name:"Union"}},{type:"Polygon",arcs:[[8269,-6663,8270,8271,-5212,8272]],id:"39001",properties:{name:"Adams"}},{type:"Polygon",arcs:[[-4297,-7896,8273]],id:"34009",properties:{name:"Cape May"}},{type:"Polygon",arcs:[[-4293,-8,-1933,-4831,8274]],id:"32003",properties:{name:"Clark"}},{type:"Polygon",arcs:[[-7391,8275,8276,8277,-7912,-6390]],id:"20103",properties:{name:"Leavenworth"}},{type:"Polygon",arcs:[[-3229,-5133,-7998,-6810]],id:"51145",properties:{name:"Powhatan"}},{type:"Polygon",arcs:[[-3981,8278,8279,8280,8281,-1054,-3631]],id:"53043",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[8282,8283,-597,8284,8285,-8243,-8250]],id:"53045",properties:{name:"Mason"}},{type:"MultiPolygon",arcs:[[[8286]],[[8287]],[[8288]],[[8289]]],id:"53055",properties:{name:"San Juan"}},{type:"Polygon",arcs:[[8290,-3091,8291,8292,8293]],id:"17133",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[-1723,8294,8295,8296,-6843,8297]],id:"08097",properties:{name:"Pitkin"}},{type:"Polygon",arcs:[[8298,-7830,-931,8299,-530]],id:"06035",properties:{name:"Lassen"}},{type:"Polygon",arcs:[[-3400,-2772,-2091,-2057,-253]],id:"19101",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[8300,-5094,-2762,-6940,-3198,8301]],id:"08099",properties:{name:"Prowers"}},{type:"Polygon",arcs:[[-689,-4004,-8058,-7479,8302]],id:"16057",properties:{name:"Latah"}},{type:"Polygon",arcs:[[-2368,8303,8304,-6236,8305]],id:"12097",properties:{name:"Osceola"}},{type:"Polygon",arcs:[[8306,8307,8308,-812,8309,-310]],id:"27171",properties:{name:"Wright"}},{type:"Polygon",arcs:[[-6364,-2488,8310,8311,-7805,8312,-183]],id:"13293",properties:{name:"Upson"}},{type:"Polygon",arcs:[[8313,8314,-7124,8315,8316]],id:"31049",properties:{name:"Deuel"}},{type:"Polygon",arcs:[[8317,-896,-646,-155,-7211]],id:"48359",properties:{name:"Oldham"}},{type:"Polygon",arcs:[[8318,-1749,8319,-1698,-3672,-5586]],id:"13297",properties:{name:"Walton"}},{type:"Polygon",arcs:[[-6376,-6101,8320,8321,8322,-6906]],id:"13303",properties:{name:"Washington"}},{type:"Polygon",arcs:[[8323,-7152,8324,8325,8326]],id:"34013",properties:{name:"Essex"}},{type:"Polygon",arcs:[[8327,8328,8329,-4606,8330,8331,-5032]],id:"13305",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[8332,-6946,-4936,-3092,-8291,8333,-3711]],id:"29189",properties:{name:"St. Louis"}},{type:"Polygon",arcs:[[-7252,-14,8334,8335,-4637]],id:"22063",properties:{name:"Livingston"}},{type:"Polygon",arcs:[[-3216,-5038,-4732,-2624,-6360]],id:"01001",properties:{name:"Autauga"}},{type:"Polygon",arcs:[[-7785,-7854,8336,8337,8338,8339,-8154,8340]],id:"01005",properties:{name:"Barbour"}},{type:"MultiPolygon",arcs:[[[8341]],[[-8080,-2558,8342,8343,8344,8345]]],id:"01097",properties:{name:"Mobile"}},{type:"Polygon",arcs:[[8346,-1667,8347,-8280,8348]],id:"53065",properties:{name:"Stevens"}},{type:"MultiPolygon",arcs:[[[8349]],[[-3984,-6008,8350]],[[8351]]],id:"53073",properties:{name:"Whatcom"}},{type:"Polygon",arcs:[[-1670,8352,-3267,-3049,8353,8354,8355]],id:"13019",properties:{name:"Berrien"}},{type:"Polygon",arcs:[[8356,-4383,-5782,-320]],id:"56041",properties:{name:"Uinta"}},{type:"Polygon",arcs:[[8357,-8254,-6790,8358,-8142],[-1163]],id:"51081",properties:{name:"Greensville"}},{type:"Polygon",arcs:[[-8032,-7258,-4811,-7766,8359,-5633,-3076]],id:"48371",properties:{name:"Pecos"}},{type:"Polygon",arcs:[[-3549,-6957,8360,8361,-2792,-5169,-7354]],id:"17161",properties:{name:"Rock Island"}},{type:"Polygon",arcs:[[-1159,-2743,-8152,-7950,8362]],id:"39135",properties:{name:"Preble"}},{type:"Polygon",arcs:[[8363,-1034,8364,-758,8365,-1829]],id:"39137",properties:{name:"Putnam"}},{type:"Polygon",arcs:[[8366,-8163,8367,8368,-5040]],id:"08111",properties:{name:"San Juan"}},{type:"Polygon",arcs:[[-2779,8369,-1841,8370]],id:"48385",properties:{name:"Real"}},{type:"Polygon",arcs:[[-2181,-1917,-5377,-5851,8371,-8073]],id:"30077",properties:{name:"Powell"}},{type:"Polygon",arcs:[[8372,8373,8374,8375,-4374,8376]],id:"13309",properties:{name:"Wheeler"}},{type:"Polygon",arcs:[[-2936,-5588,8377,-6928,-1935]],id:"06065",properties:{name:"Riverside"}},{type:"Polygon",arcs:[[-7094,-1591,-469,8378,8379]],id:"40115",properties:{name:"Ottawa"}},{type:"Polygon",arcs:[[-3511,8380,8381,-998]],id:"26001",properties:{name:"Alcona"}},{type:"Polygon",arcs:[[8382,-5639,-782,8383,8384,-1438]],id:"56043",properties:{name:"Washakie"}},{type:"Polygon",arcs:[[8385,-4804,-7672,-4793,-4545,-8093]],id:"48113",properties:{name:"Dallas"}},{type:"Polygon",arcs:[[-852,-2084,-3426,-2039,-5748]],id:"18183",properties:{name:"Whitley"}},{type:"Polygon",arcs:[[-5196,-5178,-7194,8386,-7117,-4354]],id:"47047",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[-4659,-7485,-6178,8387,-7909,-2072,-3246]],id:"20141",properties:{name:"Osborne"}},{type:"Polygon",arcs:[[8388,-5972,-5064,-4708,-3492,-5116,8389]],id:"50003",properties:{name:"Bennington"}},{type:"Polygon",arcs:[[-3982,-3629,-2363,-2356]],id:"53017",properties:{name:"Douglas"}},{type:"MultiPolygon",arcs:[[[-3605,8390,8391,8392]],[[-8219,8393,8394,8395]]],id:"48355",properties:{name:"Nueces"}},{type:"Polygon",arcs:[[8396,8397,8398,-2438,-4883]],id:"50019",properties:{name:"Orleans"}},{type:"Polygon",arcs:[[-5184,-6218,8399,-7220,-3640,-525,-5187]],id:"54023",properties:{name:"Grant"}},{type:"Polygon",arcs:[[8400,-5721,8401,8402,-1939]],id:"13073",properties:{name:"Columbia"}},{type:"Polygon",arcs:[[-2720,8403,-5492,-4401,8404,-4134,-5132]],id:"51085",properties:{name:"Hanover"}},{type:"Polygon",arcs:[[-4322,-7936,-5551,-7638,8405,-2243,-7761,8406]],id:"48387",properties:{name:"Red River"}},{type:"Polygon",arcs:[[8407,-2003,-3405,8408,8409,8410,-6661]],id:"39141",properties:{name:"Ross"}},{type:"Polygon",arcs:[[-60,8411,-8373,8412,8413,-2371]],id:"13091",properties:{name:"Dodge"}},{type:"Polygon",arcs:[[-6085,8414,8415,-1750,-8319,-5585,-3817]],id:"13135",properties:{name:"Gwinnett"}},{type:"Polygon",arcs:[[-6239,-2028,8416,8417,8418,-6026,-6371]],id:"13085",properties:{name:"Dawson"}},{type:"Polygon",arcs:[[8419,-3454,8420,-7481,-3108,-8125,-2843,8421,8422]],id:"41063",properties:{name:"Wallowa"}},{type:"Polygon",arcs:[[-8322,8423,-4567,8424,8425]],id:"13167",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[-6100,8426,-1941,8427,-8208,-4560,-8424,-8321]],id:"13163",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[8428,8429,8430,-1631,-8151]],id:"39023",properties:{name:"Clark"}},{type:"Polygon",arcs:[[8431,8432,8433,8434,8435,-3573,-4233,8436]],id:"29069",properties:{name:"Dunklin"}},{type:"Polygon",arcs:[[8437,-8022,8438,-7434,-7693]],id:"36019",properties:{name:"Clinton"}},{type:"Polygon",arcs:[[-7367,-7441,8439,8440,-4553,8441,-1681],[-2987],[-1226]],id:"51163",properties:{name:"Rockbridge"}},{type:"Polygon",arcs:[[-5648,8442,-7840,8443]],id:"42099",properties:{name:"Perry"}},{type:"Polygon",arcs:[[8444,8445,-8433,8446,-8169]],id:"05021",properties:{name:"Clay"}},{type:"Polygon",arcs:[[-139,-3583,-5982,8447]],id:"54037",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[8448,8449,8450,-2178]],id:"30035",properties:{name:"Glacier"}},{type:"Polygon",arcs:[[-8021,-4884,-2441,8451,8452,-7435,-8439]],id:"50007",properties:{name:"Chittenden"}},{type:"Polygon",arcs:[[8453,-2819,-4571,-4758,-5890]],id:"19167",properties:{name:"Sioux"}},{type:"Polygon",arcs:[[-679,-374,-2233,-1654,-6642,-4807]],id:"48083",properties:{name:"Coleman"}},{type:"Polygon",arcs:[[-2459,8454,-1053,-7404,-6759,8455,-7690]],id:"48401",properties:{name:"Rusk"}},{type:"Polygon",arcs:[[8456,8457,8458,8459,-5206,-8272]],id:"39145",properties:{name:"Scioto"}},{type:"MultiPolygon",arcs:[[[8460,-1379]],[[8461,-1373,8462,-1377,8463,-1946]]],id:"02110",properties:{name:"Juneau"}},{type:"Polygon",arcs:[[8464,8465,-7233,-7025,-3665]],id:"05077",properties:{name:"Lee"}},{type:"Polygon",arcs:[[-4601,-571,8466,-8465,-3664]],id:"05123",properties:{name:"St. Francis"}},{type:"Polygon",arcs:[[-5375,8467,-7773,-1449]],id:"55079",properties:{name:"Milwaukee"}},{type:"Polygon",arcs:[[-8108,-2130,-2451,8468,8469,-7800,8470]],id:"55053",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-4361,-6424,-7219,8471,-8087,-4774]],id:"34021",properties:{name:"Mercer"}},{type:"Polygon",arcs:[[8472,-6809,-6496,-7162,-4533]],id:"37009",properties:{name:"Ashe"}},{type:"Polygon",arcs:[[8473,-2023,-6481,8474,-957]],id:"27167",properties:{name:"Wilkin"}},{type:"Polygon",arcs:[[-2111,-3277,-303,8475,8476,8477]],id:"38051",properties:{name:"McIntosh"}},{type:"Polygon",arcs:[[-8452,-2440,8478,8479,8480]],id:"50023",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-7535,-7943,-3464,8481,8482,-1010,-1602]],id:"31173",properties:{name:"Thurston"}},{type:"Polygon",arcs:[[-6576,8483,8484,-7832]],id:"32027",properties:{name:"Pershing"}},{type:"Polygon",arcs:[[8485,-8480,8486,8487,-5061]],id:"50017",properties:{name:"Orange"}},{type:"MultiPolygon",arcs:[[[8488]],[[8489]],[[-6836,8490]]],id:"55029",properties:{name:"Door"}},{type:"Polygon",arcs:[[-531,-8300,-930,-7719,-6290,-2100]],id:"06063",properties:{name:"Plumas"}},{type:"Polygon",arcs:[[-6666,-3069,-4083,-87,8491,-754]],id:"39147",properties:{name:"Seneca"}},{type:"Polygon",arcs:[[-5300,-4696,8492,-6934,8493,8494]],id:"13103",properties:{name:"Effingham"}},{type:"Polygon",arcs:[[8495,-5584,8496,8497,8498,-5318,-2471]],id:"31161",properties:{name:"Sheridan"}},{type:"Polygon",arcs:[[-559,-233,-99,-100,-1364,8499]],id:"46087",properties:{name:"McCook"}},{type:"Polygon",arcs:[[8500,-173,8501,8502,8503,-2617,-4150]],id:"55083",properties:{name:"Oconto"}},{type:"Polygon",arcs:[[-2299,-6098,-2671,8504]],id:"02068",properties:{name:"Denali"}},{type:"Polygon",arcs:[[-7151,-4304,8505,8506,8507,-8325]],id:"34017",properties:{name:"Hudson"}},{type:"Polygon",arcs:[[-1440,8508,-8384,-786,8509,-5779,-5136,-6105]],id:"56013",properties:{name:"Fremont"}},{type:"Polygon",arcs:[[8510,-2637,-3578,-5226,-6247,-8186]],id:"29137",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[8511,-2498,8512,-3401,-2001]],id:"39045",properties:{name:"Fairfield"}},{type:"Polygon",arcs:[[-7890,-4947,8513,8514,-7627,-5274]],id:"05027",properties:{name:"Columbia"}},{type:"Polygon",arcs:[[8515,8516,-4261,-3936,-7683]],id:"55065",properties:{name:"Lafayette"}},{type:"Polygon",arcs:[[-4308,8517,8518]],id:"36047",properties:{name:"Kings"}},{type:"Polygon",arcs:[[-1922,-1481,-7463,-4898,-5881,-2155]],id:"29141",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[-6032,8519,-826,-7164,-5127,-7098]],id:"27151",properties:{name:"Swift"}},{type:"Polygon",arcs:[[8520,-5915,-5507,-5820,8521,-5822,8522,-3569,-8436]],id:"29143",properties:{name:"New Madrid"}},{type:"Polygon",arcs:[[-7540,-3017,-935,-4259,-8517,8523]],id:"55045",properties:{name:"Green"}},{type:"Polygon",arcs:[[-8484,-6575,8524,-5388,8525,8526]],id:"32015",properties:{name:"Lander"}},{type:"Polygon",arcs:[[8527,-7835]],id:"32029",properties:{name:"Storey"}},{type:"Polygon",arcs:[[-7175,-6550,-2801,-4451,-4713]],id:"35001",properties:{name:"Bernalillo"}},{type:"Polygon",arcs:[[-3048,-7113,-6850,8528,-8354]],id:"13173",properties:{name:"Lanier"}},{type:"Polygon",arcs:[[-5553,-40,-4748,-4351,-7138,-1420,8529]],id:"56045",properties:{name:"Weston"}},{type:"Polygon",arcs:[[8530,-6426,-2786,8531,8532,8533]],id:"36009",properties:{name:"Cattaraugus"}},{type:"Polygon",arcs:[[-2556,-1061,-1812,-1819,8534]],id:"19049",properties:{name:"Dallas"}},{type:"Polygon",arcs:[[-7765,8535,8536,-5634,-8360]],id:"48443",properties:{name:"Terrell"}},{type:"Polygon",arcs:[[8537,-7497,-6298,-1846,8538]],id:"13119",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-5713,-539,8539,-6992,8540]],id:"17199",properties:{name:"Williamson"}},{type:"Polygon",arcs:[[-1866,8541,-7465,-5676,8542,-2005]],id:"39155",properties:{name:"Trumbull"}},{type:"Polygon",arcs:[[-1115,-1753,8543,8544,-1802,8545]],id:"17203",properties:{name:"Woodford"}},{type:"Polygon",arcs:[[-8369,8546,-578,-5873,-3866]],id:"08067",properties:{name:"La Plata"}},{type:"Polygon",arcs:[[-3297,-7903,-4143,-795,-1852,8547]],id:"39157",properties:{name:"Tuscarawas"}},{type:"Polygon",arcs:[[-5042,-2141,-2750,-2031,-21,-6205,-4145,-5885]],id:"27089",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[-1715,-1691,-7618,-7536,-5528,8548]],id:"27115",properties:{name:"Pine"}},{type:"Polygon",arcs:[[-4946,8549,8550,-8120,8551,-8514]],id:"05103",properties:{name:"Ouachita"}},{type:"Polygon",arcs:[[8552,8553,-632,-8173,-4080,8554]],id:"39093",properties:{name:"Lorain"}},{type:"Polygon",arcs:[[8555,-6357,8556,-6134,8557,-4843]],id:"37021",properties:{name:"Buncombe"}},{type:"Polygon",arcs:[[-5941,8558,-8437,-4240,-3802,-5887]],id:"05031",properties:{name:"Craighead"}},{type:"Polygon",arcs:[[-5695,-4067,8559,-7925,-4813,-4663]],id:"35005",properties:{name:"Chaves"}},{type:"Polygon",arcs:[[-2423,-2473,-5321,8560,-5558,-7139]],id:"31165",properties:{name:"Sioux"}},{type:"Polygon",arcs:[[-7778,8561,-1885,-8118,-8551,8562]],id:"05039",properties:{name:"Dallas"}},{type:"Polygon",arcs:[[8563,-4010,8564,-4841,-3731,-6136,8565]],id:"37023",properties:{name:"Burke"}},{type:"Polygon",arcs:[[-6356,-4508,8566,-8566,-6135,-8557]],id:"37111",properties:{name:"McDowell"}},{type:"Polygon",arcs:[[-7349,-5408,-5647,-6675]],id:"42109",properties:{name:"Snyder"}},{type:"Polygon",arcs:[[-8413,-8377,-4373,-3263,-3382,8567]],id:"13271",properties:{name:"Telfair"}},{type:"Polygon",arcs:[[8568,-725,-6948,8569]],id:"12115",properties:{name:"Sarasota"}},{type:"Polygon",arcs:[[-6300,-4346,-5828,-5723,8570,8571,8572,-1848]],id:"13105",properties:{name:"Elbert"}},{type:"Polygon",arcs:[[8573,-8355,-8529,-6854,8574,-7328,8575]],id:"13185",properties:{name:"Lowndes"}},{type:"Polygon",arcs:[[-184,-8313,-7804,8576,-3407,8577,8578]],id:"13263",properties:{name:"Talbot"}},{type:"Polygon",arcs:[[-6621,-4470,8579,-7961,-6073]],id:"37047",properties:{name:"Columbus"}},{type:"Polygon",arcs:[[-537,-5717,-4109,-5805,-5285,-7170]],id:"17069",properties:{name:"Hardin"}},{type:"Polygon",arcs:[[-8418,8580,-3825,8581,8582,8583,-8416,8584]],id:"13139",properties:{name:"Hall"}},{type:"Polygon",arcs:[[8585,-5264,-6399,-4325,-3575,8586]],id:"17001",properties:{name:"Adams"}},{type:"Polygon",arcs:[[8587,8588,-2067,8589,-62,-2370,-1887,-7625]],id:"13153",properties:{name:"Houston"}},{type:"Polygon",arcs:[[8590,-5047,-4025,8591]],id:"48457",properties:{name:"Tyler"}},{type:"Polygon",arcs:[[-5988,-7060,-7376,-5150,-7107,-1695]],id:"12041",properties:{name:"Gilchrist"}},{type:"Polygon",arcs:[[-814,8592,8593,-1872,-3009,-3081]],id:"27139",properties:{name:"Scott"}},{type:"Polygon",arcs:[[-3053,-2954,8594,-3127,-2798,-7314,-7333]],id:"28007",properties:{name:"Attala"}},{type:"Polygon",arcs:[[-8411,8595,-8457,-8271,-6662]],id:"39131",properties:{name:"Pike"}},{type:"Polygon",arcs:[[-6683,-2123,-6755,-3042,-5858]],id:"46095",properties:{name:"Mellette"}},{type:"Polygon",arcs:[[8596,8597,-8534,8598,-4679]],id:"36013",properties:{name:"Chautauqua"}},{type:"Polygon",arcs:[[-7813,-7748,8599,8600,8601,-5488,-8404,-2719]],id:"51177",properties:{name:"Spotsylvania"}},{type:"Polygon",arcs:[[-2205,-6417,8602,-8171,-7856,-4243,-7874]],id:"29149",properties:{name:"Oregon"}},{type:"Polygon",arcs:[[-7218,8603,-7128,-8088,-8472]],id:"34025",properties:{name:"Monmouth"}},{type:"Polygon",arcs:[[-8459,8604,-3795,-6285,8605,-5823,8606]],id:"39087",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[-4285,8607,-4917,8608,-1605,-3925,-5280]],id:"26103",properties:{name:"Marquette"}},{type:"Polygon",arcs:[[8609,-5033,-8332,8610,-6243]],id:"13229",properties:{name:"Pierce"}},{type:"MultiPolygon",arcs:[[[8611]],[[8612]]],id:"15007",properties:{name:"Kauai"}},{type:"Polygon",arcs:[[-3023,-4888,-4856,8613,-8015,-5838,-3345,-6439]],id:"42033",properties:{name:"Clearfield"}},{type:"Polygon",arcs:[[-2749,-7093,-7202,-2126,-25,-2033]],id:"27029",properties:{name:"Clearwater"}},{type:"Polygon",arcs:[[8614,-3383,-3261,-8353,-1669]],id:"13155",properties:{name:"Irwin"}},{type:"Polygon",arcs:[[8615,-1718,-6186,8616]],id:"27035",properties:{name:"Crow Wing"}},{type:"Polygon",arcs:[[-267,-4903,-4909,8617,-7531,-4440,-3412,-2426]],id:"30087",properties:{name:"Rosebud"}},{type:"Polygon",arcs:[[-635,-1824,-7901,-3295,-8174]],id:"39169",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[-581,-4605,8618,8619,-6981]],id:"12051",properties:{name:"Hendry"}},{type:"Polygon",arcs:[[-8571,-5722,-8401,-1938,8620]],id:"13181",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-4275,8621,-8329,8622]],id:"13183",properties:{name:"Long"}},{type:"Polygon",arcs:[[-6961,-2648,8623,-4434,-5867,-1610]],id:"48469",properties:{name:"Victoria"}},{type:"Polygon",arcs:[[-1837,8624,8625,-6881,8626,-7049,8627]],id:"39025",properties:{name:"Clermont"}},{type:"Polygon",arcs:[[-959,8628,-7099,-5469,8629,-712]],id:"46109",properties:{name:"Roberts"}},{type:"Polygon",arcs:[[-4752,-5859,-317,-5580,-8496,-2470,-2421,-4349]],id:"46102",properties:{name:"Oglala Lakota"}},{type:"Polygon",arcs:[[-6604,8630,-3255,-3796,-7447,-7451]],id:"54067",properties:{name:"Nicholas"}},{type:"Polygon",arcs:[[-5398,-7351,-944,8631,8632]],id:"33017",properties:{name:"Strafford"}},{type:"Polygon",arcs:[[-3300,-2162,-3380,-8172,-3196,-3187,-6368]],id:"05045",properties:{name:"Faulkner"}},{type:"Polygon",arcs:[[8633,-8293,8634,-7084,8635]],id:"29186",properties:{name:"Ste. Genevieve"}},{type:"Polygon",arcs:[[-5931,-3470,-3558,-6913,-2395]],id:"31153",properties:{name:"Sarpy"}},{type:"Polygon",arcs:[[-7811,8636,8637,-1460,-5489,-8602,8638,-8600,-7747]],id:"51179",properties:{name:"Stafford"}},{type:"Polygon",arcs:[[8639,-5697,-4078,-6708,-3145,-673,-1710]],id:"38089",properties:{name:"Stark"}},{type:"Polygon",arcs:[[-5601,8640,8641,8642,8643,8644,8645]],id:"47051",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-459,-2056,-5067,-6259,8646]],id:"38101",properties:{name:"Ward"}},{type:"Polygon",arcs:[[8647,-641,8648,-7658,8649,-8642]],id:"47115",properties:{name:"Marion"}},{type:"Polygon",arcs:[[8650,-7377,-5501,-5479,-7336,-1873,-8594]],id:"27037",properties:{name:"Dakota"}},{type:"Polygon",arcs:[[-4046,-8116,-454,8651,-2927,-6383]],id:"18035",properties:{name:"Delaware"}},{type:"Polygon",arcs:[[-7196,-2767,-1713,8652,-2746]],id:"27061",properties:{name:"Itasca"}},{type:"Polygon",arcs:[[-8382,8653,-3093,-744]],id:"26069",properties:{name:"Iosco"}},{type:"Polygon",arcs:[[-3280,8654,8655,-6318,8656]],id:"20159",properties:{name:"Rice"}},{type:"Polygon",arcs:[[8657,-7188,-5664,8658,-8277]],id:"20209",properties:{name:"Wyandotte"}},{type:"Polygon",arcs:[[8659,-5349,-522,-893,-2614,-3599,8660]],id:"48479",properties:{name:"Webb"}},{type:"Polygon",arcs:[[-8018,8661,-6648,-5918,8662,8663]],id:"48481",properties:{name:"Wharton"}},{type:"Polygon",arcs:[[-2487,-2446,8664,-844,-2065,8665,-8311]],id:"13207",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[-1748,-609,8666,-6153,-1699,-8320]],id:"13219",properties:{name:"Oconee"}},{type:"Polygon",arcs:[[-7619,8667,-8588,-7624,-7803]],id:"13225",properties:{name:"Peach"}},{type:"Polygon",arcs:[[8668,8669,8670,-8338]],id:"13239",properties:{name:"Quitman"}},{type:"Polygon",arcs:[[-3298,-8548,-1851,8671,-2495,-908]],id:"39031",properties:{name:"Coshocton"}},{type:"Polygon",arcs:[[-8670,8672,-6380,8673,-1778,8674]],id:"13243",properties:{name:"Randolph"}},{type:"Polygon",arcs:[[8675,-7454,8676,-6287,8677]],id:"54079",properties:{name:"Putnam"}},{type:"Polygon",arcs:[[-6830,-7445,8678,-4717,-2327,-8078]],id:"54109",properties:{name:"Wyoming"}},{type:"Polygon",arcs:[[-6610,-4702,8679,8680,-6141,-7174]],id:"34037",properties:{name:"Sussex"}},{type:"Polygon",arcs:[[8681,-3449,-7906,-3212,-6094,-7989]],id:"01007",properties:{name:"Bibb"}},{type:"Polygon",arcs:[[8682,-6059,-4739,8683,8684,-6188]],id:"28057",properties:{name:"Itawamba"}},{type:"Polygon",arcs:[[-7275,8685,-8587,-3574,-2635,8686]],id:"29111",properties:{name:"Lewis"}},{type:"Polygon",arcs:[[-5063,8687,8688,8689,8690,-4706]],id:"33019",properties:{name:"Sullivan"}},{type:"Polygon",arcs:[[-2078,-3110,-1585,8691,8692,8693,-2053]],id:"38069",properties:{name:"Pierce"}},{type:"Polygon",arcs:[[8694,8695,-3561,8696,-8518,-4307]],id:"36081",properties:{name:"Queens"}},{type:"Polygon",arcs:[[-7715,-1227,-7714,-6002,-3424,-2527,8697,-772]],id:"37033",properties:{name:"Caswell"}},{type:"Polygon",arcs:[[8698,-5194,-5283,-3513]],id:"26131",properties:{name:"Ontonagon"}},{type:"Polygon",arcs:[[-4638,-8336,8699,-8133,-7543,8700]],id:"22005",properties:{name:"Ascension"}},{type:"Polygon",arcs:[[8701,-6238,-579,-723,-1826]],id:"12055",properties:{name:"Highlands"}},{type:"Polygon",arcs:[[-6139,-4505,-1015,-3773,-8558]],id:"37089",properties:{name:"Henderson"}},{type:"Polygon",arcs:[[-1098,-3167,-1241,-1124,-2674,-3468]],id:"19029",properties:{name:"Cass"}},{type:"Polygon",arcs:[[-8431,8702,-6437,8703,-1999,8704,-1632]],id:"39097",properties:{name:"Madison"}},{type:"Polygon",arcs:[[8705,8706,-3056,-6237,-8305]],id:"12061",properties:{name:"Indian River"}},{type:"Polygon",arcs:[[8707,-7503,-7592,-4821,-4252,8708]],id:"05131",properties:{name:"Sebastian"}},{type:"Polygon",arcs:[[-8123,8709,-2857,-8237,-151]],id:"17075",properties:{name:"Iroquois"}},{type:"Polygon",arcs:[[-7853,-3409,8710,-6381,-8673,-8669,-8337]],id:"13259",properties:{name:"Stewart"}},{type:"Polygon",arcs:[[8711,8712,-1868,-1821,-633,-8554]],id:"39035",properties:{name:"Cuyahoga"}},{type:"Polygon",arcs:[[-3673,-1702,8713,-838,-8665,-2445]],id:"13159",properties:{name:"Jasper"}},{type:"Polygon",arcs:[[-6027,-8419,-8585,-8415,-6084]],id:"13117",properties:{name:"Forsyth"}},{type:"Polygon",arcs:[[8714,8715,-5317,-7899,8716,-6573,8717]],id:"16073",properties:{name:"Owyhee"}},{type:"Polygon",arcs:[[8718,8719,-3811,-7788,-176,8720,8721]],id:"06085",properties:{name:"Santa Clara"}},{type:"Polygon",arcs:[[8722,-4643,-7461,8723,-3703,8724,-6321]],id:"22079",properties:{name:"Rapides"}},{type:"Polygon",arcs:[[-83,-6189,-8685,8725,-7990,8726,8727]],id:"28095",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[8728,-4776,-8090,8729,8730,-6207]],id:"42101",properties:{name:"Philadelphia"}},{type:"Polygon",arcs:[[8731,-8632,-943,8732,-7290,8733]],id:"33015",properties:{name:"Rockingham"}},{type:"Polygon",arcs:[[8734,8735,-8390,-5115,-8264,-6082]],id:"36083",properties:{name:"Rensselaer"}},{type:"Polygon",arcs:[[-4840,8736,-4688,-3733]],id:"37071",properties:{name:"Gaston"}},{type:"Polygon",arcs:[[8737,-6411,8738,-5916,-8521,-8435,8739]],id:"29207",properties:{name:"Stoddard"}},{type:"Polygon",arcs:[[-8498,8740,-879,8741,-8314,8742,8743]],id:"31069",properties:{name:"Garden"}},{type:"Polygon",arcs:[[-4730,-7786,-8341,-8153,-1758,-8145]],id:"01109",properties:{name:"Pike"}},{type:"Polygon",arcs:[[-4680,-8599,-8533,8744,-4886,-4991,-1620,-7464]],id:"42123",properties:{name:"Warren"}},{type:"Polygon",arcs:[[-1269,-2410,-7096,8745,-4787,8746]],id:"20099",properties:{name:"Labette"}},{type:"Polygon",arcs:[[-1820,-489,-5685,-5102,-1110]],id:"19039",properties:{name:"Clarke"}},{type:"Polygon",arcs:[[8747,-8379,-468,-4040,-7489,-2114,8748]],id:"40041",properties:{name:"Delaware"}},{type:"Polygon",arcs:[[8749,-7116,-5092,-2981,-1515,8750]],id:"18141",properties:{name:"St. Joseph"}},{type:"Polygon",arcs:[[8751,-6898,-6598]],id:"37177",properties:{name:"Tyrrell"}},{type:"Polygon",arcs:[[-6845,-6235,-4559,-573,-8547,-8368,-8162]],id:"08053",properties:{name:"Hinsdale"}},{type:"MultiPolygon",arcs:[[[-8392,8752,-6273,8753]],[[-8395,8754,-6277,-119,8755]]],id:"48273",properties:{name:"Kleberg"}},{type:"Polygon",arcs:[[-3439,-7245,8756,-6628,8757,-1229,8758,8759]],id:"51035",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[-2846,8760,-7105,8761,-8718,-6572,-4169,-1995]],id:"41045",properties:{name:"Malheur"}},{type:"Polygon",arcs:[[8762,8763,-4632,8764,8765]],id:"24009",properties:{name:"Calvert"}},{type:"Polygon",arcs:[[-4920,-5365,-5608,-4927,-5351]],id:"21071",properties:{name:"Floyd"}},{type:"Polygon",arcs:[[-6526,-6472,-3978,8766,8767,-6650,8768,8769]],id:"48201",properties:{name:"Harris"}},{type:"Polygon",arcs:[[-7791,-2168,-4368,8770]],id:"51700",properties:{name:"Newport News"}},{type:"Polygon",arcs:[[-8505,-2670,-1982,8771,8772,8773,-4740,-2300]],id:"02170",properties:{name:"Matanuska-Susitna"}},{type:"Polygon",arcs:[[-4392,-4950,-4943,-7889,8774,-3179]],id:"05057",properties:{name:"Hempstead"}},{type:"Polygon",arcs:[[-7076,-7119,-6191,8775,-7231]],id:"28137",properties:{name:"Tate"}},{type:"Polygon",arcs:[[8776,-8507,8777,-7216]],id:"36085",properties:{name:"Richmond"}},{type:"Polygon",arcs:[[-2054,-8694,8778,8779,8780,-5068]],id:"38083",properties:{name:"Sheridan"}},{type:"Polygon",arcs:[[8781,-2737,-8266,8782,-4697,-7839]],id:"36111",properties:{name:"Ulster"}},{type:"Polygon",arcs:[[-2828,-1253,-4461,-5771,8783]],id:"37059",properties:{name:"Davie"}},{type:"Polygon",arcs:[[-476,8784,-6694,-6776,-4794,-244]],id:"48197",properties:{name:"Hardeman"}},{type:"Polygon",arcs:[[-5794,-7350,-3765,-2125,-6682,8785]],id:"46117",properties:{name:"Stanley"}},{type:"Polygon",arcs:[[8786,-2324,8787,-1529,-1638,-7603]],id:"29079",properties:{name:"Grundy"}},{type:"Polygon",arcs:[[-6436,-1862,-2499,-8512,-2e3,-8704]],id:"39049",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-7720,-2468,-7837,8788,-8114,-1220,-7878,-8260]],id:"06061",properties:{name:"Placer"}},{type:"Polygon",arcs:[[-8278,-8659,-5668,-8005,-3897,-7913]],id:"20091",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[-5119,-5965,8789,-7037,-7871,8790]],id:"09005",properties:{name:"Litchfield"}},{type:"Polygon",arcs:[[-1760,-8157,8791,8792,8793,-2731,8794]],id:"01061",properties:{name:"Geneva"}},{type:"Polygon",arcs:[[8795,-7019,-7668,8796,-8792,-8156]],id:"01069",properties:{name:"Houston"}},{type:"Polygon",arcs:[[-6147,8797,8798,-8759,-1230,-8758,-6627,-6808,-8473,-4532]],id:"51077",properties:{name:"Grayson"}},{type:"Polygon",arcs:[[-979,-2815,-5029,-3165,-1156,-8232,8799]],id:"08063",properties:{name:"Kit Carson"}},{type:"Polygon",arcs:[[-3463,-3155,-7204,8800,-8482]],id:"19133",properties:{name:"Monona"}},{type:"Polygon",arcs:[[-8002,-5514,-6324,8801,-5342,-3614,-5046]],id:"48351",properties:{name:"Newton"}},{type:"Polygon",arcs:[[8802,8803,8804,-6374,-6155]],id:"13265",properties:{name:"Taliaferro"}},{type:"Polygon",arcs:[[-502,-1871,-6690,-8785,-475,8805]],id:"40057",properties:{name:"Harmon"}},{type:"Polygon",arcs:[[-4548,8806,8807,-912,-4130]],id:"48349",properties:{name:"Navarro"}},{type:"Polygon",arcs:[[8808,-4565,8809,-5030,-4376]],id:"13279",properties:{name:"Toombs"}},{type:"Polygon",arcs:[[-2854,8810,-8636,-7083,-4055,-3430]],id:"29187",properties:{name:"St. Francois"}},{type:"Polygon",arcs:[[8811,-3971,-7209,-4455,-6567]],id:"35021",properties:{name:"Harding"}},{type:"Polygon",arcs:[[-4474,-1470,-1417,-8052,8812]],id:"30097",properties:{name:"Sweet Grass"}},{type:"Polygon",arcs:[[8813,8814,-6355,-4491,-6520,-5569]],id:"21155",properties:{name:"Marion"}},{type:"Polygon",arcs:[[-8011,-8057,8815,-5597,8816,8817,-7472]],id:"47149",properties:{name:"Rutherford"}},{type:"MultiPolygon",arcs:[[[8818,-6009,-2358,-2348,8819,8820]]],id:"53061",properties:{name:"Snohomish"}},{type:"Polygon",arcs:[[-6051,-2340,-7187,-8658,-8276,-7390]],id:"29165",properties:{name:"Platte"}},{type:"Polygon",arcs:[[-7952,-1838,-8628,-7052,8821,8822,8823]],id:"39061",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[-6866,-4784,-7474,-5336,-1396,-5311]],id:"47081",properties:{name:"Hickman"}},{type:"Polygon",arcs:[[-4550,-4528,8824,-6775,-224,-1065]],id:"48337",properties:{name:"Montague"}},{type:"Polygon",arcs:[[-5451,-8135,-7384,8825,-5863,-5459]],id:"49007",properties:{name:"Carbon"}},{type:"Polygon",arcs:[[-7529,-3101,-2972,-6182,-615,-3270]],id:"20041",properties:{name:"Dickinson"}},{type:"Polygon",arcs:[[-2385,-8124,-149,8826,-8544,-1752]],id:"17105",properties:{name:"Livingston"}},{type:"Polygon",arcs:[[-4824,-2147,-3302,-6370,8827,-3327,-4254]],id:"05149",properties:{name:"Yell"}},{type:"Polygon",arcs:[[-5577,-7020,-3903,-2534]],id:"16065",properties:{name:"Madison"}},{type:"Polygon",arcs:[[-3415,-603,-186,8828,-3853,-7343]],id:"13285",properties:{name:"Troup"}},{type:"Polygon",arcs:[[8829,-1827,-721,-8569,8830]],id:"12081",properties:{name:"Manatee"}},{type:"MultiPolygon",arcs:[[[8831,8832,8833,-7728,8834]],[[8835,8836]]],id:"51001",properties:{name:"Accomack"}},{type:"Polygon",arcs:[[-842,8837,-58,-8590,-2066]],id:"13289",properties:{name:"Twiggs"}},{type:"Polygon",arcs:[[-5260,-7102,-946,-5416,8838]],id:"24035",properties:{name:"Queen Anne's"}},{type:"Polygon",arcs:[[-3496,-7948,-5961,-5117]],id:"25015",properties:{name:"Hampshire"}},{type:"Polygon",arcs:[[-4334,-5171,-6301,-3061,8839,8840]],id:"17071",properties:{name:"Henderson"}},{type:"Polygon",arcs:[[8841,-8749,-2113,-3743,8842]],id:"40097",properties:{name:"Mayes"}},{type:"Polygon",arcs:[[-4954,-8e3,-2791,-7999,-6749,-6017,-6788,-8253]],id:"51149",properties:{name:"Prince George"}},{type:"Polygon",arcs:[[-7150,-7157,8843,-8695,-4306]],id:"36005",properties:{name:"Bronx"}},{type:"Polygon",arcs:[[-3330,-7779,-8563,-8550,-4945,-4949]],id:"05019",properties:{name:"Clark"}},{type:"Polygon",arcs:[[-756,8844,-1740,-6435,-6432,-6500,8845]],id:"39065",properties:{name:"Hardin"}},{type:"Polygon",arcs:[[-6049,-1360,-519,-5348,-927]],id:"48163",properties:{name:"Frio"}},{type:"Polygon",arcs:[[-8828,-6369,-2402,-7776,-3328]],id:"05051",properties:{name:"Garland"}},{type:"Polygon",arcs:[[-127,-5407,-1538,1542,-7009,-5027,-2813]],id:"31057",properties:{name:"Dundy"}},{type:"Polygon",arcs:[[8846,-5303,-6216,-2398,-6418,-922,-882]],id:"31023",properties:{name:"Butler"}},{type:"Polygon",arcs:[[-8826,-7383,-1725,8847,-1175,-5864]],id:"49019",properties:{name:"Grand"}},{type:"Polygon",arcs:[[-8405,-4400,-5912,-7789,-6746,-4135]],id:"51127",properties:{name:"New Kent"}},{type:"Polygon",arcs:[[-8684,-4738,-2851,-8046,-2833,-7991,-8726]],id:"01093",properties:{name:"Marion"}},{type:"Polygon",arcs:[[-8451,8848,-710,-6546,-5742,-2179]],id:"30073",properties:{name:"Pondera"}},{type:"Polygon",arcs:[[-7836,8849,-8111,-8789]],id:"32510",properties:{name:"Carson City"}},{type:"Polygon",arcs:[[8850,8851,-5145,-7375]],id:"12125",properties:{name:"Union"}},{type:"MultiPolygon",arcs:[[[-8772,-1988,8852,8853]]],id:"02020",properties:{name:"Anchorage"}},{type:"Polygon",arcs:[[-7254,-3515,-5282,8854,8855,-3999]],id:"55125",properties:{name:"Vilas"}},{type:"Polygon",arcs:[[8856,-2466,-3124,-8595,-2953]],id:"28019",properties:{name:"Choctaw"}},{type:"Polygon",arcs:[[-2259,8857,-7914,-7144]],id:"31169",properties:{name:"Thayer"}},{type:"Polygon",arcs:[[-730,8858,-478,8859,-55,-5578]],id:"13223",properties:{name:"Paulding"}},{type:"Polygon",arcs:[[8860,-8193,-8140,-8189,-4288,8861,-5386]],id:"32033",properties:{name:"White Pine"}},{type:"Polygon",arcs:[[8862,8863,-1049,-8455,-2458,-2959]],id:"48203",properties:{name:"Harrison"}},{type:"Polygon",arcs:[[-6087,-6120,8864,-601]],id:"13113",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[-7306,-6384,-2931,8865,-1520,-7310]],id:"18059",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[-7459,-6404,8866,-7700,-7689,8867]],id:"22025",properties:{name:"Catahoula"}},{type:"Polygon",arcs:[[8868,-7050,-8627,-6885,-6454,8869]],id:"21191",properties:{name:"Pendleton"}},{type:"Polygon",arcs:[[-3440,-8760,-8799,8870,-6785]],id:"51197",properties:{name:"Wythe"}},{type:"Polygon",arcs:[[8871,8872,-6608,-5640,-8383,-1437]],id:"56003",properties:{name:"Big Horn"}},{type:"Polygon",arcs:[[-3593,-6740,-5795,8873,-6349]],id:"46137",properties:{name:"Ziebach"}},{type:"MultiPolygon",arcs:[[[8874]],[[8875,8876]]],id:"25007",properties:{name:"Dukes"}},{type:"Polygon",arcs:[[-8584,8877,-1850,-606,-1747]],id:"13157",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-5657,8878,-2858,-8710,-8122]],id:"18111",properties:{name:"Newton"}},{type:"Polygon",arcs:[[8879,-4323,-8407,-7760,8880]],id:"48277",properties:{name:"Lamar"}},{type:"Polygon",arcs:[[-7090,-2747,-8653,-1712,-8616,8881,-3363,-7137]],id:"27021",properties:{name:"Cass"}},{type:"Polygon",arcs:[[-1910,-1552,-1925,-3309,-778]],id:"48153",properties:{name:"Floyd"}},{type:"Polygon",arcs:[[-2930,8882,-2711,-3680,-1521,-8866]],id:"18139",properties:{name:"Rush"}},{type:"Polygon",arcs:[[-1244,-7410,-6980,-2867,8883]],id:"06079",properties:{name:"San Luis Obispo"}},{type:"Polygon",arcs:[[-8656,8884,-4934,-4574,-6173,-2387,-6319]],id:"20155",properties:{name:"Reno"}},{type:"Polygon",arcs:[[-3028,-990,-2555,-2546,-3420]],id:"19025",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[-1716,-8549,-621,-6183]],id:"27065",properties:{name:"Kanabec"}},{type:"Polygon",arcs:[[-4855,-7723,-6720,-7348,-8013,-8614]],id:"42035",properties:{name:"Clinton"}},{type:"Polygon",arcs:[[-3164,-859,8885,-2133,-2993,-1152]],id:"20109",properties:{name:"Logan"}},{type:"Polygon",arcs:[[-1836,-1634,8886,-6659,8887,-8625]],id:"39027",properties:{name:"Clinton"}},{type:"Polygon",arcs:[[-8366,-757,-8846,-6499,-1830]],id:"39003",properties:{name:"Allen"}},{type:"Polygon",arcs:[[-4151,-2618,-8504,8888,-6704,-791,-1950]],id:"55115",properties:{name:"Shawano"}},{type:"Polygon",arcs:[[-2116,-7491,-7504,-8708,8889,-7881,-8175]],id:"40135",properties:{name:"Sequoyah"}},{type:"Polygon",arcs:[[-6725,-7963,-5814,8890,8891,8892,-767,8893,-6722,8894]],id:"47035",properties:{name:"Cumberland"}},{type:"Polygon",arcs:[[8895,-6151,-4437,-5579,-57,8896,-7341,-3456]],id:"01029",properties:{name:"Cleburne"}},{type:"Polygon",arcs:[[-77,-7024,8897,-7072,8898]],id:"26099",properties:{name:"Macomb"}},{type:"Polygon",arcs:[[-8105,-79,8899,-6326,-8102,-2882]],id:"26049",properties:{name:"Genesee"}},{type:"Polygon",arcs:[[-3016,8900,-4655,-1084,-937]],id:"17007",properties:{name:"Boone"}},{type:"Polygon",arcs:[[-3842,-5251,-6261,8901,-1708,-8107,-3565]],id:"38053",properties:{name:"McKenzie"}},{type:"Polygon",arcs:[[-7244,-7388,-4365,-2895,-6629,-8757]],id:"51141",properties:{name:"Patrick"}},{type:"Polygon",arcs:[[-6995,-8167,8902,-5502,-5914,8903]],id:"17003",properties:{name:"Alexander"}},{type:"Polygon",arcs:[[-6917,-4393,-3177,-7935]],id:"05133",properties:{name:"Sevier"}},{type:"Polygon",arcs:[[-6203,8904,-8345,8905,-414]],id:"28039",properties:{name:"George"}},{type:"Polygon",arcs:[[-6422,8906,-8326,-8508,-8777,-7215]],id:"34039",properties:{name:"Union"}},{type:"Polygon",arcs:[[-3938,-4260,-3839,8907,8908,8909]],id:"17015",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[-3220,8910,-3384,-8615,-1668,8911]],id:"13287",properties:{name:"Turner"}},{type:"Polygon",arcs:[[-8160,8912,-8722,8913,8914]],id:"06081",properties:{name:"San Mateo"}},{type:"Polygon",arcs:[[8915,8916,-8494,-6933,-2921,8917,-4563]],id:"13031",properties:{name:"Bulloch"}},{type:"Polygon",arcs:[[-4616,-3939,-8910,8918,-2542]],id:"19097",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-2047,-8164,-8367,-5039,-1177]],id:"08113",properties:{name:"San Miguel"}},{type:"Polygon",arcs:[[-3600,-2615,-122,-7727,8919]],id:"48427",properties:{name:"Starr"}},{type:"Polygon",arcs:[[-2027,-8269,-3826,-8581,-8417]],id:"13187",properties:{name:"Lumpkin"}},{type:"Polygon",arcs:[[-8681,8920,-8327,-8907,-6421,-4359,-6142]],id:"34027",properties:{name:"Morris"}},{type:"Polygon",arcs:[[8921,-2656,-2256,-7511,-4021,-1540,-5406]],id:"31063",properties:{name:"Frontier"}},{type:"Polygon",arcs:[[-6823,-4155,-8110,-6089,-5476,-5644]],id:"55033",properties:{name:"Dunn"}},{type:"Polygon",arcs:[[-5922,8922,-2727,-2774,-213]],id:"48429",properties:{name:"Stephens"}},{type:"Polygon",arcs:[[-8865,-6119,-7782,-2448,-2486,-6363,-181,-602]],id:"13255",properties:{name:"Spalding"}},{type:"Polygon",arcs:[[-2990,-7184,-3540,8923,-6644]],id:"39051",properties:{name:"Fulton"}},{type:"Polygon",arcs:[[-442,-5176,-3683,-2677,8924]],id:"19037",properties:{name:"Chickasaw"}},{type:"Polygon",arcs:[[-8262,-158,-2502,-2728,-6689]],id:"48369",properties:{name:"Parmer"}},{type:"Polygon",arcs:[[-5674,-1623,-4988,-4834,-3754,-964,-5670]],id:"42019",properties:{name:"Butler"}},{type:"Polygon",arcs:[[8925,-1580,8926,8927,-8398]],id:"50009",properties:{name:"Essex"}},{type:"Polygon",arcs:[[-2548,-2557,-8535,-1239,-3166]],id:"19077",properties:{name:"Guthrie"}},{type:"Polygon",arcs:[[-8717,-7898,-3210,-6771,-8191,-8861,-5385,-8525,-6574]],id:"32007",properties:{name:"Elko"}},{type:"Polygon",arcs:[[8928,-8644,8929,-7735,-2285,-7516]],id:"01089",properties:{name:"Madison"}},{type:"Polygon",arcs:[[-3858,-8113,8930,-4423,-2525,-4829,-1102,-6834,-2607]],id:"06051",properties:{name:"Mono"}},{type:"Polygon",arcs:[[-6929,-8378,-5590,8931]],id:"06073",properties:{name:"San Diego"}},{type:"Polygon",arcs:[[-4449,-6257,-5162,-549,-551,-2943]],id:"31115",properties:{name:"Loup"}},{type:"Polygon",arcs:[[-8561,-5320,8932,8933,-5559]],id:"31157",properties:{name:"Scotts Bluff"}},{type:"Polygon",arcs:[[-675,-3147,-6707,-5752,-6737,-3591,-6698,-8106]],id:"38001",properties:{name:"Adams"}},{type:"Polygon",arcs:[[-1137,-4974,8934,8935,-4035,-6058,8936,-5270]],id:"47071",properties:{name:"Hardin"}},{type:"Polygon",arcs:[[-7639,-5760,8937,-8863,-2958]],id:"48315",properties:{name:"Marion"}},{type:"Polygon",arcs:[[-7493,8938,8939,-3823,-8268]],id:"13281",properties:{name:"Towns"}},{type:"Polygon",arcs:[[-8823,8940,8941,-6613,-7134,-4302,8942]],id:"21015",properties:{name:"Boone"}},{type:"Polygon",arcs:[[8943,-1280,-7115,8944,8945]],id:"26159",properties:{name:"Van Buren"}},{type:"Polygon",arcs:[[-7764,-1677,8946,-4181,8947,-8536]],id:"48465",properties:{name:"Val Verde"}},{type:"Polygon",arcs:[[-6907,-8323,-8426,8948,-8838,-841]],id:"13319",properties:{name:"Wilkinson"}},{type:"Polygon",arcs:[[-3222,8949,-7662,8950,-166]],id:"13177",properties:{name:"Lee"}},{type:"Polygon",arcs:[[8951,-2924,-4276,-8623,-8328,-5031,-8810]],id:"13267",properties:{name:"Tattnall"}},{type:"Polygon",arcs:[[8952,-3520,-3485,8953,-4796,-5434]],id:"23011",properties:{name:"Kennebec"}},{type:"Polygon",arcs:[[-5541,-1308,8954,-193,-6937]],id:"19189",properties:{name:"Winnebago"}},{type:"Polygon",arcs:[[-5447,-2601,-5418,-3644]],id:"19059",properties:{name:"Dickinson"}},{type:"Polygon",arcs:[[-5004,-4223,-1209,8955,-4644,-8723,-6320,-5512]],id:"22069",properties:{name:"Natchitoches"}},{type:"Polygon",arcs:[[-8497,-5583,8956,-875,-8741]],id:"31075",properties:{name:"Grant"}},{type:"Polygon",arcs:[[-7271,-7928,-7695,-8867,-6403]],id:"22041",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-8577,-7807,-7731,-161,-6378,-8711,-3408]],id:"13197",properties:{name:"Marion"}},{type:"Polygon",arcs:[[-6789,-6020,-5774,-4190,-5778,-8026,-7795,-6466,-8143,-8359]],id:"51175",properties:{name:"Southampton"}},{type:"Polygon",arcs:[[-8109,-8471,-7799,8957,-6728]],id:"55121",properties:{name:"Trempealeau"}},{type:"Polygon",arcs:[[8958,8959,-7915,-7630]],id:"06055",properties:{name:"Napa"}},{type:"Polygon",arcs:[[-3661,-7919,-1224,-5880,-3377,-2160]],id:"05137",properties:{name:"Stone"}},{type:"Polygon",arcs:[[-1322,-6184,-624,8960,8961,-8308,8962]],id:"27141",properties:{name:"Sherburne"}},{type:"Polygon",arcs:[[-4667,-7675,8963,-7345]],id:"48141",properties:{name:"El Paso"}},{type:"Polygon",arcs:[[-140,-8448,-8048,-8079]],id:"54003",properties:{name:"Berkeley"}},{type:"Polygon",arcs:[[8964,-6584,-4219,8965,-7296,-283]],id:"21141",properties:{name:"Logan"}},{type:"Polygon",arcs:[[-431,-2201,-681,-218,-2209]],id:"48081",properties:{name:"Coke"}},{type:"Polygon",arcs:[[-8410,8966,-3791,-8605,-8458,-8596]],id:"39079",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-4609,8967,-7320,-4993,8968]],id:"13039",properties:{name:"Camden"}},{type:"Polygon",arcs:[[-4535,-7163,-4011,-8564,-8567,-4507,-7294]],id:"37011",properties:{name:"Avery"}},{type:"MultiPolygon",arcs:[[[8969]],[[8970]],[[8971]],[[8972]],[[8973]],[[8974]],[[8975]],[[8976]],[[8977]],[[8978]],[[8979]],[[8980]],[[8981]],[[8982]],[[8983]],[[8984]],[[8985]],[[8986]],[[8987]]],id:"02016",properties:{name:"Aleutians West"}},{type:"MultiPolygon",arcs:[[[-8853,-1987,8988]],[[8989]],[[-4741,-8774,8990,-1971,-1978]]],id:"02122",properties:{name:"Kenai Peninsula"}},{type:"Polygon",arcs:[[-7322,8991,-8246,-7610,8992]],id:"12031",properties:{name:"Duval"}},{type:"MultiPolygon",arcs:[[[8993]],[[-7397,-6211,8994]]],id:"44009",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-6226,-8075,-6108,8995,-6294]],id:"08019",properties:{name:"Clear Creek"}},{type:"Polygon",arcs:[[8996,-2175,-7873,-4241,-7918,8997]],id:"29153",properties:{name:"Ozark"}},{type:"Polygon",arcs:[[8998,-8233,-5095,-8301,8999,-2212,-8028]],id:"08061",properties:{name:"Kiowa"}},{type:"MultiPolygon",arcs:[[[9e3,-7263]],[[-7266,9001,-7725]]],id:"48061",properties:{name:"Cameron"}},{type:"Polygon",arcs:[[-1474,-2176,-8997,9002,-7419,-6973,-1628]],id:"29213",properties:{name:"Taney"}},{type:"Polygon",arcs:[[-1337,-7642,-3750,-7636,-2237,9003,-368]],id:"40017",properties:{name:"Canadian"}},{type:"Polygon",arcs:[[-7565,9004,-2149,-4823,-7591]],id:"05071",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[-8523,-5821,-8522,-5819,-5893,-5532,-3570]],id:"47095",properties:{name:"Lake"}},{type:"Polygon",arcs:[[-3626,-5257,-6791,-6801,-5999,-7828]],id:"51037",properties:{name:"Charlotte"}},{type:"Polygon",arcs:[[-8170,-8447,-8432,-8559,-5940]],id:"05055",properties:{name:"Greene"}},{type:"Polygon",arcs:[[9005,-7584,9006,-7572,9007]],id:"12129",properties:{name:"Wakulla"}},{type:"Polygon",arcs:[[9008,-3509,-952,9009]],id:"26141",properties:{name:"Presque Isle"}},{type:"Polygon",arcs:[[9010,-8098,-5652,-8121,-2383,-1511]],id:"17197",properties:{name:"Will"}},{type:"Polygon",arcs:[[-7452,-7448,-5458,-4718,-8679,-7444]],id:"54081",properties:{name:"Raleigh"}},{type:"Polygon",arcs:[[-56,-8860,-481,-6088,-605,-3414,-7342,-8897]],id:"13045",properties:{name:"Carroll"}},{type:"Polygon",arcs:[[9011,-8526,-5387,-8862,-4294,-8275,-4830,-2523,-4422]],id:"32023",properties:{name:"Nye"}},{type:"Polygon",arcs:[[9012,-6671,9013,9014,-5464,-2652]],id:"55039",properties:{name:"Fond du Lac"}},{type:"Polygon",arcs:[[-2095,-4335,-8841,9015,-7273,-2059]],id:"19111",properties:{name:"Lee"}},{type:"Polygon",arcs:[[9016,9017,-8735,-6081,-7742,-7646,9018,-7562]],id:"36091",properties:{name:"Saratoga"}},{type:"Polygon",arcs:[[9019,-3922,9020,-6479,-808,-3705]],id:"22097",properties:{name:"St. Landry"}},{type:"Polygon",arcs:[[-7822,9021,-2585,-4320,9022,-7599]],id:"40005",properties:{name:"Atoka"}},{type:"Polygon",arcs:[[-7563,-9019,-7645,-3962]],id:"36035",properties:{name:"Fulton"}},{type:"Polygon",arcs:[[-7823,-6511,-7884,-7886,-2580,-9022,-7821]],id:"40121",properties:{name:"Pittsburg"}},{type:"Polygon",arcs:[[-3403,9023,9024,-8040,-7280,-3786,9025]],id:"39009",properties:{name:"Athens"}},{type:"Polygon",arcs:[[-7987,-6361,-2627,-837,9026,-7983]],id:"01131",properties:{name:"Wilcox"}},{type:"Polygon",arcs:[[9027,9028,-6064,-5181,-5186,9029,-2303]],id:"42051",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[9030,-7737,-4735,-3989,-3446,-8044]],id:"01009",properties:{name:"Blount"}},{type:"Polygon",arcs:[[-4203,-6880,-3871,-6241,-6372,-727,-3829]],id:"13129",properties:{name:"Gordon"}},{type:"Polygon",arcs:[[-8700,-8335,-13,9031,-7860,-4584,-8064,-8134]],id:"22095",properties:{name:"St. John the Baptist"}},{type:"Polygon",arcs:[[-5662,-7568,-7552,-7172,-5678]],id:"42069",properties:{name:"Lackawanna"}},{type:"Polygon",arcs:[[-8892,9032,-5740,9033,-4123,9034,-4538,9035]],id:"47145",properties:{name:"Roane"}},{type:"Polygon",arcs:[[9036,-8477,9037,-6448,-6739]],id:"46021",properties:{name:"Campbell"}},{type:"Polygon",arcs:[[-7062,-7055,-4640,9038,-3919]],id:"22121",properties:{name:"West Baton Rouge"}},{type:"Polygon",arcs:[[-4208,-7312,-1500,-7457,-6302,9039]],id:"18133",properties:{name:"Putnam"}},{type:"Polygon",arcs:[[-1126,-1095,-8183,-8222,-7355]],id:"19173",properties:{name:"Taylor"}},{type:"Polygon",arcs:[[-3474,-7969,-2536,-3908,9040,-7008,-7358]],id:"16011",properties:{name:"Bingham"}},{type:"MultiPolygon",arcs:[[[9041]],[[9042]],[[9043]],[[9044]],[[9045]],[[9046]],[[9047]],[[9048,-7255,-3997,-403,-4404]]],id:"55003",properties:{name:"Ashland"}},{type:"Polygon",arcs:[[-6729,-8958,-7802,-5366,-8091,-3150,-7185]],id:"27169",properties:{name:"Winona"}},{type:"Polygon",arcs:[[9049,-6818,-6753,-2293,-5233,9050,-7222],[-1231]],id:"51165",properties:{name:"Rockingham"}},{type:"Polygon",arcs:[[9051,9052,-4336,-7288]],id:"30019",properties:{name:"Daniels"}},{type:"Polygon",arcs:[[-7285,-5113,-3642,-3252,-7845]],id:"54097",properties:{name:"Upshur"}},{type:"Polygon",arcs:[[9053,-6527,-8770,9054,-8016,-6767]],id:"48473",properties:{name:"Waller"}},{type:"Polygon",arcs:[[-6308,-4669,-4487,-6999,-7038]],id:"18147",properties:{name:"Spencer"}},{type:"Polygon",arcs:[[-8067,9055,-9010,-951,-1536,-7178]],id:"26031",properties:{name:"Cheboygan"}},{type:"Polygon",arcs:[[-8783,-8265,-5120,-8791,-7870,-7866,-4698]],id:"36027",properties:{name:"Dutchess"}},{type:"Polygon",arcs:[[-5306,-4475,-8813,-8051,9056,-1435]],id:"30067",properties:{name:"Park"}},{type:"Polygon",arcs:[[-6322,-8725,-3702,-7847,9057]],id:"22003",properties:{name:"Allen"}},{type:"Polygon",arcs:[[-2799,-1001,-302,9058,-2820]],id:"28101",properties:{name:"Newton"}},{type:"Polygon",arcs:[[-3920,-9039,-4639,-8701,-7542,-4624,9059]],id:"22047",properties:{name:"Iberville"}},{type:"Polygon",arcs:[[-3432,-4058,-6412,-8738,9060,-6414,-8031]],id:"29223",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[-7590,-495,-3555,-7260,-6777,-6692]],id:"40141",properties:{name:"Tillman"}},{type:"Polygon",arcs:[[-716,9061,-3536,-6072,9062,-6065,-327]],id:"36011",properties:{name:"Cayuga"}},{type:"Polygon",arcs:[[-7492,-7430,-7500,9063,-8939]],id:"13241",properties:{name:"Rabun"}},{type:"Polygon",arcs:[[-3804,-4239,-5197,-4357,-7078,-7230,-8466,-8467,-570]],id:"05035",properties:{name:"Crittenden"}},{type:"Polygon",arcs:[[-8793,-8797,-7667,-806,-7577,-7518,-2343,-3670,9064]],id:"12063",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-4585,-4032,-7517,-2288,9065,-2848,-4737]],id:"01079",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[-8129,-4118,9066,9067,9068]],id:"21215",properties:{name:"Spencer"}},{type:"Polygon",arcs:[[-8286,9069,-596,-7709,-8244]],id:"53067",properties:{name:"Thurston"}},{type:"Polygon",arcs:[[9070,9071,-3502,-7251,-231,-1393]],id:"46011",properties:{name:"Brookings"}},{type:"Polygon",arcs:[[-5600,-5606,-642,-8648,-8641]],id:"47061",properties:{name:"Grundy"}},{type:"Polygon",arcs:[[-6782,-1612,-5866,-8217,9072]],id:"48025",properties:{name:"Bee"}},{type:"Polygon",arcs:[[9073,9074,-8765,-4634,9075]],id:"24017",properties:{name:"Charles"}},{type:"Polygon",arcs:[[-5659,-5677,-6735,-6716,9076]],id:"42113",properties:{name:"Sullivan"}},{type:"Polygon",arcs:[[-2170,-7790]],id:"51830",properties:{name:"Williamsburg"}},{type:"Polygon",arcs:[[-8406,-7641,9077,-2244]],id:"48449",properties:{name:"Titus"}},{type:"Polygon",arcs:[[-2245,-9078,-7640,-2956,-6462]],id:"48063",properties:{name:"Camp"}},{type:"Polygon",arcs:[[9078,-5602,-8646,9079]],id:"47127",properties:{name:"Moore"}},{type:"Polygon",arcs:[[9080,-7600,-9023,-4324,-8880,9081,9082]],id:"40013",properties:{name:"Bryan"}},{type:"Polygon",arcs:[[-2270,-109,-6528,-9054,-6766,-7744]],id:"48185",properties:{name:"Grimes"}},{type:"Polygon",arcs:[[-7575,-2010,-7014,-7580,-9006,9083]],id:"12073",properties:{name:"Leon"}},{type:"Polygon",arcs:[[-84,-8728,9084,-2462,9085]],id:"28025",properties:{name:"Clay"}},{type:"Polygon",arcs:[[-5995,-8224,9086,-4415,-4017,-7997]],id:"29087",properties:{name:"Holt"}},{type:"Polygon",arcs:[[-7160,9087,-6427,-8531,-8598,9088]],id:"36029",properties:{name:"Erie"}},{type:"Polygon",arcs:[[-8126,-2899,-7103,-8761,-2845]],id:"16087",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-6350,-8874,-8786,-6681,-5856,-4750]],id:"46055",properties:{name:"Haakon"}},{type:"Polygon",arcs:[[-7882,-8890,-8709,-4256,-6916,-7934,-2582,-7885]],id:"40079",properties:{name:"Le Flore"}},{type:"Polygon",arcs:[[-5824,-8606,-6289,9089,-8076,-5362,-5108]],id:"54099",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[-7247,9090,-3568,-6012,-4899,-265]],id:"30079",properties:{name:"Prairie"}},{type:"Polygon",arcs:[[9091,-7654,9092,-2563]],id:"12033",properties:{name:"Escambia"}},{type:"Polygon",arcs:[[-8949,-8425,9093,-8374,-8412,-59]],id:"13175",properties:{name:"Laurens"}},{type:"Polygon",arcs:[[9094,-2679,-192,-3160,-846]],id:"19023",properties:{name:"Butler"}},{type:"Polygon",arcs:[[9095,-5223,9096,-463,9097,-5974,-3368,-7402]],id:"41065",properties:{name:"Wasco"}},{type:"Polygon",arcs:[[-5854,-4860,-7533,-1600,-6341,9098]],id:"31027",properties:{name:"Cedar"}},{type:"Polygon",arcs:[[-8690,9099,-8734,-7289,9100,-7945,9101]],id:"33011",properties:{name:"Hillsborough"}},{type:"Polygon",arcs:[[-8211,-5797,-5301,-8495,-8917,9102]],id:"13251",properties:{name:"Screven"}},{type:"Polygon",arcs:[[-8483,-8801,-7205,-5215,-6215,-1011]],id:"31021",properties:{name:"Burt"}},{type:"MultiPolygon",arcs:[[[-4282,9103,-8832,9104]],[[-8837,9105]],[[-5079,9106]]],id:"24039",properties:{name:"Somerset"}},{type:"Polygon",arcs:[[-4281,9107,9108,-8833,-9104]],id:"24047",properties:{name:"Worcester"}},{type:"Polygon",arcs:[[9109,-455,-8647,-6258,-5249,-6632]],id:"38013",properties:{name:"Burke"}},{type:"Polygon",arcs:[[9110,9111,9112,-5655]],id:"18127",properties:{name:"Porter"}},{type:"Polygon",arcs:[[-8006,-6407,-1924,-2158,-270,-7141]],id:"29083",properties:{name:"Henry"}},{type:"Polygon",arcs:[[-6071,9113,-7816,-7739,-6857,-6066,-9063]],id:"36023",properties:{name:"Cortland"}},{type:"Polygon",arcs:[[-2902,-3902,-5314,-8716,9114]],id:"16001",properties:{name:"Ada"}},{type:"Polygon",arcs:[[-2795,-4043,-1117,9115,-1743]],id:"17175",properties:{name:"Stark"}},{type:"Polygon",arcs:[[-8780,9116,-2554,-2108,9117,9118]],id:"38043",properties:{name:"Kidder"}},{type:"Polygon",arcs:[[-5980,-6786,-8871,-8798,-6146,9119]],id:"51173",properties:{name:"Smyth"}},{type:"Polygon",arcs:[[9120,-1942,-8427,-6099,-6375,-8805]],id:"13301",properties:{name:"Warren"}},{type:"Polygon",arcs:[[-6884,9121,-5736,-5536,-6456]],id:"21201",properties:{name:"Robertson"}},{type:"MultiPolygon",arcs:[[[9122]],[[-1706,-2294,-482,9123]],[[9124]]],id:"02180",properties:{name:"Nome"}},{type:"Polygon",arcs:[[-2218,-3434,-1026,-429,9125]],id:"48415",properties:{name:"Scurry"}},{type:"Polygon",arcs:[[9126,-8220,-8396,-8756,-118,-891]],id:"48249",properties:{name:"Jim Wells"}},{type:"Polygon",arcs:[[-8858,-2481,-7637,-2915]],id:"31095",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[-8056,-6638,-5607,-5598,-8816]],id:"47015",properties:{name:"Cannon"}},{type:"Polygon",arcs:[[-3303,-1237,-2107,-7308,9127,-6393]],id:"18017",properties:{name:"Cass"}},{type:"Polygon",arcs:[[-9090,-6288,-8677,-7453,-7442,-6828,-8077]],id:"54043",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[9128,-7849,-556,-2657,-8922,-5405,-7122,9129]],id:"31111",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-8292,-3090,9130,9131,9132,-7085,-8635]],id:"17157",properties:{name:"Randolph"}},{type:"Polygon",arcs:[[-9015,9133,-5376,-1448,-5465]],id:"55131",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-5268,9134,9135,-6003]],id:"11001",properties:{name:"District of Columbia"}},{type:"Polygon",arcs:[[9136,9137,-4890,-6814,-5909]],id:"51119",properties:{name:"Middlesex"}},{type:"Polygon",arcs:[[-3129,9138,-4656,-2508,-2595]],id:"31061",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-7032,-5292,-3806,-8720,9139,-8158,9140]],id:"06001",properties:{name:"Alameda"}},{type:"Polygon",arcs:[[-6004,-9136,9141,9142]],id:"51510",properties:{name:"Alexandria"}},{type:"Polygon",arcs:[[-5937,9143,9144,-2307,-1881]],id:"05079",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-6554,9145,-2334,9146,-5277,-7959,-8580,-4469]],id:"37141",properties:{name:"Pender"}},{type:"Polygon",arcs:[[-5964,-8127,-7395,-5089,-7034,-8790]],id:"09003",properties:{name:"Hartford"}},{type:"Polygon",arcs:[[-3992,9147,-8096,-4652]],id:"17097",properties:{name:"Lake"}},{type:"Polygon",arcs:[[-6568,-1598,-5304,-8847,-881,-6569,-199,-4414]],id:"31141",properties:{name:"Platte"}},{type:"Polygon",arcs:[[-6387,-2950,9148,9149,-3931,-2513]],id:"20081",properties:{name:"Haskell"}},{type:"Polygon",arcs:[[-3002,-2691,-2586,-4809,-7257,-3620]],id:"48135",properties:{name:"Ector"}},{type:"Polygon",arcs:[[-272,-2157,-5883,9150,9151]],id:"29085",properties:{name:"Hickory"}},{type:"Polygon",arcs:[[-6802,-6793,9152,-8255,-8358,-8141,-8069]],id:"51025",properties:{name:"Brunswick"}},{type:"Polygon",arcs:[[-2666,-8925,-9095,-2392]],id:"19067",properties:{name:"Floyd"}},{type:"Polygon",arcs:[[9153]],id:"51600",properties:{name:"Fairfax"}},{type:"Polygon",arcs:[[-5319,-8499,-8744,9154,9155,-8933]],id:"31123",properties:{name:"Morrill"}},{type:"Polygon",arcs:[[9156,-1451,-7775,-3994,-4651,-8901,-3015]],id:"55127",properties:{name:"Walworth"}},{type:"Polygon",arcs:[[-8918,-2925,-8952,-4564]],id:"13043",properties:{name:"Candler"}},{type:"Polygon",arcs:[[-1195,-3001,-1123,9157,-8082,-2034,9158]],id:"17115",properties:{name:"Macon"}},{type:"Polygon",arcs:[[-858,-3111,-2577,-2613,-1502,-339,-2134,-8886]],id:"20063",properties:{name:"Gove"}},{type:"Polygon",arcs:[[-7680,-8081,-8346,-8905,-6202]],id:"28041",properties:{name:"Greene"}},{type:"Polygon",arcs:[[9159,-2683,-2660,9160,-9131,-3089]],id:"17189",properties:{name:"Washington"}},{type:"Polygon",arcs:[[9161,-287,-703,-3172,-3481,-3519]],id:"23019",properties:{name:"Penobscot"}},{type:"Polygon",arcs:[[-2449,-2404,-394,-3996,-5787,9162]],id:"55001",properties:{name:"Adams"}},{type:"MultiPolygon",arcs:[[[9163]],[[9164]],[[-8906,-8344,9165,-7756,-415]]],id:"28059",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[9166,-1672,9167,9168,-7011,-7666]],id:"13071",properties:{name:"Colquitt"}},{type:"Polygon",arcs:[[-7938,-6159,-7887,-966,-3757,9169,-9028,-2302,-4725]],id:"42125",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-7101,9170,-9108,-4280,-5082,-948]],id:"10005",properties:{name:"Sussex"}},{type:"Polygon",arcs:[[-2970,9171,-5428,-7250,-3156,-2417,-6181]],id:"20197",properties:{name:"Wabaunsee"}},{type:"Polygon",arcs:[[-5295,-5288,-6890,-5709,9172,-3312]],id:"21157",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[-7469,9173,-5110,-4922,-5354,-6344,-6564]],id:"21175",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[-1284,-6447,-6585,-8965,-282,9174,-4911]],id:"21177",properties:{name:"Muhlenberg"}},{type:"Polygon",arcs:[[-8966,-4218,-7859,-5622,-7297]],id:"21213",properties:{name:"Simpson"}},{type:"Polygon",arcs:[[-4009,-1904,-2832,-4838,-8565]],id:"37035",properties:{name:"Catawba"}},{type:"Polygon",arcs:[[-7168,-7651,-7596,-7669,-7422,-6560]],id:"40103",properties:{name:"Noble"}},{type:"Polygon",arcs:[[-4523,9175,-3455,-8420,9176,-6022]],id:"53013",properties:{name:"Columbia"}},{type:"Polygon",arcs:[[-9059,-7703,-7677,9177,9178]],id:"28061",properties:{name:"Jasper"}},{type:"Polygon",arcs:[[-7200,-5440,-4672,-4629,-1129,-3098]],id:"17033",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[-4755,-566,-1395,-3005,-6914,-1390]],id:"46005",properties:{name:"Beadle"}},{type:"Polygon",arcs:[[-8924,-3546,-6667,-8365,-1033,-6645]],id:"39069",properties:{name:"Henry"}},{type:"Polygon",arcs:[[-8705,-2004,-8408,-6660,-8887,-1633]],id:"39047",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[-2929,-1161,9179,-2705,-8883]],id:"18041",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[-7644,-6464,-2249,-2265]],id:"48379",properties:{name:"Rains"}},{type:"Polygon",arcs:[[-5103,-669,-7235,-2325,-8787,-7602]],id:"29129",properties:{name:"Mercer"}},{type:"Polygon",arcs:[[9180,-363,-656,9181,9182]],id:"38027",properties:{name:"Eddy"}},{type:"Polygon",arcs:[[-3006,-560,-8500,-1363,-1990]],id:"46061",properties:{name:"Hanson"}},{type:"Polygon",arcs:[[-1816,9183,-8429,-8150,-2741]],id:"39109",properties:{name:"Miami"}},{type:"Polygon",arcs:[[-1066,-228,-8095,9184,-2411,-2724]],id:"48367",properties:{name:"Parker"}},{type:"Polygon",arcs:[[9185,-1068,-2723,-8923,-5921]],id:"48503",properties:{name:"Young"}},{type:"Polygon",arcs:[[-6626,9186,-8592,-4024,-6471,-788]],id:"48373",properties:{name:"Polk"}},{type:"Polygon",arcs:[[-6323,-9058,-7848,-5340,-8802]],id:"22011",properties:{name:"Beauregard"}},{type:"Polygon",arcs:[[-8147,-4384,-8357,-319,-4185,9187,-5139]],id:"49033",properties:{name:"Rich"}},{type:"Polygon",arcs:[[-2351,-2365,-3634,9188,-5219,9189,-7710,-594]],id:"53077",properties:{name:"Yakima"}},{type:"MultiPolygon",arcs:[[[9190]],[[-3544,9191,9192,-3066,-6665]]],id:"39123",properties:{name:"Ottawa"}},{type:"Polygon",arcs:[[-4329,-5718,-4962,9193,-7088,-4956]],id:"17013",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[-6869,-6944,-3972,-8812,-6566,-5746]],id:"35007",properties:{name:"Colfax"}},{type:"Polygon",arcs:[[-6754,-586,-6911,-6256,-4447,-5581]],id:"31103",properties:{name:"Keya Paha"}},{type:"Polygon",arcs:[[-1439,-8385,-8509]],id:"56017",properties:{name:"Hot Springs"}},{type:"Polygon",arcs:[[-8166,-5297,-5949,-5503,-8903]],id:"21007",properties:{name:"Ballard"}},{type:"Polygon",arcs:[[9194,-6761,-1687,-5044,-8591,-9187,-6625,-6742]],id:"48005",properties:{name:"Angelina"}},{type:"Polygon",arcs:[[-4966,-5843,-5051,-4684,-4874,9195]],id:"45015",properties:{name:"Berkeley"}},{type:"Polygon",arcs:[[-888,9196,-9071,-1392,-564]],id:"46057",properties:{name:"Hamlin"}},{type:"Polygon",arcs:[[-4484,-4099,-5894,9197,-8402,-5720]],id:"45037",properties:{name:"Edgefield"}},{type:"Polygon",arcs:[[-1358,-6783,-9073,-8221,-9127,-890,-3395]],id:"48297",properties:{name:"Live Oak"}},{type:"Polygon",arcs:[[-1332,9198,-822,-8520,-6031]],id:"27121",properties:{name:"Pope"}},{type:"Polygon",arcs:[[9199,9200,-8036,-9025,9201]],id:"39115",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[9202,-5224,-9096,-7401,-7957]],id:"41027",properties:{name:"Hood River"}},{type:"Polygon",arcs:[[-273,-9152,9203,-7337,9204,-1907]],id:"29167",properties:{name:"Polk"}},{type:"Polygon",arcs:[[9205,-2189,9206,-899,-1656]],id:"48115",properties:{name:"Dawson"}},{type:"Polygon",arcs:[[-2304,-9030,-5189,-7324,-7277,-3131]],id:"54061",properties:{name:"Monongalia"}},{type:"Polygon",arcs:[[-3085,-5923,-211,-3783,-2234]],id:"48207",properties:{name:"Haskell"}},{type:"Polygon",arcs:[[-209,-2190,-9206,-1655,-471]],id:"48445",properties:{name:"Terry"}},{type:"Polygon",arcs:[[-7261,-4551,-1063,-9186,-1045]],id:"48009",properties:{name:"Archer"}},{type:"Polygon",arcs:[[-1307,-6329,-2667,-2390,-8955]],id:"19195",properties:{name:"Worth"}},{type:"Polygon",arcs:[[-7671,-6521,-4496,-6888,-4617,-5519]],id:"21001",properties:{name:"Adair"}},{type:"Polygon",arcs:[[-6295,-8996,-6115,-2223,9207,9208,9209]],id:"08093",properties:{name:"Park"}},{type:"Polygon",arcs:[[-5896,9210,9211,-4967,-9196,-4873,-6634,-1351,9212]],id:"45075",properties:{name:"Orangeburg"}},{type:"Polygon",arcs:[[9213,-6296,-9210,9214,-8296]],id:"08065",properties:{name:"Lake"}},{type:"Polygon",arcs:[[-8460,-8607,-5826,9215,-5207]],id:"21089",properties:{name:"Greenup"}},{type:"Polygon",arcs:[[-9064,-7499,9216,9217,-8582,-3824,-8940]],id:"13137",properties:{name:"Habersham"}},{type:"Polygon",arcs:[[-3404,-9026,-3785,-3792,-8967,-8409]],id:"39163",properties:{name:"Vinton"}},{type:"Polygon",arcs:[[-8492,-92,-1736,-8845,-755]],id:"39175",properties:{name:"Wyandot"}},{type:"Polygon",arcs:[[-4442,-7532,-8618,-4908,-6606,-8873,9218]],id:"30003",properties:{name:"Big Horn"}},{type:"Polygon",arcs:[[-4317,-4062,-2373,-7702,9219]],id:"28037",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-5785,9220],[9221]],id:"51683",properties:{name:"Manassas"}},{type:"Polygon",arcs:[[-4539,-9035,-4127,9222,-5421,-7325]],id:"47107",properties:{name:"McMinn"}},{type:"Polygon",arcs:[[9223,-426,-7850,-9129,9224,-877]],id:"31117",properties:{name:"McPherson"}},{type:"Polygon",arcs:[[-6557,-7825,-7829,-6505]],id:"40133",properties:{name:"Seminole"}},{type:"Polygon",arcs:[[-4792,-2252,-7692,9225,-5944,9226,-8807,-4547]],id:"48213",properties:{name:"Henderson"}},{type:"Polygon",arcs:[[-8453,-8481,-8486,-5066,-5971,9227,-7436]],id:"50001",properties:{name:"Addison"}},{type:"Polygon",arcs:[[9228,-9155,-8743,-8317,9229,9230,-3738]],id:"31033",properties:{name:"Cheyenne"}},{type:"Polygon",arcs:[[9231,-285,-7300,9232,-4781,-4425,-6685]],id:"47125",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[9233,9234,-4132,-6640,-1072,-662,-2885]],id:"48035",properties:{name:"Bosque"}},{type:"Polygon",arcs:[[9235,-5312,-1399,-7705,-4029,-8936]],id:"47181",properties:{name:"Wayne"}},{type:"Polygon",arcs:[[-6696,-3762,-6921,9236,9237,-4096,-4483]],id:"45071",properties:{name:"Newberry"}},{type:"Polygon",arcs:[[-5646,-897,-8318,-7210,-3969]],id:"48205",properties:{name:"Hartley"}},{type:"Polygon",arcs:[[-405,-4001,-1430,-4153,-6822]],id:"55107",properties:{name:"Rusk"}},{type:"Polygon",arcs:[[-3258,9238,-6060,-8683,-6187,-5443]],id:"28117",properties:{name:"Prentiss"}},{type:"Polygon",arcs:[[-2818,9239,-1783,-3462,-4572]],id:"19035",properties:{name:"Cherokee"}},{type:"Polygon",arcs:[[-2949,-995,-6894,9240,9241,-9149]],id:"20119",properties:{name:"Meade"}},{type:"Polygon",arcs:[[-3239,-503,-8806,-474,-1625,-1326]],id:"48087",properties:{name:"Collingsworth"}},{type:"Polygon",arcs:[[-6813,-8256,-9153,-6792,-5255]],id:"51135",properties:{name:"Nottoway"}},{type:"Polygon",arcs:[[-2497,9242,-9202,-9024,-3402,-8513]],id:"39127",properties:{name:"Perry"}},{type:"Polygon",arcs:[[-3534,-7427,-7553,-7814,-9114,-6070]],id:"36053",properties:{name:"Madison"}},{type:"Polygon",arcs:[[-2862,-5703,-5592,-8085,-8238]],id:"18171",properties:{name:"Warren"}},{type:"Polygon",arcs:[[-8310,-816,-3080,-3356,-311]],id:"27085",properties:{name:"McLeod"}},{type:"Polygon",arcs:[[-2413,9243,-9234,-2884]],id:"48425",properties:{name:"Somervell"}},{type:"Polygon",arcs:[[-1815,-6434,-6438,-8703,-8430,-9184]],id:"39021",properties:{name:"Champaign"}},{type:"MultiPolygon",arcs:[[[9244,-8196]],[[9245,9246,9247,-8194,9248,-8202]]],id:"12086",properties:{name:"Miami-Dade"}},{type:"Polygon",arcs:[[-9103,-8916,-4562,-8212]],id:"13165",properties:{name:"Jenkins"}},{type:"Polygon",arcs:[[-5692,9249,-371,-1732,9250,-6678]],id:"40043",properties:{name:"Dewey"}},{type:"Polygon",arcs:[[-2277,9251,9252,-6772,-8825,-4527]],id:"40085",properties:{name:"Love"}},{type:"Polygon",arcs:[[-4378,-5034,-8610,-6242,-3265]],id:"13005",properties:{name:"Bacon"}},{type:"Polygon",arcs:[[-288,-9162,-3518]],id:"23021",properties:{name:"Piscataquis"}},{type:"Polygon",arcs:[[9253,9254,-1864,-8713]],id:"39085",properties:{name:"Lake"}},{type:"Polygon",arcs:[[-5833,-8019,-8664,9255,-2646]],id:"48089",properties:{name:"Colorado"}},{type:"Polygon",arcs:[[-5545,-5330,-6588,-5802]],id:"21131",properties:{name:"Leslie"}},{type:"Polygon",arcs:[[-3815,-8261,-7876,-7916,-8960,9256]],id:"06113",properties:{name:"Yolo"}},{type:"Polygon",arcs:[[-8852,9257,-7613,9258,-5146]],id:"12007",properties:{name:"Bradford"}},{type:"Polygon",arcs:[[-8737,-4839,-2830,-2688,9259,-5484,-4689]],id:"37119",properties:{name:"Mecklenburg"}},{type:"Polygon",arcs:[[-8545,-8827,-154,9260,-1119,-3e3,-1193,-1803]],id:"17113",properties:{name:"McLean"}},{type:"Polygon",arcs:[[-4165,-7958,-7399,-6513,9261]],id:"41067",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-7130,-4209,-9040,-6305,-3283,-5439]],id:"18021",properties:{name:"Clay"}},{type:"Polygon",arcs:[[-8808,-9227,-5948,-6779,-913]],id:"48161",properties:{name:"Freestone"}},{type:"Polygon",arcs:[[-7081,9262,-5431,9263,-8763,9264]],id:"24003",properties:{name:"Anne Arundel"}},{type:"Polygon",arcs:[[-8532,-2785,-7724,-4853,-4887,-8745]],id:"42083",properties:{name:"McKean"}},{type:"Polygon",arcs:[[-1645,-7276,-8687,-2634,9265,-3292]],id:"29103",properties:{name:"Knox"}},{type:"Polygon",arcs:[[-2600,-6939,-3026,-5419]],id:"19147",properties:{name:"Palo Alto"}},{type:"Polygon",arcs:[[-3293,-9266,-2638,-8511,-8185,-4877,9266]],id:"29121",properties:{name:"Macon"}},{type:"Polygon",arcs:[[-2464,9267,-7996,-6969,9268,-3125]],id:"28103",properties:{name:"Noxubee"}},{type:"Polygon",arcs:[[-6199,-6539,-2494,-7508,9269,-4060]],id:"28077",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[-1807,-4196,-980,-8800,-8234,-8999,-8027,-8034]],id:"08073",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-6174,-5204,9270,-2910,-694]],id:"20077",properties:{name:"Harper"}},{type:"Polygon",arcs:[[-190,-6313,-1797,-734,-3161]],id:"19171",properties:{name:"Tama"}},{type:"Polygon",arcs:[[-9085,-8727,-7993,-7994,-9268,-2463]],id:"28087",properties:{name:"Lowndes"}},{type:"Polygon",arcs:[[-1547,-1908,-9205,-7340,9271,-3927]],id:"29057",properties:{name:"Dade"}},{type:"Polygon",arcs:[[-2188,-2219,-9126,-428,-6529,-9207]],id:"48033",properties:{name:"Borden"}},{type:"Polygon",arcs:[[-5420,-3029,-3419,-9240]],id:"19021",properties:{name:"Buena Vista"}},{type:"Polygon",arcs:[[-5957,-1349,-5313,-9236,-8935,-4973]],id:"47039",properties:{name:"Decatur"}},{type:"Polygon",arcs:[[-7104,-2903,-9115,-8715,-8762]],id:"16027",properties:{name:"Canyon"}},{type:"Polygon",arcs:[[-4061,-9270,-7507,-8053,-2049]],id:"28147",properties:{name:"Walthall"}},{type:"Polygon",arcs:[[-8691,-9102,-7944,-3494,-4707]],id:"33005",properties:{name:"Cheshire"}},{type:"Polygon",arcs:[[-8788,-2323,-3294,-9267,-4876,-1530]],id:"29115",properties:{name:"Linn"}},{type:"Polygon",arcs:[[-6679,-9251,-1735,-497,-3238,-2483]],id:"40129",properties:{name:"Roger Mills"}},{type:"Polygon",arcs:[[9272,-5789,-7538,9273,-2694,-4409]],id:"55111",properties:{name:"Sauk"}},{type:"Polygon",arcs:[[-8724,-7460,-8868,-7688,-7065,-3923,-9020,-3704]],id:"22009",properties:{name:"Avoyelles"}},{type:"Polygon",arcs:[[-3928,-9272,-7339,-1476,-1627,9274,-1589]],id:"29109",properties:{name:"Lawrence"}},{type:"Polygon",arcs:[[-1029,-7968,-3848,9275,-5164]],id:"37127",properties:{name:"Nash"}},{type:"Polygon",arcs:[[-462,-5837,-1998,9276,-5975,-9098]],id:"41069",properties:{name:"Wheeler"}},{type:"Polygon",arcs:[[-5208,-9216,-5825,-5106,9277,-7467]],id:"21043",properties:{name:"Carter"}},{type:"Polygon",arcs:[[-5801,9278,-6358,-8556,-4842,-4768]],id:"37115",properties:{name:"Madison"}},{type:"MultiPolygon",arcs:[[[-9222]],[[-3587,9279,9280,-8637,-7810],[-5786,-9221]]],id:"51153",properties:{name:"Prince William"}},{type:"Polygon",arcs:[[-8089,-7893,9281,-8730]],id:"34007",properties:{name:"Camden"}},{type:"Polygon",arcs:[[-9182,-655,-2552,9282]],id:"38031",properties:{name:"Foster"}},{type:"Polygon",arcs:[[-6820,-6799,-5981,-9120,-6150,-1570,-6532]],id:"51167",properties:{name:"Russell"}},{type:"MultiPolygon",arcs:[[[9283]],[[-8609,-4916,-7616,9284,-1606]]],id:"26041",properties:{name:"Delta"}},{type:"Polygon",arcs:[[-6476,-4215,-7040,-4268,-7525,-4263,-6121,-66]],id:"18175",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-4457,-7214,-4064,-5694,-2804]],id:"35019",properties:{name:"Guadalupe"}},{type:"Polygon",arcs:[[-6170,-2708,-8824,-8943,-4301]],id:"18029",properties:{name:"Dearborn"}},{type:"Polygon",arcs:[[-8822,-7051,-8869,9285,-8941]],id:"21117",properties:{name:"Kenton"}},{type:"MultiPolygon",arcs:[[[-8954,-3484,-7070,9286,-4797]]],id:"23015",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-8387,-7193,-3260,-5442,-7118]],id:"28009",properties:{name:"Benton"}},{type:"Polygon",arcs:[[-96,-702,-3032,-3645,-8454,-5889]],id:"19119",properties:{name:"Lyon"}},{type:"Polygon",arcs:[[-6806,9287,-5618,9288,-5152,9289]],id:"21049",properties:{name:"Clark"}},{type:"Polygon",arcs:[[9290,9291,-5810,9292,-2686]],id:"37167",properties:{name:"Stanly"}},{type:"Polygon",arcs:[[-8817,-5596,-9079,9293,9294]],id:"47003",properties:{name:"Bedford"}},{type:"Polygon",arcs:[[-5236,-5726,-3226,-5253,-3624,9295]],id:"51029",properties:{name:"Buckingham"}},{type:"Polygon",arcs:[[-9003,-8998,-7920,-3659,-7420]],id:"05089",properties:{name:"Marion"}},{type:"Polygon",arcs:[[-8223,-6042,-3709,-6050,-4416,-9087]],id:"29003",properties:{name:"Andrew"}},{type:"Polygon",arcs:[[-2835,-8045,-3450,-8682,-7988,-4387,-7995]],id:"01125",properties:{name:"Tuscaloosa"}},{type:"Polygon",arcs:[[-4971,-5799,-4766,-6451,-4850]],id:"47063",properties:{name:"Hamblen"}},{type:"Polygon",arcs:[[-3633,-4525,-6024,9296,-5835,-5220,-9189]],id:"53005",properties:{name:"Benton"}},{type:"Polygon",arcs:[[-8622,-4274,9297,-4607,-8330]],id:"13191",properties:{name:"McIntosh"}},{type:"Polygon",arcs:[[-4665,-4817,-8033,-3074,-7673]],id:"48109",properties:{name:"Culberson"}},{type:"Polygon",arcs:[[-1940,-8403,-9198,-5899,-8209,-8428]],id:"13245",properties:{name:"Richmond"}},{type:"Polygon",arcs:[[-9173,-5708,-6686,-5958,-3313]],id:"21035",properties:{name:"Calloway"}},{type:"Polygon",arcs:[[9298,-5399,-8633,-8732,-9100,-8689]],id:"33013",properties:{name:"Merrimack"}},{type:"MultiPolygon",arcs:[[[-3976,9299]],[[9300,-6653]],[[-8768,9301,-6651]]],id:"48167",properties:{name:"Galveston"}},{type:"Polygon",arcs:[[-8934,-9156,-9229,-3737,9302,-5560]],id:"31007",properties:{name:"Banner"}},{type:"Polygon",arcs:[[-2400,-3190,-5938,-1879,-8562,-7777]],id:"05053",properties:{name:"Grant"}},{type:"Polygon",arcs:[[9303,-5022,9304,-4299,9305,-5018]],id:"34033",properties:{name:"Salem"}},{type:"Polygon",arcs:[[-6710,-9262,-6516,-7907,-8180,9306]],id:"41057",properties:{name:"Tillamook"}},{type:"Polygon",arcs:[[-7437,-9228,-5973,-8389,-8736,-9018,9307]],id:"36115",properties:{name:"Washington"}},{type:"Polygon",arcs:[[9308,-7197,-2744,-2139]],id:"27077",properties:{name:"Lake of the Woods"}},{type:"Polygon",arcs:[[-7932,-6873,-1795,-975,-4195,-7970,-6112]],id:"08001",properties:{name:"Adams"}},{type:"Polygon",arcs:[[9309,-3816,-9257,-8959,-7629,-7413]],id:"06033",properties:{name:"Lake"}},{type:"Polygon",arcs:[[-8572,-8621,-1943,-9121,-8804,9310]],id:"13317",properties:{name:"Wilkes"}},{type:"Polygon",arcs:[[-4879,-8187,-6543,-1478,9311]],id:"29089",properties:{name:"Howard"}},{type:"Polygon",arcs:[[-6518,9312,-4978,-3372,-204,-6713]],id:"42011",properties:{name:"Berks"}},{type:"Polygon",arcs:[[9313,-5756,-5862,-7962,-3334]],id:"47087",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-2908,-7846,-3250,-8631,-6603,-6796]],id:"54007",properties:{name:"Braxton"}},{type:"Polygon",arcs:[[-6883,9314,-8273,-5211,-5733,-9122]],id:"21161",properties:{name:"Mason"}},{type:"Polygon",arcs:[[9315,-8945,-7114,-8750,9316]],id:"26021",properties:{name:"Berrien"}},{type:"Polygon",arcs:[[-9261,-153,-8239,-4923,-1120]],id:"17019",properties:{name:"Champaign"}},{type:"Polygon",arcs:[[-4396,-7223,-9051,-5232,9317,-8440,-7440],[-6912],[-781]],id:"51015",properties:{name:"Augusta"}},{type:"Polygon",arcs:[[-3194,-6220,-3667,-7029,9318,-9144,-5936]],id:"05001",properties:{name:"Arkansas"}},{type:"Polygon",arcs:[[-8312,-8666,-2068,-8589,-8668,-7806]],id:"13079",properties:{name:"Crawford"}},{type:"Polygon",arcs:[[-3287,-6386,-6306,-6166,-4674]],id:"18027",properties:{name:"Daviess"}},{type:"MultiPolygon",arcs:[[[9319]],[[9320,-6896]],[[-4514,9321]],[[-6900,9322]]],id:"37055",properties:{name:"Dare"}},{type:"Polygon",arcs:[[-3843,-3563,-9091,-7246]],id:"30021",properties:{name:"Dawson"}},{type:"Polygon",arcs:[[-7900,-664,-1075,-1663,-5847,-6745]],id:"48281",properties:{name:"Lampasas"}},{type:"Polygon",arcs:[[-7330,-5989,-1693,9323,-7582]],id:"12123",properties:{name:"Taylor"}},{type:"Polygon",arcs:[[9324,-6877,-4201]],id:"13047",properties:{name:"Catoosa"}},{type:"Polygon",arcs:[[-729,-6029,-6083,-479,-8859]],id:"13067",properties:{name:"Cobb"}},{type:"MultiPolygon",arcs:[[[-4626,-7547,-4157]],[[-3921,-9060,-4623,-6480,-9021]]],id:"22099",properties:{name:"St. Martin"}},{type:"Polygon",arcs:[[-7207,-3275,9325,-7510,-2312,-8267,-7227]],id:"28135",properties:{name:"Tallahatchie"}},{type:"Polygon",arcs:[[-9151,-5882,-1528,-869,-7338,-9204]],id:"29059",properties:{name:"Dallas"}},{type:"Polygon",arcs:[[-3847,-4069,-5073,-4462,-5165,-9276]],id:"37195",properties:{name:"Wilson"}},{type:"Polygon",arcs:[[-1584,-5992,-364,-9181,9326,-8692]],id:"38005",properties:{name:"Benson"}},{type:"Polygon",arcs:[[-9238,9327,9328,-9211,-5895,-4097]],id:"45063",properties:{name:"Lexington"}},{type:"Polygon",arcs:[[-1676,-2693,-2780,-8371,-1840,-4182,-8947]],id:"48137",properties:{name:"Edwards"}},{type:"Polygon",arcs:[[-4204,-3827,-4435,-4248]],id:"13055",properties:{name:"Chattooga"}},{type:"Polygon",arcs:[[9329,-3375,-7022,9330,9331]],id:"24025",properties:{name:"Harford"}},{type:"Polygon",arcs:[[-5811,-5631,-5712,-6622,-4983,-4089,-4975,-4868]],id:"45069",properties:{name:"Marlboro"}},{type:"Polygon",arcs:[[-2918,-7488,-5429,-9172,-2969,-3100]],id:"20161",properties:{name:"Riley"}},{type:"Polygon",arcs:[[-5620,-7120,-1563,-1276,-8944,9332]],id:"26005",properties:{name:"Allegan"}},{type:"Polygon",arcs:[[-6541,-5124,-5244,-4894,-7462]],id:"29051",properties:{name:"Cole"}},{type:"Polygon",arcs:[[-7594,-7650,9333,9334,-3746,-4084,-2640]],id:"40143",properties:{name:"Tulsa"}},{type:"Polygon",arcs:[[-3597,-8137,-5969,-5155,-1857,9335]],id:"48187",properties:{name:"Guadalupe"}},{type:"Polygon",arcs:[[-8399,-8928,9336,-8487,-8479,-2439]],id:"50005",properties:{name:"Caledonia"}},{type:"Polygon",arcs:[[-5466,-1452,-9157,-3014,-7539]],id:"55055",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[-7843,9337,-5013,9338,9339]],id:"42001",properties:{name:"Adams"}},{type:"Polygon",arcs:[[-6177,-7530,-3268,-3278,-7910,-8388]],id:"20105",properties:{name:"Lincoln"}},{type:"MultiPolygon",arcs:[[[-8821,9340]],[[9341]]],id:"53029",properties:{name:"Island"}},{type:"Polygon",arcs:[[9342,-4779,-5855,-9099,-6340,-626,-5161,-6910]],id:"31107",properties:{name:"Knox"}},{type:"Polygon",arcs:[[-8528,-7834,9343,-4420,-8931,-8112,-8850]],id:"32019",properties:{name:"Lyon"}},{type:"Polygon",arcs:[[-7468,-9278,-5105,-9174]],id:"21063",properties:{name:"Elliott"}},{type:"Polygon",arcs:[[-4501,-5154,-4477,-6587,-6353,9344]],id:"21079",properties:{name:"Garrard"}},{type:"Polygon",arcs:[[-5544,-4929,-5613,-6530,-5332]],id:"21133",properties:{name:"Letcher"}},{type:"Polygon",arcs:[[-2977,-4579,9345,-7042,-7147]],id:"21223",properties:{name:"Trimble"}},{type:"Polygon",arcs:[[-4126,-5954,-7940,-7941,-5422,-9223]],id:"47123",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[-2282,-7750,-7812,-2290,-6752]],id:"51113",properties:{name:"Madison"}},{type:"Polygon",arcs:[[-6945,-3324,-1315,-2680,-9160,-3088]],id:"17027",properties:{name:"Clinton"}},{type:"Polygon",arcs:[[-4604,9346,-9247,9347,-8619]],id:"12011",properties:{name:"Broward"}},{type:"Polygon",arcs:[[-9150,-9242,9348,-6732,-3932]],id:"20175",properties:{name:"Seward"}},{type:"Polygon",arcs:[[-7691,-8456,-6762,-9195,-6741,-5945,-9226]],id:"48073",properties:{name:"Cherokee"}},{type:"Polygon",arcs:[[-9319,-7028,-3503,-7301,-2308,-9145]],id:"05041",properties:{name:"Desha"}},{type:"Polygon",arcs:[[-9041,-3907,-4379,-8149,-8259,-7005]],id:"16029",properties:{name:"Caribou"}},{type:"Polygon",arcs:[[-4464,-3729,-4122,-2335,-9146,-6553]],id:"37061",properties:{name:"Duplin"}},{type:"Polygon",arcs:[[-7911,-3281,-8657,-6317,-6478,-6311]],id:"20009",properties:{name:"Barton"}},{type:"Polygon",arcs:[[-1734,9349,-7588,-499]],id:"40149",properties:{name:"Washita"}},{type:"Polygon",arcs:[[-6987,-6228,-6297,-9214,-8295,-1722]],id:"08037",properties:{name:"Eagle"}},{type:"Polygon",arcs:[[-2006,-8543,-5675,-5672,-7405,-7902]],id:"39099",properties:{name:"Mahoning"}},{type:"Polygon",arcs:[[-5037,9350,-8215,-7855,-7783,-4728]],id:"01087",properties:{name:"Macon"}},{type:"Polygon",arcs:[[-8231,-1832,-6501,-1818,-2740,-451]],id:"39107",properties:{name:"Mercer"}},{type:"Polygon",arcs:[[-3586,-5269,-6006,-2986,-6005,-9143,9351,-9074,9352,-9280],[-9154]],id:"51059",properties:{name:"Fairfax"}},{type:"Polygon",arcs:[[-8856,9353,-4148,-1402,-4e3]],id:"55085",properties:{name:"Oneida"}},{type:"Polygon",arcs:[[-8422,-2842,-1993,9354]],id:"41061",properties:{name:"Union"}},{type:"Polygon",arcs:[[-5897,-9213,-1354,-5796,-8210]],id:"45011",properties:{name:"Barnwell"}},{type:"Polygon",arcs:[[9355,-324,-8136,-5449]],id:"49051",properties:{name:"Wasatch"}},{type:"MultiPolygon",arcs:[[[9356]],[[9357]],[[-6054,-8003,9358]],[[9359]]],id:"26089",properties:{name:"Leelanau"}},{type:"Polygon",arcs:[[-7274,-9016,-8840,-3065,-5262,-8586,-8686]],id:"17067",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[9360,-5732,-1489,9361,-1457]],id:"51193",properties:{name:"Westmoreland"}},{type:"Polygon",arcs:[[-3458,-7344,-3856,-8216,-9351,-5036,-8008]],id:"01123",properties:{name:"Tallapoosa"}},{type:"Polygon",arcs:[[-1671,-8356,-8574,9362,-9168]],id:"13075",properties:{name:"Cook"}},{type:"MultiPolygon",arcs:[[[-5191,9363]],[[9364]]],id:"26083",properties:{name:"Keweenaw"}},{type:"Polygon",arcs:[[-3126,-9269,-6968,-298,-1e3]],id:"28069",properties:{name:"Kemper"}},{type:"Polygon",arcs:[[-1035,-8364,-1828,-2080]],id:"39125",properties:{name:"Paulding"}},{type:"Polygon",arcs:[[-5800,-1427,-7295,-4510,-6359,-9279]],id:"47171",properties:{name:"Unicoi"}},{type:"Polygon",arcs:[[-8809,-4375,-8376,9365]],id:"13209",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[-9169,-9363,-8576,-7327,-7581,-7012]],id:"13027",properties:{name:"Brooks"}},{type:"Polygon",arcs:[[-3739,-9231,9366,-2811,-2812,-977,-1794,-6872]],id:"08075",properties:{name:"Logan"}},{type:"Polygon",arcs:[[-1737,-90,-6536,-904,-1860]],id:"39117",properties:{name:"Morrow"}},{type:"Polygon",arcs:[[-8672,-1855,9367,-9200,-9243,-2496]],id:"39119",properties:{name:"Muskingum"}},{type:"Polygon",arcs:[[-8493,-4695,9368,-6935]],id:"13051",properties:{name:"Chatham"}},{type:"Polygon",arcs:[[-8671,-8675,-1777,-7016,9369,-8339]],id:"13061",properties:{name:"Clay"}},{type:"Polygon",arcs:[[-9230,-8316,-7123,-2808,-9367]],id:"08115",properties:{name:"Sedgwick"}},{type:"Polygon",arcs:[[-3677,-7048,-8306,-8702,-1825,9370,-2889]],id:"12105",properties:{name:"Polk"}},{type:"Polygon",arcs:[[9371,-9082,-8881,-7759,-2262,-4802]],id:"48147",properties:{name:"Fannin"}},{type:"Polygon",arcs:[[-5950,-3316,-7335,-5891,-5817,-5505]],id:"21105",properties:{name:"Hickman"}},{type:"Polygon",arcs:[[-8643,-8650,-7660,-4246,-7736,-8930]],id:"01071",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-8578,-3406,-7852,-8214,9372]],id:"13215",properties:{name:"Muscogee"}},{type:"Polygon",arcs:[[9373,-8908,-3838,-7955,-4041,-2793,-8362]],id:"17195",properties:{name:"Whiteside"}},{type:"Polygon",arcs:[[9374,-8706,-8304,-2367,-7769]],id:"12009",properties:{name:"Brevard"}},{type:"Polygon",arcs:[[-3221,-8912,-1673,-9167,-7665,-7663,-8950]],id:"13321",properties:{name:"Worth"}},{type:"Polygon",arcs:[[-8611,-8331,-4610,-8969,-4992,-6244]],id:"13025",properties:{name:"Brantley"}},{type:"Polygon",arcs:[[-1733,-369,-9004,-2241,-491,-7589,-9350]],id:"40015",properties:{name:"Caddo"}},{type:"Polygon",arcs:[[9375,-9294,-9080,-8645,-8929,-7515,-1040]],id:"47103",properties:{name:"Lincoln"}},{type:"Polygon",arcs:[[-6657,-4726,-3136,-7239,-8038,9376]],id:"39111",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[9377,-4407,-7801,-8470]],id:"55081",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[-6137,-3735,-4691,-3759,-7528]],id:"45021",properties:{name:"Cherokee"}},{type:"Polygon",arcs:[[-5281,-4990,-174,-8501,-4149,-9354,-8855]],id:"55041",properties:{name:"Forest"}},{type:"Polygon",arcs:[[-763,-6807,-9290,-5151,-4499,9378]],id:"21067",properties:{name:"Fayette"}},{type:"Polygon",arcs:[[-357,-3948,-6281,-6425,-9088,-7159]],id:"36037",properties:{name:"Genesee"}},{type:"Polygon",arcs:[[9379,9380,9381,-6351,-8815]],id:"21229",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-7967,9382,-6595,9383,-4070,-3845]],id:"37117",properties:{name:"Martin"}},{type:"Polygon",arcs:[[-3201,-7527,-6734,-3849,-5645,-3967]],id:"40025",properties:{name:"Cimarron"}},{type:"Polygon",arcs:[[-4986,-6076,-5048,-5842,-4091]],id:"45067",properties:{name:"Marion"}},{type:"Polygon",arcs:[[-834,-8146,-1761,-8795,-2730,-277,9384,-6365]],id:"01039",properties:{name:"Covington"}},{type:"MultiPolygon",arcs:[[[9385]],[[9386]],[[-6979,-1937,-6927,9387,-6924]]],id:"06037",properties:{name:"Los Angeles"}},{type:"Polygon",arcs:[[-8575,-6853,-7373,-7058,-7329]],id:"12047",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[-6982,-8620,-9348,-9246,-8201,9388]],id:"12021",properties:{name:"Collier"}},{type:"Polygon",arcs:[[-2754,-5990,-1270,-8747,-4786,9389,-6035]],id:"20125",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[-3073,-5991,-5328,-6955,-3883,-5716,-819]],id:"17193",properties:{name:"White"}},{type:"Polygon",arcs:[[-466,-1590,-9275,-1630,-6972,-4036]],id:"29009",properties:{name:"Barry"}},{type:"Polygon",arcs:[[-78,-8899,-7071,-1555,-6327,-8900]],id:"26125",properties:{name:"Oakland"}},{type:"Polygon",arcs:[[-5368,-4411,-7365,-7732,-5175]],id:"19005",properties:{name:"Allamakee"}},{type:"Polygon",arcs:[[-6036,-9390,-4790,9390,-9334,-7649]],id:"40147",properties:{name:"Washington"}},{type:"Polygon",arcs:[[9391,-4372,-6255,-6544,-6078]],id:"30005",properties:{name:"Blaine"}},{type:"Polygon",arcs:[[-5731,9392,-1491]],id:"51103",properties:{name:"Lancaster"}},{type:"Polygon",arcs:[[-7111,-6245,-4995,-7323,-8993,-7614,-9258,-8851,-7374]],id:"12003",properties:{name:"Baker"}},{type:"Polygon",arcs:[[-1208,-7794,-6406,-7458,-4641,-8956]],id:"22127",properties:{name:"Winn"}},{type:"Polygon",arcs:[[-7473,-8818,-9295,-9376,-1039,-5338]],id:"47117",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[-1458,-9362,-1493,9393,-9137,-5908,-5490]],id:"51057",properties:{name:"Essex"}},{type:"Polygon",arcs:[[-453,-2739,-1157,-2928,-8652]],id:"18135",properties:{name:"Randolph"}},{type:"Polygon",arcs:[[9394,-706,-8849,-8450]],id:"30101",properties:{name:"Toole"}},{type:"Polygon",arcs:[[-3521,-8953,-5433,-5762,9395]],id:"23007",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-1273,-1079,-5200,-2565,9396,-1561]],id:"26045",properties:{name:"Eaton"}},{type:"Polygon",arcs:[[-8257,-1196,-9159,-2037,-6839,-2875,-5097,-5058]],id:"17167",properties:{name:"Sangamon"}},{type:"Polygon",arcs:[[9397,-3913,9398,-8876]],id:"25001",properties:{name:"Barnstable"}},{type:"Polygon",arcs:[[9399,-6633,-5252,-4337,-9053]],id:"30091",properties:{name:"Sheridan"}},{type:"Polygon",arcs:[[-7213,-8263,-6687,-969,-7926,-8560,-4066]],id:"35041",properties:{name:"Roosevelt"}},{type:"Polygon",arcs:[[-9271,-5203,-7169,-6558,-2911]],id:"40053",properties:{name:"Grant"}},{type:"Polygon",arcs:[[-7842,9400,-3376,-9330,9401,-5014,-9338]],id:"42133",properties:{name:"York"}},{type:"Polygon",arcs:[[-1701,-6157,-6373,-6908,-839,-8714]],id:"13237",properties:{name:"Putnam"}},{type:"Polygon",arcs:[[-9217,-7498,-8538,9402]],id:"13257",properties:{name:"Stephens"}},{type:"Polygon",arcs:[[-9218,-9403,-8539,-1845,-8878,-8583]],id:"13011",properties:{name:"Banks"}},{type:"Polygon",arcs:[[-5656,-9113,-1518,-3305,-6395,-2859,-8879]],id:"18073",properties:{name:"Jasper"}},{type:"Polygon",arcs:[[-3271,-620,-4932,-8885,-8655,-3279]],id:"20113",properties:{name:"McPherson"}},{type:"Polygon",arcs:[[-8882,-8617,-6185,-1324,9403,-3364]],id:"27097",properties:{name:"Morrison"}},{type:"Polygon",arcs:[[-5008,-6895,-1030,-5168,-6856,-5344]],id:"37183",properties:{name:"Wake"}},{type:"Polygon",arcs:[[-3507,-7229,-6339,-6903,-7523,-7302]],id:"28151",properties:{name:"Washington"}},{type:"Polygon",arcs:[[-8919,-8909,-9374,-8361,-6956,-258,-2543]],id:"19045",properties:{name:"Clinton"}},{type:"Polygon",arcs:[[-7438,-9308,-9017,-7561]],id:"36113",properties:{name:"Warren"}},{type:"Polygon",arcs:[[-9027,-836,-6367,9404,-2561,-7984]],id:"01099",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[-5346,-6855,-6616]],id:"37105",properties:{name:"Lee"}},{type:"Polygon",arcs:[[-9402,-9332,9405,-5432,-9263,-7080,-5015]],id:"24005",properties:{name:"Baltimore"}},{type:"Polygon",arcs:[[-8649,-640,-769,9406,-4541,-7326,-6878,-9325,-4200,-7659]],id:"47065",properties:{name:"Hamilton"}},{type:"Polygon",arcs:[[-137,9407,-9339,-5017,-7079,-5265,-3584]],id:"24021",properties:{name:"Frederick"}},{type:"Polygon",arcs:[[-5534,-1496,-5180,-5195,-4235]],id:"47097",properties:{name:"Lauderdale"}},{type:"Polygon",arcs:[[-7815,-7555,-46,-2738,-8782,-7838,-7550,-7741]],id:"36025",properties:{name:"Delaware"}},{type:"Polygon",arcs:[[-3987,-6152,-8896,-3460,-8007,-7904]],id:"01121",properties:{name:"Talladega"}},{type:"Polygon",arcs:[[-1562,-9397,-2570,-2988,-1140,-1278]],id:"26025",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[-8297,-9215,-9209,9408,-6231,-6844]],id:"08015",properties:{name:"Chaffee"}},{type:"Polygon",arcs:[[-1122,-4925,9409,-8083,-9158]],id:"17139",properties:{name:"Moultrie"}},{type:"Polygon",arcs:[[-8776,-6195,-7509,-9326,-3274,-7232]],id:"28107",properties:{name:"Panola"}},{type:"Polygon",arcs:[[-8074,-8372,-5850,-1927]],id:"30039",properties:{name:"Granite"}},{type:"Polygon",arcs:[[-9313,-6517,-4777,-8729,-6206,-4979]],id:"42091",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[-8014,-6676,-5650,9410,-5473,-4938,-5840]],id:"42061",properties:{name:"Huntingdon"}},{type:"Polygon",arcs:[[-8017,-9055,-8769,-6649,-8662]],id:"48157",properties:{name:"Fort Bend"}},{type:"Polygon",arcs:[[-5976,-9277,-1997,-4168,-6570]],id:"41013",properties:{name:"Crook"}},{type:"Polygon",arcs:[[-7966,-8144,-6470,9411,-6596,-9383]],id:"37015",properties:{name:"Bertie"}},{type:"Polygon",arcs:[[-8469,-2450,-9163,-5790,-9273,-4408,-9378]],id:"55057",properties:{name:"Juneau"}},{type:"Polygon",arcs:[[-2276,-7601,-9081,9412,-9252]],id:"40095",properties:{name:"Marshall"}},{type:"Polygon",arcs:[[-1660,-650,-7875,-7751,-7826,-4173]],id:"48331",properties:{name:"Milam"}},{type:"Polygon",arcs:[[-6056,-4050,-2751,-1293,-541]],id:"26165",properties:{name:"Wexford"}},{type:"Polygon",arcs:[[-8784,-5770,-9291,-2685,-2829]],id:"37159",properties:{name:"Rowan"}},{type:"Polygon",arcs:[[-764,-9379,-4498,9413,9414,-2631]],id:"21239",properties:{name:"Woodford"}},{type:"Polygon",arcs:[[-6892,-6997,-5689,-5690,-6677,9415]],id:"40059",properties:{name:"Harper"}},{type:"Polygon",arcs:[[-793,-6706,-6672,-9013,-2651,-391]],id:"55139",properties:{name:"Winnebago"}},{type:"Polygon",arcs:[[-4912,-9175,-281,-9232,-6684,-5706,-6347]],id:"21047",properties:{name:"Christian"}},{type:"Polygon",arcs:[[-2983,-773,-8698,-2531,-5343,-1146]],id:"37001",properties:{name:"Alamance"}},{type:"Polygon",arcs:[[-9289,-5617,-1260,-3688,-5153]],id:"21065",properties:{name:"Estill"}},{type:"Polygon",arcs:[[-3756,-4837,-6440,-3349,-6063,-9029,-9170]],id:"42129",properties:{name:"Westmoreland"}},{type:"Polygon",arcs:[[-5966,-4880,-9312,-1477,-1921,-5239]],id:"29195",properties:{name:"Saline"}},{type:"Polygon",arcs:[[9416,-713,-8630,-5472,-885,-562,-4754]],id:"46037",properties:{name:"Day"}},{type:"Polygon",arcs:[[9417,-7417,-3598,-9336,-1856,-1355,-6048]],id:"48029",properties:{name:"Bexar"}},{type:"Polygon",arcs:[[-1682,-8442,-4557,-7818,-7827,-7712,-7386,9418]],id:"51019",properties:{name:"Bedford"}},{type:"Polygon",arcs:[[-8626,-8888,-6664,-8270,-9315,-6882]],id:"39015",properties:{name:"Brown"}},{type:"Polygon",arcs:[[-9297,-6023,-9177,-8423,-9355,-1992,-5836]],id:"41059",properties:{name:"Umatilla"}},{type:"Polygon",arcs:[[-399,-5741,-9033,-8891,-5813]],id:"47129",properties:{name:"Morgan"}},{type:"Polygon",arcs:[[-8041,-1683,-9419,-7385,-7242,-4519],[-7353,-2789]],id:"51161",properties:{name:"Roanoke"}},{type:"Polygon",arcs:[[-8601,-8639]],id:"51630",properties:{name:"Fredericksburg"}},{type:"Polygon",arcs:[[-8348,-1666,-5591,-5085,-691,9419,-8281]],id:"53063",properties:{name:"Spokane"}},{type:"Polygon",arcs:[[-8039,-7240,-7237,-7282]],id:"54073",properties:{name:"Pleasants"}},{type:"Polygon",arcs:[[-9349,-9241,-6893,-9416,-6680,-1164,-5872,-6733]],id:"40007",properties:{name:"Beaver"}},{type:"Polygon",arcs:[[-3769,-6590,9420,-2574,-4848,-8235,-6271]],id:"47025",properties:{name:"Claiborne"}},{type:"Polygon",arcs:[[-1180,-5875,-5012,-4716,-6062,-4594,-6221,-5523]],id:"04001",properties:{name:"Apache"}},{type:"Polygon",arcs:[[-8829,-185,-8579,-9373,-8213,-3854]],id:"13145",properties:{name:"Harris"}},{type:"Polygon",arcs:[[-7519,-7576,-9084,-9008,-7571,-7578]],id:"12077",properties:{name:"Liberty"}},{type:"Polygon",arcs:[[-8131,-7758,9421,9422]],id:"28045",properties:{name:"Hancock"}},{type:"Polygon",arcs:[[9423,-4682,-7466,-8542,-1865,-9255]],id:"39007",properties:{name:"Ashtabula"}},{type:"Polygon",arcs:[[-2102,-6293,-3812,-9310,-7412]],id:"06021",properties:{name:"Glenn"}},{type:"Polygon",arcs:[[-8746,-7095,-8380,-8748,-8842,9424,-4788]],id:"40035",properties:{name:"Craig"}},{type:"Polygon",arcs:[[-6993,-8540,-7171,-5074,-8165]],id:"17087",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[-7089,-9194,-4961,-6947,-8333,-3710,-1247]],id:"29183",properties:{name:"St. Charles"}},{type:"Polygon",arcs:[[9425,-2756,-6038,-7648,-7166,-5201]],id:"20035",properties:{name:"Cowley"}},{type:"Polygon",arcs:[[-7304,-3692,-7269,-7971]],id:"22123",properties:{name:"West Carroll"}},{type:"Polygon",arcs:[[9426,-9118,-2112,-8478,-9037,-6738,-5750,-4075]],id:"38029",properties:{name:"Emmons"}},{type:"Polygon",arcs:[[-6416,9427,-8445,-8168,-8603]],id:"29181",properties:{name:"Ripley"}},{type:"Polygon",arcs:[[-8721,-175,-1242,9428,-8914]],id:"06087",properties:{name:"Santa Cruz"}},{type:"Polygon",arcs:[[-4257,-3863,-2873,-7411,9429]],id:"06023",properties:{name:"Humboldt"}},{type:"Polygon",arcs:[[-8476,-308,9430,-2378,-6449,-9038]],id:"46089",properties:{name:"McPherson"}},{type:"Polygon",arcs:[[-1055,-8282,-9420,-690,-8303,-7478,9431,-3452,-9176,-4522]],id:"53075",properties:{name:"Whitman"}},{type:"Polygon",arcs:[[9432,-8349,-8279,-3980]],id:"53019",properties:{name:"Ferry"}},{type:"Polygon",arcs:[[-6379,-167,-8951,-7661,-1779,-8674]],id:"13273",properties:{name:"Terrell"}},{type:"Polygon",arcs:[[-608,-1849,-8573,-9311,-8803,-6154,-8667]],id:"13221",properties:{name:"Oglethorpe"}},{type:"Polygon",arcs:[[-8050,-4443,-9219,-8872,-1436,-9057]],id:"30009",properties:{name:"Carbon"}},{type:"Polygon",arcs:[[-5495,-5561,-9303,-3741,-6871,-8009,-5229]],id:"56021",properties:{name:"Laramie"}},{type:"Polygon",arcs:[[-612,-1523,-3682,-74,-6475,-6848]],id:"18005",properties:{name:"Bartholomew"}},{type:"Polygon",arcs:[[-8942,-9286,-8870,-6453,-760,-6592,-6614]],id:"21081",properties:{name:"Grant"}},{type:"MultiPolygon",arcs:[[[9433]],[[-9193,9434,-8555,-4079,-3067]]],id:"39043",properties:{name:"Erie"}},{type:"Polygon",arcs:[[9435,-9414,-4502,-9345,-6352,-9382]],id:"21167",properties:{name:"Mercer"}},{type:"Polygon",arcs:[[-7199,-7203,-2018,-8474,-956,-33]],id:"27027",properties:{name:"Clay"}},{type:"Polygon",arcs:[[-5768,-6565,-5614,-9288,-6805]],id:"21173",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[-5769,-1149,-6619,-5628,-9292]],id:"37123",properties:{name:"Montgomery"}},{type:"Polygon",arcs:[[-8962,9436,-7378,-8651,-8593,-813,-8309]],id:"27053",properties:{name:"Hennepin"}},{type:"Polygon",arcs:[[-4107,-6265,-1286,-4910,-6346,-5806]],id:"21233",properties:{name:"Webster"}},{type:"Polygon",arcs:[[9437,-9317,-8751,-1514,-9112]],id:"18091",properties:{name:"LaPorte"}},{type:"Polygon",arcs:[[-2579,-6133,9438,-2406,-1267]],id:"20011",properties:{name:"Bourbon"}},{type:"Polygon",arcs:[[-9260,-2687,-9293,-5809,-4872,-5485]],id:"37179",properties:{name:"Union"}},{type:"Polygon",arcs:[[-7922,9439,-4512,-8100]],id:"51810",properties:{name:"Virginia Beach"}},{type:"Polygon",arcs:[[-8503,9440,-6838,-827,-6669,-6705,-8889]],id:"55009",properties:{name:"Brown"}},{type:"Polygon",arcs:[[-9409,-9208,-2222,-8035,-3114,-8029,-6232]],id:"08043",properties:{name:"Fremont"}},{type:"Polygon",arcs:[[9441,-9178,-7681,-6200,-7706,-7606]],id:"28067",properties:{name:"Jones"}},{type:"Polygon",arcs:[[-3128,-1900,-353,-7143,-7483,-4657,-9139]],id:"31181",properties:{name:"Webster"}},{type:"Polygon",arcs:[[-8101,-4516,9442,-7808,-7797,-8025]],id:"37029",properties:{name:"Camden"}},{type:"Polygon",arcs:[[-9185,-8094,-4549,-4128,-9235,-9244,-2412]],id:"48251",properties:{name:"Johnson"}},{type:"Polygon",arcs:[[-1724,-8298,-6842,-6117,-2043,-8848]],id:"08077",properties:{name:"Mesa"}},{type:"Polygon",arcs:[[-5744,-6545,-5483,-4472,-1913]],id:"30013",properties:{name:"Cascade"}},{type:"Polygon",arcs:[[-4933,-618,-1071,-338,-2757,-9426,-4576]],id:"20015",properties:{name:"Butler"}},{type:"Polygon",arcs:[[-6260,-5071,-5698,-8640,-1709,-8902]],id:"38025",properties:{name:"Dunn"}},{type:"Polygon",arcs:[[-5355,-4186,-325,-9356,-5448,-8192]],id:"49035",properties:{name:"Salt Lake"}},{type:"Polygon",arcs:[[-6774,9443,-4805,-8386,-8092,-226]],id:"48121",properties:{name:"Denton"}},{type:"Polygon",arcs:[[-2121,-4543,-115,-659,-1367,-4780,-9343,-6909,-584]],id:"46023",properties:{name:"Charles Mix"}},{type:"Polygon",arcs:[[-9318,-5237,-9296,-3623,-4554,-8441]],id:"51125",properties:{name:"Nelson"}},{type:"Polygon",arcs:[[-8693,-9327,-9183,-9283,-2551,-9117,-8779]],id:"38103",properties:{name:"Wells"}},{type:"Polygon",arcs:[[-1744,-9116,-1116,-8546,-1801,-3942]],id:"17143",properties:{name:"Peoria"}},{type:"Polygon",arcs:[[-6208,-8731,-9282,-7897,-4295,-9305,-5021]],id:"34015",properties:{name:"Gloucester"}},{type:"Polygon",arcs:[[-623,-5531,-5497,-7379,-9437,-8961]],id:"27003",properties:{name:"Anoka"}},{type:"Polygon",arcs:[[-307,-7475,-714,-9417,-4753,-7704,-2379,-9431]],id:"46013",properties:{name:"Brown"}},{type:"Polygon",arcs:[[-5687,-2913,-6562,-1334,-366,-9250,-5691]],id:"40093",properties:{name:"Major"}},{type:"Polygon",arcs:[[-887,-5471,-5130,-7781,-3500,-9072,-9197]],id:"46039",properties:{name:"Deuel"}},{type:"Polygon",arcs:[[-1944,9444]],id:"02230",properties:{name:"Skagway"}},{type:"Polygon",arcs:[[-1572,-6149,-5933,-6148,-4530,-7293,-1425,-4969]],id:"47163",properties:{name:"Sullivan"}},{type:"Polygon",arcs:[[-6267,-5325,9445]],id:"44001",properties:{name:"Bristol"}},{type:"Polygon",arcs:[[-8236,-4852,-6452,-5384,-5951,-4124,-9034,-5739]],id:"47093",properties:{name:"Knox"}},{type:"Polygon",arcs:[[-8510,-785,-1424,-5231,-434,-6986,-8258,-5780]],id:"56007",properties:{name:"Carbon"}},{type:"Polygon",arcs:[[-5414,-6714,-206,-3371,-9401,-7841,-8443]],id:"42043",properties:{name:"Dauphin"}},{type:"Polygon",arcs:[[-7370]],id:"51580",properties:{name:"Covington"}},{type:"Polygon",arcs:[[-2695,-9274,-7541,-8524,-8516,-7682]],id:"55049",properties:{name:"Iowa"}},{type:"Polygon",arcs:[[-6726,-8895,-6723,-8894,-766,-638,-5605]],id:"47175",properties:{name:"Van Buren"}},{type:"Polygon",arcs:[[-2778,-7418,-9418,-6047,-1842,-8370]],id:"48019",properties:{name:"Bandera"}},{type:"Polygon",arcs:[[-8794,-9065,-3669,-2732]],id:"12059",properties:{name:"Holmes"}},{type:"Polygon",arcs:[[-5222,-464,-9097]],id:"41055",properties:{name:"Sherman"}},{type:"Polygon",arcs:[[-8340,-9370,-7015,-8796,-8155]],id:"01067",properties:{name:"Henry"}},{type:"Polygon",arcs:[[-8552,-8119,-5402,-7226,-5393,-7628,-8515]],id:"05139",properties:{name:"Union"}},{type:"Polygon",arcs:[[-7718,-8049,-6819,-9050,-7221,-8400]],id:"54031",properties:{name:"Hardy"}},{type:"Polygon",arcs:[[-8938,-5759,9446,-7954,-4221,-5003,-1050,-8864]],id:"22017",properties:{name:"Caddo"}},{type:"Polygon",arcs:[[-2475,-7361,-6960,-3860]],id:"41029",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-6959,-3954,-7831,-8299,-529,-3862]],id:"06049",properties:{name:"Modoc"}},{type:"Polygon",arcs:[[-7192,-5271,-8937,-6061,-9239,-3257]],id:"28003",properties:{name:"Alcorn"}},{type:"Polygon",arcs:[[-9e3,-8302,-3197,-6943,-2213]],id:"08011",properties:{name:"Bent"}},{type:"Polygon",arcs:[[-7456,-6849,-6477,-64,-3285,-6304]],id:"18105",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[-8130,-9069,9447,-3888]],id:"21029",properties:{name:"Bullitt"}},{type:"Polygon",arcs:[[-1854,-6658,-9377,-8037,-9201,-9368]],id:"39121",properties:{name:"Noble"}},{type:"Polygon",arcs:[[-4117,-2632,-9415,-9436,-9381,9448,-9067]],id:"21005",properties:{name:"Anderson"}},{type:"Polygon",arcs:[[-9448,-9068,-9449,-9380,-8814,-5568,-3889]],id:"21179",properties:{name:"Nelson"}},{type:"Polygon",arcs:[[-6769,-5140,-9188,-4188,-5357]],id:"49057",properties:{name:"Weber"}},{type:"Polygon",arcs:[[-6757,-5928,-1182,-682,-3,-7762]],id:"49025",properties:{name:"Kane"}},{type:"Polygon",arcs:[[-3180,-8775,-7892,-7953,-9447,-5758,-5548]],id:"05091",properties:{name:"Miller"}},{type:"Polygon",arcs:[[-6920,-7357,-5729,9449,-9328,-9237]],id:"45079",properties:{name:"Richland"}},{type:"Polygon",arcs:[[-9259,-7612,-8248,-2362,-7767,9450,-5147]],id:"12107",properties:{name:"Putnam"}},{type:"Polygon",arcs:[[9451,-5714,-8541,-6991,-7086,-9133]],id:"17077",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-9384,-6600,-6902,9452,-6593,-3778,-4071]],id:"37013",properties:{name:"Beaufort"}},{type:"Polygon",arcs:[[-330,-6428,-7772,9453]],id:"36123",properties:{name:"Yates"}},{type:"Polygon",arcs:[[-7858,-3321,-5757,-9314,-3333,-1170,-5624]],id:"47111",properties:{name:"Macon"}},{type:"Polygon",arcs:[[-4183,-929,-5350,-8660,9454]],id:"48323",properties:{name:"Maverick"}},{type:"Polygon",arcs:[[-958,-8475,-6482,-6034,-7097,-8629]],id:"27155",properties:{name:"Traverse"}},{type:"Polygon",arcs:[[-8485,-8527,-9012,-4421,-9344,-7833]],id:"32001",properties:{name:"Churchill"}},{type:"Polygon",arcs:[[-4906,-5554,-8530,-1419,-5638,-6607]],id:"56005",properties:{name:"Campbell"}},{type:"Polygon",arcs:[[-7513,-7711,-9190,-5225,-9203,-7956,-5371]],id:"53059",properties:{name:"Skamania"}},{type:"Polygon",arcs:[[-1889,-2372,-8414,-8568,-3381,-8911,-3219]],id:"13315",properties:{name:"Wilcox"}},{type:"Polygon",arcs:[[-8893,-9036,-4537,-9407,-768]],id:"47143",properties:{name:"Rhea"}},{type:"Polygon",arcs:[[-1263,-6345,-5352,-4931,-5543,-3646]],id:"21025",properties:{name:"Breathitt"}},{type:"Polygon",arcs:[[-6132,-7142,-275,-1906,-1545,-2407,-9439]],id:"29217",properties:{name:"Vernon"}},{type:"Polygon",arcs:[[-9405,-6366,-9385,-276,-7652,-9092,-2562]],id:"01053",properties:{name:"Escambia"}},{type:"Polygon",arcs:[[-5148,-9451,-7770,-7045,-3675,-7521,-7108]],id:"12083",properties:{name:"Marion"}},{type:"Polygon",arcs:[[-9432,-7482,-8421,-3453]],id:"53003",properties:{name:"Asotin"}},{type:"Polygon",arcs:[[-9061,-8740,-8434,-8446,-9428,-6415]],id:"29023",properties:{name:"Butler"}},{type:"Polygon",arcs:[[-7087,-6996,-8904,-5913,-8739,-6410]],id:"29031",properties:{name:"Cape Girardeau"}},{type:"Polygon",arcs:[[-5334,-6533,-1575,-2571,-9421,-6589]],id:"51105",properties:{name:"Lee"}},{type:"Polygon",arcs:[[-2849,-9066,-2287,-7738,-9031,-8043]],id:"01043",properties:{name:"Cullman"}},{type:"Polygon",arcs:[[-4924,-3342,-7201,-3248,-8084,-9410]],id:"17029",properties:{name:"Coles"}},{type:"Polygon",arcs:[[-9128,-7309,-2430,-5701,-6394]],id:"18015",properties:{name:"Carroll"}},{type:"MultiPolygon",arcs:[[[9455]],[[-7981,-7003,9456,-7863]]],id:"22075",properties:{name:"Plaquemines"}},{type:"Polygon",arcs:[[-5582,-427,-9224,-876,-8957]],id:"31091",properties:{name:"Hooker"}},{type:"Polygon",arcs:[[-5069,-8781,-9119,-9427,-4074,-4013]],id:"38015",properties:{name:"Burleigh"}},{type:"Polygon",arcs:[[-5456,-3799,-7369,-8042,-7371]],id:"54063",properties:{name:"Monroe"}},{type:"Polygon",arcs:[[-7299,-8012,-7470,-4782,-9233]],id:"47021",properties:{name:"Cheatham"}},{type:"Polygon",arcs:[[-6860,-7569,-5660,-9077,-6715,-6580,-7133]],id:"42015",properties:{name:"Bradford"}},{type:"Polygon",arcs:[[-9346,-4581,-4120,-8128,-7043]],id:"21185",properties:{name:"Oldham"}},{type:"Polygon",arcs:[[-6975,-7421,-3662,-2143,-9005,-7564]],id:"05101",properties:{name:"Newton"}},{type:"Polygon",arcs:[[-8488,-9337,-8927,-1579,-7352,-5400,-9299,-8688,-5062]],id:"33009",properties:{name:"Grafton"}},{type:"Polygon",arcs:[[-6670,-830,9457,-5373,-9134,-9014]],id:"55117",properties:{name:"Sheboygan"}},{type:"Polygon",arcs:[[-2821,-9179,-9442,-7605,-6537,-6484]],id:"28129",properties:{name:"Smith"}},{type:"Polygon",arcs:[[-8055,-8132,-9423,9458,-7979,-7861,-9032,-12]],id:"22103",properties:{name:"St. Tammany"}},{type:"Polygon",arcs:[[-9142,-9135,-5267,-7082,-9265,-8766,-9075,-9352]],id:"24033",properties:{name:"Prince George's"}},{type:"Polygon",arcs:[[-1331,-3365,-9404,-1323,-8963,-8307,-309,-823,-9199]],id:"27145",properties:{name:"Stearns"}},{type:"Polygon",arcs:[[-9101,-7292,-3488,-5563,-3486,-5564,-7946]],id:"25017",properties:{name:"Middlesex"}},{type:"Polygon",arcs:[[-5474,-9411,-5649,-8444,-7844,-9340,-9408,-136]],id:"42055",properties:{name:"Franklin"}},{type:"Polygon",arcs:[[-9161,-2664,-5715,-9452,-9132]],id:"17145",properties:{name:"Perry"}},{type:"Polygon",arcs:[[-5245,-4231,-1249,-3714,-7780,-4819,-5243]],id:"29073",properties:{name:"Gasconade"}},{type:"Polygon",arcs:[[-1160,-8363,-7949,-2706,-9180]],id:"18161",properties:{name:"Union"}},{type:"Polygon",arcs:[[-8334,-8294,-8634,-8811,-2853,-3712]],id:"29099",properties:{name:"Jefferson"}},{type:"Polygon",arcs:[[-9391,-4789,-9425,-8843,-3742,-9335]],id:"40131",properties:{name:"Rogers"}},{type:"Polygon",arcs:[[-9450,-5728,-4968,-9212,-9329]],id:"45017",properties:{name:"Calhoun"}},{type:"Polygon",arcs:[[-3788,-7283,-6702,-7676,-7449,-8676,9459]],id:"54035",properties:{name:"Jackson"}},{type:"Polygon",arcs:[[-2647,-9256,-8663,-5917,-4429,-8624]],id:"48239",properties:{name:"Jackson"}},{type:"MultiPolygon",arcs:[[[-598,-8284,9460]]],id:"53035",properties:{name:"Kitsap"}},{type:"Polygon",arcs:[[-2890,-9371,-8830,9461,-7586]],id:"12057",properties:{name:"Hillsborough"}},{type:"Polygon",arcs:[[-8099,-9011,-1510,-4661]],id:"17043",properties:{name:"DuPage"}},{type:"Polygon",arcs:[[-8680,-4701,-7869,-7153,-8324,-8921]],id:"34031",properties:{name:"Passaic"}},{type:"Polygon",arcs:[[-9253,-9413,-9083,-9372,-4801,-9444,-6773]],id:"48181",properties:{name:"Grayson"}},{type:"Polygon",arcs:[[-4566,-9366,-8375,-9094]],id:"13283",properties:{name:"Treutlen"}},{type:"Polygon",arcs:[[-420,-85,-9086,-2461,-8857,-2952,-2314]],id:"28155",properties:{name:"Webster"}},{type:"Polygon",arcs:[[-8742,-878,-9225,-9130,-7121,-8315]],id:"31101",properties:{name:"Keith"}},{type:"Polygon",arcs:[[-7699,-4318,-9220,-7701,-7686]],id:"28001",properties:{name:"Adams"}},{type:"Polygon",arcs:[[-3946,-717,-331,-9454,-7771,-6282]],id:"36069",properties:{name:"Ontario"}},{type:"Polygon",arcs:[[-3789,-9460,-8678,-6286,-3793]],id:"54053",properties:{name:"Mason"}},{type:"Polygon",arcs:[[-686,-3657,-6165,-2937,-5]],id:"04025",properties:{name:"Yavapai"}}]},states:{type:"GeometryCollection",geometries:[{type:"MultiPolygon",arcs:[[[-1181,-1180,-5875,-5012,-4716,-6062,4594,-3582,4595,-4710,6914,248,4591,5526,5524,2939,2935,-1934,6,7,0,1,2,681,682]]],id:"04",properties:{name:"Arizona"}},{type:"MultiPolygon",arcs:[[[-8132,-9423,9458,7979,7001,9456,7863,8064,8177,8061,8178,4159,4626,3698,3894,3895,-3616,-3615,5341,-8802,6323,5513,5514,5515,5005,-1051,-1050,-8864,-8938,-5759,9446,7952,-7891,5272,5273,7626,7627,5392,-7225,-7305,-7304,3692,3693,-3523,-3522,-3530,-3529,-3528,7697,-4319,7698,7685,7686,7060,7052,-2376,-2375,8,9,-2050,8052,-7506,8053]],[[4627]],[[6999]],[[7e3]],[[8059]],[[8175]],[[8176]],[[9455]]],id:"22",properties:{name:"Louisiana"}},{type:"MultiPolygon",arcs:[[[8716,-6573,8717,-8762,7104,-8761,-2845,-2844,8124,3107,7480,7481,7477,8302,689,690,5084,5590,-1665,1190,1187,1188,-5143,-2230,-2229,4001,-5784,8058,3105,-1930,-1929,-1467,-1466,-1465,5573,-5308,5574,-6106,3904,3905,-4379,-4385,8146,-5138,3875,3876,3208,3209,7897]]],id:"16",properties:{name:"Idaho"}},{type:"MultiPolygon",arcs:[[[5042,5040,2137,9308,7194,2762,3948,3416,3949,2764,2765,1689,-7618,-7536,5528,5529,5498,5499,-5480,-5479,-5478,-6093,-6092,-6730,-6729,-8958,-7802,5366,-4412,5367,-5174,-5173,-440,-439,-2665,6328,1306,1307,5540,5541,2621,-2598,-2597,5446,-3643,3030,3031,701,-95,1454,3501,3499,7780,5129,5130,-5470,7098,-8629,-958,-957,-956,-33,-32,-5935,27,28,-6205,-4145,-5885]]],id:"27",properties:{name:"Minnesota"}},{type:"MultiPolygon",arcs:[[[31,32,955,956,957,958,-711,7474,306,307,8475,8476,-9037,-6738,5750,-6737,-3591,-6698,-6697,-6014,676,-6013,-3566,-3565,-3842,-4338,5251,6632,6630,9109,455,2075,3108,1580,2601,5883,-5043,5884,4144,6204,-29,-28,5934]]],id:"38",properties:{name:"North Dakota"}},{type:"MultiPolygon",arcs:[[[1367,-6053,-6015,6696,6697,3590,6736,-5751,6737,9036,-8477,-8476,-308,-307,-7475,710,-959,8628,-7099,5469,-5131,-5130,-7781,-3500,-3502,-1455,94,95,5888,5889,4757,-4573,-3466,4758,4759,4858,4859,5853,5854,4778,-9343,-6909,584,585,6753,3043,315,-5580,-8496,-2470,2421,2422,2423,4349,4350,4747,39,40,1371]]],id:"46",properties:{name:"South Dakota"}},{type:"MultiPolygon",arcs:[[[-7549,-7567,6858,6859,7132,-6579,-6578,-7722,2783,2784,8531,8532,8598,-4679,8596,9088,7160,354,3944,714,9061,3536,6128,4313,7693,8437,-8022,8438,7434,7435,-9228,-5973,-8389,-8390,-5115,-5121,-5120,-8791,-7870,7866,7154,7155,8843,8695,3561,6125,3559,8696,8518,4308,4303,4304,-7150,-7149,-7148,7868,4700,4701,4702,-6609,-7551,-7550]],[[6123]],[[6124]],[[6126]],[[6129]],[[8776,-8507,8777,-7216]]],id:"36",properties:{name:"New York"}},{type:"MultiPolygon",arcs:[[[8463,1946,1386,8229,1985,8988,8853,8772,8990,1971,1978,1961,1973,719,1974,6161,4742,6163,4744,484,9123,1706,3424,2295,2668,1983,8228,1384,1947,9444,1944,8461,1373,1593,48,8226,3032,8227,50,1594,1375,8462,1377]],[[51]],[[52]],[[1379,8460]],[[1382,3051]],[[1591,3038]],[[1953]],[[1954]],[[1955]],[[1956]],[[1957]],[[1958]],[[1959]],[[1962]],[[1963]],[[1964]],[[1965]],[[1966]],[[1967]],[[1968]],[[1969]],[[1979]],[[1980]],[[3034]],[[3035]],[[3036]],[[3037]],[[3039,3049]],[[3050]],[[4745]],[[4746]],[[6162]],[[8224]],[[8225]],[[8969]],[[8970]],[[8971]],[[8972]],[[8973]],[[8974]],[[8975]],[[8976]],[[8977]],[[8978]],[[8979]],[[8980]],[[8981]],[[8982]],[[8983]],[[8984]],[[8985]],[[8986]],[[8987]],[[8989]],[[9122]],[[9124]]],id:"02",properties:{name:"Alaska"}},{type:"MultiPolygon",arcs:[[[3830,-4435,-4248,4204,-4247,7659,7657,7658,4199,9324,6877,6878,3867,3868,2023,2024,-7942,-7494,-7493,-7492,-7430,-7500,-7499,-7498,-7497,6298,-4347,-4346,-5828,-5723,-5722,-5721,8401,-9198,-5899,-5898,8209,-5798,-5797,-5301,-5300,-4696,-4695,9368,6935,4272,9297,4607,8967,-7320,4993,4994,6244,7110,7111,6851,6852,8574,-7328,-7327,-7581,7012,7013,2009,2010,804,805,7666,7667,7018,7014,9369,-8339,-8338,-8337,-7853,3409,-7852,-8214,-8213,-3854,-3853,-7343,3415,-7342,-8897,56,5578,-4436]]],id:"13",properties:{name:"Georgia"}},{type:"MultiPolygon",arcs:[[[5436,7130,-3340,-3339,8085,-8238,2862,2856,-8710,-8122,5657,5651,5652,5653,9110,9437,-9317,8749,-7116,5089,-2658,2537,-1143,-1142,-2992,-6647,-6646,-1037,-1036,2079,-1834,-1833,8230,450,451,-2739,1157,1158,-8363,-7949,2706,-8824,-8943,4301,7133,-6615,-2973,-2978,7146,7041,7042,7043,4269,7525,-3886,-6586,4264,4670,-4101,-4488,-4487,-6999,-6998,-6263,-6262,3879,3880,3881,3882,6954,-5327,4676,-4630,4671,5439]]],id:"18",properties:{name:"Indiana"}},{type:"MultiPolygon",arcs:[[[7022,8897,7072,8070,-3542,-3541,7183,2989,2990,2991,1141,1142,-2538,2657,-5090,7115,-8750,9316,9315,8945,9332,5620,1302,4644,1296,543,8003,9358,6054,2505,7178,8067,9055,9008,3509,8380,8653,3093,3497,8102,8181,445]],[[-4989,5280,5281,3514,3515,3511,8698,5189,9363,5191,4283,8607,4913,2150,7314,7317,7614,9284,1606,-171,-170,3925]],[[7179]],[[7180]],[[7181]],[[7316]],[[9283]],[[9356]],[[9357]],[[9359]],[[9364]]],id:"26",properties:{name:"Michigan"}},{type:"MultiPolygon",arcs:[[[-7993,-7994,-7996,-6969,-6968,298,299,-6962,-6967,7678,-8081,-8346,-8345,-8344,9165,7756,9421,9422,8131,-8054,7505,-8053,2049,-10,-9,2374,2375,-7053,-7061,-7687,-7686,-7699,4318,-7698,3527,3528,3529,3521,3522,-3694,-7303,-7302,3507,3502,3503,-7027,-7026,7232,7229,7077,-4356,-4355,7116,-8387,-7193,3255,-7192,-5271,-8937,6057,-4034,-4587,-4736,-4739,8683,8725,-7990]],[[7753]],[[7754]],[[9163]],[[9164]]],id:"28",properties:{name:"Mississippi"}},{type:"MultiPolygon",arcs:[[[1035,1036,6645,6646,-2991,-2990,-7184,3540,3541,3542,9191,9434,8552,8711,9253,9423,-4682,-7466,-7465,-5676,-5675,-5672,-5671,-962,7405,-7888,-6161,-7937,6655,-4723,-4726,-3136,-7239,-7241,8038,-7281,-7280,3786,3787,3788,3792,3793,-6285,8605,-5823,8606,8459,-5206,-5212,8272,-9315,-6882,-6881,8626,-7049,-7052,8821,8822,8823,-2707,7948,8362,-1159,-1158,2738,-452,-451,-8231,1832,1833,-2080]],[[9190]],[[9433]]],id:"39",properties:{name:"Ohio"}},{type:"MultiPolygon",arcs:[[[8536,5634,6755,7673,8963,-7345,-4667,-4666,-4665,-4817,-4816,-4815,-7927,3618,3003,1657,472,967,968,6686,6687,-8262,158,159,-7211,-7210,-3969,-3968,5644,3848,3849,587,5870,5871,1163,1164,2481,2482,3237,-504,-503,-8806,474,8784,-6694,-6693,6776,7259,-3554,-3553,-4529,-4528,8824,6771,-9253,-9413,-9083,-9082,8879,-4323,-4322,-7936,5546,-3181,5547,5757,5758,8937,8863,1049,1050,-5006,-5516,-5515,-5514,-6324,8801,-5342,3614,3615,-3896,5212,3974,9299,3976,8766,9301,6651,9300,6653,5919,4430,3603,8390,8752,6273,7261,9e3,7263,6275,8753,8392,3601,4431,5867,3605,4427,3607,5868,3609,8217,8393,8754,6277,7264,9001,7725,8919,3600,8660,9454,4183,8947]]],id:"48",properties:{name:"Texas"}},{type:"MultiPolygon",arcs:[[[-7009,-5027,-2813,127,123,-2809,7122,8315,9229,9230,3738,3739,3740,9302,-5560,-5559,-5558,-7139,-2423,-2422,2469,8495,5579,-316,-3044,-6754,-586,-585,6908,9342,-4779,-5855,-5854,-4860,-4859,-4760,-4759,-3465,-3464,8481,-8801,-7205,5215,-3472,-3471,-3470,-3558,-3557,-5053,4646,4647,-5996,7996,4016,4017,4018,4019,3234,3235,-7486,-2916,-2915,-7914,7144,7145,-7483,-4657,-4656,-2508,-2507,-144,-143,-2839,-2838,4022,1541]]],id:"31",properties:{name:"Nebraska"}},{type:"MultiPolygon",arcs:[[[131,132,575,576,-5873,3866,-1179,-1178,-1177,-1176,-8848,1724,1718,-7382,-7381,-4178,-5781,8257,6985,433,434,-5230,8008,6870,-3740,-3739,-9231,-9230,-8316,-7123,2808,-124,-128,2812,2813,-5029,-3165,-1156,-1155,-5093,-5095,-5094,-2762,-6940,3198,3199,3200,3201,-3966,6943,6868,-5745]]],id:"08",properties:{name:"Colorado"}},{type:"MultiPolygon",arcs:[[[-9402,9329,-3375,-3374,-4982,-5026,-5025,5258,-7102,946,947,5081,4279,9107,9108,-8833,-8832,9104,4282,5082,5416,8838,5260,7020,9330,9405,5429,9263,8763,4632,9075,9073,-9352,-9142,-9135,5267,5268,-3585,-3584,137,138,139,140,293,294,295,5182,5183,5184,5180,5181,290,291,292,134,135,9407,-9339,5012,5013]],[[5079,9106]],[[-8837,9105]]],id:"24",properties:{name:"Maryland"}},{type:"MultiPolygon",arcs:[[[4655,4656,7482,-7146,-7145,7913,2914,2915,7485,-3236,-3235,-4020,-4019,-4018,4414,4415,4416,-6052,7389,8275,8657,-7188,-5664,-5668,-8005,3897,3898,6130,6131,9438,2406,-1549,2407,-3929,-1587,7093,7094,8745,-4787,-4786,9389,6035,6036,-7648,-7166,5201,5202,9270,-2910,694,695,-5686,6996,6891,6892,9240,9348,-6732,3932,-6731,7526,-3200,-3199,6939,2761,5093,5094,5092,1154,1155,3164,5028,-2814,5026,7008,-1543,-1542,-4023,2837,2838,142,143,2506,2507]]],id:"20",properties:{name:"Kansas"}},{type:"MultiPolygon",arcs:[[[8709,-2857,-2863,8237,-8086,3338,3339,-7131,-5437,-5440,-4672,4629,-4677,5326,-6955,-3883,-3882,-4110,-4109,-5805,-5285,-5284,5075,5076,-5294,8165,8902,-5502,-5914,8903,6995,6989,-7086,-7085,-8635,8292,8293,8290,3091,3085,-4935,6945,6946,4960,9193,-7088,-4956,4329,4330,-3576,-3575,8586,-8686,-7274,-9016,8840,-4334,-4333,5171,-7354,-3549,-6957,8360,9373,8908,8909,3938,3939,3934,3935,4260,4258,934,935,-3016,8900,4650,-3993,-3992,9147,8096,-5653,-5652,-5658,8121]]],id:"17",properties:{name:"Illinois"}},{type:"MultiPolygon",arcs:[[[169,170,171,8501,9440,6834,8490,6836,828,9457,5373,8467,7773,3990,3991,3992,-4651,-8901,3015,-936,-935,-4259,-4261,-3936,-3935,-4615,7683,7363,7364,4410,4411,-5367,7801,8957,6728,6729,6091,6092,5477,5478,5479,-5500,-5499,-5530,-5529,7535,7617,-1690,-2766,7616,4402,9048,7252,-3516,-3515,-5282,-5281,4988,-3926]],[[4401]],[[8488]],[[8489]],[[9041]],[[9042]],[[9043]],[[9044]],[[9045]],[[9046]],[[9047]]],id:"55",properties:{name:"Wisconsin"}},{type:"MultiPolygon",arcs:[[[8914,8160,8912,8718,9139,8158,9140,7032,7916,7631,8251,7633,7414,9429,4257,-3122,-2477,-2476,3859,3860,-6959,-3954,-7831,-7830,931,2466,-7837,8788,-8114,1216,3856,-8113,8930,-4423,-2525,-2524,4829,4830,1932,-7,1933,-2936,-2940,-5525,5588,8931,6929,9387,6924,2869,8883,1244,9428]],[[2863]],[[2864]],[[2865]],[[6921]],[[6925]],[[9385]],[[9386]]],id:"06",properties:{name:"California"}},{type:"MultiPolygon",arcs:[[[4572,-4758,-5890,-5889,-96,-702,-3032,-3031,3642,-5447,2596,2597,-2622,-5542,-5541,-1308,-1307,-6329,2664,438,439,5172,5173,-5368,-4411,-7365,-7364,-7684,4614,-3940,-3939,-8910,-8909,-9374,-8361,6956,3548,7353,-5172,4332,4333,-8841,9015,-7273,2059,-1643,-1642,3058,4611,4612,667,668,5102,5103,1092,1093,-8183,-8222,7355,-5993,5054,-4647,5052,3556,3557,3469,3470,3471,-5216,7204,8800,-8482,3463,3464,3465]]],id:"19",properties:{name:"Iowa"}},{type:"MultiPolygon",arcs:[[[-9330,9401,-5014,-5013,9338,-9408,-136,-135,-293,-292,-291,-5182,-5181,-5186,9029,2303,2304,2305,-4725,-7938,-6159,-7887,966,961,5670,5671,5674,5675,7464,7465,4681,4677,4678,-8599,-8533,-8532,-2785,-2784,7721,6577,6578,-7133,-6860,-6859,7566,7548,7549,7550,6608,-4703,6609,7173,-6140,5509,4772,-4362,4773,4774,-8090,8729,8730,6207,-5020,4980,4981,3373,3374]]],id:"42",properties:{name:"Pennsylvania"}},{type:"MultiPolygon",arcs:[[[7286,9051,9399,-6633,-5252,4337,3841,3564,3565,6012,-677,6013,6014,6052,-1368,-5552,4904,4905,4906,-6606,-8873,-8872,-1436,-1435,-1442,5306,5307,-5574,1464,1465,1466,1928,1929,-3106,-8059,5783,-4002,2228,2229,5142,-1189,5141,2176,8448,9394,706,6076,9391,4368]]],id:"30",properties:{name:"Montana"}},{type:"MultiPolygon",arcs:[[[-3899,-3898,8004,5667,5663,7187,-8658,-8276,-7390,6051,-4417,-4416,-4415,-4017,-7997,5995,-4648,-5055,5992,-7356,8221,8182,-1094,-1093,-5104,-5103,-669,-668,-4613,-4612,-3059,1641,1642,-2060,7272,7273,8685,-8587,3574,3575,-4331,-4330,4955,7087,-9194,-4961,-6947,-6946,4934,-3086,-3092,-8291,-8294,-8293,8634,7084,7085,-6990,-6996,-8904,5913,5501,5502,5503,5504,5505,-5820,8521,-5822,8522,3569,3570,3571,-4233,8436,8431,8432,-8446,-8445,-8168,-8171,-7856,-4243,-4242,-4241,-7918,8997,9002,-7419,-6973,1628,-6972,-4036,466,467,468,1590,1586,3928,-2408,1548,-2407,-9439,-6132,-6131]]],id:"29",properties:{name:"Missouri"}},{type:"MultiPolygon",arcs:[[[-8793,-8797,-7667,-806,-805,-2011,-2010,-7014,-7013,7580,7326,7327,-8575,-6853,-6852,-7112,-7111,-6245,-4995,-4994,7319,7320,8991,8246,2359,7767,9374,8706,3056,1762,4602,9346,9247,8194,9244,8196,9248,8202,9388,6982,6949,6984,6951,8569,8830,9461,7586,2893,7584,2891,6931,7521,7109,1696,9323,7582,9006,7572,7578,2345,2733,278,7652,9092,-2563,9091,7651,275,276,2729,2730,-8794]],[[6983]],[[7569]],[[8197]],[[8198]],[[8199]],[[8203]],[[8204]],[[8205]],[[8206]]],id:"12",properties:{name:"Florida"}},{type:"MultiPolygon",arcs:[[[5706,-6686,-5958,3313,3314,-7335,-5891,5817,5818,5819,-5506,-5505,-5504,-5503,-8903,-8166,5293,-5077,-5076,5283,5284,5804,4108,4109,-3881,-3880,6261,6262,6997,6998,4486,4487,4100,-4671,-4265,6585,3885,-7526,-4270,-7044,-7043,-7042,-7147,2977,2972,6614,-7134,-4302,8942,-8823,-8822,7051,7048,-8627,6880,6881,9314,-8273,5211,5205,-8460,-8607,5822,5823,5107,5361,5362,5608,5609,5610,5611,-6530,5332,5333,6588,6589,3768,3769,-6270,-396,-395,4113,-7670,-5753,4619,3319,3320,7857,-5623,-5622,-7297,-7296,283,284,-9232,-6684]],[[5820,5821]]],id:"21",properties:{name:"Kentucky"}},{type:"MultiPolygon",arcs:[[[3172,7065,3174,3481,7068,9286,4797,5771,941,942,943,944,5763,-1577,5764,9395,3516,289,703]],[[3167]],[[3168]],[[3169]],[[3170]],[[3478]],[[7066]],[[7067]]],id:"23",properties:{name:"Maine"}},{type:"MultiPolygon",arcs:[[[319,320,4176,4177,7380,7381,-1719,-1725,8847,1175,1176,1177,1178,1179,1180,-683,-682,-3,-2,-4292,-4291,-4290,-4289,8188,8139,8192,8190,6770,-3209,-3877,-3876,5137,-8147,-4384,-8357]]],id:"49",properties:{name:"Utah"}},{type:"MultiPolygon",arcs:[[[-2482,-1165,-1164,-5872,-5871,-588,-3850,-3849,-5645,-3967,-3201,-7527,6730,-3933,6731,-9349,-9241,-6893,-6892,-6997,5685,-696,-695,2909,-9271,-5203,-5202,7165,7647,-6037,-6036,-9390,4785,4786,-8746,-7095,-7094,-1591,-469,-468,-4040,-4039,-3186,7489,-7504,-8708,-8709,-4256,-6916,-6918,7934,-3182,-5547,7935,4321,4322,-8880,9081,9082,9412,9252,-6772,-8825,4527,4528,3552,3553,-7260,-6777,6692,6693,-8785,-475,8805,502,503,-3238,-2483]]],id:"40",properties:{name:"Oklahoma"}},{type:"MultiPolygon",arcs:[[[-3769,-6590,9420,2570,-1574,-1573,-1572,-6149,-5933,-6148,4530,4531,4532,4533,4534,7293,-4506,-4510,-6359,-9279,5800,4767,4768,-4846,5381,5951,5952,-7940,-7941,5422,-2024,-3869,-3868,-6879,-6878,-9325,-4200,-7659,-7658,8649,8642,8643,-8929,-7515,1040,1041,-4030,-4029,-4035,-6058,8936,5270,7191,-3256,7192,8386,-7117,4354,4355,4356,5196,-4238,-4237,-4236,-4235,-4234,-3571,-3570,-8523,-5821,-8522,-5819,-5818,5890,7334,-3315,-3314,5957,6685,-5707,6683,9231,-285,-284,7295,7296,5621,5622,-7858,-3321,-3320,-4620,5752,7669,-4114,394,395,6269,-3770]]],id:"47",properties:{name:"Tennessee"}},{type:"MultiPolygon",arcs:[[[-9297,-6023,-9177,8419,-3454,8420,-7481,-3108,-8125,2843,2844,8760,-7105,8761,-8718,-6572,4169,4170,3952,3953,6958,-3861,-3860,2475,2476,3121,3122,7359,7361,5906,8180,9306,6710,6708,4160,4161,4162,-5372,7955,9202,-5224,-5223,-5222,459,-5221,5834]]],id:"41",properties:{name:"Oregon"}},{type:"MultiPolygon",arcs:[[[-5184,-5183,-296,-295,-294,-141,-140,-139,-3583,-5982,-8048,-8047,7716,-8049,-6819,-9050,7221,7222,-4395,2014,2015,3796,3797,-7369,-8042,-7371,5456,4719,4720,4721,2328,2329,-6798,-5609,-5363,-5362,-5108,-5824,-8606,6284,-3794,-3793,-3789,-3788,-3787,7279,7280,-8039,7240,7238,3135,4725,4722,-6656,7936,6160,7887,-7406,-967,7886,6158,7937,4724,-2306,-2305,-2304,-9030,5185,-5185]]],id:"54",properties:{name:"West Virginia"}},{type:"MultiPolygon",arcs:[[[-7233,7025,7026,-3504,-3503,-3508,7301,7302,-3693,7303,7304,7224,-5393,-7628,-7627,-5274,-5273,7890,-7953,-9447,-5758,-5548,3180,3181,-7935,6917,6915,4255,8708,8707,7503,-7490,3185,4038,4039,-467,4035,6971,-1629,6972,7418,-9003,-8998,7917,4240,4241,4242,7855,8170,8167,8444,8445,-8433,-8432,-8437,4232,-3572,4233,4234,4235,4236,4237,-5197,-4357,-7078,-7230]]],id:"05",properties:{name:"Arkansas"}},{type:"MultiPolygon",arcs:[[[8819,9340,8818,6009,8350,3978,9432,8346,1663,-1191,1664,-5591,-5085,-691,-690,-8303,-7478,-7482,-8421,3453,-8420,9176,6022,9296,-5835,5220,-460,5221,5222,5223,-9203,-7956,5371,-4163,-4162,-4161,-6709,7608,6826,8244,8250,8240,8248,8282,9460,598,8284,9069,591,2351]],[[2352]],[[6006]],[[6010]],[[8286]],[[8287]],[[8288]],[[8289]],[[8349]],[[8351]],[[9341]]],id:"53",properties:{name:"Washington"}},{type:"MultiPolygon",arcs:[[[3420,-6001,-6804,3649,-6803,8068,8140,8141,8142,6465,7794,7795,-8025,-8101,4510,4511,4512,9321,4514,9442,7808,6863,7733,6468,9411,6596,8751,6898,9322,6900,9452,6593,3779,6640,2332,9146,5277,7959,-6074,-6073,-4984,6621,5711,5630,5810,-4867,-4872,-5485,-5484,-4689,-4688,3733,3734,6136,6137,4503,-1016,-1015,-1021,3773,3774,-7496,7429,7491,7492,7493,7941,-2025,-5423,7940,7939,-5953,-5952,-5382,4845,-4769,-4768,-5801,9278,6358,4509,4505,-7294,-4535,-4534,-4533,8472,6807,6626,6627,6628,2894,2895,769,770,-7715,-1227,-7714,-6002]],[[6896,9320]],[[9319]]],id:"37",properties:{name:"North Carolina"}},{type:"MultiPolygon",arcs:[[[4394,-7223,-7222,9049,6818,8048,-7717,8046,8047,5981,3582,-138,3583,3584,-5269,6002,-9136,9141,9351,-9074,9352,9280,8637,1455,9360,5729,9392,1491,9393,9137,4890,6814,2164,7972,4366,8770,7791,6747,6018,5775,8022,7973,7920,9439,-4512,-4511,8100,8024,-7796,-7795,-6466,-8143,-8142,-8141,-8069,6802,-3650,6803,6e3,-3421,6001,7713,1226,7714,-771,-770,-2896,-2895,-6629,-6628,-6627,-6808,-8473,-4532,-4531,6147,5932,6148,1571,1572,1573,-2571,-9421,-6589,-5334,-5333,6529,-5612,-5611,-5610,6797,-2330,-2329,-4722,-4721,-4720,-5457,7370,8041,7368,-3798,-3797,-2016,-2015]],[[8831,8832,8833,7728,8834]],[[8835,8836]]],id:"51",properties:{name:"Virginia"}},{type:"MultiPolygon",arcs:[[[5780,-4177,-321,-320,8356,4383,4384,4378,-3906,-3905,6105,-5575,-5307,1441,1434,1435,8871,8872,6605,-4907,-4906,-4905,5551,-1372,-41,-40,-4748,-4351,-4350,-2424,7138,5557,5558,5559,-9303,-3741,-6871,-8009,5229,-435,-434,-6986,-8258]]],id:"56",properties:{name:"Wyoming"}},{type:"MultiPolygon",arcs:[[[-276,-7652,-9092,2562,2563,8342,8343,8344,8345,8080,-7679,6966,6961,-300,-299,6967,6968,7995,7993,7992,7989,-8726,-8684,4738,4735,4586,4033,4034,4028,4029,-1042,-1041,7514,8928,-8644,-8643,-8650,-7660,4246,-4205,4247,4434,-3831,4435,-5579,-57,8896,7341,-3416,7342,3852,3853,8212,8213,7851,-3410,7852,8336,8337,8338,-9370,-7015,-7019,-7668,8796,8792,8793,-2731,-2730,-277]],[[8341]]],id:"01",properties:{name:"Alabama"}},{type:"MultiPolygon",arcs:[[[-6137,-3735,-3734,4687,4688,5483,5484,4871,4866,-5811,-5631,-5712,-6622,4983,6072,6073,6074,5049,4685,6634,4763,4693,4694,4695,5299,5300,5796,5797,-8210,5897,5898,9197,-8402,5720,5721,5722,5827,4345,4346,-6299,7496,7497,7498,7499,7495,-3775,-3774,1020,1014,1015,-4504,-6138]]],id:"45",properties:{name:"South Carolina"}},{type:"MultiPolygon",arcs:[[[1565,4708,4709,-4596,3581,-4595,6061,4715,5011,5874,-3867,5872,-577,-576,-133,-132,5744,-6869,-6944,3965,-3202,3966,3967,3968,7209,7210,-160,-159,8261,-6688,-6687,-969,-968,-473,-1658,-3004,-3619,7926,4814,4815,4816,4664,4665,4666,7344,7345]]],id:"35",properties:{name:"New Mexico"}},{type:"MultiPolygon",arcs:[[[-944,-943,8732,-7290,-7289,9100,-7945,-7944,-3494,-4707,-4706,-5063,-5062,-8488,-9337,-8927,1579,1575,1576,-5764,-945]]],id:"33",properties:{name:"New Hampshire"}},{type:"MultiPolygon",arcs:[[[8925,-1580,8926,9336,8487,5061,5062,4705,4706,-3493,-3492,-5116,8389,8388,5972,9227,-7436,-7435,-8439,8021,8019,4881,8396]]],id:"50",properties:{name:"Vermont"}},{type:"MultiPolygon",arcs:[[[2523,2524,4422,-8931,8112,-3857,-1217,8113,-8789,7836,-2467,-932,7829,7830,-3953,-4171,-4170,6571,6572,-8717,-7898,-3210,-6771,-8191,-8193,-8140,-8189,4288,4289,4290,4291,-1,-8,-1933,-4831,-4830]]],id:"32",properties:{name:"Nevada"}},{type:"MultiPolygon",arcs:[[[3384]],[[3385]],[[3386]],[[3388,7388]],[[3450]],[[8187]],[[8611]],[[8612]]],id:"15",properties:{name:"Hawaii"}},{type:"MultiPolygon",arcs:[[[7288,7289,7290,3489,5564,3909,5561,3911,9398,8876,9397,3913,5322,-3956,5323,5324,5325,5565,-6266,-7392,7946,5962,5963,5964,5118,5119,5120,5114,5115,3491,3492,3493,7943,7944,-9101]],[[5840]],[[8874]]],id:"25",properties:{name:"Massachusetts"}},{type:"MultiPolygon",arcs:[[[3955,3956]],[[3957]],[[6267,6209,8994,-7397,6211,6212,6268,6265,-5566,-5326,-5325,9445]],[[8993]]],id:"44",properties:{name:"Rhode Island"}},{type:"MultiPolygon",arcs:[[[-6208,-8731,-8730,8089,-4775,-4774,4361,-4773,-5510,6139,-7174,-6610,-4702,-4701,-7869,7147,7148,7149,-4305,-4304,8505,8506,-8777,7215,7216,8603,7124,7894,8273,4297,9305,-5018,9303,-5022,-5021]]],id:"34",properties:{name:"New Jersey"}},{type:"MultiPolygon",arcs:[[[5017,5018]],[[-947,7101,-5259,5024,5025,-4981,5019,5020,5021,5022,7099,9170,-9108,-4280,-5082,-948]]],id:"10",properties:{name:"Delaware"}},{type:"MultiPolygon",arcs:[[[5086,7034,7871,-7155,-7867,7869,8790,-5119,-5965,-5964,-5963,-7947,7391,-6269,-6213,-6212,7396,7397]]],id:"09",properties:{name:"Connecticut"}},{type:"MultiPolygon",arcs:[[[-5268,9134,9135,-6003]]],id:"11",properties:{name:"District of Columbia"}}]},nation:{type:"GeometryCollection",geometries:[{type:"MultiPolygon",arcs:[[[1565,4708,6914,248,4591,5526,5588,8931,6929,9387,6924,2869,8883,1244,9428,8914,8160,8912,8718,9139,8158,9140,7032,7916,7631,8251,7633,7414,9429,4257,3122,7359,7361,5906,8180,9306,6710,7608,6826,8244,8250,8240,8248,8282,9460,598,8284,9069,591,2351,8819,9340,8818,6009,8350,3978,9432,8346,1663,1187,5141,2176,8448,9394,706,6076,9391,4368,7286,9051,9399,6630,9109,455,2075,3108,1580,2601,5883,5040,2137,9308,7194,2762,3948,3416,3949,2764,7616,4402,9048,7252,3511,8698,5189,9363,5191,4283,8607,4913,2150,7314,7317,7614,9284,1606,171,8501,9440,6834,8490,6836,828,9457,5373,8467,7773,3990,9147,8096,5653,9110,9437,9315,8945,9332,5620,1302,4644,1296,543,8003,9358,6054,2505,7178,8067,9055,9008,3509,8380,8653,3093,3497,8102,8181,445,7022,8897,7072,8070,3542,9191,9434,8552,8711,9253,9423,4677,8596,9088,7160,354,3944,714,9061,3536,6128,4313,7693,8437,8019,4881,8396,8925,1575,5764,9395,3516,289,703,3172,7065,3174,3481,7068,9286,4797,5771,941,8732,7290,3489,5564,3909,5561,3911,9398,8876,9397,3913,5322,3956,5323,9445,6267,6209,8994,7397,5086,7034,7871,7155,8843,8695,3561,6125,3559,8696,8518,4308,8505,8777,7216,8603,7124,7894,8273,4297,9305,5018,9303,5022,7099,9170,9108,8833,7728,8834,9104,4282,5082,5416,8838,5260,7020,9330,9405,5429,9263,8763,4632,9075,9352,9280,8637,1455,9360,5729,9392,1491,9393,9137,4890,6814,2164,7972,4366,8770,7791,6747,6018,5775,8022,7973,7920,9439,4512,9321,4514,9442,7808,6863,7733,6468,9411,6596,8751,6898,9322,6900,9452,6593,3779,6640,2332,9146,5277,7959,6074,5049,4685,6634,4763,4693,9368,6935,4272,9297,4607,8967,7320,8991,8246,2359,7767,9374,8706,3056,1762,4602,9346,9247,8194,9244,8196,9248,8202,9388,6982,6949,6984,6951,8569,8830,9461,7586,2893,7584,2891,6931,7521,7109,1696,9323,7582,9006,7572,7578,2345,2733,278,7652,9092,2563,8342,9165,7756,9421,9458,7979,7001,9456,7863,8064,8177,8061,8178,4159,4626,3698,3894,5212,3974,9299,3976,8766,9301,6651,9300,6653,5919,4430,3603,8390,8752,6273,7261,9e3,7263,6275,8753,8392,3601,4431,5867,3605,4427,3607,5868,3609,8217,8393,8754,6277,7264,9001,7725,8919,3600,8660,9454,4183,8947,8536,5634,6755,7673,8963,7345],[-1543]],[[4627]],[[6999]],[[7e3]],[[8059]],[[8175]],[[8176]],[[9455]],[[6123]],[[6124]],[[6126]],[[6129]],[[8463,1946,1386,8229,1985,8988,8853,8772,8990,1971,1978,1961,1973,719,1974,6161,4742,6163,4744,484,9123,1706,3424,2295,2668,1983,8228,1384,1947,9444,1944,8461,1373,1593,48,8226,3032,8227,50,1594,1375,8462,1377]],[[51]],[[52]],[[1379,8460]],[[1382,3051]],[[1591,3038]],[[1953]],[[1954]],[[1955]],[[1956]],[[1957]],[[1958]],[[1959]],[[1962]],[[1963]],[[1964]],[[1965]],[[1966]],[[1967]],[[1968]],[[1969]],[[1979]],[[1980]],[[3034]],[[3035]],[[3036]],[[3037]],[[3039,3049]],[[3050]],[[4745]],[[4746]],[[6162]],[[8224]],[[8225]],[[8969]],[[8970]],[[8971]],[[8972]],[[8973]],[[8974]],[[8975]],[[8976]],[[8977]],[[8978]],[[8979]],[[8980]],[[8981]],[[8982]],[[8983]],[[8984]],[[8985]],[[8986]],[[8987]],[[8989]],[[9122]],[[9124]],[[7179]],[[7180]],[[7181]],[[7316]],[[9283]],[[9356]],[[9357]],[[9359]],[[9364]],[[7753]],[[7754]],[[9163]],[[9164]],[[9190]],[[9433]],[[5079,9106]],[[9105,8835]],[[4401]],[[8488]],[[8489]],[[9041]],[[9042]],[[9043]],[[9044]],[[9045]],[[9046]],[[9047]],[[2863]],[[2864]],[[2865]],[[6921]],[[6925]],[[9385]],[[9386]],[[6983]],[[7569]],[[8197]],[[8198]],[[8199]],[[8203]],[[8204]],[[8205]],[[8206]],[[3167]],[[3168]],[[3169]],[[3170]],[[3478]],[[7066]],[[7067]],[[2352]],[[6006]],[[6010]],[[8286]],[[8287]],[[8288]],[[8289]],[[8349]],[[8351]],[[9341]],[[6896,9320]],[[9319]],[[8341]],[[3384]],[[3385]],[[3386]],[[3388,7388]],[[3450]],[[8187]],[[8611]],[[8612]],[[5840]],[[8874]],[[3957]],[[8993]]]}]}},arcs:[[[22952,51190],[67,-596]],[[23019,50594],[855,279],[1146,358]],[[25020,51231],[628,190]],[[25648,51421],[-3,188],[-223,595],[-6,178],[-60,187],[-1,288],[-102,290],[15,459],[-91,215],[-101,-16],[-161,203],[-124,-33],[-65,86],[-197,6],[-261,201],[-117,27],[-63,205],[-149,-72],[-93,163],[22,356],[-50,174],[31,126],[-75,292],[-113,1043]],[[23661,56582],[-493,4588]],[[23168,61170],[-62,73],[-314,-148],[-151,254],[-184,16],[-55,-136],[-183,3],[-12,-107],[-322,-140],[-85,-182],[-87,-46]],[[21713,60757],[-50,-197],[-81,-92],[-160,-384],[-89,-60],[42,-268],[-61,-264],[18,-68],[-40,-416],[-121,-252],[-31,-281],[-69,-170],[59,-487]],[[21130,57818],[83,-258],[-59,-105],[129,-83],[31,-125],[24,-629],[-18,-338],[-54,-333],[96,-444],[-46,-175],[-1,-237],[36,-162],[-7,-200],[47,-176],[63,-57],[-82,-300],[39,-317],[-19,-239],[42,-54],[221,-26],[87,-54],[106,38],[3,84],[238,28],[87,297],[-21,59],[113,209],[153,14],[218,-544],[43,-39],[86,-746],[184,-1716]],[[65107,78355],[37,-4]],[[65144,78351],[382,-40]],[[65526,78311],[14,363],[59,50],[56,318],[64,152],[21,202]],[[65740,79396],[32,247],[38,1082],[107,192],[71,286]],[[65988,81203],[-279,-202],[-353,103]],[[65356,81104],[-15,-299],[-120,-275],[-48,-214],[-21,-623]],[[65152,79693],[-45,-1338]],[[24791,26842],[350,113]],[[25141,26955],[1051,345]],[[26192,27300],[-145,1322],[-80,-26],[-35,322],[-269,-89]],[[25663,28829],[-190,-62],[19,-164],[-473,-159],[-14,-168],[-366,-124]],[[24639,28152],[152,-1310]],[[53014,12853],[970,11]],[[53984,12864],[-2,578],[27,220]],[[54009,13662],[-1,441],[196,1],[0,331],[779,-1],[0,-332],[193,-2],[-1,-331]],[[55175,13769],[192,6]],[[55367,13775],[8,988],[39,0],[0,659]],[[55414,15422],[-780,6]],[[54634,15428],[-1192,-9]],[[53442,15419],[3,-343],[-59,-316]],[[53386,14760],[-71,-366],[-61,-143],[-54,-434],[-65,-167],[-16,-333],[-44,-78],[-61,-386]],[[52134,16372],[388,15]],[[52522,16387],[943,23]],[[53465,16410],[2,333]],[[53467,16743],[18,165],[-4,532],[65,274],[-38,289],[31,351],[-20,359]],[[53519,18713],[-753,0]],[[52766,18713],[-619,-18]],[[52147,18695],[14,-1327],[-37,-1],[10,-995]],[[41956,25674],[195,-4],[184,-71],[400,58]],[[42735,25657],[-73,1328],[194,24],[-20,443]],[[42836,27452],[-959,-135]],[[41877,27317],[7,-151]],[[41884,27166],[72,-1492]],[[89237,26630],[145,9],[191,82],[258,-144],[35,-65]],[[89866,26512],[27,145],[-69,66],[69,103],[141,-49],[-3,-68]],[[90031,26709],[49,227],[-55,483],[50,203],[3,339]],[[90078,27961],[31,111],[-151,144],[-62,-47],[-93,112]],[[89803,28281],[-316,-150],[-194,-293]],[[89293,27838],[74,-459],[-121,-442],[-9,-307]],[[24234,93116],[130,-327]],[[24364,92789],[122,51],[67,249],[100,-76],[255,138]],[[24908,93151],[71,146],[-144,286],[56,137],[-113,-36],[-83,97],[-19,303],[48,187],[-74,132]],[[24650,94403],[-4,-279],[-48,-275],[15,-216],[-61,230],[44,113],[-91,164],[-86,-215],[-101,-7],[-30,-132],[44,-187],[80,-60],[-58,-170],[83,-8],[-191,-138],[-12,-107]],[[24158,93842],[17,-68],[85,176],[-102,-108]],[[24110,93691],[33,-161],[142,12],[12,158],[-80,94],[-107,-103]],[[74239,65845],[318,-52],[296,-78]],[[74853,65715],[25,-4],[22,353]],[[74900,66064],[1,377],[-158,88],[-264,237],[-89,13]],[[74390,66779],[-151,-934]],[[78118,70652],[465,-618]],[[78583,70034],[211,576]],[[78794,70610],[-73,-97],[-211,477],[44,59],[-101,224]],[[78453,71273],[-320,-428]],[[78133,70845],[-15,-193]],[[70760,47067],[-18,-337]],[[70742,46730],[625,-102]],[[71367,46628],[63,-11],[61,871]],[[71491,47488],[-52,128],[12,172]],[[71451,47788],[-643,117]],[[70808,47905],[-48,-838]],[[72412,45897],[205,-46],[200,-282]],[[72817,45569],[62,1085]],[[72879,46654],[-159,34],[-103,360],[-123,58]],[[72494,47106],[-89,-47],[-100,113]],[[72305,47172],[-69,-1001]],[[72236,46171],[-17,-231],[193,-43]],[[75509,28963],[15,164],[190,-49],[47,497]],[[75761,29575],[100,986]],[[75861,30561],[-191,65]],[[75670,30626],[-563,161]],[[75107,30787],[-113,-1303]],[[74994,29484],[171,-86],[-30,-330],[374,-105]],[[67331,66268],[576,-76]],[[67907,66192],[193,-24]],[[68100,66168],[44,1011]],[[68144,67179],[-389,46],[9,223],[-189,25],[2,56]],[[67577,67529],[-289,39]],[[67288,67568],[-8,-281],[95,-13],[-44,-1006]],[[76231,37858],[468,-123]],[[76699,37735],[174,-37]],[[76873,37698],[85,1086]],[[76958,38784],[-216,76]],[[76742,38860],[-420,107]],[[76322,38967],[-91,-1109]],[[52924,29355],[386,6]],[[53310,29361],[699,4]],[[54009,29365],[-4,1340]],[[54005,30705],[-235,-3]],[[53770,30702],[-526,-5]],[[53244,30697],[-330,-5]],[[52914,30692],[10,-1337]],[[52475,30682],[439,10]],[[53244,30697],[-8,1599]],[[53236,32296],[-383,-5]],[[52853,32291],[2,-334],[-387,-6]],[[52468,31951],[7,-1269]],[[55467,79125],[348,-492]],[[55815,78633],[3,463],[104,218],[-31,86],[132,-8]],[[56023,79392],[-55,1361]],[[55968,80753],[-461,-13],[-445,-462]],[[55062,80278],[-63,-896]],[[54999,79382],[150,-59],[130,-124],[118,69],[70,-143]],[[50236,28925],[763,26]],[[50999,28951],[5,333]],[[51004,29284],[-12,1352]],[[50992,30636],[-621,-30]],[[50371,30606],[-143,-7]],[[50228,30599],[19,-1341],[-11,-333]],[[49697,93009],[580,35]],[[50277,93044],[349,19]],[[50626,93063],[143,7],[-2,195]],[[50767,93265],[-19,1626]],[[50748,94891],[-673,-34]],[[50075,94857],[-204,-10]],[[49871,94847],[24,-1032],[-97,-2],[4,-331],[-52,-3],[6,-353],[-59,-117]],[[44540,41933],[37,-991]],[[44577,40942],[1184,119]],[[45761,41061],[-39,1339]],[[45722,42400],[-1195,-118]],[[44527,42282],[13,-349]],[[36002,52403],[331,80],[785,140]],[[37118,52623],[-10,168],[517,93]],[[37625,52884],[26,263],[-62,269],[19,149],[-37,293],[-67,227],[82,193]],[[37586,54278],[-507,-89]],[[37079,54189],[-826,-147]],[[36253,54042],[-162,-599],[0,-213],[-134,-156],[45,-671]],[[84637,40491],[408,-131]],[[85045,40360],[1054,-341]],[[86099,40019],[-68,373],[-57,63],[-40,455],[28,142],[-40,584]],[[85922,41636],[-70,34]],[[85852,41670],[-66,-28],[-34,-340],[-55,-10],[-41,-188],[-56,-30]],[[85600,41074],[-73,-58],[-45,-175],[72,-54],[-10,-114],[-196,3],[-46,82],[-86,-50]],[[85216,40708],[-113,-157],[-177,-49],[-116,339],[-122,-28]],[[84688,40813],[-33,-143],[44,-80],[-62,-99]],[[47651,43912],[932,65]],[[48583,43977],[5,0]],[[48588,43977],[-42,1675]],[[48546,45652],[-910,-64]],[[47636,45588],[-32,-1]],[[47604,45587],[47,-1675]],[[67406,40944],[376,-55],[-90,-1443]],[[67692,39446],[192,-40]],[[67884,39406],[119,1955],[307,-36]],[[68310,41325],[20,332]],[[68330,41657],[-886,127]],[[67444,41784],[-38,-840]],[[41995,61964],[1581,188]],[[43576,62152],[-66,1676]],[[43510,63828],[-648,-72]],[[42862,63756],[-940,-117]],[[41922,63639],[35,-795]],[[41957,62844],[38,-880]],[[76468,72244],[-7,-123]],[[76461,72121],[463,-68],[-16,-272]],[[76908,71781],[89,-13],[11,163],[92,-43],[112,54]],[[77212,71942],[164,509]],[[77376,72451],[107,445]],[[77483,72896],[-781,142],[12,162]],[[76714,73200],[-224,-316]],[[76490,72884],[-22,-640]],[[66550,21390],[572,-44],[-11,-257]],[[67111,21089],[94,-70],[57,134],[131,-6],[58,117]],[[67451,21264],[110,171],[-61,109],[80,134],[-22,184],[-51,-18],[69,234],[-23,160],[-71,124],[-11,214],[69,98],[127,-12],[86,-169],[82,182],[-54,167],[-50,493],[129,224],[114,32]],[[67974,23591],[-46,200],[6,261],[-206,74]],[[67728,24126],[-1,-95],[-290,33],[-3,-105],[-281,28],[-12,-330],[-111,9],[-11,-329],[-194,13],[-26,-660],[-191,17]],[[66608,22707],[-58,-1317]],[[9888,45761],[110,31]],[[9998,45792],[35,25],[173,-263],[66,8],[41,133],[347,158]],[[10660,45853],[-54,113],[55,76],[51,334],[325,535]],[[11037,46911],[394,1186],[-80,602],[-114,-3],[-62,167]],[[11175,48863],[-93,-214],[8,429],[-77,-15],[-146,-441],[-85,-113],[-76,109],[-44,-87],[-90,86],[-34,-390],[-188,-569],[-4,-127],[-118,-69],[-2,-183],[48,-202],[-51,-206],[-156,-189],[48,-147],[-218,-579],[-9,-195]],[[75384,68373],[10,-128],[646,-122]],[[76040,68123],[21,140]],[[76061,68263],[-23,244],[-4,438],[29,144]],[[76063,69089],[61,331]],[[76124,69420],[-108,165],[-241,51]],[[75775,69636],[-100,-75],[-206,29]],[[75469,69590],[-85,-1217]],[[60365,33831],[772,-50]],[[61137,33781],[17,668],[28,-2],[15,657]],[[61197,35104],[-384,26]],[[60813,35130],[-385,26]],[[60428,35156],[-15,-663],[-33,2],[-7,-332]],[[60373,34163],[-8,-332]],[[58023,31589],[766,-32]],[[58789,31557],[19,1333]],[[58808,32890],[-769,35]],[[58039,32925],[-16,-1336]],[[54009,13662],[1166,-1],[0,108]],[[50930,38398],[319,13],[98,-111],[259,5],[93,-53]],[[51699,38252],[209,4],[-5,508]],[[51903,38764],[-7,330],[-321,-7],[0,57],[-258,-8],[-82,109],[-290,-12],[10,-499],[-22,-1]],[[50933,38733],[-8,0]],[[50925,38733],[5,-335]],[[87275,36326],[184,167]],[[87459,36493],[560,508]],[[88019,37001],[-230,323],[-204,139],[-197,234]],[[87388,37697],[-312,-984],[199,-387]],[[42554,67279],[974,113]],[[43528,67392],[-45,1674]],[[43483,69066],[-960,-106]],[[42523,68960],[31,-1681]],[[48007,71127],[262,16]],[[48269,71143],[699,41]],[[48968,71184],[-33,1700]],[[48935,72884],[-34,-2]],[[48901,72882],[-932,-56]],[[47969,72826],[38,-1699]],[[44750,76253],[763,47],[25,-548],[66,42]],[[45604,75794],[1115,103]],[[46719,75897],[-7,425],[232,25]],[[46944,76347],[-56,1886]],[[46888,78233],[-1093,-81]],[[45795,78152],[40,-1677],[-1089,-116]],[[44746,76359],[4,-106]],[[51184,69449],[798,25]],[[51982,69474],[193,18]],[[52175,69492],[-43,1690]],[[52132,71182],[-272,-20]],[[51860,71162],[-702,-49]],[[51158,71113],[26,-1664]],[[52548,28015],[384,5]],[[52932,28020],[385,8]],[[53317,28028],[-7,1333]],[[52924,29355],[-386,-11]],[[52538,29344],[10,-1329]],[[48932,25159],[159,11]],[[49091,25170],[412,26]],[[49503,25196],[-28,1338],[19,2],[-27,1350]],[[49467,27886],[-442,-18]],[[49025,27868],[-136,-105]],[[48889,27763],[28,-1266],[-20,-1]],[[48897,26496],[35,-1337]],[[46466,65785],[182,17]],[[46648,65802],[769,64]],[[47417,65866],[-8,337]],[[47409,66203],[-90,-27],[-41,1515]],[[47278,67691],[-865,-66]],[[46413,67625],[53,-1840]],[[27490,72506],[-56,440],[-95,1067]],[[27339,74013],[-1155,-307],[-514,-507]],[[25670,73199],[34,-360],[380,103],[72,-774],[577,155],[2,-19],[755,202]],[[60343,39538],[384,-27]],[[60727,39511],[384,-28]],[[61111,39483],[25,1013]],[[61136,40496],[-770,53]],[[60366,40549],[-23,-1011]],[[62391,36697],[-9,-336]],[[62382,36361],[770,-63]],[[63152,36298],[22,672]],[[63174,36970],[18,670]],[[63192,37640],[-773,63]],[[62419,37703],[-28,-1006]],[[36673,13674],[70,-6],[14,-218],[81,-107],[84,11],[123,-286],[131,-40],[252,136],[55,-242]],[[37483,12922],[194,83],[48,82],[558,49],[44,-218],[191,49],[43,-136],[167,-16],[162,-329],[-24,-98],[57,-198],[113,-47],[11,73]],[[39047,12216],[91,18],[-21,335],[145,27],[-81,1281],[-56,-11],[-42,660],[193,35],[-41,657],[127,22]],[[39362,15240],[-75,1213]],[[39287,16453],[-3,55]],[[39284,16508],[-967,-179],[4,-55],[-1140,-227],[-2,31],[-647,-137]],[[36532,15941],[-65,-116],[69,-335],[49,-109],[-49,-183],[-30,-319],[58,-143],[-35,-319],[37,-128],[-1,-261],[93,-182],[15,-172]],[[58121,51702],[7,-685]],[[58128,51017],[857,16],[58,-26]],[[59043,51007],[46,29],[-4,487]],[[59085,51523],[-5,616],[-99,-1],[-2,336]],[[58979,52474],[-97,-1]],[[58882,52473],[-320,-7],[1,-224],[-448,-16]],[[58115,52226],[6,-524]],[[72308,77415],[186,-22]],[[72494,77393],[569,-96]],[[73063,77297],[123,2350]],[[73186,79647],[-455,10],[-315,90]],[[72416,79747],[-108,-2332]],[[70105,55947],[46,-1677]],[[70151,54270],[23,120],[232,-53],[110,-81]],[[70516,54256],[76,1607]],[[70592,55863],[-96,19]],[[70496,55882],[-391,65]],[[98141,11265],[-336,336]],[[97805,11601],[-501,524],[-38,-12],[-224,-1334],[-77,-353],[-216,-1240],[-383,193],[-8,-48],[-185,92]],[[96173,9423],[-114,-644],[-1333,652]],[[94726,9431],[-448,219]],[[94278,9650],[-34,-466],[670,-3350],[232,26],[52,-40],[67,478],[52,185],[245,141],[229,-362],[85,-25],[85,-134],[4,-114],[84,-76],[211,-78],[-38,-198],[51,-92],[287,-11],[45,94],[334,223],[169,285],[151,59],[307,1702],[219,1163],[221,1226],[62,68],[-57,166],[111,182],[-56,110],[75,453]],[[83656,40800],[201,-63]],[[83857,40737],[716,-226]],[[84573,40511],[64,-20]],[[84688,40813],[-83,219],[-82,12],[41,112],[-53,183]],[[84511,41339],[-164,42],[-160,-10]],[[84187,41371],[-230,-188],[69,-78],[-113,-49],[9,124],[-199,699],[-203,-63]],[[83520,41816],[136,-1016]],[[67993,71961],[981,-134]],[[68974,71827],[-12,1040]],[[68962,72867],[-4,313]],[[68958,73180],[-905,133]],[[68053,73313],[-60,-1352]],[[50060,21239],[28,-1308]],[[50088,19931],[1499,68]],[[51587,19999],[43,3]],[[51630,20002],[-18,1321]],[[51612,21323],[-1114,-57]],[[50498,21266],[-438,-27]],[[56679,23689],[596,-18],[2,168],[193,-10]],[[57470,23829],[20,1165]],[[57490,24994],[-388,10],[2,335]],[[57104,25339],[-404,10]],[[56700,25349],[-21,-1660]],[[44867,30589],[1424,149]],[[46291,30738],[-48,1501]],[[46243,32239],[-645,-57],[-741,-90]],[[44857,32092],[20,-498],[-45,-5],[35,-1e3]],[[28616,37420],[54,-32],[82,145],[62,-29],[91,-234],[-60,-255],[20,-130],[-86,-42],[-12,-139],[166,-227],[219,-32],[38,-157],[173,-7]],[[29363,36281],[52,20],[240,-188],[106,-142]],[[29761,35971],[-91,965],[902,254],[749,183]],[[31321,37373],[79,21]],[[31400,37394],[-61,701]],[[31339,38095],[-174,-24],[-260,-165],[-133,11],[-60,114],[-189,-15],[-69,53],[-228,23],[-155,-69],[-101,110],[-136,-95],[-37,181]],[[29797,38219],[-52,-23],[-101,314],[-87,37],[-155,-93],[-65,146],[-332,-406],[-25,-250],[-143,145],[-43,161],[-103,-68]],[[28691,38182],[-64,-241],[32,-119],[-66,-309],[23,-93]],[[85467,27299],[393,-180]],[[85860,27119],[-9,276],[88,423],[-14,199],[52,282],[140,302]],[[86117,28601],[163,231],[-176,74]],[[86104,28906],[-317,132]],[[85787,29038],[-57,-459],[-164,-338]],[[85566,28241],[-58,-391],[23,-23],[-64,-528]],[[53826,51565],[287,5],[2,-336]],[[54115,51234],[693,9]],[[54808,51243],[0,505]],[[54808,51748],[-3,1180]],[[54805,52928],[0,504]],[[54805,53432],[-989,-17]],[[53816,53415],[10,-1850]],[[46642,48859],[760,69]],[[47402,48928],[-39,1681]],[[47363,50609],[-764,-69]],[[46599,50540],[43,-1681]],[[70788,29395],[-79,-1330]],[[70709,28065],[759,-140]],[[71468,27925],[85,1326]],[[71553,29251],[43,664]],[[71596,29915],[-366,73]],[[71230,29988],[-400,71],[-42,-664]],[[50910,41414],[760,27]],[[51670,41441],[1,0]],[[51671,41441],[-14,1341]],[[51657,42782],[-758,-27]],[[50899,42755],[-8,0]],[[50891,42755],[19,-1341]],[[82924,26744],[149,-68],[220,-42],[203,-91],[177,-18]],[[83673,26525],[96,878]],[[83769,27403],[-745,258]],[[83024,27661],[-100,-917]],[[51291,12717],[584,23]],[[51875,12740],[-8,659],[33,1],[-16,1322]],[[51884,14722],[-155,-5]],[[51729,14717],[-781,-32]],[[50948,14685],[-38,-2],[10,-660]],[[50920,14023],[4,-260]],[[50924,13763],[6,-402],[155,7],[11,-658],[195,7]],[[50024,58873],[762,34]],[[50786,58907],[-17,1696]],[[50769,60603],[-191,-8],[-10,669]],[[50568,61264],[-558,-25]],[[50010,61239],[-16,-1],[16,-1005]],[[50010,60233],[14,-1360]],[[46969,72725],[968,76],[-1,23]],[[47936,72824],[-40,1664]],[[47896,74488],[-156,-14]],[[47740,74474],[-824,-60]],[[46916,74414],[53,-1689]],[[44560,62257],[970,97]],[[45530,62354],[-60,1670]],[[45470,64024],[-693,-63]],[[44777,63961],[-286,-30]],[[44491,63931],[69,-1674]],[[44675,58898],[962,94]],[[45637,58992],[-53,1656]],[[45584,60648],[-965,-89]],[[44619,60559],[56,-1661]],[[45795,78152],[-521,-30]],[[45274,78122],[-596,-43]],[[44678,78079],[68,-1720]],[[64947,27259],[594,-61]],[[65541,27198],[539,-65]],[[66080,27133],[44,992]],[[66124,28125],[-451,59]],[[65673,28184],[-686,84]],[[64987,28268],[-40,-1009]],[[74621,55285],[12,-2]],[[74633,55283],[916,-147]],[[75549,55136],[34,218],[-54,129],[-79,-5],[-23,173],[49,294],[37,392],[-75,113],[18,165]],[[75456,56615],[-44,172],[-63,57]],[[75349,56844],[-64,-143],[-182,-92],[-84,-112],[-186,-352]],[[74833,56145],[67,-108],[-70,-142],[-93,-328]],[[74737,55567],[-116,-282]],[[61635,20261],[971,-74]],[[62606,20187],[19,661],[386,-38]],[[63011,20810],[40,1309]],[[63051,22119],[-1345,121]],[[61706,22240],[-39,-1316],[-15,-1],[-17,-662]],[[72224,27787],[770,-162]],[[72994,27625],[91,1332]],[[73085,28957],[-382,77]],[[72703,29034],[-383,77]],[[72320,29111],[-96,-1324]],[[67459,78444],[387,-47]],[[67846,78397],[482,-64]],[[68328,78333],[30,669]],[[68358,79002],[10,223]],[[68368,79225],[-680,85],[-9,116],[-180,20]],[[67499,79446],[-40,-1002]],[[66638,66011],[484,-54]],[[67122,65957],[16,335],[193,-24]],[[67288,67568],[3,64],[-581,70]],[[66710,67702],[-23,-559]],[[66687,67143],[-49,-1132]],[[46758,35790],[952,86]],[[47710,35876],[-31,1332]],[[47679,37208],[-738,-60]],[[46941,37148],[-216,-21]],[[46725,37127],[33,-1337]],[[45045,72558],[0,-13]],[[45045,72545],[962,94]],[[46007,72639],[-57,1688]],[[45950,74327],[-294,-30]],[[45656,74297],[-682,-64]],[[44974,74233],[71,-1675]],[[36614,38546],[891,185]],[[37505,38731],[217,46]],[[37722,38777],[-10,230],[85,280],[116,273],[128,654],[45,300],[-7,197],[66,-9],[16,137]],[[38161,40839],[-74,52],[-35,261],[-99,180],[-104,-106],[-208,124],[-36,-58],[-114,51],[-39,-133],[-96,87],[-70,-121],[-157,-4],[-56,-230],[-78,147],[-126,-71],[-54,-270]],[[36815,40748],[9,-202],[-56,-313],[0,-159],[84,-295],[17,-237],[60,-130],[-64,-367],[-76,42],[-70,-148],[-110,-89],[-28,-184],[33,-120]],[[60298,30536],[168,-11]],[[60466,30525],[595,-41]],[[61061,30484],[24,1104]],[[61085,31588],[-766,51]],[[60319,31639],[-21,-1103]],[[75509,28963],[26,-8],[-128,-1319]],[[75407,27636],[811,-251]],[[76218,27385],[79,549],[108,387],[93,800],[50,207]],[[76548,29328],[-787,247]],[[72890,40960],[22,-4],[-39,-723]],[[72873,40233],[222,-47]],[[73095,40186],[444,-104]],[[73539,40082],[55,841]],[[73594,40923],[11,163]],[[73605,41086],[-695,151]],[[72910,41237],[-20,-277]],[[45776,9987],[27,-723]],[[45803,9264],[777,78]],[[46580,9342],[-35,1054],[67,7],[-22,657],[585,58]],[[47175,11118],[-11,328]],[[47164,11446],[-1169,-119],[36,-983],[-267,-29],[12,-328]],[[16684,13651],[100,9],[102,229],[154,73],[307,31],[81,-106],[286,-72]],[[17714,13815],[-320,2048],[188,86],[-51,325],[189,82],[-50,326],[-53,30]],[[17617,16712],[-245,-100],[-830,-380]],[[16542,16232],[-4,-62]],[[16538,16170],[85,-94],[4,-315],[-61,-61],[-8,-190],[82,-251],[43,-286],[78,-34],[14,-183],[126,-69],[79,52],[32,-144],[-57,-119],[16,-133],[-75,-138],[-12,-142],[-80,-94],[-120,-318]],[[57187,56633],[975,43]],[[58162,56676],[-3,962]],[[58159,57638],[-963,26]],[[57196,57664],[-5,-650]],[[57191,57014],[-4,-381]],[[41670,68855],[853,105]],[[42523,68960],[-67,1649]],[[42456,70609],[-873,-108]],[[41583,70501],[87,-1646]],[[46697,64131],[756,62]],[[47453,64193],[-12,717]],[[47441,64910],[-24,956]],[[46648,65802],[49,-1671]],[[75157,66134],[128,-7],[195,-89],[-4,-67]],[[75476,65971],[185,-33],[99,218]],[[75760,66156],[-121,257],[2,80],[-171,161],[-88,236]],[[75382,66890],[-178,38],[-47,-794]],[[12195,86496],[73,17],[108,374],[403,77]],[[12779,86964],[-58,142],[-29,463],[-18,-4],[-29,463],[48,9],[-22,347],[139,24]],[[12810,88408],[97,134],[-201,128],[-141,162],[-296,104],[-216,-149],[-256,86],[-67,-50],[-124,157],[-121,-79],[-11,171],[-91,276],[-150,71],[-27,-59],[-198,22]],[[11008,89382],[60,-108],[-86,-254],[-43,121],[-68,-32],[0,-240],[-86,-117],[-3,-116],[72,-86],[-50,-94],[-93,29],[21,-165],[125,-7],[-79,-221],[165,10],[-22,-218],[51,-173],[369,-634],[-1,-135],[124,-392],[88,-131],[104,-36],[136,97],[126,269],[99,-9],[92,-173],[86,-71]],[[58406,38284],[628,-3],[27,72],[113,-22]],[[59174,38331],[22,1272]],[[59196,39603],[-383,15]],[[58813,39618],[-387,13]],[[58426,39631],[-20,-1347]],[[49973,63925],[958,40]],[[50931,63965],[-2,670]],[[50929,64635],[-96,-4],[-9,671]],[[50824,65302],[-187,-7],[-2,167],[-95,52],[-383,-17],[-1,111],[-191,-9],[-97,52]],[[49868,65651],[6,-391],[-299,-15],[5,-335]],[[49580,64910],[18,-1006],[375,21]],[[47517,61589],[766,55],[8,-336],[381,24]],[[48672,61332],[-4,168]],[[48668,61500],[-20,1344]],[[48648,62844],[-89,3]],[[48559,62847],[-56,17],[-621,-70],[-8,334],[-191,-14]],[[47683,63114],[-203,-15]],[[47480,63099],[15,-586]],[[47495,62513],[22,-924]],[[49467,27886],[597,27]],[[50064,27913],[-20,1002]],[[50044,28915],[-687,-35]],[[49357,28880],[8,-234],[-133,-206],[-114,-38],[-78,-184],[39,-184],[-54,-166]],[[48389,80589],[652,42]],[[49041,80631],[716,30]],[[49757,80661],[-15,1382]],[[49742,82043],[-641,-29]],[[49101,82014],[-735,-26],[11,-583]],[[48377,81405],[12,-816]],[[45451,67550],[962,75]],[[46413,67625],[-45,1684]],[[46368,69309],[-965,-81]],[[45403,69228],[48,-1678]],[[48064,87681],[1169,39]],[[49233,87720],[0,1]],[[49233,87721],[-28,1696],[-15,551]],[[49190,89968],[-1161,39],[4,-664]],[[48033,89343],[31,-1662]],[[82366,43119],[197,-214],[319,117],[43,71]],[[82925,43093],[39,51],[259,-200],[38,67],[-55,181],[-16,245],[102,22],[-31,415],[-27,28]],[[83234,43902],[-260,37],[-493,-97],[2,-155],[-99,-124]],[[82384,43563],[-28,-51],[10,-393]],[[11095,29152],[1690,808]],[[12785,29960],[185,84]],[[12970,30044],[-166,1035],[20,8],[-286,1707]],[[12538,32794],[-276,-130]],[[12262,32664],[-248,-75],[-52,-97],[-92,26],[-184,-116],[-164,30],[-104,-93],[-222,8],[-357,-66],[-185,-108],[-92,-113],[-250,133],[-128,-211],[-214,-38],[-101,118],[-88,-77],[-162,31]],[[9619,32016],[28,-180],[93,-85],[77,-163],[163,-27],[131,-174],[83,10],[76,-133],[134,-25],[-18,-467],[79,-160],[122,-117],[18,-156],[151,-233],[43,-254],[149,-123],[38,-214],[115,-18],[61,-217],[-67,-128]],[[67468,51595],[-8,-168]],[[67460,51427],[578,-81]],[[68038,51346],[55,1186]],[[68093,52532],[-65,7]],[[68028,52539],[-518,72]],[[67510,52611],[-42,-1016]],[[70234,25440],[659,-98]],[[70893,25342],[78,1330]],[[70971,26672],[-354,53]],[[70617,26725],[-548,53]],[[70069,26778],[149,-669],[16,-669]],[[49430,35985],[760,38]],[[50190,36023],[-20,1340]],[[50170,37363],[-749,-41]],[[49421,37322],[-16,-1]],[[49405,37321],[25,-1336]],[[47702,37210],[934,64]],[[48636,37274],[769,47]],[[49421,37322],[-27,1333],[15,2]],[[49409,38657],[-33,1336]],[[49376,39993],[-365,-20]],[[49011,39973],[-1334,-92]],[[47677,39881],[-23,-1],[38,-1335],[-25,-2]],[[47667,38543],[35,-1333]],[[51783,27992],[765,23]],[[52538,29344],[-383,-12]],[[52155,29332],[-390,-15]],[[51765,29317],[18,-1325]],[[51616,24316],[768,30]],[[52384,24346],[-8,1331]],[[52376,25677],[-10,996]],[[52366,26673],[-574,-19]],[[51792,26654],[-1,-333],[-193,-8]],[[51598,26313],[18,-1997]],[[63695,61712],[-10,-348]],[[63685,61364],[195,-7],[577,-81],[196,8]],[[64653,61284],[38,1145]],[[64691,62429],[-977,77]],[[63714,62506],[-19,-794]],[[34603,52049],[617,125]],[[35220,52174],[-8,117],[731,129],[2,-30]],[[35945,52390],[57,13]],[[36253,54042],[-692,-128],[-11,-32],[-954,-192]],[[34596,53690],[-107,-22]],[[34489,53668],[114,-1619]],[[83545,90253],[585,-150],[-32,-332],[196,-55],[-32,-329],[446,-125]],[[84708,89262],[162,170],[40,743]],[[84910,90175],[-52,744],[-1232,328]],[[83626,91247],[-81,-994]],[[49035,30529],[381,24]],[[49416,30553],[-22,120],[85,124],[143,15],[150,449],[138,245],[136,53],[63,358],[130,40],[130,273],[117,15],[149,141],[41,159]],[[50676,32545],[-1228,-62]],[[49448,32483],[-455,-28]],[[48993,32455],[42,-1926]],[[44734,57188],[957,93]],[[45691,57281],[-54,1702]],[[45637,58983],[0,9]],[[44675,58898],[59,-1710]],[[14460,7194],[196,-198],[163,-369],[7,-96],[100,246],[71,-178]],[[14997,6599],[84,290],[280,137],[36,258],[197,323],[140,47],[89,-74],[144,161],[95,40],[27,127],[150,93],[48,144],[97,38]],[[16384,8183],[-91,306],[-70,41],[-49,202],[-128,139],[32,54],[16,320]],[[16094,9245],[-450,-212],[-140,144],[-170,-179],[-106,-1],[-253,-204]],[[14975,8793],[-141,-172],[32,-138],[-253,-281],[18,-139],[-80,-151],[13,-124],[-100,-96],[-36,-442],[32,-56]],[[14454,6202],[33,-182]],[[14487,6020],[373,185]],[[14860,6205],[-3,107],[-89,183],[18,140],[-123,208],[-98,-311],[89,-284],[-102,94],[-68,180],[11,166],[103,173],[-61,24],[-78,228],[-75,-208],[-49,-382],[85,-84],[34,-237]],[[75321,67145],[423,-83],[23,27]],[[75767,67089],[-23,104],[42,278],[63,161],[101,66],[89,284]],[[76039,67982],[1,141]],[[75384,68373],[-8,-125],[-142,25]],[[75234,68273],[-193,-739]],[[75041,67534],[48,-132],[93,60],[139,-317]],[[77599,64895],[301,-358]],[[77900,64537],[198,115]],[[78098,64652],[-14,225],[75,129],[-47,230]],[[78112,65236],[-93,-6],[-198,-234],[-159,20],[-63,-121]],[[71334,44141],[504,-108]],[[71838,44033],[69,1116]],[[71907,45149],[-226,53]],[[71681,45202],[-283,60]],[[71398,45262],[-64,-1121]],[[52364,49522],[764,15]],[[53128,49537],[-2,336],[191,3]],[[53317,49876],[-3,671],[-31,-1],[-11,1015]],[[53272,51561],[-544,-17]],[[52728,51544],[3,-336],[-381,-5]],[[52350,51203],[14,-1681]],[[58617,22064],[581,-14]],[[59198,22050],[11,659],[188,-6],[14,555]],[[59411,23258],[-769,26]],[[58642,23284],[-10,-550]],[[58632,22734],[-15,-670]],[[50968,34718],[763,25]],[[51731,34743],[-16,1339]],[[51715,36082],[-5,667]],[[51710,36749],[-763,-23]],[[50947,36726],[1,-669]],[[50948,36057],[20,-1339]],[[77767,37214],[-21,-281],[158,-38],[-18,-242],[163,-41],[-23,-287],[156,-40]],[[78182,36285],[317,-90]],[[78499,36195],[92,1101]],[[78591,37296],[-731,174]],[[77860,37470],[-73,17],[-20,-273]],[[73434,59678],[88,-22]],[[73522,59656],[172,-86],[59,-92]],[[73753,59478],[-15,104],[71,177],[353,468]],[[74162,60227],[-27,142],[-210,707]],[[73925,61076],[-48,-285],[-84,-138],[-214,-136],[-5,-42]],[[73574,60475],[84,-165],[25,-193],[-96,-79],[-16,-213],[-137,-147]],[[43648,60472],[971,102]],[[44619,60574],[-59,1683]],[[44560,62257],[-984,-105]],[[43576,62152],[72,-1680]],[[52304,77760],[913,-913]],[[53217,76847],[383,1161]],[[53600,78008],[-445,435]],[[53155,78443],[-1,-18],[-461,469]],[[52693,78894],[-389,-1134]],[[51729,14717],[-19,1314],[40,2],[-5,325]],[[51745,16358],[-772,-31]],[[50973,16327],[5,-327],[-49,-2]],[[50929,15998],[14,-990]],[[50943,15008],[5,-323]],[[50992,30636],[332,15]],[[51324,30651],[-6,1158]],[[51318,31809],[-914,-717],[-43,10],[10,-496]],[[50072,76134],[589,-582],[-94,-294]],[[50567,75258],[388,-371]],[[50955,74887],[436,1341]],[[51391,76228],[-794,773]],[[50597,77001],[-175,175]],[[50422,77176],[-350,-1042]],[[58830,40631],[768,-38]],[[59598,40593],[22,1212]],[[59620,41805],[-465,37]],[[59155,41842],[-307,15]],[[58848,41857],[-18,-1226]],[[42346,18176],[375,54],[16,-337],[294,40]],[[43031,17933],[580,77]],[[43611,18010],[466,59]],[[44077,18069],[-51,1325]],[[44026,19394],[-110,-10]],[[43916,19384],[-563,-70],[-1057,-148]],[[42296,19166],[50,-990]],[[46759,74403],[157,11]],[[47740,74474],[-59,1938]],[[47681,76412],[-737,-65]],[[46719,75897],[40,-1494]],[[25648,51421],[2071,598]],[[27719,52019],[1047,278]],[[28766,52297],[-955,10439]],[[27811,62736],[-51,-192],[-123,136],[-77,-164],[-107,-76],[-94,-215],[-126,-165],[-99,56],[-101,-157],[-57,-191],[-119,65],[-157,-44],[-56,183],[-5,-270],[-150,77],[-67,-33],[156,-105],[-145,-97]],[[26433,61544],[126,-1257],[-405,-118],[66,-675],[-57,1],[-942,-262],[65,-666],[-189,-61],[45,-421],[-65,67],[-185,-75],[-182,-322],[-109,-13],[-68,-86],[-265,-211],[-26,-152],[-271,-420],[-35,-120],[-147,-137],[-128,-34]],[[22959,9893],[614,213],[83,-137],[382,146]],[[24038,10115],[-185,1456]],[[23853,11571],[-192,-72],[7,-54],[-566,-197],[-69,-204],[-77,12],[-11,-191],[-102,-86]],[[22843,10779],[64,-490]],[[22907,10289],[52,-396]],[[49446,53804],[962,45]],[[50408,53849],[-6,335],[203,9]],[[50605,54193],[-17,1490]],[[50588,55683],[-349,-20]],[[50239,55663],[-805,-42]],[[49434,55621],[25,-1484],[-18,-1]],[[49441,54136],[5,-332]],[[54009,29365],[624,4]],[[54633,29369],[20,0]],[[54653,29369],[-2,1340]],[[54651,30709],[-646,-4]],[[98045,13024],[163,-146],[-82,-298],[-321,-979]],[[98141,11265],[139,-2],[3,-69],[140,190],[236,-19],[64,-97],[116,336],[-121,120],[87,211],[87,84],[27,197],[-44,253],[112,164],[97,217],[120,74],[49,-111],[-16,-155],[117,33],[100,-43],[163,283],[162,408],[103,76],[71,368],[-202,774],[-115,150],[-106,-280],[-129,172],[96,148],[-39,172],[-65,-11],[-41,220],[-129,50],[30,103],[112,77],[-86,245],[-98,-108],[-66,-161],[-106,210],[-70,-167],[-5,217],[-40,69],[-4,256],[-58,-25],[-95,120]],[[98737,16014],[-204,-589],[34,-30],[-89,-292],[-27,24],[-278,-916],[175,-158],[-303,-1029]],[[31681,9492],[198,55],[249,-2592],[34,-308]],[[32162,6647],[773,205]],[[32935,6852],[-28,315],[-257,2590]],[[32650,9757],[-106,-28],[-29,323],[-865,-234]],[[31650,9818],[31,-326]],[[51657,21326],[1168,36]],[[52825,21362],[-9,1440]],[[52816,22802],[-215,-7],[-13,-111],[-948,-32]],[[51640,22652],[17,-1326]],[[84695,26527],[414,-182],[132,21],[129,-43],[67,-106],[166,-128],[99,-168]],[[85702,25921],[151,980],[7,218]],[[85467,27299],[-270,96],[-13,-103],[-376,149]],[[84808,27441],[-113,-914]],[[13998,92672],[273,18],[-8,361],[-383,-27]],[[13880,93024],[77,-117],[41,-235]],[[82509,89851],[-40,-491]],[[82469,89360],[970,-259]],[[83439,89101],[106,1152]],[[83545,90253],[-834,210],[-146,49]],[[82565,90512],[-56,-661]],[[74809,64979],[-26,-449],[38,-7],[-33,-512],[19,-179]],[[74807,63832],[96,-45],[397,-70],[-4,-63],[147,-29]],[[75443,63625],[78,1281]],[[75521,64906],[-143,25]],[[75378,64931],[-338,56]],[[75040,64987],[-227,44],[-4,-52]],[[59288,35560],[378,-21]],[[59666,35539],[385,-25]],[[60051,35514],[29,1337]],[[60080,36851],[-770,41]],[[59310,36892],[-22,-1332]],[[48505,52038],[15,-672]],[[48520,51366],[382,23],[-7,335],[572,35]],[[49467,51759],[-13,674],[16,1]],[[49470,52434],[-7,357]],[[49463,52791],[-955,-64]],[[48508,52727],[-3,-689]],[[73180,24913],[763,-170]],[[73943,24743],[103,1319]],[[74046,26062],[-447,97]],[[73599,26159],[-320,73]],[[73279,26232],[-99,-1319]],[[50172,38697],[753,36]],[[50933,38733],[-19,1339]],[[50914,40072],[-727,-34]],[[50187,40038],[-44,-2]],[[50143,40036],[29,-1339]],[[74907,37480],[761,-166]],[[75668,37314],[53,668]],[[75721,37982],[-62,15],[-5,338],[-63,14],[23,333]],[[75614,38682],[-606,128]],[[75008,38810],[-29,-384]],[[74979,38426],[-72,-946]],[[74234,48565],[180,-343],[63,-176]],[[74477,48046],[34,-84]],[[74511,47962],[67,218],[114,132],[74,412]],[[74766,48724],[91,274]],[[74857,48998],[-356,379],[-5,52]],[[74496,49429],[-67,-199],[-127,-69]],[[74302,49161],[-68,-596]],[[73753,59478],[245,-644],[9,-174]],[[74007,58660],[379,-98],[28,93],[197,-100]],[[74611,58555],[-197,596],[-96,203],[26,141],[-74,179],[28,121]],[[74298,59795],[-58,23],[-78,409]],[[83013,53455],[548,-159]],[[83561,53296],[353,-100]],[[83914,53196],[81,1116]],[[83995,54312],[2,32]],[[83997,54344],[-890,200]],[[83107,54544],[-94,-1089]],[[43590,65514],[168,19]],[[43758,65533],[792,84]],[[44550,65617],[-61,1854]],[[44489,67471],[-961,-79]],[[43528,67392],[62,-1878]],[[84285,47090],[67,-140],[69,-6],[11,214],[-83,61],[-64,-129]],[[36169,28775],[680,143]],[[36849,28918],[-3,30],[1065,206],[592,103]],[[38503,29257],[2,85],[-163,2653],[-87,1319]],[[38255,33314],[-896,-157],[-1460,-307]],[[35899,32850],[-31,-6],[92,-1326],[68,14],[92,-1323],[-23,-4],[93,-1315],[-21,-115]],[[56023,79392],[28,-148],[115,-35],[42,251],[60,63]],[[56268,79523],[133,162],[-7,337],[60,136],[95,-87],[91,283],[-41,104],[123,7],[237,112],[-11,202]],[[56948,80779],[13,23],[-618,557]],[[56343,81359],[-276,-229],[-99,-377]],[[65473,25523],[979,-113],[14,336]],[[66466,25746],[-207,27],[55,1327]],[[66314,27100],[-234,33]],[[65541,27198],[-68,-1675]],[[79439,40093],[-26,-344],[100,-23],[-37,-498]],[[79476,39228],[550,-114]],[[80026,39114],[128,-29],[65,1012]],[[80219,40097],[-577,115]],[[79642,40212],[-191,43],[-12,-162]],[[76006,77774],[37,-180],[112,-134],[35,-369],[-34,-558],[35,-115]],[[76191,76418],[354,-111]],[[76545,76307],[65,-11]],[[76610,76296],[249,-54]],[[76859,76242],[99,1482]],[[76958,77724],[-927,107]],[[76031,77831],[-25,-57]],[[61209,80653],[267,-14]],[[61476,80639],[477,-30],[5,167],[130,-10],[9,334],[69,190]],[[62166,81290],[-60,225],[-140,155],[-61,217]],[[61905,81887],[-169,321],[-89,72],[-163,-104],[-101,-134],[-130,98]],[[61253,82140],[6,-319],[51,-103],[-71,-106],[5,-420],[-22,-148],[64,-162],[-77,-229]],[[57875,24984],[386,-12]],[[58261,24972],[5,333],[385,-18],[10,333]],[[58661,25620],[-124,89],[-48,172],[23,115],[-234,268]],[[58278,26264],[-2,-127],[-191,8],[-2,-167],[-193,6]],[[57890,25984],[-15,-1e3]],[[67426,50586],[-19,-506]],[[67407,50080],[575,-73]],[[67982,50007],[56,1336]],[[68038,51343],[0,3]],[[67460,51427],[-34,-841]],[[55905,23372],[194,-2]],[[56099,23370],[578,-13],[2,332]],[[56700,25349],[-775,17]],[[55925,25366],[-2,-999]],[[55923,24367],[-15,-330],[-3,-665]],[[67422,26957],[247,-33],[-16,-333],[193,-27]],[[67846,26564],[355,-55]],[[68201,26509],[74,365],[-8,193],[-187,318],[-94,833]],[[67986,28218],[-496,74]],[[67490,28292],[-68,-1335]],[[71963,73751],[769,-139]],[[72732,73612],[69,1180],[-96,18],[29,496]],[[72734,75306],[-381,70]],[[72353,75376],[-261,39],[-55,-73],[-95,-317],[-24,-460]],[[71918,74565],[-19,-296]],[[71899,74269],[-32,-500],[96,-18]],[[77331,68193],[486,-264]],[[77817,67929],[211,-100]],[[78028,67829],[54,298],[155,660]],[[78237,68787],[-82,127]],[[78155,68914],[-182,248]],[[77973,69162],[-171,-128],[-110,25],[-115,-226]],[[77577,68833],[-99,-407],[-147,-233]],[[58808,32890],[770,-34]],[[59578,32856],[22,1348]],[[59600,34204],[-773,35]],[[58827,34239],[-19,-1349]],[[71880,36715],[760,-157]],[[72640,36558],[70,1003]],[[72710,37561],[-191,38]],[[72519,37599],[-381,65],[-6,-112],[-191,38]],[[71941,37590],[-37,-544]],[[71904,37046],[-24,-331]],[[45544,45404],[1104,102]],[[46648,45506],[36,3]],[[46684,45509],[-51,1675]],[[46633,47184],[-155,-13]],[[46478,47171],[-994,-98]],[[45484,47073],[60,-1669]],[[72136,26450],[375,-64]],[[72511,26386],[387,-75]],[[72898,26311],[96,1314]],[[72224,27787],[-88,-1337]],[[72336,23734],[747,-143]],[[73083,23591],[97,1322]],[[73180,24913],[-759,142]],[[72421,25055],[-85,-1321]],[[59881,54025],[-2,-279],[383,-8]],[[60262,53738],[293,-7]],[[60555,53731],[7,841],[24,0],[3,757]],[[60589,55329],[-384,9]],[[60205,55338],[-1,-57],[-286,2]],[[59918,55283],[-6,-699],[-27,1],[-4,-560]],[[44836,36936],[925,92]],[[45761,37028],[32,3]],[[45793,37031],[-46,1337]],[[45747,38368],[-959,-96]],[[44788,38272],[48,-1336]],[[51686,39610],[107,-233],[283,-370]],[[52076,39007],[127,-107],[121,-23],[137,-103]],[[52461,38774],[-11,1346]],[[52450,40120],[-766,-21]],[[51684,40099],[2,-489]],[[52384,24346],[422,10]],[[52806,24356],[539,16],[-1,664]],[[53344,25036],[-7,660]],[[53337,25696],[-961,-19]],[[49190,89968],[927,42]],[[50117,90010],[196,7]],[[50313,90017],[-36,3027]],[[49697,93009],[6,-297],[-133,-65],[-417,-2]],[[49153,92645],[37,-2677]],[[43711,58797],[964,101]],[[44619,60559],[0,15]],[[43648,60472],[1,-29]],[[43649,60443],[62,-1646]],[[43106,72363],[16,2]],[[43122,72365],[961,95]],[[44083,72460],[-70,1678]],[[44013,74138],[-153,-14]],[[43860,74124],[-818,-88]],[[43042,74036],[64,-1673]],[[77042,40172],[166,-22],[-58,-784],[32,-7]],[[77182,39359],[476,-137]],[[77658,39222],[190,-99]],[[77848,39123],[67,-36],[29,448]],[[77944,39535],[52,834]],[[77996,40369],[-473,91],[-4,-73],[-464,65]],[[77055,40452],[-13,-280]],[[52972,76127],[405,-401]],[[53377,75726],[420,76]],[[53797,75802],[490,1473]],[[54287,77275],[-164,150],[7,65]],[[54130,77490],[-530,518]],[[53217,76847],[-245,-720]],[[61912,33716],[774,-72]],[[62686,33644],[44,1344]],[[62730,34988],[-382,31]],[[62348,35019],[-384,31]],[[61964,35050],[-18,-664],[-18,1],[-16,-671]],[[52450,40120],[764,19]],[[53214,40139],[-12,1342]],[[53202,41481],[-764,-19]],[[52438,41462],[12,-1342]],[[46702,85887],[1363,73]],[[48065,85960],[-27,1720]],[[48038,87680],[-1384,-123]],[[46654,87557],[48,-1670]],[[12583,36035],[115,-74],[74,-244],[120,-85],[98,308],[62,-9],[94,208],[90,-73],[807,358]],[[14043,36424],[218,92],[31,-41]],[[14292,36475],[-159,1035]],[[14133,37510],[-823,-371],[-79,-340],[-129,-76],[-209,200],[-476,26]],[[12417,36949],[52,-467],[-26,-102],[69,-56],[71,-289]],[[65532,33910],[58,-6]],[[65590,33904],[696,-66]],[[66286,33838],[58,1315]],[[66344,35153],[-382,56],[-9,-207],[-366,53]],[[65587,35055],[-55,-1145]],[[94461,20597],[307,-230]],[[94768,20367],[39,69],[102,-99],[75,35],[45,322],[132,-5],[33,-119],[180,197],[-32,157],[258,163]],[[95600,21087],[-26,169],[70,194],[-72,232],[34,96],[-171,178],[-39,367],[44,88],[-21,358],[-41,275],[-42,61]],[[95336,23105],[-219,-148]],[[95117,22957],[-36,-80],[-13,-268],[-289,-340],[-94,-273],[26,-108],[-62,-380]],[[94649,21508],[-33,-100],[-155,-811]],[[89013,42152],[-13,-224],[64,-189],[51,-375],[130,-185]],[[89245,41179],[192,1166]],[[89437,42345],[118,724]],[[89555,43069],[-118,-157],[-135,-20],[-167,179]],[[89135,43071],[-143,-163],[58,-223],[102,-166],[-65,-81],[-74,-286]],[[72997,22284],[188,-39]],[[73185,22245],[569,-136]],[[73754,22109],[51,650],[-16,4],[52,659]],[[73841,23422],[-758,169]],[[73083,23591],[-86,-1307]],[[53519,18713],[9,14]],[[53528,18727],[61,243],[13,332],[103,396],[104,173],[5,421],[62,519],[-35,237]],[[53841,21048],[19,331]],[[53860,21379],[-1035,-17]],[[52825,21362],[1,-218],[-48,-19],[9,-1088],[-33,-1]],[[52754,20036],[12,-1323]],[[80652,38104],[-78,-809]],[[80574,37295],[594,-184]],[[81168,37111],[85,683]],[[81253,37794],[29,230],[-57,32],[-252,587]],[[80973,38643],[-262,75]],[[80711,38718],[-59,-614]],[[41670,68855],[38,-698]],[[41708,68157],[52,-974]],[[41760,67183],[794,96]],[[72898,26311],[381,-79]],[[73599,26159],[45,627]],[[73644,26786],[46,652]],[[73690,27438],[-318,58],[4,56],[-382,73]],[[41629,44279],[49,-1005]],[[41678,43274],[395,53],[64,-1338],[25,-332]],[[42162,41657],[1152,140]],[[43314,41797],[-37,332],[-55,1342],[-18,-2],[-69,1673]],[[43135,45142],[-598,-67]],[[42537,45075],[-941,-129]],[[41596,44946],[33,-667]],[[61137,33781],[775,-65]],[[61964,35050],[-384,19]],[[61580,35069],[-383,35]],[[57280,33959],[770,-23]],[[58050,33936],[5,333]],[[58055,34269],[4,331],[65,-2],[13,1008]],[[58137,35606],[-383,13]],[[57754,35619],[-383,15]],[[57371,35634],[-10,-1016],[-74,2],[-3,-329]],[[57284,34291],[-4,-332]],[[47358,51954],[1147,84]],[[48508,52727],[-17,1031]],[[48491,53758],[-383,-25],[-583,-70]],[[47525,53663],[-192,-15]],[[47333,53648],[38,-1356],[-13,-338]],[[73841,23422],[0,1]],[[73841,23423],[102,1320]],[[67181,70694],[561,-67],[193,-7]],[[67935,70620],[58,1341]],[[67993,71961],[-753,96]],[[67240,72057],[-59,-1363]],[[48616,41343],[379,78]],[[48995,41421],[399,64]],[[49394,41485],[-24,1194]],[[49370,42679],[-761,-49]],[[48609,42630],[-20,-1]],[[48589,42629],[27,-1286]],[[53058,36113],[322,6]],[[53380,36119],[442,7],[0,285]],[[53822,36411],[-4,1055]],[[53818,37466],[-581,-11]],[[53237,37455],[-188,-4]],[[53049,37451],[9,-1338]],[[78981,59990],[147,-148],[94,-4],[61,-201],[78,71]],[[79361,59708],[245,-76]],[[79606,59632],[94,1323],[165,212]],[[79865,61167],[-100,798],[20,194],[-124,233]],[[79661,62392],[-209,-219],[-89,-257],[-56,-451],[11,-127],[-76,-149]],[[79242,61189],[-37,-286],[-59,-109],[-59,-331],[-99,53],[-13,-199],[-153,19],[-125,96],[-33,-71]],[[78664,60361],[59,-115],[258,-256]],[[46064,70957],[254,23]],[[46318,70980],[698,66]],[[47016,71046],[-47,1679]],[[46969,72725],[-962,-86]],[[46007,72639],[57,-1682]],[[85845,54033],[136,-1],[47,-293],[71,-20],[41,-138]],[[86140,53581],[314,-24],[68,124],[172,-31]],[[86694,53650],[-277,1600]],[[86417,55250],[-73,-197],[-220,-174],[-73,-126],[-230,-111]],[[85821,54642],[-22,-225],[46,-384]],[[73310,36814],[762,-163]],[[74072,36651],[187,-41],[73,1002]],[[74332,37612],[-187,41]],[[74145,37653],[-12,-167],[-191,39],[-13,-168],[-573,121]],[[73356,37478],[-5,-72]],[[73351,37406],[-41,-592]],[[70586,60553],[134,-110],[311,101]],[[71031,60544],[66,45],[54,334],[152,170]],[[71303,61093],[44,1046]],[[71347,62139],[-678,82]],[[70669,62221],[-24,2]],[[70645,62223],[-8,-478],[-55,-991],[4,-201]],[[48333,67770],[962,56]],[[49295,67826],[-32,1679]],[[49263,69505],[-960,-61]],[[48303,69444],[24,-1289]],[[48327,68155],[6,-385]],[[57567,73471],[98,120],[106,-20],[64,152],[575,-271]],[[58410,73452],[10,754]],[[58420,74206],[8,755],[58,66]],[[58486,75027],[-941,59]],[[57545,75086],[-167,7],[-6,-410],[36,-472],[91,-268],[67,-327],[1,-145]],[[20029,9119],[1510,626]],[[21539,9745],[-215,1451],[-60,50],[-49,228],[-123,-26],[-192,79]],[[20900,11527],[-350,-136],[-1382,-584]],[[19168,10807],[96,-645],[574,249],[191,-1292]],[[58137,35606],[384,-13]],[[58521,35593],[19,1331]],[[58540,36924],[-194,8]],[[58346,36932],[-576,21]],[[57770,36953],[-16,-1334]],[[50251,69558],[3,-272]],[[50254,69286],[819,31]],[[51073,69317],[-2,129],[113,3]],[[51158,71113],[-251,-17]],[[50907,71096],[-689,-45]],[[50218,71051],[33,-1493]],[[53317,49876],[807,11]],[[54124,49887],[-9,1347]],[[53826,51565],[-554,-4]],[[51391,76228],[147,-143],[155,477]],[[51693,76562],[345,1037]],[[52038,77599],[-940,934]],[[51098,78533],[-501,-1532]],[[72809,30356],[756,-152]],[[73565,30204],[101,1304]],[[73666,31508],[1,22],[-387,81]],[[73280,31611],[-380,75]],[[72900,31686],[-91,-1330]],[[54808,51748],[767,4]],[[55575,51752],[2,841],[-10,338]],[[55567,52931],[-762,-3]],[[66344,35153],[384,-54]],[[66728,35099],[192,-26]],[[66920,35073],[-7,337],[61,1332]],[[66974,36742],[15,339]],[[66989,37081],[-556,84]],[[66433,37165],[-48,-1011]],[[66385,36154],[-41,-1001]],[[57298,40681],[764,-14]],[[58062,40667],[14,1245]],[[58076,41912],[-364,20]],[[57712,41932],[-402,16]],[[57310,41948],[-12,-1267]],[[55468,37e3],[768,-9]],[[56236,36991],[6,1006],[86,-2],[2,376]],[[56330,38371],[-189,1]],[[56141,38372],[-570,3]],[[55571,38375],[-1,-370],[-100,0],[-2,-1005]],[[11859,46070],[79,568],[-38,176],[119,263],[-16,94],[233,165],[289,-94],[82,80],[90,-65],[66,56],[114,-48],[116,85],[194,-394],[223,-117],[69,-158],[60,55],[71,-135],[-47,-71],[116,-73],[43,174],[108,-167],[55,81],[134,-166],[52,-405],[115,-196],[566,-599]],[[14752,45179],[62,141],[98,67],[74,327],[98,-10],[24,112]],[[15108,45816],[-78,473],[130,195],[19,180],[-42,91],[20,366],[86,44],[225,423],[-2,248],[40,400],[-28,207],[-47,8],[7,354]],[[15438,48805],[-1074,-434],[-50,314],[-549,-247],[-48,325],[-278,-125],[-232,244]],[[13207,48882],[-199,192],[-161,-3],[-355,-151],[-123,820],[-772,750]],[[11597,50490],[-46,-247],[-124,-75],[-55,-190],[-161,-319],[2,-117],[-79,-62],[-8,-228],[101,-110],[-52,-279]],[[11037,46911],[573,-587],[112,51],[13,-178],[124,-127]],[[57289,39687],[382,-10]],[[57671,39677],[380,-11]],[[58051,39666],[11,1001]],[[57298,40681],[-9,-994]],[[65348,39149],[287,-33]],[[65635,39116],[228,-25],[-42,176],[327,-41]],[[66148,39226],[191,-27],[30,688]],[[66369,39887],[-709,104]],[[65660,39991],[33,-205],[-319,35]],[[65374,39821],[-26,-672]],[[67024,43170],[-8,-168],[96,-12],[-7,-168],[167,-561]],[[67272,42261],[192,-27]],[[67464,42234],[69,1549]],[[67533,43783],[-3,338]],[[67530,44121],[-462,60]],[[67068,44181],[-44,-1011]],[[56527,39701],[379,-7]],[[56906,39694],[383,-7]],[[57298,40681],[-766,14]],[[56532,40695],[-5,-994]],[[68067,47703],[537,-87]],[[68604,47616],[65,-9]],[[68669,47607],[47,1078]],[[68716,48685],[-72,10]],[[68644,48695],[-334,52]],[[68310,48747],[-6,-111],[-183,20]],[[68121,48656],[-81,-123],[38,-115],[-32,-264],[44,-4],[-23,-447]],[[67646,60996],[47,-4],[241,-270],[94,-396]],[[68028,60326],[87,-7],[121,274],[169,92],[89,-53],[19,283]],[[68513,60915],[4,146]],[[68517,61061],[-368,45],[-130,100],[-78,207],[-44,248],[-112,14]],[[67785,61675],[-34,-311],[-98,-201],[-7,-167]],[[72338,34504],[764,-154]],[[73102,34350],[85,1194]],[[73187,35544],[-611,122]],[[72576,35666],[-157,30]],[[72419,35696],[-81,-1192]],[[83213,55830],[901,-183]],[[84114,55647],[21,215]],[[84135,55862],[103,1254]],[[84238,57116],[-375,126]],[[83863,57242],[-529,177]],[[83334,57419],[-121,-1589]],[[44360,46965],[975,95]],[[45335,47060],[-67,1673]],[[45268,48733],[-142,-12]],[[45126,48721],[-825,-78]],[[44301,48643],[48,-1347]],[[44349,47296],[11,-331]],[[73016,42390],[658,-133]],[[73674,42257],[21,338]],[[73695,42595],[48,729]],[[73743,43324],[-373,65],[3,56]],[[73373,43445],[-255,47],[-16,-280],[-63,12]],[[73039,43224],[-22,-326],[34,-8],[-35,-500]],[[87261,51454],[96,88],[-79,58],[-17,-146]],[[46649,57364],[965,73]],[[47614,57437],[6,0],[-43,1712]],[[47577,59149],[-965,-78]],[[46612,59071],[-12,-1]],[[46600,59070],[49,-1706]],[[72034,56767],[2,-409],[63,-145]],[[72099,56213],[69,6],[48,141],[339,9]],[[72555,56369],[1,117],[-165,187],[-85,246]],[[72306,56919],[-135,-157],[-67,154],[-70,-149]],[[29135,50294],[175,-318],[124,-61],[39,-170],[117,-229],[-71,-135],[75,-33],[79,-240],[324,38],[37,-172],[147,-224],[97,44],[32,-149],[105,-225],[88,-3],[80,-133]],[[30583,48284],[85,-118],[-46,-156],[-2,-233],[-70,-303],[-69,-125],[60,-107],[23,-243],[-33,-86]],[[30531,46913],[1655,406]],[[32186,47319],[-70,858],[-6,476]],[[32110,48653],[-84,1040]],[[32026,49693],[-125,1514]],[[31901,51207],[-153,1857]],[[31748,53064],[-1673,-406]],[[30075,52658],[-820,-212],[-51,-38],[-438,-111]],[[27719,52019],[128,-108],[77,75],[125,-261],[225,64],[173,-54],[114,-165],[59,-282],[99,-238],[181,-50],[38,-76],[-37,-151],[102,-76],[-73,-120],[154,-131],[51,-152]],[[59932,38223],[190,-12]],[[60122,38211],[572,-38]],[[60694,38173],[33,1338]],[[60343,39538],[-383,23]],[[59960,39561],[-28,-1338]],[[23764,3862],[1427,529]],[[25191,4391],[-231,1844]],[[24960,6235],[-1076,-396],[166,-1280],[-360,-135]],[[23690,4424],[74,-562]],[[65533,42329],[571,-88]],[[66104,42241],[9,171],[191,-28]],[[66304,42384],[45,896]],[[66349,43280],[24,503],[-126,19]],[[66247,43802],[-318,34],[-135,-42],[-7,-167],[-160,21]],[[65627,43648],[-19,-448],[-43,-111]],[[65565,43089],[-32,-760]],[[55599,49047],[767,-9]],[[56366,49038],[-15,169],[6,1177]],[[56357,50384],[-767,9]],[[55590,50393],[-1,-169]],[[55589,50224],[-2,-1008],[12,-169]],[[59666,73331],[256,-12],[-3,-169],[167,-13],[-67,-495]],[[60019,72642],[557,-31]],[[60576,72611],[13,503],[191,-8]],[[60780,73106],[24,835],[-50,100],[-21,246]],[[60733,74287],[-234,10]],[[60499,74297],[-467,22]],[[60032,74319],[-55,-332],[-404,18]],[[59573,74005],[37,-188],[-39,-93],[41,-231],[-40,-110],[94,-52]],[[11889,40237],[158,-9],[84,55],[130,-81],[155,121],[141,238],[193,57],[423,-4],[150,-210],[136,3],[49,-174],[91,0]],[[13599,40233],[-110,720]],[[13489,40953],[-222,-59],[-141,34],[-187,-28],[-46,-67],[-88,64],[-292,97],[-56,152],[-330,81],[-185,180],[-165,-91]],[[11777,41316],[-9,-304]],[[11768,41012],[121,-775]],[[13921,38921],[-36,255],[124,319]],[[14009,39495],[10,256],[-200,287],[-220,195]],[[11889,40237],[-29,-848],[-40,1]],[[11820,39390],[128,-354],[84,-82],[75,-245],[67,22],[127,-120],[129,100],[106,-143],[139,48],[111,288],[99,165],[110,-17],[88,-97],[96,-208],[175,102],[244,75],[88,-106],[235,103]],[[61596,58376],[831,-30]],[[62427,58346],[30,340],[12,633],[-48,2],[4,228]],[[62425,59549],[-77,2],[-165,304]],[[62183,59855],[-85,-53],[-107,-181],[-91,54],[-79,-87],[-116,34],[46,-116],[-29,-152],[73,-116],[-103,-109],[-51,-181],[-88,33],[-14,-105]],[[61539,58876],[-37,-161],[97,-1],[-3,-338]],[[83674,48560],[95,-33],[-60,205],[-35,-172]],[[84212,53105],[-222,67]],[[83990,53172],[10,-143],[-119,-69],[25,-65],[145,25],[25,-177],[192,230],[-56,132]],[[81379,53411],[87,-106],[-48,178]],[[81418,53483],[-39,-72]],[[84196,45674],[59,-185],[99,202],[-137,162],[-21,-179]],[[83175,52853],[30,-116],[79,6],[33,217],[-142,-107]],[[70618,38305],[647,-119]],[[71265,38186],[23,337],[95,-22],[10,169],[122,-25]],[[71515,38645],[9,167]],[[71524,38812],[-369,79],[19,330]],[[71174,39221],[-499,87]],[[70675,39308],[-57,-1003]],[[56895,38361],[762,-19]],[[57657,38342],[14,1335]],[[56906,39694],[-11,-1333]],[[9578,45787],[147,-165],[146,50],[17,89]],[[11597,50490],[67,35],[39,177],[-45,63],[47,243]],[[11705,51008],[-1561,-725],[-401,-194]],[[9743,50089],[-147,-430],[-2,-460],[-102,-133],[-48,-394],[-102,-372],[-143,-224],[-88,-377],[26,-244],[-5,-418],[61,-269],[-51,-116],[111,-154],[40,150],[143,-153],[152,-516],[-10,-192]],[[62881,47724],[130,-9],[6,232],[136,-11],[5,228],[263,-16]],[[63421,48148],[28,1247]],[[63449,49395],[-202,-221],[-94,51],[-165,-76],[-4,-82],[-155,-233],[-96,36]],[[62733,48870],[-86,-33]],[[62647,48837],[-10,-523],[260,-16],[-16,-574]],[[81638,55041],[318,-215],[64,45],[38,-144],[61,49],[74,-82],[31,93],[122,-35],[32,63]],[[82378,54815],[61,384],[-118,211],[51,168]],[[82372,55578],[-350,80]],[[82022,55658],[-334,75]],[[81688,55733],[-50,-692]],[[73085,28957],[381,-80]],[[73466,28877],[96,1287]],[[73562,30164],[3,40]],[[72809,30356],[-43,-662],[-17,4],[-46,-664]],[[75904,51361],[110,-502],[112,-218],[47,-15]],[[76173,50626],[24,-5]],[[76197,50621],[173,154],[173,72]],[[76543,50847],[-60,528]],[[76483,51375],[-109,-107],[-69,125],[-92,-16],[-12,108],[-148,61],[-107,-96]],[[75946,51450],[-42,-89]],[[55567,52931],[766,-9]],[[56333,52922],[1,224]],[[56334,53146],[6,1122]],[[56340,54268],[-761,9]],[[55579,54277],[-8,0]],[[55571,54277],[-4,-1346]],[[72042,30508],[767,-152]],[[72900,31686],[-384,76]],[[72516,31762],[-381,78]],[[72135,31840],[-93,-1332]],[[71482,33314],[361,-70]],[[71843,33244],[398,-70]],[[72241,33174],[97,1330]],[[72338,34504],[-768,154]],[[71570,34658],[-88,-1344]],[[69620,52124],[145,-162]],[[69765,51962],[269,196],[301,166],[102,7]],[[70437,52331],[-97,326],[20,248]],[[70360,52905],[-125,29],[-63,137],[-151,-18]],[[70021,53053],[-103,-113],[-16,-360],[-56,-191]],[[69846,52389],[-164,-68],[-62,-197]],[[55595,28035],[565,-4]],[[56160,28031],[16,333],[384,-7]],[[56560,28357],[8,997]],[[56568,29354],[-952,15]],[[55616,29369],[-16,1]],[[55600,29370],[-5,-1335]],[[70971,26672],[408,-78]],[[71379,26594],[89,1331]],[[70709,28065],[-92,-1340]],[[70709,28065],[-629,96]],[[70080,28161],[-86,-570],[-101,-318],[121,-259],[55,-236]],[[71468,27925],[756,-138]],[[72320,29111],[-767,140]],[[70108,29495],[680,-100]],[[71230,29988],[20,336]],[[71250,30324],[-189,31],[22,333],[-588,107]],[[70495,30795],[-245,-721],[-142,-579]],[[58512,29293],[388,-17]],[[58900,29276],[573,-30]],[[59473,29246],[25,1339]],[[59498,30585],[-723,36]],[[58775,30621],[-244,10]],[[58531,30631],[-19,-1338]],[[66334,47230],[-31,-729],[189,-25]],[[66492,46476],[573,-66]],[[67065,46410],[49,1173],[194,-37]],[[67308,47546],[13,340]],[[67321,47886],[-761,105],[13,339]],[[66573,48330],[-200,2]],[[66373,48332],[-47,-989],[8,-113]],[[67065,46410],[572,-71]],[[67637,46339],[8,168],[188,-25]],[[67833,46482],[46,1002]],[[67879,47484],[-571,62]],[[58222,21745],[21,1002]],[[58243,22747],[-610,25]],[[57633,22772],[-87,-228],[6,-188],[-119,-404]],[[57433,21952],[-129,-175],[918,-32]],[[45530,62354],[990,82]],[[46520,62436],[-50,1676]],[[46470,64112],[-735,-65]],[[45735,64047],[-265,-23]],[[55094,20725],[969,-7]],[[56063,20718],[16,1273]],[[56079,21991],[0,55]],[[56079,22046],[-965,6]],[[55114,22052],[-2,-664],[-17,0],[-1,-663]],[[50786,58907],[190,7]],[[50976,58914],[766,27]],[[51742,58941],[-15,1692]],[[51727,60633],[-958,-30]],[[66957,58079],[345,-32],[-1,-82]],[[67301,57965],[228,355],[134,26],[141,174]],[[67804,58520],[22,1048]],[[67826,59568],[-376,25]],[[67450,59593],[-95,-103],[-263,-104],[-64,-400],[-99,-111]],[[66929,58875],[40,-107],[-12,-689]],[[68650,58182],[59,-115],[60,-283],[86,-172],[-45,-191],[4,-187],[186,-31]],[[69e3,57203],[19,24]],[[69019,57227],[52,152],[25,264]],[[69096,57643],[76,308],[0,118],[-127,414],[-6,316],[156,20],[-11,271],[-35,102]],[[69149,59192],[-10,99]],[[69139,59291],[-102,33],[-7,-110],[-267,14]],[[68763,59228],[-71,7],[-42,-1053]],[[81997,65855],[71,92],[209,84],[286,203],[195,200],[28,128],[83,81]],[[82869,66643],[-161,245],[4,253],[-72,-145],[-240,361]],[[82400,67357],[-236,-295]],[[82164,67062],[-78,-143],[-57,-908],[-32,-156]],[[49265,85418],[768,557]],[[50033,85975],[410,903]],[[50443,86878],[177,371]],[[50620,87249],[-474,646]],[[50146,87895],[2,-135],[-915,-39]],[[49233,87720],[21,-1690]],[[49254,86030],[11,-612]],[[51324,30651],[242,6]],[[51566,30657],[578,16]],[[52144,30673],[331,9]],[[52468,31951],[-386,-8]],[[52082,31943],[-713,-23]],[[51369,31920],[-51,-111]],[[42034,24047],[29,-8],[40,-810]],[[42103,23229],[1698,230]],[[43801,23459],[-29,661]],[[43772,24120],[-82,1661],[-955,-124]],[[41956,25674],[78,-1627]],[[23535,91888],[96,-462]],[[23631,91426],[76,171],[265,402]],[[23972,91999],[-52,77],[-116,-133],[-217,-29],[-13,76]],[[23574,91990],[-39,-102]],[[23513,91993],[14,-65]],[[23527,91928],[-14,65]],[[23011,91654],[1,178],[49,65],[176,-268]],[[23237,91629],[16,105],[173,287],[60,227],[-112,-215],[-88,-62],[55,162],[118,142],[86,314],[-178,553],[-43,18],[-62,-238],[37,-251],[-86,-125],[-96,-243],[-14,-143],[-169,-454],[-60,-244],[137,192]],[[22285,90354],[0,0]],[[22956,92319],[-68,27],[-299,-173],[-14,233],[-138,74]],[[22437,92480],[-100,-85],[-24,-198],[61,-128],[-39,-153],[85,100],[98,-88],[58,-146],[164,133],[210,16],[45,154],[-74,88],[86,54],[-51,92]],[[21622,91487],[144,-199]],[[21766,91288],[222,-445],[94,-51],[16,-139]],[[22098,90653],[246,0],[89,59],[114,251],[-50,73],[0,166],[84,7],[130,199],[-67,44],[40,119]],[[22684,91571],[-78,-1],[-99,114],[-52,-307],[-111,-222],[-48,110],[-114,-66],[-46,-158],[-33,119],[-95,-53],[-7,89],[133,14],[132,153],[58,1],[130,346],[-120,172],[-65,3],[-42,154],[-132,-181],[-66,30],[-218,-176],[-189,-225]],[[49503,25196],[940,52]],[[50443,25248],[18,1],[-17,1006]],[[50444,26255],[-20,1676]],[[50424,27931],[-360,-18]],[[52366,26673],[578,17]],[[52944,26690],[-12,1330]],[[51783,27992],[-7,0]],[[51776,27992],[16,-1338]],[[69739,60001],[120,-187],[72,78],[163,33],[207,-202]],[[70301,59723],[-8,289],[128,145],[32,222],[-27,155]],[[70426,60534],[-59,-37],[-221,29],[7,143],[-118,105],[-105,15]],[[69930,60789],[-65,-136],[-72,-12],[-5,-118],[-130,-22]],[[69658,60501],[44,-257],[58,-89],[-21,-154]],[[64080,22996],[-26,-660]],[[64054,22336],[961,-110],[19,336]],[[65034,22562],[52,1328]],[[65086,23890],[-972,106]],[[64114,23996],[-34,-1e3]],[[67192,60030],[90,72],[212,-463],[-44,-46]],[[67826,59568],[179,-17]],[[68005,59551],[23,775]],[[67646,60996],[-428,41]],[[67218,61037],[-26,-1007]],[[85035,47024],[47,-183],[66,19],[6,144],[-119,20]],[[33651,17704],[385,93],[84,-1023],[23,6],[63,-766]],[[34206,16014],[18,-218],[578,141]],[[34802,15937],[-40,489],[18,171],[129,33],[-27,329],[56,160],[-28,328],[101,359],[-44,548]],[[34967,18354],[-223,-52]],[[34744,18302],[-755,-180],[-29,331]],[[33960,18453],[-289,-72],[29,-330],[-76,-19],[27,-328]],[[38503,29257],[98,16]],[[38601,29273],[1506,246]],[[40107,29519],[289,43]],[[40396,29562],[-147,2724],[-28,686]],[[40221,32972],[-642,-94],[-34,669]],[[39545,33547],[-79,-12],[-60,201],[-41,327],[-247,-38],[-140,-84],[16,-280],[63,12],[44,-198],[-842,-160]],[[38259,33315],[-4,-1]],[[78384,55117],[143,-1],[259,-145],[83,9],[74,113],[124,-6]],[[79067,55087],[-25,567]],[[79042,55654],[-139,417],[-158,61],[-103,230]],[[78642,56362],[-109,-169],[-52,-1021],[-128,36]],[[78353,55208],[31,-91]],[[62707,23477],[-10,-333],[386,-31]],[[63083,23113],[347,-30],[650,-87]],[[64114,23996],[-242,24],[12,332],[-185,18]],[[63699,24370],[-186,30],[-771,73]],[[62742,24473],[-35,-996]],[[31091,21746],[406,103],[121,74],[790,192],[142,7],[486,129]],[[33036,22251],[1087,251],[30,31],[723,165]],[[34876,22698],[-37,490],[44,10],[-104,1330],[30,8],[-105,1338],[37,9]],[[34741,25883],[-27,338]],[[34714,26221],[-383,-88],[-26,337],[-197,-46],[-21,329],[-286,-66],[-28,329],[-350,-67]],[[33423,26949],[-76,-132],[-93,-362],[-179,-138],[-166,160],[-36,195],[-215,126],[-88,-100],[63,-228],[-55,-170],[25,-102],[-220,-37],[-73,-242]],[[32310,25919],[34,-388],[-104,-155],[41,-248],[-27,-307],[-81,-100],[-20,-271],[-86,-235],[52,-246],[-4,-173],[-135,-114],[7,-76],[-452,-118],[29,-316],[-607,-164]],[[30957,23008],[118,-1267],[16,5]],[[54635,28037],[751,1]],[[55386,28038],[209,-3]],[[55600,29370],[-947,-1]],[[54633,29369],[2,-1332]],[[66822,31065],[191,-21]],[[67013,31044],[574,-70]],[[67587,30974],[54,1337]],[[67641,32311],[-383,59]],[[67258,32370],[-383,49]],[[66875,32419],[-53,-1354]],[[54014,28033],[597,3]],[[54611,28036],[24,1]],[[54009,29365],[5,-1332]],[[87008,45106],[88,37],[248,-229],[56,-147],[65,80],[-4,249],[71,108]],[[87532,45204],[-72,94],[15,384]],[[87475,45682],[-87,76]],[[87388,45758],[-189,-120],[-63,53],[26,-218],[-175,48]],[[86987,45521],[-39,-51],[3,-332],[57,-32]],[[26874,17822],[54,-31],[12,-180],[85,-110],[49,136],[241,-283],[165,27],[110,-85],[42,-210]],[[27632,17086],[31,20],[85,686],[109,-147],[95,11],[91,-159],[85,-47],[118,51],[14,86]],[[28260,17587],[128,242],[121,147],[174,117],[44,315],[51,52],[1,201]],[[28779,18661],[-63,337],[1,193],[81,191],[75,65],[115,-17],[45,205],[-106,1153],[191,58],[-34,331],[222,66],[-32,331],[37,12],[-33,323],[158,50],[-16,160],[443,138],[-27,272],[468,134]],[[30304,22663],[-2,167],[-104,206],[69,225],[-54,31],[-124,-124],[-55,37]],[[30034,23205],[-132,-80],[-24,58],[-179,82],[-56,-229],[-183,54],[-78,-62],[-126,64],[-116,-82],[-79,-159],[-67,-22],[-129,116],[-76,292],[-122,-161],[-49,51],[-71,-106],[-172,-55],[-84,-98],[-105,44],[-110,208],[16,183]],[[28092,23303],[-55,56],[-50,-162],[-162,-264],[-17,-185],[41,-100],[-89,-324],[55,-57],[1,-227],[-40,-82],[-22,-300],[-160,-245],[-163,97],[-8,-139],[-135,-221],[-28,-332],[84,-18],[28,-377],[-92,-161],[19,-80],[-89,-80],[-13,-248],[-106,-278],[-49,-294],[30,-252],[-51,-260],[56,-237],[-106,-35],[77,-292],[-124,-203],[-50,-181]],[[32866,15613],[249,-45],[131,44],[96,-40],[208,281],[113,26]],[[33663,15879],[543,135]],[[33651,17704],[-962,-248]],[[32689,17456],[91,-1015],[12,3],[74,-831]],[[58958,55293],[960,-10]],[[60205,55338],[8,1009]],[[60213,56347],[-700,7]],[[59513,56354],[-67,1],[-3,-676],[-482,9]],[[58961,55688],[-3,-395]],[[59815,48185],[0,-170],[190,-366]],[[60005,47649],[37,165],[109,145],[106,33],[130,-54],[272,35]],[[60659,47973],[107,181]],[[60766,48154],[-186,890],[1,56],[-385,8]],[[60196,49108],[-381,-15]],[[59815,49093],[0,-908]],[[51444,45463],[960,28]],[[52404,45491],[-3,335]],[[52401,45826],[-11,1007]],[[52390,46833],[-958,-30]],[[51432,46803],[8,-1005]],[[51440,45798],[4,-335]],[[87726,45928],[81,-214],[119,191],[124,87],[2,120],[197,7],[44,46]],[[88293,46165],[150,85],[42,232],[83,89]],[[88568,46571],[-97,40],[-112,217]],[[88359,46828],[-115,-79],[-213,-329],[-69,-11],[-43,-139],[-105,-64]],[[87814,46206],[-88,-278]],[[66672,59365],[111,-34],[122,-312],[24,-144]],[[67192,60030],[-86,-15],[-164,-165],[-121,-15],[-162,-223]],[[66659,59612],[13,-247]],[[70515,43161],[623,-112]],[[71138,43049],[67,1120]],[[71205,44169],[-237,50],[7,112],[-324,53]],[[70651,44384],[19,-115],[-78,12],[-50,-900],[-14,2]],[[70528,43383],[-13,-222]],[[47402,48928],[161,15]],[[47563,48943],[959,70]],[[48522,49013],[23,2]],[[48545,49015],[-29,1339]],[[48516,50354],[-6,336]],[[48510,50690],[-1117,-79]],[[47393,50611],[-30,-2]],[[66974,36742],[560,-96]],[[67534,36646],[1,0]],[[67535,36646],[63,1002]],[[67598,37648],[-568,101]],[[67030,37749],[-41,-668]],[[69835,38183],[233,-226],[64,-151],[48,-319],[89,-134],[195,-34]],[[70464,37319],[96,-17]],[[70560,37302],[58,1003]],[[70618,38305],[-769,126]],[[69849,38431],[-14,-248]],[[71838,44033],[-13,-226]],[[71825,43807],[539,-105]],[[72364,43702],[67,942]],[[72431,44644],[23,393],[-92,18]],[[72362,45055],[-455,94]],[[60228,52150],[411,-12],[39,199],[92,148],[81,-110],[86,8],[73,-139]],[[61010,52244],[4,560],[294,234],[3,169]],[[61311,53207],[7,508]],[[61318,53715],[-763,16]],[[60262,53738],[-5,-915],[-24,1],[-5,-674]],[[58535,44264],[679,-60]],[[59214,44204],[11,1017],[167,-7]],[[59392,45214],[-33,85],[20,255]],[[59379,45554],[-819,53]],[[58560,45607],[-10,-668]],[[58550,44939],[-15,-675]],[[72252,22754],[192,-32],[-22,-331]],[[72422,22391],[575,-107]],[[72336,23734],[-84,-980]],[[45709,43742],[45,-1339]],[[45754,42403],[921,87]],[[46675,42490],[32,3]],[[46707,42493],[-40,1337]],[[46667,43830],[-958,-88]],[[45709,43742],[-2,0]],[[72511,26386],[-78,-1046],[-12,-285]],[[57159,53210],[954,25]],[[58113,53235],[-1,225]],[[58112,53460],[-1,896]],[[58111,54356],[-942,-29]],[[57169,54327],[-10,-1117]],[[45735,64047],[-53,1676]],[[45682,65723],[-175,-14]],[[45507,65709],[-786,-74]],[[44721,65635],[56,-1674]],[[74140,32768],[304,-64],[453,-127]],[[74897,32577],[182,-56]],[[75079,32521],[123,1329]],[[75202,33850],[-382,98]],[[74820,33948],[-582,169]],[[74238,34117],[-98,-1349]],[[71753,31920],[382,-80]],[[72516,31762],[95,1334]],[[72611,33096],[-370,78]],[[71843,33244],[-90,-1324]],[[33060,70430],[574,119]],[[33634,70549],[-214,3136]],[[33420,73685],[-1711,-363]],[[31709,73322],[7,-311]],[[31716,73011],[63,-821],[-25,-6],[127,-1664],[569,121],[24,-331],[586,120]],[[78109,53748],[31,-134],[92,39],[92,-262],[405,-123],[-4,33]],[[78725,53301],[185,607]],[[78910,53908],[103,416]],[[79013,54324],[-554,142]],[[78459,54466],[-389,95]],[[78070,54561],[-273,65]],[[77797,54626],[41,-330],[201,-272],[70,-276]],[[92968,16433],[-28,-214],[75,-267],[2,-294],[-87,-84],[88,-34],[115,-325],[115,156],[149,-51],[38,-256]],[[93435,15064],[390,2e3],[316,1723]],[[94141,18787],[-52,28],[30,170],[-327,123],[-5,607],[-49,21],[-62,-264],[-119,-130]],[[93557,19342],[-63,-118],[-107,-7],[-101,79],[-46,-179],[-185,-25],[-148,-228]],[[92907,18864],[86,-61],[60,-277],[88,-145],[-60,-185],[55,-65],[-32,-250],[-65,-79],[-122,-316],[62,-158],[1,-303],[58,-218],[-109,-241],[39,-133]],[[49503,9581],[781,43]],[[50284,9624],[-20,1064],[44,3],[-12,657]],[[50296,11348],[-13,657],[-344,-20]],[[49939,11985],[-438,-27]],[[49501,11958],[14,-658]],[[49515,11300],[14,-656],[-49,-3],[23,-1060]],[[57180,55736],[-2,-223]],[[57178,55513],[987,4]],[[58165,55517],[-1,449]],[[58164,55966],[-2,710]],[[57187,56633],[-7,-897]],[[23847,92913],[91,-42],[130,212],[202,195],[-91,178],[-141,25],[-6,124],[-97,-12]],[[23935,93593],[-86,-226],[-42,-244],[83,-111],[-43,-99]],[[23972,91999],[256,410],[-17,181],[140,-19],[13,218]],[[24234,93116],[-120,-107],[-138,-197],[-246,-69],[-17,-242],[-74,-272],[-79,-23],[-12,-118],[219,58],[-193,-156]],[[52483,36099],[575,14]],[[53049,37451],[-385,-8]],[[52664,37443],[-192,-5]],[[52472,37438],[11,-1339]],[[52493,35095],[574,15]],[[53067,35110],[-2,334],[321,6]],[[53386,35450],[-6,669]],[[52483,36099],[10,-1004]],[[67451,21264],[232,-38],[-34,-669],[124,-19],[-17,-331]],[[67756,20207],[386,-57]],[[68142,20150],[18,328],[66,-9],[67,1322],[99,-12]],[[68392,21779],[-87,410],[15,63],[-92,249],[-94,382],[-198,572],[38,136]],[[51243,87725],[405,-542]],[[51648,87183],[313,-419],[150,116],[66,123]],[[52177,87003],[5,72],[140,-74],[89,126],[52,217],[-51,631],[41,219]],[[52453,88194],[-428,618]],[[52025,88812],[-205,-177],[-139,-67],[-12,-243],[-171,-31],[-99,-82],[-67,-335],[-89,-152]],[[51605,18674],[542,21]],[[52754,20036],[-1124,-34]],[[51587,19999],[18,-1325]],[[45584,60672],[981,84]],[[46565,60756],[-45,1680]],[[45530,62354],[54,-1682]],[[81191,34624],[107,-217],[123,-366],[355,-86],[-3,-26]],[[81773,33929],[164,-51]],[[81937,33878],[62,604],[66,79],[21,203]],[[82086,34764],[19,193],[-201,116],[16,168],[-66,111],[15,136],[-57,193]],[[81812,35681],[-501,151]],[[81311,35832],[-120,-1208]],[[46470,64112],[227,19]],[[46466,65785],[-784,-62]],[[58964,55970],[-3,-282]],[[59513,56354],[1,1229]],[[59514,57583],[-479,20]],[[59035,57603],[1,-1240],[-70,1],[-2,-394]],[[74993,42582],[195,-17],[1,58],[194,-18],[4,96],[314,26]],[[75701,42727],[6,217]],[[75707,42944],[21,644]],[[75728,43588],[-525,42]],[[75203,43630],[-235,17]],[[74968,43647],[-38,-1005],[63,-60]],[[57756,43609],[767,-13]],[[58523,43596],[12,668]],[[58550,44939],[-761,11]],[[57789,44950],[-6,-948],[-26,0]],[[57757,44002],[-1,-393]],[[60875,41680],[287,-32]],[[61162,41648],[397,-49]],[[61559,41599],[18,1176]],[[61577,42775],[-672,39]],[[60905,42814],[-7,-168]],[[60898,42646],[-23,-966]],[[48716,74546],[145,7]],[[48861,74553],[366,26]],[[49227,74579],[458,1473]],[[49685,76052],[-174,40],[-43,294],[-410,465]],[[49058,76851],[-94,-30],[-95,109]],[[48869,76930],[-213,-36]],[[48656,76894],[60,-2348]],[[42456,70609],[719,83]],[[43175,70692],[-53,1673]],[[43106,72363],[-1596,-187]],[[41510,72176],[73,-1675]],[[52038,77599],[141,295],[125,-134]],[[52693,78894],[-364,363],[-112,523]],[[52217,79780],[-588,-467],[-388,-150]],[[51241,79163],[-154,-499]],[[51087,78664],[11,-131]],[[23189,3634],[575,228]],[[23690,4424],[-234,1754],[-168,1199]],[[23288,7377],[-580,-233]],[[22708,7144],[42,-323],[-95,-37],[263,-1922],[-189,-73],[43,-320],[96,36],[46,-345],[95,37],[42,-318],[100,39],[38,-284]],[[78094,74083],[-8,-108],[279,-54]],[[78365,73921],[7,91],[156,29],[104,252],[73,8]],[[78705,74301],[-55,55],[17,243],[-105,221]],[[78562,74820],[-42,103],[-99,18]],[[78421,74941],[-267,47]],[[78154,74988],[-60,-905]],[[45233,79563],[1617,116]],[[46850,79679],[-42,1608]],[[46808,81287],[-1124,-82]],[[45684,81205],[-500,-42]],[[45184,81163],[49,-1600]],[[82600,50130],[78,-368],[57,-149],[-131,-274],[3,-92]],[[82607,49247],[158,-259],[136,-428],[260,72]],[[83161,48632],[38,257],[-15,133],[216,195],[-2,59],[155,141]],[[83553,49417],[-123,363],[-135,-98],[-238,388],[70,66],[-5,121],[-86,189]],[[83036,50446],[-40,-64],[-371,-204],[-25,-48]],[[57769,76310],[586,108],[204,189]],[[58559,76607],[7,397],[-113,219],[43,176],[-43,262],[35,213],[-13,406]],[[58475,78280],[-7,61],[-164,79]],[[58304,78420],[-122,-137],[-51,-141],[-207,-191]],[[57924,77951],[-27,-147],[44,-159],[-30,-212],[46,-239],[-31,-88],[35,-314],[-22,-239],[-170,-243]],[[59252,18094],[1167,-60],[23,382]],[[60442,18416],[21,938]],[[60463,19354],[-1177,62]],[[59286,19416],[-24,-662],[-10,-660]],[[79102,81202],[88,-16],[17,-304],[40,-143],[-12,-168]],[[79235,80571],[764,-184]],[[79999,80387],[-34,277],[21,441],[53,172]],[[80039,81277],[-60,206],[6,270],[-127,409],[17,86],[-186,277]],[[79689,82525],[-35,-207],[-105,-268],[-153,-32],[-44,-136],[-183,-118],[-27,-363],[-40,-199]],[[77445,66363],[255,-915]],[[77700,65448],[53,48],[86,290],[79,76]],[[77918,65862],[138,349],[162,223],[-4,195]],[[78214,66629],[-452,293]],[[77762,66922],[-299,-289]],[[77463,66633],[-18,-270]],[[11860,79978],[258,74],[21,-227],[516,128],[8,-114],[203,44],[-8,114],[135,28],[8,-114],[135,25],[-7,114],[272,47],[6,-115],[135,21],[-5,115],[742,84],[-4,115],[270,19],[-2,114],[270,13],[0,46]],[[14813,80509],[-19,298],[68,2],[65,232],[68,1],[-20,461],[135,1],[48,116],[-1,461],[-20,115],[-201,-2],[-2,230],[-203,-6],[-19,346],[-134,-6],[-63,-235],[-134,-8],[-6,231],[-134,-10],[6,-231],[-267,-24],[-16,462],[-338,-39],[-10,231],[-201,-28],[-25,577]],[[13390,83684],[-73,105],[-537,-91],[-741,-166],[20,-229],[-67,-17],[21,-228],[-90,-24],[42,-457],[-24,-6],[42,-457],[-11,-144]],[[11972,81970],[178,32],[3,186],[-78,336],[32,183],[188,49],[135,-11],[107,107],[84,-50],[90,95],[111,-270],[174,40],[-34,-143],[-119,-104],[-125,45],[27,-218],[-102,-299],[-65,-31],[-31,-168],[101,-102],[79,236],[-30,174],[135,305],[80,-38],[-150,-350],[42,-213],[90,-120],[-80,-103],[-217,52],[-362,-286],[11,-172],[-42,-387],[-344,-767]],[[43068,15267],[862,118]],[[43930,15385],[102,13],[-58,1320]],[[43974,16718],[-303,-38],[-60,1330]],[[43031,17933],[62,-1329],[-88,-12],[63,-1325]],[[58152,18007],[-10,-866]],[[58142,17141],[1100,-36]],[[59242,17105],[10,989]],[[59286,19416],[20,995]],[[59306,20411],[-586,45]],[[58720,20456],[-4,-352],[-566,36]],[[58150,20140],[-22,-28],[-19,-1270],[52,-23],[-9,-812]],[[32509,43508],[51,-622]],[[32560,42886],[262,62],[-3,39],[576,133],[13,-166],[1041,228],[37,-500],[414,68],[442,100],[25,-342],[189,49],[51,-672],[470,92]],[[36077,41977],[-39,662]],[[36038,42639],[-135,-27],[-145,2119]],[[35758,44731],[-539,-111]],[[35219,44620],[-1662,-357],[-1088,-254]],[[32469,44009],[40,-501]],[[56357,50384],[4,507],[-18,0],[1,853]],[[56344,51744],[-769,8]],[[55575,51752],[2,-854],[13,-505]],[[47278,67691],[96,7]],[[47374,67698],[-31,1687]],[[47343,69385],[-975,-76]],[[48675,60162],[1335,71]],[[50010,61239],[-6,337]],[[50004,61576],[-1336,-76]],[[48672,61332],[-20,-167],[23,-1003]],[[75813,39147],[191,-44],[-4,-58],[322,-78]],[[76742,38860],[16,224],[-160,80],[44,554],[-96,47],[9,195]],[[76555,39960],[-384,50]],[[76171,40010],[-18,-241],[-284,72]],[[75869,39841],[-56,-694]],[[64025,39618],[-9,-336]],[[64016,39282],[756,-72]],[[64772,39210],[23,673]],[[64795,39883],[36,1009]],[[64831,40892],[-768,71]],[[64063,40963],[-38,-1345]],[[77041,64392],[115,217],[279,7],[98,38],[66,241]],[[77599,64895],[-182,273]],[[77417,65168],[-56,-32],[-150,121],[-79,-118]],[[77132,65139],[-149,-256],[58,-491]],[[67030,37749],[77,1337]],[[67107,39086],[-573,84],[29,685]],[[66563,39855],[-194,32]],[[66148,39226],[-35,-792]],[[66113,38434],[-50,-1057]],[[66063,37377],[-8,-166],[378,-46]],[[73330,75531],[-22,-343],[94,-46],[-22,-305]],[[73380,74837],[672,-123]],[[74052,74714],[97,1609]],[[74149,76323],[-761,154]],[[73388,76477],[-58,-946]],[[85233,89135],[774,-218],[-18,-218],[167,-45]],[[86156,88654],[298,856],[46,172]],[[86500,89682],[-118,88],[-1472,405]],[[84910,90175],[354,-724],[-31,-316]],[[58055,34269],[772,-30]],[[58827,34239],[6,333],[59,-2],[15,1006]],[[58907,35576],[-386,17]],[[59600,34204],[6,331],[39,-1],[21,1005]],[[59288,35560],[-381,16]],[[25155,20669],[-39,224],[127,421],[129,36],[63,322],[91,-79],[56,57],[91,-192],[85,-56],[37,-131],[-36,-129],[88,-45],[28,-128],[152,-168],[106,-15],[-79,426],[119,104],[90,-71],[74,498],[203,500],[29,120],[189,167],[40,81],[235,186],[97,-84],[39,282],[75,282],[-4,322]],[[27240,23599],[-151,-48],[-70,656],[-66,-21],[-12,292],[-61,397],[66,86],[31,207],[-103,-28],[-22,123],[-149,172],[-407,245],[-83,182]],[[26213,25862],[-88,-346],[-132,-268],[-26,-234],[-114,84],[-72,-46],[-25,-140],[-186,-285],[-3,-219],[-111,13],[-70,-107],[-153,-65],[-55,190],[-205,-390],[-208,-72],[28,-245],[-93,-32],[-178,152]],[[24522,23852],[-26,-53]],[[24496,23799],[40,-227],[-74,-58],[0,-154],[89,-123],[-67,-109],[56,-64],[-208,-313],[24,-358],[-157,-166],[-4,-59]],[[24195,22168],[143,-288],[13,-360],[-54,-23],[-7,-241],[47,-91],[195,-86],[63,-297],[111,-116],[188,254],[261,-251]],[[75908,74806],[-27,-452]],[[75881,74354],[303,-63],[8,-93],[199,46]],[[76391,74244],[181,-40]],[[76572,74204],[-3,137],[119,476],[-27,84]],[[76661,74901],[-39,-62],[-74,120],[-278,34]],[[76270,74993],[-286,49],[-32,-245],[-44,9]],[[55159,34316],[579,-6]],[[55738,34310],[2,334],[107,-1],[2,1015]],[[55849,35658],[-571,4]],[[55278,35662],[0,-1013],[-118,0],[-1,-333]],[[36084,50742],[185,39],[-20,333],[953,175]],[[37202,51289],[-84,1334]],[[35945,52390],[65,-998],[27,5],[47,-655]],[[59173,38266],[759,-43]],[[59960,39561],[-383,22]],[[59577,39583],[-381,20]],[[59174,38331],[-1,-65]],[[41981,41296],[193,26],[-12,335]],[[41678,43274],[-752,-106]],[[40926,43168],[106,-2011],[949,139]],[[60080,36851],[772,-49]],[[60852,36802],[32,1358]],[[60884,38160],[-190,13]],[[60122,38211],[-24,-355],[-18,-1005]],[[65051,41637],[96,-119],[256,-130],[-6,-131],[63,-251],[91,-150],[-3,-181]],[[65548,40675],[377,-47],[26,509],[100,70]],[[66051,41207],[53,1034]],[[65533,42329],[-189,25],[-21,-448],[-349,38]],[[64974,41944],[77,-307]],[[39975,44708],[1609,236]],[[41584,44944],[-92,1683],[-45,1007],[-577,-90]],[[40870,47544],[57,-996],[-1046,-163]],[[39881,46385],[94,-1677]],[[58540,36924],[578,-24]],[[59118,36900],[16,1009],[33,-3],[6,360]],[[58406,38284],[-5,-341],[-39,1],[-16,-1012]],[[74213,40788],[-6,-91],[160,-35],[-29,-391],[562,-129]],[[74900,40142],[46,652],[-7,155]],[[74939,40949],[12,345]],[[74951,41294],[-333,9],[-359,88]],[[74259,41391],[-46,-602]],[[74213,40789],[0,-1]],[[57657,38342],[573,-18],[176,-40]],[[58426,39631],[-375,35]],[[78499,36195],[197,-54],[-79,-265],[341,-79]],[[78958,35797],[121,1371]],[[79079,37168],[-38,10],[22,314],[-379,70]],[[78684,37562],[-26,-284],[-67,18]],[[82371,88200],[966,-250]],[[83337,87950],[102,1151]],[[82469,89360],[-98,-1160]],[[73426,38485],[671,-142]],[[74097,38343],[26,333],[95,-22],[13,171]],[[74231,38825],[13,164],[-96,21],[37,501]],[[74185,39511],[-99,21]],[[74086,39532],[-12,-167],[-576,120]],[[73498,39485],[-53,-744]],[[73445,38741],[-19,-256]],[[74540,43693],[428,-46]],[[75203,43630],[38,1213]],[[75241,44843],[-434,32]],[[74807,44875],[-10,-66],[-155,18]],[[74642,44827],[-35,-989],[-54,30],[-13,-175]],[[46752,83837],[190,13]],[[46942,83850],[798,41]],[[47740,83891],[372,22]],[[48112,83913],[-47,2047]],[[46702,85887],[50,-2050]],[[77776,63955],[78,-120]],[[77854,63835],[93,-180],[49,50],[186,-3],[97,-158]],[[78279,63544],[79,175]],[[78358,63719],[-29,204],[69,54],[74,199],[127,188]],[[78599,64364],[-124,136],[-147,-89],[-162,220],[-68,21]],[[77900,64537],[-51,-26],[34,-264],[-26,-180],[-81,-112]],[[78827,40496],[77,-15],[-19,-274],[75,-15]],[[78960,40192],[479,-99]],[[79642,40212],[62,837]],[[79704,41049],[-254,70],[8,113],[-128,25],[8,111],[-193,38],[17,225],[-193,36]],[[78969,41667],[-25,-337],[-63,12],[-54,-846]],[[50033,85975],[550,-1229]],[[50583,84746],[37,293],[56,-51],[476,27]],[[51152,85015],[-37,90],[248,509]],[[51363,85614],[-920,1264]],[[76555,39960],[3,57],[163,-23],[10,219],[311,-41]],[[77055,40452],[29,581]],[[77084,41033],[-690,96]],[[76394,41129],[-35,-386],[-127,29],[-61,-762]],[[78883,34954],[155,-42],[-22,-271],[316,-87],[-27,-277],[161,-47]],[[79466,34230],[76,812]],[[79542,35042],[55,585]],[[79597,35627],[-639,170]],[[78958,35797],[-75,-843]],[[48559,62847],[142,289],[-14,373],[58,84],[-20,255],[106,143]],[[48831,63991],[-8,36],[-282,-18],[-4,169],[-57,-4],[22,171],[-444,-26]],[[48058,64319],[-29,-171],[-64,-4],[-4,-678],[-286,-19],[8,-333]],[[58670,26618],[386,-19]],[[59056,26599],[4,276],[385,-20]],[[59445,26855],[17,1055]],[[59462,27910],[-8,0]],[[59454,27910],[-575,30]],[[58879,27940],[-190,10]],[[58689,27950],[-19,-1332]],[[61466,66879],[190,-23]],[[61656,66856],[513,-43]],[[62169,66813],[10,335],[-43,2],[18,714]],[[62154,67864],[9,336]],[[62163,68200],[-655,33]],[[61508,68233],[-14,-336]],[[61494,67897],[-40,-221],[-199,-447],[-36,2],[0,-326],[247,-26]],[[77212,71942],[95,-318],[205,-212]],[[77512,71412],[435,-87]],[[77947,71325],[17,-3],[46,648]],[[78010,71970],[24,345]],[[78034,72315],[-658,136]],[[46888,78233],[-38,1446]],[[45233,79563],[41,-1441]],[[56560,28357],[785,-22]],[[57345,28335],[10,1e3]],[[57355,29335],[-779,19]],[[56576,29354],[-8,0]],[[50160,41413],[5,-35]],[[50165,41378],[737,35]],[[50902,41413],[8,1]],[[50891,42755],[-752,-34]],[[50139,42721],[21,-1308]],[[80918,56172],[105,-142],[125,-79],[237,-41],[46,-68]],[[81431,55842],[72,322],[-28,400],[-92,342]],[[81383,56906],[-78,-179],[-328,211]],[[80977,56938],[-59,-481],[0,-285]],[[58113,53235],[2,-1009]],[[58882,52473],[-2,336],[40,1],[-2,653]],[[58918,53463],[-806,-3]],[[43819,63859],[672,72]],[[44721,65635],[-171,-18]],[[43758,65533],[61,-1674]],[[29243,9796],[54,513],[-43,234],[-3,263],[103,357],[375,11],[201,171],[23,214],[125,80],[42,146],[352,67]],[[30472,11852],[-115,1212],[97,63],[38,166],[225,122],[-81,806],[200,59]],[[30836,14280],[67,100],[-74,168],[58,154],[150,110],[-13,103]],[[31024,14915],[-153,-104],[-70,135],[-51,635],[-237,-66]],[[30513,15515],[-352,-99],[-117,168],[-77,-43],[-115,52],[28,176],[-156,114],[-61,-42]],[[29663,15841],[48,-578],[48,-105],[-23,-203],[-136,-41],[16,-163],[-189,-57],[52,-505],[-394,-110],[135,-1293],[-395,-132],[122,-1154],[-81,-34],[-3,-406]],[[28863,11060],[50,-238],[-32,-236],[138,-73],[32,-92],[49,-406],[-23,-133],[166,-86]],[[59044,49660],[10,-1283],[-8,-155]],[[59046,48222],[1,-55]],[[59047,48167],[768,18]],[[59815,49093],[-1,630]],[[59814,49723],[-387,-1],[0,112],[-383,-6]],[[59044,49828],[0,-168]],[[45451,67550],[56,-1841]],[[26693,13977],[763,250]],[[27456,14227],[-6,277],[-136,289],[18,247],[68,327],[-34,286],[47,77],[-127,170],[9,253],[46,162],[-102,215],[169,108],[17,222],[116,197],[90,23]],[[27631,17080],[1,6]],[[26874,17822],[-115,-63],[-17,167],[-84,54],[-134,229],[-97,49],[-81,-63],[-42,181],[-126,100],[-105,-232],[-47,-216],[-149,-68]],[[25877,17960],[50,-143],[-21,-136],[107,-77],[15,-202],[-72,-226],[136,-253],[137,43],[46,-104],[-43,-222],[50,-62],[-84,-184],[-11,-203],[71,-171],[-81,-136],[28,-156],[107,12],[3,-362],[58,-17],[58,-211],[9,-196],[93,-185],[-16,-222],[82,-9],[106,-504],[-12,-57]],[[15655,56510],[62,26],[323,-2361],[171,-1303]],[[16211,52872],[1720,673],[1606,600],[8,-59],[154,54]],[[19699,54140],[1431,3678]],[[21713,60757],[-58,158],[-206,263],[-135,93],[-185,59],[-47,94]],[[21082,61424],[-1587,-539],[-20,165],[-2151,-777],[-749,-289],[-14,110],[-508,-193],[-16,-63],[-261,-105],[0,-57],[-328,-127],[-23,169],[-101,26],[-25,174],[-80,-29],[-60,188]],[[15159,60077],[-158,-362]],[[15001,59715],[-20,-123],[90,-153],[63,33],[164,-491],[122,-454],[101,-1024],[134,-993]],[[79632,65685],[95,-66]],[[79727,65619],[40,196],[-29,194],[122,290],[105,159],[98,229]],[[80063,66687],[-96,188]],[[79967,66875],[-55,15]],[[79912,66890],[-131,-79],[-163,-26],[-51,-214],[-67,-115],[-170,-578]],[[79330,65878],[51,-103],[132,-57],[61,-98],[58,65]],[[22294,89903],[212,429],[133,-60]],[[22639,90272],[146,63],[112,110],[97,181]],[[22994,90626],[-283,140],[56,183]],[[22767,90949],[-65,-10],[-127,-421],[-122,-123],[-27,93],[136,181],[38,204],[156,360],[128,533],[-132,-48],[-68,-147]],[[22098,90653],[-36,-268],[66,-31],[-47,-166],[213,-285]],[[65086,23890],[317,-36],[15,341]],[[65418,24195],[55,1328]],[[65473,25523],[-422,34],[-561,67]],[[64490,25624],[-746,79]],[[63744,25703],[-45,-1333]],[[12752,97824],[9,-151],[50,124],[-59,27]],[[12678,97489],[67,-76],[-9,284],[-62,-20],[4,-188]],[[12397,97795],[79,-153],[-37,-93],[62,-101],[107,47],[-29,107],[-182,193]],[[12157,97232],[72,-101],[166,95],[-15,134],[-78,-137],[-13,286],[-67,-120],[-52,93],[-13,-250]],[[11676,97411],[39,-75],[105,122],[-77,52],[-67,-99]],[[11421,97611],[92,-25],[-51,170],[-41,-145]],[[11193,98205],[7,-58],[201,186],[-53,52],[-155,-180]],[[13113,95377],[-75,176],[-97,-13],[-5,116],[-134,-19],[-5,116],[-135,-20],[-12,232],[41,6],[-24,463],[-33,111],[134,20],[-14,332]],[[12754,96897],[-83,80],[72,-316],[-108,-54],[-96,146],[-155,135],[-73,160],[-141,-94],[-175,196],[-122,-30],[86,-328],[-111,-5],[-67,296],[-97,212],[-62,-41],[27,166],[-91,-84],[-45,172],[-96,-64],[2,-270],[-45,-80],[-49,103],[52,124],[-12,221],[-127,31],[-84,-269],[-73,76],[74,152],[-166,152],[82,55],[43,164],[-116,-146],[-125,154],[-223,-68],[-121,89],[-18,84],[-138,62],[-89,-60],[-27,-222],[119,-83],[89,-232],[319,-170],[161,27],[77,247],[29,-326],[197,-30],[156,-328],[167,-282],[214,-226],[286,-107],[156,5],[-66,263],[52,123],[18,-196],[128,51],[88,147],[29,-84],[-149,-228],[110,-343],[266,-358],[125,-86],[260,-267],[25,64]],[[10074,98386],[132,-10],[-14,76],[-118,-66]],[[9884,98128],[28,-56],[93,143],[-78,113],[-43,-200]],[[9682,98209],[113,-63],[74,186],[-177,16],[-10,-139]],[[15442,93819],[42,-103],[61,69],[-2,-172],[161,-206],[65,-149],[-24,-118],[125,-104],[-52,383],[56,-94],[91,167],[61,-77],[-34,266],[-96,-86],[21,114],[-138,-53],[-22,160],[-134,106],[-181,-103]],[[15046,95861],[118,-96],[59,144],[-121,21],[-56,-69]],[[14874,94754],[65,-192],[169,-201],[102,16],[39,195],[12,-197],[-32,-217],[89,-105],[62,78],[103,-23],[-54,-154],[151,129],[-76,-123],[164,31],[-6,121],[73,-20],[100,-147],[76,287],[-61,-38],[-7,239],[131,-34],[-74,268],[-171,-105],[62,163],[-90,160],[-146,117],[126,37],[-146,104],[-35,115],[-45,-119],[22,-151],[-141,441],[-92,126],[-105,34],[128,-263],[-55,-17],[72,-272],[-209,417],[-96,-196],[-2,-257],[-109,-143],[6,-104]],[[14854,96003],[119,-221],[61,63],[-150,199],[-30,-41]],[[14435,96805],[71,-113],[-3,201],[-68,-88]],[[15078,93031],[199,0],[-1,-117],[72,0],[0,-155],[153,-2]],[[15501,92757],[-168,329],[-89,7],[-65,157],[24,152],[-87,322],[-105,104],[-104,2],[-167,132],[7,119],[-95,44],[7,143],[-126,-77],[-56,304],[-130,-26],[7,168],[-79,-51],[-148,237],[92,-55],[-13,236]],[[14206,95004],[-167,-15],[61,-227],[110,-244],[99,22],[27,-98],[106,-15],[56,-264],[153,-99],[4,-426],[134,-127],[223,-90],[67,-132],[-1,-258]],[[13113,95377],[93,23],[8,-256],[135,-318],[136,-147],[168,-260],[74,-747],[79,-59],[-57,-145],[48,-302],[83,-142]],[[13998,92672],[28,-116],[-113,163]],[[13913,92719],[10,-322],[-25,-236],[70,-110],[134,10],[43,-230],[70,-112],[134,8],[67,-113],[29,-1628]],[[14445,89986],[969,18]],[[15414,90004],[20,581],[-50,1],[1,465],[-49,1],[1,465],[-116,117],[0,233],[-67,117],[-115,-1],[-1,233],[-134,-2],[20,233],[-3,465],[21,117],[136,2]],[[14206,95004],[-90,231],[-140,18],[-143,251],[-72,-133],[-137,326],[-23,-91],[-80,128],[12,136],[-101,-74],[-95,40],[-76,182],[155,167],[-162,174],[-21,142],[-59,-166],[-5,187],[-85,-70],[-28,88],[-262,72],[-40,285]],[[17580,91326],[38,-191],[142,-287],[94,-372],[66,151],[-184,481],[47,59],[-203,159]],[[17539,90713],[44,-321],[78,-154],[-4,287],[-41,296],[-77,-108]],[[17264,89160],[466,-75],[95,-76],[-79,-1039],[201,-38],[-59,-807],[-48,-412]],[[17840,86713],[130,-92],[333,-72],[9,115],[203,-29],[504,-133],[62,148],[-51,241],[78,63],[-44,170],[88,50],[100,-149],[112,-34],[143,192],[48,458],[59,45],[31,281],[299,-98]],[[19944,87869],[231,1992]],[[20175,89861],[-87,-30],[-218,71],[-12,-115],[-530,159],[-206,733],[5,49]],[[19127,90728],[-118,16],[-130,306],[42,-206],[75,-155],[63,-18],[-114,-134],[-235,-23],[60,-74],[-91,-38],[36,-191],[-147,213],[-200,-177],[-79,43],[77,-189],[-140,182],[18,139],[-225,153],[14,-275],[61,16],[238,-222],[-52,-153],[-98,142],[43,-170],[-167,120],[-82,-68],[187,-179],[-137,77],[-85,-183],[36,-225],[-119,271],[-49,-239],[-30,256],[-69,86],[-49,-100],[-80,202],[-155,53],[54,-382],[-81,19],[-55,417],[100,20],[-67,366],[85,-174],[66,194],[-57,288],[133,221],[-78,173],[-83,21],[-49,-271],[-26,268],[-54,15]],[[17314,91159],[-22,-641],[-39,6],[-17,-426],[-34,4]],[[17202,90102],[-4,-155],[100,-14],[-34,-773]],[[51004,29284],[575,23]],[[51579,29307],[-13,1350]],[[17758,17060],[780,331]],[[18538,17391],[988,416]],[[19526,17807],[119,92],[-10,84],[125,-60],[84,151],[83,45]],[[19927,18119],[19,98],[-64,260],[-82,-36],[-59,435],[-112,-48],[-180,93],[-74,-31],[0,153],[230,235],[32,188],[-121,152],[-17,206],[-110,73],[-42,156],[19,144],[-112,110],[-77,215],[16,67],[388,155]],[[19581,20744],[-105,809]],[[19476,21553],[-559,-231],[-354,-177],[-46,324],[-1308,-550]],[[17209,20919],[195,-1293]],[[17404,19626],[290,-1915],[-30,-13],[94,-638]],[[76391,42872],[-21,-450]],[[76370,42422],[712,-100]],[[77082,42322],[42,900],[190,-18]],[[77314,43204],[12,333]],[[77326,43537],[-440,59],[2,-103],[-467,70]],[[76421,43563],[-30,-691]],[[79597,35627],[77,813]],[[79674,36440],[53,557],[-140,37]],[[79587,37034],[-508,134]],[[76859,76242],[493,-101]],[[77352,76141],[26,413],[98,225],[51,878]],[[77527,77657],[-381,45]],[[77146,77702],[-188,22]],[[81807,47213],[-31,-458],[41,25],[126,-242]],[[81943,46538],[191,-388],[152,13],[248,-435],[41,-562],[31,-192],[92,83],[4,124],[100,27],[22,-107],[70,80]],[[82894,45181],[30,161],[-40,127]],[[82884,45469],[-41,472],[34,157],[-63,322],[-95,220],[39,139]],[[82758,46779],[-147,331],[-56,257],[41,84],[-41,182]],[[82555,47633],[-250,103],[-100,106],[-168,7],[-194,-209],[-36,-427]],[[54304,18730],[167,1],[-3,-332]],[[54468,18399],[1137,3],[418,-12]],[[56023,18390],[14,334],[5,995]],[[56042,19719],[17,330],[4,669]],[[55094,20725],[-769,-4]],[[54325,20721],[2,-663],[-24,0],[1,-1328]],[[75345,61410],[540,-112]],[[75885,61298],[347,-71]],[[76232,61227],[-79,155],[147,221],[-60,178],[24,141],[86,3],[2,285],[-76,326]],[[76276,62536],[-43,186]],[[76233,62722],[-19,-55]],[[76214,62667],[0,-81],[-113,-76],[-15,-205],[-138,-317],[-208,-151],[-354,81]],[[75386,61918],[-41,-508]],[[53984,12864],[590,12],[774,-6]],[[55348,12870],[3,577],[15,0]],[[55366,13447],[1,328]],[[66264,44202],[130,31],[29,561],[193,-21]],[[66616,44773],[51,1186],[-196,13]],[[66471,45972],[-668,81],[-31,-676]],[[65772,45377],[-21,-449],[97,-10],[-8,-166],[92,-9],[-12,-302],[50,71],[69,-124],[86,-25],[88,-205],[51,44]],[[71515,38645],[433,-95]],[[71948,38550],[13,171],[65,-13]],[[72026,38708],[94,1336]],[[72120,40044],[-377,75]],[[71743,40119],[-125,26],[-94,-1333]],[[32186,47319],[1169,269],[50,-643]],[[33405,46945],[1505,323]],[[34910,47268],[-99,1405],[-232,-48]],[[34579,48625],[7,-116],[-856,-182],[43,79],[14,231],[130,28],[117,166],[-35,251],[-33,-6]],[[33966,49076],[-1623,-376],[-233,-47]],[[65098,77012],[547,-58]],[[65645,76954],[49,1338]],[[65694,78292],[-168,19]],[[65144,78351],[-46,-1339]],[[47175,11118],[10,-329],[974,85],[-9,330],[194,14]],[[48344,11218],[-17,656],[59,5],[-34,1322],[59,4],[-17,660]],[[48394,13865],[-585,-45]],[[47809,13820],[-583,-55]],[[47226,13765],[22,-659],[-67,-6],[42,-1319],[-69,-6],[10,-329]],[[61136,40496],[771,-62]],[[61907,40434],[8,337]],[[61915,40771],[25,828]],[[61940,41599],[-22,-57],[-359,57]],[[61162,41648],[-26,-1152]],[[63922,44548],[197,-16],[4,138],[191,-19],[8,338],[127,100],[14,448]],[[64463,45537],[-476,42]],[[63987,45579],[2,-147],[-136,-542],[69,-342]],[[77272,69305],[305,-472]],[[77973,69162],[33,163],[-122,272],[-45,-3],[31,292]],[[77870,69886],[-200,-64]],[[77670,69822],[-65,9],[-148,-108],[-185,-418]],[[73690,27438],[71,979]],[[73761,28417],[20,332],[-319,69],[4,59]],[[48571,47333],[933,53]],[[49504,47386],[18,1]],[[49522,47387],[-40,1682]],[[49482,49069],[-937,-54]],[[48522,49013],[49,-1680]],[[46580,9342],[551,55],[1398,116]],[[48529,9513],[-28,1058],[56,5],[-17,656]],[[48540,11232],[-196,-14]],[[72710,37561],[641,-155]],[[73356,37478],[70,1007]],[[73445,38741],[-450,108]],[[72995,38849],[-436,88]],[[72559,38937],[-21,-338]],[[72538,38599],[-49,-665],[48,-10],[-18,-325]],[[54675,45859],[422,0],[0,-336]],[[55097,45523],[383,-2]],[[55480,45521],[-8,902]],[[55472,46423],[-33,0],[2,784]],[[55441,47207],[-765,1]],[[54676,47208],[-1,-1349]],[[61907,40434],[-23,-1008]],[[61884,39426],[384,-29]],[[62268,39397],[193,-11],[9,335]],[[62470,39721],[26,1007],[-63,4]],[[62433,40732],[-518,39]],[[70457,42179],[763,-140]],[[71220,42039],[64,977]],[[71284,43016],[-146,33]],[[70515,43161],[-58,-982]],[[12262,32664],[25,99],[-40,269],[141,111],[46,144],[-82,299],[-144,54],[-22,162]],[[12186,33802],[-44,99],[-107,36],[-124,-59],[-41,152],[-85,88],[-43,153],[-92,-51],[-124,251],[-101,42],[-395,-186],[-66,141],[11,177]],[[10975,34645],[-1457,-715]],[[9518,33930],[49,-416],[54,-11],[16,-236]],[[9637,33267],[-16,-89],[49,-385],[-18,-191],[58,-136],[22,-209],[-113,-241]],[[71743,40119],[22,330]],[[71765,40449],[-504,102]],[[71261,40551],[-87,-1330]],[[48709,18510],[717,53]],[[49426,18563],[635,42]],[[50061,18605],[-26,1322]],[[50035,19927],[-1301,-79]],[[48734,19848],[-59,-6],[34,-1332]],[[56154,59323],[161,-2],[-2,-336],[191,-4]],[[56504,58981],[383,-6]],[[56887,58975],[7,1005],[-18,0],[8,1012]],[[56884,60992],[-577,10]],[[56307,61002],[-3,-671],[-248,2]],[[56056,60333],[60,-147],[-91,-203],[5,-232],[94,-175],[30,-253]],[[48448,27819],[80,257],[186,-11],[179,143],[68,-3],[7,-173],[-135,-99],[56,-170]],[[49357,28880],[3,161],[68,127],[-99,255],[-72,64],[0,266],[-81,66],[-7,119],[135,4],[51,295],[87,196],[-26,119]],[[49416,30552],[0,1]],[[49035,30529],[-143,-68],[19,-870],[-107,-79],[-63,155],[-115,27],[-109,127],[-220,-82],[-11,-60],[-168,74],[-185,-124]],[[47933,29629],[-80,60],[-93,-85]],[[47760,29604],[12,-499],[-42,-3],[31,-1233]],[[47761,27869],[3,-99],[684,49]],[[55414,15422],[8,1324]],[[55422,16746],[-788,2]],[[54634,16748],[0,-1320]],[[63744,25703],[35,997]],[[63779,26700],[-772,83],[-10,-333],[-192,17],[-10,-331]],[[62795,26136],[-31,-998]],[[62764,25138],[-22,-665]],[[45882,48790],[534,51]],[[46416,48841],[226,18]],[[46599,50540],[-726,-65]],[[45873,50475],[-39,-4]],[[45834,50471],[48,-1681]],[[54135,9742],[1612,1]],[[55747,9743],[-4,238],[33,118],[98,85],[144,-53],[69,-98],[7,784],[-377,5],[3,654]],[[55720,11476],[-389,9]],[[55331,11485],[-1174,-21]],[[54157,11464],[2,-653],[-26,0],[2,-1069]],[[59834,60537],[384,-4]],[[60218,60533],[254,-6]],[[60472,60527],[7,669],[-65,3],[4,333]],[[60418,61532],[14,1118],[-74,13]],[[60358,62663],[-228,41],[-40,175],[-71,-31],[8,-199],[-94,-1],[-50,-209],[-84,-137],[-83,-16],[-60,-152]],[[59656,62134],[-38,-37]],[[59618,62097],[-3,-550],[130,-1],[-4,-503],[96,0],[-3,-506]],[[70345,17786],[-44,-702]],[[70301,17084],[109,15],[319,-35],[160,-52],[354,-357]],[[71243,16655],[129,1932]],[[71372,18587],[-966,185]],[[70406,18772],[-61,-986]],[[59814,49723],[0,1031]],[[59814,50754],[-2,296],[40,1],[-2,476]],[[59850,51527],[-765,-4]],[[59043,51007],[1,-1179]],[[60472,60527],[321,-3],[-3,-279],[383,-16]],[[61173,60229],[3,280],[320,-6]],[[61496,60503],[9,1344]],[[61505,61847],[-413,9]],[[61092,61856],[-4,-335],[-670,11]],[[88519,48396],[130,215],[209,214]],[[88858,48825],[58,77],[130,-82],[22,232]],[[89068,49052],[30,215]],[[89098,49267],[-63,71]],[[89035,49338],[-42,-8],[-136,-258],[-104,-129],[-42,41]],[[88711,48984],[-28,-86],[-112,-13]],[[88571,48885],[-52,-144],[-85,-22]],[[88434,48719],[-54,-234],[139,-89]],[[60589,55329],[768,-20]],[[61357,55309],[287,-7]],[[61644,55302],[11,1013],[-29,1]],[[61626,56316],[-1156,28]],[[60470,56344],[-257,3]],[[27113,5073],[959,328]],[[28072,5401],[43,355],[-69,48],[121,321],[75,-88],[170,65],[14,273],[64,245],[-113,356],[188,197],[106,15],[95,174],[-55,329],[84,168],[80,13],[22,159],[-93,139],[41,129]],[[28845,8299],[141,287],[-22,289],[62,1],[67,164],[110,-12],[65,93]],[[29268,9121],[26,228],[93,198],[21,216],[-60,93],[-105,-60]],[[28863,11060],[-479,-168]],[[28384,10892],[-250,-80]],[[28134,10812],[68,-222],[27,-217],[-55,-12],[-27,-337],[57,-282],[-90,-290],[-134,-150],[-32,-295],[-214,-69],[-85,82],[34,245],[-672,-221],[-52,647],[-189,-63]],[[26770,9628],[37,-319],[-571,-185],[57,-485],[-25,-64]],[[26268,8575],[78,-779],[253,87],[149,-1290],[-57,-19],[38,-316],[365,124],[-69,-100],[39,-163],[95,-37],[-52,-237],[-84,-68],[73,-100],[2,-371],[65,-111],[-50,-122]],[[43483,69066],[961,80]],[[44444,69146],[-58,1666]],[[44386,70812],[-249,-28]],[[44137,70784],[-716,-68]],[[43421,70716],[62,-1650]],[[62554,52403],[386,-25],[5,336],[276,-13]],[[63221,52701],[9,421]],[[63230,53122],[-276,6],[7,338],[181,-3],[8,334]],[[63150,53797],[-764,34]],[[62386,53831],[-190,10],[-17,-674],[-96,7]],[[62083,53174],[-14,-742],[485,-29]],[[46888,78233],[976,70]],[[47864,78303],[-13,562],[227,15]],[[48078,78880],[-17,880]],[[48061,79760],[-1211,-81]],[[46759,74403],[-809,-76]],[[62409,55274],[-23,-1443]],[[63150,53797],[64,-3],[11,394],[36,219],[64,-4],[1,213],[66,-20],[35,153],[64,-31],[38,281]],[[63529,54999],[-351,68],[13,780]],[[63191,55847],[-770,45]],[[62421,55892],[-12,-618]],[[44763,75891],[60,-1672]],[[44823,74219],[151,14]],[[45656,74297],[-52,1497]],[[44750,76253],[13,-362]],[[40728,50321],[363,142],[17,41],[375,52],[11,-223],[191,22],[29,-354]],[[41714,50001],[177,22]],[[41891,50023],[-78,1703],[-39,689]],[[41774,52415],[-1142,-161],[12,-350]],[[40644,51904],[84,-1583]],[[44444,69146],[959,82]],[[45403,69228],[-51,1641]],[[45352,70869],[-251,2]],[[45101,70871],[-715,-59]],[[38742,46199],[506,83]],[[39248,46282],[-10,386],[-38,618],[-65,-13],[-24,268],[228,47],[-37,564]],[[39302,48152],[-513,-76],[15,-188],[-157,-28]],[[38647,47860],[93,-1661]],[[38740,46199],[2,0]],[[24827,7293],[25,189],[81,109],[45,-119],[219,-71],[111,-116],[68,240],[-43,95],[49,199],[-13,216],[102,334],[-44,197],[43,151],[201,88],[101,-23],[46,123],[143,-53],[104,-348],[203,71]],[[26770,9628],[11,172],[-61,539],[348,115],[12,177],[-57,44],[-55,206],[132,-6],[-127,369],[82,159],[128,43],[-74,649],[6,171]],[[27115,12266],[-159,-5],[-86,-153],[23,-64],[-149,-172],[-144,-230],[-176,-136],[-41,62],[-126,-98]],[[26257,11470],[-55,-131],[-182,-120],[21,-314],[-411,-498],[-42,45],[-137,-100],[-71,49],[-109,-154],[-20,70],[-140,-66]],[[25111,10251],[-84,-53],[3,-163],[-60,-128],[104,-119],[-43,-245],[38,-149],[-124,-260],[-2,-244],[-69,-134],[-132,-553],[-25,-25]],[[24717,8178],[110,-885]],[[47936,72824],[33,2]],[[48901,72882],[-40,1671]],[[48716,74546],[-820,-58]],[[47343,69385],[-38,1682]],[[47305,71067],[-289,-21]],[[46318,70980],[50,-1671]],[[50951,61950],[142,5],[111,126],[62,-26],[331,125],[119,-43]],[[51716,62137],[-13,1854]],[[51703,63991],[-7,669]],[[51696,64660],[-767,-25]],[[50931,63965],[20,-1344],[0,-671]],[[56018,69721],[4,-4]],[[56022,69717],[94,39],[242,-87]],[[56358,69669],[6,1365]],[[56364,71034],[-48,82]],[[56316,71116],[-38,199],[-253,1]],[[56025,71316],[-7,-1595]],[[54593,71801],[266,5]],[[54859,71806],[132,231],[127,6],[160,114],[95,131],[46,-35]],[[55419,72253],[76,128]],[[55495,72381],[2,796],[175,270],[99,207]],[[55771,73654],[-1177,-4]],[[54594,73650],[-1,-1849]],[[48050,41246],[474,33],[92,64]],[[48589,42629],[-763,-53]],[[47826,42576],[8,-337],[192,15],[24,-1008]],[[51671,41441],[767,21]],[[52438,41462],[-12,1343]],[[52426,42805],[-763,-22]],[[51663,42783],[-6,-1]],[[54183,71249],[6,-1425]],[[54189,69824],[810,-220]],[[54999,69604],[-6,732]],[[54993,70336],[0,922]],[[54993,71258],[-154,-1],[-78,398],[98,151]],[[54593,71801],[-411,-14]],[[54182,71787],[1,-538]],[[54276,78961],[134,-79],[233,-282],[141,-92],[402,-9]],[[55186,78499],[206,56],[42,161],[-88,193],[81,231],[40,-15]],[[54999,79382],[-585,157]],[[54414,79539],[-85,-339],[29,-78],[-82,-161]],[[51874,66177],[9,-839]],[[51883,65338],[384,11]],[[52267,65349],[-5,503],[555,14],[36,166],[175,3]],[[53028,66035],[-4,617]],[[53024,66652],[-64,-1],[-5,391]],[[52955,67042],[-1086,-25]],[[51869,67017],[5,-840]],[[85137,44113],[135,-112],[82,-373]],[[85354,43628],[66,113],[140,91],[49,254],[147,74]],[[85756,44160],[-219,459],[-116,338],[-99,-13]],[[85322,44944],[-221,-301]],[[85101,44643],[28,-105],[-48,-185],[56,-240]],[[70926,63391],[382,350],[219,76]],[[71527,63817],[151,-173],[76,130],[114,-136],[96,124]],[[71964,63762],[-18,680],[14,255]],[[71960,64697],[-965,124]],[[70995,64821],[-69,-1430]],[[84935,45503],[34,-222]],[[84969,45281],[41,87],[43,312],[175,296],[105,-15]],[[85333,45961],[-99,380]],[[85234,46341],[-542,-196]],[[84692,46145],[164,-276],[79,-366]],[[12779,86964],[21,-346],[66,11],[13,-348],[73,-104],[133,22],[74,-222],[67,10],[18,-347],[-71,-11],[43,-925],[62,10],[12,-231],[67,10],[19,-462],[67,9],[14,-347],[-67,-9]],[[14813,80509],[565,5],[510,-19],[495,-40],[435,-53],[742,-129],[-47,-659],[385,-86],[694,-190],[350,-111]],[[18942,79227],[402,3471]],[[19344,82698],[-87,212],[-10,137],[-118,259],[-82,-7],[-192,262],[-2,227],[-78,75],[-115,244],[42,178],[-57,217],[-135,13]],[[18510,84515],[-29,-153],[35,-373],[-31,-57],[-150,101],[-180,-32],[-201,174],[-25,-197],[-108,-33],[-51,-112],[42,-109],[-68,-59],[-113,48],[-1,109],[-233,131],[-83,107],[-362,54],[44,832],[30,-47],[188,340]],[[17214,85239],[-906,89],[-175,497],[-177,-86],[-85,102],[1,232],[-60,3],[4,232],[-223,8],[26,406],[134,53],[3,163],[-195,618]],[[15561,87556],[4,583]],[[15565,88139],[-25,117],[-118,2],[1,117],[-134,1],[0,116],[-769,-16],[-437,-27],[3,-117],[-534,-52],[-5,116],[-267,-34],[-6,116],[-464,-70]],[[80899,40679],[335,-266],[222,-72],[85,52],[108,-113],[32,112],[82,-43]],[[81763,40349],[-9,99],[89,-5],[64,93],[13,218],[65,273],[-39,59],[54,221]],[[82e3,41307],[-849,243]],[[81151,41550],[-165,45]],[[80986,41595],[-87,-916]],[[62154,67864],[575,-45],[197,19]],[[62926,67838],[198,-5],[17,834]],[[63141,68667],[12,672]],[[63153,69339],[-987,41]],[[62166,69380],[-46,-502],[59,-6],[-16,-672]],[[65551,67832],[-12,-337],[291,-33],[94,-64],[-11,-285]],[[65913,67113],[289,-29],[5,115],[480,-56]],[[66710,67702],[8,170]],[[66718,67872],[-516,63]],[[66202,67935],[-628,67]],[[65574,68002],[-23,-170]],[[81915,51455],[-72,193]],[[81843,51648],[-36,-140],[108,-53]],[[81934,51457],[0,0]],[[59179,42602],[863,-56],[3,167]],[[60045,42713],[22,1177]],[[60067,43890],[-857,61]],[[59210,43951],[-24,-899]],[[59186,43052],[-7,-450]],[[79352,50663],[112,-172]],[[79464,50491],[81,145],[195,-6],[136,-125],[48,85],[135,33],[114,-60],[62,119],[53,-75],[165,112]],[[80453,50719],[-59,355]],[[80394,51074],[-72,271],[-55,24],[-173,295],[-203,74],[-119,-115]],[[79772,51623],[-103,-152],[-113,16],[-176,-318],[-16,-213],[-120,-127],[108,-166]],[[87807,58109],[59,-61],[249,-26],[269,149],[50,-137],[120,12],[109,176],[69,214],[65,80]],[[88797,58516],[85,82],[88,301],[-5,127]],[[88965,59026],[-214,282],[-124,246],[-308,478]],[[88319,60032],[-120,-100],[-292,-862]],[[87907,59070],[-26,-242],[-10,-542],[-64,-177]],[[57116,45130],[675,-14]],[[57791,45116],[5,844]],[[57796,45960],[-1,279]],[[57795,46239],[-666,14]],[[57129,46253],[-4,-286]],[[57125,45967],[-9,-837]],[[73958,79469],[48,-91],[155,-27],[51,-126],[700,-115],[-29,-499],[98,-19]],[[74981,78592],[97,-16]],[[75078,78576],[81,1395]],[[75159,79971],[70,1051]],[[75229,81022],[-78,-83],[-121,-21],[-111,-112],[-131,-208],[-193,-120],[-165,-198],[-211,-190],[-239,-162]],[[73980,79928],[-22,-459]],[[15307,4945],[588,294],[1275,583]],[[17170,5822],[40,279],[-98,66],[-39,328]],[[17073,6495],[-168,31],[-175,248],[-220,154],[-78,482],[122,88],[-68,191],[63,79],[-8,247],[-181,35],[24,132]],[[16384,8182],[0,1]],[[14997,6599],[154,-35],[27,-512],[-30,-388],[132,-67],[-94,-242],[125,-216],[-4,-194]],[[14862,6382],[74,-321],[94,-198],[34,192],[-43,213],[83,114],[-146,108],[-101,-10],[5,-98]],[[17639,4013],[-88,-127],[67,-150],[-16,-116],[63,-128],[-20,-120],[59,-111],[126,41],[18,-109],[145,-4],[110,202],[105,-41]],[[18208,3350],[77,30],[-64,288],[5,216],[73,107],[-35,217],[101,110],[171,450],[-43,148],[183,424],[81,87],[80,440],[260,115]],[[19097,5982],[-98,189],[-28,140],[-69,35],[-86,214],[-300,-47],[-67,112],[12,166],[-98,289],[-120,179],[-83,282],[11,256],[216,201],[49,129],[-55,277]],[[18381,8404],[-418,-181],[-144,-282],[-110,-27],[0,-100],[-124,-87],[-156,-380],[-66,11],[-107,-133],[-58,-363],[-96,-172],[-29,-195]],[[17170,5822],[90,-127],[-93,-165],[-2,-247],[134,-261],[-26,-161],[224,-56],[112,-103],[4,-111],[82,-130],[-76,-353],[20,-95]],[[82746,80480],[382,-113],[94,-170],[104,-57]],[[83326,80140],[298,862]],[[83624,81002],[-99,89],[62,544],[-513,156],[-54,-521],[-25,11]],[[82995,81281],[-82,29],[-120,-370],[-47,-460]],[[18381,8404],[7,146],[99,66]],[[18487,8616],[-45,349],[-91,175],[43,521],[-46,314],[33,178],[-112,265]],[[18269,10418],[-799,-359],[52,-319],[-186,-88],[48,-318],[-581,-263],[-47,-336],[-225,-489],[-126,12],[-21,-76]],[[83242,83586],[-1,184],[-62,108],[30,275],[249,-62],[11,109],[661,-188]],[[84130,84012],[62,26],[67,219],[116,110],[31,115],[-46,162],[105,302]],[[84465,84946],[-1548,415]],[[82917,85361],[-143,-1582],[17,-78],[451,-115]],[[77947,71325],[138,-472],[48,-8]],[[78453,71273],[-44,98],[175,235],[-64,297]],[[78520,71903],[-156,-69],[-31,68],[-323,68]],[[64063,77218],[210,-125],[664,-64]],[[64937,77029],[161,-17]],[[65107,78355],[-493,49]],[[64614,78404],[-447,42]],[[64167,78446],[-32,-1084],[-72,-144]],[[48938,22495],[1536,98]],[[50474,22593],[-18,1328]],[[50456,23921],[-1337,-82]],[[49119,23839],[-213,-16]],[[48906,23823],[32,-1328]],[[67598,37648],[62,1002]],[[67660,38650],[3,337]],[[67663,38987],[-556,99]],[[49470,52434],[945,50]],[[50415,52484],[8,355]],[[50423,52839],[-15,1010]],[[49446,53804],[17,-1013]],[[58789,31557],[766,-38]],[[59555,31519],[3,164]],[[59558,31683],[20,1173]],[[53231,38570],[144,53],[121,-35],[91,94],[204,-26],[163,154]],[[53954,38810],[81,113],[23,191],[94,191],[-25,120],[64,170]],[[54191,39595],[26,288],[-48,126],[34,145]],[[54203,40154],[-51,115],[-191,-5]],[[53961,40264],[0,-112],[-743,-13]],[[53218,40139],[13,-1569]],[[60665,63869],[161,-3],[1,336],[186,-1],[7,279],[199,54],[1,174],[173,-6],[6,167],[191,-7],[5,336]],[[61595,65198],[-288,10],[1,169],[-338,7],[-61,168],[-80,1]],[[60829,65553],[-35,-225],[-98,3],[-1,-114],[-100,5]],[[60595,65222],[-34,-333],[-126,5],[0,-170],[-191,2],[10,-521],[-193,12]],[[60061,64217],[-4,-332],[444,-14],[164,95],[0,-97]],[[64947,27259],[-202,16]],[[64745,27275],[-42,-1007],[-187,19],[-26,-663]],[[56334,53146],[824,-11]],[[57158,53135],[1,75]],[[57169,54327],[0,99]],[[57169,54426],[-805,11]],[[56364,54437],[-24,-169]],[[50866,72804],[842,41]],[[51708,72845],[-6,910]],[[51702,73755],[-314,-1],[-310,309]],[[51078,74063],[-218,-1077]],[[50860,72986],[6,-182]],[[54124,49887],[4,-838]],[[54128,49049],[702,1]],[[54830,49050],[-7,1177]],[[54823,50227],[1,673],[-16,343]],[[41750,29853],[1696,234]],[[43446,30087],[-78,1825]],[[43368,31912],[-818,-108]],[[42550,31804],[-888,-124]],[[41662,31680],[88,-1827]],[[36102,13039],[201,59],[176,-31],[197,160],[30,226],[-33,221]],[[36532,15941],[64,204],[8,177]],[[36604,16322],[-1227,-246]],[[35377,16076],[27,-330],[30,7],[80,-985],[-194,-45],[52,-315],[26,-327],[194,45],[11,-137],[384,81],[34,-20],[81,-1011]],[[70450,42042],[-47,-837]],[[70403,41205],[535,-90]],[[70938,41115],[112,-19],[10,167],[115,36]],[[71175,41299],[37,606]],[[71212,41905],[8,134]],[[70457,42179],[-7,-137]],[[51745,16358],[389,14]],[[51605,18674],[-624,-27]],[[50981,18647],[19,-1327],[-43,-1],[16,-992]],[[91449,18019],[279,111],[-51,374],[193,113]],[[91870,18617],[-49,329]],[[91821,18946],[-44,348],[-192,-140],[-44,340],[-262,-100]],[[91279,19394],[-56,-6],[29,-197],[-64,-155],[-191,-238]],[[90997,18798],[71,-338],[96,34],[27,-384],[195,-143],[63,52]],[[76756,67673],[72,-60],[40,-211],[120,-78],[-25,-120],[80,-160]],[[77043,67044],[133,265]],[[77176,67309],[127,462],[3,239]],[[77306,68010],[-74,-62],[-337,65]],[[76895,68013],[-152,32]],[[76743,68045],[13,-372]],[[64745,27275],[-284,25]],[[64461,27300],[-653,72]],[[63808,27372],[-29,-672]],[[58050,33936],[-11,-1011]],[[48078,78880],[750,43]],[[48828,78923],[-2,73],[244,15]],[[49070,79011],[-29,1620]],[[48389,80589],[-347,-20],[19,-809]],[[56635,72942],[311,-211],[136,-299],[83,57]],[[57165,72489],[7,886],[113,87],[118,10]],[[57403,73472],[-39,135],[-71,-38],[-651,13]],[[56642,73582],[-7,-640]],[[67512,68333],[-4,-110],[128,-17]],[[67636,68206],[640,-94],[10,226]],[[68286,68338],[42,841]],[[68328,69179],[-266,37]],[[68062,69216],[-509,66]],[[67553,69282],[-41,-949]],[[14133,37510],[-76,479]],[[14057,37989],[-1062,-470],[-152,39],[-369,303],[-151,169],[-160,312],[-105,-41],[-40,-122],[-96,55],[-142,-153]],[[11780,38081],[116,-729],[48,-147],[80,-2],[44,-115],[168,-177],[181,38]],[[43368,31912],[338,44]],[[43706,31956],[-36,824],[32,3],[-55,1325]],[[43647,34108],[-1098,-131]],[[42549,33977],[-58,-7],[61,-1333],[-37,-5],[35,-828]],[[10181,22270],[-29,164],[211,107],[42,142],[114,100],[172,-74],[148,105],[51,144]],[[10890,22958],[-364,2119],[-83,458]],[[10443,25535],[-455,-218]],[[9988,25317],[-484,-227]],[[9504,25090],[-12,-185],[71,-169],[-20,-202],[86,-73],[70,-190],[-71,-554],[-210,-136],[152,-492],[156,84],[155,-301],[52,-182],[248,-420]],[[53202,41481],[-2,672]],[[53200,42153],[-10,670]],[[53190,42823],[-764,-18]],[[47577,59149],[-16,673]],[[47561,59822],[-25,1009]],[[47536,60831],[-971,-75]],[[46565,60756],[47,-1685]],[[76518,68147],[232,-9],[-7,-93]],[[76895,68013],[67,973],[-142,92]],[[76820,69078],[-14,-219],[-274,52]],[[76532,68911],[26,-193],[-40,-571]],[[66129,75321],[412,-96]],[[66541,75225],[23,632],[228,168],[106,165],[12,305]],[[66910,76495],[-127,14]],[[66783,76509],[-323,35],[8,169],[-257,26]],[[66211,76739],[-19,-505],[-32,4],[-31,-917]],[[77996,40369],[38,272]],[[78034,40641],[51,832],[-47,155]],[[78038,41628],[-390,30]],[[77648,41658],[-16,25],[-524,70]],[[77108,41753],[-24,-720]],[[43510,63828],[309,31]],[[43590,65514],[-796,-90]],[[42794,65424],[68,-1668]],[[71400,22571],[258,-42],[20,334],[574,-109]],[[72336,23734],[-699,132],[-53,192]],[[71584,24058],[-89,-165],[-95,17]],[[71400,23910],[56,-284],[-2,-716],[-54,-339]],[[48588,43977],[756,46]],[[49344,44023],[190,10]],[[49534,44033],[-30,1674]],[[49504,45707],[-914,-52]],[[48590,45655],[-44,-3]],[[45068,52440],[765,73]],[[45833,52513],[-42,1343]],[[45791,53856],[-766,-75]],[[45025,53781],[43,-1341]],[[31024,14915],[56,82],[-12,240],[44,177],[120,62],[-47,347],[110,192],[-6,219],[127,4],[145,192],[-30,209],[-90,129],[-23,133],[61,118],[6,224]],[[31485,17243],[-375,-84],[-96,230],[-69,31],[-62,167],[-9,226],[-62,-6],[-35,159],[-137,135],[-65,-2],[-137,241]],[[30438,18340],[79,-812],[-190,-57],[186,-1956]],[[49376,39993],[767,43]],[[50187,40038],[-22,1340]],[[50160,41413],[-308,127],[-458,-55]],[[48995,41421],[-13,-112],[29,-1336]],[[17476,42771],[652,2125],[-514,3879]],[[17614,48775],[-895,-2308]],[[16719,46467],[-790,-2031]],[[15929,44436],[128,63],[255,-318],[1164,-1410]],[[84479,54190],[184,-50]],[[84663,54140],[358,-100]],[[85021,54040],[36,1464]],[[85057,55504],[-116,45],[-302,29]],[[84639,55578],[-40,-134],[-120,-1254]],[[28120,24889],[35,-326],[849,256]],[[29004,24819],[-34,327],[284,84],[-17,165]],[[29237,25395],[-75,653],[90,-25],[207,414],[88,106],[145,41],[-10,108]],[[29682,26692],[-1419,-414]],[[28263,26278],[-283,-71]],[[27980,26207],[140,-1318]],[[71814,35814],[605,-118]],[[72576,35666],[64,892]],[[71880,36715],[-66,-901]],[[62730,34988],[381,-32]],[[63111,34956],[31,1006]],[[63142,35962],[10,336]],[[62382,36361],[-34,-1342]],[[56232,35655],[382,-4]],[[56614,35651],[377,-8]],[[56991,35643],[12,1334]],[[57003,36977],[-192,6]],[[56811,36983],[-575,8]],[[56236,36991],[-4,-1336]],[[49435,15915],[326,20]],[[49761,15935],[1168,63]],[[50981,18647],[-920,-42]],[[49426,18563],[33,-1329],[-53,-2],[29,-1317]],[[56991,35643],[380,-9]],[[57770,36953],[-192,8]],[[57578,36961],[-575,16]],[[70041,78968],[-47,-257],[64,-232],[78,-72],[-76,-123],[43,-248],[51,-48],[-84,-113],[31,-313],[-75,-149],[58,-230],[-65,-50]],[[70019,77133],[44,-123]],[[70063,77010],[63,12],[127,-232],[18,-128],[116,-102]],[[70387,76560],[89,-35],[86,145],[118,50]],[[70680,76720],[50,944],[32,-5]],[[70762,77659],[24,123],[-67,390],[174,280],[45,157],[254,224],[34,165],[-79,476],[74,193],[89,89],[-101,97],[-35,248],[-81,121],[59,51],[-94,99]],[[71058,80372],[-260,157],[-344,138],[-239,26],[45,-129],[86,72],[239,-124],[16,-113],[-189,-303],[-123,-105],[-67,-290],[44,-199],[-29,-297],[-54,-152],[-142,-85]],[[73185,32980],[193,-41]],[[73378,32939],[747,-167]],[[74125,32772],[15,-4]],[[74238,34117],[-379,73]],[[73859,34190],[-565,129]],[[73294,34319],[-109,-1339]],[[76939,54811],[858,-185]],[[78070,54561],[-196,244],[-112,-54],[-179,236],[-130,312],[28,61],[-144,148]],[[77337,55508],[-134,-67],[-59,40]],[[77144,55481],[17,-183],[-74,-278],[-148,-209]],[[48590,45655],[-42,1676]],[[48548,47331],[-932,-64]],[[47616,47267],[-28,-1]],[[47588,47266],[48,-1678]],[[56344,51744],[2,841],[-13,337]],[[55335,65041],[288,-3],[-1,-335]],[[55622,64703],[829,-9]],[[56451,64694],[222,-5],[5,671]],[[56678,65360],[-200,2],[7,1015],[-192,3],[-8,335]],[[56285,66715],[-1143,12]],[[55142,66727],[-2,-1348],[197,-2],[-2,-336]],[[42776,75682],[58,7]],[[42834,75689],[967,105]],[[43801,75794],[-78,2189]],[[43723,77983],[-999,-134]],[[42724,77849],[5,-429],[47,-1738]],[[48040,23757],[866,66]],[[49119,23839],[-28,1331]],[[48932,25159],[-1155,-85]],[[47777,25074],[-21,-355],[57,-138],[174,42],[-64,-310],[79,-222],[38,-334]],[[49370,42679],[-26,1344]],[[48583,43977],[26,-1347]],[[56488,30691],[97,-3]],[[56585,30688],[664,-16]],[[57249,30672],[9,943]],[[57258,31615],[-762,18]],[[56496,31633],[-8,-942]],[[50284,9624],[1558,67]],[[51842,9691],[-12,1069],[33,1],[-8,660]],[[51855,11421],[-584,-25]],[[51271,11396],[-975,-48]],[[13534,41278],[184,389],[254,-130],[89,66],[-27,166],[81,188]],[[14115,41957],[-39,158],[46,202],[-64,132],[69,169],[108,138],[75,201],[44,-43],[108,157],[43,165],[-45,362],[148,314],[-51,356],[-141,158]],[[14416,44426],[-46,-174]],[[14370,44252],[-82,-281],[-74,-137],[-107,-35],[-122,-181],[-256,281],[-223,62],[-87,-99],[-125,-18],[-119,-245],[-87,-105],[-102,139],[-88,-90],[-25,93],[-288,41],[28,225],[-44,71],[-83,-172],[-27,188]],[[12459,43989],[-335,-942]],[[12124,43047],[182,-180],[126,-196],[-13,-130],[128,-29],[243,-446],[447,-677],[297,-111]],[[48548,47331],[23,2]],[[47563,48943],[53,-1676]],[[48836,92950],[312,22],[5,-327]],[[49871,94847],[-1068,-60]],[[48803,94787],[33,-1837]],[[66319,23742],[247,-31],[38,998]],[[66604,24709],[-390,49],[-13,-332],[-387,52],[-15,-329]],[[65799,24149],[-16,-340],[536,-67]],[[57355,29335],[196,-6]],[[57551,29329],[13,1335]],[[57564,30664],[-315,8]],[[56585,30688],[-9,-1334]],[[71962,72290],[38,118],[40,-131],[-22,-204],[111,-51],[75,179],[47,-178],[77,76],[227,77]],[[72555,72176],[45,42],[-9,183],[151,129],[49,739]],[[72791,73269],[22,332],[-81,11]],[[71963,73751],[-16,-330],[-95,17]],[[71852,73438],[-40,-677],[183,-29],[-111,-163],[78,-279]],[[73795,48719],[147,-182],[67,57]],[[74009,48594],[137,42],[88,-71]],[[74302,49161],[-226,256],[5,94]],[[74081,49511],[-58,103],[-219,-94]],[[73804,49520],[5,-568],[57,-234],[-71,1]],[[61037,44158],[569,-28]],[[61606,44130],[191,-10]],[[61797,44120],[17,1118]],[[61814,45238],[-576,24],[-8,227],[-182,8]],[[61048,45497],[-11,-1339]],[[53626,58998],[578,-4]],[[54204,58994],[0,333],[480,3],[-7,844]],[[54677,60174],[-286,-2],[-1,841]],[[54390,61013],[-770,-6]],[[53620,61007],[3,-1166]],[[53623,59841],[3,-843]],[[52518,84091],[521,-8]],[[53039,84083],[79,215],[77,-1],[449,930],[-192,271]],[[53452,85498],[-551,759]],[[52901,86257],[-73,-157]],[[52828,86100],[-507,-1082]],[[52321,85018],[77,-469],[-1,-279],[121,-179]],[[66124,28125],[16,337]],[[66140,28462],[43,1002]],[[66183,29464],[-194,26]],[[65989,29490],[-193,29],[-1,-45],[-191,25]],[[65604,29499],[-18,-447],[124,-37],[-8,-170],[-49,-2],[-11,-247],[49,-5],[-18,-407]],[[48050,41246],[-406,-31]],[[47644,41215],[33,-1334]],[[71814,35814],[-216,41]],[[71598,35855],[42,-162],[-70,-1035]],[[66643,50347],[-37,-1006]],[[66606,49341],[769,-102]],[[67375,49239],[32,841]],[[67426,50586],[-738,96]],[[66688,50682],[-35,4],[-10,-339]],[[59538,30582],[760,-46]],[[60319,31639],[-761,44]],[[59555,31519],[-17,-937]],[[17573,85295],[221,-75],[32,-120],[160,-152],[66,35],[183,-257],[124,-61],[151,-150]],[[19344,82698],[600,5171]],[[17840,86713],[-26,-419],[-176,38]],[[17638,86332],[-65,-1037]],[[65635,39116],[-14,-328],[183,-20],[26,-264],[108,-95],[175,25]],[[55764,39707],[382,-2]],[[56146,39705],[381,-4]],[[56532,40695],[-765,8]],[[55767,40703],[-3,-996]],[[60344,32814],[769,-51]],[[61113,32763],[24,1018]],[[60365,33831],[-21,-1017]],[[66602,49229],[-29,-899]],[[67321,47886],[32,847]],[[67353,48733],[22,506]],[[66606,49341],[-4,-112]],[[82057,57778],[84,-22]],[[82141,57756],[787,-210]],[[82928,57546],[-256,1315]],[[82672,58861],[-90,-66]],[[82582,58795],[-229,-168],[-76,-286],[-150,-173],[21,-55],[-91,-335]],[[42899,74020],[143,16]],[[43860,74124],[-59,1670]],[[42834,75689],[65,-1669]],[[48377,81405],[-871,-71]],[[47506,81334],[-698,-47]],[[63904,30033],[192,-24],[50,1498]],[[64146,31507],[-113,-117],[-147,-31],[-127,47]],[[63759,31406],[-188,-22],[-191,171]],[[63380,31555],[-35,-963]],[[63345,30592],[-21,-497],[580,-62]],[[45584,60648],[0,24]],[[71484,53086],[543,-151]],[[72027,52935],[218,428],[-2,187]],[[72243,53550],[-4,443],[-71,-18]],[[72168,53975],[-142,-35],[-53,-97],[-105,109],[-227,-307]],[[71641,53645],[-157,-559]],[[72975,44258],[444,-90]],[[73419,44168],[376,-59]],[[73795,44109],[50,832]],[[73845,44941],[-419,76]],[[73426,45017],[-259,46],[-124,180]],[[73043,45243],[-49,-709]],[[72994,44534],[-19,-276]],[[22925,21086],[-1,-336],[94,-451],[-42,-292],[59,-304],[103,-273],[78,-108],[-20,-102],[96,-204],[-60,-201]],[[23232,18815],[59,-178],[59,44],[192,-189],[-10,90],[1977,690]],[[25509,19272],[-80,152],[-49,553],[-34,117],[-17,311],[-174,264]],[[24195,22168],[-86,-63],[-20,160],[-97,136],[-168,48],[-930,-345],[-75,320],[-146,-68]],[[22673,22356],[83,-648],[94,35],[75,-657]],[[85414,46980],[114,-526]],[[85528,46454],[175,-141],[268,46]],[[85971,46359],[63,-20],[241,86],[199,202]],[[86474,46627],[-69,1118]],[[86405,47745],[-170,-67],[-139,-294],[-79,-15],[-59,-118],[-83,-21]],[[85875,47230],[-461,-250]],[[49937,71244],[277,21],[4,-214]],[[50907,71096],[-41,1708]],[[50860,72986],[-762,-37]],[[50098,72949],[-189,-17]],[[49909,72932],[28,-1688]],[[42631,65405],[163,19]],[[42554,67279],[77,-1874]],[[73063,77297],[383,-66]],[[73446,77231],[289,-49]],[[73735,77182],[63,1101],[369,-61]],[[74167,78222],[-34,160],[-85,117],[8,153],[78,142],[-4,141],[58,104],[-68,190],[-118,37],[-44,203]],[[73980,79928],[-188,-99],[-414,-156],[-192,-26]],[[90078,27961],[722,-512]],[[90800,27449],[29,341],[63,317],[-73,259],[8,151],[-55,276]],[[90772,28793],[-173,-127],[-60,51],[-14,297],[-383,83],[-259,-115]],[[89883,28982],[-153,-66],[100,-623],[-27,-12]],[[73674,42257],[-69,-1171]],[[73594,40923],[619,-134]],[[74259,41391],[87,1059]],[[74346,42450],[-100,26]],[[74246,42476],[-551,119]],[[55720,11476],[195,-2],[5,659],[1173,-31]],[[57093,12102],[34,1976]],[[57127,14078],[18,1522]],[[57145,15600],[1,125],[-386,16]],[[56760,15741],[-780,6]],[[55980,15747],[-22,-990],[-3,-755],[-80,-40],[-47,-228],[71,-290],[-533,3]],[[55348,12870],[-1,-729],[-13,0],[-3,-656]],[[71379,26594],[364,-71]],[[71743,26523],[393,-73]],[[54805,53432],[-1,838]],[[54804,54270],[-5,338]],[[54799,54608],[-986,-18]],[[53813,54590],[0,-670]],[[53813,53920],[3,-505]],[[44240,50319],[827,84]],[[45067,50403],[44,4]],[[45111,50407],[-58,1678],[27,3],[-12,352]],[[45068,52440],[-899,-103]],[[44169,52337],[71,-2018]],[[59084,11037],[206,-21],[33,87],[306,238],[138,-22],[1,165],[-92,22],[-18,122],[86,95],[222,-56],[80,172],[-16,187],[162,488],[147,-115],[-61,-255],[63,-150],[84,30],[226,-67],[86,137],[-5,212],[76,118],[97,-25],[46,112],[100,9]],[[61051,12520],[80,2484],[50,2307]],[[61181,17311],[-133,139],[-312,472],[128,301]],[[60864,18223],[-118,-155],[-150,131],[-15,240],[-139,-23]],[[59242,17105],[-21,-314],[-24,-1081],[-10,-1239],[-32,1],[-10,-651]],[[59145,13821],[-35,-665],[-26,-2119]],[[61467,38116],[194,-18]],[[61661,38098],[513,-38],[69,331]],[[62243,38391],[25,1006]],[[61884,39426],[-383,26]],[[61501,39452],[-34,-1336]],[[48935,72884],[974,48]],[[50098,72949],[-11,822],[-146,138]],[[49941,73909],[-714,670]],[[49101,82014],[-20,1365]],[[49081,83379],[-493,-462],[-196,-46],[-627,-52]],[[47765,82819],[-171,-15],[17,-632],[-131,-10]],[[47480,82162],[26,-828]],[[83527,29876],[435,-143]],[[83962,29733],[319,-90],[19,163],[190,-50]],[[84490,29756],[59,724],[100,1075]],[[84649,31555],[-740,240]],[[83909,31795],[-164,54]],[[83745,31849],[-218,-1973]],[[44489,67471],[-45,1675]],[[82733,50539],[-3,178]],[[82730,50717],[-69,43],[-91,-91],[137,-185],[26,55]],[[87384,49056],[87,-31]],[[87471,49025],[62,55],[-109,160],[-40,-184]],[[64e3,38605],[-14,-500],[157,-236],[228,-137],[6,-160]],[[64377,37572],[535,-55]],[[64912,37517],[18,252],[40,1091]],[[64970,38860],[-5,331],[-193,19]],[[64016,39282],[-16,-677]],[[66461,71925],[-37,-963]],[[66424,70962],[-7,-172],[764,-96]],[[67240,72057],[-9,1]],[[67231,72058],[-762,85],[-8,-218]],[[35843,62206],[473,89],[19,-306],[-168,-45],[20,-332]],[[36187,61612],[956,166]],[[37143,61778],[765,130]],[[37908,61908],[-95,1670],[-41,-8],[-58,996]],[[37714,64566],[-19,334],[-1117,-194]],[[36578,64706],[-893,-163],[42,-689]],[[35727,63854],[21,-314],[-97,-17],[31,-332],[67,-1002],[94,17]],[[43580,40627],[1005,114]],[[44585,40741],[-8,201]],[[44540,41933],[-1032,-113]],[[43508,41820],[42,-1026],[30,-167]],[[43314,41797],[194,23]],[[44527,42282],[-50,1332]],[[44477,43614],[-58,1652]],[[44419,45266],[-1284,-124]],[[54960,31640],[768,4]],[[55728,31644],[5,1327]],[[55733,32971],[-767,8]],[[54966,32979],[-6,-1339]],[[67231,72058],[55,1353]],[[67286,73411],[-765,95]],[[66521,73506],[-18,-502],[-136,-886]],[[66367,72118],[94,-193]],[[50170,37363],[12,1]],[[50182,37364],[-22,1333]],[[50160,38697],[-751,-40]],[[81431,55842],[89,-76],[168,-33]],[[82022,55658],[46,762]],[[82068,56420],[-48,720],[121,616]],[[82057,57778],[-222,27],[-64,110]],[[81771,57915],[-41,-207]],[[81730,57708],[36,-293],[-175,-306],[-99,25],[-109,-228]],[[69535,66567],[580,-68]],[[70115,66499],[8,166],[193,-12],[41,672],[193,-18],[17,334]],[[70567,67641],[-384,29],[-58,124],[11,223],[-321,36]],[[69815,68053],[-195,31]],[[69620,68084],[-85,-1517]],[[46701,43834],[924,76]],[[47625,43910],[26,2]],[[47604,45587],[-920,-78]],[[46648,45506],[53,-1672]],[[19927,18119],[107,-189],[113,-63],[79,143],[143,141],[183,-201],[110,332],[329,128],[44,-322],[457,174]],[[21492,18262],[741,294]],[[22233,18556],[-126,171],[-37,157],[18,187],[-151,301]],[[21937,19372],[-80,195],[-225,137],[-208,542],[-28,134],[-135,136],[-14,217],[-58,98],[52,262],[-64,107]],[[21177,21200],[-416,-158],[44,-324],[-114,-157],[-18,-121],[-591,-233],[-223,249],[-23,105],[-108,71],[-16,107],[-131,5]],[[70039,64996],[192,-20]],[[70231,64976],[767,-100]],[[70998,64876],[61,1178],[-72,8]],[[70987,66062],[-639,87],[-251,17]],[[70097,66166],[-58,-1170]],[[63262,50739],[548,-50]],[[63810,50689],[185,374],[75,94]],[[64070,51157],[35,1318]],[[64105,52475],[-401,40],[-395,13]],[[63309,52528],[-16,-840],[-31,-949]],[[68995,41203],[-49,-944]],[[68946,40259],[433,-66]],[[69379,40193],[282,-45]],[[69661,40148],[42,666]],[[69703,40814],[21,334]],[[69724,41148],[-726,110]],[[68998,41258],[-3,-55]],[[11257,57627],[165,169],[115,35],[102,191],[118,65],[65,-104],[121,113],[-93,114],[-188,-43],[-118,53],[-260,-196],[24,-195],[-51,-202]],[[10630,57649],[146,40],[237,-5],[-20,155],[105,92],[-14,156],[-290,57],[-71,-124],[-93,-371]],[[10292,57356],[175,-64],[78,233],[-104,-13],[-149,-156]],[[10478,53706],[27,60],[243,-9],[108,66],[198,408],[27,-96],[-9,-330],[199,71],[109,-166],[140,-90],[184,297],[89,39],[138,268],[130,185],[139,74],[192,376],[113,35]],[[12505,54894],[54,23]],[[12559,54917],[-240,1635],[-40,220],[-72,76]],[[12207,56848],[-124,-197],[-198,-97],[-77,49],[-140,-150],[-145,-28],[-209,-297],[-228,-153],[-288,-103],[-310,-63],[-28,-312],[-204,-323],[142,-379],[-26,-266],[99,-302],[-32,-247],[-40,-30],[79,-244]],[[9635,28436],[152,232],[48,279],[189,100],[89,164],[3,155],[113,42],[78,105],[45,-99],[-10,-165],[-62,-114],[68,-225],[128,-143],[155,55],[44,-60],[371,-237],[74,-78],[81,189],[-70,155],[-50,265],[14,96]],[[9637,33267],[-994,-497],[16,-92]],[[8659,32678],[474,-2705],[28,-479],[-21,-310],[97,-22],[88,177],[93,-62],[113,-248],[-41,-220],[145,-373]],[[64715,45510],[388,-48]],[[65103,45462],[383,-48]],[[65486,45414],[25,734],[58,1285]],[[65569,47433],[-768,80]],[[64801,47513],[-40,-1009]],[[64761,46504],[-46,-994]],[[73761,28417],[189,-35],[11,165],[374,-75],[12,165],[190,-41]],[[74537,28596],[80,979]],[[74617,29575],[-380,88],[30,333]],[[74267,29996],[-705,168]],[[51078,74063],[145,566]],[[51223,74629],[-268,258]],[[50567,75258],[-77,-244],[-146,143],[-403,-1248]],[[80897,85535],[829,-209],[-11,-167],[384,-94]],[[82099,85065],[52,625]],[[82151,85690],[18,203],[-99,23],[29,330]],[[82099,86246],[-1067,258]],[[81032,86504],[-301,76]],[[80731,86580],[69,-196],[97,-849]],[[80683,86593],[-58,13]],[[80625,86606],[-17,-169],[61,-19],[14,175]],[[82286,53631],[256,-46],[425,-117]],[[82967,53468],[46,-13]],[[83107,54544],[-735,194]],[[82372,54738],[-86,-1107]],[[22301,22218],[146,55],[86,-462],[12,-172],[132,-431]],[[22677,21208],[109,-39],[57,-159],[82,76]],[[22673,22356],[-93,-34],[-177,1285]],[[22403,23607],[-362,-135]],[[22041,23472],[-314,-118]],[[21727,23354],[85,-652],[219,86],[76,-83],[27,-214],[125,49],[42,-322]],[[80374,44547],[194,-196],[117,-174],[28,-113]],[[80713,44064],[148,13]],[[80861,44077],[51,327],[226,344]],[[81138,44748],[-104,74],[-474,814]],[[80560,45636],[-149,-254],[73,-226],[-42,-438],[-68,-171]],[[50588,55683],[415,16]],[[51003,55699],[-15,1557],[9,4]],[[50997,57260],[-7,504]],[[50990,57764],[-764,-33]],[[50226,57731],[17,-1848],[-4,-220]],[[52414,44148],[768,18]],[[53182,44166],[188,4]],[[53370,44170],[-10,1678]],[[53360,45848],[-260,-5]],[[53100,45843],[-699,-17]],[[52404,45491],[10,-1343]],[[81018,70667],[140,-59],[155,106],[94,304]],[[81407,71018],[62,172],[75,39]],[[81544,71229],[-66,179]],[[81478,71408],[-239,51],[-179,-75],[-150,-729]],[[80910,70655],[108,12]],[[72399,42736],[-32,-504]],[[72367,42232],[609,-116]],[[72976,42116],[40,274]],[[73039,43224],[-136,30]],[[72903,43254],[-499,99]],[[72404,43353],[-21,-331],[33,-6],[-17,-280]],[[81056,60720],[1043,-277]],[[82099,60443],[51,114],[62,343],[-42,261],[65,328]],[[82235,61489],[-993,155]],[[81242,61644],[-9,-238],[-83,-140],[-28,-327],[-66,-219]],[[20453,63748],[167,-329],[71,-56],[45,-484],[69,-46],[6,-591],[57,-59],[-30,-272],[220,-292],[24,-195]],[[23168,61170],[-131,1206]],[[23037,62376],[-254,2355]],[[22783,64731],[-1137,-366],[37,-329],[-564,-182],[-188,1637],[-454,-143]],[[20477,65348],[-155,-44],[-122,-91],[-42,-247],[80,-216],[53,-417],[-85,-155],[84,-202],[-29,-178],[192,-50]],[[47710,35876],[164,13]],[[47874,35889],[792,55]],[[48666,35944],[-30,1330]],[[47702,37210],[-23,-2]],[[25509,19272],[45,-127],[137,-196],[-132,-437],[-98,-189],[30,-270],[184,208],[70,-164],[132,-137]],[[28092,23303],[-57,554],[-283,-102]],[[27752,23755],[-512,-156]],[[47368,51619],[-10,335]],[[47333,53648],[-765,-60]],[[46568,53588],[29,-1008]],[[46597,52580],[-12,-359],[21,-669],[762,67]],[[66718,67872],[34,837],[231,-30]],[[66983,68679],[-130,120],[23,566]],[[66876,69365],[-354,42]],[[66522,69407],[-20,-449],[-259,-23],[-41,-1e3]],[[56318,71542],[806,-22]],[[57124,71520],[27,96]],[[57151,71616],[9,331]],[[57160,71947],[5,542]],[[56635,72942],[-287,-45],[-26,-76]],[[56322,72821],[-4,-1279]],[[49757,80661],[346,8],[116,66]],[[50219,80735],[430,247]],[[50649,80982],[-95,264]],[[50554,81246],[-257,1208]],[[50297,82454],[-231,375]],[[50066,82829],[-324,-786]],[[53083,47518],[4,-338]],[[53087,47180],[192,7],[-5,505],[249,-8],[0,69],[353,6],[-1,112]],[[53875,47871],[-3,671]],[[53872,48542],[-669,-10]],[[53203,48532],[-63,-2],[3,-419],[-64,53],[4,-646]],[[73352,47426],[51,1],[236,-334]],[[73639,47093],[126,295],[53,57]],[[73818,47445],[-223,298]],[[73595,47743],[-158,76]],[[73437,47819],[-73,34],[-42,-173],[-207,-384]],[[73115,47296],[150,-12],[87,142]],[[71223,37007],[10,166]],[[71233,37173],[71,1005],[-39,8]],[[70560,37302],[-11,-166],[674,-129]],[[83185,55486],[-78,-942]],[[83997,54344],[117,1303]],[[83213,55830],[-28,-344]],[[86962,42978],[46,54]],[[87008,43032],[-46,-54]],[[83518,48434],[0,0]],[[73102,34350],[192,-31]],[[73859,34190],[106,1401]],[[73965,35591],[-64,16]],[[73901,35607],[-666,175]],[[73235,35782],[-48,-238]],[[45268,48733],[614,57]],[[45834,50471],[-723,-64]],[[45067,50403],[59,-1682]],[[59462,27910],[579,-28]],[[60041,27882],[27,1330],[-17,1]],[[60051,29213],[-573,33]],[[59478,29246],[-24,-1336]],[[66304,42384],[968,-123]],[[67024,43170],[-675,110]],[[42899,74020],[-962,-109]],[[41937,73911],[-499,-67]],[[41438,73844],[72,-1668]],[[51012,27958],[764,34]],[[51765,29317],[-186,-10]],[[50999,28951],[13,-993]],[[58031,26978],[67,-239],[-41,-94]],[[58057,26645],[613,-27]],[[58689,27950],[-388,17]],[[58301,27967],[-2,-166],[-389,14]],[[57910,27815],[-22,-69],[143,-336],[-48,-79],[48,-353]],[[65531,32582],[577,-81]],[[66108,32501],[385,-30]],[[66493,32471],[61,1344]],[[66554,33815],[-268,23]],[[65590,33904],[-59,-1322]],[[59478,29246],[-5,0]],[[58900,29276],[-21,-1336]],[[82649,35908],[-101,-1070]],[[82548,34838],[170,-30],[13,-61]],[[82731,34747],[188,-198],[26,48],[407,262],[66,218]],[[83418,35077],[-92,26],[-34,287],[90,858]],[[83382,36248],[-678,188]],[[82704,36436],[-55,-528]],[[56504,32960],[767,-12]],[[57271,32948],[9,1011]],[[57284,34291],[-772,13]],[[56512,34304],[-8,-1344]],[[55616,29369],[1,1334]],[[55617,30703],[-656,6]],[[54961,30709],[-310,0]],[[25333,93326],[54,-62],[87,232],[-10,219]],[[25464,93715],[-147,-158],[16,-231]],[[25034,95023],[14,-161],[-46,-173],[92,49],[55,249],[-115,36]],[[24024,95001],[0,-142],[132,-88],[66,85],[-25,152],[-95,166],[-7,-170],[-71,-3]],[[23894,94360],[61,-318],[-63,-29],[7,-201],[181,-50],[182,317],[134,63],[103,138],[166,313],[-134,-41],[-16,137],[77,-81],[139,130],[20,194],[78,-104],[28,94],[-17,286],[53,-91],[72,293],[-8,132],[-123,47],[-102,-29],[52,-130],[-141,-80],[-37,-261],[-58,78],[28,178],[-83,-21],[-48,-206],[-88,-9],[184,397],[57,-93],[90,178],[-71,-22],[68,159],[-88,20],[-187,-257],[-92,-329],[-95,67],[-24,-129],[137,-203],[-117,-158],[-235,-176],[49,-97],[-18,-246],[-64,209],[-57,-69]],[[23676,94551],[100,-32],[-46,118],[-54,-86]],[[23935,93593],[-92,115],[-45,-119],[6,641],[-54,147],[-77,-120],[-68,-291],[-1,-247],[-56,-4],[-106,-356],[39,-143],[94,-32],[70,128],[-28,-204],[-68,-59],[50,-123],[248,-13]],[[23480,94130],[12,152]],[[23492,94282],[-12,-152]],[[46291,30738],[1637,134]],[[47928,30872],[-26,1006],[25,1],[-13,499]],[[47914,32378],[-1671,-139]],[[79095,74426],[343,-68],[6,54],[223,-48],[53,131],[355,-83]],[[80075,74412],[27,339],[-132,19],[14,209],[67,137]],[[80051,75116],[-565,134]],[[79486,75250],[-143,35]],[[79343,75285],[-2,-354],[-66,-196],[-109,-123],[-71,-186]],[[23492,94282],[-73,-54],[-251,-492],[-203,-158],[60,-14],[-4,-233],[-73,-67],[18,-224],[-72,57],[-84,-147],[66,-306],[174,116],[89,-32],[39,206],[202,624],[100,572]],[[22770,93146],[15,-154],[118,129],[4,281],[-86,61],[14,-185],[-65,-132]],[[22956,92319],[68,-28],[105,316],[-103,94],[-235,-169],[43,242],[-34,181],[-81,-17],[-131,-193],[-45,15],[-106,-280]],[[66522,69407],[-105,13],[-78,282]],[[66339,69702],[-804,-371]],[[65535,69331],[-12,-321],[68,-5],[-5,-164],[67,-6],[-32,-775],[-47,-58]],[[85104,87813],[704,-194]],[[85808,87619],[76,198],[122,430],[150,407]],[[85233,89135],[-129,-1322]],[[60875,41680],[-483,55]],[[60392,41735],[-26,-1186]],[[63301,41327],[192,-4]],[[63493,41323],[579,-26]],[[64072,41297],[39,1354]],[[64111,42651],[-777,43]],[[63334,42694],[-33,-1367]],[[75580,36038],[124,-32],[14,166],[636,-150]],[[76354,36022],[7,107],[173,-42],[54,533]],[[76588,36620],[13,132]],[[76601,36752],[-957,228]],[[75644,36980],[-64,-942]],[[67353,48733],[768,-77]],[[68310,48747],[53,1205]],[[68363,49952],[-381,55]],[[37660,78779],[1641,-1447]],[[39301,77332],[923,1433]],[[40224,78765],[259,422]],[[40483,79187],[-736,873]],[[39747,80060],[-192,-26],[-2026,-1141]],[[37529,78893],[131,-114]],[[57117,26009],[4,334],[385,-13],[-2,-335],[386,-11]],[[58278,26264],[-141,80],[-70,130],[-10,171]],[[58031,26978],[-1105,37]],[[56926,27015],[-17,-999],[208,-7]],[[47374,67698],[297,21],[5,73],[142,-5],[98,87],[13,-104],[171,164],[44,-55],[152,146],[31,130]],[[48303,69444],[-960,-59]],[[64673,49336],[105,-270],[9,-238]],[[64787,48828],[819,-70]],[[65606,48758],[40,922]],[[65646,49680],[32,756]],[[65678,50436],[-340,33]],[[65338,50469],[-53,-198],[16,-135],[-213,19],[-3,-56],[-202,-322],[-1,-54],[-218,-343]],[[64664,49380],[9,-44]],[[74046,26062],[505,-119]],[[74551,25943],[1,413],[-146,111],[12,161],[-235,72],[-69,130],[-35,197]],[[74079,27027],[-217,44],[-25,-326],[-193,41]],[[67833,46482],[604,-96]],[[68437,46386],[97,-18]],[[68534,46368],[70,1248]],[[68067,47703],[-178,7],[-10,-226]],[[53100,45843],[-13,1337]],[[53083,47518],[-701,-13]],[[52382,47505],[8,-672]],[[22594,15647],[116,-104],[-17,-194],[109,-170]],[[22802,15179],[82,33],[16,-131],[103,54],[66,122],[81,-465],[47,47],[81,-260],[37,-12],[177,203],[146,110],[107,-187],[140,54],[71,-43],[-131,-302],[-39,-321]],[[23786,14081],[138,88],[90,249],[218,173],[43,81],[97,-39],[89,-314],[166,-190],[22,-130],[1636,-54]],[[26285,13945],[77,-17],[116,89],[76,-87],[139,47]],[[23232,18815],[-247,-96],[39,-64],[-22,-552],[-529,-198]],[[22473,17905],[47,-193],[189,-404],[61,-55],[32,-174],[181,-345],[-68,-282],[6,-270],[-58,-129],[-108,-55],[-30,-160],[-128,-69],[-3,-122]],[[48529,9513],[974,68]],[[49515,11300],[-975,-68]],[[47588,47266],[-955,-82]],[[49070,79011],[992,48]],[[50062,79059],[-25,162],[151,176],[-108,165],[13,154],[94,19],[-127,276],[70,290],[-22,90],[113,67],[-2,277]],[[39034,49628],[188,29],[54,-1004]],[[39276,48653],[645,100],[886,124]],[[40807,48877],[-79,1444]],[[40644,51904],[-489,-393]],[[40155,51511],[-497,-398],[-643,-28],[-56,-142]],[[38959,50943],[75,-1315]],[[9103,21025],[345,178],[46,110],[67,369],[-44,67],[-57,325],[33,17],[-39,275],[79,-34],[147,75],[145,-142],[23,-128],[187,39]],[[10035,22176],[146,94]],[[9504,25090],[-613,-330]],[[8891,24760],[-103,-269],[-48,-279],[36,-246],[-32,-298],[25,-314],[63,-403],[160,-458],[19,-325],[-47,-96],[1,-228],[-61,-49],[11,-412],[188,-358]],[[67156,70014],[192,-25],[-13,-339],[194,-25],[-15,-338],[39,-5]],[[68062,69216],[62,1383]],[[68124,70599],[-189,21]],[[67181,70694],[-25,-680]],[[50139,42721],[-5,-1]],[[50134,42720],[-764,-41]],[[80459,41745],[527,-150]],[[81151,41550],[74,307]],[[81225,41857],[-63,10],[-15,175],[-67,145],[73,281],[-32,74]],[[81121,42542],[-70,178]],[[81051,42720],[-133,-46]],[[80918,42674],[-210,-103],[-238,-365],[-50,98],[-106,-75]],[[80314,42229],[107,-108],[-5,-231],[43,-145]],[[76309,75661],[198,-29],[38,675]],[[76191,76418],[-364,60]],[[75827,76478],[-39,-700],[521,-117]],[[37202,51289],[1012,166]],[[38214,51455],[-112,578],[24,80]],[[38126,52113],[-22,51],[-479,720]],[[49441,54136],[-934,-43]],[[48507,54093],[-16,-335]],[[44077,18069],[1278,146]],[[45355,18215],[70,8],[-43,1322],[75,8],[-10,297]],[[45447,19850],[-773,-89],[12,-293],[-660,-74]],[[60041,27882],[204,-10]],[[60245,27872],[370,-21],[7,331],[383,-23]],[[61005,28159],[24,996]],[[61029,29155],[-592,35],[1,55]],[[60438,29245],[-386,24],[-1,-56]],[[55849,35658],[383,-3]],[[55468,37e3],[-191,2]],[[55277,37002],[1,-1340]],[[54830,49050],[-1,-505]],[[54829,48545],[768,-3]],[[55597,48542],[2,505]],[[55589,50224],[-766,3]],[[59600,34204],[773,-41]],[[60428,35156],[-385,25],[8,333]],[[44418,45289],[1083,111]],[[45501,45400],[43,4]],[[45484,47073],[-149,-13]],[[44360,46965],[58,-1676]],[[56811,36983],[9,1002],[72,-1],[3,377]],[[56895,38361],[-565,10]],[[98249,17157],[80,-70],[-28,138],[-52,-68]],[[98072,17379],[-8,-281],[189,209],[-58,185],[-123,-113]],[[97911,16723],[18,-160],[74,213],[-92,-53]],[[97504,17360],[72,-41],[41,118],[-113,-77]],[[97258,15698],[124,30],[42,-265],[78,32],[22,-160],[247,-214],[-224,-755],[178,-158],[-86,-299],[180,-159],[-128,-419],[354,-307]],[[98737,16014],[-71,61],[-14,323],[-100,-58],[-28,-136],[-110,98],[50,203],[-46,269],[74,74],[-182,149],[-145,-34],[-144,-295],[16,-110],[104,-144],[-56,-122],[-37,147],[-46,-141],[-180,271],[57,128],[-9,155],[109,174],[10,148],[-84,309],[56,9],[-44,155]],[[97917,17647],[-61,2]],[[97856,17649],[-121,-121],[-59,-192],[57,-203],[-130,-74],[-39,-101],[-89,115],[-52,-360],[34,-170],[-78,-272]],[[97379,16271],[-129,-314],[8,-259]],[[57539,67520],[180,25],[-15,147],[282,350],[88,46],[275,19],[0,110],[153,4]],[[58502,68221],[3,0]],[[58505,68221],[-14,303],[95,160],[80,-19],[89,90]],[[58755,68755],[-58,-4],[-73,155],[-61,-40],[-38,131],[-31,-122],[-139,116]],[[58355,68991],[-111,-66],[-38,72],[-111,-151],[-78,154],[-134,-86],[-111,131],[-36,-120],[-149,-87],[-4,-180],[-49,29]],[[57534,68687],[5,-1167]],[[57327,59193],[281,3],[8,-167],[95,-1],[3,-280],[644,21],[0,-95],[151,-31]],[[58509,58643],[-94,559],[-1,995],[-16,279]],[[58398,60476],[-291,-4],[0,55],[-662,-13]],[[57445,60514],[-118,-1321]],[[61012,63463],[111,2],[64,187],[54,-120],[344,-7],[-3,-335],[192,-5]],[[61774,63185],[92,-5],[12,1087],[-53,416],[153,-4],[11,508]],[[61989,65187],[-325,9]],[[61664,65196],[-69,2]],[[60665,63869],[-30,-221],[189,-7],[1,-113],[188,0],[-1,-65]],[[61772,62976],[193,-52],[248,182],[138,-33]],[[62351,63073],[8,419],[200,-7],[13,954],[118,168],[-44,181],[62,100],[-75,279]],[[62633,65167],[-50,1]],[[62583,65168],[-594,19]],[[61774,63185],[-2,-209]],[[42348,52490],[574,71]],[[42922,52561],[1234,140]],[[44156,52701],[-36,982]],[[44120,53683],[-58,1526]],[[44062,55209],[-1157,-141],[-535,-85]],[[42370,54983],[-148,-19]],[[42222,54964],[70,-1468],[14,2],[42,-1008]],[[25452,29695],[114,2]],[[25566,29697],[95,-25],[70,78],[88,-56],[51,150],[143,-6],[205,-406],[142,-4]],[[26360,29428],[167,-19],[86,258],[107,47]],[[26720,29714],[100,24],[-16,143],[278,92],[-100,987]],[[26982,30960],[-132,1247]],[[26850,32207],[-1453,-421],[-238,-100]],[[25159,31686],[-388,-131]],[[24771,31555],[176,-1600],[348,116],[45,-367],[112,-9]],[[71474,70453],[266,-40],[-55,-817]],[[71685,69596],[-6,-84],[504,-76],[115,177],[68,-17]],[[72366,69596],[23,348],[78,199],[56,32],[1,192],[166,205]],[[72690,70572],[-71,23],[11,166]],[[72630,70761],[-560,101],[11,168],[-381,54]],[[71700,71084],[-186,34],[-14,-254]],[[71500,70864],[-26,-411]],[[78034,72315],[46,664]],[[78080,72979],[14,190],[-356,81]],[[77738,73250],[-89,-89],[-181,-23]],[[77468,73138],[15,-242]],[[54589,26373],[776,0],[16,336]],[[55381,26709],[5,1329]],[[54611,28036],[-2,-1328],[-20,-335]],[[85418,49597],[250,-1242],[-7,-213]],[[85661,48142],[114,-265]],[[85775,47877],[115,89],[-1,141],[74,66]],[[85963,48173],[-14,120],[-3,683]],[[85946,48976],[-63,68],[-79,318]],[[85804,49362],[-125,271],[-125,56],[-136,-92]],[[53953,43170],[671,4]],[[54624,43174],[96,2]],[[54720,43176],[-1,1006]],[[54719,44182],[-388,-1]],[[54331,44181],[-381,-3]],[[53950,44178],[3,-1008]],[[47536,60831],[-19,758]],[[47495,62513],[-975,-77]],[[51884,14722],[621,20]],[[52505,14742],[-15,1318],[35,2],[-3,325]],[[51670,41441],[14,-1342]],[[72421,25055],[-763,145]],[[71658,25200],[-74,-1142]],[[49504,45707],[37,2]],[[49541,45709],[-37,1677]],[[67637,46339],[-28,-613]],[[67609,45726],[781,-127]],[[68390,45599],[47,787]],[[81199,46208],[199,-521],[53,-381]],[[81451,45306],[114,13]],[[81565,45319],[67,-31],[77,159],[61,-58]],[[81770,45389],[227,598],[-54,551]],[[81807,47213],[-146,-121]],[[81661,47092],[-330,-264],[-109,-180],[31,-55],[-93,-284],[39,-101]],[[67402,62701],[351,-45]],[[67753,62656],[23,524],[127,-17],[18,392],[62,-8]],[[67983,63547],[29,616],[-32,4]],[[67980,64167],[-642,75]],[[67338,64242],[-35,-834],[95,-12],[26,-171],[-22,-524]],[[79070,74231],[62,-37],[70,-354],[-11,-175],[76,-113],[18,-150]],[[79285,73402],[-28,-411]],[[79257,72991],[29,-54],[210,-8],[49,-142]],[[79545,72787],[44,550],[392,-99]],[[79981,73238],[34,435],[61,-13],[25,337]],[[80101,73997],[-57,14],[31,401]],[[79095,74426],[-25,-195]],[[51413,48483],[4,-337]],[[51417,48146],[959,31]],[[52376,48177],[-12,1345]],[[52364,49522],[-956,-31]],[[51408,49491],[5,-1008]],[[64974,65182],[178,-21],[-16,-326],[193,-26]],[[65329,64809],[36,806],[113,124],[14,408]],[[65492,66147],[12,335],[-578,59]],[[64926,66541],[-24,-728],[94,-7],[-22,-624]],[[50088,19931],[-53,-4]],[[50455,48446],[958,37]],[[51408,49491],[-3,336]],[[51405,49827],[-963,-34]],[[50442,49793],[1,-676]],[[50443,49117],[12,-671]],[[69748,46196],[319,-36]],[[70067,46160],[635,-96]],[[70702,46064],[40,666]],[[70760,47067],[-379,65]],[[70381,47132],[-334,55]],[[70047,47187],[-244,24]],[[69803,47211],[-55,-1015]],[[60045,42713],[289,-20]],[[60334,42693],[564,-47]],[[60905,42814],[28,1024]],[[60933,43838],[-852,51]],[[60081,43889],[-14,1]],[[77972,38702],[791,-202]],[[78763,38500],[13,126]],[[78776,38626],[-32,17],[63,721],[-67,13]],[[78740,39377],[-796,158]],[[77848,39123],[-33,-379],[157,-42]],[[61092,61856],[2,338],[-73,356],[53,58],[-34,230],[-60,9]],[[60980,62847],[-160,153],[35,-129],[-164,154],[-588,13]],[[60103,63038],[-3,-123],[110,-41],[97,-199],[51,-12]],[[70675,39308],[-189,29]],[[70486,39337],[-582,91]],[[69904,39428],[-55,-997]],[[50182,37364],[755,31]],[[50937,37395],[-7,1003]],[[50172,38697],[-12,0]],[[44489,67471],[962,79]],[[67468,55815],[-29,-669]],[[67439,55146],[581,-59]],[[68020,55087],[31,739]],[[68051,55826],[38,959]],[[68089,56785],[-48,5]],[[68041,56790],[-533,66]],[[67508,56856],[-40,-1041]],[[72488,55230],[276,-434],[115,-98]],[[72879,54698],[224,-8],[34,51]],[[73137,54741],[23,153],[82,-5],[55,158],[81,-23],[-35,172],[125,257]],[[73468,55453],[-91,31],[-532,73]],[[72845,55557],[-332,34]],[[72513,55591],[38,-135],[-63,-226]],[[65671,47421],[91,-12],[-4,-111],[576,-68]],[[66373,48332],[-591,66]],[[65782,48398],[-24,-505],[-64,8],[-23,-480]],[[58510,64696],[95,-2],[12,-183],[161,-28],[129,-109]],[[58907,64374],[575,-18]],[[59482,64356],[-11,224],[9,1112]],[[59480,65692],[2,220]],[[59482,65912],[-130,1]],[[59352,65913],[-836,-1]],[[58516,65912],[-6,-1216]],[[72555,56369],[271,6]],[[72826,56375],[-3,481],[41,120],[89,50]],[[72953,57026],[-23,418]],[[72930,57444],[-91,163],[-174,-34],[-42,99],[-131,28]],[[72492,57700],[-186,-781]],[[68422,43655],[684,-114]],[[69106,43541],[57,1059]],[[69163,44600],[27,500]],[[69190,45100],[-268,42],[0,-41],[-463,92]],[[68459,45193],[-50,-785]],[[68409,44408],[-24,-409],[54,-8],[-17,-336]],[[83308,38269],[49,-348],[105,-987]],[[83462,36934],[745,-237]],[[84207,36697],[-63,335],[-54,29],[12,192],[-43,212],[-75,160],[16,527],[-76,195]],[[83924,38347],[-29,339]],[[83895,38686],[-377,111],[-96,-128],[-205,63]],[[83217,38732],[91,-463]],[[12292,15591],[26,-102]],[[12318,15489],[148,119],[32,219],[368,-234],[133,115],[145,33],[128,204],[302,124],[55,60],[52,239],[156,-29],[131,209],[358,184]],[[14326,16732],[-45,334],[-70,276],[-73,66],[-53,366]],[[14085,17774],[-62,396],[20,102]],[[14043,18272],[-786,-340],[-110,89],[-289,-184],[-83,-196],[-163,-176],[-159,-66],[-77,75],[-39,213],[-398,-196],[39,-86],[-9,-234]],[[11969,17171],[-70,-228],[58,-82],[32,-271],[42,-24],[28,-233],[-40,-221],[135,-61],[51,-161],[158,15],[-71,-314]],[[57104,25339],[13,670]],[[56926,27015],[-249,3]],[[56677,27018],[-137,-156]],[[56540,26862],[-196,-180],[-42,14],[-274,-309],[-92,-162],[-73,23],[-112,-141]],[[55751,26107],[-195,-205]],[[55556,25902],[-2,-529],[371,-7]],[[56042,19719],[656,-12]],[[56698,19707],[121,74]],[[56819,19781],[11,252],[22,1940]],[[56852,21973],[-773,18]],[[12637,14349],[136,-101],[-33,-112],[57,-68],[-26,-234],[65,19],[86,-200],[84,154],[78,28]],[[13084,13835],[107,-3],[56,86],[-77,306],[-74,133],[82,324],[142,226],[39,348],[192,299],[996,479]],[[14547,16033],[-62,192]],[[14485,16225],[-91,20],[-28,117],[68,108],[-88,90],[-20,172]],[[12318,15489],[119,-190],[-116,-139],[161,-313],[110,0],[34,-158],[-37,-124],[48,-216]],[[87165,38078],[159,-332],[64,-49]],[[88019,37001],[544,507]],[[88563,37508],[-95,137],[39,276],[-58,358],[45,313],[-75,457],[-96,184]],[[88323,39233],[-163,60]],[[88160,39293],[-10,4]],[[88150,39297],[-86,-182],[-125,-138],[-131,-311],[-160,-89],[-142,-349],[-219,31],[-122,-181]],[[61496,60503],[725,-24]],[[62221,60479],[85,-33],[10,685]],[[62316,61131],[4,303],[-96,81],[5,302],[-469,16]],[[61760,61833],[-255,14]],[[78329,72949],[567,-133]],[[78896,72816],[83,111],[101,-12],[117,101],[60,-25]],[[79285,73402],[-336,59],[7,102],[-168,29],[-7,-98],[-112,23],[-22,-289],[-241,50]],[[78406,73278],[-77,-329]],[[34406,91804],[72,-328],[154,-99],[97,106],[150,419],[187,-96],[128,-117],[199,69],[0,53],[205,214],[36,129],[236,119],[35,277],[-139,261],[-187,118],[-106,-31],[-230,175],[-158,30],[-137,-134],[-46,-638],[-88,-67],[-67,80],[-197,-162],[-99,-188],[-45,-190]],[[34402,93280],[264,-283],[71,101],[-14,227],[-114,-15],[-166,67],[-41,-97]],[[33645,91867],[153,-106],[194,64],[126,196],[58,207],[-60,170],[-149,95],[-123,17],[-91,-454],[-108,-189]],[[33746,90799],[152,96],[50,-31]],[[33948,90864],[105,14],[203,-59],[130,81],[-63,180],[-132,168],[-157,68],[-458,-206],[-330,60],[-122,-53],[114,-264],[-14,-189],[522,135]],[[61010,52244],[-9,-625]],[[61001,51619],[385,-7]],[[61386,51612],[287,1]],[[61673,51613],[24,1575]],[[61697,53188],[-386,19]],[[50146,87895],[-29,2115]],[[62391,36697],[-768,54]],[[61623,36751],[-24,-673],[-19,-1009]],[[45637,58983],[963,87]],[[60884,38160],[583,-44]],[[61501,39452],[-390,31]],[[77314,43204],[-2,-56],[188,-26],[-10,-171],[207,-28],[-9,-227],[197,-23]],[[77885,42673],[10,225],[201,-26],[7,109],[178,-23]],[[78281,42958],[15,349],[-193,22],[13,343]],[[78116,43672],[-384,49],[3,102],[-200,23],[2,56],[-193,21]],[[77344,43923],[-18,-386]],[[75372,71525],[72,-8],[109,-155],[209,-81],[59,-350],[52,-53]],[[75873,70878],[103,-83]],[[75976,70795],[-27,160],[67,1e3]],[[76016,71955],[-487,107]],[[75529,72062],[44,-135],[-87,-117],[-134,-66],[20,-219]],[[34802,15937],[575,139]],[[36604,16322],[-7,201],[39,97],[-91,301],[64,13],[-29,381],[23,5]],[[36603,17320],[-29,381],[-224,-49],[-144,194],[-48,269],[-447,-98],[-138,77],[-29,389],[-577,-129]],[[74528,67625],[513,-91]],[[75234,68273],[-261,257],[-264,215]],[[74709,68745],[-181,-1120]],[[62203,12479],[213,-236],[70,17],[14,191],[90,93],[-28,88],[58,151],[180,-37],[86,-85],[42,101],[636,-124],[167,84],[93,257],[150,92],[73,-119],[105,-43],[75,57],[183,18],[135,-87],[-142,201],[-161,113],[-137,205],[-192,132],[-72,128],[-407,263],[-123,113],[-157,72],[-146,123],[-291,327],[-193,275],[-224,370]],[[62300,15219],[-45,-1604],[-11,-54],[-41,-1082]],[[55738,34310],[774,-6]],[[56512,34304],[3,331],[94,-1],[5,1017]],[[84571,52993],[599,-185]],[[85170,52808],[113,1164]],[[85283,53972],[-262,68]],[[84663,54140],[-92,-1147]],[[11860,79978],[-156,-190],[-32,-147],[-145,-222],[101,-35],[57,-159],[54,-421],[247,104],[311,-10],[225,-224],[99,-195],[58,-394],[60,-252],[230,-468],[124,-140],[155,74],[134,-81],[172,-212],[165,-284],[130,-88],[129,133],[238,-92],[95,-123],[169,-392],[73,-5],[239,172],[18,100],[-124,170],[9,164],[76,21],[36,-151],[89,-111],[39,-154],[107,159],[10,262],[103,77],[76,-154],[171,-50],[267,120],[-63,180],[15,104],[188,61],[-39,166],[196,58],[50,-112],[143,-13],[16,65],[234,-168],[186,129],[46,-33],[77,145],[36,-63],[150,172],[144,34],[71,-53],[278,-28],[134,149],[130,66],[89,-35],[179,-246],[166,-87],[551,444],[124,25],[172,1487]],[[72026,38708],[512,-109]],[[72559,38937],[69,1006],[-191,39]],[[72437,39982],[-317,62]],[[63221,52701],[7,-169],[81,-4]],[[64105,52475],[6,355],[198,-22]],[[64309,52808],[-16,176],[32,1083]],[[64325,54067],[5,173],[-325,37]],[[64005,54277],[-32,7],[-6,-396],[-41,0],[-21,-884],[-382,32],[-293,86]],[[46064,70957],[-622,-60],[-90,-28]],[[81344,51560],[81,-148],[315,-342]],[[81740,51070],[56,225],[119,160]],[[81843,51648],[102,382]],[[81945,52030],[-138,245]],[[81807,52275],[-72,163],[-95,90]],[[81640,52528],[-320,-492],[-50,-166]],[[81270,51870],[-46,-150],[120,-160]],[[57791,45116],[-2,-166]],[[58560,45607],[3,335]],[[58563,45942],[-767,18]],[[70874,67937],[141,-188],[-39,-82],[39,-142],[156,-79],[59,-120],[38,-456],[93,-68],[26,-116]],[[71387,66686],[122,-128],[229,-28],[221,252],[129,-19]],[[72088,66763],[64,-11],[56,413],[-39,146],[12,226],[68,47]],[[72249,67584],[-144,329],[-116,22],[-82,208],[-64,12],[-37,196],[-94,39],[5,111],[-95,13],[-69,222],[-98,140],[-82,12]],[[71373,68888],[-72,10]],[[71301,68898],[-6,-112],[-184,-89],[-77,-187],[-65,-19],[-51,-193],[-116,-74],[-40,-188],[85,11],[27,-110]],[[35766,96281],[15,-144],[179,-286],[82,-15],[69,-280],[121,-168],[14,-226],[-82,-164],[-69,-255],[-15,-226],[32,-191],[79,-62],[224,147],[30,102],[167,144],[112,154],[88,-20],[192,102],[418,337],[295,407],[100,216],[-17,427],[183,-8],[55,184],[-5,187],[171,268],[188,152],[-17,187],[-331,507],[-322,284],[-152,60],[-192,-19],[-135,221],[-119,81],[-76,138],[-110,55],[-110,214],[6,107],[-98,315],[-148,208],[-115,-197],[-170,-169],[-160,-85],[-85,-322],[70,-824],[-76,-539],[-64,-38],[-54,-455],[-183,-466],[15,-45]],[[21378,12167],[78,27],[124,-220],[142,35],[62,132],[123,31],[90,-53],[80,363],[159,334],[-2,323]],[[22234,13139],[-26,189],[-191,-78],[-110,71],[-130,971],[-92,-36],[-62,461]],[[21623,14717],[-186,-77]],[[21437,14640],[47,-461],[111,-807],[-96,-34],[25,-169],[-57,-79],[6,-286],[-190,-73],[95,-564]],[[73483,67548],[-28,90],[163,-1],[25,-118],[225,-31]],[[73868,67488],[76,1492]],[[73944,68980],[-593,114],[-61,69]],[[73290,69163],[-3,-55],[-306,56]],[[72981,69164],[-18,-350],[97,-13],[-19,-390],[255,-38],[-14,-336],[94,-73],[10,-398],[97,-18]],[[53920,34315],[1046,4]],[[54966,34319],[193,-3]],[[55278,35662],[-1128,-15]],[[54150,35647],[55,-56],[-54,-180]],[[54151,35411],[-100,-289],[4,-188],[58,-177],[-25,-145],[-81,-26]],[[54007,34586],[-74,-115],[-13,-156]],[[54743,38376],[828,-1]],[[56141,38372],[5,1333]],[[55764,39707],[-829,4]],[[54935,39711],[62,-78],[-132,-40]],[[54865,39593],[19,-181],[-30,-182],[66,26],[20,-131],[-115,-83],[17,-220]],[[54842,38822],[24,-249],[-137,-64],[14,-133]],[[26213,25862],[160,-8],[10,333],[60,30],[-55,490],[434,140],[-34,311],[565,177]],[[27353,27335],[-70,657]],[[27283,27992],[-376,-118],[-107,994],[-24,328],[93,29],[-35,329],[-93,-29],[-21,189]],[[26360,29428],[74,-680],[95,30],[142,-1325],[-479,-153]],[[25141,26955],[-7,-229],[30,-260],[-219,-100],[41,-241],[-15,-151],[82,-138],[-118,-249],[26,-99],[-138,-170],[63,-254],[-30,-109],[58,-184],[-43,-315],[-82,62],[-148,-51],[21,-89],[-204,-236]],[[24458,24142],[13,-214],[51,-76]],[[97299,17401],[37,-249],[-19,-265],[74,19],[-9,490],[-83,5]],[[96253,16160],[79,-71],[15,-217],[66,-17],[47,118],[88,-73]],[[96548,15900],[89,-75],[86,299],[490,-477],[45,51]],[[97379,16271],[-1,251],[-57,165],[-81,-73],[-98,173],[121,218],[10,161],[-57,107],[-9,186]],[[97207,17459],[-147,47],[-293,-290],[-84,267],[-109,-25]],[[96574,17458],[-158,17]],[[96416,17475],[19,-491],[80,-12],[-18,-340],[-72,9],[-19,-346],[-107,26],[-46,-161]],[[95022,26344],[30,-96]],[[95052,26248],[-3,-105]],[[95049,26143],[16,-180],[94,17],[31,-357]],[[95190,25623],[104,-44]],[[95294,25579],[-26,158],[93,186],[-84,49],[44,115]],[[95321,26087],[-73,72],[-98,346],[-128,-161]],[[91862,25913],[148,-55]],[[92010,25858],[753,-273]],[[92763,25585],[281,-101]],[[93044,25484],[43,168],[74,14],[29,174],[-54,83],[34,253],[50,57],[-55,159],[38,523]],[[93203,26915],[-53,59],[-85,-306],[-166,125],[-24,-94],[-326,252],[-20,-179],[-287,-1],[-40,-209],[-165,10]],[[92037,26572],[-26,-421],[-69,-3],[57,-147],[-118,56],[-19,-144]],[[74079,27027],[4,515],[-32,109],[94,281],[99,86],[47,-122],[37,117],[173,116]],[[74501,28129],[36,467]],[[54019,26703],[1,-336]],[[54020,26367],[569,6]],[[54014,28033],[5,-1330]],[[63553,68641],[175,-142],[-13,-119],[-172,-186],[122,-124],[129,177],[108,-67],[-67,-161],[-90,51],[-52,-78],[-1,-182],[282,-66],[-103,-100],[-58,-202],[103,-236],[-128,-99],[-19,-80],[123,-119],[39,139],[69,-59],[-53,-146],[181,-58],[27,-206],[-159,-126]],[[63996,66452],[-2,-4]],[[63994,66448],[544,-46],[21,504]],[[64559,66906],[43,1428],[-193,19],[11,334]],[[64420,68687],[-836,75]],[[63584,68762],[-31,-121]],[[73754,22109],[769,-192]],[[74523,21917],[131,272],[105,383],[-214,-132],[-74,166],[43,82],[-4,216],[93,169],[122,59],[5,84]],[[74730,23216],[-889,207]],[[63336,18545],[380,-342],[205,-132],[200,-370]],[[64121,17701],[39,-3],[24,656],[192,-20],[11,330],[578,-69],[27,658],[578,-68]],[[65570,19185],[38,894]],[[65608,20079],[-162,-137],[-1320,-463]],[[64126,19479],[-300,-109],[-86,-384],[-109,-256],[-135,-31],[-25,-119],[-92,89],[-43,-124]],[[94026,13355],[215,-367],[-86,-199],[78,-262],[102,-201],[-3,-209],[-127,-19],[30,-139],[-64,-64],[37,-148],[-54,-24],[60,-356],[-109,-124],[22,-308],[44,-151],[-22,-115],[72,-143],[47,-222],[55,-55],[-45,-599]],[[94726,9431],[112,659],[-19,9],[259,1529],[64,-58],[128,416],[-47,71],[-43,-117],[32,475],[-88,13],[42,285],[79,16],[86,161],[-7,246],[-58,124],[459,1537],[106,303],[151,-130],[6,-117],[207,-180]],[[96195,14673],[276,915],[77,312]],[[96253,16160],[-34,-92],[-208,177],[16,109],[105,150],[-12,182],[-279,12],[-7,127],[-119,-119],[-111,96]],[[95604,16802],[-88,-237],[-53,40],[-170,-663],[-139,122],[-88,-320],[60,-51],[-184,-632],[-193,166],[-61,-189],[-148,152],[-370,-1285],[18,-16],[-162,-534]],[[63906,73810],[189,-113],[54,81],[42,-153],[-18,-167],[80,16],[72,-151],[-178,-75],[-20,-199],[50,-71],[-55,-109],[-65,72],[-168,-176],[23,-165],[196,148],[-26,-129],[-124,-105],[9,-62]],[[63967,72452],[47,-57]],[[64014,72395],[149,-10],[21,631],[19,-130],[168,-9],[-14,-508],[248,11],[9,-204]],[[64614,72176],[124,100],[7,168],[125,-12],[69,141]],[[64939,72573],[-91,119],[39,126],[-85,281],[19,133],[-126,-40],[3,183],[-51,314]],[[64647,73689],[-109,204],[31,77],[-198,170],[-49,-62],[-13,198],[-88,-87],[-128,-23]],[[64093,74166],[-1,-24]],[[64092,74142],[42,-144],[-86,-75],[1,209]],[[64049,74132],[-207,-14],[-10,-247],[74,-61]],[[86372,24361],[287,-56],[-23,-144],[402,-77]],[[87038,24084],[133,809]],[[87171,24893],[-99,-15],[-39,637],[41,8],[43,627]],[[87117,26150],[-186,-41]],[[86931,26109],[-288,-130],[-85,-81],[39,200],[-42,63],[-70,-103],[-18,150],[-54,-96],[-273,109]],[[86140,26221],[-16,-108],[-197,65],[-93,-600]],[[85834,25578],[279,-507],[184,-26],[89,-96],[30,-191],[-44,-397]],[[55381,26709],[372,-2],[-2,-600]],[[56540,26862],[5,827],[-385,9],[0,333]],[[74812,36259],[-62,-889]],[[74750,35370],[191,-56]],[[74941,35314],[505,-149]],[[75446,35165],[21,96],[121,51],[76,-76],[173,183],[115,55]],[[75952,35474],[-410,111]],[[75542,35585],[-252,64],[-57,193],[-137,193],[-5,142],[-101,191],[-158,170]],[[74832,36538],[-20,-279]],[[62435,38378],[-16,-675]],[[63192,37640],[192,-15],[14,553]],[[63398,38178],[-100,0],[-135,143],[-76,-42],[-118,100],[-31,301]],[[62938,38680],[-495,33],[-8,-335]],[[50824,65302],[-6,837]],[[50818,66139],[-7,570]],[[50811,66709],[-57,104],[-239,-88],[-116,-91],[-113,278]],[[50286,66912],[-117,76],[-162,-340],[-60,-35]],[[49947,66613],[12,-680],[-96,-3],[5,-279]],[[55767,40703],[-718,4]],[[55049,40707],[-45,-147],[20,-125],[-69,-142],[-17,-170]],[[54938,40123],[28,-135],[-31,-277]],[[92070,33032],[87,187],[145,611],[54,326]],[[92356,34156],[-207,195],[-317,100]],[[91832,34451],[-47,-127],[55,-129],[-44,-254],[31,-133],[-136,-134]],[[91691,33674],[54,-299],[98,-15],[18,-144],[209,-184]],[[41552,16833],[164,26],[210,-300],[116,-343],[11,-527],[-87,-426],[-90,-131],[53,-126]],[[41929,15006],[438,68],[9,-165],[131,21]],[[42507,14930],[-13,253]],[[42494,15183],[-130,2611]],[[42364,17794],[-475,-70],[6,-110],[-94,-70],[-289,-44]],[[41512,17500],[40,-667]],[[65492,57537],[373,-32],[29,-163],[102,91],[116,-52],[125,183],[4,89]],[[66241,57653],[-118,0],[3,121],[142,133],[-88,130],[-194,-29],[-16,64],[143,182]],[[66113,58254],[72,216],[-147,190],[-35,319],[-47,7]],[[65956,58986],[-404,51]],[[65552,59037],[-60,-1500]],[[61797,44120],[687,-42]],[[62484,44078],[28,115],[-42,146],[35,152],[91,95],[27,201]],[[62623,44787],[-1,114],[109,162]],[[62731,45063],[-696,50],[3,111]],[[62038,45224],[-224,14]],[[30575,67536],[738,169],[359,114],[828,183]],[[32500,68002],[250,58],[16,517],[-56,240],[39,158],[99,73],[-25,370],[80,370],[-75,500],[232,142]],[[31716,73011],[-576,-127],[64,-823],[-25,-5],[131,-1664],[-204,-46],[26,-332],[-383,-87],[50,-663],[-356,-86]],[[30443,69178],[132,-1642]],[[85750,42446],[64,-638],[38,-138]],[[85922,41636],[113,46],[81,-41],[73,148],[145,116]],[[86334,41905],[-61,171],[2,240],[116,137],[235,-7]],[[86626,42446],[-259,915]],[[86367,43361],[-44,-139],[-199,-154]],[[86124,43068],[-549,-98]],[[85575,42970],[139,-310],[36,-214]],[[43801,23459],[108,-1979],[35,-809]],[[43944,20671],[1462,173]],[[45406,20844],[-66,1800]],[[45340,22644],[-61,1657]],[[45279,24301],[-1507,-181]],[[49605,83544],[461,-715]],[[50297,82454],[507,745],[56,370]],[[50860,83569],[-179,257],[-434,323]],[[50247,84149],[-66,-99],[6,-132],[-75,-81],[63,-225],[-123,-53],[-23,105],[-237,-171],[-63,72],[-124,-21]],[[47839,92911],[170,-197],[70,179],[757,57]],[[48803,94787],[-122,414],[-326,374]],[[48355,95575],[-56,-325],[-12,-260],[-61,-84],[-50,-373],[-118,-146],[17,-102],[-113,-111],[7,-150],[-73,-169],[-62,-26],[40,-256],[-17,-229],[30,-94],[-48,-339]],[[52600,90628],[121,-113],[276,-692],[109,-40]],[[53106,89783],[-55,303]],[[53051,90086],[-303,572],[-82,272]],[[52666,90930],[-66,-302]],[[53176,89100],[-17,177]],[[53159,89277],[-22,211]],[[53137,89488],[-249,352],[-182,-97],[0,-138]],[[52706,89605],[-146,-162],[-43,-173],[659,-170]],[[52332,90009],[154,78],[222,-206],[-2,268],[-219,526]],[[52487,90675],[-245,-665]],[[52242,90010],[90,-1]],[[58365,81705],[417,-19]],[[58782,81686],[377,-21]],[[59159,81665],[-27,133],[66,260],[-82,204],[20,143]],[[59136,82405],[-120,237],[-124,486]],[[58892,83128],[24,-303],[-41,-127],[-335,-181],[0,-125],[-121,-84],[25,-167],[-72,-125]],[[58372,82016],[46,-171],[-53,-140]],[[40931,74112],[493,63],[14,-331]],[[41937,73911],[-70,1662]],[[41867,75573],[-999,-126]],[[40868,75447],[63,-1335]],[[84637,49049],[72,-63]],[[84709,48986],[248,301],[214,160]],[[85171,49447],[21,202],[-111,412]],[[85081,50061],[-81,138],[-77,-11],[-72,116]],[[84851,50304],[-81,-113],[-101,12],[-24,-116],[-226,-527]],[[84419,49560],[218,-511]],[[18487,8616],[58,-366],[152,-108],[104,-241],[507,207],[47,-319],[234,-231],[133,1],[86,-360],[166,-212],[47,-320],[103,-15],[95,-191],[178,75]],[[20397,6536],[3,74]],[[20400,6610],[-371,2509]],[[19168,10807],[-32,220],[-124,-58]],[[19012,10969],[-61,-216],[-203,226],[-392,-95]],[[18356,10884],[-82,-223],[-5,-243]],[[80518,43395],[83,-214],[143,-242],[22,-144],[152,-121]],[[81051,42720],[47,257],[-96,316],[116,168],[45,140],[-104,141]],[[81059,43742],[-93,128],[-57,214],[-48,-7]],[[80713,44064],[-230,-576],[35,-93]],[[82007,44333],[311,-193],[18,-394],[48,-183]],[[83234,43902],[16,23]],[[83250,43925],[-28,152],[-140,7],[31,113],[-103,120],[-35,146],[73,216],[-62,267],[-92,235]],[[81770,45389],[55,-208],[188,-62],[12,-374],[-40,-209],[22,-203]],[[55617,30703],[108,0]],[[55725,30703],[3,941]],[[54960,31640],[1,-931]],[[76483,51375],[104,322],[1,323]],[[76588,52020],[7,182],[52,100]],[[76647,52302],[-74,-18],[-175,-312],[-39,89],[-189,-3]],[[76170,52058],[-142,-355],[-68,-99],[-14,-154]],[[85763,52617],[232,-79]],[[85995,52538],[181,874],[-36,169]],[[85845,54033],[-24,-23],[-117,-1030],[-1,-234],[60,-129]],[[27811,62736],[-91,1002],[1363,355],[-139,1612]],[[28944,65705],[-30,337],[-109,59],[-160,-39],[-138,73],[-237,-19],[-61,95],[-82,-21],[-81,115],[-34,257],[58,410],[-77,-24]],[[27993,66948],[-105,5],[-181,156],[-68,-53],[-197,232],[-21,160],[-114,135],[-208,-1089],[-19,-364],[-75,-504]],[[27005,65626],[-132,-861],[-118,140],[-34,112],[-65,-97],[-103,-285],[-2,-119],[-77,-144],[53,-273],[-51,-252],[26,-128],[-83,-25],[40,-306],[-90,-20]],[[26369,63368],[81,-261],[-30,-248],[35,-57],[-425,-121],[43,-105],[13,-227],[78,-154],[48,-380],[209,-148],[12,-123]],[[60201,59027],[97,-2]],[[60298,59025],[96,-4],[4,169],[761,-18]],[[61159,59172],[2,335]],[[61161,59507],[12,722]],[[60218,60533],[-3,-1339],[-14,-167]],[[63150,63463],[134,-10],[-5,-280],[99,-82],[159,-7]],[[63537,63084],[6,349],[65,-5],[35,169]],[[63643,63597],[11,510],[96,-6],[6,341]],[[63756,64442],[16,673],[99,-3],[12,512],[-99,8]],[[63784,65632],[-68,-22],[-161,-397],[-240,-302],[14,-108],[-157,6]],[[63172,64809],[-2,-113],[-131,-52],[-5,-225],[132,-5],[-10,-610],[43,-193],[-49,-148]],[[74167,78222],[22,-342],[133,-21],[41,160],[223,-32],[16,-337]],[[74602,77650],[224,-38],[10,166],[96,-17],[49,831]],[[76798,66781],[172,-523],[4,-363]],[[76974,65895],[471,468]],[[77463,66633],[25,146],[-112,49],[-149,203],[1,169],[-52,109]],[[77043,67044],[-52,-134],[-161,-28],[-32,-101]],[[81444,83370],[693,-173]],[[82137,83197],[128,1468],[67,854]],[[82332,85519],[12,137],[-127,-25],[-66,59]],[[82099,85065],[-13,-163],[-84,6],[-93,-131],[-147,4],[-148,-280],[19,-49]],[[81633,84452],[11,-196],[102,-184],[-7,-241],[-200,-241],[-95,-220]],[[72431,44644],[563,-110]],[[73043,45243],[-226,326]],[[72412,45897],[-50,-842]],[[61113,32763],[-16,-675]],[[61097,32088],[772,-54]],[[61869,32034],[43,1682]],[[59118,36900],[192,-8]],[[75398,51548],[38,-143],[140,-64]],[[75576,51341],[213,-105],[115,125]],[[76170,52058],[-249,437]],[[75921,52495],[-109,12],[-250,-204]],[[75562,52303],[5,-149],[-78,-91],[8,-127],[-96,-246],[-3,-142]],[[63262,72438],[88,-113],[-12,-321],[93,-252],[-2,-406],[34,-10],[15,-279],[52,-62],[22,-210]],[[63552,70785],[184,-12]],[[63736,70773],[-81,291],[120,99],[35,-100],[-14,-201],[91,5],[40,333],[-131,181],[-30,127],[14,265],[192,51],[-41,137],[-128,205],[70,208],[126,-96],[40,-155],[46,88],[-71,184]],[[63967,72452],[-117,106],[-606,51]],[[63244,72609],[18,-171]],[[61905,81887],[159,7],[146,93],[76,-52],[48,205],[199,127]],[[62533,82267],[-51,205],[56,574]],[[62538,83046],[-9,129],[-261,250],[-42,-104],[-122,62],[65,199],[128,18],[-62,103],[60,201],[141,-78],[-57,110],[47,62],[-226,36],[-178,173],[-138,40],[-576,-173]],[[61308,84074],[-8,-718],[-24,-1010],[-238,18]],[[61038,82364],[215,-224]],[[61212,80627],[85,-310],[-30,-61],[-25,-1196]],[[61242,79060],[169,-9],[50,-220],[187,-197],[98,136],[95,-13]],[[61841,78757],[3,112],[138,325]],[[61982,79194],[7,213],[77,91],[8,361],[-69,237],[4,172],[-97,7],[1,112],[-293,20],[-82,46],[-62,186]],[[61209,80653],[3,-26]],[[57101,44004],[656,-2]],[[57116,45130],[-3,-279]],[[57113,44851],[-12,-847]],[[63449,49395],[121,14],[203,-226],[66,-179]],[[63839,49004],[15,666]],[[63854,49670],[4,197],[-48,822]],[[63262,50739],[-472,41],[0,-22]],[[62790,50758],[-57,-1888]],[[53956,42165],[668,2]],[[54624,42167],[0,1007]],[[53953,43170],[3,-1005]],[[50190,36023],[758,34]],[[50947,36726],[-10,669]],[[33107,67063],[2277,461],[188,19]],[[35572,67543],[-20,342],[48,9]],[[35600,67894],[-73,1294]],[[35527,69188],[-1072,685],[-10,166],[-764,-156],[-47,666]],[[32500,68002],[79,-1057],[528,118]],[[87403,56692],[190,-95],[48,101],[145,-153],[178,-268]],[[87964,56277],[122,262],[66,17]],[[88152,56556],[-86,177],[58,136],[-70,155]],[[88054,57024],[-101,-21],[65,254],[-122,439],[-204,317]],[[87692,58013],[-33,-45],[-43,-324],[-51,-129],[-130,-84]],[[87435,57431],[-53,-634],[21,-105]],[[80415,57929],[83,51],[198,-62]],[[80696,57918],[195,512]],[[80891,58430],[124,227],[84,66],[24,201],[62,50],[23,372]],[[81208,59346],[-70,13]],[[81138,59359],[-724,129]],[[80414,59488],[1,-165],[56,-539],[-56,-855]],[[41358,37844],[1119,150]],[[42477,37994],[-58,1333],[-19,174]],[[42400,39501],[-319,-41]],[[42081,39460],[-800,-112]],[[41281,39348],[77,-1504]],[[55163,58992],[255,0],[92,127],[-6,209],[235,-2]],[[55739,59326],[415,-3]],[[56056,60333],[-174,-34],[-104,90],[-103,-17],[-153,64],[-49,87],[-86,-85],[-23,-266],[-208,2]],[[55156,60174],[-96,3]],[[55060,60177],[1,-175],[103,1],[-1,-1011]],[[51718,61978],[956,26]],[[52674,62004],[-13,1729]],[[52661,63733],[-360,-146],[-20,-435],[-86,-39],[-8,-200],[-240,-300],[-44,-129],[14,-167],[-201,-186]],[[51716,62131],[2,-153]],[[52267,65349],[380,9],[-99,-450],[105,-53],[383,8]],[[53036,64863],[-1,168],[192,3],[-2,336]],[[53225,65370],[-97,-1],[-4,667],[-96,-1]],[[81253,37794],[756,-203]],[[82009,37591],[1,0]],[[82010,37591],[-24,248],[-65,78],[14,165],[115,61],[31,349],[-80,185],[-13,627],[-93,169]],[[81895,39473],[-156,-28],[62,-160],[-478,-175],[-350,-467]],[[80456,61761],[25,-339],[21,-618],[103,-321]],[[80605,60483],[429,68],[54,92]],[[81088,60643],[-32,77]],[[81242,61644],[26,296]],[[81268,61940],[-110,46],[-86,198],[-33,-116],[-183,-173]],[[80856,61895],[-400,-134]],[[47547,26399],[1350,97]],[[48448,27819],[78,-174],[-47,-97],[-98,-15],[-157,-165],[-232,-83],[-209,-131],[-25,-326],[-138,-90],[-99,53],[-68,-72],[94,-320]],[[75387,53794],[127,-82],[76,65],[95,-141],[60,43]],[[75745,53679],[75,380],[159,173],[65,272],[154,122]],[[76198,54626],[-126,190],[61,211]],[[76133,55027],[-101,15]],[[76032,55042],[-423,81]],[[75609,55123],[-165,-294],[-49,-308],[-74,-188],[60,-97],[-22,-221],[28,-221]],[[78313,59573],[151,-138],[123,-437]],[[78587,58998],[263,401],[94,518],[37,73]],[[78664,60361],[-40,-58],[-196,161]],[[78428,60464],[-191,156]],[[78237,60620],[-94,-80],[108,-329],[-34,-115],[90,-260],[6,-263]],[[88152,56556],[77,18],[77,-226],[71,83],[98,-295]],[[88475,56136],[460,303],[133,139]],[[89068,56578],[-94,253],[-24,180],[117,105],[-17,280]],[[89050,57396],[-50,-34],[35,207],[171,127],[249,59],[121,-210]],[[89576,57545],[67,76],[-40,284],[-106,127],[-222,83],[-111,180],[-222,68]],[[88942,58363],[44,-113],[-107,58],[-73,-708],[-43,-203],[-112,107],[-24,-94],[-282,-174],[-291,-212]],[[47305,71067],[702,60]],[[78260,53240],[104,-169],[-13,210],[-91,-41]],[[78175,45047],[-30,-686],[65,-9]],[[78210,44352],[878,-132]],[[79088,44220],[44,321]],[[79132,44541],[-104,74],[105,272],[-16,167],[46,147],[-95,-61],[-57,233],[-81,66]],[[78930,45439],[-39,-79],[33,-150],[-72,-177],[-71,0],[-69,-128],[-133,312]],[[78579,45217],[-9,-171],[-392,57],[-3,-56]],[[77803,45853],[206,-51],[-27,-736]],[[77982,45066],[193,-19]],[[78579,45217],[-55,249],[16,220],[-109,202],[88,330],[47,325],[-72,125]],[[78494,46668],[-113,64]],[[78381,46732],[-129,22],[-17,-350],[-204,25],[-48,-339],[-171,16],[-9,-253]],[[80955,47930],[301,12],[405,-850]],[[82555,47633],[-47,291],[-77,181]],[[82431,48105],[-226,623],[-47,224],[19,97],[-62,166]],[[82115,49215],[-155,41],[-25,-88],[-84,153],[-385,-79]],[[81466,49242],[-20,-117],[-170,-237],[-107,-100]],[[81169,48788],[101,-13],[-137,-291],[57,-157],[-117,-149],[38,-133],[-113,49],[-43,-164]],[[63658,60348],[777,-58],[187,-29],[385,-10]],[[65007,60251],[35,1006]],[[65042,61257],[-389,27]],[[63685,61364],[-27,-1016]],[[10532,43710],[1,2]],[[10533,43712],[555,-566],[307,-108],[108,11],[114,141],[189,-1269]],[[11806,41921],[318,1126]],[[12459,43989],[0,1]],[[12459,43990],[-1147,412],[3,215],[-572,581]],[[10743,45198],[-64,-225],[-91,28],[-33,-87],[-88,102],[-31,-553],[107,-63],[36,-297],[-72,-58],[25,-335]],[[9582,35629],[994,476],[17,-108],[210,105],[-20,109],[197,95]],[[10980,36306],[-78,283]],[[10902,36589],[-105,204],[-32,227],[28,444],[67,39],[-2,328],[-66,225]],[[10792,38056],[-837,-402]],[[9955,37654],[-90,-198],[28,-217],[-109,-189],[27,-256],[72,-177],[-41,-161],[-99,-29],[-155,-215],[-110,-347],[104,-236]],[[76252,65222],[43,141],[204,212],[171,257],[102,73]],[[76772,65905],[-53,113],[-77,451],[-134,-93]],[[76508,66376],[-108,83],[-70,-50]],[[76330,66409],[-127,25]],[[76203,66434],[-81,-1198],[130,-14]],[[76800,62135],[45,-41],[-5,-189],[77,-71]],[[76917,61834],[176,-69]],[[77093,61765],[107,121],[18,117],[-50,293],[117,389],[-78,209]],[[77207,62894],[-321,64]],[[76886,62958],[-51,-164],[-54,-471],[19,-188]],[[74004,64399],[137,-25],[74,-338],[264,-310],[93,-604]],[[74572,63122],[70,-13]],[[74642,63109],[22,169],[-48,12],[32,447],[-23,85],[182,10]],[[74809,64979],[-385,59],[4,83],[-299,51]],[[74129,65172],[-125,-773]],[[24010,26575],[781,267]],[[24639,28152],[-36,-12],[-87,761]],[[24516,28901],[-197,-162],[-110,-2],[-33,-368],[-116,-86],[16,-176],[76,-154],[-69,-242],[-124,-31]],[[23959,27680],[-78,-38],[129,-1067]],[[65108,35122],[479,-67]],[[66385,36154],[-690,99],[-2,-56],[-443,56]],[[65250,36253],[-4,-109],[-93,9]],[[65153,36153],[-45,-1031]],[[40788,13162],[17,-293],[59,10],[43,-749]],[[40907,12130],[36,-52],[173,44],[15,94],[100,-164],[53,34],[110,-192],[82,129],[95,-13],[113,105],[147,7],[64,-62],[125,45],[20,97],[284,286],[172,-68],[43,218],[81,27]],[[42620,12665],[-21,506],[-92,1759]],[[41929,15006],[-141,-22],[35,-661],[-122,-19],[18,-328],[-582,-92],[19,-329],[-387,-65],[19,-328]],[[87257,53659],[135,102],[166,21],[45,209],[95,-27],[142,81]],[[87840,54045],[150,342],[23,330]],[[88013,54717],[-76,-29],[-130,170],[-61,177],[-225,415]],[[87521,55450],[-117,-172],[-101,-356],[-153,-104]],[[87150,54818],[41,-573],[66,-438],[0,-148]],[[43777,57083],[232,24]],[[44009,57107],[725,81]],[[43711,58797],[66,-1714]],[[74056,68956],[666,-130]],[[74722,68826],[147,892]],[[74869,69718],[67,93],[-19,125],[95,129],[-9,85]],[[75003,70150],[-286,82],[-12,58],[-556,114]],[[74149,70404],[-93,-1448]],[[14009,39495],[410,1055]],[[14419,40550],[-75,156],[-42,227],[70,447],[-81,319],[-110,19],[9,114],[-75,125]],[[13534,41278],[-80,-90],[35,-235]],[[10443,25535],[294,151],[1200,573]],[[11937,26259],[1331,677]],[[13268,26936],[-43,169],[-103,644],[13,6],[-350,2205]],[[9635,28436],[-38,-248],[28,-37],[25,-456],[-33,-83],[-256,-128]],[[9361,27484],[124,-234],[-5,-325],[-63,-260],[166,-451],[0,-398],[135,-184],[138,3],[132,-318]],[[31901,51207],[265,-511],[1314,286],[333,56]],[[33813,51038],[-89,129],[-94,593],[-104,83],[-22,117],[-168,80],[-44,211],[-164,279],[-19,276],[-99,330],[-95,195]],[[32915,53331],[-1167,-267]],[[75005,61483],[62,-14]],[[75067,61469],[278,-59]],[[75386,61918],[74,102],[-109,396],[44,557]],[[75395,62973],[-122,-129],[-153,87],[-194,11],[-14,-69]],[[74912,62873],[-40,-154],[74,-24],[-90,-93],[124,-27],[-24,-409],[63,-257],[-54,-149],[40,-277]],[[26982,30960],[559,166],[35,-331],[252,77],[33,-330],[126,38]],[[27987,30580],[57,17],[46,229],[76,-1],[-20,256],[-78,222],[81,45],[39,-114],[111,32],[35,231],[44,49]],[[28378,31546],[72,204],[-25,261],[-63,-20],[-66,654]],[[28296,32645],[-90,-23]],[[28206,32622],[-44,-31],[-1312,-384]],[[68654,50011],[323,-42],[4,103],[194,-25],[6,125]],[[69181,50172],[-6,170],[38,875]],[[69213,51217],[-222,114],[-118,-182],[-55,110]],[[68818,51259],[-13,122],[66,235],[-59,134],[-150,-72]],[[68662,51678],[-129,-337]],[[68533,51341],[136,-34],[-95,-83],[81,-233],[-62,-228],[124,-130],[2,-128],[-71,72],[56,-194],[67,-46],[-117,-326]],[[71761,51981],[168,-827]],[[71929,51154],[246,-120],[41,-230],[-69,-468]],[[72147,50336],[90,-49]],[[72237,50287],[15,34]],[[72252,50321],[55,17],[16,188],[87,-27],[45,248],[190,227]],[[72645,50974],[26,141],[93,146]],[[72764,51261],[-77,316],[-108,141],[-20,155],[-89,173],[-5,404]],[[72465,52450],[-273,12]],[[72192,52462],[-22,-175],[-122,-255],[-105,67],[-182,-118]],[[59136,82405],[1148,-58],[1,54],[255,-14]],[[60540,82387],[498,-23]],[[61308,84074],[-243,-123],[-406,-308],[-165,-97],[-285,-116],[-230,-6],[-98,53],[-250,-14],[-515,148],[-184,182]],[[58932,83793],[-170,-484],[130,-181]],[[56366,49038],[771,-14]],[[57137,49024],[3,1005]],[[57140,50029],[2,343]],[[57142,50372],[-785,12]],[[24496,23799],[-124,-7],[-89,-201],[-24,-426],[-234,524],[-130,-3],[-250,81],[-95,314],[-69,-46],[-83,245],[-143,195],[-169,44],[-146,133],[-157,-58]],[[22783,24594],[-10,18],[-370,-1005]],[[29682,26692],[358,120]],[[30040,26812],[248,69],[29,312],[103,17],[141,216]],[[30561,27426],[-65,703]],[[30496,28129],[-104,1125]],[[30392,29254],[-875,-246]],[[29517,29008],[99,-992],[-374,-108],[31,-318],[-353,-104],[17,-165],[-90,-84],[-663,-197],[79,-762]],[[95307,26961],[211,-345],[-59,-495],[-61,44]],[[95398,26165],[98,-142],[118,117]],[[95614,26140],[-30,119],[64,125],[44,-224]],[[95692,26160],[118,120],[36,139],[165,243],[2,304],[-68,51],[107,137],[193,33],[86,243],[9,187]],[[96340,27617],[-123,249],[10,173]],[[96227,28039],[-132,-8],[29,189],[-63,-8],[15,204],[-78,-23],[-38,129]],[[95960,28522],[-147,-457],[-75,-90],[-159,123],[-39,-132],[75,-211],[-82,-237],[-99,-88],[-127,-469]],[[62849,78479],[120,-7],[58,87]],[[63027,78559],[-6,92]],[[63021,78651],[38,156],[-24,278],[74,58],[127,-42],[-17,-131],[-101,-124],[125,-4],[67,243],[-35,234],[-102,165],[82,68],[196,-36],[142,-91],[95,368]],[[63688,79793],[42,30],[-160,324],[-27,223],[-133,66]],[[63410,80436],[-188,71],[-1,-56],[-225,16]],[[62996,80467],[-107,7]],[[62889,80474],[45,-50],[-53,-197],[30,-543],[-74,-309],[-77,-92],[-18,-141]],[[62742,79142],[19,-61],[-14,-417],[102,-185]],[[66994,20565],[-61,-1235]],[[66933,19330],[774,-114],[49,991]],[[67111,21089],[-128,-129],[86,-188],[-75,-207]],[[58111,54356],[0,226],[55,1]],[[58166,54583],[-1,934]],[[57178,55513],[-9,-1087]],[[44971,53775],[54,6]],[[45791,53856],[38,4]],[[45829,53860],[-45,1502]],[[45784,55362],[-863,-72]],[[44921,55290],[50,-1515]],[[63502,34098],[354,-30]],[[63856,34068],[816,-80]],[[64672,33988],[57,1185]],[[64729,35173],[-653,80]],[[64076,35253],[-125,-109],[-72,-196],[19,-173],[-103,-217]],[[63795,34558],[-126,-109],[-40,-106],[-128,-104],[1,-141]],[[64072,41297],[-9,-334]],[[64831,40892],[8,333],[194,-16],[18,428]],[[64974,41944],[-93,177],[-89,78],[-43,321],[-74,231],[-129,212]],[[64546,42963],[-426,25],[-9,-337]],[[83673,26525],[391,-19],[189,163],[209,106],[233,-248]],[[84808,27441],[-181,62],[44,343],[-157,49]],[[84514,27895],[-243,76],[-16,-163],[-285,97]],[[83970,27905],[-12,-189],[-76,15],[32,-378],[-145,50]],[[61051,12520],[125,4],[-11,109],[134,269],[120,-52],[-5,245],[116,-102],[91,67],[86,-86],[180,-71],[162,-261],[154,-163]],[[62300,15219],[-212,394],[-25,102],[-243,528],[-174,323],[-143,148],[-134,298],[-57,39],[-131,260]],[[14409,21015],[1487,701],[747,333]],[[16643,22049],[-242,1607],[-56,-24],[-145,976],[-19,-9],[-96,636],[916,387],[-332,2284],[-73,536]],[[16596,28442],[-685,-310],[-336,-135]],[[15575,27997],[-459,-198],[-946,-431]],[[14170,27368],[431,-2791],[-733,-349],[364,-2261],[25,12],[152,-964]],[[95368,28609],[111,14],[113,592]],[[95592,29215],[-93,200],[-84,-312],[-51,-295],[-35,41],[85,503],[-94,39],[2,118],[-97,21],[57,-491],[-9,-165],[95,-265]],[[95164,29555],[-30,-368],[40,-17],[41,273],[-51,112]],[[88119,23967],[-330,-1768]],[[87789,22199],[191,110],[316,-199]],[[88296,22110],[412,2136],[-72,607],[271,106]],[[88907,24959],[83,409],[-73,243],[35,271]],[[88952,25882],[56,179],[30,514]],[[89038,26575],[-201,-61],[-8,293],[-350,-195],[-38,206],[-111,55],[-13,-87]],[[88317,26786],[16,-9],[-112,-634],[152,-746],[-162,-61],[0,-184],[100,-138],[-192,-1047]],[[40597,54758],[1625,206]],[[42370,54983],[-84,1923]],[[42286,56906],[-70,-9],[-72,1713]],[[42144,58610],[-54,1215]],[[42090,59825],[-598,-78]],[[41492,59747],[46,-997],[33,-334],[-767,-103],[17,-339],[-382,-57],[8,-167]],[[40447,57750],[150,-2992]],[[56709,83116],[1044,-44]],[[57753,83072],[163,3],[20,1244]],[[57936,84319],[-32,26]],[[57904,84345],[-4,-159],[-98,121],[-171,94]],[[57631,84401],[-69,-110],[-376,186],[-79,-18],[138,-363],[28,-266],[-8,-241],[-118,-88],[-114,97],[-108,329],[-114,-8]],[[56811,83919],[-28,-162],[60,-192],[6,-210],[-140,-239]],[[18259,1540],[1221,552],[1677,718]],[[21157,2810],[-182,1271],[-48,-19],[-90,632],[37,15],[-276,1906],[-12,16]],[[20586,6631],[-186,-21]],[[20397,6536],[77,-190],[-64,-122],[-29,-378],[-132,-92],[-179,96],[-53,-75],[-102,215],[-87,-44],[-33,-115],[-127,1],[-231,143],[-43,-143],[48,-218],[-241,-42],[-91,66],[20,131],[-33,213]],[[18208,3350],[44,-153],[-99,-73],[-16,-173],[70,-92]],[[18207,2859],[151,-237],[-53,-225],[44,-285],[-39,-64],[12,-320],[-74,45],[-52,-164],[63,-69]],[[72510,66013],[77,-204],[53,83],[91,-106],[62,80],[62,244],[54,-27],[101,221]],[[73010,66304],[57,296],[-170,239],[4,116]],[[72901,66955],[-112,-21],[67,103],[-7,257],[-66,34],[67,160],[-71,203],[-88,-49],[-41,234],[-112,257]],[[72538,68133],[-24,-426],[-191,32],[-9,-167],[-65,12]],[[72088,66763],[-8,-141],[307,-184],[104,-214],[19,-211]],[[67300,33257],[192,-30],[-11,-223],[623,-83]],[[68104,32921],[-13,203],[56,470]],[[68147,33594],[-652,78]],[[67495,33672],[-172,29]],[[67323,33701],[-23,-444]],[[65604,29499],[-568,69]],[[65036,29568],[-49,-1300]],[[63011,20810],[582,-57]],[[63593,20753],[400,-44]],[[63993,20709],[14,322]],[[64007,21031],[47,1305]],[[63083,23113],[-32,-994]],[[25111,10251],[-25,64],[-170,13],[252,447],[15,186],[155,207],[122,75],[77,437],[72,101],[115,372],[26,304],[71,15],[39,165]],[[25860,12637],[-1295,-463],[-753,-278]],[[23812,11896],[41,-325]],[[24038,10115],[225,-1768]],[[24263,8347],[59,-471],[167,-137],[82,214],[67,-22],[79,247]],[[80026,55957],[235,-104],[231,-41]],[[80492,55812],[229,95],[161,170],[36,95]],[[80977,56938],[-42,122]],[[80935,57060],[-60,52],[-89,-77],[-196,78],[-96,-160],[-210,-140],[-202,-287]],[[80082,56526],[91,-436],[-147,-133]],[[46723,15939],[92,70],[21,-114],[190,-36],[121,175],[-28,173],[36,184]],[[47155,16391],[35,243],[76,183],[-22,168],[-64,70]],[[47180,17055],[-1267,-117]],[[45913,16938],[35,-987],[771,77],[4,-89]],[[54720,43176],[773,-4]],[[55493,43172],[113,53],[12,240],[137,227],[-38,260],[25,100],[103,17],[65,109]],[[55910,44178],[-53,0]],[[55857,44178],[-761,4]],[[55096,44182],[-377,0]],[[46707,42493],[945,74]],[[47652,42567],[-27,1343]],[[46701,43834],[-34,-4]],[[57172,80787],[375,-13],[-17,-137]],[[57530,80637],[911,-24]],[[58441,80613],[-87,385],[73,320],[-69,229],[7,158]],[[58372,82016],[-118,-102],[-112,88],[-78,-13],[-31,201],[-205,84],[-89,-57]],[[57739,82217],[-292,11],[-275,-1441]],[[69268,62407],[685,-93]],[[69953,62314],[692,-91]],[[70669,62221],[30,703],[-106,181],[35,53]],[[70628,63158],[-66,40],[-93,-162],[-150,10]],[[70319,63046],[-184,-97],[-320,278],[-40,112],[-186,45],[-166,-221],[-70,-234],[-168,-127],[-100,71]],[[69085,62873],[-109,-102],[-96,-270]],[[68880,62501],[-7,-46],[395,-48]],[[58159,57638],[374,-14]],[[58533,57624],[17,615],[84,123]],[[58634,58362],[-96,0],[3,280],[-32,1]],[[57327,59193],[-21,-230]],[[57306,58963],[-110,-1299]],[[64912,37517],[382,-47]],[[65294,37470],[769,-93]],[[65348,39149],[-13,-328],[-365,39]],[[72437,39982],[25,332]],[[72462,40314],[51,719]],[[72513,41033],[-225,41]],[[72288,41074],[-476,93]],[[71812,41167],[-6,-110]],[[71806,41057],[-41,-608]],[[71743,26523],[-71,-990],[-14,-333]],[[72042,30508],[-44,-670],[-402,77]],[[61318,53715],[39,1594]],[[61697,53188],[386,-14]],[[62409,55274],[-765,28]],[[64309,52808],[679,-62]],[[64988,52746],[6,170]],[[64994,52916],[23,215],[19,884],[-127,3]],[[64909,54018],[-584,49]],[[64697,75710],[902,-111],[25,-55]],[[65624,75544],[52,1407]],[[65676,76951],[-31,3]],[[64937,77029],[-33,-1004],[-197,19]],[[64707,76044],[-10,-334]],[[38482,64693],[54,-988],[813,125],[17,-332],[191,26],[17,-333],[382,56]],[[39956,63247],[-33,668],[327,48]],[[40250,63963],[-93,2007]],[[40157,65970],[-384,-58],[-18,337],[-1152,-195],[17,-336],[-195,-34]],[[38425,65684],[57,-991]],[[87468,55557],[53,-107]],[[88013,54717],[183,67],[166,154]],[[88362,54938],[99,478],[139,148],[-76,22],[-71,161],[22,389]],[[87964,56277],[-95,-248],[6,-81],[-211,-124],[-196,-267]],[[45405,16885],[508,53]],[[47180,17055],[39,332],[120,348],[-36,165],[85,303],[74,123],[135,-75],[-36,165]],[[47561,18416],[140,166],[-31,75],[61,157],[-56,103],[-26,294]],[[47649,19211],[-151,57],[-55,110],[-74,-76],[-72,44],[-159,-53],[-40,168],[-138,239]],[[46960,19700],[-35,-5],[10,-330],[-386,-36],[31,-986],[-644,-66],[12,-331],[-580,-60]],[[45368,17886],[37,-1001]],[[76588,36620],[826,-175]],[[77414,36445],[80,828]],[[77494,37273],[-166,43],[30,274]],[[77358,37590],[-485,108]],[[76699,37735],[-98,-983]],[[54677,60174],[383,3]],[[55156,60174],[1,504],[96,0],[1,671]],[[55254,61349],[-197,1],[-2,338],[-94,2],[0,335],[-190,0]],[[54771,62025],[-192,0],[0,-676],[-190,0],[1,-336]],[[83857,62817],[427,-785],[90,-9],[24,-182],[85,16],[41,-92]],[[84524,61765],[47,14]],[[84571,61779],[61,11],[119,198]],[[84751,61988],[-26,185],[137,304],[37,393],[61,155],[267,337],[104,34],[-7,108]],[[85324,63504],[-57,-46],[-246,230],[-264,-50],[-95,42],[-113,-85],[-100,27],[-84,-159],[-75,12]],[[84290,63475],[-128,35],[-75,-215]],[[84087,63295],[132,-200],[-217,-171]],[[84002,62924],[-145,-107]],[[80580,63518],[3,-172],[140,15],[91,-107],[186,114],[200,198],[123,-12]],[[81323,63554],[-113,806]],[[81210,64360],[-125,277]],[[81085,64637],[-352,-108],[-72,-84],[-72,-306],[-202,105]],[[80387,64244],[108,-480],[85,-246]],[[71043,51139],[85,-76],[13,-246],[141,-61],[-54,-368],[55,-78]],[[71283,50310],[469,573],[177,271]],[[71761,51981],[-118,16],[1,124],[-111,5],[-191,-186],[-33,133],[-72,-25],[-23,141]],[[71214,52189],[-96,-196],[-7,-165]],[[71111,51828],[31,21],[-127,-513],[28,-197]],[[68818,51259],[222,507],[111,115],[54,341]],[[69205,52222],[-316,660]],[[68889,52882],[-117,-85],[-41,-152],[-72,172]],[[68659,52817],[-139,-247]],[[68520,52570],[-62,-330],[56,-194],[97,-126],[51,-242]],[[74063,54404],[167,-257],[8,-153],[77,23],[113,-225]],[[74428,53792],[126,129],[163,-98],[117,279],[81,97]],[[74915,54199],[11,243],[-69,54],[-76,227],[-148,560]],[[74621,55285],[-338,20]],[[74283,55305],[-45,-24],[-61,-353],[18,-152],[-132,-372]],[[73297,48729],[498,-10]],[[73804,49520],[-27,225],[-84,153]],[[73693,49898],[-240,-155],[-346,-159]],[[73107,49584],[4,-452],[-115,-62]],[[72996,49070],[136,-115],[106,-28],[59,-198]],[[88942,58363],[-145,153]],[[87807,58109],[-115,-96]],[[75235,58885],[88,-119],[53,-190],[123,-259],[52,21],[2,-192],[53,-69],[15,-238],[91,48],[26,-89]],[[75738,57798],[199,315]],[[75937,58113],[39,176],[-25,180],[85,185],[-84,212]],[[75952,58866],[-121,-13],[-74,-118],[-123,-14],[-65,111],[-54,-111],[-171,114],[1,106]],[[75345,58941],[-110,-56]],[[51959,74320],[0,-31],[736,-305]],[[52695,73984],[269,825],[84,-83]],[[53048,74726],[329,1e3]],[[52972,76127],[-195,-596],[-457,442]],[[52320,75973],[-92,-167],[86,-208],[-85,4],[-105,-115],[43,-75],[-148,-154],[114,-162],[-80,-137],[-118,-41],[31,-264],[-46,-161],[39,-173]],[[86721,48290],[61,-73],[-93,-218],[13,-260]],[[86702,47739],[135,48],[100,-110],[87,38],[112,274],[310,158]],[[87446,48147],[130,142]],[[87576,48289],[-76,454]],[[87500,48743],[-39,131],[-200,-70],[-85,-207]],[[87176,48597],[-23,-268],[22,-136],[-94,-160],[-52,96],[-123,32],[33,75],[-111,51]],[[86828,48287],[-107,3]],[[79321,38418],[127,-30],[-18,-280],[247,-83]],[[79677,38025],[282,-73],[28,318],[96,-23],[13,165]],[[80096,38412],[13,168],[-95,23],[25,338],[-13,173]],[[79476,39228],[-37,-504],[-95,19],[-23,-325]],[[51855,11421],[1145,34]],[[53e3,11455],[39,308],[-23,383],[44,305],[-39,325]],[[53021,12776],[-1146,-36]],[[51291,12717],[9,-661],[-39,-2],[10,-658]],[[65034,22562],[592,-62]],[[65626,22500],[192,-27],[10,331],[388,-51]],[[66216,22753],[27,663],[66,-8],[10,334]],[[65799,24149],[-381,46]],[[61554,23897],[194,-10],[-7,-328]],[[61741,23559],[966,-82]],[[62764,25138],[-1150,103]],[[61614,25241],[-29,-1013],[-31,-331]],[[62767,83402],[275,-442],[157,-392],[294,-65]],[[63493,82503],[118,186],[85,263],[-19,196],[69,61],[266,35],[229,178]],[[64241,83422],[-4,216],[46,60]],[[64283,83698],[-153,142],[-30,-62],[-171,294],[0,219],[73,153]],[[64002,84444],[-181,193],[5,-135],[-66,28],[78,-227],[-76,-126],[-196,181],[-76,-258],[-67,34],[-54,-383],[-185,11],[39,-112],[4,-281],[-226,-36],[-222,177],[-12,-108]],[[12871,10199],[123,68],[118,-51]],[[13112,10216],[152,26],[252,529],[6,212],[52,305],[-26,426]],[[13548,11714],[-40,141],[-1,324]],[[13507,12179],[-254,-98]],[[13253,12081],[-136,-187],[19,-101],[-494,-250]],[[12642,11543],[156,-956],[73,-388]],[[16643,22049],[47,-324]],[[16690,21725],[187,82],[149,-969],[183,81]],[[19476,21553],[-147,1002],[-206,1479],[-7,99],[-227,1623],[19,8],[-330,2391],[31,13],[-148,1043]],[[18461,29211],[-803,-310],[-1004,-434]],[[16654,28467],[-58,-25]],[[50804,80229],[174,-613],[263,-453]],[[52217,79780],[84,66],[215,1071]],[[52516,80917],[-347,201]],[[52169,81118],[-67,-65]],[[52102,81053],[-272,-259],[-66,38],[-94,-105],[-344,261],[-142,-165],[-34,-284],[-167,-319],[-67,68],[-112,-59]],[[31400,37394],[1575,373]],[[32975,37767],[-102,1292]],[[32873,39059],[-125,-29],[-56,-97],[28,-391],[-64,-14],[21,-278],[-318,-76],[-21,257],[-165,156],[-45,-53],[4,-291],[-92,-19],[-170,77],[-123,-62],[-27,73],[-181,27],[-161,-219]],[[31378,38120],[-39,-25]],[[45384,85187],[98,-42],[9,-279],[65,-32],[35,-310],[21,-780]],[[45612,83744],[1140,93]],[[46702,85887],[-1088,-77]],[[45614,85810],[-200,-359],[-30,-264]],[[29185,35384],[144,55],[94,263],[-58,264],[94,65],[-96,250]],[[28616,37420],[-19,-206],[-120,-76]],[[28477,37138],[-45,-58],[-44,-354],[65,21],[-80,-272],[14,-450]],[[28387,36025],[19,-223],[185,-13],[105,160],[119,-77],[36,-103],[159,91],[117,-212],[58,-264]],[[88363,51100],[53,216]],[[88416,51316],[-100,-41],[-24,-130],[71,-45]],[[39530,44075],[0,0]],[[39319,44389],[2,-32]],[[39321,44357],[0,-8]],[[39321,44349],[144,-116],[140,192],[71,-116],[-93,-57],[70,-101],[-22,-172]],[[39631,43979],[701,117],[1297,183]],[[41596,44946],[-12,-2]],[[39975,44708],[-660,-106]],[[39315,44602],[4,-213]],[[73790,63132],[67,-190],[-7,-114],[58,-244],[-19,-277],[119,-611]],[[74008,61696],[178,-41]],[[74186,61655],[33,501],[113,-23],[21,304],[105,8]],[[74458,62445],[-31,190],[214,-41],[26,373]],[[74667,62967],[-25,142]],[[74572,63122],[-761,142]],[[73811,63264],[-21,-132]],[[69283,43245],[556,-90]],[[69839,43155],[17,329],[139,-20]],[[69995,43464],[50,1007]],[[70045,44471],[-316,41]],[[69729,44512],[-312,46]],[[69417,44558],[-32,-169],[8,-542],[-27,-154],[47,-119],[-148,-245],[18,-84]],[[72163,47481],[78,-40],[64,-269]],[[72494,47106],[20,302],[207,187],[20,277]],[[72741,47872],[-384,77],[-83,184]],[[72274,48133],[-69,-42],[-42,-610]],[[72168,53975],[-64,504]],[[72104,54479],[-169,193],[13,71],[-229,416]],[[71719,55159],[3,-121],[-328,-33],[-62,-194]],[[71332,54811],[-136,-430]],[[71196,54381],[69,-581],[-19,-128],[219,-76],[62,136],[114,-87]],[[59222,74015],[270,-11]],[[59492,74004],[81,1]],[[60032,74319],[100,349],[-36,182],[72,138],[-221,11],[-9,238],[-69,93],[-129,-37],[-11,-128]],[[59729,75165],[-100,-209],[-67,-3],[-194,-439],[58,-103],[-35,-191],[-126,-84],[-43,-121]],[[56677,27018],[137,106],[47,130],[229,104],[99,123],[82,225],[64,32]],[[57335,27738],[10,597]],[[62253,48894],[-14,-1373]],[[62239,47521],[-2,-343],[379,-10]],[[62616,47168],[255,-11]],[[62871,47157],[10,567]],[[62647,48837],[-135,12],[-84,135],[-163,-93]],[[62265,48891],[-12,3]],[[64963,59109],[589,-72]],[[65956,58986],[30,122],[142,231]],[[66128,59339],[-55,78],[-71,-71],[-88,67],[7,127],[110,143],[-133,66],[-52,180],[-110,84],[-54,-63],[-77,88],[-3,186],[65,129],[112,-66],[9,133],[-175,209],[95,172]],[[65708,60801],[-15,96],[-133,-164],[-88,56],[-15,128],[64,188],[-52,225]],[[65469,61330],[-8,17]],[[65461,61347],[-28,-238],[-92,0],[-35,128]],[[65306,61237],[-264,20]],[[65007,60251],[-44,-1142]],[[61586,57460],[53,-4]],[[61639,57456],[797,-62]],[[62436,57394],[395,-24]],[[62831,57370],[10,626],[-199,8],[9,337],[-224,5]],[[61596,58376],[-10,-916]],[[72875,63873],[97,-33],[362,-626],[138,-490],[57,-52],[41,-306],[72,-124]],[[73642,62242],[148,890]],[[73811,63264],[40,242]],[[73851,63506],[-104,178],[5,169],[-85,299],[-224,458],[-124,79],[11,171]],[[73330,64860],[-479,84]],[[72851,64944],[-61,-869],[85,-202]],[[57557,63693],[144,-113],[36,54],[213,-86],[0,-340],[-41,-33],[198,-138]],[[58107,63037],[0,170],[124,2],[0,106],[670,1]],[[58901,63316],[6,1058]],[[58510,64696],[0,-55],[-162,-42],[-545,-2],[0,-111],[-251,-3]],[[57552,64483],[5,-790]],[[9361,27484],[-174,-85],[54,-308],[-469,-244]],[[8772,26847],[34,-537],[-11,-560],[-44,-7],[-72,-226],[145,-348],[67,-409]],[[64819,33972],[713,-62]],[[65108,35122],[-379,51]],[[64672,33988],[147,-16]],[[70875,49025],[644,-108],[-7,-110]],[[71512,48807],[93,-16]],[[71605,48791],[30,279],[-59,6],[62,217],[-26,256],[-81,192]],[[71531,49741],[-79,-33],[11,111],[81,24],[-126,210],[-100,-42]],[[71318,50011],[-19,-329],[-192,30],[-11,-226],[-188,44]],[[70908,49530],[-33,-505]],[[71989,48741],[66,-13]],[[72055,48728],[51,48],[275,-54],[94,193],[-59,80],[21,167]],[[72437,49162],[-63,57],[-9,145],[-89,247]],[[72276,49611],[-102,-3],[-13,-287],[-68,-45],[-83,-200],[-21,-335]],[[81544,71229],[49,-8],[193,260],[32,136],[136,12],[81,-81],[31,86],[107,-6],[88,349],[86,9],[60,180],[61,-34],[47,146],[124,74]],[[82639,72352],[31,87],[106,-6],[21,276],[-51,276],[-44,-36]],[[82702,72949],[-3,-116],[-152,-161],[-102,-9],[-218,129],[-127,-194]],[[82100,72598],[-303,-176],[-268,-354],[3,-369],[-91,-10],[-69,-126]],[[81372,71563],[106,-155]],[[25663,28829],[-97,868]],[[25452,29695],[-67,-32],[-155,82],[-157,-304],[-136,-98],[-56,-119],[-145,-54],[-103,-167],[-117,-102]],[[89428,44235],[8,-522],[94,-153],[71,-213]],[[89601,43347],[62,375],[600,-193]],[[90263,43529],[106,344],[-80,288],[-402,194]],[[89887,44355],[-96,-44],[-81,157],[-91,-39],[-43,135],[-98,102]],[[89478,44666],[-101,-61],[51,-370]],[[66295,16772],[-31,414],[57,268],[93,-299],[199,-391],[147,-162],[-6,88],[-131,242],[-52,210],[152,-298],[198,-58]],[[66921,16786],[27,558],[82,-11],[16,326],[-191,30],[47,982]],[[66902,18671],[-867,118]],[[66035,18789],[-73,-1640],[194,-26],[-15,-329],[154,-22]],[[22123,43694],[1612,545]],[[23735,44239],[-45,395]],[[23690,44634],[-181,1608]],[[23509,46242],[-142,1286],[-94,775]],[[23273,48303],[-254,2291]],[[22952,51190],[-1237,-417],[4,-37],[-1698,-595],[-5,43],[-270,-99]],[[19746,50085],[572,-4560],[1524,540],[281,-2371]],[[90185,39143],[155,154]],[[90340,39297],[260,259],[41,381]],[[90641,39937],[-27,71],[13,285],[-37,55],[34,174]],[[90624,40522],[-194,11],[-10,-74],[-141,57],[-28,132],[-98,-203],[-210,-106],[-117,-189],[-126,-84]],[[89700,40066],[-46,-264],[75,-42],[167,-468],[308,285],[-19,-434]],[[73404,46488],[1,-72]],[[73405,46416],[126,-28],[91,-203],[76,-9],[120,-163]],[[73818,46013],[92,264],[-45,231]],[[73865,46508],[-462,83],[1,-103]],[[91294,34269],[48,-448]],[[91342,33821],[39,-345]],[[91381,33476],[79,308]],[[91460,33784],[-51,256]],[[91409,34040],[-69,250]],[[91340,34290],[-46,-21]],[[88035,18578],[30,152],[121,-45],[572,2850],[21,272]],[[88779,21807],[-483,303]],[[87789,22199],[-489,-289]],[[87300,21910],[-733,-456]],[[86567,21454],[47,-131],[45,-344],[314,-859],[331,-759],[240,-340],[118,-254],[99,-38],[110,-170],[164,19]],[[63711,75140],[443,-8],[329,105],[-16,160],[220,-24]],[[64687,75373],[10,337]],[[64707,76044],[-788,76]],[[63919,76120],[-3,-78],[-149,18],[-132,-154],[-39,-278]],[[63596,75628],[98,-92],[-192,4],[41,-315],[84,-41],[51,192],[33,-236]],[[54752,66727],[390,0]],[[56285,66715],[5,847]],[[56290,67562],[-137,-90],[-41,214],[-103,98]],[[56009,67784],[-181,56],[-254,-51],[-29,-198],[-370,228]],[[55175,67819],[-144,-4],[-71,-160],[-109,-124],[-1,-682],[-98,-122]],[[62623,44787],[764,-61],[-11,-339]],[[63376,44387],[39,13],[547,-46]],[[63962,44354],[-40,194]],[[63987,45579],[-42,252],[2,238]],[[63947,46069],[-552,38]],[[63395,46107],[-179,-173],[-117,-338],[-82,-20],[-57,-198]],[[62960,45378],[-111,-113],[-118,-202]],[[62470,39721],[703,-56]],[[63173,39665],[1,10]],[[63174,39675],[15,121],[-21,440],[-58,70],[-153,386],[-13,447]],[[62944,41139],[-288,-195],[-24,-73],[-199,-139]],[[40107,10102],[1236,211]],[[41343,10313],[321,51],[-18,326],[194,31],[-17,328],[867,131]],[[42690,11180],[-70,1485]],[[40907,12130],[-46,-94],[-409,-102],[-48,105],[-53,-68],[-120,3],[-166,169],[-143,32]],[[39922,12175],[48,-787],[58,11],[79,-1297]],[[78436,62707],[207,-555]],[[78643,62152],[16,-41]],[[78659,62111],[7,-19]],[[78666,62092],[80,-211],[496,-692]],[[79661,62392],[-686,1239]],[[78975,63631],[-28,-218],[-56,-73]],[[78891,63340],[-53,-186],[-80,-76],[-78,-344],[-46,-73],[-198,46]],[[41821,28416],[2189,283],[-21,218],[-74,100],[-127,301]],[[43788,29318],[-41,113],[-110,-83],[-58,209],[-112,36],[-21,494]],[[41750,29853],[5,-98]],[[41755,29755],[66,-1339]],[[65431,61426],[30,-79]],[[65469,61330],[21,42],[475,-18],[1,-67],[133,-29],[2,76],[128,36]],[[66229,61370],[37,1466]],[[66266,62836],[-145,17]],[[66121,62853],[-1060,113]],[[65061,62966],[25,-181],[152,43],[52,-359],[60,-68],[72,60],[62,-100],[-102,-171],[75,-99],[-51,-149],[-96,-8],[-27,-152],[98,-44],[50,-312]],[[89470,35374],[234,-496],[71,-90],[91,-341]],[[89866,34447],[131,129],[174,23]],[[90171,34599],[86,503],[-63,342],[-41,-31],[127,311]],[[90280,35724],[-96,67],[27,115],[-108,70],[38,109],[-141,74]],[[9e4,36159],[-64,-195],[-159,-14],[-43,-138],[-40,-328],[-64,-77],[-101,54],[-59,-87]],[[82893,52504],[48,38],[12,-197],[432,39],[184,-321]],[[83569,52063],[-8,1233]],[[82967,53468],[-52,-432],[-88,-240],[-21,-209],[87,-83]],[[89098,49267],[93,7],[90,-113]],[[89281,49161],[43,114],[-19,335],[-139,96]],[[89166,49706],[-128,-143],[-3,-225]],[[36620,7749],[1557,328]],[[38177,8077],[-23,327],[-39,-8],[-90,1293],[5,225],[-86,-46],[-18,133],[-65,-13],[-22,327],[61,12],[-24,335],[-162,-34],[-24,326],[-51,-11],[-93,1309],[-15,-3],[-48,673]],[[36102,13039],[-61,49],[-249,-260],[-73,26],[-146,-72],[-77,-133],[-66,1],[-7,-142],[-145,-234]],[[35278,12274],[60,-707],[393,100],[47,-259],[256,113],[70,-913],[34,8],[65,-847],[90,105],[42,-546],[40,9],[49,-652],[89,20],[49,-642],[33,8],[25,-322]],[[79545,72787],[200,-318],[56,-149],[68,-10]],[[79869,72310],[178,-198]],[[80047,72112],[101,15],[9,-81]],[[80157,72046],[98,-13]],[[80255,72033],[41,487],[-164,39],[36,486]],[[80168,73045],[12,145],[-199,48]],[[30209,31172],[183,-1918]],[[30496,28129],[368,107],[-28,299],[377,100]],[[31213,28635],[-52,410],[-119,1318],[-58,-15],[-23,262],[53,15],[-90,994],[76,20],[-56,651],[544,146],[246,85]],[[31734,32521],[-80,916],[5,91],[-145,1633]],[[31514,35161],[-1635,-438]],[[29879,34723],[148,-1604]],[[30027,33119],[182,-1947]],[[69302,70169],[37,-169],[194,-6],[25,-123],[105,-69],[50,-150],[179,-177]],[[69892,69475],[36,521],[225,-35],[-7,43]],[[70146,70004],[-58,120],[43,105],[-79,96],[-95,260],[47,200],[-98,198],[118,22],[-34,157],[64,-20],[-17,318],[152,152],[-94,39],[-35,228]],[[70060,71879],[-78,-18]],[[69982,71861],[-95,-218],[69,-120],[-133,-25],[-226,184],[-53,-95],[31,-302],[-41,55],[-75,-325],[63,-23],[-162,-279],[-111,-262],[58,-36],[-5,-246]],[[58516,65912],[26,629],[192,4],[5,673]],[[58739,67218],[-2,1006],[-232,-3]],[[58502,68221],[-26,-214],[-154,-300],[-34,-202],[22,-114],[-58,-253],[9,-352],[-48,-251],[-255,4]],[[57958,66539],[-26,-296],[-1,-332],[585,1]],[[82884,45469],[205,94],[142,328],[298,88]],[[83529,45979],[-112,559],[-26,250],[-74,21],[-39,153]],[[83278,46962],[-93,-44],[-255,-12],[-172,-127]],[[87156,47258],[128,-386],[-4,-130],[111,32]],[[87391,46774],[59,18],[122,336],[149,205],[147,78],[67,-44],[300,442],[-8,149]],[[88227,47958],[-60,-109],[-94,108],[23,-171],[-219,105],[-269,-149]],[[87608,47742],[9,-143],[-131,64],[-4,-99],[-100,24],[4,-112],[-107,35],[-37,-149],[-86,-104]],[[62419,17032],[80,-64],[-1,145],[-79,-81]],[[61572,17981],[62,-11],[453,-451],[64,74],[191,-186],[95,-207],[81,31],[125,-111],[141,251],[-65,254],[-124,266],[56,211],[-91,165],[-48,239],[39,42]],[[62551,18548],[55,1639]],[[61635,20261],[-63,-2280]],[[62361,29518],[557,-49]],[[62918,29469],[767,-75],[193,-41]],[[63878,29353],[12,346]],[[63890,29699],[14,334]],[[63345,30592],[-866,79]],[[62479,30671],[-49,-130],[20,-166]],[[62450,30375],[-47,-182],[14,-134],[-62,-117],[6,-424]],[[51710,36749],[-3,671]],[[51707,37420],[-8,832]],[[55910,44178],[176,351],[108,38],[24,92],[154,30],[75,-125]],[[56447,44564],[109,32],[-22,108],[114,154]],[[56648,44858],[-83,120],[23,117],[73,-54],[-24,179],[-122,-71],[-25,229],[-96,83],[-43,194]],[[56351,45655],[-76,-20],[-30,-122],[-383,4]],[[55862,45517],[-5,-1339]],[[14974,41976],[421,179],[189,-1314],[55,-323],[-189,-76],[50,-345],[211,-425],[295,116]],[[16006,39788],[1485,611]],[[17491,40399],[-592,54],[-42,303],[619,2015]],[[15929,44436],[-955,-2460]],[[69019,57227],[287,53],[181,-180],[219,-30]],[[69706,57070],[15,98],[132,7]],[[69853,57175],[-1,333],[-62,284]],[[69790,57792],[-38,-71],[-137,7],[-67,-73],[-184,-58],[-62,57],[-206,-11]],[[53159,89277],[-22,211]],[[53473,87605],[112,-49],[17,72],[293,14],[57,-102],[-10,213],[159,-3]],[[54101,87750],[1,124],[-111,962]],[[53991,88836],[-128,277],[-375,358],[-174,220],[-263,395]],[[53106,89783],[69,-187],[110,-5],[270,-388],[313,-186],[-24,-289],[-254,247],[-78,129],[-125,17],[-50,-353],[-112,-17]],[[53225,88751],[-43,-139],[-48,64],[-151,-296]],[[52983,88380],[-7,-161],[-69,-144],[152,-182],[258,-128],[156,-160]],[[73851,63506],[153,893]],[[74129,65172],[71,439]],[[74200,65611],[-174,61],[-60,71]],[[73966,65743],[-2,-56],[-387,24]],[[73577,65711],[-1,-80],[-137,-404],[-83,-26],[-26,-341]],[[36603,17320],[62,67]],[[36665,17387],[45,288],[113,246],[-12,164],[113,246],[16,226],[61,69],[-30,263],[-76,231]],[[36895,19120],[-252,-53],[-15,219],[-192,-41],[-153,300],[-255,-55],[-33,438],[-34,-7],[-76,1004],[-191,-42],[-9,110],[-191,-42],[-8,110],[-510,-129]],[[34976,20932],[-82,-19],[15,-223],[-94,-22],[-56,-125],[57,-321],[-103,82]],[[34713,20304],[-74,-294],[88,-1045],[-32,-8],[49,-655]],[[50914,40072],[-2,685]],[[50912,40757],[-10,656]],[[47899,32964],[101,155],[266,155],[174,26],[133,139],[164,27]],[[48737,33466],[-23,1140],[20,1],[-28,1340]],[[48706,35947],[-40,-3]],[[47874,35889],[35,-1335],[-26,-3],[35,-1335],[-19,-252]],[[34682,61644],[54,349],[546,107],[74,-125],[463,98],[24,133]],[[35727,63854],[-155,-97],[-460,-376],[-195,-225],[-579,-113]],[[34338,63043],[99,-1450],[245,51]],[[37316,58593],[672,117],[411,312],[140,231],[38,-60],[460,28],[680,120]],[[39717,59341],[624,84],[84,-67],[384,1521],[156,24],[-6,125]],[[40959,61028],[-27,572],[-397,-61],[4,-84],[-506,400]],[[40033,61855],[14,-283],[-1381,-215],[-720,-119],[-38,670]],[[37143,61778],[132,-2324],[41,-861]],[[82378,54815],[-6,-77]],[[83185,55486],[-307,26],[11,114],[-205,60],[-105,122]],[[82579,55808],[-155,-307],[-52,77]],[[86853,56023],[429,-141]],[[87282,55882],[61,613],[60,197]],[[87435,57431],[-89,154],[-79,-81],[-212,-5],[-51,85],[-159,-6]],[[86845,57578],[-147,-84],[-149,-204]],[[86549,57290],[19,-114],[227,-213],[-31,-254],[89,-686]],[[85673,59341],[177,-116],[476,-152],[67,-41]],[[86393,59032],[98,136],[138,285],[150,203],[59,229],[111,155]],[[86949,60040],[17,171],[160,118],[-115,296]],[[87011,60625],[-128,166],[-203,27],[-438,-223],[-280,119],[-88,-63]],[[85874,60651],[34,-71],[-53,-232],[26,-66],[23,-442],[-106,-152],[-125,-347]],[[30836,14280],[180,51],[31,-327],[384,105],[196,13],[27,-288],[117,34],[-16,312],[115,34],[117,126],[66,246],[146,159],[-14,173],[142,118]],[[32327,15036],[31,207],[87,26],[-12,122],[128,266],[144,-18],[64,93],[97,-119]],[[32689,17456],[-12,136]],[[32677,17592],[-193,-79],[-573,-155]],[[31911,17358],[-426,-115]],[[74977,51781],[130,24],[28,-264]],[[75135,51541],[145,61],[118,-54]],[[75562,52303],[-126,181],[8,145],[-63,26],[-36,348]],[[75345,53003],[-423,-600]],[[74922,52403],[55,-622]],[[79808,62645],[140,166],[26,102],[164,79],[284,303]],[[80422,63295],[158,223]],[[80387,64244],[-68,50]],[[80319,64294],[-7,-116],[-280,89],[-80,-114],[-111,189],[-68,-343]],[[79773,63999],[95,-196],[26,-282],[-66,-240],[-88,-105],[-70,-236],[138,-295]],[[70461,50895],[130,-83],[141,-227]],[[70732,50585],[129,311],[61,67],[121,-81],[0,257]],[[71111,51828],[-338,-238]],[[70773,51590],[0,-209],[-75,-178],[-102,29],[-49,-272],[-93,64],[7,-129]],[[73902,52280],[51,-4],[-25,-512]],[[73928,51764],[250,1],[84,-81]],[[74262,51684],[-1,316],[27,151],[241,211],[46,225],[-9,241]],[[74566,52828],[-284,532]],[[74282,53360],[-90,72],[-177,-290]],[[74015,53142],[-43,-267],[-203,-168]],[[73769,52707],[41,-295],[92,-132]],[[74418,50434],[48,-561]],[[74466,49873],[330,179],[101,340]],[[74897,50392],[-83,45],[50,133],[-101,153]],[[74763,50723],[-68,173],[-144,-203],[44,-70],[-109,-64],[-68,56]],[[74418,50615],[0,-181]],[[79461,58900],[235,-73],[333,458],[22,269]],[[80051,59554],[-445,78]],[[79361,59708],[-16,-337],[116,-471]],[[79283,55968],[133,-5],[45,157],[88,-20]],[[79549,56100],[106,356],[-28,87],[59,161],[103,94]],[[79789,56798],[-98,251],[-91,29],[-51,124]],[[79549,57202],[-69,-392],[-70,-110],[-38,-202],[-130,80],[-64,-149],[-60,74],[-43,-202],[-110,73]],[[78965,56374],[96,-190],[185,-106],[37,-110]],[[89499,51318],[332,-121]],[[89831,51197],[444,-162]],[[90275,51035],[176,697],[139,447]],[[90590,52179],[-35,29]],[[90555,52208],[-62,-206],[-64,-56],[8,-135],[-71,-277],[-116,-219],[-162,12],[-8,-122],[-91,93],[63,182],[120,119],[64,-57],[30,241],[333,861],[20,151],[-144,-162],[-9,-123],[-142,-283],[-70,-20]],[[90254,52207],[5,-119],[-214,-216],[-110,49],[-108,-228],[-328,-375]],[[81740,51070],[208,-217],[72,-142]],[[82020,50711],[165,-252],[119,73]],[[82304,50532],[18,123],[148,252],[65,452]],[[82535,51359],[-171,184],[-90,250],[-149,61],[-57,107],[-83,-46],[-40,115]],[[87176,48597],[-122,8],[-101,-266],[-119,29],[-6,-81]],[[20900,11527],[-60,-7],[17,438],[-42,121]],[[20815,12079],[-17,-25]],[[20798,12054],[-134,-107],[-115,56],[-114,-112],[-264,254],[-75,324],[-135,157],[-62,-25],[-64,215],[-170,111],[-171,-22],[-128,127]],[[19366,13032],[-81,-136],[-140,-125],[-72,-180],[45,-145],[1,-216],[51,-236],[30,-315],[-149,-433],[-39,-277]],[[50818,66139],[1056,38]],[[51869,67017],[-7,668]],[[51862,67685],[-64,-64],[14,-153],[-80,-109],[-100,-24],[-54,149],[-220,339],[-59,30],[-204,-163]],[[51095,67690],[63,-377],[-47,-67],[-103,43],[-111,-51],[-53,-307],[56,-174],[-89,-48]],[[79588,54521],[78,-253],[163,-222]],[[79829,54046],[316,-73]],[[80145,53973],[-45,105]],[[80100,54078],[-32,250],[41,195],[-36,333]],[[80073,54856],[50,207],[-153,-53],[-102,116],[-91,209]],[[79777,55335],[-19,92]],[[79758,55427],[-95,-66],[-50,-165],[-111,-104],[157,-450],[-71,-121]],[[74524,59942],[70,-237],[108,72],[79,-227],[-39,-199],[141,-37],[-9,-470],[21,-106],[80,25],[-18,-242]],[[74957,58521],[105,172],[94,-38],[16,242]],[[75172,58897],[-155,510],[-138,357],[-59,349]],[[74820,60113],[-139,270]],[[74681,60383],[-79,-276],[-97,-45],[19,-120]],[[50044,28915],[192,10]],[[50228,30599],[-812,-47]],[[52701,72893],[91,4]],[[52792,72897],[952,27]],[[53744,72924],[49,71],[-13,173],[62,184],[79,88],[-33,202]],[[53888,73642],[129,116]],[[54017,73758],[-969,968]],[[52695,73984],[6,-1091]],[[51095,67690],[-22,1627]],[[50254,69286],[17,-1421]],[[50271,67865],[15,-953]],[[83627,49065],[141,-214],[86,-551],[50,-88],[106,7]],[[84010,48219],[55,-60],[129,101],[30,219],[150,50],[213,529],[50,-9]],[[84419,49560],[-96,164]],[[84323,49724],[-62,6],[-140,-222]],[[84121,49508],[-82,-134],[-54,63],[-167,-62],[-83,-239],[-108,-71]],[[35583,50175],[212,22],[44,172],[120,154],[135,73],[-10,146]],[[35220,52174],[75,-965],[-37,-9],[82,-1007],[128,-62],[115,44]],[[79995,69006],[62,-74],[-50,-118],[182,-141]],[[80189,68673],[200,74],[124,-66]],[[80513,68681],[164,540],[170,176]],[[80847,69397],[-31,273]],[[80816,69670],[-99,-58],[-114,183],[-46,348],[-97,343],[51,115]],[[80511,70601],[-79,115],[-138,42],[-122,-209]],[[80172,70549],[23,-343],[-216,-147],[-300,-6]],[[79679,70053],[148,-113],[-70,-164],[220,-319],[-76,-126],[74,-153],[20,-172]],[[65565,43089],[-60,-113],[-84,4],[-106,120],[-252,25],[-123,-43],[-37,135]],[[64903,43217],[-116,41],[-114,163],[-257,53],[-55,-229],[-70,-25]],[[64291,43220],[143,-132],[89,7],[23,-132]],[[53862,32977],[1104,2]],[[54966,32979],[0,1340]],[[53920,34315],[22,-48],[-84,-316],[-151,-196],[-3,-240],[146,-317],[12,-221]],[[51573,52879],[191,1],[1,-680]],[[51765,52200],[959,19]],[[52724,52219],[-13,1687]],[[52711,53906],[-1149,-25]],[[51562,53881],[11,-1002]],[[73210,48224],[58,-26],[169,-379]],[[73595,47743],[135,147],[-36,168],[90,-26],[44,285],[148,52],[-23,109],[56,116]],[[73297,48729],[-84,-161],[-50,-207],[47,-137]],[[65806,81494],[-22,441],[41,548],[60,158],[147,152],[-101,495]],[[65931,83288],[-229,19],[-58,-247],[-115,-54],[-93,-131],[-13,-131],[-101,-134]],[[65322,82610],[-33,-489],[168,-92],[76,-199],[146,-272],[127,-64]],[[70319,63046],[19,346],[-21,191],[-90,150],[-48,236]],[[70179,63969],[-1113,107]],[[69066,64076],[19,-1203]],[[22427,68031],[2086,629]],[[24513,68660],[1173,338],[759,232],[4,-37],[1309,341]],[[27758,69534],[-30,329]],[[27728,69863],[-54,675],[-184,1968]],[[25670,73199],[-2624,-2596],[-809,-811]],[[22237,69792],[190,-1761]],[[29892,65646],[40,-140],[129,-35],[97,-94],[43,-141],[550,129]],[[30751,65365],[-176,2171]],[[30443,69178],[-109,1338]],[[30334,70516],[-124,-28]],[[30210,70488],[-176,-442],[70,-397],[-39,-422],[-103,-416],[-28,-9],[-225,-968],[183,-2188]],[[62956,62797],[60,-186],[-13,-117],[75,-331],[-104,-448],[143,-161],[14,-121]],[[63131,61433],[169,-40],[13,340],[382,-21]],[[63714,62506],[12,567],[-189,11]],[[63150,63463],[-6,-536],[-177,15],[-11,-145]],[[86500,89682],[160,625],[70,853],[20,950]],[[86750,92110],[-260,48],[-195,-50],[7,79],[-1163,328]],[[85139,92515],[-154,-1533],[-75,-807]],[[81775,74118],[51,-287],[51,-10],[58,-222]],[[81935,73599],[165,257],[224,110],[331,58]],[[82655,74024],[-14,346],[-39,4],[-78,298],[-58,25],[1,455],[-43,12]],[[82424,75164],[-271,-241],[19,-96],[-134,83],[-108,-27],[-167,-140]],[[81763,74743],[-12,-121],[24,-504]],[[59598,40593],[768,-44]],[[60392,41735],[-128,13]],[[60264,41748],[-644,57]],[[62686,33644],[384,-34],[-3,-114]],[[63067,33496],[292,106],[105,270],[38,226]],[[63795,34558],[-313,28],[10,337],[-381,33]],[[73361,54232],[390,-24]],[[73751,54208],[-69,119],[116,146]],[[73798,54473],[-27,433],[-57,471]],[[73714,55377],[-246,76]],[[73137,54741],[144,-219],[80,-290]],[[62533,82267],[23,-141]],[[62556,82126],[145,11],[112,82],[171,-313],[127,38],[126,284],[179,-15],[37,-98],[228,-22]],[[63681,82093],[192,-18],[90,123]],[[63963,82198],[-53,211]],[[63910,82409],[-417,94]],[[62767,83402],[-42,-76],[50,-138],[46,49],[-9,-195],[-114,-18],[-92,81],[-68,-59]],[[62472,83979],[171,-172],[155,9],[269,254],[-98,125],[-2,132],[-151,54],[-366,-331],[22,-71]],[[68669,47607],[641,-105]],[[69310,47502],[80,274],[-23,319],[-121,134],[-80,396]],[[69166,48625],[-450,60]],[[87982,44174],[146,245],[139,56],[141,240]],[[88408,44715],[45,106],[76,-100],[55,40],[-25,155],[44,149],[147,260],[-22,81],[67,277],[-202,-174],[-56,-197],[-49,47],[12,188],[-105,-78],[-64,-187],[-76,-80],[-151,-26],[-212,65],[-28,-163],[-111,-255]],[[87753,44823],[-56,-81],[66,-233],[44,-311],[175,-24]],[[63753,79823],[76,-221],[775,-122]],[[64604,79480],[-110,278]],[[64494,79758],[-40,143],[-96,118],[44,304],[-41,167],[116,354],[90,74]],[[64567,80918],[-184,16],[-62,97]],[[64321,81031],[-233,14]],[[64088,81045],[-64,-74],[-118,9],[66,-371],[-36,-317],[-100,77],[28,-120],[-44,-137],[-95,-75],[28,-214]],[[60465,75985],[669,-41],[-5,-336],[485,-29]],[[61614,75579],[37,143],[-48,224],[47,15],[-63,298],[150,108],[-23,70],[88,131],[1,156],[154,57]],[[61957,76781],[-820,388],[-51,13],[-95,-235],[-29,-255]],[[60962,76692],[-163,-296],[-200,-91],[4,-138],[-117,-71],[-21,-111]],[[70108,29495],[-117,-382],[-48,-254],[11,-130],[93,-282],[33,-286]],[[53959,41159],[1056,3]],[[55015,41162],[-92,200],[78,210],[90,69],[64,194],[-24,92]],[[55131,41927],[5,219],[89,18]],[[55225,42164],[-601,3]],[[53956,42165],[3,-1006]],[[66666,33795],[657,-94]],[[67495,33672],[63,1311]],[[67558,34983],[-64,9]],[[67494,34992],[-574,81]],[[66728,35099],[-62,-1304]],[[49534,44033],[578,30]],[[50112,44063],[376,17]],[[50488,44080],[-27,1677]],[[50461,45757],[-920,-48]],[[67494,34992],[17,335],[-42,7],[16,308]],[[67485,35642],[49,1004]],[[35600,67894],[1140,207],[-17,328],[754,126],[-37,665]],[[37440,69220],[-36,652],[-68,-11],[-100,1695],[937,147]],[[38173,71703],[-101,1991]],[[38072,73694],[-133,-21]],[[37939,73673],[-959,-159],[-1067,-194]],[[35913,73320],[-711,-127]],[[35202,73193],[235,-3655],[67,11],[23,-361]],[[70732,50585],[73,-10],[-29,-190],[17,-181],[-78,-176],[12,-243]],[[70727,49785],[-11,-168],[196,-29],[-4,-58]],[[71318,50011],[54,124],[-23,145],[-66,30]],[[69310,47502],[1,-214]],[[69311,47288],[9,19],[484,-72],[-1,-24]],[[70047,47187],[-73,266],[-103,134],[-48,-36],[-9,390],[-31,112],[56,223],[37,330]],[[69876,48606],[-95,149],[-99,-113],[-94,80],[-90,-13]],[[69498,48709],[-47,154],[-136,38],[-36,162],[-243,177]],[[69036,49240],[-4,-234],[136,-145],[-2,-236]],[[80162,33015],[286,-310],[257,-381],[40,-212],[100,55],[187,-296],[250,-320]],[[81282,31551],[105,1028],[244,-74]],[[81631,32505],[56,566]],[[81687,33071],[-1478,430]],[[80209,33501],[-47,-486]],[[83713,67648],[186,-27],[277,52],[-29,-211],[115,-81],[18,-165],[-191,-237],[27,-82]],[[84116,66897],[106,100],[75,-66],[117,355],[109,-72],[-14,130],[87,185],[102,-209],[31,-203],[112,-120],[-2,-182],[148,-442],[16,-121],[141,-183],[54,33],[84,-285],[49,-26]],[[85331,65791],[198,174],[159,26],[-32,105]],[[85656,66096],[-63,98],[-23,332],[-119,4],[-105,85],[-85,-108],[-96,142],[-44,253],[87,17],[5,107],[-198,277],[-40,185],[-206,258],[-81,-103],[-66,150],[119,41],[-12,201],[-149,218],[-35,141],[-140,51],[-122,132],[-50,165],[-46,-48],[-117,184]],[[84070,68878],[-21,-46],[-115,150],[-135,-142],[42,-121],[-30,-297],[-64,-47],[-21,-170],[-66,-79],[59,-295],[-6,-183]],[[81208,59346],[515,-83]],[[81723,59263],[39,398],[169,-291],[62,104]],[[81993,59474],[16,229],[107,312],[29,312],[-46,116]],[[81088,60643],[-100,-393],[-20,-307],[134,-121],[-16,-339],[52,-124]],[[82197,69242],[424,-880],[150,215],[-8,177],[111,51],[47,-166]],[[82921,68639],[92,226],[15,290],[45,105],[-29,248],[41,57],[-67,274],[-83,-3],[-7,204],[-134,15],[41,137],[-28,131],[48,142],[95,87],[24,111],[138,185]],[[83112,70848],[2,176]],[[83114,71024],[-79,-6],[-170,-185],[-108,71],[-103,-78],[-27,-271],[-66,-129]],[[82561,70426],[29,-244],[-217,-519],[15,-117],[-191,-304]],[[90313,31098],[145,-223],[34,95],[214,4],[-30,-119],[149,79],[157,-100]],[[90982,30834],[-35,294],[67,291]],[[91014,31419],[79,143],[-19,285]],[[91074,31847],[-317,847]],[[90757,32694],[-248,-143]],[[90509,32551],[-609,-368]],[[89900,32183],[-131,-216]],[[89769,31967],[-31,-260],[443,-214],[73,-310],[59,-85]],[[91905,23858],[228,33],[206,-141],[184,-68]],[[92523,23682],[11,279]],[[92534,23961],[53,142],[-17,265],[59,150],[-25,163],[-83,104],[6,275],[58,278],[178,247]],[[92010,25858],[-88,-706],[-138,46],[-84,-705],[205,-71],[-49,-571],[49,7]],[[31709,73322],[-129,1713],[-1587,-359]],[[29993,74676],[341,-4160]],[[31117,60856],[1038,242],[103,-1328],[1317,295],[12,-165],[190,39],[-13,168],[574,114]],[[34338,60221],[126,27],[52,344]],[[34516,60592],[166,1052]],[[34338,63043],[-948,-194]],[[33390,62849],[-2391,-540]],[[30999,62309],[118,-1453]],[[80453,50719],[-6,-135],[130,-234]],[[80577,50350],[18,-259],[102,-115],[74,16]],[[80771,49992],[464,495]],[[81235,50487],[-25,186],[72,125],[-77,146],[-131,122]],[[81074,51066],[-2,-36],[-223,153],[-181,219]],[[80668,51402],[-274,-328]],[[80433,41247],[42,-66],[-41,-143],[85,-65],[-5,-465]],[[80514,40508],[365,-36]],[[80879,40472],[20,207]],[[80459,41745],[-66,-109],[50,-191],[-10,-198]],[[72700,71898],[120,-109],[60,-143],[126,-130],[97,210],[125,-14],[154,80],[41,-61]],[[73423,71731],[79,310],[149,211]],[[73651,72252],[-125,31],[-19,88],[52,761]],[[73559,73132],[22,318],[-368,70]],[[73213,73520],[-207,42],[-22,-325],[-193,32]],[[72555,72176],[62,-248],[83,-30]],[[72514,65397],[188,-358],[154,-40],[-5,-55]],[[73577,65711],[5,128],[-198,-49],[-95,73],[9,140],[-129,-8],[-36,199],[-123,110]],[[72510,66013],[-81,16],[58,-190],[-12,-208],[39,-234]],[[69059,64535],[7,-459]],[[70179,63969],[52,1007]],[[70039,64996],[-986,90]],[[69053,65086],[6,-551]],[[15565,88139],[10,1163]],[[15575,89302],[-181,4],[20,698]],[[14445,89986],[-442,-30],[3,-116],[-134,-12],[-4,117],[-536,-59],[-38,229],[-139,98],[-43,344],[-67,-9],[-11,232],[-67,-10],[-43,344],[-66,-10],[-13,231],[-90,-14],[-13,232],[-66,-11],[-43,344],[-140,93],[-42,343],[-66,-12],[-15,215]],[[12370,92525],[-16,14]],[[12354,92539],[-117,-22],[2,117]],[[12239,92634],[-19,96],[-164,122],[-65,-154],[79,-145],[12,-260],[-80,-424],[52,-138],[108,-127],[-113,-637],[-84,-319],[-48,23],[-19,190],[-80,-6],[-160,138],[-230,33],[-171,-99],[-7,-258],[-68,-89],[-93,-324],[-95,-85],[-51,-143],[78,-106],[-157,-17],[179,-244],[5,-205],[-40,-74]],[[10033,90043],[198,78],[97,-139],[133,6],[96,-81],[10,159],[78,-4],[46,160],[9,450],[-177,9],[-80,127],[-69,-160],[-79,-22],[-242,-381],[-20,-202]],[[7988,88764],[78,-103],[-11,129],[204,374],[-177,-152],[-94,-248]],[[41821,28416],[56,-1099]],[[42836,27452],[1697,214],[1,-241],[61,-97],[-11,-127],[54,-325],[70,-92],[-1,-228],[136,-54],[89,105],[83,-23],[129,-246],[59,-22]],[[45203,26316],[-34,639],[-49,1336]],[[45120,28291],[-19,-2],[-40,1095],[-27,72],[-168,-64]],[[44866,29392],[-60,45],[-1018,-119]],[[50464,23921],[1157,62]],[[51621,23983],[-5,333]],[[51598,26313],[-1154,-58]],[[50443,25248],[21,-1327]],[[53429,32299],[570,8]],[[53999,32307],[-91,128],[15,348],[-61,194]],[[54007,34586],[-91,30],[-49,-126],[-118,40],[-46,-76]],[[53703,34454],[-10,-107],[-119,-217],[39,-146],[-65,-81],[-121,-22],[-6,-123]],[[53421,33758],[8,-1459]],[[82921,68639],[64,-187]],[[82985,68452],[127,78],[179,-19],[35,204],[83,99],[134,23],[41,131],[126,135]],[[83710,69103],[-5,97],[128,241],[-42,287],[-178,228],[-119,103],[-24,-133],[-142,-94],[-84,152],[99,72],[108,165],[-76,241],[-263,386]],[[77434,57428],[21,-27],[5,-414],[52,-314]],[[77512,56673],[-32,-145],[43,-111],[81,70],[0,-208]],[[77604,56279],[-4,94],[135,109],[416,587]],[[78151,57069],[18,278],[-85,335]],[[78084,57682],[-46,80],[-159,-23],[-136,127],[-37,145],[-120,85]],[[77586,58096],[-37,15],[-44,-309],[36,-104],[-107,-270]],[[89071,36209],[89,-308],[102,-232]],[[89262,35669],[189,-355]],[[89451,35314],[19,60]],[[9e4,36159],[146,127],[65,152],[135,86],[113,213]],[[90459,36737],[-84,150],[-69,4],[-46,194],[-167,195]],[[90093,37280],[-19,-268],[-92,-41]],[[89982,36971],[-911,-762]],[[52082,31943],[-9,1219]],[[52073,33162],[-227,0],[-87,-76],[-77,36],[-23,159],[-103,179],[-138,16],[-189,-295]],[[51229,33181],[60,-114],[-8,-158],[53,-243],[-32,-106],[10,-331],[57,-309]],[[69853,57175],[378,28],[28,-42]],[[70259,57161],[240,27],[-59,228],[17,141],[75,123],[-24,90],[-8,408]],[[70500,58178],[-19,354]],[[70481,58532],[-597,-38]],[[69884,58494],[-37,-85],[-1,-302],[-56,-315]],[[55114,55765],[467,-3]],[[55581,55762],[203,-2]],[[55784,55760],[0,218],[-42,0],[5,1333]],[[55747,57311],[-672,4]],[[55075,57315],[-2,-1329],[41,0],[0,-221]],[[53768,71892],[414,1],[0,-106]],[[54594,73650],[-706,-8]],[[53744,72924],[13,0],[11,-1032]],[[47409,66203],[401,534],[219,-8],[188,179],[137,-106]],[[48354,66802],[-21,968]],[[95783,18652],[176,-17],[30,-254],[166,33]],[[96155,18414],[10,382],[-26,78],[186,-13],[38,298],[-35,153],[112,218]],[[96440,19530],[-37,341],[-132,220],[-94,-243]],[[96177,19848],[2,-150],[-70,-173],[12,-319],[-94,177],[-74,23],[-124,-182]],[[95829,19224],[-36,-44],[-10,-528]],[[53191,69608],[833,39]],[[54024,69647],[0,218],[165,-41]],[[54183,71249],[-409,-6]],[[53774,71243],[-609,-27]],[[53165,71216],[26,-1608]],[[50072,76134],[-53,-155],[-334,73]],[[47681,76412],[127,198],[-48,113],[95,121],[46,-92]],[[47901,76752],[-37,1551]],[[41927,75581],[849,101]],[[42724,77849],[-167,-23]],[[42557,77826],[-72,-169],[11,-247],[-129,-243],[-143,-88],[-175,-246],[-155,177],[-24,-59]],[[41870,76951],[57,-1370]],[[38173,71703],[18,3],[93,-1694],[1907,279]],[[40191,70291],[-81,1697],[170,24],[-95,1999]],[[40185,74011],[-483,-68]],[[39702,73943],[-84,-12]],[[39618,73931],[-1546,-237]],[[61673,51613],[96,-3],[119,-169],[458,-34],[-7,-396]],[[62339,51011],[167,-9]],[[62506,51002],[16,-1],[32,1402]],[[58107,63037],[1,-168],[196,3],[1,-282]],[[58305,62590],[0,-67],[196,0],[1,-346],[193,16],[0,-451],[108,248],[70,-44]],[[58873,61946],[71,-120],[137,78],[120,-100],[60,41],[104,-124],[33,384],[158,-59],[62,51]],[[59656,62134],[4,404],[-321,3],[-127,277],[-242,-1],[-78,55],[9,444]],[[58563,45942],[18,1225]],[[58581,47167],[-140,-27],[-252,251],[45,-153],[-115,6],[9,143],[-138,47]],[[57990,47434],[-187,-239]],[[57803,47195],[-8,-956]],[[15108,45816],[1611,651]],[[17614,48775],[1809,4656]],[[19423,53431],[276,709]],[[16211,52872],[-509,-206],[-151,-25]],[[15551,52641],[43,-275],[45,0],[18,-478],[-37,-91],[-2,-514],[35,-66],[-48,-218],[-6,-294],[75,-172],[-69,-223],[22,-177],[-96,-50],[-33,-202],[31,-141],[-69,-190],[43,-150],[-103,-400],[62,-30],[-24,-165]],[[82009,37591],[-189,-1904]],[[81820,35687],[88,450],[117,31],[-17,174],[543,-242],[98,-192]],[[82704,36436],[54,514],[-292,1051]],[[82466,38001],[-76,42],[-122,-116],[-75,-232],[-147,-155],[-36,51]],[[80698,57902],[1032,-194]],[[81771,57915],[20,350]],[[81791,58265],[-900,165]],[[80696,57918],[2,-16]],[[78084,57682],[43,195],[52,-35],[81,240]],[[78260,58082],[87,228],[53,-65],[105,210],[-30,382],[112,161]],[[78313,59573],[-85,-70],[-62,-189],[-300,-402],[-96,-77]],[[77770,58835],[43,-159],[-112,-354],[30,-89],[-139,-64]],[[77592,58169],[-6,-73]],[[76605,56569],[45,-177],[-23,-250],[41,-286]],[[76668,55856],[123,-118],[113,30],[55,-112],[86,-2],[7,-151],[92,-22]],[[77337,55508],[77,394]],[[77414,55902],[-54,115],[-78,-115],[-191,350],[-18,173]],[[77073,56425],[-133,2],[-160,182],[27,149],[-87,-60],[25,167]],[[76745,56865],[-140,-296]],[[83730,33410],[-7,-56],[352,-118]],[[84075,33236],[309,459],[100,-30]],[[84484,33665],[47,406],[-108,625]],[[84423,34696],[-241,25]],[[84182,34721],[-35,-353],[-32,10],[-34,-307],[-271,86],[-80,-747]],[[53236,32296],[193,3]],[[53421,33758],[-164,-116],[-93,49],[-29,-154],[-55,-5]],[[53080,33532],[-188,-44],[-47,-108]],[[52845,33380],[8,-1089]],[[87992,34657],[214,-309],[176,-209],[-83,-135],[-16,-163],[104,-190],[74,8]],[[88461,33659],[316,415],[-111,183],[230,453]],[[88896,34710],[-208,186]],[[88688,34896],[-132,117],[-87,169]],[[88469,35182],[-249,-227],[-228,-298]],[[83138,60179],[708,-175]],[[83846,60004],[20,155],[121,238],[156,140],[-17,459]],[[84126,60996],[-83,184],[-291,80],[-390,605]],[[83362,61865],[-81,-212],[-38,-268],[-99,-164],[-90,-240]],[[83054,60981],[-58,-159],[-292,-534]],[[82704,60288],[434,-109]],[[82881,66625],[471,-731],[54,198],[113,54],[120,-32]],[[83639,66114],[78,208],[67,45],[-47,144],[104,84],[275,302]],[[83713,67648],[19,-113],[-94,-324],[36,-231],[-172,-75],[-211,85],[-162,-133],[-92,-181],[-156,-51]],[[59392,45214],[314,-28],[383,5]],[[60089,45191],[287,-9],[2,338]],[[60378,45520],[-3,1115]],[[60375,46635],[-144,-76],[-92,458]],[[60139,47017],[-80,21],[-112,-230],[-4,-113],[-109,3],[-86,-82],[-57,-182]],[[59691,46434],[-24,-123],[-163,-91],[-31,-121],[-61,49],[-35,-223],[27,-118],[-25,-253]],[[90382,17556],[529,-235],[451,-160]],[[91362,17161],[129,635],[-42,223]],[[90997,18798],[-185,7],[-332,-144]],[[90480,18661],[-72,-163],[49,-224],[-20,-327],[-96,-121],[41,-270]],[[82845,33605],[0,-2]],[[82845,33603],[229,-66],[539,-199],[13,104],[104,-32]],[[84182,34721],[-681,127],[13,138],[-96,91]],[[82731,34747],[-30,-314],[37,-128],[177,8],[-70,-708]],[[88838,47754],[48,-100],[88,0]],[[88974,47654],[14,84],[122,-56],[77,211],[41,224],[-17,309],[-131,-166],[-133,-95]],[[88947,48165],[-83,-48],[-26,-363]],[[60587,50062],[225,-2]],[[60812,50060],[159,-1],[-1,325],[215,0],[61,54],[96,-56]],[[61342,50382],[1,167]],[[61343,50549],[9,504],[28,-1],[6,560]],[[61001,51619],[-191,7],[-148,-332],[-19,-231],[-64,1],[-1,-160],[-97,-29]],[[60481,50875],[0,-488],[98,-5],[8,-320]],[[39287,16453],[388,68],[-7,109],[328,57],[-20,331],[64,10],[-19,330],[129,22],[-13,220],[59,121],[322,57],[-6,111],[390,67],[6,-110],[194,32],[9,-165],[192,30]],[[41303,17743],[-26,496],[-266,-43],[-34,641],[30,5],[-36,671]],[[40971,19513],[-83,-13],[-74,1329],[-66,-11]],[[40748,20818],[-1877,-331]],[[38871,20487],[83,-1323],[59,10],[80,-1313],[53,9],[82,-1317],[56,-45]],[[40748,20818],[-100,1653],[-80,-13],[-74,1340]],[[40494,23798],[-61,-10]],[[40433,23788],[-1314,-228],[-176,-3]],[[38943,23557],[-375,-70]],[[38568,23487],[45,-707],[-25,-5]],[[38588,22775],[41,-654],[69,13],[107,-1659],[66,12]],[[69123,53349],[363,-486],[164,-125],[196,-349]],[[70021,53053],[-71,330],[-58,-1],[-7,197],[126,232],[-8,154]],[[70003,53965],[-62,106],[-201,56],[-54,87],[-291,-125]],[[69395,54089],[-155,-154],[-81,-167],[-14,-201],[-82,-97],[60,-121]],[[68425,18153],[145,-171],[63,17],[57,199],[104,100],[105,-3],[35,-159],[80,-4],[66,130],[9,-230],[-49,-167],[83,-78],[45,96],[-19,186],[98,70],[160,-365],[177,-133],[302,-416],[64,59],[351,-200]],[[70345,17786],[-768,133],[39,660],[-385,61],[38,662]],[[69269,19302],[-773,127]],[[68496,19429],[-71,-1276]],[[77369,49388],[52,-154],[218,75],[181,158],[226,90]],[[78046,49557],[-92,129],[54,99],[40,391]],[[78048,50176],[-224,-86],[-222,259],[-73,-33]],[[77529,50316],[-42,-296],[-75,-74],[-38,-151]],[[77374,49795],[58,-222],[-63,-185]],[[67533,43783],[889,-128]],[[68409,44408],[-163,41],[5,111],[-694,100]],[[67557,44660],[-27,-539]],[[77581,51134],[45,54]],[[77626,51188],[170,36],[9,202],[89,-79],[50,49],[39,402],[80,70]],[[78063,51868],[-34,62]],[[78029,51930],[-150,47],[-249,434],[-44,-80]],[[77586,52331],[-101,-55],[-30,-104],[-85,34],[-19,-351],[-46,-274]],[[77305,51581],[-34,-195],[105,-294],[60,64],[145,-22]],[[51776,51187],[574,16]],[[52728,51544],[-4,675]],[[51765,52200],[11,-1013]],[[64797,48393],[-70,202],[60,233]],[[64673,49336],[-114,-251],[21,-218],[77,-249],[140,-225]],[[83924,38347],[207,90],[114,132],[-2,-227],[267,151],[29,-228]],[[84539,38265],[66,266],[193,171]],[[84798,38702],[-87,337],[54,91],[-78,635],[-20,313],[-94,433]],[[83857,40737],[45,-408],[-105,-882],[33,-61],[65,-700]],[[55862,45517],[-382,4]],[[55097,45523],[-1,-1341]],[[59396,69243],[1,-1345],[19,0],[0,-508]],[[59416,67390],[153,-8]],[[59569,67382],[97,185],[63,240],[132,55],[75,107],[72,-63],[68,145]],[[60076,68051],[0,1248]],[[60076,69299],[-194,1],[1,57],[-268,-3]],[[59615,69354],[-219,0],[0,-111]],[[59352,65913],[3,337],[-38,153],[109,17],[-21,301],[47,310],[105,239],[12,112]],[[59416,67390],[-131,59],[-165,-57],[-58,-87],[-187,-84],[-136,-3]],[[87228,49461],[49,-57]],[[87277,49404],[20,-23]],[[87297,49381],[44,-44]],[[87341,49337],[100,156],[-107,137]],[[87334,49630],[-103,-30],[-3,-139]],[[63395,46107],[256,324],[121,214],[12,104]],[[63784,46749],[-790,59],[6,341],[-129,8]],[[62616,47168],[-69,-675]],[[62547,46493],[-52,-506],[422,-606],[43,-3]],[[64801,47513],[-219,25],[6,293]],[[64588,47831],[-306,-140]],[[64282,47691],[-143,50],[-66,-128],[-73,-473]],[[64e3,47140],[42,-240],[63,-62],[87,60],[298,-27],[-8,-195],[192,-22],[-7,-126],[94,-24]],[[83182,64735],[76,-296],[157,-49],[-29,-196],[218,-132],[26,-77],[457,-690]],[[84290,63475],[-47,274],[-126,235],[56,165],[-148,920]],[[84025,65069],[-85,96],[14,114],[-129,55]],[[83825,65334],[-237,119],[-166,-134],[-38,-175],[-102,-104]],[[83282,65040],[-100,-305]],[[78459,54466],[22,286],[-142,283],[45,82]],[[78353,55208],[-184,225],[-46,-14],[-121,191],[-40,-14],[-129,284],[-99,130]],[[77734,56010],[-174,-361],[-78,220],[-68,33]],[[68005,59551],[61,-144],[700,-67]],[[68766,59340],[18,802],[-79,321],[22,406]],[[68727,60869],[-214,46]],[[84126,60996],[55,163],[69,-147],[88,93],[-32,210],[80,142],[55,-35],[0,166],[83,177]],[[83857,62817],[-183,-241],[69,-160],[-74,-320],[-87,-138],[-19,-151],[-104,195],[-96,-129]],[[83363,61873],[-1,-8]],[[88563,37508],[242,-503]],[[88805,37005],[248,45],[77,198],[120,53],[27,135],[55,-57],[113,82]],[[89445,37461],[-118,330],[33,21],[-125,208],[-90,309],[23,137]],[[89168,38466],[-105,103],[-90,179],[-72,272]],[[88901,39020],[-578,213]],[[84571,61779],[204,-1325]],[[84775,60454],[809,1013]],[[85584,61467],[-84,205]],[[85500,61672],[-96,-104],[-61,144],[-169,-2],[-137,-74],[-187,98],[-99,254]],[[82086,34764],[127,-39],[-19,-188],[318,-76],[36,377]],[[81820,35687],[-8,-6]],[[66099,20334],[108,87],[14,-111],[150,-29],[151,144],[51,-69],[138,136],[74,-56],[209,129]],[[66550,21390],[-390,51],[-42,-988],[-19,-119]],[[81937,33878],[908,-273]],[[81126,75521],[96,-25],[17,-255],[245,45]],[[81484,75286],[59,17],[5,246],[48,48],[-28,194],[44,-2],[10,343]],[[81622,76132],[-92,-3],[-29,197],[-98,-7],[-5,510],[114,328],[6,326],[-25,457]],[[81493,77940],[-228,71],[-97,-230],[-3,-234],[-85,-210],[32,-99]],[[81112,77238],[54,-849],[-56,-12],[-461,98],[-60,-831],[537,-123]],[[37079,54189],[35,430],[-40,281],[-17,633],[17,711],[-64,418],[-146,87],[-43,104],[342,319],[185,538],[346,399]],[[37694,58109],[-76,138],[-112,-42],[-55,73],[-100,-99]],[[37351,58179],[9,-87],[-632,-110],[13,277],[-341,-63]],[[36400,58196],[4,-137]],[[36404,58059],[11,-134],[-1137,-208],[56,-834],[-744,-141],[-566,-138]],[[34024,56604],[86,-1225],[84,-986],[40,-114],[274,-223],[22,-217],[66,-149]],[[58420,74206],[172,-5],[168,-229],[21,-150],[104,-188],[146,87],[89,-9],[101,180],[1,123]],[[59729,75165],[-160,79],[3,263]],[[59572,75507],[-828,39]],[[58744,75546],[-59,-186],[-130,-123],[-69,-210]],[[85283,53972],[54,547],[103,51]],[[85440,54570],[39,173],[77,24],[-11,200],[-59,186],[-82,-10],[-20,244],[-135,38]],[[85249,55425],[-192,79]],[[31439,56872],[909,210],[1612,362]],[[33960,57444],[564,124],[-150,2220],[-36,433]],[[31117,60856],[322,-3984]],[[86520,39875],[363,-124]],[[86883,39751],[354,-127]],[[87237,39624],[-33,878],[-25,180],[67,399]],[[87246,41081],[-153,-1],[-88,83],[-136,-27],[-105,97]],[[86764,41233],[34,-576],[-182,-245],[-163,-58],[79,-399],[-12,-80]],[[89327,39227],[17,88]],[[89344,39315],[-17,-88]],[[89168,38466],[161,-44],[155,66]],[[89484,38488],[9,27]],[[89493,38515],[-65,137],[-46,332]],[[89382,38984],[-112,180],[-15,218],[98,102],[-10,332],[190,377]],[[89533,40193],[-93,260],[-128,119],[-161,35]],[[89151,40607],[-50,-301]],[[89101,40306],[-170,-1045],[-30,-241]],[[44477,43614],[1085,115]],[[45562,43729],[-61,1671]],[[44418,45289],[1,-23]],[[80255,72033],[230,81],[39,-55],[133,80]],[[80657,72139],[158,14],[200,230]],[[81015,72383],[-140,244],[99,1147]],[[80974,73774],[-42,11],[-154,-192]],[[80778,73593],[-32,-86],[-225,-199],[-205,-108],[-100,-165],[-48,10]],[[72690,70572],[683,-127]],[[73373,70445],[237,-41],[-41,304],[52,107],[40,591]],[[73661,71406],[-5,176],[-149,5],[-84,144]],[[72700,71898],[-70,-1137]],[[32026,49693],[383,90],[11,-54],[970,224],[60,300],[392,-54],[200,359]],[[34042,50558],[-36,199],[-174,63],[-19,218]],[[52912,9721],[1223,21]],[[54157,11464],[-1159,-15]],[[52998,11449],[84,-333],[16,-208],[-55,-153],[-56,-475],[-91,-438],[16,-121]],[[57681,78692],[623,-272]],[[58475,78280],[243,-100]],[[58718,78180],[97,805],[-33,2701]],[[58441,80613],[-43,-188],[70,-296],[-74,-137],[-65,9],[-44,-384],[-60,-25],[-53,-507],[-78,-135],[-5,-186],[-79,-105],[-246,59],[-83,-26]],[[85345,63572],[66,179],[96,103],[98,-71]],[[85605,63783],[112,129],[104,329],[179,-57]],[[86e3,64184],[-115,382],[-73,434],[-10,489],[18,309],[-88,217],[-76,81]],[[85331,65791],[-57,-47],[-400,-174]],[[84874,65570],[-13,-121],[65,-157],[53,-295],[234,-590],[-24,-69],[24,-370],[132,-396]],[[55015,41162],[-22,-316],[56,-139]],[[55767,40703],[2,667],[25,1],[-4,569]],[[55790,41940],[-659,-13]],[[64041,43772],[128,-139],[6,-154],[116,-259]],[[64903,43217],[30,795]],[[64933,44012],[4,112]],[[64937,44124],[-1e3,88]],[[63937,44212],[73,-186],[31,-254]],[[91566,21208],[30,117],[553,121],[434,78]],[[92583,21524],[-115,320],[15,400]],[[92483,22244],[-63,131],[5,248],[44,119],[15,443],[55,173],[-16,324]],[[91905,23858],[-24,-163],[-77,27]],[[91804,23722],[-22,-174],[45,-151],[118,53],[-11,-448],[-115,-56],[-23,-372],[25,6],[37,-393],[-204,-48],[10,-350],[-22,-68],[-138,-4],[-12,-68],[-114,173]],[[91378,21822],[-17,-183],[104,-155],[40,146],[61,-422]],[[45867,13636],[1359,129]],[[47809,13820],[-19,658],[-132,-12],[-39,1315]],[[47619,15781],[-116,-11],[-19,647],[-329,-26]],[[46723,15939],[-131,-116],[-16,-291],[-57,-136],[-48,-290],[110,-180],[-80,-139],[-329,95],[-98,-48],[-167,142],[-117,-46],[-103,-135],[-102,-20],[-5,-124],[-190,7],[-66,-42]],[[45324,14616],[-83,-199],[18,-389],[-38,-102],[48,-106],[-108,-85],[-82,155]],[[45079,13890],[13,-340],[775,86]],[[87282,55882],[29,-2],[157,-323]],[[67174,53803],[31,-132],[347,-50]],[[67552,53621],[418,632],[16,352]],[[67986,54605],[-131,-24]],[[67855,54581],[-125,-147],[-183,-65],[-137,-155],[-221,-119]],[[67189,54095],[-15,-292]],[[89237,45112],[-16,112]],[[89221,45224],[-69,50],[-33,-297],[63,-66],[55,201]],[[89042,43507],[54,-99],[39,-337]],[[89555,43069],[46,278]],[[89428,44235],[-82,81],[-48,386],[-93,-197],[63,-102],[-88,-166],[-48,296],[50,76],[-10,156],[-58,-21],[-93,113],[-56,-22],[-146,-251],[-261,-586],[118,-87],[-75,-232],[-1,-159],[64,-98],[51,68],[61,-111],[22,113],[244,15]],[[23254,7628],[602,230],[7,-52],[190,71],[-50,375],[260,95]],[[22959,9893],[295,-2265]],[[93381,29855],[79,172],[179,-87],[83,354],[-200,135],[100,111],[129,362]],[[93751,30902],[-63,100],[-115,-18],[-126,147]],[[93447,31131],[-165,-225],[-27,-211],[-95,-166],[-141,120],[-95,-578]],[[92924,30071],[35,-209],[325,-216],[97,209]],[[71151,35930],[447,-75]],[[71904,37046],[-671,127]],[[71223,37007],[-72,-1077]],[[44289,48960],[12,-317]],[[44240,50319],[0,-24]],[[44240,50295],[49,-1335]],[[63962,44354],[-25,-142]],[[64937,44124],[38,594],[127,603],[1,141]],[[64715,45510],[-252,27]],[[75745,53679],[95,-148],[132,16],[48,-241],[84,-90]],[[76104,53216],[106,86],[68,-56],[257,246],[91,-6]],[[76626,53486],[30,192],[-164,232],[-46,142],[-120,104],[-25,210],[-103,260]],[[58062,40667],[768,-36]],[[58848,41857],[-366,25]],[[58482,41882],[-406,30]],[[77298,49237],[58,-181],[140,-278],[-82,-223]],[[77414,48555],[118,-87],[86,-229]],[[77618,48239],[101,0],[56,-109],[145,-51],[23,68]],[[77943,48147],[13,292],[-56,37],[58,161],[133,162],[81,252],[95,40],[-43,164]],[[78224,49255],[-147,2],[-31,300]],[[77369,49388],[-71,-151]],[[81759,43250],[239,-91],[197,-260]],[[82195,42899],[96,179],[75,41]],[[82007,44333],[45,-122],[-29,-235],[-123,33],[-86,-170],[-110,-67]],[[81704,43772],[-17,-222],[72,-300]],[[91462,26996],[14,-940]],[[91476,26056],[386,-143]],[[92037,26572],[19,56],[18,627],[-91,2],[37,222],[109,19]],[[92129,27498],[26,237],[9,418],[-60,7],[87,393]],[[92191,28553],[-700,253]],[[91491,28806],[-16,7]],[[91475,28813],[-37,-130],[24,-1687]],[[61420,47562],[819,-41]],[[62253,48894],[-137,-3],[-56,89],[-200,120],[-109,242],[-110,109]],[[61641,49451],[-96,61],[-182,-83],[-94,-231]],[[61269,49198],[1,-275],[131,-395],[-51,-193],[34,-772],[36,-1]],[[54025,23926],[266,86],[283,270]],[[54574,24282],[105,94]],[[54679,24376],[89,209],[246,423],[32,144],[107,50]],[[55153,25202],[-1,171],[-174,-1],[-2,331],[-954,-3]],[[54022,25700],[1,-659]],[[54023,25041],[2,-1115]],[[86405,47745],[157,39],[140,-45]],[[86721,48290],[-201,-118],[-102,44],[-30,-89],[-139,-109],[-80,7],[7,207],[-213,-59]],[[85775,47877],[100,-647]],[[31213,28635],[20,-214],[375,100],[29,-330],[458,119],[38,-328]],[[32133,27982],[474,125],[-31,370],[95,23],[18,222],[-47,163],[35,389],[119,354],[-10,273],[80,28],[146,312],[46,-14],[50,330],[105,251],[164,304],[-17,164],[100,26],[-75,992],[42,9],[-53,648]],[[33374,32951],[-812,-197],[-828,-233]],[[28296,32645],[979,274]],[[29275,32919],[38,213],[-60,115],[-31,230],[64,157],[5,548],[33,79],[-60,142],[-54,324],[-67,88],[-83,292]],[[29060,35107],[-307,-63],[-65,143],[-224,-153],[-18,-114]],[[28446,34920],[-38,-144],[68,-35],[-81,-331],[-65,55],[-12,-505],[-41,-159],[107,-338],[-45,-288],[-89,-273],[-44,-280]],[[25191,4391],[1222,445],[700,237]],[[24827,7293],[133,-1058]],[[80500,80244],[127,-172],[-1,-188],[86,-120]],[[80712,79764],[219,15]],[[80931,79779],[49,126],[123,3],[133,105],[156,-58],[114,18],[63,189],[60,12],[64,207]],[[81693,80381],[80,935]],[[81773,81316],[9,118],[-258,138],[-54,-230],[-377,90]],[[81093,81432],[-287,89],[-20,-217],[-189,54],[-9,-111]],[[80588,81247],[-88,-1003]],[[74897,50392],[37,-101],[82,32],[-35,-160],[75,22]],[[75056,50185],[109,-121],[23,152],[132,-37],[192,60]],[[75512,50239],[-60,169],[86,28],[-21,261],[32,254],[-58,112],[85,278]],[[75135,51541],[-226,-544],[-146,-274]],[[51152,85015],[414,-1031]],[[51566,83984],[68,75],[548,-574]],[[52182,83485],[360,548],[-24,58]],[[52321,85018],[-737,1031]],[[51584,86049],[-221,-435]],[[49429,33227],[171,-135],[327,-182],[105,200],[79,-4],[209,172],[87,-17],[117,118],[196,61],[77,-33],[180,63]],[[50977,33470],[-18,1247],[9,1]],[[49430,35985],[-20,-2]],[[49410,35983],[28,-1332],[-18,-2],[25,-1337],[-16,-85]],[[86417,55250],[32,160],[118,136]],[[86567,55546],[69,112],[104,333],[113,32]],[[86549,57290],[-173,185],[-146,12],[-104,-174]],[[86126,57313],[7,-75],[-298,-539],[-94,-60]],[[85741,56639],[341,-825],[335,-564]],[[62938,38681],[1062,-76]],[[64025,39618],[-578,37]],[[63447,39655],[-273,20]],[[63173,39665],[-77,-313],[-88,-32],[-129,-279],[59,-360]],[[61061,30484],[563,-42]],[[61624,30442],[193,-14]],[[61817,30428],[52,1606]],[[61097,32088],[-12,-500]],[[67218,61037],[-186,17],[3,138]],[[67035,61192],[-524,40]],[[66511,61232],[-14,-553],[-64,-124]],[[66433,60555],[56,-63],[-7,-338],[60,-257],[-25,-68],[59,-227],[83,10]],[[82737,41088],[141,-44]],[[82878,41044],[778,-244]],[[83520,41816],[-100,289],[-162,253],[-23,116]],[[83235,42474],[-169,299],[-70,211],[-75,66]],[[82921,43050],[-184,-1962]],[[82256,41232],[481,-144]],[[82921,43050],[4,43]],[[82195,42899],[-51,-518]],[[82144,42381],[-26,-173],[132,-594],[6,-382]],[[65543,16515],[56,-268],[181,-234],[152,-286],[122,-94],[87,-164]],[[66141,15469],[324,-45],[16,327],[108,-16]],[[66589,15735],[-19,247],[-149,276],[-13,192],[-113,322]],[[66035,18789],[-480,64]],[[65555,18853],[-40,-990],[192,-22],[-14,-325],[-105,14],[-45,-1015]],[[65708,60801],[60,-174],[195,-288],[168,54],[73,-89],[78,124],[151,127]],[[66511,61232],[-120,7],[-162,131]],[[65431,61426],[-79,-98],[-29,139],[-80,-25],[63,-205]],[[73666,31508],[332,-74]],[[73998,31434],[71,671],[56,667]],[[73378,32939],[-98,-1328]],[[52711,53906],[-3,1839]],[[52708,55745],[-556,-11]],[[52152,55734],[-601,-18]],[[51551,55716],[8,-1496]],[[51559,54220],[3,-339]],[[76690,46998],[212,-76],[37,-190],[106,-157]],[[77045,46575],[42,77],[-69,215],[16,141],[-136,387]],[[76898,47395],[-98,324],[37,331],[-184,120]],[[76653,48170],[-145,-267],[-66,72]],[[76442,47975],[-28,-60],[-208,-79],[-51,-264],[-80,-73]],[[76075,47499],[5,-336],[-44,-90]],[[76036,47073],[38,-192],[156,-108],[99,85],[179,25],[143,208],[39,-93]],[[58932,83793],[1,44],[-317,3],[-256,140],[-424,339]],[[57753,83072],[-14,-855]],[[54e3,37692],[535,5]],[[54535,37697],[44,117],[-35,120],[58,182],[-25,105],[71,147],[43,-124],[52,132]],[[54842,38822],[-653,-9]],[[54189,38813],[1,-168],[-64,-1],[-96,-168],[-30,-169],[0,-615]],[[15557,11917],[679,324],[742,341],[1065,477]],[[18043,13059],[-118,756]],[[17925,13815],[-211,0]],[[16684,13651],[-66,55],[-276,49],[-109,70]],[[16233,13825],[-33,-76],[-218,-66],[-93,108],[-81,-24],[-10,-262],[-164,-210],[-160,-44]],[[15474,13251],[-108,-160]],[[15366,13091],[5,-177],[-100,-96],[151,-965],[135,64]],[[62066,46452],[-16,-1003],[-12,-225]],[[62547,46493],[-480,16],[-1,-57]],[[39545,33547],[-58,1315],[-102,1655]],[[39385,36517],[-76,1247],[-67,1278]],[[39242,39042],[-746,-123],[-774,-142]],[[37505,38731],[94,-1518],[421,78],[30,-578],[124,-2072],[85,-1326]],[[84485,47114],[86,-159],[-31,-168],[33,-325]],[[84573,46462],[139,-256],[-20,-61]],[[85234,46341],[294,113]],[[85414,46980],[-230,897]],[[85184,47877],[0,138],[-194,85],[-42,102]],[[84948,48202],[-75,6],[-12,-170],[-376,-924]],[[58581,47167],[100,-15],[83,-152],[158,107],[116,-23],[21,-269]],[[59059,46815],[-12,1352]],[[59046,48222],[-581,-12],[-2,113],[-479,-16]],[[57984,48307],[6,-873]],[[61343,50549],[298,-8],[659,-48]],[[62300,50493],[14,520],[25,-2]],[[61342,50382],[-1,-137],[132,-129],[-96,-231],[214,-27],[57,-133],[-7,-274]],[[62265,48891],[35,1602]],[[58512,29293],[-192,9]],[[58320,29302],[-19,-1335]],[[42735,10258],[1729,235]],[[44464,10493],[-14,328]],[[44450,10821],[-28,656],[87,9],[-41,941]],[[44468,12427],[-214,-81],[-145,3],[-55,-60],[-144,24],[-83,150],[24,115],[-227,116],[-71,-51],[-115,99],[-113,-213],[56,-106],[-184,-157],[-105,96],[44,112],[-62,85],[-52,-78],[-36,243],[-80,-91],[-27,157],[-79,53],[-66,-122],[-63,60],[-51,-116]],[[42690,11180],[45,-922]],[[85171,49447],[171,214],[76,-64]],[[85804,49362],[37,270]],[[85841,49632],[60,673]],[[85901,50305],[-55,83],[-147,37],[-136,148]],[[85563,50573],[-67,-1],[-142,-211],[-59,57],[-128,-170],[-86,-10],[0,-177]],[[88708,40456],[202,-13],[94,-116],[97,-21]],[[89151,40607],[31,189]],[[89182,40796],[-146,8],[-160,135],[-78,-2],[-103,179],[38,174],[-91,252],[-63,75]],[[88579,41617],[-72,59],[26,289],[-66,-51],[-13,-241],[-101,-179],[45,-474],[49,-295],[82,-187],[151,-15],[28,-67]],[[63341,43046],[-7,-352]],[[64041,43772],[-158,40],[6,-85],[-135,-178],[-36,-193],[-369,32]],[[63349,43388],[-8,-342]],[[86334,41905],[429,-670]],[[86763,41235],[-25,59],[127,241],[108,19],[124,144],[118,245],[119,-29]],[[87334,41914],[-118,692]],[[87216,42606],[-78,-91],[-106,278]],[[87032,42793],[-58,-98],[-184,-22],[-6,-133],[-158,-94]],[[68517,61061],[37,1486]],[[68554,62547],[-735,100]],[[67819,62647],[-34,-972]],[[59353,71005],[56,-2]],[[59409,71003],[469,-20]],[[59878,70983],[22,1160],[95,-7],[24,506]],[[59666,73331],[-128,5],[-15,-336],[-13,-1011],[-55,-82],[34,-150],[-56,-404],[-95,-181],[15,-167]],[[87446,60749],[64,-41],[36,-192],[69,60],[178,-167],[35,111],[157,204],[49,-34]],[[88034,60690],[-155,580],[-48,387],[-47,561]],[[87784,62218],[-44,-495],[-81,-345],[-40,-304],[-134,-185],[-39,-140]],[[66902,18671],[31,659]],[[66099,20334],[-201,-3],[-196,-174]],[[65702,20157],[-94,-78]],[[65570,19185],[-15,-332]],[[67986,54605],[54,-30],[47,-301],[-50,-201],[-134,-294],[51,-405],[101,-156]],[[68055,53218],[102,59]],[[68157,53277],[73,17],[54,234],[142,222],[50,201],[-36,146],[54,130]],[[68494,54227],[-54,262],[54,309],[-52,77]],[[68442,54875],[-131,-240],[-104,-46],[-200,189]],[[68007,54778],[-79,-39],[-73,-158]],[[10718,41346],[8,-99],[100,-81],[37,-150],[118,-183],[213,201],[139,-31],[163,64],[208,-81],[64,26]],[[11777,41316],[29,605]],[[10533,43712],[-29,-190],[-78,-105],[164,-1019]],[[10590,42398],[58,-106],[-70,-77],[81,-248],[-12,-212],[62,-103],[-34,-92],[43,-214]],[[67180,54092],[9,3]],[[68007,54778],[13,309]],[[67439,55146],[-7,-27]],[[67432,55119],[-252,-1027]],[[81893,68590],[124,-125],[118,-307],[-46,-194],[66,-74],[-10,-128],[255,-405]],[[82400,67357],[115,174],[105,257],[183,214],[142,400],[40,50]],[[82197,69242],[-90,5],[-124,-100]],[[81983,69147],[-66,-115],[38,-88],[-79,-183],[17,-171]],[[53237,37455],[-6,1103]],[[53231,38558],[-183,161],[-272,137],[-125,-31]],[[52651,38825],[13,-1382]],[[30202,18409],[154,53],[82,-122]],[[31911,17358],[-84,766],[-65,765],[-76,736],[-97,-26],[-24,248],[-95,-26],[-58,656],[-187,-51],[-134,1320]],[[30957,23008],[-58,730]],[[30899,23738],[-109,-106],[-18,-168],[-112,-206],[17,-160],[-119,-426],[-74,-125]],[[30484,22547],[222,-2261],[36,10],[102,-1100],[-285,-81],[-153,-435],[-96,-27],[11,-109],[-119,-135]],[[69149,59192],[94,-4],[110,118],[54,-136],[182,-34]],[[69589,59136],[-14,679],[164,186]],[[69658,60501],[-155,17],[-327,169],[-29,121]],[[69147,60808],[-66,-72],[109,-285],[-131,-398],[22,-240],[-38,-127],[72,-182],[24,-213]],[[22097,26225],[457,163],[229,-1794]],[[24458,24142],[-64,118],[-70,278],[38,131],[-61,146],[-20,205],[-84,27],[-187,1528]],[[23959,27680],[-64,540]],[[23895,28220],[-666,-232],[95,-607],[-257,-117],[-21,-78],[-244,-21],[-17,-139],[-115,-51],[-100,-142],[-144,152],[-46,-157],[-139,-161],[17,-76],[-89,-91],[15,-168],[-87,-107]],[[43647,34108],[39,5],[-17,317],[-27,1018],[66,7],[-7,338]],[[43701,35793],[-271,-17],[-824,-114]],[[42606,35662],[-63,-11]],[[42543,35651],[16,-334],[-70,-10],[60,-1330]],[[94892,27590],[27,-13],[388,-616]],[[95960,28522],[-107,86],[-3,418],[-129,140],[-129,49]],[[95368,28609],[-67,-111]],[[95301,28498],[-83,-129],[-104,-47]],[[95114,28322],[-74,-154],[-30,-286],[-65,50],[-53,-342]],[[69036,49240],[-97,214],[-67,349],[-51,-102],[-41,142],[-34,-111],[-50,245],[-51,-69]],[[68645,49908],[-5,-10]],[[68640,49898],[62,-129],[-64,-414],[45,-223],[-39,-437]],[[76819,53677],[144,-12],[7,-122],[230,-239],[121,-231]],[[77321,53073],[111,52]],[[77432,53125],[-41,183],[357,-313],[135,128]],[[77883,53123],[34,166],[-24,149]],[[77893,53438],[-151,173],[-178,54],[-82,303],[4,149],[-102,38],[-189,153],[-192,215],[-65,25]],[[76938,54548],[-7,-125],[-83,-121],[11,-198],[-52,-81],[40,-172],[-28,-174]],[[70301,59723],[175,-282],[8,-489]],[[70484,58952],[332,158],[473,269]],[[71289,59379],[-51,48],[-3,444],[-76,354],[-125,185],[-3,134]],[[70586,60553],[-160,-19]],[[59084,81063],[489,-22],[-6,-337],[196,-7],[4,335],[489,-26]],[[60256,81006],[1,88],[193,-8],[9,455],[65,-4],[8,397],[199,-8],[-25,168],[42,110],[-210,15],[2,168]],[[59159,81665],[-4,-141],[-117,-195],[46,-266]],[[84135,55862],[539,-167],[-35,-117]],[[85249,55425],[4,97],[-57,931],[153,56]],[[85349,56509],[-73,265]],[[85276,56774],[-157,-142],[-20,-95],[-130,-86],[-49,53],[-67,256],[-84,-16],[-166,251]],[[84603,56995],[-365,121]],[[48038,87680],[26,1]],[[48033,89343],[-1422,-70]],[[46611,89273],[43,-1716]],[[77529,50316],[3,149],[85,124],[53,501],[-44,98]],[[77581,51134],[-135,-148],[-150,-288],[-71,116],[-74,-120],[-142,-75]],[[77009,50619],[-37,-159]],[[76972,50460],[24,-128],[-56,-85],[94,-216],[150,-210],[-37,-110],[227,84]],[[28477,37138],[-233,86],[-125,-37],[-18,-128],[35,-257],[-82,-21],[-259,217],[-215,238]],[[27580,37236],[-266,-1283]],[[27314,35953],[535,-139],[354,105],[184,106]],[[26272,45692],[671,192],[105,70],[505,145]],[[27553,46099],[-170,254],[-93,1045]],[[27290,47398],[-376,-87],[-655,-211]],[[26259,47100],[106,-188],[151,-452],[-93,-270],[-165,-383],[14,-115]],[[78224,49255],[54,163],[102,46],[5,106]],[[78385,49570],[162,227],[27,170]],[[78574,49967],[-129,143],[28,153],[-89,32],[-120,-70],[-71,54]],[[78193,50279],[-145,-103]],[[61589,29114],[716,-58]],[[62305,29056],[72,272],[-16,190]],[[62450,30375],[-633,53]],[[61624,30442],[-35,-1328]],[[13548,11714],[109,-14],[1,-189],[88,-61],[42,74],[306,-87],[140,176],[62,13],[33,-162],[114,-141],[37,41]],[[14480,11364],[-149,859],[-163,998]],[[14168,13221],[-125,-62],[-56,-138],[-141,-78],[-276,-294],[-109,-209],[46,-261]],[[67558,29628],[395,-60]],[[67953,29568],[12,192],[-97,396],[-48,559],[43,219]],[[67863,30934],[-276,40]],[[67587,30974],[-32,-671],[36,-5],[-33,-670]],[[29225,16311],[-2,-152],[123,-106],[63,69],[98,-193],[82,29],[74,-117]],[[30202,18409],[-153,-167],[-15,-109],[-144,-48],[-134,28],[-73,248],[-92,64]],[[29591,18425],[-103,-177],[-207,-257],[35,-189],[-29,-211],[22,-356],[-40,-33],[30,-199],[-65,-188],[41,-173],[-112,-13]],[[29163,16629],[-9,-227],[71,-91]],[[76747,57028],[30,-24],[254,248],[103,139],[101,-63],[199,100]],[[77592,58169],[-63,164],[-69,-14],[-49,115],[-133,135],[-58,183],[-318,67]],[[76902,58819],[-35,-464],[-81,-64],[-210,-636]],[[76576,57655],[204,-335],[-33,-292]],[[20567,33974],[701,262],[-158,1257],[4,2128],[275,98]],[[21389,37719],[-54,477],[-7,581],[-69,330],[-54,121],[-36,540],[-144,405],[-70,30],[-138,1118]],[[20817,41321],[-1165,-429]],[[19652,40892],[128,-884],[317,-2554],[129,-924],[299,-2359],[42,-197]],[[60853,71924],[289,25],[100,101],[5,192],[194,-10],[7,336]],[[61448,72568],[7,335]],[[61455,72903],[-388,21],[5,167],[-292,15]],[[60576,72611],[32,-140],[-16,-218],[73,-144],[-4,-171],[192,-14]],[[60835,70945],[1221,-55]],[[62056,70890],[-27,167],[23,384],[54,267],[-16,277]],[[62090,71985],[-44,139],[-331,433],[-267,11]],[[60853,71924],[-18,-979]],[[93636,21096],[535,511],[167,52]],[[94338,21659],[-30,109],[142,571],[-79,315]],[[94371,22654],[-586,-400],[-70,101],[-91,-185],[-66,-5],[-114,-198]],[[93444,21967],[-22,-96],[108,-172],[-32,-237],[190,-139],[-52,-227]],[[62166,69380],[57,74],[-47,145],[23,149],[-118,100],[-81,207],[-51,14],[-35,235]],[[61914,70304],[-161,-168],[-10,-170],[-188,-23],[-48,-136]],[[61507,69807],[-54,-57],[3,-246],[58,-142],[47,-340],[-41,-440],[-12,-349]],[[45761,41061],[164,17]],[[45925,41078],[789,62]],[[46714,41140],[-39,1350]],[[45754,42403],[-32,-3]],[[86570,36246],[97,-322],[-25,-377],[48,-302]],[[86690,35245],[-98,-87],[-76,-193],[-6,-404],[-93,-232]],[[86417,34329],[16,-80],[143,-119],[93,-19]],[[86669,34111],[33,303],[-29,583],[206,-156],[184,50],[34,205],[40,-10]],[[87137,35086],[70,202],[146,-87],[76,202]],[[87429,35403],[-476,611],[1,20]],[[86954,36034],[-77,46],[-256,285],[-62,-75]],[[86559,36290],[11,-44]],[[88623,42560],[47,-130],[100,-47],[-11,-242],[254,11]],[[89042,43507],[-120,-163],[-110,-8],[-106,-95],[-124,-214],[-16,97],[-83,-35],[12,194],[-46,-11],[-18,-335],[70,-336],[141,96],[-19,-137]],[[55728,31644],[768,-11]],[[56496,31633],[8,1327]],[[56504,32960],[-771,11]],[[75130,60473],[58,-116],[272,-50],[32,-81]],[[75492,60226],[263,146],[30,108],[93,-29]],[[75878,60451],[7,847]],[[75067,61469],[48,-373],[-23,-13],[63,-348],[-25,-262]],[[53746,45853],[583,4]],[[54329,45857],[346,2]],[[54676,47208],[-6,347]],[[54670,47555],[-77,-259],[-159,19],[-94,-89],[-66,125],[-61,-70],[-43,146],[-101,-53]],[[54069,47374],[-121,-67],[-1,83],[-161,-42],[-13,-241],[-131,-198],[-12,-131],[-136,-300],[35,-223],[67,-53],[40,-168],[110,-181]],[[87887,41284],[-105,-41],[113,174]],[[87895,41417],[-81,28],[-75,-93]],[[87739,41352],[-173,-98],[-44,-355],[305,-108],[60,493]],[[95223,17589],[151,-185]],[[95374,17404],[107,361],[-42,69],[133,227],[54,342],[141,34],[16,215]],[[95829,19224],[-89,312],[-153,-103],[-228,-231],[-45,224],[-207,-84]],[[95107,19342],[-25,-101],[144,-666],[15,2],[-1,-614],[-60,-281],[43,-93]],[[69064,46357],[104,-251],[-58,-150]],[[69110,45956],[621,-95]],[[69731,45861],[17,335]],[[69311,47288],[17,-184],[-120,-115],[-4,-265],[-135,-255],[-5,-112]],[[67067,64672],[-13,-337]],[[67054,64335],[-2,-55],[286,-38]],[[67980,64167],[14,337]],[[67994,64504],[-95,66],[17,389],[-59,120]],[[67857,65079],[-189,23],[-3,-55],[-580,72]],[[67085,65119],[-18,-447]],[[56488,30691],[-763,12]],[[27609,38427],[90,136],[133,-62],[74,219],[186,-171],[80,10],[143,-171],[129,29],[168,-131]],[[28612,38286],[32,126],[-34,227],[-90,119],[79,348],[123,51],[56,174],[-21,118],[218,74],[63,190],[-22,74],[60,230],[-8,165],[-72,251],[70,50],[169,453],[-15,164],[320,89]],[[29540,41189],[57,15],[-30,330]],[[29567,41534],[-655,-178]],[[28912,41356],[-662,-185]],[[28250,41171],[-210,-52],[68,-189],[-115,-360],[-22,84],[-139,77],[-134,303],[-142,78],[-69,-40],[59,-170],[-13,-142],[57,-94],[-70,-159],[6,-175],[-102,-178]],[[27424,40154],[12,-184],[73,-165],[-21,-190],[57,-57],[-37,-242],[8,-363],[39,-29],[-17,-472],[71,-25]],[[80948,49043],[221,-255]],[[81466,49242],[11,64],[-169,800],[-71,386]],[[81237,50492],[-2,-5]],[[80771,49992],[31,-216],[179,-337],[129,93],[-97,-206],[41,-107],[-106,-176]],[[28912,41356],[-39,414]],[[28873,41770],[-86,903],[-90,-25],[-154,1657]],[[28543,44305],[-940,-268],[11,-47],[-279,-80]],[[27335,43910],[99,-1024]],[[27434,42886],[9,-85],[97,28],[77,-152],[296,80],[28,-294],[58,15],[80,-893],[240,-110],[16,-168],[-85,-136]],[[66183,29464],[779,-94],[17,335]],[[66979,29705],[29,664],[-27,3],[32,672]],[[66822,31065],[-764,93]],[[66058,31158],[-15,-334]],[[66043,30824],[-7,-333],[-47,-1001]],[[52810,23798],[344,10],[23,-114],[821,12]],[[53998,23706],[27,220]],[[54023,25041],[-679,-5]],[[52806,24356],[4,-558]],[[84798,38702],[105,88],[269,37],[120,120]],[[85292,38947],[-67,250],[-63,715],[-117,448]],[[59846,25338],[622,-40],[378,-8]],[[60846,25290],[17,664]],[[60863,25954],[14,554],[-288,14]],[[60589,26522],[-51,-59],[-322,-24],[-34,-131],[-267,-406]],[[59915,25902],[-114,-116]],[[59801,25786],[45,-448]],[[32550,12813],[640,167]],[[33190,12980],[-18,218],[128,32],[-28,328],[192,48],[-14,163],[193,48],[-13,164],[174,42],[-91,1091],[-61,41],[-83,285],[105,109],[-11,330]],[[32327,15036],[30,-44],[75,-976],[-190,-54],[54,-516],[-27,-64],[69,-404],[193,51],[19,-216]],[[81993,59474],[145,252]],[[82138,59726],[128,222],[14,449],[424,-109]],[[83054,60981],[-236,280],[62,202],[-153,59],[-73,103],[-69,-124],[-79,160],[-28,-226],[-215,380]],[[82263,61815],[-46,-100],[18,-226]],[[86558,46667],[354,-1126]],[[86912,45541],[75,-20]],[[87388,45758],[-61,298],[168,202],[54,174]],[[87549,46432],[-138,19],[-47,104],[27,219]],[[87156,47258],[-85,75],[-134,-416],[-61,65],[-120,-88],[-71,-142],[-53,32],[-74,-117]],[[40221,32972],[386,59]],[[40607,33031],[-192,3666]],[[40415,36697],[-1030,-180]],[[59447,25250],[56,-18],[-17,-876],[-56,2]],[[59430,24358],[-11,-661]],[[59419,23697],[430,-20]],[[59849,23677],[-12,331]],[[59837,24008],[28,386],[-71,113],[46,193],[29,348],[-23,290]],[[59801,25786],[-83,-3],[-119,-122],[-122,44],[-30,-455]],[[66547,55017],[64,71],[27,-137],[-92,-169],[85,12],[117,188],[17,121],[104,-21]],[[66869,55082],[63,139]],[[66932,55221],[-50,381],[-64,162],[99,73]],[[66917,55837],[1,130],[-73,-21],[-51,174],[80,183],[-25,64]],[[66849,56367],[-81,324],[-79,2],[-108,-222]],[[66581,56471],[-93,-263],[-103,-156],[-182,-455]],[[66203,55597],[86,-266],[155,-131],[-4,-113],[107,-70]],[[88896,34710],[148,-126],[139,-184],[77,-274],[140,-213]],[[89400,33913],[156,314],[-83,427],[-60,4],[-14,349],[53,54],[-1,253]],[[89262,35669],[-137,-121],[25,-146],[-114,-189],[-75,100],[-119,-273],[-99,42],[-55,-186]],[[59572,75507],[7,501],[194,-8],[14,676],[192,-10],[12,666]],[[59991,77332],[-293,16],[-94,340],[-177,9],[-27,350]],[[59400,78047],[-91,40]],[[59309,78087],[-43,-362],[-131,-144],[44,-194],[-75,-295],[-94,-115],[43,-138],[-106,-77],[-106,-230]],[[58841,76532],[14,-287],[39,-97],[-53,-228],[14,-108],[-111,-266]],[[72790,53440],[98,-67]],[[72888,53373],[109,202],[189,25]],[[73186,53600],[66,383],[123,185],[-14,64]],[[72879,54698],[-95,-1024],[-44,-103],[50,-131]],[[27993,66948],[-235,2586]],[[24513,68660],[225,-2198],[83,-849],[3,179],[74,66],[101,222],[918,260],[100,-987],[988,273]],[[30075,52658],[-442,5097],[309,78],[-47,552],[-30,-7],[-229,2652],[-13,-4],[-55,669],[-55,328],[6,279],[-119,1381],[-18,-5],[-114,1328],[-59,-16],[-69,800]],[[29140,65790],[-196,-85]],[[19970,66387],[65,-52],[134,60],[171,-33],[6,-131],[139,-165],[38,-233],[-46,-485]],[[22783,64731],[-356,3300]],[[22237,69792],[-2538,-2618],[58,-202],[4,-258],[96,-94],[113,-233]],[[59198,22050],[469,-23]],[[59667,22027],[-43,50],[-22,282]],[[59602,22359],[10,262],[173,17],[198,424],[8,213],[-142,402]],[[59419,23697],[-8,-439]],[[66113,58254],[252,-38],[5,-98]],[[66370,58118],[587,-39]],[[66672,59365],[-125,-239],[-150,14],[-41,80],[-207,40],[-21,79]],[[75170,48295],[133,-370]],[[75303,47925],[188,104],[28,-73]],[[75519,47956],[58,52],[75,228],[73,-24],[81,165],[-20,75]],[[75786,48452],[-193,450]],[[75593,48902],[-91,-65],[-64,-150],[-114,-51],[-102,-287],[-52,-54]],[[57551,29329],[769,-27]],[[58531,30631],[-520,20]],[[58011,30651],[-447,13]],[[76588,52020],[158,-209],[131,129],[73,-178],[103,-98],[83,-194],[35,105],[134,6]],[[77586,52331],[-81,298],[47,230],[-8,176],[-112,90]],[[77321,53073],[1,-317],[-115,-108],[32,-155],[-229,-145],[-68,-257],[-90,-77],[-101,127],[-64,241]],[[76687,52382],[-40,-80]],[[57067,68437],[145,50],[25,87],[110,-40],[123,237],[64,-84]],[[58355,68991],[13,978]],[[58368,69969],[-180,22],[-50,-65],[-135,150],[18,124],[-276,-47],[-68,-108],[-190,13],[-100,127],[-149,-70]],[[57238,70115],[-74,-166],[-103,-61]],[[57061,69888],[-10,-1440],[16,-11]],[[40494,23798],[1540,249]],[[41884,27166],[-510,-80],[-1121,-156]],[[40253,26930],[64,-1343],[57,-988],[13,5],[46,-816]],[[83089,62713],[67,-246],[-8,-261],[121,-69],[-33,-132],[127,-132]],[[84002,62924],[-33,163],[-78,25],[-179,270],[-34,-196],[-108,79],[-50,-152],[-112,-145],[-152,39],[-149,-80],[-18,-214]],[[40607,33031],[982,139]],[[41589,33170],[-116,2339]],[[41473,35509],[-58,1165]],[[41415,36674],[-25,513]],[[41390,37187],[-993,-152],[18,-338]],[[95614,26140],[78,20]],[[95052,26248],[-3,-105]],[[94639,27021],[188,-260],[-9,-188],[47,-19],[-76,-226],[154,-90],[79,106]],[[95321,26087],[31,168],[46,-90]],[[94892,27590],[-19,-125],[-186,90]],[[94687,27555],[-48,-534]],[[72764,51261],[83,123],[81,-3],[27,372],[-47,182],[110,91],[68,-135]],[[73086,51891],[33,14],[85,309]],[[73204,52214],[-61,-56],[-46,121],[-99,-43]],[[72998,52236],[-89,9],[-28,199]],[[72881,52444],[-416,6]],[[29004,24819],[192,58],[33,-328],[190,54],[16,-164],[88,25],[56,-486],[96,27],[31,-319],[274,79],[54,-560]],[[30304,22663],[107,22],[73,-138]],[[30899,23738],[-171,1859]],[[30728,25597],[-240,133],[-73,-84],[-125,78],[-61,-128],[-79,76]],[[30150,25672],[-46,36],[-114,-105],[-108,148],[-220,-63],[5,-55],[-220,-64],[11,-110],[-221,-64]],[[75040,64987],[-68,522],[-131,21],[12,185]],[[74239,65845],[-39,-234]],[[44856,32092],[1,0]],[[47914,32378],[-15,586]],[[46758,35790],[-954,-104]],[[45804,35686],[-952,-114]],[[44852,35572],[-56,-8],[53,-1330],[-47,-6],[49,-1313],[-29,-3],[34,-820]],[[76772,65905],[67,-143]],[[76839,65762],[135,133]],[[76798,66781],[-158,-104],[-132,-301]],[[17804,62842],[1119,400],[1530,506]],[[19970,66387],[-2585,-523]],[[17385,65864],[221,-1712],[40,14],[158,-1324]],[[23254,7628],[34,-251]],[[69270,42569],[-62,-134],[26,-112],[102,-87],[168,-406],[185,-153],[61,-110]],[[69750,41567],[31,583]],[[69781,42150],[58,1005]],[[69283,43245],[-40,-280],[27,-396]],[[72295,60347],[8,-357],[-36,-489]],[[72267,59501],[-13,-218],[65,-70]],[[72319,59213],[123,142],[194,38],[90,-83]],[[72726,59310],[87,320],[139,166]],[[72952,59796],[16,550],[-25,363]],[[72943,60709],[-234,-169],[-223,-33],[-179,144]],[[72307,60651],[-46,-201],[34,-103]],[[72862,58589],[235,-84],[129,49]],[[73226,58554],[151,113]],[[73377,58667],[58,676],[87,313]],[[73434,59678],[-327,114],[-49,61],[-106,-57]],[[72726,59310],[-34,-195],[123,-451],[47,-75]],[[78063,51868],[60,-99],[102,-568],[-34,-212],[-45,6],[0,-538],[-37,-101],[84,-77]],[[78574,49967],[90,252],[98,11],[64,126],[145,87],[38,123],[264,18]],[[79273,50584],[-522,1073]],[[78751,51657],[-62,136],[-157,122],[-169,202]],[[78363,52117],[-18,30]],[[78345,52147],[-127,-170],[-68,96],[-121,-143]],[[75688,49899],[271,59],[74,-87]],[[76033,49871],[39,79],[227,224]],[[76299,50174],[-102,447]],[[76173,50626],[-108,-133],[-224,39],[-111,-134],[-11,-171],[-67,42]],[[75652,50269],[-5,-311],[41,-59]],[[71250,30324],[119,1667]],[[71369,31991],[-691,127]],[[70678,32118],[-47,-577],[-49,-365],[-87,-381]],[[71472,55755],[95,-90],[171,-22]],[[71738,55643],[366,-22]],[[72104,55621],[-5,592]],[[72034,56767],[-22,140],[-159,36],[-115,-78],[-101,162],[-58,-77],[-74,305]],[[71505,57255],[-82,-24],[-12,-127],[-152,-183],[-74,-233]],[[71185,56688],[108,-25],[60,-254],[16,-251],[103,-403]],[[83455,58802],[97,-6],[61,-100],[151,-57],[76,-109],[430,-48]],[[84270,58482],[89,135],[16,201],[136,-19],[84,56]],[[84595,58855],[-185,256],[-7,148],[59,157],[-93,255],[16,95],[-117,120]],[[84268,59886],[-421,118]],[[83847,60004],[26,-195],[79,-211],[-64,-293],[-66,-65],[28,-132],[-114,-280],[-112,150],[-142,-59],[-27,-117]],[[40483,79187],[1575,2553]],[[42058,81740],[449,719]],[[42507,82459],[-90,118],[-54,295],[-198,-89],[-100,113],[-49,-44],[-243,120],[-18,175],[-90,123],[-12,161],[-56,10],[-13,175],[-77,91],[-93,619],[-71,9],[-68,349],[65,78],[-98,183],[-160,49],[-40,175],[-178,238],[-41,272],[-219,-52],[-105,22],[-91,-164],[-185,-103],[-76,-114],[-58,-199],[-101,-151],[-169,-39],[-148,-144],[-122,-280]],[[39549,84455],[5,-47],[193,-4348]],[[36718,24798],[1292,268],[193,17],[662,114]],[[38865,25197],[-17,163],[-86,1338],[-71,1330],[-13,-2],[-77,1247]],[[36849,28918],[78,-1205],[-22,-4],[90,-1333],[-29,-6]],[[36966,26370],[44,-602],[-63,-106],[48,-68],[-51,-130],[8,-180],[-66,18],[-91,-117],[26,-137],[-103,-250]],[[59602,22359],[559,-26],[-6,-330],[584,-27],[7,328]],[[60746,22304],[36,1643]],[[60782,23947],[-945,61]],[[60782,23947],[7,337],[33,-2],[24,1008]],[[42286,56906],[1491,177]],[[43711,58797],[-1567,-187]],[[85972,36234],[234,-15],[189,-64],[64,112],[111,-21]],[[86559,36290],[-111,132],[-253,175],[35,76],[-183,225],[-362,591],[-29,135],[-142,352]],[[85514,37976],[-41,117]],[[85473,38093],[-130,-408]],[[85343,37685],[182,-503],[-10,-88],[161,-319],[-13,-105],[309,-436]],[[68832,38105],[-32,-661]],[[68800,37444],[-45,-914]],[[68755,36530],[95,123],[115,-36],[-31,139],[168,51],[167,-31]],[[69269,36776],[86,1465]],[[69355,38241],[-90,104]],[[69265,38345],[-74,137],[-145,116],[-187,14]],[[68859,38612],[-27,-507]],[[87309,33079],[26,-658]],[[87335,32421],[-14,-414],[133,-64]],[[87454,31943],[47,11],[598,-210]],[[88099,31744],[-78,496],[56,57],[-62,325]],[[88015,32622],[-257,263],[-449,194]],[[57131,47843],[-2,-268]],[[57129,47575],[147,-141],[103,108],[101,-182],[59,12],[128,-288],[136,111]],[[57984,48307],[-4,325]],[[57980,48632],[-265,2],[-579,-31]],[[57136,48603],[-5,-760]],[[80474,36254],[428,-132],[189,1],[99,143]],[[81190,36266],[-87,296],[65,549]],[[80574,37295],[-19,-186]],[[80555,37109],[-81,-855]],[[80340,34871],[649,-151],[202,-96]],[[81311,35832],[-121,434]],[[80474,36254],[-4,-31]],[[80470,36223],[-130,-1352]],[[87296,33345],[13,-266]],[[88015,32622],[23,121],[166,121],[92,1],[52,276],[43,8],[55,303],[76,30]],[[88522,33482],[-61,177]],[[87992,34657],[-45,60],[-317,-73]],[[87630,34644],[-81,-373],[-41,-326],[-77,54],[-105,-275],[-30,-379]],[[62435,38378],[-192,13]],[[61661,38098],[-38,-1347]],[[59577,39583],[21,1010]],[[58830,40631],[-17,-1013]],[[48628,55575],[806,46]],[[50226,57731],[-4,253],[-164,12],[-130,-97],[-47,-115],[-143,-67],[-61,-178],[-207,-14]],[[49470,57525],[7,-355],[-91,-164],[-81,-295],[-134,-268],[-196,-19],[-76,-138]],[[48899,56286],[-31,-143],[-105,-97],[-135,-471]],[[48330,57126],[551,25],[18,-865]],[[49470,57525],[-20,1003],[3,329]],[[49453,58857],[-761,-54]],[[48692,58803],[-382,-23],[-9,-319],[29,-1335]],[[37714,64566],[768,127]],[[38425,65684],[-52,1021],[-92,1625],[-6,356],[-34,-5],[-39,639],[-377,-34],[-385,-66]],[[35572,67543],[43,-691],[587,147],[41,-671],[235,43],[100,-1665]],[[45405,16885],[-70,-119]],[[45335,16766],[46,-1206],[-93,-10],[36,-934]],[[33107,67063],[91,-1334],[120,-1660],[-17,-3],[89,-1217]],[[69703,40814],[543,-86]],[[70246,40728],[128,-20],[29,497]],[[70450,42042],[-669,108]],[[69750,41567],[-26,-419]],[[68610,55296],[265,-205],[212,-224]],[[69087,54867],[35,31],[159,-116],[51,-114]],[[69332,54668],[136,118],[-4,340],[21,474],[-13,461]],[[69472,56061],[-280,57],[0,-118],[-393,1]],[[68799,56001],[-85,-255]],[[68714,55746],[-104,-450]],[[84595,58855],[228,320],[50,398]],[[84873,59573],[48,266],[-170,586]],[[84751,60425],[-451,-547],[-32,8]],[[67468,51595],[-775,103]],[[66693,51698],[-13,-339],[-47,5]],[[66633,51364],[50,-143],[30,-432],[-25,-107]],[[68038,51343],[415,-55],[80,53]],[[68520,52570],[-85,-84],[-342,46]],[[64e3,47140],[-22,-173],[33,-142],[-75,-636],[11,-120]],[[79303,64309],[98,-249],[82,-56],[63,65],[227,-70]],[[80319,64294],[-190,141],[23,194],[86,165],[-86,272],[36,284],[147,183],[-24,151]],[[80311,65684],[-159,-93],[-59,-202]],[[80093,65389],[-90,-263],[-192,-242],[-148,-78],[-187,-239],[-100,-49]],[[79376,64518],[-73,-209]],[[78643,62152],[16,-41]],[[78666,62092],[-59,-381],[-86,-48],[14,-196],[-78,-379],[-35,-294],[-56,-51],[62,-279]],[[85661,48142],[-335,-89],[-142,-176]],[[82867,63045],[66,-19],[156,-313]],[[83182,64735],[-116,-125],[-77,-208]],[[82989,64402],[28,-177],[-92,-232],[-24,-246],[16,-192],[-68,-115],[68,-174],[-81,-147],[31,-74]],[[88458,45837],[208,194],[132,30],[210,154],[1,221],[-86,112],[39,506]],[[88962,47054],[-109,-83],[-7,-222],[-68,-22],[-53,-153],[-157,-3]],[[88293,46165],[15,-144],[150,-184]],[[75589,47735],[133,111],[353,-347]],[[76442,47975],[-69,140],[9,311],[-196,364]],[[76186,48790],[-109,-60],[-45,-220],[-107,-75],[-139,17]],[[75519,47956],[70,-221]],[[75456,56615],[125,-43],[126,138],[-2,-257],[227,31],[57,-36],[46,-287],[58,109]],[[76093,56270],[135,297]],[[76228,56567],[-236,491],[72,129],[-148,224],[-83,-6],[-55,250],[-58,96]],[[75720,57751],[-163,-505]],[[75557,57246],[-79,-164],[-77,-34],[-52,-204]],[[29268,9121],[1240,376],[-16,162],[192,59],[-16,163],[95,28],[-22,218],[858,234]],[[31599,10361],[-104,1082]],[[31495,11443],[-386,-107],[-31,324],[-383,-110],[-40,397],[-183,-95]],[[37586,54278],[875,152]],[[38461,54430],[-34,122],[53,190],[-66,252],[-16,438],[-160,15],[-110,145],[24,175],[-48,102],[34,189],[-52,27],[91,250],[-75,140],[41,188],[-56,547]],[[38087,57210],[-128,76],[13,178],[-54,223],[-145,340],[-79,82]],[[71941,37590],[27,445],[-56,11],[36,504]],[[45424,20429],[234,-51],[6,171],[136,-38],[143,131],[62,-89],[44,109],[167,-54],[161,-180],[137,-84],[1,-109],[175,-42],[-9,-135],[158,-163],[25,-170],[96,-25]],[[47649,19211],[53,381],[-54,178],[31,123],[-121,388],[15,284],[156,414],[-11,87]],[[47718,21066],[-1410,-126],[-899,-96]],[[45409,20844],[15,-415]],[[73714,55377],[35,-9]],[[73749,55368],[29,201],[-20,167]],[[73758,55736],[-93,31],[-185,151],[-63,381]],[[73417,56299],[-159,-236],[-219,-54],[-20,-98],[-189,123]],[[72830,56034],[15,-477]],[[58368,69969],[13,1073]],[[58381,71042],[6,531]],[[58387,71573],[-1139,40]],[[57248,71613],[-10,-1498]],[[93831,15002],[234,909],[-64,48],[178,608],[70,394],[198,-344],[260,547],[-51,89],[437,-42],[38,238],[92,140]],[[95107,19342],[-50,-14],[-33,158],[-65,-20],[-78,-171],[6,-216],[-85,-147],[-249,490],[-67,-41],[43,162],[91,-5],[165,234],[-33,234],[34,68],[-71,122],[53,171]],[[94461,20597],[-320,-1810]],[[93435,15064],[106,-102],[-19,-103],[161,66],[69,236],[95,-17],[-16,-142]],[[76186,48790],[80,53],[-46,88],[175,77],[-8,98],[127,29],[-53,125]],[[76461,49260],[-134,-1],[4,183],[-140,-34],[-165,152]],[[76026,49560],[-130,-292],[-120,-189],[-168,-50],[-15,-127]],[[83334,57419],[-205,65]],[[83129,57484],[-75,-278],[-253,-311],[-23,-157],[-67,34],[-162,-57]],[[82549,56715],[-48,-167],[13,-150],[106,-87],[-35,-187],[69,3],[-75,-319]],[[96177,19848],[-64,18],[-72,313],[-76,-2],[-48,213],[-92,7],[-55,218],[55,246],[-32,123],[-84,-58],[-109,161]],[[57335,27738],[253,234],[271,170],[68,-58],[-17,-269]],[[88363,51100],[64,-338],[-3,-251],[37,-227],[-96,-163],[-2,-157]],[[88363,49964],[234,-330],[8,-330]],[[88605,49304],[39,293],[54,92],[106,-9],[207,228],[16,87]],[[89027,49995],[-72,74],[-516,1255]],[[88439,51324],[-23,-8]],[[33374,32951],[983,228],[1495,330]],[[35852,33509],[-47,665],[31,6],[-127,1643],[-692,-134],[-72,977],[21,5],[-114,1515]],[[34852,38186],[-1010,-214],[-867,-205]],[[31321,37373],[193,-2212]],[[26257,11470],[13,173],[95,32],[-19,162],[87,88],[-13,107],[89,87],[7,221],[124,41],[-19,165],[96,33],[-61,96],[-104,-98],[-81,151],[-56,484],[26,9],[-38,322],[-194,-26]],[[26209,13517],[-156,103],[1,-318],[-135,-162],[-67,-220],[53,-216],[-45,-67]],[[86531,43601],[-33,-24]],[[86498,43577],[33,24]],[[64738,29608],[298,-40]],[[66043,30824],[-571,84],[-2,-49],[-577,71]],[[64893,30930],[59,-269],[121,-89],[-24,-680],[-216,-28],[20,-99],[-94,-49],[-23,-108]],[[64736,29608],[2,0]],[[46169,22729],[1766,155]],[[47935,22884],[97,356],[-73,239],[81,278]],[[47777,25074],[-28,206],[-206,299],[-103,-41],[-100,-214],[-62,2],[-9,192]],[[47269,25518],[-130,16],[-46,-78],[-140,40],[-172,159],[-178,-105]],[[46603,25550],[31,-944],[-574,-53],[27,-169],[45,-1326],[37,-329]],[[81398,67358],[111,-276],[343,105],[312,-125]],[[81893,68590],[-46,-137],[-6,-201],[-115,-135],[15,-76],[-102,-211],[14,-202],[-106,-116]],[[81547,67512],[-149,-154]],[[77604,56279],[130,-269]],[[78642,56362],[4,219]],[[78646,56581],[-60,-86],[-235,312],[-5,188],[-52,130],[-63,-91],[-80,35]],[[76687,52382],[14,120],[-70,158],[23,339],[96,273],[23,248]],[[76773,53520],[-147,-34]],[[76104,53216],[-44,-239],[-70,38],[-91,-198],[40,-157],[-18,-165]],[[68157,53277],[126,-202],[336,-119],[40,-139]],[[68889,52882],[18,272],[142,-66],[15,176],[75,-29]],[[69139,53235],[-414,610],[-62,69],[-3,164]],[[68660,54078],[-105,196],[-61,-47]],[[83138,60179],[-63,-1474]],[[83075,58705],[35,-71],[73,195],[96,5],[90,-206],[86,174]],[[83847,60004],[-1,0]],[[74080,56155],[31,-17],[2,-350],[63,-241],[172,-122],[146,15],[150,145],[93,-18]],[[74833,56145],[-139,203],[-14,115],[-135,74],[-47,307],[25,197]],[[74523,57041],[-172,46],[-48,-57],[-118,147]],[[74185,57177],[-36,-16]],[[74149,57161],[53,-211],[-99,-401],[-23,-394]],[[66849,56367],[49,0],[223,192],[152,-17],[68,48],[135,269]],[[67476,56859],[-827,87],[-81,25]],[[66568,56971],[-126,31]],[[66442,57002],[56,-458],[83,-73]],[[66322,57023],[-96,9]],[[66226,57032],[-66,-204],[41,-110],[118,25],[32,126],[-29,154]],[[77757,47185],[105,108],[45,182]],[[77907,47475],[17,296],[54,100],[11,200],[-46,76]],[[77618,48239],[1,-463],[-82,-25]],[[77537,47751],[65,-248],[155,-318]],[[79661,62392],[147,253]],[[79303,64309],[-188,-412],[-79,-54],[-61,-212]],[[52186,83478],[571,-1002]],[[52757,82476],[10,75],[337,-316],[100,-169]],[[53204,82066],[52,84],[232,-22],[47,387]],[[53535,82515],[99,318]],[[53634,82833],[-287,642],[-308,608]],[[52182,83485],[4,-7]],[[17925,13815],[311,54],[97,-150],[89,-40],[116,126],[91,-8]],[[18629,13797],[-176,1166],[282,125],[-46,319],[157,67],[-236,1606],[-25,-11],[-47,322]],[[17758,17060],[-182,-78],[41,-270]],[[84207,36697],[-19,-25]],[[84188,36672],[399,-154]],[[84587,36518],[-147,301],[115,184],[-25,242],[85,40],[54,249],[-130,731]],[[97059,29277],[86,40],[166,-94],[91,-102],[34,-256],[148,288],[-63,194],[-169,63],[-249,-65],[-44,-68]],[[85324,63504],[21,68]],[[84874,65570],[-154,-51],[-62,-133],[-146,-91],[-92,-172],[-158,-138],[-237,84]],[[27553,46099],[20,-25],[770,217]],[[28343,46291],[-4,39],[1300,352],[892,231]],[[30583,48284],[-1307,-337],[-1248,-351],[-738,-198]],[[50079,78646],[1008,18]],[[50804,80229],[-148,529],[48,67],[-55,157]],[[50062,79059],[-21,-332],[38,-81]],[[27631,17080],[57,20],[187,-247],[60,71],[105,-122],[61,-670],[378,116],[17,-163]],[[28496,16085],[729,226]],[[29163,16629],[-98,-12],[-77,127],[-147,-45],[-35,328],[-115,-35],[-67,174],[-87,-8],[1,228],[-179,190],[-99,11]],[[29591,18425],[-420,-102],[-49,-82],[-109,261],[-234,159]],[[52845,33380],[-81,-38],[-13,-141],[-142,-87],[-180,2],[-111,57]],[[52318,33173],[-245,-11]],[[45120,28291],[1508,149]],[[46628,28440],[-19,590]],[[46609,29030],[-96,-22],[-173,197],[-49,1533]],[[44867,30589],[12,-333],[-45,-4],[32,-860]],[[73758,55736],[25,-40],[161,162],[136,297]],[[74149,57161],[-152,-1],[-223,-140],[-11,-68],[-169,-39],[-66,-85],[-21,-162],[-64,19]],[[73443,56685],[-26,-386]],[[28873,41770],[39,59],[33,292],[90,47],[4,243],[41,130],[-5,201],[1779,471]],[[30854,43213],[6,208],[-160,508],[23,191],[-88,129],[-19,203],[-83,164],[-48,207],[86,203],[96,-4],[49,183],[-101,-140],[-127,20],[-58,289],[81,499],[-61,191],[22,170],[91,84],[-43,182],[94,-22],[0,199],[-83,236]],[[28343,46291],[56,-618],[14,4],[130,-1372]],[[51691,89658],[334,-846]],[[52453,88194],[109,-3],[28,78],[90,-57],[123,194],[131,55],[49,-81]],[[53225,88751],[-46,102],[-3,247]],[[52706,89605],[-250,191],[-124,213]],[[52242,90010],[-109,-236],[-124,-4],[-95,73],[-107,-197],[-116,12]],[[45691,57281],[233,20]],[[45924,57301],[725,63]],[[32915,53331],[1574,337]],[[34024,56604],[-64,840]],[[31439,56872],[309,-3808]],[[62425,59549],[443,-16],[2,171],[193,-9]],[[63063,59695],[285,-22]],[[63348,59673],[-52,304],[-135,191],[-73,279],[61,220],[-79,-4],[11,437],[-383,16]],[[62698,61116],[-382,15]],[[62221,60479],[-2,-169],[-69,-233],[33,-222]],[[59814,50754],[36,-35],[168,278],[346,10],[13,-89],[104,-43]],[[60228,52150],[-380,-6]],[[59848,52144],[2,-617]],[[51842,9691],[1070,30]],[[52998,11449],[2,6]],[[63348,59673],[298,-7]],[[63646,59666],[12,682]],[[63131,61433],[-429,23],[-4,-340]],[[53770,30702],[7,255],[117,188],[-8,290],[-88,45],[40,147]],[[53838,31627],[-9,137],[122,1],[29,285],[48,113],[-29,144]],[[67476,56859],[13,-1]],[[67489,56858],[35,352],[-121,85],[-111,-60],[9,730]],[[66370,58118],[89,-191],[30,-362],[69,-229],[10,-365]],[[80521,65882],[564,-1245]],[[81210,64360],[130,216],[100,36],[104,226],[265,69],[179,121]],[[81988,65028],[-283,709]],[[81705,65737],[-605,1296]],[[81100,67033],[-190,-143]],[[80910,66890],[-12,-228],[-119,-37],[-79,-135],[32,-309],[-148,-138],[-63,-161]],[[11603,15238],[689,353]],[[11969,17171],[-911,-462]],[[11058,16709],[-23,-256],[165,21],[40,-271],[186,96],[177,-1061]],[[10534,16467],[524,242]],[[14043,18272],[33,132],[-52,499],[-218,439],[-51,188],[-93,-33],[-104,158],[-36,355],[-42,60],[-57,298],[12,144],[-65,15]],[[13370,20527],[-235,119],[-73,432]],[[13062,21078],[-556,-275],[-393,-177],[67,-395],[-570,-265],[43,-243],[-47,-23],[106,-642],[-321,-164],[19,-107],[-188,-98],[-78,-120],[25,-141],[-78,-39],[-26,-225],[-116,-152],[-188,-100],[-237,208],[-325,-174]],[[10199,17946],[213,-854],[122,-625]],[[87549,46432],[80,128],[61,295],[134,20],[24,169],[232,-128],[122,219]],[[88202,47135],[168,379],[55,36]],[[88425,47550],[8,288],[60,169],[-90,228]],[[88403,48235],[-67,-117]],[[88336,48118],[-109,-160]],[[65732,54659],[104,-124],[24,-171],[111,-146],[228,-98]],[[66199,54120],[50,-2],[6,197],[170,440],[2,158],[120,104]],[[66203,55597],[-302,74]],[[65901,55671],[3,-247],[-204,-611],[32,-154]],[[54101,87750],[30,-1098]],[[54131,86652],[674,-699],[178,-317]],[[54983,85636],[66,210],[-10,252],[156,186],[-37,82],[39,271],[128,-9],[100,106],[30,169],[123,251],[125,21]],[[55703,87175],[-298,287],[-300,330],[-521,413],[-230,207],[-363,424]],[[49263,69505],[-25,1695]],[[49238,71200],[-270,-16]],[[48269,71143],[34,-1699]],[[60862,20317],[773,-56]],[[61706,22240],[-767,50]],[[60939,22290],[-35,-1313],[-27,2],[-15,-662]],[[26199,47092],[60,8]],[[29135,50294],[-634,-167],[-1390,-388],[-51,1],[-557,-165],[-337,-125],[-557,-169]],[[25609,49281],[94,-999],[190,62],[17,-332],[207,62],[15,-337],[67,-645]],[[53954,38810],[235,3]],[[54865,39593],[-674,2]],[[79103,54302],[101,-147],[111,-73],[-40,181]],[[79275,54263],[-172,39]],[[52505,14742],[881,18]],[[53442,15419],[-17,321],[38,298],[2,372]],[[62583,65168],[13,959],[219,2],[119,43],[33,279],[116,23],[17,206]],[[63100,66680],[-109,33],[-89,-117],[-90,76],[-4,-114],[-172,-191],[-62,-8],[12,419],[-37,-108],[-382,31],[2,112]],[[61656,66856],[-14,-648],[37,-1],[-15,-1011]],[[63198,58265],[34,122],[143,64],[43,149],[174,42],[420,-31]],[[64012,58611],[111,-9],[-122,281],[-57,347],[15,87]],[[63959,59317],[-27,340],[-286,9]],[[63063,59695],[-24,-1312],[160,-62],[-1,-56]],[[87277,49404],[-18,-122],[73,-153],[-35,252]],[[54637,75001],[1177,-307]],[[55814,74694],[9,251],[-55,228],[59,134],[-45,312],[63,30],[23,282],[115,102],[126,298],[6,247]],[[56115,76578],[-718,203],[9,56],[-174,89]],[[55232,76926],[-23,-183],[62,-7],[15,-238],[-49,-146],[-59,216],[-38,-80]],[[55140,76488],[9,-231],[-177,-65],[3,-225],[-205,-125],[15,-347],[-95,14],[42,-151],[-42,-171],[-71,-81],[18,-105]],[[66932,55221],[201,70],[125,-105],[174,-67]],[[67468,55815],[-449,58],[-102,-36]],[[75937,58113],[141,-210],[127,2],[-42,-116],[147,-33],[76,98],[100,-1],[90,-198]],[[76902,58819],[-192,70],[-85,168],[-100,48],[-40,169],[-70,75]],[[76415,59349],[-15,-9]],[[76400,59340],[33,-101],[-137,-80],[16,-147],[-150,78],[-68,-165],[-30,50],[-112,-109]],[[67804,58520],[69,-15],[-12,-204],[220,-22],[-3,-141]],[[68078,58138],[569,-55],[3,99]],[[68763,59228],[3,112]],[[68089,56785],[774,-92]],[[68863,56693],[-4,206],[141,304]],[[68078,58138],[-37,-1348]],[[92129,27498],[57,-148],[115,-4],[44,248],[-36,119],[191,-72],[39,131],[160,-4],[33,-373],[60,-3],[-21,146],[61,61],[291,-206],[39,166],[140,-245],[105,-97]],[[93407,27217],[-34,258],[113,40],[105,-47],[72,491]],[[93663,27959],[-599,244]],[[93064,28203],[-395,162],[0,132],[-77,54],[-16,-148],[-313,124]],[[92263,28527],[-72,26]],[[59691,46434],[-166,-62],[17,139],[-62,149],[-194,128],[22,181],[-107,96],[-13,-129],[-129,-121]],[[51431,82547],[120,-163]],[[51551,82384],[635,1094]],[[51566,83984],[-171,-128],[-229,-456],[-61,-227]],[[51105,83173],[-35,-99],[199,-228],[162,-299]],[[90787,22360],[237,-152],[-57,-255],[289,-159],[43,147],[79,-119]],[[91804,23722],[-615,204]],[[91189,23926],[-100,-793],[-111,-197],[-29,-140],[-108,57],[-11,221],[-53,-37],[-29,-192],[39,-485]],[[14485,16225],[40,37],[969,463],[1097,505]],[[16591,17230],[-66,77],[10,138],[-114,730]],[[16421,18175],[-678,-303],[-48,320],[-249,-114],[-50,320],[-183,-86]],[[15213,18312],[-1128,-538]],[[79522,52063],[65,-142],[158,-147],[27,-151]],[[80668,51402],[-97,101],[51,153],[-112,123],[119,52],[10,133],[-141,173],[-174,136],[53,84]],[[80377,52357],[-68,111],[-1,-125],[-168,156],[-166,265],[-61,-156],[-119,103]],[[79794,52711],[-114,-343],[-131,-197],[-27,-108]],[[85349,42059],[401,387]],[[85575,42970],[-56,154]],[[85519,43124],[-109,-121],[-62,45],[-102,-60]],[[85246,42988],[103,-929]],[[79012,78931],[230,-53]],[[79242,78878],[19,292],[67,258],[125,-16],[182,67],[11,59],[220,228],[125,311],[67,53]],[[80058,80130],[-7,234],[-52,23]],[[79235,80571],[-65,16],[-20,-249],[-34,8],[-104,-1415]],[[55571,54277],[-767,-7]],[[68640,49898],[-277,54]],[[50924,13763],[-151,-12],[-65,-322],[-96,69],[-71,-82],[-28,-222],[-287,249],[-10,-240],[-107,113],[6,-325],[-191,-191],[15,-815]],[[55790,41940],[289,4]],[[56079,41944],[2,383],[41,1],[0,837]],[[56122,43165],[-633,-3]],[[55489,43162],[3,-103],[-102,-88],[-136,-598],[-12,-138],[65,-47],[-18,-175],[-64,151]],[[84431,53037],[13,-2043]],[[84444,50994],[170,68],[44,-89],[128,69]],[[84786,51042],[25,159],[142,-61],[51,94],[76,-202],[48,236],[-31,78],[161,193],[-13,136],[61,216],[-35,100],[93,143]],[[85364,52134],[-87,250],[1,389]],[[85278,52773],[-108,35]],[[84571,52993],[-140,44]],[[87032,42793],[105,102],[65,212]],[[87202,43107],[-114,24]],[[87088,43131],[-80,-99]],[[86962,42978],[70,-185]],[[15406,1954],[23,-124],[84,180],[-102,38],[-5,-94]],[[15701,1720],[1328,650],[943,444],[10,-58],[225,103]],[[17639,4013],[-1990,-950]],[[15649,3063],[-26,-126],[-119,-209],[-43,-184],[25,-119],[-166,30],[-38,-202],[55,-176],[107,5],[60,81],[19,172],[96,32],[11,-365],[89,23],[46,-94],[-64,-211]],[[15303,1766],[52,-72],[38,176],[-91,66],[1,-170]],[[41303,17743],[10,-165],[193,32],[6,-110]],[[42364,17794],[-18,382]],[[42296,19166],[-63,1273]],[[42233,20439],[-10,241]],[[42223,20680],[-141,-20],[17,-331],[-397,-65],[17,-321],[-194,-29],[16,-309],[-570,-92]],[[87782,49709],[110,-322],[78,-93],[68,-210]],[[88038,49084],[56,36]],[[88094,49120],[75,98],[185,-47],[116,147],[57,-10],[28,-210],[50,206]],[[88363,49964],[-156,258]],[[88207,50222],[-70,-408],[-197,19],[-158,-124]],[[20798,12054],[-38,115],[-136,983],[189,76],[-46,324],[189,78],[-114,765]],[[20842,14395],[-1497,-614]],[[19345,13781],[84,-73],[9,-437],[-72,-239]],[[75443,63625],[128,-25],[8,118],[591,-122]],[[76170,63596],[12,176]],[[76182,63772],[40,570]],[[76222,64342],[-168,72],[-4,207],[-98,77],[9,136]],[[75961,64834],[-440,72]],[[54340,22052],[774,0]],[[55114,22052],[1,666],[16,0],[2,662]],[[55133,23380],[-580,2]],[[54553,23382],[-195,-3],[1,-661],[-18,0]],[[54341,22718],[-1,-666]],[[54799,54608],[1,1158]],[[54800,55766],[-65,1]],[[54735,55767],[-927,-4]],[[53808,55763],[5,-1173]],[[57098,43669],[4,-1005]],[[57102,42664],[648,-10]],[[57750,42654],[6,955]],[[57101,44004],[-3,-335]],[[84924,43932],[78,-255],[31,-255],[-61,-3],[11,-233]],[[84983,43186],[250,-120],[13,-78]],[[85519,43124],[-92,292],[31,71],[-104,141]],[[85137,44113],[-19,-77],[-194,-104]],[[48112,83913],[798,62],[46,41],[-21,187],[113,13],[243,-479]],[[49291,83737],[-26,1681]],[[49254,86030],[-1189,-70]],[[56648,44858],[465,-7]],[[57125,45967],[-856,6]],[[56269,45973],[-9,-156],[73,-14],[18,-148]],[[42223,20680],[-120,2549]],[[70834,24345],[276,-53]],[[71110,24292],[75,10],[69,-479],[-55,-11],[51,-313],[66,-78],[-17,555],[-72,159],[-13,195],[80,30],[30,-219],[76,-231]],[[71658,25200],[-765,142]],[[70893,25342],[-59,-997]],[[68585,62543],[295,-42]],[[69059,64535],[-316,43]],[[68743,64578],[-53,-1064],[-65,-49]],[[68625,63465],[-40,-922]],[[30751,65365],[248,-3056]],[[82918,39782],[108,-340],[46,21],[145,-731]],[[82878,41044],[-25,-126],[31,-264],[-100,-100],[14,-188],[120,-584]],[[86117,28601],[331,-133],[5,33],[306,-130]],[[86759,28371],[120,806]],[[86879,29177],[-64,112],[102,47],[18,257],[-172,-23],[-103,37],[24,209],[-205,-1]],[[86479,29815],[-131,42]],[[86348,29857],[-116,36],[-33,-346],[-95,-641]],[[86931,26109],[49,95],[23,242],[94,-16],[174,1097]],[[87271,27527],[-595,294]],[[86676,27821],[-168,-247],[-147,67],[-94,-597],[-45,22],[-54,-365],[39,-31],[-67,-449]],[[85584,61467],[904,1108]],[[86488,62575],[236,291]],[[86724,62866],[-293,292],[-156,271],[-186,463],[-89,292]],[[85605,63783],[-171,-374],[-37,-294],[-61,-12],[-105,-241],[43,-243],[92,-180],[-22,-78],[63,-189],[9,-172],[91,-204],[-7,-124]],[[32935,6852],[774,201],[1068,262]],[[34777,7315],[-51,319],[-108,1294],[47,175],[-22,272],[-48,-12],[-51,209],[-32,379],[-49,-12],[4,277],[-28,325]],[[34439,10541],[-287,-64],[28,-332],[-178,-35],[28,-326],[-1157,-300],[-29,324],[-194,-51]],[[90031,26709],[563,-404],[1,-16]],[[90595,26289],[94,-199],[114,96]],[[90803,26186],[0,353],[-43,335],[37,172],[3,403]],[[75760,66156],[178,-363],[16,-323],[111,-321],[-104,-315]],[[76222,64342],[21,292],[225,163],[85,-1]],[[76553,64796],[-124,114],[-13,117],[-147,79],[-17,116]],[[76203,66434],[-197,39],[25,373]],[[76031,66846],[-198,142],[-66,101]],[[75321,67145],[61,-255]],[[60863,25954],[769,-54]],[[61632,25900],[9,333]],[[61641,26233],[-556,41],[-44,43],[-70,692]],[[60971,27009],[-256,-163]],[[60715,26846],[-67,-85],[-59,-239]],[[70720,70428],[188,-32],[10,167],[556,-110]],[[71500,70864],[-33,426],[-52,202],[-41,323],[-579,113],[38,669],[-96,16]],[[70737,72613],[-95,16],[-36,-668]],[[70606,71961],[-36,-665],[96,-15],[-31,-670],[93,-16],[-8,-167]],[[17573,85295],[-256,44],[-103,-100]],[[79247,67280],[134,-112],[53,-120],[150,-137],[251,142]],[[79835,67053],[-248,464],[27,193],[-155,12]],[[79459,67722],[-158,-150],[-36,-238]],[[79265,67334],[-18,-54]],[[44013,74138],[810,81]],[[44763,75891],[-962,-97]],[[32310,25919],[-177,2063]],[[30561,27426],[167,-1829]],[[39321,44357],[0,-8]],[[38720,44503],[42,-694]],[[38762,43809],[37,-637]],[[38799,43172],[424,67]],[[39223,43239],[83,69],[77,-44]],[[39383,43264],[-27,473]],[[39356,43737],[-31,537],[-101,77],[95,38]],[[39315,44602],[-79,263],[-88,79],[12,143],[-87,90],[-2,177],[-193,555],[-136,290]],[[38740,46199],[-115,-19],[95,-1677]],[[35060,45164],[-150,2104]],[[33405,46945],[46,-616],[429,-206],[101,-263],[215,-265],[128,24],[88,-55],[148,174],[142,-141],[103,-191],[255,-242]],[[76330,66409],[84,204],[-62,173],[12,437],[-108,21],[21,320]],[[76277,67564],[-62,13]],[[76215,67577],[-49,-315],[31,-110],[-166,-306]],[[71451,47788],[61,1019]],[[70875,49025],[-30,-505]],[[70845,48520],[-37,-615]],[[94259,30777],[16,-81],[139,-125],[-101,193],[-54,13]],[[94010,31176],[83,-93],[-47,166],[-36,-73]],[[92070,33032],[7,-96],[143,45],[-10,-130],[93,70],[213,-3],[118,-144],[-7,-145],[160,-52],[436,-197],[216,-158],[218,-373],[151,-415],[179,-143],[-91,309],[118,134],[118,-14],[37,-101],[117,187],[200,-302],[-1,-93],[150,-89],[-1,98],[-344,472],[-398,593],[-259,324],[-289,329],[-416,554],[-232,238],[-154,105],[-39,-33],[-147,154]],[[86010,23729],[65,-193],[-5,156],[-60,37]],[[87300,21910],[-101,488],[110,72],[4,252],[-75,34],[31,147],[-97,22],[-198,437],[-132,28],[28,351],[102,-23],[66,366]],[[86372,24361],[-103,-449],[-125,-89],[40,-185],[77,-62],[23,101],[102,-175],[-32,-132],[-130,-112],[-113,90],[4,-152],[-95,-84],[-85,29],[-24,-261],[45,-403],[103,-55],[110,-181],[-15,-156],[219,-341],[51,0],[143,-290]],[[85877,23714],[49,-155],[56,-2],[-105,157]],[[57142,50372],[10,1269]],[[57152,51641],[1,89]],[[57153,51730],[-809,14]],[[79429,58617],[42,-211],[111,-61]],[[79582,58345],[36,30],[193,-106],[60,-90],[71,83],[217,-120],[22,-133]],[[80181,58009],[113,-179],[121,99]],[[80414,59488],[-192,35]],[[80222,59523],[-171,31]],[[79461,58900],[-50,-182],[18,-101]],[[89400,33913],[-28,-79],[147,-249],[69,-242]],[[89588,33343],[414,565]],[[90002,33908],[-79,453],[-57,86]],[[23690,44634],[1706,546],[906,276]],[[26302,45456],[-30,236]],[[26199,47092],[-1332,-413],[-1358,-437]],[[79705,52849],[288,471],[194,556],[21,-22]],[[80208,53854],[-63,119]],[[79829,54046],[-170,35],[-13,89],[-371,93]],[[79103,54302],[-90,22]],[[78910,53908],[171,-253],[200,-189],[-19,-139],[206,-225],[68,42],[169,-295]],[[73966,65743],[9,201],[-128,22],[-54,178],[96,-16],[9,168],[-88,128],[29,478],[-26,87],[-152,134],[7,169],[-96,17]],[[73572,67309],[-4,-113],[-369,64],[-52,-48],[-69,-267],[-177,10]],[[77918,65862],[199,-185],[12,-110]],[[78129,65567],[315,172],[122,-94],[105,61]],[[78671,65706],[92,105],[-91,335],[80,333],[-44,90]],[[78708,66569],[-243,501]],[[78465,67070],[-158,-210],[-93,-231]],[[80556,39083],[185,-70]],[[80741,39013],[86,914]],[[80827,39927],[-282,-23]],[[80545,39904],[28,-239],[44,-78],[17,-223],[-78,-281]],[[13913,92719],[-390,273],[-153,-250],[32,-281],[-120,168],[-47,221],[52,293],[-84,115],[-66,-54],[-111,-471],[-127,-245],[-81,191],[-51,-152],[-103,-107],[11,-156],[-305,261]],[[12330,92853],[20,-148],[159,-124],[-98,298],[-81,-26]],[[12354,92539],[-115,95]],[[23037,62376],[1067,329],[803,700],[86,-204],[95,-103],[84,-263],[778,414],[419,119]],[[69876,48606],[115,-15],[50,102],[71,-95],[63,77]],[[70175,48675],[59,1085]],[[70234,49760],[-390,65],[-35,-50]],[[69809,49775],[-27,-521],[-157,48],[-12,-234],[-101,-98],[-14,-261]],[[73426,45017],[-21,1399]],[[73404,46488],[-111,83]],[[73293,46571],[-414,83]],[[50423,52839],[1150,40]],[[51559,54220],[-954,-27]],[[50492,45758],[948,40]],[[51432,46803],[-5,337]],[[51427,47140],[-961,-41]],[[50466,47099],[26,-1341]],[[48510,50690],[23,1],[-13,675]],[[47368,51619],[25,-1008]],[[53872,48542],[0,168],[192,3],[0,335],[64,1]],[[53128,49537],[10,-782],[63,1],[2,-224]],[[58720,20456],[9,659],[-133,4],[21,945]],[[58632,22734],[-389,13]],[[58222,21745],[-16,-612],[-64,0],[-9,-661]],[[58133,20472],[17,-332]],[[67994,64504],[354,-48],[7,168]],[[68355,64624],[64,1446]],[[68419,66070],[-321,41],[2,57]],[[67907,66192],[-50,-1113]],[[66192,64548],[96,-11]],[[66288,64537],[334,-38],[98,120],[196,-35],[151,88]],[[67085,65119],[37,838]],[[66638,66011],[-4,-111],[-388,39]],[[66246,65939],[-54,-1391]],[[64687,75373],[30,-227],[-29,-781]],[[64688,74365],[918,-97]],[[65606,74268],[-30,73],[241,647],[-48,58],[22,164],[76,33],[-17,142]],[[65850,75385],[-226,159]],[[67745,76394],[384,-46]],[[68129,76348],[193,-26]],[[68322,76322],[75,1665],[13,0]],[[68410,77987],[14,335],[-96,11]],[[67846,78397],[-31,-345],[-70,-1658]],[[53021,12776],[-7,77]],[[89445,37461],[184,281]],[[89629,37742],[87,121],[-15,248],[91,9]],[[89792,38120],[-191,138],[-117,230]],[[94388,28851],[524,-263],[17,-109],[89,-40]],[[95018,28439],[57,135],[-24,143],[-96,31],[85,95]],[[95040,28843],[-84,116],[-8,129],[-486,241]],[[94462,29329],[-22,-162]],[[94440,29167],[-52,-316]],[[60852,36802],[771,-51]],[[53818,37466],[183,2],[-1,224]],[[53231,38570],[0,-12]],[[84187,41371],[-93,311],[-84,177],[-67,392],[-52,24],[-126,394]],[[83765,42669],[-291,-204],[-239,9]],[[62351,63073],[180,-140],[113,129],[101,0],[-5,-255],[216,-10]],[[63172,64809],[-396,15],[7,337],[-150,6]],[[29140,65790],[96,152],[101,257],[81,-157],[222,-187],[43,-105],[140,-5],[69,-99]],[[30210,70488],[-212,-44],[-1749,-442],[-521,-139]],[[38161,40839],[77,59],[-26,201],[66,251],[102,155],[67,259]],[[38447,41764],[-54,219],[56,224],[-24,385],[-96,103],[-22,282],[27,39]],[[38334,43016],[-50,150],[7,155]],[[38291,43321],[-89,167],[-151,48],[-106,-63],[-8,231],[-78,134]],[[37859,43838],[-125,35],[-96,-175],[-23,-319],[-72,-162],[-66,-16],[-120,-292],[-243,-42],[-63,-55]],[[37051,42812],[-324,-61]],[[36727,42751],[2,-299],[93,-1300],[-34,-7],[27,-397]],[[35632,49442],[73,-1068],[1298,261]],[[37003,48635],[294,50],[39,-122],[80,55]],[[37416,48618],[185,443],[16,100],[125,220]],[[37742,49381],[182,493],[93,549],[63,232],[48,-5],[91,245]],[[38219,50895],[67,183],[-72,377]],[[35583,50175],[49,-733]],[[84165,87743],[529,-140]],[[84694,87603],[187,-55],[31,317],[192,-52]],[[84708,89262],[-113,-126],[-24,-162],[-56,-11],[-39,-210],[-133,-41],[-98,-100],[-21,-130],[-129,-128],[-31,-142],[117,-298],[-16,-171]],[[76214,62667],[-99,100],[7,112],[-148,-15],[-14,71]],[[75960,62935],[-43,64],[-513,105]],[[75404,63104],[-9,-131]],[[80101,73997],[194,-44],[41,188],[121,-28]],[[80457,74113],[69,185],[16,206],[168,287],[58,-9]],[[80768,74782],[11,123],[150,45],[29,327],[168,244]],[[81112,77238],[-392,46]],[[80720,77284],[-32,-113],[-76,-783],[-113,29],[-36,-547],[-56,14],[-153,-177],[-203,-591]],[[61053,46491],[379,2],[634,-41]],[[61420,47562],[-6,-678],[-360,-1]],[[61054,46883],[-1,-392]],[[36400,58196],[-23,288]],[[36377,58484],[-4,63]],[[36373,58547],[133,68],[-77,180],[-80,71]],[[36349,58866],[-48,-149],[-201,-179],[33,-505],[147,57],[124,-31]],[[33190,12980],[81,26],[215,-191],[41,25],[252,-185],[61,-401],[13,-239],[168,78],[78,-104],[209,36]],[[34308,12025],[164,112],[181,-103],[68,-117],[208,96],[107,-51],[181,78],[61,234]],[[48737,33466],[227,66],[204,-197],[261,-108]],[[49410,35983],[-704,-36]],[[44450,10821],[972,115]],[[45422,10936],[389,40],[-24,661],[76,7],[-48,1320],[77,8],[-25,664]],[[45079,13890],[-263,-115],[-115,-179]],[[44701,13596],[4,-296],[134,-240],[24,-110],[-76,-190],[-89,-28],[11,-97],[-140,-87],[0,-132],[-101,11]],[[69213,51217],[60,-2],[3,257],[103,-33],[26,-211],[-69,-169],[49,-172],[155,246],[98,-150]],[[69638,50983],[124,2],[143,122]],[[69905,51107],[-20,310],[99,129],[-82,168],[-120,86],[-17,162]],[[69620,52124],[-415,98]],[[94213,27804],[474,-249]],[[95114,28322],[-59,106]],[[95055,28428],[-37,11]],[[94388,28851],[-175,-1047]],[[75549,55136],[60,-13]],[[76032,55042],[14,110],[147,484],[32,23]],[[76225,55659],[-74,90],[-12,403],[-46,118]],[[51986,93040],[61,2]],[[52047,93042],[-54,474],[-17,352],[18,664],[83,700],[63,386]],[[52140,95618],[-50,-1]],[[52090,95617],[-143,-763],[-21,-347],[10,-849],[50,-618]],[[50767,93265],[69,-89],[222,-33],[114,-148],[114,71],[182,-54]],[[51468,93012],[14,148],[171,57],[187,-122],[55,20],[-52,1027],[-51,673],[-25,10],[20,367],[48,420]],[[51835,95612],[-846,-18],[-192,-59]],[[50797,95535],[-56,-17],[7,-627]],[[83951,28401],[-19,-163],[53,-171],[-15,-162]],[[84514,27895],[89,277],[-62,67],[39,343],[-37,12],[60,337],[180,-54],[34,354]],[[84817,29231],[-273,79],[18,172],[-96,32],[24,242]],[[83962,29733],[-41,-213],[78,-165],[32,-216],[-80,-738]],[[78058,47482],[167,-153],[136,-72],[20,-525]],[[78494,46668],[319,377]],[[78813,47045],[47,379]],[[78860,47424],[-111,146],[-100,43],[-115,459]],[[78534,48072],[-64,-27],[-55,-342],[-47,109],[-310,-330]],[[12186,33802],[75,299],[-128,221],[-86,421],[86,220],[-1,119],[171,479],[-12,96],[94,217],[-18,107],[81,161]],[[12448,36142],[-146,100],[-17,108],[-259,-94],[-90,192],[-15,137],[-171,262],[-278,8],[-72,-90],[-34,78]],[[11366,36843],[-4,-43],[-460,-211]],[[10980,36306],[72,-229],[25,-228],[51,-86],[-228,-97],[84,-511],[102,-57],[-111,-453]],[[37859,43838],[-9,99],[217,181],[23,102],[-101,161]],[[37989,44381],[14,106],[-179,284],[-98,55],[-112,276],[-189,-104]],[[37425,44998],[-121,-22]],[[37304,44976],[-55,-351],[19,-275],[65,37],[67,-456],[-72,-47],[-43,-154],[-187,-292],[-59,-393],[12,-233]],[[78279,63544],[11,-289],[-20,-264],[57,-320]],[[78327,62671],[109,36]],[[78891,63340],[-245,218],[-106,171],[-77,-75],[-105,65]],[[63493,41323],[-46,-1668]],[[70197,44955],[434,-59]],[[70631,44896],[91,-16],[29,473]],[[70751,45353],[-91,58],[42,653]],[[70067,46160],[-35,-671],[189,-29],[-24,-505]],[[70175,48675],[257,-5]],[[70432,48670],[83,24],[62,-130],[268,-44]],[[70727,49785],[-391,70]],[[70336,49855],[-97,15],[-5,-110]],[[49482,49069],[16,2]],[[49498,49071],[-24,1344]],[[49474,50415],[-958,-61]],[[60852,36802],[-39,-1672]],[[75277,53765],[61,-168],[-32,-238],[68,-169],[-29,-187]],[[75387,53794],[-110,-29]],[[49467,51759],[190,9],[19,-1006]],[[49676,50762],[752,38]],[[50428,50800],[7,340]],[[50435,51140],[-20,1344]],[[59991,77332],[464,-8],[21,52]],[[60476,77376],[196,101],[2,110],[98,134],[38,1388]],[[60810,79109],[2,55],[-297,7]],[[60515,79171],[-338,0],[-536,30],[-81,90],[-86,-74],[-67,44]],[[59407,79261],[-19,-74],[76,-199],[-83,-234],[96,-90],[-60,-224],[-17,-393]],[[73998,31434],[380,-98]],[[74378,31336],[381,-94]],[[74759,31242],[138,1335]],[[60438,29245],[28,1280]],[[59538,30582],[-40,3]],[[66910,76495],[256,-31]],[[67166,76464],[15,335],[196,-24],[50,1287]],[[67427,78062],[-144,18],[3,106],[-96,9],[-54,-113],[-94,58],[-195,20]],[[66847,78160],[-64,-1651]],[[64540,69675],[298,-31],[-8,-225],[189,-20]],[[65019,69399],[7,239],[80,115],[87,-26],[-3,-138],[58,-110]],[[65248,69479],[24,643],[-47,164],[-22,-119],[-113,126],[8,133],[95,63],[34,118]],[[65227,70607],[-158,22],[10,329],[-385,41]],[[64694,70999],[-25,-668],[-81,9]],[[64588,70340],[27,-410],[-102,-110],[27,-145]],[[51731,34743],[572,14]],[[52303,34757],[193,4],[-3,334]],[[52483,36099],[-768,-17]],[[76299,50174],[184,-65],[41,-128]],[[76524,49981],[120,139],[82,3],[123,208],[123,129]],[[77009,50619],[-144,14],[-112,-73],[-46,46],[-52,246],[-112,-5]],[[69139,53235],[-16,114]],[[69395,54089],[-28,498],[-35,81]],[[69087,54867],[-194,-388],[-138,-395],[-95,-6]],[[45279,24301],[-75,2013]],[[45204,26314],[-1,2]],[[73922,51430],[-4,-184]],[[73918,51246],[479,-229]],[[74397,51017],[74,45],[97,226]],[[74568,51288],[5,64],[-311,332]],[[73928,51764],[-6,-334]],[[79549,57202],[-78,362],[-136,155]],[[79335,57719],[-121,-146],[-71,-262],[-81,32]],[[79062,57343],[-107,-292],[-76,-19],[14,-154],[-55,-102]],[[78838,56776],[70,-134],[57,-268]],[[71700,71084],[57,363],[-9,121],[105,315],[73,89],[-31,99],[67,219]],[[71852,73438],[-508,84],[-31,-144],[-86,-47],[-190,-345],[-76,19],[-59,-156],[-154,-72]],[[70748,72777],[-11,-164]],[[76061,68263],[77,-113],[148,43],[232,-46]],[[76532,68911],[-407,76],[-62,102]],[[72353,75376],[19,334],[50,-8],[29,254],[-61,102],[38,585]],[[72428,76643],[-139,-16],[-4,-227],[-1250,205]],[[71035,76605],[116,-238],[102,-339],[160,-248],[62,-243],[33,-476],[143,-161],[0,-158],[116,-18],[151,-159]],[[60980,62847],[22,223],[-90,235],[100,158]],[[60061,64217],[-387,15]],[[59674,64232],[-7,-339],[-32,-54],[125,-170],[61,-174],[72,-56],[95,-229],[115,-172]],[[75960,62935],[73,353],[115,-16],[22,324]],[[75443,63625],[-39,-521]],[[78313,67756],[17,-283],[182,-240],[-47,-163]],[[78708,66569],[60,70],[243,-42]],[[79011,66597],[56,49],[120,588],[60,46]],[[79265,67334],[-54,13],[-129,193],[-44,236],[-203,272],[-80,19]],[[78755,68067],[-82,138],[-42,-118],[18,-269],[-336,-62]],[[76034,71951],[54,-11],[49,153],[67,-10],[85,196],[179,-35]],[[76490,72884],[-5,188],[-274,53]],[[76211,73125],[-105,21]],[[76106,73146],[-8,-418],[-64,-777]],[[71851,41778],[-39,-611]],[[72288,41074],[79,1158]],[[72399,42736],[-482,98]],[[71917,42834],[-66,-1056]],[[70432,48670],[-64,-1199],[32,-6],[-19,-333]],[[46597,52580],[-764,-67]],[[45833,52513],[10,-358],[-24,-2],[54,-1678]],[[55472,46423],[666,-8]],[[56138,46415],[7,1120],[-11,328]],[[56134,47863],[-167,-8],[-97,59],[-164,-145],[-110,52]],[[55596,47821],[-166,-30],[11,-584]],[[70486,39337],[39,672]],[[70525,40009],[-281,46],[-25,283],[27,390]],[[69661,40148],[-23,-387],[189,-32],[-18,-285],[95,-16]],[[74566,52828],[255,-509],[101,84]],[[75277,53765],[-100,70],[-262,364]],[[74428,53792],[-136,-166],[-10,-266]],[[63376,44387],[-27,-999]],[[61678,74232],[-10,-504]],[[61668,73728],[521,-35]],[[62189,73693],[77,-4],[-18,185],[53,45],[1,193],[161,44]],[[62463,74156],[56,227],[-99,104],[47,97],[23,262]],[[62490,74846],[-23,171],[-191,15]],[[62276,75032],[-579,40]],[[61697,75072],[-19,-840]],[[59044,49660],[-958,-5]],[[58086,49655],[-95,-2],[-21,-336],[10,-685]],[[64994,52916],[500,-61]],[[65494,52855],[52,1465],[7,358]],[[65553,54678],[-164,14],[12,281],[-63,62],[-204,18]],[[65134,55053],[-4,-173],[-199,19],[-22,-881]],[[63529,54999],[95,-15],[4,169],[326,-18]],[[63954,55135],[88,-5],[4,190],[102,276]],[[64148,55596],[36,165],[7,275]],[[64191,56036],[-413,34],[-391,-7]],[[63387,56063],[-193,9],[-3,-225]],[[53214,40139],[4,0]],[[53961,40264],[-2,895]],[[53956,42165],[-756,-12]],[[90171,34599],[256,-254],[100,201],[9,188],[90,-131]],[[90626,34603],[97,-12],[-10,191],[-54,101]],[[90659,34883],[-83,191],[143,194],[-168,374],[-35,190]],[[90516,35832],[-65,-43],[-104,103],[-67,-168]],[[83134,28647],[623,-212],[194,-34]],[[83527,29876],[-250,88],[-6,-66]],[[83271,29898],[-100,-923],[-40,12],[-33,-330],[36,-10]],[[85474,29373],[189,-69],[11,81],[158,-54],[-45,-293]],[[86348,29857],[-14,198],[-152,-2],[-23,-172],[-369,154],[4,33]],[[85794,30068],[-214,99],[-106,-794]],[[74900,40142],[0,-202],[189,-55]],[[75089,39885],[2,26],[608,-47],[1,20]],[[75700,39884],[29,1062]],[[75729,40946],[-397,27],[-3,-58],[-390,34]],[[75700,39884],[169,-43]],[[76394,41129],[11,138],[-61,11]],[[76344,41278],[-501,100]],[[75843,41378],[-18,-439],[-96,7]],[[83382,36248],[80,686]],[[83308,38269],[-80,-70],[-53,171],[-101,71],[-73,-139],[-298,-69],[-118,18],[-103,-68],[-16,-182]],[[72881,52444],[-41,474],[57,121],[-9,334]],[[72790,53440],[-279,134],[-268,-24]],[[72027,52935],[130,-85],[8,-116],[90,-69],[-63,-203]],[[70437,52331],[141,-293],[36,22],[183,-225],[-93,-121],[69,-124]],[[71214,52189],[-121,91],[125,564]],[[71218,52844],[-238,393],[-105,-78],[-11,184],[-110,288]],[[70754,53631],[-158,-197],[-16,-179],[-88,-167],[-73,-15],[-48,172],[-60,-20],[65,-167],[-16,-153]],[[47809,22407],[1114,87]],[[48923,22494],[15,1]],[[47935,22884],[-74,-156],[-82,2],[-64,-107],[94,-216]],[[77073,56425],[20,71],[153,-29],[181,48],[85,158]],[[76747,57028],[-80,-195],[78,32]],[[74511,47962],[120,-86],[6,-134]],[[74637,47742],[51,41],[75,-137],[329,-152]],[[75092,47494],[-10,107],[92,-16]],[[75174,47585],[-22,222],[151,118]],[[75170,48295],[-132,249],[-160,178],[-112,2]],[[77770,58835],[-92,-18],[-189,263],[-9,163],[49,103],[22,253]],[[77551,59599],[-164,60],[-105,123],[-326,152]],[[76956,59934],[-21,-169],[108,-106],[41,-133],[-4,-224],[-43,40],[-222,-29],[-133,39],[-198,-35],[-69,32]],[[55360,71330],[665,-14]],[[56316,71116],[2,426]],[[56322,72821],[-21,98],[-74,-103],[-63,44],[-203,-184],[-230,16],[-236,-311]],[[55419,72253],[-59,-923]],[[88074,53015],[50,-901],[87,-64],[-56,-132],[-137,-63]],[[88018,51855],[434,-140]],[[88452,51715],[31,77],[-58,220],[60,250],[213,74],[74,-19],[175,200]],[[88947,52517],[17,68]],[[88964,52585],[-34,144]],[[88930,52729],[-437,175],[-419,111]],[[56948,80779],[224,8]],[[56709,83116],[-34,-135],[24,-201],[-88,-81],[-131,-662]],[[56480,82037],[-137,-678]],[[71352,46406],[407,-77]],[[71759,46329],[4,55],[374,-88],[99,-125]],[[72163,47481],[-173,-99],[-68,59],[-122,-85],[-67,94],[-90,-66],[-152,104]],[[71367,46628],[-15,-222]],[[49474,50415],[-6,336],[208,11]],[[62166,81290],[99,-127],[72,-201],[118,40]],[[62455,81002],[68,29],[-20,131],[37,186],[-52,65],[68,87],[-65,215],[112,-32],[33,126],[-80,317]],[[54323,21053],[2,-332]],[[54340,22052],[2,-667],[-19,-332]],[[65867,72894],[-10,-149],[96,-170],[98,-54],[211,-416],[105,13]],[[66521,73506],[27,670]],[[66548,74176],[-942,92]],[[65606,74268],[-48,-395],[96,-141],[-33,-182],[51,-215],[195,-441]],[[64939,72573],[161,-170],[24,-103]],[[65124,72300],[12,328],[378,-36],[20,335],[333,-33]],[[64688,74365],[-41,-676]],[[85188,58163],[-4,-69]],[[85184,58094],[368,-264],[87,-142],[174,-83],[202,21]],[[86015,57626],[8,289],[-21,372],[63,316],[155,165],[173,264]],[[85673,59341],[-126,-267],[-166,-103]],[[85381,58971],[-127,-310],[-74,-305],[8,-193]],[[80492,55812],[72,-116],[58,-242],[-52,-142]],[[80570,55312],[100,-187],[81,-33],[-26,-285],[74,-74],[122,-7]],[[80921,54726],[102,-155],[35,-139],[51,64],[66,-128],[99,89],[45,136],[94,-138]],[[81413,54455],[201,240],[24,346]],[[74185,39511],[290,-66],[8,111],[192,-44],[4,56],[379,-88]],[[75058,39480],[31,405]],[[74213,40788],[-36,-8],[-91,-1248]],[[52674,62004],[3,-336]],[[52677,61668],[932,19]],[[53609,61687],[2,239]],[[53611,61926],[-55,33],[-128,-128],[-94,74],[-7,1949]],[[53327,63854],[-68,-174],[-131,69],[-81,-148]],[[53047,63601],[-157,217],[-115,-85],[-114,0]],[[54770,62360],[1,-335]],[[55254,61349],[663,-6],[5,998]],[[55922,62341],[-83,-132],[-110,123]],[[55729,62332],[-89,-18],[-22,134],[-439,346],[-68,-78],[-140,44],[-67,164],[-138,-31]],[[54766,62893],[4,-533]],[[12267,12732],[488,247],[20,126],[125,60],[57,259],[136,186]],[[13093,13610],[-9,225]],[[12637,14349],[-990,-508]],[[11647,13841],[-90,-48],[90,-511],[484,247],[136,-797]],[[89071,36209],[-89,-80]],[[88982,36129],[-705,-647]],[[88277,35482],[192,-300]],[[73204,52214],[218,-57],[177,157],[120,-198],[183,164]],[[73769,52707],[-38,156],[-203,140],[-57,220]],[[73471,53223],[-110,-102],[24,-107],[-176,-405],[-203,-228],[-8,-145]],[[72488,55230],[-53,-130],[-130,-159],[-34,-331],[-51,104],[-116,-235]],[[52102,81053],[-250,807],[-301,524]],[[51431,82547],[-877,-1301]],[[56480,82037],[-320,520],[-89,-49],[-223,-264],[-123,29],[-25,-136],[-98,-102],[-76,133],[-157,133],[-252,45]],[[55117,82346],[-3,-595]],[[55114,81751],[-1,-353],[-51,-1120]],[[44083,72460],[962,98]],[[77883,53123],[62,-137],[80,-29],[93,-166],[-23,-287],[250,-357]],[[78363,52117],[38,293],[150,361],[281,134]],[[78832,52905],[73,237],[-180,159]],[[78109,53748],[-216,-310]],[[85124,42484],[-10,-114],[94,50],[-55,227],[-29,-163]],[[77358,37590],[24,-6],[50,648],[81,121],[20,229],[66,-14],[59,654]],[[77182,39359],[-58,-608],[-166,33]],[[66548,74176],[128,-15],[19,127],[38,893]],[[66733,75181],[-192,44]],[[66129,75321],[-279,64]],[[60855,46887],[199,-4]],[[61269,49198],[-246,-133],[28,-91],[-92,-126]],[[60959,48848],[-27,-95],[45,-175],[-62,-35],[-110,-206],[-39,-183]],[[60659,47973],[-14,-106],[210,-980]],[[34439,10541],[-131,1484]],[[32550,12813],[8,-112],[-193,-51],[28,-298],[-143,-36],[-253,-351],[145,-346],[-647,-176]],[[31599,10361],[51,-543]],[[50912,40757],[234,-437],[97,-94],[151,-258],[194,-134],[98,-224]],[[36373,58547],[4,-63]],[[37351,58179],[-35,414]],[[36187,61612],[42,-673]],[[36229,60939],[13,-342],[107,-1731]],[[86015,57626],[38,-214],[73,-99]],[[86845,57578],[25,370],[28,45],[97,664],[-25,639],[127,82],[33,-56]],[[87130,59322],[-181,718]],[[53609,61687],[11,-680]],[[54770,62360],[-831,-4]],[[53939,62356],[2,-685],[-101,149],[-102,-99],[-27,62],[59,182],[-159,-39]],[[50997,57260],[1140,37]],[[52137,57297],[2,0]],[[52139,57297],[-13,1655]],[[52126,58952],[-384,-11]],[[50976,58914],[14,-1150]],[[76461,49260],[117,39]],[[76578,49299],[10,354],[-74,219],[10,109]],[[76033,49871],[-7,-311]],[[38087,57210],[845,141],[-9,167],[764,117]],[[39687,57635],[44,251],[-25,119],[67,231],[10,327],[47,94],[-39,180],[-94,189],[20,315]],[[52472,37438],[-765,-18]],[[51903,38764],[175,4],[-2,239]],[[15213,18312],[-140,938],[176,97],[-100,642],[367,182],[-49,319],[573,255],[-49,324],[187,83],[-49,322],[561,251]],[[14409,21015],[-1039,-488]],[[18461,29211],[918,364],[965,370]],[[20344,29945],[12,6]],[[20356,29951],[-493,3755]],[[19863,33706],[-178,1343],[-374,-142],[-146,403]],[[19165,35310],[76,-564],[-560,-252],[88,-652],[-1296,-515],[-568,-236],[57,-393],[-850,-358]],[[16112,32340],[-33,-14],[148,-1027],[41,19],[100,-672],[-31,-13],[91,-660],[226,-1506]],[[84876,31477],[1041,-362]],[[85917,31115],[62,-24]],[[85979,31091],[267,1498]],[[86246,32589],[-119,220],[-1036,390]],[[85091,33199],[-215,-1722]],[[71218,52844],[226,88],[40,154]],[[71196,54381],[-313,-167],[-172,-21]],[[70711,54193],[79,-88],[-21,-173],[-67,-1],[52,-300]],[[71531,49741],[111,149],[13,271],[177,186],[122,-30],[127,193],[66,-174]],[[74568,51288],[15,60],[346,410],[48,23]],[[76773,53520],[46,157]],[[76938,54548],[-125,27],[-192,208],[-42,95]],[[76579,54878],[-21,75],[-425,74]],[[73818,47445],[100,-161],[140,-114]],[[74058,47170],[47,387],[176,193],[113,266],[83,30]],[[89068,56578],[106,112],[369,-206],[-1,-400]],[[89542,56084],[196,-10],[85,209],[-84,402],[8,169],[-70,242],[-311,517],[-316,-217]],[[88944,54787],[40,-128],[1,-220],[46,-253]],[[89031,54186],[84,-344]],[[89115,53842],[36,25],[251,-124],[210,-234],[77,129]],[[89689,53638],[-12,123],[71,185],[-57,315],[40,336]],[[89731,54597],[-411,116]],[[89320,54713],[-365,126],[-11,-52]],[[80270,46458],[159,-372]],[[80429,46086],[69,-237]],[[80498,45849],[110,137],[21,118],[80,33],[103,254]],[[80812,46391],[119,79],[-138,287],[-495,725]],[[80298,47482],[-160,-776],[132,-248]],[[35987,22941],[1217,258],[76,29],[1288,259]],[[38943,23557],[-16,520],[-62,1120]],[[36718,24798],[-14,-132],[-133,-107],[-67,-197],[-144,-168],[-88,38],[-102,-151],[1,-191],[-117,-144],[28,-53],[-56,-260],[27,-135],[-66,-357]],[[89171,31500],[88,117],[115,286],[114,-27],[44,124],[135,-64],[102,31]],[[89900,32183],[-89,79],[-86,240],[-41,463],[-135,401]],[[89549,33366],[-53,70],[-110,-200],[-134,15],[-6,-399],[-368,190]],[[88878,33042],[34,-377],[-82,-112],[136,-70],[3,-159],[91,-155],[111,-669]],[[74007,46650],[251,259]],[[74258,46909],[-203,88],[3,173]],[[73639,47093],[224,-172],[129,14],[-30,-207],[45,-78]],[[84603,56995],[1,189],[152,225],[65,196],[161,100]],[[84982,57705],[-55,170],[148,165],[109,54]],[[85188,58163],[-46,44],[-235,-110],[-138,243],[-174,515]],[[84270,58482],[-82,-78],[-141,-394],[-184,-768]],[[84873,59573],[283,-67],[225,-535]],[[85874,60651],[-161,275],[17,113],[-71,85],[-33,286],[-42,57]],[[84775,60454],[-24,-29]],[[52169,81118],[258,255],[225,305],[105,798]],[[55815,78633],[902,-1275]],[[56717,77358],[-5,147],[99,43],[24,303],[72,87],[36,338]],[[56943,78276],[-181,404],[-494,843]],[[81472,53814],[112,-20]],[[81584,53794],[397,-105]],[[81981,53689],[305,-58]],[[81413,54455],[-29,-193],[65,-205],[23,-243]],[[42801,8880],[996,142],[647,81]],[[44444,9103],[-47,1051],[81,10],[-14,329]],[[42735,10258],[66,-1378]],[[82869,66643],[12,-18]],[[84070,68878],[-90,177],[-65,-52],[-82,123],[-29,-99],[-94,76]],[[72930,57444],[69,194],[162,22],[87,177]],[[73248,57837],[-22,173],[68,335],[-68,209]],[[72862,58589],[-12,-68],[-248,-356]],[[72602,58165],[-110,-465]],[[51693,76562],[627,-589]],[[89576,57545],[75,-130],[227,-151],[21,-256],[75,22],[44,206],[65,81],[115,-25],[-87,-220],[149,61],[49,241],[-93,301],[-106,80],[-109,506],[-13,244],[-117,-25],[-25,-262],[-76,-39],[40,263],[-99,60],[293,114],[138,-548],[123,-368],[129,-301],[221,-670],[68,41],[-147,333],[-349,927],[-135,531],[-41,304],[-50,-207],[-249,-99],[-169,44],[-236,139],[-342,284]],[[47901,76752],[122,40],[44,230],[209,-70],[163,149],[151,-272],[66,65]],[[48869,76930],[-41,1993]],[[73901,35607],[26,339],[28,-5],[29,393],[72,95]],[[74056,36429],[16,222]],[[73310,36814],[-29,-398]],[[73281,36416],[-46,-634]],[[54983,85636],[51,-126]],[[55034,85510],[97,-173],[88,-64],[192,127],[145,-189],[56,-375],[171,-5],[73,-540]],[[55856,84291],[180,-74],[135,21],[16,150],[73,-10]],[[56260,84378],[-31,347],[345,997]],[[56574,85722],[-78,115],[-116,-58],[-12,289],[40,86],[76,-124]],[[56484,86030],[-25,173]],[[56459,86203],[-233,344],[-279,470],[-112,29],[-132,129]],[[80219,40097],[301,-75]],[[80520,40022],[9,223],[-39,104],[24,159]],[[80433,41247],[-705,122]],[[79728,41369],[-24,-320]],[[75484,44821],[57,80],[76,-170],[295,-517]],[[75912,44214],[371,-79]],[[76283,44135],[-3,430],[88,45],[1,206]],[[76369,44816],[-12,557]],[[76357,45373],[-374,226],[-106,17]],[[75877,45616],[-340,72],[-53,-867]],[[75542,35585],[38,453]],[[75644,36980],[24,334]],[[74907,37480],[-75,-942]],[[66848,27026],[336,-39]],[[67184,26987],[238,-30]],[[67490,28292],[-193,28]],[[67297,28320],[-7,-176],[-388,51]],[[66902,28195],[-54,-1169]],[[85308,36316],[359,-491],[112,-128]],[[85779,35697],[30,146]],[[85809,35843],[51,398],[112,-7]],[[85343,37685],[-168,108],[-109,-96],[105,-404],[-51,-208],[63,-265],[143,-325],[-18,-179]],[[47624,57076],[706,50]],[[48692,58803],[-10,584]],[[48682,59387],[-129,22],[-79,97],[-122,428],[-112,85],[-173,-80],[-147,-206],[-6,-346],[-142,37],[-73,282],[-138,116]],[[47614,57437],[10,-361]],[[46628,28440],[28,2],[20,-664]],[[46676,27778],[1085,91]],[[47760,29604],[-28,-64],[-182,28],[-193,-191],[-147,202],[-157,-60],[-240,-434],[-34,78],[-59,-155],[-111,22]],[[69472,56061],[94,-17]],[[69566,56044],[140,1026]],[[68863,56693],[29,-173],[-93,-519]],[[41760,67183],[86,-1835]],[[41846,65348],[1,-39]],[[41847,65309],[784,96]],[[47715,65136],[325,20],[18,-837]],[[48831,63991],[120,-138],[67,43],[-58,360],[39,206],[176,13],[14,96],[-94,26],[-17,118]],[[49078,64715],[34,184],[-147,2],[-112,355],[-22,412],[62,128],[-34,70]],[[48859,65866],[-302,-483],[-36,302],[-141,-80]],[[48380,65605],[-190,-90],[-40,159],[-176,-36],[-102,-162],[-157,-340]],[[79865,61167],[127,127],[35,149],[199,133],[124,177],[106,8]],[[80856,61895],[-80,337],[-34,20],[-80,350],[-179,288],[-61,405]],[[42233,20439],[1628,221]],[[43861,20660],[83,11]],[[79863,43997],[-41,146],[127,137],[48,269],[150,-23]],[[80147,44526],[-154,410],[-2,84]],[[79991,45020],[-102,100],[-196,-125],[-85,115]],[[79608,45110],[-97,-168],[17,-153],[-91,-57]],[[79437,44732],[228,-488],[198,-247]],[[66466,25746],[572,-56]],[[67038,25690],[86,-20],[60,1317]],[[66848,27026],[-534,74]],[[45424,20429],[23,-579]],[[45355,18215],[13,-329]],[[12669,9647],[108,15],[52,185],[-35,171],[77,181]],[[12642,11543],[-540,-250],[6,-37],[-372,-192]],[[11736,11064],[83,-454],[-14,-161],[104,-70],[35,-110],[40,-404],[-24,-441],[26,-34],[96,314],[66,81],[7,-125],[173,-4],[43,118],[95,-68],[69,47],[134,-106]],[[87429,35403],[107,-142],[-1,-322],[95,-295]],[[88277,35482],[-149,203],[-2,245],[-89,25],[-154,232],[-130,118],[-137,55],[-157,133]],[[87275,36326],[-321,-292]],[[86246,32589],[102,-9]],[[86348,32580],[188,660],[302,291],[250,25]],[[87088,33556],[-183,529],[-78,35]],[[86827,34120],[-158,-9]],[[86417,34329],[-109,0],[-2,240],[-264,166]],[[86042,34735],[-33,12],[-322,-480],[-48,12],[-349,-426],[-169,-414]],[[85121,33439],[-30,-240]],[[73968,58582],[40,73]],[[74008,58655],[-40,-73]],[[73248,57837],[136,-252],[91,-51],[366,126],[6,149],[88,36]],[[73935,57845],[55,246],[53,0],[-25,397],[-45,71]],[[73973,58559],[0,-111],[-167,130],[-206,-61],[-74,133],[-149,17]],[[61641,26233],[192,-14]],[[61833,26219],[36,1338],[-110,146],[-15,150],[78,85],[55,196],[-32,275]],[[61845,28409],[-161,-164],[-91,-182],[-243,-260]],[[61350,27803],[-108,-350],[-13,-180],[-56,-95],[-202,-169]],[[44086,55211],[835,79]],[[45784,55362],[214,19]],[[45998,55381],[-32,576],[-42,1344]],[[44009,57107],[50,-1342],[27,-554]],[[87088,33556],[49,-147],[159,-64]],[[87137,35086],[-14,-296],[-101,-125],[-33,-201],[-84,-9],[-78,-335]],[[45406,20844],[3,0]],[[47718,21066],[20,2]],[[47738,21068],[167,298],[12,204],[93,421],[-17,130],[-141,79],[-43,207]],[[46169,22729],[-829,-85]],[[56115,76578],[124,84],[74,-52],[49,168],[83,79],[0,194],[68,-13],[117,173]],[[56630,77211],[87,147]],[[55186,78499],[-21,-161],[89,-107],[-37,-170],[43,-241],[129,-181],[-66,-218],[-38,-303],[-67,-15],[14,-177]],[[49058,76851],[120,196],[109,-26],[29,117],[152,13],[39,88],[31,-157],[78,152],[-5,199],[76,-109],[18,212],[112,-29],[-27,263],[67,94]],[[49857,77864],[-14,123],[109,169],[-74,120],[45,135],[81,-113],[44,161],[-52,42],[83,145]],[[87576,48289],[163,143],[139,47],[137,-25],[82,100]],[[88097,48554],[57,28],[46,396]],[[88200,48978],[-106,142]],[[88038,49084],[-91,-193],[-86,170],[-48,-146],[-63,53],[-260,19]],[[87490,48987],[10,-244]],[[84594,44893],[103,-558],[73,28],[154,-431]],[[85101,44643],[-45,273],[-78,179],[-9,186]],[[84935,45503],[-108,16],[-144,-111],[-32,-113],[-103,-21],[46,-381]],[[48993,32455],[-1079,-77]],[[47928,30872],[8,-334],[-27,-4],[24,-905]],[[39549,84455],[-83,-82],[-263,-105],[-310,-380],[-209,-532],[-142,-44],[-109,-218],[-122,-160],[-128,-276],[-31,-368],[-76,-198],[-113,-423],[10,-193],[-37,-296],[50,-126],[14,-359],[-117,-486],[-170,-370],[20,-106],[-57,-593],[-43,-139],[-104,-108]],[[25609,49281],[-376,-114],[-17,165]],[[25216,49332],[-235,-72],[-10,96],[-371,-145],[19,-178],[-380,-121],[36,-339],[-196,-62],[-5,52],[-801,-260]],[[56745,75597],[916,-16]],[[57661,75581],[56,172],[17,357],[35,200]],[[57924,77951],[-135,-294],[-103,-69],[-41,-240],[-138,-77],[-81,-148],[-275,-43],[-262,-262]],[[56889,76818],[-52,-195],[-60,-5],[-82,-452],[-4,-215],[71,-50],[-81,-60],[64,-244]],[[53204,82066],[103,-140],[14,-167],[95,-56],[86,-155]],[[53502,81548],[421,-174],[238,-136]],[[54161,81238],[59,79],[133,-92],[95,54],[-9,148]],[[54439,81427],[116,80],[2,322]],[[54557,81829],[-127,71],[8,250],[-71,11],[88,261]],[[54455,82422],[-26,63],[-248,-165],[-447,117],[-129,1],[-70,77]],[[28446,34920],[-125,-41],[-25,235],[-118,79],[-344,-101],[-520,861]],[[27314,35953],[-534,140],[-662,-205],[-1382,-443]],[[24736,35445],[380,-3347],[43,-412]],[[52005,67619],[60,95],[-24,191],[67,88],[98,2],[69,-204],[147,40],[86,-201],[57,93],[22,200],[-73,148],[60,248],[138,40],[19,-311],[191,-296],[-15,-242],[92,2]],[[52999,67512],[-11,2051]],[[52988,69563],[-813,-71]],[[51982,69474],[23,-1855]],[[48354,66802],[26,-1197]],[[48859,65866],[30,472],[94,-14],[172,91],[168,-47]],[[49323,66368],[-28,1458]],[[54287,77275],[853,-787]],[[54276,78961],[-36,-125],[33,-210],[-72,-135],[-31,-326],[-64,-274],[24,-401]],[[51584,86049],[-281,383],[345,751]],[[51243,87725],[-92,-12],[-174,-194],[-179,106]],[[50798,87625],[-178,-376]],[[81074,51066],[-53,81],[323,413]],[[81270,51870],[-334,289],[-201,-44],[-98,139],[-140,297]],[[80497,52551],[-120,-194]],[[87081,50868],[333,-565]],[[87414,50303],[368,-594]],[[88207,50222],[-250,424],[-473,756]],[[87484,51402],[-110,-15],[-8,-556],[-82,98],[-118,14],[-85,-75]],[[85555,51314],[8,-741]],[[85901,50305],[26,82],[297,243],[127,-89]],[[86351,50541],[63,941]],[[86414,51482],[-157,-29],[-229,37],[-152,-113],[-143,-12],[-37,59],[-141,-110]],[[80147,44526],[227,21]],[[80560,45636],[-62,213]],[[80429,46086],[-41,-95],[-98,7],[-57,-359],[-113,-178],[-6,-195],[-123,-246]],[[79273,50584],[79,79]],[[79522,52063],[-179,134],[0,199],[-92,142],[-130,20]],[[79121,52558],[-37,-260],[-171,-354],[-44,-226],[-118,-61]],[[85364,52134],[191,-820]],[[86414,51482],[66,897]],[[86480,52379],[-485,159]],[[85763,52617],[-485,156]],[[75593,48902],[-155,334]],[[75438,49236],[-343,260]],[[75095,49496],[-176,-144],[27,-258],[-89,-96]],[[80674,53979],[798,-165]],[[80921,54726],[-60,-297],[-177,-341],[-10,-109]],[[85946,48976],[114,-27],[73,-181],[205,-2],[101,191]],[[86439,48957],[-16,210],[152,77],[-3,116],[93,106],[92,-134],[102,88]],[[86859,49420],[-137,330],[-84,28]],[[86638,49778],[-797,-146]],[[88425,47550],[107,22],[306,182]],[[88947,48165],[-54,153],[148,267],[60,23],[-243,217]],[[88519,48396],[-116,-161]],[[84574,43126],[164,60],[-2,-110],[77,-205],[83,-2],[10,138],[77,179]],[[84594,44893],[-451,-480]],[[84143,44413],[88,-506],[93,-211],[21,98],[130,-347],[40,58],[64,-230],[-5,-149]],[[79121,52558],[-78,61],[-101,187],[-110,99]],[[60746,22304],[193,-14]],[[61706,22240],[35,1319]],[[61554,23897],[-772,50]],[[12200,7276],[1069,557]],[[13269,7833],[-240,1500]],[[13029,9333],[-544,-281],[-64,347]],[[12421,9399],[-119,-38],[-132,107],[-46,-46],[-71,-291],[-48,-51],[-121,130],[111,-417],[71,-389],[70,-510],[37,210],[-68,308],[-52,442],[91,47],[-8,-268],[34,-190],[53,107],[111,-181],[-33,-413],[78,-104],[162,-98],[-67,-161],[-51,67],[-143,23],[-108,-231],[28,-176]],[[78744,49012],[239,-216],[190,-89]],[[79173,48707],[-69,169],[218,93],[142,17],[55,176],[-34,82],[122,193],[121,-114],[86,142]],[[79814,49465],[-259,212],[125,163],[-161,202]],[[79519,50042],[-114,-43],[-194,92],[-16,111],[-103,-212],[-71,19],[-58,-177],[-15,-194],[-82,-128],[52,-91],[-36,-147],[-71,-33],[-67,-227]],[[11859,46070],[140,-143],[207,0],[258,-60],[208,78],[102,-19]],[[12774,45926],[626,-657],[189,80],[24,-163],[133,-76],[37,-245],[587,-613]],[[14416,44426],[76,132],[43,-72],[124,64],[74,228],[19,401]],[[67791,25351],[35,-130]],[[67826,25221],[573,-82]],[[68399,25139],[-125,495],[-73,875]],[[67846,26564],[-55,-1213]],[[65486,45414],[286,-37]],[[66471,45972],[21,504]],[[65671,47421],[-102,12]],[[35060,45164],[191,-110]],[[35251,45054],[16,230],[125,198],[13,138],[369,75],[105,213],[-15,102],[150,224],[81,-51],[94,139],[106,-228],[161,23],[84,197]],[[36540,46314],[67,12],[133,356],[92,-23],[154,108],[-56,174],[-101,85],[-49,397],[-61,98],[94,235],[47,221],[-14,183],[157,475]],[[35632,49442],[-981,-201]],[[34651,49241],[-7,-399],[-65,-217]],[[71178,45308],[220,-46]],[[71681,45202],[78,1127]],[[71352,46406],[-88,17],[-51,-776],[-35,-339]],[[79497,76542],[85,-97]],[[79582,76445],[248,74],[46,197],[137,156],[314,-3],[49,56],[27,397]],[[80403,77322],[-202,26]],[[80201,77348],[-858,102]],[[79343,77450],[-43,-631],[67,-244],[130,-33]],[[84982,57705],[294,-931]],[[85349,56509],[392,130]],[[86879,29177],[196,-81]],[[87075,29096],[163,648],[-36,189],[104,697]],[[87306,30630],[-64,23]],[[87242,30653],[-665,234]],[[86577,30887],[2,-203],[-82,-381],[43,-13],[-61,-475]],[[89161,52225],[173,-168]],[[89334,52057],[193,402],[109,33],[100,166]],[[89736,52658],[143,317],[-460,-182],[170,188],[144,24],[-36,78],[-150,91]],[[89547,53174],[-294,-24],[-94,-483],[22,-79],[-20,-363]],[[69884,58494],[9,90],[-299,291],[-5,261]],[[38126,52113],[83,-117],[263,-135],[99,161],[84,19],[-61,134],[62,150],[-15,347],[52,224],[-51,38],[1,371]],[[38643,53305],[-66,1143]],[[38577,54448],[-116,-18]],[[39532,42828],[0,0]],[[39798,39133],[1483,215]],[[42081,39460],[-55,1151],[-45,685]],[[40926,43168],[-1370,-209]],[[39556,42959],[-155,-25]],[[39401,42934],[53,-1005]],[[39454,41929],[16,-336],[187,31],[141,-2491]],[[74458,62445],[11,-204],[126,-24],[-11,-169],[67,-42],[48,-462]],[[74699,61544],[6,-1]],[[74705,61543],[300,-60]],[[74912,62873],[-19,75],[-226,19]],[[74980,46563],[36,77],[284,72]],[[75300,46712],[122,-87],[134,44]],[[75556,46669],[-101,701]],[[75455,47370],[-159,19],[-122,196]],[[75092,47494],[-120,-910],[8,-21]],[[71851,41778],[-639,127]],[[71175,41299],[-7,-112],[638,-130]],[[73751,54208],[27,-285],[61,-153],[176,-628]],[[74063,54404],[-87,139],[-221,-183],[43,113]],[[68610,55296],[-69,-255],[-99,-166]],[[48507,54093],[-29,1472]],[[48478,55565],[-815,-64]],[[47663,55501],[-153,-12]],[[47510,55489],[34,-1484],[-28,-3],[9,-339]],[[85821,54642],[-263,-123],[-118,51]],[[91116,56056],[15,52]],[[91131,56108],[-308,429],[-101,207],[24,-238],[370,-450]],[[89731,54597],[244,-61],[-12,327],[149,-11],[77,-439],[107,90],[87,-13]],[[90383,54490],[52,-34]],[[90435,54456],[198,-73],[96,305]],[[90729,54688],[-111,231],[-60,255],[-21,271],[-66,38],[6,132],[-110,207],[-173,-22],[-185,80],[-268,-2],[-115,-114],[-126,-342],[192,-79],[-4,-172]],[[89688,55171],[-138,-58],[-148,-199],[-82,-201]],[[64204,70717],[-11,-345],[395,-32]],[[64694,70999],[-181,352],[3,83],[121,-15],[15,187],[-94,151],[151,140],[-106,114]],[[64603,72011],[-452,39],[-18,-674],[79,-415],[-8,-244]],[[78755,68067],[-13,210],[47,151],[-33,160]],[[78756,68588],[-155,-205],[-364,404]],[[78028,67829],[186,26],[99,-99]],[[50676,32545],[48,198],[252,261]],[[50976,33004],[1,466]],[[49429,33227],[19,-744]],[[83970,46853],[22,-131],[143,-26],[-40,246],[-125,-89]],[[54203,40154],[186,191],[254,-268],[115,49],[180,-3]],[[50424,27931],[588,27]],[[29993,74676],[-1790,-441],[-864,-222]],[[57548,65337],[4,-854]],[[57958,66539],[-415,22]],[[57543,66561],[5,-1224]],[[82263,61815],[113,148],[57,-22],[56,126],[-63,440]],[[82426,62507],[-428,260],[-41,83],[-157,17],[22,172],[-98,-95],[-176,-84]],[[81548,62860],[-120,-305],[-143,-461],[-17,-154]],[[12100,58185],[117,62],[-12,96],[-110,-35],[5,-123]],[[12559,54917],[106,47],[-12,79],[186,80],[46,108],[-23,162],[470,207],[-11,81],[168,71]],[[13489,55752],[167,2048],[-19,190],[-65,-6],[-37,256],[-215,-90],[-321,235],[-24,108]],[[12975,58493],[-144,-211],[-156,-133],[-129,-238],[-38,-440],[-141,-325],[-160,-298]],[[11421,60871],[95,16],[146,289],[-91,11],[-115,-121],[-35,-195]],[[14300,60238],[156,-345],[178,-167],[20,-148],[347,137]],[[15159,60077],[115,446],[74,76],[-20,179],[104,67],[88,211],[-238,401],[-14,109]],[[15268,61566],[-16,133],[-134,9],[-65,238]],[[15053,61946],[-62,-236],[-116,-124],[-84,-354],[-140,-256],[-83,-86],[-268,-652]],[[80835,84545],[487,-121],[10,109],[301,-81]],[[80897,85535],[-1,-606],[-58,-205],[-3,-179]],[[81407,71018],[612,-503]],[[82019,70515],[132,530]],[[82151,71045],[62,170],[134,154],[103,317],[111,-76],[145,219],[-58,171],[73,330]],[[82721,72330],[-82,22]],[[58011,30651],[12,938]],[[58039,32925],[-768,23]],[[57271,32948],[-13,-1333]],[[44156,52701],[13,-364]],[[44971,53775],[-851,-92]],[[38643,53305],[100,-24],[185,-225],[127,-82],[86,48],[233,-40],[103,-126],[9,-155],[61,-33],[199,-258],[33,-178],[176,-444],[200,-277]],[[41774,52415],[574,75]],[[40597,54758],[-584,-76],[-1165,-181],[-271,-53]],[[65782,48398],[17,335],[-193,25]],[[64797,48393],[80,-137]],[[64877,48256],[1,-168],[-290,-257]],[[81961,90993],[239,-56],[-28,-330],[393,-95]],[[83626,91247],[-986,250]],[[82640,91497],[-28,-400],[-67,-30],[6,-268],[-80,35],[-103,170],[97,463],[-138,114]],[[82327,91581],[-109,-51]],[[82218,91530],[-47,-135],[-210,-402]],[[69809,49775],[9,170],[-260,42],[7,138]],[[69565,50125],[-384,47]],[[68654,50011],[-9,-103]],[[63174,36970],[185,-17],[124,130],[59,-108],[161,-8],[175,-73],[111,160],[152,-14]],[[64141,37040],[-34,319],[8,228],[-112,98],[-75,169],[-214,62],[-101,205],[-215,57]],[[12555,22605],[69,-251],[269,130],[180,-469],[119,-156],[-29,-143],[21,-255],[-38,-208],[-84,-175]],[[14170,27368],[-902,-432]],[[11937,26259],[295,-1724],[323,-1930]],[[52828,86100],[-651,903]],[[68938,74469],[20,-1289]],[[68962,72867],[918,-137]],[[69880,72730],[-161,121],[42,380],[-96,490],[-88,44],[8,140],[88,90]],[[69673,73995],[11,120],[-94,46],[68,100],[-75,76],[-78,333],[82,254],[69,-42],[43,230]],[[69699,75112],[-709,105]],[[68990,75217],[-52,-748]],[[68974,71827],[13,-1356]],[[68987,70471],[3,-240]],[[68990,70231],[312,-62]],[[69982,71861],[-87,47],[-126,272],[-101,107],[-17,220],[147,105],[82,118]],[[58533,57624],[502,-21]],[[59514,57583],[39,-2]],[[59553,57581],[11,1454]],[[59564,59035],[-320,2]],[[59244,59037],[-128,1],[-64,-227],[-63,-57],[0,-223],[-81,-58],[8,-109],[-282,-2]],[[11739,51024],[1142,499]],[[12881,51523],[1798,760],[872,358]],[[15655,56510],[-1632,-644],[-471,-196],[-63,82]],[[12505,54894],[97,-656],[-149,-108],[64,-339],[-202,-67],[49,-328],[-249,-113],[49,-326],[-124,-56],[49,-328],[-204,-91],[16,-109],[-123,-285],[51,-328],[-189,-83],[99,-653]],[[83626,91247],[91,960]],[[83717,92207],[33,339],[-191,56],[35,388],[-321,88],[-58,-39]],[[83215,93039],[-163,-330],[-224,-187],[-16,-142],[-106,19],[34,134],[-94,61],[-113,-560],[-102,-144],[106,-95],[76,111],[27,-409]],[[82261,91868],[41,48],[195,645],[193,133],[47,-69],[103,43],[-160,144],[-215,-201],[-193,-580],[-11,-163]],[[82327,91581],[-58,38],[-21,169],[-30,-258]],[[35850,38392],[764,154]],[[36727,42751],[-46,10],[-643,-122]],[[36077,41977],[34,-513],[-674,-130]],[[35437,41334],[104,-1216],[96,19],[15,-222],[96,20],[102,-1543]],[[66093,52915],[0,-18]],[[66093,52897],[86,25],[33,-152],[520,-64]],[[66732,52706],[197,-10]],[[66929,52696],[38,1028]],[[66967,53724],[-359,24]],[[66608,53748],[-417,51]],[[66191,53799],[87,-48],[19,-169],[-40,-187],[-150,-363],[-14,-117]],[[48628,55575],[-150,-10]],[[69905,51107],[63,67]],[[69968,51174],[89,100],[100,15],[76,206],[96,-81],[42,-413],[90,-106]],[[68478,81607],[101,196],[44,242],[-12,424],[-71,256],[53,-491],[-17,-291],[-98,-336]],[[67590,81695],[275,-427],[-59,263],[111,185],[-101,177],[-25,-152],[-188,26],[-13,-72]],[[66608,82046],[41,192],[123,19],[89,-92],[-21,196],[103,140],[180,-70],[33,-303],[-18,-133],[162,-196],[17,-149],[218,138],[-112,123],[4,112],[106,44],[30,197],[99,-57],[71,-279],[109,68],[-17,183],[-95,14],[-75,153],[156,-28],[-22,99],[-245,128],[134,176],[76,-81],[-46,200],[-161,-103],[-74,190],[2,326],[-61,25],[-53,-278],[-73,6],[-9,217]],[[67279,83223],[-184,-19],[-113,-123],[-47,-135],[-167,-12],[-55,-149],[-83,41],[-109,-275]],[[66521,82551],[-39,-198],[-168,-79],[37,-171],[72,24],[185,-81]],[[28759,28781],[5,124],[-62,140],[-75,1],[-55,175],[23,258],[-55,142],[28,365],[86,-49],[141,41],[6,324],[41,83],[-34,353],[31,10],[-6,418]],[[28833,31166],[-32,-8],[-62,606],[-141,-42],[11,-110],[-231,-66]],[[27987,30580],[32,-245],[49,0],[39,-278],[-105,-229],[13,-138],[-63,-19],[-9,-228],[41,-464],[-86,-263],[-100,93],[-96,-3],[-68,96],[-3,-181]],[[27631,28721],[29,-137],[114,-94],[985,291]],[[45562,43729],[145,13]],[[77352,76141],[214,-44]],[[77566,76097],[9,136],[508,-96]],[[78083,76137],[80,1125],[15,320]],[[78178,77582],[-505,58]],[[77673,77640],[-146,17]],[[75451,75642],[-21,-206],[32,-271],[-20,-139],[37,-195]],[[75479,74831],[39,112],[168,-100],[222,-37]],[[76270,74993],[39,668]],[[75827,76478],[-193,27]],[[75634,76505],[-31,-120],[-156,-271],[-37,-340],[41,-132]],[[30040,26812],[110,-1140]],[[88708,40456],[-60,-17],[69,-268],[-62,2],[21,-420],[-169,119]],[[88507,39872],[-347,-579]],[[76548,29328],[49,246],[157,448],[-51,208],[-6,461],[38,172],[-41,610],[-113,256],[-61,-10],[-62,156],[-9,-215],[-59,-76],[119,-301],[-137,-27]],[[76372,31256],[-42,-78],[-76,-725],[-393,108]],[[63756,64442],[854,-63]],[[64610,64379],[72,276],[-31,169]],[[64651,64824],[-33,158],[51,190],[-24,94],[-138,148],[8,186],[-65,25],[12,-180],[-143,29],[46,221],[-41,104],[-122,61],[-20,238],[-111,-133],[-46,115],[86,119],[131,-16],[-31,177],[-138,-94],[-79,182]],[[63996,66452],[-299,27]],[[63697,66479],[69,-102],[-32,-124],[57,-159],[-38,-125],[31,-337]],[[9545,40922],[135,90],[55,116],[156,-47],[134,44],[83,123],[118,-21]],[[10226,41227],[30,154],[156,92],[115,-84],[54,-112],[137,69]],[[10590,42398],[-730,41],[-79,-148],[34,-48],[-59,-168],[-211,-174],[-40,-269],[-63,-140],[-76,-3]],[[9366,41489],[-119,-110],[-36,-230],[114,-5],[16,-111],[116,44],[88,-155]],[[92519,30002],[70,-48],[34,333],[105,-70],[66,45],[130,-191]],[[93447,31131],[-61,-24],[-163,75],[-24,98],[-109,-41],[-233,173],[-30,-177],[-124,417],[-61,2],[-71,194]],[[92571,31848],[-35,-225],[29,-297],[-94,-84],[-155,-238],[-233,-142]],[[92083,30862],[-35,-123],[260,-155],[-37,-150],[107,-97],[38,-161],[103,-174]],[[70336,49855],[17,328],[-94,16],[-31,243],[-96,28],[-172,526],[8,178]],[[69638,50983],[-17,-362],[-40,7],[-16,-503]],[[72055,48728],[-14,-270],[183,-91],[50,-234]],[[72741,47872],[126,-26],[122,56]],[[72989,47902],[8,240]],[[72997,48142],[-100,236],[-180,146],[-38,237]],[[72679,48761],[-44,315],[-103,143],[-95,-57]],[[82137,83197],[572,-148],[-30,-330],[39,-10],[-83,-863]],[[82635,81846],[76,252],[171,70],[84,283],[69,-14],[31,118],[223,247],[34,331],[-22,74]],[[83301,83207],[-78,231],[19,148]],[[82917,85361],[-585,158]],[[74773,45850],[191,532]],[[74964,46382],[-299,328]],[[74665,46710],[-91,-153],[28,-216],[-52,-145],[8,-190],[-74,-92],[-48,-277]],[[74436,45637],[79,-115],[61,229],[197,99]],[[63946,78465],[221,-19]],[[64614,78404],[-64,226],[40,201],[-21,116],[51,171],[-16,362]],[[63753,79823],[-24,-15]],[[63729,79808],[-26,-172],[151,-380],[60,-650],[32,-141]],[[79242,78878],[55,-211],[-15,-122],[68,-174]],[[79350,78371],[20,-128],[129,-111],[159,-3],[194,143],[230,113]],[[80082,78385],[110,1330],[69,63],[-65,145]],[[80196,79923],[-113,108],[-25,99]],[[63067,78536],[879,-71]],[[63729,79808],[-41,-15]],[[63021,78651],[46,-115]],[[62897,78377],[122,-8],[8,190]],[[62849,78479],[48,-102]],[[97917,17647],[84,122],[10,231],[-79,75],[-76,-426]],[[97633,18829],[27,-143],[42,237],[-69,-94]],[[97421,17896],[20,-151],[117,-211],[42,177],[116,210],[-35,153],[-96,90],[-81,-41],[-26,-244],[-57,17]],[[97207,17459],[9,305],[-32,42],[33,302],[92,-20],[-59,124],[76,128],[-21,170],[-153,63],[-30,263],[-83,44],[18,189],[-55,59],[-9,-300],[-56,-24],[-65,179],[-20,-201]],[[96852,18782],[-13,-197],[60,-3],[41,-206],[-71,-136],[-11,-143],[-100,-257],[-106,47],[-99,-157],[-34,-189],[55,-83]],[[75079,32521],[757,-221]],[[75836,32300],[345,-96]],[[76181,32204],[-57,398],[-217,184],[-80,326],[37,576],[-84,104],[16,140]],[[75796,33932],[-212,-203],[-382,121]],[[66121,62853],[35,857]],[[66156,63710],[-343,38],[-4,55],[-199,214],[-265,-167],[-49,139]],[[65296,63989],[-22,-523],[-186,19]],[[65088,63485],[92,-190],[-5,-169],[-114,-160]],[[86763,41235],[1,-2]],[[87246,41081],[99,118],[64,-33],[22,180],[187,141]],[[87618,41487],[-112,375],[-79,129]],[[87427,41991],[-93,-77]],[[64988,52746],[60,-121]],[[65048,52625],[172,-599],[100,-218]],[[65320,51808],[64,13],[94,-149],[117,183],[74,23],[121,156]],[[65790,52034],[18,166],[90,28],[65,133],[110,52],[20,230],[75,150],[-75,104]],[[66093,52915],[-124,-18],[-23,-107],[-120,88],[-332,-23]],[[63784,46749],[84,516],[-49,138],[98,453]],[[63917,47856],[-236,112],[-1,129],[-218,-8],[-41,59]],[[56760,15741],[32,1647],[3,659],[-195,4]],[[56600,18051],[-578,8]],[[56022,18059],[-16,-1324]],[[56006,16735],[-4,-657],[-22,-331]],[[57180,55736],[-689,13]],[[56491,55749],[-116,2]],[[56375,55751],[-11,-1314]],[[53430,22707],[911,11]],[[54553,23382],[-2,659],[23,241]],[[53998,23706],[-80,-189],[-150,-125],[-104,-15],[-74,-174],[-44,-222],[-116,-274]],[[89533,40193],[148,151],[129,382],[-6,193],[72,361],[101,93],[95,276]],[[90072,41649],[-123,-17],[-14,177],[-133,108],[-85,301],[-280,127]],[[89245,41179],[-63,-383]],[[21607,21951],[694,267]],[[21727,23354],[-228,-29],[-74,-200],[-63,-25],[-18,-179]],[[21344,22921],[140,-501],[-36,-266],[76,-28],[83,-175]],[[73281,36416],[-641,142]],[[80039,81277],[318,-52],[39,77],[192,-55]],[[81093,81432],[93,1017],[-254,66],[52,642]],[[80984,83157],[-138,171],[-157,-57],[-122,186]],[[80567,83457],[-20,-230],[-118,-57],[2,-272],[-47,-34],[-333,3],[-96,205],[-93,-308],[-17,-189],[-156,-50]],[[80720,77284],[-78,9]],[[80642,77293],[-239,29]],[[79582,76445],[-96,-1195]],[[70882,35980],[-67,-1194]],[[70815,34786],[755,-128]],[[71151,35930],[-269,50]],[[66266,62836],[528,-57]],[[66794,62779],[24,576],[97,-12],[43,1005],[96,-13]],[[66288,64537],[-21,-504],[-96,11],[-15,-334]],[[71753,31920],[-384,71]],[[44621,39763],[1338,136]],[[45959,39899],[-34,1179]],[[44585,40741],[35,-972]],[[44620,39769],[1,-6]],[[91624,36472],[9,479],[58,833],[-37,307],[-135,748],[-51,77]],[[91468,38916],[-114,50],[-90,-197]],[[91264,38769],[25,-163],[-89,-667],[-425,-1043]],[[90775,36896],[194,-446],[242,-75],[57,181],[141,-22],[71,-147],[85,155],[59,-70]],[[69163,44600],[254,-42]],[[69729,44512],[16,336],[-66,8],[52,1005]],[[69110,45956],[-5,-207],[111,-152],[-26,-497]],[[85917,31115],[-123,-1047]],[[86577,30887],[-598,204]],[[73865,46508],[146,37],[-4,105]],[[73352,47426],[-59,-855]],[[56023,18390],[-1,-331]],[[56600,18051],[24,1561],[74,95]],[[40396,29562],[1359,193]],[[41662,31680],[-73,1490]],[[57140,50029],[521,10],[97,79],[331,1]],[[58089,50119],[-5,898],[44,0]],[[58121,51702],[-135,-78],[-183,34],[-651,-17]],[[50879,44096],[20,-1341]],[[51663,42783],[-16,1343]],[[51647,44126],[-187,-6]],[[51460,44120],[-581,-24]],[[73115,47296],[-171,59],[-30,162],[75,385]],[[90799,32714],[586,304]],[[91385,33018],[3,314]],[[91388,33332],[-7,144]],[[91342,33821],[-68,-70],[-82,143],[-6,136],[-105,-55]],[[91081,33975],[11,-137]],[[91092,33838],[-5,-150],[-88,-392],[-144,-2],[-95,-119],[39,-461]],[[91073,31859],[686,-456]],[[91759,31403],[27,269],[154,265],[-338,583],[165,285],[10,101]],[[91777,32906],[-23,153],[-101,185],[2,141]],[[91655,33385],[-267,-53]],[[91385,33018],[-58,-498],[-196,-392],[16,-177],[-74,-92]],[[83024,27661],[18,150]],[[83042,27811],[-76,-12],[-140,146],[-203,8],[-151,188],[0,121],[-83,16],[-106,-143],[-118,39]],[[82165,28174],[-93,-17],[26,-264],[-93,-436],[355,-325],[301,-251],[263,-137]],[[80073,54856],[177,113],[153,263],[167,80]],[[80026,55957],[-53,-210],[-156,-146],[5,-219],[-45,-47]],[[54679,24376],[1244,-9]],[[55556,25902],[-25,-131],[-186,-243],[-90,-205],[-102,-121]],[[52708,55745],[703,13]],[[53411,55758],[-8,837],[-125,54],[-21,93],[-98,-32],[-77,250],[-175,-63],[-59,66],[32,315],[-23,35]],[[52857,57313],[-718,-16]],[[52137,57297],[15,-1563]],[[68028,52539],[27,679]],[[67552,53621],[-42,-1010]],[[88522,33482],[63,-267],[58,-58]],[[88643,33157],[235,-115]],[[89549,33366],[39,-23]],[[36229,60939],[-1713,-347]],[[28120,24889],[-472,-146],[104,-988]],[[71815,21877],[7,119],[79,-12],[85,224],[53,-85],[362,-65]],[[72401,22058],[21,333]],[[71400,22571],[9,-245],[231,-376],[175,-73]],[[71033,20248],[123,104],[-12,121],[-115,-102],[4,-123]],[[70925,21159],[19,-326],[43,-121],[-3,-187],[103,3],[51,546],[-100,163],[-113,-78]],[[70780,20656],[76,-41],[-20,182],[-56,-141]],[[74820,33948],[121,1366]],[[74750,35370],[-785,221]],[[61350,27803],[-352,26],[7,330]],[[60245,27872],[-14,-665],[191,-12],[-7,-333],[300,-16]],[[57137,47397],[-8,-1144]],[[57129,47575],[8,-178]],[[52685,60663],[7,-839]],[[52692,59824],[931,17]],[[52677,61668],[8,-1005]],[[67819,62647],[-66,9]],[[67402,62701],[-328,43]],[[67074,62744],[-39,-1552]],[[57078,10841],[61,-44],[186,44],[62,185],[325,13],[244,43],[61,221],[19,205],[223,-14],[264,-119],[2,-175],[161,-82],[11,-58],[208,-70],[45,70],[134,-23]],[[59145,13821],[-1049,22],[2,199],[-971,36]],[[57093,12102],[-15,-1261]],[[54634,16748],[-195,2]],[[54439,16750],[-972,-7]],[[69064,46357],[-181,-57],[-349,68]],[[68390,45599],[-23,-391],[92,-15]],[[55422,16746],[584,-11]],[[54468,18399],[2,-988],[-30,0],[-1,-661]],[[54507,36992],[770,10]],[[54535,37697],[76,-71],[-44,-102],[55,-290],[-115,-242]],[[64651,64824],[323,358]],[[64926,66541],[11,336]],[[64937,66877],[-378,29]],[[40959,61028],[447,61],[18,-26],[68,-1316]],[[42090,59825],[-20,450]],[[42070,60275],[-75,1689]],[[41957,62844],[-438,-56],[-15,342],[-192,-27],[-16,336],[-191,-28],[-15,335],[-382,-56],[-16,336],[-59,-7]],[[40633,64019],[-383,-56]],[[39956,63247],[77,-1392]],[[90659,34883],[258,-139],[29,55],[142,-60]],[[91088,34739],[-50,209],[3,167]],[[91041,35115],[17,143],[67,18]],[[91125,35276],[-14,188],[-180,542],[-132,191]],[[90799,36197],[-6,-79],[-257,-101],[-20,-185]],[[83250,43925],[423,436]],[[83673,44361],[152,157]],[[83825,44518],[-37,243],[17,163],[-50,14],[-89,558],[-13,187]],[[83653,45683],[-124,296]],[[63153,69339],[35,1473]],[[63188,70812],[-1132,78]],[[62056,70890],[-118,-231],[26,-337],[-50,-18]],[[64937,66877],[22,670]],[[64959,67547],[60,1852]],[[64540,69675],[-89,7],[-31,-995]],[[64904,63610],[184,-125]],[[65296,63989],[-53,105],[34,196],[-40,84],[85,268]],[[65322,64642],[7,167]],[[64610,64379],[50,-187],[16,218],[72,-27],[71,-152],[-20,-100],[-129,8],[-43,-117],[87,-273],[9,278],[82,2],[28,-105],[-17,-268],[-49,-227],[75,-12],[62,193]],[[60264,41748],[55,108],[17,235],[-52,210],[73,141],[-23,251]],[[59179,42602],[-24,-760]],[[79863,43997],[37,-329],[34,-13]],[[79934,43655],[17,-160],[291,-160],[54,-101]],[[80296,43234],[80,23],[35,-203],[92,86],[15,255]],[[80177,42528],[137,-299]],[[80296,43234],[-78,-435],[-151,80]],[[80067,42879],[110,-351]],[[82535,51359],[82,-61]],[[82617,51298],[53,160],[9,336],[-25,172],[-51,2],[-78,338]],[[82525,52306],[-172,201],[-65,157],[6,205],[-87,13],[-22,159]],[[82185,53041],[-378,-766]],[[40788,13162],[-193,-32],[-58,985],[-65,-11],[-76,1316]],[[40396,15420],[-648,-111],[-20,333],[-193,-34],[20,-333],[-193,-35]],[[39047,12216],[-2,-232],[54,-156],[117,46],[132,135],[217,9],[100,125],[19,-100],[123,136],[37,-109],[78,105]],[[55596,47821],[1,721]],[[54829,48545],[-1,-883],[-158,-107]],[[53317,28028],[697,5]],[[65152,79693],[-658,65]],[[63132,18497],[66,-28],[138,76]],[[64126,19479],[46,1210],[-179,20]],[[63593,20753],[-25,-661],[-191,23],[-10,-329],[-196,18],[-39,-1307]],[[40333,75374],[535,73]],[[41867,75573],[60,8]],[[41870,76951],[-117,89],[-190,-344],[-143,-99]],[[41420,76597],[-323,-38],[-117,-89],[-26,-150],[-131,43],[-118,-90],[-125,-6],[-70,-306],[7,-464],[-184,-123]],[[49323,66368],[77,140],[186,92],[90,125],[123,-26],[79,-117],[69,31]],[[50271,67865],[-976,-39]],[[52140,95618],[125,719]],[[52265,96337],[-39,-1]],[[52226,96336],[-76,-499],[-168,-56],[125,-85],[-17,-79]],[[51835,95612],[48,177],[5,275],[66,4],[59,263]],[[52013,96331],[-82,-1],[-116,324],[-156,2],[-8,91],[-673,-205]],[[50978,96542],[3,-324],[-286,-68],[102,-615]],[[62395,72798],[41,-148],[95,90],[61,-208],[107,45],[72,-220],[64,3],[59,-221]],[[62894,72139],[76,-6],[10,327],[282,-22]],[[63244,72609],[-47,169],[25,341]],[[63222,73119],[-296,26],[-116,146],[-3,95],[-111,47],[-17,354],[-98,247],[-118,122]],[[62189,73693],[35,-333],[118,-338],[53,-224]],[[61940,41599],[64,171],[96,29],[18,148],[94,162],[59,2],[12,186],[71,98],[110,12]],[[62464,42407],[-68,144],[-50,366]],[[62346,42917],[-766,26]],[[61580,42943],[-3,-168]],[[81225,41857],[90,74],[328,-88],[368,470],[53,26]],[[82064,42339],[-126,236],[-100,89],[-64,-41],[-124,68]],[[81650,42691],[-159,-120],[-370,-29]],[[79088,44220],[40,-148]],[[79128,44072],[54,-61],[19,-193],[173,-12],[-3,-277],[163,-323],[151,227]],[[79685,43433],[95,145],[108,-5],[46,82]],[[79437,44732],[-305,-191]],[[81650,42691],[42,467],[67,92]],[[81704,43772],[-120,70]],[[81584,43842],[-525,-100]],[[38177,8077],[1575,305]],[[39752,8382],[-21,333],[-59,-11],[-20,326],[193,35],[-61,979],[323,58]],[[94658,24704],[12,-29]],[[94670,24675],[103,-27],[-37,-194],[66,-153],[117,7],[21,-220],[147,-172],[139,33],[42,-65]],[[95268,23884],[166,635],[165,84],[48,-167],[96,71],[-47,334],[-46,-28],[-202,266],[-73,54],[62,78],[-48,256],[-95,112]],[[95190,25623],[-62,-96],[-5,-191],[-61,2],[-20,-301],[-115,92],[-224,-128],[21,-59],[-66,-238]],[[79067,55087],[77,-111],[118,47],[237,-393],[89,-109]],[[79758,55427],[-129,596],[-80,77]],[[79283,55968],[-86,-276],[-155,-38]],[[70592,55863],[524,-108]],[[71116,55755],[306,-65],[50,65]],[[71185,56688],[-48,185],[-65,49],[-163,-100]],[[70909,56822],[-130,73],[-36,-84],[-217,-209]],[[70526,56602],[-16,-364],[-29,-45],[15,-311]],[[63141,68667],[192,-16],[3,170],[194,-7],[23,-173]],[[63584,68762],[64,113],[-89,238],[120,-63],[5,-174],[74,89],[-7,165],[-130,63],[72,136],[96,-60],[43,-229],[55,83],[-143,311],[4,200],[84,229],[55,-194],[45,63],[-83,196],[17,290],[-30,55],[-148,-26],[-30,126],[148,162],[-71,210]],[[63735,70745],[1,28]],[[63552,70785],[-318,22]],[[63234,70807],[-46,5]],[[71917,42834],[-123,86]],[[71794,42920],[-510,96]],[[70911,40618],[350,-67]],[[70938,41115],[-27,-497]],[[71794,42920],[-11,278],[42,609]],[[71334,44141],[-129,28]],[[70528,43383],[-533,81]],[[65124,72300],[85,-12],[149,-175],[77,-178],[149,-29],[278,-339],[124,-535]],[[65986,71032],[438,-70]],[[71243,16655],[266,-60],[168,-78],[-98,295],[10,368],[31,216],[-41,72],[75,165],[117,-60],[222,120],[175,-195],[74,-4],[71,253],[198,-140],[49,-241],[254,-53],[34,-134],[150,-18],[34,93],[-29,335],[69,383],[25,306],[-155,41],[-34,223],[193,-58],[47,103],[118,48],[-58,163],[143,199],[71,-11],[127,113],[26,-124],[88,96],[15,-218],[-92,-180],[84,30],[207,-96],[87,36],[97,279],[100,81],[-41,222],[-75,81],[-157,-91],[-168,88],[-183,-98],[-208,80],[-155,-40]],[[73174,19245],[-195,16],[-23,-328],[-191,40],[-25,-327],[-1153,234],[-24,-331],[-191,38]],[[72376,19856],[67,-9],[39,130],[375,129],[-83,211],[-132,-33],[-266,-428]],[[73174,19245],[-211,130],[-116,24],[-65,107],[-181,-178],[-70,86],[-65,-228],[-69,37],[-80,-84],[-49,108],[26,201],[-76,122],[83,339],[-66,81],[-140,-112],[-24,-96],[-125,-99],[-152,-260],[-241,-124],[-69,36],[-225,-139],[-68,53],[-218,7],[-112,254],[-78,258],[-50,36],[-180,-43],[-82,60]],[[70471,19821],[-65,-1049]],[[81622,76132],[73,90],[119,-19],[179,128],[129,-25],[221,56],[93,-74],[91,39]],[[82527,76327],[36,36],[4,375],[31,345]],[[82598,77083],[-155,-182],[-40,179],[-70,-37],[-67,-163],[-112,123],[-107,-16],[-19,149],[-153,300],[-351,841]],[[81524,78277],[-31,-337]],[[82064,42339],[80,42]],[[74820,60113],[149,112],[161,248]],[[74705,61543],[21,-111],[-64,-64],[-86,-376],[105,-609]],[[78432,77553],[487,-57]],[[78919,77496],[164,-17]],[[79083,77479],[102,591],[56,179],[109,122]],[[79012,78931],[-194,45],[-12,-167],[-672,153]],[[78134,78962],[56,-121],[-49,-144],[90,-73],[54,-200],[-50,-272],[53,-130],[123,-84],[55,-125],[-34,-260]],[[65248,69479],[91,-151],[-82,-129],[278,132]],[[66339,69702],[-124,416],[8,177],[-83,252],[-33,267],[-121,218]],[[65986,71032],[-711,-428],[-48,3]],[[67489,56858],[19,-2]],[[59445,26855],[-2,-167],[134,26],[55,-142],[200,-12],[-6,-331],[96,-4],[-7,-323]],[[58917,54023],[772,4]],[[59689,54027],[192,-2]],[[58958,55293],[-4,-708],[-37,0]],[[58917,54585],[0,-562]],[[73868,67488],[536,-89],[90,20]],[[74494,67419],[34,206]],[[74709,68745],[13,81]],[[74056,68956],[-112,24]],[[35202,73193],[-453,-83],[-31,328],[-46,66],[59,270],[133,198]],[[34864,73972],[-1444,-287]],[[85779,35697],[112,-284],[162,-585]],[[86053,34828],[-11,-93]],[[86690,35245],[-235,58],[-646,540]],[[47547,26399],[-176,-154],[55,-469],[-23,-117],[-134,-141]],[[94649,21508],[-62,260],[-49,-164],[-101,139],[-64,-234],[-35,150]],[[93636,21096],[-126,-467],[301,-227],[-95,-380],[31,-197],[-71,-84],[-119,-399]],[[82733,50539],[73,-128],[100,-2],[76,153],[-96,309],[-156,-154]],[[62938,38680],[0,1]],[[56532,40695],[4,667],[26,0],[1,587]],[[56563,41949],[-484,-5]],[[82867,63045],[-176,169],[-310,-374],[45,-333]],[[27283,27992],[-99,937],[306,94],[141,-302]],[[9941,18826],[527,284],[-60,340],[91,45],[-57,312],[82,41],[-111,639],[92,49],[-106,630],[-95,-33],[-56,320],[-93,-48],[-111,634],[-9,137]],[[9103,21025],[145,-394],[215,-687],[-8,-147],[125,-117],[141,-268],[220,-586]],[[12555,22605],[-185,-90],[-127,164],[-157,-74],[-9,54],[-210,71],[-129,167],[-57,-50],[-62,172],[-247,-109],[-106,38],[-221,-126],[-155,136]],[[9941,18826],[258,-880]],[[63380,31555],[-117,197],[-162,192],[-151,74],[-190,284],[-153,31]],[[62607,32333],[-43,-351]],[[62564,31982],[-6,-198],[179,-491],[-87,-216],[-180,-186],[9,-220]],[[82431,48105],[207,-68],[106,209],[240,-41],[114,127],[66,-138]],[[83164,48194],[76,27],[-79,411]],[[82607,49247],[-25,-43],[-171,300],[-143,-82]],[[82268,49422],[-87,-47],[-66,-160]],[[82586,48811],[73,-8],[-57,-205],[-16,213]],[[81237,50492],[174,171],[104,-116],[237,-375],[68,-51],[88,202]],[[81908,50323],[112,388]],[[80082,78385],[98,53],[116,-127],[49,-213],[-52,-213],[-70,-66],[-81,-308],[59,-163]],[[80642,77293],[145,1697]],[[80787,78990],[14,116],[-111,141],[-82,349],[104,168]],[[80500,80244],[-158,-78],[-87,-242],[-59,-1]],[[59447,25250],[-51,-107],[-123,6],[-76,123]],[[59197,25272],[-36,-77],[-21,-484],[-30,2]],[[59110,24713],[-7,-340],[327,-15]],[[31046,41948],[332,-3828]],[[32873,39059],[-140,1679]],[[32733,40738],[-173,2148]],[[32509,43508],[-105,115],[-1549,-409]],[[30855,43214],[8,-378],[120,-501],[124,-152],[96,-195],[-157,-40]],[[82617,51298],[59,-167],[131,-83],[94,111],[167,-394]],[[83068,50765],[230,62],[91,119],[190,386]],[[83579,51332],[-10,731]],[[82893,52504],[-62,-167],[-306,-31]],[[33746,90799],[108,-101],[94,166]],[[56269,45973],[90,137],[17,119],[124,181]],[[56500,46410],[-362,5]],[[93717,27940],[485,-193],[11,57]],[[94440,29167],[-257,136],[-343,20],[-167,-113]],[[93673,29210],[112,-205],[-59,-298],[-85,36],[-68,-459],[188,-85],[-44,-259]],[[93381,29855],[80,-109]],[[93461,29746],[130,-68],[-31,-138],[91,-173],[22,-157]],[[94462,29329],[88,677],[-64,48],[54,245],[-36,112]],[[94504,30411],[-147,-4],[-111,132],[-103,34],[-69,111],[-83,-56],[-39,142],[-201,132]],[[13093,13610],[50,-90],[146,128],[63,-371]],[[13352,13277],[143,72],[28,-100],[1240,600]],[[14763,13849],[30,248],[102,164],[-18,295],[-50,132]],[[14827,14688],[4,117],[-114,40],[31,365],[43,10],[-21,201],[-105,63],[-95,-42],[-55,76],[-12,258],[87,197],[-43,60]],[[58841,76532],[-118,-94],[-164,169]],[[57661,75581],[-55,-221],[-58,-82],[-3,-192]],[[79617,37363],[315,-83],[-10,-112],[123,-32],[10,110],[500,-137]],[[80652,38104],[-184,140],[-43,143]],[[80425,38387],[-137,-18],[-192,43]],[[79677,38025],[-60,-662]],[[13207,48882],[80,34],[-51,326],[93,42],[-73,494],[-94,-44],[-85,488],[-196,1301]],[[11739,51024],[-34,-16]],[[7879,32279],[780,399]],[[9518,33930],[-33,185],[50,182],[-69,483]],[[9466,34780],[-40,186],[-228,-72],[-72,25],[-80,345],[36,363],[-13,339],[-124,189],[-52,-27],[-90,364],[41,51],[19,282],[69,32],[1,390],[179,291]],[[9112,37538],[-428,-223],[-100,2],[-19,113],[-386,-185],[-18,110],[-216,-115],[-63,8]],[[7882,37248],[-139,-381],[-82,-332],[2,-147],[123,-208],[18,-136],[-37,-911],[22,-351],[69,-278],[148,-352],[0,-209],[43,-298],[-35,-175],[35,-421],[-71,-162],[-6,-191],[-93,-417]],[[39881,46385],[-633,-103]],[[49605,83544],[-181,101],[-77,-18]],[[49347,83627],[-266,-248]],[[59553,57581],[782,-40]],[[60335,57541],[-54,32],[17,1452]],[[60201,59027],[-637,8]],[[52126,58952],[190,26]],[[52316,58978],[-4,670],[54,-97],[85,148],[128,112],[113,13]],[[52685,60663],[-958,-30]],[[87171,24893],[375,59],[573,-985]],[[88317,26786],[-53,53]],[[88264,26839],[-297,145],[-64,-250],[-137,56],[-67,-392],[-69,35],[-127,-263],[-135,-140],[-251,120]],[[76925,60061],[31,-127]],[[77551,59599],[63,243],[71,123],[101,-61],[25,311],[169,270],[-1,94],[87,186]],[[78066,60765],[-671,182]],[[77395,60947],[-54,-33],[-162,-299],[-97,-95],[-54,-139],[-140,48]],[[76888,60429],[54,-282],[-17,-86]],[[89163,21572],[284,-181],[-212,-977],[347,-228]],[[89582,20186],[316,-191],[51,-4],[243,-277],[24,-213],[188,-114]],[[90404,19387],[74,152],[55,262],[-29,233],[89,389]],[[90593,20423],[-81,323],[4,574],[51,50],[53,349],[85,197],[27,249]],[[90732,22165],[-90,55]],[[90642,22220],[-936,616]],[[89706,22836],[-11,-200],[-177,-60],[-91,110],[-251,-351],[104,-216],[-117,-547]],[[83278,46962],[136,28],[-71,286],[22,30]],[[83365,47306],[-55,340],[-104,297],[-42,251]],[[79173,48707],[-77,-78],[43,-410],[89,37],[54,-296]],[[79282,47960],[112,-99],[210,-28],[4,138],[84,20],[169,198],[-24,148],[84,12],[85,290]],[[80006,48639],[-87,19],[-90,260],[68,385],[77,110]],[[79974,49413],[-98,135],[-62,-83]],[[80143,48674],[16,-755],[139,-436]],[[80298,47483],[149,105],[29,-43],[114,122],[21,-110],[92,42],[35,-75],[78,192],[139,214]],[[80948,49043],[-200,-10],[-42,-146],[-387,52],[-22,-208],[-99,-102],[-55,45]],[[79377,46308],[133,245],[169,-270]],[[79679,46283],[119,214],[472,-39]],[[80298,47482],[0,1]],[[80143,48674],[-137,-35]],[[79282,47960],[38,-51],[-45,-362],[-172,6]],[[79103,47553],[3,-288],[272,-332],[-88,-425],[87,-200]],[[32733,40738],[713,167],[1991,429]],[[71178,45308],[-425,69],[-2,-24]],[[70631,44896],[-15,-198],[57,-179],[-22,-135]],[[61614,75579],[40,-67],[43,-440]],[[62276,75032],[7,503],[45,1804]],[[62328,77339],[-36,-64],[-114,38]],[[62178,77313],[3,-114],[-128,-145],[-28,-237],[-68,-36]],[[60959,48848],[-147,1212]],[[60587,50062],[-388,-618],[-3,-336]],[[81687,33071],[86,858]],[[80340,34871],[-4,-42]],[[80336,34829],[-127,-1328]],[[76653,48170],[102,404],[103,44]],[[76858,48618],[73,49],[-17,173],[-65,80]],[[76849,48920],[-183,290],[-88,89]],[[70500,58178],[230,-21]],[[70730,58157],[37,213],[185,-276],[249,20],[322,212]],[[71523,58326],[-3,206],[59,286],[-7,189],[-88,13],[-24,317]],[[71460,59337],[-171,42]],[[70484,58952],[-3,-420]],[[51657,21326],[-45,-3]],[[23531,13614],[66,235],[168,62],[21,170]],[[22802,15179],[116,-901],[31,-8],[-5,-324],[338,127],[43,-83],[148,85],[36,-272],[-51,-220],[73,31]],[[22500,13384],[57,-430]],[[22557,12954],[483,179],[56,-153],[133,-114],[248,96]],[[23477,12962],[-50,492],[120,35],[-16,125]],[[22594,15647],[-80,-268],[-37,-321]],[[22477,15058],[-15,-411],[89,-247],[-33,-488],[-82,-238],[64,-290]],[[50488,44080],[391,16]],[[51460,44120],[-16,1343]],[[50492,45758],[-31,-1]],[[53370,44170],[580,8]],[[54331,44181],[-2,1676]],[[53746,45853],[-386,-5]],[[56887,58975],[419,-12]],[[57445,60514],[41,464]],[[57486,60978],[-602,14]],[[77395,60947],[-120,31]],[[77275,60978],[-125,51],[-570,123]],[[76580,61152],[-124,27]],[[76456,61179],[77,-168],[-23,-63],[96,-155],[100,-276],[182,-88]],[[78066,60765],[171,-145]],[[78327,62671],[-111,-136]],[[78216,62535],[-139,-229],[-115,-2],[-217,-243]],[[77745,62061],[-33,-107]],[[77712,61954],[30,-293],[91,-144],[36,-220],[194,-300],[3,-232]],[[58398,60476],[93,1]],[[58491,60477],[0,112],[-94,-1],[-33,276],[-161,-1],[-1,336],[96,1],[-2,438],[-85,62]],[[58211,61700],[-122,-14],[15,196],[-124,155],[-181,32],[-68,-70],[5,-142],[-89,-150],[-90,80]],[[57557,61787],[-71,-809]],[[66847,78160],[-141,17]],[[66706,78177],[-205,23]],[[66501,78200],[-11,-278],[-162,18],[-41,-219],[-129,17],[-55,-161],[-39,-612]],[[66064,76965],[-8,-225],[155,-1]],[[65865,66090],[385,-39],[-4,-112]],[[65913,67113],[-33,-933],[-15,-90]],[[47652,42567],[174,9]],[[13239,9433],[1450,717]],[[14689,10150],[-209,1214]],[[13112,10216],[127,-783]],[[71347,62139],[95,-16]],[[71442,62123],[85,1694]],[[70926,63391],[-70,-136],[-160,-126],[-68,29]],[[75078,78576],[405,-69],[-3,-167],[449,-83]],[[75929,78257],[-88,332],[-17,450],[-49,289],[1,283],[-92,261]],[[75684,79872],[-525,99]],[[80984,83157],[148,-47],[88,112],[158,59],[66,89]],[[80835,84545],[-93,-80],[16,-143],[-91,-337],[63,-229],[-163,-299]],[[63735,70745],[469,-28]],[[64603,72011],[62,93],[-51,72]],[[71605,48791],[384,-50]],[[72276,49611],[11,364],[-50,312]],[[44086,55211],[-24,-2]],[[80222,59523],[194,529],[105,374],[84,57]],[[52382,47505],[-6,672]],[[51417,48146],[10,-1006]],[[36665,17387],[864,176],[29,62],[-19,274],[192,39],[-23,337],[32,9],[-44,650],[106,12],[-69,1011]],[[37733,19957],[-175,-35],[12,-165],[-192,-38],[11,-164],[-384,-79],[23,-328],[-133,-28]],[[53067,35110],[13,-1578]],[[53703,34454],[-148,-4],[-12,949]],[[53543,35399],[1,54],[-158,-3]],[[59667,22027],[86,-136],[24,-242],[86,-264],[102,-153],[137,-80],[42,-125],[78,38],[53,-188],[134,8],[30,-190],[52,-35],[-7,-316]],[[60484,20344],[378,-27]],[[64716,31285],[48,-132],[117,-64],[12,-159]],[[66058,31158],[50,1343]],[[65531,32582],[-2,-44],[-763,84]],[[64766,32622],[-50,-1337]],[[63963,82198],[225,-162]],[[64188,82036],[191,-81],[83,41]],[[64462,81996],[18,338],[65,-7],[5,165],[77,-10],[5,116]],[[64632,82598],[-106,443],[-106,306]],[[64420,83347],[-137,351]],[[64241,83422],[2,-391],[-82,-130],[-106,-34],[-145,-458]],[[88516,31591],[-206,-1333]],[[88310,30258],[130,-49]],[[88440,30209],[228,152],[72,276],[129,-91],[56,65]],[[88925,30611],[117,110],[-12,152],[93,50],[76,510],[-28,67]],[[88643,33157],[91,-143],[-218,-1423]],[[88249,27347],[52,-179],[-37,-329]],[[89038,26575],[199,55]],[[89293,27838],[-92,85],[-117,17],[-178,242],[-62,179],[-113,77],[-136,297],[-107,8],[-51,199],[-170,92]],[[88267,29034],[-18,-256],[34,-152],[-78,-219],[27,-307],[49,-111],[-53,-359],[21,-283]],[[51703,63991],[1338,34]],[[53041,64025],[-5,838]],[[51883,65338],[5,-658],[-192,-20]],[[88779,21807],[384,-235]],[[89706,22836],[-239,158],[268,1301]],[[89735,24295],[92,427]],[[89827,24722],[-130,75],[19,98],[-157,89],[-20,-98],[-322,180],[-310,-107]],[[59244,59037],[2,168],[62,0],[-3,437],[-94,167],[-31,170],[15,455]],[[59195,60434],[-318,-6]],[[58877,60428],[-386,-6],[0,55]],[[87306,30630],[1004,-372]],[[88516,31591],[-417,153]],[[87454,31943],[-212,-1290]],[[76646,81241],[191,-195],[-26,165],[-145,109],[-20,-79]],[[75916,80707],[23,-168],[890,-170]],[[76829,80369],[64,72],[86,-67],[65,82],[189,23]],[[77233,80479],[2,246],[-166,-2],[-40,-79],[-156,105],[-236,362],[-43,8],[-358,482],[17,-196],[-76,-25],[-133,289],[-248,46],[102,141],[17,124],[116,48],[391,-385],[168,-312],[20,39],[-143,302],[-490,503],[-371,-278]],[[75606,81897],[28,-132],[170,-286],[134,-40],[29,-110],[-90,-379],[39,-243]],[[77146,77702],[-78,361],[-63,71],[-22,382],[-39,83],[-187,87],[-224,290]],[[76533,78976],[-137,-84],[-12,-164],[-128,28],[-17,-223],[-196,-16],[-20,-276],[-94,16]],[[75929,78257],[43,-59],[75,-320],[-16,-47]],[[75684,79872],[-46,425],[95,247],[171,106],[12,57]],[[75606,81897],[-128,2],[-113,116],[-107,-290],[-61,-329],[47,-200],[24,341],[58,291],[55,61],[57,-140],[-9,-275],[-200,-452]],[[77655,79182],[-43,-611],[52,-163],[-13,-183],[122,-27],[-83,-319],[-17,-239]],[[78178,77582],[254,-29]],[[78134,78962],[-26,94],[-139,167],[-52,239],[-48,406]],[[77869,79868],[-68,-60],[-97,51]],[[77704,79859],[-49,-677]],[[80683,86593],[68,407],[60,8],[-19,-271],[-61,-157]],[[81032,86504],[53,575]],[[81085,87079],[-84,-7],[28,207],[-70,108],[115,108],[86,-11],[110,334],[-59,156],[0,266],[-154,83],[40,272],[-52,60],[-38,-351],[-129,-295],[-85,-98],[-64,-231],[4,-515],[-56,-204],[-52,-355]],[[48648,62844],[1105,62],[27,57],[153,-78],[53,105]],[[49986,62990],[-13,935]],[[49580,64910],[-319,-17],[3,-167],[-186,-11]],[[58877,60428],[-4,1518]],[[58305,62590],[-98,-5],[4,-885]],[[52940,57649],[7,81],[116,120],[115,-58],[68,-191],[123,-171],[57,60],[54,281],[-9,154],[133,47],[107,200],[62,-100],[31,136],[-90,190],[103,68],[105,-130],[41,179],[167,217],[148,17],[-21,246]],[[54257,58995],[-53,-1]],[[53626,58998],[-353,-1],[1,-337],[-189,-3]],[[53085,58657],[2,-336],[-191,-3],[4,-670],[40,1]],[[53225,65370],[573,10]],[[53798,65380],[-1,330],[195,7]],[[53992,65717],[-3,1005]],[[53989,66722],[-85,0],[-1,165],[-241,-3]],[[53662,66884],[-63,-180],[-92,-44],[-483,-8]],[[58482,41882],[21,405],[14,804]],[[58517,43091],[6,505]],[[57750,42654],[-4,-332],[-29,1],[-5,-391]],[[66733,75181],[472,-118]],[[67205,75063],[61,1389]],[[67266,76452],[-100,12]],[[13029,9333],[210,100]],[[12669,9647],[-176,-120],[-21,-165],[-51,37]],[[81552,78604],[704,-194],[22,262]],[[82278,78672],[30,397],[169,166],[7,179],[78,272]],[[82562,79686],[-442,129],[-83,162],[-88,48],[-43,189],[-201,162]],[[81705,80376],[-3,-109],[-136,-1497]],[[81566,78770],[-14,-166]],[[70471,19821],[-84,92],[10,103],[-211,-120],[-226,37],[-121,102],[-63,149],[-36,452],[-81,0],[-60,147]],[[69599,20783],[-30,-526],[-48,9],[-59,-995],[-193,31]],[[60864,18223],[114,93],[188,-53],[406,-282]],[[60484,20344],[-21,-990]],[[77156,70564],[-7,34]],[[77149,70598],[-84,17]],[[77065,70615],[91,-51]],[[76732,71267],[-5,-91],[103,-41],[111,-431],[124,-89]],[[77065,70615],[70,45]],[[77135,70660],[159,-32],[171,107]],[[77465,70735],[27,107],[20,570]],[[76908,71781],[-72,9],[-16,-244],[-69,11],[-19,-290]],[[59878,70983],[466,-22]],[[60344,70961],[491,-16]],[[9112,37538],[92,230],[36,392],[72,55],[7,159]],[[9319,38374],[-74,240],[18,163],[103,213],[-7,198],[67,101],[-42,93],[55,208],[53,557],[-62,328],[-61,-21]],[[9369,40454],[7,59]],[[9376,40513],[-176,42]],[[9200,40555],[-86,-353],[-134,-41],[-136,-172],[-201,-541],[-107,-54],[-75,49]],[[8461,39443],[-97,-75],[29,-218],[-44,-386],[-162,-325],[-102,-271],[-117,-669],[-86,-251]],[[53047,63601],[-6,424]],[[51716,62137],[0,-6]],[[53182,44166],[8,-1343]],[[56945,69757],[116,131]],[[57248,71613],[-97,3]],[[57124,71520],[-92,-80],[-97,-218]],[[56935,71222],[10,-1465]],[[51718,61978],[9,-1345]],[[54993,70336],[140,-134],[103,-198],[106,12],[165,-221],[154,42],[187,-93],[106,38],[64,-61]],[[55360,71330],[-4,-73],[-363,1]],[[88952,25882],[375,97],[706,-270]],[[90033,25709],[21,99]],[[90054,25808],[43,216],[-228,426],[-3,62]],[[53411,55758],[397,5]],[[54735,55767],[0,2220]],[[54735,57987],[0,1012],[-478,-4]],[[52940,57649],[25,-85],[166,-83],[-16,-184],[-161,60],[-97,-44]],[[71590,77524],[718,-109]],[[72416,79747],[-228,99]],[[72188,79846],[-5,-61],[-291,138],[-194,141],[-107,-40],[2,-135],[171,-182],[3,-291],[-91,-145],[-83,-40],[-105,-198],[-49,-401],[-57,1],[-31,-253],[30,-104],[-46,-128],[47,-164],[-12,-142],[220,-318]],[[83301,83207],[106,144],[183,-42],[109,167],[77,-57],[49,-157],[79,39],[35,234],[106,191],[85,286]],[[76661,74901],[543,-129]],[[77204,74772],[-87,203],[-2,144],[-203,171],[-78,336],[-233,499],[9,171]],[[73572,61773],[237,-38]],[[73809,61735],[199,-39]],[[73642,62242],[-70,-469]],[[76572,74204],[287,-61]],[[76859,74143],[478,-109],[39,-111]],[[77376,73923],[49,86],[48,691]],[[77473,74700],[-269,72]],[[77473,74700],[28,415]],[[77501,75115],[65,982]],[[76006,77774],[-74,-76],[-64,-242],[-20,-257],[-101,-173],[-53,-244]],[[75694,76782],[-60,-277]],[[52316,58978],[382,8],[1,-336],[386,7]],[[73749,55368],[534,-63]],[[73471,53223],[-42,102],[-243,275]],[[53768,71892],[6,-649]],[[37939,73673],[-39,716],[-185,3736],[-17,-3],[-38,657]],[[37529,78893],[-35,-227],[-106,-18],[-80,-233],[-78,-44],[-115,-212],[-82,0],[-246,-262],[2,-129],[-277,-438],[-67,-368],[-78,-142],[-225,-235],[-154,-497],[-113,-115],[-29,-204],[-77,-99]],[[35769,75670],[82,-127],[12,-210],[-64,-11],[114,-2002]],[[79679,46283],[-62,-217],[-9,-593],[-36,-290],[36,-73]],[[68065,74851],[61,-16]],[[68126,74835],[276,-72],[257,-113],[279,-181]],[[68990,75217],[74,999]],[[69064,76216],[-742,106]],[[68129,76348],[-64,-1497]],[[63759,31406],[56,1488]],[[63815,32894],[41,1174]],[[63067,33496],[-135,-70],[-148,-196],[-73,-502],[-75,-81],[-29,-314]],[[63164,75639],[276,-28],[37,75]],[[63477,75686],[-30,85],[3,350],[-54,39],[-132,-120],[-34,125],[64,100],[117,-52],[31,104],[-77,121],[-123,43],[13,332],[84,179],[-10,120],[-71,-15],[-61,-236],[-60,135],[143,320],[-17,145],[-104,63],[-128,-12],[-2,125],[108,158]],[[63137,77795],[-60,225],[115,235],[9,119],[-134,162]],[[62897,78377],[32,-238],[-32,-108],[74,-211],[-61,-76],[-199,-93],[-47,-109]],[[62664,77542],[-56,-133],[25,-285],[129,-45],[-154,-137],[-8,-277],[61,17],[38,196],[131,17],[17,-124],[-136,-27],[30,-224],[-92,-152],[32,-227],[58,-73],[75,127],[56,-114],[9,-343],[115,1],[61,-130],[105,142],[4,-112]],[[56642,73582],[5,894]],[[56647,74476],[-893,22]],[[55754,74498],[-36,-45],[30,-209],[-49,-127],[77,-235],[-5,-228]],[[89110,18149],[211,1048],[30,-18],[100,488],[20,-13],[111,532]],[[88035,18578],[63,-44],[540,-182],[472,-203]],[[63091,75142],[117,-192],[-35,-110],[53,-125],[-25,-112],[30,-268],[-35,-213],[18,-223]],[[63214,73899],[323,-24],[88,-117],[73,74],[33,-91],[152,-76],[23,145]],[[64049,74132],[43,10]],[[64093,74166],[-121,264],[-59,-103],[-60,70],[166,151],[-206,232],[20,164],[-122,196]],[[63596,75628],[-119,58]],[[63164,75639],[-67,-164],[-6,-333]],[[63137,77795],[88,-189],[23,89],[80,-55],[26,-356],[85,10],[219,-194],[283,30]],[[63941,77130],[122,88]],[[68126,74835],[-73,-1522]],[[50456,23921],[8,0]],[[69953,62314],[21,-215],[-15,-643],[-29,-667]],[[67266,76452],[479,-58]],[[67459,78444],[-32,-382]],[[13269,7833],[311,152]],[[13580,7985],[-19,106],[803,408],[611,294]],[[16094,9245],[11,170],[98,164],[-99,66],[-4,244],[-76,212],[-71,64],[-12,224],[35,275],[-29,75],[-186,-88]],[[15761,10651],[-1072,-501]],[[83579,51332],[88,-41],[124,119],[-40,-193],[85,-16]],[[83836,51201],[53,-156],[113,-167],[72,59],[52,-118],[86,25],[59,230],[101,-169],[72,89]],[[84431,53037],[-219,68]],[[83990,53172],[-76,24]],[[84511,41339],[225,127]],[[84736,41466],[58,424],[-93,406],[39,40],[-46,196],[71,97],[-143,356]],[[84622,42985],[-108,-134],[-100,82],[-499,-160],[-150,-104]],[[12448,36142],[135,-107]],[[11780,38081],[-33,-88],[-214,126]],[[11533,38119],[-227,-11],[-67,103],[7,-473],[59,-100],[2,-371],[59,-424]],[[84649,31555],[227,-78]],[[85121,33439],[-637,226]],[[84075,33236],[-166,-1441]],[[50978,96542],[-12,1053],[-14,51]],[[50952,97646],[-201,11],[-123,-60],[-23,95],[-74,-104],[-143,65],[-206,-98],[-171,-252],[-2,-109],[-101,28],[-155,-251],[-64,33],[-181,-168]],[[49508,96836],[406,-1387],[161,-592]],[[89680,47310],[173,-82],[94,66],[-17,223],[182,28],[57,-76]],[[90169,47469],[37,33],[-78,489],[-89,187],[29,184],[-12,216],[-87,298],[-116,68],[-30,120],[-27,-248],[-130,-347],[-15,-289],[29,-155],[-21,-251],[21,-464]],[[76464,71161],[133,35],[6,97],[129,-26]],[[76461,72121],[-16,-252],[35,-6],[-23,-250],[44,-8],[-37,-444]],[[61869,32034],[695,-52]],[[88947,52517],[83,-158],[131,-134]],[[89547,53174],[-60,222],[-88,105],[-117,36],[-75,-94],[-110,16],[-126,-367],[-20,-196],[46,-282],[-33,-29]],[[71964,63762],[45,169],[118,75],[81,-29],[49,-159],[100,15],[48,-278],[-48,-68]],[[72357,63487],[324,-56],[20,299],[90,-19],[32,208],[52,-46]],[[72514,65397],[-309,-567]],[[72205,64830],[-54,-158],[-191,25]],[[87075,29096],[424,-176]],[[87499,28920],[106,574],[45,26],[291,-106],[27,198],[352,-129]],[[88320,29483],[68,577],[52,149]],[[90054,25808],[150,28],[98,103],[74,-84],[44,219],[175,215]],[[53650,80022],[210,-185],[136,-457],[95,-216],[185,-203]],[[54414,79539],[11,205],[-29,229],[26,195],[-47,228],[157,680],[-79,149],[-14,202]],[[54161,81238],[16,-248],[-95,-117],[-34,-258],[-105,8],[-18,-184],[-168,-156],[-175,-51],[68,-210]],[[85756,44160],[43,-20],[117,262],[-14,146],[132,172],[183,399],[68,-77],[104,31]],[[86389,45073],[46,151]],[[86435,45224],[-140,75]],[[86295,45299],[-128,-84],[-9,115],[-85,-41],[-138,48],[-131,169],[-58,167],[-97,34]],[[85649,45707],[-65,-205],[30,-77],[-101,-216],[-191,-265]],[[52886,80542],[660,-656]],[[53546,79886],[104,136]],[[53502,81548],[-103,-91],[-94,1],[-89,-273],[-161,-258],[-83,-315],[-86,-70]],[[68245,81011],[181,-55],[-144,109],[-37,-54]],[[67912,80966],[144,-14],[-40,127],[-104,-113]],[[68368,79225],[46,987],[139,147]],[[68553,80359],[-6,59],[-204,-101],[-305,137],[-389,297],[15,-181],[-121,-74]],[[67543,80496],[-44,-1050]],[[54999,69604],[1,-201]],[[55e3,69403],[150,-119],[177,85],[71,-64],[143,36],[72,119],[65,-36],[139,164],[201,119]],[[56018,69707],[4,10]],[[25216,49332],[-196,1899]],[[43723,77983],[955,96]],[[45184,81163],[-1535,-149]],[[43649,81014],[46,-144],[155,-103],[-149,-259],[83,-130],[117,-384],[-4,-230],[-110,-142],[-108,-5]],[[43679,79617],[-68,-186],[-9,-202],[-89,-625],[-216,-319],[-105,-66],[-65,58],[-306,-247],[-81,15],[-183,-219]],[[82544,81685],[434,-329],[17,-75]],[[83624,81002],[359,983],[578,1220]],[[84561,83205],[-456,129],[69,666],[-44,12]],[[82635,81846],[-91,-161]],[[84817,29231],[200,-65]],[[85017,29166],[357,-123],[25,292],[75,38]],[[67641,32311],[395,-53]],[[68036,32258],[109,205],[-41,458]],[[67300,33257],[-42,-887]],[[59480,65692],[840,-14],[-4,-214],[63,-17],[-7,-222],[223,-3]],[[60829,65553],[3,1019]],[[60832,66572],[-382,-1]],[[60450,66571],[-264,-5],[-13,-290],[-303,-30],[0,-113],[-291,3],[-2,-225],[-95,1]],[[62506,51002],[-8,-225],[292,-19]],[[54020,26367],[2,-667]],[[76756,67673],[-99,-124],[-178,36],[-8,-62],[-194,41]],[[73651,72252],[73,-79],[55,220],[789,-158]],[[74568,72235],[34,334],[32,-6]],[[74634,72563],[-30,34],[29,475],[-158,33],[4,55],[-149,49],[-94,458]],[[74236,73667],[-251,46],[-19,-332],[-177,33],[-36,-303],[-194,21]],[[12459,43990],[83,794],[-9,168],[79,471],[-8,115],[132,230],[38,158]],[[10660,45853],[-39,-105],[25,-158],[87,-130],[-49,-108],[59,-154]],[[88097,48554],[-4,-214],[109,-110],[100,27],[34,-139]],[[88434,48719],[26,210],[111,-44]],[[88711,48984],[-12,189]],[[88699,49173],[-92,-180],[-137,76],[-36,100],[-80,-128],[-154,-63]],[[61455,72903],[7,337],[202,321],[4,167]],[[61678,74232],[-945,55]],[[88452,51715],[-3,-32]],[[88449,51683],[653,-222]],[[89102,51461],[105,118]],[[89207,51579],[19,159],[108,319]],[[62064,28549],[165,-15],[-30,-201],[110,-142],[72,67],[34,-135],[75,23]],[[62490,28146],[1,34],[286,-25]],[[62777,28155],[96,-12],[45,1326]],[[62305,29056],[-241,-507]],[[77149,70598],[-14,62]],[[76327,70616],[66,-13],[-12,-185],[49,-93],[51,-355],[89,-123]],[[76570,69847],[96,15],[75,171]],[[76741,70033],[186,25],[69,132],[58,253],[102,121]],[[76464,71161],[-48,-266],[-98,-169],[9,-110]],[[89207,51579],[114,128],[392,239],[70,260],[58,4]],[[89841,52210],[159,253],[69,33],[60,176],[-197,174],[-196,-188]],[[86124,43068],[-39,232],[-2,249],[419,911]],[[86502,44460],[-134,387],[21,226]],[[85333,45961],[78,125],[158,-175],[80,-204]],[[86295,45299],[-10,102],[-314,958]],[[87312,27776],[725,-354],[212,-75]],[[88267,29034],[53,449]],[[87499,28920],[-187,-1144]],[[84323,49724],[-200,306],[-84,-66]],[[84039,49964],[29,-155],[-76,-126],[129,-175]],[[53798,65380],[5,-673],[193,1],[1,-337]],[[53997,64371],[572,3]],[[54569,64374],[0,335]],[[54569,64709],[-1,672],[-97,0],[0,337],[-479,-1]],[[54766,62893],[-54,38],[-136,355],[-7,1088]],[[53997,64371],[-3,-629],[-29,104],[-120,-28]],[[53845,63818],[3,-791],[89,1],[2,-672]],[[52516,80917],[370,-375]],[[83836,51201],[203,-1237]],[[84851,50304],[-65,738]],[[53327,63854],[87,166],[75,-100],[-44,-110],[79,-68],[37,106],[127,-54],[88,182],[69,-158]],[[14292,36475],[138,-871],[309,-2029],[379,-2556]],[[15118,31019],[457,-3022]],[[16112,32340],[-248,1651],[-42,-16],[-286,1942],[189,77]],[[15725,35994],[-56,374],[28,12],[-48,335],[50,108],[-58,404],[-47,97]],[[15594,37324],[-116,-43],[-56,86]],[[15422,37367],[-163,69],[-161,-60],[-212,56],[-84,106],[-120,-72],[-39,258],[68,30],[-83,194],[13,237],[-135,262]],[[14506,38447],[-117,91],[-97,-13],[-113,119],[-206,-91]],[[13973,38553],[84,-564]],[[88925,30611],[507,-848]],[[89432,29763],[597,322],[-130,566],[342,265],[72,182]],[[85648,38290],[21,45],[253,-483],[98,-142],[-75,256],[147,-193],[19,89],[123,-107],[427,-250],[90,-103]],[[86751,37402],[2,152],[136,202]],[[86889,37756],[-103,152],[53,104],[-196,139],[-146,356]],[[86497,38507],[-62,181],[-347,256],[-90,229]],[[85998,39173],[16,-117],[-164,-245],[-81,-250],[-90,-101],[-31,-170]],[[81584,43842],[19,574],[-82,339],[1,417],[43,147]],[[81451,45306],[5,-152],[-75,-68],[8,-131],[-94,-87],[-102,42],[-55,-162]],[[60254,80927],[125,-64],[557,-27],[0,-194],[276,-15]],[[60256,81006],[-2,-79]],[[47667,38543],[-768,-63]],[[46899,38480],[42,-1332]],[[74524,71566],[193,-41],[-21,-219],[510,-117],[-11,-132],[105,-30]],[[75300,71027],[31,214],[67,105],[-26,179]],[[75529,72062],[-157,226],[-78,187],[37,277]],[[75331,72752],[-254,53],[-158,-302],[-285,60]],[[74568,72235],[-44,-669]],[[62831,57370],[77,-4]],[[62908,57366],[91,116],[20,169],[72,-4],[99,337],[8,281]],[[72513,55591],[-409,30]],[[71738,55643],[-19,-484]],[[65806,81494],[196,-121]],[[66002,81373],[96,85]],[[66098,81458],[-6,726],[-18,220],[134,-23],[16,-95],[105,180]],[[66329,82466],[-32,167],[-76,100],[15,344],[178,446],[37,639],[164,574]],[[66615,84736],[-342,538]],[[66273,85274],[103,-414],[55,-117],[-66,-122],[5,-370],[-60,-120],[-174,-42],[-106,-318],[53,-32],[-10,-410],[-142,-41]],[[91014,31419],[52,-216],[632,-413]],[[91698,30790],[61,613]],[[91073,31859],[1,-12]],[[90799,32714],[-42,-20]],[[91698,30790],[-55,-530]],[[91643,30260],[194,491],[23,115],[75,-125],[33,88],[115,33]],[[92571,31848],[-24,98],[-88,-43],[-111,242],[-45,-23],[-126,148],[0,181],[-167,109],[-122,238],[-40,-40],[-71,148]],[[61639,57456],[-13,-1140]],[[62421,55892],[7,390],[-25,1],[9,628],[24,483]],[[53546,79886],[20,-101],[-68,-84],[21,-97],[-112,-232],[20,-159],[-86,23],[-50,-106],[-68,-532],[-68,-155]],[[10827,40522],[148,-119],[93,-394],[-69,-162],[65,-38],[72,-294],[-69,-42],[-84,-371],[81,-161]],[[11064,38941],[197,98]],[[11261,39039],[559,351]],[[10226,41227],[108,72],[156,-25],[90,-255],[139,-78],[108,-419]],[[55922,62341],[59,-38],[90,129],[72,-12],[93,-149],[17,-229],[67,-12],[131,-336]],[[56451,61694],[83,173],[186,57],[1,197],[102,-95],[58,182]],[[56881,62208],[2,467],[-205,3],[3,556]],[[56681,63234],[-764,11]],[[55917,63245],[-2,-392],[-191,1],[5,-522]],[[56681,63234],[4,448],[-128,2],[2,336],[-112,2],[4,672]],[[55622,64703],[8,-1342],[287,-3],[0,-113]],[[80711,38718],[30,295]],[[80556,39083],[31,-307],[-162,-389]],[[58952,69239],[444,4]],[[59615,69354],[-121,602],[-9,121],[-74,-3],[-2,929]],[[59353,71005],[-529,20]],[[58824,71025],[-106,-273],[9,-170],[104,-119],[22,80],[148,-395],[-50,-129],[75,4],[-15,-148],[50,-73],[-75,-70],[67,-109],[-111,-130],[10,-254]],[[90473,38876],[174,-548]],[[90647,38328],[119,107],[59,215],[65,-9],[280,188],[94,-60]],[[91468,38916],[28,101],[-125,488],[-183,311]],[[91188,39816],[-259,146],[-288,-25]],[[90340,39297],[133,-421]],[[24771,31555],[-512,-173],[-373,-158],[-338,-92]],[[23548,31132],[347,-2912]],[[50422,77176],[8,23],[-573,665]],[[78763,38500],[-79,-938]],[[79587,37034],[30,329]],[[79321,38418],[-250,49],[-295,159]],[[72538,68133],[78,133],[-45,75],[28,151],[-137,74],[16,125],[-122,293],[92,193],[-52,95]],[[72396,69272],[-34,62],[4,262]],[[71685,69596],[-101,-38],[-73,-121],[-13,-228],[-105,-13],[-20,-308]],[[11626,13958],[21,-117]],[[11603,15238],[-154,-79],[-20,-82],[197,-1119]],[[49522,47387],[940,48]],[[50462,47435],[10,5],[-17,1006]],[[50443,49117],[-945,-46]],[[56134,47863],[3,307],[38,-67],[155,64],[31,-69]],[[56361,48098],[5,940]],[[51647,44126],[767,22]],[[9369,40454],[354,174],[-18,-108],[101,-320],[-2,-178],[236,113],[13,-174],[-47,-295],[90,-295]],[[10096,39371],[80,23],[54,140],[150,-107],[207,128],[177,36],[21,55],[-126,791],[168,85]],[[9545,40922],[-31,-195],[-138,-214]],[[60912,57505],[674,-45]],[[61539,58876],[3,284],[-193,6],[4,336],[-192,5]],[[61159,59172],[-2,-278],[-130,-219],[3,-244],[-124,-19],[33,-137],[-90,-24],[68,-176],[-106,-25],[103,-113],[-2,-432]],[[89312,50050],[-27,-268],[100,-56],[157,76]],[[89542,49802],[29,395],[-55,-27]],[[89516,50170],[-103,108]],[[89413,50278],[-101,-228]],[[40191,70291],[90,12],[79,-1649],[83,11],[33,-668],[388,51]],[[40864,68048],[844,109]],[[40931,74112],[-746,-101]],[[63214,73899],[-81,5],[7,-374],[100,-69],[-29,-190],[62,-13],[-51,-139]],[[40333,75374],[-18,-208],[-117,-181],[-62,25],[-133,-138],[-16,-296],[-42,-172],[-90,61],[-153,-522]],[[39300,43081],[0,0]],[[39223,43239],[174,-218],[4,-87]],[[39556,42959],[-96,58],[-12,230],[-65,17]],[[39342,43083],[0,0]],[[56678,65360],[870,-23]],[[57543,66561],[-4,959]],[[57067,68437],[-71,-188],[-136,63],[-131,-178],[-93,-285],[-147,-10],[-153,-278],[-46,1]],[[80520,40022],[25,-118]],[[80827,39927],[52,545]],[[76925,60061],[-233,22],[-196,184],[-102,-30],[-67,-214]],[[76327,60023],[-32,-218],[48,-95],[-34,-119],[91,-251]],[[75878,60451],[-1,-73],[129,-185],[29,81],[182,-53],[110,-198]],[[76456,61179],[-224,48]],[[54151,35411],[-608,-12]],[[93044,25484],[565,-211]],[[93609,25273],[48,-18]],[[93657,25255],[85,107],[22,153],[125,-97],[195,43],[23,313],[72,-7],[9,-117],[134,-23],[27,80],[16,422],[-69,276],[85,119],[145,-142],[7,259],[-85,24],[-41,216],[94,100],[80,-71],[58,111]],[[93717,27940],[-54,19]],[[93407,27217],[-21,-254],[-96,79],[-50,-177],[-37,50]],[[73795,44109],[-12,-175]],[[73783,43934],[570,-121],[-7,-85]],[[74346,43728],[194,-35]],[[74642,44827],[-476,22],[-321,92]],[[58806,71025],[18,0]],[[59492,74004],[17,-48],[-148,-149],[-33,-158],[-127,-81],[-15,-175],[-108,-24],[-25,-333],[-113,-161],[29,-208],[-86,-463],[-71,-89],[65,-188],[-77,-28],[69,-253],[-69,-169],[34,-116],[-82,-68],[54,-268]],[[65294,37470],[-44,-1217]],[[14168,13221],[116,-63],[127,39],[310,-112]],[[14721,13085],[-54,482],[96,282]],[[13352,13277],[51,-307],[-139,-368],[-61,-232],[50,-289]],[[87197,60731],[39,-70],[210,88]],[[87784,62218],[-9,299],[-87,8],[-34,-105],[-299,-5],[-368,167],[-263,284]],[[86488,62575],[27,-152],[-37,-101],[100,-144],[24,-438],[39,-81],[178,46],[60,-275],[211,-113],[107,-586]],[[72953,57026],[265,47],[171,-146],[54,-242]],[[74185,57177],[-83,168],[-167,28],[0,472]],[[86694,53650],[72,-400],[17,-335],[-30,-469]],[[86753,52446],[145,-33],[84,46],[227,-70],[37,104],[146,79],[34,162],[-48,110],[89,154],[165,-138],[145,387],[186,114]],[[87963,53361],[135,203],[-138,109],[-17,76]],[[87943,53749],[-103,296]],[[87257,53659],[-186,120],[-141,24],[-71,-124],[-165,-29]],[[27980,26207],[-35,313],[-188,-41],[-35,327],[-191,-59],[-82,617],[-96,-29]],[[39356,43737],[236,66],[210,-22],[9,-167],[100,3],[12,-206],[222,32],[-49,291],[-241,-40],[36,214],[-158,-41],[-102,112]],[[63234,70807],[0,97],[-127,403],[-100,98],[-61,268],[15,147],[-73,184],[6,135]],[[62395,72798],[13,-88],[-78,-220],[53,-288],[-47,12],[-77,-197],[-150,62],[-19,-94]],[[89068,49052],[82,-54],[131,163]],[[89176,50066],[80,-129],[56,113]],[[89413,50278],[7,90],[-139,99],[-37,-189],[-77,-86]],[[89167,50192],[9,-126]],[[38447,41764],[419,83],[588,82]],[[38799,43172],[5,-77],[-470,-79]],[[66098,81458],[132,23],[258,-195],[107,21],[102,101],[214,-80],[123,74]],[[67034,81402],[-99,181],[-6,124],[-83,61],[27,129],[-199,-36],[-66,185]],[[66521,82551],[-51,-90],[-141,5]],[[69673,73995],[762,-116]],[[70435,73879],[24,435],[88,15],[10,165],[224,-42]],[[70781,74452],[-30,61],[28,446],[-96,17],[32,548],[-99,165],[119,125],[-18,178],[-63,103],[-54,-57],[-121,110],[-21,224],[-64,-63],[-50,136],[43,115]],[[70063,77010],[23,-125],[-71,-343],[96,-40],[8,-225],[-86,36],[53,-198],[-3,-258],[-63,-107],[-162,-94],[-23,-120],[-86,-27],[-50,-397]],[[70060,71879],[157,-24],[8,167],[381,-61]],[[70748,72777],[-94,53],[27,467],[-191,30],[27,485],[-82,67]],[[70146,70004],[546,-69]],[[70692,69935],[28,493]],[[69022,67316],[18,-1213]],[[69040,66103],[405,-34],[70,106],[20,392]],[[69620,68084],[-607,48]],[[69013,68132],[9,-816]],[[69003,69082],[10,-950]],[[69815,68053],[77,1422]],[[68990,70231],[13,-1149]],[[55489,43162],[4,10]],[[86439,48957],[76,-57],[6,-130],[200,-480]],[[87490,48987],[-19,38]],[[87384,49056],[-43,281]],[[87228,49461],[-196,56],[-112,-141],[-61,44]],[[59309,78087],[-591,93]],[[70427,24405],[407,-60]],[[70234,25440],[10,-188],[-72,-301],[21,-227],[218,-175],[16,-144]],[[57137,49024],[-1,-421]],[[58086,49655],[3,464]],[[72396,69272],[585,-108]],[[73290,69163],[83,1282]],[[39242,39042],[556,91]],[[71505,57255],[92,411],[50,-30],[30,150]],[[71677,57786],[-77,270],[-75,117],[-2,153]],[[70730,58157],[18,-192],[65,-143],[4,-375],[108,-564],[-16,-61]],[[84540,34906],[61,15],[25,-241],[101,-224],[41,279],[153,-65],[125,250],[204,-4],[241,423],[266,-185],[296,-326]],[[85308,36316],[-139,87],[-103,-61],[-175,262],[-304,-86]],[[84188,36672],[-37,-74],[106,-408],[62,-42],[24,-233],[215,-250],[10,-179],[-133,-391],[105,-189]],[[54455,82422],[118,250],[-91,258],[69,233],[-49,153],[36,103],[103,25],[32,288]],[[54673,83732],[41,31],[-94,168],[86,47],[-18,232],[-124,5]],[[54564,84215],[-40,-80],[-128,-44]],[[54396,84091],[-162,-134],[-21,-183],[-79,-149],[-62,-284],[-135,18],[-237,-318],[-66,-208]],[[90152,17663],[230,-107]],[[90480,18661],[32,275],[-55,305],[-97,98]],[[90360,19339],[-72,-181],[-28,-480],[13,-253],[-86,-96],[21,-322],[-56,-344]],[[89027,49995],[17,123],[132,-52]],[[89167,50192],[-41,217],[62,1019]],[[89188,51428],[-86,33]],[[88449,51683],[-10,-359]],[[40807,48877],[761,106],[186,50]],[[41754,49033],[-40,968]],[[37742,49381],[1292,247]],[[38959,50943],[-51,-163],[-73,5],[-27,-215],[-80,-22],[-180,389],[-48,-161],[-179,158],[-102,-39]],[[64005,54277],[10,404],[-70,117],[9,337]],[[41420,76597],[-1196,2168]],[[39301,77332],[317,-3401]],[[40870,47544],[-63,1333]],[[39276,48653],[26,-501]],[[78847,43230],[22,-177],[198,1],[-46,-389],[213,-69]],[[79234,42596],[195,-37],[-21,-239],[106,32],[41,102],[191,-13],[-4,-53]],[[79742,42388],[71,86],[356,-69],[8,123]],[[80067,42879],[-100,132],[-48,188],[-79,22],[-155,212]],[[79128,44072],[-12,-207],[-165,31],[-75,-159],[-29,-507]],[[82600,50130],[-113,189],[-90,42],[-93,171]],[[81908,50323],[269,-407],[20,-105],[-84,14],[-7,-108],[162,-295]],[[70987,66062],[78,118],[53,260],[155,-20],[87,104]],[[71360,66524],[27,162]],[[70874,67937],[-94,10],[-16,-280],[-197,-26]],[[70115,66499],[-18,-333]],[[84736,41466],[230,220]],[[84966,41686],[383,373]],[[84574,43126],[48,-141]],[[34713,20304],[-143,-2],[-57,-66],[-158,91],[-91,-38],[-20,244],[-98,-23],[-19,221],[-255,-60],[-206,118],[-237,390],[-13,164],[-124,-31],[-30,357],[-173,-43]],[[33089,21626],[-412,-123]],[[32677,21503],[58,-668],[206,52],[58,-657],[189,48],[15,-164],[191,49],[14,-165],[190,47],[53,-660],[27,7],[24,-331],[66,18],[27,-336],[129,28],[36,-318]],[[65694,78292],[807,-92]],[[66706,78177],[-71,413],[-44,405],[-48,101],[-18,393]],[[66525,79489],[-272,32],[-513,-125]],[[72602,58165],[-245,70]],[[72357,58235],[-178,5],[-138,-68],[-364,-386]],[[23477,12962],[190,75],[145,-1141]],[[26209,13517],[69,139],[-44,171],[51,118]],[[65722,85543],[62,-82],[83,194],[-59,51],[-86,-163]],[[65655,84965],[38,16]],[[65693,84981],[-38,-16]],[[64632,82598],[194,-26],[-3,-54],[254,100]],[[65077,82618],[245,-8]],[[66273,85274],[-251,328],[-27,-164],[-86,-45],[23,-147],[-91,-318],[-93,-137],[-49,86]],[[65699,84877],[-27,-313],[-252,-403],[-235,-438],[-75,-29],[-105,-212],[-118,-104],[-47,-195],[-81,-101],[-22,115],[-79,9],[7,111],[-245,30]],[[72270,20166],[131,1892]],[[71815,21877],[100,2],[174,-157],[-17,-107],[-190,-20],[-84,-138],[-72,-340],[54,-242],[87,-103],[94,-315],[-121,-98],[337,-17],[30,-168],[63,-8]],[[86480,52379],[255,-86]],[[86735,52293],[18,153]],[[75796,33932],[-109,377],[-89,75],[-12,177],[-63,50],[-76,335],[46,177],[-47,42]],[[28134,10812],[-442,-138],[-3,325],[-79,122],[59,129],[25,224],[-42,129],[0,259],[64,73],[-34,348],[-169,-55],[-18,163],[-380,-125]],[[28384,10892],[-171,1572],[246,76],[-140,1300]],[[28319,13840],[-172,-54],[-12,110],[-95,-31],[-24,218],[-98,-31],[-21,102],[-177,-56],[-23,217],[-241,-88]],[[38762,43809],[-165,-70],[-211,-368],[-95,-50]],[[78385,49570],[170,-389]],[[78555,49181],[189,-169]],[[79519,50042],[18,172],[-73,277]],[[85216,40708],[-105,181],[-79,-20],[-66,817]],[[70019,77133],[-100,85],[-575,83],[5,113],[-194,26]],[[69155,77440],[-91,-1224]],[[66616,44773],[365,-43]],[[66981,44730],[16,281],[155,-17],[12,223],[128,-16],[110,270],[194,-24]],[[67596,45447],[13,279]],[[69055,42522],[74,69],[141,-22]],[[69106,43541],[-51,-1019]],[[90459,36737],[5,-124],[223,83]],[[90687,36696],[88,200]],[[90647,38328],[-167,-165],[-139,42],[-95,-339],[-99,-170],[-71,-6],[-8,-127],[-88,-13]],[[89980,37550],[113,-270]],[[61029,29155],[560,-41]],[[52132,71182],[682,21]],[[52814,71203],[-22,1694]],[[52701,72893],[-869,-44]],[[51832,72849],[28,-1687]],[[67558,34983],[722,-97]],[[68280,34886],[141,275],[153,686],[31,248],[150,435]],[[68800,37444],[-438,67],[-22,-339],[-192,35],[-21,-334],[-191,37],[-10,-168]],[[67926,36742],[102,-20],[81,-128],[-63,-1062],[-561,110]],[[89516,50170],[71,251],[111,10],[127,130],[39,124],[-86,78],[53,434]],[[89499,51318],[-311,110]],[[74267,29996],[111,1340]],[[74501,28129],[81,-29],[135,-428],[107,-118]],[[74824,27554],[29,240],[554,-158]],[[74994,29484],[-377,91]],[[43916,19384],[-55,1276]],[[42494,15183],[574,84]],[[62795,26136],[-386,32]],[[62409,26168],[-576,51]],[[61632,25900],[-18,-659]],[[13945,38752],[404,172],[-1,115],[335,142]],[[14683,39181],[398,180],[-50,349],[-155,-38],[-48,94],[-58,381],[6,176],[-46,281],[92,57],[-40,303],[31,14],[-61,426]],[[14752,41404],[-333,-854]],[[13921,38921],[24,-169]],[[72462,40314],[411,-81]],[[72890,40960],[-377,73]],[[72995,38849],[100,1337]],[[61035,67899],[459,-2]],[[61507,69807],[-147,122],[-80,-88],[-18,-128],[-78,47],[-20,-150],[-64,-39]],[[61100,69571],[-37,-117],[-128,-130],[-96,16],[-25,-193],[-107,-103],[111,-318],[-30,-233],[130,-44],[119,-297],[-2,-253]],[[67660,38650],[385,-70],[-20,-333],[807,-142]],[[68859,38612],[32,597]],[[68891,39209],[-1007,197]],[[67692,39446],[-29,-459]],[[22233,18556],[111,-199],[129,-452]],[[22677,21208],[-167,-62],[-166,-247],[59,-463],[-115,-43],[-10,-191],[84,-659],[-425,-171]],[[93461,29746],[-99,-232],[-123,-508],[-48,34],[-85,-502],[32,-22],[-74,-313]],[[72679,48761],[317,309]],[[73107,49584],[-1,113]],[[73106,49697],[-201,202],[-283,10],[-284,234],[-86,178]],[[67499,79446],[-388,44],[19,502],[-195,77],[7,168],[-82,8]],[[66860,80245],[-139,-164],[-104,-226],[-29,-251],[-63,-115]],[[64462,81996],[87,-187],[521,-253]],[[65070,81556],[-23,446],[-51,61],[49,207],[32,348]],[[31046,41948],[-911,-237],[2,-19],[-570,-158]],[[29540,41189],[57,-698],[122,-1329],[-11,-3],[89,-940]],[[51105,83173],[-245,396]],[[24263,39584],[1332,434],[1516,464],[19,-150],[115,54],[179,-232]],[[27434,42886],[-89,-85],[-197,-57],[54,-612],[-7,-254],[-1146,-338],[-1549,-490],[-4,32],[-389,-122]],[[24107,40960],[156,-1376]],[[86735,52293],[232,-80]],[[86967,52213],[821,-273]],[[87788,51940],[230,-85]],[[88074,53015],[-23,123],[-117,78],[29,145]],[[73213,73520],[40,132],[7,378],[-21,165],[96,-19],[32,489],[-51,188],[64,-16]],[[73330,75531],[-160,-31],[-23,-278],[-200,335],[-26,-290],[-187,39]],[[30027,33119],[-752,-200]],[[29275,32919],[14,-266],[-126,-154],[36,-158],[-39,-267],[32,-139],[97,-94],[-25,-198],[68,-81],[-52,-264]],[[29280,31298],[36,-47],[-37,-557],[64,-61],[374,106],[130,182],[77,-174],[22,124],[-54,352],[101,48],[216,-99]],[[74346,42450],[452,-108],[11,143],[180,-17]],[[74989,42468],[4,114]],[[74346,43728],[-100,-1252]],[[74052,74714],[77,-14]],[[74129,74700],[625,-123]],[[74754,74577],[74,1161]],[[74828,75738],[5,110],[-127,21],[10,156],[-228,-58],[-113,34],[-72,298]],[[74303,76299],[-154,24]],[[9268,41888],[1,12]],[[9269,41900],[-1,-12]],[[9118,42127],[-187,-91]],[[8931,42036],[25,-280],[199,-25],[17,395],[-54,1]],[[34651,49241],[-8,187],[84,165],[-83,225],[-75,9],[31,112]],[[34600,49939],[-125,-26],[-6,170],[-108,88],[-70,-65]],[[34291,50106],[-6,-187],[-70,-153],[-92,-35],[-79,-148],[40,-340],[-103,-23],[-15,-144]],[[66967,53724],[6,137],[69,-75],[132,17]],[[67180,54092],[-119,28],[-141,245],[-35,185],[-99,209]],[[66786,54759],[-165,-127],[-21,-285],[17,-296],[79,-137],[-12,-122],[-76,-44]],[[63406,57321],[608,-59]],[[64014,57262],[16,234],[58,91],[11,497],[-96,75]],[[64003,58159],[9,452]],[[62908,57366],[498,-45]],[[61772,62976],[-12,-1143]],[[77494,37273],[273,-59]],[[77860,37470],[112,1232]],[[56307,61002],[-6,435],[88,252],[62,5]],[[65368,85634],[275,84],[-133,37],[-142,-121]],[[64997,85816],[172,-79],[21,53],[-186,85],[-7,-59]],[[65699,84877],[-6,104]],[[65655,84965],[7,-145],[-81,-175],[-84,218],[-95,-36],[-51,77],[-86,-61],[22,190],[-79,156],[-22,177],[-57,-15],[-30,190],[-58,-36],[-142,166],[-21,208],[-109,-43],[10,-149],[-208,-310],[-74,50],[-185,-53],[-72,-101],[-138,-9],[-157,-88],[-115,-185],[82,-55],[46,-194],[142,200],[45,-79],[5,224],[100,49],[-32,-340],[-120,-105],[-96,-247]],[[11204,13738],[422,220]],[[10534,16467],[98,-326],[98,-473],[141,-558],[100,-638],[97,-228],[136,-506]],[[74824,27554],[-48,-147],[67,-453],[37,159],[121,-229],[-128,-71],[142,-24],[74,-233],[126,-63],[202,-177],[26,-120],[164,-137],[210,133],[96,108],[129,379],[88,182],[88,524]],[[57039,41954],[271,-6]],[[57102,42664],[-20,-331],[-40,1],[-3,-380]],[[60378,45520],[668,-23]],[[61046,45497],[7,994]],[[60855,46887],[-480,-252]],[[31100,89295],[319,-28],[226,-428],[104,-47],[93,317],[181,378],[-9,267],[131,181],[29,-187],[88,8],[-34,208],[62,194],[121,208],[-123,138],[-116,-64],[-118,69],[-144,-175],[-192,-37],[-275,51],[-57,-273],[-81,-117],[-27,-166],[-85,-151],[-2,-199],[-91,-147]],[[23735,44239],[372,-3279]],[[27335,43910],[-27,187],[-82,5],[-10,111],[-117,-34],[-48,192],[-80,140],[-61,-18],[-43,526],[-175,148],[-233,-89],[-77,121],[-17,167],[-63,90]],[[24353,38786],[383,-3341]],[[27580,37236],[67,229],[-15,334],[25,106],[-48,522]],[[24263,39584],[90,-798]],[[86315,96536],[76,-176],[108,-81],[18,-206]],[[86517,96073],[29,70],[140,-170],[29,-134]],[[86715,95839],[40,25]],[[86755,95864],[-109,487],[-37,280],[-360,866],[-154,258],[-26,-33],[298,-616],[41,-183],[17,-377],[-110,-10]],[[85919,97958],[89,-224],[40,97],[-83,167],[-46,-40]],[[85736,98213],[57,-143],[52,81],[-109,62]],[[85214,98724],[354,-394],[52,85],[-304,347],[-102,-38]],[[84146,94816],[1194,-329]],[[85340,94487],[155,1649],[22,-7],[74,697]],[[85591,96826],[-73,162],[-355,176],[-139,-134],[-83,-202],[10,-425],[52,-37],[-138,-441],[-94,-133],[0,-111],[-97,-223],[-68,-40],[-63,-264],[-122,24],[-96,-307],[-179,-55]],[[83862,99608],[105,-374],[302,-372],[157,-255],[104,-106],[301,142],[41,160],[112,109],[-305,274],[-30,-81],[-193,68],[-12,84],[-321,322],[-255,116],[-6,-87]],[[83457,99810],[252,-176],[-36,182],[-212,75],[-4,-81]],[[83145,99811],[34,-123],[81,-1],[-13,152],[-102,-28]],[[81555,99934],[106,-66],[40,63],[-143,68],[-3,-65]],[[80189,68673],[49,-409],[-76,-467],[16,-356],[38,-312],[-76,-122]],[[80140,67007],[161,-155],[157,215],[71,-61],[154,21],[159,-176],[68,39]],[[81100,67033],[2,150],[122,136],[174,39]],[[81547,67512],[-369,624]],[[81178,68136],[-180,-126],[-173,161],[-228,85],[-68,146],[-16,279]],[[75003,70150],[73,400],[55,132]],[[75131,70682],[169,345]],[[74524,71566],[-30,-332],[-95,19],[-337,-211],[-72,-95]],[[73990,70947],[-26,-388],[185,-155]],[[51145,89595],[490,194],[56,-131]],[[52487,90675],[-106,297],[-76,-8],[-49,-193],[-148,28],[-31,-60],[-225,31],[-76,-41],[-24,150]],[[51752,90879],[-168,-49],[-39,-132],[-58,93],[-102,-200],[-66,2],[-111,-123],[-52,47],[19,-231]],[[51175,90286],[-4,-163],[-161,-76]],[[51010,90047],[-39,-220],[174,-232]],[[56563,41949],[476,5]],[[57098,43669],[-741,0]],[[56357,43669],[-51,-503],[-184,-1]],[[25124,95090],[81,-118],[51,81],[-51,118],[-81,-81]],[[24855,94663],[14,-76],[95,94],[3,250],[-112,-268]],[[24908,93151],[134,-27],[163,80],[44,114],[84,8]],[[25464,93715],[60,227],[143,329],[-50,555],[-96,348],[-67,-105],[-46,75],[-181,-461],[66,-185],[-64,-302],[-87,-260],[-74,-60],[126,281],[34,394],[-31,143],[-124,16],[-143,-77],[-105,-175],[23,-170],[-52,-334],[-1,316],[-43,99],[27,150],[-129,-116]],[[20175,89861],[13,113],[190,47],[10,-122],[203,99],[84,-245],[227,-110],[4,366],[81,102],[140,60],[56,170],[488,525],[91,316],[4,106]],[[21622,91487],[-7,-79],[-174,-184],[-149,-44],[-131,-111],[-217,-96],[-195,-143],[33,-152],[61,18],[-66,-341],[9,-235],[-56,319],[-180,249],[-233,14],[-225,-109],[45,-181],[-124,91],[-378,-50],[-106,16],[-332,185],[-70,74]],[[73498,39485],[41,597]],[[42432,47105],[767,92],[1150,99]],[[44289,48960],[-1755,-207],[-191,-14]],[[42343,48739],[28,-297],[61,-1337]],[[76225,55659],[173,-99],[154,319],[57,-93],[59,70]],[[76605,56569],[-305,50],[-72,-52]],[[68310,41325],[685,-122]],[[68998,41258],[57,1264]],[[68422,43655],[-74,-1327],[22,-4],[-40,-667]],[[14713,3518],[-31,-15],[-123,722],[-807,-407],[9,-52],[-1598,-829]],[[12163,2937],[-33,-350],[67,-497],[-17,-293],[49,-31],[161,-495],[-71,-237],[119,25],[111,150],[210,440],[136,192],[53,-4],[168,268],[-19,57],[159,222],[169,129],[233,70],[141,198],[223,89],[46,130],[212,102],[153,-121],[114,236],[15,163],[181,49],[-30,89]],[[12308,4392],[446,233],[-10,55],[787,408]],[[13531,5088],[-163,944],[20,12],[-108,641],[422,205]],[[13702,6890],[-57,320],[65,37],[-130,738]],[[12200,7276],[14,-436],[63,50],[-16,125],[197,-118],[191,-2],[-40,-114],[-166,-162],[16,-147],[-133,-115],[-56,52],[-11,302],[-93,21],[101,-504],[37,-409],[14,-443],[-76,-311],[66,-673]],[[82278,78672],[103,-75],[173,71],[200,-59],[-57,-554],[109,-31]],[[82806,78024],[233,1036],[123,398],[40,274],[124,408]],[[82746,80480],[-50,-517],[-134,-277]],[[14713,3518],[61,102],[-29,187],[56,5],[45,-155],[-55,-143],[24,-125],[188,-35],[0,104],[-94,69],[24,183],[135,-166],[-12,334],[-83,-5],[38,213],[-2,211],[54,96],[-133,11],[-15,137],[-105,70],[-49,191],[-119,203],[-19,-72],[120,-324],[-89,16],[-138,337],[-163,188]],[[14353,5150],[-767,-378],[-55,316]],[[12308,4392],[28,-830],[-52,-120],[12,-182],[-133,-323]],[[9200,40555],[-68,330],[61,169],[-82,40],[-44,123],[79,230],[-97,-98],[3,247],[-97,6],[-34,-148],[-127,-274],[-84,2],[-99,-280],[-35,-200],[-84,-157],[-92,-72],[-83,117],[-55,-72],[153,-363],[52,-180],[-27,-292],[45,-16],[-24,-224]],[[87334,49630],[80,673]],[[87081,50868],[-75,-40]],[[87006,50828],[-105,-42],[-116,-200],[-140,-37],[-82,55]],[[86563,50604],[-84,-581],[159,-245]],[[65627,43648],[-203,26],[2,226],[-112,68],[-381,44]],[[34852,38186],[998,206]],[[28833,31166],[447,132]],[[11533,38119],[-41,261],[-92,-42],[-104,648],[-35,53]],[[11064,38941],[34,-92],[-155,-75],[-38,-180],[29,-177],[-137,-166],[-5,-195]],[[41922,63639],[-75,1670]],[[41846,65348],[-1272,-171],[59,-1158]],[[90800,27449],[662,-453]],[[91475,28813],[-39,15],[29,273],[-309,18],[-355,-149],[-34,17]],[[90767,28987],[5,-194]],[[64959,67547],[495,-43],[1,169],[-199,77],[-32,100],[86,102],[49,-160],[38,54],[154,-14]],[[76580,61152],[56,223],[120,81],[56,-68],[105,446]],[[76800,62135],[-155,-39],[-71,113],[-77,304],[-166,-52],[-55,75]],[[75933,47086],[-56,-1470]],[[76357,45373],[122,-16],[85,122]],[[76564,45479],[126,1519]],[[76036,47073],[-103,13]],[[91188,39816],[-132,402],[-67,391],[-68,532],[-94,241],[-110,89],[-71,-19],[-2,-240],[50,-462],[-14,-176],[-56,-52]],[[19423,53431],[97,-780],[-86,-37],[312,-2529]],[[56500,46410],[61,128],[77,-28],[-36,158],[19,198],[93,121],[40,225],[83,34]],[[56837,47246],[-214,-4],[-9,816]],[[56614,48058],[-193,-30],[-60,70]],[[20586,6631],[39,163],[138,124],[55,-131],[45,80],[123,31],[13,194],[112,52],[12,149],[129,68],[51,-185]],[[21303,7176],[164,-124],[51,13],[69,265],[12,208],[82,190],[107,-121],[74,74],[92,-58],[78,116]],[[22032,7739],[-289,2089]],[[21743,9828],[-204,-83]],[[14353,5150],[-278,449],[-136,337],[181,110],[197,-53],[78,-97],[-303,66],[-78,-130],[231,-394]],[[14245,5438],[315,156],[-73,426]],[[14454,6202],[-141,260],[-1,244],[-56,134]],[[14256,6840],[-71,4],[-28,-140],[-121,90],[-148,190],[-186,-94]],[[15092,837],[197,290],[-144,-111],[-53,-179]],[[14901,1109],[101,-37],[-11,104],[-90,-67]],[[14646,1390],[52,-76],[102,50],[51,235],[84,71],[-52,-259],[244,-242],[60,35],[160,276],[-122,109],[20,233],[-44,189],[-67,50],[-34,241],[-92,-29],[-49,-193],[-162,-77],[-95,-176],[-56,-437]],[[14656,1030],[70,51],[83,244],[-153,-295]],[[64549,49907],[88,-225],[27,-302]],[[65338,50469],[-239,16],[13,337],[-290,215]],[[64822,51037],[-85,-145]],[[64737,50892],[-188,-313],[-47,-419],[47,-253]],[[35758,44731],[1168,243]],[[36926,44974],[-21,172],[-91,-1],[-77,551],[-92,26],[-53,369]],[[36592,46091],[-52,223]],[[35251,45054],[30,-44],[-134,-204],[72,-186]],[[12970,30044],[733,339],[1415,636]],[[14043,36424],[94,-190],[101,-648],[-74,-149],[-36,-194],[27,-277],[-48,-109],[-151,-97],[-180,-442],[-21,-181],[-99,-104],[-98,-220],[-178,-114],[-74,119],[-145,78],[-24,157],[-97,-15],[-12,-120],[-94,-44],[-74,-176],[112,-707],[-434,-197]],[[43030,50162],[1210,133]],[[42922,52561],[28,-693],[13,0],[67,-1706]],[[22557,12954],[286,-2175]],[[84465,84946],[91,961],[-10,31],[93,985]],[[84639,86923],[-25,7],[80,673]],[[84165,87743],[-30,-251],[-160,-383],[-198,-105],[-34,-221],[-235,-232],[-76,-215],[135,145],[46,-291],[-214,56],[-20,-220],[-133,37],[-19,-219],[-85,-203],[-195,51],[-30,-331]],[[57470,23829],[5,-86],[109,-49],[41,64],[123,-255],[51,-216]],[[57799,23287],[143,166],[61,-26],[82,169],[177,164],[278,-2],[93,170]],[[58633,23928],[-74,111],[-109,40],[4,167],[-96,116],[-93,212],[-4,398]],[[57875,24984],[-385,10]],[[76820,69078],[21,316]],[[76841,69394],[14,185],[-46,9],[-68,445]],[[76570,69847],[-205,-110],[-69,-184],[-38,59],[-134,-192]],[[43722,38820],[924,105]],[[44646,38925],[-25,838]],[[44620,39769],[-950,-109]],[[43670,39660],[25,-174],[27,-666]],[[42070,60275],[1579,168]],[[76839,65762],[293,-623]],[[77417,65168],[122,59],[27,130],[134,91]],[[79459,67722],[148,331],[92,27],[43,267],[62,102],[11,368]],[[79815,68817],[-72,26],[-185,189],[-30,-46],[-153,144],[-76,-140],[-252,256]],[[79047,69246],[-65,-275],[-112,-59],[-114,-324]],[[90821,33639],[271,199]],[[91081,33975],[2,199],[73,-34],[0,248]],[[91156,34388],[-267,-82],[-151,-9]],[[90738,34297],[-20,-205],[38,-95],[-29,-364],[94,6]],[[81015,72383],[162,106]],[[81177,72489],[124,120],[138,285],[70,-6],[248,273],[76,132]],[[81833,73293],[119,238],[-17,68]],[[81775,74118],[-142,-94],[-224,126],[-231,-49]],[[81178,74101],[-48,-301],[-79,-79],[-77,53]],[[63839,49004],[114,-197],[213,-17],[8,-174],[65,-86],[78,-300],[136,-15],[44,-232],[57,-10],[208,248],[72,-51],[43,86]],[[64549,49907],[-2,-256],[-135,2],[10,-172],[-321,30],[-36,120],[-211,39]],[[65356,81104],[-38,184],[-83,140],[-155,-84]],[[65080,81344],[-33,-38],[-79,227],[-114,-243],[-123,-121],[-43,-160],[-121,-91]],[[75331,72752],[-3,281]],[[75328,73033],[-21,197],[-92,408],[42,220]],[[75257,73858],[9,65]],[[75266,73923],[-47,-31],[-100,141],[-9,154],[-377,57],[21,333]],[[74129,74700],[50,-174],[-12,-142],[83,-345],[-46,-275],[32,-97]],[[69506,80772],[380,-157],[7,-84],[101,130],[-57,89],[-74,-43],[-256,100],[-101,-35]],[[70041,78968],[-95,167],[22,122],[-71,405],[12,507],[-45,224],[-105,29],[0,-120],[-145,-111],[-105,62],[-33,-66],[-117,89]],[[69359,80276],[-99,-1393]],[[69260,78883],[-72,-1001]],[[69188,77882],[-33,-442]],[[22080,3191],[1109,443]],[[22708,7144],[-144,-58],[-126,936],[-92,-70],[-69,-185],[10,-140],[-217,183],[-38,-71]],[[21303,7176],[25,-303],[-44,-228],[79,-51],[100,77],[73,-36],[20,-282],[80,-3],[51,-267],[102,-171],[-24,-195],[4,-341],[32,-249],[118,-164],[111,-526],[44,-411],[-71,-259],[11,-362],[66,-214]],[[15419,1242],[35,-30],[74,424],[-70,-175],[-39,-219]],[[15701,1720],[-2,-267],[64,-118],[-50,-123],[-90,-26],[-133,85],[62,-130],[-82,-88],[23,-251],[-70,-161],[83,-139],[-97,-80],[125,-187],[942,460],[493,255],[1290,590]],[[15060,0],[83,139],[-90,-41],[7,-98]],[[78705,74301],[365,-70]],[[79343,75285],[28,136],[-240,54],[22,323],[-47,155]],[[79106,75953],[-185,35]],[[78921,75988],[18,-144],[-88,-110],[9,-273],[-62,-81],[-19,-200],[-98,-32],[-117,-197],[-2,-131]],[[29761,35971],[118,-1248]],[[86967,52213],[121,-701],[-82,-684]],[[87484,51402],[-109,183],[159,11],[123,168],[25,175],[106,1]],[[43679,79617],[-706,-87],[-10,223],[-392,-49],[-47,1203],[-430,-47],[-36,880]],[[64141,37040],[115,-221]],[[64256,36819],[30,408],[123,113],[-32,232]],[[73783,43934],[-40,-610]],[[74097,38343],[95,-21],[-47,-669]],[[74332,37612],[575,-132]],[[74979,38426],[-191,43],[4,57],[-190,42],[13,168],[-384,89]],[[34042,50558],[125,-157],[36,-167],[88,-128]],[[34600,49939],[58,94],[-26,267],[21,189],[79,82],[-35,153],[-35,494]],[[34662,51218],[-849,-180]],[[47765,82819],[-25,1072]],[[46942,83850],[0,-204],[-87,-138],[73,-41],[-13,-216],[34,-394],[42,-50],[37,-491],[47,-213],[405,59]],[[28496,16085],[183,-1759],[-124,47],[-87,-94],[16,-85],[-111,-313],[-54,-41]],[[79275,71613],[90,-205],[-28,-45]],[[79337,71363],[49,-5],[219,-498]],[[79605,70860],[127,15]],[[79732,70875],[30,198],[92,300],[-16,115],[91,439],[118,185]],[[79869,72310],[-104,-122],[-79,-174],[-319,-208],[-92,-193]],[[17804,62842],[-1710,-647],[-372,-163],[1,-67],[-212,-247],[20,-49],[-263,-103]],[[57191,57014],[-678,4]],[[56513,57018],[-6,-1052],[-63,-196],[47,-21]],[[74730,23216],[41,101],[30,317],[47,113],[-31,467],[21,317]],[[74838,24531],[-895,212]],[[34741,25883],[2225,487]],[[36169,28775],[-96,-20]],[[36073,28755],[40,-553],[-194,-38],[25,-334],[-384,-83],[24,-324],[-348,-77],[-8,-115],[-199,-38],[17,-215],[-191,-44],[30,-336],[-99,-22],[24,-334],[-96,-21]],[[52814,71203],[351,13]],[[67074,62744],[-280,35]],[[50466,47099],[-4,336]],[[91356,25324],[-167,-1398]],[[91476,26056],[-71,-192],[-49,-540]],[[52666,90930],[-196,452],[-167,530]],[[52303,91912],[-91,0]],[[52212,91912],[166,-446],[73,-282],[61,-113],[-17,-156],[105,-287]],[[51752,90879],[63,79],[186,-48],[-31,209],[49,158],[226,177],[-146,513]],[[52099,91967],[-1026,-20],[-93,-238],[-106,-63]],[[50874,91646],[27,-949],[274,-411]],[[91362,17161],[376,-145],[628,-293]],[[92366,16723],[9,395],[100,78],[-102,400],[62,42]],[[92435,17638],[-72,310],[-185,-120],[76,227],[-99,-34],[-90,676],[-195,-80]],[[83765,42669],[-106,815],[118,394],[-104,483]],[[79727,65619],[18,-66],[183,-178],[165,14]],[[80311,65684],[177,156]],[[80488,65840],[-425,847]],[[86474,46627],[84,40]],[[87608,47742],[-162,405]],[[56945,69757],[-125,-115],[-61,41],[-342,-46],[-59,32]],[[56018,69707],[-9,-1923]],[[76283,44135],[138,-572]],[[77344,43923],[26,618]],[[77370,44541],[-27,159]],[[77343,44700],[-974,116]],[[78794,70610],[360,986],[183,-233]],[[79275,71613],[-448,1016]],[[78827,72629],[-49,-126],[-137,-157],[-49,-246],[14,-113],[-86,-84]],[[76553,64796],[-41,-50],[72,-411]],[[76584,64335],[374,189],[83,-132]],[[76233,62722],[15,246],[172,245],[242,132]],[[76662,63345],[16,232],[51,81]],[[76729,63658],[-547,114]],[[20871,14407],[566,233]],[[21623,14717],[854,341]],[[21492,18262],[43,-320],[-323,-127],[22,-162],[-68,-26],[27,-216],[-71,-195],[14,-104],[-94,-32],[-15,-366],[43,-323],[-66,-25],[52,-380],[-55,-307],[41,-313],[62,25],[45,-325],[-343,-136]],[[20806,14930],[65,-523]],[[79815,68817],[180,189]],[[79679,70053],[-53,-31],[-17,-339],[-249,-127],[8,-104],[-151,-77],[-173,70]],[[79044,69445],[3,-199]],[[79835,67053],[77,-163]],[[79967,66875],[173,132]],[[74989,42468],[-20,-619]],[[74969,41849],[883,-79]],[[75852,41770],[11,-1],[-61,952],[-101,6]],[[64804,59129],[92,-374],[142,-206],[74,-243]],[[65112,58306],[109,-124],[70,-173],[24,-330],[-36,-166],[-116,-79],[-26,-281],[-121,13]],[[65016,57166],[47,-350],[63,-175]],[[65126,56641],[336,-31]],[[65462,56610],[30,927]],[[64963,59109],[-159,20]],[[89110,18149],[1042,-486]],[[90360,19339],[44,48]],[[83365,47306],[581,497],[55,74]],[[84001,47877],[36,126],[-27,216]],[[83627,49065],[23,168],[-97,184]],[[86559,36290],[-44,253],[35,190],[78,185],[-94,313],[49,112],[117,-37],[51,96]],[[85648,38290],[-134,-314]],[[64014,57262],[370,-35]],[[64384,57227],[632,-61]],[[65112,58306],[-234,23],[-6,-226],[-869,56]],[[85349,42059],[68,-425],[167,-367],[16,-193]],[[28072,5401],[547,183],[998,311],[1194,359]],[[30811,6254],[-156,1612],[-27,333]],[[30628,8199],[-63,-41],[-513,-152],[-65,645],[-1142,-352]],[[91279,19394],[-26,202],[60,26],[-65,126],[-42,348],[27,11],[-25,464]],[[91208,20571],[-104,-478],[-442,318],[-69,12]],[[53838,31627],[1122,13]],[[57403,73472],[164,-1]],[[56745,75597],[-90,0],[-8,-1121]],[[76564,45479],[102,69],[15,120],[695,-116]],[[77376,45552],[92,-12],[16,349],[191,-23]],[[77675,45866],[10,392],[-56,5],[4,282],[-100,14],[67,307],[-122,132]],[[77478,46998],[-79,-148],[-112,-531],[-242,256]],[[23011,91654],[152,26],[74,-51]],[[22994,90626],[53,120],[189,83],[249,287],[-21,71],[167,239]],[[23535,91888],[-8,40]],[[23513,91993],[-203,-268],[-56,-280],[-14,125],[-202,37],[-118,-282],[-118,-203],[-35,-173]],[[63643,63597],[-4,-172],[268,-5],[986,-84]],[[64893,63336],[11,274]],[[64691,62429],[185,-34],[17,941]],[[67863,30934],[-3,212],[67,232],[-40,130],[20,158],[84,206],[2,211],[43,175]],[[63808,27372],[13,358]],[[63821,27730],[-197,-3],[-730,80],[-131,123],[14,225]],[[62490,28146],[-22,-643],[-19,3],[-40,-1338]],[[90799,36197],[-96,289],[-82,62],[66,148]],[[80100,54078],[574,-99]],[[53528,18727],[776,3]],[[54323,21053],[-482,-5]],[[50060,21239],[-1108,-71]],[[48952,21168],[-251,-20]],[[48701,21148],[33,-1300]],[[91821,18946],[370,162],[-24,344],[-77,573]],[[92090,20025],[-89,-29],[14,359],[-244,-20],[-66,611],[-100,-23]],[[91605,20923],[-282,-50],[-88,-322],[-27,20]],[[54150,35647],[23,211],[124,194],[-10,242]],[[54287,36294],[-61,123],[-404,-6]],[[19165,35310],[-662,1818]],[[18503,37128],[-2778,-1134]],[[91566,21208],[39,-285]],[[92090,20025],[109,35],[197,-122],[226,36]],[[92622,19974],[50,242],[-77,417],[49,125],[-82,438],[21,328]],[[68914,22457],[20,-269],[174,29],[-99,338],[-95,-98]],[[68290,23143],[62,-57],[22,205],[-84,-148]],[[67826,25221],[15,-185],[152,-460],[262,-249],[56,117],[-10,-170],[55,-328],[131,-381],[24,-333],[68,5],[113,-126],[3,-254],[73,-149],[116,-28],[12,303],[-74,-12],[3,511],[-108,135],[-19,179],[-69,180],[35,137],[-64,140],[24,82],[-93,125],[-50,170],[-82,509]],[[76231,37858],[-510,124]],[[82561,70426],[-94,-16],[-316,635]],[[82019,70515],[-19,-126],[-240,-491],[20,-131],[-54,-139]],[[81726,69628],[11,-80],[246,-401]],[[43706,31956],[1150,136]],[[44852,35572],[-16,335],[-96,-11]],[[44740,35896],[-1006,-101]],[[43734,35795],[-33,-2]],[[52144,30673],[11,-1341]],[[66216,22753],[392,-46]],[[67728,24126],[-77,56],[-43,143],[32,100],[-104,261],[-50,281],[-59,147],[-2,164]],[[67425,25278],[-381,74],[-19,-25]],[[67025,25327],[-41,-660],[-380,42]],[[17638,86332],[-356,62],[10,193],[-524,70],[-815,788],[2,97],[-394,14]],[[91294,34269],[-22,127]],[[91272,34396],[-141,122]],[[91131,34518],[25,-130]],[[33423,26949],[108,218],[81,270],[-25,302],[379,92],[-4,55],[191,42],[-9,113],[192,44],[-14,165],[190,43],[-9,111],[191,44],[-8,110],[190,43],[-4,55],[291,65],[3,-42],[899,186],[8,-110]],[[35899,32850],[-47,659]],[[61046,45497],[2,0]],[[77082,42322],[28,-115],[-2,-454]],[[77648,41658],[14,360],[129,-16],[15,341],[65,-8],[14,338]],[[60076,69299],[0,279],[261,-2]],[[60337,69576],[7,1385]],[[63815,32894],[957,-104]],[[64772,32790],[47,1182]],[[91409,34040],[136,160],[39,-64],[93,225],[-7,160],[-127,128]],[[91543,34649],[-131,32],[-76,-169],[4,-222]],[[55133,23380],[772,-8]],[[65462,56610],[458,-44],[-42,-892],[23,-3]],[[66442,57002],[-57,153],[-63,-132]],[[66226,57032],[39,83],[-40,161],[71,210],[-55,167]],[[64772,32790],[-6,-168]],[[19863,33706],[704,268]],[[19652,40892],[-1223,-477],[-778,-30]],[[17651,40385],[-25,-216],[180,-198],[26,-117],[-27,-436],[44,-112],[84,32],[105,-119],[4,-163],[135,-142],[189,-37],[78,-274],[21,-203],[-13,-292],[51,-290],[74,-208],[0,-210],[-74,-272]],[[15422,37367],[-480,925],[-319,144],[-117,11]],[[79497,76542],[-74,-361],[-260,49],[-25,-285],[-32,8]],[[40107,29519],[146,-2589]],[[82310,30194],[123,25],[70,171],[140,76],[151,-99],[59,-118],[71,11],[141,-203],[206,-159]],[[83745,31849],[-990,318]],[[82755,32167],[-231,67]],[[82524,32234],[-214,-2040]],[[57657,38342],[-4,-375],[-64,1],[-11,-1007]],[[43649,81014],[-73,1931]],[[43576,82945],[-175,-93],[-151,32],[-84,-89],[-149,80],[-126,-41],[-121,-219],[-88,-1],[-175,-155]],[[77705,62948],[44,-47],[351,-107],[116,-259]],[[77854,63835],[21,-149],[-121,-221],[-10,-402],[-39,-115]],[[67510,52611],[-581,85]],[[66732,52706],[-39,-1008]],[[79542,35042],[794,-213]],[[80470,36223],[-796,217]],[[66563,39855],[32,670]],[[66595,40525],[-96,16],[18,336],[-101,16],[7,141],[-95,21],[-50,115],[-227,37]],[[65548,40675],[-19,-176],[131,-508]],[[34662,51218],[-59,831]],[[78960,40192],[-38,-563],[-162,32],[-20,-284]],[[59198,22050],[-18,-956],[136,-8],[-10,-675]],[[60076,68051],[134,20],[252,-168]],[[60462,67903],[573,-4]],[[61100,69571],[-172,55],[-187,-113],[-81,63],[-323,0]],[[77358,35895],[151,-61],[91,-140],[282,-270],[75,17]],[[77957,35441],[46,592],[155,-37],[24,289]],[[77414,36445],[-56,-550]],[[78260,58082],[54,-103],[80,41],[155,-220],[81,-42],[250,-313],[182,-102]],[[79335,57719],[-28,85],[76,257],[-39,96],[81,102],[157,86]],[[79429,58617],[-130,-94],[-41,164],[-102,-28],[-61,112],[-291,125],[-100,-68],[-117,170]],[[63959,59317],[832,-67],[13,-121]],[[40157,65970],[191,30],[-49,1008],[229,31],[-32,626],[384,49],[-16,334]],[[42543,35651],[-1070,-142]],[[60832,66572],[339,0],[164,101],[131,206]],[[60462,67903],[-6,-357],[-131,-268],[125,-42],[0,-665]],[[79841,56595],[64,-172],[177,103]],[[80935,57060],[-92,376],[-145,466]],[[80181,58009],[-128,-531],[-238,-279],[98,-166],[19,-162],[-91,-276]],[[79789,56798],[52,-203]],[[78896,72816],[-69,-187]],[[81293,89453],[772,-176],[54,661],[390,-87]],[[81961,90993],[-175,-397],[-87,-288],[-232,-547],[-174,-308]],[[79376,64518],[-157,-73]],[[79219,64445],[-240,109]],[[78979,64554],[-158,-11],[-222,-179]],[[78578,76048],[343,-60]],[[79343,77450],[-260,29]],[[78919,77496],[-16,-78],[-155,-81],[-105,-223],[49,-63],[-1,-201],[180,-133],[-47,-152],[-141,-48],[8,-173],[-113,-296]],[[76327,70616],[-251,204],[-100,-25]],[[75873,70878],[39,-183],[-56,-66]],[[75856,70629],[-62,-938],[-19,-55]],[[87011,60625],[115,143],[71,-37]],[[76662,63345],[224,-387]],[[77207,62894],[114,254]],[[77321,63148],[-80,273],[111,250]],[[77352,63671],[-311,721]],[[76584,64335],[125,-135],[79,-364],[-59,-178]],[[62338,43104],[1003,-58]],[[62484,44078],[-111,-343],[-36,-351],[1,-280]],[[77465,70735],[97,62],[0,-255],[74,13],[46,-113],[-27,-394],[16,-223]],[[77671,69825],[-1,-3]],[[77870,69886],[82,27],[57,243],[-20,61],[129,435]],[[57481,78599],[200,93]],[[57530,80637],[-231,-1853],[182,-185]],[[58661,25620],[130,-39],[92,100],[81,-25]],[[58964,25656],[27,614],[65,-4],[0,333]],[[66876,69365],[254,-29],[26,678]],[[77343,44700],[33,852]],[[81282,31551],[171,-230],[306,-532],[101,-266],[315,-412]],[[82175,30111],[135,83]],[[82524,32234],[-893,271]],[[86435,45224],[176,172]],[[86611,45396],[44,100],[109,-55]],[[86764,45441],[148,100]],[[63387,56063],[19,1258]],[[91125,35276],[148,-73],[245,83],[7,-151],[86,556],[13,781]],[[77675,45866],[128,-13]],[[78058,47482],[-151,-7]],[[77757,47185],[-118,-174],[-161,-13]],[[66921,16786],[221,-22],[252,133],[21,127],[154,50],[64,101],[29,196],[100,146],[39,151],[102,155],[92,23],[43,321],[170,47],[217,-61]],[[68496,19429],[-194,30],[34,662],[-194,29]],[[80457,74113],[132,-83],[189,-437]],[[81178,74101],[114,226],[-17,124],[-202,77],[-45,180],[-85,96],[-175,-22]],[[27948,87541],[10,-131],[81,-123],[32,-160],[360,-322],[100,90],[49,-98],[178,-9],[110,69],[116,269],[-7,149],[-77,204],[4,343],[-121,214],[-121,129],[-64,-52],[-267,-43],[-135,-234],[-203,-129],[-45,-166]],[[26988,88208],[30,-141],[198,-232],[52,-175],[85,-29],[-17,406],[-174,115],[-94,321],[-91,-137],[11,-128]],[[84423,34696],[117,210]],[[78365,73921],[-11,-392],[67,-64],[-15,-187]],[[57304,20038],[22,-46],[-19,-1302],[-22,1],[-3,-664],[870,-20]],[[58133,20472],[-875,28],[-26,-309],[72,-153]],[[38588,22775],[-764,-145],[42,-658],[61,17],[81,-1220],[-282,-98],[27,-396],[55,11],[11,-165],[-95,-18],[9,-146]],[[85139,92515],[29,277]],[[85168,92792],[-774,234],[-97,-987],[-580,168]],[[79632,65685],[-273,-670],[-140,-570]],[[82100,72598],[-97,504],[-170,191]],[[81177,72489],[119,-532],[-22,-105],[98,-289]],[[52901,86257],[208,163],[76,393],[101,96],[56,163],[23,278],[108,255]],[[75241,44843],[24,-1]],[[75265,44842],[10,243],[25,1627]],[[74980,46563],[-16,-181]],[[74773,45850],[-7,-591],[31,-121],[-80,-59],[90,-204]],[[53860,21379],[-32,439],[-109,279],[-284,359],[-40,174],[35,77]],[[52810,23798],[6,-996]],[[80812,46391],[146,-238],[70,106],[171,-51]],[[95117,22957],[-68,25],[6,172],[-98,6],[-213,132],[40,-242],[-425,-352]],[[94359,22698],[12,-44]],[[64464,51251],[144,-216],[59,19],[70,-162]],[[64822,51037],[136,85],[80,172],[50,-5],[116,190],[126,-1],[-80,166],[70,164]],[[65048,52625],[-81,-102],[-76,125],[-480,-760],[223,-420],[-170,-217]],[[86502,44460],[59,-159],[70,18],[157,183],[125,23]],[[86913,44525],[-14,224],[43,242],[66,115]],[[86764,45441],[-49,-117],[-104,72]],[[43974,16718],[775,92],[5,-110],[581,66]],[[72943,60709],[88,239]],[[73031,60948],[19,9],[54,889]],[[73104,61846],[-808,134]],[[72296,61980],[-14,2]],[[72282,61982],[-30,-521]],[[72252,61461],[5,-420],[69,-247],[-19,-143]],[[45422,10936],[26,-656],[121,13],[13,-328],[194,22]],[[73031,60948],[87,-89],[155,76],[77,-107],[-40,-187],[264,-166]],[[73925,61076],[60,219],[-35,193],[-141,247]],[[73572,61773],[-468,73]],[[58964,25656],[122,-84],[111,-300]],[[72910,41237],[66,879]],[[58142,17141],[-9,-693],[-56,-82],[33,-247],[-155,-68],[-35,82],[-203,-279],[21,-136],[-82,-224],[-59,-45],[-316,257],[-136,-106]],[[74838,24531],[29,656],[-48,41],[-80,251],[-131,25],[-50,191],[-7,248]],[[51405,49827],[-12,1348]],[[51393,51175],[-958,-35]],[[50428,50800],[14,-1007]],[[56837,47246],[68,120],[84,-58],[44,99],[104,-10]],[[57131,47843],[-337,10],[-119,-57],[-61,262]],[[46417,89262],[194,11]],[[47839,92911],[-85,-32],[7,-121],[-86,-53],[68,-80],[61,-558],[-95,-56],[40,-247],[-83,-195],[-94,-111],[-72,53],[-57,-130],[-71,14],[-125,-302],[-206,-271],[-41,-249],[7,-183],[-71,-113],[15,-153],[-117,-60],[-46,-271],[-68,-81],[-54,-230],[-249,-220]],[[54564,84215],[57,50],[72,331],[-72,109],[167,237],[52,298],[103,70],[39,185],[52,15]],[[54131,86652],[-644,-1092]],[[53487,85560],[570,-600],[81,-414],[258,-455]],[[77306,68010],[25,183]],[[77272,69305],[-431,89]],[[78112,65236],[-46,153],[63,178]],[[77156,70564],[393,-716],[122,-23]],[[75328,73033],[39,48],[166,-30],[-32,102],[132,73]],[[75633,73226],[33,564],[-91,14]],[[75575,73804],[-126,52],[-192,2]],[[78827,40496],[-793,145]],[[75633,73226],[473,-80]],[[76211,73125],[33,566],[65,31],[88,307],[-6,215]],[[75881,74354],[-234,51],[-57,-355],[-15,-246]],[[79228,46134],[43,-21],[106,195]],[[79103,47553],[-122,261],[-96,-68],[-25,-322]],[[78813,47045],[-60,-505],[167,-233],[308,-173]],[[79974,49413],[100,1],[300,649],[33,167],[170,120]],[[90509,32551],[-161,530]],[[90348,33081],[-163,544],[1,169],[-83,121],[-101,-7]],[[70692,69935],[191,-41],[-5,-338],[47,-159],[154,-15],[-14,-252],[80,-152],[91,28],[65,-108]],[[68355,64624],[388,-46]],[[69053,65086],[-11,908]],[[69042,65994],[-623,76]],[[62346,42917],[-8,187]],[[61606,44130],[-26,-1187]],[[92483,22244],[198,-27],[244,57],[214,-35]],[[93139,22239],[-67,395],[-69,13],[41,232],[-32,234],[77,234],[126,211]],[[93215,23558],[-13,240]],[[93202,23798],[-222,86],[7,-202],[-332,241],[21,93],[-96,27],[-46,-82]],[[49501,11958],[-530,-37],[-34,1324],[55,4],[-16,660]],[[48976,13909],[-388,-28]],[[48588,13881],[-194,-16]],[[91460,33784],[203,-103]],[[91663,33681],[28,-7]],[[91832,34451],[-131,103],[-156,199],[-2,-104]],[[84479,54190],[-484,122]],[[64121,17701],[144,-218],[177,-76],[85,45],[158,-106],[151,-26],[245,-256],[185,-369],[200,-37],[77,-143]],[[65080,81344],[-10,212]],[[64188,82036],[133,-1005]],[[83337,87950],[828,-207]],[[75852,41770],[-9,-392]],[[76344,41278],[8,231],[-72,14],[32,298],[52,136],[-40,67],[46,398]],[[76391,42872],[-684,72]],[[84639,86923],[705,-194],[23,-132],[84,-47]],[[85451,86550],[168,418],[189,651]],[[57565,61948],[-8,-161]],[[57557,63693],[13,-1680],[-5,-65]],[[68891,39209],[55,1050]],[[76016,71955],[18,-4]],[[77957,35441],[184,41],[189,-62],[213,-341],[158,-317]],[[78701,34762],[23,233],[159,-41]],[[77762,66922],[55,1007]],[[21172,23639],[85,86],[58,275],[137,151],[32,213],[-25,180],[198,503],[38,265],[98,99]],[[21793,25411],[139,39],[48,264],[-34,135],[101,330],[50,46]],[[23548,31132],[-445,-156],[-1702,-617],[-1045,-408]],[[20344,29945],[828,-6306]],[[9446,43257],[101,75]],[[9547,43332],[173,52],[29,67],[136,-57],[647,316]],[[9998,45792],[13,-74],[-103,-101],[-120,-527],[-142,-285],[-51,-30],[-192,-339],[-21,-193],[-53,-68],[-67,-285]],[[9262,43890],[-49,-151],[9,-165],[65,-255],[159,-62]],[[60476,77376],[129,-90],[75,-199],[109,-92],[173,-303]],[[62178,77313],[-142,132],[-62,-112],[-74,52],[15,729],[65,644],[-139,-1]],[[61242,79060],[-432,49]],[[69042,65994],[-2,109]],[[69022,67316],[-140,17],[-73,241],[-258,173]],[[68551,67747],[26,-119],[-410,54],[-23,-503]],[[89629,37742],[100,-175],[-118,-123],[48,-172],[209,103],[114,-404]],[[89980,37550],[-100,169],[18,270]],[[89898,37989],[-106,131]],[[94285,23789],[-16,-118],[90,-973]],[[95336,23105],[-71,511],[3,268]],[[94670,24675],[-183,-34],[-87,-165],[-64,24],[-98,-377],[107,-113],[-60,-221]],[[90803,26186],[9,-144],[-78,-260],[52,-213]],[[90786,25569],[570,-245]],[[81791,58265],[-49,96],[120,42],[-103,105],[-29,283],[55,434],[-62,38]],[[64891,55539],[56,-171],[125,-178],[-3,-132],[65,-5]],[[65553,54678],[179,-19]],[[65126,56641],[6,-254],[-125,-281],[-31,-270],[-76,-132],[-9,-165]],[[44740,35896],[-40,1026],[136,14]],[[44788,38272],[-117,-14],[-25,667]],[[43722,38820],[29,-667],[-38,-174]],[[43713,37979],[48,-1169],[-47,-6],[-13,-226],[33,-783]],[[82755,32167],[68,594],[-49,56],[71,786]],[[56375,55751],[-591,9]],[[55581,55762],[5,-976],[-7,-509]],[[56506,57638],[7,-620]],[[56504,58981],[8,-338],[-6,-1005]],[[70392,36067],[490,-87]],[[70464,37319],[-20,-332],[52,-206],[-19,-302],[-65,7],[-20,-419]],[[89689,53638],[308,-302],[201,-72],[101,104],[16,138],[-54,285],[45,168],[77,531]],[[52303,91912],[-150,565],[-106,565]],[[51986,93040],[34,-280],[119,-588],[73,-260]],[[52099,91967],[-85,418],[-9,145],[-89,344],[-192,171],[-76,-62],[98,-65],[24,-191],[-55,-11],[-192,284],[-55,12]],[[50626,93063],[14,-1426],[234,9]],[[82185,53041],[11,136],[-94,141],[-128,-32],[-32,178],[39,225]],[[81584,53794],[-166,-311]],[[81379,53411],[-241,-462]],[[81138,52949],[502,-421]],[[21177,21200],[56,189],[116,-33],[62,216],[120,23],[-19,144],[70,49],[25,163]],[[21344,22921],[-75,55],[-97,663]],[[87848,43240],[99,-108],[18,153],[165,-7]],[[88130,43278],[75,359],[32,331],[61,160],[221,296],[-23,264],[-88,27]],[[87982,44174],[-19,-136]],[[87963,44038],[-31,-311],[-93,-335],[9,-152]],[[56811,83919],[-68,-100],[-90,274],[60,105],[-68,180]],[[56645,84378],[-91,-13],[-74,181],[-116,54],[-104,-222]],[[55856,84291],[-385,-354],[-397,-436]],[[55074,83501],[-261,-1436],[224,286],[80,-5]],[[89166,49706],[-62,100],[-88,-196],[-196,-127],[-112,-126],[-9,-184]],[[17264,89160],[-266,35],[-96,-44]],[[16902,89151],[-69,-26],[-93,156],[-33,201],[-181,9],[-69,-64],[-119,151]],[[16338,89578],[-2,-83],[-134,10],[-6,-232],[-621,29]],[[58952,69239],[-59,-130],[-34,70],[-104,-424]],[[66192,64548],[-870,94]],[[91088,34739],[-17,-144],[60,-77]],[[91272,34396],[57,203],[-100,332],[-188,184]],[[48588,13881],[-17,658],[56,4],[-34,1315]],[[48593,15858],[-121,-9]],[[48472,15849],[-853,-68]],[[89432,29763],[451,-781]],[[90767,28987],[32,654],[57,125],[60,439],[66,629]],[[82549,56715],[-32,-90],[-117,-37],[-196,-178],[-136,10]],[[47441,64910],[96,-66],[92,103],[86,189]],[[46676,27778],[-191,-16],[21,-670],[19,1],[43,-1327],[35,-216]],[[58517,43091],[669,-39]],[[59210,43951],[4,253]],[[13973,38553],[-28,199]],[[92263,28527],[5,284],[225,-121],[-4,305],[-40,23],[35,337],[-105,77],[140,570]],[[91643,30260],[-152,-1454]],[[74303,76299],[424,-97],[46,773]],[[74773,76975],[-19,4]],[[74754,76979],[-1019,203]],[[73446,77231],[-58,-754]],[[74828,75738],[623,-96]],[[75694,76782],[-921,193]],[[80208,53854],[97,-97],[-10,-173],[179,-107],[89,-114],[206,-145]],[[80769,53218],[302,-98],[67,-171]],[[42432,47105],[29,-346],[76,-1684]],[[54507,36992],[-38,-152],[54,-254],[-165,-88],[7,-157],[-78,-47]],[[59407,79261],[11,168],[-120,323],[-1,180],[-116,213],[8,157],[-90,102],[-22,133],[51,79],[36,297],[-80,150]],[[78671,65706],[73,-172]],[[78744,65534],[161,400],[111,-163],[141,139],[120,16]],[[79277,65926],[-42,58],[-56,312],[-125,-11],[-77,231],[34,81]],[[47453,64193],[27,-1094]],[[54017,73758],[132,99],[50,182],[98,23],[69,166],[78,-31],[-22,217],[102,-8],[-9,254],[97,34],[21,281]],[[54633,74975],[-836,827]],[[80157,72046],[-1,-966],[-20,-287],[36,-244]],[[80511,70601],[65,331],[80,225],[-14,130],[15,852]],[[64070,51157],[50,22],[5,207],[53,43],[286,-178]],[[39687,57635],[760,115]],[[32677,21503],[-255,-65],[59,-668],[14,3],[143,-1649],[-111,-29],[116,-1316],[34,-187]],[[73086,51891],[90,-528],[74,-188]],[[73250,51175],[63,211],[213,124],[396,-80]],[[72357,58235],[-38,978]],[[72267,59501],[-181,-94],[-119,180],[-25,-111],[-126,2],[-97,-136],[-168,11],[-2,63]],[[71549,59416],[-89,-79]],[[15582,3209],[67,-146]],[[15307,4945],[124,-211],[110,-351],[134,-43],[24,-198],[-59,-108],[-76,-336],[42,-223],[-24,-172]],[[15582,3303],[0,-94]],[[74436,45637],[-84,7],[-111,114]],[[74241,45758],[-112,-79],[-113,-159],[-119,187]],[[73897,45707],[-52,-766]],[[51862,67685],[143,-66]],[[30855,43214],[-1,-1]],[[67406,40944],[-193,29],[-41,-540],[-577,92]],[[59674,64232],[-194,12],[2,112]],[[75469,69590],[1,15],[-601,113]],[[81387,88448],[984,-248]],[[81293,89453],[-112,-183],[-131,-333],[90,137],[96,-120],[57,-252],[94,-254]],[[89947,45628],[57,-193]],[[90004,45435],[635,-369]],[[90639,45066],[-114,645],[-46,106],[-99,-29],[-68,171],[-79,409],[-28,513],[42,151],[-78,437]],[[89680,47310],[13,-293],[117,-595],[-40,-100],[121,-104],[65,-242],[-53,-134],[-83,18],[127,-232]],[[89393,45821],[-48,170],[-42,-137]],[[89303,45854],[90,-33]],[[78155,68914],[428,1120]],[[88623,42560],[-43,-290],[-54,-36],[-85,188],[-74,13],[28,154],[-70,80],[-16,-344],[54,-416],[67,201],[131,-10],[52,-123],[-55,-164],[21,-196]],[[63301,41327],[-472,47]],[[62829,41374],[102,-135],[13,-100]],[[55932,57645],[574,-7]],[[55739,59326],[6,-672],[-4,-1006],[191,-3]],[[91655,33385],[18,119],[-77,24],[67,153]],[[75614,38682],[33,-7],[35,444],[131,28]],[[75058,39480],[-50,-670]],[[52461,38774],[134,-14],[56,65]],[[32469,44009],[-157,1879],[-126,1431]],[[30628,8199],[152,174],[120,56],[-17,165],[288,87],[-16,162],[192,56],[-46,486],[380,107]],[[14506,38447],[75,254],[144,65],[-44,180],[2,235]],[[80787,78990],[601,-175]],[[81388,78815],[2,128],[-125,324],[-64,40],[-67,293],[-203,179]],[[17202,90102],[-111,15],[-5,-149]],[[17086,89968],[-276,-200],[-133,-173],[129,-322],[96,-122]],[[65702,20157],[15,348],[-178,22],[14,332]],[[65553,20859],[-202,10],[10,162],[-196,8],[-5,-155],[-194,35],[-959,112]],[[66983,68679],[213,-250],[145,-73],[171,-23]],[[52426,42805],[-12,1343]],[[75378,64931],[32,505],[30,-5],[36,540]],[[75157,66134],[-257,-70]],[[21389,37719],[554,198],[1608,593],[802,276]],[[22123,43694],[-1306,-2373]],[[57160,71947],[370,373],[235,-12],[268,-197],[10,122],[114,34],[64,-146],[85,62],[-31,79],[121,34]],[[58396,72296],[14,1156]],[[76215,67577],[3,168],[-59,216],[-120,21]],[[72404,43353],[-62,13],[22,336]],[[62490,74846],[87,64],[81,225],[144,30],[107,-173],[38,-176],[95,-5],[9,334],[40,-3]],[[62664,77542],[-145,-106],[-69,101],[15,192],[-92,-98],[-45,-292]],[[74473,46807],[192,-97]],[[74637,47742],[-164,-935]],[[80769,53218],[-162,-491],[-110,-176]],[[34876,22698],[581,135]],[[35457,22833],[530,108]],[[46603,25550],[-145,190],[-203,5],[-29,86],[-128,89],[-134,247],[-214,-82],[-132,56],[-102,141],[-151,-44],[-161,76]],[[96137,29538],[104,-48],[63,-339],[126,-264],[72,19],[57,186],[119,62],[34,-154],[43,270],[-412,219],[-82,201],[-124,-152]],[[96258,28794],[48,27]],[[96306,28821],[-154,339],[-232,256],[20,-97],[184,-204],[134,-321]],[[77352,63671],[119,139],[145,-69],[160,214]],[[69265,38345],[63,1179],[51,669]],[[55021,67944],[154,-125]],[[55e3,69403],[4,-1410],[17,-49]],[[57304,20038],[-133,-204],[-167,117],[-185,-170]],[[72903,43254],[72,1004]],[[10478,53706],[105,-461],[-1,-151],[-135,-217],[-49,50],[-148,-251],[-47,-187],[98,-272],[41,-285],[-41,-201],[-160,-120],[-119,-407],[-62,-375],[-183,-239],[-34,-501]],[[51393,51175],[383,12]],[[46478,47171],[-62,1670]],[[75728,43588],[160,-14],[24,640]],[[75484,44821],[-219,21]],[[67025,25327],[13,363]],[[57565,61948],[-69,42],[-36,289],[-183,-98],[-133,130],[-105,-208],[-95,-2],[-63,107]],[[74523,57041],[153,250],[222,302],[94,316]],[[74992,57909],[-158,357]],[[74834,58266],[-223,289]],[[74007,58660],[1,-5]],[[73968,58582],[5,-23]],[[73483,67548],[89,-239]],[[74390,66779],[104,640]],[[76372,31256],[-136,147],[-23,152],[72,187],[-82,3],[-51,184],[29,275]],[[75836,32300],[-166,-1674]],[[75107,30787],[-378,121],[30,334]],[[66554,33815],[112,-20]],[[44701,13596],[-24,567],[-690,-88],[-57,1310]],[[66786,54759],[-14,121],[97,202]],[[66199,54120],[-48,-93],[40,-228]],[[68410,77987],[778,-105]],[[69260,78883],[-902,119]],[[90626,34603],[112,-306]],[[65153,36153],[-768,90]],[[64385,36243],[-18,-400]],[[64367,35843],[-26,-320],[-93,-144],[-172,-126]],[[78080,72979],[249,-30]],[[78094,74083],[-147,-176],[-147,29],[-62,-686]],[[9118,42127],[-35,266],[16,189],[152,153],[117,332],[50,9],[28,181]],[[9262,43890],[-44,262],[-153,-72],[-15,93],[-130,-50],[-7,316]],[[8913,44439],[-68,-74],[-17,-231],[-50,-116],[10,-207],[98,-396],[-25,-321],[14,-172],[-84,-205],[42,-257],[72,-179],[26,-245]],[[80847,69397],[282,-236]],[[81129,69161],[78,9],[62,120],[175,189],[282,149]],[[81018,70667],[45,-581],[-127,-208],[-2,-139],[-118,-69]],[[64367,35843],[-1225,119]],[[49508,96836],[-167,63],[-168,-345],[-69,-28],[-68,-152],[-135,43],[-151,-162],[-144,-64],[-87,58],[-56,-116],[42,-190],[-69,-187],[-86,-62],[5,-119]],[[90348,33081],[25,163],[82,-81],[116,121],[150,-8],[52,81],[48,282]],[[46714,41140],[930,75]],[[49238,71200],[699,44]],[[74812,36259],[-756,170]],[[60344,32814],[-25,-1175]],[[92366,16723],[602,-290]],[[92907,18864],[-78,267]],[[92829,19131],[-200,-282],[88,-256],[-109,-153],[65,-283],[-124,-87],[73,-308],[-187,-124]],[[71442,62123],[840,-141]],[[72296,61980],[104,159],[-119,53],[32,81],[-63,170],[55,155],[-35,379],[21,393],[66,117]],[[14752,41404],[222,572]],[[17385,65864],[-1904,-385],[20,-358],[-74,-273],[-100,39],[40,-513],[-27,-85],[79,-175],[16,-538],[-31,-444],[-215,-922],[-136,-264]],[[42606,35662],[-44,996],[-20,168]],[[42542,36826],[-1127,-152]],[[68727,60869],[89,156],[128,-35],[102,-145],[77,87]],[[69123,60932],[43,154],[-13,201],[66,5],[49,1115]],[[68585,62543],[-31,4]],[[58387,71573],[9,723]],[[77275,60978],[18,175],[-96,53],[-82,251],[25,211]],[[77140,61668],[-47,97]],[[74241,45758],[96,737],[-9,302]],[[74328,46797],[-70,112]],[[73818,46013],[-40,-95],[119,-211]],[[70652,33470],[830,-156]],[[70815,34786],[-40,-658],[-231,42]],[[70544,34170],[55,-271],[53,-429]],[[45684,81205],[-72,2539]],[[45384,85187],[-153,-158],[-18,-110],[-234,-254],[-86,-352],[-176,-86],[-38,-147],[-167,-101],[37,-121],[-41,-237],[-53,218],[-38,-95],[3,-229],[-97,-42],[-82,-362],[-113,-103],[-113,51],[-23,-127],[-59,80],[-255,19],[-102,-86]],[[79044,69445],[-461,589]],[[77468,73138],[-57,185],[-59,19],[52,129],[-73,204],[45,248]],[[76859,74143],[-26,-649],[41,-151],[-73,-127],[-87,-16]],[[80511,70601],[399,54]],[[95374,17404],[134,-56],[-72,-141],[13,-242],[141,-12],[14,-151]],[[96416,17475],[-12,333],[-169,8],[8,204],[76,370],[-164,24]],[[58775,30621],[14,936]],[[60499,74297],[53,168],[88,600],[-62,369],[-105,273],[-8,278]],[[45804,35686],[-43,1342]],[[62064,28549],[-13,-47],[-206,-93]],[[9319,38374],[295,-7],[171,-313],[49,-28],[-7,-193]],[[9827,37833],[57,142],[106,35],[10,344],[98,736],[-2,281]],[[58642,23284],[6,647]],[[58648,23931],[-15,-3]],[[57799,23287],[-152,-264],[-14,-251]],[[35769,75670],[-154,-74],[-221,-300],[-58,-301],[-60,-92],[-29,-230],[-118,-454],[-125,-150],[-75,49],[-65,-146]],[[70516,54256],[195,-63]],[[71332,54811],[-130,172],[-82,468],[-4,304]],[[77370,44541],[193,-25],[2,50],[198,-14],[5,140],[199,-23],[15,397]],[[82424,75164],[-82,173],[134,46],[27,-89],[30,262],[-45,391],[-1,266],[40,114]],[[81484,75286],[22,-189],[141,-45],[28,-158],[88,-151]],[[2703,97629],[93,9],[33,99],[-101,71],[-25,-179]],[[2214,97770],[118,120],[86,361],[-87,-256],[-117,-225]],[[1666,96970],[161,-15],[70,-133],[31,91],[-238,180],[-24,-123]],[[183,94948],[150,-16],[-12,216],[-138,-200]],[[3,93989],[97,-21],[195,194],[72,315],[-72,-107],[-48,47],[-122,-62],[-49,-294],[-73,-72]],[[8760,99025],[201,-102],[44,40],[207,-329],[81,99],[18,-87],[-104,-66],[-43,-110],[68,-138],[186,-32],[-15,119],[68,60],[68,-133],[63,124],[-181,237],[211,-121],[-7,104],[-91,97],[-133,39],[-116,210],[-179,-40],[-91,90],[-160,62],[-95,-123]],[[8131,99405],[170,-218],[19,-146],[90,-89],[116,59],[-30,-111],[66,-167],[169,-61],[90,94],[-45,168],[-220,115],[-117,211],[-337,186],[29,-41]],[[8483,94388],[117,58],[-45,83],[-72,-141]],[[7690,99248],[115,-18],[13,144],[-120,-45],[-8,-81]],[[8324,93559],[119,-32],[-70,110],[-49,-78]],[[7260,99402],[111,-86],[-4,130],[-97,42],[-10,-86]],[[6374,99403],[99,-80],[51,59],[-60,96],[-90,-75]],[[5678,99277],[107,94],[93,-16],[110,136],[185,96],[-217,-19],[-244,-168],[-34,-123]],[[5065,99087],[161,47],[356,-23],[-4,-141],[103,-89],[69,166],[-126,114],[38,114],[-177,44],[-154,-54],[-266,-178]],[[4678,98790],[94,108],[-57,122],[-56,-57],[19,-173]],[[4597,99098],[134,-43],[-3,92],[-110,44],[-21,-93]],[[4199,99135],[142,-179],[46,-182],[107,30],[-49,180],[139,41],[-33,164],[-83,-57],[-186,76],[-83,-73]],[[3893,98832],[254,11],[35,-137],[64,76],[-80,190],[-77,21],[-45,-103],[-151,-58]],[[3705,98464],[133,37],[37,197],[-113,200],[-52,-176],[69,19],[-74,-277]],[[17314,91159],[-211,-29],[-106,186],[31,-165],[-51,-198],[-4,275],[-110,-27],[14,416],[-118,-191],[43,157],[-154,355],[-34,20],[-54,-246],[-11,222],[-55,6],[-96,278],[-121,28],[-42,-91],[-70,163],[-63,8],[-94,-123],[32,-226],[144,-94],[201,-416],[-51,12],[-148,203],[-148,-173],[58,-357],[110,-270],[43,-434],[-59,-226],[143,-114],[236,-345],[75,178],[75,43],[82,-148],[285,132]],[[15941,90739],[47,-223],[44,31],[-91,192]],[[16338,89578],[-67,200],[-117,56],[-117,218],[40,161],[-55,1],[-171,314],[31,150],[-189,301],[66,136],[-91,263],[-158,25],[83,47],[-18,182],[-278,203],[13,145],[-154,94],[-17,467],[38,-73],[125,26],[142,115],[57,148]],[[82598,77083],[71,89],[137,852]],[[81552,78604],[-28,-327]],[[94994,30830],[25,-283],[79,270],[-104,13]],[[95040,28843],[45,236],[-66,66],[75,148],[34,232],[-46,423],[-221,142],[-138,179],[-206,192],[-13,-50]],[[38720,44503],[-731,-122]],[[60480,57534],[-10,-1190]],[[60912,57505],[-432,29]],[[41754,49033],[1,-28],[573,69],[15,-335]],[[43030,50162],[-1139,-139]],[[52265,96337],[54,402],[71,847],[-48,-155],[-34,-479],[-82,-616]],[[52013,96331],[137,537],[-63,151],[37,478],[39,70],[144,39],[7,115],[89,-57],[9,404],[-265,7],[-1,64],[-198,101],[1,255],[-147,-41],[-7,-83],[-147,-59],[-48,-182],[-73,-16],[-132,-321],[-222,-47],[-85,-109],[-136,9]],[[60480,57534],[-145,7]],[[50951,61950],[-379,-13],[-4,-673]],[[59195,60434],[1,112],[638,-9]],[[76428,79337],[878,-194],[32,105],[317,-66]],[[77704,79859],[-149,120],[-222,-49],[5,113],[-166,264],[61,172]],[[76829,80369],[-95,-52],[-178,-343],[-10,-206],[-74,-226],[-82,-64],[38,-141]],[[73132,20605],[135,221],[47,210],[316,6],[178,218],[134,-7],[208,187],[159,-54],[205,295],[-42,98],[51,138]],[[73185,22245],[-127,-1620],[74,-20]],[[67535,36646],[380,-71],[11,167]],[[17491,40399],[160,-14]],[[66140,28462],[772,-94],[-10,-173]],[[67297,28320],[67,1333]],[[67364,29653],[-385,52]],[[62829,41374],[-105,7],[-167,125],[-89,266],[76,159],[-12,427],[-68,49]],[[89735,24295],[422,-274],[73,237],[65,73],[18,214],[115,59],[26,-188],[130,-199],[74,-38]],[[90658,24179],[76,353],[21,287],[61,285],[-30,465]],[[90033,25709],[-206,-987]],[[61982,79194],[760,-52]],[[62889,80474],[159,383],[-257,22],[-111,-80],[-130,95],[-78,-42],[-17,150]],[[54569,64709],[383,0],[0,335],[383,-3]],[[54752,66727],[-763,-5]],[[78281,42958],[190,-25]],[[78471,42933],[16,350],[360,-53]],[[78210,44352],[-14,-344],[-66,8],[-14,-344]],[[71899,74269],[-1118,183]],[[81763,40349],[184,-243],[-15,-118],[56,-129],[-78,-114]],[[81910,39745],[222,-71],[193,120],[236,-308],[240,199],[34,107],[83,-10]],[[82256,41232],[-256,75]],[[71360,66524],[76,-71],[-16,-136],[181,-216],[53,10],[146,-361],[-14,-160],[180,-176],[120,-536],[119,-48]],[[65988,81203],[14,170]],[[74992,57909],[224,-281],[173,-102],[168,-280]],[[75720,57751],[18,47]],[[75235,58885],[-63,12]],[[74957,58521],[-55,5],[2,-155],[-70,-105]],[[47738,21068],[963,80]],[[48952,21168],[-29,1326]],[[64088,81045],[-325,31],[-106,-222],[-247,-418]],[[70197,44955],[-127,20],[-25,-504]],[[29517,29008],[-758,-227]],[[63207,16893],[34,-273],[63,-21],[-19,246],[-78,48]],[[63131,17383],[115,-121],[-23,124],[-92,-3]],[[62931,17215],[183,-183],[-24,205],[-134,46],[-25,-68]],[[62774,17559],[121,-235],[6,63],[-127,172]],[[62791,17080],[85,170],[-74,18],[-11,-188]],[[62728,16857],[189,-134],[70,174],[69,-120],[17,143],[-85,38],[-90,170],[-170,-271]],[[62735,17769],[88,-67],[169,-299],[76,96],[-160,124],[32,111],[-90,22],[-107,133],[-8,-120]],[[62551,18548],[256,-257],[22,-178],[303,384]],[[83825,44518],[71,-370],[247,265]],[[84573,46462],[-288,-303],[-31,22],[-601,-498]],[[39752,8382],[1557,270]],[[41309,8652],[-18,333],[28,5],[-55,980],[97,16],[-18,327]],[[54557,81829],[557,-78]],[[55074,83501],[-281,229],[-120,2]],[[72270,20166],[31,77],[266,192],[159,159],[70,-81],[132,-8],[204,100]],[[33089,21626],[-53,625]],[[60254,80927],[-10,-667],[290,-17],[-19,-1072]],[[68053,73313],[-767,98]],[[63681,82093],[-44,-162],[-144,11],[-36,-483],[-169,-35],[-120,-251],[-50,-505],[-122,-201]],[[64891,55539],[-167,-1],[-576,58]],[[85702,25921],[38,-17],[94,-326]],[[86676,27821],[83,550]],[[77712,61954],[-151,-87],[-79,109],[-134,-69],[-90,-254],[-118,15]],[[74602,77650],[29,-268],[76,-171],[47,-232]],[[70995,64821],[3,55]],[[73693,49898],[-98,274]],[[73595,50172],[-394,200],[-168,-165]],[[73033,50207],[-52,-70],[60,-342],[65,-98]],[[14256,6840],[74,-11],[22,234],[108,131]],[[52944,26690],[386,4]],[[53330,26694],[689,9]],[[51145,89595],[18,-25],[-532,-1847],[167,-98]],[[87148,43931],[-21,-145],[64,-150]],[[87191,43636],[105,318],[32,-130],[87,-89],[175,-50],[212,85],[41,220],[120,48]],[[87753,44823],[-27,102],[82,276],[-151,-94],[-118,-178],[-113,-348],[-287,436],[-83,-61],[-85,-361],[31,-287],[146,-377]],[[86348,32580],[987,-159]],[[56935,71222],[-133,-160],[-85,-185],[-200,19],[-153,138]],[[71828,60652],[63,-38],[90,143],[125,-127],[189,-283]],[[72252,61461],[-92,10],[-66,-402],[-137,-199],[-123,-52],[-6,-166]],[[53653,67730],[22,-267],[-87,-173],[77,9],[66,-221],[-69,-194]],[[55021,67944],[-165,-178],[-11,98],[-102,-11],[-42,92],[-149,-29],[-139,128],[11,172],[-94,87],[-105,-87],[-60,228],[-61,90],[-67,-150]],[[54037,68384],[-80,-194],[-143,13],[-48,-187],[-85,6],[-105,-123],[77,-169]],[[76428,79337],[-12,-124],[117,-237]],[[68551,67747],[85,481],[-86,-98],[-135,185],[-129,23]],[[67636,68206],[-12,-281],[-32,11],[-15,-407]],[[56357,43669],[-28,233],[85,88],[40,400],[-7,174]],[[83042,27811],[92,836]],[[82175,30111],[87,-320],[6,-176],[191,-247],[85,-209],[-33,-214],[-162,-397],[-139,-71],[-45,-303]],[[78534,48072],[-9,331],[193,337],[-163,441]],[[40396,15420],[124,21],[-44,773],[195,33],[-13,220],[194,32],[52,229],[648,105]],[[70762,77659],[828,-135]],[[72188,79846],[-444,236],[-213,81],[-54,-22],[-419,231]],[[79679,70053],[15,166],[-69,49],[-8,169],[-68,359],[56,64]],[[59578,32856],[766,-42]],[[14827,14688],[326,153],[154,-965],[63,31],[104,-656]],[[16233,13825],[-37,311],[100,221],[-129,382],[-189,282],[-34,-61],[-87,104],[-33,244],[45,101],[194,106],[165,325],[-34,173],[344,157]],[[16542,16232],[13,55],[-69,385],[47,246],[-45,92],[103,220]],[[52303,34757],[15,-1584]],[[93215,23558],[140,-138],[141,303],[275,-271],[97,347],[186,-142],[231,132]],[[94658,24704],[-38,176],[-963,375]],[[93609,25273],[-67,-273],[-49,18],[-136,-553],[-89,35],[-66,-702]],[[81129,69161],[-60,-109],[109,-916]],[[89887,44355],[26,107],[136,227],[-36,150],[87,184],[-122,111],[-45,187],[71,114]],[[89947,45628],[-86,-70],[-119,59],[-105,254],[-68,-2],[-24,-186],[16,-243],[91,-130],[-123,-18],[62,-254],[-127,17],[-64,133],[-30,-281],[153,-148],[-45,-93]],[[89303,45854],[-29,-300],[100,4],[19,263]],[[89237,45112],[77,250],[-100,-37],[7,-101]],[[90263,43529],[495,-186]],[[90758,43343],[1,502],[-23,60],[-49,870],[-48,291]],[[44444,9103],[1359,161]],[[69269,36776],[165,-110],[295,-300]],[[69729,36366],[106,1817]],[[69835,38183],[-59,77],[-163,-167],[-122,-45],[-136,193]],[[87271,27527],[41,249]],[[21793,25411],[79,-635],[63,24],[84,-656],[-62,-23],[84,-649]],[[65374,39821],[-579,62]],[[48593,15858],[842,57]],[[48709,18510],[-255,-20]],[[48454,18490],[42,-1323],[-60,-5],[36,-1313]],[[79705,52849],[89,-138]],[[79277,65926],[53,-48]],[[75455,47370],[134,365]],[[12196,86075],[110,-33],[3,101],[-113,-68]],[[12195,86496],[133,-262],[81,71],[153,31],[160,-46],[150,-336],[-38,-433],[4,-196],[-83,-234],[-79,-48],[48,-139],[123,64],[80,-131],[14,-141],[-118,-296],[-74,185],[-95,-39],[-176,110],[-138,172],[-105,254],[-4,-237],[-91,-210],[-51,57],[83,169],[-76,-7],[-105,-152],[-275,-47],[-212,91],[-384,-319],[-59,-223],[43,-158],[-74,-195],[-40,-223],[76,60],[118,-183],[-56,-103],[-284,-198],[-165,-283],[9,-145],[199,-113],[259,-225],[359,-268],[208,-116],[259,-84]],[[9073,85044],[82,-289],[23,154],[214,247],[170,-101],[111,166],[-7,167],[156,236],[273,203],[-86,173],[-177,-76],[-129,242],[-40,-211],[-144,-347],[-144,-241],[-78,-48],[-147,95],[-80,-120],[3,-250]],[[45045,72545],[56,-1674]],[[50313,90017],[697,30]],[[70911,40618],[-28,-503],[-254,44],[-9,-165],[-95,15]],[[45975,38392],[924,88]],[[45959,39899],[-28,-170],[44,-1337]],[[65678,50436],[191,-21]],[[65869,50415],[36,1017]],[[65905,51432],[-92,384],[-23,218]],[[67364,29653],[194,-25]],[[87216,42606],[190,220],[-174,459]],[[87232,43285],[-30,-178]],[[88202,47135],[97,-198]],[[88299,46937],[121,57],[123,343],[96,106],[157,-62],[57,102],[199,8],[-78,163]],[[50134,42720],[-22,1343]],[[9547,43332],[-80,-231],[-11,-329],[22,-309],[-108,-269],[27,-114],[-128,-180]],[[9268,41888],[88,-205],[10,-194]],[[87232,43285],[1,25]],[[87233,43310],[-165,5],[20,-184]],[[63100,66680],[51,249]],[[63151,66929],[-79,43],[2,112],[-152,8],[4,746]],[[87130,59322],[177,-100],[44,50],[556,-202]],[[88319,60032],[-216,460],[-69,198]],[[68147,33594],[13,412],[-32,326],[74,350],[78,204]],[[46568,53588],[-10,336]],[[46558,53924],[-729,-64]],[[59848,52144],[-192,4],[-2,392]],[[59654,52540],[-676,-9],[1,-57]],[[86351,50541],[77,114],[135,-51]],[[86706,43211],[62,-81],[51,103],[-113,-22]],[[43713,37979],[-1215,-148]],[[42498,37831],[44,-1005]],[[66493,32471],[382,-52]],[[67068,44181],[-12,204],[-93,10],[18,335]],[[66264,44202],[-17,-400]],[[65646,49680],[146,-235],[130,-49],[102,36],[86,-126],[107,-11],[24,-82],[94,38],[267,-22]],[[66643,50347],[-774,68]],[[96195,14673],[711,-630],[-88,-283],[148,-136],[-303,-991],[-152,135],[-24,-264],[-61,-290],[183,-182],[-436,-2609]],[[64738,29608],[-150,-531],[-165,-292],[-43,-193],[49,-39],[-25,-208],[-73,-105],[-44,-307],[74,-135],[4,-171],[77,48],[31,-112],[-42,-122],[30,-141]],[[69164,80888],[196,-33],[-82,124],[-114,-91]],[[68657,80846],[107,-58],[252,112],[-163,6],[-196,-60]],[[69359,80276],[-202,212],[-65,-75],[-85,58],[-39,-93],[-124,-4],[-157,76],[-134,-91]],[[77501,75115],[653,-127]],[[78421,74941],[41,460],[-50,116],[-35,398]],[[78377,75915],[15,168],[-309,54]],[[81895,39473],[42,76],[-81,113],[54,83]],[[90072,41649],[10,80],[262,366],[108,57],[67,-85],[108,497],[131,779]],[[53875,47871],[190,3],[4,-500]],[[68714,55746],[-663,80]],[[76849,48920],[1,179],[149,194],[299,-56]],[[70151,54270],[-143,-208],[-5,-97]],[[20815,12079],[58,156],[118,-28],[326,62],[61,-102]],[[20871,14407],[-29,-12]],[[68065,74851],[-701,173]],[[67364,75024],[-22,-331],[-56,-1282]],[[73373,43445],[46,723]],[[49754,13960],[1166,63]],[[50943,15008],[-1161,-62]],[[49782,14946],[6,-324],[-48,-3],[14,-659]],[[74951,41294],[18,555]],[[51832,72849],[-124,-4]],[[49263,69505],[988,53]],[[56943,78276],[200,160],[227,62],[111,101]],[[29185,35384],[-85,-114],[-40,-163]],[[18356,10884],[-229,1528],[-84,647]],[[15557,11917],[204,-1266]],[[76474,35258],[-5,-239],[90,37],[-85,202]],[[75952,35474],[172,69],[127,191],[115,67],[117,-160],[25,-159],[94,160],[111,-32],[53,174]],[[76766,35784],[-68,80],[-134,4],[-210,154]],[[64282,47691],[-148,373],[-142,-39],[-75,-169]],[[56630,77211],[259,-393]],[[83639,66114],[89,-53],[93,-162],[4,-565]],[[53337,25696],[-7,998]],[[80521,65882],[-33,-42]],[[56079,22046],[3,664],[14,0],[3,660]],[[78349,42105],[644,-104]],[[78993,42001],[98,-17],[24,336],[97,-19],[22,295]],[[78471,42933],[-18,-674],[-95,13],[-9,-167]],[[14721,13085],[109,-123],[92,-10],[107,102],[337,37]],[[59654,52540],[-2,281],[32,0],[5,1206]],[[58917,54023],[1,-560]],[[43175,70692],[246,24]],[[44137,70784],[-54,1676]],[[38647,47860],[-1102,-178]],[[37545,47682],[135,-415],[-52,-139],[36,-117],[-160,-303],[-143,-16],[15,-181],[-101,-33],[-23,-256]],[[37252,46222],[44,-110],[-65,-79],[70,-116],[25,-664],[82,-103],[17,-152]],[[81988,65028],[244,-277]],[[82232,64751],[223,323],[96,-64],[147,15],[237,256],[82,175],[87,-22],[-34,-102],[108,-289],[85,81],[19,-84]],[[81997,65855],[-158,-118],[-134,0]],[[36926,44974],[48,-65],[77,121],[114,37],[139,-91]],[[37252,46222],[-660,-131]],[[77537,47751],[-171,-57],[-98,44],[-161,-242],[-209,-101]],[[77745,62061],[-43,54],[-114,780]],[[77588,62895],[-144,-8],[-123,261]],[[35457,22833],[32,-215],[145,-409],[113,-165],[-915,-195],[31,-526],[57,-305],[56,-86]],[[63941,77130],[-22,-1010]],[[86531,43601],[23,137],[-121,50],[65,-211]],[[86504,43692],[0,0]],[[75345,58941],[270,821],[34,257],[-91,63],[-66,144]],[[45793,37031],[932,96]],[[45975,38392],[-228,-24]],[[55754,74498],[60,196]],[[54637,75001],[-4,-26]],[[90787,22360],[-55,-195]],[[42477,37994],[21,-163]],[[43670,39660],[-54,-6]],[[43616,39654],[-1216,-153]],[[69566,56044],[539,-97]],[[70526,56602],[-51,48],[-212,386],[-4,125]],[[51223,74629],[446,-447],[29,15]],[[51698,74197],[87,107],[0,101],[100,67],[74,-152]],[[69123,60932],[79,-22],[-55,-102]],[[81548,62860],[-26,170]],[[81522,63030],[-110,106],[-44,198],[105,166],[-150,54]],[[67983,63547],[642,-82]],[[55733,32971],[5,1339]],[[47510,55489],[-961,-68]],[[46549,55421],[42,-1494],[-33,-3]],[[78038,41628],[122,-15],[16,342],[165,-24],[8,174]],[[51702,73755],[-4,442]],[[86715,95839],[127,-684],[-17,414],[-70,295]],[[85340,94487],[-60,-651]],[[85280,93836],[386,-104],[8,82],[770,-217],[-5,-51],[353,-119]],[[86792,93427],[46,502],[-7,675],[-39,-205],[-75,-65],[-84,129],[-36,318],[-41,102],[16,171],[-41,146],[7,255],[48,245],[43,40],[-112,333]],[[86315,96536],[-97,2],[-239,140],[-155,196],[-143,-108],[-90,60]],[[49453,58857],[571,16]],[[48675,60162],[7,-775]],[[52955,67042],[-1,223],[64,2],[-1,225]],[[53017,67492],[-18,20]],[[78701,34762],[61,-180],[225,-398],[62,-21],[370,-465]],[[79419,33698],[47,532]],[[53487,85560],[-35,-62]],[[9827,37833],[-20,-169],[43,-65],[105,55]],[[81388,78815],[178,-45]],[[81705,80376],[-12,5]],[[82582,58795],[-326,763],[-118,168]],[[67444,41784],[20,450]],[[12267,12732],[42,-210],[126,-169],[191,-132],[-233,-405],[19,-108],[186,95],[44,-260]],[[87618,41487],[121,-135]],[[87895,41417],[27,105],[185,116],[19,304],[95,130],[-117,194],[55,239],[-59,10],[-22,192],[61,75],[-86,311],[77,185]],[[87848,43240],[-61,-95],[16,-513],[-82,-274],[-112,-161],[-163,-89],[-19,-117]],[[61037,44158],[-96,3],[-8,-323]],[[60089,45191],[-8,-1302]],[[68328,69179],[675,-97]],[[68987,70471],[-863,128]],[[66064,76965],[-131,-43],[-257,29]],[[51551,55716],[-548,-17]],[[58917,54585],[-751,-2]],[[63890,29699],[846,-91]],[[64716,31285],[-104,80],[-148,-11],[-137,146],[-181,7]],[[58964,55970],[-800,-4]],[[87150,54818],[-583,728]],[[17404,19626],[-376,-163],[45,-308],[-187,-83],[26,-183],[-563,-240],[72,-474]],[[77414,48555],[-86,32],[-73,-114],[-66,79],[-206,-244],[-93,128],[-32,182]],[[78646,56581],[9,280],[98,29],[85,-114]],[[86367,43361],[92,160],[72,-14],[188,227],[157,57],[114,182]],[[86990,43973],[-77,552]],[[90473,38876],[-155,-296],[-150,-70],[-148,-274],[-5,-102],[-117,-145]],[[49761,15935],[21,-989]],[[69268,21380],[125,190],[-41,80],[-84,-270]],[[69599,20783],[-84,36],[-32,176],[-68,24],[6,146],[-62,38],[29,197],[-151,-138],[-20,-130],[74,-82],[37,-313],[74,2],[68,-298],[-27,-138],[-67,-22],[-83,263],[-217,-64],[24,183],[-66,168],[-16,187],[-158,128],[-65,-28],[-28,-397],[-54,-100],[-54,110],[19,396],[-166,206],[-120,446]],[[74473,46807],[-145,-10]],[[96852,18782],[-77,56],[29,165],[-67,161],[-4,172],[-90,-131],[12,155],[-63,141],[-84,-49],[22,217],[-90,-139]],[[75438,49236],[250,663]],[[75652,50269],[-140,-30]],[[75056,50185],[-24,-87],[45,-210],[-26,-126],[64,-84],[-20,-182]],[[82928,57546],[201,-62]],[[83129,57484],[47,99],[101,33],[48,211],[87,94],[-36,206],[-4,260],[112,291],[-29,124]],[[83075,58705],[-131,158],[-200,50],[-72,-52]],[[71828,60652],[-136,-17]],[[71692,60635],[-34,-1],[-87,-251],[-23,-215],[1,-752]],[[84709,48986],[6,-353],[110,7],[114,-319],[9,-119]],[[19345,13781],[-44,63],[-202,96],[-194,-110],[-276,-33]],[[82702,72949],[-108,76],[-10,94],[119,-52],[49,67],[-139,619],[42,271]],[[93139,22239],[88,-365],[87,227],[130,-134]],[[57904,84345],[-433,347],[-192,204],[-70,179],[-93,32],[23,-123],[181,-323],[151,-62],[53,-154],[67,53],[40,-97]],[[56484,86030],[198,-238],[240,-392],[106,-79],[26,-182],[156,79],[-140,204],[-431,510],[-180,271]],[[56645,84378],[72,165],[141,52],[-40,178],[78,63],[-3,479],[-114,71],[-205,336]],[[41358,37844],[32,-657]],[[89327,39227],[55,-243]],[[89493,38515],[91,234],[101,104],[222,8],[278,282]],[[89700,40066],[-124,-178],[-129,-37],[-35,-304],[18,-154],[-86,-78]],[[11204,13738],[109,-346],[107,-483],[32,-281],[69,-268],[14,-228],[42,-61],[126,-540],[33,-467]],[[90658,24179],[-147,-651],[-1,-262],[124,-456],[7,-341],[-33,-108],[34,-141]],[[55747,9743],[246,-4],[-7,-1454],[141,115],[157,-61],[145,165],[44,112],[82,653],[34,78],[106,812],[-26,198],[18,202],[76,138],[154,141],[161,3]],[[9466,34780],[246,120],[-130,729]],[[78744,65534],[-85,-164],[61,-279],[146,-392],[113,-145]],[[60005,47649],[41,-122],[-63,-41],[156,-469]],[[88982,36129],[-177,876]],[[72826,56375],[4,-341]],[[75556,46669],[80,27],[39,118],[108,87],[30,140],[120,45]],[[69896,36148],[165,-256],[144,-313],[170,-897],[169,-512]],[[70392,36067],[-496,81]],[[84485,47114],[-52,90],[-25,332],[-57,40],[-86,257],[-111,-107],[-153,151]],[[63697,66479],[-135,193],[27,211],[100,228],[-143,13],[-56,-67],[-205,84],[51,-172],[-127,79],[-58,-119]],[[90812,53263],[126,18],[105,211],[24,151],[-98,5],[-5,-151],[-152,-234]],[[91116,56056],[351,-419],[-18,-831],[-39,-437],[-172,-615],[61,90],[147,522],[34,449],[23,962],[-146,80],[-226,251]],[[90590,52179],[152,408],[149,313],[332,797],[-58,-26],[-222,-529],[-74,-129],[-83,-5],[-133,-540],[-98,-260]],[[90435,54456],[1,-392],[-45,-493],[69,-195],[-43,-45],[161,-140],[137,109],[157,433],[-3,160],[82,274],[-39,100],[43,167],[-58,205],[-168,49]],[[79102,81202],[-258,-158],[-111,-213],[-8,-103],[-121,-259],[-104,-122],[-212,-159],[-291,-175],[-128,-145]],[[74186,61655],[513,-111]],[[65492,66147],[373,-57]],[[49754,13960],[-778,-51]],[[81522,63030],[83,103],[-14,98],[81,150],[187,-21],[151,218],[95,59],[94,246],[28,195]],[[82227,64078],[-44,48],[6,481],[70,-152],[170,49],[-197,247]],[[87600,39494],[550,-197]],[[88507,39872],[-48,202],[117,149],[-63,70],[-165,387],[-57,-84],[22,-191],[-56,-74],[-19,330],[62,91],[-24,163],[-98,-318],[-72,24]],[[88106,40621],[-80,-247],[-104,-130],[-178,-102],[-88,-246],[-56,-402]],[[70652,33470],[25,-241],[15,-927],[-14,-184]],[[54735,57987],[335,0]],[[55070,57987],[-3,1006],[96,-1]],[[50583,84746],[24,-137],[-185,-184],[-33,-123],[-119,-24],[-23,-129]],[[92829,19131],[-215,136],[-71,99],[-26,207],[49,107],[-1,193],[57,101]],[[86497,38507],[223,144],[122,267],[-10,168],[64,122],[-61,142],[48,401]],[[86520,39875],[-405,138]],[[86115,40013],[-117,-840]],[[15582,3303],[-84,-43],[-60,131],[17,234],[77,311],[-114,-327],[-62,-44],[-6,-200],[50,-236],[109,-28],[73,108]],[[15041,3040],[217,-393],[42,-164],[85,2],[0,229],[80,259],[-85,20],[-50,-89],[-212,227],[124,29],[36,161],[3,263],[-31,54],[-3,338],[115,-252],[57,222],[73,77],[-12,314],[-73,159],[-67,-75],[-15,-298],[-121,24],[24,-103],[-73,-172],[62,-284],[2,-190],[-92,-29],[-86,-329]],[[50976,33004],[253,177]],[[15594,37324],[46,5],[177,-195],[-131,755],[-45,-20],[-72,488],[146,351],[14,125],[132,286],[101,501],[64,28],[-20,140]],[[74397,51017],[74,-210],[-53,-192]],[[73210,48224],[-213,-82]],[[86750,92110],[17,894],[25,423]],[[85280,93836],[-112,-1044]],[[46549,55421],[-551,-40]],[[50004,61576],[-18,1414]],[[73661,71406],[165,-35],[-23,-332],[159,-32],[28,-60]],[[87233,43310],[27,254],[-69,72]],[[87148,43931],[-114,109],[-44,-67]],[[65553,20859],[73,1641]],[[19526,17807],[44,-316],[-44,-19],[62,-431],[-167,-69],[32,-226],[-62,-26],[45,-327],[134,18],[282,116],[38,-275],[351,151],[23,-160],[124,49],[111,-811],[77,32],[44,-316],[55,-149],[109,45],[22,-163]],[[28612,38286],[79,-104]],[[70569,21819],[78,44],[14,191],[-92,-235]],[[70356,23024],[27,-79],[111,61],[18,289],[-57,6],[-84,-143],[-15,-134]],[[70427,24405],[-19,-488],[136,-26],[61,-252],[104,95],[96,-59],[71,-403],[92,-177],[75,-376],[117,-112],[22,123],[-118,213],[93,246],[-110,348],[66,-78],[20,244],[-61,215],[38,374]],[[70242,23544],[52,-156],[65,57],[-78,144],[-39,-45]],[[87532,45204],[71,60],[18,161],[234,118],[132,-59],[79,87],[27,-81],[152,-25],[40,137],[113,90],[60,145]],[[87726,45928],[-130,-78],[-38,81],[-83,-249]],[[78578,76048],[-150,-52],[-51,-81]],[[66141,15469],[127,-342],[344,-378],[303,-126],[270,-16],[136,107],[15,126],[-155,105],[-215,22],[37,166],[-169,193],[-150,334],[-95,75]],[[64918,13379],[106,-237],[496,-525],[39,0],[216,-347],[159,-157],[35,32],[148,-118],[-35,110],[-179,324],[2,98],[-128,196],[-335,265],[-149,189],[141,48],[-310,277],[-100,1],[-106,-156]],[[79732,70875],[7,-55],[433,-271]],[[43616,39654],[-36,973]],[[78969,41667],[24,334]],[[83114,71024],[83,17],[-17,218],[-81,122],[-74,-32],[-23,167],[66,8],[-91,225],[-142,-37],[-3,188],[70,4],[-34,221],[-101,206],[-46,-1]],[[75479,74831],[-51,-389],[-146,-260],[-16,-259]],[[82371,88200],[-175,-1978],[-97,24]],[[54024,69647],[13,-1263]],[[75131,70682],[322,-63],[6,92],[397,-82]],[[64256,36819],[87,-87],[42,-489]],[[84561,83205],[379,691],[142,446],[-104,217],[-4,385],[84,492],[75,297],[158,439],[160,378]],[[71303,61093],[148,17],[79,-177],[165,-151],[-3,-147]],[[79742,42388],[-31,-387],[-65,16],[-47,-620],[129,-28]],[[63821,27730],[57,1623]],[[74466,49873],[30,-444]],[[73250,51175],[78,-118],[-12,-102],[81,-53],[6,-147],[159,-89],[-4,-201],[82,-14]],[[73640,50451],[214,-18]],[[73854,50433],[61,131],[3,682]],[[87943,53749],[274,248],[15,181],[182,-22],[78,-95],[63,180],[-18,133],[69,-19],[87,-186],[96,95],[11,169],[57,6],[52,-165],[-16,-112],[138,24]],[[88944,54787],[-217,316],[-350,-197],[-15,32]],[[72494,77393],[-24,-19],[-42,-731]],[[13284,60870],[104,59],[154,243],[128,138],[67,310],[-46,127],[-78,-116],[-161,-89],[-26,-132],[34,-236],[-119,-103],[-57,-201]],[[13043,62541],[57,11],[104,480],[186,479],[-142,26],[-102,-244],[-103,-752]],[[14300,60238],[-107,-123],[-25,148],[-145,18],[-254,-256],[-14,-135],[77,-86],[23,-135],[-38,-409],[-92,-383],[-81,-90],[-319,-95],[-124,71],[-71,-161],[-155,-109]],[[84146,94816],[-342,-270],[-118,201],[-157,-372],[-146,-452],[-87,-546],[-81,-338]],[[55114,55765],[-314,1]],[[55075,57315],[-5,672]],[[34777,7315],[727,180],[1116,254]],[[88962,47054],[-22,105],[91,46],[-108,140],[-215,-142],[-54,112],[-185,-433],[-110,-54]],[[87814,46206],[14,99],[203,228],[168,327],[100,77]],[[30811,6254],[1351,393]],[[93831,15002],[-4,-354],[-56,-114],[90,-153],[88,109],[121,-29],[-57,-208],[-129,-118],[-23,-98],[62,-393],[103,-289]],[[73185,32980],[-574,116]],[[96258,28794],[51,-253],[-90,-352],[8,-150]],[[96340,27617],[135,134],[167,12],[137,-47],[63,51],[89,-194],[240,-257],[21,-94],[-116,-427],[-58,136],[-51,-309],[-57,-162],[-102,-68],[-59,119],[-96,-52],[78,-111],[233,56],[170,282],[165,481],[84,430],[-3,287],[-32,216],[-17,-326],[-73,-38],[-266,234],[-77,104],[-152,41],[-140,190],[-58,240],[-216,156],[-43,120]],[[41309,8652],[1492,228]],[[86889,37756],[193,127],[83,195]],[[87600,39494],[-363,130]],[[77705,62948],[-117,-53]],[[57433,21952],[-581,21]],[[71035,76605],[-117,19],[-127,145],[-111,-49]],[[88106,40621],[83,265],[-75,181],[77,46],[-137,293],[-104,-18],[-63,-104]],[[74298,59795],[67,104],[61,-44],[98,87]],[[86099,40019],[16,-6]],[[37545,47682],[72,66],[6,195],[58,119],[-75,361],[-51,-1],[-139,196]],[[67557,44660],[39,787]],[[85473,38093],[-113,418],[-68,436]],[[88930,52729],[-29,132],[17,252],[87,287],[110,256],[0,186]],[[53653,67730],[-160,-57],[-29,228],[-131,97],[-59,-173],[-104,82],[-60,-81],[-29,-253],[-64,-81]],[[74418,50434],[-92,74],[-46,-224],[-79,-18],[38,-216]],[[74239,50050],[-113,-280],[29,-145],[-74,-114]],[[47624,57076],[39,-1575]],[[51621,23983],[19,-1331]],[[49291,83737],[56,-110]],[[83068,50765],[-32,-319]],[[22907,10289],[-1164,-461]],[[76579,54878],[360,-67]],[[67543,80496],[32,265],[-164,206],[-45,270],[-146,35]],[[67220,81272],[-88,12],[-98,-170],[-59,-224],[18,-200],[-113,-243],[-20,-202]],[[79419,33698],[161,-98],[582,-585]],[[55932,57645],[-2,-337],[-183,3]],[[52711,53906],[1102,14]],[[47561,18416],[893,74]],[[64191,56036],[62,-4],[15,507],[65,-6],[9,335],[33,-1],[9,360]],[[9578,45787],[-39,-343],[-88,-228],[-87,54],[-226,-115],[-135,-298],[-90,-418]],[[7879,32279],[-72,-152],[-1,-299],[-107,-164],[-198,-630],[61,-185],[10,-310],[-28,-197],[97,-276],[150,-313],[330,-589],[183,-390],[107,-357],[-50,-128],[51,-334],[140,-276],[150,-507],[70,-325]],[[50498,21266],[-24,1327]],[[22500,13384],[-255,-90],[-11,-155]],[[21157,2810],[923,381]],[[76665,35383],[90,-78],[-29,133],[-61,-55]],[[76766,35784],[149,219],[238,125],[205,-233]],[[73854,50433],[71,-69],[73,-198],[98,31],[143,-147]],[[58648,23931],[143,124],[179,251],[55,152],[-4,260],[89,-5]],[[69729,36366],[167,-218]],[[57153,51730],[5,1405]],[[89542,49802],[168,26],[131,-134],[48,61],[143,538],[163,455],[80,287]],[[67425,25278],[-1,263],[-62,172],[64,97],[122,-6],[31,-179],[140,-232],[72,-42]],[[67205,75063],[159,-39]],[[90254,52207],[33,215],[105,95],[-206,-12],[-249,-309],[-96,14]],[[52988,69563],[203,45]],[[22294,89903],[76,-132],[221,220],[48,281]],[[95301,28498],[6,151],[-60,167],[-48,-240],[-144,-148]],[[58381,71042],[425,-17]],[[73033,50207],[-72,112],[-53,321],[-164,303],[-99,31]],[[73640,50451],[-45,-279]],[[82989,64402],[-265,-47],[-128,19],[-105,-117],[-68,26],[-196,-205]],[[82544,81685],[8,-185],[-140,39],[-21,-222],[-63,19],[-22,-219],[-128,36],[-12,-130],[-304,152],[-89,141]],[[65905,51432],[728,-68]],[[89688,55171],[-20,76],[-206,72],[-48,128],[81,166],[72,265],[-248,-70],[-84,62],[-139,-65],[-208,-29],[-165,-106],[7,94],[130,163],[134,-31],[443,191],[105,-3]],[[85017,29166],[-41,-344],[45,-382],[545,-199]],[[46417,89262],[-153,-346],[14,-123],[-111,-336],[27,-151],[-56,-136],[61,-89],[-98,-61],[-40,-141],[29,-123],[-94,-101],[4,-125],[-103,-84],[-6,-301],[-47,-91],[-21,-240],[-46,-6],[-53,-293],[-58,-9],[-52,-696]],[[67119,83759],[120,-47],[-63,146],[-57,-99]],[[67279,83223],[1,83],[-252,50],[128,111],[3,107],[-165,-144],[90,178],[-81,56],[95,218],[139,21],[85,141],[50,256],[248,-51],[122,97],[11,-98],[151,280],[72,-153],[182,341],[56,230],[123,-108],[49,129],[-164,72],[-11,107],[113,-1],[-46,177],[-80,-69],[-70,237],[18,228],[-153,-99],[-3,-127],[-71,-97],[-202,478],[-103,146],[130,-487],[63,-76],[-12,-177],[63,-85],[-14,-166],[-74,-68],[-51,282],[-115,20],[-156,-315],[-247,-113],[-70,-139],[-399,-64],[-117,105]],[[67986,28218],[24,311],[50,158],[8,338],[-101,404],[-14,139]],[[67220,81272],[-116,129],[-70,1]],[[79228,46134],[-81,-111],[32,-80],[-249,-504]],[[14245,5438],[113,-202],[201,-153],[162,-6],[61,-226],[119,-187],[146,-158],[51,22],[7,-324],[89,181],[-42,619],[-94,-54],[40,165],[-46,205],[-2,245],[-92,84],[-25,117],[67,85],[-77,125],[-63,229]],[[81387,88448],[118,-417],[80,-89],[58,-296],[-60,-231],[-155,-32],[65,358],[-169,-59],[39,-121],[-76,-326],[-202,-156]]]};

  /* global window */

  function renderChart({
    data,
    dimensions: { valueField, fipsField, countyNameField, stateField },
    options: {
      interpolateScheme = d3__namespace.interpolateBlues,
      colorLegendTitle = valueField,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      searchButtonClassNames,
    },
    chartContainerSelector,
  }) {
    d3__namespace.select('body').append('style').html(`
  .group-counties.searching > .iv-county.s-match {
    stroke: #333;
  }`);

    const coreChartHeight = 610;
    const coreChartWidth = 975;

    const { chartCore, widgetsLeft, widgetsRight } = setupChartArea({
      chartContainerSelector,
      coreChartWidth,
      coreChartHeight,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      bgColor,
    });

    const tooltipDiv = initializeTooltip$1();

    const dataParsed = data.map(d => ({
      ...d,
      [valueField]: Number.parseFloat(d[valueField]),
      [fipsField]: Number.parseInt(d[fipsField], 10),
    }));
    const values = dataParsed.map(el => el[valueField]);
    const valueDomain = d3__namespace.extent(values);

    const dataObj = {};
    dataParsed.forEach(c => {
      dataObj[c[fipsField]] = c;
    });

    const colorScale = d3__namespace.scaleSequential(interpolateScheme).domain(valueDomain);

    const path = d3__namespace.geoPath();

    const allCounties = chartCore
      .append('g')
      .attr('class', 'group-counties')
      .selectAll('path')
      .data(topojson__namespace.feature(usStatesAndCountiesTopo, usStatesAndCountiesTopo.objects.counties).features)
      .join('path')
      .attr('d', path)
      .attr('id', d => `iv-county-${d.id}`)
      .attr('class', 'iv-county')
      .attr('fill', d => {
        const found = dataParsed.find(
          el => Number.parseInt(el[fipsField], 10) === Number.parseInt(d.id, 10),
        );
        if (found) {
          return colorScale(found[valueField])
        }
        return 'gray'
      })
      .on('mouseover', (e, d) => {
        tooltipDiv.transition().duration(200).style('opacity', 1);
        const found = dataParsed.find(
          el => Number.parseInt(el[fipsField], 10) === Number.parseInt(d.id, 10),
        );
        if (found) {
          tooltipDiv.html(
            `${found[countyNameField]}${
            stateField && found[stateField] ? `, ${found[stateField]}` : ''
          }
            <br/>
            ${valueField}: ${found[valueField]}`,
          );
        }

        d3__namespace.select(e.target).attr('stroke', '#333').attr('stroke-width', 1).raise();
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', e => {
        d3__namespace.select(e.target).attr('stroke', 'transparent');
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });

    chartCore
      .append('path')
      .datum(topojson__namespace.mesh(usStatesAndCountiesTopo, usStatesAndCountiesTopo.objects.states, (a, b) => a !== b))
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-linejoin', 'round')
      .attr('d', path)
      .attr('opacity', 0.5);

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('placeholder', 'Find by county')
      .attr('class', searchButtonClassNames);

    function searchBy(term) {
      if (term) {
        d3__namespace.select('.group-counties').classed('searching', true);
        allCounties.classed(
          's-match',
          // should be boolean
          d => {
            return dataObj[Number.parseInt(d.id, 10)][countyNameField]
              .toLowerCase()
              .includes(term.toLowerCase())
          },
        );
      } else {
        d3__namespace.select('.group-counties').classed('searching', false);
      }
    }

    search.on('keyup', e => {
      searchBy(e.target.value.trim());
    });

    widgetsRight.append(() =>
      legend({
        color: colorScale,
        title: colorLegendTitle,
        width: 260,
      }),
    );
  }

  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //
  //

  function setupChartArea({
    chartContainerSelector,
    coreChartWidth,
    coreChartHeight,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    bgColor,
  }) {
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

  const validateAndRender = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    d3__namespace.csv(dataPath).then(data => {
      renderChart({ data, dimensions, options, chartContainerSelector });
    });
  };

  exports.renderBubbleHorizontal = renderChart$6;
  exports.renderCalendar = renderChart$3;
  exports.renderChoroplethCounties = renderChart;
  exports.renderDominoBase = renderChart$5;
  exports.renderDominoRibbon = renderChart$1;
  exports.renderMace = renderChart$8;
  exports.renderMotionBubble = renderChart$2;
  exports.renderRidgeline = renderChart$4;
  exports.renderSankey = renderChart$7;
  exports.validateAndRenderBubbleHorizontal = validateAndRender$6;
  exports.validateAndRenderCalendar = validateAndRender$3;
  exports.validateAndRenderChoroplethCounties = validateAndRender;
  exports.validateAndRenderDominoBase = validateAndRender$5;
  exports.validateAndRenderDominoRibbon = validateAndRender$1;
  exports.validateAndRenderMace = validateAndRender$8;
  exports.validateAndRenderMotionBubble = validateAndRender$2;
  exports.validateAndRenderRidgeline = validateAndRender$4;
  exports.validateAndRenderSankey = validateAndRender$7;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
