(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('d3'), require('lodash')) :
  typeof define === 'function' && define.amd ? define(['d3', 'lodash'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.d3, global._));
})(this, (function (d3, _) { 'use strict';

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

  var d3__namespace = /*#__PURE__*/_interopNamespace(d3);
  var ___namespace = /*#__PURE__*/_interopNamespace(_);

  const formatNumber = function (
    value,
    formatter = '',
    scientificNotations = false,
  ) {
    const formattedValue = d3__namespace.format(formatter)(value);
    return scientificNotations
      ? formattedValue
      : ___namespace.replace(formattedValue, 'G', 'B')
  };

  function renderDirectionLegend({
    selector = '#direction-legend',
    circleRadius = 5,
    stickLength = 30,
    stickWidth = 2,
    directionStartLabel = 'start',
    directionEndLabel = 'end',
    gapForText = 5,
  }) {
    const directionLegend = d3.select(selector).append('svg');
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

  const svgParentNodeSelector = '#svg-container';

  function renderChart({
    data,
    options: {
      aspectRatio = 2,

      marginTop = 60,
      marginRight = 90,
      marginBottom = 20,
      marginLeft = 50,

      bgColor = 'transparent',

      oppositeDirectionColor = '#ee4e34',
      sameDirectionColor = '#44a8c1',

      containerWidth = 'max-w-screen-lg',

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
      heading = 'This is a heading for the chart',
      subheading = 'This is a subheading for the chart describing it in more detail',

      xFieldType = `${xFieldStart} → ${xFieldEnd}`,
      yFieldType = `${yFieldStart} → ${yFieldEnd}`,

      xAxisTickValues,

      xScaleType = 'linear', // linear or log
      xScaleLogBase = 10, // applicable only if log scale

      defaultState = [],

      activeOpacity = 0.8, // click, hover, search
      inactiveOpacity = 0.2,

      circleSizeRange = [5, 30],
      lineWidthRange = [2, 4],
    },
    dimensions: {
      xFieldStart,
      xFieldEnd,
      yFieldStart,
      yFieldEnd,
      sizeField,
      nameField,
    },
  }) {
    // const {
    //   xFieldStart,
    //   xFieldEnd,
    //   yFieldStart,
    //   yFieldEnd,
    //   sizeField,
    //   nameField,
    // } = dimensions

    // const {
    //   aspectRatio = 2,

    //   marginTop = 60,
    //   marginRight = 90,
    //   marginBottom = 20,
    //   marginLeft = 50,

    //   bgColor = 'transparent',

    //   oppositeDirectionColor = '#ee4e34',
    //   sameDirectionColor = '#44a8c1',

    //   containerWidth = 'max-w-screen-lg',

    //   yAxisTitle = 'y axis title',
    //   xAxisTitle = 'x axis title',

    //   xValueFormatter = '',
    //   yValueFormatter = '',

    //   directionStartLabel = 'start point',
    //   directionEndLabel = 'end point',
    //   sizeLegendValues = [1e6, 1e8, 1e9],
    //   sizeLegendMoveSizeObjectDownBy = 5,
    //   sizeLegendTitle = 'size legend title',
    //   sizeValueFormatter = '',
    //   heading = 'This is a heading for the chart',
    //   subheading = 'This is a subheading for the chart describing it in more detail',

    //   xFieldType = `${xFieldStart} → ${xFieldEnd}`,
    //   yFieldType = `${yFieldStart} → ${yFieldEnd}`,

    //   xAxisTickValues,

    //   xScaleType = 'linear', // linear or log
    //   xScaleLogBase = 10, // applicable only if log scale

    //   defaultState = [],

    //   activeOpacity = 0.8, // click, hover, search
    //   inactiveOpacity = 0.2,

    //   circleSizeRange = [5, 30],
    //   lineWidthRange = [2, 4],
    // } = options

    d3__namespace.select('#main-container').classed(`${containerWidth}`, true);

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

    // Headers
    d3__namespace.select('#chart-heading').node().textContent = heading;
    d3__namespace.select('#chart-subheading').node().textContent = subheading;

    // Chart Area
    const coreChartWidth = 1000;
    const coreChartHeight = coreChartWidth / aspectRatio;

    const viewBoxHeight = coreChartHeight + marginTop + marginBottom;
    const viewBoxWidth = coreChartWidth + marginLeft + marginRight;

    const svgParent = d3__namespace.select(svgParentNodeSelector);

    const svg = svgParent
      .append('svg')
      .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
      .style('background', bgColor);

    const allComponents = svg.append('g').attr('class', 'all-components');

    const chartCore = allComponents
      .append('g')
      .attr('transform', `translate(${marginLeft}, ${marginTop})`);

    const toClassText = str => str.replace(/\s/g, '-').toLowerCase();
    const tooltipDiv = d3__namespace
      .select('body')
      .append('div')
      .attr(
        'class',
        'dom-tooltip absolute text-center bg-white rounded px-2 py-1 text-xs border',
      )
      .style('opacity', 0);

    const dataParsed = data
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
      .filter(d => !Number.isNaN(d.slope));

    const nameValues = ___namespace(data).map(nameField).uniq().value();
    const defaultStateAll = defaultState === 'All' ? nameValues : defaultState;

    const yDomainStart = dataParsed.map(el => Number.parseFloat(el[yFieldStart]));
    const yDomainEnd = dataParsed.map(el => Number.parseFloat(el[yFieldEnd]));
    const yDomain = d3__namespace.extent([...yDomainStart, ...yDomainEnd]);
    const yScale = d3__namespace
      .scaleLinear()
      .range([coreChartHeight, 0])
      .domain(yDomain)
      .nice();

    // TODO: issue with slope, should be calculated after x and  y scales are defined
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

    // Area of circle should be proportional to the population
    const sizeMax = d3__namespace.max(dataParsed.map(el => el[sizeField]));

    const circleSizeScale = d3__namespace
      .scaleSqrt()
      .range(circleSizeRange)
      .domain([0, sizeMax]);
    const lineWidthScale = d3__namespace
      .scaleSqrt()
      .range(lineWidthRange)
      .domain([0, sizeMax]);

    const sizeValues = sizeLegendValues.map(a => circleSizeScale(a));

    // TODO: move to options?
    const gapInCircles = 30;

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

    const sizeLegend = d3__namespace.select('#size-legend').append('svg');
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

    const colorScale = slope =>
      slope > 0 ? sameDirectionColor : oppositeDirectionColor;

    const stickHeight = 3;
    const stickLength = 30;
    const stickWidthLegend = 1;
    const ballRadius = 6;
    const gapForText = 5;
    const singleMaceSectionHeight = 20;
    const colorLegend = d3__namespace.select('#color-legend').append('svg');
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

    renderDirectionLegend({
      selector: '#direction-legend',
      ballRadius,
      stickLength,
      stickWidthLegend,
      gapForText,
      directionStartLabel,
      directionEndLabel,
    });

    // x-axis
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

    // y-axis
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
        const circleRadius = circleSizeScale(d.population);
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
        ${___namespace.capitalize(sizeField)}: ${sizeFieldValue}
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

    const searchEventHandler = qstr => {
      if (qstr) {
        const lqstr = qstr.toLowerCase();
        nameValues.forEach(val => {
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
        nameValues.forEach(val => {
          const maceName = toClassText(val);
          d3__namespace.select(`.mace-${maceName}`).classed('mace-matched', false);
        });
        d3__namespace.select('.maces').classed('searching', false);
      }
    };

    const search = d3__namespace.select('#search');
    search.attr('placeholder', `Find by ${nameField}`).classed('hidden', false);
    search.on('keyup', e => {
      const qstr = e.target.value;
      searchEventHandler(qstr);
    });

    const goToInitialState = d3__namespace.select('#initial-state');
    goToInitialState.classed('hidden', false);
    goToInitialState.on('click', () => {
      d3__namespace.selectAll('.mace').classed('mace-active', false);
      ___namespace.forEach(defaultStateAll, val => {
        d3__namespace.select(`.mace-${toClassText(val)}`).classed('mace-active', true);
      });
      search.node().value = '';
      searchEventHandler('');
    });

    const clearAll = d3__namespace.select('#clear-all');
    clearAll.classed('hidden', false);
    clearAll.on('click', () => {
      d3__namespace.selectAll('.mace').classed('mace-active', false);
      search.node().value = '';
      searchEventHandler('');
    });

    // For responsiveness
    // adjust svg to prevent overflows
    preventOverflow({
      allComponents,
      svg,
      margins: { marginLeft, marginRight, marginTop, marginBottom },
    });
  }

  // eslint-disable-next-line no-unused-vars
  const dataPath = 'data.csv';

  // eslint-disable-next-line no-unused-vars
  const dimensions = {
    xFieldStart: 'gdp_pc_start', // Numeric
    xFieldEnd: 'gdp_pc_end', // Numeric
    yFieldStart: 'happiness_start', // Numeric
    yFieldEnd: 'happiness_end', // Numeric
    sizeField: 'population', // Numeric
    nameField: 'country', // Categorial
  };

  // eslint-disable-next-line no-unused-vars
  const options = {
    /* Headers */
    heading: 'Mace ',
    subheading: 'GDP per person vs. self reported happiness',

    /* Chart Area */
    containerWidth: 'max-w-screen-lg', // ['max-w-screen-sm', 'max-w-screen-md', 'max-w-screen-lg', 'max-w-screen-xl', 'max-w-screen-2xl', 'max-w-full']
    aspectRatio: 3,

    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,

    bgColor: '#fafafa', // background color

    /* Dimensions */
    /* xField */
    xAxisTitle: 'GDP per capita (PPP US$)',
    xFieldType: 'GDP per capita',
    xAxisTickValues: [400, 1000, 3000, 8000, 25000, 60000, 160000], // comment this for automatic tick values
    xScaleType: 'log', // linear or log
    xScaleLogBase: Math.E, // applicable only if log scale (will be 10 if not provided)
    xValueFormatter: '.2f',

    /* yField */
    yAxisTitle: 'Happiness',
    yFieldType: 'Happiness',
    yValueFormatter: '.2f',

    /* sizeField */
    sizeLegendValues: [1e6, 1e8, 1e9],
    sizeLegendMoveSizeObjectDownBy: 0,
    sizeLegendTitle: 'Population',
    sizeValueFormatter: '.2s',

    /* Legends */
    oppositeDirectionColor: '#ee4e34',
    sameDirectionColor: '#44a8c1',
    directionStartLabel: '2008',
    directionEndLabel: '2018',

    /* Initial State */
    // 'All' to make all maces actives
    defaultState: [
      'India',
      'China',
      'Afghanistan',
      'Tanzania',
      'Thailand',
      'United States',
      'Kuwait',
      'Italy',
      'Poland',
    ],
    // defaultState: 'All',

    /* Interactions */
    activeOpacity: 0.8,
    inactiveOpacity: 0.2,
  };

  d3__namespace.csv(dataPath).then(data => {
    renderChart({ data, options, dimensions });
  });

}));
