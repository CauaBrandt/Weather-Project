from flask import Flask, render_template, redirect, url_for
from insert_to_database import make_request

app = Flask("__name__")

hourly_data, daily_data = make_request(-22.9354, -42.8246, "America/Sao_Paulo")

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run()