export function playlistDetails(value={}){
 const name=String(value.name||'').trim(),description=String(value.description||'').trim(),visibility=value.visibility;
 if(!name||name.length>100)throw Error('Use um nome de 1 a 100 caracteres.');
 if(description.length>500)throw Error('A descrição pode ter até 500 caracteres.');
 if(!['private','public'].includes(visibility))throw Error('Escolha a visibilidade da playlist.');
 return {name,description,visibility};
}
