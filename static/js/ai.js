import { DumbMemoryModule } from "./memory.js"


const config = await fetch('config.json').then(response => response.json());
const endPoint = config.endpoint;
const ENDPOINT = config.endpoint;

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





class Chatbot {
    constructor(fn) {
      this.loadJSON(fn).then((data) => {
        this.data = data;
        this.char_name = this.data["char_name"];
        this.char_persona = this.data["char_persona"];
        this.char_greeting = this.data["char_greeting"];
        this.world_scenario = this.data["world_scenario"];
        this.example_dialogue = this.data["example_dialogue"];
  
        this.endpoint = ENDPOINT;
        this.conversation_history = `<START>\n${this.char_name}: ${this.char_greeting}\n`;
        this.character_info = `${this.char_name}'s Persona: ${this.char_persona}\nScenario: ${this.world_scenario}\n<START>${this.example_dialogue}<START>${this.char_greeting}\n`;
        this.num_lines_to_keep = 20;
      });
    }
  
    async loadJSON(fn) {
      const response = await fetch(fn);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    }
  
    async save_conversation_threaded(message, callback) {
      const response_text = await this.save_conversation(message);
      callback(response_text);
    }
  
    async save_conversation(message) {
      this.conversation_history += `You: ${message}\n`;
      const prompt = {
        prompt: this.character_info + '\n'.join(this.conversation_history.split('\n').slice(-this.num_lines_to_keep)) + `${this.char_name}:`,
      };
  
      // Make a request to the API and handle errors
      try {
          const response = await fetch(`${this.endpoint}/api/v1/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(prompt),
          });
      
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
      
          const data = await response.json();
          const results = data['results'];
          const response_list = results[0]['text'].slice(1).split("\n").map(line => line);
          const result = [response_list[0]].concat(response_list.slice(1).filter(item => item.includes(this.char_name)));
          const response_text = result.map(item => item.replace(`${this.char_name}: `, '')).join('');
          this.conversation_history += `${this.char_name}: ${response_text}\n`;
          return response_text;
        } catch (error) {
          console.error(`Error: ${error}`);
          return "";
        }
    }
  }
  
  export default Chatbot;



class APIAbuserAI extends AI {
  #openaiAPIKey;
  #memory;
  #chatbot;
  constructor(openAIAPIKey, promptBase) {
    super();
    this.#openaiAPIKey = openAIAPIKey;
    this.#memory = new DumbMemoryModule(promptBase);
    this.#chatbot = new Chatbot("char_data.json");
  }

  accept(userPrompt, callback) {
    let APIKey = this.#openaiAPIKey;
    var memory = this.#memory;
    var fullTextGenerationPrompt = `${memory.buildPrompt()}\nMe: ${userPrompt}\nYou: `;

    this.#chatbot.save_conversation_threaded(fullTextGenerationPrompt, (response) => {
      if (!response) {
        console.error("Error generating response");
        return;
      }

      memory.pushMemory(`Me: ${userPrompt}\nYou: ${response}`);
      emotionAnalysis(APIKey, response, function (emotion) {
        callback({
          response: response,
          emotion: emotion,
        });
      });
    });
  }
}



export { APIAbuserAI, Chatbot, DumbMemoryModule, emotionAnalysis, AI}