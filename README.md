# Mahjong score tool

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/tlrs180-1171s-projects/v0-mahjong-score-tool)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/Ak9cvKjw9fN)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/tlrs180-1171s-projects/v0-mahjong-score-tool](https://vercel.com/tlrs180-1171s-projects/v0-mahjong-score-tool)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/Ak9cvKjw9fN](https://v0.dev/chat/projects/Ak9cvKjw9fN)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## ローカル環境の構築・起動手順

このプロジェクトでは、バックエンドデータベースとしてCloudflare D1を使用しています。ローカル環境ではD1エミュレータを利用して開発を行います。

### 1. 依存パッケージのインストール

最初に必要なモジュールをインストールします。

```bash
npm install
```

### 2. ローカルデータベースのセットアップ (初回のみ)

スキーマ定義 (`schema.sql`) を用いて、ローカルのD1データベースにテーブルを作成します。

```bash
npx wrangler d1 execute mj-score-db --local --file=./schema.sql
```

### 3. 開発サーバーの起動

以下のコマンドを実行すると、Next.jsの開発サーバーとローカルD1エミュレータ（プロキシサーバー）が同時に起動します。

```bash
npm run dev
```

起動後、ブラウザで以下のURLにアクセスして動作を確認できます。
- アプリケーション: [http://localhost:3000](http://localhost:3000)
- D1プロキシサーバー: `http://localhost:8788`