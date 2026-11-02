import {socialDirectory} from '../services.js';
import {renderFoundersWall} from '../founders-wall.js';

// Dedicated mural keeps working with illustrated initials while the profile
// directory is unavailable; display only public approved profile photos.
export async function mount(host){
 let active=true;
 host.innerHTML=renderFoundersWall();
 try{
  const directory=await socialDirectory();
  if(active)host.innerHTML=renderFoundersWall({people:directory.filter(p=>p.approved!==false&&p.social_visible!==false)});
 }catch{
  // The mural and its messages remain available without the profile service.
 }
 return {destroy(){active=false}};
}
