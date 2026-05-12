# /new-feature

新機能・バグ修正の開始から PR 作成までの標準フロー。
CLAUDE.md のワークフロールールを自動的にガイドする。

---

## ステップ 1: Issue を作成する

```
GitHub Issues に以下のテンプレートで Issue を作成する：

タイトル: [機能追加 / バグ修正] {内容の概要}

本文:
## 目的
（なぜ必要か）

## 実装内容
- （箇条書き）

## 完了条件
- [ ] 〇〇が動作する
- [ ] 〇〇が表示される
```

**コマンド例:**
```bash
gh issue create --title "タイトル" --body "..."
```

---

## ステップ 2: ブランチを作成する

Issue 番号を確認してから作成する。

| 種別 | ブランチ名パターン |
|------|----------------|
| 機能追加 | `feature/issue-{番号}-{内容}` |
| バグ修正 | `fix/issue-{番号}-{内容}` |
| ドキュメント | `docs/issue-{番号}-{内容}` |
| リファクタリング | `refactor/issue-{番号}-{内容}` |
| 環境・設定 | `chore/issue-{番号}-{内容}` |

```bash
git switch -c feature/issue-{番号}-{内容}
```

---

## ステップ 3: 実装してコミットする

コミットメッセージ規則（Conventional Commits）:

```
feat: 〇〇機能を追加
fix: 〇〇のバグを修正
docs: 〇〇ドキュメントを更新
refactor: 〇〇をリファクタリング
test: 〇〇のテストを追加
chore: 〇〇の設定を更新
```

---

## ステップ 4: /quality-check を実行する

`/quality-check` コマンドでチェックリストをすべてパスさせる。

---

## ステップ 5: PR を作成する

```bash
gh pr create \
  --title "タイトル" \
  --body "## 概要
- 変更点の箇条書き

## テスト手順
- [ ] 〇〇を確認

Closes #{Issue番号}

🤖 Generated with Claude Code"
```

- `Closes #番号` を必ず本文に含める（自動クローズのため）。
- main への直接 push は禁止。必ず PR を経由する。
