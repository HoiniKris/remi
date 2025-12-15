import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';

class TournamentsScreen extends StatelessWidget {
  const TournamentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppTheme.blueLight, AppTheme.tealLight],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.emoji_events,
                        color: AppTheme.teal,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Tournaments',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1f2937),
                                ),
                          ),
                          Text(
                            'Compete for glory and prizes',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  color: const Color(0xFF6b7280),
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn().slideY(begin: -0.2, end: 0),

              // Tournament List
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  children: [
                    _buildTournamentCard(
                      context,
                      title: 'Daily Championship',
                      gameType: 'Rummy PRO',
                      startTime: '2:00 PM',
                      players: '128/256',
                      entryFee: 'Free',
                      prize: '10,000 coins',
                      status: TournamentStatus.open,
                    ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.2, end: 0),
                    
                    const SizedBox(height: 16),
                    
                    _buildTournamentCard(
                      context,
                      title: 'Weekend Masters',
                      gameType: 'Rummy 45',
                      startTime: '6:00 PM',
                      players: '64/128',
                      entryFee: '500 coins',
                      prize: '50,000 coins',
                      status: TournamentStatus.open,
                    ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.2, end: 0),
                    
                    const SizedBox(height: 16),
                    
                    _buildTournamentCard(
                      context,
                      title: 'Pro League',
                      gameType: 'Canasta',
                      startTime: 'In Progress',
                      players: '32/32',
                      entryFee: '1,000 coins',
                      prize: '100,000 coins',
                      status: TournamentStatus.inProgress,
                    ).animate().fadeIn(delay: 300.ms).slideX(begin: -0.2, end: 0),
                    
                    const SizedBox(height: 16),
                    
                    _buildTournamentCard(
                      context,
                      title: 'Beginner Cup',
                      gameType: 'Rummy PRO',
                      startTime: 'Tomorrow 10:00 AM',
                      players: '0/64',
                      entryFee: 'Free',
                      prize: '5,000 coins',
                      status: TournamentStatus.upcoming,
                    ).animate().fadeIn(delay: 400.ms).slideX(begin: -0.2, end: 0),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTournamentCard(
    BuildContext context, {
    required String title,
    required String gameType,
    required String startTime,
    required String players,
    required String entryFee,
    required String prize,
    required TournamentStatus status,
  }) {
    Color statusColor;
    String statusText;
    
    switch (status) {
      case TournamentStatus.open:
        statusColor = Colors.green;
        statusText = 'Open';
        break;
      case TournamentStatus.inProgress:
        statusColor = Colors.orange;
        statusText = 'In Progress';
        break;
      case TournamentStatus.upcoming:
        statusColor = Colors.blue;
        statusText = 'Upcoming';
        break;
    }

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
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.teal.withOpacity(0.1), AppTheme.blue.withOpacity(0.1)],
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1f2937),
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        gameType,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppTheme.teal,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    statusText,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Details
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        context,
                        icon: Icons.access_time,
                        label: 'Start Time',
                        value: startTime,
                      ),
                    ),
                    Expanded(
                      child: _buildInfoItem(
                        context,
                        icon: Icons.people,
                        label: 'Players',
                        value: players,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        context,
                        icon: Icons.monetization_on,
                        label: 'Entry Fee',
                        value: entryFee,
                      ),
                    ),
                    Expanded(
                      child: _buildInfoItem(
                        context,
                        icon: Icons.emoji_events,
                        label: 'Prize',
                        value: prize,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: status == TournamentStatus.open
                        ? () {
                            // Register for tournament
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: Text(
                      status == TournamentStatus.open
                          ? 'Register Now'
                          : status == TournamentStatus.inProgress
                              ? 'View Standings'
                              : 'Coming Soon',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
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

  Widget _buildInfoItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: const Color(0xFF6b7280)),
            const SizedBox(width: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF6b7280),
                  ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1f2937),
              ),
        ),
      ],
    );
  }
}

enum TournamentStatus {
  open,
  inProgress,
  upcoming,
}
