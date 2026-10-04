export function initialQuality({ cores = 8, memory = 8, coarse = false, reduced = false } = {}) {
  return cores <= 4 || memory <= 4 || reduced ? 0 : coarse ? 1 : 2;
}
export const qualityLevels = [
  { name: 'Eco', ratio: .75, density: .4, shadows: false, effects: false, reflectionEvery: 4 },
  { name: 'Balanced', ratio: 1, density: .7, shadows: true, effects: false, reflectionEvery: 3 },
  { name: 'High', ratio: 1.5, density: 1, shadows: true, effects: true, reflectionEvery: 2 },
];
export function adaptiveQuality(initial) {
  let level=initial, seconds=0, frames=0, good=0;
  return {
    reset(){seconds=0;frames=0;good=0;},
    sample(dt){
      if(dt<=0||dt>5)return null;
      seconds+=dt;frames++;
      if(seconds<4)return null;
      const fps=frames/seconds;seconds=0;frames=0;
      if(fps<32&&level>0){good=0;return {level:--level,fps};}
      good=fps>55?good+1:0;
      if(good>=4&&level<initial){good=0;return {level:++level,fps};}
      return {level,fps};
    }
  };
}
