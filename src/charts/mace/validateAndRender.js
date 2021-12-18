// export function that
// accepts data path, dimensions and options, target node(s)
// validates data, dimensions and options
// call render function

import * as d3 from 'd3'

import {
  shouldBeNumber,
  shouldNotBeBlank,
  shouldBeUnique,
  validateData,
} from '../../utils/validation/dataValidations'

import {
  checkOneOf,
  checkNumber,
  checkNumberBetween,
  checkColor,
  checkNumericArray,
  checkDefaultState,
  optionValidation,
} from '../../utils/validation/optionValidations'

import {
  validateColumnsWithDimensions,
  showErrors,
} from '../../utils/validation/validations'
import { fileExtension } from '../../utils/helpers/general'

import { renderChart } from './render'

const dimensionTypes = {
  xFieldStart: [shouldBeNumber],
  xFieldEnd: [shouldBeNumber],
  yFieldStart: [shouldBeNumber],
  yFieldEnd: [shouldBeNumber],
  sizeField: [shouldBeNumber],
  nameField: [shouldNotBeBlank, shouldBeUnique],
}

const optionTypes = {
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

  activeOpacity: checkNumberBetween(0, 1),
  inactiveOpacity: checkNumberBetween(0, 1),
}

export const validateAndRender = ({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) => {
  const optionsValidationResult = optionValidation({ optionTypes, options })

  d3[fileExtension(dataPath)](dataPath).then(data => {
    // Run validations
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

    // eslint-disable-next-line no-console
    // console.log({ combinedValidation })
  })
}
