export default interface PasswordData {
  numberOfPasswordAttempts: number;
  timeStampOfLastReset: number;
  hash: string;
};
