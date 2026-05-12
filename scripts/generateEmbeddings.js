import 'dotenv/config';
import OpenAI from 'openai';
import { PCA } from 'ml-pca';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────────────────────────────────
// Wordspace embedding pipeline
//
// Reads:  src/data/excerpts-seed.json   (source of truth for offline mode)
// Writes: src/data/excerpts-processed.json (with embeddings + 3D positions
//         + top-3 related ids — what the frontend renders)
//
// Later (when capture pipeline is wired up) this will read from the Neon
// `excerpts` table and write `position_x/y/z` + `related_ids` back to it,
// then dump a snapshot JSON for the static frontend.
// ─────────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function topRelated(embeddings, n = 3) {
  return embeddings.map((emb, i) => {
    const sims = [];
    for (let j = 0; j < embeddings.length; j++) {
      if (j === i) continue;
      sims.push({ idx: j, sim: cosineSimilarity(emb, embeddings[j]) });
    }
    sims.sort((a, b) => b.sim - a.sim);
    return sims.slice(0, n).map(s => s.idx);
  });
}

// PCA-reduce 1536-dim embeddings → 3D, normalized to a -10..+10 cube
function pcaReduce3D(embeddings) {
  if (embeddings.length < 4) {
    // PCA needs more samples than components. For tiny corpora, fall back
    // to a deterministic spread on a sphere so the visualization still works.
    return embeddings.map((_, i) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / embeddings.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 6;
      return [
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi),
      ];
    });
  }
  const pca = new PCA(embeddings);
  const reduced = pca.predict(embeddings, { nComponents: 3 }).to2DArray();
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];
  for (const c of reduced) {
    for (let i = 0; i < 3; i++) {
      mins[i] = Math.min(mins[i], c[i]);
      maxs[i] = Math.max(maxs[i], c[i]);
    }
  }
  return reduced.map(c =>
    c.map((v, i) => {
      const range = maxs[i] - mins[i] || 1;
      return ((v - mins[i]) / range) * 20 - 10;
    })
  );
}

// What text we feed the embedder: excerpt + author + thought.
// The thought adds personal-context signal so two notes about the same
// passage end up nearer when the user's reading of them is similar.
function embeddingInput(e) {
  const author = e.source?.author ? ` — ${e.source.author}` : '';
  const thought = e.my_thought ? `\n(My thought: ${e.my_thought})` : '';
  return `${e.text}${author}${thought}`;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set in .env');
    process.exit(1);
  }

  const seedPath = path.join(__dirname, '..', 'src', 'data', 'excerpts-seed.json');
  const outPath  = path.join(__dirname, '..', 'src', 'data', 'excerpts-processed.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  console.log(`\n📖 Loaded ${seed.length} excerpts\n`);
  console.log('Generating embeddings...');

  const embeddings = [];
  for (let i = 0; i < seed.length; i++) {
    const e = seed[i];
    process.stdout.write(`  ${i + 1}/${seed.length}: "${e.text.slice(0, 50)}..."\n`);
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingInput(e),
    });
    embeddings.push(res.data[0].embedding);
    await new Promise(r => setTimeout(r, 80));
  }

  console.log('\n✓ Embeddings generated');

  const positions = pcaReduce3D(embeddings);
  console.log('✓ PCA → 3D positions');

  const related = topRelated(embeddings, 3);
  console.log('✓ Top-3 neighbors computed\n');

  const processed = seed.map((e, i) => ({
    ...e,
    position: { x: positions[i][0], y: positions[i][1], z: positions[i][2] },
    related: related[i].map(idx => seed[idx].id),
  }));

  fs.writeFileSync(outPath, JSON.stringify(processed, null, 2));
  console.log(`✓ Wrote ${outPath}`);
  console.log('\n🌟 Done.\n');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
