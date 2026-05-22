import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiConfig {
  // Pake IP IPv4 laptop kamu (dari WiFi hotspot HP)
  static const String serverIp = "10.59.123.182";
  static const String portPython = "5000";

  // Base URL pake http biasa biar gak ditolak SSL FlyEnv
  static const String baseUrl = "http://$serverIp/api";

  // Ini "KTP" yang wajib dibawa pas request ke Laravel
  static const String hostHeader = "antigrooming.test";

  // Endpoints
  static const String incidentsEndpoint = "$baseUrl/incidents";
  static const String aiEndpoint = "http://$serverIp:$portPython/analyze";
}

class ApiService {
  // Fungsi buat nembak API Laravel (wajib pake Host header)
  Future<void> fetchIncidents() async {
    var url = Uri.parse(ApiConfig.incidentsEndpoint);

    try {
      var response = await http.get(
        url,
        headers: {
          'Host': ApiConfig.hostHeader, // Tiket masuk FlyEnv-nya dipake di sini
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        print("Berhasil nembak Laravel: ${response.body}");
      } else {
        print("Wah ada error HTTP: ${response.statusCode}");
      }
    } catch (e) {
      print("Gagal konek ke Laravel: $e");
    }
  }

  // Fungsi buat nembak API Python (nggak butuh Host header)
  Future<void> analyzeData() async {
    var url = Uri.parse(ApiConfig.aiEndpoint);

    try {
      var response = await http.get(
        url,
        headers: {
          // Perhatiin di sini nggak pake header Host karena Python jalan di port 5000 sendiri, lepas dari Apache FlyEnv
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        print("Berhasil nembak Python: ${response.body}");
      }
    } catch (e) {
      print("Gagal konek ke Python: $e");
    }
  }
}
