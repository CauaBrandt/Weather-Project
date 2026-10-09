const celsiusButton = document.getElementById("degree-change");
const temperature = document.getElementsByClassName("temperature");
const degree = document.getElementsByClassName("degree");

let isCelsius = true

celsiusButton.addEventListener("click", () => {
    isCelsius = !isCelsius;

    const symbol = isCelsius ? "°C": "°F";
    for (let i = 0; i < temperature.length; i++) {
        temperature[i].textContent = `${invertDegree(Number(temperature[i].textContent), !isCelsius)}`;
    }
    for (let i = 0; i < degree.length; i++) {
        degree[i].textContent = symbol;
    }
    
    const chart = Chart.getChart("chart");
    const chartLabel = chart.data.datasets[0].label;
    const data = JSON.parse(document.getElementById("chart-data").textContent);
    const dataTemperature = data.temperature;

    if ( chartLabel.includes("Temperature", "Apparent Temperature") ) {
        chart.data.datasets[0].data = isCelsius ?
            dataTemperature:
            dataTemperature.map(f => invertDegree(f, true));
        chart.data.datasets[0].label = chartLabel.includes("Apparent") ? `Apparent Temperature (${symbol})`: `Temperature (${symbol})`;
        chart.update();
    }
});

function invertDegree(temperature, isCelsius) {
    if (isCelsius) {
        return Math.round(temperature * 9 / 5 + 32);
    }
    return Math.round((temperature - 32) * 5 / 9);
}
