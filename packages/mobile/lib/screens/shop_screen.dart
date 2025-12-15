import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_theme.dart';

class ShopScreen extends StatelessWidget {
  const ShopScreen({super.key});

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
                        Icons.shopping_bag,
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
                            'Shop',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1f2937),
                                ),
                          ),
                          Text(
                            'Enhance your gaming experience',
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
                    // Coins balance
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.amber.shade300),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.monetization_on,
                              color: Colors.amber.shade700, size: 20),
                          const SizedBox(width: 4),
                          Text(
                            '5,420',
                            style: TextStyle(
                              color: Colors.amber.shade900,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn().slideY(begin: -0.2, end: 0),

              // Shop Items
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  children: [
                    // Coin Packages Section
                    Text(
                      'Coin Packages',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1f2937),
                          ),
                    ).animate().fadeIn(delay: 100.ms),
                    const SizedBox(height: 16),
                    
                    Row(
                      children: [
                        Expanded(
                          child: _buildCoinPackage(
                            context,
                            coins: '1,000',
                            price: '\$0.99',
                            popular: false,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildCoinPackage(
                            context,
                            coins: '5,000',
                            price: '\$3.99',
                            popular: true,
                          ),
                        ),
                      ],
                    ).animate().fadeIn(delay: 200.ms).slideX(begin: -0.2, end: 0),
                    
                    const SizedBox(height: 12),
                    
                    Row(
                      children: [
                        Expanded(
                          child: _buildCoinPackage(
                            context,
                            coins: '10,000',
                            price: '\$6.99',
                            popular: false,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildCoinPackage(
                            context,
                            coins: '25,000',
                            price: '\$14.99',
                            popular: false,
                          ),
                        ),
                      ],
                    ).animate().fadeIn(delay: 300.ms).slideX(begin: -0.2, end: 0),
                    
                    const SizedBox(height: 32),
                    
                    // Premium Items Section
                    Text(
                      'Premium Items',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF1f2937),
                          ),
                    ).animate().fadeIn(delay: 400.ms),
                    const SizedBox(height: 16),
                    
                    _buildPremiumItem(
                      context,
                      icon: Icons.casino,
                      title: 'Extra Joker Pack',
                      description: 'Add 4 extra Jokers to your games',
                      price: '2,500 coins',
                      color: Colors.purple,
                    ).animate().fadeIn(delay: 500.ms).slideX(begin: -0.2, end: 0),
                    
                    const SizedBox(height: 16),
                    
                    _buildPremiumItem(
                      context,
                      icon: Icons.star,
                      title: 'VIP Membership',
                      description: 'Exclusive benefits and bonuses',
                      price: '9,999 coins',
                      color: Colors.amber,
                    ).animate().fadeIn(delay: 600.ms).slideX(begin: -0.2, end: 0),
                    
                    const SizedBox(height: 16),
                    
                    _buildPremiumItem(
                      context,
                      icon: Icons.palette,
                      title: 'Custom Tile Themes',
                      description: 'Personalize your game tiles',
                      price: '1,500 coins',
                      color: Colors.pink,
                    ).animate().fadeIn(delay: 700.ms).slideX(begin: -0.2, end: 0),
                    
                    const SizedBox(height: 16),
                    
                    _buildPremiumItem(
                      context,
                      icon: Icons.emoji_emotions,
                      title: 'Emoji Pack',
                      description: 'Express yourself in chat',
                      price: '500 coins',
                      color: Colors.orange,
                    ).animate().fadeIn(delay: 800.ms).slideX(begin: -0.2, end: 0),
                    
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCoinPackage(
    BuildContext context, {
    required String coins,
    required String price,
    required bool popular,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: popular
            ? Border.all(color: AppTheme.teal, width: 2)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Icon(
                  Icons.monetization_on,
                  color: Colors.amber.shade600,
                  size: 48,
                ),
                const SizedBox(height: 12),
                Text(
                  coins,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF1f2937),
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'coins',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF6b7280),
                      ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: Text(
                      price,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (popular)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.teal,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'POPULAR',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPremiumItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
    required String price,
    required Color color,
  }) {
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
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: color,
                size: 32,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF1f2937),
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF6b7280),
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              child: Text(
                price,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
