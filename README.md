# Risk Calculator (FORTS)

Desktop-приложение на Electron + Vite + React + TypeScript для расчёта позиции и PnL по FIFO.

## Стек

- Electron
- Vite
- React
- TypeScript
- electron-builder
- Чистый CSS

## MVP функции

- Инструменты: `IMOEXF`, `MIX`, `MXI`
- Параметры: шаг цены, стоимость тика, тиков в пункте, ГО на контракт, `priceMin/priceMax`
- Диапазон дат (левая/правая)
- Редактор списка сделок (дата, BUY/SELL, цена, количество)
- FIFO очередь лотов с частичными закрытиями
- Метрики: `net position`, `open avg price`, `realized/unrealized/total PnL`, `margin required`
- SVG график цены + вертикальный слайдер `markPrice`

## Скрипты

- `npm run dev` — Vite + Electron (режим разработки)
- `npm run build` — сборка фронтенда Vite
- `npm run build:electron` — компиляция `electron/main.ts`
- `npm run dist` — сборка приложения через electron-builder

## Сборка macOS

После `npm run dist` артефакт приложения находится в:

- `dist/mac-arm64/Risk Calculator.app`
