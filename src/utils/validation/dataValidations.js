import _ from 'lodash-es'

export const validateData = ({ data, dimensionTypes, dimensions }) => {
  const dataValidations = {}
  _.forEach(dimensionTypes, (valFuncs, dim) => {
    _.forEach(valFuncs, valFunc => {
      const { valid, message } = valFunc({ data, dimensions, dim })
      if (!valid) {
        const vaidationObject = {
          validation: valFunc.name,
          status: valid,
          message,
        }
        if (dataValidations[dimensions[dim]]) {
          dataValidations[dimensions[dim]].push(vaidationObject)
        } else {
          dataValidations[dimensions[dim]] = [vaidationObject]
        }
      }
    })
  })
  if (_.isEmpty(dataValidations)) return { valid: true, message: '' }
  let messageReadable = 'Data Validation Errors </br>'
  _.mapKeys(dataValidations, (val, key) => {
    const msgDetails = _.map(
      val,
      val_ =>
        `</br>&nbsp;&nbsp;&nbsp;${val_.validation} : row numbers - ${_.map(
          val_.message,
          'rowNumber',
        ).join(', ')} | values - ${_.map(val_.message, key).join(', ')}`,
    ).join('')
    messageReadable += `${key} : ${msgDetails}</br>`
  })
  return { valid: false, message: messageReadable }
}

export const shouldBeNumber = ({ data, dimensions, dim }) => {
  const invalidRows = _.filter(data, (row, i) => {
    // eslint-disable-next-line no-param-reassign
    row.rowNumber = i + 1
    return Number.isNaN(Number(row[dimensions[dim]]))
  })

  if (_.isEmpty(invalidRows)) return { valid: true, message: '' }

  return { valid: false, message: invalidRows }
}

export const shouldBeZeroOrPositiveNumber = ({ data, dimensions, dim }) => {
  const invalidRows = _.filter(data, (row, i) => {
    // eslint-disable-next-line no-param-reassign
    row.rowNumber = i + 1
    const value = Number(row[dimensions[dim]])
    return Number.isNaN(value) || value < 0
  })

  if (_.isEmpty(invalidRows)) return { valid: true, message: '' }

  return { valid: false, message: invalidRows }
}

export const shouldBeUnique = ({ data, dimensions, dim }) => {
  // return true if valid number, false if not a valid number
  const duplicates = _(data)
    .countBy(dimensions[dim])
    .pickBy(val => val > 1)
    .keys()
    .value()

  const duplicateRows = _.filter(data, (row, i) => {
    // eslint-disable-next-line no-param-reassign
    row.rowNumber = i + 1
    return _.includes(duplicates, row[dimensions[dim]])
  })

  if (_.isEmpty(duplicates)) return { valid: true, message: '' }

  return { valid: false, message: duplicateRows }
}

export const shouldNotBeBlank = ({ data, dimensions, dim }) => {
  const invalidRows = _.filter(data, (row, i) => {
    // eslint-disable-next-line no-param-reassign
    row.rowNumber = i + 1
    return _.isEmpty(row[dimensions[dim]])
  })

  if (_.isEmpty(invalidRows)) return { valid: true, message: '' }

  return { valid: false, message: invalidRows }
}
