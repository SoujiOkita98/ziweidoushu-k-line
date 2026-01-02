# Zi Wei Dou Shu 命盘 + 人生K线 (MVP)

最小可运行原型：输入出生信息，生成紫微斗数命盘 + 人生K线图。

## 运行

```bash
npm install
npm run dev
```

浏览 `http://localhost:3000`。

## 构建

```bash
npm run build
npm run start
```

## 结构说明

- `src/app/page.tsx`：主页面，输入表单 + 结果展示
- `src/app/api/chart/route.ts`：排盘 API
- `src/components/ChartBoard.tsx`：命盘 4x4 布局渲染
- `src/components/LifeKline.tsx`：ECharts 人生K线
- `src/lib/ziwei.ts`：iztro 封装与命盘归一化
- `src/lib/kline.ts`：K线评分算法

## K线权重调整

修改 `src/lib/kline.ts` 内的权重：

- `AUSPICIOUS` / `INAUSPICIOUS`：吉星与煞星名单
- `generateKline` 中 `50 + goodScore - badScore + ...` 公式

## 限制

- 阴历支持依赖 iztro 排盘；若失败请改用阳历
- K线算法为 MVP 版启发式估算，仅用于演示

