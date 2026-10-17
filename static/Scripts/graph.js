const temperatureButton = document.getElementById("temperature");
const apparentTemperatureButton = document.getElementById("apparent-temperature-button");
const HumdityButton = document.getElementById("humidity");
const visibilityButton = document.getElementById("visibility");
const windSpeedButton = document.getElementById("wind-speed");
const scroller = document.getElementById("chart-scroller");
const chartInner = document.getElementById("chart-inner");
const chart = document.getElementById("chart");
const data = JSON.parse(document.getElementById("chart-data").textContent);

chartInner.style.width = Math.max(data.labels.length * 40, 800) + "px";

const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
        x: { ticks: { autoSkip: false } },
        y: {
            beginAtZero: true,
        }
    }
};
const temperatureOptions = JSON.parse(JSON.stringify(options));
temperatureOptions.scales.y.suggestedMax = isCelsius ? 40: 120;

drawChart(data["temperature"], "Temperature (°C)", "red", temperatureOptions)
temperatureButton.addEventListener("click", () => {
    const info = isCelsius ? data["temperature"]: data["temperature"].map(f => invertDegree(f, true));
    temperatureOptions.scales.y.suggestedMax = isCelsius ? 40: 120;
    drawChart(info, "Temperature (°C)", "red", temperatureOptions);
});
apparentTemperatureButton.addEventListener("click", () => {
    const info = isCelsius ? data["apparent_temperature"]: data["apparent_temperature"].map(f => invertDegree(f, true));
    temperatureOptions.scales.y.suggestedMax = isCelsius ? 40: 120;
    drawChart(info, "Apparent Temperature (°C)", "pink", temperatureOptions);
});
HumdityButton.addEventListener("click", () => {
    drawChart(data["humidity"], "Humidity (%)", "darkblue", options);
});
visibilityButton.addEventListener("click", () => {
    drawChart(data["visibility"], "Visibility (Km)", "yellow", options);
});
windSpeedButton.addEventListener("click", () => {
    drawChart(data["wind_speed"], "Wind Speed (Km)", "gray", options);
});

scroller.addEventListener("wheel", (e) => {
    if (scroller.width <= scroller.clientWidth) return;

    e.preventDefault();
    scroller.scrollLeft += e.deltaY;
}, { passive: false });

function drawChart(info, label, color, options) {
    const currentChart = Chart.getChart("chart");
    if (currentChart) {
        if (currentChart.data.datasets[0].label === label) return;
        currentChart.destroy();
    }

    new Chart(chart, {
    type: "line",
    data: {
        labels: data.labels,
        datasets: [{
            label: label,
            data: info,
            borderColor: color,
            tension: 0.5
        }]
    },
    options: options
    });
}