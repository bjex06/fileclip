#!/bin/bash
# Xserverへデプロイ
git push origin main
ssh xserver "cd ~/fileclip_repo && git pull && cp -r deploy/* ~/kohinata3.xsrv.jp/public_html/ && cp deploy/.htaccess ~/kohinata3.xsrv.jp/public_html/"
echo "デプロイ完了: https://kohinata3.xsrv.jp/"
