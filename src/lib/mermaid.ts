export function validateMermaid(source: string) {
  if (source.length > 20_000) throw new Error('Please keep your flowchart under 20,000 characters.')
  const text = source
    .trim()
    .replace(/^%%[^\n]*\n/gm, '')
    .trim()
  if (!/^(flowchart|graph)\s+(TB|TD|BT|RL|LR)\b/i.test(text))
    throw new Error(
      'Start with “flowchart LR” or “graph TD”. This importer supports Mermaid flowcharts.',
    )
  if (/%%\{|^---|\bclick\s|<\/?(?:script|iframe|img|object)|@\{|\b(?:href|src)\s*=/im.test(source))
    throw new Error(
      'Use plain flowchart nodes and connections. Configuration directives, links, HTML embeds, and external images are not supported.',
    )
  return text
}
export const mermaidExample = `flowchart LR
  A[Web client] -->|HTTPS| B[API gateway]
  B --> C[Application service]
  C -->|Cache lookup| D[(Redis)]
  C -->|Read / write| E[(PostgreSQL)]
  C --> F[Message queue]
  F --> G[Background worker]`
