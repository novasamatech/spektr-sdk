## 0.5.0-19 (2026-01-06)

### 🚀 Features

- papp integration ([#5](https://github.com/novasamatech/spektr-sdk/pull/5))
- Implemented correct Polkadot app pairing ui ([#6](https://github.com/novasamatech/spektr-sdk/pull/6))
- Support new statement store errors while submitting statements ([#8](https://github.com/novasamatech/spektr-sdk/pull/8))
- WIP changed contract on host API according the new spec ([4fd3425](https://github.com/novasamatech/spektr-sdk/commit/4fd3425))
- WIP changed contract on host API according the new spec ([a55d657](https://github.com/novasamatech/spektr-sdk/commit/a55d657))
- WIP changed contract on host API according the new spec ([fb0f7b6](https://github.com/novasamatech/spektr-sdk/commit/fb0f7b6))
- WIP changed contract on host API according the new spec ([645b524](https://github.com/novasamatech/spektr-sdk/commit/645b524))
- implemented interrupt action in host api ([edfab2a](https://github.com/novasamatech/spektr-sdk/commit/edfab2a))
- new container sdk api ([569d375](https://github.com/novasamatech/spektr-sdk/commit/569d375))
- chat sdk in product api ([98ff569](https://github.com/novasamatech/spektr-sdk/commit/98ff569))
- readme ([9792401](https://github.com/novasamatech/spektr-sdk/commit/9792401))

### 🩹 Fixes

- update qs version, high severity vulnerability ([5408dfd](https://github.com/novasamatech/spektr-sdk/commit/5408dfd))
- papp types ([7d8efa6](https://github.com/novasamatech/spektr-sdk/commit/7d8efa6))
- Feature request codec ([91886c3](https://github.com/novasamatech/spektr-sdk/commit/91886c3))
- Permission request codec ([453ce4b](https://github.com/novasamatech/spektr-sdk/commit/453ce4b))
- Rename papp-ui package ([e0e0be9](https://github.com/novasamatech/spektr-sdk/commit/e0e0be9))
- package.json ([892a687](https://github.com/novasamatech/spektr-sdk/commit/892a687))

### ❤️ Thank You

- Sergey Zhuravlev @johnthecat

## 0.5.0-18 (2025-12-29)

### 🚀 Features

- papp integration ([#5](https://github.com/novasamatech/spektr-sdk/pull/5))
- Implemented correct Polkadot app pairing UI ([e2e4eeb](https://github.com/novasamatech/spektr-sdk/commit/e2e4eeb))

### ❤️ Thank You

- Sergey Zhuravlev @johnthecat

## 0.4.1 (2025-11-26)

### 🩹 Fixes

- simplified createTransaction codec ([6916a58](https://github.com/novasamatech/spektr-sdk/commit/6916a58))

### ❤️ Thank You

- Sergey Zhuravlev @johnthecat

## 0.4.0 (2025-11-26)

### 🚀 Features

- new package names, removed shared package ([283640d](https://github.com/novasamatech/spektr-sdk/commit/283640d))

### ⚠️  Breaking Changes

- Package renaming
  - `@novasamatech/spektr-sdk` -> `@novasamatech/product-sdk`
  - `@novasamatech/spektr-dapp-host-container` -> `@novasamatech/host-container`
  - `@novasamatech/spektr-sdk-transport` -> `@novasamatech/host-api`
  - `@novasamatech/spektr-sdk-shared` -> Removed


### ❤️ Thank You

- Sergey Zhuravlev @johnthecat

## 0.3.0 (2025-11-23)

### 🩹 Fixes

- Optimized hex encoding/decoding. ([017068e](https://github.com/novasamatech/spektr-sdk/commit/017068e))

### ⚠️  Breaking Changes

- Optimized hex encoding/decoding. Breaking change on transport layer.

### ❤️ Thank You

- Sergey Zhuravlev @johnthecat

## 0.2.0 (2025-11-23)

### 🚀 Features

- ⚠️  Support `createTransaction` interface ([3dc97ab](https://github.com/novasamatech/spektr-sdk/commit/3dc97ab))

### ⚠️  Breaking Changes

- `container.handleSignRequest` now has a required createTransaction method.
- `createIframeProvider` now accepts a params object instead of separate arguments.

### ❤️ Thank You

- Sergey Zhuravlev @johnthecat

## 0.1.0 (2025-11-22)

### 🚀 Features

- connection status listening ([2570ea2](https://github.com/novasamatech/spektr-sdk/commit/2570ea2))

### 🩹 Fixes

- husky config ([b175369](https://github.com/novasamatech/spektr-sdk/commit/b175369))
- node versions in github action ([7c0303c](https://github.com/novasamatech/spektr-sdk/commit/7c0303c))
- code style ([2e86aa4](https://github.com/novasamatech/spektr-sdk/commit/2e86aa4))

### ❤️ Thank You

- Sergey Zhuravlev @johnthecat

## 0.0.16 (2025-10-16)

First release with experimental API.
