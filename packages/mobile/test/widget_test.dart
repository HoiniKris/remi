import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('App loads and displays home screen with bottom navigation',
      (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RummyGameApp());

    // Wait for the app to settle (animations complete)
    await tester.pumpAndSettle();

    // Verify that the home screen loads with expected elements
    expect(find.text('Rummy Game\nPlatform'), findsOneWidget);
    expect(find.text('Modern online Rummy gaming experience'), findsOneWidget);
    expect(find.text('Quick Play'), findsOneWidget);
    expect(find.text('Friends'), findsOneWidget);
    
    // Verify bottom navigation
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Tournaments'), findsOneWidget);
    expect(find.text('Shop'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });

  testWidgets('Quick Play button navigates to game lobby',
      (WidgetTester tester) async {
    await tester.pumpWidget(const RummyGameApp());
    await tester.pumpAndSettle();

    // Find and tap the Quick Play button
    final playButton = find.text('Quick Play');
    expect(playButton, findsOneWidget);

    await tester.tap(playButton);
    await tester.pumpAndSettle();

    // Verify navigation to game lobby screen
    expect(find.text('Game Lobby'), findsOneWidget);
  });

  testWidgets('Bottom navigation switches between screens',
      (WidgetTester tester) async {
    await tester.pumpWidget(const RummyGameApp());
    await tester.pumpAndSettle();

    // Verify we start on home screen
    expect(find.text('Rummy Game\nPlatform'), findsOneWidget);

    // Tap Tournaments tab
    await tester.tap(find.text('Tournaments'));
    await tester.pumpAndSettle();
    expect(find.text('Compete for glory and prizes'), findsOneWidget);

    // Tap Shop tab
    await tester.tap(find.text('Shop'));
    await tester.pumpAndSettle();
    expect(find.text('Enhance your gaming experience'), findsOneWidget);

    // Tap Profile tab
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();
    expect(find.text('Player123'), findsOneWidget);

    // Tap Home tab to go back
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();
    expect(find.text('Rummy Game\nPlatform'), findsOneWidget);
  });

  testWidgets('Feature cards are displayed', (WidgetTester tester) async {
    await tester.pumpWidget(const RummyGameApp());
    await tester.pumpAndSettle();

    // Verify feature cards are present
    expect(find.text('Multiple Game Modes'), findsOneWidget);
    expect(find.text('Social Features'), findsOneWidget);
    expect(find.text('Daily Tournaments'), findsOneWidget);
  });

  testWidgets('Icons are displayed correctly', (WidgetTester tester) async {
    await tester.pumpWidget(const RummyGameApp());
    await tester.pumpAndSettle();

    // Verify icons exist
    expect(find.byIcon(Icons.casino), findsOneWidget);
    expect(find.byIcon(Icons.play_arrow), findsWidgets);
    expect(find.byIcon(Icons.casino_outlined), findsOneWidget);
    expect(find.byIcon(Icons.people_outline), findsOneWidget);
    expect(find.byIcon(Icons.emoji_events_outlined), findsOneWidget);
  });
}
