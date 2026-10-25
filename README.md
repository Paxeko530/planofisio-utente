# PlanoFisio — página do utente

Página estática que abre o plano de exercícios enviado pela fisioterapeuta num link
(`…/#p=…`), em qualquer telemóvel (Android ou iPhone), sem instalar nada.

- **Não há servidor nem base de dados.** O plano vai no próprio link, depois do `#`, que o navegador
  nunca envia a servidores. Só leva o primeiro nome do utente.
- O progresso («Feito hoje») fica **só no telemóvel do utente** (armazenamento local do navegador).
- Os exercícios iniciais vêm incluídos nesta página; o link só leva o que a fisioterapeuta alterou ou criou.

Os ficheiros são gerados a partir do projeto privado PlanoFisio (`tools/prepara-web.js` + `tools/publica-web.js`).
Não editar aqui: a alteração perde-se na próxima publicação.
