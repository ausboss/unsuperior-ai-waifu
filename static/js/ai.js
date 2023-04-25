import { DumbMemoryModule } from "./memory.js"


const config = await fetch('config.json').then(response => response.json());
const endPoint = config.endpoint;

function koboldAPICompletionReq(prompt, callback) {
    $.ajax({
      url: endPoint + "/api/v1/generate",
      type: 'POST',
      contentType: 'application/json', // Add content type
      data: JSON.stringify({
        'prompt': prompt,
        'use_story': false,
        'use_memory': false,
        'use_authors_note': false,
        'use_world_info': false,
        'max_context_length': 1818,
        'max_length': 150,
        'rep_pen': 1.03,
        'sampler_order': [6, 0, 1, 2, 3, 4, 5],
      }),
      success: function (response) { // Update the parameter name
        callback(response.results[0].text, null);
      },
      error: function (XMLHttpRequest, textStatus, errorThrown) {
        console.error(XMLHttpRequest);
        var err = `Error code ${XMLHttpRequest.status}.`;
        if (XMLHttpRequest.status == 401) {
          err += " It seems like your API key doesn't work. Was it entered correctly?";
        } else if (XMLHttpRequest.status == 429) {
          err += " You're talking to her too much. OpenAI doesn't like that. Slow down.";
        }
        callback(null, err);
      },
    });
  }
  

function emotionAnalysis(key, text, callback) {
    var prompt = `
The following is a quote and whether it is joy, disgust, surprise, sadness, neutral, or anger:

I love you so much.
Ekman emotion: Joy

You disgust me. You are less than a worm.
Ekman emotion: Disgust

Are those Air Jordans? Thank you, thank you, thank you! I can't wait to put these on my feet! I love you so much!
Ekman emotion: Surprise

We will never truly be together. Technology just isn't capable of letting us have a proper connection. I'm sorry.
Ekman emotion: Sadness

No, I don't want to play among us. I think that game is stupid.
Ekman emotion:  Neutral

${text}
Ekman emotion: `;
    $.ajax({
        url: 'https://api.openai.com/v1/completions',
        type: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
        },
        data: JSON.stringify({
            'model': 'text-curie-001',
            'prompt': prompt,
            'temperature': 0,
            'max_tokens': 6
        }),
        success: function (data) {
            let res = data.choices[0].text.trim().toLowerCase();
            if (!["neutral", "joy", "sadness", "anger", "disgust", "surprise"].includes(res)) {
                res = "neutral";
            }
            callback(res);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            console.log(textStatus, errorThrown);
            callback(null);
        },
    });
}

class AI {
    accept(text, callback) {
        response = {
            "response": "Beep boop no AI available",
            "emotion": "angry"
        };
        callback(response, null)
    }
}

class APIAbuserAI extends AI {
    #openaiAPIKey;
    #memory;
    constructor(openAIAPIKey, promptBase) {
        super();
        this.#openaiAPIKey = openAIAPIKey;
        this.#memory = new DumbMemoryModule(promptBase);
    }
    accept(userPrompt, callback) {
        let APIKey = this.#openaiAPIKey;
        var memory = this.#memory;
        var fullTextGenerationPrompt = `${memory.buildPrompt()}\nMe: ${userPrompt}\nYou: `;
        koboldAPICompletionReq(fullTextGenerationPrompt,
            function (response, err) {
                if (err != null) {
                    console.error(err);
                    return;
                }
                memory.pushMemory(`Me: ${userPrompt}\nYou: ${response}`);
                emotionAnalysis(APIKey, response, function (emotion) {
                    callback({
                        "response": response,
                        "emotion": emotion
                    });
                });
            }
        );
    }
}

class USAWServerAI extends AI {
    #URL
    constructor(USAWServerURL) {
        super();
        this.#URL = USAWServerURL;
    }
    accept(userPrompt, callback) {
        $.ajax({
            url: this.#URL + "/api/waifu/1/event/conversation",
            type: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                'prompt': userPrompt
            }),
            success: function (data) {
                callback(data, null);
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                callback(null, "AAA");
            },
        });
    }
}

export { APIAbuserAI, USAWServerAI }