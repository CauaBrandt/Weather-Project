const city = document.getElementById("city");
const dateElement = document.getElementById("date");

const date = new Date();
const day = date.getDate();
const month = date.getMonth() + 1;
const year = date.getFullYear();

dateElement.textContent = `${day}.${month}.${year}`;
