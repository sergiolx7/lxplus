export const catalogSorts={
 recent:{label:'Adicionados recentemente',column:'updated_at',ascending:false},
 title:{label:'Título · A–Z',column:'payload->>title',ascending:true},
 year:{label:'Ano · mais novos',column:'payload->>year',ascending:false}
};
export function catalogSort(value){return catalogSorts[value]||catalogSorts.recent}
