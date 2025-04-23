<div align="center">
	<br>
	<br>
	<img width="360" src="logo.png" alt="apidoc-markdown logo" />
	<br>
	<br>

📝 Generate a Simple and Portable Markdown documentation for your API

[![Node.js CI](https://github.com/techdyn/apidoc-markdown/workflows/Node.js%20CI/badge.svg)](https://github.com/techdyn/apidoc-markdown/actions)
[![npm package](https://img.shields.io/npm/v/apidoc-markdown.svg?logo=npm)](https://www.npmjs.com/package/apidoc-markdown)
[![npm downloads](https://img.shields.io/npm/dw/apidoc-markdown)](https://www.npmjs.com/package/apidoc-markdown)
[![license](https://img.shields.io/npm/l/apidoc-markdown?color=blue)](./LICENSE)

> **This is a fork of [rigwild/apidoc-markdown](https://github.com/rigwild/apidoc-markdown).**

</div>

# apidoc-markdown

## Before starting

`apidoc-markdown` uses [apiDoc](https://github.com/apidoc/apidoc) internally. To generate your nice Markdown documentation, you first need to add some [apiDoc](https://github.com/apidoc/apidoc) API documentation comments in your code.

Take a look at https://apidocjs.com/ to discover it if it's your first time using it! 😉

You create your API documentation directly in your code with comments like this:

```ts
/**
 * @api {post} /admin/invite/new Send Invite
 * @apiPermission GlobalAdmin
 * @apiDescription Create & email a new Strider invite.
 * @apiName SendInvite
 * @apiGroup Admin
 * @apiVersion 1.0.0
 *
 * @apiExample {curl} CURL Example:
 *    curl -X POST -d invite_code=xoxox -d email=me[at]email.com http://localhost/invite/new
 *
 * @apiParam (RequestBody) {String} invite_code The invite code/token to use in the invitation
 * @apiParam (RequestBody) {String} email The email address of the new user being invited
 */
app.post('/invite/new', (req, res) => res.end())
```

## How does it look? Give me some examples!

Some examples are available in the [`example`](./example) directory.

Take a look at [`example/strider/api.md`](./example/strider/api.md) which shows a real-world example taken from the [Strider](https://github.com/Strider-CD/strider) API.

## Install

```bash
# For the global CLI
pnpm install --global apidoc-markdown

# For programmatic usage or local project CLI install
pnpm install apidoc-markdown
```

Then, generate your documentation using your newly added command `apidoc-markdown` or [programmatically](#programmatic-usage-API).

**Note**: Node.js v14+ minimum is required. `apidoc-markdown` uses [`apidoc-light`](https://github.com/techdyn/apidoc-light) internally.

## CLI usage

```
Generate a Simple and Portable Markdown documentation for your API.
Usage: apidoc-markdown -i <path> -o <output_file> [-t <template_name>] [--multi] [--createPath] [--prepend <file_path>] [--tocFile] [--apidocJsonPath <path>] [--useOrderPrefix]

Options:
      --version         Show version number                                                                                        [boolean]
  -i, --input           Input source files path                                                         [string] [required] [default: "src"]
  -o, --output          Output file or directory to write output to.                                                     [string] [required]
  -t, --template        Name of the template to be used (`default`, `bitbucket`) or path to an EJS template file.  [string] [default: "default"]
      --header          Path to file content to add at the top of the documentation.                                                [string]
      --footer          Path to file content to add at the bottom of the documentation.                                             [string]
      --prepend         Path to file content to add before route groups documentation.                                              [string]
      --multi           Output one file per group to the `output` directory.                                      [boolean] [default: false]
      --createPath      Recursively create directory arborescence to the `output` directory.                      [boolean] [default: false]
      --tocFile         Generate a table of contents file (README.md) in multi mode.                              [boolean] [default: false]
      --apidocJsonPath  Path to the apidoc.json configuration file.                                   [string] [default: "apidoc.json"]
      --useOrderPrefix  Prefix filenames with order numbers in multi mode.                                       [boolean] [default: false]
  -h, --help            Show help                                                                                                  [boolean]

Examples:
  apidoc-markdown -i src -o doc.md                           Generate from `src` source files to `doc.md`
  apidoc-markdown --input src --output doc.md                Generate from `src` source files to `doc.md`
  apidoc-markdown -i src -o doc.md -t bitbucket              Generate from `src` source files to `doc.md` using the `bitbucket` template
  apidoc-markdown -i src -o doc.md -t my_custom_template.md  Generate from `src` source files to `doc.md` using a provided template file
  apidoc-markdown -i src -o doc --multi                      Generate from `src` source files to `doc/<group>.md`

apidoc-markdown - https://github.com/techdyn/apidoc-markdown
```

### Examples

Generate documentation (See [`./example/basic/example.md`](./example/basic/example.md)).

```
apidoc-markdown -i src -o doc.md
```

You can select a provided template by using `-t` or `--template` (`default`, `bitbucket`).

```
apidoc-markdown -i src -o doc.md -t bitbucket
```

You can pass the path to your own template by using `-t` or `--template`.

```
apidoc-markdown -i src -o doc.md -t my_custom_template.md
```

You can inject a header, footer or prepend section in your documentation with the content of a file using `--header`, `--footer` and `--prepend`.

```
apidoc-markdown -i src -o doc.md --header header.md
apidoc-markdown -i src -o doc.md --footer footer.md
apidoc-markdown -i src -o doc.md --prepend prepend.md

apidoc-markdown -i src -o doc.md --header header.md --footer footer.md --prepend prepend.md
```

Generate documentation with one file per group (See [`./example/multi`](./example/multi)).

```
apidoc-markdown -i src -o doc --multi
```

Generate documentation with one file per group and a table of contents file (README.md):

```
apidoc-markdown -i src -o doc --multi --tocFile
```

Generate multi-file documentation with order prefixes in filenames (based on apidoc.json order):

```
apidoc-markdown -i src -o doc --multi --useOrderPrefix
```

Use a custom apidoc.json configuration file:

```
apidoc-markdown -i src -o doc --apidocJsonPath path/to/custom-apidoc.json
```

### Quick and easy project integration

Install `apidoc-markdown` as a dev dependency.

```bash
pnpm install -D apidoc-markdown
```

Add the following script to your `package.json` file (`src` is where are stored your source files containing some [apiDoc](https://apidocjs.com/) annotations).

```json
{
  "scripts": {
    "doc": "apidoc-markdown -i src -o DOCUMENTATION.md"
  }
}
```

Run the npm script to generate the `DOCUMENTATION.md` file.

```bash
pnpm doc
```

## Programmatic usage API

#### generateMarkdownFileSystem

Generate mardown documentation using the file system and creating output file(s).

```ts
import path from 'path'
import { generateMarkdownFileSystem } from 'apidoc-markdown'

const documentation: Doc = await generateMarkdownFileSystem({
  /** Input source files path */
  input: path.resolve(__dirname, 'path', 'to', 'your', 'sources', 'directory'),

  /** Output file or directory to write output to */
  output: path.resolve(__dirname, 'doc.md'),

  /** Optional: Name of template to be used (`default`, `bitbucket`)
   * or path to EJS template file
   * or raw EJS plain text template
   * (will use default template if ommitted). */
  template: 'default',

  /** Optional: Path to file content to add at the top of the documentation */
  header: path.resolve(__dirname, 'add-this-to-the-top'),

  /** Optional: Path to file content to add at the bottom of the documentation */
  footer: path.resolve(__dirname, 'add-this-to-the-bottom'),

  /** Optional: Path to file content to add before route groups documentation */
  prepend: path.resolve(__dirname, 'prepend-this-to-api-routes'),

  /** Optional: Output one file per group to the `output` directory */
  multi: false,

  /** Optional: Recursively create directory arborescence to the `output` directory */
  createPath: true,
  
  /** Optional: Generate a table of contents file (README.md) in multi mode */
  tocFile: false,
  
  /** Optional: Path to the apidoc.json configuration file */
  apidocJsonPath: 'path/to/custom-apidoc.json',
  
  /** Optional: Prefix filenames with order numbers in multi mode */
  useOrderPrefix: false
})

// Output
type Doc = Array<{
  name: string // Api group name
  content: string // Documentation content
}>

// (if `multi` is `false`, you get an array with 1 element!)
```

#### generateMarkdown

Generate mardown documentation by passing directly the apiDoc output.

```ts
import { generateMarkdown } from 'apidoc-markdown'

const documentation: Doc = await generateMarkdown({
  /** apiDoc project JSON data object `apidoc.json` file content) */
  apiDocProjectData: { name: 'test', version: '0.13.0' /* ... */ },

  /** apiDoc documentation JSON data object (`api_data.json` file content) */
  apiDocApiData: [{ type: 'get', url: '/define' /* ... */ }],

  /** Optional: Name of template to be used (`default`, `bitbucket`)
   * or path to EJS template file
   * or raw EJS plain text template
   * (will use default template if ommitted). */
  template: 'my EJS template <%= project.name %> v<%= project.version %>',

  /** Optional: Content to add at the top of the documentation */
  header: 'Add this text at the top of the doc!',

  /** Optional: Content to add at the bottom of the documentation */
  footer: 'Add this text at the bottom of the doc!',

  /** Optional: Content to add before route groups documentation */
  prepend: 'Prepend this before the API routes documentation!',

  /** Optional: Generate one documentation output per group */
  multi: false
})

// Output
type Doc = Array<{
  name: string // Api group name
  content: string // Documentation content
}>

// (if `multi` is `false`, you get an array with 1 element!)
```

## Configuration

### Using `apidoc.json`

The `header`, `footer` and `prepend` options can be configured directly in your `apidoc.json` (see [`apidoc.json` documentation](https://apidocjs.com/#configuration)).

Add it like this:

```json
{
  "name": "test",
  "version": "0.1.2",
  "description": "test",
  "title": "test",
  "url": "https://test.example.com/",
  "header": {
    "filename": "header.md"
  },
  "footer": {
    "filename": "footer.md"
  },
  "prepend": {
    "filename": "prepend.md"
  }
}
```

**Note:** This only works if you use the CLI or [`generateMarkdownFileSystem`](#generateMarkdownFileSystem).

### API groups order

You can choose the order in which the documentation groups gets generated by adding an `order` key in `apidoc.json`. [See example `apidoc.json`](./test/_testFiles/input/apidoc.json#L15-L22) and [generated example output](./example/basic/example.md).

This order is respected in several ways:
- In single-file mode, it determines the order of groups in the documentation
- In multi-file mode with `--tocFile`, it determines the order of links in the table of contents
- In multi-file mode with `--useOrderPrefix`, it determines the numeric prefixes added to filenames

Example `order` in apidoc.json:
```json
{
  "order": [
    "User",
    "Admin",
    "Account",
    "Error"
  ]
}
```

When using `--useOrderPrefix`, files would be generated as:
- 01_User.md
- 02_Admin.md
- 03_Account.md
- 04_Error.md
- etc.

This makes it easy to maintain a logical order when browsing the generated files.

## New Features

### Table of Contents Generation

When using multi-file mode (`--multi`), you can now generate a table of contents file with the `--tocFile` option. This creates a README.md file in the output directory that links to all the generated documentation files, making navigation easier.

```bash
apidoc-markdown -i src -o docs --multi --tocFile
```

### Custom apidoc.json Path

Specify a custom path to your apidoc.json configuration file using the `--apidocJsonPath` option:

```bash
apidoc-markdown -i src -o docs --apidocJsonPath ./configs/custom-apidoc.json
```

### Order-based Filename Prefixes

In multi-file mode, you can prefix filenames with order numbers based on the `order` array in your apidoc.json file using the `--useOrderPrefix` option:

```bash
apidoc-markdown -i src -o docs --multi --useOrderPrefix
```

This makes it easier to browse the documentation files in a logical order.

### Improved Formatting

- Titles with underscores are now properly displayed with spaces (e.g., "User_-_Reports" is displayed as "User - Reports")
- Code blocks with backticks now render properly without paragraph wrappers

## License

```
MIT License

Copyright (c) 2014-2019 Martin Jonsson <martin.jonsson@gmail.com> (https://github.com/martinj)
Copyright (c) 2019 rigwild <me@rigwild.dev> (https://github.com/rigwild)

Modified 2025 by Brandon Stonebridge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
