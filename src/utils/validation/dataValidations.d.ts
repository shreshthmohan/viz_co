export function validateData({ data, dimensionTypes, dimensions }: {
    data: any;
    dimensionTypes: any;
    dimensions: any;
}): {
    valid: boolean;
    message: string;
};
export function shouldBeNumber({ data, dimensions, dim }: {
    data: any;
    dimensions: any;
    dim: any;
}): {
    valid: boolean;
    message: any;
};
export function shouldBeUnique({ data, dimensions, dim }: {
    data: any;
    dimensions: any;
    dim: any;
}): {
    valid: boolean;
    message: any;
};
export function shouldNotBeBlank({ data, dimensions, dim }: {
    data: any;
    dimensions: any;
    dim: any;
}): {
    valid: boolean;
    message: any;
};
