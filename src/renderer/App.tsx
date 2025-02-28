// App.tsx

import React, { useEffect, useState } from 'react';
import VideoList from './components/VideoList';
import DragDropArea from './components/DragDropArea';
import AudioList from './components/AudioList';
import {
  MdCloudUpload,
  MdLink,
  MdMoreVert,
  MdVideoCameraFront,
  MdSmartToy,
  MdVideoLibrary,
  MdAutoFixHigh,
  MdVideocam,
  MdImportantDevices,
  MdDialpad
} from 'react-icons/md';
import { BiBot } from "react-icons/bi";

import { motion } from 'framer-motion';
import { Pair, Video, Audio } from 'src/types';
import { Badge } from './components/Badge';
import VideoItem from './components/VideoItem';
import { calculateFps } from './utils/calculateFps';

type TabType = 'paired' | 'unpaired' | 'processing' | 'processed';
export type SortOption = 'date' | 'size' | 'name' | 'fps'
export type GroupOption = 'day' | 'none';

const App: React.FC = () => {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [unpairedVideos, setUnpairedVideos] = useState<Video[]>([]);
  const [processingVideos, setProcessingVideos] = useState<string[]>([]);
  const [extractedAudios, setExtractedAudios] = useState<Audio[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('paired');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [groupBy, setGroupBy] = useState<GroupOption>('none');
  const [showActions, setShowActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filterVideos = (videos: Video[]) => {
    if (!searchTerm) return videos;
    const term = searchTerm.toLowerCase();
    return videos.filter(video =>
      video.name.toLowerCase().includes(term)
    );
  };

  const filterPairs = (pairs: Pair[]) => {
    if (!searchTerm) return pairs;
    const term = searchTerm.toLowerCase();
    return pairs.filter(pair =>
      pair.video1.name.toLowerCase().includes(term) ||
      pair.video2.name.toLowerCase().includes(term)
    );
  };

  const sortVideos = (videos: Video[]) => {
    return [...videos].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'size':
          return b.size - a.size;
        case 'fps':
          return calculateFps(b.fps) - calculateFps(a.fps);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  };

  const sortPairs = (pairs: Pair[]) => {
    return [...pairs].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.video1.createdAt).getTime() - new Date(a.video1.createdAt).getTime();
        case 'size':
          return b.video1.size - a.video1.size;
        case 'fps':
          return calculateFps(b.video1.fps) - calculateFps(a.video1.fps);
        case 'name':
          return a.video1.name.localeCompare(b.video1.name);
        default:
          return 0;
      }
    });
  };

  const groupVideosByDay = (videos: Video[]) => {
    if (groupBy !== 'day') return { ungrouped: videos };

    return videos.reduce((groups, video) => {
      const date = new Date(video.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(video);
      return groups;
    }, {} as Record<string, Video[]>);
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await window.electronAPI.getAllVideos();
      console.log('data: ', data);
      setPairs(data.pairs || []);
      setUnpairedVideos(data.unpairedVideos || []);
      setExtractedAudios(data.extractedAudios || []);
      setIsLoading(false);
    };

    loadData();

    // Set up event listeners
    window.electronAPI.onVideosUpdated((data: any) => {
      setPairs(data.pairs || []);
      setUnpairedVideos(data.unpairedVideos || []);
      const videos = [...data.pairs.flatMap(p => [p.video1, p.video2]), ...data.unpairedVideos];
      setProcessingVideos(prev =>
        prev.filter(id => !videos.some(v => v.id === id))
      );
    });

    window.electronAPI.onAudioExtracted((audios: Audio[]) => {
      setExtractedAudios(prev => [...prev, ...audios]);
      setProcessingVideos(prev =>
        prev.filter(id => !audios.some(a => a.id === id))
      );
    });

    window.electronAPI.onMediaProcessed((processedVideos: any[]) => {
      // Update the extracted audios
      setExtractedAudios(prev => {
        const newAudios = processedVideos.map(video => ({
          id: video.id,
          path: video.audio,
          videoId: video.id
        }));
        
        return [...prev, ...newAudios];
      });
      
      // Remove from processing
      setProcessingVideos(prev =>
        prev.filter(id => !processedVideos.some(v => v.id === id))
      );
    });

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeAllListeners('videos-updated');
      window.electronAPI.removeAllListeners('thumbnails-generated');
      window.electronAPI.removeAllListeners('audio-extracted');
    };
  }, []);

  const getTabClassName = (tabName: TabType) => {
    return `px-4 py-2 font-semibold transition-colors ${activeTab === tabName
      ? 'text-blue-600 border-b-2 border-blue-600'
      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
      }`;
  };

  // Handle video upload
  const handleUpload = async () => {
    setIsLoading(true);
    await window.electronAPI.uploadVideos();
    setIsLoading(false);
  };

  // // Handle processing videos (replacing separate thumbnail and audio extraction)
  // const handleProcessVideos = async (videoIds: string[]) => {
  //   setProcessingVideos(prev => [...prev, ...videoIds]);
  //   await window.electronAPI.processComplete(videoIds);
  // };

  const handleProcessVideos = async (videoIds: string[]) => {
    setProcessingVideos(prev => [...prev, ...videoIds]);
    
    // Use the new processMedia method that does both audio and thumbnails
    await window.electronAPI.processMedia(videoIds);
  };

  // Handle unpairing videos
  const handleUnpairVideos = async (pairId: string) => {
    await window.electronAPI.unpairVideos(pairId);
  };

  // Handle manual pairing of videos
  const handlePairVideos = async (video1Id: string, video2Id: string) => {
    await window.electronAPI.pairVideos(video1Id, video2Id);
  };

  const getProcessingPairs = () => {
    return pairs.filter(pair =>
      pair.video1.status === 'processing' || 
      pair.video2.status === 'processing'
    );
  };
  
  const getRawPairs = () => {
    return pairs.filter(pair =>
      pair.video1.status === 'idle' &&
      pair.video2.status === 'idle'
    );
  };
  
  const getProcessedPairs = () => {
    return pairs.filter(pair =>
      pair.video1.status === 'processed' &&
      pair.video2.status === 'processed'
    );
  };

  const pairedVideos = sortPairs(filterPairs(getRawPairs()));
  const pairedProcessingVideos = sortPairs(filterPairs(getProcessingPairs()));
  const pairedProcessedVideos = sortPairs(filterPairs(getProcessedPairs()));

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 min-h-screen">
      <header className="bg-white dark:bg-gray-800 p-4 mb-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
          <BiBot className="text-blue-600" size={30} /> Robotics Training Assistant
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleUpload}
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold p-3 rounded-lg shadow-md"
        >
          <MdCloudUpload />
        </motion.button>
      </header>


      <main className="gap-8 p-4">
        <nav className="flex gap-4 mb-4 border-b pb-2">
          <button
            onClick={() => setActiveTab('paired')}
            className={getTabClassName('paired')}
          >
            Paired Videos <Badge>{pairedVideos.length * 2} ({pairedVideos.length})</Badge>
          </button>
          <button
            onClick={() => setActiveTab('unpaired')}
            className={getTabClassName('unpaired')}
          >
            Unpaired Videos <Badge>{unpairedVideos.length}</Badge>
          </button>
          <button
            onClick={() => setActiveTab('processing')}
            className={getTabClassName('processing')}
          >
            Processing Videos <Badge>{pairedProcessingVideos.length * 2}</Badge>
          </button>
          <button
            onClick={() => setActiveTab('processed')}
            className={getTabClassName('processed')}
          >
            Processed Videos <Badge>{pairedProcessedVideos.length * 2}</Badge>
          </button>
        </nav>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search videos..."
            className="border rounded-lg px-4 py-2 flex-1 bg-white dark:bg-gray-800 dark:text-white"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-lg"
          >
            <option value="none">Unsorted</option>
            <option value="date">Sort by Date</option>
            <option value="size">Sort by Size</option>
            <option value="name">Sort by Name</option>
            <option value="fps">Sort by FPS</option>
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupOption)}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-lg"
          >
            <option value="none">No Grouping</option>
            <option value="day">Group by Day</option>
          </select>
        </div>
        {activeTab === 'paired' && (

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
          >
            <div className='flex justify-between items-center relative'>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <MdLink className="text-blue-600 dark:text-blue-500" />
                Paired Videos
              </h2>
              <div
                className="relative group"
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <MdMoreVert size={24} className="text-gray-600 dark:text-gray-300" />
                </motion.button>

                {showActions && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-8 w-64 bg-white dark:bg-gray-800 
        rounded-lg shadow-lg py-2 z-50 border dark:border-gray-700 mt-2"
                  >
                    {/* Add a invisible bridge to prevent hover gap */}
                    <div className="absolute -top-2 left-0 right-0 h-2" />

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleProcessVideos(
                        [...pairs.flatMap(p => [p.video1.id, p.video2.id])]
                      )}
                      disabled={isLoading || processingVideos.length > 0}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 
          dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      <MdAutoFixHigh className="text-blue-600" />
                      Process All Videos
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </div>
            <VideoList
              pairs={pairedVideos}
              onUnpair={handleUnpairVideos}
              onProcessVideo={handleProcessVideos}
              processingVideos={processingVideos}
              groupBy={groupBy}
            />
          </motion.section>
        )}
        {activeTab === 'unpaired' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <MdVideoCameraFront className="text-blue-600" />
              Unpaired Videos
            </h2>
            <DragDropArea
              videos={sortVideos(filterVideos(unpairedVideos))}
              onPair={handlePairVideos}
              processingVideos={processingVideos}
              groupBy={groupBy}
              onProcessVideo={handleProcessVideos}
            />
          </motion.section>)}

        {activeTab === 'processing' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <MdDialpad className="text-blue-600" />
              Processing Videos
            </h2>
            <VideoList
              pairs={pairedProcessingVideos}
              onUnpair={handleUnpairVideos}
              onProcessVideo={handleProcessVideos}
              processingVideos={processingVideos}
              groupBy={groupBy}
            />
          </motion.section>
        )}

        {activeTab === 'processed' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <MdImportantDevices className="text-blue-600" />
              Processed Videos
            </h2>
            <VideoList
              pairs={pairedProcessedVideos}
              onUnpair={handleUnpairVideos}
              onProcessVideo={handleProcessVideos}
              processingVideos={processingVideos}
              groupBy={groupBy}
            />
          </motion.section>
        )}
      </main>


      {pairedProcessingVideos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 
             text-white p-4 rounded-lg shadow-lg flex items-center gap-2
             dark:from-blue-700 dark:to-blue-800"
        >
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          Processing {pairedProcessingVideos.length * 2} video(s)...
        </motion.div>
      )}
    </div>
  );
};

export default App;