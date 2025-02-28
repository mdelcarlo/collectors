import { v4 as uuidv4 } from 'uuid';

interface Video {
  id: string;
  path: string;
  name: string;
  createdAt: Date;
  thumbnail?: string | null;
  paired: boolean;
  pairId: string | null;
  size: number;
}

interface Pair {
  id: string;
  video1: Video;
  video2: Video;
  createdAt: Date;
}

export class VideoMatcher {
  /**
   * Match videos based on their creation date (within 30 seconds)
   */
  async matchVideos(videos: Video[]): Promise<{ pairs: Pair[], unpaired: Video[] }> {
    // Make a copy to avoid modifying the input
    const workingVideos = [...videos].map(v => ({...v}));
    
    // Sort by creation date
    workingVideos.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    const pairs: Pair[] = [];
    const unpaired: Video[] = [];
    const matched = new Set<string>();
    
    // Find potential matches (within 30 seconds)
    for (let i = 0; i < workingVideos.length; i++) {
      // Skip if already matched
      if (matched.has(workingVideos[i].id)) continue;
      
      const video1 = workingVideos[i];
      let bestMatch: Video | null = null;
      let minTimeDiff = Infinity;
      
      // Look for potential matches
      for (let j = 0; j < workingVideos.length; j++) {
        // Skip same video or already matched videos
        if (i === j || matched.has(workingVideos[j].id)) continue;
        
        const video2 = workingVideos[j];
        const time1 = new Date(video1.createdAt).getTime();
        const time2 = new Date(video2.createdAt).getTime();
        const timeDiff = Math.abs(time1 - time2);
        
        // Match if within 30 seconds (30000ms)
        if (timeDiff <= 30000 && timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          bestMatch = video2;
        }
      }
      
      // If we found a match, create a pair
      if (bestMatch) {
        const pairId = uuidv4();
        
        // Mark videos as paired
        video1.paired = true;
        video1.pairId = pairId;
        bestMatch.paired = true;
        bestMatch.pairId = pairId;
        
        // Add to pairs
        pairs.push({
          id: pairId,
          video1,
          video2: bestMatch,
          createdAt: new Date()
        });
        
        // Mark both videos as matched
        matched.add(video1.id);
        matched.add(bestMatch.id);
      }
    }
    
    // Add remaining videos to unpaired list
    for (const video of workingVideos) {
      if (!matched.has(video.id)) {
        video.paired = false;
        video.pairId = null;
        unpaired.push(video);
      }
    }
    
    return { pairs, unpaired };
  }
}