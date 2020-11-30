import {Observable, observable, observableArray, computed, pure, unwrap} from './shortcuts'
import {map as mapValues, defaults} from './utilities'

let defaultSettings = {
    proofOnly: false,
    maxLength: 32,
    preferCutoff: 20,
    prepositionCutoff: 20,
    hyhpenCutoff: 0,
    'Prepositions': [
        "and",
        "of",
        "with",
        "at",
        "from",
        "into",
        "onto",
        "during",
        "including",
        "until",
        "against",
        "among",
        "throughout",
        "despite",
        "towards",
        "upon",
        "concerning",
        "to",
        "in",
        "for",
        "on",
        "by",
        "about",
        "like",
        "through",
        "over",
        "before",
        "between",
        "after",
        "since",
        "without",
        "under",
        "within",
        "along",
        "following",
        "across",
        "behind",
        "beyond",
        "plus",
        "except",
        "but",
        "up out",
        "around",
        "down",
        "off",
        "above",
        "near",
        "@",
        "or",        
        'a', // okay, articles aren't prepositions, but we treat them the same
        'an',
        'the'
    ],
    'Always Break Before': [
        '>>'
    ],
    'Always Break After': [
        '.',
        '?',
        '!',
        '."',
        '?"',
        '!"'
    ],
    'Prefer Break Before': [
    ],
    'Prefer Break After': [
        ',',
        '--',
        ';',
        ':'
    ],
    'Exceptions': [
        ' Dr.', ' Mrs.', ' Ms.', ' Mr.', ' Ph.D.', ' PhD.', ' Ph.D', '...'
    ],
    'Non-space Breakpoints': [
        '-'
    ]
};

let savedSettings = localStorage['settings'];
savedSettings = savedSettings ? JSON.parse(savedSettings) : {};
let settings = defaults(savedSettings, defaultSettings);


export let observableSettings = mapValues(settings, observable);

// When changing maxLength, make sure none of the cutoffs are higher than the new max
observableSettings.maxLength.subscribe((len) => {
    if (parseInt(observableSettings.preferCutoff()) > parseInt(len)) {
        observableSettings.preferCutoff(len);
    }
    if (parseInt(observableSettings.prepositionCutoff()) > parseInt(len)) {
        observableSettings.prepositionCutoff(len);
    }
    if (parseInt(observableSettings.hyhpenCutoff()) > parseInt(len)) {
        observableSettings.hyhpenCutoff(len);
    }
});

export let resolvedSettings = computed(()=>mapValues(observableSettings, unwrap));

// Anytime settings change, persist them to local storage
resolvedSettings.subscribe((settings) => {
    localStorage['settings'] = JSON.stringify(settings);
});

export let resetSettings = () => {
    mapValues(defaultSettings, (val, name) => {
        observableSettings[name](val);
    });
}