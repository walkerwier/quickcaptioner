import {Observable, observable, observableArray, computed, pure, ObservableArr} from './shortcuts'
import {splitLines, setSettings} from './linesplitting'
import {observableSettings, resolvedSettings, resetSettings as _resetSettings} from './settings'
import {SimpleBinding} from './compontents'
import {mapToList} from './utilities'

setSettings(resolvedSettings());

let proofMode = observable(false);
let proofOnly = observableSettings.proofOnly;

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


function flattenParagraphList(paragraphs: string[][], startIndex=0) : string[] {
    let result = [];
    for (let i=0; i<paragraphs.length; i++) {
        let paragraph = paragraphs[i].slice();
        if (paragraph.length) {
            paragraph[paragraph.length - 1] += ' ';
        }
        result.push.apply(result, paragraph);
        if ((result.length + startIndex) % 2) {
            result.push('');
        }
    }
    return result;
}

function importPreSplitText(text) : string[][] {
    return text.split(/\s*(\n\s*){2,}/)
        .filter(x => x && x.trim())
        .map(x => x.split(/\s*\n\s*/).filter(x => x && x.trim()));
}

function doSplit() {
    unproofedOutput = (proofOnly() ? importPreSplitText : splitLines)(inputText());
    result(flattenParagraphList(unproofedOutput));
}
inputText.subscribe(doSplit);
proofOnly.subscribe(doSplit);

/** Proofing **/
let cursorPosition = observable(1);
let reflowSetting = observable(false);

function enterProofMode() {
    if (document['activeElement']) {
        (document.activeElement as HTMLElement).blur();
    }
    proofedOutput = unproofedOutput;
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

function proofOutputUpdated() {
    result(flattenParagraphList(proofedOutput));
    // flicker cursor: bad hack to update button enabled states, etc.
    let pos = cursorPosition();
    cursorPosition(0);
    cursorPosition(pos);
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
    return proofedOutput[index.para][index.line] || '';
}


interface StagedAction {
    commit: () => void;
}

class StagedLine implements StagedAction {
    index: LineIndex;
    text: string;
    constructor(index, text) {
        this.index = index;
        this.text = text;
    }
    commit() {
        proofedOutput[this.index.para][this.index.line] = this.text || '';
    }
}

class StagedReflow implements StagedAction {
    startIndex: LineIndex;
    firstLineText: string;
    keepCharacters: number;
    constructor(startIndex, text, keepCharacters=0) {
        this.startIndex = startIndex;
        this.firstLineText = text;
        this.keepCharacters = keepCharacters;
    }
    commit() {
        let para = proofedOutput[this.startIndex.para].slice();
        let modifiedLines = para.splice(this.startIndex.line);
        let placeholder = '';
        let placeholderChar = String.fromCharCode(16180);
        for (let i=0; i<this.keepCharacters; i++) {
            placeholder += placeholderChar;
        }
        let firstLine = this.firstLineText || '';
        let keepWords = firstLine.substr(0, this.keepCharacters);
        modifiedLines[0] = placeholder + firstLine.substr(this.keepCharacters);
        let reflowed = splitLines(modifiedLines.join(' '));
        let reflowedCurrentPara = reflowed.shift();
        if (!reflowedCurrentPara.length) reflowedCurrentPara = [''];
        reflowedCurrentPara[0] = keepWords + reflowedCurrentPara[0].substr(this.keepCharacters);
        proofedOutput[this.startIndex.para] = para.concat(reflowedCurrentPara);
        reflowed.forEach(x => proofedOutput.splice(this.startIndex.para + 1, 0, x));
    }
}

class StagedMergeParagraphs implements StagedAction {
    index: LineIndex
    constructor(index) {
        this.index = index;
        let firstPara = proofedOutput[this.index.para];
        let nextPara = proofedOutput[this.index.para + 1];
        if (!nextPara) {
            throw 'End of document';
        }
        if (this.index.line < firstPara.length - 1) {
            throw "Cursor not at break";
        }
    }
    commit() {
        let combined = proofedOutput[this.index.para].concat(proofedOutput[this.index.para + 1]);
        proofedOutput.splice(this.index.para, 2, combined);
    }
}

class StagedMergeLines implements StagedAction {
    index: LineIndex
    combinedLine: string
    constructor (index) {
        this.index = index;
        let para = proofedOutput[this.index.para];
        this.combinedLine = (para[this.index.line] + " " + para[this.index.line + 1]).trim();
    }
    commit() {
        let para = proofedOutput[this.index.para];
        para.splice(this.index.line, 2, this.combinedLine);
    }
}

class StagedInsert implements StagedAction {
    beforeIndex: LineIndex;
    constructor(index) {
        this.beforeIndex = index;
    }
    commit() {
        let para = proofedOutput[this.beforeIndex.para] || [];
        let beforePara = para.splice(0, this.beforeIndex.line);
        if (!beforePara.length && !para.length) {
            beforePara.push('');
        } else if (!para.length) {
            para.push('');
        } else if (!beforePara.length) {
            beforePara.push('');
        }
        proofedOutput.splice(this.beforeIndex.para, 0, beforePara);
    }
}

class StagedChange {
    description: string;
    actions: StagedAction[] = [];
    stageLine(index, text) {
        this.actions.push(new StagedLine(index, text));
    }
    stageReflow(index, text, keepCharacters=0) {
        this.actions.push(new StagedReflow(index, text, keepCharacters));
    }
    stageInsert(index) {
        this.actions.push(new StagedInsert(index));
    }
    stageMergeParas(index) {
        this.actions.push(new StagedMergeParagraphs(index));
    }
    stageMergeLines(index) {
        this.actions.push(new StagedMergeLines(index));
    }
    commit() {
        this.actions.forEach(x => x.commit());
        proofOutputUpdated();
    }
    static insert() {
        let change = new StagedChange();
        change.stageInsert(getLineIndex(cursorPosition()));
        return change;
    }
    static mergeParas() {
        try {
            let change = new StagedChange();
            change.stageMergeParas(getLineIndex(cursorPosition() - 1));
            return change;
        } catch {
            return null;
        }
    }
    static mergeLines(reflow: boolean) {
        try {
            let change = new StagedChange();
            change.description = 'Merge lines';
            let index = getLineIndex(cursorPosition() - 1);
            let oldLine1 = getLineFromIndex(index);
            let oldLine2 = proofedOutput[index.para][index.line+1];
            if (oldLine2 === undefined) {
                throw "End of paragraph"
            }
            if (!oldLine1 || !oldLine2) change.description = 'Delete blank line';
            let action = new StagedMergeLines(index);
            let max = parseInt(observableSettings.maxLength());
            change.actions.push(action);
            if (action.combinedLine.length > max) {
                if (!reflow) {
                    throw 'Combined line would be too long';
                } else {
                    let firstWord = (oldLine2 || '').split(' ').shift();
                    let keepCharacters = 0;
                    if (firstWord) {
                        keepCharacters = oldLine1.length + 1 + firstWord.length;
                    }
                    if (keepCharacters > max) {
                        throw 'Combined line would be too long';
                    }
                    change.stageReflow(action.index, action.combinedLine, keepCharacters);
                }
            }
            return change;
        } catch {
            return null;
        }
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
        this.max = parseInt(observableSettings.maxLength());
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

function moveWordUp() {
    let change = StagedMoveWord.moveUp(reflowInstantaneous());
    if (change) change.commit();
}

function moveWordDown() {
    let change = StagedMoveWord.moveDown(reflowInstantaneous());
    if (change) change.commit();
}

function insert() {
    let change = StagedChange.insert();
    if (change) change.commit();
}

let mergeType = pure(() => {
    if (StagedChange.mergeParas()) return 'Delete Break';
    let change = StagedChange.mergeLines(reflowInstantaneous());
    if (change) return change.description;
    return null;
});

function merge() {
    let change = StagedChange.mergeParas() || StagedChange.mergeLines(reflowInstantaneous());
    if (change) change.commit();
}

function moveCursor(increment) {
    let pos = cursorPosition() + increment;
    let len = result().length;
    if (pos < 0) pos = 0;
    if (pos > len) pos = len;
    cursorPosition(pos);
    let cursor = document.getElementById('cursor');
    let method = cursor['scrollIntoViewIfNeeded'] || cursorPosition['scrollIntoView'];
    method.call(cursor);
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
    8: new Key(merge),
    13: new Key(insert),
    37: new Key(moveWordUp),
    38: new Key(() => moveCursor(-1)),
    39: new Key(moveWordDown),
    40: new Key(()=>moveCursor(1))
}

keys[38].enabled = computed(()=>cursorPosition()>0);
keys[40].enabled = computed(()=>cursorPosition()<result().length);
keys[37].enabled = pure(() => !!StagedMoveWord.moveUp(reflowInstantaneous()));
keys[39].enabled = pure(() => !!StagedMoveWord.moveDown(reflowInstantaneous()));
keys[8].enabled = pure(()=>!!mergeType());

let shiftDepressed = keys[16].depressed;
let reflowInstantaneous = pure(() => reflowSetting() != shiftDepressed());

class KeyBinding extends SimpleBinding<number> {
    getBindings() {
        let key = keys[this.value];
        return {
            click: key.action,
            css: {'depressed': key.depressed},
            enable: pure(()=>{
                return key.enabled()||key.active();
            })
        };
    }
}

KeyBinding.register('key');

  
let keydownHandler = (_, event: KeyboardEvent) => {
    if (!proofMode()) {
        if (event.keyCode === 13 && event.altKey) {
            enterProofMode();
        }
        return true;
    }
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

function exportProofedOutput() {
    let combinedText = proofedOutput.map(x => x.join('\n')).join('\n\n');
    let dataURI = 'data:text/plain;charset=utf-8,' + encodeURIComponent(combinedText);
    let anchor = document.createElement('a');
    anchor.setAttribute('href', dataURI);
    anchor.setAttribute('download', 'proofed-captions.txt');
    anchor.click();
}

function preparse(text: string) {
    return text.trim().replace(/\r\n/g, '\n');
}

function parseSRT(srt: string) {
    srt = preparse(srt);
    srt = srt.replace(/(\d+\n)?(\d\d\:)?\d\d:\d\d(,\d\d\d)? --> (\d\d\:)?\d\d:\d\d(,\d\d\d)?\n/g, '');
    srt = srt.replace(/\n{3,}/g, '\n\n');
    return srt;
}

function simplisticParseVTT(vtt: string) {
    vtt = preparse(vtt);
    vtt = vtt.replace(/^WEBVTT[^\n]*\n/i, '');
    vtt = vtt.replace(/(\d+\n)?(\d\d\:)?\d\d:\d\d(\.\d\d\d)? --> (\d\d\:)?\d\d:\d\d(\.\d\d\d)?[^\n]*\n/g, '');
    vtt = vtt.replace(/<[^>]+>/g, '');
    vtt = vtt.replace(/\n{3,}/g, '\n\n');
    return vtt.trim();
}


function getFileParser(file: File): (str: string)=>string {
    let nameComponents = file.name.split('.');
    let extension = nameComponents[nameComponents.length-1].toLowerCase();
    if (extension === 'srt') return parseSRT;
    if (extension === 'vtt') return simplisticParseVTT;
    if (extension === 'txt') return preparse;
    return null;
}

function fileReceivedHandler(files: File[]) {
    let validFiles = files.filter(getFileParser);
    if (validFiles.length !== 1) {
        return;
    }
    let file = validFiles[0];
    let parser = getFileParser(file);
    let reader = new FileReader();
    reader.onload = () => { fileReadHandler(parser(reader.result as string)); };
    reader.readAsText(file);
}

function fileReadHandler(text) {
    inputText(text);
}

export let vm = {
    proofedOutput: ()=>proofedOutput,
    exportProofedOutput,
    fileReceivedHandler,
    keydownHandler,
    keyupHandler,
    cursorPosition,
    proofMode,
    discardEdits,
    enterProofMode,
    reflowSetting,
    shiftDepressed,
    reflowInstantaneous,
    mergeType,
    inputText,
    result,
    doSplit,
    resetSettings,
    settings: observableSettings,
    lists: mapToList(observableSettings, (val, key) => {
        if (!(val() instanceof Array)) return null;
        let listText = observable(val().join('\n'));
        listText.subscribe(x => val((x as string).split('\n').map(x => x.trim()).filter(x => x)));
        settingsResetCounter.subscribe(() => {
            listText(val().join('\n'));
        });
        return {
            label: key,
            list: listText
        }
    }).filter(x => x)
};