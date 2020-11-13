// Arbitrary placeholder character to represent hard breaks (three newlines) in input text
let placeholderChar = String.fromCharCode(314159);

let regexEscape = (str) => {
    return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}
let isWhitespace = char => !!char.match(/\s/);

type LineSplitter = (input: string) => string[][];

// Variables that are updated whenever settings change:
let maxLength, preferCutoff, prepositionCutoff, hyhpenCutoff, longestToken;
// Helper functions that are recreated whenever settings change:
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

    /*** Token list ***/

    /*
    "Token" here means any of the words, phrases, punctuation entered
    into the settings ("Prepositions", "Always Break Before", "Exceptions", etc.),
    except the "Non-space breakpoints" (hyphenEquivalents).

    All the tokens, whether they're "break before" or "break after" are combined
    into one list and searched for in order from longest to shortest.
    That way, a longer token (e.g. "..." or "Mr.") that contains a shorter token (".")
    will never match a rule looking for the shorter token.

    For example, the function mustBreakAfter(input) tests to see if the input text ends
    in a token, and then it checks whether that token is on the "Always Break After" list.
    If "." is on the "Always Break After" list and "Mr." is on the "Exceptions" list,
    then mustBreakAfter("blah blah blah.") will find that the input ends in the token "."
    which is on the "Always Break After" list and thus will return true.
    However, mustBreakAfter("blah blah Mr.") will find the input ends in the token "Mr."
    which is not on the "Always Break After" list and will return false.
    */

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
    // Prepositions are a little different; add a 'word boundary' to the begining of the regex.
    prepositions.forEach(item => {
        tokens.push({
            str: item,
            regex: '\\b' + regexEscape(item)
        });
    });
    // Sort the token list from longest to shortest.
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


/*** THE IMPORTANT PART ***/

export let splitLines: LineSplitter = (input) => {

    input = input.trim();
    // Replace three or more line breaks with placeholder character that represents a hard break.
    // Handles Unix/Mac line breaks (\n) and Windows line breaks (\r\n).
    input = input.replace(/\s*(\n{3,}|(\r\n){3,})\s*/g, placeholderChar);
    // Then consolidate all other whitespace to single spaces.
    input = input.replace(/\s+/g, " ");

    let paragraphs: string[][] = [];
    let paragraph: string[] = [];
    let startPos = 0;

    // This loop repeats once per line of output:
    while (startPos < input.length) {

        // If our would-be line starts with whitespace, just skip over it:
        while (isWhitespace(input[startPos])) {
            startPos++;
        }
        // We'll limit our focus to the maximum line length plus the maximum token lengt.
        // (so we can consider "must/prefer break before" tokens immediatedly after our would-be line).
        let sample = input.substr(startPos, maxLength + longestToken);

        // Setup
        let len = 0;
        let candidate = "";
        let goodCandidate = false;
        let hardBreak = false;

        // This loop builds up the line one character at a time, considering every possibility until
        // it finds a "must break" condition or reaches the max line length or the end of the input.
        // It keeps updating the "candidate" variable with the best place found so far to break the line.
        while (++len <= maxLength) {
            if (startPos + len >= input.length) {
                // We've reached the end of our input text
                candidate = sample;
                break;
            }
            let char = input[startPos + len];
            if (char === placeholderChar) {
                // Hard break in the input text
                candidate = sample.substr(0, len);
                hardBreak = true;
                startPos++;
                break;
            }
            if(isWhitespace(char)) {
                // Most of our rules are only evaluated when we reach a space.
                let strBefore = sample.substr(0, len);
                let strAfter = sample.substr(len + 1);
                if (mustBreakAfter(strBefore) || mustBreakBefore(strAfter)) {
                    // If we're at an "Always Break" token, that's easy: do it.
                    candidate = strBefore;
                    hardBreak = true;
                    break;
                }
                if ((len < preferCutoff) && (len < prepositionCutoff)) {
                    // If our line is shorter than the cutoffs where we care about "Prefer" rules,
                    // then we just say this is an acceptable split but we keep looking for a better one.
                    candidate = strBefore;
                    continue;
                }
                if ((len >= preferCutoff) && (shouldBreakAfter(strBefore) || shouldBreakBefore(strAfter))) {
                    // We've reached a comma or something and the line is long enough. This will be where
                    // we split unless we find another "Prefer Break Before/After" token before our line gets too long.
                    candidate = strBefore;
                    goodCandidate = true;
                    continue;
                }
                if (goodCandidate) {
                    // If the above rule has found a candidate, skip everything below.
                    continue;
                }
                // The next three rules handle the logic that avoids breaking after prepositions:
                if (candidate.length < prepositionCutoff) {
                    // The line isn't long enough for us to care whether it ends in a preposition or not,
                    // so we'll break here if we can't find anything better.
                    candidate = strBefore;
                    continue;
                }
                if (!shouldntBreakAfter(strBefore)) {
                    // The line does not end in a preposition. It's an okay place to break.
                    candidate = strBefore;
                }
                // We only reach this point if the line ends in a preposition and is longer than the cutoff.
                if (!candidate) {
                    // We only will consider breaking here if we haven't found any other acceptable place to break yet.
                    candidate = strBefore;
                }
            // End of the rules evaluated at spaces.
            // The next rule handles breaking at hyphens and anything else on the "Non-space breakpoints" list
            } else if (
                isHyphenEquivalent(char) &&
                (len < maxLength) &&
                (candidate.length < hyhpenCutoff) &&
                !goodCandidate
            ) {
                candidate = sample.substr(0, len+1);
            }
        }
        // Done evaluating rules. Add our line to our paragraph.
        // If it's a hard break, close our paragraph and start a new one.
        if (candidate) {
            paragraph.push(candidate.trim());
            if (hardBreak) {
                paragraphs.push(paragraph);
                paragraph = [];
            }
            startPos += candidate.length;
        } else {
            // We never found anywhere to break. We must be in the middle of a giant word.
            // Just fit as much as we can of the word into this line, add a hyphen,
            // and start the next line with the rest of the word.
            paragraph.push(sample.substr(0, maxLength - 1) + '-');
            startPos += maxLength;
        }
    }

    // Close the final paragraph.
    paragraphs.push(paragraph);

    return paragraphs;
}
