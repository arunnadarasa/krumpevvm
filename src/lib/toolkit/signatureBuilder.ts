import { isAddress } from 'viem';
import { 
  buildMessageSignedForPay,
  buildMessageSignedForDispersePay,
  buildMessageSignedForPublicStaking,
  buildMessageSignedForPresaleStaking,
  buildMessageSignedForPublicServiceStake,
  buildMessageSignedForRegistrationUsername,
  buildMessageSignedForPreRegistrationUsername,
  hashPreRegisteredUsername,
  hashDispersePaymentUsersToPay,
  type DispersePayMetadata
} from '@evvm/viem-signature-library';

export const validateAddress = (address: string): boolean => {
  return isAddress(address);
};

// Faucet uses basic message format: "evvmID,faucet,to,tokenAddress,amount,nonce"
export const buildFaucetSignature = (params: {
  evvmID: string;
  to: string;
  tokenAddress: string;
  amount: string;
  nonce: string;
}) => {
  // Construct EIP-191 message format
  return `${params.evvmID},faucet,${params.to.toLowerCase()},${params.tokenAddress.toLowerCase()},${params.amount},${params.nonce}`;
};

export const buildSinglePaymentSignature = (params: {
  evvmID: string;
  to: string;
  tokenAddress: string;
  amount: string;
  priorityFee: string;
  executor: string;
  nonceType: number;
  nonce: string;
}) => {
  // Use official library for standardized EIP-191 message construction
  return buildMessageSignedForPay(
    BigInt(params.evvmID),
    params.to as `0x${string}` | string,
    params.tokenAddress as `0x${string}`,
    BigInt(params.amount),
    BigInt(params.priorityFee),
    BigInt(params.nonce),
    params.nonceType === 1, // true for async, false for sync
    params.executor as `0x${string}`
  );
};

export const buildDispersePaymentSignature = (params: {
  evvmID: string;
  tokenAddress: string;
  recipients: string[];
  amounts: string[];
  priorityFee: string;
  executor: string;
  nonceType: number;
  nonce: string;
}) => {
  // Construct metadata for hashing
  const toData: DispersePayMetadata[] = params.recipients.map((recipient, index) => ({
    amount: BigInt(params.amounts[index]),
    to_address: recipient as `0x${string}`,
    to_identity: ""
  }));

  // Hash recipient data using official utility
  const hashedData = hashDispersePaymentUsersToPay(toData);
  
  // Calculate total amount
  const totalAmount = params.amounts.reduce((sum, amount) => sum + BigInt(amount), 0n);

  // Use official library for standardized EIP-191 message construction
  return buildMessageSignedForDispersePay(
    BigInt(params.evvmID),
    hashedData.slice(2), // Remove 0x prefix
    params.tokenAddress as `0x${string}`,
    totalAmount,
    BigInt(params.priorityFee),
    BigInt(params.nonce),
    params.nonceType === 1, // true for async, false for sync
    params.executor as `0x${string}`
  );
};

export const buildGoldenStakingSignature = (params: {
  evvmID: string;
  action: number;
  amount: string;
  nonceType: number;
  nonce: string;
}) => {
  // Golden staking uses basic message format: "evvmID,goldenStaking,isStaking,amount,nonce"
  const isStaking = params.action === 1;
  return `${params.evvmID},goldenStaking,${isStaking},${params.amount},${params.nonce}`;
};

export const buildPresaleStakingSignature = (params: {
  evvmID: string;
  action: number;
  stakingNonce: string;
  priorityFee: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  // Use official library for standardized EIP-191 message construction
  return buildMessageSignedForPresaleStaking(
    BigInt(params.evvmID),
    params.action === 1, // true for staking, false for unstaking
    BigInt(params.stakingNonce),
    BigInt(params.evvmNonce)
  );
};

export const buildPublicStakingSignature = (params: {
  evvmID: string;
  action: number;
  stakingNonce: string;
  amount: string;
  priorityFee: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  // Use official library for standardized EIP-191 message construction
  return buildMessageSignedForPublicStaking(
    BigInt(params.evvmID),
    params.action === 1, // true for staking, false for unstaking
    BigInt(params.amount),
    BigInt(params.stakingNonce)
  );
};

export const buildServiceStakingSignature = (params: {
  evvmID: string;
  serviceAddress: string;
  stakingNonce: string;
  amount: string;
  priorityFee: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  // Use official library for standardized EIP-191 message construction
  return buildMessageSignedForPublicServiceStake(
    BigInt(params.evvmID),
    params.serviceAddress,
    true, // Assuming staking action (adjust if needed)
    BigInt(params.amount),
    BigInt(params.stakingNonce)
  );
};

export const buildPreRegisterUsernameSignature = (params: {
  evvmID: string;
  clowNumber: string;
  username: string;
  priorityFee: string;
  nameServiceNonce: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  // Hash username with clowNumber for pre-registration
  const usernameHash = hashPreRegisteredUsername(
    params.username,
    BigInt(params.clowNumber)
  );

  // Use official library for standardized EIP-191 message construction
  return buildMessageSignedForPreRegistrationUsername(
    BigInt(params.evvmID),
    usernameHash.slice(2), // Remove 0x prefix
    BigInt(params.nameServiceNonce)
  );
};

export const buildRegisterUsernameSignature = (params: {
  evvmID: string;
  nameServiceNonce: string;
  clowNumber: string;
  username: string;
  priorityFee: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  // Use official library for standardized EIP-191 message construction
  return buildMessageSignedForRegistrationUsername(
    BigInt(params.evvmID),
    params.username,
    BigInt(params.clowNumber),
    BigInt(params.nameServiceNonce)
  );
};
