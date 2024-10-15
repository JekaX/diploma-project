# Імпортуємо необхідні модулі з Flask
from flask import Flask, render_template, request, jsonify

# Створюємо екземпляр Flask додатку
app = Flask(__name__)


# Визначаємо маршрут для головної сторінки
@app.route("/")
def index():
    # Повертаємо рендер HTML шаблону
    return render_template('chat.html')


# Визначаємо маршрут для обробки повідомлень чату
@app.route("/get", methods=["POST"])
def chat():
    # Отримуємо повідомлення від користувача
    user_message = request.form['msg']
    # Тут ви можете додати логіку для обробки повідомлення користувача
    # Наприклад, використання моделі машинного навчання для генерації відповіді

    # Поки що повертаємо просту відповідь
    return jsonify({"response": "Я бот. Ви сказали: " + user_message})


# Запускаємо додаток, якщо цей скрипт виконується напряму
if __name__ == '__main__':
    app.run(debug=True)
