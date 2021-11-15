export function validateAndRender({
  dataPath,
  options: {
    aspectRatio,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    bgColor,
    oppositeDirectionColor,
    sameDirectionColor,
    yAxisTitle,
    xAxisTitle,
    xValueFormatter,
    yValueFormatter,
    directionStartLabel,
    directionEndLabel,
    sizeLegendValues,
    sizeLegendMoveSizeObjectDownBy,
    sizeLegendTitle,
    sizeValueFormatter,
    xAxisTickValues,
    xScaleType,
    xScaleLogBase,
    defaultState,
    activeOpacity,
    inactiveOpacity,
    circleSizeRange,
    lineWidthRange,
    searchInputClassNames,
    goToInitialStateButtonClassNames,
    clearAllButtonClassNames,
    xFieldType,
    yFieldType,
  },
  dimensions,
  svgParentNodeSelector,
}: {
  dataPath: any
  options: {
    aspectRatio?: number | undefined
    marginTop?: number | undefined
    marginRight?: number | undefined
    marginBottom?: number | undefined
    marginLeft?: number | undefined
    bgColor?: string | undefined
    oppositeDirectionColor?: string | undefined
    sameDirectionColor?: string | undefined
    yAxisTitle?: string | undefined
    xAxisTitle?: string | undefined
    xValueFormatter?: string | undefined
    yValueFormatter?: string | undefined
    directionStartLabel?: string | undefined
    directionEndLabel?: string | undefined
    sizeLegendValues?: number[] | undefined
    sizeLegendMoveSizeObjectDownBy?: number | undefined
    sizeLegendTitle?: string | undefined
    sizeValueFormatter?: string | undefined
    xAxisTickValues: any
    xScaleType?: string | undefined
    xScaleLogBase?: number | undefined
    defaultState?: any[] | undefined
    activeOpacity?: number | undefined
    inactiveOpacity?: number | undefined
    circleSizeRange?: number[] | undefined
    lineWidthRange?: number[] | undefined
    searchInputClassNames?: string | undefined
    goToInitialStateButtonClassNames?: string | undefined
    clearAllButtonClassNames?: string | undefined
    xFieldType?: string | undefined
    yFieldType?: string | undefined
  }
  dimensions: any
  svgParentNodeSelector?: string | undefined
}): void
