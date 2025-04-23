import ejs from 'ejs'
import fs from 'fs/promises'
import path from 'path'
import { createDoc } from 'apidoc-light'
import type { ConfigurationObject, ConfigurationObjectCLI } from './types'
import type { MarkdownOptions, MarkdownRuleFunction } from 'apidoc-light'

export const TEMPLATES_PATH = path.resolve(__dirname, '..', 'templates')
export const DEFAULT_TEMPLATE_PATH = path.resolve(TEMPLATES_PATH, 'default.md')

/**
 * Recursively create an arborescence to the given path
 *
 * @param p Path to follow
 */
export const mkdirp = (p: string) => fs.mkdir(p, { recursive: true })

/**
 * Make array values unique
 *
 * @param arr Source array of strings
 */
export const unique = (arr: string[]) => [...new Set(arr)]

/**
 * Check a path exists on the file system
 *
 * @param p Path to check existance from
 * @throws Path does not exist
 */
export const pathExists = (p: string, logIfFail = true) =>
  fs
    .access(p)
    .then(() => true)
    .catch(err => (logIfFail && console.error(err), false))

export const loadFileOrThrowIfNotExist = async (optionName: string, filePath: string) => {
  if (!(await pathExists(filePath)))
    throw new Error(`The \`${optionName}\` path does not exist or is not readable. Path: ${filePath}`)
  return await fs.readFile(filePath, { encoding: 'utf-8' })
}

/**
 * Try to load file from CLI parameter or from `api_project.json`
 * @param optionName CLI parameter/`api_project.json` key name
 * @param cliParam Received CLI param value
 * @param apiDocProjectData `api_project.json` content
 * @returns
 */
export const loadFromCliParamOrApiDocProject = async (
  optionName: string,
  cliParam: string | undefined,
  apiDocProjectData: Record<string, any>
) => {
  if (cliParam) return await loadFileOrThrowIfNotExist(`cli.${optionName}`, cliParam)
  else if (apiDocProjectData[optionName]) {
    if (apiDocProjectData[optionName].filename)
      // This is not a valid option as apiDoc will convert input `filename` to actual markdown content
      // But let's support it anyway.
      return await loadFileOrThrowIfNotExist(
        `apidoc_project_file.${optionName}.filename`,
        apiDocProjectData[optionName].filename
      )
    else if (apiDocProjectData[optionName].content)
      return `${apiDocProjectData[optionName].title ? `# ${apiDocProjectData[optionName].title}\n\n` : ''}${
        apiDocProjectData[optionName].content
      }`
  }
}

/**
 * Check if a template is in the templates directory
 * @param name template name (without the `.md` file extension)
 */
export const isInTemplatesDir = (name: string) => fs.readdir(TEMPLATES_PATH).then(files => files.includes(`${name}.md`))

/**
 * Load the apidoc.json file from a specified path
 * @param apidocJsonPath Path to the apidoc.json file
 * @returns The content of the apidoc.json file or null if not found
 */
export const loadApidocJson = async (apidocJsonPath: string): Promise<Record<string, any> | null> => {
  try {
    if (await pathExists(apidocJsonPath, false)) {
      const content = await fs.readFile(apidocJsonPath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  } catch (err) {
    console.error(`Error loading apidoc.json from ${apidocJsonPath}:`, err);
    return null;
  }
};

/**
 * Format a title by replacing underscores with spaces
 * @param title The title to format
 * @returns The formatted title
 */
export const formatTitle = (title: string): string => {
  return title.replace(/_/g, ' ');
};

/**
 * Invoke apidoc to get the documentation
 * @param options CLI configuration options
 * @throws apiDoc parsing error
 */
export const createDocOrThrow = (
  options: ConfigurationObjectCLI
): Pick<ConfigurationObject, 'apiDocProjectData' | 'apiDocApiData'> => {
  // Define markdown rule functions that conform to the MarkdownRuleFunction type
  const rules: Record<string, MarkdownRuleFunction> = {
    // Override `code_inline` (for `inline code`)
    code_inline: (tokens: any[], idx: number): string => {
      return tokens[idx].content;
    },
    
    // Strip <p> wrapper around code-only paragraphs
    paragraph_open: (tokens: any[], idx: number, options: any, self: any): string => {
      const contentToken = tokens[idx + 1];
      const isSingleCode = contentToken &&
                          contentToken.type === 'inline' &&
                          contentToken.children &&
                          contentToken.children.length === 1 &&
                          contentToken.children[0].type === 'code_inline';

      if (isSingleCode) return '';
      return self.renderToken(tokens, idx, options);
    },
    
    paragraph_close: (tokens: any[], idx: number, options: any, self: any): string => {
      const contentToken = tokens[idx - 1];
      const isSingleCode = contentToken &&
                          contentToken.type === 'inline' &&
                          contentToken.children &&
                          contentToken.children.length === 1 &&
                          contentToken.children[0].type === 'code_inline';

      if (isSingleCode) return '';
      return self.renderToken(tokens, idx, options);
    },
    
    // Remove <p> tags from any backtick content
    html_block: (tokens: any[], idx: number): string => {
      const content = tokens[idx].content;
      // If the content contains <p><code> patterns, clean them up
      if (content.includes('<p><code>')) {
        return content
          .replace(/<p><code>/g, '<code>')
          .replace(/<\/code><\/p>/g, '</code>');
      }
      return content;
    }
  };
  
  // Create markdown options
  // Force type assertion to satisfy TypeScript while matching runtime structure expected by apidoc-light
  const markdownOptions = {
    config: {
      breaks: true,
      html: true,
    },
    plugins: [],
    rules: rules
  } as unknown as MarkdownOptions;
  
  // Create the doc using our custom markdown options
  const doc = createDoc({ 
    ...options, 
    src: options.input,
    markdown: markdownOptions
  });
  
  return {
    apiDocProjectData: doc.project,
    apiDocApiData: Object.values<any>(doc.data)
      .filter(x => x.type)
      .map(item => {
        // Format titles by replacing underscores with spaces
        if (item.title) {
          item.title = formatTitle(item.title);
        }
        return item;
      })
  }
}

/**
 * Load the template and compile it with EJS
 * @param template template path, name or raw plain text
 * @param logIfFileNotFound turn off logging
 */
export const loadTemplate = async (template?: string, logIfFileNotFound = true) => {
  if (template) {
    // Raw EJS plain text template
    if (template.includes('<%')) logIfFileNotFound = false
    // Template name
    else if (await isInTemplatesDir(template))
      template = await fs.readFile(path.resolve(TEMPLATES_PATH, `${template}.md`), 'utf-8')
    // Path to template file
    else if (await pathExists(template, logIfFileNotFound)) template = await fs.readFile(template, 'utf-8')
  }
  // Default template
  else template = await fs.readFile(DEFAULT_TEMPLATE_PATH, 'utf-8')

  return ejs.compile(template, { async: true })
}

/** Utility functions passed to the EJS template */
export const templateUtils = {
  /**
   * Convert a title to a Markdown-valid relative link
   * @param str Title to convert
   * @returns The valid linkable string
   */
  toLink: (str: string) => str.replace(/\s+/g, '-'),
  urlEncode: (str: string) => encodeURIComponent(str),
  urlDecode: (str: string) => decodeURIComponent(str),
  toLower: (str: string) => str.toLowerCase(),
  toUpper: (str: string) => str.toUpperCase()
}
