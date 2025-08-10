from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash, check_password_hash
from chatbot.gpt_api import ask_doctor_bot
import os
from dotenv import load_dotenv
from flask_login import login_required
from models import db

load_dotenv()

app = Flask(__name__)
app.secret_key = "super_secure_secret_123" 
API_KEY = os.getenv("GPT_API_KEY")

db_config = {
    'host': os.environ.get('DB_HOST'),
    'port': int(os.environ.get('DB_PORT')),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'database': os.environ.get('DB_NAME'),
    'ssl_disabled': True
}

@app.route("/")
def home():
    return redirect(url_for("guest"))  # or render_template("guest.html")

# ---- Routes ----

@app.route("/guest")
def guest():
    return render_template("guest.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        print(f"Login attempt: {email}, {password}")  # Debug

        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()

            if user:
                print("User found:", user)  # Debug
                if check_password_hash(user["password"], password):
                    session["user_id"] = user["id"]
                    session["username"] = user["name"]
                    print("✅ Login successful. Redirecting to dashboard.")
                    return redirect(url_for("dashboard"))
                else:
                    flash("❌ Incorrect password", "danger")
            else:
                flash("❌ Email not found", "danger")

        except Error as e:
            print("❌ DB Error:", e)
            flash("❌ Database error", "danger")

        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()
                
    return render_template("login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form.get("name")
        email = request.form.get("email")
        age = request.form.get("age")
        gender = request.form.get("gender")
        password = generate_password_hash(request.form.get("password"))
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (name, email, password, age, gender) VALUES (%s, %s, %s, %s, %s)",
                           (name, email, password, age, gender))
            conn.commit()
            flash("✅ Registered successfully. Please log in.", "success")
            return redirect(url_for("login"))
        except mysql.connector.IntegrityError:
            flash("❌ Email already exists", "danger")
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()
    return render_template("register.html")

@app.route("/dashboard", methods=["GET", "POST"])
def dashboard():
    if not session.get("user_id"):
        flash("⚠️ Please login to access the dashboard.", "warning")
        return redirect(url_for("login"))
    
    bot_response = ""
    if request.method == "POST":
        user_input = request.form.get("symptoms", "")
        if user_input:
            bot_response = ask_doctor_bot(user_input)
    
    return render_template("dashboard.html", username=session.get("username"), response=bot_response)

@app.route("/logout")
def logout():
    session.clear()
    flash("✅ Logged out successfully.", "info")
    return redirect(url_for("login"))

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message")
    print("📩 Message received on /chat:", user_message)

    if not user_message:
        return jsonify({"reply": "Please enter your symptoms."})

    reply = ask_doctor_bot(user_message)

    user_id = session.get("user_id")
    if user_id:
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()

            # 1. Store chat in chat_history
            cursor.execute(
                "INSERT INTO chat_history (user_id, message, response) VALUES (%s, %s, %s)",
                (user_id, user_message, reply)
            )

            # 2. Store symptom report (you can define better condition if needed)
            if any(symptom in user_message.lower() for symptom in ["fever", "cough", "headache", "pain", "nausea"]):
                cursor.execute(
                    "INSERT INTO symptom_reports (user_id, symptoms, bot_response) VALUES (%s, %s, %s)",
                    (user_id, user_message, reply)
                )

            conn.commit()
            print("✅ Chat and symptom (if any) saved.")

        except mysql.connector.Error as e:
            print("❌ DB Error:", e)
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    return jsonify({"reply": reply})




if __name__ == "__main__":
    app.run(debug=True)
