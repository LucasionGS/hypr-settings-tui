import Path from "node:path";

export const HOME = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || Deno.cwd();
export const CONFIG_DIR = Path.resolve(HOME, ".config/hypr/configs/autogen");
export const CONFIG_FILE = Path.resolve(CONFIG_DIR, "monitors.conf");