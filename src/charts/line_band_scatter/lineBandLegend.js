export function lineBandLegend({
  uid,
  swatchSize = 20,
  swatchWidth = swatchSize,
  swatchHeight = swatchSize,
  lineHeight = 5,
  lineBandColorScale,
  format = x => x,
  circleDiameter = 8,
  marginLeft = 10,
}) {
  const id = `${uid}-lbl`

  return `<div
    style="display: flex; align-items: center; min-height: 33px; margin-left: ${+marginLeft}px; font: 10px sans-serif;"
  >
    <style>
      .${id} {
        display: inline-flex;
        align-items: center;
        margin-right: 1em;
      }
      .${id}.band::before, .${id}.lineband::before {
        content: '';
        width: ${+swatchWidth}px;
        height: ${+swatchHeight}px;
        margin-right: 0.5em;
      }
      .${id}.band::before {
        background: var(--band-color);
      }
      .${id}.lineband::before {
        background: linear-gradient(180deg, var(--band-color) 0%, var(--band-color) 40%, var(--line-color) 40%, var(--line-color) 60%, var(--band-color) 60%, var(--band-color) 100%);
      }
      .${id}.line::before {
        content: '';
        width: ${+swatchWidth}px;
        height: ${+lineHeight}px;
        margin-right: 0.5em;
        background: var(--line-color);
      }
      .${id}.circle::before {
        content: '';
        width: ${+circleDiameter}px;
        height: ${+circleDiameter}px;
        margin-right: 0.5em;
        background: var(--circle-color);
        border-radius: 100%;
      }
    </style>

      
        ${lineBandColorScale
          .map(
            lbc =>
              `<span class="${id} ${lbc.type}"
                style="--line-color: ${lbc.line?.color};
                  --band-color: ${lbc.band?.color};
                  --circle-color: ${lbc.circle?.color}">
                  ${
                    lbc.line
                      ? format(lbc.line.label)
                      : lbc.band
                      ? format(lbc.band.label)
                      : format(lbc.circle.label)
                  }
              </span>`,
          )
          .join('')}
      
    </div>
  `
}
