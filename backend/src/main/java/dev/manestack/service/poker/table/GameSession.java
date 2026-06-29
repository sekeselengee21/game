package dev.manestack.service.poker.table;

import dev.manestack.service.GameService;
import dev.manestack.service.UserService;
import dev.manestack.service.poker.card.FairGameDeck;
import dev.manestack.service.poker.card.GameCard;
import dev.manestack.service.poker.card.GameHand;
import dev.manestack.service.poker.card.GameHandEvaluator;
import dev.manestack.service.poker.card.GameHandRank;
import dev.manestack.service.poker.card.GameVariant;
import io.smallrye.mutiny.tuples.Tuple3;
import io.vertx.core.json.JsonObject;
import jakarta.inject.Inject;

import org.jboss.logging.Logger;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.jooq.DSLContext;


public class GameSession {
    private static final Logger LOG = Logger.getLogger(GameSession.class);
    private static final Integer TIMEOUT_SECONDS = 20;
    public static final Integer ALL_IN_REVEAL_DELAY_MILLIS = 1500;
    private static final BigDecimal JACKPOT_RATE = BigDecimal.valueOf(0.001);
    // Maximum rake taken from any single hand, regardless of pot size or rake %.
    private static final int RAKE_CAP = 5000;
    private final String sessionId;
    private final GameTable table;
    private final List<GamePlayer> originalPlayerList = new ArrayList<>();
    private State state;
    private GamePlayer currentPlayer;
    private int pot;
    private int pivotalPlayerIndex;
    private boolean isAllInFlip = false;
    private double totalRake;
    private int lastRaiseSeat = -1;
    private int lastAggressorSeat = -1; 
    private int bigBlindSeatIndex;
    private int smallBlindSeatIndex;
    private int dealerSeatIndex = 0;
    private final Random RANDOM = new Random();
    private final List<GameCard> communityCards = new ArrayList<>();
    private final List<GameCard> destinedCommunityCardList = new ArrayList<>();
    private final Queue<GameCard> destinedCommunityCards = new LinkedList<>();
    private final Queue<GamePlayer> currentQueue = new LinkedList<>();
    private final Queue<GamePlayer> actedQueue = new LinkedList<>();
    private final Map<Integer, Integer> playerBets = new HashMap<>();
    private final Map<Integer, GameHand> revealedHands = new HashMap<>();
    private final List<GameSidePot> sidePots = new ArrayList<>();
    private final Map<Integer, Tuple3<Double, Double, Double>> monteCarloValues = new HashMap<>();
    private final Queue<GamePlayer> showdownQueue = new LinkedList<>();
    private final ScheduledExecutorService showdownScheduler = Executors.newSingleThreadScheduledExecutor();
    // Shared pool for bot think-time delays and other short-lived background tasks.
    // Cached so idle threads are reclaimed; daemon so they never block JVM shutdown.
    private static final ExecutorService BOT_THREAD_POOL =
            Executors.newCachedThreadPool(r -> {
                Thread t = new Thread(r, "bot-worker");
                t.setDaemon(true);
                return t;
            });

    /**
     * Schedules {@code task} to run after {@code delayMs} milliseconds on the shared
     * bot thread pool. Use this instead of raw {@code new Thread()} to avoid unbounded
     * thread creation.
     */
    public static void submitDelayedBotTask(Runnable task, long delayMs) {
        BOT_THREAD_POOL.submit(() -> {
            try {
                Thread.sleep(delayMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            task.run();
        });
    }
    private boolean winningsCalculated = false;
    private boolean showdownStarted = false;
    private final List<Runnable> onFinishCallbacks = new ArrayList<>();
    private Map<Integer, GamePlayer> seats = new HashMap<>(); 
    private final FairGameDeck deck;      
    private final String clientSeed;      
    private final String serverSeed;        
    private final String deckHash;  
    private final GameService gameService;
    private volatile Integer currentActingSeat; 
    private static final double LOSS_BONUS_RATE = 0.10;
    private final PlayerRoundService playerRoundService;
    private final BettingService bettingService;
    private final PlayerStateService playerStateService;
    private final PokerScoreService pokerScoreService;
    private GameHand currentBestHand = null;
    private GamePlayer currentBestPlayer = null;
    
    
    @Inject
    UserService userService;
    @Inject
    DSLContext jooq;



   public GameSession(
            String sessionId,
            GameTable table,
            int dealerPosition,
            Map<Integer, GamePlayer> players,
            UserService userService,
            String clientSeed, 
            GameService gameService,
            PlayerRoundService playerRoundService,
            BettingService bettingService,
            PlayerStateService playerStateService,
            PokerScoreService pokerScoreService
    ) {
        this.sessionId = sessionId;
        this.table = table;
        this.state = State.WAITING_FOR_PLAYERS;
        this.userService = userService;
        this.gameService = gameService;
        this.playerRoundService = playerRoundService;
        this.pokerScoreService = pokerScoreService;
        this.bettingService = bettingService;
        this.playerStateService = playerStateService;
        this.clientSeed = clientSeed != null ? clientSeed : UUID.randomUUID().toString();
        this.deck = new FairGameDeck(this.clientSeed);
        this.deckHash = deck.getDeckHash();
        this.serverSeed = deck.getServerSeed();

        for (int i = 0; i < 5; i++) {
            GameCard gameCard = deck.drawCard();
            destinedCommunityCardList.add(gameCard);
            destinedCommunityCards.add(gameCard);
        }

        this.pivotalPlayerIndex = dealerPosition;

        List<Integer> orderedSeats = players.keySet().stream().sorted().toList();
        for (int seat : orderedSeats) {
            GamePlayer player = players.get(seat);
            if (player != null && player.getStack() > 0 ) {
                originalPlayerList.add(player);
            }
        }
    }


    public String getDeckHash() { return deckHash; }
    public String getServerSeed() { return serverSeed; }
    public String getClientSeed() { return clientSeed; }
    
    public static class BlindsInfo {
        public final int smallBlindSeat;
        public final int bigBlindSeat;

        public BlindsInfo(int sb, int bb) {
            this.smallBlindSeat = sb;
            this.bigBlindSeat = bb;
        }
    }

    private GamePlayer getNextActivePlayer(int startIndex) {
        int totalPlayers = originalPlayerList.size();
        for (int i = 1; i <= totalPlayers; i++) {
            int index = (startIndex + i) % totalPlayers;
            GamePlayer player = originalPlayerList.get(index);
            if (player != null && player.isInHand()) {
                return player;
            }
        }
        return null; 
    }

    private BlindsInfo assignAndPostBlinds() {
        int smallBlindAmount = table.getSmallBlind();
        int bigBlindAmount = table.getBigBlind();

        // --- Dealer ---
        GamePlayer dealerPlayer = originalPlayerList.get(pivotalPlayerIndex);
        if (dealerPlayer == null) return null;
        dealerSeatIndex = dealerPlayer.getSeatId();

        // --- Small Blind ---
        GamePlayer smallBlindPlayer = getNextActivePlayer(pivotalPlayerIndex);
        if (smallBlindPlayer == null) return null;

        int actualSB = bettingService.placeBet(smallBlindPlayer, smallBlindAmount);

        if (smallBlindPlayer.isAllIn()) {
            currentQueue.remove(smallBlindPlayer);
        }

        smallBlindSeatIndex = smallBlindPlayer.getSeatId();

        // Heads-up special case
        if (originalPlayerList.size() == 2) {
            dealerSeatIndex = smallBlindPlayer.getSeatId();
        }

        actedQueue.add(smallBlindPlayer);
        playerBets.put(smallBlindPlayer.getSeatId(), actualSB);

        table.propagatePlayerEvent(
            smallBlindPlayer,
            smallBlindPlayer.isAllIn() ? ActionType.ALL_IN : ActionType.SMALL_BLIND,
            actualSB,
            smallBlindPlayer.getStack(),
            playerBets
        );

        lastRaiseSeat = smallBlindPlayer.getSeatId();

        // --- Big Blind ---
        GamePlayer bigBlindPlayer = getNextActivePlayer(originalPlayerList.indexOf(smallBlindPlayer));
        if (bigBlindPlayer == null) return null;

        int actualBB = bettingService.placeBet(bigBlindPlayer, bigBlindAmount);

        if (bigBlindPlayer.isAllIn()) {
            currentQueue.remove(bigBlindPlayer);
        }

        bigBlindSeatIndex = bigBlindPlayer.getSeatId();
        playerBets.put(bigBlindPlayer.getSeatId(), actualBB);

        actedQueue.add(bigBlindPlayer);

        table.propagatePlayerEvent(
            bigBlindPlayer,
            bigBlindPlayer.isAllIn() ? ActionType.ALL_IN : ActionType.BIG_BLIND,
            actualBB,
            bigBlindPlayer.getStack(),
            playerBets
        );

        LOG.infov(
            "Blinds assigned - Dealer: {0}, SB: {1}, BB: {2}",
            dealerSeatIndex,
            smallBlindPlayer.getSeatId(),
            bigBlindPlayer.getSeatId()
        );

        // --- Rotate action queue starting after BB ---
        rotateQueue(bigBlindSeatIndex);

        return new BlindsInfo(smallBlindSeatIndex, bigBlindSeatIndex);
    }

    public void startGame() {
        LOG.infov("startGame() called for session {0}", sessionId);

        for (GamePlayer gamePlayer : originalPlayerList) {
            playerRoundService.resetForNewGame(gamePlayer); 
        }

        state = State.PRE_FLOP;
        assignAndPostBlinds();
        dealCards();

        table.sendGameStateUpdateToParticipants(state, communityCards);
        table.sendTableUpdateToParticipants("NO_TIMEOUT", communityCards);

        promptNextPlayer();
    }

    private void rotateQueue(int startAfterSeat) {
        currentQueue.clear();

        // Collect all active players sorted by seat ID
        List<GamePlayer> activePlayers = originalPlayerList.stream()
                .filter(p -> p != null && p.isInHand() && !p.isAllIn())
                .sorted(Comparator.comparingInt(GamePlayer::getSeatId))
                .toList();

        if (activePlayers.isEmpty()) {
            LOG.infov("No active players found to start betting in session {0}", sessionId);
            return;
        }

        int rotateIndex = 0;
        for (int i = 0; i < activePlayers.size(); i++) {
            if (activePlayers.get(i).getSeatId() > startAfterSeat) {
                rotateIndex = i;
                break;
            }
        }

        for (int i = 0; i < activePlayers.size(); i++) {
            int index = (rotateIndex + i) % activePlayers.size();
            currentQueue.add(activePlayers.get(index));
        }
    }

    private void promptNextPlayer() {
        if (state == State.SHOWDOWN) return;
        long nonAllInPlayersInHand = originalPlayerList.stream()
                .filter(p -> p.isInHand() && !p.isAllIn())
                .count();

        boolean allPlayersActed = currentQueue.isEmpty();


        if (originalPlayerList.size() == 2 && state == State.PRE_FLOP) {
            int sbBet = playerBets.getOrDefault(smallBlindSeatIndex, 0);
            int bbBet = playerBets.getOrDefault(bigBlindSeatIndex, 0);
            GamePlayer bbPlayer = originalPlayerList.stream()
                .filter(p -> p.getSeatId() == bigBlindSeatIndex )
                .findFirst()
                .orElse(null);            
            if (bbPlayer != null && bbPlayer.isAllIn() && bbBet < sbBet) {
                LOG.infov("BB player is all-in for {0} which is less than SB bet of {1}. Going to showdown.", bbBet, sbBet);
                currentActingSeat = null;
                startShowdownRevealSequence();
                return;
            }
        }

        if (nonAllInPlayersInHand <= 1 && allPlayersActed) {
            LOG.infov("All active players are all-in. Starting showdown.");
            currentActingSeat = null;
            startShowdownRevealSequence();
            return;
        }

        if (currentQueue.isEmpty()) {
            boolean allBetsEqual = table.getSeats().values().stream()
                .filter(p -> p.isInHand() && !p.isAllIn() )
                .map(p -> playerBets.getOrDefault(p.getSeatId(), 0))
                .distinct()
                .count() <= 1;

            boolean lastAggressorActive = table.getSeats().values().stream()
                .anyMatch(p -> p.isInHand()  && p.getSeatId() == lastAggressorSeat);

            if (allBetsEqual || !lastAggressorActive) {
                currentActingSeat = null;
                advanceGameState();
                return;
            } else {
                resetActedQueue();
            }
        }

        GamePlayer nextPlayer = null;

        int attempts = currentQueue.size();

        while (attempts-- > 0 && !currentQueue.isEmpty()) {
            GamePlayer candidate = currentQueue.poll();

            if (candidate != null 
                && candidate.isInHand() 
                && !candidate.isAllIn() 
             ) {
                nextPlayer = candidate;
                break;
            }

            if (candidate != null) {
                currentQueue.offer(candidate);
            }
        }

        if (nextPlayer == null) {
            LOG.warn("No valid player left in queue — advancing game state.");
            currentActingSeat = null;
            advanceGameState();
            return;
        }

        currentPlayer = nextPlayer;
        currentPlayer.setTurnStartDate(LocalDateTime.now());
        currentActingSeat = currentPlayer.getSeatId();

        table.sendTurnUpdateToParticipants(
                currentPlayer,
                !shouldAct()
        );

        if (currentPlayer.isBot()) {
            GamePlayer bot = currentPlayer;
            if (bot.isGoodBot()) {
                BOT_THREAD_POOL.submit(() -> simulateGoodBot(bot));
            } else {
                BOT_THREAD_POOL.submit(() -> simulateGame(bot));
            }
        }
    }

    public void startShowdownRevealSequence() {
        if (showdownStarted) return;
        showdownStarted = true;

        // Ensure frontend is in SHOWDOWN state before any reveal/decision messages.
        // All shortcut paths (all-in on RIVER, promptNextPlayer shortcuts, etc.) skip
        // advanceGameState(), so we must send GAME_STATE_UPDATE(SHOWDOWN) here.
        // Only do this when all community cards are already dealt (state == RIVER).
        // For PRE_FLOP/FLOP/TURN all-in, revealNextCommunityStageAllIn() handles state transitions.
        if (state == State.RIVER) {
            state = State.SHOWDOWN;
            table.sendGameStateUpdateToParticipants(state, communityCards);
        }

        LOG.infov("Starting showdown reveal sequence for session {0}", sessionId);

        List<GamePlayer> activePlayers = originalPlayerList.stream()
                .filter(GamePlayer::isInHand)
                .toList();


        if (activePlayers.size() == 1) {
            finishShowdownIfNeeded();
            return;
        }


        showdownQueue.clear();


        GamePlayer lastAggressor = originalPlayerList.stream()
                .filter(p -> p.getSeatId() == lastRaiseSeat)
                .findFirst()
                .orElse(null);

        int totalPlayers = originalPlayerList.size();
        int lastAggressorIndex = originalPlayerList.indexOf(lastAggressor);

        // If aggressor not found (folded or null), default to seat 0
        int safeStartIndex = (lastAggressorIndex < 0) ? 0 : lastAggressorIndex;

        // Start from i=0 so the last aggressor is FIRST in the queue (correct poker rule:
        // last bettor/raiser must show first, then clockwise)
        for (int i = 0; i < totalPlayers; i++) {
            int idx = (safeStartIndex + i) % totalPlayers;
            GamePlayer player = originalPlayerList.get(idx);
            if (player.isInHand()) {
                showdownQueue.add(player);
            }
        }

        LOG.infov("Normal showdown. Last aggressor {0} reveals first.",
                lastAggressor != null ? lastAggressor.getUser().getUsername() : "none");

        revealNextShowdownPlayer();
    }
    private GameHand evaluateHand(GamePlayer player) {
        return evaluateBestHandForVariant(player.getHoleCards());
    }

    private GameHand evaluateBestHandForVariant(List<GameCard> holeCards) {
        boolean isOmaha = table.getGameVariant().equals(GameVariant.OMAHA.name());
        if (isOmaha && holeCards.size() == 4 && communityCards.size() >= 3) {
            GameHand best = null;
            for (int i = 0; i < holeCards.size(); i++) {
                for (int j = i + 1; j < holeCards.size(); j++) {
                    for (int a = 0; a < communityCards.size(); a++) {
                        for (int b = a + 1; b < communityCards.size(); b++) {
                            for (int c = b + 1; c < communityCards.size(); c++) {
                                List<GameCard> five = List.of(
                                    holeCards.get(i), holeCards.get(j),
                                    communityCards.get(a), communityCards.get(b), communityCards.get(c)
                                );
                                GameHand hand = GameHandEvaluator.evaluate(five);
                                if (hand != null && (best == null || hand.compareTo(best) > 0)) best = hand;
                            }
                        }
                    }
                }
            }
            return best;
        }
        return GameHandEvaluator.evaluate(
            Stream.concat(holeCards.stream(), communityCards.stream()).toList()
        );
    }

    private void revealNextShowdownPlayer() {
        LOG.debugv("revealNextShowdownPlayer(): queue size={0}", showdownQueue.size());

        if (showdownQueue.isEmpty()) {
            revealNextCommunityStageAllIn();
            return;
        }

        GamePlayer player = showdownQueue.poll();

        if (player == null || !player.isInHand()) {
            LOG.warnv("revealNextShowdownPlayer: invalid player in queue — rescheduling (session={0})", sessionId);
            showdownScheduler.schedule(this::revealNextShowdownPlayer, 50, TimeUnit.MILLISECONDS);
            return;
        }

        GameHand hand = evaluateHand(player);

        // In an all-in showdown every remaining player must reveal — no muck option
        // since the pot is committed and community cards are still running out.
        boolean isForcedAllInShowdown = originalPlayerList.stream()
                .filter(GamePlayer::isInHand)
                .anyMatch(GamePlayer::isAllIn);

        if (player.isAllIn() || isForcedAllInShowdown) {
            reveal(player, hand);
            if (currentBestHand == null || hand.compareTo(currentBestHand) > 0) {
                updateBest(player, hand);
            }
            next();
            return;
        }

        if (currentBestHand == null) {
            reveal(player, hand);
            updateBest(player, hand);
            next();
            return;
        }

        if (hand.compareTo(currentBestHand) >= 0) {
            reveal(player, hand);
            if (hand.compareTo(currentBestHand) > 0) {
                updateBest(player, hand);
            }
            next();
        } else {
            askDecision(player);
        }
    }

    private void askDecision(GamePlayer player) {
        LOG.debugv("askDecision: player={0}", player.getUser().getUsername());

        // Bots always muck losing hands immediately using HIDE_CARDS ("нуух"),
        // not AUTO_MUCK ("хүлээгдсэн") which is reserved for human timeouts.
        if (player.isBot()) {
            LOG.infov("Bot {0} mucking losing hand", player.getUser().getUsername());
            currentActingSeat = player.getSeatId();
            player.setShowdownActed(true);
            player.setRevealApproved(false);
            table.sendPlayerActionUpdate(
                    player,
                    ActionType.HIDE_CARDS,
                    0,
                    false,
                    communityCards,
                    playerBets
            );
            next();
            return;
        }

        player.setTurnStartDate(LocalDateTime.now());
        player.setShowdownActed(false);

        currentActingSeat = player.getSeatId();

        table.sendTurnUpdateToParticipants(player, false, 5);

        showdownScheduler.schedule(() -> {
            // Skip if the hand finished or a new hand started before the timer fired.
            if (!showdownStarted || state == State.FINISHED || state == State.WAITING_FOR_PLAYERS) {
                return;
            }
            // Skip if another action (human click or bot muck) already handled this seat.
            if (currentActingSeat == null || !currentActingSeat.equals(player.getSeatId())) {
                return;
            }
            if (!player.hasActedShowdown()) {
                LOG.infov("Showdown auto-muck for player {0} (session={1})", player.getUser().getUsername(), sessionId);
                player.setShowdownActed(true);
                player.setRevealApproved(false);
                table.sendPlayerActionUpdate(player, ActionType.AUTO_MUCK, 0, true, communityCards, playerBets);
                next();
            }
        }, 5, TimeUnit.SECONDS);
    }

    /** Bot equivalent of reveal(): updates server state but never shows cards. */
    private void botMuckSilently(GamePlayer player, GameHand hand) {
        player.setRevealApproved(false);
        player.setShowdownActed(true);
        player.setTurnStartDate(LocalDateTime.now());
        table.sendPlayerActionUpdate(
                player,
                ActionType.AUTO_MUCK,
                0,
                false,
                communityCards,
                playerBets
        );
        LOG.infov("Bot {0} silently mucked at showdown", player.getUser().getUsername());
    }

    private void reveal(GamePlayer player, GameHand hand) {
        revealedHands.put(player.getSeatId(), hand);
        player.setRevealApproved(true);
        player.setTurnStartDate(LocalDateTime.now());
        table.sendTurnUpdateToParticipants(player, true);
        table.propagatePlayerEvent(
            player,
            ActionType.REVEAL_CARDS,
            0,
            player.getStack(),
            playerBets
        );

        LOG.infov("Revealed {0}", player.getUser().getUsername());
    }

    private void updateBest(GamePlayer player, GameHand hand) {
        currentBestHand = hand;
        currentBestPlayer = player;

        LOG.debugv("updateBest: new leader={0}", player.getUser().getUsername());
    }

    private void next() {
        showdownScheduler.schedule(this::revealNextShowdownPlayer, 800, TimeUnit.MILLISECONDS);
    }

    private void finishShowdownIfNeeded() {
        if (winningsCalculated) return;
        winningsCalculated = true;
        calculateWinningsAndRankHands();
        updateStacks();
        gameService.saveHandHistory(this)
            .subscribe().with(
                unused -> LOG.infov("Hand history saved for table {0}", table.getTableName()),
                failure -> LOG.errorv(failure, "Failed to save hand history for table {0}", table.getTableName())
            );
        state = State.FINISHED;
        handleFinishedState();
    }

    private void revealNextCommunityStageAllIn() {
        LOG.debugv("revealNextCommunityStageAllIn(): state={0}", state);
        switch (state) {
            case PRE_FLOP -> {
                state = State.FLOP;
                communityCards.add(destinedCommunityCards.poll());
                communityCards.add(destinedCommunityCards.poll());
                communityCards.add(destinedCommunityCards.poll());
            }
            case FLOP -> {
                state = State.TURN;
                communityCards.add(destinedCommunityCards.poll());
            }
            case TURN -> {
                state = State.RIVER;
                communityCards.add(destinedCommunityCards.poll());
            }
            case RIVER -> {
                state = State.SHOWDOWN;
            }
            default -> {}
        }

        table.sendGameStateUpdateToParticipants(state, communityCards);

        if (state != State.SHOWDOWN) {
            showdownScheduler.schedule(this::revealNextCommunityStageAllIn, 2, TimeUnit.SECONDS);
        } else {
            showdownScheduler.schedule(this::finishShowdownIfNeeded, 0, TimeUnit.SECONDS);
        }
    }

    public void handleLeave(Integer userId) {
        LOG.infov("Player {0} left the game session {1}", userId, sessionId);
        GamePlayer leavingPlayer = originalPlayerList.stream()
                .filter(player -> player.getUser().getUserId() == userId)
                .findFirst()
                .orElse(null);
        if (leavingPlayer == null) return;

        leavingPlayer.setInHand(false);
        leavingPlayer.setFolded(true);
        playerBets.remove(leavingPlayer.getSeatId());
        currentQueue.remove(leavingPlayer);

        // If the hand is already wrapping up, let that sequence finish.
        if (state == State.SHOWDOWN || state == State.FINISHED) {
            return;
        }

        long inHandCount = originalPlayerList.stream().filter(GamePlayer::isInHand).count();

        if (inHandCount <= 1) {
            LOG.infov("Only one player remaining in hand. Finishing game state early for session {0}", sessionId);
            currentActingSeat = null;
            currentQueue.clear();
            // Route through the showdown finish path: it handles the lone-player
            // case (calculateWinningsAndRankHands → updateStacks → handleFinishedState
            // → startNextGame), which resets state and clears cards/bets on clients.
            startShowdownRevealSequence();
            return;
        }

        // More than 1 player still in hand; if the leaver was acting, advance.
        if (currentPlayer != null && currentPlayer.getUser().getUserId() == userId) {
            promptNextPlayer();
        }
    }

    public void handleDisconnect(Integer userId) {
        LOG.infov("Player {0} disconnected from game session {1}", userId, sessionId);
        originalPlayerList.stream()
                .filter(player -> player.getUser().getUserId() == userId)
                .findFirst().ifPresent(disconnectedPlayer -> disconnectedPlayer.setDisconnected(true));
    }
    
    public void checkForTurnTimeouts() {
        if (State.FINISHED.equals(state)) {
            return;
        }
        if (State.SHOWDOWN.equals(state)) return;

        if (currentPlayer != null && currentPlayer.isInHand() && !currentPlayer.isAllIn()) {
            LocalDateTime now = LocalDateTime.now();
            int checkSeconds = TIMEOUT_SECONDS;
            LocalDateTime turnExpiry = currentPlayer.getTurnStartDate() == null ? null : currentPlayer.getTurnStartDate().plusSeconds(checkSeconds);
            
            if (turnExpiry != null && now.isAfter(turnExpiry)) {
                LOG.infov("Player {0} has timed out in session {1}", currentPlayer.getUser().getUsername(), sessionId);
                try {
                    int maxBet = playerBets.values().stream().max(Integer::compareTo).orElse(0);
                    int playerBet = playerBets.getOrDefault(currentPlayer.getSeatId(), 0);
                    
                    boolean shouldFold = maxBet > playerBet;
                        receivePlayerAction(
                            currentPlayer.getUser().getUserId(),
                            shouldFold ? ActionType.FOLD : ActionType.CHECK,
                            0,
                            true
                        );
                } catch (Exception e) {
                    if (State.FINISHED.equals(state)) {
                        return;
                    }
                    LOG.errorv(e, "Error handling timeout for player {0} in session {1}", currentPlayer.getUser().getUsername(), sessionId);
                    receivePlayerAction(currentPlayer.getUser().getUserId(), ActionType.FOLD, 0, true);
                }
            }
        }
    }

    public void receivePlayerAction(Integer playerId, ActionType actionType, int amount, boolean isTimeoutActed) {
        if (state == State.SHOWDOWN) {
            GamePlayer player = originalPlayerList.stream()
                .filter(p -> p.getUser().getUserId() == playerId)
                .findFirst()
                .orElse(null);

            if (player == null) return;
            if (currentActingSeat == null || player.getSeatId() != currentActingSeat) return;

            player.setShowdownActed(true);

            if (actionType == ActionType.REVEAL_CARDS) {
                GameHand hand = evaluateHand(player);
                revealedHands.put(player.getSeatId(), hand);
                player.setRevealApproved(true);
                if (hand.compareTo(currentBestHand) > 0) {
                    updateBest(player, hand);
                }
            } else {
                player.setRevealApproved(false);
                LOG.infov("{0} MUCKED", player.getUser().getUsername());
            }

            table.sendPlayerActionUpdate(player, actionType, 0, false, communityCards, playerBets);
            next();
            return;
        }

        // Reject actions arriving for a finished or not-yet-started hand.
        if (state == State.FINISHED || state == State.WAITING_FOR_PLAYERS) return;

        // Reject stale bot actions: guard against currentPlayer being null or advanced
        // past this player (e.g. timeout already acted on their behalf).
        if (currentPlayer == null) {
            LOG.warnv("receivePlayerAction: currentPlayer is null (session={0}, from playerId={1})", sessionId, playerId);
            return;
        }
        if (currentPlayer.getUser().getUserId() != playerId) {
            LOG.warnv("Stale action from player {0} ignored — acting player is {1} (session={2})",
                    playerId, currentPlayer.getUser().getUserId(), sessionId);
            return;
        }

        if (currentPlayer.isAllIn() || currentPlayer.getStack() <= 0) {
            LOG.infov("Ignoring action: player {0} is all-in or has 0 stack", currentPlayer.getUser().getUsername());
            promptNextPlayer();
            return;
        }

        // --- Process action ---
        switch (actionType) {

            case FOLD -> {
                currentPlayer.setFolded(true);
                currentPlayer.setInHand(false);
                playerBets.remove(currentPlayer.getSeatId());
            }

            case CHECK -> {
                int maxBet = playerBets.values().stream().max(Integer::compareTo).orElse(0);
                int currentBet = playerBets.getOrDefault(currentPlayer.getSeatId(), 0);
                if (maxBet > currentBet) {
                    LOG.infov("Invalid CHECK: player must call or fold.");
                    return;
                }
            }

            case CALL -> {
                int highestBet = playerBets.values().stream().max(Integer::compareTo).orElse(0);
                int currentBet = playerBets.getOrDefault(currentPlayer.getSeatId(), 0);
                int callAmount = Math.min(highestBet - currentBet, currentPlayer.getStack());
                // callAmount < 0 is invalid; callAmount == 0 means the player already
                // matches the highest bet (e.g. SB vs a partial-BB all-in). Treat it
                // as a check — skip the bet but still fall through to advance the game.
                if (callAmount < 0) return;

                if (callAmount > 0) {
                    int beforeStack = currentPlayer.getStack();
                    processBet(callAmount);
                    if (beforeStack - callAmount <= 0 || currentPlayer.getStack() == 0) {
                        setCurrentPlayerAllIn();
                    }
                }
            }

            case RAISE -> {
                int highestBet = playerBets.values().stream().max(Integer::compareTo).orElse(0);
                int currentBet = playerBets.getOrDefault(currentPlayer.getSeatId(), 0);
                int minRaise = Math.max(0, highestBet - currentBet);

                if (amount <= minRaise && amount < currentPlayer.getStack()) {
                    LOG.infov("Invalid RAISE: below minimum raise {0}", minRaise);
                    return;
                }

                // --- Edge case: everyone else is all-in ---
                boolean everyoneElseAllIn = originalPlayerList.stream()
                    .filter(p -> p.isInHand() && p.getSeatId() != currentPlayer.getSeatId())
                    .allMatch(GamePlayer::isAllIn);

                if (everyoneElseAllIn) {
                    int maxCall = originalPlayerList.stream()
                        .filter(p -> p.isInHand() && p.getSeatId() != currentPlayer.getSeatId())
                        .mapToInt(p -> playerBets.getOrDefault(p.getSeatId(), 0))
                        .max().orElse(0);

                    int callAmount = Math.min(maxCall - playerBets.getOrDefault(currentPlayer.getSeatId(), 0), currentPlayer.getStack());
                    processBet(callAmount);

                    LOG.infov("All others all-in → treating RAISE as CALL of {0}", callAmount);

                    if (currentPlayer.getStack() == 0) setCurrentPlayerAllIn();

                    currentQueue.clear();
                    startShowdownRevealSequence();
                    return;
                }

                // --- Normal raise ---
                int raiseAmount = Math.min(amount, currentPlayer.getStack());
                processBet(raiseAmount);

                lastRaiseSeat = currentPlayer.getSeatId();
                lastAggressorSeat = currentPlayer.getSeatId();

                if (currentPlayer.getStack() == 0) {
                    setCurrentPlayerAllIn();
                } else {
                    currentPlayer.setAllIn(false);
                }

                if (currentPlayer.isAllIn()) {
                    currentQueue.remove(currentPlayer);
                }

                resetActedQueue();
            }

            case ALL_IN -> {
                int allInAmount = currentPlayer.getStack();
                if (allInAmount <= 0) return;

                setCurrentPlayerAllIn();
                processBet(allInAmount);
            }

            case REVEAL_CARDS -> currentPlayer.setRevealApproved(true);
            case AUTO_MUCK -> currentPlayer.setRevealApproved(false);

            default -> LOG.infov("Action {0} ignored in current phase.", actionType);
        }
     
        if (isTimeoutActed) {
            playerStateService.markTimeout(currentPlayer);}
  

        table.sendPlayerActionUpdate(currentPlayer, actionType, amount, isTimeoutActed, communityCards, playerBets);

        long inHandCount = originalPlayerList.stream()
            .filter(GamePlayer::isInHand)
            .count();

        if (inHandCount <= 1) {
            startShowdownRevealSequence();
            return;
        }

        long nonAllInPlayersInHand = originalPlayerList.stream()
            .filter(p -> p.isInHand() && !p.isAllIn())
            .count();

        boolean allPlayersActed = currentQueue.isEmpty();
        LOG.infov("Non-all-in players remaining in hand: {0}", nonAllInPlayersInHand);

        boolean allPlayersAllIn = originalPlayerList.stream()
            .filter(p -> p.isInHand())
            .allMatch(p -> p.isAllIn());

        if (allPlayersAllIn && allPlayersActed) {
            LOG.infov("All players are all-in. Starting showdown.");
            currentActingSeat = null;
            startShowdownRevealSequence();
            return;
        }
        
        promptNextPlayer();
    }

    private void processBet(int amount) {
        int actual = bettingService.placeBet(currentPlayer, amount);

        int currentBet = playerBets.getOrDefault(currentPlayer.getSeatId(), 0);
        playerBets.put(currentPlayer.getSeatId(), currentBet + actual);

        BigDecimal jackpotContribution = BigDecimal.valueOf(actual).multiply(JACKPOT_RATE);
        userService.contributeToJackpot(jackpotContribution);

        int contributionInt = jackpotContribution.intValue();
        currentPlayer.setTotalJackpotContribution(
            currentPlayer.getTotalJackpotContribution() + contributionInt
        );
        if (currentPlayer.isAllIn()) {
            currentQueue.remove(currentPlayer);
        }
    }

    private void resetActedQueue() {
        actedQueue.clear();
        currentQueue.clear();

        int highestBet = playerBets.values().stream().max(Integer::compareTo).orElse(0);

        // Find all players who still need to act (in-hand, not all-in, and bet < highest bet)
        List<GamePlayer> toActPlayers = originalPlayerList.stream()
                .filter(p -> p.isInHand() && !p.isAllIn() && playerBets.getOrDefault(p.getSeatId(), 0) < highestBet)
                .toList();

        if (toActPlayers.isEmpty()) return;

        // Find last aggressor index
        int aggressorIndex = -1;
        for (int i = 0; i < originalPlayerList.size(); i++) {
            if (originalPlayerList.get(i).getSeatId() == lastAggressorSeat) {
                aggressorIndex = i;
                break;
            }
        }

        if (aggressorIndex == -1) {
            currentQueue.addAll(toActPlayers);
            return;
        }

        int total = originalPlayerList.size();
        for (int i = 1; i <= total; i++) {
            int idx = (aggressorIndex + i) % total;
            GamePlayer p = originalPlayerList.get(idx);
            if (toActPlayers.contains(p)) {
                currentQueue.add(p);
            }
        }

        LOG.infov("Queue rebuilt. Next up: {0}",
                currentQueue.stream().map(p -> p.getUser().getUsername()).toList());
    }
   
    private void dealCards() {
        String variant = table.getGameVariant();  
        int holeCardsCount = variant.equals(GameVariant.OMAHA.name()) ? 4 : 2;
        List<GameCard> usedCards = new ArrayList<>();

        for (GamePlayer player : originalPlayerList) {
            for (int i = 0; i < holeCardsCount; i++) {
                GameCard card = deck.drawCard();
                player.addCard(card);
                usedCards.add(card); 
            }
            player.setInHand(true);

            LOG.infov("Player {0} has {1} cards: {2}",
                player.getUser().getUsername(),
                player.getHoleCards().size(),
                player.getHoleCards());
        }

        table.sendPersonalHoleCardsToPlayers();
    }

    private void advanceGameState() {
        if (state == State.SHOWDOWN || state == State.FINISHED) {
        LOG.warnv("advanceGameState() called in terminal state {0} — skipping (session={1})", state, sessionId);
        return;
    }
        for (Integer bet : playerBets.values()) {
            pot += bet;
        }

        if (!State.SHOWDOWN.equals(state) && !State.FINISHED.equals(state)) {
            sidePots.clear();
            sidePots.addAll(createSidePots());
        }

        playerBets.clear();

        switch (state) {
            case WAITING_FOR_PLAYERS -> {
                LOG.infov("Waiting for players to join for session {0}", sessionId);
            }
            case POSTING_BLINDS -> {
                LOG.infov("Posting blinds for session {0}", sessionId);
            }

            case DEALING -> {
                LOG.infov("Posting blinds for session {0}", sessionId);
            }
            
            case PRE_FLOP -> {
                state = State.FLOP;
                LOG.infov("Transitioning to FLOP for session {0}", sessionId);
                communityCards.add(destinedCommunityCards.poll());
                communityCards.add(destinedCommunityCards.poll());
                communityCards.add(destinedCommunityCards.poll());
            }
            case FLOP -> {
                state = State.TURN;
                LOG.infov("Transitioning to TURN for session {0}", sessionId);
                communityCards.add(destinedCommunityCards.poll());
            }
            case TURN -> {
                state = State.RIVER;
                LOG.infov("Transitioning to RIVER for session {0}", sessionId);
                communityCards.add(destinedCommunityCards.poll());
            }
            case RIVER -> {
                state = State.SHOWDOWN;
                LOG.infov("Transitioning to SHOWDOWN for session {0}", sessionId);
                table.sendGameStateUpdateToParticipants(state, communityCards);
                startShowdownRevealSequence();
                return;
            }
            case SHOWDOWN ->{}
            case FINISHED -> handleFinishedState();
        }

        if (!State.SHOWDOWN.equals(state) && !State.FINISHED.equals(state)) {
            rotateQueue(dealerSeatIndex);

            for (GamePlayer gp : table.getSeats().values()) {
                LOG.infov("After rotateQueue - Seat {0}: user={1}, inHand={2}, folded={3}",
                    gp.getSeatId(),
                    gp.getUser() != null ? gp.getUser().getUsername() : "empty",
                    gp.isInHand(),
                    !gp.isInHand());
            }

            promptNextPlayer();
        }

        if (state != State.FINISHED) {
            handleGameStateUpdates();
        }    
    }

    private void handleGameStateUpdates() {
        LOG.infov("handleGameStateUpdates called. Current state: {0}", state);
        table.sendGameStateUpdateToParticipants(state, communityCards);
    }



    private void handleFinishedState() {
        state = State.FINISHED;
        handleGameStateUpdates();

        boolean isFolded = originalPlayerList.stream()
                .filter(GamePlayer::isInHand)
                .count() < 2;

        fireOnGameFinishedCallbacks();

        table.markZeroStackPlayersAtHandEnd();

        showdownScheduler.schedule(() -> {
            table.startNextGame(isFolded);
            winningsCalculated = false;
        }, 3, TimeUnit.SECONDS);
        // Prevent further task submission; the 3-second task above will still execute.
        showdownScheduler.shutdown();
    }

    private boolean shouldAct() {
        boolean shouldAct = true;
        int nonAllInPlayers = (int) originalPlayerList.stream()
                .filter(player -> player.isInHand() && !player.isAllIn())
                .count();
        if (nonAllInPlayers == 0) {
            LOG.infov("No non-all-in players left in session {0}, skipping action for current player {1}",
                    sessionId, currentPlayer.getUser().getUsername());
            shouldAct = false;
        } else if (nonAllInPlayers == 1) {
            int maxBet = playerBets.values().stream().max(Integer::compareTo).orElse(0);
            if (playerBets.getOrDefault(currentPlayer.getSeatId(), 0) >= maxBet) {
                shouldAct = false;
            }
        }
        return shouldAct;
    }
    
    private List<GameSidePot> createSidePots() {
        List<GameSidePot> pots = new ArrayList<>();
        List<GamePlayer> playersInHand = originalPlayerList.stream()
            .filter(GamePlayer::isInHand)
            .collect(Collectors.toList());

        if (playersInHand.isEmpty()) {
            return pots;
        }

        // Get all unique contribution levels, sorted
        List<Integer> contributions = playersInHand.stream()
            .map(GamePlayer::getTotalContribution)
            .sorted()
            .distinct()
            .toList();

        // ✅ FIX: Handle uncalled bets
        // If only 1 player left in hand, or if there's an uncalled bet situation
        if (playersInHand.size() == 1) {
            // Everyone folded, return everything to the last player
            GamePlayer lastPlayer = playersInHand.get(0);
            int totalPot = originalPlayerList.stream()
                .mapToInt(GamePlayer::getTotalContribution)
                .sum();
            
            GameSidePot mainPot = new GameSidePot(totalPot, List.of(lastPlayer));
            mainPot.setMainPot(true);
            pots.add(mainPot);
            return pots;
        }

        // ✅ FIX: Return uncalled bets before creating pots
        // Find the highest contribution and second highest
        int highestContribution = contributions.get(contributions.size() - 1);
        int secondHighestContribution = contributions.size() > 1 ? 
            contributions.get(contributions.size() - 2) : 0;

        // Count how many players can call the highest bet
        long playersAtHighestLevel = playersInHand.stream()
            .filter(p -> p.getTotalContribution() == highestContribution)
            .count();

        // If only 1 player at highest level, they have an uncalled bet
        if (playersAtHighestLevel == 1) {
            GamePlayer playerWithUncalledBet = playersInHand.stream()
                .filter(p -> p.getTotalContribution() == highestContribution)
                .findFirst()
                .orElse(null);

            if (playerWithUncalledBet != null) {
                int uncalledAmount = highestContribution - secondHighestContribution;
                
                LOG.infov("🔙 [UNCALLED BET] Returning {0} to player {1} (bet {2}, highest call {3})",
                    uncalledAmount, 
                    playerWithUncalledBet.getUser().getUsername(),
                    highestContribution,
                    secondHighestContribution);

                // Return the uncalled bet as winnings (not directly to stack to avoid double-counting)
                playerWithUncalledBet.setWinnings(playerWithUncalledBet.getWinnings() + uncalledAmount);
                // Reduce their contribution for pot calculation
                playerWithUncalledBet.setTotalContribution(secondHighestContribution);
                
                // Remove the highest contribution level since it's uncalled
                contributions = playersInHand.stream()
                    .map(GamePlayer::getTotalContribution)
                    .sorted()
                    .distinct()
                    .toList();
            }
        }

        // Now create side pots normally
        int previous = 0;
        for (int contribution : contributions) {
            int potAmount = 0;
            List<GamePlayer> eligible = new ArrayList<>();
            
            for (GamePlayer player : playersInHand) {
                int diff = Math.min(player.getTotalContribution(), contribution) - previous;
                if (diff > 0) {
                    potAmount += diff;
                    eligible.add(player);
                }
            }
            
            if (potAmount > 0 && !eligible.isEmpty()) {
                previous = contribution;
                GameSidePot pot = new GameSidePot(potAmount, eligible);
                if (pots.isEmpty()) pot.setMainPot(true);
                pots.add(pot);
                
                LOG.infov("💰 Created {0}: Amount={1}, Eligible={2}",
                    pot.isMainPot() ? "MAIN POT" : "SIDE POT",
                    potAmount,
                    eligible.stream().map(p -> p.getUser().getUsername()).toList());
            }
        }
        
        return pots;
    }
    
    public void calculateWinningsAndRankHands() {
        double rakePercent = table.getRakePercent();

        List<GamePlayer> activePlayers = originalPlayerList.stream()
                .filter(GamePlayer::isInHand)
                .toList();

        // Case: Only 1 active player (everyone else folded)
        // Per standard poker rules, a lone winner who wins by fold does NOT
        // have to reveal their hole cards. Do not set revealApproved here.
        if (activePlayers.size() == 1) {
            GamePlayer winner = activePlayers.get(0);
            winner.setIsWinner(true);

            int totalPot = originalPlayerList.stream()
                    .mapToInt(GamePlayer::getTotalContribution)
                    .sum();

            // Rake only applies when the flop has been dealt ("no flop, no drop").
            // Rake is calculated on the contested pot only — the winner's uncalled
            // raise (if any) is returned to them without rake.
            int rake = 0;
            if (!communityCards.isEmpty()) {
                int winnerContrib = winner.getTotalContribution();
                int maxOtherContrib = originalPlayerList.stream()
                        .filter(p -> p != winner)
                        .mapToInt(GamePlayer::getTotalContribution)
                        .max()
                        .orElse(0);
                int uncalledBet   = Math.max(0, winnerContrib - maxOtherContrib);
                int contestedPot  = totalPot - uncalledBet;
                if (contestedPot > 0) {
                    rake = Math.min((int)(contestedPot * rakePercent), RAKE_CAP);
                    table.addRakeCollected(rake);
                    totalRake += rake;
                }
            }

            winner.setWinnings(totalPot - rake);
            winner.setNetResult((totalPot - rake) - winner.getTotalContribution());
            winner.setBestHandCards(List.of());

            sidePots.clear();
            return;
        }

        // Evaluate best hands for all active players
        boolean isOmaha = table.getGameVariant().equals(GameVariant.OMAHA.name());
        for (GamePlayer player : originalPlayerList) {
            if (player.isInHand() && player.getHoleCards() != null && !player.getHoleCards().isEmpty()) {
                List<GameCard> holeCards = player.getHoleCards();
                GameHand bestHand = null;
                List<GameCard> bestHoleCards = List.of();

                if (isOmaha && holeCards.size() == 4 && communityCards.size() >= 3) {
                    // Omaha: must use exactly 2 hole cards + exactly 3 community cards
                    for (int i = 0; i < holeCards.size(); i++) {
                        for (int j = i + 1; j < holeCards.size(); j++) {
                            for (int a = 0; a < communityCards.size(); a++) {
                                for (int b = a + 1; b < communityCards.size(); b++) {
                                    for (int c = b + 1; c < communityCards.size(); c++) {
                                        List<GameCard> five = List.of(
                                            holeCards.get(i), holeCards.get(j),
                                            communityCards.get(a), communityCards.get(b), communityCards.get(c)
                                        );
                                        GameHand hand = GameHandEvaluator.evaluate(five);
                                        if (hand != null && (bestHand == null || hand.compareTo(bestHand) > 0)) {
                                            bestHand = hand;
                                            bestHoleCards = List.of(holeCards.get(i), holeCards.get(j));
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    for (int i = 0; i < holeCards.size(); i++) {
                        for (int j = i + 1; j < holeCards.size(); j++) {
                            List<GameCard> combo = List.of(holeCards.get(i), holeCards.get(j));
                            List<GameCard> fullHand = Stream.concat(combo.stream(), communityCards.stream()).toList();
                            GameHand hand = GameHandEvaluator.evaluate(fullHand);

                            if (hand != null && (bestHand == null || hand.compareTo(bestHand) > 0)) {
                                bestHand = hand;
                                bestHoleCards = combo;
                            }
                        }
                    }
                }

                player.setHand(bestHand);
                player.setBestHandCards(bestHoleCards);
            } else {
                player.setHand(null);
                player.setBestHandCards(List.of());
            }
        }

        // Clear and create side pots
        List<GameSidePot> allSidePots = createSidePots();
        sidePots.clear();
        sidePots.addAll(allSidePots);

        // Distribute each side pot
        for (GameSidePot sidePot : sidePots) {
            List<GamePlayer> eligiblePlayers = sidePot.getEligiblePlayers().stream()
                    .filter(GamePlayer::isInHand)
                    .toList();
            if (eligiblePlayers.isEmpty()) continue;

            GameHand bestHandInPot = null;
            List<GamePlayer> winners = new ArrayList<>();
            for (GamePlayer player : eligiblePlayers) {
                GameHand playerHand = player.getHand();
                if (playerHand == null) continue;

                if (bestHandInPot == null || playerHand.compareTo(bestHandInPot) > 0) {
                    bestHandInPot = playerHand;
                    winners.clear();
                    winners.add(player);
                } else if (playerHand.compareTo(bestHandInPot) == 0) {
                    winners.add(player);
                }
            }

            sidePot.addWinners(winners);

            int originalPot = sidePot.getAmount();

            int rake = 0;
            if (sidePot.isMainPot() && !communityCards.isEmpty()) {
                // "No flop, no drop": never rake a hand that ended before the flop was dealt.
                // Cap prevents disproportionate rakes on very large pots.
                int rawRake = (int) (originalPot * rakePercent);
                rake = Math.min(rawRake, RAKE_CAP);
                table.addRakeCollected(rake);
                totalRake += rake; // sync hand-level field used by createSessionDetails()
            }

            int distributablePot = originalPot - rake;
            int splitAmount = winners.isEmpty() ? 0 : distributablePot / winners.size();
            int remainder = winners.isEmpty() ? 0 : distributablePot % winners.size();

            sidePot.setWinningsPerPlayer(splitAmount);

            // Sort winners for remainder distribution
            if (remainder > 0) {
                int maxPlayers = table.getMaxPlayers();
                int dealerSeat = table.getCurrentDealer();
                winners.sort((a, b) -> {
                    int posA = (a.getSeatId() - dealerSeat + maxPlayers) % maxPlayers;
                    int posB = (b.getSeatId() - dealerSeat + maxPlayers) % maxPlayers;
                    return Integer.compare(posA, posB);
                });
            }

            int minContributionInPot = eligiblePlayers.stream()
                    .mapToInt(GamePlayer::getTotalContribution)
                    .min()
                    .orElse(0);

            // Assign winnings to winners
            for (int i = 0; i < winners.size(); i++) {
                GamePlayer winner = winners.get(i);
                int award = splitAmount + (i < remainder ? 1 : 0);
                winner.setWinnings(winner.getWinnings() + award);

                int contributionToPot = Math.min(winner.getTotalContribution(), minContributionInPot);
                winner.setNetResult(winner.getNetResult() + award - contributionToPot);
                winner.setIsWinner(true);

                if (winner.getBestHandCards() == null || winner.getBestHandCards().isEmpty()) {
                    List<GameCard> winningHoleCards = List.of();
                    if (winner.getHand() != null && winner.getHand().getRankCards() != null) {
                        winningHoleCards = winner.getHand().getRankCards().stream()
                                .filter(winner.getHoleCards()::contains)
                                .toList();
                    }
                    winner.setBestHandCards(winningHoleCards);
                }
            }

            // Determine winning community cards
            List<GameCard> winningCommunityCards = new ArrayList<>();
            if (!winners.isEmpty()) {
                GamePlayer firstWinner = winners.get(0);
                GameHand bestHand = firstWinner.getHand();
                if (bestHand != null && bestHand.getRankCards() != null) {
                    winningCommunityCards = bestHand.getRankCards().stream()
                            .filter(card -> !firstWinner.getHoleCards().contains(card))
                            .toList();
                }
            }
            sidePot.setWinningCommunityCards(winningCommunityCards);
        }


        for (GamePlayer player : originalPlayerList) {
            int totalContrib = player.getTotalContribution();
            int totalWinnings = player.getWinnings();
            player.setNetResult(totalWinnings - totalContrib); 
            pokerScoreService.updatePlayerCgp(player); 
        }

        for (GamePlayer player : originalPlayerList) {
            if (player.getUser() != null) {
                int cgp = player.getCgpScore();
                userService.updateCgp(player.getUser().getUserId(), cgp);
            }
        }

        checkAndTriggerJackpot(activePlayers);

        LOG.infov("Winnings calculated for session {0}: {1}", sessionId,
                originalPlayerList.stream()
                        .map(p -> p.getUser().getUsername() + "=" + p.getWinnings() + "/" + p.getNetResult())
                        .toList());
    }

    private void checkAndTriggerJackpot(List<GamePlayer> players) {
        GamePlayer jackpotWinner = null;
        BigDecimal jackpotPercentage = null;
        GameHandRank bestQualifyingRank = null;

        for (GamePlayer player : players) {
            if (player.getHand() == null || player.getUser() == null) continue;
            GameHandRank rank = player.getHand().getRank();

            BigDecimal pct = null;
            if (rank == GameHandRank.ROYAL_FLUSH)        pct = BigDecimal.ONE;
            else if (rank == GameHandRank.STRAIGHT_FLUSH) pct = BigDecimal.valueOf(0.5);
            else if (rank == GameHandRank.FOUR_OF_A_KIND) pct = BigDecimal.valueOf(0.2);

            if (pct != null && (bestQualifyingRank == null || rank.ordinal() > bestQualifyingRank.ordinal())) {
                jackpotWinner = player;
                jackpotPercentage = pct;
                bestQualifyingRank = rank;
            }
        }

        if (jackpotWinner == null) return;

        final Integer winnerId = jackpotWinner.getUser().getUserId();
        final BigDecimal pct = jackpotPercentage;
        userService.triggerJackpotWin(winnerId, pct)
            .subscribe().with(
                balance -> LOG.infov("Jackpot ({0}%) awarded to user {1}", pct.multiply(BigDecimal.valueOf(100)).intValue(), winnerId),
                failure -> LOG.errorv(failure, "Failed to award jackpot to user {0}", winnerId)
            );
    }


    private void updateStacks() {
        LOG.infov("Updating player stacks for session {0}", sessionId);

        for (GamePlayer player : originalPlayerList) {
            int winnings = player.getWinnings();
            int oldStack = player.getStack();
            int newStack = oldStack + winnings;

            player.setStack(newStack);

            int net = player.getNetResult();
            LOG.infov("Player {0} net result: {1}, session: {2}", 
                player.getUser().getUsername(), net, sessionId);

            if (net < 0) {
                int lostAmount = -net;
                int bonus = (int) Math.floor(lostAmount * LOSS_BONUS_RATE);

                if (bonus > 0) {
                    userService.addBonus(
                        player.getUser().getUserId(),
                        bonus,
                        "LOSS_COMPENSATION",
                        sessionId
                    );

                    LOG.infov(
                        "Loss bonus awarded: user={0}, lost={1}, bonus={2}",
                        player.getUser().getUsername(),
                        lostAmount,
                        bonus
                    );
                }
            }

            LOG.infov("Player {0} new stack: {1}", player.getUser().getUsername(), newStack);
        }

        if (table != null) {
            table.propagateCombinedPotUpdate(revealedHands, sidePots);
        }
    }

    public int getPlayersInHandCount() {
        return (int) originalPlayerList.stream()
            .filter(GamePlayer::isInHand)
            .count();
    }

    private void setCurrentPlayerAllIn() {
        currentPlayer.setAllIn(true);
    }

    public JsonObject createSessionDetails() {
        try {
            JsonObject details = new JsonObject();
            details.put("pots", sidePots);
            details.put("rake", totalRake);
            details.put("hands", revealedHands);
            details.put("players", originalPlayerList.stream()
                    .map(JsonObject::mapFrom)
                    .toList());
            return details;
        } catch (Exception e) {
            LOG.errorv(e, "Failed to create session details for session {0}", sessionId);
            return new JsonObject().put("error", "Failed to create session details");
        }
    }

    public void onGameFinished(Runnable callback) {
        if (state == State.FINISHED) {
            callback.run();
        } else {
            onFinishCallbacks.add(callback);
        }
    }

    private void fireOnGameFinishedCallbacks() {
        for (Runnable callback : onFinishCallbacks) {
            callback.run();
        }
        onFinishCallbacks.clear();
    }
    
    public boolean isWinner(GamePlayer player) {
        for (GameSidePot sidePot : sidePots) {
            for (GamePlayer gamePlayer : sidePot.getWinners()) {
                if (gamePlayer.getUser().getUserId() == player.getUser().getUserId()) {
                    return true; 
                }
            }
        }
        return false; 
    }

    public double calculateWinningPercentage(GamePlayer bot, List<GameCard> destinedCommunityCards, Map<Integer, GamePlayer> seats, int simulations) {
        int wins = 0;
        int ties = 0;

        List<GameCard> botHand = new ArrayList<>(bot.getHoleCards());
        botHand.addAll(destinedCommunityCards);
        GameHand botBestHand = GameHandEvaluator.evaluate(botHand);

        List<GameCard> usedCards = new ArrayList<>(bot.getHoleCards());
        usedCards.addAll(destinedCommunityCards);

        for (int i = 0; i < simulations; i++) {
            boolean botWinsThisRound = true;

            for (Map.Entry<Integer, GamePlayer> entry : seats.entrySet()) {
                GamePlayer opponent = entry.getValue();
                if (opponent == null || !opponent.isInHand() || opponent == bot) continue;

                List<GameCard> opponentHand = new ArrayList<>();
                if (opponent.getHoleCards() != null && !opponent.getHoleCards().isEmpty()) {
                    opponentHand.addAll(opponent.getHoleCards()); // known cards
                } else {
                    // draw 2 random cards not in usedCards
                    opponentHand.addAll(drawRandomHoleCardsExcluding(usedCards));
                }

                List<GameCard> fullOpponentHand = new ArrayList<>(opponentHand);
                fullOpponentHand.addAll(destinedCommunityCards);

                GameHand opponentBestHand = GameHandEvaluator.evaluate(fullOpponentHand);

                int cmp = botBestHand.compareTo(opponentBestHand);
                if (cmp < 0) {
                    botWinsThisRound = false;
                    break;
                } else if (cmp == 0) {
                    ties++;
                }
            }

            if (botWinsThisRound) wins++;
        }

        return (wins + ties * 0.5) / simulations;
    }

    public List<GameCard> drawRandomHoleCardsExcluding(List<GameCard> usedCards) {
        List<GameCard> deck = GameCard.fullDeck(); // assume all 52 cards
        deck.removeAll(usedCards);

        Collections.shuffle(deck);
        return deck.subList(0, 2); // draw 2 cards
    }

    private enum PreflopCategory {
        TOP_PAIR,
        PREMIUM_PAIR,
        Strong,
        OTHER
    }

    private boolean isStrongCombo(int r1, int r2) {

        int[][] strong = {
            {14,13}, {14,12}, {14,11}, {14,10},   
            {13,12}, {13,11}, {13,10}, {13,9},           
            {12,11}, {12,10}, {12,9}, {12,8},                   
            {11,10}, {11,9}, {11,8}, {11,7},                       
            {10,9},  {10,8}, {10,7}, {10,6}                       
        };

        for (int[] c : strong) {
            if ((r1 == c[0] && r2 == c[1]) ||
                (r1 == c[1] && r2 == c[0])) {
                return true;
            }
        }

        return false;
    }

    private PreflopCategory classifyPreflop(GamePlayer p) {
        GameCard c1 = p.getHoleCards().get(0);
        GameCard c2 = p.getHoleCards().get(1);

        int r1 = c1.getRank().getValue();
        int r2 = c2.getRank().getValue();

        if (r1 == r2) {
            if (r1 >= 12) {  
                return PreflopCategory.TOP_PAIR;
            }

            if (r1 >= 2) {
                return PreflopCategory.PREMIUM_PAIR;
            }
        }
        if (isStrongCombo(r1, r2))
            return PreflopCategory.Strong;

        return PreflopCategory.OTHER;
    }

    private enum PostflopStrength {
        NUTS,
        STRONG,
        MEDIUM,
        WEAK,
        OTHER,
    }

    private PostflopStrength evaluatePostflop(GamePlayer player) {

        List<GameCard> hole = player.getHoleCards();
        List<GameCard> board = getCommunityCards();

        List<GameCard> combined = new ArrayList<>();
        combined.addAll(hole);
        combined.addAll(board);

        GameHand best = GameHandEvaluator.evaluate(combined);
        GameHandRank rank = best.getRank();

        switch (rank) {

            case ROYAL_FLUSH:
            case STRAIGHT_FLUSH:
            case FOUR_OF_A_KIND:
            case FULL_HOUSE:
                return PostflopStrength.NUTS;

            case FLUSH:
            case STRAIGHT:
            case THREE_OF_A_KIND:
                return PostflopStrength.STRONG;

            case TWO_PAIR:
                return PostflopStrength.MEDIUM;
            case ONE_PAIR:
                return PostflopStrength.WEAK;

            default:
                return PostflopStrength.OTHER;
        }
    }

    /**
     * Pro ("good") bot — fully omniscient.
     *
     * Knows every card that will appear on the board (destinedCommunityCardList,
     * all 5 cards determined at deal time) and every active opponent's actual
     * hole cards. Does an exact final-hand comparison:
     *
     *   bot strictly beats every remaining active opponent  →  raise aggressively
     *   bot loses or ties against ANY active opponent       →  fold (or check if free)
     *
     * This means the pro bot only risks chips when it is the guaranteed sole winner.
     */
    private void simulateGoodBot(GamePlayer botPlayer) {
        try {
            Thread.sleep(RANDOM.nextInt(2000, 4000));

            if (botPlayer == null) return;
            if (!botPlayer.isInHand() || botPlayer.isAllIn()) return;
            if (getState() == State.SHOWDOWN || getState() == State.FINISHED) return;
            // Reject stale: timeout or another concurrent event may have acted already.
            if (currentActingSeat == null || currentActingSeat != botPlayer.getSeatId()) return;

            // Full final board — all 5 destined community cards.
            List<GameCard> fullBoard = new ArrayList<>(destinedCommunityCardList);

            // Bot's best 5-card hand using full board.
            List<GameCard> botCards = new ArrayList<>(botPlayer.getHoleCards());
            botCards.addAll(fullBoard);
            GameHand botBest = GameHandEvaluator.evaluate(botCards);

            // Compare against every active opponent using their actual hole cards.
            boolean botIsGuaranteedWinner = true;
            for (GamePlayer opponent : originalPlayerList) {
                if (opponent == botPlayer) continue;
                if (!opponent.isInHand() || opponent.isFolded()) continue;

                List<GameCard> oppHole = opponent.getHoleCards();
                if (oppHole == null || oppHole.isEmpty()) {
                    // Opponent's cards are not known (edge case) — treat as unknown
                    // and be conservative: assume we might not win.
                    botIsGuaranteedWinner = false;
                    break;
                }

                List<GameCard> oppCards = new ArrayList<>(oppHole);
                oppCards.addAll(fullBoard);
                GameHand oppBest = GameHandEvaluator.evaluate(oppCards);

                // Bot must STRICTLY beat this opponent; ties are not enough.
                if (botBest.compareTo(oppBest) <= 0) {
                    botIsGuaranteedWinner = false;
                    break;
                }
            }

            int bb          = table.getBigBlind();
            int botStack    = botPlayer.getStack();
            int botBet      = getPlayerBets().getOrDefault(botPlayer.getSeatId(), 0);
            int highestBet  = getPlayerBets().values().stream().max(Integer::compareTo).orElse(0);
            int callAmount  = Math.max(0, highestBet - botBet);
            int pot         = getPotSize();
            int minAllowed  = highestBet + Math.min(2 * bb, botStack);
            int raisePot    = Math.min(botStack, Math.max(minAllowed, callAmount + pot));

            ActionType action;
            int amount;

            if (botIsGuaranteedWinner) {
                // Guaranteed to win — always raise to extract maximum value.
                action = ActionType.RAISE;
                amount = raisePot;
            } else {
                // Not guaranteed to win — never risk chips.
                if (callAmount == 0) {
                    action = ActionType.CHECK;
                    amount = 0;
                } else {
                    action = ActionType.FOLD;
                    amount = 0;
                }
            }

            receivePlayerAction(botPlayer.getUser().getUserId(), action, amount, false);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOG.warnv("Good-bot {0} thread interrupted in session {1}", botPlayer.getUser().getUsername(), sessionId);
        }
    }

    private void simulateGame(GamePlayer botPlayer) {
        try {
            Thread.sleep(RANDOM.nextInt(2000, 3000));

            if (botPlayer == null) return;
            if (!botPlayer.isInHand() || botPlayer.isAllIn()) return;
            if (getState() == State.SHOWDOWN || getState() == State.FINISHED) return;
            // Reject stale: timeout or another concurrent event may have acted already.
            if (currentActingSeat == null || currentActingSeat != botPlayer.getSeatId()) return;

            int bb = table.getBigBlind();
            int botStack = botPlayer.getStack();
            int botBet = getPlayerBets().getOrDefault(botPlayer.getSeatId(), 0);
            int highestBet = getPlayerBets().values().stream().max(Integer::compareTo).orElse(0);
            int callAmount = Math.max(0, highestBet - botBet);

            boolean preflop = getState() == State.PRE_FLOP;
            PreflopCategory cat = classifyPreflop(botPlayer);

            int pot = getPotSize();

            int minRaise = Math.min(2 * bb, botStack);
            int minAllowedRaise = highestBet + minRaise;

            int raisePot = Math.min(botStack, Math.max(minAllowedRaise, callAmount + pot));

            ActionType action = ActionType.FOLD;
            int amount = 0;

            if (preflop) {

                switch (cat) {

                    case TOP_PAIR:
                        action = ActionType.RAISE;
                        amount = raisePot;
                        break;

                    case PREMIUM_PAIR:
                        if (callAmount == 0) {
                            action = ActionType.CHECK;
                            amount = 0;
                        } else {
                            action = ActionType.CALL;
                            amount = Math.min(callAmount, botStack);
                        }
                        break;

                    case Strong:
                        if (callAmount == 0) {
                            action = ActionType.CHECK;
                            amount = 0;
                        } else {
                            action = ActionType.CALL;
                            amount = Math.min(callAmount, botStack);
                        }
                        break;

                    default:
                        if (callAmount == 0) {
                            action = ActionType.CHECK;
                            amount = 0;
                        } else {
                            action = ActionType.FOLD;
                            amount = 0;
                        }
                        break;
                }

            } else {

                PostflopStrength pf = evaluatePostflop(botPlayer);
                boolean facingRaise = callAmount > 0;
                boolean canCall = callAmount > 0 && callAmount <= botStack;

                switch (pf) {

                    case NUTS:
                    case STRONG:
                        // Call when there's a bet to match; raise (bet) when the action is free.
                        if (canCall) {
                            action = ActionType.CALL;
                            amount = Math.min(callAmount, botStack);
                        } else {
                            action = ActionType.RAISE;
                            amount = raisePot;
                        }
                        break;

                    case MEDIUM:
                        if (facingRaise) {
                            action = ActionType.CALL;
                            amount = Math.min(callAmount, botStack);
                        } else {
                            action = ActionType.RAISE;
                            amount = raisePot;
                        }
                        break;

                    case WEAK:
                        action = facingRaise ? ActionType.FOLD : ActionType.RAISE;
                        amount = facingRaise ? 0 : raisePot;
                        break;

                    default:
                        action = facingRaise ? ActionType.FOLD : ActionType.CHECK;
                        amount = 0;
                        break;
                }
            }

            receivePlayerAction(botPlayer.getUser().getUserId(), action, amount, false);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOG.warnv("Regular-bot {0} thread interrupted in session {1}", botPlayer.getUser().getUsername(), sessionId);
        }
    }


    public Map<Integer, Tuple3<Double, Double, Double>> getMonteCarloValues() {
        return monteCarloValues;
    }

    public String getSessionId() {
        return sessionId;
    }

    public GameTable getTable() {
        return table;
    }

    public List<GamePlayer> getOriginalPlayerList() {
        return originalPlayerList;
    }

    public State getState() {
        return state;
    }

    public GamePlayer getCurrentPlayer() {
        return currentPlayer;
    }

    public int getPot() {
        return pot;
    }

    public Queue<GamePlayer> getCurrentQueue() {
        return currentQueue;
    }

    public Map<Integer, Integer> getPlayerBets() {
        return playerBets;
    }

    public List<GameCard> getCommunityCards() {
        return communityCards;
    }

    public List<GameCard> getDestinedCommunityCardList() {
        return destinedCommunityCardList;
    }

    public boolean isAllInFlip() {
        return isAllInFlip;
    }

    public void setAllInFlip(boolean allInFlip) {
        isAllInFlip = allInFlip;
    }

    public int getDealerSeatIndex() {
        return dealerSeatIndex;
    }

    public int getSmallBlindSeatIndex() {
        return smallBlindSeatIndex;
    }

    public int getBigBlindSeatIndex() {
        return bigBlindSeatIndex;
    }

    public List<GameSidePot> getSidePots() {
        return sidePots;
    }

    public Map<Integer, GamePlayer> getSeats() {
        return this.seats; 
    }

    public enum State {
        WAITING_FOR_PLAYERS,
        POSTING_BLINDS,
        DEALING,
        PRE_FLOP,
        FLOP,
        TURN,
        RIVER,
        SHOWDOWN,
        FINISHED
    }

    public enum ActionType {
        FOLD,
        SMALL_BLIND,
        BIG_BLIND,
        CALL,
        RAISE,
        CHECK,
        REVEAL_CARDS,
        HIDE_CARDS,
        AUTO_MUCK,
        ALL_IN
    }

    public void setCurrentPlayer(GamePlayer player) {
        this.currentPlayer = player;
        if (player != null) {
            player.setTurnStartDate(LocalDateTime.now()); 
        }
    }

    public boolean isFinished() {
        return state == State.FINISHED;
    }
    
    public int getPotSize() {
        int currentStreetBets = playerBets.values().stream().mapToInt(Integer::intValue).sum();
        return pot + currentStreetBets;
    }
}
    
