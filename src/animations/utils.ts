export const validateProgress = (progress: number) => {
  if (progress < 0 || progress > 1) {
    throw new Error("Progress must be between 0 and 1");
  }
};
