# Import to use queries
import psycopg
# Import to use timer
import time
from datetime import datetime as dt
import pytz
import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry

# Setup the Open-Meteo API client with cache and retry on error
cache_session = requests_cache.CachedSession('.cache', expire_after = 3600)
retry_session = retry(cache_session, retries = 5, backoff_factor = 0.2)
openmeteo = openmeteo_requests.Client(session = retry_session)

# The order of variables in hourly or daily is important to assign them correctly below
url = "https://api.open-meteo.com/v1/forecast"

def make_request(lat, lon, timezone):
	"Make the api request to Open Meteo, using a latitude and longitude"
	params = {
		"latitude": lat,
		"longitude": lon,
		"daily": ["weather_code", "temperature_2m_max", "temperature_2m_min"],
		"hourly": ["temperature_2m", "precipitation", "wind_speed_10m", "wind_direction_10m", "uv_index", "apparent_temperature"],
		"timezone": timezone,
		"forecast_days": 7
	}
	
	responses = openmeteo.weather_api(url, params = params)

	# Process first location. Add a for-loop for multiple locations or weather models
	response = responses[0]

	# Process hourly data. The order of variables needs to be the same as requested.
	hourly = response.Hourly()
	hourly_temperature_2m = hourly.Variables(0).ValuesAsNumpy()
	hourly_precipitation = hourly.Variables(1).ValuesAsNumpy()
	hourly_wind_speed_10m = hourly.Variables(2).ValuesAsNumpy()
	hourly_wind_direction_10m = hourly.Variables(3).ValuesAsNumpy()
	hourly_uv_index = hourly.Variables(4).ValuesAsNumpy()
	hourly_apparent_temperature = hourly.Variables(5).ValuesAsNumpy()

	hourly_data = {
		"date": pd.date_range(
			start = pd.to_datetime(hourly.Time(), unit = "s", utc = True),
			end =  pd.to_datetime(hourly.TimeEnd(), unit = "s", utc = True),
			freq = pd.Timedelta(seconds = hourly.Interval()),
			inclusive = "left"
		)
	}

	hourly_data["temperature_2m"] = hourly_temperature_2m
	hourly_data["precipitation"] = hourly_precipitation
	hourly_data["wind_speed_10m"] = hourly_wind_speed_10m
	hourly_data["wind_direction_10m"] = hourly_wind_direction_10m
	hourly_data["uv_index"] = hourly_uv_index
	hourly_data["apparent_temperature"] = hourly_apparent_temperature

	# Process daily data. The order of variables needs to be the same as requested.
	daily = response.Daily()
	daily_weather_code = daily.Variables(0).ValuesAsNumpy()
	daily_temperature_2m_max = daily.Variables(1).ValuesAsNumpy()
	daily_temperature_2m_min = daily.Variables(2).ValuesAsNumpy()

	daily_data = {
		"date": pd.date_range(
			start = pd.to_datetime(daily.Time(), unit = "s", utc = True),
			end =  pd.to_datetime(daily.TimeEnd(), unit = "s", utc = True),
			freq = pd.Timedelta(seconds = daily.Interval()),
			inclusive = "left"
		)
	}

	daily_data["weather_code"] = daily_weather_code
	daily_data["temperature_2m_max"] = daily_temperature_2m_max
	daily_data["temperature_2m_min"] = daily_temperature_2m_min

	# Format Data
	for key, values in daily_data.items():
			result = []
	
			for value in values.tolist():
				if key == "date":
					result.append(dt.date(value))
					continue

				result.append(round(value))
	
			daily_data[key] = result
	
	for key, values in hourly_data.items():
		if key == "date":
			continue
		result = []

		for value in values.tolist():
			if key == "temperature_2m" or key == "apparent_temperature":
				result.append(round(value))
			else:
				result.append(round(value, 2))

		hourly_data[key] = result

	return hourly_data, daily_data

if __name__ == "__main__":
	# Get cities locations
	conn = psycopg.connect(
		dbname="weather",
		user="postgres",
		host="localhost",
		port="5432"
	)
	cur = conn.cursor()

	# Get cities lat and lon
	while True:
		# Remove older data from database
		now = dt.date(dt.now())
		cur.execute("SELECT daily_id FROM daily WHERE %s - date[1] > 7", (now,))

		for daily_id in cur.fetchall():
			cur.execute("DELETE FROM hourly WHERE daily_id = %s", (daily_id[0],))
		cur.execute("DELETE FROM daily WHERE %s - date[1] > 7", (now,))
		conn.commit()

		cur.execute("SELECT name, latitude, longitude, city_id, timezone FROM cities ORDER BY name")
		for name, lat, lon, city_id, timezone in cur.fetchall():			
			# Insert data to the database
			date = dt.date(dt.now(pytz.timezone(timezone)))
			hourly_data, daily_data = make_request(lat, lon, timezone)

			# Insert to daily
			cur.execute(f"SELECT * FROM daily WHERE city_id = %s AND date[1] = %s", (city_id, date))
			if not cur.fetchone():
				cur.execute("INSERT INTO daily(date, weather_code, temperature_2m_max, temperature_2m_min, city_id) VALUES(%s, %s, %s, %s, %s)", (
					daily_data["date"],
					daily_data["weather_code"],
					daily_data["temperature_2m_max"],
					daily_data["temperature_2m_min"],
					city_id
				))
				conn.commit()
				print(f"Inserted daily for: {name}")

			# Insert to hourly
			cur.execute(f"SELECT daily_id FROM daily WHERE city_id = %s AND date[1] = %s", (city_id, date))
			daily_id = cur.fetchone()[0]

			cur.execute(f"SELECT * FROM hourly WHERE daily_id = %s", (daily_id,))
			if not cur.fetchone():
				cur.execute("INSERT INTO hourly(daily_id, temperature_2m, apparent_temperature, precipitation, wind_speed_10m, wind_direction_10m, uv_index) VALUES(%s, %s, %s, %s, %s, %s, %s)", (
					daily_id,
					hourly_data["temperature_2m"],
					hourly_data["apparent_temperature"],
					hourly_data["precipitation"],
					hourly_data["wind_speed_10m"],
					hourly_data["wind_direction_10m"],
					hourly_data["uv_index"]
				))

				conn.commit()
				print(f"Inserted hourly for: {name}\nCity ID:{city_id}")

			time.sleep(10)
