"use client";

import { useState, useEffect } from "react";
import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { usePsychoEvaluate } from "@/hooks/usePsychoEvaluate";

const QUESTIONNAIRE = [
  // Stress questions (0-4)
  { category: "Stress", text: "I feel overwhelmed by my daily responsibilities" },
  { category: "Stress", text: "I have trouble sleeping due to stress" },
  { category: "Stress", text: "I feel anxious about the future" },
  { category: "Stress", text: "I experience physical tension or headaches" },
  { category: "Stress", text: "I find it hard to relax" },
  // Extroversion questions (5-9)
  { category: "Extroversion", text: "I enjoy being around large groups of people" },
  { category: "Extroversion", text: "I feel energized after social interactions" },
  { category: "Extroversion", text: "I prefer to think out loud rather than silently" },
  { category: "Extroversion", text: "I am comfortable being the center of attention" },
  { category: "Extroversion", text: "I make friends easily" },
  // Intuition questions (10-14)
  { category: "Intuition", text: "I focus on possibilities and potential" },
  { category: "Intuition", text: "I prefer abstract concepts over concrete details" },
  { category: "Intuition", text: "I trust my gut feelings" },
  { category: "Intuition", text: "I enjoy brainstorming and generating ideas" },
  { category: "Intuition", text: "I see patterns and connections others might miss" },
];

const SCALE_LABELS = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree"
];

export const PsychoEvaluateDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const psychoEvaluate = usePsychoEvaluate({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [answers, setAnswers] = useState<number[]>(Array(15).fill(3));
  const [showForm, setShowForm] = useState<boolean>(true);
  const [userOverride, setUserOverride] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [canViewResults, setCanViewResults] = useState<boolean>(false);

  // After a submission, once tx is mined and assessment is available, show "View Results"
  useEffect(() => {
    if (submitted && !psychoEvaluate.isSubmitting && psychoEvaluate.hasAssessment) {
      setCanViewResults(true);
    }
  }, [submitted, psychoEvaluate.isSubmitting, psychoEvaluate.hasAssessment]);

  const handleAnswerChange = (index: number, value: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setCanViewResults(false);
    setUserOverride(false);
    psychoEvaluate.submitAssessment(answers);
  };

  const getFhevmStatusDisplay = () => {
    switch (fhevmStatus) {
      case "ready":
        return "Ready";
      case "loading":
        return "Loading...";
      case "idle":
        return "Initializing...";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  // Connection Screen
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              PsychoEvaluate
            </h1>
            <p className="text-gray-600 mb-6">
              Privacy-Preserving Psychological Assessment
            </p>
            <p className="text-sm text-gray-500">
              Connect your wallet to begin your secure, encrypted psychological assessment
            </p>
          </div>
          <button
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-md"
            onClick={connect}
          >
            Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  // Contract Not Deployed Screen
  if (chainId !== undefined && psychoEvaluate.isDeployed === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Contract Not Deployed
            </h2>
            <p className="text-gray-600 mb-4">
              The PsychoEvaluate contract is not deployed on this network (Chain ID: {chainId}).
            </p>
            <p className="text-sm text-gray-500">
              Please deploy the contract first or switch to a network where it is already deployed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Application
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-indigo-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center">
          <h1 className="text-3xl font-bold mb-2">PsychoEvaluate</h1>
          <p className="text-indigo-100">Privacy-Preserving Psychological Assessment</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center py-8 px-6">
        <div className="w-full max-w-4xl space-y-6">
        {/* Network Information Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Network Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Chain ID" value={chainId?.toString() || "Not connected"} />
            <InfoItem label="Contract Address" value={psychoEvaluate.contractAddress ? truncateAddress(psychoEvaluate.contractAddress) : "Not available"} />
            <InfoItem label="FHEVM Status" value={getFhevmStatusDisplay()} />
            <InfoItem label="Assessment Status" value={psychoEvaluate.hasAssessment ? "Completed" : "Not started"} />
          </div>
        </div>

        {/* Status Message Card */}
        {(psychoEvaluate.message || fhevmError) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
            {psychoEvaluate.message && (
              <div className="flex items-start space-x-2 text-gray-700">
                <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="break-words">{psychoEvaluate.message}</p>
              </div>
            )}
            {fhevmError && (
              <div className="flex items-start space-x-2 text-red-700 mt-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="break-words">{fhevmError.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Questionnaire or Results */}
        {showForm ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Assessment Questionnaire</h2>
            <p className="text-gray-600 mb-6">
              Please rate each statement on a scale from 1 to 5
            </p>

            <div className="space-y-6">
              {QUESTIONNAIRE.map((q, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      {q.category}
                    </span>
                    <span className="text-sm text-gray-500">Question {index + 1} of 15</span>
                  </div>
                  <p className="text-gray-900 mb-4 font-medium">{q.text}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        onClick={() => handleAnswerChange(index, value)}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                          answers[index] === value
                            ? "bg-indigo-600 text-white shadow-md transform scale-105"
                            : "bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        <div className="text-lg font-bold">{value}</div>
                        <div className="text-xs mt-1">{SCALE_LABELS[value - 1]}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              className={`w-full mt-6 py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 shadow-md ${
                psychoEvaluate.canSubmit && !psychoEvaluate.isSubmitting
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!psychoEvaluate.canSubmit || psychoEvaluate.isSubmitting}
              onClick={handleSubmit}
            >
              {psychoEvaluate.isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Assessment"
              )}
            </button>
            {canViewResults && (
              <button
                className="w-full mt-3 py-3 px-6 rounded-lg font-semibold transition-all duration-200 bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50 shadow-sm"
                onClick={() => {
                  setUserOverride(true);
                  setShowForm(false);
                }}
              >
                View Results
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Results</h2>
            
            <div className="space-y-4 mb-6">
              {/* Stress Score */}
              <div className="border-l-4 border-rose-500 bg-rose-50 p-5 rounded-r-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Stress Level</h3>
                  {psychoEvaluate.clearStress !== undefined ? (
                    <span className="text-3xl font-bold text-rose-600">
                      {String(psychoEvaluate.clearStress)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                      Encrypted
                    </span>
                  )}
                </div>
                {psychoEvaluate.clearStress === undefined && psychoEvaluate.stressHandle && (
                  <p className="text-xs text-gray-500 font-mono break-all">
                    {psychoEvaluate.stressHandle.substring(0, 32)}...
                  </p>
                )}
              </div>

              {/* Extroversion Score */}
              <div className="border-l-4 border-emerald-500 bg-emerald-50 p-5 rounded-r-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Extroversion Score</h3>
                  {psychoEvaluate.clearEScore !== undefined ? (
                    <span className="text-3xl font-bold text-emerald-600">
                      {String(psychoEvaluate.clearEScore)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                      Encrypted
                    </span>
                  )}
                </div>
                {psychoEvaluate.clearEScore === undefined && psychoEvaluate.eScoreHandle && (
                  <p className="text-xs text-gray-500 font-mono break-all">
                    {psychoEvaluate.eScoreHandle.substring(0, 32)}...
                  </p>
                )}
              </div>

              {/* Intuition Score */}
              <div className="border-l-4 border-violet-500 bg-violet-50 p-5 rounded-r-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Intuition Score</h3>
                  {psychoEvaluate.clearNScore !== undefined ? (
                    <span className="text-3xl font-bold text-violet-600">
                      {String(psychoEvaluate.clearNScore)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                      Encrypted
                    </span>
                  )}
                </div>
                {psychoEvaluate.clearNScore === undefined && psychoEvaluate.nScoreHandle && (
                  <p className="text-xs text-gray-500 font-mono break-all">
                    {psychoEvaluate.nScoreHandle.substring(0, 32)}...
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-md ${
                  psychoEvaluate.canDecrypt && !psychoEvaluate.isDecrypting
                    ? psychoEvaluate.clearStress !== undefined
                      ? "bg-gray-200 text-gray-700 cursor-default"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={!psychoEvaluate.canDecrypt || psychoEvaluate.isDecrypting}
                onClick={psychoEvaluate.decryptResults}
              >
                {psychoEvaluate.isDecrypting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Decrypting...
                  </span>
                ) : psychoEvaluate.clearStress !== undefined ? (
                  "Results Decrypted"
                ) : (
                  "Decrypt Results"
                )}
              </button>

              <button
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  psychoEvaluate.canGetAssessment && !psychoEvaluate.isRefreshing
                    ? "bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed border-2 border-gray-200"
                }`}
                disabled={!psychoEvaluate.canGetAssessment || psychoEvaluate.isRefreshing}
                onClick={psychoEvaluate.refreshAssessment}
              >
                {psychoEvaluate.isRefreshing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </span>
                ) : (
                  "Refresh Results"
                )}
              </button>

              {/* Back to Questionnaire */}
              <button
                className="w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setAnswers(Array(15).fill(3));
                  setUserOverride(true);
                  setShowForm(true);
                }}
              >
                Back to Questionnaire
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
      <dd className="text-base font-semibold text-gray-900 break-all">{value}</dd>
    </div>
  );
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
