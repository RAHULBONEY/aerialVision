require('dotenv').config();

const { admin, db } = require('./src/config/firebase');
const ragService = require('./src/services/rag.service');
const { buildRagContent } = require('./src/services/incident.service');

const COLLECTION = 'incidents';
const BATCH_SIZE = 10;
const DELAY_MS = 100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting backfill embeddings script (enriched ragContent)...\n');

  const stats = { total: 0, ragUpdated: 0, embedded: 0, failed: 0 };

  try {
    const snapshot = await db.collection(COLLECTION).get();
    stats.total = snapshot.size;
    console.log(`Found ${stats.total} incidents total.\n`);

    if (stats.total === 0) {
      console.log('No incidents to process. Exiting.');
      process.exit(0);
    }

    let idx = 1;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const docId = docSnap.id;
      const hasEmbedding = data.embedding && Array.isArray(data.embedding);

      const ragContent = buildRagContent({
        timestamp: data.timestamp?.toDate?.()?.toISOString?.() || data.timestamp || new Date().toISOString(),
        severity: data.severity,
        type: data.type,
        streamName: data.streamName,
        streamId: data.streamId,
        description: data.description,
        density: data.snapshot?.density ?? data.density,
        vehicleCount: data.snapshot?.vehicleCount ?? data.vehicleCount,
        speed: data.snapshot?.speed ?? data.speed,
        status: data.status,
        ackedBy: data.ackedBy,
        ackedAt: data.ackedAt?.toDate?.()?.toISOString?.() || data.ackedAt,
        note: data.note,
        operatorAction: data.operatorAction,
        resolution: data.resolution
      });

      if (hasEmbedding) {
        console.log(`[${idx}/${stats.total}] UPDATE ${docId} — ragContent only`);
        await docSnap.ref.update({ ragContent, ragStatus: admin.firestore.FieldValue.delete() });
        stats.ragUpdated++;
        idx++;
        continue;
      }

      try {
        console.log(`[${idx}/${stats.total}] EMBED  ${docId} — generating embedding...`);
        const embeddingArray = await ragService.getEmbedding(ragContent);

        await docSnap.ref.update({
          ragContent,
          embedding: admin.firestore.FieldValue.vector(embeddingArray),
          ragStatus: admin.firestore.FieldValue.delete()
        });

        console.log(`  ✓ OK — embedded (${embeddingArray.length} dims)`);
        stats.embedded++;
      } catch (err) {
        console.log(`  ✗ FAIL — ${err.message}`);

        await docSnap.ref.update({
          ragContent,
          ragStatus: 'EMBEDDING_FAILED'
        });

        stats.failed++;
      }

      await sleep(DELAY_MS);
      idx++;
    }

    console.log('\n=== BACKFILL COMPLETE ===');
    console.log(`Total:     ${stats.total}`);
    console.log(`Updated:   ${stats.ragUpdated}`);
    console.log(`Embedded:  ${stats.embedded}`);
    console.log(`Failed:    ${stats.failed}`);
    process.exit(0);

  } catch (err) {
    console.error('\nFatal error:', err.message);
    process.exit(1);
  }
}

main();
