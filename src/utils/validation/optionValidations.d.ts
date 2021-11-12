export function optionValidation({ optionTypes, options }: {
    optionTypes: any;
    options: any;
}): {
    valid: boolean;
    message: string;
};
export function checkOneOf(refArr: any): (val: any) => {
    valid: boolean;
    message?: undefined;
} | {
    valid: boolean;
    message: string;
};
export function checkNumber(val: any): {
    valid: boolean;
    message?: undefined;
} | {
    valid: boolean;
    message: string;
};
export function checkBoolean(val: any): {
    valid: boolean;
    message?: undefined;
} | {
    valid: boolean;
    message: string;
};
export function checkNumberBetween(refArr: any): (val: any) => {
    valid: boolean;
    message: string;
} | {
    valid: boolean;
    message?: undefined;
};
export function checkColor(val: any): {
    valid: boolean;
    message: string;
};
export function checkColorArray(length: any): (arr: any) => {
    valid: boolean;
    message: string;
};
export function checkNumericArray(val: any): {
    valid: boolean;
    message?: undefined;
} | {
    valid: boolean;
    message: string;
};
export function checkStringArray(length: any): (arr: any) => {
    valid: boolean;
    message: string;
} | {
    valid: boolean;
    message?: undefined;
};
export function checkDefaultState(val: any): {
    valid: boolean;
    message?: undefined;
} | {
    valid: boolean;
    message: string;
};
