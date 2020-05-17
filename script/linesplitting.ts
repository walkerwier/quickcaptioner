import { start } from "repl";

let regexEscape = (str) => {
    return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}
let isWhitespace = char => !!char.match(/\s/);

type LineSplitter = (input: string) => string[];

let maxLength, preferCutoff, prepositionCutoff, hyhpenCutoff, longestToken;
let mustBreakBefore, shouldBreakBefore, mustBreakAfter, shouldBreakAfter, shouldntBreakAfter, isHyphenEquivalent;

export let setSettings = (settings) => {
    maxLength = parseInt(settings.maxLength);
    preferCutoff = parseInt(settings.preferCutoff);
    prepositionCutoff = parseInt(settings.prepositionCutoff);
    hyhpenCutoff = parseInt(settings.hyhpenCutoff);
    let alwaysBreakAfter = settings['Always Break After'];
    let alwaysBreakBefore = settings['Always Break Before'];
    let preferBreakBefore = settings['Prefer Break Before'];
    let preferBreakAfter = settings['Prefer Break After'];
    let prepositions = settings['Prepositions'];
    let exceptions = settings['Exceptions'];
    let hyphenEquivalents = settings['Non-space Breakpoints'];

    /*** Token lists ***/
    // let longestToShortest = (a, b) => b.length - a.length;
    // let endTokens = alwaysBreakAfter.concat(preferBreakAfter, exceptions).sort(longestToShortest);
    // endTokens = prepositions.map(regexEscape).map(x => '\\b' + x).concat(endTokens.map(regexEscape));
    // let endTokenRegex = new RegExp('(' + endTokens.join('|') + ')$', 'i');
    // let startTokens = alwaysBreakBefore.concat(preferBreakBefore, exceptions).sort(longestToShortest).map(regexEscape);
    // let startTokenRegex = new RegExp('^(' + startTokens.join('|') + ')', 'i');
    // longestStartToken = (startTokens[0] || '').length;

    let tokens = [];
    let addTokens = list => {
        list.forEach(item => {
            tokens.push({
                str: item,
                regex: regexEscape(item)
            });
        });
    }
    addTokens(alwaysBreakBefore);
    addTokens(alwaysBreakAfter);
    addTokens(preferBreakBefore);
    addTokens(preferBreakAfter);
    addTokens(exceptions);
    // prepositions are a little different
    prepositions.forEach(item => {
        tokens.push({
            str: item,
            regex: '\\b' + regexEscape(item)
        });
    });
    tokens.sort((a, b) => b.str.length - a.str.length)
    longestToken = tokens[0].str.length;
    let startTokenRegex = new RegExp('^(' + tokens.map(x => x.regex).join('|') + ')', 'i');
    let endTokenRegex = new RegExp('(' + tokens.map(x => x.regex).join('|') + ')$', 'i');

    /*** Helper functions ***/
    let getEndToken = str => {
        let result = endTokenRegex.exec(str);
        return result && result[0];
    }
    let getStartToken = str => {
        let result = startTokenRegex.exec(str);
        return result && result[0];
    }
    mustBreakBefore = str => alwaysBreakBefore.indexOf(getStartToken(str)) > -1;
    shouldBreakBefore = str => preferBreakBefore.indexOf(getStartToken(str)) > -1;
    mustBreakAfter = str => alwaysBreakAfter.indexOf(getEndToken(str)) > -1;
    shouldBreakAfter = str => preferBreakAfter.indexOf(getEndToken(str)) > -1;
    shouldntBreakAfter = str => prepositions.indexOf(getEndToken(str)) > -1;
    isHyphenEquivalent = str => hyphenEquivalents.indexOf(str) > -1;
};


let betterSplitLines: LineSplitter = (input) => {
    input = input.trim().replace(/\s+/g, " ");
    let results = [];
    let startPos = 0;
    while (startPos < input.length) {
        while (isWhitespace(input[startPos])) {
            startPos++;
        }
        let sample = input.substr(startPos, maxLength + longestToken);
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
                let strAfter = sample.substr(len + 1);
                if (mustBreakAfter(strBefore) || mustBreakBefore(strAfter)) {
                    candidate = strBefore;
                    break;
                }
                if ((len < preferCutoff) && (len < prepositionCutoff)) {
                    candidate = strBefore;
                    continue;
                }
                if ((len >= preferCutoff) && (shouldBreakAfter(strBefore) || shouldBreakBefore(strAfter))) {
                    candidate = strBefore;
                    goodCandidate = true;
                    continue;
                }
                if (goodCandidate) {
                    continue;
                }
                if (candidate.length < prepositionCutoff) {
                    candidate = strBefore;
                    continue;
                }
                if (!shouldntBreakAfter(strBefore)) {
                    candidate = strBefore;
                }
                if (!candidate) {
                    candidate = strBefore;
                }
            } else if (
                isHyphenEquivalent(char) &&
                (len < maxLength) &&
                (candidate.length < hyhpenCutoff) &&
                !goodCandidate
            ) {
                candidate = sample.substr(0, len+1);
            }
        }
        if (candidate) {
            results.push(candidate.trim());
            startPos += candidate.length;
        } else {
            results.push(sample.substr(0, maxLength - 1) + '-');
            startPos += maxLength;
        }
    }
    return results;
}





export let splitLines = betterSplitLines;