import * as d3 from 'd3'
import {
  shouldBeUnique,
  shouldBeNumber,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'
import {
  checkNumber,
  checkColor,
  checkNumberBetween,
  optionValidation,
  checkStringArray,
  checkBoolean,
  checkColorArray,
} from '../../utils/validation/optionValidations'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'
import { fileExtension } from '../../utils/helpers/general'
import { renderChart } from './render'

const dimensionTypes = {
  xGridField: [shouldNotBeBlank],
  yGridField: [shouldNotBeBlank],
  xField: [shouldNotBeBlank],
  nameField: [shouldNotBeBlank],
  uniqueColumnField: [shouldBeUnique], // identifies each column uniquely
  // yFieldsDimensionTypes will be added dynamically
}

const optionTypes = {
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
    yFieldLabels: checkStringArray(yFields.length),
    colorScheme: checkColorArray(yFields.length),
  }

  return { flatDimensions, dimensionTypesWYFields, optionTypesWYFields }
}

export const validateAndRender = ({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) => {
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
