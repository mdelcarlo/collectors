export const calculateFps = (fpsString: string): number => {
  const [numerator, denominator] = fpsString.split('/').map(Number);
  const result = denominator ? numerator / denominator : numerator;
  return Math.ceil(result) || 30;
};