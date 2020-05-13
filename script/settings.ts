import {Observable, observable, observableArray, computed, pure} from './shortcuts'
import mapValues from 'lodash-es/mapValues'

interface Settings {
    maxLength: number;
    softMinimum: number;
    prepositions: string[];
    alwaysBreakBefore: string[];
    alwaysBreakAfter: string[];
    preferBreakBefore: string[];
    preferBreakAfter: string[];
    exceptions: string[];
    nonSpaceBreakPoints: string[];
}

let defaultSettings: Settings = {
    maxLength: 32,
    softMinimum: 25,
    prepositions: [
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
    alwaysBreakBefore: [
        '>>'
    ],
    alwaysBreakAfter: [
        '.',
        '?',
        '!'
    ],
    preferBreakBefore: [
    ],
    preferBreakAfter: [
        ',',
        '--',
        '...'
    ],
    exceptions: [
        'Dr.', 'Mrs.', 'Ms.', 'Mr.', 'Ph.D.', 'PhD.', 'Ph.D', '...'
    ],
    nonSpaceBreakPoints: [
        '-'
    ]
};

type ObservableSettings = {
    [P in keyof Settings]: Observable<Settings[P]>
}

let observableSettings: ObservableSettings = mapValues(defaultSettings, observable);