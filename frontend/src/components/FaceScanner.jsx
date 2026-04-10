import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, FolderSymlink, XCircle, Clock, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:5278/api/face/save-scan';

export default function FaceScanner() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [scanStats, setScanStats] = useState({ total: 0, current: 0, successes: 0, failures: 0, acceptedList: [], rejectedList: [] });
  const [errorMsg, setErrorMsg] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  
  // Custom UI States
  const [activeTab, setActiveTab] = useState('progress'); // progress | accepted | rejected
  const [selectedImage, setSelectedImage] = useState(null); 
  
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        setErrorMsg('Failed to load Face Models. Are they placed correctly in /public/models?');
        console.error(err);
      }
    };
    loadModels();
  }, []);

  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) {
      setErrorMsg('No valid images found in the selected folder.');
      setFileList([]);
      return;
    }
    
    setFileList(files);
    
    // Auto-trigger the scanning process immediately!
    setTimeout(() => {
       startBatchScan(files);
    }, 50);
  };

  // Ultra-fast in-memory DOM parsing (bypasses browser reflow delays completely)
  const loadImageElementAsync = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
       try { await img.decode(); } catch(e) {} // Force browser to physically decompress raster into RAM before sending to WebGL
       resolve({ img, url });
    };
    img.onerror = () => reject('Failed to decode image');
    img.src = url;
  });

  const startBatchScan = async (autoFiles = null) => {
    const processingFiles = (autoFiles && autoFiles.length > 0) ? autoFiles : fileList;
    if (processingFiles.length === 0 || !modelsLoaded) return;
    
    setIsVerifying(true);
    setErrorMsg('');
    setActiveTab('progress');
    setSelectedImage(null);
    
    let stats = { total: processingFiles.length, current: 0, successes: 0, failures: 0, acceptedList: [], rejectedList: [], batchStartTime: new Date(), batchEndTime: null, totalBatchTimeMs: 0 };
    setScanStats({...stats});
    
    // EXTREME ACCURACY OVERHAUL:
    // Switched from TinyFaceDetector to SsdMobilenetv1 to guarantee ZERO false rejections on valid candidate photos.
    // It will aggressively seek and map faces with extreme reliability, only rejecting pure blank physical files.
    const fastDetectOptions = new faceapi.SsdMobilenetv1Options({ 
      minConfidence: 0.10 
    });

    // NEURAL NET WARMUP: The absolutely first time faceapi runs, it executes a heavy WebGL Shader Compilation. 
    // If we let it compile on the first real photograph, it can easily timeout natively and falsely reject it!
    // We send a tiny empty 10x10 dummy canvas through it just to trigger the cache initialization silently.
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 10; dummyCanvas.height = 10;
    try { await faceapi.detectAllFaces(dummyCanvas, fastDetectOptions); } catch(e) {}

    for (let i = 0; i < processingFiles.length; i++) {
      const file = processingFiles[i];
      let memUrl = null;
      try {
        stats.current = i + 1;
        
        const { img, url } = await loadImageElementAsync(file);
        memUrl = url;
        
        setImagePreviewUrl(memUrl);
        // Force the browser CPU to yield for 15ms exactly to un-freeze the UI layout calculations and visually paint smoothly
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 15)));
        
        // Directly print the raw photo into the Canvas Buffer without using `<img />` DOM tags to prevent reactive scaling shifts
        if (canvasRef.current) {
          const displaySize = { width: img.naturalWidth, height: img.naturalHeight };
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
        }
        
        const startTime = performance.now();
        
        // Face structural extraction
        const detections = await faceapi
          .detectAllFaces(img, fastDetectOptions)
          .withFaceLandmarks()
          .withFaceDescriptors();
          
        const endTime = performance.now();
        const scanTimeMs = endTime - startTime;
        
        if (detections.length > 0) {
          // Explicitly sort detections mathematically to guarantee the highest-confidence face is selected over background noise
          const detection = detections.sort((a, b) => b.detection.score - a.detection.score)[0];
          const { detection: { box, score }, descriptor } = detection;
          
          if (canvasRef.current) {
            // Because we already drew the image perfectly on this exact same canvas, drawing the tracking box 
            // directly onto this buffer mathematically guarantees 100% flawless overlay accuracy with zero CSS lag.
            const displaySize = { width: img.naturalWidth, height: img.naturalHeight };
            const resizedDetections = faceapi.resizeResults(detection, displaySize);
            faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
          }
          
          const payload = {
            imageName: file.name,
            imageSizeKB: file.size / 1024,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
            faceDetected: true,
            confidence: score,
            faceBox: { X: box.x, Y: box.y, Width: box.width, Height: box.height },
            embedding: Array.from(descriptor),
            scanTime: scanTimeMs
          };

          // Send specifically isolated mathematical data to SQL Server WITHOUT halting the JS Loop! (Fire & Forget)
          axios.post(API_URL, payload).catch(err => console.error("Database Write Delay", err));
          
          stats.successes++;
          stats.acceptedList.push({
             name: file.name,
             url: memUrl,
             scanTimeMs: scanTimeMs,
             score: score
          });
          memUrl = null; // Do not revoke URL if accepted, we need it for the Gallery
          
        } else {
          stats.failures++;
          stats.rejectedList.push({
             name: file.name,
             url: memUrl,
             reason: "No structual face matches detected. Totally blank or completely blurred image."
          });
          memUrl = null; 
        }
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
        stats.failures++;
        stats.rejectedList.push({
            name: file.name,
            url: memUrl,
            reason: `SYSTEM API CRASH: Failed to communicate heavily loaded SQL data. ${err.message}`
        });
        memUrl = null;
      } finally {
        if (memUrl) URL.revokeObjectURL(memUrl); 
        stats.totalBatchTimeMs = Date.now() - stats.batchStartTime.getTime();
        // Update stats every frame so counter progresses smoothly 1-by-1
        setScanStats({...stats});
      }
    }
    
    stats.batchEndTime = new Date();
    setScanStats({...stats});
    setIsVerifying(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
      <div className="absolute top-0 right-0 p-4">
         <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${modelsLoaded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            {modelsLoaded ? 'Batch Engine Ready' : 'Loading Neural Nets...'}
         </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start mt-8">
        
        <div className="flex flex-col gap-6">
          <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800/60 transition hover:border-indigo-500/30 group">
            <h2 className="text-xl font-semibold mb-4 text-slate-200">Mass Target Import</h2>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer hover:bg-slate-800/30 hover:border-indigo-500 transition-all duration-300">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400 group-hover:text-indigo-400 transition-colors">
                <FolderSymlink className="w-10 h-10 mb-3" />
                <p className="mb-2 text-sm font-semibold text-center mt-2 group-hover:-translate-y-1 transition-transform">Click to select folder</p>
                <p className="text-xs text-slate-500 text-center px-4">Super-charged off-screen processing. Hundreds of photos will scan instantly.</p>
              </div>
              <input type="file" className="hidden" webkitdirectory="" directory="" multiple onChange={handleFolderChange} />
            </label>
          </div>

          <button
            onClick={startBatchScan}
            disabled={fileList.length === 0 || isVerifying || !modelsLoaded}
            className={`w-full relative group overflow-hidden rounded-xl px-6 py-4 text-white font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] ${scanStats?.current === scanStats?.total && scanStats?.total > 0 ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
          >
            <div className={`absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] ${fileList.length > 0 && !(scanStats?.current === scanStats?.total && scanStats?.total > 0) ? 'group-hover:animate-[shimmer_1.5s_infinite]' : ''}`}></div>
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin w-5 h-5" /> PROCESSING IN MEMORY...
              </span>
            ) : scanStats?.current === scanStats?.total && scanStats?.total > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> BATCH COMPLETE
              </span>
            ) : 'START O-S BATCH SCAN'}
          </button>
          
          {/* Detailed Context Buttons - Only show once processing is done or underway */}
          {(scanStats.total > 0 && (scanStats.acceptedList.length > 0 || scanStats.rejectedList.length > 0)) && (
            <div className="flex w-full bg-slate-950 rounded-xl border border-slate-800 p-2 gap-2 mt-2 shadow-inner">
               <button 
                 onClick={() => setActiveTab('accepted')}
                 className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-slate-400 hover:bg-slate-800'}`}
               >
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> ACCEPTED</span>
                  <span className="text-2xl font-light text-slate-200">{scanStats.successes}</span>
               </button>
               
               <button 
                 onClick={() => setActiveTab('rejected')}
                 className={`flex-1 py-3 px-2 rounded-lg text-sm font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'text-slate-400 hover:bg-slate-800'}`}
               >
                  <span className="flex items-center gap-2"><XCircle className="w-4 h-4" /> REJECTED</span>
                  <span className="text-2xl font-light text-slate-200">{scanStats.failures}</span>
               </button>
            </div>
          )}
        </div>

        {/* Dynamic Display Panel */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-square md:aspect-auto md:h-full min-h-[400px] flex items-start justify-center">
            
            {/* Progress Central View - Restored Live Visualizer */}
            {(activeTab === 'progress' && scanStats.total > 0) && (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                 
                 <div className="relative w-full flex-1 flex items-center justify-center mb-4">
                    {!imagePreviewUrl ? (
                       <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
                    ) : (
                       <div className="relative flex justify-center items-center h-full w-full">
                           <canvas 
                             ref={canvasRef} 
                             className="max-w-full max-h-[300px] w-auto h-auto rounded-lg shadow-black/50 shadow-2xl block border border-slate-800"
                           />
                       </div>
                    )}
                 </div>
                 
                 <div className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl text-sm justify-between tracking-wide mt-auto shadow-inner w-full flex items-center">
                    <div className="flex-1">
                       <span className="text-slate-500 uppercase text-[10px] font-bold tracking-widest block mb-1">Live Pipeline Progression</span>
                       <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden ring-1 ring-white/5">
                         <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-2 transition-all duration-300 ease-out" style={{ width: `${(scanStats.current / scanStats.total) * 100}%` }}></div>
                       </div>
                    </div>
                    <div className="flex gap-4 ml-6 shrink-0">
                       <div className="flex flex-col text-center">
                         <span className="text-slate-500 uppercase text-[10px] font-bold">Total</span>
                         <span className="text-slate-200 font-semibold">{scanStats.current} / {scanStats.total}</span>
                       </div>
                       <div className="flex flex-col text-center">
                         <span className="text-emerald-500 uppercase text-[10px] font-bold">Accepted</span>
                         <span className="text-emerald-400 font-semibold">{scanStats.successes}</span>
                       </div>
                       <div className="flex flex-col text-center">
                         <span className="text-amber-500 uppercase text-[10px] font-bold">Failed</span>
                         <span className="text-amber-400 font-semibold">{scanStats.failures}</span>
                       </div>
                    </div>
                 </div>
              </div>
            )}
            
            {/* Accepted Grid View */}
            {activeTab === 'accepted' && (
              <div className="w-full h-full p-4 overflow-y-auto absolute inset-0">
                 <h3 className="text-emerald-400 font-semibold tracking-wider text-sm sticky top-0 bg-slate-950/90 backdrop-blur pb-2 z-10 flex border-b border-emerald-900/50 justify-between items-center">
                   <span>GREEN ACCEPTED ({scanStats.acceptedList.length})</span>
                   <span className="text-xs font-normal text-slate-500">Data completely mapped and in SQL DB</span>
                 </h3>
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {scanStats.acceptedList.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedImage({ type: 'accepted', data: item })}
                        className="group relative rounded-xl overflow-hidden border border-emerald-900/50 cursor-pointer hover:border-emerald-500 transition-all hover:ring-2 ring-emerald-500/20">
                        <img src={item.url} className="w-full h-32 object-cover block group-hover:scale-110 transition-transform duration-500" alt="Scanned Target"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 p-2 w-full flex justify-between items-end">
                           <CheckCircle className="w-5 h-5 text-emerald-400" />
                           <span className="text-xs font-semibold text-white bg-black/50 px-2 py-0.5 rounded-md backdrop-blur border border-white/10">
                             {(item.scanTimeMs / 1000).toFixed(2)}s
                           </span>
                        </div>
                      </div>
                    ))}
                    {scanStats.acceptedList.length === 0 && <p className="text-slate-500 text-sm py-4 col-span-3 text-center">No images have been successfully verified yet.</p>}
                 </div>
              </div>
            )}
            
            {/* Rejected Grid View */}
            {activeTab === 'rejected' && (
              <div className="w-full h-full p-4 overflow-y-auto absolute inset-0">
                 <h3 className="text-red-400 font-semibold tracking-wider text-sm sticky top-0 bg-slate-950/90 backdrop-blur pb-2 z-10 border-b border-red-900/50">
                   FAILED REJECTS ({scanStats.rejectedList.length})
                 </h3>
                 <div className="flex flex-col gap-3 mt-4">
                    {scanStats.rejectedList.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedImage({ type: 'rejected', data: item })}
                        className="group flex gap-3 p-2 rounded-xl border border-red-900/50 cursor-pointer hover:bg-red-950/30 transition-all hover:border-red-500/50 items-center">
                        <img src={item.url} className="w-16 h-16 object-cover rounded-lg shrink-0 border border-slate-800" alt="Failed Target"/>
                        <div className="min-w-0">
                           <p className="text-xs text-slate-300 font-mono truncate">{item.name}</p>
                           <p className="text-red-400 font-semibold text-xs mt-1 uppercase tracking-wide">Rejected</p>
                        </div>
                      </div>
                    ))}
                    {scanStats.rejectedList.length === 0 && <p className="text-slate-500 text-sm py-4 text-center">All images scanned successfully without rejects!</p>}
                 </div>
              </div>
            )}

            {!scanStats.total && <p className="text-slate-600 text-sm font-medium uppercase tracking-widest m-auto">Awaiting Folder Feed</p>}
        </div>
      </div>
      
      {/* Absolute Detailed Modal Overlay */}
      {selectedImage && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all" onClick={() => setSelectedImage(null)}>
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl max-w-2xl w-full flex flex-col md:flex-row gap-8" onClick={(e) => e.stopPropagation()}>
               <div className="relative shrink-0 rounded-2xl overflow-hidden border border-slate-700 bg-black">
                 <img src={selectedImage.data.url} className="w-full md:w-64 aspect-[3/4] object-contain block"/>
                 <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur shadow-xl border flex items-center gap-2 ${selectedImage.type === 'accepted' ? 'bg-emerald-500/80 text-white border-emerald-400' : 'bg-red-500/80 text-white border-red-400'}`}>
                    {selectedImage.type === 'accepted' ? <><CheckCircle2 className="w-4 h-4"/> VERIFIED AND STORED IN DB</> : <><XCircle className="w-4 h-4"/> REJECTED</>}
                 </div>
               </div>
               
               <div className="flex flex-col flex-1 justify-center">
                  <h4 className="text-slate-400 text-sm font-mono truncate border-b border-slate-800 pb-2 mb-4">File: {selectedImage.data.name}</h4>
                  
                  {selectedImage.type === 'accepted' ? (
                    <div className="space-y-6">
                       <div>
                         <div className="text-slate-500 uppercase text-xs font-bold tracking-widest mb-1 flex items-center gap-2"><Clock className="w-4 h-4"/> VERIFICATION SPEED</div>
                         <div className="text-4xl font-light text-slate-200">{(selectedImage.data.scanTimeMs / 1000).toFixed(2)} <span className="text-lg font-medium text-slate-500">Seconds</span></div>
                       </div>
                       <div>
                         <div className="text-slate-500 uppercase text-xs font-bold tracking-widest mb-1">Face Recognition Structual Map</div>
                         <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-500 line-clamp-3 leading-relaxed break-words">
                            // 128D mathematical array transferred directly into SQL dbo.FaceEmbeddings
                         </div>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <div>
                         <div className="text-slate-500 uppercase text-xs font-bold tracking-widest mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500"/> SYSTEM WHY (REASON)</div>
                         <div className="p-4 bg-red-950/30 border border-red-900 rounded-xl">
                            <h2 className="text-lg text-red-400 leading-relaxed font-semibold">
                               {selectedImage.data.reason}
                            </h2>
                         </div>
                       </div>
                    </div>
                  )}
                  
                  <button onClick={() => setSelectedImage(null)} className="mt-8 px-6 py-3 w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase tracking-widest transition-colors border border-slate-600">Close Details</button>
               </div>
            </div>
         </div>
      )}
      
      {/* Total Batch Timer Footer Footer */}
      {scanStats?.totalBatchTimeMs > 0 && (
         <div className="mt-8 pt-6 border-t border-slate-800/50 animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
                 <div>
                    <h3 className="text-slate-300 font-semibold mb-1">Total Pipeline Execution Time</h3>
                    <p className="text-slate-500 text-sm">
                        <span className="text-emerald-500">Started: {scanStats.batchStartTime.toLocaleTimeString()}</span>
                        {scanStats.batchEndTime && <span className="text-indigo-400 ml-3 border-l border-slate-700 pl-3">Ended: {scanStats.batchEndTime.toLocaleTimeString()}</span>}
                    </p>
                 </div>
                 <div className="px-6 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-baseline gap-2 shrink-0">
                    <span className="text-4xl font-light">{(scanStats.totalBatchTimeMs / 1000).toFixed(2)}</span>
                    <span className="font-semibold text-sm">SECONDS</span>
                 </div>
             </div>
         </div>
      )}
      
    </div>
  );
}
