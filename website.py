from flask import Flask, render_template, redirect, url_for

app = Flask("__name__")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/map")
def map():
    return "<h1>MAP<h1>"

if __name__ == "__main__":
    app.run()