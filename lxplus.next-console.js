/* LX Plus Next: maintenance consent, owner security and payment preparation. */
(() => {
  'use strict';
  const LX=window.LX=window.LX||{},$=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state=()=>LX.state||LX.ui?.state||{};
  const owner=()=>LX.cloud?.isAdmin?.()===true&&state().user?.adminRole==='owner';
  const pages={nextPayments:'Pagamentos',nextSecurity:'Segurança',nextOperations:'Preparação do lançamento'};
  let epoch=0,environment='test',factorId='';
  function errorText(error){
    const message=String(error?.message||'');
    if(/MFA_REQUIRED/.test(message))return 'Confirme seu código de autenticação em Segurança para continuar.';
    if(/OWNER_REQUIRED|permission denied|ADMIN_REQUIRED/.test(message))return 'Esta área é exclusiva da conta proprietária autorizada.';
    if(/function|schema cache|PGRST202/.test(message))return 'O servidor deste ambiente ainda precisa receber a atualização de manutenção.';
    if(/INVALID_DOCUMENTATION_URL/.test(message))return 'Use o endereço HTTPS da documentação oficial, sem parâmetros.';
    if(/RATE_LIMITED/.test(message))return 'Aguarde um momento e tente novamente.';
    return 'Não foi possível concluir. Verifique a conexão e tente novamente.';
  }
  async function rpc(name,args){const db=LX.cloud?.db?.();if(!db)throw new Error('CLOUD_NOT_CONFIGURED');const result=await db.rpc(name,args);if(result.error)throw result.error;return result.data;}
  const current=(page,ticket)=>state().adminPage===page&&ticket===epoch&&owner();
  const head=(title,description)=>`<header class="lx-next-head"><span class="lx-next-kicker">LX PLUS NEXT</span><h1>${title}</h1><p>${description}</p></header>`;
  const notice=(text,id='lxNextStatus')=>`<p id="${id}" class="lx-next-notice" role="status">${esc(text)}</p>`;
  function setStatus(text){const node=$('lxNextStatus');if(node)node.textContent=text;}
  function render(page){
    if(!owner())return LX.toast?.('Esta área é exclusiva da conta proprietária.');
    epoch++;state().adminPage=page;if(LX.ui?.state)LX.ui.state.adminPage=page;
    document.querySelectorAll('#adminNav [data-admin]').forEach(el=>el.classList.toggle('active',el.dataset.admin===page));
    const main=$('adminMain');if(!main)return;main.dataset.lxNextPage=page;
    if(page==='nextPayments')payments(main,epoch);
    if(page==='nextSecurity')security(main,epoch);
    if(page==='nextOperations')operations(main,epoch);
  }
  async function payments(main,ticket){
    main.innerHTML=head('Pagamentos · PunchPay','Configure a integração da sua conta com acesso protegido.')+
      `<div class="lx-next-columns"><section class="lx-next-card"><div class="lx-next-card-title"><h2>Configuração</h2><span class="lx-next-badge">Em preparação</span></div>
      <form id="lxNextPaymentForm" class="lx-next-form"><label>Ambiente<select id="lxNextEnvironment"><option value="test">Testes</option><option value="production">Produção</option></select></label>
      <label>Documentação oficial<input id="lxNextDocs" type="url" placeholder="https://" maxlength="2048"></label>
      <label>Credencial de API<input id="lxNextApiKey" type="password" autocomplete="new-password" maxlength="8192" placeholder="Nova credencial"></label>
      <small id="lxNextCredentialState">Consultando configuração…</small>
      <button class="primary-btn" id="lxNextSavePayment" type="submit" disabled>Salvar configuração</button></form>${notice('Consultando servidor…')}</section>
      <section class="lx-next-card"><span class="lx-next-kicker">PRÓXIMA ETAPA</span><h2>Validar o gateway</h2><p>A ativação depende da documentação oficial e dos testes de pagamento, cancelamento e notificações.</p><p>O salvamento da credencial mantém as cobranças desativadas.</p><button class="glass-btn" type="button" id="lxNextPaymentSecurity">Abrir Segurança</button><div id="lxNextPaymentAudit"></div></section></div>`;
    $('lxNextEnvironment').value=environment;
    $('lxNextEnvironment').onchange=event=>{environment=event.target.value;render('nextPayments');};
    $('lxNextPaymentSecurity').onclick=()=>render('nextSecurity');
    $('lxNextPaymentForm').onsubmit=async event=>{
      event.preventDefault();const button=$('lxNextSavePayment'),input=$('lxNextApiKey');
      button.disabled=true;let key=input.value.trim();input.value='';
      try{const data=await rpc('lx_next_save_punchpay',{p_environment:environment,p_documentation_url:$('lxNextDocs').value.trim(),p_api_key:key||null,p_remove_credential:false});key='';if(!current('nextPayments',ticket))return;
        $('lxNextCredentialState').textContent=data.credential_configured?'Credencial salva. O valor fica protegido.':'Nenhuma credencial configurada.';setStatus('Configuração salva. Cobranças desativadas até a validação oficial.');
      }catch(error){key='';if(current('nextPayments',ticket))setStatus(errorText(error));}
      finally{if(current('nextPayments',ticket))button.disabled=false;}
    };
    try{const data=await rpc('lx_next_punchpay_status',{p_environment:environment});if(!current('nextPayments',ticket))return;
      $('lxNextDocs').value=data.documentation_url||'';$('lxNextSavePayment').disabled=false;
      $('lxNextCredentialState').textContent=data.credential_configured?'Credencial configurada. Preencha somente para substituir.':'Nenhuma credencial configurada.';
      setStatus('Aguardando a validação da documentação e os testes oficiais.');
      const audit=$('lxNextPaymentAudit');audit.innerHTML=`<h3>Atividade recente</h3>${(data.audit||[]).map(item=>`<p class="lx-next-audit">${item.action==='credential_removed'?'Credencial removida':'Configuração atualizada'}<time>${esc(new Date(item.created_at).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}))}</time></p>`).join('')||'<p>Nenhuma alteração registrada.</p>'}`;
    }catch(error){if(current('nextPayments',ticket)){setStatus(errorText(error));$('lxNextCredentialState').textContent='Configuração indisponível neste ambiente.';}}
  }
  async function security(main,ticket){
    main.innerHTML=head('Segurança da conta','Proteja o acesso administrativo com um código do seu autenticador.')+
      `<div class="lx-next-columns"><section class="lx-next-card"><h2>Autenticação em duas etapas</h2><div id="lxNextMfaBody">Consultando sua conta…</div>${notice('')}</section>
      <section class="lx-next-card"><h2>Seu acesso</h2><p>A confirmação do e-mail e a aprovação administrativa são etapas separadas.</p><p>Guarde seu autenticador em um local seguro. Valide a recuperação da conta antes do lançamento.</p><button id="lxNextSecurityBack" class="glass-btn" type="button">Abrir pagamentos</button></section></div>`;
    $('lxNextSecurityBack').onclick=()=>render('nextPayments');
    const mfa=LX.cloud?.db?.()?.auth?.mfa;
    if(!mfa){$('lxNextMfaBody').textContent='Conecte sua conta ao ambiente de testes para configurar a autenticação.';return;}
    async function verification(){
      if(!current('nextSecurity',ticket))return;
      const box=$('lxNextMfaBody');box.insertAdjacentHTML('beforeend',`<form class="lx-next-form" id="lxNextMfaVerify"><label>Código do autenticador<input id="lxNextMfaCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required></label><button class="primary-btn" type="submit">Confirmar código</button></form>`);
      $('lxNextMfaVerify').onsubmit=async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button'),code=$('lxNextMfaCode').value;button.disabled=true;
        try{const {error}=await mfa.challengeAndVerify({factorId,code});if(error)throw error;if(current('nextSecurity',ticket)){render('nextSecurity');LX.toast?.('Autenticação em duas etapas confirmada.');}}
        catch{if(current('nextSecurity',ticket)){setStatus('Código não confirmado. Confira o autenticador e tente novamente.');button.disabled=false;}}
      };
    }
    try{const [{data:assurance,error:ae},{data:factors,error:fe}]=await Promise.all([mfa.getAuthenticatorAssuranceLevel(),mfa.listFactors()]);if(ae||fe)throw ae||fe;if(!current('nextSecurity',ticket))return;
      const verified=factors.totp?.find(item=>item.status==='verified');
      if(verified){factorId=verified.id;$('lxNextMfaBody').innerHTML=`<span class="lx-next-badge">Autenticador cadastrado</span><p>${assurance.currentLevel==='aal2'?'Seu acesso com duas etapas está confirmado.':'Confirme seu código para abrir as configurações protegidas.'}</p>`;if(assurance.currentLevel!=='aal2')await verification();return;}
      $('lxNextMfaBody').innerHTML='<p>Use um aplicativo autenticador para gerar códigos de acesso.</p><button id="lxNextEnrollMfa" class="primary-btn" type="button">Cadastrar autenticador</button>';
      $('lxNextEnrollMfa').onclick=async event=>{event.target.disabled=true;
        try{const {data,error}=await mfa.enroll({factorType:'totp',friendlyName:'LX Plus ADM'});if(error)throw error;if(!current('nextSecurity',ticket))return;factorId=data.id;
          const box=$('lxNextMfaBody');box.innerHTML='<p>Leia o QR Code com seu autenticador e confirme o código abaixo.</p>';
          const image=document.createElement('img');image.alt='QR Code para cadastrar seu autenticador';image.className='lx-next-qr';
          image.src=data.totp.qr_code.startsWith('data:image/svg+xml')?data.totp.qr_code:'data:image/svg+xml,'+encodeURIComponent(data.totp.qr_code);box.appendChild(image);await verification();
        }catch(error){if(current('nextSecurity',ticket)){setStatus(errorText(error));event.target.disabled=false;}}
      };
    }catch(error){if(current('nextSecurity',ticket))setStatus(errorText(error));}
  }
  async function operations(main,ticket){
    main.innerHTML=head('Preparação do lançamento','Acompanhe os dados do ambiente e as verificações que faltam.')+
      `<div id="lxNextMetrics" class="lx-next-metrics"></div><section class="lx-next-card"><h2>Backup e limpeza das contas</h2><p>Confirme a cópia integral do banco e dos arquivos, teste a restauração e confira a lista de contas antes da limpeza.</p><p>A exclusão continua bloqueada nesta versão de preparação.</p>${notice('Consultando dados do servidor…')}</section>`;
    try{const data=await rpc('lx_next_admin_status');if(!current('nextOperations',ticket))return;
      $('lxNextMetrics').innerHTML=[['Contas',data.users],['Aguardando aprovação',data.pending],['Registros no catálogo',data.catalog],['Arquivos',data.storage_objects]].map(([label,value])=>`<article class="lx-next-card"><span>${label}</span><strong>${Number(value||0).toLocaleString('pt-BR')}</strong></article>`).join('');
      setStatus('Restauração do backup e inventário das contas ainda precisam ser validados.');
    }catch(error){if(current('nextOperations',ticket))setStatus(errorText(error));}
  }
  function interest(){
    const form=$('lxNextInterest');if(!form)return;
    form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button'),status=$('lxNextInterestStatus');button.disabled=true;
      try{await LX.ensureSupabase?.();const data=await rpc('lx_next_return_interest',{p_email:$('lxNextInterestEmail').value.trim(),p_consent:$('lxNextInterestConsent').checked});if(!data?.accepted)throw new Error('NOT_SAVED');form.reset();status.textContent='Interesse registrado. Você receberá o aviso de retorno.';}
      catch(error){status.textContent=errorText(error);}finally{button.disabled=false;}
    };
  }
  function boot(){
    interest();const nav=$('adminNav');if(!nav||!LX.admin?.render)return;
    for(const [key,title] of Object.entries(pages)){const button=document.createElement('button');button.dataset.admin=key;button.type='button';button.innerHTML=`<i aria-hidden="true">${key==='nextPayments'?'◈':key==='nextSecurity'?'◇':'✓'}</i><span>${title}</span>`;button.classList.toggle('lx-role-hidden',!owner());button.disabled=!owner();nav.appendChild(button);}
    const original=LX.admin.render;LX.admin.render=function(page,...args){if(pages[page])return render(page);epoch++;delete $('adminMain')?.dataset.lxNextPage;return original.call(this,page,...args);};
    nav.addEventListener('click',event=>{const button=event.target.closest('[data-admin]');if(button&&pages[button.dataset.admin]){event.preventDefault();event.stopImmediatePropagation();render(button.dataset.admin);}},true);
    LX.nextConsole={render,errorText};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
