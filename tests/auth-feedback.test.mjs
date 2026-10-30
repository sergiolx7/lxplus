import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage} from '../src/auth-feedback.js';

test('auth failures explain credential, confirmation and rate-limit actions',()=>{
 assert.match(authErrorMessage({code:'invalid_credentials'}),/E-mail ou senha/);
 assert.match(authErrorMessage({code:'email_not_confirmed'}),/Confirme seu e-mail/);
 assert.match(authErrorMessage({status:429}),/Aguarde/);
});
test('unknown authentication errors cannot reveal provider details or personal values',()=>{
 const error={message:'Failure for qa@example.invalid at https://provider.invalid/?token=secret with password secret'};
 assert.doesNotMatch(authErrorMessage(error),/secret|example|provider/);
 assert.doesNotMatch(authErrorMessage({message:'O login demorou para responder. Contato qa@example.invalid https://provider.invalid/?token=secret password secret'}),/secret|example|provider/);
});
test('network errors give a retry action without claiming that authentication succeeded',()=>{
 const result=authErrorMessage({message:'Failed to fetch'});assert.match(result,/conectar/);assert.match(result,/tente novamente/);
});
