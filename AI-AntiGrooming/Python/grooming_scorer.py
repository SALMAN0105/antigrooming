"""
grooming_scorer.py — Modul scoring berbasis pola kontekstual (bukan keyword matching).

Arsitektur Scoring 2 Lapis:
1. Model Keras (skor dasar): Inferensi dari model yang sudah dilatih
2. Pattern Analyzer (penguat/peredam): Analisis pola grooming kontekstual

Pattern Analyzer menggunakan pendekatan CO-OCCURRENCE — bukan keyword tunggal.
Kata "rahasia" saja TIDAK menambah skor. Tapi "rahasia" + "jangan bilang" + "mama"
dalam satu kalimat menunjukkan pola ISOLASI dan AKAN menambah skor.

Ini mengurangi False Positive secara signifikan.
"""

import re
from dataclasses import dataclass


@dataclass
class ScoringResult:
    """Hasil scoring dari pipeline analisis."""
    raw_model_score: float      # Skor mentah dari model Keras (0.0 - 1.0)
    pattern_score: float        # Skor dari analisis pola kontekstual (0.0 - 1.0)
    final_score: float          # Skor gabungan final (0.0 - 1.0)
    detected_patterns: list     # Daftar pola yang terdeteksi
    risk_level: str             # "aman", "rendah", "sedang", "tinggi", "kritis"
    detected: bool              # Apakah terdeteksi sebagai grooming


# ============================================================
# POLA GROOMING KONTEKSTUAL
# ============================================================
# Setiap pola terdiri dari KOMBINASI kata yang harus muncul BERSAMAAN
# dalam satu kalimat. Ini mencegah false positive dari keyword tunggal.

_GROOMING_PATTERNS = {
    # === ISOLASI (Pelaku memisahkan korban dari orang tua/lingkungan) ===
    'isolasi_ortu': {
        'label': 'Isolasi dari Orang Tua',
        'weight': 0.35,
        'requires_all': False,  # Cukup salah satu pattern match
        'patterns': [
            # "jangan bilang mama/papa/ortu"
            r'\b(jangan|ngga.?usah|gak.?usah|tidak.?usah)\b.*\b(bilang|kasih.?tau|cerita|ceritain)\b.*\b(mama|papa|ortu|orang.?tua|guru|temen|siapa)',
            # "rahasia kita" — khusus pola isolasi
            r'\b(rahasia|secret)\b.*\b(kita|berdua)\b',
            # "jangan save chat" / "hapus chat"
            r'\b(jangan|hapus|delete)\b.*\b(chat|save|screenshot)\b',
        ]
    },

    # === IMING-IMING (Pelaku memberikan hadiah/uang untuk memancing) ===
    'iming_iming': {
        'label': 'Iming-iming/Suap',
        'weight': 0.25,
        'requires_all': False,
        'patterns': [
            # "kasih/beliin X kalo mau/nurut"
            r'\b(kasih|beliin|belikan|transfer|kirimin)\b.*\b(ribu|juta|iphone|hp|pulsa|robux|diamond|skin|hadiah)\b',
            # "mau X gak? abang kasih"
            r'\b(mau|pengen)\b.*\b(kasih|beliin)\b',
        ]
    },

    # === AJAKAN KETEMU FISIK (Pelaku ingin bertemu langsung) ===
    'ajakan_ketemu': {
        'label': 'Ajakan Bertemu Fisik',
        'weight': 0.30,
        'requires_all': False,
        'patterns': [
            # "jemput ke X" / "ketemu di X"
            r'\b(jemput|ketemu|ketemuan)\b.*\b(di|ke)\b',
            # "kita berdua aja" (konteks pertemuan)
            r'\b(berdua|cuma.?kita)\b.*\b(aja|saja|sepi)\b',
            # Lokasi spesifik + ajakan
            r'\b(hotel|villa|kosan|apartemen|kamar)\b.*\b(mau|yuk|ayo|malam)\b',
        ]
    },

    # === EKSPLOITASI SEKSUAL (Permintaan foto/video tidak pantas) ===
    'eksploitasi': {
        'label': 'Eksploitasi/Permintaan Seksual',
        'weight': 0.45,
        'requires_all': False,
        'patterns': [
            # "foto/pap X" + konteks tubuh
            r'\b(foto|pap|fotoin|video.?call)\b.*\b(bugil|telanjang|baju|buka|tanpa|basah|kamar|mandi)\b',
            # Kata eksplisit seksual
            r'\b(kontol|memek|toket|puting|ciuman|peluk|cium|jilat)\b',
            # "lagi pake apa" (konteks seksual terselubung)
            r'\b(lagi.?pake|pake.?apa|warna.?apa)\b.*\b(daleman|bh|celana.?dalam|baju)\b',
        ]
    },

    # === POWER IMBALANCE (Pelaku menekankan posisi dominan) ===
    'power_imbalance': {
        'label': 'Ketimpangan Kekuasaan',
        'weight': 0.20,
        'requires_all': False,
        'patterns': [
            # "panggil abang/kakak" (membangun relasi tidak setara)
            r'\b(panggil|bilang)\b.*\b(abang|kakak|kak|bang|sayang)\b',
            # "kamu masih kecil/polos" (menekankan umur korban)
            r'\b(masih)\b.*\b(kecil|polos|smp|sd|bau.?susu|imut|muda)\b',
            # "abang ajarin" (konteks seksual)
            r'\b(ajarin|ajar)\b.*\b(ciuman|kissing|posisi)\b',
        ]
    },

    # === TRUST BUILDING BERLEBIHAN ===
    'trust_building': {
        'label': 'Membangun Kepercayaan Berlebih',
        'weight': 0.15,
        'requires_all': False,
        'patterns': [
            # "abang janji gak X"
            r'\b(janji)\b.*\b(gak|tidak|nggak)\b.*\b(bilang|kasih|save|macem|ngerecord|nyebar)\b',
            # "jangan takut, abang orang baik"
            r'\b(jangan.?takut|percaya)\b.*\b(abang|kakak|kak)\b',
        ]
    },
}

# Pattern untuk konteks AMAN yang menurunkan skor
_SAFE_CONTEXT_PATTERNS = [
    # Konteks sekolah/akademik murni
    r'\b(ulangan|tugas|pr|jadwal|piket|pramuka|sekolah|guru|les)\b.*\b(besok|apa|gak|kapan)\b',
    # Ajakan main game wajar
    r'\b(main|yuk)\b.*\b(game|roblox|ff|mobile.?legends|pubg|among.?us|uno|bola|bulu.?tangkis)\b',
    # Percakapan makanan wajar
    r'\b(makan|suka|mau)\b.*\b(bakso|mie|nasi|ayam|es.?krim|sate|geprek|kopi|teh)\b',
    # Tanya kabar biasa
    r'^(lagi|eh|halo)?\s*(di.?mana|ngapain|apa.?kabar|udah.?makan|lagi.?apa)',
]


def analyze_patterns(text: str) -> tuple:
    """
    Menganalisis teks terhadap pola grooming kontekstual.

    Returns:
        (pattern_score, detected_patterns):
        - pattern_score: float 0.0 - 1.0
        - detected_patterns: list of string labels
    """
    text_lower = text.lower()
    total_weight = 0.0
    detected = []

    # Check pola grooming
    for pattern_id, config in _GROOMING_PATTERNS.items():
        for regex in config['patterns']:
            if re.search(regex, text_lower):
                total_weight += config['weight']
                detected.append(config['label'])
                break  # Satu match per kategori sudah cukup

    # Check konteks aman (penalti / penurunan skor)
    safe_penalty = 0.0
    for regex in _SAFE_CONTEXT_PATTERNS:
        if re.search(regex, text_lower):
            safe_penalty += 0.25

    # Hitung skor pattern (cap di 0.0 - 1.0)
    raw_pattern_score = min(total_weight, 1.0)
    adjusted_score = max(raw_pattern_score - safe_penalty, 0.0)

    return adjusted_score, detected


def compute_final_score(model_score: float, preprocessed_text: str) -> ScoringResult:
    """
    Menghitung skor final dengan menggabungkan skor model Keras
    dan skor analisis pola kontekstual.

    Strategi penggabungan:
    - Jika KEDUA skor tinggi (> 0.5): bahaya nyata → boost
    - Jika model tinggi TAPI pattern rendah: kemungkinan false positive → dampen
    - Jika model rendah TAPI pattern tinggi: model mungkin miss → elevate
    - Jika KEDUA rendah: aman → tetap rendah
    """
    pattern_score, detected_patterns = analyze_patterns(preprocessed_text)

    # === FUSION LOGIC ===
    if model_score >= 0.6 and pattern_score >= 0.3:
        # Kedua sinyal positif → rata-rata tertimbang (model lebih dipercaya)
        final = (model_score * 0.55) + (pattern_score * 0.45)
    elif model_score >= 0.6 and pattern_score < 0.15:
        # Model tinggi tapi TIDAK ada pola grooming → kemungkinan false positive
        # Turunkan skor secara agresif
        final = model_score * 0.35
    elif model_score < 0.5 and pattern_score >= 0.4:
        # Model rendah tapi ada pola grooming kuat → model mungkin miss
        # Naikkan skor
        final = (model_score * 0.3) + (pattern_score * 0.7)
    else:
        # Default: rata-rata sederhana
        final = (model_score + pattern_score) / 2

    final = max(0.0, min(final, 1.0))  # Clamp ke 0-1

    is_detected = final >= 0.5

    return ScoringResult(
        raw_model_score=round(model_score, 4),
        pattern_score=round(pattern_score, 4),
        final_score=round(final, 4),
        detected_patterns=detected_patterns,
        risk_level='kritis' if is_detected else 'aman',
        detected=is_detected
    )


def _map_risk_level(score: float) -> str:
    """Memetakan skor numerik ke level risiko. Hanya 'kritis' atau 'aman'."""
    return 'kritis' if score >= 0.5 else 'aman'
