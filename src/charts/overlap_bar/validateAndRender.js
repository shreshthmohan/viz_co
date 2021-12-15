import * as d3 from 'd3'
import { fileExtension } from '../../utils/helpers/general'
import {
  shouldBeNumber,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'
import {
  checkColor,
  checkColorArray,
  checkNumber,
  checkNumberBetween,
  checkPositiveInteger,
  optionValidation,
} from '../../utils/validation/optionValidations'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'

import { renderChart } from './render'

const dimensionTypes = { xField: [shouldNotBeBlank] }

const optionTypes = {
  aspectRatio: checkNumberBetween([0.01, Number.POSITIVE_INFINITY]),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  barOpacity: checkNumberBetween([0, 1]),

  colors: checkColorArray,

  showOnlyEveryNthValue: checkPositiveInteger,
}

function buildDimensionAndTypes({ dimensions, dimensionTypes, optionTypes }) {
  const yFieldsDimensionTypes = {}
  const yFieldDimensions = {}
  const yFields = dimensions.yFields

  yFields.forEach((yf, i) => {
    yFieldsDimensionTypes[`__yField${i}__`] = [shouldBeNumber]
    yFieldDimensions[`__yField${i}__`] = yf
  })

  // after spreading out yFields; needed since yFields is an array unlike other dimensions
  const flatDimensions = { ...dimensions, ...yFieldDimensions }

  const dimensionTypesWYFields = {
    ...dimensionTypes,
    // order: bottom to top; first value's rectangle will be on the bottom
    // the last value's rectangle will be on the top
    ...yFieldsDimensionTypes,
  }

  const optionTypesWYFields = {
    ...optionTypes,
    colors: checkColorArray(yFields.length),
  }

  return { flatDimensions, dimensionTypesWYFields, optionTypesWYFields }
}

export function validateAndRender({
  dataPath,
  options,
  dimensions,

  chartContainerSelector,
}) {
  d3[fileExtension(dataPath)](dataPath).then(data => {
    const { columns } = data

    const { flatDimensions, dimensionTypesWYFields, optionTypesWYFields } =
      buildDimensionAndTypes({
        dimensions,
        dimensionTypes,
        optionTypes,
      })

    const optionsValidationResult = optionValidation({
      optionTypes: optionTypesWYFields,
      options,
    })

    const dimensionValidation = validateColumnsWithDimensions({
      columns,
      dimensions: flatDimensions,
    })

    const dataValidations = validateData({
      data,
      dimensionTypes: dimensionTypesWYFields,
      dimensions: flatDimensions,
    })

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
