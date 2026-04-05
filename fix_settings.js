const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Settings.tsx', 'utf8');

// Replace preferences.xyz with profile?.preferences?.xyz
code = code.replace(/preferences\.([a-zA-Z0-9_]+)/g, 'profile?.preferences?.$1');
// except for updatePreference
code = code.replace(/profile\?\.preferences\?\.updatePreference/g, 'updatePreference');

// Ensure handleSave is used
code = code.replace(/savePreferences\(\)/g, 'handleSave()');

fs.writeFileSync('frontend/src/pages/Settings.tsx', code);
