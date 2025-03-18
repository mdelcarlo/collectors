// Result got from python processor
export type AlignmentResult = {
  target: string; // path to the offseted video
  offset: number; // offset in milliseconds
  confidence: number; // 0-10, 10 being the most confident score
  elapsed_time_seconds: number; // time the process took in seconds
};
