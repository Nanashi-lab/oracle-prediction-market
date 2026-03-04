// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PredictionMarket {
    uint256 public constant MIN_BET = 0.001 ether;

    address public owner;
    address public oracle;

    struct Market {
        string name;
        uint8 numChoices;
        uint256 currentRound;
        bool active;
    }

    struct Round {
        bool resolved;
        bool bettingClosed;
        uint8 winningChoice;
        uint256 totalPool;
        mapping(uint8 => uint256) choicePool;       // choice => total ETH on that choice
        mapping(address => Bet) bets;                // bettor => their bet
        address[] bettors;
    }

    struct Bet {
        uint8 choice;
        uint256 amount;
        bool claimed;
        bool exists;
    }

    // marketId => Market
    mapping(bytes32 => Market) public markets;
    bytes32[] public marketIds;

    // marketId => roundNumber => Round
    mapping(bytes32 => mapping(uint256 => Round)) internal rounds;

    event MarketCreated(bytes32 indexed marketId, string name, uint8 numChoices);
    event BetPlaced(bytes32 indexed marketId, uint256 indexed round, address indexed bettor, uint8 choice, uint256 amount);
    event BettingClosed(bytes32 indexed marketId, uint256 indexed round);
    event RoundResolved(bytes32 indexed marketId, uint256 indexed round, uint8 winningChoice);
    event WinningsClaimed(bytes32 indexed marketId, uint256 indexed round, address indexed bettor, uint256 payout);
    event NewRoundStarted(bytes32 indexed marketId, uint256 indexed round);
    event SettlementRequested(bytes32 indexed marketId, string question);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    constructor(address _oracle) {
        owner = msg.sender;
        oracle = _oracle;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function createMarket(string calldata name, uint8 numChoices) external onlyOwner returns (bytes32) {
        require(numChoices >= 2, "Need at least 2 choices");
        bytes32 id = keccak256(abi.encodePacked(name, block.timestamp));
        require(!markets[id].active, "Market exists");

        markets[id] = Market({
            name: name,
            numChoices: numChoices,
            currentRound: 1,
            active: true
        });
        marketIds.push(id);

        emit MarketCreated(id, name, numChoices);
        emit NewRoundStarted(id, 1);
        return id;
    }

    function placeBet(bytes32 marketId, uint8 choice) external payable {
        Market storage market = markets[marketId];
        require(market.active, "Market not active");
        require(choice < market.numChoices, "Invalid choice");
        require(msg.value >= MIN_BET, "Below minimum bet");

        uint256 roundNum = market.currentRound;
        Round storage round = rounds[marketId][roundNum];
        require(!round.bettingClosed, "Betting closed");
        require(!round.bets[msg.sender].exists, "Already bet this round");

        round.bets[msg.sender] = Bet({
            choice: choice,
            amount: msg.value,
            claimed: false,
            exists: true
        });
        round.bettors.push(msg.sender);
        round.choicePool[choice] += msg.value;
        round.totalPool += msg.value;

        emit BetPlaced(marketId, roundNum, msg.sender, choice, msg.value);
    }

    function closeBetting(bytes32 marketId) external onlyOracle {
        Market storage market = markets[marketId];
        uint256 roundNum = market.currentRound;
        Round storage round = rounds[marketId][roundNum];
        require(!round.bettingClosed, "Already closed");

        round.bettingClosed = true;
        emit BettingClosed(marketId, roundNum);
    }

    function resolveRound(bytes32 marketId, uint256 roundNum, uint8 winningChoice) external onlyOracle {
        Market storage market = markets[marketId];
        require(market.active, "Market not active");
        require(roundNum == market.currentRound, "Wrong round");
        require(winningChoice < market.numChoices, "Invalid choice");

        Round storage round = rounds[marketId][roundNum];
        require(!round.resolved, "Already resolved");

        round.bettingClosed = true;
        round.resolved = true;
        round.winningChoice = winningChoice;

        // Start next round
        market.currentRound = roundNum + 1;

        emit RoundResolved(marketId, roundNum, winningChoice);
        emit NewRoundStarted(marketId, roundNum + 1);
    }

    function claimWinnings(bytes32 marketId, uint256 roundNum) external {
        Round storage round = rounds[marketId][roundNum];
        require(round.resolved, "Round not resolved");

        Bet storage bet = round.bets[msg.sender];
        require(bet.exists, "No bet found");
        require(!bet.claimed, "Already claimed");

        bet.claimed = true;

        if (bet.choice != round.winningChoice) {
            // Loser, nothing to claim
            return;
        }

        uint256 winnerPool = round.choicePool[round.winningChoice];
        // payout = (your stake / winner pool) * total pool
        uint256 payout = (bet.amount * round.totalPool) / winnerPool;

        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        require(sent, "Transfer failed");

        emit WinningsClaimed(marketId, roundNum, msg.sender, payout);
    }

    function requestSettlement(bytes32 marketId, string calldata question) external {
        Market storage market = markets[marketId];
        require(market.active, "Market not active");
        uint256 roundNum = market.currentRound;
        Round storage round = rounds[marketId][roundNum];
        require(!round.resolved, "Round already resolved");
        emit SettlementRequested(marketId, question);
    }

    // --- View functions ---

    function getRoundInfo(bytes32 marketId, uint256 roundNum) external view returns (
        bool resolved,
        bool bettingClosed,
        uint8 winningChoice,
        uint256 totalPool,
        uint256[] memory choicePools
    ) {
        Round storage round = rounds[marketId][roundNum];
        Market storage market = markets[marketId];

        choicePools = new uint256[](market.numChoices);
        for (uint8 i = 0; i < market.numChoices; i++) {
            choicePools[i] = round.choicePool[i];
        }

        return (round.resolved, round.bettingClosed, round.winningChoice, round.totalPool, choicePools);
    }

    function getMyBet(bytes32 marketId, uint256 roundNum, address bettor) external view returns (
        uint8 choice,
        uint256 amount,
        bool claimed,
        bool exists
    ) {
        Bet storage bet = rounds[marketId][roundNum].bets[bettor];
        return (bet.choice, bet.amount, bet.claimed, bet.exists);
    }

    function getMarketCount() external view returns (uint256) {
        return marketIds.length;
    }

    function getCurrentRound(bytes32 marketId) external view returns (uint256) {
        return markets[marketId].currentRound;
    }
}
