# スキル自動化ルール

- 同じ操作を 3 回行ったら確認不要で `.claude/skills/<name>/SKILL.md` に保存すること
- 既存スキルより良い手順を発見したら改善してから実行すること
- 副作用のあるスキル（デプロイ等）には `disable-model-invocation: true` を付与すること
