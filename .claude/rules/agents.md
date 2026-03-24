# エージェント起動ルール

- 未知のコード調査が必要なら実装前に researcher を起動すること
- `apps/` は implementer-a、`packages/` `infra/` は implementer-b にアサインすること
- 3 ファイル以上または 100 行以上の変更後は reviewer を起動すること
- 並列化できるタスクが 2 つ以上あれば podcast-dev チームを起動すること（手順: `.claude/teams/podcast-dev.md`）
