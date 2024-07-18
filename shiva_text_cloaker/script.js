function copy() {
    const textarea = document.getElementById("textarea");
    textarea.select();
    document.execCommand("copy");
    Toastify({
        text: "Copied to clipboard",
        backgroundColor: "linear-gradient(to right, #ff0000, #000000)",
        className: "info",
    }).showToast();
}

function about() {
    document.getElementById('textarea').value = 'This app was created by: shivanand\n\nThis app will bypass the AI detectors very easily.\nYou will get 100% Human Text results ;)';
}

function encrypt() {
    const textarea = document.getElementById("textarea");
    const text = textarea.value;
    const encodedText = encoding(text);

    textarea.value = encodedText;

    Toastify({
        text: "Text encoded successfully!",
        backgroundColor: "linear-gradient(to right, #00ff00, #000000)",
        className: "success",
    }).showToast();
}

function encode_string(text) {
    const specialChars = ['\u200D', '\u200B', '\uFEFF', '\u2060', '\u2061'];
    let encodedText = '';
    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

    for (let i = 0; i < text.length; i++) {
        encodedText += random(specialChars) + text[i] + random(specialChars);
    }

    return encodedText;
}

function encoding(text) {
    return "#resulted text can Bypass any AI Detector\n# Made by shivanand k\n\n" + encode_string(text);
}
