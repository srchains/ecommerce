import React, { useState } from 'react';
import { 
  Search, 
  Upload, 
  Grid, 
  List as ListIcon, 
  MoreVertical, 
  Play, 
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MediaLibrary: React.FC = () => {
  const { designs } = useApp();
  
  const allMediaItems = designs.flatMap(design => 
    design.media.map(media => ({
      ...media,
      design_code: design.design_code,
      collection: design.collection
    }))
  );

  const [activeTab, setActiveTab] = useState<'All Media' | 'Images' | 'Videos' | 'Documents'>('All Media');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState('All');
  const [selectedFileType, setSelectedFileType] = useState('All');
  const [selectedRelatedTo, setSelectedRelatedTo] = useState('All');
  const [selectedCollection, setSelectedCollection] = useState<string>('All');
  const [sortBy, setSortBy] = useState('Newest First');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

  const filteredMedia = allMediaItems.filter(item => {
    const matchesSearch = item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.design_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'Images') matchesTab = item.file_type.startsWith('image');
    else if (activeTab === 'Videos') matchesTab = item.file_type.startsWith('video');
    else if (activeTab === 'Documents') matchesTab = item.file_type.includes('pdf') || item.file_type.includes('document');

    let matchesType = true;
    if (selectedMediaType !== 'All') {
      if (selectedMediaType === 'Image') matchesType = item.file_type.startsWith('image');
      if (selectedMediaType === 'Video') matchesType = item.file_type.startsWith('video');
    }

    const matchesRelated = selectedRelatedTo === 'All' || item.design_code === selectedRelatedTo;
    const matchesCollection = selectedCollection === 'All' || item.collection === selectedCollection;

    return matchesSearch && matchesTab && matchesType && matchesRelated && matchesCollection;
  });

  const uniqueDesigns = Array.from(new Set(allMediaItems.map(m => m.design_code)));
  const uniqueCollections = Array.from(new Set(allMediaItems.map(m => m.collection).filter(Boolean) as string[]));

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">Media Library</h2>
          <p className="muted-text text-sm mt-2">Digital asset management for product photography, videos, certificates, and catalog documents.</p>
        </div>
        <button className="btn-primary">
          <Upload className="h-4 w-4" />
          <span>Upload New</span>
        </button>
      </div>

      <div className="enterprise-panel p-5">
        <div className="flex space-x-6 border-b border-gray-200 pb-2 text-sm overflow-x-auto">
          {['All Media', 'Images', 'Videos', 'Documents'].map((tab: any) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`nav-tab whitespace-nowrap ${activeTab === tab ? 'nav-tab-active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Media Type</label>
              <select 
                value={selectedMediaType}
                onChange={(e) => setSelectedMediaType(e.target.value)}
                className="select"
              >
                <option value="All">All Types</option>
                <option value="Image">Images Only</option>
                <option value="Video">Videos Only</option>
              </select>
            </div>
            <div>
              <label className="field-label">File Type</label>
              <select 
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="select"
              >
                <option value="All">All Formats</option>
                <option value="jpg">JPEG (.jpg)</option>
                <option value="png">PNG (.png)</option>
                <option value="mp4">MPEG-4 (.mp4)</option>
              </select>
            </div>
            <div>
              <label className="field-label">Related To</label>
              <select 
                value={selectedRelatedTo}
                onChange={(e) => setSelectedRelatedTo(e.target.value)}
                className="select"
              >
                <option value="All">All Products</option>
                {uniqueDesigns.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Collection</label>
              <select 
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="select"
              >
                <option value="All">All Collections</option>
                {uniqueCollections.map(coll => (
                  <option key={coll} value={coll}>{coll}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
            <div>
              <label className="field-label">Upload Date</label>
              <button className="btn-secondary w-full justify-between">
                <Calendar className="h-4 w-4" />
                <span>Select Date</span>
              </button>
            </div>
            <div>
              <label className="field-label">More Filters</label>
              <button className="btn-secondary w-full justify-between">
                <Filter className="h-4 w-4" />
                <span>Configure</span>
              </button>
            </div>
          </div>

          <div className="xl:col-span-12">
            <label className="field-label">Search Assets</label>
            <div className="search-field">
              <input 
                type="text"
                placeholder="Search designs, files, collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
              />
              <Search className="h-4 w-4 search-icon" />
            </div>
          </div>
        </div>
      </div>

      <div className="enterprise-panel p-5 flex justify-between items-center">
        <span className="text-sm text-gray-500 font-semibold">Total Media: <span className="text-gray-900">{filteredMedia.length}</span></span>
        
        <div className="flex items-center space-x-4 flex-wrap gap-3">
          <div className="flex bg-gray-50 p-1 border border-gray-200 rounded-lg">
            <button 
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-md transition-all ${
                viewType === 'grid' ? 'bg-white border border-gray-300 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewType('list')}
              className={`p-2 rounded-md transition-all ${
                viewType === 'list' ? 'bg-white border border-gray-300 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Sort By</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select w-44"
            >
              <option value="Newest First">Newest First</option>
              <option value="Oldest First">Oldest First</option>
              <option value="Size (Large-Small)">Size (Large-Small)</option>
              <option value="Size (Small-Large)">Size (Small-Large)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="enterprise-panel p-5">
        <div className="border border-dashed border-gray-300 rounded-xl bg-gray-50 p-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="card-title">Upload Section</h3>
            <p className="text-sm text-gray-500 mt-1">Upload approved product media and associate assets with designs or collections.</p>
          </div>
          <button className="btn-secondary">
            <Plus className="h-4 w-4" />
            <span>Select Files</span>
          </button>
        </div>
      </div>

      {viewType === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-5">
          {filteredMedia.map((media) => {
            const isVideo = media.file_type.startsWith('video');
            return (
              <div key={media.id} className="asset-card group">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {isVideo ? (
                    <>
                      <div className="absolute inset-0 bg-gray-900/10 z-10 flex items-center justify-center">
                        <div className="p-3 bg-white border border-gray-200 rounded-full text-gray-900 shadow-sm">
                          <Play className="h-4 w-4" />
                        </div>
                      </div>
                      <img src={media.url} alt="video preview" className="w-full h-full object-cover" />
                    </>
                  ) : (
                    <img 
                      src={media.url} 
                      alt={media.file_name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <span className="absolute top-2 left-2 bg-white text-gray-700 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold border border-gray-200">
                    {media.category.replace(' Photos', '')}
                  </span>
                </div>
                
                <div className="p-3 border-t border-gray-200 text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-900 truncate max-w-[85%]">{media.file_name}</span>
                    <button className="text-gray-400 hover:text-gray-700 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-between text-gray-500 text-[11px]">
                    <span>12 May 2024</span>
                    <span className="font-mono">{media.file_size}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="enterprise-panel overflow-hidden">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>File Name</th>
                <th>Category</th>
                <th>Related Design</th>
                <th>File Size</th>
                <th>Upload Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((media) => {
                const isVideo = media.file_type.startsWith('video');
                return (
                  <tr key={media.id}>
                    <td>
                      <div className="h-10 w-10 bg-gray-100 border border-gray-200 rounded overflow-hidden relative">
                        {isVideo && <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10"><Play className="h-3.5 w-3.5 text-gray-700" /></div>}
                        <img src={media.url} alt="thumb" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="font-semibold text-gray-900">{media.file_name}</td>
                    <td className="text-gray-600">{media.category}</td>
                    <td className="text-gray-600 font-mono">{media.design_code}</td>
                    <td className="text-gray-600 font-mono">{media.file_size}</td>
                    <td className="text-gray-500">12 May 2024</td>
                    <td className="text-right">
                      <button className="text-gray-500 hover:text-gray-900">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="enterprise-panel p-5 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 font-medium">Show</span>
          <select className="select w-24 py-1.5 text-sm">
            <option>30</option>
            <option>50</option>
            <option>100</option>
          </select>
          <span className="text-sm text-gray-500 font-medium">per page</span>
        </div>
        
        <div className="pagination">
          <button><ChevronLeft className="h-3.5 w-3.5" /></button>
          {[1, 2, 3, 4, 5].map(p => (
            <button key={p} className={p === 1 ? 'pagination-active' : ''}>{p}</button>
          ))}
          <span className="text-gray-500 px-1">...</span>
          <button>42</button>
          <button><ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
};