import fs from 'fs';
import { PDFParse } from 'pdf-parse';

async function extract(inp, out) {
  const data = fs.readFileSync(inp);
  const parser = new PDFParse({ data });
  const result = await parser.getText();
  fs.writeFileSync(out, result.text, 'utf8');
  console.log(
    inp,
    'pages',
    result.total ?? result.pages?.length ?? '?',
    'chars',
    result.text.length,
  );
  await parser.destroy?.();
}

await extract(
  'C:/Users/HP/Documents/GitHub/Astro-React-BookShelf/frontend/projectFiles/BookVerse_Project_Overview.pdf',
  'C:/Users/HP/Documents/GitHub/Astro-React-BookShelf/docs/_tmp_overview.txt',
);
await extract(
  'C:/Users/HP/Documents/GitHub/Astro-React-BookShelf/frontend/projectFiles/BookVerse-Step-by-Step-Prompts.pdf',
  'C:/Users/HP/Documents/GitHub/Astro-React-BookShelf/docs/_tmp_prompts.txt',
);
