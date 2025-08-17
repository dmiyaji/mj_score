FROM node:18-alpine

# コンテナ内の作業ディレクトリを設定
WORKDIR /usr/src/app

# ホストのpackage.jsonとpackage-lock.jsonをコンテナにコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install --legacy-peer-deps

# setup.shをコピーして実行可能にする
COPY setup.sh .
RUN chmod +x setup.sh

# その他のソースコードをコンテナにコピー
COPY . .

# アプリケーションを開発モードで起動
CMD ["npm", "run", "dev"]