import {Observable, observable, observableArray, computed, pure, ObservableArr} from './shortcuts'
import {splitLines} from './linesplitting'

let inputText: Observable<string> = observable('');
let result: ObservableArr<string> = observableArray();
let maxLength: Observable<number> = observable(32);
let softMinimum: Observable<number> = observable(25);

let settings = computed(() => {
    return {
        maxLength: maxLength(),
        softMinimum: softMinimum()
    }
});

settings.subscribe(doSplit);

function doSplit() {
    result(splitLines(inputText(), settings()));
}

inputText.subscribe(doSplit);

export let vm = {
    inputText, result, doSplit, maxLength, softMinimum
};