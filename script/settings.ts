import {Observable, observable, observableArray, computed, pure, unwrap} from './shortcuts'
import {map as mapValues, defaults} from './utilities'
//import defaults from 'lodash-es/defaults'

let defaultSettings = {
    proofOnly: false,
    maxLength: 32,
    preferCutoff: 25,
    prepositionCutoff: 25,
    hyhpenCutoff: 25,
    'Prepositions': [
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
    ],
    'Always Break Before': [
        '>>'
    ],
    'Always Break After': [
        '.',
        '?',
        '!'
    ],
    'Prefer Break Before': [
    ],
    'Prefer Break After': [
        ',',
        '--'
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

resolvedSettings.subscribe((settings) => {
    localStorage['settings'] = JSON.stringify(settings);
});

export let resetSettings = () => {
    mapValues(defaultSettings, (val, name) => {
        observableSettings[name](val);
    });
}