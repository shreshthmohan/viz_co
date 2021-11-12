"use strict";
exports.__esModule = true;
/* global viz */
var index_1 = require("./index");
// eslint-disable-next-line no-unused-vars
var dataPath = 'data.csv';
// eslint-disable-next-line no-unused-vars
var dimensions = {
    xFieldStart: 'gdp_pc_start',
    xFieldEnd: 'gdp_pc_end',
    yFieldStart: 'happiness_start',
    yFieldEnd: 'happiness_end',
    sizeField: 'population',
    nameField: 'country'
};
// eslint-disable-next-line no-unused-vars
var options = {
    /* Headers */
    heading: 'Mace',
    subheading: 'GDP per person vs. self reported happiness',
    /* Chart Area */
    containerWidth: 'max-w-screen-lg',
    aspectRatio: 2,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    bgColor: '#fafafa',
    /* Dimensions */
    /* xField */
    xAxisTitle: 'GDP per capita (PPP US$)',
    xFieldType: 'GDP per capita',
    xAxisTickValues: [400, 1000, 3000, 8000, 25000, 60000, 160000],
    xScaleType: 'log',
    xScaleLogBase: Math.E,
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
    activeOpacity: '',
    inactiveOpacity: 0.2,
    searchInputClassNames: 'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
    // 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md overscroll-y-auto',
    goToInitialStateButtonClassNames: 'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
    clearAllButtonClassNames: 'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border'
};
index_1.validateAndRenderMace({ dataPath: dataPath, options: options, dimensions: dimensions });
