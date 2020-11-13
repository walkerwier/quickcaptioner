export function last<T>(arr: T[]): T {
    return arr[arr.length - 1];
}

export function fromPairs(arr: [any, any][]): any {
    let obj = {};
    arr.forEach(pair => obj[pair[0]] = pair[1]);
    return obj;
}

export function pairs(obj: object): [any, any][] {
    let arr = [];
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) arr.push([prop, obj[prop]]);
    }
    return arr;
}

export function each(obj: object, func: (val: any, key: string)=>any): void {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) func(obj[prop], prop);
    }
}

export function map(obj: object, func: (val: any, key: string)=>any): any {
    let newObj = {};
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) newObj[prop] = func(obj[prop], prop);
    }
    return newObj;
}

export function mapToList(obj: object, func: (val: any, key: string)=>any): any {
    let list = [];
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop)) list.push(func(obj[prop], prop));
    }
    return list;
}

export function defaults(obj: object, defaultsObj: object): any {
    let newObj = {};
    for (let prop in defaultsObj) {
        if (defaultsObj.hasOwnProperty(prop)) newObj[prop] = defaultsObj[prop];
    }
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop) && obj[prop] !== undefined) newObj[prop] = obj[prop];
    }
    return newObj;
}

export function pluck(obj: object, properties: any[]): any {
    let newObj = {};
    properties.forEach(prop => {if (obj.hasOwnProperty(prop)) newObj[prop] = obj[prop];});
    return newObj;
}

export function defaultsAndOnly(obj: object, defaultsObj: object): any {
    let newObj = {};
    for (let prop in defaultsObj) {
        if (defaultsObj.hasOwnProperty(prop)) {
            newObj[prop] = (obj.hasOwnProperty(prop) && obj[prop] !== undefined) ? obj[prop] : defaultsObj[prop];
        }
    }
    return newObj;
}

export function zip<T1, T2>(arr1: T1[], arr2: T2[]): [T1, T2][] {
    let pairs = [];
    let len = Math.max(arr1.length, arr2.length);
    for (let i=0; i<len; i++) {
        pairs.push([arr1[i], arr2[i]]);
    }
    return pairs;
}