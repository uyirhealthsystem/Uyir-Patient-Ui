// authservice shapes.

export interface Tokens {
  accessToken: string;
  refreshToken?: string;
  role?: string;
}

export interface LoginChallenge {
  otpRequired: true;
  challengeId: string;
  email: string; // masked
  codeLength: number;
  expiresAt: string;
  resendAvailableAt: string;
}
