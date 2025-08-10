# chatbot/gpt_api.py
import requests
import os

def ask_doctor_bot(user_message):
    url = "https://openrouter.ai/api/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        # ✅ Your OpenRouter API key is added below
        "Authorization": f"Bearer {os.getenv('GPT_API_KEY')}"

    }

    data = {
        "model": "openai/gpt-3.5-turbo",  # You can change to gpt-4 if your plan supports it
        "messages": [
            {"role": "system", "content": "You are a helpful medical assistant. Give suggestions based on symptoms."},
            {"role": "user", "content": user_message}
        ],
        "max_tokens": 300,
        "temperature": 0.7
    }

    response = requests.post(url, headers=headers, json=data)

    if response.status_code == 200:
        return response.json()["choices"][0]["message"]["content"]
    else:
        return f"Error {response.status_code}:\n{response.text}"
