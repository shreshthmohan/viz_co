import * as d3 from 'd3'
import _ from 'lodash-es'
export const formatNumber = function (
  value,
  formatter = '',
  scientificNotations = false,
) {
  const formattedValue = d3.format(formatter)(value)
  return scientificNotations
    ? formattedValue
    : _.replace(formattedValue, 'G', 'B')
}

export const formatDate = function (
  value,
  dateParser = null,
  dateFormatter = null,
) {
  const parsedDate = d3.timeParse(dateParser)(value)
  const formattedDate = parsedDate
    ? d3.timeFormat(dateFormatter)(parsedDate)
    : null
  return formattedDate || value
}
