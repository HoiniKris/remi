import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/main_navigation_screen.dart';
import 'theme/app_theme.dart';
import 'bloc/online_game_bloc.dart';

void main() {
  runApp(const RummyGameApp());
}

class RummyGameApp extends StatelessWidget {
  const RummyGameApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => OnlineGameBloc(),
      child: MaterialApp(
        title: 'Rummy Game Platform',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const MainNavigationScreen(),
      ),
    );
  }
}
