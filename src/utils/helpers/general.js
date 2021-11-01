export function toClassText(str) {
  return str.replace(/[\s&',.]/g, '').toLowerCase()
}

export function preventOverflow({
  allComponents,
  svg,
  safetyMargin = 20,
  margins,
}) {
  const { marginLeft, marginRight, marginTop, marginBottom } = margins
  let allComponentsBox = allComponents.node().getBBox()

  const updatedViewBoxWidth =
    allComponentsBox.width + safetyMargin + marginLeft + marginRight
  const updatedViewBoxHeight =
    allComponentsBox.height + safetyMargin + marginTop + marginBottom
  svg.attr('viewBox', `0 0 ${updatedViewBoxWidth} ${updatedViewBoxHeight}`)

  allComponentsBox = allComponents.node().getBBox()

  allComponents.attr(
    'transform',
    `translate(${-allComponentsBox.x + safetyMargin / 2 + marginLeft}, ${
      -allComponentsBox.y + safetyMargin / 2 + marginTop
    })`,
  )
}

export const fileExtension = filename => {
  const [ext] = filename.split('.').slice(-1)
  return ext
}
