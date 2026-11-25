import fs from 'node:fs';
const h = fs.readFileSync('C:/ZOCOPOS 2.0/app/landing-2.html', 'utf8');
console.log('len', h.length);
console.log('idx public-plans:', h.indexOf('public-plans'));
console.log('idx grid:', h.indexOf('grid public-plans'));
console.log('idx plan-conditions:', h.indexOf('plan-conditions'));
const k = h.indexOf('public-plans');
console.log('ctx:', JSON.stringify(h.slice(k - 80, k + 120)));
