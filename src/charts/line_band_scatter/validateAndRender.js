import * as d3 from 'd3'
import {
  shouldBeNumber,
  shouldNotBeBlank,
} from '../../utils/validation/dataValidations'
import { renderChart } from './render'

export const validateAndRender = ({
  dataPaths,
  options,
  dimensions,
  chartContainerSelector,
}) => {
  const yFieldsDimensionTypes = {}
  const yFieldDimensions = {}

  dimensions.yFields.forEach((yf, i) => {
    if (yf.line) {
      yFieldsDimensionTypes[`__yField${i}_line__`] = [shouldBeNumber]
      yFieldDimensions[`__yField${i}_line__`] = yf.line
    }
    // if (yf.band) {
    //   yFieldsDimensionTypes[`__yField${i}_line__`] = [shouldBeNumber]
    // }
  })

  const dimensionTypes = {
    xField: [shouldNotBeBlank],
    ...yFieldsDimensionTypes,
  }

  const flatDimensions = {}

  const dataFetchPromises = []
  dataPaths.forEach(dataPath => {
    dataFetchPromises.push(d3.csv(dataPath))
  })

  Promise.all(dataFetchPromises).then(([data, dataScatter]) => {
    renderChart({
      data,
      dataScatter,
      options,
      dimensions,
      chartContainerSelector,
    })
  })
}
