// Capture preferences never request the computer's full audio output.
export function displayCaptureOptions(withAudio=false,quality={width:1920,height:1080,fps:30}){
 return {video:{displaySurface:withAudio?'browser':'window',frameRate:{ideal:quality.fps,max:quality.fps},width:{ideal:quality.width},height:{ideal:quality.height}},audio:withAudio,systemAudio:'exclude',windowAudio:withAudio?'window':'exclude',monitorTypeSurfaces:'exclude',selfBrowserSurface:'exclude',surfaceSwitching:'exclude'};
}
export function isolateDisplayAudio(stream,withAudio=false){
 const surface=stream.getVideoTracks()[0]?.getSettings?.().displaySurface;
 // A browser tab has a defined isolated audio source. Window hints can be
 // ignored, and browsers currently expose no portable proof of isolation.
 const tracks=stream.getAudioTracks(),keep=withAudio&&surface==='browser'?tracks[0]:null;
 for(const track of tracks)if(track!==keep){stream.removeTrack(track);track.stop()}
 return {track:keep||null,surface,unavailable:withAudio&&!keep};
}
