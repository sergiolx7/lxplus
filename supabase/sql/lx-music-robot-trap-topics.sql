-- Expand automatic discovery without removing existing queries or altering daily API limits.
update public.lx_music_robot_config
set queries=array_cat(queries,ARRAY[
 'trap brasileiro Matuê músicas oficiais',
 '30PRAUM Matuê Teto WIU official',
 'trap brasileiro Teto lançamentos',
 'WIU trap brasileiro oficial',
 'rap nacional Racionais MCs clássicos',
 'MC Cabelinho trap oficial',
 'Veigh trap brasileiro hits',
 'Filipe Ret rap oficial'
]::text[]),updated_at=now()
where id=true and cardinality(queries)=7 and not ('trap brasileiro Matuê músicas oficiais'=any(queries));
