# Java to UMLet 変換ルール仕様

このドキュメントでは、JavaソースコードからUMLet形式のクラス図への変換ルールを詳しく説明します。

## クラス表記ルール

### 基本クラス表記

```
ClassName
--
フィールド
--
メソッド
```

### クラス種別による表記

#### 通常のクラス

```
Car
```

#### 抽象クラス

```
/AbstractVehicle/
```

- クラス名全体を斜線（`/`）で囲む

#### インターフェース

```
<<interface>>
Drawable
```

- `<<interface>>`ステレオタイプを表示

#### 列挙型（Enum）

```
<<enum>>
Color
```

- `<<enum>>`ステレオタイプを表示

## 可視性記号

| 修飾子 | 記号 | 説明 |
|--------|------|------|
| `public` | `+` | パブリック |
| `private` | `-` | プライベート |
| `protected` | `#` | プロテクテッド |
| `package` (デフォルト) | `~` | パッケージプライベート |

## フィールド表記ルール

### 基本形式

```
可視性記号 フィールド名: 型
```

### 修飾子による表記

#### static フィールド

```
_ + MAX_SIZE: int _
```

#### final フィールド

- 無視する。

#### static final フィールド（定数）

```
_ + PI: double_
```

### 実例

```
Car
--
- engine: Engine
_ - carCount: int_
+ VIN: String
_+ MAX_SPEED: double_
```

## メソッド表記ルール

### 基本形式

```
可視性記号 メソッド名(引数名: 引数の型): 戻り値の型
```

### 修飾子による表記

#### static メソッド

```
_ + getInstance(): Singleton_
```

#### final メソッド

- 無視する

#### 抽象メソッド

```
/+ start(): void/
```

- メソッド行全体を斜線（`/`）で囲む

### 引数表記

- 引数は引数名: 引数の型で表記
- 複数引数はカンマで区切り

```
+ calculate(Test: double, Test2: int): double
+ setValues(Test3: String, Test4: boolean, Test5: int): void
```

### 実例

```
/AbstractVehicle/
--
# brand: String
--
/+ start(): void/
+ getVehicleInfo(): String
_+ getVehicleCount(): int_
+ setBrand(String): void
```

## 関係性表記ルール

### 検出される関係性

| 関係性 | 矢印表記 | 検出条件 |
|--------|----------|----------|
| 継承 | `──\|▷` | `extends`キーワード |
| 実装 | `┅┅\|▷` | `implements`キーワード |
| コンポジション | `◆───` | コンストラクタ内で`new`演算子 |
| 集約 | `◇───` | コンストラクタ引数として受け取る + メソッド内で`new`演算子 |
| 依存 | `┅┅▷` | メソッド引数での使用 |

### 関係性検出ロジック

#### 継承（Inheritance）

```java
public class Car extends Vehicle {
    // Car ──|▷ Vehicle
}
```

#### 実装（Implementation）

```java
public class Car implements Drivable {
    // Car ┅┅|▷ Drivable
}
```

#### コンポジション（Composition）

```java
public class Car {
    private Engine engine;
    
    public Car() {
        this.engine = new Engine(); // フィールド宣言 + コンストラクタでnew
    }
}
// Car ◆─── Engine
```

#### 集約（Aggregation）

```java
public class Car {
    private Driver driver;
    
    public Car(Driver driver) {
        this.driver = driver; // フィールド宣言 + コンストラクタ引数
    }
}
// Car ◇─── Driver
```

#### 依存（Dependency）

```java
public class CarService {
    public void repair(Car car) { // メソッド引数での使用
        // ...
    }
}
// CarService ┅┅▷ Car
```

## 特殊ルール

### 表示しない関係性

- **関連関係（Association）**: フィールドでの単純な参照は表示しない

### 処理優先順位

1. 継承・実装関係
2. コンポジション関係（コンストラクタでのnew）
3. 集約関係（コンストラクタ引数）
4. 集約関係（メソッドでのnew）
5. 依存関係（メソッド引数）

### フィールドベース判定

- 所有関係（コンポジション・集約）は、フィールドで宣言されているクラスに対してのみ適用
- フィールド宣言がない場合は所有関係として扱わない

## コード解析ルール

### 前処理

- 文字列リテラル・文字リテラルを一時的に置換
- 複数行コメント（`/* */`）を削除
- 単行コメント（`//`）を削除
- アノテーション（`@Override`など）を削除
- 余分な空白を正規化

### 除外対象

- ネストしたクラス内の要素（部分的サポート）
- ラムダ式
- メソッド内のローカル変数宣言

### 型処理

- ジェネリクス型（`List<String>`）から基本型（`List`）を抽出
- 配列型（`String[]`）から基本型（`String`）を抽出
- プリミティブ型（`int`, `double`など）は関係性検出から除外

## 実装上の注意点

### 修飾子の順序

修飾子は任意の順序で記述可能：

```java
public static final String CONSTANT = "value";
final static public String CONSTANT = "value"; // 同じ結果
```

### コンストラクタ検出

- メソッド名がクラス名と同じもの
- 戻り値の型が指定されていないもの
- `constructors`配列と`methods`配列の両方をチェック

### エラーハンドリング

- 解析エラー時は空の結果を返す
- 部分的に解析できない場合も可能な限り処理を継続
