import {observable, observableArray, computed, pureComputed, components, bindingHandlers, unwrap} from 'knockout'

export type Observable<T> = KnockoutObservable<T>;
export type ObservableArr<T> = KnockoutObservableArray<T>;
export type Derived<T> = KnockoutReadonlyObservable<T>;
export type PossiblyObservable<T> = T | KnockoutSubscribable<T>;

export {observable, observableArray, computed, unwrap}

export const pure = pureComputed;

export function getAncestor(element: Element, selector: string) {
    while (element) {
        if (element.matches(selector)) return element as HTMLElement;
        element = element.parentElement;
    }
}
