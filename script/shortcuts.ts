import {observable, observableArray, computed, pureComputed, components, bindingHandlers} from 'knockout'
import * as ko from 'knockout';

//export type Observable<T> = T extends any[] ? KnockoutObservableArray<T[number]> : T extends boolean ? KnockoutObservable<boolean> : KnockoutObservable<T>;
export type Observable<T> = KnockoutObservable<T>;
export type ObservableArr<T> = KnockoutObservableArray<T>;
export type Derived<T> = KnockoutReadonlyObservable<T>;
export type PossiblyObservable<T> = T | KnockoutSubscribable<T>;

export {observable, observableArray, computed}

export const pure = pureComputed;

export function relationship<T>(func : (obs: Observable<T>) => void) : Observable<T> {
    let obs: Observable<T> = observable();
    func(obs);
    return obs;
}

export function get(url: string, then) {
    let request = new XMLHttpRequest();
    request.onload = () => then(JSON.parse(request.responseText));
    request.open("GET", url);
    request.send();
}


export function post(url: string, data: object) {
    // let request = new XMLHttpRequest();
    // request.open("POST", url);
    // request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    // request.send(JSON.stringify(data));
    postFiles(url, {}, data, ()=>{});
}

export function postFiles(url: string, files: {[name: string]: File}, data: object, then: (data)=>void) {
    let form = new FormData()
    let i=0;
    form.append('json', JSON.stringify(data))
    for (let fname in files) {
        let file = files[fname];
        form.append(fname, file);
    }
    let request = new XMLHttpRequest();
    request.onload = () => then(JSON.parse(request.responseText));
    request.open("POST", url);
    request.send(form);
}

export function putFiles(url: string, files: {[name: string]: File}, data: object) {
    let form = new FormData()
    let i=0;
    form.append('json', JSON.stringify(data))
    for (let fname in files) {
        let file = files[fname];
        form.append(fname, file);
    }
    let request = new XMLHttpRequest();
    request.open("PUT", url);
    request.send(form);
}

export function getAncestor(element: Element, selector: string) {
    while (element) {
        if (element.matches(selector)) return element as HTMLElement;
        element = element.parentElement;
    }
}

window['$'] = {
    post: post,
    postFiles: postFiles,
    putFiles: putFiles,
    get: get
}

window['ko'] = ko;