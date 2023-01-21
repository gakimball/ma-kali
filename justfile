default:
  npx serve src

deploy:
  scp src/* root@geoff.zone:/var/www/ma-kali
