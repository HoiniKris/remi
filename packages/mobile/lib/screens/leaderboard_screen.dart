import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leaderboard'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Daily'),
            Tab(text: 'Weekly'),
            Tab(text: 'All Time'),
          ],
        ),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppTheme.blueLight, AppTheme.tealLight],
          ),
        ),
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildLeaderboardList(),
            _buildLeaderboardList(),
            _buildLeaderboardList(),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaderboardList() {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        // Top 3 Podium
        _buildPodium(),
        const SizedBox(height: 32),
        
        // Rest of the list
        ...List.generate(
          10,
          (index) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _buildLeaderboardItem(
              rank: index + 4,
              name: 'Player${index + 4}',
              score: 15000 - (index * 1000),
              wins: 150 - (index * 10),
            ).animate().fadeIn(delay: (index * 50).ms).slideX(begin: -0.2, end: 0),
          ),
        ),
      ],
    );
  }

  Widget _buildPodium() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // 2nd Place
        _buildPodiumPlace(
          rank: 2,
          name: 'Player2',
          score: 18500,
          height: 120,
          color: Colors.grey.shade400,
        ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.3, end: 0),
        
        const SizedBox(width: 12),
        
        // 1st Place
        _buildPodiumPlace(
          rank: 1,
          name: 'Player1',
          score: 25000,
          height: 150,
          color: Colors.amber,
        ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.3, end: 0).scale(),
        
        const SizedBox(width: 12),
        
        // 3rd Place
        _buildPodiumPlace(
          rank: 3,
          name: 'Player3',
          score: 16200,
          height: 100,
          color: Colors.brown.shade400,
        ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.3, end: 0),
      ],
    );
  }

  Widget _buildPodiumPlace({
    required int rank,
    required String name,
    required int score,
    required double height,
    required Color color,
  }) {
    return Column(
      children: [
        // Crown for 1st place
        if (rank == 1)
          const Icon(
            Icons.emoji_events,
            color: Colors.amber,
            size: 32,
          ).animate().scale(delay: 400.ms),
        
        // Avatar
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [AppTheme.teal, AppTheme.blue],
            ),
            border: Border.all(color: color, width: 3),
          ),
          child: Center(
            child: Text(
              name[0],
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 24,
              ),
            ),
          ),
        ),
        
        const SizedBox(height: 8),
        
        // Name
        Text(
          name,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
        
        // Score
        Text(
          '$score pts',
          style: TextStyle(
            color: Colors.grey.shade600,
            fontSize: 12,
          ),
        ),
        
        const SizedBox(height: 8),
        
        // Podium
        Container(
          width: 80,
          height: height,
          decoration: BoxDecoration(
            color: color,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(8),
              topRight: Radius.circular(8),
            ),
          ),
          child: Center(
            child: Text(
              '#$rank',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 24,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLeaderboardItem({
    required int rank,
    required String name,
    required int score,
    required int wins,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
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
      child: Row(
        children: [
          // Rank
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.teal.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                '#$rank',
                style: const TextStyle(
                  color: AppTheme.teal,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          ),
          
          const SizedBox(width: 16),
          
          // Avatar
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [AppTheme.teal, AppTheme.blue],
              ),
            ),
            child: Center(
              child: Text(
                name[0],
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          
          const SizedBox(width: 16),
          
          // Name and stats
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  '$wins wins',
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          
          // Score
          Text(
            '$score',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: AppTheme.teal,
            ),
          ),
        ],
      ),
    );
  }
}
