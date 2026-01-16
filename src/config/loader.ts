import * as fs from "fs";
import * as YAML from "yaml";

export function loadYamlConfig(path: string): unknown {
  if (!fs.existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }

  const raw = fs.readFileSync(path, "utf-8");
  return YAML.parse(raw);
}
