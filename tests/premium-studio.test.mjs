import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePremiumProfile,premiumAvatarAttributes,premiumCaptureQuality} from '../src/premium-style.js';
import {renderExpressions,expressionToken} from '../src/premium-expressions.js';
import {avatar} from '../src/ui.js';
test('premium cosmetics reject unknown decorations and CSS injection, and avatars cannot self-grant effects',()=>{
 const options=normalizePremiumProfile({decoration:'<img>',accent:'red;url(evil)',effect:'remote',bannerPosition:200});assert.equal(options.decoration,'none');assert.equal(options.accent,'#b69cff');assert.equal(options.bannerPosition,100);
 const free=premiumAvatarAttributes({is_premium:false,premium_profile:{decoration:'wings'}});assert.match(free,/decoration="none"/);
 assert.match(avatar({name:'<script>',is_premium:true,premium_profile:{decoration:'orbit'}}),/decoration="orbit"/);assert.doesNotMatch(avatar({name:'<script>'}),/<script>/);
});
test('shared screen quality is bounded by entitlement and unknown modes fall back',()=>{
 assert.equal(premiumCaptureQuality('2160-60',true).height,2160);assert.equal(premiumCaptureQuality('2160-60',false).height,1080);assert.equal(premiumCaptureQuality('infinite',true).fps,30);
});
test('custom expressions are escaped and only known, safe image assets become HTML',()=>{
 const id='81000000-0000-4000-8000-000000000001',token=expressionToken(id);assert.equal(expressionToken('" onload="evil'),'');
 const asset={id,kind:'emoji',label:'<star>',url:'https://assets.test/star.gif'};assert.match(renderExpressions('<b>'+token,[asset]),/&lt;b&gt;<img/);assert.match(renderExpressions(token,[asset]),/alt=":&lt;star&gt;:"/);
 for(const url of ['javascript:alert(1)','data:image/svg+xml,evil','https://user:pass@assets.test/asset'])assert.equal(renderExpressions(token,[{...asset,url}]),token);
 assert.equal(renderExpressions(token,[]),token);
});
