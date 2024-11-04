from flask import Flask, render_template, request, jsonify
from openai import OpenAI

app = Flask(__name__)

# Ініціалізація клієнта OpenAI для офіційного API
openai_client = OpenAI(api_key="your-openai-api-key")  # Замініть на ваш ключ API
# Ініціалізація клієнта для LM Studio
lmstudio_client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

# Окремі історії для кожного провайдера
conversation_histories = {
    'openai': [],
    'lmstudio': []
}

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
                model="gpt-3.5-turbo",  # або інша модель OpenAI
                messages=history,
                temperature=0.7
            )
        else:  # lmstudio
            completion = lmstudio_client.chat.completions.create(
                model="hugging-quants/Llama-3.2-1B-Instruct-Q8_0-GGUF",
                messages=history,
                temperature=0.7
            )

        # Отримуємо відповідь моделі
        model_response = completion.choices[0].message.content

        # Обрізаємо історію, якщо вона перевищує ліміт токенів
        max_tokens = 4096
        trim_history(history, max_tokens, completion.usage.prompt_tokens)

        # Додаємо відповідь моделі до історії
        history.append({"role": "assistant", "content": model_response})

        return jsonify({"response": model_response})

    except Exception as e:
        print(f"Error with {provider}: {str(e)}")
        return jsonify({"response": f"Вибачте, сталася помилка при обробці запиту. Спробуйте ще раз пізніше."}), 500


if __name__ == '__main__':
    app.run(debug=True)