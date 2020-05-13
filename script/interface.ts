import {Observable, observable, observableArray, computed, pure, ObservableArr} from './shortcuts'
import {splitLines, setSettings} from './linesplitting'
import {observableSettings, resolvedSettings, resetSettings as _resetSettings} from './settings'
import map from 'lodash-es/map'
import isArray from 'lodash-es/isArray'

setSettings(resolvedSettings());

let inputText: Observable<string> = observable('');
let result: ObservableArr<string> = observableArray();


let settingsResetCounter = observable(0);
resolvedSettings.subscribe((settings) => {
    setSettings(settings);
    doSplit();
});
function resetSettings() {
    _resetSettings();
    settingsResetCounter(settingsResetCounter()+1);
}

function doSplit() {
    result(splitLines(inputText()));
}

inputText.subscribe(doSplit);

export let vm = {
    inputText, result, doSplit, resetSettings,
    settings: observableSettings,
    lists: map(observableSettings, (val, key) => {
        if (!isArray(val())) return null;
        let listText = observable(val().join('\n'));
        listText.subscribe(x => val((x as string).split('\n').map(x => x.trim()).filter(x => x)));
        settingsResetCounter.subscribe(() => {
            listText(val().join('\n'));
        });
        // let listText = computed({
        //         read: () => val().join('\n'),
        //         write: x => val((x as string).split('\n').map(x => x.trim()).filter(x => x))
        // });
        return {
            label: key,
            list: listText
        }
    }).filter(x => x)
};