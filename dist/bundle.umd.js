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

  function applyInteractionStyles$6({ activeOpacity, inactiveOpacity }) {
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

  function parseData$7({
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

  function setupScales$7({
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
  function renderXAxis$5({
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

  function renderYAxis$4({ chartCore, coreChartWidth, yScale, yAxisTitle }) {
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
  const searchEventHandler$5 = referenceList => qstr => {
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

  function setupSearch$6({
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

  function setupClearAllButton$3({
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

  function renderChart$9({
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
    applyInteractionStyles$6({ activeOpacity, inactiveOpacity });

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

    const tooltipDiv = initializeTooltip$5();

    const dataParsed = parseData$7({
      data,
      xFieldStart,
      xFieldEnd,
      yFieldStart,
      yFieldEnd,
      sizeField,
    });

    const { yScale, xScale, circleSizeScale, lineWidthScale, colorScale } =
      setupScales$7({
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

    renderXAxis$5({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      xScale,
      xAxisTickValues,
      xAxisTitle,
    });

    // y-axis
    renderYAxis$4({ chartCore, coreChartWidth, yScale, yAxisTitle });

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
    const handleSearch = searchEventHandler$5(nameValues);
    const search = setupSearch$6({
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
    setupClearAllButton$3({
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

  const shouldBeZeroOrPositiveNumber = ({ data, dimensions, dim }) => {
    const invalidRows = ___default["default"].filter(data, (row, i) => {
      // eslint-disable-next-line no-param-reassign
      row.rowNumber = i + 1;
      const value = Number(row[dimensions[dim]]);
      return Number.isNaN(value) || value < 0
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

  const checkFontSizeString = val => {
    const valid = val.match(/^[0-9]*?px$/);
    if (valid) {
      return { valid: true }
    }
    return { valid: false, message: 'Should be a valid string like "14px"' }
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

  const dimensionTypes$9 = {
    xFieldStart: [shouldBeNumber],
    xFieldEnd: [shouldBeNumber],
    yFieldStart: [shouldBeNumber],
    yFieldEnd: [shouldBeNumber],
    sizeField: [shouldBeNumber],
    nameField: [shouldNotBeBlank, shouldBeUnique],
  };

  const optionTypes$9 = {
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

  const validateAndRender$9 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$9, options });

    d3__namespace.csv(dataPath).then(data => {
      // Run validations
      const { columns } = data;
      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$9, dimensions });

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
        ? renderChart$9({ data, dimensions, options, chartContainerSelector })
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

  function renderChart$8({
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

  const dimensionTypes$8 = {
    sourceField: [shouldNotBeBlank],
    targetField: [shouldNotBeBlank],
    valueField: [shouldBeNumber],
  };

  const optionTypes$8 = {
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

  const validateAndRender$8 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$8, options });

    d3__namespace.csv(dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$8, dimensions });

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

  function renderChart$7({
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

  const dimensionTypes$7 = {
    sizeField: [shouldBeNumber],
    xField: [shouldBeNumber],
    nameField: [shouldNotBeBlank], // also search field
    segmentField: [shouldNotBeBlank],
  };

  const optionTypes$7 = {
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

  const validateAndRender$7 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$7, options });

    d3__namespace.csv(dataPath).then(data => {
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
        ? renderChart$7({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* eslint-disable no-import-assign */

  function applyInteractionStyles$5() {
    d3__namespace.select('body').append('style').html(`
  rect.domino.domino-hovered {
    stroke: #333;
  }
  g.dominos.searching g rect.domino-matched {
    stroke: #333;
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

  function parseData$6({ data, colorField, yField }) {
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

  function setupScales$6({
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

  function renderYAxis$3({ chartCore, yScale }) {
    chartCore
      .append('g')
      .attr('class', 'y-axis-left')
      .call(d3__namespace.axisLeft(yScale).tickSize(0))
      .call(g => g.select('.domain').remove());
  }

  function renderXAxis$4({ chartCore, xAxisLabel, coreChartWidth }) {
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

  const searchEventHandler$4 = referenceList => qstr => {
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

  function setupSearch$5({
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

  function renderChart$6({
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
    applyInteractionStyles$5();

    const coreChartWidth = 1000;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      widgetsRight,
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

    const tooltipDiv = initializeTooltip$4();

    const dataParsed = parseData$6({
      data,
      colorField,
      yField,
    });

    const { xScale, yScale, colorScale } = setupScales$6({
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

    renderYAxis$3({ chartCore, yScale });

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

    renderXAxis$4({ chartCore, xAxisLabel, coreChartWidth });

    const dominoValues = ___default["default"](dataParsed).map(dominoField).uniq().value();
    const handleSearch = searchEventHandler$4(dominoValues);
    setupSearch$5({
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

  const dimensionTypes$6 = {
    xField: [shouldNotBeBlank],
    yField: [shouldNotBeBlank],
    colorField: [shouldBeNumber],
    dominoField: [shouldNotBeBlank],
  };

  const optionTypes$6 = {
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

  const validateAndRender$6 = ({
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
        ? renderChart$6({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* eslint-disable no-import-assign */

  function applyInteractionStyles$4({ activeOpacity, inactiveOpacity }) {
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

  function parseData$5({ data, yField, xField, seriesField, colorField }) {
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

  function setupScales$5({
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

  function renderXAxis$3({
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

  const searchEventHandler$3 = referenceList => qstr => {
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

  function setupSearch$4({
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
      d3__namespace.selectAll('.series').classed('series-active', false);
      search.node().value = '';
      handleSearch('');
    });
  }

  function setupShowAllButton$1({
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

  function renderChart$5({
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
    applyInteractionStyles$4({ activeOpacity, inactiveOpacity });

    const coreChartWidth = 1000;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      viewBoxWidth,
    } = setupChartArea$3({
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

    const { parsedData, nestedData } = parseData$5({
      data,
      yField,
      xField,
      seriesField,
      colorField,
    });

    const { yScale, xScale, categoryScale, categoryDomain, fillColorScale } =
      setupScales$5({
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

    renderXAxis$3({
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

    const handleSearch = searchEventHandler$3(categoryDomain);
    const search = setupSearch$4({
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

    setupClearAllButton$2({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
    });

    setupShowAllButton$1({
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

  const dimensionTypes$5 = {
    xField: [shouldNotBeBlank],
    yField: [shouldBeNumber],
    seriesField: [shouldNotBeBlank],
    colorField: [shouldNotBeBlank],
  };

  const optionTypes$5 = {
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

  const validateAndRender$5 = ({
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
        ? renderChart$5({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* global window */

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

  function parseData$4({ data, yFields, nameField, xGridField, yGridField }) {
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

  function setupScales$4({
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

  function renderLegends$1({ widgetsRight, colorScaleForLegend }) {
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

  function renderChart$4({
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

    const tooltipDiv = initializeTooltip$2();

    const { maxY, stackedDataByYear, names } = parseData$4({
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
    } = setupScales$4({
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

    renderLegends$1({ widgetsRight, colorScaleForLegend });

    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  const dimensionTypes$4 = {
    xGridField: [shouldNotBeBlank],
    yGridField: [shouldNotBeBlank],
    xField: [shouldNotBeBlank],
    nameField: [shouldNotBeBlank],
    uniqueColumnField: [shouldBeUnique], // identifies each column uniquely
    // yFieldsDimensionTypes will be added dynamically
  };

  const optionTypes$4 = {
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

  const validateAndRender$4 = ({
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
          dimensionTypes: dimensionTypes$4,
          optionTypes: optionTypes$4,
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
        ? renderChart$4({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

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

  function renderChart$3({
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

    applyInteractionStyles$3({ inactiveOpacity });

    const xValueFormatter = val => formatNumber(val, xValueFormat);
    const yValueFormatter = val => formatNumber(val, yValueFormat);
    const sizeValueFormatter = val => formatNumber(val, sizeValueFormat);

    const coreChartWidth = 1000;
    const { svg, coreChartHeight, allComponents, chartCore, widgetsLeft } =
      setupChartArea$1({
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

    const { dataParsed, dataAt, timeDomain, timeDomainLength } = parseData$3({
      data,
      xField,
      yField,
      sizeField,
      timeField,
    });

    const { sizeScale, xScale, yScale, colorScale } = setupScales$3({
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

    setupSearch$3({
      widgetsLeft,
      nameField,
      searchButtonClassNames,
      circles,
      sizeField,
    });

    renderXAxis$2({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      xScale,
      xAxisLabel,
    });

    renderYAxis$2({
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

  function setupSearch$3({
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

  function applyInteractionStyles$3({ inactiveOpacity }) {
    d3__namespace.select('body').append('style').html(`
  .group-circles.searching > .iv-circle:not(.s-match) {
    opacity: ${inactiveOpacity};
  }
  .group-circles.searching > .iv-circle.s-match {
    stroke: #333;
  }
  `);
  }

  function parseData$3({ data, xField, yField, sizeField, timeField }) {
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

  function setupScales$3({
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

  function renderXAxis$2({
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

  function renderYAxis$2({
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

  const dimensionTypes$3 = {
    sizeField: [], // can be empty (if not provided first value in sizeRange will be picked)
    xField: [shouldNotBeBlank, shouldBeNumber],
    yField: [shouldNotBeBlank, shouldBeNumber],
    timeField: [shouldNotBeBlank],
    nameField: [shouldNotBeBlank],
    colorField: [], // can be empty (if not provided, first color from scheme will be picked)
  };

  const optionTypes$3 = {
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

  const validateAndRender$3 = ({
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

  /* eslint-disable no-import-assign */

  function applyInteractionStyles$2({ inactiveOpacity, activeOpacity }) {
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

  function parseData$2({ data, dominoField, initialState }) {
    const allDominoFieldValues = ___default["default"].chain(data).map(dominoField).uniq().value();
    const dominoValues = ___default["default"](data).map(dominoField).uniq().value();
    const defaultStateAll = initialState === 'All' ? dominoValues : initialState;
    return { allDominoFieldValues, defaultStateAll }
  }

  function setupScales$2({
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

  function renderYAxis$1({
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

  function renderXAxis$1({
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

  const searchEventHandler$2 = referenceList => qstr => {
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

  function setupSearch$2({
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
    clearAll.on('click', () => {
      d3__namespace.selectAll('.ribbon').classed('ribbon-active', false);
      search.node().value = '';
      handleSearch('');
    });
  }

  function renderChart$2({
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
    applyInteractionStyles$2({ inactiveOpacity, activeOpacity });

    const coreChartWidth = 1000;
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
    });

    const tooltipDiv = initializeTooltip();

    const { allDominoFieldValues, defaultStateAll } = parseData$2({
      data,
      dominoField,
      initialState,
    });

    const { xScale, yScale, colorScale, sizeScale, yDomain } = setupScales$2({
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

    renderXAxis$1({
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

    renderYAxis$1({
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

    const handleSearch = searchEventHandler$2(allDominoFieldValues);
    const search = setupSearch$2({
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
    setupClearAllButton$1({
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

  const dimensionTypes$2 = {
    xField: [shouldBeNumber],
    yField: [shouldNotBeBlank],
    dominoField: [shouldNotBeBlank],
    sizeField: [shouldBeNumber],
    colorField: [shouldBeNumber],
  };

  const optionTypes$2 = {
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

  const validateAndRender$2 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$2, options });

    d3__namespace.csv(dataPath).then(data => {
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
    });
  };

  /* global window */

  let currentState = 'global';
  function renderChart$1({
    data,
    options: {
      aspectRatio = 1,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      valuePrefix = '',
      valuePostfix = '',
      valueFormatter = '',

      chordType = 'undirected',

      colorScheme = d3__namespace.schemeCategory10,
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
    applyInteractionStyles$1({ activeOpacity, inactiveOpacity });

    const coreChartWidth = 1000;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      // widgetsRight,
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

    const { dataParsed, names, matrix, index, reverseIndex } = parseData$1({
      data,
      valueField,
      sourceField,
      targetField,
    });

    const innerRadius = Math.min(coreChartWidth, coreChartHeight) * 0.5 - 20;
    const outerRadius = innerRadius + 20;

    const { chord, arc, ribbon } = getShapes({
      innerRadius,
      outerRadius,
      chordType,
    });

    const { colorScale } = setupScales$1({ names, colorScheme });

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
    });

    const handleSearch = searchEventHandler$1(names, index);
    const search = setupSearch$1({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      sourceField,
    });

    setupClearAllButton({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
      index,
    });

    setupShowAllButton({
      widgetsLeft,
      showAllButtonClassNames,
      search,
      handleSearch,
    });

    currentState = startingState;
    if (currentState === 'showAll') {
      setShowAllState();
    } else if (currentState === 'clearAll') {
      setClearAllState();
    }

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function applyInteractionStyles$1({ activeOpacity, inactiveOpacity }) {
    d3__namespace.select('body').append('style').html(`
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
  `);
  }

  function parseData$1({ data, valueField, sourceField, targetField }) {
    const dataParsed = data.map(el => {
      const elParsed = { ...el };
      elParsed[valueField] = Number.parseFloat(el[valueField]);
      return elParsed
    });

    const names = ___default["default"](dataParsed)
      .flatMap(d => [d[sourceField], d[targetField]])
      .uniq()
      .value();

    const matrix = ___default["default"].chunk(
      ___default["default"].times(___default["default"].multiply(names.length, names.length), ___default["default"].constant(0)),
      names.length,
    );

    const index = new Map(names.map((name, i) => [toClassText(name), i]));
    const reverseIndex = new Map(names.map((name, i) => [i, toClassText(name)]));
    ___default["default"].forEach(dataParsed, row => {
      matrix[index.get(toClassText(row[sourceField]))][
        index.get(toClassText(row[targetField]))
      ] = Number(row[valueField]);
    });

    return {
      dataParsed,
      names,
      matrix,
      index,
      reverseIndex,
    }
  }

  function getShapes({ innerRadius, outerRadius, chordType }) {
    const chord = d3__namespace
      .chordDirected()
      .padAngle(12 / innerRadius)
      .sortSubgroups(d3__namespace.descending)
      .sortChords(d3__namespace.descending);

    const arc = d3__namespace.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    let ribbon = chordType === 'directed' ? d3__namespace.ribbonArrow() : d3__namespace.ribbon();
    ribbon = ribbon.radius(innerRadius - 0.5).padAngle(1 / innerRadius);
    return { chord, arc, ribbon }
  }

  function setupScales$1({ names, colorScheme }) {
    const colorScale = d3__namespace.scaleOrdinal(names, colorScheme);

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
    // reverseIndex,
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
    const chords = chord(matrix);
    const textId = 'arcId';

    chartCore
      .append('path')
      .attr('id', textId)
      .attr('fill', 'none')
      .attr('d', d3__namespace.arc()({ outerRadius, startAngle: 0, endAngle: 2 * Math.PI }));

    const arcs = chartCore.append('g').attr('class', 'arcs');

    arcs
      .selectAll('g')
      .data(chords.groups)
      .join('g')
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
          setClearAllState();
        }
        d3__namespace.select(`.arc-${d.index}`).classed('arc-hovered', true);
        d3__namespace.selectAll(`.ribbon-source-${d.index}`).classed('ribbon-hovered', true);
        d3__namespace.selectAll(`.ribbon-target-${d.index}`).classed('ribbon-hovered', true);
        tooltipDiv.transition().duration(200).style('opacity', 1);
        const arcName = names[d.index];
        const arcData = ___default["default"].filter(dataParsed, row => {
          return row[sourceField] === arcName || row[targetField] === arcName
        });

        const ribbonData = ___default["default"].map(names, _name_ => {
          // Same as arc
          if (arcName === _name_) {
            const value = ___default["default"](arcData)
              .filter(row => {
                return row[sourceField] === _name_ && row[targetField] === _name_
              })
              .sumBy(valueField);
            const arrowSymbol =
              chordType === 'undirected' ? '' : value >= 0 ? '→' : '←';
            return {
              _name_: _name_,
              _value_: Math.abs(value),
              arrowSymbol: arrowSymbol,
            }
          }
          // Get sources
          const sourceValue = ___default["default"](arcData)
            .filter(row => {
              return row[targetField] === _name_
            })
            .sumBy(valueField);
          // Get target
          const targetValue = ___default["default"](arcData)
            .filter(row => {
              return row[sourceField] === _name_
            })
            .sumBy(valueField);
          // Net off
          const value =
            chordType === 'undirected'
              ? sourceValue + targetValue
              : sourceValue - targetValue;

          const arrowSymbol =
            chordType === 'undirected' ? '' : value >= 0 ? '&rarr;' : '&larr;';

          return {
            _name_: _name_,
            _value_: Math.abs(value),
            arrowSymbol: arrowSymbol,
          }
        });

        const arcValue = ___default["default"](arcData).sumBy(valueField);
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
          .reverse();
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
        );
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', (e, d) => {
        d3__namespace.select(`.arc-${d.index}`).classed('arc-hovered', false);
        d3__namespace.selectAll(`.ribbon-source-${d.index}`).classed('ribbon-hovered', false);
        d3__namespace.selectAll(`.ribbon-target-${d.index}`).classed('ribbon-hovered', false);
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);

        if (currentState === 'showAll') {
          setShowAllState();
        }
      })
      .on('click', (e, d) => {
        if (clickInteraction) {
          const clickedState = d3__namespace
            .select(e.target.parentNode)
            .classed('arc-active');
          d3__namespace.select(`.arc-${d.index}`).classed('arc-active', !clickedState);
          d3__namespace.selectAll(`.ribbon-${d.index}`).classed(
            'ribbon-active',
            !clickedState,
          );
        }
      });

    const ribbons = chartCore.append('g').attr('class', 'ribbons');

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
      `
      })
      .attr('fill', d => colorScale(names[d.target.index]))
      .style('mix-blend-mode', 'multiply')
      .on('mouseover', (e, d) => {
        if (currentState == 'showAll') {
          setClearAllState();
        }
        d3__namespace.select(`.ribbon-${d.source.index}-${d.target.index}`).classed(
          'ribbon-hovered',
          true,
        );
        d3__namespace.select(`.arc-${d.source.index}`).classed('arc-hovered', true);
        d3__namespace.select(`.arc-${d.target.index}`).classed('arc-hovered', true);
        tooltipDiv.transition().duration(200).style('opacity', 1);
        const sourceName = names[d.source.index];
        const targetName = names[d.target.index];
        const flowValue = d.source.value;
        const arrowSymbol = chordType === 'undirected' ? '⟷' : '→';
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
        );
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', (e, d) => {
        d3__namespace.select(`.ribbon-${d.source.index}-${d.target.index}`).classed(
          'ribbon-hovered',
          false,
        );
        d3__namespace.select(`.arc-${d.source.index}`).classed('arc-hovered', false);
        d3__namespace.select(`.arc-${d.target.index}`).classed('arc-hovered', false);
        if (currentState == 'showAll') {
          setShowAllState();
        }
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      })
      .on('click', (e, d) => {
        if (clickInteraction) {
          const clickedState = d3__namespace.select(e.target).classed('ribbon-active');
          d3__namespace.select(`.ribbon-${d.source.index}-${d.target.index}`).classed(
            'ribbon-active',
            !clickedState,
          );
          d3__namespace.select(`.arc-${d.source.index}`).classed('arc-active', !clickedState);
          d3__namespace.select(`.arc-${d.target.index}`).classed('arc-active', !clickedState);
        }
      });
  }

  const searchEventHandler$1 = (referenceList, index) => qstr => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      const matchedIndexes = [];
      referenceList.forEach(val => {
        const arcName = toClassText(val).toLowerCase();
        const index_ = index.get(arcName);
        if (arcName.toLowerCase().includes(lqstr)) {
          matchedIndexes.push(index_);
        }
      });
      d3__namespace.select('.ribbons').classed('searching', true);
      d3__namespace.select('.arcs').classed('searching', true);
      d3__namespace.selectAll('.arc').classed('arc-matched', false);
      d3__namespace.selectAll('.ribbon').classed('ribbon-matched', false);
      setClearAllState();
      matchedIndexes.forEach(val => {
        d3__namespace.select(`.arc-${val}`).classed('arc-matched', true);
        d3__namespace.selectAll(`.ribbon-source-${val}`).classed('ribbon-matched', true);
        d3__namespace.selectAll(`.ribbon-target-${val}`).classed('ribbon-matched', true);
      });
    } else {
      d3__namespace.select('.ribbons').classed('searching', false);
      d3__namespace.select('.arcs').classed('searching', false);
      d3__namespace.selectAll('.arc').classed('arc-matched', false);
      d3__namespace.selectAll('.ribbon').classed('ribbon-matched', false);
      if (currentState === 'showAll') {
        setShowAllState();
      } else if (currentState === 'clearAll') {
        setClearAllState();
      }
    }
  };

  function setupSearch$1({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    sourceField,
  }) {
    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);
    // TODO: refactor hidden, won't be needed if we add this node
    search.attr('placeholder', `Find by ${sourceField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr);
    });
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
      .attr('class', clearAllButtonClassNames);
    clearAll.classed('hidden', false);
    clearAll.on('click', () => {
      currentState = 'clearAll';
      setClearAllState();
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
    const clearAll = widgetsLeft
      .append('button')
      .text('Show All')
      .attr('class', showAllButtonClassNames);
    clearAll.classed('hidden', false);
    clearAll.on('click', () => {
      currentState = 'showAll';
      setShowAllState();
      search.node().value = '';
      handleSearch('');
    });
  }

  function setShowAllState() {
    d3__namespace.selectAll('.ribbon').classed('ribbon-active', true);
    d3__namespace.selectAll('.arc').classed('arc-active', true);
  }

  function setClearAllState() {
    d3__namespace.selectAll('.ribbon').classed('ribbon-active', false);
    d3__namespace.selectAll('.arc').classed('arc-active', false);
  }

  // export function that

  const dimensionTypes$1 = {
    sourceField: [shouldNotBeBlank], // Categorical
    targetField: [shouldNotBeBlank], // Categorical
    valueField: [shouldBeZeroOrPositiveNumber, shouldNotBeBlank], // Numeric, shouldBePositive?
  };

  const optionTypes$1 = {
    aspectRatio: checkNumberBetween([0, Number.POSITIVE_INFINITY]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    chordType: checkOneOf(['directed', 'undirected']),

    colorScheme: checkColorArray,
    arcLabelFontSize: checkFontSizeString,

    activeOpacity: checkNumberBetween([0, 1]),
    inactiveOpacity: checkNumberBetween([0, 1]),
    clickInteraction: checkBoolean,

    // searchInputClassNames: checkString,
    // clearAllButtonClassNames: checkString,
    // showAllButtonClassNames: checkString,

    startingState: checkOneOf(['showAll', 'clearAll']),
  };

  const validateAndRender$1 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$1, options });

    d3__namespace.csv(dataPath).then(data => {
      // Run validations
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

      // eslint-disable-next-line no-console
      // console.log({ combinedValidation })
    });
  };

  /* global window */

  function renderChart({
    data,
    options: {
      aspectRatio = 0.7,

      bgColor = 'transparent',
      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      colorScheme = ['#3077aa', '#ed3833'],
      barOpacity = 1,

      barValueMidPoint = 50,

      axesTickSize = 10,

      leftXAxisLabel = barLeftValueField,
      rightXAxisLabel = barRightValueField,
      xAxisLabel = '',

      defaultState = [],

      inactiveOpacity = 0.2,
      activeOpacity = 1,

      goToInitialStateButtonClassNames = '',
      searchInputClassNames = '',
      clearAllButtonClassNames = '',
      showAllButtonClassNames = '',
    },
    dimensions: {
      yField,
      barLeftValueField,
      barRightValueField,
      barLeftLabelField,
      barRightLabelField,
    },
    chartContainerSelector,
  }) {
    applyInteractionStyles({ bgColor, inactiveOpacity, activeOpacity });

    const tooltipDiv = initializeTooltip$1();

    const coreChartWidth = 1200;

    const { svg, coreChartHeight, allComponents, chartCore, widgetsLeft } =
      setupChartArea$1({
        chartContainerSelector,
        coreChartWidth,
        aspectRatio,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        bgColor,
      });

    const {
      yDomain,
      maxOverall,
      xStartActual,
      dimensionValues,
      defaultStateAll,
    } = parseData({
      data,
      yField,
      barRightValueField,
      barLeftValueField,
      barValueMidPoint,
      defaultState,
    });

    const { yScale, xScaleLeft, xScaleRight, xStart } = setupScales({
      coreChartHeight,
      coreChartWidth,
      yDomain,
      xStartActual,
      maxOverall,
    });

    const { markerSymbol, symbolSize, triangleOffset, symbolConstant } =
      setupBarSymbol({ yScale, chartCore });

    const { leftBarsContainer, rightBarsContainer } = renderBars({
      chartCore,
      coreChartWidth,
      data,
      tooltipDiv,
      leftXAxisLabel,
      barLeftValueField,
      xScaleLeft,
      yScale,
      yField,
      triangleOffset,
      xStart,
      colorScheme,
      barOpacity,
      markerSymbol,
      symbolSize,
      symbolConstant,
      barLeftLabelField,
      rightXAxisLabel,
      barRightValueField,
      xScaleRight,
      barRightLabelField,
      defaultStateAll,
    });

    renderXAxis({ leftBarsContainer, xScaleLeft, axesTickSize });

    renderYAxis({ rightBarsContainer, xScaleRight, axesTickSize });

    renderLegends({
      chartCore,
      xScaleLeft,
      xStart,
      axesTickSize,
      markerSymbol,
      symbolSize,
      triangleOffset,
      colorScheme,
      leftXAxisLabel,
      rightXAxisLabel,
      xAxisLabel,
    });

    const handleSearch = searchEventHandler(dimensionValues);
    setupSearch({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      yField,
      svg,
      chartContainerSelector,
      dimensionValues,
    });

    // setupInitialStateButton({
    //   widgetsLeft,
    //   goToInitialStateButtonClassNames,
    //   defaultStateAll,
    //   search,
    //   handleSearch,
    // })

    // setupClearAllButton({
    //   widgetsLeft,
    //   clearAllButtonClassNames,
    //   search,
    //   handleSearch,
    // })

    // setupShowAllButton({
    //   widgetsLeft,
    //   showAllButtonClassNames,
    //   search,
    //   handleSearch,
    // })

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function applyInteractionStyles({ bgColor, inactiveOpacity, activeOpacity }) {
    d3__namespace.select('body').append('style').html(`
  g.bar {
    stroke: ${bgColor};
    fill-opacity: ${inactiveOpacity};
  }
  g.bar.bar-active {
    stroke: ${bgColor};
    fill-opacity: ${activeOpacity};
  }
  g.left-bars.searching .bar.bar-matched {
    stroke: #333;
    stroke-width: 2;
  }
  g.right-bars.searching .bar.bar-matched {
    stroke: #333;
    stroke-width: 2;
  }
  g.bar.bar-hovered {
    stroke: #333;
    stroke-width: 2;
  }
`);
  }

  function parseData({
    data,
    yField,
    barRightValueField,
    barLeftValueField,
    barValueMidPoint,
    defaultState,
  }) {
    const yDomain = data.map(el => el[yField]);
    const maxRight = d3__namespace.max(
      data.map(el => Number.parseFloat(el[barRightValueField])),
    );
    const maxLeft = d3__namespace.max(
      data.map(el => Number.parseFloat(el[barLeftValueField])),
    );
    const maxOverall = d3__namespace.max([maxLeft, maxRight]);

    const minRight = d3__namespace.min(
      data.map(el => Number.parseFloat(el[barRightValueField])),
    );
    const minLeft = d3__namespace.min(
      data.map(el => Number.parseFloat(el[barLeftValueField])),
    );
    const minOverall = d3__namespace.min([minLeft, minRight]);

    const xStartActual = d3__namespace.min([barValueMidPoint, minOverall]);

    const dimensionValues = ___default["default"](data).map(yField).uniq().value();
    const defaultStateAll =
      defaultState === 'All' ? dimensionValues : defaultState;

    return { yDomain, maxOverall, xStartActual, dimensionValues, defaultStateAll }
  }

  function setupScales({
    coreChartHeight,
    coreChartWidth,
    yDomain,
    xStartActual,
    maxOverall,
  }) {
    const yScale = d3__namespace
      .scaleBand()
      .range([0, coreChartHeight])
      .domain(yDomain)
      .paddingInner(0.8)
      .paddingOuter(0.7);

    const xScaleLeft = d3__namespace
      .scaleLinear()
      .range([coreChartWidth / 2, 0])
      .domain([xStartActual, maxOverall])
      .nice();
    const xScaleRight = d3__namespace
      .scaleLinear()
      .range([coreChartWidth / 2, coreChartWidth])
      .domain([xStartActual, maxOverall])
      .nice();

    const xStart = d3__namespace.min(xScaleRight.domain());
    return { yScale, xScaleLeft, xScaleRight, xStart }
  }

  function renderLegends({
    chartCore,
    xScaleLeft,
    xStart,
    axesTickSize,
    markerSymbol,
    symbolSize,
    triangleOffset,
    colorScheme,
    leftXAxisLabel,
    rightXAxisLabel,
    xAxisLabel,
  }) {
    const topLegend = chartCore.append('g').attr('class', 'top-legend');

    // Center divider
    const centerDividerWidth = 2;

    topLegend
      .append('rect')
      .attr('x', xScaleLeft(xStart) - (centerDividerWidth - 1) / 2)
      .attr('y', -axesTickSize * 5)
      .attr('height', axesTickSize * 2)
      .attr('width', centerDividerWidth)
      .attr('fill', '#000');

    // left triangle
    topLegend
      .append('path')
      .attr('d', markerSymbol.size(symbolSize / 2))
      .attr(
        'transform',
        `translate(${
        xScaleLeft(xStart) -
        triangleOffset / 4 -
        5 -
        (centerDividerWidth - 1) / 2
      }, ${-axesTickSize * 4}) rotate(-90)`,
      )
      .attr('fill', colorScheme[0]);

    // left label
    topLegend
      .append('text')
      .text(leftXAxisLabel)
      .attr(
        'transform',
        `translate(${
        xScaleLeft(xStart) - triangleOffset - 5 - (centerDividerWidth - 1) / 2
      }, ${-axesTickSize * 4}) `,
      )
      .attr('fill', colorScheme[0])
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'end')
      .attr('style', 'font-weight: bold;');

    // right triangle
    topLegend
      .append('path')
      .attr('d', markerSymbol.size(symbolSize / 2))
      .attr(
        'transform',
        `translate(${
        xScaleLeft(xStart) +
        triangleOffset / 4 +
        5 +
        (centerDividerWidth + 1) / 2
      }, ${-axesTickSize * 4}) rotate(90)`,
      )
      .attr('fill', colorScheme[1]);

    // right label
    topLegend
      .append('text')
      .text(rightXAxisLabel)
      .attr(
        'transform',
        `translate(${
        xScaleLeft(xStart) + triangleOffset + 5 + (centerDividerWidth + 1) / 2
      }, ${-axesTickSize * 4}) `,
      )
      .attr('fill', colorScheme[1])
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'start')
      .attr('style', 'font-weight: bold;');

    // top label
    topLegend
      .append('text')
      .text(xAxisLabel)
      .attr(
        'transform',
        `translate(${xScaleLeft(xStart)}, ${-axesTickSize * 6}) `,
      )
      .attr('fill', '#333')
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
      .attr('style', 'font-weight: bold;');
  }

  function renderXAxis({ leftBarsContainer, xScaleLeft, axesTickSize }) {
    leftBarsContainer
      .append('g')
      .call(d3__namespace.axisTop(xScaleLeft).tickSize(axesTickSize))
      .call(g => {
        g.select('.domain').remove();
        g.selectAll('.tick line').attr('stroke', '#555');
        g.selectAll('.tick text').attr('fill', '#555').attr('font-size', 12);
      });
  }

  function renderYAxis({ rightBarsContainer, xScaleRight, axesTickSize }) {
    rightBarsContainer
      .append('g')
      .call(d3__namespace.axisTop(xScaleRight).tickSize(axesTickSize))
      .call(g => {
        g.select('.domain').remove();
        g.selectAll('.tick line').attr('stroke', '#555');
        g.selectAll('.tick text').attr('fill', '#555').attr('font-size', 12);

        // Remove overlapping duplicate elements
        // g.select('.tick > line:first-of-type').remove()
        // g.select('.tick > text:first-of-type').remove()
      });
  }

  function setupBarSymbol({ yScale, chartCore }) {
    const markerSymbol = d3__namespace.symbol().type(d3__namespace.symbols[5]); // 5 is for triangle
    const symbolSize = yScale.bandwidth() ** 2 * 1;
    const testSymbol = chartCore
      .append('g')
      .attr('class', 'test-symbol')
      .append('path')
      .attr('d', markerSymbol.size(symbolSize));
    const testSymbolDimensions = testSymbol.node().getBBox();
    // Note using height because the triangle is rotated by 90 degrees
    const triangleOffset = testSymbolDimensions.height;
    const symbolConstant = Math.sqrt(symbolSize) / triangleOffset;
    testSymbol.remove();

    return { markerSymbol, symbolSize, triangleOffset, symbolConstant }
  }

  function renderBars({
    chartCore,
    coreChartWidth,
    data,
    tooltipDiv,
    leftXAxisLabel,
    barLeftValueField,
    xScaleLeft,
    yScale,
    yField,
    triangleOffset,
    xStart,
    colorScheme,
    barOpacity,
    markerSymbol,
    symbolSize,
    symbolConstant,
    barLeftLabelField,
    rightXAxisLabel,
    barRightValueField,
    xScaleRight,
    barRightLabelField,
    defaultStateAll,
  }) {
    const leftBarsContainer = chartCore.append('g').attr('class', 'left-bars');

    const leftBars = leftBarsContainer
      .selectAll('g')
      .data(data)
      .join('g')
      .attr(
        'class',
        d =>
          `bar
      bar-${toClassText(d[yField])}
      ${defaultStateAll.includes(d[yField]) ? 'bar-active' : ''}
      `,
      )
      .on('mouseover', function (e, d) {
        d3__namespace.select(this).classed('bar-hovered', true);

        tooltipDiv.transition().duration(200).style('opacity', 1);

        tooltipDiv.html(`${leftXAxisLabel}: ${d[barLeftValueField]}`);
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', function () {
        d3__namespace.select(this).classed('bar-hovered', false);

        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });

    leftBars
      .append('rect')
      .attr('x', d => xScaleLeft(d[barLeftValueField]) + triangleOffset)
      .attr('y', d => yScale(d[yField]))
      .attr('height', yScale.bandwidth())
      .attr('width', d => {
        const rw =
          xScaleLeft(xStart) - xScaleLeft(d[barLeftValueField]) - triangleOffset;
        return rw > 0 ? rw : 0
      })
      .attr('fill', colorScheme[0])
      .attr('opacity', barOpacity);

    // Left Symbols
    leftBars
      .append('path')
      .attr('transform', d => {
        const w = xScaleLeft(xStart) - xScaleLeft(d[barLeftValueField]);

        return `translate(${
        w > triangleOffset
          ? xScaleLeft(d[barLeftValueField]) + (triangleOffset * 2) / 3
          : xScaleLeft(xStart) - w / 3
      }, ${yScale(d[yField]) + yScale.bandwidth() / 2})
         rotate(-90)`
      })
      .attr('d', d => {
        const w = xScaleLeft(xStart) - xScaleLeft(d[barLeftValueField]);
        if (w > triangleOffset) {
          return markerSymbol.size(symbolSize)(d)
        }
        const customTriangleSize = (w * symbolConstant) ** 2;
        return markerSymbol.size(customTriangleSize)()
      })
      .attr('fill', colorScheme[0])
      .attr('opacity', barOpacity);

    leftBars
      .append('text')
      .text(d => d[barLeftLabelField])
      .attr('text-anchor', 'end')
      .style('dominant-baseline', 'middle')
      .attr('x', d => xScaleLeft(d[barLeftValueField]) - 5)
      .attr('y', d => yScale(d[yField]) + yScale.bandwidth() / 2)
      .style('font-size', '14px')
      .attr('stroke', '#333')
      .attr('stroke-width', 0);

    const rightBarsContainer = chartCore.append('g').attr('class', 'right-bars');

    const rightBars = rightBarsContainer
      .selectAll('g')
      .data(data)
      .join('g')
      .attr(
        'class',
        d =>
          `bar
      bar-${toClassText(d[yField])}
      ${defaultStateAll.includes(d[yField]) ? 'bar-active' : ''}
      `,
      )
      .on('mouseover', function (e, d) {
        d3__namespace.select(this).classed('bar-hovered', true);

        tooltipDiv.transition().duration(200).style('opacity', 1);

        tooltipDiv.html(`${rightXAxisLabel}: ${d[barRightValueField]}`);
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', function () {
        d3__namespace.select(this).classed('bar-hovered', false);

        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });

    rightBars
      .append('rect')
      .attr('x', xScaleRight(xStart))
      .attr('y', d => yScale(d[yField]))
      .attr('height', yScale.bandwidth())
      .attr('width', d => {
        const rw =
          -xScaleRight(xStart) +
          xScaleRight(d[barRightValueField]) -
          triangleOffset;
        return rw > 0 ? rw : 0
      })
      .attr('fill', colorScheme[1])
      .attr('opacity', barOpacity);

    // Right Symbols
    rightBars
      .append('path')
      .attr('transform', d => {
        const w = -xScaleRight(xStart) + xScaleRight(d[barRightValueField]);

        const xOffset =
          xScaleRight(d[barRightValueField]) - (triangleOffset * 2) / 3;
        return `translate(${
        w > triangleOffset ? xOffset : xScaleRight(xStart) + w / 3
      }, ${yScale(d[yField]) + yScale.bandwidth() / 2}) rotate(90)`
      })
      .attr('d', d => {
        const w = -xScaleRight(xStart) + xScaleRight(d[barRightValueField]);
        if (w > triangleOffset) {
          return markerSymbol.size(symbolSize)()
        }
        const customTriangleSize = (w * symbolConstant) ** 2;
        return markerSymbol.size(customTriangleSize)()
      })
      .attr('fill', colorScheme[1])
      .attr('opacity', barOpacity);

    rightBars
      .append('text')
      .text(d => d[barRightLabelField])
      .attr('text-anchor', 'start')
      .style('dominant-baseline', 'middle')
      .attr('x', d => xScaleRight(d[barRightValueField]) + 5)
      .attr('y', d => yScale(d[yField]) + yScale.bandwidth() / 2)
      .style('font-size', '14px')
      .attr('stroke', '#333')
      .attr('stroke-width', 0);

    // Dimension Labels
    chartCore
      .append('g')
      .selectAll('text')
      .data(data)
      .join('text')
      .text(d => d[yField])
      .attr('x', coreChartWidth / 2)
      .attr('y', d => yScale(d[yField]) - 7)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'text-top')
      .attr('fill', '#444')
      .attr('font-weight', 'bold');

    return { leftBarsContainer, rightBarsContainer }
  }

  const searchEventHandler = referenceList => (qstr, svg) => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        // d3.selectAll('.mace').classed('mace-active', false)
        const barName = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          svg.selectAll(`.bar-${barName}`).classed('bar-matched', true);
        } else {
          svg.selectAll(`.bar-${barName}`).classed('bar-matched', false);
        }
        svg.select('.left-bars').classed('searching', true);
        svg.select('.right-bars').classed('searching', true);
      });
    } else {
      referenceList.forEach(val => {
        const barName = toClassText(val);
        svg.selectAll(`.bar-${barName}`).classed('bar-matched', false);
      });
      svg.select('.left-bars').classed('searching', false);
      svg.select('.right-bars').classed('searching', false);
    }
  };

  function setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    yField,
    svg,
    chartContainerSelector,
    dimensionValues,
  }) {

    widgetsLeft
        .append('datalist')
        .attr('role', 'datalist')
        // Assuming that chartContainerSelector will always start with #
        // i.e. it's always an id selector of the from #id-to-identify-search
        // TODO add validation
        .attr('id', `${chartContainerSelector.slice(1)}-search-list`)
        .html(
          ___default["default"](dimensionValues)
            .uniq()
            .map(el => `<option>${el}</option>`)
            .join(''),
        );

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);

    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`);

    search.attr('placeholder', `Find by ${yField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr, svg);
    });
    return search
  }

  const dimensionTypes = {
    yField: [shouldBeUnique, shouldNotBeBlank], // Categorical

    // barLeftLabelField: 'Democratic Label', // Categorical
    barLeftValueField: [shouldBeNumber], // Numeric

    // barRightLabelField: 'Republican Label', // Categorical
    barRightValueField: [shouldBeNumber], // Numeric
  };

  const optionTypes = {
    aspectRatio: checkNumberBetween([0.1, Number.POSITIVE_INFINITY]),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    // /* Dimensions */
    // /* xField */
    // leftXAxisLabel: checkString,
    // rightXAxisLabel: checkString,
    // xAxisLabel: checkString,

    // /* Chart Specific */
    colorScheme: checkColorArray(2),
    barValueMidPoint: checkNumber,
    barOpacity: checkNumberBetween([0, 1]),
  };

  function validateAndRender({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) {
    const optionsValidationResult = optionValidation({ optionTypes, options });

    d3__namespace.csv(dataPath).then(data => {
      // Run validations
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
  }

  exports.renderBubbleHorizontal = renderChart$7;
  exports.renderCalendar = renderChart$4;
  exports.renderChord = renderChart$1;
  exports.renderComparativeBar = renderChart;
  exports.renderDominoBase = renderChart$6;
  exports.renderDominoRibbon = renderChart$2;
  exports.renderMace = renderChart$9;
  exports.renderMotionBubble = renderChart$3;
  exports.renderRidgeline = renderChart$5;
  exports.renderSankey = renderChart$8;
  exports.validateAndRenderBubbleHorizontal = validateAndRender$7;
  exports.validateAndRenderCalendar = validateAndRender$4;
  exports.validateAndRenderChord = validateAndRender$1;
  exports.validateAndRenderComparativeBar = validateAndRender;
  exports.validateAndRenderDominoBase = validateAndRender$6;
  exports.validateAndRenderDominoRibbon = validateAndRender$2;
  exports.validateAndRenderMace = validateAndRender$9;
  exports.validateAndRenderMotionBubble = validateAndRender$3;
  exports.validateAndRenderRidgeline = validateAndRender$5;
  exports.validateAndRenderSankey = validateAndRender$8;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
