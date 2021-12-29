/* global d3 */
Promise.all([d3.csv('data_choro.csv'), d3.csv('data_stacked.csv')]).then(
  ([dataChoro, dataStacked]) => {
    // console.log({ dataChoro, dataStacked })

    const timeField = 'year'

    const stackYFields = ['one', 'two']

    const choroValueField = 'bachelorsOrHigher'

    const choroStateAbbrField = 'state_code'

    // First keyed by time, then by state
    const choroDataObj = {}

    dataChoro.forEach(el => {
      const tf = el[timeField]
      const st = el[choroStateAbbrField]
      el[choroValueField] = Number.parseFloat(el[choroValueField])
      if (!choroDataObj[tf]) {
        choroDataObj[tf] = { [st]: el }
      } else {
        choroDataObj[tf] = {
          ...choroDataObj[tf],
          [st]: el,
        }
      }
    })

    // console.log({ choroDataObj })
  },
)
