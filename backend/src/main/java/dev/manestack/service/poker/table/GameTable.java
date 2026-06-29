package dev.manestack.service.poker.table;

import com.fasterxml.jackson.annotation.JsonIgnore;

import dev.manestack.jooq.generated.tables.records.PokerTableRecord;
import dev.manestack.service.GameService;
import dev.manestack.service.UserService;
import dev.manestack.service.poker.card.GameCard;
import dev.manestack.service.poker.card.GameHand;
import dev.manestack.service.poker.card.GameVariant;
import dev.manestack.service.socket.WebsocketEvent;
import dev.manestack.service.socket.WebsocketSession;
import dev.manestack.service.user.User;
import dev.manestack.service.user.UserBalance;
import io.smallrye.mutiny.Uni;
import io.vertx.core.json.JsonObject;
import org.jboss.logging.Logger;
import io.vertx.core.json.JsonArray;
import dev.manestack.service.poker.table.GameSession.ActionType; 
import jakarta.enterprise.context.Dependent;
import jakarta.inject.Inject;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
@Dependent
public class GameTable {
    private static final Logger LOG = Logger.getLogger(GameTable.class);
    private Long tableId;
    private String tableName;
    private Integer maxPlayers;
    private Integer bigBlind;
    private Integer smallBlind;
    private Integer minBuyIn;
    private Integer maxBuyIn;
    private OffsetDateTime createdAt;
    private Integer createdBy;
    private GameSession currentGameSession = null;
    private Integer currentDealer = 0;
    private final Map<Integer, GamePlayer> seats = new ConcurrentHashMap<>();
    @JsonIgnore
    private final Map<String, WebsocketSession> involvedSessions = new ConcurrentHashMap<>();
    private String variant = GameVariant.TEXAS.name();
    private String secureId;
    private double rakePercent = 0.01;
    private int totalRakeCollected = 0; 
    private static final Integer TIMEOUT_SECONDS = 30;
    private static final int BOTS_ALONE_KICK_SECONDS = 180; // 3 minutes
    private LocalDateTime botsAloneStartTime = null;
    
    @Inject
    GameService gameService;

    @Inject
    UserService userService;

    @Inject
    PlayerRoundService playerRoundService;

    @Inject
    BettingService bettingService;

    @Inject
    PlayerStateService playerStateService;

    @Inject
    PokerScoreService pokerScoreService;

    public void validateCreate() {
        if (tableName == null || tableName.isEmpty()) {
            throw new IllegalArgumentException("Table name cannot be null or empty");
        }
        if (maxPlayers == null || maxPlayers <= 0) {
            throw new IllegalArgumentException("Max players must be greater than 0");
        }
        if (bigBlind == null || bigBlind <= 0) {
            throw new IllegalArgumentException("Big blind must be greater than 0");
        }
        if (smallBlind == null || smallBlind <= 0) {
            throw new IllegalArgumentException("Small blind must be greater than 0");
        }
        if (minBuyIn == null || minBuyIn <= 0) {
            throw new IllegalArgumentException("Min buy-in must be greater than 0");
        }
        if (maxBuyIn == null || maxBuyIn <= 0) {
            throw new IllegalArgumentException("Max buy-in must be greater than 0");
        }
    }

    public void connectToServer(GameService gameService, UserService userService) {
        if (this.gameService == null) this.gameService = gameService;
        if (this.userService == null) this.userService = userService;
    }

    public Uni<Void> takeSeat(int seatNumber, GamePlayer gamePlayer, WebsocketSession session, boolean isBot) {
        // Check if the seat is already taken
        if (seats.containsKey(seatNumber)) {
            throw new IllegalArgumentException("Seat " + seatNumber + " is already taken");
        }

        int userId = gamePlayer.getUser().getUserId();
        boolean isAdminOrBot = gamePlayer.getUser().getRole() == User.Role.ADMIN
                                || gamePlayer.getUser().getRole() == User.Role.BOT;

        // Check if the player is already seated
        boolean alreadySeated = seats.values().stream()
                .filter(Objects::nonNull)
                .anyMatch(player -> player.getUser().getUserId() == userId);

        if (!isAdminOrBot && alreadySeated) {
            throw new IllegalArgumentException("Player is already seated at this table");
        }

        // Assign the seat
        seats.put(seatNumber, gamePlayer);
        gamePlayer.setBot(isBot);
        gamePlayer.setSeatId(seatNumber);
        gamePlayer.setTimeoutActed(false);
        gamePlayer.setDisconnected(false);
        gamePlayer.setSittingOut(false);
        gamePlayer.setSeatedAt(System.currentTimeMillis());
        // Add session if present
        if (session != null) {
            involvedSessions.put(session.getId(), session);
        }

        // Notify all participants
        sendTableUpdateToParticipants(
            "TAKE_SEAT",
            currentGameSession != null ? currentGameSession.getCommunityCards() : List.of()
        );

        // Auto-start game if enough players
        if (currentGameSession == null) {
            long activePlayers = seats.values().stream()
                    .filter(Objects::nonNull)
                    .filter(p -> p.getStack() > 0)
                    .count();
            if (activePlayers >= 2) startGame();
        }

        return Uni.createFrom().voidItem();
    }


    public void subscribe(WebsocketSession session, boolean isRejoin) {
        involvedSessions.put(session.getId(), session);
        session.setTable(this);

        GamePlayer thisPlayer = seats.values().stream()
                .filter(player -> player != null && player.getUser().getUserId() == session.getUser().getUserId())
                .findFirst()
                .orElse(null);

        if (thisPlayer != null && isRejoin) {
            thisPlayer.setDisconnected(false);
            thisPlayer.setTimeoutActed(false);
            thisPlayer.setSittingOut(false);
        }

        if (gameService == null) {
            LOG.infov("⚠ GameTable.subscribe(): gameService is NULL for tableId {0}", tableId);
            return;
        }

        gameService.sendWebsocketEvent(new WebsocketEvent(
                session.getId(),
                "TABLE",
                new JsonObject()
                        .put("action", "SUBSCRIBE")
                        .put("tableId", tableId)
                        .put("table", this)
                        .put("session", createSessionData(thisPlayer, currentGameSession != null ? currentGameSession.getCommunityCards() : List.of()))
        ));

        if (thisPlayer != null) {
            sendTableUpdateToParticipants("RECONNECT", currentGameSession != null ? currentGameSession.getCommunityCards() : List.of());
            startGame();
        }
    }

    public JsonObject createSessionData(GamePlayer thisPlayer, List<GameCard> communityCards) {
        JsonObject sessionData = new JsonObject();

        boolean isAdmin = thisPlayer != null && User.Role.ADMIN.equals(thisPlayer.getUser().getRole());

        if (currentGameSession != null) {
            GamePlayer current = currentGameSession.getCurrentPlayer();
            sessionData.put("turnPlayer", currentGameSession.getCurrentPlayer() != null ? currentGameSession.getCurrentPlayer().getUser() : null);
            sessionData.put("turnPlayerSeat", current != null ? current.getSeatId() : null);
            sessionData.put("currentBets", currentGameSession.getPlayerBets());
            sessionData.put("state", currentGameSession.getState().name());
            sessionData.put("communityCards", communityCards);
            sessionData.put("currentPlayerSeat", current != null ? current.getSeatId() : null);
            sessionData.put("bigBlindSeatIndex", currentGameSession.getBigBlindSeatIndex());
            sessionData.put("smallBlindSeatIndex", currentGameSession.getSmallBlindSeatIndex());
            sessionData.put("dealerSeatIndex", currentGameSession.getDealerSeatIndex());
            sessionData.put("gameVariant", this.variant);
            sessionData.put("turnStartTime", current != null && current.getTurnStartDate() != null 
                ? current.getTurnStartDate().toString() 
                : null
            );
        }

        Map<Integer, JsonObject> serializedPlayersMap = new HashMap<>();
        if (currentGameSession != null) {
            for (GamePlayer player : currentGameSession.getOriginalPlayerList()) {
                serializedPlayersMap.put(player.getSeatId(), serializePlayer(player, thisPlayer));
            }
        }

        JsonObject seatsData = new JsonObject();
        Map<Integer, List<GameCard>> hiddenHoleCards = new HashMap<>();
        int numHoleCards = "OMAHA".equals(this.variant) ? 4 : 2;

      
        for (Map.Entry<Integer, GamePlayer> entry : seats.entrySet()) {
            GamePlayer gamePlayer = entry.getValue();
            if (gamePlayer != null) {
                if (gamePlayer.isInHand() && !gamePlayer.getHoleCards().isEmpty()) {
                    if (isAdmin || gamePlayer.isRevealApproved()) {
                        hiddenHoleCards.put(entry.getKey(), gamePlayer.getHoleCards());
                    } else if (!gamePlayer.isSittingOut()) {
                        List<GameCard> hiddenCards = new ArrayList<>();
                            for (int j = 0; j < numHoleCards; j++) {
                            hiddenCards.add(new GameCard(true));
                        }
                        hiddenHoleCards.put(entry.getKey(), hiddenCards);
                    }
                }

                // Kick countdown: shown for busted (0 chips), disconnected, or sitting-out players.
                Integer kickCountdownSeconds = null;
                if (gamePlayer.getStack() <= 0
                        && gamePlayer.getZeroStackStartDate() != null
                        && (!gamePlayer.isBot() || gamePlayer.getBotRecharges() >= 3)) {
                    long elapsed = ChronoUnit.SECONDS.between(
                            gamePlayer.getZeroStackStartDate(), LocalDateTime.now());
                    kickCountdownSeconds = (int) Math.max(0, 300 - elapsed);
                } else if (!gamePlayer.isBot() && gamePlayer.isDisconnected()
                        && gamePlayer.getDisconnectedAt() != null) {
                    long elapsed = ChronoUnit.SECONDS.between(
                            gamePlayer.getDisconnectedAt(), LocalDateTime.now());
                    kickCountdownSeconds = (int) Math.max(0, 300 - elapsed);
                } else if (!gamePlayer.isBot() && gamePlayer.isSittingOut()
                        && gamePlayer.getSitOutStartDate() != null) {
                    long elapsed = ChronoUnit.SECONDS.between(
                            gamePlayer.getSitOutStartDate(), LocalDateTime.now());
                    kickCountdownSeconds = (int) Math.max(0, 300 - elapsed);
                }

                JsonObject seatInfo = new JsonObject()
                        .put("stack", gamePlayer.getStack())
                        .put("isFolded", gamePlayer.isFolded())
                        .put("isSittingOut", gamePlayer.isSittingOut())
                        .put("isDisconnected", gamePlayer.isDisconnected())
                        .put("kickCountdownSeconds", kickCountdownSeconds);

                seatsData.put(entry.getKey().toString(), seatInfo);
            }
        }

        Map<Integer, List<GameCard>> personalCards = new HashMap<>(hiddenHoleCards);
        if (thisPlayer != null && thisPlayer.isInHand() && !thisPlayer.isSittingOut()) {
            personalCards.put(thisPlayer.getSeatId(), thisPlayer.getHoleCards());
        }

        sessionData.put("holeCards", personalCards);
        sessionData.put("seats", seatsData);

        if (serializedPlayersMap.size() > 0) {
            JsonObject playersJson = new JsonObject();
            serializedPlayersMap.forEach((seatId, json) -> playersJson.put(seatId.toString(), json));
            sessionData.put("players", playersJson);
        }

        if (isAdmin && currentGameSession != null) {
            sessionData.put("destinedCommunityCards", currentGameSession.getDestinedCommunityCardList());
        }

        return sessionData;
    }

    public void notifyPlayerRecharge(Integer userId, int amount) {
        GamePlayer gamePlayer = seats.values().stream()
                .filter(player -> player != null && player.getUser().getUserId() == userId)
                .findFirst()
                .orElse(null);

        if (gamePlayer == null) return;

        // The user's lockedAmount is debited immediately on the server
        // (BUY_IN/RECHARGE outcome record), so refresh their balance now.
        userService.fetchUserBalance(userId)
                .subscribe().with(userBalance -> gameService.notifyBalanceUpdate(userId, userBalance));

        // If the player is currently in a hand, real-poker rules say the
        // new chips can't enter play until the hand ends. Hold them in
        // pendingRecharge and let startNextGame() merge them into the
        // stack between hands.
        JsonObject rechargeMeta = new JsonObject()
                .put("rechargeUserId", userId)
                .put("rechargeSeatId", gamePlayer.getSeatId())
                .put("rechargeAmount", amount);

        boolean handInProgress = currentGameSession != null && gamePlayer.isInHand();
        if (handInProgress) {
            gamePlayer.addPendingRecharge(amount);
            sendTableUpdateToParticipants(
                    "RECHARGE",
                    currentGameSession.getCommunityCards(),
                    rechargeMeta
            );
            LOG.infov(
                    "Player {0} queued recharge of {1} at table {2} (hand in progress)",
                    gamePlayer.getUser().getUsername(), amount, tableName
            );
            return;
        }

        // No live hand for this player — apply the chips immediately so
        // they can take part in the next deal.
        gamePlayer.setInHand(false);
        bettingService.addChips(gamePlayer, amount);
        gamePlayer.setAllIn(false);
        gamePlayer.setNoBalanceStartDate(null);

        sendTableUpdateToParticipants(
                "RECHARGE",
                currentGameSession != null ? currentGameSession.getCommunityCards() : List.of(),
                rechargeMeta
        );

        LOG.infov("Player {0} recharged {1} at table {2}", gamePlayer.getUser().getUsername(), amount, tableName);

        if (currentGameSession == null) {
            long nonNullPlayers = seats.values().stream()
                    .filter(Objects::nonNull)
                    .filter(player -> player.getStack() > 0)
                    .count();
            if (nonNullPlayers >= 2) {
                startGame();
            }
        }
    }

    private void applyPendingRecharges() {
        for (GamePlayer player : seats.values()) {
            if (player == null) continue;
            int pending = player.getPendingRecharge();
            if (pending <= 0) continue;

            player.setPendingRecharge(0);
            player.setInHand(false);
            bettingService.addChips(player, pending);
            player.setAllIn(false);
            player.setNoBalanceStartDate(null);

            LOG.infov(
                    "Applied queued recharge of {0} to player {1} at table {2}",
                    pending, player.getUser().getUsername(), tableName
            );
        }
    }

    public void unsubscribe(WebsocketSession session) {
        involvedSessions.remove(session.getId());
        session.setTable(null);
    }

    public Uni<Void> notifyPlayerDisconnect(Integer userId, WebsocketSession session) {
        unsubscribe(session);
        LOG.infov("Player {0} disconnected from table {1}", userId, tableName);
        GamePlayer gamePlayer = seats.values().stream().filter(player -> player != null && player.getUser().getUserId() == userId)
                .findFirst()
                .orElse(null);
        if (gamePlayer != null) {
            gamePlayer.setDisconnected(true);
            if (currentGameSession != null) {
                currentGameSession.handleDisconnect(userId);
            }
            sendTableUpdateToParticipants("DISCONNECT",
                    currentGameSession != null ? currentGameSession.getCommunityCards() : List.of());
        }
        return Uni.createFrom().voidItem();
    }

    public Uni<Void> leaveSeat(Integer userId, WebsocketSession session) {
        GamePlayer gamePlayer = seats.values().stream()
                .filter(p -> p != null && p.getUser().getUserId() == userId)
                .findFirst()
                .orElse(null);

        if (gamePlayer == null) return Uni.createFrom().voidItem();

        LOG.infov("Player {0} left seat {1} at table {2}",
                gamePlayer.getUser().getUsername(),
                gamePlayer.getSeatId(),
                tableName
        );

        int stackAmount = gamePlayer.getStack();
        seats.remove(gamePlayer.getSeatId());

        return userService.unlockBalance(userId, stackAmount)
                .flatMap(unused -> {
                    if (currentGameSession != null) {
                        currentGameSession.handleLeave(userId);
                    }

                    sendTableUpdateToParticipants("LEAVE_SEAT", 
                            currentGameSession != null ? currentGameSession.getCommunityCards() : List.of());

                    return userService.fetchUserBalance(userId)
                            .onItem().invoke(balance -> gameService.notifyBalanceUpdate(userId, balance))
                            .replaceWithVoid();
                });
    }

    public void startGame() {
        if (currentGameSession != null) {
            return;
        }

        long activePlayers = seats.values().stream()
                .filter(Objects::nonNull)
                .filter(player -> player.getStack() > 0 && !player.isSittingOut())
                .count();

        if (activePlayers < 2) {
            LOG.infov("Not enough players to start the game at table {0}. Waiting for more players...", tableName);
            sendGameStateUpdateToParticipants(GameSession.State.WAITING_FOR_PLAYERS, List.of());
            sendTableUpdateToParticipants("NO_TIMEOUT", List.of());
            return; 
        }

        for (GamePlayer gamePlayer : seats.values()) {
             playerRoundService.resetForNewGame(gamePlayer);
        }

        int playablePlayers = (int) activePlayers;
        currentDealer = (currentDealer + 1) % playablePlayers;

            String clientSeed = UUID.randomUUID().toString(); 
            currentGameSession = new GameSession(
                UUID.randomUUID().toString(), 
                this,                        
                currentDealer,                
                seats,                        
                userService,                 
                clientSeed,
                this.gameService,   
                playerRoundService,    
                bettingService, 
                playerStateService,
                pokerScoreService
            );
        currentGameSession.startGame();
        LOG.infov("Game started at table {0} with {1} active players", tableName, activePlayers);
    }

    public void startNextGame(boolean isFolded) {
        if (currentGameSession != null) {
            gameService.createGameSessionSnapshot(
                            currentGameSession.getSessionId(),
                            Math.toIntExact(tableId),
                            currentGameSession.createSessionDetails())
                    .subscribe().with(
                            unused -> LOG.infov("Game session snapshot created for table {0}", tableName),
                            throwable -> LOG.errorv(throwable, "Error creating game session snapshot for table {0}", tableName));
        }

        this.currentGameSession = null;

        // Hand is over — merge any chips that players queued via mid-hand
        // recharge into their live stacks before evaluating who can play
        // the next hand.
        applyPendingRecharges();

        for (GamePlayer player : seats.values()) {
            if (player == null) continue;

            if (player.getStack() <= 0) {
                if (player.isBot() && player.getBotRecharges() < 3) {
                    final GamePlayer botToRecharge = player;
                    final int rechargeAmount = this.minBuyIn;
                    player.incrementBotRecharges();
                    // Wait 10 s before adding chips so the recharge doesn't
                    // happen instantly at the end of the hand.
                    GameSession.submitDelayedBotTask(
                        () -> notifyPlayerRecharge(botToRecharge.getUser().getUserId(), rechargeAmount),
                        10_000
                    );
                    continue;
                }
                if (player.getNoBalanceStartDate() == null) {
                    player.setNoBalanceStartDate(LocalDateTime.now());
                }
            } else {
                player.setNoBalanceStartDate(null);
            }
        }

        startGame();
    }

    public Uni<Void> kickPlayerForce(Integer userId) {
        LOG.infov("Trying to kick player {0} from table {1}", userId, tableId);

        GamePlayer player = seats.values().stream()
                .filter(p -> p != null && p.getUser().getUserId() == userId)
                .findFirst()
                .orElse(null);

        if (player != null) {
            kickPlayerForce(player);
        }

        return Uni.createFrom().voidItem();
    }

    private void kickPlayerForce(GamePlayer gamePlayer) {
        if (gamePlayer == null || gamePlayer.getUser() == null) return;

        LOG.infov("Kicking player {0} from table {1}", gamePlayer.getUser().getUsername(), tableName);

        if (currentGameSession != null && currentGameSession.getOriginalPlayerList().contains(gamePlayer)) {
            LOG.infov("Player {0} was in a running game. Auto-folding.", gamePlayer.getUser().getUsername());

            currentGameSession.receivePlayerAction(
                gamePlayer.getUser().getUserId(), 
                ActionType.FOLD, 
                0, 
                true
            );
        }

        leaveSeat(gamePlayer.getUser().getUserId(), null)
            .subscribe().with(
                unused -> LOG.infov("Player {0} successfully removed from table {1}", 
                                    gamePlayer.getUser().getUsername(), tableName),
                failure -> LOG.errorv("Failed to remove player {0} from table {1}: {2}", 
                                    gamePlayer.getUser().getUsername(), tableName, failure.getMessage())
            );

        sendTableUpdateToParticipants(
            "KICK_PLAYERS",
            currentGameSession != null ? currentGameSession.getCommunityCards() : List.of()
        );

        LOG.infov("Player {0} set to sit out and folded at table {1}", 
                gamePlayer.getUser().getUsername(), tableName);
    }

    public void receivePlayerAction(Integer playerId, GameSession.ActionType actionType, int amount) {
        if (currentGameSession == null) {
            throw new IllegalStateException("No game in progress");
        }
        currentGameSession.receivePlayerAction(playerId, actionType, amount, false);
    }

    public void notifyBalanceUpdate(Integer userId, UserBalance userBalance) {
        for (WebsocketSession playerSession : involvedSessions.values()) {
            if (playerSession.getUser() != null && playerSession.getUser().getUserId() == userId) {
                gameService.sendWebsocketEvent(new WebsocketEvent(
                    playerSession.getId(),
                    "BALANCE_UPDATE",
                    new JsonObject()
                        .put("userId", userId)
                        .put("balance", userBalance.getBalance())
                        .put("lockedAmount", userBalance.getLockedAmount())
                ));
            }
        }
    }
    
    public void markZeroStackPlayersAtHandEnd() {
        for (GamePlayer player : seats.values()) {
            if (player == null || player.getStack() > 0) continue;
            // Bots that still have recharges coming: reset the timer so
            // handleAutoActions() starts a clean 5-minute window from hand-end
            // (the pending recharge will cancel it anyway).
            // Bots that exhausted all 3 recharges (and regular players):
            // do NOT reset — preserving the running countdown so the kick
            // actually fires after a true 30 seconds of being at 0 chips.
            if (player.isBot() && player.getBotRecharges() < 3) {
                player.setZeroStackStartDate(null);
            }
        }
    }

    public void handleAutoActions() {
        LocalDateTime now = LocalDateTime.now();

        // Turn-timeout check always runs, even mid-hand.
        if (currentGameSession != null) {
            currentGameSession.checkForTurnTimeouts();
        }

        // All kick logic is suspended while a hand is in progress.
        // We never remove a player who is actively playing.
        boolean handActive = currentGameSession != null
                && currentGameSession.getState() != GameSession.State.FINISHED
                && currentGameSession.getState() != GameSession.State.WAITING_FOR_PLAYERS;
        if (handActive) return;

        // Between hands: kick any player/bot with 0 chips for 5 min, or any real
        // player who has been disconnected or sitting out for 5 minutes.
        for (GamePlayer player : seats.values()) {
            if (player == null) continue;

            // Zero-stack check (real players and bots that have exhausted recharges).
            if (player.getStack() > 0) {
                player.setZeroStackStartDate(null); // recharged — cancel timer
            } else if (!(player.isBot() && player.getBotRecharges() < 3)) {
                if (player.getZeroStackStartDate() == null) {
                    player.setZeroStackStartDate(now);
                } else if (player.getZeroStackStartDate().plusSeconds(300).isBefore(now)) {
                    LOG.infov("Kicking {0} from table {1} — 0 chips for 5 min",
                            player.getUser().getUsername(), tableName);
                    kickPlayerForce(player);
                    continue;
                }
            }

            // Sit-out and disconnect timers apply only to real players.
            if (player.isBot()) continue;

            if (player.isDisconnected() && player.getDisconnectedAt() != null) {
                if (player.getDisconnectedAt().plusSeconds(300).isBefore(now)) {
                    LOG.infov("Kicking {0} from table {1} — disconnected for 5 min",
                            player.getUser().getUsername(), tableName);
                    kickPlayerForce(player);
                    continue;
                }
            }

            if (player.isSittingOut() && player.getSitOutStartDate() != null) {
                if (player.getSitOutStartDate().plusSeconds(300).isBefore(now)) {
                    LOG.infov("Kicking {0} from table {1} — sitting out for 5 min",
                            player.getUser().getUsername(), tableName);
                    kickPlayerForce(player);
                }
            }
        }

        // Kick the last remaining player/bot after 3 minutes of being alone.
        checkAloneAtTable(now);
    }

    private void checkAloneAtTable(LocalDateTime now) {
        long seatedCount = seats.values().stream().filter(Objects::nonNull).count();

        if (seatedCount != 1) {
            botsAloneStartTime = null;
            return;
        }

        // Exactly one player/bot — a game cannot start.
        if (botsAloneStartTime == null) {
            botsAloneStartTime = now;
            return;
        }

        long elapsed = ChronoUnit.SECONDS.between(botsAloneStartTime, now);
        if (elapsed >= BOTS_ALONE_KICK_SECONDS) {
            LOG.infov("Kicking lone player from table {0} — alone for {1}s", tableName, elapsed);
            botsAloneStartTime = null;
            seats.values().stream().filter(Objects::nonNull).forEach(this::kickPlayerForce);
        }
    }

    /** Returns seconds until bots-alone kick fires, or null if not applicable. */
    public Integer getBotsAloneSecondsLeft() {
        if (botsAloneStartTime == null) return null;
        long elapsed = ChronoUnit.SECONDS.between(botsAloneStartTime, LocalDateTime.now());
        long remaining = BOTS_ALONE_KICK_SECONDS - elapsed;
        return (int) Math.max(0, remaining);
    }
        
public void sendGameStateUpdateToParticipants(GameSession.State state, List<GameCard> communityCards) {
        for (WebsocketSession playerSession : involvedSessions.values()) {
            List<GameCard> correctedCommunityCards = new ArrayList<>();

            if (currentGameSession != null) {
                switch (currentGameSession.getState()) {
                    case POSTING_BLINDS, DEALING: break;
                    case PRE_FLOP:
                        correctedCommunityCards = new ArrayList<>();
                        break;
                    case FLOP:
                        correctedCommunityCards.addAll(currentGameSession.getCommunityCards().subList(0, 3));
                        break;
                    case TURN:
                        correctedCommunityCards.addAll(currentGameSession.getCommunityCards().subList(0, 4));
                        break;
                    case RIVER:
                    case SHOWDOWN:
                    case FINISHED:
                        correctedCommunityCards.addAll(currentGameSession.getCommunityCards());
                        break;
                    case WAITING_FOR_PLAYERS:
                        correctedCommunityCards = new ArrayList<>();
                        break;
                    default:
                        throw new IllegalStateException("Unexpected value: " + currentGameSession.getState());
                }
            }

            GamePlayer viewerPlayer = playerSession.getUser() == null ? null
                : seats.values().stream()
                    .filter(Objects::nonNull)
                    .filter(seat -> seat.getUser().getUserId() == playerSession.getUser().getUserId())
                    .findFirst().orElse(null);

            JsonObject playersJson = new JsonObject();

            for (GamePlayer player : seats.values()) {
                if (player != null) {
                    playersJson.put(
                        String.valueOf(player.getSeatId()),
                        serializePlayer(player, viewerPlayer)
                    );
                }
            }

            gameService.sendWebsocketEvent(new WebsocketEvent(
                playerSession.getId(),
                "GAME",
                new JsonObject()
                    .put("action", "GAME_STATE_UPDATE")
                    .put("state", state.name())
                    .put("currentPot", currentGameSession != null ? currentGameSession.getPot() : 0)
                    .put("playerBets", currentGameSession != null ? currentGameSession.getPlayerBets() : new HashMap<>())
                    .put("pots", currentGameSession != null ? currentGameSession.getSidePots() : new ArrayList<>())
                    .put("communityCards", correctedCommunityCards)
                    .put("players", playersJson)
            ));
        }
    }

    private JsonObject serializePlayer(GamePlayer player, GamePlayer viewer) {
        JsonObject json = new JsonObject();

        json.put("seatId", player.getSeatId());
        json.put("stack", player.getStack());
        json.put("winnings", player.getWinnings());
        json.put("inHand", player.isInHand());
        json.put("isFolded", player.isFolded());
        json.put("isAllIn", player.isAllIn());
        json.put("isWinner", player.isWinner());
        json.put("isSittingOut", player.isSittingOut());
        json.put("isDisconnected", player.isDisconnected());
        json.put("seatedAt", player.getSeatedAt());

        boolean isAdmin = viewer != null && viewer.getUser() != null
            && User.Role.ADMIN.equals(viewer.getUser().getRole());
        boolean isSelf = viewer != null && viewer.getSeatId() != null
            && viewer.getSeatId().equals(player.getSeatId());
        boolean canSeeRealCards = isAdmin || isSelf || player.isRevealApproved();

        List<GameCard> holeCards = player.getHoleCards();
        if (holeCards != null && !holeCards.isEmpty()) {
            if (canSeeRealCards) {
                json.put("holeCards", holeCards.stream()
                    .map(this::serializeCard)
                    .toList());
            } else {
                int hiddenCount = holeCards.size();
                List<JsonObject> hidden = new ArrayList<>();
                for (int i = 0; i < hiddenCount; i++) {
                    hidden.add(serializeCard(new GameCard(true)));
                }
                json.put("holeCards", hidden);
            }
        } else {
            json.put("holeCards", new ArrayList<>());
        }

        if (player.getHand() != null && canSeeRealCards) {
            json.put("hand", serializeHand(player.getHand()));
        } else {
            json.put("hand", null);
        }
        return json;
    }

    private JsonObject serializeCard(GameCard card) {
        return new JsonObject()
            .put("suit", card.getSuit() != null ? card.getSuit().name() : null)
            .put("rank", card.getRank() != null ? card.getRank().name() : null)
            .put("secret", card.isSecret());
    }

    private JsonObject serializeHand(GameHand hand) {
        JsonObject json = new JsonObject();
        json.put("rank", hand.getRank().name());

        if (hand.getRankCards() != null) {
            json.put("rankCards", hand.getRankCards().stream()
                .map(this::serializeCard)
                .toList());
        } else {
            json.put("rankCards", new ArrayList<>());
        }

        return json;
    }

    public void sendTurnUpdateToParticipants(GamePlayer gamePlayer, boolean isAuto) {
        sendTurnUpdateToParticipants(gamePlayer, isAuto, TIMEOUT_SECONDS);
    }

    public void sendTurnUpdateToParticipants(GamePlayer gamePlayer, boolean isAuto, int turnDuration) {
        if (currentGameSession == null) {
            throw new IllegalStateException("No game in progress");
        }

        LocalDateTime turnStart = gamePlayer.getTurnStartDate();

        for (WebsocketSession playerSession : involvedSessions.values()) {
            gameService.sendWebsocketEvent(new WebsocketEvent(
                    playerSession.getId(),
                    "GAME",
                    new JsonObject()
                            .put("action", "TURN_UPDATE")
                            .put("currentPlayerSeat", gamePlayer.getSeatId())
                            .put("isAuto", isAuto)
                            .put("turnStartTime", turnStart != null ? turnStart.toString() : null)
                            .put("turnDuration", turnDuration)
            ));
        }
    }

    public void propagateCombinedPotUpdate(Map<Integer, GameHand> hands, List<GameSidePot> pots) {
        if (currentGameSession == null) {
            throw new IllegalStateException("No game in progress");
        }

        JsonArray sidePotsJson = new JsonArray(
            pots.stream().map(GameSidePot::toJson).toList()
        );


        Map<Integer, Integer> playerStacks = new HashMap<>();
        for (Map.Entry<Integer, GamePlayer> entry : seats.entrySet()) {
            if (entry.getValue() != null) {
                playerStacks.put(entry.getKey(), entry.getValue().getStack());
            }
        }

        JsonObject handsJson = new JsonObject();
        for (GamePlayer player : currentGameSession.getOriginalPlayerList()) {
            if (player.isWinner()) {
                // Only expose hole/best-hand cards for winners who actually
                // revealed at showdown. A lone winner by fold keeps cards hidden.
                JsonArray holeCardsJson = player.isRevealApproved()
                    ? GameCard.toJsonArray(player.getHoleCards(), false)
                    : new JsonArray();
                JsonArray bestHandCardsJson = player.isRevealApproved()
                    ? GameCard.toJsonArray(player.getBestHandCards(), false)
                    : new JsonArray();

                handsJson.put(String.valueOf(player.getSeatId()), new JsonObject()
                    .put("seatId", player.getSeatId())
                    .put("user", JsonObject.mapFrom(player.getUser()))
                    .put("holeCards", holeCardsJson)
                    .put("bestHandCards", bestHandCardsJson)
                    .put("winnings", player.getWinnings())
                    .put("netResult", player.getNetResult())
                    .put("isWinner", player.isWinner())
                );
            }
        }

        JsonArray communityCardsJson = GameCard.toJsonArray(currentGameSession.getCommunityCards(), false);


        for (WebsocketSession session : involvedSessions.values()) {
            gameService.sendWebsocketEvent(new WebsocketEvent(
                session.getId(),
                "GAME",
                new JsonObject()
                    .put("action", "COMBINED_SPLIT_POT")
                    .put("stacks", playerStacks)
                    .put("hands", handsJson)
                    .put("sidePots", sidePotsJson)
                    .put("communityCards", communityCardsJson)
            ));
        }
    }

    public void propagatePlayerEvent(GamePlayer currentPlayer, GameSession.ActionType actionType, int amount, int updatedStack, Map<Integer, Integer> playerBets ) {
        if (currentGameSession == null) {
            throw new IllegalStateException("No game in progress");
        }
        if (currentPlayer != null) {
            for (WebsocketSession playerSession : involvedSessions.values()) {
                List<GameCard> cards = new ArrayList<>();
                if (GameSession.ActionType.REVEAL_CARDS.equals(actionType)) {
                    cards = currentPlayer.getHoleCards();
                }
                gameService.sendWebsocketEvent(new WebsocketEvent(
                        playerSession.getId(),
                        "GAME",
                        new JsonObject()
                                .put("action", "PLAYER_ACTION")
                                .put("seatId", currentPlayer.getSeatId())
                                .put("actionType", actionType.name())
                                .put("amount", amount)
                                .put("updatedStack", updatedStack)
                                .put("currentBets", playerBets)
                                .put("currentPot", currentGameSession.getPot())
                                .put("cards", cards)

                ));
            }
        }
    }

    public void sendPersonalHoleCardsToPlayers() {
        if (currentGameSession == null) {
            throw new IllegalStateException("No game in progress");
        }
        Set<Integer> playerUserIds = new HashSet<>();
        Map<Integer, List<GameCard>> hiddenHoleCards = new HashMap<>();
        Map<Integer, Map<Integer, List<GameCard>>> personalizedHoleCards = new HashMap<>();

        int holeCardCount = getHoleCardCountForVariant();

        for (Map.Entry<Integer, GamePlayer> entry : seats.entrySet()) {
            GamePlayer gamePlayer = entry.getValue();
            if (gamePlayer != null && gamePlayer.isInHand() && !gamePlayer.isSittingOut() && !gamePlayer.getHoleCards().isEmpty()) {
                List<GameCard> hiddenCards = new ArrayList<>();
                for (int i = 0; i < holeCardCount; i++) {
                    hiddenCards.add(new GameCard(true)); 
                }
                hiddenHoleCards.put(entry.getKey(), hiddenCards);
            }
        }

        for (Map.Entry<Integer, GamePlayer> entry : seats.entrySet()) {
            GamePlayer gamePlayer = entry.getValue();
            if (gamePlayer != null) {
                Map<Integer, List<GameCard>> personalCards = new HashMap<>(hiddenHoleCards);
                if (gamePlayer.isInHand() || !gamePlayer.isSittingOut()) {
                    personalCards.put(entry.getKey(), gamePlayer.getHoleCards());
                }
                if (User.Role.ADMIN.equals(gamePlayer.getUser().getRole())) {
                    for (Map.Entry<Integer, GamePlayer> seatEntry : seats.entrySet()) {
                        GamePlayer seatPlayer = seatEntry.getValue();
                        if (seatPlayer != null && seatPlayer.isInHand()) {
                            personalCards.put(seatEntry.getKey(), seatPlayer.getHoleCards());
                        }
                    }
                }
                personalizedHoleCards.put(gamePlayer.getUser().getUserId(), personalCards);
                playerUserIds.add(gamePlayer.getUser().getUserId());
            }
        }

        for (WebsocketSession socketSession : involvedSessions.values()) {
            if (socketSession.getUser() != null && playerUserIds.contains(socketSession.getUser().getUserId())) {
                gameService.sendWebsocketEvent(new WebsocketEvent(
                        socketSession.getId(),
                        "GAME",
                        new JsonObject()
                                .put("action", "HOLE_CARDS")
                                .put("holeCards", personalizedHoleCards.get(socketSession.getUser().getUserId()))
                ));
            } else {
                gameService.sendWebsocketEvent(new WebsocketEvent(
                        socketSession.getId(),
                        "GAME",
                        new JsonObject()
                                .put("action", "HOLE_CARDS")
                                .put("holeCards", hiddenHoleCards)
                ));
            }
        }
    }

    private int getHoleCardCountForVariant() {
        String variant = getGameVariant();
        return variant.equals(GameVariant.OMAHA.name()) ? 4 : 2; 
    }

    private int getLockedAmountForPlayer(GamePlayer gamePlayer) {
        if (gamePlayer != null) {
            return gamePlayer.getStack(); 
        }
        return 0; 
    }   

    public void sendTableUpdateToParticipants(String action, List<GameCard> communityCards) {
        sendTableUpdateToParticipants(action, communityCards, null);
    }

    public void sendTableUpdateToParticipants(String action, List<GameCard> communityCards, JsonObject extras) {
        for (WebsocketSession involvedSession : involvedSessions.values()) {
            GamePlayer thisPlayer = seats.values().stream()
                    .filter(Objects::nonNull)
                    .filter(seat -> seat.getUser().getUserId() == involvedSession.getUser().getUserId())
                    .findFirst().orElse(null);

            int lockedAmount = getLockedAmountForPlayer(thisPlayer);

            JsonObject payload = new JsonObject()
                    .put("action", action)
                    .put("tableId", tableId)
                    .put("table", this)
                    .put("session", createSessionData(thisPlayer, communityCards))
                    .put("lockedAmount", lockedAmount)
                    .put("playersInTable", getPlayersInTable())
                    .put("activePlayers", getActivePlayers())
                    .put("botsAloneSecondsLeft", getBotsAloneSecondsLeft());

            if (extras != null) {
                extras.forEach(entry -> payload.put(entry.getKey(), entry.getValue()));
            }

            gameService.sendWebsocketEvent(new WebsocketEvent(
                    involvedSession.getId(),
                    "TABLE",
                    payload
            ));
        }
    }


    /**
     * ⚡ OPTIMIZED: Sends a single combined message with both table state and player action.
     * Replaces separate sendTableUpdateToParticipants + propagatePlayerEvent calls.
     * Reduces network messages from 2 to 1 per action = 50% reduction in traffic.
     */
    public void sendPlayerActionUpdate(
        GamePlayer currentPlayer, 
        GameSession.ActionType actionType, 
        int amount,
        boolean isTimeoutActed,
        List<GameCard> communityCards,
        Map<Integer, Integer> playerBets
    ) {
        
        if (currentGameSession == null) {
            throw new IllegalStateException("No game in progress");
        }

        JsonObject actionData = new JsonObject()
            .put("action", "PLAYER_ACTION")
            .put("seatId", currentPlayer.getSeatId())
            .put("actionType", actionType.name())
            .put("amount", amount)
            .put("updatedStack", currentPlayer.getStack())
            .put("currentBets", playerBets)
            .put("currentPot", currentGameSession.getPot())
            .put("isTimeout", isTimeoutActed);


        if (GameSession.ActionType.REVEAL_CARDS.equals(actionType)) {
            actionData.put("cards", currentPlayer.getHoleCards());
        }


        Map<Integer, JsonObject> cachedSessionData = new ConcurrentHashMap<>();
        
        // Pre-calculate common data
        int playersInTable = getPlayersInTable();
        int activePlayers = getActivePlayers();

        // ⚡ MEGA OPTIMIZATION: Parallel message sending (200ms faster!)
        List<CompletableFuture<Void>> sendTasks = involvedSessions.values().stream()
            .map(playerSession -> CompletableFuture.runAsync(() -> {
                GamePlayer thisPlayer = seats.values().stream()
                    .filter(Objects::nonNull)
                    .filter(seat -> seat.getUser().getUserId() == playerSession.getUser().getUserId())
                    .findFirst().orElse(null);

                // ⚡ FIX: Send to spectators too (thisPlayer can be null for spectators)
                JsonObject sessionData;
                int lockedAmount = 0;
                
                if (thisPlayer != null) {
                    // Player has a seat - use personalized session data
                    sessionData = cachedSessionData.computeIfAbsent(
                        thisPlayer.getSeatId(),
                        seatId -> createSessionData(thisPlayer, communityCards)
                    );
                    lockedAmount = getLockedAmountForPlayer(thisPlayer);
                } else {
                    // Spectator - use generic session data (no hole cards)
                    sessionData = cachedSessionData.computeIfAbsent(
                        -1,  // Use -1 as key for spectator data
                        seatId -> createSessionData(null, communityCards)
                    );
                }

                // ⚡ SINGLE COMBINED MESSAGE
                gameService.sendWebsocketEvent(new WebsocketEvent(
                    playerSession.getId(),
                    "GAME",
                    new JsonObject()
                        .put("action", "PLAYER_ACTION_WITH_STATE")
                        .put("playerAction", actionData)
                        .put("tableUpdate", new JsonObject()
                            .put("action", isTimeoutActed ? "TIMEOUT" : "NO_TIMEOUT")
                            .put("tableId", tableId)
                            .put("table", this)
                            .put("session", sessionData)
                            .put("lockedAmount", lockedAmount)
                            .put("playersInTable", playersInTable)
                            .put("activePlayers", activePlayers)
                        )
                ));
            }))
            .collect(Collectors.toList());


        CompletableFuture.allOf(sendTasks.toArray(new CompletableFuture[0])).join();
    }
    
    public void sendChatToParticipants(String username, String content) {
        for (WebsocketSession session : involvedSessions.values()) {
            gameService.sendWebsocketEvent(new WebsocketEvent(
                    session.getId(),
                    "CHAT",
                    new JsonObject()
                            .put("username", username)
                            .put("content", content)
            ));
        }
    }

      /*
     * Getters and Setters
     */
    public Long getTableId() {
        return tableId;
    }

    public void setTableId(Long tableId) {
        this.tableId = tableId;
    }

     public String getSecureTableId() {
        if (tableId == null) return null;
        return Base64.getUrlEncoder().encodeToString(tableId.toString().getBytes());
    }

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
    }

    public Integer getMaxPlayers() {
        return maxPlayers;
    }

    public void setMaxPlayers(Integer maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public Integer getBigBlind() {
        return bigBlind;
    }

    public void setBigBlind(Integer bigBlind) {
        this.bigBlind = bigBlind;
    }

    public Integer getSmallBlind() {
        return smallBlind;
    }

    public void setSmallBlind(Integer smallBlind) {
        this.smallBlind = smallBlind;
    }

    public Integer getMinBuyIn() {
        return minBuyIn;
    }

    public void setMinBuyIn(Integer minBuyIn) {
        this.minBuyIn = minBuyIn;
    }

    public Integer getMaxBuyIn() {
        return maxBuyIn;
    }

    public void setMaxBuyIn(Integer maxBuyIn) {
        this.maxBuyIn = maxBuyIn;
    }

    public Map<Integer, GamePlayer> getSeats() {
        return seats;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Integer createdBy) {
        this.createdBy = createdBy;
    }

    public Map<String, WebsocketSession> getInvolvedSessions() {
        return involvedSessions;
    }

    public Integer getCurrentDealer() {
        return currentDealer;
    }

    public enum TableAction {
        SUBSCRIBE,
        TAKE_SEAT,
        LEAVE_SEAT,
        RECHARGE,
        RECONNECT
    }

    public void setGameVariant(String variant) {
        if (variant == null || !isValidVariant(variant)) {
            this.variant = GameVariant.TEXAS.name();  
        } else {
            this.variant = variant.toUpperCase(); 
        }
    }

    private boolean isValidVariant(String variant) {
        try {
            GameVariant.valueOf(variant.toUpperCase());
            return true;
        } catch (IllegalArgumentException e) {
            return false;  
        }
    }

    public String getGameVariant() {
        return variant;
    }
 

/* ----------------------------getter setter-------------------------------------------------- */
    public String getSecureId() {
        return secureId;
    }

    public void setSecureId(String secureId) {
        this.secureId = secureId;
    }
    
    public double getRakePercent() {
        return rakePercent;
    }

    public void setRakePercent(double rakePercent) {
        this.rakePercent = rakePercent;
    }

    public int getTotalRakeCollected() {
        return totalRakeCollected;
    }

    public void addRakeCollected(int rake) {
        this.totalRakeCollected += rake;
    }
    public int getPlayersInTable() {
        return (int) seats.values().stream()
                     .filter(Objects::nonNull)
                     .count();
    }

    public int getActivePlayers() {
        return (int) seats.values().stream()
                .filter(Objects::nonNull)
                .filter(p -> !p.isSittingOut())
                .filter(p -> !p.isDisconnected())
                .filter(p -> p.getStack() > 0)
                .count();
    }

    public int getSmallBlindSeatId() {
        int max = maxPlayers;
        int seat = currentDealer;

        for (int i = 1; i <= max; i++) {
            int next = (seat + i) % max;
            GamePlayer p = seats.get(next);
            if (p != null && p.getStack() > 0 && !p.isSittingOut()) {
                return next;
            }
        }
        return -1;
    }

    public void loadFromRecord(PokerTableRecord r) {
        this.tableId = r.getTableId();
        this.tableName = r.getTableName();
        this.maxPlayers = r.getMaxPlayers();
        this.bigBlind = r.getBigBlind();
        this.smallBlind = r.getSmallBlind();
        this.minBuyIn = r.getMinBuyIn();
        this.maxBuyIn = r.getMaxBuyIn();
        this.rakePercent = r.getRakePercent().doubleValue(); 
        this.createdAt = r.getCreatedAt();
        this.createdBy = r.getCreatedBy();
        this.secureId = r.getSecureId();
        this.variant = r.getVariant().toUpperCase();
    }

}
