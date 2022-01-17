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
    return str
      .trim()
      .replace(/[\s&',.()]/g, '-')
      .toLowerCase()
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

  function renderChart$k({
    data,
    dimensions: {
      xFieldStart,
      xFieldEnd,
      yFieldStart,
      yFieldEnd,
      sizeField,
      nameField,
    },

    options: {
      aspectRatio = 2,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      oppositeDirectionColor = '#ee4e34',
      sameDirectionColor = '#44a8c1',

      yAxisTitle = `${yFieldStart} → ${yFieldEnd}`,
      xAxisTitle = `${xFieldStart} → ${xFieldEnd}`,

      xValueFormatter = '',
      yValueFormatter = '',

      directionStartLabel = 'start point',
      directionEndLabel = 'end point',
      sizeLegendValues = [1e6, 1e8, 1e9],
      sizeLegendMoveSizeObjectDownBy = 5,
      sizeLegendTitle = 'size legend title',
      sizeValueFormatter = '',

      xAxisTickValues = [],

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
    chartContainerSelector,
  }) {
    applyInteractionStyles$b({
      chartContainerSelector,
      activeOpacity,
      inactiveOpacity,
    });

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

    const tooltipDiv = initializeTooltip$4();

    const dataParsed = parseData$b({
      data,
      xFieldStart,
      xFieldEnd,
      yFieldStart,
      yFieldEnd,
      sizeField,
    });

    const { yScale, xScale, circleSizeScale, lineWidthScale, colorScale } =
      setupScales$c({
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
        xAxisTickValues,
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
      svg,
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

    renderXAxis$a({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      xScale,
      xAxisTickValues,
      xAxisTitle,
    });

    // y-axis
    renderYAxis$8({ chartCore, coreChartWidth, yScale, yAxisTitle });

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
    const handleSearch = searchEventHandler$8(nameValues);
    const search = setupSearch$a({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      nameField,
      nameValues,
      svg,
      chartContainerSelector,
    });

    setupInitialStateButton$6({
      widgetsLeft,
      goToInitialStateButtonClassNames,
      defaultStateAll,
      search,
      handleSearch,
      svg,
    });
    setupClearAllButton$7({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
      svg,
    });

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function applyInteractionStyles$b({
    activeOpacity,
    inactiveOpacity,
    chartContainerSelector,
  }) {
    d3__namespace.select('body').append('style').html(`
    ${chartContainerSelector} .mace {
      cursor: pointer;
    }
    ${chartContainerSelector} g.maces .mace {
      fill-opacity: ${inactiveOpacity};
    }
    /* clicked and legend clicked states are common: controlled by .mace-active */
    ${chartContainerSelector} g.maces .mace.mace-active {
      fill-opacity: ${activeOpacity};
    }
    ${chartContainerSelector} g.maces.searching .mace.mace-matched {
      stroke: #333;
      stroke-width: 3;
    }
    /* So that legend text is visible irrespective of state */
    ${chartContainerSelector} g.mace text {
      fill-opacity: 0.8;
    }
    ${chartContainerSelector} g.maces g.mace.mace-hovered {
      stroke: #333;
      stroke-width: 3;
    }
    ${chartContainerSelector} g.color-legend g.mace-active {
      fill-opacity: ${activeOpacity};
    }
    ${chartContainerSelector} g.color-legend g:not(.mace-active) {
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

  function parseData$b({
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

  function setupScales$c({
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
    xAxisTickValues,
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
    const xDomain = d3__namespace.extent([
      ...xDomainStart,
      ...xDomainEnd,
      ...xAxisTickValues,
    ]);

    const xScale =
      xScaleType === 'log'
        ? d3__namespace
            .scaleLog()
            .base(xScaleLogBase || 10)
            .range([0, coreChartWidth])
            .domain(xDomain)
        : d3__namespace.scaleLinear().range([0, coreChartWidth]).domain(xDomain);

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
  function renderXAxis$a({
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
      xAxisTickValues.length
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

  function renderYAxis$8({ chartCore, coreChartWidth, yScale, yAxisTitle }) {
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
    svg,
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
        svg.selectAll('.mace-same').classed('mace-active', !legendState);
        // Need this extra class toggle as legend is outside the main chart svg
        parentLegend.classed('mace-active', !legendState);
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
        svg.selectAll('.mace-opposite').classed('mace-active', !legendState);
        // Need this extra class toggle as legend is outside the main chart svg
        parentLegend.classed('mace-active', !legendState);
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
  const searchEventHandler$8 = referenceList => (qstr, svg) => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        // d3.selectAll('.mace').classed('mace-active', false)
        const maceName = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          svg.select(`.mace-${maceName}`).classed('mace-matched', true);
        } else {
          svg.select(`.mace-${maceName}`).classed('mace-matched', false);
        }
        svg.select('.maces').classed('searching', true);
      });
    } else {
      referenceList.forEach(val => {
        const maceName = toClassText(val);
        svg.select(`.mace-${maceName}`).classed('mace-matched', false);
      });
      svg.select('.maces').classed('searching', false);
    }
  };

  function setupSearch$a({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    nameField,
    svg,
    chartContainerSelector,
    nameValues,
  }) {

    widgetsLeft
        .append('datalist')
        .attr('role', 'datalist')
        // Assuming that chartContainerSelector will always start with #
        // i.e. it's always an id selector of the from #id-to-identify-search
        // TODO add validation
        .attr('id', `${chartContainerSelector.slice(1)}-search-list`)
        .html(
          ___default["default"](nameValues)
            .uniq()
            .map(el => `<option>${el}</option>`)
            .join(''),
        );

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);

    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`);

    search.attr('placeholder', `Find by ${nameField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr, svg);
    });
    return search
  }

  function setupInitialStateButton$6({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
    svg,
  }) {
    const goToInitialState = widgetsLeft
      .append('button')
      .text('Go to Initial State')
      .attr('class', goToInitialStateButtonClassNames);
    goToInitialState.classed('hidden', false);
    goToInitialState.on('click', () => {
      svg.selectAll('.mace').classed('mace-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        svg.select(`.mace-${toClassText(val)}`).classed('mace-active', true);
      });
      search.node().value = '';
      handleSearch('');
    });
  }

  function setupClearAllButton$7({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
    svg,
  }) {
    const clearAll = widgetsLeft
      .append('button')
      .text('Clear All')
      .attr('class', clearAllButtonClassNames);
    clearAll.classed('hidden', false);
    clearAll.on('click', () => {
      svg.selectAll('.mace').classed('mace-active', false);
      search.node().value = '';
      handleSearch('');
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
      // Ignore options key if undefined,
      // because all options have a default value inside the chart
      if (typeof options[key] !== 'undefined') {
        const result = fn(options[key]);
        if (!result.valid) {
          optionValidations.push({
            keyValue: `${key}: ${options[key]}`,
            message: result.message,
          });
        }
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

  const checkPositiveInteger = val => {
    const valid = Number.isInteger(val) && val > 0;
    if (valid) {
      return { valid: true }
    }
    return { valid: false, message: 'Should be a positive integer' }
  };

  const checkBoolean = val => {
    const valid = typeof val === 'boolean';
    if (valid) {
      return { valid: true }
    }
    return { valid: false, message: 'Should be true or false' }
  };

  const checkNumberBetween = (a, b) => val => {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
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
    if (!Array.isArray(arr))
      return { valid: false, message: 'Should be an array of colors' }
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

  const checkNumericArray = length => arr => {
    const numberValidationResult = arr.map(el => checkNumber(el));
    const lengthValidationResult = { valid: true, message: '' };
    if (___default["default"].isArray(arr)) {
      if (length && arr.length < length) {
        lengthValidationResult.valid = false;
        lengthValidationResult.message = `Should be an array with at least ${length} numbers`;
      }

      const checkAllResults = [...numberValidationResult, lengthValidationResult];
      const combinedResult = { valid: true, message: '' };

      checkAllResults.forEach(result => {
        if (!result.valid) {
          combinedResult.message += `<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${result.message}`;
          combinedResult.valid = false;
        }
      });

      return combinedResult
    }

    return { valid: false, message: 'Should be an array of numbers' }
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
      result.message = `These dimensions/columns are missing in the data file: ${result.missingFields.join(
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

  const dimensionTypes$i = {
    xFieldStart: [shouldBeNumber],
    xFieldEnd: [shouldBeNumber],
    yFieldStart: [shouldBeNumber],
    yFieldEnd: [shouldBeNumber],
    sizeField: [shouldBeNumber],
    nameField: [shouldNotBeBlank, shouldBeUnique],
  };

  const optionTypes$j = {
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
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    // xAxisTitle: checkString,
    // xFieldType: checkString,
    xAxisTickValues: checkNumericArray(), // comment this for automatic tick values
    xScaleType: checkOneOf(['log', 'linear']), // linear or log
    xScaleLogBase: checkNumber, // can be any number greater than 0: TODO?

    // yAxisTitle: checkString,
    // yFieldType: checkString,

    sizeLegendValues: checkNumericArray(),
    sizeLegendMoveSizeObjectDownBy: checkNumber,
    // sizeLegendTitle: checkString,

    oppositeDirectionColor: checkColor,
    sameDirectionColor: checkColor,
    // directionStartLabel: checkString,
    // directionEndLabel: checkString,

    defaultState: checkDefaultState,

    activeOpacity: checkNumberBetween(0, 1),
    inactiveOpacity: checkNumberBetween(0, 1),
  };

  const validateAndRender$k = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$j, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      // Run validations
      const { columns } = data;
      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$i, dimensions });

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
        ? renderChart$k({ data, dimensions, options, chartContainerSelector })
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

  function renderChart$j({
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

  const dimensionTypes$h = {
    sourceField: [shouldNotBeBlank],
    targetField: [shouldNotBeBlank],
    valueField: [shouldBeNumber],
  };

  const optionTypes$i = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    align: checkOneOf(['justify', 'left', 'right', 'center']),

    verticalGapInNodes: checkNumber,
    nodeWidth: checkNumber,
  };

  const validateAndRender$j = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$i, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$h, dimensions });

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
        ? renderChart$j({ data, dimensions, options, chartContainerSelector })
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
    classNames,
    handleMouseover = a => a,
    handleMouseout = a => a,
    handleClick = a => a,
    cursorPointer = false,
  } = {}) {
    const svg = d3__namespace
      .create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .style('overflow', 'visible')
      // .style("opacity", 0.7)
      .style('display', 'block')
      .attr('class', classNames);

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
        .attr('style', `${cursorPointer ? 'cursor: pointer;' : ''}`)
        .attr('x', x)
        .attr('y', marginTop)
        .attr('width', Math.max(0, x.bandwidth() - 1))
        .attr('height', height - marginTop - marginBottom)
        .attr('fill', color)
        .on('mouseover', handleMouseover)
        .on('mouseout', handleMouseout)
        .on('click', handleClick);

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
    circle = false,
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
          ${circle ? 'border-radius: 50%;' : ''}
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
        ${circle ? 'border-radius: 50%;' : ''}
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

  function renderChart$i({
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

  const dimensionTypes$g = {
    sizeField: [shouldBeNumber],
    xField: [shouldBeNumber],
    nameField: [shouldNotBeBlank], // also search field
    segmentField: [shouldNotBeBlank],
  };

  const optionTypes$h = {
    aspectRatioCombined: checkNumberBetween(0.01, Number.MAX_SAFE_INTEGER),
    aspectRatioSplit: checkNumberBetween(0.01, Number.MAX_SAFE_INTEGER),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    customColorScheme: checkColorArray,
    inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
    numberOfColors: checkNumberBetween(3, 9),

    collisionDistance: checkNumberBetween(0, Number.MAX_SAFE_INTEGER),

    /* xField */
    xDomainCustom: checkNumericArray(2),
    // xAxisLabel = xField,
    // xValuePrefix = '',
    // xValueFormatter = '',
    // xValueSuffix = '',

    /* sizeField */
    sizeRange: checkNumericArray(2),
    // sizeValuePrefix = '',
    // sizeValueFormatter = '',
    // sizeValueSuffix = '',
    sizeLegendValues: checkNumericArray(),
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

  const validateAndRender$i = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$h, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });
      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$g, dimensions });

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
        ? renderChart$i({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

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
      .attr(
        'style',
        'display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: center; column-gap: 5px;',
      );
    const widgetsRight = widgets
      .append('div')
      .attr(
        'style',
        'display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; column-gap: 10px;',
      );

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
        `opacity: 0; position: absolute; background-color: white;
        border-radius: 0.25rem; padding: 0.5rem 0.75rem; font-size: 0.75rem;
        line-height: 1rem; border-width: 1px;`,
      )
  }

  /* eslint-disable no-import-assign */

  function renderChart$h({
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
    applyInteractionStyles$a();

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

    const tooltipDiv = initializeTooltip$3();

    const dataParsed = parseData$a({
      data,
      colorField,
      yField,
    });

    const { xScale, yScale, colorScale } = setupScales$b({
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

    renderYAxis$7({ chartCore, yScale });

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

    renderXAxis$9({ chartCore, xAxisLabel, coreChartWidth });

    const dominoValues = ___default["default"](dataParsed).map(dominoField).uniq().value();
    const handleSearch = searchEventHandler$7(dominoValues);
    setupSearch$9({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      dominoField,
      svg,
      chartContainerSelector,
      dominoValues,
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

  function applyInteractionStyles$a() {
    d3__namespace.select('body').append('style').html(`
  rect.domino.domino-hovered {
    stroke: #333;
  }
  g.dominos.searching g rect.domino-matched {
    stroke: #333;
  }
  .searching rect:not(.domino-matched) {
    opacity: 0.2;
  }
  `);
  }

  function parseData$a({ data, colorField, yField }) {
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

  function setupScales$b({
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

  function renderYAxis$7({ chartCore, yScale }) {
    chartCore
      .append('g')
      .attr('class', 'y-axis-left')
      .call(d3__namespace.axisLeft(yScale).tickSize(0))
      .call(g => g.select('.domain').remove());
  }

  function renderXAxis$9({ chartCore, xAxisLabel, coreChartWidth }) {
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

  const searchEventHandler$7 = referenceList => (qstr, svg) => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        const dominoName = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          svg.selectAll(`.domino-${dominoName}`).classed('domino-matched', true);
        } else {
          svg.selectAll(`.domino-${dominoName}`).classed('domino-matched', false);
        }
        svg.select('.dominos').classed('searching', true);
      });
    } else {
      svg.selectAll('.domino').classed('domino-matched', false);
      svg.select('.dominos').classed('searching', false);
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

  function setupSearch$9({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    dominoField,
    svg,
    chartContainerSelector,
    dominoValues,
  }) {

    widgetsLeft
        .append('datalist')
        .attr('role', 'datalist')
        // Assuming that chartContainerSelector will always start with #
        // i.e. it's always an id selector of the from #id-to-identify-search
        // TODO add validation
        .attr('id', `${chartContainerSelector.slice(1)}-search-list`)
        .html(
          ___default["default"](dominoValues)
            .uniq()
            .map(el => `<option>${el}</option>`)
            .join(''),
        );

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);

    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`);

    search.attr('placeholder', `Find by ${dominoField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr, svg);
    });
    return search
  }

  const dimensionTypes$f = {
    xField: [shouldNotBeBlank],
    yField: [shouldNotBeBlank],
    colorField: [shouldBeNumber],
    dominoField: [shouldNotBeBlank],
  };

  const optionTypes$g = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    /* Dimensions */
    /* xField */
    xPaddingOuter: checkNumberBetween(0, 1),
    // xAxisLabel: checkString,

    /* yField */
    yPaddingInner: checkNumberBetween(0, 1),
    yPaddingOuter: checkNumberBetween(0, 1),
    ySortOrder: checkOneOf(['asc', 'desc']),

    /* colorField */
    colorStrategy: checkOneOf(['rank', 'value']),
    colorThreshold: checkNumber,
    colorDominoHighlighted: checkColor,
    colorDominoNormal: checkColor,

    /* dominoField */
    dominoSize: checkNumberBetween(0, 1),

    /* Legends */
    // normalLegendLabel: checkString,
    // highlightedLegendLabel: checkString,
  };

  const validateAndRender$h = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$g, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$f, dimensions });

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
        ? renderChart$h({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* eslint-disable no-import-assign */

  function applyInteractionStyles$9({ activeOpacity, inactiveOpacity }) {
    d3__namespace.select('body').append('style').html(`
  .series {
    cursor: pointer;
  }
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

  function initializeTooltip$2() {
    return d3__namespace
      .select('body')
      .append('div')
      .attr('class', 'dom-tooltip')
      .attr(
        'style',
        'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
      )
  }

  function parseData$9({ data, yField, xField, seriesField, colorField }) {
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

  function setupScales$a({
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

  function renderXAxis$8({
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

  const searchEventHandler$6 = referenceList => qstr => {
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

  function setupSearch$8({
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

  function setupInitialStateButton$5({
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

  function setupClearAllButton$6({
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

  function setupShowAllButton$6({
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

  function renderChart$g({
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
    applyInteractionStyles$9({ activeOpacity, inactiveOpacity });

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

    const tooltipDiv = initializeTooltip$2();

    const { parsedData, nestedData } = parseData$9({
      data,
      yField,
      xField,
      seriesField,
      colorField,
    });

    const { yScale, xScale, categoryScale, categoryDomain, fillColorScale } =
      setupScales$a({
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

    renderXAxis$8({
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

    const handleSearch = searchEventHandler$6(categoryDomain);
    const search = setupSearch$8({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      seriesField,
    });

    setupInitialStateButton$5({
      widgetsLeft,
      goToInitialStateButtonClassNames,
      defaultStateAll,
      search,
      handleSearch,
    });

    setupClearAllButton$6({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
    });

    setupShowAllButton$6({
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

  const dimensionTypes$e = {
    xField: [shouldNotBeBlank],
    yField: [shouldBeNumber],
    seriesField: [shouldNotBeBlank],
    colorField: [shouldNotBeBlank],
  };

  const optionTypes$f = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    seriesLabelPosition: checkOneOf(['left', 'right']),

    overlap: checkNumber,

    colorRange: checkColorArray(),

    defaultState: checkDefaultState,

    activeOpacity: checkNumberBetween(0, 1),
    inactiveOpacity: checkNumberBetween(0, 1),
  };

  const validateAndRender$g = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$f, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$e, dimensions });

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
        ? renderChart$g({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  function lineBandLegend({
    uid,
    swatchSize = 20,
    swatchWidth = swatchSize,
    swatchHeight = swatchSize,
    lineHeight = 5,
    lineBandColorScale,
    format = x => x,
    circleDiameter = 8,
    marginLeft = 10,
  }) {
    const id = `${uid}-lbl`;

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

  /* global window */

  function renderChart$f({
    data,
    dataScatter = [],
    dimensions: { xField, yFields },
    options: {
      aspectRatio = 2,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      xAxisLabel = xField,
      xValueDateParse = '',
      xValueDateFormat = '',

      yAxisLabel = '',
      yColors,
      yValueFormat = '',

      scatterCircleRadius = 2,

      highlightRanges = [],
      highlightRangeColors,
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

    const yValueFormatter = val => formatNumber(val, yValueFormat);

    const parseDate = xValueDateParse
      ? dt => {
          const date = d3__namespace.timeParse(xValueDateParse)(dt);
          return date
        }
      : dt => dt;

    const formatDate =
      xValueDateParse && xValueDateFormat
        ? d3__namespace.timeFormat(xValueDateFormat)
        : dt => dt;

    const tooltipDiv = initializeTooltip$1();

    const allYValues = [];

    const dataParsed = data.map(d => {
      const parsedDataRow = { ...d };
      yFields.forEach(yf => {
        if (yf.line) {
          const dyf = Number.parseFloat(d[yf.line]);
          parsedDataRow[yf.line] = dyf;
          allYValues.push(dyf);
        }
        if (yf.band) {
          const yBandFieldDataMin = Number.parseFloat(d[yf.band[0]]);
          parsedDataRow[yf.band[0]] = yBandFieldDataMin;
          allYValues.push(yBandFieldDataMin);

          const yBandFieldDataMax = Number.parseFloat(d[yf.band[1]]);
          parsedDataRow[yf.band[1]] = yBandFieldDataMax;
          allYValues.push(yBandFieldDataMax);
        }
      });

      parsedDataRow[xField] = parseDate(d[xField]);
      return parsedDataRow
    });

    const dataScatterParsed = dataScatter.map(d => {
      const parsedDataRow = { ...d };
      yFields.forEach(yf => {
        if (yf.circle) {
          const dyf = Number.parseFloat(d[yf.circle]);
          parsedDataRow[yf.line] = dyf;
          allYValues.push(dyf);
        }
      });
      parsedDataRow[xField] = parseDate(d[xField]);
      return parsedDataRow
    });

    const yDomain = d3__namespace.extent(allYValues);

    const xDomainLineBand = dataParsed.map(d => d[xField]);
    const xDomainScatter = dataScatterParsed.map(d => d[xField]);

    const xDomain = d3__namespace.extent([...xDomainLineBand, ...xDomainScatter]);

    const xScale = xValueDateParse
      ? d3__namespace.scaleTime().range([0, coreChartWidth]).domain(xDomain)
      : d3__namespace.scaleLinear().range([0, coreChartWidth]).domain(xDomain);
    const yScale = d3__namespace
      .scaleLinear()
      .range([coreChartHeight, 0])
      .domain(yDomain)
      .nice();

    const yAxisTickSizeOffset = 20;

    const yAxis = chartCore
      .append('g')
      .attr('id', 'x-axis')
      .attr('transform', `translate(${coreChartWidth + yAxisTickSizeOffset}, 0)`);

    yAxis
      .call(
        d3__namespace
          .axisRight(yScale)
          .tickFormat(yValueFormatter)
          .tickSize(-coreChartWidth - yAxisTickSizeOffset),
      )
      .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))
      .call(g => g.selectAll('.tick text').attr('fill', '#333'))
      .call(g => g.select('.domain').remove());

    yAxis
      .append('text')
      .text(yAxisLabel)
      .attr('fill', '#333')
      .attr('text-anchor', 'end')
      .style('font-weight', 'bold')
      .attr('transform', `translate(${30}, -10)`);

    // highlightRange
    highlightRanges.forEach((hr, i) => {
      chartCore
        .append('rect')
        .attr('x', d3__namespace.min([xScale(parseDate(hr[0]), xScale(parseDate(hr[1])))]))
        .attr('y', 0)
        .attr('height', coreChartHeight)
        .attr(
          'width',
          Math.abs(xScale(parseDate(hr[1])) - xScale(parseDate(hr[0]))),
        )
        .attr('fill', highlightRangeColors[i]);
      // .attr('opacity', 0.2)
    });

    const lineForField = field => {
      return (
        d3__namespace
          .line()
          // .curve(d3.curveBasis)
          .defined(d => !Number.isNaN(d[field]))
          .x(d => xScale(d[xField]))
          .y(d => yScale(d[field]))
      )
    };

    const areaForBand = ([bandMin, bandMax]) => {
      return (
        d3__namespace
          .area()
          // .curve(d3.curveBasis)
          .defined(d => !Number.isNaN(d[bandMin]) && !Number.isNaN(d[bandMax]))
          .x(d => xScale(d[xField]))
          .y0(d => yScale(d[bandMin]))
          .y1(d => yScale(d[bandMax]))
      )
    };

    yFields.forEach((yf, i) => {
      if (yf.band) {
        chartCore
          .append('path')
          .datum(dataParsed)
          .attr('fill', yColors[i].band)
          .attr('d', areaForBand(yf.band));
      }
    });
    yFields.forEach((yf, i) => {
      if (yf.circle) {
        chartCore
          .append('g')
          .attr('class', `scatter-container-${i}`)
          .selectAll('circle')
          .data(dataScatterParsed.filter(d => !Number.isNaN(d[yf.circle])))
          .join('circle')
          .attr('cx', d => xScale(d[xField]))
          .attr('cy', d => yScale(d[yf.circle]))
          .attr('r', scatterCircleRadius)
          .attr('fill', yColors[i].circle)
          .on('mouseover', function (e, d) {
            tooltipDiv.transition().duration(200).style('opacity', 1);
            tooltipDiv.html(`${xField}: ${formatDate(d[xField])}
            <br/> ${yf.circle}: ${yValueFormatter(d[yf.circle])}
            `);

            tooltipDiv
              .style('left', `${e.clientX}px`)
              .style('top', `${e.clientY + 20 + window.scrollY}px`);
          })
          .on('mouseout', function (e, d) {
            tooltipDiv
              .style('left', '-300px')
              .transition()
              .duration(500)
              .style('opacity', 0);
          });
      }
    });
    yFields.forEach((yf, i) => {
      if (yf.line) {
        chartCore
          .append('path')
          .datum(dataParsed)
          .attr('fill', 'none')
          .attr('stroke', yColors[i].line)
          .attr('stroke-width', 2.5)
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('d', lineForField(yf.line));

        const filteredData = dataParsed.filter(d => !Number.isNaN(d[yf.line]));
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
            const lineValue = d[yf.line];

            tooltipDiv.transition().duration(200).style('opacity', 1);

            // If line is not linked to band, show only line values
            if (yf.band) {
              const [bandMinValue, bandMaxValue] = [d[yf.band[0]], d[yf.band[1]]];
              tooltipDiv.html(`<span style="font-weight: bold">${formatDate(
              d[xField],
            )}</span>
            <br/> ${yf.line}: ${yValueFormatter(lineValue)}
            <br/> ${yf.band[0]}: ${yValueFormatter(bandMinValue)}
            <br/> ${yf.band[1]}: ${yValueFormatter(bandMaxValue)}`);
            } else {
              tooltipDiv.html(`<span style="font-weight: bold">${formatDate(
              d[xField],
            )}</span>
            <br/> ${yf.line}: ${yValueFormatter(lineValue)}`);
            }

            tooltipDiv
              .style('left', `${e.clientX}px`)
              .style('top', `${e.clientY + 20 + window.scrollY}px`);
          })
          .on('mouseout', function () {
            tooltipDiv
              .style('left', '-300px')
              .transition()
              .duration(500)
              .style('opacity', 0);
          });
      }
    });
    // x axis
    const xAxis = chartCore
      .append('g')
      .attr('id', 'x-axis')
      .attr('transform', `translate(0, ${coreChartHeight})`);

    xAxis.call(d3__namespace.axisBottom(xScale).tickFormat(formatDate)).call(g => {
      g.selectAll('.domain').attr('stroke', '#333');
      g.selectAll('.tick line').attr('stroke', '#333');
      g.selectAll('.tick text').attr('fill', '#333');
    });

    xAxis
      .append('text')
      .text(xAxisLabel)
      .attr('fill', '#333')
      .attr('font-weight', 'bold')
      .attr('transform', `translate(${coreChartWidth / 2}, 30)`)
      .attr('text-anchor', 'middle');

    const lineBandsWithColors = [];
    yFields.forEach((yf, i) => {
      const k = {};
      k.type = '';
      if (yf.line) {
        k.line = { label: yf.line, color: yColors[i].line };
        k.type += 'line';
      }
      if (yf.band) {
        k.band = {
          label: `${yf.band[0]}-${yf.band[1]}`,
          color: yColors[i].band,
        };
        k.type += 'band';
      }
      if (yf.circle && dataScatter.length) {
        k.circle = { label: yf.circle, color: yColors[i].circle };
        k.type = 'circle';
      }
      if (k.type) {
        lineBandsWithColors.push(k);
      }
    });

    widgetsRight
      .append('div')
      .html(lineBandLegend({ lineBandColorScale: lineBandsWithColors }));

    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
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
  //
  //
  //
  //
  //
  //
  //

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

  function validateBandFields({ bandDimensions }) {
    const result = { valid: true, message: '', invalidBands: [] };

    ___default["default"].each(bandDimensions, (val, key) => {
      if (!(___default["default"].isArray(val) && val.length === 2)) {
        result.valid = false;
        result.invalidBands.push(`{${key}: ${val}}`);
      }
    });

    if (!result.valid) {
      result.message = `These band dimensions should have exactly two values (lower bound and upper bound): ${result.invalidBands.join(
      ', ',
    )}`;
    }

    return result
  }

  // Note about missing validations:
  // 1. yFields are not validated for types(shoulBe*) (only existense as a column in data is checked)
  //    because our shouldNotBeBlank and shouldBeNumber validations don't support gaps in data
  // 2. options.yColors doesn't have a validation, it has a structure similar to yFields
  // 3. options.highlightRanges doesn't have a validation yet

  const optionTypes$e = {
    aspectRatio: checkNumberBetween(0.01, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    // xAxisLabel: xField,
    // yAxisLabel: '',

    // Don't have a validation for this right now.
    // yColors,

    scatterCircleRadius: checkNumber,

    // array of arrays with two numbers each
    // highlightRanges: [],
    highlightRangeColors: checkColorArray(),
  };

  const validateAndRender$f = ({
    dataPaths,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$e, options });
    const yFieldsDimensionTypes = {};
    const yFieldDimensions = {};

    const yFieldBandDimensions = {};

    dimensions.yFields.forEach((yf, i) => {
      if (yf.line) {
        // yFieldsDimensionTypes[`__yField${i}_line__`] = [shouldNotBeBlank]
        yFieldDimensions[`__yField${i}_line__`] = yf.line;
      }
      if (yf.band) {
        // yFieldsDimensionTypes[`__yField${i}_band__`] = [shouldNotBeBlank]
        yFieldDimensions[`__yField${i}_band__`] = yf.band;
        yFieldBandDimensions[`__yField${i}_band__`] = yf.band;
      }
      if (yf.circle) {
        yFieldDimensions[`__yField${i}_circle__`] = yf.circle;
      }
    });

    const yFieldBandValidation = validateBandFields({
      bandDimensions: yFieldBandDimensions,
    });

    const dimensionTypes = {
      xField: [shouldNotBeBlank],
      // 👇🏽 is currently empty
      ...yFieldsDimensionTypes,
    };

    const flatDimensions = {
      xField: dimensions.xField,
      ...yFieldDimensions,
    };

    const dataFetchPromises = [];
    dataPaths.forEach(dataPath => {
      dataFetchPromises.push(d3__namespace.csv(dataPath));
    });

    Promise.all(dataFetchPromises).then(([data, dataScatter]) => {
      const { columns } = data;
      const { columns: scatterColumns } = dataScatter;
      const dimensionValidation = validateColumnsWithDimensions({
        columns: [...columns, ...scatterColumns],
        dimensions: flatDimensions,
      });

      const dataValidations = validateData({
        data,
        dimensionTypes,
        dimensions: flatDimensions,
      });

      const allValidations = [
        dimensionValidation,
        optionsValidationResult,
        yFieldBandValidation,
        dataValidations,
      ];

      const combinedValidation = { valid: true, messages: [] };

      allValidations.forEach(v => {
        combinedValidation.valid = combinedValidation.valid && v.valid;
        if (!v.valid) {
          combinedValidation.messages.push(v.message);
        }
      });

      combinedValidation.valid
        ? renderChart$f({
            data,
            dataScatter,
            dimensions,
            options,
            chartContainerSelector,
          })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* global window */

  function renderChart$e({
    data,
    dimensions: {
      xGridField,
      yGridField,
      xField,
      nameField,
      yFields,
      uniqueColumnField,
    },
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

      colorLegendWidth,
      colorLegendHeight,
    },
    chartContainerSelector,
  }) {
    d3__namespace.select('body').append('style').html(`
  .filtering g:not(.g-active) > rect {
    opacity: 0.2;
  }
  .cldr-color-legend.filtering-legend rect:not(.active) {
    opacity: 0.2;
  } 
  rect.rect-hovered {
    stroke: #333;
  }

  .cldr-color-legend rect:not(.active) {
    opacity: 0.2;
  }  

.g-stack:not(.g-active) {
    opacity: 0.2;

}

  `);

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

    const tooltipDiv = initializeTooltip();

    const { maxY, stackedDataByYear, names } = parseData$8({
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
      colorScaleReverseMap,
    } = setupScales$9({
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

    renderLegends$3({
      widgetsRight,
      colorScaleForLegend,
      svg,
      colorScaleReverseMap,
      colorLegendHeight,
      colorLegendWidth,
    });

    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

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

  function parseData$8({ data, yFields, nameField, xGridField, yGridField }) {
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

  function setupScales$9({
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

    const colorScaleReverseMap = {};
    yFields.forEach((yf, i) => {
      colorScaleReverseMap[yFieldLabels[i]] = yf;
    });

    return {
      yScale,
      xScale,
      colorScale,
      colorScaleForLegend,
      colorScaleReverseMap,
      xGridScale,
      yGridScale,
    }
  }

  function renderLegends$3({
    widgetsRight,
    colorScaleForLegend,
    svg,
    colorScaleReverseMap,
    colorLegendWidth,
    colorLegendHeight,
  }) {
    widgetsRight.append(() =>
      legend({
        color: colorScaleForLegend,
        width: colorLegendWidth,
        height: colorLegendHeight,
        tickSize: 0,
        classNames: 'cldr-color-legend',
        // handleMouseover: (e, d) => {
        //   svg
        //     .selectAll(`.g-stack-${colorScaleReverseMap[d]}`)
        //     .classed('g-active', true)
        //   svg.classed('filtering', true)

        //   d3.select('.cldr-color-legend').classed('filtering-legend', true)
        //   d3.select(e.target).classed('active', true)
        // },
        // handleMouseout: (e, d) => {
        //   svg
        //     .selectAll(`.g-stack-${colorScaleReverseMap[d]}`)
        //     .classed('g-active', false)
        //   svg.classed('filtering', false)

        //   d3.select('.cldr-color-legend').classed('filtering-legend', false)
        //   d3.select(e.target).classed('active', false)
        // },
        handleClick: (e, d) => {
          const clickState = d3__namespace.select(e.target).classed('active');
          d3__namespace.select(e.target).classed('active', !clickState);
          svg
            .selectAll(`.g-stack-${colorScaleReverseMap[d]}`)
            .classed('g-active', !clickState);
        },
        cursorPointer: true,
      }),
    );

    // Make all stacks active in the start
    d3__namespace.selectAll('.cldr-color-legend g rect').classed('active', true);
    d3__namespace.selectAll('.g-stack').classed('g-active', true);
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
          .attr('class', dd => `g-stack g-stack-${dd.key}`)
          .attr('fill', dd => colorScale(dd.key)) // not to be confused with uniqueColumnField
          // d3.stack uses yFields as keys, so key here is to identify parts of the stack
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

  const dimensionTypes$d = {
    xGridField: [shouldNotBeBlank],
    yGridField: [shouldNotBeBlank],
    xField: [shouldNotBeBlank],
    nameField: [shouldNotBeBlank],
    uniqueColumnField: [shouldBeUnique], // identifies each column uniquely
    // yFieldsDimensionTypes will be added dynamically
  };

  const optionTypes$d = {
    aspectRatio: checkNumberBetween(0.01, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    descending: checkBoolean,
    // colorLegendTitle: checkString,

    stackHeight: checkNumberBetween(0, 1),

    xGridGap: checkNumberBetween(0, 1),

    // uniqueFieldTimeParser: checkString,
    // uniqueFieldTimeFormatter: checkString,
    // yFieldLabels: to be added dynamically

    colorLegendWidth: checkNumber,
    colorLegendHeight: checkNumber,
  };

  function buildDimensionAndTypes$2({ dimensions, dimensionTypes, optionTypes }) {
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

  const validateAndRender$e = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;

      const { flatDimensions, dimensionTypesWYFields, optionTypesWYFields } =
        buildDimensionAndTypes$2({
          dimensions,
          dimensionTypes: dimensionTypes$d,
          optionTypes: optionTypes$d,
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
        ? renderChart$e({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* global window */

  function renderChart$d({
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

    applyInteractionStyles$8({ inactiveOpacity });

    const xValueFormatter = val => formatNumber(val, xValueFormat);
    const yValueFormatter = val => formatNumber(val, yValueFormat);
    const sizeValueFormatter = val => formatNumber(val, sizeValueFormat);

    const coreChartWidth = 1000;
    const { svg, coreChartHeight, allComponents, chartCore, widgetsLeft } =
      setupChartArea$5({
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

    const { dataParsed, dataAt, timeDomain, timeDomainLength } = parseData$7({
      data,
      xField,
      yField,
      sizeField,
      timeField,
    });

    const { sizeScale, xScale, yScale, colorScale } = setupScales$8({
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
      setupWidgets$1({
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
    const circles = renderCircles$1({
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

    activateMotionWidget$1({
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

    setupSearch$7({
      widgetsLeft,
      nameField,
      searchButtonClassNames,
      circles,
      sizeField,
    });

    renderXAxis$7({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      xScale,
      xAxisLabel,
    });

    renderYAxis$6({
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

  function setupWidgets$1({
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

  function renderCircles$1({
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

  function activateMotionWidget$1({
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

  function setupSearch$7({
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

  function applyInteractionStyles$8({ inactiveOpacity }) {
    d3__namespace.select('body').append('style').html(`
  .group-circles.searching > .iv-circle:not(.s-match) {
    opacity: ${inactiveOpacity};
  }
  .group-circles.searching > .iv-circle.s-match {
    stroke: #333;
  }
  `);
  }

  function parseData$7({ data, xField, yField, sizeField, timeField }) {
    const dataParsed = data.map(d => ({
      ...d,
      [sizeField]: Number.parseFloat(d[sizeField]),
      [xField]: Number.parseFloat(d[xField]),
      [yField]: Number.parseFloat(d[yField]),
    }));

    const dataAt = loc => {
      return dataParsed.filter(d => d[timeField] === loc)
    };
    const timeDomain = ___default["default"].uniq(___default["default"].map(data, timeField)).sort();
    const timeDomainLength = timeDomain.length;

    return { dataParsed, dataAt, timeDomain, timeDomainLength }
  }

  function setupScales$8({
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

  function renderXAxis$7({
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

  function renderYAxis$6({
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

  const dimensionTypes$c = {
    sizeField: [], // can be empty (if not provided first value in sizeRange will be picked)
    xField: [shouldNotBeBlank, shouldBeNumber],
    yField: [shouldNotBeBlank, shouldBeNumber],
    timeField: [shouldNotBeBlank],
    nameField: [shouldNotBeBlank],
    colorField: [], // can be empty (if not provided, first color from scheme will be picked)
  };

  const optionTypes$c = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    sizeRange: checkNumericArray(2),
    xDomainCustom: checkNumericArray(2),
    yDomainCustom: checkNumericArray(2),

    inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
    numberOfColors: checkNumberBetween(3, 9), // minumum: 3, maximum: 9

    // xAxisLabel: xField,
    // yAxisLabel: yField,

    // startButtonClassNames: '',
    // stopButtonClassNames: '',
    // searchButtonClassNames: '',
  };

  const validateAndRender$d = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$c, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;
      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$c, dimensions });

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
        ? renderChart$d({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* global window */

  function renderChart$c({
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

    applyInteractionStyles$7({ inactiveOpacity });

    const xValueFormatter = val => formatNumber(val, xValueFormat);
    const yValueFormatter = val => formatNumber(val, yValueFormat);
    const sizeValueFormatter = val => formatNumber(val, sizeValueFormat);

    const coreChartWidth = 1000;
    const { svg, coreChartHeight, allComponents, chartCore, widgetsLeft } =
      setupChartArea$5({
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

    const { dataParsed, dataAt, timeDomain, timeDomainLength } = parseData$6({
      data,
      xField,
      yField,
      sizeField,
      timeField,
    });

    const { sizeScale, xScale, yScale, colorScale } = setupScales$7({
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
      dataParsed,
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

    const updateBubbles = timePos => {
      circles.classed('bubble-current', d => d[timeField] === timePos);

      chartCore.selectAll('.bubble-current').raise();
      chartCore.selectAll('.s-match').raise();
    };

    updateBubbles(timeDomain[0]);

    activateMotionWidget({
      rangeSlider,
      timeDomainLength,
      timeDomain,
      rangeSliderValue,
      dataAt,
      updateCircles,
      updateBubbles,
      startButton,
      stopButton,
      intervalId,
      motionDelay,
    });

    setupSearch$6({
      widgetsLeft,
      nameField,
      searchButtonClassNames,
      circles,
      sizeField,
      chartCore,
    });

    renderXAxis$6({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      xScale,
      xAxisLabel,
    });

    renderYAxis$5({
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
    dataParsed,
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
      .data(dataParsed)
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
    updateBubbles,
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
        updateBubbles(timeDomain[posInArr]);
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
        updateBubbles(timeDomain[0]);
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
        updateBubbles(timeDomain[posInArr]);
      }, motionDelay);
    });

    stopButton.on('click', () => {
      stopButton.node().disabled = true;
      startButton.node().disabled = false;
      window.clearInterval(intervalId);
    });
  }

  function setupSearch$6({
    widgetsLeft,
    nameField,
    searchButtonClassNames,
    circles,
    sizeField,
    chartCore,
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

        chartCore.selectAll('.bubble-current').raise();
      }
    }

    search.on('keyup', e => {
      searchBy(e.target.value.trim());
    });
  }

  function applyInteractionStyles$7({ inactiveOpacity }) {
    d3__namespace.select('body').append('style').html(`
  .group-circles.searching > .iv-circle:not(.s-match) {
    fill-opacity: ${inactiveOpacity};
    stroke-opacity: ${inactiveOpacity};
  }
  

  .group-circles > :not(.bubble-current) {
    fill-opacity: ${inactiveOpacity};
    stroke-opacity: ${inactiveOpacity};
  }

  .group-circles.searching > .iv-circle.s-match {
    stroke: #333;
    stroke-opacity: 1;
    stroke-width: 2;
  }
  
  
  `);
  }

  function parseData$6({ data, xField, yField, sizeField, timeField }) {
    const dataParsed = data.map(d => ({
      ...d,
      [sizeField]: Number.parseFloat(d[sizeField]),
      [xField]: Number.parseFloat(d[xField]),
      [yField]: Number.parseFloat(d[yField]),
    }));

    const dataAt = loc => {
      return dataParsed.filter(d => d[timeField] === loc)
    };
    const timeDomain = ___default["default"].uniq(___default["default"].map(data, timeField)).sort();
    const timeDomainLength = timeDomain.length;

    return { dataParsed, dataAt, timeDomain, timeDomainLength }
  }

  function setupScales$7({
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

  function renderXAxis$6({
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

  function renderYAxis$5({
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

  const dimensionTypes$b = {
    sizeField: [], // can be empty (if not provided first value in sizeRange will be picked)
    xField: [shouldNotBeBlank, shouldBeNumber],
    yField: [shouldNotBeBlank, shouldBeNumber],
    timeField: [shouldNotBeBlank],
    nameField: [shouldNotBeBlank],
    colorField: [], // can be empty (if not provided, first color from scheme will be picked)
  };

  const optionTypes$b = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    sizeRange: checkNumericArray(2),
    xDomainCustom: checkNumericArray(2),
    yDomainCustom: checkNumericArray(2),

    inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
    numberOfColors: checkNumberBetween(3, 9), // minumum: 3, maximum: 9

    // xAxisLabel: xField,
    // yAxisLabel: yField,

    // startButtonClassNames: '',
    // stopButtonClassNames: '',
    // searchButtonClassNames: '',
  };

  const validateAndRender$c = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$b, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;
      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$b, dimensions });

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
        ? renderChart$c({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* global window */

  function renderChart$b({
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
      sizeScaleType = 'linear',
      sizeScaleLogBase = 10,
      dominoHeight = 0.3,
      yPaddingOuter = 0.1,

      defaultState = [],

      activeOpacity = 1,
      inactiveOpacity = 0.1,

      searchInputClassNames = '',
      goToInitialStateButtonClassNames = '',
      clearAllButtonClassNames = '',
      showAllButtonClassNames = '',
    },
    dimensions: { xField, yField, dominoField, sizeField, colorField },

    chartContainerSelector,
  }) {
    applyInteractionStyles$6({ inactiveOpacity, activeOpacity });

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

    const tooltipDiv = initializeTooltip$3();

    const { allDominoFieldValues, defaultStateAll } = parseData$5({
      data,
      dominoField,
      defaultState,
    });

    const { xScale, yScale, colorScale, sizeScale, yDomain } = setupScales$6({
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

    renderXAxis$5({
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

    renderYAxis$4({
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

    const handleSearch = searchEventHandler$5(allDominoFieldValues);
    const search = setupSearch$5({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      dominoField,
      svg,
      chartContainerSelector,
      allDominoFieldValues,
    });

    setupInitialStateButton$4({
      widgetsLeft,
      goToInitialStateButtonClassNames,
      defaultStateAll,
      search,
      handleSearch,
      svg,
    });
    setupClearAllButton$5({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
      svg,
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

    setupShowAllButton$5({
      widgetsLeft,
      showAllButtonClassNames,
      search,
      handleSearch,
      svg,
    });

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function applyInteractionStyles$6({ inactiveOpacity, activeOpacity }) {
    d3__namespace.select('body').append('style').html(`
     .ribbon {
       cursor: pointer;
     }
     .g-ribbons .ribbon {
        fill-opacity: ${inactiveOpacity};
      }
      .g-dominos .domino {
        fill-opacity: ${inactiveOpacity};
      }
      .g-ribbons .ribbon.ribbon-active {
        fill-opacity: ${activeOpacity};
      }
      .g-dominos .domino.domino-active {
        fill-opacity: ${activeOpacity};
        stroke: #333;
        stroke-width: 2;
      }
      .g-ribbons.searching .ribbon.ribbon-matched {
        stroke: #333;
        stroke-width: 1;
      }
      .g-dominos.searching .domino.domino-matched {
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

  function parseData$5({ data, dominoField, defaultState }) {
    const allDominoFieldValues = ___default["default"].chain(data).map(dominoField).uniq().value();
    const dominoValues = ___default["default"](data).map(dominoField).uniq().value();
    const defaultStateAll = defaultState === 'All' ? dominoValues : defaultState;
    return { allDominoFieldValues, defaultStateAll }
  }

  function setupScales$6({
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

  function renderYAxis$4({
    chartCore,
    xScale,
    yScale,
    formatDate,
    yAxisDateParser,
    yAxisDateFormatter,
  }) {
    chartCore
      .append('g')
      .attr('class', 'y-axis-right')
      .attr('transform', `translate(${xScale(xScale.domain()[1]) + 20}, 0)`)
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

  function renderXAxis$5({
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
    const xAxisOffset = 30;
    chartCore
      .append('g')
      .attr('class', 'x-axis-top')
      .attr('transform', `translate(0, ${yScale(yDomain[0]) - xAxisOffset})`)
      .call(
        d3__namespace
          .axisTop(xScale)
          .tickSize(-coreChartHeight - xAxisOffset)
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
      domino
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
        d3__namespace.rgb(colorScale(Number.parseFloat(d[colorField]))).darker(0.2),
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
        d3__namespace.select(`.ribbon-${dominoGroupCode}`)
          .classed('ribbon-active', !clickedState)
          .raise();
        d3__namespace.selectAll(`.domino-${dominoGroupCode}`)
          .classed('domino-active', !clickedState)
          .raise();
      });

    d3__namespace.selectAll('.domino-active').raise();

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

  const searchEventHandler$5 = referenceList => (qstr, svg) => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        const dominoGroupCode = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          svg.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-matched', true);
          svg
            .selectAll(`.domino-${dominoGroupCode}`)
            .classed('domino-matched', true);

          svg.select('.g-ribbons').classed('searching', true);
          svg.select('.g-dominos').classed('searching', true);
        } else {
          svg
            .select(`.ribbon-${dominoGroupCode}`)
            .classed('ribbon-matched', false);
          svg
            .selectAll(`.domino-${dominoGroupCode}`)
            .classed('domino-matched', false);
        }
      });
    } else {
      referenceList.forEach(val => {
        const dominoGroupCode = toClassText(val);
        svg.select(`.ribbon-${dominoGroupCode}`).classed('ribbon-matched', false);

        svg
          .selectAll(`.domino-${dominoGroupCode}`)
          .classed('domino-matched', false);
      });
      svg.select('.g-ribbons').classed('searching', false);
      svg.select('.g-dominos').classed('searching', false);
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

  function setupSearch$5({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    dominoField,
    svg,
    chartContainerSelector,
    allDominoFieldValues,
  }) {

    widgetsLeft
        .append('datalist')
        .attr('role', 'datalist')
        // Assuming that chartContainerSelector will always start with #
        // i.e. it's always an id selector of the from #id-to-identify-search
        // TODO add validation
        .attr('id', `${chartContainerSelector.slice(1)}-search-list`)
        .html(
          ___default["default"](allDominoFieldValues)
            .uniq()
            .map(el => `<option>${el}</option>`)
            .join(''),
        );

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);

    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`);

    search.attr('placeholder', `Find by ${dominoField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr, svg);
    });
    return search
  }

  function setupInitialStateButton$4({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
    svg,
  }) {
    const goToInitialState = widgetsLeft
      .append('button')
      .text('Go to Initial State')
      .attr('class', goToInitialStateButtonClassNames);
    goToInitialState.on('click', () => {
      svg.selectAll('.ribbon').classed('ribbon-active', false);
      svg.selectAll('.domino').classed('domino-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        svg
          .select(`.ribbon-${toClassText(val)}`)
          .classed('ribbon-active', true)
          .raise();
        svg
          .selectAll(`.domino-${toClassText(val)}`)
          .classed('domino-active', true)
          .raise();
      });
      search.node().value = '';
      handleSearch('', svg);
    });
  }

  function setupClearAllButton$5({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
    svg,
  }) {
    const clearAll = widgetsLeft
      .append('button')
      .text('Clear All')
      .attr('class', clearAllButtonClassNames);
    clearAll.on('click', () => {
      svg.selectAll('.ribbon').classed('ribbon-active', false);
      svg.selectAll('.domino').classed('domino-active', false);
      search.node().value = '';
      handleSearch('', svg);
    });
  }

  function setupShowAllButton$5({
    widgetsLeft,
    showAllButtonClassNames,
    search,
    handleSearch,
    svg,
  }) {
    const showAll = widgetsLeft
      .append('button')
      .text('Show All')
      .attr('class', showAllButtonClassNames);
    showAll.classed('hidden', false);
    showAll.on('click', () => {
      svg.selectAll('.ribbon').classed('ribbon-active', true);
      svg.selectAll('.domino').classed('domino-active', true);
      search.node().value = '';
      handleSearch('', svg);
    });
  }

  const dimensionTypes$a = {
    xField: [shouldBeNumber],
    yField: [shouldNotBeBlank],
    dominoField: [shouldNotBeBlank],
    sizeField: [shouldBeNumber],
    colorField: [shouldBeNumber],
  };

  const optionTypes$a = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    xDomain: checkNumericArray(2),
    // xAxisLabel: checkString,
    xAxisLabelOffset: checkNumber,
    // xAxisValueFormatter:  checkString, //'',
    dominoHeight: checkNumberBetween(0, 1),
    // yAxisDateParser: checkString, // '%Y-Q%q',
    // yAxisDateFormatter: checkString, // "Q%q'%y", // Date formatter options: https://github.com/d3/d3-time-format

    sizeScaleType: checkOneOf(['log', 'linear']), // default is scaleLinear if not provided. Can be changed to scaleLog
    sizeRange: checkNumericArray(2),
    // sizeLegendLabel: checkString,
    sizeLegendValues: checkNumericArray(),
    sizeLegendGapInSymbols: checkNumber,
    sizeLegendMoveSymbolsDownBy: checkNumber,
    // sizeLegendValueFormatter:  checkString, // '',

    colorDomain: checkNumericArray(2),
    // colorLegendValueFormatter: checkString, // ,'.2s',
    // colorLegendLabel: checkString,
    colorRange: checkColorArray(),

    initialState: checkDefaultState,

    activeOpacity: checkNumberBetween(0, 1),
    inactiveOpacity: checkNumberBetween(0, 1),
  };

  const validateAndRender$b = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$a, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;

      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$a, dimensions });

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
        ? renderChart$b({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  function dashedLegend({
    labels,
    color,
    swatchSize = 20,
    swatchWidth = 2.5,
    swatchHeight = swatchSize,
    marginLeft = 0,
    uid,
    customClass = '',
    lineOpacity = 1,
  }) {
    const id = `dl-${uid}`;
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
        opacity: ${lineOpacity};
      }
    </style>
      ${labels
        .map(
          l =>
            `<span class="${id} ${customClass}" style="--color: ${color(
              l.series,
            )}" >${l.label}</span>`,
        )
        .join('')}

    </div>
  `;
    return mu
  }

  /* global window */

  function renderChart$a({
    data,
    dimensions: { groupField, xField, yField, seriesField },
    options: {
      aspectRatio = 1,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      alternatingTickLabelsXAxis = true,

      xAxisLabel = xField,
      yAxisLabel = yField,

      verticalLines = [],
      verticalDashedLineLabels = [],

      colorScheme = d3__namespace.schemeSpectral[8],

      areaOpacity = 0.5,

      yAxisTickSizeOffset = 30,
      yAxisTicksFontSize = '12px',
      yAxisPosition = 'left',
      yAxisGridLines = false,
      yAxisLabelHorizontalOffset = 10,

      xAxisTicksFontSize = '12px',
      xAxisPosition = 'bottom',
      xAxisTickSizeOffset = 10,
      xAxisGridLines = false,
    },
    chartContainerSelector,
  }) {
    const coreChartWidth = 1200;
    const { svg, coreChartHeight, allComponents, chartCore, widgetsRight } =
      setupChartArea$5({
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

    const defaultGroupFieldName = '_defaultGroup_';
    groupField = groupField == null ? defaultGroupFieldName : groupField;
    const { dataParsed, seriesValues } = parseData$4({
      data,
      yField,
      defaultGroupFieldName,
      seriesField,
    });

    const {
      yGridScale,
      xScale,
      yScale,
      colorScale,
      yGridDomain,
      xDomain,
      yDomain,
    } = setupScales$5({
      dataParsed,
      groupField,
      coreChartHeight,
      yField,
      xField,
      coreChartWidth,
      colorScheme,
      seriesValues,
    });

    const area = d3__namespace
      .area()
      .x(d => xScale(d[xField]))
      .y1(d => yScale(d[yField]))
      .y0(() => yScale(d3__namespace.min(yDomain)));

    chartCore
      .selectAll('g.grid-row')
      .data(yGridDomain)
      .join('g')
      .attr('class', 'grid-row')
      .attr('data-group', d => d)
      .attr('transform', d => `translate(0, ${yGridScale(d)})`)

      .each(function (d, i) {
        let ctx = this;
        renderXAxis$4({
          ctx,
          i,
          xScale,
          yGridScale,
          alternatingTickLabelsXAxis,
          xAxisTicksFontSize,
          xAxisPosition,
          xAxisTickSizeOffset,
          xAxisGridLines,
        });

        renderYAxis$3({
          ctx,
          yScale,
          yAxisPosition,
          coreChartWidth,
          yAxisTickSizeOffset,
          yAxisTicksFontSize,
          yAxisGridLines,
        });

        // Group label
        d3__namespace.select(this)
          .append('text')
          .attr('transform', `translate(-10, ${yGridScale.bandwidth()})`)
          .text(d)
          .attr('text-anchor', 'end')
          .style('font-weight', 'bold')
          .attr('dominant-baseline', 'middle');

        d3__namespace.select(this)
          .selectAll('path.series')
          .data(seriesValues)
          .join('path')
          .attr('class', 'series')
          .attr('d', s =>
            area(
              dataParsed.filter(c => c[groupField] === d && c[seriesField] === s),
            ),
          )
          .attr('fill', s => colorScale(s))
          .attr('opacity', areaOpacity);
      })
      .each(function (d) {
        const filteredLines = verticalLines.filter(c => c.group === d);

        d3__namespace.select(this)
          .selectAll('path.vertical-line')
          .data(filteredLines)
          .join('path')
          .attr('class', 'vertical-line')
          .attr('d', s =>
            d3__namespace.line()([
              [xScale(s.x), yScale(d3__namespace.min(yDomain))],
              [xScale(s.x), yScale(d3__namespace.max(yDomain))],
            ]),
          )
          .attr('stroke-width', 3)
          .attr('stroke', s => colorScale(s.series))
          .attr('stroke-dasharray', '6 4');

        d3__namespace.select(this)
          .selectAll('circle')
          .data(dataParsed.filter(c => c[groupField] === d))
          .join('circle')
          .attr('cx', dp => xScale(dp[xField]))
          .attr('cy', dp => yScale(dp[yField]))
          .attr('r', 5)
          .attr('fill', dp => colorScale(dp[seriesField]))
          .attr('stroke', '#333')
          .attr('stroke-width', 1)
          .attr('opacity', 0)
          .attr(
            'class',
            dp => `${toClassText(dp[groupField])}-${toClassText(dp[xField])}`,
          );

        // Invisible Rects for tooltips
        d3__namespace.select(this)
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
            );

            tooltipDiv.transition().duration(200).style('opacity', 1);

            const values = dpf.map(dpfe => {
              d3__namespace.selectAll(
                `circle.${toClassText(dpfe[groupField])}-${toClassText(
                dpfe[xField],
              )}`,
              ).attr('opacity', 1);

              return `<div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${colorScale(
              dpfe[seriesField],
            )}"></div> ${dpfe[seriesField]}: ${dpfe[yField]}`
            });

            tooltipDiv.html(`${dpf[0][groupField]}
          <br/>
          ${values.join('<br/>')}`);

            tooltipDiv
              .style('left', `${e.clientX + 20}px`)
              .style('top', `${e.clientY - 20 + window.scrollY}px`);
          })
          .on('mousemove', e => {
            tooltipDiv
              .style('left', `${e.clientX + 20}px`)
              .style('top', `${e.clientY - 20 + window.scrollY}px`);
          })
          .on('mouseout', (e, xd) => {
            const dpf = dataParsed.filter(
              c => c[groupField] === d && c[xField] === xd,
            );
            dpf.forEach(dpfe =>
              d3__namespace
                .selectAll(
                  `circle.${toClassText(dpfe[groupField])}-${toClassText(
                  dpfe[xField],
                )}`,
                )
                .attr('opacity', 0),
            );

            tooltipDiv
              .style('left', '-300px')
              .transition()
              .duration(500)
              .style('opacity', 0);
          });
      });

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
      .style('font-weight', 'bold');

    // y-axis label
    chartCore
      .append('g')
      .attr('class', 'y-axis-label')
      .attr(
        'transform',
        `translate(${
        coreChartWidth + yAxisTickSizeOffset + yAxisLabelHorizontalOffset
      }, -20)`,
      )
      .append('text')
      .text(yAxisLabel)
      .attr('text-anchor', 'end')
      .style('font-weight', 'bold');

    widgetsRight
      .append('div')
      .html(dashedLegend({ labels: verticalDashedLineLabels, color: colorScale }));

    widgetsRight.append('div').html(
      swatches({
        color: colorScale,
        uid: 'rs',
        customClass: 'font-nunito font-bold',
      }),
    );

    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function parseData$4({ data, yField, defaultGroupFieldName, seriesField }) {
    const dataParsed = data.map(el => {
      const elParsed = { ...el };
      elParsed[yField] = Number.parseFloat(el[yField]);
      elParsed[defaultGroupFieldName] = 'defaultGroup';
      return elParsed
    });

    const seriesValues = ___default["default"](dataParsed).map(seriesField).uniq().value();

    return { dataParsed, seriesValues }
  }

  function setupScales$5({
    dataParsed,
    groupField,
    coreChartHeight,
    yField,
    xField,
    coreChartWidth,
    colorScheme,
    seriesValues,
  }) {
    const yGridDomain = ___default["default"](dataParsed).map(groupField).uniq().value();

    const yGridScale = d3__namespace
      .scaleBand()
      .range([coreChartHeight, 0])
      .domain(yGridDomain)
      .paddingInner(0.15);

    const yDomain = d3__namespace.extent(___default["default"](dataParsed).map(yField));
    // console.log({ yDomain })
    const yScale = d3__namespace
      .scaleLinear()
      .range([yGridScale.bandwidth(), 0])
      .domain(yDomain)
      .nice();

    const xDomain = ___default["default"](dataParsed)
      .map(xField)
      .uniq()
      .value()
      // TODO handle case when not numbers
      .sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b));

    const xScale = d3__namespace.scalePoint().range([0, coreChartWidth]).domain(xDomain);

    const colorScale = d3__namespace.scaleOrdinal().range(colorScheme).domain(seriesValues);

    return {
      yGridScale,
      xScale,
      yScale,
      colorScale,
      yGridDomain,
      xDomain,
      yDomain,
    }
  }

  function renderXAxis$4({
    ctx,
    i,
    xScale,
    yGridScale,
    alternatingTickLabelsXAxis,
    xAxisTicksFontSize,
    xAxisPosition,
    xAxisTickSizeOffset,
    xAxisGridLines,
  }) {
    let xAxis, xAxisOffset;
    if (xAxisPosition === 'top') {
      xAxis = d3__namespace.axisTop(xScale);
      xAxisOffset = -xAxisTickSizeOffset;
    } else {
      xAxis = d3__namespace.axisBottom(xScale);
      xAxisOffset = yGridScale.bandwidth() + xAxisTickSizeOffset;
    }

    d3__namespace.select(ctx)
      .append('g')
      .attr('class', 'x-axis')
      .style('font-size', xAxisTicksFontSize)
      .attr('transform', `translate(0, ${xAxisOffset})`)
      .call(
        xAxisGridLines
          ? xAxis.tickSize(-yGridScale.bandwidth() - xAxisTickSizeOffset)
          : xAxis,
      )
      .call(g => {
        g.selectAll('.domain').attr('stroke', '#333');
        g.selectAll('.tick line').attr('stroke', '#333');
        g.selectAll('.tick text').attr('fill', '#333');
        g.selectAll('.tick line').attr('stroke-opacity', '0.2');
        g.select('.domain').remove();
        if (i % 2 !== 0 && alternatingTickLabelsXAxis) {
          g.selectAll('.tick text').remove();
        }
      });
  }

  function renderYAxis$3({
    ctx,
    yScale,
    yAxisPosition,
    coreChartWidth,
    yAxisTickSizeOffset,
    yAxisTicksFontSize,
    yAxisGridLines,
  }) {
    let yAxis, yAxisOffset;
    if (yAxisPosition === 'right') {
      yAxis = d3__namespace.axisRight(yScale);
      yAxisOffset = coreChartWidth + yAxisTickSizeOffset;
    } else {
      yAxis = d3__namespace.axisLeft(yScale);
      yAxisOffset = -yAxisTickSizeOffset;
    }

    d3__namespace.select(ctx)
      .append('g')
      .attr('class', 'y-axis')
      .style('font-size', yAxisTicksFontSize)
      .attr('transform', `translate(${yAxisOffset}, 0)`)
      .call(
        yAxisGridLines
          ? yAxis.tickSize(-coreChartWidth - yAxisTickSizeOffset)
          : yAxis,
      )
      .call(g => {
        g.selectAll('.tick line').attr('stroke-opacity', '0.2');
        g.selectAll('.tick text').attr('fill', '#333');
        g.select('.domain').remove();
      });
  }

  const dimensionTypes$9 = {
    groupField: [],
    xField: [shouldNotBeBlank],
    yField: [shouldNotBeBlank, shouldBeNumber],
    seriesField: [shouldNotBeBlank],
  };

  const optionTypes$9 = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    alternatingTickTextXAxis: checkBoolean,

    // xAxisLabel: xField,
    // yAxisLabel: yField,

    // verticalLines: [],
    // verticalDashedLineLabels: [],

    colorScheme: checkColorArray(),

    areaOpacity: checkNumberBetween(0, 1),

    yAxisTickSizeOffset: checkNumber,
  };

  const validateAndRender$a = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    // verticalLines = [{ x: '6', group: 'United Income', series: 'Pan' } ...]
    // x should exist, should be one of the values of xField column in data
    // group should exist, should be one of the values of groupField column in data
    // series should exist, should be one of the values of seriesField column in data

    // verticalDashedLineLabels = [ { series: 'Pan', label: 'Pan Avg' }]
    // can't have more than the number of unique series values than in the data
    // label can't be empty
    // each item should have a unique series value

    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$9, options });

    d3__namespace.csv(dataPath).then(data => {
      const { columns } = data;
      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions,
      });

      const dataValidations = validateData({ data, dimensionTypes: dimensionTypes$9, dimensions });

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
        ? renderChart$a({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };


  /* global window */

  function renderChart$9({
    data,
    dimensions: { valueField, fipsField },
    options: {
      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      valueFormat = '',

      interpolateScheme = d3__namespace.interpolateBlues,
      colorLegendTitle = valueField,
      nullDataColor = 'gray',
      nullDataMessage = 'Data not available',
      missingDataColor = 'gray',
      missingDataMessage = 'Data missing',

      searchButtonClassNames,

      searchInactiveOpacity = 0.3,
    },
    chartContainerSelector,
  }) {
    const valueFormatter = val => formatNumber(val, valueFormat);

    d3__namespace.select('body').append('style').html(`
  .group-counties.searching > .iv-county.s-match {
    stroke: #333;
    stroke-width: 2;
  }
  .hovered {
    stroke: #333;
    stroke-width: 2;
  }
  .searching > .iv-county:not(.s-match) {
    opacity: ${searchInactiveOpacity};
  }
  `);

    const coreChartHeight = 610;
    const coreChartWidth = 975;

    const { chartCore, widgetsLeft, widgetsRight } = setupChartArea$1({
      chartContainerSelector,
      coreChartWidth,
      coreChartHeight,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      bgColor,
    });

    const tooltipDiv = initializeTooltip$3();

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

    const allCountiesGroup = chartCore.append('g').attr('class', 'group-counties');
    const allCounties = allCountiesGroup
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
        const fillColor = found ? colorScale(found[valueField]) : missingDataColor;
        return fillColor ? fillColor : nullDataColor
      })
      .on('mouseover', function (e, d) {
        d3__namespace.select(this).classed('hovered', true).raise();
        tooltipDiv.transition().duration(200).style('opacity', 1);

        const fipsCode = d.id;

        const found = dataParsed.find(
          el =>
            Number.parseInt(el[fipsField], 10) === Number.parseInt(fipsCode, 10),
        );

        const countyInfo = d.properties;
        if (found && !isNaN(found[valueField])) {
          tooltipDiv.html(
            `${countyInfo.name}, ${countyInfo.state_name}
            <br/>
            ${valueField}: ${valueFormatter(found[valueField])}`,
          );
        } else if (found && !found[valueField]) {
          tooltipDiv.html(`${d.properties.name} <br/>${nullDataMessage}`);
        } else {
          tooltipDiv.html(
            `${countyInfo.name}, ${countyInfo.state_name}
            <br/> ${missingDataMessage}
            `,
          );
        }

        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', function () {
        d3__namespace.select(this).classed('hovered', false);
        // .lower()
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });

    allCountiesGroup
      .append('path')
      .datum(topojson__namespace.mesh(usStatesAndCountiesTopo, usStatesAndCountiesTopo.objects.states, (a, b) => a !== b))
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-linejoin', 'round')
      .attr('d', path);

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('placeholder', 'Find by county')
      .attr('class', searchButtonClassNames);

    function searchBy(term) {
      if (term) {
        chartCore.select('.group-counties').classed('searching', true);
        allCounties.classed(
          's-match',
          // should be boolean
          d => {
            return d.properties.name.toLowerCase().includes(term.toLowerCase())
          },
        );
        chartCore.selectAll('.s-match').raise();
      } else {
        d3__namespace.select('.group-counties').classed('searching', false);
        chartCore.selectAll('.iv-county').lower();
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
        tickFormat: valueFormatter,
      }),
    );
  }

  function setupChartArea$1({
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

  const dimensionTypes$8 = {
    valueField: [shouldBeNumber],
    fipsField: [shouldBeUnique, shouldNotBeBlank],
  };

  const optionTypes$8 = {
    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    // interpolateScheme = d3.interpolateBlues,
    // colorLegendTitle = valueField,

    nullDataColor: checkColor,
    missingDataColor: checkColor,

    searchInactiveOpacity: checkNumberBetween(0, 1),

    // searchButtonClassNames,
  };

  const validateAndRender$9 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$8, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      // Run validations
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
        ? renderChart$9({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  };

  /* global window */
  function renderChart$8({
    data,
    dimensions: { valueField, stateAbbrField },
    options: {
      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      valueFormat = '',

      interpolateScheme = d3__namespace.interpolateBlues,
      colorLegendTitle = valueField,
      nullDataColor = 'gray',
      nullDataMessage = 'Data Not Available',
      missingDataColor = 'gray',
      missingDataMessage = 'Data Missing',

      searchButtonClassNames = '',
      colorDomain: colorDomainCustom = [],

      searchDisabled = false,
    },
    chartContainerSelector,
  }) {
    d3__namespace.select('body').append('style').html(`
  .group-states.searching > .iv-state.s-match {
    stroke: #333;
  }
  .hovered {
    stroke: #333;
    stroke-width: 2;
  }
  `);

    const valueFormatter = val => formatNumber(val, valueFormat);

    // console.log(data)
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

    const tooltipDiv = initializeTooltip$3();
    const dataParsed = data.map(d => ({
      ...d,
      [valueField]: Number.parseFloat(d[valueField]),
      // [fipsField]: Number.parseInt(d[fipsField], 10),
    }));
    const dataObj = {};
    dataParsed.forEach(s => {
      dataObj[s[stateAbbrField]] = s;
    });

    const values = dataParsed.map(el => el[valueField]);
    const colorDomainDefault = d3__namespace.extent(values);
    const colorDomain = d3__namespace.extent([...colorDomainDefault, ...colorDomainCustom]);

    const colorScale = d3__namespace.scaleSequential(interpolateScheme).domain(colorDomain);

    const path = d3__namespace.geoPath();

    const allStatesGroup = chartCore.append('g').attr('class', 'group-states');

    const allStates = allStatesGroup
      .selectAll('path')
      .data(topojson__namespace.feature(usStatesAndCountiesTopo, usStatesAndCountiesTopo.objects.states).features)
      .join('path')
      .attr('d', path)
      .attr('id', d => `iv-state-${d.id}`)
      .attr('class', 'iv-state')
      .attr('stroke-width', 2)
      .attr('fill', d => {
        const stateAbbr = d.properties.abbr;
        const stateData = dataObj[stateAbbr];
        const fillColor = stateData
          ? colorScale(stateData[valueField])
          : missingDataColor;
        return fillColor ? fillColor : nullDataColor
      })
      .on('mouseover', function (e, d) {
        d3__namespace.select(this).classed('hovered', true).raise();
        tooltipDiv.transition().duration(200).style('opacity', 1);
        const stateData = dataObj[d.properties.abbr];
        if (stateData && !isNaN(stateData[valueField])) {
          tooltipDiv.html(`${d.properties.name}
          <br />
          ${valueField}: ${valueFormatter(stateData[valueField])}
          `);
        } else if (stateData && !stateData[valueField]) {
          tooltipDiv.html(`${d.properties.name} <br/>${nullDataMessage}`);
        } else {
          tooltipDiv.html(`${d.properties.name} <br/>${missingDataMessage}`);
        }

        d3__namespace.select(this).classed('hovered', true).raise();
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', function () {
        d3__namespace.select(this).classed('hovered', false).lower();
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });

    allStatesGroup
      .append('path')
      .datum(topojson__namespace.mesh(usStatesAndCountiesTopo, usStatesAndCountiesTopo.objects.states /* (a, b) => a !== b */))
      .attr('fill', 'none')
      .attr('stroke', '#777')
      .attr('stroke-linejoin', 'round')
      .attr('d', path);

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('placeholder', 'Find by state')
      .attr('class', searchButtonClassNames);
    if (searchDisabled) {
      search.style('display', 'none');
    }

    function searchBy(term) {
      if (term) {
        d3__namespace.select('.group-states').classed('searching', true);
        allStates.classed('s-match', d => {
          return d.properties.name.toLowerCase().includes(term.toLowerCase())
        });
        chartCore.selectAll('.s-match').raise();
      } else {
        d3__namespace.select('.group-states').classed('searching', false);
        chartCore.selectAll('.iv-state').lower();
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
        tickFormat: valueFormatter,
      }),
    );
  }

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

  const dimensionTypes$7 = {
    valueField: [shouldBeNumber],
    stateAbbrField: [shouldNotBeBlank],
  };

  const optionTypes$7 = {
    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    nullDataColor: checkColor,

    // interpolateScheme = d3.interpolateBlues,
    // colorLegendTitle = valueField,

    // searchButtonClassNames = '',
  };

  const validateAndRender$8 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$7, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
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
    });
  };

  /* global window */

  let currentState = 'global';
  function renderChart$7({
    data,
    options: {
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
    const aspectRatio = 1;

    applyInteractionStyles$5({ activeOpacity, inactiveOpacity });

    const coreChartWidth = 1000;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsLeft,
      // widgetsRight,
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

    const tooltipDiv = initializeTooltip$3();

    const { dataParsed, names, matrix, index, reverseIndex } = parseData$3({
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

    const { colorScale } = setupScales$4({ names, colorScheme });

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

    const handleSearch = searchEventHandler$4(names, index);
    const search = setupSearch$4({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      sourceField,
    });

    setupClearAllButton$4({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
      index,
    });

    setupShowAllButton$4({
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

  function applyInteractionStyles$5({ activeOpacity, inactiveOpacity }) {
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

  function parseData$3({ data, valueField, sourceField, targetField }) {
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

  function setupScales$4({ names, colorScheme }) {
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
            return `<div style="white-space: nowrap;">${
            ribbon.arrowSymbol
          } <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${colorScale(
            ribbon._name_,
          )}"></div> ${ribbon._name_}: ${
            valuePrefix +
            formatNumber(ribbon._value_, valueFormatter) +
            valuePostfix
          }</div>`
          })
          .reverse();

        tooltipDiv.html(
          `<b>${arcName}</b>: ${
          valuePrefix + formatNumber(arcValue, valueFormatter) + valuePostfix
        }
        <br/>
        ${tooltipValues.join('')}
        `,
        );

        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);

        const tooltipSize = tooltipDiv.node().getBoundingClientRect();
        const outsideY = e.clientY + 20 + tooltipSize.height > window.innerHeight;
        if (outsideY) {
          tooltipDiv.style(
            'top',
            `${e.clientY + window.scrollY - 10 - tooltipSize.height}px`,
          );
        }

        const outsideX = e.clientX + tooltipSize.width > window.innerWidth;

        if (outsideX) {
          tooltipDiv.style('left', `${e.clientX - tooltipSize.width}px`);
        }
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

  const searchEventHandler$4 = (referenceList, index) => qstr => {
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

  function setupSearch$4({
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

  function setupClearAllButton$4({
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

  function setupShowAllButton$4({
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

  const dimensionTypes$6 = {
    sourceField: [shouldNotBeBlank], // Categorical
    targetField: [shouldNotBeBlank], // Categorical
    valueField: [shouldBeZeroOrPositiveNumber, shouldNotBeBlank], // Numeric, shouldBePositive?
  };

  const optionTypes$6 = {
    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    chordType: checkOneOf(['directed', 'undirected']),

    colorScheme: checkColorArray,
    arcLabelFontSize: checkFontSizeString,

    activeOpacity: checkNumberBetween(0, 1),
    inactiveOpacity: checkNumberBetween(0, 1),
    clickInteraction: checkBoolean,

    // searchInputClassNames: checkString,
    // clearAllButtonClassNames: checkString,
    // showAllButtonClassNames: checkString,

    startingState: checkOneOf(['showAll', 'clearAll']),
  };

  const validateAndRender$7 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$6, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      // Run validations
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

      // eslint-disable-next-line no-console
      // console.log({ combinedValidation })
    });
  };

  function renderMaceColorLegend({
    selection,
    circleRadius = 5,
    stickLength = 30,
    stickWidth = 2,
    gapForText = 5,
    gapBetweenMaces = 6,
    colorScale,
  }) {
    // Note: Do not remove
    // for reference structure of colorScale
    // const colorScale = [
    //   { label: 'first', color: 'red' },
    //   { label: 'second', color: 'blue' },
    //   { label: 'third', color: 'green' },
    // ]

    const singleMaceSectionHeight = 2 * circleRadius + gapBetweenMaces;

    const colorLegend = selection;
    const colorLegendMain = colorLegend
      .append('g')
      .attr('class', 'color-legend cursor-pointer')
      .attr('transform', `translate(0, ${singleMaceSectionHeight / 2})`);

    const legendMaces = colorLegendMain
      .selectAll('g.legend-mace')
      .data(colorScale)
      .join('g')
      .attr('class', 'legend-mace');

    // .attr('transform', (d, i) => `translate(0,${i + singleMaceSectionHeight})`)
    legendMaces
      .append('circle')
      .attr('cx', circleRadius + stickLength)
      .attr('cy', (d, i) => i * singleMaceSectionHeight)
      .attr('r', circleRadius)
      .attr('fill', d => d.color);

    legendMaces
      .append('rect')
      .attr('width', stickLength)
      .attr('height', stickWidth)
      // .attr('y')
      .attr('y', (d, i) => i * singleMaceSectionHeight - stickWidth / 2)
      .attr('fill', d => d.color);

    legendMaces
      .append('text')
      .attr('x', 2 * circleRadius + stickLength + gapForText)
      .attr('y', (d, i) => i * singleMaceSectionHeight)
      .text(d => d.label)
      .attr('dominant-baseline', 'middle')
      .style('font-size', 10)
      .attr('fill', d => d.color);

    // TODO translate?

    const colorLegendBoundingBox = colorLegendMain.node().getBBox();
    colorLegend
      .attr('height', colorLegendBoundingBox.height + 5)
      .attr('width', colorLegendBoundingBox.width);
  }

  /* global window */

  function renderChart$6({
    data,
    options: {
      directionStartLabel = 'start point',
      directionEndLabel = 'end point',

      circleRadius = 3,
      lineWidth = 1,

      stickLength = 30,
      stickWidth = 1,
      directionLegendGapForText = 3,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      valuePrefix = '',
      valuePostfix = '',
      valueFormat = '',

      bgColor = 'transparent',

      colorScheme = ['red', 'orange', 'blue'],
      fieldLabels,

      activeOpacity = 0.8,
      inactiveOpacity = 0.2,
      defaultState = [],

      searchInputClassNames = '',
      goToInitialStateButtonClassNames = '',
      clearAllButtonClassNames = '',
      showAllButtonClassNames = '',

      colorLegendClassNames = '',
      directionLegendClassNames = '',
    },
    dimensions: { startField, endField, nameField },

    chartContainerSelector,
  }) {
    const aspectRatio = 2 / Math.sqrt(3);

    const valueFormatter = val =>
      `${valuePrefix}${formatNumber(val, valueFormat)}${valuePostfix}`;

    applyInteractionStyles$4({ activeOpacity, inactiveOpacity });

    const coreChartWidth = 600;
    const {
      svg,
      coreChartHeight,
      allComponents,
      chartCore,
      widgetsRight,
      widgetsLeft,
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

    const tooltipDiv = initializeTooltip$3();

    const dataParsed = data.map(el => {
      const elParsed = { ...el };

      elParsed[`__orig${startField[0]}__`] = Number.parseFloat(el[startField[0]]);
      elParsed[`__orig${startField[1]}__`] = Number.parseFloat(el[startField[1]]);
      elParsed[`__orig${startField[2]}__`] = Number.parseFloat(el[startField[2]]);
      elParsed[`__orig${endField[0]}__`] = Number.parseFloat(el[endField[0]]);
      elParsed[`__orig${endField[1]}__`] = Number.parseFloat(el[endField[1]]);
      elParsed[`__orig${endField[2]}__`] = Number.parseFloat(el[endField[2]]);

      elParsed['__startFieldTotal__'] =
        elParsed[`__orig${startField[0]}__`] +
        elParsed[`__orig${startField[1]}__`] +
        elParsed[`__orig${startField[2]}__`];
      elParsed['__endFieldTotal__'] =
        elParsed[`__orig${endField[0]}__`] +
        elParsed[`__orig${endField[1]}__`] +
        elParsed[`__orig${endField[2]}__`];

      elParsed[startField[0]] =
        elParsed[startField[0]] / elParsed['__startFieldTotal__'];
      elParsed[startField[1]] =
        elParsed[startField[1]] / elParsed['__startFieldTotal__'];
      elParsed[startField[2]] =
        elParsed[startField[2]] / elParsed['__startFieldTotal__'];
      elParsed[endField[0]] =
        elParsed[endField[0]] / elParsed['__endFieldTotal__'];
      elParsed[endField[1]] =
        elParsed[endField[1]] / elParsed['__endFieldTotal__'];
      elParsed[endField[2]] =
        elParsed[endField[2]] / elParsed['__endFieldTotal__'];

      return elParsed
    });

    // TODO: add note about hardcoded domain
    const triangleSide = (coreChartHeight * 2) / Math.sqrt(3);
    const xScale = d3__namespace.scaleLinear().range([0, triangleSide]).domain([0, 1]);

    const deToxy = ({ d, e }) => {
      return [xScale(d + e / 2), ((xScale(1) - xScale(e)) * Math.sqrt(3)) / 2]
    };

    const projectionsOnSides = ({ d, e, f }) => {
      const bottomPrejection = [xScale(d), (Math.sqrt(3) * xScale(1)) / 2];
      const rightPrejection = [
        xScale(1) - Math.cos(Math.PI / 3) * xScale(e),
        Math.sin(Math.PI / 3) * xScale(1 - e),
      ];
      const leftPrejection = [
        Math.cos(Math.PI / 3) * xScale(1 - f),
        Math.sin(Math.PI / 3) * xScale(f),
      ];
      return [bottomPrejection, rightPrejection, leftPrejection]
    };

    const centroid = { d: 1 / 3, e: 1 / 3, f: 1 / 3 };
    const bottomCenter = { d: 1 / 2, e: 0, f: 1 / 2 };
    const leftCenter = { d: 0, e: 1 / 2, f: 1 / 2 };
    const rightCenter = { d: 1 / 2, e: 1 / 2, f: 0 };

    const bottomRight = { d: 1, e: 0, f: 0 };
    const top = { d: 0, e: 1, f: 0 };
    const bottomLeft = { d: 0, e: 0, f: 1 };

    // There are three tridants in this coordinate system
    // like there are 4 quadrants in the cartesian coordinate system
    const topTridant = [
      deToxy(centroid),
      deToxy(leftCenter),
      deToxy(top),
      deToxy(rightCenter),
    ];
    const leftTridant = [
      deToxy(centroid),
      deToxy(leftCenter),
      deToxy(bottomLeft),
      deToxy(bottomCenter),
    ];
    const rightTridant = [
      deToxy(centroid),
      deToxy(rightCenter),
      deToxy(bottomRight),
      deToxy(bottomCenter),
    ];

    const defaultStateAll = defaultState === 'All' ? nameValues : defaultState;

    const tridants = [rightTridant, topTridant, leftTridant];
    chartCore
      .append('g')
      .attr('class', 'tridants')
      .selectAll('path.tridant')
      .data(tridants)
      .join('path')
      .attr('class', 'tridant')
      .attr('d', d3__namespace.line())
      .attr('fill', (d, i) => colorScheme[i])
      .attr('opacity', 0.1);

    chartCore
      .append('g')
      .attr('class', 'tmaces')
      .selectAll('g')
      // .selectAll('path')
      .data(dataParsed)
      .join('g')
      .attr('class', d => `tmace-g-${toClassText(d[nameField])}`)
      // .join('path')
      .append('path')
      .attr(
        'class',
        d =>
          `tmace tmace-${toClassText(d[nameField])} ${
          defaultStateAll.includes(d[nameField]) ? 'tmace-active' : ''
        }`,
      )
      .attr('d', d => {
        // debugger
        const [x1, y1] = deToxy({ d: d[startField[0]], e: d[startField[1]] });
        const [x2, y2] = deToxy({ d: d[endField[0]], e: d[endField[1]] });
        const macePoints = maceShape({
          x1,
          y1,
          x2,
          y2,
          circleRadius,
          stickWidth: lineWidth,
        });
        return d3__namespace.lineRadial()(macePoints)
      })
      .attr('transform', d => {
        const [x1, y1] = deToxy({ d: d[startField[0]], e: d[startField[1]] });
        const [x2, y2] = deToxy({ d: d[endField[0]], e: d[endField[1]] });
        const rotationAngle = pointsToRotationAngle({ x1, y1, x2, y2 });
        return `translate(${x2}, ${y2}) rotate(${rotationAngle})`
      })
      .attr('fill', d => {
        const maxDim = greater({
          d: d[endField[0]],
          e: d[endField[1]],
          f: d[endField[2]],
        });

        switch (maxDim) {
          case 'd':
            return colorScheme[0]
          case 'e':
            return colorScheme[1]
          case 'f':
            return colorScheme[2]
          default:
            return 'gray'
        }
      })
      .each(function (d) {
        const hoverGroup = d3__namespace
          .select(this.parentNode)
          .append('g')
          .attr('class', 'hover-group');

        const [bp, rp, lp] = projectionsOnSides({
          d: d[endField[0]],
          e: d[endField[1]],
          f: d[endField[2]],
        });
        const startPoint = deToxy({ d: d[endField[0]], e: d[endField[1]] });

        hoverGroup
          .append('circle')
          .attr('class', 'hover-circle')
          .attr('cx', bp[0])
          .attr('cy', bp[1])
          .attr('r', 5)
          .attr('fill', colorScheme[0]);

        hoverGroup
          .append('path')
          .attr('class', 'hover-line')
          .attr('d', () => {
            return d3__namespace
              .line()
              .x(d => d.x)
              .y(d => d.y)([
              { x: startPoint[0], y: startPoint[1] },
              { x: bp[0], y: bp[1] },
            ])
          })
          .attr('stroke', colorScheme[0]);

        hoverGroup
          .append('circle')
          .attr('class', 'hover-circle')
          .attr('cx', rp[0])
          .attr('cy', rp[1])
          .attr('r', 5)
          .attr('fill', colorScheme[1]);

        hoverGroup
          .append('path')
          .attr('class', 'hover-line')
          .attr('d', () => {
            return d3__namespace
              .line()
              .x(d => d.x)
              .y(d => d.y)([
              { x: startPoint[0], y: startPoint[1] },
              { x: rp[0], y: rp[1] },
            ])
          })
          .attr('stroke', colorScheme[1]);

        hoverGroup
          .append('circle')
          .attr('class', 'hover-circle')
          .attr('cx', lp[0])
          .attr('cy', lp[1])
          .attr('r', 5)
          .attr('fill', colorScheme[2]);

        hoverGroup
          .append('path')
          .attr('class', 'hover-line')
          .attr('d', () => {
            return d3__namespace
              .line()
              .x(d => d.x)
              .y(d => d.y)([
              { x: startPoint[0], y: startPoint[1] },
              { x: lp[0], y: lp[1] },
            ])
          })
          .attr('stroke', colorScheme[2]);
      })
      .on('mouseover', (e, d) => {
        d3__namespace.select(this).classed('hovered', true);
        d3__namespace.select(e.target.nextSibling).classed('hover-group-active', true);

        tooltipDiv.transition().duration(200).style('opacity', 1);

        tooltipDiv.html(`${d[nameField]}
      <br/>
      <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${
        colorScheme[0]
      }"></div> ${fieldLabels[0]}: ${valueFormatter(
        d[startField[0]],
      )} → ${valueFormatter(d[endField[0]])}
      <br/> 
      <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${
        colorScheme[1]
      }"></div> ${fieldLabels[1]}: ${valueFormatter(
        d[startField[1]],
      )} → ${valueFormatter(d[endField[1]])}
      <br/>
      <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${
        colorScheme[2]
      }"></div> ${fieldLabels[2]}: ${valueFormatter(
        d[startField[2]],
      )} → ${valueFormatter(d[endField[2]])}
      `);
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', e => {
        d3__namespace.select(e.target.nextSibling).classed('hover-group-active', false);
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      })
      .on('click', e => {
        const tMace = d3__namespace.select(e.target);
        const clickedState = tMace.classed('tmace-active');
        tMace.classed('tmace-active', !clickedState);
      });

    const nameValues = dataParsed.map(d => d[nameField]);
    const handleSearch = searchEventHandler$3(nameValues);
    const search = setupSearch$3({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      nameField,
    });

    const axes = chartCore.append('g').attr('class', 'axes');

    setupInitialStateButton$3({
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

    setupShowAllButton$3({
      widgetsLeft,
      showAllButtonClassNames,
      search,
      handleSearch,
    });

    const bottomAxis = axes
      .append('g')
      .attr('transform', `translate(0, ${coreChartHeight})`);

    bottomAxis
      .call(d3__namespace.axisBottom(xScale).ticks(4).tickFormat(valueFormatter))
      .call(g => {
        g.selectAll('.tick text')
          .attr('transform', 'rotate(30)')
          .attr('fill', colorScheme[0])
          .classed('font-nunito', true);
        g.selectAll('.tick line')
          .attr('transform', 'rotate(30)')
          .attr('stroke', colorScheme[0]);
        g.selectAll('.tick:first-of-type line').remove();
        g.selectAll('.tick:last-of-type line').remove();
        g.select('.domain').remove();
      });

    bottomAxis
      .append('text')
      .attr('transform', `translate(${deToxy(bottomCenter)[0]}, ${30})`)
      .text(fieldLabels[0])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .attr('fill', colorScheme[0]);

    const rightAxis = axes
      .append('g')
      .attr(
        'transform',
        `translate(${triangleSide}, ${coreChartHeight}) rotate(-120)`,
      );

    rightAxis
      .call(d3__namespace.axisBottom(xScale).ticks(4).tickFormat(valueFormatter))
      .call(g => {
        g.selectAll('.tick text')
          .attr('transform', 'translate(4, 18) rotate(120)')
          .attr('fill', colorScheme[1])
          .classed('font-nunito', true);
        g.selectAll('.tick line')
          .attr('transform', 'rotate(30)')
          .attr('stroke', colorScheme[1]);
        g.select('.domain').remove();

        g.selectAll('.tick:first-of-type line').remove();
        g.selectAll('.tick:last-of-type line').remove();
      });

    rightAxis
      .append('text')
      .attr('transform', `translate(${triangleSide / 2}, ${50}) rotate(180)`)
      .text(fieldLabels[1])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .attr('fill', colorScheme[1]);

    const leftAxis = axes
      .append('g')
      .attr('transform', `translate(${triangleSide / 2}, ${0}) rotate(30)`);

    leftAxis
      .call(d3__namespace.axisLeft(xScale).ticks(4).tickFormat(valueFormatter))
      .call(g => {
        g.selectAll('.tick text')
          .attr('transform', 'rotate(30)')
          .attr('fill', colorScheme[2])
          .classed('font-nunito', true);
        g.selectAll('.tick line')
          .attr('transform', 'rotate(30)')
          .attr('stroke', colorScheme[2]);
        g.select('.domain').remove();

        g.selectAll('.tick:first-of-type line').remove();
        g.selectAll('.tick:last-of-type line').remove();
      });

    leftAxis
      .append('text')
      .attr('transform', `translate(${-50},${triangleSide / 2}) rotate(-90)`)
      .text(fieldLabels[2])
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .attr('fill', colorScheme[2]);

    // leftAxis.attr('transform', `translate(${triangleSide / 2}, ${0}) rotate(30)`)

    renderDirectionLegend({
      selection: widgetsRight
        .append('svg')
        .attr('class', directionLegendClassNames),
      circleRadius,
      stickLength,
      stickWidth,
      gapForText: directionLegendGapForText,
      directionStartLabel,
      directionEndLabel,
    });

    renderMaceColorLegend({
      selection: widgetsRight.append('svg').attr('class', colorLegendClassNames),
      circleRadius,
      stickLength,
      stickWidth,
      gapForText: 5,
      // gapBetweenMaces: 5,
      colorScale: colorScheme.map((c, i) => ({
        color: c,
        label: fieldLabels[i],
      })),
    });

    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function greater(t) {
    let maxDim = '';
    let maxVal = 0;
    // TODO not handled case when two or more are equal
    Object.keys(t).forEach(dim => {
      if (t[dim] > maxVal) {
        maxVal = t[dim];
        maxDim = dim;
      }
    });
    return maxDim
  }

  function applyInteractionStyles$4({ activeOpacity, inactiveOpacity }) {
    d3__namespace.select('body').append('style').html(`  
    .tmace {
      cursor: pointer;
    }
    .tmaces .tmace {
      fill-opacity: ${inactiveOpacity};
    }
    .tmaces .tmace.tmace-active {
      fill-opacity: ${activeOpacity};
    }
    g.tmaces.searching .tmace.tmace-matched {
      stroke: #333;
      stroke-width: 3;
    }
    .tmace:hover {
      stroke: #333;
      stroke-width: 1;
    }
    g.hover-group {
      opacity: 0
    }
    g.hover-group.hover-group-active {
      opacity: 0.5
    }
    .hover-line {
      stroke-dasharray: 5 5
    }
    .hover-circle {
      r: 3
    }
  `);
  }

  function setupInitialStateButton$3({
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
      d3__namespace.selectAll('.tmace').classed('tmace-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        d3__namespace.select(`.tmace-${toClassText(val)}`).classed('tmace-active', true);
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
      d3__namespace.selectAll('.tmace').classed('tmace-active', false);
      search.node().value = '';
      handleSearch('');
    });
  }

  function setupShowAllButton$3({
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
      d3__namespace.selectAll('.tmace').classed('tmace-active', true);
      search.node().value = '';
      handleSearch('');
    });
  }

  const searchEventHandler$3 = referenceList => qstr => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        const tmaceName = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          d3__namespace.select(`.tmace-${tmaceName}`).classed('tmace-matched', true);
        } else {
          d3__namespace.select(`.tmace-${tmaceName}`).classed('tmace-matched', false);
        }
        d3__namespace.select('.tmaces').classed('searching', true);
      });
    } else {
      referenceList.forEach(val => {
        const tmaceName = toClassText(val);
        d3__namespace.select(`.tmace-${tmaceName}`).classed('tmace-matched', false);
      });
      d3__namespace.select('.tmaces').classed('searching', false);
    }
  };

  function setupSearch$3({
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

  // { startField, endField, nameField }
  const dimensionTypes$5 = {
    nameField: [shouldNotBeBlank],
  };

  function buildDimensionAndTypes$1({
    dimensions,
    dimensionTypes,
    // optionTypes
  }) {
    const valueFieldsDimensionTypes = {};
    const valueDimensions = {};
    const startFields = dimensions.startField;
    const endFields = dimensions.endField;

    startFields.forEach((sf, i) => {
      valueFieldsDimensionTypes[`__startField${i}__`] = [shouldBeNumber];
      valueDimensions[`__startField${i}__`] = sf;
    });
    endFields.forEach((ef, i) => {
      valueFieldsDimensionTypes[`__endField${i}__`] = [shouldBeNumber];
      valueDimensions[`__endField${i}__`] = ef;
    });

    // after spreading out yFields; needed since yFields is an array unlike other dimensions
    const flatDimensions = { ...dimensions, ...valueDimensions };

    const dimensionTypesWithValueFields = {
      ...dimensionTypes,
      ...valueFieldsDimensionTypes,
    };

    return {
      flatDimensions,
      dimensionTypesWithValueFields,
      // optionTypesWYFields
    }
  }

  const optionTypes$5 = {
    // directionStartLabel: 'start point',
    // directionEndLabel: 'end point',

    circleRadius: checkNumber,
    lineWidth: checkNumber,

    stickLength: checkNumber,
    stickWidth: checkNumber,
    directionLegendGapForText: checkNumber,

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    // valuePrefix: '',
    // valuePostfix: '',
    // valueFormat: '',

    bgColor: checkColor,

    activeOpacity: checkNumberBetween(0, 1),
    inactiveOpacity: checkNumberBetween(0, 1),
    defaultState: checkDefaultState,

    colorScheme: checkColorArray(3),
    fieldLabels: checkStringArray(3),
    // searchInputClassNames: '',
  };

  function validateAndRender$6({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$5, options });
    d3__namespace.csv(dataPath).then(data => {
      const { columns } = data;
      const { flatDimensions, dimensionTypesWithValueFields } =
        buildDimensionAndTypes$1({ dimensions, dimensionTypes: dimensionTypes$5 });
      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions: flatDimensions,
      });

      const dataValidations = validateData({
        data,
        dimensionTypes: dimensionTypesWithValueFields,
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
        ? renderChart$6({ data, dimensions, options, chartContainerSelector })
        : showErrors(chartContainerSelector, combinedValidation.messages);
    });
  }

  /* global window */

  function renderChart$5({
    data,
    options: {
      aspectRatio = 0.7,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      colorScheme = ['#3077aa', '#ed3833'],

      barValueMidPoint = 50,

      xAxisTickSize = 10,
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
    applyInteractionStyles$3({ bgColor, inactiveOpacity, activeOpacity });

    const tooltipDiv = initializeTooltip$3();

    const coreChartWidth = 1200;

    const { svg, coreChartHeight, allComponents, chartCore, widgetsLeft } =
      setupChartArea$5({
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
    } = parseData$2({
      data,
      yField,
      barRightValueField,
      barLeftValueField,
      barValueMidPoint,
      defaultState,
    });

    const { yScale, xScaleLeft, xScaleRight, xStart } = setupScales$3({
      coreChartHeight,
      coreChartWidth,
      yDomain,
      xStartActual,
      maxOverall,
    });

    const { markerSymbol, symbolSize, triangleOffset, symbolConstant } =
      setupBarSymbol({ yScale, chartCore });

    const { leftBarsContainer, rightBarsContainer } = renderBars$1({
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

    renderXAxis$3({ leftBarsContainer, xScaleLeft, xAxisTickSize });

    renderYAxis$2({ rightBarsContainer, xScaleRight, xAxisTickSize });

    renderLegends$2({
      chartCore,
      xScaleLeft,
      xStart,
      xAxisTickSize,
      markerSymbol,
      symbolSize,
      triangleOffset,
      colorScheme,
      leftXAxisLabel,
      rightXAxisLabel,
      xAxisLabel,
    });

    const handleSearch = searchEventHandler$2(dimensionValues);
    const search = setupSearch$2({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      yField,
      svg,
      chartContainerSelector,
      dimensionValues,
    });

    setupInitialStateButton$2({
      widgetsLeft,
      goToInitialStateButtonClassNames,
      defaultStateAll,
      search,
      handleSearch,
      svg,
    });

    setupClearAllButton$2({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
      svg,
    });

    setupShowAllButton$2({
      widgetsLeft,
      showAllButtonClassNames,
      search,
      handleSearch,
      svg,
    });

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function applyInteractionStyles$3({ bgColor, inactiveOpacity, activeOpacity }) {
    d3__namespace.select('body').append('style').html(`
  g.bar {
    stroke: ${bgColor};
    fill-opacity: ${inactiveOpacity};
    cursor: pointer;
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

  function parseData$2({
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

  function setupScales$3({
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

  function renderLegends$2({
    chartCore,
    xScaleLeft,
    xStart,
    xAxisTickSize,
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
      .attr('y', -xAxisTickSize * 5)
      .attr('height', xAxisTickSize * 2)
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
      }, ${-xAxisTickSize * 4}) rotate(-90)`,
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
      }, ${-xAxisTickSize * 4}) `,
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
      }, ${-xAxisTickSize * 4}) rotate(90)`,
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
      }, ${-xAxisTickSize * 4}) `,
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
        `translate(${xScaleLeft(xStart)}, ${-xAxisTickSize * 6}) `,
      )
      .attr('fill', '#333')
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
      .attr('style', 'font-weight: bold;');
  }

  function renderXAxis$3({ leftBarsContainer, xScaleLeft, xAxisTickSize }) {
    leftBarsContainer
      .append('g')
      .call(d3__namespace.axisTop(xScaleLeft).tickSize(xAxisTickSize))
      .call(g => {
        g.select('.domain').remove();
        g.selectAll('.tick line').attr('stroke', '#555');
        g.selectAll('.tick text').attr('fill', '#555').attr('font-size', 12);
      });
  }

  function renderYAxis$2({ rightBarsContainer, xScaleRight, xAxisTickSize }) {
    rightBarsContainer
      .append('g')
      .call(d3__namespace.axisTop(xScaleRight).tickSize(xAxisTickSize))
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

  function renderBars$1({
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
      })
      .on('click', function (e) {
        const parentBar = d3__namespace.select(e.target.parentNode);
        const clickedState = parentBar.classed('bar-active');
        parentBar.classed('bar-active', !clickedState);
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
      .attr('fill', colorScheme[0]);

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
      .attr('fill', colorScheme[0]);

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
      })
      .on('click', function (e) {
        const parentBar = d3__namespace.select(e.target.parentNode);
        const clickedState = parentBar.classed('bar-active');
        parentBar.classed('bar-active', !clickedState);
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
      .attr('fill', colorScheme[1]);

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
      .attr('fill', colorScheme[1]);

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

  const searchEventHandler$2 = referenceList => (qstr, svg) => {
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

  function setupSearch$2({
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

  function setupClearAllButton$2({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
    svg,
  }) {
    const clearAll = widgetsLeft
      .append('button')
      .text('Clear All')
      .attr('class', clearAllButtonClassNames);
    clearAll.classed('hidden', false);
    clearAll.on('click', () => {
      svg.selectAll('.bar').classed('bar-active', false);
      search.node().value = '';
      handleSearch('', svg);
    });
  }

  function setupShowAllButton$2({
    widgetsLeft,
    showAllButtonClassNames,
    search,
    handleSearch,
    svg,
  }) {
    const showAll = widgetsLeft
      .append('button')
      .text('Show All')
      .attr('class', showAllButtonClassNames);
    showAll.classed('hidden', false);
    showAll.on('click', () => {
      svg.selectAll('.bar').classed('bar-active', true);
      search.node().value = '';
      handleSearch('', svg);
    });
  }

  function setupInitialStateButton$2({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
    svg,
  }) {
    const goToInitialState = widgetsLeft
      .append('button')
      .text('Go to Initial State')
      .attr('class', goToInitialStateButtonClassNames);
    goToInitialState.classed('hidden', false);
    goToInitialState.on('click', () => {
      svg.selectAll('.bar').classed('bar-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        svg.selectAll(`.bar-${toClassText(val)}`).classed('bar-active', true);
      });
      search.node().value = '';
      handleSearch('', svg);
    });
  }

  const dimensionTypes$4 = {
    yField: [shouldBeUnique, shouldNotBeBlank], // Categorical

    // barLeftLabelField: 'Democratic Label', // Categorical
    barLeftValueField: [shouldBeNumber], // Numeric

    // barRightLabelField: 'Republican Label', // Categorical
    barRightValueField: [shouldBeNumber], // Numeric
  };

  const optionTypes$4 = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    colorScheme: checkColorArray(2),

    barValueMidPoint: checkNumber,

    xAxisTickSize: checkNumber,
    // leftXAxisLabel: checkString,
    // rightXAxisLabel: checkString,
    // xAxisLabel: checkString,

    defaultState: checkDefaultState,

    inactiveOpacity: checkNumberBetween(0, 1),
    activeOpacity: checkNumberBetween(0, 1),

    // goToInitialStateButtonClassNames: checkStringArray,
    // searchInputClassNames: checkStringArray,
    // clearAllButtonClassNames: checkStringArray,
    // showAllButtonClassNames: checkStringArray,
  };

  function validateAndRender$5({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$4, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      // Run validations
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
  }

  /* global window */

  function renderChart$4({
    data,
    options: {
      aspectRatio = 2,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      barOpacity = 0.5,
      barThickness = 0.8,
      outerPadding = 0.2,

      colorScheme = d3__namespace.schemeSpectral[9],

      showOnlyEveryNthValue = 1,

      xAxisPosition = 'bottom',
      xAxisLabel = '',
      xAXisLabelFontSize = 12,
      xAxisLabelOffset = 30,
      xAxisColor = 'black',
      xAxisTickRotation = 90,

      yAxisPosition = 'left',
      yAxisLabelOffset = 50,
      yAxisColor = 'black',
      yAxisLabel = '',
      yAXisLabelFontSize = 12,

      nanDisplayMessage = 'NA',
      referenceLines = [],
      referenceLinesOpacity = 1,
    },
    dimensions: { xField, yFields },
    chartContainerSelector,
    handleBarClick = a => a,
  }) {
    applyInteractionStyles$2({ referenceLinesOpacity });

    const coreChartWidth = 1000;
    const { svg, coreChartHeight, allComponents, chartCore, widgetsRight } =
      setupChartArea$5({
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

    const { dataParsed, allYValues } = parseData$1({ data, yFields });

    const { xScale, yScale, colorsRgba } = setupScales$2({
      dataParsed,
      allYValues,
      xField,
      coreChartWidth,
      coreChartHeight,
      barThickness,
      barOpacity,
      outerPadding,
      colorScheme,
    });

    renderBars({
      yFields,
      chartCore,
      dataParsed,
      xField,
      xScale,
      yScale,
      colorsRgba,
      coreChartHeight,
      tooltipDiv,
      nanDisplayMessage,
      handleBarClick,
    });

    renderLegends$1({ widgetsRight, colorsRgba, yFields, referenceLines });

    renderReferenceLine$1({
      chartCore,
      referenceLines,
      yScale,
      xScale,
      colorsRgba,
    });

    renderXAxis$2({
      xAxisPosition,
      xScale,
      coreChartHeight,
      showOnlyEveryNthValue,
      chartCore,
      coreChartWidth,
      xAxisLabelOffset,
      xAxisLabel,
      xAxisColor,
      xAxisTickRotation,
      xAXisLabelFontSize,
    });

    renderYAxis$1({
      yAxisPosition,
      yScale,
      chartCore,
      coreChartWidth,
      coreChartHeight,
      yAxisLabelOffset,
      yAxisLabel,
      yAxisColor,
      yAXisLabelFontSize,
    });

    renderYGrid({ chartCore, yScale, coreChartWidth });

    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function renderYAxis$1({
    yAxisPosition,
    yScale,
    chartCore,
    coreChartWidth,
    coreChartHeight,
    yAxisLabelOffset,
    yAxisLabel,
    yAxisColor,
    yAXisLabelFontSize,
  }) {
    let yAxis, axisOffset, labelOffset;
    if (yAxisPosition === 'right') {
      yAxis = d3__namespace.axisRight(yScale);
      axisOffset = coreChartWidth;
      labelOffset = yAxisLabelOffset;
    } else {
      yAxis = d3__namespace.axisLeft(yScale);
      axisOffset = 0;
      labelOffset = -yAxisLabelOffset;
    }

    const yAxisGroup = chartCore
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(${axisOffset},0)`)
      .call(yAxis);

    yAxisGroup
      .append('text')
      // .attr('text-anchor', 'middle')
      // .attr('dominant-baseline', 'middle')
      .style('font-size', `${yAXisLabelFontSize}px`)
      .attr('fill', yAxisColor)
      .attr(
        'transform',
        `translate(${labelOffset}, ${coreChartHeight / 2}) rotate(-90)`,
      )
      .text(yAxisLabel);
  }

  function renderYGrid({ chartCore, yScale, coreChartWidth }) {
    const yAxisGrid = d3__namespace.axisLeft(yScale).tickSize(-coreChartWidth);
    chartCore
      .append('g')
      .call(yAxisGrid)
      .call(g => {
        g.selectAll('.tick line').attr('opacity', 0.3);
        g.selectAll('.tick text').remove();
      })
      .call(g => g.select('.domain').remove())
      .lower();
  }

  function renderXAxis$2({
    xAxisPosition,
    xScale,
    coreChartHeight,
    showOnlyEveryNthValue,
    chartCore,
    coreChartWidth,
    xAxisLabelOffset,
    xAxisLabel,
    xAxisColor,
    xAxisTickRotation,
    xAXisLabelFontSize,
  }) {
    let xAxis, axisOffset, labelOffset;
    if (xAxisPosition === 'top') {
      xAxis = d3__namespace.axisTop(xScale);
      axisOffset = 0;
      labelOffset = -xAxisLabelOffset;
    } else {
      xAxis = d3__namespace.axisBottom(xScale);
      axisOffset = coreChartHeight;
      labelOffset = xAxisLabelOffset;
    }

    xAxis.tickValues(
      xScale.domain().filter(function (d, i) {
        return !(i % showOnlyEveryNthValue)
      }),
    );

    const xAxisGroup = chartCore
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${axisOffset})`)
      .call(xAxis)
      .call(g => {
        const tickGroup = g.selectAll('.tick text');
        tickGroup
          .attr('y', 0)
          .attr('dy', '0em')
          .attr('transform', `rotate(${xAxisTickRotation})`)
          .attr('dx', '1em')
          .attr('text-anchor', 'start')
          .attr('dominant-baseline', 'middle');
      });

    xAxisGroup
      .append('text')
      // .attr('text-anchor', 'middle')
      // .attr('dominant-baseline', 'middle')
      .style('font-size', `${xAXisLabelFontSize}px`)
      .attr('fill', xAxisColor)
      .attr('transform', `translate(${coreChartWidth / 2}, ${labelOffset})`)
      .text(xAxisLabel);
  }

  function applyInteractionStyles$2({ referenceLinesOpacity }) {
    d3__namespace.select('body').append('style').html(`
  .hovered {
    stroke: #333;
  }
  .reference-lines {
    stroke-opacity: ${referenceLinesOpacity};
  }
  `);
  }

  function parseData$1({ data, yFields }) {
    const allYValues = [];
    const dataParsed = data.map(el => {
      const elParsed = { ...el };
      yFields.forEach(yf => {
        elParsed[yf] = Number.parseFloat(el[yf]);
        allYValues.push(Number.parseFloat(el[yf]));
      });
      return elParsed
    });

    return { dataParsed, allYValues }
  }

  function setupScales$2({
    dataParsed,
    allYValues,
    xField,
    coreChartWidth,
    coreChartHeight,
    barThickness,
    barOpacity,
    outerPadding,
    colorScheme,
  }) {
    const xDomain = dataParsed.map(d => d[xField]);
    const xScale = d3__namespace
      .scaleBand()
      .range([0, coreChartWidth])
      .domain(xDomain)
      .paddingInner(1 - barThickness)
      .paddingOuter(outerPadding);

    const yMax = d3__namespace.max(allYValues);

    const colorsRgba = colorScheme.map(c => {
      const parsedColor = d3__namespace.rgb(c);
      parsedColor.opacity = barOpacity;
      return parsedColor
    });

    const yScale = d3__namespace
      .scaleLinear()
      .range([coreChartHeight, 0])
      .domain([0, yMax])
      .nice();

    return { xScale, yScale, colorsRgba }
  }

  function renderBars({
    yFields,
    chartCore,
    dataParsed,
    xField,
    xScale,
    yScale,
    colorsRgba,
    coreChartHeight,
    tooltipDiv,
    nanDisplayMessage,
    handleBarClick,
  }) {
    yFields.forEach((yf, i) => {
      chartCore
        .append('g')
        .selectAll('rect')
        .data(dataParsed)
        .join('rect')
        .attr('x', d => xScale(d[xField]))
        .attr('y', d => yScale(d[yf]))
        .attr('class', d => `rect-${toClassText(d[xField])}`)
        .attr('height', d => yScale(0) - yScale(Number.isNaN(d[yf]) ? 0 : d[yf]))
        .attr('width', xScale.bandwidth())
        .attr('fill', colorsRgba[i]);
    });

    chartCore
      .append('g')
      .selectAll('rect')
      .data(dataParsed)
      .join('rect')
      .attr('x', d => xScale(d[xField]))
      .attr('y', 0)
      .attr('height', coreChartHeight)
      .attr('width', xScale.bandwidth())
      .attr('opacity', 0)
      .on('mouseover', function (e, d) {
        tooltipDiv.transition().duration(200).style('opacity', 1);
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);

        tooltipDiv.html(`${xField}: ${d[xField]}
      <br/>
      ${yFields
        .map(
          (yff, i) =>
            `<div style="display: inline-block; width: 0.5rem; height: 0.5rem; background: ${
              colorsRgba[i]
            }"></div> ${yff}: ${d[yff] || nanDisplayMessage}`,
        )
        .join('<br/>')}
      `);

        d3__namespace.selectAll(`.rect-${toClassText(d[xField])}`).classed('hovered', true);

        handleBarClick(e, d);
      })
      .on('mouseout', function (e, d) {
        d3__namespace.selectAll(`.rect-${toClassText(d[xField])}`).classed('hovered', false);

        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      });
    // .on('click', )
  }

  function renderReferenceLine$1({ chartCore, referenceLines, yScale, xScale }) {
    chartCore
      .append('g')
      .attr('class', 'reference-lines')
      .selectAll('path')
      .data(referenceLines)
      .join('path')
      .attr('d', d => {
        const yDomain = yScale.domain();
        // const { x, y, width, height } = d3.select('.domain').node().getBBox()
        const x0 = xScale(String(d.value)) + xScale.bandwidth() / 2;
        const y0 = yScale(d3__namespace.min(yDomain));
        const y1 = yScale(d3__namespace.max(yDomain));
        const d_ = [
          { x: x0, y: y0 },
          { x: x0, y: y1 },
        ];
        return d3__namespace
          .line()
          .x(d => d.x)
          .y(d => d.y)(d_)
      })
      .attr('stroke-width', 4)
      .attr('opacity', 1)
      .attr('stroke', d => d.color)
      .attr('stroke-dasharray', '5,5');
  }

  function renderLegends$1({ widgetsRight, colorsRgba, yFields, referenceLines }) {
    const colorScaleForLegend = d3__namespace.scaleOrdinal(colorsRgba).domain(yFields);
    widgetsRight.html(
      swatches({
        color: colorScaleForLegend,
        uid: 'rs',
        customClass: '',
      }),
    );

    const refLinesColors = [];
    const refLinesLabels = [];
    referenceLines.forEach(l => {
      refLinesLabels.push(l.label);
      refLinesColors.push(d3__namespace.rgb(l.color));
    });

    const colorScaleForRefLines = d3__namespace
      .scaleOrdinal()
      .domain(refLinesLabels)
      .range(refLinesColors);
    widgetsRight.append('div').html(
      dashedLegend({
        labels: refLinesLabels,
        color: colorScaleForRefLines,
      }),
    );
  }

  const dimensionTypes$3 = { xField: [shouldNotBeBlank] };

  const optionTypes$3 = {
    aspectRatio: checkNumberBetween(0.01, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    barOpacity: checkNumberBetween(0, 1),
    barThickness: checkNumberBetween(0, 1),
    outerPadding: checkNumberBetween(0, 1),

    colorScheme: checkColorArray(),

    showOnlyEveryNthValue: checkPositiveInteger,

    // xAxisPosition: checkString,
    // xAxisLabel: checkString,
    // xAxisColor: checkString,
    xAXisLabelFontSize: checkPositiveInteger,
    xAxisLabelOffset: checkNumber,
    xAxisTickRotation: checkNumber,

    yAxisLabelOffset: checkNumber,
    yAXisLabelFontSize: checkPositiveInteger,
    // yAxisPosition: checkString,
    // yAxisColor: checkString,
    // yAxisLabel: checkString,

    // nanDisplayMessage: checkString,
    // referenceLines: [],
    referenceLinesOpacity: checkNumberBetween(0, 1),
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
      colors: checkColorArray(yFields.length),
    };

    return { flatDimensions, dimensionTypesWYFields, optionTypesWYFields }
  }

  function validateAndRender$4({
    dataPath,
    options,
    dimensions,

    chartContainerSelector,
  }) {
    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
      const { columns } = data;

      const { flatDimensions, dimensionTypesWYFields, optionTypesWYFields } =
        buildDimensionAndTypes({
          dimensions,
          dimensionTypes: dimensionTypes$3,
          optionTypes: optionTypes$3,
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
  }

  /* global window */

  function renderChart$3({
    data,
    options: {
      aspectRatio = 2,

      zoom = 1,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      // background-color
      bgColor = 'transparent',
      colorScheme = d3__namespace.schemeSpectral[9],

      yDomainCustom,

      yGridPaddingInner = 0.1,
      showYGridLabels = false,
      yGridLabelFontSize = 12,

      yAxisLocation = 'left',
      yAxisOffset = 10,

      yValueFormatter = '',
      yValuePrefix = '',
      yValueSuffix = '',

      xValueTimeParser = '',
      xValueTimeFormatter = '',
    },
    dimensions: { xGridField, yGridField, xField, yFields },

    chartContainerSelector,
    handleCellMouseover = a => a,
  }) {
    const coreChartWidth = 1000 / zoom;
    const { svg, coreChartHeight, allComponents, chartCore, widgetsRight } =
      setupChartArea$5({
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

    const uniqCellField = `${xGridField}-${yGridField}`;
    const dataParsed = data.map(el => {
      const elParsed = { ...el };
      let yFieldSum = 0;
      yFields.forEach(yf => {
        elParsed[yf] = Number.parseFloat(el[yf]);
        yFieldSum += elParsed[yf];
      });
      elParsed.yFieldSum = yFieldSum;
      elParsed[uniqCellField] = `${el[xGridField]}-${el[yGridField]}`;
      return elParsed
    });

    const yMax = d3__namespace.max(dataParsed.map(d => d.yFieldSum));
    const yDomain = yDomainCustom || [0, yMax];
    // console.log({ yDomain })

    const yGridDomain = ___default["default"].uniq(data.map(d => d[yGridField]));
    const yGridScale = d3__namespace
      .scaleBand()
      .domain(yGridDomain)
      .range([0, coreChartHeight])
      // .range(descending ? yGridRange.reverse() : yGridRange)
      .paddingInner(yGridPaddingInner);

    const yScale = d3__namespace
      .scaleLinear()
      .range([yGridScale.bandwidth(), 0])
      .domain(yDomain)
      .nice();

    const yTicks = yScale.ticks().length;

    const xGridDomain = ___default["default"].uniq(data.map(d => d[xGridField])).sort();

    const xGridScale = d3__namespace
      .scaleBand()
      .domain(xGridDomain)
      .range([0, coreChartWidth])
      .paddingInner(0.2);

    const cells = ___default["default"].uniqBy(
      dataParsed.map(d => ({
        [xGridField]: d[xGridField],
        [yGridField]: d[yGridField],
        [uniqCellField]: `${d[xGridField]}-${d[yGridField]}`,
      })),
      uniqCellField,
    );

    const dataByCell = {};
    dataParsed.forEach(d => {
      const cell = d[uniqCellField];
      if (dataByCell[cell]) {
        dataByCell[cell].push(d);
      } else {
        dataByCell[cell] = [d];
      }
    });

    const stackedDataByCell = {};
    Object.keys(dataByCell).forEach(c => {
      stackedDataByCell[c] = d3__namespace.stack().keys(yFields)(dataByCell[c]);
    });
    const colorScale = d3__namespace.scaleOrdinal(colorScheme).domain(yFields);

    const yFormatter = t =>
      `${yValuePrefix}${d3__namespace.format(yValueFormatter)(t)}${yValueSuffix}`;

    chartCore
      .selectAll('g.cell')
      .data(cells)
      .join('g')
      .attr('class', 'cell')
      .attr(
        'transform',
        d =>
          `translate(
            ${xGridScale(d[xGridField])},
            ${yGridScale(d[yGridField])}
          )`,
      )
      .on('mouseover', handleCellMouseover)
      .each(function (d) {
        const xDomain = dataByCell[d[uniqCellField]].map(dc => dc[xField]).sort();

        // Evaluate xScale for each cell to tackle case when x values don't match across cells
        const xScale = d3__namespace
          .scaleBand()
          .domain(xDomain)
          .range([0, xGridScale.bandwidth()]);

        // Use area with step to avoid jarring rect boundaries
        d3__namespace.select(this)
          .selectAll('path')
          .data(stackedDataByCell[d[uniqCellField]])
          .join('path')
          .attr('fill', dd => colorScale(dd.key))
          .attr(
            'd',
            d3__namespace
              .area()
              .curve(d3__namespace.curveStep)
              .x(function (dd) {
                return xScale(dd.data[xField])
              })
              .y0(function (dd) {
                return yScale(dd[0])
              })
              .y1(function (dd) {
                return yScale(dd[1])
              }),
          );

        // Use transparent rect to trigger tooltip for individual bar stacks
        d3__namespace.select(this)
          .selectAll('g')
          .data([stackedDataByCell[d[uniqCellField]][0]])
          .join('g')
          .attr('fill', 'transparent')
          .selectAll('rect')
          .data(dd => dd)
          .join('rect')
          .attr('x', dd => xScale(dd.data[xField]))
          .attr('y', yScale(yScale.domain()[1]))
          .attr('height', yGridScale.bandwidth())
          .attr('width', xScale.bandwidth())
          .on('mouseover', (e, dd) => {
            tooltipDiv.transition().duration(200).style('opacity', 1);

            const xValue = dd.data[xField];
            const xValueParsedFormatted =
              d3__namespace.timeFormat(xValueTimeFormatter)(
                d3__namespace.timeParse(xValueTimeParser)(xValue),
              ) || xValue;
            tooltipDiv.html(`${dd.data[yGridField]}: ${xValueParsedFormatted}
          <br/>
          ${yFields
            .map(
              yf =>
                `<div class="w-2 h-2 inline-block"
                  style="background: ${colorScale(yf)};"></div>
                ${yf}: ${yFormatter(dd.data[yf])}`,
            )
            .join('<br/>')}
          `);

            tooltipDiv
              .style('left', `${e.clientX}px`)
              .style('top', `${e.clientY + 20 + window.scrollY}px`);
          })
          .on('mouseout', () => {
            tooltipDiv
              .style('left', '-300px')
              .transition()
              .duration(500)
              .style('opacity', 0);
          });
        d3__namespace.select(this)
          .append('text')
          .text(d[xGridField])
          .style('font-size', 10)
          .attr(
            'transform',
            `translate(${xGridScale.bandwidth() / 2}, ${
            yGridScale.bandwidth() + 5
          })`,
          )
          .attr('dominant-baseline', 'hanging')
          .attr('text-anchor', 'middle');
      });

    const yAxis =
      yAxisLocation === 'left' ? d3__namespace.axisLeft(yScale) : d3__namespace.axisRight(yScale);
    chartCore
      .append('g')
      .attr('class', 'y-axes')
      .selectAll('g')
      .data(yGridDomain)
      .join('g')
      .attr(
        'transform',
        d =>
          `translate(${
          yAxisLocation === 'left' ? -yAxisOffset : coreChartWidth + yAxisOffset
        }, ${yGridScale(d)})`,
      )
      .call(yAxis.ticks(Math.floor(yTicks / 4)).tickFormat(yFormatter))
      .call(g => {
        g.select('.domain').remove();
      });
    showYGridLabels &&
      chartCore
        .append('g')
        .attr('class', 'y-grid-scale')
        .attr('transform', `translate(0, ${yGridScale.bandwidth() / 2})`)
        .call(d3__namespace.axisLeft(yGridScale))
        .call(g => {
          g.select('.domain').remove();
          g.selectAll('.tick line').remove();
          g.selectAll('.tick text')
            .attr('font-weight', 'bold')
            .classed('capitalize', true)
            .attr('dominant-baseline', 'text-after-edge')
            .attr('font-size', yGridLabelFontSize);
        });

    widgetsRight
      .append('div')
      .html(swatches({ color: colorScale, uid: 'stacked-bar-color-legend' }));

    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function validateAndRender$3({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) {
    const yFieldsDimensionTypes = {};
    const yFieldDimensions = {};
    dimensions.yFields.forEach((yf, i) => {
      yFieldsDimensionTypes[`__yField${i}__`] = [shouldBeNumber];
      yFieldDimensions[`__yField${i}__`] = yf;
    });

    const dimensionTypes = {
      xGridField: [shouldNotBeBlank],
      yGridField: [shouldNotBeBlank],
      xField: [shouldNotBeBlank],
      // yFields: ['very poor', 'poor'],
      ...yFieldsDimensionTypes,
    };

    // after spreading out yFields; needed since yFields is an array unlike other dimensions
    const flatDimensions = { ...dimensions, ...yFieldDimensions };
    const optionTypes = {
      /* Headers */
      // heading: checkString,
      // subheading: checkString,

      /* Chart Area */
      aspectRatio: checkNumberBetween(0, Number.POSITIVE_INFINITY),

      marginTop: checkNumber,
      marginRight: checkNumber,
      marginBottom: checkNumber,
      marginLeft: checkNumber,

      bgColor: checkColor,

      colorScheme: checkColorArray(dimensions.yFields.length),
      // colorScheme: ['#926759', '#d0a558'], // // length of colorScheme should be more than or equal to length of dimensions.yFields

      /* Dimensions */
      // xValueTimeParser: '%Y-%m-%d', // 1997-08-17
      // xValueTimeFormatter: '%e %b %Y', // 17 Aug 1997

      /* yField */
      yDomainCustom: checkNumericArray(), // [0, 100],
      yGridPaddingInner: checkNumberBetween(0, 1),
      yGridLabelFontSize: checkNumber,
      showYGridLabels: checkBoolean, // default: false
      yAxisLocation: checkOneOf(['left', 'right']), // default: left
      // yValueFormatter: '.0%',
      // yValuePrefix: '',
      // yValueSuffix: '%',
    };
    const optionsValidationResult = optionValidation({ optionTypes, options });

    d3__namespace.csv(dataPath).then(data => {
      // Run validations
      const { columns } = data;
      const dimensionValidation = validateColumnsWithDimensions({
        columns,
        dimensions: flatDimensions,
      });

      const dataValidations = validateData({
        data,
        dimensionTypes,
        dimensions: flatDimensions,
      });

      // When new validations are added simply add the result to this array
      // When building a new validator the output should be of format:
      // {valid: boolean, message: string}
      const allValidations = [dimensionValidation, optionsValidationResult];

      if (dimensionValidation.valid) allValidations.push(dataValidations);

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
  }

  /* global window*/

  function renderChart$2({
    data,
    options: {
      aspectRatio = 2,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      beforeFieldColor = '#43CAD7',
      afterFieldColor = '#1570A6',

      glyphSize = 5,

      connectorSize = 5,
      connectorColorStrategy = 'farFromReference',
      connectorColorCustom,
      connectorLegendLabelBefore = '',
      connectorLegendLabelAfter = '',

      referenceValue = 0,
      referenceLineColor = '#fff',
      referenceLineWidth = 2,
      referenceLineOpacity = 1,
      referenceLabel = '',

      beforeLegendLabel = beforeField,
      afterLegendLabel = afterField,

      topicLabelFontSize = 12,
      topicLabelTextColor = '#000',
      topicLabelYOffset = 0,

      defaultState = [],

      xScaleType = 'linear', // linear or log
      xScaleLogBase = 10, // applicable only if log scale
      xAxisPosition = 'top',
      xAxisOffset = 0,
      xAxisLabel = '',
      xAXisLabelFontSize = 12,
      xAxisLabelOffset = 30,
      xAxisCustomDomain,
      xAxisTickFontSize = 12,
      xAxisColor = 'black',
      xAxisTickValues,
      xAxisTickOffset = 0,
      xAxisLineThickness = 1,
      xAxisTickFormatter = '',
      xAxisTickRotation = 0,
      xAxisTickAnchor = 'middle',
      xAxisTickBaseline = 'middle',
      xAxisTickValueXOffset = 0,
      xAxisTickValueYOffset = 0,

      activeOpacity = 1,
      inactiveOpacity = 0.3,

      valuePrefix = '',
      valuePostfix = '',
      valueFormatter = '',

      topicLabelXOffset = 5,

      // Opinionated (currently cannot be changed from options)
      yPaddingInner = 0.6,
      yPaddingOuter = 1,

      goToInitialStateButtonClassNames = '',
      searchInputClassNames = '',
      clearAllButtonClassNames = '',
      showAllButtonClassNames = '',
    },
    dimensions: { beforeField, afterField, topicField },
    chartContainerSelector,
  }) {
    const valFormatter = val =>
      `${valuePrefix}${formatNumber(val, valueFormatter)}${valuePostfix}`;

    applyInteractionStyles$1({ inactiveOpacity, activeOpacity });

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

    const tooltipDiv = initializeTooltip$3();
    const topicValues = ___default["default"](data).map(topicField).uniq().value();
    const defaultStateAll = defaultState === 'All' ? topicValues : defaultState;

    const { yScale, xScale, colorScale } = setupScales$1({
      coreChartHeight,
      coreChartWidth,
      yPaddingInner,
      yPaddingOuter,
      beforeLegendLabel,
      afterLegendLabel,
      beforeFieldColor,
      afterFieldColor,
      beforeField,
      afterField,
      topicField,
      data,
      xAxisCustomDomain,
      xScaleType,
      xScaleLogBase,
    });

    renderConnectorLegends({
      connectorColorStrategy,
      connectorLegendLabelBefore,
      connectorLegendLabelAfter,
      beforeFieldColor,
      afterFieldColor,
      widgetsRight,
    });

    renderRefLineLegend({
      referenceLabel,
      referenceLineColor,
      widgetsRight,
      referenceLineWidth,
      referenceLineOpacity,
    });

    renderLegends({ widgetsRight, colorScale });

    const line = d3__namespace
      .line()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y));

    renderXAxis$1({
      chartCore,
      xScale,
      coreChartHeight,
      coreChartWidth,
      xAxisLabelOffset,
      xAxisLabel,
      xAxisPosition,
      xAXisLabelFontSize,
      xAxisTickFontSize,
      xAxisColor,
      xAxisTickValues,
      xAxisOffset,
      xAxisTickOffset,
      xAxisLineThickness,
      xAxisTickFormatter,
      xAxisTickRotation,
      xAxisTickAnchor,
      xAxisTickBaseline,
      xAxisTickValueXOffset,
      xAxisTickValueYOffset,
    });

    renderReferenceLine({
      chartCore,
      referenceValue,
      xScale,
      yScale,
      referenceLineColor,
      referenceLineWidth,
      referenceLineOpacity,
      xAxisOffset,
      xAxisTickOffset,
      line,
      xAxisPosition,
    });

    renderBullets({
      chartCore,
      data,
      topicField,
      activeOpacity,
      beforeField,
      afterField,
      connectorSize,
      afterFieldColor,
      glyphSize,
      beforeFieldColor,
      xScale,
      yScale,
      topicLabelXOffset,
      line,
      defaultStateAll,
      topicLabelFontSize,
      topicLabelTextColor,
      topicLabelYOffset,
      connectorColorCustom,
      referenceValue,
      connectorColorStrategy,
      tooltipDiv,
      valFormatter,
    });

    const handleSearch = searchEventHandler$1(topicValues);
    const search = setupSearch$1({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      topicField,
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

    setupShowAllButton$1({
      widgetsLeft,
      showAllButtonClassNames,
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

  function applyInteractionStyles$1({ inactiveOpacity, activeOpacity }) {
    d3__namespace.select('body')
      .append('style')
      .html(
        `
      g.topics g.topic{
        cursor: pointer;
      }
      g.topics g.topic{
        fill-opacity: ${inactiveOpacity};
        stroke-opacity: ${inactiveOpacity};
      }
      g.topics g.topic.topic-active {
        fill-opacity: ${activeOpacity};
        stroke-opacity: ${activeOpacity};
      }
      g.topics.searching g.topic.topic-matched circle{
        stroke: #333;
        stroke-width: 3;
        stroke-opacity: ${activeOpacity};
      }
      g.topics.searching g.topic.topic-matched text{
        fill-opacity: ${activeOpacity};
      }
      g.topics.searching g.topic.topic-matched path{
        stroke: #333;
        stroke-opacity: ${activeOpacity};
      }
      g.topics g.topic.topic-hovered circle{
        stroke: #333;
        stroke-width: 3;
        stroke-opacity: ${activeOpacity};
      }
      g.topics g.topic.topic-hovered text{
        fill-opacity: ${activeOpacity};
      }
      g.topics g.topic.topic-hovered path{
        stroke: #333;
        stroke-opacity: ${activeOpacity};
      }
      `,
      );
  }

  function setupScales$1({
    coreChartHeight,
    coreChartWidth,
    yPaddingInner,
    yPaddingOuter,
    beforeLegendLabel,
    afterLegendLabel,
    beforeFieldColor,
    afterFieldColor,
    beforeField,
    afterField,
    topicField,
    data,
    xAxisCustomDomain,
    xScaleType,
    xScaleLogBase,
  }) {
    const yDomain = ___default["default"].map(data, topicField);
    const xDomainDefault = d3__namespace.extent(
      ___default["default"].concat(
        ___default["default"].map(data, d => Number.parseFloat(d[beforeField])),
        ___default["default"].map(data, d => Number.parseFloat(d[afterField])),
      ),
    );
    const xDomain = (xAxisCustomDomain || xDomainDefault).slice();

    const yScale = d3__namespace
      .scaleBand()
      .domain(yDomain)
      .range([0, coreChartHeight])
      .paddingInner(yPaddingInner)
      .paddingOuter(yPaddingOuter);

    const xScale =
      xScaleType === 'log'
        ? d3__namespace.scaleLog().base(xScaleLogBase || 10)
        : d3__namespace.scaleLinear();

    xScale.domain(xDomain).range([0, coreChartWidth]);

    if (!xAxisCustomDomain) xScale.nice();

    const colorScale = d3__namespace
      .scaleOrdinal()
      .domain([beforeLegendLabel, afterLegendLabel])
      .range([beforeFieldColor, afterFieldColor]);

    return { yScale, xScale, colorScale }
  }

  function renderXAxis$1({
    chartCore,
    xScale,
    coreChartHeight,
    coreChartWidth,
    xAxisLabelOffset,
    xAxisLabel,
    xAxisPosition,
    xAxisTickOffset,
    xAXisLabelFontSize,
    xAxisTickFontSize,
    xAxisColor,
    xAxisTickValues,
    xAxisOffset,
    xAxisLineThickness,
    xAxisTickFormatter,
    xAxisTickRotation,
    xAxisTickAnchor,
    xAxisTickBaseline,
    xAxisTickValueXOffset,
    xAxisTickValueYOffset,
  }) {
    let xAxis, axisOffset, labelOffset, tickOffset;
    if (xAxisPosition === 'top') {
      xAxis = d3__namespace.axisTop(xScale);
      axisOffset = -xAxisOffset;
      labelOffset = xAxisLabelOffset;
      tickOffset = -xAxisTickOffset;
    } else {
      xAxis = d3__namespace.axisBottom(xScale);
      axisOffset = coreChartHeight + xAxisOffset;
      labelOffset = -xAxisLabelOffset;
      tickOffset = xAxisTickOffset;
    }
    const tickSize = -coreChartHeight - xAxisTickOffset - xAxisOffset;

    const xAxisGroup = chartCore
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${axisOffset})`);

    const xDomain = xScale.domain();
    const tickValues =
      xAxisTickValues &&
      ___default["default"].filter(xAxisTickValues, val => val >= xDomain[0] && val <= xDomain[1]);

    xAxisGroup
      .call(
        xAxis
          .tickSize(tickSize)
          .tickSizeOuter(10)
          .tickValues(tickValues)
          .tickFormat(val => formatNumber(val, xAxisTickFormatter)),
      )
      .call(g =>
        g
          .select('.domain')
          .attr('stroke', xAxisColor)
          .attr('stroke-width', xAxisLineThickness),
      )
      .call(g => {
        g.selectAll('.tick line')
          .attr('stroke-opacity', 0.2)
          .attr('transform', `translate(0, ${tickOffset / 2})`);
        g.selectAll('.tick text')
          .style('font-size', `${xAxisTickFontSize}px`)
          .attr('fill', xAxisColor)
          .attr('transform', function () {
            const { x, y, width, height } = this.getBBox();
            return `translate(0, ${tickOffset}), rotate(${xAxisTickRotation},${x + width / 2},${y + height / 2})`
          })
          .attr('text-anchor', xAxisTickAnchor)
          .attr('dominant-baseline', xAxisTickBaseline)
          .attr('dx', `${xAxisTickValueXOffset}em`)
          .attr('dy', `${xAxisTickValueYOffset}em`);
      });

    xAxisGroup
      .append('text')
      .attr('transform', `translate(${coreChartWidth / 2}, ${-labelOffset})`)
      .text(xAxisLabel)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', `${xAXisLabelFontSize}px`)
      .attr('fill', xAxisColor);
  }

  function renderReferenceLine({
    chartCore,
    referenceValue,
    xScale,
    yScale,
    referenceLineColor,
    referenceLineWidth,
    referenceLineOpacity,
    xAxisOffset,
    xAxisTickOffset,
    xAxisPosition,
  }) {
    chartCore
      .append('path')
      .attr('class', 'reference')
      .attr('d', () => {
        const yDomain = yScale.domain();
        // const { x, y, width, height } = d3.select('.domain').node().getBBox()
        const x0 = xScale(Number(referenceValue));
        let y0, y1;
        if (xAxisPosition === 'top') {
          y0 = yScale(yDomain[0]) - xAxisOffset - xAxisTickOffset;
          y1 = yScale(yDomain[yDomain.length - 1]) + 2 * yScale.bandwidth();
        } else {
          y0 =
            yScale(yDomain[yDomain.length - 1]) +
            yScale.bandwidth() +
            xAxisOffset +
            xAxisTickOffset;
          y1 = yScale(yDomain[0]) - 2 * yScale.bandwidth();
        }
        const d_ = [
          { x: x0, y: y0 },
          { x: x0, y: y1 },
        ];

        return d3__namespace
          .line()
          .x(d => d.x)
          .y(d => d.y)(d_)
      })
      .attr('stroke-width', referenceLineWidth)
      .attr('opacity', referenceLineOpacity)
      .attr('stroke', referenceLineColor)
      .attr('stroke-dasharray', '5,5');
  }

  function renderBullets({
    chartCore,
    data,
    topicField,
    beforeField,
    afterField,
    connectorSize,
    afterFieldColor,
    glyphSize,
    beforeFieldColor,
    xScale,
    yScale,
    topicLabelXOffset,
    line,
    defaultStateAll,
    topicLabelFontSize,
    topicLabelTextColor,
    topicLabelYOffset,
    connectorColorCustom,
    connectorColorStrategy,
    referenceValue,
    tooltipDiv,
    valFormatter,
  }) {
    const yGroups = chartCore
      .append('g')
      .attr('class', 'topics')
      .selectAll('g')
      .data(data);

    // enter selection
    const yGroupsEnter = yGroups
      .enter()
      .append('g')
      .attr(
        'class',
        d =>
          `topic 
        topic-${toClassText(d[topicField])}
        ${defaultStateAll.includes(d[topicField]) ? 'topic-active' : ''}`,
      )
      .attr('id', d => `${d[topicField]}`)
      .on('mouseover', (e, d) => {
        d3__namespace.select(e.target.parentNode).classed('topic-hovered', true);
        tooltipDiv.transition().duration(200).style('opacity', 1);

        tooltipDiv.html(
          `${d[topicField]}
        <br/>
        <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${beforeFieldColor}"></div> ${beforeField}: ${valFormatter(
          d[beforeField],
        )}
        <br />
        <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${afterFieldColor}"></div> ${afterField}: ${valFormatter(
          d[afterField],
        )}
        `,
        );
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', e => {
        d3__namespace.select(e.target.parentNode).classed('topic-hovered', false);
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      })
      .on('click', e => {
        const parentTopic = d3__namespace.select(e.target.parentNode);
        const clickedState = parentTopic.classed('topic-active');
        parentTopic.classed('topic-active', !clickedState);
      });

    yGroupsEnter
      .append('path')
      .attr('class', 'connector')
      .attr('d', d => {
        const d_ = [
          { x: Number(d[beforeField]), y: d[topicField] },
          { x: Number(d[afterField]), y: d[topicField] },
        ];
        return line(d_)
      })
      .attr('stroke-width', connectorSize)
      .attr('stroke', d => {
        const afterDelta = Math.abs(referenceValue - d[afterField]);
        const beforeDelta = Math.abs(referenceValue - d[beforeField]);
        const beforeAfterDelta = beforeDelta - afterDelta;
        let color;
        if (connectorColorStrategy === 'farFromReference') {
          color = beforeAfterDelta < 0 ? afterFieldColor : beforeFieldColor;
        } else if (connectorColorStrategy === 'closeToReference') {
          color = beforeAfterDelta < 0 ? beforeFieldColor : afterFieldColor;
        } else {
          color = connectorColorCustom;
        }
        return color
      });

    yGroupsEnter
      .append('circle')
      .attr('cx', d => xScale(d[beforeField]))
      .attr('cy', d => yScale(d[topicField]))
      .attr('r', glyphSize)
      .attr('fill', beforeFieldColor);

    yGroupsEnter
      .append('circle')
      .attr('cx', d => xScale(d[afterField]))
      .attr('cy', d => yScale(d[topicField]))
      .attr('r', glyphSize)
      .attr('fill', afterFieldColor);

    yGroupsEnter
      .append('text')
      .text(d => d[topicField])
      .attr('x', d => {
        return xScale(d[afterField]) >= xScale(d[beforeField])
          ? xScale(d[afterField]) + glyphSize + topicLabelXOffset
          : xScale(d[afterField]) - glyphSize - topicLabelXOffset
      })
      .attr(
        'y',
        d => yScale(d[topicField]) + topicLabelYOffset + yScale.bandwidth() / 2,
      )
      .attr('fill', topicLabelTextColor)
      .style('font-size', `${topicLabelFontSize}px`)
      .attr('text-anchor', d =>
        xScale(d[afterField]) >= xScale(d[beforeField]) ? 'start' : 'end',
      )
      .attr('dominant-baseline', 'middle');
  }

  const searchEventHandler$1 = referenceList => qstr => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        // d3.selectAll('.mace').classed('mace-active', false)
        const topicName = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          d3__namespace.select(`.topic-${topicName}`).classed('topic-matched', true);
        } else {
          d3__namespace.select(`.topic-${topicName}`).classed('topic-matched', false);
        }
        d3__namespace.select('.topics').classed('searching', true);
      });
    } else {
      referenceList.forEach(val => {
        const topicName = toClassText(val);
        d3__namespace.select(`.topic-${topicName}`).classed('topic-matched', false);
      });
      d3__namespace.select('.topics').classed('searching', false);
    }
  };

  function setupSearch$1({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    topicField,
  }) {
    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);
    // TODO: refactor hidden, won't be needed if we add this node
    search.attr('placeholder', `Find by ${topicField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr);
    });
    return search
  }

  function renderLegends({ widgetsRight, colorScale }) {
    widgetsRight.append('div').html(
      swatches({
        color: colorScale,
        uid: 'rs',
        customClass: '',
        circle: true,
      }),
    );
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
      d3__namespace.selectAll('.topic').classed('topic-active', false);
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
      d3__namespace.selectAll('.topic').classed('topic-active', true);
      search.node().value = '';
      handleSearch('');
    });
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
      d3__namespace.selectAll('.topic').classed('topic-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        d3__namespace.select(`.topic-${toClassText(val)}`).classed('topic-active', true);
      });
      search.node().value = '';
      handleSearch('');
    });
  }

  function renderConnectorLegends({
    connectorColorStrategy,
    connectorLegendLabelBefore,
    connectorLegendLabelAfter,
    beforeFieldColor,
    afterFieldColor,
    widgetsRight,
  }) {
    const connectorColorStrategies = ['farFromReference', 'closeToReference'];
    if (connectorColorStrategies.includes(connectorColorStrategy)) {
      const lineBandsWithColors = [
        {
          type: 'line',
          line: { label: connectorLegendLabelBefore, color: beforeFieldColor },
        },
        {
          type: 'line',
          line: { label: connectorLegendLabelAfter, color: afterFieldColor },
        },
      ];
      widgetsRight
        .append('div')
        .html(lineBandLegend({ lineBandColorScale: lineBandsWithColors }));
    }
  }

  function renderRefLineLegend({
    referenceLabel,
    referenceLineColor,
    widgetsRight,
    referenceLineWidth,
    referenceLineOpacity,
  }) {
    const verticalDashedLineLabels = [{ series: 'ref', label: referenceLabel }];
    const dashedLegendColor = d3__namespace
      .scaleOrdinal()
      .range([referenceLineColor])
      .domain(['ref']);

    widgetsRight.append('div').html(
      dashedLegend({
        labels: verticalDashedLineLabels,
        color: dashedLegendColor,
        swatchWidth: referenceLineWidth,
        lineOpacity: referenceLineOpacity,
      }),
    );
  }

  // export function that

  const dimensionTypes$2 = {
    beforeField: [shouldBeNumber],
    afterField: [shouldBeNumber],
    topicField: [shouldNotBeBlank, shouldBeUnique],
  };

  const optionTypes$2 = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    beforeFieldColor: checkColor,
    afterFieldColor: checkColor,

    glyphSize: checkNumber,

    connectorSize: checkNumber,
    connectorColorStrategy: checkOneOf([
      'farFromReference',
      'closeToReference',
      'customColor',
    ]),
    connectorColorCustom: checkColor,
    // connectorLegendLabelBefore: checkString,
    //   connectorLegendLabelAfter: checkString,

    referenceValue: checkNumber,
    referenceLineColor: checkColor,
    referenceLineWidth: checkNumber,
    referenceLineOpacity: checkNumberBetween(0, 1),
    // referenceLabel: checkString,

    // beforeLegendLabel: checkString,
    // afterLegendLabel: checkString,

    topicLabelFontSize: checkPositiveInteger,
    topicLabelTextColor: checkColor,
    topicLabelYOffset: checkNumber,
    topicLabelXOffset: checkNumber,

    defaultState: checkDefaultState,

    // valuePrefix: checkString,
    // valuePostfix: checkString,
    // valueFormatter: checkString,

    /* Axes */
    // xAxisTitle: checkString,
    xScaleType: checkOneOf(['log', 'linear']), // linear or log
    xScaleLogBase: checkNumber, // applicable only if log scale
    xAxisPosition: checkOneOf(['top', 'bottom']),
    xAxisOffset: checkNumber,
    // xAxisLabel: checkString,
    xAXisLabelFontSize: checkNumber,
    xAxisLabelOffset: checkNumber,
    xAxisCustomDomain: checkNumericArray(),
    xAxisTickFontSize: checkNumber,
    xAxisColor: checkColor,
    xAxisTickValues: checkNumericArray(),
    xAxisTickOffset: checkNumber,
    xAxisLineThickness: checkNumber,
    // xAxisTickFormatter: checkString,
    xAxisTickRotation: checkNumber,
    // xAxisTickAnchor: checkString,
    // xAxisTickBaseline: checkString,
    xAxisTickValueXOffset: checkNumber,
    xAxisTickValueYOffset: checkNumber,

    yPaddingInner: checkNumber,
    yPaddingOuter: checkNumber,

    // searchInputClassNames: checkString,
    // goToInitialStateButtonClassNames: checkString,
    // clearAllButtonClassNames: checkString,
    // showAllButtonClassNames: checkString,

    activeOpacity: checkNumberBetween(0, 1),
    inactiveOpacity: checkNumberBetween(0, 1),
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

  /* global window */

  function renderChart$1({
    data,
    dimensions: { xFieldStart, xFieldEnd, yField, connectionField },
    options: {
      aspectRatio = 2,

      marginTop = 0,
      marginRight = 0,
      marginBottom = 0,
      marginLeft = 0,

      bgColor = 'transparent',

      connectionColor = 'steelblue',
      hoverConnectionColor = 'orange',
      connectionCircleRadius = 5,
      connectionLineWidth = 2,

      yAxisValueFormatter = '.2s',
      xAxisValueFormatter = '.2s',

      defaultState = [],

      xAxisPosition = 'bottom',
      xAxisLabelOffset = 40,
      xAxisLabelFontSize = 12,
      xAxisColor = '#333',
      xAxisLabel = xFieldStart,

      yAxisPosition = 'right',
      yAxisLabelOffset = 50,
      yAXisLabelFontSize = 12,
      yAxisColor = '#333',
      yAxisLabel = yField,

      inactiveOpacity = 0.2,
      searchOpacity = 0.8,
      activeOpacity = 1,

      searchInputClassNames = '',
      showAllButtonClassNames = '',
      clearAllButtonClassNames = '',
      goToInitialStateButtonClassNames = '',
    },
    chartContainerSelector,
  }) {
    applyInteractionStyles({
      activeOpacity,
      inactiveOpacity,
      connectionColor,
      hoverConnectionColor,
      searchOpacity,
    });

    const tooltipDiv = initializeTooltip$3();

    const coreChartWidth = 1200;
    const { svg, widgetsLeft, coreChartHeight, allComponents, chartCore } =
      setupChartArea$5({
        chartContainerSelector,
        coreChartWidth,
        aspectRatio,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        bgColor,
      });

    const { dataParsed, connectionValues, defaultStateAll } = parseData({
      data,
      xFieldStart,
      xFieldEnd,
      yField,
      connectionField,
      defaultState,
    });

    const { yScale, xScale } = setupScales({
      dataParsed,
      coreChartHeight,
      coreChartWidth,
      yField,
      xFieldStart,
      xFieldEnd,
    });

    renderXAxis({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      xScale,
      xAxisValueFormatter,
      xAxisPosition,
      xAxisLabelOffset,
      xAxisLabelFontSize,
      xAxisColor,
      xAxisLabel,
    });

    renderYAxis({
      chartCore,
      coreChartHeight,
      coreChartWidth,
      yScale,
      yAxisValueFormatter,
      yAxisPosition,
      yAxisLabelOffset,
      yAXisLabelFontSize,
      yAxisColor,
      yAxisLabel,
    });

    renderConnections({
      chartCore,
      dataParsed,
      defaultStateAll,
      xFieldStart,
      xFieldEnd,
      xScale,
      yScale,
      yField,
      tooltipDiv,
      connectionField,
      connectionLineWidth,
      connectionCircleRadius,
      xAxisValueFormatter,
    });

    const handleSearch = searchEventHandler(connectionValues);
    const search = setupSearch({
      handleSearch,
      widgetsLeft,
      searchInputClassNames,
      connectionField,
      svg,
    });

    setupInitialStateButton({
      widgetsLeft,
      goToInitialStateButtonClassNames,
      defaultStateAll,
      search,
      handleSearch,
      svg,
    });

    setupClearAllButton({
      widgetsLeft,
      clearAllButtonClassNames,
      search,
      handleSearch,
      svg,
    });

    setupShowAllButton({
      widgetsLeft,
      showAllButtonClassNames,
      search,
      handleSearch,
      svg,
    });

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  function applyInteractionStyles({
    activeOpacity,
    inactiveOpacity,
    connectionColor,
  }) {
    d3__namespace.select('body').append('style').html(`
  g.connections g.connection{
    cursor: pointer;
  }
  g.connections g.connection{
    fill-opacity: ${inactiveOpacity};
    stroke-opacity: ${inactiveOpacity};
    stroke: ${connectionColor};
    fill: ${connectionColor};
    stroke-width: 3;
  }
  g.connections g.connection.connection-active {
    fill-opacity: ${activeOpacity};
    stroke-opacity: ${activeOpacity};
    stroke: ${connectionColor};
    fill: ${connectionColor};
    stroke-width: 3;
  }
  g.connections.searching g.connection.connection-matched{
    stroke: #333;
    stroke-width: 3;
    stroke-opacity: ${activeOpacity};
  }
  g.connections g.connection.connection-hovered {
    stroke: #333;
    stroke-width: 3;
    stroke-opacity: ${activeOpacity};
  }
  `);
  }

  function parseData({
    data,
    xFieldStart,
    xFieldEnd,
    yField,
    connectionField,
    defaultState,
  }) {
    const dataParsed = ___default["default"].map(data, el => {
      const elParsed = { ...el };
      elParsed[xFieldStart] = Number.parseFloat(el[xFieldStart]);
      elParsed[xFieldEnd] = Number.parseFloat(el[xFieldEnd]);
      elParsed[yField] = Number.parseFloat(el[yField]);
      return elParsed
    });

    const connectionValues = ___default["default"](data).map(connectionField).uniq().value();
    const defaultStateAll =
      defaultState === 'All' ? connectionValues : defaultState;

    return { dataParsed, connectionValues, defaultStateAll }
  }

  function setupScales({
    dataParsed,
    coreChartHeight,
    coreChartWidth,
    yField,
    xFieldStart,
    xFieldEnd,
  }) {
    const xDomainStart = ___default["default"].map(dataParsed, xFieldStart);
    const xDomainEnd = ___default["default"].map(dataParsed, xFieldEnd);
    const xDomain = d3__namespace.extent([0, ...xDomainStart, ...xDomainEnd]);
    const xScale = d3__namespace
      .scaleLinear()
      .domain(xDomain)
      .range([0, coreChartWidth])
      .nice();

    const yDomain = d3__namespace.extent([0, ...___default["default"].map(dataParsed, yField)]);
    const yScale = d3__namespace
      .scaleLinear()
      .domain(yDomain)
      .range([coreChartHeight, 0])
      .nice();

    return { yScale, xScale }
  }

  function renderXAxis({
    chartCore,
    coreChartHeight,
    xScale,
    xAxisValueFormatter,
    xAxisPosition,
    xAxisLabelOffset,
    xAxisLabelFontSize,
    xAxisColor,
    coreChartWidth,
    xAxisLabel,
  }) {
    let xAxis, axisOffset, labelOffset;
    if (xAxisPosition === 'top') {
      xAxis = d3__namespace.axisTop(xScale);
      axisOffset = 0;
      labelOffset = -xAxisLabelOffset;
    } else {
      xAxis = d3__namespace.axisBottom(xScale);
      axisOffset = coreChartHeight;
      labelOffset = xAxisLabelOffset;
    }

    xAxis.tickFormat(val => formatNumber(val, xAxisValueFormatter));

    const xAxisGroup = chartCore
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${axisOffset})`)
      .call(xAxis);

    xAxisGroup
      .append('text')
      // .attr('text-anchor', 'middle')
      // .attr('dominant-baseline', 'middle')
      .style('font-size', `${xAxisLabelFontSize}px`)
      .attr('fill', xAxisColor)
      .attr('transform', `translate(${coreChartWidth / 2}, ${labelOffset})`)
      .text(xAxisLabel);
  }

  function renderYAxis({
    chartCore,
    coreChartWidth,
    yScale,
    yAxisValueFormatter,
    yAxisPosition,
    yAxisLabelOffset,
    yAXisLabelFontSize,
    yAxisColor,
    coreChartHeight,
    yAxisLabel,
  }) {
    let yAxis, axisOffset, labelOffset;
    if (yAxisPosition === 'right') {
      yAxis = d3__namespace.axisRight(yScale);
      axisOffset = coreChartWidth;
      labelOffset = yAxisLabelOffset;
    } else {
      yAxis = d3__namespace.axisLeft(yScale);
      axisOffset = 0;
      labelOffset = -yAxisLabelOffset;
    }

    yAxis.tickFormat(val => formatNumber(val, yAxisValueFormatter));

    const yAxisGroup = chartCore
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(${axisOffset},0)`)
      .call(yAxis);

    yAxisGroup
      .append('text')
      // .attr('text-anchor', 'middle')
      // .attr('dominant-baseline', 'middle')
      .style('font-size', `${yAXisLabelFontSize}px`)
      .attr('fill', yAxisColor)
      .attr(
        'transform',
        `translate(${labelOffset}, ${coreChartHeight / 2}) rotate(-90)`,
      )
      .text(yAxisLabel);
  }

  function renderConnections({
    chartCore,
    dataParsed,
    defaultStateAll,
    xFieldStart,
    xFieldEnd,
    xScale,
    yScale,
    yField,
    tooltipDiv,
    connectionField,
    connectionLineWidth,
    connectionCircleRadius,
    xAxisValueFormatter,
  }) {
    const cGroup = chartCore
      .append('g')
      .attr('class', `connections ${___default["default"].isEmpty(defaultStateAll) ? '' : 'default'}`)
      .selectAll('g')
      .data(dataParsed)
      .join('g')
      .attr(
        'class',
        d =>
          `connection 
      connection-${toClassText(d[connectionField])}
      ${
        defaultStateAll.includes(d[connectionField]) ? 'connection-active' : ''
      }`,
      )
      .on('mouseover', (e, d) => {
        d3__namespace.select(e.target.parentNode).classed('connection-hovered', true);

        tooltipDiv.transition().duration(200).style('opacity', 1);

        tooltipDiv.html(
          `${d[connectionField]}: ${formatNumber(
          d[xFieldStart],
          xAxisValueFormatter,
        )} → ${formatNumber(d[xFieldEnd], xAxisValueFormatter)}
        `,
        );
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + 20 + window.scrollY}px`);
      })
      .on('mouseout', e => {
        d3__namespace.select(e.target.parentNode).classed('connection-hovered', false);
        tooltipDiv
          .style('left', '-300px')
          .transition()
          .duration(500)
          .style('opacity', 0);
      })
      .on('click', e => {
        const parentConnection = d3__namespace.select(e.target.parentNode);
        const clickedState = parentConnection.classed('connection-active');
        parentConnection.classed('connection-active', !clickedState);
      });

    cGroup
      .append('path')
      .attr('d', d =>
        d3__namespace.line()([
          [xScale(d[xFieldStart]), yScale(0)],
          [xScale(d[xFieldEnd]), yScale(d[yField])],
        ]),
      )
      .attr('stroke-width', connectionLineWidth);

    cGroup
      .append('circle')
      .attr('cx', d => xScale(d[xFieldStart]))
      .attr('cy', yScale(0))
      .attr('r', connectionCircleRadius)
      .attr('fill', 'white');

    cGroup
      .append('circle')
      .attr('cx', d => xScale(d[xFieldEnd]))
      .attr('cy', d => yScale(d[yField]))
      .attr('r', connectionCircleRadius);
  }

  const searchEventHandler = referenceList => (qstr, svg) => {
    if (qstr) {
      const lqstr = qstr.toLowerCase();
      referenceList.forEach(val => {
        // d3.selectAll('.mace').classed('mace-active', false)
        const connectionName = toClassText(val);
        if (val.toLowerCase().includes(lqstr)) {
          svg
            .select(`.connection-${connectionName}`)
            .classed('connection-matched', true);
        } else {
          svg
            .select(`.connection-${connectionName}`)
            .classed('connection-matched', false);
        }
        svg.select('g.connections').classed('searching', true);
      });
    } else {
      referenceList.forEach(val => {
        const connectionName = toClassText(val);
        svg
          .select(`.connection-${connectionName}`)
          .classed('connection-matched', false);
      });
      svg.select('.connection').classed('searching', false);
    }
  };

  function setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    connectionField,
    svg,
  }) {
    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames);
    // TODO: refactor hidden, won't be needed if we add this node
    search.attr('placeholder', `Find by ${connectionField}`);
    search.on('keyup', e => {
      const qstr = e.target.value;
      handleSearch(qstr, svg);
    });
    return search
  }

  function setupClearAllButton({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
    svg,
  }) {
    const clearAll = widgetsLeft
      .append('button')
      .text('Clear All')
      .attr('class', clearAllButtonClassNames);
    clearAll.classed('hidden', false);
    clearAll.on('click', () => {
      d3__namespace.selectAll('.connection').classed('connection-active', false);
      search.node().value = '';
      handleSearch('', svg);
    });
  }

  function setupShowAllButton({
    widgetsLeft,
    showAllButtonClassNames,
    search,
    handleSearch,
    svg,
  }) {
    const showAll = widgetsLeft
      .append('button')
      .text('Show All')
      .attr('class', showAllButtonClassNames);
    showAll.classed('hidden', false);
    showAll.on('click', () => {
      d3__namespace.selectAll('.connection').classed('connection-active', true);
      search.node().value = '';
      handleSearch('', svg);
    });
  }

  function setupInitialStateButton({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
    svg,
  }) {
    const goToInitialState = widgetsLeft
      .append('button')
      .text('Go to Initial State')
      .attr('class', goToInitialStateButtonClassNames);
    goToInitialState.classed('hidden', false);
    goToInitialState.on('click', () => {
      d3__namespace.selectAll('.connection').classed('connection-active', false);
      ___default["default"].forEach(defaultStateAll, val => {
        d3__namespace.select(`.connection-${toClassText(val)}`).classed(
          'connection-active',
          true,
        );
      });
      search.node().value = '';
      handleSearch('', svg);
    });
  }

  // export function that

  const dimensionTypes$1 = {
    xFieldStart: [shouldBeNumber],
    xFieldEnd: [shouldBeNumber],
    yField: [shouldBeNumber],
    connectionField: [shouldNotBeBlank, shouldBeUnique],
  };

  const optionTypes$1 = {
    /* Headers */
    // heading: checkString,
    // subheading: checkString,

    /* Chart Area */
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    connectionColor: checkColor,
    hoverConnectionColor: checkColor,
    connectionCircleRadius: checkNumber,
    connectionLineWidth: checkNumber,

    defaultState: checkDefaultState,

    // xAxisPosition: checkString,
    // xAxisColor: checkString,
    // xAxisLabel: checkString,
    xAxisLabelOffset: checkNumber,
    xAxisTickRotation: checkNumber,
    xAXisLabelFontSize: checkPositiveInteger,

    yAxisLabelOffset: checkNumber,
    yAXisLabelFontSize: checkPositiveInteger,
    // yAxisPosition: checkString,
    // yAxisColor: checkString,
    // yAxisLabel: checkString,

    inactiveOpacity: checkNumberBetween(0, 1),
    searchOpacity: checkNumberBetween(0, 1),
    activeOpacity: checkNumberBetween(0, 1),
  };

  const validateAndRender$1 = ({
    dataPath,
    options,
    dimensions,
    chartContainerSelector,
  }) => {
    const optionsValidationResult = optionValidation({ optionTypes: optionTypes$1, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
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

  function circleSizeLegend({
    sizeLegendValues,
    sizeScale,
    containerSelection,
    sizeLegendGapInCircles = 5,
    valueFormatter = a => a,
    sizeLegendTitle,
    moveSizeObjectDownBy = 5,
  }) {
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

    const sizeLegendContainerGroup = containerSelection.append('g');

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
      .text((d, i) => valueFormatter(sizeLegendValues[i]));

    sizeLegendContainerGroup
      .append('text')
      .attr('alignment-baseline', 'hanging')
      .style('font-size', 10)
      .style('font-weight', 600)
      .text(sizeLegendTitle);

    const legendBoundingBox = sizeLegendContainerGroup.node().getBBox();
    containerSelection
      .attr('height', legendBoundingBox.height)
      .attr('width', legendBoundingBox.width);
  }

  /* global window */
  // import { preventOverflowThrottled } from '../../utils/helpers/general'

  function renderChart({
    data,
    dimensions: { sizeField, yField, nameField },
    options: {
      aspectRatio = 1,

      marginBottom = 0,
      marginLeft = 0,
      marginRight = 0,
      marginTop = 0,

      bgColor = 'transparent',

      sizeRange = [2, 20],

      customColorScheme,
      inbuiltScheme = 'schemeOrRd',
      numberOfColors = 5,

      colorLegendTitle = yField,

      sizeValueFormat = '',
      sizeValuePrefix = '',
      sizeValuePostfix = '',
      sizeLegendGapInCircles = 10,
      sizeLegendTitle = sizeField,
      sizeLegendValues = [100, 20000, 50000],

      yValueFormat = '',
      yValuePrefix = '',
      yValuePostfix = '',

      searchInputClassNames = '',

      // force simulation options
      collisionDistance = 0.5,
      circleDiameter = 400, // controls yRange
      yForceStrength = 0.5,
      collisionForceStrength = 0.8,
      radialForceCircleDiameter = 140,
      radialForceStrength = 0.15,
      manyBodyForceStrength = -12, // positive means attraction

      // TODO: make circleDiameter and radialForceCircleDiameter as a ratio of coreChartHeight (or Width?)
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

    const tooltipDiv = initializeTooltip$3();

    const sizeValueFormatter = val =>
      `${sizeValuePrefix}${formatNumber(val, sizeValueFormat)}${sizeValuePostfix}`;

    const yValueFormatter = val =>
      `${yValuePrefix}${formatNumber(val, yValueFormat)}${yValuePostfix}`;

    const coreChartWidth = 1000;
    const {
      // svg,
      coreChartHeight,
      // allComponents,
      chartCore,
      widgetsRight,
      widgetsLeft,
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

    const parsedData = data.map(d => ({
      ...d,
      [sizeField]: Number.parseFloat(d[sizeField]),
      [yField]: Number.parseFloat(d[yField]),
    }));

    const maxSizeValue = Math.max(...parsedData.map(c => c[sizeField]));

    const yDomain = d3__namespace.extent(parsedData.map(d => d[yField]));

    const sizeScale = d3__namespace.scaleSqrt().range(sizeRange).domain([0, maxSizeValue]);

    const yRange = circleDiameter;

    const yScale = d3__namespace
      .scaleLinear()
      .domain(yDomain)
      .range([coreChartHeight / 2 - yRange / 2, coreChartHeight / 2 + yRange / 2]);

    const bubbles = chartCore.append('g').attr('class', 'bubbles');

    const yColorScale = d3__namespace
      .scaleQuantize()
      .domain(yDomain)
      .range(customColorScheme || d3__namespace[inbuiltScheme][numberOfColors])
      .nice();

    let allBubbles;
    function ticked() {
      const u = bubbles.selectAll('circle').data(parsedData);
      allBubbles = u
        .enter()
        .append('circle')
        .attr('r', d => sizeScale(d[sizeField]))
        .style('fill', function (d) {
          return yColorScale(d[yField])
        })
        .attr('stroke', function (d) {
          return d3__namespace.rgb(yColorScale(d[yField])).darker(0.7)
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
            `<div>${d[nameField]}</div>
         <div style="display: flex">
           <div style="text-transform: capitalize">${yField}:</div>
           <div style="padding-left: 0.25rem; font-weight: bold">${yValueFormatter(
             d[yField],
           )}</div>
         </div>
         <div style="display: flex">
           <div style="text-transform: capitalize">${sizeField}:</div>
           <div style="padding-left: 0.25rem; font-weight: bold">${sizeValueFormatter(
             d[sizeField],
           )}</div>
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
      // preventOverflowThrottled({
      //   allComponents,
      //   svg,
      //   margins: { marginLeft, marginRight, marginTop, marginBottom },
      // })
    }

    const raidalForceCircleRadius = radialForceCircleDiameter / 2;

    d3__namespace.forceSimulation(parsedData)
      .force('y', d3__namespace.forceY(d => yScale(d[yField])).strength(yForceStrength))
      .force(
        'collision',
        d3__namespace
          .forceCollide(function (d) {
            return sizeScale(d[sizeField]) + collisionDistance
          })
          .strength(collisionForceStrength),
      )
      .force('center', d3__namespace.forceCenter(coreChartWidth / 2, coreChartHeight / 2))
      .force(
        'radial',
        d3__namespace
          .forceRadial(
            raidalForceCircleRadius,
            coreChartWidth / 2,
            coreChartHeight / 2,
          )
          .strength(radialForceStrength),
      )
      .force(
        'manyBody',
        d3__namespace.forceManyBody().distanceMax(100).strength(manyBodyForceStrength),
      )
      .on('tick', ticked);

    widgetsRight
      .append('svg')
      .attr('width', 260)
      .attr('height', 45)
      .append(() =>
        legend({
          color: yColorScale,
          title: colorLegendTitle,
          width: 260,
          tickFormat: yValueFormatter,
        }),
      );

    const sizeLegend = widgetsRight.append('svg');

    circleSizeLegend({
      sizeLegendValues,
      sizeScale,
      containerSelection: sizeLegend,
      moveSizeObjectDownBy: 10,
      sizeLegendGapInCircles,
      valueFormatter: sizeValueFormatter,
      sizeLegendTitle,
    });

    const search = widgetsLeft
      .append('input')
      .attr('type', 'text')
      .attr('class', searchInputClassNames)
      .attr('placeholder', `Find by ${nameField}`);

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

    // preventOverflow({
    //   allComponents,
    //   svg,
    //   margins: { marginLeft, marginRight, marginTop, marginBottom },
    // })
  }

  const dimensionTypes = {
    sizeField: [shouldBeNumber],
    yField: [shouldBeNumber],
    nameField: [shouldNotBeBlank],
  };

  const optionTypes = {
    aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

    marginTop: checkNumber,
    marginRight: checkNumber,
    marginBottom: checkNumber,
    marginLeft: checkNumber,

    bgColor: checkColor,

    sizeRange: checkNumericArray(2),

    customColorScheme: checkColorArray,
    inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
    numberOfColors: checkNumberBetween(3, 9),

    collisionDistance: checkNumber,

    circleDiameter: checkNumberBetween(0, Number.MAX_SAFE_INTEGER),
    yForceStrength: checkNumberBetween(0, Number.MAX_SAFE_INTEGER), // can't be negative
    collisionForceStrength: checkNumberBetween(0, Number.MAX_SAFE_INTEGER),
    radialForceCircleDiameter: checkNumberBetween(0, Number.MAX_SAFE_INTEGER),
    radialForceStrength: checkNumber,
    manyBodyForceStrength: checkNumber, // positive means attraction

    // colorLegendTitle = yField,

    // sizeValueFormat = '',
    // sizeValuePrefix = '',
    // sizeValuePostfix = '',
    sizeLegendGapInCircles: checkNumber,
    // sizeLegendTitle = sizeField,
    sizeLegendValues: checkNumericArray(),

    // yValueFormat = '',
    // yValuePrefix = '',
    // yValuePostfix = '',

    // searchInputClassNames = '',
  };

  function validateAndRender({
    dataPath,
    dimensions,
    options,
    chartContainerSelector,
  }) {
    const optionsValidationResult = optionValidation({ optionTypes, options });

    d3__namespace[fileExtension(dataPath)](dataPath).then(data => {
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

  exports.renderBubbleHorizontal = renderChart$i;
  exports.renderBulletBeforeAfter = renderChart$2;
  exports.renderCalendar = renderChart$e;
  exports.renderChord = renderChart$7;
  exports.renderChoroplethCounties = renderChart$9;
  exports.renderChoroplethStates = renderChart$8;
  exports.renderComparativeBar = renderChart$5;
  exports.renderDominoBase = renderChart$h;
  exports.renderDominoRibbon = renderChart$b;
  exports.renderLineBandScatter = renderChart$f;
  exports.renderMace = renderChart$k;
  exports.renderMotionBubble = renderChart$d;
  exports.renderMotionTrack = renderChart$c;
  exports.renderOverlapArea = renderChart$a;
  exports.renderOverlapBar = renderChart$4;
  exports.renderPackedBubble = renderChart;
  exports.renderParallelConnections = renderChart$1;
  exports.renderRidgeline = renderChart$g;
  exports.renderSankey = renderChart$j;
  exports.renderStackedBar = renderChart$3;
  exports.renderTriangle = renderChart$6;
  exports.validateAndRenderBubbleHorizontal = validateAndRender$i;
  exports.validateAndRenderBulletBeforeAfter = validateAndRender$2;
  exports.validateAndRenderCalendar = validateAndRender$e;
  exports.validateAndRenderChord = validateAndRender$7;
  exports.validateAndRenderChoroplethCounties = validateAndRender$9;
  exports.validateAndRenderChoroplethStates = validateAndRender$8;
  exports.validateAndRenderComparativeBar = validateAndRender$5;
  exports.validateAndRenderDominoBase = validateAndRender$h;
  exports.validateAndRenderDominoRibbon = validateAndRender$b;
  exports.validateAndRenderLineBandScatter = validateAndRender$f;
  exports.validateAndRenderMace = validateAndRender$k;
  exports.validateAndRenderMotionBubble = validateAndRender$d;
  exports.validateAndRenderMotionTrack = validateAndRender$c;
  exports.validateAndRenderOverlapArea = validateAndRender$a;
  exports.validateAndRenderOverlapBar = validateAndRender$4;
  exports.validateAndRenderPackedBubble = validateAndRender;
  exports.validateAndRenderParallelConnections = validateAndRender$1;
  exports.validateAndRenderRidgeline = validateAndRender$g;
  exports.validateAndRenderSankey = validateAndRender$j;
  exports.validateAndRenderStackedBar = validateAndRender$3;
  exports.validateAndRenderTriangle = validateAndRender$6;

  Object.defineProperty(exports, '__esModule', { value: true });

}));