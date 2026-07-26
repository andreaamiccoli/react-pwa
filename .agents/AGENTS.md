# Regole del Progetto

1. Prima di ogni `git commit` e `git push`, eseguire SEMPRE lo script `bump-sw-version.ps1` per aggiornare la versione patch del Service Worker:
   ```
   .\bump-sw-version.ps1
   git add public/sw.js
   ```
   Il commit completo deve quindi essere:
   ```
   .\bump-sw-version.ps1 ; git add . ; git commit -m "<messaggio>" ; git push
   ```

2. Il messaggio di commit deve descrivere accuratamente le modifiche apportate.
