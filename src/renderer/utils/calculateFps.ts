export const calculateFps = (fpsString: number): number => {
  return Math.ceil(fpsString) || 30;
};