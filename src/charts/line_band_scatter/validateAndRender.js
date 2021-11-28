import * as d3 from 'd3'
import { renderChart } from './render'

export const validateAndRender = ({
  dataPaths,
  options,
  dimensions,
  chartContainerSelector,
}) => {
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
