/**
 * Simulador seguro da importação de uma pasta Google Drive.
 * Dados inventados, não usa APIs, não acessa Drive e NUNCA escreve no Supabase.
 */
import {classifyImportRow} from './drive-import.js';

export const DEMO_FOLDER_LABEL='LX Plus · Pasta de demonstração (fictícia)';
const fixture=[
 {name:'Horizonte.de.Cristal.2024.1080p.mp4',driveId:'LX_DEMO_ARQUIVO_001',
  parsed:{type:'movie',title:'Horizonte de Cristal',year:2024,ext:'mp4'},
  match:{title:'Horizonte de Cristal',year:2024,cover:'./assets/demo-covers/horizonte.svg',
   desc:'Aventura fictícia usada para demonstrar importação automática de catálogo.',remoteId:'DEMO-001',genre:'Aventura',duration:117},
  confidence:.98},
 {name:'Cidade.das.Estrelas.2023.4K.mkv',driveId:'LX_DEMO_ARQUIVO_002',
  parsed:{type:'movie',title:'Cidade das Estrelas',year:2023,ext:'mkv'},
  match:{title:'Cidade das Estrelas',year:2023,cover:'./assets/demo-covers/estrelas.svg',
   desc:'Drama fictício criado exclusivamente para este teste visual.',remoteId:'DEMO-002',genre:'Drama',duration:102},
  confidence:.96},
 {name:'Horizonte.de.Cristal.2024.COPIA.mp4',driveId:'LX_DEMO_ARQUIVO_001',
  parsed:{type:'movie',title:'Horizonte de Cristal',year:2024,ext:'mp4'},
  match:{title:'Horizonte de Cristal',year:2024,cover:'./assets/demo-covers/horizonte.svg',remoteId:'DEMO-001'},confidence:.99,alreadyImported:true},
 {name:'O.Misterio.do.Vale.2022.mp4',driveId:'LX_DEMO_ARQUIVO_004',
  parsed:{type:'movie',title:'O Mistério do Vale',year:2022,ext:'mp4'},
  match:{title:'O Mistério de Vale',year:2022,cover:'./assets/demo-covers/vale.svg',remoteId:'DEMO-004'},confidence:.71},
 {name:'Serie.Exemplo.S01E03.2025.mp4',driveId:'LX_DEMO_ARQUIVO_005',
  parsed:{type:'tv',title:'Série Exemplo',year:2025,ext:'mp4',isEpisode:true,season:1,episode:3},
  match:{title:'Série Exemplo',year:2025,cover:'./assets/demo-covers/estrelas.svg',remoteId:'DEMO-005'},confidence:.98},
 {name:'Filme.sem.capa.2021.webm',driveId:'LX_DEMO_ARQUIVO_006',
  parsed:{type:'movie',title:'Filme sem capa',year:2021,ext:'webm'},
  match:{title:'Filme sem capa',year:2021,cover:'',remoteId:'DEMO-006'},confidence:.95}
];
export function makeDemoDriveScan(){
 return {
  demo:true,folderId:'DEMO_FICTICIO_SEM_ID_REAL',folderLabel:DEMO_FOLDER_LABEL,
  files:fixture.map(x=>classifyImportRow({...x,match:{...x.match},parsed:{...x.parsed}})),
  truncated:false,foldersScanned:1
 };
}
export function simulateDemoPublish(scan){
 if(!scan?.demo)throw Error('Simulação permitida apenas para dados fictícios.');
 const ready=(scan.files||[]).filter(x=>classifyImportRow(x).qualifies);
 return {
  demo:true,published:ready.map(x=>({title:x.match.title,id:'SIMULADO-'+x.driveId})),
  duplicates:(scan.files||[]).filter(x=>x.alreadyImported||x.duplicate).map(x=>({name:x.name,reason:'Cópia detectada'})),
  errors:[],message:'Simulação concluída. Nenhum filme foi enviado ao site nem ao banco de dados.'
 };
}
