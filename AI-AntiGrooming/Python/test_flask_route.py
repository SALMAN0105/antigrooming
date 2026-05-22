import requests
import json

def test_analyze():
    url = "http://127.0.0.1:5000/analyze"
    
    # 1. Test dengan teks grooming yang terdeteksi bahaya (BAHAYA)
    payload_danger = {
        "child_id": 1,
        "text": "kirim foto tanpa busana dong, nanti om kasih hadiah menarik"
    }
    
    print("=== Mengirim Teks Berbahaya ke Flask AI ===")
    try:
        response = requests.post(url, json=payload_danger)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Gagal menghubungi Flask AI: {e}")
        
    print("\n" + "="*40 + "\n")
    
    # 2. Test dengan teks aman (AMAN)
    payload_safe = {
        "child_id": 1,
        "text": "Halo ma, aku sudah pulang sekolah nih sekarang lagi nunggu ojek online."
    }
    
    print("=== Mengirim Teks Aman ke Flask AI ===")
    try:
        response = requests.post(url, json=payload_safe)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Gagal menghubungi Flask AI: {e}")

if __name__ == "__main__":
    test_analyze()
