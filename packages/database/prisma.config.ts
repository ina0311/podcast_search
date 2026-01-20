import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'src/prisma',
  migrations: {
    path: 'src/prisma/migrations'
  },
  datasource: {
    // postinstall時など、DATABASE_URLが設定されていない場合はダミー値を設定
    // prisma generateはデータベース接続を必要としないため、ダミー値で問題ない
    // 実際のデータベース操作時には環境変数から読み込まれる
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'
  }
})
