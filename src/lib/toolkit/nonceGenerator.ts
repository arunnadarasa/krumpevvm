export const generateRandomNonce = (): string => {
  // Generate a random 32-byte hex string (64 characters) using Web Crypto API
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return '0x' + Array.from(array)
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
