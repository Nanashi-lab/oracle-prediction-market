import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    tenderly: {
      url: "https://virtual.rpc.tenderly.co/nanashi-lab/project/private/tenderly/ea4c0fcb-8695-49a7-8e50-7d7087419059",
      chainId: 99911155111,
    },
  },
};

export default config;
