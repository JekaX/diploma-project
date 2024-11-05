from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import google.generativeai as genai
import anthropic

app = Flask(__name__)

# Окремі історії для кожного провайдера
conversation_histories = {
    'openai': [],
    'google': [],
    'anthropic': [],
    'lmstudio': []
}

models = {
    'openai': 'gpt-3.5-turbo',
    'google': 'gemini-1.5-flash',
    'anthropic': 'claude-3-5-sonnet-20241022',
    'lmstudio': 'hugging-quants/Llama-3.2-1B-Instruct-Q8_0-GGUF'
}

MAX_TOKENS = 4000

# Ініціалізація клієнтів
openai_client = OpenAI(api_key="your-openai-api-key")
lmstudio_client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")
anthropic_client = anthropic.Anthropic(api_key="your-anthropic-api-key")

# Конфігурація Google Gemini
genai.configure(api_key="your-google-api-key")
google_model = genai.GenerativeModel(models['google'])


def trim_history(history, max_tokens, prompt_tokens):
    """Обрізає історію, якщо вона перевищує ліміт токенів."""
    while prompt_tokens > max_tokens and history:
        history.pop(0)


@app.route("/")
def index():
    return render_template('chat.html')


@app.route("/get/<provider>", methods=["POST"])
def chat(provider):
    user_message = request.form['msg']
    history = conversation_histories[provider]

    # Додаємо повідомлення користувача до історії
    history.append({"role": "user", "content": user_message})

    try:
        if provider == 'openai':
            completion = openai_client.chat.completions.create(
                model=models['openai'],
                messages=history,
                temperature=0.7
            )
            model_response = completion.choices[0].message.content
            prompt_tokens = completion.usage.prompt_tokens

        elif provider == 'google':
            # Конвертуємо історію в формат, зрозумілий для Google (Gemini)
            google_message = "\n".join([msg["content"] for msg in history])
            response = google_model.generate_content(google_message)
            model_response = response.text
            prompt_tokens = len(google_message.split())  # Приблизна оцінка токенів

        elif provider == 'anthropic':
            # Конвертуємо історію в формат повідомлень Anthropic
            anthropic_messages = [
                {"role": msg["role"], "content": msg["content"]}
                for msg in history
            ]

            response = anthropic_client.messages.create(
                model=models['anthropic'],
                max_tokens=1000,
                temperature=0.7,
                messages=anthropic_messages
            )
            model_response = response.content[0].text
            prompt_tokens = len(str(anthropic_messages).split())  # Приблизна оцінка токенів

        elif provider == 'lmstudio':
            completion = lmstudio_client.chat.completions.create(
                model=models['lmstudio'],
                messages=history,
                temperature=0.7
            )
            model_response = completion.choices[0].message.content
            prompt_tokens = completion.usage.prompt_tokens

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
