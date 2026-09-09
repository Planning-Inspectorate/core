import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('index', () => {
	const srcDir = import.meta.dirname;
	it('should export from all source files', async () => {
		// read all source files
		const filesAndFolders = await fs.readdir(srcDir, { recursive: true, withFileTypes: true });
		const folders = filesAndFolders
			.filter((f) => f.isDirectory())
			// exclude ui folders from checks, as they don't contain TypeScript source code
			.filter((f) => !f.parentPath.endsWith('ui') && f.name !== 'ui');
		const files = filesAndFolders.filter((f) => f.isFile()).filter((f) => !f.name.endsWith('.test.ts'));
		const indexFiles = files.filter((f) => f.name === 'index.ts').filter((f) => !f.parentPath.endsWith('src'));
		const sourceFiles = files.filter((f) => f.name !== 'index.ts');

		const rootIndex = files.find((f) => f.name === 'index.ts' && f.parentPath.endsWith('src'));
		assert.ok(rootIndex, 'there must be a root src/index.ts file');
		const rootIndexContents = await fs.readFile(path.join(srcDir, rootIndex.name), { encoding: 'utf8' });

		// ensure each folder has:
		// some source files
		// export in root index.ts
		// an index.ts file
		// export for each source file
		for (const folder of folders) {
			const folderPath = path.join(folder.parentPath, folder.name);
			const relativePath = folderPath.replace(srcDir, '');
			const filesInFolder = sourceFiles.filter((f) => f.parentPath === folderPath);

			// check there are some source files
			assert.ok(filesInFolder.length > 0, `${relativePath} must have at least one source file`);
			// check the root index.ts contains an export for this folder
			assert.ok(
				rootIndexContents.includes(`export * from './${folder.name}/index.ts';`),
				`src/index.ts must export ${folder.name}`
			);

			// check this folder has an index.ts file
			const indexFile = indexFiles.find((f) => f.parentPath === folderPath);
			assert.ok(indexFile, `${relativePath} must have an index file`);

			// check each source file is exported
			const indexFileContents = await fs.readFile(path.join(folderPath, indexFile.name), { encoding: 'utf8' });
			for (const file of filesInFolder) {
				assert.ok(
					indexFileContents.includes(`export * from './${file.name}';`),
					`${relativePath} must export ${file.name}`
				);
			}
		}
	});
});
