# Java to UMLet Converter - モジュラー版

包括的なJavaソースコードからUMLet形式のテキストを生成するWebアプリケーションです。6種類のUML関係性（継承、実装、コンポジション、集約、関連、依存）を正確に検出し、視覚的にわかりやすい形式で表示します。

## 機能

- **完全なJava解析**: クラス、インターフェース、enum、フィールド、メソッドの解析
- **6種類のUML関係性検出**:
  - 継承 (Inheritance): `extends` キーワード
  - 実装 (Implementation): `implements` キーワード  
  - コンポジション (Composition): コンストラクタでの `new` 演算子
  - 集約 (Aggregation): メソッドでの `new` 演算子
  - 関連 (Association): フィールドでの参照
  - 依存 (Dependency): メソッド引数での使用
- **フィールドベース所有関係**: フィールド宣言がない場合は所有関係を検出しない正確なロジック
- **モジュラー構造**: 保守性の高いES6モジュール設計

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

### コンポジション (Composition)

- フィールドで宣言されているクラス
- **かつ** コンストラクタ内で `new` 演算子を使用

### 集約 (Aggregation)  

- フィールドで宣言されているクラス
- **かつ** メソッド内で `new` 演算子を使用

### 関連 (Association)

- フィールドで宣言されているクラス
- **ただし** `new` 演算子は使用しない

### 依存 (Dependency)

- メソッドの引数として使用されるクラス
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

## 今後の改善予定

- [ ] ネストしたクラスの完全サポート
- [ ] ジェネリクスの詳細解析
- [ ] アノテーションの完全サポート
- [ ] ラムダ式の解析
- [ ] パッケージ間の関係性解析
