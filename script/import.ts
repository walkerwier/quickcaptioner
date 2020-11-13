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

export function makeFileReceivedHadler(callback: (string) => void) {
    return (files: File[]) => {
        let validFiles = files.filter(getFileParser);
        if (validFiles.length !== 1) {
            return;
        }
        let file = validFiles[0];
        let parser = getFileParser(file);
        let reader = new FileReader();
        reader.onload = () => { callback(parser(reader.result as string)); };
        reader.readAsText(file);
    }
}
