declare module "@fhevm/mock-utils" {
  import { JsonRpcProvider } from "ethers";
  
  export interface MockFhevmInstanceConfig {
    aclContractAddress: string;
    chainId: number;
    gatewayChainId: number;
    inputVerifierContractAddress: string;
    kmsContractAddress: string;
    verifyingContractAddressDecryption: string;
    verifyingContractAddressInputVerification: string;
  }
  
  export interface MockFhevmInstanceProperties {
    inputVerifierProperties?: Record<string, unknown>;
    kmsVerifierProperties?: Record<string, unknown>;
  }
  
  export class MockFhevmInstance {
    static create(
      provider: JsonRpcProvider,
      gatewayProvider: JsonRpcProvider,
      config: MockFhevmInstanceConfig,
      properties?: MockFhevmInstanceProperties
    ): Promise<MockFhevmInstance>;
  }
}

