import { encodeFunctionData, isAddress } from 'viem';
import { FAUCET_ABI, PAYMENT_ABI, STAKING_ABI, NAME_SERVICE_ABI } from './evvmABI';

export const validateAddress = (address: string): boolean => {
  return isAddress(address);
};

export const buildFaucetSignature = (params: {
  to: string;
  tokenAddress: string;
  amount: string;
  nonce: string;
}) => {
  return encodeFunctionData({
    abi: FAUCET_ABI,
    functionName: 'faucet',
    args: [params.to as `0x${string}`, params.tokenAddress as `0x${string}`, BigInt(params.amount), params.nonce as `0x${string}`]
  });
};

export const buildSinglePaymentSignature = (params: {
  to: string;
  tokenAddress: string;
  amount: string;
  priorityFee: string;
  executor: string;
  nonceType: number;
  nonce: string;
}) => {
  return encodeFunctionData({
    abi: PAYMENT_ABI,
    functionName: 'singlePayment',
    args: [
      params.to as `0x${string}`,
      params.tokenAddress as `0x${string}`,
      BigInt(params.amount),
      BigInt(params.priorityFee),
      params.executor as `0x${string}`,
      params.nonceType,
      params.nonce as `0x${string}`
    ]
  });
};

export const buildDispersePaymentSignature = (params: {
  tokenAddress: string;
  recipients: string[];
  amounts: string[];
  priorityFee: string;
  executor: string;
  nonceType: number;
  nonce: string;
}) => {
  return encodeFunctionData({
    abi: PAYMENT_ABI,
    functionName: 'dispersePayment',
    args: [
      params.tokenAddress as `0x${string}`,
      params.recipients as `0x${string}`[],
      params.amounts.map(a => BigInt(a)),
      BigInt(params.priorityFee),
      params.executor as `0x${string}`,
      params.nonceType,
      params.nonce as `0x${string}`
    ]
  });
};

export const buildGoldenStakingSignature = (params: {
  action: number;
  amount: string;
  nonceType: number;
  nonce: string;
}) => {
  return encodeFunctionData({
    abi: STAKING_ABI,
    functionName: 'goldenStake',
    args: [params.action, BigInt(params.amount), params.nonceType, params.nonce as `0x${string}`]
  });
};

export const buildPresaleStakingSignature = (params: {
  action: number;
  stakingNonce: string;
  priorityFee: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  return encodeFunctionData({
    abi: STAKING_ABI,
    functionName: 'presaleStake',
    args: [params.action, BigInt(params.stakingNonce), BigInt(params.priorityFee), params.nonceType, params.evvmNonce as `0x${string}`]
  });
};

export const buildPublicStakingSignature = (params: {
  action: number;
  stakingNonce: string;
  amount: string;
  priorityFee: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  return encodeFunctionData({
    abi: STAKING_ABI,
    functionName: 'publicStake',
    args: [params.action, BigInt(params.stakingNonce), BigInt(params.amount), BigInt(params.priorityFee), params.nonceType, params.evvmNonce as `0x${string}`]
  });
};

export const buildServiceStakingSignature = (params: {
  serviceAddress: string;
  stakingNonce: string;
  amount: string;
  priorityFee: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  return encodeFunctionData({
    abi: STAKING_ABI,
    functionName: 'serviceStake',
    args: [
      params.serviceAddress as `0x${string}`,
      BigInt(params.stakingNonce),
      BigInt(params.amount),
      BigInt(params.priorityFee),
      params.nonceType,
      params.evvmNonce as `0x${string}`
    ]
  });
};

export const buildPreRegisterUsernameSignature = (params: {
  clowNumber: string;
  username: string;
  priorityFee: string;
  nameServiceNonce: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  return encodeFunctionData({
    abi: NAME_SERVICE_ABI,
    functionName: 'preRegisterUsername',
    args: [
      BigInt(params.clowNumber),
      params.username,
      BigInt(params.priorityFee),
      BigInt(params.nameServiceNonce),
      params.nonceType,
      params.evvmNonce as `0x${string}`
    ]
  });
};

export const buildRegisterUsernameSignature = (params: {
  nameServiceNonce: string;
  clowNumber: string;
  username: string;
  priorityFee: string;
  nonceType: number;
  evvmNonce: string;
}) => {
  return encodeFunctionData({
    abi: NAME_SERVICE_ABI,
    functionName: 'registerUsername',
    args: [
      BigInt(params.nameServiceNonce),
      BigInt(params.clowNumber),
      params.username,
      BigInt(params.priorityFee),
      params.nonceType,
      params.evvmNonce as `0x${string}`
    ]
  });
};
