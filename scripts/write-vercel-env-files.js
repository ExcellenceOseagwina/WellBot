const fs = require("fs");
const os = require("os");
const path = require("path");

const envText = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
const values = new Map();

for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) values.set(match[1], match[2]);
}

for (const key of ["JWT_SECRET", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
  const value = values.get(key);
  if (!value) throw new Error(`Missing ${key}`);
  fs.writeFileSync(path.join(os.tmpdir(), `vercel_${key}.txt`), value);
}

fs.writeFileSync(path.join(os.tmpdir(), "vercel_APP_BASE_URL.txt"), "https://wellbot-seven.vercel.app");
console.log("created");
