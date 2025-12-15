import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../theme/app_theme.dart';
import '../widgets/tile_widget.dart';
import '../widgets/draggable_tile.dart';
import '../bloc/online_game_bloc.dart';
import '../models/game_state.dart' as models;

class GameTableScreen extends StatefulWidget {
  final String gameMode;

  const GameTableScreen({
    super.key,
    required this.gameMode,
  });

  @override
  State<GameTableScreen> createState() => _GameTableScreenState();
}

class _GameTableScreenState extends State<GameTableScreen> {
  @override
  void initState() {
    super.initState();
    // Connect to backend and create/join game
    final bloc = context.read<OnlineGameBloc>();
    
    // Try to connect
    bloc.add(ConnectToServer('ws://localhost:3000'));
    
    // Wait for connection, then create game
    Future.delayed(const Duration(seconds: 2), () {
      if (bloc.state.status == models.GameStatus.connected) {
        bloc.add(CreateOnlineGame('remi_pe_tabla', 4));
      } else {
        // Show error message
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to connect to game server. Make sure backend is running on port 3000.'),
              duration: Duration(seconds: 5),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    });
  }

  void _handleTileDropped(TileData tile) {
    // Send to backend
    context.read<OnlineGameBloc>().add(PlaceOnlineTiles([tile]));
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Tile ${tile.isJoker ? "Joker" : tile.number} placed on board'),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  void _handleDrawTile(String source) {
    context.read<OnlineGameBloc>().add(DrawOnlineTile(source));
  }

  void _handleDiscardTile(TileData tile) {
    context.read<OnlineGameBloc>().add(DiscardOnlineTile(tile));
  }

  void _handleClose() {
    context.read<OnlineGameBloc>().add(CloseOnlineGame());
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OnlineGameBloc, models.GameState>(
      builder: (context, gameState) {
        return Scaffold(
          body: _buildGameBody(context, gameState),
        );
      },
    );
  }

  Widget _buildGameBody(BuildContext context, models.GameState gameState) {
    return Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppTheme.teal.withOpacity(0.2),
              AppTheme.teal.withOpacity(0.4),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              _buildHeader(),
              
              // Game Table
              Expanded(
                child: Container(
                  margin: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0f766e),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Opponent Area
                      _buildOpponentArea(),
                      
                      // Center Table
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            children: [
                              // Stock and Discard Piles
                              _buildStockPile(),
                              const SizedBox(height: 16),
                              
                              // Private Board Area (Drop Zone)
                              Expanded(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.05),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: Colors.white30,
                                      width: 2,
                                    ),
                                  ),
                                  child: gameState.privateBoard.isEmpty
                                      ? TileDropZone(
                                          onTileDropped: _handleTileDropped,
                                          label: 'Drag tiles here to arrange combinations',
                                        )
                                      : _buildPrivateBoard(gameState),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      // Player Hand
                      _buildPlayerHand(gameState),
                    ],
                  ),
                ),
              ),
              
              // Action Buttons
              _buildActionButtons(gameState),
            ],
          ),
        ),
      );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back),
            style: IconButton.styleFrom(
              backgroundColor: Colors.white,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.gameMode,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Text(
                  'Your turn',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.gold,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              children: [
                Icon(Icons.stars, size: 16, color: Colors.white),
                SizedBox(width: 4),
                Text(
                  '250',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOpponentArea() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildPlayerAvatar('Player 2', 14),
          _buildPlayerAvatar('Player 3', 14),
        ],
      ),
    );
  }

  Widget _buildPlayerAvatar(String name, int tileCount) {
    return Column(
      children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: AppTheme.gold, width: 2),
          ),
          child: const Icon(Icons.person, color: AppTheme.teal),
        ),
        const SizedBox(height: 8),
        Text(
          name,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          '$tileCount tiles',
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 10,
          ),
        ),
      ],
    );
  }

  Widget _buildStockPile() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Stock
        Container(
          width: 60,
          height: 85,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Center(
            child: Icon(Icons.layers, color: AppTheme.teal, size: 32),
          ),
        ),
        const SizedBox(width: 24),
        // Discard
        Container(
          width: 60,
          height: 85,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white30, width: 2),
          ),
          child: const Center(
            child: Text(
              'Discard',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 10,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPlayerHand(models.GameState gameState) {
    final playerHand = gameState.playerHand;
    
    if (playerHand.isEmpty) {
      return Container(
        height: 140,
        padding: const EdgeInsets.all(16),
        child: const Center(
          child: Text(
            'Waiting for game to start...',
            style: TextStyle(color: Colors.white70),
          ),
        ),
      );
    }
    
    return Container(
      height: 140,
      padding: const EdgeInsets.all(16),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: playerHand.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: DraggableTile(
              tile: playerHand[index],
              onDragStarted: () {
                print('Started dragging tile: ${playerHand[index].number}');
              },
              onDragEnd: () {
                print('Stopped dragging tile: ${playerHand[index].number}');
              },
              onTilePlaced: (tile) {
                print('Tile placed: ${tile.number}');
              },
            )
                .animate()
                .fadeIn(delay: (index * 50).ms)
                .slideY(begin: 0.5, end: 0),
          );
        },
      ),
    );
  }

  Widget _buildPrivateBoard(models.GameState gameState) {
    return DragTarget<TileData>(
      onWillAcceptWithDetails: (details) => true,
      onAcceptWithDetails: (details) {
        _handleTileDropped(details.data);
      },
      builder: (context, candidateData, rejectedData) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: gameState.privateBoard.expand((combination) {
              return combination.map((tile) => TileWidget(tile: tile));
            }).toList(),
          ),
        );
      },
    );
  }

  Widget _buildActionButtons(models.GameState gameState) {
    final isMyTurn = gameState.isMyTurn;
    final canDraw = isMyTurn && gameState.status == models.GameStatus.playing;
    
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: canDraw ? () => _handleDrawTile('stock') : null,
              icon: const Icon(Icons.download),
              label: const Text('Draw'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppTheme.teal,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: isMyTurn && gameState.playerHand.isNotEmpty
                  ? () {
                      // Show tile selector dialog
                      _showDiscardDialog(gameState);
                    }
                  : null,
              icon: const Icon(Icons.upload),
              label: const Text('Discard'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: isMyTurn ? _handleClose : null,
              icon: const Icon(Icons.check_circle),
              label: const Text('Close'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.gold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showDiscardDialog(models.GameState gameState) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select tile to discard'),
        content: SizedBox(
          width: double.maxFinite,
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: gameState.playerHand.map((tile) {
              return GestureDetector(
                onTap: () {
                  Navigator.pop(context);
                  _handleDiscardTile(tile);
                },
                child: TileWidget(tile: tile),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}
