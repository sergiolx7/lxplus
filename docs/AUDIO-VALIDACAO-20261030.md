# Verificação de áudio antes da restauração

O ADM agora permite filtrar os arquivos de áudio próprios, carregar mais resultados, verificar a reprodução sem som e selecionar somente os aprovados. A verificação usa a sessão autenticada existente e URLs temporárias; nenhum token é persistido ou exposto nos resultados.

Cada arquivo precisa apresentar duração válida e reproduzir amostras do início e do meio. A execução é limitada a três arquivos simultâneos, com tempo máximo por arquivo e liberação dos elementos de mídia. Sair do módulo interrompe o início de novas verificações. A restauração permanece uma operação separada e reversível.

Os resultados são temporários e vinculados à fonte verificada: trocar o arquivo invalida a aprovação anterior. A amostragem não comprova integridade integral do áudio.

Validação de código: 49 testes aprovados, incluindo limite de concorrência, isolamento de falhas, interrupção e invalidação quando a fonte muda. A interface reproduziu dois arquivos sintéticos e selecionou apenas os aprovados no ambiente de QA.

O login real e a área administrativa foram confirmados na versão anterior, com sete contas e zero erros de aplicação registrados em 24h no painel. A auditoria dos arquivos privados é realizada após publicar esta função.
