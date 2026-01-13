Feature: ポッドキャスト検索
  ユーザーが自然言語クエリでポッドキャストエピソードを検索できる

  Scenario: 有効なクエリで検索する
    Given SearchCore が初期化されている
    Given Qdrant に "AIと機械学習" に関するセグメントが登録されている
    When "AIの未来について話している回" で検索する
    Then 検索結果が返される
    And 結果に episodeId が含まれる
    And 結果にスコアが含まれる

  Scenario: 検索結果の件数を制限する
    Given SearchCore が初期化されている
    And Qdrant に複数のセグメントが登録されている
    When limit を 5 に指定して検索する
    Then 検索結果が 5 件以下で返される

  Scenario: 検索クエリのバリデーション - 空文字
    When 空文字で検索クエリをバリデーションする
    Then バリデーションエラーが発生する

  Scenario: 検索クエリのバリデーション - 長すぎるクエリ
    When 201文字以上のクエリでバリデーションする
    Then バリデーションエラーが発生する

  Scenario: 検索クエリのバリデーション - 正常なクエリ
    When "有効なクエリ" でバリデーションする
    Then バリデーションが成功する

  Scenario: limit のバリデーション - 上限超過
    When limit を 51 に指定してバリデーションする
    Then バリデーションエラーが発生する

  Scenario: limit のバリデーション - デフォルト値
    When limit を指定せずにバリデーションする
    Then limit のデフォルト値は 10 になる

