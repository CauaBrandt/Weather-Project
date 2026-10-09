const celsiusButton = document.getElementById("degree-change");
const temperature = document.getElementsByClassName("temperature");
const degree = document.getElementsByClassName("degree");

let isCelsius = true

celsiusButton.addEventListener("click", () => {
    isCelsius = !isCelsius;

    const symbol = isCelsius ? "°C": "°F";
    for (let i = 0; i < temperature.length; i++) {
        temperature[i].textContent = `${invertDegree(Number(temperature[i].textContent), !isCelsius)}`;
        degree[i].textContent = symbol;
    }
    
    const chart = Chart.getChart("chart");
    const chartLabel = chart.data.datasets[0].label;
    const data = JSON.parse(document.getElementById("chart-data").textContent);

    if ( chartLabel.includes("Temperature", "Apparent Temperature") ) {
        if (chartLabel.includes("Apparent")) {    
            chart.data.datasets[0].data = isCelsius ?
                data.apparent_temperature:
                data.apparent_temperature.map(f => invertDegree(f, true));
            chart.data.datasets[0].label =`Apparent Temperature (${symbol})`;
        }
        else {
            chart.data.datasets[0].data = isCelsius ?
                data.temperature:
                data.temperature.map(f => invertDegree(f, true));
            chart.data.datasets[0].label = `Temperature (${symbol})`;
        }
        chart.update();
    }
});

function invertDegree(temperature, isCelsius) {
    if (isCelsius) {
        return Math.round(temperature * 9 / 5 + 32);
    }
    return Math.round((temperature - 32) * 5 / 9);
}
