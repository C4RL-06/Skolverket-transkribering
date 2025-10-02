async function sayHi() {
    const response = await pywebview.api.say_hi();
    document.getElementById('message').innerText = response;
}
