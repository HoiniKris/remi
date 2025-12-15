import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _soundEnabled = true;
  bool _musicEnabled = true;
  bool _notificationsEnabled = true;
  bool _vibrationEnabled = true;
  double _soundVolume = 0.7;
  double _musicVolume = 0.5;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppTheme.blueLight, AppTheme.tealLight],
          ),
        ),
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            // Audio Settings
            _buildSectionTitle('Audio Settings')
                .animate()
                .fadeIn()
                .slideX(begin: -0.2, end: 0),
            const SizedBox(height: 16),
            
            _buildSettingCard(
              child: Column(
                children: [
                  _buildSwitchTile(
                    title: 'Sound Effects',
                    subtitle: 'Play sound effects during gameplay',
                    value: _soundEnabled,
                    onChanged: (value) {
                      setState(() => _soundEnabled = value);
                    },
                  ),
                  if (_soundEnabled) ...[
                    const Divider(),
                    _buildSliderTile(
                      title: 'Sound Volume',
                      value: _soundVolume,
                      onChanged: (value) {
                        setState(() => _soundVolume = value);
                      },
                    ),
                  ],
                  const Divider(),
                  _buildSwitchTile(
                    title: 'Background Music',
                    subtitle: 'Play music in the background',
                    value: _musicEnabled,
                    onChanged: (value) {
                      setState(() => _musicEnabled = value);
                    },
                  ),
                  if (_musicEnabled) ...[
                    const Divider(),
                    _buildSliderTile(
                      title: 'Music Volume',
                      value: _musicVolume,
                      onChanged: (value) {
                        setState(() => _musicVolume = value);
                      },
                    ),
                  ],
                ],
              ),
            ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.2, end: 0),

            const SizedBox(height: 32),

            // Notifications
            _buildSectionTitle('Notifications')
                .animate()
                .fadeIn(delay: 200.ms)
                .slideX(begin: -0.2, end: 0),
            const SizedBox(height: 16),
            
            _buildSettingCard(
              child: Column(
                children: [
                  _buildSwitchTile(
                    title: 'Push Notifications',
                    subtitle: 'Receive game updates and alerts',
                    value: _notificationsEnabled,
                    onChanged: (value) {
                      setState(() => _notificationsEnabled = value);
                    },
                  ),
                  const Divider(),
                  _buildSwitchTile(
                    title: 'Vibration',
                    subtitle: 'Vibrate on important events',
                    value: _vibrationEnabled,
                    onChanged: (value) {
                      setState(() => _vibrationEnabled = value);
                    },
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 300.ms).slideX(begin: -0.2, end: 0),

            const SizedBox(height: 32),

            // Gameplay Settings
            _buildSectionTitle('Gameplay')
                .animate()
                .fadeIn(delay: 400.ms)
                .slideX(begin: -0.2, end: 0),
            const SizedBox(height: 16),
            
            _buildSettingCard(
              child: Column(
                children: [
                  _buildTile(
                    title: 'Auto-Sort Tiles',
                    subtitle: 'Automatically organize your tiles',
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                  const Divider(),
                  _buildTile(
                    title: 'Animation Speed',
                    subtitle: 'Normal',
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                  const Divider(),
                  _buildTile(
                    title: 'Tile Theme',
                    subtitle: 'Classic',
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 500.ms).slideX(begin: -0.2, end: 0),

            const SizedBox(height: 32),

            // Account Settings
            _buildSectionTitle('Account')
                .animate()
                .fadeIn(delay: 600.ms)
                .slideX(begin: -0.2, end: 0),
            const SizedBox(height: 16),
            
            _buildSettingCard(
              child: Column(
                children: [
                  _buildTile(
                    title: 'Edit Profile',
                    subtitle: 'Change your username and avatar',
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                  const Divider(),
                  _buildTile(
                    title: 'Change Password',
                    subtitle: 'Update your password',
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                  const Divider(),
                  _buildTile(
                    title: 'Privacy Settings',
                    subtitle: 'Manage your privacy preferences',
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 700.ms).slideX(begin: -0.2, end: 0),

            const SizedBox(height: 32),

            // About
            _buildSectionTitle('About')
                .animate()
                .fadeIn(delay: 800.ms)
                .slideX(begin: -0.2, end: 0),
            const SizedBox(height: 16),
            
            _buildSettingCard(
              child: Column(
                children: [
                  _buildTile(
                    title: 'Terms & Conditions',
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                  const Divider(),
                  _buildTile(
                    title: 'Privacy Policy',
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                  const Divider(),
                  _buildTile(
                    title: 'About Us',
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {},
                  ),
                  const Divider(),
                  _buildTile(
                    title: 'App Version',
                    subtitle: '1.0.0',
                    trailing: const SizedBox(),
                    onTap: null,
                  ),
                ],
              ),
            ).animate().fadeIn(delay: 900.ms).slideX(begin: -0.2, end: 0),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
        color: Color(0xFF1f2937),
      ),
    );
  }

  Widget _buildSettingCard({required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _buildSwitchTile({
    required String title,
    String? subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return ListTile(
      title: Text(
        title,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          color: Color(0xFF1f2937),
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: const TextStyle(
                color: Color(0xFF6b7280),
                fontSize: 12,
              ),
            )
          : null,
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeColor: AppTheme.teal,
      ),
    );
  }

  Widget _buildSliderTile({
    required String title,
    required double value,
    required ValueChanged<double> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: Color(0xFF1f2937),
            ),
          ),
          Slider(
            value: value,
            onChanged: onChanged,
            activeColor: AppTheme.teal,
          ),
        ],
      ),
    );
  }

  Widget _buildTile({
    required String title,
    String? subtitle,
    required Widget trailing,
    VoidCallback? onTap,
  }) {
    return ListTile(
      title: Text(
        title,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          color: Color(0xFF1f2937),
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: const TextStyle(
                color: Color(0xFF6b7280),
                fontSize: 12,
              ),
            )
          : null,
      trailing: trailing,
      onTap: onTap,
    );
  }
}
