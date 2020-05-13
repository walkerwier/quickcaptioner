import {Observable, observable, observableArray, computed, pure} from './shortcuts'


/*** Setup ***/
const maxLength = 32;
const ignorePrepositionsLength = 25;
const prepositions = [
    'of',
    'at',
    'to',
    'in',
    'with',
    'without',
    'into',
    'a', // okay, articles aren't prepositions, but we treat them the same
    'an',
    'the'
];
const endingPunctuation = [
    '.',
    ',',
    ']',
    ';',
    ':',
    '+++',
    '--',
    '!',
    '?',
    '?"',
    '."',
    '!"',
    '”',
    "'"
];
const noSpaceRequiredEndingPunctuation = [
    '-'
];
const periodSubstitutions = [
    'Dr.', 'Mrs.', 'Ms.', 'Mr.', 'Ph.D.', 'PhD.', 'Ph.D', '...'
];

/*** End Setup ***/


let regexEscape = (str) => {
    return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

let endsWithRegex = (possibleEndings: string[]) => {
    return new RegExp('(' + possibleEndings.map(regexEscape).join('|') + ')$');
}

let endsWithWordRegex = (possibleEndings: string[]) => {
    return new RegExp('\\b(' + possibleEndings.map(regexEscape).join('|') + ')$');
}


type LineSplitter = (input: string, settings: object) => string[];

let superSimpleSplitLines: LineSplitter = (input) => {
    var regex = /(.{25,32})\s(?=(?:of|a|the|at|to|in)\s)|(.{1,32})\s/g;
    return (input + ' ').match(regex);
};


let preprocess = (str: string) => {
    str = str.trim();
    str = str.replace(/\s+/g, " ");
    for (let i=0; i<periodSubstitutions.length; i++) {
        let item = periodSubstitutions[i];
        let replacement = item.replace(/\./g, '+');
        let itemRegex = new RegExp(regexEscape(item), 'g');
        str = str.replace(itemRegex, replacement);
    }
    return str;
}

let postprocess = (str: string) => {
    str = str.trim();
    for (let i=0; i<periodSubstitutions.length; i++) {
        let item = periodSubstitutions[i];
        let replacement = item.replace(/\./g, '+');
        let reverseRegex = new RegExp(regexEscape(replacement), 'g');
        str = str.replace(reverseRegex, item);
    }
    return str;
}


let specSplitLines: LineSplitter = (input) => {
    let endsWithPreposition = endsWithWordRegex(prepositions);
    let endsWithPunctuation = endsWithRegex(endingPunctuation.concat(noSpaceRequiredEndingPunctuation));
    let endsWithHyphen = endsWithRegex(noSpaceRequiredEndingPunctuation);

    input = preprocess(input);
    let results = [];
    let startPos = 0;
    let addResult = (result: string) => {
        results.push(postprocess(result));
        startPos += result.length;
    };
    while (startPos < input.length) {
        if (input.length - startPos < maxLength) {
            // last line
            addResult(input.substr(startPos));
            break;
        }
        // if our line would start with whitespace, just move to the next character
        if (input[startPos].match(/\s/)) {
            startPos++;
            continue;
        }
        let len = maxLength + 1;
        let result = null;
        let fallbackResult = null;
        while (len > 0 && !result) {
            if (len < ignorePrepositionsLength) {
                result = fallbackResult;
                break;
            }
            let finalChar = input[startPos + len - 1];
            if (finalChar.match(/\s/)) {
                // we're at a space
                let restOfLine = input.substr(startPos, len - 1);
                if (restOfLine.match(endsWithPunctuation) || !restOfLine.match(endsWithPreposition)) {
                    result = restOfLine + ' ';
                } else {
                    //if (!fallbackResult)
                    fallbackResult = restOfLine + ' ';
                }
            } else if (len <= maxLength) {
                let line = input.substr(startPos, len);
                if (line.match(endsWithHyphen)) {
                    result = line;
                }
            }
            len--;
        }
        if (result) {
            addResult(result);
        } else {
            // last resort: just make a line of maximum length ending with a hyphen
            results.push(postprocess(input.substr(startPos, maxLength-1) + '-'));
            startPos += maxLength - 1;
        }
    }
    return results;
}


const alwaysBreakBefore = [
    '>>'
];
const alwaysBreakAfter = [
    '.',
    '?',
    '!'
];
const preferBreakBefore = [
];
const preferBreakAfter = [
    ',',
    '--',
    '...'
];

/*** Token lists ***/
let longestToShortest = (a, b) => b.length - a.length;
let endTokens = alwaysBreakAfter.concat(preferBreakAfter, periodSubstitutions).sort(longestToShortest);
endTokens = prepositions.map(regexEscape).map(x => '\\b' + x).concat(endTokens.map(regexEscape));
let endTokenRegex = new RegExp('(' + endTokens.join('|') + ')$', 'i');
let startTokens = alwaysBreakAfter.concat(preferBreakBefore, periodSubstitutions).sort(longestToShortest).map(regexEscape);
let startTokenRegex = new RegExp('^(' + startTokens.join('|') + ')', 'i');
let longestStartToken = startTokens[0].length;

/*** Helper functions ***/
let isWhitespace = char => !!char.match(/\s/);
let getEndToken = str => {
    let result = endTokenRegex.exec(str);
    return result && result[0];
}
let getStartToken = str => {
    let result = startTokenRegex.exec(str);
    return result && result[0];
}
let mustBreakBefore = str => alwaysBreakBefore.indexOf(getStartToken(str)) > -1;
let shouldBreakBefore = str => preferBreakBefore.indexOf(getStartToken(str)) > -1;
let mustBreakAfter = str => alwaysBreakAfter.indexOf(getEndToken(str)) > -1;
let shouldBreakAfter = str => preferBreakAfter.indexOf(getEndToken(str)) > -1;
let shouldntBreakAfter = str => prepositions.indexOf(getEndToken(str)) > -1;

let betterSplitLines: LineSplitter = (input, settings) => {
    let maxLength = settings['maxLength'];
    let ignorePrepositionsLength = settings['softMinimum'];
    input = input.trim().replace(/\s+/g, " ");
    let results = [];
    let startPos = 0;
    while (startPos < input.length) {
        while (isWhitespace(input[startPos])) {
            startPos++;
        }
        let sample = input.substr(startPos, maxLength + longestStartToken);
        let len = 0;
        let candidate = "";
        let goodCandidate = false;
        while (++len <= maxLength) {
            if (startPos + len >= input.length) {
                candidate = sample;
                break;
            }
            let char = input[startPos + len];
            if(isWhitespace(char)) {
                let strBefore = sample.substr(0, len);
                let strAfter = sample.substr(len);
                if (mustBreakAfter(strBefore) || mustBreakBefore(strAfter)) {
                    candidate = strBefore;
                    break;
                }
                if (len <= ignorePrepositionsLength) {
                    candidate = strBefore;
                    continue;
                }
                if (shouldBreakAfter(strBefore) || shouldBreakBefore(strAfter)) {
                    candidate = strBefore;
                    goodCandidate = true;
                    continue;
                }
                if (!goodCandidate && !shouldntBreakAfter(strBefore)) {
                    candidate = strBefore;
                }
                if (!candidate) {
                    candidate = strBefore;
                }
            }
        }
        if (candidate) {
            results.push(candidate.trim());
            startPos += candidate.length;
        } else {
            results.push(sample.substr(0, maxLength - 1) + '-')
            startPos += maxLength;
        }
    }
    return results;
}





export let splitLines = betterSplitLines;