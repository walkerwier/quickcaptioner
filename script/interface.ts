import {Observable, observable, observableArray, computed, pure, ObservableArr} from './shortcuts'
import {splitLines, setSettings} from './linesplitting'
import {observableSettings, resolvedSettings, resetSettings as _resetSettings} from './settings'
import {SimpleBinding} from './compontents'
import map from 'lodash-es/map'
import isArray from 'lodash-es/isArray'

setSettings(resolvedSettings());

let proofMode = observable(false);

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

/** Proofing **/
let cursorPosition = observable(1);
let reflowSetting = observable(false);

function enterProofMode() {
    if (result().length < 1) {
        cursorPosition(0);
    }
    proofMode(true);
}

function discardEdits() {
    doSplit();
    proofMode(false);
    cursorPosition(1);
}


function moveWordDown() {
    let pos = cursorPosition();
    if (pos <= 0 || pos >= result().length) return;
    let before = result().slice();
    let after = before.splice(pos);
    let lineFrom = before.pop();
    let lineTo = after.shift();
    let words = lineFrom.split(' ');
    let lastWord = words.pop();
    let newLine2 = lastWord + ' ' + lineTo;
    if (newLine2.length > parseInt(observableSettings.maxLength())) return;
    let newLine1 = words.join(' ')
    result(before.concat([newLine1, newLine2], after));
}

function moveWordUp() {
    let pos = cursorPosition();
    if (pos <= 0 || pos >= result().length) return;
    let before = result().slice();
    let after = before.splice(pos);
    let lineFrom = after.shift();
    let lineTo = before.pop();
    let words = lineFrom.split(' ');
    let firstWord = words.shift();
    let newLine1 = lineTo + ' ' + firstWord;
    if (newLine1.length > parseInt(observableSettings.maxLength())) return;
    let newLine2 = words.join(' ')
    result(before.concat([newLine1, newLine2], after));
}

function reflowMoveWordDown() {
    let pos = cursorPosition();
    if (pos <= 0 || pos >= result().length) return;
    let before = result().slice();
    let after = before.splice(pos);
    let lineFrom = before.pop();
    let words = lineFrom.split(' ');
    let lastWord = words.pop();
    let newLine1 = words.join(' ');
    let newAfterText = lastWord + ' ' + after.join(' ');
    result(before.concat([newLine1], splitLines(newAfterText)));
}
function reflowMoveWordUp() {
    let pos = cursorPosition();
    if (pos <= 0 || pos >= result().length) return;
    let before = result().slice();
    let after = before.splice(pos);
    let lineFrom = after.shift();
    let lineTo = before.pop();
    let words = lineFrom.split(' ');
    let firstWord = words.shift();
    let newLine1 = lineTo + ' ' + firstWord;
    if (newLine1.length > parseInt(observableSettings.maxLength())) return;
    let newAfterText = words.join(' ') + ' ' + after.join(' ');
    result(before.concat([newLine1], splitLines(newAfterText)));
}

function moveCursor(increment) {
    let pos = cursorPosition() + increment;
    let len = result().length;
    if (pos < 0) pos = 0;
    if (pos > len) pos = len;
    cursorPosition(pos);
}



class Key {
    depressed: Observable<boolean> = observable(false);
    active: Observable<boolean> = observable(false);
    enabled: KnockoutSubscribable<boolean> = observable(true);
    action: () => void;
    constructor(action) {
        this.action = action;
    }
}

let keys = {
    16: new Key(()=>{}),
    8: new Key(()=>{}),
    13: new Key(()=>{}),
    37: new Key(moveWordUp),
    38: new Key(() => moveCursor(-1)),
    39: new Key(moveWordDown),
    40: new Key(()=>moveCursor(1))
}

keys[38].enabled = computed(()=>cursorPosition()>0);
keys[40].enabled = computed(()=>cursorPosition()<result().length);

let shiftDepressed = keys[16].depressed;
let reflowInstantaneous = pure(() => reflowSetting() != shiftDepressed());

class KeyBinding extends SimpleBinding<number> {
    getBindings() {
        let key = keys[this.value];
        return {
            click: key.action,
            css: {'depressed': key.depressed},
            enable: computed(()=>key.enabled()||key.active())
        };
    }
}

KeyBinding.register('key');

let keyCommands = {
    46: () => {},
    8: () => {},
    37: moveWordUp,
    38: () => moveCursor(-1),
    39: moveWordDown,
    40: () => moveCursor(1)
  };

let shiftKeyCommands = {
    37: reflowMoveWordUp,
    39: reflowMoveWordDown,
  };
  
let keydownHandler = (_, event: KeyboardEvent) => {
    if (!proofMode()) return true;
    if ((event.target as Element).tagName === 'TEXTAREA' || (event.target as Element).tagName === 'INPUT') {
        return true;
    }
    //let action = (event.shiftKey) ? (shiftKeyCommands[event.keyCode] || keyCommands[event.keyCode]) : keyCommands[event.keyCode];
    let key = keys[event.keyCode];
    if (key) {
      key.depressed(true);
      if (key.enabled()) {
          key.action();
          key.active(true);
      }
      return false;
    }
    return true;
};

  
let keyupHandler = (_, event: KeyboardEvent) => {
    if (!proofMode()) return true;
    let key = keys[event.keyCode];
    if (key) {
      key.active(false);
      key.depressed(false);
    }
    return true;
};


export let vm = {
    keydownHandler, keyupHandler, cursorPosition, proofMode, discardEdits, enterProofMode,
    reflowSetting, shiftDepressed, reflowInstantaneous,
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