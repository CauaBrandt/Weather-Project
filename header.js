const celsiusButton = document.getElementById("degree-change");
const celsiusText = document.getElementsByClassName("degree");

let isCelsius = true

celsiusButton.addEventListener("click", () => {
    isCelsius = !isCelsius;

    const symbol = isCelsius ? "°C": "°F";
    for (let i = 0; i < celsiusText.length; i++) {
        celsiusText[i].textContent = symbol;
    }
});

