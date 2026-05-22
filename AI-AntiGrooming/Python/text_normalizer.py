"""
text_normalizer.py — Modul preprocessing teks sebelum masuk ke model AI.

3 Lapisan Preprocessing:
1. Anti-Evasi (deobfuscation): Membersihkan manipulasi teks seperti "r4h4s1a" → "rahasia"
2. Slang Kendari (normalisasi): Menerjemahkan slang daerah ke bahasa Indonesia baku
3. Pembersihan Umum: Lowercase, hapus simbol, normalisasi spasi

Setiap lapisan adalah pure function — dapat diuji secara terpisah.
"""

import re
import os
import json

# ============================================================
# LAPISAN 1: ANTI-EVASI (Deobfuscation)
# ============================================================

# Peta karakter yang sering dipakai pelaku untuk mengelabui filter
_LEET_MAP = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '6': 'g', '7': 't', '8': 'b', '9': 'g', '@': 'a',
    '$': 's', '!': 'i', '+': 't',
}

# Regex untuk mendeteksi karakter yang disisipkan di antara huruf (misal: "r a h a s i a")
_SPACED_WORD_PATTERN = re.compile(r'(?<!\w)(\w(?:\s\w){2,})(?!\w)')


def deobfuscate(text: str) -> str:
    """
    Membersihkan teks yang dimanipulasi oleh pelaku.

    Contoh transformasi:
    - "r4h4s1a"    → "rahasia"
    - "r a h a s i a" → "rahasia"
    - "k0nt0l"     → "kontol"
    - "r.a.h.a.s.i.a" → "rahasia"
    """
    result = text

    # Step 1: Hapus titik/dash yang disisipkan antar huruf (a.b.c → abc, a-b-c → abc)
    result = re.sub(r'(?<=\w)[.\-_](?=\w)', '', result)

    # Step 2: Gabungkan kata yang disisipkan spasi (r a h a s i a → rahasia)
    def collapse_spaced(match):
        return match.group(0).replace(' ', '')
    result = _SPACED_WORD_PATTERN.sub(collapse_spaced, result)

    # Step 3: Ganti leet-speak (4 → a, 1 → i, dll)
    output = []
    for char in result:
        output.append(_LEET_MAP.get(char, char))
    result = ''.join(output)

    return result


# ============================================================
# LAPISAN 2: SLANG KENDARI (Normalisasi Dialek)
# ============================================================

# Kamus slang Kendari bawaan (built-in)
# Disusun dari pola percakapan umum di Kendari, Sulawesi Tenggara
_BUILTIN_SLANG = {
    # Kata ganti orang (pronoun)
    'sa': 'saya',
    'ko': 'kamu',
    'mi': 'saja',       # partikel penegas ("pergi mi" = "pergi saja")
    'ji': 'saja',       # varian "mi" ("itu ji" = "itu saja")
    'ta': 'kita',       # bisa berarti "saya" atau "kita"
    'le': 'lagi',
    'mo': 'mau',
    'kah': 'kah',       # partikel tanya
    'pa': 'apa',
    'na': 'sudah',      # "na pergi" = "sudah pergi"
    'toh': 'kan',       # "betul toh" = "betul kan"
    'nda': 'tidak',
    'ndak': 'tidak',
    'kase': 'kasih',
    'pake': 'pakai',
    'dong': 'dong',
    'deh': 'deh',
    'sih': 'sih',
    'kok': 'kok',
    'gak': 'tidak',
    'gk': 'tidak',
    'ga': 'tidak',
    'ngga': 'tidak',
    'nggak': 'tidak',
    'gue': 'saya',
    'gw': 'saya',
    'lu': 'kamu',
    'lo': 'kamu',
    'wkwk': '',         # tertawa — tidak relevan
    'wkwkwk': '',
    'haha': '',
    'hehe': '',
    'kwkw': '',
    'btw': 'ngomong-ngomong',
    'otw': 'dalam perjalanan',
    'yg': 'yang',
    'dgn': 'dengan',
    'dg': 'dengan',
    'sm': 'sama',
    'blm': 'belum',
    'blom': 'belum',
    'udh': 'sudah',
    'udah': 'sudah',
    'org': 'orang',
    'ortu': 'orang tua',
    'gpp': 'tidak apa-apa',
    'bgt': 'banget',
    'bngt': 'banget',
    'beb': 'beb',       # panggilan sayang — tetap pertahankan
    'beby': 'beb',
    'beibeh': 'beb',
}

# Path ke file kamus slang tambahan yang bisa di-update
_SLANG_FILE_PATH = os.path.join(os.path.dirname(__file__), 'slang_dictionary.json')


def _load_extended_slang() -> dict:
    """Memuat kamus slang tambahan dari file JSON jika ada."""
    if os.path.exists(_SLANG_FILE_PATH):
        try:
            with open(_SLANG_FILE_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def _get_full_slang_dict() -> dict:
    """Menggabungkan kamus bawaan dengan kamus tambahan."""
    full = dict(_BUILTIN_SLANG)
    full.update(_load_extended_slang())
    return full


def normalize_slang(text: str) -> str:
    """
    Menerjemahkan slang Kendari dan slang umum Indonesia ke bahasa baku.

    Pemrosesan per-kata (word-level), bukan substring matching,
    agar "kosong" tidak menjadi "kamung" (ko→kamu + song).

    Contoh:
    - "ko mau ke mana mi ini" → "kamu mau ke mana saja ini"
    - "sa tunggu di depan ya"  → "saya tunggu di depan ya"
    """
    slang_dict = _get_full_slang_dict()
    words = text.split()
    normalized = []

    for word in words:
        clean_word = word.lower().strip()
        replacement = slang_dict.get(clean_word, clean_word)
        if replacement:  # Skip jika replacement kosong (kata noise)
            normalized.append(replacement)

    return ' '.join(normalized)


# ============================================================
# LAPISAN 3: PEMBERSIHAN UMUM
# ============================================================

def clean_text(text: str) -> str:
    """
    Pembersihan teks final sebelum masuk ke model.
    - Lowercase
    - Hapus simbol (kecuali spasi dan alfanumerik)
    - Normalisasi spasi berlebih
    """
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ============================================================
# PIPELINE UTAMA
# ============================================================

def preprocess(text: str) -> str:
    """
    Pipeline preprocessing lengkap. Urutan eksekusi:
    1. Deobfuscation (anti-evasi)
    2. Normalisasi slang
    3. Pembersihan umum

    Input:  "ko ng.ga u$ah b1lang mama mu ya"
    Output: "kamu tidak usah bilang mama kamu ya"
    """
    text = deobfuscate(text)
    text = normalize_slang(text)
    text = clean_text(text)
    return text
