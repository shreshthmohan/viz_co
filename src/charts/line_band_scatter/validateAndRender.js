import * as d3 from 'd3'

import { shouldNotBeBlank } from '../../utils/validation/dataValidations'
import { renderChart } from './render'

import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'
import { validateData } from '../../utils/validation/dataValidations'

import { validateBandFields } from './bandValidation'
import {
  checkColor,
  checkNumber,
  checkColorArray,
  checkNumberBetween,
  optionValidation,
} from '../../utils/validation/optionValidations'

// Note about missing validations:
// 1. yFields are not validated for types(shoulBe*) (only existense as a column in data is checked)
//    because our shouldNotBeBlank and shouldBeNumber validations don't support gaps in data
// 2. options.yColors doesn't have a validation, it has a structure similar to yFields
// 3. options.highlightRanges doesn't have a validation yet

const optionTypes = {
  aspectRatio: checkNumberBetween([0.01, Number.POSITIVE_INFINITY]),

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
}

export const validateAndRender = ({
  dataPaths,
  options,
  dimensions,
  chartContainerSelector,
}) => {
  const optionsValidationResult = optionValidation({ optionTypes, options })
  const yFieldsDimensionTypes = {}
  const yFieldDimensions = {}

  const yFieldBandDimensions = {}

  dimensions.yFields.forEach((yf, i) => {
    if (yf.line) {
      // yFieldsDimensionTypes[`__yField${i}_line__`] = [shouldNotBeBlank]
      yFieldDimensions[`__yField${i}_line__`] = yf.line
    }
    if (yf.band) {
      // yFieldsDimensionTypes[`__yField${i}_band__`] = [shouldNotBeBlank]
      yFieldDimensions[`__yField${i}_band__`] = yf.band
      yFieldBandDimensions[`__yField${i}_band__`] = yf.band
    }
    if (yf.circle) {
      yFieldDimensions[`__yField${i}_circle__`] = yf.circle
    }
  })

  const yFieldBandValidation = validateBandFields({
    bandDimensions: yFieldBandDimensions,
  })

  const dimensionTypes = {
    xField: [shouldNotBeBlank],
    // 👇🏽 is currently empty
    ...yFieldsDimensionTypes,
  }

  const flatDimensions = {
    xField: dimensions.xField,
    ...yFieldDimensions,
  }

  const dataFetchPromises = []
  dataPaths.forEach(dataPath => {
    dataFetchPromises.push(d3.csv(dataPath))
  })

  Promise.all(dataFetchPromises).then(([data, dataScatter]) => {
    const { columns } = data
    const { columns: scatterColumns } = dataScatter
    const dimensionValidation = validateColumnsWithDimensions({
      columns: [...columns, ...scatterColumns],
      dimensions: flatDimensions,
    })

    const dataValidations = validateData({
      data,
      dimensionTypes,
      dimensions: flatDimensions,
    })

    const allValidations = [
      dimensionValidation,
      optionsValidationResult,
      yFieldBandValidation,
      dataValidations,
    ]

    const combinedValidation = { valid: true, messages: [] }

    allValidations.forEach(v => {
      combinedValidation.valid = combinedValidation.valid && v.valid
      if (!v.valid) {
        combinedValidation.messages.push(v.message)
      }
    })

    combinedValidation.valid
      ? renderChart({
          data,
          dataScatter,
          dimensions,
          options,
          chartContainerSelector,
        })
      : showErrors(chartContainerSelector, combinedValidation.messages)
  })
}
