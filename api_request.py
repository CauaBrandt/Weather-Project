import psycopg
from psycopg.types.json import Jsonb
import os
from datetime import datetime as dt
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

DATABASE_URL = os.environ.get("DATABASE_URL")

def make_request(lat, lon, timezone):
	"Make the api request to Open Meteo, using a latitude and longitude"
	params = {
		"latitude": lat,
		"longitude": lon,
		"daily": ["weather_code", "temperature_2m_max", "temperature_2m_min"],
		"hourly": ["weather_code", "temperature_2m", "visibility", "precipitation", "wind_speed_10m", "wind_direction_10m", "uv_index", "apparent_temperature", "relative_humidity_2m"],
		"timezone": timezone,
		"forecast_days": 7
	}
	
	responses = openmeteo.weather_api(url, params = params)

	# Process first location. Add a for-loop for multiple locations or weather models
	response = responses[0]

	# Process hourly data. The order of variables needs to be the same as requested.
	hourly = response.Hourly()
	hourly_weather_code = hourly.Variables(0).ValuesAsNumpy()
	hourly_temperature_2m = hourly.Variables(1).ValuesAsNumpy()
	hourly_visibility = hourly.Variables(2).ValuesAsNumpy()
	hourly_precipitation = hourly.Variables(3).ValuesAsNumpy()
	hourly_wind_speed_10m = hourly.Variables(4).ValuesAsNumpy()
	hourly_wind_direction_10m = hourly.Variables(5).ValuesAsNumpy()
	hourly_uv_index = hourly.Variables(6).ValuesAsNumpy()
	hourly_apparent_temperature = hourly.Variables(7).ValuesAsNumpy()
	hourly_relative_humidity_2m = hourly.Variables(8).ValuesAsNumpy()

	hourly_data = {
		"date": pd.date_range(
			start = pd.to_datetime(hourly.Time(), unit = "s", utc = True),
			end =  pd.to_datetime(hourly.TimeEnd(), unit = "s", utc = True),
			freq = pd.Timedelta(seconds = hourly.Interval()),
			inclusive = "left"
		)
	}

	hourly_data["weather_code"] = hourly_weather_code
	hourly_data["temperature_2m"] = hourly_temperature_2m
	hourly_data["visibility"] = hourly_visibility
	hourly_data["precipitation"] = hourly_precipitation
	hourly_data["wind_speed_10m"] = hourly_wind_speed_10m
	hourly_data["wind_direction_10m"] = hourly_wind_direction_10m
	hourly_data["uv_index"] = hourly_uv_index
	hourly_data["apparent_temperature"] = hourly_apparent_temperature
	hourly_data["relative_humidity_2m"] = hourly_relative_humidity_2m

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
			if key == "precipitation":
				result.append(round(value, 2))
				continue
			result.append(round(value))

		hourly_data[key] = result

	conn = psycopg.connect(DATABASE_URL)
	cur = conn.cursor()

	cur.execute(
		"""INSERT INTO api_cache(cache_key, daily_data, hourly_data, expires_at) 
			VALUES(%s, %s, %s, NOW() + INTERVAL '3 hours')
		""", (
			f"weather:lat={lat},lon={lon}",
			Jsonb({**daily_data, "date": None}),
			Jsonb({**hourly_data, "date": None}),
		)
	)
	conn.commit()

	return hourly_data, daily_data
