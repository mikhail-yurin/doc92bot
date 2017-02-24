var TelegramBot = require('node-telegram-bot-api');
var fs = require('fs');
var os = require('os');
var path = require('path');
var Checker = require('./Checker');
var cfg = require('./ConfigReader');


cfg.getProps()
    .then(function (props) {
        var inbox = os.tmpdir() + path.sep + 'doc92' + path.sep + 'inbox';
        var feedbacks = os.tmpdir() + path.sep + 'doc92' + path.sep + 'feedbacks';
        fs.mkdir(inbox, function () { });
        fs.mkdir(feedbacks, function () { });

        var bot = new TelegramBot(props.token.toString(), { polling: true });
        var checker = new Checker();
        var feedmsg = false;
        var commands = [
            '/start',
            '/help',
            '/stop',
            '/feedback',
            '/about'
        ];

        bot.onText(/\/start/g, function (msg) {
            bot.sendMessage(msg.chat.id, 'Здравствуйте!\nЯ создан, чтобы следить за наличием талонов на прием к врачу на сервисе https://doctor-92.ru\nЧтобы посмотреть инструкцию, пришлите "/help"');
        });

        bot.onText(/\/help/g, function (msg) {
            bot.sendMessage(msg.chat.id, '1. В своем браузере откройте ссылку с выбором специалиста и времени посещения.\n2. Скопируйте адрес ссылки и пришлите её мне.\n\nЯ буду периодически проверять наличие талонов на прием (на два месяца вперед) и в случае появления, сообщу вам об их наличии.\n\n(в данный момент бот может проверять только одно расписание для каждого пользователя. Если расписание для вас уже проверяется, а вы пришлете ссылку на новое расписание, старое расписание более не будет проверяться на наличие талонов)\n\nЧтобы отменить проверку расписания, пришлите мне "/stop"');
        });

        bot.onText(/\/about/g, function (msg) {
            bot.sendMessage(msg.chat.id, 'Бот не сохраняет никаких ваших личных данных.\nИсходный код доступен на https://github.com/mikhail-yurin/doc92bot.\nПредложение по улучшению работы бота вы можете оставить тут https://github.com/mikhail-yurin/doc92bot/issues/new\nили используйте команду /feedback');
        });

        bot.onText(/\/feedback/g, (msg) => {
            feedmsg = true;
            bot.sendMessage(msg.chat.id, 'Теперь пришлите отзыв/предложение:');
        });

        bot.onText(/\/stop/g, function (msg) {
            fs.unlink(os.tmpdir() + path.sep + 'doc92' + path.sep + `${msg.from.id}`, function (err) {
                if (err) {
                    bot.sendMessage(msg.chat.id, 'Вероятно, вы уже отменили проверку расписания ранее');
                } else {
                    bot.sendMessage(msg.chat.id, 'Расписание для вас больше не проверяется');
                }
            });
        });

        bot.on('message', function (msg) {
            if (commands.indexOf(msg.text) == -1 && !feedmsg) {
                if (/https\:\/\/doctor\-92\.ru\/record\/\?/g.test(msg.text)) {
                    fs.writeFile(inbox + path.sep + `${msg.from.id}`, msg.text, (err) => {
                        if (err) {
                            bot.sendMessage(msg.chat.id, "Упс... Возникла ошибка(");
                            console.log(err);
                        } else {
                            bot.sendMessage(msg.chat.id, "Принято! Буду держать вас в курсе наличия талонов!");
                        }
                    });
                } else {
                    bot.sendMessage(msg.chat.id, "Пришлите пожалуйста ссылку на страницу с расписанием и я буду периодически проверять его!\nКак только появятся талоны на прием, я вам сообщу");
                }
            } else if (feedmsg) {
                fs.writeFile(feedbacks + path.sep + 'feedback_' + new Date().getTime() + '.txt', msg.text, (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
                bot.sendMessage(msg.chat.id, 'Спасибо!');
                feedmsg = false;
            }
        });

        setInterval(function () {
            checker.run()
                .then(function (data) {
                    bot.sendMessage(data.file, "Талоны доступны! Попробуйте получить талон по ссылке: " + data.link);
                    fs.unlink(os.tmpdir() + path.sep + 'doc92' + path.sep + data.file);
                })
                .catch(function () {
                    console.log('no!');
                });
        }, 5 * 60 * 1000);
    })
    .catch(function (err) {
        console.log(err);
    });