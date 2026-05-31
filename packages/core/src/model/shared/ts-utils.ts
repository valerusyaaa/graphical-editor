/*
* 
*/
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/*
* 
*/
export type WithOptional<T, K extends keyof T> = T & { [P in K]?: T[P] };

/** 
* An auxiliary type for displaying in a tooltip with a visual representation of the target type
*/
export type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}