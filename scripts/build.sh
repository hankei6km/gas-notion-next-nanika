#!/bin/bash
set -e

NAMESPACE="NextNanika"
BASENAME="next-nanika"

TYPES_DIR="types"
BUILD_DIR="build"
# esbuild でビルドされた結果(定義は "esbuild.config.mjs" でされている).
OUT_MAIN="${BUILD_DIR}/main.js"
# 上記ファイルに結合して Apps Scpirt で参照できるようにするファイル.
SRC_INDEX="src/index.js"

# Apps Scipt へ push する用.
# iife 形式でビルドする(Apps Scriptからは参照できない状態).
# LICENSE の情報をまとめる.
node esbuild.config.mjs
tsc --emitDeclarationOnly --declaration --project ./tsconfig.build.json
# App Script で参照できるようにするファイルと結合.
cat "${SRC_INDEX}" "${OUT_MAIN}" > "${BUILD_DIR}/${BASENAME}.js"

# 型定義から良くない方法で export を外す(モジュールにしないため)
# index.d.ts へ移動.
sed -e 's/^export \(declare namespace\)/\1/' -- "${BUILD_DIR}/src/${BASENAME}.d.ts" > "index.d.ts"
rm "${BUILD_DIR}/src/${BASENAME}.d.ts"

# 作業用ファイルなどを削除.
rimraf "${OUT_MAIN}" "${BUILD_DIR}/src" "${BUILD_DIR}/test" "${BUILD_DIR}/src/main.js.map" 
