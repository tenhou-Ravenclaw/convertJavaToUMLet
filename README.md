# Java to UMLet Converter - モジュラー版

包括的なJavaソースコードからUMLet形式のテキストを生成するWebアプリケーションです。UML標準に準拠した5種類の関係性（継承、実装、コンポジション、集約、依存）を正確に検出し、視覚的にわかりやすい形式で表示します。

## 📖 詳細な仕様

**UML表記ルールや関係性検出の詳細については [docs/rule.md](docs/rule.md) を参照してください。**

## 機能

- **完全なJava解析**: クラス、インターフェース、enum、フィールド、メソッドの解析
- **UML標準準拠の関係性検出**:
  - 継承 (Inheritance): `extends` キーワード
  - 実装 (Implementation): `implements` キーワード  
  - コンポジション (Composition): コンストラクタでの `new` 演算子
  - 集約 (Aggregation): コンストラクタ引数として受け取る + メソッドでの `new` 演算子
  - 依存 (Dependency): メソッド引数での使用
- **フィールドベース所有関係**: フィールド宣言がない場合は所有関係を検出しない正確なロジック
- **モジュラー構造**: 保守性の高いES6モジュール設計
- **UML標準表記**: abstract（斜線）、static（アンダースコア）、final（無視）の正しい表示

## ディレクトリ構造

```
src/
├── models/          # データモデル
│   ├── Relationship.js    # 関係性クラスと定数
│   ├── JavaClass.js      # Java要素のクラス定義
│   └── index.js         # モデルのエクスポート
├── parser/          # 解析ロジック
│   ├── JavaParser.js     # Javaコード解析
│   ├── RelationshipAnalyzer.js # 関係性解析
│   └── index.js         # パーサーのエクスポート
├── generator/       # 出力生成
│   ├── UMLletGenerator.js # UMLet形式生成
│   └── index.js         # ジェネレーターのエクスポート
├── utils/           # ユーティリティ
│   ├── TypeUtils.js     # 型判定ユーティリティ
│   ├── CodeUtils.js     # コード処理ユーティリティ
│   └── index.js         # ユーティリティのエクスポート
└── index.js         # メインエントリーポイント
```

## 使用方法

### Webアプリケーション

1. `index.html` をブラウザで開く
2. 左のテキストエリアにJavaコードを入力
3. 「変換」ボタンをクリック
4. 右側にクラス定義と関係性解析結果が表示される

### プログラムから使用

```javascript
import { JavaToUMLletConverter } from './src/index.js';

const converter = new JavaToUMLletConverter();
const result = converter.convert(javaCode);

if (result.success) {
    console.log('クラス数:', result.summary.classCount);
    console.log('関係性数:', result.summary.relationshipCount);
    console.log('UMLetテキスト:', result.umlText);
    console.log('関係性解析:', result.relationshipText);
}
```

## API

### JavaToUMLletConverter

#### `convert(javaCode, options)`

完全な変換を実行し、UMLet形式のテキストと関係性解析結果を返します。

#### `analyze(javaCode)`  

解析のみを実行し、UMLet生成は行いません。

#### `analyzeDetailed(javaCode)`

デバッグ情報を含む詳細な解析結果を返します。

## 関係性検出ロジック

> **詳細な仕様**: 関係性検出の詳細ロジックについては [docs/rule.md](docs/rule.md) の「関係性表記ルール」セクションを参照してください。

### 主要な関係性

#### コンポジション (Composition)

- フィールドで宣言されているクラス
- **かつ** コンストラクタ内で `new` 演算子を使用
- 表記: `◆───`

#### 集約 (Aggregation)  

- フィールドで宣言されているクラス
- **かつ** コンストラクタ引数として受け取る、またはメソッド内で `new` 演算子を使用
- 表記: `◇───`

#### 依存 (Dependency)

- メソッドの引数として使用されるクラス
- **ただし** 他の関係性が存在しない場合のみ
- 表記: `┅┅▷`

### 表示しない関係性

- **関連 (Association)**: フィールドでの単純な参照は表示されません

## UML表記仕様

> **詳細な表記ルール**: クラス、フィールド、メソッドの表記方法については [docs/rule.md](docs/rule.md) を参照してください。

### 主要な表記ルール

- **抽象クラス**: `/ClassName/` （斜線で囲む）
- **抽象メソッド**: `/+ methodName(): void/` （行全体を斜線で囲む）
- **staticメンバー**: `_+ memberName_` （アンダースコアで囲む）
- **final修飾子**: 無視（表示しない）
- **戻り値型**: void型も含めて必ず表示（コンストラクタ除く）
- **ただし** 他の関係性が存在しない場合のみ

## 設計思想

- **正確性**: UMLの標準に従った関係性検出
- **保守性**: モジュラー構造による責任分離
- **拡張性**: 新しい言語機能や関係性の追加が容易
- **可読性**: わかりやすいコードと充実したコメント

## 技術詳細

- **ES6 モジュール**: 最新のJavaScript標準を使用
- **フィールドベース判定**: 所有関係の正確な検出
- **正規表現**: 複雑なJava構文の解析
- **イミュータブル設計**: データの不変性を重視

## 制限事項

- ネストしたクラスの部分的サポート
- ジェネリクスの基本サポート
- アノテーションの限定的な解析
- ラムダ式の非サポート
- 関連関係（Association）は表示しない設計

## ドキュメント

- **[docs/rule.md](docs/rule.md)**: 完全なUML表記仕様とルール
- **[README.md](README.md)**: このファイル（概要と使用方法）

## 今後の改善予定

- [ ] ネストしたクラスの完全サポート
- [ ] ジェネリクスの詳細解析
- [ ] アノテーションの完全サポート
- [ ] ラムダ式の解析
- [ ] パッケージ間の関係性解析
- [ ] 設定可能な関係性表示オプション
