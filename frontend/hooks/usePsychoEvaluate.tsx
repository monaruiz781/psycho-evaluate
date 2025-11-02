"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { PSYCHO_EVALUATE_ABI } from "@/contracts/PsychoEvaluate.abi";

type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type PsychoEvaluateInfoType = {
  abi: typeof PSYCHO_EVALUATE_ABI;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getPsychoEvaluateByChainId(
  chainId: number | undefined
): PsychoEvaluateInfoType {
  if (!chainId) {
    return { abi: PSYCHO_EVALUATE_ABI };
  }

  // Try to import contract addresses from generated file
  let deployedAddress: `0x${string}` | undefined;
  try {
    // Dynamic import to handle case where file doesn't exist yet
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const addressesModule = require("@/contracts/addresses");
    deployedAddress = addressesModule.getContractAddress(chainId, "PsychoEvaluate") as `0x${string}` | undefined;
  } catch (e) {
    // Fallback to environment variable if addresses file doesn't exist
    deployedAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  }

  if (!deployedAddress || deployedAddress === ethers.ZeroAddress) {
    return { abi: PSYCHO_EVALUATE_ABI, chainId };
  }

  return {
    address: deployedAddress,
    chainId: chainId,
    abi: PSYCHO_EVALUATE_ABI,
  };
}

export const usePsychoEvaluate = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [stressHandle, setStressHandle] = useState<string | undefined>(undefined);
  const [eScoreHandle, setEScoreHandle] = useState<string | undefined>(undefined);
  const [nScoreHandle, setNScoreHandle] = useState<string | undefined>(undefined);
  const [clearStress, setClearStress] = useState<ClearValueType | undefined>(undefined);
  const [clearEScore, setClearEScore] = useState<ClearValueType | undefined>(undefined);
  const [clearNScore, setClearNScore] = useState<ClearValueType | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [hasAssessment, setHasAssessment] = useState<boolean>(false);

  const psychoEvaluateRef = useRef<PsychoEvaluateInfoType | undefined>(undefined);
  const isSubmittingRef = useRef<boolean>(isSubmitting);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isRefreshingRef = useRef<boolean>(isRefreshing);

  const psychoEvaluate = useMemo(() => {
    const c = getPsychoEvaluateByChainId(chainId);
    psychoEvaluateRef.current = c;
    // Only show deployment message when chainId is known but no contract address is configured
    if (chainId !== undefined && !c.address) {
      setMessage(`Contract not deployed on this network. Please deploy the contract or switch to a supported network.`);
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!psychoEvaluate) {
      return undefined;
    }
    return Boolean(psychoEvaluate.address) && psychoEvaluate.address !== ethers.ZeroAddress;
  }, [psychoEvaluate]);

  const canSubmit = useMemo(() => {
    return (
      psychoEvaluate.address &&
      instance &&
      ethersSigner &&
      !isSubmitting &&
      !isRefreshing
    );
  }, [psychoEvaluate.address, instance, ethersSigner, isSubmitting, isRefreshing]);

  const canDecrypt = useMemo(() => {
    return (
      psychoEvaluate.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      (stressHandle || eScoreHandle || nScoreHandle) &&
      stressHandle !== ethers.ZeroHash
    );
  }, [
    psychoEvaluate.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    stressHandle,
    eScoreHandle,
    nScoreHandle,
  ]);

  const canGetAssessment = useMemo(() => {
    return psychoEvaluate.address && ethersReadonlyProvider && !isRefreshing;
  }, [psychoEvaluate.address, ethersReadonlyProvider, isRefreshing]);

  const checkHasAssessment = useCallback(async () => {
    if (!psychoEvaluate.address || !ethersReadonlyProvider || !ethersSigner) {
      return;
    }

    try {
      const contract = new ethers.Contract(
        psychoEvaluate.address,
        psychoEvaluate.abi,
        ethersReadonlyProvider
      );
      const userAddress = await ethersSigner.getAddress();
      const has = await contract.hasAssessment(userAddress);
      setHasAssessment(has);
    } catch (e) {
      console.error("Error checking assessment:", e);
    }
  }, [psychoEvaluate.address, ethersReadonlyProvider, ethersSigner]);

  useEffect(() => {
    checkHasAssessment();
  }, [checkHasAssessment]);

  const refreshAssessment = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }

    if (
      !psychoEvaluateRef.current ||
      !psychoEvaluateRef.current?.chainId ||
      !psychoEvaluateRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setStressHandle(undefined);
      setEScoreHandle(undefined);
      setNScoreHandle(undefined);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = psychoEvaluateRef.current.chainId;
    const thisContractAddress = psychoEvaluateRef.current.address;

    const contract = new ethers.Contract(
      thisContractAddress,
      psychoEvaluateRef.current.abi,
      ethersReadonlyProvider
    );

    contract
      .getAssessment()
      .then((result: [string, string, string, bigint]) => {
        if (
          sameChain.current(thisChainId) &&
          thisContractAddress === psychoEvaluateRef.current?.address
        ) {
          setStressHandle(result[0]);
          setEScoreHandle(result[1]);
          setNScoreHandle(result[2]);
        }
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e: unknown) => {
        setMessage("Failed to retrieve assessment data. Please try again.");
        console.error("getAssessment error:", e);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, sameChain]);

  useEffect(() => {
    if (hasAssessment) {
      refreshAssessment();
    }
  }, [hasAssessment, refreshAssessment]);

  const submitAssessment = useCallback(
    (answers: number[]) => {
      if (isSubmittingRef.current || isRefreshingRef.current) {
        return;
      }

      if (!psychoEvaluate.address || !instance || !ethersSigner || answers.length !== 15) {
        return;
      }

      const thisChainId = chainId;
      const thisContractAddress = psychoEvaluate.address;
      const thisEthersSigner = ethersSigner;

      const contract = new ethers.Contract(
        thisContractAddress,
        psychoEvaluate.abi,
        thisEthersSigner
      );

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Preparing your assessment...");

      const run = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisContractAddress !== psychoEvaluateRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const userAddress = await thisEthersSigner.getAddress();
          const input = instance.createEncryptedInput(
            thisContractAddress,
            userAddress
          );

          // Add all 15 answers
          for (let i = 0; i < 15; i++) {
            if (answers[i] < 1 || answers[i] > 5) {
              throw new Error(`Answer ${i} must be between 1 and 5`);
            }
            input.add32(answers[i]);
          }

          setMessage("Encrypting your responses...");
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Submission cancelled due to network or account change.");
            return;
          }

          setMessage("Sending encrypted data to blockchain...");

          // Prepare arrays for contract call
          const handles = enc.handles;
          const inputProof = enc.inputProof;

          const tx: ethers.TransactionResponse = await contract.submitAssessment(
            handles,
            inputProof
          );

          setMessage("Waiting for transaction confirmation...");

          const receipt = await tx.wait();

          if (receipt?.status === 1) {
            setMessage("Assessment submitted successfully!");
          } else {
            setMessage("Transaction completed but may have failed. Please check your wallet.");
          }

          if (isStale()) {
            setMessage("Submission cancelled due to network or account change.");
            return;
          }

          setHasAssessment(true);
          refreshAssessment();
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          if (errorMessage.includes("user rejected")) {
            setMessage("Transaction cancelled by user.");
          } else if (errorMessage.includes("insufficient funds")) {
            setMessage("Insufficient funds to complete transaction.");
          } else {
            setMessage("Failed to submit assessment. Please try again.");
          }
          console.error("Submission error:", e);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      psychoEvaluate.address,
      psychoEvaluate.abi,
      instance,
      chainId,
      refreshAssessment,
      sameChain,
      sameSigner,
    ]
  );

  const decryptResults = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) {
      return;
    }

    if (!psychoEvaluate.address || !instance || !ethersSigner) {
      return;
    }

    if (!stressHandle || stressHandle === ethers.ZeroHash) {
      return;
    }

    const thisChainId = chainId;
    const thisContractAddress = psychoEvaluate.address;
    const thisStressHandle = stressHandle;
    const thisEScoreHandle = eScoreHandle;
    const thisNScoreHandle = nScoreHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Preparing to decrypt your results...");

    const run = async () => {
      const isStale = () =>
        thisContractAddress !== psychoEvaluateRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [psychoEvaluate.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to create decryption signature. Please try again.");
          return;
        }

        if (isStale()) {
          setMessage("Decryption cancelled due to network or account change.");
          return;
        }

        setMessage("Decrypting encrypted data...");

        const handles: Array<{ handle: string; contractAddress: string }> = [];
        if (thisStressHandle && thisStressHandle !== ethers.ZeroHash) {
          handles.push({ handle: thisStressHandle, contractAddress: thisContractAddress });
        }
        if (thisEScoreHandle && thisEScoreHandle !== ethers.ZeroHash) {
          handles.push({ handle: thisEScoreHandle, contractAddress: thisContractAddress });
        }
        if (thisNScoreHandle && thisNScoreHandle !== ethers.ZeroHash) {
          handles.push({ handle: thisNScoreHandle, contractAddress: thisContractAddress });
        }

        const res = await instance.userDecrypt(
          handles,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("Decryption complete! Your results are now visible.");

        if (isStale()) {
          setMessage("Decryption cancelled due to network or account change.");
          return;
        }

        if (thisStressHandle && res[thisStressHandle as `0x${string}`] !== undefined) {
          setClearStress({ handle: thisStressHandle, clear: res[thisStressHandle as `0x${string}`] });
        }
        if (thisEScoreHandle && res[thisEScoreHandle as `0x${string}`] !== undefined) {
          setClearEScore({ handle: thisEScoreHandle, clear: res[thisEScoreHandle as `0x${string}`] });
        }
        if (thisNScoreHandle && res[thisNScoreHandle as `0x${string}`] !== undefined) {
          setClearNScore({ handle: thisNScoreHandle, clear: res[thisNScoreHandle as `0x${string}`] });
        }

        setMessage("Results decrypted successfully!");
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setMessage("Failed to decrypt results. Please try again.");
        console.error("Decryption error:", errorMessage);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    psychoEvaluate.address,
    instance,
    stressHandle,
    eScoreHandle,
    nScoreHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  return {
    contractAddress: psychoEvaluate.address,
    canSubmit,
    canDecrypt,
    canGetAssessment,
    submitAssessment,
    decryptResults,
    refreshAssessment,
    message,
    clearStress: clearStress?.clear,
    clearEScore: clearEScore?.clear,
    clearNScore: clearNScore?.clear,
    stressHandle,
    eScoreHandle,
    nScoreHandle,
    isDecrypting,
    isRefreshing,
    isSubmitting,
    isDeployed,
    hasAssessment,
  };
};

