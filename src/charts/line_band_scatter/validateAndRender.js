import * as d3 from 'd3'
import _ from 'lodash-es'

import { shouldNotBeBlank } from '../../utils/validation/dataValidations'
import { renderChart } from './render'

import { validateColumnsWithDimensions } from '../../utils/validation/validations'
import { validateData } from '../../utils/validation/dataValidations'

// Note about missing validations:
// 1. yFields are not validated for types (only existense as a column in data is checked)
//    because our shouldNotBeBlank and shouldBeNumber validations don't support gaps in data
// 2. band fields inside yFields should be of length 2, not yet validated
//

export const validateAndRender = ({
  dataPaths,
  options,
  dimensions,
  chartContainerSelector,
}) => {
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

  // Band length 2 validation wip
  // _.each(yFieldBandDimensions, (val, key) => {
  //   if (!(_.isArray(val) && val.length === 2)) {
  //   }
  // })

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

    const allValidations = [dimensionValidation, dataValidations]

    const combinedValidation = { valid: true, messages: [] }

    allValidations.forEach(v => {
      combinedValidation.valid = combinedValidation.valid && v.valid
      if (!v.valid) {
        combinedValidation.messages.push(v.message)
      }
    })

    renderChart({
      data,
      dataScatter,
      options,
      dimensions,
      chartContainerSelector,
    })
  })
}
