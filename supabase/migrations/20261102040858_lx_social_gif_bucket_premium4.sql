-- Enable animated GIF in the existing private LX Social bucket only.
-- All other MIME, file-size, RLS and access settings are preserved.
update storage.buckets
set allowed_mime_types=array_append(allowed_mime_types,'image/gif')
where id='lx-social'
 and allowed_mime_types is not null
 and not ('image/gif'=any(allowed_mime_types));
