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
  checkNumber,
  checkNumberBetween,
  checkColor,
  checkDefaultState,
  optionValidation,
  checkPositiveInteger,
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
  yFieldEnd: [shouldBeNumber],
  connectionField: [shouldNotBeBlank, shouldBeUnique],
}

const optionTypes = {
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
