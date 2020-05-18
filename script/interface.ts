import {Observable, observable, observableArray, computed, pure, ObservableArr} from './shortcuts'
import {splitLines, setSettings} from './linesplitting'
import {observableSettings, resolvedSettings, resetSettings as _resetSettings} from './settings'
import {SimpleBinding} from './compontents'
import map from 'lodash-es/map'
import isArray from 'lodash-es/isArray'
import flatten from 'lodash-es/flatten';

setSettings(resolvedSettings());

let proofMode = observable(false);

let inputText: Observable<string> = observable('');
let unproofedOutput: string[][] = [];
let proofedOutput: string[][] = [];
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

class Line {
    text: string = '';
    hardBreakAfter: boolean = false;
}

function flattenParagraphList(paragraphs: string[][], startIndex=0) : string[] {
    let result = [];
    for (let i=0; i<paragraphs.length; i++) {
        let paragraph = paragraphs[i];
        result.push.apply(result, paragraph);
        if ((result.length + startIndex) % 2) {
            result.push('');
        }
    }
    return result;
}



function doSplit() {
    unproofedOutput = splitLines(inputText());
    result(flattenParagraphList(unproofedOutput));
}
inputText.subscribe(doSplit);

/** Proofing **/
let cursorPosition = observable(1);
let reflowSetting = observable(false);

function enterProofMode() {
    proofedOutput = unproofedOutput;
    if (result().length < 1) {
        cursorPosition(0);
    }
    proofMode(true);
}

function discardEdits() {
    result(flattenParagraphList(unproofedOutput));
    proofMode(false);
    cursorPosition(1);
}

function proofOutputUpdated() {
    result(flattenParagraphList(proofedOutput));
}

function splitOnePara(text) {
    return splitLines(text)[0];
}

class LineIndex {
    para: number;
    line: number;
    constructor(para, line) {
        this.para = para;
        this.line = line;
    }
}

function getLineIndex(lineNum: number) {
    let x=0;
    let paragraph = [];
    let i, j;
    loop_i: for (i=0; i<proofedOutput.length; i++) {
        paragraph = flattenParagraphList([proofedOutput[i]], x);
        for (j=0; j<paragraph.length; j++) {
            if (x === lineNum) break loop_i;
            x++;
        }
    }
    return new LineIndex(i, j);
}

function getLineFromIndex(index: LineIndex) {
    return proofedOutput[index.para][index.line];
}

function getLine(lineNum: number) {
    let index = getLineIndex(lineNum);
    return proofedOutput[index.para][index.line];
}
function setLine(lineNum: number, content) {
    let index = getLineIndex(lineNum);
    proofedOutput[index.para][index.line] = content;
    //proofOutputUpdated();
}

class StagedLine {
    index: LineIndex;
    text: string;
    constructor(index, text) {
        this.index = index;
        this.text = text;
    }
    commit() {
        proofedOutput[this.index.para][this.index.line] = this.text;
    }
}

class StagedReflow {
    startIndex: LineIndex;
    firstLineText: string;
    constructor(startIndex, text) {
        this.startIndex = startIndex;
        this.firstLineText = text;
    }
    commit() {
        //let para = proofedOutput[this.startIndex.para].slice(0, this.startIndex.line);
        let para = proofedOutput[this.startIndex.para].slice();
        let modifiedLines = para.splice(this.startIndex.line);
        modifiedLines[0] = this.firstLineText;
        proofedOutput[this.startIndex.para] = para.concat(splitOnePara(modifiedLines.join(' ')));
    }
}

class StagedChange {
    actions: (StagedLine|StagedReflow)[] = [];
    stageLine(index, text) {
        this.actions.push(new StagedLine(index, text));
    }
    stageReflow(index, text) {
        this.actions.push(new StagedReflow(index, text));
    }
    commit() {
        this.actions.forEach(x => x.commit());
        proofOutputUpdated();
    }
}

class StagedMoveWord extends StagedChange {
    index1: LineIndex;
    index2: LineIndex;
    line1: string;
    line2: string;
    max: number;
    init() {
        let pos = cursorPosition();
        if (pos <= 0 || pos >= result().length) {
            throw 'Cursor at end';
        }
        this.index1 = getLineIndex(pos - 1);
        this.index2 = getLineIndex(pos);
        this.line1 = getLineFromIndex(this.index1);
        this.line2 = getLineFromIndex(this.index2);
    }
    initAsMoveDown(reflow: boolean) {
        this.init();
        let words = this.line1.split(' ').filter(x=>x);
        let lastWord = words.pop();
        if (!lastWord) {
            throw 'Source line empty';
        }
        let newLine2 = lastWord + ' ' + this.line2;
        if (!reflow && (newLine2.length > this.max)) {
            throw 'Would make destination line too long'
        }
        this.stageLine(this.index1, words.join(' '));
        if (reflow) {
            this.stageReflow(this.index2, newLine2);
        } else {
            this.stageLine(this.index2, newLine2);
        }
    }
    initAsMoveUp(reflow: boolean) {
        this.init();
        let words = this.line2.split(' ').filter(x=>x);
        let firstWord = words.shift();
        if (!firstWord) {
            throw 'Source line empty';
        }
        let newLine1 = this.line1 + ' ' + firstWord;
        if (newLine1.length > this.max) {
            throw 'Would make destination line too long'
        }
        this.stageLine(this.index1, newLine1);
        if (reflow) {
            this.stageReflow(this.index2, words.join(' '));
        } else {
            this.stageLine(this.index2, words.join(' '));
        }
    }
    static moveUp(reflow: boolean) {
        try {
            let move = new StagedMoveWord();
            move.initAsMoveUp(reflow);
            return move;
        } catch {
            return null;
        }
    }
    static moveDown(reflow: boolean) {
        try {
            let move = new StagedMoveWord();
            move.initAsMoveDown(reflow);
            return move;
        } catch {
            return null;
        }
    }
}


function newMoveWordDown(reflow: boolean) {
    let pos = cursorPosition();
    if (pos <= 0 || pos >= result().length) return;
}

function moveWordDown() {
    let pos = cursorPosition();
    if (pos <= 0 || pos >= result().length) return;
    let before = result().slice();
    let after = before.splice(pos);
    let lineFrom = before.pop();
    let lineTo = after.shift();
    let words = lineFrom.split(' ').filter(x=>x);
    let lastWord = words.pop();
    if (!lastWord) return;
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
    let words = lineFrom.split(' ').filter(x=>x);
    let firstWord = words.shift();
    if (!firstWord) return;
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
    result(before.concat([newLine1], flatten(splitLines(newAfterText))));
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
    result(before.concat([newLine1], flatten(splitLines(newAfterText))));
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
    reflowSetting, shiftDepressed, reflowInstantaneous, getLine, setLine,
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