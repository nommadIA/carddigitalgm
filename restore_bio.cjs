const { execSync } = require('child_process');
try {
  execSync('git checkout pages/Bio.tsx');
  console.log('Restored pages/Bio.tsx successfully!');
} catch (e) {
  console.error('Failed to restore:', e.message);
}
