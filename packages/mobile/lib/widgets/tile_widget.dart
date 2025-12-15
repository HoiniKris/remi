import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum TileColor { red, yellow, blue, black }

class TileData {
  final int number;
  final TileColor color;
  final bool isJoker;

  TileData({
    required this.number,
    required this.color,
    this.isJoker = false,
  });
}

class TileWidget extends StatelessWidget {
  final TileData tile;

  const TileWidget({
    super.key,
    required this.tile,
  });

  Color get tileColor {
    switch (tile.color) {
      case TileColor.red:
        return Colors.red;
      case TileColor.yellow:
        return Colors.amber;
      case TileColor.blue:
        return Colors.blue;
      case TileColor.black:
        return Colors.black87;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 55,
      height: 80,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: tile.isJoker
            ? Border.all(color: AppTheme.gold, width: 3)
            : null,
        boxShadow: [
          BoxShadow(
            color: tile.isJoker
                ? AppTheme.gold.withOpacity(0.4)
                : Colors.black.withOpacity(0.15),
            blurRadius: tile.isJoker ? 12 : 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Center(
        child: tile.isJoker
            ? Icon(
                Icons.star,
                color: AppTheme.gold,
                size: 32,
              )
            : Text(
                '${tile.number}',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: tileColor,
                ),
              ),
      ),
    );
  }
}
