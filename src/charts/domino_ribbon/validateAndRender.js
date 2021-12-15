import * as d3 from 'd3'
import {
  shouldBeNumber,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'
import {
  checkNumber,
  checkOneOf,
  checkColor,
  checkNumberBetween,
  optionValidation,
  checkNumericArray,
  checkDefaultState,
  checkColorArray,
} from '../../utils/validation/optionValidations'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'
import { renderChart } from './render'

const dimensionTypes = {
  xField: [shouldBeNumber],
  yField: [shouldNotBeBlank],
  dominoField: [shouldNotBeBlank],
  sizeField: [shouldBeNumber],
  colorField: [shouldBeNumber],
}

const optionTypes = {
  aspectRatio: checkNumberBetween([0, Number.POSITIVE_INFINITY]),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  xDomain: checkNumericArray(2),
  // xAxisLabel: checkString,
  xAxisLabelOffset: checkNumber,
  // xAxisValueFormatter:  checkString, //'',
  dominoHeight: checkNumberBetween([0, 1]),
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

  activeOpacity: checkNumberBetween([0, 1]),
  inactiveOpacity: checkNumberBetween([0, 1]),
}

export const validateAndRender = ({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) => {
  const optionsValidationResult = optionValidation({ optionTypes, options })

  d3.csv(dataPath).then(data => {
    const { columns } = data

    const dimensionValidation = validateColumnsWithDimensions({
      columns,
      dimensions,
    })

    const dataValidations = validateData({ data, dimensionTypes, dimensions })

    // When new validations are added simply add the result to this array
    // When building a new validator the output should be of format:
    // {valid: boolean, message: string}
    const allValidations = [
      dimensionValidation,
      dataValidations,
      optionsValidationResult,
    ]

    const combinedValidation = { valid: true, messages: [] }

    allValidations.forEach(v => {
      combinedValidation.valid = combinedValidation.valid && v.valid
      if (!v.valid) {
        combinedValidation.messages.push(v.message)
      }
    })

    combinedValidation.valid
      ? renderChart({ data, dimensions, options, chartContainerSelector })
      : showErrors(chartContainerSelector, combinedValidation.messages)
  })
}
