# Requirements Document

## Introduction

This document specifies the requirements for a modern online Rummy game platform similar to Remi-Online.ro. The platform will provide multiple Rummy game variants (Rummy PRO/Board, Rummy 45, and Canasta), social features, tournament systems, and in-game purchases. The platform will be accessible via web browsers and mobile applications, featuring a modern, clean UI with smooth animations and a calm aesthetic.

## Glossary

- **Game Platform**: The complete web and mobile application system that hosts Rummy games
- **Rummy PRO**: Also known as Rummy on Board, played with 106-110 tiles
- **Rummy 45**: Also known as Etalat, a variant with different melding and scoring rules
- **Canasta**: A card-based game variant with clean/dirty canasta rules
- **Tile**: A game piece with a number (1-13) and color (red, yellow, blue, black)
- **Joker**: A special tile that can replace any other tile in combinations
- **Run**: A valid combination of 3+ consecutive numbers in the same color
- **Set**: A valid combination of 3-4 tiles with the same number in different colors
- **Meld**: The act of placing valid combinations on the game table
- **Close**: Winning the game by arranging all tiles into valid combinations with one tile remaining
- **User Account**: A registered player profile with authentication credentials
- **Tournament**: A scheduled competitive event with multiple players
- **Premium Feature**: Purchasable in-game enhancements or items
- **Game Table**: The virtual playing area where tiles are arranged
- **Player Profile**: User information including avatar, statistics, and friends list
- **Chat System**: Real-time messaging functionality at game tables
- **Clone Account**: A forbidden duplicate account created by the same user

## Requirements

### Requirement 1: User Authentication and Account Management

**User Story:** As a player, I want to create and manage my account securely, so that I can access the platform and maintain my game progress.

#### Acceptance Criteria

1. WHEN a new user provides valid registration information THEN the Game Platform SHALL create a unique User Account with encrypted credentials
2. WHEN a user attempts to log in with valid credentials THEN the Game Platform SHALL authenticate the user and grant access to platform features
3. WHEN a user attempts to create multiple accounts from the same device or IP pattern THEN the Game Platform SHALL detect the suspicious behavior and prevent Clone Account creation
4. WHEN a user updates their password THEN the Game Platform SHALL require current password verification and encrypt the new password
5. WHEN suspicious account activity is detected THEN the Game Platform SHALL flag the User Account for review and may suspend access

### Requirement 2: Player Profile and Social Features

**User Story:** As a player, I want to customize my profile and connect with other players, so that I can build a social gaming experience.

#### Acceptance Criteria

1. WHEN a user uploads a profile picture THEN the Game Platform SHALL validate the image format and size, and store it associated with the Player Profile
2. WHEN a user sends a friend request to another player THEN the Game Platform SHALL create a pending friend connection and notify the recipient
3. WHEN a user accepts a friend request THEN the Game Platform SHALL establish a bidirectional friend relationship between the two Player Profiles
4. WHEN a user views their friends list THEN the Game Platform SHALL display all connected players with their online status and recent activity
5. WHEN a user searches for other players THEN the Game Platform SHALL return matching Player Profiles based on username or profile information

### Requirement 3: Game Table and Real-Time Chat

**User Story:** As a player, I want to communicate with other players at my game table, so that I can have social interaction during gameplay.

#### Acceptance Criteria

1. WHEN a player joins a Game Table THEN the Game Platform SHALL enable the Chat System for that player with access to table-specific messages
2. WHEN a player sends a chat message THEN the Game Platform SHALL broadcast the message to all players at the same Game Table within 500 milliseconds
3. WHEN a player sends a message containing offensive language THEN the Game Platform SHALL filter or block the message and log the violation
4. WHEN a player uses racist, xenophobic, or sexually explicit language THEN the Game Platform SHALL issue a warning and may suspend the User Account
5. WHEN a player views chat history THEN the Game Platform SHALL display messages with timestamps and sender identification

### Requirement 4: Rummy PRO Game Setup and Initialization

**User Story:** As a player, I want to start a Rummy PRO game with proper tile distribution, so that I can play according to standard rules.

#### Acceptance Criteria

1. WHEN a Rummy PRO game starts THEN the Game Platform SHALL initialize the game with 106 tiles (104 numbered tiles plus 2 Jokers)
2. WHEN a player owns extra Jokers THEN the Game Platform SHALL include up to 6 total Jokers in the game (4 additional purchased Jokers)
3. WHEN tiles are distributed at game start THEN the Game Platform SHALL deal 14 tiles to each player and 15 tiles to the starting player
4. WHEN the game initializes THEN the Game Platform SHALL ensure each numbered tile (1-13 in each of 4 colors) appears exactly twice
5. WHEN 2-4 players join a game THEN the Game Platform SHALL allow the game to start with the specified number of players

### Requirement 5: Tile Combinations and Validation

**User Story:** As a player, I want the system to validate my tile combinations, so that I can ensure my moves follow game rules.

#### Acceptance Criteria

1. WHEN a player creates a Run THEN the Game Platform SHALL verify that it contains 3 or more consecutive numbers in the same color
2. WHEN a player creates a Set THEN the Game Platform SHALL verify that it contains 3 or 4 tiles with the same number in different colors
3. WHEN a player uses a Joker in a combination THEN the Game Platform SHALL allow the Joker to represent any missing tile in that combination
4. WHEN a player has the exact tile that a Joker represents THEN the Game Platform SHALL allow the player to replace the Joker and take it into their hand
5. WHEN a player attempts an invalid combination THEN the Game Platform SHALL reject the placement and return tiles to the player's hand

### Requirement 6: Game Turn Management

**User Story:** As a player, I want clear turn-based gameplay, so that I know when to act and what actions are available.

#### Acceptance Criteria

1. WHEN it is a player's turn THEN the Game Platform SHALL allow exactly one action: draw a tile OR discard a tile
2. WHEN a player draws a tile THEN the Game Platform SHALL remove the tile from the stock or discard pile and add it to the player's hand
3. WHEN a player discards a tile THEN the Game Platform SHALL remove the tile from the player's hand and place it in the discard pile
4. WHEN a player's turn begins THEN the Game Platform SHALL display a visual indicator (timer ring) around that player's area
5. WHEN a player exceeds the turn time limit THEN the Game Platform SHALL automatically perform a default action and pass the turn

### Requirement 7: Winning Conditions and Game Closure

**User Story:** As a player, I want to win the game by completing valid combinations, so that I can achieve victory and earn points.

#### Acceptance Criteria

1. WHEN a player arranges all 14 tiles into valid combinations with one tile remaining THEN the Game Platform SHALL allow the player to Close the game
2. WHEN a player Closes the game THEN the Game Platform SHALL verify all combinations are valid before declaring victory
3. WHEN a player wins with a Clean Finish (no Joker used) THEN the Game Platform SHALL award bonus points (350-400 points from each player)
4. WHEN a player wins with a Free Joker in hand THEN the Game Platform SHALL award maximum bonus points (500 points from each player)
5. WHEN a player wins normally THEN the Game Platform SHALL award standard points (250 points from each player)

### Requirement 8: Special Winning Patterns and Scoring

**User Story:** As a player, I want to earn bonus points for special winning patterns, so that I can maximize my score through skillful play.

#### Acceptance Criteria

1. WHEN a player wins with a Monochrome pattern (all tiles in one color) THEN the Game Platform SHALL award bonus points between 500-1000
2. WHEN a player wins with a Bicolor pattern (only 2 colors used) THEN the Game Platform SHALL award 250 bonus points
3. WHEN a player wins with a Minor pattern (all tiles below 7) OR Major pattern (all tiles above 7) THEN the Game Platform SHALL award 150 bonus points
4. WHEN a player wins with a Grand Square pattern THEN the Game Platform SHALL award 800 bonus points
5. WHEN a player wins with a Mozaic pattern THEN the Game Platform SHALL award pattern-specific bonus points

### Requirement 9: Rummy 45 Game Variant

**User Story:** As a player, I want to play Rummy 45 with its specific rules, so that I can enjoy different game variants.

#### Acceptance Criteria

1. WHEN a Rummy 45 game starts THEN the Game Platform SHALL initialize the game with Rummy 45 specific tile distribution and rules
2. WHEN a player melds for the first time in Rummy 45 THEN the Game Platform SHALL enforce the initial melding requirements specific to Rummy 45
3. WHEN scoring occurs in Rummy 45 THEN the Game Platform SHALL calculate points using Rummy 45 scoring rules
4. WHEN a player wins in Rummy 45 THEN the Game Platform SHALL apply Rummy 45 victory conditions and point awards
5. WHEN a player views game rules THEN the Game Platform SHALL display Rummy 45 specific rules and differences from Rummy PRO

### Requirement 10: Canasta Game Variant

**User Story:** As a player, I want to play Canasta with its unique rules, so that I can experience different card game mechanics.

#### Acceptance Criteria

1. WHEN a Canasta game starts THEN the Game Platform SHALL initialize the game with Canasta-specific card distribution
2. WHEN a player creates a clean canasta THEN the Game Platform SHALL award higher points than a dirty canasta
3. WHEN a player creates a dirty canasta THEN the Game Platform SHALL track it separately from clean canastas for scoring
4. WHEN scoring occurs in Canasta THEN the Game Platform SHALL calculate card values according to Canasta rules
5. WHEN a player closes in Canasta THEN the Game Platform SHALL verify Canasta-specific closing requirements

### Requirement 11: Tournament System

**User Story:** As a player, I want to participate in daily tournaments, so that I can compete for rankings and prizes.

#### Acceptance Criteria

1. WHEN a tournament is scheduled THEN the Game Platform SHALL display the tournament in the tournaments list with start time and entry requirements
2. WHEN a player registers for a tournament THEN the Game Platform SHALL add the player to the tournament participant list
3. WHEN a tournament starts THEN the Game Platform SHALL create game tables and assign players according to tournament bracket rules
4. WHEN tournament matches complete THEN the Game Platform SHALL update tournament standings and advance winners to next rounds
5. WHEN a tournament concludes THEN the Game Platform SHALL award prizes or rankings to top-performing players

### Requirement 12: In-Game Shop and Purchases

**User Story:** As a player, I want to purchase premium features and items, so that I can enhance my gameplay experience.

#### Acceptance Criteria

1. WHEN a player views the shop THEN the Game Platform SHALL display available Premium Features including extra Jokers and in-game items
2. WHEN a player purchases extra Joker pieces THEN the Game Platform SHALL add the Jokers to the player's inventory and deduct payment
3. WHEN a player completes a purchase THEN the Game Platform SHALL record the transaction as non-refundable
4. WHEN a player attempts to transfer purchased items to another account THEN the Game Platform SHALL prevent the transfer
5. WHEN a player views their inventory THEN the Game Platform SHALL display all owned Premium Features and items

### Requirement 13: Fair Play and Anti-Cheating

**User Story:** As a player, I want a fair gaming environment, so that all players compete on equal terms.

#### Acceptance Criteria

1. WHEN the system detects a player helping another player unfairly THEN the Game Platform SHALL log the behavior and may issue penalties
2. WHEN a player intentionally delays turns to disrupt gameplay THEN the Game Platform SHALL detect the stalling pattern and issue warnings
3. WHEN a player exploits bugs or glitches THEN the Game Platform SHALL log the abuse and may suspend the User Account
4. WHEN a player is reported for cheating THEN the Game Platform SHALL review the evidence and apply appropriate sanctions
5. WHEN repeated violations occur THEN the Game Platform SHALL escalate penalties up to permanent account ban

### Requirement 14: Disconnection Handling

**User Story:** As a player, I want the system to handle disconnections gracefully, so that games can continue fairly when connection issues occur.

#### Acceptance Criteria

1. WHEN a player disconnects during a game THEN the Game Platform SHALL automatically arrange the player's tiles and continue the game
2. WHEN a player disconnects THEN the Game Platform SHALL apply scoring penalties based on the current game state
3. WHEN a player repeatedly disconnects THEN the Game Platform SHALL track the pattern and may issue temporary bans
4. WHEN a player reconnects within the time limit THEN the Game Platform SHALL restore the player to their game table
5. WHEN a disconnection is detected THEN the Game Platform SHALL notify other players at the Game Table

### Requirement 15: Modern UI and Animations

**User Story:** As a player, I want a beautiful, modern interface with smooth animations, so that I have an enjoyable visual experience.

#### Acceptance Criteria

1. WHEN the game page loads THEN the Game Platform SHALL display a clean layout with bright colors, soft shadows, and rounded corners
2. WHEN a player picks up a tile THEN the Game Platform SHALL animate the tile with a soft upward lift effect
3. WHEN a player discards a tile THEN the Game Platform SHALL animate the tile with a quick slide and bounce effect
4. WHEN a player wins THEN the Game Platform SHALL display a glowing ring animation with tile spread effect
5. WHEN a Joker is replaced THEN the Game Platform SHALL display a sparkle effect animation

### Requirement 16: Responsive Game Table UI

**User Story:** As a player, I want an intuitive game table interface, so that I can easily interact with tiles and make moves.

#### Acceptance Criteria

1. WHEN a player drags a tile THEN the Game Platform SHALL detect the drag action within 50 milliseconds and provide visual feedback
2. WHEN a tile is near a valid position THEN the Game Platform SHALL display snap-to-position behavior with visual highlighting
3. WHEN tiles can form valid combinations THEN the Game Platform SHALL suggest auto-grouping with subtle visual hints
4. WHEN a player hovers over a tile to discard THEN the Game Platform SHALL highlight whether the discard is safe
5. WHEN it is a player's turn THEN the Game Platform SHALL display a timer ring around that player's avatar

### Requirement 17: Multi-Platform Support

**User Story:** As a player, I want to play on different devices, so that I can access the game from my computer or mobile device.

#### Acceptance Criteria

1. WHEN a player accesses the platform from a web browser THEN the Game Platform SHALL render a responsive desktop interface
2. WHEN a player accesses the platform from a mobile device THEN the Game Platform SHALL render a touch-optimized mobile interface
3. WHEN a player switches devices THEN the Game Platform SHALL synchronize account data and game state across platforms
4. WHEN a player uses a tablet THEN the Game Platform SHALL adapt the UI layout for tablet screen dimensions
5. WHEN a player uses touch gestures on mobile THEN the Game Platform SHALL respond to tap, drag, and pinch interactions

### Requirement 18: Legal Compliance and Policies

**User Story:** As a platform operator, I want to enforce legal policies and terms, so that the platform operates within legal boundaries.

#### Acceptance Criteria

1. WHEN a user registers THEN the Game Platform SHALL require acceptance of Terms and Conditions
2. WHEN a user accesses the platform THEN the Game Platform SHALL display cookie policy information and obtain consent
3. WHEN the platform displays advertisements THEN the Game Platform SHALL use cookies for functionality and advertising as disclosed
4. WHEN a user inquires about gambling THEN the Game Platform SHALL clearly state that no real-money betting occurs
5. WHEN legal policies are updated THEN the Game Platform SHALL notify users and require re-acceptance of updated terms

### Requirement 19: Audio and Sound Effects

**User Story:** As a player, I want subtle sound effects, so that I receive audio feedback without distraction.

#### Acceptance Criteria

1. WHEN a player clicks a tile THEN the Game Platform SHALL play a soft click sound at low volume
2. WHEN a Joker is played or replaced THEN the Game Platform SHALL play a light "ting" sound effect
3. WHEN a player wins THEN the Game Platform SHALL play a low-volume victory chime
4. WHEN a player toggles the mute button THEN the Game Platform SHALL disable all sound effects
5. WHEN sound effects play THEN the Game Platform SHALL ensure they do not overlap or create audio clutter

### Requirement 20: Game State Persistence

**User Story:** As a player, I want my game progress to be saved, so that I can resume games after disconnection or closing the app.

#### Acceptance Criteria

1. WHEN a game is in progress THEN the Game Platform SHALL persist the complete game state to storage every 30 seconds
2. WHEN a player disconnects and reconnects THEN the Game Platform SHALL restore the player to the exact game state
3. WHEN a player closes the browser or app THEN the Game Platform SHALL save the current game state
4. WHEN a player returns to an unfinished game THEN the Game Platform SHALL display an option to resume the game
5. WHEN game state is restored THEN the Game Platform SHALL verify data integrity before resuming gameplay
