// The same moving wind field drives branches, grass and airborne petals.
export function sampleWind(time, x, z, strength, out = {}) {
  const angle = time * .23 + Math.sin(time * .17) * .65;
  const gust = strength * (.75 + .25 * Math.sin(time * 1.1 + x * .13 + z * .09));
  const swirl = Math.sin(x * .16 - z * .12 + time * .7) * .32;
  out.x = Math.cos(angle + swirl) * gust;
  out.z = Math.sin(angle + swirl) * gust;
  out.y = Math.sin(time * 1.3 + x * .3 + z * .2) * gust * .13;
  return out;
}

export function advancePetal(p, dt, time, strength, riverSpeed, surface, wind, fallIntensity = 0) {
  p.age += dt;
  if (p.state === 'ground') {
    p.rest += dt;
    return p.rest > 24;
  }
  sampleWind(time, p.x, p.z, strength, wind);
  if (p.state === 'water') {
    p.rest += dt;
    p.x += (surface.slope * riverSpeed * .9 + wind.x * .08) * dt;
    p.z += riverSpeed * .9 * dt;
    p.y = .245;
    if (!surface.water) { p.state = 'ground'; p.y = surface.height; p.rest = 0; }
    return p.rest > 32;
  }
  const drag = 1 - Math.exp(-dt * 1.8);
  p.vx += (wind.x * .85 - p.vx) * drag;
  p.vz += (wind.z * .85 - p.vz) * drag;
  p.vy += (-.85 - p.speed * .35 - fallIntensity * 1.15 + wind.y - p.vy) * drag;
  p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
  if (p.y <= surface.height) {
    p.y = surface.height; p.state = surface.water ? 'water' : 'ground'; p.rest = 0;
  }
  return p.age > 100;
}

export function daylight(value) {
  const night = Math.max(0, Math.min(1, (value - .72) / .2));
  return { night: night * night * (3 - 2 * night), noon: Math.sin(Math.min(value / .72, 1) * Math.PI) };
}
