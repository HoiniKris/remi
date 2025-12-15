/// API Configuration for Rummy Game Platform
class ApiConfig {
  // Backend API URL
  // For Android Emulator: use 10.0.2.2
  // For iOS Simulator: use localhost
  // For Physical Device: use your computer's IP address
  static const String baseUrl = 'http://10.0.2.2:3000';
  
  // Alternative URLs for different environments
  static const String localhostUrl = 'http://localhost:3000';
  static const String productionUrl = 'https://your-production-url.com';
  
  // WebSocket URL
  static const String wsUrl = 'ws://10.0.2.2:3000';
  
  // API Endpoints
  static const String authEndpoint = '/api/auth';
  static const String gameEndpoint = '/api/game';
  static const String profileEndpoint = '/api/profile';
  static const String friendsEndpoint = '/api/friends';
  static const String tournamentEndpoint = '/api/tournaments';
  static const String shopEndpoint = '/api/shop';
  
  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Get the appropriate base URL based on platform
  static String getBaseUrl() {
    // You can add platform-specific logic here
    return baseUrl;
  }
  
  // Get full endpoint URL
  static String getEndpoint(String endpoint) {
    return '${getBaseUrl()}$endpoint';
  }
}
