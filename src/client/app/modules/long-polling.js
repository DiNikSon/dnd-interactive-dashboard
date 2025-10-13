export async function subscribe(url, responseHandler, errorHandler){
    let response = await fetch(url)

    if (response.status === 502) {
        // Статус 502 - это таймаут соединения;
        // возможен, когда соединение ожидало слишком долго
        // и сервер (или промежуточный прокси) закрыл его
        // давайте восстановим связь
        await subscribe(url, responseHandler, errorHandler);
    } else if (response.status !== 200) {
        // Какая-то ошибка, покажем её
        errorHandler(await response.json());
        // Подключимся снова через секунду.
        await new Promise(resolve => setTimeout(resolve, 1000));
        await subscribe(url, responseHandler, errorHandler);
    } else {
        // Получим и покажем сообщение
        responseHandler(await response.json());
        // И снова вызовем subscribe() для получения следующего сообщения
        await subscribe(url, responseHandler, errorHandler);
    }
}