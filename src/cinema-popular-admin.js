import {esc} from './ui.js';
const fmt=n=>Number(n||0).toLocaleString('pt-BR');
export function renderPopularCinemaQueue(snapshot){
 const rows=Array.isArray(snapshot?.rows)?snapshot.rows:[];
 const waiting=Number(snapshot?.waiting_poster||0),ready=Number(snapshot?.ready||0),published=Number(snapshot?.published||0);
 return '<section class="panel lx-priority-cinema" aria-label="Filmes famosos e capas licenciadas"><div class="heading"><div><span class="premium-overline">CATÁLOGO POPULAR · POSTER PRIMEIRO</span><h3>Grandes sucessos primeiro</h3></div><span class="status-pill">'+fmt(rows.length)+' títulos na fila</span></div>'+
 '<p>Seleção editorial de grandes filmes, séries, doramas e animes. Esta ordem não representa audiência medida; é a prioridade de cadastro. Obras só aparecem publicamente com capa original ou licenciada, sinopse e classificação indicativa revisada.</p>'+
 '<div class="lx-priority-stats"><span>'+fmt(waiting)+' aguardam capa</span><span>'+fmt(ready)+' prontos para publicar</span><span>'+fmt(published)+' publicados</span></div>'+
 '<p class="muted">Para liberar uma capa oficial, envie o arquivo JPG/PNG/WebP de até 5 MB, registre a autorização ou o contrato que permite o uso, confira a classificação e inclua uma sinopse sua. O robô publica apenas depois dessas conferências.</p>'+
 '<div class="lx-priority-queue">'+rows.map(row=>{
 const done=row.status==='published',duplicate=row.status==='duplicate';
 const badge=done?'Publicado':duplicate?'Duplicado':'Aguardando pôster';
 const synopsis=esc(row.synopsis||'');
 return '<details class="lx-priority-entry" '+(row.editorial_rank===1&&!done?'open':'')+'><summary><span class="lx-priority-rank">'+fmt(row.editorial_rank)+'</span><span class="lx-priority-title"><b>'+esc(row.title)+'</b><small>'+esc(row.kind)+' · '+esc(row.release_year)+' · '+badge+'</small></span><span aria-hidden="true">▾</span></summary>'+
 (done?'<p class="muted">Ficha publicada com pôster revisado.</p>':duplicate?'<p class="muted">Já existe uma ficha correspondente. Verifique a anterior no Studio antes de criar outra.</p>':
 '<form data-priority-poster class="lx-priority-form"><input type="hidden" name="queueId" value="'+esc(row.id)+'"><label>Capa licenciada (JPG, PNG ou WebP)<input name="posterFile" type="file" accept="image/jpeg,image/png,image/webp" required></label>'+
 '<label>Comprovante de uso autorizado / licença<textarea name="evidence" rows="2" maxlength="1500" minlength="12" required placeholder="Ex.: contrato de distribuição, licença do titular, identificação e condição de uso"></textarea></label>'+
 '<label>Créditos da imagem<input name="credit" maxlength="180" minlength="3" required placeholder="Ex.: distribuidora / artista / origem autorizada"></label>'+
 '<label>Descrição original da obra<textarea name="synopsis" rows="3" maxlength="1000" minlength="20" required>'+synopsis+'</textarea></label>'+
 '<label class="lx-priority-checkbox"><input type="checkbox" name="ageConfirmed" required> Verifiquei a classificação e confirmo que o título não é 18+.</label>'+
 '<label class="lx-priority-checkbox"><input type="checkbox" name="rightsConfirmed" required> Confirmo possuir autorização para publicar esta imagem na LX Plus.</label>'+
 '<button type="submit" class="btn small primary">Enviar capa e publicar ficha</button></form>')+'</details>';
 }).join('')+'</div></section>';
}
