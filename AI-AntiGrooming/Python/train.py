import pandas as pd
import re
import json
import numpy as np
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, GlobalAveragePooling1D, Dense
from sklearn.model_selection import train_test_split

# --- 1. Konfigurasi Awal ---
VOCAB_SIZE = 5000  # Ukuran "kamus" kita, 5000 kata paling top
MAX_LEN = 50       # Panjang maks kalimat (dipotong/ditambah padding)
EMBEDDING_DIM = 16 # Dimensi vektor untuk setiap kata

print("Memulai script training...")

# --- 2. Load & Bersihkan Data ---
try:
    df = pd.read_csv('dataset.csv')
except FileNotFoundError:
    print("Error: file 'dataset.csv' tidak ditemukan.")
    exit()

def clean_text(text):
    text = str(text).lower()  # Ke huruf kecil
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text) # Hapus simbol selain huruf & angka
    return text

df['text'] = df['text'].apply(clean_text)

# Pisahkan data teks dan label
texts = df['text'].values
labels = df['label'].values.astype(np.float32) # Pastikan label adalah angka

print(f"Dataset berhasil di-load: {len(texts)} baris data.")

# --- 3. Tokenization (Ubah Teks jadi Angka) ---
# Ini adalah "kamus" yang memetakan kata ke angka
tokenizer = Tokenizer(num_words=VOCAB_SIZE, oov_token="<OOV>")
tokenizer.fit_on_texts(texts)

# Ubah teks menjadi urutan angka
sequences = tokenizer.texts_to_sequences(texts)

# Samakan panjang semua urutan angka (Padding)
padded_sequences = pad_sequences(sequences, maxlen=MAX_LEN, truncating='post', padding='post')

# --- 4. Split Data Training & Validasi ---
# Kita pisah data, 80% untuk latihan, 20% untuk tes
X_train, X_val, y_train, y_val = train_test_split(padded_sequences, labels, test_size=0.2, random_state=42)

print(f"Data di-split: {len(X_train)} training, {len(X_val)} validasi.")

# --- 5. Bangun Arsitektur Model AI ---
# Ini adalah arsitektur sederhana namun efektif untuk klasifikasi teks
model = Sequential([
    # 1. Embedding: Ubah angka jadi vektor (mempelajari konteks)
    Embedding(VOCAB_SIZE, EMBEDDING_DIM, input_length=MAX_LEN),
    
    # 2. Pooling: Rata-ratakan vektor kalimat (cari "inti" kalimat)
    GlobalAveragePooling1D(),
    
    # 3. Hidden Layer: Otak untuk "berpikir"
    Dense(16, activation='relu'),
    
    # 4. Output Layer: 1 neuron (0 = Aman, 1 = Bahaya)
    # Pakai 'sigmoid' karena ini klasifikasi biner
    Dense(1, activation='sigmoid')
])

# Compile model, tentukan cara belajarnya
model.compile(
    loss='binary_crossentropy', # Loss function untuk biner
    optimizer='adam',           # Optimizer standar
    metrics=['accuracy']        # Metrik yang ingin kita lihat
)

model.summary() # Tampilkan arsitektur model di terminal

# --- 6. Latih Model ---
print("\nMemulai proses training...")
NUM_EPOCHS = 30 # Berapa kali model "belajar" (bisa dinaikkan jika data banyak)

history = model.fit(
    X_train, y_train,
    epochs=NUM_EPOCHS,
    validation_data=(X_val, y_val),
    verbose=2
)

print("\nTraining selesai.")

# --- 7. Simpan "Artefak" (Model & Tokenizer) ---
# Ini adalah bagian paling penting untuk API kita

# 1. Simpan model yang sudah dilatih
model.save('model.keras')

# 2. Simpan "kamus" Tokenizer
tokenizer_json = tokenizer.to_json()
with open('tokenizer.json', 'w', encoding='utf-8') as f:
    # Kita pakai json.loads dan json.dumps agar formatnya rapi (pretty print)
    f.write(json.dumps(json.loads(tokenizer_json), ensure_ascii=False, indent=4))

print("\n--- Hasil Disimpan! ---")
print("Model AI disimpan di: model.keras")
print("Kamus (Tokenizer) disimpan di: tokenizer.json")