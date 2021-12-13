import * as d3 from 'd3'
import { renderChart } from './render'

import {
  shouldNotBeBlank,
  shouldBeNumber,
  validateData,
} from '../../utils/validation/dataValidations'
import {
  checkBoolean,
  checkColor,
  checkColorArray,
  checkNumber,
  checkNumberBetween,
  checkNumericArray,
  checkOneOf,
  optionValidation,
} from '../../utils/validation/optionValidations'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'

export function validateAndRender({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) {
  const yFieldsDimensionTypes = {}
  const yFieldDimensions = {}
  dimensions.yFields.forEach((yf, i) => {
    yFieldsDimensionTypes[`__yField${i}__`] = [shouldBeNumber]
    yFieldDimensions[`__yField${i}__`] = yf
  })

  const dimensionTypes = {
    xGridField: [shouldNotBeBlank],
    yGridField: [shouldNotBeBlank],
    xField: [shouldNotBeBlank],
    // yFields: ['very poor', 'poor'],
    ...yFieldsDimensionTypes,
  }

  // after spreading out yFields; needed since yFields is an array unlike other dimensions
  const flatDimensions = { ...dimensions, ...yFieldDimensions }
  const optionTypes = {
    /* Headers */
    // heading: checkString,
    // subheading: checkString,

    /* Chart Area */
    aspectRatio: checkNumberBetween([0, Number.POSITIVE_INFINITY]),

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
    yDomainCustom: checkNumericArray, // [0, 100],
    yGridPaddingInner: checkNumberBetween([0, 1]),
    showYGridLabels: checkBoolean, // default: false
    yAxisLocation: checkOneOf(['left', 'right']), // default: left
    // yValueFormatter: '.0%',
    // yValuePrefix: '',
    // yValueSuffix: '%',
  }
  const optionsValidationResult = optionValidation({ optionTypes, options })

  d3.csv(dataPath).then(data => {
    // Run validations
    const { columns } = data
    const dimensionValidation = validateColumnsWithDimensions({
      columns,
      dimensions: flatDimensions,
    })

    const dataValidations = validateData({
      data,
      dimensionTypes,
      dimensions: flatDimensions,
    })

    // When new validations are added simply add the result to this array
    // When building a new validator the output should be of format:
    // {valid: boolean, message: string}
    const allValidations = [dimensionValidation, optionsValidationResult]

    if (dimensionValidation.valid) allValidations.push(dataValidations)

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
