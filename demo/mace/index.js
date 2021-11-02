// import { validateAndRenderMace } from '../../charts/mace'

// mace.validateAndRender
// mace.renderMace

// eslint-disable-next-line no-unused-vars
const dataPath = 'maceData.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  xFieldStart: 'gdp_pc_start', // Numeric
  xFieldEnd: 'gdp_pc_end', // Numeric
  yFieldStart: 'happiness_start', // Numeric
  yFieldEnd: 'happiness_end', // Numeric
  sizeField: 'population', // Numeric
  nameField: 'country', // Categorial
}

// eslint-disable-next-line no-unused-vars
const options = {
  /* Headers */
  heading: 'Mace',
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
}

viz.validateAndRenderMace({ dataPath, options, dimensions })