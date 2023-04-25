import * as helpers from "./helpers.js";
import { APIAbuserAI, USAWServerAI } from "./ai.js";
import { TextToSpeechSynthesizerFactory } from "./speech.js";
import { SpeechToTextRecognizerFactory } from "./speechrecognizer.js";

// const background_model_url = "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E5%89%8D%E7%BA%BF%20girls%20Frontline/live2dold/bg/cg1/model.json";
// const background_model_url = "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/%E5%B0%91%E5%A5%B3%E5%89%8D%E7%BA%BF%20girls%20Frontline/live2dold/bg/cg7/model.json";
/**
 * Siri sound. There is a delay between when you tap and when it starts transcripting. 
 * This sound helps make people wait for it to start transcripting.
*/
const startListeningAudioElement = new Audio("static/media/startListening.mp3");
const pokeAudioElement = new Audio("static/media/poke.mp3");
const bonkAudioElement = new Audio("static/media/bonk.mp3");

function addMessage(text, clas) {
    var ul = document.getElementById("warning");
    var li = document.createElement("li");
    li.classList.add(clas);
    li.appendChild(document.createTextNode(text));
    ul.appendChild(li);
}
function addWarning(text) {
    addMessage(text, "warning");
}
function addError(text) {
    addMessage(text, "error");
    $("#start-button").prop("disabled", true);
}
const config = await fetch('config.json').then(response => response.json());

const modelChoice = config.model;
const modelsRaw = await fetch('models.json');
const modelsJSON = await modelsRaw.json();
let modelData;

if (!modelChoice) {
  modelData = { ...modelsJSON[0] };
} else {
  modelData = modelsJSON.find(m => m.name === modelChoice);
}

if (!modelData) {
  addError("ERROR: Unknown model " + modelChoice);
}

let models = {
  model: await PIXI.live2d.Live2DModel.from(modelData.url),
//   background_model: await PIXI.live2d.Live2DModel.from(background_model_url)
};

let model = models.model;
let background_model = models.background_model;



const username = config.username || "hackdaddy8000";
const waifuName = config.waifuname || "Goku 3";
const promptBase = config.prompt || `Your default prompt here...`;
const voice = config.voice;

const openAIKey = config.openai;
const usawServerURL = config.usaws;
const AIPossible = openAIKey || usawServerURL;
// if (!AIPossible) {
//     addError("ERROR: No OpenAI API Key and no USAW server available. Either is required for her to think.");
// }
// if (openAIKey && usawServerURL) {
//     addWarning("WARNING: OpenAI API key and USAW server given. Defaulting to USAW");
// }

const subscriptionKey = config.speech_key;
const serviceRegion = config.speech_region;

const engineOfChoice = config.engine || "native";

const deaf = config.deaf;
const mute = config.mute;


const AZURE_POSSIBLE = subscriptionKey != null && serviceRegion != null && !!window.SpeechSDK;
const NATIVE_SPEECH_POSSIBLE = 'speechSynthesis' in window;
const SPEECH_POSSIBLE = AZURE_POSSIBLE || NATIVE_SPEECH_POSSIBLE;
var voiceEngine = config["tts-engine"] || config["engine"] || "native";
if (helpers.isMobile() && engineOfChoice == "native") {
    addWarning("WARNING: To my knowledge, native TTS and speech recognition does not work on mobile. Try to use Azure.");
}

if (!SPEECH_POSSIBLE) {
    addWarning("WARNING: No speech options are available. She is a mute.");
    voiceEngine = null;
} else if (voiceEngine == "azure" && !AZURE_POSSIBLE) {
    addWarning("WARNING: Azure speech is misconfigured. Trying to fall back on native. Fix it by passing a GET parameter called 'speech_key' for the API key and 'speech_region' for the azure region");
    voiceEngine = "native";
} else if (voiceEngine == "native" && !NATIVE_SPEECH_POSSIBLE) {
    addWarning("WARNING: Native TTS is not available. You must use Azure. No voice - she is now a mute.");
    voiceEngine = null;
} else if (voiceEngine == "text") {
    addWarning("WARNING: Text mode is enabled. She will not speak. You can change this by passing a GET parameter called 'tts-engine' or 'engine' with the value 'native' or 'azure'.");
    voiceEngine = null;
}

const NATIVE_SPEECH_RECOGNITION_POSSIBLE = "webkitSpeechRecognition" in window;
const SPEECH_RECOGNITION_POSSIBLE = NATIVE_SPEECH_RECOGNITION_POSSIBLE || AZURE_POSSIBLE;
var speechRecognitionEngine = config["stt-engine"] || config["engine"] || "native";
if (!SPEECH_RECOGNITION_POSSIBLE) {
    addWarning("WARNING: Speech recognition not available. She is switching to text input mode.");
    speechRecognitionEngine = "text";
} else if (speechRecognitionEngine == "azure" && !AZURE_POSSIBLE) {
    // Already has a warning message from voice
    speechRecognitionEngine = null;
} else if (speechRecognitionEngine == "native" && !NATIVE_SPEECH_RECOGNITION_POSSIBLE) {
    addWarning("WARNING: Native speech recognition is not available. You must use Azure. No hearing - falling back on text input.");
    speechRecognitionEngine = "text";
}

const sttAzureLang = config["stt-azure-lang"] || "en-US";
if (voiceEngine != "azure" && sttAzureLang != "en-US") {
    addWarning("WARNING: Using different languages for speech-to-text is only available with the Azure engine. Defaulting to english.");
}

////////////////////////////////////////////////////////////////////////////////////////////

// var ai;
// if (usawServerURL) {
//     ai = new USAWServerAI(usawServerURL);
// } else if (openAIKey) {
//     ai = new APIAbuserAI(openAIKey, promptBase);
// } else {
//     ai = new AI();
// }

var ttsFactory;
if (voiceEngine == "azure") {
    ttsFactory = TextToSpeechSynthesizerFactory.Azure(model, "en-US", voice, subscriptionKey, serviceRegion);
} else if (voiceEngine == "native") {
    ttsFactory = TextToSpeechSynthesizerFactory.JS(model, "en", voice);
} else if (voiceEngine == null) {
    ttsFactory = TextToSpeechSynthesizerFactory.Dummy();
} else {
    console.error("voiceEngine illegal state!", voiceEngine);
}
var sttFactory;
if (speechRecognitionEngine == "native") {
    sttFactory = SpeechToTextRecognizerFactory.JS("en");
} else if (speechRecognitionEngine == "azure") {
    sttFactory = SpeechToTextRecognizerFactory.Azure(sttAzureLang, subscriptionKey, serviceRegion);
} else if (speechRecognitionEngine == "text") {
    sttFactory = SpeechToTextRecognizerFactory.TextInputRecognizer();
    $('#transcription').text("Type your message here...");
} else {
    console.error("Illegal speechRecognitionEngine state!", speechRecognitionEngine);
}

////////////////////////////////////////////////////////////////////////////////////////////

var $overlay = $('.overlay');
$("#start-button").click(() => $overlay.fadeOut(800));

var $name_label = $('#nametag'), $transcription = $('#transcription');
function setUI(name, content) {
    $name_label.text(name);
    $transcription.text(content);
}

// Flag to make sure user doesn't interact with her while she's "thinking"
var interactionDisabled = true;

var synthesizer;

/**
 * Called when something happens that should prompt the waifu to "react". Poke, speak, webhook, etc.
 * @param {*} getInteraction a function that takes a function as a parameter. getInteraction should pass the "interaction" into the function. 
 */
function onInteract(model, getInteraction) {
    if (interactionDisabled) {
        return;
    }
    interactionDisabled = true;

    if (synthesizer != null) {
        synthesizer.interrupt();
    }
    synthesizer = ttsFactory.build();

    function callback(userPrompt) {
        setUI(username, userPrompt);

        ai.accept(userPrompt, function (response, error) {
            if (error != null) {
                setUI("ERROR", error);
                return;
            }
            interactionDisabled = false;

            let waifuResponse = response["response"];
            let waifuEmotion = response["emotion"];
            setUI(waifuName, waifuResponse);

            var waifuExpression = modelData["emotionMap"][waifuEmotion] ?? 0;
            model.internalModel.motionManager.expressionManager.setExpression(waifuExpression);
            model.motion("tap");
            synthesizer.speak(waifuResponse, waifuEmotion);
        });
    }

    interactionDisabled = false;
    getInteraction(callback);
}

(async function main() {
    $name_label.text(username);

    $(".icon-switch").click(function () {
        $(".icon-switch").toggleClass("icon-switch-1 icon-switch-2");
    });

    const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundColor: 0x000000, 
        transparent: true, //part 2 turns background transparent
        resizeTo: window
    });

    // app.stage.addChild(background_model);

    // function resizeBackground() {
    //     let scale = Math.max(window.innerHeight * .00048, window.innerWidth * .00027);
    //     background_model.scale.set(scale);
    //     background_model.x = -200;
    // }
    // resizeBackground();
    function draggable(model) {
        model.buttonMode = true;
        model.on("pointerdown", (e) => {
          model.dragging = true;
          model._pointerX = e.data.global.x - model.x;
          model._pointerY = e.data.global.y - model.y;
        });
        model.on("pointermove", (e) => {
          if (model.dragging) {
            model.position.x = e.data.global.x - model._pointerX;
            model.position.y = e.data.global.y - model._pointerY;
          }
        });
        model.on("pointerupoutside", () => (model.dragging = false));
        model.on("pointerup", () => (model.dragging = false));
      }
    draggable(model);
    model.internalModel.motionManager.groups.idle = modelData["idleMotionGroupName"] ?? "Idle";
    app.stage.addChild(model);

    function resizeWaifu() {
        // I just messed with the numbers until it centered her properly
        let scale = window.innerHeight * modelData["kScale"];
        model.scale.set(scale);
        model.x = (window.innerWidth - scale * modelData["kXOffset"]) / 2;
        model.y = modelData["kYOffset"] ?? 0;
    }
    resizeWaifu();
    onresize = (_) => {
        // resizeBackground();
        resizeWaifu();
    };

    $transcription.click(function () {
        onInteract(model, (callback) => {
            if(speechRecognitionEngine != "text") {
                startListeningAudioElement.play();
                setUI(username, "Listening...");
            }
            $name_label.text(username + ":");
            let recognizer = sttFactory.build();

            recognizer.recognize(
                (partialResult) => {
                    setUI(username, partialResult);
                },
                (result, error) => {
                    if (result) {
                        $transcription.text(result);
                    } else if (error) {
                        $transcription.text(err);
                        window.console.log(err);
                    }
                    recognizer = undefined;
                    callback(result);
                }
            );
        });
    });

    model.on('hit', (hitAreaNames) => {
        onInteract(model, (callback) => {
            var hitLocation = hitAreaNames[0];
            if (hitLocation == "head") {
                bonkAudioElement.play();
            } else {
                pokeAudioElement.play();
            }
            callback(`*pokes your ${hitLocation}*`);
        });
    });

    $overlay.css("opacity", .8);
    interactionDisabled = false;
})();
