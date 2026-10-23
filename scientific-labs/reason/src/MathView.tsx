import katex from 'katex';
export default function MathView({ value, large = false }: { value: string; large?: boolean }) {
  const html = katex.renderToString(value, { throwOnError: false, displayMode: true, trust: false, maxExpand: 500, output: 'htmlAndMathml' });
  return <div className={`math-view ${large ? 'large' : ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
