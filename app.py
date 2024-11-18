from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import google.generativeai as genai
import anthropic
import requests
import json
from groq import Groq
import urllib.parse

app = Flask(__name__)

conversation_histories = {
    'OpenAI API': {
        'gpt-3.5-turbo': [],
        'gpt-4o': [],
        'o1-mini': []
    },
    'Google API': {
        'gemini-1.5-flash': [],
        'gemini-1.5-flash-8b': [],
        'gemini-1.5-pro': []
    },
    'Anthropic API': {
        'claude-3-5-sonnet-20241022': [],
        'claude-3-5-haiku-20241022': [],
        'claude-3-opus-20240229': []
    },
    'Groq API': {
        'llama-3.1-8b-instant': [],
        'llama-3.1-70b-versatile': [],
        'llama-3.2-90b-text-preview': []
    },
    'VectorShift API': {
        'customized_gpt-4o': []
    },
    'LM Studio': {
        'hugging-quants/Llama-3.2-1B-Instruct-Q8_0-GGUF': []
    },
    'Ollama': {
        'llama3.1': []
    }
}

models = {
    'OpenAI API': 'gpt-3.5-turbo',
    'Google API': 'gemini-1.5-flash',
    'Anthropic API': 'claude-3-5-sonnet-20241022',
    'LM Studio': 'hugging-quants/Llama-3.2-1B-Instruct-Q8_0-GGUF',
    'VectorShift API': 'customized_gpt-4o',
    'ollama': 'llama3.1',
    'Groq API': 'llama-3.1-70b-versatile'
}

MAX_TOKENS = 4000

# Ініціалізація клієнтів
openai_client = OpenAI(api_key="your-openai-api-key")
lmstudio_client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")
anthropic_client = anthropic.Anthropic(api_key="your-anthropic-api-key")
groq_client = Groq(api_key="your-groq-api-key")

# Конфігурація Google Gemini
genai.configure(api_key="your-google-api-key")
google_model = genai.GenerativeModel(models['Google API'])

# Конфігурація VectorShift
VECTORSHIFT_API_KEY = "your_vectorshift_api_key"
VECTORSHIFT_URL = "https://api.vectorshift.ai/api/pipelines/run"

# Конфігурація Ollama
OLLAMA_URL = "http://localhost:11434/api/generate"


def trim_history(history, max_tokens, prompt_tokens):
    """Обрізає історію, якщо вона перевищує ліміт токенів."""
    while prompt_tokens > max_tokens and history:
        history.pop(0)


@app.route("/")
def index():
    return render_template('chat.html')


@app.route("/get/<path:path>", methods=["POST"])
def chat(path):
    parts = path.split('/', 1)
    if len(parts) != 2:
        return jsonify({"response": "Invalid path format"}), 400

    provider = urllib.parse.unquote(parts[0])
    model = urllib.parse.unquote(parts[1])

    user_message = request.form['msg']
    history = conversation_histories[provider][model]

    # Додаємо повідомлення користувача до історії
    history.append({"role": "user", "content": user_message})

    try:
        if provider == 'OpenAI API':
            completion = openai_client.chat.completions.create(
                model=model,
                messages=history,
                temperature=0.7
            )
            model_response = completion.choices[0].message.content
            prompt_tokens = completion.usage.prompt_tokens

        elif provider == 'Google API':
            # Конвертуємо історію в формат, зрозумілий для Google (Gemini)
            google_message = "\n".join([msg["content"] for msg in history])
            response = google_model.generate_content(google_message)
            model_response = response.text
            prompt_tokens = len(google_message.split())  # Приблизна оцінка токенів

        elif provider == 'Anthropic API':
            # Конвертуємо історію в формат повідомлень Anthropic
            anthropic_messages = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in history
            ]

            response = anthropic_client.messages.create(
                model=model,
                max_tokens=1000,
                temperature=0.7,
                messages=anthropic_messages
            )
            model_response = response.content[0].text
            prompt_tokens = len(str(anthropic_messages).split())  # Приблизна оцінка токенів

        elif provider == 'LM Studio':
            completion = lmstudio_client.chat.completions.create(
                model=model,
                messages=history,
                temperature=0.7
            )
            model_response = completion.choices[0].message.content
            prompt_tokens = completion.usage.prompt_tokens

        elif provider == 'VectorShift API':
            # Конвертуємо історію в формат, зрозумілий для VectorShift
            vectorshift_message = "\n".join([msg["content"] for msg in history])
            data = {
                "inputs": json.dumps({
                    "input": vectorshift_message
                }),
                "pipeline_name": model,
                "username": "test_demo",
            }
            headers = {
                "Api-Key": VECTORSHIFT_API_KEY,
            }
            response = requests.post(VECTORSHIFT_URL, headers=headers, data=data)
            response_json = response.json()
            model_response = response_json.get("output", "Вибачте, сталася помилка при обробці запиту. Спробуйте ще раз пізніше.")
            prompt_tokens = len(vectorshift_message.split())  # Приблизна оцінка токенів

        elif provider == 'Ollama':
            # Конвертуємо історію в формат, зрозумілий для Ollama
            ollama_message = "\n".join([msg["content"] for msg in history])
            data = {
                "model": model,
                "prompt": ollama_message
            }
            response = requests.post(OLLAMA_URL, json=data, stream=True)
            full_response = "".join(
                json.loads(line.decode("utf-8")).get("response", "")
                for line in response.iter_lines()
                if line
            )
            model_response = full_response
            prompt_tokens = len(ollama_message.split())  # Приблизна оцінка токенів

        elif provider == 'Groq API':
            # Конвертуємо історію в формат, зрозумілий для Groq
            groq_messages = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in history
            ]

            chat_completion = groq_client.chat.completions.create(
                messages=groq_messages,
                model=model,
            )
            model_response = chat_completion.choices[0].message.content
            prompt_tokens = len(str(groq_messages).split())  # Приблизна оцінка токенів

        # Обрізаємо історію, якщо вона перевищує ліміт токенів
        trim_history(history, MAX_TOKENS, prompt_tokens)

        # Додаємо відповідь моделі до історії
        history.append({"role": "assistant", "content": model_response})

        return jsonify({"response": model_response})

    except Exception as e:
        print(f"Error with {provider}: {str(e)}")
        return jsonify({
            "response": f"Вибачте, сталася помилка при обробці запиту. Спробуйте ще раз пізніше."
        }), 500


if __name__ == '__main__':
    app.run(debug=True)
