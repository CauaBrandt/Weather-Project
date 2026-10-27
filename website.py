import psycopg
from psycopg.types.json import Jsonb
from flask import Flask, render_template, jsonify, request
import logging
import os

app = Flask("__name__")

DATABASE_URL = os.environ.get("DATABASE_URL")

conn = psycopg.connect(
    dbname="weather",
    user="postgres",
    host="localhost",
    port="5432"
)
cur = conn.cursor()

cur.execute("DELETE FROM api_cache WHERE expires_at < NOW()")
conn.commit()

class NoStaticFilter(logging.Filter):
    def filter(self, record):
        return "static" not in record.getMessage()

logging.getLogger("werkzeug").addFilter(NoStaticFilter())

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/check_city")
def check_city():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    data = cur.execute("SELECT data FROM api_cache WHERE cache_key = %s AND expires_at > NOW()", [
            f"weather:lat={lat},lon={lon}"
    ]).fetchone()

    return jsonify(data)

@app.route("/search_city")
def search_city():
    max_search = 8
    result = []
    query = request.args.get("q", "")
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)

    if query:
        cur.execute("SELECT cities.name, states.name, country, latitude, longitude FROM cities INNER JOIN states USING(state_id) WHERE unaccent(cities.name) ILIKE unaccent(%s) LIMIT %s", (f"{query}%", max_search,))
        response = cur.fetchall()

        if len(response) < max_search:
            complement = max_search - len(response)
            cur.execute("SELECT cities.name, states.name, country, latitude, longitude FROM cities INNER JOIN states USING(state_id) WHERE unaccent(cities.name) ILIKE unaccent(%s) LIMIT %s", (f"%{query}%", complement,))
            for city in cur.fetchall():
                if not city in response:
                    response.append(city)
        
        if not response:
            return jsonify({ "error": "Couldn't find a city!"})
        
        for city in response:
            result.append({
                "name": city[0],
                "state": city[1],
                "country": city[2],
                "latitude": city[3],
                "longitude": city[4]
            })
    elif lat:
        cur.execute("SELECT cities.name, states.name, country, latitude, longitude FROM cities INNER JOIN states USING(state_id) WHERE latitude = %s AND longitude = %s", (lat, lon))
        response = cur.fetchone()
        if not response:
            # Get the closest city
            cur.execute(
                """SELECT cities.name, states.name, country, latitude, longitude,
                        6371 * 2 * ASIN(SQRT(
                            POWER(SIN(RADIANS(latitude - %s) / 2), 2) +
                            COS(RADIANS(%s)) * COS(RADIANS(latitude)) *
                            POWER(SIN(RADIANS(longitude - %s) / 2), 2)
                        )) AS distance_km
                    FROM cities INNER JOIN states
                    USING(state_id)
                    ORDER BY distance_km
                    LIMIT 1
                """, (lat, lat, lon)
            )

            response = cur.fetchone()

        result = [{
            "name": response[0],
            "state": response[1],
            "country": response[2],
            "latitude": response[3],
            "longitude": response[4]
        }]

    cur.execute("DELETE FROM api_cache WHERE expires_at < NOW()")
    conn.commit()
    
    return jsonify({"cities": result})

@app.route("/city", methods=["POST"])
def city():
    data = request.get_json()

    cur.execute(
        """INSERT INTO api_cache(cache_key, data, expires_at) 
            VALUES(%s, %s, NOW() + INTERVAL '3 hours')
        """, (
            f"weather:lat={data["latitude"]},lon={data["longitude"]}",
            Jsonb(data),
        )
    )
    conn.commit()

if __name__ == "__main__":
    app.run(debug=True)