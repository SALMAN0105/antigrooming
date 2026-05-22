import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';
import 'qr_scanner_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:animate_do/animate_do.dart';
import 'api_config.dart';

// Global Theme Notifier
final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.dark);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load saved theme
  final prefs = await SharedPreferences.getInstance();
  final bool isDark = prefs.getBool('isDarkMode') ?? true;
  themeNotifier.value = isDark ? ThemeMode.dark : ThemeMode.light;

  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
  ));
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeNotifier,
      builder: (_, ThemeMode currentMode, __) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'AntiGrooming Anak',
          themeMode: currentMode,
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF6366F1),
              brightness: Brightness.light,
              surface: const Color(0xFFF8FAFC),
            ),
            textTheme: GoogleFonts.plusJakartaSansTextTheme(
              ThemeData.light().textTheme,
            ),
          ),
          darkTheme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF6366F1),
              brightness: Brightness.dark,
              surface: const Color(0xFF0F172A),
            ),
            textTheme: GoogleFonts.plusJakartaSansTextTheme(
              ThemeData.dark().textTheme,
            ),
          ),
          home: const HomePage(),
        );
      },
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with SingleTickerProviderStateMixin {
  static const platform = MethodChannel('com.example.agent_app/service');

  final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
    ),
  );

  bool _isServiceEnabled = false;
  String _statusText = 'Layanan Belum Aktif';
  bool _isLoading = false;
  String? _deviceToken;
  bool _isPaired = false;
  bool _isSyncing = false;

  Timer? _syncTimer;
  late Database _localDb;
  bool _dbInitialized = false;

  bool _hasNotificationPermission = false;
  bool _hasAccessibilityPermission = false;
  bool _hasScreenCapturePermission = false;

  @override
  void initState() {
    super.initState();
    _initLocalDatabase().then((_) => _initDeviceToken());
    _setupMethodChannelListener();
    _checkServiceStatus();
    _checkNotificationPermission();
  }

  Future<void> _initLocalDatabase() async {
    _localDb = await openDatabase(
      p.join(await getDatabasesPath(), 'antigrooming.db'),
      version: 3,
      onCreate: (db, version) {
        return db.execute(
          'CREATE TABLE insiden_tertunda('
          'id INTEGER PRIMARY KEY AUTOINCREMENT, '
          'teks TEXT, '
          'nama_aplikasi TEXT, '
          'waktu TEXT, '
          'path_tangkapan_layar TEXT, '
          'identitas_pelaku TEXT)',
        );
      },
      onUpgrade: (db, oldVersion, newVersion) {
        if (oldVersion < 2) {
          db.execute('ALTER TABLE pending_incidents ADD COLUMN pelaku_identitas TEXT');
        }
        if (oldVersion < 3) {
          db.execute(
            'CREATE TABLE IF NOT EXISTS insiden_tertunda('
            'id INTEGER PRIMARY KEY AUTOINCREMENT, '
            'teks TEXT, '
            'nama_aplikasi TEXT, '
            'waktu TEXT, '
            'path_tangkapan_layar TEXT, '
            'identitas_pelaku TEXT)',
          );
          db.execute(
            'INSERT INTO insiden_tertunda (id, teks, nama_aplikasi, waktu, path_tangkapan_layar, identitas_pelaku) '
            'SELECT id, text, appName, timestamp, screenshotPath, pelaku_identitas FROM pending_incidents',
          );
          db.execute('DROP TABLE IF EXISTS pending_incidents');
        }
      },
    );
    _dbInitialized = true;

    _syncTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _syncOfflineData(),
    );
  }

  Future<void> _initDeviceToken() async {
    final prefs = await SharedPreferences.getInstance();
    String? token = prefs.getString('device_token');
    final bool pairedStatus = prefs.getBool('is_paired') ?? false;

    if (token == null) {
      token = const Uuid().v4();
      await prefs.setString('device_token', token);
    }

    if (!mounted) return;
    setState(() {
      _deviceToken = token;
      _isPaired = pairedStatus;
    });
  }

  Future<void> _processScanResult(String qrToken) async {
    if (_deviceToken == null) return;
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final response = await _dio.post(
        '${ApiConfig.baseUrl}/device/pair-with-qrcode',
        data: {
          'token_qr': qrToken,
          'device_token': _deviceToken,
        },
      );

      if (!mounted) return;

      if (response.data['status'] == 'success') {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool('is_paired', true);
        setState(() => _isPaired = true);

        _showCustomSnackBar('Berhasil terhubung dengan Orang Tua!', isError: false);
      } else {
        _showCustomSnackBar(response.data['message'] ?? 'Gagal menghubungkan perangkat.', isError: true);
      }
    } on DioException catch (e) {
      if (!mounted) return;
      _showCustomSnackBar(
        e.response != null ? 'QR Code tidak valid.' : 'Masalah koneksi internet.',
        isError: true,
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showCustomSnackBar(String message, {required bool isError}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: isError ? const Color(0xFFE11D48) : const Color(0xFF059669),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(20),
      ),
    );
  }

  void _setupMethodChannelListener() {
    platform.setMethodCallHandler((call) async {
      if (call.method == 'uploadIncident') {
        final Map<dynamic, dynamic> arguments = call.arguments as Map;
        final String text = arguments['text']?.toString().trim() ?? '';
        if (text.isEmpty) return;

        final Map<String, dynamic> cleanData = {
          'text': text,
          'appName': arguments['appName']?.toString() ?? 'unknown',
          'timestamp': arguments['timestamp']?.toString() ?? DateTime.now().toIso8601String(),
          'screenshotPath': arguments['screenshotPath']?.toString(),
          'pelaku_identitas': arguments['pelaku_identitas']?.toString() ?? 'Tidak Diketahui',
        };
        await _handleIncidentPayload(cleanData);
      }
    });
  }

  void _deleteScreenshot(String? path) {
    if (path == null) return;
    try {
      final file = File(path);
      if (file.existsSync()) file.deleteSync();
    } catch (e) {
      debugPrint('Error deleting file: $e');
    }
  }

  Future<void> _handleIncidentPayload(Map<String, dynamic> data, {bool isFromSync = false}) async {
    try {
      final aiResponse = await _dio.post(
        ApiConfig.aiEndpoint,
        data: {'text': data['text']},
      );

      if (aiResponse.data['detected'] == true) {
        data['risk_level'] = aiResponse.data['risk_level'] ?? 'kritis';

        if (data['screenshotPath'] == null) {
          try {
            final String? capturedPath = await platform.invokeMethod<String>('captureScreenshot');
            if (capturedPath != null) {
              data['screenshotPath'] = capturedPath;
            }
          } on PlatformException catch (e) {
            debugPrint('⚠️ captureScreenshot gagal: ${e.code}');
          }
        }
        await _sendToServer(data);
      } else {
        _deleteScreenshot(data['screenshotPath']);
      }
    } catch (e) {
      if (isFromSync) rethrow;
      if (_dbInitialized) {
        await _localDb.insert('insiden_tertunda', {
          'teks': data['text'],
          'nama_aplikasi': data['appName'],
          'waktu': data['timestamp'],
          'path_tangkapan_layar': data['screenshotPath'],
          'identitas_pelaku': data['pelaku_identitas'],
        });
      }
    }
  }

  Future<void> _sendToServer(Map<String, dynamic> incidentData) async {
    if (_deviceToken == null) return;

    final formData = FormData.fromMap({
      'device_token': _deviceToken,
      'detected_text': incidentData['text'],
      'app_name': incidentData['appName'],
      'risk_level': 'kritis',
      'incident_timestamp': incidentData['timestamp'],
      'pelaku_identitas': incidentData['pelaku_identitas'] ?? 'Tidak Diketahui',
    });

    final String? screenshotPath = incidentData['screenshotPath'] as String?;
    if (screenshotPath != null && File(screenshotPath).existsSync()) {
      formData.files.add(
        MapEntry(
          'screenshot',
          await MultipartFile.fromFile(
            screenshotPath,
            filename: 'evidence_${DateTime.now().millisecondsSinceEpoch}.jpg',
            contentType: DioMediaType('image', 'jpeg'),
          ),
        ),
      );
    }

    await _dio.post(
      ApiConfig.incidentsEndpoint,
      data: formData,
      options: Options(headers: {'Host': ApiConfig.hostHeader}),
    );
    _deleteScreenshot(screenshotPath);
  }

  Future<void> _syncOfflineData() async {
    if (_isSyncing || !_dbInitialized) return;
    _isSyncing = true;

    try {
      final List<Map<String, dynamic>> pendingData = await _localDb.query('insiden_tertunda');
      if (pendingData.isEmpty) return;

      for (final row in pendingData) {
        try {
          final Map<String, dynamic> rowData = {
            'text': row['teks'],
            'appName': row['nama_aplikasi'],
            'timestamp': row['waktu'],
            'screenshotPath': row['path_tangkapan_layar'],
            'pelaku_identitas': row['identitas_pelaku'],
          };
          await _handleIncidentPayload(rowData, isFromSync: true);
          await _localDb.delete(
            'insiden_tertunda',
            where: 'id = ?',
            whereArgs: [row['id']],
          );
        } catch (e) {
          break;
        }
      }
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _checkNotificationPermission() async {
    final status = await Permission.notification.status;
    if (!status.isGranted) {
        // Just check, don't auto-request here to avoid spam
    }
    if (!mounted) return;
    setState(() => _hasNotificationPermission = status.isGranted);
  }

  Future<void> _checkServiceStatus() async {
    bool isEnabled = false;
    try {
      isEnabled = await platform.invokeMethod<bool>('isAccessibilityServiceEnabled') ?? false;
    } catch (e) {
      isEnabled = false;
    }

    if (!mounted) return;
    setState(() {
      _isServiceEnabled = isEnabled;
      _hasAccessibilityPermission = isEnabled;
      _statusText = isEnabled ? 'Sistem Terlindungi ✓' : 'Layanan Belum Aktif';
    });

    if (isEnabled) {
      try {
        await platform.invokeMethod('startService');
      } catch (_) {}
    }
  }

  Future<void> _requestPermission() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _statusText = 'Memproses izin...';
    });

    try {
      var statusNotif = await Permission.notification.status;
      if (!statusNotif.isGranted) {
        statusNotif = await Permission.notification.request();
        if (!statusNotif.isGranted) {
          if (!mounted) return;
          setState(() {
            _statusText = 'Izin Notifikasi Diperlukan';
            _isLoading = false;
          });
          return;
        }
      }
      if (!mounted) return;
      setState(() => _hasNotificationPermission = true);

      await platform.invokeMethod('requestAccessibilityPermission');
      await Future.delayed(const Duration(seconds: 15));

      final bool isAccessEnabled = await platform.invokeMethod<bool>('isAccessibilityServiceEnabled') ?? false;
      if (!mounted) return;
      setState(() => _hasAccessibilityPermission = isAccessEnabled);

      if (!isAccessEnabled) {
        setState(() {
          _statusText = 'Aktifkan Aksesibilitas';
          _isLoading = false;
        });
        return;
      }

      final bool? screenGranted = await platform.invokeMethod<bool>('requestScreenCapturePermission');
      if (!mounted) return;
      setState(() => _hasScreenCapturePermission = screenGranted ?? false);

      await _checkServiceStatus();
      if (mounted) setState(() => _isLoading = false);

    } catch (e) {
      if (!mounted) return;
      setState(() {
        _statusText = 'Terjadi kesalahan perizinan.';
        _isLoading = false;
      });
    }
  }

  void _toggleTheme() async {
    final bool isDark = themeNotifier.value == ThemeMode.dark;
    themeNotifier.value = isDark ? ThemeMode.light : ThemeMode.dark;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isDarkMode', !isDark);
    
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: !isDark ? Brightness.light : Brightness.dark,
    ));
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    if (_dbInitialized) _localDb.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final Color textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final Color subTextColor = isDark ? Colors.white.withValues(alpha: 0.4) : const Color(0xFF64748B);
    final Color cardColor = isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white.withValues(alpha: 0.7);
    final Color borderColor = isDark ? Colors.white.withValues(alpha: 0.1) : const Color(0xFF6366F1).withValues(alpha: 0.1);

    return Scaffold(
      body: Stack(
        children: [
          // Dynamic Background with smoother transition
          AnimatedContainer(
            duration: const Duration(milliseconds: 600),
            curve: Curves.easeInOut,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDark 
                  ? [const Color(0xFF0F172A), const Color(0xFF1E1B4B), const Color(0xFF0F172A)]
                  : [const Color(0xFFF0F4FF), const Color(0xFFFFFFFF), const Color(0xFFF0F4FF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          
          // Subtle mesh-like decoration
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF6366F1).withValues(alpha: 0.1),
              ),
            ),
          ),

          SafeArea(
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Top Bar with Theme Toggle
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            GestureDetector(
                              onTap: _toggleTheme,
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 300),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: cardColor,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: borderColor),
                                  boxShadow: isDark ? [] : [
                                    BoxShadow(
                                      color: Colors.indigo.withValues(alpha: 0.05),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    )
                                  ],
                                ),
                                child: Icon(
                                  isDark ? LucideIcons.sun : LucideIcons.moon,
                                  color: isDark ? Colors.amber : const Color(0xFF4F46E5),
                                  size: 20,
                                ),
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 20),
                        
                        FadeInDown(
                          duration: const Duration(milliseconds: 800),
                          child: _buildHeader(textColor),
                        ),
                        const SizedBox(height: 48),
                        FadeInUp(
                          delay: const Duration(milliseconds: 200),
                          child: _buildStatusSection(cardColor, borderColor, textColor, subTextColor),
                        ),
                        const SizedBox(height: 32),
                        FadeInUp(
                          delay: const Duration(milliseconds: 400),
                          child: _buildPermissionSection(subTextColor, cardColor, borderColor, textColor),
                        ),
                        const SizedBox(height: 40),
                        FadeInUp(
                          delay: const Duration(milliseconds: 600),
                          child: _buildActionArea(isDark),
                        ),
                        const SizedBox(height: 48),
                        _buildFooterInfo(cardColor, borderColor, textColor, subTextColor),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(Color textColor) {
    return Column(
      children: [
        Stack(
          alignment: Alignment.center,
          children: [
            Pulse(
              infinite: _isServiceEnabled,
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: (_isServiceEnabled ? const Color(0xFF10B981) : const Color(0xFF6366F1)).withValues(alpha: 0.1),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.05),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Icon(
                _isServiceEnabled ? LucideIcons.shieldCheck : LucideIcons.shield,
                size: 48,
                color: _isServiceEnabled ? const Color(0xFF10B981) : const Color(0xFF6366F1),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          'AntiGrooming Anak',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            color: textColor,
            letterSpacing: -1,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Pelindung Digital AI',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF6366F1).withValues(alpha: 0.8),
            letterSpacing: 3,
          ),
        ),
      ],
    );
  }

  Widget _buildStatusSection(Color cardColor, Color borderColor, Color textColor, Color subTextColor) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: borderColor),
          ),
          child: Column(
            children: [
              Text(
                'Status Sistem',
                style: TextStyle(
                  color: subTextColor,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _statusText.toUpperCase(),
                style: GoogleFonts.plusJakartaSans(
                  color: _isServiceEnabled ? const Color(0xFF10B981) : textColor,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPermissionSection(Color subTextColor, Color cardColor, Color borderColor, Color textColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 16),
          child: Text(
            'KONFIGURASI KEAMANAN',
            style: TextStyle(
              color: subTextColor,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 2,
            ),
          ),
        ),
        _buildModernPermissionTile(
          'Layanan Notifikasi',
          'Berjalan di latar belakang',
          _hasNotificationPermission,
          LucideIcons.bell,
          cardColor,
          borderColor,
          textColor,
          subTextColor,
        ),
        const SizedBox(height: 12),
        _buildModernPermissionTile(
          'Aksesibilitas',
          'Menganalisis percakapan',
          _hasAccessibilityPermission,
          LucideIcons.eye,
          cardColor,
          borderColor,
          textColor,
          subTextColor,
        ),
        const SizedBox(height: 12),
        _buildModernPermissionTile(
          'Perekaman Layar',
          'Mengambil bukti ancaman',
          _hasScreenCapturePermission,
          LucideIcons.camera,
          cardColor,
          borderColor,
          textColor,
          subTextColor,
        ),
      ],
    );
  }

  Widget _buildModernPermissionTile(String title, String sub, bool isOk, IconData icon, Color cardColor, Color borderColor, Color textColor, Color subTextColor) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (isOk ? const Color(0xFF10B981) : Colors.indigo).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: isOk ? const Color(0xFF10B981) : (isOk ? textColor : subTextColor), size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                Text(
                  sub,
                  style: TextStyle(color: subTextColor, fontSize: 12),
                ),
              ],
            ),
          ),
          Icon(
            isOk ? LucideIcons.checkCircle2 : LucideIcons.alertCircle,
            color: isOk ? const Color(0xFF10B981) : const Color(0xFFF43F5E).withValues(alpha: 0.5),
            size: 20,
          ),
        ],
      ),
    );
  }

  Widget _buildActionArea(bool isDark) {
    return Column(
      children: [
        // Main Action Button
        Container(
          width: double.infinity,
          height: 64,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              colors: _isServiceEnabled 
                ? [const Color(0xFF059669), const Color(0xFF065F46)]
                : [const Color(0xFF6366F1), const Color(0xFF4F46E5)],
            ),
            boxShadow: [
              BoxShadow(
                color: (_isServiceEnabled ? const Color(0xFF10B981) : const Color(0xFF6366F1)).withValues(alpha: 0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            onPressed: _isLoading ? null : (_isServiceEnabled ? _checkServiceStatus : _requestPermission),
            child: _isLoading
              ? const CircularProgressIndicator(color: Colors.white)
              : Text(
                  _isServiceEnabled ? 'PERBARUI STATUS' : 'AKTIFKAN PERLINDUNGAN',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
          ),
        ),
        
        const SizedBox(height: 24),
        
        // Secondary Action: QR Connection
        if (!_isPaired)
          TextButton.icon(
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            ),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => QRScannerScreen(
                    onDetect: (token) => _processScanResult(token),
                  ),
                ),
              );
            },
            icon: const Icon(LucideIcons.qrCode, color: Color(0xFF6366F1)),
            label: const Text(
              'HUBUNGKAN KE ORANG TUA',
              style: TextStyle(
                color: Color(0xFF6366F1),
                fontWeight: FontWeight.bold,
                fontSize: 13,
                letterSpacing: 1,
              ),
            ),
          )
        else
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: isDark ? 0.05 : 0.1),
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: isDark ? 0.1 : 0.2)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(LucideIcons.link, color: Color(0xFF10B981), size: 16),
                const SizedBox(width: 8),
                Text(
                  'Terhubung ke Dashboard',
                  style: GoogleFonts.plusJakartaSans(
                    color: const Color(0xFF059669),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildFooterInfo(Color cardColor, Color borderColor, Color textColor, Color subTextColor) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(LucideIcons.info, color: const Color(0xFF6366F1).withValues(alpha: 0.5), size: 18),
              const SizedBox(width: 12),
              Text(
                'Mengapa ini diperlukan?',
                style: TextStyle(color: textColor.withValues(alpha: 0.7), fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Sistem AI memerlukan izin di atas untuk memantau aktivitas mencurigakan dan melindungi Anda dari ancaman di dunia maya secara real-time.',
            style: TextStyle(color: subTextColor, fontSize: 12, height: 1.5),
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: Colors.white10),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildAppChip('WhatsApp'),
              _buildAppChip('Instagram'),
              _buildAppChip('Telegram'),
              _buildAppChip('Roblox'),
              _buildAppChip('Free Fire'),
              _buildAppChip('Mobile Legends'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAppChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF6366F1).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.2)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF6366F1),
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
