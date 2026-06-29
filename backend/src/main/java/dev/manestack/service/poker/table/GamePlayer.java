package dev.manestack.service.poker.table;

import dev.manestack.service.poker.card.GameCard;
import dev.manestack.service.poker.card.GameHand;
import dev.manestack.service.user.User;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class GamePlayer {
    private User user;
    private Integer seatId;
    private Integer stack;
    private Integer winnings = 0;
    private boolean inHand = false;
    private boolean isAllIn = false;
    private boolean isRevealApproved = false;
    private boolean isDisconnected = false;
    private boolean isTimeoutActed = false;
    private boolean isSittingOut = false;
    private Integer timeoutCount = 0;
    private LocalDateTime timeoutActionDate = null;
    private Integer totalContribution = 0;
    private Integer accountedContribution = 0;
    private LocalDateTime turnStartDate = null;
    private LocalDateTime disconnectedAt = null;
    private LocalDateTime sitOutStartDate = null;
    private LocalDateTime noBalanceStartDate = null;
    private int lastActiveTurn;
    private boolean isWinner;
    private boolean isMainPotWinner;
    private GameHand hand;
    private List<GameCard> bestHandCards = new ArrayList<>();
    private boolean bot;
    private boolean goodBot;
    private int totalJackpotContribution = 0;
    private int netResult;
    private boolean folded;
    private String winningDescription;
    private Boolean revealChoice = null; 
    private LocalDateTime zeroStackStartDate;
    private final List<GameCard> holeCards = new ArrayList<>();
    private int botRecharges = 0;
    private int cgpScore;
    private long seatedAt;
    private boolean showdownActed = false;
    // Recharges issued mid-hand are held here until the hand ends; only
    // then are these chips added to the live stack.
    private int pendingRecharge = 0;



    public boolean isBot() {
        return bot;
    }

    public void setBot(boolean bot) {
        this.bot = bot;
    }

    public boolean isGoodBot() {
        return goodBot;
    }

    public void setGoodBot(boolean goodBot) {
        this.goodBot = goodBot;
    }

    public GamePlayer(User user, int stack) {
        this.user = user;
        this.stack = stack;
    }

     public boolean isWinner() {
        return isWinner;
    }

    public void setIsWinner(boolean isWinner) {
        this.isWinner = isWinner;
    }

    public GameHand getHand() {
        return hand;
    }

    public List<GameCard> getBestHandCards() {
        return bestHandCards;
    }

    public void setBestHandCards(List<GameCard> bestHandCards) {
        this.bestHandCards = bestHandCards;
    }

    public void setHand(GameHand hand) {
        this.hand = hand;
    }

    public boolean isMainPotWinner() {
        return isMainPotWinner;
    }
    
    public void setIsMainPotWinner(boolean mainPotWinner) {
        this.isMainPotWinner = mainPotWinner;
    }

    public GamePlayer(User user, Integer balance) {
        this.stack = balance;
        this.user = user;
        this.cgpScore = user.getCgpScore(); 
    }

    public Integer getSeatId() {
        return seatId;
    }

    public void setSeatId(Integer seatId) {
        this.seatId = seatId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Integer getStack() {
        return stack;
    }

    public void setStack(Integer stack) {
        this.stack = stack;
    }

    public void addCard(GameCard gameCard) {
        holeCards.add(gameCard);
    }

    public void refreshHoleCards() {
        holeCards.clear();
    }

    public boolean isDisconnected() {
        return isDisconnected;
    }
    public void setTimeoutActed(boolean timeoutActed) {
        this.isTimeoutActed = timeoutActed;
    }

    public void setDisconnected(boolean disconnected) {
        if (disconnected) {
            this.disconnectedAt = LocalDateTime.now();
        } else {
            this.disconnectedAt = null;
        }
        isDisconnected = disconnected;
    }

    public boolean isAllIn() {
        return isAllIn;
    }

    public void setAllIn(boolean allIn) {
        isAllIn = allIn;
    }

    public Integer getTotalContribution() {
        return totalContribution;
    }

    public void setTotalContribution(Integer totalContribution) {
        this.totalContribution = totalContribution;
    }


    public Integer getAccountedContribution() {
        return accountedContribution;
    }

    public void setAccountedContribution(Integer accountedContribution) {
        this.accountedContribution = accountedContribution;
    }

    public void refreshAccountedContribution() {
        this.accountedContribution = totalContribution;
    }

    public void deductFromAccountedContribution(int amount) {
        this.accountedContribution = Math.max(0, this.accountedContribution - amount);
    }

    public void resetTotalContribution() {
        this.totalContribution = 0;
    }

    public boolean isInHand() {
        return inHand;
    }
    public void setInHand(boolean inHand) {
        this.inHand = inHand;
    }
    public LocalDateTime getTurnStartDate() {
        return turnStartDate;
    }

    public void setTurnStartDate(LocalDateTime turnStartDate) {
        this.turnStartDate = turnStartDate;
    }
    public LocalDateTime getZeroStackStartDate() {
        return zeroStackStartDate;
    }
    public void setZeroStackStartDate(LocalDateTime zeroStackStartDate) {
        this.zeroStackStartDate = zeroStackStartDate;
    }

    public boolean isTimeoutActed() {
        return isTimeoutActed;
    }
    public Integer getTimeoutCount() {
        return timeoutCount;
    }
    public void setTimeoutCount(Integer timeoutCount) {
        this.timeoutCount = timeoutCount;
    }

 

    public LocalDateTime getTimeoutActionDate() {
        return timeoutActionDate;
    }

    public void setTimeoutActionDate(LocalDateTime timeoutActionDate) {
        this.timeoutActionDate = timeoutActionDate;
    }

    public Integer getWinnings() {
        return winnings;
    }

    public void setWinnings(int winnings) {
        this.winnings = winnings;
    }
    
    public int getNetResult() {
        return netResult;
    }

    public void setNetResult(int netResult) {
        this.netResult = netResult;
    }

    public LocalDateTime getDisconnectedAt() {
        return disconnectedAt;
    }

    public boolean isSittingOut() {
        return isSittingOut;
    }

    public void setSittingOut(boolean sittingOut) {
        this.isSittingOut = sittingOut;
        if (sittingOut && this.sitOutStartDate == null) {
            this.sitOutStartDate = LocalDateTime.now();
        } else if (!sittingOut) {
            this.sitOutStartDate = null;
        }
    }

    public LocalDateTime getSitOutStartDate() {
        return sitOutStartDate;
    }

    public List<GameCard> getHoleCards() {
        return holeCards;
    }

    public void setRevealApproved(boolean revealApproved) {
        isRevealApproved = revealApproved;
    }

    public boolean isRevealApproved() {
        return isRevealApproved;
    }

    public int getLastActiveTurn() {
        return lastActiveTurn;
    }

    public void setLastActiveTurn(int lastActiveTurn) {
        this.lastActiveTurn = lastActiveTurn;
    }

    public LocalDateTime getNoBalanceStartDate() {
        return noBalanceStartDate;
    }

    public void setNoBalanceStartDate(LocalDateTime noBalanceStartDate) {
        this.noBalanceStartDate = noBalanceStartDate;
    }

    public int getTotalJackpotContribution() {
        return totalJackpotContribution;
    }

    public void setTotalJackpotContribution(int contribution) {
        this.totalJackpotContribution = contribution;
    }

    public void addToTotalJackpotContribution(int delta) {
        this.totalJackpotContribution = this.getTotalJackpotContribution() + delta;
    }

    public boolean isFolded() {
        return folded;
    }

     public void setFolded(boolean folded) {
        this.folded = folded;
    }

    private int pendingExcess = 0;

    public int getPendingExcess() {
        return pendingExcess;
    }

    public void addPendingExcess(int amount) {
        pendingExcess += amount;
    }

    public void resetPendingExcess() {
        pendingExcess = 0;
    }

    public String getWinningDescription() {
        return winningDescription;
    }

    public void setWinningDescription(String winningDescription) {
        this.winningDescription = winningDescription;
    }

    public Boolean wantsToReveal() {
        return revealChoice;
    }

    public void setRevealChoice(Boolean choice) {
        this.revealChoice = choice;
    }

    public int getBotRecharges() {
        return botRecharges;
    }

    public void incrementBotRecharges() {
        botRecharges++;
    }

    public int getCgpScore() {
        return cgpScore;
    }

    public void setCgpScore(int cgpScore) {
        this.cgpScore = cgpScore;
    }

    public void adjustCgpScore(int delta) {
        this.cgpScore += delta;
    }

    public long getSeatedAt() {
        return seatedAt;
    }

    public void setSeatedAt(long seatedAt) {
        this.seatedAt = seatedAt;
    }

    public boolean hasActedShowdown() {
        return showdownActed;
    }

    public void setShowdownActed(boolean showdownActed) {
        this.showdownActed = showdownActed;
    }

    public int getPendingRecharge() {
        return pendingRecharge;
    }

    public void setPendingRecharge(int pendingRecharge) {
        this.pendingRecharge = pendingRecharge;
    }

    public void addPendingRecharge(int amount) {
        this.pendingRecharge += amount;
    }



    @Override
    public String toString() {
        return "GamePlayer{" +
               "user=" + user +
                ", seatId=" + seatId +
                ", stack=" + stack +
                ", winnings=" + winnings +
                ", inHand=" + inHand +
                ", isAllIn=" + isAllIn +
                ", isDisconnected=" + isDisconnected +
                ", isTimeoutActed=" + isTimeoutActed +
                ", totalContribution=" + totalContribution +
                ", turnStartDate=" + turnStartDate +
                ", disconnectedAt=" + disconnectedAt +
                ", holeCards=" + holeCards +
                ", isWinner=" + isWinner + 
                ", isFolded=" + folded + 
                '}';
    }
}
