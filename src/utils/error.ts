export const error = (message: string) => {
  throw new Error(`Mayonation Error: ${message}`);
};

export const throwIf = (condition: boolean, message: string) => {
  if (condition) {
    error(message);
  }
};
