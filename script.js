/* =========================================================
   JARVIS COMMAND SYSTEM
   VOICE → COMMAND → ACTION
   AUTO EXECUTION VERSION
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const $ = id => document.getElementById(id);

const speakButton = $("speakButton");
const speakLabel = $("speakLabel");

const transcript = $("transcript");
const transcriptState = $("transcriptState");

const voiceStatus = $("voiceStatus");
const voiceEngine = $("voiceEngine");
const recordingIndicator = $("recordingIndicator");

const voiceHint = $("voiceHint");
const listenTimer = $("listenTimer");

const voicePercent = $("voicePercent");
const voiceBar = $("voiceBar");

const corePercent = $("corePercent");
const coreBar = $("coreBar");

const sessionTime = $("sessionTime");
const sessionBar = $("sessionBar");

const commandInput = $("commandInput");
const sendButton = $("sendButton");

const stopVoice = $("stopVoice");
const stopSpeaking = $("stopSpeaking");

const wakeToggle = $("wakeToggle");

const activityLog = $("activityLog");
const clearLog = $("clearLog");

const commandCount = $("commandCount");
const commandState = $("commandState");

const stateText = $("stateText");


/* =========================================================
   STATE
========================================================= */

let recognition = null;

let listening = false;
let speaking = false;
let processing = false;

let wakeMode = false;

let commandTotal = 0;

let listenSeconds = 0;
let sessionSeconds = 0;

let listenInterval = null;

let lastCommand = "";
let lastCommandTime = 0;


/* =========================================================
   SPEECH RECOGNITION
========================================================= */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-IN";

    /*
       continuous = true means JARVIS
       can keep listening.
    */
    recognition.continuous = true;

    /*
       interim results make the transcript
       update while you are speaking.
    */
    recognition.interimResults = true;

    recognition.maxAlternatives = 1;


    /* -----------------------------------------
       START
    ----------------------------------------- */

    recognition.onstart = () => {

        listening = true;

        document.body.classList.add("listening");

        recordingIndicator.classList.add("active");

        recordingIndicator.innerHTML =
            "<i></i><span>MIC ACTIVE</span>";

        voiceStatus.textContent =
            "LISTENING";

        voiceEngine.textContent =
            "ACTIVE";

        speakLabel.textContent =
            "LISTENING";

        transcriptState.textContent =
            "HEARING";

        commandState.textContent =
            "LISTEN";

        stateText.textContent =
            wakeMode
                ? 'WAKE MODE // SAY "JARVIS"'
                : "LISTENING // SPEAK NOW";

        voiceHint.textContent =
            wakeMode
                ? 'Say "Jarvis" followed by your command.'
                : "Speak normally. Command executes automatically.";

        startListenTimer();

        setPipeline("listen");
    };


    /* -----------------------------------------
       SPEECH RESULT
    ----------------------------------------- */

    recognition.onresult = event => {

        let finalText = "";
        let interimText = "";


        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            const result =
                event.results[i];

            const text =
                result[0]
                    .transcript
                    .trim();


            if (result.isFinal) {

                finalText +=
                    " " + text;

            } else {

                interimText +=
                    " " + text;

            }

        }


        const liveText =
            (
                finalText ||
                interimText
            ).trim();


        if (liveText) {

            transcript.textContent =
                liveText;

            transcriptState.textContent =
                finalText
                    ? "COMMAND RECEIVED"
                    : "HEARING";

            animateVoice();
        }


        /*
           THIS IS THE IMPORTANT PART.

           Once speech becomes FINAL,
           JARVIS automatically executes it.

           You DON'T need to press EXECUTE.
        */

        if (finalText.trim()) {

            processVoiceCommand(
                finalText.trim()
            );

        }

    };


    /* -----------------------------------------
       ERROR
    ----------------------------------------- */

    recognition.onerror = event => {

        console.log(
            "Voice error:",
            event.error
        );


        if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
        ) {

            wakeMode = false;

            wakeToggle.classList.remove(
                "active"
            );

            transcript.textContent =
                "Microphone permission is blocked.";

            addLog(
                "SYSTEM",
                "MICROPHONE PERMISSION REQUIRED"
            );

        }

    };


    /* -----------------------------------------
       END
    ----------------------------------------- */

    recognition.onend = () => {

        listening = false;

        stopListenTimer();


        /*
           In wake mode, restart microphone
           automatically.
        */

        if (
            wakeMode &&
            !processing &&
            !speaking
        ) {

            setTimeout(
                () => {

                    startListening();

                },
                400
            );

            return;
        }


        if (!processing && !speaking) {

            resetVoiceUI();

        }

    };

} else {

    voiceStatus.textContent =
        "UNSUPPORTED";

    voiceEngine.textContent =
        "UNAVAILABLE";

    transcript.textContent =
        "Voice recognition is not supported by this browser.";

}


/* =========================================================
   MAIN SPEAK BUTTON
========================================================= */

speakButton.addEventListener(
    "click",
    () => {

        if (!recognition) {

            return;

        }


        if (listening) {

            stopListening();

            return;

        }


        wakeMode = false;

        wakeToggle.classList.remove(
            "active"
        );

        startListening();

    }
);


/* =========================================================
   WAKE MODE
========================================================= */

wakeToggle.addEventListener(
    "click",
    () => {

        wakeMode =
            !wakeMode;


        wakeToggle.classList.toggle(
            "active",
            wakeMode
        );


        if (wakeMode) {

            addLog(
                "SYSTEM",
                'WAKE MODE ENABLED — SAY "JARVIS"'
            );

            voiceHint.textContent =
                'Say "Jarvis" followed by a command.';


            if (!listening) {

                startListening();

            }

        } else {

            addLog(
                "SYSTEM",
                "WAKE MODE DISABLED"
            );


            stopListening();

        }

    }
);


/* =========================================================
   START LISTENING
========================================================= */

function startListening() {

    if (!recognition) return;


    try {

        recognition.start();

    } catch (error) {

        console.log(
            "Recognition already running."
        );

    }

}


/* =========================================================
   STOP LISTENING
========================================================= */

function stopListening() {

    wakeMode = false;

    wakeToggle.classList.remove(
        "active"
    );


    try {

        recognition.stop();

    } catch (error) {}


    listening = false;

    stopListenTimer();

    resetVoiceUI();

}


/* =========================================================
   PROCESS VOICE COMMAND
========================================================= */

function processVoiceCommand(text) {

    const command =
        text
            .replace(/\s+/g, " ")
            .trim();


    if (!command) return;


    /*
       Prevent duplicate commands.
    */

    const now =
        Date.now();


    if (
        command.toLowerCase() ===
        lastCommand.toLowerCase() &&
        now - lastCommandTime < 2500
    ) {

        return;

    }


    lastCommand =
        command;

    lastCommandTime =
        now;


    addLog(
        "USER",
        command
    );


    transcript.textContent =
        command;


    /* -----------------------------------------
       JARVIS WAKE PHRASE
    ----------------------------------------- */

    const wake =
        command.match(
            /^(hey\s+jarvis|okay\s+jarvis|ok\s+jarvis|jarvis)\b/i
        );


    if (wake) {

        const remaining =
            command
                .replace(
                    wake[0],
                    ""
                )
                .trim();


        /*
           User only said:
           "Jarvis"
        */

        if (!remaining) {

            wakeMode = true;

            wakeToggle.classList.add(
                "active"
            );


            jarvisSpeak(
                "Yes. I'm listening."
            );

            return;

        }


        /*
           User said:
           "Jarvis open YouTube"
        */

        executeCommand(
            remaining
        );

        return;

    }


    /*
       Normal speech.
    */

    if (!wakeMode) {

        executeCommand(
            command
        );

    }

}


/* =========================================================
   COMMAND ENGINE
========================================================= */

function executeCommand(command) {

    if (
        !command ||
        processing
    ) {

        return;

    }


    processing = true;

    commandTotal++;


    commandCount.textContent =
        `${commandTotal} COMMAND${commandTotal === 1 ? "" : "S"}`;


    document.body.classList.add(
        "processing"
    );


    commandState.textContent =
        "PROCESSING";

    voiceStatus.textContent =
        "PROCESSING";

    transcriptState.textContent =
        "EXECUTING";

    stateText.textContent =
        "COMMAND EXECUTION";


    setPipeline("think");


    const lower =
        command.toLowerCase();


    /* =====================================================
       STOP SPEAKING
    ===================================================== */

    if (
        lower.includes("stop speaking") ||
        lower.includes("stop talking") ||
        lower === "be quiet"
    ) {

        speechStop();

        finish(
            "Voice output stopped.",
            false
        );

        return;

    }


    /* =====================================================
       TIME
    ===================================================== */

    if (
        lower.includes("what time") ||
        lower.includes("current time") ||
        lower === "time"
    ) {

        const time =
            new Date()
                .toLocaleTimeString(
                    [],
                    {
                        hour: "numeric",
                        minute: "2-digit"
                    }
                );


        finish(
            `The current time is ${time}.`
        );

        return;

    }


    /* =====================================================
       DATE
    ===================================================== */

    if (
        lower.includes("what date") ||
        lower.includes("today's date") ||
        lower.includes("todays date") ||
        lower === "date"
    ) {

        const date =
            new Date()
                .toLocaleDateString(
                    [],
                    {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    }
                );


        finish(
            `Today is ${date}.`
        );

        return;

    }


    /* =====================================================
       OPEN GOOGLE
    ===================================================== */

    if (
        lower === "open google" ||
        lower === "go to google"
    ) {

        openWebsite(
            "https://www.google.com",
            "Opening Google."
        );

        return;

    }


    /* =====================================================
       OPEN YOUTUBE
    ===================================================== */

    if (
        lower === "open youtube" ||
        lower === "go to youtube"
    ) {

        openWebsite(
            "https://www.youtube.com",
            "Opening YouTube."
        );

        return;

    }


    /* =====================================================
       OPEN GITHUB
    ===================================================== */

    if (
        lower === "open github" ||
        lower === "go to github"
    ) {

        openWebsite(
            "https://github.com",
            "Opening GitHub."
        );

        return;

    }


    /* =====================================================
       OPEN WIKIPEDIA
    ===================================================== */

    if (
        lower === "open wikipedia" ||
        lower === "go to wikipedia"
    ) {

        openWebsite(
            "https://www.wikipedia.org",
            "Opening Wikipedia."
        );

        return;

    }


    /* =====================================================
       GOOGLE SEARCH
    ===================================================== */

    if (
        lower.startsWith(
            "search google for "
        ) ||
        lower.startsWith(
            "search google "
        )
    ) {

        const query =
            command
                .replace(
                    /^search google for /i,
                    ""
                )
                .replace(
                    /^search google /i,
                    ""
                )
                .trim();


        googleSearch(
            query
        );

        return;

    }


    /* =====================================================
       YOUTUBE SEARCH
    ===================================================== */

    if (
        lower.startsWith(
            "search youtube for "
        ) ||
        lower.startsWith(
            "search youtube "
        )
    ) {

        const query =
            command
                .replace(
                    /^search youtube for /i,
                    ""
                )
                .replace(
                    /^search youtube /i,
                    ""
                )
                .trim();


        youtubeSearch(
            query
        );

        return;

    }


    /* =====================================================
       GENERIC SEARCH
    ===================================================== */

    if (
        lower.startsWith("search ") ||
        lower.startsWith("search for ") ||
        lower.startsWith("look up ") ||
        lower.startsWith("find ")
    ) {

        const query =
            command
                .replace(
                    /^search for /i,
                    ""
                )
                .replace(
                    /^search /i,
                    ""
                )
                .replace(
                    /^look up /i,
                    ""
                )
                .replace(
                    /^find /i,
                    ""
                )
                .trim();


        googleSearch(
            query
        );

        return;

    }


    /* =====================================================
       OPEN WEBSITE
    ===================================================== */

    if (
        lower.startsWith("open ") ||
        lower.startsWith("go to ")
    ) {

        const site =
            command
                .replace(
                    /^open /i,
                    ""
                )
                .replace(
                    /^go to /i,
                    ""
                )
                .trim();


        openAnyWebsite(
            site
        );

        return;

    }


    /* =====================================================
       GREETING
    ===================================================== */

    if (
        lower === "hello" ||
        lower === "hi" ||
        lower === "hey"
    ) {

        finish(
            "Hello. JARVIS is online and ready."
        );

        return;

    }


    /* =====================================================
       UNKNOWN COMMAND
       Search it automatically.
    ===================================================== */

    googleSearch(
        command
    );

}


/* =========================================================
   OPEN ANY WEBSITE
========================================================= */

function openAnyWebsite(site) {

    site =
        site
            .replace(
                /^website\s+/i,
                ""
            )
            .trim();


    const knownSites = {

        google:
            "https://www.google.com",

        youtube:
            "https://www.youtube.com",

        github:
            "https://github.com",

        wikipedia:
            "https://www.wikipedia.org",

        reddit:
            "https://www.reddit.com",

        instagram:
            "https://www.instagram.com",

        facebook:
            "https://www.facebook.com",

        twitter:
            "https://x.com",

        x:
            "https://x.com",

        amazon:
            "https://www.amazon.com",

        netflix:
            "https://www.netflix.com",

        chatgpt:
            "https://chatgpt.com"

    };


    const key =
        site
            .toLowerCase()
            .replace(/\s+/g, "");


    if (
        knownSites[key]
    ) {

        openWebsite(
            knownSites[key],
            `Opening ${site}.`
        );

        return;

    }


    let url =
        site;


    /*
       If user says:
       "google.com"
    */

    if (
        !url.startsWith("https://") &&
        !url.startsWith("http://")
    ) {

        url =
            "https://" + url;

    }


    /*
       If it looks like a real domain,
       automatically open it.
    */

    if (
        isWebsite(url)
    ) {

        openWebsite(
            url,
            `Opening ${site}.`
        );

    } else {

        /*
           If it isn't a website,
           search it instead.
        */

        googleSearch(
            site
        );

    }

}


/* =========================================================
   WEBSITE VALIDATION
========================================================= */

function isWebsite(url) {

    try {

        const parsed =
            new URL(url);


        return (
            parsed.hostname.includes(".") ||
            parsed.hostname === "localhost"
        );

    } catch (error) {

        return false;

    }

}


/* =========================================================
   IMPORTANT:
   AUTOMATIC WEBSITE NAVIGATION
========================================================= */

function openWebsite(url, response) {

    setPipeline("execute");


    addLog(
        "JARVIS",
        response
    );


    transcript.textContent =
        response;


    /*
       JARVIS speaks before navigating.
    */

    jarvisSpeak(
        response
    );


    /*
       Automatically navigate the CURRENT TAB.

       This avoids popup blocking.

       No "OPEN PAGE" button.
       No second click.
    */

    setTimeout(
        () => {

            window.location.href =
                url;

        },
        500
    );

}


/* =========================================================
   GOOGLE SEARCH
========================================================= */

function googleSearch(query) {

    if (!query) {

        finish(
            "Tell me what you want me to search."
        );

        return;

    }


    setPipeline("execute");


    const url =
        "https://www.google.com/search?q=" +
        encodeURIComponent(
            query
        );


    const response =
        `Searching Google for ${query}.`;


    addLog(
        "JARVIS",
        response
    );


    transcript.textContent =
        response;


    jarvisSpeak(
        response
    );


    /*
       Automatically navigate.
    */

    setTimeout(
        () => {

            window.location.href =
                url;

        },
        500
    );

}


/* =========================================================
   YOUTUBE SEARCH
========================================================= */

function youtubeSearch(query) {

    if (!query) {

        finish(
            "Tell me what you want me to search on YouTube."
        );

        return;

    }


    setPipeline("execute");


    const url =
        "https://www.youtube.com/results?search_query=" +
        encodeURIComponent(
            query
        );


    const response =
        `Searching YouTube for ${query}.`;


    addLog(
        "JARVIS",
        response
    );


    transcript.textContent =
        response;


    jarvisSpeak(
        response
    );


    setTimeout(
        () => {

            window.location.href =
                url;

        },
        500
    );

}


/* =========================================================
   JARVIS VOICE
========================================================= */

function jarvisSpeak(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        finishVisualState();

        return;

    }


    speechStop();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.lang =
        "en-IN";


    /*
       Slightly slower gives a more
       assistant-like voice.
    */

    utterance.rate =
        0.90;


    utterance.pitch =
        0.78;


    utterance.volume =
        1;


    const voices =
        speechSynthesis
            .getVoices();


    const preferred =
        voices.find(
            voice =>
                /en/i.test(
                    voice.lang
                ) &&
                /Google|Microsoft|Daniel|Alex|David/i.test(
                    voice.name
                )
        );


    if (preferred) {

        utterance.voice =
            preferred;

    }


    speaking = true;


    voiceStatus.textContent =
        "SPEAKING";

    transcriptState.textContent =
        "VOICE OUTPUT";

    stateText.textContent =
        "JARVIS // SPEAKING";


    utterance.onstart =
        () => {

            document.body.classList.add(
                "speaking"
            );

        };


    utterance.onend =
        () => {

            speaking = false;

            document.body.classList.remove(
                "speaking"
            );


            processing = false;

            document.body.classList.remove(
                "processing"
            );


            /*
               Wake mode returns to listening.
            */

            if (
                wakeMode &&
                !listening
            ) {

                setTimeout(
                    () => {

                        startListening();

                    },
                    250
                );

            } else {

                resetVoiceUI();

            }

        };


    utterance.onerror =
        () => {

            speaking = false;

            processing = false;

            resetVoiceUI();

        };


    speechSynthesis.speak(
        utterance
    );

}


/* =========================================================
   STOP SPEECH
========================================================= */

function speechStop() {

    if (
        "speechSynthesis" in window
    ) {

        speechSynthesis.cancel();

    }

}


/* =========================================================
   FINISH
========================================================= */

function finish(
    message,
    speak = true
) {

    addLog(
        "JARVIS",
        message
    );


    transcript.textContent =
        message;


    setPipeline(
        "execute"
    );


    if (speak) {

        jarvisSpeak(
            message
        );

    } else {

        finishVisualState();

    }

}


/* =========================================================
   FINISH VISUAL STATE
========================================================= */

function finishVisualState() {

    processing = false;

    document.body.classList.remove(
        "processing"
    );


    if (!speaking) {

        resetVoiceUI();

    }

}


/* =========================================================
   RESET VOICE UI
========================================================= */

function resetVoiceUI() {

    document.body.classList.remove(
        "listening",
        "processing"
    );


    recordingIndicator.classList.remove(
        "active"
    );


    recordingIndicator.innerHTML =
        "<i></i><span>MIC OFF</span>";


    voiceStatus.textContent =
        "READY";


    voiceEngine.textContent =
        wakeMode
            ? "WAKE READY"
            : "READY";


    speakLabel.textContent =
        "SPEAK";


    transcriptState.textContent =
        "WAITING";


    commandState.textContent =
        "STANDBY";


    stateText.textContent =
        wakeMode
            ? 'WAKE MODE // SAY "JARVIS"'
            : "SYSTEM STANDBY";


    voiceHint.textContent =
        wakeMode
            ? 'Say "Jarvis" followed by a command.'
            : "Tap the core and speak a command.";


    setPipeline("wake");

}


/* =========================================================
   LISTEN TIMER
========================================================= */

function startListenTimer() {

    clearInterval(
        listenInterval
    );


    listenSeconds = 0;


    listenInterval =
        setInterval(
            () => {

                listenSeconds++;


                const minutes =
                    Math.floor(
                        listenSeconds / 60
                    );


                const seconds =
                    listenSeconds % 60;


                listenTimer.textContent =
                    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


                animateVoice();

            },
            1000
        );

}


function stopListenTimer() {

    clearInterval(
        listenInterval
    );


    listenTimer.textContent =
        "00:00";

}


/* =========================================================
   VOICE ANIMATION
========================================================= */

function animateVoice() {

    const value =
        35 +
        Math.random() * 65;


    voicePercent.textContent =
        `${Math.floor(value)}%`;


    voiceBar.style.width =
        `${value}%`;


    document
        .querySelectorAll(
            ".waveform i"
        )
        .forEach(
            bar => {

                bar.style.height =
                    `${6 + Math.random() * 38}px`;

            }
        );

}


/* =========================================================
   PIPELINE
========================================================= */

function setPipeline(active) {

    const steps = {

        wake:
            $("stepWake"),

        listen:
            $("stepListen"),

        think:
            $("stepThink"),

        execute:
            $("stepExecute")

    };


    Object.values(
        steps
    ).forEach(
        step => {

            if (step) {

                step.classList.remove(
                    "active"
                );

            }

        }
    );


    if (
        steps[active]
    ) {

        steps[active]
            .classList.add(
                "active"
            );

    }

}


/* =========================================================
   MANUAL COMMAND
========================================================= */

sendButton.addEventListener(
    "click",
    sendManualCommand
);


commandInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            sendManualCommand();

        }

    }
);


function sendManualCommand() {

    const command =
        commandInput.value.trim();


    if (!command) return;


    commandInput.value =
        "";


    addLog(
        "USER",
        command
    );


    transcript.textContent =
        command;


    executeCommand(
        command
    );

}


/* =========================================================
   QUICK COMMAND BUTTONS
========================================================= */

document
    .querySelectorAll(
        "[data-command]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const command =
                        button.dataset.command;


                    addLog(
                        "USER",
                        command
                    );


                    transcript.textContent =
                        command;


                    executeCommand(
                        command
                    );

                }
            );

        }
    );


/* =========================================================
   STOP LISTENING BUTTON
========================================================= */

stopVoice.addEventListener(
    "click",
    () => {

        stopListening();


        addLog(
            "SYSTEM",
            "VOICE LISTENING STOPPED"
        );

    }
);


/* =========================================================
   STOP SPEAKING BUTTON
========================================================= */

stopSpeaking.addEventListener(
    "click",
    () => {

        speechStop();


        speaking = false;

        processing = false;


        addLog(
            "SYSTEM",
            "JARVIS SPEECH STOPPED"
        );


        resetVoiceUI();

    }
);


/* =========================================================
   CLEAR COMMAND LOG
========================================================= */

clearLog.addEventListener(
    "click",
    () => {

        activityLog.innerHTML =
            "";


        addLog(
            "SYSTEM",
            "COMMAND STREAM CLEARED"
        );

    }
);


/* =========================================================
   CLOCK
========================================================= */

function updateClock() {

    $("clock").textContent =
        new Date()
            .toLocaleTimeString();

}


updateClock();


setInterval(
    updateClock,
    1000
);


/* =========================================================
   SESSION TIMER
========================================================= */

setInterval(
    () => {

        sessionSeconds++;


        const hours =
            Math.floor(
                sessionSeconds / 3600
            );


        const minutes =
            Math.floor(
                (sessionSeconds % 3600) / 60
            );


        const seconds =
            sessionSeconds % 60;


        sessionTime.textContent =
            `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


        sessionBar.style.width =
            `${Math.min(
                100,
                15 +
                sessionSeconds / 10
            )}%`;

    },
    1000
);


/* =========================================================
   CORE TELEMETRY
========================================================= */

setInterval(
    () => {

        const value =
            Math.floor(
                70 +
                Math.random() * 28
            );


        corePercent.textContent =
            `${value}%`;


        coreBar.style.width =
            `${value}%`;

    },
    1200
);


/* =========================================================
   LOGGING
========================================================= */

function addLog(
    type,
    message
) {

    if (!activityLog) return;


    const item =
        document.createElement(
            "div"
        );


    let className =
        "system";


    if (
        type === "USER"
    ) {

        className =
            "user";

    }


    if (
        type === "JARVIS"
    ) {

        className =
            "jarvis";

    }


    item.className =
        `log ${className}`;


    const time =
        new Date()
            .toLocaleTimeString(
                [],
                {
                    hour:
                        "2-digit",

                    minute:
                        "2-digit",

                    second:
                        "2-digit"
                }
            );


    const timeElement =
        document.createElement(
            "time"
        );


    timeElement.textContent =
        time;


    const messageElement =
        document.createElement(
            "span"
        );


    messageElement.textContent =
        message;


    item.appendChild(
        timeElement
    );


    item.appendChild(
        messageElement
    );


    activityLog.prepend(
        item
    );

}


/* =========================================================
   INITIALIZATION
========================================================= */

addLog(
    "SYSTEM",
    "JARVIS CORE INITIALIZED"
);

addLog(
    "SYSTEM",
    "VOICE AUTO-EXECUTION ENABLED"
);

addLog(
    "SYSTEM",
    "AUTOMATIC WEB NAVIGATION READY"
);

addLog(
    "SYSTEM",
    'WAKE PHRASE: "JARVIS"'
);

addLog(
    "SYSTEM",
    "SYSTEM READY"
);


/* =========================================================
   LOAD AVAILABLE VOICES
========================================================= */

if (
    "speechSynthesis" in window
) {

    speechSynthesis.onvoiceschanged =
        () => {

            speechSynthesis
                .getVoices();

        };

}
