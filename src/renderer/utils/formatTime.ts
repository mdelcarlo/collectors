const formatTime = (timeInMs: number): string => {
  const totalSeconds = Math.floor(timeInMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hoursPart = hours > 0 ? `${hours}h ` : '';
  const minutesPart = minutes > 0 ? `${String(minutes).padStart(2, '0')}m ` : '';
  const secondsPart = `${String(seconds).padStart(2, '0')}s`;

  return `${hoursPart}${minutesPart}${secondsPart}`;
};

export default formatTime;