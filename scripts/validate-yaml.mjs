#!/usr/bin/env node
// scripts/validate-yaml.mjs
import fs from 'fs';
import YAML from 'yaml';
import path from 'path';

/**
 * Valida a sintaxe de um arquivo YAML
 */
function validateYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    YAML.parse(content);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Valida todos os arquivos YAML em um diretório recursivamente
 */
function validateYamlDirectory(dir) {
  const results = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
        const result = validateYamlFile(fullPath);
        results.push({ path: fullPath, ...result });
      }
    }
  }

  traverse(dir);
  return results;
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node scripts/validate-yaml.mjs <file-or-directory>');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/validate-yaml.mjs configuration/shared/models/gpt-4o-mini.yaml');
    console.error('  node scripts/validate-yaml.mjs configuration/');
    process.exit(2);
  }

  const target = args[0];

  if (!fs.existsSync(target)) {
    console.error(`Error: Path not found: ${target}`);
    process.exit(1);
  }

  const stat = fs.statSync(target);
  let results;

  if (stat.isDirectory()) {
    console.log(`Validating YAML files in directory: ${target}\n`);
    results = validateYamlDirectory(target);
  } else if (stat.isFile()) {
    console.log(`Validating YAML file: ${target}\n`);
    results = [validateYamlFile(target)];
    results[0].path = target;
  } else {
    console.error(`Error: ${target} is not a file or directory`);
    process.exit(1);
  }

  // Print results
  let hasErrors = false;

  for (const result of results) {
    if (result.success) {
      console.log(`✓ ${result.path}`);
    } else {
      console.error(`✗ ${result.path}`);
      console.error(`  Error: ${result.error}`);
      hasErrors = true;
    }
  }

  console.log('');
  console.log(`Total: ${results.length} file(s)`);
  console.log(`Success: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);

  if (hasErrors) {
    console.error('\nValidation failed!');
    process.exit(1);
  } else {
    console.log('\n✓ All YAML files are valid!');
    process.exit(0);
  }
}

main();
