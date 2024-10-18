from flask import Flask, render_template, request, jsonify
from openai import OpenAI

app = Flask(__name__)

# Ініціалізація клієнта OpenAI
client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")

# Глобальна змінна для зберігання історії розмови
conversation_history = []


def trim_history(history, max_tokens, prompt_tokens):
    """Обрізає історію, якщо вона перевищує ліміт токенів."""
    while prompt_tokens > max_tokens and history:
        history.pop(0)


@app.route("/")
def index():
    return render_template('chat.html')


@app.route("/get", methods=["POST"])
def chat():
    user_message = request.form['msg']

    # Додаємо повідомлення користувача до історії
    conversation_history.append({"role": "user", "content": user_message})

    # Створюємо запит до моделі
    completion = client.chat.completions.create(
        model="hugging-quants/Llama-3.2-1B-Instruct-Q8_0-GGUF",
        messages=conversation_history,
        temperature=0.7,  # Збалансована креативність
    )

    # Обрізаємо історію, якщо вона перевищує ліміт токенів
    max_tokens = 4096
    trim_history(conversation_history, max_tokens, completion.usage.prompt_tokens)

    # Отримуємо відповідь моделі
    model_response = completion.choices[0].message.content

    # Додаємо відповідь моделі до історії
    conversation_history.append({"role": "assistant", "content": model_response})

    return jsonify({"response": model_response})


if __name__ == '__main__':
    app.run(debug=True)
