import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'tile_widget.dart';
import '../theme/app_theme.dart';

class DraggableTile extends StatefulWidget {
  final TileData tile;
  final VoidCallback? onDragStarted;
  final VoidCallback? onDragEnd;
  final Function(TileData)? onTilePlaced;

  const DraggableTile({
    super.key,
    required this.tile,
    this.onDragStarted,
    this.onDragEnd,
    this.onTilePlaced,
  });

  @override
  State<DraggableTile> createState() => _DraggableTileState();
}

class _DraggableTileState extends State<DraggableTile>
    with SingleTickerProviderStateMixin {
  bool _isDragging = false;
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LongPressDraggable<TileData>(
      data: widget.tile,
      feedback: Transform.scale(
        scale: 1.2,
        child: Opacity(
          opacity: 0.8,
          child: TileWidget(tile: widget.tile),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.3,
        child: TileWidget(tile: widget.tile),
      ),
      onDragStarted: () {
        setState(() => _isDragging = true);
        _controller.forward();
        widget.onDragStarted?.call();
      },
      onDragEnd: (_) {
        setState(() => _isDragging = false);
        _controller.reverse();
        widget.onDragEnd?.call();
      },
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _isDragging ? _scaleAnimation.value : 1.0,
            child: GestureDetector(
              onTap: () {
                // Soft upward lift animation on tap
                _controller.forward().then((_) => _controller.reverse());
              },
              child: TileWidget(tile: widget.tile),
            ),
          );
        },
      ),
    );
  }
}

/// Drop zone for tile combinations
class TileDropZone extends StatefulWidget {
  final Function(TileData) onTileDropped;
  final String label;

  const TileDropZone({
    super.key,
    required this.onTileDropped,
    required this.label,
  });

  @override
  State<TileDropZone> createState() => _TileDropZoneState();
}

class _TileDropZoneState extends State<TileDropZone> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    return DragTarget<TileData>(
      onWillAcceptWithDetails: (details) {
        setState(() => _isHovering = true);
        return true;
      },
      onLeave: (_) {
        setState(() => _isHovering = false);
      },
      onAcceptWithDetails: (details) {
        setState(() => _isHovering = false);
        widget.onTileDropped(details.data);
      },
      builder: (context, candidateData, rejectedData) {
        return AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _isHovering
                ? AppTheme.teal.withOpacity(0.2)
                : Colors.white.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _isHovering ? AppTheme.teal : Colors.white30,
              width: 2,
            ),
          ),
          child: Center(
            child: Text(
              widget.label,
              style: TextStyle(
                color: _isHovering ? AppTheme.teal : Colors.white70,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        );
      },
    );
  }
}
