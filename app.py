import os

from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import google.generativeai as genai
import anthropic
import requests
import json
from groq import Groq
import urllib.parse

app = Flask(__name__)

# Словник, що містить провайдерів та їх моделі
models_dict = {
    'OpenAI API': ['gpt-3.5-turbo', 'gpt-4o', 'o1-mini'],
    'Google API': ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'],
    'Anthropic API': ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    'Groq API': ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'llama-3.2-90b-text-preview'],
    'VectorShift API': ['customized_gpt-4o'],
    'LM Studio': ['hugging-quants/Llama-3.2-1B-Instruct-Q8_0-GGUF'],
    'Ollama': ['llama3.1']
}

# Вибір першої моделі для кожного провайдера
models = {provider: next(iter(models)) for provider, models in models_dict.items()}

# Історія бесід для кожної моделі кожного провайдера
conversation_histories = {provider: {model: [] for model in models} for provider, models in models_dict.items()}

MAX_TOKENS = 4000  # Максимальна кількість токенів для історії

# Ініціалізація клієнтів для різних API
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Клієнт OpenAI
lmstudio_client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")  # Клієнт LM Studio
anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))  # Клієнт Anthropic
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))  # Клієнт Groq

# Конфігурація Google Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))  # Налаштування Google API ключа
google_model = genai.GenerativeModel(models['Google API'])  # Вибір моделі для Google

# Конфігурація VectorShift
VECTORSHIFT_API_KEY = os.getenv("VECTORSHIFT_API_KEY")  # Отримання ключа VectorShift з оточення
VECTORSHIFT_URL = "https://api.vectorshift.ai/api/pipelines/run"  # URL VectorShift API

# Конфігурація Ollama
OLLAMA_URL = "http://localhost:11434/api/generate"  # URL Ollama API


def trim_history(history, max_tokens, prompt_tokens):
    """Обрізає історію, якщо вона перевищує ліміт токенів."""
    while prompt_tokens > max_tokens and history:
        history.pop(0)  # Видаляємо найстаріше повідомлення


@app.route("/")
def index():
    """Головна сторінка зі списком моделей."""
    return render_template('chat.html', models=models_dict)


@app.route("/get/<path:path>", methods=["POST"])
def chat(path):
    """Обробка POST запитів для чату."""
    parts = path.split('/', 1)  # Розбиваємо path на провайдера та модель
    if len(parts) != 2:
        return jsonify({"response": "Invalid path format"}), 400  # Повертаємо помилку, якщо формат невірний

    provider = urllib.parse.unquote(parts[0])  # Декодуємо провайдера
    model = urllib.parse.unquote(parts[1])  # Декодуємо модель

    user_message = request.form['msg']  # Отримуємо повідомлення користувача
    history = conversation_histories[provider][model]  # Отримуємо історію для даного провайдера та моделі

    # Додаємо повідомлення користувача до історії
    history.append({"role": "user", "content": user_message})

    try:
        if provider == 'OpenAI API':
            # Відправляємо запит до OpenAI API
            completion = openai_client.chat.completions.create(
                model=model,
                messages=history,
                temperature=0.7
            )
            model_response = completion.choices[0].message.content  # Отримуємо відповідь
            prompt_tokens = completion.usage.prompt_tokens  # Кількість токенів у prompt

        elif provider == 'Google API':
            # Підготовка повідомлення для Google Gemini
            google_message = "\n".join([msg["content"] for msg in history])
            response = google_model.generate_content(google_message)  # Відправляємо запит
            model_response = response.text  # Отримуємо текст відповіді
            prompt_tokens = len(google_message.split())  # Оцінюємо кількість токенів

        elif provider == 'Anthropic API':
            # Підготовка повідомлення для Anthropic API
            anthropic_messages = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in history
            ]
            # Відправляємо запит до Anthropic API
            response = anthropic_client.messages.create(
                model=model,
                max_tokens=1000,
                temperature=0.7,
                messages=anthropic_messages
            )
            model_response = response.content[0].text  # Отримуємо текст відповіді
            prompt_tokens = len(str(anthropic_messages).split())  # Оцінюємо кількість токенів

        elif provider == 'LM Studio':
            # Відправляємо запит до LM Studio API
            completion = lmstudio_client.chat.completions.create(
                model=model,
                messages=history,
                temperature=0.7
            )
            model_response = completion.choices[0].message.content  # Отримуємо відповідь
            prompt_tokens = completion.usage.prompt_tokens  # Кількість токенів у prompt

        elif provider == 'VectorShift API':
            # Підготовка повідомлення для VectorShift API
            vectorshift_message = "\n".join([msg["content"] for msg in history])
            data = {
                "inputs": json.dumps({
                    "Question": vectorshift_message
                }),
                "pipeline_name": model,
                "username": "test_demo",
            }
            headers = {
                "Api-Key": VECTORSHIFT_API_KEY,
            }
            # Відправляємо запит до VectorShift API
            response = requests.post(VECTORSHIFT_URL, headers=headers, data=data)
            response_json = response.json()
            model_response = response_json.get("Answer",
                                               "Вибачте, сталася помилка при обробці запиту. Спробуйте ще раз пізніше.")
            prompt_tokens = len(vectorshift_message.split())  # Оцінюємо кількість токенів

        elif provider == 'Ollama':
            # Підготовка повідомлення для Ollama API
            ollama_message = "\n".join([msg["content"] for msg in history])
            data = {
                "model": model,
                "prompt": ollama_message
            }
            # Відправляємо запит до Ollama API
            response = requests.post(OLLAMA_URL, json=data, stream=True)
            # Об'єднуємо всі частини відповіді
            full_response = "".join(
                json.loads(line.decode("utf-8")).get("response", "")
                for line in response.iter_lines()
                if line
            )
            model_response = full_response  # Отримуємо текст відповіді
            prompt_tokens = len(ollama_message.split())  # Оцінюємо кількість токенів

        elif provider == 'Groq API':
            # Підготовка повідомлення для Groq API
            groq_messages = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in history
            ]
            # Відправляємо запит до Groq API
            chat_completion = groq_client.chat.completions.create(
                messages=groq_messages,
                model=model,
            )
            model_response = chat_completion.choices[0].message.content  # Отримуємо текст відповіді
            prompt_tokens = len(str(groq_messages).split())  # Оцінюємо кількість токенів

        # Обрізаємо історію, якщо вона перевищує ліміт токенів
        trim_history(history, MAX_TOKENS, prompt_tokens)

        # Додаємо відповідь моделі до історії
        history.append({"role": "assistant", "content": model_response})

        return jsonify({"response": model_response})  # Повертаємо відповідь користувачеві

    except Exception as e:
        print(f"Error with {provider}: {str(e)}")  # Виводимо помилку в консоль
        return jsonify({
            "response": f"Вибачте, сталася помилка при обробці запиту. Спробуйте ще раз пізніше."
        }), 500  # Повертаємо помилку користувачеві


if __name__ == '__main__':
    app.run(debug=False)
