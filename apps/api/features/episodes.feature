Feature: エピソード API
  エピソードの取得と検索に関する API エンドポイント

  Scenario: ヘルスチェックエンドポイント
    When GET /health をリクエストする
    Then ステータスコード 200 が返される
    And レスポンスに status: "ok" が含まれる

  Scenario: エピソード一覧を取得する
    Given データベースにエピソードが登録されている
    When GET /episodes をリクエストする
    Then ステータスコード 200 が返される
    And レスポンスに episodes 配列が含まれる

  Scenario: エピソード詳細を取得する
    Given データベースに id=1 のエピソードが存在する
    When GET /episodes/1 をリクエストする
    Then ステータスコード 200 が返される
    And レスポンスに title が含まれる

  Scenario: 存在しないエピソードを取得する
    Given データベースに id=9999 のエピソードが存在しない
    When GET /episodes/9999 をリクエストする
    Then ステータスコード 404 が返される

  Scenario: 無効なIDでエピソードを取得する
    When GET /episodes/invalid をリクエストする
    Then ステータスコード 400 が返される

  Scenario: 検索エンドポイント - 有効なクエリ
    Given OpenAI API キーが設定されている
    And Qdrant にセグメントが登録されている
    When GET /search?q=AIについて をリクエストする
    Then ステータスコード 200 が返される
    And レスポンスに episodes 配列が含まれる
    And レスポンスに hitsCount が含まれる

  Scenario: 検索エンドポイント - クエリなし
    When GET /search をリクエストする
    Then ステータスコード 400 が返される

  Scenario: 検索エンドポイント - OpenAI API キー未設定
    Given OpenAI API キーが設定されていない
    When GET /search?q=テスト をリクエストする
    Then ステータスコード 503 が返される

  Scenario: 存在しないエンドポイント
    When GET /nonexistent をリクエストする
    Then ステータスコード 404 が返される

