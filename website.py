import psycopg
import pytz
from flask import Flask, render_template, redirect, url_for, jsonify
from datetime import datetime as dt, date
from insert_to_database import make_request

class City():
    def __init__(self, name, latitude, longitude, state, timezone):
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        self.state = state
        self.timezone = timezone

app = Flask("__name__")

@app.route("/")
def home():
    return render_template(
        "index.html",
        city=city.name,
        state=city.state,
        current_icon=current_icon,
        current_weather=current_weather,
        current_temperature=current_temperature,
        current_apparent_temperature=current_apparent_temperature,
        humidity=humidity,
        precipitation_chance=preciptation,
        visibility=visibility,
        wind_speed=wind_speed,
        wind_direction=wind_direction(wind_dir),
        data=chart(hourly_data),
        forecast=list(zip(
            daily_data["temperature_2m_max"],
            daily_data["temperature_2m_min"],
            names,
            icons
        ))
    )

def icons_for(code):
    if code == 0:
        return ("Sun.svg", "Sunny")
    if code in (1, 2):
        return ("PartlyCloudy.svg", "Partly Cloudy")
    if code == 3:
        return ("Cloud.svg", "Cloudy")
    if code in (45, 48):
        return ("Fog.svg", "Foggy")
    if code in range(51, 68) or code in range(80, 83):
        return ("RainCloud.svg", "Rain")
    if code in range(71, 78) or code in (85, 86):
        return ("Snow.svg", "Snowing")
    if code in (95, 96, 99):
        return ("ThunderCloud.svg", "Thunderstorm")
    return ("Cloud.svg", "Cloudy")

def wind_direction(deg):
    direction = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
    return direction[round(deg / 45 % 8)]

def chart(data):
    labels = []
    i = 3
    for _ in range(7 * 24):
        labels.append(i)
        i += 1
        if i > 23:
            i = 0

    chart = {
        "labels": labels,
        "temperature": data["temperature_2m"],
        "apparent_temperature": data["apparent_temperature"],
        "humidity": data["relative_humidity_2m"],
        "visibility": [n / 1000 for n in data["visibility"]],
        "wind_speed": data["wind_speed_10m"]
    }
    return chart

if __name__ == "__main__":
    conn = psycopg.connect(
        dbname="weather",
        user="postgres",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()
    
    cur.execute("SELECT cities.name, latitude, longitude, states.name, timezone FROM cities INNER JOIN states USING(state_id) WHERE cities.name = 'Marica'")
    city_info = cur.fetchone()

    city = City(city_info[0], city_info[1], city_info[2], city_info[3], city_info[4])
    
    hourly_data, daily_data = make_request(city.latitude, city.longitude, city.timezone)

    now = dt.now(pytz.timezone(city.timezone))

    if now.hour > 3:
        current_temperature = hourly_data["temperature_2m"][now.hour - 3]
        current_apparent_temperature = hourly_data["apparent_temperature"][now.hour - 3]
        visibility = hourly_data["visibility"][now.hour - 3] / 1000
        preciptation = hourly_data["precipitation"][now.hour - 3]
        wind_speed = hourly_data["wind_speed_10m"][now.hour - 3]
        wind_dir = hourly_data["wind_direction_10m"][now.hour - 3]
        humidity = hourly_data["relative_humidity_2m"][now.hour - 3]
    else:
        current_temperature = hourly_data["temperature_2m"][24 + now.hour - 3]
        current_apparent_temperature = hourly_data["apparent_temperature"][24 + now.hour - 3]
        visibility = hourly_data["visibility"][24 + now.hour - 3] / 1000
        preciptation = hourly_data["precipitation"][24 + now.hour - 3]
        wind_speed = hourly_data["wind_speed_10m"][24 + now.hour - 3]
        wind_dir = hourly_data["wind_direction_10m"][24 + now.hour - 3]
        humidity = hourly_data["relative_humidity_2m"][24 + now.hour - 3]

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    names = [days[(date.today().weekday() + i) % 7] for i in range(0, 7)]

    icons = [icons_for(code)[0] for code in daily_data["weather_code"]]
    current_icon = icons[0]
    current_weather = icons_for(daily_data["weather_code"][0])[1]
    
    app.run(debug=True)