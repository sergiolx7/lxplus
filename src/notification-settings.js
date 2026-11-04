import {db} from './data.js';
import {checked} from './ui.js';

export const notificationOptions=[
 ['messages','Mensagens','Avisos de novas mensagens individuais e de grupos.'],
 ['friends','Amizades','Solicitações e confirmações de amizade.'],
 ['calls','Chamadas perdidas','Avisos de chamadas não atendidas. O toque de chamadas recebidas continua nas configurações de chamada.'],
 ['social','Interações','Curtidas, comentários e menções.'],
 ['updates','Novidades','Atualizações de recursos da LX Plus.'],
 ['message_preview','Prévia das mensagens','Exibir o texto das novas mensagens nos avisos.']
];
export const notificationSettings=(action='get',data={})=>checked(db.rpc('lx_notification_settings',{p_action:action,p_data:data}));
export const mutedThreadKey=({thread_kind,target_id})=>thread_kind+':'+target_id;
export function notificationDestination(row){
 const data=row?.data||{};
 const valid=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||''));
 if(row?.kind==='group_message'&&valid(data.group_id))return {page:'Comunidade',term:'group:'+data.group_id};
 if(row?.kind==='message'&&valid(data.sender_id))return {page:'Comunidade',term:'dm:'+data.sender_id};
 if(row?.kind==='call')return {page:'Comunidade',term:'calls'};
 if(['message','group_message','friend','friend_request','friend_accepted','mention','comment','like'].includes(row?.kind))return {page:'Comunidade',term:''};
 if(row?.kind==='support')return {page:'Suporte',term:''};
 return null;
}
