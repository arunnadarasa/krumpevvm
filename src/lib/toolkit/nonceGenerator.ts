import { randomBytes } from 'crypto';

export const generateRandomNonce = (): string => {
  // Generate a random 32-byte hex string (64 characters)
  return '0x' + Array.from(randomBytes(32))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const generateClowNumber = (): string => {
  // Generate random number for clow number (typically used in name service)
  return Math.floor(Math.random() * 1000000).toString();
};

export const generateStakingNonce = (): string => {
  // Generate random staking nonce
  return Math.floor(Math.random() * 1000000000).toString();
};

export const generateNameServiceNonce = (): string => {
  // Generate random name service nonce
  return Math.floor(Math.random() * 1000000000).toString();
};
