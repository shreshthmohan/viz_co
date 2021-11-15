export function validateColumnsWithDimensions({ columns, dimensions }: {
    columns: any;
    dimensions: any;
}): {
    valid: boolean;
    missingFields: never[];
    message: string;
} | {
    valid: boolean;
    message: string;
};
export function showErrors(svgParentNodeSelector: any, errorMessages: any): void;
