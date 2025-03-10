import React, { useCallback } from 'react';
import { FixedSizeList as List, FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import VideoPair from './VideoPair';
import { Pair } from 'src/types';
import { ViewMode } from '../App';

interface VideoListProps {
  pairs: Pair[];
  onUnpair: (pairId: string) => void;
  onProcessVideo: (videoIds: string[]) => void;
  processingVideos: string[];
  groupBy: 'day' | 'none';
  viewMode: ViewMode;
}

const groupPairsByDay = (pairs: Pair[]) => {
  return pairs.reduce((groups, pair) => {
    // Use the more recent date between the two videos
    const date1 = new Date(pair.video1.createdAt);
    const date2 = new Date(pair.video2.createdAt);
    const mostRecentDate = date1 > date2 ? date1 : date2;
    const dateKey = mostRecentDate.toLocaleDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(pair);
    return groups;
  }, {} as Record<string, Pair[]>);
};

const VideoList: React.FC<VideoListProps> = ({
  pairs,
  onUnpair,
  onProcessVideo,
  processingVideos,
  groupBy,
  viewMode
}) => {
  if (pairs.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        No paired videos yet. Upload videos to automatically pair them, or manually pair unpaired videos.
      </div>
    );
  }

  // Handle processing videos
  const handleProcessPair = useCallback((pair: Pair) => {
    onProcessVideo([pair.video1.id, pair.video2.id]);
  }, [onProcessVideo]);

  const renderPair = useCallback((pair: Pair) => {
    const isProcessing = processingVideos.includes(pair.video1.id) || processingVideos.includes(pair.video2.id);

    return (
      <VideoPair
        pair={pair}
        onUnpair={onUnpair}
        isProcessing={isProcessing}
        onProcess={() => handleProcessPair(pair)}
        viewMode={viewMode}
      />
    );
  }, [processingVideos, onUnpair, handleProcessPair, viewMode]);

  if (groupBy === 'day') {
    const groupedPairs = Object.entries(groupPairsByDay(pairs))
      .sort(([dateA], [dateB]) =>
        new Date(dateB).getTime() - new Date(dateA).getTime()
      );

    // Render date groups with virtualized lists inside each group
    return (
      <div className="space-y-8">
        {groupedPairs.map(([date, datePairs]) => (
          <div key={date} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 py-1 px-3 rounded-full text-sm">
                {date}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">
                {datePairs.length * 2} video{(datePairs.length * 2) !== 1 ? 's' : ''}
              </span>
            </h3>
            
            <div style={{ height: Math.min(600, datePairs.length * 300) }}>
              <AutoSizer>
                {({ height, width }) => (
                  viewMode === 'grid' ? (
                    <Grid
                      columnCount={width > 768 ? 2 : 1}
                      columnWidth={width > 768 ? width / 2 - 8 : width}
                      height={height}
                      rowCount={Math.ceil(datePairs.length / (width > 768 ? 2 : 1))}
                      rowHeight={300}
                      width={width}
                      itemData={{
                        pairs: datePairs,
                        renderPair
                      }}
                    >
                      {({ columnIndex, rowIndex, style, data }) => {
                        const itemIndex = rowIndex * (width > 768 ? 2 : 1) + columnIndex;
                        if (itemIndex >= data.pairs.length) return null;
                        
                        return (
                          <div style={{ ...style, padding: 8 }}>
                            {data.renderPair(data.pairs[itemIndex])}
                          </div>
                        );
                      }}
                    </Grid>
                  ) : (
                    <List
                      height={height}
                      itemCount={datePairs.length}
                      itemSize={300}
                      width={width}
                      itemData={{
                        pairs: datePairs,
                        renderPair
                      }}
                    >
                      {({ index, style, data }) => (
                        <div style={{ ...style, paddingBottom: 16 }}>
                          {data.renderPair(data.pairs[index])}
                        </div>
                      )}
                    </List>
                  )
                )}
              </AutoSizer>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Non-grouped view uses a single virtualized list/grid
  return (
    <div style={{ height: 800 }}>
      <AutoSizer>
        {({ height, width }) => (
          viewMode === 'grid' ? (
            <Grid
              columnCount={width > 768 ? 2 : 1}
              columnWidth={width > 768 ? width / 2 - 8 : width}
              height={height}
              rowCount={Math.ceil(pairs.length / (width > 768 ? 2 : 1))}
              rowHeight={300}
              width={width}
              itemData={{
                pairs,
                renderPair
              }}
            >
              {({ columnIndex, rowIndex, style, data }) => {
                const itemIndex = rowIndex * (width > 768 ? 2 : 1) + columnIndex;
                if (itemIndex >= data.pairs.length) return null;
                
                return (
                  <div style={{ ...style, padding: 8 }}>
                    {data.renderPair(data.pairs[itemIndex])}
                  </div>
                );
              }}
            </Grid>
          ) : (
            <List
              height={height}
              itemCount={pairs.length}
              itemSize={300}
              width={width}
              itemData={{
                pairs,
                renderPair
              }}
            >
              {({ index, style, data }) => (
                <div style={{ ...style, paddingBottom: 16 }}>
                  {data.renderPair(data.pairs[index])}
                </div>
              )}
            </List>
          )
        )}
      </AutoSizer>
    </div>
  );
};

export default VideoList;