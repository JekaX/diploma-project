// Функція для додавання повідомлення до чату
function addMessage(message, isUser = false) {
    const messageContainer = $('<div>').addClass('d-flex mb-4 ' + (isUser ? 'justify-content-end' : 'justify-content-start'));
    const messageContent = $('<div>').addClass(isUser ? 'msg_container_send' : 'msg_container').text(message);
    const timeSpan = $('<span>').addClass(isUser ? 'msg_time_send' : 'msg_time').text(new Date().toLocaleTimeString());

    messageContent.append(timeSpan);
    messageContainer.append(messageContent);
    $('#messageFormeight').append(messageContainer);

    // Плавно прокручуємо до нового повідомлення
    $('#messageFormeight').animate({
        scrollTop: $('#messageFormeight')[0].scrollHeight
    }, 500); // 500 мс для плавності анімації
}


// Обробник події для кнопки відправки
$('#send-btn').click(sendMessage);

// Обробник події для поля вводу (відправка по Enter)
$('#message').keypress(function(e) {
    if(e.which == 13) {
        sendMessage();
        return false;
    }
});

// Функція для відправки повідомлення
function sendMessage() {
    const message = $('#message').val().trim();

    if(message) {
        // Додаємо повідомлення користувача до чату
        addMessage(message, true);

        // Відправляємо запит на сервер
        $.ajax({
            url: '/get',
            type: 'POST',
            data: {msg: message},
            success: function(response) {
                // Додаємо відповідь бота до чату
                addMessage(response.response);
            },
            error: function() {
                addMessage("Вибачте, сталася помилка. Спробуйте ще раз пізніше.", false);
            }
        });

        // Очищаємо поле вводу
        $('#message').val('');
    }
}

// Додаємо початкове повідомлення від бота
$(document).ready(function() {
    addMessage("Привіт! Я ChatBot. Чим я можу вам допомогти?");
});