# 深海巨噬 (Leviathan: Apex) —— 工程级产品需求文档 (Engineering PRD v2.0)

---

## 0. 给 Antigravity 智能体的执行须知

1. 严格按 **第 12 章「开发里程碑」** 的阶段顺序增量实现，每个阶段完成后自检对应「验收标准」，全部通过后再进入下一阶段。
2. 第 3 章的 TypeScript 接口是**权威数据结构**，后续所有系统必须基于这些接口实现，不得随意更改字段命名。
3. 第 9 章明确本项目**不依赖任何外部美术/音频资源**，禁止引入占位图片 URL 或网络字体，全部视觉效果用 Canvas 2D 原生绘制（矢量图形、渐变、粒子）实现。
4. 若某数值在实际测试中手感不佳，允许在 `src/config/gameConfig.ts` 中调整，但**不得更改架构约束**（无头模拟、固定步长、空间哈希、事件解耦）。

---

## 1. 项目概述

* **游戏定位**：2D 俯视角、基于 Web 的海洋生存吞噬游戏（Roguelite 进化 + 弱竞技微操）。
* **技术栈**：Vite + React 18 + TypeScript (strict mode) + Zustand（全局状态） + HTML5 Canvas 2D（渲染）。
* **目标平台**：桌面浏览器（Chrome/Edge/Firefox 最新版），分辨率自适应，最小支持 1024×640；移动端触控为 Stretch Goal（见第 14 章）。
* **核心体验**：从小鱼起步，通过不断吞噬进化，体验"从小到大"的膨胀感。融合微操、爽快连击与 Roguelite 升级。
* **单局时长目标**：8～15 分钟（endless 模式，无强制通关终点，但设有等阶头衔里程碑，见 6.4）。

---

## 2. 技术栈与项目结构

```
leviathan-apex/
├── src/
│   ├── engine/                  # 无头模拟层（与 React 完全解耦，不引用任何 React API）
│   │   ├── store.ts             # Zustand / 自定义发布订阅的权威游戏状态
│   │   ├── loop.ts              # 固定步长主循环（累加器模式）
│   │   ├── spatialHash.ts       # 动态空间哈希网格
│   │   ├── entityPool.ts        # 对象池（实体 + 粒子复用）
│   │   ├── systems/
│   │   │   ├── movementSystem.ts
│   │   │   ├── aiSystem.ts
│   │   │   ├── collisionSystem.ts
│   │   │   ├── consumptionSystem.ts   # 吞噬/质量守恒
│   │   │   ├── comboFrenzySystem.ts
│   │   │   ├── evolutionSystem.ts     # 突变/升级
│   │   │   ├── spawnSystem.ts         # 生态动态生成/回收
│   │   │   └── cameraSystem.ts        # 无极视界缩放
│   │   └── types.ts             # 第 3 章所有接口
│   ├── render/
│   │   ├── CanvasRenderer.ts    # 权威 Canvas 绘制入口
│   │   ├── drawEntity.ts
│   │   ├── drawBackground.ts
│   │   └── drawParticles.ts
│   ├── ui/                      # 仅负责 HUD/菜单，读 store 只读快照
│   │   ├── HUD.tsx
│   │   ├── ComboBar.tsx
│   │   ├── EvolutionCardModal.tsx
│   │   ├── StartScreen.tsx
│   │   └── GameOverScreen.tsx
│   ├── config/
│   │   └── gameConfig.ts        # 全部可调数值常量（见各章"参数表"）
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── README.md
```

**约束**：`engine/` 目录下任何文件禁止 `import react`；`ui/` 目录只允许通过订阅 store 的只读 selector 获取渲染所需快照，禁止直接修改 engine 内部状态（必须通过 store 暴露的 action 函数）。

---

## 3. 权威数据结构（TypeScript）

```ts
// src/engine/types.ts

export type Vector2 = { x: number; y: number };

export enum EntityType {
  Plankton = "plankton",
  Prey = "prey",
  Competitor = "competitor",
  Predator = "predator",
  Player = "player",
}

export enum AIState {
  Idle = "idle",
  Wander = "wander",
  Flee = "flee",
  Pursue = "pursue",
  Attack = "attack",
}

export interface BaseEntity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  facing: number;        // 朝向弧度，用于绘制头尾方向
  mass: number;
  radius: number;        // 由 mass 派生，见 5.2 公式，禁止直接赋值
  isAlive: boolean;
  poolIndex: number;     // 对象池索引，用于回收
}

export interface AIEntity extends BaseEntity {
  aiState: AIState;
  perceptionRadius: number;
  baseSpeed: number;
  wanderTarget: Vector2;
  targetEntityId: string | null;
}

export interface MutationInstance {
  id: string;
  stacks: number;
}

export interface Player extends BaseEntity {
  type: EntityType.Player;
  baseSpeed: number;
  isDashing: boolean;
  dashHeldMs: number;
  comboCount: number;
  comboLastEatAt: number;       // 逻辑时钟时间戳（ms）
  frenzyUntil: number | null;   // 逻辑时钟时间戳，null 表示未激活
  mutations: MutationInstance[];
  evolutionLevel: number;
  isInvulnerableUntil: number | null;
}

export interface ParticleEvent {
  id: string;
  kind: "eat_burst" | "bubble_trail" | "combo_flash" | "shield_break";
  position: Vector2;
  createdAt: number;
  ttlMs: number;
  meta?: Record<string, number>;
}

export interface CameraState {
  position: Vector2;    // 世界坐标，通常等于 player.position
  scale: number;         // 当前像素/世界单位缩放，平滑插值
  targetScale: number;
}

export type GameStatus = "start_screen" | "playing" | "paused_evolution" | "game_over";

export interface WorldState {
  status: GameStatus;
  logicalClockMs: number;      // 权威模拟时间，仅在 status === "playing" 时推进
  player: Player;
  entities: Map<string, AIEntity>; // 不含玩家，玩家单独存储
  spatialHash: SpatialHashGrid;    // 见 4.3
  particles: ParticleEvent[];      // Ephemeral Rendering Queue，独立于逻辑状态
  camera: CameraState;
  pendingEvolutionChoices: MutationCardDef[] | null;
  stats: {
    totalEaten: number;
    maxMassReached: number;
    survivalMs: number;
  };
}
```

---

## 4. 系统架构（不可妥协的约束）

### 4.1 无头模拟架构
* 游戏核心逻辑（物理、状态、实体）与 React 渲染树完全解耦。
* `engine/store.ts` 建立全局 Store（Zustand 或纯 TS 单例 Class 均可，推荐 Zustand 便于 React 订阅）。
* React 组件树仅负责：读取 store 快照渲染 HUD/菜单、捕获用户输入并转发为 `store.actions.xxx()` 调用。React **不得**持有任何游戏逻辑分支（例如碰撞判断、伤害计算）。

### 4.2 固定步长循环（Fixed-Step Loop）

```ts
// src/engine/loop.ts 伪代码
const TICK_MS = 1000 / 60;         // 60Hz 权威更新，可在 gameConfig 中切换为 30Hz
let accumulator = 0;
let lastFrameTime = performance.now();
const MAX_FRAME_DT = 100;          // 防止切后台/卡顿导致"死亡螺旋"，clamp 单帧最大 100ms

function rafLoop(now: number) {
  const frameDt = Math.min(now - lastFrameTime, MAX_FRAME_DT);
  lastFrameTime = now;
  accumulator += frameDt;

  while (accumulator >= TICK_MS) {
    if (store.getState().status === "playing") {
      runFixedTick(TICK_MS);       // 依次调用 movement -> ai -> collision -> consumption -> combo -> spawn -> camera
    }
    accumulator -= TICK_MS;
  }

  const renderAlpha = accumulator / TICK_MS;   // 用于插值渲染，减少视觉抖动（可选实现）
  CanvasRenderer.render(store.getState(), renderAlpha);
  requestAnimationFrame(rafLoop);
}
```

* **逻辑更新循环**（`runFixedTick`）与**渲染循环**（`requestAnimationFrame`）必须物理分离，前者驱动权威状态，后者只读取状态绘制。
* `status !== "playing"`（如进化选卡暂停）时，`runFixedTick` 整体跳过，但渲染循环继续运行（用于展示暂停时的静止画面 + 弹窗动画）。

### 4.3 动态空间哈希网格（Dynamic Spatial Hash Grid）

```ts
interface SpatialHashGrid {
  cellSize: number;                          // 动态调整，见下
  cells: Map<string, Set<string>>;           // key = `${cellX},${cellY}`，value = entity id 集合
  insert(entity: BaseEntity): void;
  remove(entity: BaseEntity): void;
  update(entity: BaseEntity, prevPos: Vector2): void;  // 位置变化时迁移所在格
  queryNearby(position: Vector2, radius: number): string[]; // 返回候选 entity id，仅遍历相邻 3x3 格
}
```

* `cellSize` 初始值 = 玩家初始半径 × 4，每当玩家半径增长超过 50% 时重新计算并 rehash 一次（避免格子相对生物尺寸过小或过大）。
* **严禁 O(n²) 全量遍历**做碰撞检测；碰撞/视距查询一律通过 `queryNearby` 获取候选集合后再做精确圆形碰撞判定。

### 4.4 视觉事件解耦（Ephemeral Visual Events）

* 吃鱼爆汁、水波纹、连击残影、护盾破碎等，一律通过 `store.actions.emitParticle(event: ParticleEvent)` 推入 `WorldState.particles` 队列。
* 渲染层每帧根据 `createdAt + ttlMs` 判断是否过期并剔除，**不得**将粒子生命周期状态写回权威游戏逻辑（如 mass、combo 等）。
* 粒子对象同样走对象池（`entityPool.ts` 扩展支持粒子池），避免频繁 GC。

---

## 5. 核心玩法机制（含精确数值）

### 5.1 动态无极视界（Camera Zoom）

* 全局坐标系视为无限大浮点平面。
* 玩家视觉尺寸恒定占屏幕宽度 **5%**（即玩家直径像素 = `canvasWidth * 0.05`）。
* 缩放公式：

```ts
const desiredPixelDiameter = canvasWidth * 0.05;
camera.targetScale = desiredPixelDiameter / (2 * player.radius);
camera.scale = lerp(camera.scale, camera.targetScale, 0.08); // 每 tick 平滑插值，避免跳变
camera.position = player.position; // 相机永远居中玩家
```

* 世界坐标转屏幕坐标：`screenPos = (worldPos - camera.position) * camera.scale + screenCenter`。

### 5.2 质量守恒与喷射微操

* **移动**：玩家朝向鼠标指针游动，每 tick 用 `lerp(currentVelocityDir, targetDir, 0.15)` 平滑转向，速度大小 = `player.baseSpeed * (isDashing ? 1.8 : 1) * (frenzyActive ? 2 : 1)`。
* **冲刺 (Dash)**：按住鼠标左键或空格键触发 `isDashing = true`。
  * 代价：每秒扣除当前总质量的 **2%**（即每 tick 扣除 `mass * 0.02 / ticksPerSecond`），转化为身后的 `bubble_trail` 粒子事件。
  * **Frenzy 模式下冲刺不消耗质量**（见 5.3）。
  * 质量下限保护：`mass` 不得因冲刺消耗降至低于 `INITIAL_MASS * 0.5`，触底后自动关闭冲刺直至质量回升。
* **体积计算（质量→半径）**：
  ```
  mass = π * r²   =>   r = sqrt(mass / π)
  ```
  吞噬猎物时：`newMass = player.mass + prey.mass`（默认 100% 转化效率，效率系数 `EAT_EFFICIENCY` 在 config 中暴露，默认 `1.0`，便于后续平衡性调整），随后立即 `newRadius = sqrt(newMass / π)`，**同一 tick 内立即生效**，供该 tick 内后续碰撞检测使用最新半径。

### 5.3 狂热连击系统（Frenzy Combo）

| 参数 | 数值 |
|---|---|
| Combo 槽上限 | 15 |
| 每次进食 | +1 |
| 衰减触发条件 | 距上次进食 ≥ 3000ms 未进食 |
| 衰减速率 | 每 500ms 自动 -1，直至 0（衰减期间若再次进食，立刻取消衰减并 +1） |
| Frenzy 触发条件 | comboCount 达到 15 |
| Frenzy 持续时间 | 5000ms |
| Frenzy 效果 | 移速 ×2；吸收判定半径 ×1.5；冲刺不消耗质量 |
| Frenzy 结束后 | comboCount 重置为 0，槽体清空重新计数 |

* 视觉：Frenzy 激活期间画面叠加径向模糊/高光后处理效果（Canvas 可用叠加半透明径向渐变 + 提高粒子密度模拟，不要求真实 GPU 滤镜）。

### 5.4 阶段基因突变（Evolution Mutations）

* **升级阈值公式**（指数曲线）：
  ```
  levelUpMassThreshold(n) = INITIAL_MASS * (1.5 ^ n)   // n = 1, 2, 3...
  ```
  即每次玩家总质量达到下一等级阈值时触发升级。
* **触发流程**：
  1. `status` 切换为 `"paused_evolution"`，`runFixedTick` 暂停。
  2. 从「突变卡池」（见下表）按权重随机不重复抽取 3 张，写入 `pendingEvolutionChoices`。
  3. React 层弹出选卡 Modal（时间不限，等待玩家点击）。
  4. 玩家选择后调用 `store.actions.applyMutation(id)`，将对应 `MutationInstance` 加入 `player.mutations`（若已拥有则 `stacks += 1`），`status` 恢复为 `"playing"`。

**初始突变卡池（至少 8 项，禁止只实现原文档给出的 3 项）**：

| ID | 名称 | 效果 | 权重 | 可叠加 |
|---|---|---|---|---|
| mut_shield | 骨化重甲 | 抵御一次致命撕咬（消耗品，触发后清空该次伤害并击退攻击者，获得 1000ms 无敌帧），使用后消耗 1 层 | 30 | 是（多层可多次抵挡） |
| mut_engulf | 深渊巨口 | 吞噬判定半径 +20%（仅碰撞/吸入半径，不改变视觉渲染半径） | 30 | 是（每层再 +20%，乘算） |
| mut_fin | 涡轮尾鳍 | 基础移速 +15% | 30 | 是（每层再 +15%，乘算） |
| mut_efficient_gut | 高效消化 | 吞噬质量转化效率 +10%（EAT_EFFICIENCY 提升） | 20 | 是 |
| mut_combo_guard | 连击守护 | Combo 衰减触发时间由 3000ms 延长至 5000ms | 15 | 否（唯一） |
| mut_frenzy_extend | 狂热延续 | Frenzy 持续时间由 5000ms 延长至 7000ms | 15 | 否（唯一） |
| mut_perception | 侧线感知 | 顶级掠食者对玩家的感知范围 -15%（更晚被发现） | 15 | 是 |
| mut_dash_regen | 涡轮增压 | 冲刺质量消耗速率 -30% | 20 | 是 |

* 卡池及权重定义在 `src/config/gameConfig.ts` 的 `MUTATION_POOL` 常量中，便于后续增删。

---

## 6. 实体生态与 AI

### 6.1 通用实体属性

所有实体均具有 `x, y, radius, mass, type` 等第 3 章定义字段。

### 6.2 类型定义与关系表

| 类型 | 相对玩家半径范围 | 关系 | 默认行为 |
|---|---|---|---|
| 浮游生物 Plankton | 固定极小（约玩家初始半径的 5%~10%，不随玩家成长动态刷新，视为恒定背景饵料） | 恒可吞噬 | 静止或微小布朗运动（每 500ms 随机漂移一次，幅度 ±5 世界单位） |
| 底层猎物 Prey | 玩家当前半径的 **20%~85%** | 可吞噬 | `AIState.Wander`，感知到玩家（进入 `perceptionRadius`）后切换 `Flee`，反方向逃跑并叠加随机扰动角度（±30°） |
| 同级竞争者 Competitor | 玩家当前半径的 **90%~110%** | 不可吞噬，弹性碰撞弹开 | 中立 `Wander`，与玩家或其他实体碰撞时按动量守恒弹性碰撞公式计算反弹速度 |
| 顶级掠食者 Predator | 玩家当前半径的 **130%~300%** | 可吞噬玩家 | `Wander` → 感知到玩家后 `Pursue`（使用玩家当前速度做前置量预测拦截）→ 进入攻击距离后 `Attack`（碰撞判定即造成吞噬结算，见 6.5） |

### 6.3 AI 状态机

```
Idle/Wander --(玩家进入 perceptionRadius)--> {Prey: Flee | Competitor: 保持 Wander | Predator: Pursue}
Flee --(玩家离开 1.5×perceptionRadius)--> Wander
Pursue --(与玩家距离 < attackRange)--> Attack
Pursue --(玩家离开 2×perceptionRadius，视为跟丢)--> Wander
Attack --(碰撞结算完成，一次性)--> 若玩家存活则回到 Pursue，若玩家死亡则场景终止
```

* **预测拦截算法**（Predator 的 Pursue 状态）：
  ```
  interceptPoint = player.position + player.velocity * (distanceToPlayer / predator.baseSpeed)
  predator.velocity = normalize(interceptPoint - predator.position) * predator.baseSpeed
  ```

### 6.4 动态生成与回收（Spawn / Object Pooling）

* **生成时机与位置**：环境生态根据玩家当前 `radius` 动态计算 Prey/Competitor/Predator 的目标半径范围（见 6.2 比例），始终在 **Camera 视口外**生成——具体为：以玩家为中心，在半径 `[viewportDiagonal * 0.6, viewportDiagonal * 1.0]` 的环形区域内随机取点（`viewportDiagonal` = 当前相机视口对角线的世界坐标长度）。
* **生成密度控制**：维持屏幕视口 1.5 倍范围内的实体总数在配置阈值内（默认：Plankton ≤ 150，Prey ≤ 60，Competitor ≤ 20，Predator ≤ 8，均可在 `gameConfig.ts` 调整），低于阈值时按固定频率（如每 300ms 检查一次）补充生成。
* **回收**：实体与玩家距离超过 `viewportDiagonal * 2.5` 时，标记 `isAlive = false` 并归还对象池（`entityPool.release(entity)`），避免频繁 `new`/GC 卡顿。对象池初始容量建议 500，超出按需扩容并记录警告日志。

### 6.5 吞噬/被吞噬结算（Consumption System）

* 每 tick 对玩家做一次 `spatialHash.queryNearby(player.position, player.radius * 2)`，取候选实体做精确圆形碰撞检测（`distance < player.radius + entity.radius * eatEngulfMultiplier`，其中 `eatEngulfMultiplier` 默认 1，受"深渊巨口"突变影响）。
* 若候选实体半径 ≤ 玩家半径（对应 Plankton/Prey，及降级后半径小于玩家的 Competitor/Predator）→ 判定为**玩家吞噬该实体**：应用 5.2 质量公式、+1 Combo、触发 `eat_burst` 粒子事件、实体回收。
* 若候选实体为 Predator 且半径显著大于玩家（差值超过阈值，默认玩家半径 < 实体半径 × 0.77，即实体比玩家至少大 30% 判定为致命）→ 判定为**玩家被吞噬**：
  * 若 `player.mutations` 中存在 `mut_shield` 且 `stacks > 0`：消耗 1 层，玩家获得 1000ms 无敌帧并被击退（沿碰撞法线方向瞬移一段距离），触发 `shield_break` 粒子事件，不触发死亡。
  * 否则：`status = "game_over"`，记录最终 `stats`。
* Competitor 与玩家/其他实体碰撞：按弹性碰撞公式交换/反弹速度分量，不产生质量变化。
* **同 tick 多实体碰撞处理顺序**：先收集本 tick 内所有与玩家碰撞的候选实体，按半径从小到大排序后依次结算，每次结算后立即用最新 `player.radius` 判断下一个候选是否仍满足碰撞条件（避免用过期半径重复判定）。

---

## 7. UI/HUD 与页面流程

### 7.1 页面状态机

```
start_screen --(点击"开始游戏")--> playing
playing --(达到升级阈值)--> paused_evolution --(选择突变卡)--> playing
playing --(玩家被吞噬且无护盾)--> game_over
game_over --(点击"再来一局")--> start_screen（或直接重置为 playing）
```

### 7.2 各页面组件要求

* **StartScreen**：游戏标题、简要操作说明（鼠标移动=游动，按住左键/空格=冲刺）、"开始游戏"按钮。
* **HUD（playing 状态常驻）**：
  * 左上角：当前质量/等阶数值（`player.mass` 取整显示 + `evolutionLevel`）。
  * 顶部居中：Combo 槽（`ComboBar.tsx`，15 格进度条，Frenzy 激活时整条高亮呼吸动画）。
  * 右上角：已吞噬数量、存活时长（`stats.totalEaten`, `stats.survivalMs` 格式化为 mm:ss）。
  * 右下角（可选 Stretch）：小地图，用小圆点标示附近 Predator 相对方位。
* **EvolutionCardModal（paused_evolution 状态）**：居中弹出 3 张卡片，展示名称+效果描述+图标（用 Canvas/SVG 绘制简单几何图标，不依赖外部图片），点击任一卡片即应用并关闭弹窗。
* **GameOverScreen**：显示 `maxMassReached`、`totalEaten`、`survivalMs`，提供"再来一局"按钮。

---

## 8. 输入与控制

| 输入 | 行为 |
|---|---|
| 鼠标移动 | 设定玩家移动目标方向为「鼠标世界坐标 - 玩家当前坐标」的单位向量 |
| 鼠标左键按住 / 空格键按住 | `isDashing = true`；松开后 `isDashing = false` |
| ESC（可选） | 若 `status === "playing"`，弹出暂停确认（Stretch Goal，非必须） |

* 所有输入事件在 React 层捕获后仅调用 `store.actions.setInputDirection(vector)` / `store.actions.setDashing(bool)`，不在 UI 层直接修改实体状态。

---

## 9. 视觉与美术资源策略（无外部美术资源）

* **原则**：项目不引入任何外部图片/字体/音频文件，全部效果通过 Canvas 2D API 程序化生成，保证 Antigravity 无需等待美术资源即可完整交付可运行游戏。
* **生物渲染**：用径向渐变填充的圆形表示身体，叠加一个小三角形/椭圆表示朝向（头部指示），根据 `facing` 弧度旋转；游动时用 `sin(logicalClockMs / 200) * amplitude` 做轻微身体缩放模拟摆尾动画。
* **配色方案（按类型区分色相）**：
  * Plankton：浅绿 `#8FE3B0`
  * Prey：浅蓝 `#6FB7E0`
  * Competitor：紫色 `#B48CE0`
  * Predator：深红 `#E05C5C`
  * Player：金黄 `#F4C542`（可随 `evolutionLevel` 逐级加深饱和度，暗示成长）
* **背景**：深海渐变（顶部略亮的蓝绿色 → 底部深蓝黑），叠加若干缓慢上浮的半透明小光斑模拟光线粒子（用低更新频率的静态粒子层，避免性能开销）。
* **粒子效果**：`eat_burst` 用 6~10 个小圆点向四周扩散并 fade-out；`bubble_trail` 用小圆点沿玩家反方向持续生成并缓慢上浮。

---

## 10. 音效（明确排除在 MVP 范围内）

* MVP 阶段**不实现**音效/音乐，避免引入音频资源依赖阻塞交付。预留 `store.actions` 中的事件钩子（如 `onEat`, `onLevelUp`, `onGameOver`）供后续接入 Web Audio API，本阶段这些钩子可为空函数。

---

## 11. 性能目标

* 目标帧率：**60 FPS**（渲染），逻辑更新固定 60Hz（可配置降级为 30Hz 作为低性能设备的兼容开关）。
* 视口 1.5 倍范围内并发实体数达到 **300~500** 时仍需维持目标帧率，依赖：
  * 空间哈希网格避免 O(n²) 碰撞检测；
  * 实体与粒子对象池，避免高频 GC；
  * Canvas 绘制避免每帧创建新渐变对象（复用 `CanvasGradient` 缓存，或用纯色近似）。
* 提供开发模式下的 FPS/实体数 Debug Overlay（左上角小字显示，生产构建可通过 config 关闭）。

---

## 12. 开发里程碑（供 Antigravity 增量实现，每阶段附验收标准）

### Phase 0 — 项目脚手架
* 内容：Vite + React + TS 初始化，ESLint/Prettier 配置，按第 2 章目录结构创建空文件骨架。
* 验收：`npm run dev` 可启动，浏览器显示空白 Canvas 全屏画布。

### Phase 1 — 核心循环骨架
* 内容：实现 4.2 固定步长循环，接入 Debug FPS Overlay，Canvas 每 tick 清屏重绘（暂无实体）。
* 验收：控制台/Overlay 显示稳定 60 FPS，无逻辑异常报错；调整浏览器窗口大小 Canvas 自适应。

### Phase 2 — 玩家与移动
* 内容：实现 Player 实体、鼠标跟随移动（5.2 转向公式）、冲刺（含质量消耗与下限保护）、动态视界缩放（5.1）。
* 验收：玩家圆形可跟随鼠标平滑移动；按住左键/空格质量按 2%/秒速率下降且有下限；缩放相机使玩家视觉尺寸恒定。

### Phase 3 — 实体生态与 AI
* 内容：实现空间哈希网格（4.3）、对象池（6.4）、Plankton/Prey/Competitor/Predator 生成与 AI 状态机（6.3）。
* 验收：屏幕外持续有实体按 6.2 比例生成；Prey 逃跑、Competitor 弹开、Predator 追击行为可观察；实体离开范围后被正确回收（可通过 Debug Overlay 观察对象池复用而非持续 new）。

### Phase 4 — 吞噬与质量守恒
* 内容：实现 6.5 吞噬结算、5.2 质量→半径公式、`eat_burst` 粒子事件（4.4）。
* 验收：吞噬小实体后玩家半径按公式正确增长；被大型 Predator 碰撞在无护盾情况下触发 `game_over`。

### Phase 5 — Combo / Frenzy 系统
* 内容：实现 5.3 全部数值逻辑与 HUD ComboBar。
* 验收：连续进食正确累加 Combo；3 秒不吃触发衰减；满 15 触发 5 秒 Frenzy（移速/吸收半径/免费冲刺均生效），结束后正确重置。

### Phase 6 — 进化突变系统
* 内容：实现 5.4 升级阈值、暂停模拟、三选一卡牌 UI、突变效果落地到对应系统（吞噬半径/移速/护盾/效率等）。
* 验收：达到阈值时模拟正确暂停并弹出 3 张不重复卡牌；选择后效果立即生效且可叠加（按各卡叠加规则）；模拟正确恢复。

### Phase 7 — 完整 UI 流程
* 内容：StartScreen、GameOverScreen、页面状态机（7.1）接入。
* 验收：从开始画面到游戏结束到重新开始的完整闭环可无刷新完成。

### Phase 8 — 性能优化与打磨
* 内容：压测 300~500 实体场景下的帧率，调优空间哈希 `cellSize`、对象池容量、生成密度阈值；补充边界情况处理（第 13 章）。
* 验收：达到第 11 章性能目标，且第 13 章边界情况均有对应处理逻辑并手动验证通过。

---

## 13. 边界情况与容错

| 场景 | 处理方式 |
|---|---|
| 窗口 resize | 监听 `resize` 事件，重新计算 Canvas 尺寸与 `desiredPixelDiameter`，相机 `targetScale` 平滑过渡 |
| 浏览器标签切后台 | `requestAnimationFrame` 会自动暂停，恢复时通过 `MAX_FRAME_DT` clamp 防止单帧 dt 过大导致"死亡螺旋"或实体瞬移 |
| 玩家质量被冲刺消耗至下限 | 自动强制 `isDashing = false`，禁止再次触发直至质量回升超过下限 |
| 极小视口（如移动端竖屏） | 提示"建议使用桌面浏览器以获得最佳体验"的兼容性提示条，不阻塞游玩 |
| 实体生成时重叠 | 生成前对目标点做一次最小间距检查（与最近已存在实体距离 < 双方半径之和时重新取点，最多重试 5 次后放弃本次生成） |
| 同 tick 内多个实体同时可被吞噬 | 按 6.5 末尾所述，按半径升序依次结算并实时更新玩家半径 |
| 对象池耗尽 | 按需动态扩容并在 Debug Overlay 输出一次性警告日志，不阻塞游戏运行 |

---

## 14. 非目标 / Out of Scope（明确排除，避免范围蔓延）

* 联机对战/多人同步。
* 移动端触控适配（仅保留兼容性提示，不做专门触控交互设计）。
* 音效/音乐系统（预留钩子，不实现）。
* 付费/内购/广告等商业化模块。
* 账号系统、云存档、排行榜后端。

---

## 15. 验收标准总纲（Definition of Done）

1. `npm install && npm run dev` 可一键启动，无控制台报错。
2. 完整可玩闭环：开始 → 生长/进化 → 死亡结算 → 重开，全部无需刷新页面。
3. 第 11 章性能目标达成（300~500 并发实体下 60 FPS）。
4. 第 5、6 章所有数值与公式在代码中可在 `gameConfig.ts` 中一处统一调整，不散落硬编码于各系统文件。
5. `engine/` 目录零 React 依赖，可独立单元测试（至少覆盖质量→半径公式、Combo 衰减逻辑、升级阈值公式三个纯函数）。
6. 无外部网络资源依赖（图片/字体/音频均不走网络请求）。

---

## 16. 交付物清单

* 完整源码（按第 2 章目录结构）。
* `README.md`：包含安装、启动、构建命令说明。
* `src/config/gameConfig.ts`：集中暴露本文档中所有可调数值，附中文注释标明对应章节出处，便于后续策划调参。