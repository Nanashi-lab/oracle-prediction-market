export const PREDICTION_MARKET_ADDRESS = '0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3'

export const ALPHA_MARKET_ID = '0x1fe5dedefa1235641c90bd8fa60aed75e242cb310c788962ec7bddd81271530c'

export const TENDERLY_CHAIN_ID = 99911155111

export const TENDERLY_RPC = 'https://virtual.rpc.tenderly.co/nanashi-lab/project/private/tenderly/ea4c0fcb-8695-49a7-8e50-7d7087419059'

export const TENDERLY_NETWORK = {
  chainId: `0x${TENDERLY_CHAIN_ID.toString(16)}`,
  chainName: 'Tenderly Virtual Sepolia',
  rpcUrls: [TENDERLY_RPC],
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
}

// Minimal ABI for the functions we call
export const PREDICTION_MARKET_ABI = [
  'function placeBet(bytes32 marketId, uint8 choice) external payable',
  'function claimWinnings(bytes32 marketId, uint256 roundNum) external',
  'function resolveRound(bytes32 marketId, uint256 roundNum, uint8 winningChoice) external',
  'function closeBetting(bytes32 marketId) external',
  'function getRoundInfo(bytes32 marketId, uint256 roundNum) external view returns (bool resolved, bool bettingClosed, uint8 winningChoice, uint256 totalPool, uint256[] choicePools)',
  'function getMyBet(bytes32 marketId, uint256 roundNum, address bettor) external view returns (uint8 choice, uint256 amount, bool claimed, bool exists)',
  'function getCurrentRound(bytes32 marketId) external view returns (uint256)',
  'function markets(bytes32) external view returns (string name, uint8 numChoices, uint256 currentRound, bool active)',
  'event BetPlaced(bytes32 indexed marketId, uint256 indexed round, address indexed bettor, uint8 choice, uint256 amount)',
  'event RoundResolved(bytes32 indexed marketId, uint256 indexed round, uint8 winningChoice)',
  'event WinningsClaimed(bytes32 indexed marketId, uint256 indexed round, address indexed bettor, uint256 payout)',
] as const
