export function dashedLegend({
  labels,
  color,
  swatchSize = 20,
  swatchWidth = 2.5,
  swatchHeight = swatchSize,
  marginLeft = 0,
  uid,
  customClass = '',
}) {
  const id = `dl-${uid}`
  const mu = `
  <div
    style="display: flex; align-items: center; min-height: 33px; margin-left: ${+marginLeft}px; font: 10px sans-serif;"
  >
    <style>
      .${id} {
        display: inline-flex;
        align-items: center;
        margin-right: 1em;
      }

      .${id}::before {

        content: "";
        width: 0px;
        height: ${+swatchHeight}px;
        border: ${Math.floor(+swatchWidth)}px dashed var(--color);
        margin-right: 0.5em;
      }
    </style>
      ${labels
        .map(
          l =>
            `<span class="${id} ${customClass}" style="--color: ${color(
              l.series,
            )}" >${l.label}</span>`,
        )
        .join('')}

    </div>
  `
  return mu
}
