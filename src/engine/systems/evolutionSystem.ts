// src/engine/systems/evolutionSystem.ts

import { WorldState, MutationCardDef } from '../types';
import { GAME_CONFIG, getLevelUpThreshold } from '../../config/gameConfig';

export function evolutionSystem(state: WorldState) {
  const player = state.player;
  if (!player.isAlive) return;

  // 1. 获取下一个升级所需的质量阈值
  // n = player.evolutionLevel + 1
  const nextThreshold = getLevelUpThreshold(player.evolutionLevel + 1);

  // 2. 如果质量达到阈值，触发升级
  if (player.mass >= nextThreshold) {
    state.status = 'paused_evolution';

    // 筛选出玩家可以选择的突变卡 (对于不可叠加的突变，若已拥有则过滤掉)
    const availablePool = GAME_CONFIG.MUTATION_POOL.filter((card) => {
      if (!card.isStackable) {
        const alreadyHas = player.mutations.some(m => m.id === card.id);
        return !alreadyHas;
      }
      return true;
    });

    // 3. 按权重进行无重复随机抽卡 (抽取最多 3 张)
    const selectedChoices: MutationCardDef[] = [];
    const poolToDraw = [...availablePool];

    // 确保池子中还有卡，且尚未抽满 3 张
    while (selectedChoices.length < 3 && poolToDraw.length > 0) {
      const totalWeight = poolToDraw.reduce((sum, card) => sum + card.weight, 0);
      let rand = Math.random() * totalWeight;

      for (let i = 0; i < poolToDraw.length; i++) {
        rand -= poolToDraw[i].weight;
        if (rand <= 0) {
          selectedChoices.push(poolToDraw[i]);
          // 从候选池中删除，避免重复抽到
          poolToDraw.splice(i, 1);
          break;
        }
      }
    }

    state.pendingEvolutionChoices = selectedChoices;
  }
}
