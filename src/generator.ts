import path from 'path'
import fs from 'fs/promises'
import ejs from 'ejs'
import semverGt from 'semver/functions/gt'

import {
  createDocOrThrow,
  loadFromCliParamOrApiDocProject,
  loadTemplate,
  mkdirp,
  pathExists,
  templateUtils,
  unique,
  loadApidocJson,
  formatTitle
} from './utils'
import { ConfigurationObject, ConfigurationObjectCLI } from './types'

/**
 * Get the documentation generator
 *
 * @param options Documentation generator parameters
 * @returns The single or multi file EJS compiler, ready for usage
 */
export const generate = async (
  options: Omit<ConfigurationObject, 'template'> & { ejsCompiler: ejs.AsyncTemplateFunction }
) => {
  // Define template data
  let apiByGroupAndName: any[]

  // Throw error if one element is missing the `title` required key
  const elementsWithoutTitle = options.apiDocApiData.filter(x => !x.title)
  if (elementsWithoutTitle.length > 0)
    throw new Error(
      'Missing `title` key in one or more elements. Run with `--debug` to generate `api_data.json` file to try to find what is happening (see https://github.com/techdyn/apidoc-markdown/issues/26).\n' +
        `Elements without \`title\` key: ${JSON.stringify(elementsWithoutTitle, null, 2)}`
    )

  // Group apiDoc data by group and name
  apiByGroupAndName = unique(Object.values(options.apiDocApiData).map(x => x.group))
    .reduce((acc, cur) => {
      if (options.apiDocApiData.find(x => x.group === cur)) acc.push({ name: cur, subs: [] })
      return acc
    }, [] as {}[])
    .map((g: any) => {
      options.apiDocApiData.forEach(x => x.group === g.name && g.subs.push(x))
      return g
    })
    .map((g: any) => {
      g.subs = Object.values(
        g.subs.reduce((acc: any, cur: any) => {
          if (!acc[cur.title] || semverGt(cur.version, acc[cur.title].version)) acc[cur.title] = cur
          return acc
        }, {})
      )
      return g
    })

  // Sort entries by group name and title ascending
  apiByGroupAndName = apiByGroupAndName.sort((a: any, b: any) => a.name.localeCompare(b.name))
  apiByGroupAndName.forEach(x => x.subs.sort((a: any, b: any) => a.title.localeCompare(b.title)))

  // Order using the project order setting
  if (options.apiDocProjectData.order) {
    // Lowercased project order setting array
    const orderLowerCase = options.apiDocProjectData.order.map((x: string) => x.toLowerCase())

    // Filter items in/not in the project order setting array
    const inOrderArr: any[] = []
    const notInOrderArr: any[] = []
    apiByGroupAndName.forEach(x =>
      orderLowerCase.indexOf(x.name.toLowerCase()) === -1 ? notInOrderArr.push(x) : inOrderArr.push(x)
    )

    // Sorted, with the ones not in the project order setting array appended to it
    apiByGroupAndName = [
      ...inOrderArr.sort((a, b) => {
        const aIndex = orderLowerCase.indexOf(a.name.toLowerCase())
        const bIndex = orderLowerCase.indexOf(b.name.toLowerCase())
        if (aIndex === -1 && bIndex === -1) return 0
        return aIndex > bIndex ? 1 : -1
      }),
      ...notInOrderArr
    ]
  }

  // This is the config passed to the template
  const templateConfig = {
    // Every functions in `utils_template.js` are passed to the EJS compiler
    ...templateUtils,

    project: options.apiDocProjectData,
    header: options.header,
    footer: options.footer,
    prepend: options.prepend
  }

  return !options.multi
    ? [{ name: 'main', content: await options.ejsCompiler({ ...templateConfig, data: apiByGroupAndName }) }]
    : await Promise.all(
        apiByGroupAndName.map(async x => ({
          name: x.name as string,
          content: await options.ejsCompiler({ ...templateConfig, data: [x] })
        }))
      )
}

/**
 * Generate mardown documentation.
 *
 * @param options Generator configuration
 * @returns Generated documentation
 */
export const generateMarkdown = async (options: ConfigurationObject) =>
  generate({ ...options, ejsCompiler: await loadTemplate(options.template, false) })

/**
 * Generate mardown documentation and create output file(s).
 *
 * @param options Generator configuration
 * @returns Generated documentation
 * @throws Some CLI command parameters are missing or invalid
 */
export const generateMarkdownFileSystem = async (options: ConfigurationObjectCLI) => {
  // Check the input path exists
  if (!options.input) throw new Error('`cli.input` is required but was not provided.')
  if (!(await pathExists(options.input)))
    throw new Error(`The \`cli.input\` path does not exist or is not readable. Path: ${options.input}`)

  // Check the output path exists (only parent directory if unique file)
  if (!options.output) throw new Error('`cli.output` is required but was not provided.')

  // Check if output is a directory in non-multi mode
  const isOutputDirectory = !options.output.toLowerCase().endsWith('.md') || (await pathExists(options.output) && (await fs.stat(options.output)).isDirectory())
  if (!options.multi && isOutputDirectory) {
    throw new Error(`The \`cli.output\` must be a file in single-file mode, but a directory was provided. Please specify a file path or use multi-file mode with '-m' flag. Path: ${options.output}`)
  }

  // Determine the output path and ensure parent directory exists
  const outputPath = options.output.toLowerCase().endsWith('.md') 
    ? path.dirname(path.resolve('.', options.output))
    : path.resolve('.', options.output)
  
  // Create the directory if it doesn't exist or if createPath is true
  if (options.createPath || options.multi || !(await pathExists(outputPath))) {
    await mkdirp(outputPath)
  } else if (!options.createPath && !options.multi && !(await pathExists(outputPath))) {
    throw new Error(`The \`cli.output\` path does not exist or is not readable. Path: ${outputPath}`)
  }

  // Try to load the apidoc.json if a custom path is provided
  if (options.apidocJsonPath) {
    const customConfig = await loadApidocJson(options.apidocJsonPath);
    if (customConfig) {
      // If we loaded a custom config, set it as the config option path for apidoc
      const tempConfigPath = path.join(outputPath, '_temp_apidoc.json');
      await fs.writeFile(tempConfigPath, JSON.stringify(customConfig, null, 2));
      options.config = tempConfigPath;
    }
  }
  
  const { apiDocProjectData, apiDocApiData } = createDocOrThrow(options)

  // Check header, footer and prepend file path exist
  options.header = await loadFromCliParamOrApiDocProject('header', options.header, apiDocProjectData)
  options.footer = await loadFromCliParamOrApiDocProject('footer', options.footer, apiDocProjectData)
  options.prepend = await loadFromCliParamOrApiDocProject('prepend', options.prepend, apiDocProjectData)

  // Generate the actual documentation
  const documentation = await generate({
    ...options,
    apiDocProjectData,
    apiDocApiData,
    ejsCompiler: await loadTemplate(options.template)
  })

  // Create the output files
  if (!options.multi) {
    // Single file documentation generation
    const singleDoc = documentation[0].content
    await fs.writeFile(options.output, singleDoc)

    if (options.debug) {
      await fs.writeFile(
        path.join(path.basename(path.dirname(options.output)), 'api_project.json'),
        JSON.stringify(apiDocProjectData, null, 2)
      )
      await fs.writeFile(
        path.join(path.basename(path.dirname(options.output)), 'api_data.json'),
        JSON.stringify(apiDocApiData, null, 2)
      )
      console.log(
        'Debug files `api_project.json` and `api_data.json` created. Put them in the bug report if you are creating one.'
      )
    }

    return [{ outputFile: options.output, content: singleDoc }]
  } else {
    if (options.debug) {
      await fs.writeFile(path.join(options.output, 'api_project.json'), JSON.stringify(apiDocProjectData, null, 2))
      await fs.writeFile(path.join(options.output, 'api_data.json'), JSON.stringify(apiDocApiData, null, 2))
      console.log(
        'Debug files `api_project.json` and `api_data.json` created. Put them in the bug report if you are creating one.'
      )
    }

    // Multi file documentation generation with optional order prefixing
    const projectOrder = apiDocProjectData.order || [];
    const results = await Promise.all(
      documentation.map(async (aDoc, index) => {
        let fileName = aDoc.name;
        
        // Add order prefix if requested and the name is in the order array
        if (options.useOrderPrefix) {
          // Find the position in the order array (case-insensitive)
          const orderIndex = projectOrder.findIndex(
            (orderItem: string) => orderItem.toLowerCase() === aDoc.name.toLowerCase()
          );
          
          // If found in order array, use that position, otherwise use the document's position
          const prefix = orderIndex !== -1 ? orderIndex + 1 : index + 1;
          fileName = `${prefix.toString().padStart(2, '0')}_${aDoc.name}`;
        }
        
        const filePath = path.resolve(outputPath, `${fileName}.md`);
        await fs.writeFile(filePath, aDoc.content);
        
        return { 
          outputFile: filePath, 
          content: aDoc.content,
          name: aDoc.name,
          fileName: fileName
        };
      })
    );
    
    // Generate table of contents file if requested
    if (options.tocFile) {
      const tocPath = path.resolve(outputPath, 'README.md');
      let tocContent = `# ${apiDocProjectData.name || 'API'} Documentation\n\n`;
      
      if (apiDocProjectData.description) {
        tocContent += `${apiDocProjectData.description}\n\n`;
      }
      
      tocContent += '## Table of Contents\n\n';
      
      // Sort results according to project order if available
      let sortedResults = [...results];
      if (projectOrder.length > 0) {
        sortedResults.sort((a, b) => {
          const aIndex = projectOrder.findIndex(
            (item: string) => item.toLowerCase() === a.name.toLowerCase()
          );
          const bIndex = projectOrder.findIndex(
            (item: string) => item.toLowerCase() === b.name.toLowerCase()
          );
          
          // If both items are in the order array, sort by their position
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          // If only a is in the order array, a comes first
          if (aIndex !== -1) {
            return -1;
          }
          // If only b is in the order array, b comes first
          if (bIndex !== -1) {
            return 1;
          }
          // If neither is in the order array, maintain their original order
          return 0;
        });
      }
      
      // Generate TOC entries
      sortedResults.forEach(doc => {
        const formattedName = formatTitle(doc.name);
        tocContent += `- [${formattedName}](./${doc.fileName}.md)\n`;
      });
      
      await fs.writeFile(tocPath, tocContent);
      
      // Add TOC file to results
      results.push({
        outputFile: tocPath,
        content: tocContent,
        name: 'README',
        fileName: 'README'
      });
    }
    
    return results;
  }
}
