# Implementation Plan

This implementation plan breaks down the Rummy Game Platform into discrete, actionable coding tasks. Each task builds incrementally on previous work, with property-based tests integrated throughout to catch bugs early.

## Phase 1: Foundation & Core Infrastructure

- [x] 1. Set up project structure and development environment
  - Initialize monorepo with frontend (React) and backend (Node.js/Express) workspaces
  - Configure TypeScript for both frontend and backend
  - Set up ESLint, Prettier, and Git hooks
  - Configure build tools (Vite for frontend, tsc for backend)
  - Create Docker configuration for local development
  - Set up environment variable management
  - _Requirements: All (foundational)_

- [x] 2. Set up database and data models

- [x] 2.1 Configure PostgreSQL database and connection pooling
  - Set up PostgreSQL with Docker

  - Configure connection pooling with pg library
  - Create database migration system (using node-pg-migrate or similar)
  - _Requirements: All (data storage)_

- [x] 2.2 Implement core data models and schemas
  - Create UserAccount model with password hashing

  - Create PlayerProfile model
  - Create GameState model with all game variants
  - Create Friendship and FriendRequest models
  - Create Transaction and InventoryItem models
  - Create Tournament model
  - _Requirements: 1.1, 2.1, 4.1, 11.1, 12.1_

- [x] 2.3 Write unit tests for data model validation
  - Test UserAccount creation and validation

  - Test password hashing and verification
  - Test model relationships
  - _Requirements: 1.1, 2.1_

- [x] 3. Implement authentication service

- [x] 3.1 Create authentication API endpoints
  - Implement POST /api/auth/register endpoint

  - Implement POST /api/auth/login endpoint
  - Implement POST /api/auth/logout endpoint
  - Implement POST /api/auth/refresh-token endpoint
  - Implement POST /api/auth/reset-password endpoint
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 3.2 Implement JWT token generation and validation
  - Create token generation utility with access and refresh tokens
  - Implement token validation middleware
  - Set up token expiration and refresh logic
  - _Requirements: 1.2_

- [x] 3.3 Implement device fingerprinting and clone detection
  - Create device fingerprint collection on client
  - Implement fingerprint storage and comparison logic
  - Create clone account detection algorithm
  - _Requirements: 1.3_

- [x] 3.4 Write property test for authentication
  - **Property 1: Account Creation Uniqueness**
  - **Validates: Requirements 1.1**

- [x] 3.5 Write property test for authentication round-trip
  - **Property 2: Authentication Round-Trip**
  - **Validates: Requirements 1.2**

- [x] 3.6 Write property test for clone detection
  - **Property 3: Clone Account Detection**
  - **Validates: Requirements 1.3**

- [x] 3.7 Write property test for password security
  - **Property 4: Password Update Security**
  - **Validates: Requirements 1.4**

- [x] 4. Set up Redis for caching and pub/sub
  - Configure Redis connection
  - Implement caching layer for frequently accessed data
  - Set up Redis pub/sub for real-time features
  - Create cache invalidation strategies
  - _Requirements: 3.2, 14.1_

## Phase 2: Game Engine Core

- [x] 5. Implement tile and combination data structures

- [x] 5.1 Create Tile class and utilities
  - Implement Tile interface with number, color, and Joker properties
  - Create tile generation functions
  - Implement tile comparison and equality functions
  - _Requirements: 4.1, 4.4_

- [x] 5.2 Create Combination validation logic
  - Implement Run validation function
  - Implement Set validation function
  - Implement Joker wildcard logic
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.3 Write property test for run validation
  - **Property 11: Run Validation**
  - **Validates: Requirements 5.1**

- [x] 5.4 Write property test for set validation
  - **Property 12: Set Validation**
  - **Validates: Requirements 5.2**

- [x] 5.5 Write property test for invalid combination rejection
  - **Property 14: Invalid Combination Rejection**
  - **Validates: Requirements 5.5**

- [x] 6. Implement game initialization and state management

- [x] 6.1 Create game initialization logic
  - Implement Rummy PRO game initialization (106 tiles)
  - Handle extra Joker purchases (up to 110 tiles)
  - Implement tile shuffling with cryptographically secure RNG
  - Implement tile distribution (14 per player, 15 for starter)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 6.2 Write property test for tile count
  - **Property 9: Game Initialization Tile Count**
  - **Validates: Requirements 4.1, 4.4**

- [ ] 6.3 Write property test for tile distribution
  - **Property 10: Tile Distribution Correctness**
  - **Validates: Requirements 4.3**

- [ ] 6.2 Implement game state management
  - Create GameState class with all properties
  - Implement state transition functions
  - Create state validation functions
  - Implement state serialization for persistence
  - _Requirements: 4.1, 6.1, 20.1_

- [ ] 7. Implement player move handling
- [x] 7.1 Create move validation and application logic
  - Implement draw tile action
  - Implement discard tile action
  - Implement meld combination action
  - Implement Joker replacement action
  - Implement close game action
  - _Requirements: 6.1, 6.2, 6.3, 5.4_

- [x] 7.2 Write property test for tile conservation
  - **Property 15: Tile Conservation During Actions**
  - **Validates: Requirements 6.2, 6.3**

- [x] 7.3 Write property test for turn action exclusivity
  - **Property 16: Turn Action Exclusivity**
  - **Validates: Requirements 6.1**

- [x] 7.4 Write property test for Joker replacement
  - **Property 13: Joker Replacement Correctness**
  - **Validates: Requirements 5.4**

- [ ] 8. Implement win condition checking and scoring
- [x] 8.1 Create win condition validation
  - Implement close validation (all tiles in valid combinations + 1)
  - Verify all combinations are valid before declaring win
  - _Requirements: 7.1, 7.2_

- [x] 8.2 Implement pattern detection
  - Create pattern detection for Clean Finish
  - Create pattern detection for Free Joker
  - Create pattern detection for Monochrome
  - Create pattern detection for Bicolor
  - Create pattern detection for Minor/Major
  - Create pattern detection for Grand Square
  - Create pattern detection for Mozaic
  - _Requirements: 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8.3 Implement scoring calculation
  - Create base scoring logic (250 points)
  - Implement bonus scoring for patterns
  - Calculate points from each player
  - _Requirements: 7.3, 7.4, 7.5, 8.1-8.5_

- [x] 8.4 Write property test for win validation
  - **Property 17: Win Condition Validation**
  - **Validates: Requirements 7.1, 7.2**

- [x] 8.5 Write property test for scoring correctness
  - **Property 18: Win Scoring Correctness**
  - **Validates: Requirements 7.3, 7.4, 7.5**

- [x] 8.6 Write property test for pattern bonuses
  - **Property 19: Pattern Detection and Bonus**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Real-Time Game Service

- [-] 10. Set up WebSocket server with Socket.io
  - Configure Socket.io server with clustering support
  - Implement connection authentication
  - Set up room-based communication
  - Implement heartbeat mechanism for connection health
  - _Requirements: 3.2, 6.1_

- [ ] 11. Implement game room management
- [x] 11.1 Create game room creation and joining logic
  - Implement room creation with game configuration
  - Implement player joining and leaving
  - Handle room capacity limits (2-4 players)
  - Implement room state broadcasting
  - _Requirements: 4.5, 6.1_

- [x] 11.2 Implement turn management
  - Create turn rotation logic
  - Implement turn timer with auto-action on timeout
  - Broadcast turn changes to all players
  - Display visual turn indicator
  - _Requirements: 6.4, 6.5_

- [x] 11.3 Write unit tests for room management
  - Test room creation and player joining
  - Test turn rotation
  - Test timeout handling
  - _Requirements: 4.5, 6.1, 6.4, 6.5_

- [x] 12. Implement real-time game action handling for Remi pe Tablă
  - Create WebSocket event handlers for all player actions
  - Validate moves on server before applying
  - Broadcast game state updates to all players
  - Handle concurrent action attempts
  - Implement private board system (each player sees only their own board)
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 13. Implement game persistence and recovery
- [x] 13.1 Create periodic state persistence
  - Implement auto-save every 30 seconds
  - Store game state in database
  - Create state compression for efficiency
  - _Requirements: 20.1_

- [x] 13.2 Implement disconnection handling
  - Detect player disconnections
  - Auto-arrange disconnected player's tiles
  - Apply disconnection penalties
  - Track repeated disconnections
  - Notify other players of disconnection
  - _Requirements: 14.1, 14.2, 14.3, 14.5_

- [x] 13.3 Implement reconnection and state restoration
  - Allow reconnection within time limit
  - Restore player to exact game state
  - Validate state integrity on restoration
  - Display resume option for unfinished games
  - _Requirements: 14.4, 20.2, 20.3, 20.4, 20.5_

- [ ] 13.4 Write property test for state persistence round-trip
  - **Property 24: Disconnection State Preservation**
  - **Validates: Requirements 14.4, 20.2**

- [ ] 13.5 Write property test for periodic persistence
  - **Property 31: Periodic State Persistence**
  - **Validates: Requirements 20.1**

## Phase 4: Social Features

- [ ] 14. Implement player profile service
- [ ] 14.1 Create profile API endpoints
  - Implement GET /api/profile/:userId endpoint
  - Implement PUT /api/profile endpoint
  - Implement POST /api/profile/avatar endpoint
  - Implement GET /api/profile/search endpoint
  - _Requirements: 2.1, 2.4, 2.5_

- [ ] 14.2 Implement avatar upload and storage
  - Validate image format and size
  - Upload to object storage (S3 or similar)
  - Generate thumbnail versions
  - Associate avatar URL with profile
  - _Requirements: 2.1_

- [ ] 14.3 Write property test for avatar validation
  - **Property 2.1: Image Upload Validation**
  - **Validates: Requirements 2.1**

- [ ] 14.4 Write property test for search completeness
  - **Property 6: Search Result Completeness**
  - **Validates: Requirements 2.5**

- [ ] 15. Implement friend system
- [ ] 15.1 Create friend API endpoints
  - Implement POST /api/friends/request endpoint
  - Implement POST /api/friends/accept endpoint
  - Implement POST /api/friends/reject endpoint
  - Implement GET /api/friends endpoint
  - Implement DELETE /api/friends/:friendId endpoint
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 15.2 Implement friend request notifications
  - Create notification system for friend requests
  - Send real-time notifications via WebSocket
  - Store notifications in database
  - _Requirements: 2.2_

- [ ] 15.3 Write property test for friendship symmetry
  - **Property 5: Friend Relationship Symmetry**
  - **Validates: Requirements 2.3**

- [ ] 16. Implement chat system
- [ ] 16.1 Create chat message handling
  - Implement WebSocket chat message events
  - Broadcast messages to all players at table
  - Store chat history in database
  - Implement message timestamps
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 16.2 Implement content filtering and moderation
  - Create offensive language dictionary
  - Implement message filtering algorithm
  - Log violations to moderation queue
  - Implement automatic warnings for severe violations
  - _Requirements: 3.3, 3.4_

- [ ] 16.3 Write property test for message broadcast
  - **Property 7: Chat Message Broadcast**
  - **Validates: Requirements 3.2**

- [ ] 16.4 Write property test for content filtering
  - **Property 8: Offensive Content Filtering**
  - **Validates: Requirements 3.3, 3.4**

## Phase 5: Game Variants

- [ ] 17. Implement Rummy 45 variant
- [ ] 17.1 Create Rummy 45 game initialization
  - Implement Rummy 45 specific tile distribution
  - Configure Rummy 45 rules engine
  - _Requirements: 9.1_

- [ ] 17.2 Implement Rummy 45 specific rules
  - Implement first meld requirements
  - Implement Rummy 45 scoring logic
  - Implement Rummy 45 win conditions
  - _Requirements: 9.2, 9.3, 9.4_

- [ ] 17.3 Write unit tests for Rummy 45
  - Test first meld validation
  - Test Rummy 45 scoring
  - Test Rummy 45 win conditions
  - _Requirements: 9.2, 9.3, 9.4_

- [ ] 18. Implement Canasta variant
- [ ] 18.1 Create Canasta game initialization
  - Implement Canasta card distribution
  - Configure Canasta rules engine
  - _Requirements: 10.1_

- [ ] 18.2 Implement Canasta specific rules
  - Implement clean vs dirty canasta tracking
  - Implement Canasta card value calculation
  - Implement Canasta closing requirements
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [ ] 18.3 Write property test for Canasta scoring
  - **Property 20: Canasta Scoring Hierarchy**
  - **Validates: Requirements 10.2**

- [ ] 18.4 Write unit tests for Canasta
  - Test canasta type tracking
  - Test card value calculation
  - Test closing validation
  - _Requirements: 10.3, 10.4, 10.5_

## Phase 6: Tournament System

- [ ] 19. Implement tournament service
- [ ] 19.1 Create tournament API endpoints
  - Implement POST /api/tournaments endpoint (admin)
  - Implement GET /api/tournaments endpoint
  - Implement POST /api/tournaments/:id/register endpoint
  - Implement GET /api/tournaments/:id/standings endpoint
  - _Requirements: 11.1, 11.2, 11.4_

- [ ] 19.2 Implement tournament bracket generation
  - Create bracket generation algorithm
  - Implement player seeding logic
  - Create balanced bracket structure
  - _Requirements: 11.3_

- [ ] 19.3 Write property test for bracket fairness
  - **Property 21: Tournament Bracket Fairness**
  - **Validates: Requirements 11.3**

- [ ] 19.3 Implement tournament progression
  - Handle match completion and result recording
  - Update tournament standings
  - Advance winners to next rounds
  - Distribute prizes on completion
  - _Requirements: 11.4, 11.5_

- [ ] 19.4 Write unit tests for tournament system
  - Test registration
  - Test bracket generation
  - Test progression logic
  - Test prize distribution
  - _Requirements: 11.2, 11.3, 11.4, 11.5_

## Phase 7: Shop and Purchases

- [ ] 20. Implement shop service
- [ ] 20.1 Create shop API endpoints
  - Implement GET /api/shop/products endpoint
  - Implement POST /api/shop/purchase endpoint
  - Implement GET /api/shop/inventory endpoint
  - _Requirements: 12.1, 12.2, 12.5_

- [ ] 20.2 Implement purchase processing
  - Create transaction validation
  - Implement atomic inventory update and payment deduction
  - Record transaction as non-refundable
  - Handle payment integration (mock for now)
  - _Requirements: 12.2, 12.3_

- [ ] 20.3 Write property test for transaction atomicity
  - **Property 22: Purchase Transaction Atomicity**
  - **Validates: Requirements 12.2**

- [ ] 20.3 Implement item transfer prevention
  - Validate item ownership on all operations
  - Block transfer attempts between accounts
  - _Requirements: 12.4_

- [ ] 20.4 Write property test for transfer prevention
  - **Property 23: Item Transfer Prevention**
  - **Validates: Requirements 12.4**

- [ ] 20.5 Write unit tests for shop
  - Test product catalog retrieval
  - Test purchase validation
  - Test inventory display
  - _Requirements: 12.1, 12.5_

## Phase 8: Anti-Cheating and Fair Play

- [ ] 21. Implement anti-cheating detection
- [ ] 21.1 Create behavior monitoring system
  - Log all game actions with timestamps
  - Detect impossible move patterns
  - Detect collusion patterns between players
  - Track statistical anomalies in win rates
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 21.2 Implement penalty system
  - Create violation logging
  - Implement warning system
  - Implement temporary ban system
  - Implement permanent ban for repeated violations
  - _Requirements: 13.4, 13.5_

- [ ] 21.3 Write unit tests for detection systems
  - Test stalling detection
  - Test collusion detection
  - Test penalty escalation
  - _Requirements: 13.1, 13.2, 13.5_

## Phase 9: Frontend - Core UI

- [ ] 22. Set up React frontend structure
  - Initialize React app with Vite
  - Configure TypeScript and ESLint
  - Set up Redux Toolkit for state management
  - Configure React Router for navigation
  - Set up TailwindCSS for styling
  - Configure Framer Motion for animations
  - _Requirements: All (UI foundation)_

- [ ] 23. Implement authentication UI
- [ ] 23.1 Create login and registration pages
  - Build registration form with validation
  - Build login form
  - Implement password reset flow
  - Handle authentication errors
  - _Requirements: 1.1, 1.2, 1.4, 18.1_

- [ ] 23.2 Implement session management
  - Store JWT tokens securely
  - Implement auto-refresh logic
  - Handle token expiration
  - Implement logout functionality
  - _Requirements: 1.2_

- [ ] 23.3 Write unit tests for auth components
  - Test form validation
  - Test error handling
  - Test token management
  - _Requirements: 1.1, 1.2_

- [ ] 24. Implement main navigation and layout
  - Create header with logo and navigation
  - Create responsive layout structure
  - Implement navigation menu
  - Create footer with legal links
  - _Requirements: 18.1, 18.2_

- [ ] 25. Implement player profile UI
- [ ] 25.1 Create profile page
  - Display player information and statistics
  - Implement profile editing form
  - Create avatar upload component
  - Display friends list
  - _Requirements: 2.1, 2.4_

- [ ] 25.2 Create player search
  - Build search input with autocomplete
  - Display search results
  - Implement friend request buttons
  - _Requirements: 2.5_

- [ ] 25.3 Write unit tests for profile components
  - Test profile display
  - Test avatar upload
  - Test search functionality
  - _Requirements: 2.1, 2.5_

## Phase 10: Frontend - Game UI

- [ ] 26. Implement game lobby
  - Display available games list
  - Create game creation form
  - Implement game joining
  - Show player count and game type
  - _Requirements: 4.5_

- [ ] 27. Implement game table UI
- [ ] 27.1 Create game table layout
  - Build felt-textured table background
  - Create player areas with avatars and names
  - Implement tile display areas
  - Create stock and discard pile areas
  - _Requirements: 15.1, 16.5_

- [ ] 27.2 Implement tile rendering
  - Create Tile component with modern flat design
  - Implement color-coded tiles
  - Add Joker styling with golden border
  - Implement tile selection states
  - _Requirements: 4.1, 15.1_

- [ ] 27.3 Implement drag and drop
  - Create draggable tile components
  - Implement drop zones for combinations
  - Add snap-to-position behavior
  - Implement visual feedback during drag
  - _Requirements: 16.1, 16.2_

- [ ] 27.4 Write property test for drag detection performance
  - **Property 26: Drag Detection Performance**
  - **Validates: Requirements 16.1**

- [ ] 27.4 Implement combination suggestions
  - Detect valid combinations in hand
  - Display auto-grouping hints
  - Highlight safe discards
  - _Requirements: 16.3, 16.4_

- [ ] 28. Implement game animations
- [ ] 28.1 Create tile animations
  - Implement pickup animation (upward lift)
  - Implement discard animation (slide and bounce)
  - Implement deal animation
  - Implement draw animation
  - _Requirements: 15.2, 15.3_

- [ ] 28.2 Create win animations
  - Implement glowing ring effect
  - Implement tile spread animation
  - Implement Joker sparkle effect
  - Display win pattern name
  - _Requirements: 15.4, 15.5_

- [ ] 28.3 Write property test for animation triggers
  - **Property 25: Animation Trigger Correctness**
  - **Validates: Requirements 15.2, 15.3, 15.4, 15.5**

- [ ] 29. Implement game controls
  - Create action buttons (draw, discard, meld, close)
  - Implement turn timer display
  - Create game menu (settings, rules, exit)
  - Display current player indicator
  - _Requirements: 6.1, 6.4_

- [ ] 30. Implement chat UI
  - Create chat panel with message list
  - Build message input with emoji support
  - Implement auto-hide when not in use
  - Display message timestamps and senders
  - _Requirements: 3.1, 3.5_

## Phase 11: Frontend - Additional Features

- [ ] 31. Implement tournament UI
  - Create tournaments list page
  - Build tournament details page
  - Implement registration button
  - Display bracket visualization
  - Show standings and leaderboard
  - _Requirements: 11.1, 11.2, 11.4_

- [ ] 32. Implement shop UI
  - Create shop page with product grid
  - Build product cards with images and prices
  - Implement purchase confirmation modal
  - Create inventory page
  - Display transaction history
  - _Requirements: 12.1, 12.2, 12.5_

- [ ] 33. Implement audio system
- [ ] 33.1 Create audio manager
  - Load sound effects
  - Implement sound playback with volume control
  - Create mute toggle
  - Prevent audio overlap
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 33.2 Write property test for audio triggers
  - **Property 29: Audio Trigger Correctness**
  - **Validates: Requirements 19.1, 19.2, 19.3**

- [ ] 33.3 Write property test for mute toggle
  - **Property 30: Mute Toggle Effectiveness**
  - **Validates: Requirements 19.4**

- [ ] 34. Implement responsive design
- [ ] 34.1 Create responsive layouts
  - Implement desktop layout
  - Implement mobile layout
  - Implement tablet layout
  - Add media queries for breakpoints
  - _Requirements: 17.1, 17.2, 17.4_

- [ ] 34.2 Implement touch gestures for mobile
  - Add tap handlers
  - Implement drag gestures
  - Add pinch-to-zoom for game table
  - _Requirements: 17.5_

- [ ] 34.3 Write property test for responsive adaptation
  - **Property 27: Responsive Interface Adaptation**
  - **Validates: Requirements 17.1, 17.2, 17.4**

- [ ] 34.4 Write property test for cross-platform sync
  - **Property 28: Cross-Platform Data Synchronization**
  - **Validates: Requirements 17.3**

## Phase 12: Legal and Policies

- [ ] 35. Implement legal pages
  - Create Terms and Conditions page
  - Create Cookie Policy page
  - Create Privacy Policy page
  - Implement cookie consent banner
  - Add no-gambling disclaimer
  - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [ ] 36. Implement policy acceptance flow
  - Require T&C acceptance on registration
  - Implement policy update notifications
  - Require re-acceptance on policy updates
  - _Requirements: 18.1, 18.5_

## Phase 13: Testing and Quality Assurance

- [ ] 37. Write integration tests
  - Test complete game flow from start to finish
  - Test tournament registration and completion
  - Test purchase flow
  - Test friend request flow
  - Test chat message delivery
  - Test disconnection and reconnection
  - _Requirements: All_

- [ ] 38. Perform security testing
  - Test SQL injection prevention
  - Test XSS prevention
  - Test CSRF protection
  - Test authentication bypass attempts
  - Test rate limiting
  - Test clone account detection
  - _Requirements: 1.3, 13.1-13.5_

- [ ] 39. Perform performance testing
  - Load test API endpoints
  - Test WebSocket scalability
  - Measure page load times
  - Test with 1000+ concurrent users
  - Optimize bottlenecks
  - _Requirements: All (performance)_

## Phase 14: Deployment and DevOps

- [ ] 40. Set up CI/CD pipeline
  - Configure GitHub Actions or similar
  - Set up automated testing
  - Configure automated deployment
  - Set up staging environment
  - _Requirements: All (deployment)_

- [ ] 41. Set up production infrastructure
  - Configure load balancer
  - Set up auto-scaling
  - Configure CDN for static assets
  - Set up database replication
  - Configure Redis cluster
  - _Requirements: All (infrastructure)_

- [ ] 42. Set up monitoring and logging
  - Configure application monitoring
  - Set up error tracking (Sentry or similar)
  - Configure centralized logging
  - Set up alerting for critical issues
  - Create monitoring dashboards
  - _Requirements: All (observability)_

- [ ] 43. Final checkpoint - Production readiness
  - Ensure all tests pass
  - Verify security measures
  - Confirm performance targets met
  - Review monitoring and alerting
  - Prepare rollback plan
  - Ask the user if questions arise.
