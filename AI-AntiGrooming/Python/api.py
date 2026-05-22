"""
api.py — AntiGrooming AI Detection API (Flask)

Pipeline:
  Input Text
    → text_normalizer.preprocess() [deobfuscate → slang → clean]
    → Keras Model Inference [skor dasar]
    → grooming_scorer.compute_final_score() [fusi skor + pattern analysis]
    → Response JSON
"""

from flask import Flask, request, jsonify
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import tokenizer_from_json

from text_normalizer import preprocess
from grooming_scorer import compute_final_score

app = Flask(__name__)
MAX_LEN = 50

# Load Artefak AI
try:
    model = load_model('model.keras')
    with open('tokenizer.json') as f:
        tokenizer = tokenizer_from_json(f.read())
    print("✅ Model AI Siap dan Berjalan di Memori.")
except Exception as e:
    print(f"❌ Error muat model: {e}")
    exit()


def send_grooming_alert(child_id, teks_berbahaya):
    """
    Kirim notifikasi POST ke API Laravel backend utama.
    """
    url = "https://antigrooming.test/api/alert-grooming"
    payload = {
        'child_id': child_id,
        'evidence': teks_berbahaya
    }
    try:
        # Panggil dengan timeout 5 detik dari Python ke Laravel
        # verify=False digunakan agar tidak error pada sertifikat SSL lokal self-signed FlyEnv
        response = requests.post(url, json=payload, timeout=5, verify=False)
        if response.status_code == 200:
            print(f"✅ Alert Laravel berhasil dikirim untuk anak ID {child_id}: {response.json()}")
        else:
            print(f"⚠️ Alert Laravel mengembalikan status {response.status_code}: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Gagal mengirim alert ke Laravel: {e}")


@app.route('/analyze', methods=['POST'])
def analyze_text():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': 'Teks tidak ditemukan'}), 400

    raw_text = data['text']

    # === PIPELINE ===
    # Step 1: Preprocessing (deobfuscate + slang + clean)
    preprocessed = preprocess(raw_text)

    # Step 2: Model Keras inference (skor dasar)
    seq = tokenizer.texts_to_sequences([preprocessed])
    padded = pad_sequences(seq, maxlen=MAX_LEN, truncating='post', padding='post')
    model_score = float(model.predict(padded, verbose=0)[0][0])

    # Step 3: Fusi skor (model + pattern analysis)
    result = compute_final_score(model_score, preprocessed)

    # Logging
    status_label = 'BAHAYA' if result.detected else 'AMAN'
    print(f"[{status_label}] Final: {result.final_score:.4f} "
          f"(Model: {result.raw_model_score:.4f}, Pattern: {result.pattern_score:.4f}) "
          f"| Pola: {result.detected_patterns} "
          f"| Teks: {raw_text[:50]}...")

    # Pemicu notifikasi WhatsApp Darurat jika terdeteksi grooming kritis
    if result.detected:
        child_id = data.get('child_id', 1)  # Default ke 1 jika tidak disediakan
        send_grooming_alert(child_id, raw_text)

    return jsonify({
        'status': 'success',
        'score': result.final_score,
        'detected': result.detected,
        'risk_level': result.risk_level,
        'details': {
            'raw_model_score': result.raw_model_score,
            'pattern_score': result.pattern_score,
            'detected_patterns': result.detected_patterns,
            'preprocessed_text': preprocessed,
        }
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)