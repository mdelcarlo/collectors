// App.tsx

import React, { useEffect, useState } from 'react';
import VideoList from './components/VideoList';
import DragDropArea from './components/DragDropArea';
import { Select } from './components/Select';
import ProcessingIndicator from './components/ProcessingIndicator';

import {
  MdLink,
  MdMoreVert,
  MdVideoCameraFront,
  MdVideoLibrary,
  MdAutoFixHigh,
  MdImportantDevices,
  MdDialpad,
  MdTask,
  MdGridView,
  MdViewList,
} from 'react-icons/md';
import { BiBot } from "react-icons/bi";

import { motion } from 'framer-motion';
import { Pair, Video } from 'src/types';
import { Badge } from './components/Badge';
import { calculateFps } from './utils/calculateFps';
import Header from './components/Header';
import useAuth from './hooks/useAuth';
import LoginPage from './components/LoginPage';

type TabType = 'paired' | 'unpaired' | 'processing' | 'processed';
export type SortOption = 'date' | 'size' | 'name' | 'fps'
export type GroupOption = 'day' | 'none';
export type MenuSection = 'videos' | 'tasks';
export type ViewMode = 'grid' | 'list' | 'timeline';

const sortOptions = [
  { value: 'none', label: 'Unsorted' },
  { value: 'date', label: 'Sort by Date' },
  { value: 'size', label: 'Sort by Size' },
  { value: 'name', label: 'Sort by Name' },
  { value: 'fps', label: 'Sort by FPS' },
];

const groupOptions = [
  { value: 'none', label: 'No Grouping' },
  { value: 'day', label: 'Group by Day' },
];

const App: React.FC = () => {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [unpairedVideos, setUnpairedVideos] = useState<Video[]>([]);
  const [processingVideos, setProcessingVideos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('unpaired');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [groupBy, setGroupBy] = useState<GroupOption>('none');
  const [showActions, setShowActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSection, setActiveSection] = useState<MenuSection>('videos');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await window.electronAPI.getAllVideos();
      console.log('data: ', data);
      setPairs(data.pairs || []);
      setUnpairedVideos(data.unpairedVideos || []);
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

    window.electronAPI.onMediaProcessed((processedVideos: any[]) => {

      // Remove from processing
      setProcessingVideos(prev =>
        prev.filter(id => !processedVideos.some(v => v.id === id))
      );
    });

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeAllListeners('videos-updated');
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

    setActiveSection('videos');
    setActiveTab('unpaired');
  };

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

  const activePair = pairedProcessingVideos[0]

  return (
    <div className="flex w-full bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Left wrapper containing sidebar and header */}
      <div className="fixed left-0 flex flex-col w-64 h-screen bg-white dark:bg-gray-800">
        {/* App title/logo section */}
        <div className="p-4 max-h-14">
          <div className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
            <BiBot className="text-blue-600" size={30} />
            <span className="text-sm">Robotics Training Assistant</span>
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 p-4 border-r dark:border-gray-700">
          <button
            onClick={() => setActiveSection('videos')}
            className={`w-full flex items-center gap-2 p-3 rounded-lg mb-2 ${activeSection === 'videos'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            <MdVideoLibrary size={20} />
            <span>Videos</span>
          </button>
          <button
            onClick={() => setActiveSection('tasks')}
            className={`w-full flex items-center gap-2 p-3 rounded-lg mb-2 ${activeSection === 'tasks'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            <MdTask size={20} />
            <span>Tasks</span>
            <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
              Soon
            </span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      {/* Main content area */}
      <div className="ml-64 flex-1 flex flex-col">
        {/* Header */}
        <Header
          activeSection={activeSection}
          isLoading={isLoading}
          onUpload={handleUpload}
        />

        {/* Main content */}
        {activeSection === 'videos' && (
          <main className="flex-1 p-4">
            <nav className="flex gap-4 mb-4 border-b pb-2">
              <button
                onClick={() => setActiveTab('unpaired')}
                className={getTabClassName('unpaired')}
              >
                Unpaired Videos <Badge>{unpairedVideos.length}</Badge>
              </button>
              <button
                onClick={() => setActiveTab('paired')}
                className={getTabClassName('paired')}
              >
                Paired Videos <Badge>{pairedVideos.length * 2} ({pairedVideos.length})</Badge>
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
              <div className="flex items-center gap-2 border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                >
                  <MdGridView size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}
                >
                  <MdViewList size={20} />
                </button>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search videos..."
                className="border rounded-lg px-4 py-2 flex-1 bg-white dark:bg-gray-800 dark:text-white"
              />
              <div className="min-w-[180px]">
                <Select
                  value={sortOptions.find((o) => o.value === sortBy)}
                  onChange={(option) => setSortBy(option.value as SortOption)}
                  options={sortOptions}
                />
              </div>

              <div className="min-w-[180px]">
                <Select
                  value={groupOptions.find((o) => o.value === groupBy)}
                  onChange={(option) => setGroupBy(option.value as GroupOption)}
                  options={groupOptions}
                />
              </div>
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
                            [...pairs
                              .filter(p => p.video1.status === 'idle' && p.video2.status === 'idle')
                              .flatMap(p => [p.video1.id, p.video2.id])
                            ]
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
                  viewMode={viewMode}
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
                  viewMode={viewMode}
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
                  viewMode={viewMode}
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
                  viewMode={viewMode}
                />
              </motion.section>
            )}
          </main>)}

        {activeSection === 'tasks' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <MdTask size={48} className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Tasks Coming Soon</h2>
              <p>This feature is under development</p>
            </div>
          </div>
        )}


        {pairedProcessingVideos.length > 0 && activePair && (
          <ProcessingIndicator
            pairedProcessingVideos={pairedProcessingVideos}
            activePair={activePair}
            onNavigateToProcessing={() => {
              setActiveSection('videos');
              setActiveTab('processing');
            }}
          />
        )}
      </div>
    </div>
  );
};

const LoginWrapperApp: React.FC = () => {
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  if (!isLoggedIn && !authLoading) {
    return <LoginPage />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return <App />;

}

export default LoginWrapperApp;