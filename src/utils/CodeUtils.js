/**
 * コード処理のユーティリティ関数
 */

/**
 * ソースコードの前処理
 */
export function preprocessCode(code) {
    // 文字列リテラル内の特殊文字をエスケープ（改良版）
    const stringLiterals = [];
    let stringIndex = 0;

    // 文字列リテラルを一時的に置換
    code = code.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
        stringLiterals.push(match);
        return `"STRING_LITERAL_${stringIndex++}"`;
    });

    // 文字リテラルを一時的に置換
    code = code.replace(/'(?:[^'\\]|\\.)*'/g, (match) => {
        stringLiterals.push(match);
        return `'CHAR_LITERAL_${stringIndex++}'`;
    });

    // 複数行コメントを削除
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');

    // 単行コメントを削除
    code = code.replace(/\/\/.*$/gm, '');

    // アノテーションを削除（@Overrideなど）
    code = code.replace(/@[a-zA-Z_][a-zA-Z0-9_]*(?:\([^)]*\))?/g, '');

    // 余分な空白を正規化
    code = code.replace(/\s+/g, ' ');

    return code;
}

/**
 * メソッド本体の抽出（ネストした括弧に対応）
 */
export function extractMethodBody(code, startIndex) {
    let braceCount = 1;
    let i = startIndex + 1;

    while (i < code.length && braceCount > 0) {
        if (code[i] === '{') {
            braceCount++;
        } else if (code[i] === '}') {
            braceCount--;
        }
        i++;
    }

    return braceCount === 0 ? code.substring(startIndex + 1, i - 1) : '';
}