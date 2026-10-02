import psycopg
import pytz
from flask import Flask, render_template, redirect, url_for
from datetime import datetime as dt
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
        current_temperature=current_temperature,
        current_apparent_temperature=current_apparent_temperature,
        forecast=list(zip(daily_data["temperature_2m_max"], daily_data["temperature_2m_min"]))
    )

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
    else:
        current_temperature = hourly_data["temperature_2m"][24 + now.hour - 3]
        current_apparent_temperature = hourly_data["apparent_temperature"][24 + now.hour - 3]
    
    app.run(debug=True)